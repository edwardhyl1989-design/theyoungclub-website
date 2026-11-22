/* Admin-only aggregate dashboard. Database RPC rechecks authorization. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const sections={home:'Home',blog:'PTA Blog',article:'Blog articles',community:'PTA Community',jobs:'Job Postings',shop:'Shop',about:'About'};
const number=n=>Number(n||0).toLocaleString('en-US');
let db,loading=false;
function notice(message){$('analytics-notice').textContent=message;}
function drawRows(id,items,maxRows=90){
 const root=$(id);root.replaceChildren();
 if(!items.length){const p=document.createElement('p');p.textContent='No visits recorded in this period yet.';root.append(p);return;}
 const max=Math.max(1,...items.map(r=>r.visitors));
 for(const item of items.slice(0,maxRows)){
  const row=document.createElement('div');row.className='analytics-bar-row';
  const label=document.createElement('span');label.textContent=item.label;
  const bar=document.createElement('div');bar.className='analytics-track';
  const fill=document.createElement('div');fill.className='analytics-fill';
  fill.style.width=Math.max(0,Math.min(100,Number(item.visitors)/max*100))+'%';
  bar.append(fill);
  const count=document.createElement('strong');count.textContent=number(item.visitors);
  row.append(label,bar,count);root.append(row);
 }
}
async function refresh(){
 if(loading)return;loading=true;$('analytics-refresh').disabled=true;notice('Loading analytics…');
 try{
  const days=Number($('analytics-window').value);
  if(![7,30,90].includes(days))throw Error('Invalid reporting period');
  const [visitors,site,sectionsResult]=await Promise.all([
   db.rpc('tyc_site_visitor_stats',{p_visitor:null}),
   db.rpc('tyc_admin_daily_report',{p_days:days}),
   db.rpc('tyc_admin_page_report',{p_days:days})
  ]);
  for(const r of [visitors,site,sectionsResult])if(r.error)throw r.error;
  const global=Array.isArray(visitors.data)?visitors.data[0]:null;
  if(!global)throw Error('Visitor totals not available');
  $('analytics-today').textContent=number(global.today);
  $('analytics-total').textContent=number(global.total);
  const daily=(site.data||[]).map(r=>({label:String(r.visit_date),visitors:Number(r.visitors)||0}));
  $('analytics-period').textContent=number(daily.reduce((sum,r)=>sum+r.visitors,0));
  drawRows('analytics-daily',daily,days);
  const totals=Object.fromEntries(Object.keys(sections).map(x=>[x,0]));
  for(const entry of sectionsResult.data||[])if(Object.hasOwn(totals,entry.page_key))totals[entry.page_key]+=Number(entry.visitors)||0;
  const rows=Object.entries(totals).map(([key,visitors])=>({label:sections[key],visitors})).sort((a,b)=>b.visitors-a.visitors);
  drawRows('analytics-sections',rows,rows.length);
  notice('Analytics updated · '+days+'-day reporting window');
 }catch(e){notice('Unable to load analytics: '+(e.message||'Please try again.'))}
 finally{loading=false;$('analytics-refresh').disabled=false;}
}
async function init(){
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){notice('Analytics configuration is unavailable.');return;}
 db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user){notice('Please log in with your The Young Club administrator account.');$('analytics-signin').hidden=false;return;}
 const {data:admin,error:adminError}=await db.from('job_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(adminError||!admin){notice('Access denied. Visitor analytics are available to administrators only.');return;}
 $('analytics-dashboard').hidden=false;
 $('analytics-window').addEventListener('change',refresh);
 $('analytics-refresh').addEventListener('click',refresh);
 await refresh();
}
init().catch(e=>notice('Could not verify administrator access: '+(e.message||'Unknown error')));
})();