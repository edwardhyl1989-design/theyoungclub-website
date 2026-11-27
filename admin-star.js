/* A subtle permanent star beside the account control.
   The star is navigation only; all administrator authentication is server-side. */
(()=>{
 'use strict';
 const account=document.querySelector('[data-account-header]');
 if(!account || !window.supabase?.createClient || !window.TYC_SUPABASE_URL)return;
 const project=window.TYC_SUPABASE_URL.replace(/\/$/,'');
 const publicKey=window.TYC_SUPABASE_PUBLISHABLE_KEY;
 const endpoint=project+'/functions/v1/tyc-admin-star';
 let submitting=false;
 const button=(extra)=>{
  const node=document.createElement('button');node.type='button';
  node.className='tyc-admin-star '+extra;
  node.setAttribute('aria-label','Restricted member access');
  const glyph=document.createElement('span');glyph.className='tyc-admin-star-glyph';
  glyph.textContent='✦';glyph.setAttribute('aria-hidden','true');node.append(glyph);
  return node;
 };
 const desktop=button('tyc-admin-star-spot');
 account.insertAdjacentElement('afterend',desktop);
 const head=account.closest('.tyc-header-inner');
 const menuToggle=head?.querySelector('.tyc-mobile-menu-toggle');
 let mobile=null;
 if(menuToggle){mobile=button('tyc-admin-star-mobile');menuToggle.insertAdjacentElement('beforebegin',mobile);}
 const dialog=document.createElement('dialog');dialog.className='tyc-admin-access-modal';
 dialog.setAttribute('aria-labelledby','tyc-admin-access-title');
 dialog.innerHTML='<div class="tyc-admin-modal-head"><span class="tyc-admin-modal-star" aria-hidden="true">✦</span><button type="button" class="tyc-admin-modal-close" aria-label="Close">×</button></div><h2 id="tyc-admin-access-title">Private Access</h2><p>Authorized administrators only'+((document.documentElement.hasAttribute('data-english-only')||document.documentElement.dataset.communityLanguage==='en'||/\/community-en(?:\.html)?\/?$/i.test(location.pathname))?'':' / 관리자 전용')+'</p><form class="tyc-admin-modal-form"><label for="tyc-admin-access-code">Access Code</label><input type="password" id="tyc-admin-access-code" inputmode="numeric" pattern="[0-9]{6,32}" minlength="6" maxlength="32" autocomplete="off" placeholder="6–32 digit access code" required><button class="tyc-admin-modal-submit" type="submit">Sign In</button><output class="tyc-admin-modal-feedback" role="status" aria-live="polite"></output></form><small>Existing email/password sign-in remains available.</small>';
 document.body.append(dialog);
 const form=dialog.querySelector('form'),input=dialog.querySelector('input');
 const submit=dialog.querySelector('.tyc-admin-modal-submit');
 const feedback=dialog.querySelector('.tyc-admin-modal-feedback');
 function close(){if(!submitting)dialog.close();}
 dialog.querySelector('.tyc-admin-modal-close').addEventListener('click',close);
 dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
 function open(){
  if(dialog.open)return;
  form.reset();feedback.textContent='';feedback.classList.remove('is-error');
  dialog.showModal();input.focus();
 }
 desktop.addEventListener('click',open);
 mobile?.addEventListener('click',open);
 async function call(body){
  const request=await fetch(endpoint,{method:'POST',mode:'cors',cache:'no-store',
   headers:{'Content-Type':'application/json','apikey':publicKey},
   body:JSON.stringify(body)});
  let payload={};try{payload=await request.json();}catch{}
  if(!request.ok)throw Error(payload.error||'Sign-in unavailable. Please try later.');
  return payload;
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(submitting)return;
  const code=input.value.trim();
  if(!/^\d{6,32}$/.test(code)){feedback.textContent='Enter your 6–32 digit access code.';feedback.classList.add('is-error');return;}
  submitting=true;submit.disabled=true;input.disabled=true;
  feedback.classList.remove('is-error');feedback.textContent='Verifying access…';
  try{
   const result=await call({action:'login',code});
   input.value='';
   if(!result.token_hash)throw Error('Sign-in response was incomplete.');
   const client=window.supabase.createClient(window.TYC_SUPABASE_URL,publicKey);
   const verified=await client.auth.verifyOtp({token_hash:result.token_hash,type:'email'});
   if(verified.error)throw verified.error;
   if(!verified.data?.user)throw Error('Session could not be created.');
   window.location.reload();
  }catch(err){
   input.value='';
   feedback.textContent=err?.message||'Could not sign in.';
   feedback.classList.add('is-error');
  }finally{submitting=false;submit.disabled=false;input.disabled=false;}
 });
})();