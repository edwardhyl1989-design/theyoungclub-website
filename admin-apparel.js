/* Admin-only catalog manager; Supabase RLS is the source of authorization. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const notice=(message,error=false)=>{$('admin-message').textContent=message;$('admin-message').classList.toggle('error',error);};
let db,items=[],editing=null,busy=false,photoSlots=[];
const extByType={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
function safePhoto(path){
 if(!/^products\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i.test(path||''))return '';
 return db.storage.from('tyc-apparel').getPublicUrl(path).data.publicUrl;
}
function clearPreviews(){
 for(const slot of photoSlots)if(slot.preview)URL.revokeObjectURL(slot.preview);
 photoSlots=[];
}
function checkImage(file){
 if(!file||!extByType[file.type]||file.size>8388608||file.size===0){
  notice('JPG, PNG 또는 WebP 사진만 가능해요 (각 8 MB 이하).',true);return false;
 }
 return true;
}
function makePhotoSlot(path='',file=null){
 return {path,file,preview:file?URL.createObjectURL(file):''};
}
function reset(){
 clearPreviews();editing=null;$('manager-form').reset();$('p-order').value=0;
 $('p-cancel').hidden=true;$('form-heading').textContent='Add product';
 renderPhotoSlots();
}
function loadEdit(p){
 if(busy)return;
 clearPreviews();editing=p.id;$('form-heading').textContent='Edit product';
 $('p-title').value=p.title;$('p-category').value=p.category;
 $('p-description').value=p.description||'';$('p-colors').value=p.colors||'';$('p-sizes').value=p.sizes||'';
 $('p-order').value=p.sort_order||0;$('p-published').checked=!!p.is_published;
 $('p-images').value='';
 photoSlots=(Array.isArray(p.image_paths)?p.image_paths:[]).filter(path=>safePhoto(path)).map(path=>makePhotoSlot(path));
 $('p-cancel').hidden=false;renderPhotoSlots();
 document.getElementById('manager-form').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderPhotoSlots(){
 const root=$('photo-slots');root.replaceChildren();
 photoSlots.forEach((slot,index)=>{
  const card=document.createElement('div');card.className='photo-slot';
  const badge=text('div',(index===0?'MAIN PHOTO / ':'PHOTO / ')+(index+1)+' of '+photoSlots.length);
  badge.className='photo-slot-badge';
  const img=document.createElement('img');img.alt='Product photo '+(index+1);
  img.src=slot.preview||safePhoto(slot.path);
  const name=text('span',slot.file?.name||'Current photo');name.className='photo-slot-name';
  const actions=document.createElement('div');actions.className='photo-slot-actions';
  const picker=document.createElement('input');picker.type='file';
  picker.accept='image/jpeg,image/png,image/webp';
  picker.setAttribute('aria-label','Replace photo '+(index+1));
  picker.addEventListener('change',()=>{
   const file=picker.files?.[0];if(!file||!checkImage(file))return;
   if(slot.preview)URL.revokeObjectURL(slot.preview);
   photoSlots[index]=makePhotoSlot(slot.path,file);renderPhotoSlots();
  });
  const replace=makeButton('Replace',()=>picker.click(),true);
  const remove=makeButton('Remove',()=>{
   const old=photoSlots.splice(index,1)[0];if(old.preview)URL.revokeObjectURL(old.preview);
   renderPhotoSlots();
  },true);remove.classList.add('photo-remove');
  const up=makeButton('↑',()=>{
   [photoSlots[index-1],photoSlots[index]]=[photoSlots[index],photoSlots[index-1]];renderPhotoSlots();
  },true);up.disabled=index===0;up.setAttribute('aria-label','Move photo '+(index+1)+' earlier');
  const down=makeButton('↓',()=>{
   [photoSlots[index+1],photoSlots[index]]=[photoSlots[index],photoSlots[index+1]];renderPhotoSlots();
  },true);down.disabled=index===photoSlots.length-1;down.setAttribute('aria-label','Move photo '+(index+1)+' later');
  actions.append(replace,remove,up,down,picker);card.append(badge,img,name,actions);root.append(card);
 });
 $('p-images').disabled=photoSlots.length>=5;
}
$('p-images').addEventListener('change',event=>{
 const files=[...event.target.files];event.target.value='';
 if(!files.length)return;
 if(photoSlots.length+files.length>5){notice('사진은 상품당 최대 5장까지 등록할 수 있어요.',true);return;}
 if(!files.every(checkImage))return;
 photoSlots.push(...files.map(file=>makePhotoSlot('',file)));renderPhotoSlots();
 notice('사진 변경을 준비했어. Save product를 누르면 적용돼.');
});
$('p-cancel').addEventListener('click',reset);
function text(tag,value){const n=document.createElement(tag);n.textContent=value;return n;}
function makeButton(name,fn,secondary=false){const b=text('button',name);b.type='button';if(secondary)b.className='secondary';b.addEventListener('click',fn);return b;}
function render(){
 const list=$('product-list');list.replaceChildren();
 if(!items.length){list.append(text('p','No products yet. Add your first product using the form.'));return;}
 for(const p of items){
  const row=document.createElement('article');row.className='product-row';
  const paths=Array.isArray(p.image_paths)?p.image_paths:[];
  const img=document.createElement('img');img.alt=p.title;const url=safePhoto(paths[0]);if(url)img.src=url;img.loading='lazy';
  const details=document.createElement('div');details.append(text('strong',p.title),text('small',p.category+' · '+(p.is_published?'Published':'Draft')+' · '+paths.length+' photo(s)'));
  const actions=document.createElement('div');actions.className='actions';
  actions.append(makeButton('Edit',()=>loadEdit(p),true));
  actions.append(makeButton(p.is_published?'Hide':'Publish',async()=>{if(!p.is_published&&!paths.length){notice('Upload at least one photo before publishing.',true);return;}await updateStatus(p,!p.is_published);}));
  actions.append(makeButton('Delete',async()=>{if(!confirm('Permanently delete this product?'))return;await removeProduct(p);},true));
  details.append(actions);row.append(img,details);list.append(row);
 }
}
async function refresh(){
 const {data,error}=await db.from('tyc_apparel_products').select('*').order('created_at',{ascending:false}).limit(200);
 if(error)throw error;items=data||[];render();
}
async function updateStatus(p,value){
 if(busy)return;busy=true;
 try{const {error}=await db.from('tyc_apparel_products').update({is_published:value,updated_at:new Date().toISOString()}).eq('id',p.id);
 if(error)throw error;await refresh();notice(value?'Product published.':'Product hidden.');}
 catch(e){notice('Update failed: '+e.message,true)}finally{busy=false;}
}
async function removeProduct(p){
 if(busy)return;busy=true;
 try{const {error}=await db.from('tyc_apparel_products').delete().eq('id',p.id);if(error)throw error;
 // Remove stored product photos only after DB deletion succeeds.
 const paths=(p.image_paths||[]).filter(x=>safePhoto(x));
 if(paths.length)await db.storage.from('tyc-apparel').remove(paths);
 if(editing===p.id)reset();await refresh();notice('Product deleted.');}
 catch(e){notice('Delete failed: '+e.message,true)}finally{busy=false;}
}
$('manager-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 const existing=items.find(x=>x.id===editing);
 if(photoSlots.length>5){notice('Maximum five photos per product.',true);return;}
 const newFiles=photoSlots.filter(slot=>slot.file).map(slot=>slot.file);
 if(!newFiles.every(checkImage))return;
 if(!photoSlots.length&&$('p-published').checked){
  notice('공개 상품에는 사진이 최소 한 장 필요해요. 사진을 추가하거나 Publish 체크를 해제해 주세요.',true);return;
 }
 busy=true;$('p-save').disabled=true;notice('Saving product…');
 const id=existing?.id||crypto.randomUUID(),uploaded=[];
 let databaseSaved=false;
 try{
  const image_paths=[];
  for(const slot of photoSlots){
   if(!slot.file){if(slot.path)image_paths.push(slot.path);continue;}
   const file=slot.file,ext=extByType[file.type];
   const path='products/'+id+'/'+crypto.randomUUID()+'.'+ext;
   const {error}=await db.storage.from('tyc-apparel').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
   if(error)throw error;
   uploaded.push(path);image_paths.push(path);
  }
  const product={title:$('p-title').value.trim(),category:$('p-category').value,description:$('p-description').value.trim(),
   colors:$('p-colors').value.trim(),sizes:$('p-sizes').value.trim(),sort_order:Number($('p-order').value)||0,
   is_published:$('p-published').checked,image_paths,updated_at:new Date().toISOString()};
  const query=existing?db.from('tyc_apparel_products').update(product).eq('id',id):db.from('tyc_apparel_products').insert({id,...product});
  const {error}=await query;if(error)throw error;
  databaseSaved=true;
  // Only delete photos excluded from the successfully saved image_paths; untouched photos are retained.
  const removed=(existing?.image_paths||[]).filter(path=>safePhoto(path)&&!image_paths.includes(path));
  if(removed.length){
   const {error:cleanupError}=await db.storage.from('tyc-apparel').remove(removed);
   if(cleanupError)notice('Product saved, but unused photo cleanup needs attention: '+cleanupError.message,true);
  }
  reset();await refresh();notice('Product and selected photos saved successfully.');
 }catch(err){
  // A failed database write must never delete photos still referenced by the product.
  if(!databaseSaved&&uploaded.length)await db.storage.from('tyc-apparel').remove(uploaded);
  notice(databaseSaved?'Product saved, but the product list did not refresh: '+err.message:'Save failed: '+err.message,true);
 }finally{busy=false;$('p-save').disabled=false;}
});
async function init(){
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){notice('Supabase is not configured.',true);return;}
 db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data:{session},error}=await db.auth.getSession();
 if(error||!session){
 notice('Please log in with your existing The Young Club account to manage Shop. / 기존 계정으로 로그인해 주세요.');
 $('admin-access-links').hidden=false;
 return;
}
 const {data:admin,error:adminError}=await db.from('job_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
 if(adminError||!admin){notice('Signed in, but this account does not have Shop administrator access. / 로그인되었지만 관리자 권한이 없는 계정입니다.',true);$('admin-access-links').hidden=false;$('admin-login-link').textContent='Switch Account / 다른 계정 로그인';return;}
 $('admin-zone').hidden=false;await refresh();notice('Administrator access confirmed. Create a draft or publish your first product.');
}
init().catch(err=>notice('Unable to load Shop Manager: '+err.message,true));
})();