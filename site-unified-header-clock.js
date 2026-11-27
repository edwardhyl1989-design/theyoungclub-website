
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
 const image=new Image();
 image.src=new URL('sky-artwork-reference.webp',document.baseURI).href;
 const source=document.createElement('canvas'),sc=source.getContext('2d',{willReadFrequently:true});
 const rows=[],scenes=[],W=176,H=48;
 let headers=[],lastKey='',frame=0,lastTime=0,displayHour=null;
 const remove=[[66,19,15,17],[79,29,16,16],null,[39,30,16,16],[53,19,15,17]];
 function prepare(){
  source.width=W;source.height=H;
  for(let n=0;n<5;n++){
   sc.clearRect(0,0,W,H);
   sc.drawImage(image,0,n*image.height/5,image.width,image.height/5,0,0,W,H);
   const img=sc.getImageData(0,0,W,H),data=img.data,original=new Uint8ClampedArray(data);
   const r=remove[n];
   if(r){
    const [cx,cy,rx,ry]=r;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
     const dx=(x-cx)/rx,dy=(y-cy)/ry,d=Math.sqrt(dx*dx+dy*dy);
     if(d>=1.16)continue;
     const a=smooth((1.16-d)/.36);
     const lx=clamp(Math.floor(cx-rx*1.35),0,W-1),rr=clamp(Math.ceil(cx+rx*1.35),0,W-1);
     const t=clamp((x-lx)/(rr-lx));
     for(let k=0;k<3;k++){
      const left=original[(y*W+lx)*4+k],right=original[(y*W+rr)*4+k];
      data[(y*W+x)*4+k]=mix(original[(y*W+x)*4+k],mix(left,right,t),a);
     }
    }
   }
   rows.push(img);
  }
 }
 function sample(data,x,y,k){
  x=clamp(x,0,W-1);y=clamp(y,0,H-1);
  const ix=Math.floor(x),iy=Math.floor(y),jx=Math.min(W-1,ix+1),jy=Math.min(H-1,iy+1);
  return mix(mix(data[(iy*W+ix)*4+k],data[(iy*W+jx)*4+k],x-ix),mix(data[(jy*W+ix)*4+k],data[(jy*W+jx)*4+k],x-ix),y-iy);
 }
 /* Refined atmospheric depth: graded ridges, mist and softly sculpted clouds.
    Render once per size and palette, beneath the live celestial objects. */
 function sculptLandscape(ctx,w,h,n,artH){
  const u=Math.min(1,artH/h),H=artH,night=n===0||n===4,blue=n===2,warm=n===3;
  const rgb=(v,a=1)=>'rgba('+v.join(',')+','+a+')';
  const tones=night?[[93,139,128],[50,103,91],[20,65,58]]:
   blue?[[177,215,238],[111,176,218],[76,147,188]]:
   warm?[[240,195,157],[196,146,127],[149,108,105]]:
   [[194,205,186],[151,174,166],[106,142,134]];
  const cloudLight=night?[154,190,171]:warm?[255,244,217]:[255,255,251];
  const cloudShadow=night?[39,85,79]:warm?[207,153,136]:blue?[127,187,229]:[172,195,205];
  const ridge=(x,level)=>{
   const t=x/w,edge=Math.pow(Math.abs(t*2-1),1.6);
   const a=(.56*Math.sin(x/(H*1.75)+level*1.1)+.27*Math.sin(x/(H*.76)+level*2.7)+.11*Math.sin(x/(H*.31)+level*1.5)+.06*Math.sin(x/(H*.13)+level*4));
   return H*(.79+level*.078-edge*(.22-level*.045)+a*(.027+edge*.072));
  };
  ctx.save();ctx.beginPath();ctx.rect(0,0,w,H);ctx.clip();
  // Distant silhouettes are lighter; foreground ridges have denser color.
  for(let level=0;level<3;level++){
   const points=[];const step=Math.max(1,H/19);
   for(let x=0;x<w;x+=step)points.push([x,ridge(x,level)]);
   points.push([w,ridge(w,level)]);
   const trace=()=>{ctx.moveTo(points[0][0],points[0][1]);for(let j=1;j<points.length-1;j++){const p=points[j],q=points[j+1];ctx.quadraticCurveTo(p[0],p[1],(p[0]+q[0])/2,(p[1]+q[1])/2)}ctx.lineTo(w,points.at(-1)[1]);};
   const g=ctx.createLinearGradient(0,H*.50,0,H);
   const c=tones[level],light=c.map(v=>Math.min(255,v+26)),dark=c.map(v=>Math.max(0,v-19));
   g.addColorStop(0,rgb(light,.76));g.addColorStop(.52,rgb(c,.84));g.addColorStop(1,rgb(dark,.93));
   ctx.beginPath();trace();ctx.lineTo(w,H);ctx.lineTo(0,H);ctx.closePath();ctx.fillStyle=g;
   ctx.globalAlpha=blue?.29:night?.68:.46;ctx.fill();
   ctx.beginPath();trace();ctx.strokeStyle=rgb(light,night?.44:.58);ctx.lineWidth=Math.max(.45,H*.009);ctx.stroke();
  }
  // Low-lying atmospheric mist separates the silhouettes without covering navigation.
  const mist=ctx.createLinearGradient(0,H*.60,0,H);
  mist.addColorStop(0,rgb(cloudLight,0));mist.addColorStop(.45,rgb(cloudLight,night?.075:.19));mist.addColorStop(1,rgb(cloudLight,0));
  ctx.globalAlpha=1;ctx.fillStyle=mist;ctx.fillRect(0,H*.60,w,H*.40);
  // Cloud banks are assembled from soft, overlapping shaded volumes rather than flat outlines.
  const cloud=(cx,cy,scale,opacity)=>{
   ctx.save();ctx.translate(cx,cy);ctx.scale(scale,scale);ctx.globalAlpha=opacity;
   const lobes=[[-1.05,.19,.57],[-.58,-.03,.72],[.02,-.25,.89],[.67,.02,.68],[1.14,.23,.48]];
   for(const [x,y,r] of lobes){
    const g=ctx.createRadialGradient(x-r*.28,y-r*.45,r*.08,x,y,r);
    g.addColorStop(0,rgb(cloudLight,.98));g.addColorStop(.36,rgb(cloudLight,.84));g.addColorStop(.74,rgb(cloudShadow,.49));g.addColorStop(1,rgb(cloudShadow,0));
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
   }
   ctx.restore();
  };
  const a=blue?.86:night?.28:warm?.46:.45;
  const b=H*(blue?.23:.19);
  cloud(w*.028,H*.77,b*1.05,a);
  cloud(w*.12,H*.94,b*.72,a*.65);
  cloud(w*.94,H*.26,b*.86,a*.70);
  cloud(w*.995,H*.64,b*1.35,a);
  cloud(w*.81,H*.91,b*.80,a*.65);
  if(blue){cloud(w*.34,H*.09,b*.59,a*.57);cloud(w*.66,H*.13,b*.76,a*.62)}
  ctx.restore();
 }
 function build(entry){
  const rect=entry.header.getBoundingClientRect(),brand=entry.brand.getBoundingClientRect();
  const width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));
  if(entry.width===width&&entry.height===height&&entry.brandX===Math.round(brand.left-rect.left))return;
  entry.width=width;entry.height=height;entry.brandX=Math.round(brand.left-rect.left);
  const artH=width<=560?Math.min(height,54):height;
  entry.artH=artH;
  const res=Math.min(1,1400/width),w=Math.max(1,Math.round(width*res)),h=Math.max(1,Math.round(height*res));
  entry.canvas.width=w;entry.canvas.height=h;
  const hh=artH*res;
  entry.layers=rows.map((row,n)=>{
   const layer=document.createElement('canvas');layer.width=w;layer.height=h;
   const ctx=layer.getContext('2d'),im=ctx.createImageData(w,h),out=im.data,data=row.data;
   // Keep landscape detail at both edges at its original aspect ratio; broaden
   // the quiet central sky smoothly, without stretched sun/moon or image seams.
   const l=Math.min(w*.43,Math.max(artH*2.5,entry.brandX+artH*1.5)*res);
   const r=Math.min(w*.36,artH*4.25*res);
   const mid=Math.max(1,w-l-r);
   for(let x=0;x<w;x++){
    let sx;
    if(x<l)sx=85*x/Math.max(1,l);
    else if(x>w-r)sx=101+(W-102)*(x-(w-r))/Math.max(1,r);
    else sx=85+16*smooth((x-l)/mid);
    const quiet=smooth((x-l*.65)/Math.max(1,l*.45))*smooth((w-r*.55-x)/Math.max(1,r*.7));
    const wave=(Math.sin(x/Math.max(1,artH*.9))+.55*Math.sin(x/Math.max(1,artH*.47)+1.2))*1.4*quiet;
    for(let y=0;y<h;y++){
     const yy=clamp(y/Math.max(1,hh-1),0,1)*(H-1);
     const sy=yy+wave*smooth((yy-18)/23);
     const k0=(y*w+x)*4;
     for(let k=0;k<3;k++){
      let v=sample(data,sx,sy,k);
      // Soften the long central ridge rather than stretch a narrow strip into a hard line.
      const sky=sample(data,94,Math.min(yy,31),k);
      const fade=quiet*.23*(1-smooth((yy-36)/11));
      v=mix(v,sky,fade);
      out[k0+k]=v;
     }
     out[k0+3]=255;
    }
   }
   ctx.putImageData(im,0,0);
   sculptLandscape(ctx,w,h,n,hh);
   return layer;
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
   // Thin crescent: outer and inner arcs meet at two sharp tips.
   ctx.save();
   ctx.translate(x,y);
   ctx.rotate(-.27);
   ctx.moveTo(0,-r);
   ctx.bezierCurveTo(-r*1.33,-r,-r*1.33,r,0,r);
   ctx.bezierCurveTo(-r*.94,r*.68,-r*.94,-r*.68,0,-r);
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
  ctx.globalAlpha=.20;ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;
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
  if(!image.complete||!image.naturalWidth)return;
  prepare();
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
 function ready(){if(image.complete&&image.naturalWidth)init();else image.addEventListener('load',init,{once:true})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
