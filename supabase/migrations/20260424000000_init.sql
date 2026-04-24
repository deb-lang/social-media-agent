-- PatientPartner Social Media Agent — initial schema
-- Run with `supabase db push` or paste into Supabase SQL editor.

create type content_category as enum (
  'stat_post',
  'thought_leadership',
  'missing_middle',
  'lead_magnet',
  'perfectpatient'
);

create type post_format as enum ('image', 'carousel');

create type post_status as enum (
  'pending_review',
  'approved',
  'rejected',
  'scheduled',
  'published',
  'failed'
);

create type platform as enum ('linkedin', 'twitter', 'facebook');

create table posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  category content_category not null,
  format post_format not null,
  caption text not null,
  hashtags text[] not null,

  stat_value text,
  stat_source text,
  stat_url text,
  stat_verified boolean default false,

  lead_magnet_title text,
  lead_magnet_url text,

  image_url text,
  carousel_pdf_url text,
  carousel_slide_previews jsonb,

  status post_status default 'pending_review',
  rejection_feedback text,
  rejection_count int default 0,
  approved_at timestamptz,
  approved_by text,

  scheduled_for timestamptz,
  platform platform default 'linkedin',

  publer_post_id text,
  publer_job_id text,
  published_at timestamptz,

  impressions int,
  engagement_rate decimal(5, 2),
  likes int,
  comments int,
  shares int,
  link_clicks int,
  follower_delta int,
  analytics_updated_at timestamptz,

  generation_run_id uuid
);

create index posts_status_idx on posts (status);
create index posts_scheduled_for_idx on posts (scheduled_for);
create index posts_category_idx on posts (category);
create index posts_created_at_idx on posts (created_at desc);
create index posts_publer_post_id_idx on posts (publer_post_id) where publer_post_id is not null;

create table generation_runs (
  id uuid primary key default gen_random_uuid(),
  triggered_at timestamptz default now(),
  trigger_type text not null,
  posts_generated int default 0,
  status text default 'in_progress',
  error_message text,
  completed_at timestamptz
);

create index generation_runs_triggered_at_idx on generation_runs (triggered_at desc);

alter table posts
  add constraint posts_generation_run_fk
  foreign key (generation_run_id) references generation_runs (id) on delete set null;

create table content_sources (
  id uuid primary key default gen_random_uuid(),
  scraped_at timestamptz default now(),
  source_url text not null unique,
  title text,
  description text,
  content_type text,
  published_date date,
  raw_content text
);

create index content_sources_content_type_idx on content_sources (content_type);

create table external_stats (
  id uuid primary key default gen_random_uuid(),
  found_at timestamptz default now(),
  stat_value text not null,
  stat_context text not null,
  source_name text not null,
  source_url text,
  publication_date date,
  topic_tags text[],
  used_in_post_id uuid references posts (id) on delete set null,
  used_at timestamptz
);

create index external_stats_used_in_post_idx on external_stats (used_in_post_id);
create index external_stats_topic_tags_idx on external_stats using gin (topic_tags);

create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger posts_updated_at before update on posts
  for each row execute function touch_updated_at();
