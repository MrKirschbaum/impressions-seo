import type { GridPoint, Location } from "../types";

export type RankArgs = { keyword: string; point: GridPoint; location: Location };

export interface RankingProvider {
  /** 1-based rank of the target business at this point, or null if outside top 20. */
  getRank(args: RankArgs): Promise<number | null>;
}
