import 'dotenv/config';
import { z } from 'zod';

/**
 * Валидация окружения на старте: приложение не поднимется с неверным конфигом.
 * Все секреты читаются только здесь, остальной код импортирует `env`.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),

  API_PORT: z.coerce.number().int().positive().default(4000),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET: минимум 32 символа'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET: минимум 32 символа'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_DOMAIN: z.string().default(''),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  MOJANG_TIMEOUT_MS: z.coerce.number().int().positive().default(6000),
  ALLOW_UNVERIFIED_MC: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  RCON_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  RCON_HOST: z.string().default('127.0.0.1'),
  RCON_PORT: z.coerce.number().int().positive().default(25575),
  RCON_PASSWORD: z.string().default(''),
  RCON_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  RCON_RACE_COMMAND: z.string().default('lp user {player} permission set race.{race} true'),
  RCON_UNRACE_COMMAND: z.string().default('lp user {player} permission unset race.{race}'),
  RCON_RANK_COMMAND: z.string().default('lp user {player} parent set {rank}'),

  IP_HASH_SALT: z.string().min(8).default('change-me-ip-salt'),

  SEED_OWNER_EMAIL: z.string().email().default('owner@aethersmp.local'),
  SEED_OWNER_USERNAME: z.string().default('Owner'),
  SEED_OWNER_PASSWORD: z.string().default('ChangeMe_StrongPass1!'),
  SEED_OWNER_MC_NAME: z.string().default('Notch'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Неверная конфигурация окружения:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  accessTokenTtl: parsed.data.ACCESS_TOKEN_TTL,
  refreshTokenTtlMs: parsed.data.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

export type Env = typeof env;
