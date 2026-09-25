import { Router } from 'express';
import { db, dec, withTx } from '../db';
import { audit, auditCtx } from '../lib/audit';
import { badRequest, conflict, notFound } from '../lib/errors';
import { getAllSettings } from '../lib/settings';
import { date, id, nonNegAmount, optDate, optId, optStr, parse, q, qNum, str, z } from '../lib/validate';
import { requirePerm } from '../middleware/auth';
import { generateBatchSeats } from '../services/admissions';

export const mastersRouter = Router();
const view = requirePerm('MASTER_VIEW', 'STUDENT_VIEW', 'REPORT_VIEW', 'REPORT_OWN');
const edit = requirePerm('MASTER_EDIT');
const ctxOf = (req: any) => ({ ...auditCtx(req), userId: req.user.userId as number });

/* One call that loads every lookup the UI needs. */
mastersRouter.get('/lookups', view, async (_req, res) => {
  const d = await db();
  const [courses, batches, years, periods, feeHeads, modes, statuses, consultants] = await d.queryMulti(`
    SELECT * FROM academic.Courses ORDER BY CourseCode;
    SELECT b.*, c.CourseCode FROM academic.Batches b JOIN academic.Courses c ON c.CourseId = b.CourseId ORDER BY b.StartYear DESC, c.CourseCode;
    SELECT * FROM academic.AcademicYears ORDER BY StartYear;
    SELECT * FROM academic.FeePeriods ORDER BY CourseId, PeriodNumber;
    SELECT * FROM finance.FeeHeads ORDER BY DisplayOrder, FeeHeadName;
    SELECT * FROM finance.PaymentModes ORDER BY PaymentModeId;
    SELECT Category, StatusCode, StatusName FROM dbo.StatusTypes ORDER BY Category, SortOrder;
    SELECT ConsultantId, ConsultantCode, ConsultantName, OrganizationName, Status FROM consultant.Consultants ORDER BY ConsultantName;`);
  const s = await getAllSettings(d);
  res.json({
    courses, batches, academicYears: years, feePeriods: periods, feeHeads, paymentModes: modes, statuses, consultants,
    college: { name: s.CollegeName, address: s.CollegeAddress, phone: s.CollegePhone, logoUrl: s.CollegeLogoUrl },
    settings: { DefaultPaymentAllocationMethod: s.DefaultPaymentAllocationMethod, PaymentRequiresApproval: s.PaymentRequiresApproval },
  });
});

/* ---------------- courses ------------------------------------------- */
const courseSchema = z.object({
  CourseCode: str(20),
  CourseName: str(100),
  DurationYears: z.coerce.number().positive().max(10),
  TotalSemesters: z.coerce.number().int().positive().max(20).nullish(),
  FeeCycleType: z.enum(['YEARLY', 'SEMESTER']),
  DefaultBatchCapacity: z.coerce.number().int().positive(),
  IsActive: z.boolean().optional(),
});

mastersRouter.post('/courses', edit, async (req, res) => {
  const b = parse(courseSchema, req.body);
  if (b.FeeCycleType === 'SEMESTER' && !b.TotalSemesters) throw badRequest('Total semesters is required for semester courses.');
  const out = await withTx(async (d) => {
    const courseId = await d.insert(
      'academic.Courses',
      {
        CourseCode: b.CourseCode.toUpperCase(),
        CourseName: b.CourseName,
        DurationYears: dec(b.DurationYears),
        TotalSemesters: b.TotalSemesters ?? null,
        FeeCycleType: b.FeeCycleType,
        DefaultBatchCapacity: b.DefaultBatchCapacity,
        CreatedBy: req.user!.userId,
      },
      'CourseId',
    );
    const n = b.FeeCycleType === 'SEMESTER' ? b.TotalSemesters! : Math.ceil(b.DurationYears);
    const type = b.FeeCycleType === 'SEMESTER' ? 'SEMESTER' : 'YEAR';
    for (let i = 1; i <= n; i++)
      await d.exec(`INSERT INTO academic.FeePeriods (CourseId, PeriodType, PeriodNumber, PeriodName) VALUES (@c, @t, @n, @name)`, {
        c: courseId, t: type, n: i, name: `${type === 'SEMESTER' ? 'Semester' : 'Year'} ${i}`,
      });
    await d.exec(`INSERT INTO academic.FeePeriods (CourseId, PeriodType, PeriodNumber, PeriodName) VALUES (@c, N'ONE_TIME', 0, N'Admission (one-time)')`, {
      c: courseId,
    });
    await audit(d, ctxOf(req), 'COURSE_CREATED', 'Course', courseId, { newValues: b });
    return courseId;
  });
  res.status(201).json({ courseId: out });
});

mastersRouter.put('/courses/:id', edit, async (req, res) => {
  const courseId = parse(id, req.params.id);
  const b = parse(courseSchema.pick({ CourseName: true, DefaultBatchCapacity: true, IsActive: true }).partial(), req.body);
  await withTx(async (d) => {
    const old = await d.one('SELECT * FROM academic.Courses WHERE CourseId = @id', { id: courseId });
    if (!old) throw notFound('Course');
    await d.exec(
      `UPDATE academic.Courses SET CourseName = COALESCE(@n, CourseName), DefaultBatchCapacity = COALESCE(@cap, DefaultBatchCapacity),
         IsActive = COALESCE(@act, IsActive) WHERE CourseId = @id`,
      { n: b.CourseName ?? null, cap: b.DefaultBatchCapacity ?? null, act: b.IsActive ?? null, id: courseId },
    );
    await audit(d, ctxOf(req), 'COURSE_UPDATED', 'Course', courseId, { oldValues: old, newValues: b });
  });
  res.json({ ok: true });
});

/* ---------------- batches ------------------------------------------- */
mastersRouter.post('/batches', edit, async (req, res) => {
  const b = parse(
    z.object({
      CourseId: id,
      BatchCode: str(50),
      BatchName: str(100),
      StartYear: z.coerce.number().int().min(2000).max(2100),
      EndYear: z.coerce.number().int().min(2000).max(2100),
      IntakeCapacity: z.coerce.number().int().positive(),
      Status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CLOSED']).optional(),
      GenerateSeats: z.boolean().optional(),
    }),
    req.body,
  );
  const batchId = await withTx(async (d) => {
    const bid = await d.insert(
      'academic.Batches',
      {
        CourseId: b.CourseId, BatchCode: b.BatchCode.toUpperCase(), BatchName: b.BatchName, StartYear: b.StartYear, EndYear: b.EndYear,
        IntakeCapacity: b.IntakeCapacity, Status: b.Status ?? 'ACTIVE', CreatedBy: req.user!.userId,
      },
      'BatchId',
    );
    if (b.GenerateSeats !== false) await generateBatchSeats(d, bid, b.IntakeCapacity, b.CourseId);
    await audit(d, ctxOf(req), 'BATCH_CREATED', 'Batch', bid, { newValues: b });
    return bid;
  });
  res.status(201).json({ batchId });
});

mastersRouter.put('/batches/:id', edit, async (req, res) => {
  const batchId = parse(id, req.params.id);
  const b = parse(
    z.object({
      BatchName: optStr(100),
      IntakeCapacity: z.coerce.number().int().positive().optional(),
      Status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CLOSED']).optional(),
    }),
    req.body,
  );
  await withTx(async (d) => {
    const old = await d.one('SELECT * FROM academic.Batches WITH (UPDLOCK) WHERE BatchId = @id', { id: batchId });
    if (!old) throw notFound('Batch');
    if (b.IntakeCapacity !== undefined) {
      const n = await d.one(
        `SELECT COUNT(*) AS n FROM admission.Admissions WHERE BatchId = @b AND AdmissionStatus IN (N'ACTIVE', N'PENDING', N'SUSPENDED')`,
        { b: batchId },
      );
      if (b.IntakeCapacity < n.n) throw badRequest(`Batch already has ${n.n} active admissions.`);
    }
    await d.exec(
      `UPDATE academic.Batches SET BatchName = COALESCE(@n, BatchName), IntakeCapacity = COALESCE(@cap, IntakeCapacity),
         Status = COALESCE(@s, Status) WHERE BatchId = @id`,
      { n: b.BatchName ?? null, cap: b.IntakeCapacity ?? null, s: b.Status ?? null, id: batchId },
    );
    if (b.IntakeCapacity && b.IntakeCapacity > old.IntakeCapacity) await generateBatchSeats(d, batchId, b.IntakeCapacity, Number(old.CourseId));
    await audit(d, ctxOf(req), 'BATCH_UPDATED', 'Batch', batchId, { oldValues: old, newValues: b });
  });
  res.json({ ok: true });
});

mastersRouter.get('/batches/:id/seats', view, async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT se.*, cur.AdmissionNumber, cur.StudentName, cur.AdmissionId
     FROM admission.Seats se
     OUTER APPLY (SELECT TOP 1 a.AdmissionId, a.AdmissionNumber, s.StudentName FROM admission.AdmissionSeatHistory h
                  JOIN admission.Admissions a ON a.AdmissionId = h.AdmissionId JOIN admission.Students s ON s.StudentId = a.StudentId
                  WHERE h.SeatId = se.SeatId AND h.Status = N'OCCUPIED' ORDER BY h.AdmissionSeatHistoryId DESC) cur
     WHERE se.BatchId = @b ORDER BY TRY_CAST(se.SeatNumber AS INT), se.SeatNumber`,
    { b: parse(id, req.params.id) },
  );
  res.json({ rows });
});

/* ---------------- academic years ------------------------------------ */
mastersRouter.post('/academic-years', edit, async (req, res) => {
  const b = parse(z.object({ StartYear: z.coerce.number().int().min(2000).max(2100), StartDate: date, EndDate: date }), req.body);
  const code = `${b.StartYear}-${String((b.StartYear + 1) % 100).padStart(2, '0')}`;
  const ayId = await withTx(async (d) => {
    const i = await d.insert('academic.AcademicYears', { AcademicYearCode: code, StartYear: b.StartYear, StartDate: b.StartDate, EndDate: b.EndDate }, 'AcademicYearId');
    await audit(d, ctxOf(req), 'ACADEMIC_YEAR_CREATED', 'AcademicYear', i, { newValues: { code, ...b } });
    return i;
  });
  res.status(201).json({ academicYearId: ayId, code });
});

mastersRouter.post('/academic-years/:id/set-current', edit, async (req, res) => {
  const ayId = parse(id, req.params.id);
  await withTx(async (d) => {
    await d.exec(`UPDATE academic.AcademicYears SET IsCurrent = 0 WHERE IsCurrent = 1; UPDATE academic.AcademicYears SET IsCurrent = 1 WHERE AcademicYearId = @id;`, { id: ayId });
    await audit(d, ctxOf(req), 'ACADEMIC_YEAR_SET_CURRENT', 'AcademicYear', ayId);
  });
  res.json({ ok: true });
});

mastersRouter.post('/academic-years/:id/close', edit, async (req, res) => {
  const ayId = parse(id, req.params.id);
  const closed = parse(z.object({ closed: z.boolean() }), req.body).closed;
  await withTx(async (d) => {
    await d.exec(`UPDATE academic.AcademicYears SET IsClosed = @c WHERE AcademicYearId = @id`, { id: ayId, c: closed });
    await audit(d, ctxOf(req), closed ? 'ACADEMIC_YEAR_CLOSED' : 'ACADEMIC_YEAR_REOPENED', 'AcademicYear', ayId);
  });
  res.json({ ok: true });
});

/* ---------------- fee heads ----------------------------------------- */
const feeHeadSchema = z.object({
  FeeHeadCode: str(30),
  FeeHeadName: str(150),
  FeeCategory: str(50),
  IsRefundable: z.boolean().default(false),
  IsSecurityDeposit: z.boolean().default(false),
  DisplayOrder: z.coerce.number().int().default(100),
  IsActive: z.boolean().default(true),
});
mastersRouter.post('/fee-heads', edit, async (req, res) => {
  const b = parse(feeHeadSchema, req.body);
  const fid = await withTx(async (d) => {
    const i = await d.insert('finance.FeeHeads', { ...b, FeeHeadCode: b.FeeHeadCode.toUpperCase(), CreatedBy: req.user!.userId }, 'FeeHeadId');
    await audit(d, ctxOf(req), 'FEE_HEAD_CREATED', 'FeeHead', i, { newValues: b });
    return i;
  });
  res.status(201).json({ feeHeadId: fid });
});
mastersRouter.put('/fee-heads/:id', edit, async (req, res) => {
  const fid = parse(id, req.params.id);
  const b = parse(feeHeadSchema.omit({ FeeHeadCode: true }).partial(), req.body);
  await withTx(async (d) => {
    const old = await d.one('SELECT * FROM finance.FeeHeads WHERE FeeHeadId = @id', { id: fid });
    if (!old) throw notFound('Fee head');
    await d.exec(
      `UPDATE finance.FeeHeads SET FeeHeadName = COALESCE(@n, FeeHeadName), FeeCategory = COALESCE(@c, FeeCategory),
        IsRefundable = COALESCE(@r, IsRefundable), IsSecurityDeposit = COALESCE(@s, IsSecurityDeposit),
        DisplayOrder = COALESCE(@o, DisplayOrder), IsActive = COALESCE(@a, IsActive) WHERE FeeHeadId = @id`,
      { n: b.FeeHeadName ?? null, c: b.FeeCategory ?? null, r: b.IsRefundable ?? null, s: b.IsSecurityDeposit ?? null, o: b.DisplayOrder ?? null, a: b.IsActive ?? null, id: fid },
    );
    await audit(d, ctxOf(req), 'FEE_HEAD_UPDATED', 'FeeHead', fid, { oldValues: old, newValues: b });
  });
  res.json({ ok: true });
});

/* ---------------- payment modes ------------------------------------- */
mastersRouter.put('/payment-modes/:id', edit, async (req, res) => {
  const mid = parse(id, req.params.id);
  const b = parse(
    z.object({
      PaymentModeName: optStr(100),
      RequiresReference: z.boolean().optional(),
      RequiresBank: z.boolean().optional(),
      RequiresChequeDetails: z.boolean().optional(),
      IsActive: z.boolean().optional(),
    }),
    req.body,
  );
  await withTx(async (d) => {
    await d.exec(
      `UPDATE finance.PaymentModes SET PaymentModeName = COALESCE(@n, PaymentModeName), RequiresReference = COALESCE(@r, RequiresReference),
        RequiresBank = COALESCE(@b, RequiresBank), RequiresChequeDetails = COALESCE(@c, RequiresChequeDetails), IsActive = COALESCE(@a, IsActive)
       WHERE PaymentModeId = @id`,
      { n: b.PaymentModeName ?? null, r: b.RequiresReference ?? null, b: b.RequiresBank ?? null, c: b.RequiresChequeDetails ?? null, a: b.IsActive ?? null, id: mid },
    );
    await audit(d, ctxOf(req), 'PAYMENT_MODE_UPDATED', 'PaymentMode', mid, { newValues: b });
  });
  res.json({ ok: true });
});

/* ---------------- fee structures ------------------------------------ */
mastersRouter.get('/fee-structures', view, async (req, res) => {
  const d = await db();
  const rows = await d.query(
    `SELECT fs.*, fh.FeeHeadCode, fh.FeeHeadName, fp.PeriodName, fp.PeriodNumber, fp.PeriodType, ay.AcademicYearCode,
            c.CourseCode, b.BatchCode,
            (SELECT COUNT(*) FROM finance.StudentCharges sc WHERE sc.FeeStructureId = fs.FeeStructureId) AS ChargeCount
     FROM finance.FeeStructures fs
     JOIN finance.FeeHeads fh ON fh.FeeHeadId = fs.FeeHeadId
     JOIN academic.FeePeriods fp ON fp.FeePeriodId = fs.FeePeriodId
     JOIN academic.AcademicYears ay ON ay.AcademicYearId = fs.AcademicYearId
     JOIN academic.Courses c ON c.CourseId = fs.CourseId
     LEFT JOIN academic.Batches b ON b.BatchId = fs.BatchId
     WHERE (@course IS NULL OR fs.CourseId = @course)
       AND (@batch IS NULL OR fs.BatchId = @batch OR (fs.BatchId IS NULL AND @includeCourseWide = 1))
       AND (@ay IS NULL OR fs.AcademicYearId = @ay)
       AND (@period IS NULL OR fs.FeePeriodId = @period)
       AND (@all = 1 OR fs.IsActive = 1)
     ORDER BY c.CourseCode, ay.StartYear, fp.PeriodNumber, fh.DisplayOrder`,
    {
      course: qNum(req, 'courseId') ?? null,
      batch: qNum(req, 'batchId') ?? null,
      includeCourseWide: q(req, 'includeCourseWide') === 'false' ? 0 : 1,
      ay: qNum(req, 'academicYearId') ?? null,
      period: qNum(req, 'feePeriodId') ?? null,
      all: q(req, 'includeInactive') === 'true' ? 1 : 0,
    },
  );
  res.json({ rows });
});

/* Save a fee structure line. If the line already has charges against it,
   the old line is closed and a new version is created (charges already
   raised are never changed). */
mastersRouter.post('/fee-structures', requirePerm('FEE_STRUCTURE_EDIT'), async (req, res) => {
  const b = parse(
    z.object({
      CourseId: id,
      BatchId: optId,
      AcademicYearId: id,
      FeePeriodId: id,
      FeeHeadId: id,
      Amount: nonNegAmount,
      DueDate: optDate,
      EffectiveFrom: optDate,
    }),
    req.body,
  );
  const out = await withTx(async (d) => {
    const period = await d.one('SELECT CourseId FROM academic.FeePeriods WHERE FeePeriodId = @id', { id: b.FeePeriodId });
    if (!period || Number(period.CourseId) !== b.CourseId) throw badRequest('Fee period does not belong to the course.');
    if (b.BatchId) {
      const bt = await d.one('SELECT CourseId FROM academic.Batches WHERE BatchId = @id', { id: b.BatchId });
      if (!bt || Number(bt.CourseId) !== b.CourseId) throw badRequest('Batch does not belong to the course.');
    }
    const existing = await d.one(
      `SELECT * FROM finance.FeeStructures WITH (UPDLOCK)
       WHERE CourseId = @c AND ISNULL(BatchId, 0) = ISNULL(@b, 0) AND AcademicYearId = @ay AND FeePeriodId = @p AND FeeHeadId = @fh AND IsActive = 1`,
      { c: b.CourseId, b: b.BatchId ?? null, ay: b.AcademicYearId, p: b.FeePeriodId, fh: b.FeeHeadId },
    );
    const ctx = ctxOf(req);
    const eff = b.EffectiveFrom || '2000-01-01';
    if (existing) {
      const used = await d.one('SELECT COUNT(*) AS n FROM finance.StudentCharges WHERE FeeStructureId = @id', { id: existing.FeeStructureId });
      if (used.n === 0) {
        await d.exec(
          `UPDATE finance.FeeStructures SET Amount = @a, DueDate = @dd, IsActive = CASE WHEN @a = 0 THEN 0 ELSE 1 END,
             UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @u WHERE FeeStructureId = @id`,
          { a: dec(b.Amount), dd: b.DueDate ?? null, u: ctx.userId, id: existing.FeeStructureId },
        );
        await audit(d, ctx, 'FEE_STRUCTURE_UPDATED', 'FeeStructure', Number(existing.FeeStructureId), {
          oldValues: { Amount: existing.Amount, DueDate: existing.DueDate },
          newValues: { Amount: b.Amount, DueDate: b.DueDate },
        });
        return { feeStructureId: Number(existing.FeeStructureId), versioned: false };
      }
      await d.exec(`UPDATE finance.FeeStructures SET IsActive = 0, EffectiveTo = CAST(SYSUTCDATETIME() AS DATE), UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @u WHERE FeeStructureId = @id`, {
        u: ctx.userId,
        id: existing.FeeStructureId,
      });
    }
    if (b.Amount === 0) return { feeStructureId: null, versioned: !!existing };
    const fsId = await d.insert(
      'finance.FeeStructures',
      {
        CourseId: b.CourseId, BatchId: b.BatchId ?? null, AcademicYearId: b.AcademicYearId, FeePeriodId: b.FeePeriodId, FeeHeadId: b.FeeHeadId,
        Amount: dec(b.Amount), DueDate: b.DueDate ?? null, EffectiveFrom: eff, CreatedBy: ctx.userId,
      },
      'FeeStructureId',
    );
    await audit(d, ctx, existing ? 'FEE_STRUCTURE_REVISED' : 'FEE_STRUCTURE_CREATED', 'FeeStructure', fsId, {
      oldValues: existing ? { FeeStructureId: existing.FeeStructureId, Amount: existing.Amount } : undefined,
      newValues: b,
    });
    return { feeStructureId: fsId, versioned: !!existing };
  });
  res.status(201).json(out);
});

/* Copy all active lines of one course/batch/year into another academic year / batch */
mastersRouter.post('/fee-structures/copy', requirePerm('FEE_STRUCTURE_EDIT'), async (req, res) => {
  const b = parse(
    z.object({ CourseId: id, FromBatchId: optId, FromAcademicYearId: id, ToBatchId: optId, ToAcademicYearId: id, IncreasePercent: z.coerce.number().min(-50).max(100).default(0) }),
    req.body,
  );
  const n = await withTx(async (d) => {
    const lines = await d.query(
      `SELECT * FROM finance.FeeStructures WHERE CourseId = @c AND ISNULL(BatchId, 0) = ISNULL(@fb, 0) AND AcademicYearId = @fay AND IsActive = 1`,
      { c: b.CourseId, fb: b.FromBatchId ?? null, fay: b.FromAcademicYearId },
    );
    let count = 0;
    for (const l of lines) {
      const exists = await d.one(
        `SELECT 1 AS x FROM finance.FeeStructures WHERE CourseId = @c AND ISNULL(BatchId, 0) = ISNULL(@tb, 0) AND AcademicYearId = @tay
           AND FeePeriodId = @p AND FeeHeadId = @fh AND IsActive = 1`,
        { c: b.CourseId, tb: b.ToBatchId ?? null, tay: b.ToAcademicYearId, p: l.FeePeriodId, fh: l.FeeHeadId },
      );
      if (exists) continue;
      const amt = Math.round(l.Amount * (1 + b.IncreasePercent / 100));
      await d.insert(
        'finance.FeeStructures',
        {
          CourseId: b.CourseId, BatchId: b.ToBatchId ?? null, AcademicYearId: b.ToAcademicYearId, FeePeriodId: l.FeePeriodId,
          FeeHeadId: l.FeeHeadId, Amount: dec(amt), EffectiveFrom: '2000-01-01', CreatedBy: req.user!.userId,
        },
        'FeeStructureId',
      );
      count++;
    }
    await audit(d, ctxOf(req), 'FEE_STRUCTURE_COPIED', 'FeeStructure', null, { newValues: { ...b, lines: count } });
    return count;
  });
  res.json({ copied: n });
});

mastersRouter.get('/settings/public', view, async (_req, res) => {
  const d = await db();
  const s = await getAllSettings(d);
  res.json({ CollegeName: s.CollegeName, CollegeAddress: s.CollegeAddress, CollegePhone: s.CollegePhone, CollegeLogoUrl: s.CollegeLogoUrl });
});

