import { describe, expect, it } from "vitest";
import { isAnalysisRateLimited } from "@/lib/analysis-rate-limit-policy";

describe("analysis rate limit helper", () => {
  it("allows users below the request limit", () => {
    expect(isAnalysisRateLimited(0)).toBe(false);
    expect(isAnalysisRateLimited(4)).toBe(false);
  });

  it("blocks users at or above the request limit", () => {
    expect(isAnalysisRateLimited(5)).toBe(true);
    expect(isAnalysisRateLimited(6)).toBe(true);
  });
});
