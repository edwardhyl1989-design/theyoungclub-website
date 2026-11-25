/* Public SHOP banner: admin-managed slides, 3-second auto-advance, mouse drag and touch swipe. */
(()=>{'use strict';
 const node=document.getElementById('shop-hero-carousel');
 if(!node)return;
 const track=node.querySelector('.shop-hero-slide-track');
 const prev=node.querySelector('.shop-hero-prev'),next=node.querySelector('.shop-hero-next');
 const dots=node.querySelector('.shop-hero-slide-dots');
 const fallback=node.dataset.fallback||'shop-editorial-hero-updated.webp';
 let count=0,index=0,down=null,timer=null,paused=false;
 const reduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
 const pathValid=p=>typeof p==='string'&&/^hero\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp|avif)$/i.test(p);
 function slides(urls){
  track.replaceChildren();dots.replaceChildren();
  urls.forEach((url,i)=>{
   const slide=document.createElement('div');slide.className='shop-hero-slide';
   const img=document.createElement('img');
   img.src=url;img.alt='Collection image '+(i+1);img.loading=i===0?'eager':'lazy';img.decoding='async';
   img.draggable=false;slide.append(img);track.append(slide);
   if(urls.length>1){
    const dot=document.createElement('button');dot.type='button';dot.setAttribute('aria-label','Show collection photo '+(i+1));
    dot.addEventListener('click',()=>go(i,true));dots.append(dot);
   }
  });
  count=urls.length;index=0;node.classList.toggle('is-single',count<=1);
  prev.hidden=next.hidden=count<=1;dots.hidden=count<=1;
  go(0,false);
 }
 function go(i,restart){
  if(!count)return;
  index=(i+count)%count;track.classList.remove('is-dragging');
  track.style.transform='translate3d('+(-100*index)+'%,0,0)';
  [...dots.children].forEach((d,n)=>{d.classList.toggle('is-active',n===index);d.setAttribute('aria-current',String(n===index));});
  if(restart)start();
 }
 function stop(){if(timer){clearInterval(timer);timer=null;}}
 function start(){stop();if(count<2||reduced||paused||document.hidden)return;timer=setInterval(()=>go(index+1,false),3000);}
 prev.addEventListener('click',()=>go(index-1,true));
 next.addEventListener('click',()=>go(index+1,true));
 node.addEventListener('mouseenter',()=>{paused=true;stop();});
 node.addEventListener('mouseleave',()=>{paused=false;start();});
 node.addEventListener('focusin',()=>{paused=true;stop();});
 node.addEventListener('focusout',e=>{if(!node.contains(e.relatedTarget)){paused=false;start();}});
 document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
 track.addEventListener('dragstart',e=>e.preventDefault());
 node.addEventListener('pointerdown',e=>{
  if(count<2||!e.isPrimary||e.button!==0||e.target.closest('button'))return;
  down={id:e.pointerId,x:e.clientX,y:e.clientY,dragging:false};
  stop();node.setPointerCapture?.(e.pointerId);
 });
 node.addEventListener('pointermove',e=>{
  if(!down||e.pointerId!==down.id)return;
  const dx=e.clientX-down.x,dy=e.clientY-down.y;
  if(!down.dragging){
   if(Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy)*1.15)return;
   down.dragging=true;track.classList.add('is-dragging');node.classList.add('is-dragging');
  }
  if(e.cancelable)e.preventDefault();
  track.style.transform='translate3d(calc('+(-100*index)+'% + '+dx+'px),0,0)';
 });
 const finish=(e,cancelled)=>{
  if(!down||e.pointerId!==down.id)return;
  const d=down;down=null;node.classList.remove('is-dragging');
  if(node.hasPointerCapture?.(e.pointerId))node.releasePointerCapture(e.pointerId);
  const delta=e.clientX-d.x,limit=Math.max(25,node.clientWidth*.12);
  go(index+(!cancelled&&d.dragging&&Math.abs(delta)>limit?(delta<0?1:-1):0),false);
  start();
 };
 node.addEventListener('pointerup',e=>finish(e,false));
 node.addEventListener('pointercancel',e=>finish(e,true));
 node.addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'){e.preventDefault();go(index-1,true);}
  if(e.key==='ArrowRight'){e.preventDefault();go(index+1,true);}
 });
 async function init(){
  let urls=[];
  try{
   if(window.supabase?.createClient&&window.TYC_SUPABASE_URL&&window.TYC_SUPABASE_PUBLISHABLE_KEY){
    const db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
    const {data,error}=await db.from('tyc_shop_hero').select('image_paths').eq('id',1).maybeSingle();
    if(error)throw error;
    urls=(data?.image_paths||[]).filter(pathValid).slice(0,10).map(p=>db.storage.from('tyc-apparel').getPublicUrl(p).data.publicUrl);
   }
  }catch(err){console.warn('SHOP carousel using default image',err);}
  slides(urls.length?urls:[fallback]);start();
 }
 slides([fallback]);init();
})();