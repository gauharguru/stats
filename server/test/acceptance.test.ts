/* SRS section 87 - mandatory acceptance tests, run end-to-end through the
   REST API against a real SQL Server database. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '../src/db';
import { Client, createTestDatabase, dropTestDatabase } from './helpers';

const admin = new Client('admin');
const cashier = new Client('cashier1');
const accountant = new Client('accountant1');
const principal = new Client('principal1');

let L: any; // lookups
const head = (code: string) => L.feeHeads.find((f: any) => f.FeeHeadCode === code).FeeHeadId;
const mode = (code: string) => L.paymentModes.find((m: any) => m.PaymentModeCode === code).PaymentModeId;
const course = (code: string) => L.courses.find((c: any) => c.CourseCode === code).CourseId;
const period = (courseCode: string, type: string, n: number) =>
  L.feePeriods.find((p: any) => p.CourseId === course(courseCode) && p.PeriodType === type && p.PeriodNumber === n).FeePeriodId;
const ay = (code: string) => L.academicYears.find((a: any) => a.AcademicYearCode === code).AcademicYearId;

let batchId: number;
let n = 0;

async function newAdmission(opts: Record<string, unknown> = {}, who: Client = admin) {
  n++;
  return who.ok('/admissions', {
    student: { StudentName: `Student ${n}`, FatherName: `Father ${n}`, Mobile: `98765${String(n).padStart(5, '0')}` },
    courseId: course('BSCN'),
    batchId,
    admissionSourceType: 'DIRECT',
    generateInitialCharges: false,
    ...opts,
  });
}
async function charge(admissionId: number, code: string, amount: number) {
  return (await admin.ok(`/admissions/${admissionId}/charges`, { feeHeadId: head(code), amount, academicYearId: ay('2026-27') })).chargeId;
}
async function pay(who: Client, admissionId: number, amount: number, extra: Record<string, unknown> = {}) {
  return who.ok('/payments', { admissionId, amount, paymentModeId: mode('CASH'), ...extra });
}
async function summary(admissionId: number) {
  return (await admin.getOk(`/admissions/${admissionId}/financial`)).summary;
}
async function approvalFor(type: string, transactionId: number) {
  const r = await admin.getOk(`/approvals?type=${type}`);
  return r.rows.find((x: any) => x.TransactionId === transactionId);
}

beforeAll(async () => {
  await createTestDatabase();
  const first = await admin.login('Admin@12345');
  expect(first.mustChangePassword).toBe(true);
  // must change password before anything else
  expect((await admin.get('/dashboard')).status).toBe(403);
  await admin.ok('/auth/change-password', { currentPassword: 'Admin@12345', newPassword: 'Admin@2026x' });

  for (const [u, role] of [['cashier1', 'CASHIER'], ['accountant1', 'ACCOUNTANT'], ['principal1', 'PRINCIPAL']]) {
    await admin.ok('/admin/users', { UserName: u, FullName: u, Password: 'Temp@1234', Roles: [role] });
    const c = { cashier1: cashier, accountant1: accountant, principal1: principal }[u]!;
    await c.login('Temp@1234');
    await c.ok('/auth/change-password', { currentPassword: 'Temp@1234', newPassword: 'Secret@1234' });
  }
  L = await admin.getOk('/masters/lookups');
  batchId = (
    await admin.ok('/masters/batches', {
      CourseId: course('BSCN'), BatchCode: 'BSCN-2026', BatchName: 'B.Sc Nursing 2026-2030', StartYear: 2026, EndYear: 2030, IntakeCapacity: 60,
    })
  ).batchId;
});

afterAll(async () => {
  await dropTestDatabase();
});

describe('SRS 87 acceptance tests', () => {
  it('Test 1 - normal payment: charge 50,000, pay 20,000 -> due 30,000', async () => {
    const a = await newAdmission();
    await charge(a.admissionId, 'COLLEGE', 50000);
    const p = await pay(cashier, a.admissionId, 20000);
    expect(p.status).toBe('POSTED');
    expect(p.receiptNumber).toMatch(/^AHS-REC-\d{4}-\d{6}$/);
    const s = await summary(a.admissionId);
    expect(s.Outstanding).toBe(30000);
    expect(s.TotalPayments).toBe(20000);
  });

  it('Test 2 - multiple payments 10k + 15k + 25k -> total paid 50,000', async () => {
    const a = await newAdmission();
    await charge(a.admissionId, 'COLLEGE', 50000);
    for (const amt of [10000, 15000, 25000]) await pay(cashier, a.admissionId, amt);
    const s = await summary(a.admissionId);
    expect(s.TotalPayments).toBe(50000);
    expect(s.Outstanding).toBe(0);
  });

  it('Test 3 - multiple fee heads from fee structure; 50,000 allocation reconciles exactly', async () => {
    for (const [code, amt] of [['COLLEGE', 30000], ['HOSTEL', 15000], ['EXAM', 5000]] as const)
      await admin.ok('/masters/fee-structures', {
        CourseId: course('BSCN'), BatchId: batchId, AcademicYearId: ay('2026-27'), FeePeriodId: period('BSCN', 'SEMESTER', 1), FeeHeadId: head(code), Amount: amt,
      });
    const a = await newAdmission({ generateInitialCharges: true });
    expect(a.charges.some((c: any) => c.created === 3)).toBe(true);
    const p = await pay(cashier, a.admissionId, 50000);
    const detail = await admin.getOk(`/payments/${p.paymentId}`);
    const alloc = Object.fromEntries(detail.allocations.map((x: any) => [x.FeeHeadName, x.AllocatedAmount]));
    expect(alloc).toEqual({ 'College Fee': 30000, 'Hostel Fee': 15000, 'Examination Fee': 5000 });
    expect(detail.allocations.reduce((s: number, x: any) => s + x.AllocatedAmount, 0)).toBe(50000);
    expect((await summary(a.admissionId)).Outstanding).toBe(0);
    // regenerating the same period does not double-charge
    const again = await admin.ok(`/admissions/${a.admissionId}/charges/generate`, { feePeriodId: period('BSCN', 'SEMESTER', 1) });
    expect(again.created).toBe(0);
  });

  it('Test 4 - advance: due 40,000, pay 50,000 -> due 0, advance 10,000', async () => {
    const a = await newAdmission();
    await charge(a.admissionId, 'COLLEGE', 40000);
    await pay(cashier, a.admissionId, 50000);
    const s = await summary(a.admissionId);
    expect(s.Outstanding).toBe(0);
    expect(s.AdvanceAvailable).toBe(10000);
    // the advance is identifiable and later adjustable against a new charge
    await charge(a.admissionId, 'EXAM', 4000);
    const s2 = await summary(a.admissionId);
    expect(s2.Outstanding).toBe(0);
    expect(s2.AdvanceAvailable).toBe(6000);
  });

  it('Test 5 - discount: charge 50,000, discount 5,000 -> net 45,000 (cashier cannot self-authorise)', async () => {
    const a = await newAdmission();
    const chargeId = await charge(a.admissionId, 'COLLEGE', 50000);
    const d = await cashier.ok('/payments/discounts', { chargeId, amount: 5000, reason: 'Merit concession' });
    expect(d.autoApproved).toBe(false);
    expect((await summary(a.admissionId)).NetCharges).toBe(50000); // not effective until approved
    expect((await cashier.post(`/approvals/${d.approvalRequestId}/approve`)).status).toBe(403);
    await admin.ok(`/approvals/${d.approvalRequestId}/approve`, { comments: 'ok' });
    const s = await summary(a.admissionId);
    expect(s.NetCharges).toBe(45000);
    expect(s.Outstanding).toBe(45000);
  });

  it('Test 6 + 12 - refund 50,000 of 80,000 paid: pending -> approved -> processed; histories preserved', async () => {
    const a = await newAdmission();
    const chargeId = await charge(a.admissionId, 'COLLEGE', 100000);
    await pay(cashier, a.admissionId, 80000);
    const r = await cashier.ok('/payments/refunds', {
      admissionId: a.admissionId, amount: 50000, refundType: 'FEE_HEAD', reason: 'Fee revision', allocations: [{ chargeId, amount: 50000 }],
    });
    expect(r.status).toBe('PENDING_APPROVAL');
    // cannot process before approval
    expect((await cashier.post(`/payments/refunds/${r.refundId}/process`, { refundModeId: mode('CASH') })).status).toBe(400);
    await admin.ok(`/approvals/${r.approvalRequestId}/approve`);
    expect((await admin.getOk(`/payments/refunds/${r.refundId}`)).refund.Status).toBe('APPROVED');
    await cashier.ok(`/payments/refunds/${r.refundId}/process`, { refundModeId: mode('CASH') });
    expect((await admin.getOk(`/payments/refunds/${r.refundId}`)).refund.Status).toBe('PROCESSED');
    const s = await summary(a.admissionId);
    expect(s.TotalPayments).toBe(80000);
    expect(s.TotalRefunds).toBe(50000);
    expect(s.Outstanding).toBe(20000); // the fee-head refund credits the charge: 100k - 80k still due
    const ledger = (await admin.getOk(`/admissions/${a.admissionId}/ledger`)).rows;
    expect(ledger.filter((x: any) => x.EntryType === 'PAYMENT').reduce((t: number, x: any) => t + x.PaymentAmount, 0)).toBe(80000);
    expect(ledger.filter((x: any) => x.EntryType === 'REFUND').reduce((t: number, x: any) => t + x.RefundAmount, 0)).toBe(50000);
  });

  it('Refund cannot exceed money actually available', async () => {
    const a = await newAdmission();
    await charge(a.admissionId, 'COLLEGE', 10000);
    await pay(cashier, a.admissionId, 10000);
    const r = await cashier.post('/payments/refunds', { admissionId: a.admissionId, amount: 5000, refundType: 'ADVANCE', reason: 'x' });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('REFUND_EXCEEDS_AVAILABLE');
  });

  it('Test 13 - rejection requires a reason', async () => {
    const a = await newAdmission();
    await charge(a.admissionId, 'COLLEGE', 20000);
    await pay(cashier, a.admissionId, 25000);
    const r = await cashier.ok('/payments/refunds', { admissionId: a.admissionId, amount: 5000, refundType: 'ADVANCE', reason: 'Excess paid' });
    expect((await admin.post(`/approvals/${r.approvalRequestId}/reject`, {})).status).toBe(400);
    await admin.ok(`/approvals/${r.approvalRequestId}/reject`, { reason: 'Supporting document not attached.' });
    expect((await admin.getOk(`/payments/refunds/${r.refundId}`)).refund.Status).toBe('REJECTED');
  });

  it('Test 7 + 8 - cancellation keeps history; replacement on same seat gets a separate ledger', async () => {
    const seats = (await admin.getOk(`/masters/batches/${batchId}/seats`)).rows;
    const seat = seats.find((s: any) => s.SeatStatus === 'AVAILABLE');
    const a = await newAdmission({ seatId: seat.SeatId });
    await charge(a.admissionId, 'COLLEGE', 100000);
    await pay(cashier, a.admissionId, 30000);
    await admin.ok(`/admissions/${a.admissionId}/cancel`, { reason: 'Left the college', releaseSeat: true });
    const st = await admin.getOk(`/students/${a.studentId}`);
    expect(st.student.StudentStatus).toBe('CANCELLED');
    expect(st.admissions[0].AdmissionStatus).toBe('CANCELLED');
    const ledgerA = (await admin.getOk(`/admissions/${a.admissionId}/ledger`)).rows;
    expect(ledgerA.length).toBe(2); // financial history remains accessible

    const b = await newAdmission({ seatId: seat.SeatId });
    const adm = (await admin.getOk(`/admissions/${b.admissionId}`)).admission;
    expect(adm.ReplacesAdmissionId).toBe(a.admissionId);
    expect(b.studentId).not.toBe(a.studentId);
    expect((await admin.getOk(`/admissions/${b.admissionId}/ledger`)).rows.length).toBe(0);
    const hist = (await admin.getOk(`/reports/admission-history?seatId=${seat.SeatId}`)).rows;
    expect(hist.map((h: any) => h.AdmissionStatus)).toEqual(['CANCELLED', 'ACTIVE']);
    expect(hist[0].ReplacementAdmissionNumber).toBe(b.admissionNumber);
  });

  describe('Consultants', () => {
    let consultantId: number;
    let admissionId: number;
    let payableId: number;

    it('Test 9 - Consultant X -> Student A -> 20,000 shows in consultant ledger', async () => {
      consultantId = (await admin.ok('/consultants', { ConsultantName: 'Consultant X', Mobile: '9000000001' })).consultantId;
      await admin.ok(`/consultants/${consultantId}/rates`, { RateType: 'FIXED', Amount: 20000, EffectiveFrom: '2020-01-01' });
      // requested by the accountant, approved by the admin (segregation of duties)
      const a = await newAdmission({ admissionSourceType: 'CONSULTANT', consultantId }, accountant);
      admissionId = a.admissionId;
      expect(a.consultantPayable.autoApproved).toBe(false);
      payableId = a.consultantPayable.consultantPayableId;
      await admin.ok(`/approvals/${a.consultantPayable.approvalRequestId}/approve`);
      const ledger = (await admin.getOk(`/consultants/${consultantId}/ledger`)).rows;
      expect(ledger).toHaveLength(1);
      expect(ledger[0].StudentName).toBe(`Student ${n}`);
      expect(ledger[0].PayableAmount).toBe(20000);
    });

    it('Admission source Consultant requires a consultant', async () => {
      const r = await admin.post('/admissions', {
        student: { StudentName: 'No consultant' }, courseId: course('BSCN'), batchId, admissionSourceType: 'CONSULTANT', generateInitialCharges: false,
      });
      expect(r.status).toBe(400);
    });

    it('Test 10 - partial consultant payments 10k + 10k -> paid 20,000, due 0', async () => {
      for (let i = 0; i < 2; i++) {
        const p = await accountant.ok('/consultants/payments', {
          consultantPayableId: payableId, amount: 10000, paymentModeId: mode('NEFT'), transactionReference: `UTR-C-${i}`,
        });
        await admin.ok(`/approvals/${p.approvalRequestId}/approve`);
        await accountant.ok(`/consultants/payments/${p.consultantPaymentId}/process`);
      }
      const s = (await admin.getOk(`/consultants/${consultantId}`)).summary;
      expect(s.TotalPaid).toBe(20000);
      expect(s.Outstanding).toBe(0);
    });

    it('Test 11 - another 20,000 warns and requires authorised override', async () => {
      const body = { consultantPayableId: payableId, amount: 20000, paymentModeId: mode('NEFT'), transactionReference: 'UTR-C-9' };
      const r = await accountant.post('/consultants/payments', body);
      expect(r.status).toBe(409);
      expect(r.body.error).toBe('This consultant obligation has already been fully settled.');
      const r2 = await accountant.post('/consultants/payments', { ...body, override: true, overrideReason: 'Bonus' });
      expect(r2.status).toBe(403); // accountant has no override permission
      const r3 = await admin.post('/consultants/payments', { ...body, override: true, overrideReason: 'Board approved bonus' });
      expect(r3.status).toBe(201);
      expect(r3.body.isOverride).toBe(true);
    });

    it('SRS 39/78 - cancellation after consultant payment requires review, no automatic reversal', async () => {
      await admin.ok(`/admissions/${admissionId}/cancel`, { reason: 'Withdrew' });
      const rows = (await admin.getOk('/reports/cancelled-admission-consultant')).rows;
      const row = rows.find((x: any) => x.AdmissionId === admissionId);
      expect(row.ConsultantReviewStatus).toBe('REQUIRED');
      expect(row.Paid).toBe(20000);
      expect(row.Recovery).toBe(0);
      const rec = await admin.ok('/consultants/recoveries', {
        consultantId, consultantPayableId: payableId, recoveryMode: 'CASH', paymentModeId: mode('NEFT'), amount: 10000, reason: 'Partial recovery on cancellation',
      });
      await accountant.ok(`/approvals/${rec.approvalRequestId}/approve`).catch(() => undefined); // accountant cannot approve
      const req = await approvalFor('CONSULTANT_RECOVERY', rec.recoveryId);
      expect(req.Status).toBe('PENDING_APPROVAL');
    });
  });

  it('Test 14 - reversal preserves the original transaction in ledger and audit trail', async () => {
    const a = await newAdmission();
    await charge(a.admissionId, 'COLLEGE', 15000);
    const p = await pay(cashier, a.admissionId, 15000);
    expect((await summary(a.admissionId)).Outstanding).toBe(0);
    const rv = await accountant.ok(`/payments/${p.paymentId}/reverse`, { reason: 'Wrong amount entered' });
    await admin.ok(`/approvals/${rv.approvalRequestId}/approve`);
    const s = await summary(a.admissionId);
    expect(s.Outstanding).toBe(15000);
    expect(s.TotalPayments).toBe(0);
    const ledger = (await admin.getOk(`/admissions/${a.admissionId}/ledger`)).rows;
    expect(ledger.map((x: any) => x.EntryType)).toEqual(['CHARGE', 'PAYMENT', 'PAYMENT_REVERSAL']);
    const audit = (await admin.getOk(`/reports/audit?entity=Payment&entityId=${p.paymentId}`)).rows;
    const actions = audit.map((x: any) => x.ActionType);
    expect(actions).toEqual(expect.arrayContaining(['PAYMENT_CREATED', 'PAYMENT_POSTED', 'PAYMENT_REVERSED']));
    // corrected transaction
    await pay(cashier, a.admissionId, 10000);
    expect((await summary(a.admissionId)).Outstanding).toBe(5000);
  });
});

describe('Controls', () => {
  it('receipt numbers stay unique and gap-free under concurrent cashiers', async () => {
    const a = await newAdmission();
    await charge(a.admissionId, 'COLLEGE', 100000);
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => pay(i % 2 ? cashier : accountant, a.admissionId, 1000)));
    const nums = results.map((r) => r.receiptNumber);
    expect(new Set(nums).size).toBe(12);
    const d = await db();
    const all = await d.query(`SELECT ReceiptNumber FROM finance.Payments WHERE ReceiptNumber IS NOT NULL ORDER BY ReceiptNumber`);
    const seq = all.map((r: any) => Number(r.ReceiptNumber.slice(-6)));
    expect(seq).toEqual(seq.map((_: number, i: number) => i + 1));
    expect((await summary(a.admissionId)).Outstanding).toBe(88000);
  });

  it('allocation cannot exceed payment or charge', async () => {
    const a = await newAdmission();
    const c1 = await charge(a.admissionId, 'COLLEGE', 5000);
    const r = await cashier.post('/payments', {
      admissionId: a.admissionId, amount: 3000, paymentModeId: mode('CASH'), allocationMethod: 'MANUAL', allocations: [{ chargeId: c1, amount: 4000 }],
    });
    expect(r.status).toBe(400);
    const r2 = await cashier.post('/payments', {
      admissionId: a.admissionId, amount: 9000, paymentModeId: mode('CASH'), allocationMethod: 'MANUAL', allocations: [{ chargeId: c1, amount: 6000 }],
    });
    expect(r2.status).toBe(400);
    expect(r2.body.code).toBe('ALLOCATION_EXCEEDS_CHARGE');
  });

  it('payment mode rules and duplicate UTR warning', async () => {
    const a = await newAdmission();
    await charge(a.admissionId, 'COLLEGE', 5000);
    expect((await cashier.post('/payments', { admissionId: a.admissionId, amount: 1000, paymentModeId: mode('UPI') })).status).toBe(400);
    await cashier.ok('/payments', { admissionId: a.admissionId, amount: 1000, paymentModeId: mode('UPI'), transactionReference: 'UTR123' });
    const dup = await cashier.post('/payments', { admissionId: a.admissionId, amount: 1000, paymentModeId: mode('UPI'), transactionReference: 'UTR123' });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('DUPLICATE_REFERENCE');
    await cashier.ok('/payments', {
      admissionId: a.admissionId, amount: 1000, paymentModeId: mode('UPI'), transactionReference: 'UTR123', confirmDuplicateReference: true,
    });
  });

  it('financial records cannot be deleted or edited even directly in SQL', async () => {
    const d = await db();
    await expect(d.exec('DELETE FROM finance.Payments')).rejects.toThrow(/cannot be deleted/);
    await expect(d.exec(`UPDATE finance.Payments SET Amount = Amount + 1 WHERE Status = N'POSTED'`)).rejects.toThrow(/cannot be edited/);
    await expect(d.exec('DELETE FROM audit.AuditLogs')).rejects.toThrow(/cannot be deleted/);
  });

  it('role-based access is enforced server-side', async () => {
    expect((await principal.get('/reports/due')).status).toBe(200);
    expect((await principal.post('/payments', {})).status).toBe(403);
    expect((await cashier.get('/reports/due')).status).toBe(403);
    expect((await cashier.put('/masters/fee-heads/1', { FeeHeadName: 'x' })).status).toBe(403);
    expect((await cashier.get('/payments?format=csv')).status).toBe(403); // cashier cannot export
    // cashier's collection report only shows their own collections
    const own = await cashier.getOk('/reports/collection?groupBy=cashier&from=2000-01-01&to=2100-01-01');
    expect(own.rows.every((r: any) => r.Label === 'cashier1')).toBe(true);
  });

  it('cashier day closing computes cash from transactions', async () => {
    const prev = await cashier.getOk('/cashier/day-closing/preview');
    const f = prev.figures;
    expect(f.CashCollection).toBeGreaterThan(0);
    const expected = f.OpeningCash + f.CashCollection - f.CashRefund;
    await cashier.ok('/cashier/day-closing', { cashDeposit: 0, actualClosingCash: expected });
    const list = (await admin.getOk('/cashier/day-closing')).rows;
    expect(list[0].Difference).toBe(0);
    expect((await cashier.post(`/cashier/day-closing/${list[0].ClosingId}/verify`, { action: 'VERIFY' })).status).toBe(403);
    await admin.ok(`/cashier/day-closing/${list[0].ClosingId}/verify`, { action: 'VERIFY' });
  });

  it('ledger, summary and per-charge balances reconcile for every admission', async () => {
    const r = await admin.getOk('/reports/reconcile');
    expect(r.mismatches).toEqual([]);
    const dash = await principal.getOk('/dashboard');
    expect(dash.studentFees.TotalCollection).toBeGreaterThan(0);
  });
});
