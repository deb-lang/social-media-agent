// POST /api/scrape/resources — manual trigger to refresh content_sources.
// Used by the Settings page. Also callable from crons if we add a scheduled scrape later.

import { NextResponse } from "next/server";
import { refreshResourceCache } from "@/lib/scraper";
import { notifyFailure } from "@/lib/slack";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await refreshResourceCache();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    await notifyFailure({ context: "scrape.resources", error: err });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
