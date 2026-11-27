-- Development HOME aggregate metrics. Review before promoting to production.
-- Counts only, no identities or private post content. Guests intentionally receive totals.
create schema if not exists tyc_home_private;
revoke all on schema tyc_home_private from public;
grant usage on schema tyc_home_private to anon, authenticated;
create or replace function tyc_home_private.activity_counts()
returns jsonb language sql stable security definer set search_path = '' as $$
 with clock as (select (now() at time zone 'America/Los_Angeles')::date as day),
 bounds as (select day, day::timestamp at time zone 'America/Los_Angeles' as start_at from clock)
 select jsonb_build_object('verified_members',(select count(*) from public.pta_members where membership_status='approved'),
 'new_posts',(select count(*) from public.tyc_blog_posts where published and created_at>=b.start_at)+(select count(*) from public.tyc_blog_qna where published and created_at>=b.start_at)+(select count(*) from public.pta_topics where not is_hidden and not is_deleted and created_at>=b.start_at)+(select count(*) from public.club_posts where created_at>=b.start_at)+(select count(*) from public.pta_daily_news where status='published' and created_at>=b.start_at)+(select count(*) from public.job_postings where status='approved' and published_at>=b.start_at),
 'active_jobs',(select count(*) from public.job_postings where status='approved' and (expires_at is null or expires_at>=b.day))) from bounds b
$$;
revoke all on function tyc_home_private.activity_counts() from public;
grant execute on function tyc_home_private.activity_counts() to anon, authenticated;
create or replace function public.tyc_home_activity_counts() returns jsonb language sql stable security invoker set search_path = '' as $$ select tyc_home_private.activity_counts() $$;
revoke all on function public.tyc_home_activity_counts() from public;
grant execute on function public.tyc_home_activity_counts() to anon, authenticated;
notify pgrst, 'reload schema';
