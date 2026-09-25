import { useState } from 'react';
import { api, qs } from '../api';
import { useAuth } from '../auth';
import { Card, ErrorBox, ExportButton, Input, Loading, Modal, PageHeader, Select, Stat, Table, TextArea, useAction, useLoad } from '../components/ui';
import { date, dateTime, label, money, round2, todayISO } from '../format';

export function DayClosing() {
  const { can } = useAuth();
  const [day, setDay] = useState(todayISO());
  const preview = useLoad(() => (can('DAYCLOSE_SUBMIT') ? api.get(`/cashier/day-closing/preview${qs({ date: day })}`) : Promise.resolve(null)), [day]);
  const [f, setF] = useState({ status: '', from: '', to: '' });
  const listUrl = `/cashier/day-closing${qs(f)}`;
  const list = useLoad(() => api.get(listUrl), [listUrl]);
  const [v, setV] = useState({ openingCash: '', cashDeposit: '0', actualClosingCash: '', remarks: '' });
  const [verify, setVerify] = useState<any>(null);
  const { runSafe, busy } = useAction();

  const fig = preview.data?.figures;
  const opening = v.openingCash === '' ? fig?.OpeningCash ?? 0 : Number(v.openingCash);
  const expected = fig ? round2(opening + fig.CashCollection - fig.CashRefund - (Number(v.cashDeposit) || 0)) : 0;
  const diff = v.actualClosingCash === '' ? 0 : round2(Number(v.actualClosingCash) - expected);

  return (
    <>
      <PageHeader title="Cashier day closing" />
      {can('DAYCLOSE_SUBMIT') && (
        <Card title="Close my day">
          <div className="filters">
            <Input label="Date" type="date" value={day} onChange={setDay} max={todayISO()} />
          </div>
          {!preview.data ? (
            <Loading />
          ) : preview.data.existing ? (
            <div className="alert alert-info">Day closing for {date(day)} already submitted - status {label(preview.data.existing.Status)}.</div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await runSafe(
                  () => api.post('/cashier/day-closing', {
                    closingDate: day, openingCash: v.openingCash === '' ? undefined : Number(v.openingCash), cashDeposit: Number(v.cashDeposit) || 0,
                    actualClosingCash: Number(v.actualClosingCash), remarks: v.remarks,
                  }),
                  'Day closing submitted for verification.',
                );
                if (r) {
                  preview.reload();
                  list.reload();
                }
              }}
            >
              <div className="stats">
                <Stat label="Opening cash" value={money(opening)} sub="Previous day's closing cash" />
                <Stat label="Cash collected" value={money(fig.CashCollection)} sub={`${fig.CashReceipts} cash receipts`} />
                <Stat label="Cash refunds paid" value={money(fig.CashRefund)} />
                <Stat label="Non-cash collected" value={money(fig.NonCashCollection)} sub="UPI / bank / cheque (not in drawer)" />
                <Stat label="Expected closing cash" value={money(expected)} />
                <Stat label="Difference" value={money(diff)} tone={diff === 0 ? 'good' : 'bad'} />
              </div>
              <div className="form-grid">
                <Input label="Opening cash (override)" type="number" value={v.openingCash} onChange={(x) => setV({ ...v, openingCash: x })} placeholder={String(fig.OpeningCash)} min="0" />
                <Input label="Cash deposited to bank / handed over" type="number" value={v.cashDeposit} onChange={(x) => setV({ ...v, cashDeposit: x })} min="0" required />
                <Input label="Actual cash counted" type="number" value={v.actualClosingCash} onChange={(x) => setV({ ...v, actualClosingCash: x })} min="0" required />
                <TextArea label="Remarks" value={v.remarks} onChange={(x) => setV({ ...v, remarks: x })} required={diff !== 0} hint={diff !== 0 ? 'Explain the difference.' : undefined} />
              </div>
              <div className="form-actions"><button className="btn" disabled={busy}>Submit for verification</button></div>
            </form>
          )}
          {preview.data?.receipts?.length > 0 && (
            <>
              <h2 style={{ margin: '16px 0 8px' }}>My receipts on {date(day)}</h2>
              <Table
                columns={[
                  { key: 'ReceiptNumber', label: 'Receipt' }, { key: 'StudentName', label: 'Student' }, { key: 'PaymentModeName', label: 'Mode' },
                  { key: 'Status', label: 'Status', type: 'status' }, { key: 'Amount', label: 'Amount', type: 'money', total: true },
                ]}
                rows={preview.data.receipts}
                showTotals
              />
            </>
          )}
        </Card>
      )}
      <Card title="Day closing register" actions={<ExportButton url={listUrl} fileName="day-closing" />}>
        <div className="filters">
          <Select label="Status" value={f.status} onChange={(x) => setF({ ...f, status: x })} placeholder="All"
            options={['SUBMITTED', 'VERIFIED', 'REJECTED'].map((s) => ({ value: s, label: label(s) }))} />
          <Input label="From" type="date" value={f.from} onChange={(x) => setF({ ...f, from: x })} />
          <Input label="To" type="date" value={f.to} onChange={(x) => setF({ ...f, to: x })} />
        </div>
        <ErrorBox error={list.error} />
        <Table
          columns={[
            { key: 'ClosingDate', label: 'Date', type: 'date' },
            { key: 'CashierName', label: 'Cashier' },
            { key: 'OpeningCash', label: 'Opening', type: 'money' },
            { key: 'CashCollection', label: 'Collected', type: 'money' },
            { key: 'CashRefund', label: 'Refunds', type: 'money' },
            { key: 'CashDeposit', label: 'Deposited', type: 'money' },
            { key: 'ExpectedClosingCash', label: 'Expected', type: 'money' },
            { key: 'ActualClosingCash', label: 'Actual', type: 'money' },
            { key: 'Difference', label: 'Difference', type: 'money' },
            { key: 'Status', label: 'Status', type: 'status' },
            { key: 'VerifiedByName', label: 'Verified by' },
            {
              key: 'act', label: '', render: (r) =>
                r.Status === 'SUBMITTED' && can('DAYCLOSE_VERIFY') ? <button className="btn btn-sm" onClick={() => setVerify(r)}>Verify</button> : null,
            },
          ]}
          rows={list.data?.rows}
        />
      </Card>
      {verify && <VerifyModal row={verify} onClose={() => setVerify(null)} onDone={list.reload} />}
    </>
  );
}

function VerifyModal({ row, onClose, onDone }: { row: any; onClose: () => void; onDone: () => void }) {
  const [remarks, setRemarks] = useState('');
  const { runSafe, busy } = useAction();
  const act = async (action: 'VERIFY' | 'REJECT') => {
    if (await runSafe(() => api.post(`/cashier/day-closing/${row.ClosingId}/verify`, { action, remarks }), action === 'VERIFY' ? 'Verified.' : 'Rejected.')) {
      onDone();
      onClose();
    }
  };
  return (
    <Modal title={`Verify ${row.CashierName} - ${date(row.ClosingDate)}`} onClose={onClose}>
      <p>
        Expected {money(row.ExpectedClosingCash)}, counted {money(row.ActualClosingCash)}, difference <b>{money(row.Difference)}</b>.
        {row.Remarks && <><br />Cashier remarks: {row.Remarks}</>}
        <br /><span className="muted">Submitted {dateTime(row.SubmittedAt)}</span>
      </p>
      <div className="form-grid"><TextArea label="Remarks" value={remarks} onChange={setRemarks} hint="Required when rejecting." /></div>
      <div className="form-actions">
        <button className="btn btn-danger" disabled={busy || !remarks.trim()} onClick={() => act('REJECT')}>Reject</button>
        <button className="btn btn-good" disabled={busy} onClick={() => act('VERIFY')}>Verify</button>
      </div>
    </Modal>
  );
}
