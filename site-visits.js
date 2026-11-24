/* THE YOUNG CLUB — unique daily visitors and ambient golden constellation.
   Daily turnover: 12:01 AM America/Los_Angeles (California time). */
(()=>{'use strict';
const visible=document.querySelector('[data-tyc-visitor-stats]');
let db=null,browserId=null,busy=false,lastUpdate=0,lastDate='',timer=null;
const fmt=v=>Number(v||0).toLocaleString('en-US');
// Draw visitor stars from the same confirmed visitor-count response on this page.
// This deliberately does not rely on a separate stars script being downloaded.
const starRoute=(location.pathname.split('/').filter(Boolean).pop()||'index.html').toLowerCase();
const starPage=starRoute.includes('.')?starRoute:starRoute+'.html';
const starEnabled=new Set(['index.html','blog.html','post.html','community.html','pta-news.html','jobs.html','about.html','profile.html']).has(starPage);
let starsHost=null,starsDay='',starsCount=-1;
const debugEnabled=new URLSearchParams(location.search).get('star_debug')==='1';
const starDebug={system:'integrated-stats-v8',page:starPage,stage:'script loaded',visitors:null,header:null,error:null};
function debugStars(){
 if(!debugEnabled)return;
 let el=document.getElementById('tyc-star-debug-panel');
 if(!el){
  el=document.createElement('pre');el.id='tyc-star-debug-panel';
  el.style.cssText='position:fixed!important;left:12px!important;bottom:12px!important;z-index:2147483647!important;width:min(460px,calc(100vw - 24px))!important;max-height:60vh!important;overflow:auto!important;padding:14px!important;background:#102018!important;color:#c6ffd0!important;border:2px solid #e6c169!important;border-radius:8px!important;font:12px/1.6 monospace!important;white-space:pre-wrap!important;pointer-events:none!important;';
  document.body.append(el);
 }
 el.textContent='DAILY GOLD STARS / DIAGNOSTICS\\n'+JSON.stringify(starDebug,null,2);
}

function makeStarRandom(seed){
 return ()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};
}
function starSeed(str){
 let h=2166136261;for(const c of str)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;
}
function renderVisitorStars(number,date){
 if(!starEnabled)return;
 const target=starPage==='index.html'?document.querySelector('.home-art'):document.querySelector('header.tyc-site-header');
 starDebug.header=!!target;
 if(!target){starDebug.stage='header not found';debugStars();return;}
 const n=Math.max(0,Math.floor(Number(number)||0)),d=String(date||dateParts().day);
 if(n===starsCount&&d===starsDay&&starsHost?.isConnected)return;
 starsCount=n;starsDay=d;
 if(!starsHost||!starsHost.isConnected){
  starsHost=document.createElement('div');
  starsHost.className='tyc-visitor-constellation tyc-visitor-constellation-native';
  starsHost.setAttribute('aria-hidden','true');
  target.classList.add('tyc-has-visitor-stars');
  if(starPage==='index.html')target.classList.add('tyc-home-star-surface');
  target.append(starsHost);
 }
 const random=makeStarRandom(starSeed(d)),fragment=document.createDocumentFragment();
 for(let i=0;i<n;i++){
  const e=document.createElement('span');
  e.className='tyc-gold-visitor-star';
  e.style.left=(2+random()*96).toFixed(2)+'%';
  e.style.top=(14+random()*72).toFixed(2)+'%';
  e.style.setProperty('--star-size',(3.4+random()*3).toFixed(2)+'px');
  e.style.setProperty('--star-delay',(-random()*8).toFixed(2)+'s');
  e.style.setProperty('--star-duration',(3.5+random()*5).toFixed(2)+'s');
  fragment.append(e);
 }
 starsHost.replaceChildren(fragment);
 starsHost.dataset.starCount=String(n);
 starDebug.stage='stars rendered';starDebug.visitors=n;starDebug.headerHeight=Math.round(target.getBoundingClientRect().height);starDebug.starCount=starsHost.childElementCount;debugStars();
}

const dateParts=()=>{
 const values=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
  timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',hourCycle:'h23'
 }).formatToParts(new Date()).filter(v=>v.type!=='literal').map(v=>[v.type,v.value]));
 return {day:values.year+'-'+values.month+'-'+values.day,hour:Number(values.hour),minute:Number(values.minute)};
};
function visitorId(){
 const key='tyc-site-visitor-v1';
 try{
  const old=localStorage.getItem(key);
  if(old&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(old))return old;
  if(typeof crypto?.randomUUID!=='function')return null;
  const fresh=crypto.randomUUID();localStorage.setItem(key,fresh);return fresh;
 }catch{return null;}
}
// The shared stars script is loaded directly by eligible pages.
// No dynamic script insertion or authorization dependency.

async function refresh(){
 if(busy||!db)return;
 busy=true;
 try{
  const {data,error}=await db.rpc('tyc_site_visitor_stats',{p_visitor:browserId});
  if(error||!Array.isArray(data)||!data[0]){starDebug.stage='visitor API error';starDebug.error=error?.message||'No data returned';debugStars();return;}
  const current=data[0],key=String(current.visit_date||dateParts().day);
  const today=Number(current.today)||0;
  if(visible){
   const d=visible.querySelector('[data-tyc-today]'),t=visible.querySelector('[data-tyc-total]');
   if(d&&t){d.textContent=fmt(today);t.textContent=fmt(current.total);visible.hidden=false;}
  }
  renderVisitorStars(today,key);
  lastDate=key;lastUpdate=Date.now();
 }catch(e){starDebug.stage='visitor request failed';starDebug.error=String(e?.message||e);debugStars();}
 finally{busy=false;}
}
function tick(){
 const now=dateParts();
 // Preserve yesterday's display until 12:01 AM Pacific; then use the new day's actual count.
 if(now.day!==lastDate&&now.hour===0&&now.minute===0)return;
 const rollover=now.day!==lastDate&&(now.hour>0||now.minute>=1);
 if(rollover||Date.now()-lastUpdate>120000)refresh();
}
async function init(){
 starDebug.stage='initializing';
 debugStars();
 // A failing page-visit call or a missing auth bundle must never prevent stars.
 try{
  if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY)
    throw new Error('Supabase client or configuration not available');
  starDebug.stage='creating client';debugStars();
  db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
  starDebug.stage='loading visitor ID';debugStars();
  browserId=visitorId();
  starDebug.stage='fetching visitor count';debugStars();
  await refresh();
  // Best-effort page event runs after the visitor count, and cannot block it.
  const route=location.pathname.split('/').pop()||'index.html';
  const section={
   'index.html':'home','blog.html':'blog','post.html':'article',
   'community.html':'community','pta-news.html':'news','jobs.html':'jobs',
   'shop.html':'shop','product.html':'shop','about.html':'about'
  }[route];
  if(browserId&&section)Promise.resolve().then(()=>db.rpc('tyc_page_visit',{
   p_page_key:section,p_visitor:browserId
  })).catch(()=>{});
 }catch(e){
  starDebug.stage='startup error';
  starDebug.error=String(e?.message||e);
  debugStars();
  console.warn('[TYC visitors] Startup failed',e);
 }
 timer=setInterval(()=>{if(!document.hidden)tick();},15000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
