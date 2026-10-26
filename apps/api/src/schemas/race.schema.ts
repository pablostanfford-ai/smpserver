import { z } from 'zod';

const abilitySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(600),
  cooldown: z.string().max(40).optional(),
  key: z.string().max(20).optional(),
});

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Цвет в формате #RRGGBB');

export const raceCreateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/, 'Slug: строчная латиница, цифры и дефис')
    .optional(),
  name: z.string().min(2, 'Название: минимум 2 символа').max(60),
  tagline: z.string().max(120).default(''),
  description: z.string().min(10, 'Описание: минимум 10 символов').max(5000),
  lore: z.string().max(20000).default(''),

  icon: z.string().min(1).max(40).default('Sparkles'),
  bannerUrl: z.string().url().max(500).or(z.literal('')).nullable().optional(),
  color: hexColor.default('#22d3ee'),
  accentColor: hexColor.default('#a855f7'),

  difficulty: z.number().int().min(1).max(5).default(2),
  stats: z.record(z.number().min(-100).max(100)).default({}),
  passives: z.array(abilitySchema).max(20).default([]),
  actives: z.array(abilitySchema).max(20).default([]),
  strengths: z.array(z.string().max(200)).max(20).default([]),
  weaknesses: z.array(z.string().max(200)).max(20).default([]),
  playstyle: z.string().max(500).default(''),
  recommended: z.string().max(300).default(''),

  isActive: z.boolean().default(true),
  isSelectable: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export const raceUpdateSchema = raceCreateSchema.partial();

export type RaceCreateInput = z.infer<typeof raceCreateSchema>;
export type RaceUpdateInput = z.infer<typeof raceUpdateSchema>;
