/* Creates the database (if needed), applies pending migration scripts from
   /database/migrations in order and creates the first Admin user.
   Usage:  npm run db:setup                                               */
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import sql from 'mssql';
import { config } from '../config';
import { poolConfig } from './index';

export const MIGRATIONS_DIR = path.resolve(__dirname, '../../../database/migrations');

/** Split a script on lines containing only GO (sqlcmd batch separator). */
export function splitBatches(script: string): string[] {
  return script
    .split(/^\s*GO\s*;?\s*$/gim)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
}

export async function ensureDatabase(database = config.db.database): Promise<void> {
  const master = await new sql.ConnectionPool(poolConfig('master')).connect();
  try {
    const r = await master.request().input('name', sql.NVarChar, database).query('SELECT DB_ID(@name) AS id');
    if (r.recordset[0].id === null) {
      if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error('Invalid database name');
      await master.request().batch(`CREATE DATABASE [${database}]`);
      console.log(`Created database ${database}`);
    }
  } finally {
    await master.close();
  }
}

export async function migrate(database = config.db.database, log = console.log): Promise<void> {
  const pool = await new sql.ConnectionPool(poolConfig(database)).connect();
  try {
    await pool.request().batch(`
      IF OBJECT_ID('dbo.SchemaMigrations') IS NULL
        CREATE TABLE dbo.SchemaMigrations (
          FileName NVARCHAR(200) NOT NULL PRIMARY KEY,
          AppliedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME())`);
    const applied = new Set(
      (await pool.request().query('SELECT FileName FROM dbo.SchemaMigrations')).recordset.map((r: any) => r.FileName),
    );
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      if (applied.has(file)) continue;
      log(`Applying ${file} ...`);
      const batches = splitBatches(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
      const tx = new sql.Transaction(pool);
      await tx.begin();
      try {
        for (const b of batches) await new sql.Request(tx).batch(b);
        await new sql.Request(tx).input('f', sql.NVarChar, file).query('INSERT INTO dbo.SchemaMigrations (FileName) VALUES (@f)');
        await tx.commit();
      } catch (e) {
        await tx.rollback().catch(() => undefined);
        throw new Error(`Migration ${file} failed: ${(e as Error).message}`);
      }
    }
  } finally {
    await pool.close();
  }
}

export async function ensureAdmin(database = config.db.database, log = console.log): Promise<void> {
  const pool = await new sql.ConnectionPool(poolConfig(database)).connect();
  try {
    const exists = await pool.request().query(`
      SELECT TOP 1 1 AS x FROM security.UserRoles ur JOIN security.Roles r ON r.RoleId = ur.RoleId
      WHERE r.RoleCode = 'ADMIN' AND ur.IsActive = 1`);
    if (exists.recordset.length) return;
    const hash = await bcrypt.hash(config.admin.password, 12);
    const r = await pool
      .request()
      .input('u', sql.NVarChar, config.admin.userName)
      .input('h', sql.NVarChar, hash)
      .query(`
        INSERT INTO security.Users (UserName, PasswordHash, FullName, MustChangePassword)
        OUTPUT INSERTED.UserId VALUES (@u, @h, N'System Administrator', 1)`);
    const userId = r.recordset[0].UserId;
    await pool.request().input('id', sql.BigInt, userId).query(`
      INSERT INTO security.UserRoles (UserId, RoleId) SELECT @id, RoleId FROM security.Roles WHERE RoleCode = 'ADMIN'`);
    log(`Created admin user "${config.admin.userName}" (password must be changed at first login).`);
  } finally {
    await pool.close();
  }
}

export async function setup(database = config.db.database, log = console.log) {
  await ensureDatabase(database);
  await migrate(database, log);
  await ensureAdmin(database, log);
}

if (require.main === module) {
  setup()
    .then(() => {
      console.log('Database is up to date.');
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
