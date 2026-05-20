import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DecisionForm } from "@/components/decision-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function EditDecisionPage({
  params
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const decision = await prisma.decision.findFirst({
    where: {
      id: params.id,
      userId: user.id
    },
    select: {
      id: true,
      situation: true,
      decision: true,
      reasoning: true
    }
  });

  if (!decision) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link className="button-secondary mb-5" href={`/decisions/${decision.id}`}>
          <ArrowLeft size={16} aria-hidden />
          Назад до рішення
        </Link>
        <h1 className="text-3xl font-bold">Редагувати рішення</h1>
        <p className="mt-2 text-stone-600">
          Після збереження буде створено нове завдання LLM-аналізу.
        </p>
      </div>
      <DecisionForm mode="edit" decision={decision} />
    </main>
  );
}
