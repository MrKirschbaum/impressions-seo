"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { Grid3x3 } from "lucide-react";
import type { Location, ScanResult } from "@/lib/types";
import { GeoGrid } from "@/components/GeoGrid";
import { T, mono } from "@/components/theme";

const sel: CSSProperties = { background: T.panel, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: "9px 11px", fontSize: 13 };
const btn: CSSProperties = { border: "none", cursor: "pointer", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700 };

export default function Dashboard() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locId, setLocId] = useState("pdx");
  const [kw, setKw] = useState("");
  const [size, setSize] = useState(7);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((ls: Location[]) => {
        setLocations(ls);
        const first = ls.find((l) => l.id === "pdx") ?? ls[0];
        if (first?.keywords[0]) setKw(first.keywords[0].term);
      });
  }, []);

  const loc = locations.find((l) => l.id === locId);

  async function runScan() {
    if (!kw) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: locId, keyword: kw, size }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setResult(data as ScanResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 16px 60px", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: T.faint }}>
        Impressions In Ink &middot; local search
      </div>
      <h1 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: "6px 0 0" }}>
        <span style={{ width: 10, height: 26, background: T.red, borderRadius: 1 }} /> IMPRESSIONS SEO
      </h1>
      <div style={{ display: "flex", height: 4, marginTop: 14, borderRadius: 2, overflow: "hidden" }}>
        {["#00A7E1", "#E5007E", "#FFCD00", "#0c0c0c"].map((c) => <div key={c} style={{ flex: 1, background: c }} />)}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "22px 0 18px" }}>
        <select value={locId} style={sel}
          onChange={(e) => {
            setLocId(e.target.value);
            const l = locations.find((x) => x.id === e.target.value);
            setKw(l?.keywords[0]?.term ?? "");
            setResult(null);
          }}>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name} &mdash; {l.address.split(",")[1]?.trim()}</option>)}
        </select>

        <select value={kw} onChange={(e) => setKw(e.target.value)} style={{ ...sel, minWidth: 240 }} disabled={!loc?.keywords.length}>
          {loc?.keywords.length
            ? loc.keywords.map((k) => <option key={k.term} value={k.term}>{k.term}</option>)
            : <option>No keywords for this location</option>}
        </select>

        {[5, 7, 9].map((s) => (
          <button key={s} onClick={() => setSize(s)} style={{ ...btn, background: size === s ? T.red : T.panel, color: size === s ? "#fff" : T.sub }}>
            {s}&times;{s}
          </button>
        ))}

        <button onClick={runScan} disabled={loading || !kw} style={{ ...btn, background: T.ink, color: "#15120F", opacity: loading || !kw ? 0.5 : 1 }}>
          <Grid3x3 size={15} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />
          {loading ? `Scanning ${size * size} points\u2026` : "Run scan"}
        </button>
      </div>

      {error && <div style={{ color: T.red, fontSize: 13, marginBottom: 14 }}>{error}</div>}

      {result ? (
        <GeoGrid result={result} competitors={loc?.competitors ?? []} />
      ) : (
        <div style={{ border: `1px dashed ${T.line}`, borderRadius: 10, padding: 32, textAlign: "center", color: T.sub, fontSize: 14 }}>
          {loc?.keywords.length
            ? "Pick a keyword and grid size, then run a scan to map your rank across the area."
            : "No keyword footprint for this location yet \u2014 wide open. Build reviews and location pages first."}
        </div>
      )}

      <div style={{ fontFamily: mono, fontSize: 11, color: T.faint, marginTop: 20 }}>
        Provider: {process.env.NEXT_PUBLIC_RANKING_PROVIDER ?? "mock"} &middot; each scan = {size * size} ranking lookups.
      </div>
    </main>
  );
}
