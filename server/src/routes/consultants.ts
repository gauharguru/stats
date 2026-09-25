import { Router } from 'express';
import { db, dec, withTx } from '../db';
import { audit, auditCtx } from '../lib/audit';
import { today } from '../lib/dates';
import { badRequest, notFound } from '../lib/errors';
import { sendRows } from '../lib/export';
import { amount, date, id, nonNegAmount, optDate, optId, optStr, parse, q, qDate, qNum, str, z } from '../lib/validate';
import { can, requirePerm } from '../middleware/auth';
import {
  createPayable,
  processConsultantPayment,
  requestConsultantPayment,
  requestRecovery,
  resolveRate,
} from '../services/consultant';

export const consultantsRouter = Router();
const ctxOf = (req: any) => ({ ...auditCtx(req), userId: req.user.userId as number });
const fin = requirePerm('CONSULTANT_FINANCE_VIEW');

const consultantSchema = z.object({
  ConsultantName: str(200),
  OrganizationName: optStr(200),
  ContactPerson: optStr(200),
  Mobile: str(20),
  Email: optStr(200),
  Address: optStr(500),
  PAN: optStr(20),
  GSTIN: optStr(30),
  BankName: optStr(150),
  AccountName: optStr(200),
  AccountNumber: optStr(50),
  IFSC: optStr(20),
  DefaultRate: nonNegAmount.nullish(),
  Status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
  Remarks: optStr(500),
});

consultantsRouter.get('/', requirePerm('CONSULTANT_VIEW'), async (req, res) => {
  const d = await db();
  const term = q(req, 'q');
  const showFin = can(req, 'CONSULTANT_FINANCE_VIEW');
  const rows = await d.query(
    `SELECT c.ConsultantId, c.ConsultantCode, c.ConsultantName, c.OrganizationName, c.ContactPerson, c.Mobile, c.Email, c.Status,
            o.TotalAdmissions, o.ActiveAdmissions, o.CancelledAdmissions,
            CASE WHEN @fin = 1 THEN o.TotalPayable END AS TotalPayable, CASE WHEN @fin = 1 THEN o.TotalPaid END AS TotalPaid,
            CASE WHEN @fin = 1 THEN o.TotalRecovery END AS TotalRecovery, CASE WHEN @fin = 1 THEN o.Outstanding END AS Outstanding
     FROM consultant.Consultants c JOIN reporting.vw_ConsultantOutstanding o ON o.ConsultantId = c.ConsultantId
     WHERE (@q IS NULL OR c.ConsultantName LIKE @like OR c.ConsultantCode LIKE @like OR c.OrganizationName LIKE @like OR c.Mobile LIKE @like)
       AND (@status IS NULL OR c.Status = @status)
     ORDER BY c.ConsultantName`,
    { fin: showFin ? 1 : 0, q: term ?? null, like: term ? `%${term}%` : null, status: q(req, 'status') ?? null },
  );
  sendRows(req, res, rows, 'consultants');
});

consultantsRouter.post('/', requirePerm('CONSULTANT_EDIT'), async (req, res) => {
  const b = parse(consultantSchema, req.body);
  const out = await withTx(async (d) => {
    const code = await d.nextDocumentNumber('CONSULTANT', today());
    const cid = await d.insert(
      'consultant.Consultants',
      { ...b, DefaultRate: dec(b.DefaultRate ?? null), Status: b.Status ?? 'ACTIVE', ConsultantCode: code, CreatedBy: req.user!.userId },
      'ConsultantId',
    );
    await audit(d, ctxOf(req), 'CONSULTANT_CREATED', 'Consultant', cid, { newValues: { code, ...b } });
    return { consultantId: cid, consultantCode: code };
  });
  res.status(201).json(out);
});

consultantsRouter.put('/:id', requirePerm('CONSULTANT_EDIT'), async (req, res) => {
  const cid = parse(id, req.params.id);
  const b = parse(consultantSchema.partial(), req.body);
  await withTx(async (d) => {
    const old = await d.one('SELECT * FROM consultant.Consultants WITH (UPDLOCK) WHERE ConsultantId = @id', { id: cid });
    if (!old) throw notFound('Consultant');
    const sets: string[] = [];
    const params: Record<string, unknown> = { id: cid, u: req.user!.userId };
    for (const [k, v] of Object.entries(b)) {
      if (v === undefined) continue;
      sets.push(`${k} = @${k}`);
      params[k] = k === 'DefaultRate' ? dec(v as number | null) : v;
    }
    if (!sets.length) return;
    await d.exec(`UPDATE consultant.Consultants SET ${sets.join(', ')}, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @u WHERE ConsultantId = @id`, params);
    await audit(d, ctxOf(req), 'CONSULTANT_UPDATED', 'Consultant', cid, { oldValues: old, newValues: b });
  });
  res.json({ ok: true });
});

consultantsRouter.get('/:id', requirePerm('CONSULTANT_VIEW'), async (req, res) => {
  const d = await db();
  const cid = parse(id, req.params.id);
  const c = await d.one('SELECT * FROM consultant.Consultants WHERE ConsultantId = @id', { id: cid });
  if (!c) throw notFound('Consultant');
  const rates = await d.query(
    `SELECT r.*, co.CourseCode, b.BatchCode, a.AdmissionNumber FROM consultant.ConsultantRates r
     LEFT JOIN academic.Courses co ON co.CourseId = r.CourseId LEFT JOIN academic.Batches b ON b.BatchId = r.BatchId
     LEFT JOIN admission.Admissions a ON a.AdmissionId = r.AdmissionId
     WHERE r.ConsultantId = @id ORDER BY r.IsActive DESC, r.EffectiveFrom DESC`,
    { id: cid },
  );
  let summary = null;
  if (can(req, 'CONSULTANT_FINANCE_VIEW'))
    summary = await d.one('SELECT * FROM reporting.vw_ConsultantOutstanding WHERE ConsultantId = @id', { id: cid });
  else {
    for (const k of ['BankName', 'AccountName', 'AccountNumber', 'IFSC', 'PAN', 'GSTIN', 'DefaultRate']) c[k] = null;
  }
  res.json({ consultant: c, rates, summary });
});

/* ---------------- rates --------------------------------------------- */
consultantsRouter.post('/:id/rates', requirePerm('CONSULTANT_EDIT'), async (req, res) => {
  const cid = parse(id, req.params.id);
  const b = parse(
    z.object({
      RateType: z.enum(['FIXED', 'COURSE_WISE', 'BATCH_WISE', 'STUDENT_SPECIFIC']),
      CourseId: optId,
      BatchId: optId,
      AdmissionId: optId,
      Amount: nonNegAmount,
      EffectiveFrom: date,
      EffectiveTo: optDate,
    }),
    req.body,
  );
  if (b.RateType === 'COURSE_WISE' && !b.CourseId) throw badRequest('Course is required for a course-wise rate.');
  if (b.RateType === 'BATCH_WISE' && !b.BatchId) throw badRequest('Batch is required for a batch-wise rate.');
  if (b.RateType === 'STUDENT_SPECIFIC' && !b.AdmissionId) throw badRequest('Admission is required for a student-specific rate.');
  const rid = await withTx(async (d) => {
    const i = await d.insert(
      'consultant.ConsultantRates',
      {
        ConsultantId: cid, RateType: b.RateType, CourseId: b.CourseId ?? null, BatchId: b.BatchId ?? null, AdmissionId: b.AdmissionId ?? null,
        Amount: dec(b.Amount), EffectiveFrom: b.EffectiveFrom, EffectiveTo: b.EffectiveTo ?? null, CreatedBy: req.user!.userId,
      },
      'ConsultantRateId',
    );
    await audit(d, ctxOf(req), 'CONSULTANT_RATE_CREATED', 'ConsultantRate', i, { newValues: { consultantId: cid, ...b } });
    return i;
  });
  res.status(201).json({ consultantRateId: rid });
});

consultantsRouter.post('/rates/:rateId/deactivate', requirePerm('CONSULTANT_EDIT'), async (req, res) => {
  const rid = parse(id, req.params.rateId);
  await withTx(async (d) => {
    await d.exec(`UPDATE consultant.ConsultantRates SET IsActive = 0, EffectiveTo = COALESCE(EffectiveTo, CAST(SYSUTCDATETIME() AS DATE)) WHERE ConsultantRateId = @id`, { id: rid });
    await audit(d, ctxOf(req), 'CONSULTANT_RATE_DEACTIVATED', 'ConsultantRate', rid);
  });
  res.json({ ok: true });
});

consultantsRouter.get('/:id/suggested-rate/:admissionId', fin, async (req, res) => {
  const d = await db();
  const a = await d.one('SELECT * FROM admission.Admissions WHERE AdmissionId = @id', { id: parse(id, req.params.admissionId) });
  if (!a) throw notFound('Admission');
  res.json({ rate: await resolveRate(d, parse(id, req.params.id), a) });
});

/* ---------------- students / ledger --------------------------------- */
consultantsRouter.get('/:id/students', requirePerm('CONSULTANT_VIEW'), async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT * FROM reporting.vw_ConsultantStudentSummary WHERE ConsultantId = @id ORDER BY AdmissionDate DESC`,
    { id: parse(id, req.params.id) },
  );
  if (!can(req, 'CONSULTANT_FINANCE_VIEW'))
    for (const r of rows) for (const k of ['Payable', 'Paid', 'Recovery', 'Outstanding', 'PendingPayable']) r[k] = null;
  sendRows(req, res, rows, 'consultant-students');
});

consultantsRouter.get('/:id/ledger', fin, async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT * FROM reporting.vw_ConsultantLedger WHERE ConsultantId = @id
       AND (@from IS NULL OR EntryDate >= @from) AND (@to IS NULL OR EntryDate <= @to)
     ORDER BY EntryDate, SortOrder, EntryId`,
    { id: parse(id, req.params.id), from: qDate(req, 'from') ?? null, to: qDate(req, 'to') ?? null },
  );
  sendRows(req, res, rows, 'consultant-ledger');
});

consultantsRouter.get('/:id/payables', fin, async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT pb.*, s.StudentName, s.StudentCode, a.AdmissionNumber, a.AdmissionStatus, co.CourseCode, u.FullName AS RequestedByName
     FROM reporting.vw_ConsultantPayableBalances pb
     JOIN consultant.Payables p ON p.ConsultantPayableId = pb.ConsultantPayableId
     LEFT JOIN admission.Students s ON s.StudentId = pb.StudentId LEFT JOIN admission.Admissions a ON a.AdmissionId = pb.AdmissionId
     LEFT JOIN academic.Courses co ON co.CourseId = pb.CourseId JOIN security.Users u ON u.UserId = p.RequestedBy
     WHERE pb.ConsultantId = @id ORDER BY pb.ConsultantPayableId DESC`,
    { id: parse(id, req.params.id) },
  );
  res.json({ rows });
});

consultantsRouter.get('/:id/payments', fin, async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT cp.*, s.StudentName, a.AdmissionNumber, pm.PaymentModeName, u.FullName AS RequestedByName, pb.Description AS PayableDescription
     FROM consultant.Payments cp JOIN finance.PaymentModes pm ON pm.PaymentModeId = cp.PaymentModeId
     JOIN consultant.Payables pb ON pb.ConsultantPayableId = cp.ConsultantPayableId
     LEFT JOIN admission.Students s ON s.StudentId = cp.StudentId LEFT JOIN admission.Admissions a ON a.AdmissionId = cp.AdmissionId
     JOIN security.Users u ON u.UserId = cp.RequestedBy
     WHERE cp.ConsultantId = @id ORDER BY cp.ConsultantPaymentId DESC`,
    { id: parse(id, req.params.id) },
  );
  res.json({ rows });
});

consultantsRouter.get('/:id/recoveries', fin, async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT r.*, s.StudentName, a.AdmissionNumber, u.FullName AS RequestedByName FROM consultant.Recoveries r
     LEFT JOIN admission.Students s ON s.StudentId = r.StudentId LEFT JOIN admission.Admissions a ON a.AdmissionId = r.AdmissionId
     JOIN security.Users u ON u.UserId = r.RequestedBy
     WHERE r.ConsultantId = @id ORDER BY r.RecoveryId DESC`,
    { id: parse(id, req.params.id) },
  );
  res.json({ rows });
});

/* Consultant statement (SRS 70) */
consultantsRouter.get('/:id/statement', fin, async (req, res) => {
  const d = await db();
  const cid = parse(id, req.params.id);
  const from = qDate(req, 'from') ?? null;
  const to = qDate(req, 'to') ?? null;
  const c = await d.one('SELECT ConsultantCode, ConsultantName, OrganizationName, Mobile FROM consultant.Consultants WHERE ConsultantId = @id', { id: cid });
  if (!c) throw notFound('Consultant');
  const summary = await d.one('SELECT * FROM reporting.vw_ConsultantOutstanding WHERE ConsultantId = @id', { id: cid });
  const ledger = await d.query(
    `SELECT * FROM reporting.vw_ConsultantLedger WHERE ConsultantId = @id AND (@from IS NULL OR EntryDate >= @from) AND (@to IS NULL OR EntryDate <= @to)
     ORDER BY EntryDate, SortOrder, EntryId`,
    { id: cid, from, to },
  );
  res.json({ consultant: c, summary, ledger, period: { from, to } });
});

/* ---------------- payables / payments / recoveries ------------------ */
consultantsRouter.post('/payables', requirePerm('CONSULTANT_PAYABLE_CREATE'), async (req, res) => {
  const b = parse(
    z.object({ consultantId: id, admissionId: optId, amount, description: str(500), payableDate: optDate, allowAdditional: z.boolean().optional() }),
    req.body,
  );
  res.status(201).json(await withTx((d) => createPayable(d, ctxOf(req), b)));
});

consultantsRouter.post('/payments', requirePerm('CONSULTANT_PAYMENT_CREATE'), async (req, res) => {
  const b = parse(
    z.object({
      consultantPayableId: id,
      amount,
      paymentDate: optDate,
      paymentModeId: id,
      transactionReference: optStr(150),
      bankName: optStr(150),
      remarks: optStr(500),
      override: z.boolean().optional(),
      overrideReason: optStr(500),
    }),
    req.body,
  );
  res.status(201).json(await withTx((d) => requestConsultantPayment(d, ctxOf(req), can(req, 'CONSULTANT_PAYMENT_OVERRIDE'), b)));
});

consultantsRouter.post('/payments/:id/process', requirePerm('CONSULTANT_PAYMENT_PROCESS'), async (req, res) => {
  const b = parse(z.object({ paymentDate: optDate, transactionReference: optStr(150) }), req.body);
  await withTx((d) => processConsultantPayment(d, ctxOf(req), { consultantPaymentId: parse(id, req.params.id), ...b }));
  res.json({ ok: true, status: 'PROCESSED' });
});

consultantsRouter.post('/recoveries', requirePerm('CONSULTANT_RECOVERY_CREATE'), async (req, res) => {
  const b = parse(
    z.object({
      consultantId: id,
      consultantPayableId: optId,
      consultantPaymentId: optId,
      admissionId: optId,
      recoveryMode: z.enum(['CASH', 'ADJUST']),
      paymentModeId: optId,
      transactionReference: optStr(150),
      amount,
      reason: str(500),
      recoveryDate: optDate,
    }),
    req.body,
  );
  res.status(201).json(await withTx((d) => requestRecovery(d, ctxOf(req), b)));
});

