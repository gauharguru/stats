/* =====================================================================
   AHS NURSING COLLEGE
   Student Fee, Admission & Financial Management System
   001 - Schemas and tables

   Conventions (see SFM - Database Architecture):
     * BIGINT IDENTITY keys for transactional tables, INT for small masters
     * DECIMAL(18,2) for money, DATE for business dates,
       DATETIME2(3) (UTC) for timestamps
     * Human readable numbers (StudentCode, ReceiptNumber ...) are separate
       unique business keys
     * Status columns are NVARCHAR with CHECK constraints; the allowed values
       are also listed in dbo.StatusTypes for the UI.
   ===================================================================== */

CREATE SCHEMA security;
GO
CREATE SCHEMA academic;
GO
CREATE SCHEMA admission;
GO
CREATE SCHEMA finance;
GO
CREATE SCHEMA consultant;
GO
CREATE SCHEMA workflow;
GO
CREATE SCHEMA reporting;
GO
CREATE SCHEMA audit;
GO

/* ---------------------------------------------------------------------
   SECURITY
   --------------------------------------------------------------------- */
CREATE TABLE security.Users (
    UserId              BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
    UserName            NVARCHAR(100) NOT NULL CONSTRAINT UQ_Users_UserName UNIQUE,
    PasswordHash        NVARCHAR(500) NOT NULL,
    FullName            NVARCHAR(150) NOT NULL,
    Email               NVARCHAR(200) NULL,
    Mobile              NVARCHAR(20)  NULL,
    IsActive            BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
    MustChangePassword  BIT NOT NULL CONSTRAINT DF_Users_MustChange DEFAULT (0),
    FailedLoginCount    INT NOT NULL CONSTRAINT DF_Users_Failed DEFAULT (0),
    LockedUntil         DATETIME2(3) NULL,
    LastLoginAt         DATETIME2(3) NULL,
    PasswordChangedAt   DATETIME2(3) NULL,
    CreatedAt           DATETIME2(3) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy           BIGINT NULL CONSTRAINT FK_Users_CreatedBy REFERENCES security.Users(UserId),
    UpdatedAt           DATETIME2(3) NULL,
    UpdatedBy           BIGINT NULL CONSTRAINT FK_Users_UpdatedBy REFERENCES security.Users(UserId)
);

CREATE TABLE security.Roles (
    RoleId      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Roles PRIMARY KEY,
    RoleCode    NVARCHAR(50)  NOT NULL CONSTRAINT UQ_Roles_Code UNIQUE,
    RoleName    NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500) NULL,
    IsActive    BIT NOT NULL CONSTRAINT DF_Roles_IsActive DEFAULT (1),
    CreatedAt   DATETIME2(3) NOT NULL CONSTRAINT DF_Roles_CreatedAt DEFAULT (SYSUTCDATETIME())
);

CREATE TABLE security.UserRoles (
    UserRoleId  BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_UserRoles PRIMARY KEY,
    UserId      BIGINT NOT NULL CONSTRAINT FK_UserRoles_User REFERENCES security.Users(UserId),
    RoleId      INT    NOT NULL CONSTRAINT FK_UserRoles_Role REFERENCES security.Roles(RoleId),
    AssignedAt  DATETIME2(3) NOT NULL CONSTRAINT DF_UserRoles_AssignedAt DEFAULT (SYSUTCDATETIME()),
    AssignedBy  BIGINT NULL CONSTRAINT FK_UserRoles_AssignedBy REFERENCES security.Users(UserId),
    IsActive    BIT NOT NULL CONSTRAINT DF_UserRoles_IsActive DEFAULT (1),
    CONSTRAINT UQ_UserRoles UNIQUE (UserId, RoleId)
);

CREATE TABLE security.Permissions (
    PermissionId    INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Permissions PRIMARY KEY,
    PermissionCode  NVARCHAR(100) NOT NULL CONSTRAINT UQ_Permissions_Code UNIQUE,
    PermissionName  NVARCHAR(150) NOT NULL,
    ModuleName      NVARCHAR(100) NOT NULL,
    Description     NVARCHAR(500) NULL
);

CREATE TABLE security.RolePermissions (
    RolePermissionId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RolePermissions PRIMARY KEY,
    RoleId           INT NOT NULL CONSTRAINT FK_RolePerm_Role REFERENCES security.Roles(RoleId),
    PermissionId     INT NOT NULL CONSTRAINT FK_RolePerm_Perm REFERENCES security.Permissions(PermissionId),
    GrantedAt        DATETIME2(3) NOT NULL CONSTRAINT DF_RolePerm_GrantedAt DEFAULT (SYSUTCDATETIME()),
    GrantedBy        BIGINT NULL CONSTRAINT FK_RolePerm_GrantedBy REFERENCES security.Users(UserId),
    CONSTRAINT UQ_RolePermissions UNIQUE (RoleId, PermissionId)
);

/* ---------------------------------------------------------------------
   ACADEMIC
   --------------------------------------------------------------------- */
CREATE TABLE academic.Courses (
    CourseId             INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Courses PRIMARY KEY,
    CourseCode           NVARCHAR(20)  NOT NULL CONSTRAINT UQ_Courses_Code UNIQUE,
    CourseName           NVARCHAR(100) NOT NULL,
    DurationYears        DECIMAL(4,2)  NOT NULL,
    TotalSemesters       INT NULL,
    FeeCycleType         NVARCHAR(20)  NOT NULL CONSTRAINT CK_Courses_FeeCycle CHECK (FeeCycleType IN (N'YEARLY', N'SEMESTER')),
    DefaultBatchCapacity INT NOT NULL CONSTRAINT DF_Courses_Capacity DEFAULT (60) CONSTRAINT CK_Courses_Capacity CHECK (DefaultBatchCapacity > 0),
    IsActive             BIT NOT NULL CONSTRAINT DF_Courses_IsActive DEFAULT (1),
    CreatedAt            DATETIME2(3) NOT NULL CONSTRAINT DF_Courses_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy            BIGINT NULL CONSTRAINT FK_Courses_CreatedBy REFERENCES security.Users(UserId),
    CONSTRAINT CK_Courses_Duration CHECK (DurationYears > 0)
);

CREATE TABLE academic.AcademicYears (
    AcademicYearId   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AcademicYears PRIMARY KEY,
    AcademicYearCode NVARCHAR(20) NOT NULL CONSTRAINT UQ_AcademicYears_Code UNIQUE,
    StartYear        INT  NOT NULL CONSTRAINT UQ_AcademicYears_StartYear UNIQUE,
    StartDate        DATE NOT NULL,
    EndDate          DATE NOT NULL,
    IsCurrent        BIT  NOT NULL CONSTRAINT DF_AY_IsCurrent DEFAULT (0),
    IsClosed         BIT  NOT NULL CONSTRAINT DF_AY_IsClosed DEFAULT (0),
    CreatedAt        DATETIME2(3) NOT NULL CONSTRAINT DF_AY_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_AY_Dates CHECK (EndDate > StartDate)
);
CREATE UNIQUE INDEX UX_AcademicYears_Current ON academic.AcademicYears(IsCurrent) WHERE IsCurrent = 1;

CREATE TABLE academic.Batches (
    BatchId        BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Batches PRIMARY KEY,
    CourseId       INT NOT NULL CONSTRAINT FK_Batches_Course REFERENCES academic.Courses(CourseId),
    BatchCode      NVARCHAR(50)  NOT NULL CONSTRAINT UQ_Batches_Code UNIQUE,
    BatchName      NVARCHAR(100) NOT NULL,
    StartYear      INT NOT NULL,
    EndYear        INT NOT NULL,
    IntakeCapacity INT NOT NULL CONSTRAINT CK_Batches_Capacity CHECK (IntakeCapacity > 0),
    Status         NVARCHAR(30) NOT NULL CONSTRAINT DF_Batches_Status DEFAULT (N'ACTIVE')
                   CONSTRAINT CK_Batches_Status CHECK (Status IN (N'PLANNED', N'ACTIVE', N'COMPLETED', N'CLOSED')),
    CreatedAt      DATETIME2(3) NOT NULL CONSTRAINT DF_Batches_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy      BIGINT NULL CONSTRAINT FK_Batches_CreatedBy REFERENCES security.Users(UserId),
    CONSTRAINT CK_Batches_Years CHECK (EndYear >= StartYear)
);
CREATE INDEX IX_Batches_Course ON academic.Batches(CourseId);

/* Fee periods are defined per course (Year 1..n or Semester 1..n).
   AcademicYearId is optional: when NULL the academic year is derived from
   the batch start year (Year k / Semester 2k-1, 2k -> StartYear + k - 1). */
CREATE TABLE academic.FeePeriods (
    FeePeriodId    BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_FeePeriods PRIMARY KEY,
    CourseId       INT NOT NULL CONSTRAINT FK_FeePeriods_Course REFERENCES academic.Courses(CourseId),
    AcademicYearId INT NULL CONSTRAINT FK_FeePeriods_AY REFERENCES academic.AcademicYears(AcademicYearId),
    PeriodType     NVARCHAR(20)  NOT NULL CONSTRAINT CK_FeePeriods_Type CHECK (PeriodType IN (N'YEAR', N'SEMESTER', N'ONE_TIME')),
    PeriodNumber   INT NOT NULL,
    PeriodName     NVARCHAR(100) NOT NULL,
    StartDate      DATE NULL,
    EndDate        DATE NULL,
    IsActive       BIT NOT NULL CONSTRAINT DF_FeePeriods_IsActive DEFAULT (1),
    CONSTRAINT UQ_FeePeriods UNIQUE (CourseId, PeriodType, PeriodNumber)
);

/* ---------------------------------------------------------------------
   CONSULTANT MASTER (created before admissions because of FK)
   --------------------------------------------------------------------- */
CREATE TABLE consultant.Consultants (
    ConsultantId     BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Consultants PRIMARY KEY,
    ConsultantCode   NVARCHAR(50)  NOT NULL CONSTRAINT UQ_Consultants_Code UNIQUE,
    ConsultantName   NVARCHAR(200) NOT NULL,
    OrganizationName NVARCHAR(200) NULL,
    ContactPerson    NVARCHAR(200) NULL,
    Mobile           NVARCHAR(20)  NOT NULL,
    Email            NVARCHAR(200) NULL,
    Address          NVARCHAR(500) NULL,
    PAN              NVARCHAR(20)  NULL,
    GSTIN            NVARCHAR(30)  NULL,
    BankName         NVARCHAR(150) NULL,
    AccountName      NVARCHAR(200) NULL,
    AccountNumber    NVARCHAR(50)  NULL,
    IFSC             NVARCHAR(20)  NULL,
    DefaultRate      DECIMAL(18,2) NULL CONSTRAINT CK_Consultants_DefaultRate CHECK (DefaultRate IS NULL OR DefaultRate >= 0),
    Status           NVARCHAR(30)  NOT NULL CONSTRAINT DF_Consultants_Status DEFAULT (N'ACTIVE')
                     CONSTRAINT CK_Consultants_Status CHECK (Status IN (N'ACTIVE', N'INACTIVE', N'BLOCKED')),
    Remarks          NVARCHAR(500) NULL,
    CreatedAt        DATETIME2(3) NOT NULL CONSTRAINT DF_Consultants_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy        BIGINT NULL CONSTRAINT FK_Consultants_CreatedBy REFERENCES security.Users(UserId),
    UpdatedAt        DATETIME2(3) NULL,
    UpdatedBy        BIGINT NULL CONSTRAINT FK_Consultants_UpdatedBy REFERENCES security.Users(UserId)
);
CREATE INDEX IX_Consultants_Name ON consultant.Consultants(ConsultantName);
CREATE INDEX IX_Consultants_Mobile ON consultant.Consultants(Mobile);

/* ---------------------------------------------------------------------
   ADMISSION
   --------------------------------------------------------------------- */
CREATE TABLE admission.Students (
    StudentId       BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Students PRIMARY KEY,
    StudentCode     NVARCHAR(50)  NOT NULL CONSTRAINT UQ_Students_Code UNIQUE,
    RollNumber      NVARCHAR(50)  NULL,
    UniversityRegNo NVARCHAR(50)  NULL,
    StudentName     NVARCHAR(200) NOT NULL,
    FatherName      NVARCHAR(200) NULL,
    MotherName      NVARCHAR(200) NULL,
    GuardianName    NVARCHAR(200) NULL,
    DateOfBirth     DATE NULL,
    Gender          NVARCHAR(20)  NULL,
    Mobile          NVARCHAR(20)  NULL,
    GuardianMobile  NVARCHAR(20)  NULL,
    Email           NVARCHAR(200) NULL,
    AddressLine1    NVARCHAR(250) NULL,
    AddressLine2    NVARCHAR(250) NULL,
    Village         NVARCHAR(150) NULL,
    District        NVARCHAR(100) NULL,
    State           NVARCHAR(100) NULL,
    PinCode         NVARCHAR(10)  NULL,
    PhotoPath       NVARCHAR(500) NULL,
    StudentStatus   NVARCHAR(30)  NOT NULL CONSTRAINT DF_Students_Status DEFAULT (N'ACTIVE')
                    CONSTRAINT CK_Students_Status CHECK (StudentStatus IN (N'APPLICANT', N'ADMISSION_PENDING', N'ADMITTED', N'ACTIVE',
                        N'ON_LEAVE', N'SUSPENDED', N'DISCONTINUED', N'CANCELLED', N'PASSED', N'TRANSFERRED', N'ALUMNI')),
    Remarks         NVARCHAR(500) NULL,
    CreatedAt       DATETIME2(3) NOT NULL CONSTRAINT DF_Students_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy       BIGINT NULL CONSTRAINT FK_Students_CreatedBy REFERENCES security.Users(UserId),
    UpdatedAt       DATETIME2(3) NULL,
    UpdatedBy       BIGINT NULL CONSTRAINT FK_Students_UpdatedBy REFERENCES security.Users(UserId)
);
CREATE INDEX IX_Students_Name ON admission.Students(StudentName);
CREATE INDEX IX_Students_Mobile ON admission.Students(Mobile);
CREATE INDEX IX_Students_Father ON admission.Students(FatherName);
CREATE UNIQUE INDEX UX_Students_RollNumber ON admission.Students(RollNumber) WHERE RollNumber IS NOT NULL;

CREATE TABLE admission.Seats (
    SeatId     BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Seats PRIMARY KEY,
    CourseId   INT NOT NULL CONSTRAINT FK_Seats_Course REFERENCES academic.Courses(CourseId),
    BatchId    BIGINT NOT NULL CONSTRAINT FK_Seats_Batch REFERENCES academic.Batches(BatchId),
    SeatNumber NVARCHAR(30) NOT NULL,
    SeatStatus NVARCHAR(30) NOT NULL CONSTRAINT DF_Seats_Status DEFAULT (N'AVAILABLE')
               CONSTRAINT CK_Seats_Status CHECK (SeatStatus IN (N'AVAILABLE', N'RESERVED', N'ADMISSION_PENDING', N'OCCUPIED',
                   N'CANCELLED', N'RELEASED', N'REALLOCATED')),
    CreatedAt  DATETIME2(3) NOT NULL CONSTRAINT DF_Seats_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_Seats UNIQUE (BatchId, SeatNumber)
);

CREATE TABLE admission.Admissions (
    AdmissionId             BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Admissions PRIMARY KEY,
    StudentId               BIGINT NOT NULL CONSTRAINT FK_Admissions_Student REFERENCES admission.Students(StudentId),
    AdmissionNumber         NVARCHAR(50) NOT NULL CONSTRAINT UQ_Admissions_Number UNIQUE,
    CourseId                INT NOT NULL CONSTRAINT FK_Admissions_Course REFERENCES academic.Courses(CourseId),
    BatchId                 BIGINT NOT NULL CONSTRAINT FK_Admissions_Batch REFERENCES academic.Batches(BatchId),
    AdmissionDate           DATE NOT NULL,
    AdmissionStatus         NVARCHAR(30) NOT NULL CONSTRAINT DF_Admissions_Status DEFAULT (N'ACTIVE')
                            CONSTRAINT CK_Admissions_Status CHECK (AdmissionStatus IN (N'PENDING', N'ACTIVE', N'CANCELLED',
                                N'COMPLETED', N'TRANSFERRED', N'SUSPENDED')),
    AdmissionSourceType     NVARCHAR(30) NOT NULL CONSTRAINT DF_Admissions_Source DEFAULT (N'DIRECT')
                            CONSTRAINT CK_Admissions_Source CHECK (AdmissionSourceType IN (N'DIRECT', N'CONSULTANT', N'REFERRAL', N'OTHER')),
    ConsultantId            BIGINT NULL CONSTRAINT FK_Admissions_Consultant REFERENCES consultant.Consultants(ConsultantId),
    ReferralName            NVARCHAR(200) NULL,
    SeatId                  BIGINT NULL CONSTRAINT FK_Admissions_Seat REFERENCES admission.Seats(SeatId),
    ReplacesAdmissionId     BIGINT NULL CONSTRAINT FK_Admissions_Replaces REFERENCES admission.Admissions(AdmissionId),
    CurrentAcademicYearId   INT NULL CONSTRAINT FK_Admissions_AY REFERENCES academic.AcademicYears(AcademicYearId),
    CurrentFeePeriodId      BIGINT NULL CONSTRAINT FK_Admissions_FeePeriod REFERENCES academic.FeePeriods(FeePeriodId),
    CancellationDate        DATE NULL,
    CancellationReason      NVARCHAR(500) NULL,
    CancelledBy             BIGINT NULL CONSTRAINT FK_Admissions_CancelledBy REFERENCES security.Users(UserId),
    RefundRequired          BIT NULL,
    SeatReleased            BIT NULL,
    ConsultantReviewStatus  NVARCHAR(30) NULL
                            CONSTRAINT CK_Admissions_ConsReview CHECK (ConsultantReviewStatus IS NULL OR ConsultantReviewStatus IN
                                (N'REQUIRED', N'NO_RECOVERY', N'RECOVERY_RECORDED', N'ADJUSTED')),
    Remarks                 NVARCHAR(500) NULL,
    CreatedAt               DATETIME2(3) NOT NULL CONSTRAINT DF_Admissions_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy               BIGINT NULL CONSTRAINT FK_Admissions_CreatedBy REFERENCES security.Users(UserId),
    UpdatedAt               DATETIME2(3) NULL,
    UpdatedBy               BIGINT NULL CONSTRAINT FK_Admissions_UpdatedBy REFERENCES security.Users(UserId),
    CONSTRAINT CK_Admissions_ConsultantRequired CHECK (AdmissionSourceType <> N'CONSULTANT' OR ConsultantId IS NOT NULL),
    CONSTRAINT CK_Admissions_Cancellation CHECK (AdmissionStatus <> N'CANCELLED' OR (CancellationDate IS NOT NULL AND CancellationReason IS NOT NULL))
);
CREATE INDEX IX_Admissions_Student ON admission.Admissions(StudentId);
CREATE INDEX IX_Admissions_Course ON admission.Admissions(CourseId);
CREATE INDEX IX_Admissions_Batch ON admission.Admissions(BatchId);
CREATE INDEX IX_Admissions_Status ON admission.Admissions(AdmissionStatus);
CREATE INDEX IX_Admissions_Consultant ON admission.Admissions(ConsultantId);

CREATE TABLE admission.AdmissionSeatHistory (
    AdmissionSeatHistoryId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AdmissionSeatHistory PRIMARY KEY,
    SeatId       BIGINT NOT NULL CONSTRAINT FK_ASH_Seat REFERENCES admission.Seats(SeatId),
    AdmissionId  BIGINT NOT NULL CONSTRAINT FK_ASH_Admission REFERENCES admission.Admissions(AdmissionId),
    OccupiedFrom DATE NOT NULL,
    OccupiedTo   DATE NULL,
    Status       NVARCHAR(30) NOT NULL CONSTRAINT CK_ASH_Status CHECK (Status IN (N'OCCUPIED', N'RELEASED')),
    Remarks      NVARCHAR(500) NULL,
    CreatedAt    DATETIME2(3) NOT NULL CONSTRAINT DF_ASH_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy    BIGINT NULL CONSTRAINT FK_ASH_CreatedBy REFERENCES security.Users(UserId)
);
CREATE INDEX IX_ASH_Seat ON admission.AdmissionSeatHistory(SeatId);

/* ---------------------------------------------------------------------
   FINANCE - masters
   --------------------------------------------------------------------- */
CREATE TABLE finance.FeeHeads (
    FeeHeadId         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_FeeHeads PRIMARY KEY,
    FeeHeadCode       NVARCHAR(30)  NOT NULL CONSTRAINT UQ_FeeHeads_Code UNIQUE,
    FeeHeadName       NVARCHAR(150) NOT NULL,
    FeeCategory       NVARCHAR(50)  NOT NULL CONSTRAINT DF_FeeHeads_Category DEFAULT (N'ACADEMIC'),
    IsRefundable      BIT NOT NULL CONSTRAINT DF_FeeHeads_Refundable DEFAULT (0),
    IsSecurityDeposit BIT NOT NULL CONSTRAINT DF_FeeHeads_Security DEFAULT (0),
    DisplayOrder      INT NOT NULL CONSTRAINT DF_FeeHeads_Order DEFAULT (100),
    IsActive          BIT NOT NULL CONSTRAINT DF_FeeHeads_IsActive DEFAULT (1),
    CreatedAt         DATETIME2(3) NOT NULL CONSTRAINT DF_FeeHeads_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy         BIGINT NULL CONSTRAINT FK_FeeHeads_CreatedBy REFERENCES security.Users(UserId)
);

CREATE TABLE finance.PaymentModes (
    PaymentModeId         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PaymentModes PRIMARY KEY,
    PaymentModeCode       NVARCHAR(30)  NOT NULL CONSTRAINT UQ_PaymentModes_Code UNIQUE,
    PaymentModeName       NVARCHAR(100) NOT NULL,
    RequiresReference     BIT NOT NULL CONSTRAINT DF_PM_Ref DEFAULT (0),
    RequiresBank          BIT NOT NULL CONSTRAINT DF_PM_Bank DEFAULT (0),
    RequiresChequeDetails BIT NOT NULL CONSTRAINT DF_PM_Cheque DEFAULT (0),
    IsCash                BIT NOT NULL CONSTRAINT DF_PM_IsCash DEFAULT (0),
    IsActive              BIT NOT NULL CONSTRAINT DF_PM_IsActive DEFAULT (1)
);

CREATE TABLE finance.FeeStructures (
    FeeStructureId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_FeeStructures PRIMARY KEY,
    CourseId       INT    NOT NULL CONSTRAINT FK_FS_Course REFERENCES academic.Courses(CourseId),
    BatchId        BIGINT NULL CONSTRAINT FK_FS_Batch REFERENCES academic.Batches(BatchId),
    AcademicYearId INT    NOT NULL CONSTRAINT FK_FS_AY REFERENCES academic.AcademicYears(AcademicYearId),
    FeePeriodId    BIGINT NOT NULL CONSTRAINT FK_FS_FeePeriod REFERENCES academic.FeePeriods(FeePeriodId),
    FeeHeadId      INT    NOT NULL CONSTRAINT FK_FS_FeeHead REFERENCES finance.FeeHeads(FeeHeadId),
    Amount         DECIMAL(18,2) NOT NULL CONSTRAINT CK_FS_Amount CHECK (Amount >= 0),
    DueDate        DATE NULL,
    EffectiveFrom  DATE NOT NULL,
    EffectiveTo    DATE NULL,
    IsActive       BIT NOT NULL CONSTRAINT DF_FS_IsActive DEFAULT (1),
    CreatedAt      DATETIME2(3) NOT NULL CONSTRAINT DF_FS_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy      BIGINT NULL CONSTRAINT FK_FS_CreatedBy REFERENCES security.Users(UserId),
    UpdatedAt      DATETIME2(3) NULL,
    UpdatedBy      BIGINT NULL CONSTRAINT FK_FS_UpdatedBy REFERENCES security.Users(UserId),
    CONSTRAINT CK_FS_Effective CHECK (EffectiveTo IS NULL OR EffectiveTo >= EffectiveFrom)
);
CREATE INDEX IX_FS_Lookup ON finance.FeeStructures(CourseId, AcademicYearId, FeePeriodId, FeeHeadId) INCLUDE (BatchId, Amount, IsActive);

/* ---------------------------------------------------------------------
   FINANCE - student transactions
   --------------------------------------------------------------------- */
CREATE TABLE finance.StudentCharges (
    ChargeId       BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_StudentCharges PRIMARY KEY,
    AdmissionId    BIGINT NOT NULL CONSTRAINT FK_Charges_Admission REFERENCES admission.Admissions(AdmissionId),
    StudentId      BIGINT NOT NULL CONSTRAINT FK_Charges_Student REFERENCES admission.Students(StudentId),
    FeeStructureId BIGINT NULL CONSTRAINT FK_Charges_FS REFERENCES finance.FeeStructures(FeeStructureId),
    FeeHeadId      INT    NOT NULL CONSTRAINT FK_Charges_FeeHead REFERENCES finance.FeeHeads(FeeHeadId),
    FeePeriodId    BIGINT NULL CONSTRAINT FK_Charges_FeePeriod REFERENCES academic.FeePeriods(FeePeriodId),
    AcademicYearId INT    NOT NULL CONSTRAINT FK_Charges_AY REFERENCES academic.AcademicYears(AcademicYearId),
    ChargeDate     DATE NOT NULL,
    DueDate        DATE NULL,
    OriginalAmount DECIMAL(18,2) NOT NULL CONSTRAINT CK_Charges_Original CHECK (OriginalAmount > 0),
    /* DiscountAmount / NetAmount are a cache of approved rows in finance.Discounts,
       maintained inside the discount approval transaction. Reports use finance.Discounts. */
    DiscountAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Charges_Discount DEFAULT (0),
    NetAmount      AS (OriginalAmount - DiscountAmount) PERSISTED,
    ChargeStatus   NVARCHAR(30) NOT NULL CONSTRAINT DF_Charges_Status DEFAULT (N'ACTIVE')
                   CONSTRAINT CK_Charges_Status CHECK (ChargeStatus IN (N'ACTIVE', N'CANCELLED')),
    Description    NVARCHAR(500) NULL,
    CreatedAt      DATETIME2(3) NOT NULL CONSTRAINT DF_Charges_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy      BIGINT NULL CONSTRAINT FK_Charges_CreatedBy REFERENCES security.Users(UserId),
    CONSTRAINT CK_Charges_Discount CHECK (DiscountAmount >= 0 AND DiscountAmount <= OriginalAmount)
);
CREATE INDEX IX_Charges_Student ON finance.StudentCharges(StudentId);
CREATE INDEX IX_Charges_Admission ON finance.StudentCharges(AdmissionId);
CREATE INDEX IX_Charges_FeeHead ON finance.StudentCharges(FeeHeadId);
CREATE INDEX IX_Charges_AY ON finance.StudentCharges(AcademicYearId);
CREATE INDEX IX_Charges_FeePeriod ON finance.StudentCharges(FeePeriodId);
/* A fee-structure line can be charged only once per admission (unless cancelled). */
CREATE UNIQUE INDEX UX_Charges_Structure ON finance.StudentCharges(AdmissionId, FeeStructureId)
    WHERE FeeStructureId IS NOT NULL AND ChargeStatus = N'ACTIVE';

CREATE TABLE finance.Payments (
    PaymentId            BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Payments PRIMARY KEY,
    AdmissionId          BIGINT NOT NULL CONSTRAINT FK_Payments_Admission REFERENCES admission.Admissions(AdmissionId),
    StudentId            BIGINT NOT NULL CONSTRAINT FK_Payments_Student REFERENCES admission.Students(StudentId),
    ReceiptNumber        NVARCHAR(50) NULL,           -- assigned server-side at posting
    PaymentDate          DATE NOT NULL,
    Amount               DECIMAL(18,2) NOT NULL CONSTRAINT CK_Payments_Amount CHECK (Amount > 0),
    PaymentModeId        INT NOT NULL CONSTRAINT FK_Payments_Mode REFERENCES finance.PaymentModes(PaymentModeId),
    TransactionReference NVARCHAR(150) NULL,
    BankName             NVARCHAR(150) NULL,
    ChequeNumber         NVARCHAR(50)  NULL,
    ChequeDate           DATE NULL,
    ChequeStatus         NVARCHAR(30)  NULL
                         CONSTRAINT CK_Payments_ChequeStatus CHECK (ChequeStatus IS NULL OR ChequeStatus IN
                             (N'RECEIVED', N'DEPOSITED', N'CLEARED', N'BOUNCED', N'CANCELLED')),
    AllocationMethod     NVARCHAR(20) NOT NULL CONSTRAINT DF_Payments_AllocMethod DEFAULT (N'FIFO')
                         CONSTRAINT CK_Payments_AllocMethod CHECK (AllocationMethod IN (N'FIFO', N'MANUAL')),
    AllocationPlan       NVARCHAR(MAX) NULL,          -- JSON of requested manual allocations while not yet posted
    Status               NVARCHAR(30) NOT NULL CONSTRAINT DF_Payments_Status DEFAULT (N'DRAFT')
                         CONSTRAINT CK_Payments_Status CHECK (Status IN (N'DRAFT', N'PENDING_APPROVAL', N'APPROVED', N'POSTED',
                             N'REJECTED', N'REVERSED', N'CANCELLED')),
    Remarks              NVARCHAR(500) NULL,
    SubmittedBy          BIGINT NOT NULL CONSTRAINT FK_Payments_SubmittedBy REFERENCES security.Users(UserId),
    ApprovedBy           BIGINT NULL CONSTRAINT FK_Payments_ApprovedBy REFERENCES security.Users(UserId),
    ApprovedAt           DATETIME2(3) NULL,
    PostedAt             DATETIME2(3) NULL,
    CreatedAt            DATETIME2(3) NOT NULL CONSTRAINT DF_Payments_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy            BIGINT NOT NULL CONSTRAINT FK_Payments_CreatedBy REFERENCES security.Users(UserId),
    UpdatedAt            DATETIME2(3) NULL,
    UpdatedBy            BIGINT NULL CONSTRAINT FK_Payments_UpdatedBy REFERENCES security.Users(UserId),
    CONSTRAINT CK_Payments_PostedHasReceipt CHECK (Status NOT IN (N'POSTED', N'REVERSED') OR ReceiptNumber IS NOT NULL)
);
CREATE UNIQUE INDEX UX_Payments_Receipt ON finance.Payments(ReceiptNumber) WHERE ReceiptNumber IS NOT NULL;
CREATE INDEX IX_Payments_Student ON finance.Payments(StudentId);
CREATE INDEX IX_Payments_Admission ON finance.Payments(AdmissionId);
CREATE INDEX IX_Payments_Date ON finance.Payments(PaymentDate) INCLUDE (Amount, PaymentModeId, Status, SubmittedBy);
CREATE INDEX IX_Payments_Mode ON finance.Payments(PaymentModeId);
CREATE INDEX IX_Payments_Reference ON finance.Payments(TransactionReference) WHERE TransactionReference IS NOT NULL;
CREATE INDEX IX_Payments_Status ON finance.Payments(Status);

CREATE TABLE finance.PaymentAllocations (
    PaymentAllocationId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PaymentAllocations PRIMARY KEY,
    PaymentId       BIGINT NOT NULL CONSTRAINT FK_PA_Payment REFERENCES finance.Payments(PaymentId),
    ChargeId        BIGINT NOT NULL CONSTRAINT FK_PA_Charge REFERENCES finance.StudentCharges(ChargeId),
    AllocatedAmount DECIMAL(18,2) NOT NULL CONSTRAINT CK_PA_Amount CHECK (AllocatedAmount > 0),
    CreatedAt       DATETIME2(3) NOT NULL CONSTRAINT DF_PA_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy       BIGINT NOT NULL CONSTRAINT FK_PA_CreatedBy REFERENCES security.Users(UserId),
    CONSTRAINT UQ_PA UNIQUE (PaymentId, ChargeId)
);
CREATE INDEX IX_PA_Charge ON finance.PaymentAllocations(ChargeId);

/* Unallocated money (payment amount above the dues at posting time). */
CREATE TABLE finance.Advances (
    AdvanceId       BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Advances PRIMARY KEY,
    PaymentId       BIGINT NOT NULL CONSTRAINT FK_Advances_Payment REFERENCES finance.Payments(PaymentId),
    StudentId       BIGINT NOT NULL CONSTRAINT FK_Advances_Student REFERENCES admission.Students(StudentId),
    AdmissionId     BIGINT NOT NULL CONSTRAINT FK_Advances_Admission REFERENCES admission.Admissions(AdmissionId),
    OriginalAmount  DECIMAL(18,2) NOT NULL CONSTRAINT CK_Advances_Original CHECK (OriginalAmount > 0),
    /* cache of AdvanceAllocations + refund allocations against this advance */
    UtilizedAmount  DECIMAL(18,2) NOT NULL CONSTRAINT DF_Advances_Utilized DEFAULT (0),
    AvailableAmount AS (OriginalAmount - UtilizedAmount) PERSISTED,
    Status          NVARCHAR(30) NOT NULL CONSTRAINT DF_Advances_Status DEFAULT (N'AVAILABLE')
                    CONSTRAINT CK_Advances_Status CHECK (Status IN (N'AVAILABLE', N'UTILIZED', N'REVERSED')),
    CreatedAt       DATETIME2(3) NOT NULL CONSTRAINT DF_Advances_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_Advances_Payment UNIQUE (PaymentId),
    CONSTRAINT CK_Advances_Utilized CHECK (UtilizedAmount >= 0 AND UtilizedAmount <= OriginalAmount)
);
CREATE INDEX IX_Advances_Admission ON finance.Advances(AdmissionId);

CREATE TABLE finance.AdvanceAllocations (
    AdvanceAllocationId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AdvanceAllocations PRIMARY KEY,
    AdvanceId      BIGINT NOT NULL CONSTRAINT FK_AA_Advance REFERENCES finance.Advances(AdvanceId),
    ChargeId       BIGINT NOT NULL CONSTRAINT FK_AA_Charge REFERENCES finance.StudentCharges(ChargeId),
    Amount         DECIMAL(18,2) NOT NULL CONSTRAINT CK_AA_Amount CHECK (Amount > 0),
    AllocationDate DATE NOT NULL,
    CreatedAt      DATETIME2(3) NOT NULL CONSTRAINT DF_AA_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy      BIGINT NOT NULL CONSTRAINT FK_AA_CreatedBy REFERENCES security.Users(UserId)
);
CREATE INDEX IX_AA_Charge ON finance.AdvanceAllocations(ChargeId);
CREATE INDEX IX_AA_Advance ON finance.AdvanceAllocations(AdvanceId);

CREATE TABLE finance.Discounts (
    DiscountId     BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Discounts PRIMARY KEY,
    StudentId      BIGINT NOT NULL CONSTRAINT FK_Discounts_Student REFERENCES admission.Students(StudentId),
    AdmissionId    BIGINT NOT NULL CONSTRAINT FK_Discounts_Admission REFERENCES admission.Admissions(AdmissionId),
    ChargeId       BIGINT NOT NULL CONSTRAINT FK_Discounts_Charge REFERENCES finance.StudentCharges(ChargeId),
    OriginalAmount DECIMAL(18,2) NOT NULL,
    DiscountAmount DECIMAL(18,2) NOT NULL CONSTRAINT CK_Discounts_Amount CHECK (DiscountAmount > 0),
    Reason         NVARCHAR(500) NOT NULL,
    Remarks        NVARCHAR(500) NULL,
    Status         NVARCHAR(30) NOT NULL CONSTRAINT DF_Discounts_Status DEFAULT (N'PENDING_APPROVAL')
                   CONSTRAINT CK_Discounts_Status CHECK (Status IN (N'DRAFT', N'PENDING_APPROVAL', N'APPROVED', N'REJECTED', N'CANCELLED')),
    RequestedBy    BIGINT NOT NULL CONSTRAINT FK_Discounts_RequestedBy REFERENCES security.Users(UserId),
    ApprovedBy     BIGINT NULL CONSTRAINT FK_Discounts_ApprovedBy REFERENCES security.Users(UserId),
    ApprovedAt     DATETIME2(3) NULL,
    CreatedAt      DATETIME2(3) NOT NULL CONSTRAINT DF_Discounts_CreatedAt DEFAULT (SYSUTCDATETIME())
);
CREATE INDEX IX_Discounts_Charge ON finance.Discounts(ChargeId);
CREATE INDEX IX_Discounts_Admission ON finance.Discounts(AdmissionId);

CREATE TABLE finance.Refunds (
    RefundId             BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Refunds PRIMARY KEY,
    StudentId            BIGINT NOT NULL CONSTRAINT FK_Refunds_Student REFERENCES admission.Students(StudentId),
    AdmissionId          BIGINT NOT NULL CONSTRAINT FK_Refunds_Admission REFERENCES admission.Admissions(AdmissionId),
    OriginalPaymentId    BIGINT NULL CONSTRAINT FK_Refunds_Payment REFERENCES finance.Payments(PaymentId),
    RefundNumber         NVARCHAR(50) NOT NULL CONSTRAINT UQ_Refunds_Number UNIQUE,
    RefundType           NVARCHAR(30) NOT NULL CONSTRAINT DF_Refunds_Type DEFAULT (N'PARTIAL')
                         CONSTRAINT CK_Refunds_Type CHECK (RefundType IN (N'FULL', N'PARTIAL', N'FEE_HEAD', N'CAUTION_MONEY', N'ADVANCE', N'OTHER')),
    RefundDate           DATE NULL,
    RequestedAmount      DECIMAL(18,2) NOT NULL CONSTRAINT CK_Refunds_Requested CHECK (RequestedAmount > 0),
    ApprovedAmount       DECIMAL(18,2) NULL CONSTRAINT CK_Refunds_Approved CHECK (ApprovedAmount IS NULL OR ApprovedAmount >= 0),
    PaidAmount           DECIMAL(18,2) NOT NULL CONSTRAINT DF_Refunds_Paid DEFAULT (0) CONSTRAINT CK_Refunds_Paid CHECK (PaidAmount >= 0),
    RefundModeId         INT NULL CONSTRAINT FK_Refunds_Mode REFERENCES finance.PaymentModes(PaymentModeId),
    TransactionReference NVARCHAR(150) NULL,
    AllocationPlan       NVARCHAR(MAX) NULL,  -- JSON [{chargeId, amount}] requested; written to RefundAllocations on processing
    Reason               NVARCHAR(500) NOT NULL,
    Remarks              NVARCHAR(500) NULL,
    Status               NVARCHAR(30) NOT NULL CONSTRAINT DF_Refunds_Status DEFAULT (N'PENDING_APPROVAL')
                         CONSTRAINT CK_Refunds_Status CHECK (Status IN (N'DRAFT', N'PENDING_APPROVAL', N'APPROVED', N'PROCESSED',
                             N'REJECTED', N'CANCELLED')),
    RequestedBy          BIGINT NOT NULL CONSTRAINT FK_Refunds_RequestedBy REFERENCES security.Users(UserId),
    ApprovedBy           BIGINT NULL CONSTRAINT FK_Refunds_ApprovedBy REFERENCES security.Users(UserId),
    ApprovedAt           DATETIME2(3) NULL,
    ProcessedBy          BIGINT NULL CONSTRAINT FK_Refunds_ProcessedBy REFERENCES security.Users(UserId),
    ProcessedAt          DATETIME2(3) NULL,
    CreatedAt            DATETIME2(3) NOT NULL CONSTRAINT DF_Refunds_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_Refunds_ApprovedLeRequested CHECK (ApprovedAmount IS NULL OR ApprovedAmount <= RequestedAmount),
    CONSTRAINT CK_Refunds_Processed CHECK (Status <> N'PROCESSED' OR (RefundDate IS NOT NULL AND RefundModeId IS NOT NULL AND PaidAmount > 0))
);
CREATE INDEX IX_Refunds_Admission ON finance.Refunds(AdmissionId);
CREATE INDEX IX_Refunds_Status ON finance.Refunds(Status);

/* A processed refund is attributed either to a charge (fee-head refund:
   the refunded part of the charge is credited back) or to an advance
   (return of excess money). */
CREATE TABLE finance.RefundAllocations (
    RefundAllocationId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RefundAllocations PRIMARY KEY,
    RefundId  BIGINT NOT NULL CONSTRAINT FK_RA_Refund REFERENCES finance.Refunds(RefundId),
    ChargeId  BIGINT NULL CONSTRAINT FK_RA_Charge REFERENCES finance.StudentCharges(ChargeId),
    AdvanceId BIGINT NULL CONSTRAINT FK_RA_Advance REFERENCES finance.Advances(AdvanceId),
    Amount    DECIMAL(18,2) NOT NULL CONSTRAINT CK_RA_Amount CHECK (Amount > 0),
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_RA_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy BIGINT NOT NULL CONSTRAINT FK_RA_CreatedBy REFERENCES security.Users(UserId),
    CONSTRAINT CK_RA_Target CHECK ((ChargeId IS NULL AND AdvanceId IS NOT NULL) OR (ChargeId IS NOT NULL AND AdvanceId IS NULL))
);
CREATE INDEX IX_RA_Charge ON finance.RefundAllocations(ChargeId);
CREATE INDEX IX_RA_Refund ON finance.RefundAllocations(RefundId);

/* Approved financial adjustments. WAIVER reduces what is due on a charge
   (e.g. unpaid fees written off on cancellation). */
CREATE TABLE finance.Adjustments (
    AdjustmentId   BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Adjustments PRIMARY KEY,
    StudentId      BIGINT NOT NULL CONSTRAINT FK_Adj_Student REFERENCES admission.Students(StudentId),
    AdmissionId    BIGINT NOT NULL CONSTRAINT FK_Adj_Admission REFERENCES admission.Admissions(AdmissionId),
    ChargeId       BIGINT NOT NULL CONSTRAINT FK_Adj_Charge REFERENCES finance.StudentCharges(ChargeId),
    AdjustmentType NVARCHAR(50) NOT NULL CONSTRAINT CK_Adj_Type CHECK (AdjustmentType IN (N'WAIVER', N'CANCELLATION_WAIVER', N'WRITE_OFF')),
    Amount         DECIMAL(18,2) NOT NULL CONSTRAINT CK_Adj_Amount CHECK (Amount > 0),
    Reason         NVARCHAR(500) NOT NULL,
    Status         NVARCHAR(30) NOT NULL CONSTRAINT DF_Adj_Status DEFAULT (N'PENDING_APPROVAL')
                   CONSTRAINT CK_Adj_Status CHECK (Status IN (N'PENDING_APPROVAL', N'APPROVED', N'REJECTED', N'CANCELLED')),
    RequestedBy    BIGINT NOT NULL CONSTRAINT FK_Adj_RequestedBy REFERENCES security.Users(UserId),
    ApprovedBy     BIGINT NULL CONSTRAINT FK_Adj_ApprovedBy REFERENCES security.Users(UserId),
    ApprovedAt     DATETIME2(3) NULL,
    CreatedAt      DATETIME2(3) NOT NULL CONSTRAINT DF_Adj_CreatedAt DEFAULT (SYSUTCDATETIME())
);
CREATE INDEX IX_Adj_Charge ON finance.Adjustments(ChargeId);

CREATE TABLE finance.TransactionReversals (
    ReversalId              BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TransactionReversals PRIMARY KEY,
    OriginalTransactionType NVARCHAR(50) NOT NULL CONSTRAINT CK_Rev_Type CHECK (OriginalTransactionType IN (N'PAYMENT', N'CHARGE')),
    OriginalTransactionId   BIGINT NOT NULL,
    AdmissionId             BIGINT NOT NULL CONSTRAINT FK_Rev_Admission REFERENCES admission.Admissions(AdmissionId),
    Amount                  DECIMAL(18,2) NOT NULL,
    ReversalDate            DATE NOT NULL,
    Reason                  NVARCHAR(500) NOT NULL,
    Status                  NVARCHAR(30) NOT NULL CONSTRAINT DF_Rev_Status DEFAULT (N'PENDING_APPROVAL')
                            CONSTRAINT CK_Rev_Status CHECK (Status IN (N'PENDING_APPROVAL', N'APPROVED', N'REJECTED', N'CANCELLED')),
    RequestedBy             BIGINT NOT NULL CONSTRAINT FK_Rev_RequestedBy REFERENCES security.Users(UserId),
    ApprovedBy              BIGINT NULL CONSTRAINT FK_Rev_ApprovedBy REFERENCES security.Users(UserId),
    ApprovedAt              DATETIME2(3) NULL,
    CreatedAt               DATETIME2(3) NOT NULL CONSTRAINT DF_Rev_CreatedAt DEFAULT (SYSUTCDATETIME())
);
CREATE INDEX IX_Rev_Original ON finance.TransactionReversals(OriginalTransactionType, OriginalTransactionId);
/* Only one open/approved reversal per transaction. */
CREATE UNIQUE INDEX UX_Rev_Active ON finance.TransactionReversals(OriginalTransactionType, OriginalTransactionId)
    WHERE Status IN (N'PENDING_APPROVAL', N'APPROVED');

CREATE TABLE finance.Receipts (
    ReceiptId     BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Receipts PRIMARY KEY,
    PaymentId     BIGINT NOT NULL CONSTRAINT FK_Receipts_Payment REFERENCES finance.Payments(PaymentId) CONSTRAINT UQ_Receipts_Payment UNIQUE,
    ReceiptNumber NVARCHAR(50) NOT NULL CONSTRAINT UQ_Receipts_Number UNIQUE,
    ReceiptDate   DATE NOT NULL,
    PdfPath       NVARCHAR(500) NULL,
    PrintedCount  INT NOT NULL CONSTRAINT DF_Receipts_Printed DEFAULT (0),
    LastPrintedAt DATETIME2(3) NULL,
    CreatedAt     DATETIME2(3) NOT NULL CONSTRAINT DF_Receipts_CreatedAt DEFAULT (SYSUTCDATETIME())
);

CREATE TABLE finance.CashierDayClosings (
    ClosingId           BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CashierDayClosings PRIMARY KEY,
    UserId              BIGINT NOT NULL CONSTRAINT FK_CDC_User REFERENCES security.Users(UserId),
    ClosingDate         DATE NOT NULL,
    OpeningCash         DECIMAL(18,2) NOT NULL,
    CashCollection      DECIMAL(18,2) NOT NULL,
    CashRefund          DECIMAL(18,2) NOT NULL,
    CashDeposit         DECIMAL(18,2) NOT NULL,
    ExpectedClosingCash AS (OpeningCash + CashCollection - CashRefund - CashDeposit) PERSISTED,
    ActualClosingCash   DECIMAL(18,2) NOT NULL,
    Difference          AS (ActualClosingCash - (OpeningCash + CashCollection - CashRefund - CashDeposit)) PERSISTED,
    Status              NVARCHAR(30) NOT NULL CONSTRAINT DF_CDC_Status DEFAULT (N'SUBMITTED')
                        CONSTRAINT CK_CDC_Status CHECK (Status IN (N'SUBMITTED', N'VERIFIED', N'REJECTED')),
    SubmittedAt         DATETIME2(3) NOT NULL CONSTRAINT DF_CDC_SubmittedAt DEFAULT (SYSUTCDATETIME()),
    VerifiedBy          BIGINT NULL CONSTRAINT FK_CDC_VerifiedBy REFERENCES security.Users(UserId),
    VerifiedAt          DATETIME2(3) NULL,
    Remarks             NVARCHAR(500) NULL,
    VerifierRemarks     NVARCHAR(500) NULL,
    CONSTRAINT CK_CDC_NonNegative CHECK (OpeningCash >= 0 AND CashCollection >= 0 AND CashRefund >= 0 AND CashDeposit >= 0 AND ActualClosingCash >= 0)
);
/* One live closing per cashier per day (a rejected one can be resubmitted). */
CREATE UNIQUE INDEX UX_CDC_UserDate ON finance.CashierDayClosings(UserId, ClosingDate) WHERE Status <> N'REJECTED';

/* ---------------------------------------------------------------------
   CONSULTANT transactions
   --------------------------------------------------------------------- */
CREATE TABLE consultant.ConsultantRates (
    ConsultantRateId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ConsultantRates PRIMARY KEY,
    ConsultantId     BIGINT NOT NULL CONSTRAINT FK_CR_Consultant REFERENCES consultant.Consultants(ConsultantId),
    CourseId         INT    NULL CONSTRAINT FK_CR_Course REFERENCES academic.Courses(CourseId),
    BatchId          BIGINT NULL CONSTRAINT FK_CR_Batch REFERENCES academic.Batches(BatchId),
    AdmissionId      BIGINT NULL CONSTRAINT FK_CR_Admission REFERENCES admission.Admissions(AdmissionId),
    RateType         NVARCHAR(30) NOT NULL CONSTRAINT CK_CR_Type CHECK (RateType IN (N'FIXED', N'COURSE_WISE', N'BATCH_WISE', N'STUDENT_SPECIFIC')),
    Amount           DECIMAL(18,2) NOT NULL CONSTRAINT CK_CR_Amount CHECK (Amount >= 0),
    EffectiveFrom    DATE NOT NULL,
    EffectiveTo      DATE NULL,
    IsActive         BIT NOT NULL CONSTRAINT DF_CR_IsActive DEFAULT (1),
    CreatedAt        DATETIME2(3) NOT NULL CONSTRAINT DF_CR_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy        BIGINT NULL CONSTRAINT FK_CR_CreatedBy REFERENCES security.Users(UserId),
    CONSTRAINT CK_CR_Scope CHECK (
        (RateType = N'FIXED') OR
        (RateType = N'COURSE_WISE' AND CourseId IS NOT NULL) OR
        (RateType = N'BATCH_WISE' AND BatchId IS NOT NULL) OR
        (RateType = N'STUDENT_SPECIFIC' AND AdmissionId IS NOT NULL))
);
CREATE INDEX IX_CR_Consultant ON consultant.ConsultantRates(ConsultantId);

CREATE TABLE consultant.Payables (
    ConsultantPayableId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ConsultantPayables PRIMARY KEY,
    ConsultantId   BIGINT NOT NULL CONSTRAINT FK_CPay_Consultant REFERENCES consultant.Consultants(ConsultantId),
    StudentId      BIGINT NULL CONSTRAINT FK_CPay_Student REFERENCES admission.Students(StudentId),
    AdmissionId    BIGINT NULL CONSTRAINT FK_CPay_Admission REFERENCES admission.Admissions(AdmissionId),
    CourseId       INT    NULL CONSTRAINT FK_CPay_Course REFERENCES academic.Courses(CourseId),
    BatchId        BIGINT NULL CONSTRAINT FK_CPay_Batch REFERENCES academic.Batches(BatchId),
    ConsultantRateId BIGINT NULL CONSTRAINT FK_CPay_Rate REFERENCES consultant.ConsultantRates(ConsultantRateId),
    PayableDate    DATE NOT NULL,
    ApprovedAmount DECIMAL(18,2) NOT NULL CONSTRAINT CK_CPay_Amount CHECK (ApprovedAmount > 0),
    Description    NVARCHAR(500) NOT NULL,
    Status         NVARCHAR(30) NOT NULL CONSTRAINT DF_CPay_Status DEFAULT (N'PENDING_APPROVAL')
                   CONSTRAINT CK_CPay_Status CHECK (Status IN (N'PENDING_APPROVAL', N'APPROVED', N'REJECTED', N'CANCELLED')),
    RequestedBy    BIGINT NOT NULL CONSTRAINT FK_CPay_RequestedBy REFERENCES security.Users(UserId),
    ApprovedBy     BIGINT NULL CONSTRAINT FK_CPay_ApprovedBy REFERENCES security.Users(UserId),
    ApprovedAt     DATETIME2(3) NULL,
    CreatedAt      DATETIME2(3) NOT NULL CONSTRAINT DF_CPay_CreatedAt DEFAULT (SYSUTCDATETIME())
);
CREATE INDEX IX_CPay_Consultant ON consultant.Payables(ConsultantId);
CREATE INDEX IX_CPay_Admission ON consultant.Payables(AdmissionId);
CREATE INDEX IX_CPay_Student ON consultant.Payables(StudentId);
CREATE INDEX IX_CPay_Status ON consultant.Payables(Status);

CREATE TABLE consultant.Payments (
    ConsultantPaymentId  BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ConsultantPayments PRIMARY KEY,
    ConsultantPayableId  BIGINT NOT NULL CONSTRAINT FK_CP_Payable REFERENCES consultant.Payables(ConsultantPayableId),
    ConsultantId         BIGINT NOT NULL CONSTRAINT FK_CP_Consultant REFERENCES consultant.Consultants(ConsultantId),
    StudentId            BIGINT NULL CONSTRAINT FK_CP_Student REFERENCES admission.Students(StudentId),
    AdmissionId          BIGINT NULL CONSTRAINT FK_CP_Admission REFERENCES admission.Admissions(AdmissionId),
    PaymentNumber        NVARCHAR(50) NOT NULL CONSTRAINT UQ_CP_Number UNIQUE,
    PaymentDate          DATE NOT NULL,
    Amount               DECIMAL(18,2) NOT NULL CONSTRAINT CK_CP_Amount CHECK (Amount > 0),
    PaymentModeId        INT NOT NULL CONSTRAINT FK_CP_Mode REFERENCES finance.PaymentModes(PaymentModeId),
    TransactionReference NVARCHAR(150) NULL,
    BankName             NVARCHAR(150) NULL,
    Remarks              NVARCHAR(500) NULL,
    IsOverride           BIT NOT NULL CONSTRAINT DF_CP_IsOverride DEFAULT (0),
    OverrideReason       NVARCHAR(500) NULL,
    Status               NVARCHAR(30) NOT NULL CONSTRAINT DF_CP_Status DEFAULT (N'PENDING_APPROVAL')
                         CONSTRAINT CK_CP_Status CHECK (Status IN (N'DRAFT', N'PENDING_APPROVAL', N'APPROVED', N'PROCESSED',
                             N'REJECTED', N'CANCELLED', N'REVERSED')),
    RequestedBy          BIGINT NOT NULL CONSTRAINT FK_CP_RequestedBy REFERENCES security.Users(UserId),
    ApprovedBy           BIGINT NULL CONSTRAINT FK_CP_ApprovedBy REFERENCES security.Users(UserId),
    ApprovedAt           DATETIME2(3) NULL,
    ProcessedBy          BIGINT NULL CONSTRAINT FK_CP_ProcessedBy REFERENCES security.Users(UserId),
    ProcessedAt          DATETIME2(3) NULL,
    CreatedAt            DATETIME2(3) NOT NULL CONSTRAINT DF_CP_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_CP_Override CHECK (IsOverride = 0 OR OverrideReason IS NOT NULL)
);
CREATE INDEX IX_CP_Consultant ON consultant.Payments(ConsultantId);
CREATE INDEX IX_CP_Payable ON consultant.Payments(ConsultantPayableId);
CREATE INDEX IX_CP_Student ON consultant.Payments(StudentId);
CREATE INDEX IX_CP_Admission ON consultant.Payments(AdmissionId);
CREATE INDEX IX_CP_Date ON consultant.Payments(PaymentDate);
CREATE INDEX IX_CP_Status ON consultant.Payments(Status);

/* RecoveryMode:
     CASH   - consultant returned money: reduces entitlement AND net amount paid
     ADJUST - entitlement reduced, to be set off against future payables     */
CREATE TABLE consultant.Recoveries (
    RecoveryId           BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ConsultantRecoveries PRIMARY KEY,
    ConsultantId         BIGINT NOT NULL CONSTRAINT FK_CRec_Consultant REFERENCES consultant.Consultants(ConsultantId),
    ConsultantPayableId  BIGINT NULL CONSTRAINT FK_CRec_Payable REFERENCES consultant.Payables(ConsultantPayableId),
    ConsultantPaymentId  BIGINT NULL CONSTRAINT FK_CRec_Payment REFERENCES consultant.Payments(ConsultantPaymentId),
    StudentId            BIGINT NULL CONSTRAINT FK_CRec_Student REFERENCES admission.Students(StudentId),
    AdmissionId          BIGINT NULL CONSTRAINT FK_CRec_Admission REFERENCES admission.Admissions(AdmissionId),
    RecoveryDate         DATE NOT NULL,
    RecoveryMode         NVARCHAR(20) NOT NULL CONSTRAINT CK_CRec_Mode CHECK (RecoveryMode IN (N'CASH', N'ADJUST')),
    PaymentModeId        INT NULL CONSTRAINT FK_CRec_PayMode REFERENCES finance.PaymentModes(PaymentModeId),
    TransactionReference NVARCHAR(150) NULL,
    Amount               DECIMAL(18,2) NOT NULL CONSTRAINT CK_CRec_Amount CHECK (Amount > 0),
    Reason               NVARCHAR(500) NOT NULL,
    Status               NVARCHAR(30) NOT NULL CONSTRAINT DF_CRec_Status DEFAULT (N'PENDING_APPROVAL')
                         CONSTRAINT CK_CRec_Status CHECK (Status IN (N'PENDING_APPROVAL', N'APPROVED', N'REJECTED', N'CANCELLED')),
    RequestedBy          BIGINT NOT NULL CONSTRAINT FK_CRec_RequestedBy REFERENCES security.Users(UserId),
    ApprovedBy           BIGINT NULL CONSTRAINT FK_CRec_ApprovedBy REFERENCES security.Users(UserId),
    ApprovedAt           DATETIME2(3) NULL,
    CreatedAt            DATETIME2(3) NOT NULL CONSTRAINT DF_CRec_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_CRec_CashMode CHECK (RecoveryMode <> N'CASH' OR PaymentModeId IS NOT NULL)
);
CREATE INDEX IX_CRec_Consultant ON consultant.Recoveries(ConsultantId);
CREATE INDEX IX_CRec_Payable ON consultant.Recoveries(ConsultantPayableId);

/* ---------------------------------------------------------------------
   WORKFLOW
   --------------------------------------------------------------------- */
CREATE TABLE workflow.ApprovalRules (
    ApprovalRuleId  BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ApprovalRules PRIMARY KEY,
    TransactionType NVARCHAR(50) NOT NULL,
    MinimumAmount   DECIMAL(18,2) NULL,
    MaximumAmount   DECIMAL(18,2) NULL,
    ApprovalLevel   INT NOT NULL CONSTRAINT CK_AR_Level CHECK (ApprovalLevel BETWEEN 1 AND 9),
    RoleId          INT NOT NULL CONSTRAINT FK_AR_Role REFERENCES security.Roles(RoleId),
    IsActive        BIT NOT NULL CONSTRAINT DF_AR_IsActive DEFAULT (1),
    CreatedAt       DATETIME2(3) NOT NULL CONSTRAINT DF_AR_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy       BIGINT NULL CONSTRAINT FK_AR_CreatedBy REFERENCES security.Users(UserId),
    CONSTRAINT CK_AR_Range CHECK (MinimumAmount IS NULL OR MaximumAmount IS NULL OR MaximumAmount >= MinimumAmount)
);
CREATE INDEX IX_AR_Type ON workflow.ApprovalRules(TransactionType, IsActive);

CREATE TABLE workflow.ApprovalRequests (
    ApprovalRequestId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ApprovalRequests PRIMARY KEY,
    TransactionType   NVARCHAR(50) NOT NULL,
    TransactionId     BIGINT NOT NULL,
    Amount            DECIMAL(18,2) NULL,
    Description       NVARCHAR(500) NULL,
    StudentId         BIGINT NULL CONSTRAINT FK_AReq_Student REFERENCES admission.Students(StudentId),
    ConsultantId      BIGINT NULL CONSTRAINT FK_AReq_Consultant REFERENCES consultant.Consultants(ConsultantId),
    RequestedBy       BIGINT NOT NULL CONSTRAINT FK_AReq_RequestedBy REFERENCES security.Users(UserId),
    RequestedAt       DATETIME2(3) NOT NULL CONSTRAINT DF_AReq_RequestedAt DEFAULT (SYSUTCDATETIME()),
    CurrentLevel      INT NOT NULL CONSTRAINT DF_AReq_Level DEFAULT (1),
    MaxLevel          INT NOT NULL CONSTRAINT DF_AReq_MaxLevel DEFAULT (1),
    Status            NVARCHAR(30) NOT NULL CONSTRAINT DF_AReq_Status DEFAULT (N'PENDING_APPROVAL')
                      CONSTRAINT CK_AReq_Status CHECK (Status IN (N'PENDING_APPROVAL', N'APPROVED', N'REJECTED', N'RETURNED', N'CANCELLED')),
    FinalApprovedBy   BIGINT NULL CONSTRAINT FK_AReq_FinalBy REFERENCES security.Users(UserId),
    FinalApprovedAt   DATETIME2(3) NULL,
    RejectionReason   NVARCHAR(500) NULL,
    Remarks           NVARCHAR(500) NULL
);
CREATE INDEX IX_AReq_Status ON workflow.ApprovalRequests(Status) INCLUDE (TransactionType, CurrentLevel);
CREATE INDEX IX_AReq_Transaction ON workflow.ApprovalRequests(TransactionType, TransactionId);
CREATE UNIQUE INDEX UX_AReq_Open ON workflow.ApprovalRequests(TransactionType, TransactionId) WHERE Status = N'PENDING_APPROVAL';

CREATE TABLE workflow.ApprovalActions (
    ApprovalActionId  BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ApprovalActions PRIMARY KEY,
    ApprovalRequestId BIGINT NOT NULL CONSTRAINT FK_AAct_Request REFERENCES workflow.ApprovalRequests(ApprovalRequestId),
    ApprovalLevel     INT NOT NULL,
    Action            NVARCHAR(30) NOT NULL CONSTRAINT CK_AAct_Action CHECK (Action IN (N'SUBMITTED', N'APPROVED', N'REJECTED', N'RETURNED', N'CANCELLED')),
    ActionBy          BIGINT NOT NULL CONSTRAINT FK_AAct_ActionBy REFERENCES security.Users(UserId),
    ActionAt          DATETIME2(3) NOT NULL CONSTRAINT DF_AAct_ActionAt DEFAULT (SYSUTCDATETIME()),
    Comments          NVARCHAR(500) NULL,
    RejectionReason   NVARCHAR(500) NULL,
    CONSTRAINT CK_AAct_RejectReason CHECK (Action NOT IN (N'REJECTED', N'RETURNED') OR RejectionReason IS NOT NULL)
);
CREATE INDEX IX_AAct_Request ON workflow.ApprovalActions(ApprovalRequestId);

/* ---------------------------------------------------------------------
   AUDIT
   --------------------------------------------------------------------- */
CREATE TABLE audit.AuditLogs (
    AuditLogId     BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLogs PRIMARY KEY,
    UserId         BIGINT NULL CONSTRAINT FK_Audit_User REFERENCES security.Users(UserId),
    ActionType     NVARCHAR(50)  NOT NULL,
    EntityName     NVARCHAR(100) NOT NULL,
    EntityId       BIGINT NULL,
    OldValues      NVARCHAR(MAX) NULL,
    NewValues      NVARCHAR(MAX) NULL,
    IpAddress      NVARCHAR(50)  NULL,
    UserAgent      NVARCHAR(500) NULL,
    ActionDateTime DATETIME2(3) NOT NULL CONSTRAINT DF_Audit_At DEFAULT (SYSUTCDATETIME()),
    Reason         NVARCHAR(500) NULL
);
CREATE INDEX IX_Audit_Entity ON audit.AuditLogs(EntityName, EntityId);
CREATE INDEX IX_Audit_User ON audit.AuditLogs(UserId, ActionDateTime);
CREATE INDEX IX_Audit_At ON audit.AuditLogs(ActionDateTime);

/* ---------------------------------------------------------------------
   SYSTEM
   --------------------------------------------------------------------- */
CREATE TABLE dbo.SystemSettings (
    SettingId    INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SystemSettings PRIMARY KEY,
    SettingKey   NVARCHAR(100) NOT NULL CONSTRAINT UQ_SystemSettings_Key UNIQUE,
    SettingValue NVARCHAR(MAX) NULL,
    Description  NVARCHAR(500) NULL,
    IsActive     BIT NOT NULL CONSTRAINT DF_SS_IsActive DEFAULT (1),
    UpdatedAt    DATETIME2(3) NULL,
    UpdatedBy    BIGINT NULL CONSTRAINT FK_SS_UpdatedBy REFERENCES security.Users(UserId)
);

CREATE TABLE dbo.DocumentSequences (
    DocumentSequenceId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DocumentSequences PRIMARY KEY,
    DocumentType       NVARCHAR(50) NOT NULL,
    FinancialYear      INT NOT NULL,          -- 0 for sequences that never reset
    Prefix             NVARCHAR(30) NOT NULL,
    LastNumber         BIGINT NOT NULL CONSTRAINT DF_DS_Last DEFAULT (0),
    UpdatedAt          DATETIME2(3) NOT NULL CONSTRAINT DF_DS_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_DocumentSequences UNIQUE (DocumentType, FinancialYear)
);

/* Formats used by dbo.usp_NextDocumentNumber. */
CREATE TABLE dbo.DocumentTypes (
    DocumentType NVARCHAR(50) NOT NULL CONSTRAINT PK_DocumentTypes PRIMARY KEY,
    Prefix       NVARCHAR(30) NOT NULL,
    Separator    NVARCHAR(5)  NOT NULL CONSTRAINT DF_DT_Sep DEFAULT (N'-'),
    IncludeYear  BIT NOT NULL,
    NumberWidth  INT NOT NULL CONSTRAINT DF_DT_Width DEFAULT (6)
);

CREATE TABLE dbo.StatusTypes (
    StatusTypeId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_StatusTypes PRIMARY KEY,
    Category     NVARCHAR(50) NOT NULL,
    StatusCode   NVARCHAR(30) NOT NULL,
    StatusName   NVARCHAR(100) NOT NULL,
    SortOrder    INT NOT NULL CONSTRAINT DF_ST_Sort DEFAULT (0),
    CONSTRAINT UQ_StatusTypes UNIQUE (Category, StatusCode)
);

CREATE TABLE dbo.Notifications (
    NotificationId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Notifications PRIMARY KEY,
    UserId         BIGINT NOT NULL CONSTRAINT FK_Notif_User REFERENCES security.Users(UserId),
    EventType      NVARCHAR(50)  NOT NULL,
    Title          NVARCHAR(200) NOT NULL,
    Message        NVARCHAR(1000) NULL,
    Link           NVARCHAR(300) NULL,
    IsRead         BIT NOT NULL CONSTRAINT DF_Notif_IsRead DEFAULT (0),
    CreatedAt      DATETIME2(3) NOT NULL CONSTRAINT DF_Notif_CreatedAt DEFAULT (SYSUTCDATETIME())
);
CREATE INDEX IX_Notif_User ON dbo.Notifications(UserId, IsRead);
GO
