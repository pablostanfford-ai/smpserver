import type { Request } from 'express';
import { prisma } from './prisma';
import { hashIp } from './tokens';
import { logger } from './logger';
import type { AuditLevel } from '@prisma/client';

interface AuditInput {
  level?: AuditLevel;
  action: string;
  message: string;
  actorId?: string | null;
  actorName?: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  req?: Request;
}

/**
 * Запись в системный лог. Никогда не бросает исключений:
 * сбой логирования не должен ломать бизнес-операцию.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        level: input.level ?? 'INFO',
        action: input.action,
        message: input.message.slice(0, 500),
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? (input.actorId ? 'user' : 'system'),
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        meta: (input.meta ?? {}) as object,
        ipHash: input.req?.ip ? hashIp(input.req.ip) : '',
      },
    });
  } catch (err) {
    logger.error({ err: (err as Error).message, action: input.action }, 'audit.write_failed');
  }
}

/** Уведомление игроку (в личный кабинет). */
export async function notify(
  userId: string,
  data: { title: string; body?: string; type?: 'SYSTEM' | 'RACE' | 'MODERATION' | 'REWARD'; link?: string },
) {
  await prisma.notification.create({
    data: {
      userId,
      title: data.title,
      body: data.body ?? '',
      type: data.type ?? 'SYSTEM',
      link: data.link ?? null,
    },
  });
}

/** Событие в ленте активности профиля. */
export async function trackActivity(
  userId: string,
  type: string,
  message: string,
  meta: Record<string, unknown> = {},
) {
  await prisma.activityEvent.create({
    data: { userId, type, message, meta: meta as object },
  });
}
