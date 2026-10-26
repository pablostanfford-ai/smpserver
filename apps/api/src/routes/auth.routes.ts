import { Router, type Request } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../lib/errors';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  clearAuthCookies,
  ensureCsrfCookie,
  generateRefreshToken,
  hashIp,
  setAuthCookies,
  sha256,
  signAccessToken,
} from '../lib/tokens';
import { loginSchema, registerSchema, changePasswordSchema } from '../schemas/auth.schema';
import { requireAuth, optionalAuth, currentUser } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { lookupMojangProfile } from '../lib/mojang';
import { audit, notify, trackActivity } from '../lib/audit';
import { env } from '../config/env';
import { getSetting } from '../services/settings.service';
import { syncRaceToServer } from '../lib/rcon';
import { logger } from '../lib/logger';

export const authRouter = Router();

const userSelect = {
  id: true,
  email: true,
  username: true,
  mcName: true,
  mcUuid: true,
  role: true,
  status: true,
  rank: true,
  balance: true,
  race: { select: { id: true, slug: true, name: true, color: true, icon: true } },
} as const;

/**
 * Создаёт refresh-сессию в БД и возвращает пару токенов.
 * ВАЖНО: в cookie кладём ровно тот токен, чей хэш записан в БД.
 */
async function createSession(
  user: { id: string; role: Role; username: string },
  req: Request,
): Promise<{ accessToken: string; refreshToken: string }> {
  const { token, hash } = generateRefreshToken();

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hash,
      userAgent: req.get('user-agent')?.slice(0, 250) ?? '',
      ipHash: req.ip ? hashIp(req.ip) : '',
      expiresAt: new Date(Date.now() + env.refreshTokenTtlMs),
    },
  });

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    username: user.username,
  });

  return { accessToken, refreshToken: token };
}

// ── POST /api/auth/register ─────────────────────────────────
authRouter.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);

    if (!(await getSetting('registration.enabled'))) {
      throw AppError.forbidden('Регистрация временно закрыта');
    }

    const [emailTaken, usernameTaken] = await Promise.all([
      prisma.user.findUnique({ where: { email: data.email }, select: { id: true } }),
      prisma.user.findUnique({ where: { username: data.username }, select: { id: true } }),
    ]);
    if (emailTaken) throw AppError.conflict('Этот email уже зарегистрирован');
    if (usernameTaken) throw AppError.conflict('Этот логин уже занят');

    // Проверка ника в Mojang + уникальность привязки
    const profile = await lookupMojangProfile(data.mcName);
    if (!profile && !env.ALLOW_UNVERIFIED_MC) {
      throw AppError.badRequest('Аккаунт Minecraft с таким ником не найден');
    }

    const mcName = profile?.name ?? data.mcName;
    const mcUuid = profile?.uuid ?? null;

    if (mcUuid) {
      const mcTaken = await prisma.user.findUnique({ where: { mcUuid }, select: { id: true } });
      if (mcTaken) throw AppError.conflict('Этот Minecraft-аккаунт уже привязан');
    }

    let raceId: string | null = null;
    let raceSlug: string | null = null;
    if (data.raceSlug) {
      const race = await prisma.race.findUnique({
        where: { slug: data.raceSlug },
        select: { id: true, slug: true, isActive: true, isSelectable: true },
      });
      if (!race || !race.isActive || !race.isSelectable) {
        throw AppError.badRequest('Эта раса недоступна для выбора');
      }
      raceId = race.id;
      raceSlug = race.slug;
    }

    const created = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash: await hashPassword(data.password),
        mcName,
        mcUuid,
        mcVerified: Boolean(profile),
        raceId,
        raceChangedAt: raceId ? new Date() : null,
        lastLoginAt: new Date(),
      },
      select: userSelect,
    });

    await trackActivity(created.id, 'account.created', 'Аккаунт создан');
    if (raceId && raceSlug && created.race) {
      await trackActivity(created.id, 'race.chosen', `Выбрана раса ${created.race.name}`, {
        race: raceSlug,
      });
      void syncRaceToServer(mcName, raceSlug).then((r) => {
        if (!r.ok) logger.warn({ mcName, err: r.error }, 'rcon.race_sync_failed_on_register');
      });
    }

    await notify(created.id, {
      title: 'Добро пожаловать на AetherSMP!',
      body: 'Аккаунт создан. Заходите на сервер и выбирайте свой путь.',
      type: 'SYSTEM',
      link: '/dashboard',
    });
    await audit({
      action: 'auth.register',
      message: `Регистрация ${created.username} (${mcName})`,
      actorId: created.id,
      actorName: created.username,
      targetType: 'user',
      targetId: created.id,
      req,
    });

    const { accessToken, refreshToken } = await createSession(created, req);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({ user: created, csrfToken: ensureCsrfCookie(res) });
  }),
);

// ── POST /api/auth/login ────────────────────────────────────
authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { login, password } = loginSchema.parse(req.body);
    const normalized = login.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalized }, { username: login.trim() }, { mcName: login.trim() }],
      },
    });

    // Единый ответ на неверный логин и пароль — не раскрываем существование аккаунта
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      await audit({
        level: 'SECURITY',
        action: 'auth.login_failed',
        message: `Неудачный вход: ${login.slice(0, 64)}`,
        meta: { login: login.slice(0, 64) },
        req,
      });
      throw AppError.unauthorized('Неверный логин или пароль');
    }

    if (user.status === 'BANNED') {
      throw AppError.forbidden(
        user.banReason ? `Аккаунт заблокирован: ${user.banReason}` : 'Аккаунт заблокирован',
      );
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await trackActivity(user.id, 'login', 'Вход на сайт');
    await audit({
      action: 'auth.login',
      message: `Вход ${user.username}`,
      actorId: user.id,
      actorName: user.username,
      req,
    });

    const { accessToken, refreshToken } = await createSession(user, req);
    setAuthCookies(res, accessToken, refreshToken);

    const safe = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: userSelect,
    });
    return res.json({ user: safe, csrfToken: ensureCsrfCookie(res) });
  }),
);

// ── POST /api/auth/refresh ──────────────────────────────────
authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.aether_rt as string | undefined;
    if (!raw) throw AppError.unauthorized('Нет refresh-токена');

    const session = await prisma.session.findUnique({
      where: { refreshTokenHash: sha256(raw) },
      include: { user: { select: userSelect } },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      clearAuthCookies(res);
      throw AppError.unauthorized('Сессия истекла, войдите заново');
    }
    if (session.user.status === 'BANNED') {
      clearAuthCookies(res);
      throw AppError.forbidden('Аккаунт заблокирован');
    }

    // Ротация: старую сессию отзываем, выдаём новую пару
    const next = generateRefreshToken();
    await prisma.$transaction([
      prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date(), lastUsedAt: new Date() },
      }),
      prisma.session.create({
        data: {
          userId: session.userId,
          refreshTokenHash: next.hash,
          userAgent: req.get('user-agent')?.slice(0, 250) ?? '',
          ipHash: req.ip ? hashIp(req.ip) : '',
          expiresAt: new Date(Date.now() + env.refreshTokenTtlMs),
        },
      }),
    ]);

    const accessToken = signAccessToken({
      sub: session.user.id,
      role: session.user.role,
      username: session.user.username,
    });
    setAuthCookies(res, accessToken, next.token);

    return res.json({ user: session.user, csrfToken: ensureCsrfCookie(res) });
  }),
);

// ── POST /api/auth/logout ───────────────────────────────────
authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.aether_rt as string | undefined;
    if (raw) {
      await prisma.session
        .updateMany({
          where: { refreshTokenHash: sha256(raw), revokedAt: null },
          data: { revokedAt: new Date() },
        })
        .catch(() => undefined);
    }
    clearAuthCookies(res);
    return res.json({ ok: true });
  }),
);

// ── GET /api/auth/me ────────────────────────────────────────
authRouter.get(
  '/me',
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) return res.json({ user: null, csrfToken: ensureCsrfCookie(res) });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: userSelect,
    });
    return res.json({ user, csrfToken: ensureCsrfCookie(res) });
  }),
);

// ── POST /api/auth/change-password ──────────────────────────
authRouter.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const data = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await verifyPassword(user.passwordHash, data.currentPassword))) {
      throw AppError.badRequest('Текущий пароль неверен');
    }

    const newHash = await hashPassword(data.newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: me.id }, data: { passwordHash: newHash } }),
      // Смена пароля разлогинивает все прочие устройства
      prisma.session.updateMany({
        where: { userId: me.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await audit({
      level: 'SECURITY',
      action: 'auth.password_changed',
      message: `Смена пароля ${me.username}`,
      actorId: me.id,
      actorName: me.username,
      req,
    });

    clearAuthCookies(res);
    return res.json({ ok: true, message: 'Пароль изменён. Войдите заново.' });
  }),
);
