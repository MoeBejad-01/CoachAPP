-- What the trainee app logs beyond workouts: daily habits, cardio done on its own, and
-- planned sessions the trainee skipped. Mirrors the records in web/src/data/types.ts
-- (DailyLog, CardioSession, SkippedSession) and the ops in web/server/appOps.ts, so the
-- Flutter app, the dashboard and the database all describe the same thing.
--
-- Ids are uuid like everywhere else: the app generates one per record, which doubles as the
-- idempotency key -- resending a queued change from the outbox hits the primary key and is
-- ignored rather than logged twice.

create type cardio_activity as enum ('walk', 'run', 'cycle', 'swim', 'row', 'elliptical', 'stairs', 'hiit', 'sport', 'other');
create type skip_reason as enum ('sick', 'busy', 'travel', 'sore', 'motivation', 'other');

-- ---------- Day-to-day habits ----------

-- One row per trainee per day. The app writes the whole day at once, so the meals it holds
-- stay a single JSON array rather than a table of their own.
create table daily_logs (
  trainee_id uuid not null references trainees (id) on delete cascade,
  date date not null,
  sleep_h numeric(3, 1) check (sleep_h between 0 and 24),
  water_ml integer check (water_ml between 0 and 20000),
  steps integer check (steps between 0 and 200000),
  stress smallint check (stress between 1 and 5),
  soreness smallint check (soreness between 1 and 5),
  -- Muscle groups that feel sore, named as the body map names them.
  soreness_areas text[] not null default '{}' check (array_length(soreness_areas, 1) is null or array_length(soreness_areas, 1) <= 12),
  -- [{id, type: breakfast|lunch|dinner|snack, text, kcal, proteinG}]
  meals jsonb not null default '[]'::jsonb check (jsonb_typeof(meals) = 'array' and jsonb_array_length(meals) <= 30),
  updated_at timestamptz not null default now(),
  primary key (trainee_id, date)
);

-- ---------- Cardio logged on its own ----------

create table cardio_sessions (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references trainees (id) on delete cascade,
  date date not null,
  activity cardio_activity not null,
  -- 1 easy, 2 moderate, 3 hard.
  effort smallint not null default 2 check (effort between 1 and 3),
  minutes smallint not null check (minutes between 0 and 1440),
  distance_km numeric(6, 2) check (distance_km between 0 and 1000),
  kcal integer check (kcal between 0 and 20000),
  avg_hr smallint check (avg_hr between 30 and 250),
  note text not null default '' check (length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index cardio_sessions_trainee_idx on cardio_sessions (trainee_id, date desc);

-- ---------- Skipped sessions ----------

create table skipped_sessions (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references trainees (id) on delete cascade,
  -- The week the session was planned in, and the day it was planned for.
  week_start date not null,
  date date not null,
  day_id text not null,
  day_name text not null,
  reason skip_reason not null,
  note text not null default '' check (length(note) <= 1000),
  at timestamptz not null default now(),
  -- Skipping the same planned day twice replaces the earlier reason.
  unique (trainee_id, week_start, day_id)
);
create index skipped_sessions_trainee_idx on skipped_sessions (trainee_id, week_start);

-- ---------- Training days are flexible ----------

-- Which planned day a session was for, so one trained on another day still counts for it.
alter table workout_logs add column day_id text not null default '';

-- Cardio exercises inside a program log time and distance instead of sets.
alter table log_entries
  add column cardio_minutes smallint check (cardio_minutes between 0 and 1440),
  add column cardio_distance_km numeric(6, 2) check (cardio_distance_km between 0 and 1000),
  add column cardio_kcal integer check (cardio_kcal between 0 and 20000),
  add column cardio_avg_hr smallint check (cardio_avg_hr between 30 and 250);

-- A technique video the coach attaches to an exercise travels inside templates.days /
-- program_weeks.days, which are already jsonb, so nothing to add for it here.

-- ---------- Access rules ----------
-- Same shape as the rest: the coach reaches everything of their own trainees; the trainee
-- writes their own records and reads them back, and never sees anyone else's.

alter table daily_logs enable row level security;
alter table cardio_sessions enable row level security;
alter table skipped_sessions enable row level security;

create policy coach_daily_logs on daily_logs for all to authenticated
  using (public.owns_trainee(trainee_id)) with check (public.owns_trainee(trainee_id));
create policy trainee_daily_logs on daily_logs for all to authenticated
  using (public.is_trainee_self(trainee_id)) with check (public.is_trainee_self(trainee_id));

create policy coach_cardio on cardio_sessions for all to authenticated
  using (public.owns_trainee(trainee_id)) with check (public.owns_trainee(trainee_id));
create policy trainee_cardio on cardio_sessions for all to authenticated
  using (public.is_trainee_self(trainee_id)) with check (public.is_trainee_self(trainee_id));

create policy coach_skips on skipped_sessions for all to authenticated
  using (public.owns_trainee(trainee_id)) with check (public.owns_trainee(trainee_id));
create policy trainee_skips on skipped_sessions for all to authenticated
  using (public.is_trainee_self(trainee_id)) with check (public.is_trainee_self(trainee_id));

create trigger daily_logs_touch before update on daily_logs for each row execute function touch_updated_at();
