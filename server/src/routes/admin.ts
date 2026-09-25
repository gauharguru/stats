import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, dec, withTx } from '../db';
import { audit, auditCtx } from '../lib/audit';
import { badRequest, notFound } from '../lib/errors';
import { id, nonNegAmount, optStr, parse, str, z } from '../lib/validate';
import { requirePerm } from '../middleware/auth';
import { TRANSACTION_TYPES } from '../services/approval';
import { validatePasswordStrength } from './auth';

export const adminRouter = Router();
const ctxOf = (req: any) => ({ ...auditCtx(req), userId: req.user.userId as number });
const users = requirePerm('USER_MANAGE');
const settings = requirePerm('SETTINGS_MANAGE');

/* ---------------- users --------------------------------------------- */
adminRouter.get('/users', users, async (_req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT u.UserId, u.UserName, u.FullName, u.Email, u.Mobile, u.IsActive, u.MustChangePassword, u.LastLoginAt, u.LockedUntil, u.CreatedAt,
            STUFF((SELECT N',' + r.RoleCode FROM security.UserRoles ur JOIN security.Roles r ON r.RoleId = ur.RoleId
                   WHERE ur.UserId = u.UserId AND ur.IsActive = 1 FOR XML PATH('')), 1, 1, N'') AS Roles
     FROM security.Users u ORDER BY u.FullName`,
  );
  res.json({ rows: rows.map((r) => ({ ...r, Roles: r.Roles ? String(r.Roles).split(',') : [] })) });
});

const userSchema = z.object({
  UserName: str(100).regex(/^[A-Za-z0-9._-]+$/, 'Letters, numbers, dot, dash and underscore only'),
  FullName: str(150),
  Email: optStr(200),
  Mobile: optStr(20),
  Password: z.string().min(1).max(200),
  Roles: z.array(z.string()).min(1, 'Assign at least one role'),
});

async function setRoles(d: any, userId: number, roles: string[], by: number) {
  const valid = await d.query(`SELECT RoleId, RoleCode FROM security.Roles WHERE IsActive = 1`);
  const wanted = valid.filter((r: any) => roles.includes(r.RoleCode));
  if (wanted.length !== roles.length) throw badRequest('Unknown role.');
  await d.exec(`UPDATE security.UserRoles SET IsActive = 0 WHERE UserId = @u`, { u: userId });
  for (const r of wanted) {
    const n = await d.exec(`UPDATE security.UserRoles SET IsActive = 1, AssignedAt = SYSUTCDATETIME(), AssignedBy = @by WHERE UserId = @u AND RoleId = @r`, {
      u: userId, r: r.RoleId, by,
    });
    if (!n) await d.exec(`INSERT INTO security.UserRoles (UserId, RoleId, AssignedBy) VALUES (@u, @r, @by)`, { u: userId, r: r.RoleId, by });
  }
}

adminRouter.post('/users', users, async (req, res) => {
  const b = parse(userSchema, req.body);
  validatePasswordStrength(b.Password);
  const uid = await withTx(async (d) => {
    const hash = await bcrypt.hash(b.Password, 12);
    const i = await d.insert(
      'security.Users',
      { UserName: b.UserName, PasswordHash: hash, FullName: b.FullName, Email: b.Email, Mobile: b.Mobile, MustChangePassword: true, CreatedBy: req.user!.userId },
      'UserId',
    );
    await setRoles(d, i, b.Roles, req.user!.userId);
    await audit(d, ctxOf(req), 'USER_CREATED', 'User', i, { newValues: { UserName: b.UserName, FullName: b.FullName, Roles: b.Roles } });
    return i;
  });
  res.status(201).json({ userId: uid });
});

adminRouter.put('/users/:id', users, async (req, res) => {
  const uid = parse(id, req.params.id);
  const b = parse(userSchema.omit({ UserName: true, Password: true }).partial().extend({ IsActive: z.boolean().optional() }), req.body);
  if (uid === req.user!.userId && (b.IsActive === false || (b.Roles && !b.Roles.includes('ADMIN') && req.user!.roles.includes('ADMIN'))))
    throw badRequest('You cannot deactivate yourself or remove your own admin role.');
  await withTx(async (d) => {
    const old = await d.one('SELECT UserId, FullName, Email, Mobile, IsActive FROM security.Users WHERE UserId = @id', { id: uid });
    if (!old) throw notFound('User');
    await d.exec(
      `UPDATE security.Users SET FullName = COALESCE(@n, FullName), Email = COALESCE(@e, Email), Mobile = COALESCE(@m, Mobile),
         IsActive = COALESCE(@a, IsActive), UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @by WHERE UserId = @id`,
      { n: b.FullName ?? null, e: b.Email ?? null, m: b.Mobile ?? null, a: b.IsActive ?? null, by: req.user!.userId, id: uid },
    );
    if (b.Roles) await setRoles(d, uid, b.Roles, req.user!.userId);
    await audit(d, ctxOf(req), 'USER_UPDATED', 'User', uid, { oldValues: old, newValues: b });
  });
  res.json({ ok: true });
});

adminRouter.post('/users/:id/reset-password', users, async (req, res) => {
  const uid = parse(id, req.params.id);
  const b = parse(z.object({ Password: z.string().min(1).max(200) }), req.body);
  validatePasswordStrength(b.Password);
  await withTx(async (d) => {
    const hash = await bcrypt.hash(b.Password, 12);
    const n = await d.exec(
      `UPDATE security.Users SET PasswordHash = @h, MustChangePassword = 1, FailedLoginCount = 0, LockedUntil = NULL,
         UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @by WHERE UserId = @id`,
      { h: hash, by: req.user!.userId, id: uid },
    );
    if (!n) throw notFound('User');
    await audit(d, ctxOf(req), 'PASSWORD_RESET', 'User', uid);
  });
  res.json({ ok: true });
});

/* ---------------- roles & permissions ------------------------------- */
adminRouter.get('/roles', users, async (_req, res) => {
  const d = await db();
  const [roles, perms, grants] = await d.queryMulti(`
    SELECT * FROM security.Roles ORDER BY RoleId;
    SELECT * FROM security.Permissions ORDER BY ModuleName, PermissionId;
    SELECT rp.RoleId, p.PermissionCode FROM security.RolePermissions rp JOIN security.Permissions p ON p.PermissionId = rp.PermissionId;`);
  res.json({
    roles: roles.map((r: any) => ({ ...r, Permissions: grants.filter((g: any) => g.RoleId === r.RoleId).map((g: any) => g.PermissionCode) })),
    permissions: perms,
  });
});

adminRouter.put('/roles/:id/permissions', users, async (req, res) => {
  const rid = parse(id, req.params.id);
  const b = parse(z.object({ permissions: z.array(z.string()) }), req.body);
  await withTx(async (d) => {
    const role = await d.one('SELECT * FROM security.Roles WHERE RoleId = @id', { id: rid });
    if (!role) throw notFound('Role');
    if (role.RoleCode === 'ADMIN') throw badRequest('The Admin role always has full access.');
    const before = await d.query(
      `SELECT p.PermissionCode FROM security.RolePermissions rp JOIN security.Permissions p ON p.PermissionId = rp.PermissionId WHERE rp.RoleId = @id`,
      { id: rid },
    );
    await d.exec(`DELETE FROM security.RolePermissions WHERE RoleId = @id`, { id: rid });
    for (const code of b.permissions) {
      const n = await d.exec(
        `INSERT INTO security.RolePermissions (RoleId, PermissionId, GrantedBy) SELECT @r, PermissionId, @by FROM security.Permissions WHERE PermissionCode = @c`,
        { r: rid, c: code, by: req.user!.userId },
      );
      if (!n) throw badRequest(`Unknown permission ${code}`);
    }
    await audit(d, ctxOf(req), 'ROLE_PERMISSIONS_CHANGED', 'Role', rid, {
      oldValues: before.map((x) => x.PermissionCode),
      newValues: b.permissions,
    });
  });
  res.json({ ok: true });
});

/* ---------------- approval rules ------------------------------------ */
adminRouter.get('/approval-rules', settings, async (_req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT ar.*, r.RoleCode, r.RoleName FROM workflow.ApprovalRules ar JOIN security.Roles r ON r.RoleId = ar.RoleId
     ORDER BY ar.TransactionType, ar.MinimumAmount, ar.ApprovalLevel`,
  );
  res.json({ rows, transactionTypes: TRANSACTION_TYPES });
});

const ruleSchema = z.object({
  TransactionType: z.enum(TRANSACTION_TYPES as [string, ...string[]]),
  MinimumAmount: nonNegAmount.nullish(),
  MaximumAmount: nonNegAmount.nullish(),
  ApprovalLevel: z.coerce.number().int().min(1).max(9),
  RoleId: id,
  IsActive: z.boolean().default(true),
});

adminRouter.post('/approval-rules', settings, async (req, res) => {
  const b = parse(ruleSchema, req.body);
  const rid = await withTx(async (d) => {
    const i = await d.insert(
      'workflow.ApprovalRules',
      { ...b, MinimumAmount: dec(b.MinimumAmount ?? null), MaximumAmount: dec(b.MaximumAmount ?? null), CreatedBy: req.user!.userId },
      'ApprovalRuleId',
    );
    await audit(d, ctxOf(req), 'APPROVAL_RULE_CREATED', 'ApprovalRule', i, { newValues: b });
    return i;
  });
  res.status(201).json({ approvalRuleId: rid });
});

adminRouter.put('/approval-rules/:id', settings, async (req, res) => {
  const rid = parse(id, req.params.id);
  const b = parse(ruleSchema, req.body);
  await withTx(async (d) => {
    const old = await d.one('SELECT * FROM workflow.ApprovalRules WHERE ApprovalRuleId = @id', { id: rid });
    if (!old) throw notFound('Rule');
    await d.exec(
      `UPDATE workflow.ApprovalRules SET TransactionType = @t, MinimumAmount = @min, MaximumAmount = @max, ApprovalLevel = @l, RoleId = @r, IsActive = @a
       WHERE ApprovalRuleId = @id`,
      { t: b.TransactionType, min: dec(b.MinimumAmount ?? null), max: dec(b.MaximumAmount ?? null), l: b.ApprovalLevel, r: b.RoleId, a: b.IsActive, id: rid },
    );
    await audit(d, ctxOf(req), 'APPROVAL_RULE_UPDATED', 'ApprovalRule', rid, { oldValues: old, newValues: b });
  });
  res.json({ ok: true });
});

/* ---------------- settings ------------------------------------------ */
adminRouter.get('/settings', settings, async (_req, res) => {
  const d = await db();
  res.json({ rows: await d.query('SELECT * FROM dbo.SystemSettings ORDER BY SettingKey') });
});

adminRouter.put('/settings', settings, async (req, res) => {
  const b = parse(z.object({ values: z.record(z.string(), z.string().max(2000)) }), req.body);
  await withTx(async (d) => {
    for (const [k, v] of Object.entries(b.values)) {
      const old = await d.one('SELECT SettingValue FROM dbo.SystemSettings WHERE SettingKey = @k', { k });
      if (!old) throw badRequest(`Unknown setting ${k}`);
      if (old.SettingValue === v) continue;
      await d.exec(`UPDATE dbo.SystemSettings SET SettingValue = @v, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @u WHERE SettingKey = @k`, {
        k, v, u: req.user!.userId,
      });
      await audit(d, ctxOf(req), 'SETTING_CHANGED', 'SystemSetting', null, { oldValues: { [k]: old.SettingValue }, newValues: { [k]: v } });
    }
  });
  res.json({ ok: true });
});

adminRouter.get('/document-types', settings, async (_req, res) => {
  const d = await db();
  const [types, seqs] = await d.queryMulti(`SELECT * FROM dbo.DocumentTypes; SELECT * FROM dbo.DocumentSequences ORDER BY DocumentType, FinancialYear;`);
  res.json({ types, sequences: seqs });
});

adminRouter.put('/document-types/:type', settings, async (req, res) => {
  const b = parse(z.object({ Prefix: str(30), Separator: z.string().max(5), IncludeYear: z.boolean(), NumberWidth: z.coerce.number().int().min(3).max(12) }), req.body);
  await withTx(async (d) => {
    const n = await d.exec(
      `UPDATE dbo.DocumentTypes SET Prefix = @p, Separator = @s, IncludeYear = @y, NumberWidth = @w WHERE DocumentType = @t`,
      { p: b.Prefix, s: b.Separator, y: b.IncludeYear, w: b.NumberWidth, t: req.params.type },
    );
    if (!n) throw notFound('Document type');
    await audit(d, ctxOf(req), 'DOCUMENT_FORMAT_CHANGED', 'DocumentType', null, { newValues: { type: req.params.type, ...b } });
  });
  res.json({ ok: true });
});
