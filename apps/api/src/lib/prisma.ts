import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Единственный экземпляр PrismaClient (защита от утечки соединений при hot-reload).
 */
export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: env.isProd ? ['error', 'warn'] : ['warn', 'error'],
  });

if (!env.isProd) global.__prisma = prisma;
