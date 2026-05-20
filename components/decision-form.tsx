"use client";

import { useFormState } from "react-dom";
import {
  createDecisionAction,
  updateDecisionAction
} from "@/app/actions/decisions";
import { SubmitButton } from "@/components/submit-button";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: true };

type DecisionFormProps = {
  mode?: "create" | "edit";
  decision?: {
    id: string;
    situation: string;
    decision: string;
    reasoning: string | null;
  };
};

export function DecisionForm({ mode = "create", decision }: DecisionFormProps) {
  const action = mode === "edit" ? updateDecisionAction : createDecisionAction;
  const [state, formAction] = useFormState(action, initialState);
  const isEdit = mode === "edit";

  return (
    <form action={formAction} className="panel space-y-6 p-6">
      {isEdit && decision ? (
        <input
          type="hidden"
          name="decisionId"
          value={state.values?.decisionId ?? decision.id}
        />
      ) : null}

      {!state.ok && state.message ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label className="label" htmlFor="situation">
          Опис ситуації
        </label>
        <textarea
          className="field min-h-40"
          id="situation"
          name="situation"
          defaultValue={state.values?.situation ?? decision?.situation}
          placeholder="Що сталося, який контекст, хто залучений, що було важливо?"
          required
        />
        <FieldError errors={state.fieldErrors?.situation} />
      </div>

      <div className="space-y-1.5">
        <label className="label" htmlFor="decision">
          Прийняте рішення
        </label>
        <textarea
          className="field min-h-28"
          id="decision"
          name="decision"
          defaultValue={state.values?.decision ?? decision?.decision}
          placeholder="Який саме вибір ви зробили?"
          required
        />
        <FieldError errors={state.fieldErrors?.decision} />
      </div>

      <div className="space-y-1.5">
        <label className="label" htmlFor="reasoning">
          Власні міркування
        </label>
        <textarea
          className="field min-h-28"
          id="reasoning"
          name="reasoning"
          defaultValue={state.values?.reasoning ?? decision?.reasoning ?? ""}
          placeholder="Чому це рішення здалося найкращим? Які припущення були в основі?"
        />
        <FieldError errors={state.fieldErrors?.reasoning} />
      </div>

      <SubmitButton pendingText="Збереження...">
        {isEdit ? "Зберегти зміни і переаналізувати" : "Зберегти і проаналізувати"}
      </SubmitButton>
    </form>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="text-sm text-red-700">{errors[0]}</p>;
}
