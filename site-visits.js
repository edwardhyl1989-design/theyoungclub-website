/* THE YOUNG CLUB — site-wide unique browser visitors (California calendar day). */
(()=>{'use strict';
const visible=document.querySelector('[data-tyc-visitor-stats]');
function visitorId(){
 const key='tyc-site-visitor-v1';
 try{
  const old=localStorage.getItem(key);
  if(old && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(old))return old;
  if(typeof crypto?.randomUUID!=='function')return null;
  const fresh=crypto.randomUUID();localStorage.setItem(key,fresh);return fresh;
 }catch{return null;}
}
async function init(){
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY)return;
 try{
  const db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
  const browserId=visitorId();
  // Record only broad, non-sensitive page sections. Member/admin/auth pages remain excluded.
  const route=location.pathname.split('/').pop()||'index.html';
  const section={
   'index.html':'home','blog.html':'blog','post.html':'article',
   'community.html':'community','jobs.html':'jobs',
   'shop.html':'shop','product.html':'shop','about.html':'about'
  }[route];
  if(browserId&&section){
   db.rpc('tyc_page_visit',{p_page_key:section,p_visitor:browserId}).then(()=>{}).catch(()=>{});
  }
  const {data,error}=await db.rpc('tyc_site_visitor_stats',{p_visitor:browserId});
  if(error||!Array.isArray(data)||!data[0])return;
  if(!visible)return;
  const today=visible.querySelector('[data-tyc-today]');
  const total=visible.querySelector('[data-tyc-total]');
  if(!today||!total)return;
  const fmt=v=>Number(v||0).toLocaleString('en-US');
  today.textContent=fmt(data[0].today);
  total.textContent=fmt(data[0].total);
  visible.hidden=false;
 }catch{/* Visitor counters are optional; never interrupt page interaction. */}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();