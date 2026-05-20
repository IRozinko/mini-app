import type { Prisma } from "@prisma/client";

const MAX_RAW_RESPONSE_LENGTH = 4000;

export function getStoredRawResponse(parsedJson: unknown): Prisma.InputJsonValue | null {
  if (process.env.DEBUG_STORE_RAW_LLM_RESPONSE !== "true") {
    return null;
  }

  const serialized = JSON.stringify(parsedJson);
  if (!serialized) {
    return null;
  }

  if (serialized.length <= MAX_RAW_RESPONSE_LENGTH) {
    return parsedJson as Prisma.InputJsonValue;
  }

  return {
    truncated: true,
    maxLength: MAX_RAW_RESPONSE_LENGTH,
    serialized: serialized.slice(0, MAX_RAW_RESPONSE_LENGTH)
  };
}
