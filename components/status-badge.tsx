import { DecisionStatus } from "@prisma/client";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const statusMap = {
  [DecisionStatus.PROCESSING]: {
    label: "В обробці",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
    Icon: Loader2
  },
  [DecisionStatus.READY]: {
    label: "Готово",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    Icon: CheckCircle2
  },
  [DecisionStatus.FAILED]: {
    label: "Помилка аналізу",
    className: "bg-red-50 text-red-700 ring-red-200",
    Icon: AlertCircle
  }
};

export function StatusBadge({ status }: { status: DecisionStatus }) {
  const item = statusMap[status];
  const Icon = item.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${item.className}`}
    >
      <Icon
        size={14}
        aria-hidden
        className={status === DecisionStatus.PROCESSING ? "animate-spin" : ""}
      />
      {item.label}
    </span>
  );
}
