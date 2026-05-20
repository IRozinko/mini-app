import { DecisionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
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

  if (isStaleProcessing) {
    decision = await prisma.decision.update({
      where: { id: decision.id },
      data: {
        status: DecisionStatus.FAILED,
        errorMessage: STALE_PROCESSING_ERROR
      },
      select: {
        id: true,
        status: true,
        errorMessage: true,
        updatedAt: true,
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
