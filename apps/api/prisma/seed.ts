/**
 * Seed: владелец + базовый набор рас + настройки сайта.
 * Запуск: npm run db:seed
 * Идемпотентен: повторный запуск обновляет существующие записи, не дублируя их.
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const hashPassword = (plain: string) =>
  argon2.hash(plain, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

const races: Prisma.RaceCreateInput[] = [
  {
    slug: 'human',
    name: 'Человек',
    tagline: 'Универсал без слабых мест',
    description:
      'Люди — самая гибкая раса AetherSMP. Они не превосходят других ни в одном ремесле, но и не проваливаются ни в одном. Идеальный выбор для тех, кто хочет сам решать, каким будет их стиль игры.',
    lore:
      'После Раскола Небес люди первыми вернулись на поверхность. Они строили города из обломков, торговали с уцелевшими и постепенно превратили хаос в порядок. Их сила — не магия и не клыки, а умение договариваться.',
    icon: 'User',
    color: '#f59e0b',
    accentColor: '#fbbf24',
    difficulty: 1,
    stats: { health: 0, speed: 0, damage: 0, defense: 0, mana: 0 },
    passives: [
      { name: 'Приспособляемость', description: 'Получает +5% к опыту от любых действий.' },
      { name: 'Торговый нюх', description: 'Скидка 10% у деревенских торговцев.' },
    ],
    actives: [
      {
        name: 'Второе дыхание',
        description: 'Восстанавливает 6 сердец и снимает эффекты отравления.',
        cooldown: '180 сек',
        key: 'R',
      },
    ],
    strengths: ['Быстрый старт', 'Нет уязвимостей', 'Сильная экономика'],
    weaknesses: ['Нет уникального превосходства', 'Слабее в поздней игре'],
    playstyle: 'Универсальный',
    recommended: 'Новичкам и игрокам, которые часто меняют стиль игры',
    sortOrder: 1,
  },
  {
    slug: 'elf',
    name: 'Эльф',
    tagline: 'Стрелок, которого не догнать',
    description:
      'Эльфы быстры, точны и хрупки. Их дом — лес и высота: они видят цель раньше, чем она увидит их. В открытом ближнем бою эльф проигрывает почти всем, но попробуйте сначала до него добраться.',
    lore:
      'Эльфы не строили стен — они строили тропы. Когда армии Раскола пришли в их леса, они не нашли ни одного города, зато потеряли три тысячи солдат в засадах. С тех пор границы эльфийских лесов отмечены не камнями, а стрелами.',
    icon: 'Leaf',
    color: '#22c55e',
    accentColor: '#4ade80',
    difficulty: 3,
    stats: { health: -2, speed: 2, damage: 1, defense: -1, mana: 1 },
    passives: [
      { name: 'Лесная поступь', description: '+15% скорости передвижения в лесах и на листве.' },
      { name: 'Соколиный глаз', description: '+20% урона из лука и арбалета.' },
      { name: 'Хрупкая плоть', description: 'Максимальный запас здоровья снижен на 2 сердца.' },
    ],
    actives: [
      {
        name: 'Шаг сквозь тень',
        description: 'Рывок на 8 блоков в направлении взгляда с кратковременной невидимостью (1 сек).',
        cooldown: '45 сек',
        key: 'R',
      },
      {
        name: 'Град стрел',
        description: 'Следующие 5 выстрелов не расходуют стрелы и наносят +30% урона.',
        cooldown: '120 сек',
        key: 'F',
      },
    ],
    strengths: ['Лучший дальний бой', 'Высокая мобильность', 'Отличный разведчик'],
    weaknesses: ['Мало здоровья', 'Слаб в ближнем бою', 'Требует хорошего прицела'],
    playstyle: 'Дальний бой',
    recommended: 'Опытным игрокам с хорошей реакцией',
    sortOrder: 2,
  },
  {
    slug: 'dwarf',
    name: 'Гном',
    tagline: 'Стена из камня и упрямства',
    description:
      'Гномы медлительны и невероятно живучи. Они носят больше, копают быстрее и почти не боятся урона. Проблема одна: пока гном добежит до цели, цель успеет уйти.',
    lore:
      'Пока другие расы бежали от Раскола, гномы закрыли ворота и продолжили копать. Глубина оказалась надёжнее любых стен: за тысячу лет их подземные города не взял никто. Говорят, в самом нижнем зале до сих пор горит кузня, которую зажгли до Раскола.',
    icon: 'Mountain',
    color: '#a16207',
    accentColor: '#eab308',
    difficulty: 2,
    stats: { health: 4, speed: -2, damage: 1, defense: 3, mana: -1 },
    passives: [
      { name: 'Каменная кожа', description: 'Снижает весь входящий урон на 15%.' },
      { name: 'Горняцкое чутьё', description: '+30% скорости копания камня и руды.' },
      { name: 'Неподъёмный шаг', description: 'Скорость передвижения снижена на 15%.' },
    ],
    actives: [
      {
        name: 'Каменная стена',
        description: 'Создаёт стену 3×3 из камня перед игроком на 10 секунд.',
        cooldown: '90 сек',
        key: 'R',
      },
      {
        name: 'Стойкость',
        description: 'На 8 секунд снижает получаемый урон ещё на 40%.',
        cooldown: '150 сек',
        key: 'F',
      },
    ],
    strengths: ['Максимальная живучесть', 'Лучший добытчик', 'Сильный танк в группе'],
    weaknesses: ['Медленный', 'Слабая магия', 'Легко обойти тактикой'],
    playstyle: 'Танк / добыча',
    recommended: 'Любителям строительства и подземелий',
    sortOrder: 3,
  },
  {
    slug: 'orc',
    name: 'Орк',
    tagline: 'Урон, который решает бой за секунды',
    description:
      'Орк бьёт сильнее всех и умирает быстрее многих. Его геймплей — агрессия: зайти первым, ударить первым, не дать противнику шанса ответить. Затяжные бои орк почти всегда проигрывает.',
    lore:
      'Орки пришли с юга не как завоеватели, а как беженцы. Их кланы первыми приняли удар Раскола и потеряли почти всё. То, что осталось, выжило благодаря простому правилу: кто ударил первым — тот и прав.',
    icon: 'Swords',
    color: '#dc2626',
    accentColor: '#f87171',
    difficulty: 3,
    stats: { health: 2, speed: 0, damage: 4, defense: -2, mana: -2 },
    passives: [
      { name: 'Ярость крови', description: '+25% урона в ближнем бою при здоровье ниже 50%.' },
      { name: 'Боевой транс', description: 'Каждое убийство даёт +10% скорости на 5 секунд (стакается 3 раза).' },
    ],
    actives: [
      {
        name: 'Сокрушающий удар',
        description: 'Мощная атака с отбрасыванием и +150% урона.',
        cooldown: '60 сек',
        key: 'R',
      },
      {
        name: 'Клич войны',
        description: 'Даёт всем союзникам в радиусе 10 блоков +15% урона на 10 секунд.',
        cooldown: '180 сек',
        key: 'F',
      },
    ],
    strengths: ['Наибольший урон', 'Отличный инициатор', 'Сильный в группе'],
    weaknesses: ['Низкая защита', 'Нет магии', 'Слаб в затяжном бою'],
    playstyle: 'Берсерк',
    recommended: 'Агрессивным игрокам, любящим PvP',
    sortOrder: 4,
  },
  {
    slug: 'undead',
    name: 'Нежить',
    tagline: 'Магия, которая берёт цену кровью',
    description:
      'Нежить — единственная раса с полноценной магией. Её заклинания сильны, но каждое стоит здоровья. Нежить не лечится обычной едой и горит на солнце — ночью же она почти непобедима.',
    lore:
      'Не все, кто погиб при Расколе, согласились остаться мёртвыми. Первые из Нежити были добровольцами: они отдали жизнь, чтобы удержать разлом. С тех пор их тела служат, а души — платят по счёту.',
    icon: 'Skull',
    color: '#8b5cf6',
    accentColor: '#c084fc',
    difficulty: 5,
    stats: { health: -1, speed: 0, damage: 1, defense: 1, mana: 5 },
    passives: [
      { name: 'Тёмная природа', description: 'Не получает урона от падения и утопления.' },
      { name: 'Солнечная уязвимость', description: 'Горит на дневном свете без шлема.' },
      { name: 'Голод жизни', description: 'Еда восстанавливает на 50% меньше сытости.' },
    ],
    actives: [
      {
        name: 'Похищение жизни',
        description: 'Наносит 4 сердца урона цели и лечит нежить на половину этого значения.',
        cooldown: '30 сек',
        key: 'R',
      },
      {
        name: 'Тёмный шаг',
        description: 'Телепортирует на 12 блоков вперёд, оставляя облако тьмы.',
        cooldown: '75 сек',
        key: 'F',
      },
      {
        name: 'Восстание слуги',
        description: 'Призывает скелета-союзника на 60 секунд.',
        cooldown: '240 сек',
        key: 'G',
      },
    ],
    strengths: ['Сильнейшая магия', 'Иммунитет к падению', 'Отличный ночной боец'],
    weaknesses: ['Горит на солнце', 'Слабое лечение', 'Высокий порог входа'],
    playstyle: 'Маг / контроль',
    recommended: 'Опытным игрокам, готовым к сложностям',
    sortOrder: 5,
  },
];

async function main() {
  console.log('🌱 Заполнение базы AetherSMP…');

  // ── Расы ──
  for (const race of races) {
    await prisma.race.upsert({
      where: { slug: race.slug },
      update: {}, // существующие расы не перетираем — их могли изменить через CMS
      create: race,
    });
  }
  console.log(`✓ Расы: ${races.length}`);

  // ── Настройки сайта ──
  const settings: Array<[string, unknown, string]> = [
    ['site.name', 'AetherSMP', 'Название сервера'],
    ['site.tagline', 'SMP с кастомными расами', 'Подзаголовок на главной'],
    ['site.description', 'Ванильное выживание с пятью расами, экономикой и живым сообществом.', 'Описание для SEO'],
    ['site.discordUrl', 'https://discord.gg/example', 'Ссылка на Discord'],
    ['site.vkUrl', 'https://vk.com/example', 'Ссылка на VK'],
    ['server.ip', 'play.aethersmp.net', 'IP сервера для подключения'],
    ['server.version', '1.21.4', 'Версия Minecraft'],
    ['server.port', '25565', 'Порт сервера'],
    ['maintenance.enabled', false, 'Режим технических работ'],
    ['registration.enabled', true, 'Регистрация открыта'],
    ['races.enabled', true, 'Модуль рас включён'],
  ];

  for (const [key, value, description] of settings) {
    await prisma.setting.upsert({
      where: { key },
      update: { description },
      create: { key, value: value as object, description },
    });
  }
  console.log(`✓ Настройки: ${settings.length}`);

  // ── Владелец ──
  const email = (process.env.SEED_OWNER_EMAIL ?? 'owner@aethersmp.local').toLowerCase();
  const username = process.env.SEED_OWNER_USERNAME ?? 'Owner';
  const password = process.env.SEED_OWNER_PASSWORD ?? 'ChangeMe_StrongPass1!';
  const mcName = process.env.SEED_OWNER_MC_NAME ?? 'Notch';

  const existingOwner = await prisma.user.findFirst({ where: { role: 'OWNER' } });

  if (!existingOwner) {
    const owner = await prisma.user.upsert({
      where: { email },
      update: { role: 'OWNER' },
      create: {
        email,
        username,
        passwordHash: await hashPassword(password),
        mcName,
        mcVerified: false,
        role: 'OWNER',
        rank: 'OWNER',
        balance: 100_000,
        raceId: (await prisma.race.findUnique({ where: { slug: 'human' } }))?.id ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        level: 'SECURITY',
        action: 'seed.owner_created',
        message: `Создан владелец ${owner.username} (${owner.email})`,
        actorName: 'system',
      },
    });

    console.log(`✓ Владелец создан: ${email}`);
    console.log(`  Пароль: ${password}`);
    console.log('  ⚠️  Смените пароль сразу после первого входа!');
  } else {
    console.log(`✓ Владелец уже существует: ${existingOwner.email}`);
  }

  console.log('🌿 Готово.');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка seed:', e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
