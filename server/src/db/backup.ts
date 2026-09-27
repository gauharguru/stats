/* Safety backup taken before a new version changes the database.
   Usage:  npm run db:backup            (only if migration scripts are pending)
           npm run db:backup -- --force (always)
   The .bak file is written by SQL Server to its default backup folder.     */
import sql from 'mssql';
import { config } from '../config';
import { poolConfig } from './index';
import { pendingMigrations } from './setup';

async function main() {
  const force = process.argv.includes('--force');
  const pool = await new sql.ConnectionPool(poolConfig()).connect();
  try {
    const pending = await pendingMigrations(pool);
    if (!pending.length && !force) {
      console.log('No database changes pending - backup not needed.');
      return;
    }
    const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const file = `${config.db.database}_before_update_${stamp}.bak`;
    /* COPY_ONLY: does not disturb the regular backup chain */
    await pool.request().input('file', sql.NVarChar, file).input('name', sql.NVarChar, `Before update: ${pending.join(', ') || 'manual'}`).batch(`
      DECLARE @db SYSNAME = DB_NAME();
      BACKUP DATABASE @db TO DISK = @file WITH COPY_ONLY, INIT, CHECKSUM, NAME = @name;`);
    console.log(`Backup written: ${file} (SQL Server default backup folder)`);
  } finally {
    await pool.close();
  }
}

main().catch((e) => {
  console.error('Backup failed:', e.message);
  process.exit(1);
});
