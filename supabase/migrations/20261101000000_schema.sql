-- Coach HQ schema: online coaching (coaches, trainees, weekly programs, logs, check-ins, InBody, chat).
-- Every row belongs to a coach, directly or through a trainee, so the platform can host many coaches.
-- Money is in SAR. Dates are local calendar dates; timestamps are timestamptz.

create extension if not exists pgcrypto;

-- ---------- Enums ----------

create type plan_tier as enum ('essential', 'premium', 'elite');
create type trainee_status as enum ('onboarding', 'active', 'paused', 'inactive');
create type goal_type as enum ('muscle', 'strength', 'fatloss', 'sport', 'rehab', 'health');
create type billing_cycle as enum ('monthly', 'quarterly');
create type message_sender as enum ('coach', 'trainee');
create type call_kind as enum ('video', 'voice', 'focus');
create type request_status as enum ('pending', 'done', 'cancelled');
create type entry_source as enum ('trainee', 'coach');

-- ---------- Coaches ----------

-- One row per coach account; id is the Supabase auth user id.
create table coaches (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  title text not null default 'Head coach',
  email text not null default '',
  business_name text not null default 'Coach HQ',
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  -- Dashboard preferences that are only ever read and written as a whole.
  trainee_layout jsonb not null default '{}'::jsonb,
  widgets jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Trainees ----------

create table trainees (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches (id) on delete cascade,
  -- Set once the trainee signs in to the app (see claim_trainee_profile()).
  user_id uuid unique references auth.users (id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null default '',
  birth_date date,
  height_cm smallint check (height_cm between 80 and 250),
  tier plan_tier not null default 'essential',
  status trainee_status not null default 'onboarding',
  goal_type goal_type not null default 'health',
  injuries text not null default '',
  frequency smallint not null default 3 check (frequency between 1 and 7),
  checkin_day smallint not null default 0 check (checkin_day between 0 and 6), -- 0 = Sunday
  tone smallint not null default 0,
  joined_at date not null default current_date,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index trainees_coach_idx on trainees (coach_id);
create unique index trainees_coach_email_idx on trainees (coach_id, lower(email));

-- Coach-only fields kept apart so trainee access to `trainees` can never expose them.
create table trainee_private (
  trainee_id uuid primary key references trainees (id) on delete cascade,
  pinned_note text not null default ''
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references trainees (id) on delete cascade,
  position smallint not null default 0,
  label text not null,
  unit text not null default '',
  start_value numeric(10, 2) not null default 0,
  current_value numeric(10, 2) not null default 0,
  target_value numeric(10, 2) not null default 0
);
create index goals_trainee_idx on goals (trainee_id);

create table memberships (
  trainee_id uuid primary key references trainees (id) on delete cascade,
  plan text not null,
  price_sar numeric(10, 2) not null check (price_sar >= 0),
  cycle billing_cycle not null default 'monthly',
  renews_on date not null,
  paid boolean not null default false
);

-- ---------- Templates & programs ----------

create table templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches (id) on delete cascade,
  name text not null,
  summary text not null default '',
  tags text[] not null default '{}',
  weeks smallint not null default 8 check (weeks between 1 and 52),
  load_method text not null default 'RPE + kg target',
  progression text not null default 'Double progression',
  -- [{id, name, exercises: [{id, name, sets, reps, intensity, rest, cue}]}]; edited as a whole.
  days jsonb not null default '[]'::jsonb check (jsonb_typeof(days) = 'array'),
  -- Nutrition, recovery, cardio and instructions (ProgramGuide in the app).
  guide jsonb not null default '{}'::jsonb check (jsonb_typeof(guide) = 'object'),
  updated_at timestamptz not null default now()
);
create index templates_coach_idx on templates (coach_id);

-- A trainee's current program: their own copy of a template, laid out week by week.
create table programs (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null unique references trainees (id) on delete cascade,
  template_id uuid references templates (id) on delete set null,
  name text not null,
  start_date date not null,
  guide jsonb check (guide is null or jsonb_typeof(guide) = 'object'),
  updated_at timestamptz not null default now()
);

create table program_weeks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id) on delete cascade,
  week_index smallint not null check (week_index >= 0),
  body_weight_kg numeric(5, 1),
  sleep_h numeric(3, 1),
  calories integer,
  protein_g integer,
  steps integer,
  focus text not null default '',
  days jsonb not null default '[]'::jsonb check (jsonb_typeof(days) = 'array'),
  unique (program_id, week_index)
);

-- ---------- Training logs ----------

create table workout_logs (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references trainees (id) on delete cascade,
  date date not null,
  day_name text not null,
  duration_min smallint not null default 0,
  rpe smallint check (rpe between 1 and 10),
  created_at timestamptz not null default now()
);
create index workout_logs_trainee_date_idx on workout_logs (trainee_id, date);

create table log_entries (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references workout_logs (id) on delete cascade,
  position smallint not null default 0,
  exercise_id text not null default '',
  exercise_name text not null,
  pain boolean not null default false,
  note text not null default ''
);
create index log_entries_log_idx on log_entries (log_id);
create index log_entries_exercise_idx on log_entries (exercise_name);

create table log_sets (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references log_entries (id) on delete cascade,
  position smallint not null default 0,
  weight_kg numeric(6, 2) not null default 0, -- 0 = bodyweight
  reps smallint not null check (reps >= 0)
);
create index log_sets_entry_idx on log_sets (entry_id);

-- ---------- Body & check-ins ----------

create table weights (
  trainee_id uuid not null references trainees (id) on delete cascade,
  date date not null,
  kg numeric(5, 1) not null check (kg > 0),
  primary key (trainee_id, date)
);

create table checkins (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references trainees (id) on delete cascade,
  date date not null,
  weight_kg numeric(5, 1),
  sleep_h numeric(3, 1),
  energy smallint check (energy between 1 and 5),
  stress smallint check (stress between 1 and 5),
  soreness smallint check (soreness between 1 and 5),
  comment text not null default '',
  unique (trainee_id, date)
);

create table inbody_scans (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references trainees (id) on delete cascade,
  date date not null,
  weight_kg numeric(5, 1),
  muscle_kg numeric(5, 1),
  fat_kg numeric(5, 1),
  fat_pct numeric(4, 1),
  bmi numeric(4, 1),
  visceral smallint,
  bmr integer,
  water_l numeric(4, 1),
  score smallint,
  -- Path in the private "inbody" storage bucket: {trainee_id}/{file}
  file_path text,
  file_name text,
  source entry_source not null default 'trainee',
  created_at timestamptz not null default now()
);
create index inbody_scans_trainee_idx on inbody_scans (trainee_id, date);

create table inbody_requests (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references trainees (id) on delete cascade,
  requested_at timestamptz not null default now(),
  note text not null default '',
  status request_status not null default 'pending',
  scan_id uuid references inbody_scans (id) on delete set null
);
create index inbody_requests_trainee_idx on inbody_requests (trainee_id, status);

-- Values for coach-built "new metric" cards (card ids live in the coach's trainee_layout).
create table metric_entries (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references trainees (id) on delete cascade,
  card_id text not null,
  date date not null,
  value numeric(10, 2) not null,
  source entry_source not null default 'coach'
);
create index metric_entries_trainee_idx on metric_entries (trainee_id, card_id);

-- ---------- Communication ----------

create table notes (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references trainees (id) on delete cascade,
  text text not null,
  shared boolean not null default true, -- false = private to the coach
  created_at timestamptz not null default now()
);
create index notes_trainee_idx on notes (trainee_id, created_at desc);

create table messages (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references trainees (id) on delete cascade,
  sender message_sender not null,
  text text not null check (length(text) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_by_coach boolean not null default false,   -- trainee messages
  seen_by_trainee boolean not null default false  -- coach messages
);
create index messages_trainee_idx on messages (trainee_id, created_at);

-- Coaching calls (video / voice) and the coach's own focus blocks (no trainee).
create table calls (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches (id) on delete cascade,
  trainee_id uuid references trainees (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  duration_min smallint not null default 30 check (duration_min > 0),
  kind call_kind not null default 'video',
  check (kind = 'focus' or trainee_id is not null)
);
create index calls_coach_time_idx on calls (coach_id, starts_at);

-- Spreadsheet column layouts a coach saved from training imports.
create table import_layouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches (id) on delete cascade,
  name text not null,
  signature text not null,
  header_row smallint not null,
  roles text[] not null,
  split text not null check (split in ('column', 'sheets', 'titles')),
  unique (coach_id, signature)
);

-- ---------- Housekeeping ----------

create function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger templates_touch before update on templates for each row execute function touch_updated_at();
create trigger programs_touch before update on programs for each row execute function touch_updated_at();
