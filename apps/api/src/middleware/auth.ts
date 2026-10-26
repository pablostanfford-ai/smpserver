import type { Request, RequestHandler } from 'express';
import type { Role, UserStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { ACCESS_COOKIE, verifyAccessToken } from '../lib/tokens';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: Role;
  status: UserStatus;
  mcName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Иерархия ролей: owner может всё, что может admin, и т.д. */
export const ROLE_WEIGHT: Record<Role, number> = {
  OWNER: 40,
  ADMIN: 30,
  MODERATOR: 20,
  PLAYER: 10,
};

/**
 * Аутентификация по access-токену из httpOnly cookie (или Bearer-заголовка для API-клиентов).
 * Дополнительно сверяемся с БД: забаненный или удалённый пользователь теряет доступ немедленно,
 * даже если его JWT ещё не истёк.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const bearer = req.get('authorization');
    const raw = bearer?.startsWith('Bearer ')
      ? bearer.slice(7)
      : (req.cookies?.[ACCESS_COOKIE] as string | undefined);

    if (!raw) throw AppError.unauthorized();

    const payload = verifyAccessToken(raw);
    if (!payload) throw AppError.unauthorized('Сессия истекла, войдите заново');

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        mcName: true,
      },
    });

    if (!user) throw AppError.unauthorized('Пользователь не найден');
    if (user.status === 'BANNED') throw AppError.forbidden('Аккаунт заблокирован');

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
};

/** Опциональная аутентификация — для публичных страниц с персонализацией. */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const raw = req.cookies?.[ACCESS_COOKIE] as string | undefined;
  if (!raw) return next();
  const payload = verifyAccessToken(raw);
  if (!payload) return next();
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, username: true, role: true, status: true, mcName: true },
  });
  if (user && user.status !== 'BANNED') req.user = user;
  return next();
};

/** Проверка минимальной роли. `requireRole('ADMIN')` пропускает ADMIN и OWNER. */
export const requireRole =
  (minRole: Role): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (ROLE_WEIGHT[req.user.role] < ROLE_WEIGHT[minRole]) {
      return next(AppError.forbidden('Недостаточно прав для этого действия'));
    }
    return next();
  };

/**
 * Строгий владелец — только `role === 'OWNER'` из БД.
 * Используется для CMS: расы, настройки сайта, управление ролями.
 */
export const requireOwner: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(AppError.unauthorized());
  if (req.user.role !== 'OWNER') {
    return next(AppError.forbidden('Доступ только для владельца сервера'));
  }
  return next();
};

export function currentUser(req: Request): AuthUser {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}
