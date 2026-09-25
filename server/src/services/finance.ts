/* Student finance: charges, payments, allocation, advances, discounts,
   waivers, refunds and reversals. Every public function here must be
   called inside withTx(); it locks the admission row first so concurrent
   cashiers cannot double-allocate the same dues. */
import { Db, dec, nvarMax } from '../db';
import { audit, AuditContext } from '../lib/audit';
import { today } from '../lib/dates';
import { badRequest, conflict, notFound } from '../lib/errors';
import { toPaise, toRupees } from '../lib/money';
import { getBoolSetting, getSetting } from '../lib/settings';
import { registerApprovalHandler, submitForApproval } from './approval';

type Ctx = AuditContext & { userId: number };

/* ------------------------------------------------------------------ */
/* helpers                                                              */
/* ------------------------------------------------------------------ */
export async function lockAdmission(d: Db, admissionId: number) {
  const a = await d.one(
    `SELECT a.*, b.StartYear AS BatchStartYear, b.BatchCode, c.CourseCode, c.FeeCycleType, s.StudentName, s.StudentCode
     FROM admission.Admissions a WITH (UPDLOCK, ROWLOCK)
     JOIN academic.Batches b ON b.BatchId = a.BatchId
     JOIN academic.Courses c ON c.CourseId = a.CourseId
     JOIN admission.Students s ON s.StudentId = a.StudentId
     WHERE a.AdmissionId = @id`,
    { id: admissionId },
  );
  if (!a) throw notFound('Admission');
  return a;
}

export interface DueCharge {
  ChargeId: number;
  FeeHeadName: string;
  PeriodName: string | null;
  DueAmount: number;
  PaidAmount: number;
  AdvanceAppliedAmount: number;
  RefundedAmount: number;
}

/** Charges with an amount due, oldest first (FIFO order). */
export async function dueCharges(d: Db, admissionId: number): Promise<DueCharge[]> {
  return d.query<DueCharge>(
    `SELECT ChargeId, FeeHeadName, PeriodName, DueAmount, PaidAmount, AdvanceAppliedAmount, RefundedAmount
     FROM reporting.vw_ChargeBalances
     WHERE AdmissionId = @id AND ChargeStatus = N'ACTIVE' AND DueAmount > 0
     ORDER BY COALESCE(DueDate, ChargeDate), ChargeDate, ChargeId`,
    { id: admissionId },
  );
}

async function chargeBalance(d: Db, chargeId: number) {
  const c = await d.one('SELECT * FROM reporting.vw_ChargeBalances WHERE ChargeId = @id', { id: chargeId });
  if (!c) throw notFound('Charge');
  return c;
}

function periodYearOffset(periodType: string, n: number): number {
  if (periodType === 'YEAR') return Math.max(0, n - 1);
  if (periodType === 'SEMESTER') return Math.max(0, Math.floor((n - 1) / 2));
  return 0;
}

/** Academic year a fee period falls in for a batch (SRS 7). */
export async function academicYearForPeriod(d: Db, batchStartYear: number, feePeriodId: number) {
  const p = await d.one('SELECT * FROM academic.FeePeriods WHERE FeePeriodId = @id', { id: feePeriodId });
  if (!p) throw notFound('Fee period');
  if (p.AcademicYearId) return { period: p, academicYearId: Number(p.AcademicYearId) };
  const startYear = batchStartYear + periodYearOffset(p.PeriodType, p.PeriodNumber);
  const ay = await d.one('SELECT AcademicYearId FROM academic.AcademicYears WHERE StartYear = @y', { y: startYear });
  if (!ay)
    throw badRequest(
      `Academic year ${startYear}-${String((startYear + 1) % 100).padStart(2, '0')} does not exist yet. Create it under Masters > Academic Years.`,
      'ACADEMIC_YEAR_MISSING',
    );
  return { period: p, academicYearId: Number(ay.AcademicYearId) };
}

async function validateModeDetails(d: Db, modeId: number, v: { reference?: string | null; bank?: string | null; chequeNumber?: string | null; chequeDate?: string | null }) {
  const m = await d.one('SELECT * FROM finance.PaymentModes WHERE PaymentModeId = @id AND IsActive = 1', { id: modeId });
  if (!m) throw badRequest('Invalid or inactive payment mode.');
  if (m.RequiresReference && !v.reference?.trim()) throw badRequest(`${m.PaymentModeName}: transaction reference / UTR is required.`, 'REFERENCE_REQUIRED');
  if (m.RequiresBank && !v.bank?.trim()) throw badRequest(`${m.PaymentModeName}: bank name is required.`, 'BANK_REQUIRED');
  if (m.RequiresChequeDetails && (!v.chequeNumber?.trim() || !v.chequeDate))
    throw badRequest('Cheque number and cheque date are required.', 'CHEQUE_REQUIRED');
  return m;
}

/* ------------------------------------------------------------------ */
/* charges                                                              */
/* ------------------------------------------------------------------ */
export async function generateCharges(d: Db, ctx: Ctx, admissionId: number, feePeriodId: number, opts: { applyAdvance?: boolean } = {}) {
  const a = await lockAdmission(d, admissionId);
  if (!['ACTIVE', 'PENDING', 'SUSPENDED'].includes(a.AdmissionStatus))
    throw badRequest(`Cannot generate charges for a ${a.AdmissionStatus.toLowerCase()} admission.`);
  const { period, academicYearId } = await academicYearForPeriod(d, a.BatchStartYear, feePeriodId);
  if (Number(period.CourseId) !== Number(a.CourseId)) throw badRequest('Fee period does not belong to the admission course.');

  const businessDate = today();
  /* Batch-specific lines win over course-wide lines for the same fee head. */
  const lines = await d.query(
    `WITH s AS (
       SELECT fs.*, ROW_NUMBER() OVER (PARTITION BY fs.FeeHeadId ORDER BY CASE WHEN fs.BatchId IS NULL THEN 1 ELSE 0 END, fs.EffectiveFrom DESC) AS rn
       FROM finance.FeeStructures fs
       WHERE fs.CourseId = @course AND fs.FeePeriodId = @period AND fs.AcademicYearId = @ay AND fs.IsActive = 1
         AND (fs.BatchId = @batch OR fs.BatchId IS NULL)
         AND fs.EffectiveFrom <= @date AND (fs.EffectiveTo IS NULL OR fs.EffectiveTo >= @date)
         AND fs.Amount > 0)
     SELECT s.* FROM s
     WHERE s.rn = 1
       AND NOT EXISTS (SELECT 1 FROM finance.StudentCharges c
                       WHERE c.AdmissionId = @adm AND c.ChargeStatus = N'ACTIVE'
                         AND c.FeeHeadId = s.FeeHeadId AND c.FeePeriodId = s.FeePeriodId AND c.AcademicYearId = s.AcademicYearId)`,
    { course: a.CourseId, period: feePeriodId, ay: academicYearId, batch: a.BatchId, date: businessDate, adm: admissionId },
  );
  const created: number[] = [];
  for (const l of lines) {
    const id = await d.insert(
      'finance.StudentCharges',
      {
        AdmissionId: admissionId,
        StudentId: a.StudentId,
        FeeStructureId: l.FeeStructureId,
        FeeHeadId: l.FeeHeadId,
        FeePeriodId: feePeriodId,
        AcademicYearId: academicYearId,
        ChargeDate: businessDate,
        DueDate: l.DueDate,
        OriginalAmount: dec(l.Amount),
        CreatedBy: ctx.userId,
      },
      'ChargeId',
    );
    created.push(id);
  }
  if (created.length) {
    if (period.PeriodType !== 'ONE_TIME') {
      await d.exec(
        `UPDATE admission.Admissions SET CurrentFeePeriodId = @p, CurrentAcademicYearId = @ay, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @u
         WHERE AdmissionId = @id AND (CurrentFeePeriodId IS NULL OR
               (SELECT PeriodNumber FROM academic.FeePeriods WHERE FeePeriodId = CurrentFeePeriodId) < @n)`,
        { p: feePeriodId, ay: academicYearId, u: ctx.userId, id: admissionId, n: period.PeriodNumber },
      );
    }
    await audit(d, ctx, 'CHARGES_GENERATED', 'Admission', admissionId, {
      newValues: { feePeriodId, academicYearId, chargeIds: created },
    });
    if (opts.applyAdvance ?? (await getBoolSetting(d, 'AutoApplyAdvance', true))) await applyAdvance(d, ctx, admissionId);
  }
  return { created: created.length, chargeIds: created, academicYearId, periodName: period.PeriodName };
}

export async function addManualCharge(
  d: Db,
  ctx: Ctx,
  input: { admissionId: number; feeHeadId: number; amount: number; academicYearId?: number | null; feePeriodId?: number | null; dueDate?: string | null; description?: string | null; chargeDate?: string | null },
) {
  const a = await lockAdmission(d, input.admissionId);
  const fh = await d.one('SELECT * FROM finance.FeeHeads WHERE FeeHeadId = @id AND IsActive = 1', { id: input.feeHeadId });
  if (!fh) throw badRequest('Invalid or inactive fee head.');
  let academicYearId = input.academicYearId ?? null;
  if (input.feePeriodId) {
    const r = await academicYearForPeriod(d, a.BatchStartYear, input.feePeriodId);
    if (Number(r.period.CourseId) !== Number(a.CourseId)) throw badRequest('Fee period does not belong to the admission course.');
    academicYearId = academicYearId ?? r.academicYearId;
  }
  if (!academicYearId) {
    const cur = await d.one('SELECT AcademicYearId FROM academic.AcademicYears WHERE IsCurrent = 1');
    academicYearId = cur ? Number(cur.AcademicYearId) : null;
  }
  if (!academicYearId) throw badRequest('Academic year is required.');
  const id = await d.insert(
    'finance.StudentCharges',
    {
      AdmissionId: input.admissionId,
      StudentId: a.StudentId,
      FeeHeadId: input.feeHeadId,
      FeePeriodId: input.feePeriodId ?? null,
      AcademicYearId: academicYearId,
      ChargeDate: input.chargeDate || today(),
      DueDate: input.dueDate ?? null,
      OriginalAmount: dec(input.amount),
      Description: input.description ?? null,
      CreatedBy: ctx.userId,
    },
    'ChargeId',
  );
  await audit(d, ctx, 'CHARGE_CREATED', 'StudentCharge', id, { newValues: input });
  if (await getBoolSetting(d, 'AutoApplyAdvance', true)) await applyAdvance(d, ctx, input.admissionId);
  return id;
}

/* ------------------------------------------------------------------ */
/* advances                                                             */
/* ------------------------------------------------------------------ */
export async function applyAdvance(d: Db, ctx: Ctx, admissionId: number) {
  await lockAdmission(d, admissionId);
  const advances = await d.query(
    `SELECT AdvanceId, AvailableAmount FROM reporting.vw_AdvanceBalances
     WHERE AdmissionId = @id AND Status <> N'REVERSED' AND AvailableAmount > 0 ORDER BY AdvanceId`,
    { id: admissionId },
  );
  if (!advances.length) return { applied: 0 };
  const dues = await dueCharges(d, admissionId);
  let applied = 0;
  let ci = 0;
  let chargeLeft = dues.length ? toPaise(dues[0].DueAmount) : 0;
  for (const adv of advances) {
    let avail = toPaise(adv.AvailableAmount);
    let used = 0;
    while (avail > 0 && ci < dues.length) {
      const amt = Math.min(avail, chargeLeft);
      await d.exec(
        `INSERT INTO finance.AdvanceAllocations (AdvanceId, ChargeId, Amount, AllocationDate, CreatedBy)
         VALUES (@a, @c, @amt, @dt, @u)`,
        { a: adv.AdvanceId, c: dues[ci].ChargeId, amt: dec(toRupees(amt)), dt: today(), u: ctx.userId },
      );
      avail -= amt;
      used += amt;
      chargeLeft -= amt;
      applied += amt;
      if (chargeLeft === 0) {
        ci++;
        chargeLeft = ci < dues.length ? toPaise(dues[ci].DueAmount) : 0;
      }
    }
    if (used > 0) {
      await d.exec(
        `UPDATE finance.Advances SET UtilizedAmount = UtilizedAmount + @used,
           Status = CASE WHEN OriginalAmount - (UtilizedAmount + @used) <= 0 THEN N'UTILIZED' ELSE Status END
         WHERE AdvanceId = @id`,
        { used: dec(toRupees(used)), id: adv.AdvanceId },
      );
    }
    if (ci >= dues.length) break;
  }
  if (applied > 0) await audit(d, ctx, 'ADVANCE_APPLIED', 'Admission', admissionId, { newValues: { amount: toRupees(applied) } });
  return { applied: toRupees(applied) };
}

/* ------------------------------------------------------------------ */
/* payments                                                             */
/* ------------------------------------------------------------------ */
export interface PaymentInput {
  admissionId: number;
  amount: number;
  paymentDate?: string | null;
  paymentModeId: number;
  transactionReference?: string | null;
  bankName?: string | null;
  chequeNumber?: string | null;
  chequeDate?: string | null;
  remarks?: string | null;
  allocationMethod?: 'FIFO' | 'MANUAL' | null;
  allocations?: { chargeId: number; amount: number }[] | null;
  confirmDuplicateReference?: boolean;
}

export async function createPayment(d: Db, ctx: Ctx, input: PaymentInput) {
  const a = await lockAdmission(d, input.admissionId);
  const paymentDate = input.paymentDate || today();
  if (paymentDate > today()) throw badRequest('Payment date cannot be in the future.');
  const mode = await validateModeDetails(d, input.paymentModeId, {
    reference: input.transactionReference,
    bank: input.bankName,
    chequeNumber: input.chequeNumber,
    chequeDate: input.chequeDate,
  });

  /* SRS 75: duplicate UTR / reference detection */
  const ref = input.transactionReference?.trim() || null;
  if (ref && !mode.IsCash) {
    const dup = await d.one(
      `SELECT TOP 1 p.PaymentId, p.ReceiptNumber, p.Amount, p.PaymentDate, s.StudentName
       FROM finance.Payments p JOIN admission.Students s ON s.StudentId = p.StudentId
       WHERE p.TransactionReference = @ref AND p.PaymentModeId = @mode AND p.Status NOT IN (N'REJECTED', N'CANCELLED')`,
      { ref, mode: input.paymentModeId },
    );
    if (dup && !input.confirmDuplicateReference)
      throw conflict('Warning: This transaction reference already exists.', 'DUPLICATE_REFERENCE', dup);
  }

  const method = input.allocationMethod || ((await getSetting(d, 'DefaultPaymentAllocationMethod', 'FIFO')) as 'FIFO' | 'MANUAL');
  let plan: { chargeId: number; amount: number }[] | null = null;
  if (method === 'MANUAL') {
    plan = (input.allocations || []).filter((x) => x.amount > 0);
    const sum = plan.reduce((s, x) => s + toPaise(x.amount), 0);
    if (sum > toPaise(input.amount)) throw badRequest('Allocation cannot exceed payment amount.', 'ALLOCATION_EXCEEDS_PAYMENT');
    await validateAllocationPlan(d, input.admissionId, plan);
  }

  const requiresApproval = await getBoolSetting(d, 'PaymentRequiresApproval', false);
  const paymentId = await d.insert(
    'finance.Payments',
    {
      AdmissionId: input.admissionId,
      StudentId: a.StudentId,
      PaymentDate: paymentDate,
      Amount: dec(input.amount),
      PaymentModeId: input.paymentModeId,
      TransactionReference: ref,
      BankName: input.bankName ?? null,
      ChequeNumber: input.chequeNumber ?? null,
      ChequeDate: input.chequeDate ?? null,
      ChequeStatus: mode.RequiresChequeDetails ? 'RECEIVED' : null,
      AllocationMethod: method,
      AllocationPlan: nvarMax(plan ? JSON.stringify(plan) : null),
      Status: 'DRAFT',
      Remarks: input.remarks ?? null,
      SubmittedBy: ctx.userId,
      CreatedBy: ctx.userId,
    },
    'PaymentId',
  );
  await audit(d, ctx, 'PAYMENT_CREATED', 'Payment', paymentId, { newValues: { ...input, admissionNumber: a.AdmissionNumber } });

  if (requiresApproval) {
    await d.exec(`UPDATE finance.Payments SET Status = N'PENDING_APPROVAL' WHERE PaymentId = @id`, { id: paymentId });
    const r = await submitForApproval(d, ctx, {
      type: 'PAYMENT',
      transactionId: paymentId,
      amount: input.amount,
      description: `Payment ₹${input.amount} from ${a.StudentName} (${a.AdmissionNumber})`,
      studentId: a.StudentId,
    });
    return { paymentId, status: r.autoApproved ? 'POSTED' : 'PENDING_APPROVAL' };
  }
  await postPayment(d, ctx, paymentId, false);
  return { paymentId, status: 'POSTED' };
}

async function validateAllocationPlan(d: Db, admissionId: number, plan: { chargeId: number; amount: number }[]) {
  const dues = await dueCharges(d, admissionId);
  const seen = new Set<number>();
  for (const x of plan) {
    if (seen.has(x.chargeId)) throw badRequest('A charge appears twice in the allocation.');
    seen.add(x.chargeId);
    const due = dues.find((c) => Number(c.ChargeId) === Number(x.chargeId));
    if (!due) throw badRequest(`Charge ${x.chargeId} has nothing due or does not belong to this admission.`, 'ALLOCATION_INVALID_CHARGE');
    if (toPaise(x.amount) > toPaise(due.DueAmount))
      throw badRequest(`Allocation to ${due.FeeHeadName} exceeds the amount due (₹${due.DueAmount}).`, 'ALLOCATION_EXCEEDS_CHARGE');
  }
  return dues;
}

/** Allocates, creates advance, assigns receipt number and posts. */
export async function postPayment(d: Db, ctx: Ctx, paymentId: number, viaApproval: boolean) {
  const p = await d.one('SELECT * FROM finance.Payments WITH (UPDLOCK, ROWLOCK) WHERE PaymentId = @id', { id: paymentId });
  if (!p) throw notFound('Payment');
  if (!['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(p.Status)) throw badRequest(`Payment is already ${p.Status}.`);
  await lockAdmission(d, Number(p.AdmissionId));

  let remaining = toPaise(p.Amount);
  const allocations: { chargeId: number; amount: number }[] = [];
  if (p.AllocationMethod === 'MANUAL' && p.AllocationPlan) {
    const plan = JSON.parse(p.AllocationPlan) as { chargeId: number; amount: number }[];
    await validateAllocationPlan(d, Number(p.AdmissionId), plan);
    for (const x of plan) {
      allocations.push({ chargeId: x.chargeId, amount: toPaise(x.amount) });
      remaining -= toPaise(x.amount);
    }
  } else {
    for (const c of await dueCharges(d, Number(p.AdmissionId))) {
      if (remaining <= 0) break;
      const amt = Math.min(remaining, toPaise(c.DueAmount));
      allocations.push({ chargeId: Number(c.ChargeId), amount: amt });
      remaining -= amt;
    }
  }
  if (remaining < 0) throw badRequest('Allocation cannot exceed payment amount.');

  for (const al of allocations) {
    await d.exec(
      `INSERT INTO finance.PaymentAllocations (PaymentId, ChargeId, AllocatedAmount, CreatedBy) VALUES (@p, @c, @a, @u)`,
      { p: paymentId, c: al.chargeId, a: dec(toRupees(al.amount)), u: ctx.userId },
    );
  }
  if (remaining > 0) {
    await d.exec(
      `INSERT INTO finance.Advances (PaymentId, StudentId, AdmissionId, OriginalAmount) VALUES (@p, @s, @a, @amt)`,
      { p: paymentId, s: p.StudentId, a: p.AdmissionId, amt: dec(toRupees(remaining)) },
    );
  }
  const receiptNumber = await d.nextDocumentNumber('RECEIPT', p.PaymentDate);
  await d.exec(
    `UPDATE finance.Payments
       SET Status = N'POSTED', ReceiptNumber = @r, PostedAt = SYSUTCDATETIME(),
           ApprovedBy = CASE WHEN @via = 1 THEN @u ELSE ApprovedBy END,
           ApprovedAt = CASE WHEN @via = 1 THEN SYSUTCDATETIME() ELSE ApprovedAt END,
           AllocationPlan = NULL, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @u
     WHERE PaymentId = @id`,
    { r: receiptNumber, via: viaApproval, u: ctx.userId, id: paymentId },
  );
  await d.exec(`INSERT INTO finance.Receipts (PaymentId, ReceiptNumber, ReceiptDate) VALUES (@p, @r, @dt)`, {
    p: paymentId,
    r: receiptNumber,
    dt: p.PaymentDate,
  });
  await audit(d, ctx, 'PAYMENT_POSTED', 'Payment', paymentId, {
    newValues: {
      receiptNumber,
      amount: p.Amount,
      allocations: allocations.map((x) => ({ chargeId: x.chargeId, amount: toRupees(x.amount) })),
      advance: toRupees(remaining),
    },
  });
  return { receiptNumber, advance: toRupees(remaining) };
}

registerApprovalHandler('PAYMENT', {
  async onApproved(d, id, ctx) {
    await postPayment(d, ctx as Ctx, id, true);
  },
  async onRejected(d, id) {
    await d.exec(`UPDATE finance.Payments SET Status = N'REJECTED', UpdatedAt = SYSUTCDATETIME() WHERE PaymentId = @id`, { id });
  },
  async onCancelled(d, id) {
    await d.exec(`UPDATE finance.Payments SET Status = N'CANCELLED', UpdatedAt = SYSUTCDATETIME() WHERE PaymentId = @id`, { id });
  },
  describe: (d, id) => d.one('SELECT * FROM reporting.vw_PaymentRegister WHERE PaymentId = @id', { id }),
  link: (id) => `/payments/${id}`,
});

/* ------------------------------------------------------------------ */
/* discounts & waivers                                                  */
/* ------------------------------------------------------------------ */
export async function requestDiscount(d: Db, ctx: Ctx, input: { chargeId: number; amount: number; reason: string; remarks?: string | null }) {
  const ch = await chargeBalance(d, input.chargeId);
  const a = await lockAdmission(d, Number(ch.AdmissionId));
  if (ch.ChargeStatus !== 'ACTIVE') throw badRequest('Charge is not active.');
  if (toPaise(input.amount) > toPaise(ch.DueAmount))
    throw badRequest(`Discount cannot exceed the amount due on the charge (₹${ch.DueAmount}).`, 'DISCOUNT_EXCEEDS_DUE');
  const id = await d.insert(
    'finance.Discounts',
    {
      StudentId: ch.StudentId,
      AdmissionId: ch.AdmissionId,
      ChargeId: input.chargeId,
      OriginalAmount: dec(ch.OriginalAmount),
      DiscountAmount: dec(input.amount),
      Reason: input.reason,
      Remarks: input.remarks ?? null,
      Status: 'PENDING_APPROVAL',
      RequestedBy: ctx.userId,
    },
    'DiscountId',
  );
  const r = await submitForApproval(d, ctx, {
    type: 'DISCOUNT',
    transactionId: id,
    amount: input.amount,
    description: `Discount ₹${input.amount} on ${ch.FeeHeadName} - ${a.StudentName} (${a.AdmissionNumber})`,
    studentId: Number(ch.StudentId),
  });
  return { discountId: id, ...r };
}

registerApprovalHandler('DISCOUNT', {
  async onApproved(d, id, ctx) {
    const x = await d.one('SELECT * FROM finance.Discounts WITH (UPDLOCK) WHERE DiscountId = @id', { id });
    await lockAdmission(d, Number(x.AdmissionId));
    const ch = await chargeBalance(d, Number(x.ChargeId));
    if (ch.ChargeStatus !== 'ACTIVE' || toPaise(x.DiscountAmount) > toPaise(ch.DueAmount))
      throw badRequest(`Discount now exceeds the amount due on the charge (₹${ch.DueAmount}). Reject this request.`);
    await d.exec(
      `UPDATE finance.Discounts SET Status = N'APPROVED', ApprovedBy = @u, ApprovedAt = SYSUTCDATETIME() WHERE DiscountId = @id;
       UPDATE finance.StudentCharges SET DiscountAmount = DiscountAmount + @amt WHERE ChargeId = @c;`,
      { u: ctx.userId, id, amt: dec(x.DiscountAmount), c: x.ChargeId },
    );
  },
  async onRejected(d, id) {
    await d.exec(`UPDATE finance.Discounts SET Status = N'REJECTED' WHERE DiscountId = @id`, { id });
  },
  async onCancelled(d, id) {
    await d.exec(`UPDATE finance.Discounts SET Status = N'CANCELLED' WHERE DiscountId = @id`, { id });
  },
  describe: (d, id) =>
    d.one(
      `SELECT x.*, cb.FeeHeadName, cb.PeriodName, cb.DueAmount AS ChargeDue, s.StudentName, s.StudentCode, a.AdmissionNumber
       FROM finance.Discounts x JOIN reporting.vw_ChargeBalances cb ON cb.ChargeId = x.ChargeId
       JOIN admission.Students s ON s.StudentId = x.StudentId JOIN admission.Admissions a ON a.AdmissionId = x.AdmissionId
       WHERE x.DiscountId = @id`,
      { id },
    ),
});

export async function requestWaiver(
  d: Db,
  ctx: Ctx,
  input: { chargeId: number; amount: number; reason: string; adjustmentType?: string },
) {
  const ch = await chargeBalance(d, input.chargeId);
  const a = await lockAdmission(d, Number(ch.AdmissionId));
  if (ch.ChargeStatus !== 'ACTIVE') throw badRequest('Charge is not active.');
  const pending = await d.one(
    `SELECT ISNULL(SUM(Amount), 0) AS amt FROM finance.Adjustments WHERE ChargeId = @c AND Status = N'PENDING_APPROVAL'`,
    { c: input.chargeId },
  );
  if (toPaise(input.amount) + toPaise(pending.amt) > toPaise(ch.DueAmount))
    throw badRequest(`Waiver cannot exceed the amount due on the charge (₹${ch.DueAmount}, pending waivers ₹${pending.amt}).`, 'WAIVER_EXCEEDS_DUE');
  const id = await d.insert(
    'finance.Adjustments',
    {
      StudentId: ch.StudentId,
      AdmissionId: ch.AdmissionId,
      ChargeId: input.chargeId,
      AdjustmentType: input.adjustmentType || 'WAIVER',
      Amount: dec(input.amount),
      Reason: input.reason,
      Status: 'PENDING_APPROVAL',
      RequestedBy: ctx.userId,
    },
    'AdjustmentId',
  );
  const r = await submitForApproval(d, ctx, {
    type: 'ADJUSTMENT',
    transactionId: id,
    amount: input.amount,
    description: `Waiver ₹${input.amount} on ${ch.FeeHeadName} - ${a.StudentName} (${a.AdmissionNumber})`,
    studentId: Number(ch.StudentId),
  });
  return { adjustmentId: id, ...r };
}

registerApprovalHandler('ADJUSTMENT', {
  async onApproved(d, id, ctx) {
    const x = await d.one('SELECT * FROM finance.Adjustments WITH (UPDLOCK) WHERE AdjustmentId = @id', { id });
    await lockAdmission(d, Number(x.AdmissionId));
    const ch = await chargeBalance(d, Number(x.ChargeId));
    if (ch.ChargeStatus !== 'ACTIVE' || toPaise(x.Amount) > toPaise(ch.DueAmount))
      throw badRequest(`Waiver now exceeds the amount due on the charge (₹${ch.DueAmount}). Reject this request.`);
    await d.exec(`UPDATE finance.Adjustments SET Status = N'APPROVED', ApprovedBy = @u, ApprovedAt = SYSUTCDATETIME() WHERE AdjustmentId = @id`, {
      u: ctx.userId,
      id,
    });
  },
  async onRejected(d, id) {
    await d.exec(`UPDATE finance.Adjustments SET Status = N'REJECTED' WHERE AdjustmentId = @id`, { id });
  },
  async onCancelled(d, id) {
    await d.exec(`UPDATE finance.Adjustments SET Status = N'CANCELLED' WHERE AdjustmentId = @id`, { id });
  },
  describe: (d, id) =>
    d.one(
      `SELECT x.*, cb.FeeHeadName, cb.PeriodName, cb.DueAmount AS ChargeDue, s.StudentName, s.StudentCode, a.AdmissionNumber
       FROM finance.Adjustments x JOIN reporting.vw_ChargeBalances cb ON cb.ChargeId = x.ChargeId
       JOIN admission.Students s ON s.StudentId = x.StudentId JOIN admission.Admissions a ON a.AdmissionId = x.AdmissionId
       WHERE x.AdjustmentId = @id`,
      { id },
    ),
});

/* ------------------------------------------------------------------ */
/* reversals                                                            */
/* ------------------------------------------------------------------ */
export async function requestReversal(
  d: Db,
  ctx: Ctx,
  input: { transactionType: 'PAYMENT' | 'CHARGE'; transactionId: number; reason: string; reversalDate?: string | null },
) {
  let admissionId: number;
  let amount: number;
  let desc: string;
  if (input.transactionType === 'PAYMENT') {
    const p = await d.one('SELECT * FROM finance.Payments WHERE PaymentId = @id', { id: input.transactionId });
    if (!p) throw notFound('Payment');
    if (p.Status !== 'POSTED') throw badRequest('Only posted payments can be reversed.');
    admissionId = Number(p.AdmissionId);
    amount = p.Amount;
    desc = `Reverse receipt ${p.ReceiptNumber} ₹${p.Amount}`;
  } else {
    const c = await chargeBalance(d, input.transactionId);
    if (c.ChargeStatus !== 'ACTIVE') throw badRequest('Charge is already cancelled.');
    admissionId = Number(c.AdmissionId);
    amount = c.OriginalAmount;
    desc = `Reverse charge ${c.FeeHeadName}${c.PeriodName ? ' - ' + c.PeriodName : ''} ₹${c.OriginalAmount}`;
  }
  const a = await lockAdmission(d, admissionId);
  const open = await d.one(
    `SELECT TOP 1 1 AS x FROM finance.TransactionReversals WHERE OriginalTransactionType = @t AND OriginalTransactionId = @id
       AND Status IN (N'PENDING_APPROVAL', N'APPROVED')`,
    { t: input.transactionType, id: input.transactionId },
  );
  if (open) throw conflict('A reversal for this transaction already exists.');
  const id = await d.insert(
    'finance.TransactionReversals',
    {
      OriginalTransactionType: input.transactionType,
      OriginalTransactionId: input.transactionId,
      AdmissionId: admissionId,
      Amount: dec(amount),
      ReversalDate: input.reversalDate || today(),
      Reason: input.reason,
      Status: 'PENDING_APPROVAL',
      RequestedBy: ctx.userId,
    },
    'ReversalId',
  );
  const r = await submitForApproval(d, ctx, {
    type: 'REVERSAL',
    transactionId: id,
    amount,
    description: `${desc} - ${a.StudentName} (${a.AdmissionNumber}): ${input.reason}`,
    studentId: Number(a.StudentId),
  });
  return { reversalId: id, ...r };
}

async function applyReversal(d: Db, ctx: Ctx, reversalId: number) {
  const r = await d.one('SELECT * FROM finance.TransactionReversals WITH (UPDLOCK) WHERE ReversalId = @id', { id: reversalId });
  await lockAdmission(d, Number(r.AdmissionId));
  if (r.OriginalTransactionType === 'PAYMENT') {
    const p = await d.one('SELECT * FROM finance.Payments WITH (UPDLOCK) WHERE PaymentId = @id', { id: r.OriginalTransactionId });
    if (p.Status !== 'POSTED') throw badRequest('Payment is no longer posted.');
    const refunded = await d.one(
      `SELECT ISNULL(SUM(ra.Amount), 0) AS amt FROM finance.RefundAllocations ra JOIN finance.Advances v ON v.AdvanceId = ra.AdvanceId
       WHERE v.PaymentId = @id`,
      { id: p.PaymentId },
    );
    if (toPaise(refunded.amt) > 0)
      throw badRequest('The advance from this payment has already been refunded; the payment cannot be reversed.');
    await d.exec(
      `UPDATE finance.Payments SET Status = N'REVERSED', UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @u WHERE PaymentId = @id;
       UPDATE finance.Advances SET Status = N'REVERSED' WHERE PaymentId = @id;`,
      { id: p.PaymentId, u: ctx.userId },
    );
    await audit(d, ctx, 'PAYMENT_REVERSED', 'Payment', Number(p.PaymentId), {
      oldValues: { status: 'POSTED', receiptNumber: p.ReceiptNumber, amount: p.Amount },
      newValues: { status: 'REVERSED', reversalId },
      reason: r.Reason,
    });
  } else {
    const c = await chargeBalance(d, Number(r.OriginalTransactionId));
    if (c.ChargeStatus !== 'ACTIVE') throw badRequest('Charge is already cancelled.');
    if (toPaise(c.PaidAmount) + toPaise(c.AdvanceAppliedAmount) + toPaise(c.DiscountAmount) + toPaise(c.WaivedAmount) + toPaise(c.RefundedAmount) > 0)
      throw badRequest('This charge has payments, discounts or waivers against it. Reverse those first.');
    await d.exec(`UPDATE finance.StudentCharges SET ChargeStatus = N'CANCELLED' WHERE ChargeId = @id`, { id: c.ChargeId });
    await audit(d, ctx, 'CHARGE_REVERSED', 'StudentCharge', Number(c.ChargeId), { reason: r.Reason });
  }
  await d.exec(`UPDATE finance.TransactionReversals SET Status = N'APPROVED', ApprovedBy = @u, ApprovedAt = SYSUTCDATETIME() WHERE ReversalId = @id`, {
    u: ctx.userId,
    id: reversalId,
  });
}

registerApprovalHandler('REVERSAL', {
  onApproved: (d, id, ctx) => applyReversal(d, ctx as Ctx, id),
  async onRejected(d, id) {
    await d.exec(`UPDATE finance.TransactionReversals SET Status = N'REJECTED' WHERE ReversalId = @id`, { id });
  },
  async onCancelled(d, id) {
    await d.exec(`UPDATE finance.TransactionReversals SET Status = N'CANCELLED' WHERE ReversalId = @id`, { id });
  },
  async describe(d, id) {
    const r = await d.one('SELECT * FROM finance.TransactionReversals WHERE ReversalId = @id', { id });
    const original =
      r.OriginalTransactionType === 'PAYMENT'
        ? await d.one('SELECT * FROM reporting.vw_PaymentRegister WHERE PaymentId = @id', { id: r.OriginalTransactionId })
        : await d.one('SELECT * FROM reporting.vw_ChargeBalances WHERE ChargeId = @id', { id: r.OriginalTransactionId });
    return { ...r, original };
  },
});

/* ------------------------------------------------------------------ */
/* refunds                                                              */
/* ------------------------------------------------------------------ */
export interface RefundInput {
  admissionId: number;
  amount: number;
  refundType: string;
  reason: string;
  remarks?: string | null;
  originalPaymentId?: number | null;
  allocations?: { chargeId: number; amount: number }[] | null;
}

/** Money that can still be refunded, net of refunds already requested. */
async function refundCapacity(d: Db, admissionId: number, excludeRefundId?: number) {
  const charges = await d.query(
    `SELECT ChargeId, FeeHeadName, PeriodName, PaidAmount, AdvanceAppliedAmount, RefundedAmount
     FROM reporting.vw_ChargeBalances WHERE AdmissionId = @id AND ChargeStatus = N'ACTIVE'`,
    { id: admissionId },
  );
  const adv = await d.one(
    `SELECT ISNULL(SUM(AvailableAmount), 0) AS amt FROM reporting.vw_AdvanceBalances WHERE AdmissionId = @id`,
    { id: admissionId },
  );
  const open = await d.query(
    `SELECT RefundId, RequestedAmount, AllocationPlan FROM finance.Refunds
     WHERE AdmissionId = @id AND Status IN (N'PENDING_APPROVAL', N'APPROVED') AND RefundId <> @ex`,
    { id: admissionId, ex: excludeRefundId ?? 0 },
  );
  const reservedByCharge = new Map<number, number>();
  let reservedAdvance = 0;
  for (const r of open) {
    const plan: { chargeId: number; amount: number }[] = r.AllocationPlan ? JSON.parse(r.AllocationPlan) : [];
    let allocated = 0;
    for (const x of plan) {
      reservedByCharge.set(x.chargeId, (reservedByCharge.get(x.chargeId) || 0) + toPaise(x.amount));
      allocated += toPaise(x.amount);
    }
    reservedAdvance += toPaise(r.RequestedAmount) - allocated;
  }
  const byCharge = new Map<number, { name: string; refundable: number }>();
  for (const c of charges) {
    const refundable =
      toPaise(c.PaidAmount) + toPaise(c.AdvanceAppliedAmount) - toPaise(c.RefundedAmount) - (reservedByCharge.get(Number(c.ChargeId)) || 0);
    byCharge.set(Number(c.ChargeId), { name: `${c.FeeHeadName}${c.PeriodName ? ' - ' + c.PeriodName : ''}`, refundable });
  }
  return { byCharge, advance: toPaise(adv.amt) - reservedAdvance };
}

async function validateRefund(d: Db, admissionId: number, amount: number, allocations: { chargeId: number; amount: number }[], excludeRefundId?: number) {
  const cap = await refundCapacity(d, admissionId, excludeRefundId);
  let allocated = 0;
  for (const x of allocations) {
    const c = cap.byCharge.get(Number(x.chargeId));
    if (!c) throw badRequest(`Charge ${x.chargeId} does not belong to this admission.`);
    if (toPaise(x.amount) > c.refundable)
      throw badRequest(`Refund against ${c.name} exceeds the amount paid on it (₹${toRupees(Math.max(0, c.refundable))} refundable).`, 'REFUND_EXCEEDS_PAID');
    allocated += toPaise(x.amount);
  }
  if (allocated > toPaise(amount)) throw badRequest('Refund allocations exceed the refund amount.');
  const unallocated = toPaise(amount) - allocated;
  if (unallocated > cap.advance)
    throw badRequest(
      `Only ₹${toRupees(Math.max(0, cap.advance))} of advance / excess payment is available to refund. ` +
        'To refund fees already paid, select the fee heads being refunded.',
      'REFUND_EXCEEDS_AVAILABLE',
    );
}

export async function requestRefund(d: Db, ctx: Ctx, input: RefundInput) {
  const a = await lockAdmission(d, input.admissionId);
  const allocations = (input.allocations || []).filter((x) => x.amount > 0);
  await validateRefund(d, input.admissionId, input.amount, allocations);
  if (input.originalPaymentId) {
    const p = await d.one('SELECT AdmissionId, Status FROM finance.Payments WHERE PaymentId = @id', { id: input.originalPaymentId });
    if (!p || Number(p.AdmissionId) !== input.admissionId || p.Status !== 'POSTED') throw badRequest('Original payment is not a posted payment of this admission.');
  }
  const refundNumber = await d.nextDocumentNumber('REFUND', today());
  const id = await d.insert(
    'finance.Refunds',
    {
      StudentId: a.StudentId,
      AdmissionId: input.admissionId,
      OriginalPaymentId: input.originalPaymentId ?? null,
      RefundNumber: refundNumber,
      RefundType: input.refundType,
      RequestedAmount: dec(input.amount),
      AllocationPlan: nvarMax(allocations.length ? JSON.stringify(allocations) : null),
      Reason: input.reason,
      Remarks: input.remarks ?? null,
      Status: 'PENDING_APPROVAL',
      RequestedBy: ctx.userId,
    },
    'RefundId',
  );
  const r = await submitForApproval(d, ctx, {
    type: 'REFUND',
    transactionId: id,
    amount: input.amount,
    description: `Refund ${refundNumber} ₹${input.amount} to ${a.StudentName} (${a.AdmissionNumber}) - ${input.reason}`,
    studentId: Number(a.StudentId),
  });
  return { refundId: id, refundNumber, status: r.autoApproved ? 'APPROVED' : 'PENDING_APPROVAL', approvalRequestId: r.approvalRequestId };
}

registerApprovalHandler('REFUND', {
  async onApproved(d, id, ctx) {
    await d.exec(
      `UPDATE finance.Refunds SET Status = N'APPROVED', ApprovedAmount = RequestedAmount, ApprovedBy = @u, ApprovedAt = SYSUTCDATETIME()
       WHERE RefundId = @id AND Status = N'PENDING_APPROVAL'`,
      { u: ctx.userId, id },
    );
  },
  async onRejected(d, id) {
    await d.exec(`UPDATE finance.Refunds SET Status = N'REJECTED' WHERE RefundId = @id`, { id });
  },
  async onCancelled(d, id) {
    await d.exec(`UPDATE finance.Refunds SET Status = N'CANCELLED' WHERE RefundId = @id`, { id });
  },
  describe: (d, id) =>
    d.one(
      `SELECT r.*, s.StudentName, s.StudentCode, a.AdmissionNumber, sm.Balance, sm.AdvanceAvailable, sm.TotalPayments
       FROM finance.Refunds r JOIN admission.Students s ON s.StudentId = r.StudentId
       JOIN admission.Admissions a ON a.AdmissionId = r.AdmissionId
       JOIN reporting.vw_StudentFeeSummary sm ON sm.AdmissionId = r.AdmissionId
       WHERE r.RefundId = @id`,
      { id },
    ),
  link: (id) => `/refunds/${id}`,
});

export async function processRefund(
  d: Db,
  ctx: Ctx,
  input: { refundId: number; refundModeId: number; refundDate?: string | null; transactionReference?: string | null; remarks?: string | null },
) {
  const r = await d.one('SELECT * FROM finance.Refunds WITH (UPDLOCK) WHERE RefundId = @id', { id: input.refundId });
  if (!r) throw notFound('Refund');
  if (r.Status !== 'APPROVED') throw badRequest('Only approved refunds can be processed.');
  await lockAdmission(d, Number(r.AdmissionId));
  const mode = await d.one('SELECT * FROM finance.PaymentModes WHERE PaymentModeId = @id AND IsActive = 1', { id: input.refundModeId });
  if (!mode) throw badRequest('Invalid refund mode.');
  if (!mode.IsCash && !input.transactionReference?.trim()) throw badRequest('Transaction / cheque reference is required for non-cash refunds.');
  const refundDate = input.refundDate || today();
  if (refundDate > today()) throw badRequest('Refund date cannot be in the future.');

  const amount = toPaise(r.ApprovedAmount);
  const plan: { chargeId: number; amount: number }[] = r.AllocationPlan ? JSON.parse(r.AllocationPlan) : [];
  await validateRefund(d, Number(r.AdmissionId), r.ApprovedAmount, plan, Number(r.RefundId));

  let allocated = 0;
  for (const x of plan) {
    await d.exec(`INSERT INTO finance.RefundAllocations (RefundId, ChargeId, Amount, CreatedBy) VALUES (@r, @c, @a, @u)`, {
      r: r.RefundId,
      c: x.chargeId,
      a: dec(x.amount),
      u: ctx.userId,
    });
    allocated += toPaise(x.amount);
  }
  let fromAdvance = amount - allocated;
  if (fromAdvance > 0) {
    const advances = await d.query(
      `SELECT AdvanceId, AvailableAmount FROM reporting.vw_AdvanceBalances WHERE AdmissionId = @id AND AvailableAmount > 0 ORDER BY AdvanceId`,
      { id: r.AdmissionId },
    );
    for (const adv of advances) {
      if (fromAdvance <= 0) break;
      const amt = Math.min(fromAdvance, toPaise(adv.AvailableAmount));
      await d.exec(
        `INSERT INTO finance.RefundAllocations (RefundId, AdvanceId, Amount, CreatedBy) VALUES (@r, @a, @amt, @u);
         UPDATE finance.Advances SET UtilizedAmount = UtilizedAmount + @amt,
           Status = CASE WHEN OriginalAmount - (UtilizedAmount + @amt) <= 0 THEN N'UTILIZED' ELSE Status END
         WHERE AdvanceId = @a;`,
        { r: r.RefundId, a: adv.AdvanceId, amt: dec(toRupees(amt)), u: ctx.userId },
      );
      fromAdvance -= amt;
    }
    if (fromAdvance > 0) throw badRequest('Not enough advance available to process this refund.');
  }
  await d.exec(
    `UPDATE finance.Refunds SET Status = N'PROCESSED', PaidAmount = ApprovedAmount, RefundDate = @dt, RefundModeId = @m,
       TransactionReference = @ref, Remarks = COALESCE(@rem, Remarks), ProcessedBy = @u, ProcessedAt = SYSUTCDATETIME()
     WHERE RefundId = @id`,
    { dt: refundDate, m: input.refundModeId, ref: input.transactionReference ?? null, rem: input.remarks ?? null, u: ctx.userId, id: r.RefundId },
  );
  await audit(d, ctx, 'REFUND_PROCESSED', 'Refund', Number(r.RefundId), {
    newValues: { amount: r.ApprovedAmount, mode: mode.PaymentModeCode, reference: input.transactionReference },
  });
}
