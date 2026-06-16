import { NextRequest, NextResponse } from "next/server";
import { getLocation } from "@/data/seed";
import { computeRollup } from "@/lib/rollup";

export const runtime = "nodejs";

/** GET /api/rollup?locationId= — share-of-voice / multi-keyword visibility rollup. */
export async function GET(req: NextRequest) {
  const locationId = new URL(req.url).searchParams.get("locationId") ?? "";
  if (!getLocation(locationId)) return NextResponse.json({ error: "Unknown location" }, { status: 404 });
  return NextResponse.json(await computeRollup(locationId));
}
