const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function money(v: unknown, compact = false): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return compact ? inr0.format(n) : inr.format(n);
}

export function date(v: unknown): string {
  if (!v) return '—';
  const s = String(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function dateTime(v: unknown): string {
  if (!v) return '—';
  const d = new Date(String(v).endsWith('Z') ? String(v) : String(v) + 'Z');
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export function daysAgoISO(n: number): string {
  const d = new Date(Date.now() - n * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
}

export function label(code: unknown): string {
  if (!code) return '—';
  return String(code)
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
