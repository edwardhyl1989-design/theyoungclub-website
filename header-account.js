/* Shared, stable My Account dropdown: show all authorized links at once. */
(()=>{'use strict';
 const root=document.querySelector('[data-account-header]');
 if(!root)return;
 const login=root.querySelector('[data-login-link]');
 const signed=root.querySelector('[data-account-signed]');
 const trigger=root.querySelector('[data-account-trigger]');
 const menu=root.querySelector('[data-account-menu]');
 const logout=root.querySelector('[data-account-logout]');
 if(!login||!signed||!trigger||!menu||!logout)return;

 // Return to the page the visitor used BEFORE opening My Profile.
 // A per-tab session record also covers browsers that omit the Referrer header.
 const profileReturnKey='tyc-profile-return';
 const currentPage=(window.location.pathname.split('/').filter(Boolean).pop()||'index.html').toLowerCase();
 const isProfilePage=currentPage==='profile.html'||currentPage==='profile';
 function safeProfileReturn(raw){
  if(typeof raw!=='string'||!raw)return null;
  try{
   const url=new URL(raw,window.location.href);
   if(url.origin!==window.location.origin)return null;
   const page=(url.pathname.split('/').filter(Boolean).pop()||'index.html').toLowerCase();
   // Never land on a logged-out-only, signed-in-only, or profile page.
   if(page==='profile.html'||page==='profile'||page==='auth.html'||page==='auth'
      ||page.startsWith('admin-'))return null;
   return url.pathname+url.search+url.hash;
  }catch{return null;}
 }
 function saveProfileReturn(path){
  const safe=safeProfileReturn(path);
  if(!safe)return;
  try{window.sessionStorage.setItem(profileReturnKey,JSON.stringify({path:safe,time:Date.now()}));}catch{}
 }
 function getProfileReturn(){
  try{
   const saved=JSON.parse(window.sessionStorage.getItem(profileReturnKey)||'null');
   if(saved&&typeof saved.time==='number'&&Date.now()-saved.time<86400000){
    return safeProfileReturn(saved.path)||'index.html';
   }
  }catch{}
  return 'index.html';
 }
 if(isProfilePage){
  // For links outside the account dropdown, the browser referrer is the fallback.
  if(document.referrer)saveProfileReturn(document.referrer);
 }else{
  // On every regular page, record its location before the visitor opens Profile.
  saveProfileReturn(window.location.href);
 }


 // Custom display:flex rules must never override the hidden HTML attribute.
 if(!document.getElementById('tyc-account-hidden-safety')){
  const style=document.createElement('style');
  style.id='tyc-account-hidden-safety';
  style.textContent='[data-account-header] [hidden]{display:none!important}';
  document.head.append(style);
 }
 login.hidden=true;signed.hidden=true;menu.hidden=true;
 trigger.setAttribute('aria-expanded','false');

 // Normalize role links across every page before any menu becomes visible.
 const adminItems=[
  ['admin-members.html','Member Management'],
  ['admin-content.html','Content Report'],
  ['admin-support.html','Message Inbox'],
  ['admin-analytics.html','Visitor Analysis'],
  ...(['shop.html','shop'].includes(currentPage)?[['admin-apparel.html','Shop Manager']]:[])
 ];
 const allowedAdminHrefs=new Set(adminItems.map(([href])=>href));
 for(const link of menu.querySelectorAll('a[href]')){
  const href=link.getAttribute('href');
  if((href.startsWith('admin-')||link.hasAttribute('data-admin-only'))&&!allowedAdminHrefs.has(href))link.remove();
 }
 const adminItemLinks=new Map();
 let anchor=logout;
 for(let i=adminItems.length-1;i>=0;i--){
  const [href,label]=adminItems[i];
  let link=Array.from(menu.querySelectorAll('a[href]')).find(a=>
   a.getAttribute('href')===href
  );
  if(!link){link=document.createElement('a');link.href=href;}
  link.textContent=label;
  link.setAttribute('data-admin-only','');
  link.hidden=true;
  menu.insertBefore(link,anchor);
  adminItemLinks.set(href,link);
  anchor=link;
 }
 const adminLinks=[...menu.querySelectorAll('[data-admin-only]')];
 function setAdminLinks(allowed){for(const link of adminLinks)link.hidden=!allowed;}
 // Pending administrator work, not general "new post" indicators.
 const attentionStyle=document.createElement('link');
 attentionStyle.rel='stylesheet';
 attentionStyle.href='admin-account-alerts.css?v=1';
 document.head.append(attentionStyle);
 const alertQueues=[
  {href:'admin-members.html',key:'members',name:'New member applications',table:'pta_members',status:'membership_status',column:'user_id'},
  {href:'admin-members.html#admin-nickname-requests',key:'nicknames',name:'Nickname change requests',table:'tyc_nickname_change_requests',status:'status',column:'id'},
  {href:'admin-content.html',key:'reports',name:'Pending content reports',table:'pta_content_reports',status:'status',column:'id'},
  {href:'admin-support.html',key:'support',name:'Unread support conversations',rpc:'tyc_support_admin_unread_count'}
 ];
 const triggerLabelBefore=trigger.getAttribute('aria-label');
 const triggerTitleBefore=trigger.getAttribute('title');
 const originalLabels=new Map([...adminItemLinks].map(([href,link])=>[href,link.getAttribute('aria-label')]));
 const originalTitles=new Map([...adminItemLinks].map(([href,link])=>[href,link.getAttribute('title')]));
 let alertClient=null,alertUid=null,alertRunning=null,lastAlertCheck=0;
 let alertCounts={members:0,nicknames:0,reports:0,support:0};
 function restoreAttribute(node,key,value){
  if(value===null)node.removeAttribute(key);else node.setAttribute(key,value);
 }
 function setIndicator(node,show){
  let dot=Array.from(node.children).find(el=>el.classList?.contains('tyc-admin-alert-indicator'));
  if(show&&!dot){
   dot=document.createElement('span');
   dot.className='tyc-admin-alert-indicator';
   dot.textContent='!';
   dot.setAttribute('aria-hidden','true');
   node.append(dot);
  }else if(!show){dot?.remove();}
 }
 function paintAdminAlerts(){
  let total=0;
  const grouped=new Map();
  for(const q of alertQueues){
   const href=q.key==='nicknames'?'admin-members.html':q.href;
   const count=alertUid?(alertCounts[q.key]||0):0;
   total+=count;
   if(!grouped.has(href))grouped.set(href,[]);
   if(count>0)grouped.get(href).push(q.name+': '+count+' pending');
  }
  for(const [href,details] of grouped){
   const link=adminItemLinks.get(href);if(!link)continue;
   const show=details.length>0;
   setIndicator(link,show);
   link.classList.toggle('tyc-admin-alert-link',show);
   if(show){
    const detail=link.textContent.replace(/!$/,'').trim()+' — '+details.join('; ');
    link.setAttribute('aria-label',detail);link.setAttribute('title',detail);
   }else{
    restoreAttribute(link,'aria-label',originalLabels.get(href)??null);
    restoreAttribute(link,'title',originalTitles.get(href)??null);
   }
  }
  setIndicator(trigger,!!alertUid&&total>0);
  if(alertUid&&total>0){
   trigger.setAttribute('aria-label','My Account — '+total+' pending administrator notifications');
   trigger.setAttribute('title','Admin notifications: '+total+' pending / 관리자 처리 대기 '+total+'건');
  }else{
   restoreAttribute(trigger,'aria-label',triggerLabelBefore);
   restoreAttribute(trigger,'title',triggerTitleBefore);
  }
 }
 function clearAdminAlerts(){
  alertClient=null;alertUid=null;alertRunning=null;lastAlertCheck=0;
  alertCounts={members:0,nicknames:0,reports:0,support:0};
  paintAdminAlerts();
 }
 async function refreshAdminAlerts(force=false){
  if(!alertClient||!alertUid||document.hidden)return;
  if(alertRunning)return alertRunning;
  if(!force&&Date.now()-lastAlertCheck<12000)return;
  const client=alertClient,uid=alertUid,version=checkVersion;
  lastAlertCheck=Date.now();
  const promise=Promise.all(alertQueues.map(async q=>{
   try{
    if(q.rpc){
     const result=await client.rpc(q.rpc);
     return {key:q.key,count:result.error||!Number.isFinite(result.data)?null:result.data};
    }
    const result=await client.from(q.table)
     .select(q.column,{count:'exact',head:true}).eq(q.status,'pending');
    return {key:q.key,count:result.error||!Number.isFinite(result.count)?null:result.count};
   }catch{return {key:q.key,count:null};}
  })).then(results=>{
   if(uid!==alertUid||uid!==currentUserId||version!==checkVersion)return;
   for(const row of results)if(row.count!==null)alertCounts[row.key]=row.count;
   paintAdminAlerts();
  });
  alertRunning=promise;
  try{await promise;}finally{if(alertUid===uid)alertRunning=null;}
 }
 window.setInterval(()=>{void refreshAdminAlerts(true);},45000);
 window.addEventListener('focus',()=>{void refreshAdminAlerts();});
 window.addEventListener('pageshow',()=>{void refreshAdminAlerts();});
 window.addEventListener('tyc-admin-queue-updated',()=>{void refreshAdminAlerts(true);});
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden)void refreshAdminAlerts(true);
 });

 const hideMenu=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');};
 function showMenu(){if(!signed.hidden){menu.hidden=false;trigger.setAttribute('aria-expanded','true');}}
 // Same-user auth events, including refresh, must not reset the menu.
 let currentUserId=undefined,ready=false,checkVersion=0;
 async function applyUser(user,client){
  const uid=user?.id||null;
  if(uid===currentUserId)return;
  currentUserId=uid;
  ready=false;
  const version=++checkVersion;
  hideMenu();
  login.hidden=true;signed.hidden=true;setAdminLinks(false);
  clearAdminAlerts();
  if(!uid){ready=true;login.hidden=false;return;}
  let isAdmin=false;
  try{
   const {data,error}=await client.from('job_admins').select('user_id').eq('user_id',uid).maybeSingle();
   isAdmin=!error&&!!data;
  }catch{}
  if(version!==checkVersion||currentUserId!==uid)return;
  if(isAdmin){
   alertClient=client;alertUid=uid;
   // Prepare the badges before showing the menu. A slow connection must not
   // prevent My Account from opening, and late responses are version-guarded.
   await Promise.race([
    refreshAdminAlerts(true),
    new Promise(resolve=>setTimeout(resolve,2600))
   ]);
  }
  if(version!==checkVersion||currentUserId!==uid)return;
  // Reveal one consistent dropdown; subsequent refreshes only change badges.
  setAdminLinks(isAdmin);
  ready=true;signed.hidden=false;login.hidden=true;
 }
 if(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches){
  signed.addEventListener('mouseenter',()=>{if(ready){showMenu();void refreshAdminAlerts();}});
  signed.addEventListener('mouseleave',hideMenu);
 }
 trigger.addEventListener('click',()=>{
  if(!ready||signed.hidden)return;
  if(menu.hidden){showMenu();void refreshAdminAlerts();}else hideMenu();
 });
 document.addEventListener('click',event=>{if(!root.contains(event.target))hideMenu();});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!menu.hidden){hideMenu();trigger.focus();}
 });
 async function init(){
  const valid=window.supabase?.createClient
   &&/^https:\/\/[\w-]+\.supabase\.co\/?$/.test(window.TYC_SUPABASE_URL||'')
   &&window.TYC_SUPABASE_PUBLISHABLE_KEY;
  if(!valid){await applyUser(null,null);return;}
  const client=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
  let bootstrapped=false,queued=false,queuedSession=null;
  client.auth.onAuthStateChange((event,session)=>{
   if(event==='INITIAL_SESSION')return;
   if(!['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','USER_UPDATED'].includes(event))return;
   if(!bootstrapped){queued=true;queuedSession=session;return;}
   // Never query the database while inside Supabase's auth callback.
   setTimeout(()=>{void applyUser(session?.user||null,client);},0);
  });
  let firstUser=null;
  try{
   const {data,error}=await client.auth.getSession();
   if(!error)firstUser=data?.session?.user||null;
  }catch{}
  bootstrapped=true;
  if(queued)firstUser=queuedSession?.user||null;
  await applyUser(firstUser,client);
  logout.addEventListener('click',async()=>{
   if(!ready||signed.hidden)return;
   hideMenu();logout.disabled=true;
   const oldText=logout.textContent;
   logout.textContent='Signing out...';
   try{
    const {error}=await client.auth.signOut();
    if(error)throw error;
    await applyUser(null,client);
    if(isProfilePage){
     const destination=getProfileReturn();
     try{window.sessionStorage.removeItem(profileReturnKey);}catch{}
     window.location.replace(destination);
    }
   }catch{window.alert('Could not log out. Please try again. / 로그아웃에 실패했습니다.');}
   finally{logout.disabled=false;logout.textContent=oldText;}
  });
 }
 init().catch(()=>{
  ++checkVersion;currentUserId=null;setAdminLinks(false);clearAdminAlerts();hideMenu();
  signed.hidden=true;login.hidden=false;
 });
})();

/* Compact, floating navigation announcements. Aggregate timestamps only. */
(()=>{'use strict';
const links=[...document.querySelectorAll('.tyc-header-nav > a, .public-topbar nav > a')];
const routes={'index.html':'home','blog.html':'blog','community.html':'community','pta-news.html':'news','jobs.html':'jobs','shop.html':'shop'};
let stamps={home:null}, seen={}, account=null, seenDb=null, authVersion=0, ready=false;
const currentPath=location.pathname.split('/').filter(Boolean).pop()||'index.html';
const currentSection=routes[currentPath.includes('.')?currentPath:currentPath+'.html'];
let openedAt=Date.now();
const guestSections=new Set(['home','news']);
const guestKey='tyc-nav-seen:guest';
function mergeSeen(section,value){const t=Date.parse(value);if(Number.isFinite(t))seen[section]=Math.max(seen[section]||0,t);}
function seenKey(){return account?'tyc-nav-seen:'+account:guestKey;}
function readCache(){try{const saved=JSON.parse(localStorage.getItem(seenKey())||'{}')||{};for(const [k,v] of Object.entries(saved))if(Number.isFinite(v))seen[k]=Math.max(seen[k]||0,v);}catch{}}
function cacheSeen(){readCache();try{localStorage.setItem(seenKey(),JSON.stringify(seen));}catch{}}
function sectionFor(href){try{const u=new URL(href,location.href);if(u.origin!==location.origin)return null;const p=u.pathname.split('/').filter(Boolean).pop()||'index.html';return routes[p.includes('.')?p:p+'.html'];}catch{return null;}}
function markLocal(section,at){if(!section||section==='shop'||(!account&&!guestSections.has(section)))return;seen[section]=Math.max(seen[section]||0,at);cacheSeen();paint();}

async function markCurrent(){
 if(!currentSection||currentSection==='shop'||(!account&&!guestSections.has(currentSection)))return;
 const uid=account, section=currentSection;
 markLocal(section,openedAt);
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
 readCache();
 const now=Date.now();
 for(const a of links){
  const url=new URL(a.href,location.href);if(url.origin!==location.origin)continue;
  let p=url.pathname.split('/').filter(Boolean).pop()||'index.html';if(!p.includes('.'))p+='.html';
  const k=routes[p];if(!k)continue;
  const t=Date.parse(stamps[k]),age=now-t,updated=k==='home'||k==='news';
  const show=k==='shop'||(ready&&Number.isFinite(t)&&age>=0&&((!account&&!guestSections.has(k))||t>(seen[k]||0))&&(updated||pacificDate.format(t)===pacificDate.format(now)));
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
  const r=await fetch(new URL('home-content-release.json',location.origin+'/'),{cache:'no-store'});
  if(r.ok){const data=await r.json();const t=Date.parse(data.publishedAt);stamps.home=Number.isFinite(t)&&t<=Date.now()?data.publishedAt:null;}
 }catch{}
 paint();
}
// Record public navigation immediately, before the browser leaves the current page.
document.addEventListener('click',event=>{
 const a=event.target?.closest?.('a[href]');if(!a||!ready||event.defaultPrevented)return;
 if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||a.target==='_blank')return;
 const k=sectionFor(a.href);if(k&&k!=='community')markLocal(k,Date.now());
},true);
window.addEventListener('storage',event=>{if(event.key===seenKey())paint();});
window.addEventListener('pageshow',event=>{if(event.persisted){openedAt=Date.now();readCache();void markCurrent();refresh();refreshHome();}});
paint();refresh();refreshHome();initSeen().catch(()=>loadSeen(null));setInterval(refresh,60000);setInterval(refreshHome,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){readCache();paint();refresh();refreshHome();}});
})();


/* Permanent tiny administrator entry point; the visitor stars are unrelated
   and remain noninteractive. The existing Log In and My Account are unchanged. */
(()=>{
 'use strict';
 if(!document.querySelector('[data-account-header]'))return;
 if(document.querySelector('script[data-tyc-admin-star]'))return;
 const style=document.createElement('link');style.rel='stylesheet';
 style.href='admin-star.css?v=2';document.head.append(style);
 const script=document.createElement('script');script.src='admin-star.js?v=code6';
 script.dataset.tycAdminStar='';document.body.append(script);
})();
