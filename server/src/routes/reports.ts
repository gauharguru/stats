import { Router } from 'express';
import { db } from '../db';
import { today } from '../lib/dates';
import { badRequest } from '../lib/errors';
import { sendRows } from '../lib/export';
import { q, qDate, qNum } from '../lib/validate';
import { can, requirePerm } from '../middleware/auth';

export const reportsRouter = Router();
const full = requirePerm('REPORT_VIEW');
const consultantFin = requirePerm('CONSULTANT_FINANCE_VIEW');

function range(req: any) {
  return { from: qDate(req, 'from') ?? today(), to: qDate(req, 'to') ?? today() };
}

/* Collection reports (SRS 48): daily, date-wise, course, batch, fee head, payment mode, cashier */
reportsRouter.get('/collection', requirePerm('REPORT_VIEW', 'REPORT_OWN'), async (req, res) => {
  const d = await db();
  const { from, to } = range(req);
  const groupBy = q(req, 'groupBy') ?? 'date';
  const params = {
    from,
    to,
    course: qNum(req, 'courseId') ?? null,
    batch: qNum(req, 'batchId') ?? null,
    mode: qNum(req, 'paymentModeId') ?? null,
    user: can(req, 'REPORT_VIEW') ? qNum(req, 'userId') ?? null : req.user!.userId,
  };
  const where = `p.Status = N'POSTED' AND p.PaymentDate BETWEEN @from AND @to
    AND (@course IS NULL OR p.CourseId = @course) AND (@batch IS NULL OR p.BatchId = @batch)
    AND (@mode IS NULL OR p.PaymentModeId = @mode) AND (@user IS NULL OR p.SubmittedBy = @user)`;
  const groups: Record<string, { key: string; label: string }> = {
    date: { key: 'p.PaymentDate', label: 'p.PaymentDate' },
    mode: { key: 'p.PaymentModeCode, p.PaymentModeName', label: 'p.PaymentModeName' },
    cashier: { key: 'p.SubmittedBy, p.CashierName', label: 'p.CashierName' },
    course: { key: 'p.CourseCode, p.CourseName', label: 'p.CourseCode' },
    batch: { key: 'p.CourseCode, p.BatchCode', label: 'p.BatchCode' },
  };
  let rows: any[];
  if (groupBy === 'feehead') {
    rows = await d.query(
      `SELECT f.FeeHeadCode AS [Group], f.FeeHeadName AS Label, COUNT(DISTINCT f.PaymentId) AS Payments, SUM(f.Amount) AS Amount
       FROM reporting.vw_FeeHeadCollection f JOIN reporting.vw_PaymentRegister p ON p.PaymentId = f.PaymentId
       WHERE ${where}
       GROUP BY f.FeeHeadCode, f.FeeHeadName ORDER BY SUM(f.Amount) DESC`,
      params,
    );
  } else {
    const g = groups[groupBy];
    if (!g) throw badRequest('Unknown groupBy');
    rows = await d.query(
      `SELECT ${g.label} AS Label, COUNT(*) AS Payments, SUM(p.Amount) AS Amount
       FROM reporting.vw_PaymentRegister p WHERE ${where}
       GROUP BY ${g.key} ORDER BY ${groupBy === 'date' ? 'p.PaymentDate' : 'SUM(p.Amount) DESC'}`,
      params,
    );
  }
  const total = rows.reduce((s, r) => s + Number(r.Amount), 0);
  sendRows(req, res, rows, `collection-${groupBy}-${from}-${to}`, { total: Math.round(total * 100) / 100, from, to, groupBy });
});

/* Net student collection (SRS 82): gross - refunds; consultant payments shown separately, never netted */
reportsRouter.get('/net-collection', full, async (req, res) => {
  const d = await db();
  const { from, to } = range(req);
  const r = await d.one(
    `SELECT
      (SELECT ISNULL(SUM(Amount), 0) FROM finance.Payments WHERE Status = N'POSTED' AND PaymentDate BETWEEN @from AND @to) AS GrossCollection,
      (SELECT ISNULL(SUM(PaidAmount), 0) FROM finance.Refunds WHERE Status = N'PROCESSED' AND RefundDate BETWEEN @from AND @to) AS Refunds,
      (SELECT ISNULL(SUM(Amount), 0) FROM consultant.Payments WHERE Status = N'PROCESSED' AND PaymentDate BETWEEN @from AND @to) AS ConsultantPayments`,
    { from, to },
  );
  res.json({ from, to, ...r, NetStudentCollection: r.GrossCollection - r.Refunds });
});

/* Student due report */
reportsRouter.get('/due', full, async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT AdmissionId, AdmissionNumber, StudentCode, StudentName, FatherName, Mobile, CourseCode, BatchCode, AdmissionStatus,
            NetCharges, TotalPayments, TotalRefunds, AdvanceAvailable, Outstanding
     FROM reporting.vw_StudentFeeSummary
     WHERE Outstanding >= @min AND Outstanding > 0
       AND (@course IS NULL OR CourseId = @course) AND (@batch IS NULL OR BatchId = @batch)
       AND (@status IS NULL OR AdmissionStatus = @status)
     ORDER BY CourseCode, BatchCode, StudentName`,
    {
      min: qNum(req, 'minDue') ?? 0.01,
      course: qNum(req, 'courseId') ?? null,
      batch: qNum(req, 'batchId') ?? null,
      status: q(req, 'status') ?? null,
    },
  );
  const total = rows.reduce((s, r) => s + Number(r.Outstanding), 0);
  sendRows(req, res, rows, 'due-report', { total: Math.round(total * 100) / 100 });
});

/* Course / batch fee summary: charges, discounts, collection, outstanding */
reportsRouter.get('/fee-summary', full, async (req, res) => {
  const d = await db();
  const by = q(req, 'by') === 'batch' ? 'batch' : 'course';
  const keys = by === 'batch' ? 'CourseCode, BatchCode' : 'CourseCode';
  const rows = await d.query(
    `SELECT ${keys}, COUNT(*) AS Admissions, SUM(CASE WHEN AdmissionStatus = N'ACTIVE' THEN 1 ELSE 0 END) AS Active,
            SUM(TotalCharges) AS TotalCharges, SUM(TotalDiscounts) AS Discounts, SUM(TotalWaivers) AS Waivers, SUM(NetCharges) AS NetCharges,
            SUM(TotalPayments) AS Collected, SUM(TotalRefunds) AS Refunded, SUM(AdvanceAvailable) AS Advance, SUM(Outstanding) AS Outstanding
     FROM reporting.vw_StudentFeeSummary
     WHERE (@course IS NULL OR CourseId = @course)
     GROUP BY ${keys} ORDER BY ${keys}`,
    { course: qNum(req, 'courseId') ?? null },
  );
  sendRows(req, res, rows, `fee-summary-${by}`);
});

reportsRouter.get('/discounts', full, async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT x.DiscountId, x.CreatedAt, x.Status, x.DiscountAmount, x.Reason, s.StudentName, a.AdmissionNumber, co.CourseCode,
            cb.FeeHeadName, cb.PeriodName, u.FullName AS RequestedBy, ap.FullName AS ApprovedBy, x.ApprovedAt
     FROM finance.Discounts x JOIN admission.Students s ON s.StudentId = x.StudentId JOIN admission.Admissions a ON a.AdmissionId = x.AdmissionId
     JOIN academic.Courses co ON co.CourseId = a.CourseId JOIN reporting.vw_ChargeBalances cb ON cb.ChargeId = x.ChargeId
     JOIN security.Users u ON u.UserId = x.RequestedBy LEFT JOIN security.Users ap ON ap.UserId = x.ApprovedBy
     WHERE (@status IS NULL OR x.Status = @status)
       AND (@from IS NULL OR CAST(x.CreatedAt AS DATE) >= @from) AND (@to IS NULL OR CAST(x.CreatedAt AS DATE) <= @to)
     ORDER BY x.DiscountId DESC`,
    { status: q(req, 'status') ?? null, from: qDate(req, 'from') ?? null, to: qDate(req, 'to') ?? null },
  );
  sendRows(req, res, rows, 'discounts');
});

reportsRouter.get('/waivers', full, async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT x.AdjustmentId, x.CreatedAt, x.AdjustmentType, x.Status, x.Amount, x.Reason, s.StudentName, a.AdmissionNumber, cb.FeeHeadName,
            u.FullName AS RequestedBy, ap.FullName AS ApprovedBy, x.ApprovedAt
     FROM finance.Adjustments x JOIN admission.Students s ON s.StudentId = x.StudentId JOIN admission.Admissions a ON a.AdmissionId = x.AdmissionId
     JOIN reporting.vw_ChargeBalances cb ON cb.ChargeId = x.ChargeId
     JOIN security.Users u ON u.UserId = x.RequestedBy LEFT JOIN security.Users ap ON ap.UserId = x.ApprovedBy
     WHERE (@status IS NULL OR x.Status = @status)
       AND (@from IS NULL OR CAST(x.CreatedAt AS DATE) >= @from) AND (@to IS NULL OR CAST(x.CreatedAt AS DATE) <= @to)
     ORDER BY x.AdjustmentId DESC`,
    { status: q(req, 'status') ?? null, from: qDate(req, 'from') ?? null, to: qDate(req, 'to') ?? null },
  );
  sendRows(req, res, rows, 'waivers');
});

reportsRouter.get('/reversals', full, async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT r.ReversalId, r.ReversalDate, r.OriginalTransactionType, r.OriginalTransactionId, r.Amount, r.Reason, r.Status,
            s.StudentName, a.AdmissionNumber, p.ReceiptNumber, u.FullName AS RequestedBy, ap.FullName AS ApprovedBy, r.ApprovedAt
     FROM finance.TransactionReversals r JOIN admission.Admissions a ON a.AdmissionId = r.AdmissionId
     JOIN admission.Students s ON s.StudentId = a.StudentId
     LEFT JOIN finance.Payments p ON r.OriginalTransactionType = N'PAYMENT' AND p.PaymentId = r.OriginalTransactionId
     JOIN security.Users u ON u.UserId = r.RequestedBy LEFT JOIN security.Users ap ON ap.UserId = r.ApprovedBy
     WHERE (@status IS NULL OR r.Status = @status)
       AND (@from IS NULL OR r.ReversalDate >= @from) AND (@to IS NULL OR r.ReversalDate <= @to)
     ORDER BY r.ReversalId DESC`,
    { status: q(req, 'status') ?? null, from: qDate(req, 'from') ?? null, to: qDate(req, 'to') ?? null },
  );
  sendRows(req, res, rows, 'reversals');
});

/* Seat / admission history (SRS 80) */
reportsRouter.get('/admission-history', requirePerm('REPORT_VIEW', 'ADMISSION_VIEW'), async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT * FROM reporting.vw_AdmissionHistory
     WHERE (@batch IS NULL OR BatchId = @batch) AND (@course IS NULL OR CourseId = @course) AND (@seat IS NULL OR SeatId = @seat)
     ORDER BY CourseCode, BatchCode, TRY_CAST(SeatNumber AS INT), AdmissionSeatHistoryId`,
    { batch: qNum(req, 'batchId') ?? null, course: qNum(req, 'courseId') ?? null, seat: qNum(req, 'seatId') ?? null },
  );
  sendRows(req, res, rows, 'admission-history');
});

/* ---------------- consultant reports -------------------------------- */
reportsRouter.get('/consultant-outstanding', consultantFin, async (req, res) => {
  const d = await db();
  const rows = await d.query(`SELECT * FROM reporting.vw_ConsultantOutstanding WHERE (@only = 0 OR Outstanding <> 0) ORDER BY ConsultantName`, {
    only: q(req, 'onlyOutstanding') === 'true' ? 1 : 0,
  });
  sendRows(req, res, rows, 'consultant-outstanding');
});

/* Consultant acquisition cost (SRS 81) - restricted management report */
reportsRouter.get('/consultant-acquisition-cost', requirePerm('REPORT_VIEW'), consultantFin, async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT ConsultantCode, ConsultantName, TotalAdmissions AS Admissions, ActiveAdmissions, CancelledAdmissions,
            TotalPayable - TotalRecovery AS ConsultantCost,
            CASE WHEN TotalAdmissions > 0 THEN CAST((TotalPayable - TotalRecovery) / TotalAdmissions AS DECIMAL(18,2)) END AS CostPerAdmission
     FROM reporting.vw_ConsultantOutstanding WHERE TotalAdmissions > 0 ORDER BY ConsultantName`,
  );
  sendRows(req, res, rows, 'consultant-acquisition-cost');
});

reportsRouter.get('/cancelled-admission-consultant', consultantFin, async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT * FROM reporting.vw_ConsultantStudentSummary WHERE AdmissionStatus = N'CANCELLED'
       AND (@review IS NULL OR ConsultantReviewStatus = @review)
     ORDER BY CancellationDate DESC`,
    { review: q(req, 'review') ?? null },
  );
  sendRows(req, res, rows, 'cancelled-admission-consultant');
});

reportsRouter.get('/consultant-payments', consultantFin, async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT cp.PaymentNumber, cp.PaymentDate, cp.Amount, cp.Status, cp.IsOverride, c.ConsultantCode, c.ConsultantName, s.StudentName,
            a.AdmissionNumber, pm.PaymentModeName, cp.TransactionReference, u.FullName AS RequestedBy
     FROM consultant.Payments cp JOIN consultant.Consultants c ON c.ConsultantId = cp.ConsultantId
     JOIN finance.PaymentModes pm ON pm.PaymentModeId = cp.PaymentModeId JOIN security.Users u ON u.UserId = cp.RequestedBy
     LEFT JOIN admission.Students s ON s.StudentId = cp.StudentId LEFT JOIN admission.Admissions a ON a.AdmissionId = cp.AdmissionId
     WHERE (@c IS NULL OR cp.ConsultantId = @c) AND (@status IS NULL OR cp.Status = @status)
       AND (@from IS NULL OR cp.PaymentDate >= @from) AND (@to IS NULL OR cp.PaymentDate <= @to)
     ORDER BY cp.ConsultantPaymentId DESC`,
    { c: qNum(req, 'consultantId') ?? null, status: q(req, 'status') ?? null, from: qDate(req, 'from') ?? null, to: qDate(req, 'to') ?? null },
  );
  sendRows(req, res, rows, 'consultant-payments');
});

reportsRouter.get('/consultant-recoveries', consultantFin, async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT r.RecoveryId, r.RecoveryDate, r.RecoveryMode, r.Amount, r.Reason, r.Status, c.ConsultantName, s.StudentName, a.AdmissionNumber
     FROM consultant.Recoveries r JOIN consultant.Consultants c ON c.ConsultantId = r.ConsultantId
     LEFT JOIN admission.Students s ON s.StudentId = r.StudentId LEFT JOIN admission.Admissions a ON a.AdmissionId = r.AdmissionId
     WHERE (@c IS NULL OR r.ConsultantId = @c) ORDER BY r.RecoveryId DESC`,
    { c: qNum(req, 'consultantId') ?? null },
  );
  sendRows(req, res, rows, 'consultant-recoveries');
});

/* ---------------- audit -------------------------------------------- */
reportsRouter.get('/audit', requirePerm('AUDIT_VIEW'), async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT TOP (@top) l.AuditLogId, l.ActionDateTime, u.UserName, u.FullName, l.ActionType, l.EntityName, l.EntityId, l.Reason,
            l.OldValues, l.NewValues, l.IpAddress
     FROM audit.AuditLogs l LEFT JOIN security.Users u ON u.UserId = l.UserId
     WHERE (@from IS NULL OR l.ActionDateTime >= @from) AND (@to IS NULL OR l.ActionDateTime < DATEADD(DAY, 1, CAST(@to AS DATE)))
       AND (@user IS NULL OR l.UserId = @user) AND (@action IS NULL OR l.ActionType LIKE @action)
       AND (@entity IS NULL OR l.EntityName = @entity) AND (@entityId IS NULL OR l.EntityId = @entityId)
     ORDER BY l.AuditLogId DESC`,
    {
      top: Math.min(qNum(req, 'top') ?? 500, 20000),
      from: qDate(req, 'from') ?? null,
      to: qDate(req, 'to') ?? null,
      user: qNum(req, 'userId') ?? null,
      action: q(req, 'action') ? `%${q(req, 'action')}%` : null,
      entity: q(req, 'entity') ?? null,
      entityId: qNum(req, 'entityId') ?? null,
    },
  );
  sendRows(req, res, rows, 'audit-log');
});

/* Integrity self-check: every admission's stored transactions must reconcile */
reportsRouter.get('/reconcile', requirePerm('AUDIT_VIEW', 'SETTINGS_MANAGE'), async (_req, res) => {
  const d = await db();
  const r = await d.request().execute('reporting.usp_ReconcileStudentBalances');
  res.json({ ok: (r.recordset ?? []).length === 0, mismatches: r.recordset ?? [] });
});
