import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** Clean, neutral light map styling to match the app theme (Static Maps `style` params). */
const STYLES = [
  "element:geometry|color:0xf2f3f5",
  "element:labels.text.fill|color:0x5b616e",
  "element:labels.text.stroke|color:0xffffff",
  "element:labels.icon|visibility:off",
  "feature:administrative|element:geometry|color:0xd6d9de",
  "feature:landscape|element:geometry|color:0xf2f3f5",
  "feature:poi|element:geometry|color:0xeaecef",
  "feature:poi|element:labels|visibility:off",
  "feature:road|element:geometry|color:0xffffff",
  "feature:road.highway|element:geometry|color:0xfbe7b0",
  "feature:road|element:labels|visibility:simplified",
  "feature:transit|visibility:off",
  "feature:water|element:geometry|color:0xc5d8e3",
];

/**
 * Proxies Google Static Maps so the API key stays server-side. The geo-grid
 * overlay computes the same center/zoom, so markers line up with the image.
 * GET /api/staticmap?lat=&lng=&zoom=&size=
 */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const zoom = Number(sp.get("zoom"));
  const size = Math.min(640, Math.max(120, Number(sp.get("size")) || 420));
  const key = process.env.GOOGLE_MAPS_API_KEY;

  if (!key) return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY not set" }, { status: 500 });
  if (![lat, lng, zoom].every(Number.isFinite)) return NextResponse.json({ error: "bad params" }, { status: 400 });

  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("center", `${lat},${lng}`);
  url.searchParams.set("zoom", String(Math.round(zoom)));
  url.searchParams.set("size", `${size}x${size}`);
  url.searchParams.set("scale", "2");
  url.searchParams.set("maptype", "roadmap");
  url.searchParams.set("key", key);
  for (const s of STYLES) url.searchParams.append("style", s);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200);
      return NextResponse.json({ error: `Static Maps ${res.status}`, detail }, { status: 502 });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "fetch failed" }, { status: 502 });
  }
}
