import Link from "next/link";
import { ArrowRight, BarChart3, LockKeyhole, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/session";

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <main>
      <section className="mx-auto grid min-h-[calc(100vh-65px)] max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
            LLM аналіз складних виборів
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-ink sm:text-5xl">
            Decision Insight
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-700">
            Записуйте важливі життєві або робочі рішення, а система допоможе
            побачити когнітивні викривлення, пропущені альтернативи, ризики та
            практичні наступні кроки.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="button-primary" href={user ? "/dashboard" : "/register"}>
              {user ? "Перейти до історії" : "Почати аналіз"}
              <ArrowRight size={16} aria-hidden />
            </Link>
            <Link className="button-secondary" href={user ? "/decisions/new" : "/login"}>
              {user ? "Новий запис" : "Увійти"}
            </Link>
          </div>
        </div>

        <div className="relative min-h-[480px] overflow-hidden rounded-lg border border-stone-200 bg-white shadow-soft">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(63,111,88,0.12),rgba(45,111,127,0.08),rgba(180,107,69,0.12))]" />
          <div className="relative grid h-full min-h-[480px] content-center gap-4 p-5">
            <PreviewCard
              icon={<Sparkles size={18} aria-hidden />}
              title="Категорія рішення"
              text="Кар'єрна стратегія та ризик-менеджмент"
            />
            <PreviewCard
              icon={<LockKeyhole size={18} aria-hidden />}
              title="Потенційні викривлення"
              text="Підтверджувальне упередження, уникнення втрат, ефект статус-кво"
            />
            <PreviewCard
              icon={<BarChart3 size={18} aria-hidden />}
              title="Якість рішення"
              text="7/10: сильний контекст, але бракує альтернативних сценаріїв"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function PreviewCard({
  icon,
  title,
  text
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white/88 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-moss">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-stone-700">{text}</p>
    </div>
  );
}
