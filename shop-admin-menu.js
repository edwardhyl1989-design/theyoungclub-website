/* SHOP-only admin dropdown visibility. The database is the authority; UI stays
   hidden until the current signed-in user has a matching job_admins row. */
(()=>{'use strict';
 const link=document.querySelector('[data-shop-admin-link]');
 if(!link)return;
 link.hidden=true;
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY)return;
 const db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 let sequence=0;
 async function refresh(){
  const current=++sequence;
  link.hidden=true; // no stale admin link during account switching or token changes
  try{
   const {data,error}=await db.auth.getUser();
   if(error||!data?.user||current!==sequence)return;
   const r=await db.from('job_admins').select('user_id').eq('user_id',data.user.id).maybeSingle();
   if(current!==sequence)return;
   link.hidden=!!r.error||!r.data;
  }catch(_){if(current===sequence)link.hidden=true;}
 }
 // Update immediately on sign-out, and recheck from the server on sign-in.
 db.auth.onAuthStateChange((event)=>{
  if(event==='SIGNED_OUT'){sequence++;link.hidden=true;return;}
  if(['SIGNED_IN','INITIAL_SESSION','TOKEN_REFRESHED','USER_UPDATED'].includes(event)){
   setTimeout(refresh,0);
  }
 });
 refresh();
})();