import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { AppError, asyncHandler } from '../../lib/errors';
import { requireAuth, requireOwner, requireRole, currentUser } from '../../middleware/auth';
import { adminWriteLimiter } from '../../middleware/rateLimit';
import { raceCreateSchema, raceUpdateSchema } from '../../schemas/race.schema';
import { slugify } from '../../services/races.service';
import { audit } from '../../lib/audit';
import { syncRaceToServer } from '../../lib/rcon';
import { logger } from '../../lib/logger';

export const adminRacesRouter = Router();

adminRacesRouter.use(requireAuth, requireRole('MODERATOR'));

// ── GET /api/admin/races — полный список для CMS ────────────
adminRacesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [races, counts] = await Promise.all([
      prisma.race.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      prisma.user.groupBy({ by: ['raceId'], _count: { _all: true } }),
    ]);
    const countMap = new Map(counts.map((c) => [c.raceId, c._count._all]));

    return res.json({
      races: races.map((r) => ({ ...r, playerCount: countMap.get(r.id) ?? 0 })),
    });
  }),
);

// ── GET /api/admin/races/:id ────────────────────────────────
adminRacesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const race = await prisma.race.findUnique({ where: { id: req.params.id } });
    if (!race) throw AppError.notFound('Раса не найдена');
    return res.json({ race });
  }),
);

// ── POST /api/admin/races — только OWNER ────────────────────
adminRacesRouter.post(
  '/',
  requireOwner,
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const data = raceCreateSchema.parse(req.body);

    const slug = data.slug ?? slugify(data.name);
    if (!slug) throw AppError.badRequest('Не удалось сформировать slug, укажите его вручную');

    const exists = await prisma.race.findUnique({ where: { slug }, select: { id: true } });
    if (exists) throw AppError.conflict(`Раса со slug «${slug}» уже существует`);

    const race = await prisma.race.create({
      data: {
        slug,
        name: data.name,
        tagline: data.tagline,
        description: data.description,
        lore: data.lore,
        icon: data.icon,
        bannerUrl: data.bannerUrl || null,
        color: data.color,
        accentColor: data.accentColor,
        difficulty: data.difficulty,
        stats: data.stats,
        passives: data.passives,
        actives: data.actives,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        playstyle: data.playstyle,
        recommended: data.recommended,
        isActive: data.isActive,
        isSelectable: data.isSelectable,
        sortOrder: data.sortOrder,
      },
    });

    await audit({
      action: 'race.create',
      message: `Создана раса «${race.name}» (${race.slug})`,
      actorId: me.id,
      actorName: me.username,
      targetType: 'race',
      targetId: race.id,
      req,
    });

    return res.status(201).json({ race });
  }),
);

// ── PATCH /api/admin/races/:id ──────────────────────────────
adminRacesRouter.patch(
  '/:id',
  requireOwner,
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const data = raceUpdateSchema.parse(req.body);

    const before = await prisma.race.findUnique({ where: { id: req.params.id } });
    if (!before) throw AppError.notFound('Раса не найдена');

    if (data.slug && data.slug !== before.slug) {
      const clash = await prisma.race.findUnique({ where: { slug: data.slug }, select: { id: true } });
      if (clash) throw AppError.conflict('Slug уже занят другой расой');
    }

    const race = await prisma.race.update({
      where: { id: before.id },
      data: {
        ...data,
        ...(data.bannerUrl !== undefined ? { bannerUrl: data.bannerUrl || null } : {}),
      },
    });

    await audit({
      action: 'race.update',
      message: `Изменена раса «${race.name}»`,
      actorId: me.id,
      actorName: me.username,
      targetType: 'race',
      targetId: race.id,
      meta: { fields: Object.keys(data) },
      req,
    });

    return res.json({ race });
  }),
);

// ── DELETE /api/admin/races/:id ─────────────────────────────
adminRacesRouter.delete(
  '/:id',
  requireOwner,
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);

    const race = await prisma.race.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { users: true } } },
    });
    if (!race) throw AppError.notFound('Раса не найдена');

    // Мягкое удаление: если за расой есть игроки — деактивируем, а не рвём связи
    if (race._count.users > 0) {
      await prisma.race.update({
        where: { id: race.id },
        data: { isActive: false, isSelectable: false },
      });
      await audit({
        level: 'WARN',
        action: 'race.deactivate',
        message: `Раса «${race.name}» деактивирована (${race._count.users} игроков)`,
        actorId: me.id,
        actorName: me.username,
        targetType: 'race',
        targetId: race.id,
        req,
      });
      return res.json({
        ok: true,
        softDeleted: true,
        message: `Раса деактивирована: за ней закреплено ${race._count.users} игроков.`,
      });
    }

    await prisma.race.delete({ where: { id: race.id } });
    await audit({
      level: 'WARN',
      action: 'race.delete',
      message: `Удалена раса «${race.name}» (${race.slug})`,
      actorId: me.id,
      actorName: me.username,
      targetType: 'race',
      targetId: race.id,
      req,
    });
    return res.json({ ok: true, softDeleted: false });
  }),
);

// ── POST /api/admin/races/:id/reassign — принудительная смена расы игрокам
adminRacesRouter.post(
  '/:id/sync-all',
  requireOwner,
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const race = await prisma.race.findUnique({
      where: { id: req.params.id },
      include: { users: { select: { mcName: true } } },
    });
    if (!race) throw AppError.notFound('Раса не найдена');

    const results = await Promise.all(
      race.users.map(async (u) => ({ mcName: u.mcName, ...(await syncRaceToServer(u.mcName, race.slug)) })),
    );
    const failed = results.filter((r) => !r.ok);

    await audit({
      level: failed.length ? 'WARN' : 'INFO',
      action: 'race.sync_all',
      message: `RCON-синхронизация расы «${race.name}»: ${results.length - failed.length}/${results.length} успешно`,
      actorId: me.id,
      actorName: me.username,
      targetType: 'race',
      targetId: race.id,
      meta: { total: results.length, failed: failed.length },
      req,
    });
    if (failed.length) logger.warn({ failed }, 'rcon.bulk_sync_partial');

    return res.json({ ok: failed.length === 0, total: results.length, failed });
  }),
);
