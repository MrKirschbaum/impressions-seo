import { NextRequest, NextResponse } from "next/server";
import { computeAudit } from "@/lib/gbp";

export const runtime = "nodejs";
export const maxDuration = 30;

/** GET /api/audit?locationId=&refresh=1 — GBP audit scorecard. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId") ?? "";
  const refresh = searchParams.get("refresh") === "1";
  const report = await computeAudit(locationId, { refresh });
  if (!report) return NextResponse.json({ error: "Unknown location" }, { status: 404 });
  return NextResponse.json(report);
}
