/* =====================================================================
   003 - Reporting views
   Balances are NEVER stored: every figure below is derived from the
   underlying transaction tables.

   Effective transactions:
     charges      ChargeStatus = ACTIVE
     payments     Status = POSTED        (REVERSED payments no longer count)
     advances     Status <> REVERSED
     discounts    Status = APPROVED
     adjustments  Status = APPROVED      (waivers of a charge)
     refunds      Status = PROCESSED

   Per charge:
     Due = Original - Discounts - Waivers - PaymentAllocations - AdvanceAllocations
   (a fee-head refund credits the charge and pays the money out, so it does
    not change what is due on the charge)

   Per admission:
     Balance = NetCharges - Payments + Refunds - RefundCredits
             = Outstanding - AdvanceAvailable
   ===================================================================== */

CREATE OR ALTER VIEW reporting.vw_ChargeBalances
AS
SELECT
    c.ChargeId, c.AdmissionId, c.StudentId, c.FeeStructureId, c.FeeHeadId, fh.FeeHeadCode, fh.FeeHeadName,
    c.FeePeriodId, fp.PeriodName, c.AcademicYearId, ay.AcademicYearCode,
    c.ChargeDate, c.DueDate, c.OriginalAmount, c.ChargeStatus, c.Description, c.CreatedAt, c.CreatedBy,
    ISNULL(d.Amount, 0)  AS DiscountAmount,
    ISNULL(w.Amount, 0)  AS WaivedAmount,
    ISNULL(pa.Amount, 0) AS PaidAmount,
    ISNULL(aa.Amount, 0) AS AdvanceAppliedAmount,
    ISNULL(ra.Amount, 0) AS RefundedAmount,
    CASE WHEN c.ChargeStatus = N'ACTIVE'
         THEN c.OriginalAmount - ISNULL(d.Amount, 0) - ISNULL(w.Amount, 0) ELSE 0 END AS NetAmount,
    CASE WHEN c.ChargeStatus = N'ACTIVE'
         THEN c.OriginalAmount - ISNULL(d.Amount, 0) - ISNULL(w.Amount, 0) - ISNULL(pa.Amount, 0) - ISNULL(aa.Amount, 0)
         ELSE 0 END AS DueAmount
FROM finance.StudentCharges c
JOIN finance.FeeHeads fh ON fh.FeeHeadId = c.FeeHeadId
JOIN academic.AcademicYears ay ON ay.AcademicYearId = c.AcademicYearId
LEFT JOIN academic.FeePeriods fp ON fp.FeePeriodId = c.FeePeriodId
OUTER APPLY (SELECT SUM(x.DiscountAmount) AS Amount FROM finance.Discounts x
             WHERE x.ChargeId = c.ChargeId AND x.Status = N'APPROVED') d
OUTER APPLY (SELECT SUM(x.Amount) AS Amount FROM finance.Adjustments x
             WHERE x.ChargeId = c.ChargeId AND x.Status = N'APPROVED') w
OUTER APPLY (SELECT SUM(x.AllocatedAmount) AS Amount FROM finance.PaymentAllocations x
             JOIN finance.Payments p ON p.PaymentId = x.PaymentId
             WHERE x.ChargeId = c.ChargeId AND p.Status = N'POSTED') pa
OUTER APPLY (SELECT SUM(x.Amount) AS Amount FROM finance.AdvanceAllocations x
             JOIN finance.Advances v ON v.AdvanceId = x.AdvanceId
             WHERE x.ChargeId = c.ChargeId AND v.Status <> N'REVERSED') aa
OUTER APPLY (SELECT SUM(x.Amount) AS Amount FROM finance.RefundAllocations x
             JOIN finance.Refunds r ON r.RefundId = x.RefundId
             WHERE x.ChargeId = c.ChargeId AND r.Status = N'PROCESSED') ra;
GO

CREATE OR ALTER VIEW reporting.vw_AdvanceBalances
AS
SELECT
    v.AdvanceId, v.PaymentId, p.ReceiptNumber, p.PaymentDate, v.StudentId, v.AdmissionId, v.OriginalAmount, v.Status,
    ISNULL(aa.Amount, 0) AS AppliedAmount,
    ISNULL(ra.Amount, 0) AS RefundedAmount,
    CASE WHEN v.Status = N'REVERSED' THEN 0
         ELSE v.OriginalAmount - ISNULL(aa.Amount, 0) - ISNULL(ra.Amount, 0) END AS AvailableAmount,
    v.CreatedAt
FROM finance.Advances v
JOIN finance.Payments p ON p.PaymentId = v.PaymentId
OUTER APPLY (SELECT SUM(x.Amount) AS Amount FROM finance.AdvanceAllocations x WHERE x.AdvanceId = v.AdvanceId) aa
OUTER APPLY (SELECT SUM(x.Amount) AS Amount FROM finance.RefundAllocations x
             JOIN finance.Refunds r ON r.RefundId = x.RefundId
             WHERE x.AdvanceId = v.AdvanceId AND r.Status = N'PROCESSED') ra;
GO

/* Charges must never become over-settled (defence in depth). */
CREATE OR ALTER TRIGGER finance.TR_PaymentAllocations_ChargeLimit ON finance.PaymentAllocations
AFTER INSERT AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM reporting.vw_ChargeBalances b
               WHERE b.ChargeId IN (SELECT ChargeId FROM inserted) AND b.DueAmount < 0)
        THROW 50013, N'Allocation exceeds the amount due on the charge.', 1;
END
GO
CREATE OR ALTER TRIGGER finance.TR_AdvanceAllocations_ChargeLimit ON finance.AdvanceAllocations
AFTER INSERT AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM reporting.vw_ChargeBalances b
               WHERE b.ChargeId IN (SELECT ChargeId FROM inserted) AND b.DueAmount < 0)
        THROW 50013, N'Allocation exceeds the amount due on the charge.', 1;
END
GO

CREATE OR ALTER VIEW reporting.vw_StudentFeeSummary
AS
SELECT
    a.AdmissionId, a.AdmissionNumber, a.AdmissionStatus, a.StudentId, s.StudentCode, s.StudentName, s.FatherName,
    s.Mobile, s.RollNumber, a.CourseId, co.CourseCode, co.CourseName, a.BatchId, b.BatchCode, b.BatchName,
    a.ConsultantId,
    ISNULL(ch.TotalCharges, 0)   AS TotalCharges,
    ISNULL(ch.TotalDiscounts, 0) AS TotalDiscounts,
    ISNULL(ch.TotalWaivers, 0)   AS TotalWaivers,
    ISNULL(ch.TotalCharges, 0) - ISNULL(ch.TotalDiscounts, 0) - ISNULL(ch.TotalWaivers, 0) AS NetCharges,
    ISNULL(pay.TotalPayments, 0) AS TotalPayments,
    ISNULL(rf.TotalRefunds, 0)   AS TotalRefunds,
    ISNULL(rc.RefundCredits, 0)  AS RefundCredits,
    ISNULL(adv.AdvanceAvailable, 0) AS AdvanceAvailable,
    ISNULL(ch.Outstanding, 0)    AS Outstanding,
    ISNULL(ch.TotalCharges, 0) - ISNULL(ch.TotalDiscounts, 0) - ISNULL(ch.TotalWaivers, 0)
      - ISNULL(pay.TotalPayments, 0) + ISNULL(rf.TotalRefunds, 0) - ISNULL(rc.RefundCredits, 0) AS Balance
FROM admission.Admissions a
JOIN admission.Students s ON s.StudentId = a.StudentId
JOIN academic.Courses co ON co.CourseId = a.CourseId
JOIN academic.Batches b ON b.BatchId = a.BatchId
OUTER APPLY (SELECT SUM(CASE WHEN x.ChargeStatus = N'ACTIVE' THEN x.OriginalAmount ELSE 0 END) AS TotalCharges,
                    SUM(CASE WHEN x.ChargeStatus = N'ACTIVE' THEN x.DiscountAmount ELSE 0 END) AS TotalDiscounts,
                    SUM(CASE WHEN x.ChargeStatus = N'ACTIVE' THEN x.WaivedAmount ELSE 0 END) AS TotalWaivers,
                    SUM(x.DueAmount) AS Outstanding
             FROM reporting.vw_ChargeBalances x WHERE x.AdmissionId = a.AdmissionId) ch
OUTER APPLY (SELECT SUM(p.Amount) AS TotalPayments FROM finance.Payments p
             WHERE p.AdmissionId = a.AdmissionId AND p.Status = N'POSTED') pay
OUTER APPLY (SELECT SUM(r.PaidAmount) AS TotalRefunds FROM finance.Refunds r
             WHERE r.AdmissionId = a.AdmissionId AND r.Status = N'PROCESSED') rf
OUTER APPLY (SELECT SUM(x.Amount) AS RefundCredits FROM finance.RefundAllocations x
             JOIN finance.Refunds r ON r.RefundId = x.RefundId
             WHERE r.AdmissionId = a.AdmissionId AND r.Status = N'PROCESSED' AND x.ChargeId IS NOT NULL) rc
OUTER APPLY (SELECT SUM(x.AvailableAmount) AS AdvanceAvailable FROM reporting.vw_AdvanceBalances x
             WHERE x.AdmissionId = a.AdmissionId) adv;
GO

CREATE OR ALTER VIEW reporting.vw_StudentOutstanding
AS
SELECT * FROM reporting.vw_StudentFeeSummary WHERE Outstanding > 0;
GO

/* Student ledger: one row per financial event, with running balance.
   Debit increases what the student owes, Credit reduces it. */
CREATE OR ALTER VIEW reporting.vw_StudentLedgerEntries
AS
/* charges */
SELECT c.AdmissionId, c.StudentId, c.ChargeDate AS EntryDate, 10 AS SortOrder, N'CHARGE' AS EntryType, c.ChargeId AS EntryId,
       fh.FeeHeadName + ISNULL(N' - ' + fp.PeriodName, N'') + ISNULL(N' (' + c.Description + N')', N'') AS Particulars,
       NULL AS Reference, c.FeeHeadId, c.FeePeriodId, c.AcademicYearId,
       c.OriginalAmount AS ChargeAmount, CAST(0 AS DECIMAL(18,2)) AS PaymentAmount, CAST(0 AS DECIMAL(18,2)) AS AdjustmentAmount,
       CAST(0 AS DECIMAL(18,2)) AS RefundAmount, c.OriginalAmount AS Debit, CAST(0 AS DECIMAL(18,2)) AS Credit, c.CreatedAt
FROM finance.StudentCharges c
JOIN finance.FeeHeads fh ON fh.FeeHeadId = c.FeeHeadId
LEFT JOIN academic.FeePeriods fp ON fp.FeePeriodId = c.FeePeriodId
UNION ALL
/* charge reversals */
SELECT c.AdmissionId, c.StudentId, r.ReversalDate, 15, N'CHARGE_REVERSAL', r.ReversalId,
       N'Charge reversed: ' + fh.FeeHeadName + N' - ' + r.Reason, NULL, c.FeeHeadId, c.FeePeriodId, c.AcademicYearId,
       -c.OriginalAmount, 0, 0, 0, 0, c.OriginalAmount, r.ApprovedAt
FROM finance.TransactionReversals r
JOIN finance.StudentCharges c ON r.OriginalTransactionType = N'CHARGE' AND c.ChargeId = r.OriginalTransactionId
JOIN finance.FeeHeads fh ON fh.FeeHeadId = c.FeeHeadId
WHERE r.Status = N'APPROVED'
UNION ALL
/* discounts */
SELECT d.AdmissionId, d.StudentId, CAST(d.ApprovedAt AS DATE), 20, N'DISCOUNT', d.DiscountId,
       N'Discount on ' + fh.FeeHeadName + N' - ' + d.Reason, NULL, c.FeeHeadId, c.FeePeriodId, c.AcademicYearId,
       0, 0, -d.DiscountAmount, 0, 0, d.DiscountAmount, d.ApprovedAt
FROM finance.Discounts d
JOIN finance.StudentCharges c ON c.ChargeId = d.ChargeId
JOIN finance.FeeHeads fh ON fh.FeeHeadId = c.FeeHeadId
WHERE d.Status = N'APPROVED'
UNION ALL
/* waivers */
SELECT w.AdmissionId, w.StudentId, CAST(w.ApprovedAt AS DATE), 25, N'WAIVER', w.AdjustmentId,
       N'Waiver on ' + fh.FeeHeadName + N' - ' + w.Reason, NULL, c.FeeHeadId, c.FeePeriodId, c.AcademicYearId,
       0, 0, -w.Amount, 0, 0, w.Amount, w.ApprovedAt
FROM finance.Adjustments w
JOIN finance.StudentCharges c ON c.ChargeId = w.ChargeId
JOIN finance.FeeHeads fh ON fh.FeeHeadId = c.FeeHeadId
WHERE w.Status = N'APPROVED'
UNION ALL
/* payments (reversed payments stay visible; the reversal is a separate row) */
SELECT p.AdmissionId, p.StudentId, p.PaymentDate, 30, N'PAYMENT', p.PaymentId,
       N'Payment received (' + pm.PaymentModeName + ISNULL(N' ' + p.TransactionReference, N'') + N')',
       p.ReceiptNumber, NULL, NULL, NULL,
       0, p.Amount, 0, 0, 0, p.Amount, p.PostedAt
FROM finance.Payments p
JOIN finance.PaymentModes pm ON pm.PaymentModeId = p.PaymentModeId
WHERE p.Status IN (N'POSTED', N'REVERSED')
UNION ALL
SELECT p.AdmissionId, p.StudentId, r.ReversalDate, 35, N'PAYMENT_REVERSAL', r.ReversalId,
       N'Payment reversed - ' + r.Reason, p.ReceiptNumber, NULL, NULL, NULL,
       0, -p.Amount, 0, 0, p.Amount, 0, r.ApprovedAt
FROM finance.TransactionReversals r
JOIN finance.Payments p ON r.OriginalTransactionType = N'PAYMENT' AND p.PaymentId = r.OriginalTransactionId
WHERE r.Status = N'APPROVED'
UNION ALL
/* refunds paid out */
SELECT r.AdmissionId, r.StudentId, r.RefundDate, 40, N'REFUND', r.RefundId,
       N'Refund paid - ' + r.Reason, r.RefundNumber, NULL, NULL, NULL,
       0, 0, 0, r.PaidAmount, r.PaidAmount, 0, r.ProcessedAt
FROM finance.Refunds r
WHERE r.Status = N'PROCESSED'
UNION ALL
/* fee credited back because it was refunded */
SELECT r.AdmissionId, r.StudentId, r.RefundDate, 45, N'REFUND_CREDIT', ra.RefundAllocationId,
       N'Fee credited on refund: ' + fh.FeeHeadName, r.RefundNumber, c.FeeHeadId, c.FeePeriodId, c.AcademicYearId,
       0, 0, -ra.Amount, 0, 0, ra.Amount, r.ProcessedAt
FROM finance.RefundAllocations ra
JOIN finance.Refunds r ON r.RefundId = ra.RefundId
JOIN finance.StudentCharges c ON c.ChargeId = ra.ChargeId
JOIN finance.FeeHeads fh ON fh.FeeHeadId = c.FeeHeadId
WHERE r.Status = N'PROCESSED';
GO

CREATE OR ALTER VIEW reporting.vw_StudentLedger
AS
SELECT e.*,
       SUM(e.Debit - e.Credit) OVER (PARTITION BY e.AdmissionId
                                     ORDER BY e.EntryDate, e.SortOrder, e.EntryId
                                     ROWS UNBOUNDED PRECEDING) AS RunningBalance
FROM reporting.vw_StudentLedgerEntries e;
GO

/* Payment register - base for all collection reports */
CREATE OR ALTER VIEW reporting.vw_PaymentRegister
AS
SELECT p.PaymentId, p.ReceiptNumber, p.PaymentDate, p.Amount, p.Status, p.PaymentModeId, pm.PaymentModeCode, pm.PaymentModeName,
       pm.IsCash, p.TransactionReference, p.BankName, p.ChequeNumber, p.ChequeDate, p.ChequeStatus, p.Remarks,
       p.AdmissionId, a.AdmissionNumber, p.StudentId, s.StudentCode, s.StudentName, s.FatherName,
       a.CourseId, co.CourseCode, co.CourseName, a.BatchId, b.BatchCode, b.BatchName,
       p.SubmittedBy, u.FullName AS CashierName, p.ApprovedBy, p.PostedAt, p.CreatedAt,
       ISNULL(adv.OriginalAmount, 0) AS AdvanceAmount
FROM finance.Payments p
JOIN finance.PaymentModes pm ON pm.PaymentModeId = p.PaymentModeId
JOIN admission.Admissions a ON a.AdmissionId = p.AdmissionId
JOIN admission.Students s ON s.StudentId = p.StudentId
JOIN academic.Courses co ON co.CourseId = a.CourseId
JOIN academic.Batches b ON b.BatchId = a.BatchId
JOIN security.Users u ON u.UserId = p.SubmittedBy
LEFT JOIN finance.Advances adv ON adv.PaymentId = p.PaymentId;
GO

CREATE OR ALTER VIEW reporting.vw_DailyCollection
AS
SELECT PaymentDate, PaymentModeCode, PaymentModeName, SubmittedBy, CashierName,
       COUNT(*) AS PaymentCount, SUM(Amount) AS Amount
FROM reporting.vw_PaymentRegister
WHERE Status = N'POSTED'
GROUP BY PaymentDate, PaymentModeCode, PaymentModeName, SubmittedBy, CashierName;
GO

CREATE OR ALTER VIEW reporting.vw_CourseCollection
AS
SELECT PaymentDate, CourseId, CourseCode, CourseName, COUNT(*) AS PaymentCount, SUM(Amount) AS Amount
FROM reporting.vw_PaymentRegister
WHERE Status = N'POSTED'
GROUP BY PaymentDate, CourseId, CourseCode, CourseName;
GO

CREATE OR ALTER VIEW reporting.vw_BatchCollection
AS
SELECT PaymentDate, CourseId, CourseCode, BatchId, BatchCode, BatchName, COUNT(*) AS PaymentCount, SUM(Amount) AS Amount
FROM reporting.vw_PaymentRegister
WHERE Status = N'POSTED'
GROUP BY PaymentDate, CourseId, CourseCode, BatchId, BatchCode, BatchName;
GO

/* Collection split by fee head (via allocations); money not yet allocated
   appears under the pseudo head ADVANCE so the totals always reconcile. */
CREATE OR ALTER VIEW reporting.vw_FeeHeadCollection
AS
SELECT p.PaymentDate, p.PaymentId, p.CourseId, p.BatchId, p.PaymentModeId, p.SubmittedBy,
       c.FeeHeadId, fh.FeeHeadCode, fh.FeeHeadName, c.AcademicYearId, c.FeePeriodId, pa.AllocatedAmount AS Amount
FROM reporting.vw_PaymentRegister p
JOIN finance.PaymentAllocations pa ON pa.PaymentId = p.PaymentId
JOIN finance.StudentCharges c ON c.ChargeId = pa.ChargeId
JOIN finance.FeeHeads fh ON fh.FeeHeadId = c.FeeHeadId
WHERE p.Status = N'POSTED'
UNION ALL
SELECT p.PaymentDate, p.PaymentId, p.CourseId, p.BatchId, p.PaymentModeId, p.SubmittedBy,
       NULL, N'ADVANCE', N'Advance (unallocated at receipt)', NULL, NULL, p.AdvanceAmount
FROM reporting.vw_PaymentRegister p
WHERE p.Status = N'POSTED' AND p.AdvanceAmount > 0;
GO

/* ---------------- Consultant ----------------------------------------- */
CREATE OR ALTER VIEW reporting.vw_ConsultantLedgerEntries
AS
SELECT py.ConsultantId, py.PayableDate AS EntryDate, 10 AS SortOrder, N'PAYABLE' AS EntryType, py.ConsultantPayableId AS EntryId,
       py.StudentId, py.AdmissionId, py.CourseId, py.Description AS Particulars, CAST(NULL AS NVARCHAR(50)) AS Reference,
       py.ApprovedAmount AS PayableAmount, CAST(0 AS DECIMAL(18,2)) AS PaidAmount, CAST(0 AS DECIMAL(18,2)) AS RecoveryAmount
FROM consultant.Payables py
WHERE py.Status = N'APPROVED'
UNION ALL
SELECT cp.ConsultantId, cp.PaymentDate, 20, N'PAYMENT', cp.ConsultantPaymentId,
       cp.StudentId, cp.AdmissionId, py.CourseId,
       N'Payment' + ISNULL(N' (' + pm.PaymentModeName + ISNULL(N' ' + cp.TransactionReference, N'') + N')', N''),
       cp.PaymentNumber, 0, cp.Amount, 0
FROM consultant.Payments cp
JOIN consultant.Payables py ON py.ConsultantPayableId = cp.ConsultantPayableId
JOIN finance.PaymentModes pm ON pm.PaymentModeId = cp.PaymentModeId
WHERE cp.Status = N'PROCESSED'
UNION ALL
/* CASH recovery: entitlement reduced and money received back (net paid reduced) */
SELECT r.ConsultantId, r.RecoveryDate, 30, N'RECOVERY_' + r.RecoveryMode, r.RecoveryId,
       r.StudentId, r.AdmissionId, py.CourseId,
       CASE WHEN r.RecoveryMode = N'CASH' THEN N'Recovery received - ' ELSE N'Recovery adjustment - ' END + r.Reason,
       r.TransactionReference,
       0, CASE WHEN r.RecoveryMode = N'CASH' THEN -r.Amount ELSE 0 END, r.Amount
FROM consultant.Recoveries r
LEFT JOIN consultant.Payables py ON py.ConsultantPayableId = r.ConsultantPayableId
WHERE r.Status = N'APPROVED';
GO

CREATE OR ALTER VIEW reporting.vw_ConsultantLedger
AS
SELECT e.*, s.StudentCode, s.StudentName, co.CourseCode,
       SUM(e.PayableAmount - e.PaidAmount - e.RecoveryAmount) OVER (PARTITION BY e.ConsultantId
            ORDER BY e.EntryDate, e.SortOrder, e.EntryId ROWS UNBOUNDED PRECEDING) AS RunningBalance
FROM reporting.vw_ConsultantLedgerEntries e
LEFT JOIN admission.Students s ON s.StudentId = e.StudentId
LEFT JOIN academic.Courses co ON co.CourseId = e.CourseId;
GO

/* Remaining amount per payable, used for duplicate-payment control.
   Pending / approved (not yet processed) payments also consume the payable. */
CREATE OR ALTER VIEW reporting.vw_ConsultantPayableBalances
AS
SELECT py.ConsultantPayableId, py.ConsultantId, py.StudentId, py.AdmissionId, py.CourseId, py.BatchId,
       py.PayableDate, py.ApprovedAmount, py.Description, py.Status,
       ISNULL(pd.Processed, 0) AS PaidAmount,
       ISNULL(pd.InProcess, 0) AS InProcessAmount,
       ISNULL(rc.Adjust, 0) AS AdjustRecoveryAmount,
       ISNULL(rc.Cash, 0) AS CashRecoveryAmount,
       CASE WHEN py.Status = N'APPROVED'
            THEN py.ApprovedAmount - ISNULL(pd.Processed, 0) - ISNULL(pd.InProcess, 0) - ISNULL(rc.Adjust, 0)
            ELSE 0 END AS RemainingAmount
FROM consultant.Payables py
OUTER APPLY (SELECT SUM(CASE WHEN cp.Status = N'PROCESSED' THEN cp.Amount ELSE 0 END) AS Processed,
                    SUM(CASE WHEN cp.Status IN (N'PENDING_APPROVAL', N'APPROVED') THEN cp.Amount ELSE 0 END) AS InProcess
             FROM consultant.Payments cp WHERE cp.ConsultantPayableId = py.ConsultantPayableId) pd
OUTER APPLY (SELECT SUM(CASE WHEN r.RecoveryMode = N'ADJUST' THEN r.Amount ELSE 0 END) AS Adjust,
                    SUM(CASE WHEN r.RecoveryMode = N'CASH' THEN r.Amount ELSE 0 END) AS Cash
             FROM consultant.Recoveries r WHERE r.ConsultantPayableId = py.ConsultantPayableId AND r.Status = N'APPROVED') rc;
GO

CREATE OR ALTER VIEW reporting.vw_ConsultantOutstanding
AS
SELECT c.ConsultantId, c.ConsultantCode, c.ConsultantName, c.OrganizationName, c.Mobile, c.Status,
       ISNULL(ad.Admissions, 0) AS TotalAdmissions,
       ISNULL(ad.ActiveAdmissions, 0) AS ActiveAdmissions,
       ISNULL(ad.CancelledAdmissions, 0) AS CancelledAdmissions,
       ISNULL(l.Payable, 0) AS TotalPayable,
       ISNULL(l.Paid, 0) AS TotalPaid,
       ISNULL(l.Recovery, 0) AS TotalRecovery,
       ISNULL(l.Payable, 0) - ISNULL(l.Paid, 0) - ISNULL(l.Recovery, 0) AS Outstanding,
       ISNULL(pp.PendingPayments, 0) AS PendingPayments
FROM consultant.Consultants c
OUTER APPLY (SELECT COUNT(*) AS Admissions,
                    SUM(CASE WHEN a.AdmissionStatus = N'ACTIVE' THEN 1 ELSE 0 END) AS ActiveAdmissions,
                    SUM(CASE WHEN a.AdmissionStatus = N'CANCELLED' THEN 1 ELSE 0 END) AS CancelledAdmissions
             FROM admission.Admissions a WHERE a.ConsultantId = c.ConsultantId) ad
OUTER APPLY (SELECT SUM(e.PayableAmount) AS Payable, SUM(e.PaidAmount) AS Paid, SUM(e.RecoveryAmount) AS Recovery
             FROM reporting.vw_ConsultantLedgerEntries e WHERE e.ConsultantId = c.ConsultantId) l
OUTER APPLY (SELECT SUM(cp.Amount) AS PendingPayments FROM consultant.Payments cp
             WHERE cp.ConsultantId = c.ConsultantId AND cp.Status IN (N'PENDING_APPROVAL', N'APPROVED')) pp;
GO

CREATE OR ALTER VIEW reporting.vw_ConsultantStudentSummary
AS
SELECT a.ConsultantId, c.ConsultantCode, c.ConsultantName, a.AdmissionId, a.AdmissionNumber, a.AdmissionDate, a.AdmissionStatus,
       a.CancellationDate, a.ConsultantReviewStatus, a.StudentId, s.StudentCode, s.StudentName,
       a.CourseId, co.CourseCode, a.BatchId, b.BatchCode,
       ISNULL(l.Payable, 0) AS Payable, ISNULL(l.Paid, 0) AS Paid, ISNULL(l.Recovery, 0) AS Recovery,
       ISNULL(l.Payable, 0) - ISNULL(l.Paid, 0) - ISNULL(l.Recovery, 0) AS Outstanding,
       ISNULL(pp.PendingPayable, 0) AS PendingPayable
FROM admission.Admissions a
JOIN consultant.Consultants c ON c.ConsultantId = a.ConsultantId
JOIN admission.Students s ON s.StudentId = a.StudentId
JOIN academic.Courses co ON co.CourseId = a.CourseId
JOIN academic.Batches b ON b.BatchId = a.BatchId
OUTER APPLY (SELECT SUM(e.PayableAmount) AS Payable, SUM(e.PaidAmount) AS Paid, SUM(e.RecoveryAmount) AS Recovery
             FROM reporting.vw_ConsultantLedgerEntries e WHERE e.AdmissionId = a.AdmissionId AND e.ConsultantId = a.ConsultantId) l
OUTER APPLY (SELECT SUM(py.ApprovedAmount) AS PendingPayable FROM consultant.Payables py
             WHERE py.AdmissionId = a.AdmissionId AND py.Status = N'PENDING_APPROVAL') pp;
GO

/* ---------------- Admissions ----------------------------------------- */
CREATE OR ALTER VIEW reporting.vw_AdmissionHistory
AS
SELECT h.AdmissionSeatHistoryId, h.SeatId, se.SeatNumber, se.SeatStatus, se.BatchId, b.BatchCode, se.CourseId, co.CourseCode,
       h.AdmissionId, a.AdmissionNumber, a.StudentId, s.StudentCode, s.StudentName,
       a.AdmissionDate, a.CancellationDate, a.AdmissionStatus, h.OccupiedFrom, h.OccupiedTo, h.Status AS OccupancyStatus,
       nxt.AdmissionNumber AS ReplacementAdmissionNumber, nxt.StudentName AS ReplacementStudentName
FROM admission.AdmissionSeatHistory h
JOIN admission.Seats se ON se.SeatId = h.SeatId
JOIN academic.Batches b ON b.BatchId = se.BatchId
JOIN academic.Courses co ON co.CourseId = se.CourseId
JOIN admission.Admissions a ON a.AdmissionId = h.AdmissionId
JOIN admission.Students s ON s.StudentId = a.StudentId
OUTER APPLY (SELECT TOP (1) a2.AdmissionNumber, s2.StudentName
             FROM admission.AdmissionSeatHistory h2
             JOIN admission.Admissions a2 ON a2.AdmissionId = h2.AdmissionId
             JOIN admission.Students s2 ON s2.StudentId = a2.StudentId
             WHERE h2.SeatId = h.SeatId AND h2.AdmissionSeatHistoryId > h.AdmissionSeatHistoryId
             ORDER BY h2.AdmissionSeatHistoryId) nxt;
GO

/* ---------------- Workflow ------------------------------------------- */
CREATE OR ALTER VIEW reporting.vw_PendingApprovals
AS
SELECT r.ApprovalRequestId, r.TransactionType, r.TransactionId, r.Amount, r.Description, r.StudentId, r.ConsultantId,
       r.RequestedBy, u.FullName AS RequestedByName, r.RequestedAt, r.CurrentLevel, r.MaxLevel, r.Status,
       STUFF((SELECT DISTINCT N', ' + ro.RoleName
              FROM workflow.ApprovalRules ar JOIN security.Roles ro ON ro.RoleId = ar.RoleId
              WHERE ar.TransactionType = r.TransactionType AND ar.ApprovalLevel = r.CurrentLevel AND ar.IsActive = 1
                AND (ar.MinimumAmount IS NULL OR ISNULL(r.Amount, 0) >= ar.MinimumAmount)
                AND (ar.MaximumAmount IS NULL OR ISNULL(r.Amount, 0) <= ar.MaximumAmount)
              FOR XML PATH(N''), TYPE).value(N'.', N'NVARCHAR(MAX)'), 1, 2, N'') AS ApproverRoles
FROM workflow.ApprovalRequests r
JOIN security.Users u ON u.UserId = r.RequestedBy
WHERE r.Status = N'PENDING_APPROVAL';
GO
