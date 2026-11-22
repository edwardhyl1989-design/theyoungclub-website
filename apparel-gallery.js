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
function openPhotos(paths){
 lightboxUrls=paths.map(photoURL).filter(Boolean);
 if(!lightboxUrls.length)return;showPhoto(0);dialog.showModal();
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
  const card=el('article','shop-product'),cover=el('button','shop-product-cover');
  cover.type='button';cover.setAttribute('aria-label','View photos of '+p.title);
  const img=el('img');img.src=photoURL(paths[0]);img.alt=p.title;img.loading='lazy';img.decoding='async';
  cover.append(img);
  if(paths.length>1)cover.append(el('span','shop-product-media-count',paths.length+' photos'));
  cover.addEventListener('click',()=>openPhotos(paths));
  card.append(cover,el('h3','shop-product-title',p.title));
  const meta=[p.colors,p.sizes].filter(Boolean).join(' · ');if(meta)card.append(el('div','shop-product-meta',meta));
  if(p.description)card.append(el('p','shop-product-desc',p.description));
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