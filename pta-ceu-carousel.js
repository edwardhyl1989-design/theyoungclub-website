/* CEU carousel: pointer-drag, touch native swipe, button and keyboard controls. */
(()=>{'use strict';const track=document.getElementById('ceu-carousel');if(!track)return;
const cards=[...track.querySelectorAll('.insights-ceu-card')],prev=document.getElementById('ceu-prev'),next=document.getElementById('ceu-next'),label=document.getElementById('ceu-position');
let dragging=false,startX=0,startScroll=0,travel=0,suppressClick=false,pointerId=null;
const index=()=>{const x=track.scrollLeft;let best=0,min=Infinity;cards.forEach((card,i)=>{const d=Math.abs(card.offsetLeft-cards[0].offsetLeft-x);if(d<min){min=d;best=i;}});return best;};
function render(){const i=index();label.textContent=String(i+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0');prev.disabled=i===0;next.disabled=i===cards.length-1;}
function go(dir){let i=index()+dir;i=Math.max(0,Math.min(cards.length-1,i));track.scrollTo({left:cards[i].offsetLeft-cards[0].offsetLeft,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
prev.addEventListener('click',()=>go(-1));next.addEventListener('click',()=>go(1));
track.addEventListener('keydown',e=>{if(e.target.closest('a,button,input,select'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go(e.key==='ArrowRight'?1:-1);}});
track.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.button!==0||e.target.closest('a,button'))return;dragging=true;pointerId=e.pointerId;startX=e.clientX;startScroll=track.scrollLeft;travel=0;suppressClick=false;track.classList.add('is-dragging');track.setPointerCapture(e.pointerId);});
track.addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==pointerId)return;travel=Math.abs(e.clientX-startX);track.scrollLeft=startScroll-(e.clientX-startX);if(travel>6)suppressClick=true;});
function finish(){if(!dragging)return;dragging=false;pointerId=null;track.classList.remove('is-dragging');render();}
track.addEventListener('pointerup',finish);track.addEventListener('pointercancel',finish);track.addEventListener('lostpointercapture',finish);
track.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopPropagation();suppressClick=false;}},true);
track.addEventListener('scroll',()=>requestAnimationFrame(render),{passive:true});window.addEventListener('resize',render);render();
})();