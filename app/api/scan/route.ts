import { NextResponse } from "next/server";
import { scanMarket } from "@/lib/scanner/scan";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "1";
    const limitRaw = url.searchParams.get("limit");
    const parsed = limitRaw === null ? Number.NaN : Number.parseInt(limitRaw, 10);
    const limit = Number.isFinite(parsed) ? parsed : undefined;
    const summary = await scanMarket({ force, limit });
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: "scan_failed", detail: String(err) }, { status: 502 });
  }
}
