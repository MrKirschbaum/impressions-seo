import { readJson, writeJson } from "./db";
import type { Schedule } from "./types";

const FILE = "schedules.json";

export async function listSchedules(): Promise<Schedule[]> {
  return readJson<Schedule[]>(FILE, []);
}

async function saveAll(schedules: Schedule[]): Promise<void> {
  await writeJson(FILE, schedules);
}

export function computeNextRun(fromIso: string, intervalHours: number): string {
  return new Date(new Date(fromIso).getTime() + intervalHours * 3600_000).toISOString();
}

export async function createSchedule(input: {
  locationId: string;
  keyword: string;
  size?: number;
  intervalHours?: number;
  dropThreshold?: number;
}): Promise<Schedule> {
  const now = new Date().toISOString();
  const schedule: Schedule = {
    id: `sch_${Date.now()}`,
    locationId: input.locationId,
    keyword: input.keyword,
    size: input.size ?? 7,
    intervalHours: Math.max(1, input.intervalHours ?? 168), // default weekly, floor 1h
    enabled: true,
    dropThreshold: input.dropThreshold ?? 1,
    createdAt: now,
    lastRunAt: null,
    nextRunAt: now, // first scan fires on the next scheduler tick → instant baseline
  };
  const all = await listSchedules();
  all.unshift(schedule);
  await saveAll(all);
  return schedule;
}

export async function updateSchedule(
  id: string,
  patch: Partial<Pick<Schedule, "enabled" | "intervalHours" | "size" | "dropThreshold" | "lastRunAt" | "nextRunAt">>,
): Promise<Schedule | null> {
  const all = await listSchedules();
  const i = all.findIndex((s) => s.id === id);
  if (i === -1) return null;
  const merged = { ...all[i], ...patch };
  // Re-enabling or changing cadence re-anchors the next run.
  if (patch.intervalHours && patch.intervalHours !== all[i].intervalHours) {
    merged.intervalHours = Math.max(1, patch.intervalHours);
    merged.nextRunAt = computeNextRun(merged.lastRunAt ?? new Date().toISOString(), merged.intervalHours);
  }
  all[i] = merged;
  await saveAll(all);
  return merged;
}

export async function deleteSchedule(id: string): Promise<boolean> {
  const all = await listSchedules();
  const next = all.filter((s) => s.id !== id);
  if (next.length === all.length) return false;
  await saveAll(next);
  return true;
}

/** Persist scheduler-side mutations (lastRunAt/nextRunAt) for a batch of runs. */
export async function commitRuns(updated: Schedule[]): Promise<void> {
  if (!updated.length) return;
  const byId = new Map(updated.map((s) => [s.id, s]));
  const all = await listSchedules();
  await saveAll(all.map((s) => byId.get(s.id) ?? s));
}
