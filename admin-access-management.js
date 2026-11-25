/* Administrator code management; existing job_admins membership is authoritative. */
(()=>{
 'use strict';
 const section=document.getElementById('admin-login-management');
 if(!section)return;
 const $=selector=>section.querySelector(selector);
 const rows=$('#admin-login-management-rows'),status=$('#admin-login-management-status');
 let db=null,busy=false;
 const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n;};
 function message(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
 async function service(action,payload={}){
  if(!db)throw Error('Account service is unavailable.');
  const {data:{session},error}=await db.auth.getSession();
  if(error||!session)throw Error('Your administrator session expired. Log in again.');
  const request=await fetch(window.TYC_SUPABASE_URL.replace(/\/$/,'')+'/functions/v1/tyc-admin-star',{
   method:'POST',cache:'no-store',mode:'cors',
   headers:{'Content-Type':'application/json','apikey':window.TYC_SUPABASE_PUBLISHABLE_KEY,
    'Authorization':'Bearer '+session.access_token},
   body:JSON.stringify({action,...payload})
  });
  let result={};try{result=await request.json();}catch{}
  if(!request.ok)throw Error(result.error||'Unable to update administrator access.');
  return result;
 }
 async function update(account,input,action){
  if(busy)return;
  const code=input.value.trim();
  if(action==='set'&&!/^\d{16,32}$/.test(code)){
   message('Please enter a 16–32 digit numeric code. / 16~32자리 숫자 코드를 입력하세요.',true);
   input.focus();return;
  }
  if(action==='disable'&&!window.confirm('이 관리자 계정의 별 로그인 코드를 비활성화할까요? 이메일 로그인은 유지됩니다.\n\nDisable quick sign-in for '+account.email+'?'))return;
  if(action==='set'&&account.configured&&!window.confirm('기존 별 로그인 코드를 새 코드로 교체하시겠습니까?\n\nReplace access code for '+account.email+'?'))return;
  busy=true;message(action==='set'?'Saving administrator access…':'Disabling quick sign-in…');
  try{
   await service(action,{user_id:account.user_id,...(action==='set'?{code}:{})});
   input.value='';
   await refresh();
   message(action==='set'?'✓ Administrator login code saved. / 관리자 코드 저장 완료.':'✓ Quick sign-in disabled. Email login is unchanged.');
  }catch(error){input.value='';message(error.message||'Could not update.',true);}
  finally{busy=false;}
 }
 function render(accounts){
  rows.replaceChildren();
  if(!accounts.length){rows.append(el('p','tyc-admin-login-empty','No administrator accounts have been configured.'));return;}
  for(const account of accounts){
   const wrap=el('article','tyc-admin-login-account');
   const identity=el('div','tyc-admin-login-identity');
   identity.append(el('strong','',account.email),el('small','',account.configured?(account.enabled?'Quick sign-in enabled':'Quick sign-in disabled'):'No code assigned'));
   const info=el('div','tyc-admin-login-meta');
   info.textContent=account.configured?'Last updated: '+(account.updated_at?new Date(account.updated_at).toLocaleString():'—'):'Existing email/password login available';
   identity.append(info);
   const controls=el('div','tyc-admin-login-controls');
   const input=el('input','tyc-admin-login-code');
   input.type='password';input.inputMode='numeric';input.pattern='[0-9]{16,32}';input.minLength=16;input.maxLength=32;input.autocomplete='new-password';
   input.placeholder='16–32 digit private access code';input.setAttribute('aria-label','Numeric access code for '+account.email);
   const save=el('button','tyc-admin-login-set',account.configured?'Replace Code':'Assign Code');save.type='button';
   save.addEventListener('click',()=>update(account,input,'set'));
   controls.append(input,save);
   if(account.configured&&account.enabled){
    const disable=el('button','tyc-admin-login-disable','Disable');
    disable.type='button';disable.addEventListener('click',()=>update(account,input,'disable'));
    controls.append(disable);
   }
   wrap.append(identity,controls);rows.append(wrap);
  }
 }
 async function refresh(){
  const data=await service('list');
  render(data.accounts||[]);
 }
 async function init(){
  if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL)return;
  db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
  const {data}=await db.auth.getSession();if(!data?.session?.user)return;
  const check=await db.from('job_admins').select('user_id').eq('user_id',data.session.user.id).maybeSingle();
  if(check.error||!check.data)return;
  section.hidden=false;
  message('Loading administrator accounts…');
  try{await refresh();message('Codes are not displayed after saving. Assign at least 16 random digits to enable star sign-in.');}
  catch(error){message(error.message||'Unable to load administrator accounts.',true);}
 }
 init().catch(e=>message(e.message||'Administrator access unavailable.',true));
})();