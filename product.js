/* Public read-only product detail; never fetch draft/private product rows. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const categories={'t-shirts':'T-Shirts',tanks:'Tanks & Sleeveless',shorts:'Shorts',hoodies:'Hoodies'};
const validId=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const validPath=/^products\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i;
function showError(message){$('product-message').textContent=message;$('product-layout').hidden=true;}
function field(name,value){if(!value)return;$(name+'-wrap').hidden=false;$(name).textContent=value;}
async function init(){
 const id=new URLSearchParams(location.search).get('id');
 if(!id||!validId.test(id)){showError('Invalid product link. Return to the Shop to browse products.');return;}
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){showError('Shop is temporarily unavailable.');return;}
 const db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data:p,error}=await db.from('tyc_apparel_products')
 .select('id,title,category,description,colors,sizes,image_paths,is_published')
 .eq('id',id).eq('is_published',true).maybeSingle();
 if(error||!p){showError('This product is unavailable or has been removed from the Shop.');return;}
 const paths=(Array.isArray(p.image_paths)?p.image_paths:[]).filter(path=>validPath.test(path));
 if(!paths.length){showError('Product photos are currently unavailable.');return;}
 const urls=paths.map(path=>db.storage.from('tyc-apparel').getPublicUrl(path).data.publicUrl);
 const thumbs=$('product-thumbs'),hero=$('product-hero-image');
 function select(i){hero.src=urls[i];hero.alt=p.title+' — product photo '+(i+1)+' of '+urls.length;
  [...thumbs.children].forEach((node,index)=>node.setAttribute('aria-pressed',String(index===i)));
 }
 urls.forEach((url,i)=>{
  const btn=document.createElement('button');btn.type='button';btn.className='product-thumb';
  btn.setAttribute('aria-label','View photo '+(i+1)+' of '+urls.length);btn.setAttribute('aria-pressed','false');
  const img=document.createElement('img');img.src=url;img.alt='Photo '+(i+1);img.loading=i?'lazy':'eager';
  btn.append(img);btn.addEventListener('click',()=>select(i));thumbs.append(btn);
 });
 $('product-title').textContent=p.title;
 const label=categories[p.category]||'Product';
 $('product-category').textContent=label.toUpperCase();
 $('product-crumb-category').textContent=label.toUpperCase();
 $('product-back').href='shop.html?category='+encodeURIComponent(p.category);
 field('product-colors',p.colors);field('product-sizes',p.sizes);field('product-description',p.description);
 document.title=p.title+' | THE YOUNG CLUB SHOP';
 select(0);$('product-message').hidden=true;$('product-layout').hidden=false;
}
init().catch(()=>showError('Unable to load this product right now. Please try again.'));
})();