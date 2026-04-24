# PatientPartner Social Media Agent

Autonomous LinkedIn content engine with a human-in-the-loop approval gate.
Generates 2 posts bi-monthly (1st + 15th 8 AM PST by default), schedules
approved posts for Tuesday 9 AM / Thursday 10 AM PST via Publer, and tracks
performance from a branded dashboard.

## Architecture

```
[Cron 1st + 15th 8 AM PST] or [Generate Batch button]
        ↓
[Scrape patientpartner.com/resources]  (Cheerio, lib/scraper.ts)
        ↓
[Claude web-search for fresh industry stats]  (lib/stat-finder.ts)
        ↓
[Content engine picks 2 categories + formats]  (lib/content-engine.ts)
        ↓
[Claude Opus 4.7 generates 2 posts with cached 5K voice prompt + Zod output]
        ↓
[Quality gates: compliance → self-review → plagiarism → UTM injection]
        ↓
[Render SVG → PNG (image) / PDF (carousel)]  (lib/image-generator.ts)
        ↓
[Upload to Supabase Storage · insert posts row · audit log]
        ↓
[Slack: "N posts ready for review"]
        ↓
[Dashboard /queue — team reviews + approves (or rejects with feedback)]
        ↓
[Approve → Publer upload + schedule + job poll → status=scheduled]
        ↓
[LinkedIn publishes at Tue 9am / Thu 10am PST]
        ↓
[Daily weekday cron syncs insights from Publer → analytics charts]
        ↓
[Monthly 20th: evergreen scan recycles high-performers with new hook + visual]
```

## Tech stack

| Surface | Tech |
|---------|------|
| Frontend | Next.js 16 · Tailwind v4 · Manrope/Inter · Recharts · Sonner |
| Data | Supabase Postgres + Storage (`post-assets` public bucket) |
| Content | Claude Opus 4.7 · Zod · prompt caching (1h TTL on 5K voice prompt) · adaptive thinking |
| Rendering | `@resvg/resvg-js` (Rust SVG → PNG) · `pdf-lib` (carousel PDFs) |
| Publishing | Publer REST (`Bearer-API` auth · async 202+job_id polling · LinkedIn document carousels) |
| Deploy | Vercel Pro · cron · Password Protection · Edge Config |

## Routes

### Pages (dashboard)
- `/` — Dashboard home (stats, queue count, published count, recent activity)
- `/queue` — Approval queue with SWR polling, batch actions, schedule override, audit trail
- `/calendar` — Month view with status-color dots per day
- `/history` — Filterable table + CSV export
- `/analytics` — Trend charts, best/worst post, per-category breakdown
- `/settings` — Live integration status + manual controls

### API
- `POST /api/generate` — orchestrator (manual or cron)
- `GET  /api/runs/[id]` — poll a generation run
- `GET  /api/posts` — list with filters
- `GET  /api/posts/[id]` — single post + audit trail
- `POST /api/posts/[id]/approve` — approve + Publer schedule
- `POST /api/posts/[id]/reject` — reject + kick off regenerate
- `POST /api/posts/[id]/regenerate` — single-post regen with feedback
- `PATCH /api/posts/[id]/schedule` — override `scheduled_for`
- `POST /api/posts/batch-approve` — approve many
- `POST /api/analytics/sync` — pull Publer insights (cron)
- `GET  /api/analytics/summary` — dashboard + analytics data
- `GET  /api/analytics/calendar?month=YYYY-MM` — calendar bucketed by day
- `GET  /api/audit` — recent action log
- `POST /api/scrape/resources` — manual scrape trigger
- `POST /api/recycle/scan` — evergreen recycle (cron, monthly 20th)
- `POST /api/webhook/generate` — external generate trigger (secured by `WEBHOOK_SECRET`)
- `GET  /api/health` — env + Supabase sanity check

## Prerequisites (one-time)

### 1. Supabase
1. Create project at supabase.com.
2. SQL Editor → paste `supabase/migrations/20260424000000_init.sql` → Run.
3. SQL Editor → paste `supabase/migrations/20260424_v2_scope.sql` → Run.
4. Storage → New bucket → name `post-assets` → **Public** → Save.
5. Copy URL + anon key + service_role key to `.env.local`.

### 2. Publer (Business plan — $21/mo for API access)
1. Settings → API → generate key → copy to `PUBLER_API_KEY`.
2. Copy workspace ID from URL to `PUBLER_WORKSPACE_ID`.
3. `curl -H "Authorization: Bearer-API $PUBLER_API_KEY" -H "Publer-Workspace-Id: $PUBLER_WORKSPACE_ID" https://app.publer.com/api/v1/social_accounts` — find LinkedIn company account → `PUBLER_LINKEDIN_ACCOUNT_ID`.

### 3. Anthropic
- Key from [console.anthropic.com](https://console.anthropic.com) → `ANTHROPIC_API_KEY`.

### 4. Slack incoming webhook
- [api.slack.com/apps](https://api.slack.com/apps) → new app → Incoming Webhooks → add to channel (e.g. `#social-media-agent`) → copy URL → `SLACK_WEBHOOK_URL`.

### 5. Google Programmable Search (optional, for plagiarism spot-check)
- [console.cloud.google.com/apis/library/customsearch.googleapis.com](https://console.cloud.google.com/apis/library/customsearch.googleapis.com) → Enable.
- API key: [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) → `GOOGLE_CSE_API_KEY`.
- Search engine ID: [programmablesearchengine.google.com](https://programmablesearchengine.google.com) → create a "search the entire web" engine → `GOOGLE_CSE_CX`.

### 6. Cron secret
```bash
openssl rand -hex 32   # paste into CRON_SECRET
```

## Environment variables

Copy `.env.local.example` → `.env.local` and fill in:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Publer
PUBLER_API_KEY=
PUBLER_WORKSPACE_ID=
PUBLER_LINKEDIN_ACCOUNT_ID=

# Anthropic
ANTHROPIC_API_KEY=

# Slack
SLACK_WEBHOOK_URL=

# Google CSE (optional — plagiarism check gracefully skips if unset)
GOOGLE_CSE_API_KEY=
GOOGLE_CSE_CX=

# Cron + webhooks
CRON_SECRET=
WEBHOOK_SECRET=

# Cadence
GENERATION_RUN_DAYS=1,15
# CADENCE_LABEL="1st and 15th"

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Dev safety — when true, approve stops before Publer API call
DEV_MODE=true
```

## Running locally

```bash
npm install
npm run dev   # first cold compile is slow (~2-5 min on Next.js 16 + Tailwind v4)
```

Open http://localhost:3000.

## Deployment (Vercel Pro team account)

1. Push the repo to GitHub.
2. Vercel → Import Project → root directory `apps/patientpartner-social-agent`.
3. Environment Variables → paste every row from `.env.local`. Mark `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `PUBLER_API_KEY`, `SLACK_WEBHOOK_URL`, `CRON_SECRET`, `WEBHOOK_SECRET`, `GOOGLE_CSE_API_KEY` as **Sensitive**.
4. **Unset `DEV_MODE` in prod** (or set to `false`).
5. Settings → Deployment Protection → **Password Protection** → on. This gates the whole deployment — no app-level auth needed.
6. Deploy. `vercel.json` registers the 3 crons automatically:
   - `/api/generate` · `0 16 1,15 * *` (1st + 15th at 8 AM PST)
   - `/api/analytics/sync` · `0 18 * * 1-5` (weekdays 10 AM PST)
   - `/api/recycle/scan` · `0 16 20 * *` (20th at 8 AM PST)
7. Verify crons in the Vercel dashboard → Crons tab.

## Dev safety

`DEV_MODE=true` in `.env.local`:
- Approve endpoint stops before Publer API → post flips to `status=scheduled` with `publer_post_id=dev_mode_skipped`.
- Analytics sync returns immediately with `skipped: "dev_mode"`.

Useful for local/preview testing without touching real LinkedIn.

## Brand + content guardrails

- `lib/approved-stats.ts` — 34 approved stats with sources. **Claude must pull from this list — never invent numbers.**
- `lib/constants.ts::VOICE_SYSTEM_PROMPT` — 5K-token deterministic prompt with George Kramb's voice, banned vocabulary, anti-AI writing rules, positioning angles, and competitive wedges. Cached 1h TTL on every generation call.
- Quality gates on every post:
  - Compliance scan (`lib/compliance-checker.ts`) — PHI, off-label claims, fabricated testimonials → auto-block.
  - Self-review (`lib/claude.ts::reviewPost`) — originality score 0-100; <60 triggers one rewrite.
  - Plagiarism (`lib/plagiarism-checker.ts`) — Google-searches 5 unique sentences, flags external matches.
  - UTM injection — every `patientpartner.com` link gets `?utm_source=linkedin&utm_medium=social&utm_campaign=...`.

## Schema

Two migrations in `supabase/migrations/`:
- `20260424000000_init.sql` — posts, generation_runs, content_sources, external_stats + enums + indexes.
- `20260424_v2_scope.sql` — audit_log, social_accounts, quality-gate columns, recycling columns.

See the spec at the end of `brand/` for full rationale.

## What's where

- `lib/` — all business logic (Publer client, Claude client, image generator, compliance, plagiarism, UTM, audit, recycle, scheduler, Slack, storage, scraper, content engine).
- `app/` — pages (6) + API routes (17).
- `components/` — 13 React components, all client-side where interactivity matters.
- `supabase/migrations/` — SQL.
- `templates/` — empty; reserved for future HTML-template extension.
- `brand/` — voice profile, positioning, audience, design tokens, approved stats, image skill.
- `scripts/smoke-images.mjs` — standalone PNG render test that bypasses the Next.js build.
