/* Student education loans: Bihar Student Credit Card (BSEFCL / DRCC) and bank loans */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '../src/db';
import { parseAdviceText } from '../src/lib/loanAdvice';
import { Client, createTestDatabase, dropTestDatabase } from './helpers';

const admin = new Client('admin');
const accountant = new Client('accountant1');
const cashier = new Client('cashier1');
let L: any;
let batchId: number;
const mode = (c: string) => L.paymentModes.find((m: any) => m.PaymentModeCode === c).PaymentModeId;
const course = (c: string) => L.courses.find((x: any) => x.CourseCode === c).CourseId;
const ay = (code: string) => L.academicYears.find((a: any) => a.AcademicYearCode === code).AcademicYearId;
const head = (c: string) => L.feeHeads.find((f: any) => f.FeeHeadCode === c).FeeHeadId;

async function admit(name: string, father: string) {
  const a = await admin.ok('/admissions', {
    student: { StudentName: name, FatherName: father }, courseId: course('BSCN'), batchId, admissionSourceType: 'DIRECT', generateInitialCharges: false,
  });
  await admin.ok(`/admissions/${a.admissionId}/charges`, { feeHeadId: head('TUITION'), amount: 120000, academicYearId: ay('2026-27') });
  return a;
}
/* the layout of a BSCC sanction letter */
const letter = (admissionId: number, reg: string) => ({
  admissionId,
  loanType: 'BSCC',
  lenderName: 'BSEFCL (Bihar State Education Finance Corporation Ltd.)',
  drccDistrict: 'MUZAFFARPUR',
  registrationNumber: reg,
  sanctionDate: '2025-03-17',
  sanctionedAmount: 400000,
  coApplicantName: 'Test Co-Applicant',
  studentIfsc: 'UTIB0000309',
  instituteIfsc: 'HDFC0000001',
  instituteAccountNo: '50200000000001',
  courseOnLetter: 'B.Sc. (Nursing)',
  schedule: ['2025-03-13', '2026-01-10', '2027-01-10', '2028-01-10'].map((dt, i) => ({
    periodLabel: `YEAR ${i + 1}`, expectedDate: dt, feeDescription: 'Tuition Fees including Hostel Expenses', expectedAmount: 100000,
    expectedMode: 'RTGS', beneficiaryName: 'AHS NURSING COLLEGE', beneficiaryAccountNo: '50200000000001',
  })),
});

beforeAll(async () => {
  await createTestDatabase();
  await admin.login('Admin@12345');
  await admin.ok('/auth/change-password', { currentPassword: 'Admin@12345', newPassword: 'Admin@2026x' });
  for (const [u, role, c] of [['accountant1', 'ACCOUNTANT', accountant], ['cashier1', 'CASHIER', cashier]] as const) {
    await admin.ok('/admin/users', { UserName: u, FullName: u, Password: 'Temp@1234', Roles: [role] });
    await c.login('Temp@1234');
    await c.ok('/auth/change-password', { currentPassword: 'Temp@1234', newPassword: 'Secret@1234' });
  }
  L = await admin.getOk('/masters/lookups');
  batchId = (await admin.ok('/masters/batches', { CourseId: course('BSCN'), BatchCode: 'BSCN-2025', BatchName: 'BSCN 2025', StartYear: 2025, EndYear: 2029, IntakeCapacity: 60 })).batchId;
});
afterAll(async () => {
  await dropTestDatabase();
});

describe('Student loans', () => {
  let a1: any;
  let loanId: number;

  it('records a sanction letter with its year-wise disbursement structure', async () => {
    a1 = await admit('BIKRAM TESTKUMAR', 'RAM TESTLAL');
    const r = await accountant.ok('/loans', letter(a1.admissionId, '7200001'));
    loanId = r.loanId;
    expect(r.loanNumber).toMatch(/^AHS-LN-\d{6}$/);
    const l = await admin.getOk(`/loans/${loanId}`);
    expect(l.loan.SanctionedAmount).toBe(400000);
    expect(l.schedule.map((s: any) => s.PeriodLabel)).toEqual(['YEAR 1', 'YEAR 2', 'YEAR 3', 'YEAR 4']);
    // same registration id twice is refused
    expect((await accountant.post('/loans', letter(a1.admissionId, '7200001'))).status).toBe(409);
    // schedule larger than the sanction is refused
    const bad = letter(a1.admissionId, '9179374');
    bad.sanctionedAmount = 300000;
    expect((await accountant.post('/loans', bad)).body.code).toBe('SCHEDULE_EXCEEDS_SANCTION');
    // cashier can view but not record loans
    expect((await cashier.get(`/loans/${loanId}`)).status).toBe(200);
    expect((await cashier.post('/loans', letter(a1.admissionId, '1'))).status).toBe(403);
  });

  it('money from BSEFCL is a receipt against the student and shows in the ledger with loan details', async () => {
    const r = await accountant.ok(`/loans/${loanId}/receive`, {
      amount: 100000, paymentDate: '2026-04-30', paymentModeId: mode('RTGS'), transactionReference: '600000000101',
    });
    expect(r.status).toBe('POSTED');
    expect(r.receiptNumber).toMatch(/^AHS-REC-/);
    const fin = await admin.getOk(`/admissions/${a1.admissionId}/financial`);
    expect(fin.summary.LoanReceived).toBe(100000);
    expect(fin.summary.StudentPaid).toBe(0);
    expect(fin.summary.LoanPending).toBe(300000);
    expect(fin.summary.Outstanding).toBe(20000);
    const ledger = (await admin.getOk(`/admissions/${a1.admissionId}/ledger`)).rows;
    const e = ledger.find((x: any) => x.EntryType === 'LOAN_RECEIPT');
    expect(e.Particulars).toContain('Bihar Student Credit Card');
    expect(e.Particulars).toContain('DRCC MUZAFFARPUR');
    expect(e.Particulars).toContain('Reg 7200001');
    expect(e.Particulars).toContain('YEAR 1 instalment');
    expect(e.Particulars).toContain('600000000101');
    const l = await admin.getOk(`/loans/${loanId}`);
    expect(l.loan.Status).toBe('DISBURSING');
    expect(l.schedule[0].InstallmentStatus).toBe('RECEIVED');
    expect(l.receipts[0].PaymentSource).toBe('LOAN');
  });

  it('cannot receive more than sanctioned; the same UTR is not recorded twice', async () => {
    const r = await accountant.post(`/loans/${loanId}/receive`, { amount: 300001, paymentModeId: mode('RTGS'), transactionReference: 'X1' });
    expect(r.body.code).toBe('LOAN_EXCEEDS_SANCTION');
    const dup = await accountant.post(`/loans/${loanId}/receive`, { amount: 1000, paymentModeId: mode('NEFT'), transactionReference: '600000000101' });
    expect(dup.status).toBe(409);
    const d = await db();
    await expect(
      d.exec(`UPDATE finance.StudentLoans SET SanctionedAmount = 50000 WHERE LoanId = @id`, { id: loanId }).then(() =>
        d.exec(`INSERT INTO finance.Payments (AdmissionId, StudentId, PaymentDate, Amount, PaymentModeId, Status, SubmittedBy, CreatedBy, LoanId)
                SELECT AdmissionId, StudentId, '2026-05-01', 1, 1, N'DRAFT', 1, 1, LoanId FROM finance.StudentLoans WHERE LoanId = @id`, { id: loanId })),
    ).rejects.toThrow(/exceeds the sanctioned/);
    await d.exec(`UPDATE finance.StudentLoans SET SanctionedAmount = 400000 WHERE LoanId = @id`, { id: loanId });
  });

  it('reads a BSEFCL payment advice (PDF text or pasted table), matches by Registration Id and records it in one go', async () => {
    const a2 = await admit('GOVIND TESTSAHNI', 'BASANT TESTSAHANI'); // no loan recorded yet
    const loan3 = await accountant.ok('/loans', letter((await admit('NEHA TESTKUMARI', 'ARVIND TESTRAY')).admissionId, '7200003'));
    /* text as extracted from the e-mail saved as PDF: cells wrapped, no tabs */
    const pdfText = `Dear Sir/Madam, This is in reference to the Tuition & Hostel Fees paid by BSEFCL.
      Applicant Name Applicants Father Name Course Amount Paid Date Of Payment Purpose Of Payment UTR Details Account Holders Name Beneficiary IFSC Code Beneficiary Name Registration Id
      BIKRAM TESTKUMAR RAM TESTLAL B.Sc. (Nursing) 100000.0 30-APR- 26 Tuition Fees including Hostel Expenses 600000000101 50200000000001 HDFC0000001 AHS NURSING COLLEGE 7200001
      GOVIND TESTSAHNI BASANT TESTSAHANI B.Sc. (Nursing) 67500.0 30-APR- 26 Tuition Fees including 600000000102 50200000000001 HDFC0000001 AHS NURSING COLLEGE 7200002
      Hostel Expenses NEHA TESTKUMARI ARVIND TESTRAY B.Sc. (Nursing) 100000.0 30-APR-26 Tuition Fees including Hostel Expenses 600000000103 50200000000001 HDFC0000001 AHS NURSING COLLEGE 7200003
      PAPPU UNKNOWN SURESH NOBODY General Nursing Midwifery (G.N.M) 142500.0 30-APR-26 Tuition Fees including Hostel Expenses 600000000104 50200000000001 HDFC0000001 AHS NURSING COLLEGE 7200004
      In case of any discrepancy in the above details, kindly send an email`;
    const parsed = parseAdviceText(pdfText);
    expect(parsed.map((r) => r.registrationNumber)).toEqual(['7200001', '7200002', '7200003', '7200004']);
    expect(parsed[2].applicantName).toBe('NEHA TESTKUMARI ARVIND TESTRAY');
    expect(parsed[3].course).toMatch(/G\.N\.M/);
    /* a table pasted from the e-mail is tab separated */
    const tabbed = parseAdviceText('NEHA TESTKUMARI\tARVIND TESTRAY\tB.Sc. (Nursing)\t100000.0\t30-APR-26\tTuition Fees\t600000000103\t50200000000001\tHDFC0000001\tAHS NURSING COLLEGE\t7200003');
    expect(tabbed[0]).toMatchObject({ fatherName: 'ARVIND TESTRAY', amount: 100000, paymentDate: '2026-04-30', utr: '600000000103' });

    const m = await accountant.ok('/loans/advices/parse', { text: pdfText });
    expect(m.rows.map((r: any) => r.match)).toEqual(['ALREADY_RECORDED', 'SUGGESTED', 'MATCHED', 'UNMATCHED']);
    expect(m.rows[1].candidates[0].AdmissionId).toBe(a2.admissionId);
    expect(m.rows[2].loan.LoanId).toBe(loan3.loanId);

    const rows = m.rows
      .filter((r: any) => r.match === 'MATCHED' || r.match === 'SUGGESTED')
      .map((r: any) => ({
        registrationNumber: r.registrationNumber, applicantName: r.applicantName, course: r.course, amount: r.amount, paymentDate: r.paymentDate,
        utr: r.utr, ifsc: r.ifsc, accountNo: r.accountNo, loanId: r.loan?.LoanId ?? null, admissionId: r.loan ? null : r.candidates[0].AdmissionId,
      }));
    const imp = await accountant.ok('/loans/advices', {
      loanType: 'BSCC', lenderName: 'BSEFCL (Bihar State Education Finance Corporation Ltd.)', adviceDate: '2026-05-08',
      sourceReference: 'Bihar Student Credit Card - Tuition Fees Details (e-mail 08-05-2026)', paymentModeId: mode('RTGS'), rows,
    });
    expect(imp.recorded).toBe(2);
    expect(imp.total).toBe(167500);
    expect(imp.results.find((x: any) => x.registrationNumber === '7200002').createdLoan).toMatch(/^AHS-LN-/);
    const adv = await admin.getOk(`/loans/advices/${imp.loanAdviceId}`);
    expect(adv.payments).toHaveLength(2);
    // parsing again now shows everything as already recorded
    const again = await accountant.ok('/loans/advices/parse', { text: pdfText });
    expect(again.rows.slice(0, 3).every((r: any) => r.match === 'ALREADY_RECORDED')).toBe(true);
    await admin.ok(`/loans/advices/${imp.loanAdviceId}/verify`, { verified: true, remarks: 'Matched with HDFC statement' });
    expect((await admin.getOk('/loans/advices/list')).rows[0].BankVerified).toBe(true);
  });

  it('a failing row rolls back the whole advice', async () => {
    const before = (await admin.getOk('/loans/advices/list')).rows.length;
    const r = await accountant.post('/loans/advices', {
      loanType: 'BSCC', lenderName: 'BSEFCL', adviceDate: '2026-05-09', paymentModeId: mode('RTGS'),
      rows: [
        { registrationNumber: '7200001', amount: 1000, paymentDate: '2026-05-09', utr: 'NEWUTR1', loanId },
        { registrationNumber: '7200001', amount: 999999, paymentDate: '2026-05-09', utr: 'NEWUTR2', loanId },
      ],
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/Row 2/);
    expect((await admin.getOk('/loans/advices/list')).rows.length).toBe(before);
  });

  it('reversing a loan receipt keeps the history and restores what is pending from the lender', async () => {
    const l = await admin.getOk(`/loans/${loanId}`);
    const pid = l.receipts[0].PaymentId;
    const rv = await accountant.ok(`/payments/${pid}/reverse`, { reason: 'Credited to wrong student' });
    await admin.ok(`/approvals/${rv.approvalRequestId}/approve`);
    const after = await admin.getOk(`/loans/${loanId}`);
    expect(after.loan.ReceivedAmount).toBe(0);
    expect(after.loan.Status).toBe('SANCTIONED');
    const ledger = (await admin.getOk(`/admissions/${a1.admissionId}/ledger`)).rows.map((x: any) => x.EntryType);
    expect(ledger).toEqual(['LOAN_RECEIPT', 'CHARGE', 'PAYMENT_REVERSAL']); // money arrived (30-Apr) before the fee was charged
  });

  it('lists loans, lender/DRCC totals and instalments expected', async () => {
    const list = await admin.getOk('/loans?type=BSCC');
    expect(list.rows.length).toBe(3);
    const sum = await admin.getOk('/loans/summary');
    expect(sum.totals.Sanctioned).toBe(867500);
    const exp = await admin.getOk('/loans/expected?from=2026-01-01&to=2026-12-31');
    expect(exp.rows.every((r: any) => r.PeriodLabel === 'YEAR 2')).toBe(true);
    const r = await admin.getOk('/reports/reconcile');
    expect(r.mismatches).toEqual([]);
  });
});
