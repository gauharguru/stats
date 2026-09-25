/* Generic, configurable approval engine (SRS 22-26, 54-55, 73).
   A transaction module submits a request; approvers act on it level by
   level according to workflow.ApprovalRules; when the last level approves,
   the module's onApproved handler runs inside the same DB transaction. */
import { Db, dec } from '../db';
import { audit, AuditContext } from '../lib/audit';
import { AppError, badRequest, forbidden, notFound } from '../lib/errors';
import { getBoolSetting } from '../lib/settings';
import { notifyRoles, notifyUser } from './notifications';

export type TransactionType =
  | 'PAYMENT'
  | 'DISCOUNT'
  | 'ADJUSTMENT'
  | 'REFUND'
  | 'REVERSAL'
  | 'CONSULTANT_PAYABLE'
  | 'CONSULTANT_PAYMENT'
  | 'CONSULTANT_RECOVERY';

export const TRANSACTION_TYPES: TransactionType[] = [
  'PAYMENT', 'DISCOUNT', 'ADJUSTMENT', 'REFUND', 'REVERSAL',
  'CONSULTANT_PAYABLE', 'CONSULTANT_PAYMENT', 'CONSULTANT_RECOVERY',
];

export interface ApprovalHandler {
  /** Final approval: apply the transaction. Throw to block approval. */
  onApproved(d: Db, transactionId: number, ctx: AuditContext): Promise<void>;
  onRejected(d: Db, transactionId: number, ctx: AuditContext, reason: string): Promise<void>;
  onCancelled?(d: Db, transactionId: number, ctx: AuditContext): Promise<void>;
  /** Detail shown to the approver. */
  describe(d: Db, transactionId: number): Promise<unknown>;
  link?(transactionId: number): string;
}

const handlers = new Map<TransactionType, ApprovalHandler>();
export function registerApprovalHandler(type: TransactionType, h: ApprovalHandler) {
  handlers.set(type, h);
}
function handler(type: string): ApprovalHandler {
  const h = handlers.get(type as TransactionType);
  if (!h) throw new Error(`No approval handler for ${type}`);
  return h;
}

interface RuleRow {
  ApprovalLevel: number;
  RoleId: number;
  RoleCode: string;
}

async function matchingRules(d: Db, type: string, amount: number | null): Promise<RuleRow[]> {
  return d.query<RuleRow>(
    `SELECT ar.ApprovalLevel, ar.RoleId, r.RoleCode
     FROM workflow.ApprovalRules ar JOIN security.Roles r ON r.RoleId = ar.RoleId
     WHERE ar.TransactionType = @type AND ar.IsActive = 1 AND r.IsActive = 1
       AND (ar.MinimumAmount IS NULL OR @amount >= ar.MinimumAmount)
       AND (ar.MaximumAmount IS NULL OR @amount <= ar.MaximumAmount)
     ORDER BY ar.ApprovalLevel`,
    { type, amount: dec(amount ?? 0) },
  );
}

export interface SubmitInput {
  type: TransactionType;
  transactionId: number;
  amount: number | null;
  description: string;
  studentId?: number | null;
  consultantId?: number | null;
}

/** Returns { autoApproved: true } when no active rule requires approval. */
export async function submitForApproval(
  d: Db,
  ctx: AuditContext,
  input: SubmitInput,
): Promise<{ autoApproved: boolean; approvalRequestId: number | null }> {
  const rules = await matchingRules(d, input.type, input.amount);
  if (!rules.length) {
    await handler(input.type).onApproved(d, input.transactionId, ctx);
    await audit(d, ctx, `${input.type}_AUTO_APPROVED`, input.type, input.transactionId, {
      reason: 'No approval rule configured for this transaction',
    });
    return { autoApproved: true, approvalRequestId: null };
  }
  const levels = [...new Set(rules.map((r) => r.ApprovalLevel))].sort((a, b) => a - b);
  const id = await d.insert(
    'workflow.ApprovalRequests',
    {
      TransactionType: input.type,
      TransactionId: input.transactionId,
      Amount: dec(input.amount),
      Description: input.description.slice(0, 500),
      StudentId: input.studentId ?? null,
      ConsultantId: input.consultantId ?? null,
      RequestedBy: ctx.userId,
      CurrentLevel: levels[0],
      MaxLevel: levels[levels.length - 1],
      Status: 'PENDING_APPROVAL',
    },
    'ApprovalRequestId',
  );
  await d.exec(
    `INSERT INTO workflow.ApprovalActions (ApprovalRequestId, ApprovalLevel, Action, ActionBy, Comments)
     VALUES (@id, 0, N'SUBMITTED', @by, @c)`,
    { id, by: ctx.userId, c: input.description.slice(0, 500) },
  );
  await notifyRoles(
    d,
    rules.filter((r) => r.ApprovalLevel === levels[0]).map((r) => r.RoleCode),
    'APPROVAL_PENDING',
    `Approval required: ${input.type.replace(/_/g, ' ').toLowerCase()}`,
    input.description,
    `/approvals/${id}`,
    ctx.userId,
  );
  await audit(d, ctx, `${input.type}_SUBMITTED`, input.type, input.transactionId, {
    newValues: { approvalRequestId: id, amount: input.amount },
  });
  return { autoApproved: false, approvalRequestId: id };
}

export async function getRequestForUpdate(d: Db, approvalRequestId: number) {
  const r = await d.one(
    'SELECT * FROM workflow.ApprovalRequests WITH (UPDLOCK, ROWLOCK) WHERE ApprovalRequestId = @id',
    { id: approvalRequestId },
  );
  if (!r) throw notFound('Approval request');
  return r;
}

/** Can this user act on the request at its current level? */
export async function canUserAct(d: Db, request: any, userId: number, userRoles: string[]): Promise<{ ok: boolean; why?: string }> {
  if (request.Status !== 'PENDING_APPROVAL') return { ok: false, why: 'This request is no longer pending.' };
  const rules = await matchingRules(d, request.TransactionType, request.Amount);
  const roleCodes = rules.filter((r) => r.ApprovalLevel === request.CurrentLevel).map((r) => r.RoleCode);
  if (!roleCodes.some((rc) => userRoles.includes(rc)))
    return { ok: false, why: `Level ${request.CurrentLevel} must be approved by: ${roleCodes.join(', ') || 'no active role'}.` };
  const allowSelf = await getBoolSetting(d, 'AllowSelfApproval', false);
  if (!allowSelf && Number(request.RequestedBy) === userId)
    return { ok: false, why: 'You cannot approve a transaction you requested.' };
  const earlier = await d.one(
    `SELECT TOP 1 1 AS x FROM workflow.ApprovalActions
     WHERE ApprovalRequestId = @id AND ActionBy = @u AND Action = N'APPROVED'`,
    { id: request.ApprovalRequestId, u: userId },
  );
  if (earlier && !allowSelf) return { ok: false, why: 'You have already approved an earlier level of this request.' };
  return { ok: true };
}

export async function actOnRequest(
  d: Db,
  ctx: AuditContext & { userId: number },
  userRoles: string[],
  approvalRequestId: number,
  action: 'APPROVE' | 'REJECT',
  comments: string | null,
  rejectionReason: string | null,
) {
  const req = await getRequestForUpdate(d, approvalRequestId);
  const check = await canUserAct(d, req, ctx.userId, userRoles);
  if (!check.ok) throw forbidden(check.why);
  const h = handler(req.TransactionType);

  if (action === 'REJECT') {
    if (!rejectionReason || !rejectionReason.trim()) throw badRequest('A rejection reason is mandatory.', 'REASON_REQUIRED');
    await d.exec(
      `INSERT INTO workflow.ApprovalActions (ApprovalRequestId, ApprovalLevel, Action, ActionBy, Comments, RejectionReason)
       VALUES (@id, @lvl, N'REJECTED', @by, @c, @r)`,
      { id: approvalRequestId, lvl: req.CurrentLevel, by: ctx.userId, c: comments, r: rejectionReason },
    );
    await d.exec(
      `UPDATE workflow.ApprovalRequests SET Status = N'REJECTED', RejectionReason = @r WHERE ApprovalRequestId = @id`,
      { id: approvalRequestId, r: rejectionReason },
    );
    await h.onRejected(d, Number(req.TransactionId), ctx, rejectionReason);
    await audit(d, ctx, `${req.TransactionType}_REJECTED`, req.TransactionType, Number(req.TransactionId), {
      reason: rejectionReason,
      newValues: { approvalRequestId, level: req.CurrentLevel },
    });
    await notifyUser(d, Number(req.RequestedBy), 'TRANSACTION_REJECTED', `Rejected: ${req.Description ?? req.TransactionType}`,
      rejectionReason, `/approvals/${approvalRequestId}`);
    return { status: 'REJECTED' };
  }

  await d.exec(
    `INSERT INTO workflow.ApprovalActions (ApprovalRequestId, ApprovalLevel, Action, ActionBy, Comments)
     VALUES (@id, @lvl, N'APPROVED', @by, @c)`,
    { id: approvalRequestId, lvl: req.CurrentLevel, by: ctx.userId, c: comments },
  );
  const rules = await matchingRules(d, req.TransactionType, req.Amount);
  const nextLevel = rules.map((r) => r.ApprovalLevel).filter((l) => l > req.CurrentLevel).sort((a, b) => a - b)[0];
  if (nextLevel) {
    await d.exec('UPDATE workflow.ApprovalRequests SET CurrentLevel = @lvl WHERE ApprovalRequestId = @id', {
      id: approvalRequestId,
      lvl: nextLevel,
    });
    await audit(d, ctx, `${req.TransactionType}_LEVEL_APPROVED`, req.TransactionType, Number(req.TransactionId), {
      newValues: { approvalRequestId, level: req.CurrentLevel, nextLevel },
    });
    await notifyRoles(d, rules.filter((r) => r.ApprovalLevel === nextLevel).map((r) => r.RoleCode), 'APPROVAL_PENDING',
      `Approval required (level ${nextLevel})`, req.Description ?? '', `/approvals/${approvalRequestId}`, ctx.userId);
    return { status: 'PENDING_APPROVAL', currentLevel: nextLevel };
  }

  await d.exec(
    `UPDATE workflow.ApprovalRequests SET Status = N'APPROVED', FinalApprovedBy = @by, FinalApprovedAt = SYSUTCDATETIME()
     WHERE ApprovalRequestId = @id`,
    { id: approvalRequestId, by: ctx.userId },
  );
  await h.onApproved(d, Number(req.TransactionId), ctx);
  await audit(d, ctx, `${req.TransactionType}_APPROVED`, req.TransactionType, Number(req.TransactionId), {
    newValues: { approvalRequestId, amount: req.Amount },
    reason: comments,
  });
  await notifyUser(d, Number(req.RequestedBy), 'TRANSACTION_APPROVED', `Approved: ${req.Description ?? req.TransactionType}`,
    comments, `/approvals/${approvalRequestId}`);
  return { status: 'APPROVED' };
}

export async function cancelRequest(d: Db, ctx: AuditContext & { userId: number }, isAdmin: boolean, approvalRequestId: number, reason: string) {
  const req = await getRequestForUpdate(d, approvalRequestId);
  if (req.Status !== 'PENDING_APPROVAL') throw badRequest('Only pending requests can be cancelled.');
  if (!isAdmin && Number(req.RequestedBy) !== ctx.userId) throw forbidden('Only the requester or an admin can cancel this request.');
  const h = handler(req.TransactionType);
  if (!h.onCancelled) throw new AppError(400, 'This transaction type cannot be cancelled; reject it instead.');
  await d.exec(
    `INSERT INTO workflow.ApprovalActions (ApprovalRequestId, ApprovalLevel, Action, ActionBy, RejectionReason)
     VALUES (@id, @lvl, N'CANCELLED', @by, @r)`,
    { id: approvalRequestId, lvl: req.CurrentLevel, by: ctx.userId, r: reason },
  );
  await d.exec(`UPDATE workflow.ApprovalRequests SET Status = N'CANCELLED', Remarks = @r WHERE ApprovalRequestId = @id`, {
    id: approvalRequestId,
    r: reason,
  });
  await h.onCancelled(d, Number(req.TransactionId), ctx);
  await audit(d, ctx, `${req.TransactionType}_CANCELLED`, req.TransactionType, Number(req.TransactionId), { reason });
}

export async function describeTransaction(d: Db, type: string, id: number) {
  return handler(type).describe(d, id);
}

export function transactionLink(type: string, id: number): string | null {
  return handlers.get(type as TransactionType)?.link?.(id) ?? null;
}
