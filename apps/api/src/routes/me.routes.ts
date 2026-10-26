import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../lib/errors';
import { requireAuth, currentUser } from '../middleware/auth';
import { skinUrls, formatUuid } from '../lib/mojang';
import { syncRaceToServer, unsyncRaceFromServer } from '../lib/rcon';
import { audit, notify, trackActivity } from '../lib/audit';
import { getSettings } from '../services/settings.service';
import { logger } from '../lib/logger';

export const meRouter = Router();

meRouter.use(requireAuth);

/** Смена расы: не чаще одного раза в N дней (настраивается константой ниже). */
const RACE_COOLDOWN_DAYS = 7;

// ── GET /api/me/dashboard ───────────────────────────────────
meRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const me = currentUser(req);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: me.id },
      select: {
        id: true,
        username: true,
        email: true,
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
        avatarUrl: true,
        raceChangedAt: true,
        banReason: true,
        bannedUntil: true,
        muteReason: true,
        mutedUntil: true,
        lastLoginAt: true,
        createdAt: true,
        race: true,
      },
    });

    const [activity, notifications, unreadCount, totalPlayers, raceDistribution] =
      await Promise.all([
        prisma.activityEvent.findMany({
          where: { userId: me.id },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.notification.findMany({
          where: { userId: me.id },
          orderBy: { createdAt: 'desc' },
          take: 15,
        }),
        prisma.notification.count({ where: { userId: me.id, readAt: null } }),
        prisma.user.count({ where: { status: { not: 'BANNED' } } }),
        prisma.user.groupBy({
          by: ['raceId'],
          where: { raceId: { not: null } },
          _count: { _all: true },
        }),
      ]);

    const canChangeRace =
      !user.raceChangedAt ||
      Date.now() - user.raceChangedAt.getTime() > RACE_COOLDOWN_DAYS * 86_400_000;

    const nextRaceChangeAt = user.raceChangedAt
      ? new Date(user.raceChangedAt.getTime() + RACE_COOLDOWN_DAYS * 86_400_000)
      : null;

    return res.json({
      user: {
        ...user,
        skins: skinUrls(user.mcUuid, user.mcName),
        uuidFormatted: user.mcUuid ? formatUuid(user.mcUuid) : null,
        kdRatio: user.deaths === 0 ? user.kills : Number((user.kills / user.deaths).toFixed(2)),
      },
      activity,
      notifications,
      unreadCount,
      stats: {
        totalPlayers,
        raceDistribution: raceDistribution.map((r) => ({
          raceId: r.raceId,
          count: r._count._all,
        })),
      },
      raceChange: { canChange: canChangeRace, cooldownDays: RACE_COOLDOWN_DAYS, nextAt: nextRaceChangeAt },
    });
  }),
);

// ── POST /api/me/race — смена расы ──────────────────────────
const chooseRaceSchema = z.object({ raceSlug: z.string().min(1).max(64) });

meRouter.post(
  '/race',
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const { raceSlug } = chooseRaceSchema.parse(req.body);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: me.id },
      include: { race: { select: { slug: true, name: true } } },
    });

    if (user.raceChangedAt) {
      const nextAt = user.raceChangedAt.getTime() + RACE_COOLDOWN_DAYS * 86_400_000;
      if (Date.now() < nextAt) {
        throw AppError.conflict(
          `Сменить расу можно не чаще раза в ${RACE_COOLDOWN_DAYS} дней. Следующая попытка: ${new Date(nextAt).toLocaleDateString('ru-RU')}`,
        );
      }
    }

    const race = await prisma.race.findUnique({
      where: { slug: raceSlug },
      select: { id: true, slug: true, name: true, isActive: true, isSelectable: true },
    });
    if (!race || !race.isActive || !race.isSelectable) {
      throw AppError.badRequest('Эта раса недоступна для выбора');
    }
    if (user.raceId === race.id) {
      throw AppError.badRequest('Вы уже играете за эту расу');
    }

    const previousSlug = user.race?.slug ?? null;
    await prisma.user.update({
      where: { id: me.id },
      data: { raceId: race.id, raceChangedAt: new Date() },
    });

    // Синхронизация с игровым сервером (не блокирует ответ при недоступном RCON)
    if (previousSlug) void unsyncRaceFromServer(user.mcName, previousSlug);
    const sync = await syncRaceToServer(user.mcName, race.slug);

    await trackActivity(me.id, 'race.changed', `Раса изменена на ${race.name}`, {
      from: previousSlug,
      to: race.slug,
    });
    await notify(me.id, {
      title: `Раса изменена: ${race.name}`,
      body: sync.ok
        ? 'Изменения применены на игровом сервере.'
        : 'Изменения сохранены на сайте. На сервере применится при следующем входе.',
      type: 'RACE',
      link: `/races/${race.slug}`,
    });
    await audit({
      action: 'race.self_change',
      message: `${user.username}: ${previousSlug ?? '—'} → ${race.slug}`,
      actorId: me.id,
      actorName: user.username,
      targetType: 'user',
      targetId: me.id,
      meta: { from: previousSlug, to: race.slug, rconOk: sync.ok },
      req,
    });

    if (!sync.ok) logger.warn({ mcName: user.mcName, err: sync.error }, 'rcon.race_sync_failed');
    return res.json({ ok: true, race, syncedToServer: sync.ok });
  }),
);

// ── GET /api/me/notifications ───────────────────────────────
meRouter.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const items = await prisma.notification.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json({ notifications: items });
  }),
);

// ── POST /api/me/notifications/read ─────────────────────────
meRouter.post(
  '/notifications/read',
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const { ids } = z
      .object({ ids: z.array(z.string()).max(100).optional() })
      .parse(req.body ?? {});

    await prisma.notification.updateMany({
      where: { userId: me.id, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    });
    return res.json({ ok: true });
  }),
);

// ── PATCH /api/me/profile ───────────────────────────────────
meRouter.patch(
  '/profile',
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const data = z
      .object({
        bio: z.string().max(500).optional(),
        avatarUrl: z.string().url().max(500).or(z.literal('')).optional(),
      })
      .parse(req.body);

    const user = await prisma.user.update({
      where: { id: me.id },
      data: {
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
      },
      select: { id: true, bio: true, avatarUrl: true },
    });

    return res.json({ user });
  }),
);

// ── GET /api/me/settings (глобальные настройки для UI) ──────
meRouter.get(
  '/site-settings',
  asyncHandler(async (_req, res) => {
    const settings = await getSettings();
    // Секретные ключи в клиент не отдаём
    const { 'maintenance.message': mm, ...safe } = settings;
    return res.json({ settings: { ...safe, 'maintenance.message': mm } });
  }),
);
