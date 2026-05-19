"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DecisionStatus } from "@prisma/client";

type AnalyzeRunnerProps = {
  decisionId: string;
  shouldStart: boolean;
  initialStatus: DecisionStatus;
};

export function AnalyzeRunner({
  decisionId,
  shouldStart,
  initialStatus
}: AnalyzeRunnerProps) {
  const router = useRouter();
  const started = useRef(false);
  const [message, setMessage] = useState(
    initialStatus === DecisionStatus.PROCESSING ? "Аналіз виконується..." : ""
  );

  useEffect(() => {
    if (!shouldStart || started.current) {
      return;
    }

    started.current = true;
    setMessage("Запускаємо LLM-аналіз...");
    fetch(`/api/decisions/${decisionId}/analyze`, { method: "POST" })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || "Не вдалося виконати аналіз.");
        }
        setMessage("Аналіз завершено.");
      })
      .catch(() => {
        setMessage("Аналіз завершився помилкою.");
      })
      .finally(() => {
        router.refresh();
      });
  }, [decisionId, router, shouldStart]);

  useEffect(() => {
    if (initialStatus !== DecisionStatus.PROCESSING) {
      return;
    }

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/decisions/${decisionId}`, {
        cache: "no-store"
      }).catch(() => null);
      if (!response?.ok) {
        return;
      }

      const data = (await response.json()) as { status: DecisionStatus };
      if (data.status !== DecisionStatus.PROCESSING) {
        window.clearInterval(interval);
        router.refresh();
      }
    }, 3500);

    return () => window.clearInterval(interval);
  }, [decisionId, initialStatus, router]);

  if (!message) {
    return null;
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      {message}
    </div>
  );
}
