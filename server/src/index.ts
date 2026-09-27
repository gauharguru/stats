import { createApp } from './app';
import { config } from './config';
import { closePool, getPool } from './db';
import { pendingMigrations } from './db/setup';

async function main() {
  /* software and database must match: never run new code on an old database */
  const pending = await pendingMigrations(await getPool());
  if (pending.length) {
    throw new Error(`The database is not up to date (${pending.join(', ')} not applied). Run "npm run db:setup" first.`);
  }
  const server = createApp().listen(config.port, config.host, () => {
    console.log(`AHS SFM API listening on http://${config.host}:${config.port}`);
  });
  const shutdown = () => {
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  console.error('Failed to start:', e);
  process.exit(1);
});
