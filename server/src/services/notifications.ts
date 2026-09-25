import { Db } from '../db';

/** In-app notifications (email / SMS / WhatsApp can hook in here later). */
export async function notifyUser(d: Db, userId: number, eventType: string, title: string, message: string | null, link: string | null) {
  await d.exec(
    `INSERT INTO dbo.Notifications (UserId, EventType, Title, Message, Link) VALUES (@u, @e, @t, @m, @l)`,
    { u: userId, e: eventType, t: title.slice(0, 200), m: message?.slice(0, 1000) ?? null, l: link },
  );
}

export async function notifyRoles(
  d: Db,
  roleCodes: string[],
  eventType: string,
  title: string,
  message: string | null,
  link: string | null,
  exceptUserId?: number | null,
) {
  if (!roleCodes.length) return;
  const params: Record<string, unknown> = { e: eventType, t: title.slice(0, 200), m: message?.slice(0, 1000) ?? null, l: link, x: exceptUserId ?? 0 };
  const names = roleCodes.map((rc, i) => {
    params[`r${i}`] = rc;
    return `@r${i}`;
  });
  await d.exec(
    `INSERT INTO dbo.Notifications (UserId, EventType, Title, Message, Link)
     SELECT DISTINCT u.UserId, @e, @t, @m, @l
     FROM security.Users u
     JOIN security.UserRoles ur ON ur.UserId = u.UserId AND ur.IsActive = 1
     JOIN security.Roles r ON r.RoleId = ur.RoleId
     WHERE u.IsActive = 1 AND r.RoleCode IN (${names.join(', ')}) AND u.UserId <> @x`,
    params,
  );
}
