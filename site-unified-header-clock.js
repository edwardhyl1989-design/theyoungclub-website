
(()=>{'use strict';
const stops=[[0,[5,31,30],[22,66,53],1],[1,[5,31,30],[23,67,54],1],[2,[6,32,31],[24,68,55],1],[3,[7,34,34],[25,71,60],0.98],[4,[9,45,48],[35,89,77],0.94],[5,[15,69,72],[61,117,105],0.77],[6,[58,117,113],[220,203,142],0.49],[7,[182,199,177],[255,232,177],0.26],[8,[231,232,218],[255,244,214],0.18],[9,[217,233,240],[255,246,227],0.13],[10,[115,193,241],[214,240,253],0.08],[11,[77,174,240],[193,232,253],0.06],[12,[69,167,235],[186,229,252],0.05],[13,[110,191,240],[219,242,252],0.07],[14,[178,219,240],[243,246,233],0.1],[15,[220,232,235],[255,237,211],0.17],[16,[251,221,181],[255,241,203],0.26],[17,[248,200,147],[255,229,181],0.37],[18,[238,154,137],[255,207,157],0.54],[19,[35,97,91],[66,126,107],0.82],[20,[13,66,63],[38,96,78],0.95],[21,[7,43,40],[24,74,59],1],[22,[5,34,33],[23,68,55],1],[23,[5,31,30],[22,66,53],1],[24,[5,31,30],[22,66,53],1]];
function palette(h,stops){
 let i=0;while(i<stops.length-2&&h>stops[i+1][0])i++;
 const a=stops[i],b=stops[i+1],t=(h-a[0])/(b[0]-a[0]);
 const mix=(x,y)=>Math.round(x+(y-x)*t);
 const c=a[1].map((v,k)=>mix(v,b[1][k])),d=a[2].map((v,k)=>mix(v,b[2][k]));
 const lum=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const low=Math.min(lum(c),lum(d)),high=Math.max(lum(c),lum(d));
 const contrast=(v)=>Math.min((Math.max(low,lum(v))+.05)/(Math.min(low,lum(v))+.05),(Math.max(high,lum(v))+.05)/(Math.min(high,lum(v))+.05));
 const dark=contrast([15,28,22]),light=contrast([255,249,237]);
 const night=light>dark;
 let ink=night?[255,249,237]:[15,28,22];
 if(contrast(ink)<4.5)ink=night?[255,255,255]:[0,0,0];
 // During a narrow mid-tone transition, compress the gradient around its mean to retain legibility.
 let x=c,y=d;
 if(contrast(ink)<4.5){
  const mean=c.map((v,k)=>Math.round((v+d[k])/2));
  x=mean;y=mean;
  ink=lum(mean)>.179?[0,0,0]:[255,255,255];
 }
 const star=a[3]+(b[3]-a[3])*t;
 return {c:x,d:y,ink,night,star,glow:night?3.1:1};
}
const root=document.documentElement;
const rgb=v=>'rgb('+v.join(',')+')';
// Accelerated preview is restricted to the dedicated test hostname.
const preview=location.hostname==='dev.theyoungclub.com';
const previewStart=performance.now();
if(preview)root.dataset.tycSkyPreview='true';
let minute=-1;
function paint(){
 const now=new Date(),key=preview?(Math.floor((performance.now()-previewStart)/1000)%24)*60:now.getHours()*60+now.getMinutes();
 if(key===minute)return;minute=key;
 const hour=key/60,p=palette(hour,stops),style=root.style;
 const clamp=v=>Math.min(1,Math.max(0,v));
 const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 const ramp=(a,b)=>smooth((hour-a)/(b-a));
 const sun=ramp(5.5,6)*(1-ramp(18.15,19));
 const moon=1-sun;
 const height=Math.sin(Math.PI*clamp((hour-6)/12));
 const blue=ramp(9,10)*(1-ramp(13,15));
 const warm=Math.max(ramp(5,6)*(1-ramp(8,10)),ramp(15,17)*(1-ramp(18,19)));
 const horizon=Math.max(0,1-height);
 // Original illustrated reference scenes, blended between hourly anchor points.
 const artworkStops=[[0,0],[4,0],[5,4],[6,1],[8,1],[9,1],[10,2],[13,2],[14,2],[15,1],[16,3],[18,3],[19,4],[20,4],[21,0],[24,0]];
 let artIndex=0;while(artIndex<artworkStops.length-2&&hour>artworkStops[artIndex+1][0])artIndex++;
 const aa=artworkStops[artIndex],bb=artworkStops[artIndex+1],blend=smooth((hour-aa[0])/(bb[0]-aa[0]));
 const weights=[0,0,0,0,0];weights[aa[1]]+=1-blend;weights[bb[1]]+=blend;
 weights.forEach((weight,n)=>style.setProperty('--tyc-art-'+n,weight.toFixed(3)));
 style.setProperty('--tyc-day-sun',(sun*weights[2]).toFixed(3));
 style.setProperty('--tyc-sun-y',(19-17*height+10*(1-ramp(5.5,6))+10*ramp(18,19)).toFixed(2)+'px');
 style.setProperty('--tyc-sun-opacity',sun.toFixed(3));
 style.setProperty('--tyc-moon-opacity',moon.toFixed(3));
 style.setProperty('--tyc-moon-y',(5-4*Math.sin(Math.PI*((hour+5)%24)/24)).toFixed(2)+'px');
 style.setProperty('--tyc-cloud-opacity',(.12+.79*blue+.33*warm+.17*moon).toFixed(3));
 style.setProperty('--tyc-cloud-top',p.night?'#8cac91':warm>.35?'#fff3d7':'#ffffff');
 style.setProperty('--tyc-cloud-base',p.night?'#406b64':warm>.35?'#dba795':'#a6cfe9');
 style.setProperty('--tyc-hill-opacity',(.24+.43*moon+.16*warm-.22*blue).toFixed(3));
 style.setProperty('--tyc-hill-back',p.night?'#719789':warm>.35?'#cbad98':'#aac5cf');
 style.setProperty('--tyc-hill-mid',p.night?'#37685c':warm>.35?'#b69a85':'#a6b9b5');
 style.setProperty('--tyc-hill-front',p.night?'#123e38':warm>.35?'#937e72':'#829f9c');
 style.setProperty('--tyc-sun-color',hour<8||hour>=16?'#fff0b1':'#ffe082');
 style.setProperty('--tyc-horizon-glow',(.07+.46*warm*horizon).toFixed(3));
 if(preview){
  const tag=document.querySelector('.tyc-preview-hour');
  if(tag)tag.textContent='SKY TEST · '+String(Math.floor(hour)).padStart(2,'0')+':00';
 }
 style.setProperty('--tyc-sky-a',rgb(p.c));
 style.setProperty('--tyc-sky-b',rgb(p.d));
 style.setProperty('--tyc-sky-ink',rgb(p.ink));
 style.setProperty('--tyc-sky-sub',rgb(p.ink));
 style.setProperty('--tyc-sky-border',p.night?'#63765b':'#ded8c9');
 style.setProperty('--tyc-sky-accent',p.night?'#e8c77c':'#98702c');
 style.setProperty('--tyc-sky-star',p.night?'#f6d48b':'#a67d31');
 style.setProperty('--tyc-sky-halo',p.night?'#edbf6577':'#b38c3d55');
 style.setProperty('--tyc-sky-star-opacity',String(p.star));
 style.setProperty('--tyc-sprout-brightness',String(p.glow));
 root.dataset.tycHomeSky=p.night?'night':'day';
}
paint();window.setInterval(paint,preview?100:15000);
window.addEventListener('pageshow',paint);
window.addEventListener('focus',paint);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)paint();});
})();

/* Read-only constellation for language and public-preview pages whose legacy visit scripts
   do not render stars, and the all-users administration page. No visit is recorded here. */
(()=>{'use strict';
function init(){
 const header=document.querySelector('body.tyc-unified-header>header.p-header');
 if(!header)return;
 const route=(location.pathname.split('/').filter(Boolean).pop()||'index').replace(/\.html$/,'');
 if(!['community','community-ko','community-en','community-explore','discussion','admin-users'].includes(route))return;
 let host=null,busy=false,signature='';
 function seed(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
 function randomFrom(s){return ()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
 async function refresh(){
  if(busy||document.hidden)return;
  const native=header.querySelector('.tyc-visitor-constellation:not([data-unified-fallback])');if(native){host?.remove();return;}
  const url=window.TYC_SUPABASE_URL,key=window.TYC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)return;
  busy=true;const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6500);
  try{const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/rpc/tyc_site_visitor_stats',{method:'POST',cache:'no-store',headers:{apikey:key,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({p_visitor:null}),signal:ctrl.signal});
   if(!r.ok)return;const data=await r.json(),item=Array.isArray(data)?data[0]:data,n=Number(item?.today);if(!Number.isFinite(n)||n<0)return;
   if(header.querySelector('.tyc-visitor-constellation:not([data-unified-fallback])')){host?.remove();return;}
   const count=Math.floor(n),day=String(item.visit_date||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles'}).format(new Date())),sig=day+':'+count;if(sig===signature&&host?.isConnected)return;signature=sig;
   if(!host||!host.isConnected){host=document.createElement('div');host.className='tyc-visitor-constellation tyc-visitor-constellation-native';host.dataset.unifiedFallback='';host.setAttribute('aria-hidden','true');header.classList.add('tyc-has-visitor-stars');header.append(host);}
   const rand=randomFrom(seed(day)),fragment=document.createDocumentFragment();
   for(let i=0;i<count;i++){const e=document.createElement('span');e.className='tyc-gold-visitor-star';e.style.left=(2+rand()*96).toFixed(2)+'%';e.style.top=(14+rand()*72).toFixed(2)+'%';e.style.setProperty('--star-size',(3.4+rand()*3).toFixed(2)+'px');e.style.setProperty('--star-delay',(-rand()*8).toFixed(2)+'s');e.style.setProperty('--star-duration',(3.5+rand()*5).toFixed(2)+'s');fragment.append(e);}
   host.replaceChildren(fragment);host.dataset.starCount=String(count);
  }catch(e){console.warn('Header visitor stars unavailable',e);}finally{clearTimeout(timer);busy=false;}
 }
 new MutationObserver(()=>{if(host?.isConnected&&header.querySelector('.tyc-visitor-constellation:not([data-unified-fallback])'))host.remove();}).observe(header,{childList:true});
 refresh();setInterval(refresh,120000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();


/* One continuous panorama made from the approved illustrated reference.
   The image is remapped, not tiled. Celestial objects are painted independently
   so they can rise/set instead of remaining baked into the scenery. */
(()=>{'use strict';
 const root=document.documentElement;
 const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
 const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
 const mix=(a,b,t)=>a+(b-a)*t;

 let headers=[],lastKey='',lastTime=0,displayHour=null;
 // Five hand-composed, resolution-independent landscapes. No stretched raster,
 // sinusoidal mountain bands, blurred cloud blobs or duplicate scenery.
 const palettes=[
  {sky:['#082723','#10453f','#39766a'],far:['#52867b','#315f56'],mid:['#31695e','#164b43'],near:['#1b5148','#0b322e'],cloud:['#87a99a','#446f66','#28534f']},
  {sky:['#8eaeaf','#d6dfcf','#f8dfab'],far:['#aebcb2','#8ea59c'],mid:['#91a8a0','#718e85'],near:['#7b978a','#597d75'],cloud:['#fff8e7','#e9e4cc','#b6c7bd']},
  {sky:['#53aef0','#9ed8f9','#d6f1fc'],far:['#b7dded','#8ec4df'],mid:['#8fc3e2','#6badd3'],near:['#6aa9cc','#4e8fb8'],cloud:['#ffffff','#e6f5ff','#9dcced']},
  {sky:['#d99b9d','#f5bf99','#ffe4ad'],far:['#dfb5a1','#c49a8d'],mid:['#c79e91','#a97f7b'],near:['#ac8278','#8d6b70'],cloud:['#fff3d2','#f6d5b6','#d7a3a0']},
  {sky:['#113c43','#236660','#4b8e78'],far:['#719b86','#4f7f70'],mid:['#467d70','#2c6259'],near:['#25594e','#113f3a'],cloud:['#a6b9a0','#668f80','#396760']}
 ];
 function landscape(ctx,w,h,H,n,brandX){
  const p=palettes[n],night=n===0||n===4,blue=n===2;
  const sky=ctx.createLinearGradient(0,0,0,H);
  p.sky.forEach((c,k)=>sky.addColorStop(k*.5,c));ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  const glow=ctx.createRadialGradient(Math.max(12,brandX-27*H/70),H*.68,0,Math.max(12,brandX-27*H/70),H*.68,H*2.8);
  glow.addColorStop(0,night?'#a2b89b44':blue?'#ffffff12':'#fff3bf85');
  glow.addColorStop(1,'#ffffff00');ctx.fillStyle=glow;ctx.fillRect(0,0,w,H);
  ctx.save();ctx.beginPath();ctx.rect(0,0,w,H);ctx.clip();
  const edge=Math.min(w*.29,H*4.4);
  // Coordinates are designed in height units. The middle is a quiet low
  // valley, while irregular mountain silhouettes remain at their natural scale.
  const profiles=[
   [[0,.56],[.10,.43],[.22,.55],[.34,.48],[.50,.64],[.65,.58],[.81,.73],[1,.76]],
   [[0,.71],[.11,.58],[.24,.70],[.37,.62],[.50,.75],[.65,.68],[.81,.82],[1,.87]],
   [[0,.84],[.12,.73],[.24,.80],[.38,.72],[.55,.86],[.70,.83],[.86,.92],[1,.95]]
  ];
  const right=[
   [[0,.76],[.21,.72],[.37,.61],[.49,.69],[.63,.48],[.78,.56],[.91,.42],[1,.53]],
   [[0,.87],[.20,.81],[.38,.73],[.52,.80],[.68,.62],[.82,.70],[1,.57]],
   [[0,.95],[.22,.91],[.40,.82],[.57,.86],[.73,.73],[.86,.80],[1,.70]]
  ];
  const centers=[[.76,.79,.74,.80,.77],[.87,.89,.84,.90,.87],[.95,.96,.94,.97,.95]];
  for(let k=0;k<3;k++){
   const pts=profiles[k].map(([x,y])=>[x*edge,y*H]);
   const center=w-2*edge;
   for(let j=1;j<4;j++)pts.push([edge+center*j/4,centers[k][j]*H]);
   pts.push(...right[k].map(([x,y])=>[w-edge+x*edge,y*H]));
   const grad=ctx.createLinearGradient(0,H*.4,0,H);
   const colors=[p.far,p.mid,p.near][k];grad.addColorStop(0,colors[0]);grad.addColorStop(1,colors[1]);
   ctx.beginPath();ctx.moveTo(...pts[0]);
   for(let j=1;j<pts.length-1;j++){const q=pts[j],z=pts[j+1];ctx.quadraticCurveTo(q[0],q[1],(q[0]+z[0])/2,(q[1]+z[1])/2)}
   ctx.lineTo(...pts.at(-1));ctx.lineTo(w,H);ctx.lineTo(0,H);ctx.closePath();
   ctx.globalAlpha=blue?(k===0?.28:.16):(k===0?.78:.92);ctx.fillStyle=grad;ctx.fill();
  }
  ctx.globalAlpha=1;
  // One joined cloud silhouette with a lit upper rim and a soft, colored
  // underside. No disconnected circles, white fog, or blanket blur.
  function cloud(x,y,size,opacity,flip=false){
   ctx.save();ctx.translate(x,y);ctx.scale(size*(flip?-1:1),size);ctx.globalAlpha=opacity;
   const outline=()=>{
    ctx.beginPath();ctx.moveTo(-2.3,.60);
    ctx.bezierCurveTo(-2.45,.30,-2.14,-.13,-1.61,-.11);
    ctx.bezierCurveTo(-1.55,-.58,-.98,-.87,-.55,-.59);
    ctx.bezierCurveTo(-.35,-1.25,.55,-1.31,.89,-.53);
    ctx.bezierCurveTo(1.21,-.72,1.74,-.45,1.76,-.03);
    ctx.bezierCurveTo(2.21,-.10,2.54,.23,2.42,.57);
    ctx.bezierCurveTo(1.68,.78,.55,.81,-.28,.72);
    ctx.bezierCurveTo(-1.08,.85,-1.94,.76,-2.3,.60);ctx.closePath();
   };
   outline();ctx.clip();
   const g=ctx.createLinearGradient(0,-1.15,0,.84);
   g.addColorStop(0,p.cloud[0]);g.addColorStop(.42,p.cloud[1]);g.addColorStop(1,p.cloud[2]);ctx.fillStyle=g;ctx.fillRect(-3,-1.5,6,3);
   const soft=ctx.createLinearGradient(0,-.75,0,.60);soft.addColorStop(0,p.cloud[0]);soft.addColorStop(1,p.cloud[1]);
   ctx.globalAlpha=opacity*.60;ctx.fillStyle=soft;
   ctx.beginPath();ctx.moveTo(-2.35,.24);ctx.bezierCurveTo(-1.82,.33,-1.76,-.43,-1.20,-.25);ctx.bezierCurveTo(-.84,-.76,-.25,-.60,.02,-.21);ctx.bezierCurveTo(.42,-.79,1.18,-.55,1.31,-.04);ctx.bezierCurveTo(1.75,-.21,2.23,.05,2.48,.32);ctx.lineTo(2.5,-1.4);ctx.lineTo(-2.5,-1.4);ctx.closePath();ctx.fill();
   ctx.restore();
  }
  const z=H*(blue?.23:.19),alpha=blue?.95:night?.54:.76;
  cloud(w-H*.52,H*.56,z*1.12,alpha,true);
  cloud(H*.30,H*.83,z*.93,alpha);
  cloud(w-H*2.0,H*.87,z*.76,alpha*.70,true);
  if(blue){cloud(w*.32,H*.07,z*.56,.72);cloud(w*.72,H*.12,z*.72,.78,true);cloud(w*.17,H*.96,z*.74,.65)}
  ctx.restore();
 }
 function build(entry){
  const rect=entry.header.getBoundingClientRect(),brand=entry.brand.getBoundingClientRect();
  const width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height)),brandX=Math.round(brand.left-rect.left);
  if(entry.width===width&&entry.height===height&&entry.brandX===brandX)return;
  entry.width=width;entry.height=height;entry.brandX=brandX;
  const artH=width<=560?Math.min(height,54):height;entry.artH=artH;
  const res=Math.min(window.devicePixelRatio||1,2,3600/width);
  const w=Math.max(1,Math.round(width*res)),h=Math.max(1,Math.round(height*res));
  entry.canvas.width=w;entry.canvas.height=h;
  entry.layers=palettes.map((_,n)=>{
   const layer=document.createElement('canvas');layer.width=w;layer.height=h;
   landscape(layer.getContext('2d'),w,h,artH*h/height,n,brandX*res);return layer;
  });
 }
 function paintOrb(ctx,x,y,r,alpha,moon,horizon){
  if(alpha<.01)return;
  ctx.save();ctx.globalAlpha=alpha;
  const glow=ctx.createRadialGradient(x,y,0,x,y,r*3.6);
  glow.addColorStop(0,moon?'rgba(255,243,190,.25)':'rgba(255,230,145,.64)');
  glow.addColorStop(.45,moon?'rgba(255,235,170,.09)':'rgba(255,222,134,.24)');
  glow.addColorStop(1,'rgba(255,228,150,0)');
  ctx.fillStyle=glow;ctx.fillRect(x-r*4,y-r*4,r*8,r*8);
  if(!moon){ctx.beginPath();ctx.rect(0,0,ctx.canvas.width,horizon);ctx.clip()}
  ctx.fillStyle=moon?'#fff4d1':'#fff3b4';
  ctx.shadowColor=moon?'#ffedb8':'#ffd38b';ctx.shadowBlur=r*(moon ? .55 : .9);
  ctx.beginPath();
  if(moon){
   // Slightly fuller crescent, retaining sharp tips.
   ctx.save();
   ctx.translate(x,y);
   ctx.rotate(-.27);
   ctx.moveTo(0,-r);
   ctx.bezierCurveTo(-r*1.33,-r,-r*1.33,r,0,r);
   ctx.bezierCurveTo(-r*.76,r*.68,-r*.76,-r*.68,0,-r);
   ctx.closePath();
   ctx.restore();
  }else ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fill();ctx.restore();
 }
 function render(entry,hour,style){
  build(entry);
  const ctx=entry.canvas.getContext('2d'),w=entry.canvas.width,h=entry.canvas.height;
  if(!entry.layers?.length)return;
  const artH=entry.artH*h/entry.height,ratio=w/entry.width;
  const artStops=[[0,0],[4,0],[5,4],[6,1],[8,1],[9,1],[10,2],[13,2],[14,2],[15,1],[16,3],[18,3],[19,4],[20,4],[21,0],[24,0]];
  let ix=0;while(ix<artStops.length-2&&hour>artStops[ix+1][0])ix++;
  const a=artStops[ix],b=artStops[ix+1],t=smooth((hour-a[0])/(b[0]-a[0]));
  ctx.globalAlpha=1;ctx.drawImage(entry.layers[a[1]],0,0);
  if(a[1]!==b[1]){ctx.globalAlpha=t;ctx.drawImage(entry.layers[b[1]],0,0);ctx.globalAlpha=1}
  // A soft, continuous palette wash gives each of the 24 hours its own hue.
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,style.getPropertyValue('--tyc-sky-a').trim()||'#0c3b35');
  g.addColorStop(1,style.getPropertyValue('--tyc-sky-b').trim()||'#1c6352');
  ctx.globalAlpha=.10;ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;
  const day=smooth((hour-5.45)/.65)*(1-smooth((hour-18.15)/.75)),night=1-day;
  const altitude=Math.sin(Math.PI*clamp((hour-6)/12));
  const r=Math.min(11.5,Math.max(7,entry.artH*.145))*ratio;
  const x=clamp((entry.brandX-29)*ratio,12*ratio,w-12*ratio);
  const horizon=artH*.79;
  const y=horizon-r*.1-(artH*.53)*altitude+artH*.24*(1-smooth((hour-5.5)/.5)+smooth((hour-18)/.8));
  const moonArc=Math.sin(Math.PI*clamp(((hour+5)%24)/11));
  const moonY=artH*(.38-.12*moonArc)+artH*.27*(1-night);
  paintOrb(ctx,x,y,r,day,false,horizon);
  paintOrb(ctx,x,moonY,r*.9,night,true,horizon);
 }
 function hourNow(){
  if(root.dataset.tycSkyPreview==='true'){
   const tag=document.querySelector('.tyc-preview-hour');
   const m=tag?.textContent.match(/(\d{2}):00/);
   if(m)return Number(m[1]);
  }
  const now=new Date();return now.getHours()+now.getMinutes()/60;
 }
 function tick(now){
  const target=hourNow();
  if(displayHour===null)displayHour=target;
  const delta=((target-displayHour+36)%24)-12;
  const dt=Math.min(100,Math.max(0,now-lastTime));lastTime=now;
  if(Math.abs(delta)>.001)displayHour=(displayHour+delta*Math.min(1,dt/140)+24)%24;
  else displayHour=target;
  const key=displayHour.toFixed(2)+'|'+headers.map(e=>e.header.clientWidth+'x'+e.header.clientHeight).join(';');
  if(key!==lastKey){lastKey=key;const style=getComputedStyle(root);for(const e of headers)render(e,displayHour,style)}
  frame=requestAnimationFrame(tick);
 }
 function init(){
  for(const header of document.querySelectorAll('body.tyc-unified-header>header.p-header')){
   const brand=header.querySelector('.p-brand');if(!brand)continue;
   const layer=document.createElement('canvas');layer.className='tyc-panorama-sky';layer.setAttribute('aria-hidden','true');
   header.prepend(layer);headers.push({header,brand,canvas:layer});
  }
  if(root.dataset.tycSkyPreview==='true'&&!document.querySelector('.tyc-preview-hour')){
   const tag=document.createElement('div');tag.className='tyc-preview-hour';tag.setAttribute('aria-hidden','true');tag.textContent='SKY TEST · 00:00';document.body.append(tag);
  }
  if(headers.length)frame=requestAnimationFrame(tick);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
