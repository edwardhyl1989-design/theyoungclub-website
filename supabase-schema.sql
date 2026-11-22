-- THE YOUNG CLUB / Community Job Board
-- Run ONCE in Supabase SQL Editor. Sign up as owner first, then execute the admin assignment below.
-- Public Supabase project key is safe to use on frontend ONLY with RLS enabled.

create extension if not exists pgcrypto;

create table if not exists public.job_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);

create table if not exists public.job_postings (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 1 and 120),
 company text not null check (char_length(company) between 1 and 120),
 location text not null check (char_length(location) between 1 and 120),
 employment_type text not null check (employment_type in ('Full-time','Part-time','Contract','Per diem','Other')),
 compensation text not null default '' check (char_length(compensation) <= 120),
 description text not null check (char_length(description) between 20 and 6000),
 apply_email text check (char_length(apply_email) <= 254),
 apply_url text check (char_length(apply_url) <= 500 and (apply_url is null or apply_url ~ '^https://')),
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 rejection_reason text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 published_at timestamptz,
 constraint job_application_contact check (nullif(btrim(coalesce(apply_email,'')),'') is not null or nullif(btrim(coalesce(apply_url,'')),'') is not null)
);
create index if not exists job_postings_public_idx on public.job_postings(status,published_at desc);
create index if not exists job_postings_owner_idx on public.job_postings(owner_id,created_at desc);

-- The role table must not be editable through public browser API.
revoke all on public.job_admins from anon, authenticated;
grant select on public.job_admins to authenticated;
alter table public.job_admins enable row level security;
drop policy if exists job_admin_read_self on public.job_admins;
create policy job_admin_read_self on public.job_admins for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.is_job_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.job_admins where user_id = (select auth.uid())); $$;
revoke all on function public.is_job_admin() from public, anon;
grant execute on function public.is_job_admin() to authenticated;

-- Database trigger enforces pending status for user edits; nobody can claim approval by altering JS.
create or replace function public.enforce_job_review()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare admin_user boolean;
begin
  admin_user := public.is_job_admin();
  if tg_op = 'INSERT' then
    if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
    new.owner_id := (select auth.uid());
    new.status := 'pending';
    new.created_at := now();
    new.updated_at := now();
    new.published_at := null;
    new.rejection_reason := null;
  else
    if new.owner_id is distinct from old.owner_id or new.created_at is distinct from old.created_at then
      raise exception 'Owner and original creation date cannot change';
    end if;
    new.updated_at := now();
    if not admin_user then
      -- User edits are allowed only on their own rows under RLS.
      -- Every user edit requires reapproval, even if it was previously public.
      new.status := 'pending';
      new.published_at := null;
      new.rejection_reason := null;
    else
      if new.status = 'approved' and (old.status is distinct from 'approved' or new.published_at is null) then
        new.published_at := now();
        new.rejection_reason := null;
      elsif new.status <> 'approved' then
        new.published_at := null;
      end if;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists enforce_job_review_trigger on public.job_postings;
create trigger enforce_job_review_trigger before insert or update on public.job_postings
for each row execute function public.enforce_job_review();

alter table public.job_postings enable row level security;
revoke all on public.job_postings from anon, authenticated;
grant select on public.job_postings to anon,authenticated;
grant insert,update on public.job_postings to authenticated;
-- No delete from browser; admin can reject (hide) posts and users can edit/resubmit.

drop policy if exists jobs_public_approved on public.job_postings;
create policy jobs_public_approved on public.job_postings for select to anon,authenticated
 using (status='approved');
drop policy if exists jobs_member_own_read on public.job_postings;
create policy jobs_member_own_read on public.job_postings for select to authenticated
 using (owner_id=(select auth.uid()));
drop policy if exists jobs_admin_read on public.job_postings;
create policy jobs_admin_read on public.job_postings for select to authenticated
 using (public.is_job_admin());
drop policy if exists jobs_member_insert on public.job_postings;
create policy jobs_member_insert on public.job_postings for insert to authenticated
 with check (owner_id=(select auth.uid()) and status='pending');
drop policy if exists jobs_member_update on public.job_postings;
create policy jobs_member_update on public.job_postings for update to authenticated
 using (owner_id=(select auth.uid()))
 with check (owner_id=(select auth.uid()) and status='pending');
drop policy if exists jobs_admin_update on public.job_postings;
create policy jobs_admin_update on public.job_postings for update to authenticated
 using (public.is_job_admin())
 with check (public.is_job_admin());

-- AFTER you create your own email login (and confirm its email), manually run this
-- separate SQL command in Supabase SQL Editor, replacing the example with YOUR email.
-- DO NOT give ordinary users the admin role.
-- insert into public.job_admins(user_id)
-- select id from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com'
-- on conflict(user_id) do nothing;
