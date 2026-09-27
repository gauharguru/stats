import { Router } from 'express';
import { db, withTx } from '../db';
import { auditCtx } from '../lib/audit';
import { badRequest, notFound } from '../lib/errors';
import { sendRows } from '../lib/export';
import { parseAdviceText, pdfToText } from '../lib/loanAdvice';
import { getSetting } from '../lib/settings';
import { amount, date, id, nonNegAmount, optDate, optId, optStr, parse, q, qDate, qNum, str, z } from '../lib/validate';
import { requirePerm } from '../middleware/auth';
import { createLoan, importAdvice, LOAN_TYPES, matchAdviceRows, receiveLoanAmount, setAdviceVerified, updateLoan } from '../services/loans';

export const loansRouter = Router();
const ctxOf = (req: any) => ({ ...auditCtx(req), userId: req.user.userId as number });
const view = requirePerm('LOAN_VIEW');
const manage = requirePerm('LOAN_MANAGE');
const receive = requirePerm('LOAN_RECEIVE');

const scheduleLine = z.object({
  loanScheduleId: optId,
  periodLabel: str(50),
  feePeriodId: optId,
  expectedDate: optDate,
  feeDescription: optStr(250),
  expectedAmount: nonNegAmount,
  expectedMode: optStr(30),
  beneficiaryName: optStr(200),
  beneficiaryAccountNo: optStr(50),
});
const loanFields = {
  loanType: z.enum(LOAN_TYPES),
  lenderName: str(200),
  drccDistrict: optStr(100),
  branchName: optStr(200),
  registrationNumber: optStr(50),
  sanctionNumber: optStr(100),
  sanctionDate: optDate,
  sanctionedAmount: nonNegAmount,
  applicantName: optStr(200),
  coApplicantName: optStr(200),
  applicantAddress: optStr(500),
  courseOnLetter: optStr(150),
  studentIfsc: optStr(20),
  instituteIfsc: optStr(20),
  instituteAccountNo: optStr(50),
  contractSignedDate: optDate,
  status: z.enum(['APPLIED', 'SANCTIONED', 'DISBURSING', 'FULLY_DISBURSED', 'CLOSED', 'CANCELLED', 'REJECTED']).optional(),
  remarks: optStr(1000),
  schedule: z.array(scheduleLine).optional(),
};

/* ---------------- lists & reports ---------------------------------- */
loansRouter.get('/', view, async (req, res) => {
  const d = await db();
  const term = q(req, 'q');
  const rows = await d.query(
    `SELECT TOP (@top) * FROM reporting.vw_LoanSummary
     WHERE (@type IS NULL OR LoanType = @type) AND (@status IS NULL OR Status = @status)
       AND (@course IS NULL OR CourseId = @course) AND (@batch IS NULL OR BatchId = @batch)
       AND (@district IS NULL OR DrccDistrict = @district)
       AND (@pending = 0 OR PendingAmount > 0) AND (@overdue = 0 OR OverdueAmount > 0)
       AND (@q IS NULL OR StudentName LIKE @like OR RegistrationNumber LIKE @like OR LoanNumber LIKE @like OR AdmissionNumber LIKE @like
            OR SanctionNumber LIKE @like)
     ORDER BY StudentName`,
    {
      top: Math.min(qNum(req, 'top') ?? 2000, 20000),
      type: q(req, 'type') ?? null,
      status: q(req, 'status') ?? null,
      course: qNum(req, 'courseId') ?? null,
      batch: qNum(req, 'batchId') ?? null,
      district: q(req, 'district') ?? null,
      pending: q(req, 'pending') === 'true' ? 1 : 0,
      overdue: q(req, 'overdue') === 'true' ? 1 : 0,
      q: term ?? null,
      like: term ? `%${term}%` : null,
    },
  );
  const totals = rows.reduce(
    (t, r) => ({ sanctioned: t.sanctioned + r.SanctionedAmount, received: t.received + r.ReceivedAmount, pending: t.pending + r.PendingAmount, overdue: t.overdue + r.OverdueAmount }),
    { sanctioned: 0, received: 0, pending: 0, overdue: 0 },
  );
  sendRows(req, res, rows, 'student-loans', { totals });
});

/* Lender / DRCC-wise totals */
loansRouter.get('/summary', view, async (_req, res) => {
  const d = await db();
  const [byLender, totals] = await d.queryMulti(`
    SELECT LoanType, LenderName, ISNULL(DrccDistrict, BranchName) AS Office, COUNT(*) AS Loans,
           SUM(SanctionedAmount) AS Sanctioned, SUM(ReceivedAmount) AS Received, SUM(PendingAmount) AS Pending, SUM(OverdueAmount) AS Overdue
    FROM reporting.vw_LoanSummary WHERE Status NOT IN (N'CANCELLED', N'REJECTED')
    GROUP BY LoanType, LenderName, ISNULL(DrccDistrict, BranchName) ORDER BY LoanType, LenderName, Office;
    SELECT COUNT(*) AS Loans, ISNULL(SUM(SanctionedAmount), 0) AS Sanctioned, ISNULL(SUM(ReceivedAmount), 0) AS Received,
           ISNULL(SUM(PendingAmount), 0) AS Pending, ISNULL(SUM(OverdueAmount), 0) AS Overdue
    FROM reporting.vw_LoanSummary WHERE Status NOT IN (N'CANCELLED', N'REJECTED');`);
  res.json({ byLender, totals: totals[0] });
});

/* Instalments expected from lenders in a period (and overdue ones) */
loansRouter.get('/expected', view, async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT v.*, l.LoanNumber, l.LoanType, l.LenderName, l.DrccDistrict, l.RegistrationNumber, l.StudentName, l.AdmissionNumber,
            l.AdmissionId, l.CourseCode, l.BatchCode, l.Status AS LoanStatus
     FROM reporting.vw_LoanScheduleStatus v JOIN reporting.vw_LoanSummary l ON l.LoanId = v.LoanId
     WHERE v.IsActive = 1 AND v.PendingAmount > 0 AND l.Status NOT IN (N'CANCELLED', N'REJECTED', N'CLOSED')
       AND (@from IS NULL OR v.ExpectedDate >= @from) AND (@to IS NULL OR v.ExpectedDate <= @to)
       AND (@overdue = 0 OR v.InstallmentStatus = N'OVERDUE')
       AND (@type IS NULL OR l.LoanType = @type) AND (@district IS NULL OR l.DrccDistrict = @district)
     ORDER BY v.ExpectedDate, l.StudentName`,
    {
      from: qDate(req, 'from') ?? null,
      to: qDate(req, 'to') ?? null,
      overdue: q(req, 'overdue') === 'true' ? 1 : 0,
      type: q(req, 'type') ?? null,
      district: q(req, 'district') ?? null,
    },
  );
  sendRows(req, res, rows, 'loan-instalments-expected', { total: rows.reduce((t, r) => t + r.PendingAmount, 0) });
});

loansRouter.get('/defaults', view, async (_req, res) => {
  const d = await db();
  const districts = await d.query(`SELECT DISTINCT DrccDistrict FROM finance.StudentLoans WHERE DrccDistrict IS NOT NULL ORDER BY DrccDistrict`);
  const lenders = await d.query(`SELECT DISTINCT LenderName FROM finance.StudentLoans ORDER BY LenderName`);
  res.json({
    bsccLender: await getSetting(d, 'DefaultLoanLender', 'BSEFCL (Bihar State Education Finance Corporation Ltd.)'),
    instituteIfsc: await getSetting(d, 'InstituteIfsc', ''),
    instituteAccountNo: await getSetting(d, 'InstituteAccountNo', ''),
    collegeName: await getSetting(d, 'CollegeName', ''),
    districts: districts.map((x) => x.DrccDistrict),
    lenders: lenders.map((x) => x.LenderName),
  });
});

loansRouter.get('/admission/:admissionId', view, async (req, res) => {
  const d = await db();
  const aid = parse(id, req.params.admissionId);
  const loans = await d.query('SELECT * FROM reporting.vw_LoanSummary WHERE AdmissionId = @id ORDER BY LoanId', { id: aid });
  const schedule = loans.length
    ? await d.query(
        `SELECT * FROM reporting.vw_LoanScheduleStatus WHERE LoanId IN (SELECT LoanId FROM finance.StudentLoans WHERE AdmissionId = @id)
         AND IsActive = 1 ORDER BY LoanId, InstallmentNo`,
        { id: aid },
      )
    : [];
  res.json({ rows: loans, schedule });
});

/* ---------------- payment advices ---------------------------------- */
loansRouter.post('/advices/parse', receive, async (req, res) => {
  const b = parse(z.object({ text: z.string().max(2_000_000).optional(), pdfBase64: z.string().max(12_000_000).optional() }), req.body);
  let text = b.text ?? '';
  if (b.pdfBase64) {
    try {
      text = await pdfToText(new Uint8Array(Buffer.from(b.pdfBase64, 'base64')));
    } catch {
      throw badRequest('Could not read the PDF. Save the e-mail with "Print > Save as PDF" and try again, or paste the table instead.');
    }
  }
  if (!text.trim()) throw badRequest('Paste the table from the e-mail or upload the PDF.');
  const rows = parseAdviceText(text);
  if (!rows.length)
    throw badRequest('No payment rows were found. The table needs Amount, Date, UTR, IFSC and Registration Id columns.', 'ADVICE_EMPTY');
  const d = await db();
  const matched = await matchAdviceRows(d, rows);
  res.json({ rows: matched, total: rows.reduce((t, r) => t + r.amount, 0) });
});

loansRouter.post('/advices', receive, async (req, res) => {
  const b = parse(
    z.object({
      loanType: z.enum(LOAN_TYPES),
      lenderName: str(200),
      adviceDate: date,
      sourceReference: optStr(300),
      paymentModeId: id,
      remarks: optStr(1000),
      rows: z
        .array(
          z.object({
            registrationNumber: str(50),
            applicantName: optStr(200),
            course: optStr(150),
            amount,
            paymentDate: date,
            utr: str(150),
            ifsc: optStr(20),
            accountNo: optStr(50),
            loanId: optId,
            admissionId: optId,
          }),
        )
        .min(1)
        .max(500),
    }),
    req.body,
  );
  res.status(201).json(await withTx((d) => importAdvice(d, ctxOf(req), b)));
});

loansRouter.get('/advices/list', view, async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT TOP (@top) a.*, u.FullName AS CreatedByName, v.FullName AS VerifiedByName,
            (SELECT ISNULL(SUM(p.Amount), 0) FROM finance.Payments p WHERE p.LoanAdviceId = a.LoanAdviceId AND p.Status = N'POSTED') AS PostedAmount
     FROM finance.LoanAdvices a JOIN security.Users u ON u.UserId = a.CreatedBy LEFT JOIN security.Users v ON v.UserId = a.BankVerifiedBy
     ORDER BY a.LoanAdviceId DESC`,
    { top: Math.min(qNum(req, 'top') ?? 500, 5000) },
  );
  sendRows(req, res, rows, 'loan-advices');
});

loansRouter.get('/advices/:id', view, async (req, res) => {
  const d = await db();
  const aid = parse(id, req.params.id);
  const advice = await d.one(
    `SELECT a.*, u.FullName AS CreatedByName, v.FullName AS VerifiedByName FROM finance.LoanAdvices a
     JOIN security.Users u ON u.UserId = a.CreatedBy LEFT JOIN security.Users v ON v.UserId = a.BankVerifiedBy WHERE a.LoanAdviceId = @id`,
    { id: aid },
  );
  if (!advice) throw notFound('Payment advice');
  const payments = await d.query('SELECT * FROM reporting.vw_PaymentRegister WHERE LoanAdviceId = @id ORDER BY PaymentId', { id: aid });
  res.json({ advice, payments });
});

loansRouter.post('/advices/:id/verify', receive, async (req, res) => {
  const b = parse(z.object({ verified: z.boolean(), remarks: optStr(1000) }), req.body);
  await withTx((d) => setAdviceVerified(d, ctxOf(req), parse(id, req.params.id), b.verified, b.remarks));
  res.json({ ok: true });
});

/* ---------------- single loan -------------------------------------- */
loansRouter.post('/', manage, async (req, res) => {
  const b = parse(z.object({ admissionId: id, ...loanFields }), req.body);
  res.status(201).json(await withTx((d) => createLoan(d, ctxOf(req), b as any)));
});

loansRouter.get('/:id', view, async (req, res) => {
  const d = await db();
  const lid = parse(id, req.params.id);
  const loan = await d.one('SELECT * FROM reporting.vw_LoanSummary WHERE LoanId = @id', { id: lid });
  if (!loan) throw notFound('Loan');
  const [detail, schedule, receipts] = await Promise.all([
    d.one('SELECT ApplicantName, ApplicantAddress, CourseOnLetter, UpdatedAt FROM finance.StudentLoans WHERE LoanId = @id', { id: lid }),
    d.query('SELECT * FROM reporting.vw_LoanScheduleStatus WHERE LoanId = @id ORDER BY IsActive DESC, InstallmentNo', { id: lid }),
    d.query(
      `SELECT r.*, a.AdviceNumber FROM reporting.vw_PaymentRegister r LEFT JOIN finance.LoanAdvices a ON a.LoanAdviceId = r.LoanAdviceId
       WHERE r.LoanId = @id ORDER BY r.PaymentDate, r.PaymentId`,
      { id: lid },
    ),
  ]);
  res.json({ loan: { ...loan, ...detail }, schedule, receipts });
});

loansRouter.put('/:id', manage, async (req, res) => {
  const b = parse(z.object(loanFields).partial(), req.body);
  await withTx((d) => updateLoan(d, ctxOf(req), parse(id, req.params.id), b as any));
  res.json({ ok: true });
});

loansRouter.post('/:id/receive', receive, async (req, res) => {
  const b = parse(
    z.object({
      loanScheduleId: optId,
      amount,
      paymentDate: optDate,
      paymentModeId: id,
      transactionReference: optStr(150),
      bankName: optStr(150),
      remarks: optStr(500),
      confirmDuplicateReference: z.boolean().optional(),
    }),
    req.body,
  );
  const out = await withTx((d) => receiveLoanAmount(d, ctxOf(req), { loanId: parse(id, req.params.id), ...b }));
  const d = await db();
  const p = await d.one('SELECT ReceiptNumber FROM finance.Payments WHERE PaymentId = @id', { id: out.paymentId });
  res.status(201).json({ ...out, receiptNumber: p.ReceiptNumber });
});
