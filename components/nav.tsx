import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { NavActions } from "@/components/nav-actions";
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

        <NavActions isAuthenticated={Boolean(user)} />
      </nav>
    </header>
  );
}
