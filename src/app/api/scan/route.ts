import { NextRequest, NextResponse } from "next/server";
import { getLocation } from "@/data/seed";
import { runScan } from "@/lib/scan";
import { saveScan } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { locationId, keyword, size } = await req.json();
    const location = getLocation(locationId);
    if (!location) return NextResponse.json({ error: "Unknown location" }, { status: 404 });
    if (!keyword) return NextResponse.json({ error: "Missing keyword" }, { status: 400 });

    const scan = await runScan(location, keyword, Number(size) || 7);
    await saveScan(scan);
    return NextResponse.json(scan);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 },
    );
  }
}
