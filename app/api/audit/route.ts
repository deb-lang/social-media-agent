// GET /api/audit — recent audit_log entries with filters

import { NextRequest, NextResponse } from "next/server";
import { listAuditEntries, type AuditAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ACTIONS: AuditAction[] = [
  "generate",
  "approve",
  "reject",
  "regenerate",
  "schedule_override",
  "publish",
  "fail",
  "recycle",
];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const postIdParam = sp.get("post_id");
  const actionParam = sp.get("action");
  const limit = Math.min(parseInt(sp.get("limit") ?? "50", 10) || 50, 200);

  const postId = postIdParam ?? undefined;
  const action = actionParam && ACTIONS.includes(actionParam as AuditAction)
    ? (actionParam as AuditAction)
    : undefined;

  try {
    const entries = await listAuditEntries({ postId, action, limit });
    return NextResponse.json({ entries });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
