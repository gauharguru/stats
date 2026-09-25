/* Read-only demo mode (build with VITE_DEMO=1, e.g. for GitHub Pages).
   Instead of calling the API, requests are answered from responses recorded
   from a real server loaded with demo data (tools/record-demo.mjs). */
import { ApiError } from './api';

export const DEMO = import.meta.env.VITE_DEMO === '1';

interface Recorded {
  status: number;
  body: any;
}
interface Fixtures {
  meta: { today: string; recordedAt: string };
  roles: Record<string, Record<string, Recorded>>;
}

let fixtures: Promise<Fixtures> | null = null;
let loaded: Fixtures | null = null;
export function loadDemo(): Promise<Fixtures> {
  fixtures ??= fetch(import.meta.env.BASE_URL + 'demo-data.json')
    .then((r) => r.json())
    .then((f: Fixtures) => (loaded = f));
  return fixtures;
}

/** The business date the demo data was recorded on. */
export function demoToday(): string | null {
  return loaded?.meta.today ?? null;
}

export const DEMO_ROLES = [
  { user: 'admin', label: 'Admin', note: 'Full access, approvals, setup' },
  { user: 'accountant', label: 'Accountant', note: 'Payments, refunds, consultants' },
  { user: 'cashier', label: 'Cashier', note: 'Fee collection and receipts' },
  { user: 'principal', label: 'Principal', note: 'Read-only management view' },
];

const READ_ONLY = 'This is a read-only demo with sample data. Saving is disabled - install the full system to record transactions.';

function parse(url: string) {
  const [path, query = ''] = url.split('?');
  return { path, params: Object.fromEntries(new URLSearchParams(query)) as Record<string, string> };
}

/** Exact match first; otherwise the recording of the same path whose query fits best. */
function find(set: Record<string, Recorded>, url: string): Recorded | null {
  const req = parse(url);
  let best: Recorded | null = null;
  let bestScore = -Infinity;
  for (const [key, rec] of Object.entries(set)) {
    const cand = parse(key);
    if (cand.path !== req.path) continue;
    let score = 0;
    for (const [k, v] of Object.entries(cand.params)) score += req.params[k] === v ? 2 : -1;
    for (const k of Object.keys(req.params)) if (!(k in cand.params) && k !== 'q' && k !== 'top') score -= 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = rec;
    }
  }
  if (!best) return null;
  /* free-text search is filtered in the browser */
  const q = req.params.q?.trim().toLowerCase();
  if (q && Array.isArray(best.body?.rows)) {
    return { ...best, body: { ...best.body, rows: best.body.rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(q)) } };
  }
  return best;
}

export async function demoRequest(method: string, url: string, body: any, token: string | null): Promise<any> {
  const f = await loadDemo();
  if (url === '/auth/login') {
    if (!f.roles[body?.userName]) throw new ApiError(401, 'Choose one of the demo roles.');
    return { token: body.userName, mustChangePassword: false, sessionTimeoutMinutes: 600 };
  }
  if (!token || !f.roles[token]) throw new ApiError(401, 'Please log in.', 'UNAUTHENTICATED');
  if (method !== 'GET') {
    if (url === '/auth/logout' || url === '/auth/notifications/read' || url.endsWith('/receipt/printed')) return { ok: true };
    throw new ApiError(400, READ_ONLY, 'DEMO_READ_ONLY');
  }
  const rec = find(f.roles[token], url);
  if (!rec) throw new ApiError(404, 'This view is not included in the demo data.');
  if (rec.status >= 400) throw new ApiError(rec.status, rec.body?.error ?? 'Error', rec.body?.code);
  return structuredClone(rec.body);
}

export const DEMO_READ_ONLY_MESSAGE = READ_ONLY;
