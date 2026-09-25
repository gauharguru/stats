import { Router } from 'express';
import { db } from '../db';
import { today } from '../lib/dates';
import { can } from '../middleware/auth';

export const dashboardRouter = Router();

/* One endpoint, sections included according to permissions (SRS 49-51). */
dashboardRouter.get('/', async (req, res) => {
  const d = await db();
  const t = today();
  const out: Record<string, unknown> = { date: t };
  const mgmt = can(req, 'DASHBOARD_ADMIN') || can(req, 'DASHBOARD_MANAGEMENT');

  if (mgmt) {
    out.todayCollection = await d.one(
      `SELECT ISNULL(SUM(Amount), 0) AS Total,
              ISNULL(SUM(CASE WHEN PaymentModeCode = N'CASH' THEN Amount END), 0) AS Cash,
              ISNULL(SUM(CASE WHEN PaymentModeCode = N'UPI' THEN Amount END), 0) AS UPI,
              ISNULL(SUM(CASE WHEN PaymentModeCode IN (N'BANK_TRANSFER', N'NEFT', N'RTGS', N'IMPS') THEN Amount END), 0) AS Bank,
              ISNULL(SUM(CASE WHEN PaymentModeCode = N'CHEQUE' THEN Amount END), 0) AS Cheque,
              ISNULL(SUM(CASE WHEN PaymentModeCode NOT IN (N'CASH', N'UPI', N'BANK_TRANSFER', N'NEFT', N'RTGS', N'IMPS', N'CHEQUE') THEN Amount END), 0) AS Other,
              COUNT(*) AS Receipts
       FROM reporting.vw_PaymentRegister WHERE Status = N'POSTED' AND PaymentDate = @t`,
      { t },
    );
    out.studentFees = await d.one(
      `SELECT ISNULL(SUM(NetCharges), 0) AS TotalCharges, ISNULL(SUM(TotalPayments), 0) AS TotalCollection,
              ISNULL(SUM(TotalRefunds), 0) AS TotalRefunds, ISNULL(SUM(Outstanding), 0) AS Outstanding,
              ISNULL(SUM(AdvanceAvailable), 0) AS Advance, ISNULL(SUM(TotalDiscounts), 0) AS Discounts
       FROM reporting.vw_StudentFeeSummary`,
    );
    out.admissions = await d.one(
      `SELECT SUM(CASE WHEN a.AdmissionStatus = N'ACTIVE' THEN 1 ELSE 0 END) AS Active,
              SUM(CASE WHEN a.AdmissionDate BETWEEN ay.StartDate AND ay.EndDate THEN 1 ELSE 0 END) AS NewThisYear,
              SUM(CASE WHEN a.AdmissionStatus = N'CANCELLED' THEN 1 ELSE 0 END) AS Cancelled,
              SUM(CASE WHEN a.ReplacesAdmissionId IS NOT NULL THEN 1 ELSE 0 END) AS Replacement
       FROM admission.Admissions a CROSS JOIN (SELECT TOP 1 StartDate, EndDate FROM academic.AcademicYears WHERE IsCurrent = 1) ay`,
    );
    out.byCourse = await d.query(
      `SELECT CourseCode, COUNT(*) AS Admissions, SUM(NetCharges) AS Charges, SUM(TotalPayments) AS Collected, SUM(Outstanding) AS Outstanding
       FROM reporting.vw_StudentFeeSummary WHERE AdmissionStatus = N'ACTIVE' GROUP BY CourseCode ORDER BY CourseCode`,
    );
    out.last30Days = await d.query(
      `SELECT PaymentDate, SUM(Amount) AS Amount FROM reporting.vw_PaymentRegister
       WHERE Status = N'POSTED' AND PaymentDate > DATEADD(DAY, -30, CAST(@t AS DATE)) GROUP BY PaymentDate ORDER BY PaymentDate`,
      { t },
    );
    if (can(req, 'CONSULTANT_FINANCE_VIEW')) {
      out.consultants = await d.one(
        `SELECT ISNULL(SUM(TotalPayable), 0) AS Payable, ISNULL(SUM(TotalPaid), 0) AS Paid, ISNULL(SUM(TotalRecovery), 0) AS Recovery,
                ISNULL(SUM(Outstanding), 0) AS Outstanding, ISNULL(SUM(PendingPayments), 0) AS PendingPayments
         FROM reporting.vw_ConsultantOutstanding`,
      );
      out.consultantReviews = (await d.one(`SELECT COUNT(*) AS n FROM admission.Admissions WHERE ConsultantReviewStatus = N'REQUIRED'`)).n;
    }
    out.pendingApprovals = await d.query(
      `SELECT TransactionType, COUNT(*) AS Count, SUM(Amount) AS Amount FROM workflow.ApprovalRequests
       WHERE Status = N'PENDING_APPROVAL' GROUP BY TransactionType`,
    );
  }

  if (can(req, 'DASHBOARD_ADMIN')) {
    out.pendingDayClosings = (await d.one(`SELECT COUNT(*) AS n FROM finance.CashierDayClosings WHERE Status = N'SUBMITTED'`)).n;
    out.auditAlerts = await d.query(
      `SELECT TOP 10 l.ActionDateTime, u.FullName, l.ActionType, l.EntityName, l.EntityId, l.Reason
       FROM audit.AuditLogs l LEFT JOIN security.Users u ON u.UserId = l.UserId
       WHERE l.ActionType IN (N'PAYMENT_REVERSED', N'CHARGE_REVERSED', N'CONSULTANT_PAYMENT_OVERRIDE', N'LOGIN_FAILED',
                              N'ADMISSION_CANCELLED', N'RECEIPT_REPRINTED', N'CHEQUE_STATUS_CHANGED', N'ROLE_PERMISSIONS_CHANGED')
       ORDER BY l.AuditLogId DESC`,
    );
    out.counts = await d.one(
      `SELECT (SELECT COUNT(*) FROM admission.Students) AS Students, (SELECT COUNT(*) FROM consultant.Consultants WHERE Status = N'ACTIVE') AS Consultants,
              (SELECT COUNT(*) FROM security.Users WHERE IsActive = 1) AS Users`,
    );
    try {
      out.lastBackup = await d.one(
        `SELECT TOP 1 backup_finish_date AS FinishedAt, type AS BackupType FROM msdb.dbo.backupset
         WHERE database_name = DB_NAME() ORDER BY backup_finish_date DESC`,
      );
    } catch {
      out.lastBackup = null;
    }
  }

  if (can(req, 'DASHBOARD_CASHIER') || can(req, 'PAYMENT_CREATE')) {
    out.myToday = await d.one(
      `SELECT ISNULL(SUM(Amount), 0) AS Total, ISNULL(SUM(CASE WHEN IsCash = 1 THEN Amount END), 0) AS Cash,
              ISNULL(SUM(CASE WHEN IsCash = 0 THEN Amount END), 0) AS NonCash, COUNT(*) AS Receipts
       FROM reporting.vw_PaymentRegister WHERE Status = N'POSTED' AND PaymentDate = @t AND SubmittedBy = @u`,
      { t, u: req.user!.userId },
    );
    out.myRecentReceipts = await d.query(
      `SELECT TOP 10 PaymentId, ReceiptNumber, PaymentDate, StudentName, AdmissionNumber, PaymentModeName, Amount, Status
       FROM reporting.vw_PaymentRegister WHERE SubmittedBy = @u ORDER BY PaymentId DESC`,
      { u: req.user!.userId },
    );
    out.myDayClosing = await d.one(
      `SELECT Status, ClosingDate FROM finance.CashierDayClosings WHERE UserId = @u AND ClosingDate = @t AND Status <> N'REJECTED'`,
      { t, u: req.user!.userId },
    );
    out.refundsToProcess = (await d.one(`SELECT COUNT(*) AS n FROM finance.Refunds WHERE Status = N'APPROVED'`)).n;
  }
  res.json(out);
});
