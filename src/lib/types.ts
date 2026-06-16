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

/** rank === null means the business was not found in the top 20 at this point. */
export type RankedPoint = GridPoint & { rank: number | null };

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
