import type { Location } from "@/lib/types";

/** Seeded from the GSC + Places pull. Keyword baselines are real avg positions. */
export const LOCATIONS: Location[] = [
  {
    id: "pdx",
    name: "Impressions In Ink",
    address: "4101 SE 26th Ave, Portland, OR 97202",
    center: { lat: 45.4931, lng: -122.6399 },
    placeId: "ChIJH2XbSIEKlVQRcHjj8ydQfAs",
    keywords: [
      { term: "commercial printers portland oregon", baseline: 1 },
      { term: "poster printing portland", baseline: 1 },
      { term: "large format printing portland or", baseline: 1.2 },
      { term: "commercial printing portland", baseline: 1.5 },
      { term: "large format printing portland oregon", baseline: 2.6 },
      { term: "commercial printers portland", baseline: 3.9 },
      { term: "printing portland", baseline: 4 },
      { term: "printing services portland", baseline: 4.9 },
      { term: "portland print shop", baseline: 5.3 },
      { term: "printing companies near me", baseline: 8 },
      { term: "print shop portland", baseline: 12.2 },
      { term: "offset printing portland", baseline: 15 },
      { term: "print shop portland oregon", baseline: 18.1 },
    ],
    competitors: [
      { name: "Minuteman Press Powell", rating: 4.8, reviews: 164, kind: "print" },
      { name: "Copyman", rating: 4.8, reviews: 107, kind: "print" },
      { name: "Happy Valley Printing", rating: 4.9, reviews: 102, kind: "print" },
      { name: "Brown Printing", rating: 5.0, reviews: 30, kind: "print" },
      { name: "Bridgetown / RRD", rating: 4.7, reviews: 19, kind: "print" },
      { name: "Trade Printing", rating: 4.7, reviews: 15, kind: "print" },
      { name: "Francis & Co.", rating: 4.6, reviews: 11, kind: "print" },
    ],
  },
  {
    id: "san",
    name: "Impressions In Ink",
    address: "5725 Kearny Villa Rd, Ste R, San Diego, CA 92123",
    center: { lat: 32.8312, lng: -117.1225 },
    keywords: [], // greenfield — no footprint yet
    competitors: [],
  },
];

export function getLocation(id: string): Location | undefined {
  return LOCATIONS.find((l) => l.id === id);
}
