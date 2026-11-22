-- STEP 5: only the signed-in user can change their OWN Community display name.
-- Run once in the Supabase SQL Editor BEFORE merging the STEP 5 Pull Request.
-- Does not change license, membership status, admin status or legal name.
create or replace function public.tyc_update_own_display_name(new_display_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare own_id uuid := (select auth.uid());
begin
  if own_id is null then raise exception 'Authentication required'; end if;
  if new_display_name is null or length(btrim(new_display_name)) < 2 or length(btrim(new_display_name)) > 40 then
    raise exception 'Display Name must be between 2 and 40 characters';
  end if;
  update public.pta_members
     set display_name = btrim(new_display_name)
   where user_id = own_id;
  if not found then raise exception 'PTA Community membership record not found'; end if;
end;
$$;
revoke all on function public.tyc_update_own_display_name(text) from public, anon;
grant execute on function public.tyc_update_own_display_name(text) to authenticated;
