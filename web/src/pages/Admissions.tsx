import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api';
import { useAuth } from '../auth';
import { Card, Check, ErrorBox, ExportButton, Input, PageHeader, Select, Table, TextArea, useAction, useLoad } from '../components/ui';
import { label, todayISO } from '../format';
import { statusOptions, useLookups } from '../lookups';
import { emptyStudent, StudentFields } from './Students';

export function AdmissionsList() {
  const { can } = useAuth();
  const { lookups } = useLookups();
  const nav = useNavigate();
  const [f, setF] = useState({ q: '', courseId: '', batchId: '', status: '', source: '', from: '', to: '', replacement: '' });
  const [applied, setApplied] = useState(f);
  const { data, error } = useLoad(() => api.get(`/admissions${qs(applied)}`), [applied]);
  return (
    <>
      <PageHeader
        title="Admissions"
        actions={
          <>
            <ExportButton url={`/admissions${qs(applied)}`} fileName="admissions" />
            {can('ADMISSION_CREATE') && <Link className="btn" to="/admissions/new">New admission</Link>}
          </>
        }
      />
      <Card>
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(f);
          }}
        >
          <Input className="wide" label="Search" value={f.q} onChange={(v) => setF({ ...f, q: v })} placeholder="Name or admission no." />
          <Select label="Course" value={f.courseId} onChange={(v) => setF({ ...f, courseId: v, batchId: '' })} options={(lookups?.courses ?? []).map((c) => ({ value: c.CourseId, label: c.CourseCode }))} placeholder="All" />
          <Select
            label="Batch" value={f.batchId} onChange={(v) => setF({ ...f, batchId: v })} placeholder="All"
            options={(lookups?.batches ?? []).filter((b) => !f.courseId || String(b.CourseId) === f.courseId).map((b) => ({ value: b.BatchId, label: b.BatchCode }))}
          />
          <Select label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v })} options={statusOptions(lookups, 'ADMISSION')} placeholder="All" />
          <Select label="Source" value={f.source} onChange={(v) => setF({ ...f, source: v })} options={['DIRECT', 'CONSULTANT', 'REFERRAL', 'OTHER'].map((s) => ({ value: s, label: label(s) }))} placeholder="All" />
          <Input label="From" type="date" value={f.from} onChange={(v) => setF({ ...f, from: v })} />
          <Input label="To" type="date" value={f.to} onChange={(v) => setF({ ...f, to: v })} />
          <Select label="Replacement" value={f.replacement} onChange={(v) => setF({ ...f, replacement: v })} options={[{ value: 'true', label: 'Replacement only' }]} placeholder="All" />
          <button className="btn">Apply</button>
        </form>
        <ErrorBox error={error} />
        <Table
          columns={[
            { key: 'AdmissionNumber', label: 'Admission no.' },
            { key: 'AdmissionDate', label: 'Date', type: 'date' },
            { key: 'StudentName', label: 'Student' },
            { key: 'CourseCode', label: 'Course' },
            { key: 'BatchCode', label: 'Batch' },
            { key: 'SeatNumber', label: 'Seat' },
            { key: 'AdmissionSourceType', label: 'Source', render: (r) => (r.ConsultantName ? r.ConsultantName : label(r.AdmissionSourceType)) },
            { key: 'AdmissionStatus', label: 'Status', type: 'status' },
            { key: 'NetCharges', label: 'Charges', type: 'money' },
            { key: 'TotalPayments', label: 'Paid', type: 'money' },
            { key: 'Outstanding', label: 'Due', type: 'money' },
          ]}
          rows={data?.rows}
          onRowClick={(r) => nav(`/admissions/${r.AdmissionId}`)}
          rowKey={(r) => r.AdmissionId}
        />
      </Card>
    </>
  );
}

export function NewAdmission() {
  const { lookups } = useLookups();
  const { can } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const existingStudentId = params.get('studentId');
  const { runSafe, busy } = useAction();
  const [student, setStudent] = useState<any>(emptyStudent());
  const [existing, setExisting] = useState<any>(null);
  const [a, setA] = useState({
    courseId: '', batchId: '', admissionDate: todayISO(), admissionSourceType: 'DIRECT', consultantId: '', referralName: '', seatId: '', remarks: '',
    generateInitialCharges: true,
  });
  const [seats, setSeats] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (existingStudentId) api.get(`/students/${existingStudentId}`).then((r) => setExisting(r.student));
  }, [existingStudentId]);
  useEffect(() => {
    if (!a.batchId) return setSeats([]);
    api.get(`/masters/batches/${a.batchId}/seats`).then((r) => setSeats(r.rows)).catch(() => setSeats([]));
  }, [a.batchId]);

  const batches = useMemo(
    () => (lookups?.batches ?? []).filter((b) => String(b.CourseId) === a.courseId && ['ACTIVE', 'PLANNED'].includes(b.Status)),
    [lookups, a.courseId],
  );
  const freeSeats = seats.filter((s) => ['AVAILABLE', 'RELEASED', 'RESERVED'].includes(s.SeatStatus));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = {
      ...a,
      courseId: Number(a.courseId),
      batchId: Number(a.batchId),
      consultantId: a.admissionSourceType === 'CONSULTANT' ? Number(a.consultantId) || null : null,
      seatId: Number(a.seatId) || null,
      studentId: existing ? existing.StudentId : null,
      student: existing ? null : student,
    };
    const r = await runSafe(() => api.post('/admissions', body), 'Admission created.');
    if (r) setResult(r);
  };

  if (result)
    return (
      <>
        <PageHeader title="Admission created" />
        <Card>
          <div className="alert alert-ok">
            Admission number <b>{result.admissionNumber}</b> created.
          </div>
          {result.charges?.map((c: any, i: number) =>
            c.error ? (
              <div key={i} className="alert alert-warn">Charges not generated: {c.error}</div>
            ) : (
              <div key={i} className="muted">{c.periodName}: {c.created} charge(s) generated.</div>
            ),
          )}
          {result.consultantPayable && (
            <div className="muted">
              Consultant payable {result.consultantPayable.autoApproved ? 'created' : 'submitted for approval'}.
            </div>
          )}
          <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="btn" onClick={() => nav(`/admissions/${result.admissionId}`)}>Open admission</button>
            {can('PAYMENT_CREATE') && <button className="btn btn-ghost" onClick={() => nav(`/receive-payment?admissionId=${result.admissionId}`)}>Receive payment</button>}
            <button className="btn btn-ghost" onClick={() => { setResult(null); setStudent(emptyStudent()); setExisting(null); }}>Another admission</button>
          </div>
        </Card>
      </>
    );

  return (
    <form onSubmit={submit}>
      <PageHeader title="New admission" />
      <Card title="Student">
        {existing ? (
          <div className="alert alert-info">
            Existing student: <b>{existing.StudentName}</b> ({existing.StudentCode}){' '}
            <button type="button" className="link-btn" onClick={() => setExisting(null)}>Enter a new student instead</button>
          </div>
        ) : (
          <StudentFields v={student} set={setStudent} />
        )}
      </Card>
      <Card title="Admission">
        <div className="form-grid">
          <Select label="Course" value={a.courseId} onChange={(v) => setA({ ...a, courseId: v, batchId: '', seatId: '' })} required
            options={(lookups?.courses ?? []).filter((c) => c.IsActive).map((c) => ({ value: c.CourseId, label: `${c.CourseCode} - ${c.CourseName}` }))} />
          <Select label="Batch" value={a.batchId} onChange={(v) => setA({ ...a, batchId: v, seatId: '' })} required
            options={batches.map((b) => ({ value: b.BatchId, label: `${b.BatchCode} (${b.BatchName})` }))}
            hint={a.courseId && !batches.length ? 'No open batch - create one under Setup.' : undefined} />
          <Input label="Admission date" type="date" value={a.admissionDate} onChange={(v) => setA({ ...a, admissionDate: v })} required max={todayISO()} />
          <Select label="Seat" value={a.seatId} onChange={(v) => setA({ ...a, seatId: v })}
            options={freeSeats.map((s) => ({ value: s.SeatId, label: `Seat ${s.SeatNumber}${s.SeatStatus === 'RELEASED' ? ' (released - replacement)' : ''}` }))}
            placeholder="Not assigned" hint={seats.length ? `${freeSeats.length} of ${seats.length} seats free` : undefined} />
          <Select label="Admission source" value={a.admissionSourceType} onChange={(v) => setA({ ...a, admissionSourceType: v })} required placeholder={null}
            options={['DIRECT', 'CONSULTANT', 'REFERRAL', 'OTHER'].map((s) => ({ value: s, label: label(s) }))} />
          {a.admissionSourceType === 'CONSULTANT' && (
            <Select label="Consultant" value={a.consultantId} onChange={(v) => setA({ ...a, consultantId: v })} required
              options={(lookups?.consultants ?? []).filter((c) => c.Status === 'ACTIVE').map((c) => ({ value: c.ConsultantId, label: `${c.ConsultantName} (${c.ConsultantCode})` }))} />
          )}
          {a.admissionSourceType === 'REFERRAL' && <Input label="Referred by" value={a.referralName} onChange={(v) => setA({ ...a, referralName: v })} />}
          <TextArea label="Remarks" value={a.remarks} onChange={(v) => setA({ ...a, remarks: v })} />
          <div className="span-all">
            <Check label="Generate admission-time and first year/semester fee charges from the fee structure" checked={a.generateInitialCharges}
              onChange={(v) => setA({ ...a, generateInitialCharges: v })} />
          </div>
        </div>
        <div className="form-actions">
          <button className="btn" disabled={busy}>Create admission</button>
        </div>
      </Card>
    </form>
  );
}
