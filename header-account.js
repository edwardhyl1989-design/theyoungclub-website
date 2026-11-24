/* Blog account header: shares the existing Supabase session with Job Postings and Community. */
(()=>{'use strict';
const root=document.querySelector('[data-account-header]');
if(!root)return;
const login=root.querySelector('[data-login-link]');
const signed=root.querySelector('[data-account-signed]');
const trigger=root.querySelector('[data-account-trigger]');
const menu=root.querySelector('[data-account-menu]');
const logout=root.querySelector('[data-account-logout]');
// Resolve the persisted session before showing either account state.
login.hidden=true;signed.hidden=true;
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
 if(!window.supabase?.createClient||!/^https:\/\/[\w-]+\.supabase\.co\/?$/.test(window.TYC_SUPABASE_URL||'')||!window.TYC_SUPABASE_PUBLISHABLE_KEY){showUser(null);return;}
 const client=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 client.auth.onAuthStateChange((event,session)=>{
   if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','INITIAL_SESSION','USER_UPDATED'].includes(event)){
     showUser(session?.user||null);
     // Defer queries from the auth callback to avoid auth-state reentrancy.
     setTimeout(()=>verifyAdmin(client,session?.user||null),0);
   }
 });
 // getSession reads the persisted session; administrator access is still verified by the database.
 const {data,error}=await client.auth.getSession();
 if(!error)showUser(data?.session?.user||null);
 else showUser(null);
 if(!error)void verifyAdmin(client,data?.session?.user||null);
 logout.addEventListener('click',async()=>{
  logout.disabled=true;logout.textContent='Signing out...';
  try{const {error}=await client.auth.signOut();if(error)throw error;showUser(null);}
  catch(error){window.alert('Could not log out. Please try again. / 로그아웃에 실패했습니다.');}
  finally{logout.disabled=false;logout.textContent='Log Out';}
 });
}
init().catch(()=>{showUser(null);});
})();

/* Compact, floating navigation announcements. Aggregate timestamps only. */
(()=>{'use strict';
const links=[...document.querySelectorAll('.tyc-header-nav > a, .public-topbar nav > a')];
const routes={'index.html':'home','blog.html':'blog','community.html':'community','pta-news.html':'news','jobs.html':'jobs','shop.html':'shop'};
const homeUpdated='2026-11-24T01:16:09Z'; // Latest HOME content commit; refreshed from GitHub below.
let stamps={home:homeUpdated}, seen={}, account=null, seenDb=null, authVersion=0, ready=false;
const currentPath=location.pathname.split('/').filter(Boolean).pop()||'index.html';
const currentSection=routes[currentPath.includes('.')?currentPath:currentPath+'.html'];
const openedAt=Date.now();
const guestSections=new Set(['home','news']);
const guestKey='tyc-nav-seen:guest';
function mergeSeen(section,value){const t=Date.parse(value);if(Number.isFinite(t))seen[section]=Math.max(seen[section]||0,t);}
function cacheSeen(){try{localStorage.setItem(account?'tyc-nav-seen:'+account:guestKey,JSON.stringify(seen));}catch{}}
async function markCurrent(){
 if(!currentSection||currentSection==='shop'||(!account&&!guestSections.has(currentSection)))return;
 const uid=account, section=currentSection;
 if((seen[section]||0)>=openedAt)return;
 seen[section]=openedAt;cacheSeen();paint();
 if(!uid||!seenDb)return;
 try{await seenDb.from('tyc_nav_seen').upsert({user_id:uid,section,seen_at:new Date(openedAt).toISOString()},{onConflict:'user_id,section'});}catch{}
}
async function loadSeen(session){
 const version=++authVersion,uid=session?.user?.id||null;
 account=uid;seen={};ready=false;
 if(!uid){try{seen=JSON.parse(localStorage.getItem(guestKey)||'{}')||{};}catch{}}
 if(uid){
  try{seen=JSON.parse(localStorage.getItem('tyc-nav-seen:'+uid)||'{}')||{};}catch{}
  try{const r=await seenDb.from('tyc_nav_seen').select('section,seen_at').eq('user_id',uid);
   if(version!==authVersion)return;
   if(!r.error)for(const row of r.data||[])mergeSeen(row.section,row.seen_at);
  }catch{}
 }
 if(version!==authVersion)return;
 ready=true;cacheSeen();await markCurrent();paint();
}
async function initSeen(){
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){await loadSeen(null);return;}
 seenDb=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data}=await seenDb.auth.getSession();
 await loadSeen(data?.session);
 seenDb.auth.onAuthStateChange((event,session)=>{
  if((session?.user?.id||null)!==account)setTimeout(()=>loadSeen(session),0);
 });
}

const style=document.createElement('style');
style.textContent=`
.tyc-nav-update{position:relative;display:inline-flex!important;align-items:center;gap:3px!important}
.tyc-nav-update .tyc-nav-bubble{position:absolute;left:calc(100% - 4px);bottom:calc(100% + 1px);z-index:2;display:inline-flex;align-items:center;justify-content:center;padding:3px 5px;border-radius:6px 6px 6px 2px;background:#fff;color:#193b2d;font:800 8px/1 Arial,sans-serif;letter-spacing:.015em;white-space:nowrap;text-decoration:none;box-shadow:0 2px 6px #0003;pointer-events:none;animation:tyc-nav-float 2.8s ease-in-out infinite}
.tyc-nav-bubble:after{content:"";position:absolute;left:4px;bottom:-3px;border-top:4px solid #fff;border-right:4px solid transparent}
.tyc-nav-update .tyc-nav-bubble.is-shop-launch{background:#E76F61;color:#fff;box-shadow:0 2px 8px #e76f6140}
.tyc-nav-update .tyc-nav-bubble.is-shop-launch:after{border-top-color:#E76F61}
@keyframes tyc-nav-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@media(min-width:721px){.tyc-nav-update .tyc-nav-bubble{left:auto;right:-6px;bottom:calc(100% + 2px)}}
@media(max-width:720px){.tyc-nav-update .tyc-nav-bubble{position:relative;left:auto;bottom:auto;margin-left:7px;align-self:center}.tyc-nav-update .tyc-nav-bubble:after{bottom:-2px}}
@media(prefers-reduced-motion:reduce){.tyc-nav-update .tyc-nav-bubble{animation:none}}
`;
document.head.append(style);
const pacificDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'});
function paint(){
 const now=Date.now();
 for(const a of links){
  const url=new URL(a.href,location.href);if(url.origin!==location.origin)continue;
  let p=url.pathname.split('/').filter(Boolean).pop()||'index.html';if(!p.includes('.'))p+='.html';
  const k=routes[p];if(!k)continue;
  const t=Date.parse(stamps[k]),age=now-t,updated=k==='home'||k==='news';
  const show=k==='shop'||(ready&&Number.isFinite(t)&&age>=0&&((!account&&!guestSections.has(k))||t>(seen[k]||0))&&(updated?age<7*86400000:pacificDate.format(t)===pacificDate.format(now)));
  let b=a.querySelector('.tyc-nav-bubble');
  if(!show){b?.remove();a.classList.remove('tyc-nav-update');continue;}
  if(!b){b=document.createElement('span');b.className='tyc-nav-bubble';b.textContent=k==='shop'?'2028':updated?'UPDATED':'NEW';if(k==='shop')b.classList.add('is-shop-launch');a.append(b);}
  a.classList.add('tyc-nav-update');
 }
}
async function refresh(){
 try{
  const url=window.TYC_SUPABASE_URL,key=window.TYC_SUPABASE_PUBLISHABLE_KEY;
  if(url&&key){const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/rpc/tyc_nav_activity',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:'{}',cache:'no-store'});if(r.ok)Object.assign(stamps,await r.json());}
 }catch{}
 paint();
}
async function refreshHome(){
 try{
  const cacheKey='tyc-home-nav-update-v1';let cache=null;
  try{cache=JSON.parse(sessionStorage.getItem(cacheKey)||'null')}catch{}
  if(cache&&Date.now()-cache.checked<3600000){stamps.home=cache.date;paint();return;}
  const r=await fetch('https://api.github.com/repos/edwardhyl1989-design/theyoungclub-website/commits?path=index.html&per_page=1',{headers:{Accept:'application/vnd.github+json'}});
  if(r.ok){const data=await r.json(),date=data[0]?.commit?.committer?.date;if(date){stamps.home=date;try{sessionStorage.setItem(cacheKey,JSON.stringify({date,checked:Date.now()}))}catch{}paint();}}
 }catch{}
}
paint();refresh();refreshHome();initSeen().catch(()=>loadSeen(null));setInterval(refresh,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();refreshHome();}});
})();
