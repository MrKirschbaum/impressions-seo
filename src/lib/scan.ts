import { buildGrid } from "./grid";
import { getProvider } from "./ranking";
import type { Location, RankedPoint, ScanResult } from "./types";

/** Runs one geo-grid scan. Cost: size^2 ranking lookups (49 for a 7x7). */
export async function runScan(location: Location, keyword: string, size: number): Promise<ScanResult> {
  const provider = getProvider();
  const grid = buildGrid(location.center, size);

  const points: RankedPoint[] = [];
  const BATCH = 8; // gentle concurrency so we don't hammer the API
  for (let i = 0; i < grid.length; i += BATCH) {
    const ranked = await Promise.all(
      grid.slice(i, i + BATCH).map(async (point) => ({
        ...point,
        rank: await provider.getRank({ keyword, point, location }),
      })),
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
