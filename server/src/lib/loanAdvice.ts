/* Reads a lender's payment advice - e.g. the BSEFCL e-mail
   "Bihar Student Credit Card - Tuition Fees Details" - into rows.

   Columns of the BSEFCL advice:
     Applicant Name | Applicant's Father Name | Course | Amount Paid | Date Of Payment |
     Purpose Of Payment | UTR Details | Account Holders Name (college a/c no.) |
     Beneficiary IFSC Code | Beneficiary Name | Registration Id

   Works with text copied from the e-mail (tab separated) and with text
   extracted from the e-mail saved as PDF (no tabs, cells wrapped over
   several lines) - rows are recognised by the fixed pattern
   amount, date, purpose, UTR, account no., IFSC, beneficiary, registration id. */

export interface AdviceRow {
  lineNo: number;
  applicantName: string | null;
  fatherName: string | null;
  course: string | null;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  purpose: string | null;
  utr: string;
  accountNo: string | null;
  ifsc: string | null;
  beneficiaryName: string | null;
  registrationNumber: string;
}

const MONTHS: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

function toIsoDate(raw: string): string | null {
  const s = raw.replace(/\s+/g, '').toUpperCase();
  let m = /^(\d{1,2})[-/.]?([A-Z]{3})[-/.]?(\d{2}|\d{4})$/.exec(s);
  if (m && MONTHS[m[2]]) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${y}-${MONTHS[m[2]]}-${m[1].padStart(2, '0')}`;
  }
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(s);
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? s : null;
}

const HEADER_RE = /Applicant\s*Name[\s\S]*?Registration\s*Id/i;
const DATE_SRC = String.raw`\d{1,2}-[A-Za-z]{3}-?\s?\d{2,4}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}`;
/* amount  date  purpose  UTR  account  IFSC  beneficiary  registration id */
const ROW_RE = new RegExp(
  String.raw`(\d{2,9}(?:\.\d{1,2})?)\s+(${DATE_SRC})\s+(.*?)\s*\b([A-Z0-9]{10,22})\s+(\d{9,20})\s+([A-Z]{4}0[A-Z0-9]{6})\s+(.*?)\s*\b(\d{5,10})(?=\s|$)`,
  'g',
);
/* most specific first; abbreviations only as whole words (so "RAMAN MAHTO" is not read as "ANM") */
const COURSE_RES = [
  /General\s+Nursing\s+(?:and\s+)?Midwifery\s*(?:\(\s*G\.?\s?N\.?\s?M\.?\s*\))?/i,
  /Auxiliary\s+Nurse\w*\s+(?:and\s+)?Midwi\w*\s*(?:\(\s*A\.?\s?N\.?\s?M\.?\s*\))?/i,
  /Post\s*Basic\s+B\.?\s?Sc\.?\s*\(?\s*Nursing\s*\)?/i,
  /B\.?\s?Sc\.?\s*\(?\s*Nursing\s*\)?/i,
  /\b(?:G\.N\.M\.?|GNM|A\.N\.M\.?|ANM|D\.?\s?Pharm\w*|B\.?\s?Pharm\w*)(?=\s|$)/,
];

function tidy(s: string | null | undefined): string | null {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  return t || null;
}

/** Tab-separated rows (copied from the e-mail table or an Excel sheet). */
function parseTabbed(text: string): AdviceRow[] {
  const rows: AdviceRow[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const c = line.split('\t').map((x) => x.trim());
    if (c.length < 11) return;
    const amount = Number(c[3].replace(/[,₹\s]/g, ''));
    const date = toIsoDate(c[4]);
    if (!Number.isFinite(amount) || amount <= 0 || !date || !/^\d{5,10}$/.test(c[10])) return;
    rows.push({
      lineNo: rows.length + 1,
      applicantName: tidy(c[0]),
      fatherName: tidy(c[1]),
      course: tidy(c[2]),
      amount,
      paymentDate: date,
      purpose: tidy(c[5]),
      utr: c[6].replace(/\s+/g, ''),
      accountNo: tidy(c[7]),
      ifsc: tidy(c[8]),
      beneficiaryName: tidy(c[9]),
      registrationNumber: c[10],
    });
    void i;
  });
  return rows;
}

/** Free text (PDF): split each record's leading "name father course" blob. */
function parseFree(text: string): AdviceRow[] {
  let body = text.replace(/ /g, ' ');
  const h = HEADER_RE.exec(body);
  if (h) body = body.slice(h.index + h[0].length);
  body = body.replace(/\s+/g, ' ');
  const rows: AdviceRow[] = [];
  let last = 0;
  for (const m of body.matchAll(ROW_RE)) {
    /* a purpose cell wrapped across a page break leaves "Hostel Expenses" in front of the next name */
    const lead = body.slice(last, m.index).trim().replace(/^((tuition|fees|including|hostel|expenses)\b\s*)+/i, '');
    last = (m.index ?? 0) + m[0].length;
    const date = toIsoDate(m[2]);
    if (!date) continue;
    let names = lead;
    let course: string | null = null;
    const cm = COURSE_RES.map((re) => re.exec(lead)).find(Boolean) ?? null;
    if (cm) {
      course = tidy(cm[0]);
      names = (lead.slice(0, cm.index) + ' ' + lead.slice((cm.index ?? 0) + cm[0].length)).trim();
    }
    rows.push({
      lineNo: rows.length + 1,
      applicantName: tidy(names), // name + father name (cannot be split reliably without tabs)
      fatherName: null,
      course,
      amount: Number(m[1]),
      paymentDate: date,
      purpose: tidy(m[3]),
      utr: m[4],
      accountNo: m[5],
      ifsc: m[6],
      beneficiaryName: tidy(m[7]),
      registrationNumber: m[8],
    });
  }
  return rows;
}

export function parseAdviceText(text: string): AdviceRow[] {
  const tabbed = parseTabbed(text);
  return tabbed.length ? tabbed : parseFree(text);
}

/** Text of a PDF (the advice e-mail printed / saved as PDF). */
export async function pdfToText(data: Uint8Array): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({ data, useSystemFonts: true });
  const doc = await task.promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it: any) => ('str' in it ? it.str : '')).join(' '));
  }
  await task.destroy();
  return pages.join('\n');
}

/** Map the course text of the advice to one of our course codes. */
export function guessCourseCode(course: string | null): string | null {
  if (!course) return null;
  const c = course.toUpperCase().replace(/[^A-Z]/g, '');
  if (c.includes('BSC') || c.includes('BSCNURSING')) return 'BSCN';
  if (c.includes('GNM') || c.includes('GENERALNURSING')) return 'GNM';
  if (c.includes('ANM') || c.includes('AUXILIARY')) return 'ANM';
  return null;
}
