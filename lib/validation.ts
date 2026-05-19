import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().max(80, "Ім'я занадто довге").optional(),
  email: z
    .string()
    .trim()
    .email("Введіть коректну email адресу")
    .max(160, "Email занадто довгий")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "Пароль має містити щонайменше 8 символів")
    .max(120, "Пароль занадто довгий")
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Введіть коректну email адресу")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Введіть пароль")
});

export const decisionSchema = z.object({
  situation: z
    .string()
    .trim()
    .min(20, "Опишіть ситуацію детальніше")
    .max(6000, "Опис ситуації занадто довгий"),
  decision: z
    .string()
    .trim()
    .min(10, "Опишіть прийняте рішення")
    .max(3000, "Рішення занадто довге"),
  reasoning: z
    .string()
    .trim()
    .max(4000, "Міркування занадто довгі")
    .optional()
    .transform((value) => (value ? value : undefined))
});

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};
