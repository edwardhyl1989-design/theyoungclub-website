/* THE YOUNG CLUB — small, decorative workout mascot inside dark page headers.
   Drawn with lightweight SVG; no external images, no tracking, no layout shift. */
(()=>{'use strict';
 const header=document.querySelector('header.tyc-site-header');
 if(!header)return;

 function mount(){
  const inner=header.querySelector('.tyc-header-inner');
  const brand=inner?.querySelector('.tyc-header-brand');
  const nav=inner?.querySelector('.tyc-header-nav');
  const menu=inner?.querySelector('.tyc-mobile-menu-toggle');
  if(!inner||!brand||inner.querySelector('.tyc-header-workout'))return;

  const mascot=document.createElement('span');
  mascot.className='tyc-header-workout';
  mascot.setAttribute('aria-hidden','true');
  mascot.setAttribute('role','presentation');
  mascot.hidden=true;
  mascot.innerHTML=`<svg class="tyc-mini-svg" viewBox="0 0 76 82" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">
  <defs>
   <linearGradient id="tyc-mini-shirt-gradient" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#9dffca"/><stop offset="1" stop-color="#31c987"/></linearGradient>
  </defs>
  <ellipse class="tyc-mini-shadow" cx="38" cy="75" rx="19" ry="3" fill="#b3ffcf" opacity=".22"/>
  <g class="tyc-mini-figure">
   <g class="tyc-mini-legs">
    <path d="M32 54 L31 68" stroke="#f1bf97" stroke-width="6" stroke-linecap="round"/>
    <path d="M44 54 L45 68" stroke="#f1bf97" stroke-width="6" stroke-linecap="round"/>
    <path d="M30 51 Q38 54 46 51 L47 57 Q43 59 39 56 L37 56 Q33 59 29 57Z" fill="#15362e"/>
    <path d="M26 70 Q29 67 35 70 L37 74 L24 74 Q24 71 26 70" fill="#e7fef1"/>
    <path d="M43 70 Q47 67 51 70 L53 74 L40 74Z" fill="#e7fef1"/>
    <path d="M25 73 H37 M40 73 H53" stroke="#80dab0" stroke-width="1.4"/>
   </g>
   <g class="tyc-mini-arm tyc-mini-arm-left">
    <path d="M29 35 Q25 39 20 48" fill="none" stroke="#f3c8a4" stroke-width="6" stroke-linecap="round"/>
    <path d="M14 47 H26" stroke="#f5d7a0" stroke-width="3.5" stroke-linecap="round"/>
    <rect x="12" y="43" width="4" height="11" rx="1.5" fill="#ffe2a2"/>
    <rect x="25" y="43" width="4" height="11" rx="1.5" fill="#ffe2a2"/>
   </g>
   <g class="tyc-mini-arm tyc-mini-arm-right">
    <path d="M47 35 Q51 39 56 48" fill="none" stroke="#f3c8a4" stroke-width="6" stroke-linecap="round"/>
    <path d="M50 47 H62" stroke="#f5d7a0" stroke-width="3.5" stroke-linecap="round"/>
    <rect x="47" y="43" width="4" height="11" rx="1.5" fill="#ffe2a2"/>
    <rect x="60" y="43" width="4" height="11" rx="1.5" fill="#ffe2a2"/>
   </g>
   <rect x="28" y="33" width="20" height="22" rx="7" fill="url(#tyc-mini-shirt-gradient)"/>
   <path d="M33 37 Q38 41 43 37" fill="none" stroke="#e8fff2" stroke-width="1.5" opacity=".72"/>
   <path d="M39 43 Q44 41 44 45 Q40 49 37 48 Q36 43 39 43" fill="#126d4b" opacity=".8"/>
   <rect x="34" y="28" width="8" height="9" rx="3" fill="#ebbb96"/>
   <circle cx="38" cy="20" r="12" fill="#ffd3ac"/>
   <path d="M26 18 Q26 6 39 8 Q49 8 50 17 Q44 13 36 15 Q31 18 26 18" fill="#17382e"/>
   <path d="M27 18 Q30 13 33 13" stroke="#17382e" stroke-width="3.5" stroke-linecap="round"/>
   <g class="tyc-mini-eyes" fill="#17382e">
    <circle cx="34" cy="21" r="1.4"/>
    <circle cx="43" cy="21" r="1.4"/>
   </g>
   <path d="M36 26 Q38 28 41 26" stroke="#a45f4b" fill="none" stroke-width="1.3" stroke-linecap="round"/>
   <circle cx="30" cy="25" r="2" fill="#efa58e" opacity=".5"/>
   <circle cx="47" cy="25" r="2" fill="#efa58e" opacity=".5"/>
  </g>
  <path class="tyc-mini-sweat" d="M55 14 Q61 19 55 23 Q49 19 55 14" fill="#8cf2d8"/>
  <path class="tyc-mini-spark" d="M11 19 V26 M7.5 22.5 H14.5" stroke="#ffe4a4" stroke-width="1.7" stroke-linecap="round"/>
 </svg>`;
  inner.append(mascot);

  const visibleRect=node=>{
   if(!node||getComputedStyle(node).display==='none')return null;
   const box=node.getBoundingClientRect();
   return box.width>2&&box.height>2?box:null;
  };
  function place(){
   const a=brand.getBoundingClientRect();
   const box=inner.getBoundingClientRect();
   const head=header.getBoundingClientRect();
   if(a.width<2||box.width<2)return;

   const sameRow=[];
   for(const n of [menu,nav]){
    const r=visibleRect(n);
    if(r&&r.left>a.right-2&&Math.abs((r.top+r.height/2)-(a.top+a.height/2))<a.height*.47)sameRow.push(r.left);
   }
   const end=Math.min(box.right,...sameRow);
   const miniWidth=window.innerWidth<=620?48:64;
   const miniHeight=window.innerWidth<=620?52:67;
   const available=end-a.right;

   // Never cover the sprout, account controls or navigation.
   if(available<miniWidth+12||head.height<miniHeight+4){
    mascot.hidden=true;
    return;
   }
   const centerX=a.right+Math.min(available/2,87);
   const centerY=Math.max(head.top+miniHeight/2+2,Math.min(a.top+a.height/2,head.bottom-miniHeight/2-2));
   mascot.style.left=(centerX-box.left)+'px';
   mascot.style.top=(centerY-box.top)+'px';
   mascot.hidden=false;
  }

  let frame=0;
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(place);};
  schedule();
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('pageshow',schedule);
  if('ResizeObserver' in window){
   const observer=new ResizeObserver(schedule);
   observer.observe(inner);
   observer.observe(header);
   observer.observe(brand);
   if(nav)observer.observe(nav);
   if(menu)observer.observe(menu);
  }
  document.addEventListener('visibilitychange',()=>mascot.classList.toggle('tyc-mini-paused',document.hidden));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
})();