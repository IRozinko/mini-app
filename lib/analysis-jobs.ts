import "server-only";

import {
  AnalysisJobStatus,
  AnalysisJobTrigger,
  DecisionStatus
} from "@prisma/client";
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
  const [, job] = await prisma.$transaction([
    prisma.decision.update({
      where: { id: decisionId },
      data: {
        status: DecisionStatus.PROCESSING,
        errorMessage: null
      }
    }),
    prisma.analysisJob.create({
      data: {
        decisionId,
        userId,
        trigger,
        status: AnalysisJobStatus.QUEUED
      }
    })
  ]);

  return job;
}

export async function processAnalysisJob(jobId: string, userId: string) {
  const job = await prisma.analysisJob.findFirst({
    where: {
      id: jobId,
      userId,
      status: AnalysisJobStatus.QUEUED
    }
  });

  if (!job) {
    return null;
  }

  await prisma.analysisJob.update({
    where: { id: job.id },
    data: {
      status: AnalysisJobStatus.RUNNING,
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
        status: AnalysisJobStatus.DONE,
        finishedAt: new Date(),
        errorMessage: null
      }
    });
    return AnalysisJobStatus.DONE;
  } catch (error) {
    console.error("Analysis job failed", { jobId: job.id, error });
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        status: AnalysisJobStatus.FAILED,
        finishedAt: new Date(),
        errorMessage: SAFE_JOB_ERROR
      }
    });
    throw error;
  }
}

export async function failOpenAnalysisJobsForDecision({
  decisionId,
  userId,
  errorMessage
}: {
  decisionId: string;
  userId: string;
  errorMessage: string;
}) {
  const now = new Date();

  await prisma.$transaction([
    prisma.analysisJob.updateMany({
      where: {
        decisionId,
        userId,
        status: {
          in: [AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING]
        }
      },
      data: {
        status: AnalysisJobStatus.FAILED,
        finishedAt: now,
        errorMessage
      }
    }),
    prisma.decision.update({
      where: { id: decisionId },
      data: {
        status: DecisionStatus.FAILED,
        errorMessage
      }
    })
  ]);
}

export async function processNextQueuedAnalysisJob(limit = 3) {
  const jobs = await prisma.analysisJob.findMany({
    where: {
      status: AnalysisJobStatus.QUEUED,
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
