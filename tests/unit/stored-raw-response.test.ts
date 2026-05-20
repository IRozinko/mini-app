import { afterEach, describe, expect, it } from "vitest";
import { getStoredRawResponse } from "@/lib/stored-raw-response";

describe("stored raw LLM response", () => {
  afterEach(() => {
    delete process.env.DEBUG_STORE_RAW_LLM_RESPONSE;
  });

  it("does not store raw responses by default", () => {
    expect(getStoredRawResponse({ category: "Career" })).toBeNull();
  });

  it("stores raw responses only when debug flag is enabled", () => {
    process.env.DEBUG_STORE_RAW_LLM_RESPONSE = "true";

    expect(getStoredRawResponse({ category: "Career" })).toEqual({
      category: "Career"
    });
  });

  it("truncates large debug raw responses", () => {
    process.env.DEBUG_STORE_RAW_LLM_RESPONSE = "true";

    const stored = getStoredRawResponse({ text: "x".repeat(5000) });

    expect(stored).toMatchObject({
      truncated: true,
      maxLength: 4000
    });
  });
});
