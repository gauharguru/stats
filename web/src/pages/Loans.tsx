/* Student education loans: Bihar Student Credit Card (BSEFCL via DRCC) and bank loans */
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, qs } from '../api';
import { useAuth } from '../auth';
import {
  Badge, Card, Check, ErrorBox, ExportButton, Input, KV, Loading, Modal, PageHeader, PrintButton, Select, Stat, Table, Tabs, TextArea,
  useAction, useLoad, useToast,
} from '../components/ui';
import { date, dateTime, label, money, round2, todayISO } from '../format';
import { useLookups } from '../lookups';
import { StudentSearch } from './Students';

export const LOAN_TYPE_LABEL: Record<string, string> = {
  BSCC: 'Bihar Student Credit Card (DRCC)',
  BANK_LOAN: 'Bank education loan',
  OTHER: 'Other loan / scheme',
};
const LOAN_TYPES = Object.entries(LOAN_TYPE_LABEL).map(([value, l]) => ({ value, label: l }));
const LOAN_STATUSES = ['APPLIED', 'SANCTIONED', 'DISBURSING', 'FULLY_DISBURSED', 'CLOSED', 'CANCELLED', 'REJECTED'];

function useLoanDefaults() {
  return useLoad(() => api.get('/loans/defaults'), []).data;
}

/* ================= list / reports ================================== */
export function LoansList() {
  const { can } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState('loans');
  const [add, setAdd] = useState(false);
  return (
    <>
      <PageHeader
        title="Student loans"
        subtitle="Bihar Student Credit Card (BSEFCL / DRCC) and bank education loans"
        actions={
          <>
            {can('LOAN_RECEIVE') && <Link className="btn" to="/loans/import">Import BSEFCL payment advice</Link>}
            {can('LOAN_MANAGE') && <button className="btn btn-ghost" onClick={() => setAdd(true)}>Add loan (sanction letter)</button>}
          </>
        }
      />
      <Tabs
        tabs={[
          { key: 'loans', label: 'All loans' },
          { key: 'expected', label: 'Expected from lenders' },
          { key: 'advices', label: 'Payment advices' },
          { key: 'summary', label: 'Lender / DRCC summary' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'loans' && <LoanTable />}
      {tab === 'expected' && <ExpectedInstalments />}
      {tab === 'advices' && <AdviceList />}
      {tab === 'summary' && <LenderSummary />}
      {add && <PickStudentThenLoan onClose={() => setAdd(false)} onSaved={(id) => nav(`/loans/${id}`)} />}
    </>
  );
}

function LoanTable() {
  const { lookups } = useLookups();
  const nav = useNavigate();
  const defaults = useLoanDefaults();
  const [f, setF] = useState({ q: '', type: '', status: '', district: '', courseId: '', batchId: '', pending: '', overdue: '' });
  const url = `/loans${qs(f)}`;
  const { data, error } = useLoad(() => api.get(url), [url]);
  const t = data?.totals;
  return (
    <Card actions={<><ExportButton url={url} fileName="student-loans" /><PrintButton /></>}>
      <div className="filters no-print">
        <Input className="wide" label="Search" value={f.q} onChange={(v) => setF({ ...f, q: v })} placeholder="Name, Registration Id, loan no." />
        <Select label="Type" value={f.type} onChange={(v) => setF({ ...f, type: v })} options={LOAN_TYPES} placeholder="All" />
        <Select label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v })} options={LOAN_STATUSES.map((s) => ({ value: s, label: label(s) }))} placeholder="All" />
        <Select label="DRCC" value={f.district} onChange={(v) => setF({ ...f, district: v })} options={(defaults?.districts ?? []).map((x: string) => ({ value: x, label: x }))} placeholder="All" />
        <Select label="Course" value={f.courseId} onChange={(v) => setF({ ...f, courseId: v, batchId: '' })} options={(lookups?.courses ?? []).map((c) => ({ value: c.CourseId, label: c.CourseCode }))} placeholder="All" />
        <Select label="Batch" value={f.batchId} onChange={(v) => setF({ ...f, batchId: v })} placeholder="All"
          options={(lookups?.batches ?? []).filter((b) => !f.courseId || String(b.CourseId) === f.courseId).map((b) => ({ value: b.BatchId, label: b.BatchCode }))} />
        <Select label="Show" value={f.overdue ? 'overdue' : f.pending ? 'pending' : ''} placeholder="All loans"
          onChange={(v) => setF({ ...f, pending: v === 'pending' ? 'true' : '', overdue: v === 'overdue' ? 'true' : '' })}
          options={[{ value: 'pending', label: 'Money still to come' }, { value: 'overdue', label: 'Overdue instalments' }]} />
      </div>
      {t && (
        <div className="stats">
          <Stat label="Loans" value={data.rows.length} />
          <Stat label="Sanctioned" value={money(t.sanctioned, true)} />
          <Stat label="Received" value={money(t.received, true)} tone="good" />
          <Stat label="Still to come" value={money(t.pending, true)} />
          <Stat label="Overdue" value={money(t.overdue, true)} tone={t.overdue > 0 ? 'bad' : undefined} />
        </div>
      )}
      <ErrorBox error={error} />
      <Table
        columns={[
          { key: 'StudentName', label: 'Student', render: (r) => <>{r.StudentName}<div className="muted">{r.AdmissionNumber} · {r.CourseCode}</div></> },
          { key: 'RegistrationNumber', label: 'Reg. Id' },
          { key: 'LoanType', label: 'Type', render: (r) => (r.LoanType === 'BSCC' ? `BSCC${r.DrccDistrict ? ' · ' + r.DrccDistrict : ''}` : r.LenderName) },
          { key: 'SanctionedAmount', label: 'Sanctioned', type: 'money', total: true },
          { key: 'ReceivedAmount', label: 'Received', type: 'money', total: true },
          { key: 'OverdueAmount', label: 'Overdue', type: 'money', total: true },
          { key: 'NextExpectedDate', label: 'Next expected', render: (r) => (r.NextExpectedDate ? `${date(r.NextExpectedDate)} · ${money(r.NextExpectedAmount)}` : '—') },
          { key: 'Status', label: 'Status', type: 'status' },
          { key: 'PendingAmount', label: 'Still to come', type: 'money', total: true },
        ]}
        rows={data?.rows}
        showTotals
        onRowClick={(r) => nav(`/loans/${r.LoanId}`)}
        rowKey={(r) => r.LoanId}
        empty="No loans recorded."
      />
    </Card>
  );
}

function ExpectedInstalments() {
  const nav = useNavigate();
  const [f, setF] = useState({ from: '', to: '', overdue: '', type: '' });
  const url = `/loans/expected${qs(f)}`;
  const { data, error } = useLoad(() => api.get(url), [url]);
  return (
    <Card title="Instalments still to come from BSEFCL / banks" actions={<><ExportButton url={url} fileName="loan-instalments-expected" /><PrintButton /></>}>
      <div className="filters no-print">
        <Input label="Expected from" type="date" value={f.from} onChange={(v) => setF({ ...f, from: v })} />
        <Input label="Expected to" type="date" value={f.to} onChange={(v) => setF({ ...f, to: v })} />
        <Select label="Type" value={f.type} onChange={(v) => setF({ ...f, type: v })} options={LOAN_TYPES} placeholder="All" />
        <Select label="Show" value={f.overdue} onChange={(v) => setF({ ...f, overdue: v })} placeholder="All pending" options={[{ value: 'true', label: 'Overdue only' }]} />
      </div>
      {data && <div className="stats"><Stat label="Instalments" value={data.rows.length} /><Stat label="Amount expected" value={money(data.total, true)} /></div>}
      <ErrorBox error={error} />
      <Table
        columns={[
          { key: 'ExpectedDate', label: 'Expected', type: 'date' },
          { key: 'StudentName', label: 'Student', render: (r) => <>{r.StudentName}<div className="muted">{r.AdmissionNumber} · {r.CourseCode}</div></> },
          { key: 'RegistrationNumber', label: 'Reg. Id' },
          { key: 'PeriodLabel', label: 'Sem / Year' },
          { key: 'LenderName', label: 'Lender', render: (r) => (r.LoanType === 'BSCC' ? `BSEFCL${r.DrccDistrict ? ' · DRCC ' + r.DrccDistrict : ''}` : r.LenderName) },
          { key: 'ExpectedAmount', label: 'Instalment', type: 'money' },
          { key: 'ReceivedAmount', label: 'Received', type: 'money' },
          { key: 'InstallmentStatus', label: 'Status', type: 'status' },
          { key: 'PendingAmount', label: 'Pending', type: 'money', total: true },
        ]}
        rows={data?.rows}
        showTotals
        onRowClick={(r) => nav(`/loans/${r.LoanId}`)}
        empty="Nothing pending in this period."
      />
    </Card>
  );
}

function AdviceList() {
  const nav = useNavigate();
  const { data, error } = useLoad(() => api.get('/loans/advices/list'), []);
  return (
    <Card title="Payment advices received" actions={<ExportButton url="/loans/advices/list" fileName="loan-payment-advices" />}>
      <ErrorBox error={error} />
      <Table
        columns={[
          { key: 'AdviceNumber', label: 'Advice no.' },
          { key: 'AdviceDate', label: 'Advice date', type: 'date' },
          { key: 'LenderName', label: 'From' },
          { key: 'SourceReference', label: 'Reference' },
          { key: 'EntryCount', label: 'Students', type: 'number' },
          { key: 'BankVerified', label: 'Bank statement', render: (r) => (r.BankVerified ? <span className="badge badge-good">Verified</span> : <span className="badge badge-warn">To verify</span>) },
          { key: 'CreatedByName', label: 'Recorded by' },
          { key: 'TotalAmount', label: 'Amount', type: 'money', total: true },
        ]}
        rows={data?.rows}
        showTotals
        onRowClick={(r) => nav(`/loans/advices/${r.LoanAdviceId}`)}
        empty="No payment advices recorded yet."
      />
    </Card>
  );
}

function LenderSummary() {
  const { data, error } = useLoad(() => api.get('/loans/summary'), []);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  return (
    <Card title="By lender / DRCC" actions={<PrintButton />}>
      <div className="stats">
        <Stat label="Loans" value={data.totals.Loans} />
        <Stat label="Sanctioned" value={money(data.totals.Sanctioned, true)} />
        <Stat label="Received" value={money(data.totals.Received, true)} tone="good" />
        <Stat label="Still to come" value={money(data.totals.Pending, true)} />
        <Stat label="Overdue" value={money(data.totals.Overdue, true)} tone={data.totals.Overdue > 0 ? 'bad' : undefined} />
      </div>
      <Table
        columns={[
          { key: 'LoanType', label: 'Type', render: (r) => LOAN_TYPE_LABEL[r.LoanType] ?? r.LoanType },
          { key: 'LenderName', label: 'Lender' },
          { key: 'Office', label: 'DRCC / branch' },
          { key: 'Loans', label: 'Loans', type: 'number' },
          { key: 'Sanctioned', label: 'Sanctioned', type: 'money', total: true },
          { key: 'Received', label: 'Received', type: 'money', total: true },
          { key: 'Overdue', label: 'Overdue', type: 'money', total: true },
          { key: 'Pending', label: 'Still to come', type: 'money', total: true },
        ]}
        rows={data.byLender}
        showTotals
      />
    </Card>
  );
}

/* ================= a single loan =================================== */
export function LoanDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const nav = useNavigate();
  const { data, error, reload } = useLoad(() => api.get(`/loans/${id}`), [id]);
  const [modal, setModal] = useState<string | null>(null);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const l = data.loan;
  const bscc = l.LoanType === 'BSCC';
  const open = !['CANCELLED', 'REJECTED', 'CLOSED', 'APPLIED'].includes(l.Status);
  return (
    <>
      <PageHeader
        title={<>{l.StudentName} <span className="muted" style={{ fontWeight: 400 }}>· {l.LoanNumber}</span></>}
        subtitle={<><Link to={`/admissions/${l.AdmissionId}`}>{l.AdmissionNumber}</Link> · {l.CourseCode} · {LOAN_TYPE_LABEL[l.LoanType]} · <Badge status={l.Status} /></>}
        actions={
          <>
            {open && can('LOAN_RECEIVE') && l.PendingAmount > 0 && <button className="btn" onClick={() => setModal('receive')}>Record amount received</button>}
            {can('LOAN_MANAGE') && <button className="btn btn-ghost" onClick={() => setModal('edit')}>Edit sanction / schedule</button>}
          </>
        }
      />
      {l.Remarks?.includes('still to be entered') && (
        <div className="alert alert-warn">This loan was created from a payment advice. Enter the sanction letter details (amount and year-wise schedule) with “Edit sanction / schedule”.</div>
      )}
      <div className="stats">
        <Stat label="Sanctioned" value={money(l.SanctionedAmount)} sub={l.SanctionDate ? `on ${date(l.SanctionDate)}` : undefined} />
        <Stat label="Received by college" value={money(l.ReceivedAmount)} tone="good" sub={l.LastReceivedDate ? `last on ${date(l.LastReceivedDate)}` : undefined} />
        <Stat label="Still to come" value={money(l.PendingAmount)} />
        <Stat label="Overdue" value={money(l.OverdueAmount)} tone={l.OverdueAmount > 0 ? 'bad' : undefined} />
        <Stat label="Next expected" value={l.NextExpectedDate ? date(l.NextExpectedDate) : '—'} sub={l.NextExpectedDate ? `${l.NextPeriodLabel} · ${money(l.NextExpectedAmount)}` : undefined} />
      </div>
      <Card title={bscc ? 'Letter of sanction (Bihar Student Credit Card Scheme)' : 'Loan sanction'}>
        <KV
          items={[
            ['Lender', l.LenderName],
            [bscc ? 'DRCC' : 'Branch', bscc ? l.DrccDistrict : l.BranchName],
            [bscc ? 'Registration Id' : 'Application no.', l.RegistrationNumber],
            ['Sanction / loan a/c no.', l.SanctionNumber],
            ['Sanction date', date(l.SanctionDate)],
            ['Applicant (as on letter)', l.ApplicantName],
            ['Co-applicant', l.CoApplicantName],
            ['Address', l.ApplicantAddress],
            ['Course (as on letter)', l.CourseOnLetter],
            ['Student IFSC', l.StudentIfsc],
            ['Institute IFSC', l.InstituteIfsc],
            ['College account no.', l.InstituteAccountNo],
            ['Contract signed', date(l.ContractSignedDate)],
            ['Remarks', l.Remarks],
          ]}
        />
      </Card>
      <Card title="Disbursement structure (as per sanction letter)">
        <Table
          columns={[
            { key: 'PeriodLabel', label: 'Sem / Year' },
            { key: 'ExpectedDate', label: 'Expected date', type: 'date' },
            { key: 'FeeDescription', label: 'Fee description' },
            { key: 'ExpectedMode', label: 'Mode' },
            { key: 'ReceivedAmount', label: 'Received', type: 'money', total: true },
            { key: 'InstallmentStatus', label: 'Status', type: 'status' },
            { key: 'ExpectedAmount', label: 'Amount sanctioned', type: 'money', total: true },
          ]}
          rows={data.schedule.filter((s: any) => s.IsActive)}
          showTotals
          empty="No disbursement schedule entered."
        />
      </Card>
      <Card title="Amounts received from the lender">
        <Table
          columns={[
            { key: 'ReceiptNumber', label: 'Receipt' },
            { key: 'PaymentDate', label: 'Date', type: 'date' },
            { key: 'LoanPeriodLabel', label: 'Instalment' },
            { key: 'PaymentModeName', label: 'Mode' },
            { key: 'TransactionReference', label: 'UTR' },
            { key: 'AdviceNumber', label: 'Advice' },
            { key: 'Status', label: 'Status', type: 'status' },
            { key: 'Amount', label: 'Amount', type: 'money', total: true },
          ]}
          rows={data.receipts}
          showTotals
          onRowClick={(r) => nav(`/payments/${r.PaymentId}`)}
          empty="Nothing received yet."
        />
      </Card>
      {modal === 'receive' && <ReceiveModal loan={l} schedule={data.schedule} onClose={() => setModal(null)} onDone={reload} />}
      {modal === 'edit' && <LoanFormModal admission={{ AdmissionId: l.AdmissionId, StudentName: l.StudentName, CourseId: l.CourseId }} loan={data} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />}
    </>
  );
}

function ReceiveModal({ loan, schedule, onClose, onDone }: { loan: any; schedule: any[]; onClose: () => void; onDone: () => void }) {
  const { lookups } = useLookups();
  const toast = useToast();
  const pending = schedule.filter((s) => s.IsActive && s.PendingAmount > 0);
  const rtgs = lookups?.paymentModes.find((m) => m.PaymentModeCode === 'RTGS');
  const [v, setV] = useState({
    loanScheduleId: pending[0] ? String(pending[0].LoanScheduleId) : '',
    amount: pending[0] ? String(pending[0].PendingAmount) : '',
    paymentDate: todayISO(),
    paymentModeId: rtgs ? String(rtgs.PaymentModeId) : '',
    transactionReference: '',
    remarks: '',
  });
  const [busy, setBusy] = useState(false);
  const [dup, setDup] = useState(false);
  const submit = async (e: FormEvent, confirm = false) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post(`/loans/${loan.LoanId}/receive`, {
        ...v, loanScheduleId: Number(v.loanScheduleId) || null, amount: Number(v.amount), paymentModeId: Number(v.paymentModeId), confirmDuplicateReference: confirm,
      });
      toast('ok', r.receiptNumber ? `Recorded. Receipt ${r.receiptNumber}` : 'Recorded - waiting for approval.');
      onDone();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DUPLICATE_REFERENCE') setDup(true);
      else toast('err', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Amount received from ${loan.LoanType === 'BSCC' ? 'BSEFCL' : loan.LenderName}`} onClose={onClose}>
      <form onSubmit={(e) => submit(e)}>
        <p className="muted">
          {loan.StudentName} · Reg {loan.RegistrationNumber ?? '—'} · still to come {money(loan.PendingAmount)}. The amount is applied to the student's dues
          (oldest first) and shown in the student ledger; any extra is kept as advance.
        </p>
        <div className="form-grid">
          <Select label="Instalment" value={v.loanScheduleId} placeholder="Not linked to an instalment"
            onChange={(x) => { const s = pending.find((p) => String(p.LoanScheduleId) === x); setV({ ...v, loanScheduleId: x, amount: s ? String(s.PendingAmount) : v.amount }); }}
            options={pending.map((s) => ({ value: s.LoanScheduleId, label: `${s.PeriodLabel} · expected ${date(s.ExpectedDate)} · ${money(s.PendingAmount)}` }))} />
          <Input label="Amount received (₹)" type="number" value={v.amount} onChange={(x) => setV({ ...v, amount: x })} required min="0.01" max={loan.PendingAmount} />
          <Input label="Date of payment" type="date" value={v.paymentDate} onChange={(x) => setV({ ...v, paymentDate: x })} required max={todayISO()} />
          <Select label="Mode" value={v.paymentModeId} onChange={(x) => setV({ ...v, paymentModeId: x })} required
            options={(lookups?.paymentModes ?? []).filter((m) => !m.IsCash && m.IsActive).map((m) => ({ value: m.PaymentModeId, label: m.PaymentModeName }))} />
          <Input label="UTR / reference" value={v.transactionReference} onChange={(x) => setV({ ...v, transactionReference: x })} required />
          <TextArea label="Remarks" value={v.remarks} onChange={(x) => setV({ ...v, remarks: x })} />
        </div>
        {dup && (
          <div className="alert alert-warn" style={{ marginTop: 12 }}>
            This UTR is already recorded. <button type="button" className="link-btn" onClick={(e) => submit(e as unknown as FormEvent, true)}>It is a different credit - record anyway</button>
          </div>
        )}
        <div className="form-actions"><button className="btn" disabled={busy}>Record</button></div>
      </form>
    </Modal>
  );
}

/* ================= sanction letter form ============================ */
interface Line {
  loanScheduleId?: number | null;
  periodLabel: string;
  expectedDate: string;
  feeDescription: string;
  expectedAmount: string;
  expectedMode: string;
  beneficiaryName: string;
  beneficiaryAccountNo: string;
}

export function LoanFormModal({ admission, loan, onClose, onSaved }: { admission: any; loan?: any; onClose: () => void; onSaved: (loanId: number) => void }) {
  const defaults = useLoanDefaults();
  const { runSafe, busy } = useAction();
  const l = loan?.loan;
  const [v, setV] = useState<any>(() => ({
    loanType: l?.LoanType ?? 'BSCC',
    lenderName: l?.LenderName ?? '',
    drccDistrict: l?.DrccDistrict ?? '',
    branchName: l?.BranchName ?? '',
    registrationNumber: l?.RegistrationNumber ?? '',
    sanctionNumber: l?.SanctionNumber ?? '',
    sanctionDate: l?.SanctionDate ?? '',
    sanctionedAmount: l ? String(l.SanctionedAmount) : '',
    applicantName: l?.ApplicantName ?? admission.StudentName ?? '',
    coApplicantName: l?.CoApplicantName ?? '',
    applicantAddress: l?.ApplicantAddress ?? '',
    courseOnLetter: l?.CourseOnLetter ?? '',
    studentIfsc: l?.StudentIfsc ?? '',
    instituteIfsc: l?.InstituteIfsc ?? '',
    instituteAccountNo: l?.InstituteAccountNo ?? '',
    contractSignedDate: l?.ContractSignedDate ?? '',
    status: l?.Status ?? 'SANCTIONED',
    remarks: l?.Remarks ?? '',
  }));
  const [lines, setLines] = useState<Line[]>(() =>
    (loan?.schedule ?? []).filter((s: any) => s.IsActive).map((s: any) => ({
      loanScheduleId: s.LoanScheduleId, periodLabel: s.PeriodLabel, expectedDate: s.ExpectedDate ?? '', feeDescription: s.FeeDescription ?? '',
      expectedAmount: String(s.ExpectedAmount), expectedMode: s.ExpectedMode ?? '', beneficiaryName: s.BeneficiaryName ?? '', beneficiaryAccountNo: s.BeneficiaryAccountNo ?? '',
    })),
  );
  /* pre-fill the college's details on new loans */
  useEffect(() => {
    if (!defaults || l) return;
    setV((x: any) => ({
      ...x,
      lenderName: x.lenderName || (x.loanType === 'BSCC' ? defaults.bsccLender : ''),
      instituteIfsc: x.instituteIfsc || defaults.instituteIfsc,
      instituteAccountNo: x.instituteAccountNo || defaults.instituteAccountNo,
    }));
  }, [defaults]); // eslint-disable-line react-hooks/exhaustive-deps

  const bscc = v.loanType === 'BSCC';
  const u = (k: string) => (x: string) => setV({ ...v, [k]: x });
  const blank = (n: number): Line => ({
    periodLabel: `YEAR ${n}`, expectedDate: '', feeDescription: 'Tuition Fees including Hostel Expenses', expectedAmount: '',
    expectedMode: 'RTGS', beneficiaryName: (defaults?.collegeName ?? '').toUpperCase(), beneficiaryAccountNo: v.instituteAccountNo,
  });
  const scheduleTotal = round2(lines.reduce((t, x) => t + (Number(x.expectedAmount) || 0), 0));
  const setLine = (i: number, k: keyof Line, x: string) => setLines(lines.map((ln, j) => (j === i ? { ...ln, [k]: x } : ln)));
  const splitEqually = () => {
    const n = lines.length || 1;
    const each = Math.floor((Number(v.sanctionedAmount) || 0) / n);
    const last = round2((Number(v.sanctionedAmount) || 0) - each * (n - 1));
    setLines((lines.length ? lines : [blank(1)]).map((ln, i) => ({ ...ln, expectedAmount: String(i === n - 1 ? last : each) })));
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = {
      ...v,
      admissionId: admission.AdmissionId,
      sanctionedAmount: Number(v.sanctionedAmount) || 0,
      schedule: lines.map((x) => ({ ...x, expectedAmount: Number(x.expectedAmount) || 0, loanScheduleId: x.loanScheduleId ?? null })),
    };
    const r = await runSafe(() => (l ? api.put(`/loans/${l.LoanId}`, body) : api.post('/loans', body)), 'Loan saved.');
    if (r) onSaved(l ? l.LoanId : r.loanId);
  };
  return (
    <Modal title={l ? `Edit ${l.LoanNumber}` : `Record loan sanction - ${admission.StudentName}`} onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="form-grid">
          <Select label="Loan type" value={v.loanType} placeholder={null} options={LOAN_TYPES}
            onChange={(x) => setV({ ...v, loanType: x, lenderName: x === 'BSCC' ? defaults?.bsccLender ?? v.lenderName : v.lenderName === defaults?.bsccLender ? '' : v.lenderName })} />
          <Input label={bscc ? 'Lender' : 'Bank'} value={v.lenderName} onChange={u('lenderName')} required />
          {bscc ? (
            <Field label="DRCC district" list="drcc-districts" value={v.drccDistrict} onChange={u('drccDistrict')} options={defaults?.districts ?? []} placeholder="e.g. MUZAFFARPUR" />
          ) : (
            <Input label="Branch" value={v.branchName} onChange={u('branchName')} />
          )}
          <Input label={bscc ? 'Registration Id (RegId)' : 'Application no.'} value={v.registrationNumber} onChange={u('registrationNumber')} required={bscc}
            hint={bscc ? 'As on the sanction letter - used to match BSEFCL payment e-mails.' : undefined} />
          <Input label="Sanction date (letter date)" type="date" value={v.sanctionDate} onChange={u('sanctionDate')} />
          <Input label="Total amount sanctioned (₹)" type="number" value={v.sanctionedAmount} onChange={u('sanctionedAmount')} required min="0" />
          <Input label={bscc ? 'Sanction ref. (optional)' : 'Loan account no.'} value={v.sanctionNumber} onChange={u('sanctionNumber')} />
          <Input label="Applicant name (as on letter)" value={v.applicantName} onChange={u('applicantName')} />
          <Input label="Co-applicant" value={v.coApplicantName} onChange={u('coApplicantName')} />
          <Input label="Course (as on letter)" value={v.courseOnLetter} onChange={u('courseOnLetter')} placeholder="e.g. B.Sc. (Nursing)" />
          <Input label="Student IFSC (User IFSC)" value={v.studentIfsc} onChange={(x) => setV({ ...v, studentIfsc: x.toUpperCase() })} />
          <Input label="Institute IFSC" value={v.instituteIfsc} onChange={(x) => setV({ ...v, instituteIfsc: x.toUpperCase() })} />
          <Input label="College account no. (beneficiary)" value={v.instituteAccountNo} onChange={u('instituteAccountNo')} />
          <Input label="Contract signed on" type="date" value={v.contractSignedDate} onChange={u('contractSignedDate')} />
          {l && <Select label="Status" value={v.status} onChange={u('status')} placeholder={null} options={LOAN_STATUSES.map((s) => ({ value: s, label: label(s) }))} />}
          <TextArea label="Address (as on letter)" value={v.applicantAddress} onChange={u('applicantAddress')} />
          <TextArea label="Remarks" value={v.remarks} onChange={u('remarks')} />
        </div>

        <div className="split" style={{ margin: '18px 0 8px' }}>
          <h2>Disbursement structure</h2>
          <span className="actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLines([...lines, blank(lines.length + 1)])}>Add row</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={splitEqually} disabled={!Number(v.sanctionedAmount)}>Split sanction equally</button>
          </span>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>Copy each row of the letter's table (Sem/Year, expected disbursement date, fee description, amount, mode). The same year may appear twice.</p>
        {lines.length === 0 && <div className="mlist-empty">No rows yet - “Add row” for each line of the sanction letter.</div>}
        <div className="sched-lines">
          {lines.map((ln, i) => (
            <div key={i} className="sched-line">
              <Input label="Sem / Year" value={ln.periodLabel} onChange={(x) => setLine(i, 'periodLabel', x.toUpperCase())} required />
              <Input label="Expected date" type="date" value={ln.expectedDate} onChange={(x) => setLine(i, 'expectedDate', x)} />
              <Input label="Amount (₹)" type="number" value={ln.expectedAmount} onChange={(x) => setLine(i, 'expectedAmount', x)} required min="0" />
              <Input label="Mode" value={ln.expectedMode} onChange={(x) => setLine(i, 'expectedMode', x.toUpperCase())} />
              <Input label="Fee description" value={ln.feeDescription} onChange={(x) => setLine(i, 'feeDescription', x)} className="wide-field" />
              <button type="button" className="btn btn-ghost btn-sm sched-remove" onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Remove row">Remove</button>
            </div>
          ))}
        </div>
        <div className={`alert ${scheduleTotal > (Number(v.sanctionedAmount) || 0) ? 'alert-err' : scheduleTotal === (Number(v.sanctionedAmount) || 0) ? 'alert-ok' : 'alert-info'}`} style={{ marginTop: 10 }}>
          Schedule total {money(scheduleTotal)} of {money(Number(v.sanctionedAmount) || 0)} sanctioned
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>Save loan</button>
        </div>
      </form>
    </Modal>
  );
}

/* text input with suggestions (datalist) */
function Field({ label: l, list, value, onChange, options, placeholder }: { label: string; list: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <label className="field">
      <span className="field-label">{l}</span>
      <input list={list} value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} placeholder={placeholder} />
      <datalist id={list}>{options.map((o) => <option key={o} value={o} />)}</datalist>
    </label>
  );
}

function PickStudentThenLoan({ onClose, onSaved }: { onClose: () => void; onSaved: (loanId: number) => void }) {
  const [student, setStudent] = useState<any>(null);
  if (student) return <LoanFormModal admission={student} onClose={onClose} onSaved={onSaved} />;
  return (
    <Modal title="Add loan - choose the student" onClose={onClose}>
      <StudentSearch onPick={(s) => s.AdmissionId && setStudent(s)} />
      <p className="muted">Search by name, admission no., father's name or mobile.</p>
    </Modal>
  );
}

/* Loans tab on the admission page */
export function AdmissionLoans({ admission }: { admission: any }) {
  const { can } = useAuth();
  const nav = useNavigate();
  const { data, error, reload } = useLoad(() => api.get(`/loans/admission/${admission.AdmissionId}`), [admission.AdmissionId]);
  const [add, setAdd] = useState(false);
  return (
    <Card title="Education loans (BSCC / bank)" actions={can('LOAN_MANAGE') && <button className="btn" onClick={() => setAdd(true)}>Add loan sanction</button>}>
      <ErrorBox error={error} />
      <Table
        columns={[
          { key: 'LoanNumber', label: 'Loan', render: (r) => <>{LOAN_TYPE_LABEL[r.LoanType]}<div className="muted">{r.LoanNumber} · Reg {r.RegistrationNumber ?? '—'}</div></> },
          { key: 'LenderName', label: 'Lender', render: (r) => `${r.LenderName}${r.DrccDistrict ? ' · DRCC ' + r.DrccDistrict : ''}` },
          { key: 'SanctionedAmount', label: 'Sanctioned', type: 'money' },
          { key: 'ReceivedAmount', label: 'Received', type: 'money' },
          { key: 'NextExpectedDate', label: 'Next expected', render: (r) => (r.NextExpectedDate ? `${r.NextPeriodLabel} · ${date(r.NextExpectedDate)} · ${money(r.NextExpectedAmount)}` : '—') },
          { key: 'Status', label: 'Status', type: 'status' },
          { key: 'PendingAmount', label: 'Still to come', type: 'money' },
        ]}
        rows={data?.rows}
        onRowClick={(r) => nav(`/loans/${r.LoanId}`)}
        empty="No loan recorded for this admission."
      />
      {data?.schedule?.length > 0 && (
        <>
          <h2 style={{ margin: '16px 0 8px' }}>Year-wise disbursement</h2>
          <Table
            columns={[
              { key: 'PeriodLabel', label: 'Sem / Year' },
              { key: 'ExpectedDate', label: 'Expected', type: 'date' },
              { key: 'ReceivedAmount', label: 'Received', type: 'money', total: true },
              { key: 'LastReceivedDate', label: 'Received on', type: 'date' },
              { key: 'InstallmentStatus', label: 'Status', type: 'status' },
              { key: 'ExpectedAmount', label: 'Sanctioned', type: 'money', total: true },
            ]}
            rows={data.schedule}
            showTotals
          />
        </>
      )}
      {add && <LoanFormModal admission={admission} onClose={() => setAdd(false)} onSaved={() => { setAdd(false); reload(); }} />}
    </Card>
  );
}

/* ================= payment advice import =========================== */
export function ImportAdvice() {
  const { lookups } = useLookups();
  const defaults = useLoanDefaults();
  const toast = useToast();
  const nav = useNavigate();
  const [text, setText] = useState('');
  const [pdf, setPdf] = useState<{ name: string; base64: string } | null>(null);
  const [rows, setRows] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const rtgs = lookups?.paymentModes.find((m) => m.PaymentModeCode === 'RTGS');
  const [h, setH] = useState({ loanType: 'BSCC', lenderName: '', adviceDate: todayISO(), sourceReference: 'Bihar Student Credit Card - Tuition Fees Details', paymentModeId: '' });
  useEffect(() => {
    setH((x) => ({ ...x, lenderName: x.lenderName || defaults?.bsccLender || '', paymentModeId: x.paymentModeId || (rtgs ? String(rtgs.PaymentModeId) : '') }));
  }, [defaults, rtgs]);
  const [result, setResult] = useState<any>(null);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPdf({ name: f.name, base64: String(r.result).split(',')[1] ?? '' });
    r.readAsDataURL(f);
  };
  const read = async () => {
    setBusy(true);
    try {
      const r = await api.post('/loans/advices/parse', pdf ? { pdfBase64: pdf.base64 } : { text });
      setRows(
        r.rows.map((x: any) => ({
          ...x,
          include: x.match === 'MATCHED' || x.match === 'SUGGESTED',
          admission: x.loan ? null : x.candidates[0] ?? null,
        })),
      );
    } catch (e) {
      toast('err', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const chosen = (rows ?? []).filter((r) => r.include && (r.loan || r.admission));
  const total = round2(chosen.reduce((t, r) => t + r.amount, 0));
  const record = async () => {
    setBusy(true);
    try {
      const r = await api.post('/loans/advices', {
        ...h,
        paymentModeId: Number(h.paymentModeId),
        rows: chosen.map((x) => ({
          registrationNumber: x.registrationNumber, applicantName: x.applicantName, course: x.course, amount: x.amount, paymentDate: x.paymentDate,
          utr: x.utr, ifsc: x.ifsc, accountNo: x.accountNo, loanId: x.loan?.LoanId ?? null, admissionId: x.loan ? null : x.admission?.AdmissionId ?? null,
        })),
      });
      setResult(r);
      toast('ok', `${r.recorded} receipts recorded (${money(r.total)}).`);
    } catch (e) {
      toast('err', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const setRow = (i: number, patch: any) => setRows((rs) => rs!.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows ?? []) c[r.match] = (c[r.match] ?? 0) + 1;
    return c;
  }, [rows]);

  if (result)
    return (
      <>
        <PageHeader title="Payment advice recorded" />
        <Card>
          <div className="alert alert-ok">
            Advice <b>{result.adviceNumber}</b>: {result.recorded} receipts, total <b>{money(result.total)}</b>. Each amount is now in the student's ledger.
          </div>
          <Table
            columns={[
              { key: 'registrationNumber', label: 'Reg. Id' },
              { key: 'utr', label: 'UTR' },
              { key: 'receiptNumber', label: 'Receipt', render: (r) => r.receiptNumber ?? (r.status === 'PENDING_APPROVAL' ? 'Waiting for approval' : '—') },
              { key: 'createdLoan', label: 'New loan record', render: (r) => r.createdLoan ?? '' },
              { key: 'amount', label: 'Amount', type: 'money', total: true },
            ]}
            rows={result.results}
            showTotals
          />
          <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="btn" onClick={() => nav(`/loans/advices/${result.loanAdviceId}`)}>Open advice</button>
            <button className="btn btn-ghost" onClick={() => { setResult(null); setRows(null); setText(''); setPdf(null); }}>Import another</button>
          </div>
        </Card>
      </>
    );

  return (
    <>
      <PageHeader title="Import payment advice" subtitle="BSEFCL e-mail “Bihar Student Credit Card - Tuition Fees Details” or a bank's list of disbursements" />
      {!rows && (
        <Card title="1. The advice">
          <div className="form-grid">
            <label className="field span-2">
              <span className="field-label">Upload the e-mail as PDF</span>
              <input type="file" accept="application/pdf" onChange={onFile} />
              <span className="field-hint">In Gmail open the e-mail → Print → Save as PDF. {pdf && <b>Selected: {pdf.name}</b>}</span>
            </label>
          </div>
          <div className="or-line" style={{ margin: '14px 0' }}><span>or paste the table</span></div>
          <div className="form-grid">
            <TextArea label="Table copied from the e-mail" value={text} onChange={setText} rows={6}
              hint="Select the whole table in the e-mail, copy, and paste here. Excel/CSV rows in the same column order also work." />
          </div>
          <div className="form-actions">
            <button className="btn" disabled={busy || (!pdf && !text.trim())} onClick={read}>{busy ? 'Reading…' : 'Read advice'}</button>
          </div>
        </Card>
      )}
      {rows && (
        <>
          <Card title="2. Check and record">
            <div className="form-grid">
              <Select label="Loan type" value={h.loanType} onChange={(x) => setH({ ...h, loanType: x })} options={LOAN_TYPES} placeholder={null} />
              <Input label="From (lender)" value={h.lenderName} onChange={(x) => setH({ ...h, lenderName: x })} required />
              <Input label="Advice / e-mail date" type="date" value={h.adviceDate} onChange={(x) => setH({ ...h, adviceDate: x })} required />
              <Select label="Mode" value={h.paymentModeId} onChange={(x) => setH({ ...h, paymentModeId: x })} placeholder={null}
                options={(lookups?.paymentModes ?? []).filter((m) => !m.IsCash).map((m) => ({ value: m.PaymentModeId, label: m.PaymentModeName }))} />
              <Input label="Reference (e-mail subject / letter no.)" value={h.sourceReference} onChange={(x) => setH({ ...h, sourceReference: x })} className="span-2" />
            </div>
            <div className="stats" style={{ marginTop: 12 }}>
              <Stat label="Rows in advice" value={rows.length} />
              <Stat label="Matched to a loan" value={counts.MATCHED ?? 0} tone="good" />
              <Stat label="Student found, no loan yet" value={counts.SUGGESTED ?? 0} />
              <Stat label="Already recorded" value={counts.ALREADY_RECORDED ?? 0} />
              <Stat label="Need attention" value={(counts.UNMATCHED ?? 0) + (counts.EXCEEDS_SANCTION ?? 0)} tone={(counts.UNMATCHED ?? 0) + (counts.EXCEEDS_SANCTION ?? 0) ? 'bad' : undefined} />
            </div>
          </Card>
          <div className="mlist">
            {rows.map((r, i) => (
              <div key={r.utr + i} className={`mcard advice-row advice-${r.match.toLowerCase()}`}>
                <div className="mcard-head">
                  <label className="check" style={{ alignItems: 'center' }}>
                    <input type="checkbox" checked={r.include} disabled={r.match === 'ALREADY_RECORDED' || (!r.loan && !r.admission)}
                      onChange={(e) => setRow(i, { include: e.target.checked })} />
                    <span className="mcard-title">{r.applicantName}</span>
                  </label>
                  <div className="mcard-amount">{money(r.amount)}</div>
                </div>
                <div className="mcard-sub">{r.course} · Reg <b>{r.registrationNumber}</b> · {date(r.paymentDate)} · UTR {r.utr}</div>
                <div style={{ marginTop: 6 }}>
                  <Badge status={r.match} /> {r.message && <span className="muted">{r.message}</span>}
                </div>
                {r.loan && (
                  <div className="muted" style={{ marginTop: 4 }}>
                    → {r.loan.StudentName} ({r.loan.AdmissionNumber}) · loan {r.loan.LoanNumber}, still to come {money(r.loan.PendingAmount)}
                  </div>
                )}
                {!r.loan && r.match !== 'ALREADY_RECORDED' && (
                  <div style={{ marginTop: 8 }}>
                    {r.admission ? (
                      <div className="split">
                        <span>→ <b>{r.admission.StudentName}</b> ({r.admission.AdmissionNumber}, {r.admission.CourseCode}) - a loan record will be created</span>
                        <button className="link-btn" onClick={() => setRow(i, { admission: null, include: false })}>Change</button>
                      </div>
                    ) : (
                      <>
                        {r.candidates.length > 1 && (
                          <Select label="Choose student" value="" onChange={(x) => { const c = r.candidates.find((c: any) => String(c.AdmissionId) === x); setRow(i, { admission: c, include: true }); }}
                            options={r.candidates.map((c: any) => ({ value: c.AdmissionId, label: `${c.StudentName} s/o ${c.FatherName ?? '—'} · ${c.AdmissionNumber}` }))} />
                        )}
                        <StudentSearch placeholder="Find the student for this row…" onPick={(s) => s.AdmissionId && setRow(i, { admission: { ...s, CourseCode: s.CourseCode }, include: true })} />
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <Card className="sticky-summary">
            <div className="split" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div><b>{chosen.length}</b> receipts, total <b>{money(total)}</b></div>
              <div className="actions">
                <button className="btn btn-ghost" onClick={() => setRows(null)}>Back</button>
                <button className="btn" disabled={busy || !chosen.length || !h.paymentModeId} onClick={record}>{busy ? 'Recording…' : `Record ${chosen.length} receipts`}</button>
              </div>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

export function AdviceDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const nav = useNavigate();
  const { data, error, reload } = useLoad(() => api.get(`/loans/advices/${id}`), [id]);
  const { runSafe, busy } = useAction();
  const [remarks, setRemarks] = useState('');
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const a = data.advice;
  return (
    <>
      <PageHeader title={`Payment advice ${a.AdviceNumber}`} subtitle={`${a.LenderName} · ${date(a.AdviceDate)}`} actions={<PrintButton />} />
      <div className="stats">
        <Stat label="Students" value={a.EntryCount} />
        <Stat label="Total" value={money(a.TotalAmount)} tone="good" />
        <Stat label="Bank statement" value={a.BankVerified ? 'Verified' : 'Not verified'} tone={a.BankVerified ? 'good' : 'warn'}
          sub={a.BankVerified ? `${a.VerifiedByName}, ${dateTime(a.BankVerifiedAt)}` : 'Check each UTR in the bank statement'} />
      </div>
      <Card>
        <KV items={[['Reference', a.SourceReference], ['Recorded by', `${a.CreatedByName}, ${dateTime(a.CreatedAt)}`], ['Remarks', a.Remarks]]} />
        {can('LOAN_RECEIVE') && (
          <div style={{ marginTop: 12 }}>
            {!a.BankVerified && <div className="form-grid"><TextArea label="Verification remarks" value={remarks} onChange={setRemarks} /></div>}
            <Check label="All credits checked against the college bank statement" checked={!!a.BankVerified}
              onChange={async (x) => { if (await runSafe(() => api.post(`/loans/advices/${id}/verify`, { verified: x, remarks: remarks || null }), 'Saved.')) reload(); }} />
            {busy && <span className="muted"> saving…</span>}
          </div>
        )}
      </Card>
      <Card title="Receipts in this advice">
        <Table
          columns={[
            { key: 'StudentName', label: 'Student', render: (r) => <>{r.StudentName}<div className="muted">{r.AdmissionNumber} · {r.CourseCode}</div></> },
            { key: 'LoanRegistrationNumber', label: 'Reg. Id' },
            { key: 'ReceiptNumber', label: 'Receipt' },
            { key: 'TransactionReference', label: 'UTR' },
            { key: 'LoanPeriodLabel', label: 'Instalment' },
            { key: 'Status', label: 'Status', type: 'status' },
            { key: 'Amount', label: 'Amount', type: 'money', total: true },
          ]}
          rows={data.payments}
          showTotals
          onRowClick={(r) => nav(`/payments/${r.PaymentId}`)}
        />
      </Card>
    </>
  );
}

