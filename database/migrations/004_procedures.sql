/* =====================================================================
   004 - Stored procedures
   ===================================================================== */

/* Concurrency-safe document numbering.
   Never use MAX(ReceiptNumber) + 1: two cashiers could get the same number.
   UPDLOCK + HOLDLOCK serialises callers on the sequence row, and because
   the caller's transaction owns the lock, a rolled back transaction also
   rolls back the increment (numbers stay gap-free and are never reused). */
CREATE OR ALTER PROCEDURE dbo.usp_NextDocumentNumber
    @DocumentType NVARCHAR(50),
    @BusinessDate DATE,
    @DocumentNumber NVARCHAR(50) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Prefix NVARCHAR(30), @Sep NVARCHAR(5), @IncludeYear BIT, @Width INT;
    SELECT @Prefix = Prefix, @Sep = Separator, @IncludeYear = IncludeYear, @Width = NumberWidth
    FROM dbo.DocumentTypes WHERE DocumentType = @DocumentType;

    IF @Prefix IS NULL
        THROW 50100, N'Unknown document type.', 1;

    /* Indian financial year: April - March. FY 2026-27 is stored as 2026. */
    DECLARE @Year INT = CASE WHEN @IncludeYear = 1
                             THEN CASE WHEN MONTH(@BusinessDate) >= 4 THEN YEAR(@BusinessDate) ELSE YEAR(@BusinessDate) - 1 END
                             ELSE 0 END;
    DECLARE @Next BIGINT;

    BEGIN TRANSACTION;

    UPDATE dbo.DocumentSequences WITH (UPDLOCK, HOLDLOCK)
       SET @Next = LastNumber = LastNumber + 1,
           UpdatedAt = SYSUTCDATETIME()
     WHERE DocumentType = @DocumentType AND FinancialYear = @Year;

    IF @@ROWCOUNT = 0
    BEGIN
        INSERT INTO dbo.DocumentSequences (DocumentType, FinancialYear, Prefix, LastNumber)
        VALUES (@DocumentType, @Year, @Prefix, 1);
        SET @Next = 1;
    END

    COMMIT TRANSACTION;

    SET @DocumentNumber = @Prefix
        + CASE WHEN @IncludeYear = 1 THEN CAST(@Year AS NVARCHAR(4)) + @Sep ELSE N'' END
        + RIGHT(REPLICATE(N'0', @Width) + CAST(@Next AS NVARCHAR(20)), CASE WHEN LEN(CAST(@Next AS NVARCHAR(20))) > @Width
                                                                           THEN LEN(CAST(@Next AS NVARCHAR(20))) ELSE @Width END);
END
GO

/* Student balance as a single row (used by the API and for ad-hoc checks). */
CREATE OR ALTER PROCEDURE reporting.usp_GetStudentBalance
    @AdmissionId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM reporting.vw_StudentFeeSummary WHERE AdmissionId = @AdmissionId;
END
GO

/* Consistency check: the stored transactions must always reconcile.
   Returns one row per admission where they do not (should return nothing). */
CREATE OR ALTER PROCEDURE reporting.usp_ReconcileStudentBalances
AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.AdmissionId, s.AdmissionNumber, s.Balance, s.Outstanding, s.AdvanceAvailable,
           l.LedgerBalance
    FROM reporting.vw_StudentFeeSummary s
    OUTER APPLY (SELECT SUM(e.Debit - e.Credit) AS LedgerBalance
                 FROM reporting.vw_StudentLedgerEntries e WHERE e.AdmissionId = s.AdmissionId) l
    WHERE s.Balance <> s.Outstanding - s.AdvanceAvailable
       OR s.Balance <> ISNULL(l.LedgerBalance, 0);
END
GO
