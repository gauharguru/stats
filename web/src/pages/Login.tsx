import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Card, Input, PageHeader, useAction } from '../components/ui';
import { DEMO_BUILD, DEMO_ROLES, isDemo, setDemoMode } from '../demo';
import { getServerUrl, isNative, normaliseServerUrl, setServerUrl, testServer } from '../platform';

export function Login() {
  const { login, notice } = useAuth();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [server, setServer] = useState(getServerUrl());
  const [editServer, setEditServer] = useState(isNative && !getServerUrl() && !isDemo());
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await login(u.trim(), p);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const demo = isDemo();
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo" aria-hidden="true">₹</div>
        <h1>AHS Nursing College</h1>
        <div className="muted">Student Fee, Admission &amp; Financial Management</div>
        {notice && <div className="alert alert-info" style={{ marginTop: 14 }}>{notice}</div>}

        {demo && (
          <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              <b>Demo</b> with sample students and payments (read-only). Choose a role - each role sees only what it is allowed to.
            </div>
            {DEMO_ROLES.map((r) => (
              <button key={r.user} type="button" className="btn btn-ghost role-btn" disabled={busy}
                onClick={() => { setBusy(true); login(r.user, 'demo').catch((e) => setErr(e.message)).finally(() => setBusy(false)); }}>
                <span>Enter as {r.label}</span>
                <span className="muted">{r.note}</span>
              </button>
            ))}
            {err && <div className="alert alert-err">{err}</div>}
            {!DEMO_BUILD && (
              <button type="button" className="link-btn" onClick={() => setDemoMode(false)}>Leave demo and connect to the college server</button>
            )}
          </div>
        )}

        {!demo && editServer && (
          <ServerSetup
            initial={server ?? ''}
            onSaved={(url) => { setServer(url); setEditServer(false); }}
            onCancel={server ? () => setEditServer(false) : undefined}
          />
        )}

        {!demo && !editServer && (
          <form onSubmit={submit}>
            {err && <div className="alert alert-err">{err}</div>}
            <Input label="Username" value={u} onChange={setU} required autoFocus={!isNative} />
            <Input label="Password" type="password" value={p} onChange={setP} required />
            <button className="btn btn-block" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <button type="button" className="link-btn" onClick={() => setForgot((f) => !f)}>
              Forgot password?
            </button>
            {forgot && (
              <div className="alert alert-info">
                For security, passwords are reset by the college administrator. Please contact the Admin, who will issue a temporary password that you must change
                at your next login.
              </div>
            )}
            {isNative && (
              <div className="server-line">
                <span className="muted">Server: {server}</span>
                <button type="button" className="link-btn" onClick={() => setEditServer(true)}>Change</button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

/* First-run screen of the Android app: where is the college server? */
function ServerSetup({ initial, onSaved, onCancel }: { initial: string; onSaved: (url: string) => void; onCancel?: () => void }) {
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const connect = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const problem = await testServer(url);
    setBusy(false);
    if (problem) return setErr(problem);
    setServerUrl(url);
    onSaved(normaliseServerUrl(url));
  };
  return (
    <form onSubmit={connect}>
      <div className="alert alert-info" style={{ marginBottom: 0 }}>
        Enter the address of the college's fee server, as given by your administrator.
      </div>
      {err && <div className="alert alert-err">{err}</div>}
      <Input label="Server address" value={url} onChange={setUrl} required placeholder="e.g. 192.168.1.10:4000" />
      <button className="btn btn-block" disabled={busy}>{busy ? 'Checking…' : 'Connect'}</button>
      {onCancel && <button type="button" className="btn btn-ghost btn-block" onClick={onCancel}>Cancel</button>}
      <div className="or-line"><span>or</span></div>
      <button type="button" className="btn btn-ghost btn-block" onClick={() => setDemoMode(true)}>Try the demo with sample data</button>
    </form>
  );
}

export function ChangePassword({ forced }: { forced?: boolean }) {
  const { refresh, logout } = useAuth();
  const nav = useNavigate();
  const { runSafe, busy } = useAction();
  const [cur, setCur] = useState('');
  const [n1, setN1] = useState('');
  const [n2, setN2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (n1 !== n2) return setErr('The new passwords do not match.');
    setErr(null);
    const r = await runSafe(() => api.post('/auth/change-password', { currentPassword: cur, newPassword: n1 }), 'Password changed.');
    if (r) {
      await refresh();
      nav('/');
    }
  };
  const form = (
    <form onSubmit={submit} style={{ display: 'grid', gap: 12, maxWidth: 380 }}>
      {forced && <div className="alert alert-warn">You must set a new password before continuing.</div>}
      {err && <div className="alert alert-err">{err}</div>}
      <Input label="Current password" type="password" value={cur} onChange={setCur} required autoFocus />
      <Input label="New password" type="password" value={n1} onChange={setN1} required hint="At least 8 characters with letters and numbers." />
      <Input label="Confirm new password" type="password" value={n2} onChange={setN2} required />
      <div className="actions">
        <button className="btn" disabled={busy}>
          Change password
        </button>
        {forced && (
          <button type="button" className="btn btn-ghost" onClick={() => logout()}>
            Log out
          </button>
        )}
      </div>
    </form>
  );
  if (forced)
    return (
      <div className="login-wrap">
        <div className="login-card">
          <h1>Set a new password</h1>
          <div style={{ marginTop: 16 }}>{form}</div>
        </div>
      </div>
    );
  return (
    <>
      <PageHeader title="Change password" />
      <Card>{form}</Card>
    </>
  );
}
