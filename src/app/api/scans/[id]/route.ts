import { NextResponse } from "next/server";
import { getScan } from "@/lib/store";

export const runtime = "nodejs";

/** GET /api/scans/:id — one full scan (with points) to load into the viewer. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const scan = await getScan(params.id);
  if (!scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  return NextResponse.json(scan);
}
