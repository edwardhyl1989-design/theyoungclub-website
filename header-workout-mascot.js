/* THE YOUNG CLUB: miniature PTA assisting a patient with a supine leg stretch.
   Decorative, self-contained SVG; same header footprint logic, no new dependencies. */
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
  mascot.innerHTML="<svg class=\"tyc-mini-svg\" viewBox=\"0 0 164 88\" xmlns=\"http://www.w3.org/2000/svg\" focusable=\"false\" aria-hidden=\"true\">\n <defs>\n  <linearGradient id=\"tyc-mini-pt-shirt\" x1=\"0\" x2=\"1\" y1=\"0\" y2=\"1\"><stop stop-color=\"#a4ffce\"/><stop offset=\"1\" stop-color=\"#2fc88b\"/></linearGradient>\n  <linearGradient id=\"tyc-mini-tabletop\" x1=\"0\" x2=\"0\" y1=\"0\" y2=\"1\"><stop stop-color=\"#f0f6ee\"/><stop offset=\"1\" stop-color=\"#94ada2\"/></linearGradient>\n </defs>\n <ellipse cx=\"81\" cy=\"83\" rx=\"72\" ry=\"3\" fill=\"#6ab991\" opacity=\".14\"/>\n <!-- The treatment table has a recognizable mattress, frame and two legs. -->\n <g class=\"tyc-mini-treatment-table\">\n  <path d=\"M17 62 V79 M99 62 V79\" stroke=\"#b4c6bc\" stroke-width=\"4\" stroke-linecap=\"round\"/>\n  <path d=\"M14 80 H25 M96 80 H107\" stroke=\"#e4eee7\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n  <rect x=\"5\" y=\"55\" width=\"109\" height=\"9\" rx=\"4\" fill=\"url(#tyc-mini-tabletop)\" stroke=\"#e5f5e9\" stroke-width=\"1\"/>\n  <path d=\"M10 62 H110\" stroke=\"#4d7867\" stroke-width=\"2\" opacity=\".65\"/>\n  <rect x=\"13\" y=\"40\" width=\"19\" height=\"10\" rx=\"5\" fill=\"#d4eee0\"/>\n </g>\n <!-- Patient lying supine, with the opposite leg resting on the table. -->\n <g class=\"tyc-mini-patient\">\n  <path d=\"M73 51 Q87 53 105 52\" stroke=\"#253c43\" stroke-width=\"7\" fill=\"none\" stroke-linecap=\"round\"/>\n  <path d=\"M104 52 Q109 52 111 49 L115 51 L114 56 H104Z\" fill=\"#eaf5f5\"/>\n  <path d=\"M41 47 H78\" stroke=\"#e9b992\" stroke-width=\"11\" stroke-linecap=\"round\"/>\n  <rect x=\"40\" y=\"40\" width=\"39\" height=\"13\" rx=\"6\" fill=\"#78bad0\"/>\n  <path d=\"M40 43 Q52 41 62 44\" stroke=\"#b7f0fa\" stroke-width=\"1.3\" fill=\"none\" opacity=\".9\"/>\n  <path d=\"M47 49 Q56 53 66 52\" stroke=\"#e9b992\" stroke-width=\"3\" stroke-linecap=\"round\" fill=\"none\"/>\n  <path d=\"M71 43 H82 L81 54 H71Z\" fill=\"#284c57\"/>\n  <path d=\"M37 45 H41\" stroke=\"#edbd94\" stroke-width=\"5\" stroke-linecap=\"round\"/>\n  <ellipse cx=\"26\" cy=\"45\" rx=\"12\" ry=\"9.5\" fill=\"#f8c89f\"/>\n  <path d=\"M14 45 Q14 35 25 36 Q30 36 34 40 Q27 39 23 42 Q19 46 14 45Z\" fill=\"#334750\"/>\n  <path d=\"M25 47 Q27 49 29 47\" stroke=\"#835d51\" stroke-width=\"1.2\" stroke-linecap=\"round\" fill=\"none\"/>\n </g>\n <!-- One leg rises from the hip for a slow assisted hamstring stretch. -->\n <g class=\"tyc-mini-patient-leg\">\n  <path d=\"M77 48 L111 48\" stroke=\"#f6c398\" stroke-width=\"7.5\" stroke-linecap=\"round\" fill=\"none\"/>\n  <path d=\"M108 47 Q112 46 115 44 L119 48 L119 52 L110 52Z\" fill=\"#f4f7f1\" stroke=\"#aacabb\" stroke-width=\".7\"/>\n </g>\n <!-- Friendly PTA wearing green scrubs, positioned at the foot of the table. -->\n <g class=\"tyc-mini-therapist\">\n  <path d=\"M128 58 L127 77 M142 58 L143 77\" stroke=\"#d9eee6\" stroke-width=\"7\" stroke-linecap=\"round\" fill=\"none\"/>\n  <path d=\"M124 78 H135 M139 78 H151\" stroke=\"#f1fbf4\" stroke-width=\"5\" stroke-linecap=\"round\"/>\n  <path d=\"M126 57 H144\" stroke=\"#235f4f\" stroke-width=\"7\" stroke-linecap=\"round\"/>\n  <path d=\"M128 35 Q135 31 143 35 L146 59 Q134 62 124 58Z\" fill=\"url(#tyc-mini-pt-shirt)\"/>\n  <path d=\"M131 38 L135 41 L139 38\" stroke=\"#dcffee\" stroke-width=\"1.5\" fill=\"none\"/>\n  <path d=\"M135 44 V50\" stroke=\"#197e58\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>\n  <path d=\"M132 48 H138\" stroke=\"#197e58\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>\n  <rect x=\"132\" y=\"28\" width=\"6\" height=\"9\" rx=\"2\" fill=\"#efc098\"/>\n  <circle cx=\"135\" cy=\"20\" r=\"12\" fill=\"#f6c99f\"/>\n  <path d=\"M123 21 Q123 9 132 8 Q147 5 147 20 Q140 14 136 15 Q132 20 123 21Z\" fill=\"#1c4136\"/>\n  <circle cx=\"131\" cy=\"21\" r=\"1.1\" fill=\"#1a4637\"/>\n  <circle cx=\"140\" cy=\"21\" r=\"1.1\" fill=\"#1a4637\"/>\n  <path d=\"M132 25 Q135 27 138 25\" fill=\"none\" stroke=\"#996351\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n  <path d=\"M145 37 Q150 45 151 51\" fill=\"none\" stroke=\"#f4c79b\" stroke-width=\"5\" stroke-linecap=\"round\"/>\n  <circle cx=\"151\" cy=\"51\" r=\"3\" fill=\"#f4c79b\"/>\n </g>\n <!-- Supporting arm follows the patient's ankle as the leg gently rises. -->\n <g class=\"tyc-mini-support\">\n  <path d=\"M125 38 Q124 44 115 48\" stroke=\"#f6c99f\" stroke-width=\"5\" fill=\"none\" stroke-linecap=\"round\">\n   <animate attributeName=\"d\" dur=\"6.8s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.28;0.52;0.82;1\" keySplines=\".35 0 .25 1;0 0 1 1;.35 0 .25 1;0 0 1 1\" values=\"M125 38 Q124 44 115 48;M125 38 Q115 30 100 17;M125 38 Q115 30 100 17;M125 38 Q124 44 115 48;M125 38 Q124 44 115 48\"/>\n  </path>\n  <circle cx=\"115\" cy=\"48\" r=\"3.3\" fill=\"#f6c99f\">\n   <animate attributeName=\"cx\" dur=\"6.8s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.28;0.52;0.82;1\" keySplines=\".35 0 .25 1;0 0 1 1;.35 0 .25 1;0 0 1 1\" values=\"115;100;100;115;115\"/>\n   <animate attributeName=\"cy\" dur=\"6.8s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.28;0.52;0.82;1\" keySplines=\".35 0 .25 1;0 0 1 1;.35 0 .25 1;0 0 1 1\" values=\"48;17;17;48;48\"/>\n  </circle>\n </g>\n <path class=\"tyc-mini-care-spark\" d=\"M104 9 V14 M101.5 11.5 H106.5\" stroke=\"#ffdb8c\" stroke-width=\"1.6\" stroke-linecap=\"round\"/>\n</svg>";
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
   if(a.width<2||box.width<2){mascot.hidden=true;return;}
   const sameRow=[];
   for(const n of [menu,nav]){
    const r=visibleRect(n);
    if(r&&r.left>a.right-2&&Math.abs((r.top+r.height/2)-(a.top+a.height/2))<a.height*.47)sameRow.push(r.left);
   }
   const end=Math.min(box.right,...sameRow);
   const compact=window.innerWidth<=620;
   const miniWidth=compact?103:134;
   const miniHeight=compact?55:74;
   const available=end-a.right;
   // No overlaps: keep the whole treatment scene strictly inside the header.
   if(available<miniWidth+12||head.height<miniHeight+4){
    mascot.hidden=true;return;
   }
   const centerX=a.right+Math.min(available/2,101);
   const centerY=Math.max(head.top+miniHeight/2+2,Math.min(a.top+a.height/2,head.bottom-miniHeight/2-2));
   // If centering would cause overlap in a narrow gap, hide rather than float over a link.
   if(centerX-miniWidth/2<a.right+4||centerX+miniWidth/2>end-4){
    mascot.hidden=true;return;
   }
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
   observer.observe(inner);observer.observe(header);observer.observe(brand);
   if(nav)observer.observe(nav);
   if(menu)observer.observe(menu);
  }
  const svgEl=mascot.querySelector('svg');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  function syncMotion(){
   if(reduced.matches)svgEl?.pauseAnimations?.();
   else svgEl?.unpauseAnimations?.();
  }
  syncMotion();
  reduced.addEventListener?.('change',syncMotion);
  document.addEventListener('visibilitychange',()=>{
   mascot.classList.toggle('tyc-mini-paused',document.hidden);
   if(document.hidden)svgEl?.pauseAnimations?.();
   else syncMotion();
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
})();