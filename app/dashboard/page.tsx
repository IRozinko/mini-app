import Link from "next/link";
import { DecisionStatus } from "@prisma/client";
import { ArrowUpDown, PlusCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type DashboardSearch = {
  status?: string;
  category?: string;
  sort?: string;
};

const statuses = Object.values(DecisionStatus);

export default async function DashboardPage({
  searchParams
}: {
  searchParams: DashboardSearch;
}) {
  const user = await requireUser();
  const selectedStatus = statuses.includes(searchParams.status as DecisionStatus)
    ? (searchParams.status as DecisionStatus)
    : undefined;
  const sort = searchParams.sort === "oldest" || searchParams.sort === "quality"
    ? searchParams.sort
    : "newest";
  const selectedCategory = searchParams.category || undefined;

  const [allDecisions, decisions] = await Promise.all([
    prisma.decision.findMany({
      where: { userId: user.id },
      include: { analysis: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.decision.findMany({
      where: {
        userId: user.id,
        ...(selectedStatus ? { status: selectedStatus } : {}),
        ...(selectedCategory
          ? { analysis: { is: { category: selectedCategory } } }
          : {})
      },
      include: { analysis: true },
      orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" }
    })
  ]);

  const visibleDecisions =
    sort === "quality"
      ? [...decisions].sort(
          (a, b) => (b.analysis?.qualityScore ?? -1) - (a.analysis?.qualityScore ?? -1)
        )
      : decisions;

  const counts = {
    total: allDecisions.length,
    ready: allDecisions.filter((item) => item.status === DecisionStatus.READY).length,
    processing: allDecisions.filter((item) => item.status === DecisionStatus.PROCESSING).length,
    failed: allDecisions.filter((item) => item.status === DecisionStatus.FAILED).length
  };

  const categories = Array.from(
    new Set(
      allDecisions
        .map((item) => item.analysis?.category)
        .filter((category): category is string => Boolean(category))
    )
  ).sort((a, b) => a.localeCompare(b, "uk"));

  const biasFrequency = new Map<string, number>();
  for (const item of allDecisions) {
    const biases = Array.isArray(item.analysis?.cognitiveBiases)
      ? item.analysis?.cognitiveBiases
      : [];
    for (const bias of biases) {
      if (
        bias &&
        typeof bias === "object" &&
        "name" in bias &&
        typeof bias.name === "string"
      ) {
        biasFrequency.set(bias.name, (biasFrequency.get(bias.name) ?? 0) + 1);
      }
    }
  }
  const topBiases = Array.from(biasFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Історія рішень</h1>
          <p className="mt-2 text-stone-600">
            Приватний журнал ваших рішень та LLM-аналізів.
          </p>
        </div>
        <Link className="button-primary" href="/decisions/new">
          <PlusCircle size={16} aria-hidden />
          Новий запис
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-4">
        <Stat label="Усього" value={counts.total} />
        <Stat label="Готово" value={counts.ready} />
        <Stat label="В обробці" value={counts.processing} />
        <Stat label="Помилка" value={counts.failed} />
      </section>

      {topBiases.length ? (
        <section className="mt-6 panel p-5">
          <h2 className="font-semibold">Найчастіші когнітивні викривлення</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {topBiases.map(([name, count]) => (
              <span
                key={name}
                className="rounded-full bg-sea/10 px-3 py-1 text-sm font-medium text-sea"
              >
                {name}: {count}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <form className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-white/80 p-4 sm:grid-cols-3">
        <label className="space-y-1.5">
          <span className="label">Статус</span>
          <select className="field" name="status" defaultValue={selectedStatus ?? ""}>
            <option value="">Усі статуси</option>
            <option value={DecisionStatus.PROCESSING}>В обробці</option>
            <option value={DecisionStatus.READY}>Готово</option>
            <option value={DecisionStatus.FAILED}>Помилка</option>
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="label">Категорія</span>
          <select className="field" name="category" defaultValue={selectedCategory ?? ""}>
            <option value="">Усі категорії</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="label">Сортування</span>
          <select className="field" name="sort" defaultValue={sort}>
            <option value="newest">Нові спочатку</option>
            <option value="oldest">Старі спочатку</option>
            <option value="quality">За оцінкою якості</option>
          </select>
        </label>
        <button className="button-secondary sm:col-span-3" type="submit">
          <ArrowUpDown size={16} aria-hidden />
          Застосувати
        </button>
      </form>

      <section className="mt-6 space-y-4">
        {visibleDecisions.length ? (
          visibleDecisions.map((item) => (
            <article key={item.id} className="panel p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.status} />
                    {item.analysis?.category ? (
                      <span className="rounded-full bg-moss/10 px-2.5 py-1 text-xs font-semibold text-moss">
                        {item.analysis.category}
                      </span>
                    ) : null}
                    {item.analysis?.qualityScore ? (
                      <span className="rounded-full bg-clay/10 px-2.5 py-1 text-xs font-semibold text-clay">
                        {item.analysis.qualityScore}/10
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 line-clamp-2 text-lg font-semibold">
                    {item.decision}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">
                    {item.situation}
                  </p>
                  {item.analysis?.summary ? (
                    <p className="mt-3 line-clamp-2 rounded-md bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-700">
                      {item.analysis.summary}
                    </p>
                  ) : null}
                </div>
                <Link className="button-secondary shrink-0" href={`/decisions/${item.id}`}>
                  Деталі
                </Link>
              </div>
            </article>
          ))
        ) : (
          <div className="panel p-8 text-center">
            <h2 className="text-xl font-semibold">Поки немає записів</h2>
            <p className="mx-auto mt-2 max-w-xl text-stone-600">
              Створіть перше рішення, і система запустить LLM-аналіз із категорією,
              ризиками, альтернативами та питаннями для рефлексії.
            </p>
            <Link className="button-primary mt-5" href="/decisions/new">
              <PlusCircle size={16} aria-hidden />
              Новий запис
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-4">
      <p className="text-sm text-stone-600">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
