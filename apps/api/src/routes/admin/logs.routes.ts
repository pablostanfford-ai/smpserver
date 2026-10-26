import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../lib/errors';

export const adminLogsRouter = Router();

adminLogsRouter.use(requireAuth, requireRole('ADMIN'));

const querySchema = z.object({
  level: z.enum(['INFO', 'WARN', 'ERROR', 'SECURITY']).optional(),
  action: z.string().max(64).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(50),
});

// GET /api/admin/logs
adminLogsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = querySchema.parse(req.query);

    const where: Prisma.AuditLogWhereInput = {
      ...(q.level ? { level: q.level } : {}),
      ...(q.action ? { action: { startsWith: q.action } } : {}),
      ...(q.q
        ? {
            OR: [
              { message: { contains: q.q, mode: 'insensitive' } },
              { actorName: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, logs, levelCounts] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
        include: { actor: { select: { id: true, username: true, mcName: true } } },
      }),
      prisma.auditLog.groupBy({ by: ['level'], _count: { _all: true } }),
    ]);

    return res.json({
      logs,
      pagination: { page: q.page, perPage: q.perPage, total, pages: Math.ceil(total / q.perPage) },
      levelCounts: Object.fromEntries(levelCounts.map((l) => [l.level, l._count._all])),
    });
  }),
);

// GET /api/admin/logs/stats — сводка для дашборда админки
adminLogsRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const since24h = new Date(Date.now() - 24 * 3600_000);

    const [users, banned, muted, races, logs24h, security24h, sessions] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'BANNED' } }),
      prisma.user.count({ where: { status: 'MUTED' } }),
      prisma.race.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: since24h } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: since24h }, level: 'SECURITY' } }),
      prisma.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    ]);

    return res.json({
      users,
      banned,
      muted,
      races,
      logs24h,
      security24h,
      activeSessions: sessions,
    });
  }),
);
