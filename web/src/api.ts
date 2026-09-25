import { demoRequest, isDemo } from './demo';
import { apiBase, isNative, shareFile } from './platform';

const TOKEN_KEY = 'sfm_token';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public details?: any) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(t: string | null) {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  if (isDemo()) {
    try {
      return (await demoRequest(method, url, body, getToken())) as T;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401 && !url.startsWith('/auth/login')) {
        setToken(null);
        onUnauthorized?.();
      }
      throw e;
    }
  }
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(apiBase() + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.status === 401 && !url.startsWith('/auth/login')) {
    setToken(null);
    onUnauthorized?.();
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiError(res.status, data.error || res.statusText, data.code, data.details);
  return data as T;
}

export const api = {
  get: <T = any>(url: string) => request<T>('GET', url),
  post: <T = any>(url: string, body: unknown = {}) => request<T>('POST', url, body),
  put: <T = any>(url: string, body: unknown = {}) => request<T>('PUT', url, body),
};

/** Builds a query string, skipping empty values. */
export function qs(params: Record<string, unknown>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? '?' + s : '';
}

/** Server-side CSV export (permission checked by the API). */
export async function downloadCsv(url: string, fileName: string) {
  if (isDemo()) {
    const data = await request<any>('GET', url);
    const rows: Record<string, unknown>[] = data.rows ?? [];
    const cols = rows.length ? Object.keys(rows[0]) : [];
    const cell = (v: unknown) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n');
    if (isNative) return shareFile(fileName + '.csv', '\uFEFF' + csv);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv' }));
    a.download = fileName + '.csv';
    a.click();
    return;
  }
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(apiBase() + url + sep + 'format=csv', { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error || 'Export failed');
  }
  if (isNative) return shareFile(fileName.endsWith('.csv') ? fileName : fileName + '.csv', await res.text());
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName.endsWith('.csv') ? fileName : fileName + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
