import type { RankingProvider, RankArgs } from "./provider";

const RADIUS_M = Number(process.env.SCAN_RADIUS_M ?? 2000);
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

type PlacesResponse = { places?: { id: string; displayName?: { text: string } }[] };

/**
 * Live provider: Google Places Text Search (New), biased to each grid point,
 * then finds the target's position in the ranked results. Legitimate API, no
 * scraping. For higher fidelity to the actual Maps local pack you can drop in a
 * SERP provider (SerpApi / DataForSEO google_maps) implementing this same
 * interface — see README.
 */
export const googlePlacesProvider: RankingProvider = {
  async getRank({ keyword, point, location }: RankArgs) {
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
        locationBias: {
          circle: {
            center: { latitude: point.lat, longitude: point.lng },
            radius: RADIUS_M,
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as PlacesResponse;
    const places = data.places ?? [];
    const idx = places.findIndex((p) => {
      if (location.placeId && p.id === location.placeId) return true;
      return (p.displayName?.text ?? "").toLowerCase().includes(location.name.toLowerCase());
    });
    return idx === -1 ? null : idx + 1;
  },
};
