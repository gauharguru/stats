import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, qs } from '../api';
import { useAuth } from '../auth';
import { Badge, Card, ErrorBox, ExportButton, Input, KV, Loading, Modal, PageHeader, Select, Table, Tabs, TextArea, useAction, useLoad } from '../components/ui';
import { date, dateTime, label, money, todayISO } from '../format';
import { useLookups } from '../lookups';

const TYPES = ['REFUND', 'DISCOUNT', 'ADJUSTMENT', 'REVERSAL', 'PAYMENT', 'CONSULTANT_PAYABLE', 'CONSULTANT_PAYMENT', 'CONSULTANT_RECOVERY'];

export function ApprovalInbox() {
  const nav = useNavigate();
  const [tab, setTab] = useState('inbox');
  const [type, setType] = useState('');
  const [mine, setMine] = useState(true);
  const inbox = useLoad(() => api.get(`/approvals/inbox${qs({ type, mine })}`), [type, mine]);
  const [h, setH] = useState({ type: '', status: '', from: '', to: '' });
  const histUrl = `/approvals${qs(h)}`;
  const hist = useLoad(() => (tab === 'history' ? api.get(histUrl) : Promise.resolve(null)), [tab, histUrl]);
  return (
    <>
      <PageHeader title="Approvals" />
      <Tabs tabs={[{ key: 'inbox', label: 'Pending approvals' }, { key: 'history', label: 'Approval history' }]} active={tab} onChange={setTab} />
      {tab === 'inbox' && (
        <Card>
          <div className="filters">
            <Select label="Type" value={type} onChange={setType} options={TYPES.map((t) => ({ value: t, label: label(t) }))} placeholder="All" />
            <Select label="Show" value={mine ? 'mine' : 'all'} onChange={(v) => setMine(v === 'mine')} placeholder={null}
              options={[{ value: 'mine', label: 'Waiting for me' }, { value: 'all', label: 'All pending' }]} />
          </div>
          <ErrorBox error={inbox.error} />
          <Table
            columns={[
              { key: 'TransactionType', label: 'Type', render: (r) => label(r.TransactionType) },
              { key: 'Description', label: 'Description' },
              { key: 'Amount', label: 'Amount', type: 'money' },
              { key: 'RequestedByName', label: 'Requested by' },
              { key: 'RequestedAt', label: 'Date', render: (r) => dateTime(r.RequestedAt) },
              { key: 'CurrentLevel', label: 'Level', render: (r) => `${r.CurrentLevel} of ${r.MaxLevel}` },
              { key: 'ApproverRoles', label: 'Approver' },
              { key: 'act', label: '', render: (r) => (r.CanAct ? <span className="btn btn-sm">Review</span> : <span className="muted" title={r.CannotActReason}>View</span>) },
            ]}
            rows={inbox.data?.rows}
            onRowClick={(r) => nav(`/approvals/${r.ApprovalRequestId}`)}
            empty="Nothing waiting."
          />
        </Card>
      )}
      {tab === 'history' && (
        <Card actions={<ExportButton url={histUrl} fileName="approvals" />}>
          <div className="filters">
            <Select label="Type" value={h.type} onChange={(v) => setH({ ...h, type: v })} options={TYPES.map((t) => ({ value: t, label: label(t) }))} placeholder="All" />
            <Select label="Status" value={h.status} onChange={(v) => setH({ ...h, status: v })} placeholder="All"
              options={['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'].map((t) => ({ value: t, label: label(t) }))} />
            <Input label="From" type="date" value={h.from} onChange={(v) => setH({ ...h, from: v })} />
            <Input label="To" type="date" value={h.to} onChange={(v) => setH({ ...h, to: v })} />
          </div>
          <Table
            columns={[
              { key: 'ApprovalRequestId', label: '#' },
              { key: 'TransactionType', label: 'Type', render: (r) => label(r.TransactionType) },
              { key: 'Description', label: 'Description' },
              { key: 'Amount', label: 'Amount', type: 'money' },
              { key: 'RequestedByName', label: 'Requested by' },
              { key: 'RequestedAt', label: 'Requested', render: (r) => dateTime(r.RequestedAt) },
              { key: 'FinalApprovedByName', label: 'Approved by' },
              { key: 'Status', label: 'Status', type: 'status' },
            ]}
            rows={hist.data?.rows}
            onRowClick={(r) => nav(`/approvals/${r.ApprovalRequestId}`)}
          />
        </Card>
      )}
    </>
  );
}

export function ApprovalDetail() {
  const { id } = useParams();
  const { me } = useAuth();
  const nav = useNavigate();
  const { data, error, reload } = useLoad(() => api.get(`/approvals/${id}`), [id]);
  const { runSafe, busy } = useAction();
  const [comments, setComments] = useState('');
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState('');
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const r = data.request;
  const d = data.detail ?? {};
  const act = async (kind: 'approve' | 'reject') => {
    const res = await runSafe(
      () => api.post(`/approvals/${id}/${kind}`, kind === 'approve' ? { comments } : { reason, comments }),
      kind === 'approve' ? 'Approved.' : 'Rejected.',
    );
    if (res) {
      setReject(false);
      reload();
    }
  };
  const canCancel = r.Status === 'PENDING_APPROVAL' && (r.RequestedBy === me?.userId || me?.roles.includes('ADMIN'));
  return (
    <>
      <PageHeader
        title={`${label(r.TransactionType)} approval #${r.ApprovalRequestId}`}
        subtitle={<><Badge status={r.Status} /> · Level {r.CurrentLevel} of {r.MaxLevel}</>}
        actions={<button className="btn btn-ghost" onClick={() => nav('/approvals')}>Back to inbox</button>}
      />
      <Card title="Request">
        <KV items={[['Description', r.Description], ['Amount', <b>{money(r.Amount)}</b>], ['Requested by', r.RequestedByName], ['Requested at', dateTime(r.RequestedAt)], ['Rejection reason', r.RejectionReason]]} />
      </Card>
      <Card title="Transaction details">
        <TransactionDetail type={r.TransactionType} d={d} />
      </Card>
      {r.Status === 'PENDING_APPROVAL' && (
        <Card title="Decision">
          {data.canAct ? (
            <>
              <div className="form-grid">
                <TextArea label="Comments (optional)" value={comments} onChange={setComments} />
              </div>
              <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
                <button className="btn btn-good" disabled={busy} onClick={() => act('approve')}>Approve</button>
                <button className="btn btn-danger" disabled={busy} onClick={() => setReject(true)}>Reject</button>
              </div>
            </>
          ) : (
            <div className="alert alert-info">{data.cannotActReason}</div>
          )}
          {canCancel && <CancelRequest id={r.ApprovalRequestId} onDone={reload} />}
        </Card>
      )}
      <Card title="Approval trail">
        <Table
          columns={[
            { key: 'ActionAt', label: 'When', render: (x) => dateTime(x.ActionAt) },
            { key: 'ApprovalLevel', label: 'Level', render: (x) => (x.ApprovalLevel === 0 ? '—' : x.ApprovalLevel) },
            { key: 'Action', label: 'Action', type: 'status' },
            { key: 'ActionByName', label: 'By' },
            { key: 'Comments', label: 'Comments' },
            { key: 'RejectionReason', label: 'Reason' },
          ]}
          rows={data.actions}
        />
      </Card>
      {reject && (
        <Modal title="Reject request" onClose={() => setReject(false)}>
          <div className="form-grid">
            <TextArea label="Reason for rejection" value={reason} onChange={setReason} required hint="Mandatory - it is shown to the requester." />
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setReject(false)}>Back</button>
            <button className="btn btn-danger" disabled={busy || !reason.trim()} onClick={() => act('reject')}>Reject</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function CancelRequest({ id, onDone }: { id: number; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const { runSafe, busy } = useAction();
  return (
    <div style={{ marginTop: 12 }}>
      <button className="link-btn" onClick={() => setOpen(true)}>Withdraw this request</button>
      {open && (
        <Modal title="Withdraw request" onClose={() => setOpen(false)}>
          <div className="form-grid"><TextArea label="Reason" value={reason} onChange={setReason} required /></div>
          <div className="form-actions">
            <button className="btn btn-danger" disabled={busy || !reason.trim()}
              onClick={async () => { if (await runSafe(() => api.post(`/approvals/${id}/cancel`, { reason }), 'Request withdrawn.')) { setOpen(false); onDone(); } }}>
              Withdraw
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TransactionDetail({ type, d }: { type: string; d: any }) {
  const student = d.StudentName && (d.AdmissionId ? <Link to={`/admissions/${d.AdmissionId}`}>{d.StudentName} ({d.AdmissionNumber})</Link> : d.StudentName);
  switch (type) {
    case 'REFUND':
      return (
        <KV items={[
          ['Refund no.', d.RefundNumber], ['Student', student], ['Type', label(d.RefundType)], ['Amount', money(d.RequestedAmount)], ['Reason', d.Reason],
          ['Student total paid', money(d.TotalPayments)], ['Advance available', money(d.AdvanceAvailable)], ['Current balance', money(d.Balance)],
          ['Refund against fees', d.AllocationPlan ? JSON.parse(d.AllocationPlan).map((x: any) => money(x.amount)).join(', ') : 'From advance'],
          ['Status', <Badge status={d.Status} />],
        ]} />
      );
    case 'DISCOUNT':
    case 'ADJUSTMENT':
      return (
        <KV items={[
          ['Student', student], ['Fee', `${d.FeeHeadName}${d.PeriodName ? ' - ' + d.PeriodName : ''}`], ['Amount', money(d.DiscountAmount ?? d.Amount)],
          ['Charge amount', money(d.OriginalAmount)], ['Currently due on charge', money(d.ChargeDue)], ['Reason', d.Reason], ['Status', <Badge status={d.Status} />],
        ]} />
      );
    case 'REVERSAL':
      return (
        <>
          <KV items={[['Reversal of', label(d.OriginalTransactionType)], ['Amount', money(d.Amount)], ['Reason', d.Reason], ['Reversal date', date(d.ReversalDate)], ['Status', <Badge status={d.Status} />]]} />
          {d.original && (
            <div style={{ marginTop: 12 }}>
              <KV items={d.OriginalTransactionType === 'PAYMENT'
                ? [['Receipt', <Link to={`/payments/${d.original.PaymentId}`}>{d.original.ReceiptNumber}</Link>], ['Student', d.original.StudentName], ['Date', date(d.original.PaymentDate)], ['Mode', d.original.PaymentModeName], ['Received by', d.original.CashierName]]
                : [['Fee', d.original.FeeHeadName], ['Period', d.original.PeriodName], ['Charge date', date(d.original.ChargeDate)]]} />
            </div>
          )}
        </>
      );
    case 'PAYMENT':
      return <KV items={[['Student', d.StudentName], ['Amount', money(d.Amount)], ['Mode', d.PaymentModeName], ['Reference', d.TransactionReference], ['Date', date(d.PaymentDate)], ['Entered by', d.CashierName]]} />;
    case 'CONSULTANT_PAYABLE':
      return <KV items={[['Consultant', `${d.ConsultantName} (${d.ConsultantCode})`], ['Student', student], ['Admission status', d.AdmissionStatus && <Badge status={d.AdmissionStatus} />], ['Amount', money(d.ApprovedAmount)], ['Description', d.Description]]} />;
    case 'CONSULTANT_PAYMENT':
      return (
        <>
          {d.IsOverride && <div className="alert alert-warn">OVERRIDE: payment exceeds the remaining payable. Reason: {d.OverrideReason}</div>}
          <KV items={[
            ['Consultant', `${d.ConsultantName} (${d.ConsultantCode})`], ['Payment no.', d.PaymentNumber], ['Student', student],
            ['Admission status', d.AdmissionStatus && <Badge status={d.AdmissionStatus} />], ['Amount', money(d.Amount)], ['Mode', d.PaymentModeName],
            ['Payable approved', money(d.PayableAmount)], ['Already paid', money(d.PayablePaid)], ['Remaining after pending', money(d.PayableRemaining)],
          ]} />
        </>
      );
    case 'CONSULTANT_RECOVERY':
      return <KV items={[['Consultant', d.ConsultantName], ['Student', student], ['Admission status', d.AdmissionStatus && <Badge status={d.AdmissionStatus} />], ['Mode', d.RecoveryMode === 'CASH' ? 'Money received back' : 'Set off against future payables'], ['Amount', money(d.Amount)], ['Reason', d.Reason]]} />;
    default:
      return <pre>{JSON.stringify(d, null, 2)}</pre>;
  }
}

/* ---------------- refunds ------------------------------------------ */
export function RefundsList() {
  const nav = useNavigate();
  const [f, setF] = useState({ status: '', from: '', to: '' });
  const url = `/payments/refunds/list${qs(f)}`;
  const { data, error } = useLoad(() => api.get(url), [url]);
  return (
    <>
      <PageHeader title="Refunds" subtitle="Request a refund from the student's admission page." actions={<ExportButton url={url} fileName="refunds" />} />
      <Card>
        <div className="filters">
          <Select label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v })} placeholder="All"
            options={['PENDING_APPROVAL', 'APPROVED', 'PROCESSED', 'REJECTED', 'CANCELLED'].map((s) => ({ value: s, label: label(s) }))} />
          <Input label="From" type="date" value={f.from} onChange={(v) => setF({ ...f, from: v })} />
          <Input label="To" type="date" value={f.to} onChange={(v) => setF({ ...f, to: v })} />
        </div>
        <ErrorBox error={error} />
        <Table
          columns={[
            { key: 'RefundNumber', label: 'Refund no.' },
            { key: 'CreatedAt', label: 'Requested', render: (r) => dateTime(r.CreatedAt) },
            { key: 'StudentName', label: 'Student' },
            { key: 'AdmissionNumber', label: 'Admission' },
            { key: 'RefundType', label: 'Type', render: (r) => label(r.RefundType) },
            { key: 'RequestedByName', label: 'Requested by' },
            { key: 'ApprovedByName', label: 'Approved by' },
            { key: 'ProcessedByName', label: 'Paid by' },
            { key: 'Status', label: 'Status', type: 'status' },
            { key: 'RequestedAmount', label: 'Amount', type: 'money', total: true },
          ]}
          rows={data?.rows}
          showTotals
          onRowClick={(r) => nav(`/refunds/${r.RefundId}`)}
        />
      </Card>
    </>
  );
}

export function RefundDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const { lookups } = useLookups();
  const { data, error, reload } = useLoad(() => api.get(`/payments/refunds/${id}`), [id]);
  const [proc, setProc] = useState(false);
  const [v, setV] = useState({ refundModeId: '', refundDate: todayISO(), transactionReference: '', remarks: '' });
  const { runSafe, busy } = useAction();
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const r = data.refund;
  const mode = lookups?.paymentModes.find((m) => String(m.PaymentModeId) === v.refundModeId);
  return (
    <>
      <PageHeader
        title={`Refund ${r.RefundNumber}`}
        subtitle={<><Link to={`/admissions/${r.AdmissionId}`}>{r.StudentName} · {r.AdmissionNumber}</Link> · <Badge status={r.Status} /></>}
        actions={r.Status === 'APPROVED' && can('REFUND_PROCESS') && <button className="btn" onClick={() => setProc(true)}>Pay out refund</button>}
      />
      <Card>
        <KV items={[
          ['Type', label(r.RefundType)], ['Requested amount', money(r.RequestedAmount)], ['Approved amount', money(r.ApprovedAmount)], ['Paid amount', money(r.PaidAmount)],
          ['Reason', r.Reason], ['Remarks', r.Remarks], ['Original receipt', r.OriginalReceiptNumber], ['Paid on', date(r.RefundDate)], ['Mode', r.PaymentModeName],
          ['Reference', r.TransactionReference], ['Requested at', dateTime(r.CreatedAt)], ['Approved at', dateTime(r.ApprovedAt)], ['Processed at', dateTime(r.ProcessedAt)],
        ]} />
      </Card>
      {data.allocations.length > 0 && (
        <Card title="Refund attribution">
          <Table
            columns={[
              { key: 'FeeHeadName', label: 'Against', render: (x) => (x.ChargeId ? `${x.FeeHeadName}${x.PeriodName ? ' - ' + x.PeriodName : ''}` : 'Advance / excess payment') },
              { key: 'Amount', label: 'Amount', type: 'money', total: true },
            ]}
            rows={data.allocations}
            showTotals
          />
        </Card>
      )}
      {proc && (
        <Modal title={`Pay out refund ${money(r.ApprovedAmount)}`} onClose={() => setProc(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await runSafe(() => api.post(`/payments/refunds/${id}/process`, { ...v, refundModeId: Number(v.refundModeId) }), 'Refund processed.');
              if (ok) {
                setProc(false);
                reload();
              }
            }}
          >
            <div className="form-grid">
              <Select label="Refund mode" value={v.refundModeId} onChange={(x) => setV({ ...v, refundModeId: x })} required
                options={(lookups?.paymentModes ?? []).filter((m) => m.IsActive).map((m) => ({ value: m.PaymentModeId, label: m.PaymentModeName }))} />
              <Input label="Refund date" type="date" value={v.refundDate} onChange={(x) => setV({ ...v, refundDate: x })} required max={todayISO()} />
              {mode && !mode.IsCash && <Input label="Reference / cheque no." value={v.transactionReference} onChange={(x) => setV({ ...v, transactionReference: x })} required />}
              <TextArea label="Remarks" value={v.remarks} onChange={(x) => setV({ ...v, remarks: x })} />
            </div>
            <div className="form-actions"><button className="btn" disabled={busy}>Confirm payout</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
