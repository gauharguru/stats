# AHS Nursing College — Student Fee, Admission & Financial Management System

A web-based system for student admissions, fee structures, fee collection and receipts, ledgers, discounts, advances, refunds, cancellations and replacement admissions, educational consultants, approval workflows, cashier day closing, reports and a full audit trail. It is built from the two design documents: **SFM – Requirement Analysis (SRS)** and **SFM – Database Architecture**.

The system is designed as a **transaction-based ledger**, not a receipt book. It never stores a "balance". Every figure (dues, advance, consultant outstanding) is calculated from the underlying charges, payments, allocations, discounts, waivers, refunds and reversals, so the database can always explain *why* a student owes ₹40,000.

---

## Contents

| Folder | What it is |
|---|---|
| `database/migrations/` | SQL Server scripts: tables (all 40+ from the design), integrity triggers, reporting views, stored procedures, master data seed |
| `server/` | REST API: Node.js 20+, TypeScript, Express, `mssql` driver. Business rules, approvals, security, audit |
| `web/` | Web application: React + Vite. Cashier, accountant, principal, admin and MD screens |
| `server/test/` | Automated acceptance tests (SRS §87) that run against a real SQL Server |

## Quick start (development)

Requirements: **Node.js 20+** and **SQL Server 2019/2022** (Express edition is fine for one college). For a throw-away local server you can use Docker: `docker compose up -d`.

```bash
npm run install:all                 # install server + web packages
cp server/.env.example server/.env  # then edit DB_SERVER / DB_USER / DB_PASSWORD / JWT_SECRET
npm run db:setup                    # creates the database, applies all scripts, creates the admin user
npm run db:demo                     # OPTIONAL: sample batches, fee structure, students and payments for training
npm run dev:api                     # API on http://localhost:4000
npm run dev:web                     # web app on http://localhost:5173
```

First login: user **admin**, password from `ADMIN_PASSWORD` in `.env` (default `Admin@12345`). You must change it at first login. The demo data adds `cashier`, `accountant`, `principal` and `md` users, all with password `Demo@1234`.

## Production deployment (college server / Windows)

1. Install SQL Server 2022 (Express or Standard) and Node.js 20 LTS on the server.
2. Create a dedicated SQL login for the application (`db_owner` on the SFM database is enough; do **not** use `sa` in production) and put it in `server/.env`. Set a long random `JWT_SECRET` and `NODE_ENV=production`.
3. `npm run install:all && npm run build && npm run db:setup`
4. `npm start`. One Node process serves both the API and the web app on `PORT` (default 4000). Run it as a Windows service (e.g. with NSSM) or with PM2.
5. Put it behind HTTPS (IIS reverse proxy with a certificate, or Caddy/nginx). **HTTPS is mandatory** (SRS §60).
6. **Backups (mandatory, SRS §67):** create SQL Server Agent jobs (or Windows Task Scheduler + `sqlcmd` on Express) for a **daily** full backup plus transaction-log backups, copy the `.bak` files **off-site/cloud**, keep 30+ days, and **test a restore every month**. The Admin dashboard shows *Last successful backup* straight from SQL Server's backup history and turns red when there is none.

Running `npm run db:setup` again is safe. It only applies scripts that have not run yet (tracked in `dbo.SchemaMigrations`).

## Tests

```bash
npm test     # needs the SQL Server from .env; creates and drops a temporary database
```

22 end-to-end tests run through the REST API against a real SQL Server database. They cover all 14 mandatory SRS acceptance tests (normal / multiple payments, multiple fee heads, advance, discount, refund, cancellation, replacement on the same seat, consultant ledger, partial consultant payments, duplicate-payment override, approval, mandatory rejection reason, audit of reversals). They also check concurrent receipt numbering, allocation limits, duplicate UTR warning, delete/edit protection at SQL level, role-based access, cashier day closing and ledger reconciliation.

---

## How the main rules are implemented

**Never delete, never overwrite (SRS §58, §89).** SQL Server triggers block `DELETE` on every financial, admission, workflow and audit table, even for someone connected directly with SSMS. Posted payments, allocations and audit entries cannot be edited. Corrections are made with reversals, waivers, discounts or refunds, each with its own approval.

**Three-layer model (SRS §14).** *Fee structure* (what the college intends to charge) → *student charges* (what was actually charged, created from the structure per fee period) → *payments* (money received), linked by *payment allocations*. Changing a fee structure line that already has charges creates a new version; charges already raised never change.

**Academic years (SRS §6-7).** Fee periods are Year 1…n or Semester 1…n per course. The academic year of a period is derived from the batch start year (B.Sc 2026 batch: Sem 1-2 → 2026-27, Sem 3-4 → 2027-28 …). Courses, batches, capacities and fee heads are all configurable; nothing is hard-coded to 60 students or to ANM/GNM/B.Sc.

**Receipt numbers (SRS §43, DB §43/58).** Generated inside SQL Server (`dbo.usp_NextDocumentNumber`) under a row lock. They are unique, sequential, gap-free and never reused, even with several cashiers working at the same moment (covered by a concurrency test). The format is configurable (default `AHS-REC-2026-000001`) and restarts every financial year (April).

**Payment allocation (SRS §18-20).** Allocation is automatic (oldest due first) or manual, set by admin and overridable per payment. Anything above the dues becomes an identifiable **advance**, which is applied automatically to the next charges (configurable) or refunded.

**Approval engine (SRS §22-26, §54-55, §73).** One generic engine handles refunds, discounts, waivers, reversals, consultant payables/payments/recoveries and, optionally, ordinary payments. Rules are configured in *Settings → Approval rules*: which transactions need approval, amount bands, how many levels, and which role approves each level. By default:
- the requester can never approve their own request, and one person cannot approve two levels (both configurable);
- a rejection reason is mandatory;
- if no active rule matches, the transaction is approved automatically.

The seed data includes a disabled rule "Refund > ₹25,000 → level 2 MD". Enable it once an MD user exists.

**Consultants (SRS §31-40).** The consultant is linked to the *admission*, not the student. Rates can be fixed, course-wise, batch-wise or student-specific; the most specific one wins. A payable is raised automatically at admission and goes for approval. Payments are raised against a payable. Remaining = approved − paid − in-process − set-off recoveries, so a second payment on a settled payable gives *"This consultant obligation has already been fully settled."* and needs the override permission plus a reason. Cancelling a student's admission never reverses consultant money automatically. It flags a **review** for the admin to decide (no recovery / recovery / adjustment).

**Security (SRS §60).** Passwords are bcrypt-hashed. After 5 failed logins the account is locked for 15 minutes. The admin's temporary password must be changed at first login. The session ends after 30 minutes idle. Every permission is checked on the server, not only hidden in the UI; for example, a cashier calling the due-report API directly gets 403. Exports are permission-controlled server-side. Every financial action is written to the audit log with user, time, IP, old/new values and reason.

## Accounting treatments to confirm with the college accountant

The SRS (§45) asks for these to be finalised with the accountant. The system currently works as follows, and each point is easy to change:

1. **Balance** = charges − discounts − waivers − payments + refunds − (fee refunded back on a refund). Positive means due from the student; negative means an advance held.
2. **Refund of fees already paid** (e.g. caution money, or refund on cancellation): select the fee head(s) being refunded. The refunded part of that fee is credited back, so it no longer counts as charged, and the cash goes out. A refund without fee heads can only come from an advance. This stops a refund being given for money that was never received.
3. **Cancellation before full payment (SRS §77):** the refund amount is never assumed. On cancellation, admin can (a) request a *cancellation waiver* of all unpaid fees (goes for approval), (b) add a *Cancellation Charge* fee head if one applies, and (c) request a refund of part of the fees paid. Whatever is paid and not refunded is the amount retained.
4. **Payment reversal / cheque bounce:** the receipt stays on record. An approved reversal adds a reversal line and the fees become due again. Marking a cheque *Bounced* raises the reversal request automatically.
5. **Consultant recovery:** *Money received back* reduces both what the consultant is entitled to and what they have been paid (net effect zero on outstanding). *Set off* reduces the entitlement, so the consultant owes the college and it is deducted from future payables.
6. **Collection reports** count posted payments on their payment date. Reversed payments drop out and are listed in the reversal report. *Net student collection* = gross − refunds. Consultant payments are shown separately and never netted against student collection (SRS §82).

## Screens (SRS §92)

- **Dashboards.** Admin, principal/MD (read-only management) and cashier (quick actions), shown according to role.
- **Students, admissions and seats.** Student list and profile; new admission (new or existing student, seat, source/consultant, automatic first-period charges); admission detail (fee-head summary, charges, payments, ledger with filters and export, discounts/waivers/refunds/reversals, cancellation, consultant review); printable student/guardian statement.
- **Payments.** Receive Payment (search → dues → mode-specific fields → allocation preview → receipt); printable receipt with amount in words, where reprints are counted and audited; payment register; cheque status; reversal request.
- **Refunds.** Request, approval, payout and history.
- **Consultants.** List, profile, rates, students, payables, payments, recoveries, ledger, printable statement.
- **Approvals.** Inbox, detail with the full transaction context, approval trail, history.
- **Reports.** Collection (date / mode / cashier / course / batch / fee head), net collection, due report, course/batch summary, discounts, waivers, reversals, seat/admission history with replacements, consultant outstanding, acquisition cost, cancelled-admission consultant report, consultant payments/recoveries, audit log, cashier closing. All can be exported (CSV opens in Excel) and printed / saved as PDF.
- **Setup.** Courses, batches and seats, bulk "generate semester charges for a batch", academic years, fee heads, payment modes, fee structure grid with copy-to-next-year, users, roles and permission matrix, system settings, approval rules, document numbering.

## Not in this version (planned for later phases, SRS §90 Phase 6)

Student/guardian portal, online payment gateway, SMS/WhatsApp/email notifications (in-app notifications are included; the other channels can plug into `server/src/services/notifications.ts`), native `.xlsx` export (CSV is used and opens directly in Excel), photo upload (the `PhotoPath` field exists), hostel module.
