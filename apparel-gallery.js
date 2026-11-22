/* Apparel gallery is display-only; admin upload is separate. */
(()=>{'use strict';
const root=document.getElementById('shop-gallery'),empty=document.getElementById('shop-empty'),status=document.getElementById('shop-gallery-status');
const dialog=document.getElementById('shop-lightbox'),image=document.getElementById('shop-lightbox-image');
const counter=document.getElementById('shop-lightbox-counter');
let products=[],category=window.TYC_apparelInitialCategory||'all',db=null,lightboxUrls=[],lightboxIndex=0;
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
function photoURL(path){
 if(typeof path!=='string'||!/^products\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i.test(path))return '';
 return db.storage.from('tyc-apparel').getPublicUrl(path).data.publicUrl;
}
function showPhoto(i){
 if(!lightboxUrls.length)return;lightboxIndex=(i+lightboxUrls.length)%lightboxUrls.length;
 image.src=lightboxUrls[lightboxIndex];image.alt='Product image '+(lightboxIndex+1);
 counter.textContent=(lightboxIndex+1)+' / '+lightboxUrls.length;
}
function openPhotosAt(paths,startIndex=0){
 lightboxUrls=paths.map(photoURL).filter(Boolean);
 if(!lightboxUrls.length)return;showPhoto(startIndex);dialog.showModal();
}
document.getElementById('shop-lightbox-close').onclick=()=>dialog.close();
document.getElementById('shop-lightbox-prev').onclick=()=>showPhoto(lightboxIndex-1);
document.getElementById('shop-lightbox-next').onclick=()=>showPhoto(lightboxIndex+1);
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
dialog.addEventListener('close',()=>{image.removeAttribute('src');});
function render(){
 root.replaceChildren();
 const list=category==='all'
  ? [...products].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))
  : products.filter(p=>p.category===category).sort((a,b)=>(a.sort_order-b.sort_order)||(new Date(b.created_at)-new Date(a.created_at)));
 root.hidden=!list.length;empty.hidden=!!list.length;
 for(const p of list){
  const paths=(Array.isArray(p.image_paths)?p.image_paths:[]).filter(x=>photoURL(x));
  if(!paths.length)continue;
  const card=el('article','shop-product'),media=el('div','shop-product-media'),cover=el('button','shop-product-cover');
  const urls=paths.map(photoURL);
  let current=0,gesture=null,suppressOpen=false;
  cover.type='button';
  cover.setAttribute('aria-label','Enlarge photo 1 of '+urls.length+' for '+p.title);
  // All photos live on a single track so the image follows a finger or mouse,
  // rather than instantly swapping when the gesture ends.
  const track=el('span','shop-photo-track');
  for(const [i,url] of urls.entries()){
   const frame=el('span','shop-photo-frame'),img=el('img');
   img.src=url;img.alt='';img.draggable=false;img.loading='lazy';img.decoding='async';
   frame.append(img);track.append(frame);
  }
  cover.append(track);
  const badge=el('span','shop-product-media-count',urls.length>1?'1 / '+urls.length:'');
  const showIndex=i=>{
   current=Math.max(0,Math.min(urls.length-1,i));
   track.classList.remove('is-dragging');
   track.style.transform='translate3d('+(-100*current)+'%,0,0)';
   badge.textContent=(current+1)+' / '+urls.length;
   cover.setAttribute('aria-label','Enlarge photo '+(current+1)+' of '+urls.length+' for '+p.title);
  };
  cover.addEventListener('click',e=>{
   // A completed drag must never open the full-screen photo modal.
   if(suppressOpen&&e.detail!==0){suppressOpen=false;return;}
   suppressOpen=false;openPhotosAt(paths,current);
  });
  cover.addEventListener('dragstart',e=>e.preventDefault());
  media.append(cover);
  if(urls.length>1){
   const prev=el('button','shop-card-arrow shop-card-prev','‹');
   const next=el('button','shop-card-arrow shop-card-next','›');
   prev.type=next.type='button';
   prev.setAttribute('aria-label','Previous photo of '+p.title);
   next.setAttribute('aria-label','Next photo of '+p.title);
   prev.addEventListener('click',()=>showIndex((current+urls.length-1)%urls.length));
   next.addEventListener('click',()=>showIndex((current+1)%urls.length));
   media.append(prev,next,badge);
   cover.addEventListener('pointerdown',e=>{
    if(e.button!==0||!e.isPrimary)return;
    suppressOpen=false;
    gesture={id:e.pointerId,x:e.clientX,y:e.clientY,start:performance.now(),dragging:false};
    if(cover.setPointerCapture)cover.setPointerCapture(e.pointerId);
   });
   cover.addEventListener('pointermove',e=>{
    const g=gesture;
    if(!g||e.pointerId!==g.id)return;
    const dx=e.clientX-g.x,dy=e.clientY-g.y;
    if(!g.dragging){
     if(Math.abs(dx)<8||Math.abs(dx)<=Math.abs(dy)*1.1)return;
     g.dragging=true;
     track.classList.add('is-dragging');cover.classList.add('is-dragging');
    }
    if(e.cancelable)e.preventDefault();
    // A slight elastic resistance communicates the start/end of the gallery.
    const offset=((current===0&&dx>0)||(current===urls.length-1&&dx<0))?dx*.27:dx;
    track.style.transform='translate3d(calc('+(-100*current)+'% + '+offset+'px),0,0)';
   });
   const finish=(e,cancelled)=>{
    const g=gesture;
    if(!g||e.pointerId!==g.id)return;
    gesture=null;
    if(cover.hasPointerCapture?.(e.pointerId))cover.releasePointerCapture(e.pointerId);
    cover.classList.remove('is-dragging');
    if(cancelled||!g.dragging){showIndex(current);return;}
    suppressOpen=true;
    const distance=e.clientX-g.x;
    const elapsed=Math.max(1,performance.now()-g.start);
    const width=cover.getBoundingClientRect().width;
    const qualifies=Math.abs(distance)>Math.max(28,width*.14)||
      (Math.abs(distance)>20&&Math.abs(distance)/elapsed>.45);
    showIndex(current+(qualifies?(distance<0?1:-1):0));
   };
   cover.addEventListener('pointerup',e=>finish(e,false));
   cover.addEventListener('pointercancel',e=>finish(e,true));
  }
  const title=el('h3','shop-product-title');
  const detailLink=el('a','shop-product-detail-link',p.title);
  detailLink.href='product.html?id='+encodeURIComponent(p.id);
  detailLink.setAttribute('aria-label','View details for '+p.title);
  title.append(detailLink);card.append(media,title);
  const meta=[p.colors,p.sizes].filter(Boolean).join(' · ');if(meta)card.append(el('div','shop-product-meta',meta));
  if(p.description)card.append(el('p','shop-product-desc',p.description));
  const more=el('a','shop-product-view-details','View details ↗');more.href='product.html?id='+encodeURIComponent(p.id);card.append(more);
  root.append(card);
 }
 if(!root.children.length){root.hidden=true;empty.hidden=false;}
}
window.TYC_setApparelCategory=key=>{category=key;render();};
async function init(){
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY)return;
 db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data,error}=await db.from('tyc_apparel_products').select('id,title,category,description,colors,sizes,image_paths,sort_order,created_at').eq('is_published',true).order('created_at',{ascending:false}).limit(200);
 if(error){status.textContent='Product gallery temporarily unavailable.';return;}
 products=data||[];render();
 const {data:{session}}=await db.auth.getSession();
 if(session){const {data:admin}=await db.from('job_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();if(admin){const a=el('a','shop-manager-link','Manage Shop ↗');a.href='admin-apparel.html';status.append(a);}}
}
init().catch(()=>{status.textContent='Product gallery temporarily unavailable.';});
})();