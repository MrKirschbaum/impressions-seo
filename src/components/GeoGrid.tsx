"use client";
import { useMemo, useState } from "react";
import { Crosshair } from "lucide-react";
import type { Competitor, RankedPoint, ScanResult } from "@/lib/types";
import { T, serif, rankColor, deltaColor } from "./theme";

const card = { background: T.card, border: `1px solid ${T.line}`, borderRadius: 10 } as const;

/** Effective rank for math: "not found" counts as 20 (matches the scan's AMR). */
const eff = (r: number | null) => (r == null ? 20 : r);

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Signed metric-change label, colored by direction. `better` flags which sign is good. */
function MetricDelta({ value, better }: { value: number; better: "up" | "down" }) {
  if (Math.abs(value) < 0.05) return <span style={{ fontSize: 11, color: T.faint }}> ±0</span>;
  const isGood = better === "up" ? value > 0 : value < 0;
  const sign = value > 0 ? "+" : "";
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: isGood ? T.good : T.red }}>
      {" "}{sign}{value.toFixed(value % 1 === 0 ? 0 : 1)}
    </span>
  );
}

/* ── Web Mercator projection (matches Google Static/JS Maps) ────────────── */
const TILE = 256;
const projX = (lng: number) => TILE * (0.5 + lng / 360);
const projY = (lat: number) => {
  const s = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return TILE * (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI));
};

const MAP_PX = 420; // square map side
const PAD = 34;     // keep edge markers off the border

export function GeoGrid({
  result, competitors, baseline,
}: {
  result: ScanResult;
  competitors: Competitor[];
  baseline?: ScanResult | null;
}) {
  const [pin, setPin] = useState<RankedPoint | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const comparable = !!baseline && baseline.size === result.size;
  const [view, setView] = useState<"rank" | "delta">("rank");
  const showDelta = comparable && view === "delta";

  const rivals = [...competitors].sort((a, b) => b.reviews - a.reviews);
  const reviewsByName = (name: string) => {
    const n = name.toLowerCase();
    return competitors.find((c) => n.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(n))?.reviews;
  };

  // Fit the grid into the map: center on the business, pick an integer zoom that
  // keeps every point within the padded square, then project each to a pixel.
  const { center, zoom, place, radius, mapUrl } = useMemo(() => {
    const c = result.points.find((p) => p.dx === 0 && p.dy === 0) ?? result.points[0];
    const cx = projX(c.lng), cy = projY(c.lat);
    let maxOff = 1e-9;
    for (const p of result.points) {
      maxOff = Math.max(maxOff, Math.abs(projX(p.lng) - cx), Math.abs(projY(p.lat) - cy));
    }
    const z = Math.max(1, Math.min(20, Math.floor(Math.log2((MAP_PX / 2 - PAD) / maxOff))));
    const scale = 2 ** z;
    const span = 2 * maxOff * scale;
    const r = Math.max(6, Math.min(16, span / (result.size - 1) / 2 - 3));
    return {
      center: c,
      zoom: z,
      radius: r,
      place: (p: RankedPoint) => ({ x: MAP_PX / 2 + (projX(p.lng) - cx) * scale, y: MAP_PX / 2 + (projY(p.lat) - cy) * scale }),
      mapUrl: `/api/staticmap?lat=${c.lat}&lng=${c.lng}&zoom=${z}&size=${MAP_PX}`,
    };
  }, [result.points, result.size]);

  // Baseline rank by grid cell, for per-point comparison.
  const baseAt = new Map<string, number | null>();
  if (comparable) baseline!.points.forEach((p) => baseAt.set(`${p.row}-${p.col}`, p.rank));
  const deltaOf = (p: RankedPoint) => {
    const b = baseAt.get(`${p.row}-${p.col}`);
    return b === undefined ? null : eff(b) - eff(p.rank); // positive = improved (rank dropped)
  };
  const pinDelta = pin ? deltaOf(pin) : null;
  const pinBase = pin ? baseAt.get(`${pin.row}-${pin.col}`) : undefined;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "start" }}>
      <div style={{ ...card, padding: 18, width: MAP_PX + 36 }}>
        <div style={{ position: "relative", width: MAP_PX, height: MAP_PX, borderRadius: 8, overflow: "hidden", background: T.panel }}>
          {/* Real map background (falls back to an abstract field if Static Maps is unavailable). */}
          {mapFailed ? (
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, #fafbfc 0%, #eceef2 100%)" }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mapUrl} alt="Service-area map" width={MAP_PX} height={MAP_PX}
              onError={() => setMapFailed(true)}
              style={{ display: "block", width: MAP_PX, height: MAP_PX, objectFit: "cover" }} />
          )}

          <svg width={MAP_PX} height={MAP_PX} style={{ position: "absolute", inset: 0 }}>
            {result.points.map((p, i) => {
              const { x, y } = place(p);
              const sel = pin?.row === p.row && pin?.col === p.col;
              const isCenter = p === center;
              const d = showDelta ? deltaOf(p) : null;
              const fill = showDelta && d != null ? deltaColor(d) : rankColor(p.rank);
              const lightChip = !showDelta && p.rank != null && p.rank <= 10;
              const label = showDelta
                ? d == null ? "—" : d === 0 ? "0" : d > 0 ? `+${d}` : `${d}`
                : p.rank == null ? "20+" : String(p.rank);
              return (
                <g key={i} onClick={() => setPin(p)} style={{ cursor: "pointer" }}>
                  <circle cx={x} cy={y} r={radius + 1.5} fill="rgba(0,0,0,0.28)" />
                  <circle cx={x} cy={y} r={radius} fill={fill}
                    stroke={sel || isCenter ? T.ink : "rgba(255,255,255,0.85)"}
                    strokeWidth={sel ? 2.5 : isCenter ? 2 : 1}
                    opacity={p.rank == null && !showDelta ? 0.7 : 0.95} />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize={showDelta ? "10" : "11"} fontWeight={700}
                    fill={lightChip ? "#10100f" : "#fff"}>
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div style={{ fontSize: 10, color: T.faint, marginTop: 8, fontFamily: "ui-monospace, Menlo, monospace", display: "flex", justifyContent: "space-between" }}>
          <span>{center.lat.toFixed(4)}, {center.lng.toFixed(4)} · z{zoom}</span>
          <span>{mapFailed ? "map unavailable — enable Maps Static API" : "Google Maps"}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ ...card, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, color: T.faint, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Average map rank &middot; &quot;{result.keyword}&quot;
            </div>
            {comparable && (
              <div style={{ marginLeft: "auto", display: "flex", border: `1px solid ${T.line}`, borderRadius: 7, overflow: "hidden" }}>
                {(["rank", "delta"] as const).map((m) => (
                  <button key={m} onClick={() => setView(m)} style={{
                    border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, padding: "4px 9px",
                    background: view === m ? T.cyan : "transparent", color: view === m ? "#10100f" : T.sub,
                  }}>
                    {m === "rank" ? "Rank" : "Δ change"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 24, alignItems: "baseline", marginTop: 8 }}>
            <div>
              <div style={{ fontFamily: serif, fontSize: 40, color: rankColor(Math.round(result.amr)) }}>
                {result.amr}{baseline && <MetricDelta value={baseline.amr - result.amr} better="up" />}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: serif, fontSize: 22, color: T.good }}>
                {result.top3}%{baseline && <MetricDelta value={result.top3 - baseline.top3} better="up" />}
              </div>
              <div style={{ fontSize: 11, color: T.faint }}>top 3</div>
            </div>
            <div>
              <div style={{ fontFamily: serif, fontSize: 22, color: T.cyan }}>
                {result.top10}%{baseline && <MetricDelta value={result.top10 - baseline.top10} better="up" />}
              </div>
              <div style={{ fontSize: 11, color: T.faint }}>top 10</div>
            </div>
          </div>

          {baseline && (
            <div style={{ fontSize: 11, color: T.faint, marginTop: 10 }}>
              Comparing {fmtDate(result.createdAt)} vs baseline {fmtDate(baseline.createdAt)}
              {!comparable && <span style={{ color: T.warn }}> · grids differ ({baseline.size}×{baseline.size} → {result.size}×{result.size}), per-point Δ unavailable</span>}
            </div>
          )}
        </div>

        <div style={{ ...card, padding: 16, minHeight: 140 }}>
          {pin ? (
            <>
              <div style={{ fontSize: 11, color: T.faint }}>
                <Crosshair size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "-1px" }} />
                {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "6px 0 10px" }}>
                <span style={{ fontFamily: serif, fontSize: 30, color: rankColor(pin.rank) }}>
                  {pin.rank == null ? "20+" : `#${pin.rank}`}
                </span>
                {comparable && pinDelta != null && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: deltaColor(pinDelta) }}>
                    {pinDelta === 0 ? "no change" : `${pinDelta > 0 ? "▲" : "▼"} ${Math.abs(pinDelta)} vs ${pinBase == null ? "20+" : `#${pinBase}`}`}
                  </span>
                )}
              </div>
              {pin.rank === 1 ? (
                <div style={{ color: T.good, fontSize: 13 }}>You own this point.</div>
              ) : (() => {
                // Prefer the businesses actually captured above you here; fall back to the seed list.
                const above = (pin.entrants ?? [])
                  .map((e, i) => ({ ...e, r: i + 1 }))
                  .filter((e) => !e.isTarget && (pin.rank == null || e.r < pin.rank))
                  .slice(0, 4);
                if (above.length) {
                  return above.map((e) => {
                    const rev = reviewsByName(e.name);
                    return (
                      <div key={e.r} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
                        <span>#{e.r} {e.name}</span>
                        {rev != null && <span style={{ color: T.sub }}>{rev} reviews</span>}
                      </div>
                    );
                  });
                }
                return rivals.slice(0, Math.min(pin.rank == null ? 3 : pin.rank - 1, 3)).map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
                    <span>{i + 1}. {c.name}</span>
                    <span style={{ color: T.sub }}>{c.reviews} reviews</span>
                  </div>
                ));
              })()}
            </>
          ) : (
            <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.6 }}>
              {showDelta
                ? "Green points improved since the baseline; red slipped. Click a pin for the before/after."
                : "Click a pin to see your rank at that spot and who's above you there."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
