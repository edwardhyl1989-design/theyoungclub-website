/* THE YOUNG CLUB — unique daily visitors and ambient golden constellation.
   Daily turnover: 12:01 AM America/Los_Angeles (California time). */
(()=>{'use strict';
const visible=document.querySelector('[data-tyc-visitor-stats]');
let db=null,browserId=null,busy=false,lastUpdate=0,lastDate='',timer=null;
const fmt=v=>Number(v||0).toLocaleString('en-US');
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
const starsLoaded=new Promise(resolve=>{
 const s=document.createElement('script');
 s.src='site-visitor-stars.js?v=1';
 s.async=true;s.onload=resolve;s.onerror=resolve;
 (document.head||document.documentElement).append(s);
});
async function refresh(){
 if(busy||!db)return;
 busy=true;
 try{
  const {data,error}=await db.rpc('tyc_site_visitor_stats',{p_visitor:browserId});
  if(error||!Array.isArray(data)||!data[0])return;
  const current=data[0],key=String(current.visit_date||dateParts().day);
  const today=Number(current.today)||0;
  if(visible){
   const d=visible.querySelector('[data-tyc-today]'),t=visible.querySelector('[data-tyc-total]');
   if(d&&t){d.textContent=fmt(today);t.textContent=fmt(current.total);visible.hidden=false;}
  }
  await starsLoaded;
  window.TYC_VisitorStars?.update(today,key);
  lastDate=key;lastUpdate=Date.now();
 }catch{/* Visitor effects are decorative and never block navigation. */}
 finally{busy=false;}
}
function tick(){
 const now=dateParts();
 // Preserve yesterday's display until 12:01 AM Pacific; then use the new day's actual count.
 const rollover=now.day!==lastDate&&(now.hour>0||now.minute>=1);
 if(rollover||Date.now()-lastUpdate>120000)refresh();
}
async function init(){
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY)return;
 db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 browserId=visitorId();
 const route=location.pathname.split('/').pop()||'index.html';
 const section={
  'index.html':'home','blog.html':'blog','post.html':'article',
  'community.html':'community','pta-news.html':'news','jobs.html':'jobs',
  'shop.html':'shop','product.html':'shop','about.html':'about'
 }[route];
 if(browserId&&section)db.rpc('tyc_page_visit',{p_page_key:section,p_visitor:browserId}).then(()=>{}).catch(()=>{});
 await refresh();
 timer=setInterval(()=>{if(!document.hidden)tick();},15000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
