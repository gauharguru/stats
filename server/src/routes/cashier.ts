import { Router } from 'express';
import { Db, db, dec, withTx } from '../db';
import { audit, auditCtx } from '../lib/audit';
import { today } from '../lib/dates';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { sendRows } from '../lib/export';
import { id, nonNegAmount, optDate, optStr, parse, q, qDate, qNum, str, z } from '../lib/validate';
import { can, requirePerm } from '../middleware/auth';

export const cashierRouter = Router();
const ctxOf = (req: any) => ({ ...auditCtx(req), userId: req.user.userId as number });

/* SRS 41 / 74: figures are computed from transactions, never typed in */
async function computeDay(d: Db, userId: number, date: string) {
  const r = await d.one(
    `SELECT
       (SELECT ISNULL(SUM(p.Amount), 0) FROM finance.Payments p JOIN finance.PaymentModes m ON m.PaymentModeId = p.PaymentModeId
         WHERE p.SubmittedBy = @u AND p.PaymentDate = @dt AND m.IsCash = 1 AND p.Status = N'POSTED') AS CashCollection,
       (SELECT COUNT(*) FROM finance.Payments p JOIN finance.PaymentModes m ON m.PaymentModeId = p.PaymentModeId
         WHERE p.SubmittedBy = @u AND p.PaymentDate = @dt AND m.IsCash = 1 AND p.Status = N'POSTED') AS CashReceipts,
       (SELECT ISNULL(SUM(p.Amount), 0) FROM finance.Payments p JOIN finance.PaymentModes m ON m.PaymentModeId = p.PaymentModeId
         WHERE p.SubmittedBy = @u AND p.PaymentDate = @dt AND m.IsCash = 0 AND p.Status = N'POSTED') AS NonCashCollection,
       (SELECT ISNULL(SUM(r.PaidAmount), 0) FROM finance.Refunds r JOIN finance.PaymentModes m ON m.PaymentModeId = r.RefundModeId
         WHERE r.ProcessedBy = @u AND r.RefundDate = @dt AND m.IsCash = 1 AND r.Status = N'PROCESSED') AS CashRefund,
       (SELECT TOP 1 ActualClosingCash FROM finance.CashierDayClosings
         WHERE UserId = @u AND ClosingDate < @dt AND Status <> N'REJECTED' ORDER BY ClosingDate DESC) AS PreviousClosingCash`,
    { u: userId, dt: date },
  );
  return { ...r, OpeningCash: r.PreviousClosingCash ?? 0 };
}

cashierRouter.get('/day-closing/preview', requirePerm('DAYCLOSE_SUBMIT'), async (req, res) => {
  const d = await db();
  const date = qDate(req, 'date') ?? today();
  const figures = await computeDay(d, req.user!.userId, date);
  const existing = await d.one(
    `SELECT * FROM finance.CashierDayClosings WHERE UserId = @u AND ClosingDate = @dt AND Status <> N'REJECTED'`,
    { u: req.user!.userId, dt: date },
  );
  const receipts = await d.query(
    `SELECT PaymentId, ReceiptNumber, StudentName, AdmissionNumber, PaymentModeName, Amount, Status FROM reporting.vw_PaymentRegister
     WHERE SubmittedBy = @u AND PaymentDate = @dt ORDER BY PaymentId`,
    { u: req.user!.userId, dt: date },
  );
  res.json({ date, figures, existing: existing ?? null, receipts });
});

cashierRouter.post('/day-closing', requirePerm('DAYCLOSE_SUBMIT'), async (req, res) => {
  const b = parse(
    z.object({ closingDate: optDate, openingCash: nonNegAmount.optional(), cashDeposit: nonNegAmount, actualClosingCash: nonNegAmount, remarks: optStr(500) }),
    req.body,
  );
  const date = b.closingDate || today();
  if (date > today()) throw badRequest('Closing date cannot be in the future.');
  const out = await withTx(async (d) => {
    const exists = await d.one(
      `SELECT ClosingId FROM finance.CashierDayClosings WITH (UPDLOCK, HOLDLOCK) WHERE UserId = @u AND ClosingDate = @dt AND Status <> N'REJECTED'`,
      { u: req.user!.userId, dt: date },
    );
    if (exists) throw badRequest('Day closing for this date has already been submitted.');
    const f = await computeDay(d, req.user!.userId, date);
    const opening = b.openingCash ?? f.OpeningCash;
    const expected = opening + f.CashCollection - f.CashRefund - b.cashDeposit;
    if (Math.abs(expected - b.actualClosingCash) >= 0.01 && !b.remarks) throw badRequest('Please explain the cash difference in remarks.');
    const cid = await d.insert(
      'finance.CashierDayClosings',
      {
        UserId: req.user!.userId,
        ClosingDate: date,
        OpeningCash: dec(opening),
        CashCollection: dec(f.CashCollection),
        CashRefund: dec(f.CashRefund),
        CashDeposit: dec(b.cashDeposit),
        ActualClosingCash: dec(b.actualClosingCash),
        Remarks: b.remarks ?? null,
      },
      'ClosingId',
    );
    await audit(d, ctxOf(req), 'DAY_CLOSING_SUBMITTED', 'CashierDayClosing', cid, {
      newValues: { date, opening, ...f, cashDeposit: b.cashDeposit, actual: b.actualClosingCash, difference: b.actualClosingCash - expected },
    });
    return cid;
  });
  res.status(201).json({ closingId: out });
});

cashierRouter.get('/day-closing', requirePerm('DAYCLOSE_SUBMIT', 'DAYCLOSE_VERIFY', 'REPORT_VIEW'), async (req, res) => {
  const d = await db();
  const all = can(req, 'DAYCLOSE_VERIFY') || can(req, 'REPORT_VIEW');
  const rows = await d.query(
    `SELECT TOP (@top) c.*, u.FullName AS CashierName, v.FullName AS VerifiedByName FROM finance.CashierDayClosings c
     JOIN security.Users u ON u.UserId = c.UserId LEFT JOIN security.Users v ON v.UserId = c.VerifiedBy
     WHERE (@user IS NULL OR c.UserId = @user) AND (@status IS NULL OR c.Status = @status)
       AND (@from IS NULL OR c.ClosingDate >= @from) AND (@to IS NULL OR c.ClosingDate <= @to)
     ORDER BY c.ClosingDate DESC, c.ClosingId DESC`,
    {
      top: Math.min(qNum(req, 'top') ?? 500, 5000),
      user: all ? qNum(req, 'userId') ?? null : req.user!.userId,
      status: q(req, 'status') ?? null,
      from: qDate(req, 'from') ?? null,
      to: qDate(req, 'to') ?? null,
    },
  );
  sendRows(req, res, rows, 'cashier-day-closing');
});

cashierRouter.post('/day-closing/:id/verify', requirePerm('DAYCLOSE_VERIFY'), async (req, res) => {
  const b = parse(z.object({ action: z.enum(['VERIFY', 'REJECT']), remarks: optStr(500) }), req.body);
  const cid = parse(id, req.params.id);
  await withTx(async (d) => {
    const c = await d.one('SELECT * FROM finance.CashierDayClosings WITH (UPDLOCK) WHERE ClosingId = @id', { id: cid });
    if (!c) throw notFound('Day closing');
    if (c.Status !== 'SUBMITTED') throw badRequest('Already verified or rejected.');
    if (Number(c.UserId) === req.user!.userId) throw forbidden('You cannot verify your own day closing.');
    if (b.action === 'REJECT' && !b.remarks) throw badRequest('A reason is required to reject.');
    await d.exec(
      `UPDATE finance.CashierDayClosings SET Status = @s, VerifiedBy = @u, VerifiedAt = SYSUTCDATETIME(), VerifierRemarks = @r WHERE ClosingId = @id`,
      { s: b.action === 'VERIFY' ? 'VERIFIED' : 'REJECTED', u: req.user!.userId, r: b.remarks ?? null, id: cid },
    );
    await audit(d, ctxOf(req), b.action === 'VERIFY' ? 'DAY_CLOSING_VERIFIED' : 'DAY_CLOSING_REJECTED', 'CashierDayClosing', cid, {
      reason: b.remarks,
    });
  });
  res.json({ ok: true });
});

