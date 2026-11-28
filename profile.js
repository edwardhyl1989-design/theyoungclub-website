/* The Young Club profile: account details, display name and password security. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const msg=(text,error=false)=>{const el=$('profile-message');el.textContent=text;el.classList.toggle('error',error);el.hidden=false;};
const formMsg=(id,text,error=false)=>{const el=$(id);el.textContent=text;el.classList.toggle('error',error);};
let db,user,memberRow=null,nicknameRequest=null,requestBusy=false,savingNickname=false,isAdmin=false;
function showProfile(){
 $('profile-email').textContent=user.email||'Not available';
 const name=memberRow?.display_name||user.user_metadata?.display_name||'Not set';
 $('profile-display-name').textContent=name;
 $('display-name-input').value=name==='Not set'?'':name;
 $('profile-content').hidden=false;$('profile-message').hidden=true;
}
function updateNicknameLimit(){
 const el=$('nickname-next-date'),input=$('display-name-input'),button=$('display-name-form').querySelector('button[type=submit]');
 if(!memberRow){
  el.textContent='Nickname changes are available after PTA Community membership application. / 커뮤니티 가입 신청 후 닉네임을 변경할 수 있습니다.';
  input.disabled=true;button.disabled=true;return;
 }
 const changed=memberRow.nickname_changed_at;
 const available=changed?new Date(new Date(changed).getTime()+30*86400000):null;
 const locked=!!available&&available.getTime()>Date.now();
 input.disabled=locked;button.disabled=locked;
 el.textContent=locked?'Next nickname change: '+available.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'})+' (UTC) / 변경 가능일'
  :'Nickname is available to change. Once saved, you must wait 30 days. / 변경 후 30일 제한이 적용됩니다.';
}
function verification(status,isAdmin){
 const label=$('profile-verification'),detail=$('profile-explanation'),link=$('profile-verify-link');
 $('profile-role').textContent=isAdmin?'Administrator':'Registered Member';
 $('profile-admin-panel').hidden=!isAdmin;
 if(status==='approved'){label.textContent=memberRow?.member_type==='SPTA'?'Verified SPTA':'Verified PTA';detail.textContent='Your PTA Community membership has been approved. / PTA 회원 인증이 승인되었습니다.';link.textContent='Open PTA Community';}
 else if(status==='pending'){label.textContent='Pending Verification';detail.textContent='Your PTA Community application is under review. / PTA 인증 신청을 검토 중입니다.';link.textContent='View Application Status';}
 else if(status==='rejected'){label.textContent='Not Approved';detail.textContent='Your previous application was not approved. / 이전 신청이 승인되지 않았습니다.';link.textContent='View Community';}
 else{label.textContent=isAdmin?'No PTA Application':'Not Yet Verified';detail.textContent=isAdmin?'Administrator privileges are separate from PTA license verification. / 관리자 권한과 PTA 면허 인증은 별개입니다.':'Submit your PTA license details for membership approval. / PTA 면허 정보를 제출해 인증을 신청할 수 있습니다.';link.textContent=isAdmin?'Open PTA Community':'Start PTA Verification';}
}
function showMembershipDetails(){
 const date=user?.created_at?new Date(user.created_at):null;
 $('profile-member-since').textContent=date&&!Number.isNaN(date.getTime())
 ?date.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'})
 :'Not available';
 const residence=memberRow?.residence_state||memberRow?.student_state;
 $('profile-residence-state').textContent=typeof residence==='string'&&/^[A-Z]{2}$/.test(residence)?residence:'Not provided';
 const state=memberRow?.license_state;
 $('profile-license-state').textContent=typeof state==='string'&&/^[A-Z]{2}$/.test(state)?state:'Not provided';
}
async function saveName(event){
 event.preventDefault();
 if(!db||!user||!memberRow||savingNickname)return;
 const button=$('display-name-form').querySelector('button[type=submit]');
 const name=$('display-name-input').value.trim();
 if(name.length<2||name.length>40){
  formMsg('display-name-message','Nickname must be 2–40 characters. / 닉네임은 2~40자여야 합니다.',true);return;
 }
 if(name===memberRow.display_name){
  formMsg('display-name-message','This is your current nickname. / 현재 닉네임과 같습니다.');return;
 }
 if(!isAdmin&&window.TYC_NicknameRules?.isReserved(name)){
  formMsg('display-name-message',window.TYC_NicknameRules.message,true);return;
 }
 updateNicknameLimit();
 if(button.disabled){
  formMsg('display-name-message','Nickname change is not available yet. You can request an admin exception. / 아직 직접 변경할 수 없습니다. 관리자에게 변경을 요청할 수 있습니다.',true);return;
 }
 savingNickname=true;button.disabled=true;
 formMsg('display-name-message','Checking nickname availability… / 닉네임 중복 확인 중…');
 try{
  const check=await db.rpc('tyc_nickname_available',{p_nickname:name});
  if(check.error)throw check.error;
  if(!check.data)throw new Error('Nickname already taken. / 이미 사용 중인 닉네임입니다.');
  // Only a confirmed choice is sent to the database. Database still enforces cooldown.
  const confirmed=window.confirm('닉네임을 "'+name+'" (으)로 변경하시겠습니까?\n\n변경한 날부터 30일 동안 직접 다시 변경할 수 없습니다.\n실수로 변경한 경우 관리자 승인이 필요합니다.\n\nChange your nickname to "'+name+'"?\nYou cannot change it yourself again for 30 days.\n\n확인 / OK: 변경 진행    취소 / Cancel: 돌아가기');
  if(!confirmed){
   formMsg('display-name-message','Nickname change cancelled. / 변경을 취소했습니다.');
   return;
  }
  formMsg('display-name-message','Saving nickname… / 닉네임 변경 중…');
  const {error}=await db.rpc('tyc_update_own_display_name',{new_display_name:name});
  if(error)throw error;
  memberRow.display_name=name;
  const updated=await db.from('pta_members').select('display_name,nickname_changed_at').eq('user_id',user.id).maybeSingle();
  if(!updated.error&&updated.data)Object.assign(memberRow,updated.data);
  // Profile metadata is not used for authorization or uniqueness.
  try{
   const meta=await db.auth.updateUser({data:{display_name:name}});
   if(!meta.error&&meta.data?.user)user=meta.data.user;
  }catch{}
  $('profile-display-name').textContent=name;
  formMsg('display-name-message','Nickname updated. Next direct change in 30 days. / 닉네임 변경 완료. 30일 후 직접 재변경 가능.');
 }catch(err){formMsg('display-name-message','Could not change nickname: '+(err.message||'Please retry.'),true);}
 finally{savingNickname=false;updateNicknameLimit();}
}
function setRequestPanel(open){
 const form=$('nickname-exception-form'),toggle=$('nickname-request-toggle');
 if(!form||!toggle)return;
 const show=!!open && !!memberRow && nicknameRequest?.status!=='pending';
 form.hidden=!show;
 toggle.setAttribute('aria-expanded',String(show));
 if(show){
  const target=$('nickname-request-name');
  if(!target.value.trim())target.value='';
  target.focus();
 }
}
function renderNicknameRequest(){
 const toggle=$('nickname-request-toggle'),status=$('nickname-request-current');
 if(!toggle||!status)return;
 toggle.disabled=!memberRow||requestBusy||nicknameRequest?.status==='pending';
 if(!memberRow){
  status.hidden=true;setRequestPanel(false);return;
 }
 if(!nicknameRequest){status.hidden=true;return;}
 const date=nicknameRequest.created_at
  ?new Date(nicknameRequest.created_at).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})
  :'';
 const target=nicknameRequest.requested_name;
 const word=nicknameRequest.status==='pending'?'Pending review / 관리자 검토 중'
  :nicknameRequest.status==='approved'?'Approved / 승인 완료':'Not approved / 반려';
 status.hidden=false;
 status.textContent='Nickname request: '+target+' · '+word+(date?' · '+date:'')
  +(nicknameRequest.status==='rejected'&&nicknameRequest.review_note?' · '+nicknameRequest.review_note:'');
 status.dataset.state=nicknameRequest.status;
 if(nicknameRequest.status==='pending')setRequestPanel(false);
}
async function loadNicknameRequest(){
 if(!db||!user||!memberRow)return;
 const result=await db.from('tyc_nickname_change_requests')
  .select('id,requested_name,reason,status,created_at,reviewed_at,review_note')
  .eq('user_id',user.id).order('created_at',{ascending:false}).limit(1);
 if(result.error){
  formMsg('nickname-request-message','Could not load nickname requests: '+result.error.message,true);
  return;
 }
 nicknameRequest=result.data?.[0]||null;
 renderNicknameRequest();
}
async function sendNicknameRequest(event){
 event.preventDefault();
 if(!db||!user||!memberRow||requestBusy)return;
 if(nicknameRequest?.status==='pending'){
  formMsg('nickname-request-message','An admin is already reviewing your request. / 이미 검토 중인 요청이 있습니다.',true);return;
 }
 const name=$('nickname-request-name').value.trim();
 const reason=$('nickname-request-reason').value.trim();
 if(name.length<2||name.length>40){
  formMsg('nickname-request-message','Nickname must be 2–40 characters. / 닉네임은 2~40자여야 합니다.',true);return;
 }
 if(!isAdmin&&window.TYC_NicknameRules?.isReserved(name)){
  formMsg('nickname-request-message',window.TYC_NicknameRules.message,true);return;
 }
 if(name.toLocaleLowerCase()===memberRow.display_name.toLocaleLowerCase()){
  formMsg('nickname-request-message','Enter a nickname different from your current one. / 현재 닉네임과 다른 이름을 입력해 주세요.',true);return;
 }
 if(reason.length<5||reason.length>500){
  formMsg('nickname-request-message','Please explain the reason in 5–500 characters. / 변경 사유를 5~500자로 작성해 주세요.',true);return;
 }
 requestBusy=true;
 const submit=$('nickname-request-submit');submit.disabled=true;
 formMsg('nickname-request-message','Checking nickname availability… / 중복 확인 중…');
 try{
  const check=await db.rpc('tyc_nickname_available',{p_nickname:name});
  if(check.error)throw check.error;
  if(!check.data)throw new Error('Nickname already taken. / 이미 사용 중인 닉네임입니다.');
  const {error}=await db.rpc('tyc_submit_nickname_change_request',{p_requested_name:name,p_reason:reason});
  if(error)throw error;
  $('nickname-exception-form').reset();
  setRequestPanel(false);
  formMsg('display-name-message','✓ Request sent for administrator review. Your current nickname remains unchanged. / 관리자에게 요청을 보냈습니다. 승인 전에는 기존 닉네임이 유지됩니다.');
  await loadNicknameRequest();
 }catch(err){
  formMsg('nickname-request-message','Could not submit nickname request: '+(err.message||'Please retry.'),true);
 }finally{
  requestBusy=false;submit.disabled=false;renderNicknameRequest();
 }
}
async function changePassword(event){
 event.preventDefault();if(!db||!user)return;
 const form=event.currentTarget,button=form.querySelector('button');
 const current=$('current-password').value,next=$('new-password').value,confirm=$('confirm-new-password').value;
 if(next.length<8){formMsg('password-message','Use at least 8 characters. / 8자 이상 입력해 주세요.',true);return;}
 if(next!==confirm){formMsg('password-message','New passwords do not match. / 새 비밀번호가 일치하지 않습니다.',true);return;}
 if(current===next){formMsg('password-message','Choose a different password. / 다른 비밀번호를 사용해 주세요.',true);return;}
 button.disabled=true;formMsg('password-message','Updating password...');
 try{
   const check=await db.auth.signInWithPassword({email:user.email,password:current});
   if(check.error)throw new Error('Current password is incorrect or could not be verified.');
   const update=await db.auth.updateUser({password:next});
   if(update.error)throw update.error;
   form.reset();formMsg('password-message','Password changed successfully. / 비밀번호가 변경되었습니다.');
 }catch(err){formMsg('password-message','Password change failed: '+(err.message||'Please retry.'),true);}
 finally{button.disabled=false;}
}
async function init(){
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){msg('Account service unavailable. / 계정 서비스 연결을 확인해 주세요.',true);return;}
 db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data,error}=await db.auth.getUser();user=data?.user;
 if(error||!user){location.replace('auth.html?next=profile.html');return;}
 const [member,admin]=await Promise.all([
   db.from('pta_members').select('membership_status,display_name,license_state,residence_state,student_state,member_type,nickname_changed_at').eq('user_id',user.id).maybeSingle(),
   db.from('job_admins').select('user_id').eq('user_id',user.id).maybeSingle()
 ]);
 if(!member.error)memberRow=member.data||null;
 showProfile();
 updateNicknameLimit();
 renderNicknameRequest();
 showMembershipDetails();
 // Admin access is read from a protected database table, never from user-editable profile metadata.
 if(!admin.error){isAdmin=!!admin.data;$('profile-role').textContent=isAdmin?'Administrator':'Registered Member';$('profile-admin-panel').hidden=!isAdmin;}
 if(member.error||admin.error){$('profile-verification').textContent='Unable to verify status';$('profile-explanation').textContent='Please visit the PTA Community to check your membership status. / 회원 상태를 확인할 수 없습니다.';}
 else verification(member.data?.membership_status||null,!!admin.data);
 $('display-name-form').addEventListener('submit',saveName);
 $('nickname-request-toggle').addEventListener('click',()=>setRequestPanel($('nickname-exception-form').hidden));
 $('nickname-request-cancel').addEventListener('click',()=>setRequestPanel(false));
 $('nickname-exception-form').addEventListener('submit',sendNicknameRequest);
 await loadNicknameRequest();
 $('password-form').addEventListener('submit',changePassword);
}
init().catch(()=>msg('Could not load your profile. Please refresh the page. / 프로필을 불러올 수 없습니다.',true));
})();
