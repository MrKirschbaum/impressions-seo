"use client";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { TrendingUp, CalendarClock, X } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import type { Schedule, ScanSummary } from "@/lib/types";
import { T, mono } from "./theme";

const card: CSSProperties = {
  background: T.card, border: `1px solid ${T.line}`, borderRadius: 10,
  padding: 16, marginTop: 16,
};
const chip: CSSProperties = {
  border: `1px solid ${T.line}`, background: T.panel, color: T.sub,
  cursor: "pointer", borderRadius: 7, padding: "5px 9px", fontSize: 12,
  fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5,
};

function fmt(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

const LEGEND: { key: string; label: string; color: string }[] = [
  { key: "amr",   label: "Avg rank (↑ = improving)", color: T.cyan    },
  { key: "top3",  label: "Top 3 coverage %",          color: T.good    },
  { key: "top10", label: "Top 10 coverage %",         color: T.magenta },
];

export function PerformanceTrend({
  locationId,
  keyword,
  size,
  refreshKey,
  currentId,
}: {
  locationId: string;
  keyword: string;
  size: number;
  refreshKey: number;
  currentId: string | null;
}) {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [trackBusy, setTrackBusy] = useState(false);

  // Fetch scan history for this location+keyword
  useEffect(() => {
    if (!keyword) { setScans([]); return; }
    setScanLoading(true);
    const q = new URLSearchParams({ locationId, keyword });
    fetch(`/api/scans?${q}`)
      .then((r) => r.json())
      .then((s: ScanSummary[]) => setScans(Array.isArray(s) ? s : []))
      .catch(() => setScans([]))
      .finally(() => setScanLoading(false));
  }, [locationId, keyword, refreshKey]);

  // Fetch all schedules so we can check if this combo is already tracked
  const loadSchedules = useCallback(() => {
    fetch("/api/schedules")
      .then((r) => r.json())
      .then((s: Schedule[]) => setSchedules(Array.isArray(s) ? s : []))
      .catch(() => {});
  }, []);

  useEffect(() => { loadSchedules(); }, [loadSchedules, locationId, keyword]);

  // The schedule for this exact location+keyword, if one exists
  const tracked = useMemo(
    () => schedules.find((s) => s.locationId === locationId && s.keyword === keyword) ?? null,
    [schedules, locationId, keyword],
  );

  async function trackWeekly() {
    setTrackBusy(true);
    await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, keyword, size, intervalHours: 168 }),
    }).catch(() => {});
    await loadSchedules();
    setTrackBusy(false);
  }

  async function untrack() {
    if (!tracked) return;
    setTrackBusy(true);
    await fetch(`/api/schedules/${tracked.id}`, { method: "DELETE" }).catch(() => {});
    await loadSchedules();
    setTrackBusy(false);
  }

  // Chronological (oldest → newest) for the chart
  const chartData = useMemo(
    () =>
      [...scans].reverse().map((s) => ({
        label: fmt(s.createdAt),
        amr: s.amr,
        top3: s.top3,
        top10: s.top10,
      })),
    [scans],
  );

  const currentLabel = useMemo(() => {
    const s = scans.find((x) => x.id === currentId);
    return s ? fmt(s.createdAt) : null;
  }, [scans, currentId]);

  if (!keyword) return null;

  // Shared header used in both the sparse and full states
  function Header() {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <TrendingUp size={14} color={T.sub} />
        <span style={{ fontSize: 11, color: T.faint, textTransform: "uppercase", letterSpacing: 1.5 }}>
          Performance trend
        </span>
        {scans.length > 0 && (
          <span style={{ fontFamily: mono, fontSize: 11, color: T.faint }}>
            {scans.length} scan{scans.length !== 1 ? "s" : ""} &middot; &ldquo;{keyword}&rdquo;
          </span>
        )}
        <div style={{ marginLeft: "auto" }}>
          {tracked ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{
                ...chip, color: T.good, borderColor: T.good,
                background: "transparent", cursor: "default",
              }}>
                <CalendarClock size={12} /> Weekly
              </span>
              <button
                onClick={untrack}
                disabled={trackBusy}
                title="Stop tracking this keyword weekly"
                style={{ ...chip, padding: "5px 7px", color: T.red, borderColor: "transparent" }}
              >
                <X size={12} />
              </button>
            </span>
          ) : (
            <button
              onClick={trackWeekly}
              disabled={trackBusy || scanLoading}
              title="Auto-scan this keyword every week and update this chart"
              style={{ ...chip, color: T.ink, borderColor: T.sub, opacity: trackBusy ? 0.5 : 1 }}
            >
              <CalendarClock size={12} /> Track weekly
            </button>
          )}
        </div>
      </div>
    );
  }

  if (scanLoading) {
    return <div style={{ ...card, color: T.faint, fontSize: 13 }}><Header />Loading trend data…</div>;
  }

  if (scans.length < 2) {
    return (
      <div style={{ ...card, color: T.sub, fontSize: 13 }}>
        <Header />
        {scans.length === 0
          ? "No scan history yet for this keyword."
          : "Run a second scan to start tracking the trend — each scan adds a data point to this chart."}
      </div>
    );
  }

  return (
    <div style={card}>
      <Header />

      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 44, bottom: 0, left: -22 }}>
            <CartesianGrid stroke={T.line} strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: T.faint, fontSize: 10 }}
              stroke={T.line}
              interval="preserveStartEnd"
            />
            {/* Left: avg map rank — reversed so lower (better) sits higher */}
            <YAxis
              yAxisId="amr"
              reversed
              domain={[1, "dataMax"]}
              allowDecimals={false}
              tick={{ fill: T.faint, fontSize: 10 }}
              stroke={T.line}
            />
            {/* Right: coverage percentages */}
            <YAxis
              yAxisId="pct"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: T.faint, fontSize: 10 }}
              stroke={T.line}
            />
            <Tooltip
              contentStyle={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: T.sub }}
              formatter={(val: number, name: string) => {
                if (name === "amr")   return [`Rank ${val.toFixed(1)}`, "Avg rank"];
                if (name === "top3")  return [`${val}%`, "Top 3"];
                if (name === "top10") return [`${val}%`, "Top 10"];
                return [val, name];
              }}
            />
            {currentLabel && (
              <ReferenceLine
                x={currentLabel}
                yAxisId="amr"
                stroke={T.sub}
                strokeDasharray="3 3"
                label={{ value: "now", fill: T.sub, fontSize: 9, position: "insideTopRight" }}
              />
            )}
            <Line yAxisId="amr" type="monotone" dataKey="amr"   name="amr"   stroke={T.cyan}    strokeWidth={2} dot={{ r: 3, fill: T.cyan }}    activeDot={{ r: 5 }} />
            <Line yAxisId="pct" type="monotone" dataKey="top3"  name="top3"  stroke={T.good}    strokeWidth={2} dot={{ r: 3, fill: T.good }}    activeDot={{ r: 5 }} strokeDasharray="5 3" />
            <Line yAxisId="pct" type="monotone" dataKey="top10" name="top10" stroke={T.magenta} strokeWidth={2} dot={{ r: 3, fill: T.magenta }} activeDot={{ r: 5 }} strokeDasharray="5 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", gap: 16, padding: "8px 6px 0", flexWrap: "wrap" }}>
        {LEGEND.map(({ key, label, color }) => (
          <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: T.sub }}>
            <span style={{ width: 12, height: 3, background: color, borderRadius: 2 }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
