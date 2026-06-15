import type { GridPoint, LatLng } from "./types";

const STEP_DEG = Number(process.env.GRID_STEP_DEG ?? 0.0075);

/** Build a size x size grid of coordinates centered on the business. */
export function buildGrid(center: LatLng, size: number, step = STEP_DEG): GridPoint[] {
  const half = (size - 1) / 2;
  const points: GridPoint[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const dx = col - half;
      const dy = row - half;
      points.push({
        row, col, dx, dy,
        dist: Math.sqrt(dx * dx + dy * dy),
        lat: center.lat - dy * step, // north is up
        lng: center.lng + dx * step,
      });
    }
  }
  return points;
}
