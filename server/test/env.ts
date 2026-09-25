/* Tests run against a throw-away database on the SQL Server configured in .env
   (DB_SERVER / DB_USER / DB_PASSWORD). */
process.env.DB_NAME = process.env.TEST_DB_NAME || `AHS_SFM_TEST_${process.pid}`;
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'Admin@12345';
process.env.JWT_SECRET = 'test-secret';
