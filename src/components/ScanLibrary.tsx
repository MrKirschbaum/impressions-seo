"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { History, Eye, GitCompareArrows, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import type { ScanSummary } from "@/lib/types";
import { T, mono, serif, rankColor } from "./theme";

const card: CSSProperties = { background: T.card, border: `1px solid ${T.line}`, borderRadius: 10 };
const chip: CSSProperties = {
  border: `1px solid ${T.line}`, background: T.panel, color: T.sub, cursor: "pointer",
  borderRadius: 7, padding: "5px 9px", fontSize: 12, fontWeight: 600, display: "inline-flex",
  alignItems: "center", gap: 5,
};

function fmt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Improvement arrow for an AMR change (positive `imp` = rank got better). */
function Delta({ imp }: { imp: number }) {
  if (Math.abs(imp) < 0.05) return <span style={{ color: T.faint, fontSize: 11 }}>—</span>;
  const better = imp > 0;
  return (
    <span style={{ color: better ? T.good : T.red, fontSize: 11, fontWeight: 700 }}>
      {better ? "▲" : "▼"} {Math.abs(imp).toFixed(1)}
    </span>
  );
}

export function ScanLibrary({
  locationId, keyword, refreshKey, currentId, baselineId, onView, onSetBaseline,
}: {
  locationId: string;
  keyword: string;
  refreshKey: number;
  currentId: string | null;
  baselineId: string | null;
  onView: (id: string) => void;
  onSetBaseline: (id: string | null) => void;
}) {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!keyword) return;
    setLoading(true);
    const q = new URLSearchParams({ locationId, keyword });
    fetch(`/api/scans?${q}`)
      .then((r) => r.json())
      .then((s: ScanSummary[]) => setScans(Array.isArray(s) ? s : []))
      .catch(() => setScans([]))
      .finally(() => setLoading(false));
  }, [locationId, keyword, refreshKey]);

  // Oldest → newest for the trend line.
  const chartData = [...scans].reverse().map((s) => ({ label: fmt(s.createdAt), amr: s.amr, top3: s.top3 }));

  return (
    <div style={{ ...card, padding: 16, marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <History size={15} color={T.sub} />
        <span style={{ fontSize: 11, color: T.faint, textTransform: "uppercase", letterSpacing: 1.5 }}>
          Scan library
        </span>
        <span style={{ fontFamily: mono, fontSize: 11, color: T.faint }}>
          {scans.length} saved · &quot;{keyword}&quot;
        </span>
        {baselineId && (
          <button onClick={() => onSetBaseline(null)} style={{ ...chip, marginLeft: "auto", color: T.cyan, borderColor: T.cyan }}>
            <GitCompareArrows size={12} /> clear comparison
          </button>
        )}
      </div>

      {scans.length === 0 ? (
        <div style={{ color: T.sub, fontSize: 13, padding: "10px 2px" }}>
          {loading ? "Loading history…" : "No saved scans for this keyword yet. Run a scan — it'll be archived here for comparison over time."}
        </div>
      ) : (
        <>
          {chartData.length >= 2 && (
            <div style={{ height: 130, margin: "0 -6px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.faint, paddingLeft: 6, marginBottom: 2 }}>
                <TrendingUp size={11} /> AVERAGE MAP RANK OVER TIME (UP = IMPROVING)
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -22 }}>
                  <CartesianGrid stroke={T.line} strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: T.faint, fontSize: 10 }} stroke={T.line} interval="preserveStartEnd" />
                  <YAxis reversed domain={[1, "dataMax"]} allowDecimals={false} tick={{ fill: T.faint, fontSize: 10 }} stroke={T.line} />
                  <Tooltip
                    contentStyle={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: T.sub }} itemStyle={{ color: T.ink }}
                  />
                  <Line type="monotone" dataKey="amr" name="Avg rank" stroke={T.cyan} strokeWidth={2} dot={{ r: 3, fill: T.cyan }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {scans.map((s, i) => {
              const prev = scans[i + 1]; // next index is the chronologically older scan
              const imp = prev ? prev.amr - s.amr : 0; // positive = improved since prior scan
              const isCurrent = s.id === currentId;
              const isBaseline = s.id === baselineId;
              return (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "9px 11px", borderRadius: 8,
                  background: isCurrent ? T.panel : "transparent",
                  border: `1px solid ${isBaseline ? T.cyan : isCurrent ? T.line : "transparent"}`,
                }}>
                  <div style={{ minWidth: 96, fontSize: 12, color: isCurrent ? T.ink : T.sub }}>{fmt(s.createdAt)}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 78 }}>
                    <span style={{ fontFamily: serif, fontSize: 18, color: rankColor(Math.round(s.amr)) }}>{s.amr}</span>
                    <Delta imp={imp} />
                  </div>
                  <div style={{ fontSize: 11, color: T.faint, minWidth: 96 }}>
                    <span style={{ color: T.good }}>{s.top3}%</span> top3 ·{" "}
                    <span style={{ color: T.cyan }}>{s.top10}%</span> top10
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 10, color: T.faint }}>{s.size}×{s.size}</div>
                  <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                    <button onClick={() => onView(s.id)} title="View this scan"
                      style={{ ...chip, ...(isCurrent ? { color: T.ink, borderColor: T.sub } : {}) }}>
                      <Eye size={12} /> {isCurrent ? "Viewing" : "View"}
                    </button>
                    <button onClick={() => onSetBaseline(isBaseline ? null : s.id)} title="Compare the viewed scan against this one"
                      style={{ ...chip, ...(isBaseline ? { color: T.cyan, borderColor: T.cyan } : {}) }}>
                      <GitCompareArrows size={12} /> {isBaseline ? "Baseline" : "Compare"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
