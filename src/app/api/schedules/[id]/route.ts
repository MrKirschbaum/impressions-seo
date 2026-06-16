import { NextRequest, NextResponse } from "next/server";
import { updateSchedule, deleteSchedule } from "@/lib/schedules";

export const runtime = "nodejs";

/** PATCH /api/schedules/:id — toggle enabled / change cadence, size, threshold. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.intervalHours != null) patch.intervalHours = Number(body.intervalHours);
  if (body.size != null) patch.size = Number(body.size);
  if (body.dropThreshold != null) patch.dropThreshold = Number(body.dropThreshold);
  const updated = await updateSchedule(params.id, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

/** DELETE /api/schedules/:id */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ok = await deleteSchedule(params.id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
