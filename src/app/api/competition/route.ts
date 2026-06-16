import { NextRequest, NextResponse } from "next/server";
import { getScan } from "@/lib/store";
import { computeCompetition } from "@/lib/competition";

export const runtime = "nodejs";
export const maxDuration = 30;

/** GET /api/competition?scanId= — competitive landscape for one scan. */
export async function GET(req: NextRequest) {
  const scanId = new URL(req.url).searchParams.get("scanId") ?? "";
  const scan = await getScan(scanId);
  if (!scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  return NextResponse.json(await computeCompetition(scan));
}
