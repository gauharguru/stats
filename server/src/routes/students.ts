import { Router } from 'express';
import { db, withTx } from '../db';
import { auditCtx } from '../lib/audit';
import { notFound } from '../lib/errors';
import { sendRows } from '../lib/export';
import { id, optDate, optStr, parse, q, qNum, str, z } from '../lib/validate';
import { requirePerm } from '../middleware/auth';
import { createStudent, updateStudent } from '../services/admissions';

export const studentsRouter = Router();
const ctxOf = (req: any) => ({ ...auditCtx(req), userId: req.user.userId as number });

export const studentSchema = z.object({
  StudentName: str(200),
  RollNumber: optStr(50),
  UniversityRegNo: optStr(50),
  FatherName: optStr(200),
  MotherName: optStr(200),
  GuardianName: optStr(200),
  DateOfBirth: optDate,
  Gender: optStr(20),
  Mobile: optStr(20),
  GuardianMobile: optStr(20),
  Email: optStr(200),
  AddressLine1: optStr(250),
  AddressLine2: optStr(250),
  Village: optStr(150),
  District: optStr(100),
  State: optStr(100),
  PinCode: optStr(10),
  PhotoPath: optStr(500),
  Remarks: optStr(500),
});

/* Global search (SRS 65): admission no, student id, roll no, name, father's name, mobile - partial match */
studentsRouter.get('/', requirePerm('STUDENT_VIEW'), async (req, res) => {
  const d = await db();
  const term = q(req, 'q');
  const rows = await d.query(
    `SELECT TOP (@top) s.StudentId, s.StudentCode, s.RollNumber, s.StudentName, s.FatherName, s.Mobile, s.StudentStatus,
            a.AdmissionId, a.AdmissionNumber, a.AdmissionStatus, c.CourseCode, b.BatchCode,
            sm.Outstanding, sm.AdvanceAvailable
     FROM admission.Students s
     OUTER APPLY (SELECT TOP 1 * FROM admission.Admissions x WHERE x.StudentId = s.StudentId
                  ORDER BY CASE WHEN x.AdmissionStatus = N'ACTIVE' THEN 0 ELSE 1 END, x.AdmissionId DESC) a
     LEFT JOIN academic.Courses c ON c.CourseId = a.CourseId
     LEFT JOIN academic.Batches b ON b.BatchId = a.BatchId
     LEFT JOIN reporting.vw_StudentFeeSummary sm ON sm.AdmissionId = a.AdmissionId
     WHERE (@q IS NULL OR s.StudentName LIKE @like OR s.StudentCode LIKE @like OR s.RollNumber LIKE @like OR s.FatherName LIKE @like
            OR s.Mobile LIKE @like OR s.GuardianMobile LIKE @like OR s.UniversityRegNo LIKE @like
            OR EXISTS (SELECT 1 FROM admission.Admissions ax WHERE ax.StudentId = s.StudentId AND ax.AdmissionNumber LIKE @like))
       AND (@course IS NULL OR a.CourseId = @course)
       AND (@batch IS NULL OR a.BatchId = @batch)
       AND (@status IS NULL OR s.StudentStatus = @status)
     ORDER BY s.StudentName`,
    {
      top: Math.min(qNum(req, 'top') ?? 200, 2000),
      q: term ?? null,
      like: term ? `%${term.replace(/[%_[]/g, (m) => `[${m}]`)}%` : null,
      course: qNum(req, 'courseId') ?? null,
      batch: qNum(req, 'batchId') ?? null,
      status: q(req, 'status') ?? null,
    },
  );
  sendRows(req, res, rows, 'students');
});

studentsRouter.post('/', requirePerm('STUDENT_CREATE'), async (req, res) => {
  const b = parse(studentSchema, req.body);
  const out = await withTx((d) => createStudent(d, ctxOf(req), b));
  res.status(201).json(out);
});

studentsRouter.get('/:id', requirePerm('STUDENT_VIEW'), async (req, res) => {
  const d = await db();
  const sid = parse(id, req.params.id);
  const s = await d.one('SELECT * FROM admission.Students WHERE StudentId = @id', { id: sid });
  if (!s) throw notFound('Student');
  const admissions = await d.query(
    `SELECT a.*, c.CourseCode, c.CourseName, b.BatchCode, b.BatchName, co.ConsultantName, se.SeatNumber,
            sm.TotalCharges, sm.NetCharges, sm.TotalPayments, sm.TotalRefunds, sm.Outstanding, sm.AdvanceAvailable, sm.Balance
     FROM admission.Admissions a
     JOIN academic.Courses c ON c.CourseId = a.CourseId
     JOIN academic.Batches b ON b.BatchId = a.BatchId
     LEFT JOIN consultant.Consultants co ON co.ConsultantId = a.ConsultantId
     LEFT JOIN admission.Seats se ON se.SeatId = a.SeatId
     JOIN reporting.vw_StudentFeeSummary sm ON sm.AdmissionId = a.AdmissionId
     WHERE a.StudentId = @id ORDER BY a.AdmissionId DESC`,
    { id: sid },
  );
  if (!req.user!.permissions.has('CONSULTANT_VIEW')) for (const a of admissions) a.ConsultantName = a.ConsultantId ? '(restricted)' : null;
  res.json({ student: s, admissions });
});

studentsRouter.put('/:id', requirePerm('STUDENT_EDIT'), async (req, res) => {
  const b = parse(
    studentSchema.partial().extend({
      StudentStatus: z
        .enum(['APPLICANT', 'ADMISSION_PENDING', 'ADMITTED', 'ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'DISCONTINUED', 'CANCELLED', 'PASSED', 'TRANSFERRED', 'ALUMNI'])
        .optional(),
    }),
    req.body,
  );
  await withTx((d) => updateStudent(d, ctxOf(req), parse(id, req.params.id), b as any));
  res.json({ ok: true });
});
