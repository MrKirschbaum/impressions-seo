import { getLocation } from "@/data/seed";
import { runScan } from "./scan";
import { saveScan, listScanSummaries } from "./store";
import { listSchedules, commitRuns, computeNextRun } from "./schedules";
import { addAlert, evaluateMovement } from "./alerts";
import type { Schedule } from "./types";

/**
 * Run every schedule whose nextRunAt is due. Each run executes a real scan
 * (cost = size² lookups on the google provider), archives it, fires a drop/
 * improve alert if AMR moved past the threshold, and re-anchors nextRunAt.
 * Driven by the in-process ticker and the /api/cron endpoint.
 */
export async function runDueSchedules(nowMs = Date.now()): Promise<{ ran: number; alerts: number; skipped: number }> {
  const schedules = await listSchedules();
  const due = schedules.filter((s) => s.enabled && new Date(s.nextRunAt).getTime() <= nowMs);
  const updated: Schedule[] = [];
  let ran = 0, alerts = 0;

  for (const sc of due) {
    const location = getLocation(sc.locationId);
    if (!location) continue;
    try {
      // Capture the most recent prior scan for this search before adding a new one.
      const prior = await listScanSummaries({ locationId: sc.locationId, keyword: sc.keyword });
      const prev = prior[0] ?? null;

      const scan = await runScan(location, sc.keyword, sc.size);
      await saveScan(scan);
      ran++;

      if (prev) {
        const movement = evaluateMovement({
          locationId: sc.locationId, keyword: sc.keyword, scanId: scan.id,
          newAmr: scan.amr, prevAmr: prev.amr, threshold: sc.dropThreshold,
        });
        if (movement) { await addAlert(movement); alerts++; }
      }

      const ranAt = new Date(nowMs).toISOString();
      updated.push({ ...sc, lastRunAt: ranAt, nextRunAt: computeNextRun(ranAt, sc.intervalHours) });
    } catch (err) {
      console.error(`[scheduler] scan failed for ${sc.locationId}/${sc.keyword}:`, err);
      // Back off one interval so a failing schedule doesn't hammer the API each tick.
      const ranAt = new Date(nowMs).toISOString();
      updated.push({ ...sc, nextRunAt: computeNextRun(ranAt, sc.intervalHours) });
    }
  }

  await commitRuns(updated);
  return { ran, alerts, skipped: schedules.length - due.length };
}

const TICK_MS = 60_000;

/**
 * Start the background ticker once per process. Guarded on globalThis so Next's
 * dev-mode module reloading doesn't spin up duplicate timers. Started from
 * instrumentation.ts on server boot.
 */
export function startScheduler(): void {
  const g = globalThis as unknown as { __seoScheduler?: { timer: NodeJS.Timeout; running: boolean } };
  if (g.__seoScheduler) return;

  const state = { timer: null as unknown as NodeJS.Timeout, running: false };
  const tick = async () => {
    if (state.running) return; // never overlap runs
    state.running = true;
    try {
      const r = await runDueSchedules();
      if (r.ran) console.log(`[scheduler] ran ${r.ran} scan(s), ${r.alerts} alert(s)`);
    } catch (err) {
      console.error("[scheduler] tick error:", err);
    } finally {
      state.running = false;
    }
  };

  state.timer = setInterval(tick, TICK_MS);
  g.__seoScheduler = state;
  setTimeout(tick, 5_000); // first sweep shortly after boot
  console.log(`[scheduler] started — checking due schedules every ${TICK_MS / 1000}s`);
}
