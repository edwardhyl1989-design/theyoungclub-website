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
 // BLS OEWS May 2025 physical therapist assistant (SOC 31-2021) annual mean wages.
 // Hourly mean estimate = BLS published annual mean / 2080 hours.
 // Map employment uses 2024 estimates and must not be confused with 2025 wages.
 const annualMeanWage2025={AL:63130,AK:77670,AZ:64970,AR:64500,CA:83080,CO:67520,CT:73730,DE:71070,DC:67130,FL:71110,GA:68580,HI:66160,ID:60200,IL:65810,IN:65470,IA:60220,KS:66320,KY:60490,LA:61250,ME:67300,MD:73000,MA:76350,MI:60260,MN:67730,MS:62850,MO:65190,MT:65320,NE:61890,NV:72960,NH:72140,NJ:77020,NM:62000,NY:65660,NC:68790,ND:60490,OH:67260,OK:57990,OR:70490,PA:63820,RI:67980,SC:68260,SD:52170,TN:64060,TX:75060,UT:62470,VT:71320,VA:72710,WA:65090,WV:61560,WI:65480,WY:65820};
 const states=statesRaw.map(s=>{const [abbr,name,fips,n]=s.split('|');const annualMean2025=annualMeanWage2025[abbr];return {abbr,name,fips,count:Number(n),annualMean2025,hourlyMean2025:annualMean2025/2080};});
 const byFips=new Map(states.map(s=>[s.fips,s]));
 const byAbbr=new Map(states.map(s=>[s.abbr,s]));
 const max=Math.max(...states.map(s=>s.count));
 const format=n=>Number(n).toLocaleString('en-US');
 let selected=null,svg=null;
 const select=$('pta-state-select'),detail=$('pta-state-detail'),tooltip=$('pta-map-tooltip'),visual=$('pta-us-map');
 for(const s of [...states].sort((a,b)=>a.name.localeCompare(b.name))){const op=document.createElement('option');op.value=s.abbr;op.textContent=s.name;select.append(op);}
 const rank=[...states].sort((a,b)=>b.count-a.count);
 const rankRoot=$('pta-state-top'),wageRankRoot=$('pta-wage-top');
 function renderRanking(root,ordered,value){
  if(!root)return;
  root.replaceChildren();
  ordered.slice(0,5).forEach((st,i)=>{
   const button=document.createElement('button');
   button.type='button';button.className='insights-state-rank insights-state-rank-button';
   button.setAttribute('aria-label','Show '+st.name+' state salary details');
   const name=document.createElement('span');name.textContent=String(i+1).padStart(2,'0')+'  '+st.name;
   const number=document.createElement('strong');number.textContent=value(st);
   button.append(name,number);
   button.addEventListener('click',()=>show(st));
   root.append(button);
  });
 }
 renderRanking(rankRoot,rank,st=>format(st.count));
 function wageOrder(){return [...states].sort((a,b)=>b.annualMean2025-a.annualMean2025);}
 renderRanking(wageRankRoot,wageOrder(),st=>'$'+st.hourlyMean2025.toFixed(2)+'/hr');
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
  const wage=document.createElement('div');wage.className='insights-state-wage';
  const wageCaption=document.createElement('span');wageCaption.className='insights-state-wage-heading';wageCaption.textContent='AVERAGE PTA HOURLY WAGE · MAY 2025';
  const wageValue=document.createElement('strong');wageValue.textContent='$'+state.hourlyMean2025.toFixed(2)+'/hr';
  const wageSource=document.createElement('small');wageSource.textContent='BLS OEWS May 2025 statewide employee mean';
  const annualCaption=document.createElement('span');annualCaption.className='insights-state-wage-heading';annualCaption.textContent='AVERAGE ANNUAL WAGE · MAY 2025';
  const annualValue=document.createElement('strong');annualValue.className='insights-annual-mean';annualValue.textContent='$'+format(state.annualMean2025)+'/year';
  wage.append(wageCaption,wageValue,annualCaption,annualValue,wageSource);
  const p=document.createElement('p');
  p.textContent='Employment rank #'+(rank.findIndex(st=>st.abbr===state.abbr)+1)+' / '+states.length+' · Average pay rank #'+(wageOrder().findIndex(st=>st.abbr===state.abbr)+1)+' / '+states.length+'. Employment is from 2024; wages are from 2025.';
  const distribution=document.createElement('div');distribution.className='insights-pay-distribution';
  const distributionTitle=document.createElement('h4');distributionTitle.textContent='PTA PAY DISTRIBUTION · MAY 2025';
  const columnHeads=document.createElement('div');columnHeads.className='insights-pay-head';
  for(const txt of ['PERCENTILE','HOURLY','ANNUAL']){const node=document.createElement('span');node.textContent=txt;columnHeads.append(node);}
  distribution.append(distributionTitle,columnHeads);
  const metrics=[
   ['90th percentile · top 10%',state.p90_annual],
   ['75th percentile · top 25%',state.p75_annual],
   ['Average (mean)',state.annualMean2025],
   ['25th percentile · bottom 25%',state.p25_annual]
  ];
  for(const [name,annual] of metrics){
   const row=document.createElement('div');row.className='insights-pay-row'+(name.startsWith('Average')?' is-mean':'');
   const title=document.createElement('span');title.textContent=name;
   const hourly=document.createElement('strong');hourly.textContent=Number.isFinite(annual)?'$'+(annual/2080).toFixed(2):'—';
   const yearly=document.createElement('strong');yearly.textContent=Number.isFinite(annual)?'$'+format(annual):'—';
   row.append(title,hourly,yearly);distribution.append(row);
  }
  const guidance=document.createElement('p');guidance.className='insights-pay-disclaimer';
  guidance.textContent=state.p90_annual!=null?'Percentiles are wage thresholds, not levels of experience. Hourly equivalents = published annual wage / 2,080.':'Published state percentile data is unavailable. Values are not estimated.';
  distribution.append(guidance);
  if(state.p90_annual!=null){
   const source=document.createElement('a');source.href='https://wagedex.com/data';source.target='_blank';source.rel='noopener noreferrer';
   source.textContent='Source: BLS 2025 · WageDex CC BY 4.0 ↗';distribution.append(source);
  }
  if(state.abbr==='CO'){const special=document.createElement('p');special.textContent='Note: APTA used the 2023 BLS estimate for Colorado because the 2024 estimate was unavailable.';detail.append(special);}
  detail.prepend(h,n,label,wage,p,distribution);
  if(svg)svg.querySelectorAll('path[data-state]').forEach(node=>node.classList.toggle('is-selected',node.getAttribute('data-state')===state.abbr));
 }
 select.addEventListener('change',()=>{const s=byAbbr.get(select.value);if(s)show(s)});
 show(byAbbr.get('CA'));
 function showTip(state,event){
  if(!state)return;
  tooltip.replaceChildren();
  const name=document.createElement('strong');name.textContent=state.name;
  const headcount=document.createElement('span');headcount.textContent=format(state.count)+' employed PTAs (2024)';
  const avgPay=document.createElement('b');avgPay.textContent='$'+state.hourlyMean2025.toFixed(2)+'/hr average (2025)';
  tooltip.append(name,headcount,avgPay);
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
 /* Project each GeoJSON coordinate to a simple SVG path instead of using d3.geoPath.
    This avoids d3 spherical-polygon complement fills from third-party winding orders.
    Mainland uses Albers equal-area; Alaska and Hawaii are intentional insets. */
 const DEG=Math.PI/180;
 function albers([lon,lat]){
  const p1=29.5*DEG,p2=45.5*DEG,p0=37.5*DEG,l0=-96*DEG;
  const n=(Math.sin(p1)+Math.sin(p2))/2;
  const c=Math.cos(p1)**2+2*n*Math.sin(p1);
  const rho=Math.sqrt(c-2*n*Math.sin(lat*DEG))/n;
  const rho0=Math.sqrt(c-2*n*Math.sin(p0))/n;
  return [rho*Math.sin(n*(lon*DEG-l0)),rho*Math.cos(n*(lon*DEG-l0))-rho0];
 }
 function geometryRings(feature){
  const geometry=feature.geometry;
  if(!geometry)return [];
  if(geometry.type==='Polygon')return geometry.coordinates;
  if(geometry.type==='MultiPolygon')return geometry.coordinates.flatMap(poly=>poly);
  return [];
 }
 function buildTransforms(features){
  const groups={main:[],ak:[],hi:[]};
  for(const feature of features){
   const fips=String(feature.id).padStart(2,'0'),group=fips==='02'?'ak':fips==='15'?'hi':'main';
   for(const ring of geometryRings(feature))for(const xy of ring){
    const pt=group==='main'?albers(xy):[xy[0],-xy[1]];
    if(pt.every(Number.isFinite))groups[group].push(pt);
   }
  }
  const areas={main:[25,18,890,425],ak:[45,435,270,548],hi:[292,481,440,550]};
  const result={};
  for(const [group,points] of Object.entries(groups)){
   if(!points.length)throw Error('No valid coordinates for '+group);
   const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0]));
   const minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
   const [x0,y0,x1,y1]=areas[group];
   const w=maxX-minX,h=maxY-minY;
   if(w<=0||h<=0)throw Error('Invalid map extent for '+group);
   const scale=Math.min((x1-x0)/w,(y1-y0)/h);
   const offsetX=x0+((x1-x0)-w*scale)/2,offsetY=y0+((y1-y0)-h*scale)/2;
   result[group]=xy=>{
    const p=group==='main'?albers(xy):[xy[0],-xy[1]];
    return [offsetX+(p[0]-minX)*scale,offsetY+(p[1]-minY)*scale];
   };
  }
  return result;
 }
 function pathFor(feature,project){
  const chunks=[];
  for(const ring of geometryRings(feature)){
   const coords=ring.map(project).filter(p=>p.every(Number.isFinite));
   if(coords.length<3)continue;
   chunks.push('M'+coords.map(([x,y])=>x.toFixed(2)+','+y.toFixed(2)).join('L')+'Z');
  }
  return chunks.join(' ');
 }
 async function buildMap(){
  try{
   const response=await fetch('pta-us-states.geojson?v=4',{cache:'force-cache',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('Map geometry unavailable '+response.status);
   const geojson=await response.json();
   const features=geojson.features.filter(f=>byFips.has(String(f.id).padStart(2,'0')));
   if(features.length!==51)throw Error('Incomplete map geometry: '+features.length+' jurisdictions');
   const transformations=buildTransforms(features);
   const NS='http://www.w3.org/2000/svg';
   svg=document.createElementNS(NS,'svg');
   svg.setAttribute('viewBox','0 0 940 570');
   svg.setAttribute('role','group');
   svg.setAttribute('aria-label','Interactive U.S. map showing Physical Therapist Assistant employment by state in 2024');
   const statePaths=[];
   for(const feature of features){
    const state=byFips.get(String(feature.id).padStart(2,'0'));
    const group=state.abbr==='AK'?'ak':state.abbr==='HI'?'hi':'main';
    const path=pathFor(feature,transformations[group]);
    if(!path)throw Error('Missing SVG polygon path for '+state.name);
    const element=document.createElementNS(NS,'path');
    element.setAttribute('d',path);
    element.setAttribute('fill',color(state.count));
    element.setAttribute('data-state',state.abbr);
    element.setAttribute('tabindex','0');
    element.setAttribute('role','button');
    element.setAttribute('aria-label',state.name+', '+format(state.count)+' employed PTAs in 2024; average PTA hourly wage $'+state.hourlyMean2025.toFixed(2)+' in 2025');
    element.addEventListener('mouseenter',event=>{element.setAttribute('fill','#78bd86');showTip(state,event);});
    element.addEventListener('mousemove',event=>showTip(state,event));
    element.addEventListener('mouseleave',()=>{element.setAttribute('fill',color(state.count));hideTip();});
    element.addEventListener('click',event=>{show(state);showTip(state,event);});
    element.addEventListener('focus',()=>showTip(state));
    element.addEventListener('blur',hideTip);
    element.addEventListener('keydown',event=>{
     if(event.key==='Enter'||event.key===' '){event.preventDefault();show(state);}
    });
    svg.append(element);
    statePaths.push(element);
   }
   if(statePaths.length!==51)throw Error('Unexpected number of state paths: '+statePaths.length);
   visual.replaceChildren(svg);
   show(selected);
  }catch(error){console.warn('U.S. PTA workforce map unavailable:',error);svg=null;fallback();}
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