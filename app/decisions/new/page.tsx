import { DecisionForm } from "@/components/decision-form";
import { requireUser } from "@/lib/session";

export default async function NewDecisionPage() {
  await requireUser();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Моє рішення</h1>
        <p className="mt-2 text-stone-600">
          Опишіть контекст і вибір. Після збереження аналіз запуститься через
          серверний LLM endpoint.
        </p>
      </div>
      <DecisionForm />
    </main>
  );
}
