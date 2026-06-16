"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { ClipboardCheck, RefreshCw, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import type { AuditReport, AuditStatus } from "@/lib/types";
import { T, mono, serif } from "./theme";

const card: CSSProperties = { background: T.card, border: `1px solid ${T.line}`, borderRadius: 10 };
const label: CSSProperties = { fontSize: 11, color: T.faint, textTransform: "uppercase", letterSpacing: 1.5 };

const STATUS: Record<AuditStatus, { color: string; Icon: typeof CheckCircle2 }> = {
  good: { color: T.good, Icon: CheckCircle2 },
  warn: { color: T.warn, Icon: AlertTriangle },
  bad: { color: T.red, Icon: XCircle },
  unknown: { color: T.faint, Icon: HelpCircle },
};

const gradeColor = (g: string) => (g === "A" ? T.good : g === "B" ? "#7CB342" : g === "C" ? T.yellow : g === "D" ? T.warn : T.red);

export function GbpAudit({ locationId, refreshKey }: { locationId: string; refreshKey: number }) {
  const [data, setData] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);

  function load(refresh = false) {
    setLoading(true);
    const q = `locationId=${encodeURIComponent(locationId)}${refresh ? "&refresh=1" : ""}`;
    fetch(`/api/audit?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(false); /* eslint-disable-next-line */ }, [locationId, refreshKey]);

  return (
    <div style={{ ...card, padding: 16, marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <ClipboardCheck size={15} color={T.sub} />
        <span style={label}>GBP audit</span>
        {data && (
          <span style={{ fontFamily: mono, fontSize: 11, color: T.faint }}>
            {data.source === "live" ? "live profile" : "derived"}
          </span>
        )}
        <button onClick={() => load(true)} disabled={loading} title="Re-pull live profile data"
          style={{ marginLeft: "auto", border: `1px solid ${T.line}`, background: T.panel, color: T.sub, cursor: "pointer", borderRadius: 7, padding: "5px 9px", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <RefreshCw size={12} style={loading ? { animation: "spin 1s linear infinite" } : undefined} /> Refresh
        </button>
      </div>

      {!data ? (
        <div style={{ color: T.sub, fontSize: 13, padding: "8px 2px" }}>{loading ? "Auditing…" : "Audit unavailable."}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 18, alignItems: "start" }}>
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontFamily: serif, fontSize: 64, lineHeight: 1, color: gradeColor(data.grade) }}>{data.grade}</div>
            <div style={{ fontFamily: serif, fontSize: 22, color: T.ink, marginTop: 4 }}>{data.score}<span style={{ fontSize: 13, color: T.faint }}>/100</span></div>
            <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>profile health</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.checks.map((c) => {
              const { color, Icon } = STATUS[c.status];
              return (
                <div key={c.key} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <Icon size={15} color={color} style={{ marginTop: 1, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <span style={{ fontSize: 13, color: T.ink, fontWeight: 600 }}>{c.label}</span>
                      <span style={{ fontFamily: mono, fontSize: 10, color: T.faint, marginLeft: "auto" }}>{c.score}/{c.weight}</span>
                    </div>
                    <div style={{ fontSize: 12, color: T.sub, marginTop: 1 }}>{c.detail}</div>
                    {c.recommendation && c.status !== "good" && (
                      <div style={{ fontSize: 12, color: color, marginTop: 2 }}>→ {c.recommendation}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
