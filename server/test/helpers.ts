import request from 'supertest';
import sql from 'mssql';
import { createApp } from '../src/app';
import { config } from '../src/config';
import { closePool, poolConfig } from '../src/db';
import { setup } from '../src/db/setup';

export const app = createApp();

export async function createTestDatabase() {
  await dropTestDatabase();
  await setup(config.db.database, () => undefined);
}

export async function dropTestDatabase() {
  await closePool();
  const master = await new sql.ConnectionPool(poolConfig('master')).connect();
  try {
    await master.request().batch(`
      IF DB_ID(N'${config.db.database}') IS NOT NULL
      BEGIN
        ALTER DATABASE [${config.db.database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
        DROP DATABASE [${config.db.database}];
      END`);
  } finally {
    await master.close();
  }
}

export class Client {
  token = '';
  constructor(public userName: string) {}

  async login(password: string) {
    const r = await request(app).post('/api/auth/login').send({ userName: this.userName, password });
    if (r.status !== 200) throw new Error(`login ${this.userName}: ${r.status} ${JSON.stringify(r.body)}`);
    this.token = r.body.token;
    return r.body;
  }

  get(url: string) {
    return request(app).get('/api' + url).set('Authorization', `Bearer ${this.token}`);
  }
  post(url: string, body: unknown = {}) {
    return request(app).post('/api' + url).set('Authorization', `Bearer ${this.token}`).send(body as object);
  }
  put(url: string, body: unknown = {}) {
    return request(app).put('/api' + url).set('Authorization', `Bearer ${this.token}`).send(body as object);
  }

  /** POST that must succeed; returns body */
  async ok(url: string, body: unknown = {}, status = [200, 201]) {
    const r = await this.post(url, body);
    if (!status.includes(r.status)) throw new Error(`POST ${url} -> ${r.status} ${JSON.stringify(r.body)}`);
    return r.body;
  }
  async getOk(url: string) {
    const r = await this.get(url);
    if (r.status !== 200) throw new Error(`GET ${url} -> ${r.status} ${JSON.stringify(r.body)}`);
    return r.body;
  }
}
