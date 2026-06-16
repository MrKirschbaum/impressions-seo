"use client";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Radar, Bell, Plus, Play, Trash2, Pause, BellOff } from "lucide-react";
import type { Alert, Location, Schedule } from "@/lib/types";
import { T, mono, serif } from "./theme";

const card: CSSProperties = { background: T.card, border: `1px solid ${T.line}`, borderRadius: 10 };
const label: CSSProperties = { fontSize: 11, color: T.faint, textTransform: "uppercase", letterSpacing: 1.5 };
const sel: CSSProperties = { background: T.panel, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 7, padding: "6px 8px", fontSize: 12 };
const chip: CSSProperties = { border: `1px solid ${T.line}`, background: T.panel, color: T.sub, cursor: "pointer", borderRadius: 7, padding: "5px 9px", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 };

const INTERVALS = [
  { h: 6, label: "Every 6h" }, { h: 24, label: "Daily" }, { h: 72, label: "Every 3 days" },
  { h: 168, label: "Weekly" }, { h: 336, label: "Every 2 weeks" }, { h: 720, label: "Monthly" },
];
const intervalLabel = (h: number) => INTERVALS.find((i) => i.h === h)?.label ?? `Every ${h}h`;
const PROVIDER = process.env.NEXT_PUBLIC_RANKING_PROVIDER ?? "mock";

function rel(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms), m = 60_000, h = 3600_000, d = 86_400_000;
  const s = abs >= d ? `${Math.round(abs / d)}d` : abs >= h ? `${Math.round(abs / h)}h` : `${Math.max(1, Math.round(abs / m))}m`;
  return ms >= 0 ? `in ${s}` : `${s} ago`;
}

export function Monitoring({
  locations, locationId, keyword, onRun,
}: {
  locations: Location[];
  locationId: string;
  keyword: string;
  onRun: () => void;
}) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [size, setSize] = useState(7);
  const [intervalHours, setIntervalHours] = useState(168);
  const [threshold, setThreshold] = useState(1);
  const [formKw, setFormKw] = useState(keyword);
  const [busy, setBusy] = useState(false);

  const loc = locations.find((l) => l.id === locationId);
  const loadSchedules = useCallback(() => fetch("/api/schedules").then((r) => r.json()).then(setSchedules).catch(() => {}), []);
  const loadAlerts = useCallback(() => fetch("/api/alerts").then((r) => r.json()).then(setAlerts).catch(() => {}), []);

  useEffect(() => { loadSchedules(); loadAlerts(); }, [loadSchedules, loadAlerts]);
  useEffect(() => { setFormKw(keyword); }, [keyword]);
  // Surface alerts produced by the background scheduler without a manual refresh.
  useEffect(() => {
    const t = setInterval(() => { loadAlerts(); loadSchedules(); }, 30_000);
    return () => clearInterval(t);
  }, [loadAlerts, loadSchedules]);

  async function addSchedule() {
    if (!formKw) return;
    setBusy(true);
    await fetch("/api/schedules", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, keyword: formKw, size, intervalHours, dropThreshold: threshold }),
    }).catch(() => {});
    await loadSchedules();
    setBusy(false);
  }
  async function patchSchedule(id: string, body: object) {
    await fetch(`/api/schedules/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
    loadSchedules();
  }
  async function removeSchedule(id: string) {
    await fetch(`/api/schedules/${id}`, { method: "DELETE" }).catch(() => {});
    loadSchedules();
  }
  async function runDueNow() {
    setBusy(true);
    await fetch("/api/cron", { method: "POST" }).catch(() => {});
    await Promise.all([loadSchedules(), loadAlerts()]);
    onRun(); // refresh rollup / audit / library
    setBusy(false);
  }
  async function alertAction(action: "read" | "clear") {
    await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).catch(() => {});
    loadAlerts();
  }

  const kwOptions = loc?.keywords ?? [];
  const unread = alerts.filter((a) => !a.read).length;
  const locName = (id: string) => locations.find((l) => l.id === id)?.address.split(",")[1]?.trim() ?? id;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
      {/* ── Schedules ─────────────────────────────────────────── */}
      <div style={{ ...card, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Radar size={15} color={T.sub} />
          <span style={label}>Scheduled scans</span>
          <button onClick={runDueNow} disabled={busy} style={{ ...chip, marginLeft: "auto" }}>
            <Play size={12} /> Run due now
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", paddingBottom: 12, borderBottom: `1px solid ${T.line}` }}>
          <select value={formKw} onChange={(e) => setFormKw(e.target.value)} style={{ ...sel, flex: "1 1 160px", minWidth: 0 }} disabled={!kwOptions.length}>
            {kwOptions.length ? kwOptions.map((k) => <option key={k.term} value={k.term}>{k.term}</option>) : <option value="">No keywords</option>}
          </select>
          <select value={intervalHours} onChange={(e) => setIntervalHours(Number(e.target.value))} style={sel}>
            {INTERVALS.map((i) => <option key={i.h} value={i.h}>{i.label}</option>)}
          </select>
          <select value={size} onChange={(e) => setSize(Number(e.target.value))} style={sel}>
            {[5, 7, 9].map((s) => <option key={s} value={s}>{s}×{s}</option>)}
          </select>
          <label style={{ fontSize: 11, color: T.faint, display: "inline-flex", alignItems: "center", gap: 4 }}>
            drop ≥
            <input type="number" min={0.5} step={0.5} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}
              style={{ ...sel, width: 52 }} />
          </label>
          <button onClick={addSchedule} disabled={busy || !formKw} style={{ ...chip, color: T.ink, borderColor: T.sub, opacity: !formKw ? 0.5 : 1 }}>
            <Plus size={12} /> Add
          </button>
        </div>

        {schedules.length === 0 ? (
          <div style={{ color: T.sub, fontSize: 13, padding: "10px 2px" }}>
            No recurring scans. Add one above — it runs automatically and alerts you when rank drops.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
            {schedules.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: T.panel, opacity: s.enabled ? 1 : 0.55 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.keyword}</div>
                  <div style={{ fontSize: 10, color: T.faint, fontFamily: mono }}>
                    {locName(s.locationId)} · {s.size}×{s.size} · {intervalLabel(s.intervalHours)} · next {rel(s.nextRunAt)} · drop≥{s.dropThreshold}
                  </div>
                </div>
                <button onClick={() => patchSchedule(s.id, { enabled: !s.enabled })} title={s.enabled ? "Pause" : "Resume"} style={{ ...chip, padding: "5px 7px" }}>
                  {s.enabled ? <Pause size={12} /> : <Play size={12} />}
                </button>
                <button onClick={() => removeSchedule(s.id)} title="Delete" style={{ ...chip, padding: "5px 7px", color: T.red, borderColor: "transparent" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 10, color: PROVIDER === "google" ? T.warn : T.faint, marginTop: 10, fontFamily: mono }}>
          {PROVIDER === "google"
            ? `⚠ live provider — each run bills size² Places lookups. New schedules run a baseline within ~1 min.`
            : `mock provider — scheduled runs are free. New schedules run a baseline within ~1 min.`}
        </div>
      </div>

      {/* ── Alerts ────────────────────────────────────────────── */}
      <div style={{ ...card, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Bell size={15} color={unread ? T.red : T.sub} />
          <span style={label}>Rank alerts</span>
          {unread > 0 && <span style={{ background: T.red, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 7px" }}>{unread}</span>}
          {alerts.length > 0 && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button onClick={() => alertAction("read")} style={{ ...chip, padding: "5px 7px" }} title="Mark all read"><BellOff size={12} /></button>
              <button onClick={() => alertAction("clear")} style={{ ...chip, padding: "5px 7px", color: T.red }} title="Clear all"><Trash2 size={12} /></button>
            </div>
          )}
        </div>

        {alerts.length === 0 ? (
          <div style={{ color: T.sub, fontSize: 13, padding: "10px 2px" }}>
            No alerts yet. Scheduled scans post a notice here whenever a keyword&apos;s average map rank moves past its threshold.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 230, overflowY: "auto" }}>
            {alerts.map((a) => {
              const color = a.severity === "drop" ? T.red : T.good;
              return (
                <div key={a.id} style={{ display: "flex", gap: 9, padding: "8px 10px", borderRadius: 8, background: a.read ? "transparent" : T.panel, borderLeft: `3px solid ${color}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: T.ink }}>{a.message}</div>
                    <div style={{ fontSize: 10, color: T.faint, fontFamily: mono, marginTop: 2 }}>
                      {locName(a.locationId)} · {new Date(a.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                  <span style={{ fontFamily: serif, fontSize: 18, color }}>{a.severity === "drop" ? "▼" : "▲"}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
