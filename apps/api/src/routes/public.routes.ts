import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/errors';
import { listPublicRaces, getPublicRaceBySlug } from '../services/races.service';

export const publicRacesRouter = Router();

const slugParam = z.object({ slug: z.string().min(1).max(64) });

// GET /api/races — список активных рас с количеством игроков
publicRacesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const races = await listPublicRaces();
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    return res.json({ races });
  }),
);

// GET /api/races/:slug — детальная страница расы
publicRacesRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const { slug } = slugParam.parse(req.params);
    const race = await getPublicRaceBySlug(slug);
    if (!race) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Раса не найдена' } });
    return res.json({ race });
  }),
);
