export const T = {
  // Light theme: clean neutral whites/grays, white cards on a near-white page.
  bg: "#F6F7F9", panel: "#FBFBFC", card: "#FFFFFF", line: "#E5E7EB",
  ink: "#16181D", sub: "#5B616E", faint: "#9CA3AF",
  red: "#E5322D", cyan: "#0A7EA4", magenta: "#C8127E", yellow: "#C99A00",
  good: "#1F9D55", warn: "#B8791A",
};
export const serif = "Georgia, 'Times New Roman', serif";
export const mono = "ui-monospace, Menlo, monospace";

export function rankColor(rank: number | null): string {
  if (rank == null || rank > 20) return "#9E2B22";
  if (rank <= 3) return "#2FA86B";
  if (rank <= 6) return "#7CB342";
  if (rank <= 10) return "#E6B800";
  if (rank <= 15) return "#EE8A2E";
  return "#E5532D";
}

/**
 * Color a rank *change* between two scans. `delta` is improvement in rank
 * positions (baseline rank − current rank), so positive = moved up the map.
 */
export function deltaColor(delta: number): string {
  if (delta >= 5) return "#2FA86B";
  if (delta > 0) return "#7CB342";
  if (delta === 0) return "#6E655B";
  if (delta > -5) return "#EE8A2E";
  return "#E5532D";
}
