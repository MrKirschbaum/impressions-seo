"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { Layers, ArrowDownWideNarrow } from "lucide-react";
import type { Rollup as RollupData } from "@/lib/types";
import { T, mono, serif, rankColor } from "./theme";

const card: CSSProperties = { background: T.card, border: `1px solid ${T.line}`, borderRadius: 10 };
const label: CSSProperties = { fontSize: 11, color: T.faint, textTransform: "uppercase", letterSpacing: 1.5 };

function Stat({ value, suffix, caption, color }: { value: number | string; suffix?: string; caption: string; color: string }) {
  return (
    <div>
      <div style={{ fontFamily: serif, fontSize: 30, color, lineHeight: 1 }}>
        {value}<span style={{ fontSize: 16 }}>{suffix}</span>
      </div>
      <div style={{ fontSize: 11, color: T.faint, marginTop: 3 }}>{caption}</div>
    </div>
  );
}

export function Rollup({ locationId, refreshKey }: { locationId: string; refreshKey: number }) {
  const [data, setData] = useState<RollupData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rollup?locationId=${encodeURIComponent(locationId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [locationId, refreshKey]);

  return (
    <div style={{ ...card, padding: 16, marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Layers size={15} color={T.sub} />
        <span style={label}>Visibility rollup</span>
        <span style={{ fontFamily: mono, fontSize: 11, color: T.faint }}>share of local voice</span>
      </div>

      {!data || data.scannedKeywords === 0 ? (
        <div style={{ color: T.sub, fontSize: 13, padding: "8px 2px" }}>
          {loading ? "Computing…" : "No scans yet for this location. Run or schedule scans to build the rollup across all keywords."}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 28, alignItems: "baseline", flexWrap: "wrap", paddingBottom: 14, borderBottom: `1px solid ${T.line}` }}>
            <Stat value={data.sov} suffix="%" caption="avg top-3 (SoV)" color={T.good} />
            <Stat value={data.avgTop10} suffix="%" caption="avg top-10" color={T.cyan} />
            <Stat value={data.avgAmr} caption="avg map rank" color={rankColor(Math.round(data.avgAmr))} />
            <Stat value={`${data.scannedKeywords}/${data.trackedKeywords}`} caption="keywords scanned" color={T.ink} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.faint, margin: "12px 0 6px" }}>
            <ArrowDownWideNarrow size={11} /> STRONGEST → WEAKEST KEYWORD
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {data.perKeyword.map((k, i) => {
              const weakest = i >= data.perKeyword.length - 1 && data.perKeyword.length > 1;
              return (
                <div key={k.keyword} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 6, background: i % 2 ? "transparent" : T.panel }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {k.keyword}
                    {weakest && <span style={{ color: T.warn, fontSize: 10, marginLeft: 6 }}>weakest</span>}
                  </div>
                  {/* top-3 coverage bar */}
                  <div style={{ width: 90, height: 6, background: T.line, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${k.top3}%`, height: "100%", background: T.good }} />
                  </div>
                  <div style={{ minWidth: 38, textAlign: "right", fontFamily: mono, fontSize: 11, color: T.good }}>{k.top3}%</div>
                  <div style={{ minWidth: 48, textAlign: "right", fontFamily: serif, fontSize: 16, color: rankColor(Math.round(k.amr)) }}>{k.amr}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 10, color: T.faint, marginTop: 8, fontFamily: mono }}>
            bar = % of grid in top 3 · number = avg map rank · latest scan per keyword
          </div>
        </>
      )}
    </div>
  );
}
