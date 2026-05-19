import Link from "next/link";
import { BrainCircuit, LogOut, PlusCircle } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/session";

export async function Nav() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-stone-200 bg-white/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-ink text-white">
            <BrainCircuit size={19} aria-hidden />
          </span>
          <span className="font-bold">Decision Insight</span>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link className="button-secondary" href="/decisions/new">
                <PlusCircle size={16} aria-hidden />
                Новий запис
              </Link>
              <Link className="button-secondary hidden sm:inline-flex" href="/dashboard">
                Історія рішень
              </Link>
              <form action={logoutAction}>
                <button className="button-secondary" type="submit" title="Вийти">
                  <LogOut size={16} aria-hidden />
                  <span className="hidden sm:inline">Вийти</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <Link className="button-secondary" href="/login">
                Увійти
              </Link>
              <Link className="button-primary" href="/register">
                Зареєструватися
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
