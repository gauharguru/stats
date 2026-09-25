/* =====================================================================
   002 - Server-side financial integrity
   * Financial transaction tables can never be physically deleted.
   * Posted money movements cannot be silently edited.
   * Allocations can never exceed the payment / advance / charge.
   These rules hold even if someone bypasses the application.
   ===================================================================== */

/* ---------- 1. No DELETE on financial / audit tables ------------------ */
DECLARE @tables TABLE (SchemaName SYSNAME, TableName SYSNAME);
INSERT INTO @tables VALUES
 (N'finance', N'StudentCharges'), (N'finance', N'Payments'), (N'finance', N'PaymentAllocations'),
 (N'finance', N'Advances'), (N'finance', N'AdvanceAllocations'), (N'finance', N'Discounts'),
 (N'finance', N'Refunds'), (N'finance', N'RefundAllocations'), (N'finance', N'Adjustments'),
 (N'finance', N'TransactionReversals'), (N'finance', N'Receipts'), (N'finance', N'CashierDayClosings'),
 (N'consultant', N'Payables'), (N'consultant', N'Payments'), (N'consultant', N'Recoveries'),
 (N'workflow', N'ApprovalRequests'), (N'workflow', N'ApprovalActions'),
 (N'admission', N'Admissions'), (N'admission', N'Students'), (N'admission', N'AdmissionSeatHistory'),
 (N'audit', N'AuditLogs');

DECLARE @s SYSNAME, @t SYSNAME, @sql NVARCHAR(MAX);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT SchemaName, TableName FROM @tables;
OPEN c;
FETCH NEXT FROM c INTO @s, @t;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @sql = N'CREATE OR ALTER TRIGGER ' + QUOTENAME(@s) + N'.' + QUOTENAME(N'TR_' + @t + N'_NoDelete') +
               N' ON ' + QUOTENAME(@s) + N'.' + QUOTENAME(@t) + N' INSTEAD OF DELETE AS ' +
               N'BEGIN SET NOCOUNT ON; IF EXISTS (SELECT 1 FROM deleted) ' +
               N'THROW 50001, N''Records in ' + @s + N'.' + @t + N' cannot be deleted. Use cancel / reverse / reject instead.'', 1; END';
    EXEC sp_executesql @sql;
    FETCH NEXT FROM c INTO @s, @t;
END
CLOSE c;
DEALLOCATE c;
GO

/* ---------- 2. Audit log is append-only ------------------------------- */
CREATE OR ALTER TRIGGER audit.TR_AuditLogs_NoUpdate ON audit.AuditLogs
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted)
        THROW 50002, N'Audit log entries are immutable.', 1;
END
GO

/* ---------- 3. Allocation rows are immutable -------------------------- */
CREATE OR ALTER TRIGGER finance.TR_PaymentAllocations_NoUpdate ON finance.PaymentAllocations
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted)
        THROW 50003, N'Payment allocations are immutable. Reverse the payment instead.', 1;
END
GO
CREATE OR ALTER TRIGGER finance.TR_AdvanceAllocations_NoUpdate ON finance.AdvanceAllocations
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted)
        THROW 50003, N'Advance allocations are immutable.', 1;
END
GO
CREATE OR ALTER TRIGGER finance.TR_RefundAllocations_NoUpdate ON finance.RefundAllocations
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted)
        THROW 50003, N'Refund allocations are immutable.', 1;
END
GO

/* ---------- 4. Posted payments cannot be edited ----------------------- */
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
               OR ISNULL(i.TransactionReference, N'') <> ISNULL(d.TransactionReference, N'')))
        THROW 50004, N'A posted payment cannot be edited. Create a reversal instead.', 1;

    /* Allowed status transitions once a payment has left DRAFT */
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

/* ---------- 5. Charges: amounts are fixed once created ---------------- */
CREATE OR ALTER TRIGGER finance.TR_StudentCharges_Immutable ON finance.StudentCharges
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted i JOIN deleted d ON d.ChargeId = i.ChargeId
        WHERE i.OriginalAmount <> d.OriginalAmount
           OR i.AdmissionId <> d.AdmissionId
           OR i.StudentId <> d.StudentId
           OR i.FeeHeadId <> d.FeeHeadId
           OR (d.ChargeStatus = N'CANCELLED' AND i.ChargeStatus <> N'CANCELLED'))
        THROW 50006, N'A charge cannot be edited. Use a discount, waiver or charge reversal.', 1;
END
GO

/* ---------- 6. Allocation limits -------------------------------------- */
/* Payment: SUM(allocations) + advance <= payment amount */
CREATE OR ALTER TRIGGER finance.TR_PaymentAllocations_Limit ON finance.PaymentAllocations
AFTER INSERT AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM (SELECT DISTINCT PaymentId FROM inserted) x
        JOIN finance.Payments p ON p.PaymentId = x.PaymentId
        CROSS APPLY (SELECT ISNULL(SUM(AllocatedAmount), 0) AS Alloc FROM finance.PaymentAllocations WHERE PaymentId = x.PaymentId) a
        CROSS APPLY (SELECT ISNULL(SUM(OriginalAmount), 0) AS Adv FROM finance.Advances WHERE PaymentId = x.PaymentId) v
        WHERE a.Alloc + v.Adv > p.Amount)
        THROW 50010, N'Allocation exceeds payment amount.', 1;

    IF EXISTS (
        SELECT 1 FROM inserted i JOIN finance.Payments p ON p.PaymentId = i.PaymentId
        JOIN finance.StudentCharges c ON c.ChargeId = i.ChargeId
        WHERE c.AdmissionId <> p.AdmissionId OR c.ChargeStatus <> N'ACTIVE')
        THROW 50011, N'A payment can only be allocated to active charges of the same admission.', 1;
END
GO

CREATE OR ALTER TRIGGER finance.TR_Advances_Limit ON finance.Advances
AFTER INSERT, UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM (SELECT DISTINCT PaymentId FROM inserted) x
        JOIN finance.Payments p ON p.PaymentId = x.PaymentId
        CROSS APPLY (SELECT ISNULL(SUM(AllocatedAmount), 0) AS Alloc FROM finance.PaymentAllocations WHERE PaymentId = x.PaymentId) a
        CROSS APPLY (SELECT ISNULL(SUM(OriginalAmount), 0) AS Adv FROM finance.Advances WHERE PaymentId = x.PaymentId) v
        WHERE a.Alloc + v.Adv > p.Amount)
        THROW 50010, N'Advance plus allocations exceed payment amount.', 1;
END
GO

/* Advance: SUM(advance allocations + refunds of the advance) <= advance */
CREATE OR ALTER TRIGGER finance.TR_AdvanceAllocations_Limit ON finance.AdvanceAllocations
AFTER INSERT AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM (SELECT DISTINCT AdvanceId FROM inserted) x
        JOIN finance.Advances v ON v.AdvanceId = x.AdvanceId
        CROSS APPLY (SELECT ISNULL(SUM(Amount), 0) AS Used FROM finance.AdvanceAllocations WHERE AdvanceId = x.AdvanceId) aa
        CROSS APPLY (SELECT ISNULL(SUM(ra.Amount), 0) AS Refunded FROM finance.RefundAllocations ra WHERE ra.AdvanceId = x.AdvanceId) r
        WHERE aa.Used + r.Refunded > v.OriginalAmount OR v.Status = N'REVERSED')
        THROW 50012, N'Advance allocation exceeds the available advance.', 1;

    IF EXISTS (
        SELECT 1 FROM inserted i JOIN finance.Advances v ON v.AdvanceId = i.AdvanceId
        JOIN finance.StudentCharges c ON c.ChargeId = i.ChargeId
        WHERE c.AdmissionId <> v.AdmissionId OR c.ChargeStatus <> N'ACTIVE')
        THROW 50011, N'An advance can only be applied to active charges of the same admission.', 1;
END
GO
