
(()=>{'use strict';
const stops=[[0,[7,36,31],[15,58,48],1],[1,[7,36,31],[15,58,48],1],[2,[8,38,32],[16,59,49],1],[3,[9,40,34],[18,62,51],1],[4,[11,43,36],[21,65,54],0.98],[5,[17,54,46],[28,77,64],0.91],[6,[33,82,69],[47,105,86],0.71],[7,[166,183,145],[218,207,159],0.44],[8,[246,224,184],[255,245,219],0.28],[9,[250,246,236],[255,251,242],0.17],[10,[251,248,240],[255,252,245],0.15],[11,[252,249,242],[255,253,247],0.14],[12,[252,249,241],[255,253,245],0.14],[13,[251,248,240],[255,252,244],0.15],[14,[250,246,235],[255,251,240],0.17],[15,[252,239,215],[255,248,231],0.21],[16,[251,228,189],[255,242,214],0.3],[17,[245,211,158],[255,231,195],0.45],[18,[238,190,142],[250,215,177],0.6],[19,[38,91,83],[54,112,98],0.84],[20,[18,65,56],[30,85,71],0.95],[21,[9,43,35],[18,66,52],1],[22,[7,38,32],[15,59,48],1],[23,[7,36,31],[15,58,48],1],[24,[7,36,31],[15,58,48],1]];
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
let minute=-1;
function paint(){
 const now=new Date(),key=now.getHours()*60+now.getMinutes();
 if(key===minute)return;minute=key;
 const h=key/60,p=palette(h,stops),style=root.style;
 // A miniature local-clock illustration: 06:00 sunrise, 18:00 sunset, then moonrise.
 const clamp=v=>Math.min(1,Math.max(0,v));
 const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 const day=smooth((h-5.5)/.9)*(1-smooth((h-18.2)/.8));
 const moon=1-day;
 const arc=clamp((h-6)/12);
 const altitude=Math.sin(Math.PI*arc);
 const sunY=19-17*altitude+10*(1-smooth((h-5.5)/.5)+smooth((h-18)/.8));
 const moonArc=clamp(((h+6)%24)/12);
 style.setProperty('--tyc-sun-y',sunY.toFixed(2)+'px');
 style.setProperty('--tyc-moon-y',(4-5*Math.sin(Math.PI*moonArc)+8*(1-moon)).toFixed(2)+'px');
 style.setProperty('--tyc-sun-opacity',day.toFixed(3));
 style.setProperty('--tyc-moon-opacity',moon.toFixed(3));
 style.setProperty('--tyc-hill-opacity',(.14+.60*Math.max(1-day,1-altitude)*Math.max(day,moon)).toFixed(3));
 style.setProperty('--tyc-hill-back',p.night?'#668d70':h>=16?'#cb9367':'#b6ad86');
 style.setProperty('--tyc-hill-front',p.night?'#365e50':h>=16?'#a87560':'#83947c');
 style.setProperty('--tyc-sun-color',h<8||h>=16?'#fff0a0':'#ffc65c');
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
paint();window.setInterval(paint,15000);
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

/* Decorative local-clock sky, separate from the clickable brand and visitor stars. */
(()=>{'use strict';
 function initSky(){
  for(const brand of document.querySelectorAll('body.tyc-unified-header>header.p-header .p-brand')){
   if(brand.querySelector('.tyc-mini-sky'))continue;
   const scene=document.createElement('span');
   scene.className='tyc-mini-sky';scene.setAttribute('aria-hidden','true');
   scene.innerHTML='<svg viewBox="0 0 80 54" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g class="tyc-mini-sun"><circle cx="39" cy="18" r="10" class="tyc-sun-halo"/><circle cx="39" cy="18" r="7" class="tyc-sun-disc"/><path class="tyc-sun-rays" d="M39 5v4m0 18v4M26 18h4m18 0h4M30 9l3 3m12 12 3 3m0-18-3 3M33 24l-3 3"/></g><g class="tyc-mini-moon"><path d="M42 6a10 10 0 1 0 7 16A10 10 0 0 1 42 6Z" fill="#fff2bd"/><path d="M52 8v5m-2.5-2.5h5" stroke="#fff2bd" stroke-width=".8" opacity=".7"/></g><g class="tyc-mini-hills"><path class="tyc-mini-hill-back" d="M0 42Q9 31 20 39Q29 27 40 39Q50 31 62 42L80 47V54H0Z"/><path class="tyc-mini-hill-front" d="M0 46Q11 36 22 46Q31 37 45 46Q57 39 68 49L80 54H0Z"/></g></svg>';
   brand.prepend(scene);
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initSky,{once:true});else initSky();
})();
