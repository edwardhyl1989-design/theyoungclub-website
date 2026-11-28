alter table public.pta_members add column if not exists residence_state text;
alter table public.pta_members add column if not exists student_expected_graduation date;
alter table public.pta_members add constraint pta_members_residence_state_allowed check (residence_state is null or residence_state in ('AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','PR','GU','VI','MP','AS'));
alter table public.pta_members add constraint pta_members_expected_graduation_valid check (student_expected_graduation is null or (member_type='SPTA' and extract(day from student_expected_graduation)=1 and student_expected_graduation between date '2000-01-01' and date '2100-12-01'));
create schema if not exists tyc_license_verification;
revoke all on schema tyc_license_verification from public, anon, authenticated;
grant usage on schema tyc_license_verification to authenticated;
create table tyc_license_verification.official_pta_records (
 state text not null,
 license_number text not null check (license_number=upper(btrim(license_number)) and length(license_number) between 1 and 60),
 first_name text not null,
 last_name text not null,
 license_status text not null,
 issue_date date,
 expiration_date date,
 source_as_of date not null,
 primary key(state,license_number)
);
alter table tyc_license_verification.official_pta_records enable row level security;
revoke all on table tyc_license_verification.official_pta_records from public,anon,authenticated;
grant select on table tyc_license_verification.official_pta_records to authenticated;
create policy official_records_staff_read on tyc_license_verification.official_pta_records for select to authenticated using ((select public.tyc_account_is_allowed()) and ((select public.is_job_admin()) or (select public.tyc_has_staff_scope('community'))));
create or replace function public.tyc_pta_license_review_results()
returns table(user_id uuid,result text,reason text,license_status text,issue_date date,expiration_date date,source_as_of date)
language sql stable security invoker set search_path='' as $$
with eligible as (
 select m.user_id,m.license_state,m.license_number,m.legal_first_name,m.legal_last_name
 from public.pta_members m
 where m.member_type='PTA' and m.membership_status='pending'
 and (select public.tyc_account_is_allowed())
 and ((select public.is_job_admin()) or (select public.tyc_has_staff_scope('community')))
), checked as (
 select e.user_id,r.license_status,r.issue_date,r.expiration_date,r.source_as_of,
 case
 when r.license_number is null then 'unavailable'
 when r.source_as_of < current_date-35 or r.source_as_of > current_date then 'stale'
 when lower(btrim(r.first_name))<>lower(btrim(e.legal_first_name)) or lower(btrim(r.last_name))<>lower(btrim(e.legal_last_name)) then 'name_mismatch'
 when lower(btrim(r.license_status)) not in ('active','current') then 'status_review'
 when r.issue_date is null or r.issue_date>current_date or r.expiration_date is null or r.expiration_date<current_date then 'date_review'
 else 'matched' end as check_result
 from eligible e left join tyc_license_verification.official_pta_records r on r.state=e.license_state and r.license_number=upper(btrim(e.license_number))
)
select c.user_id,
case when check_result='matched' then 'matched' when check_result='name_mismatch' then 'mismatch' else 'review' end,
case check_result when 'matched' then 'Name, PTA license number, active status and dates match the available official snapshot. Confirm applicant identity before approval.' when 'name_mismatch' then 'The license number exists but the name differs from the available official snapshot. Check spelling and identity.' when 'stale' then 'The official snapshot is stale or has an invalid date. Verify directly with the board.' when 'status_review' then 'The official snapshot does not show an active/current license. Verify directly with the board.' when 'date_review' then 'The issue or expiration date is missing or inconsistent. Verify directly with the board.' else 'No current official record is available in the automated lookup. Check the issuing board manually.' end,
case when check_result='name_mismatch' then null else c.license_status end,
case when check_result='name_mismatch' then null else c.issue_date end,
case when check_result='name_mismatch' then null else c.expiration_date end,c.source_as_of
from checked c
$$;
revoke all on function public.tyc_pta_license_review_results() from public,anon;
grant execute on function public.tyc_pta_license_review_results() to authenticated;
comment on table tyc_license_verification.official_pta_records is 'Private PTA-only snapshots. Import only authoritative state records; no addresses. Never fabricate rows or mark live status based on an unavailable or stale feed.';