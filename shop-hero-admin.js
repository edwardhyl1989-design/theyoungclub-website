/* Admin-only collection banner manager. RLS enforces authorization. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const zone=$('shop-hero-manager');if(!zone)return;
 const status=$('shop-hero-status'),list=$('shop-hero-slots'),input=$('shop-hero-upload'),save=$('shop-hero-save');
 const allowed={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
 const validPath=p=>typeof p==='string'&&/^hero\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i.test(p);
 let db=null,slots=[],savedPaths=[],busy=false;
 const say=(v,error=false)=>{status.textContent=v;status.classList.toggle('error',error);};
 function url(path){return db.storage.from('tyc-apparel').getPublicUrl(path).data.publicUrl;}
 function discard(slot){if(slot.preview)URL.revokeObjectURL(slot.preview);}
 function show(){
  list.replaceChildren();
  slots.forEach((slot,i)=>{
   const item=document.createElement('div');item.className='shop-hero-slot';
   const img=document.createElement('img');img.alt='Banner '+(i+1);img.src=slot.preview||url(slot.path);
   const badge=document.createElement('span');badge.textContent='SLIDE '+(i+1)+' / '+slots.length;
   const row=document.createElement('div');row.className='shop-hero-slot-actions';
   const button=(label,act,disabled=false)=>{
    const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=label;b.disabled=disabled;b.addEventListener('click',act);return b;
   };
   row.append(
    button('←',()=>{[slots[i-1],slots[i]]=[slots[i],slots[i-1]];show();},i===0),
    button('→',()=>{[slots[i+1],slots[i]]=[slots[i],slots[i+1]];show();},i===slots.length-1),
    button('Remove',()=>{const removed=slots.splice(i,1)[0];discard(removed);show();})
   );
   item.append(img,badge,row);list.append(item);
  });
  input.disabled=busy||slots.length>=10;
  save.disabled=busy;
  $('shop-hero-count').textContent=slots.length+' / 10 photos';
 }
 const accept=file=>{
  if(!file||!allowed[file.type]||file.size===0||file.size>8388608){say('JPG, PNG, WebP 사진만 가능하며 각각 8MB 이하여야 합니다.',true);return false;}
  return true;
 };
 input.addEventListener('change',e=>{
  const files=[...e.target.files];e.target.value='';
  if(!files.length)return;
  if(slots.length+files.length>10){say('최대 10장까지 업로드할 수 있습니다.',true);return;}
  if(!files.every(accept))return;
  slots.push(...files.map(file=>({file,preview:URL.createObjectURL(file),path:''})));
  show();say('사진을 추가했어요. Save banner를 눌러야 적용됩니다.');
 });
 async function init(){
  if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY)return;
  db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
  const {data:{session}}=await db.auth.getSession();
  if(!session)return;
  const {data:admin,error:adminError}=await db.from('job_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
  if(adminError||!admin)return;
  const {data,error}=await db.from('tyc_shop_hero').select('image_paths').eq('id',1).maybeSingle();
  if(error){say('배너 불러오기 실패: '+error.message,true);return;}
  savedPaths=(data?.image_paths||[]).filter(validPath);
  slots=savedPaths.map(path=>({path,file:null,preview:''}));
  zone.hidden=false;show();
  say('배너 사진은 3초 간격으로 자동 전환됩니다. 첫 번째 사진이 처음 표시됩니다.');
 }
 save.addEventListener('click',async()=>{
  if(!db||busy)return;
  if(slots.length>10){say('최대 10장까지 등록 가능합니다.',true);return;}
  const files=slots.filter(s=>s.file).map(s=>s.file);if(!files.every(accept))return;
  busy=true;show();say('Saving banner…');
  const uploaded=[];let saved=false;
  try{
   const paths=[];
   for(const slot of slots){
    if(!slot.file){if(slot.path)paths.push(slot.path);continue;}
    const path='hero/'+crypto.randomUUID()+'.'+allowed[slot.file.type];
    const {error}=await db.storage.from('tyc-apparel').upload(path,slot.file,{contentType:slot.file.type,upsert:false,cacheControl:'3600'});
    if(error)throw error;
    uploaded.push(path);paths.push(path);
   }
   // The singleton row exists; update is admin-only via RLS.
   const {data,error}=await db.from('tyc_shop_hero').update({image_paths:paths,updated_at:new Date().toISOString()}).eq('id',1).select('id');
   if(error)throw error;
   if(!data?.length)throw Error('Admin permission denied or banner record not found');
   saved=true;
   const old=savedPaths.filter(p=>!paths.includes(p));
   savedPaths=paths;
   slots.forEach(discard);slots=paths.map(path=>({path,file:null,preview:''}));
   show();
   if(old.length){
    const {error:cleanup}=await db.storage.from('tyc-apparel').remove(old);
    if(cleanup){say('배너는 저장됐지만 이전 이미지 삭제에 실패했어요: '+cleanup.message,true);return;}
   }
   say('배너 저장 완료! SHOP 페이지에서 변경 사항을 확인하세요.');
  }catch(err){
   if(!saved&&uploaded.length)await db.storage.from('tyc-apparel').remove(uploaded);
   say('저장 실패: '+err.message,true);
  }finally{busy=false;show();}
 });
 init().catch(e=>say('배너 관리자 불러오기 실패: '+e.message,true));
})();