
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

/* Layered sky artwork: decorative only; existing links and visitor stars remain independent. */
(()=>{'use strict';
const clouds='<defs><linearGradient id="tyc-cloud-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--tyc-cloud-top,#fff)"/><stop offset="1" stop-color="var(--tyc-cloud-base,#a6cfe9)"/></linearGradient><linearGradient id="tyc-haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe8ac" stop-opacity="0"/><stop offset="1" stop-color="#ffe8ac" stop-opacity=".8"/></linearGradient><g id="tyc-cloud-shape"><path d="M0 23C2 16 12 13 19 16C20 5 35 2 43 9C49 -2 66 0 73 13C86 9 96 16 99 24C109 21 119 26 123 31H0Z" fill="url(#tyc-cloud-fill)"/><path d="M8 24Q27 12 39 20Q59 8 75 21Q97 18 115 30H8Z" fill="var(--tyc-cloud-top,#fff)" opacity=".32"/></g></defs>';
const landscape='<svg viewBox="0 0 1600 80" preserveAspectRatio="none" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+clouds+'<rect class="tyc-sky-haze" x="0" y="25" width="1600" height="55" fill="url(#tyc-haze)"/><g class="tyc-wide-clouds"><use href="#tyc-cloud-shape" transform="translate(-22 36) scale(1.35 .95)"/><use href="#tyc-cloud-shape" transform="translate(170 51) scale(1.2 .65)" opacity=".6"/><use href="#tyc-cloud-shape" transform="translate(488 -8) scale(.95 .64)" opacity=".64"/><use href="#tyc-cloud-shape" transform="translate(860 48) scale(1.35 .65)" opacity=".72"/><use href="#tyc-cloud-shape" transform="translate(1135 -4) scale(1.25 .7)" opacity=".75"/><use href="#tyc-cloud-shape" transform="translate(1450 35) scale(1.65 1.15)"/></g><g class="tyc-wide-hills"><path class="tyc-hill-back" d="M0 57Q33 45 65 57T130 59Q173 35 211 57T290 63Q360 49 422 65T580 70Q690 61 820 70T1050 66Q1145 49 1205 63T1350 57Q1420 37 1480 56T1600 52V80H0Z"/><path class="tyc-hill-mid" d="M0 64Q48 51 89 63T185 67Q232 49 290 66T490 72Q700 64 860 74T1150 70Q1245 58 1320 68T1490 60Q1555 48 1600 65V80H0Z"/><path class="tyc-hill-front" d="M0 70Q53 58 103 70T220 72Q287 60 360 73T600 77Q800 70 1000 76T1270 72Q1334 59 1411 73T1600 68V80H0Z"/></g></svg>';
const celestial='<svg viewBox="0 0 66 52" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g class="tyc-mini-sun"><circle cx="31" cy="16" r="13" class="tyc-sun-halo"/><circle cx="31" cy="16" r="7.6" class="tyc-sun-disc"/><path class="tyc-sun-rays" d="M31 3v5m0 16v5M18 16h5m16 0h5M22 7l4 4m10 10 4 4m0-18-4 4M26 21l-4 4"/></g><g class="tyc-mini-moon"><path d="M34 6A11 11 0 1 0 43 24A11 11 0 0 1 34 6Z" fill="#fff4ce"/><path d="M45 8v5m-2.5-2.5h5" stroke="#f9e7b5" stroke-width=".8" opacity=".75"/></g><g class="tyc-mini-hills"><path class="tyc-hill-back" d="M0 39Q9 30 18 39Q30 31 39 40Q53 33 66 41V52H0Z"/><path class="tyc-hill-mid" d="M0 44Q10 35 22 43T44 43Q55 38 66 45V52H0Z"/><path class="tyc-hill-front" d="M0 48Q12 39 24 47T47 47Q57 43 66 49V52H0Z"/></g></svg>';
function init(){
 for(const header of document.querySelectorAll('body.tyc-unified-header>header.p-header')){
  if(header.querySelector('.tyc-wide-sky'))continue;
  const layer=document.createElement('div');layer.className='tyc-wide-sky';layer.setAttribute('aria-hidden','true');layer.innerHTML=landscape;header.prepend(layer);
  const brand=header.querySelector('.p-brand');
  if(brand){const art=document.createElement('span');art.className='tyc-mini-sky';art.setAttribute('aria-hidden','true');art.innerHTML=celestial;brand.prepend(art);}
 }
 if(document.documentElement.dataset.tycSkyPreview==='true'&&!document.querySelector('.tyc-preview-hour')){
  const tag=document.createElement('div');tag.className='tyc-preview-hour';tag.setAttribute('aria-hidden','true');tag.textContent='SKY TEST · 00:00';document.body.append(tag);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
