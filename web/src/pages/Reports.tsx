import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, qs } from '../api';
import { useAuth } from '../auth';
import { Card, ErrorBox, ExportButton, Input, PageHeader, PrintButton, Select, Stat, Table, Tabs, useLoad } from '../components/ui';
import { date, dateTime, daysAgoISO, label, money, todayISO } from '../format';
import { useLookups } from '../lookups';

function CourseBatch({ f, setF }: { f: any; setF: (v: any) => void }) {
  const { lookups } = useLookups();
  return (
    <>
      <Select label="Course" value={f.courseId} onChange={(v) => setF({ ...f, courseId: v, batchId: '' })} placeholder="All"
        options={(lookups?.courses ?? []).map((c) => ({ value: c.CourseId, label: c.CourseCode }))} />
      <Select label="Batch" value={f.batchId} onChange={(v) => setF({ ...f, batchId: v })} placeholder="All"
        options={(lookups?.batches ?? []).filter((b) => !f.courseId || String(b.CourseId) === String(f.courseId)).map((b) => ({ value: b.BatchId, label: b.BatchCode }))} />
    </>
  );
}

export function CollectionReport() {
  const { can } = useAuth();
  const { lookups } = useLookups();
  const [f, setF] = useState({ from: todayISO(), to: todayISO(), groupBy: 'date', courseId: '', batchId: '', paymentModeId: '' });
  const url = `/reports/collection${qs(f)}`;
  const { data, error } = useLoad(() => api.get(url), [url]);
  const net = useLoad(() => (can('REPORT_VIEW') ? api.get(`/reports/net-collection${qs({ from: f.from, to: f.to })}`) : Promise.resolve(null)), [f.from, f.to]);
  return (
    <>
      <PageHeader title="Collection report" subtitle={can('REPORT_VIEW') ? undefined : 'Showing your own collections'} actions={<><ExportButton url={url} fileName="collection" /><PrintButton /></>} />
      <Card>
        <div className="filters no-print">
          <Input label="From" type="date" value={f.from} onChange={(v) => setF({ ...f, from: v })} />
          <Input label="To" type="date" value={f.to} onChange={(v) => setF({ ...f, to: v })} />
          <Select label="Group by" value={f.groupBy} onChange={(v) => setF({ ...f, groupBy: v })} placeholder={null}
            options={[['date', 'Date'], ['mode', 'Payment mode'], ['cashier', 'Cashier'], ['course', 'Course'], ['batch', 'Batch'], ['feehead', 'Fee head']].map(([value, l]) => ({ value, label: l }))} />
          <CourseBatch f={f} setF={setF} />
          <Select label="Mode" value={f.paymentModeId} onChange={(v) => setF({ ...f, paymentModeId: v })} placeholder="All"
            options={(lookups?.paymentModes ?? []).map((m) => ({ value: m.PaymentModeId, label: m.PaymentModeName }))} />
          <div className="actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setF({ ...f, from: todayISO(), to: todayISO() })}>Today</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setF({ ...f, from: daysAgoISO(6), to: todayISO() })}>7 days</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setF({ ...f, from: todayISO().slice(0, 8) + '01', to: todayISO() })}>This month</button>
          </div>
        </div>
        {net.data && (
          <div className="stats">
            <Stat label="Gross student collection" value={money(net.data.GrossCollection)} />
            <Stat label="Refunds paid" value={money(net.data.Refunds)} />
            <Stat label="Net student collection" value={money(net.data.NetStudentCollection)} tone="good" />
            <Stat label="Consultant payments (separate)" value={money(net.data.ConsultantPayments)} />
          </div>
        )}
        <ErrorBox error={error} />
        <Table
          columns={[
            { key: 'Label', label: label(f.groupBy === 'feehead' ? 'fee_head' : f.groupBy), render: (r) => (f.groupBy === 'date' ? date(r.Label) : r.Label) },
            { key: 'Payments', label: 'Payments', type: 'number' },
            { key: 'Amount', label: 'Amount', type: 'money', total: true },
          ]}
          rows={data?.rows}
          showTotals
          empty="No collections in this period."
        />
      </Card>
    </>
  );
}

export function DueReport() {
  const nav = useNavigate();
  const [f, setF] = useState({ courseId: '', batchId: '', status: 'ACTIVE', minDue: '' });
  const url = `/reports/due${qs(f)}`;
  const { data, error } = useLoad(() => api.get(url), [url]);
  return (
    <>
      <PageHeader title="Student due report" actions={<><ExportButton url={url} fileName="due-report" /><PrintButton /></>} />
      <Card>
        <div className="filters no-print">
          <CourseBatch f={f} setF={setF} />
          <Select label="Admission status" value={f.status} onChange={(v) => setF({ ...f, status: v })} placeholder="All"
            options={['ACTIVE', 'CANCELLED', 'SUSPENDED', 'COMPLETED'].map((s) => ({ value: s, label: label(s) }))} />
          <Input label="Minimum due (₹)" type="number" value={f.minDue} onChange={(v) => setF({ ...f, minDue: v })} />
        </div>
        {data && <div className="stats"><Stat label="Students with dues" value={data.rows.length} /><Stat label="Total outstanding" value={money(data.total)} tone="bad" /></div>}
        <ErrorBox error={error} />
        <Table
          columns={[
            { key: 'AdmissionNumber', label: 'Admission' },
            { key: 'StudentName', label: 'Student' },
            { key: 'FatherName', label: "Father's name" },
            { key: 'Mobile', label: 'Mobile' },
            { key: 'CourseCode', label: 'Course' },
            { key: 'BatchCode', label: 'Batch' },
            { key: 'NetCharges', label: 'Net charges', type: 'money', total: true },
            { key: 'TotalPayments', label: 'Paid', type: 'money', total: true },
            { key: 'Outstanding', label: 'Due', type: 'money', total: true },
          ]}
          rows={data?.rows}
          showTotals
          onRowClick={(r) => nav(`/admissions/${r.AdmissionId}`)}
        />
      </Card>
    </>
  );
}

export function FeeSummaryReport() {
  const [by, setBy] = useState('course');
  const url = `/reports/fee-summary${qs({ by })}`;
  const { data, error } = useLoad(() => api.get(url), [url]);
  return (
    <>
      <PageHeader title="Course / batch fee summary" actions={<><ExportButton url={url} fileName="fee-summary" /><PrintButton /></>} />
      <Card>
        <div className="filters no-print">
          <Select label="Group by" value={by} onChange={setBy} placeholder={null} options={[{ value: 'course', label: 'Course' }, { value: 'batch', label: 'Batch' }]} />
        </div>
        <ErrorBox error={error} />
        <Table
          columns={[
            { key: 'CourseCode', label: 'Course' },
            ...(by === 'batch' ? [{ key: 'BatchCode', label: 'Batch' }] : []),
            { key: 'Admissions', label: 'Admissions', type: 'number' },
            { key: 'Active', label: 'Active', type: 'number' },
            { key: 'TotalCharges', label: 'Charges', type: 'money', total: true },
            { key: 'Discounts', label: 'Discounts', type: 'money', total: true },
            { key: 'Waivers', label: 'Waivers', type: 'money', total: true },
            { key: 'Collected', label: 'Collected', type: 'money', total: true },
            { key: 'Refunded', label: 'Refunded', type: 'money', total: true },
            { key: 'Advance', label: 'Advance', type: 'money', total: true },
            { key: 'Outstanding', label: 'Outstanding', type: 'money', total: true },
          ]}
          rows={data?.rows}
          showTotals
        />
      </Card>
    </>
  );
}

export function ControlReports() {
  const [tab, setTab] = useState('discounts');
  const [f, setF] = useState({ from: daysAgoISO(30), to: todayISO(), status: '' });
  const url = `/reports/${tab}${qs(f)}`;
  const { data, error } = useLoad(() => api.get(url), [url]);
  const cols: Record<string, any[]> = {
    discounts: [
      { key: 'CreatedAt', label: 'Requested', render: (r: any) => dateTime(r.CreatedAt) }, { key: 'StudentName', label: 'Student' }, { key: 'AdmissionNumber', label: 'Admission' },
      { key: 'FeeHeadName', label: 'Fee' }, { key: 'Reason', label: 'Reason' }, { key: 'RequestedBy', label: 'Requested by' }, { key: 'ApprovedBy', label: 'Approved by' },
      { key: 'Status', label: 'Status', type: 'status' }, { key: 'DiscountAmount', label: 'Amount', type: 'money', total: true },
    ],
    waivers: [
      { key: 'CreatedAt', label: 'Requested', render: (r: any) => dateTime(r.CreatedAt) }, { key: 'StudentName', label: 'Student' }, { key: 'AdmissionNumber', label: 'Admission' },
      { key: 'FeeHeadName', label: 'Fee' }, { key: 'AdjustmentType', label: 'Type', render: (r: any) => label(r.AdjustmentType) }, { key: 'Reason', label: 'Reason' },
      { key: 'ApprovedBy', label: 'Approved by' }, { key: 'Status', label: 'Status', type: 'status' }, { key: 'Amount', label: 'Amount', type: 'money', total: true },
    ],
    reversals: [
      { key: 'ReversalDate', label: 'Date', type: 'date' }, { key: 'OriginalTransactionType', label: 'Of', render: (r: any) => label(r.OriginalTransactionType) },
      { key: 'ReceiptNumber', label: 'Receipt' }, { key: 'StudentName', label: 'Student' }, { key: 'Reason', label: 'Reason' }, { key: 'RequestedBy', label: 'Requested by' },
      { key: 'ApprovedBy', label: 'Approved by' }, { key: 'Status', label: 'Status', type: 'status' }, { key: 'Amount', label: 'Amount', type: 'money', total: true },
    ],
  };
  return (
    <>
      <PageHeader title="Control reports" actions={<><ExportButton url={url} fileName={tab} /><PrintButton /></>} />
      <Tabs tabs={[{ key: 'discounts', label: 'Discounts' }, { key: 'waivers', label: 'Waivers' }, { key: 'reversals', label: 'Reversals' }]} active={tab} onChange={setTab} />
      <Card>
        <div className="filters no-print">
          <Input label="From" type="date" value={f.from} onChange={(v) => setF({ ...f, from: v })} />
          <Input label="To" type="date" value={f.to} onChange={(v) => setF({ ...f, to: v })} />
          <Select label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v })} placeholder="All"
            options={['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'].map((s) => ({ value: s, label: label(s) }))} />
        </div>
        <ErrorBox error={error} />
        <Table columns={cols[tab]} rows={data?.rows} showTotals />
      </Card>
    </>
  );
}

export function AdmissionHistoryReport() {
  const [f, setF] = useState({ courseId: '', batchId: '' });
  const url = `/reports/admission-history${qs(f)}`;
  const { data, error } = useLoad(() => api.get(url), [url]);
  return (
    <>
      <PageHeader title="Seat / admission history" subtitle="Cancelled admissions and the replacements who took their seats" actions={<><ExportButton url={url} fileName="admission-history" /><PrintButton /></>} />
      <Card>
        <div className="filters no-print"><CourseBatch f={f} setF={setF} /></div>
        <ErrorBox error={error} />
        <Table
          columns={[
            { key: 'BatchCode', label: 'Batch' },
            { key: 'SeatNumber', label: 'Seat' },
            { key: 'StudentName', label: 'Student' },
            { key: 'AdmissionNumber', label: 'Admission' },
            { key: 'AdmissionDate', label: 'Admission date', type: 'date' },
            { key: 'CancellationDate', label: 'Cancellation date', type: 'date' },
            { key: 'AdmissionStatus', label: 'Status', type: 'status' },
            { key: 'ReplacementStudentName', label: 'Replacement', render: (r) => (r.ReplacementStudentName ? `${r.ReplacementStudentName} (${r.ReplacementAdmissionNumber})` : '—') },
          ]}
          rows={data?.rows}
        />
      </Card>
    </>
  );
}

export function ConsultantReports() {
  const { can } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState('consultant-outstanding');
  const url = `/reports/${tab}`;
  const { data, error } = useLoad(() => api.get(url), [url]);
  const cols: Record<string, any[]> = {
    'consultant-outstanding': [
      { key: 'ConsultantCode', label: 'Code' }, { key: 'ConsultantName', label: 'Consultant' }, { key: 'TotalAdmissions', label: 'Admissions', type: 'number' },
      { key: 'CancelledAdmissions', label: 'Cancelled', type: 'number' }, { key: 'TotalPayable', label: 'Payable', type: 'money', total: true },
      { key: 'TotalPaid', label: 'Paid', type: 'money', total: true }, { key: 'TotalRecovery', label: 'Recovery', type: 'money', total: true },
      { key: 'Outstanding', label: 'Outstanding', type: 'money', total: true }, { key: 'PendingPayments', label: 'In process', type: 'money', total: true },
    ],
    'consultant-acquisition-cost': [
      { key: 'ConsultantName', label: 'Consultant' }, { key: 'Admissions', label: 'Admissions', type: 'number' }, { key: 'ActiveAdmissions', label: 'Active', type: 'number' },
      { key: 'ConsultantCost', label: 'Consultant cost', type: 'money', total: true }, { key: 'CostPerAdmission', label: 'Cost / admission', type: 'money' },
    ],
    'cancelled-admission-consultant': [
      { key: 'ConsultantName', label: 'Consultant' }, { key: 'StudentName', label: 'Student' }, { key: 'AdmissionNumber', label: 'Admission' },
      { key: 'CancellationDate', label: 'Cancelled', type: 'date' }, { key: 'Payable', label: 'Approved', type: 'money' }, { key: 'Paid', label: 'Paid', type: 'money' },
      { key: 'Recovery', label: 'Recovery', type: 'money' }, { key: 'ConsultantReviewStatus', label: 'Review', type: 'status' },
    ],
    'consultant-payments': [
      { key: 'PaymentNumber', label: 'Payment no.' }, { key: 'PaymentDate', label: 'Date', type: 'date' }, { key: 'ConsultantName', label: 'Consultant' },
      { key: 'StudentName', label: 'Student' }, { key: 'PaymentModeName', label: 'Mode' }, { key: 'IsOverride', label: 'Override', render: (r: any) => (r.IsOverride ? 'Yes' : '') },
      { key: 'Status', label: 'Status', type: 'status' }, { key: 'Amount', label: 'Amount', type: 'money', total: true },
    ],
    'consultant-recoveries': [
      { key: 'RecoveryDate', label: 'Date', type: 'date' }, { key: 'ConsultantName', label: 'Consultant' }, { key: 'StudentName', label: 'Student' },
      { key: 'RecoveryMode', label: 'Type', render: (r: any) => (r.RecoveryMode === 'CASH' ? 'Received back' : 'Set off') }, { key: 'Reason', label: 'Reason' },
      { key: 'Status', label: 'Status', type: 'status' }, { key: 'Amount', label: 'Amount', type: 'money', total: true },
    ],
  };
  const tabs = [
    { key: 'consultant-outstanding', label: 'Outstanding' },
    ...(can('REPORT_VIEW') ? [{ key: 'consultant-acquisition-cost', label: 'Acquisition cost' }] : []),
    { key: 'cancelled-admission-consultant', label: 'Cancelled admissions' },
    { key: 'consultant-payments', label: 'Payments' },
    { key: 'consultant-recoveries', label: 'Recoveries' },
  ];
  return (
    <>
      <PageHeader title="Consultant reports" actions={<><ExportButton url={url} fileName={tab} /><PrintButton /></>} />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      <Card>
        <ErrorBox error={error} />
        <Table
          columns={cols[tab]}
          rows={data?.rows}
          showTotals
          onRowClick={(r) => (tab === 'cancelled-admission-consultant' ? nav(`/admissions/${r.AdmissionId}`) : r.ConsultantId && nav(`/consultants/${r.ConsultantId}`))}
        />
      </Card>
    </>
  );
}

export function AuditReport() {
  const [f, setF] = useState({ from: daysAgoISO(7), to: todayISO(), action: '', entity: '' });
  const url = `/reports/audit${qs(f)}`;
  const { data, error } = useLoad(() => api.get(url), [url]);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <PageHeader title="Audit log" subtitle="Who did what, when - entries can never be edited or deleted" actions={<ExportButton url={url} fileName="audit-log" />} />
      <Card>
        <div className="filters">
          <Input label="From" type="date" value={f.from} onChange={(v) => setF({ ...f, from: v })} />
          <Input label="To" type="date" value={f.to} onChange={(v) => setF({ ...f, to: v })} />
          <Input label="Action contains" value={f.action} onChange={(v) => setF({ ...f, action: v.toUpperCase() })} placeholder="e.g. REFUND" />
          <Select label="Entity" value={f.entity} onChange={(v) => setF({ ...f, entity: v })} placeholder="All"
            options={['Payment', 'Refund', 'Admission', 'Student', 'StudentCharge', 'User', 'FeeStructure', 'ConsultantPayment', 'CashierDayClosing', 'SystemSetting'].map((e) => ({ value: e, label: e }))} />
        </div>
        <ErrorBox error={error} />
        <Table
          columns={[
            { key: 'ActionDateTime', label: 'When', render: (r) => (r.__detail ? '' : dateTime(r.ActionDateTime)) },
            { key: 'FullName', label: 'User', render: (r) => (r.__detail ? '' : r.FullName ?? '—') },
            { key: 'ActionType', label: 'Action', render: (r) => (r.__detail ? '' : label(r.ActionType)) },
            { key: 'EntityName', label: 'Entity', render: (r) => (r.__detail ? '' : `${r.EntityName}${r.EntityId ? ' #' + r.EntityId : ''}`) },
            {
              key: 'Reason', label: 'Reason', render: (r) =>
                r.__detail ? (
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>{`Old: ${r.OldValues ?? '—'}\nNew: ${r.NewValues ?? '—'}`}</pre>
                ) : (
                  r.Reason ?? '—'
                ),
            },
            { key: 'IpAddress', label: 'IP', render: (r) => (r.__detail ? '' : r.IpAddress ?? '—') },
            {
              key: 'x', label: '', render: (r) =>
                !r.__detail && (r.OldValues || r.NewValues) ? (
                  <button className="link-btn" onClick={() => setOpen(open === r.AuditLogId ? null : r.AuditLogId)}>
                    {open === r.AuditLogId ? 'Hide' : 'Values'}
                  </button>
                ) : null,
            },
          ]}
          rows={data?.rows?.flatMap((r: any) => (open === r.AuditLogId ? [r, { ...r, __detail: true }] : [r]))}
        />
      </Card>
    </>
  );
}
