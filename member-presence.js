/* Minimal signed-in member heartbeat, for an approximate active/online
   directory status. No IP address, page URL or location is recorded. */
(()=>{
 'use strict';
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY)return;
 const client=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 let lastUser=null,lastSent=0,running=false;
 async function heartbeat(force=false){
  if(document.hidden||running)return;
  if(!force&&Date.now()-lastSent<40000)return;
  running=true;
  try{
   const {data,error}=await client.auth.getSession();
   if(error||!data?.session?.user){lastUser=null;return;}
   const uid=data.session.user.id;
   const now=new Date().toISOString();
   const result=await client.from('tyc_member_presence')
    .upsert({user_id:uid,last_seen_at:now},{onConflict:'user_id'});
   if(!result.error){lastUser=uid;lastSent=Date.now();}
  }catch{}finally{running=false;}
 }
 void heartbeat(true);
 window.setInterval(()=>{void heartbeat();},45000);
 window.addEventListener('focus',()=>{void heartbeat(true)});
 window.addEventListener('pageshow',()=>{void heartbeat(true)});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void heartbeat(true)});
 client.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_OUT'){lastUser=null;lastSent=0;return;}
  if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'){
   if(session?.user?.id!==lastUser){lastSent=0;setTimeout(()=>{void heartbeat(true)},0);}
  }
 });
})();