/* =====================================================================
   005 - Master data seed
   (The first Admin user is created by the application setup script so
    that its password is hashed with bcrypt.)
   ===================================================================== */

/* ---------- Roles ---------------------------------------------------- */
INSERT INTO security.Roles (RoleCode, RoleName, Description) VALUES
 (N'ADMIN',      N'Admin',              N'Full system access'),
 (N'CASHIER',    N'Cashier',            N'Fee collection, receipts, refund requests, day closing'),
 (N'ACCOUNTANT', N'Accountant',         N'Cashier functions plus consultant payment requests and charges'),
 (N'PRINCIPAL',  N'Principal',          N'Read-only management access'),
 (N'MD',         N'MD / Director',      N'Management reports and high-value approvals'),
 (N'AUDITOR',    N'Auditor',            N'Read-only access to transactions, ledgers and audit logs');

/* ---------- Permissions ---------------------------------------------- */
INSERT INTO security.Permissions (PermissionCode, PermissionName, ModuleName) VALUES
 (N'DASHBOARD_ADMIN',              N'View admin dashboard',                     N'Dashboard'),
 (N'DASHBOARD_MANAGEMENT',         N'View management (principal) dashboard',    N'Dashboard'),
 (N'DASHBOARD_CASHIER',            N'View cashier dashboard',                   N'Dashboard'),
 (N'STUDENT_VIEW',                 N'Search and view students',                 N'Students'),
 (N'STUDENT_CREATE',               N'Create students',                          N'Students'),
 (N'STUDENT_EDIT',                 N'Edit student details',                     N'Students'),
 (N'ADMISSION_VIEW',               N'View admissions',                          N'Admissions'),
 (N'ADMISSION_CREATE',             N'Create admissions',                        N'Admissions'),
 (N'ADMISSION_CANCEL',             N'Cancel admissions',                        N'Admissions'),
 (N'MASTER_VIEW',                  N'View master data',                         N'Masters'),
 (N'MASTER_EDIT',                  N'Edit courses, batches, years, fee heads, modes', N'Masters'),
 (N'FEE_STRUCTURE_EDIT',           N'Edit fee structures',                      N'Fees'),
 (N'CHARGE_CREATE',                N'Generate / add student charges',           N'Fees'),
 (N'PAYMENT_VIEW',                 N'View payments and receipts',               N'Payments'),
 (N'PAYMENT_CREATE',               N'Receive payments',                         N'Payments'),
 (N'PAYMENT_REVERSE',              N'Request payment / charge reversal',        N'Payments'),
 (N'CHEQUE_UPDATE',                N'Update cheque status',                     N'Payments'),
 (N'ADVANCE_APPLY',                N'Apply advance to charges',                 N'Payments'),
 (N'DISCOUNT_REQUEST',             N'Request discounts / concessions',          N'Fees'),
 (N'ADJUSTMENT_REQUEST',           N'Request waivers / adjustments',            N'Fees'),
 (N'REFUND_REQUEST',               N'Submit refund requests',                   N'Refunds'),
 (N'REFUND_PROCESS',               N'Process (pay out) approved refunds',       N'Refunds'),
 (N'APPROVAL_VIEW',                N'View approval inbox and history',          N'Approvals'),
 (N'APPROVAL_ACT',                 N'Approve / reject (as allowed by rules)',   N'Approvals'),
 (N'CONSULTANT_VIEW',              N'View consultants',                         N'Consultants'),
 (N'CONSULTANT_EDIT',              N'Create / edit consultants and rates',      N'Consultants'),
 (N'CONSULTANT_FINANCE_VIEW',      N'View consultant ledgers and costs',        N'Consultants'),
 (N'CONSULTANT_PAYABLE_CREATE',    N'Create consultant payables',               N'Consultants'),
 (N'CONSULTANT_PAYMENT_CREATE',    N'Submit consultant payment requests',       N'Consultants'),
 (N'CONSULTANT_PAYMENT_PROCESS',   N'Process approved consultant payments',     N'Consultants'),
 (N'CONSULTANT_PAYMENT_OVERRIDE',  N'Override fully-settled payable warning',   N'Consultants'),
 (N'CONSULTANT_RECOVERY_CREATE',   N'Record consultant recoveries',             N'Consultants'),
 (N'CONSULTANT_REVIEW',            N'Review cancelled-admission consultant cases', N'Consultants'),
 (N'REPORT_VIEW',                  N'View college-wide reports',                N'Reports'),
 (N'REPORT_OWN',                   N'View own collection reports',              N'Reports'),
 (N'REPORT_EXPORT',                N'Export reports',                           N'Reports'),
 (N'DAYCLOSE_SUBMIT',              N'Submit cashier day closing',               N'Cashier'),
 (N'DAYCLOSE_VERIFY',              N'Verify cashier day closing',               N'Cashier'),
 (N'USER_MANAGE',                  N'Manage users, roles and permissions',      N'Administration'),
 (N'SETTINGS_MANAGE',              N'Manage system settings and approval rules',N'Administration'),
 (N'AUDIT_VIEW',                   N'View audit logs',                          N'Administration');

/* ADMIN: everything */
INSERT INTO security.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId FROM security.Roles r CROSS JOIN security.Permissions p WHERE r.RoleCode = N'ADMIN';

/* CASHIER */
INSERT INTO security.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId FROM security.Roles r JOIN security.Permissions p ON p.PermissionCode IN (
    N'DASHBOARD_CASHIER', N'STUDENT_VIEW', N'STUDENT_CREATE', N'ADMISSION_VIEW', N'MASTER_VIEW',
    N'PAYMENT_VIEW', N'PAYMENT_CREATE', N'CHEQUE_UPDATE', N'ADVANCE_APPLY', N'DISCOUNT_REQUEST',
    N'REFUND_REQUEST', N'REFUND_PROCESS', N'REPORT_OWN', N'DAYCLOSE_SUBMIT')
WHERE r.RoleCode = N'CASHIER';

/* ACCOUNTANT */
INSERT INTO security.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId FROM security.Roles r JOIN security.Permissions p ON p.PermissionCode IN (
    N'DASHBOARD_CASHIER', N'STUDENT_VIEW', N'STUDENT_CREATE', N'STUDENT_EDIT', N'ADMISSION_VIEW', N'ADMISSION_CREATE',
    N'MASTER_VIEW', N'CHARGE_CREATE', N'PAYMENT_VIEW', N'PAYMENT_CREATE', N'PAYMENT_REVERSE', N'CHEQUE_UPDATE',
    N'ADVANCE_APPLY', N'DISCOUNT_REQUEST', N'ADJUSTMENT_REQUEST', N'REFUND_REQUEST', N'REFUND_PROCESS',
    N'CONSULTANT_VIEW', N'CONSULTANT_FINANCE_VIEW', N'CONSULTANT_PAYABLE_CREATE', N'CONSULTANT_PAYMENT_CREATE',
    N'CONSULTANT_PAYMENT_PROCESS', N'CONSULTANT_RECOVERY_CREATE', N'REPORT_OWN', N'DAYCLOSE_SUBMIT', N'APPROVAL_VIEW')
WHERE r.RoleCode = N'ACCOUNTANT';

/* PRINCIPAL: read-only management */
INSERT INTO security.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId FROM security.Roles r JOIN security.Permissions p ON p.PermissionCode IN (
    N'DASHBOARD_MANAGEMENT', N'STUDENT_VIEW', N'ADMISSION_VIEW', N'MASTER_VIEW', N'PAYMENT_VIEW',
    N'CONSULTANT_VIEW', N'CONSULTANT_FINANCE_VIEW', N'REPORT_VIEW', N'REPORT_EXPORT', N'APPROVAL_VIEW')
WHERE r.RoleCode = N'PRINCIPAL';

/* MD: management + approvals */
INSERT INTO security.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId FROM security.Roles r JOIN security.Permissions p ON p.PermissionCode IN (
    N'DASHBOARD_MANAGEMENT', N'STUDENT_VIEW', N'ADMISSION_VIEW', N'MASTER_VIEW', N'PAYMENT_VIEW',
    N'CONSULTANT_VIEW', N'CONSULTANT_FINANCE_VIEW', N'REPORT_VIEW', N'REPORT_EXPORT',
    N'APPROVAL_VIEW', N'APPROVAL_ACT', N'CONSULTANT_PAYMENT_OVERRIDE', N'AUDIT_VIEW')
WHERE r.RoleCode = N'MD';

/* AUDITOR: read-only incl. audit */
INSERT INTO security.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId FROM security.Roles r JOIN security.Permissions p ON p.PermissionCode IN (
    N'DASHBOARD_MANAGEMENT', N'STUDENT_VIEW', N'ADMISSION_VIEW', N'MASTER_VIEW', N'PAYMENT_VIEW',
    N'CONSULTANT_VIEW', N'CONSULTANT_FINANCE_VIEW', N'REPORT_VIEW', N'REPORT_EXPORT', N'APPROVAL_VIEW', N'AUDIT_VIEW')
WHERE r.RoleCode = N'AUDITOR';

/* ---------- Academic years ------------------------------------------- */
INSERT INTO academic.AcademicYears (AcademicYearCode, StartYear, StartDate, EndDate, IsCurrent) VALUES
 (N'2024-25', 2024, '2024-07-01', '2025-06-30', 0),
 (N'2025-26', 2025, '2025-07-01', '2026-06-30', 0),
 (N'2026-27', 2026, '2026-07-01', '2027-06-30', 1),
 (N'2027-28', 2027, '2027-07-01', '2028-06-30', 0),
 (N'2028-29', 2028, '2028-07-01', '2029-06-30', 0),
 (N'2029-30', 2029, '2029-07-01', '2030-06-30', 0);

/* ---------- Courses and fee periods ---------------------------------- */
INSERT INTO academic.Courses (CourseCode, CourseName, DurationYears, TotalSemesters, FeeCycleType, DefaultBatchCapacity) VALUES
 (N'ANM',  N'ANM (Auxiliary Nurse Midwifery)',         2, NULL, N'YEARLY',   60),
 (N'GNM',  N'GNM (General Nursing and Midwifery)',     3, NULL, N'YEARLY',   60),
 (N'BSCN', N'B.Sc Nursing',                            4, 8,    N'SEMESTER', 60);

INSERT INTO academic.FeePeriods (CourseId, PeriodType, PeriodNumber, PeriodName)
SELECT c.CourseId, N'YEAR', n.n, N'Year ' + CAST(n.n AS NVARCHAR(2))
FROM academic.Courses c
JOIN (VALUES (1),(2),(3),(4),(5),(6)) n(n) ON n.n <= c.DurationYears
WHERE c.FeeCycleType = N'YEARLY';

INSERT INTO academic.FeePeriods (CourseId, PeriodType, PeriodNumber, PeriodName)
SELECT c.CourseId, N'SEMESTER', n.n, N'Semester ' + CAST(n.n AS NVARCHAR(2))
FROM academic.Courses c
JOIN (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12)) n(n) ON n.n <= c.TotalSemesters
WHERE c.FeeCycleType = N'SEMESTER';

/* One-time period for admission-time fees (registration, caution money...) */
INSERT INTO academic.FeePeriods (CourseId, PeriodType, PeriodNumber, PeriodName)
SELECT CourseId, N'ONE_TIME', 0, N'Admission (one-time)' FROM academic.Courses;

/* ---------- Fee heads ------------------------------------------------ */
INSERT INTO finance.FeeHeads (FeeHeadCode, FeeHeadName, FeeCategory, IsRefundable, IsSecurityDeposit, DisplayOrder) VALUES
 (N'ADMISSION',    N'Admission Fee',             N'ONE_TIME',  0, 0, 10),
 (N'REGISTRATION', N'Registration Fee',          N'ONE_TIME',  0, 0, 20),
 (N'COLLEGE',      N'College Fee',               N'ACADEMIC',  0, 0, 30),
 (N'TUITION',      N'Tuition Fee',               N'ACADEMIC',  0, 0, 40),
 (N'DEVELOPMENT',  N'Development Fee',           N'ACADEMIC',  0, 0, 50),
 (N'EXAM',         N'Examination Fee',           N'EXAM',      0, 0, 60),
 (N'PRACTICAL',    N'Practical Examination Fee', N'EXAM',      0, 0, 70),
 (N'LIBRARY',      N'Library Fee',               N'ACADEMIC',  0, 0, 80),
 (N'LAB',          N'Laboratory Fee',            N'ACADEMIC',  0, 0, 90),
 (N'CLINICAL',     N'Clinical Fee',              N'ACADEMIC',  0, 0, 100),
 (N'HOSTEL',       N'Hostel Fee',                N'HOSTEL',    0, 0, 110),
 (N'TRANSPORT',    N'Transportation Fee',        N'TRANSPORT', 0, 0, 120),
 (N'UNIFORM',      N'Uniform Fee',               N'OTHER',     0, 0, 130),
 (N'CAUTION',      N'Caution Money',             N'DEPOSIT',   1, 1, 140),
 (N'SECURITY',     N'Security Deposit',          N'DEPOSIT',   1, 1, 150),
 (N'LATE_FEE',     N'Late Fee',                  N'PENALTY',   0, 0, 160),
 (N'CANCELLATION', N'Cancellation Charge',       N'PENALTY',   0, 0, 170),
 (N'MISC',         N'Miscellaneous Fee',         N'OTHER',     0, 0, 180);

/* ---------- Payment modes -------------------------------------------- */
INSERT INTO finance.PaymentModes (PaymentModeCode, PaymentModeName, RequiresReference, RequiresBank, RequiresChequeDetails, IsCash) VALUES
 (N'CASH',          N'Cash',          0, 0, 0, 1),
 (N'UPI',           N'UPI',           1, 0, 0, 0),
 (N'BANK_TRANSFER', N'Bank Transfer', 1, 1, 0, 0),
 (N'NEFT',          N'NEFT',          1, 1, 0, 0),
 (N'RTGS',          N'RTGS',          1, 1, 0, 0),
 (N'IMPS',          N'IMPS',          1, 0, 0, 0),
 (N'CHEQUE',        N'Cheque',        0, 1, 1, 0),
 (N'CARD',          N'Card',          1, 0, 0, 0),
 (N'OTHER',         N'Other',         1, 0, 0, 0);

/* ---------- Document numbering --------------------------------------- */
INSERT INTO dbo.DocumentTypes (DocumentType, Prefix, Separator, IncludeYear, NumberWidth) VALUES
 (N'STUDENT',            N'AHS-STU-', N'-', 0, 6),
 (N'ADMISSION',          N'AHS-ADM-', N'-', 1, 6),
 (N'RECEIPT',            N'AHS-REC-', N'-', 1, 6),
 (N'REFUND',             N'AHS-REF-', N'-', 1, 6),
 (N'CONSULTANT',         N'AHS-CON-', N'-', 0, 6),
 (N'CONSULTANT_PAYMENT', N'AHS-CP-',  N'-', 1, 6);

INSERT INTO dbo.DocumentSequences (DocumentType, FinancialYear, Prefix, LastNumber)
SELECT DocumentType, 0, Prefix, 0 FROM dbo.DocumentTypes WHERE IncludeYear = 0;

/* ---------- System settings ------------------------------------------ */
INSERT INTO dbo.SystemSettings (SettingKey, SettingValue, Description) VALUES
 (N'CollegeName',                     N'AHS Nursing College',                N'Printed on receipts and statements'),
 (N'CollegeAddress',                  N'Samastipur, Bihar',                  N'Printed on receipts and statements'),
 (N'CollegePhone',                    N'',                                   N'Printed on receipts'),
 (N'CollegeLogoUrl',                  N'',                                   N'Logo URL for receipts (optional)'),
 (N'DefaultPaymentAllocationMethod',  N'FIFO',                               N'FIFO = oldest outstanding charge first; MANUAL = accountant allocates'),
 (N'PaymentRequiresApproval',         N'false',                              N'true = cashier payments wait for approval before posting'),
 (N'AutoApplyAdvance',                N'true',                               N'Apply available advance automatically when new charges are generated'),
 (N'AllowSelfApproval',               N'false',                              N'Allow a requester to approve their own transaction'),
 (N'AutoCreateConsultantPayable',     N'true',                               N'Create a consultant payable request automatically on admission'),
 (N'SessionTimeoutMinutes',           N'30',                                 N'Idle session timeout'),
 (N'MaxFailedLogins',                 N'5',                                  N'Failed logins before temporary lock'),
 (N'LockoutMinutes',                  N'15',                                 N'Lock duration after too many failed logins');

/* ---------- Approval rules (configurable in the app) ------------------ */
DECLARE @Admin INT = (SELECT RoleId FROM security.Roles WHERE RoleCode = N'ADMIN');
DECLARE @MD INT = (SELECT RoleId FROM security.Roles WHERE RoleCode = N'MD');
INSERT INTO workflow.ApprovalRules (TransactionType, MinimumAmount, MaximumAmount, ApprovalLevel, RoleId, IsActive) VALUES
 (N'REFUND',              0,         25000,  1, @Admin, 1),
 (N'REFUND',              25000.01,  NULL,   1, @Admin, 1),
 (N'REFUND',              25000.01,  NULL,   2, @MD,    0),   -- enable once an MD user exists
 (N'DISCOUNT',            NULL,      NULL,   1, @Admin, 1),
 (N'ADJUSTMENT',          NULL,      NULL,   1, @Admin, 1),
 (N'REVERSAL',            NULL,      NULL,   1, @Admin, 1),
 (N'CONSULTANT_PAYABLE',  NULL,      NULL,   1, @Admin, 1),
 (N'CONSULTANT_PAYMENT',  NULL,      NULL,   1, @Admin, 1),
 (N'CONSULTANT_RECOVERY', NULL,      NULL,   1, @Admin, 1),
 (N'PAYMENT',             NULL,      NULL,   1, @Admin, 1);  -- used only when PaymentRequiresApproval = true

/* ---------- Status lookup (for UI; DB enforces via CHECK) ------------- */
INSERT INTO dbo.StatusTypes (Category, StatusCode, StatusName, SortOrder) VALUES
 (N'STUDENT', N'APPLICANT', N'Applicant', 1), (N'STUDENT', N'ADMISSION_PENDING', N'Admission Pending', 2),
 (N'STUDENT', N'ADMITTED', N'Admitted', 3), (N'STUDENT', N'ACTIVE', N'Active', 4), (N'STUDENT', N'ON_LEAVE', N'On Leave', 5),
 (N'STUDENT', N'SUSPENDED', N'Suspended', 6), (N'STUDENT', N'DISCONTINUED', N'Discontinued', 7),
 (N'STUDENT', N'CANCELLED', N'Cancelled', 8), (N'STUDENT', N'PASSED', N'Passed', 9),
 (N'STUDENT', N'TRANSFERRED', N'Transferred', 10), (N'STUDENT', N'ALUMNI', N'Alumni', 11),
 (N'ADMISSION', N'PENDING', N'Pending', 1), (N'ADMISSION', N'ACTIVE', N'Active', 2), (N'ADMISSION', N'CANCELLED', N'Cancelled', 3),
 (N'ADMISSION', N'COMPLETED', N'Completed', 4), (N'ADMISSION', N'TRANSFERRED', N'Transferred', 5), (N'ADMISSION', N'SUSPENDED', N'Suspended', 6),
 (N'PAYMENT', N'DRAFT', N'Draft', 1), (N'PAYMENT', N'PENDING_APPROVAL', N'Pending Approval', 2), (N'PAYMENT', N'APPROVED', N'Approved', 3),
 (N'PAYMENT', N'POSTED', N'Posted', 4), (N'PAYMENT', N'REJECTED', N'Rejected', 5), (N'PAYMENT', N'REVERSED', N'Reversed', 6),
 (N'PAYMENT', N'CANCELLED', N'Cancelled', 7),
 (N'APPROVAL', N'PENDING_APPROVAL', N'Pending Approval', 1), (N'APPROVAL', N'APPROVED', N'Approved', 2),
 (N'APPROVAL', N'REJECTED', N'Rejected', 3), (N'APPROVAL', N'RETURNED', N'Returned', 4), (N'APPROVAL', N'CANCELLED', N'Cancelled', 5),
 (N'REFUND', N'PENDING_APPROVAL', N'Pending Approval', 1), (N'REFUND', N'APPROVED', N'Approved', 2),
 (N'REFUND', N'PROCESSED', N'Processed', 3), (N'REFUND', N'REJECTED', N'Rejected', 4), (N'REFUND', N'CANCELLED', N'Cancelled', 5),
 (N'CHEQUE', N'RECEIVED', N'Received', 1), (N'CHEQUE', N'DEPOSITED', N'Deposited', 2), (N'CHEQUE', N'CLEARED', N'Cleared', 3),
 (N'CHEQUE', N'BOUNCED', N'Bounced', 4), (N'CHEQUE', N'CANCELLED', N'Cancelled', 5),
 (N'SEAT', N'AVAILABLE', N'Available', 1), (N'SEAT', N'RESERVED', N'Reserved', 2), (N'SEAT', N'ADMISSION_PENDING', N'Admission Pending', 3),
 (N'SEAT', N'OCCUPIED', N'Occupied', 4), (N'SEAT', N'CANCELLED', N'Cancelled', 5), (N'SEAT', N'RELEASED', N'Released', 6),
 (N'SEAT', N'REALLOCATED', N'Reallocated', 7);
GO
