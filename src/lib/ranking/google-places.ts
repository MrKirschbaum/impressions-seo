import type { RankingProvider, RankArgs, RankedEntrant } from "./provider";

const RADIUS_M = Number(process.env.SCAN_RADIUS_M ?? 2000);
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

type PlacesResponse = { places?: { id: string; displayName?: { text: string } }[] };

/**
 * Live provider: Google Places Text Search (New), biased to each grid point.
 * Returns the full ordered result list so the caller can find the target's
 * rank AND capture competitors — no extra cost, same lean field mask
 * (`id,displayName`). For higher fidelity to the actual Maps local pack, drop
 * in a SERP provider (SerpApi / DataForSEO google_maps) — see README.
 */
export const googlePlacesProvider: RankingProvider = {
  async getRankings({ keyword, point }: RankArgs): Promise<RankedEntrant[]> {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not set (RANKING_PROVIDER=google).");

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName",
      },
      body: JSON.stringify({
        textQuery: keyword,
        maxResultCount: 20,
        locationBias: { circle: { center: { latitude: point.lat, longitude: point.lng }, radius: RADIUS_M } },
      }),
    });
    if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as PlacesResponse;
    return (data.places ?? []).map((p) => ({ placeId: p.id, name: p.displayName?.text ?? "" }));
  },
};
