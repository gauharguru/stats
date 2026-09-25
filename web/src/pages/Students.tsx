import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, qs } from '../api';
import { useAuth } from '../auth';
import { Badge, Card, ErrorBox, ExportButton, Input, KV, Loading, Modal, PageHeader, Select, Table, TextArea, useAction, useLoad } from '../components/ui';
import { date, money } from '../format';
import { statusOptions, useLookups } from '../lookups';

/* Type-ahead search used on the dashboard and payment screen (SRS 65) */
export function StudentSearch({ onPick, placeholder = 'Search by name, admission no., student ID, roll no., father\'s name or mobile…' }: { onPick: (s: any) => void; placeholder?: string }) {
  const [term, setTerm] = useState('');
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    if (term.trim().length < 2) {
      setRows(null);
      return;
    }
    const t = setTimeout(() => api.get(`/students${qs({ q: term.trim(), top: 15 })}`).then((r) => setRows(r.rows)).catch(() => setRows([])), 250);
    return () => clearTimeout(t);
  }, [term]);
  return (
    <div className="search-big" style={{ position: 'relative' }}>
      <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={placeholder} aria-label="Search students" />
      {rows && (
        <div className="card" style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 20, padding: 0, marginTop: 4, maxHeight: 360, overflowY: 'auto' }}>
          {rows.length === 0 && <div className="muted" style={{ padding: 12 }}>No students found.</div>}
          {rows.map((s) => (
            <button
              key={s.StudentId}
              type="button"
              className="link-btn"
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}
              onClick={() => {
                setRows(null);
                setTerm('');
                onPick(s);
              }}
            >
              <div className="split">
                <b>{s.StudentName}</b>
                <span className="muted">{s.AdmissionNumber ?? s.StudentCode}</span>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {[s.FatherName && `S/D/o ${s.FatherName}`, s.CourseCode, s.BatchCode, s.Mobile].filter(Boolean).join(' · ')}
                {s.Outstanding > 0 && <span style={{ color: 'var(--bad)' }}> · Due {money(s.Outstanding)}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StudentsList() {
  const { can } = useAuth();
  const { lookups } = useLookups();
  const nav = useNavigate();
  const [f, setF] = useState({ q: '', courseId: '', batchId: '', status: '' });
  const [applied, setApplied] = useState(f);
  const { data, error } = useLoad(() => api.get(`/students${qs(applied)}`), [applied]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setApplied(f);
  };
  return (
    <>
      <PageHeader
        title="Students"
        actions={
          <>
            <ExportButton url={`/students${qs(applied)}`} fileName="students" />
            {can('ADMISSION_CREATE') && <Link className="btn" to="/admissions/new">New admission</Link>}
          </>
        }
      />
      <Card>
        <form className="filters" onSubmit={submit}>
          <Input className="wide" label="Search" value={f.q} onChange={(v) => setF({ ...f, q: v })} placeholder="Name, ID, admission no., mobile…" />
          <Select label="Course" value={f.courseId} onChange={(v) => setF({ ...f, courseId: v, batchId: '' })} options={(lookups?.courses ?? []).map((c) => ({ value: c.CourseId, label: c.CourseCode }))} placeholder="All" />
          <Select
            label="Batch" value={f.batchId} onChange={(v) => setF({ ...f, batchId: v })} placeholder="All"
            options={(lookups?.batches ?? []).filter((b) => !f.courseId || String(b.CourseId) === f.courseId).map((b) => ({ value: b.BatchId, label: b.BatchCode }))}
          />
          <Select label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v })} options={statusOptions(lookups, 'STUDENT')} placeholder="All" />
          <button className="btn">Search</button>
        </form>
        <ErrorBox error={error} />
        <Table
          columns={[
            { key: 'StudentCode', label: 'Student ID' },
            { key: 'StudentName', label: 'Name' },
            { key: 'FatherName', label: "Father's name" },
            { key: 'Mobile', label: 'Mobile' },
            { key: 'AdmissionNumber', label: 'Admission no.' },
            { key: 'CourseCode', label: 'Course' },
            { key: 'BatchCode', label: 'Batch' },
            { key: 'StudentStatus', label: 'Status', type: 'status' },
            { key: 'Outstanding', label: 'Due', type: 'money' },
          ]}
          rows={data?.rows}
          onRowClick={(r) => nav(`/students/${r.StudentId}`)}
          rowKey={(r) => r.StudentId}
        />
      </Card>
    </>
  );
}

const EMPTY_STUDENT = {
  StudentName: '', FatherName: '', MotherName: '', GuardianName: '', DateOfBirth: '', Gender: '', Mobile: '', GuardianMobile: '', Email: '',
  RollNumber: '', UniversityRegNo: '', AddressLine1: '', AddressLine2: '', Village: '', District: '', State: 'Bihar', PinCode: '', Remarks: '',
};

export function StudentFields({ v, set }: { v: any; set: (v: any) => void }) {
  const u = (k: string) => (val: string) => set({ ...v, [k]: val });
  return (
    <div className="form-grid">
      <Input label="Student name" value={v.StudentName} onChange={u('StudentName')} required />
      <Input label="Father's name" value={v.FatherName} onChange={u('FatherName')} />
      <Input label="Mother's name" value={v.MotherName} onChange={u('MotherName')} />
      <Input label="Guardian name" value={v.GuardianName} onChange={u('GuardianName')} />
      <Input label="Date of birth" type="date" value={v.DateOfBirth} onChange={u('DateOfBirth')} />
      <Select label="Gender" value={v.Gender} onChange={u('Gender')} options={['Female', 'Male', 'Other'].map((g) => ({ value: g, label: g }))} />
      <Input label="Mobile" value={v.Mobile} onChange={u('Mobile')} />
      <Input label="Guardian mobile" value={v.GuardianMobile} onChange={u('GuardianMobile')} />
      <Input label="Email" type="email" value={v.Email} onChange={u('Email')} />
      <Input label="Roll number" value={v.RollNumber} onChange={u('RollNumber')} />
      <Input label="University registration no." value={v.UniversityRegNo} onChange={u('UniversityRegNo')} />
      <Input label="Address line 1" value={v.AddressLine1} onChange={u('AddressLine1')} />
      <Input label="Address line 2" value={v.AddressLine2} onChange={u('AddressLine2')} />
      <Input label="Village / town" value={v.Village} onChange={u('Village')} />
      <Input label="District" value={v.District} onChange={u('District')} />
      <Input label="State" value={v.State} onChange={u('State')} />
      <Input label="PIN code" value={v.PinCode} onChange={u('PinCode')} />
      <TextArea label="Remarks" value={v.Remarks} onChange={u('Remarks')} />
    </div>
  );
}

export function emptyStudent() {
  return { ...EMPTY_STUDENT };
}

export function StudentProfile() {
  const { id } = useParams();
  const { can } = useAuth();
  const { lookups } = useLookups();
  const nav = useNavigate();
  const { data, error, reload } = useLoad(() => api.get(`/students/${id}`), [id]);
  const [edit, setEdit] = useState<any>(null);
  const { runSafe, busy } = useAction();
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const s = data.student;
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const r = await runSafe(() => api.put(`/students/${id}`, edit), 'Student updated.');
    if (r) {
      setEdit(null);
      reload();
    }
  };
  const active = data.admissions.find((a: any) => a.AdmissionStatus === 'ACTIVE');
  return (
    <>
      <PageHeader
        title={s.StudentName}
        subtitle={
          <>
            {s.StudentCode} · <Badge status={s.StudentStatus} />
          </>
        }
        actions={
          <>
            {active && can('PAYMENT_CREATE') && <Link className="btn" to={`/receive-payment?admissionId=${active.AdmissionId}`}>Receive payment</Link>}
            {can('STUDENT_EDIT') && (
              <button className="btn btn-ghost" onClick={() => setEdit(Object.fromEntries(Object.keys(EMPTY_STUDENT).concat('StudentStatus').map((k) => [k, s[k] ?? ''])))}>
                Edit details
              </button>
            )}
            {!active && can('ADMISSION_CREATE') && <Link className="btn btn-ghost" to={`/admissions/new?studentId=${s.StudentId}`}>New admission</Link>}
          </>
        }
      />
      <Card title="Student details">
        <KV
          items={[
            ["Father's name", s.FatherName], ["Mother's name", s.MotherName], ['Guardian', s.GuardianName], ['Date of birth', date(s.DateOfBirth)],
            ['Gender', s.Gender], ['Mobile', s.Mobile], ['Guardian mobile', s.GuardianMobile], ['Email', s.Email], ['Roll number', s.RollNumber],
            ['University reg. no.', s.UniversityRegNo],
            ['Address', [s.AddressLine1, s.AddressLine2, s.Village, s.District, s.State, s.PinCode].filter(Boolean).join(', ')],
          ]}
        />
      </Card>
      <Card title="Admissions">
        <Table
          columns={[
            { key: 'AdmissionNumber', label: 'Admission no.' },
            { key: 'AdmissionDate', label: 'Date', type: 'date' },
            { key: 'CourseCode', label: 'Course' },
            { key: 'BatchCode', label: 'Batch' },
            { key: 'SeatNumber', label: 'Seat' },
            { key: 'AdmissionSourceType', label: 'Source', render: (r) => (r.ConsultantName ? `Consultant: ${r.ConsultantName}` : r.AdmissionSourceType) },
            { key: 'AdmissionStatus', label: 'Status', type: 'status' },
            { key: 'NetCharges', label: 'Charges', type: 'money' },
            { key: 'TotalPayments', label: 'Paid', type: 'money' },
            { key: 'Outstanding', label: 'Due', type: 'money' },
            { key: 'AdvanceAvailable', label: 'Advance', type: 'money' },
          ]}
          rows={data.admissions}
          onRowClick={(r) => nav(`/admissions/${r.AdmissionId}`)}
          empty="No admissions yet."
        />
      </Card>
      {edit && (
        <Modal title="Edit student" onClose={() => setEdit(null)} wide>
          <form onSubmit={save}>
            <StudentFields v={edit} set={setEdit} />
            <div className="form-grid" style={{ marginTop: 12 }}>
              <Select label="Student status" value={edit.StudentStatus} onChange={(v) => setEdit({ ...edit, StudentStatus: v })} options={statusOptions(lookups, 'STUDENT')} placeholder={null} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn" disabled={busy}>Save</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
