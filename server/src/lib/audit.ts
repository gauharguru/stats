import type { Request } from 'express';
import { Db, nvarMax } from '../db';

export interface AuditContext {
  userId: number | null;
  ip?: string | null;
  userAgent?: string | null;
}

export function auditCtx(req: Request): AuditContext {
  return {
    userId: req.user?.userId ?? null,
    ip: (req.ip || req.socket?.remoteAddress || '').slice(0, 50),
    userAgent: (req.headers['user-agent'] || '').slice(0, 500),
  };
}

/** Writes an audit record inside the caller's transaction. */
export async function audit(
  d: Db,
  ctx: AuditContext,
  actionType: string,
  entityName: string,
  entityId: number | null,
  opts: { oldValues?: unknown; newValues?: unknown; reason?: string | null } = {},
) {
  await d.exec(
    `INSERT INTO audit.AuditLogs (UserId, ActionType, EntityName, EntityId, OldValues, NewValues, IpAddress, UserAgent, Reason)
     VALUES (@UserId, @ActionType, @EntityName, @EntityId, @OldValues, @NewValues, @Ip, @Ua, @Reason)`,
    {
      UserId: ctx.userId,
      ActionType: actionType,
      EntityName: entityName,
      EntityId: entityId,
      OldValues: nvarMax(opts.oldValues === undefined ? null : JSON.stringify(opts.oldValues)),
      NewValues: nvarMax(opts.newValues === undefined ? null : JSON.stringify(opts.newValues)),
      Ip: ctx.ip ?? null,
      Ua: ctx.userAgent ?? null,
      Reason: opts.reason ?? null,
    },
  );
}
