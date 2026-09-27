/* Run in SSMS (as sysadmin) if install.ps1 could not create these itself.
   Change the password; the same password goes into server\.env (DB_PASSWORD). */
IF DB_ID(N'AHS_SFM') IS NULL CREATE DATABASE AHS_SFM;
GO
IF SUSER_ID(N'ahs_app') IS NULL
  CREATE LOGIN ahs_app WITH PASSWORD = N'Change-This-Strong-Password-2026', CHECK_POLICY = ON, DEFAULT_DATABASE = AHS_SFM;
GO
USE AHS_SFM;
IF USER_ID(N'ahs_app') IS NULL CREATE USER ahs_app FOR LOGIN ahs_app;
ALTER ROLE db_owner ADD MEMBER ahs_app;
GO
