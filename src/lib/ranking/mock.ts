import type { RankingProvider, RankArgs } from "./provider";

/**
 * Deterministic model: strongest near the storefront, degrading with distance,
 * anchored to each keyword's known average position. No API calls, no key —
 * perfect for local dev, demos, and CI.
 */
export const mockProvider: RankingProvider = {
  async getRank({ keyword, point, location }: RankArgs) {
    const baseline = location.keywords.find((k) => k.term === keyword)?.baseline ?? 10;
    const seed = Math.sin(point.row * 12.9898 + point.col * 78.233 + baseline * 1.7) * 43758.545;
    const noise = seed - Math.floor(seed);
    let rank = Math.round(baseline + point.dist * 2 + noise * 5 - 2.2);
    if (rank < 1) rank = 1;
    return rank > 20 ? null : rank;
  },
};
