import { createApp } from './app';
import { config } from './config';
import { closePool, getPool } from './db';

async function main() {
  await getPool();
  const server = createApp().listen(config.port, () => {
    console.log(`AHS SFM API listening on http://localhost:${config.port}`);
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
