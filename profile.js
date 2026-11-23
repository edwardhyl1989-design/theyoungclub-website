/* The Young Club profile: account details, display name and password security. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const msg=(text,error=false)=>{const el=$('profile-message');el.textContent=text;el.classList.toggle('error',error);el.hidden=false;};
const formMsg=(id,text,error=false)=>{const el=$(id);el.textContent=text;el.classList.toggle('error',error);};
let db,user,memberRow=null;
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
 if(status==='approved'){label.textContent='Verified PTA';detail.textContent='Your PTA Community membership has been approved. / PTA 회원 인증이 승인되었습니다.';link.textContent='Open PTA Community';}
 else if(status==='pending'){label.textContent='Pending Verification';detail.textContent='Your PTA Community application is under review. / PTA 인증 신청을 검토 중입니다.';link.textContent='View Application Status';}
 else if(status==='rejected'){label.textContent='Not Approved';detail.textContent='Your previous application was not approved. / 이전 신청이 승인되지 않았습니다.';link.textContent='View Community';}
 else{label.textContent=isAdmin?'No PTA Application':'Not Yet Verified';detail.textContent=isAdmin?'Administrator privileges are separate from PTA license verification. / 관리자 권한과 PTA 면허 인증은 별개입니다.':'Submit your PTA license details for membership approval. / PTA 면허 정보를 제출해 인증을 신청할 수 있습니다.';link.textContent=isAdmin?'Open PTA Community':'Start PTA Verification';}
}
function showMembershipDetails(){
 const date=user?.created_at?new Date(user.created_at):null;
 $('profile-member-since').textContent=date&&!Number.isNaN(date.getTime())
 ?date.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'})
 :'Not available';
 const state=memberRow?.license_state;
 $('profile-license-state').textContent=typeof state==='string'&&/^[A-Z]{2}$/.test(state)?state:'Not provided';
}
async function saveName(event){
 event.preventDefault();if(!db||!user||!memberRow)return;
 const form=event.currentTarget,button=form.querySelector('button'),name=$('display-name-input').value.trim();
 if(name.length<2||name.length>40){formMsg('display-name-message','Nickname must be 2–40 characters. / 닉네임은 2~40자여야 합니다.',true);return;}
 if(name===memberRow.display_name){formMsg('display-name-message','This is your current nickname. / 현재 닉네임과 같습니다.');return;}
 updateNicknameLimit();if(button.disabled){formMsg('display-name-message','Nickname change is not available yet. / 아직 닉네임을 변경할 수 없습니다.',true);return;}
 button.disabled=true;formMsg('display-name-message','Checking nickname…');
 try{
   const check=await db.rpc('tyc_nickname_available',{p_nickname:name});
   if(check.error)throw check.error;
   if(!check.data)throw new Error('Nickname already taken. / 이미 사용 중인 닉네임입니다.');
   const {error}=await db.rpc('tyc_update_own_display_name',{new_display_name:name});
   if(error)throw error;
   // The database is the authority. A metadata update is best effort only.
   memberRow.display_name=name;
   const updated=await db.from('pta_members').select('display_name,nickname_changed_at').eq('user_id',user.id).maybeSingle();
   if(!updated.error&&updated.data)Object.assign(memberRow,updated.data);
   const meta=await db.auth.updateUser({data:{display_name:name}});
   if(!meta.error&&meta.data?.user)user=meta.data.user;
   $('profile-display-name').textContent=name;
   formMsg('display-name-message','Nickname updated. Next change in 30 days. / 닉네임 변경 완료. 30일 후 재변경 가능.');
 }catch(err){formMsg('display-name-message','Could not change nickname: '+(err.message||'Please retry.'),true);}
 finally{updateNicknameLimit();}
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
   db.from('pta_members').select('membership_status,display_name,license_state,nickname_changed_at').eq('user_id',user.id).maybeSingle(),
   db.from('job_admins').select('user_id').eq('user_id',user.id).maybeSingle()
 ]);
 if(!member.error)memberRow=member.data||null;
 showProfile();
 updateNicknameLimit();
 showMembershipDetails();
 // Admin access is read from a protected database table, never from user-editable profile metadata.
 if(!admin.error){$('profile-role').textContent=admin.data?'Administrator':'Registered Member';$('profile-admin-panel').hidden=!admin.data;}
 if(member.error||admin.error){$('profile-verification').textContent='Unable to verify status';$('profile-explanation').textContent='Please visit the PTA Community to check your membership status. / 회원 상태를 확인할 수 없습니다.';}
 else verification(member.data?.membership_status||null,!!admin.data);
 $('display-name-form').addEventListener('submit',saveName);
 $('password-form').addEventListener('submit',changePassword);
}
init().catch(()=>msg('Could not load your profile. Please refresh the page. / 프로필을 불러올 수 없습니다.',true));
})();
