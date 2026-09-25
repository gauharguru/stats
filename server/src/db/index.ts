import sql from 'mssql';
import { config } from '../config';

export { sql };

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function poolConfig(database = config.db.database): sql.config {
  return {
    server: config.db.server,
    port: config.db.port,
    database,
    user: config.db.user,
    password: config.db.password,
    options: {
      encrypt: config.db.encrypt,
      trustServerCertificate: config.db.trustServerCertificate,
      enableArithAbort: true,
    },
    pool: { max: 20, min: 0, idleTimeoutMillis: 30000 },
    requestTimeout: 60000,
  };
}

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(poolConfig()).connect().catch((e) => {
      poolPromise = null;
      throw e;
    });
  }
  return poolPromise;
}

export async function closePool(): Promise<void> {
  if (poolPromise) {
    const p = await poolPromise;
    poolPromise = null;
    await p.close();
  }
}

/** Explicitly typed parameter. Plain values are inferred (see bind()). */
export interface TypedParam {
  __typed: true;
  type: sql.ISqlType | (() => sql.ISqlType);
  value: unknown;
}
export const dec = (value: number | null | undefined): TypedParam => ({ __typed: true, type: sql.Decimal(18, 2), value });
export const nvarMax = (value: string | null | undefined): TypedParam => ({ __typed: true, type: sql.NVarChar(sql.MAX), value });

export type Params = Record<string, unknown>;
type Runner = sql.ConnectionPool | sql.Transaction;

function bind(req: sql.Request, params: Params) {
  for (const [name, raw] of Object.entries(params)) {
    if (raw && typeof raw === 'object' && (raw as TypedParam).__typed) {
      const t = raw as TypedParam;
      req.input(name, t.type as sql.ISqlType, t.value);
    } else if (raw === undefined || raw === null) {
      req.input(name, sql.NVarChar(sql.MAX), null);
    } else if (typeof raw === 'number') {
      if (Number.isInteger(raw)) req.input(name, sql.BigInt, raw);
      else req.input(name, sql.Decimal(18, 2), raw);
    } else if (typeof raw === 'boolean') {
      req.input(name, sql.Bit, raw);
    } else if (raw instanceof Date) {
      req.input(name, sql.DateTime2(3), raw);
    } else {
      req.input(name, sql.NVarChar(sql.MAX), String(raw));
    }
  }
}

/** DATE columns come back as JS Date objects at UTC midnight - expose them as YYYY-MM-DD. */
function normaliseRows<T>(rs: sql.IRecordSet<any>): T[] {
  const cols = rs.columns ? Object.values(rs.columns) : [];
  const dateCols = cols.filter((c: any) => c.type === sql.Date || c.type?.declaration === 'date').map((c: any) => c.name);
  const decCols = cols
    .filter((c: any) => c.type === sql.Decimal || c.type === sql.Numeric || c.type === sql.BigInt ||
      ['decimal', 'numeric', 'bigint'].includes(c.type?.declaration))
    .map((c: any) => c.name);
  if (!dateCols.length && !decCols.length) return rs as unknown as T[];
  return rs.map((row: any) => {
    for (const c of dateCols) {
      if (row[c] instanceof Date) row[c] = row[c].toISOString().slice(0, 10);
    }
    for (const c of decCols) {
      if (typeof row[c] === 'string') row[c] = Number(row[c]);
    }
    return row;
  }) as T[];
}

export class Db {
  constructor(private runner: Runner) {}

  request(): sql.Request {
    return new sql.Request(this.runner as any);
  }

  async query<T = any>(text: string, params: Params = {}): Promise<T[]> {
    const req = this.request();
    bind(req, params);
    const res = await req.query(text);
    return res.recordset ? normaliseRows<T>(res.recordset) : [];
  }

  async queryMulti(text: string, params: Params = {}): Promise<any[][]> {
    const req = this.request();
    bind(req, params);
    const res = await req.query(text);
    return (res.recordsets as sql.IRecordSet<any>[]).map((rs) => normaliseRows(rs));
  }

  async one<T = any>(text: string, params: Params = {}): Promise<T | undefined> {
    const rows = await this.query<T>(text, params);
    return rows[0];
  }

  async exec(text: string, params: Params = {}): Promise<number> {
    const req = this.request();
    bind(req, params);
    const res = await req.query(text);
    return res.rowsAffected.reduce((a, b) => a + b, 0);
  }

  /** INSERT ... OUTPUT INSERTED.<idCol> helper. */
  async insert(table: string, values: Params, idCol: string): Promise<number> {
    const cols = Object.keys(values);
    const text = `INSERT INTO ${table} (${cols.join(', ')}) OUTPUT INSERTED.${idCol} AS id VALUES (${cols
      .map((c) => '@' + c)
      .join(', ')})`;
    const row = await this.one<{ id: number | string }>(text, values);
    return Number(row!.id);
  }

  async nextDocumentNumber(documentType: string, businessDate: string): Promise<string> {
    const req = this.request();
    req.input('DocumentType', sql.NVarChar(50), documentType);
    req.input('BusinessDate', sql.Date, businessDate);
    req.output('DocumentNumber', sql.NVarChar(50));
    const res = await req.execute('dbo.usp_NextDocumentNumber');
    return res.output.DocumentNumber as string;
  }
}

export async function db(): Promise<Db> {
  return new Db(await getPool());
}

/** Run fn inside a SQL Server transaction; rolls back on any error. */
export async function withTx<T>(fn: (tx: Db) => Promise<T>, isolation = sql.ISOLATION_LEVEL.READ_COMMITTED): Promise<T> {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin(isolation);
  let rolledBack = false;
  tx.on('rollback', () => {
    rolledBack = true;
  });
  try {
    const result = await fn(new Db(tx));
    await tx.commit();
    return result;
  } catch (e) {
    if (!rolledBack) {
      try {
        await tx.rollback();
      } catch {
        /* already aborted by SQL Server (XACT_ABORT) */
      }
    }
    throw e;
  }
}
