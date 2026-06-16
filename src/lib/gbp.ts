import { getLocation } from "@/data/seed";
import { readJson, writeJson } from "./db";
import { computeRollup } from "./rollup";
import type { AuditCheck, AuditReport, AuditStatus, GbpProfile, Location } from "./types";

const CACHE_FILE = "gbp.json";
const TTL_MS = 24 * 3600_000;
const DETAILS_ENDPOINT = "https://places.googleapis.com/v1/places/";

type Cache = Record<string, { fetchedAt: string; profile: GbpProfile }>;

type PlaceDetails = {
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  regularOpeningHours?: { weekdayDescriptions?: string[] };
};

/** Fetch live GBP facts from Places Details (one cheap call), cached 24h. */
async function fetchLiveProfile(location: Location, refresh: boolean): Promise<GbpProfile | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const isGoogle = (process.env.RANKING_PROVIDER ?? "mock").toLowerCase() === "google";
  if (!isGoogle || !key || !location.placeId) return null;

  const cache = await readJson<Cache>(CACHE_FILE, {});
  const hit = cache[location.id];
  if (!refresh && hit && Date.now() - new Date(hit.fetchedAt).getTime() < TTL_MS) return hit.profile;

  try {
    const res = await fetch(`${DETAILS_ENDPOINT}${location.placeId}`, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "rating,userRatingCount,websiteUri,nationalPhoneNumber,primaryTypeDisplayName,types,regularOpeningHours",
      },
    });
    if (!res.ok) throw new Error(`Places Details ${res.status}`);
    const d = (await res.json()) as PlaceDetails;
    const categories = [d.primaryTypeDisplayName?.text, ...(d.types ?? [])].filter(Boolean) as string[];
    const profile: GbpProfile = {
      rating: d.rating,
      reviews: d.userRatingCount,
      categories: categories.length ? categories : undefined,
      website: d.websiteUri,
      phone: d.nationalPhoneNumber,
      hours: !!d.regularOpeningHours?.weekdayDescriptions?.length,
    };
    cache[location.id] = { fetchedAt: new Date().toISOString(), profile };
    await writeJson(CACHE_FILE, cache);
    return profile;
  } catch (err) {
    console.error("[gbp] live profile fetch failed:", err);
    return hit?.profile ?? null;
  }
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const grade = (score: number) =>
  score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

/** Merged GBP profile (config + cached live enrichment). Reused by the win-model. */
export async function loadProfile(locationId: string, refresh = false): Promise<GbpProfile | null> {
  const location = getLocation(locationId);
  if (!location) return null;
  const live = await fetchLiveProfile(location, refresh);
  return { ...location.profile, ...(live ?? {}) };
}

/** Build the weighted GBP audit for a location. */
export async function computeAudit(locationId: string, opts: { refresh?: boolean } = {}): Promise<AuditReport | null> {
  const location = getLocation(locationId);
  if (!location) return null;

  const live = await fetchLiveProfile(location, !!opts.refresh);
  const profile: GbpProfile = { ...location.profile, ...(live ?? {}) };
  const rollup = await computeRollup(locationId);
  const checks: AuditCheck[] = [];

  const add = (key: string, label: string, weight: number, status: AuditStatus, fraction: number, detail: string, recommendation?: string) =>
    checks.push({ key, label, weight, status, score: Math.round(weight * fraction), detail, recommendation });

  // 1. Profile claimed / verified (placeId is our proxy for a live, mapped profile).
  location.placeId
    ? add("claimed", "Profile claimed & mapped", 10, "good", 1, "Linked to a Google Place ID.")
    : add("claimed", "Profile claimed & mapped", 10, "bad", 0, "No Google Place ID on file.", "Claim & verify the Google Business Profile, then add its placeId.");

  // 2. Categories.
  const cats = profile.categories ?? [];
  cats.length
    ? add("categories", "Categories set", 10, "good", 1, `Primary: ${cats[0]}${cats.length > 1 ? ` (+${cats.length - 1})` : ""}.`)
    : add("categories", "Categories set", 10, "unknown", 0, "No category data.", "Set a precise primary category (e.g. “Commercial printer”) plus relevant secondaries.");

  // 3. Website + phone.
  if (profile.website && profile.phone) add("contact", "Website & phone present", 10, "good", 1, "Both website and phone are set.");
  else if (profile.website || profile.phone) add("contact", "Website & phone present", 10, "warn", 0.5, `Missing ${profile.website ? "phone" : "website"}.`, "Add the missing contact field — both feed local ranking and conversions.");
  else add("contact", "Website & phone present", 10, "unknown", 0, "No contact data.", "Add website and a local phone number to the profile.");

  // 4. Hours.
  profile.hours
    ? add("hours", "Business hours set", 5, "good", 1, "Opening hours are published.")
    : add("hours", "Business hours set", 5, "unknown", 0, "No hours data.", "Publish accurate opening hours (and holiday hours).");

  // 5. Rating quality.
  if (profile.rating == null) add("rating", "Star rating", 15, "unknown", 0, "No rating data.", "Connect the profile to read the live star rating.");
  else if (profile.rating >= 4.7) add("rating", "Star rating", 15, "good", 1, `${profile.rating.toFixed(1)}★ — competitive.`);
  else if (profile.rating >= 4.3) add("rating", "Star rating", 15, "warn", 0.5, `${profile.rating.toFixed(1)}★ — middle of the pack.`, "Push toward 4.7★+ with a review-request flow after each job.");
  else add("rating", "Star rating", 15, "bad", 0, `${profile.rating.toFixed(1)}★ — below local norms.`, "Address service issues and actively request reviews.");

  // 6. Review volume vs competitors.
  const compReviews = location.competitors.map((c) => c.reviews).filter((n) => n > 0);
  const maxComp = compReviews.length ? Math.max(...compReviews) : 0;
  const medComp = median(compReviews);
  if (profile.reviews == null) {
    add("reviews", "Review volume vs rivals", 20, "unknown", 0, "Your review count is unknown.", "Connect the profile to benchmark review volume against competitors.");
  } else if (!compReviews.length) {
    add("reviews", "Review volume vs rivals", 20, "good", 1, `${profile.reviews} reviews; no competitor benchmark configured.`);
  } else if (profile.reviews >= maxComp) {
    add("reviews", "Review volume vs rivals", 20, "good", 1, `${profile.reviews} reviews — leads the local set (top rival ${maxComp}).`);
  } else if (profile.reviews >= medComp) {
    add("reviews", "Review volume vs rivals", 20, "warn", 0.55, `${profile.reviews} reviews — above median (${medComp}) but behind the leader (${maxComp}).`, `Close the gap to ${maxComp}+ reviews to out-signal the top competitor.`);
  } else {
    add("reviews", "Review volume vs rivals", 20, "bad", 0.15, `${profile.reviews} reviews — below the competitor median (${medComp}).`, `Prioritize review velocity; the local median is ${medComp} and the leader has ${maxComp}.`);
  }

  // 7. Keyword footprint.
  const tracked = location.keywords.length;
  if (tracked >= 8) add("footprint", "Keyword footprint", 10, "good", 1, `${tracked} keywords tracked.`);
  else if (tracked >= 3) add("footprint", "Keyword footprint", 10, "warn", 0.5, `${tracked} keywords tracked.`, "Expand to 8+ tracked terms to map your full service area.");
  else add("footprint", "Keyword footprint", 10, "bad", 0, `${tracked} keywords tracked.`, "Add the core terms customers search for this location.");

  // 8. Local-pack visibility (share of voice).
  if (!rollup.scannedKeywords) {
    add("visibility", "Local-pack visibility", 20, "unknown", 0, "No scans yet.", "Run scans (or schedule them) to measure where you appear in the map pack.");
  } else if (rollup.sov >= 50) {
    add("visibility", "Local-pack visibility", 20, "good", 1, `${rollup.sov}% avg top-3 across ${rollup.scannedKeywords} scanned keywords.`);
  } else if (rollup.sov >= 20) {
    add("visibility", "Local-pack visibility", 20, "warn", 0.5, `${rollup.sov}% avg top-3 — partial coverage.`, "Target the weakest keywords/zones from the visibility rollup.");
  } else {
    add("visibility", "Local-pack visibility", 20, "bad", 0.1, `${rollup.sov}% avg top-3 — low map presence.`, "Focus GBP optimization and reviews on your highest-intent keywords first.");
  }

  const score = checks.reduce((sum, c) => sum + c.score, 0);
  return {
    locationId,
    generatedAt: new Date().toISOString(),
    score,
    grade: grade(score),
    source: live ? "live" : "derived",
    checks,
  };
}
