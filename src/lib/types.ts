export type LatLng = { lat: number; lng: number };

export type Competitor = { name: string; rating: number; reviews: number; kind?: string };

export type KeywordSeed = { term: string; baseline: number };

/** Google Business Profile facts — filled from config or enriched live (Places Details). */
export type GbpProfile = {
  rating?: number;        // 0–5 star average
  reviews?: number;       // total review count
  categories?: string[];  // GBP categories, primary first
  website?: string;
  phone?: string;
  hours?: boolean;        // business hours are set
};

export type Location = {
  id: string;
  name: string;
  address: string;
  center: LatLng;
  placeId?: string;
  keywords: KeywordSeed[];
  competitors: Competitor[];
  profile?: GbpProfile;
};

export type GridPoint = {
  row: number; col: number;
  dx: number; dy: number; dist: number;
  lat: number; lng: number;
};

/** A business appearing in the local results at a point (ordered: index 0 = rank 1). */
export type GridEntrant = { placeId?: string; name: string; isTarget?: boolean };

/**
 * rank === null means the business was not found in the top 20 at this point.
 * `entrants` is the captured top-N ranked list at the point (competitor-capture
 * layer) — absent on scans run before that layer existed.
 */
export type RankedPoint = GridPoint & { rank: number | null; entrants?: GridEntrant[] };

export type ScanResult = {
  id: string;
  locationId: string;
  keyword: string;
  size: number;
  createdAt: string;
  points: RankedPoint[];
  amr: number;   // average map rank
  top3: number;  // % of points in top 3
  top10: number; // % of points in top 10
};

/**
 * A scan without its (size^2) points — cheap to list for the history library.
 * Carries everything the timeline and comparison picker need.
 */
export type ScanSummary = Omit<ScanResult, "points">;

/* ─── Monitoring: scheduled scans + drop alerts ─────────────────────────── */

/** A recurring scan. The in-process scheduler runs it every `intervalHours`. */
export type Schedule = {
  id: string;
  locationId: string;
  keyword: string;
  size: number;
  intervalHours: number;
  enabled: boolean;
  dropThreshold: number; // alert when AMR worsens by ≥ this many positions
  createdAt: string;
  lastRunAt: string | null;
  nextRunAt: string;
};

export type AlertSeverity = "drop" | "improve";

/** Fired by a scheduled scan when rank moved past a schedule's threshold. */
export type Alert = {
  id: string;
  createdAt: string;
  locationId: string;
  keyword: string;
  severity: AlertSeverity;
  message: string;
  prevAmr: number;
  newAmr: number;
  scanId: string;
  read: boolean;
};

/* ─── Share-of-voice rollup ─────────────────────────────────────────────── */

export type KeywordVisibility = {
  keyword: string;
  scanId: string;
  createdAt: string;
  amr: number;
  top3: number;
  top10: number;
  size: number;
};

export type Rollup = {
  locationId: string;
  generatedAt: string;
  trackedKeywords: number;   // keywords configured for the location
  scannedKeywords: number;   // keywords with at least one scan
  sov: number;               // share of local voice = avg top-3 % across scanned keywords
  avgTop10: number;
  avgAmr: number;
  perKeyword: KeywordVisibility[]; // strongest → weakest
};

/* ─── GBP audit ─────────────────────────────────────────────────────────── */

export type AuditStatus = "good" | "warn" | "bad" | "unknown";

export type AuditCheck = {
  key: string;
  label: string;
  status: AuditStatus;
  score: number;   // points earned, 0..weight
  weight: number;  // max points
  detail: string;
  recommendation?: string;
};

export type AuditReport = {
  locationId: string;
  generatedAt: string;
  score: number;   // 0..100
  grade: string;   // A–F
  source: "live" | "derived"; // live = enriched from Places Details
  checks: AuditCheck[];
};

/* ─── Competitive landscape (from captured per-point entrants) ───────────── */

/** How far from the storefront you hold a rank threshold (median rank ≤ K). */
export type ReachRadius = {
  top3Mi: number; top10Mi: number;
  top3Km: number; top10Km: number;
  gridRadiusMi: number; // distance to the outermost grid point (scan extent)
};

export type SolvEntry = {
  name: string; placeId?: string; isTarget: boolean;
  solv: number;        // 0..100 position-weighted local visibility
  top3Share: number;   // % of cells where it sits in the top 3
  appearances: number; // cells where it appears in the captured list
  avgRank: number;     // mean rank where present
};

/** Who holds the #1 spot across the map. */
export type KingEntry = { name: string; isTarget: boolean; cells: number; share: number };

export type HeadToHead = {
  name: string; placeId?: string;
  wins: number; losses: number; ties: number;
  winRate: number;            // % of contested cells you outrank them
  yourReviews?: number; theirReviews?: number;
};

export type WinBlocker = { name: string; cells: number; reviews?: number; rating?: number };

/** "What it takes to win" — closing top-3 in your weak zones. */
export type WinModel = {
  weakCells: number; totalCells: number;
  blockers: WinBlocker[];
  reviewThreshold?: number; targetReviews?: number; reviewGap?: number;
  ratingThreshold?: number; targetRating?: number;
  summary: string;
};

export type CompetitionReport = {
  scanId: string; locationId: string; keyword: string; generatedAt: string;
  totalPoints: number;
  reach: ReachRadius;
  hasCompetitors: boolean;    // false for pre-capture scans
  shareOfNo1: number;         // target's % of #1 cells
  kings: KingEntry[];
  solv: SolvEntry[];
  headToHead: HeadToHead[];
  winModel: WinModel | null;
};
