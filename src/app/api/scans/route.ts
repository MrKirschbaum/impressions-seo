import { NextRequest, NextResponse } from "next/server";
import { listScanSummaries } from "@/lib/store";

export const runtime = "nodejs";

/** GET /api/scans?locationId=&keyword=  — history summaries, newest first. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId") ?? undefined;
  const keyword = searchParams.get("keyword") ?? undefined;
  const summaries = await listScanSummaries({ locationId, keyword });
  return NextResponse.json(summaries);
}
