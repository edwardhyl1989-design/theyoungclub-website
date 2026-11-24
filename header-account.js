/* Blog account header: shares the existing Supabase session with Job Postings and Community. */
(()=>{'use strict';
const root=document.querySelector('[data-account-header]');
if(!root)return;
const login=root.querySelector('[data-login-link]');
const signed=root.querySelector('[data-account-signed]');
const trigger=root.querySelector('[data-account-trigger]');
const menu=root.querySelector('[data-account-menu]');
const logout=root.querySelector('[data-account-logout]');
const hideMenu=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');};
// Shared administrator shortcut, hidden until the database confirms access.
if(menu&&!menu.querySelector('a[href="admin-analytics.html"]')){
 const link=document.createElement('a');
 link.href='admin-analytics.html';
 link.textContent='Visitor Management';
 link.setAttribute('data-admin-only','');
 link.hidden=true;
 menu.insertBefore(link,logout);
}
const adminLinks=[...root.querySelectorAll('[data-admin-only]')];
let accountCheckVersion=0;
function setAdminLinks(allowed){for(const link of adminLinks)link.hidden=!allowed;}
function showUser(user){login.hidden=!!user;signed.hidden=!user;if(!user){hideMenu();setAdminLinks(false);}}
async function verifyAdmin(client,user){
 const check=++accountCheckVersion;
 setAdminLinks(false);
 if(!user||!adminLinks.length)return;
 try{
  const {data,error}=await client.from('job_admins').select('user_id').eq('user_id',user.id).maybeSingle();
  if(check===accountCheckVersion&&!error)setAdminLinks(!!data);
 }catch{if(check===accountCheckVersion)setAdminLinks(false);}
}
if(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches){
 signed.addEventListener('mouseenter',()=>{if(!signed.hidden){menu.hidden=false;trigger.setAttribute('aria-expanded','true');}});
 signed.addEventListener('mouseleave',hideMenu);
}
trigger.addEventListener('click',()=>{const opening=menu.hidden;menu.hidden=!opening;trigger.setAttribute('aria-expanded',String(opening));});
document.addEventListener('click',event=>{if(!root.contains(event.target))hideMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){hideMenu();trigger.focus();}});
async function init(){
 if(!window.supabase?.createClient||!/^https:\/\/[\w-]+\.supabase\.co\/?$/.test(window.TYC_SUPABASE_URL||'')||!window.TYC_SUPABASE_PUBLISHABLE_KEY)return;
 const client=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data,error}=await client.auth.getUser();if(!error){showUser(data?.user||null);await verifyAdmin(client,data?.user||null);}
 client.auth.onAuthStateChange((event,session)=>{
   if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','INITIAL_SESSION','USER_UPDATED'].includes(event)){
     showUser(session?.user||null);
     // Defer queries from the auth callback to avoid auth-state reentrancy.
     setTimeout(()=>verifyAdmin(client,session?.user||null),0);
   }
 });
 logout.addEventListener('click',async()=>{
  logout.disabled=true;logout.textContent='Signing out...';
  try{const {error}=await client.auth.signOut();if(error)throw error;showUser(null);}
  catch(error){window.alert('Could not log out. Please try again. / 로그아웃에 실패했습니다.');}
  finally{logout.disabled=false;logout.textContent='Log Out';}
 });
}
init().catch(()=>{showUser(null);});
})();
