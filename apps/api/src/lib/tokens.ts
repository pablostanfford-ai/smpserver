import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { env } from '../config/env';
import type { Role } from '@prisma/client';

export interface AccessPayload {
  sub: string;
  role: Role;
  username: string;
  type: 'access';
}

export const ACCESS_COOKIE = 'aether_at';
export const REFRESH_COOKIE = 'aether_rt';
export const CSRF_COOKIE = 'aether_csrf';
export const CSRF_HEADER = 'x-csrf-token';

export function signAccessToken(payload: Omit<AccessPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
    issuer: 'aethersmp',
    audience: 'aethersmp-web',
  });
}

export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: 'aethersmp',
      audience: 'aethersmp-web',
    }) as AccessPayload;
    return decoded.type === 'access' ? decoded : null;
  } catch {
    return null;
  }
}

/** Refresh-токен — случайные 48 байт; в БД хранится только SHA-256 хэш. */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(48).toString('base64url');
  return { token, hash: sha256(token) };
}

export const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

/** Детерминированный, но необратимый хэш IP для логов (152-ФЗ / GDPR). */
export const hashIp = (ip: string) => sha256(`${env.IP_HASH_SALT}:${ip}`).slice(0, 32);

const baseCookie = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax' as const,
  path: '/',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...baseCookie, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...baseCookie, maxAge: env.refreshTokenTtlMs });
  // CSRF-токен должен читаться JS → httpOnly: false
  res.cookie(CSRF_COOKIE, randomToken(24), {
    ...baseCookie,
    httpOnly: false,
    maxAge: env.refreshTokenTtlMs,
  });
}

export function clearAuthCookies(res: Response) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE]) {
    res.clearCookie(name, baseCookie);
  }
}

export function ensureCsrfCookie(res: Response, existing?: string) {
  if (existing) return existing;
  const token = randomToken(24);
  res.cookie(CSRF_COOKIE, token, { ...baseCookie, httpOnly: false, maxAge: env.refreshTokenTtlMs });
  return token;
}
