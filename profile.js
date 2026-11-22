/* Read-only member profile, using the same Supabase project/session as Community. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const msg=(text,error=false)=>{const el=$('profile-message');el.textContent=text;el.classList.toggle('error',error);el.hidden=false;};
function showProfile(email){$('profile-email').textContent=email||'Not available';$('profile-content').hidden=false;$('profile-message').hidden=true;}
function verification(status,isAdmin){
 const label=$('profile-verification'),detail=$('profile-explanation'),link=$('profile-verify-link');
 if(isAdmin){label.textContent='Administrator';detail.textContent='Administrative access to the PTA Community is enabled.';link.textContent='Open PTA Community';return;}
 if(status==='approved'){label.textContent='Verified PTA';detail.textContent='Your PTA Community membership has been approved.';link.textContent='Open PTA Community';}
 else if(status==='pending'){label.textContent='Pending Verification';detail.textContent='Your membership request is under review.';link.textContent='View Application Status';}
 else if(status==='rejected'){label.textContent='Not Approved';detail.textContent='Your previous application was not approved. Visit Community for details.';link.textContent='View Community';}
 else{label.textContent='Not Yet Verified';detail.textContent='Apply for membership and submit your PTA license details to join the PTA Community.';link.textContent='Start PTA Verification';}
}
async function init(){
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){msg('Account service unavailable. / 계정 서비스 연결을 확인해 주세요.',true);return;}
 const db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data,error}=await db.auth.getUser();
 const user=data?.user;
 if(error||!user){location.replace('auth.html?next=profile.html');return;}
 showProfile(user.email);
 const [member,admin]=await Promise.all([db.from('pta_members').select('membership_status').eq('user_id',user.id).maybeSingle(),db.from('job_admins').select('user_id').eq('user_id',user.id).maybeSingle()]);
 if(member.error||admin.error){$('profile-verification').textContent='Unable to verify status';$('profile-explanation').textContent='Please visit the PTA Community to check your membership status.';return;}
 verification(member.data?.membership_status||null,!!admin.data);
}
init().catch(()=>msg('Could not load your profile. Please refresh the page. / 프로필을 불러올 수 없습니다.',true));
})();
