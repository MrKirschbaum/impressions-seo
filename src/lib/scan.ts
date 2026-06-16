import { buildGrid } from "./grid";
import { getProvider } from "./ranking";
import type { RankedEntrant } from "./ranking/provider";
import type { GridEntrant, Location, RankedPoint, ScanResult } from "./types";

const ENTRANTS_CAP = 10; // how many businesses we keep per point for competitor metrics

/** Is this result entry the business we're tracking? (placeId match, else name match). */
function isTarget(entry: RankedEntrant, location: Location): boolean {
  if (location.placeId && entry.placeId === location.placeId) return true;
  return (entry.name ?? "").toLowerCase().includes(location.name.toLowerCase());
}

/** Runs one geo-grid scan. Cost: size^2 ranking lookups (49 for a 7x7). */
export async function runScan(location: Location, keyword: string, size: number): Promise<ScanResult> {
  const provider = getProvider();
  const grid = buildGrid(location.center, size);

  const points: RankedPoint[] = [];
  const BATCH = 8; // gentle concurrency so we don't hammer the API
  for (let i = 0; i < grid.length; i += BATCH) {
    const ranked = await Promise.all(
      grid.slice(i, i + BATCH).map(async (point) => {
        const list = await provider.getRankings({ keyword, point, location });
        const idx = list.findIndex((e) => isTarget(e, location));
        const entrants: GridEntrant[] = list.slice(0, ENTRANTS_CAP).map((e) => ({
          placeId: e.placeId, name: e.name, isTarget: isTarget(e, location) || undefined,
        }));
        return { ...point, rank: idx === -1 ? null : idx + 1, entrants };
      }),
    );
    points.push(...ranked);
  }

  const eff = (r: number | null) => (r == null ? 20 : r);
  const amr = points.reduce((a, p) => a + eff(p.rank), 0) / points.length;
  const top3 = points.filter((p) => p.rank != null && p.rank <= 3).length / points.length;
  const top10 = points.filter((p) => p.rank != null && p.rank <= 10).length / points.length;

  return {
    id: `scan_${Date.now()}`,
    locationId: location.id,
    keyword,
    size,
    createdAt: new Date().toISOString(),
    points,
    amr: Number(amr.toFixed(1)),
    top3: Math.round(top3 * 100),
    top10: Math.round(top10 * 100),
  };
}
