/* Admin-only catalog manager; Supabase RLS is the source of authorization. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const notice=(message,error=false)=>{$('admin-message').textContent=message;$('admin-message').classList.toggle('error',error);};
let db,items=[],editing=null,busy=false;
const extByType={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
function safePhoto(path){
 if(!/^products\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i.test(path||''))return '';
 return db.storage.from('tyc-apparel').getPublicUrl(path).data.publicUrl;
}
function reset(){
 editing=null;$('manager-form').reset();$('p-order').value=0;$('p-cancel').hidden=true;$('form-heading').textContent='Add product';$('p-images').required=false;
}
function loadEdit(p){
 editing=p.id;$('form-heading').textContent='Edit product';$('p-title').value=p.title;$('p-category').value=p.category;
 $('p-description').value=p.description||'';$('p-colors').value=p.colors||'';$('p-sizes').value=p.sizes||'';
 $('p-order').value=p.sort_order||0;$('p-published').checked=!!p.is_published;
 $('p-images').value='';$('p-cancel').hidden=false;window.scrollTo({top:0,behavior:'smooth'});
}
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
 const files=[...$('p-images').files];
 const existing=items.find(x=>x.id===editing);
 if(!existing&&!files.length){notice('Please choose at least one product photo.',true);return;}
 if(files.length>5){notice('Maximum five photos per product.',true);return;}
 for(const file of files){if(!extByType[file.type]||file.size>8388608){notice('Use JPG, PNG or WebP photos up to 8 MB each.',true);return;}}
 busy=true;$('p-save').disabled=true;notice('Saving product…');
 const id=existing?.id||crypto.randomUUID(),uploaded=[];
 try{
  for(const file of files){
   const ext=extByType[file.type],path='products/'+id+'/'+crypto.randomUUID()+'.'+ext;
   const {error}=await db.storage.from('tyc-apparel').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
   if(error)throw error;uploaded.push(path);
  }
  const image_paths=uploaded.length?uploaded:(existing?.image_paths||[]);
  const product={title:$('p-title').value.trim(),category:$('p-category').value,description:$('p-description').value.trim(),colors:$('p-colors').value.trim(),sizes:$('p-sizes').value.trim(),sort_order:Number($('p-order').value)||0,is_published:$('p-published').checked,image_paths,updated_at:new Date().toISOString()};
  if(!image_paths.length)product.is_published=false;
  const query=existing?db.from('tyc_apparel_products').update(product).eq('id',id):db.from('tyc_apparel_products').insert({id,...product});
  const {error}=await query;if(error)throw error;
  // Clean up images replaced in an existing product.
  if(existing&&uploaded.length&&existing.image_paths?.length)await db.storage.from('tyc-apparel').remove(existing.image_paths.filter(x=>safePhoto(x)));
  reset();await refresh();notice('Product saved successfully.');
 }catch(err){
  if(uploaded.length)await db.storage.from('tyc-apparel').remove(uploaded);
  notice('Save failed: '+err.message,true);
 }finally{busy=false;$('p-save').disabled=false;}
});
async function init(){
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){notice('Supabase is not configured.',true);return;}
 db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data:{session},error}=await db.auth.getSession();
 if(error||!session){
 notice('Please log in with your existing The Young Club account to manage Apparel. / 기존 계정으로 로그인해 주세요.');
 $('admin-access-links').hidden=false;
 return;
}
 const {data:admin,error:adminError}=await db.from('job_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
 if(adminError||!admin){notice('Signed in, but this account does not have Apparel administrator access. / 로그인되었지만 관리자 권한이 없는 계정입니다.',true);$('admin-access-links').hidden=false;$('admin-login-link').textContent='Switch Account / 다른 계정 로그인';return;}
 $('admin-zone').hidden=false;await refresh();notice('Administrator access confirmed. Create a draft or publish your first product.');
}
init().catch(err=>notice('Unable to load Apparel Manager: '+err.message,true));
})();