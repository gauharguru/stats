import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { dateTime } from '../format';
import { useLookups } from '../lookups';
import { DEMO } from '../demo';
import { Modal } from './ui';

interface NavItem {
  to: string;
  label: string;
  perms: string[];
}
const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Daily work',
    items: [
      { to: '/', label: 'Dashboard', perms: [] },
      { to: '/receive-payment', label: 'Receive Payment', perms: ['PAYMENT_CREATE'] },
      { to: '/students', label: 'Students', perms: ['STUDENT_VIEW'] },
      { to: '/admissions', label: 'Admissions', perms: ['ADMISSION_VIEW'] },
      { to: '/payments', label: 'Payment Register', perms: ['PAYMENT_VIEW'] },
      { to: '/refunds', label: 'Refunds', perms: ['REFUND_REQUEST', 'REFUND_PROCESS', 'REPORT_VIEW'] },
      { to: '/day-closing', label: 'Cashier Day Closing', perms: ['DAYCLOSE_SUBMIT', 'DAYCLOSE_VERIFY'] },
    ],
  },
  {
    group: 'Control',
    items: [
      { to: '/approvals', label: 'Approval Inbox', perms: ['APPROVAL_VIEW', 'APPROVAL_ACT'] },
      { to: '/consultants', label: 'Consultants', perms: ['CONSULTANT_VIEW'] },
    ],
  },
  {
    group: 'Reports',
    items: [
      { to: '/reports/collection', label: 'Collection', perms: ['REPORT_VIEW', 'REPORT_OWN'] },
      { to: '/reports/due', label: 'Due Report', perms: ['REPORT_VIEW'] },
      { to: '/reports/fee-summary', label: 'Course / Batch Summary', perms: ['REPORT_VIEW'] },
      { to: '/reports/control', label: 'Discounts / Reversals', perms: ['REPORT_VIEW'] },
      { to: '/reports/admission-history', label: 'Seat / Admission History', perms: ['REPORT_VIEW', 'ADMISSION_VIEW'] },
      { to: '/reports/consultants', label: 'Consultant Reports', perms: ['CONSULTANT_FINANCE_VIEW'] },
      { to: '/reports/audit', label: 'Audit Log', perms: ['AUDIT_VIEW'] },
    ],
  },
  {
    group: 'Setup',
    items: [
      { to: '/masters/fee-structure', label: 'Fee Structure', perms: ['FEE_STRUCTURE_EDIT', 'MASTER_VIEW'] },
      { to: '/masters', label: 'Courses, Batches & Masters', perms: ['MASTER_EDIT'] },
      { to: '/admin/users', label: 'Users & Roles', perms: ['USER_MANAGE'] },
      { to: '/admin/settings', label: 'Settings & Approval Rules', perms: ['SETTINGS_MANAGE'] },
    ],
  },
];

export function Layout() {
  const { me, can, logout } = useAuth();
  const { lookups } = useLookups();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<any[] | null>(null);
  const [unread, setUnread] = useState(me?.unreadNotifications ?? 0);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    const t = setInterval(() => api.get('/auth/me').then((m) => setUnread(m.unreadNotifications)).catch(() => undefined), 60000);
    return () => clearInterval(t);
  }, []);

  const showNotes = async () => {
    const r = await api.get('/auth/notifications');
    setNotes(r.rows);
    await api.post('/auth/notifications/read');
    setUnread(0);
  };

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <b>{lookups?.college.name ?? 'AHS Nursing College'}</b>
          <span>Fee &amp; Financial Management</span>
        </div>
        <nav className="nav">
          {NAV.map((g) => {
            const items = g.items.filter((i) => !i.perms.length || can(...i.perms));
            if (!items.length) return null;
            return (
              <div key={g.group}>
                <div className="nav-group">{g.group}</div>
                {items.map((i) => (
                  <NavLink key={i.to} to={i.to} end={i.to === '/' || i.to === '/masters'}>
                    {i.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn btn-ghost btn-sm menu-toggle" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            ☰ Menu
          </button>
          <button className="btn btn-ghost btn-sm" onClick={showNotes} title="Notifications">
            Notifications{unread > 0 && <span className="badge badge-warn">{unread}</span>}
          </button>
          <div className="who">
            {me?.fullName}
            <small>{me?.roles.join(', ')}</small>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => nav('/change-password')}>
            Password
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              nav('/');
              logout();
            }}
          >
            Log out
          </button>
        </header>
        {DEMO && (
          <div className="alert alert-warn no-print" style={{ margin: '12px 24px 0', borderRadius: 6 }}>
            <b>Demo mode</b> - sample data, read-only. Browsing, reports, receipts and exports work; saving is disabled.
          </div>
        )}
        <main className="content">
          <Outlet />
        </main>
      </div>
      {notes && (
        <Modal title="Notifications" onClose={() => setNotes(null)}>
          {notes.length === 0 && <div className="muted">No notifications.</div>}
          {notes.map((n) => (
            <div key={n.NotificationId} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="split">
                <b>{n.Title}</b>
                <span className="muted" style={{ fontSize: 12 }}>
                  {dateTime(n.CreatedAt)}
                </span>
              </div>
              {n.Message && <div className="muted">{n.Message}</div>}
              {n.Link && (
                <button
                  className="link-btn"
                  onClick={() => {
                    setNotes(null);
                    nav(n.Link);
                  }}
                >
                  Open
                </button>
              )}
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}
