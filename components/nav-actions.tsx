"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, PlusCircle } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

export function NavActions({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname();

  if (!isAuthenticated) {
    const isLogin = pathname === "/login";
    const isRegister = pathname === "/register";

    return (
      <div className="flex items-center gap-2">
        {!isLogin ? (
          <Link className="button-secondary" href="/login">
            Увійти
          </Link>
        ) : null}
        {!isRegister ? (
          <Link className="button-primary" href="/register">
            Зареєструватися
          </Link>
        ) : null}
      </div>
    );
  }

  const isNewDecision = pathname === "/decisions/new";
  const isDashboard = pathname === "/dashboard";

  return (
    <div className="flex items-center gap-2">
      {!isNewDecision ? (
        <Link className="button-secondary" href="/decisions/new">
          <PlusCircle size={16} aria-hidden />
          Новий запис
        </Link>
      ) : null}
      {!isDashboard ? (
        <Link className="button-secondary hidden sm:inline-flex" href="/dashboard">
          Історія рішень
        </Link>
      ) : null}
      <form action={logoutAction}>
        <button className="button-secondary" type="submit" title="Вийти">
          <LogOut size={16} aria-hidden />
          <span className="hidden sm:inline">Вийти</span>
        </button>
      </form>
    </div>
  );
}
