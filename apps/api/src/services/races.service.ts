import { prisma } from '../lib/prisma';

/**
 * Публичное представление расы: без служебных полей, с типизированными JSON-полями.
 * JSON из Postgres приходит как unknown, поэтому нормализуем форму ответа.
 */
export interface RaceAbility {
  name: string;
  description: string;
  cooldown?: string;
  key?: string;
}

export interface PublicRace {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  lore: string;
  icon: string;
  bannerUrl: string | null;
  color: string;
  accentColor: string;
  difficulty: number;
  stats: Record<string, number>;
  passives: RaceAbility[];
  actives: RaceAbility[];
  strengths: string[];
  weaknesses: string[];
  playstyle: string;
  recommended: string;
  isActive: boolean;
  isSelectable: boolean;
  sortOrder: number;
  playerCount?: number;
}

const asRecord = (v: unknown): Record<string, number> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, number>) : {};

const asAbilityList = (v: unknown): RaceAbility[] =>
  Array.isArray(v)
    ? v
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map((x) => ({
          name: String(x.name ?? ''),
          description: String(x.description ?? ''),
          ...(x.cooldown ? { cooldown: String(x.cooldown) } : {}),
          ...(x.key ? { key: String(x.key) } : {}),
        }))
    : [];

const asStringList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

type RaceRow = Awaited<ReturnType<typeof prisma.race.findFirstOrThrow>>;

export function toPublicRace(race: RaceRow, playerCount?: number): PublicRace {
  return {
    id: race.id,
    slug: race.slug,
    name: race.name,
    tagline: race.tagline,
    description: race.description,
    lore: race.lore,
    icon: race.icon,
    bannerUrl: race.bannerUrl,
    color: race.color,
    accentColor: race.accentColor,
    difficulty: race.difficulty,
    stats: asRecord(race.stats),
    passives: asAbilityList(race.passives),
    actives: asAbilityList(race.actives),
    strengths: asStringList(race.strengths),
    weaknesses: asStringList(race.weaknesses),
    playstyle: race.playstyle,
    recommended: race.recommended,
    isActive: race.isActive,
    isSelectable: race.isSelectable,
    sortOrder: race.sortOrder,
    ...(playerCount !== undefined ? { playerCount } : {}),
  };
}

/** Активные расы + количество игроков на каждой (одним groupBy, без N+1). */
export async function listPublicRaces(): Promise<PublicRace[]> {
  const [races, counts] = await Promise.all([
    prisma.race.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.user.groupBy({
      by: ['raceId'],
      where: { raceId: { not: null }, status: { not: 'BANNED' } },
      _count: { _all: true },
    }),
  ]);

  const countMap = new Map(counts.map((c) => [c.raceId, c._count._all]));
  return races.map((r) => toPublicRace(r, countMap.get(r.id) ?? 0));
}

export async function getPublicRaceBySlug(slug: string): Promise<PublicRace | null> {
  const race = await prisma.race.findUnique({ where: { slug } });
  if (!race || !race.isActive) return null;

  const playerCount = await prisma.user.count({
    where: { raceId: race.id, status: { not: 'BANNED' } },
  });
  return toPublicRace(race, playerCount);
}

export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    .replace(/[а-яё]/g, (ch) => {
      const map: Record<string, string> = {
        а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
        й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
        у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
        э: 'e', ю: 'yu', я: 'ya',
      };
      return map[ch] ?? '';
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
