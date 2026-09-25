import { Db } from '../db';
import { audit, AuditContext } from '../lib/audit';
import { today } from '../lib/dates';
import { badRequest, notFound } from '../lib/errors';
import { getBoolSetting } from '../lib/settings';
import { createAutoPayable } from './consultant';
import { generateCharges, lockAdmission, requestWaiver, dueCharges } from './finance';

type Ctx = AuditContext & { userId: number };

export const STUDENT_FIELDS = [
  'RollNumber', 'UniversityRegNo', 'StudentName', 'FatherName', 'MotherName', 'GuardianName', 'DateOfBirth', 'Gender',
  'Mobile', 'GuardianMobile', 'Email', 'AddressLine1', 'AddressLine2', 'Village', 'District', 'State', 'PinCode',
  'PhotoPath', 'Remarks',
] as const;

export type StudentInput = Partial<Record<(typeof STUDENT_FIELDS)[number], string | null>> & { StudentName: string };

export async function createStudent(d: Db, ctx: Ctx, input: StudentInput, status = 'APPLICANT') {
  const code = await d.nextDocumentNumber('STUDENT', today());
  const values: Record<string, unknown> = { StudentCode: code, StudentStatus: status, CreatedBy: ctx.userId };
  for (const f of STUDENT_FIELDS) if (input[f] !== undefined) values[f] = input[f] || null;
  const id = await d.insert('admission.Students', values, 'StudentId');
  await audit(d, ctx, 'STUDENT_CREATED', 'Student', id, { newValues: { StudentCode: code, ...input } });
  return { studentId: id, studentCode: code };
}

export async function updateStudent(d: Db, ctx: Ctx, studentId: number, input: Partial<StudentInput> & { StudentStatus?: string }) {
  const old = await d.one('SELECT * FROM admission.Students WITH (UPDLOCK) WHERE StudentId = @id', { id: studentId });
  if (!old) throw notFound('Student');
  const sets: string[] = [];
  const params: Record<string, unknown> = { id: studentId, u: ctx.userId };
  const changed: Record<string, unknown> = {};
  const oldVals: Record<string, unknown> = {};
  for (const f of [...STUDENT_FIELDS, 'StudentStatus'] as const) {
    const v = (input as any)[f];
    if (v === undefined) continue;
    const nv = v === '' ? null : v;
    if ((old[f] ?? null) === nv) continue;
    sets.push(`${f} = @${f}`);
    params[f] = nv;
    changed[f] = nv;
    oldVals[f] = old[f];
  }
  if (!sets.length) return;
  await d.exec(`UPDATE admission.Students SET ${sets.join(', ')}, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @u WHERE StudentId = @id`, params);
  await audit(d, ctx, 'STUDENT_UPDATED', 'Student', studentId, { oldValues: oldVals, newValues: changed });
}

export interface AdmissionInput {
  studentId?: number | null;
  student?: StudentInput | null;
  courseId: number;
  batchId: number;
  admissionDate?: string | null;
  admissionSourceType: 'DIRECT' | 'CONSULTANT' | 'REFERRAL' | 'OTHER';
  consultantId?: number | null;
  referralName?: string | null;
  seatId?: number | null;
  remarks?: string | null;
  generateInitialCharges?: boolean;
}

export async function createAdmission(d: Db, ctx: Ctx, input: AdmissionInput) {
  const admissionDate = input.admissionDate || today();
  const batch = await d.one('SELECT * FROM academic.Batches WITH (UPDLOCK) WHERE BatchId = @id', { id: input.batchId });
  if (!batch || Number(batch.CourseId) !== input.courseId) throw badRequest('Batch does not belong to the selected course.');
  if (!['PLANNED', 'ACTIVE'].includes(batch.Status)) throw badRequest('Batch is not open for admission.');
  const occupied = await d.one(
    `SELECT COUNT(*) AS n FROM admission.Admissions WHERE BatchId = @b AND AdmissionStatus IN (N'ACTIVE', N'PENDING', N'SUSPENDED')`,
    { b: input.batchId },
  );
  if (occupied.n >= batch.IntakeCapacity)
    throw badRequest(`Batch ${batch.BatchCode} is full (${batch.IntakeCapacity} seats). Increase the intake capacity if more seats were sanctioned.`, 'BATCH_FULL');

  if (input.admissionSourceType === 'CONSULTANT') {
    if (!input.consultantId) throw badRequest('Consultant is mandatory when the admission source is Consultant.', 'CONSULTANT_REQUIRED');
    const c = await d.one('SELECT Status FROM consultant.Consultants WHERE ConsultantId = @id', { id: input.consultantId });
    if (!c || c.Status !== 'ACTIVE') throw badRequest('Consultant is not active.');
  }

  let studentId = input.studentId ?? null;
  if (!studentId) {
    if (!input.student?.StudentName) throw badRequest('Student details are required.');
    studentId = (await createStudent(d, ctx, input.student, 'ADMITTED')).studentId;
  } else {
    const s = await d.one('SELECT StudentId FROM admission.Students WHERE StudentId = @id', { id: studentId });
    if (!s) throw notFound('Student');
    const active = await d.one(
      `SELECT TOP 1 AdmissionNumber FROM admission.Admissions WHERE StudentId = @id AND AdmissionStatus IN (N'ACTIVE', N'PENDING')`,
      { id: studentId },
    );
    if (active) throw badRequest(`Student already has an active admission (${active.AdmissionNumber}).`);
  }

  let replacesAdmissionId: number | null = null;
  if (input.seatId) {
    const seat = await d.one('SELECT * FROM admission.Seats WITH (UPDLOCK) WHERE SeatId = @id', { id: input.seatId });
    if (!seat || Number(seat.BatchId) !== input.batchId) throw badRequest('Seat does not belong to the selected batch.');
    if (!['AVAILABLE', 'RELEASED', 'RESERVED'].includes(seat.SeatStatus)) throw badRequest(`Seat ${seat.SeatNumber} is ${seat.SeatStatus.toLowerCase()}.`);
    if (seat.SeatStatus === 'RELEASED') {
      const prev = await d.one(
        `SELECT TOP 1 AdmissionId FROM admission.AdmissionSeatHistory WHERE SeatId = @id ORDER BY AdmissionSeatHistoryId DESC`,
        { id: input.seatId },
      );
      replacesAdmissionId = prev ? Number(prev.AdmissionId) : null;
    }
  }

  const ay = await d.one('SELECT AcademicYearId FROM academic.AcademicYears WHERE StartYear = @y', { y: batch.StartYear });
  const admissionNumber = await d.nextDocumentNumber('ADMISSION', admissionDate);
  const admissionId = await d.insert(
    'admission.Admissions',
    {
      StudentId: studentId,
      AdmissionNumber: admissionNumber,
      CourseId: input.courseId,
      BatchId: input.batchId,
      AdmissionDate: admissionDate,
      AdmissionStatus: 'ACTIVE',
      AdmissionSourceType: input.admissionSourceType,
      ConsultantId: input.admissionSourceType === 'CONSULTANT' ? input.consultantId : null,
      ReferralName: input.referralName ?? null,
      SeatId: input.seatId ?? null,
      ReplacesAdmissionId: replacesAdmissionId,
      CurrentAcademicYearId: ay ? ay.AcademicYearId : null,
      Remarks: input.remarks ?? null,
      CreatedBy: ctx.userId,
    },
    'AdmissionId',
  );
  if (input.seatId) {
    await d.exec(
      `UPDATE admission.Seats SET SeatStatus = N'OCCUPIED' WHERE SeatId = @s;
       INSERT INTO admission.AdmissionSeatHistory (SeatId, AdmissionId, OccupiedFrom, Status, Remarks, CreatedBy)
       VALUES (@s, @a, @dt, N'OCCUPIED', @rem, @u);`,
      { s: input.seatId, a: admissionId, dt: admissionDate, rem: replacesAdmissionId ? 'Replacement admission' : null, u: ctx.userId },
    );
  }
  await d.exec(`UPDATE admission.Students SET StudentStatus = N'ACTIVE', UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @u WHERE StudentId = @id`, {
    id: studentId,
    u: ctx.userId,
  });
  await audit(d, ctx, 'ADMISSION_CREATED', 'Admission', admissionId, {
    newValues: { admissionNumber, studentId, ...input, student: undefined, replacesAdmissionId },
  });

  const charges: unknown[] = [];
  if (input.generateInitialCharges !== false) {
    const periods = await d.query(
      `SELECT FeePeriodId FROM academic.FeePeriods WHERE CourseId = @c AND IsActive = 1 AND PeriodNumber IN (0, 1) ORDER BY PeriodNumber`,
      { c: input.courseId },
    );
    for (const p of periods) {
      try {
        charges.push(await generateCharges(d, ctx, admissionId, Number(p.FeePeriodId)));
      } catch (e: any) {
        if (e?.code !== 'ACADEMIC_YEAR_MISSING') throw e;
        charges.push({ error: e.message });
      }
    }
  }

  let consultantPayable = null;
  if (input.admissionSourceType === 'CONSULTANT' && (await getBoolSetting(d, 'AutoCreateConsultantPayable', true))) {
    consultantPayable = await createAutoPayable(d, ctx, admissionId);
  }
  return { admissionId, admissionNumber, studentId, charges, consultantPayable };
}

export async function cancelAdmission(
  d: Db,
  ctx: Ctx,
  admissionId: number,
  input: { cancellationDate?: string | null; reason: string; releaseSeat?: boolean; refundRequired?: boolean; waiveOutstanding?: boolean },
) {
  const a = await lockAdmission(d, admissionId);
  if (!['ACTIVE', 'PENDING', 'SUSPENDED'].includes(a.AdmissionStatus)) throw badRequest(`Admission is already ${a.AdmissionStatus.toLowerCase()}.`);
  const date = input.cancellationDate || today();
  const releaseSeat = input.releaseSeat !== false;
  await d.exec(
    `UPDATE admission.Admissions SET AdmissionStatus = N'CANCELLED', CancellationDate = @dt, CancellationReason = @r, CancelledBy = @u,
       RefundRequired = @rr, SeatReleased = @rs,
       ConsultantReviewStatus = CASE WHEN ConsultantId IS NOT NULL THEN N'REQUIRED' ELSE ConsultantReviewStatus END,
       UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @u
     WHERE AdmissionId = @id`,
    { dt: date, r: input.reason, u: ctx.userId, rr: !!input.refundRequired, rs: releaseSeat && !!a.SeatId, id: admissionId },
  );
  if (a.SeatId && releaseSeat) {
    await d.exec(
      `UPDATE admission.AdmissionSeatHistory SET OccupiedTo = @dt, Status = N'RELEASED'
         WHERE SeatId = @s AND AdmissionId = @a AND Status = N'OCCUPIED';
       UPDATE admission.Seats SET SeatStatus = N'RELEASED' WHERE SeatId = @s;`,
      { dt: date, s: a.SeatId, a: admissionId },
    );
  }
  const other = await d.one(
    `SELECT TOP 1 1 AS x FROM admission.Admissions WHERE StudentId = @s AND AdmissionId <> @a AND AdmissionStatus IN (N'ACTIVE', N'PENDING')`,
    { s: a.StudentId, a: admissionId },
  );
  if (!other)
    await d.exec(`UPDATE admission.Students SET StudentStatus = N'CANCELLED', UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @u WHERE StudentId = @s`, {
      s: a.StudentId,
      u: ctx.userId,
    });
  await audit(d, ctx, 'ADMISSION_CANCELLED', 'Admission', admissionId, {
    oldValues: { status: a.AdmissionStatus },
    newValues: { status: 'CANCELLED', date, releaseSeat, refundRequired: input.refundRequired },
    reason: input.reason,
  });

  const waivers: unknown[] = [];
  if (input.waiveOutstanding) {
    for (const c of await dueCharges(d, admissionId)) {
      waivers.push(
        await requestWaiver(d, ctx, {
          chargeId: Number(c.ChargeId),
          amount: c.DueAmount,
          reason: `Admission cancelled: ${input.reason}`,
          adjustmentType: 'CANCELLATION_WAIVER',
        }),
      );
    }
  }
  return { status: 'CANCELLED', waivers };
}

export async function generateBatchSeats(d: Db, batchId: number, capacity: number, courseId: number) {
  const existing = await d.one('SELECT COUNT(*) AS n FROM admission.Seats WHERE BatchId = @b', { b: batchId });
  for (let i = Number(existing.n) + 1; i <= capacity; i++) {
    await d.exec(`INSERT INTO admission.Seats (CourseId, BatchId, SeatNumber) VALUES (@c, @b, @n)`, { c: courseId, b: batchId, n: String(i) });
  }
}

