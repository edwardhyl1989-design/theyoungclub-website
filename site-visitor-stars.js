/* THE YOUNG CLUB — golden visitor constellation.
   A tiny decorative star per unique visitor for the current Los Angeles calendar day.
   Stable seeded positions on every page; lightweight canvas, never blocks controls. */
(()=>{'use strict';
 const host=document.createElement('div');host.className='tyc-visitor-constellation';
 host.setAttribute('aria-hidden','true');
 const base=document.createElement('canvas'),glow=document.createElement('canvas');
 host.append(base,glow);
 (document.body||document.documentElement).prepend(host);
 let count=0,day='',points=[],selected=[],frame=0,raf=0,dpr=1,lastTime=0;
 const baseCtx=base.getContext('2d'),glowCtx=glow.getContext('2d');
 if(!baseCtx||!glowCtx){host.remove();return;}
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 const rand=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
 const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),16777619);}return h>>>0;};
 const size=()=>{const rect=host.getBoundingClientRect();return {w:Math.max(1,rect.width),h:Math.max(1,rect.height)};};
 function configure(){
  const {w,h}=size();dpr=Math.min(devicePixelRatio||1,2);
  for(const c of [base,glow]){c.width=Math.ceil(w*dpr);c.height=Math.ceil(h*dpr);c.style.width=w+'px';c.style.height=h+'px';}
  baseCtx.setTransform(dpr,0,0,dpr,0,0);
  glowCtx.setTransform(dpr,0,0,dpr,0,0);
  return {w,h};
 }
 function star(ctx,x,y,r,alpha,bright){
  ctx.save();ctx.translate(x,y);
  ctx.globalAlpha=alpha;
  if(bright){ctx.shadowColor='#ffd777';ctx.shadowBlur=9;}
  ctx.strokeStyle=bright?'#f6ca62':'#cba357';
  ctx.lineWidth=bright?1.05:.75;
  ctx.beginPath();ctx.moveTo(-r,0);ctx.lineTo(r,0);ctx.moveTo(0,-r);ctx.lineTo(0,r);ctx.stroke();
  ctx.fillStyle=bright?'#fff3bf':'#ebc76a';
  ctx.beginPath();ctx.arc(0,0,bright?.9:.65,0,Math.PI*2);ctx.fill();
  ctx.restore();
 }
 function paint(){
  const {w,h}=configure();baseCtx.clearRect(0,0,w,h);glowCtx.clearRect(0,0,w,h);
  const random=rand(hash(day||'today'));
  points=[];
  // Each individual visitor gets its own deterministic position and star.
  for(let i=0;i<count;i++){
   const x=12+random()*Math.max(1,w-24),y=10+random()*Math.max(1,h-20);
   const r=1.4+random()*1.9,alpha=.27+random()*.35;
   const phase=random()*Math.PI*2,speed=.5+random()*.8;
   points.push({x,y,r,alpha,phase,speed});
   star(baseCtx,x,y,r,alpha,false);
  }
  // Make just a handful shimmer at a time to keep the effect subtle.
  const step=Math.max(1,Math.floor(count/28));
  selected=points.filter((_,i)=>i%step===0).slice(0,28);
 }
 function animate(time){
  raf=0;
  if(!count||document.hidden||reduce.matches)return;
  if(time-lastTime<85){raf=requestAnimationFrame(animate);return;}
  lastTime=time;
  const {w,h}=size();glowCtx.clearRect(0,0,w,h);
  const t=time/1000;
  for(const p of selected){
   const intensity=(Math.sin(t*p.speed*1.7+p.phase)+1)/2;
   if(intensity>.42)star(glowCtx,p.x,p.y,p.r*(1.05+intensity*.85),Math.pow(intensity,2)*.8,true);
  }
  raf=requestAnimationFrame(animate);
 }
 function update(n,date){
  const next=Math.max(0,Math.floor(Number(n)||0)),newDate=String(date||'');
  if(next===count&&newDate===day)return;
  count=next;day=newDate;paint();
  if(raf)cancelAnimationFrame(raf);
  if(!reduce.matches&&!document.hidden&&count)raf=requestAnimationFrame(animate);
 }
 window.TYC_VisitorStars={update};
 window.addEventListener('resize',()=>{paint();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else{paint();if(!reduce.matches&&!raf&&count)raf=requestAnimationFrame(animate);}});
 reduce.addEventListener?.('change',()=>{if(raf)cancelAnimationFrame(raf);raf=0;glowCtx.clearRect(0,0,glow.width,glow.height);if(!reduce.matches&&count)raf=requestAnimationFrame(animate);});
})();