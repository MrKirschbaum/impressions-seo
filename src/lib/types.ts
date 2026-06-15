export type LatLng = { lat: number; lng: number };

export type Competitor = { name: string; rating: number; reviews: number; kind?: string };

export type KeywordSeed = { term: string; baseline: number };

export type Location = {
  id: string;
  name: string;
  address: string;
  center: LatLng;
  placeId?: string;
  keywords: KeywordSeed[];
  competitors: Competitor[];
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
