import { describe, expect, it } from "vitest";
import { extractJson, parseLlmJsonContent } from "@/lib/llm-json";

describe("LLM JSON parsing", () => {
  it("parses a plain JSON response", () => {
    const parsed = parseLlmJsonContent('{"category":"Карʼєра","qualityScore":8}');

    expect(parsed).toEqual({
      category: "Карʼєра",
      qualityScore: 8
    });
  });

  it("extracts JSON from a fenced response", () => {
    const content = [
      "Ось аналіз:",
      "```json",
      '{"category":"Фінанси","qualityScore":6}',
      "```"
    ].join("\n");

    expect(extractJson(content)).toBe('{"category":"Фінанси","qualityScore":6}');
    expect(parseLlmJsonContent(content)).toEqual({
      category: "Фінанси",
      qualityScore: 6
    });
  });

  it("throws for invalid JSON response", () => {
    expect(() => parseLlmJsonContent("not json at all")).toThrow(
      "LLM response did not contain JSON."
    );
    expect(() => parseLlmJsonContent("{ invalid json }")).toThrow(SyntaxError);
  });
});
