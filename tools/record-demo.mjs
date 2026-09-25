/* Records API responses from a running server (loaded with `npm run db:demo`)
   into web/demo-public/demo-data.json. That file powers the read-only
   GitHub Pages demo (web built with VITE_DEMO=1).
   Usage: node tools/record-demo.mjs [http://localhost:4000] [adminPassword]   */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.argv[2] || 'http://localhost:4000') + '/api';
const ADMIN_PW = process.argv[3] || 'Admin@12345';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../web/demo-public/demo-data.json');
const USERS = { admin: ADMIN_PW, cashier: 'Demo@1234', principal: 'Demo@1234', accountant: 'Demo@1234' };

async function login(u) {
  const r = await fetch(BASE + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userName: u, password: USERS[u] }) });
  if (!r.ok) throw new Error(`login ${u} failed`);
  return (await r.json()).token;
}
async function get(token, url) {
  const r = await fetch(BASE + url, { headers: { Authorization: 'Bearer ' + token } });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body };
}
const qs = (o) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(o)) if (v !== '' && v != null) p.set(k, String(v)); const s = p.toString(); return s ? '?' + s : ''; };
const shift = (d, n) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);

const admin = await login('admin');
const dash = (await get(admin, '/dashboard')).body;
const T = dash.date;
const L = (await get(admin, '/masters/lookups')).body;
const ranges = [[T, T], [shift(T, -6), T], [T.slice(0, 8) + '01', T], ['2026-01-01', T]];

const urls = new Set([
  '/auth/me', '/auth/notifications', '/dashboard', '/masters/lookups', '/students', '/admissions', '/payments', `/payments${qs({ from: T, to: T })}`,
  '/payments/refunds/list', '/approvals/inbox?mine=true', '/approvals/inbox?mine=false', '/approvals', '/consultants',
  `/cashier/day-closing/preview${qs({ date: T })}`, '/cashier/day-closing', '/reports/due?status=ACTIVE', '/reports/due',
  '/reports/fee-summary?by=course', '/reports/fee-summary?by=batch', '/reports/admission-history',
  '/reports/consultant-outstanding', '/reports/consultant-acquisition-cost', '/reports/cancelled-admission-consultant',
  '/reports/consultant-payments', '/reports/consultant-recoveries', `/reports/audit${qs({ from: shift(T, -7), to: T })}`, '/reports/audit',
  '/admin/users', '/admin/roles', '/admin/approval-rules', '/admin/settings', '/admin/document-types',
]);
for (const [from, to] of ranges) {
  urls.add(`/reports/net-collection${qs({ from, to })}`);
  for (const g of ['date', 'mode', 'cashier', 'course', 'batch', 'feehead']) urls.add(`/reports/collection${qs({ from, to, groupBy: g })}`);
}
for (const t of ['discounts', 'waivers', 'reversals']) { urls.add(`/reports/${t}${qs({ from: shift(T, -30), to: T })}`); urls.add(`/reports/${t}`); }
for (const b of L.batches) urls.add(`/masters/batches/${b.BatchId}/seats`);
for (const c of L.courses)
  for (const p of L.feePeriods.filter((p) => p.CourseId === c.CourseId))
    for (const y of L.academicYears) {
      urls.add(`/masters/fee-structures${qs({ courseId: c.CourseId, includeCourseWide: 'false', academicYearId: y.AcademicYearId, feePeriodId: p.FeePeriodId })}`);
      for (const b of L.batches.filter((b) => b.CourseId === c.CourseId))
        urls.add(`/masters/fee-structures${qs({ courseId: c.CourseId, batchId: b.BatchId, includeCourseWide: 'false', academicYearId: y.AcademicYearId, feePeriodId: p.FeePeriodId })}`);
    }
for (const s of (await get(admin, '/students')).body.rows) urls.add(`/students/${s.StudentId}`);
for (const a of (await get(admin, '/admissions')).body.rows)
  for (const x of ['', '/financial', '/charges', '/ledger', '/statement']) { urls.add(`/admissions/${a.AdmissionId}${x}`); urls.add(`/payments/due/${a.AdmissionId}`); }
for (const p of (await get(admin, '/payments')).body.rows) { urls.add(`/payments/${p.PaymentId}`); if (p.ReceiptNumber) urls.add(`/payments/${p.PaymentId}/receipt`); }
for (const r of (await get(admin, '/payments/refunds/list')).body.rows) urls.add(`/payments/refunds/${r.RefundId}`);
for (const r of (await get(admin, '/approvals')).body.rows) urls.add(`/approvals/${r.ApprovalRequestId}`);
for (const c of (await get(admin, '/consultants')).body.rows)
  for (const x of ['', '/students', '/payables', '/payments', '/recoveries', '/ledger', '/statement']) urls.add(`/consultants/${c.ConsultantId}${x}`);

const out = { meta: { today: T, recordedAt: new Date().toISOString() }, roles: {} };
for (const u of ['admin', 'accountant', 'cashier', 'principal']) {
  const token = u === 'admin' ? admin : await login(u);
  const responses = {};
  for (const url of urls) responses[url] = await get(token, url);
  out.roles[u] = responses;
  console.log(u, Object.keys(responses).length, 'responses');
}
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('wrote', OUT, (fs.statSync(OUT).size / 1e6).toFixed(1), 'MB');
