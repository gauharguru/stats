import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { Card, ErrorBox, Input, KV, Loading, PageHeader, Select, Stat, Table, TextArea, useLoad, useToast } from '../components/ui';
import { money, round2, todayISO } from '../format';
import { useLookups } from '../lookups';
import { StudentSearch } from './Students';

/* Cashier's main screen: find student -> see dues -> take money -> receipt */
export function ReceivePayment() {
  const [params, setParams] = useSearchParams();
  const admissionId = params.get('admissionId');
  return (
    <>
      <PageHeader title="Receive payment" />
      <Card>
        <StudentSearch
          onPick={(s) => {
            if (s.AdmissionId) setParams({ admissionId: String(s.AdmissionId) });
          }}
        />
      </Card>
      {admissionId ? <PaymentForm key={admissionId} admissionId={Number(admissionId)} /> : <div className="muted">Search and select a student to continue.</div>}
    </>
  );
}

function PaymentForm({ admissionId }: { admissionId: number }) {
  const { lookups } = useLookups();
  const toast = useToast();
  const nav = useNavigate();
  const head = useLoad(() => api.get(`/admissions/${admissionId}`), [admissionId]);
  const due = useLoad(() => api.get(`/payments/due/${admissionId}`), [admissionId]);
  const [v, setV] = useState({
    amount: '', paymentModeId: '', paymentDate: todayISO(), transactionReference: '', bankName: '', chequeNumber: '', chequeDate: '', remarks: '',
  });
  const [manual, setManual] = useState(false);
  const [alloc, setAlloc] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [dup, setDup] = useState<any>(null);
  const [done, setDone] = useState<any>(null);

  useEffect(() => {
    if (lookups && !v.paymentModeId) {
      const cash = lookups.paymentModes.find((m) => m.PaymentModeCode === 'CASH');
      if (cash) setV((x) => ({ ...x, paymentModeId: String(cash.PaymentModeId) }));
    }
    if (lookups?.settings.DefaultPaymentAllocationMethod === 'MANUAL') setManual(true);
  }, [lookups]); // eslint-disable-line react-hooks/exhaustive-deps

  if (head.error) return <ErrorBox error={head.error} />;
  if (!head.data || !due.data) return <Loading />;
  const a = head.data.admission;
  const s = due.data.summary;
  const mode = lookups?.paymentModes.find((m) => String(m.PaymentModeId) === v.paymentModeId);
  const amount = Number(v.amount) || 0;
  const allocations = Object.entries(alloc).filter(([, x]) => Number(x) > 0).map(([k, x]) => ({ chargeId: Number(k), amount: Number(x) }));
  const allocTotal = round2(allocations.reduce((t, x) => t + x.amount, 0));

  /* FIFO preview (what the server will do) */
  let left = amount;
  const preview = (due.data.rows as any[]).map((c) => {
    const x = Math.min(left, c.DueAmount);
    left = round2(left - x);
    return { ...c, preview: x };
  });
  const advance = manual ? round2(amount - allocTotal) : Math.max(0, left);

  const submit = async (e: FormEvent, confirmDuplicateReference = false) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post('/payments', {
        admissionId,
        amount,
        paymentModeId: Number(v.paymentModeId),
        paymentDate: v.paymentDate,
        transactionReference: v.transactionReference,
        bankName: v.bankName,
        chequeNumber: v.chequeNumber,
        chequeDate: v.chequeDate,
        remarks: v.remarks,
        allocationMethod: manual ? 'MANUAL' : 'FIFO',
        allocations: manual ? allocations : null,
        confirmDuplicateReference,
      });
      setDone(r);
      setDup(null);
      toast('ok', r.status === 'POSTED' ? `Payment posted. Receipt ${r.receiptNumber}` : 'Payment submitted for approval.');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DUPLICATE_REFERENCE') setDup(err.details);
      else toast('err', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <Card>
        <div className="alert alert-ok">
          {done.status === 'POSTED' ? (
            <>Payment of <b>{money(amount)}</b> posted. Receipt number <b>{done.receiptNumber}</b>.</>
          ) : (
            <>Payment of <b>{money(amount)}</b> submitted for approval. The receipt is issued once it is approved.</>
          )}
        </div>
        <div className="actions">
          {done.status === 'POSTED' && <Link className="btn" to={`/payments/${done.paymentId}/receipt`}>Print receipt</Link>}
          <Link className="btn btn-ghost" to={`/admissions/${admissionId}`}>Student ledger</Link>
          <button className="btn btn-ghost" onClick={() => nav('/receive-payment')}>Next student</button>
        </div>
      </Card>
    );

  return (
    <form onSubmit={(e) => submit(e)}>
      <Card title={`${a.StudentName} · ${a.AdmissionNumber}`} actions={<Link to={`/admissions/${admissionId}`}>Open profile</Link>}>
        <KV items={[["Father's name", a.FatherName], ['Course / batch', `${a.CourseCode} / ${a.BatchCode}`], ['Mobile', a.Mobile], ['Status', a.AdmissionStatus]]} />
        {a.AdmissionStatus !== 'ACTIVE' && <div className="alert alert-warn" style={{ marginTop: 12 }}>This admission is {a.AdmissionStatus.toLowerCase()}.</div>}
      </Card>
      <div className="stats">
        <Stat label="Net charges" value={money(s.NetCharges)} />
        <Stat label="Paid so far" value={money(s.TotalPayments)} />
        <Stat label="Advance available" value={money(s.AdvanceAvailable)} />
        <Stat label="Outstanding" value={money(s.Outstanding)} tone={s.Outstanding > 0 ? 'bad' : 'good'} />
      </div>
      <div className="grid grid-2">
        <Card title="Payment">
          <div className="form-grid">
            <Input label="Amount received (₹)" type="number" value={v.amount} onChange={(x) => setV({ ...v, amount: x })} required min="0.01" autoFocus />
            <Select label="Payment mode" value={v.paymentModeId} onChange={(x) => setV({ ...v, paymentModeId: x })} required placeholder={null}
              options={(lookups?.paymentModes ?? []).filter((m) => m.IsActive).map((m) => ({ value: m.PaymentModeId, label: m.PaymentModeName }))} />
            <Input label="Payment date" type="date" value={v.paymentDate} onChange={(x) => setV({ ...v, paymentDate: x })} required max={todayISO()} />
            {mode?.RequiresReference && (
              <Input label="Transaction reference / UTR" value={v.transactionReference} onChange={(x) => setV({ ...v, transactionReference: x })} required />
            )}
            {mode?.RequiresBank && <Input label="Bank" value={v.bankName} onChange={(x) => setV({ ...v, bankName: x })} required />}
            {mode?.RequiresChequeDetails && (
              <>
                <Input label="Cheque number" value={v.chequeNumber} onChange={(x) => setV({ ...v, chequeNumber: x })} required />
                <Input label="Cheque date" type="date" value={v.chequeDate} onChange={(x) => setV({ ...v, chequeDate: x })} required />
              </>
            )}
            <TextArea label="Remarks" value={v.remarks} onChange={(x) => setV({ ...v, remarks: x })} />
          </div>
          {dup && (
            <div className="alert alert-warn" style={{ marginTop: 12 }}>
              <b>Warning: This transaction reference already exists.</b>
              <div>
                Receipt {dup.ReceiptNumber ?? '(unposted)'} · {dup.StudentName} · {money(dup.Amount)} on {dup.PaymentDate}
              </div>
              <div className="actions" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-sm" onClick={(e) => submit(e as unknown as FormEvent, true)} disabled={busy}>
                  It is a different payment - save anyway
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDup(null)}>Correct the reference</button>
              </div>
            </div>
          )}
          <div className="form-actions">
            <button className="btn" disabled={busy || amount <= 0 || (manual && allocTotal > amount)}>
              {busy ? 'Saving…' : 'Save & issue receipt'}
            </button>
          </div>
        </Card>
        <Card
          title="Allocation"
          actions={
            <Select label="" value={manual ? 'MANUAL' : 'FIFO'} onChange={(x) => setManual(x === 'MANUAL')} placeholder={null}
              options={[{ value: 'FIFO', label: 'Oldest dues first' }, { value: 'MANUAL', label: 'Allocate manually' }]} />
          }
        >
          <Table
            columns={[
              { key: 'FeeHeadName', label: 'Fee', render: (r) => `${r.FeeHeadName}${r.PeriodName ? ' - ' + r.PeriodName : ''}` },
              { key: 'DueAmount', label: 'Due', type: 'money' },
              {
                key: 'x', label: 'This payment', align: 'right', render: (r) =>
                  manual ? (
                    <input type="number" step="0.01" min="0" max={r.DueAmount} style={{ width: 120 }} value={alloc[r.ChargeId] ?? ''}
                      onChange={(e) => setAlloc({ ...alloc, [r.ChargeId]: e.target.value })} />
                  ) : (
                    money(r.preview)
                  ),
              },
            ]}
            rows={preview}
            empty="Nothing due. The whole amount will be kept as advance."
          />
          <div className="split" style={{ marginTop: 10 }}>
            <span className="muted">Kept as advance</span>
            <b className="num">{money(advance)}</b>
          </div>
          {manual && allocTotal > amount && <div className="alert alert-err" style={{ marginTop: 8 }}>Allocation cannot exceed the payment amount.</div>}
        </Card>
      </div>
    </form>
  );
}
