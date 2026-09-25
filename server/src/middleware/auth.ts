import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { db } from '../db';
import { AppError, forbidden } from '../lib/errors';

export interface AuthUser {
  userId: number;
  userName: string;
  fullName: string;
  roles: string[];
  permissions: Set<string>;
  mustChangePassword: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: `${config.jwtHours}h` });
}

export async function loadUser(userId: number): Promise<AuthUser | null> {
  const d = await db();
  const [users, roles, perms] = await d.queryMulti(
    `SELECT UserId, UserName, FullName, IsActive, MustChangePassword FROM security.Users WHERE UserId = @id;
     SELECT r.RoleCode FROM security.UserRoles ur JOIN security.Roles r ON r.RoleId = ur.RoleId
       WHERE ur.UserId = @id AND ur.IsActive = 1 AND r.IsActive = 1;
     SELECT DISTINCT p.PermissionCode FROM security.UserRoles ur
       JOIN security.Roles r ON r.RoleId = ur.RoleId
       JOIN security.RolePermissions rp ON rp.RoleId = r.RoleId
       JOIN security.Permissions p ON p.PermissionId = rp.PermissionId
       WHERE ur.UserId = @id AND ur.IsActive = 1 AND r.IsActive = 1;`,
    { id: userId },
  );
  const u = users[0];
  if (!u || !u.IsActive) return null;
  return {
    userId: Number(u.UserId),
    userName: u.UserName,
    fullName: u.FullName,
    roles: roles.map((r: any) => r.RoleCode),
    permissions: new Set(perms.map((p: any) => p.PermissionCode)),
    mustChangePassword: !!u.MustChangePassword,
  };
}

/** Validates the bearer token and loads the user's current roles/permissions
   from the database on every request, so deactivation takes effect at once. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new AppError(401, 'Please log in.', 'UNAUTHENTICATED'));
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
  } catch {
    return next(new AppError(401, 'Your session has expired. Please log in again.', 'UNAUTHENTICATED'));
  }
  const user = await loadUser(Number(payload.sub));
  if (!user) return next(new AppError(401, 'Your account is not active.', 'UNAUTHENTICATED'));
  req.user = user;
  const path = req.baseUrl + req.path;
  if (user.mustChangePassword && !path.startsWith('/api/auth/')) {
    return next(new AppError(403, 'You must change your password before continuing.', 'PASSWORD_CHANGE_REQUIRED'));
  }
  next();
}

export function can(req: Request, perm: string): boolean {
  return !!req.user?.permissions.has(perm);
}

/** Route guard: user needs ANY of the listed permissions. */
export function requirePerm(...perms: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (perms.some((p) => can(req, p))) return next();
    next(forbidden());
  };
}

export function assertPerm(req: Request, ...perms: string[]) {
  if (!perms.some((p) => can(req, p))) throw forbidden();
}
