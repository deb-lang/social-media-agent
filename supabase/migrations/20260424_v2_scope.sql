-- Schema v2 — additive migration for the override spec
-- Adds: audit_log, social_accounts, quality-gate + UTM + recycling columns on posts,
-- verified flag on external_stats. No data loss — only ADD COLUMN / CREATE TABLE.

-- ─── audit_log ─────────────────────────────────────────
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  action text not null, -- 'generate' | 'approve' | 'reject' | 'regenerate' | 'schedule_override' | 'publish' | 'fail' | 'recycle'
  post_id uuid references posts (id) on delete set null,
  performed_by text, -- 'system', 'cron', or user identifier
  details jsonb,
  ip_address text
);
create index if not exists audit_log_post_id_idx on audit_log (post_id);
create index if not exists audit_log_action_idx on audit_log (action);
create index if not exists audit_log_created_at_idx on audit_log (created_at desc);

-- ─── social_accounts ───────────────────────────────────
create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform platform not null,
  account_name text,
  account_id text not null, -- Publer social account ID
  is_active boolean default true,
  created_at timestamptz default now()
);
create index if not exists social_accounts_platform_idx on social_accounts (platform);

-- ─── posts quality-gate + UTM + recycling columns ──────
alter table posts add column if not exists utm_campaign text;
alter table posts add column if not exists stat_verification_note text;
alter table posts add column if not exists originality_score int;
alter table posts add column if not exists plagiarism_flags jsonb;
alter table posts add column if not exists compliance_status text default 'pending'; -- 'pending' | 'pass' | 'flag' | 'block'
alter table posts add column if not exists compliance_issues jsonb;
alter table posts add column if not exists schedule_override boolean default false;
alter table posts add column if not exists published_url text;
alter table posts add column if not exists is_recycled boolean default false;
alter table posts add column if not exists recycled_from_post_id uuid references posts (id) on delete set null;

create index if not exists posts_recycled_from_idx on posts (recycled_from_post_id) where recycled_from_post_id is not null;
create index if not exists posts_compliance_status_idx on posts (compliance_status);

-- ─── external_stats verified flag ──────────────────────
alter table external_stats add column if not exists verified boolean default false;
