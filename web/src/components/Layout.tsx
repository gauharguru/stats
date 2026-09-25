import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { dateTime } from '../format';
import { useLookups } from '../lookups';
import { isDemo } from '../demo';
import { Modal, useIsMobile } from './ui';

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

/* ---------------- icons (inline, no icon library) ------------------ */
const I = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  pay: 'M3 6h18v12H3zM3 10h18M7 15h4',
  students: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21c0-4 4-6 8-6s8 2 8 6',
  approvals: 'M9 12l2 2 4-4M5 4h14v16H5z',
  payments: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6',
  reports: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  more: 'M4 6h16M4 12h16M4 18h16',
  bell: 'M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16zM10 21h4',
  back: 'M15 5l-7 7 7 7',
};
function Icon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function Layout() {
  const { me, can, logout } = useAuth();
  const { lookups } = useLookups();
  const mobile = useIsMobile();
  const [more, setMore] = useState(false);
  const [notes, setNotes] = useState<any[] | null>(null);
  const [unread, setUnread] = useState(me?.unreadNotifications ?? 0);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => {
    setMore(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  useEffect(() => {
    const t = setInterval(() => api.get('/auth/me').then((m) => setUnread(m.unreadNotifications)).catch(() => undefined), 60000);
    return () => clearInterval(t);
  }, []);

  const showNotes = async () => {
    const r = await api.get('/auth/notifications');
    setNotes(r.rows);
    await api.post('/auth/notifications/read').catch(() => undefined);
    setUnread(0);
  };
  const doLogout = () => {
    nav('/');
    logout();
  };

  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.perms.length || can(...i.perms)) })).filter((g) => g.items.length);

  /* Bottom tabs chosen by role */
  const tabs = [
    { to: '/', label: 'Home', icon: I.home },
    can('PAYMENT_CREATE') ? { to: '/receive-payment', label: 'Pay', icon: I.pay } : can('REPORT_VIEW') ? { to: '/reports/collection', label: 'Reports', icon: I.reports } : null,
    can('STUDENT_VIEW') ? { to: '/students', label: 'Students', icon: I.students } : null,
    can('APPROVAL_VIEW', 'APPROVAL_ACT') ? { to: '/approvals', label: 'Approvals', icon: I.approvals } : can('PAYMENT_VIEW') ? { to: '/payments', label: 'Receipts', icon: I.payments } : null,
  ].filter(Boolean) as { to: string; label: string; icon: string }[];
  const isTabRoot = tabs.some((t) => t.to === loc.pathname);
  const allItems = groups.flatMap((g) => g.items);
  const current = [...allItems].sort((a, b) => b.to.length - a.to.length).find((i) => i.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(i.to));

  const demoBanner = isDemo() && (
    <div className="demo-banner no-print">
      <b>Demo</b> · sample data, read-only
    </div>
  );

  const notesModal = notes && (
    <Modal title="Notifications" onClose={() => setNotes(null)}>
      {notes.length === 0 && <div className="muted">No notifications.</div>}
      {notes.map((n) => (
        <div key={n.NotificationId} className="note-row">
          <div className="split">
            <b>{n.Title}</b>
            <span className="muted" style={{ fontSize: 12 }}>{dateTime(n.CreatedAt)}</span>
          </div>
          {n.Message && <div className="muted">{n.Message}</div>}
          {n.Link && (
            <button className="link-btn" onClick={() => { setNotes(null); nav(n.Link); }}>Open</button>
          )}
        </div>
      ))}
    </Modal>
  );

  if (mobile)
    return (
      <div className="mshell">
        <header className="mtopbar">
          {isTabRoot ? (
            <div className="mtopbar-brand">
              <span className="login-logo small" aria-hidden="true">₹</span>
              <b>{loc.pathname === '/' ? lookups?.college.name ?? 'AHS Nursing College' : current?.label}</b>
            </div>
          ) : (
            <button className="mtopbar-back" onClick={() => nav(-1)} aria-label="Back">
              <Icon d={I.back} /> <span>{current?.label ?? 'Back'}</span>
            </button>
          )}
          <button className="icon-btn" onClick={showNotes} aria-label="Notifications">
            <Icon d={I.bell} />
            {unread > 0 && <span className="dot">{unread}</span>}
          </button>
        </header>
        {demoBanner}
        <main className="content">
          <Outlet />
        </main>
        <nav className="bottom-nav no-print" aria-label="Main">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive && !more ? 'active' : '')}>
              <Icon d={t.icon} />
              <span>{t.label}</span>
            </NavLink>
          ))}
          <button className={more ? 'active' : ''} onClick={() => setMore((m) => !m)}>
            <Icon d={I.more} />
            <span>More</span>
          </button>
        </nav>
        {more && (
          <div className="more-sheet" role="dialog" aria-label="Menu">
            <div className="more-user">
              <div className="avatar">{(me?.fullName ?? '?').slice(0, 1)}</div>
              <div>
                <b>{me?.fullName}</b>
                <div className="muted">{me?.roles.join(', ')}</div>
              </div>
            </div>
            {groups.map((g) => (
              <div key={g.group} className="more-group">
                <div className="nav-group">{g.group}</div>
                <div className="more-grid">
                  {g.items.map((i) => (
                    <NavLink key={i.to} to={i.to} end={i.to === '/' || i.to === '/masters'}>{i.label}</NavLink>
                  ))}
                </div>
              </div>
            ))}
            <div className="more-group">
              <div className="nav-group">Account</div>
              <div className="more-grid">
                <NavLink to="/change-password">Change password</NavLink>
                <button onClick={doLogout}>Log out</button>
              </div>
            </div>
          </div>
        )}
        {notesModal}
      </div>
    );

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <b>{lookups?.college.name ?? 'AHS Nursing College'}</b>
          <span>Fee &amp; Financial Management</span>
        </div>
        <nav className="nav">
          {groups.map((g) => (
            <div key={g.group}>
              <div className="nav-group">{g.group}</div>
              {g.items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.to === '/' || i.to === '/masters'}>
                  {i.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={showNotes} title="Notifications">
            Notifications{unread > 0 && <span className="badge badge-warn">{unread}</span>}
          </button>
          <div className="who">
            {me?.fullName}
            <small>{me?.roles.join(', ')}</small>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => nav('/change-password')}>Password</button>
          <button className="btn btn-ghost btn-sm" onClick={doLogout}>Log out</button>
        </header>
        {demoBanner}
        <main className="content">
          <Outlet />
        </main>
      </div>
      {notesModal}
    </div>
  );
}
