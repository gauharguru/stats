import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, qs } from '../api';
import { useAuth } from '../auth';
import { Badge, Card, ErrorBox, ExportButton, Input, KV, Loading, Modal, PageHeader, PrintButton, Select, Table, TextArea, useAction, useLoad } from '../components/ui';
import { date, dateTime, label, money, todayISO } from '../format';
import { statusOptions, useLookups } from '../lookups';
import { ReasonModal } from './AdmissionDetail';

export function PaymentRegister() {
  const { lookups } = useLookups();
  const nav = useNavigate();
  const [f, setF] = useState({ q: '', from: todayISO(), to: todayISO(), status: '', paymentModeId: '', courseId: '', batchId: '' });
  const url = `/payments${qs(f)}`;
  const { data, error } = useLoad(() => api.get(url), [url]);
  return (
    <>
      <PageHeader title="Payment register" subtitle="Receipt register of all payments" actions={<><ExportButton url={url} fileName="payment-register" /><PrintButton /></>} />
      <Card>
        <div className="filters no-print">
          <Input className="wide" label="Search" value={f.q} onChange={(v) => setF({ ...f, q: v })} placeholder="Receipt, student, admission, UTR" />
          <Input label="From" type="date" value={f.from} onChange={(v) => setF({ ...f, from: v })} />
          <Input label="To" type="date" value={f.to} onChange={(v) => setF({ ...f, to: v })} />
          <Select label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v })} options={statusOptions(lookups, 'PAYMENT')} placeholder="All" />
          <Select label="Mode" value={f.paymentModeId} onChange={(v) => setF({ ...f, paymentModeId: v })} placeholder="All"
            options={(lookups?.paymentModes ?? []).map((m) => ({ value: m.PaymentModeId, label: m.PaymentModeName }))} />
          <Select label="Course" value={f.courseId} onChange={(v) => setF({ ...f, courseId: v, batchId: '' })} placeholder="All"
            options={(lookups?.courses ?? []).map((c) => ({ value: c.CourseId, label: c.CourseCode }))} />
          <Select label="Batch" value={f.batchId} onChange={(v) => setF({ ...f, batchId: v })} placeholder="All"
            options={(lookups?.batches ?? []).filter((b) => !f.courseId || String(b.CourseId) === f.courseId).map((b) => ({ value: b.BatchId, label: b.BatchCode }))} />
        </div>
        <ErrorBox error={error} />
        <Table
          columns={[
            { key: 'ReceiptNumber', label: 'Receipt' },
            { key: 'PaymentDate', label: 'Date', type: 'date' },
            { key: 'StudentName', label: 'Student' },
            { key: 'AdmissionNumber', label: 'Admission' },
            { key: 'CourseCode', label: 'Course' },
            { key: 'PaymentModeName', label: 'Mode' },
            { key: 'TransactionReference', label: 'Reference', render: (r) => r.TransactionReference || r.ChequeNumber || '—' },
            { key: 'CashierName', label: 'Received by' },
            { key: 'Status', label: 'Status', type: 'status' },
            { key: 'Amount', label: 'Amount', type: 'money', total: true },
          ]}
          rows={data?.rows}
          showTotals
          onRowClick={(r) => nav(`/payments/${r.PaymentId}`)}
          rowKey={(r) => r.PaymentId}
        />
      </Card>
    </>
  );
}

export function PaymentDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const { data, error, reload } = useLoad(() => api.get(`/payments/${id}`), [id]);
  const [modal, setModal] = useState<string | null>(null);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const p = data.payment;
  return (
    <>
      <PageHeader
        title={`Payment ${p.ReceiptNumber ?? '(not yet posted)'}`}
        subtitle={<><Link to={`/admissions/${p.AdmissionId}`}>{p.StudentName} · {p.AdmissionNumber}</Link> · <Badge status={p.Status} /></>}
        actions={
          <>
            {data.receipt && <Link className="btn" to={`/payments/${p.PaymentId}/receipt`}>Print receipt</Link>}
            {p.Status === 'POSTED' && can('PAYMENT_REVERSE') && <button className="btn btn-danger" onClick={() => setModal('reverse')}>Request reversal</button>}
            {p.ChequeStatus && !['BOUNCED', 'CANCELLED'].includes(p.ChequeStatus) && can('CHEQUE_UPDATE') && (
              <button className="btn btn-ghost" onClick={() => setModal('cheque')}>Update cheque status</button>
            )}
          </>
        }
      />
      <Card title="Details">
        <KV
          items={[
            ['Amount', <b>{money(p.Amount)}</b>], ['Payment date', date(p.PaymentDate)], ['Mode', p.PaymentModeName], ['Reference / UTR', p.TransactionReference],
            ['Bank', p.BankName], ['Cheque', p.ChequeNumber && `${p.ChequeNumber} dated ${date(p.ChequeDate)}`], ['Cheque status', p.ChequeStatus && <Badge status={p.ChequeStatus} />],
            ['Received by', p.CashierName], ['Posted at', dateTime(p.PostedAt)], ['Kept as advance', money(p.AdvanceAmount)], ['Remarks', p.Remarks],
            ['Receipt printed', data.receipt ? `${data.receipt.PrintedCount} time(s)` : '—'],
          ]}
        />
      </Card>
      <Card title="Allocation to fees">
        <Table
          columns={[
            { key: 'FeeHeadName', label: 'Fee head' },
            { key: 'PeriodName', label: 'Period' },
            { key: 'AcademicYearCode', label: 'Year' },
            { key: 'AllocatedAmount', label: 'Amount', type: 'money', total: true },
          ]}
          rows={data.allocations}
          showTotals
          empty="Not allocated (pending or kept as advance)."
        />
      </Card>
      {data.reversals.length > 0 && (
        <Card title="Reversals">
          <Table
            columns={[
              { key: 'ReversalDate', label: 'Date', type: 'date' },
              { key: 'Reason', label: 'Reason' },
              { key: 'RequestedByName', label: 'Requested by' },
              { key: 'Status', label: 'Status', type: 'status' },
            ]}
            rows={data.reversals}
          />
        </Card>
      )}
      {modal === 'reverse' && (
        <ReasonModal
          title={`Reverse receipt ${p.ReceiptNumber}`}
          note="The original payment stays on record; a reversal entry is added once approved. Enter the correct payment afterwards."
          onClose={() => setModal(null)}
          submit={(reason) => api.post(`/payments/${p.PaymentId}/reverse`, { reason })}
          success="Reversal submitted for approval."
          onDone={reload}
        />
      )}
      {modal === 'cheque' && <ChequeStatus payment={p} onClose={() => setModal(null)} onDone={reload} />}
    </>
  );
}

function ChequeStatus({ payment, onClose, onDone }: { payment: any; onClose: () => void; onDone: () => void }) {
  const { runSafe, busy } = useAction();
  const [status, setStatus] = useState('DEPOSITED');
  const [remarks, setRemarks] = useState('');
  return (
    <Modal title={`Cheque ${payment.ChequeNumber}`} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await runSafe(() => api.post(`/payments/${payment.PaymentId}/cheque-status`, { status, remarks }), 'Cheque status updated.');
          if (r) {
            onDone();
            onClose();
          }
        }}
      >
        <div className="form-grid">
          <Select label="New status" value={status} onChange={setStatus} placeholder={null}
            options={['DEPOSITED', 'CLEARED', 'BOUNCED', 'CANCELLED'].map((s) => ({ value: s, label: label(s) }))} />
          <TextArea label="Remarks" value={remarks} onChange={setRemarks} />
        </div>
        {(status === 'BOUNCED' || status === 'CANCELLED') && (
          <div className="alert alert-warn" style={{ marginTop: 12 }}>A reversal of this receipt will be submitted for approval. The receipt itself is never deleted.</div>
        )}
        <div className="form-actions">
          <button className="btn" disabled={busy}>Save</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- printable receipt (SRS 44) ------------------------ */
export function Receipt() {
  const { id } = useParams();
  const { data, error } = useLoad(() => api.get(`/payments/${id}/receipt`), [id]);
  useEffect(() => {
    const after = () => api.post(`/payments/${id}/receipt/printed`).catch(() => undefined);
    window.addEventListener('afterprint', after);
    return () => window.removeEventListener('afterprint', after);
  }, [id]);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const p = data.payment;
  return (
    <>
      <div className="actions no-print" style={{ marginBottom: 12 }}>
        <button className="btn" onClick={() => window.print()}>Print / Save PDF</button>
        <Link className="btn btn-ghost" to={`/payments/${p.PaymentId}`}>Back</Link>
      </div>
      <div className="doc">
        <div className="doc-head">
          {data.college.logoUrl && <img src={data.college.logoUrl} alt="College logo" />}
          <div>
            <h1>{data.college.name}</h1>
            <div className="muted">{data.college.address}{data.college.phone && ` · ${data.college.phone}`}</div>
          </div>
        </div>
        <div className="doc-title">FEE RECEIPT{p.Status === 'REVERSED' && ' — REVERSED / CANCELLED'}</div>
        <table>
          <tbody>
            <tr><th style={{ width: '22%' }}>Receipt no.</th><td>{p.ReceiptNumber}</td><th style={{ width: '18%' }}>Date</th><td>{date(p.PaymentDate)}</td></tr>
            <tr><th>Student</th><td>{p.StudentName}</td><th>Student ID</th><td>{p.StudentCode}</td></tr>
            <tr><th>Admission no.</th><td>{p.AdmissionNumber}</td><th>Father's name</th><td>{p.FatherName ?? ''}</td></tr>
            <tr><th>Course</th><td>{p.CourseName}</td><th>Batch</th><td>{p.BatchName}</td></tr>
          </tbody>
        </table>
        <table style={{ marginTop: 14 }}>
          <thead>
            <tr><th style={{ width: 40 }}>#</th><th>Fee details</th><th style={{ textAlign: 'right', width: 160 }}>Amount (₹)</th></tr>
          </thead>
          <tbody>
            {data.allocations.map((x: any, i: number) => (
              <tr key={x.PaymentAllocationId}>
                <td>{i + 1}</td>
                <td>{x.FeeHeadName}{x.PeriodName ? ` - ${x.PeriodName}` : ''} ({x.AcademicYearCode})</td>
                <td className="num" style={{ textAlign: 'right' }}>{money(x.AllocatedAmount).replace('₹', '')}</td>
              </tr>
            ))}
            {p.AdvanceAmount > 0 && (
              <tr>
                <td>{data.allocations.length + 1}</td>
                <td>Advance (to be adjusted against future fees)</td>
                <td className="num" style={{ textAlign: 'right' }}>{money(p.AdvanceAmount).replace('₹', '')}</td>
              </tr>
            )}
            <tr><th colSpan={2} style={{ textAlign: 'right' }}>Total</th><th className="num" style={{ textAlign: 'right' }}>{money(p.Amount)}</th></tr>
          </tbody>
        </table>
        <p><b>Amount in words:</b> {data.amountInWords}</p>
        <p>
          <b>Payment mode:</b> {p.PaymentModeName}
          {p.TransactionReference && <> · <b>Reference:</b> {p.TransactionReference}</>}
          {p.ChequeNumber && <> · <b>Cheque:</b> {p.ChequeNumber} dated {date(p.ChequeDate)}{p.BankName && `, ${p.BankName}`}</>}
          {p.ChequeNumber && <><br /><span className="muted">Cheque payments are subject to realisation.</span></>}
        </p>
        <div className="sign">
          <div>Received by: <b>{p.CashierName}</b></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #555', paddingTop: 4, minWidth: 180 }}>Authorised signature</div>
          </div>
        </div>
        {data.receipt?.PrintedCount > 0 && <div className="muted" style={{ fontSize: 11, marginTop: 16 }}>Duplicate copy (printed {data.receipt.PrintedCount + 1} times)</div>}
      </div>
    </>
  );
}

/* ---------------- printable student statement (SRS 69) ------------- */
export function Statement() {
  const { id } = useParams();
  const { data, error } = useLoad(() => api.get(`/admissions/${id}/statement`), [id]);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const s = data.summary;
  return (
    <>
      <div className="actions no-print" style={{ marginBottom: 12 }}>
        <button className="btn" onClick={() => window.print()}>Print / Save PDF</button>
        <Link className="btn btn-ghost" to={`/admissions/${id}`}>Back</Link>
      </div>
      <div className="doc">
        <div className="doc-head">
          {data.college.logoUrl && <img src={data.college.logoUrl} alt="College logo" />}
          <div>
            <h1>{data.college.name}</h1>
            <div className="muted">{data.college.address}</div>
          </div>
        </div>
        <div className="doc-title">STUDENT FEE STATEMENT</div>
        <table>
          <tbody>
            <tr><th style={{ width: '22%' }}>Name</th><td>{s.StudentName}</td><th style={{ width: '18%' }}>Admission no.</th><td>{s.AdmissionNumber}</td></tr>
            <tr><th>Course</th><td>{s.CourseName}</td><th>Batch</th><td>{s.BatchName}</td></tr>
          </tbody>
        </table>
        <h3>Summary</h3>
        <table>
          <tbody>
            <tr><td>Total charges</td><td className="num" style={{ textAlign: 'right' }}>{money(s.TotalCharges)}</td></tr>
            <tr><td>Total discount / waiver</td><td className="num" style={{ textAlign: 'right' }}>{money(s.TotalDiscounts + s.TotalWaivers)}</td></tr>
            <tr><td>Total paid</td><td className="num" style={{ textAlign: 'right' }}>{money(s.TotalPayments)}</td></tr>
            <tr><td>Total refund</td><td className="num" style={{ textAlign: 'right' }}>{money(s.TotalRefunds)}</td></tr>
            <tr><td>Advance held</td><td className="num" style={{ textAlign: 'right' }}>{money(s.AdvanceAvailable)}</td></tr>
            <tr><th style={{ textAlign: 'left' }}>Outstanding</th><th className="num" style={{ textAlign: 'right' }}>{money(s.Outstanding)}</th></tr>
          </tbody>
        </table>
        <p className="muted">{data.outstandingInWords}</p>
        <h3>Fee-wise</h3>
        <table>
          <thead><tr><th>Fee</th><th>Charged</th><th>Discount</th><th>Paid</th><th>Due</th></tr></thead>
          <tbody>
            {data.byHead.map((h: any) => (
              <tr key={h.FeeHeadId}>
                <td>{h.FeeHeadName}</td>
                <td className="num" style={{ textAlign: 'right' }}>{money(h.Charged)}</td>
                <td className="num" style={{ textAlign: 'right' }}>{money(h.Discount + h.Waived)}</td>
                <td className="num" style={{ textAlign: 'right' }}>{money(h.Paid)}</td>
                <td className="num" style={{ textAlign: 'right' }}>{money(h.Due)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>Detailed ledger</h3>
        <table>
          <thead><tr><th>Date</th><th>Particulars</th><th>Charge</th><th>Payment / credit</th><th>Balance</th></tr></thead>
          <tbody>
            {data.ledger.map((e: any, i: number) => (
              <tr key={i}>
                <td className="nowrap">{date(e.EntryDate)}</td>
                <td>{e.Particulars}{e.Reference && <span className="muted"> ({e.Reference})</span>}</td>
                <td className="num" style={{ textAlign: 'right' }}>{e.Debit ? money(e.Debit) : ''}</td>
                <td className="num" style={{ textAlign: 'right' }}>{e.Credit ? money(e.Credit) : ''}</td>
                <td className="num" style={{ textAlign: 'right' }}>{money(e.RunningBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>Generated on {dateTime(data.generatedAt)}. A negative balance is an advance held for the student.</p>
      </div>
    </>
  );
}
