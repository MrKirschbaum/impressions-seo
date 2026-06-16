import type { GridPoint, Location } from "../types";

export type RankArgs = { keyword: string; point: GridPoint; location: Location };

/** A business in the local results at a point. `placeId` set when known. */
export type RankedEntrant = { placeId?: string; name: string };

export interface RankingProvider {
  /**
   * The ordered local results at this point, best first (rank = index + 1).
   * The caller identifies the target within the list and captures competitors.
   */
  getRankings(args: RankArgs): Promise<RankedEntrant[]>;
}
