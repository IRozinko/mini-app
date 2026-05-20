import "server-only";

import type { Prisma } from "@prisma/client";
import { llmAnalysisSchema } from "@/lib/analysis-schema";
import { parseLlmJsonContent } from "@/lib/llm-json";
import { prisma } from "@/lib/prisma";

const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 30000);
const SAFE_ANALYSIS_ERROR =
  "Не вдалося виконати LLM-аналіз. Перевірте налаштування провайдера та повторіть спробу.";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

async function callLlm(messages: ChatMessage[]) {
  if (process.env.LLM_TEST_MODE === "mock") {
    return {
      content: JSON.stringify({
        category: "Тестова категорія",
        cognitiveBiases: [
          {
            name: "Підтверджувальне упередження",
            explanation: "Користувач міг приділяти більше уваги аргументам на користь вже обраного рішення."
          }
        ],
        missedAlternatives: [
          {
            alternative: "Провести короткий експеримент перед остаточним вибором",
            whyItMatters: "Це зменшує ризик великої помилки без значних витрат."
          }
        ],
        summary: "Тестовий LLM-аналіз створено без зовнішнього провайдера.",
        risks: ["Недостатньо даних для впевненого вибору"],
        reflectionQuestions: ["Яке припущення найважливіше перевірити?"],
        nextSteps: ["Зібрати один додатковий сигнал перед дією"],
        qualityScore: 7
      }),
      model: "test-mock",
      provider: "test"
    };
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error("LLM_API_KEY is not configured");
  }

  const baseUrl = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.25,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LLM request failed (${response.status}): ${body.slice(0, 1000)}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("LLM response was empty");
    }

    return {
      content,
      model,
      provider: baseUrl.includes("openai.com") ? "openai" : baseUrl
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`LLM request timed out after ${LLM_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeDecisionForUser(decisionId: string, userId: string) {
  const decision = await prisma.decision.findFirst({
    where: { id: decisionId, userId },
    include: { analysis: true }
  });

  if (!decision) {
    throw new Error("Decision not found.");
  }

  await prisma.decision.update({
    where: { id: decision.id },
    data: {
      status: "PROCESSING",
      errorMessage: null
    }
  });

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a careful Ukrainian-speaking decision quality analyst. Return only valid JSON matching the requested schema. Do not include markdown."
    },
    {
      role: "user",
      content: [
        "Проаналізуй рішення користувача глибоко, практично і без моралізаторства.",
        "Поверни JSON зі схемою:",
        '{ "category": "string", "cognitiveBiases": [{ "name": "string", "explanation": "string" }], "missedAlternatives": [{ "alternative": "string", "whyItMatters": "string" }], "summary": "string", "risks": ["string"], "reflectionQuestions": ["string"], "nextSteps": ["string"], "qualityScore": number }',
        "Оцінка qualityScore має бути цілим числом від 1 до 10.",
        "",
        `Опис ситуації: ${decision.situation}`,
        `Прийняте рішення: ${decision.decision}`,
        `Власні міркування: ${decision.reasoning || "Не вказано"}`
      ].join("\n")
    }
  ];

  try {
    const llm = await callLlm(messages);
    const parsedJson = parseLlmJsonContent(llm.content);
    const normalized = llmAnalysisSchema.parse(parsedJson);
    const rawResponse = parsedJson as Prisma.InputJsonValue;

    await prisma.$transaction([
      prisma.decisionAnalysis.upsert({
        where: { decisionId: decision.id },
        create: {
          decisionId: decision.id,
          category: normalized.category,
          cognitiveBiases: normalized.cognitiveBiases,
          missedAlternatives: normalized.missedAlternatives,
          summary: normalized.summary,
          risks: normalized.risks,
          reflectionQuestions: normalized.reflectionQuestions,
          nextSteps: normalized.nextSteps,
          qualityScore: normalized.qualityScore,
          rawResponse,
          provider: llm.provider,
          model: llm.model
        },
        update: {
          category: normalized.category,
          cognitiveBiases: normalized.cognitiveBiases,
          missedAlternatives: normalized.missedAlternatives,
          summary: normalized.summary,
          risks: normalized.risks,
          reflectionQuestions: normalized.reflectionQuestions,
          nextSteps: normalized.nextSteps,
          qualityScore: normalized.qualityScore,
          rawResponse,
          provider: llm.provider,
          model: llm.model
        }
      }),
      prisma.decision.update({
        where: { id: decision.id },
        data: {
          status: "READY",
          errorMessage: null
        }
      })
    ]);
  } catch (error) {
    console.error("Decision analysis failed", {
      decisionId: decision.id,
      userId,
      error
    });

    await prisma.decision.update({
      where: { id: decision.id },
      data: {
        status: "FAILED",
        errorMessage: SAFE_ANALYSIS_ERROR
      }
    });
    throw error;
  }
}
