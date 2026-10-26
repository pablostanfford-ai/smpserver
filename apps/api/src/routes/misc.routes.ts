import { Router } from 'express';
import { asyncHandler } from '../lib/errors';
import { getSettings } from '../services/settings.service';
import { pingRcon } from '../lib/rcon';
import { prisma } from '../lib/prisma';
import { mojangLimiter } from '../middleware/rateLimit';
import { lookupMojangProfile, isValidMcName, skinUrls } from '../lib/mojang';
import { checkMcNameSchema } from '../schemas/auth.schema';
import { env } from '../config/env';

export const miscRouter = Router();

// GET /api/health — для docker healthcheck и мониторинга
miscRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const checks: Record<string, string> = {};

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.db = 'ok';
    } catch {
      checks.db = 'fail';
    }

    const healthy = Object.values(checks).every((v) => v === 'ok');
    return res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      checks,
      rconEnabled: env.RCON_ENABLED,
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version ?? '1.0.0',
    });
  }),
);

// GET /api/settings — публичные настройки сайта (без секретов)
miscRouter.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    const s = await getSettings();
    res.setHeader('Cache-Control', 'public, max-age=15');
    return res.json({
      settings: {
        'site.name': s['site.name'],
        'site.tagline': s['site.tagline'],
        'site.description': s['site.description'],
        'site.logoUrl': s['site.logoUrl'],
        'site.discordUrl': s['site.discordUrl'],
        'site.vkUrl': s['site.vkUrl'],
        'site.youtubeUrl': s['site.youtubeUrl'],
        'site.telegramUrl': s['site.telegramUrl'],
        'site.heroImageUrl': s['site.heroImageUrl'],
        'server.ip': s['server.ip'],
        'server.version': s['server.version'],
        'server.port': s['server.port'],
        'maintenance.enabled': s['maintenance.enabled'],
        'maintenance.message': s['maintenance.message'],
        'registration.enabled': s['registration.enabled'],
        'races.enabled': s['races.enabled'],
      },
    });
  }),
);

// GET /api/status/rcon — состояние моста к игровому серверу (для админки)
miscRouter.get(
  '/status/rcon',
  asyncHandler(async (_req, res) => {
    if (!env.RCON_ENABLED) {
      return res.json({ enabled: false, ok: false, message: 'RCON отключён в конфигурации' });
    }
    const result = await pingRcon();
    return res.json({ enabled: true, ok: result.ok, response: result.response, error: result.error });
  }),
);

// POST /api/mc/check — проверка ника Minecraft до регистрации
miscRouter.post(
  '/mc/check',
  mojangLimiter,
  asyncHandler(async (req, res) => {
    const { mcName } = checkMcNameSchema.parse(req.body);
    if (!isValidMcName(mcName)) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Ник: 3–16 символов, латиница, цифры и «_»' },
      });
    }

    const profile = await lookupMojangProfile(mcName);
    if (!profile) {
      return res.json({ found: false, mcName });
    }
    return res.json({
      found: true,
      profile: { ...profile, uuidFormatted: profile.uuid, skins: skinUrls(profile.uuid, profile.name) },
    });
  }),
);
