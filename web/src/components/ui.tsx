import { createContext, DependencyList, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { ApiError, downloadCsv } from '../api';
import { useAuth } from '../auth';
import { date, label, money } from '../format';

/* ---------------- data loading ------------------------------------- */
export function useLoad<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await run());
    } catch (e) {
      setError((e as Error).message);
      /* list pages render an empty table under the error message instead of "Loading" */
      setData({ rows: [] } as T);
    } finally {
      setLoading(false);
    }
  }, [run]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, loading, reload, setData };
}

/* ---------------- toast -------------------------------------------- */
type Toast = { id: number; kind: 'ok' | 'err'; text: string };
const ToastCtx = createContext<(kind: 'ok' | 'err', text: string) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: 'ok' | 'err', text: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, kind, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), kind === 'err' ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** Runs an action, shows success / error toast, returns result or undefined. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
      setBusy(true);
      try {
        const r = await fn();
        if (success) toast('ok', success);
        return r;
      } catch (e) {
        toast('err', (e as Error).message);
        if (e instanceof ApiError) throw e;
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  const runSafe = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string) => {
      try {
        return await run(fn, success);
      } catch {
        return undefined;
      }
    },
    [run],
  );
  return { run, runSafe, busy };
}

/* ---------------- layout pieces ------------------------------------ */
export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="muted">{subtitle}</div>}
      </div>
      {actions && <div className="actions no-print">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="actions no-print">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label: l, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'warn' | 'bad' }) {
  return (
    <div className={`stat ${tone ? 'stat-' + tone : ''}`}>
      <div className="stat-label">{l}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Loading() {
  return <div className="loading">Loading…</div>;
}
export function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="alert alert-err">{error}</div>;
}

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'good', POSTED: 'good', APPROVED: 'good', PROCESSED: 'good', VERIFIED: 'good', CLEARED: 'good', AVAILABLE: 'good', OCCUPIED: 'info',
  PENDING_APPROVAL: 'warn', PENDING: 'warn', SUBMITTED: 'warn', DRAFT: 'muted', REQUIRED: 'warn', RECEIVED: 'info', DEPOSITED: 'info',
  REJECTED: 'bad', REVERSED: 'bad', CANCELLED: 'bad', BOUNCED: 'bad', SUSPENDED: 'bad', BLOCKED: 'bad', RELEASED: 'muted', INACTIVE: 'muted',
  COMPLETED: 'muted', UTILIZED: 'muted',
};
export function Badge({ status }: { status: unknown }) {
  if (!status) return <span className="muted">—</span>;
  const s = String(status);
  return <span className={`badge badge-${STATUS_TONE[s] ?? 'muted'}`}>{label(s)}</span>;
}

/* ---------------- table -------------------------------------------- */
export interface Column<T = any> {
  key: string;
  label: string;
  type?: 'money' | 'date' | 'status' | 'text' | 'number';
  render?: (row: T) => ReactNode;
  align?: 'right' | 'left' | 'center';
  total?: boolean;
}

export function Table<T extends Record<string, any>>({
  columns,
  rows,
  onRowClick,
  empty = 'No records found.',
  rowKey,
  showTotals,
}: {
  columns: Column<T>[];
  rows: T[] | null | undefined;
  onRowClick?: (row: T) => void;
  empty?: string;
  rowKey?: (row: T, i: number) => string | number;
  showTotals?: boolean;
}) {
  if (!rows) return <Loading />;
  const cell = (c: Column<T>, r: T) => {
    if (c.render) return c.render(r);
    const v = r[c.key];
    if (c.type === 'money') return money(v);
    if (c.type === 'date') return date(v);
    if (c.type === 'status') return <Badge status={v} />;
    if (v === null || v === undefined || v === '') return <span className="muted">—</span>;
    return String(v);
  };
  const alignOf = (c: Column<T>) => c.align ?? (c.type === 'money' || c.type === 'number' ? 'right' : 'left');
  const hasTotals = showTotals && columns.some((c) => c.total);
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: alignOf(c) }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="empty">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={rowKey ? rowKey(r, i) : i} onClick={onRowClick ? () => onRowClick(r) : undefined} className={onRowClick ? 'clickable' : ''}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: alignOf(c) }} className={c.type === 'money' ? 'num' : ''}>
                  {cell(c, r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {hasTotals && rows.length > 0 && (
          <tfoot>
            <tr>
              {columns.map((c, i) => (
                <td key={c.key} style={{ textAlign: alignOf(c) }} className="num">
                  {c.total ? money(rows.reduce((s, r) => s + Number(r[c.key] ?? 0), 0)) : i === 0 ? 'Total' : ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/* ---------------- form fields -------------------------------------- */
type FieldProps = { label: string; hint?: ReactNode; required?: boolean; className?: string; children?: ReactNode };
export function Field({ label: l, hint, required, className = '', children }: FieldProps) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">
        {l}
        {required && <span className="req"> *</span>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Input({
  label: l, value, onChange, type = 'text', required, hint, placeholder, className, autoFocus, min, max, step, disabled,
}: {
  label: string; value: any; onChange: (v: string) => void; type?: string; required?: boolean; hint?: ReactNode; placeholder?: string;
  className?: string; autoFocus?: boolean; min?: string | number; max?: string | number; step?: string | number; disabled?: boolean;
}) {
  return (
    <Field label={l} required={required} hint={hint} className={className}>
      <input
        type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder}
        autoFocus={autoFocus} min={min} max={max} step={step ?? (type === 'number' ? '0.01' : undefined)} disabled={disabled}
      />
    </Field>
  );
}

export function Select({
  label: l, value, onChange, options, required, hint, placeholder = '— Select —', className, disabled,
}: {
  label: string; value: any; onChange: (v: string) => void; options: { value: any; label: string }[]; required?: boolean; hint?: ReactNode;
  placeholder?: string | null; className?: string; disabled?: boolean;
}) {
  return (
    <Field label={l} required={required} hint={hint} className={className}>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={required} disabled={disabled}>
        {placeholder !== null && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function TextArea({ label: l, value, onChange, required, rows = 2, hint }: { label: string; value: any; onChange: (v: string) => void; required?: boolean; rows?: number; hint?: ReactNode }) {
  return (
    <Field label={l} required={required} hint={hint} className="span-2">
      <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={required} rows={rows} />
    </Field>
  );
}

export function Check({ label: l, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {l}
        {hint && <span className="field-hint"> {hint}</span>}
      </span>
    </label>
  );
}

/* ---------------- modal -------------------------------------------- */
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: ReactNode }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="tabs no-print" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={active === t.key} className={active === t.key ? 'tab active' : 'tab'} onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function ExportButton({ url, fileName }: { url: string; fileName: string }) {
  const { can } = useAuth();
  const toast = useToast();
  if (!can('REPORT_EXPORT')) return null;
  return (
    <button className="btn btn-ghost" onClick={() => downloadCsv(url, fileName).catch((e) => toast('err', e.message))}>
      Export Excel (CSV)
    </button>
  );
}

export function PrintButton() {
  return (
    <button className="btn btn-ghost" onClick={() => window.print()}>
      Print / PDF
    </button>
  );
}

export function KV({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="kv">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v === null || v === undefined || v === '' ? <span className="muted">—</span> : v}</dd>
        </div>
      ))}
    </dl>
  );
}
