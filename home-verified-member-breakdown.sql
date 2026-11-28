CREATE OR REPLACE FUNCTION tyc_home_private.activity_counts()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 with clock as (select (now() at time zone 'America/Los_Angeles')::date as day),
 bounds as (select day, day::timestamp at time zone 'America/Los_Angeles' as start_at from clock)
 select jsonb_build_object('total_members',(select count(*) from auth.users),
 'verified_members',(select count(*) from public.pta_members where membership_status='approved'),
 'verified_ptas',(select count(*) from public.pta_members where membership_status='approved' and member_type='PTA'),
 'verified_sptas',(select count(*) from public.pta_members where membership_status='approved' and member_type='SPTA'),
 'new_posts',(select count(*) from public.tyc_blog_posts where published and created_at>=now()-interval '24 hours')+(select count(*) from public.tyc_blog_qna where published and created_at>=now()-interval '24 hours')+(select count(*) from public.pta_topics where not is_hidden and not is_deleted and created_at>=now()-interval '24 hours')+(select count(*) from public.club_posts where created_at>=now()-interval '24 hours')+(select count(*) from public.pta_daily_news where status='published' and created_at>=now()-interval '24 hours')+(select count(*) from public.job_postings where status='approved' and published_at>=now()-interval '24 hours'),
 'active_jobs',(select count(*) from public.job_postings where status='approved' and (expires_at is null or expires_at>=b.day))) from bounds b
$function$
