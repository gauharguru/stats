import { Router } from 'express';
import { db, withTx } from '../db';
import { auditCtx } from '../lib/audit';
import { amountInWords } from '../lib/money';
import { getAllSettings } from '../lib/settings';
import { forbidden, notFound } from '../lib/errors';
import { sendRows } from '../lib/export';
import { amount, id, optDate, optId, optStr, parse, q, qDate, qNum, str, z } from '../lib/validate';
import { can, requirePerm } from '../middleware/auth';
import { cancelAdmission, createAdmission } from '../services/admissions';
import { setConsultantReview } from '../services/consultant';
import { addManualCharge, applyAdvance, generateCharges } from '../services/finance';
import { studentSchema } from './students';

export const admissionsRouter = Router();
const ctxOf = (req: any) => ({ ...auditCtx(req), userId: req.user.userId as number });

admissionsRouter.get('/', requirePerm('ADMISSION_VIEW'), async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT TOP (@top) a.AdmissionId, a.AdmissionNumber, a.AdmissionDate, a.AdmissionStatus, a.AdmissionSourceType, a.CancellationDate,
            a.CancellationReason, a.ConsultantReviewStatus, a.ReplacesAdmissionId, s.StudentId, s.StudentCode, s.StudentName, s.FatherName,
            s.Mobile, c.CourseCode, b.BatchCode, se.SeatNumber, CASE WHEN @cv = 1 THEN co.ConsultantName END AS ConsultantName,
            sm.NetCharges, sm.TotalPayments, sm.Outstanding
     FROM admission.Admissions a
     JOIN admission.Students s ON s.StudentId = a.StudentId
     JOIN academic.Courses c ON c.CourseId = a.CourseId
     JOIN academic.Batches b ON b.BatchId = a.BatchId
     LEFT JOIN admission.Seats se ON se.SeatId = a.SeatId
     LEFT JOIN consultant.Consultants co ON co.ConsultantId = a.ConsultantId
     JOIN reporting.vw_StudentFeeSummary sm ON sm.AdmissionId = a.AdmissionId
     WHERE (@course IS NULL OR a.CourseId = @course) AND (@batch IS NULL OR a.BatchId = @batch)
       AND (@status IS NULL OR a.AdmissionStatus = @status) AND (@source IS NULL OR a.AdmissionSourceType = @source)
       AND (@consultant IS NULL OR a.ConsultantId = @consultant)
       AND (@from IS NULL OR a.AdmissionDate >= @from) AND (@to IS NULL OR a.AdmissionDate <= @to)
       AND (@replacement IS NULL OR (@replacement = 1 AND a.ReplacesAdmissionId IS NOT NULL))
       AND (@q IS NULL OR s.StudentName LIKE @like OR a.AdmissionNumber LIKE @like OR s.StudentCode LIKE @like)
     ORDER BY a.AdmissionId DESC`,
    {
      top: Math.min(qNum(req, 'top') ?? 500, 5000),
      cv: can(req, 'CONSULTANT_VIEW') ? 1 : 0,
      course: qNum(req, 'courseId') ?? null,
      batch: qNum(req, 'batchId') ?? null,
      status: q(req, 'status') ?? null,
      source: q(req, 'source') ?? null,
      consultant: qNum(req, 'consultantId') ?? null,
      from: qDate(req, 'from') ?? null,
      to: qDate(req, 'to') ?? null,
      replacement: q(req, 'replacement') === 'true' ? 1 : null,
      q: q(req, 'q') ?? null,
      like: q(req, 'q') ? `%${q(req, 'q')}%` : null,
    },
  );
  sendRows(req, res, rows, 'admissions');
});

admissionsRouter.post('/', requirePerm('ADMISSION_CREATE'), async (req, res) => {
  const b = parse(
    z.object({
      studentId: optId,
      student: studentSchema.nullish(),
      courseId: id,
      batchId: id,
      admissionDate: optDate,
      admissionSourceType: z.enum(['DIRECT', 'CONSULTANT', 'REFERRAL', 'OTHER']),
      consultantId: optId,
      referralName: optStr(200),
      seatId: optId,
      remarks: optStr(500),
      generateInitialCharges: z.boolean().optional(),
    }),
    req.body,
  );
  const out = await withTx((d) => createAdmission(d, ctxOf(req), b as any));
  res.status(201).json(out);
});

admissionsRouter.get('/:id', requirePerm('ADMISSION_VIEW', 'STUDENT_VIEW'), async (req, res) => {
  const d = await db();
  const aid = parse(id, req.params.id);
  const a = await d.one(
    `SELECT a.*, s.StudentCode, s.StudentName, s.FatherName, s.Mobile, s.StudentStatus, s.RollNumber,
            c.CourseCode, c.CourseName, c.FeeCycleType, b.BatchCode, b.BatchName, b.StartYear AS BatchStartYear,
            co.ConsultantCode, co.ConsultantName, se.SeatNumber, ay.AcademicYearCode AS CurrentAcademicYearCode, fp.PeriodName AS CurrentPeriodName,
            ra.AdmissionNumber AS ReplacesAdmissionNumber, u.FullName AS CancelledByName
     FROM admission.Admissions a
     JOIN admission.Students s ON s.StudentId = a.StudentId
     JOIN academic.Courses c ON c.CourseId = a.CourseId
     JOIN academic.Batches b ON b.BatchId = a.BatchId
     LEFT JOIN consultant.Consultants co ON co.ConsultantId = a.ConsultantId
     LEFT JOIN admission.Seats se ON se.SeatId = a.SeatId
     LEFT JOIN academic.AcademicYears ay ON ay.AcademicYearId = a.CurrentAcademicYearId
     LEFT JOIN academic.FeePeriods fp ON fp.FeePeriodId = a.CurrentFeePeriodId
     LEFT JOIN admission.Admissions ra ON ra.AdmissionId = a.ReplacesAdmissionId
     LEFT JOIN security.Users u ON u.UserId = a.CancelledBy
     WHERE a.AdmissionId = @id`,
    { id: aid },
  );
  if (!a) throw notFound('Admission');
  if (!can(req, 'CONSULTANT_VIEW')) {
    a.ConsultantName = a.ConsultantId ? '(restricted)' : null;
    a.ConsultantCode = null;
  }
  const [summary] = await d.query('SELECT * FROM reporting.vw_StudentFeeSummary WHERE AdmissionId = @id', { id: aid });
  res.json({ admission: a, summary });
});

admissionsRouter.post('/:id/cancel', requirePerm('ADMISSION_CANCEL'), async (req, res) => {
  const b = parse(
    z.object({
      cancellationDate: optDate,
      reason: str(500),
      releaseSeat: z.boolean().optional(),
      refundRequired: z.boolean().optional(),
      waiveOutstanding: z.boolean().optional(),
    }),
    req.body,
  );
  const out = await withTx((d) => cancelAdmission(d, ctxOf(req), parse(id, req.params.id), b));
  res.json(out);
});

admissionsRouter.post('/:id/consultant-review', requirePerm('CONSULTANT_REVIEW'), async (req, res) => {
  const b = parse(z.object({ decision: z.enum(['NO_RECOVERY', 'ADJUSTED']), remarks: str(500) }), req.body);
  await withTx((d) => setConsultantReview(d, ctxOf(req), parse(id, req.params.id), b.decision, b.remarks));
  res.json({ ok: true });
});

/* ---------------- charges ------------------------------------------- */
admissionsRouter.get('/:id/charges', requirePerm('STUDENT_VIEW'), async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT cb.*, fp.PeriodNumber, fp.PeriodType FROM reporting.vw_ChargeBalances cb
     LEFT JOIN academic.FeePeriods fp ON fp.FeePeriodId = cb.FeePeriodId
     WHERE cb.AdmissionId = @id ORDER BY COALESCE(cb.DueDate, cb.ChargeDate), cb.ChargeDate, cb.ChargeId`,
    { id: parse(id, req.params.id) },
  );
  res.json({ rows });
});

admissionsRouter.post('/:id/charges/generate', requirePerm('CHARGE_CREATE'), async (req, res) => {
  const b = parse(z.object({ feePeriodId: id }), req.body);
  const out = await withTx((d) => generateCharges(d, ctxOf(req), parse(id, req.params.id), b.feePeriodId));
  res.json(out);
});

admissionsRouter.post('/:id/charges', requirePerm('CHARGE_CREATE'), async (req, res) => {
  const b = parse(
    z.object({
      feeHeadId: id,
      amount,
      academicYearId: optId,
      feePeriodId: optId,
      dueDate: optDate,
      description: optStr(500),
    }),
    req.body,
  );
  const chargeId = await withTx((d) => addManualCharge(d, ctxOf(req), { admissionId: parse(id, req.params.id), ...b }));
  res.status(201).json({ chargeId });
});

/* Bulk: generate a fee period's charges for every active admission of a batch */
admissionsRouter.post('/batch-charges', requirePerm('CHARGE_CREATE'), async (req, res) => {
  const b = parse(z.object({ batchId: id, feePeriodId: id }), req.body);
  const d = await db();
  const adms = await d.query(`SELECT AdmissionId, AdmissionNumber FROM admission.Admissions WHERE BatchId = @b AND AdmissionStatus = N'ACTIVE'`, {
    b: b.batchId,
  });
  const results: unknown[] = [];
  let created = 0;
  for (const a of adms) {
    try {
      const r = await withTx((tx) => generateCharges(tx, ctxOf(req), Number(a.AdmissionId), b.feePeriodId));
      created += r.created;
      results.push({ admissionNumber: a.AdmissionNumber, created: r.created });
    } catch (e: any) {
      results.push({ admissionNumber: a.AdmissionNumber, error: e.message });
    }
  }
  res.json({ admissions: adms.length, chargesCreated: created, results });
});

admissionsRouter.post('/:id/apply-advance', requirePerm('ADVANCE_APPLY'), async (req, res) => {
  const out = await withTx((d) => applyAdvance(d, ctxOf(req), parse(id, req.params.id)));
  res.json(out);
});

/* ---------------- ledger / statement -------------------------------- */
admissionsRouter.get('/:id/ledger', requirePerm('STUDENT_VIEW'), async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT * FROM reporting.vw_StudentLedger
     WHERE AdmissionId = @id
       AND (@from IS NULL OR EntryDate >= @from) AND (@to IS NULL OR EntryDate <= @to)
       AND (@ay IS NULL OR AcademicYearId = @ay) AND (@period IS NULL OR FeePeriodId = @period)
       AND (@head IS NULL OR FeeHeadId = @head) AND (@type IS NULL OR EntryType = @type)
     ORDER BY EntryDate, SortOrder, EntryId`,
    {
      id: parse(id, req.params.id),
      from: qDate(req, 'from') ?? null,
      to: qDate(req, 'to') ?? null,
      ay: qNum(req, 'academicYearId') ?? null,
      period: qNum(req, 'feePeriodId') ?? null,
      head: qNum(req, 'feeHeadId') ?? null,
      type: q(req, 'entryType') ?? null,
    },
  );
  sendRows(req, res, rows, 'student-ledger');
});

/* Fee-head-wise: Fee Head | Charged | Paid | Discount | Refund | Due  (SRS 47) */
async function feeHeadSummary(d: any, admissionId: number) {
  return d.query(
    `SELECT FeeHeadId, FeeHeadName, SUM(OriginalAmount) AS Charged, SUM(DiscountAmount) AS Discount, SUM(WaivedAmount) AS Waived,
            SUM(PaidAmount + AdvanceAppliedAmount) AS Paid, SUM(RefundedAmount) AS Refunded, SUM(DueAmount) AS Due
     FROM reporting.vw_ChargeBalances WHERE AdmissionId = @id AND ChargeStatus = N'ACTIVE'
     GROUP BY FeeHeadId, FeeHeadName ORDER BY FeeHeadName`,
    { id: admissionId },
  );
}

admissionsRouter.get('/:id/financial', requirePerm('STUDENT_VIEW'), async (req, res) => {
  const d = await db();
  const aid = parse(id, req.params.id);
  const [summary] = await d.query('SELECT * FROM reporting.vw_StudentFeeSummary WHERE AdmissionId = @id', { id: aid });
  if (!summary) throw notFound('Admission');
  const [byHead, payments, advances, discounts, waivers, refunds, reversals] = await Promise.all([
    feeHeadSummary(d, aid),
    d.query('SELECT * FROM reporting.vw_PaymentRegister WHERE AdmissionId = @id ORDER BY PaymentId DESC', { id: aid }),
    d.query('SELECT * FROM reporting.vw_AdvanceBalances WHERE AdmissionId = @id ORDER BY AdvanceId', { id: aid }),
    d.query(
      `SELECT x.*, cb.FeeHeadName, cb.PeriodName, u.FullName AS RequestedByName FROM finance.Discounts x
       JOIN reporting.vw_ChargeBalances cb ON cb.ChargeId = x.ChargeId JOIN security.Users u ON u.UserId = x.RequestedBy
       WHERE x.AdmissionId = @id ORDER BY x.DiscountId DESC`,
      { id: aid },
    ),
    d.query(
      `SELECT x.*, cb.FeeHeadName, cb.PeriodName, u.FullName AS RequestedByName FROM finance.Adjustments x
       JOIN reporting.vw_ChargeBalances cb ON cb.ChargeId = x.ChargeId JOIN security.Users u ON u.UserId = x.RequestedBy
       WHERE x.AdmissionId = @id ORDER BY x.AdjustmentId DESC`,
      { id: aid },
    ),
    d.query(
      `SELECT r.*, pm.PaymentModeName, u.FullName AS RequestedByName FROM finance.Refunds r
       LEFT JOIN finance.PaymentModes pm ON pm.PaymentModeId = r.RefundModeId JOIN security.Users u ON u.UserId = r.RequestedBy
       WHERE r.AdmissionId = @id ORDER BY r.RefundId DESC`,
      { id: aid },
    ),
    d.query(
      `SELECT r.*, u.FullName AS RequestedByName FROM finance.TransactionReversals r JOIN security.Users u ON u.UserId = r.RequestedBy
       WHERE r.AdmissionId = @id ORDER BY r.ReversalId DESC`,
      { id: aid },
    ),
  ]);
  res.json({ summary, byHead, payments, advances, discounts, waivers, refunds, reversals });
});

/* Student / guardian statement (SRS 69) */
admissionsRouter.get('/:id/statement', requirePerm('STUDENT_VIEW'), async (req, res) => {
  const d = await db();
  const aid = parse(id, req.params.id);
  const [summary] = await d.query('SELECT * FROM reporting.vw_StudentFeeSummary WHERE AdmissionId = @id', { id: aid });
  if (!summary) throw notFound('Admission');
  const ledger = await d.query(
    `SELECT EntryDate, EntryType, Particulars, Reference, Debit, Credit, RunningBalance FROM reporting.vw_StudentLedger
     WHERE AdmissionId = @id ORDER BY EntryDate, SortOrder, EntryId`,
    { id: aid },
  );
  const byHead = await feeHeadSummary(d, aid);
  const s = await getAllSettings(d);
  res.json({
    college: { name: s.CollegeName, address: s.CollegeAddress, phone: s.CollegePhone, logoUrl: s.CollegeLogoUrl },
    summary,
    byHead,
    ledger,
    outstandingInWords: amountInWords(Math.max(0, summary.Outstanding)),
    generatedAt: new Date().toISOString(),
  });
});

