import { promises as fs } from "fs";
import path from "path";
import type { ScanResult, ScanSummary } from "./types";

/**
 * JSON-file store — zero-config, great for local dev or self-hosting (Pi / VPS).
 * For Vercel/serverless (read-only fs), implement these two functions against
 * Postgres (Neon / Vercel Postgres). The signatures are the contract.
 */
const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "scans.json");

async function readAll(): Promise<ScanResult[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as ScanResult[];
  } catch {
    return [];
  }
}

export async function saveScan(scan: ScanResult): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const all = await readAll();
  all.unshift(scan);
  await fs.writeFile(FILE, JSON.stringify(all.slice(0, 500), null, 2));
}

export async function listScans(locationId?: string): Promise<ScanResult[]> {
  const all = await readAll();
  return locationId ? all.filter((s) => s.locationId === locationId) : all;
}

/** Fetch one full scan (with points) by id — used to load a past scan into the viewer. */
export async function getScan(id: string): Promise<ScanResult | null> {
  const all = await readAll();
  return all.find((s) => s.id === id) ?? null;
}

/**
 * The history library: scan summaries (no points), newest first, optionally
 * narrowed to a location and/or keyword. Cheap to send to the client.
 */
export async function listScanSummaries(
  filter: { locationId?: string; keyword?: string } = {},
): Promise<ScanSummary[]> {
  const all = await readAll();
  return all
    .filter(
      (s) =>
        (!filter.locationId || s.locationId === filter.locationId) &&
        (!filter.keyword || s.keyword === filter.keyword),
    )
    .map(({ points: _points, ...summary }) => summary);
}
