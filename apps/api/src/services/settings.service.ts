import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface SiteSettings {
  'site.name': string;
  'site.tagline': string;
  'site.description': string;
  'site.logoUrl': string;
  'site.discordUrl': string;
  'site.vkUrl': string;
  'site.youtubeUrl': string;
  'site.telegramUrl': string;
  'site.heroImageUrl': string;
  'server.ip': string;
  'server.version': string;
  'server.port': string;
  'maintenance.enabled': boolean;
  'maintenance.message': string;
  'registration.enabled': boolean;
  'races.enabled': boolean;
}

/** Значения по умолчанию: используются, пока в БД нет ключа. */
export const DEFAULT_SETTINGS: SiteSettings = {
  'site.name': 'AetherSMP',
  'site.tagline': 'SMP с кастомными расами',
  'site.description': 'Ванильное выживание с пятью расами, экономикой и живым сообществом.',
  'site.logoUrl': '',
  'site.discordUrl': 'https://discord.gg/example',
  'site.vkUrl': 'https://vk.com/example',
  'site.youtubeUrl': '',
  'site.telegramUrl': '',
  'site.heroImageUrl': '',
  'server.ip': 'play.aethersmp.net',
  'server.version': '1.21.4',
  'server.port': '25565',
  'maintenance.enabled': false,
  'maintenance.message': 'Сервер на техническом обслуживании. Скоро вернёмся!',
  'registration.enabled': true,
  'races.enabled': true,
};

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as Array<keyof SiteSettings>;

export async function getSettings(): Promise<SiteSettings> {
  const rows = await prisma.setting.findMany();
  const result = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    if (row.key in result) {
      (result as Record<string, unknown>)[row.key] = row.value;
    }
  }
  return result;
}

export async function getSetting<K extends keyof SiteSettings>(key: K): Promise<SiteSettings[K]> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return (row?.value as SiteSettings[K]) ?? DEFAULT_SETTINGS[key];
}

export async function updateSettings(
  patch: Partial<SiteSettings>,
  updatedById: string,
): Promise<SiteSettings> {
  const entries = Object.entries(patch).filter(([key]) => key in DEFAULT_SETTINGS);

  await prisma.$transaction(
    entries.map(([key, value]) => {
      // Prisma Json-поле принимает любой JSON-совместимый скаляр
      const jsonValue = value as unknown as Prisma.InputJsonValue;
      return prisma.setting.upsert({
        where: { key },
        create: { key, value: jsonValue, updatedById },
        update: { value: jsonValue, updatedById },
      });
    }),
  );

  return getSettings();
}
