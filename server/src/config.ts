import 'dotenv/config';

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export const config = {
  db: {
    server: env('DB_SERVER', 'localhost'),
    port: Number(env('DB_PORT', '1433')),
    database: env('DB_NAME', 'AHS_SFM'),
    user: env('DB_USER', 'sa'),
    password: env('DB_PASSWORD', ''),
    encrypt: env('DB_ENCRYPT', 'false') === 'true',
    trustServerCertificate: env('DB_TRUST_SERVER_CERTIFICATE', 'true') === 'true',
  },
  port: Number(env('PORT', '4000')),
  jwtSecret: env('JWT_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev-only-secret-change-me'),
  jwtHours: Number(env('JWT_HOURS', '10')),
  timeZone: env('BUSINESS_TIMEZONE', 'Asia/Kolkata'),
  admin: {
    userName: env('ADMIN_USERNAME', 'admin'),
    password: env('ADMIN_PASSWORD', 'Admin@12345'),
  },
};
