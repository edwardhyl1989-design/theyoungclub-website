
(()=>{'use strict';
const stops=[[0,[17,44,34],[33,70,57],1],[5,[27,56,43],[48,79,59],0.85],[7,[243,229,198],[255,249,231],0.27],[9,[255,254,250],[249,247,239],0.16],[15,[255,253,247],[250,243,226],0.2],[17,[239,218,174],[224,201,150],0.42],[19,[48,78,57],[67,95,65],0.85],[21,[17,44,34],[33,70,57],1],[24,[17,44,34],[33,70,57],1]];
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
 const p=palette(key/60,stops),style=root.style;
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
