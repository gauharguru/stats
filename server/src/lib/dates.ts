import { config } from '../config';

/** Today's business date (YYYY-MM-DD) in the college's time zone. */
export function today(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts; // en-CA formats as YYYY-MM-DD
}

/** Normalise a value coming back from SQL (DATE -> JS Date at UTC midnight) to YYYY-MM-DD. */
export function isoDate(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
