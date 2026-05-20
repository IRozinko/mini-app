import "server-only";

import { AnalysisJobTrigger, DecisionStatus } from "@prisma/client";
import { analyzeDecisionForUser } from "@/lib/analysis";
import { prisma } from "@/lib/prisma";

const SAFE_JOB_ERROR =
  "Аналіз не вдалося завершити. Натисніть «Повторити аналіз», щоб запустити його ще раз.";

export async function enqueueAnalysisJob({
  decisionId,
  userId,
  trigger
}: {
  decisionId: string;
  userId: string;
  trigger: AnalysisJobTrigger;
}) {
  await prisma.decision.update({
    where: { id: decisionId },
    data: {
      status: DecisionStatus.PROCESSING,
      errorMessage: null
    }
  });

  await prisma.analysisJob.create({
    data: {
      decisionId,
      userId,
      trigger,
      status: "QUEUED"
    }
  });
}

export async function processAnalysisJob(jobId: string, userId: string) {
  const job = await prisma.analysisJob.findFirst({
    where: {
      id: jobId,
      userId,
      status: {
        in: ["QUEUED", "FAILED"]
      }
    }
  });

  if (!job) {
    return;
  }

  await prisma.analysisJob.update({
    where: { id: job.id },
    data: {
      status: "RUNNING",
      attempts: {
        increment: 1
      },
      lockedAt: new Date(),
      startedAt: new Date(),
      errorMessage: null
    }
  });

  try {
    await analyzeDecisionForUser(job.decisionId, job.userId);
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        status: "DONE",
        finishedAt: new Date(),
        errorMessage: null
      }
    });
  } catch (error) {
    console.error("Analysis job failed", { jobId: job.id, error });
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: SAFE_JOB_ERROR
      }
    });
  }
}

export async function processNextQueuedAnalysisJob(limit = 3) {
  const jobs = await prisma.analysisJob.findMany({
    where: {
      status: "QUEUED",
      runAfter: {
        lte: new Date()
      }
    },
    orderBy: {
      createdAt: "asc"
    },
    take: limit
  });

  for (const job of jobs) {
    await processAnalysisJob(job.id, job.userId);
  }

  return jobs.length;
}
