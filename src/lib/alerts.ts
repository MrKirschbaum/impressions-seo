import { readJson, writeJson } from "./db";
import type { Alert, AlertSeverity } from "./types";

const FILE = "alerts.json";
const MAX = 200;

export async function listAlerts(): Promise<Alert[]> {
  return readJson<Alert[]>(FILE, []);
}

async function saveAll(alerts: Alert[]): Promise<void> {
  await writeJson(FILE, alerts.slice(0, MAX));
}

export async function addAlert(
  input: Omit<Alert, "id" | "read" | "createdAt"> & { createdAt?: string },
): Promise<Alert> {
  const alert: Alert = {
    id: `alt_${Date.now()}_${Math.round(input.newAmr * 10)}`,
    read: false,
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...input,
  };
  const all = await listAlerts();
  all.unshift(alert);
  await saveAll(all);
  return alert;
}

export async function markAllRead(): Promise<void> {
  const all = await listAlerts();
  await saveAll(all.map((a) => ({ ...a, read: true })));
}

export async function clearAlerts(): Promise<void> {
  await saveAll([]);
}

/**
 * Compare a fresh scan's AMR against the previous one for the same search and,
 * if it moved by at least `threshold` positions, return an alert to record.
 * Lower AMR is better, so a positive delta (amr went up) is a drop.
 */
export function evaluateMovement(args: {
  locationId: string;
  keyword: string;
  scanId: string;
  newAmr: number;
  prevAmr: number;
  threshold: number;
}): Omit<Alert, "id" | "read" | "createdAt"> | null {
  const { newAmr, prevAmr, threshold } = args;
  const delta = newAmr - prevAmr; // + = worse
  if (Math.abs(delta) < threshold) return null;
  const severity: AlertSeverity = delta > 0 ? "drop" : "improve";
  const verb = delta > 0 ? "dropped" : "improved";
  const arrow = delta > 0 ? "▼" : "▲";
  return {
    locationId: args.locationId,
    keyword: args.keyword,
    scanId: args.scanId,
    severity,
    prevAmr,
    newAmr,
    message: `${arrow} "${args.keyword}" ${verb} ${Math.abs(delta).toFixed(1)} positions — avg map rank ${prevAmr} → ${newAmr}`,
  };
}
