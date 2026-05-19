import { NextResponse } from "next/server";
import { analyzeDecisionForUser } from "@/lib/analysis";
import { getCurrentUser } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await analyzeDecisionForUser(params.id, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Analysis failed unexpectedly.";
    const status = message === "Decision not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
