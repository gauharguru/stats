import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { db, withTx } from '../db';
import { audit, auditCtx } from '../lib/audit';
import { AppError, badRequest } from '../lib/errors';
import { getSetting } from '../lib/settings';
import { parse, str, z } from '../lib/validate';
import { authenticate, signToken } from '../middleware/auth';

export const authRouter = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });

export function validatePasswordStrength(pw: string) {
  if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw))
    throw badRequest('Password must be at least 8 characters and contain letters and numbers.', 'WEAK_PASSWORD');
}

authRouter.post('/login', loginLimiter, async (req, res) => {
  const body = parse(z.object({ userName: str(100), password: z.string().min(1).max(200) }), req.body);
  const d = await db();
  const u = await d.one('SELECT * FROM security.Users WHERE UserName = @u', { u: body.userName });
  const ctx = { ...auditCtx(req), userId: u ? Number(u.UserId) : null };
  const fail = async (msg: string) => {
    await audit(d, ctx, 'LOGIN_FAILED', 'User', u ? Number(u.UserId) : null, { reason: `${body.userName}: ${msg}` });
    throw new AppError(401, msg, 'LOGIN_FAILED');
  };
  if (!u || !u.IsActive) return fail('Invalid username or password.');
  if (u.LockedUntil && new Date(u.LockedUntil) > new Date())
    return fail('Account temporarily locked after repeated failed logins. Try again later or contact the admin.');
  const ok = await bcrypt.compare(body.password, u.PasswordHash);
  if (!ok) {
    const max = Number(await getSetting(d, 'MaxFailedLogins', '5')) || 5;
    const lockMin = Number(await getSetting(d, 'LockoutMinutes', '15')) || 15;
    await d.exec(
      `UPDATE security.Users SET FailedLoginCount = FailedLoginCount + 1,
         LockedUntil = CASE WHEN FailedLoginCount + 1 >= @max THEN DATEADD(MINUTE, @lock, SYSUTCDATETIME()) ELSE LockedUntil END
       WHERE UserId = @id`,
      { id: u.UserId, max, lock: lockMin },
    );
    return fail('Invalid username or password.');
  }
  await d.exec(`UPDATE security.Users SET FailedLoginCount = 0, LockedUntil = NULL, LastLoginAt = SYSUTCDATETIME() WHERE UserId = @id`, {
    id: u.UserId,
  });
  await audit(d, ctx, 'LOGIN', 'User', Number(u.UserId));
  const timeout = Number(await getSetting(d, 'SessionTimeoutMinutes', '30')) || 30;
  res.json({ token: signToken(Number(u.UserId)), mustChangePassword: !!u.MustChangePassword, sessionTimeoutMinutes: timeout });
});

authRouter.use(authenticate);

authRouter.get('/me', async (req, res) => {
  const u = req.user!;
  const d = await db();
  const timeout = Number(await getSetting(d, 'SessionTimeoutMinutes', '30')) || 30;
  const unread = await d.one('SELECT COUNT(*) AS n FROM dbo.Notifications WHERE UserId = @u AND IsRead = 0', { u: u.userId });
  res.json({
    userId: u.userId,
    userName: u.userName,
    fullName: u.fullName,
    roles: u.roles,
    permissions: [...u.permissions],
    mustChangePassword: u.mustChangePassword,
    sessionTimeoutMinutes: timeout,
    unreadNotifications: unread.n,
  });
});

authRouter.post('/logout', async (req, res) => {
  const d = await db();
  await audit(d, auditCtx(req), 'LOGOUT', 'User', req.user!.userId);
  res.json({ ok: true });
});

authRouter.post('/change-password', async (req, res) => {
  const body = parse(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(1).max(200) }), req.body);
  validatePasswordStrength(body.newPassword);
  await withTx(async (d) => {
    const u = await d.one('SELECT PasswordHash FROM security.Users WHERE UserId = @id', { id: req.user!.userId });
    if (!(await bcrypt.compare(body.currentPassword, u.PasswordHash))) throw badRequest('Current password is incorrect.');
    if (body.currentPassword === body.newPassword) throw badRequest('New password must be different.');
    const hash = await bcrypt.hash(body.newPassword, 12);
    await d.exec(
      `UPDATE security.Users SET PasswordHash = @h, MustChangePassword = 0, PasswordChangedAt = SYSUTCDATETIME(),
         UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @id WHERE UserId = @id`,
      { h: hash, id: req.user!.userId },
    );
    await audit(d, auditCtx(req), 'PASSWORD_CHANGED', 'User', req.user!.userId);
  });
  res.json({ ok: true });
});

authRouter.get('/notifications', async (req, res) => {
  const d = await db();
  const rows = await d.query(
    'SELECT TOP 50 * FROM dbo.Notifications WHERE UserId = @u ORDER BY NotificationId DESC',
    { u: req.user!.userId },
  );
  res.json({ rows });
});

authRouter.post('/notifications/read', async (req, res) => {
  const d = await db();
  await d.exec('UPDATE dbo.Notifications SET IsRead = 1 WHERE UserId = @u AND IsRead = 0', { u: req.user!.userId });
  res.json({ ok: true });
});
