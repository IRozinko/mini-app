import { describe, expect, it } from "vitest";
import { llmAnalysisSchema } from "@/lib/analysis-schema";

const baseAnalysis = {
  category: "Карʼєра",
  cognitiveBiases: [],
  missedAlternatives: []
};

describe("LLM analysis schema", () => {
  it("accepts a valid qualityScore", () => {
    const parsed = llmAnalysisSchema.parse({
      ...baseAnalysis,
      qualityScore: 10
    });

    expect(parsed.qualityScore).toBe(10);
  });

  it("rejects qualityScore outside 1..10", () => {
    expect(() =>
      llmAnalysisSchema.parse({
        ...baseAnalysis,
        qualityScore: 11
      })
    ).toThrow();

    expect(() =>
      llmAnalysisSchema.parse({
        ...baseAnalysis,
        qualityScore: 0
      })
    ).toThrow();
  });
});
