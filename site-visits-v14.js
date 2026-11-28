/* THE YOUNG CLUB — unique daily visitors and ambient golden constellation.
   Daily turnover: 12:01 AM America/Los_Angeles (California time). */
(()=>{'use strict';
const visible=document.querySelector('[data-tyc-visitor-stats]');
let db=null,browserId=null,busy=false,lastUpdate=0,lastDate='',timer=null;
const fmt=v=>Number(v||0).toLocaleString('en-US');
// Draw visitor stars from the same confirmed visitor-count response on this page.
// This deliberately does not rely on a separate stars script being downloaded.
// Production uses extensionless routes (/jobs, /blog, /community).
// Normalize these to the .html keys used by our original route map.
const rawRoute=(location.pathname.split('/').filter(Boolean).pop()||'index.html').toLowerCase();
const starPage=rawRoute.includes('.')?rawRoute:rawRoute+'.html';
const starEnabled=new Set(['index.html','blog.html','post.html','community.html','pta-news.html','jobs.html','about.html','auth.html']).has(starPage);
let starsHost=null,starsDay='',starsCount=-1;
const debugEnabled=new URLSearchParams(location.search).get('star_debug')==='1';
const starDebug={system:'auth-stars-v14',page:starPage,stage:'script loaded',visitors:null,header:null,error:null};
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
 const target=document.querySelector('header.tyc-site-header')||(starPage==='index.html'?document.querySelector('.home-art'):null);
 starDebug.header=!!target;
 starDebug.route=location.pathname;
 starDebug.normalizedRoute=starPage;
 if(!target){starDebug.stage='header not found';debugStars();return;}
 const n=Math.max(0,Math.floor(Number(number)||0)),d=String(date||dateParts().day);
 if(d===starsDay&&starsHost?.isConnected&&Math.min(20,n)===Math.min(20,starsCount)&&Math.floor(Math.max(0,n-20)/10)===Math.floor(Math.max(0,starsCount-20)/10)){starsCount=n;starsHost.dataset.starCount=String(n);starDebug.visitors=n;debugStars();return;}
 starsCount=n;starsDay=d;
 if(!starsHost||!starsHost.isConnected){
  starsHost=document.createElement('div');
  starsHost.className='tyc-visitor-constellation tyc-visitor-constellation-native';
  starsHost.setAttribute('aria-hidden','true');
  target.classList.add('tyc-has-visitor-stars');
  if(target.matches('.home-art'))target.classList.add('tyc-home-star-surface');
  target.append(starsHost);
 }
 const random=makeStarRandom(starSeed(d)),fragment=document.createDocumentFragment();
 for(let i=0;i<Math.min(20,n)+Math.floor(Math.max(0,n-20)/10);i++){
  const e=document.createElement('span');
  e.className='tyc-gold-visitor-star'+(i>=20?' tyc-star-large':'');
  e.style.left=(2+random()*96).toFixed(2)+'%';
  e.style.top=(14+random()*72).toFixed(2)+'%';
  e.style.setProperty('--star-size',((3.4+random()*3)*(i>=20?1.9:1)).toFixed(2)+'px');
  e.style.setProperty('--star-delay',(-random()*8).toFixed(2)+'s');
  e.style.setProperty('--star-duration',(3.5+random()*5).toFixed(2)+'s');
  fragment.append(e);
 }
 starsHost.replaceChildren(fragment);
 starsHost.dataset.starCount=String(n);
 starsHost.dataset.smallStars=String(Math.min(20,n));
 starsHost.dataset.largeStars=String(Math.floor(Math.max(0,n-20)/10));
 starDebug.stage='stars rendered';starDebug.visitors=n;starDebug.headerHeight=Math.round(target.getBoundingClientRect().height);starDebug.starCount=starsHost.childElementCount;starDebug.smallStars=Number(starsHost.dataset.smallStars);starDebug.largeStars=Number(starsHost.dataset.largeStars);debugStars();
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

const timeout=ms=>new Promise((_,reject)=>setTimeout(()=>reject(new Error('Timed out after '+ms+'ms')),ms));
async function readDailyVisitors(){
 const url=window.TYC_SUPABASE_URL,key=window.TYC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw Error('Missing public configuration');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
 try{
  const origin=url.endsWith('/')?url.slice(0,-1):url;
  const response=await fetch(origin+'/rest/v1/rpc/tyc_site_visitor_stats',{
   method:'POST',mode:'cors',cache:'no-store',
   headers:{apikey:key,'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify({p_visitor:null}),signal:controller.signal
  });
  if(!response.ok)throw Error('HTTP '+response.status+': '+(await response.text()).slice(0,160));
  const data=await response.json(),item=Array.isArray(data)?data[0]:data;
  if(!item||!Number.isFinite(Number(item.today)))throw Error('No visitor data');
  starDebug.source='REST';return item;
 }finally{clearTimeout(timer);}
}
// The timestamped cache is only used as a temporary same-day fallback.
function cacheDailyVisitors(data){
 try{localStorage.setItem('tyc-public-visitor-count',JSON.stringify({day:String(data.visit_date),today:Number(data.today),total:Number(data.total),saved:Date.now()}));}catch{}
}
function readCachedVisitors(){
 try{const x=JSON.parse(localStorage.getItem('tyc-public-visitor-count')||'null');return x&&x.day===dateParts().day&&Number.isFinite(x.today)?x:null;}catch{return null;}
}
async function recordVisit(){
 if(!browserId||!db)return;
 try{
  const response=await Promise.race([db.rpc('tyc_site_visitor_stats',{p_visitor:browserId}),timeout(4500)]);
  if(response.error)throw response.error;
  const row=Array.isArray(response.data)?response.data[0]:response.data;
  if(row&&Number.isFinite(Number(row.today))){
   cacheDailyVisitors(row);
   renderVisitorStars(row.today,row.visit_date);
   if(visible){const d=visible.querySelector('[data-tyc-today]'),t=visible.querySelector('[data-tyc-total]');if(d&&t){d.textContent=fmt(row.today);t.textContent=fmt(row.total);visible.hidden=false;}}
  }
 }catch(e){starDebug.trackWarning=String(e?.message||e);debugStars();}
}
async function refresh(){
 if(busy)return;
 busy=true;
 const cached=readCachedVisitors();
 if(cached){
  renderVisitorStars(cached.today,cached.day);
  starDebug.stage='showing cached count; refreshing';
  starDebug.source='same-day cache';
  debugStars();
 }
 starDebug.stage='requesting read-only visitor count';starDebug.error=null;debugStars();
 try{
  let current;
  try{current=await readDailyVisitors();}
  catch(primary){
   starDebug.stage='REST failed; fallback';starDebug.error=String(primary?.message||primary);debugStars();
   if(!db)throw primary;
   const answer=await Promise.race([db.rpc('tyc_site_visitor_stats',{p_visitor:null}),timeout(6500)]);
   if(answer.error)throw answer.error;
   current=Array.isArray(answer.data)?answer.data[0]:answer.data;
   if(!current)throw Error('No visitor data from fallback');
   starDebug.source='Supabase JS';
  }
  const date=String(current.visit_date||dateParts().day),n=Number(current.today)||0;
  if(visible){
   const d=visible.querySelector('[data-tyc-today]'),t=visible.querySelector('[data-tyc-total]');
   if(d&&t){d.textContent=fmt(n);t.textContent=fmt(current.total);visible.hidden=false;}
  }
  renderVisitorStars(n,date);
  cacheDailyVisitors(current);
  lastDate=date;lastUpdate=Date.now();
 }catch(e){starDebug.stage='visitor count failed';starDebug.error=String(e?.message||e);debugStars();console.warn('[TYC visitor count]',e);}
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
 starDebug.stage='initializing auth-stars-v14';debugStars();
 try{
  if(!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY)throw Error('Missing public configuration');
  browserId=visitorId();
  if(window.supabase?.createClient){
   try{db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);}
   catch(e){starDebug.clientWarning=String(e?.message||e);}
  }
  await refresh();
  // Update the unique-visitor count separately; never block the first star rendering.
  Promise.resolve().then(recordVisit).catch(()=>{});
  const route=starPage;
  const section={'index.html':'home','blog.html':'blog','post.html':'article','community.html':'community','pta-news.html':'news','jobs.html':'jobs','shop.html':'shop','product.html':'shop','about.html':'about','auth.html':'account'}[route];
  if(db&&browserId&&section)Promise.resolve().then(()=>db.rpc('tyc_page_visit',{p_page_key:section,p_visitor:browserId})).catch(()=>{});
 }catch(e){starDebug.stage='startup failed';starDebug.error=String(e?.message||e);debugStars();}
 timer=setInterval(()=>{if(!document.hidden)tick();},15000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
}
// Deferral-proof bootstrap: initialized once even if this script loads late.
let started=false;
function startOnce(){if(started)return;started=true;init();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startOnce,{once:true});
else startOnce();
})();
