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
  let current=0,touchStartX=null,touchStartY=null,suppressOpen=false;
  cover.type='button';cover.setAttribute('aria-label','Enlarge photo of '+p.title);
  const img=el('img');img.src=urls[0];img.alt=p.title+' — photo 1 of '+urls.length;
  img.loading='lazy';img.decoding='async';cover.append(img);
  const badge=el('span','shop-product-media-count',urls.length>1?'1 / '+urls.length:'');
  const changePhoto=direction=>{
   if(urls.length<2)return;
   current=(current+direction+urls.length)%urls.length;
   img.src=urls[current];img.alt=p.title+' — photo '+(current+1)+' of '+urls.length;
   badge.textContent=(current+1)+' / '+urls.length;
  };
  cover.addEventListener('click',()=>{
   if(suppressOpen){suppressOpen=false;return;}
   openPhotosAt(paths,current);
  });
  media.append(cover);
  if(urls.length>1){
   const prev=el('button','shop-card-arrow shop-card-prev','‹');
   const next=el('button','shop-card-arrow shop-card-next','›');
   prev.type=next.type='button';
   prev.setAttribute('aria-label','Previous photo of '+p.title);
   next.setAttribute('aria-label','Next photo of '+p.title);
   prev.addEventListener('click',()=>changePhoto(-1));
   next.addEventListener('click',()=>changePhoto(1));
   media.append(prev,next,badge);
   // Mobile: swipe horizontally across the image without entering the lightbox.
   cover.addEventListener('touchstart',e=>{
    if(e.touches.length!==1)return;
    touchStartX=e.touches[0].clientX;touchStartY=e.touches[0].clientY;
   },{passive:true});
   cover.addEventListener('touchend',e=>{
    if(touchStartX===null||e.changedTouches.length!==1)return;
    const deltaX=e.changedTouches[0].clientX-touchStartX;
    const deltaY=e.changedTouches[0].clientY-touchStartY;
    touchStartX=touchStartY=null;
    if(Math.abs(deltaX)>35&&Math.abs(deltaX)>Math.abs(deltaY)*1.3){
     suppressOpen=true;changePhoto(deltaX<0?1:-1);
    }
   },{passive:true});
   cover.addEventListener('touchcancel',()=>{touchStartX=touchStartY=null;});
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