import { AnalysisJobTrigger } from "@prisma/client";
import { NextResponse } from "next/server";
import { assertAnalysisRateLimit, RateLimitError } from "@/lib/analysis-rate-limit";
import { enqueueAnalysisJob, processAnalysisJob } from "@/lib/analysis-jobs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decision = await prisma.decision.findFirst({
    where: {
      id: params.id,
      userId: user.id
    },
    select: { id: true }
  });

  if (!decision) {
    return NextResponse.json({ error: "Decision not found." }, { status: 404 });
  }

  try {
    await assertAnalysisRateLimit(user.id);

    let job = await prisma.analysisJob.findFirst({
      where: {
        decisionId: decision.id,
        userId: user.id,
        status: "QUEUED"
      },
      orderBy: { createdAt: "desc" }
    });

    if (!job) {
      await enqueueAnalysisJob({
        decisionId: decision.id,
        userId: user.id,
        trigger: AnalysisJobTrigger.RETRY
      });
      job = await prisma.analysisJob.findFirstOrThrow({
        where: {
          decisionId: decision.id,
          userId: user.id,
          status: "QUEUED"
        },
        orderBy: { createdAt: "desc" }
      });
    }

    await processAnalysisJob(job.id, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof RateLimitError ? 429 : 500;
    return NextResponse.json(
      {
        error:
          error instanceof RateLimitError
            ? error.message
            : "Не вдалося виконати LLM-аналіз. Спробуйте ще раз пізніше."
      },
      { status }
    );
  }
}
