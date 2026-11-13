-- Row Level Security: a coach reaches only their own trainees and everything under them;
-- a trainee reaches only their own data, and only the notes their coach marked as shared.

-- ---------- Helpers ----------
-- security definer so policies can look up trainees without recursing through trainees' own policies.

create function public.owns_trainee(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from trainees where id = t and coach_id = (select auth.uid()));
$$;

create function public.is_trainee_self(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from trainees where id = t and user_id = (select auth.uid()));
$$;

create function public.can_read_trainee(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.owns_trainee(t) or public.is_trainee_self(t);
$$;

create function public.log_trainee(l uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select trainee_id from workout_logs where id = l;
$$;

create function public.entry_trainee(e uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select w.trainee_id from log_entries le join workout_logs w on w.id = le.log_id where le.id = e;
$$;

-- ---------- Enable RLS everywhere ----------

alter table coaches enable row level security;
alter table trainees enable row level security;
alter table trainee_private enable row level security;
alter table goals enable row level security;
alter table memberships enable row level security;
alter table templates enable row level security;
alter table programs enable row level security;
alter table program_weeks enable row level security;
alter table workout_logs enable row level security;
alter table log_entries enable row level security;
alter table log_sets enable row level security;
alter table weights enable row level security;
alter table checkins enable row level security;
alter table inbody_scans enable row level security;
alter table inbody_requests enable row level security;
alter table metric_entries enable row level security;
alter table notes enable row level security;
alter table messages enable row level security;
alter table calls enable row level security;
alter table import_layouts enable row level security;

-- ---------- Coaches ----------

create policy coach_self on coaches for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Trainees can read their own coach (name and title appear in the app).
create policy trainee_reads_coach on coaches for select to authenticated
  using (exists (select 1 from trainees t where t.coach_id = coaches.id and t.user_id = (select auth.uid())));

-- ---------- Trainees ----------

create policy coach_trainees on trainees for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy trainee_self_read on trainees for select to authenticated
  using (user_id = (select auth.uid()));

create policy coach_private on trainee_private for all to authenticated
  using (public.owns_trainee(trainee_id)) with check (public.owns_trainee(trainee_id));

-- ---------- Coach-managed, trainee-readable ----------
-- goals, memberships, programs, program weeks, calls

create policy coach_goals on goals for all to authenticated using (public.owns_trainee(trainee_id)) with check (public.owns_trainee(trainee_id));
create policy trainee_goals on goals for select to authenticated using (public.is_trainee_self(trainee_id));

create policy coach_memberships on memberships for all to authenticated using (public.owns_trainee(trainee_id)) with check (public.owns_trainee(trainee_id));
create policy trainee_memberships on memberships for select to authenticated using (public.is_trainee_self(trainee_id));

create policy coach_programs on programs for all to authenticated using (public.owns_trainee(trainee_id)) with check (public.owns_trainee(trainee_id));
create policy trainee_programs on programs for select to authenticated using (public.is_trainee_self(trainee_id));

create policy coach_program_weeks on program_weeks for all to authenticated
  using (exists (select 1 from programs p where p.id = program_id and public.owns_trainee(p.trainee_id)))
  with check (exists (select 1 from programs p where p.id = program_id and public.owns_trainee(p.trainee_id)));
create policy trainee_program_weeks on program_weeks for select to authenticated
  using (exists (select 1 from programs p where p.id = program_id and public.is_trainee_self(p.trainee_id)));

create policy coach_calls on calls for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()) and (trainee_id is null or public.owns_trainee(trainee_id)));
create policy trainee_calls on calls for select to authenticated
  using (trainee_id is not null and public.is_trainee_self(trainee_id));

-- ---------- Coach-only ----------

create policy coach_templates on templates for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy coach_import_layouts on import_layouts for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

-- ---------- Logged by the trainee, managed by the coach ----------

create policy coach_logs on workout_logs for all to authenticated using (public.owns_trainee(trainee_id)) with check (public.owns_trainee(trainee_id));
create policy trainee_logs_read on workout_logs for select to authenticated using (public.is_trainee_self(trainee_id));
create policy trainee_logs_insert on workout_logs for insert to authenticated with check (public.is_trainee_self(trainee_id));
create policy trainee_logs_delete on workout_logs for delete to authenticated using (public.is_trainee_self(trainee_id));

create policy entries_read on log_entries for select to authenticated using (public.can_read_trainee(public.log_trainee(log_id)));
create policy entries_write on log_entries for insert to authenticated with check (public.can_read_trainee(public.log_trainee(log_id)));
create policy entries_coach on log_entries for all to authenticated
  using (public.owns_trainee(public.log_trainee(log_id))) with check (public.owns_trainee(public.log_trainee(log_id)));

create policy sets_read on log_sets for select to authenticated using (public.can_read_trainee(public.entry_trainee(entry_id)));
create policy sets_write on log_sets for insert to authenticated with check (public.can_read_trainee(public.entry_trainee(entry_id)));
create policy sets_coach on log_sets for all to authenticated
  using (public.owns_trainee(public.entry_trainee(entry_id))) with check (public.owns_trainee(public.entry_trainee(entry_id)));

create policy coach_weights on weights for all to authenticated using (public.owns_trainee(trainee_id)) with check (public.owns_trainee(trainee_id));
create policy trainee_weights_read on weights for select to authenticated using (public.is_trainee_self(trainee_id));
create policy trainee_weights_insert on weights for insert to authenticated with check (public.is_trainee_self(trainee_id));
create policy trainee_weights_update on weights for update to authenticated using (public.is_trainee_self(trainee_id)) with check (public.is_trainee_self(trainee_id));

create policy coach_checkins on checkins for all to authenticated using (public.owns_trainee(trainee_id)) with check (public.owns_trainee(trainee_id));
create policy trainee_checkins_read on checkins for select to authenticated using (public.is_trainee_self(trainee_id));
create policy trainee_checkins_insert on checkins for insert to authenticated with check (public.is_trainee_self(trainee_id));
create policy trainee_checkins_update on checkins for update to authenticated using (public.is_trainee_self(trainee_id)) with check (public.is_trainee_self(trainee_id));

create policy coach_scans on inbody_scans for all to authenticated using (public.owns_trainee(trainee_id)) with check (public.owns_trainee(trainee_id));
create policy trainee_scans_read on inbody_scans for select to authenticated using (public.is_trainee_self(trainee_id));
create policy trainee_scans_insert on inbody_scans for insert to authenticated with check (public.is_trainee_self(trainee_id) and source = 'trainee');

create policy coach_requests on inbody_requests for all to authenticated using (public.owns_trainee(trainee_id)) with check (public.owns_trainee(trainee_id));
create policy trainee_requests_read on inbody_requests for select to authenticated using (public.is_trainee_self(trainee_id));

create policy coach_metrics on metric_entries for all to authenticated using (public.owns_trainee(trainee_id)) with check (public.owns_trainee(trainee_id));
create policy trainee_metrics_read on metric_entries for select to authenticated using (public.is_trainee_self(trainee_id));
create policy trainee_metrics_insert on metric_entries for insert to authenticated with check (public.is_trainee_self(trainee_id) and source = 'trainee');

-- ---------- Communication ----------

create policy coach_notes on notes for all to authenticated using (public.owns_trainee(trainee_id)) with check (public.owns_trainee(trainee_id));
-- Private notes never reach the trainee.
create policy trainee_shared_notes on notes for select to authenticated using (shared and public.is_trainee_self(trainee_id));

-- Coaches send only as the coach, and may only flip read flags on existing messages (column grant below).
create policy coach_messages_read on messages for select to authenticated using (public.owns_trainee(trainee_id));
create policy coach_messages_send on messages for insert to authenticated
  with check (public.owns_trainee(trainee_id) and sender = 'coach' and not read_by_coach and not seen_by_trainee);
create policy coach_messages_mark on messages for update to authenticated
  using (public.owns_trainee(trainee_id)) with check (public.owns_trainee(trainee_id));
create policy coach_messages_delete on messages for delete to authenticated using (public.owns_trainee(trainee_id));
create policy trainee_messages_read on messages for select to authenticated using (public.is_trainee_self(trainee_id));
create policy trainee_messages_send on messages for insert to authenticated
  with check (public.is_trainee_self(trainee_id) and sender = 'trainee' and not read_by_coach and not seen_by_trainee);

-- ---------- Functions the apps call ----------

-- Trainee app, after sign-in: link the auth account to the profile the coach created with the same (verified) email.
create function public.claim_trainee_profile() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := (select auth.uid());
  addr text;
  linked uuid;
begin
  select email into addr from auth.users where id = me and email_confirmed_at is not null;
  if addr is null then return null; end if;
  update trainees set user_id = me, last_seen_at = now()
   where user_id is null and lower(email) = lower(addr)
   returning id into linked;
  return coalesce(linked, (select id from trainees where user_id = me limit 1));
end $$;

-- Trainee app: "last opened the app" on the coach side.
create function public.touch_last_seen() returns void
language sql security definer set search_path = public as $$
  update trainees set last_seen_at = now() where user_id = (select auth.uid());
$$;

-- Trainee app: mark the coach's messages as seen without granting general update rights.
create function public.mark_coach_messages_seen(t uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_trainee_self(t) then raise exception 'not allowed'; end if;
  update messages set seen_by_trainee = true where trainee_id = t and sender = 'coach' and not seen_by_trainee;
end $$;

-- A new scan closes the trainee's pending InBody request.
create function public.close_inbody_request() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update inbody_requests set status = 'done', scan_id = new.id
   where trainee_id = new.trainee_id and status = 'pending';
  return new;
end $$;
create trigger inbody_scan_closes_request after insert on inbody_scans
  for each row execute function public.close_inbody_request();

-- Coach accounts: signing up with user metadata {"role": "coach"} creates the coach profile.
create function public.handle_new_coach() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'role', '') = 'coach' then
    insert into coaches (id, name, email)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), coalesce(new.email, ''))
    on conflict (id) do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_coach();

revoke execute on function public.claim_trainee_profile(), public.touch_last_seen(), public.mark_coach_messages_seen(uuid) from public, anon;
grant execute on function public.claim_trainee_profile(), public.touch_last_seen(), public.mark_coach_messages_seen(uuid) to authenticated;

-- Message text is immutable through the API; only the coach's read flag can change.
revoke update on messages from authenticated;
grant update (read_by_coach) on messages to authenticated;
