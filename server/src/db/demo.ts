/* Loads demo data (users, batches, fee structure, students, payments) into
   the configured database so the system can be explored and staff can be
   trained. Never run this against the production database.
   Usage:  npm run db:demo                                                */
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { closePool, db, dec, withTx } from './index';
import { setup } from './setup';
import { cancelAdmission, createAdmission } from '../services/admissions';
import { createPayment } from '../services/finance';
import { actOnRequest } from '../services/approval';
import { today } from '../lib/dates';

const DEMO_PASSWORD = 'Demo@1234';

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to load demo data with NODE_ENV=production');
  await setup(config.db.database);
  const d = await db();
  const exists = await d.one(`SELECT 1 AS x FROM security.Users WHERE UserName = N'cashier'`);
  if (exists) {
    console.log('Demo data already loaded.');
    return;
  }
  const admin = await d.one(`SELECT TOP 1 UserId FROM security.Users WHERE UserName = @u`, { u: config.admin.userName });
  const adminCtx = { userId: Number(admin.UserId), ip: 'demo', userAgent: 'demo' };
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users: Record<string, number> = {};
  for (const [u, name, role] of [
    ['cashier', 'Ravi Kumar (Cashier)', 'CASHIER'],
    ['accountant', 'Sunita Devi (Accountant)', 'ACCOUNTANT'],
    ['principal', 'Dr. A. Sharma (Principal)', 'PRINCIPAL'],
    ['md', 'Director (MD)', 'MD'],
  ]) {
    const id = await d.insert('security.Users', { UserName: u, PasswordHash: hash, FullName: name, MustChangePassword: false }, 'UserId');
    await d.exec(`INSERT INTO security.UserRoles (UserId, RoleId) SELECT @u, RoleId FROM security.Roles WHERE RoleCode = @r`, { u: id, r: role });
    users[u] = id;
  }
  const cashierCtx = { userId: users.cashier, ip: 'demo', userAgent: 'demo' };
  const accountantCtx = { userId: users.accountant, ip: 'demo', userAgent: 'demo' };

  const course = async (code: string) => Number((await d.one('SELECT CourseId FROM academic.Courses WHERE CourseCode = @c', { c: code })).CourseId);
  const ay = async (y: number) => Number((await d.one('SELECT AcademicYearId FROM academic.AcademicYears WHERE StartYear = @y', { y })).AcademicYearId);
  const head = async (c: string) => Number((await d.one('SELECT FeeHeadId FROM finance.FeeHeads WHERE FeeHeadCode = @c', { c })).FeeHeadId);
  const period = async (courseId: number, type: string, n: number) =>
    Number((await d.one('SELECT FeePeriodId FROM academic.FeePeriods WHERE CourseId = @c AND PeriodType = @t AND PeriodNumber = @n', { c: courseId, t: type, n })).FeePeriodId);

  /* Batches with seats */
  const batches: Record<string, number> = {};
  for (const [code, len] of [['ANM', 2], ['GNM', 3], ['BSCN', 4]] as const) {
    const cid = await course(code);
    const bid = await d.insert(
      'academic.Batches',
      { CourseId: cid, BatchCode: `${code}-2026`, BatchName: `${code} 2026-${2026 + len}`, StartYear: 2026, EndYear: 2026 + len, IntakeCapacity: 60, Status: 'ACTIVE' },
      'BatchId',
    );
    for (let i = 1; i <= 60; i++) await d.exec(`INSERT INTO admission.Seats (CourseId, BatchId, SeatNumber) VALUES (@c, @b, @n)`, { c: cid, b: bid, n: String(i) });
    batches[code] = bid;
  }

  /* Fee structure (course-wide, AY 2026-27) */
  const fs: [string, string, number, [string, number][]][] = [
    ['ANM', 'YEAR', 1, [['COLLEGE', 45000], ['HOSTEL', 30000], ['EXAM', 4000], ['LIBRARY', 1500]]],
    ['GNM', 'YEAR', 1, [['COLLEGE', 60000], ['HOSTEL', 30000], ['EXAM', 5000], ['LIBRARY', 2000]]],
    ['BSCN', 'SEMESTER', 1, [['TUITION', 50000], ['HOSTEL', 15000], ['EXAM', 5000], ['LAB', 3000]]],
    ['BSCN', 'SEMESTER', 2, [['TUITION', 50000], ['HOSTEL', 15000], ['EXAM', 5000]]],
  ];
  for (const code of ['ANM', 'GNM', 'BSCN']) {
    const cid = await course(code);
    const one = await period(cid, 'ONE_TIME', 0);
    for (const [h, amt] of [['ADMISSION', 10000], ['REGISTRATION', 2500], ['CAUTION', 5000]] as const)
      await d.insert('finance.FeeStructures', { CourseId: cid, AcademicYearId: await ay(2026), FeePeriodId: one, FeeHeadId: await head(h), Amount: dec(amt), EffectiveFrom: '2000-01-01' }, 'FeeStructureId');
  }
  for (const [code, type, n, lines] of fs) {
    const cid = await course(code);
    const p = await period(cid, type, n);
    for (const [h, amt] of lines)
      await d.insert('finance.FeeStructures', { CourseId: cid, AcademicYearId: await ay(2026), FeePeriodId: p, FeeHeadId: await head(h), Amount: dec(amt), DueDate: '2026-10-31', EffectiveFrom: '2000-01-01' }, 'FeeStructureId');
  }

  /* Consultant with a fixed rate */
  const consultantId = await withTx(async (tx) => {
    const code = await tx.nextDocumentNumber('CONSULTANT', today());
    const id = await tx.insert('consultant.Consultants', { ConsultantCode: code, ConsultantName: 'Bright Future Education Services', Mobile: '9800000001', OrganizationName: 'Bright Future', Status: 'ACTIVE', CreatedBy: adminCtx.userId }, 'ConsultantId');
    await tx.insert('consultant.ConsultantRates', { ConsultantId: id, RateType: 'FIXED', Amount: dec(20000), EffectiveFrom: '2020-01-01', CreatedBy: adminCtx.userId }, 'ConsultantRateId');
    return id;
  });

  /* Students and payments */
  const names = [
    ['Priya Kumari', 'Ramesh Prasad'], ['Anjali Singh', 'Suresh Singh'], ['Neha Kumari', 'Mahesh Yadav'], ['Pooja Bharti', 'Dinesh Paswan'],
    ['Kajal Kumari', 'Rajesh Mahto'], ['Sneha Jha', 'Vinod Jha'], ['Ritu Kumari', 'Arun Sah'], ['Simran Khatoon', 'Md. Salim'],
    ['Nisha Rani', 'Kamlesh Thakur'], ['Aarti Kumari', 'Shambhu Ray'], ['Khushboo Kumari', 'Lalan Singh'], ['Rani Kumari', 'Bhola Mandal'],
  ];
  const modes = Object.fromEntries(
    (await d.query('SELECT PaymentModeId, PaymentModeCode FROM finance.PaymentModes')).map((m: any) => [m.PaymentModeCode, Number(m.PaymentModeId)]),
  );
  for (let i = 0; i < names.length; i++) {
    const [name, father] = names[i];
    const code = ['ANM', 'GNM', 'BSCN'][i % 3];
    const viaConsultant = i % 4 === 1;
    const seat = await d.one(`SELECT TOP 1 SeatId FROM admission.Seats WHERE BatchId = @b AND SeatStatus = N'AVAILABLE' ORDER BY SeatId`, { b: batches[code] });
    const courseId = await course(code);
    const a = await withTx((tx) =>
      createAdmission(tx, accountantCtx, {
        student: { StudentName: name, FatherName: father, Mobile: `97${String(31000000 + i * 7919)}`, Gender: 'Female', District: 'Samastipur', State: 'Bihar' },
        courseId,
        batchId: batches[code],
        admissionSourceType: viaConsultant ? 'CONSULTANT' : 'DIRECT',
        consultantId: viaConsultant ? consultantId : null,
        seatId: Number(seat.SeatId),
        admissionDate: '2026-08-01',
      }),
    );
    if (a.consultantPayable?.approvalRequestId)
      await withTx((tx) => actOnRequest(tx, adminCtx, ['ADMIN'], a.consultantPayable!.approvalRequestId!, 'APPROVE', 'Demo approval', null));

    /* varied payment behaviour: full, partial, advance, none */
    const pattern = i % 4;
    if (pattern === 3) continue;
    const s = await d.one('SELECT NetCharges FROM reporting.vw_StudentFeeSummary WHERE AdmissionId = @a', { a: a.admissionId });
    const amount = pattern === 0 ? s.NetCharges : pattern === 1 ? Math.round(s.NetCharges * 0.5) : s.NetCharges + 5000;
    const upi = i % 2 === 1;
    await withTx((tx) =>
      createPayment(tx, cashierCtx, {
        admissionId: a.admissionId,
        amount,
        paymentModeId: upi ? modes.UPI : modes.CASH,
        transactionReference: upi ? `UTR${60000000 + i}` : null,
      }),
    );
  }

  /* One cancelled admission whose seat was taken by a replacement student */
  const first = await d.one(
    `SELECT TOP 1 a.AdmissionId FROM admission.Admissions a JOIN academic.Batches b ON b.BatchId = a.BatchId
     WHERE b.BatchCode = N'GNM-2026' ORDER BY a.AdmissionId DESC`,
  );
  await withTx((tx) => cancelAdmission(tx, adminCtx, Number(first.AdmissionId), { reason: 'Student left for another college', releaseSeat: true }));
  const released = await d.one(`SELECT TOP 1 SeatId FROM admission.Seats WHERE BatchId = @b AND SeatStatus = N'RELEASED'`, { b: batches.GNM });
  await withTx(async (tx) =>
    createAdmission(tx, accountantCtx, {
      student: { StudentName: 'Mamta Kumari', FatherName: 'Sunil Kumar', Mobile: '9771234567', Gender: 'Female', District: 'Darbhanga', State: 'Bihar' },
      courseId: await course('GNM'),
      batchId: batches.GNM,
      admissionSourceType: 'REFERRAL',
      referralName: 'Alumni referral',
      seatId: Number(released.SeatId),
    }),
  );

  console.log(`Demo data loaded. Users: cashier / accountant / principal / md, password ${DEMO_PASSWORD}`);
  await closePool();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

