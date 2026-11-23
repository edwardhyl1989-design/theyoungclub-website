/* The Manage action on a public article is never shown to non-admin accounts. */
(()=>{'use strict';
 const button=document.getElementById('post-admin-manage');
 const id=new URLSearchParams(location.search).get('id');
 if(!button||!id||!window.supabase?.createClient||
   !window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY)return;
 const client=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 let seq=0;
 async function refresh(){
  const version=++seq;button.hidden=true;
  try{
   const {data,error}=await client.auth.getUser();
   if(error||!data?.user||version!==seq)return;
   const r=await client.from('job_admins').select('user_id').eq('user_id',data.user.id).maybeSingle();
   if(version!==seq)return;
   button.hidden=!!r.error||!r.data;
  }catch{if(version===seq)button.hidden=true}
 }
 button.addEventListener('click',()=>{
  window.location.assign('blog.html?edit='+encodeURIComponent(id));
 });
 client.auth.onAuthStateChange(event=>{
  if(event==='SIGNED_OUT'){seq++;button.hidden=true}
  else if(['SIGNED_IN','TOKEN_REFRESHED','INITIAL_SESSION','USER_UPDATED'].includes(event))setTimeout(refresh,0);
 });
 refresh();
})();