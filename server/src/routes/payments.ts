import { Router } from 'express';
import { db, withTx } from '../db';
import { audit, auditCtx } from '../lib/audit';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { sendRows } from '../lib/export';
import { amountInWords } from '../lib/money';
import { getAllSettings } from '../lib/settings';
import { allocationList, amount, id, optDate, optId, optStr, parse, q, qDate, qNum, str, z } from '../lib/validate';
import { can, requirePerm } from '../middleware/auth';
import {
  createPayment,
  dueCharges,
  processRefund,
  requestDiscount,
  requestRefund,
  requestReversal,
  requestWaiver,
} from '../services/finance';

export const paymentsRouter = Router();
const ctxOf = (req: any) => ({ ...auditCtx(req), userId: req.user.userId as number });

/* ---------------- payments ------------------------------------------ */
paymentsRouter.get('/due/:admissionId', requirePerm('PAYMENT_CREATE', 'STUDENT_VIEW'), async (req, res) => {
  const d = await db();
  const aid = parse(id, req.params.admissionId);
  const rows = await dueCharges(d, aid);
  const [summary] = await d.query('SELECT * FROM reporting.vw_StudentFeeSummary WHERE AdmissionId = @id', { id: aid });
  res.json({ rows, summary });
});

paymentsRouter.post('/', requirePerm('PAYMENT_CREATE'), async (req, res) => {
  const b = parse(
    z.object({
      admissionId: id,
      amount,
      paymentDate: optDate,
      paymentModeId: id,
      transactionReference: optStr(150),
      bankName: optStr(150),
      chequeNumber: optStr(50),
      chequeDate: optDate,
      remarks: optStr(500),
      allocationMethod: z.enum(['FIFO', 'MANUAL']).nullish(),
      allocations: allocationList,
      confirmDuplicateReference: z.boolean().optional(),
    }),
    req.body,
  );
  const out = await withTx((d) => createPayment(d, ctxOf(req), b));
  const d = await db();
  const p = await d.one('SELECT PaymentId, ReceiptNumber, Status, Amount FROM finance.Payments WHERE PaymentId = @id', { id: out.paymentId });
  res.status(201).json({ ...out, receiptNumber: p.ReceiptNumber });
});

/* Payment register (SRS 48) - cashiers with only REPORT_OWN see their own entries */
paymentsRouter.get('/', requirePerm('PAYMENT_VIEW'), async (req, res) => {
  const d = await db();
  const own = !can(req, 'REPORT_VIEW');
  const rows = await d.query(
    `SELECT TOP (@top) * FROM reporting.vw_PaymentRegister
     WHERE (@from IS NULL OR PaymentDate >= @from) AND (@to IS NULL OR PaymentDate <= @to)
       AND (@status IS NULL OR Status = @status) AND (@mode IS NULL OR PaymentModeId = @mode)
       AND (@course IS NULL OR CourseId = @course) AND (@batch IS NULL OR BatchId = @batch)
       AND (@user IS NULL OR SubmittedBy = @user) AND (@admission IS NULL OR AdmissionId = @admission)
       AND (@q IS NULL OR ReceiptNumber LIKE @like OR StudentName LIKE @like OR AdmissionNumber LIKE @like OR TransactionReference LIKE @like)
     ORDER BY PaymentId DESC`,
    {
      top: Math.min(qNum(req, 'top') ?? 1000, 20000),
      from: qDate(req, 'from') ?? null,
      to: qDate(req, 'to') ?? null,
      status: q(req, 'status') ?? null,
      mode: qNum(req, 'paymentModeId') ?? null,
      course: qNum(req, 'courseId') ?? null,
      batch: qNum(req, 'batchId') ?? null,
      user: own ? req.user!.userId : qNum(req, 'userId') ?? null,
      admission: qNum(req, 'admissionId') ?? null,
      q: q(req, 'q') ?? null,
      like: q(req, 'q') ? `%${q(req, 'q')}%` : null,
    },
  );
  sendRows(req, res, rows, 'payment-register');
});

async function paymentDetail(paymentId: number) {
  const d = await db();
  const p = await d.one('SELECT * FROM reporting.vw_PaymentRegister WHERE PaymentId = @id', { id: paymentId });
  if (!p) throw notFound('Payment');
  const [allocations, receipt, reversals, approvals] = await d.queryMulti(
    `SELECT pa.*, cb.FeeHeadName, cb.PeriodName, cb.AcademicYearCode FROM finance.PaymentAllocations pa
       JOIN reporting.vw_ChargeBalances cb ON cb.ChargeId = pa.ChargeId WHERE pa.PaymentId = @id ORDER BY pa.PaymentAllocationId;
     SELECT * FROM finance.Receipts WHERE PaymentId = @id;
     SELECT r.*, u.FullName AS RequestedByName FROM finance.TransactionReversals r JOIN security.Users u ON u.UserId = r.RequestedBy
       WHERE r.OriginalTransactionType = N'PAYMENT' AND r.OriginalTransactionId = @id;
     SELECT * FROM workflow.ApprovalRequests WHERE TransactionType = N'PAYMENT' AND TransactionId = @id;`,
    { id: paymentId },
  );
  return { payment: p, allocations, receipt: receipt[0] ?? null, reversals, approvals };
}

paymentsRouter.get('/:id', requirePerm('PAYMENT_VIEW', 'STUDENT_VIEW'), async (req, res) => {
  const r = await paymentDetail(parse(id, req.params.id));
  if (!can(req, 'REPORT_VIEW') && !can(req, 'STUDENT_VIEW') && Number(r.payment.SubmittedBy) !== req.user!.userId) throw forbidden();
  res.json(r);
});

/* Printable receipt data (SRS 44) */
paymentsRouter.get('/:id/receipt', requirePerm('PAYMENT_VIEW', 'STUDENT_VIEW'), async (req, res) => {
  const r = await paymentDetail(parse(id, req.params.id));
  if (!r.receipt) throw badRequest('Receipt is issued once the payment is posted.');
  const d = await db();
  const s = await getAllSettings(d);
  res.json({
    college: { name: s.CollegeName, address: s.CollegeAddress, phone: s.CollegePhone, logoUrl: s.CollegeLogoUrl },
    ...r,
    amountInWords: amountInWords(r.payment.Amount),
  });
});

paymentsRouter.post('/:id/receipt/printed', requirePerm('PAYMENT_VIEW', 'STUDENT_VIEW'), async (req, res) => {
  const pid = parse(id, req.params.id);
  await withTx(async (d) => {
    const r = await d.one('SELECT * FROM finance.Receipts WITH (UPDLOCK) WHERE PaymentId = @id', { id: pid });
    if (!r) throw notFound('Receipt');
    await d.exec('UPDATE finance.Receipts SET PrintedCount = PrintedCount + 1, LastPrintedAt = SYSUTCDATETIME() WHERE ReceiptId = @id', {
      id: r.ReceiptId,
    });
    await audit(d, ctxOf(req), r.PrintedCount > 0 ? 'RECEIPT_REPRINTED' : 'RECEIPT_PRINTED', 'Receipt', Number(r.ReceiptId), {
      newValues: { receiptNumber: r.ReceiptNumber, printCount: r.PrintedCount + 1 },
    });
  });
  res.json({ ok: true });
});

paymentsRouter.post('/:id/reverse', requirePerm('PAYMENT_REVERSE'), async (req, res) => {
  const b = parse(z.object({ reason: str(500), reversalDate: optDate }), req.body);
  const out = await withTx((d) => requestReversal(d, ctxOf(req), { transactionType: 'PAYMENT', transactionId: parse(id, req.params.id), ...b }));
  res.json(out);
});

/* SRS 76: cheque lifecycle; a bounce raises a reversal request (never deletes the receipt) */
paymentsRouter.post('/:id/cheque-status', requirePerm('CHEQUE_UPDATE'), async (req, res) => {
  const pid = parse(id, req.params.id);
  const b = parse(z.object({ status: z.enum(['DEPOSITED', 'CLEARED', 'BOUNCED', 'CANCELLED']), remarks: optStr(500) }), req.body);
  const out = await withTx(async (d) => {
    const p = await d.one('SELECT * FROM finance.Payments WITH (UPDLOCK) WHERE PaymentId = @id', { id: pid });
    if (!p) throw notFound('Payment');
    if (!p.ChequeStatus) throw badRequest('This payment is not a cheque.');
    if (['BOUNCED', 'CANCELLED'].includes(p.ChequeStatus)) throw badRequest(`Cheque is already ${p.ChequeStatus.toLowerCase()}.`);
    await d.exec('UPDATE finance.Payments SET ChequeStatus = @s, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @u WHERE PaymentId = @id', {
      s: b.status,
      u: req.user!.userId,
      id: pid,
    });
    await audit(d, ctxOf(req), 'CHEQUE_STATUS_CHANGED', 'Payment', pid, {
      oldValues: { chequeStatus: p.ChequeStatus },
      newValues: { chequeStatus: b.status },
      reason: b.remarks,
    });
    if ((b.status === 'BOUNCED' || b.status === 'CANCELLED') && p.Status === 'POSTED') {
      return requestReversal(d, ctxOf(req), {
        transactionType: 'PAYMENT',
        transactionId: pid,
        reason: `Cheque ${p.ChequeNumber} ${b.status.toLowerCase()}${b.remarks ? ': ' + b.remarks : ''}`,
      });
    }
    return { ok: true };
  });
  res.json(out);
});

/* ---------------- discounts / waivers / charge reversal ------------- */
paymentsRouter.post('/discounts', requirePerm('DISCOUNT_REQUEST'), async (req, res) => {
  const b = parse(z.object({ chargeId: id, amount, reason: str(500), remarks: optStr(500) }), req.body);
  res.status(201).json(await withTx((d) => requestDiscount(d, ctxOf(req), b)));
});

paymentsRouter.post('/waivers', requirePerm('ADJUSTMENT_REQUEST'), async (req, res) => {
  const b = parse(
    z.object({ chargeId: id, amount, reason: str(500), adjustmentType: z.enum(['WAIVER', 'CANCELLATION_WAIVER', 'WRITE_OFF']).optional() }),
    req.body,
  );
  res.status(201).json(await withTx((d) => requestWaiver(d, ctxOf(req), b)));
});

paymentsRouter.post('/charges/:id/reverse', requirePerm('PAYMENT_REVERSE'), async (req, res) => {
  const b = parse(z.object({ reason: str(500) }), req.body);
  res.json(await withTx((d) => requestReversal(d, ctxOf(req), { transactionType: 'CHARGE', transactionId: parse(id, req.params.id), ...b })));
});

/* ---------------- refunds ------------------------------------------- */
paymentsRouter.get('/refunds/list', requirePerm('REFUND_REQUEST', 'REFUND_PROCESS', 'REPORT_VIEW'), async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT TOP (@top) r.*, s.StudentName, s.StudentCode, a.AdmissionNumber, c.CourseCode, b.BatchCode, pm.PaymentModeName,
            u.FullName AS RequestedByName, ap.FullName AS ApprovedByName, pr.FullName AS ProcessedByName
     FROM finance.Refunds r
     JOIN admission.Students s ON s.StudentId = r.StudentId
     JOIN admission.Admissions a ON a.AdmissionId = r.AdmissionId
     JOIN academic.Courses c ON c.CourseId = a.CourseId
     JOIN academic.Batches b ON b.BatchId = a.BatchId
     LEFT JOIN finance.PaymentModes pm ON pm.PaymentModeId = r.RefundModeId
     JOIN security.Users u ON u.UserId = r.RequestedBy
     LEFT JOIN security.Users ap ON ap.UserId = r.ApprovedBy
     LEFT JOIN security.Users pr ON pr.UserId = r.ProcessedBy
     WHERE (@status IS NULL OR r.Status = @status)
       AND (@from IS NULL OR CAST(r.CreatedAt AS DATE) >= @from) AND (@to IS NULL OR CAST(r.CreatedAt AS DATE) <= @to)
       AND (@admission IS NULL OR r.AdmissionId = @admission)
     ORDER BY r.RefundId DESC`,
    {
      top: Math.min(qNum(req, 'top') ?? 1000, 20000),
      status: q(req, 'status') ?? null,
      from: qDate(req, 'from') ?? null,
      to: qDate(req, 'to') ?? null,
      admission: qNum(req, 'admissionId') ?? null,
    },
  );
  sendRows(req, res, rows, 'refunds');
});

paymentsRouter.get('/refunds/:id', requirePerm('REFUND_REQUEST', 'REFUND_PROCESS', 'REPORT_VIEW', 'APPROVAL_VIEW'), async (req, res) => {
  const d = await db();
  const rid = parse(id, req.params.id);
  const r = await d.one(
    `SELECT r.*, s.StudentName, s.StudentCode, a.AdmissionNumber, pm.PaymentModeName, op.ReceiptNumber AS OriginalReceiptNumber
     FROM finance.Refunds r JOIN admission.Students s ON s.StudentId = r.StudentId JOIN admission.Admissions a ON a.AdmissionId = r.AdmissionId
     LEFT JOIN finance.PaymentModes pm ON pm.PaymentModeId = r.RefundModeId LEFT JOIN finance.Payments op ON op.PaymentId = r.OriginalPaymentId
     WHERE r.RefundId = @id`,
    { id: rid },
  );
  if (!r) throw notFound('Refund');
  const allocations = await d.query(
    `SELECT ra.*, cb.FeeHeadName, cb.PeriodName FROM finance.RefundAllocations ra LEFT JOIN reporting.vw_ChargeBalances cb ON cb.ChargeId = ra.ChargeId
     WHERE ra.RefundId = @id`,
    { id: rid },
  );
  res.json({ refund: { ...r, AllocationPlan: r.AllocationPlan ? JSON.parse(r.AllocationPlan) : null }, allocations });
});

paymentsRouter.post('/refunds', requirePerm('REFUND_REQUEST'), async (req, res) => {
  const b = parse(
    z.object({
      admissionId: id,
      amount,
      refundType: z.enum(['FULL', 'PARTIAL', 'FEE_HEAD', 'CAUTION_MONEY', 'ADVANCE', 'OTHER']),
      reason: str(500),
      remarks: optStr(500),
      originalPaymentId: optId,
      allocations: allocationList,
    }),
    req.body,
  );
  res.status(201).json(await withTx((d) => requestRefund(d, ctxOf(req), b)));
});

paymentsRouter.post('/refunds/:id/process', requirePerm('REFUND_PROCESS'), async (req, res) => {
  const b = parse(z.object({ refundModeId: id, refundDate: optDate, transactionReference: optStr(150), remarks: optStr(500) }), req.body);
  await withTx((d) => processRefund(d, ctxOf(req), { refundId: parse(id, req.params.id), ...b }));
  res.json({ ok: true, status: 'PROCESSED' });
});
