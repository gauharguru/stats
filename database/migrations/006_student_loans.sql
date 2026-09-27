/* =====================================================================
   006 - Student education loans
   Bihar Student Credit Card Scheme (BSCC, sanctioned by BSEFCL through the
   District Registration & Counselling Centre - DRCC) and bank education loans.

   * finance.StudentLoans       one row per sanction letter
   * finance.LoanSchedule       the disbursement structure of the letter
                                (Sem/Year, expected date, fee description, amount)
   * finance.LoanAdvices        a payment advice (e.g. BSEFCL e-mail) listing
                                many students, each with its own UTR
   * finance.Payments.LoanId    money received from the lender is recorded as
                                a normal payment of the student (receipt,
                                allocation to fees, student ledger) that is
                                linked to the loan and instalment.
   ===================================================================== */

CREATE TABLE finance.StudentLoans (
    LoanId              BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_StudentLoans PRIMARY KEY,
    LoanNumber          NVARCHAR(50) NOT NULL CONSTRAINT UQ_StudentLoans_Number UNIQUE,
    StudentId           BIGINT NOT NULL CONSTRAINT FK_Loans_Student REFERENCES admission.Students(StudentId),
    AdmissionId         BIGINT NOT NULL CONSTRAINT FK_Loans_Admission REFERENCES admission.Admissions(AdmissionId),
    LoanType            NVARCHAR(30) NOT NULL CONSTRAINT CK_Loans_Type CHECK (LoanType IN (N'BSCC', N'BANK_LOAN', N'OTHER')),
    LenderName          NVARCHAR(200) NOT NULL,       -- BSEFCL / bank name
    DrccDistrict        NVARCHAR(100) NULL,           -- DRCC that verified & sanctioned (BSCC)
    BranchName          NVARCHAR(200) NULL,           -- bank branch (bank loans)
    RegistrationNumber  NVARCHAR(50)  NULL,           -- BSCC applicant RegId / bank application no.
    SanctionNumber      NVARCHAR(100) NULL,           -- sanction / loan account reference, if any
    SanctionDate        DATE NULL,
    SanctionedAmount    DECIMAL(18,2) NOT NULL CONSTRAINT CK_Loans_Amount CHECK (SanctionedAmount >= 0),
    ApplicantName       NVARCHAR(200) NULL,           -- as printed on the letter
    CoApplicantName     NVARCHAR(200) NULL,
    ApplicantAddress    NVARCHAR(500) NULL,
    CourseOnLetter      NVARCHAR(150) NULL,
    StudentIfsc         NVARCHAR(20)  NULL,           -- "User IFSC Code"
    InstituteIfsc       NVARCHAR(20)  NULL,           -- "Institute IFSC Code"
    InstituteAccountNo  NVARCHAR(50)  NULL,           -- beneficiary account of the college
    ContractSignedDate  DATE NULL,                    -- contract signed at DRCC / bank
    Status              NVARCHAR(30) NOT NULL CONSTRAINT DF_Loans_Status DEFAULT (N'SANCTIONED')
                        CONSTRAINT CK_Loans_Status CHECK (Status IN (N'APPLIED', N'SANCTIONED', N'DISBURSING', N'FULLY_DISBURSED',
                            N'CLOSED', N'CANCELLED', N'REJECTED')),
    Remarks             NVARCHAR(1000) NULL,
    CreatedAt           DATETIME2(3) NOT NULL CONSTRAINT DF_Loans_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy           BIGINT NOT NULL CONSTRAINT FK_Loans_CreatedBy REFERENCES security.Users(UserId),
    UpdatedAt           DATETIME2(3) NULL,
    UpdatedBy           BIGINT NULL CONSTRAINT FK_Loans_UpdatedBy REFERENCES security.Users(UserId)
);
CREATE INDEX IX_Loans_Admission ON finance.StudentLoans(AdmissionId);
CREATE INDEX IX_Loans_Student ON finance.StudentLoans(StudentId);
CREATE INDEX IX_Loans_Registration ON finance.StudentLoans(RegistrationNumber) WHERE RegistrationNumber IS NOT NULL;
CREATE INDEX IX_Loans_Status ON finance.StudentLoans(Status);

CREATE TABLE finance.LoanSchedule (
    LoanScheduleId   BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LoanSchedule PRIMARY KEY,
    LoanId           BIGINT NOT NULL CONSTRAINT FK_LoanSch_Loan REFERENCES finance.StudentLoans(LoanId),
    InstallmentNo    INT NOT NULL,
    PeriodLabel      NVARCHAR(50) NOT NULL,           -- "YEAR 1", "SEM 3" as on the letter (may repeat)
    FeePeriodId      BIGINT NULL CONSTRAINT FK_LoanSch_FeePeriod REFERENCES academic.FeePeriods(FeePeriodId),
    ExpectedDate     DATE NULL,
    FeeDescription   NVARCHAR(250) NULL,              -- "Tuition Fees including Hostel Expenses"
    ExpectedAmount   DECIMAL(18,2) NOT NULL CONSTRAINT CK_LoanSch_Amount CHECK (ExpectedAmount >= 0),
    ExpectedMode     NVARCHAR(30) NULL,               -- RTGS / NEFT ...
    BeneficiaryName  NVARCHAR(200) NULL,
    BeneficiaryAccountNo NVARCHAR(50) NULL,
    IsActive         BIT NOT NULL CONSTRAINT DF_LoanSch_Active DEFAULT (1),
    CreatedAt        DATETIME2(3) NOT NULL CONSTRAINT DF_LoanSch_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy        BIGINT NULL CONSTRAINT FK_LoanSch_CreatedBy REFERENCES security.Users(UserId),
    UpdatedAt        DATETIME2(3) NULL,
    UpdatedBy        BIGINT NULL CONSTRAINT FK_LoanSch_UpdatedBy REFERENCES security.Users(UserId)
);
CREATE INDEX IX_LoanSch_Loan ON finance.LoanSchedule(LoanId);
CREATE INDEX IX_LoanSch_Expected ON finance.LoanSchedule(ExpectedDate) WHERE IsActive = 1;

/* A payment advice from the lender (e.g. BSEFCL e-mail "Bihar Student Credit
   Card - Tuition Fees Details"): one advice lists many students, each with
   its own UTR. Every row becomes a payment linked to the advice. */
CREATE TABLE finance.LoanAdvices (
    LoanAdviceId     BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LoanAdvices PRIMARY KEY,
    AdviceNumber     NVARCHAR(50) NOT NULL CONSTRAINT UQ_LoanAdvices_Number UNIQUE,
    LoanType         NVARCHAR(30) NOT NULL CONSTRAINT CK_LA_Type CHECK (LoanType IN (N'BSCC', N'BANK_LOAN', N'OTHER')),
    LenderName       NVARCHAR(200) NOT NULL,
    AdviceDate       DATE NOT NULL,                 -- date of the e-mail / letter
    SourceReference  NVARCHAR(300) NULL,            -- e-mail subject / sender / letter no.
    EntryCount       INT NOT NULL,
    TotalAmount      DECIMAL(18,2) NOT NULL CONSTRAINT CK_LA_Amount CHECK (TotalAmount >= 0),
    BankVerified     BIT NOT NULL CONSTRAINT DF_LA_Verified DEFAULT (0),   -- credits checked in bank statement
    BankVerifiedBy   BIGINT NULL CONSTRAINT FK_LA_VerifiedBy REFERENCES security.Users(UserId),
    BankVerifiedAt   DATETIME2(3) NULL,
    Remarks          NVARCHAR(1000) NULL,
    CreatedAt        DATETIME2(3) NOT NULL CONSTRAINT DF_LA_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy        BIGINT NOT NULL CONSTRAINT FK_LA_CreatedBy REFERENCES security.Users(UserId)
);

ALTER TABLE finance.Payments ADD
    LoanId         BIGINT NULL CONSTRAINT FK_Payments_Loan REFERENCES finance.StudentLoans(LoanId),
    LoanScheduleId BIGINT NULL CONSTRAINT FK_Payments_LoanSchedule REFERENCES finance.LoanSchedule(LoanScheduleId),
    LoanAdviceId   BIGINT NULL CONSTRAINT FK_Payments_LoanAdvice REFERENCES finance.LoanAdvices(LoanAdviceId);
GO
ALTER TABLE finance.Payments ADD CONSTRAINT CK_Payments_LoanSchedule CHECK (LoanScheduleId IS NULL OR LoanId IS NOT NULL);
CREATE INDEX IX_Payments_Loan ON finance.Payments(LoanId) WHERE LoanId IS NOT NULL;
GO

/* Loans, schedules and bulk receipts are never deleted either */
CREATE OR ALTER TRIGGER finance.TR_StudentLoans_NoDelete ON finance.StudentLoans INSTEAD OF DELETE AS
BEGIN SET NOCOUNT ON; IF EXISTS (SELECT 1 FROM deleted) THROW 50001, N'Loan records cannot be deleted. Set the status to Cancelled instead.', 1; END
GO
CREATE OR ALTER TRIGGER finance.TR_LoanSchedule_NoDelete ON finance.LoanSchedule INSTEAD OF DELETE AS
BEGIN SET NOCOUNT ON; IF EXISTS (SELECT 1 FROM deleted) THROW 50001, N'Loan schedule lines cannot be deleted. Deactivate the line instead.', 1; END
GO
CREATE OR ALTER TRIGGER finance.TR_LoanAdvices_NoDelete ON finance.LoanAdvices INSTEAD OF DELETE AS
BEGIN SET NOCOUNT ON; IF EXISTS (SELECT 1 FROM deleted) THROW 50001, N'Payment advices cannot be deleted.', 1; END
GO

/* Posted payments: the loan link is as immutable as the amount */
CREATE OR ALTER TRIGGER finance.TR_Payments_Immutable ON finance.Payments
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN deleted d ON d.PaymentId = i.PaymentId
        WHERE d.Status IN (N'POSTED', N'REVERSED', N'REJECTED', N'CANCELLED')
          AND (   i.Amount <> d.Amount
               OR i.StudentId <> d.StudentId
               OR i.AdmissionId <> d.AdmissionId
               OR i.PaymentDate <> d.PaymentDate
               OR i.PaymentModeId <> d.PaymentModeId
               OR ISNULL(i.ReceiptNumber, N'') <> ISNULL(d.ReceiptNumber, N'')
               OR ISNULL(i.TransactionReference, N'') <> ISNULL(d.TransactionReference, N'')
               OR ISNULL(i.LoanId, 0) <> ISNULL(d.LoanId, 0)
               OR ISNULL(i.LoanScheduleId, 0) <> ISNULL(d.LoanScheduleId, 0)))
        THROW 50004, N'A posted payment cannot be edited. Create a reversal instead.', 1;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN deleted d ON d.PaymentId = i.PaymentId
        WHERE i.Status <> d.Status
          AND NOT (
                (d.Status = N'DRAFT'            AND i.Status IN (N'PENDING_APPROVAL', N'POSTED', N'CANCELLED'))
             OR (d.Status = N'PENDING_APPROVAL' AND i.Status IN (N'APPROVED', N'POSTED', N'REJECTED', N'CANCELLED'))
             OR (d.Status = N'APPROVED'         AND i.Status IN (N'POSTED'))
             OR (d.Status = N'POSTED'           AND i.Status IN (N'REVERSED'))))
        THROW 50005, N'Invalid payment status transition.', 1;
END
GO

/* Money from a lender can never exceed what was sanctioned */
CREATE OR ALTER TRIGGER finance.TR_Payments_LoanLimit ON finance.Payments
AFTER INSERT, UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM (SELECT DISTINCT LoanId FROM inserted WHERE LoanId IS NOT NULL) x
        JOIN finance.StudentLoans l ON l.LoanId = x.LoanId
        CROSS APPLY (SELECT ISNULL(SUM(p.Amount), 0) AS Received FROM finance.Payments p
                     WHERE p.LoanId = x.LoanId AND p.Status IN (N'DRAFT', N'PENDING_APPROVAL', N'APPROVED', N'POSTED')) r
        WHERE r.Received > l.SanctionedAmount)
        THROW 50020, N'Amount received from the lender exceeds the sanctioned loan amount.', 1;
    IF EXISTS (
        SELECT 1 FROM inserted i JOIN finance.StudentLoans l ON l.LoanId = i.LoanId
        WHERE i.AdmissionId <> l.AdmissionId)
        THROW 50021, N'The loan belongs to a different admission.', 1;
END
GO

/* ---------------- views ------------------------------------------- */
CREATE OR ALTER VIEW reporting.vw_LoanScheduleStatus
AS
SELECT s.LoanScheduleId, s.LoanId, s.InstallmentNo, s.PeriodLabel, s.FeePeriodId, fp.PeriodName, s.ExpectedDate, s.FeeDescription,
       s.ExpectedAmount, s.ExpectedMode, s.BeneficiaryName, s.BeneficiaryAccountNo, s.IsActive,
       ISNULL(r.Received, 0) AS ReceivedAmount,
       ISNULL(r.InProcess, 0) AS InProcessAmount,
       CASE WHEN s.ExpectedAmount - ISNULL(r.Received, 0) > 0 THEN s.ExpectedAmount - ISNULL(r.Received, 0) ELSE 0 END AS PendingAmount,
       r.LastReceivedDate,
       CASE WHEN s.IsActive = 0 THEN N'INACTIVE'
            WHEN ISNULL(r.Received, 0) >= s.ExpectedAmount THEN N'RECEIVED'
            WHEN ISNULL(r.Received, 0) > 0 THEN N'PARTLY_RECEIVED'
            WHEN s.ExpectedDate < CAST(SYSDATETIME() AS DATE) THEN N'OVERDUE'
            ELSE N'EXPECTED' END AS InstallmentStatus
FROM finance.LoanSchedule s
LEFT JOIN academic.FeePeriods fp ON fp.FeePeriodId = s.FeePeriodId
OUTER APPLY (SELECT SUM(CASE WHEN p.Status = N'POSTED' THEN p.Amount ELSE 0 END) AS Received,
                    SUM(CASE WHEN p.Status IN (N'DRAFT', N'PENDING_APPROVAL', N'APPROVED') THEN p.Amount ELSE 0 END) AS InProcess,
                    MAX(CASE WHEN p.Status = N'POSTED' THEN p.PaymentDate END) AS LastReceivedDate
             FROM finance.Payments p WHERE p.LoanScheduleId = s.LoanScheduleId) r;
GO

CREATE OR ALTER VIEW reporting.vw_LoanSummary
AS
SELECT l.LoanId, l.LoanNumber, l.LoanType, l.LenderName, l.DrccDistrict, l.BranchName, l.RegistrationNumber, l.SanctionNumber,
       l.SanctionDate, l.SanctionedAmount, l.ContractSignedDate, l.Status, l.CoApplicantName, l.StudentIfsc, l.InstituteIfsc,
       l.InstituteAccountNo, l.Remarks, l.CreatedAt,
       l.StudentId, s.StudentCode, s.StudentName, s.FatherName, s.Mobile,
       l.AdmissionId, a.AdmissionNumber, a.AdmissionStatus, a.CourseId, co.CourseCode, a.BatchId, b.BatchCode,
       ISNULL(sc.Scheduled, 0) AS ScheduledAmount,
       ISNULL(rc.Received, 0) AS ReceivedAmount,
       ISNULL(rc.InProcess, 0) AS InProcessAmount,
       l.SanctionedAmount - ISNULL(rc.Received, 0) AS PendingAmount,
       ISNULL(ov.Overdue, 0) AS OverdueAmount,
       nx.NextExpectedDate, nx.NextExpectedAmount, nx.NextPeriodLabel,
       rc.LastReceivedDate
FROM finance.StudentLoans l
JOIN admission.Students s ON s.StudentId = l.StudentId
JOIN admission.Admissions a ON a.AdmissionId = l.AdmissionId
JOIN academic.Courses co ON co.CourseId = a.CourseId
JOIN academic.Batches b ON b.BatchId = a.BatchId
OUTER APPLY (SELECT SUM(x.ExpectedAmount) AS Scheduled FROM finance.LoanSchedule x WHERE x.LoanId = l.LoanId AND x.IsActive = 1) sc
OUTER APPLY (SELECT SUM(CASE WHEN p.Status = N'POSTED' THEN p.Amount ELSE 0 END) AS Received,
                    SUM(CASE WHEN p.Status IN (N'DRAFT', N'PENDING_APPROVAL', N'APPROVED') THEN p.Amount ELSE 0 END) AS InProcess,
                    MAX(CASE WHEN p.Status = N'POSTED' THEN p.PaymentDate END) AS LastReceivedDate
             FROM finance.Payments p WHERE p.LoanId = l.LoanId) rc
OUTER APPLY (SELECT SUM(v.PendingAmount) AS Overdue FROM reporting.vw_LoanScheduleStatus v
             WHERE v.LoanId = l.LoanId AND v.IsActive = 1 AND v.ExpectedDate < CAST(SYSDATETIME() AS DATE)) ov
OUTER APPLY (SELECT TOP 1 v.ExpectedDate AS NextExpectedDate, v.PendingAmount AS NextExpectedAmount, v.PeriodLabel AS NextPeriodLabel
             FROM reporting.vw_LoanScheduleStatus v
             WHERE v.LoanId = l.LoanId AND v.IsActive = 1 AND v.PendingAmount > 0
             ORDER BY v.ExpectedDate, v.InstallmentNo) nx;
GO

/* Ledger: loan money is shown as received from the lender, with its details */
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
SELECT c.AdmissionId, c.StudentId, r.ReversalDate, 15, N'CHARGE_REVERSAL', r.ReversalId,
       N'Charge reversed: ' + fh.FeeHeadName + N' - ' + r.Reason, NULL, c.FeeHeadId, c.FeePeriodId, c.AcademicYearId,
       -c.OriginalAmount, 0, 0, 0, 0, c.OriginalAmount, r.ApprovedAt
FROM finance.TransactionReversals r
JOIN finance.StudentCharges c ON r.OriginalTransactionType = N'CHARGE' AND c.ChargeId = r.OriginalTransactionId
JOIN finance.FeeHeads fh ON fh.FeeHeadId = c.FeeHeadId
WHERE r.Status = N'APPROVED'
UNION ALL
SELECT d.AdmissionId, d.StudentId, CAST(d.ApprovedAt AS DATE), 20, N'DISCOUNT', d.DiscountId,
       N'Discount on ' + fh.FeeHeadName + N' - ' + d.Reason, NULL, c.FeeHeadId, c.FeePeriodId, c.AcademicYearId,
       0, 0, -d.DiscountAmount, 0, 0, d.DiscountAmount, d.ApprovedAt
FROM finance.Discounts d
JOIN finance.StudentCharges c ON c.ChargeId = d.ChargeId
JOIN finance.FeeHeads fh ON fh.FeeHeadId = c.FeeHeadId
WHERE d.Status = N'APPROVED'
UNION ALL
SELECT w.AdmissionId, w.StudentId, CAST(w.ApprovedAt AS DATE), 25, N'WAIVER', w.AdjustmentId,
       N'Waiver on ' + fh.FeeHeadName + N' - ' + w.Reason, NULL, c.FeeHeadId, c.FeePeriodId, c.AcademicYearId,
       0, 0, -w.Amount, 0, 0, w.Amount, w.ApprovedAt
FROM finance.Adjustments w
JOIN finance.StudentCharges c ON c.ChargeId = w.ChargeId
JOIN finance.FeeHeads fh ON fh.FeeHeadId = c.FeeHeadId
WHERE w.Status = N'APPROVED'
UNION ALL
/* payments - from the student, or from a lender against the student's loan */
SELECT p.AdmissionId, p.StudentId, p.PaymentDate, 30,
       CASE WHEN p.LoanId IS NULL THEN N'PAYMENT' ELSE N'LOAN_RECEIPT' END, p.PaymentId,
       CASE WHEN p.LoanId IS NULL
            THEN N'Payment received (' + pm.PaymentModeName + ISNULL(N' ' + p.TransactionReference, N'') + N')'
            ELSE N'Loan disbursement received from ' + l.LenderName
                 + CASE l.LoanType WHEN N'BSCC' THEN N' - Bihar Student Credit Card' + ISNULL(N', DRCC ' + l.DrccDistrict, N'')
                                   WHEN N'BANK_LOAN' THEN N' - Education loan' + ISNULL(N', ' + l.BranchName, N'') ELSE N'' END
                 + ISNULL(N', Reg ' + l.RegistrationNumber, N'')
                 + ISNULL(N', ' + ls.PeriodLabel + N' instalment', N'')
                 + N' (' + pm.PaymentModeName + ISNULL(N' ' + p.TransactionReference, N'') + N')'
       END,
       p.ReceiptNumber, NULL, NULL, NULL,
       0, p.Amount, 0, 0, 0, p.Amount, p.PostedAt
FROM finance.Payments p
JOIN finance.PaymentModes pm ON pm.PaymentModeId = p.PaymentModeId
LEFT JOIN finance.StudentLoans l ON l.LoanId = p.LoanId
LEFT JOIN finance.LoanSchedule ls ON ls.LoanScheduleId = p.LoanScheduleId
WHERE p.Status IN (N'POSTED', N'REVERSED')
UNION ALL
SELECT p.AdmissionId, p.StudentId, r.ReversalDate, 35, N'PAYMENT_REVERSAL', r.ReversalId,
       CASE WHEN p.LoanId IS NULL THEN N'Payment reversed - ' ELSE N'Loan receipt reversed - ' END + r.Reason, p.ReceiptNumber, NULL, NULL, NULL,
       0, -p.Amount, 0, 0, p.Amount, 0, r.ApprovedAt
FROM finance.TransactionReversals r
JOIN finance.Payments p ON r.OriginalTransactionType = N'PAYMENT' AND p.PaymentId = r.OriginalTransactionId
WHERE r.Status = N'APPROVED'
UNION ALL
SELECT r.AdmissionId, r.StudentId, r.RefundDate, 40, N'REFUND', r.RefundId,
       N'Refund paid - ' + r.Reason, r.RefundNumber, NULL, NULL, NULL,
       0, 0, 0, r.PaidAmount, r.PaidAmount, 0, r.ProcessedAt
FROM finance.Refunds r
WHERE r.Status = N'PROCESSED'
UNION ALL
SELECT r.AdmissionId, r.StudentId, r.RefundDate, 45, N'REFUND_CREDIT', ra.RefundAllocationId,
       N'Fee credited on refund: ' + fh.FeeHeadName, r.RefundNumber, c.FeeHeadId, c.FeePeriodId, c.AcademicYearId,
       0, 0, -ra.Amount, 0, 0, ra.Amount, r.ProcessedAt
FROM finance.RefundAllocations ra
JOIN finance.Refunds r ON r.RefundId = ra.RefundId
JOIN finance.StudentCharges c ON c.ChargeId = ra.ChargeId
JOIN finance.FeeHeads fh ON fh.FeeHeadId = c.FeeHeadId
WHERE r.Status = N'PROCESSED';
GO
EXEC sp_refreshview N'reporting.vw_StudentLedger';
GO

/* Payment register: who paid (student or lender) */
CREATE OR ALTER VIEW reporting.vw_PaymentRegister
AS
SELECT p.PaymentId, p.ReceiptNumber, p.PaymentDate, p.Amount, p.Status, p.PaymentModeId, pm.PaymentModeCode, pm.PaymentModeName,
       pm.IsCash, p.TransactionReference, p.BankName, p.ChequeNumber, p.ChequeDate, p.ChequeStatus, p.Remarks,
       p.AdmissionId, a.AdmissionNumber, p.StudentId, s.StudentCode, s.StudentName, s.FatherName,
       a.CourseId, co.CourseCode, co.CourseName, a.BatchId, b.BatchCode, b.BatchName,
       p.SubmittedBy, u.FullName AS CashierName, p.ApprovedBy, p.PostedAt, p.CreatedAt,
       ISNULL(adv.OriginalAmount, 0) AS AdvanceAmount,
       CASE WHEN p.LoanId IS NULL THEN N'STUDENT' ELSE N'LOAN' END AS PaymentSource,
       p.LoanId, l.LoanNumber, l.LoanType, l.LenderName, l.DrccDistrict, l.RegistrationNumber AS LoanRegistrationNumber,
       p.LoanScheduleId, ls.PeriodLabel AS LoanPeriodLabel, p.LoanAdviceId
FROM finance.Payments p
JOIN finance.PaymentModes pm ON pm.PaymentModeId = p.PaymentModeId
JOIN admission.Admissions a ON a.AdmissionId = p.AdmissionId
JOIN admission.Students s ON s.StudentId = p.StudentId
JOIN academic.Courses co ON co.CourseId = a.CourseId
JOIN academic.Batches b ON b.BatchId = a.BatchId
JOIN security.Users u ON u.UserId = p.SubmittedBy
LEFT JOIN finance.Advances adv ON adv.PaymentId = p.PaymentId
LEFT JOIN finance.StudentLoans l ON l.LoanId = p.LoanId
LEFT JOIN finance.LoanSchedule ls ON ls.LoanScheduleId = p.LoanScheduleId;
GO

/* Fee summary: split what came from lenders vs the student/family */
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
      - ISNULL(pay.TotalPayments, 0) + ISNULL(rf.TotalRefunds, 0) - ISNULL(rc.RefundCredits, 0) AS Balance,
    ISNULL(pay.LoanPayments, 0) AS LoanReceived,
    ISNULL(pay.TotalPayments, 0) - ISNULL(pay.LoanPayments, 0) AS StudentPaid,
    ISNULL(ln.Sanctioned, 0) AS LoanSanctioned,
    ISNULL(ln.Sanctioned, 0) - ISNULL(ln.Received, 0) AS LoanPending
FROM admission.Admissions a
JOIN admission.Students s ON s.StudentId = a.StudentId
JOIN academic.Courses co ON co.CourseId = a.CourseId
JOIN academic.Batches b ON b.BatchId = a.BatchId
OUTER APPLY (SELECT SUM(CASE WHEN x.ChargeStatus = N'ACTIVE' THEN x.OriginalAmount ELSE 0 END) AS TotalCharges,
                    SUM(CASE WHEN x.ChargeStatus = N'ACTIVE' THEN x.DiscountAmount ELSE 0 END) AS TotalDiscounts,
                    SUM(CASE WHEN x.ChargeStatus = N'ACTIVE' THEN x.WaivedAmount ELSE 0 END) AS TotalWaivers,
                    SUM(x.DueAmount) AS Outstanding
             FROM reporting.vw_ChargeBalances x WHERE x.AdmissionId = a.AdmissionId) ch
OUTER APPLY (SELECT SUM(p.Amount) AS TotalPayments, SUM(CASE WHEN p.LoanId IS NOT NULL THEN p.Amount ELSE 0 END) AS LoanPayments
             FROM finance.Payments p WHERE p.AdmissionId = a.AdmissionId AND p.Status = N'POSTED') pay
OUTER APPLY (SELECT SUM(r.PaidAmount) AS TotalRefunds FROM finance.Refunds r
             WHERE r.AdmissionId = a.AdmissionId AND r.Status = N'PROCESSED') rf
OUTER APPLY (SELECT SUM(x.Amount) AS RefundCredits FROM finance.RefundAllocations x
             JOIN finance.Refunds r ON r.RefundId = x.RefundId
             WHERE r.AdmissionId = a.AdmissionId AND r.Status = N'PROCESSED' AND x.ChargeId IS NOT NULL) rc
OUTER APPLY (SELECT SUM(x.AvailableAmount) AS AdvanceAvailable FROM reporting.vw_AdvanceBalances x
             WHERE x.AdmissionId = a.AdmissionId) adv
OUTER APPLY (SELECT SUM(ls.SanctionedAmount) AS Sanctioned, SUM(ls.ReceivedAmount) AS Received FROM reporting.vw_LoanSummary ls
             WHERE ls.AdmissionId = a.AdmissionId AND ls.Status NOT IN (N'CANCELLED', N'REJECTED')) ln;
GO
EXEC sp_refreshview N'reporting.vw_StudentOutstanding';
GO

/* ---------------- numbering, permissions, lookups ------------------ */
INSERT INTO dbo.DocumentTypes (DocumentType, Prefix, Separator, IncludeYear, NumberWidth) VALUES
 (N'LOAN', N'AHS-LN-', N'-', 0, 6),
 (N'LOAN_ADVICE', N'AHS-LA-', N'-', 1, 5);
INSERT INTO dbo.DocumentSequences (DocumentType, FinancialYear, Prefix, LastNumber) VALUES (N'LOAN', 0, N'AHS-LN-', 0);

INSERT INTO security.Permissions (PermissionCode, PermissionName, ModuleName) VALUES
 (N'LOAN_VIEW',    N'View student loans (BSCC / bank)',                    N'Loans'),
 (N'LOAN_MANAGE',  N'Record loan sanctions and disbursement schedules',    N'Loans'),
 (N'LOAN_RECEIVE', N'Record money received from BSEFCL / DRCC / banks',    N'Loans');

INSERT INTO security.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId FROM security.Roles r JOIN security.Permissions p
  ON (r.RoleCode = N'ADMIN' AND p.PermissionCode IN (N'LOAN_VIEW', N'LOAN_MANAGE', N'LOAN_RECEIVE'))
  OR (r.RoleCode = N'ACCOUNTANT' AND p.PermissionCode IN (N'LOAN_VIEW', N'LOAN_MANAGE', N'LOAN_RECEIVE'))
  OR (r.RoleCode = N'CASHIER' AND p.PermissionCode IN (N'LOAN_VIEW'))
  OR (r.RoleCode IN (N'PRINCIPAL', N'MD', N'AUDITOR') AND p.PermissionCode IN (N'LOAN_VIEW'));

INSERT INTO dbo.StatusTypes (Category, StatusCode, StatusName, SortOrder) VALUES
 (N'LOAN', N'APPLIED', N'Applied', 1), (N'LOAN', N'SANCTIONED', N'Sanctioned', 2), (N'LOAN', N'DISBURSING', N'Disbursing', 3),
 (N'LOAN', N'FULLY_DISBURSED', N'Fully disbursed', 4), (N'LOAN', N'CLOSED', N'Closed', 5), (N'LOAN', N'CANCELLED', N'Cancelled', 6),
 (N'LOAN', N'REJECTED', N'Rejected', 7);

INSERT INTO dbo.SystemSettings (SettingKey, SettingValue, Description) VALUES
 (N'DefaultLoanLender', N'BSEFCL (Bihar State Education Finance Corporation Ltd.)', N'Lender pre-filled for Bihar Student Credit Card loans'),
 (N'InstituteIfsc', N'', N'College bank IFSC printed on sanction letters (pre-filled on new loans)'),
 (N'InstituteAccountNo', N'', N'College beneficiary account number on sanction letters (pre-filled on new loans)');
GO
