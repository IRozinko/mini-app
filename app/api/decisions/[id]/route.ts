import { AnalysisJobStatus, DecisionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { failOpenAnalysisJobsForDecision } from "@/lib/analysis-jobs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const STALE_PROCESSING_MS = 2 * 60 * 1000;
const STALE_PROCESSING_ERROR =
  "Аналіз тривав занадто довго або був перерваний платформою. Натисніть «Повторити аналіз», щоб запустити його ще раз.";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let decision = await prisma.decision.findFirst({
    where: {
      id: params.id,
      userId: user.id
    },
    select: {
      id: true,
      status: true,
      errorMessage: true,
      updatedAt: true,
      analysisJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          runAfter: true,
          lockedAt: true,
          startedAt: true,
          updatedAt: true,
          errorMessage: true
        }
      },
      analysis: {
        select: {
          category: true,
          qualityScore: true
        }
      }
    }
  });

  if (!decision) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isStaleProcessing =
    decision.status === DecisionStatus.PROCESSING &&
    Date.now() - decision.updatedAt.getTime() > STALE_PROCESSING_MS;
  const latestJob = decision.analysisJobs[0];
  const jobStaleTime =
    latestJob?.startedAt ??
    latestJob?.lockedAt ??
    latestJob?.runAfter ??
    latestJob?.updatedAt;
  const isStaleJob =
    decision.status === DecisionStatus.PROCESSING &&
    latestJob?.status &&
    (latestJob.status === AnalysisJobStatus.QUEUED ||
      latestJob.status === AnalysisJobStatus.RUNNING) &&
    jobStaleTime &&
    Date.now() - jobStaleTime.getTime() > STALE_PROCESSING_MS;

  if (isStaleProcessing || isStaleJob) {
    await failOpenAnalysisJobsForDecision({
      decisionId: decision.id,
      userId: user.id,
      errorMessage: STALE_PROCESSING_ERROR
    });

    decision = await prisma.decision.findFirstOrThrow({
      where: {
        id: params.id,
        userId: user.id
      },
      select: {
        id: true,
        status: true,
        errorMessage: true,
        updatedAt: true,
        analysisJobs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            runAfter: true,
            lockedAt: true,
            startedAt: true,
            updatedAt: true,
            errorMessage: true
          }
        },
        analysis: {
          select: {
            category: true,
            qualityScore: true
          }
        }
      }
    });
  }

  return NextResponse.json(decision);
}
