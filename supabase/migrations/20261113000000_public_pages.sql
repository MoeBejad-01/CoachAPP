-- Coach public pages and the join flow.
--
-- A coach publishes a page at /c/<handle> and shares it on social media. A visitor who wants to
-- train with them signs up and sends a join request with their intake answers. The request lands in
-- the coach's dashboard as pending: the coach approves it (which creates the trainee) or reaches the
-- person on WhatsApp first. Nothing a visitor sends can reach another coach, and an unpublished page
-- is invisible to everyone but its owner.

create type join_request_status as enum ('pending', 'approved', 'declined');

-- ---------- The public page ----------

-- Kept apart from `coaches` on purpose: that table holds the coach's email and dashboard
-- preferences, and RLS grants rows, not columns. Only what belongs on a public page lives here.
create table coach_pages (
  coach_id uuid primary key references coaches (id) on delete cascade,
  -- The handle in /c/<handle>: lowercase, 2-39 chars, no leading or trailing dash.
  handle text not null unique
    check (handle ~ '^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])$')
    check (handle not in ('c', 'join', 'login', 'signup', 'app', 'coach', 'admin', 'api', 'about', 'pricing', 'contact', 'terms', 'privacy', 'settings', 'new')),
  published boolean not null default false,
  -- The whole CoachProfile the public site renders (name, tagline, plans, results, FAQ...).
  profile jsonb not null default '{}'::jsonb check (jsonb_typeof(profile) = 'object'),
  -- E.164 without the +, e.g. 9665xxxxxxxx: what the page's WhatsApp button dials.
  whatsapp text not null default '' check (whatsapp = '' or whatsapp ~ '^[1-9][0-9]{7,14}$'),
  updated_at timestamptz not null default now()
);
create index coach_pages_published_idx on coach_pages (published) where published;
create trigger coach_pages_touch before update on coach_pages for each row execute function touch_updated_at();

-- ---------- Join requests ----------

create table join_requests (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches (id) on delete cascade,
  -- The visitor's own account. Kept if they later delete it, so the coach doesn't lose the request.
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (length(btrim(name)) between 1 and 120),
  email text not null check (position('@' in email) > 1),
  phone text not null default '',
  -- The intake answers (IntakeAnswers on the site): measurements, goal, availability, injuries,
  -- conditions, the plan they picked. One blob because the form owns its own shape.
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  -- A plan or program id from the coach's page, or 'unsure'.
  plan_id text not null default '',
  message text not null default '' check (length(message) <= 2000),
  status join_request_status not null default 'pending',
  sent_at timestamptz not null default now(),
  decided_at timestamptz,
  -- Set when the coach approves: the trainee this request became.
  trainee_id uuid references trainees (id) on delete set null
);
create index join_requests_coach_idx on join_requests (coach_id, status, sent_at desc);
create index join_requests_user_idx on join_requests (user_id);
-- One open request per person per coach; they can send again after a decision.
create unique index join_requests_one_pending_idx on join_requests (coach_id, user_id)
  where status = 'pending' and user_id is not null;

-- ---------- Access rules ----------

alter table coach_pages enable row level security;
alter table join_requests enable row level security;

-- security definer, like owns_trainee(): a policy must see the page row to judge a request,
-- and a visitor can only see published ones.
create function public.page_is_published(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from coach_pages where coach_id = c and published);
$$;

-- Anyone, signed in or not, may read a published page. That is the point of it.
create policy public_reads_published_page on coach_pages for select to anon, authenticated
  using (published);
create policy coach_own_page on coach_pages for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

-- A signed-in visitor sends a request as themselves, to a coach whose page is live, and it starts
-- pending. They can read their own afterwards; changing or withdrawing it is not theirs to do.
create policy visitor_sends_request on join_requests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and trainee_id is null
    and public.page_is_published(coach_id)
  );
create policy visitor_reads_own_request on join_requests for select to authenticated
  using (user_id = (select auth.uid()));

create policy coach_reads_requests on join_requests for select to authenticated
  using (coach_id = (select auth.uid()));
create policy coach_updates_requests on join_requests for update to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy coach_deletes_requests on join_requests for delete to authenticated
  using (coach_id = (select auth.uid()));

-- ---------- What the apps call ----------

-- The coach's dashboard: turn a pending request into a trainee in onboarding.
-- Plan name and price come from the caller so web/src/data/plans.ts stays the only price list.
create function public.approve_join_request(
  r uuid,
  tier plan_tier default 'essential',
  plan_name text default 'Essential online coaching',
  price numeric default 499,
  cycle billing_cycle default 'monthly'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := (select auth.uid());
  req join_requests;
  a jsonb;
  full_name text;
  new_id uuid;
begin
  select * into req from join_requests where id = r and coach_id = me and status = 'pending' for update;
  if req.id is null then raise exception 'no pending request' using errcode = 'no_data_found'; end if;

  if exists (select 1 from trainees where coach_id = me and lower(email) = lower(req.email)) then
    raise exception 'a trainee with this email already exists' using errcode = 'unique_violation';
  end if;

  a := req.answers;
  full_name := btrim(req.name);
  insert into trainees (
    coach_id, user_id, first_name, last_name, email, phone, birth_date, height_cm,
    tier, status, goal_type, injuries, frequency
  ) values (
    me,
    -- Link the account now, unless it already holds a profile (trainees.user_id is unique).
    (select req.user_id where req.user_id is not null
       and not exists (select 1 from trainees where user_id = req.user_id)),
    split_part(full_name, ' ', 1),
    nullif(btrim(substr(full_name, length(split_part(full_name, ' ', 1)) + 1)), ''),
    req.email,
    req.phone,
    nullif(a ->> 'birthDate', '')::date,
    nullif(a ->> 'heightCm', '')::numeric::smallint,
    tier,
    'onboarding',
    case a ->> 'goal'
      when 'muscle' then 'muscle' when 'strength' then 'strength' when 'fatloss' then 'fatloss'
      when 'compete' then 'sport' when 'rehab' then 'rehab' else 'health'
    end::goal_type,
    btrim(concat_ws(E'\n', nullif(a ->> 'painNotes', ''), nullif(a ->> 'medications', ''))),
    greatest(1, least(7, coalesce(jsonb_array_length(a -> 'days'), 3)))
  ) returning id into new_id;

  insert into trainee_private (trainee_id) values (new_id);
  insert into memberships (trainee_id, plan, price_sar, cycle, renews_on)
    values (new_id, plan_name, price, cycle, current_date + (case cycle when 'quarterly' then 90 else 30 end));

  update join_requests set status = 'approved', decided_at = now(), trainee_id = new_id where id = r;
  return new_id;
end $$;

create function public.decline_join_request(r uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update join_requests set status = 'declined', decided_at = now()
   where id = r and coach_id = (select auth.uid()) and status = 'pending';
  if not found then raise exception 'no pending request' using errcode = 'no_data_found'; end if;
end $$;

revoke execute on function public.approve_join_request(uuid, plan_tier, text, numeric, billing_cycle),
  public.decline_join_request(uuid), public.page_is_published(uuid) from public, anon;
grant execute on function public.approve_join_request(uuid, plan_tier, text, numeric, billing_cycle),
  public.decline_join_request(uuid) to authenticated;
-- Policies call page_is_published() as the table owner, so the role itself needs no grant.
