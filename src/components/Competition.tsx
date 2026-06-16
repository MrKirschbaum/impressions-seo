"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { Swords, Radius, Crown, Trophy, Target } from "lucide-react";
import type { CompetitionReport } from "@/lib/types";
import { T, mono, serif } from "./theme";

const card: CSSProperties = { background: T.card, border: `1px solid ${T.line}`, borderRadius: 10 };
const label: CSSProperties = { fontSize: 11, color: T.faint, textTransform: "uppercase", letterSpacing: 1.5 };
const sub: CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: T.faint, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" };

function Stat({ value, suffix, caption, color }: { value: number | string; suffix?: string; caption: string; color: string }) {
  return (
    <div>
      <div style={{ fontFamily: serif, fontSize: 28, color, lineHeight: 1 }}>{value}<span style={{ fontSize: 14 }}>{suffix}</span></div>
      <div style={{ fontSize: 11, color: T.faint, marginTop: 3 }}>{caption}</div>
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ flex: 1, height: 6, background: T.line, borderRadius: 3, overflow: "hidden", minWidth: 40 }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: color }} />
    </div>
  );
}

const youTag = <span style={{ fontSize: 9, fontWeight: 700, color: T.cyan, border: `1px solid ${T.cyan}`, borderRadius: 4, padding: "0 4px", marginLeft: 6 }}>YOU</span>;

export function Competition({ scanId }: { scanId: string | null }) {
  const [data, setData] = useState<CompetitionReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scanId) { setData(null); return; }
    setLoading(true);
    fetch(`/api/competition?scanId=${encodeURIComponent(scanId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [scanId]);

  if (!scanId) return null;

  return (
    <div style={{ ...card, padding: 16, marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Swords size={15} color={T.sub} />
        <span style={label}>Competitive landscape</span>
        {data && <span style={{ fontFamily: mono, fontSize: 11, color: T.faint }}>&quot;{data.keyword}&quot; · {data.totalPoints} points</span>}
      </div>

      {!data ? (
        <div style={{ color: T.sub, fontSize: 13, padding: "8px 2px" }}>{loading ? "Analyzing…" : "Unavailable."}</div>
      ) : (
        <>
          {/* Reach radius — always available */}
          <div style={{ marginBottom: 16 }}>
            <div style={sub}><Radius size={12} /> Reach radius</div>
            <div style={{ display: "flex", gap: 30, alignItems: "baseline", flexWrap: "wrap" }}>
              <Stat value={data.reach.top3Mi} suffix=" mi" caption="top-3 hold" color={T.good} />
              <Stat value={data.reach.top10Mi} suffix=" mi" caption="top-10 hold" color={T.cyan} />
              <Stat value={data.reach.gridRadiusMi} suffix=" mi" caption="scan extent" color={T.faint} />
            </div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 6 }}>
              You stay top-3 out to <b style={{ color: T.ink }}>{data.reach.top3Mi} mi</b> and top-10 out to <b style={{ color: T.ink }}>{data.reach.top10Mi} mi</b> from the storefront (median rank within the disc).
            </div>
          </div>

          {!data.hasCompetitors ? (
            <div style={{ color: T.sub, fontSize: 13, padding: "8px 10px", background: T.panel, borderRadius: 8 }}>
              This scan predates competitor capture. Run a new scan to unlock the SoLV leaderboard, share-of-#1, head-to-head, and the win model.
            </div>
          ) : (
            <>
              {/* What it takes to win */}
              {data.winModel && (
                <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 9, padding: 13, marginBottom: 16 }}>
                  <div style={sub}><Target size={12} /> What it takes to win top-3</div>
                  <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.5 }}>{data.winModel.summary}</div>
                  <div style={{ display: "flex", gap: 22, flexWrap: "wrap", margin: "10px 0 2px" }}>
                    <Stat value={`${data.winModel.weakCells}/${data.winModel.totalCells}`} caption="weak cells (not top-3)" color={T.warn} />
                    {data.winModel.reviewThreshold != null && <Stat value={`~${data.winModel.reviewThreshold}`} caption="reviews to reach top-3" color={T.ink} />}
                    {data.winModel.targetReviews != null && <Stat value={data.winModel.targetReviews} caption="your reviews" color={T.cyan} />}
                    {data.winModel.reviewGap != null && <Stat value={`+${data.winModel.reviewGap}`} caption="review gap" color={data.winModel.reviewGap ? T.red : T.good} />}
                  </div>
                  {data.winModel.blockers.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: T.sub }}>
                      Top blockers:{" "}
                      {data.winModel.blockers.map((b, i) => (
                        <span key={b.name}>
                          {i > 0 && " · "}
                          <span style={{ color: T.ink }}>{b.name}</span> <span style={{ color: T.faint }}>({b.cells} cells{b.reviews != null ? `, ${b.reviews} rev` : ""})</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                {/* SoLV leaderboard */}
                <div>
                  <div style={sub}><Trophy size={12} /> SoLV leaderboard</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {data.solv.map((s, i) => (
                      <div key={s.placeId || s.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 6, background: s.isTarget ? T.panel : "transparent", border: `1px solid ${s.isTarget ? T.cyan : "transparent"}` }}>
                        <span style={{ fontFamily: mono, fontSize: 11, color: T.faint, width: 16 }}>{i + 1}</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {s.name}{s.isTarget && youTag}
                        </span>
                        <Bar pct={s.solv} color={s.isTarget ? T.cyan : T.sub} />
                        <span style={{ fontFamily: mono, fontSize: 11, color: s.isTarget ? T.cyan : T.sub, width: 30, textAlign: "right" }}>{s.solv}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: T.faint, marginTop: 6, fontFamily: mono }}>SoLV = position-weighted visibility across the grid (0–100)</div>
                </div>

                {/* Right column: share of #1 + head-to-head */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div style={sub}><Crown size={12} /> Share of #1 — you hold {data.shareOfNo1}%</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {data.kings.map((k) => (
                        <div key={k.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", borderRadius: 6, background: k.isTarget ? T.panel : "transparent" }}>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {k.name}{k.isTarget && youTag}
                          </span>
                          <Bar pct={k.share} color={k.isTarget ? T.cyan : T.magenta} />
                          <span style={{ fontFamily: mono, fontSize: 11, color: T.sub, width: 30, textAlign: "right" }}>{k.share}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={sub}><Swords size={12} /> Head-to-head (you vs rival)</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {data.headToHead.map((h) => {
                        const win = h.winRate >= 50;
                        return (
                          <div key={h.placeId || h.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={h.theirReviews != null && h.yourReviews != null ? `reviews ${h.yourReviews} vs ${h.theirReviews}` : undefined}>
                              {h.name}
                            </span>
                            <Bar pct={h.winRate} color={win ? T.good : T.red} />
                            <span style={{ fontFamily: mono, fontSize: 11, color: win ? T.good : T.red, width: 64, textAlign: "right" }}>{h.winRate}% · {h.wins}-{h.losses}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 10, color: T.faint, marginTop: 6, fontFamily: mono }}>win% of cells where both appear</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
