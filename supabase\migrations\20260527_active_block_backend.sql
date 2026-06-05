-- Active Block Supabase backend.
-- Run this migration before deploying the Vercel app with:
--   VITE_SUPABASE_URL
--   VITE_SUPABASE_ANON_KEY

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Your Device',
  avatar text not null default 'ME',
  status text not null default 'active' check (status in ('active', 'focusing', 'offline')),
  active_group_id uuid,
  notification_prefs jsonb not null default '{"dailyReminder":true,"ninetyPercentWarning":true,"successFailure":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.active_block_groups (
  id uuid primary key default gen_random_uuid(),
  group_name text not null default 'Active Block Squad',
  join_code text not null unique,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  daily_limit_minutes integer not null default 180 check (daily_limit_minutes between 15 and 1440),
  challenge_duration_days integer not null default 8 check (challenge_duration_days between 1 and 365),
  challenge_started_at timestamptz,
  challenge_ends_at timestamptz,
  current_streak integer not null default 1 check (current_streak >= 0),
  status text not null default 'success' check (status in ('pending', 'success', 'failed')),
  last_evaluated_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'profiles'
      and constraint_name = 'profiles_active_group_fk'
  ) then
    alter table public.profiles
      add constraint profiles_active_group_fk
      foreign key (active_group_id) references public.active_block_groups(id) on delete set null;
  end if;
end;
$$;

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.active_block_groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  member_key text not null,
  display_name text not null,
  avatar text not null default 'ME',
  role text not null default 'member' check (role in ('owner', 'member', 'contact')),
  status text not null default 'active' check (status in ('active', 'focusing', 'offline')),
  today_screen_time_minutes integer not null default 0 check (today_screen_time_minutes >= 0),
  is_active boolean not null default true,
  is_invited boolean not null default true,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, member_key),
  unique (group_id, user_id)
);

create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.active_block_groups(id) on delete cascade,
  member_id uuid references public.group_members(id) on delete set null,
  user_id uuid references public.profiles(id) on delete cascade,
  member_key text not null,
  display_name text not null,
  date_key date not null default current_date,
  total_minutes integer not null check (total_minutes between 0 and 1440),
  daily_limit_minutes integer not null check (daily_limit_minutes between 15 and 1440),
  under_limit boolean not null,
  source text not null default 'manual' check (source in ('manual', 'demo_safe', 'demo_failure', 'android_auto', 'ios_manual_placeholder')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, date_key, member_key)
);

create table if not exists public.tower_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.active_block_groups(id) on delete cascade,
  date_key date not null,
  type text not null check (type in ('brick_added', 'tower_collapsed', 'stack_reset')),
  streak_after_event integer not null default 0 check (streak_after_event >= 0),
  failed_member_key text,
  failed_display_name text,
  message text,
  created_at timestamptz not null default now(),
  unique (group_id, date_key, type)
);

create table if not exists public.blocked_apps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  app_name text not null,
  icon text not null default 'smartphone',
  color text not null default 'from-zinc-500 to-zinc-700',
  time_used_today text not null default '0h',
  original_seconds_today integer not null default 0 check (original_seconds_today >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, app_name)
);

create table if not exists public.app_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  app_name text not null,
  category text not null default 'Social',
  color text not null default 'from-cyan-500 to-blue-500',
  daily_limit_minutes integer not null check (daily_limit_minutes between 15 and 1440),
  used_minutes_today integer not null default 0 check (used_minutes_today >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, app_name)
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  blocked_apps jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'completed', 'interrupted')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_active_group on public.profiles(active_group_id);
create index if not exists idx_groups_join_code on public.active_block_groups(join_code);
create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_usage_logs_group_date on public.usage_logs(group_id, date_key);
create index if not exists idx_tower_events_group_date on public.tower_events(group_id, date_key desc);
create index if not exists idx_blocked_apps_user on public.blocked_apps(user_id);
create index if not exists idx_app_limits_user on public.app_limits(user_id);
create index if not exists idx_focus_sessions_user on public.focus_sessions(user_id);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists groups_updated_at on public.active_block_groups;
create trigger groups_updated_at before update on public.active_block_groups
for each row execute function public.set_updated_at();

drop trigger if exists group_members_updated_at on public.group_members;
create trigger group_members_updated_at before update on public.group_members
for each row execute function public.set_updated_at();

drop trigger if exists usage_logs_updated_at on public.usage_logs;
create trigger usage_logs_updated_at before update on public.usage_logs
for each row execute function public.set_updated_at();

drop trigger if exists blocked_apps_updated_at on public.blocked_apps;
create trigger blocked_apps_updated_at before update on public.blocked_apps
for each row execute function public.set_updated_at();

drop trigger if exists app_limits_updated_at on public.app_limits;
create trigger app_limits_updated_at before update on public.app_limits
for each row execute function public.set_updated_at();

drop trigger if exists focus_sessions_updated_at on public.focus_sessions;
create trigger focus_sessions_updated_at before update on public.focus_sessions
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.active_block_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.usage_logs enable row level security;
alter table public.tower_events enable row level security;
alter table public.blocked_apps enable row level security;
alter table public.app_limits enable row level security;
alter table public.focus_sessions enable row level security;

create or replace function public.is_active_block_group_member(p_group_id uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_uid
      and gm.is_active = true
  );
$$;

grant execute on function public.is_active_block_group_member(uuid, uuid) to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "groups_insert_owner" on public.active_block_groups;
create policy "groups_insert_owner" on public.active_block_groups
for insert with check (auth.uid() = owner_id);

drop policy if exists "groups_select_members" on public.active_block_groups;
create policy "groups_select_members" on public.active_block_groups
for select using (public.is_active_block_group_member(id, auth.uid()));

drop policy if exists "groups_update_members" on public.active_block_groups;
create policy "groups_update_members" on public.active_block_groups
for update using (public.is_active_block_group_member(id, auth.uid()));

drop policy if exists "members_select_group" on public.group_members;
create policy "members_select_group" on public.group_members
for select using (public.is_active_block_group_member(group_id, auth.uid()));

drop policy if exists "members_insert_group" on public.group_members;
create policy "members_insert_group" on public.group_members
for insert with check (
  auth.uid() = user_id or public.is_active_block_group_member(group_id, auth.uid())
);

drop policy if exists "members_update_group" on public.group_members;
create policy "members_update_group" on public.group_members
for update using (public.is_active_block_group_member(group_id, auth.uid()));

drop policy if exists "usage_select_group" on public.usage_logs;
create policy "usage_select_group" on public.usage_logs
for select using (public.is_active_block_group_member(group_id, auth.uid()));

drop policy if exists "usage_insert_group" on public.usage_logs;
create policy "usage_insert_group" on public.usage_logs
for insert with check (public.is_active_block_group_member(group_id, auth.uid()) and created_by = auth.uid());

drop policy if exists "usage_update_group" on public.usage_logs;
create policy "usage_update_group" on public.usage_logs
for update using (public.is_active_block_group_member(group_id, auth.uid()));

drop policy if exists "tower_select_group" on public.tower_events;
create policy "tower_select_group" on public.tower_events
for select using (public.is_active_block_group_member(group_id, auth.uid()));

drop policy if exists "tower_insert_group" on public.tower_events;
create policy "tower_insert_group" on public.tower_events
for insert with check (public.is_active_block_group_member(group_id, auth.uid()));

drop policy if exists "blocked_apps_own" on public.blocked_apps;
create policy "blocked_apps_own" on public.blocked_apps
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "app_limits_own" on public.app_limits;
create policy "app_limits_own" on public.app_limits
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "focus_sessions_own" on public.focus_sessions;
create policy "focus_sessions_own" on public.focus_sessions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.generate_active_block_join_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := 'TOWER-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 4));
    exit when not exists (
      select 1 from public.active_block_groups where join_code = candidate
    );
  end loop;
  return candidate;
end;
$$;

create or replace function public.create_active_block_group(
  p_group_name text default 'Active Block Squad',
  p_daily_limit_minutes integer default 180,
  p_challenge_duration_days integer default 8,
  p_join_code text default null
)
returns public.active_block_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  profile_row public.profiles;
  group_row public.active_block_groups;
  clean_code text;
begin
  if uid is null then
    raise exception 'Authentication is required.';
  end if;

  select * into profile_row from public.profiles where id = uid;
  if profile_row.id is null then
    insert into public.profiles (id, display_name, avatar)
    values (uid, 'Your Device', 'ME')
    returning * into profile_row;
  end if;

  clean_code := upper(nullif(trim(coalesce(p_join_code, '')), ''));
  if clean_code is null then
    clean_code := public.generate_active_block_join_code();
  end if;

  insert into public.active_block_groups (
    group_name,
    join_code,
    owner_id,
    daily_limit_minutes,
    challenge_duration_days,
    challenge_started_at,
    challenge_ends_at
  ) values (
    coalesce(nullif(trim(p_group_name), ''), 'Active Block Squad'),
    clean_code,
    uid,
    greatest(15, least(1440, p_daily_limit_minutes)),
    greatest(1, least(365, p_challenge_duration_days)),
    now(),
    now() + make_interval(days => greatest(1, least(365, p_challenge_duration_days)))
  ) returning * into group_row;

  insert into public.group_members (
    group_id,
    user_id,
    member_key,
    display_name,
    avatar,
    role,
    status,
    today_screen_time_minutes,
    is_invited
  ) values (
    group_row.id,
    uid,
    'user_' || uid::text,
    profile_row.display_name,
    profile_row.avatar,
    'owner',
    profile_row.status,
    0,
    true
  ) on conflict (group_id, user_id) do update set
    role = 'owner',
    is_active = true,
    is_invited = true,
    updated_at = now();

  update public.profiles set active_group_id = group_row.id where id = uid;
  return group_row;
end;
$$;

create or replace function public.join_active_block_group(p_join_code text)
returns public.active_block_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  profile_row public.profiles;
  group_row public.active_block_groups;
begin
  if uid is null then
    raise exception 'Authentication is required.';
  end if;

  select * into profile_row from public.profiles where id = uid;
  if profile_row.id is null then
    insert into public.profiles (id, display_name, avatar)
    values (uid, 'Your Device', 'ME')
    returning * into profile_row;
  end if;

  select * into group_row
  from public.active_block_groups
  where join_code = upper(trim(p_join_code));

  if group_row.id is null then
    raise exception 'Invalid group code.';
  end if;

  insert into public.group_members (
    group_id,
    user_id,
    member_key,
    display_name,
    avatar,
    role,
    status,
    today_screen_time_minutes,
    is_invited
  ) values (
    group_row.id,
    uid,
    'user_' || uid::text,
    profile_row.display_name,
    profile_row.avatar,
    'member',
    profile_row.status,
    0,
    true
  ) on conflict (group_id, user_id) do update set
    is_active = true,
    is_invited = true,
    updated_at = now();

  update public.profiles set active_group_id = group_row.id where id = uid;
  return group_row;
end;
$$;

create or replace function public.run_active_block_daily_check(
  p_group_id uuid,
  p_date_key date default current_date,
  p_force_missing_failure boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  group_row public.active_block_groups;
  missing_count integer;
  failed_log public.usage_logs;
  failed_member public.group_members;
  new_streak integer;
begin
  if uid is null or not public.is_active_block_group_member(p_group_id, uid) then
    raise exception 'You must belong to this group to run the daily check.';
  end if;

  select * into group_row from public.active_block_groups where id = p_group_id for update;
  if group_row.id is null then
    raise exception 'Group not found.';
  end if;

  if group_row.last_evaluated_date = p_date_key then
    return jsonb_build_object('status', 'already_checked', 'streak', group_row.current_streak, 'dateKey', p_date_key);
  end if;

  select count(*) into missing_count
  from public.group_members gm
  where gm.group_id = p_group_id
    and gm.is_active = true
    and gm.is_invited = true
    and not exists (
      select 1 from public.usage_logs ul
      where ul.group_id = p_group_id
        and ul.date_key = p_date_key
        and ul.member_key = gm.member_key
    );

  if missing_count > 0 and p_force_missing_failure = false then
    update public.active_block_groups set status = 'pending' where id = p_group_id;
    return jsonb_build_object('status', 'pending', 'missingCount', missing_count, 'dateKey', p_date_key);
  end if;

  if missing_count > 0 and p_force_missing_failure = true then
    select gm.* into failed_member
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.is_active = true
      and gm.is_invited = true
      and not exists (
        select 1 from public.usage_logs ul
        where ul.group_id = p_group_id and ul.date_key = p_date_key and ul.member_key = gm.member_key
      )
    order by gm.joined_at asc
    limit 1;

    update public.active_block_groups
    set current_streak = 0, status = 'failed', last_evaluated_date = p_date_key
    where id = p_group_id;

    insert into public.tower_events (group_id, date_key, type, streak_after_event, failed_member_key, failed_display_name, message)
    values (p_group_id, p_date_key, 'tower_collapsed', 0, failed_member.member_key, failed_member.display_name, failed_member.display_name || ' did not submit screen time.')
    on conflict (group_id, date_key, type) do nothing;

    return jsonb_build_object('status', 'failed', 'streak', 0, 'failedDisplayName', failed_member.display_name, 'dateKey', p_date_key);
  end if;

  select * into failed_log
  from public.usage_logs
  where group_id = p_group_id and date_key = p_date_key and under_limit = false
  order by total_minutes desc
  limit 1;

  if failed_log.id is null then
    new_streak := group_row.current_streak + 1;
    update public.active_block_groups
    set current_streak = new_streak, status = 'success', last_evaluated_date = p_date_key
    where id = p_group_id;

    insert into public.tower_events (group_id, date_key, type, streak_after_event, message)
    values (p_group_id, p_date_key, 'brick_added', new_streak, 'Brick added! Day ' || new_streak || ' completed.')
    on conflict (group_id, date_key, type) do nothing;

    return jsonb_build_object('status', 'success', 'streak', new_streak, 'dateKey', p_date_key);
  end if;

  update public.active_block_groups
  set current_streak = 0, status = 'failed', last_evaluated_date = p_date_key
  where id = p_group_id;

  insert into public.tower_events (group_id, date_key, type, streak_after_event, failed_member_key, failed_display_name, message)
  values (p_group_id, p_date_key, 'tower_collapsed', 0, failed_log.member_key, failed_log.display_name, 'Tower collapsed! ' || failed_log.display_name || ' exceeded the limit.')
  on conflict (group_id, date_key, type) do nothing;

  return jsonb_build_object('status', 'failed', 'streak', 0, 'failedDisplayName', failed_log.display_name, 'dateKey', p_date_key);
end;
$$;

grant execute on function public.generate_active_block_join_code() to authenticated;
grant execute on function public.create_active_block_group(text, integer, integer, text) to authenticated;
grant execute on function public.join_active_block_group(text) to authenticated;
grant execute on function public.run_active_block_daily_check(uuid, date, boolean) to authenticated;

-- ─── Profile picture URL column ─────────────────────────────────────────────
alter table public.profiles
  add column if not exists avatar_url text;

-- ─── Storage bucket for profile pictures ────────────────────────────────────
-- Note: run this only after enabling Storage in your Supabase project.
-- If the storage schema doesn't exist yet (e.g. fresh project without Storage),
-- this block silently skips so the rest of the migration still applies.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'avatars',
      'avatars',
      true,
      5242880,
      array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    )
    on conflict (id) do nothing;
  end if;
end;
$$;

-- Storage RLS policies (only created when the storage schema exists)
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    -- Public read
    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'avatars_public_read'
    ) then
      execute $policy$
        create policy "avatars_public_read"
        on storage.objects for select
        using (bucket_id = 'avatars')
      $policy$;
    end if;

    -- Authenticated insert (own folder)
    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'avatars_auth_insert'
    ) then
      execute $policy$
        create policy "avatars_auth_insert"
        on storage.objects for insert
        with check (
          bucket_id = 'avatars'
          and auth.uid()::text = (storage.foldername(name))[1]
        )
      $policy$;
    end if;

    -- Authenticated update (own folder)
    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'avatars_auth_update'
    ) then
      execute $policy$
        create policy "avatars_auth_update"
        on storage.objects for update
        using (
          bucket_id = 'avatars'
          and auth.uid()::text = (storage.foldername(name))[1]
        )
      $policy$;
    end if;
  end if;
end;
$$;
