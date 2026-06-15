"use client";
import { useState } from "react";
import { Crosshair } from "lucide-react";
import type { Competitor, RankedPoint, ScanResult } from "@/lib/types";
import { T, serif, rankColor } from "./theme";

const card = { background: T.card, border: `1px solid ${T.line}`, borderRadius: 10 } as const;

export function GeoGrid({ result, competitors }: { result: ScanResult; competitors: Competitor[] }) {
  const [pin, setPin] = useState<RankedPoint | null>(null);
  const SIDE = 380, pad = 18, cell = (SIDE - pad * 2) / result.size;
  const rivals = [...competitors].sort((a, b) => b.reviews - a.reviews);

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
            return (
              <g key={i} onClick={() => setPin(p)} style={{ cursor: "pointer" }}>
                <circle cx={cx} cy={cy} r={Math.min(cell / 2 - 3, 17)} fill={rankColor(p.rank)}
                  stroke={sel ? "#fff" : center ? T.ink : "rgba(0,0,0,0.35)"}
                  strokeWidth={sel ? 2.5 : center ? 2 : 1} opacity={p.rank == null ? 0.55 : 1} />
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight={700}
                  fill={p.rank != null && p.rank <= 10 ? "#10100f" : "#fff"}>
                  {p.rank == null ? "20+" : p.rank}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontSize: 11, color: T.faint, textTransform: "uppercase", letterSpacing: 1.5 }}>
            Average map rank &middot; &quot;{result.keyword}&quot;
          </div>
          <div style={{ display: "flex", gap: 24, alignItems: "baseline", marginTop: 8 }}>
            <div style={{ fontFamily: serif, fontSize: 40, color: rankColor(Math.round(result.amr)) }}>{result.amr}</div>
            <div><div style={{ fontFamily: serif, fontSize: 22, color: T.good }}>{result.top3}%</div><div style={{ fontSize: 11, color: T.faint }}>top 3</div></div>
            <div><div style={{ fontFamily: serif, fontSize: 22, color: T.cyan }}>{result.top10}%</div><div style={{ fontSize: 11, color: T.faint }}>top 10</div></div>
          </div>
        </div>

        <div style={{ ...card, padding: 16, minHeight: 140 }}>
          {pin ? (
            <>
              <div style={{ fontSize: 11, color: T.faint }}>
                <Crosshair size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "-1px" }} />
                {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
              </div>
              <div style={{ fontFamily: serif, fontSize: 30, color: rankColor(pin.rank), margin: "6px 0 10px" }}>
                {pin.rank == null ? "20+" : `#${pin.rank}`}
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
              Click a pin to see your rank at that spot and who&apos;s above you there.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
