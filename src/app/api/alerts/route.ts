import { NextRequest, NextResponse } from "next/server";
import { listAlerts, markAllRead, clearAlerts } from "@/lib/alerts";

export const runtime = "nodejs";

/** GET /api/alerts — recent rank-movement alerts, newest first. */
export async function GET() {
  return NextResponse.json(await listAlerts());
}

/** POST /api/alerts  { action: "read" | "clear" } */
export async function POST(req: NextRequest) {
  const { action } = await req.json().catch(() => ({}));
  if (action === "clear") await clearAlerts();
  else await markAllRead();
  return NextResponse.json({ ok: true });
}
