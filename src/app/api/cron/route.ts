import { NextResponse } from "next/server";
import { runDueSchedules } from "@/lib/scheduler";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Run all due schedules now. Also exposed for an external cron (or a manual
 * "run due now" button) so monitoring works even if the in-process ticker
 * isn't running. GET and POST both trigger it.
 */
async function run() {
  const result = await runDueSchedules();
  return NextResponse.json(result);
}

export const GET = run;
export const POST = run;
