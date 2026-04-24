# Vercel Deploy — Seamless Push & Publish

This is the playbook for getting `f2cabf6` (or any subsequent push) live with zero surprises. Pre-flight is already done — Supabase, Anthropic, Slack, Publer, schema v2 all verified live.

## 1 · Vercel Project Settings → Environment Variables

These 14 vars must be set on the Vercel project (Settings → Environment Variables → tick **Production**, **Preview**, **Development** for each unless noted). Copy values from `.env.local`.

| Var | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (NEXT_PUBLIC_) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | **Production only** — never expose to preview/dev |
| `ANTHROPIC_API_KEY` | Production only |
| `PUBLER_API_KEY` | Production only |
| `PUBLER_WORKSPACE_ID` | All envs |
| `PUBLER_LINKEDIN_ACCOUNT_ID` | All envs |
| `SLACK_WEBHOOK_URL` | Production only |
| `CRON_SECRET` | Production only — Vercel auto-injects this on cron requests |
| `GOOGLE_CSE_CX` | Optional (plagiarism gracefully skips if unset) |
| `GOOGLE_CSE_API_KEY` | Optional, Production only |
| `GENERATION_RUN_DAYS` | `"1,15"` (default) |
| `NEXT_PUBLIC_APP_URL` | After first deploy, set to actual `https://<project>.vercel.app` URL |
| `DEV_MODE` | **`true` for first deploy** — short-circuits Publer API calls so first run is safe. Flip to `false` when you're ready for real LinkedIn posts. |

**DO NOT set** `SUPABASE_DB_URL` on Vercel — it's only for local migrations via CLI.

## 2 · Verify build succeeded

After push triggers auto-deploy, watch:
- **Vercel Deployments tab** — look for the deployment with commit `f2cabf6` → status should reach "Ready"
- If it fails again, the error in Build Logs will be a real issue (TS/runtime), not lint noise

## 3 · Verify integrations live

```bash
curl -s https://<your-vercel-url>/api/health | jq .
```

Expected: `{"status":"ok","checks":[...]}` with all checks `"ok": true`.

Any `"ok": false` means an env var is missing on Vercel — go back to step 1.

## 4 · Verify cron schedules registered

Vercel Project → **Settings** → **Cron Jobs** should show 3 entries:

| Path | Schedule | Reads |
|---|---|---|
| `/api/generate` | `0 16 1,15 * *` | 8 AM PST on 1st & 15th |
| `/api/analytics/sync` | `0 18 * * 1-5` | 10 AM PST weekdays |
| `/api/recycle/scan` | `0 16 20 * *` | 8 AM PST on the 20th |

If no crons appear, redeploy — Vercel sometimes needs a second build to register them.

## 5 · Enable Password Protection

Vercel Project → **Settings** → **Deployment Protection** → **Vercel Authentication** (free) or **Password Protection** (Pro). Toggle on.

This keeps the dashboard private until you're ready to share.

## 6 · First DEV_MODE generation (safe smoke test)

With `DEV_MODE=true`, hit the manual trigger to produce a real batch:

```bash
curl -s -X POST https://<your-vercel-url>/api/generate
```

Returns `{"run_id":"...","status":"in_progress"}` immediately. Generation runs async. After ~2 minutes:

1. Slack `#social-media-agent` should fire `"2 posts ready for review"`
2. Open `/queue` on the deployed URL → see 2 posts with quality indicators
3. Click **Approve** on one → because `DEV_MODE=true`, Publer call is skipped, post is marked `scheduled` with `publer_post_id="dev_mode_skipped"`. No real LinkedIn post fires.

If all three behaviors check out, you're ready to flip `DEV_MODE=false` and approve a real post.

## Auto-debug ladder (if something fails)

| Symptom | First check |
|---|---|
| Build fails | Vercel Build Logs — paste the error |
| `/api/health` returns 503 | Env vars missing on Vercel — recheck step 1 |
| `/api/generate` returns 500 | Vercel Function Logs → /api/generate; usually env or schema |
| No Slack message | `SLACK_WEBHOOK_URL` env var or Slack channel access |
| Approve fails | `PUBLER_LINKEDIN_ACCOUNT_ID` or DEV_MODE not set |
| Cron didn't fire on schedule | Check `CRON_SECRET` matches; check Vercel Cron Logs |

## What's already verified (pre-deploy)

- ✅ Schema: 4 initial tables + audit_log + social_accounts + 11 v2 columns
- ✅ Supabase REST live (200 on `/posts`)
- ✅ Anthropic Opus 4.7 live (200)
- ✅ Slack webhook live (200, message fired during smoke)
- ✅ Publer accounts API live (200, LinkedIn account verified)
- ✅ vercel.json: 3 crons, no legacy `functions` block
- ✅ All route handlers use Next.js 15+ params Promise pattern
- ✅ All env reads scoped inside functions (no top-level throws)
- ✅ Server-only libs never imported by Client Components
- ✅ ESLint cosmetic violations fixed; ignoreDuringBuilds=true as safety net
- ✅ serverExternalPackages: ['@resvg/resvg-js', 'pdf-lib']
- ✅ Anthropic SDK 0.91.0 supports `messages.parse` + `output_config.format` + `effort` + `thinking`
