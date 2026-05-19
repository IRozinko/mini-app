"use server";

import { compare, hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";
import { ActionState, loginSchema, registerSchema } from "@/lib/validation";

function valuesFrom(formData: FormData, keys: string[]) {
  return Object.fromEntries(
    keys.map((key) => [key, String(formData.get(key) ?? "")])
  );
}

export async function registerAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const values = valuesFrom(formData, ["name", "email", "password"]);
  const parsed = registerSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Перевірте поля форми.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email }
  });
  if (existingUser) {
    return {
      ok: false,
      message: "Користувач з таким email вже існує.",
      values
    };
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name || null,
      passwordHash: await hash(parsed.data.password, 12)
    }
  });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const values = valuesFrom(formData, ["email", "password"]);
  const parsed = loginSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Перевірте поля форми.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email }
  });
  if (!user || !(await compare(parsed.data.password, user.passwordHash))) {
    return {
      ok: false,
      message: "Невірний email або пароль.",
      values
    };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
