export const T = {
  bg: "#15120F", panel: "#1E1A16", card: "#262120", line: "#3A332E",
  ink: "#F4EFE6", sub: "#A89E92", faint: "#6E655B",
  red: "#E5322D", cyan: "#00A7E1", magenta: "#E5007E", yellow: "#FFCD00",
  good: "#5BBF7B", warn: "#E8A93B",
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
