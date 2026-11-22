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
async function loadTopics(){if(!isMember)return;const [r]=await Promise.all([db.from('pta_topics').select('id,author_id,category,title,body,created_at,is_hidden,is_deleted,edited_at').order('created_at',{ascending:false}),loadMemberNames()]);if(r.error){status('토론을 불러올 수 없습니다: '+errorMessage(r.error),true);return;}topics=r.data||[];renderTopics();}
function renderTopics(){
  activeTopic=null;
  show('detail',false);$('topics').classList.remove('hidden');
  const root=$('topics'),q=$('search').value.toLowerCase().trim(),cat=$('filter').value;
  root.replaceChildren();
  const selected=topics.filter(t=>(isAdmin||(!t.is_hidden&&!t.is_deleted))&&(!cat||t.category===cat)&&(!q||`${t.title} ${t.body}`.toLowerCase().includes(q)));
  if(!selected.length){root.append(make('p','meta','아직 게시글이 없거나 검색 결과가 없습니다.'));return;}
  for(const x of selected){
    const wrapper=make('div','topic-entry'+(x.is_hidden?' topic-hidden':''));
    const b=make('button','topic');b.type='button';
    const category=make('span','eyebrow',x.category+(x.is_deleted?' · Deleted / 삭제됨':x.is_hidden?' · Hidden / 숨김':''));
    b.append(category,make('strong','',x.title),make('span','meta',`${displayName(x.author_id)} · ${niceDate(x.created_at)}${x.edited_at?' · (Edited)':''}`));
    b.onclick=()=>openTopic(x);wrapper.append(b);
    if(isAdmin&&!x.is_deleted)wrapper.append(topicVisibilityButton(x));
    if(isAdmin&&x.is_deleted)wrapper.append(topicRestoreButton(x));
    if(x.author_id===user?.id&&!x.is_deleted)wrapper.append(topicOwnerActions(x));
    root.append(wrapper);
  }
}
function topicVisibilityButton(topic){
  const b=button(topic.is_hidden?'Unhide / 다시 공개':'Hide / 숨기기',()=>setTopicVisibility(topic,!topic.is_hidden));
  b.className='topic-visibility-action';
  b.setAttribute('aria-label',`${topic.title}: ${topic.is_hidden?'다시 공개':'숨기기'}`);
  return b;
}
function topicOwnerActions(topic){
  const row=make('div','owner-actions');
  row.append(button('Edit / 수정',()=>editTopic(topic)),button('Delete / 삭제',()=>deleteOwnTopic(topic)));
  return row;
}
function topicRestoreButton(topic){
  const b=button('Restore / 복구',()=>restoreTopic(topic));b.className='topic-visibility-action';return b;
}
function editTopic(topic){
  if(!user||topic.author_id!==user.id||topic.is_deleted)return;
  const dialog=make('dialog','edit-topic-dialog');
  const form=make('form','stack');
  const title=make('h2','','Edit Discussion / 게시글 수정');
  const categoryLabel=make('label','','Category / 카테고리');
  const category=make('select');
  for(const name of ['General','PTA Career','PT School','Compensation & Benefits','License & Exam','Clinical Discussion','Resources']){
    const option=make('option','',name);option.value=name;category.append(option);
  }
  category.value=topic.category;categoryLabel.append(category);
  const titleLabel=make('label','','Title / 제목');const titleInput=make('input');
  titleInput.required=true;titleInput.minLength=4;titleInput.maxLength=150;titleInput.value=topic.title;titleLabel.append(titleInput);
  const bodyLabel=make('label','','Content / 내용');const body=make('textarea');
  body.required=true;body.minLength=10;body.maxLength=8000;body.rows=8;body.value=topic.body;bodyLabel.append(body);
  const actions=make('div','actions');const save=make('button','btn primary','Save Changes / 저장');save.type='submit';
  const cancel=button('Cancel / 취소',()=>dialog.close());actions.append(save,cancel);
  const note=make('p','meta');note.setAttribute('role','status');form.append(title,categoryLabel,titleLabel,bodyLabel,actions,note);
  form.onsubmit=async e=>{
    e.preventDefault();if(!form.reportValidity())return;
    const newTitle=titleInput.value.trim(),newBody=body.value.trim();
    if(newTitle.length<4||newBody.length<10){note.textContent='제목과 내용을 확인해 주세요.';return;}
    save.disabled=true;
    const r=await db.from('pta_topics').update({category:category.value,title:newTitle,body:newBody}).eq('id',topic.id).eq('author_id',user.id).eq('is_deleted',false).select('id');
    if(r.error||!r.data?.length){note.textContent='수정 실패: '+(r.error?errorMessage(r.error):'수정 권한을 확인해 주세요.');save.disabled=false;return;}
    dialog.close();status('게시글을 수정했습니다.');await loadTopics();
  };
  dialog.append(form);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
}
async function deleteOwnTopic(topic){
  if(!user||topic.author_id!==user.id||topic.is_deleted)return;
  if(!confirm('이 게시글을 삭제할까요? 회원 목록에서 사라지며 댓글도 보이지 않지만 관리자는 복구할 수 있습니다.'))return;
  const r=await db.from('pta_topics').update({is_deleted:true}).eq('id',topic.id).eq('author_id',user.id).eq('is_deleted',false);
  if(r.error){status('게시글 삭제 실패: '+errorMessage(r.error),true);return;}
  status('게시글을 삭제했습니다.');await loadTopics();
}
async function restoreTopic(topic){
  if(!isAdmin||!topic.is_deleted)return;
  if(!confirm('삭제된 게시글을 복구할까요? 기존 댓글도 다시 표시됩니다.'))return;
  const r=await db.from('pta_topics').update({is_deleted:false}).eq('id',topic.id).select('id');
  if(r.error||!r.data?.length){status('복구 실패: '+(r.error?errorMessage(r.error):'관리자 권한을 확인해 주세요.'),true);return;}
  status('게시글을 복구했습니다.');await loadTopics();
}
async function setTopicVisibility(topic,hidden){
  if(!isAdmin||!user)return;
  const question=hidden
    ? '이 게시글을 숨길까요? 일반 회원에게는 보이지 않지만 글과 댓글은 그대로 보관되며 다시 공개할 수 있습니다.'
    : '이 게시글을 다시 공개할까요? 글과 댓글이 회원들에게 다시 표시됩니다.';
  if(!confirm(question))return;
  const r=await db.from('pta_topics').update({is_hidden:hidden}).eq('id',topic.id).select('id,is_hidden').maybeSingle();
  if(r.error){status('게시글 상태 변경 실패: '+errorMessage(r.error),true);return;}
  if(!r.data){status('게시글을 변경하지 못했습니다. Supabase 관리자 권한과 SQL 정책을 확인해 주세요.',true);return;}
  topic.is_hidden=r.data.is_hidden;
  status(hidden?'게시글을 숨겼습니다. 언제든 다시 공개할 수 있습니다.':'게시글을 다시 공개했습니다.');
  if(activeTopic?.id===topic.id){
    openTopic(topic);
  }else renderTopics();
}
async function openTopic(x){
  if((x.is_hidden||x.is_deleted)&&!isAdmin){status('열람할 수 없는 게시글입니다.',true);return;}
  activeTopic=x;show('detail',true);show('replyForm',!x.is_deleted);$('topics').classList.add('hidden');
  text('detailTitle',x.title);
  text('detailMeta',`${x.category} · ${displayName(x.author_id)} · ${niceDate(x.created_at)}${x.edited_at?' · (Edited)':''}${x.is_deleted?' · Deleted / 삭제됨':x.is_hidden?' · Hidden / 숨김':''}`);
  text('detailBody',x.body);
  // Insert the moderation control without changing community.html.
  const detail=$('detail'),old=detail.querySelector('.topic-detail-visibility');if(old)old.remove();
  if(isAdmin){const action=x.is_deleted?topicRestoreButton(x):topicVisibilityButton(x);action.classList.add('topic-detail-visibility');
    const body=$('detailBody');body.insertAdjacentElement('afterend',action);}
  const prev=detail.querySelector('.topic-detail-owner');if(prev)prev.remove();
  if(user&&x.author_id===user.id&&!x.is_deleted){const actions=topicOwnerActions(x);actions.classList.add('topic-detail-owner');$('detailBody').insertAdjacentElement('afterend',actions);}
  await loadReplies();detail.scrollIntoView({behavior:'smooth',block:'start'});
}
// Replies: a top-level reply plus up to 5 nested replies.
async function loadReplies(){
  if(!activeTopic)return;
  const topicId=activeTopic.id;
  const r=await db.from('pta_replies').select('id,author_id,body,created_at,parent_id,edited_at').eq('topic_id',topicId).order('created_at',{ascending:true});
  if(!activeTopic||activeTopic.id!==topicId)return;
  const root=$('replies');root.replaceChildren();
  if(r.error){root.append(make('p','meta','답글을 불러오지 못했습니다: '+errorMessage(r.error)));return;}
  const data=r.data||[];
  if(!data.length){root.append(make('p','meta','아직 답글이 없습니다.'));return;}
  const ids=new Set(data.map(x=>x.id)), children=new Map(), seen=new Set();
  for(const item of data){
    const parent=item.parent_id&&ids.has(item.parent_id)?item.parent_id:null;
    if(!children.has(parent))children.set(parent,[]);
    children.get(parent).push(item);
  }
  function renderReply(item,target,depth){
    if(seen.has(item.id))return;
    seen.add(item.id);
    const box=make('div','reply');
    box.append(make('p','meta',`${displayName(item.author_id)} · ${niceDate(item.created_at)}${item.edited_at?' · (Edited)':''}`),make('p','prewrap',item.body));
    // Authors may edit their own replies, including nested replies.
    if(user&&item.author_id===user.id&&!activeTopic.is_deleted){
      const edit=button('Edit / 수정',()=>{});edit.className='reply-edit-action';
      const holder=make('div','reply-composer hidden');const form=make('form','stack');
      const label=make('label','','Edit Reply / 댓글 수정');const area=make('textarea');
      area.required=true;area.minLength=2;area.maxLength=4000;area.rows=3;area.value=item.body;label.append(area);
      const actions=make('div','actions');const submit=make('button','btn primary','Save / 저장');submit.type='submit';
      const cancel=button('Cancel / 취소',()=>holder.classList.add('hidden'));actions.append(submit,cancel);
      const note=make('p','meta');note.setAttribute('role','status');form.append(label,actions,note);
      form.onsubmit=async e=>{
        e.preventDefault();if(!form.reportValidity())return;
        if(area.value.trim().length<2){note.textContent='댓글은 2글자 이상이어야 합니다.';return;}
        submit.disabled=true;
        const result=await db.from('pta_replies').update({body:area.value.trim()}).eq('id',item.id).eq('author_id',user.id).eq('topic_id',topicId).select('id');
        if(result.error||!result.data?.length){note.textContent='수정 실패: '+(result.error?errorMessage(result.error):'권한을 확인해 주세요.');submit.disabled=false;return;}
        status('댓글을 수정했습니다.');await loadReplies();
      };
      holder.append(form);edit.onclick=()=>{const open=holder.classList.contains('hidden');holder.classList.toggle('hidden',!open);if(open)area.focus();};
      box.append(edit,holder);
    }
    // Only administrators get a delete control. Supabase RLS enforces this server-side.
    if(isAdmin){
      const remove=button('Delete / 삭제',async()=>{
        if(!activeTopic||activeTopic.id!==topicId)return;
        const hasChildren=(children.get(item.id)||[]).length>0;
        const question=hasChildren
          ? '이 댓글을 삭제하면 그 아래 모든 대댓글도 영구 삭제됩니다. 계속할까요?'
          : '이 댓글을 영구 삭제할까요?';
        if(!confirm(question))return;
        remove.disabled=true;
        const result=await db.from('pta_replies').delete().eq('id',item.id).eq('topic_id',topicId).select('id');
        if(result.error){status('댓글 삭제 실패: '+errorMessage(result.error),true);remove.disabled=false;return;}
        if(!result.data?.length){status('댓글이 삭제되지 않았습니다. 관리자 권한 및 Supabase 정책을 확인해 주세요.',true);remove.disabled=false;return;}
        status('댓글이 삭제되었습니다.');
        await loadReplies();
      });
      remove.className='reply-delete-action';
      box.append(remove);
    }
    if(depth<5&&!activeTopic.is_deleted){
      const action=button('Reply / 답글',()=>{});
      action.className='reply-action';
      action.setAttribute('aria-expanded','false');
      const holder=make('div','reply-composer hidden');
      const form=make('form','stack');
      const label=make('label','','Reply / 답글');
      const textarea=make('textarea');textarea.required=true;textarea.minLength=2;textarea.maxLength=4000;textarea.rows=3;
      label.append(textarea);
      const actions=make('div','actions');
      const submit=make('button','btn primary','Post Reply');submit.type='submit';
      const cancel=button('Cancel / 취소',()=>{holder.classList.add('hidden');action.setAttribute('aria-expanded','false');});
      actions.append(submit,cancel);
      const note=make('p','meta');note.setAttribute('role','status');
      form.append(label,actions,note);
      form.onsubmit=async e=>{
        e.preventDefault();if(!form.reportValidity())return;
        submit.disabled=true;note.textContent='Posting reply...';
        const err=await saveReply(textarea.value,item.id);
        if(err){note.textContent='답글 저장 실패: '+err;submit.disabled=false;return;}
        await loadReplies();
      };
      holder.append(form);
      action.onclick=()=>{const opening=holder.classList.contains('hidden');holder.classList.toggle('hidden',!opening);action.setAttribute('aria-expanded',String(opening));if(opening)textarea.focus();};
      box.append(action,holder);
    }
    target.append(box);
    if(depth<5){
      const descendants=children.get(item.id)||[];
      if(descendants.length){const nested=make('div','reply-children');for(const child of descendants)renderReply(child,nested,depth+1);box.append(nested);}
    }
  }
  for(const item of children.get(null)||[])renderReply(item,root,0);
  // Keep malformed/legacy replies visible rather than hiding them.
  for(const item of data)if(!seen.has(item.id))renderReply(item,root,0);
}
async function saveReply(body,parentId=null){
  if(!isMember||!activeTopic||!user||activeTopic.is_deleted)return '회원 권한 또는 게시글을 확인해 주세요.';
  const r=await db.from('pta_replies').insert({topic_id:activeTopic.id,author_id:user.id,body:body.trim(),parent_id:parentId});
  return r.error?errorMessage(r.error):null;
}
async function newTopic(e){e.preventDefault();if(!isMember)return;const r=await db.from('pta_topics').insert({author_id:user.id,category:$('topicCategory').value,title:$('topicTitle').value.trim(),body:$('topicBody').value.trim()});if(r.error){status('게시글 저장 실패: '+errorMessage(r.error),true);return;}$('topicDialog').close();$('topicForm').reset();status('게시글이 등록되었습니다.');await loadTopics();}
async function reply(e){e.preventDefault();if(!isMember||!activeTopic)return;
const submit=$('replyForm').querySelector('[type="submit"]');submit.disabled=true;
try{const err=await saveReply($('replyBody').value);if(err){status('답글 저장 실패: '+err,true);return;}
$('replyForm').reset();status('답글이 등록되었습니다.');await loadReplies();}
finally{submit.disabled=false;}}
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
