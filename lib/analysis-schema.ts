import { z } from "zod";

const biasSchema = z.object({
  name: z.string().min(1),
  explanation: z.string().min(1)
});

const alternativeSchema = z.object({
  alternative: z.string().min(1),
  whyItMatters: z.string().min(1)
});

export const llmAnalysisSchema = z.object({
  category: z.string().min(1),
  cognitiveBiases: z.array(biasSchema).default([]),
  missedAlternatives: z.array(alternativeSchema).default([]),
  summary: z.string().optional(),
  risks: z.array(z.string()).default([]),
  reflectionQuestions: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
  qualityScore: z.coerce.number().int().min(1).max(10).optional()
});

export type LlmAnalysis = z.infer<typeof llmAnalysisSchema>;
