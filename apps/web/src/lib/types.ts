export type Role = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'PLAYER';
export type UserStatus = 'ACTIVE' | 'MUTED' | 'BANNED';

export interface RaceAbility {
  name: string;
  description: string;
  cooldown?: string;
  key?: string;
}

export interface Race {
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

export interface SkinUrls {
  head: string;
  body: string;
  headFallback: string;
  bodyFallback: string;
}

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  mcName: string;
  mcUuid: string | null;
  role: Role;
  status: UserStatus;
  rank: string;
  balance: number;
  race: Pick<Race, 'id' | 'slug' | 'name' | 'color' | 'icon'> | null;
}

export interface DashboardUser extends SessionUser {
  mcVerified: boolean;
  kills: number;
  deaths: number;
  playtimeMin: number;
  bio: string;
  avatarUrl: string | null;
  raceChangedAt: string | null;
  banReason: string | null;
  bannedUntil: string | null;
  muteReason: string | null;
  mutedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  race: Race | null;
  skins: SkinUrls;
  uuidFormatted: string | null;
  kdRatio: number;
}

export interface Notification {
  id: string;
  type: 'SYSTEM' | 'RACE' | 'MODERATION' | 'REWARD';
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface DashboardResponse {
  user: DashboardUser;
  activity: ActivityEvent[];
  notifications: Notification[];
  unreadCount: number;
  stats: {
    totalPlayers: number;
    raceDistribution: Array<{ raceId: string | null; count: number }>;
  };
  raceChange: { canChange: boolean; cooldownDays: number; nextAt: string | null };
}

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

export interface AdminUserRow {
  id: string;
  email: string;
  username: string;
  mcName: string;
  mcUuid: string | null;
  mcVerified: boolean;
  role: Role;
  status: UserStatus;
  rank: string;
  balance: number;
  kills: number;
  deaths: number;
  playtimeMin: number;
  banReason: string | null;
  bannedUntil: string | null;
  muteReason: string | null;
  mutedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  race: { id: string; slug: string; name: string; color: string } | null;
  skins: SkinUrls;
}

export interface AuditLog {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
  action: string;
  message: string;
  actorName: string;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
  actor: { id: string; username: string; mcName: string } | null;
}

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  pages: number;
}
