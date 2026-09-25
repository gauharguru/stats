import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, qs } from '../api';
import { useAuth } from '../auth';
import { Card, Check, ErrorBox, Input, Loading, Modal, PageHeader, Select, Table, Tabs, useAction, useLoad } from '../components/ui';
import { label, money } from '../format';
import { useLookups } from '../lookups';

export function Masters() {
  const [tab, setTab] = useState('courses');
  return (
    <>
      <PageHeader title="Courses, batches & masters" />
      <Tabs
        tabs={[
          { key: 'courses', label: 'Courses' },
          { key: 'batches', label: 'Batches & seats' },
          { key: 'years', label: 'Academic years' },
          { key: 'heads', label: 'Fee heads' },
          { key: 'modes', label: 'Payment modes' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'courses' && <Courses />}
      {tab === 'batches' && <Batches />}
      {tab === 'years' && <Years />}
      {tab === 'heads' && <FeeHeads />}
      {tab === 'modes' && <Modes />}
    </>
  );
}

function useSave() {
  const { reload } = useLookups();
  const { runSafe, busy } = useAction();
  const save = async (fn: () => Promise<any>, msg = 'Saved.') => {
    const r = await runSafe(fn, msg);
    if (r) await reload();
    return r;
  };
  return { save, busy };
}

function Courses() {
  const { lookups } = useLookups();
  const { save, busy } = useSave();
  const [edit, setEdit] = useState<any>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = { ...edit, DurationYears: Number(edit.DurationYears), TotalSemesters: Number(edit.TotalSemesters) || null, DefaultBatchCapacity: Number(edit.DefaultBatchCapacity) };
    if (await save(() => (edit.CourseId ? api.put(`/masters/courses/${edit.CourseId}`, body) : api.post('/masters/courses', body)))) setEdit(null);
  };
  return (
    <Card title="Courses" actions={<button className="btn" onClick={() => setEdit({ CourseCode: '', CourseName: '', DurationYears: '', TotalSemesters: '', FeeCycleType: 'YEARLY', DefaultBatchCapacity: 60 })}>Add course</button>}>
      <Table
        columns={[
          { key: 'CourseCode', label: 'Code' }, { key: 'CourseName', label: 'Name' }, { key: 'DurationYears', label: 'Years', type: 'number' },
          { key: 'FeeCycleType', label: 'Fee cycle', render: (r) => label(r.FeeCycleType) }, { key: 'TotalSemesters', label: 'Semesters', type: 'number' },
          { key: 'DefaultBatchCapacity', label: 'Default intake', type: 'number' }, { key: 'IsActive', label: 'Active', render: (r) => (r.IsActive ? 'Yes' : 'No') },
        ]}
        rows={lookups?.courses}
        onRowClick={(r) => setEdit({ ...r })}
      />
      <p className="muted">Adding a course automatically creates its fee periods (Year 1…n or Semester 1…n, plus a one-time admission period).</p>
      {edit && (
        <Modal title={edit.CourseId ? `Edit ${edit.CourseCode}` : 'Add course'} onClose={() => setEdit(null)}>
          <form onSubmit={submit}>
            <div className="form-grid">
              <Input label="Code" value={edit.CourseCode} onChange={(v) => setEdit({ ...edit, CourseCode: v })} required disabled={!!edit.CourseId} />
              <Input label="Name" value={edit.CourseName} onChange={(v) => setEdit({ ...edit, CourseName: v })} required />
              <Input label="Duration (years)" type="number" value={edit.DurationYears} onChange={(v) => setEdit({ ...edit, DurationYears: v })} required disabled={!!edit.CourseId} />
              <Select label="Fee cycle" value={edit.FeeCycleType} onChange={(v) => setEdit({ ...edit, FeeCycleType: v })} placeholder={null} disabled={!!edit.CourseId}
                options={[{ value: 'YEARLY', label: 'Yearly' }, { value: 'SEMESTER', label: 'Semester-wise' }]} />
              {edit.FeeCycleType === 'SEMESTER' && (
                <Input label="Total semesters" type="number" step="1" value={edit.TotalSemesters} onChange={(v) => setEdit({ ...edit, TotalSemesters: v })} required disabled={!!edit.CourseId} />
              )}
              <Input label="Default batch intake" type="number" step="1" value={edit.DefaultBatchCapacity} onChange={(v) => setEdit({ ...edit, DefaultBatchCapacity: v })} required />
              {edit.CourseId && <Check label="Active" checked={!!edit.IsActive} onChange={(v) => setEdit({ ...edit, IsActive: v })} />}
            </div>
            <div className="form-actions"><button className="btn" disabled={busy}>Save</button></div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

function Batches() {
  const { lookups } = useLookups();
  const { save, busy } = useSave();
  const [edit, setEdit] = useState<any>(null);
  const [seatsOf, setSeatsOf] = useState<any>(null);
  const [chargeOf, setChargeOf] = useState<any>(null);
  const seats = useLoad(() => (seatsOf ? api.get(`/masters/batches/${seatsOf.BatchId}/seats`) : Promise.resolve(null)), [seatsOf]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = { ...edit, CourseId: Number(edit.CourseId), StartYear: Number(edit.StartYear), EndYear: Number(edit.EndYear), IntakeCapacity: Number(edit.IntakeCapacity) };
    if (await save(() => (edit.BatchId ? api.put(`/masters/batches/${edit.BatchId}`, { BatchName: body.BatchName, IntakeCapacity: body.IntakeCapacity, Status: body.Status }) : api.post('/masters/batches', body))))
      setEdit(null);
  };
  const newBatch = () => setEdit({ CourseId: '', BatchCode: '', BatchName: '', StartYear: new Date().getFullYear(), EndYear: '', IntakeCapacity: '', Status: 'ACTIVE', GenerateSeats: true });
  const course = lookups?.courses.find((c) => String(c.CourseId) === String(edit?.CourseId));
  useEffect(() => {
    if (edit && !edit.BatchId && course) {
      const end = Number(edit.StartYear) + Math.ceil(course.DurationYears);
      setEdit((x: any) => ({
        ...x,
        EndYear: x.EndYear || end,
        IntakeCapacity: x.IntakeCapacity || course.DefaultBatchCapacity,
        BatchCode: x.BatchCode || `${course.CourseCode}-${x.StartYear}`,
        BatchName: x.BatchName || `${course.CourseName} ${x.StartYear}-${end}`,
      }));
    }
  }, [edit?.CourseId, edit?.StartYear]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card title="Batches" actions={<button className="btn" onClick={newBatch}>Add batch</button>}>
      <Table
        columns={[
          { key: 'BatchCode', label: 'Code' }, { key: 'BatchName', label: 'Name' }, { key: 'CourseCode', label: 'Course' },
          { key: 'StartYear', label: 'Start' }, { key: 'EndYear', label: 'End' }, { key: 'IntakeCapacity', label: 'Sanctioned intake', type: 'number' },
          { key: 'Status', label: 'Status', type: 'status' },
          {
            key: 'x', label: '', render: (r) => (
              <span className="actions">
                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setSeatsOf(r); }}>Seats</button>
                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setChargeOf(r); }}>Generate charges</button>
              </span>
            ),
          },
        ]}
        rows={lookups?.batches}
        onRowClick={(r) => setEdit({ ...r })}
      />
      {edit && (
        <Modal title={edit.BatchId ? `Edit ${edit.BatchCode}` : 'Add batch'} onClose={() => setEdit(null)}>
          <form onSubmit={submit}>
            <div className="form-grid">
              <Select label="Course" value={edit.CourseId} onChange={(v) => setEdit({ ...edit, CourseId: v, BatchCode: '', BatchName: '', EndYear: '', IntakeCapacity: '' })} required disabled={!!edit.BatchId}
                options={(lookups?.courses ?? []).map((c) => ({ value: c.CourseId, label: c.CourseCode }))} />
              <Input label="Start year" type="number" step="1" value={edit.StartYear} onChange={(v) => setEdit({ ...edit, StartYear: v, BatchCode: '', BatchName: '', EndYear: '' })} required disabled={!!edit.BatchId} />
              <Input label="End year" type="number" step="1" value={edit.EndYear} onChange={(v) => setEdit({ ...edit, EndYear: v })} required disabled={!!edit.BatchId} />
              <Input label="Batch code" value={edit.BatchCode} onChange={(v) => setEdit({ ...edit, BatchCode: v })} required disabled={!!edit.BatchId} />
              <Input label="Batch name" value={edit.BatchName} onChange={(v) => setEdit({ ...edit, BatchName: v })} required />
              <Input label="Sanctioned / planned intake" type="number" step="1" value={edit.IntakeCapacity} onChange={(v) => setEdit({ ...edit, IntakeCapacity: v })} required />
              <Select label="Status" value={edit.Status} onChange={(v) => setEdit({ ...edit, Status: v })} placeholder={null}
                options={['PLANNED', 'ACTIVE', 'COMPLETED', 'CLOSED'].map((s) => ({ value: s, label: label(s) }))} />
              {!edit.BatchId && <Check label="Create numbered seats" checked={edit.GenerateSeats} onChange={(v) => setEdit({ ...edit, GenerateSeats: v })} />}
            </div>
            <div className="form-actions"><button className="btn" disabled={busy}>Save</button></div>
          </form>
        </Modal>
      )}
      {chargeOf && <BatchChargesModal batch={chargeOf} onClose={() => setChargeOf(null)} />}
      {seatsOf && (
        <Modal title={`Seats - ${seatsOf.BatchCode}`} onClose={() => setSeatsOf(null)} wide>
          <Table
            columns={[
              { key: 'SeatNumber', label: 'Seat' }, { key: 'SeatStatus', label: 'Status', type: 'status' },
              { key: 'StudentName', label: 'Current student' }, { key: 'AdmissionNumber', label: 'Admission' },
            ]}
            rows={seats.data?.rows}
          />
        </Modal>
      )}
    </Card>
  );
}

/* Raise a fee period's charges for every active student of a batch (e.g. start of Semester 3) */
function BatchChargesModal({ batch, onClose }: { batch: any; onClose: () => void }) {
  const { lookups } = useLookups();
  const { runSafe, busy } = useAction();
  const [period, setPeriod] = useState('');
  const [result, setResult] = useState<any>(null);
  return (
    <Modal title={`Generate charges - ${batch.BatchCode}`} onClose={onClose} wide>
      {!result ? (
        <form onSubmit={async (e) => {
          e.preventDefault();
          const r = await runSafe(() => api.post('/admissions/batch-charges', { batchId: batch.BatchId, feePeriodId: Number(period) }));
          if (r) setResult(r);
        }}>
          <p className="muted">Creates the fee-structure charges of the selected period for every active admission in this batch. Students already charged for that period are skipped.</p>
          <div className="form-grid">
            <Select label="Fee period" value={period} onChange={setPeriod} required
              options={(lookups?.feePeriods ?? []).filter((p) => p.CourseId === batch.CourseId).map((p) => ({ value: p.FeePeriodId, label: p.PeriodName }))} />
          </div>
          <div className="form-actions"><button className="btn" disabled={busy}>{busy ? 'Working…' : 'Generate'}</button></div>
        </form>
      ) : (
        <>
          <div className="alert alert-ok">{result.chargesCreated} charge(s) created for {result.admissions} active admission(s).</div>
          <Table
            columns={[{ key: 'admissionNumber', label: 'Admission' }, { key: 'created', label: 'Charges created', type: 'number' }, { key: 'error', label: 'Problem' }]}
            rows={result.results}
          />
        </>
      )}
    </Modal>
  );
}

function Years() {
  const { lookups } = useLookups();
  const { save, busy } = useSave();
  const [add, setAdd] = useState<any>(null);
  return (
    <Card title="Academic years" actions={<button className="btn" onClick={() => { const y = Math.max(...(lookups?.academicYears ?? []).map((a) => a.StartYear), 2025) + 1; setAdd({ StartYear: y, StartDate: `${y}-07-01`, EndDate: `${y + 1}-06-30` }); }}>Add year</button>}>
      <Table
        columns={[
          { key: 'AcademicYearCode', label: 'Year' }, { key: 'StartDate', label: 'Starts', type: 'date' }, { key: 'EndDate', label: 'Ends', type: 'date' },
          { key: 'IsCurrent', label: 'Current', render: (r) => (r.IsCurrent ? <span className="badge badge-good">Current</span> : '') },
          { key: 'IsClosed', label: 'Closed', render: (r) => (r.IsClosed ? 'Closed' : '') },
          {
            key: 'x', label: '', render: (r) => (
              <span className="actions">
                {!r.IsCurrent && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => save(() => api.post(`/masters/academic-years/${r.AcademicYearId}/set-current`))}>Make current</button>}
                <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => save(() => api.post(`/masters/academic-years/${r.AcademicYearId}/close`, { closed: !r.IsClosed }))}>{r.IsClosed ? 'Re-open' : 'Close'}</button>
              </span>
            ),
          },
        ]}
        rows={lookups?.academicYears}
      />
      <p className="muted">Several academic years can be active at once. Older years are never overwritten.</p>
      {add && (
        <Modal title="Add academic year" onClose={() => setAdd(null)}>
          <form onSubmit={async (e) => { e.preventDefault(); if (await save(() => api.post('/masters/academic-years', { ...add, StartYear: Number(add.StartYear) }))) setAdd(null); }}>
            <div className="form-grid">
              <Input label="Start year" type="number" step="1" value={add.StartYear} onChange={(v) => setAdd({ ...add, StartYear: v, StartDate: `${v}-07-01`, EndDate: `${Number(v) + 1}-06-30` })} required />
              <Input label="Start date" type="date" value={add.StartDate} onChange={(v) => setAdd({ ...add, StartDate: v })} required />
              <Input label="End date" type="date" value={add.EndDate} onChange={(v) => setAdd({ ...add, EndDate: v })} required />
            </div>
            <div className="form-actions"><button className="btn" disabled={busy}>Save</button></div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

function FeeHeads() {
  const { lookups } = useLookups();
  const { save, busy } = useSave();
  const [edit, setEdit] = useState<any>(null);
  return (
    <Card title="Fee heads" actions={<button className="btn" onClick={() => setEdit({ FeeHeadCode: '', FeeHeadName: '', FeeCategory: 'ACADEMIC', IsRefundable: false, IsSecurityDeposit: false, DisplayOrder: 100, IsActive: true })}>Add fee head</button>}>
      <Table
        columns={[
          { key: 'FeeHeadCode', label: 'Code' }, { key: 'FeeHeadName', label: 'Name' }, { key: 'FeeCategory', label: 'Category', render: (r) => label(r.FeeCategory) },
          { key: 'IsRefundable', label: 'Refundable', render: (r) => (r.IsRefundable ? 'Yes' : '') }, { key: 'DisplayOrder', label: 'Order', type: 'number' },
          { key: 'IsActive', label: 'Active', render: (r) => (r.IsActive ? 'Yes' : 'No') },
        ]}
        rows={lookups?.feeHeads}
        onRowClick={(r) => setEdit({ ...r, IsRefundable: !!r.IsRefundable, IsSecurityDeposit: !!r.IsSecurityDeposit, IsActive: !!r.IsActive })}
      />
      <p className="muted">Fee heads are never deleted; deactivate a head to stop using it. Historical charges keep their head.</p>
      {edit && (
        <Modal title={edit.FeeHeadId ? `Edit ${edit.FeeHeadCode}` : 'Add fee head'} onClose={() => setEdit(null)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const body = { ...edit, DisplayOrder: Number(edit.DisplayOrder) };
            if (await save(() => (edit.FeeHeadId ? api.put(`/masters/fee-heads/${edit.FeeHeadId}`, { FeeHeadName: body.FeeHeadName, FeeCategory: body.FeeCategory, IsRefundable: body.IsRefundable, IsSecurityDeposit: body.IsSecurityDeposit, DisplayOrder: body.DisplayOrder, IsActive: body.IsActive }) : api.post('/masters/fee-heads', body)))) setEdit(null);
          }}>
            <div className="form-grid">
              <Input label="Code" value={edit.FeeHeadCode} onChange={(v) => setEdit({ ...edit, FeeHeadCode: v })} required disabled={!!edit.FeeHeadId} />
              <Input label="Name" value={edit.FeeHeadName} onChange={(v) => setEdit({ ...edit, FeeHeadName: v })} required />
              <Select label="Category" value={edit.FeeCategory} onChange={(v) => setEdit({ ...edit, FeeCategory: v })} placeholder={null}
                options={['ONE_TIME', 'ACADEMIC', 'EXAM', 'HOSTEL', 'TRANSPORT', 'DEPOSIT', 'PENALTY', 'OTHER'].map((c) => ({ value: c, label: label(c) }))} />
              <Input label="Display order" type="number" step="1" value={edit.DisplayOrder} onChange={(v) => setEdit({ ...edit, DisplayOrder: v })} />
              <Check label="Refundable" checked={edit.IsRefundable} onChange={(v) => setEdit({ ...edit, IsRefundable: v })} />
              <Check label="Security deposit" checked={edit.IsSecurityDeposit} onChange={(v) => setEdit({ ...edit, IsSecurityDeposit: v })} />
              <Check label="Active" checked={edit.IsActive} onChange={(v) => setEdit({ ...edit, IsActive: v })} />
            </div>
            <div className="form-actions"><button className="btn" disabled={busy}>Save</button></div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

function Modes() {
  const { lookups } = useLookups();
  const { save, busy } = useSave();
  const toggle = (m: any, k: string) => save(() => api.put(`/masters/payment-modes/${m.PaymentModeId}`, { [k]: !m[k] }));
  return (
    <Card title="Payment modes">
      <Table
        columns={[
          { key: 'PaymentModeName', label: 'Mode' },
          ...(['RequiresReference', 'RequiresBank', 'RequiresChequeDetails', 'IsActive'] as const).map((k) => ({
            key: k, label: label(k.replace(/([a-z])([A-Z])/g, '$1_$2')), render: (m: any) => <input type="checkbox" checked={!!m[k]} disabled={busy} onChange={() => toggle(m, k)} style={{ width: 'auto' }} />,
          })),
        ]}
        rows={lookups?.paymentModes}
      />
    </Card>
  );
}

/* ---------------- fee structure grid -------------------------------- */
export function FeeStructure() {
  const { lookups } = useLookups();
  const { can } = useAuth();
  const { runSafe, busy } = useAction();
  const editable = can('FEE_STRUCTURE_EDIT');
  const [f, setF] = useState({ courseId: '', batchId: '', academicYearId: '', feePeriodId: '' });
  const url = `/masters/fee-structures${qs({ courseId: f.courseId, batchId: f.batchId, includeCourseWide: 'false', academicYearId: f.academicYearId, feePeriodId: f.feePeriodId })}`;
  const ready = f.courseId && f.academicYearId && f.feePeriodId;
  const { data, error, reload } = useLoad(() => (ready ? api.get(url) : Promise.resolve({ rows: [] })), [url, ready]);
  const [draft, setDraft] = useState<Record<number, { amount: string; due: string }>>({});
  const [copy, setCopy] = useState<any>(null);
  useEffect(() => {
    const m: Record<number, { amount: string; due: string }> = {};
    for (const r of data?.rows ?? []) if (String(r.BatchId ?? '') === f.batchId) m[r.FeeHeadId] = { amount: String(r.Amount), due: r.DueDate ?? '' };
    setDraft(m);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const course = lookups?.courses.find((c) => String(c.CourseId) === f.courseId);
  const periods = (lookups?.feePeriods ?? []).filter((p) => String(p.CourseId) === f.courseId);
  const batch = lookups?.batches.find((b) => String(b.BatchId) === f.batchId);
  /* Suggest the academic year for a batch + period */
  const suggestYear = (periodId: string, batchId: string) => {
    const p = periods.find((x) => String(x.FeePeriodId) === periodId);
    const b = lookups?.batches.find((x) => String(x.BatchId) === batchId);
    if (!p || !b) return '';
    const off = p.PeriodType === 'YEAR' ? p.PeriodNumber - 1 : p.PeriodType === 'SEMESTER' ? Math.floor((p.PeriodNumber - 1) / 2) : 0;
    return String(lookups?.academicYears.find((y) => y.StartYear === b.StartYear + off)?.AcademicYearId ?? '');
  };
  const heads = useMemo(() => (lookups?.feeHeads ?? []).filter((h) => h.IsActive), [lookups]);
  const total = Object.values(draft).reduce((s, x) => s + (Number(x.amount) || 0), 0);

  const saveAll = async () => {
    const existing = new Map<number, any>((data?.rows ?? []).filter((r: any) => String(r.BatchId ?? '') === f.batchId).map((r: any) => [r.FeeHeadId, r]));
    let n = 0;
    for (const h of heads) {
      const d = draft[h.FeeHeadId];
      const amt = Number(d?.amount || 0);
      const ex = existing.get(h.FeeHeadId);
      if (!ex && !amt) continue;
      if (ex && Number(ex.Amount) === amt && (ex.DueDate ?? '') === (d?.due ?? '')) continue;
      const r = await runSafe(() => api.post('/masters/fee-structures', {
        CourseId: Number(f.courseId), BatchId: Number(f.batchId) || null, AcademicYearId: Number(f.academicYearId), FeePeriodId: Number(f.feePeriodId),
        FeeHeadId: h.FeeHeadId, Amount: amt, DueDate: d?.due || null,
      }));
      if (!r) return;
      n++;
    }
    await runSafe(async () => n, n ? `${n} fee line(s) saved.` : 'No changes.');
    reload();
  };

  return (
    <>
      <PageHeader title="Fee structure" subtitle="What the college intends to charge - per course, batch, academic year and fee period"
        actions={editable && <button className="btn btn-ghost" onClick={() => setCopy({ FromBatchId: f.batchId, FromAcademicYearId: f.academicYearId, ToBatchId: '', ToAcademicYearId: '', IncreasePercent: 0 })} disabled={!f.courseId || !f.academicYearId}>Copy to another year / batch</button>} />
      <Card>
        <div className="filters">
          <Select label="Course" value={f.courseId} onChange={(v) => setF({ courseId: v, batchId: '', academicYearId: '', feePeriodId: '' })} required
            options={(lookups?.courses ?? []).map((c) => ({ value: c.CourseId, label: c.CourseCode }))} />
          <Select label="Batch" value={f.batchId} onChange={(v) => setF({ ...f, batchId: v, academicYearId: suggestYear(f.feePeriodId, v) || f.academicYearId })} placeholder="All batches (course-wide)"
            options={(lookups?.batches ?? []).filter((b) => String(b.CourseId) === f.courseId).map((b) => ({ value: b.BatchId, label: b.BatchCode }))} />
          <Select label="Fee period" value={f.feePeriodId} onChange={(v) => setF({ ...f, feePeriodId: v, academicYearId: suggestYear(v, f.batchId) || f.academicYearId })} required
            options={periods.map((p) => ({ value: p.FeePeriodId, label: p.PeriodName }))} />
          <Select label="Academic year" value={f.academicYearId} onChange={(v) => setF({ ...f, academicYearId: v })} required
            options={(lookups?.academicYears ?? []).map((y) => ({ value: y.AcademicYearId, label: y.AcademicYearCode }))} />
        </div>
        {!ready ? (
          <div className="muted">Choose course, fee period and academic year.{course?.FeeCycleType === 'SEMESTER' && ' For semester courses, semesters 1-2 fall in the batch\'s first academic year, 3-4 in the second, and so on.'}</div>
        ) : !data ? (
          <Loading />
        ) : (
          <>
            <ErrorBox error={error} />
            <p className="muted">
              {batch ? `Batch-specific amounts for ${batch.BatchCode} override the course-wide amounts.` : 'Course-wide amounts apply to every batch that has no batch-specific amount.'} Amounts
              already charged to students never change; editing a line that has charges creates a new version.
            </p>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Fee head</th><th style={{ textAlign: 'right' }}>Amount (₹)</th><th>Due date</th><th style={{ textAlign: 'right' }}>Students charged</th></tr></thead>
                <tbody>
                  {heads.map((h) => {
                    const ex = (data.rows as any[]).find((r) => r.FeeHeadId === h.FeeHeadId && String(r.BatchId ?? '') === f.batchId);
                    return (
                      <tr key={h.FeeHeadId}>
                        <td>{h.FeeHeadName}</td>
                        <td style={{ textAlign: 'right' }}>
                          <input type="number" min="0" step="0.01" style={{ width: 150, textAlign: 'right' }} disabled={!editable} value={draft[h.FeeHeadId]?.amount ?? ''}
                            onChange={(e) => setDraft({ ...draft, [h.FeeHeadId]: { amount: e.target.value, due: draft[h.FeeHeadId]?.due ?? '' } })} />
                        </td>
                        <td>
                          <input type="date" style={{ width: 160 }} disabled={!editable} value={draft[h.FeeHeadId]?.due ?? ''}
                            onChange={(e) => setDraft({ ...draft, [h.FeeHeadId]: { amount: draft[h.FeeHeadId]?.amount ?? '', due: e.target.value } })} />
                        </td>
                        <td className="num" style={{ textAlign: 'right' }}>{ex?.ChargeCount ?? ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr><td>Total</td><td className="num" style={{ textAlign: 'right' }}>{money(total)}</td><td /><td /></tr></tfoot>
              </table>
            </div>
            {editable && <div className="form-actions"><button className="btn" disabled={busy} onClick={saveAll}>Save fee structure</button></div>}
          </>
        )}
      </Card>
      {copy && (
        <Modal title="Copy fee structure" onClose={() => setCopy(null)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const r = await runSafe(() => api.post('/masters/fee-structures/copy', {
              CourseId: Number(f.courseId), FromBatchId: Number(copy.FromBatchId) || null, FromAcademicYearId: Number(copy.FromAcademicYearId),
              ToBatchId: Number(copy.ToBatchId) || null, ToAcademicYearId: Number(copy.ToAcademicYearId), IncreasePercent: Number(copy.IncreasePercent) || 0,
            }));
            if (r) { alert(`${r.copied} line(s) copied.`); setCopy(null); reload(); }
          }}>
            <p className="muted">Copies every fee period of {course?.CourseCode} from the source to the target. Lines that already exist in the target are skipped.</p>
            <div className="form-grid">
              <Select label="From batch" value={copy.FromBatchId} onChange={(v) => setCopy({ ...copy, FromBatchId: v })} placeholder="Course-wide"
                options={(lookups?.batches ?? []).filter((b) => String(b.CourseId) === f.courseId).map((b) => ({ value: b.BatchId, label: b.BatchCode }))} />
              <Select label="From year" value={copy.FromAcademicYearId} onChange={(v) => setCopy({ ...copy, FromAcademicYearId: v })} required
                options={(lookups?.academicYears ?? []).map((y) => ({ value: y.AcademicYearId, label: y.AcademicYearCode }))} />
              <Select label="To batch" value={copy.ToBatchId} onChange={(v) => setCopy({ ...copy, ToBatchId: v })} placeholder="Course-wide"
                options={(lookups?.batches ?? []).filter((b) => String(b.CourseId) === f.courseId).map((b) => ({ value: b.BatchId, label: b.BatchCode }))} />
              <Select label="To year" value={copy.ToAcademicYearId} onChange={(v) => setCopy({ ...copy, ToAcademicYearId: v })} required
                options={(lookups?.academicYears ?? []).map((y) => ({ value: y.AcademicYearId, label: y.AcademicYearCode }))} />
              <Input label="Increase %" type="number" value={copy.IncreasePercent} onChange={(v) => setCopy({ ...copy, IncreasePercent: v })} />
            </div>
            <div className="form-actions"><button className="btn" disabled={busy}>Copy</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
