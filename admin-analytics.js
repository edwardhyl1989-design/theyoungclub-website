/* Admin-only aggregate dashboard. Database RPC rechecks authorization. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const sections={home:'Home',blog:'PTA Blog',article:'Blog articles',community:'PTA Community',jobs:'Job Postings',shop:'Shop',about:'About'};
const number=n=>Number(n||0).toLocaleString('en-US');
let db,loading=false,pageRecords=[],reportDate='',reportDays=30;
function renderPageSections(){
 const select=$('analytics-page-date'), date=select.value;
 const totals=Object.fromEntries(Object.keys(sections).map(x=>[x,0]));
 for(const entry of pageRecords)if((date==='all'||String(entry.visit_date)===date)&&Object.hasOwn(totals,entry.page_key))totals[entry.page_key]+=Number(entry.visitors)||0;
 const rows=Object.entries(totals).map(([key,visitors])=>({label:sections[key],visitors})).sort((a,b)=>b.visitors-a.visitors);
 drawRows('analytics-sections',rows,rows.length);
 const total=$('analytics-sections-total');if(total)total.textContent=number(rows.reduce((sum,row)=>sum+row.visitors,0));
 $('analytics-page-summary').textContent=date==='all'?'Last '+reportDays+' days · summed daily unique browsers':date+' · California time · unique browsers per section';
}
function updatePageDates(){
 const select=$('analytics-page-date'), previous=select.value;
 select.replaceChildren(new Option('Selected reporting period','all'));
 const day=new Date(reportDate+'T12:00:00Z');
 for(let i=0;i<reportDays;i++){const date=new Date(day.getTime()-i*86400000).toISOString().slice(0,10);select.add(new Option(i===0?'Today · '+date:date,date));}
 select.value=previous==='all'?'all':Array.from(select.options).some(o=>o.value===previous)?previous:reportDate;
 renderPageSections();
}
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

/* Responsive visitor trend: use existing authenticated daily report data. */
let trendDays=[],trendSelected=-1,trendObserver=null;
const svgNS='http://www.w3.org/2000/svg';
function svgNode(name,attrs={},value=null){
 const el=document.createElementNS(svgNS,name);
 for(const [key,data] of Object.entries(attrs))el.setAttribute(key,String(data));
 if(value!==null)el.textContent=String(value);
 return el;
}
function trendDateLabel(date){
 const s=String(date||'');
 return /^\d{4}-\d{2}-\d{2}$/.test(s)?s.slice(5).replace('-','/'):s;
}
function setTrendSummary(items){
 const summary=$('analytics-daily-summary');
 if(!summary)return;
 summary.replaceChildren();
 if(!items.length)return;
 const latest=items[items.length-1];
 const peak=items.reduce((top,x)=>x.visitors>top.visitors?x:top,items[0]);
 const avg=Math.round(items.reduce((total,x)=>total+x.visitors,0)/items.length*10)/10;
 for(const [name,value,sub] of [
  ['LATEST · 최근',number(latest.visitors),trendDateLabel(latest.label)],
  ['PEAK · 최고',number(peak.visitors),trendDateLabel(peak.label)],
  ['DAILY AVG · 일평균',number(avg),items.length+' reporting days']
 ]){
  const card=document.createElement('div');card.className='analytics-trend-stat';
  const label=document.createElement('span');label.textContent=name;
  const strong=document.createElement('strong');strong.textContent=value;
  const small=document.createElement('small');small.textContent=sub;
  card.append(label,strong,small);summary.append(card);
 }
}
function renderDailyTrend(records){
 const root=$('analytics-daily');if(!root)return;
 trendDays=Array.isArray(records)?records
  .map(r=>({label:String(r.label||''),visitors:Math.max(0,Number(r.visitors)||0)}))
  .filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.label))
  .sort((a,b)=>a.label.localeCompare(b.label)):[];
 trendSelected=trendDays.length-1;
 setTrendSummary(trendDays);
 paintTrend();
}
function paintTrend(){
 const root=$('analytics-daily');if(!root)return;
 root.replaceChildren();
 const items=trendDays;
 if(!items.length){
  const p=document.createElement('p');p.className='analytics-trend-empty';
  p.textContent='No daily visitor data for this reporting period yet. / 해당 기간의 방문 기록이 없습니다.';
  root.append(p);return;
 }
 const width=Math.max(275,Math.round(root.clientWidth||660));
 const small=width<480;
 const height=small?266:316;
 const pad={left:small?37:49,right:small?12:24,top:28,bottom:small?41:47};
 const plotWidth=width-pad.left-pad.right;
 const plotHeight=height-pad.top-pad.bottom;
 const max=Math.max(1,...items.map(r=>r.visitors));
 const step=max<=8?Math.max(1,Math.ceil(max/4)):Math.max(5,Math.ceil(max/20)*5);
 const ceil=step*4;
 const x=i=>pad.left+(items.length===1?plotWidth/2:i*plotWidth/(items.length-1));
 const y=v=>pad.top+plotHeight*(1-v/ceil);
 const points=items.map((r,i)=>({x:x(i),y:y(r.visitors),n:r.visitors,date:r.label}));
 const baseY=y(0);
 const chart=svgNode('svg',{
  viewBox:'0 0 '+width+' '+height,width:'100%',height:height,
  role:'img','aria-label':'Daily unique browsers from '+items[0].label+' through '+items[items.length-1].label,
  class:'analytics-trend-svg',preserveAspectRatio:'xMidYMid meet'
 });
 chart.append(svgNode('rect',{x:0,y:0,width,height,fill:'#ffffff'}));
 const defs=svgNode('defs');
 const gradient=svgNode('linearGradient',{id:'tyc-trend-area',x1:0,y1:0,x2:0,y2:1});
 gradient.append(svgNode('stop',{offset:'0%','stop-color':'#60aa7d','stop-opacity':'.27'}));
 gradient.append(svgNode('stop',{offset:'100%','stop-color':'#60aa7d','stop-opacity':'.025'}));
 defs.append(gradient);chart.append(defs);
 for(let t=0;t<=4;t++){
  const value=step*t,yy=y(value);
  chart.append(svgNode('line',{x1:pad.left,y1:yy,x2:width-pad.right,y2:yy,stroke:'#e1ebe4','stroke-width':1}));
  chart.append(svgNode('text',{x:pad.left-9,y:yy+4,'text-anchor':'end',fill:'#647a6c','font-family':'Arial,sans-serif','font-size':small?10:11},number(value)));
 }
 let path='';
 for(let i=0;i<points.length;i++)path+=(i?' L ':'M ')+points[i].x.toFixed(2)+' '+points[i].y.toFixed(2);
 const area=path+' L '+points[points.length-1].x.toFixed(2)+' '+baseY.toFixed(2)+' L '+points[0].x.toFixed(2)+' '+baseY.toFixed(2)+' Z';
 chart.append(svgNode('path',{d:area,fill:'url(#tyc-trend-area)',stroke:'none'}));
 chart.append(svgNode('path',{d:path,fill:'none',stroke:'#236c49','stroke-width':small?2.6:3.5,'stroke-linecap':'round','stroke-linejoin':'round'}));
 const tickCount=Math.min(items.length,small?4:7);
 const tickIndices=new Set([0,items.length-1]);
 if(tickCount>2){
  for(let t=1;t<tickCount-1;t++)tickIndices.add(Math.round(t*(items.length-1)/(tickCount-1)));
 }
 for(let i=0;i<points.length;i++){
  const p=points[i],active=i===trendSelected;
  if(active||items.length<=30||i%Math.max(1,Math.floor(items.length/22))===0){
   chart.append(svgNode('circle',{cx:p.x,cy:p.y,r:active?5.8:items.length>40?2.2:3.1,fill:active?'#17583c':'#438d61',stroke:'#fff','stroke-width':active?2.4:1.1}));
  }
  if(tickIndices.has(i)){
   const anchor=i===0?'start':i===items.length-1?'end':'middle';
   chart.append(svgNode('text',{x:p.x,y:height-16,'text-anchor':anchor,fill:'#617569','font-family':'Arial,sans-serif','font-size':small?10:11},trendDateLabel(p.date)));
  }
 }
 const active=points[trendSelected]||points[points.length-1];
 if(active){
  chart.append(svgNode('line',{x1:active.x,y1:pad.top,x2:active.x,y2:baseY,stroke:'#77ae8a','stroke-width':1,'stroke-dasharray':'4 5'}));
  chart.append(svgNode('circle',{cx:active.x,cy:active.y,r:6.2,fill:'#236c49',stroke:'#fff','stroke-width':2.6}));
 }
 const selectByPointer=event=>{
  const rect=chart.getBoundingClientRect();
  if(!rect.width)return;
  const localX=(event.clientX-rect.left)/rect.width*width;
  const index=items.length===1?0:Math.max(0,Math.min(items.length-1,Math.round((localX-pad.left)/plotWidth*(items.length-1))));
  if(index!==trendSelected){trendSelected=index;paintTrend();}
 };
 chart.addEventListener('pointermove',event=>{if(event.pointerType==='mouse')selectByPointer(event);});
 chart.addEventListener('click',selectByPointer);
 const details=document.createElement('div');details.className='analytics-trend-selection';
 details.setAttribute('aria-live','polite');
 const label=document.createElement('span');label.textContent='SELECTED DAY / 선택 날짜';
 const val=document.createElement('strong');
 val.textContent=items[trendSelected].label+'  ·  '+number(items[trendSelected].visitors)+' visitors';
 details.append(label,val);
 root.append(chart,details);
 const sr=document.createElement('table');sr.className='analytics-trend-sr';
 const caption=document.createElement('caption');caption.textContent='Daily unique visitors by California calendar date';
 const tbody=document.createElement('tbody');
 for(const day of items){
  const row=document.createElement('tr'),date=document.createElement('th'),count=document.createElement('td');
  date.scope='row';date.textContent=day.label;count.textContent=String(day.visitors);
  row.append(date,count);tbody.append(row);
 }
 sr.append(caption,tbody);root.append(sr);
}
function observeDailyTrend(){
 const root=$('analytics-daily');
 if(!root||trendObserver)return;
 if(typeof ResizeObserver!=='undefined'){
  trendObserver=new ResizeObserver(()=>{if(trendDays.length)paintTrend();});
  trendObserver.observe(root);
 }else window.addEventListener('resize',()=>{if(trendDays.length)paintTrend();});
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
  renderDailyTrend(daily);
  pageRecords=sectionsResult.data||[];reportDate=String(global.visit_date);reportDays=days;updatePageDates();
  notice('Analytics updated · '+days+'-day reporting window');
 }catch(e){notice('Unable to load analytics: '+(e.message||'Please try again.'))}
 finally{loading=false;$('analytics-refresh').disabled=false;}
}
let managementBusy=false, browserExcluded=false;
function browserId(){
 const key='tyc-site-visitor-v1';
 let id=localStorage.getItem(key);
 if(!id||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)){id=crypto.randomUUID();localStorage.setItem(key,id);}
 return id;
}
async function manage(action='list',email=null){
 if(managementBusy)return;
 managementBusy=true;
 const status=$('visitor-management-status');
 try{
  const {data,error}=await db.rpc('tyc_admin_visitor_manage',{p_action:action,p_email:email,p_browser:browserId()});
  if(error)throw error;
  browserExcluded=!!data.browser_excluded;
  $('visitor-browser').textContent=browserExcluded?'Include this browser again':'Exclude this browser';
  const list=$('visitor-excluded-list');list.replaceChildren();
  for(const email of data.accounts||[]){
   const li=document.createElement('li'), b=document.createElement('button');
   li.append(document.createTextNode(email+' '));b.type='button';b.textContent='Remove';b.addEventListener('click',()=>manage('remove_account',email));li.append(b);list.append(li);
  }
  if(!list.children.length){const li=document.createElement('li');li.textContent='No additional excluded accounts.';list.append(li);}
  status.textContent=action==='reset_today'?'Daily counter reset. Lifetime count unchanged.':action==='list'?'':'Settings saved.';
  if(action==='add_account')$('visitor-email').value='';
  if(action==='reset_today')await refresh();
 }catch(e){status.textContent=e.message||'Unable to update visitor settings.';}
 finally{managementBusy=false;}
}
async function init(){
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){notice('Analytics configuration is unavailable.');return;}
 db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user){notice('Please log in with your The Young Club administrator account.');$('analytics-signin').hidden=false;return;}
 const {data:admin,error:adminError}=await db.rpc('tyc_has_staff_scope',{p_scope:'community'});
 if(adminError||!admin){notice('Access denied. Visitor analytics are available to administrators only.');return;}
 $('analytics-dashboard').hidden=false;
 observeDailyTrend();
 $('analytics-window').addEventListener('change',refresh);
 $('analytics-refresh').addEventListener('click',refresh);
 $('analytics-page-date').addEventListener('change',renderPageSections);
 $('visitor-exclusion-form').addEventListener('submit',e=>{e.preventDefault();manage('add_account',$('visitor-email').value.trim());});
 $('visitor-browser').addEventListener('click',()=>manage(browserExcluded?'include_browser':'exclude_browser'));
 $('visitor-reset').addEventListener('click',()=>{if(confirm("Reset today's visitors to 0? Total and historical records will remain unchanged."))manage('reset_today');});
 await Promise.all([refresh(),manage()]);
}
init().catch(e=>notice('Could not verify administrator access: '+(e.message||'Unknown error')));
})();