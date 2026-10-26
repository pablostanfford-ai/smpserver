import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  logger.info(
    { port: env.API_PORT, env: env.NODE_ENV, rcon: env.RCON_ENABLED },
    '🚀 AetherSMP API запущен',
  );
});

/** Graceful shutdown: дожидаемся завершения запросов и закрываем пул БД. */
async function shutdown(signal: string) {
  logger.info({ signal }, 'Завершение работы API');
  server.close(async () => {
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  });
  // Принудительный выход, если соединения зависли
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandled_rejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err: err.message, stack: err.stack }, 'uncaught_exception');
  process.exit(1);
});
