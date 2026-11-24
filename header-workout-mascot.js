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
  mascot.innerHTML="<svg class=\"tyc-mini-svg\" viewBox=\"0 0 164 88\" xmlns=\"http://www.w3.org/2000/svg\" focusable=\"false\" aria-hidden=\"true\">\n <defs>\n  <linearGradient id=\"tyc-mini-pt-shirt\" x1=\"0\" x2=\"1\" y1=\"0\" y2=\"1\"><stop stop-color=\"#a4ffce\"/><stop offset=\"1\" stop-color=\"#2fc88b\"/></linearGradient>\n  <linearGradient id=\"tyc-mini-tabletop\" x1=\"0\" x2=\"0\" y1=\"0\" y2=\"1\"><stop stop-color=\"#f0f6ee\"/><stop offset=\"1\" stop-color=\"#94ada2\"/></linearGradient>\n </defs>\n <ellipse cx=\"81\" cy=\"83\" rx=\"72\" ry=\"3\" fill=\"#6ab991\" opacity=\".14\"/>\n <!-- The treatment table has a recognizable mattress, frame and two legs. -->\n <g class=\"tyc-mini-treatment-table\">\n  <path d=\"M17 62 V79 M99 62 V79\" stroke=\"#b4c6bc\" stroke-width=\"4\" stroke-linecap=\"round\"/>\n  <path d=\"M14 80 H25 M96 80 H107\" stroke=\"#e4eee7\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n  <rect x=\"5\" y=\"55\" width=\"109\" height=\"9\" rx=\"4\" fill=\"url(#tyc-mini-tabletop)\" stroke=\"#e5f5e9\" stroke-width=\"1\"/>\n  <path d=\"M10 62 H110\" stroke=\"#4d7867\" stroke-width=\"2\" opacity=\".65\"/>\n  <rect x=\"13\" y=\"40\" width=\"19\" height=\"10\" rx=\"5\" fill=\"#d4eee0\"/>\n </g>\n <!-- Patient lying supine, with the opposite leg resting on the table. -->\n <g class=\"tyc-mini-patient\">\n  <path d=\"M73 51 Q87 53 105 52\" stroke=\"#253c43\" stroke-width=\"7\" fill=\"none\" stroke-linecap=\"round\"/>\n  <path d=\"M104 52 Q109 52 111 49 L115 51 L114 56 H104Z\" fill=\"#eaf5f5\"/>\n  <path d=\"M41 47 H78\" stroke=\"#e9b992\" stroke-width=\"11\" stroke-linecap=\"round\"/>\n  <rect x=\"40\" y=\"40\" width=\"39\" height=\"13\" rx=\"6\" fill=\"#78bad0\"/>\n  <path d=\"M40 43 Q52 41 62 44\" stroke=\"#b7f0fa\" stroke-width=\"1.3\" fill=\"none\" opacity=\".9\"/>\n  <path d=\"M47 49 Q56 53 66 52\" stroke=\"#e9b992\" stroke-width=\"3\" stroke-linecap=\"round\" fill=\"none\"/>\n  <path d=\"M71 43 H82 L81 54 H71Z\" fill=\"#284c57\"/>\n  <path d=\"M37 45 H41\" stroke=\"#edbd94\" stroke-width=\"5\" stroke-linecap=\"round\"/>\n  <ellipse cx=\"26\" cy=\"45\" rx=\"12\" ry=\"9.5\" fill=\"#f8c89f\"/>\n  <path d=\"M14 45 Q14 35 25 36 Q30 36 34 40 Q27 39 23 42 Q19 46 14 45Z\" fill=\"#334750\"/>\n  <path d=\"M25 47 Q27 49 29 47\" stroke=\"#835d51\" stroke-width=\"1.2\" stroke-linecap=\"round\" fill=\"none\"/>\n </g>\n <!-- One leg rises from the hip for a slow assisted hamstring stretch. -->\n <g class=\"tyc-mini-patient-leg\">\n  <path d=\"M77 48 L111 48\" stroke=\"#f6c398\" stroke-width=\"7.5\" stroke-linecap=\"round\" fill=\"none\"/>\n  <path d=\"M108 47 Q112 46 115 44 L119 48 L119 52 L110 52Z\" fill=\"#f4f7f1\" stroke=\"#aacabb\" stroke-width=\".7\"/>\n </g>\n <!-- PTA turned toward the patient: left-facing profile, short-sleeve polo and brown slacks. -->\n <g class=\"tyc-mini-therapist\">\n  <!-- Brown dress slacks: narrow tailored silhouette with dark crease and cuffs. -->\n  <path d=\"M126 56 L139 56 L145 74 L140 76 L134 61 L131 76 L125 76Z\" fill=\"#80583b\" stroke=\"#62402e\" stroke-width=\"1\"/>\n  <path d=\"M133 59 L130 75 M140 60 L143 73\" stroke=\"#b48a62\" stroke-width=\"1\" opacity=\".7\" fill=\"none\"/>\n  <path d=\"M124 75 Q130 73 133 77 L135 79 H121 Q121 76 124 75Z\" fill=\"#e9f1e9\" stroke=\"#9ab4a5\" stroke-width=\".7\"/>\n  <path d=\"M138 75 Q144 73 148 77 L150 79 H136Z\" fill=\"#e9f1e9\" stroke=\"#9ab4a5\" stroke-width=\".7\"/>\n  <path d=\"M126 56 L141 56\" stroke=\"#51392e\" stroke-width=\"3.2\" stroke-linecap=\"round\"/>\n  <circle cx=\"136\" cy=\"56\" r=\"1.2\" fill=\"#dfc194\"/>\n  <!-- Polo shirt: asymmetrical side-on shoulders, sleeve, folded collar and placket. -->\n  <path d=\"M129 34 Q136 32 143 37 L143 57 Q136 60 126 56 L125 40 Q125 36 129 34Z\" fill=\"#5f987a\" stroke=\"#39755b\" stroke-width=\"1\"/>\n  <path d=\"M128 35 L122 40 L125 48 L131 46 L132 38Z\" fill=\"#78b392\"/>\n  <path d=\"M124 46 L130 46\" stroke=\"#3b765a\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n  <path d=\"M130 34 L133 38 L129 43 L126 37Z\" fill=\"#dce9d9\" stroke=\"#437e62\" stroke-width=\".75\"/>\n  <path d=\"M133 37 L138 39 L133 42 L131 39Z\" fill=\"#bad9be\" stroke=\"#437e62\" stroke-width=\".7\"/>\n  <path d=\"M130 42 L131 48\" stroke=\"#e9f3df\" stroke-width=\"1\" opacity=\".85\"/>\n  <circle cx=\"131\" cy=\"44\" r=\".65\" fill=\"#f7f8e7\"/>\n  <circle cx=\"131.5\" cy=\"47\" r=\".65\" fill=\"#f7f8e7\"/>\n  <path d=\"M137 39 Q141 45 142 55\" stroke=\"#3f7c5b\" stroke-width=\"1.2\" fill=\"none\" opacity=\".6\"/>\n  <!-- Neck and head: nose and single visible eye look LEFT at the patient. -->\n  <path d=\"M129 29 L136 29 L136 36 Q132 38 128 34Z\" fill=\"#e5b38e\"/>\n  <path d=\"M137 11 Q143 17 141 26 Q140 33 132 34 Q126 33 124 28 L121 26 L125 23 Q121 18 126 13 Q130 9 137 11Z\" fill=\"#f3c49d\"/>\n  <path d=\"M124 23 L119 25 L124 27Z\" fill=\"#efbd99\" stroke=\"#d69d77\" stroke-width=\".5\"/>\n  <path d=\"M123 22 Q122 24 125 24\" stroke=\"#c9916d\" stroke-width=\".7\" fill=\"none\"/>\n  <path d=\"M126 13 Q131 7 140 11 Q144 15 141 21 L137 17 Q135 14 131 16 Q128 19 125 20 L123 19Z\" fill=\"#213f35\"/>\n  <path d=\"M134 12 Q140 12 141 18\" stroke=\"#335846\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\"/>\n  <circle cx=\"128\" cy=\"22\" r=\"1.15\" fill=\"#193d34\"/>\n  <path d=\"M124 29 Q127 30 129 28\" stroke=\"#9e6552\" stroke-width=\"1\" fill=\"none\" stroke-linecap=\"round\"/>\n  <!-- Rear arm: bent slightly forward as the therapist attends the patient. -->\n  <path d=\"M142 38 Q146 43 146 51 L145 53\" stroke=\"#efbf97\" stroke-width=\"4.8\" stroke-linecap=\"round\" fill=\"none\"/>\n  <path d=\"M139 36 Q142 38 145 42\" stroke=\"#5f987a\" stroke-width=\"5\" stroke-linecap=\"round\" fill=\"none\"/>\n </g>\n <!-- Supporting arm follows the patient's ankle as the leg gently rises. -->\n <g class=\"tyc-mini-support\">\n  <path d=\"M125 38 Q124 44 115 48\" stroke=\"#f6c99f\" stroke-width=\"5\" fill=\"none\" stroke-linecap=\"round\">\n   <animate attributeName=\"d\" dur=\"6.8s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.28;0.52;0.82;1\" keySplines=\".35 0 .25 1;0 0 1 1;.35 0 .25 1;0 0 1 1\" values=\"M125 38 Q124 44 115 48;M125 38 Q115 30 100 17;M125 38 Q115 30 100 17;M125 38 Q124 44 115 48;M125 38 Q124 44 115 48\"/>\n  </path>\n  <circle cx=\"115\" cy=\"48\" r=\"3.3\" fill=\"#f6c99f\">\n   <animate attributeName=\"cx\" dur=\"6.8s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.28;0.52;0.82;1\" keySplines=\".35 0 .25 1;0 0 1 1;.35 0 .25 1;0 0 1 1\" values=\"115;100;100;115;115\"/>\n   <animate attributeName=\"cy\" dur=\"6.8s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.28;0.52;0.82;1\" keySplines=\".35 0 .25 1;0 0 1 1;.35 0 .25 1;0 0 1 1\" values=\"48;17;17;48;48\"/>\n  </circle>\n </g>\n <path class=\"tyc-mini-care-spark\" d=\"M104 9 V14 M101.5 11.5 H106.5\" stroke=\"#ffdb8c\" stroke-width=\"1.6\" stroke-linecap=\"round\"/>\n</svg>";
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
   const miniWidth=compact?51.5:67;
   const miniHeight=compact?27.5:37;
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