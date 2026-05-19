"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ActionState, decisionSchema } from "@/lib/validation";

function valuesFrom(formData: FormData) {
  return {
    situation: String(formData.get("situation") ?? ""),
    decision: String(formData.get("decision") ?? ""),
    reasoning: String(formData.get("reasoning") ?? "")
  };
}

export async function createDecisionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const values = valuesFrom(formData);
  const parsed = decisionSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Перевірте поля форми.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values
    };
  }

  const decision = await prisma.decision.create({
    data: {
      userId: user.id,
      situation: parsed.data.situation,
      decision: parsed.data.decision,
      reasoning: parsed.data.reasoning,
      status: "PROCESSING"
    }
  });

  redirect(`/decisions/${decision.id}?start=1`);
}

export async function reanalyzeDecisionAction(formData: FormData) {
  const user = await requireUser();
  const decisionId = String(formData.get("decisionId") ?? "");

  const decision = await prisma.decision.findFirst({
    where: {
      id: decisionId,
      userId: user.id
    },
    select: { id: true }
  });

  if (!decision) {
    redirect("/dashboard");
  }

  await prisma.decision.update({
    where: { id: decision.id },
    data: {
      status: "PROCESSING",
      errorMessage: null
    }
  });

  redirect(`/decisions/${decision.id}?start=1`);
}
