import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Card, Input, PageHeader, useAction } from '../components/ui';

export function Login() {
  const { login, notice } = useAuth();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
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
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>AHS Nursing College</h1>
        <div className="muted">Student Fee, Admission &amp; Financial Management</div>
        {notice && <div className="alert alert-info" style={{ marginTop: 14 }}>{notice}</div>}
        <form onSubmit={submit}>
          {err && <div className="alert alert-err">{err}</div>}
          <Input label="Username" value={u} onChange={setU} required autoFocus />
          <Input label="Password" type="password" value={p} onChange={setP} required />
          <button className="btn" disabled={busy} style={{ justifyContent: 'center' }}>
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
        </form>
      </div>
    </div>
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
