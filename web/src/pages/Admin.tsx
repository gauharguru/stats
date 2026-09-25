import { FormEvent, useState } from 'react';
import { api } from '../api';
import { Card, Check, ErrorBox, Input, Loading, Modal, PageHeader, Select, Table, Tabs, useAction, useLoad } from '../components/ui';
import { dateTime, label, money } from '../format';
import { useLookups } from '../lookups';

export function Users() {
  const [tab, setTab] = useState('users');
  return (
    <>
      <PageHeader title="Users & roles" />
      <Tabs tabs={[{ key: 'users', label: 'Users' }, { key: 'roles', label: 'Roles & permissions' }]} active={tab} onChange={setTab} />
      {tab === 'users' ? <UserList /> : <RoleMatrix />}
    </>
  );
}

function UserList() {
  const users = useLoad(() => api.get('/admin/users'), []);
  const roles = useLoad(() => api.get('/admin/roles'), []);
  const [edit, setEdit] = useState<any>(null);
  const [reset, setReset] = useState<any>(null);
  const { runSafe, busy } = useAction();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await runSafe(
      () => (edit.UserId ? api.put(`/admin/users/${edit.UserId}`, { FullName: edit.FullName, Email: edit.Email, Mobile: edit.Mobile, Roles: edit.Roles, IsActive: edit.IsActive }) : api.post('/admin/users', edit)),
      'User saved.',
    );
    if (r) {
      setEdit(null);
      users.reload();
    }
  };
  return (
    <Card actions={<button className="btn" onClick={() => setEdit({ UserName: '', FullName: '', Email: '', Mobile: '', Password: '', Roles: [], IsActive: true })}>Add user</button>}>
      <ErrorBox error={users.error} />
      <Table
        columns={[
          { key: 'UserName', label: 'Username' }, { key: 'FullName', label: 'Name' }, { key: 'Roles', label: 'Roles', render: (r) => r.Roles.map((x: string) => <span key={x} className="pill">{x}</span>) },
          { key: 'LastLoginAt', label: 'Last login', render: (r) => dateTime(r.LastLoginAt) },
          { key: 'IsActive', label: 'Status', render: (r) => (r.IsActive ? (r.LockedUntil && new Date(r.LockedUntil + 'Z') > new Date() ? <span className="badge badge-warn">Locked</span> : <span className="badge badge-good">Active</span>) : <span className="badge badge-muted">Inactive</span>) },
          { key: 'x', label: '', render: (r) => <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setReset({ ...r, Password: '' }); }}>Reset password</button> },
        ]}
        rows={users.data?.rows}
        onRowClick={(r) => setEdit({ ...r, IsActive: !!r.IsActive })}
      />
      {edit && (
        <Modal title={edit.UserId ? `Edit ${edit.UserName}` : 'Add user'} onClose={() => setEdit(null)}>
          <form onSubmit={submit}>
            <div className="form-grid">
              <Input label="Username" value={edit.UserName} onChange={(v) => setEdit({ ...edit, UserName: v })} required disabled={!!edit.UserId} />
              <Input label="Full name" value={edit.FullName} onChange={(v) => setEdit({ ...edit, FullName: v })} required />
              <Input label="Email" type="email" value={edit.Email} onChange={(v) => setEdit({ ...edit, Email: v })} />
              <Input label="Mobile" value={edit.Mobile} onChange={(v) => setEdit({ ...edit, Mobile: v })} />
              {!edit.UserId && <Input label="Temporary password" type="password" value={edit.Password} onChange={(v) => setEdit({ ...edit, Password: v })} required hint="The user must change it at first login." />}
              {edit.UserId && <Check label="Active" checked={edit.IsActive} onChange={(v) => setEdit({ ...edit, IsActive: v })} />}
            </div>
            <h2 style={{ margin: '14px 0 8px' }}>Roles</h2>
            <div className="perm-grid">
              {(roles.data?.roles ?? []).filter((r: any) => r.IsActive).map((r: any) => (
                <Check key={r.RoleCode} label={r.RoleName} hint={r.Description} checked={edit.Roles.includes(r.RoleCode)}
                  onChange={(v) => setEdit({ ...edit, Roles: v ? [...edit.Roles, r.RoleCode] : edit.Roles.filter((x: string) => x !== r.RoleCode) })} />
              ))}
            </div>
            <div className="form-actions"><button className="btn" disabled={busy}>Save</button></div>
          </form>
        </Modal>
      )}
      {reset && (
        <Modal title={`Reset password - ${reset.UserName}`} onClose={() => setReset(null)}>
          <form onSubmit={async (e) => { e.preventDefault(); if (await runSafe(() => api.post(`/admin/users/${reset.UserId}/reset-password`, { Password: reset.Password }), 'Password reset. The user must change it at next login.')) setReset(null); }}>
            <div className="form-grid">
              <Input label="Temporary password" type="password" value={reset.Password} onChange={(v) => setReset({ ...reset, Password: v })} required hint="At least 8 characters with letters and numbers." />
            </div>
            <div className="form-actions"><button className="btn" disabled={busy}>Reset</button></div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

function RoleMatrix() {
  const { data, error, reload } = useLoad(() => api.get('/admin/roles'), []);
  const [edit, setEdit] = useState<any>(null);
  const { runSafe, busy } = useAction();
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const modules = [...new Set<string>(data.permissions.map((p: any) => p.ModuleName))];
  return (
    <Card>
      <Table
        columns={[
          { key: 'RoleName', label: 'Role' }, { key: 'Description', label: 'Description' },
          { key: 'Permissions', label: 'Permissions', type: 'number', render: (r) => r.Permissions.length },
        ]}
        rows={data.roles}
        onRowClick={(r) => r.RoleCode !== 'ADMIN' && setEdit({ ...r, Permissions: [...r.Permissions] })}
      />
      <p className="muted">Admin always has full access. Click a role to change its permissions. Every change is recorded in the audit log.</p>
      {edit && (
        <Modal title={`Permissions - ${edit.RoleName}`} onClose={() => setEdit(null)} wide>
          {modules.map((m) => (
            <div key={m} style={{ marginBottom: 12 }}>
              <h2 style={{ marginBottom: 6 }}>{m}</h2>
              <div className="perm-grid">
                {data.permissions.filter((p: any) => p.ModuleName === m).map((p: any) => (
                  <Check key={p.PermissionCode} label={p.PermissionName} checked={edit.Permissions.includes(p.PermissionCode)}
                    onChange={(v) => setEdit({ ...edit, Permissions: v ? [...edit.Permissions, p.PermissionCode] : edit.Permissions.filter((x: string) => x !== p.PermissionCode) })} />
                ))}
              </div>
            </div>
          ))}
          <div className="form-actions">
            <button className="btn" disabled={busy} onClick={async () => { if (await runSafe(() => api.put(`/admin/roles/${edit.RoleId}/permissions`, { permissions: edit.Permissions }), 'Permissions updated.')) { setEdit(null); reload(); } }}>
              Save
            </button>
          </div>
        </Modal>
      )}
    </Card>
  );
}

const SETTING_HELP: Record<string, { type: 'bool' | 'text' | 'number' | 'select'; options?: string[] }> = {
  PaymentRequiresApproval: { type: 'bool' }, AutoApplyAdvance: { type: 'bool' }, AllowSelfApproval: { type: 'bool' }, AutoCreateConsultantPayable: { type: 'bool' },
  DefaultPaymentAllocationMethod: { type: 'select', options: ['FIFO', 'MANUAL'] }, SessionTimeoutMinutes: { type: 'number' }, MaxFailedLogins: { type: 'number' },
  LockoutMinutes: { type: 'number' },
};

export function Settings() {
  const [tab, setTab] = useState('settings');
  return (
    <>
      <PageHeader title="Settings & approval rules" />
      <Tabs tabs={[{ key: 'settings', label: 'System settings' }, { key: 'rules', label: 'Approval rules' }, { key: 'numbers', label: 'Document numbering' }]} active={tab} onChange={setTab} />
      {tab === 'settings' && <SystemSettings />}
      {tab === 'rules' && <ApprovalRules />}
      {tab === 'numbers' && <Numbering />}
    </>
  );
}

function SystemSettings() {
  const { reload: reloadLookups } = useLookups();
  const { data, error, reload } = useLoad(() => api.get('/admin/settings'), []);
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const { runSafe, busy } = useAction();
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const v = values ?? Object.fromEntries(data.rows.map((r: any) => [r.SettingKey, r.SettingValue ?? '']));
  const set = (k: string, x: string) => setValues({ ...v, [k]: x });
  return (
    <Card>
      <div className="form-grid">
        {data.rows.map((r: any) => {
          const h = SETTING_HELP[r.SettingKey] ?? { type: 'text' };
          const lbl = label(r.SettingKey.replace(/([a-z])([A-Z])/g, '$1_$2'));
          if (h.type === 'bool') return <Select key={r.SettingKey} label={lbl} hint={r.Description} value={v[r.SettingKey]} onChange={(x) => set(r.SettingKey, x)} placeholder={null} options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} />;
          if (h.type === 'select') return <Select key={r.SettingKey} label={lbl} hint={r.Description} value={v[r.SettingKey]} onChange={(x) => set(r.SettingKey, x)} placeholder={null} options={h.options!.map((o) => ({ value: o, label: o }))} />;
          return <Input key={r.SettingKey} label={lbl} hint={r.Description} type={h.type === 'number' ? 'number' : 'text'} step="1" value={v[r.SettingKey]} onChange={(x) => set(r.SettingKey, x)} />;
        })}
      </div>
      <div className="form-actions">
        <button className="btn" disabled={busy || !values} onClick={async () => { if (await runSafe(() => api.put('/admin/settings', { values: v }), 'Settings saved.')) { setValues(null); reload(); reloadLookups(); } }}>Save settings</button>
      </div>
    </Card>
  );
}

function ApprovalRules() {
  const { data, error, reload } = useLoad(() => api.get('/admin/approval-rules'), []);
  const roles = useLoad(() => api.get('/admin/roles').catch(() => ({ roles: [] })), []);
  const [edit, setEdit] = useState<any>(null);
  const { runSafe, busy } = useAction();
  if (error) return <ErrorBox error={error} />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = {
      TransactionType: edit.TransactionType, MinimumAmount: edit.MinimumAmount === '' || edit.MinimumAmount === null ? null : Number(edit.MinimumAmount),
      MaximumAmount: edit.MaximumAmount === '' || edit.MaximumAmount === null ? null : Number(edit.MaximumAmount), ApprovalLevel: Number(edit.ApprovalLevel),
      RoleId: Number(edit.RoleId), IsActive: !!edit.IsActive,
    };
    if (await runSafe(() => (edit.ApprovalRuleId ? api.put(`/admin/approval-rules/${edit.ApprovalRuleId}`, body) : api.post('/admin/approval-rules', body)), 'Rule saved.')) {
      setEdit(null);
      reload();
    }
  };
  return (
    <Card actions={<button className="btn" onClick={() => setEdit({ TransactionType: 'REFUND', MinimumAmount: '', MaximumAmount: '', ApprovalLevel: 1, RoleId: '', IsActive: true })}>Add rule</button>}>
      <p className="muted">
        A transaction needs approval from every level whose amount range matches, in order (level 1, then 2…). If no active rule matches, the transaction is
        approved automatically. Requesters can never approve their own transactions unless “Allow self approval” is switched on.
      </p>
      <Table
        columns={[
          { key: 'TransactionType', label: 'Transaction', render: (r) => label(r.TransactionType) },
          { key: 'MinimumAmount', label: 'From', render: (r) => (r.MinimumAmount == null ? 'Any' : money(r.MinimumAmount)) },
          { key: 'MaximumAmount', label: 'To', render: (r) => (r.MaximumAmount == null ? 'No limit' : money(r.MaximumAmount)) },
          { key: 'ApprovalLevel', label: 'Level', type: 'number' },
          { key: 'RoleName', label: 'Approver role' },
          { key: 'IsActive', label: 'Active', render: (r) => (r.IsActive ? 'Yes' : 'No') },
        ]}
        rows={data?.rows}
        onRowClick={(r) => setEdit({ ...r, MinimumAmount: r.MinimumAmount ?? '', MaximumAmount: r.MaximumAmount ?? '', IsActive: !!r.IsActive })}
      />
      {edit && (
        <Modal title={edit.ApprovalRuleId ? 'Edit rule' : 'Add rule'} onClose={() => setEdit(null)}>
          <form onSubmit={submit}>
            <div className="form-grid">
              <Select label="Transaction" value={edit.TransactionType} onChange={(v) => setEdit({ ...edit, TransactionType: v })} placeholder={null}
                options={(data?.transactionTypes ?? []).map((t: string) => ({ value: t, label: label(t) }))} />
              <Input label="From amount (₹)" type="number" value={edit.MinimumAmount} onChange={(v) => setEdit({ ...edit, MinimumAmount: v })} hint="Blank = any" />
              <Input label="To amount (₹)" type="number" value={edit.MaximumAmount} onChange={(v) => setEdit({ ...edit, MaximumAmount: v })} hint="Blank = no limit" />
              <Input label="Level" type="number" step="1" min="1" max="9" value={edit.ApprovalLevel} onChange={(v) => setEdit({ ...edit, ApprovalLevel: v })} required />
              <Select label="Approver role" value={edit.RoleId} onChange={(v) => setEdit({ ...edit, RoleId: v })} required
                options={(roles.data?.roles ?? []).map((r: any) => ({ value: r.RoleId, label: r.RoleName }))} />
              <Check label="Active" checked={edit.IsActive} onChange={(v) => setEdit({ ...edit, IsActive: v })} />
            </div>
            <div className="form-actions"><button className="btn" disabled={busy}>Save</button></div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

function Numbering() {
  const { data, error, reload } = useLoad(() => api.get('/admin/document-types'), []);
  const [edit, setEdit] = useState<any>(null);
  const { runSafe, busy } = useAction();
  if (error) return <ErrorBox error={error} />;
  const preview = (t: any) => `${t.Prefix}${t.IncludeYear ? '2026' + t.Separator : ''}${'1'.padStart(Number(t.NumberWidth) || 6, '0')}`;
  return (
    <Card>
      <p className="muted">Numbers are generated by the database, are unique and sequential, and are never reused. Year-based numbers restart each financial year (April).</p>
      <Table
        columns={[
          { key: 'DocumentType', label: 'Document', render: (r) => label(r.DocumentType) },
          { key: 'Prefix', label: 'Prefix' },
          { key: 'IncludeYear', label: 'Includes year', render: (r) => (r.IncludeYear ? 'Yes' : 'No') },
          { key: 'x', label: 'Example', render: (r) => preview(r) },
        ]}
        rows={data?.types}
        onRowClick={(r) => setEdit({ ...r, IncludeYear: !!r.IncludeYear })}
      />
      {edit && (
        <Modal title={`Numbering - ${label(edit.DocumentType)}`} onClose={() => setEdit(null)}>
          <form onSubmit={async (e) => { e.preventDefault(); if (await runSafe(() => api.put(`/admin/document-types/${edit.DocumentType}`, { ...edit, NumberWidth: Number(edit.NumberWidth) }), 'Saved.')) { setEdit(null); reload(); } }}>
            <div className="alert alert-warn">Change the format only at the start of a financial year - existing numbers are not changed.</div>
            <div className="form-grid">
              <Input label="Prefix" value={edit.Prefix} onChange={(v) => setEdit({ ...edit, Prefix: v })} required />
              <Input label="Separator after year" value={edit.Separator} onChange={(v) => setEdit({ ...edit, Separator: v })} />
              <Input label="Digits" type="number" step="1" value={edit.NumberWidth} onChange={(v) => setEdit({ ...edit, NumberWidth: v })} />
              <Check label="Include financial year" checked={edit.IncludeYear} onChange={(v) => setEdit({ ...edit, IncludeYear: v })} />
            </div>
            <p>Example: <b>{preview(edit)}</b></p>
            <div className="form-actions"><button className="btn" disabled={busy}>Save</button></div>
          </form>
        </Modal>
      )}
    </Card>
  );
}
