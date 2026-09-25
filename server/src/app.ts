import fs from 'node:fs';
import path from 'node:path';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppError } from './lib/errors';
import { authenticate } from './middleware/auth';
import { adminRouter } from './routes/admin';
import { admissionsRouter } from './routes/admissions';
import { approvalsRouter } from './routes/approvals';
import { authRouter } from './routes/auth';
import { cashierRouter } from './routes/cashier';
import { consultantsRouter } from './routes/consultants';
import { dashboardRouter } from './routes/dashboard';
import { mastersRouter } from './routes/masters';
import { paymentsRouter } from './routes/payments';
import { reportsRouter } from './routes/reports';
import { studentsRouter } from './routes/students';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
        },
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  const api = express.Router();
  api.get('/health', (_req, res) => res.json({ ok: true }));
  api.use('/auth', authRouter);
  api.use(authenticate);
  api.use('/dashboard', dashboardRouter);
  api.use('/masters', mastersRouter);
  api.use('/students', studentsRouter);
  api.use('/admissions', admissionsRouter);
  api.use('/payments', paymentsRouter);
  api.use('/consultants', consultantsRouter);
  api.use('/approvals', approvalsRouter);
  api.use('/cashier', cashierRouter);
  api.use('/reports', reportsRouter);
  api.use('/admin', adminRouter);
  api.use((_req, _res, next) => next(new AppError(404, 'Not found', 'NOT_FOUND')));
  app.use('/api', api);

  /* Serve the built web app (web/dist) in production */
  const webDist = path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.status).json({ error: err.message, code: err.code, details: err.details });
    }
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body', code: 'BAD_JSON' });
    /* SQL Server errors raised by our integrity triggers (THROW 50000-50999) */
    const num = err?.number ?? err?.originalError?.info?.number;
    if (num >= 50000 && num < 51000) return res.status(400).json({ error: err.message, code: `DB_RULE_${num}` });
    if (num === 2627 || num === 2601)
      return res.status(409).json({ error: 'A record with the same unique value already exists.', code: 'DUPLICATE', details: err.message });
    if (num === 547) return res.status(400).json({ error: 'The operation violates a data integrity rule.', code: 'CONSTRAINT', details: err.message });
    if (num === 1205) return res.status(409).json({ error: 'The system was busy. Please try again.', code: 'DEADLOCK' });
    console.error(err);
    res.status(500).json({ error: 'Unexpected server error.', code: 'SERVER_ERROR' });
  });
  return app;
}
