import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, qs } from '../api';
import { useAuth } from '../auth';
import { Badge, Card, Check, ErrorBox, ExportButton, Input, KV, Loading, Modal, PageHeader, PrintButton, Select, Stat, Table, Tabs, TextArea, useAction, useLoad, useToast } from '../components/ui';
import { date, dateTime, label, money, todayISO } from '../format';
import { useLookups } from '../lookups';

const EMPTY = {
  ConsultantName: '', OrganizationName: '', ContactPerson: '', Mobile: '', Email: '', Address: '', PAN: '', GSTIN: '', BankName: '', AccountName: '',
  AccountNumber: '', IFSC: '', DefaultRate: '', Status: 'ACTIVE', Remarks: '',
};

function ConsultantForm({ initial, onClose, onSaved }: { initial?: any; onClose: () => void; onSaved: (id?: number) => void }) {
  const [v, setV] = useState<any>(initial ?? EMPTY);
  const { runSafe, busy } = useAction();
  const u = (k: string) => (x: string) => setV({ ...v, [k]: x });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = { ...v, DefaultRate: v.DefaultRate === '' || v.DefaultRate === null ? null : Number(v.DefaultRate) };
    const r = await runSafe(() => (initial ? api.put(`/consultants/${initial.ConsultantId}`, body) : api.post('/consultants', body)), 'Consultant saved.');
    if (r) onSaved(r.consultantId);
  };
  return (
    <Modal title={initial ? 'Edit consultant' : 'Add consultant'} onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="form-grid">
          <Input label="Consultant name" value={v.ConsultantName} onChange={u('ConsultantName')} required />
          <Input label="Organisation / firm" value={v.OrganizationName} onChange={u('OrganizationName')} />
          <Input label="Contact person" value={v.ContactPerson} onChange={u('ContactPerson')} />
          <Input label="Mobile" value={v.Mobile} onChange={u('Mobile')} required />
          <Input label="Email" type="email" value={v.Email} onChange={u('Email')} />
          <Input label="PAN" value={v.PAN} onChange={u('PAN')} />
          <Input label="GSTIN" value={v.GSTIN} onChange={u('GSTIN')} />
          <Input label="Bank" value={v.BankName} onChange={u('BankName')} />
          <Input label="Account name" value={v.AccountName} onChange={u('AccountName')} />
          <Input label="Account number" value={v.AccountNumber} onChange={u('AccountNumber')} />
          <Input label="IFSC" value={v.IFSC} onChange={u('IFSC')} />
          <Input label="Default rate per admission (₹)" type="number" value={v.DefaultRate} onChange={u('DefaultRate')} min="0" />
          <Select label="Status" value={v.Status} onChange={u('Status')} placeholder={null} options={['ACTIVE', 'INACTIVE', 'BLOCKED'].map((s) => ({ value: s, label: label(s) }))} />
          <TextArea label="Address" value={v.Address} onChange={u('Address')} />
          <TextArea label="Remarks" value={v.Remarks} onChange={u('Remarks')} />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>Save</button>
        </div>
      </form>
    </Modal>
  );
}

export function ConsultantsList() {
  const { can } = useAuth();
  const { reload: reloadLookups } = useLookups();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [add, setAdd] = useState(false);
  const url = `/consultants${qs({ q })}`;
  const { data, error } = useLoad(() => api.get(url), [url]);
  return (
    <>
      <PageHeader title="Consultants" actions={<><ExportButton url={url} fileName="consultants" />{can('CONSULTANT_EDIT') && <button className="btn" onClick={() => setAdd(true)}>Add consultant</button>}</>} />
      <Card>
        <div className="filters">
          <Input className="wide" label="Search" value={q} onChange={setQ} placeholder="Name, code, organisation, mobile" />
        </div>
        <ErrorBox error={error} />
        <Table
          columns={[
            { key: 'ConsultantCode', label: 'Code' },
            { key: 'ConsultantName', label: 'Name' },
            { key: 'OrganizationName', label: 'Organisation' },
            { key: 'Mobile', label: 'Mobile' },
            { key: 'TotalAdmissions', label: 'Admissions', type: 'number' },
            { key: 'CancelledAdmissions', label: 'Cancelled', type: 'number' },
            ...(can('CONSULTANT_FINANCE_VIEW')
              ? [
                  { key: 'TotalPayable', label: 'Payable', type: 'money' as const, total: true },
                  { key: 'TotalPaid', label: 'Paid', type: 'money' as const, total: true },
                  { key: 'Outstanding', label: 'Outstanding', type: 'money' as const, total: true },
                ]
              : []),
            { key: 'Status', label: 'Status', type: 'status' },
          ]}
          rows={data?.rows}
          showTotals={can('CONSULTANT_FINANCE_VIEW')}
          onRowClick={(r) => nav(`/consultants/${r.ConsultantId}`)}
        />
      </Card>
      {add && <ConsultantForm onClose={() => setAdd(false)} onSaved={(id) => { setAdd(false); reloadLookups(); if (id) nav(`/consultants/${id}`); }} />}
    </>
  );
}

export function ConsultantProfile() {
  const { id } = useParams();
  const { can } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState('students');
  const [modal, setModal] = useState<{ kind: string; row?: any } | null>(null);
  const main = useLoad(() => api.get(`/consultants/${id}`), [id]);
  const fin = can('CONSULTANT_FINANCE_VIEW');
  const students = useLoad(() => api.get(`/consultants/${id}/students`), [id]);
  const payables = useLoad(() => (fin ? api.get(`/consultants/${id}/payables`) : Promise.resolve({ rows: [] })), [id, fin]);
  const payments = useLoad(() => (fin ? api.get(`/consultants/${id}/payments`) : Promise.resolve({ rows: [] })), [id, fin]);
  const recoveries = useLoad(() => (fin ? api.get(`/consultants/${id}/recoveries`) : Promise.resolve({ rows: [] })), [id, fin]);
  const ledger = useLoad(() => (fin ? api.get(`/consultants/${id}/ledger`) : Promise.resolve({ rows: [] })), [id, fin]);
  const reloadAll = () => [main, students, payables, payments, recoveries, ledger].forEach((x) => x.reload());
  if (main.error) return <ErrorBox error={main.error} />;
  if (!main.data) return <Loading />;
  const c = main.data.consultant;
  const s = main.data.summary;
  return (
    <>
      <PageHeader
        title={c.ConsultantName}
        subtitle={<>{c.ConsultantCode}{c.OrganizationName && ` · ${c.OrganizationName}`} · {c.Mobile} · <Badge status={c.Status} /></>}
        actions={
          <>
            {can('CONSULTANT_EDIT') && <button className="btn btn-ghost" onClick={() => setModal({ kind: 'edit' })}>Edit</button>}
            {can('CONSULTANT_PAYABLE_CREATE') && <button className="btn btn-ghost" onClick={() => setModal({ kind: 'payable' })}>Add payable</button>}
            {can('CONSULTANT_RECOVERY_CREATE') && <button className="btn btn-ghost" onClick={() => setModal({ kind: 'recovery' })}>Record recovery</button>}
            {fin && <Link className="btn btn-ghost" to={`/consultants/${id}/statement`}>Statement</Link>}
          </>
        }
      />
      {s && (
        <div className="stats">
          <Stat label="Admissions" value={s.TotalAdmissions} sub={`${s.ActiveAdmissions} active · ${s.CancelledAdmissions} cancelled`} />
          <Stat label="Approved payable" value={money(s.TotalPayable)} />
          <Stat label="Paid (net)" value={money(s.TotalPaid)} />
          <Stat label="Recovered / adjusted" value={money(s.TotalRecovery)} />
          <Stat label="Outstanding" value={money(s.Outstanding)} tone={s.Outstanding > 0 ? 'warn' : undefined} sub={s.PendingPayments > 0 ? `${money(s.PendingPayments)} in process` : undefined} />
        </div>
      )}
      <Tabs
        tabs={[
          { key: 'students', label: 'Students' },
          ...(fin ? [{ key: 'payables', label: 'Payables & payments' }, { key: 'recoveries', label: 'Recoveries' }, { key: 'ledger', label: 'Ledger' }] : []),
          { key: 'rates', label: 'Rates' },
          { key: 'profile', label: 'Profile' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'students' && (
        <Card actions={<ExportButton url={`/consultants/${id}/students`} fileName="consultant-students" />}>
          <Table
            columns={[
              { key: 'AdmissionNumber', label: 'Admission' },
              { key: 'AdmissionDate', label: 'Date', type: 'date' },
              { key: 'StudentName', label: 'Student' },
              { key: 'CourseCode', label: 'Course' },
              { key: 'BatchCode', label: 'Batch' },
              { key: 'AdmissionStatus', label: 'Status', type: 'status' },
              { key: 'ConsultantReviewStatus', label: 'Review', render: (r) => (r.ConsultantReviewStatus ? <Badge status={r.ConsultantReviewStatus} /> : '') },
              ...(fin
                ? [
                    { key: 'Payable', label: 'Payable', type: 'money' as const, total: true },
                    { key: 'Paid', label: 'Paid', type: 'money' as const, total: true },
                    { key: 'Recovery', label: 'Recovery', type: 'money' as const, total: true },
                    { key: 'Outstanding', label: 'Outstanding', type: 'money' as const, total: true },
                  ]
                : []),
            ]}
            rows={students.data?.rows}
            showTotals={fin}
            onRowClick={(r) => nav(`/admissions/${r.AdmissionId}`)}
          />
        </Card>
      )}
      {tab === 'payables' && (
        <>
          <Card title="Payables">
            <Table
              columns={[
                { key: 'PayableDate', label: 'Date', type: 'date' },
                { key: 'Description', label: 'Description' },
                { key: 'StudentName', label: 'Student' },
                { key: 'AdmissionStatus', label: 'Admission', render: (r) => (r.AdmissionStatus ? <Badge status={r.AdmissionStatus} /> : '') },
                { key: 'ApprovedAmount', label: 'Payable', type: 'money' },
                { key: 'PaidAmount', label: 'Paid', type: 'money' },
                { key: 'InProcessAmount', label: 'In process', type: 'money' },
                { key: 'RemainingAmount', label: 'Remaining', type: 'money' },
                { key: 'Status', label: 'Status', type: 'status' },
                {
                  key: 'act', label: '', render: (r) =>
                    r.Status === 'APPROVED' && can('CONSULTANT_PAYMENT_CREATE') && (
                      <button className="btn btn-sm" onClick={() => setModal({ kind: 'pay', row: r })}>Pay</button>
                    ),
                },
              ]}
              rows={payables.data?.rows}
              empty="No payables."
            />
          </Card>
          <Card title="Payments">
            <Table
              columns={[
                { key: 'PaymentNumber', label: 'Payment no.' },
                { key: 'PaymentDate', label: 'Date', type: 'date' },
                { key: 'StudentName', label: 'Student' },
                { key: 'PaymentModeName', label: 'Mode' },
                { key: 'TransactionReference', label: 'Reference' },
                { key: 'Amount', label: 'Amount', type: 'money' },
                { key: 'IsOverride', label: 'Override', render: (r) => (r.IsOverride ? <span className="badge badge-warn">Override</span> : '') },
                { key: 'Status', label: 'Status', type: 'status' },
                {
                  key: 'act', label: '', render: (r) =>
                    r.Status === 'APPROVED' && can('CONSULTANT_PAYMENT_PROCESS') && (
                      <button className="btn btn-sm" onClick={() => setModal({ kind: 'process', row: r })}>Mark paid</button>
                    ),
                },
              ]}
              rows={payments.data?.rows}
              empty="No payments."
            />
          </Card>
        </>
      )}
      {tab === 'recoveries' && (
        <Card>
          <Table
            columns={[
              { key: 'RecoveryDate', label: 'Date', type: 'date' },
              { key: 'StudentName', label: 'Student' },
              { key: 'RecoveryMode', label: 'Mode', render: (r) => (r.RecoveryMode === 'CASH' ? 'Money received back' : 'Set off') },
              { key: 'Amount', label: 'Amount', type: 'money' },
              { key: 'Reason', label: 'Reason' },
              { key: 'Status', label: 'Status', type: 'status' },
            ]}
            rows={recoveries.data?.rows}
            empty="No recoveries."
          />
        </Card>
      )}
      {tab === 'ledger' && (
        <Card title="Consultant ledger" actions={<><ExportButton url={`/consultants/${id}/ledger`} fileName="consultant-ledger" /><PrintButton /></>}>
          <ConsultantLedgerTable rows={ledger.data?.rows} />
        </Card>
      )}
      {tab === 'rates' && <Rates consultantId={Number(id)} rates={main.data.rates} onChange={main.reload} />}
      {tab === 'profile' && (
        <Card>
          <KV items={[
            ['Contact person', c.ContactPerson], ['Email', c.Email], ['Address', c.Address], ['PAN', c.PAN], ['GSTIN', c.GSTIN], ['Bank', c.BankName],
            ['Account name', c.AccountName], ['Account number', c.AccountNumber], ['IFSC', c.IFSC], ['Default rate', c.DefaultRate != null ? money(c.DefaultRate) : null],
            ['Remarks', c.Remarks], ['Created', dateTime(c.CreatedAt)],
          ]} />
        </Card>
      )}
      {modal?.kind === 'edit' && (
        <ConsultantForm initial={{ ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, c[k] ?? ''])), ConsultantId: c.ConsultantId }}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); reloadAll(); }} />
      )}
      {modal?.kind === 'payable' && <PayableForm consultantId={Number(id)} students={students.data?.rows ?? []} onClose={() => setModal(null)} onDone={reloadAll} />}
      {modal?.kind === 'pay' && <ConsultantPaymentForm payable={modal.row} onClose={() => setModal(null)} onDone={reloadAll} />}
      {modal?.kind === 'process' && <ProcessPayment payment={modal.row} onClose={() => setModal(null)} onDone={reloadAll} />}
      {modal?.kind === 'recovery' && <RecoveryForm consultantId={Number(id)} payables={payables.data?.rows ?? []} onClose={() => setModal(null)} onDone={reloadAll} />}
    </>
  );
}

function ConsultantLedgerTable({ rows }: { rows: any[] | undefined }) {
  return (
    <Table
      columns={[
        { key: 'EntryDate', label: 'Date', type: 'date' },
        { key: 'Particulars', label: 'Particular', render: (r) => <>{r.Particulars}{r.Reference && <div className="muted">{r.Reference}</div>}</> },
        { key: 'StudentName', label: 'Student' },
        { key: 'CourseCode', label: 'Course' },
        { key: 'PayableAmount', label: 'Payable', type: 'money', render: (r) => (r.PayableAmount ? money(r.PayableAmount) : '') },
        { key: 'PaidAmount', label: 'Paid', type: 'money', render: (r) => (r.PaidAmount ? money(r.PaidAmount) : '') },
        { key: 'RecoveryAmount', label: 'Recovery', type: 'money', render: (r) => (r.RecoveryAmount ? money(r.RecoveryAmount) : '') },
        { key: 'RunningBalance', label: 'Balance', type: 'money' },
      ]}
      rows={rows}
      empty="No ledger entries."
    />
  );
}

export function ConsultantStatement() {
  const { id } = useParams();
  const { lookups } = useLookups();
  const [f, setF] = useState({ from: '', to: '' });
  const { data, error } = useLoad(() => api.get(`/consultants/${id}/statement${qs(f)}`), [id, f]);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const s = data.summary;
  return (
    <>
      <div className="actions no-print" style={{ marginBottom: 12 }}>
        <Input label="From" type="date" value={f.from} onChange={(v) => setF({ ...f, from: v })} />
        <Input label="To" type="date" value={f.to} onChange={(v) => setF({ ...f, to: v })} />
        <button className="btn" onClick={() => window.print()}>Print / Save PDF</button>
        <Link className="btn btn-ghost" to={`/consultants/${id}`}>Back</Link>
      </div>
      <div className="doc">
        <div className="doc-head"><div><h1>{lookups?.college.name}</h1><div className="muted">{lookups?.college.address}</div></div></div>
        <div className="doc-title">CONSULTANT STATEMENT</div>
        <table>
          <tbody>
            <tr><th style={{ width: '25%' }}>Consultant</th><td>{data.consultant.ConsultantName} ({data.consultant.ConsultantCode})</td></tr>
            <tr><th>Period</th><td>{f.from || f.to ? `${date(f.from) } to ${date(f.to)}` : 'All time'}</td></tr>
            <tr><th>Total admissions</th><td>{s.TotalAdmissions}</td></tr>
            <tr><th>Total approved payable</th><td>{money(s.TotalPayable)}</td></tr>
            <tr><th>Total paid</th><td>{money(s.TotalPaid)}</td></tr>
            <tr><th>Total recovery</th><td>{money(s.TotalRecovery)}</td></tr>
            <tr><th>Outstanding</th><td><b>{money(s.Outstanding)}</b></td></tr>
          </tbody>
        </table>
        <h3>Detail</h3>
        <ConsultantLedgerTable rows={data.ledger} />
      </div>
    </>
  );
}

function Rates({ consultantId, rates, onChange }: { consultantId: number; rates: any[]; onChange: () => void }) {
  const { can } = useAuth();
  const { lookups } = useLookups();
  const { runSafe, busy } = useAction();
  const [add, setAdd] = useState(false);
  const [v, setV] = useState({ RateType: 'FIXED', CourseId: '', BatchId: '', AdmissionId: '', Amount: '', EffectiveFrom: todayISO(), EffectiveTo: '' });
  return (
    <Card title="Commission / reimbursement rates" actions={can('CONSULTANT_EDIT') && <button className="btn" onClick={() => setAdd(true)}>Add rate</button>}>
      <p className="muted">Most specific wins: student-specific → batch-wise → course-wise → fixed → consultant default.</p>
      <Table
        columns={[
          { key: 'RateType', label: 'Type', render: (r) => label(r.RateType) },
          { key: 'scope', label: 'Applies to', render: (r) => r.AdmissionNumber || r.BatchCode || r.CourseCode || 'All admissions' },
          { key: 'Amount', label: 'Amount', type: 'money' },
          { key: 'EffectiveFrom', label: 'From', type: 'date' },
          { key: 'EffectiveTo', label: 'To', type: 'date' },
          { key: 'IsActive', label: 'Active', render: (r) => (r.IsActive ? 'Yes' : 'No') },
          {
            key: 'act', label: '', render: (r) =>
              r.IsActive && can('CONSULTANT_EDIT') ? (
                <button className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => { if (await runSafe(() => api.post(`/consultants/rates/${r.ConsultantRateId}/deactivate`), 'Rate deactivated.')) onChange(); }}>
                  Deactivate
                </button>
              ) : null,
          },
        ]}
        rows={rates}
        empty="No rates. The consultant default rate (if any) is used."
      />
      {add && (
        <Modal title="Add rate" onClose={() => setAdd(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await runSafe(
                () => api.post(`/consultants/${consultantId}/rates`, {
                  ...v, Amount: Number(v.Amount), CourseId: Number(v.CourseId) || null, BatchId: Number(v.BatchId) || null, AdmissionId: Number(v.AdmissionId) || null,
                }),
                'Rate added.',
              );
              if (r) { setAdd(false); onChange(); }
            }}
          >
            <div className="form-grid">
              <Select label="Rate type" value={v.RateType} onChange={(x) => setV({ ...v, RateType: x })} placeholder={null}
                options={['FIXED', 'COURSE_WISE', 'BATCH_WISE', 'STUDENT_SPECIFIC'].map((t) => ({ value: t, label: label(t) }))} />
              {v.RateType === 'COURSE_WISE' && <Select label="Course" value={v.CourseId} onChange={(x) => setV({ ...v, CourseId: x })} required options={(lookups?.courses ?? []).map((c) => ({ value: c.CourseId, label: c.CourseCode }))} />}
              {v.RateType === 'BATCH_WISE' && <Select label="Batch" value={v.BatchId} onChange={(x) => setV({ ...v, BatchId: x })} required options={(lookups?.batches ?? []).map((b) => ({ value: b.BatchId, label: b.BatchCode }))} />}
              {v.RateType === 'STUDENT_SPECIFIC' && <Input label="Admission ID (internal)" value={v.AdmissionId} onChange={(x) => setV({ ...v, AdmissionId: x })} required hint="Open the admission and use the number in its address bar." />}
              <Input label="Amount (₹)" type="number" value={v.Amount} onChange={(x) => setV({ ...v, Amount: x })} required min="0" />
              <Input label="Effective from" type="date" value={v.EffectiveFrom} onChange={(x) => setV({ ...v, EffectiveFrom: x })} required />
              <Input label="Effective to" type="date" value={v.EffectiveTo} onChange={(x) => setV({ ...v, EffectiveTo: x })} />
            </div>
            <div className="form-actions"><button className="btn" disabled={busy}>Save</button></div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

function PayableForm({ consultantId, students, onClose, onDone }: { consultantId: number; students: any[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({ admissionId: '', amount: '', description: '', payableDate: todayISO(), allowAdditional: false });
  const [exists, setExists] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post('/consultants/payables', { ...v, admissionId: Number(v.admissionId) || null, amount: Number(v.amount) });
      toast('ok', r.autoApproved ? 'Payable approved.' : 'Payable submitted for approval.');
      onDone();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PAYABLE_EXISTS') setExists(true);
      toast('err', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Add consultant payable" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <Select label="Admission" value={v.admissionId} onChange={(x) => setV({ ...v, admissionId: x })} placeholder="Not linked to a student"
            options={students.map((s) => ({ value: s.AdmissionId, label: `${s.StudentName} (${s.AdmissionNumber})` }))} />
          <Input label="Amount (₹)" type="number" value={v.amount} onChange={(x) => setV({ ...v, amount: x })} required min="0.01" />
          <Input label="Date" type="date" value={v.payableDate} onChange={(x) => setV({ ...v, payableDate: x })} required />
          <TextArea label="Description" value={v.description} onChange={(x) => setV({ ...v, description: x })} required />
          {exists && <div className="span-all"><Check label="Yes, create an additional payable for this admission" checked={v.allowAdditional} onChange={(x) => setV({ ...v, allowAdditional: x })} /></div>}
        </div>
        <div className="form-actions"><button className="btn" disabled={busy}>Submit for approval</button></div>
      </form>
    </Modal>
  );
}

function ConsultantPaymentForm({ payable, onClose, onDone }: { payable: any; onClose: () => void; onDone: () => void }) {
  const { lookups } = useLookups();
  const { can } = useAuth();
  const toast = useToast();
  const [v, setV] = useState({ amount: String(Math.max(0, payable.RemainingAmount)), paymentDate: todayISO(), paymentModeId: '', transactionReference: '', bankName: '', remarks: '', override: false, overrideReason: '' });
  const [warn, setWarn] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mode = lookups?.paymentModes.find((m) => String(m.PaymentModeId) === v.paymentModeId);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post('/consultants/payments', { ...v, consultantPayableId: payable.ConsultantPayableId, amount: Number(v.amount), paymentModeId: Number(v.paymentModeId) });
      toast('ok', `Payment ${r.paymentNumber} submitted for approval.`);
      onDone();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'PAYABLE_SETTLED' || err.code === 'PAYABLE_EXCEEDED')) setWarn(err.message);
      else toast('err', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Consultant payment request" onClose={onClose}>
      <form onSubmit={submit}>
        <p className="muted">{payable.Description} · payable {money(payable.ApprovedAmount)} · remaining {money(payable.RemainingAmount)}</p>
        {warn && (
          <div className="alert alert-warn">
            <b>{warn}</b>
            {can('CONSULTANT_PAYMENT_OVERRIDE') ? (
              <div style={{ marginTop: 8 }}>
                <Check label="Authorised override" checked={v.override} onChange={(x) => setV({ ...v, override: x })} />
              </div>
            ) : (
              <div>An authorised override is required. Ask an Admin / MD.</div>
            )}
          </div>
        )}
        <div className="form-grid">
          <Input label="Amount (₹)" type="number" value={v.amount} onChange={(x) => setV({ ...v, amount: x })} required min="0.01" />
          <Input label="Payment date" type="date" value={v.paymentDate} onChange={(x) => setV({ ...v, paymentDate: x })} required />
          <Select label="Mode" value={v.paymentModeId} onChange={(x) => setV({ ...v, paymentModeId: x })} required
            options={(lookups?.paymentModes ?? []).filter((m) => m.IsActive).map((m) => ({ value: m.PaymentModeId, label: m.PaymentModeName }))} />
          {mode?.RequiresReference && <Input label="Reference / UTR" value={v.transactionReference} onChange={(x) => setV({ ...v, transactionReference: x })} required />}
          {mode?.RequiresBank && <Input label="Bank" value={v.bankName} onChange={(x) => setV({ ...v, bankName: x })} />}
          {v.override && <TextArea label="Override reason" value={v.overrideReason} onChange={(x) => setV({ ...v, overrideReason: x })} required />}
          <TextArea label="Remarks" value={v.remarks} onChange={(x) => setV({ ...v, remarks: x })} />
        </div>
        <div className="form-actions"><button className="btn" disabled={busy}>Submit for approval</button></div>
      </form>
    </Modal>
  );
}

function ProcessPayment({ payment, onClose, onDone }: { payment: any; onClose: () => void; onDone: () => void }) {
  const { runSafe, busy } = useAction();
  const [v, setV] = useState({ paymentDate: todayISO(), transactionReference: payment.TransactionReference ?? '' });
  return (
    <Modal title={`Mark ${payment.PaymentNumber} as paid`} onClose={onClose}>
      <form onSubmit={async (e) => { e.preventDefault(); if (await runSafe(() => api.post(`/consultants/payments/${payment.ConsultantPaymentId}/process`, v), 'Payment processed.')) { onDone(); onClose(); } }}>
        <p className="muted">Amount {money(payment.Amount)} via {payment.PaymentModeName}. It is posted to the consultant ledger.</p>
        <div className="form-grid">
          <Input label="Paid on" type="date" value={v.paymentDate} onChange={(x) => setV({ ...v, paymentDate: x })} required />
          <Input label="Reference / UTR" value={v.transactionReference} onChange={(x) => setV({ ...v, transactionReference: x })} />
        </div>
        <div className="form-actions"><button className="btn" disabled={busy}>Confirm</button></div>
      </form>
    </Modal>
  );
}

function RecoveryForm({ consultantId, payables, onClose, onDone }: { consultantId: number; payables: any[]; onClose: () => void; onDone: () => void }) {
  const { lookups } = useLookups();
  const { runSafe, busy } = useAction();
  const [v, setV] = useState({ consultantPayableId: '', recoveryMode: 'CASH', paymentModeId: '', transactionReference: '', amount: '', reason: '', recoveryDate: todayISO() });
  return (
    <Modal title="Record consultant recovery" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await runSafe(() => api.post('/consultants/recoveries', {
            ...v, consultantId, consultantPayableId: Number(v.consultantPayableId) || null, paymentModeId: Number(v.paymentModeId) || null, amount: Number(v.amount),
          }), 'Recovery submitted for approval.');
          if (r) { onDone(); onClose(); }
        }}
      >
        <div className="form-grid">
          <Select label="Against payable" value={v.consultantPayableId} onChange={(x) => setV({ ...v, consultantPayableId: x })} placeholder="General"
            options={payables.filter((p) => p.Status === 'APPROVED').map((p) => ({ value: p.ConsultantPayableId, label: `${p.StudentName ?? p.Description} - ${money(p.ApprovedAmount)}` }))} />
          <Select label="Recovery type" value={v.recoveryMode} onChange={(x) => setV({ ...v, recoveryMode: x })} placeholder={null}
            options={[{ value: 'CASH', label: 'Money received back from consultant' }, { value: 'ADJUST', label: 'Set off against future payables' }]} />
          {v.recoveryMode === 'CASH' && (
            <>
              <Select label="Received via" value={v.paymentModeId} onChange={(x) => setV({ ...v, paymentModeId: x })} required
                options={(lookups?.paymentModes ?? []).map((m) => ({ value: m.PaymentModeId, label: m.PaymentModeName }))} />
              <Input label="Reference" value={v.transactionReference} onChange={(x) => setV({ ...v, transactionReference: x })} />
            </>
          )}
          <Input label="Amount (₹)" type="number" value={v.amount} onChange={(x) => setV({ ...v, amount: x })} required min="0.01" />
          <Input label="Date" type="date" value={v.recoveryDate} onChange={(x) => setV({ ...v, recoveryDate: x })} required />
          <TextArea label="Reason" value={v.reason} onChange={(x) => setV({ ...v, reason: x })} required />
        </div>
        <div className="form-actions"><button className="btn" disabled={busy}>Submit for approval</button></div>
      </form>
    </Modal>
  );
}
