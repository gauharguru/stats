/* Consultant payables, payments (with duplicate-payment control) and recoveries. */
import { Db, dec } from '../db';
import { audit, AuditContext } from '../lib/audit';
import { today } from '../lib/dates';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors';
import { toPaise, toRupees } from '../lib/money';
import { registerApprovalHandler, submitForApproval } from './approval';

type Ctx = AuditContext & { userId: number };

/** Rate precedence: student-specific > batch-wise > course-wise > fixed > consultant default. */
export async function resolveRate(d: Db, consultantId: number, admission: { AdmissionId: number; BatchId: number; CourseId: number; AdmissionDate: string }) {
  const r = await d.one(
    `SELECT TOP 1 ConsultantRateId, RateType, Amount FROM consultant.ConsultantRates
     WHERE ConsultantId = @c AND IsActive = 1 AND EffectiveFrom <= @dt AND (EffectiveTo IS NULL OR EffectiveTo >= @dt)
       AND ( (RateType = N'STUDENT_SPECIFIC' AND AdmissionId = @a)
          OR (RateType = N'BATCH_WISE' AND BatchId = @b)
          OR (RateType = N'COURSE_WISE' AND CourseId = @co)
          OR (RateType = N'FIXED') )
     ORDER BY CASE RateType WHEN N'STUDENT_SPECIFIC' THEN 1 WHEN N'BATCH_WISE' THEN 2 WHEN N'COURSE_WISE' THEN 3 ELSE 4 END,
              EffectiveFrom DESC`,
    { c: consultantId, dt: admission.AdmissionDate, a: admission.AdmissionId, b: admission.BatchId, co: admission.CourseId },
  );
  if (r) return { consultantRateId: Number(r.ConsultantRateId), rateType: r.RateType as string, amount: r.Amount as number };
  const c = await d.one('SELECT DefaultRate FROM consultant.Consultants WHERE ConsultantId = @c', { c: consultantId });
  if (c?.DefaultRate) return { consultantRateId: null, rateType: 'DEFAULT', amount: c.DefaultRate as number };
  return null;
}

export async function createPayable(
  d: Db,
  ctx: Ctx,
  input: { consultantId: number; admissionId?: number | null; amount: number; description: string; payableDate?: string | null; consultantRateId?: number | null; allowAdditional?: boolean },
) {
  const c = await d.one('SELECT * FROM consultant.Consultants WHERE ConsultantId = @id', { id: input.consultantId });
  if (!c) throw notFound('Consultant');
  let adm: any = null;
  if (input.admissionId) {
    adm = await d.one(
      `SELECT a.*, s.StudentName FROM admission.Admissions a JOIN admission.Students s ON s.StudentId = a.StudentId WHERE a.AdmissionId = @id`,
      { id: input.admissionId },
    );
    if (!adm) throw notFound('Admission');
    if (Number(adm.ConsultantId) !== input.consultantId) throw badRequest('This admission did not come through the selected consultant.');
    const existing = await d.one(
      `SELECT ISNULL(SUM(ApprovedAmount), 0) AS amt FROM consultant.Payables
       WHERE AdmissionId = @a AND ConsultantId = @c AND Status IN (N'PENDING_APPROVAL', N'APPROVED')`,
      { a: input.admissionId, c: input.consultantId },
    );
    if (toPaise(existing.amt) > 0 && !input.allowAdditional)
      throw conflict(
        `A payable of ₹${existing.amt} already exists for this admission. Confirm to create an additional payable.`,
        'PAYABLE_EXISTS',
        { existing: existing.amt },
      );
  }
  const id = await d.insert(
    'consultant.Payables',
    {
      ConsultantId: input.consultantId,
      StudentId: adm?.StudentId ?? null,
      AdmissionId: adm?.AdmissionId ?? null,
      CourseId: adm?.CourseId ?? null,
      BatchId: adm?.BatchId ?? null,
      ConsultantRateId: input.consultantRateId ?? null,
      PayableDate: input.payableDate || today(),
      ApprovedAmount: dec(input.amount),
      Description: input.description,
      Status: 'PENDING_APPROVAL',
      RequestedBy: ctx.userId,
    },
    'ConsultantPayableId',
  );
  const r = await submitForApproval(d, ctx, {
    type: 'CONSULTANT_PAYABLE',
    transactionId: id,
    amount: input.amount,
    description: `Consultant payable ₹${input.amount}: ${c.ConsultantName}${adm ? ' / ' + adm.StudentName : ''} - ${input.description}`,
    studentId: adm?.StudentId ?? null,
    consultantId: input.consultantId,
  });
  return { consultantPayableId: id, ...r };
}

export async function createAutoPayable(d: Db, ctx: Ctx, admissionId: number) {
  const a = await d.one('SELECT * FROM admission.Admissions WHERE AdmissionId = @id', { id: admissionId });
  if (!a?.ConsultantId) return null;
  const rate = await resolveRate(d, Number(a.ConsultantId), a);
  if (!rate || rate.amount <= 0) return null;
  return createPayable(d, ctx, {
    consultantId: Number(a.ConsultantId),
    admissionId,
    amount: rate.amount,
    description: `Admission reimbursement (${rate.rateType.replace('_', ' ').toLowerCase()} rate) - ${a.AdmissionNumber}`,
    consultantRateId: rate.consultantRateId,
  });
}

registerApprovalHandler('CONSULTANT_PAYABLE', {
  async onApproved(d, id, ctx) {
    await d.exec(
      `UPDATE consultant.Payables SET Status = N'APPROVED', ApprovedBy = @u, ApprovedAt = SYSUTCDATETIME() WHERE ConsultantPayableId = @id`,
      { u: ctx.userId, id },
    );
  },
  async onRejected(d, id) {
    await d.exec(`UPDATE consultant.Payables SET Status = N'REJECTED' WHERE ConsultantPayableId = @id`, { id });
  },
  async onCancelled(d, id) {
    await d.exec(`UPDATE consultant.Payables SET Status = N'CANCELLED' WHERE ConsultantPayableId = @id`, { id });
  },
  describe: (d, id) =>
    d.one(
      `SELECT p.*, c.ConsultantName, c.ConsultantCode, s.StudentName, a.AdmissionNumber, a.AdmissionStatus
       FROM consultant.Payables p JOIN consultant.Consultants c ON c.ConsultantId = p.ConsultantId
       LEFT JOIN admission.Students s ON s.StudentId = p.StudentId LEFT JOIN admission.Admissions a ON a.AdmissionId = p.AdmissionId
       WHERE p.ConsultantPayableId = @id`,
      { id },
    ),
  link: () => `/consultants`,
});

/* ---------------- payments ------------------------------------------ */
export interface ConsultantPaymentInput {
  consultantPayableId: number;
  amount: number;
  paymentDate?: string | null;
  paymentModeId: number;
  transactionReference?: string | null;
  bankName?: string | null;
  remarks?: string | null;
  override?: boolean;
  overrideReason?: string | null;
}

export async function requestConsultantPayment(d: Db, ctx: Ctx, canOverride: boolean, input: ConsultantPaymentInput) {
  const py = await d.one('SELECT * FROM consultant.Payables WITH (UPDLOCK, ROWLOCK) WHERE ConsultantPayableId = @id', {
    id: input.consultantPayableId,
  });
  if (!py) throw notFound('Consultant payable');
  if (py.Status !== 'APPROVED') throw badRequest('Payments can only be made against an approved payable.');
  const mode = await d.one('SELECT * FROM finance.PaymentModes WHERE PaymentModeId = @id AND IsActive = 1', { id: input.paymentModeId });
  if (!mode) throw badRequest('Invalid payment mode.');
  if (mode.RequiresReference && !input.transactionReference?.trim()) throw badRequest('Transaction reference is required for this mode.');

  /* SRS 40: Approved Payable - Previous Payments - Approved Recoveries = Remaining */
  const bal = await d.one('SELECT * FROM reporting.vw_ConsultantPayableBalances WHERE ConsultantPayableId = @id', { id: py.ConsultantPayableId });
  const remaining = toPaise(bal.RemainingAmount);
  let isOverride = false;
  if (toPaise(input.amount) > remaining) {
    const msg =
      remaining <= 0
        ? 'This consultant obligation has already been fully settled.'
        : `Payment exceeds the remaining payable of ₹${toRupees(remaining)}.`;
    if (!input.override) throw conflict(msg, remaining <= 0 ? 'PAYABLE_SETTLED' : 'PAYABLE_EXCEEDED', { remaining: toRupees(remaining) });
    if (!canOverride) throw forbidden(`${msg} An authorised override is required.`);
    if (!input.overrideReason?.trim()) throw badRequest('Override reason is required.');
    isOverride = true;
  }
  const c = await d.one('SELECT ConsultantName FROM consultant.Consultants WHERE ConsultantId = @id', { id: py.ConsultantId });
  const number = await d.nextDocumentNumber('CONSULTANT_PAYMENT', input.paymentDate || today());
  const id = await d.insert(
    'consultant.Payments',
    {
      ConsultantPayableId: py.ConsultantPayableId,
      ConsultantId: py.ConsultantId,
      StudentId: py.StudentId,
      AdmissionId: py.AdmissionId,
      PaymentNumber: number,
      PaymentDate: input.paymentDate || today(),
      Amount: dec(input.amount),
      PaymentModeId: input.paymentModeId,
      TransactionReference: input.transactionReference ?? null,
      BankName: input.bankName ?? null,
      Remarks: input.remarks ?? null,
      IsOverride: isOverride,
      OverrideReason: isOverride ? input.overrideReason : null,
      Status: 'PENDING_APPROVAL',
      RequestedBy: ctx.userId,
    },
    'ConsultantPaymentId',
  );
  if (isOverride)
    await audit(d, ctx, 'CONSULTANT_PAYMENT_OVERRIDE', 'ConsultantPayment', id, {
      reason: input.overrideReason,
      newValues: { remaining: toRupees(remaining), amount: input.amount },
    });
  const r = await submitForApproval(d, ctx, {
    type: 'CONSULTANT_PAYMENT',
    transactionId: id,
    amount: input.amount,
    description: `Consultant payment ${number} ₹${input.amount} to ${c.ConsultantName} - ${py.Description}${isOverride ? ' [OVERRIDE]' : ''}`,
    studentId: py.StudentId ? Number(py.StudentId) : null,
    consultantId: Number(py.ConsultantId),
  });
  return { consultantPaymentId: id, paymentNumber: number, isOverride, ...r };
}

registerApprovalHandler('CONSULTANT_PAYMENT', {
  async onApproved(d, id, ctx) {
    await d.exec(
      `UPDATE consultant.Payments SET Status = N'APPROVED', ApprovedBy = @u, ApprovedAt = SYSUTCDATETIME() WHERE ConsultantPaymentId = @id`,
      { u: ctx.userId, id },
    );
  },
  async onRejected(d, id) {
    await d.exec(`UPDATE consultant.Payments SET Status = N'REJECTED' WHERE ConsultantPaymentId = @id`, { id });
  },
  async onCancelled(d, id) {
    await d.exec(`UPDATE consultant.Payments SET Status = N'CANCELLED' WHERE ConsultantPaymentId = @id`, { id });
  },
  describe: (d, id) =>
    d.one(
      `SELECT cp.*, c.ConsultantName, c.ConsultantCode, s.StudentName, a.AdmissionNumber, a.AdmissionStatus, pm.PaymentModeName,
              pb.ApprovedAmount AS PayableAmount, pb.PaidAmount AS PayablePaid, pb.RemainingAmount AS PayableRemaining
       FROM consultant.Payments cp JOIN consultant.Consultants c ON c.ConsultantId = cp.ConsultantId
       JOIN finance.PaymentModes pm ON pm.PaymentModeId = cp.PaymentModeId
       JOIN reporting.vw_ConsultantPayableBalances pb ON pb.ConsultantPayableId = cp.ConsultantPayableId
       LEFT JOIN admission.Students s ON s.StudentId = cp.StudentId LEFT JOIN admission.Admissions a ON a.AdmissionId = cp.AdmissionId
       WHERE cp.ConsultantPaymentId = @id`,
      { id },
    ),
});

export async function processConsultantPayment(
  d: Db,
  ctx: Ctx,
  input: { consultantPaymentId: number; paymentDate?: string | null; transactionReference?: string | null },
) {
  const p = await d.one('SELECT * FROM consultant.Payments WITH (UPDLOCK) WHERE ConsultantPaymentId = @id', { id: input.consultantPaymentId });
  if (!p) throw notFound('Consultant payment');
  if (p.Status !== 'APPROVED') throw badRequest('Only approved consultant payments can be processed.');
  await d.exec(
    `UPDATE consultant.Payments SET Status = N'PROCESSED', ProcessedBy = @u, ProcessedAt = SYSUTCDATETIME(),
       PaymentDate = COALESCE(@dt, PaymentDate), TransactionReference = COALESCE(@ref, TransactionReference)
     WHERE ConsultantPaymentId = @id`,
    { u: ctx.userId, dt: input.paymentDate ?? null, ref: input.transactionReference ?? null, id: p.ConsultantPaymentId },
  );
  await audit(d, ctx, 'CONSULTANT_PAYMENT_PROCESSED', 'ConsultantPayment', Number(p.ConsultantPaymentId), {
    newValues: { amount: p.Amount, paymentNumber: p.PaymentNumber },
  });
}

/* ---------------- recoveries ---------------------------------------- */
export async function requestRecovery(
  d: Db,
  ctx: Ctx,
  input: {
    consultantId: number;
    consultantPayableId?: number | null;
    consultantPaymentId?: number | null;
    admissionId?: number | null;
    recoveryMode: 'CASH' | 'ADJUST';
    paymentModeId?: number | null;
    transactionReference?: string | null;
    amount: number;
    reason: string;
    recoveryDate?: string | null;
  },
) {
  const c = await d.one('SELECT * FROM consultant.Consultants WHERE ConsultantId = @id', { id: input.consultantId });
  if (!c) throw notFound('Consultant');
  let py: any = null;
  if (input.consultantPayableId) {
    py = await d.one('SELECT * FROM consultant.Payables WHERE ConsultantPayableId = @id', { id: input.consultantPayableId });
    if (!py || Number(py.ConsultantId) !== input.consultantId) throw badRequest('Payable does not belong to this consultant.');
  }
  if (input.recoveryMode === 'CASH' && !input.paymentModeId) throw badRequest('Payment mode is required for a cash recovery.');
  const admissionId = input.admissionId ?? py?.AdmissionId ?? null;
  let studentId: number | null = py?.StudentId ?? null;
  if (admissionId && !studentId) {
    const a = await d.one('SELECT StudentId FROM admission.Admissions WHERE AdmissionId = @id', { id: admissionId });
    studentId = a ? Number(a.StudentId) : null;
  }
  const id = await d.insert(
    'consultant.Recoveries',
    {
      ConsultantId: input.consultantId,
      ConsultantPayableId: input.consultantPayableId ?? null,
      ConsultantPaymentId: input.consultantPaymentId ?? null,
      StudentId: studentId,
      AdmissionId: admissionId,
      RecoveryDate: input.recoveryDate || today(),
      RecoveryMode: input.recoveryMode,
      PaymentModeId: input.paymentModeId ?? null,
      TransactionReference: input.transactionReference ?? null,
      Amount: dec(input.amount),
      Reason: input.reason,
      Status: 'PENDING_APPROVAL',
      RequestedBy: ctx.userId,
    },
    'RecoveryId',
  );
  const r = await submitForApproval(d, ctx, {
    type: 'CONSULTANT_RECOVERY',
    transactionId: id,
    amount: input.amount,
    description: `Consultant recovery (${input.recoveryMode.toLowerCase()}) ₹${input.amount} from ${c.ConsultantName} - ${input.reason}`,
    studentId,
    consultantId: input.consultantId,
  });
  return { recoveryId: id, ...r };
}

registerApprovalHandler('CONSULTANT_RECOVERY', {
  async onApproved(d, id, ctx) {
    const r = await d.one('SELECT * FROM consultant.Recoveries WHERE RecoveryId = @id', { id });
    await d.exec(
      `UPDATE consultant.Recoveries SET Status = N'APPROVED', ApprovedBy = @u, ApprovedAt = SYSUTCDATETIME() WHERE RecoveryId = @id`,
      { u: ctx.userId, id },
    );
    if (r.AdmissionId)
      await d.exec(
        `UPDATE admission.Admissions SET ConsultantReviewStatus = N'RECOVERY_RECORDED' WHERE AdmissionId = @a AND ConsultantReviewStatus = N'REQUIRED'`,
        { a: r.AdmissionId },
      );
  },
  async onRejected(d, id) {
    await d.exec(`UPDATE consultant.Recoveries SET Status = N'REJECTED' WHERE RecoveryId = @id`, { id });
  },
  async onCancelled(d, id) {
    await d.exec(`UPDATE consultant.Recoveries SET Status = N'CANCELLED' WHERE RecoveryId = @id`, { id });
  },
  describe: (d, id) =>
    d.one(
      `SELECT r.*, c.ConsultantName, s.StudentName, a.AdmissionNumber, a.AdmissionStatus
       FROM consultant.Recoveries r JOIN consultant.Consultants c ON c.ConsultantId = r.ConsultantId
       LEFT JOIN admission.Students s ON s.StudentId = r.StudentId LEFT JOIN admission.Admissions a ON a.AdmissionId = r.AdmissionId
       WHERE r.RecoveryId = @id`,
      { id },
    ),
});

export async function setConsultantReview(d: Db, ctx: Ctx, admissionId: number, decision: 'NO_RECOVERY' | 'ADJUSTED', remarks: string) {
  const a = await d.one('SELECT ConsultantReviewStatus FROM admission.Admissions WITH (UPDLOCK) WHERE AdmissionId = @id', { id: admissionId });
  if (!a) throw notFound('Admission');
  if (!a.ConsultantReviewStatus) throw badRequest('This admission does not need a consultant review.');
  await d.exec(`UPDATE admission.Admissions SET ConsultantReviewStatus = @s, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @u WHERE AdmissionId = @id`, {
    s: decision,
    u: ctx.userId,
    id: admissionId,
  });
  await audit(d, ctx, 'CONSULTANT_REVIEW_DECIDED', 'Admission', admissionId, {
    oldValues: { review: a.ConsultantReviewStatus },
    newValues: { review: decision },
    reason: remarks,
  });
}
