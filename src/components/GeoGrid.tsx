"use client";
import { useState } from "react";
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

export function GeoGrid({
  result, competitors, baseline,
}: {
  result: ScanResult;
  competitors: Competitor[];
  baseline?: ScanResult | null;
}) {
  const [pin, setPin] = useState<RankedPoint | null>(null);
  const comparable = !!baseline && baseline.size === result.size;
  const [view, setView] = useState<"rank" | "delta">("rank");
  const showDelta = comparable && view === "delta";

  const SIDE = 380, pad = 18, cell = (SIDE - pad * 2) / result.size;
  const rivals = [...competitors].sort((a, b) => b.reviews - a.reviews);

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
      <div style={{ ...card, padding: pad, width: SIDE + pad * 2 }}>
        <svg width={SIDE} height={SIDE} style={{ display: "block" }}>
          <defs>
            <radialGradient id="bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#221d1a" />
              <stop offset="100%" stopColor="#1a1613" />
            </radialGradient>
          </defs>
          <rect width={SIDE} height={SIDE} rx="8" fill="url(#bg)" />
          {[0.32, 0.62, 0.92].map((f, i) => (
            <circle key={i} cx={SIDE / 2} cy={SIDE / 2} r={(SIDE / 2) * f} fill="none" stroke={T.line} strokeDasharray="3 4" />
          ))}
          {result.points.map((p, i) => {
            const cx = pad + cell * (p.col + 0.5);
            const cy = pad + cell * (p.row + 0.5);
            const sel = pin?.row === p.row && pin?.col === p.col;
            const center = p.dx === 0 && p.dy === 0;
            const d = showDelta ? deltaOf(p) : null;
            const fill = showDelta && d != null ? deltaColor(d) : rankColor(p.rank);
            const label = showDelta
              ? d == null ? "—" : d === 0 ? "0" : d > 0 ? `+${d}` : `${d}`
              : p.rank == null ? "20+" : String(p.rank);
            return (
              <g key={i} onClick={() => setPin(p)} style={{ cursor: "pointer" }}>
                <circle cx={cx} cy={cy} r={Math.min(cell / 2 - 3, 17)} fill={fill}
                  stroke={sel ? "#fff" : center ? T.ink : "rgba(0,0,0,0.35)"}
                  strokeWidth={sel ? 2.5 : center ? 2 : 1} opacity={p.rank == null && !showDelta ? 0.55 : 1} />
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize={showDelta ? "10" : "11"} fontWeight={700}
                  fill={!showDelta && p.rank != null && p.rank <= 10 ? "#10100f" : "#fff"}>
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
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
              ) : (
                rivals.slice(0, Math.min(pin.rank == null ? 3 : pin.rank - 1, 3)).map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
                    <span>{i + 1}. {c.name}</span>
                    <span style={{ color: T.sub }}>{c.reviews} reviews</span>
                  </div>
                ))
              )}
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
