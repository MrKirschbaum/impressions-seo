"use client";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { History, Eye, GitCompareArrows, TrendingUp, Tag, Globe } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import type { Location, ScanSummary } from "@/lib/types";
import { T, mono, serif, rankColor } from "./theme";

const card: CSSProperties = { background: T.card, border: `1px solid ${T.line}`, borderRadius: 10 };
const chip: CSSProperties = {
  border: `1px solid ${T.line}`, background: T.panel, color: T.sub, cursor: "pointer",
  borderRadius: 7, padding: "5px 9px", fontSize: 12, fontWeight: 600, display: "inline-flex",
  alignItems: "center", gap: 5,
};

/** Colors for the multi-series "all searches" trend — one per location·keyword line. */
const PALETTE = [T.cyan, T.magenta, T.yellow, T.good, T.warn, T.red, "#9B8CFF", "#FF8C42"];
const MAX_SERIES = 8;

function fmt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Stable identity for a "search" — a location + keyword pair tracked over time. */
const seriesKeyOf = (s: { locationId: string; keyword: string }) => `${s.locationId}__${s.keyword}`;

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
  locations, locationId, keyword, refreshKey, currentId, baselineId, onView, onSetBaseline,
}: {
  locations: Location[];
  locationId: string;
  keyword: string;
  refreshKey: number;
  currentId: string | null;
  baselineId: string | null;
  onView: (id: string) => void;
  onSetBaseline: (id: string | null) => void;
}) {
  const [scope, setScope] = useState<"keyword" | "all">("keyword");
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // City label for a location (both shops share the "Impressions In Ink" name, so
  // the city is what distinguishes them in the all-searches view).
  const locCity = useMemo(() => {
    const byId = new Map(locations.map((l) => [l.id, l] as const));
    return (id: string): string => {
      const l = byId.get(id);
      const city = l?.address.split(",")[1]?.trim();
      return city || l?.name || id;
    };
  }, [locations]);

  useEffect(() => {
    // Keyword scope needs a selected keyword; all scope pulls the full archive.
    if (scope === "keyword" && !keyword) { setScans([]); return; }
    setLoading(true);
    const q = new URLSearchParams();
    if (scope === "keyword") { q.set("locationId", locationId); q.set("keyword", keyword); }
    const qs = q.toString();
    fetch(`/api/scans${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((s: ScanSummary[]) => setScans(Array.isArray(s) ? s : []))
      .catch(() => setScans([]))
      .finally(() => setLoading(false));
  }, [scope, locationId, keyword, refreshKey]);

  const isAll = scope === "all";

  // Distinct searches present in the archive (for the header count + series legend).
  const distinctSearches = useMemo(
    () => new Set(scans.map(seriesKeyOf)).size,
    [scans],
  );

  // Per-series trend metadata: which lines to draw, their colors and labels.
  // Capped at MAX_SERIES (most-scanned first) so the chart stays readable.
  const seriesMeta = useMemo(() => {
    const counts = new Map<string, number>();
    const sample = new Map<string, ScanSummary>();
    for (const s of scans) {
      const k = seriesKeyOf(s);
      counts.set(k, (counts.get(k) ?? 0) + 1);
      if (!sample.has(k)) sample.set(k, s);
    }
    const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const shown = ordered.slice(0, MAX_SERIES).map((k, i) => {
      const s = sample.get(k)!;
      return { key: k, color: PALETTE[i % PALETTE.length], label: `${locCity(s.locationId)} · ${s.keyword}` };
    });
    return { shown, hidden: Math.max(0, ordered.length - shown.length) };
  }, [scans, locCity]);

  // Chart data, oldest → newest. Keyword scope = one AMR line. All scope = one
  // line per search, each scan contributing a point to its own series.
  const chartData = useMemo(() => {
    const chrono = [...scans].reverse();
    if (!isAll) return chrono.map((s) => ({ label: fmt(s.createdAt), amr: s.amr }));
    const shownKeys = new Set(seriesMeta.shown.map((m) => m.key));
    return chrono
      .filter((s) => shownKeys.has(seriesKeyOf(s)))
      .map((s) => ({ label: fmt(s.createdAt), [seriesKeyOf(s)]: s.amr }));
  }, [scans, isAll, seriesMeta]);

  const showChart = scans.length >= 2;

  function ToggleChip({ value, icon, label }: { value: "keyword" | "all"; icon: React.ReactNode; label: string }) {
    const active = scope === value;
    return (
      <button onClick={() => setScope(value)} style={{ ...chip, ...(active ? { color: T.ink, borderColor: T.sub, background: T.card } : {}) }}>
        {icon} {label}
      </button>
    );
  }

  return (
    <div style={{ ...card, padding: 16, marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <History size={15} color={T.sub} />
        <span style={{ fontSize: 11, color: T.faint, textTransform: "uppercase", letterSpacing: 1.5 }}>
          Scan library
        </span>
        <span style={{ fontFamily: mono, fontSize: 11, color: T.faint }}>
          {isAll
            ? `${scans.length} saved · ${distinctSearches} searches`
            : `${scans.length} saved · "${keyword}"`}
        </span>

        <div style={{ display: "flex", gap: 6, marginLeft: 4 }}>
          <ToggleChip value="keyword" icon={<Tag size={12} />} label="This keyword" />
          <ToggleChip value="all" icon={<Globe size={12} />} label="All searches" />
        </div>

        {baselineId && (
          <button onClick={() => onSetBaseline(null)} style={{ ...chip, marginLeft: "auto", color: T.cyan, borderColor: T.cyan }}>
            <GitCompareArrows size={12} /> clear comparison
          </button>
        )}
      </div>

      {scans.length === 0 ? (
        <div style={{ color: T.sub, fontSize: 13, padding: "10px 2px" }}>
          {loading
            ? "Loading history…"
            : isAll
              ? "No scans archived yet. Run your first scan — every assessment is saved here and builds the trend over time."
              : keyword
                ? "No saved scans for this keyword yet. Run a scan — it'll be archived here for comparison over time."
                : "Pick a keyword above, or switch to “All searches” to browse your full scan history."}
        </div>
      ) : (
        <>
          {showChart && (
            <div style={{ margin: "0 -6px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.faint, paddingLeft: 6, marginBottom: 2 }}>
                <TrendingUp size={11} />
                {isAll ? "AVERAGE MAP RANK OVER TIME — ALL SEARCHES (UP = IMPROVING)" : "AVERAGE MAP RANK OVER TIME (UP = IMPROVING)"}
              </div>
              <div style={{ height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -22 }}>
                    <CartesianGrid stroke={T.line} strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: T.faint, fontSize: 10 }} stroke={T.line} interval="preserveStartEnd" />
                    <YAxis reversed domain={[1, "dataMax"]} allowDecimals={false} tick={{ fill: T.faint, fontSize: 10 }} stroke={T.line} />
                    <Tooltip
                      contentStyle={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: T.sub }} itemStyle={{ color: T.ink }}
                    />
                    {isAll
                      ? seriesMeta.shown.map((m) => (
                          <Line key={m.key} type="monotone" dataKey={m.key} name={m.label}
                            stroke={m.color} strokeWidth={2} dot={{ r: 3, fill: m.color }} connectNulls />
                        ))
                      : <Line type="monotone" dataKey="amr" name="Avg rank" stroke={T.cyan} strokeWidth={2} dot={{ r: 3, fill: T.cyan }} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {isAll && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", padding: "8px 6px 0" }}>
                  {seriesMeta.shown.map((m) => (
                    <span key={m.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: T.sub }}>
                      <span style={{ width: 9, height: 3, background: m.color, borderRadius: 2 }} /> {m.label}
                    </span>
                  ))}
                  {seriesMeta.hidden > 0 && (
                    <span style={{ fontSize: 11, color: T.faint }}>+{seriesMeta.hidden} more search{seriesMeta.hidden > 1 ? "es" : ""} not charted</span>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {scans.map((s, i) => {
              // Compare against the previous scan of the *same* search, even in the
              // all-searches view where adjacent rows may be different keywords.
              const prev = scans.slice(i + 1).find((p) => seriesKeyOf(p) === seriesKeyOf(s));
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
                  {isAll ? (
                    <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                      <div style={{ fontSize: 12, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.keyword}</div>
                      <div style={{ fontSize: 10, color: T.faint }}>
                        {locCity(s.locationId)} · <span style={{ color: T.good }}>{s.top3}%</span> top3 · <span style={{ color: T.cyan }}>{s.top10}%</span> top10
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: T.faint, minWidth: 96 }}>
                      <span style={{ color: T.good }}>{s.top3}%</span> top3 ·{" "}
                      <span style={{ color: T.cyan }}>{s.top10}%</span> top10
                    </div>
                  )}
                  <div style={{ fontFamily: mono, fontSize: 10, color: T.faint }}>{s.size}×{s.size}</div>
                  <div style={{ display: "flex", gap: 6, marginLeft: isAll ? 0 : "auto" }}>
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
