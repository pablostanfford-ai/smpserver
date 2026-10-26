import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError, asyncHandler } from '../../lib/errors';
import { requireAuth, requireOwner, requireRole, currentUser, ROLE_WEIGHT } from '../../middleware/auth';
import { adminWriteLimiter } from '../../middleware/rateLimit';
import { audit, notify } from '../../lib/audit';
import { skinUrls, formatUuid } from '../../lib/mojang';
import { syncRankToServer, syncRaceToServer, unsyncRaceFromServer } from '../../lib/rcon';
import { logger } from '../../lib/logger';

export const adminUsersRouter = Router();

adminUsersRouter.use(requireAuth, requireRole('MODERATOR'));

// ── GET /api/admin/users — список с фильтрами и пагинацией ──
const listQuerySchema = z.object({
  q: z.string().trim().max(64).optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MODERATOR', 'PLAYER']).optional(),
  status: z.enum(['ACTIVE', 'MUTED', 'BANNED']).optional(),
  raceId: z.string().max(64).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['createdAt', 'lastLoginAt', 'username', 'balance']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

adminUsersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);

    const where: Prisma.UserWhereInput = {
      ...(q.role ? { role: q.role } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.raceId ? { raceId: q.raceId } : {}),
      ...(q.q
        ? {
            OR: [
              { username: { contains: q.q, mode: 'insensitive' } },
              { mcName: { contains: q.q, mode: 'insensitive' } },
              { email: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { [q.sort]: q.order },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
        select: {
          id: true,
          email: true,
          username: true,
          mcName: true,
          mcUuid: true,
          mcVerified: true,
          role: true,
          status: true,
          rank: true,
          balance: true,
          kills: true,
          deaths: true,
          playtimeMin: true,
          banReason: true,
          bannedUntil: true,
          muteReason: true,
          mutedUntil: true,
          lastLoginAt: true,
          createdAt: true,
          race: { select: { id: true, slug: true, name: true, color: true } },
        },
      }),
    ]);

    return res.json({
      users: users.map((u) => ({ ...u, skins: skinUrls(u.mcUuid, u.mcName) })),
      pagination: { page: q.page, perPage: q.perPage, total, pages: Math.ceil(total / q.perPage) },
    });
  }),
);

// ── GET /api/admin/users/:id — карточка игрока ──────────────
adminUsersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        username: true,
        mcName: true,
        mcUuid: true,
        mcVerified: true,
        role: true,
        status: true,
        rank: true,
        balance: true,
        kills: true,
        deaths: true,
        playtimeMin: true,
        bio: true,
        banReason: true,
        bannedUntil: true,
        muteReason: true,
        mutedUntil: true,
        lastLoginAt: true,
        createdAt: true,
        raceChangedAt: true,
        race: true,
        sessions: {
          where: { revokedAt: null, expiresAt: { gt: new Date() } },
          select: { id: true, userAgent: true, createdAt: true, lastUsedAt: true, expiresAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        activity: { orderBy: { createdAt: 'desc' }, take: 25 },
      },
    });
    if (!user) throw AppError.notFound('Пользователь не найден');

    return res.json({
      user: {
        ...user,
        skins: skinUrls(user.mcUuid, user.mcName),
        uuidFormatted: user.mcUuid ? formatUuid(user.mcUuid) : null,
      },
    });
  }),
);

/** Защита от эскалации: нельзя трогать того, кто равен или выше по весу роли. */
function assertCanManage(actorRole: string, targetRole: string, action: string) {
  const actorWeight = ROLE_WEIGHT[actorRole as keyof typeof ROLE_WEIGHT] ?? 0;
  const targetWeight = ROLE_WEIGHT[targetRole as keyof typeof ROLE_WEIGHT] ?? 0;
  if (targetWeight >= actorWeight) {
    throw AppError.forbidden(`Нельзя ${action}: у цели равные или более высокие права`);
  }
}

// ── PATCH /api/admin/users/:id/role — только OWNER ──────────
adminUsersRouter.patch(
  '/:id/role',
  requireOwner,
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const { role } = z
      .object({ role: z.enum(['OWNER', 'ADMIN', 'MODERATOR', 'PLAYER']) })
      .parse(req.body);

    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, username: true, role: true, mcName: true },
    });
    if (!target) throw AppError.notFound('Пользователь не найден');
    if (target.id === me.id) throw AppError.badRequest('Нельзя изменить собственную роль');

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { role },
      select: { id: true, username: true, role: true },
    });

    await notify(target.id, {
      title: 'Изменена роль на сайте',
      body: `Ваша роль: ${role}.`,
      type: 'SYSTEM',
    });
    await audit({
      level: role === 'OWNER' ? 'SECURITY' : 'INFO',
      action: 'user.role_change',
      message: `${target.username}: ${target.role} → ${role}`,
      actorId: me.id,
      actorName: me.username,
      targetType: 'user',
      targetId: target.id,
      meta: { from: target.role, to: role },
      req,
    });

    return res.json({ user: updated });
  }),
);

// ── POST /api/admin/users/:id/ban ───────────────────────────
adminUsersRouter.post(
  '/:id/ban',
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const data = z
      .object({
        reason: z.string().min(3).max(300),
        until: z.string().datetime().nullable().optional(),
        alsoServer: z.boolean().default(false),
      })
      .parse(req.body);

    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, username: true, role: true, mcName: true },
    });
    if (!target) throw AppError.notFound('Пользователь не найден');
    if (target.id === me.id) throw AppError.badRequest('Нельзя забанить себя');
    assertCanManage(me.role, target.role, 'забанить');

    await prisma.$transaction([
      prisma.user.update({
        where: { id: target.id },
        data: {
          status: 'BANNED',
          banReason: data.reason,
          bannedUntil: data.until ? new Date(data.until) : null,
        },
      }),
      // Бан немедленно отзывает все сессии
      prisma.session.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    let serverResult: { ok: boolean; error?: string } | null = null;
    if (data.alsoServer) {
      const { rconExec } = await import('../../lib/rcon');
      serverResult = await rconExec(`ban ${target.mcName} ${data.reason}`);
      if (!serverResult.ok) logger.warn({ target: target.mcName, err: serverResult.error }, 'rcon.ban_failed');
    }

    await notify(target.id, {
      title: 'Аккаунт заблокирован',
      body: `Причина: ${data.reason}`,
      type: 'MODERATION',
    });
    await audit({
      level: 'SECURITY',
      action: 'user.ban',
      message: `Бан ${target.username} (${target.mcName}): ${data.reason}`,
      actorId: me.id,
      actorName: me.username,
      targetType: 'user',
      targetId: target.id,
      meta: { reason: data.reason, until: data.until ?? null, alsoServer: data.alsoServer },
      req,
    });

    return res.json({ ok: true, serverResult });
  }),
);

// ── POST /api/admin/users/:id/unban ─────────────────────────
adminUsersRouter.post(
  '/:id/unban',
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, username: true, role: true, mcName: true },
    });
    if (!target) throw AppError.notFound('Пользователь не найден');
    assertCanManage(me.role, target.role, 'разбанить');

    await prisma.user.update({
      where: { id: target.id },
      data: { status: 'ACTIVE', banReason: null, bannedUntil: null, muteReason: null, mutedUntil: null },
    });

    const { rconExec } = await import('../../lib/rcon');
    const serverResult = await rconExec(`pardon ${target.mcName}`);

    await notify(target.id, {
      title: 'Аккаунт разблокирован',
      body: 'Доступ к сайту и серверу восстановлен.',
      type: 'MODERATION',
    });
    await audit({
      level: 'SECURITY',
      action: 'user.unban',
      message: `Разбан ${target.username}`,
      actorId: me.id,
      actorName: me.username,
      targetType: 'user',
      targetId: target.id,
      req,
    });

    return res.json({ ok: true, serverResult });
  }),
);

// ── POST /api/admin/users/:id/mute ──────────────────────────
adminUsersRouter.post(
  '/:id/mute',
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const data = z
      .object({
        reason: z.string().min(3).max(300),
        until: z.string().datetime().nullable().optional(),
      })
      .parse(req.body);

    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, username: true, role: true, mcName: true },
    });
    if (!target) throw AppError.notFound('Пользователь не найден');
    assertCanManage(me.role, target.role, 'замутить');

    await prisma.user.update({
      where: { id: target.id },
      data: {
        status: 'MUTED',
        muteReason: data.reason,
        mutedUntil: data.until ? new Date(data.until) : null,
      },
    });

    await notify(target.id, {
      title: 'Вы получили мут',
      body: `Причина: ${data.reason}`,
      type: 'MODERATION',
    });
    await audit({
      level: 'WARN',
      action: 'user.mute',
      message: `Мут ${target.username}: ${data.reason}`,
      actorId: me.id,
      actorName: me.username,
      targetType: 'user',
      targetId: target.id,
      req,
    });

    return res.json({ ok: true });
  }),
);

// ── POST /api/admin/users/:id/unmute ────────────────────────
adminUsersRouter.post(
  '/:id/unmute',
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, username: true, role: true, status: true },
    });
    if (!target) throw AppError.notFound('Пользователь не найден');
    assertCanManage(me.role, target.role, 'снять мут');

    await prisma.user.update({
      where: { id: target.id },
      data: {
        status: target.status === 'MUTED' ? 'ACTIVE' : target.status,
        muteReason: null,
        mutedUntil: null,
      },
    });

    await audit({
      action: 'user.unmute',
      message: `Снят мут с ${target.username}`,
      actorId: me.id,
      actorName: me.username,
      targetType: 'user',
      targetId: target.id,
      req,
    });

    return res.json({ ok: true });
  }),
);

// ── POST /api/admin/users/:id/race — принудительная смена расы
adminUsersRouter.post(
  '/:id/race',
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const { raceSlug } = z
      .object({ raceSlug: z.string().min(1).max(64).nullable() })
      .parse(req.body);

    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, username: true, mcName: true, race: { select: { slug: true, name: true } } },
    });
    if (!target) throw AppError.notFound('Пользователь не найден');
    assertCanManage(me.role, (await prisma.user.findUniqueOrThrow({ where: { id: target.id }, select: { role: true } })).role, 'сменить расу');

    if (raceSlug === null) {
      await prisma.user.update({
        where: { id: target.id },
        data: { raceId: null, raceChangedAt: new Date() },
      });
      if (target.race) void unsyncRaceFromServer(target.mcName, target.race.slug);

      await audit({
        action: 'user.race_reset',
        message: `${target.username}: раса сброшена`,
        actorId: me.id,
        actorName: me.username,
        targetType: 'user',
        targetId: target.id,
        req,
      });
      return res.json({ ok: true, race: null });
    }

    const race = await prisma.race.findUnique({
      where: { slug: raceSlug },
      select: { id: true, slug: true, name: true },
    });
    if (!race) throw AppError.notFound('Раса не найдена');

    await prisma.user.update({
      where: { id: target.id },
      data: { raceId: race.id, raceChangedAt: new Date() },
    });

    if (target.race) void unsyncRaceFromServer(target.mcName, target.race.slug);
    const sync = await syncRaceToServer(target.mcName, race.slug);

    await notify(target.id, {
      title: 'Раса изменена администратором',
      body: `Ваша новая раса: ${race.name}.`,
      type: 'RACE',
      link: `/races/${race.slug}`,
    });
    await audit({
      level: 'WARN',
      action: 'user.race_forced',
      message: `${target.username}: ${target.race?.slug ?? '—'} → ${race.slug}`,
      actorId: me.id,
      actorName: me.username,
      targetType: 'user',
      targetId: target.id,
      meta: { rconOk: sync.ok },
      req,
    });

    return res.json({ ok: true, race, syncedToServer: sync.ok });
  }),
);

// ── POST /api/admin/users/:id/rank ──────────────────────────
adminUsersRouter.post(
  '/:id/rank',
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const { rank } = z
      .object({ rank: z.string().min(1).max(32).regex(/^[A-Za-z0-9_-]+$/) })
      .parse(req.body);

    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, username: true, mcName: true, rank: true, role: true },
    });
    if (!target) throw AppError.notFound('Пользователь не найден');
    assertCanManage(me.role, target.role, 'изменить ранг');

    await prisma.user.update({ where: { id: target.id }, data: { rank } });
    const sync = await syncRankToServer(target.mcName, rank);

    await notify(target.id, {
      title: 'Ваш ранг обновлён',
      body: `Новый ранг: ${rank}.`,
      type: 'REWARD',
    });
    await audit({
      action: 'user.rank_change',
      message: `${target.username}: ${target.rank} → ${rank}`,
      actorId: me.id,
      actorName: me.username,
      targetType: 'user',
      targetId: target.id,
      req,
    });

    return res.json({ ok: true, rank, syncedToServer: sync.ok });
  }),
);

// ── POST /api/admin/users/:id/balance ───────────────────────
adminUsersRouter.post(
  '/:id/balance',
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const { amount, reason } = z
      .object({
        amount: z.number().int().min(-1_000_000).max(1_000_000),
        reason: z.string().min(3).max(200),
      })
      .parse(req.body);

    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, username: true, balance: true, role: true },
    });
    if (!target) throw AppError.notFound('Пользователь не найден');
    assertCanManage(me.role, target.role, 'изменить баланс');

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { balance: { increment: amount } },
      select: { id: true, balance: true },
    });

    await notify(target.id, {
      title: amount >= 0 ? `Начислено ${amount} монет` : `Списано ${Math.abs(amount)} монет`,
      body: reason,
      type: 'REWARD',
    });
    await audit({
      action: 'user.balance_change',
      message: `${target.username}: ${amount > 0 ? '+' : ''}${amount} (${reason})`,
      actorId: me.id,
      actorName: me.username,
      targetType: 'user',
      targetId: target.id,
      meta: { amount, before: target.balance, after: updated.balance },
      req,
    });

    return res.json({ balance: updated.balance });
  }),
);

// ── DELETE /api/admin/users/:id — только OWNER ──────────────
adminUsersRouter.delete(
  '/:id',
  requireOwner,
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, username: true, role: true },
    });
    if (!target) throw AppError.notFound('Пользователь не найден');
    if (target.id === me.id) throw AppError.badRequest('Нельзя удалить собственный аккаунт');
    assertCanManage(me.role, target.role, 'удалить');

    await prisma.user.delete({ where: { id: target.id } });
    await audit({
      level: 'SECURITY',
      action: 'user.delete',
      message: `Удалён аккаунт ${target.username}`,
      actorId: me.id,
      actorName: me.username,
      targetType: 'user',
      targetId: target.id,
      req,
    });

    return res.json({ ok: true });
  }),
);
