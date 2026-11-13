-- Access-rule checks. Run after the migrations and seed on the scratch database.
\set ON_ERROR_STOP off
\pset footer off
\set QUIET on

-- Two coaches and two trainee accounts.
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'coach.a@example.com', now(), '{"role":"coach","name":"Coach A"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'coach.b@example.com', now(), '{"role":"coach","name":"Coach B"}');

-- Coach A loads the demo workspace into their own account.
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.load_demo_data('aaaaaaaa-0000-0000-0000-000000000001');
reset request.jwt.claim.sub;

-- Layla (demo t1) signs up with the email the coach used; Sara (t3) signs up without confirming.
insert into auth.users (id, email, email_confirmed_at) select 'cccccccc-0000-0000-0000-000000000003', email, now() from trainees where first_name = 'Layla';
insert into auth.users (id, email, email_confirmed_at) select 'dddddddd-0000-0000-0000-000000000004', email, null from trainees where first_name = 'Sara';

create temp table results (check_name text, ok boolean, detail text);
grant all on results to authenticated, anon;

-- Helper: run as a signed-in user.
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;

-- ===== Coach A =====
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into results select 'coach A sees own 32 trainees', count(*) = 32, count(*)::text from trainees;
insert into results select 'coach A sees pinned notes', count(*) = 32, count(*)::text from trainee_private;
insert into results select 'coach A sees all workout sets', count(*) > 4000, count(*)::text from log_sets;
do $$ begin
  insert into messages (trainee_id, sender, text) select id, 'trainee', 'fake' from trainees limit 1;
  insert into results values ('coach cannot send as trainee', false, 'insert succeeded');
exception when others then insert into results values ('coach cannot send as trainee', true, sqlerrm); end $$;
do $$ begin
  update messages set text = 'edited' where sender = 'trainee';
  insert into results values ('coach cannot edit message text', false, 'update succeeded');
exception when others then insert into results values ('coach cannot edit message text', true, sqlerrm); end $$;
do $$ declare k int; begin
  update messages set read_by_coach = true where sender = 'trainee'; get diagnostics k = row_count;
  insert into results values ('coach can mark messages read', k > 0, k || ' rows');
end $$;
reset role;

-- ===== Coach B (empty account) =====
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
insert into results select 'coach B sees none of A''s trainees', count(*) = 0, count(*)::text from trainees;
insert into results select 'coach B sees none of A''s logs', count(*) = 0, count(*)::text from workout_logs;
insert into results select 'coach B sees none of A''s templates', count(*) = 0, count(*)::text from templates;
do $$ begin
  insert into goals (trainee_id, label) select id, 'hack' from trainees limit 1; -- sees nothing, so use a known id
  insert into goals (trainee_id, label) values (public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1'), 'hack');
  insert into results values ('coach B cannot write to A''s trainee', false, 'insert succeeded');
exception when others then insert into results values ('coach B cannot write to A''s trainee', true, sqlerrm); end $$;
do $$ begin
  perform public.load_demo_data('aaaaaaaa-0000-0000-0000-000000000001');
  insert into results values ('coach B cannot load data into A''s account', false, 'call succeeded');
exception when others then insert into results values ('coach B cannot load data into A''s account', true, sqlerrm); end $$;
reset role;

-- ===== Trainee Layla =====
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
insert into results select 'Layla claims her profile', public.claim_trainee_profile() = public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1'), 'ok';
insert into results select 'Layla sees only herself', count(*) = 1, count(*)::text from trainees;
insert into results select 'Layla sees her coach', count(*) = 1, count(*)::text from coaches;
insert into results select 'Layla cannot see pinned notes', count(*) = 0, count(*)::text from trainee_private;
insert into results select 'Layla cannot see templates', count(*) = 0, count(*)::text from templates;
insert into results select 'Layla sees only shared notes', bool_and(shared) and count(*) > 0, count(*)::text from notes;
insert into results select 'Layla sees only her own logs', count(distinct trainee_id) = 1, count(*)::text || ' logs' from workout_logs;
insert into results select 'Layla sees her program weeks', count(*) = 12, count(*)::text from program_weeks;
insert into results select 'Layla sees no focus blocks or others'' calls', bool_and(trainee_id is not null), count(*)::text from calls;
do $$ declare l uuid; e uuid; begin
  insert into workout_logs (trainee_id, date, day_name, duration_min, rpe) values (public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1'), current_date, 'Upper A', 55, 8) returning id into l;
  insert into log_entries (log_id, exercise_name) values (l, 'Bench press') returning id into e;
  insert into log_sets (entry_id, weight_kg, reps) values (e, 60, 8);
  insert into results values ('Layla logs her own workout', true, 'ok');
exception when others then insert into results values ('Layla logs her own workout', false, sqlerrm); end $$;
do $$ begin
  insert into workout_logs (trainee_id, date, day_name) values (public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't2'), current_date, 'Fake');
  insert into results values ('Layla cannot log for another trainee', false, 'insert succeeded');
exception when others then insert into results values ('Layla cannot log for another trainee', true, sqlerrm); end $$;
do $$ begin
  insert into messages (trainee_id, sender, text) values (public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1'), 'coach', 'fake coach');
  insert into results values ('Layla cannot send as coach', false, 'insert succeeded');
exception when others then insert into results values ('Layla cannot send as coach', true, sqlerrm); end $$;
do $$ begin
  insert into messages (trainee_id, sender, text) values (public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1'), 'trainee', 'Hi coach');
  insert into results values ('Layla can message her coach', true, 'ok');
exception when others then insert into results values ('Layla can message her coach', false, sqlerrm); end $$;
do $$ begin
  update trainees set tier = 'elite';
  insert into results values ('Layla cannot change her own plan', (select tier from trainees) <> 'elite', 'no rows changed');
exception when others then insert into results values ('Layla cannot change her own plan', true, sqlerrm); end $$;
do $$ begin
  perform public.mark_coach_messages_seen(public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1'));
  insert into results values ('Layla marks coach messages seen', true, 'ok');
exception when others then insert into results values ('Layla marks coach messages seen', false, sqlerrm); end $$;
do $$ begin
  insert into inbody_scans (trainee_id, date, weight_kg, muscle_kg, fat_pct, source) values (public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1'), current_date, 58.4, 26.9, 21.5, 'trainee');
  insert into results select 'Layla''s upload closes her InBody request', not exists (select 1 from inbody_requests where status = 'pending'), 'ok';
exception when others then insert into results values ('Layla''s upload closes her InBody request', false, sqlerrm); end $$;
insert into results select 'storage: Layla reaches only her folder', public.can_read_trainee(public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1')) and not public.can_read_trainee(public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't2')), 'ok';
reset role;

-- ===== Unconfirmed sign-up (Sara) =====
select pg_temp.as_user('dddddddd-0000-0000-0000-000000000004');
insert into results select 'unconfirmed email cannot claim a profile', public.claim_trainee_profile() is null, 'ok';
insert into results select 'unconfirmed user sees no trainees', count(*) = 0, count(*)::text from trainees;
reset role;

-- ===== Anonymous =====
set role anon;
do $$ begin
  perform count(*) from trainees;
  insert into results select 'anonymous sees nothing', (select count(*) from trainees) = 0, 'ok';
exception when others then insert into results values ('anonymous sees nothing', true, sqlerrm); end $$;
reset role;


-- ===== Coach pages & join requests =====

-- A visitor who signed up on the public site, and a second coach with an unpublished page.
insert into auth.users (id, email, email_confirmed_at) values
  ('eeeeeeee-0000-0000-0000-000000000005', 'visitor@example.com', now());

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into coach_pages (coach_id, handle, published, whatsapp)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'omar', true, '966500000001');
reset role;
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
insert into coach_pages (coach_id, handle, published) values ('bbbbbbbb-0000-0000-0000-000000000002', 'coach-b', false);
reset role;

do $$ begin
  insert into coach_pages (coach_id, handle) values ('bbbbbbbb-0000-0000-0000-000000000002', 'Login');
  insert into results values ('a reserved or mixed-case handle is refused', false, 'insert succeeded');
exception when others then insert into results values ('a reserved or mixed-case handle is refused', true, sqlerrm); end $$;

-- ----- Anonymous visitor on the public site -----
set role anon;
insert into results select 'anonymous reads the published page', count(*) = 1, count(*)::text from coach_pages where handle = 'omar';
insert into results select 'anonymous cannot read an unpublished page', count(*) = 0, count(*)::text from coach_pages where handle = 'coach-b';
insert into results select 'anonymous reads no join requests', count(*) = 0, count(*)::text from join_requests;
do $$ begin
  insert into join_requests (coach_id, name, email) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Walk-in', 'walkin@example.com');
  insert into results values ('anonymous cannot send a join request', false, 'insert succeeded');
exception when others then insert into results values ('anonymous cannot send a join request', true, sqlerrm); end $$;
reset role;

-- ----- The visitor sends a request -----
select pg_temp.as_user('eeeeeeee-0000-0000-0000-000000000005');
do $$ begin
  insert into join_requests (coach_id, user_id, name, email, phone, plan_id, answers)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000005',
          'Noura Al-Faris', 'visitor@example.com', '966500000009', 'premium',
          '{"birthDate":"1996-04-12","heightCm":165,"goal":"fatloss","days":[0,2,4],"painNotes":"Left knee after running","medications":""}'::jsonb);
  insert into results values ('visitor sends a join request', true, 'ok');
exception when others then insert into results values ('visitor sends a join request', false, sqlerrm); end $$;
do $$ begin
  insert into join_requests (coach_id, user_id, name, email)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000005', 'Noura again', 'visitor@example.com');
  insert into results values ('a second pending request is refused', false, 'insert succeeded');
exception when others then insert into results values ('a second pending request is refused', true, sqlerrm); end $$;
do $$ begin
  insert into join_requests (coach_id, user_id, name, email)
  values ('bbbbbbbb-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000005', 'Noura', 'visitor@example.com');
  insert into results values ('cannot send to a coach with no published page', false, 'insert succeeded');
exception when others then insert into results values ('cannot send to a coach with no published page', true, sqlerrm); end $$;
do $$ begin
  insert into join_requests (coach_id, user_id, name, email)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 'Not me', 'other@example.com');
  insert into results values ('cannot send a request as someone else', false, 'insert succeeded');
exception when others then insert into results values ('cannot send a request as someone else', true, sqlerrm); end $$;
do $$ begin
  perform public.approve_join_request((select id from join_requests limit 1));
  insert into results values ('visitor cannot approve their own request', false, 'approve succeeded');
exception when others then insert into results values ('visitor cannot approve their own request', true, sqlerrm); end $$;
insert into results select 'visitor sees only their own request', count(*) = 1, count(*)::text from join_requests;
insert into results select 'visitor sees no trainees yet', count(*) = 0, count(*)::text from trainees;
reset role;

-- ----- The other coach -----
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
insert into results select 'another coach sees no requests', count(*) = 0, count(*)::text from join_requests;
do $$ begin
  perform public.approve_join_request((select id from join_requests where coach_id = 'aaaaaaaa-0000-0000-0000-000000000001' limit 1));
  insert into results values ('another coach cannot approve the request', false, 'approve succeeded');
exception when others then insert into results values ('another coach cannot approve the request', true, sqlerrm); end $$;
reset role;

-- ----- Coach A approves -----
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into results select 'coach sees the pending request', count(*) = 1, count(*)::text from join_requests where status = 'pending';
do $$ declare t uuid; begin
  select public.approve_join_request(
    (select id from join_requests where status = 'pending'), 'premium', 'Premium online coaching', 899, 'monthly') into t;
  insert into results select 'approving creates the trainee', count(*) = 1, count(*)::text from trainees where id = t;
  insert into results select 'the trainee is linked to the visitor account', count(*) = 1, count(*)::text
    from trainees where id = t and user_id = 'eeeeeeee-0000-0000-0000-000000000005';
  insert into results select 'intake answers carried over', first_name = 'Noura' and last_name = 'Al-Faris'
    and goal_type = 'fatloss' and height_cm = 165 and frequency = 3 and status = 'onboarding',
    first_name || ' / ' || goal_type || ' / ' || frequency::text from trainees where id = t;
  insert into results select 'the plan is set from the dashboard''s price list', price_sar = 899, price_sar::text from memberships where trainee_id = t;
  insert into results select 'the request is marked approved', status = 'approved' and trainee_id = t, status::text from join_requests where trainee_id = t;
exception when others then insert into results values ('approving creates the trainee', false, sqlerrm); end $$;
do $$ begin
  perform public.approve_join_request((select id from join_requests where status = 'approved' limit 1));
  insert into results values ('an approved request cannot be approved twice', false, 'approve succeeded');
exception when others then insert into results values ('an approved request cannot be approved twice', true, sqlerrm); end $$;
insert into results select 'coach A now has 33 trainees', count(*) = 33, count(*)::text from trainees;
reset role;


-- ===== Trainee app: habits, cardio and skips =====

select pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
do $$ declare me uuid := public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1'); begin
  insert into daily_logs (trainee_id, date, sleep_h, water_ml, steps, stress, soreness, soreness_areas, meals)
  values (me, current_date, 7.5, 2400, 9120, 2, 3, '{quads,glutes}',
          '[{"id":"m1","type":"breakfast","text":"Eggs and oats","kcal":520,"proteinG":34}]'::jsonb);
  insert into cardio_sessions (trainee_id, date, activity, effort, minutes, distance_km, avg_hr)
  values (me, current_date, 'run', 2, 32, 5.4, 148);
  insert into skipped_sessions (trainee_id, week_start, date, day_id, day_name, reason, note)
  values (me, date_trunc('week', current_date)::date, current_date, 'd3', 'Upper B', 'sick', 'Sore throat');
  insert into results values ('Layla logs habits, cardio and a skip', true, 'ok');
exception when others then insert into results values ('Layla logs habits, cardio and a skip', false, sqlerrm); end $$;
do $$ declare other uuid := public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't2'); begin
  insert into cardio_sessions (trainee_id, date, activity, minutes) values (other, current_date, 'walk', 20);
  insert into results values ('Layla cannot log cardio for someone else', false, 'insert succeeded');
exception when others then insert into results values ('Layla cannot log cardio for someone else', true, sqlerrm); end $$;
do $$ declare me uuid := public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1'); begin
  insert into skipped_sessions (trainee_id, week_start, date, day_id, day_name, reason)
  values (me, date_trunc('week', current_date)::date, current_date, 'd3', 'Upper B', 'busy');
  insert into results values ('skipping the same day twice is refused', false, 'insert succeeded');
exception when others then insert into results values ('skipping the same day twice is refused', true, sqlerrm); end $$;
do $$ declare me uuid := public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1'); begin
  insert into cardio_sessions (trainee_id, date, activity, minutes, avg_hr) values (me, current_date, 'row', 20, 400);
  insert into results values ('a nonsense heart rate is refused', false, 'insert succeeded');
exception when others then insert into results values ('a nonsense heart rate is refused', true, sqlerrm); end $$;
insert into results select 'Layla sees only her own habit days', count(*) = 1, count(*)::text from daily_logs;
insert into results select 'Layla sees only her own cardio', count(*) = 1, count(*)::text from cardio_sessions;
reset role;

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into results select 'coach sees the habit day', count(*) = 1, count(*)::text from daily_logs;
insert into results select 'coach sees the cardio session', count(*) = 1, count(*)::text from cardio_sessions;
insert into results select 'coach sees the skipped session', count(*) = 1, count(*)::text from skipped_sessions;
insert into results select 'the meal survived the round trip', meals -> 0 ->> 'text' = 'Eggs and oats', meals -> 0 ->> 'text' from daily_logs limit 1;
reset role;

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
insert into results select 'another coach sees no habits or cardio', (select count(*) from daily_logs) + (select count(*) from cardio_sessions) + (select count(*) from skipped_sessions) = 0, 'ok';
reset role;

set role anon;
insert into results select 'anonymous sees no trainee app data', (select count(*) from daily_logs) + (select count(*) from cardio_sessions) = 0, 'ok';
reset role;


-- ===== The trainee app's read contract =====
-- The Flutter app talks to PostgREST directly, so everything its old /api/app/me snapshot
-- returned has to be reachable by the signed-in trainee -- and nothing more. One failure here
-- is a screen that comes up empty, or data leaking to the wrong person.

select pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');

-- Reachable: every table a screen reads.
insert into results select 'app reads her coach', count(*) = 1, count(*)::text from coaches;
insert into results select 'app reads her own profile only', count(*) = 1, count(*)::text from trainees;
insert into results select 'app reads her goals', count(*) > 0, count(*)::text from goals;
insert into results select 'app reads her membership', count(*) = 1, count(*)::text from memberships;
insert into results select 'app reads her program', count(*) = 1, count(*)::text from programs;
insert into results select 'app reads her program weeks', count(*) = 12, count(*)::text from program_weeks;
insert into results select 'app reads her workout logs', count(*) > 0, count(*)::text from workout_logs;
insert into results select 'app reads the sets inside them', count(*) > 0, count(*)::text from log_sets;
insert into results select 'app reads her weigh-ins', count(*) > 0, count(*)::text from weights;
insert into results select 'app reads her check-ins', count(*) > 0, count(*)::text from checkins;
insert into results select 'app reads her InBody scans', count(*) > 0, count(*)::text from inbody_scans;
insert into results select 'app reads her InBody requests', count(*) >= 0, count(*)::text from inbody_requests;
insert into results select 'app reads the coach chat', count(*) > 0, count(*)::text from messages;
insert into results select 'app reads her booked calls', count(*) > 0, count(*)::text from calls;
insert into results select 'app reads her habit days', count(*) = 1, count(*)::text from daily_logs;
insert into results select 'app reads her cardio', count(*) = 1, count(*)::text from cardio_sessions;
insert into results select 'app reads her skips', count(*) = 1, count(*)::text from skipped_sessions;
insert into results select 'app reads metric values', count(*) >= 0, count(*)::text from metric_entries;

-- Out of reach: coach-only tables, and anything belonging to someone else.
insert into results select 'app never reads pinned notes', count(*) = 0, count(*)::text from trainee_private;
insert into results select 'app never reads the template library', count(*) = 0, count(*)::text from templates;
insert into results select 'app never reads import layouts', count(*) = 0, count(*)::text from import_layouts;
insert into results select 'app never reads join requests', count(*) = 0, count(*)::text from join_requests;
insert into results select 'app never reads private notes', count(*) = 0, count(*)::text from notes where not shared;
insert into results select 'app never reads focus blocks', count(*) = 0, count(*)::text from calls where trainee_id is null;

-- Writable: what the app's outbox sends. Re-sending the same row is ignored, not duplicated.
do $$ declare me uuid := public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1'); fixed uuid := '11111111-2222-3333-4444-555555555555'; begin
  insert into cardio_sessions (id, trainee_id, date, activity, effort, minutes) values (fixed, me, current_date, 'cycle', 2, 40);
  insert into cardio_sessions (id, trainee_id, date, activity, effort, minutes) values (fixed, me, current_date, 'cycle', 2, 40)
    on conflict (id) do nothing;
  insert into results select 'a resent outbox change is not logged twice', count(*) = 1, count(*)::text from cardio_sessions where id = fixed;
exception when others then insert into results values ('a resent outbox change is not logged twice', false, sqlerrm); end $$;
do $$ declare me uuid := public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1'); begin
  insert into daily_logs (trainee_id, date, steps) values (me, current_date - 1, 6000)
    on conflict (trainee_id, date) do update set steps = excluded.steps;
  insert into results values ('the app can correct an earlier habit day', true, 'ok');
exception when others then insert into results values ('the app can correct an earlier habit day', false, sqlerrm); end $$;
do $$ begin
  update trainees set tier = 'elite' where user_id = (select auth.uid());
  insert into results select 'the app cannot upgrade her own plan', count(*) = 0, count(*)::text from trainees where tier = 'elite' and user_id = (select auth.uid());
exception when others then insert into results values ('the app cannot upgrade her own plan', true, sqlerrm); end $$;

-- InBody photos go to the private bucket, under her own folder and no one else's.
insert into results select 'app may upload to her own InBody folder',
  public.can_read_trainee(public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1')), 'ok';
insert into results select 'app may not upload to another folder',
  not public.can_read_trainee(public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't2')), 'ok';
reset role;


-- ===== The chat, end to end =====
-- One conversation the whole way through: the coach writes, the phone shows it and marks it
-- seen, the trainee replies, the coach reads it. Both sides use the same `messages` table, so
-- the flags are the only thing saying who has caught up.

-- The coach writes first.
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
do $$ declare me uuid := public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1'); begin
  insert into messages (trainee_id, sender, text) values (me, 'coach', 'Great session yesterday. How did the knee feel?');
  insert into results values ('coach sends a message', true, 'ok');
exception when others then insert into results values ('coach sends a message', false, sqlerrm); end $$;
insert into results select 'it starts unseen by the trainee', not seen_by_trainee, seen_by_trainee::text
  from messages where sender = 'coach' order by created_at desc limit 1;
reset role;

-- The phone opens the Coach tab.
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
insert into results select 'the trainee receives it', count(*) = 1, count(*)::text
  from messages where sender = 'coach' and text like 'Great session yesterday%';
select public.mark_coach_messages_seen(public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1'));
insert into results select 'opening the chat marks it seen', count(*) = 0, count(*)::text
  from messages where sender = 'coach' and not seen_by_trainee;

-- She replies.
do $$ declare me uuid := public._demo_id('aaaaaaaa-0000-0000-0000-000000000001', 't1'); begin
  insert into messages (trainee_id, sender, text) values (me, 'trainee', 'Much better, no pain on the squats.');
  insert into results values ('the trainee replies', true, 'ok');
exception when others then insert into results values ('the trainee replies', false, sqlerrm); end $$;
insert into results select 'her reply starts unread by the coach', not read_by_coach, read_by_coach::text
  from messages where sender = 'trainee' and text like 'Much better%';
-- No trainee UPDATE policy exists, so this changes no rows rather than raising.
do $$ declare n int; begin
  update messages set read_by_coach = true where sender = 'trainee' and text like 'Much better%';
  get diagnostics n = row_count;
  insert into results values ('the trainee cannot mark her own as read', n = 0, n || ' rows changed');
end $$;
insert into results select 'her reply is still unread after she tried', not read_by_coach, read_by_coach::text
  from messages where sender = 'trainee' and text like 'Much better%';
do $$ begin
  update messages set text = 'edited' where sender = 'trainee' and text like 'Much better%';
  insert into results values ('the trainee cannot edit a sent message', false, 'update succeeded');
exception when others then insert into results values ('the trainee cannot edit a sent message', true, sqlerrm); end $$;
insert into results select 'she sees the whole thread, hers and his', count(*) >= 2, count(*)::text
  from messages where text like 'Great session yesterday%' or text like 'Much better%';
reset role;

-- The coach reads it.
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into results select 'the coach sees her reply', count(*) = 1, count(*)::text
  from messages where sender = 'trainee' and text like 'Much better%';
do $$ begin
  update messages set read_by_coach = true where sender = 'trainee' and text like 'Much better%';
  insert into results select 'the coach marks it read', count(*) = 0, count(*)::text
    from messages where sender = 'trainee' and text like 'Much better%' and not read_by_coach;
exception when others then insert into results values ('the coach marks it read', false, sqlerrm); end $$;
insert into results select 'the coach knows she saw his', seen_by_trainee, seen_by_trainee::text
  from messages where sender = 'coach' and text like 'Great session yesterday%';
reset role;

-- Nobody else is in the room.
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
insert into results select 'another coach sees none of the thread', count(*) = 0, count(*)::text
  from messages where text like 'Much better%' or text like 'Great session yesterday%';
reset role;
set role anon;
insert into results select 'the chat is closed to anonymous', count(*) = 0, count(*)::text from messages;
reset role;

\pset format aligned
select case when ok then 'PASS' else 'FAIL' end as result, check_name, left(detail, 60) as detail from results;
select count(*) filter (where ok) || ' passed, ' || count(*) filter (where not ok) || ' failed' as summary from results;
