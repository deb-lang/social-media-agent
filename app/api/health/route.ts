import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface HealthCheck {
  name: string;
  ok: boolean;
  detail?: string;
}

export async function GET() {
  const checks: HealthCheck[] = [];

  // ─── Supabase ─────────────────────────────────────
  try {
    const sb = supabaseAdmin();
    const { count, error } = await sb
      .from("posts")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    checks.push({
      name: "supabase",
      ok: true,
      detail: `posts table reachable · ${count ?? 0} rows`,
    });
  } catch (err) {
    checks.push({
      name: "supabase",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // ─── Required env vars ────────────────────────────
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];
  for (const key of required) {
    checks.push({
      name: `env:${key}`,
      ok: Boolean(process.env[key]),
    });
  }

  // ─── Optional env vars (warn only) ────────────────
  const optional = [
    "ANTHROPIC_API_KEY",
    "PUBLER_API_KEY",
    "PUBLER_WORKSPACE_ID",
    "PUBLER_LINKEDIN_ACCOUNT_ID",
    "SLACK_WEBHOOK_URL",
    "CRON_SECRET",
  ];
  for (const key of optional) {
    checks.push({
      name: `env:${key}`,
      ok: Boolean(process.env[key]),
      detail: process.env[key] ? undefined : "not set (required for later phases)",
    });
  }

  const allCriticalOk = checks
    .filter((c) => c.name === "supabase" || required.includes(c.name.replace("env:", "")))
    .every((c) => c.ok);

  return NextResponse.json(
    { status: allCriticalOk ? "ok" : "degraded", checks },
    { status: allCriticalOk ? 200 : 503 }
  );
}
