import { getLocation } from "@/data/seed";
import { listScanSummaries } from "./store";
import type { Rollup, KeywordVisibility } from "./types";

/**
 * Share-of-voice rollup: takes the most recent scan per keyword for a location
 * and summarizes overall local visibility. SoV = average top-3 % across
 * scanned keywords (the share of the map where you're in the local pack).
 */
export async function computeRollup(locationId: string): Promise<Rollup> {
  const location = getLocation(locationId);
  const summaries = await listScanSummaries({ locationId }); // newest first

  // Latest scan per keyword.
  const latest = new Map<string, KeywordVisibility>();
  for (const s of summaries) {
    if (latest.has(s.keyword)) continue;
    latest.set(s.keyword, {
      keyword: s.keyword, scanId: s.id, createdAt: s.createdAt,
      amr: s.amr, top3: s.top3, top10: s.top10, size: s.size,
    });
  }

  // Strongest → weakest: most local-pack coverage first, then best avg rank.
  const perKeyword = [...latest.values()].sort(
    (a, b) => b.top3 - a.top3 || a.amr - b.amr,
  );

  const n = perKeyword.length;
  const avg = (sel: (k: KeywordVisibility) => number) =>
    n ? Number((perKeyword.reduce((sum, k) => sum + sel(k), 0) / n).toFixed(1)) : 0;

  return {
    locationId,
    generatedAt: new Date().toISOString(),
    trackedKeywords: location?.keywords.length ?? n,
    scannedKeywords: n,
    sov: Math.round(avg((k) => k.top3)),
    avgTop10: Math.round(avg((k) => k.top10)),
    avgAmr: avg((k) => k.amr),
    perKeyword,
  };
}
