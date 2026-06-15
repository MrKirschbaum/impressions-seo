import type { RankingProvider } from "./provider";
import { mockProvider } from "./mock";
import { googlePlacesProvider } from "./google-places";

export function getProvider(): RankingProvider {
  return (process.env.RANKING_PROVIDER ?? "mock").toLowerCase() === "google"
    ? googlePlacesProvider
    : mockProvider;
}
export type { RankingProvider };
