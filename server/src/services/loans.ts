/* Student education loans - Bihar Student Credit Card (BSEFCL via DRCC)
   and bank loans: sanction, disbursement schedule, money received. */
import { Db, dec } from '../db';
import { audit, AuditContext } from '../lib/audit';
import { today } from '../lib/dates';
import { badRequest, conflict, notFound } from '../lib/errors';
import { AdviceRow, guessCourseCode } from '../lib/loanAdvice';
import { toPaise, toRupees } from '../lib/money';
import { createPayment, lockAdmission, refreshLoanStatus } from './finance';

type Ctx = AuditContext & { userId: number };

export const LOAN_TYPES = ['BSCC', 'BANK_LOAN', 'OTHER'] as const;
export type LoanType = (typeof LOAN_TYPES)[number];

export interface ScheduleLine {
  loanScheduleId?: number | null;
  periodLabel: string;
  feePeriodId?: number | null;
  expectedDate?: string | null;
  feeDescription?: string | null;
  expectedAmount: number;
  expectedMode?: string | null;
  beneficiaryName?: string | null;
  beneficiaryAccountNo?: string | null;
}

export interface LoanInput {
  admissionId: number;
  loanType: LoanType;
  lenderName: string;
  drccDistrict?: string | null;
  branchName?: string | null;
  registrationNumber?: string | null;
  sanctionNumber?: string | null;
  sanctionDate?: string | null;
  sanctionedAmount: number;
  applicantName?: string | null;
  coApplicantName?: string | null;
  applicantAddress?: string | null;
  courseOnLetter?: string | null;
  studentIfsc?: string | null;
  instituteIfsc?: string | null;
  instituteAccountNo?: string | null;
  contractSignedDate?: string | null;
  status?: string | null;
  remarks?: string | null;
  schedule?: ScheduleLine[];
}

const LOAN_FIELDS: [keyof LoanInput, string][] = [
  ['loanType', 'LoanType'], ['lenderName', 'LenderName'], ['drccDistrict', 'DrccDistrict'], ['branchName', 'BranchName'],
  ['registrationNumber', 'RegistrationNumber'], ['sanctionNumber', 'SanctionNumber'], ['sanctionDate', 'SanctionDate'],
  ['applicantName', 'ApplicantName'], ['coApplicantName', 'CoApplicantName'], ['applicantAddress', 'ApplicantAddress'],
  ['courseOnLetter', 'CourseOnLetter'], ['studentIfsc', 'StudentIfsc'], ['instituteIfsc', 'InstituteIfsc'],
  ['instituteAccountNo', 'InstituteAccountNo'], ['contractSignedDate', 'ContractSignedDate'], ['remarks', 'Remarks'],
];

async function loanRow(d: Db, loanId: number, lock = false) {
  const l = await d.one(`SELECT * FROM finance.StudentLoans ${lock ? 'WITH (UPDLOCK, ROWLOCK)' : ''} WHERE LoanId = @id`, { id: loanId });
  if (!l) throw notFound('Loan');
  return l;
}

async function assertRegistrationFree(d: Db, loanType: string, reg: string | null | undefined, exceptLoanId = 0) {
  if (!reg) return;
  const other = await d.one(
    `SELECT TOP 1 l.LoanNumber, s.StudentName FROM finance.StudentLoans l JOIN admission.Students s ON s.StudentId = l.StudentId
     WHERE l.RegistrationNumber = @r AND l.LoanType = @t AND l.LoanId <> @id AND l.Status NOT IN (N'CANCELLED', N'REJECTED')`,
    { r: reg, t: loanType, id: exceptLoanId },
  );
  if (other) throw conflict(`Registration Id ${reg} is already recorded on loan ${other.LoanNumber} (${other.StudentName}).`, 'LOAN_REGISTRATION_EXISTS');
}

export async function createLoan(d: Db, ctx: Ctx, input: LoanInput) {
  const a = await lockAdmission(d, input.admissionId);
  await assertRegistrationFree(d, input.loanType, input.registrationNumber);
  const loanNumber = await d.nextDocumentNumber('LOAN', today());
  const values: Record<string, unknown> = {
    LoanNumber: loanNumber,
    StudentId: a.StudentId,
    AdmissionId: input.admissionId,
    SanctionedAmount: dec(input.sanctionedAmount),
    Status: input.status || 'SANCTIONED',
    CreatedBy: ctx.userId,
  };
  for (const [k, col] of LOAN_FIELDS) if (input[k] !== undefined) values[col] = input[k] ?? null;
  const loanId = await d.insert('finance.StudentLoans', values, 'LoanId');
  if (input.schedule?.length) await saveSchedule(d, ctx, loanId, input.schedule, false);
  await audit(d, ctx, 'LOAN_CREATED', 'StudentLoan', loanId, { newValues: { loanNumber, ...input } });
  return { loanId, loanNumber };
}

export async function updateLoan(d: Db, ctx: Ctx, loanId: number, input: Partial<LoanInput>) {
  const old = await loanRow(d, loanId, true);
  if (input.registrationNumber !== undefined || input.loanType !== undefined)
    await assertRegistrationFree(d, input.loanType ?? old.LoanType, input.registrationNumber ?? old.RegistrationNumber, loanId);
  const sets: string[] = [];
  const params: Record<string, unknown> = { id: loanId, u: ctx.userId };
  const changed: Record<string, unknown> = {};
  for (const [k, col] of LOAN_FIELDS) {
    if (input[k] === undefined) continue;
    sets.push(`${col} = @${col}`);
    params[col] = input[k] ?? null;
    changed[col] = input[k];
  }
  if (input.sanctionedAmount !== undefined) {
    const r = await d.one(`SELECT ISNULL(SUM(Amount), 0) AS amt FROM finance.Payments WHERE LoanId = @id AND Status IN (N'DRAFT', N'PENDING_APPROVAL', N'APPROVED', N'POSTED')`, { id: loanId });
    if (toPaise(input.sanctionedAmount) < toPaise(r.amt))
      throw badRequest(`Sanctioned amount cannot be less than the ₹${r.amt} already received from the lender.`);
    sets.push('SanctionedAmount = @amt');
    params.amt = dec(input.sanctionedAmount);
    changed.SanctionedAmount = input.sanctionedAmount;
  }
  if (input.status !== undefined && input.status !== old.Status) {
    sets.push('Status = @status');
    params.status = input.status;
    changed.Status = input.status;
  }
  if (sets.length) {
    await d.exec(`UPDATE finance.StudentLoans SET ${sets.join(', ')}, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @u WHERE LoanId = @id`, params);
    if (input.sanctionedAmount !== undefined && input.status === undefined) await refreshLoanStatus(d, loanId);
    await audit(d, ctx, 'LOAN_UPDATED', 'StudentLoan', loanId, {
      oldValues: Object.fromEntries(Object.keys(changed).map((c) => [c, old[c]])),
      newValues: changed,
    });
  }
  if (input.schedule) await saveSchedule(d, ctx, loanId, input.schedule, true);
}

/** Replace the disbursement structure. Lines that already have money against them cannot be removed. */
export async function saveSchedule(d: Db, ctx: Ctx, loanId: number, lines: ScheduleLine[], withAudit = true) {
  const loan = await loanRow(d, loanId, true);
  const total = lines.reduce((t, l) => t + toPaise(l.expectedAmount), 0);
  if (total > toPaise(loan.SanctionedAmount))
    throw badRequest(`The disbursement schedule (₹${toRupees(total)}) is more than the sanctioned amount (₹${loan.SanctionedAmount}).`, 'SCHEDULE_EXCEEDS_SANCTION');
  const existing = await d.query(
    `SELECT s.LoanScheduleId, s.IsActive, (SELECT COUNT(*) FROM finance.Payments p WHERE p.LoanScheduleId = s.LoanScheduleId
       AND p.Status IN (N'DRAFT', N'PENDING_APPROVAL', N'APPROVED', N'POSTED')) AS Payments
     FROM finance.LoanSchedule s WHERE s.LoanId = @id`,
    { id: loanId },
  );
  const keep = new Set(lines.filter((l) => l.loanScheduleId).map((l) => Number(l.loanScheduleId)));
  for (const e of existing) {
    if (keep.has(Number(e.LoanScheduleId)) || !e.IsActive) continue;
    if (e.Payments > 0) throw badRequest('An instalment that already has money received against it cannot be removed.');
    await d.exec(`UPDATE finance.LoanSchedule SET IsActive = 0, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @u WHERE LoanScheduleId = @id`, {
      id: e.LoanScheduleId,
      u: ctx.userId,
    });
  }
  let n = 0;
  for (const l of lines) {
    n++;
    const v = {
      InstallmentNo: n,
      PeriodLabel: l.periodLabel,
      FeePeriodId: l.feePeriodId ?? null,
      ExpectedDate: l.expectedDate || null,
      FeeDescription: l.feeDescription ?? null,
      ExpectedAmount: dec(l.expectedAmount),
      ExpectedMode: l.expectedMode ?? null,
      BeneficiaryName: l.beneficiaryName ?? null,
      BeneficiaryAccountNo: l.beneficiaryAccountNo ?? null,
    };
    if (l.loanScheduleId) {
      if (!existing.some((e) => Number(e.LoanScheduleId) === Number(l.loanScheduleId))) throw badRequest('Schedule line does not belong to this loan.');
      await d.exec(
        `UPDATE finance.LoanSchedule SET InstallmentNo = @InstallmentNo, PeriodLabel = @PeriodLabel, FeePeriodId = @FeePeriodId,
           ExpectedDate = @ExpectedDate, FeeDescription = @FeeDescription, ExpectedAmount = @ExpectedAmount, ExpectedMode = @ExpectedMode,
           BeneficiaryName = @BeneficiaryName, BeneficiaryAccountNo = @BeneficiaryAccountNo, IsActive = 1,
           UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @u
         WHERE LoanScheduleId = @id`,
        { ...v, id: l.loanScheduleId, u: ctx.userId },
      );
    } else {
      await d.insert('finance.LoanSchedule', { LoanId: loanId, ...v, CreatedBy: ctx.userId }, 'LoanScheduleId');
    }
  }
  if (withAudit) await audit(d, ctx, 'LOAN_SCHEDULE_SAVED', 'StudentLoan', loanId, { newValues: lines });
}

export interface LoanReceiptInput {
  loanId: number;
  loanScheduleId?: number | null;
  amount: number;
  paymentDate?: string | null;
  paymentModeId: number;
  transactionReference?: string | null;
  bankName?: string | null;
  remarks?: string | null;
  loanAdviceId?: number | null;
  confirmDuplicateReference?: boolean;
}

/** First instalment that still expects money (earliest expected date). */
async function pickInstallment(d: Db, loanId: number) {
  const s = await d.one(
    `SELECT TOP 1 LoanScheduleId FROM reporting.vw_LoanScheduleStatus
     WHERE LoanId = @id AND IsActive = 1 AND ExpectedAmount - ReceivedAmount - InProcessAmount > 0
     ORDER BY CASE WHEN ExpectedDate IS NULL THEN 1 ELSE 0 END, ExpectedDate, InstallmentNo`,
    { id: loanId },
  );
  return s ? Number(s.LoanScheduleId) : null;
}

/** Money received in the college account from the lender against a student's loan. */
export async function receiveLoanAmount(d: Db, ctx: Ctx, input: LoanReceiptInput) {
  const loan = await loanRow(d, input.loanId, true);
  if (['CANCELLED', 'REJECTED', 'CLOSED', 'APPLIED'].includes(loan.Status))
    throw badRequest(`This loan is ${loan.Status.toLowerCase()}; money cannot be recorded against it.`);
  const r = await d.one(
    `SELECT ISNULL(SUM(Amount), 0) AS amt FROM finance.Payments WHERE LoanId = @id AND Status IN (N'DRAFT', N'PENDING_APPROVAL', N'APPROVED', N'POSTED')`,
    { id: input.loanId },
  );
  const left = toPaise(loan.SanctionedAmount) - toPaise(r.amt);
  if (toPaise(input.amount) > left)
    throw badRequest(
      `₹${input.amount} is more than the ₹${toRupees(Math.max(0, left))} still to come on loan ${loan.LoanNumber} (sanctioned ₹${loan.SanctionedAmount}). ` +
        'Update the sanctioned amount if the lender revised the sanction.',
      'LOAN_EXCEEDS_SANCTION',
    );
  let scheduleId = input.loanScheduleId ?? null;
  if (scheduleId) {
    const s = await d.one('SELECT LoanId FROM finance.LoanSchedule WHERE LoanScheduleId = @id AND IsActive = 1', { id: scheduleId });
    if (!s || Number(s.LoanId) !== input.loanId) throw badRequest('The instalment does not belong to this loan.');
  } else {
    scheduleId = await pickInstallment(d, input.loanId);
  }
  const lenderLine = loan.LoanType === 'BSCC' ? `${loan.LenderName} (Bihar Student Credit Card${loan.DrccDistrict ? ', DRCC ' + loan.DrccDistrict : ''})` : loan.LenderName;
  const out = await createPayment(d, ctx, {
    admissionId: Number(loan.AdmissionId),
    amount: input.amount,
    paymentDate: input.paymentDate,
    paymentModeId: input.paymentModeId,
    transactionReference: input.transactionReference,
    bankName: input.bankName || loan.LenderName, // RTGS / NEFT need a bank; the advice only names the lender
    remarks: input.remarks || `Received from ${lenderLine}${loan.RegistrationNumber ? ', Reg ' + loan.RegistrationNumber : ''}`,
    confirmDuplicateReference: input.confirmDuplicateReference,
    loanId: input.loanId,
    loanScheduleId: scheduleId,
    loanAdviceId: input.loanAdviceId ?? null,
  });
  await audit(d, ctx, 'LOAN_AMOUNT_RECEIVED', 'StudentLoan', input.loanId, {
    newValues: { paymentId: out.paymentId, amount: input.amount, loanScheduleId: scheduleId, reference: input.transactionReference },
  });
  return { ...out, loanScheduleId: scheduleId };
}

/* ------------------------------------------------------------------ */
/* payment advices (BSEFCL e-mail)                                      */
/* ------------------------------------------------------------------ */
export interface MatchedRow extends AdviceRow {
  match: 'MATCHED' | 'ALREADY_RECORDED' | 'EXCEEDS_SANCTION' | 'SUGGESTED' | 'UNMATCHED';
  message: string | null;
  loan: any | null;
  candidates: any[];
  existingReceipt: string | null;
}

export async function matchAdviceRows(d: Db, rows: AdviceRow[]): Promise<MatchedRow[]> {
  const out: MatchedRow[] = [];
  for (const r of rows) {
    const dup = await d.one(
      `SELECT TOP 1 ReceiptNumber, StudentName FROM reporting.vw_PaymentRegister
       WHERE TransactionReference = @utr AND Status NOT IN (N'REJECTED', N'CANCELLED')`,
      { utr: r.utr },
    );
    const loan = await d.one(
      `SELECT TOP 1 * FROM reporting.vw_LoanSummary WHERE RegistrationNumber = @reg AND Status NOT IN (N'CANCELLED', N'REJECTED')
       ORDER BY LoanId DESC`,
      { reg: r.registrationNumber },
    );
    if (dup) {
      out.push({ ...r, match: 'ALREADY_RECORDED', message: `UTR already recorded (receipt ${dup.ReceiptNumber ?? 'pending'}, ${dup.StudentName})`, loan, candidates: [], existingReceipt: dup.ReceiptNumber });
      continue;
    }
    if (loan) {
      const left = toPaise(loan.SanctionedAmount) - toPaise(loan.ReceivedAmount) - toPaise(loan.InProcessAmount);
      const exceeds = toPaise(r.amount) > left;
      out.push({
        ...r,
        match: exceeds ? 'EXCEEDS_SANCTION' : 'MATCHED',
        message: exceeds
          ? `Only ₹${toRupees(Math.max(0, left))} of the ₹${loan.SanctionedAmount} sanction is still to come - update the sanction first`
          : null,
        loan,
        candidates: [],
        existingReceipt: null,
      });
      continue;
    }
    /* no loan with this Registration Id: suggest students whose name (and father's name) appear in the row */
    const blob = [r.applicantName, r.fatherName].filter(Boolean).join(' ');
    const course = guessCourseCode(r.course);
    const candidates = blob
      ? await d.query(
          `SELECT TOP 5 a.AdmissionId, a.AdmissionNumber, a.AdmissionStatus, s.StudentId, s.StudentName, s.FatherName, c.CourseCode, b.BatchCode
           FROM admission.Admissions a JOIN admission.Students s ON s.StudentId = a.StudentId
           JOIN academic.Courses c ON c.CourseId = a.CourseId JOIN academic.Batches b ON b.BatchId = a.BatchId
           WHERE CHARINDEX(s.StudentName, @blob) > 0 AND (s.FatherName IS NULL OR CHARINDEX(s.FatherName, @blob) > 0)
             AND (@course IS NULL OR c.CourseCode = @course)
           ORDER BY CASE WHEN a.AdmissionStatus = N'ACTIVE' THEN 0 ELSE 1 END, a.AdmissionId DESC`,
          { blob, course },
        )
      : [];
    out.push({
      ...r,
      match: candidates.length ? 'SUGGESTED' : 'UNMATCHED',
      message: candidates.length
        ? 'No loan with this Registration Id yet - confirm the student below; a loan record will be created'
        : 'No loan or student found - choose the student manually',
      loan: null,
      candidates,
      existingReceipt: null,
    });
  }
  return out;
}

export interface AdviceImportInput {
  loanType: LoanType;
  lenderName: string;
  adviceDate: string;
  sourceReference?: string | null;
  paymentModeId: number;
  remarks?: string | null;
  rows: {
    registrationNumber: string;
    applicantName?: string | null;
    course?: string | null;
    amount: number;
    paymentDate: string;
    utr: string;
    ifsc?: string | null;
    accountNo?: string | null;
    loanId?: number | null;
    admissionId?: number | null; // when no loan exists yet
  }[];
}

/** Records every row of an advice in one transaction (all or nothing). */
export async function importAdvice(d: Db, ctx: Ctx, input: AdviceImportInput) {
  if (!input.rows.length) throw badRequest('Nothing to record.');
  const utrs = new Set<string>();
  for (const r of input.rows) {
    if (utrs.has(r.utr)) throw badRequest(`UTR ${r.utr} appears twice in this advice.`);
    utrs.add(r.utr);
  }
  const total = input.rows.reduce((t, r) => t + toPaise(r.amount), 0);
  const adviceNumber = await d.nextDocumentNumber('LOAN_ADVICE', input.adviceDate);
  const adviceId = await d.insert(
    'finance.LoanAdvices',
    {
      AdviceNumber: adviceNumber,
      LoanType: input.loanType,
      LenderName: input.lenderName,
      AdviceDate: input.adviceDate,
      SourceReference: input.sourceReference ?? null,
      EntryCount: input.rows.length,
      TotalAmount: dec(toRupees(total)),
      Remarks: input.remarks ?? null,
      CreatedBy: ctx.userId,
    },
    'LoanAdviceId',
  );
  const results: any[] = [];
  let i = 0;
  for (const r of input.rows) {
    i++;
    try {
      let loanId = r.loanId ?? null;
      let createdLoan: string | null = null;
      if (!loanId) {
        if (!r.admissionId) throw badRequest('choose the student');
        const created = await createLoan(d, ctx, {
          admissionId: r.admissionId,
          loanType: input.loanType,
          lenderName: input.lenderName,
          registrationNumber: r.registrationNumber,
          sanctionedAmount: r.amount,
          applicantName: r.applicantName ?? null,
          courseOnLetter: r.course ?? null,
          instituteIfsc: r.ifsc ?? null,
          instituteAccountNo: r.accountNo ?? null,
          status: 'SANCTIONED',
          remarks: `Created from payment advice ${adviceNumber}. Sanction letter details (amount, year-wise schedule) still to be entered.`,
        });
        loanId = created.loanId;
        createdLoan = created.loanNumber;
      }
      const res = await receiveLoanAmount(d, ctx, {
        loanId,
        amount: r.amount,
        paymentDate: r.paymentDate,
        paymentModeId: input.paymentModeId,
        transactionReference: r.utr,
        loanAdviceId: adviceId,
      });
      results.push({ registrationNumber: r.registrationNumber, utr: r.utr, amount: r.amount, ...res, createdLoan });
    } catch (e: any) {
      throw badRequest(`Row ${i} (Reg ${r.registrationNumber}, UTR ${r.utr}): ${e.message}`, e.code ?? 'ADVICE_ROW_FAILED');
    }
  }
  await audit(d, ctx, 'LOAN_ADVICE_RECORDED', 'LoanAdvice', adviceId, {
    newValues: { adviceNumber, rows: input.rows.length, total: toRupees(total), source: input.sourceReference },
  });
  return { loanAdviceId: adviceId, adviceNumber, recorded: results.length, total: toRupees(total), results };
}

export async function setAdviceVerified(d: Db, ctx: Ctx, adviceId: number, verified: boolean, remarks: string | null) {
  const n = await d.exec(
    `UPDATE finance.LoanAdvices SET BankVerified = @v, BankVerifiedBy = CASE WHEN @v = 1 THEN @u END,
       BankVerifiedAt = CASE WHEN @v = 1 THEN SYSUTCDATETIME() END, Remarks = COALESCE(@r, Remarks)
     WHERE LoanAdviceId = @id`,
    { v: verified, u: ctx.userId, r: remarks, id: adviceId },
  );
  if (!n) throw notFound('Payment advice');
  await audit(d, ctx, verified ? 'LOAN_ADVICE_VERIFIED' : 'LOAN_ADVICE_UNVERIFIED', 'LoanAdvice', adviceId, { reason: remarks });
}

