"use client";
import { useEffect, useState, type CSSProperties } from "react";
import type { AuditReport, AuditStatus, Location, Rollup } from "@/lib/types";

/* Light, ink-friendly palette — this page is meant to be saved as a PDF. */
const C = {
  ink: "#1a1714", sub: "#6b645c", faint: "#9a938a", line: "#e3ded6", bg: "#ffffff",
  good: "#1a7f4b", warn: "#b07a12", red: "#c0392b", brand: "#E5322D", cyan: "#0a7ea4",
};
const serif = "Georgia, 'Times New Roman', serif";
const mono = "ui-monospace, Menlo, monospace";

const statusColor: Record<AuditStatus, string> = { good: C.good, warn: C.warn, bad: C.red, unknown: C.faint };
const statusMark: Record<AuditStatus, string> = { good: "✓", warn: "!", bad: "✕", unknown: "?" };
const gradeColor = (g: string) => (g === "A" ? C.good : g === "B" ? "#3f8f3f" : g === "C" ? C.warn : g === "D" ? C.warn : C.red);

const card: CSSProperties = { border: `1px solid ${C.line}`, borderRadius: 8, padding: 18, marginBottom: 16, breakInside: "avoid" };
const h2: CSSProperties = { fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: C.faint, margin: "0 0 12px" };
const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function Report() {
  const [loc, setLoc] = useState<Location | null>(null);
  const [rollup, setRollup] = useState<Rollup | null>(null);
  const [audit, setAudit] = useState<AuditReport | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("loc") ?? "pdx";
    Promise.all([
      fetch("/api/locations").then((r) => r.json()),
      fetch(`/api/rollup?locationId=${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/audit?locationId=${id}`).then((r) => (r.ok ? r.json() : null)),
    ]).then(([locs, rl, au]: [Location[], Rollup | null, AuditReport | null]) => {
      setLoc(locs.find((l) => l.id === id) ?? locs[0] ?? null);
      setRollup(rl); setAudit(au); setReady(true);
    });
  }, []);

  const now = ready ? fmtDate(new Date().toISOString()) : "";

  return (
    <div style={{ background: C.bg, color: C.ink, fontFamily: "ui-sans-serif, system-ui, sans-serif", minHeight: "100vh" }}>
      <style>{`
        @media print { .no-print { display: none !important; } @page { margin: 16mm; } }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      `}</style>

      <div className="no-print" style={{ position: "sticky", top: 0, background: "#faf8f4", borderBottom: `1px solid ${C.line}`, padding: "10px 16px", display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={() => window.print()} style={{ background: C.ink, color: "#fff", border: "none", borderRadius: 7, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Print / Save as PDF
        </button>
        <span style={{ fontSize: 12, color: C.sub }}>Use your browser&apos;s “Save as PDF” destination.</span>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 24px 60px" }}>
        {!ready ? (
          <div style={{ color: C.sub, fontSize: 14, padding: 40 }}>Preparing report…</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ borderBottom: `2px solid ${C.brand}`, paddingBottom: 14, marginBottom: 20 }}>
              <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.faint }}>
                Impressions SEO · Local search report
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 2px" }}>{loc?.name ?? "—"}</h1>
              <div style={{ fontSize: 13, color: C.sub }}>{loc?.address}</div>
              <div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>Generated {now}</div>
            </div>

            {/* Visibility rollup */}
            <div style={card}>
              <h2 style={h2}>Visibility rollup — share of local voice</h2>
              {!rollup || rollup.scannedKeywords === 0 ? (
                <div style={{ color: C.sub, fontSize: 13 }}>No scans recorded for this location yet.</div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 36, flexWrap: "wrap", marginBottom: 16 }}>
                    {[
                      { v: `${rollup.sov}%`, c: C.good, t: "avg top-3 (SoV)" },
                      { v: `${rollup.avgTop10}%`, c: C.cyan, t: "avg top-10" },
                      { v: rollup.avgAmr, c: C.ink, t: "avg map rank" },
                      { v: `${rollup.scannedKeywords}/${rollup.trackedKeywords}`, c: C.ink, t: "keywords scanned" },
                    ].map((s, i) => (
                      <div key={i}>
                        <div style={{ fontFamily: serif, fontSize: 30, color: s.c, lineHeight: 1 }}>{s.v}</div>
                        <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>{s.t}</div>
                      </div>
                    ))}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ color: C.faint, textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        <th style={{ padding: "4px 0" }}>Keyword</th>
                        <th style={{ padding: "4px 8px", textAlign: "right" }}>Top 3</th>
                        <th style={{ padding: "4px 8px", textAlign: "right" }}>Top 10</th>
                        <th style={{ padding: "4px 0", textAlign: "right" }}>Avg rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rollup.perKeyword.map((k) => (
                        <tr key={k.keyword} style={{ borderTop: `1px solid ${C.line}` }}>
                          <td style={{ padding: "6px 0" }}>{k.keyword}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: C.good }}>{k.top3}%</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: C.cyan }}>{k.top10}%</td>
                          <td style={{ padding: "6px 0", textAlign: "right", fontFamily: serif, fontSize: 15 }}>{k.amr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            {/* GBP audit */}
            <div style={card}>
              <h2 style={h2}>Google Business Profile audit</h2>
              {!audit ? (
                <div style={{ color: C.sub, fontSize: 13 }}>Audit unavailable.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 18 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: serif, fontSize: 56, lineHeight: 1, color: gradeColor(audit.grade) }}>{audit.grade}</div>
                    <div style={{ fontFamily: serif, fontSize: 20 }}>{audit.score}<span style={{ fontSize: 12, color: C.faint }}>/100</span></div>
                    <div style={{ fontSize: 10, color: C.faint }}>{audit.source === "live" ? "live profile" : "derived"}</div>
                  </div>
                  <div>
                    {audit.checks.map((c) => (
                      <div key={c.key} style={{ display: "flex", gap: 8, padding: "6px 0", borderTop: `1px solid ${C.line}` }}>
                        <span style={{ color: statusColor[c.status], fontWeight: 700, width: 14, flexShrink: 0 }}>{statusMark[c.status]}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.label} <span style={{ color: C.faint, fontWeight: 400, fontFamily: mono, fontSize: 10 }}>{c.score}/{c.weight}</span></div>
                          <div style={{ fontSize: 12, color: C.sub }}>{c.detail}</div>
                          {c.recommendation && c.status !== "good" && <div style={{ fontSize: 12, color: statusColor[c.status] }}>→ {c.recommendation}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ fontSize: 10, color: C.faint, fontFamily: mono, textAlign: "center", marginTop: 8 }}>
              Impressions SEO · geo-grid local rank tracker
            </div>
          </>
        )}
      </div>
    </div>
  );
}
