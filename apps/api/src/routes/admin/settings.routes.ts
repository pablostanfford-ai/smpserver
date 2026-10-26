import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireOwner, currentUser } from '../../middleware/auth';
import { asyncHandler } from '../../lib/errors';
import { adminWriteLimiter } from '../../middleware/rateLimit';
import { getSettings, updateSettings, SETTING_KEYS } from '../../services/settings.service';
import { audit } from '../../lib/audit';

export const adminSettingsRouter = Router();

adminSettingsRouter.use(requireAuth, requireOwner);

// GET /api/admin/settings
adminSettingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    return res.json({ settings: await getSettings(), keys: SETTING_KEYS });
  }),
);

/**
 * PATCH /api/admin/settings
 * Принимаем произвольный объект, но применяем только известные ключи
 * с проверкой типа значения (string | boolean).
 */
adminSettingsRouter.patch(
  '/',
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const body = z.record(z.union([z.string(), z.boolean(), z.number()])).parse(req.body);

    const patch: Record<string, string | boolean> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!(SETTING_KEYS as string[]).includes(key)) continue;
      patch[key] = typeof value === 'number' ? String(value) : value;
    }

    const settings = await updateSettings(patch, me.id);

    await audit({
      level: 'WARN',
      action: 'settings.update',
      message: `Изменены настройки: ${Object.keys(patch).join(', ') || '—'}`,
      actorId: me.id,
      actorName: me.username,
      targetType: 'settings',
      meta: { keys: Object.keys(patch) },
      req,
    });

    return res.json({ settings });
  }),
);
