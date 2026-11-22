(()=>{'use strict';
const $=id=>document.getElementById(id), text=(id,v)=>{$(id).textContent=v??''}, show=(id,on)=>$(id).classList.toggle('hidden',!on);
const make=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x};
const button=(caption,cb,primary=false)=>{const b=make('button','btn'+(primary?' primary':''),caption);b.type='button';b.onclick=cb;return b;};
const projectURL=window.TYC_SUPABASE_URL, pubkey=window.TYC_SUPABASE_PUBLISHABLE_KEY;
const states='AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR GU VI MP AS'.split(' ');
const valid=typeof projectURL==='string'&&/^https:\/\/[\w-]+\.supabase\.co\/?$/.test(projectURL)&&typeof pubkey==='string'&&pubkey.startsWith('sb_publishable_')&&!!window.supabase?.createClient;
let db,user,isAdmin=false,isMember=false,memberRow=null,topics=[],members=new Map(),activeTopic=null;
function status(m,err=false){text('message',m);$('message').classList.toggle('error',err)}
function errorMessage(e){return e?.message||'요청을 처리하지 못했습니다.'}
function niceDate(d){return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
function displayName(id){return members.get(id)||'PTA Member'}
async function auth(mode){const email=$('email').value.trim(),password=$('password').value;if(!email||!password){status('이메일과 비밀번호를 입력해 주세요.',true);return;}
const res=mode==='signup'?await db.auth.signUp({email,password,options:{emailRedirectTo:new URL('community.html',location.href).href}}):await db.auth.signInWithPassword({email,password});
if(res.error){status(errorMessage(res.error),true);return;}
if(mode==='signup'&&!res.data.session){status('확인 이메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.');return;}
await refresh();}
async function resetPassword(){const email=$('email').value.trim();if(!email){status('이메일을 먼저 입력해 주세요.',true);return;}const r=await db.auth.resetPasswordForEmail(email,{redirectTo:new URL('community.html',location.href).href});status(r.error?errorMessage(r.error):'비밀번호 재설정 메일을 확인해 주세요.',!!r.error)}
async function logout(){const {error}=await db.auth.signOut();if(error){status(errorMessage(error),true);return;}await refresh();}
async function refresh(){const res=await db.auth.getUser();user=res.data?.user||null;isAdmin=false;isMember=false;memberRow=null;show('loginArea',!user);show('requestArea',false);show('memberArea',false);show('adminArea',false);show('accountArea',!!user);if(!user){status('비공개 커뮤니티입니다. 로그인한 승인 회원만 글을 볼 수 있습니다.');return;}
text('identity',`Signed in: ${user.email}`);
const [a,m]=await Promise.all([db.from('job_admins').select('user_id').eq('user_id',user.id).maybeSingle(),db.from('pta_members').select('user_id,display_name,membership_status').eq('user_id',user.id).maybeSingle()]);
if(a.error||m.error){status('회원 정보를 조회할 수 없습니다. 관리자에게 문의해 주세요.',true);return;}
isAdmin=!!a.data;memberRow=m.data;isMember=isAdmin||m.data?.membership_status==='approved';
if(isAdmin){show('adminArea',true);await loadApplications();await loadApprovedMembers();}
if(!isMember){if(!memberRow){show('requestArea',true);status('PTA Community 가입 신청을 완료하면 관리자가 검토합니다.');}
else status(memberRow.membership_status==='pending'?'가입 신청을 검토 중입니다. 승인 후 열람할 수 있어요.':'가입 신청이 승인되지 않았습니다. 관리자에게 문의해 주세요.');return;}
show('memberArea',true);status('승인된 회원 전용 공간입니다.');await loadTopics();}
async function apply(event){event.preventDefault();if(!user)return;const payload={user_id:user.id,display_name:$('displayName').value.trim(),legal_first_name:$('legalFirstName').value.trim(),legal_last_name:$('legalLastName').value.trim(),license_state:$('licenseState').value,license_number:$('licenseNumber').value.trim()||null,statement:$('statement').value.trim(),membership_status:'pending'};
if(!payload.legal_first_name||!payload.legal_last_name||!states.includes(payload.license_state)){status('Legal Name과 면허 발급 주를 입력해 주세요.',true);return;}
if(payload.display_name.length<2){status('표시 이름은 2글자 이상 입력해 주세요.',true);return;}
const r=await db.from('pta_members').insert(payload).select('user_id');if(r.error){status('신청 실패: '+errorMessage(r.error),true);return;}await refresh();}
async function loadApplications(){if(!isAdmin)return;const r=await db.from('pta_members').select('user_id,display_name,legal_first_name,legal_last_name,license_state,license_number,statement,membership_status,created_at').eq('membership_status','pending').order('created_at');const root=$('applications');root.replaceChildren();if(r.error){root.append(make('p','meta',errorMessage(r.error)));return;}
if(!r.data?.length){root.append(make('p','meta','승인 대기 신청이 없습니다.'));return;}
for(const x of r.data){const card=make('div','review');card.append(make('strong','',`${x.legal_first_name} ${x.legal_last_name}`),make('p','meta',`Display: ${x.display_name} · State: ${x.license_state} · License #: ${x.license_number||'not supplied'} · ${niceDate(x.created_at)}`),make('p','meta',`User ID: ${x.user_id}`),make('p','',x.statement||'소개 없음')); 
const row=make('div','actions');row.append(button('Approve',()=>review(x.user_id,'approved'),true),button('Reject',()=>review(x.user_id,'rejected')));card.append(row);root.append(card);}}
async function loadApprovedMembers(){if(!isAdmin)return;const r=await db.from('pta_members').select('user_id,display_name,legal_first_name,legal_last_name,license_state,verified_at').eq('membership_status','approved').order('verified_at',{ascending:false});const root=$('approvedMembers');root.replaceChildren();if(r.error){root.append(make('p','meta',errorMessage(r.error)));return;}if(!r.data?.length){root.append(make('p','meta','승인된 회원이 없습니다.'));return;}for(const x of r.data){const card=make('div','review');card.append(make('strong','',`${x.display_name} · ${x.legal_first_name||''} ${x.legal_last_name||''}`),make('p','meta',`${x.license_state||'-'} · Approved ${niceDate(x.verified_at)}`));card.append(button('Revoke access',async()=>{if(!confirm('이 회원의 커뮤니티 접근 권한을 해제할까요?'))return;const q=await db.from('pta_members').update({membership_status:'rejected',review_note:'Access revoked by administrator',verified_at:null,verified_by:null}).eq('user_id',x.user_id);if(q.error){status(errorMessage(q.error),true);return;}status('회원 접근 권한을 해제했습니다.');await loadApprovedMembers();},false));root.append(card);}}
async function review(id,decision){if(!isAdmin)return;const reviewNote=decision==='approved'?null:(prompt('반려 사유 또는 추가 확인이 필요한 내용 (선택, 신청자에게 자동 발송되지 않음)','')||null);const r=await db.from('pta_members').update({membership_status:decision,verified_at:decision==='approved'?new Date().toISOString():null,verified_by:decision==='approved'?user.id:null,review_note:reviewNote}).eq('user_id',id);if(r.error){status('승인 처리 실패: '+errorMessage(r.error),true);return;}status(decision==='approved'?'회원 승인 완료':'가입 신청 반려 완료');await loadApplications();await loadApprovedMembers();}
async function loadMemberNames(){const r=await db.rpc('pta_approved_display_names');if(!r.error){members=new Map((r.data||[]).map(m=>[m.user_id,m.display_name]));}}
async function loadTopics(){if(!isMember)return;const [r]=await Promise.all([db.from('pta_topics').select('id,author_id,category,title,body,created_at').order('created_at',{ascending:false}),loadMemberNames()]);if(r.error){status('토론을 불러올 수 없습니다: '+errorMessage(r.error),true);return;}topics=r.data||[];renderTopics();}
function renderTopics(){show('detail',false);$('topics').classList.remove('hidden');const root=$('topics'),q=$('search').value.toLowerCase().trim(),cat=$('filter').value;root.replaceChildren();let selected=topics.filter(t=>(!cat||t.category===cat)&&(!q||`${t.title} ${t.body}`.toLowerCase().includes(q)));if(!selected.length){root.append(make('p','meta','아직 게시글이 없거나 검색 결과가 없습니다.'));return;}
for(const x of selected){const b=make('button','topic');b.type='button';b.append(make('span','eyebrow',x.category),make('strong','',x.title),make('span','meta',`${displayName(x.author_id)} · ${niceDate(x.created_at)}`));b.onclick=()=>openTopic(x);root.append(b);}}
async function openTopic(x){activeTopic=x;show('detail',true);$('topics').classList.add('hidden');text('detailTitle',x.title);text('detailMeta',`${x.category} · ${displayName(x.author_id)} · ${niceDate(x.created_at)}`);text('detailBody',x.body);await loadReplies();$('detail').scrollIntoView({behavior:'smooth',block:'start'});}
async function loadReplies(){if(!activeTopic)return;const r=await db.from('pta_replies').select('id,author_id,body,created_at').eq('topic_id',activeTopic.id).order('created_at');const root=$('replies');root.replaceChildren();if(r.error){root.append(make('p','meta',errorMessage(r.error)));return;}
if(!r.data?.length){root.append(make('p','meta','아직 답글이 없습니다.'));return;}
for(const x of r.data){const box=make('div','reply');box.append(make('p','meta',`${displayName(x.author_id)} · ${niceDate(x.created_at)}`),make('p','prewrap',x.body));root.append(box);}}
async function newTopic(e){e.preventDefault();if(!isMember)return;const r=await db.from('pta_topics').insert({author_id:user.id,category:$('topicCategory').value,title:$('topicTitle').value.trim(),body:$('topicBody').value.trim()});if(r.error){status('게시글 저장 실패: '+errorMessage(r.error),true);return;}$('topicDialog').close();$('topicForm').reset();status('게시글이 등록되었습니다.');await loadTopics();}
async function reply(e){e.preventDefault();if(!isMember||!activeTopic)return;const r=await db.from('pta_replies').insert({topic_id:activeTopic.id,author_id:user.id,body:$('replyBody').value.trim()});if(r.error){status('답글 저장 실패: '+errorMessage(r.error),true);return;}$('replyForm').reset();status('답글이 등록되었습니다.');await loadReplies();}
async function init(){const stateEl=$('licenseState');for(const code of states){const opt=make('option','',code);opt.value=code;stateEl.append(opt)}if(!valid){status('Supabase 공개 연결 설정을 확인해 주세요. Secret Key는 입력하면 안 됩니다.',true);return;}db=window.supabase.createClient(projectURL,pubkey);
$('authForm').addEventListener('submit',e=>{e.preventDefault();auth('login')});$('signup').onclick=()=>auth('signup');$('reset').onclick=resetPassword;
$('requestForm').onsubmit=apply;$('composeBtn').onclick=()=>$('topicDialog').showModal();$('topicForm').onsubmit=newTopic;
$('topicCategory').addEventListener('change',()=>{
  const compensation=$('topicCategory').value==='Compensation & Benefits';
  show('compensationHint',compensation);
  if(compensation && !$('topicBody').value.trim()){
    $('topicBody').value=[
      'State / City (지역): ',
      'Setting (Outpatient / HH / SNF / Hospital / Other): ',
      'Experience (경력 연수): ',
      'Employment (W-2 / 1099 / PRN): ',
      'Pay (시급 / 방문당 / 연봉, 세전 기준): ',
      'Benefits / Bonus (선택): ',
      'Additional notes (선택): '
    ].join('\n');
  }
});$('replyForm').onsubmit=reply;$('backBtn').onclick=renderTopics;$('search').oninput=renderTopics;$('filter').onchange=renderTopics;$('logoutBtn').onclick=logout;$('accountLogout').onclick=logout;
await refresh();db.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(refresh,0)});}
init().catch(e=>status('오류: '+errorMessage(e),true));
})();
