// PATCH /api/posts/[id]/schedule
// Lets the reviewer override scheduled_for. Validates:
//   - Valid ISO date in the future
//   - Weekday 7 AM–6 PM PST (warning for weekends, not blocked)

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { toZonedTime } from "date-fns-tz";
import { SCHEDULE_CONFIG } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const scheduled_for = typeof body?.scheduled_for === "string" ? body.scheduled_for : null;
  const performedBy = typeof body?.performed_by === "string" ? body.performed_by : "dashboard";

  if (!scheduled_for) {
    return NextResponse.json({ error: "scheduled_for is required" }, { status: 400 });
  }

  const parsed = new Date(scheduled_for);
  if (Number.isNaN(parsed.getTime())) {
    return NextResponse.json({ error: "invalid ISO date" }, { status: 400 });
  }

  const now = Date.now();
  if (parsed.getTime() <= now + 60_000) {
    return NextResponse.json(
      { error: "scheduled_for must be at least 1 minute in the future" },
      { status: 400 }
    );
  }

  // Validate against PST working hours (warn, don't block weekends)
  const pstDate = toZonedTime(parsed, SCHEDULE_CONFIG.timezone);
  const day = pstDate.getDay(); // 0=Sun, 6=Sat
  const hour = pstDate.getHours();
  const warnings: string[] = [];
  if (day === 0 || day === 6) {
    warnings.push("Weekend post — typically lower engagement than weekdays.");
  }
  if (hour < 7 || hour > 18) {
    return NextResponse.json(
      { error: "scheduled_for must be between 7 AM and 6 PM PST" },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();
  const { data: existing, error: fetchErr } = await sb
    .from("posts")
    .select("id, scheduled_for, status")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }

  const { error: updateErr } = await sb
    .from("posts")
    .update({
      scheduled_for: parsed.toISOString(),
      schedule_override: true,
    })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await logAction({
    action: "schedule_override",
    post_id: id,
    performed_by: performedBy,
    details: {
      previous_scheduled_for: existing.scheduled_for,
      new_scheduled_for: parsed.toISOString(),
      warnings,
    },
    ip_address: req.headers.get("x-forwarded-for") ?? null,
  });

  return NextResponse.json({
    ok: true,
    post_id: id,
    scheduled_for: parsed.toISOString(),
    warnings,
  });
}
