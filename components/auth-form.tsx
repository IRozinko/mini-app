"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { loginAction, registerAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: true };

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="panel mx-auto w-full max-w-md space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold">
          {mode === "login" ? "Увійти" : "Зареєструватися"}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {mode === "login"
            ? "Поверніться до своїх рішень та аналізів."
            : "Створіть приватний простір для аналізу рішень."}
        </p>
      </div>

      {!state.ok && state.message ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </div>
      ) : null}

      {mode === "register" ? (
        <div className="space-y-1.5">
          <label className="label" htmlFor="name">
            Ім&apos;я
          </label>
          <input
            className="field"
            id="name"
            name="name"
            defaultValue={state.values?.name}
            autoComplete="name"
          />
          <FieldError errors={state.fieldErrors?.name} />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          className="field"
          id="email"
          name="email"
          type="email"
          defaultValue={state.values?.email}
          autoComplete="email"
          required
        />
        <FieldError errors={state.fieldErrors?.email} />
      </div>

      <div className="space-y-1.5">
        <label className="label" htmlFor="password">
          Пароль
        </label>
        <input
          className="field"
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
        <FieldError errors={state.fieldErrors?.password} />
      </div>

      <SubmitButton pendingText={mode === "login" ? "Вхід..." : "Створення..."}>
        {mode === "login" ? "Увійти" : "Зареєструватися"}
      </SubmitButton>

      <p className="text-sm text-stone-600">
        {mode === "login" ? "Ще немає акаунта? " : "Вже маєте акаунт? "}
        <Link className="font-semibold text-moss" href={mode === "login" ? "/register" : "/login"}>
          {mode === "login" ? "Зареєструватися" : "Увійти"}
        </Link>
      </p>
    </form>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="text-sm text-red-700">{errors[0]}</p>;
}
