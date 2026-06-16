import { getLocation } from "@/data/seed";
import { loadProfile } from "./gbp";
import type {
  CompetitionReport, GridEntrant, HeadToHead, KingEntry, LatLng,
  RankedPoint, ReachRadius, ScanResult, SolvEntry, WinBlocker, WinModel,
} from "./types";

const MI_PER_KM = 0.621371;

/* ── helpers ────────────────────────────────────────────────────────────── */
const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;
const entKey = (e: GridEntrant) => (e.placeId || e.name).toLowerCase();
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function median(nums: number[]): number | undefined {
  if (!nums.length) return undefined;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Largest centered disc (miles) whose median rank ≤ K. */
function computeReach(points: RankedPoint[], center: LatLng): ReachRadius {
  const ranked = points
    .map((p) => ({ rank: p.rank == null ? 21 : p.rank, mi: haversineKm({ lat: p.lat, lng: p.lng }, center) * MI_PER_KM }))
    .sort((a, b) => a.mi - b.mi);

  const reachFor = (k: number) => {
    let reach = 0;
    for (let i = 0; i < ranked.length; i++) {
      const within = ranked.slice(0, i + 1).map((w) => w.rank).sort((a, b) => a - b);
      const med = within[Math.floor((within.length - 1) / 2)]; // lower median
      if (med <= k) reach = ranked[i].mi;
      else break;
    }
    return reach;
  };

  const top3Mi = reachFor(3), top10Mi = reachFor(10);
  return {
    top3Mi: r1(top3Mi), top10Mi: r1(top10Mi),
    top3Km: r1(top3Mi / MI_PER_KM), top10Km: r1(top10Mi / MI_PER_KM),
    gridRadiusMi: r1(ranked[ranked.length - 1]?.mi ?? 0),
  };
}

/** Full competitive analysis for one scan. */
export async function computeCompetition(scan: ScanResult): Promise<CompetitionReport> {
  const location = getLocation(scan.locationId);
  const points = scan.points;
  const total = points.length;
  const center = points.find((p) => p.dx === 0 && p.dy === 0) ?? points[0];

  const reach = computeReach(points, { lat: center.lat, lng: center.lng });
  const hasCompetitors = points.some((p) => p.entrants && p.entrants.length);

  const base: CompetitionReport = {
    scanId: scan.id, locationId: scan.locationId, keyword: scan.keyword,
    generatedAt: new Date().toISOString(), totalPoints: total, reach,
    hasCompetitors, shareOfNo1: 0, kings: [], solv: [], headToHead: [], winModel: null,
  };
  if (!hasCompetitors) return base;

  // Review/rating lookup: target from profile, competitors from seed competitor list.
  const profile = await loadProfile(scan.locationId).catch(() => null);
  const compStats = new Map<string, { reviews?: number; rating?: number }>();
  location?.competitors.forEach((c) => compStats.set(norm(c.name), { reviews: c.reviews, rating: c.rating }));
  const statsFor = (name: string) => {
    const n = norm(name);
    for (const [k, v] of compStats) if (n.includes(k) || k.includes(n)) return v;
    return undefined;
  };

  /* ── SoLV leaderboard ── */
  type Agg = { name: string; placeId?: string; isTarget: boolean; sum: number; top3: number; appear: number; rankSum: number };
  const agg = new Map<string, Agg>();
  for (const p of points) {
    (p.entrants ?? []).forEach((e, i) => {
      const rank = i + 1, k = entKey(e);
      const a = agg.get(k) ?? { name: e.name, placeId: e.placeId, isTarget: false, sum: 0, top3: 0, appear: 0, rankSum: 0 };
      a.sum += Math.max(0, (11 - rank) / 10); // rank1=1.0 … rank10=0.1
      a.appear += 1; a.rankSum += rank;
      if (rank <= 3) a.top3 += 1;
      a.isTarget = a.isTarget || !!e.isTarget;
      agg.set(k, a);
    });
  }
  const solv: SolvEntry[] = [...agg.values()]
    .map((a) => ({
      name: a.name, placeId: a.placeId, isTarget: a.isTarget,
      solv: r0((a.sum / total) * 100), top3Share: r0((a.top3 / total) * 100),
      appearances: a.appear, avgRank: r1(a.rankSum / a.appear),
    }))
    .sort((x, y) => y.solv - x.solv);

  /* ── Share of #1 + kings of the map ── */
  const kingCount = new Map<string, { name: string; isTarget: boolean; cells: number }>();
  let targetNo1 = 0;
  for (const p of points) {
    const top = (p.entrants ?? [])[0];
    if (!top) continue;
    const k = entKey(top);
    const e = kingCount.get(k) ?? { name: top.name, isTarget: !!top.isTarget, cells: 0 };
    e.cells += 1; kingCount.set(k, e);
    if (top.isTarget) targetNo1 += 1;
  }
  const kings: KingEntry[] = [...kingCount.values()]
    .map((e) => ({ name: e.name, isTarget: e.isTarget, cells: e.cells, share: r0((e.cells / total) * 100) }))
    .sort((a, b) => b.cells - a.cells)
    .slice(0, 6);

  /* ── Head-to-head vs the strongest rivals ── */
  const rivals = solv.filter((s) => !s.isTarget).slice(0, 5);
  const rankAt = (p: RankedPoint, k: string) => {
    const i = (p.entrants ?? []).findIndex((e) => entKey(e) === k);
    return i === -1 ? null : i + 1;
  };
  const headToHead: HeadToHead[] = rivals.map((rv) => {
    const k = (rv.placeId || rv.name).toLowerCase();
    let wins = 0, losses = 0, ties = 0;
    for (const p of points) {
      const tr = p.rank, cr = rankAt(p, k);
      if (tr == null || cr == null) continue;
      if (tr < cr) wins += 1; else if (tr > cr) losses += 1; else ties += 1;
    }
    return {
      name: rv.name, placeId: rv.placeId, wins, losses, ties,
      winRate: wins + losses ? r0((wins / (wins + losses)) * 100) : 0,
      yourReviews: profile?.reviews, theirReviews: statsFor(rv.name)?.reviews,
    };
  });

  /* ── What it takes to win (break into top-3) ── */
  const weak = points.filter((p) => p.rank == null || p.rank > 3);
  const blockerCount = new Map<string, WinBlocker>();
  const gatekeeperReviews: number[] = [];
  const gatekeeperRatings: number[] = [];
  for (const p of weak) {
    const es = p.entrants ?? [];
    es.slice(0, 3).filter((e) => !e.isTarget).forEach((e) => {
      const k = entKey(e);
      const b = blockerCount.get(k) ?? { name: e.name, cells: 0, ...statsFor(e.name) };
      b.cells += 1; blockerCount.set(k, b);
    });
    const gatekeeper = es[2]; // the rank-3 holder you'd need to pass
    if (gatekeeper && !gatekeeper.isTarget) {
      const st = statsFor(gatekeeper.name);
      if (st?.reviews != null) gatekeeperReviews.push(st.reviews);
      if (st?.rating != null) gatekeeperRatings.push(st.rating);
    }
  }
  const blockers = [...blockerCount.values()].sort((a, b) => b.cells - a.cells).slice(0, 4);
  const reviewThreshold = median(gatekeeperReviews);
  const ratingThreshold = median(gatekeeperRatings);
  const targetReviews = profile?.reviews;
  const reviewGap = reviewThreshold != null && targetReviews != null ? Math.max(0, r0(reviewThreshold - targetReviews)) : undefined;

  let summary: string;
  if (!weak.length) {
    summary = "You already hold top-3 across the entire grid. Defend it — keep review velocity up.";
  } else if (reviewThreshold != null && targetReviews != null) {
    summary = reviewGap
      ? `Top-3 in your ${weak.length} weak cells is held by businesses with ~${reviewThreshold} reviews; you have ${targetReviews}. Closing ~${reviewGap} reviews puts you in contention${blockers[0] ? `, starting with ${blockers[0].name}` : ""}.`
      : `Your ${targetReviews} reviews already meet the ~${reviewThreshold}-review bar in your weak cells — the gap is positional/proximity, not reviews. Focus GBP relevance and posts.`;
  } else if (reviewThreshold != null) {
    summary = `Top-3 in your ${weak.length} weak cells is held by businesses with ~${reviewThreshold} reviews. Connect your profile to benchmark your own count.`;
  } else {
    summary = `${blockers[0]?.name ?? "Rivals"} and others keep you out of top-3 in ${weak.length} cells. Add competitor review data to quantify the gap.`;
  }

  const winModel: WinModel = {
    weakCells: weak.length, totalCells: total, blockers,
    reviewThreshold, targetReviews, reviewGap, ratingThreshold,
    targetRating: profile?.rating, summary,
  };

  return { ...base, shareOfNo1: r0((targetNo1 / total) * 100), kings, solv: solv.slice(0, 12), headToHead, winModel };
}
