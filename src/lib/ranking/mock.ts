import type { RankingProvider, RankArgs, RankedEntrant } from "./provider";

const FALLBACK_RIVALS = ["Copyman", "Minuteman Press", "Brown Printing", "Trade Printing", "Francis & Co.", "Bridgetown Printing"];

/** Deterministic pseudo-random in [0,1) from a numeric seed. */
const frac = (n: number) => {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Deterministic model: strongest near the storefront, degrading with distance,
 * anchored to each keyword's known average position. Now returns a full ordered
 * result list — competitors drawn from the location's rivals, re-ordered per
 * point, with the target inserted at its modeled rank. No API calls, no key.
 */
export const mockProvider: RankingProvider = {
  async getRankings({ keyword, point, location }: RankArgs): Promise<RankedEntrant[]> {
    const baseline = location.keywords.find((k) => k.term === keyword)?.baseline ?? 10;
    const noise = frac(point.row * 12.9898 + point.col * 78.233 + baseline * 1.7);
    let rank = Math.round(baseline + point.dist * 2 + noise * 5 - 2.2);
    if (rank < 1) rank = 1;

    const pool = location.competitors.length ? location.competitors.map((c) => c.name) : FALLBACK_RIVALS;
    // Re-order rivals per point so different zones have different leaders.
    const ordered: RankedEntrant[] = pool
      .map((name, i) => ({ name, s: i + frac((point.row + 1) * (i + 3) * 12.9 + (point.col + 1) * 7.7 + baseline) * 4 }))
      .sort((a, b) => a.s - b.s)
      .map(({ name }) => ({ name }));

    if (rank <= 20) {
      ordered.splice(Math.min(rank - 1, ordered.length), 0, { name: location.name, placeId: location.placeId });
    }
    return ordered.slice(0, 20);
  },
};
