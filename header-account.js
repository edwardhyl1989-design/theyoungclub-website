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
 const isClubPage=/^the-club(?:\.html)?$/.test(currentPage),englishUI=isClubPage||document.documentElement.hasAttribute('data-english-only')||(document.documentElement.dataset.communityLanguage==='en'||/\/community-en(?:\.html)?\/?$/i.test(location.pathname));
 const isShopPage=/^shop(?:\.html)?$/.test(currentPage);
 const isShopContext=isShopPage||/^(?:product|admin-apparel)(?:\.html)?$/.test(currentPage);
 const reportsHref=isClubPage?'the-club.html?reports=1':'admin-content.html';
 const isProfilePage=currentPage==='profile.html'||currentPage==='profile';
 const isMemberManagement=currentPage==='admin-members.html'||currentPage==='admin-members';
 const memberReturnKey='tyc-member-management-return';
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
 if(isMemberManagement){
  const previous=safeProfileReturn(document.referrer);
  if(previous){try{window.sessionStorage.setItem(memberReturnKey,previous);}catch{}}
  else if(document.referrer&&!document.referrer.startsWith(window.location.origin+'/')){try{window.sessionStorage.removeItem(memberReturnKey);}catch{}}
 }
 function memberReturn(){
  try{return safeProfileReturn(window.sessionStorage.getItem(memberReturnKey))||'index.html';}catch{return 'index.html';}
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

 // The profile credential comes only from the approved membership row.
 // Reuse the homepage's compact green/gold shield motif, without experience years.
 const profileLink=[...menu.querySelectorAll('a[href]')].find(a=>{
  try{const u=new URL(a.getAttribute('href'),location.href);return u.origin===location.origin&&/\/profile(?:\.html)?\/?$/i.test(u.pathname);}catch{return false;}
 });
 const profileBadge=document.createElement('span');
 profileBadge.className='tyc-account-profile-badge';profileBadge.hidden=true;
 if(profileLink)profileLink.append(profileBadge);
 const badgeStyle=document.createElement('style');
 badgeStyle.textContent=`
 [data-account-menu] a>.tyc-account-profile-badge{display:inline-flex!important;vertical-align:middle;align-items:center;gap:3px;white-space:nowrap;margin-inline-start:8px;font:800 10px/1 Arial,sans-serif;letter-spacing:.02em;color:#34724b;pointer-events:none}
 [data-account-menu] a>.tyc-account-profile-badge[hidden]{display:none!important}
 [data-account-menu] a>.tyc-account-profile-badge.is-spta{color:#966b20}
 [data-account-menu] .tyc-account-profile-badge svg{display:block;width:15px;height:17px;flex:none;overflow:visible}
 [data-account-menu] .tyc-account-profile-shine{opacity:0;transform:translateX(-4px) skewX(-18deg)}
 @keyframes tycAccountCredentialShine{0%,55%{opacity:0;transform:translateX(-4px) skewX(-18deg)}57%{opacity:.8}78%{opacity:.65;transform:translateX(35px) skewX(-18deg)}80%,100%{opacity:0;transform:translateX(35px) skewX(-18deg)}}
 @media(prefers-reduced-motion:no-preference){[data-account-menu] .tyc-account-profile-shine{animation:tycAccountCredentialShine 5s ease-in-out infinite}}
 `;
 if(profileLink)document.head.append(badgeStyle);
 function setProfileBadge(role){
  profileBadge.hidden=true;profileBadge.replaceChildren();profileBadge.removeAttribute('aria-label');
  if(!profileLink||(role!=='PTA'&&role!=='SPTA'))return;
  const student=role==='SPTA',fill=student?'#d0a64f':'#668d75',edge=student?'#a47a26':'#416d53',inner=student?'#f5dfaa':'#b7d1bc';
  const shield='M12 1.6C15 4 18.3 5.1 22 6v7.1c0 5.5-4.2 9.3-10 11.3C6.2 22.4 2 18.6 2 13.1V6c3.7-.9 7-2 10-4.4Z';
  profileBadge.classList.toggle('is-spta',student);
  profileBadge.innerHTML='<svg viewBox="0 0 24 26" aria-hidden="true" focusable="false"><defs><clipPath id="tyc-profile-shield-clip"><path d="'+shield+'"/></clipPath><linearGradient id="tyc-profile-shield-shine"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".78"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="'+shield+'" fill="'+fill+'" stroke="'+edge+'" stroke-width="1.2"/><path d="M12 4.8c2.4 1.7 5 2.7 7.5 3.4v4.9c0 4.1-3.1 7.1-7.5 8.9-4.4-1.8-7.5-4.8-7.5-8.9V8.2c2.5-.7 5.1-1.7 7.5-3.4Z" fill="none" stroke="'+inner+'" stroke-width="1.25"/><path d="m7.5 12.8 3.1 3.1 5.9-6" stroke="#fffdf7" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/><g clip-path="url(#tyc-profile-shield-clip)"><rect class="tyc-account-profile-shine" x="-8" y="-5" width="8" height="36" fill="url(#tyc-profile-shield-shine)"/></g></svg>';
  profileBadge.append(document.createTextNode(role));
  profileBadge.setAttribute('aria-label','Verified '+role);profileBadge.hidden=false;
 }
 let profileBadgeClient=null,profileBadgeRequest=0,profileBadgeLast=0;
 function clearProfileBadge(){++profileBadgeRequest;profileBadgeClient=null;profileBadgeLast=0;setProfileBadge(null);}
 async function refreshProfileBadge(force=false){
  const uid=currentUserId,client=profileBadgeClient;
  if(!profileLink||!uid||!client||(!force&&Date.now()-profileBadgeLast<30000))return;
  profileBadgeLast=Date.now();const request=++profileBadgeRequest,version=checkVersion;
  let role=null;
  try{const {data,error}=await client.from('pta_members').select('membership_status,member_type').eq('user_id',uid).maybeSingle();
   if(!error&&data?.membership_status==='approved')role=data.member_type;
  }catch{}
  if(request===profileBadgeRequest&&version===checkVersion&&uid===currentUserId)setProfileBadge(role);
 }

 // Normalize role links across every page before any menu becomes visible.
 const adminItems=[
  ['admin-users.html','All Users'],
  ['admin-members.html','Member Management'],
  ...(!isShopContext?[[reportsHref,'Reports']]:[]),
  ['admin-support.html','Message Inbox'],
  ['admin-analytics.html','Visitor Analysis'],
  ...(isShopPage?[['admin-apparel.html','Shop Manager']]:[])
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
  if(href==='admin-members.html'&&!isMemberManagement)link.addEventListener('click',()=>{const from=safeProfileReturn(window.location.href);if(from){try{window.sessionStorage.setItem(memberReturnKey,from);}catch{}}});
  adminItemLinks.set(href,link);
  anchor=link;
 }
 const adminLinks=[...menu.querySelectorAll('[data-admin-only]')];
 function setAdminLinks(permissions){
  const full=permissions?.full===true,community=full||permissions?.community===true,shop=full||permissions?.shop===true;
  for(const [href,link] of adminItemLinks){
   const allowed=href==='admin-users.html'?full:href==='admin-apparel.html'?shop:community;
   link.hidden=!allowed;
  }
 }
 // Pending administrator work, not general "new post" indicators.
 const attentionStyle=document.createElement('link');
 attentionStyle.rel='stylesheet';
 attentionStyle.href='admin-account-alerts.css?v=reports62';
 document.head.append(attentionStyle);
 const alertQueues=[
  {href:'admin-members.html',key:'members',name:'New member applications',table:'pta_members',status:'membership_status',column:'user_id'},
  {href:'admin-members.html#admin-nickname-requests',key:'nicknames',name:'Nickname change requests',table:'tyc_nickname_change_requests',status:'status',column:'id'},
  ...(isShopContext?[]:isClubPage?[{href:reportsHref,key:'clubReports',name:'Pending Club reports',table:'club_reports',column:'id'}]:[{href:reportsHref,key:'reports',name:'Pending PTA reports',table:'pta_content_reports',status:'status',column:'id'}]),
  {href:'admin-support.html',key:'support',name:'Unread support conversations',rpc:'tyc_support_admin_unread_count'}
 ];
 const triggerLabelBefore=trigger.getAttribute('aria-label');
 const triggerTitleBefore=trigger.getAttribute('title');
 const originalLabels=new Map([...adminItemLinks].map(([href,link])=>[href,link.getAttribute('aria-label')]));
 const originalTitles=new Map([...adminItemLinks].map(([href,link])=>[href,link.getAttribute('title')]));
 let alertClient=null,alertUid=null,alertRunning=null,lastAlertCheck=0;
 let alertCounts={members:0,nicknames:0,reports:0,clubReports:0,support:0};
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
 function paintReportsBanner(){
 const pta=alertUid&&!isClubPage&&!isShopContext?(alertCounts.reports||0):0,club=alertUid&&isClubPage?(alertCounts.clubReports||0):0,total=pta+club;
 let box=document.getElementById('tyc-reports-banner');
 if(!total){box?.remove();return;}
 if(!box){box=document.createElement('section');box.id='tyc-reports-banner';box.className='tyc-reports-banner';box.setAttribute('aria-label','Administrator reports');const icon=document.createElement('span');icon.className='tyc-reports-pulse';icon.textContent='!';icon.setAttribute('aria-hidden','true');const content=document.createElement('div');content.className='tyc-reports-summary';const title=document.createElement('strong');title.textContent=(englishUI?'Reports':'Reports / 신고 관리');const count=document.createElement('span');count.className='tyc-reports-total';content.append(title,count);const links=document.createElement('div');links.className='tyc-reports-links';const a=document.createElement('a');a.href='admin-content.html';a.dataset.reportsSource='pta';const b=document.createElement('a');b.href='the-club.html?reports=1';b.dataset.reportsSource='club';links.append(a,b);box.append(icon,content,links);const header=root.closest('header');if(header)header.insertAdjacentElement('afterend',box);else document.body.prepend(box);}
 box.querySelector('.tyc-reports-total').textContent=(englishUI?total+' pending':total+' pending · 미처리 '+total+'건');const ptaLink=box.querySelector('[data-reports-source=pta]'),clubLink=box.querySelector('[data-reports-source=club]');ptaLink.textContent='PTA COMMUNITY · '+pta;clubLink.textContent='THE CLUB · '+club;ptaLink.style.display=isClubPage?'none':'';clubLink.style.display=isClubPage?'':'none';
}
function paintAdminAlerts(){
  paintReportsBanner();
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
   trigger.setAttribute('title','Admin notifications: '+total+(englishUI?' pending':' pending / 관리자 처리 대기 '+total+'건'));
  }else{
   restoreAttribute(trigger,'aria-label',triggerLabelBefore);
   restoreAttribute(trigger,'title',triggerTitleBefore);
  }
 }
 function clearAdminAlerts(){
  alertClient=null;alertUid=null;alertRunning=null;lastAlertCheck=0;
  alertCounts={members:0,nicknames:0,reports:0,clubReports:0,support:0};
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
    let query=client.from(q.table).select(q.column,{count:'exact',head:true});if(q.status)query=query.eq(q.status,'pending');const result=await query;
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


 // Ban reasons are only returned to the affected authenticated user by a
 // narrow server-side RPC, then the browser is signed out immediately.
 let recentlyBannedUser=null;
 function showBanNotice(info){
  const reason=String(info?.reason||'Account access restricted');
  let dlg=document.getElementById('tyc-banned-account-dialog');
  if(!dlg){
   const style=document.createElement('link');style.rel='stylesheet';
   style.href='banned-account.css?v=1';document.head.append(style);
   dlg=document.createElement('dialog');dlg.id='tyc-banned-account-dialog';
   dlg.className='tyc-banned-account-dialog';
   dlg.setAttribute('aria-labelledby','tyc-ban-notice-title');
   const heading=document.createElement('h2');heading.id='tyc-ban-notice-title';
   heading.textContent=(englishUI?'Account Banned':'Account Banned / 계정 이용 제한');
   const explanation=document.createElement('p');
   explanation.textContent=(englishUI?'This account has been banned from THE YOUNG CLUB.':'This account has been banned from THE YOUNG CLUB. / 회원 계정이 강퇴 처리되었습니다.');
   const label=document.createElement('strong');label.textContent=(englishUI?'Reason':'Reason / 강퇴 사유');
   const detail=document.createElement('p');detail.className='tyc-banned-reason';detail.id='tyc-banned-reason';
   const next=document.createElement('p');
   next.textContent=(englishUI?'This account cannot be restored directly. An administrator must delete the old account before you can register again.':'This account cannot be restored directly. An administrator must delete the old account before you can register again. / 기존 계정을 관리자가 삭제해야 새로 가입할 수 있습니다.');
   const support=document.createElement('p');
   support.textContent=(englishUI?'You can still contact the administrator as a guest.':'You can still contact the administrator as a guest. / 비회원으로 관리자에게 문의할 수 있습니다.');
   const actions=document.createElement('div');actions.className='tyc-banned-actions';
   const contact=document.createElement('a');contact.href='blog.html';
   contact.textContent=(englishUI?'Contact Admin as Guest':'Contact Admin as Guest / 비회원 문의');
   const close=document.createElement('button');close.type='button';close.textContent=(englishUI?'Close':'Close / 닫기');
   close.addEventListener('click',()=>dlg.close());
   actions.append(contact,close);dlg.append(heading,explanation,label,detail,next,support,actions);
   document.body.append(dlg);
  }
  dlg.querySelector('#tyc-banned-reason').textContent=reason;
  if(!dlg.open)dlg.showModal();
 }
 window.TYC_SHOW_BAN_NOTICE=showBanNotice;
 async function checkBannedAccount(client,uid){
  if(recentlyBannedUser===uid){showBanNotice(window.__tycRecentlyBanned);return true;}
  const response=await client.rpc('tyc_my_ban_status');
  if(response.error)throw response.error;
  if(!response.data?.banned)return false;
  const details=response.data;
  recentlyBannedUser=uid;
  // Store the reason only within this page's lifetime, not in localStorage.
  window.__tycRecentlyBanned={user_id:uid,reason:String(details.reason||'Account restricted')};
  try{await client.auth.signOut();}catch{}
  showBanNotice(details);return true;
 }
 window.TYC_CHECK_BAN=async(client,uid)=>{
  if(window.__tycRecentlyBanned?.user_id===uid){
   showBanNotice(window.__tycRecentlyBanned);return true;
  }
  return checkBannedAccount(client,uid);
 };

 const hideMenu=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');};
 function showMenu(){if(!signed.hidden){menu.hidden=false;trigger.setAttribute('aria-expanded','true');void refreshProfileBadge();}}
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
  clearAdminAlerts();clearProfileBadge();
  if(!uid){ready=true;login.hidden=false;return;}
  try{
   if(await window.TYC_CHECK_BAN(client,uid)){
    if(version===checkVersion){ready=true;login.hidden=false;signed.hidden=true;}
    return;
   }
  }catch(error){
   // Fail closed when account standing cannot be verified.
   try{await client.auth.signOut();}catch{}
   if(version===checkVersion){ready=true;login.hidden=false;signed.hidden=true;}
   return;
  }
  if(version!==checkVersion||currentUserId!==uid)return;
  profileBadgeClient=client;void refreshProfileBadge(true);
  let permissions={full:false,community:false,shop:false};
  try{
   const [full,community,shop]=await Promise.all([
    client.from('job_admins').select('user_id').eq('user_id',uid).maybeSingle(),
    client.rpc('tyc_has_staff_scope',{p_scope:'community'}),
    client.rpc('tyc_has_staff_scope',{p_scope:'shop'})
   ]);
   permissions={full:!full.error&&!!full.data,community:!community.error&&community.data===true,shop:!shop.error&&shop.data===true};
  }catch{}
  if(version!==checkVersion||currentUserId!==uid)return;
  if(permissions.full||permissions.community){
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
  setAdminLinks(permissions);
  ready=true;signed.hidden=false;login.hidden=true;
 }
 if(!root.hasAttribute('data-account-click-only')&&window.matchMedia?.('(hover: hover) and (pointer: fine)').matches){
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
  // Ban actions must also affect accounts that were already signed in.
  // While the tab is visible, recheck standing without waiting for navigation.
  let banCheckRunning=false;
  window.setInterval(async()=>{
   if(document.hidden||!currentUserId||banCheckRunning)return;
   banCheckRunning=true;
   try{await window.TYC_CHECK_BAN(client,currentUserId);}catch{}finally{banCheckRunning=false;}
  },45000);
  logout.addEventListener('click',async()=>{
   if(!ready||signed.hidden)return;
   hideMenu();logout.disabled=true;
   const oldText=logout.textContent;
   logout.textContent='Signing out...';
   try{
    const {error}=await client.auth.signOut();
    if(error)throw error;
    await applyUser(null,client);
    if(isMemberManagement){
     const destination=memberReturn();
     try{window.sessionStorage.removeItem(memberReturnKey);}catch{}
     window.location.replace(destination);
    }else if(isProfilePage){
     const destination=getProfileReturn();
     try{window.sessionStorage.removeItem(profileReturnKey);}catch{}
     window.location.replace(destination);
    }
   }catch{window.alert((englishUI?'Could not log out. Please try again.':'Could not log out. Please try again. / 로그아웃에 실패했습니다.'));}
   finally{logout.disabled=false;logout.textContent=oldText;}
  });
 }
 init().catch(()=>{
  ++checkVersion;currentUserId=null;setAdminLinks(false);clearAdminAlerts();clearProfileBadge();hideMenu();
  signed.hidden=true;login.hidden=false;
 });
})();

/* Compact, floating navigation announcements. Aggregate timestamps only. */
(()=>{'use strict';
const links=[...document.querySelectorAll('.tyc-header-nav > a, .public-topbar nav > a, .community-language-links > a, .choices > a.choice')];
const routes={'index.html':'home','blog.html':'blog','community.html':'community','community-ko.html':'community_ko','community-en.html':'community_en','pta-news.html':'news','jobs.html':'jobs','shop.html':'shop','the-club.html':'club'};
let stamps={home:null}, seen={}, account=null, seenDb=null, authVersion=0, ready=false;
const currentPath=location.pathname.split('/').filter(Boolean).pop()||'index.html';
const currentSection=routes[currentPath.includes('.')?currentPath:currentPath+'.html'];
let openedAt=Date.now();
const guestSections=new Set(['home','news','club']);
const guestKey='tyc-nav-seen:guest';
function mergeSeen(section,value){const t=Date.parse(value);if(Number.isFinite(t))seen[section]=Math.max(seen[section]||0,t);}
function seenKey(){return account?'tyc-nav-seen:'+account:guestKey;}
function readCache(){try{const saved=JSON.parse(localStorage.getItem(seenKey())||'{}')||{};for(const [k,v] of Object.entries(saved))if(Number.isFinite(v))seen[k]=Math.max(seen[k]||0,v);}catch{}}
function cacheSeen(){readCache();try{localStorage.setItem(seenKey(),JSON.stringify(seen));}catch{}}
function sectionFor(href){try{const u=new URL(href,location.href);if(u.origin!==location.origin)return null;const p=u.pathname.split('/').filter(Boolean).pop()||'index.html';return routes[p.includes('.')?p:p+'.html'];}catch{return null;}}
function markLocal(section,at){if(!section||section==='shop'||(!account&&!guestSections.has(section)))return;seen[section]=Math.max(seen[section]||0,at);cacheSeen();paint();}

async function markCurrent(){
 if(!currentSection||currentSection==='community'||currentSection==='shop'||(!account&&!guestSections.has(currentSection)))return;
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
const newBadgeDuration=24*60*60*1000;
let navExpiryTimer=null;
function paint(){
 readCache();
 clearTimeout(navExpiryTimer);
 const now=Date.now();let nextExpiry=Infinity;
 for(const a of links){
  const url=new URL(a.href,location.href);if(url.origin!==location.origin)continue;
  let p=url.pathname.split('/').filter(Boolean).pop()||'index.html';if(!p.includes('.'))p+='.html';
  const k=routes[p];if(!k)continue;
  const communityPending=['community_ko','community_en'].filter(key=>Date.parse(stamps[key])>(seen[key]||0));const t=k==='community'&&('community_ko' in stamps||'community_en' in stamps)?Math.max(...communityPending.map(key=>Date.parse(stamps[key]))):Date.parse(stamps[k]),age=now-t,updated=k==='home'||k==='news';
  const show=k==='shop'||(ready&&Number.isFinite(t)&&age>=0&&((!account&&!guestSections.has(k))||t>(seen[k]||0))&&(updated||age<newBadgeDuration));
  let b=a.querySelector('.tyc-nav-bubble');
  if(!show){b?.remove();a.classList.remove('tyc-nav-update');continue;}
  if(!b){b=document.createElement('span');b.className='tyc-nav-bubble';b.textContent=k==='shop'?'2028':updated?'UPDATED':'NEW';if(k==='shop')b.classList.add('is-shop-launch');a.append(b);}
  a.classList.add('tyc-nav-update');
  if(k!=='shop'&&!updated)nextExpiry=Math.min(nextExpiry,t+newBadgeDuration);
 }
 if(Number.isFinite(nextExpiry))navExpiryTimer=setTimeout(paint,Math.max(0,nextExpiry-Date.now())+25);
}
let navActivityRunning=false,homeReleaseRunning=false;
async function refresh(){
 if(document.hidden||navActivityRunning)return;
 navActivityRunning=true;
 try{
  const url=window.TYC_SUPABASE_URL,key=window.TYC_SUPABASE_PUBLISHABLE_KEY;
  if(url&&key){const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/rpc/tyc_nav_activity',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:'{}',cache:'no-store'});if(r.ok)Object.assign(stamps,await r.json());}
 }catch{}finally{navActivityRunning=false;}
 paint();
}
async function refreshHome(){
 if(document.hidden||homeReleaseRunning)return;
 homeReleaseRunning=true;
 try{
  const r=await fetch(new URL('home-content-release.json',location.origin+'/'),{cache:'no-store'});
  if(r.ok){const data=await r.json();const t=Date.parse(data.publishedAt);stamps.home=Number.isFinite(t)&&t<=Date.now()?data.publishedAt:null;}
 }catch{}finally{homeReleaseRunning=false;}
 paint();
}
// Record public navigation immediately, before the browser leaves the current page.
document.addEventListener('click',event=>{
 const a=event.target?.closest?.('a[href]');if(!a||!ready||event.defaultPrevented)return;
 if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||a.target==='_blank')return;
 const k=sectionFor(a.href);if(k&&!k.startsWith('community'))markLocal(k,Date.now());
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
 if(!document.querySelector('[data-account-header]')||document.querySelector('[data-account-header][data-no-admin-star]'))return;
 if(document.querySelector('script[data-tyc-admin-star]'))return;
 const style=document.createElement('link');style.rel='stylesheet';
 style.href='admin-star.css?v=2';document.head.append(style);
 const script=document.createElement('script');script.src=document.documentElement.hasAttribute('data-english-only')?'admin-star.js?v=english-news1':'admin-star.js?v=english-ui3';
 script.dataset.tycAdminStar='';document.body.append(script);
})();

/* Member messaging is loaded independently from administrator support. */
(()=>{if(!window.supabase?.createClient||document.querySelector('script[data-tyc-dm]'))return;const s=document.createElement('script');s.src='member-dm.js?v=chat-english-main1';s.dataset.tycDm='';document.body.append(s);})();


/* Non-identifying account activity heartbeat for full-admin user directory.
   Runs only for signed-in sessions; does not collect IPs or device location. */
(()=>{
 'use strict';
 if(document.querySelector('script[data-tyc-member-presence]'))return;
 const script=document.createElement('script');
 script.src='member-presence.js?v=1';script.dataset.tycMemberPresence='';
 document.body.append(script);
})();

/* Shared PTA COMMUNITY navigation: open language links directly, keeping the legacy chooser as a no-JS/deep-link fallback. */
(()=>{
 'use strict';
 function initCommunityDropdown(){
  const triggers=[...document.querySelectorAll('header nav a[href], .tyc-header-nav a[href]')].filter(a=>{try{const u=new URL(a.href,location.href);return u.origin===location.origin&&/\/community(?:\.html)?\/?$/.test(u.pathname)&&!u.search&&!u.hash&&a.textContent.trim().startsWith('PTA COMMUNITY');}catch{return false;}});
  if(!triggers.length||document.getElementById('tyc-community-nav-dropdown'))return;
  const style=document.createElement('style');
  style.textContent=`
#tyc-community-nav-dropdown{position:fixed;z-index:10000;box-sizing:border-box;width:190px;max-width:calc(100vw - 20px);padding:5px;border:1px solid #dcd8ca;border-radius:9px;background:#fffdf7;color:#214537;box-shadow:0 10px 27px #142b2830;font:700 12px/1.4 Arial,sans-serif}
#tyc-community-nav-dropdown[hidden]{display:none!important}
#tyc-community-nav-dropdown>a{display:flex;align-items:center;justify-content:space-between;gap:8px;box-sizing:border-box;padding:12px 11px;min-height:42px;border-radius:5px;color:#214537!important;text-decoration:none!important;background:transparent;border:0;white-space:nowrap}
#tyc-community-nav-dropdown>a+a{border-top:1px solid #e8e3d8}
#tyc-community-nav-dropdown>a:hover,#tyc-community-nav-dropdown>a:focus-visible{background:#e8eee4;color:#143e2d!important;outline:2px solid #91ad92;outline-offset:-2px}
#tyc-community-nav-dropdown>a[aria-current="page"]{background:#e8eee4}
#tyc-community-nav-dropdown .tyc-community-arrow{color:#94723b;font-size:15px}
a[data-tyc-community-toggle]{cursor:pointer}
a[data-tyc-community-toggle] .tyc-community-chevron{display:inline-block;margin-left:4px;width:5px;height:5px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:translateY(-2px) rotate(45deg);transition:transform .18s ease;flex:none}
a[data-tyc-community-toggle][aria-expanded="true"] .tyc-community-chevron{transform:translateY(1px) rotate(225deg)}
@media(prefers-reduced-motion:reduce){a[data-tyc-community-toggle] .tyc-community-chevron{transition:none}}
`;
  document.head.append(style);
  const menu=document.createElement('div');menu.id='tyc-community-nav-dropdown';menu.hidden=true;menu.setAttribute('role','group');menu.setAttribute('aria-label','PTA Community languages');
  for(const [label,href] of [['ENGLISH','community-en.html'],['KOREAN','community-ko.html']]){
   const a=document.createElement('a');a.href=href;a.textContent=label;
   const arrow=document.createElement('span');arrow.className='tyc-community-arrow';arrow.textContent='→';arrow.setAttribute('aria-hidden','true');a.append(arrow);
   if(location.pathname.replace(/\.html$/,'')===new URL(href,location.href).pathname.replace(/\.html$/,''))a.setAttribute('aria-current','page');
   menu.append(a);
  }
  document.body.append(menu);let active=null;
  function close(restore=false){if(!active)return;const previous=active;active=null;menu.hidden=true;previous.setAttribute('aria-expanded','false');if(restore)previous.focus();}
  function position(){if(!active)return;const b=active.getBoundingClientRect();if(!b.width||!b.height||b.bottom<0||b.top>innerHeight||b.right<0||b.left>innerWidth){close();return;}
   const width=menu.offsetWidth,height=menu.offsetHeight;
   menu.style.left=Math.max(10,Math.min(b.left,innerWidth-width-10))+'px';
   menu.style.top=Math.max(8,Math.min(b.bottom+7,innerHeight-height-8))+'px';
  }
  function open(a,focus=false){if(active===a){close();return;}close();active=a;a.setAttribute('aria-expanded','true');menu.hidden=false;position();if(focus&&!menu.hidden)menu.querySelector('a').focus();}
  for(const a of triggers){a.dataset.tycCommunityToggle='';a.setAttribute('role','button');a.setAttribute('aria-expanded','false');a.setAttribute('aria-controls',menu.id);const chevron=document.createElement('span');chevron.className='tyc-community-chevron';chevron.setAttribute('aria-hidden','true');a.append(chevron);
   a.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open(a,e.detail===0);});
   a.addEventListener('keydown',e=>{if(e.key===' '||e.key==='ArrowDown'){e.preventDefault();if(active===a)menu.querySelector('a').focus();else open(a,true);}else if(e.key==='Escape'&&active===a){e.preventDefault();close(true);}});
  }
  menu.addEventListener('keydown',e=>{const links=[...menu.querySelectorAll('a')],i=links.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();close(true);}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();links[(i+(e.key==='ArrowDown'?1:links.length-1))%links.length].focus();}else if(e.key==='Tab'){close(true);}});
  document.addEventListener('pointerdown',e=>{if(active&&!active.contains(e.target)&&!menu.contains(e.target))close();},true);
  document.addEventListener('focusin',e=>{if(active&&!active.contains(e.target)&&!menu.contains(e.target))close();});
  window.addEventListener('resize',position);window.addEventListener('scroll',position,true);window.addEventListener('pageshow',()=>close());
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initCommunityDropdown,{once:true});else initCommunityDropdown();
})();
