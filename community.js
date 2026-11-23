(()=>{'use strict';
const $=id=>document.getElementById(id), text=(id,v)=>{$(id).textContent=v??''}, show=(id,on)=>$(id).classList.toggle('hidden',!on);
const make=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x};
const button=(caption,cb,primary=false)=>{const b=make('button','btn'+(primary?' primary':''),caption);b.type='button';b.onclick=cb;return b;};
const projectURL=window.TYC_SUPABASE_URL, pubkey=window.TYC_SUPABASE_PUBLISHABLE_KEY;
const states='AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR GU VI MP AS'.split(' ');
const valid=typeof projectURL==='string'&&/^https:\/\/[\w-]+\.supabase\.co\/?$/.test(projectURL)&&typeof pubkey==='string'&&pubkey.startsWith('sb_publishable_')&&!!window.supabase?.createClient;
let db,user,isAdmin=false,isMember=false,memberRow=null,topics=[],members=new Map(),activeTopic=null,topicViewMap=new Map(),bookmarks=new Set();
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
if(isAdmin){show('adminArea',true);}
if(!isMember){if(!memberRow){show('requestArea',true);status('PTA / SPTA 가입 신청 후 관리자가 인증 자료를 검토합니다.');}
else status(memberRow.membership_status==='pending'?'가입 신청을 검토 중입니다. 승인 후 열람할 수 있어요.':'가입 신청이 승인되지 않았습니다. 관리자에게 문의해 주세요.');return;}
show('memberArea',true);status('승인된 회원 전용 공간입니다.');await loadTopics();}
function applicantTypeChanged(){
 const student=$('memberType').value==='SPTA';
 show('ptaLicenseFields',!student);show('sptaFields',student);
 $('licenseState').required=!student;
 $('studentSchool').required=student;$('studentProgram').required=student;$('studentProof').required=student;
}
async function apply(event){
 event.preventDefault();
 if(!user)return;
 const student=$('memberType').value==='SPTA',file=$('studentProof').files[0];
 const payload={
  user_id:user.id,display_name:$('displayName').value.trim(),
  legal_first_name:$('legalFirstName').value.trim(),
  legal_last_name:$('legalLastName').value.trim(),
  license_state:student?null:$('licenseState').value,
  license_number:student?null:($('licenseNumber').value.trim()||null),
  statement:$('statement').value.trim(),
  member_type:student?'SPTA':'PTA',
  student_school:student?$('studentSchool').value.trim():null,
  student_program:student?$('studentProgram').value.trim():null,
  student_proof_path:null,
  membership_status:'pending'
 };
 if(!payload.legal_first_name||!payload.legal_last_name){status('Legal Name을 입력해 주세요.',true);return;}
 if(!student&&!states.includes(payload.license_state)){status('PTA 면허 발급 주를 선택해 주세요.',true);return;}
 if(payload.display_name.length<2){status('표시 이름은 2글자 이상 입력해 주세요.',true);return;}
 if(student&&(!payload.student_school||!payload.student_program)){status('학교명과 PTA 프로그램명을 입력해 주세요.',true);return;}
 const accepted={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
 if(student&&(!file||!accepted[file.type]||!file.size||file.size>5242880)){status('SPTA 재학 증빙 PDF/JPG/PNG/WebP 파일(5MB 이하)을 첨부해 주세요.',true);return;}
 const submit=$('requestForm').querySelector('button[type=submit]');submit.disabled=true;
 let uploaded=null;
 try{
  if(student){
   uploaded=user.id+'/'+crypto.randomUUID()+'.'+accepted[file.type];
   status('학생 재학 증빙을 비공개로 업로드하고 있어요…');
   const r=await db.storage.from('tyc-student-verification').upload(uploaded,file,{contentType:file.type,cacheControl:'3600',upsert:false});
   if(r.error)throw r.error;
   payload.student_proof_path=uploaded;
  }
  const r=await db.from('pta_members').insert(payload).select('user_id');
  if(r.error)throw r.error;
  uploaded=null;
  await refresh();
 }catch(error){
  if(uploaded)await db.storage.from('tyc-student-verification').remove([uploaded]);
  status('가입 신청 실패: '+errorMessage(error),true);
 }finally{submit.disabled=false;}
}
// Member applications are managed in admin-members.html; no legacy DOM targets here.
async function loadMemberNames(){const r=await db.rpc('pta_approved_display_names');if(!r.error){members=new Map((r.data||[]).map(m=>[m.user_id,m.display_name]));}}
async function loadBookmarks(){
 bookmarks=new Set();
 if(!isMember||!user)return;
 const r=await db.from('pta_topic_bookmarks').select('topic_id').eq('user_id',user.id);
 if(r.error){status('북마크 불러오기 실패: '+errorMessage(r.error),true);return;}
 bookmarks=new Set((r.data||[]).map(x=>x.topic_id));
}
async function toggleBookmark(topic){
 if(!isMember||!user||topic.is_hidden||topic.is_deleted)return;
 const saved=bookmarks.has(topic.id);
 const r=saved
  ?await db.from('pta_topic_bookmarks').delete().eq('user_id',user.id).eq('topic_id',topic.id)
  :await db.from('pta_topic_bookmarks').insert({user_id:user.id,topic_id:topic.id});
 if(r.error){status('북마크 저장 실패: '+errorMessage(r.error),true);return;}
 if(saved)bookmarks.delete(topic.id);else bookmarks.add(topic.id);
 if(activeTopic?.id===topic.id){
  const button=$('detail').querySelector('.topic-detail-bookmark');
  if(button){button.textContent=saved?'☆ Save discussion':'★ Saved';button.setAttribute('aria-pressed',String(!saved));}
 }
 if(!$('topics').classList.contains('hidden'))renderTopics();
}
function bookmarkButton(topic,detail=false){
 const saved=bookmarks.has(topic.id);
 const b=button(saved?'★ Saved':'☆ Save',()=>toggleBookmark(topic));
 b.className='topic-bookmark'+(saved?' saved':'')+(detail?' topic-detail-bookmark':'');
 b.setAttribute('aria-pressed',String(saved));
 b.setAttribute('aria-label',(saved?'Remove saved discussion: ':'Save discussion: ')+topic.title);
 return b;
}
function categoryTabs(){
 const bar=$('community-category-tabs');if(!bar)return;
 bar.replaceChildren();
 for(const opt of $('filter').options){
  const value=opt.value;
  const b=make('button','community-category-tab'+($('filter').value===value?' active':''),value||'ALL');
  b.type='button';b.setAttribute('aria-pressed',String($('filter').value===value));
  const n=value?topics.filter(t=>t.category===value).length:topics.length;
  b.append(make('span','',String(n)));
  b.onclick=()=>{$('filter').value=value;renderTopics();};
  bar.append(b);
 }
}
async function loadTopics(){if(!isMember)return;const [r]=await Promise.all([db.from('pta_topics').select('id,author_id,category,title,body,created_at,is_hidden,is_deleted,edited_at').order('created_at',{ascending:false}),loadMemberNames()]);if(r.error){status('토론을 불러올 수 없습니다: '+errorMessage(r.error),true);return;}topics=r.data||[];await loadBookmarks();renderTopics();if(window.TYC_Views){try{topicViewMap=await window.TYC_Views.counts('community',topics.map(t=>t.id));renderTopics()}catch(error){console.warn('Community view counts unavailable',error)}}}
function topicViewBadge(x){const badge=make('span','tyc-view-count tyc-view-count-in-list',window.TYC_Views?.label(topicViewMap.get(x.id))||'👁 — views');badge.dataset.viewId=String(x.id);return badge;}
function renderTopics(){
  activeTopic=null;
  show('detail',false);$('topics').classList.remove('hidden');
  const root=$('topics'),q=$('search').value.toLowerCase().trim(),cat=$('filter').value;
  if(!root){status('게시글 목록을 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.',true);return;}
  root.replaceChildren();
  const selected=topics.filter(t=>(isAdmin||(!t.is_hidden&&!t.is_deleted))&&(!cat||t.category===cat)&&(!q||`${t.title} ${t.body}`.toLowerCase().includes(q))&&(!$('savedOnly').checked||bookmarks.has(t.id)));
  const sort=$('topicSort').value;
  selected.sort((a,b)=>sort==='oldest'?new Date(a.created_at)-new Date(b.created_at):sort==='popular'?((topicViewMap.get(b.id)||0)-(topicViewMap.get(a.id)||0))||(new Date(b.created_at)-new Date(a.created_at)):new Date(b.created_at)-new Date(a.created_at));
  categoryTabs();
  text('communityTopicCount',selected.length+' TOPICS');
  if(!selected.length){root.append(make('p','meta','아직 게시글이 없거나 검색 결과가 없습니다.'));return;}
  for(const x of selected){
    const wrapper=make('div','topic-entry'+(x.is_hidden?' topic-hidden':''));
    const b=make('button','topic');b.type='button';
    const category=make('span','eyebrow',x.category+(x.is_deleted?' · Deleted / 삭제됨':x.is_hidden?' · Hidden / 숨김':''));
    b.append(category,make('strong','',x.title),make('span','meta',`${displayName(x.author_id)} · ${niceDate(x.created_at)}${x.edited_at?' · (Edited)':''}`),topicViewBadge(x));
    b.onclick=()=>openTopic(x);wrapper.append(b);if(!x.is_deleted&&!x.is_hidden)wrapper.append(bookmarkButton(x));
    if(!x.is_deleted&&!x.is_hidden)wrapper.append(reportButton('topic',x.id));
    if(isAdmin&&!x.is_deleted)wrapper.append(topicVisibilityButton(x));
    if(isAdmin&&x.is_deleted)wrapper.append(topicRestoreButton(x));
    if(x.author_id===user?.id&&!x.is_deleted)wrapper.append(topicOwnerActions(x));
    root.append(wrapper);
  }
}
function reportButton(type,id){
  const b=button('Report / 신고',()=>reportContent(type,id));
  b.className='content-report-action';return b;
}
async function reportContent(type,id){
 if(!user||!isMember)return;
 const reason=prompt('신고 사유를 입력해 주세요. (5~500자) / Why are you reporting this content?','');
 if(reason===null)return;
 if(reason.trim().length<5||reason.trim().length>500){status('신고 사유는 5~500자로 입력해 주세요.',true);return;}
 const payload={reporter_id:user.id,reason:reason.trim(),topic_id:type==='topic'?id:null,reply_id:type==='reply'?id:null};
 const result=await db.from('pta_content_reports').insert(payload);
 status(result.error?'신고 실패: '+errorMessage(result.error):'신고가 접수되었습니다. / Report submitted.',!!result.error);
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
  for(const name of ['General','PTA Career','PT/PTA School','Compensation & Benefits','License & Exam','Clinical Discussion','Resources']){
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
  const r=await db.rpc('pta_delete_own_topic',{p_topic_id:topic.id});
  if(r.error||r.data!==true){status('게시글 삭제 실패: '+(r.error?errorMessage(r.error):'작성자 및 회원 권한을 확인해 주세요.'),true);return;}
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
  text('detailBody',x.body);const priorBookmark=$('detail').querySelector('.topic-detail-bookmark');if(priorBookmark)priorBookmark.remove();if(!x.is_hidden&&!x.is_deleted){$('detailMeta').insertAdjacentElement('afterend',bookmarkButton(x,true));}let viewEl=$('detail').querySelector('.tyc-topic-detail-views');if(!viewEl){viewEl=make('span','tyc-view-count tyc-view-count-detail tyc-topic-detail-views');$('detailMeta').insertAdjacentElement('afterend',viewEl)}viewEl.textContent=window.TYC_Views?.label(topicViewMap.get(x.id))||'👁 — views';if(window.TYC_Views)window.TYC_Views.record('community',x.id).then(n=>{if(n!==null){topicViewMap.set(x.id,n);if(activeTopic?.id===x.id)viewEl.textContent=window.TYC_Views.label(n)}});
  // Insert the moderation control without changing community.html.
  const detail=$('detail'),old=detail.querySelector('.topic-detail-visibility');if(old)old.remove();const oldReport=detail.querySelector('.topic-detail-report');if(oldReport)oldReport.remove();
  if(!x.is_hidden&&!x.is_deleted){const report=reportButton('topic',x.id);report.classList.add('topic-detail-report');$('detailBody').insertAdjacentElement('afterend',report);}
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
  const r=await db.from('pta_replies').select('id,author_id,body,created_at,parent_id,edited_at,is_hidden').eq('topic_id',topicId).order('created_at',{ascending:true});
  if(!activeTopic||activeTopic.id!==topicId)return;
  const root=$('replies');if(!root){status('댓글 영역을 찾지 못했습니다. 페이지를 새로고침해 주세요.',true);return;}root.replaceChildren();
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
    box.append(make('p','meta',`${displayName(item.author_id)} · ${niceDate(item.created_at)}${item.edited_at?' · (Edited)':''}`),make('p','prewrap',item.is_hidden?'This reply is hidden by a moderator. / 관리자가 숨긴 댓글입니다.':item.body));
    if(!item.is_hidden&&!activeTopic.is_deleted)box.append(reportButton('reply',item.id));
    if(item.is_hidden&&!isAdmin)return;
    // Authors may edit their own replies, including nested replies.
    if(user&&item.author_id===user.id&&!activeTopic.is_deleted&&!item.is_hidden){
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
    if(depth<5&&!activeTopic.is_deleted&&!item.is_hidden){
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
$('memberType').onchange=applicantTypeChanged;applicantTypeChanged();$('requestForm').onsubmit=apply;$('composeBtn').onclick=()=>$('topicDialog').showModal();$('topicForm').onsubmit=newTopic;
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
});$('replyForm').onsubmit=reply;$('backBtn').onclick=renderTopics;$('search').oninput=renderTopics;$('filter').onchange=renderTopics;$('topicSort').onchange=renderTopics;$('savedOnly').onchange=renderTopics;$('logoutBtn').onclick=logout;$('accountLogout').onclick=logout;
await refresh();db.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(refresh,0)});}
init().catch(e=>status('오류: '+errorMessage(e),true));
})();
