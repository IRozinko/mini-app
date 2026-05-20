import Link from "next/link";
import { notFound } from "next/navigation";
import { DecisionStatus, Prisma } from "@prisma/client";
import { ArrowLeft, Pencil, RotateCw, Trash2 } from "lucide-react";
import {
  deleteDecisionAction,
  reanalyzeDecisionAction
} from "@/app/actions/decisions";
import { AnalyzeRunner } from "@/components/analyze-runner";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type DetailSearch = {
  start?: string;
};

type Bias = {
  name: string;
  explanation: string;
};

type MissedAlternative = {
  alternative: string;
  whyItMatters: string;
};

export default async function DecisionDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: DetailSearch;
}) {
  const user = await requireUser();
  const decision = await prisma.decision.findFirst({
    where: {
      id: params.id,
      userId: user.id
    },
    include: {
      analysis: true,
      analysisRuns: {
        orderBy: { createdAt: "desc" },
        take: 6
      }
    }
  });

  if (!decision) {
    notFound();
  }

  const shouldStart =
    searchParams.start === "1" && decision.status === DecisionStatus.PROCESSING;
  const analysis = decision.analysis;
  const biases = toBiases(analysis?.cognitiveBiases);
  const alternatives = toAlternatives(analysis?.missedAlternatives);
  const risks = toStringArray(analysis?.risks);
  const questions = toStringArray(analysis?.reflectionQuestions);
  const nextSteps = toStringArray(analysis?.nextSteps);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <Link className="button-secondary" href="/dashboard">
          <ArrowLeft size={16} aria-hidden />
          Історія рішень
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link className="button-secondary" href={`/decisions/${decision.id}/edit`}>
            <Pencil size={16} aria-hidden />
            Редагувати
          </Link>
          <form action={reanalyzeDecisionAction}>
            <input type="hidden" name="decisionId" value={decision.id} />
            <button className="button-secondary" type="submit">
              <RotateCw size={16} aria-hidden />
              {decision.status === DecisionStatus.FAILED ? "Повторити аналіз" : "Переаналізувати"}
            </button>
          </form>
          <form action={deleteDecisionAction}>
            <input type="hidden" name="decisionId" value={decision.id} />
            <button className="button-danger" type="submit">
              <Trash2 size={16} aria-hidden />
              Видалити рішення
            </button>
          </form>
        </div>
      </div>

      <article className="panel p-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={decision.status} />
          <span className="text-sm text-stone-500">
            {new Intl.DateTimeFormat("uk-UA", {
              dateStyle: "medium",
              timeStyle: "short"
            }).format(decision.createdAt)}
          </span>
        </div>

        <section className="mt-6 grid gap-4">
          <TextBlock title="Опис ситуації" text={decision.situation} />
          <TextBlock title="Прийняте рішення" text={decision.decision} />
          {decision.reasoning ? (
            <TextBlock title="Власні міркування" text={decision.reasoning} />
          ) : null}
        </section>
      </article>

      <section className="mt-6 space-y-4">
        <AnalyzeRunner
          decisionId={decision.id}
          shouldStart={shouldStart}
          initialStatus={decision.status}
        />

        {decision.status === DecisionStatus.PROCESSING ? (
          <div className="panel p-6">
            <h2 className="text-xl font-semibold">В обробці</h2>
            <p className="mt-2 text-stone-600">
              LLM аналізує запис. Сторінка оновиться автоматично після завершення.
            </p>
          </div>
        ) : null}

        {decision.status === DecisionStatus.FAILED ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="text-xl font-semibold text-red-800">Помилка аналізу</h2>
            <p className="mt-2 text-sm leading-6 text-red-700">
              {decision.errorMessage ||
                "Аналіз не вдалося завершити. Перевірте LLM налаштування і повторіть."}
            </p>
          </div>
        ) : null}

        {decision.status === DecisionStatus.READY && analysis ? (
          <div className="panel p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-2xl font-bold">Аналіз рішення</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {analysis.provider ? `${analysis.provider} / ` : ""}
                  {analysis.model ?? "LLM модель"}
                </p>
              </div>
              {analysis.qualityScore ? (
                <div className="rounded-lg bg-ink px-4 py-3 text-center text-white">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/70">
                    Якість
                  </p>
                  <p className="text-2xl font-bold">{analysis.qualityScore}/10</p>
                </div>
              ) : null}
            </div>

            <div className="mt-6 grid gap-5">
              <TextBlock title="Категорія рішення" text={analysis.category} />
              {analysis.summary ? <TextBlock title="Короткий підсумок" text={analysis.summary} /> : null}
              <ListBlock
                title="Потенційні когнітивні викривлення"
                items={biases.map((bias) => ({
                  title: bias.name,
                  text: bias.explanation
                }))}
              />
              <ListBlock
                title="Пропущені альтернативи"
                items={alternatives.map((item) => ({
                  title: item.alternative,
                  text: item.whyItMatters
                }))}
              />
              <SimpleList title="Фактори ризику" items={risks} />
              <SimpleList title="Питання для рефлексії" items={questions} />
              <SimpleList title="Практичні наступні кроки" items={nextSteps} />
            </div>
          </div>
        ) : null}

        {decision.analysisRuns.length > 1 ? (
          <div className="panel p-6">
            <h2 className="text-xl font-semibold">Історія аналізів</h2>
            <div className="mt-4 divide-y divide-stone-200">
              {decision.analysisRuns.map((run) => (
                <div
                  key={run.id}
                  className="grid gap-2 py-3 text-sm sm:grid-cols-[1.2fr_1fr_1fr_auto]"
                >
                  <span className="text-stone-600">
                    {new Intl.DateTimeFormat("uk-UA", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    }).format(run.createdAt)}
                  </span>
                  <span>{run.provider ? `${run.provider} / ` : ""}{run.model ?? "LLM"}</span>
                  <span className="font-medium">{run.category}</span>
                  <span className="font-semibold text-clay">
                    {run.qualityScore ? `${run.qualityScore}/10` : "Без оцінки"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-stone-500">
        {title}
      </h2>
      <p className="mt-2 whitespace-pre-wrap leading-7 text-stone-800">{text}</p>
    </div>
  );
}

function ListBlock({
  title,
  items
}: {
  title: string;
  items: Array<{ title: string; text: string }>;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-stone-500">
        {title}
      </h2>
      <div className="mt-3 grid gap-3">
        {items.map((item) => (
          <div key={`${item.title}-${item.text}`} className="rounded-md border border-stone-200 bg-stone-50 p-4">
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mt-1 leading-6 text-stone-700">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-stone-500">
        {title}
      </h2>
      <ul className="mt-3 grid gap-2">
        {items.map((item) => (
          <li key={item} className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3 leading-6">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function toStringArray(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toBiases(value: Prisma.JsonValue | null | undefined): Bias[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is Bias => {
    return (
      item !== null &&
      typeof item === "object" &&
      "name" in item &&
      "explanation" in item &&
      typeof item.name === "string" &&
      typeof item.explanation === "string"
    );
  });
}

function toAlternatives(value: Prisma.JsonValue | null | undefined): MissedAlternative[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is MissedAlternative => {
    return (
      item !== null &&
      typeof item === "object" &&
      "alternative" in item &&
      "whyItMatters" in item &&
      typeof item.alternative === "string" &&
      typeof item.whyItMatters === "string"
    );
  });
}
