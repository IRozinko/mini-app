import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(
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
    select: {
      id: true,
      status: true,
      errorMessage: true,
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

  return NextResponse.json(decision);
}
