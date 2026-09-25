import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, qs } from '../api';
import { useAuth } from '../auth';
import {
  Badge, Card, Check, ErrorBox, ExportButton, Input, KV, Loading, Modal, PageHeader, PrintButton, Select, Stat, Table, Tabs, TextArea, useAction, useLoad,
} from '../components/ui';
import { date, dateTime, label, money, round2, todayISO } from '../format';
import { useLookups } from '../lookups';

export function AdmissionDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const { lookups } = useLookups();
  const nav = useNavigate();
  const [tab, setTab] = useState('summary');
  const [modal, setModal] = useState<{ kind: string; row?: any } | null>(null);
  const head = useLoad(() => api.get(`/admissions/${id}`), [id]);
  const fin = useLoad(() => api.get(`/admissions/${id}/financial`), [id]);
  const charges = useLoad(() => api.get(`/admissions/${id}/charges`), [id]);
  const reloadAll = () => {
    head.reload();
    fin.reload();
    charges.reload();
  };
  if (head.error) return <ErrorBox error={head.error} />;
  if (!head.data) return <Loading />;
  const a = head.data.admission;
  const s = head.data.summary;
  const active = a.AdmissionStatus === 'ACTIVE';

  return (
    <>
      <PageHeader
        title={
          <>
            {a.StudentName} <span className="muted" style={{ fontWeight: 400 }}>· {a.AdmissionNumber}</span>
          </>
        }
        subtitle={
          <>
            <Link to={`/students/${a.StudentId}`}>{a.StudentCode}</Link> · {a.CourseCode} · {a.BatchCode}
            {a.SeatNumber && ` · Seat ${a.SeatNumber}`} · <Badge status={a.AdmissionStatus} />
          </>
        }
        actions={
          <>
            {can('PAYMENT_CREATE') && <Link className="btn" to={`/receive-payment?admissionId=${a.AdmissionId}`}>Receive payment</Link>}
            <Link className="btn btn-ghost" to={`/admissions/${a.AdmissionId}/statement`}>Statement</Link>
            {can('REFUND_REQUEST') && <button className="btn btn-ghost" onClick={() => setModal({ kind: 'refund' })}>Request refund</button>}
            {active && can('ADMISSION_CANCEL') && <button className="btn btn-danger" onClick={() => setModal({ kind: 'cancel' })}>Cancel admission</button>}
          </>
        }
      />

      {a.AdmissionStatus === 'CANCELLED' && (
        <div className="alert alert-warn">
          Cancelled on {date(a.CancellationDate)}{a.CancelledByName ? ` by ${a.CancelledByName}` : ''}: {a.CancellationReason}
          {a.ConsultantReviewStatus && <> · Consultant review: <b>{label(a.ConsultantReviewStatus)}</b></>}
        </div>
      )}

      <div className="stats">
        <Stat label="Total charges" value={money(s.TotalCharges)} />
        <Stat label="Discounts / waivers" value={money(s.TotalDiscounts + s.TotalWaivers)} />
        <Stat label="Paid" value={money(s.TotalPayments)} tone="good" />
        <Stat label="Refunded" value={money(s.TotalRefunds)} />
        <Stat label="Advance" value={money(s.AdvanceAvailable)} />
        <Stat label="Outstanding" value={money(s.Outstanding)} tone={s.Outstanding > 0 ? 'bad' : 'good'} />
      </div>

      <Tabs
        tabs={[
          { key: 'summary', label: 'Fee summary' },
          { key: 'charges', label: 'Charges' },
          { key: 'payments', label: 'Payments' },
          { key: 'ledger', label: 'Ledger' },
          { key: 'requests', label: 'Discounts, refunds & reversals' },
          { key: 'admission', label: 'Admission details' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'summary' && (
        <Card title="Fee-head-wise summary">
          <ErrorBox error={fin.error} />
          <Table
            columns={[
              { key: 'FeeHeadName', label: 'Fee head' },
              { key: 'Charged', label: 'Charged', type: 'money', total: true },
              { key: 'Discount', label: 'Discount', type: 'money', total: true },
              { key: 'Waived', label: 'Waived', type: 'money', total: true },
              { key: 'Paid', label: 'Paid', type: 'money', total: true },
              { key: 'Refunded', label: 'Refund', type: 'money', total: true },
              { key: 'Due', label: 'Due', type: 'money', total: true },
            ]}
            rows={fin.data?.byHead}
            showTotals
            empty="No charges yet."
          />
          {fin.data?.advances?.length > 0 && (
            <>
              <h2 style={{ margin: '16px 0 8px' }}>Advances</h2>
              <Table
                columns={[
                  { key: 'ReceiptNumber', label: 'From receipt' },
                  { key: 'PaymentDate', label: 'Date', type: 'date' },
                  { key: 'OriginalAmount', label: 'Advance', type: 'money' },
                  { key: 'AppliedAmount', label: 'Applied to fees', type: 'money' },
                  { key: 'RefundedAmount', label: 'Refunded', type: 'money' },
                  { key: 'AvailableAmount', label: 'Available', type: 'money' },
                  { key: 'Status', label: 'Status', type: 'status' },
                ]}
                rows={fin.data.advances}
              />
            </>
          )}
        </Card>
      )}

      {tab === 'charges' && (
        <Card
          title="Charges"
          actions={
            can('CHARGE_CREATE') && (
              <>
                {can('ADVANCE_APPLY') && s.AdvanceAvailable > 0 && (
                  <ApplyAdvanceButton admissionId={a.AdmissionId} onDone={reloadAll} />
                )}
                <button className="btn btn-ghost" onClick={() => setModal({ kind: 'generate' })}>Generate from fee structure</button>
                <button className="btn btn-ghost" onClick={() => setModal({ kind: 'charge' })}>Add charge</button>
              </>
            )
          }
        >
          <ErrorBox error={charges.error} />
          <Table
            columns={[
              { key: 'ChargeDate', label: 'Date', type: 'date' },
              { key: 'FeeHeadName', label: 'Fee head', render: (r) => <>{r.FeeHeadName}{r.Description && <div className="muted">{r.Description}</div>}</> },
              { key: 'PeriodName', label: 'Period' },
              { key: 'AcademicYearCode', label: 'Year' },
              { key: 'DueDate', label: 'Due date', type: 'date' },
              { key: 'OriginalAmount', label: 'Amount', type: 'money' },
              { key: 'DiscountAmount', label: 'Discount', type: 'money' },
              { key: 'WaivedAmount', label: 'Waived', type: 'money' },
              { key: 'PaidAmount', label: 'Paid', type: 'money', render: (r) => money(r.PaidAmount + r.AdvanceAppliedAmount) },
              { key: 'DueAmount', label: 'Due', type: 'money' },
              { key: 'ChargeStatus', label: 'Status', type: 'status' },
              {
                key: 'act', label: '', render: (r) =>
                  r.ChargeStatus === 'ACTIVE' && (
                    <span className="actions no-print">
                      {can('DISCOUNT_REQUEST') && r.DueAmount > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setModal({ kind: 'discount', row: r })}>Discount</button>}
                      {can('ADJUSTMENT_REQUEST') && r.DueAmount > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setModal({ kind: 'waiver', row: r })}>Waive</button>}
                      {can('PAYMENT_REVERSE') && <button className="btn btn-ghost btn-sm" onClick={() => setModal({ kind: 'reverseCharge', row: r })}>Reverse</button>}
                    </span>
                  ),
              },
            ]}
            rows={charges.data?.rows}
            empty="No charges yet. Generate them from the fee structure or add a charge."
          />
        </Card>
      )}

      {tab === 'payments' && (
        <Card title="Payments">
          <Table
            columns={[
              { key: 'ReceiptNumber', label: 'Receipt' },
              { key: 'PaymentDate', label: 'Date', type: 'date' },
              { key: 'PaymentModeName', label: 'Mode' },
              { key: 'TransactionReference', label: 'Reference', render: (r) => r.TransactionReference || r.ChequeNumber || '—' },
              { key: 'Amount', label: 'Amount', type: 'money' },
              { key: 'AdvanceAmount', label: 'To advance', type: 'money' },
              { key: 'CashierName', label: 'Received by' },
              { key: 'Status', label: 'Status', type: 'status' },
            ]}
            rows={fin.data?.payments}
            onRowClick={(r) => nav(`/payments/${r.PaymentId}`)}
            empty="No payments yet."
          />
        </Card>
      )}

      {tab === 'ledger' && <Ledger admissionId={a.AdmissionId} />}

      {tab === 'requests' && fin.data && (
        <>
          <Card title="Refunds">
            <Table
              columns={[
                { key: 'RefundNumber', label: 'Refund no.' },
                { key: 'CreatedAt', label: 'Requested', render: (r) => dateTime(r.CreatedAt) },
                { key: 'RefundType', label: 'Type', render: (r) => label(r.RefundType) },
                { key: 'Reason', label: 'Reason' },
                { key: 'RequestedAmount', label: 'Amount', type: 'money' },
                { key: 'RefundDate', label: 'Paid on', type: 'date' },
                { key: 'PaymentModeName', label: 'Mode' },
                { key: 'Status', label: 'Status', type: 'status' },
              ]}
              rows={fin.data.refunds}
              onRowClick={(r) => nav(`/refunds/${r.RefundId}`)}
              empty="No refunds."
            />
          </Card>
          <Card title="Discounts / concessions">
            <Table
              columns={[
                { key: 'CreatedAt', label: 'Requested', render: (r) => dateTime(r.CreatedAt) },
                { key: 'FeeHeadName', label: 'Fee head' },
                { key: 'DiscountAmount', label: 'Amount', type: 'money' },
                { key: 'Reason', label: 'Reason' },
                { key: 'RequestedByName', label: 'Requested by' },
                { key: 'Status', label: 'Status', type: 'status' },
              ]}
              rows={fin.data.discounts}
              empty="No discounts."
            />
          </Card>
          <Card title="Waivers">
            <Table
              columns={[
                { key: 'CreatedAt', label: 'Requested', render: (r) => dateTime(r.CreatedAt) },
                { key: 'FeeHeadName', label: 'Fee head' },
                { key: 'AdjustmentType', label: 'Type', render: (r) => label(r.AdjustmentType) },
                { key: 'Amount', label: 'Amount', type: 'money' },
                { key: 'Reason', label: 'Reason' },
                { key: 'Status', label: 'Status', type: 'status' },
              ]}
              rows={fin.data.waivers}
              empty="No waivers."
            />
          </Card>
          <Card title="Reversals">
            <Table
              columns={[
                { key: 'ReversalDate', label: 'Date', type: 'date' },
                { key: 'OriginalTransactionType', label: 'Of', render: (r) => label(r.OriginalTransactionType) },
                { key: 'Amount', label: 'Amount', type: 'money' },
                { key: 'Reason', label: 'Reason' },
                { key: 'RequestedByName', label: 'Requested by' },
                { key: 'Status', label: 'Status', type: 'status' },
              ]}
              rows={fin.data.reversals}
              empty="No reversals."
            />
          </Card>
        </>
      )}

      {tab === 'admission' && (
        <Card
          title="Admission details"
          actions={
            a.ConsultantReviewStatus === 'REQUIRED' && can('CONSULTANT_REVIEW') && (
              <button className="btn btn-ghost" onClick={() => setModal({ kind: 'review' })}>Record consultant review decision</button>
            )
          }
        >
          <KV
            items={[
              ['Admission number', a.AdmissionNumber], ['Admission date', date(a.AdmissionDate)], ['Course', `${a.CourseCode} - ${a.CourseName}`],
              ['Batch', `${a.BatchCode} - ${a.BatchName}`], ['Seat', a.SeatNumber], ['Current academic year', a.CurrentAcademicYearCode],
              ['Current fee period', a.CurrentPeriodName], ['Source', label(a.AdmissionSourceType)],
              ['Consultant', a.ConsultantName], ['Referral', a.ReferralName], ['Replaces admission', a.ReplacesAdmissionNumber && <Link to={`/admissions/${a.ReplacesAdmissionId}`}>{a.ReplacesAdmissionNumber}</Link>],
              ['Status', <Badge status={a.AdmissionStatus} />], ['Consultant review', a.ConsultantReviewStatus && label(a.ConsultantReviewStatus)],
              ['Remarks', a.Remarks],
            ]}
          />
        </Card>
      )}

      {modal?.kind === 'generate' && lookups && (
        <GenerateCharges admission={a} onClose={() => setModal(null)} onDone={reloadAll} />
      )}
      {modal?.kind === 'charge' && lookups && <AddCharge admission={a} onClose={() => setModal(null)} onDone={reloadAll} />}
      {(modal?.kind === 'discount' || modal?.kind === 'waiver') && (
        <DiscountWaiver kind={modal.kind} charge={modal.row} onClose={() => setModal(null)} onDone={reloadAll} />
      )}
      {modal?.kind === 'reverseCharge' && (
        <ReasonModal
          title={`Reverse charge: ${modal.row.FeeHeadName} ${money(modal.row.OriginalAmount)}`}
          note="Only charges with no payments, discounts or waivers can be reversed. The reversal needs approval."
          onClose={() => setModal(null)}
          submit={(reason) => api.post(`/payments/charges/${modal.row.ChargeId}/reverse`, { reason })}
          success="Reversal submitted for approval."
          onDone={reloadAll}
        />
      )}
      {modal?.kind === 'refund' && <RefundRequest admissionId={a.AdmissionId} summary={s} charges={charges.data?.rows ?? []} onClose={() => setModal(null)} onDone={reloadAll} />}
      {modal?.kind === 'cancel' && <CancelAdmission admission={a} summary={s} onClose={() => setModal(null)} onDone={reloadAll} />}
      {modal?.kind === 'review' && <ConsultantReview admissionId={a.AdmissionId} onClose={() => setModal(null)} onDone={reloadAll} />}
    </>
  );
}

function ApplyAdvanceButton({ admissionId, onDone }: { admissionId: number; onDone: () => void }) {
  const { runSafe, busy } = useAction();
  return (
    <button
      className="btn btn-ghost"
      disabled={busy}
      onClick={async () => {
        const r = await runSafe(() => api.post(`/admissions/${admissionId}/apply-advance`));
        if (r) {
          onDone();
        }
      }}
    >
      Apply advance to dues
    </button>
  );
}

export function Ledger({ admissionId }: { admissionId: number }) {
  const { lookups } = useLookups();
  const [f, setF] = useState({ from: '', to: '', academicYearId: '', feeHeadId: '', entryType: '' });
  const url = `/admissions/${admissionId}/ledger${qs(f)}`;
  const { data, error } = useLoad(() => api.get(url), [url]);
  return (
    <Card title="Student ledger" actions={<><ExportButton url={url} fileName="student-ledger" /><PrintButton /></>}>
      <div className="filters no-print">
        <Input label="From" type="date" value={f.from} onChange={(v) => setF({ ...f, from: v })} />
        <Input label="To" type="date" value={f.to} onChange={(v) => setF({ ...f, to: v })} />
        <Select label="Academic year" value={f.academicYearId} onChange={(v) => setF({ ...f, academicYearId: v })} placeholder="All"
          options={(lookups?.academicYears ?? []).map((y) => ({ value: y.AcademicYearId, label: y.AcademicYearCode }))} />
        <Select label="Fee head" value={f.feeHeadId} onChange={(v) => setF({ ...f, feeHeadId: v })} placeholder="All"
          options={(lookups?.feeHeads ?? []).map((h) => ({ value: h.FeeHeadId, label: h.FeeHeadName }))} />
        <Select label="Type" value={f.entryType} onChange={(v) => setF({ ...f, entryType: v })} placeholder="All"
          options={['CHARGE', 'CHARGE_REVERSAL', 'DISCOUNT', 'WAIVER', 'PAYMENT', 'PAYMENT_REVERSAL', 'REFUND', 'REFUND_CREDIT'].map((t) => ({ value: t, label: label(t) }))} />
      </div>
      <ErrorBox error={error} />
      <Table
        columns={[
          { key: 'EntryDate', label: 'Date', type: 'date' },
          { key: 'Particulars', label: 'Particulars', render: (r) => <>{r.Particulars}{r.Reference && <div className="muted">{r.Reference}</div>}</> },
          { key: 'ChargeAmount', label: 'Charge', type: 'money', render: (r) => (r.ChargeAmount ? money(r.ChargeAmount) : '') },
          { key: 'PaymentAmount', label: 'Payment', type: 'money', render: (r) => (r.PaymentAmount ? money(r.PaymentAmount) : '') },
          { key: 'AdjustmentAmount', label: 'Adjustment', type: 'money', render: (r) => (r.AdjustmentAmount ? money(r.AdjustmentAmount) : '') },
          { key: 'RefundAmount', label: 'Refund', type: 'money', render: (r) => (r.RefundAmount ? money(r.RefundAmount) : '') },
          { key: 'RunningBalance', label: 'Balance', type: 'money' },
        ]}
        rows={data?.rows}
        empty="No ledger entries."
      />
      <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
        Balance: positive = amount due from the student; negative = advance held for the student. Filters hide rows but the balance column always reflects the full history.
      </div>
    </Card>
  );
}

function GenerateCharges({ admission, onClose, onDone }: { admission: any; onClose: () => void; onDone: () => void }) {
  const { lookups } = useLookups();
  const { runSafe, busy } = useAction();
  const [period, setPeriod] = useState('');
  const periods = (lookups?.feePeriods ?? []).filter((p) => p.CourseId === admission.CourseId && p.IsActive);
  return (
    <Modal title="Generate charges from fee structure" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await runSafe(() => api.post(`/admissions/${admission.AdmissionId}/charges/generate`, { feePeriodId: Number(period) }));
          if (r) {
            alert(r.created ? `${r.created} charge(s) created for ${r.periodName}.` : `No new charges: everything for ${r.periodName} is already charged, or the fee structure has no lines for it.`);
            onDone();
            onClose();
          }
        }}
      >
        <Select label="Fee period" value={period} onChange={setPeriod} required options={periods.map((p) => ({ value: p.FeePeriodId, label: p.PeriodName }))} />
        <p className="muted">The academic year is worked out from the batch start year. Lines already charged are skipped. Any available advance is applied automatically.</p>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>Generate</button>
        </div>
      </form>
    </Modal>
  );
}

function AddCharge({ admission, onClose, onDone }: { admission: any; onClose: () => void; onDone: () => void }) {
  const { lookups } = useLookups();
  const { runSafe, busy } = useAction();
  const cur = lookups?.academicYears.find((y) => y.IsCurrent);
  const [v, setV] = useState({ feeHeadId: '', amount: '', academicYearId: cur ? String(cur.AcademicYearId) : '', feePeriodId: '', dueDate: '', description: '' });
  return (
    <Modal title="Add charge" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await runSafe(
            () =>
              api.post(`/admissions/${admission.AdmissionId}/charges`, {
                ...v, feeHeadId: Number(v.feeHeadId), amount: Number(v.amount), academicYearId: Number(v.academicYearId) || null, feePeriodId: Number(v.feePeriodId) || null,
              }),
            'Charge added.',
          );
          if (r) {
            onDone();
            onClose();
          }
        }}
      >
        <div className="form-grid">
          <Select label="Fee head" value={v.feeHeadId} onChange={(x) => setV({ ...v, feeHeadId: x })} required
            options={(lookups?.feeHeads ?? []).filter((h) => h.IsActive).map((h) => ({ value: h.FeeHeadId, label: h.FeeHeadName }))} />
          <Input label="Amount (₹)" type="number" value={v.amount} onChange={(x) => setV({ ...v, amount: x })} required min="0.01" />
          <Select label="Fee period" value={v.feePeriodId} onChange={(x) => setV({ ...v, feePeriodId: x })} placeholder="None"
            options={(lookups?.feePeriods ?? []).filter((p) => p.CourseId === admission.CourseId).map((p) => ({ value: p.FeePeriodId, label: p.PeriodName }))} />
          <Select label="Academic year" value={v.academicYearId} onChange={(x) => setV({ ...v, academicYearId: x })}
            options={(lookups?.academicYears ?? []).map((y) => ({ value: y.AcademicYearId, label: y.AcademicYearCode }))} hint="Derived from the period if left empty." />
          <Input label="Due date" type="date" value={v.dueDate} onChange={(x) => setV({ ...v, dueDate: x })} />
          <TextArea label="Description" value={v.description} onChange={(x) => setV({ ...v, description: x })} />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>Add charge</button>
        </div>
      </form>
    </Modal>
  );
}

function DiscountWaiver({ kind, charge, onClose, onDone }: { kind: string; charge: any; onClose: () => void; onDone: () => void }) {
  const { runSafe, busy } = useAction();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const isDiscount = kind === 'discount';
  return (
    <Modal title={`${isDiscount ? 'Request discount / concession' : 'Request waiver'}: ${charge.FeeHeadName}`} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await runSafe(
            () => api.post(isDiscount ? '/payments/discounts' : '/payments/waivers', { chargeId: charge.ChargeId, amount: Number(amount), reason }),
          );
          if (r) {
            alert(r.autoApproved ? 'Applied.' : 'Submitted for approval. It takes effect once approved.');
            onDone();
            onClose();
          }
        }}
      >
        <p className="muted">Charge {money(charge.OriginalAmount)} · currently due {money(charge.DueAmount)}</p>
        <div className="form-grid">
          <Input label="Amount (₹)" type="number" value={amount} onChange={setAmount} required min="0.01" max={charge.DueAmount} />
          <TextArea label="Reason" value={reason} onChange={setReason} required />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>Submit for approval</button>
        </div>
      </form>
    </Modal>
  );
}

export function ReasonModal({
  title, note, onClose, submit, success, onDone, button = 'Submit',
}: { title: string; note?: string; onClose: () => void; submit: (reason: string) => Promise<any>; success: string; onDone: () => void; button?: string }) {
  const { runSafe, busy } = useAction();
  const [reason, setReason] = useState('');
  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={async (e: FormEvent) => {
          e.preventDefault();
          const r = await runSafe(() => submit(reason), success);
          if (r) {
            onDone();
            onClose();
          }
        }}
      >
        {note && <p className="muted">{note}</p>}
        <div className="form-grid">
          <TextArea label="Reason" value={reason} onChange={setReason} required />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>{button}</button>
        </div>
      </form>
    </Modal>
  );
}

function RefundRequest({ admissionId, summary, charges, onClose, onDone }: { admissionId: number; summary: any; charges: any[]; onClose: () => void; onDone: () => void }) {
  const { runSafe, busy } = useAction();
  const [type, setType] = useState('PARTIAL');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [fromAdvance, setFromAdvance] = useState('');
  const [alloc, setAlloc] = useState<Record<number, string>>({});
  const paidCharges = charges.filter((c) => c.ChargeStatus === 'ACTIVE' && c.PaidAmount + c.AdvanceAppliedAmount - c.RefundedAmount > 0);
  const allocations = Object.entries(alloc).filter(([, v]) => Number(v) > 0).map(([k, v]) => ({ chargeId: Number(k), amount: Number(v) }));
  const total = round2(allocations.reduce((s, x) => s + x.amount, 0) + (Number(fromAdvance) || 0));
  return (
    <Modal title="Request refund" onClose={onClose} wide>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await runSafe(() => api.post('/payments/refunds', { admissionId, amount: total, refundType: type, reason, remarks, allocations }));
          if (r) {
            alert(`Refund ${r.refundNumber} ${r.status === 'APPROVED' ? 'approved' : 'submitted for approval'}.`);
            onDone();
            onClose();
          }
        }}
      >
        <div className="form-grid">
          <Select label="Refund type" value={type} onChange={setType} placeholder={null}
            options={['FULL', 'PARTIAL', 'FEE_HEAD', 'CAUTION_MONEY', 'ADVANCE', 'OTHER'].map((t) => ({ value: t, label: label(t) }))} />
          <Input label={`From advance (available ${money(summary.AdvanceAvailable)})`} type="number" value={fromAdvance} onChange={setFromAdvance} min="0" max={summary.AdvanceAvailable} />
          <TextArea label="Reason" value={reason} onChange={setReason} required />
          <TextArea label="Remarks" value={remarks} onChange={setRemarks} />
        </div>
        <h2 style={{ margin: '16px 0 8px' }}>Refund fees already paid (by fee head)</h2>
        <Table
          columns={[
            { key: 'FeeHeadName', label: 'Fee head', render: (r) => `${r.FeeHeadName}${r.PeriodName ? ' - ' + r.PeriodName : ''}` },
            { key: 'PaidAmount', label: 'Paid', type: 'money', render: (r) => money(r.PaidAmount + r.AdvanceAppliedAmount) },
            { key: 'RefundedAmount', label: 'Already refunded', type: 'money' },
            {
              key: 'x', label: 'Refund now', align: 'right', render: (r) => (
                <input type="number" step="0.01" min="0" max={r.PaidAmount + r.AdvanceAppliedAmount - r.RefundedAmount} style={{ width: 130 }}
                  value={alloc[r.ChargeId] ?? ''} onChange={(e) => setAlloc({ ...alloc, [r.ChargeId]: e.target.value })} />
              ),
            },
          ]}
          rows={paidCharges}
          empty="No paid charges."
        />
        <p className="muted">Refunding a paid fee credits that fee back (it no longer counts as charged). Unpaid fees are not affected - use a waiver for those.</p>
        <div className="form-actions">
          <b style={{ marginRight: 'auto' }}>Total refund: {money(total)}</b>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy || total <= 0}>Submit for approval</button>
        </div>
      </form>
    </Modal>
  );
}

function CancelAdmission({ admission, summary, onClose, onDone }: { admission: any; summary: any; onClose: () => void; onDone: () => void }) {
  const { runSafe, busy } = useAction();
  const [v, setV] = useState({ cancellationDate: todayISO(), reason: '', releaseSeat: true, refundRequired: false, waiveOutstanding: false });
  return (
    <Modal title={`Cancel admission ${admission.AdmissionNumber}`} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await runSafe(() => api.post(`/admissions/${admission.AdmissionId}/cancel`, v), 'Admission cancelled.');
          if (r) {
            onDone();
            onClose();
          }
        }}
      >
        <div className="alert alert-warn">
          The admission and its complete financial history are kept. Paid {money(summary.TotalPayments)}, outstanding {money(summary.Outstanding)}. The
          refund amount is never assumed - request any refund separately.
        </div>
        <div className="form-grid">
          <Input label="Cancellation date" type="date" value={v.cancellationDate} onChange={(x) => setV({ ...v, cancellationDate: x })} required max={todayISO()} />
          <TextArea label="Reason" value={v.reason} onChange={(x) => setV({ ...v, reason: x })} required />
          <div className="span-all" style={{ display: 'grid', gap: 8 }}>
            {admission.SeatId && <Check label={`Release seat ${admission.SeatNumber} for a replacement admission`} checked={v.releaseSeat} onChange={(x) => setV({ ...v, releaseSeat: x })} />}
            <Check label="Refund required" checked={v.refundRequired} onChange={(x) => setV({ ...v, refundRequired: x })} />
            {summary.Outstanding > 0 && (
              <Check label={`Request waiver of all unpaid fees (${money(summary.Outstanding)})`} hint="(each needs approval)" checked={v.waiveOutstanding}
                onChange={(x) => setV({ ...v, waiveOutstanding: x })} />
            )}
            {admission.ConsultantId && <div className="muted">This admission came through a consultant - a consultant review will be flagged. Consultant payments are not reversed automatically.</div>}
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Back</button>
          <button className="btn btn-danger" disabled={busy}>Cancel admission</button>
        </div>
      </form>
    </Modal>
  );
}

function ConsultantReview({ admissionId, onClose, onDone }: { admissionId: number; onClose: () => void; onDone: () => void }) {
  const { runSafe, busy } = useAction();
  const [decision, setDecision] = useState('NO_RECOVERY');
  const [remarks, setRemarks] = useState('');
  return (
    <Modal title="Consultant review decision" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await runSafe(() => api.post(`/admissions/${admissionId}/consultant-review`, { decision, remarks }), 'Decision recorded.');
          if (r) {
            onDone();
            onClose();
          }
        }}
      >
        <p className="muted">To recover money from the consultant, record a recovery on the consultant's page instead - the review is then closed automatically when it is approved.</p>
        <div className="form-grid">
          <Select label="Decision" value={decision} onChange={setDecision} placeholder={null}
            options={[{ value: 'NO_RECOVERY', label: 'No recovery' }, { value: 'ADJUSTED', label: 'Adjusted otherwise' }]} />
          <TextArea label="Remarks" value={remarks} onChange={setRemarks} required />
        </div>
        <div className="form-actions">
          <button className="btn" disabled={busy}>Save decision</button>
        </div>
      </form>
    </Modal>
  );
}
