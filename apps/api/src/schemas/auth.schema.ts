import { z } from 'zod';

const mcName = z
  .string()
  .regex(/^[A-Za-z0-9_]{3,16}$/, 'Ник: 3–16 символов, латиница, цифры и «_»');

const password = z
  .string()
  .min(10, 'Пароль: минимум 10 символов')
  .max(128, 'Пароль: максимум 128 символов')
  .regex(/[a-zа-я]/, 'Пароль должен содержать строчную букву')
  .regex(/[A-ZА-Я]/, 'Пароль должен содержать заглавную букву')
  .regex(/\d/, 'Пароль должен содержать цифру');

export const registerSchema = z.object({
  email: z.string().email('Некорректный email').max(190).toLowerCase(),
  username: z
    .string()
    .min(3, 'Логин: минимум 3 символа')
    .max(24, 'Логин: максимум 24 символа')
    .regex(/^[A-Za-z0-9_]+$/, 'Логин: только латиница, цифры и «_»'),
  password,
  mcName,
  raceSlug: z.string().min(1).max(48).optional(),
  acceptRules: z.literal(true, {
    errorMap: () => ({ message: 'Нужно принять правила сервера' }),
  }),
});

export const loginSchema = z.object({
  login: z.string().min(3, 'Введите email или логин').max(190),
  password: z.string().min(1, 'Введите пароль').max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});

export const checkMcNameSchema = z.object({ mcName });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
