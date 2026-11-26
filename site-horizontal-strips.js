/* Shared horizontal navigation: native touch, mouse grab and accessible desktop arrows. */
(()=>{'use strict';
const css=document.createElement('style');css.textContent=".tyc-strip-shell{display:flex;align-items:center;gap:5px;min-width:0;max-width:100%;position:relative;box-sizing:border-box}\n.tyc-strip-shell[hidden]{display:none!important}\n.tyc-strip-shell>.tyc-horizontal-strip:not([hidden]){display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;justify-content:flex-start!important;align-items:center;min-width:0!important;max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none!important;overscroll-behavior-x:contain;scroll-behavior:auto;flex:1 1 auto;box-sizing:border-box;-webkit-overflow-scrolling:touch}\n.tyc-horizontal-strip::-webkit-scrollbar{display:none!important}\n.tyc-horizontal-strip>*{flex-shrink:0!important}\n.tyc-horizontal-strip>button,.tyc-horizontal-strip>a{white-space:nowrap}\n.tyc-strip-shell>.tyc-strip-arrow{display:grid;place-items:center;flex:0 0 30px;width:30px;height:30px;min-width:30px;min-height:30px;padding:0;margin:0;align-self:center;color:#194b37;background:#fff;border:1px solid #d2ded2;border-radius:50%;box-shadow:0 2px 7px #183f2920;cursor:pointer}\n.tyc-strip-shell>.tyc-strip-arrow[hidden]{display:none!important}\n.tyc-strip-shell>.tyc-strip-arrow:disabled{opacity:.32;cursor:default;box-shadow:none}\n.tyc-strip-shell>.tyc-strip-arrow:not(:disabled):hover{background:#e9f1e7}\n.tyc-strip-arrow:focus-visible{outline:2px solid #347c52;outline-offset:2px}\n.tyc-strip-arrow svg{width:16px;height:16px;display:block}\n.tyc-strip-shell:has(>#categories){width:100%;grid-column:1/-1}\n.tyc-strip-shell>#categories:not([hidden]){width:100%!important;max-width:none!important;padding:6px 3px 13px!important;gap:10px!important}\n.tyc-strip-shell>#categories>button{flex:0 0 120px!important;width:120px!important;min-width:120px!important;max-width:120px!important}\n.tyc-strip-shell>#categories .discussion-sort-row{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;width:auto!important;flex:0 0 auto!important;align-items:center;padding:0 8px 0 0!important}\n.tyc-strip-shell>#categories .discussion-sort-row>button{flex:0 0 auto!important;width:auto!important;min-width:104px!important;white-space:nowrap!important}\n.tyc-strip-shell>#categories .discussion-sort-label{white-space:nowrap!important}\n.tyc-strip-shell:has(>#contentTypes){margin-left:auto;flex:0 1 auto}\n.tyc-strip-shell>#contentTypes{margin:0!important;width:auto!important}\n.tyc-strip-shell>#contentTypes>button{flex:0 0 auto!important}\n.tyc-strip-shell:has(>#sidebarCategories){flex:1 1 auto;min-width:0}\n.tyc-strip-shell:has(>#community-category-tabs),.tyc-strip-shell:has(>#highlightMembers),.tyc-strip-shell:has(>#clubHomeTabs){width:100%}\n.tyc-strip-shell>#community-category-tabs .community-mobile-category-strip,.tyc-strip-shell>#community-category-tabs .community-mobile-ranking-strip{display:contents!important}\n.tyc-strip-shell>#community-category-tabs button{flex:0 0 auto!important;white-space:nowrap!important}\n.tyc-strip-shell:has(>#shop-categories){flex:0 1 auto}\n.tyc-horizontal-strip.tyc-grabbing,.tyc-horizontal-strip.tyc-grabbing *{cursor:grabbing!important;user-select:none!important;-webkit-user-select:none!important}\n.tyc-horizontal-strip.tyc-can-drag{cursor:grab}\n.tyc-horizontal-strip:focus-visible{outline:2px solid #347c52;outline-offset:-2px}\n@media(max-width:640px){.tyc-strip-shell>#categories:not([hidden]){gap:7px!important;padding:5px 3px 10px!important}.tyc-strip-shell>#categories>button{flex-basis:105px!important;min-width:105px!important;max-width:105px!important;width:105px!important}.tyc-strip-shell:has(>#contentTypes){margin-left:0;flex:1 1 auto}.tyc-strip-shell>#contentTypes{width:100%!important}.tyc-strip-shell:has(>#sidebarCategories){width:100%}}\n@media(hover:none) and (pointer:coarse){.tyc-strip-shell>.tyc-strip-arrow{display:none!important}}";document.head.append(css);

const selector='#categories,#contentTypes,#clubHomeTabs,#highlightMembers,#sidebarCategories,#community-category-tabs,#shop-categories,[data-horizontal-strip]';
const processed=new WeakSet(),fine=matchMedia('(any-pointer: fine)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const move=(el,amount)=>el.scrollBy({left:amount,behavior:reduced.matches?'auto':'smooth'});
function drag(el){
 let press=null,suppress=false;
 el.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='mouse'||e.button!==0||el.scrollWidth<=el.clientWidth+2||e.target.closest('input,select,textarea,[contenteditable=true]'))return;
  suppress=false;press={id:e.pointerId,x:e.clientX,y:e.clientY,left:el.scrollLeft,drag:false};
 });
 el.addEventListener('pointermove',e=>{
  if(!press||press.id!==e.pointerId)return;
  const dx=e.clientX-press.x,dy=e.clientY-press.y;
  if(!press.drag){if(Math.abs(dx)<7||Math.abs(dx)<Math.abs(dy))return;press.drag=true;el.classList.add('tyc-grabbing');el.setPointerCapture(e.pointerId);}
  e.preventDefault();el.scrollLeft=press.left-dx;
 });
 function end(e){if(!press||e.pointerId!==press.id)return;if(press.drag){suppress=true;setTimeout(()=>{suppress=false},350);}press=null;el.classList.remove('tyc-grabbing');}
 window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end);
 el.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();suppress=false;}},true);
 el.addEventListener('dragstart',e=>{if(press)e.preventDefault();});
 el.addEventListener('keydown',e=>{if(e.target!==el)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(el,(e.key==='ArrowLeft'?-1:1)*Math.max(100,el.clientWidth*.65));}});
}
function init(el){
 if(processed.has(el)||!el.parentNode)return;processed.add(el);
 const shell=document.createElement('div');shell.className='tyc-strip-shell';el.before(shell);
 function arrow(dir){const b=document.createElement('button');b.type='button';b.className='tyc-strip-arrow';b.hidden=true;b.setAttribute('aria-label',dir<0?'Scroll left':'Scroll right');if(el.id)b.setAttribute('aria-controls',el.id);b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(dir<0?'m15 5-7 7 7 7':'m9 5 7 7-7 7')+'"/></svg>';b.addEventListener('click',()=>move(el,dir*Math.max(120,el.clientWidth*.72)));return b;}
 const prev=arrow(-1),next=arrow(1);shell.append(prev,el,next);el.classList.add('tyc-horizontal-strip');if(!el.hasAttribute('tabindex'))el.tabIndex=0;
 let queued=false;
 function update(){queued=false;shell.hidden=el.hidden;if(el.hidden||!shell.clientWidth){prev.hidden=next.hidden=true;return;}
  const overflow=el.scrollWidth>shell.clientWidth+2;const show=fine.matches&&overflow;
  prev.hidden=next.hidden=!show;const max=Math.max(0,el.scrollWidth-el.clientWidth);
  prev.disabled=el.scrollLeft<=2;next.disabled=el.scrollLeft>=max-2;
  el.classList.toggle('tyc-can-drag',fine.matches&&max>2);
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(update);}}
 const ro=new ResizeObserver(schedule);ro.observe(shell);ro.observe(el);
 new MutationObserver(schedule).observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 el.addEventListener('scroll',schedule,{passive:true});fine.addEventListener('change',schedule);drag(el);schedule();
}
function boot(){document.querySelectorAll(selector).forEach(init);const featured=document.getElementById('featuredTrack');if(featured){featured.classList.add('tyc-horizontal-strip');if(!featured.hasAttribute('tabindex'))featured.tabIndex=0;drag(featured);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
