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
function showUser(user){login.hidden=!!user;signed.hidden=!user;if(!user)hideMenu();}
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
 const {data,error}=await client.auth.getUser();if(!error)showUser(data?.user||null);
 client.auth.onAuthStateChange((event,session)=>{
   if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','INITIAL_SESSION','USER_UPDATED'].includes(event))showUser(session?.user||null);
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
