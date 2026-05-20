import "server-only";

import { prisma } from "@/lib/prisma";
import {
  ANALYSIS_RATE_LIMIT_WINDOW_MS,
  isAnalysisRateLimited,
  RATE_LIMIT_MESSAGE
} from "@/lib/analysis-rate-limit-policy";

export { isAnalysisRateLimited, RATE_LIMIT_MESSAGE };

export class RateLimitError extends Error {
  constructor() {
    super(RATE_LIMIT_MESSAGE);
    this.name = "RateLimitError";
  }
}

export async function assertAnalysisRateLimit(userId: string) {
  const windowStart = new Date(Date.now() - ANALYSIS_RATE_LIMIT_WINDOW_MS);
  const recentRequests = await prisma.analysisRequest.count({
    where: {
      userId,
      createdAt: {
        gte: windowStart
      }
    }
  });

  if (isAnalysisRateLimited(recentRequests)) {
    throw new RateLimitError();
  }

  await prisma.analysisRequest.create({
    data: { userId }
  });
}
