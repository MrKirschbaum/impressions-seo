import { NextRequest, NextResponse } from "next/server";
import { getLocation } from "@/data/seed";
import { listSchedules, createSchedule } from "@/lib/schedules";

export const runtime = "nodejs";

/** GET /api/schedules — all recurring-scan schedules, newest first. */
export async function GET() {
  return NextResponse.json(await listSchedules());
}

/** POST /api/schedules — create a recurring scan. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { locationId, keyword } = body ?? {};
    if (!getLocation(locationId)) return NextResponse.json({ error: "Unknown location" }, { status: 404 });
    if (!keyword) return NextResponse.json({ error: "Missing keyword" }, { status: 400 });
    const schedule = await createSchedule({
      locationId,
      keyword,
      size: Number(body.size) || 7,
      intervalHours: Number(body.intervalHours) || 168,
      dropThreshold: Number(body.dropThreshold) || 1,
    });
    return NextResponse.json(schedule, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
