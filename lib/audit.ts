// Audit log — every state transition across the app writes one row here.
// Fire-and-forget semantics: audit failures should never block the action itself.

import { supabaseAdmin } from "./supabase";

export type AuditAction =
  | "generate"
  | "manual_generate"
  | "approve"
  | "reject"
  | "regenerate"
  | "schedule_override"
  | "publish"
  | "fail"
  | "recycle";

export interface AuditEntry {
  action: AuditAction;
  post_id?: string | null;
  performed_by: string; // 'system' | 'cron' | user identifier
  details?: Record<string, unknown>;
  ip_address?: string | null;
}

export async function logAction(entry: AuditEntry): Promise<void> {
  try {
    const sb = supabaseAdmin();
    const { error } = await sb.from("audit_log").insert({
      action: entry.action,
      post_id: entry.post_id ?? null,
      performed_by: entry.performed_by,
      details: entry.details ?? {},
      ip_address: entry.ip_address ?? null,
    });
    if (error) {
      console.warn(`[audit] insert failed for ${entry.action}:`, error.message);
    }
  } catch (err) {
    console.warn(`[audit] threw for ${entry.action}:`, err);
  }
}

export async function listAuditEntries(
  opts: { postId?: string; action?: AuditAction; limit?: number } = {}
) {
  const sb = supabaseAdmin();
  let q = sb.from("audit_log").select("*").order("created_at", { ascending: false });
  if (opts.postId) q = q.eq("post_id", opts.postId);
  if (opts.action) q = q.eq("action", opts.action);
  q = q.limit(opts.limit ?? 50);
  const { data, error } = await q;
  if (error) throw new Error(`audit_log select: ${error.message}`);
  return data ?? [];
}
