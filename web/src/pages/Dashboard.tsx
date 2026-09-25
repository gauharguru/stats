import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Card, ErrorBox, Loading, PageHeader, Stat, Table, useLoad } from '../components/ui';
import { date, dateTime, label, money } from '../format';
import { StudentSearch } from './Students';

export function Dashboard() {
  const { me, can } = useAuth();
  const nav = useNavigate();
  const { data, error } = useLoad(() => api.get('/dashboard'), []);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const mgmt = !!data.todayCollection;
  const cashier = !!data.myToday;
  const maxDay = Math.max(1, ...(data.last30Days ?? []).map((d: any) => d.Amount));

  return (
    <>
      <PageHeader title={`Welcome, ${me?.fullName}`} subtitle={`Today: ${date(data.date)}`} />

      {cashier && (
        <Card title="Quick actions">
          <div className="grid grid-2">
            <div>
              <StudentSearch onPick={(s) => nav(s.AdmissionId ? `/receive-payment?admissionId=${s.AdmissionId}` : `/students/${s.StudentId}`)} placeholder="Search student to receive payment…" />
            </div>
            <div className="actions quick-tiles" style={{ alignItems: 'flex-start' }}>
              {can('PAYMENT_CREATE') && <Link className="btn" to="/receive-payment">Receive Payment</Link>}
              <Link className="btn btn-ghost" to="/students">Student Ledger</Link>
              <Link className="btn btn-ghost" to="/payments">Print Receipt</Link>
              {can('DAYCLOSE_SUBMIT') && <Link className="btn btn-ghost" to="/day-closing">Day Closing</Link>}
            </div>
          </div>
        </Card>
      )}

      {cashier && (
        <div className="stats">
          <Stat label="My collection today" value={money(data.myToday.Total)} sub={`${data.myToday.Receipts} receipts`} />
          <Stat label="Cash" value={money(data.myToday.Cash)} />
          <Stat label="UPI / Bank / Cheque" value={money(data.myToday.NonCash)} />
          <Stat
            label="Day closing"
            value={data.myDayClosing ? label(data.myDayClosing.Status) : 'Not submitted'}
            tone={data.myDayClosing ? 'good' : 'warn'}
          />
          {data.refundsToProcess > 0 && can('REFUND_PROCESS') && <Stat label="Approved refunds to pay" value={data.refundsToProcess} tone="warn" />}
        </div>
      )}

      {mgmt && (
        <>
          <h2 style={{ margin: '8px 0' }}>Today's collection</h2>
          <div className="stats">
            <Stat label="Total" value={money(data.todayCollection.Total)} sub={`${data.todayCollection.Receipts} receipts`} tone="good" />
            <Stat label="Cash" value={money(data.todayCollection.Cash)} />
            <Stat label="UPI" value={money(data.todayCollection.UPI)} />
            <Stat label="Bank" value={money(data.todayCollection.Bank)} />
            <Stat label="Cheque" value={money(data.todayCollection.Cheque)} />
          </div>
          <h2 style={{ margin: '8px 0' }}>Student fees (all years)</h2>
          <div className="stats">
            <Stat label="Net charges" value={money(data.studentFees.TotalCharges, true)} sub={`Discounts ${money(data.studentFees.Discounts, true)}`} />
            <Stat label="Collected" value={money(data.studentFees.TotalCollection, true)} tone="good" />
            <Stat label="Refunded" value={money(data.studentFees.TotalRefunds, true)} />
            <Stat label="Outstanding" value={money(data.studentFees.Outstanding, true)} tone="bad" />
            <Stat label="Advance held" value={money(data.studentFees.Advance, true)} />
          </div>
          <div className="grid grid-2">
            <Card title="Admissions">
              <div className="stats" style={{ marginBottom: 0 }}>
                <Stat label="Active" value={data.admissions.Active ?? 0} />
                <Stat label="New this year" value={data.admissions.NewThisYear ?? 0} />
                <Stat label="Cancelled" value={data.admissions.Cancelled ?? 0} />
                <Stat label="Replacement" value={data.admissions.Replacement ?? 0} />
              </div>
            </Card>
            {data.consultants && (
              <Card title="Consultants" actions={<Link to="/reports/consultants">Details</Link>}>
                <div className="stats" style={{ marginBottom: 0 }}>
                  <Stat label="Approved payable" value={money(data.consultants.Payable, true)} />
                  <Stat label="Paid" value={money(data.consultants.Paid, true)} />
                  <Stat label="Outstanding" value={money(data.consultants.Outstanding, true)} tone="warn" />
                  <Stat label="Reviews pending" value={data.consultantReviews} tone={data.consultantReviews ? 'warn' : undefined} />
                </div>
              </Card>
            )}
          </div>
          <div className="grid grid-2">
            <Card title="Pending approvals" actions={<Link to="/approvals">Open inbox</Link>}>
              <Table
                columns={[
                  { key: 'TransactionType', label: 'Type', render: (r) => label(r.TransactionType) },
                  { key: 'Count', label: 'Count', type: 'number' },
                  { key: 'Amount', label: 'Amount', type: 'money' },
                ]}
                rows={data.pendingApprovals}
                empty="Nothing pending."
              />
            </Card>
            <Card title="Collection - last 30 days">
              {data.last30Days.length === 0 ? (
                <div className="muted">No collections yet.</div>
              ) : (
                <div className="bar-chart" aria-label="Daily collection chart">
                  {data.last30Days.map((d: any) => (
                    <div key={d.PaymentDate} style={{ height: `${(d.Amount / maxDay) * 100}%` }} title={`${date(d.PaymentDate)}: ${money(d.Amount)}`} />
                  ))}
                </div>
              )}
            </Card>
          </div>
          <Card title="Active admissions by course">
            <Table
              columns={[
                { key: 'CourseCode', label: 'Course' },
                { key: 'Admissions', label: 'Students', type: 'number' },
                { key: 'Charges', label: 'Net charges', type: 'money', total: true },
                { key: 'Collected', label: 'Collected', type: 'money', total: true },
                { key: 'Outstanding', label: 'Outstanding', type: 'money', total: true },
              ]}
              rows={data.byCourse}
              showTotals
            />
          </Card>
        </>
      )}

      {data.auditAlerts && (
        <div className="grid grid-2">
          <Card title="Admin">
            <div className="stats" style={{ marginBottom: 0 }}>
              <Stat label="Day closings to verify" value={data.pendingDayClosings} tone={data.pendingDayClosings ? 'warn' : undefined} />
              <Stat label="Students" value={data.counts.Students} />
              <Stat label="Active users" value={data.counts.Users} />
              <Stat
                label="Last successful backup"
                value={data.lastBackup ? dateTime(data.lastBackup.FinishedAt) : 'No backup found'}
                tone={data.lastBackup ? undefined : 'bad'}
              />
            </div>
          </Card>
          <Card title="Audit alerts" actions={can('AUDIT_VIEW') && <Link to="/reports/audit">Audit log</Link>}>
            <Table
              columns={[
                { key: 'ActionDateTime', label: 'When', render: (r) => dateTime(r.ActionDateTime) },
                { key: 'FullName', label: 'User' },
                { key: 'ActionType', label: 'Action', render: (r) => label(r.ActionType) },
                { key: 'Reason', label: 'Reason' },
              ]}
              rows={data.auditAlerts}
              empty="No alerts."
            />
          </Card>
        </div>
      )}

      {cashier && (
        <Card title="My recent receipts" actions={<Link to="/payments">All payments</Link>}>
          <Table
            columns={[
              { key: 'ReceiptNumber', label: 'Receipt' },
              { key: 'PaymentDate', label: 'Date', type: 'date' },
              { key: 'StudentName', label: 'Student' },
              { key: 'PaymentModeName', label: 'Mode' },
              { key: 'Amount', label: 'Amount', type: 'money' },
              { key: 'Status', label: 'Status', type: 'status' },
            ]}
            rows={data.myRecentReceipts}
            onRowClick={(r) => nav(`/payments/${r.PaymentId}`)}
          />
        </Card>
      )}
    </>
  );
}
