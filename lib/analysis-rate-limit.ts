import "server-only";

import { prisma } from "@/lib/prisma";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;

export class RateLimitError extends Error {
  constructor() {
    super(
      "Забагато запитів на LLM-аналіз. Зачекайте кілька хвилин і повторіть спробу."
    );
    this.name = "RateLimitError";
  }
}

export async function assertAnalysisRateLimit(userId: string) {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const recentRequests = await prisma.analysisRequest.count({
    where: {
      userId,
      createdAt: {
        gte: windowStart
      }
    }
  });

  if (recentRequests >= MAX_REQUESTS) {
    throw new RateLimitError();
  }

  await prisma.analysisRequest.create({
    data: { userId }
  });
}
