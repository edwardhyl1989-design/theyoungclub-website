// PUBLIC client settings for THE YOUNG CLUB.
// Never place a service_role key, secret key, or admin password in this file.
window.TYC_SUPABASE_URL = 'https://rtumpdvpbauuzionvphy.supabase.co';
window.TYC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_gTcx5287MXrPVwpQS7c4nQ_EkNiIl6z';

/* Use Supabase's built-in browser persistence (localStorage).
   Its defaults keep a login across same-origin tabs, windows and browser restarts,
   and auto-refresh tokens while the member remains signed in.

   Migrate one existing sessionStorage login from our previous session-only
   setup so active members don't unnecessarily have to log in again.
   The migration guard prevents an older tab's saved session from restoring
   a login after the member explicitly signs out. */
(()=>{
 'use strict';
 try{
  const projectRef = new URL(window.TYC_SUPABASE_URL).hostname.split('.')[0];
  if(!/^[a-z0-9]+$/.test(projectRef))return;
  const authKey='sb-'+projectRef+'-auth-token';
  const migrationMarker='tyc-auth-storage-migrated-v1';
  const saved=window.sessionStorage.getItem(authKey);
  if(saved && !window.localStorage.getItem(authKey) &&
     !window.localStorage.getItem(migrationMarker)){
   window.localStorage.setItem(authKey,saved);
   window.localStorage.setItem(migrationMarker,'1');
  }
  // The old per-tab token must not be reused after logout.
  window.sessionStorage.removeItem(authKey);
 }catch{
  // Browsers that block storage can still use Supabase's normal fallback.
 }
})();

/* Shared 30-minute inactivity sign-out for members and staff.
   Browser-local only: no account credentials or permission state are stored here.
   Real user activity is shared across same-origin tabs; background polling and
   automatic token refresh never extend the idle deadline. */
(()=>{
 'use strict';
 if(window.TYC_IDLE_GUARD_ACTIVE)return;
 window.TYC_IDLE_GUARD_ACTIVE=true;
 const limit=30*60*1000,projectRef=new URL(window.TYC_SUPABASE_URL).hostname.split('.')[0];
 const authKey='sb-'+projectRef+'-auth-token',activityKey='tyc-idle-activity-v1:'+projectRef,expiredKey='tyc-idle-expired-v1:'+projectRef;
 let tracked=null,last=0,closing=false;
 function read(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
 function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
 function sessionId(){
  const s=read(authKey);
  if(!s?.access_token||!s?.user?.id)return null;
  try{
   const p=s.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
   const claims=JSON.parse(atob(p.padEnd(Math.ceil(p.length/4)*4,'=')));
   return typeof claims.session_id==='string'&&claims.session_id?claims.session_id:null;
  }catch{return null}
 }
 function returnPage(){
  const page=location.pathname.split('/').filter(Boolean).pop()||'index.html';
  const allowed=['index.html','blog.html','post.html','community.html','community-ko.html','community-en.html','the-club.html','jobs.html','profile.html','admin-users.html','admin-members.html','admin-content.html','admin-apparel.html','admin-analytics.html','admin-support.html','shop.html'];
  const file=page.endsWith('.html')?page:page+'.html';
  const next=allowed.includes(file)?file:'index.html';
  return 'auth.html?reason=idle&next='+encodeURIComponent(next);
 }
 function lock(){
  document.documentElement.classList.add('tyc-idle-lock');
  const style=document.createElement('style');
  style.textContent='html.tyc-idle-lock body{visibility:hidden!important;pointer-events:none!important}html.tyc-idle-lock::after{content:"Session expired. Signing out…";position:fixed;inset:0;display:grid;place-items:center;background:#f7f5ef;color:#315842;font:600 16px system-ui;z-index:2147483647}';
  (document.head||document.documentElement).append(style);
 }
 function goToLogin(){location.replace(returnPage())}
 async function expire(id){
  if(closing)return;closing=true;lock();
  write(expiredKey,{id,at:Date.now()});
  // Revoke only this browser session, not the user's other devices.
  if(sessionId()===id&&window.supabase?.createClient){
   try{
    const client=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY,{auth:{autoRefreshToken:false,detectSessionInUrl:false}});
    await Promise.race([client.auth.signOut({scope:'local'}),new Promise(resolve=>setTimeout(resolve,2500))]);
   }catch{}
  }
  const current=sessionId();
  if(current&&current!==id){location.reload();return;}
  // Fail closed locally if the network is unavailable or revocation fails.
  try{if(current===id)localStorage.removeItem(authKey);sessionStorage.removeItem(authKey)}catch{}
  goToLogin();
 }
 function check(activity=false){
  if(closing)return false;
  const id=sessionId(),now=Date.now();
  if(!id){tracked=null;last=0;return true;}
  const expired=read(expiredKey);
  if(expired?.id===id){void expire(id);return false;}
  const saved=read(activityKey);
  if(tracked!==id){tracked=id;last=saved?.id===id&&Number.isFinite(saved.at)?saved.at:now;}
  if(saved?.id===id&&Number.isFinite(saved.at))last=Math.max(last,saved.at);
  if(now-last>=limit||now<last-60000){void expire(id);return false;}
  if(saved?.id!==id||!Number.isFinite(saved.at)){write(activityKey,{id,at:last});}
  if(activity&&now-last>=1000){last=now;write(activityKey,{id,at:now});}
  return true;
 }
 function userActivity(e){
  if(!e.isTrusted||document.hidden)return;
  if(!check(true)){if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();}
 }
 for(const name of ['pointerdown','pointermove','keydown','touchstart','wheel','scroll','input','click'])
  window.addEventListener(name,userActivity,{capture:true,passive:false});
 window.addEventListener('storage',e=>{
  if(e.key===expiredKey&&tracked&&read(expiredKey)?.id===tracked){
   const current=sessionId();if(!current||current===tracked){if(!closing){closing=true;lock();goToLogin();}return;}
  }
  if(e.key===authKey||e.key===activityKey||e.key===expiredKey||e.key===null)check();
 });
 // Returning from a hidden/frozen tab or device sleep must check the old
 // deadline before the first click can extend it.
 window.addEventListener('focus',()=>check());
 window.addEventListener('pageshow',()=>check());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
 setInterval(()=>check(),1000);
 check();
})();
