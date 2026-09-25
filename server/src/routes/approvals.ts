import { Router } from 'express';
import { db, withTx } from '../db';
import { auditCtx } from '../lib/audit';
import { notFound } from '../lib/errors';
import { sendRows } from '../lib/export';
import { id, optStr, parse, q, qDate, qNum, str, z } from '../lib/validate';
import { can, requirePerm } from '../middleware/auth';
import { actOnRequest, cancelRequest, canUserAct, describeTransaction, transactionLink } from '../services/approval';

export const approvalsRouter = Router();
const ctxOf = (req: any) => ({ ...auditCtx(req), userId: req.user.userId as number });

/* Approval inbox (SRS 54): everything pending, flagged with whether I can act */
approvalsRouter.get('/inbox', requirePerm('APPROVAL_VIEW', 'APPROVAL_ACT'), async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT p.*, s.StudentName, s.StudentCode, c.ConsultantName FROM reporting.vw_PendingApprovals p
     LEFT JOIN admission.Students s ON s.StudentId = p.StudentId LEFT JOIN consultant.Consultants c ON c.ConsultantId = p.ConsultantId
     WHERE (@type IS NULL OR p.TransactionType = @type)
     ORDER BY p.RequestedAt`,
    { type: q(req, 'type') ?? null },
  );
  const out = [];
  for (const r of rows) {
    const chk = can(req, 'APPROVAL_ACT') ? await canUserAct(d, { ...r, Status: 'PENDING_APPROVAL' }, req.user!.userId, req.user!.roles) : { ok: false, why: 'No approval permission' };
    out.push({ ...r, CanAct: chk.ok, CannotActReason: chk.ok ? null : chk.why });
  }
  const mine = q(req, 'mine') === 'true';
  res.json({ rows: mine ? out.filter((r) => r.CanAct) : out });
});

/* Approval history / report */
approvalsRouter.get('/', requirePerm('APPROVAL_VIEW', 'APPROVAL_ACT', 'REPORT_VIEW'), async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT TOP (@top) r.*, u.FullName AS RequestedByName, f.FullName AS FinalApprovedByName, s.StudentName, c.ConsultantName
     FROM workflow.ApprovalRequests r JOIN security.Users u ON u.UserId = r.RequestedBy
     LEFT JOIN security.Users f ON f.UserId = r.FinalApprovedBy
     LEFT JOIN admission.Students s ON s.StudentId = r.StudentId LEFT JOIN consultant.Consultants c ON c.ConsultantId = r.ConsultantId
     WHERE (@type IS NULL OR r.TransactionType = @type) AND (@status IS NULL OR r.Status = @status)
       AND (@from IS NULL OR CAST(r.RequestedAt AS DATE) >= @from) AND (@to IS NULL OR CAST(r.RequestedAt AS DATE) <= @to)
       AND (@mine IS NULL OR r.RequestedBy = @mine)
     ORDER BY r.ApprovalRequestId DESC`,
    {
      top: Math.min(qNum(req, 'top') ?? 500, 5000),
      type: q(req, 'type') ?? null,
      status: q(req, 'status') ?? null,
      from: qDate(req, 'from') ?? null,
      to: qDate(req, 'to') ?? null,
      mine: q(req, 'mine') === 'true' ? req.user!.userId : null,
    },
  );
  sendRows(req, res, rows, 'approvals');
});

approvalsRouter.get('/:id', requirePerm('APPROVAL_VIEW', 'APPROVAL_ACT'), async (req, res) => {
  const d = await db();
  const rid = parse(id, req.params.id);
  const r = await d.one(
    `SELECT r.*, u.FullName AS RequestedByName FROM workflow.ApprovalRequests r JOIN security.Users u ON u.UserId = r.RequestedBy
     WHERE r.ApprovalRequestId = @id`,
    { id: rid },
  );
  if (!r) throw notFound('Approval request');
  const actions = await d.query(
    `SELECT a.*, u.FullName AS ActionByName FROM workflow.ApprovalActions a JOIN security.Users u ON u.UserId = a.ActionBy
     WHERE a.ApprovalRequestId = @id ORDER BY a.ApprovalActionId`,
    { id: rid },
  );
  const detail = await describeTransaction(d, r.TransactionType, Number(r.TransactionId));
  const chk = can(req, 'APPROVAL_ACT') ? await canUserAct(d, r, req.user!.userId, req.user!.roles) : { ok: false, why: 'No approval permission' };
  res.json({ request: r, actions, detail, canAct: chk.ok, cannotActReason: chk.ok ? null : chk.why, link: transactionLink(r.TransactionType, Number(r.TransactionId)) });
});

approvalsRouter.post('/:id/approve', requirePerm('APPROVAL_ACT'), async (req, res) => {
  const b = parse(z.object({ comments: optStr(500) }), req.body ?? {});
  const out = await withTx((d) => actOnRequest(d, ctxOf(req), req.user!.roles, parse(id, req.params.id), 'APPROVE', b.comments, null));
  res.json(out);
});

approvalsRouter.post('/:id/reject', requirePerm('APPROVAL_ACT'), async (req, res) => {
  const b = parse(z.object({ reason: str(500), comments: optStr(500) }), req.body ?? {});
  const out = await withTx((d) => actOnRequest(d, ctxOf(req), req.user!.roles, parse(id, req.params.id), 'REJECT', b.comments, b.reason));
  res.json(out);
});

approvalsRouter.post('/:id/cancel', async (req, res) => {
  const b = parse(z.object({ reason: str(500) }), req.body ?? {});
  await withTx((d) => cancelRequest(d, ctxOf(req), req.user!.roles.includes('ADMIN'), parse(id, req.params.id), b.reason));
  res.json({ ok: true });
});
