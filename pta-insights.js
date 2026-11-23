/* PTA NEWS / national data desk. All values are cited, year-labeled source figures.
   BLS 2024 employed PTAs from APTA 2025 profession demographics map (not licenses).
   BLS 2025 median pay and 2025–35 growth; FSBPT 2025 unique active licensees. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 if(!$('pta-state-select'))return;
 const statesRaw=[
 'AL|Alabama|01|2550','AK|Alaska|02|100','AZ|Arizona|04|1680',
 'AR|Arkansas|05|1540','CA|California|06|8430','CO|Colorado|08|1570',
 'CT|Connecticut|09|910','DE|Delaware|10|360','DC|District of Columbia|11|60',
 'FL|Florida|12|9410','GA|Georgia|13|2460','HI|Hawaii|15|310',
 'ID|Idaho|16|590','IL|Illinois|17|4320','IN|Indiana|18|2070',
 'IA|Iowa|19|1050','KS|Kansas|20|1190','KY|Kentucky|21|2540',
 'LA|Louisiana|22|1500','ME|Maine|23|370','MD|Maryland|24|1740',
 'MA|Massachusetts|25|2380','MI|Michigan|26|4060','MN|Minnesota|27|1290',
 'MS|Mississippi|28|1200','MO|Missouri|29|2080','MT|Montana|30|340',
 'NE|Nebraska|31|1150','NV|Nevada|32|590','NH|New Hampshire|33|460',
 'NJ|New Jersey|34|1350','NM|New Mexico|35|690','NY|New York|36|3850',
 'NC|North Carolina|37|3080','ND|North Dakota|38|130','OH|Ohio|39|6530',
 'OK|Oklahoma|40|1940','OR|Oregon|41|770','PA|Pennsylvania|42|4410',
 'RI|Rhode Island|44|550','SC|South Carolina|45|2010','SD|South Dakota|46|300',
 'TN|Tennessee|47|3140','TX|Texas|48|11230','UT|Utah|49|780',
 'VT|Vermont|50|100','VA|Virginia|51|3340','WA|Washington|53|2110',
 'WV|West Virginia|54|900','WI|Wisconsin|55|2000','WY|Wyoming|56|210'
 ];
 const states=statesRaw.map(s=>{const [abbr,name,fips,n]=s.split('|');return {abbr,name,fips,count:Number(n)};});
 const byFips=new Map(states.map(s=>[s.fips,s]));
 const byAbbr=new Map(states.map(s=>[s.abbr,s]));
 const max=Math.max(...states.map(s=>s.count));
 const format=n=>Number(n).toLocaleString('en-US');
 let selected=null,svg=null;
 const select=$('pta-state-select'),detail=$('pta-state-detail'),tooltip=$('pta-map-tooltip'),visual=$('pta-us-map');
 for(const s of [...states].sort((a,b)=>a.name.localeCompare(b.name))){const op=document.createElement('option');op.value=s.abbr;op.textContent=s.name;select.append(op);}
 const rank=[...states].sort((a,b)=>b.count-a.count);
 const rankRoot=$('pta-state-top');
 rank.slice(0,5).forEach((s,i)=>{
  const row=document.createElement('div');row.className='insights-state-rank';
  const name=document.createElement('span');name.textContent=String(i+1).padStart(2,'0')+'  '+s.name;
  const number=document.createElement('strong');number.textContent=format(s.count);
  row.append(name,number);rankRoot.append(row);
 });
 function color(n){
  const t=Math.sqrt(Math.max(0,n)/max);
  const a=[233,243,232],b=[13,76,48];
  return '#'+a.map((v,i)=>Math.round(v+(b[i]-v)*t).toString(16).padStart(2,'0')).join('');
 }
 function show(state){
  if(!state)return;
  selected=state;select.value=state.abbr;
  detail.replaceChildren();
  const h=document.createElement('h3');h.textContent=state.name;
  const n=document.createElement('div');n.className='insights-state-number';n.textContent=format(state.count);
  const label=document.createElement('div');label.className='insights-state-label';label.textContent='ESTIMATED EMPLOYED PTAs · MAY 2024';
  const p=document.createElement('p');p.textContent='Rank #'+(rank.findIndex(s=>s.abbr===state.abbr)+1)+' of '+states.length+' jurisdictions. Employment estimates are not active-license totals.';
  if(state.abbr==='CO'){const special=document.createElement('p');special.textContent='Note: APTA used the 2023 BLS estimate for Colorado because the 2024 estimate was unavailable.';detail.append(special);}
  detail.prepend(h,n,label,p);
  if(svg&&window.d3)window.d3.select(svg).selectAll('path[data-state]').classed('is-selected',function(){return this.getAttribute('data-state')===state.abbr;});
 }
 select.addEventListener('change',()=>{const s=byAbbr.get(select.value);if(s)show(s)});
 show(byAbbr.get('CA'));
 function showTip(state,event){
  if(!state)return;
  tooltip.textContent=state.name+' · '+format(state.count)+' employed PTAs (2024)';
  tooltip.hidden=false;
  const panel=tooltip.parentElement.getBoundingClientRect();
  if(event&&Number.isFinite(event.clientX)){
   const x=event.clientX-panel.left,y=event.clientY-panel.top;
   tooltip.style.left=Math.max(10,Math.min(panel.width-215,x+14))+'px';
   tooltip.style.top=Math.max(12,Math.min(panel.height-75,y-48))+'px';
  }else{tooltip.style.left='16px';tooltip.style.top='65px'}
 }
 const hideTip=()=>{tooltip.hidden=true;};
 function fallback(){
  visual.replaceChildren();
  const label=document.createElement('div');label.className='insights-map-fallback';
  const p=document.createElement('p');p.textContent='Map geometry could not be loaded. Select a state below or use the dropdown to explore the same verified figures.';label.append(p);
  const grid=document.createElement('div');grid.className='insights-map-fallback-grid';
  [...states].sort((a,b)=>a.abbr.localeCompare(b.abbr)).forEach(s=>{
   const b=document.createElement('button');b.type='button';b.textContent=s.abbr;b.title=s.name+': '+format(s.count);
   b.addEventListener('click',()=>show(s));grid.append(b);
  });label.append(grid);visual.append(label);
 }
 async function buildMap(){
  if(!window.d3){fallback();return;}
  try{
   const response=await fetch('pta-us-states.geojson?v=2',{cache:'force-cache',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('Map geometry unavailable '+response.status);
   const geojson=await response.json();
   const features=geojson.features.filter(f=>byFips.has(String(f.id).padStart(2,'0')));
   if(features.length<50)throw Error('Incomplete map geometry');
   const d3=window.d3,projection=d3.geoAlbersUsa().fitSize([940,565],{type:'FeatureCollection',features});
   const path=d3.geoPath(projection);
   visual.replaceChildren();
   svg=d3.select(visual).append('svg').attr('viewBox','0 0 940 570').attr('role','group').attr('aria-label','U.S. map: physical therapist assistants employed by state, 2024').node();
   d3.select(svg).selectAll('path').data(features).enter().append('path')
    .attr('d',path).attr('fill',f=>color(byFips.get(String(f.id).padStart(2,'0')).count))
    .attr('data-state',f=>byFips.get(String(f.id).padStart(2,'0')).abbr)
    .attr('tabindex','0')
    .attr('role','button')
    .attr('aria-label',f=>{const s=byFips.get(String(f.id).padStart(2,'0'));return s.name+', '+format(s.count)+' employed PTAs in 2024';})
    .on('mouseenter',function(event,f){const s=byFips.get(String(f.id).padStart(2,'0'));d3.select(this).attr('fill','#78bd86');showTip(s,event);})
    .on('mousemove',function(event,f){showTip(byFips.get(String(f.id).padStart(2,'0')),event);})
    .on('mouseleave',function(event,f){const s=byFips.get(String(f.id).padStart(2,'0'));d3.select(this).attr('fill',color(s.count));hideTip();})
    .on('click',function(event,f){show(byFips.get(String(f.id).padStart(2,'0')));showTip(byFips.get(String(f.id).padStart(2,'0')),event);})
    .on('focus',function(event,f){showTip(byFips.get(String(f.id).padStart(2,'0')));})
    .on('blur',hideTip)
    .on('keydown',function(event,f){if(event.key==='Enter'||event.key===' '){event.preventDefault();show(byFips.get(String(f.id).padStart(2,'0')));}});
   show(selected);
  }catch(error){console.warn('U.S. atlas map unavailable',error);fallback();}
 }
 function bars(id,data,maxValue,fmtVal){
  const root=$(id);if(!root)return;
  for(const [i,item] of data.entries()){
   const row=document.createElement('div');row.className='insights-bar-row'+(!i?' featured':'');
   const label=document.createElement('div');label.className='insights-bar-label';
   const title=document.createElement('span');title.textContent=item[0];
   const val=document.createElement('strong');val.textContent=fmtVal(item[1]);
   label.append(title,val);
   const track=document.createElement('div');track.className='insights-bar-track';
   const fill=document.createElement('div');fill.className='insights-bar-fill';fill.style.width=(100*item[1]/maxValue).toFixed(1)+'%';
   track.append(fill);row.append(label,track);root.append(row);
  }
 }
 bars('pta-wage-bars',[['Home health',80050],['Skilled nursing facilities',77440],['Hospitals',67620],['PT / OT / Speech offices',63080],['Physicians’ offices',62970]],85000,n=>'$'+format(n));
 bars('pta-growth-bars',[['Physical Therapist Assistants',23],['PTAs and aides combined',17],['All U.S. occupations',3]],25,n=>'+'+n+'%');
 bars('pta-workplace-bars',[['PT / OT / Speech offices',44],['Hospitals',20],['Home healthcare services',12],['Skilled nursing facilities',10],['Physicians’ offices',6],['Other settings',8]],50,n=>n+'%');
 function trend(){
  const target=$('pta-license-trend');if(!target)return;
  const values=[['2021',122943],['2022',125815],['2023',130171],['2024',132105],['2025',134457]];
  const ns='http://www.w3.org/2000/svg',w=530,h=265,l=45,r=25,top=34,bottom=45;
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.setAttribute('role','img');svg.setAttribute('aria-label','Unique active U.S. PTA license holders increased from 122,943 in 2021 to 134,457 in 2025');
  const line=(x1,y1,x2,y2,stroke,width=1)=>{const e=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1,y1,x2,y2,stroke,'stroke-width':width}))e.setAttribute(k,String(v));svg.append(e);return e};
  const label=(x,y,text,anchor='middle',color='#688170',size=12)=>{const el=document.createElementNS(ns,'text');for(const [k,v]of Object.entries({x,y,'text-anchor':anchor,fill:color,'font-size':size,'font-family':'Arial, sans-serif'}))el.setAttribute(k,String(v));el.textContent=text;svg.append(el)};
  const maxV=137500,minV=120000;const px=i=>l+i*(w-l-r)/4,py=n=>top+(maxV-n)/(maxV-minV)*(h-top-bottom);
  for(const n of [120000,125000,130000,135000]){const y=py(n);line(l,y,w-r,y,'#e5ece5');label(l-8,y+4,Math.round(n/1000)+'k','end','#91a196',11)}
  let d='';
  values.forEach(([yr,n],i)=>{const x=px(i),y=py(n);d+=(i?' L':'M')+x+' '+y;label(x,h-13,yr);});
  const area=document.createElementNS(ns,'path');area.setAttribute('d',d+' L '+px(4)+' '+py(minV)+' L '+px(0)+' '+py(minV)+' Z');area.setAttribute('fill','#dbeddf');area.setAttribute('opacity','.65');svg.append(area);
  const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('fill','none');path.setAttribute('stroke','#1b6948');path.setAttribute('stroke-width','3');path.setAttribute('stroke-linejoin','round');svg.append(path);
  values.forEach(([yr,n],i)=>{const cx=px(i),cy=py(n);const c=document.createElementNS(ns,'circle');c.setAttribute('cx',cx);c.setAttribute('cy',cy);c.setAttribute('r','5');c.setAttribute('fill','#1c6745');c.setAttribute('stroke','#fff');c.setAttribute('stroke-width','2');const t=document.createElementNS(ns,'title');t.textContent=yr+': '+format(n)+' unique PTA licensees';c.append(t);svg.append(c);label(cx,cy-13,format(n),'middle','#1b5237',11)});
  target.append(svg);
 }
 trend();
 buildMap();
})();