(()=>{'use strict';
const $=id=>document.getElementById(id), text=(id,v)=>{$(id).textContent=v??''}, show=(id,on)=>$(id).classList.toggle('hidden',!on);
const make=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x};
const button=(caption,cb,primary=false)=>{const b=make('button','btn'+(primary?' primary':''),caption);b.type='button';b.onclick=cb;return b;};
const projectURL=window.TYC_SUPABASE_URL, pubkey=window.TYC_SUPABASE_PUBLISHABLE_KEY;
const states='AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR GU VI MP AS'.split(' ');
const stateNames={
 AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',
 GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
 MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',
 NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',
 RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
 WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',PR:'Puerto Rico',GU:'Guam',VI:'U.S. Virgin Islands',MP:'Northern Mariana Islands',AS:'American Samoa'
};
const valid=typeof projectURL==='string'&&/^https:\/\/[\w-]+\.supabase\.co\/?$/.test(projectURL)&&typeof pubkey==='string'&&pubkey.startsWith('sb_publishable_')&&!!window.supabase?.createClient;
let composeRich=null;let db,user,isAdmin=false,isMember=false,memberRow=null,topics=[],members=new Map(),verifiedMemberRoles=new Map(),verifiedMemberYears=new Map(),activeTopic=null,topicViewMap=new Map(),replyCountMap=new Map(),bookmarks=new Set(),weeklyStats=new Map(),likeBusy=new Set();
function status(m,err=false){
 const target=$('message');
 target.classList.remove('community-email-confirmation');
 target.replaceChildren();
 target.classList.toggle('error',err);
 text('message',m);
}
function errorMessage(e){return e?.message||'요청을 처리하지 못했습니다.'}
function niceDate(d){return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
// Treat the discussion list and individual topics as separate browser-history entries.
// The initial community URL remains in the stack, so Safari/Chrome Back returns to
// the forum instead of immediately leaving for the previous Admin page.
function topicRouteUrl(id){
 const url=new URL(location.href);
 if(id)url.searchParams.set('topic',id);
 else url.searchParams.delete('topic');
 return url.pathname+url.search+url.hash;
}
function pushTopicRoute(id){
 const current=new URLSearchParams(location.search).get('topic');
 if(current===id)return;
 history.pushState({...(history.state&&typeof history.state==='object'?history.state:{}),tycCommunityTopic:id},'',topicRouteUrl(id));
}
function clearTopicRoute(){
 if(!new URLSearchParams(location.search).has('topic'))return;
 // An in-page "All topics" action always shows the list, including direct deep links.
 // Replacing the current URL avoids leaving a stale ?topic= value on refresh.
 history.replaceState({...((history.state&&typeof history.state==='object')?history.state:{}),tycCommunityTopic:null},'',topicRouteUrl(null));
}
function newPostBadge(createdAt){
 const created=Date.parse(createdAt),elapsed=Date.now()-created,day=24*60*60*1000;
 if(!Number.isFinite(created)||elapsed<0||elapsed>=day)return null;
 const badge=make('span','community-new-badge','NEW');
 badge.setAttribute('aria-label','New discussion posted within the last 24 hours');
 badge.dataset.expiry=String(created+day);
 // Remove the badge at exactly 24 hours without requiring a page refresh.
 setTimeout(()=>{if(badge.isConnected)badge.remove();},day-elapsed+25);
 return badge;
}
function displayName(id){return members.get(id)||'PTA Member'}
function verifiedBadge(id){
 const role=verifiedMemberRoles.get(id);
 if(role!=='PTA'&&role!=='SPTA')return null;
 const badge=make('span','community-verified-role'+(role==='SPTA'?' is-spta':''),'✓ VERIFIED '+role);
 badge.setAttribute('aria-label','Verified '+(role==='PTA'?'Physical Therapist Assistant':'Physical Therapist Assistant student'));
 // SPTA never receives a license-experience number.
 if(role==='SPTA')return badge;
 const years=verifiedMemberYears.get(id);
 if(!Number.isInteger(years)||years<1||years>100)return badge;
 const tier=years<=3?'green':years<=9?'gold':'red';
 const group=make('span','community-verified-with-years');
 const number=make('span','community-pta-exp-badge exp-'+tier);
 const digit=make('span','community-pta-exp-digit',String(years));
 digit.setAttribute('aria-hidden','true');
 number.setAttribute('role','img');
 number.setAttribute('aria-label','PTA 면허 발급 기준 '+years+'년차');
 number.title='Verified PTA · '+years+'년차 (since initial license)';
 number.append(digit);
 group.append(badge,number);
 return group;
}
async function logout(){const {error}=await db.auth.signOut();if(error){status(errorMessage(error),true);return;}await refresh();}
async function refresh(){const heroApproved=$('communityHeroStatus');if(heroApproved)heroApproved.hidden=true;const res=await db.auth.getUser();user=res.data?.user||null;isAdmin=false;isMember=false;memberRow=null;show('loginArea',!user);show('requestArea',false);show('verifyArea',false);show('memberArea',false);show('accountArea',!!user);if(!user){weeklyStats=new Map();replyCountMap=new Map();topics=[];status('비공개 커뮤니티입니다. 로그인한 승인 회원만 글을 볼 수 있습니다.');return;}
text('identity',`Signed in: ${user.email}`);
const [a,m]=await Promise.all([db.rpc('tyc_has_staff_scope',{p_scope:'community'}),db.from('pta_members').select('user_id,display_name,membership_status').eq('user_id',user.id).maybeSingle()]);
if(a.error||m.error){status('회원 정보를 조회할 수 없습니다. 관리자에게 문의해 주세요.',true);return;}
isAdmin=!!a.data;memberRow=m.data;isMember=isAdmin||m.data?.membership_status==='approved';
$('message').classList.toggle('community-review-pending',!isMember&&memberRow?.membership_status==='pending');
$('topicNoticeArea').hidden=!isAdmin;if(!isAdmin)$('topicIsNotice').checked=false;

if(!isMember){if(!memberRow){show('verifyArea',true);status('PTA 또는 SPTA를 선택해 회원 인증을 시작해 주세요. / Choose your member type to get verified.');}
else status(memberRow.membership_status==='pending'?'가입 신청을 검토 중입니다. 승인 후 열람할 수 있어요.':'가입 신청이 승인되지 않았습니다. 관리자에게 문의해 주세요.');return;}
show('memberArea',true);if(heroApproved)heroApproved.hidden=false;status('');await loadTopics();}
let proofPreviewUrl=null;
function proofFileChanged(){
 const file=$('studentProof').files[0],preview=$('studentProofPreview');
 if(proofPreviewUrl){URL.revokeObjectURL(proofPreviewUrl);proofPreviewUrl=null;}
 preview.hidden=true;preview.removeAttribute('src');
 $('studentProofSelected').textContent=file?'Selected / 선택한 파일: '+file.name+' · '+(file.size/1048576).toFixed(2)+' MB':'No file selected / 첨부된 파일 없음';
 if(file&&['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size<=5242880){
  proofPreviewUrl=URL.createObjectURL(file);preview.src=proofPreviewUrl;preview.hidden=false;
 }
}
function applicantTypeChanged(){
 const student=$('memberType').value==='SPTA';
 show('ptaLicenseFields',!student);show('sptaFields',student);
 $('licenseState').required=!student;$('studentState').required=student;
 $('studentSchool').required=student;$('studentProgram').required=student;$('studentProof').required=student;
}
let confirmedNickname='';
function clearNicknameCheck(){
 confirmedNickname='';
 const el=$('nicknameCheckStatus');if(el){el.textContent='Check nickname availability before applying. / 중복 확인을 해주세요.';el.classList.remove('nickname-available','nickname-taken');}
}
async function checkNickname(){
 if(!user){status('Please log in first.',true);return false;}
 const name=$('displayName').value.trim(),message=$('nicknameCheckStatus'),button=$('checkNickname');
 confirmedNickname='';
 if(name.length<2||name.length>40){message.textContent='Nickname must be 2–40 characters. / 닉네임은 2~40자여야 합니다.';message.classList.add('nickname-taken');return false;}
 if(!isAdmin&&window.TYC_NicknameRules?.isReserved(name)){
  message.textContent=window.TYC_NicknameRules.message;
  message.classList.add('nickname-taken');message.classList.remove('nickname-available');return false;
 }
 button.disabled=true;message.textContent='Checking nickname…';
 try{
  const r=await db.rpc('tyc_nickname_available',{p_nickname:name});
  if(r.error)throw r.error;
  if($('displayName').value.trim()!==name){clearNicknameCheck();return false;}
  if(r.data===true){confirmedNickname=name;message.textContent='✓ Available nickname / 사용 가능한 닉네임입니다.';message.classList.add('nickname-available');message.classList.remove('nickname-taken');return true;}
  message.textContent='This nickname is already in use. / 이미 사용 중인 닉네임입니다.';message.classList.add('nickname-taken');message.classList.remove('nickname-available');return false;
 }catch(e){message.textContent='Unable to check nickname: '+errorMessage(e);message.classList.add('nickname-taken');return false;}
 finally{button.disabled=false;}
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
  student_state:student?$('studentState').value:null,
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
 if(student&&!states.includes(payload.student_state)){status('현재 거주하는 주(State)를 선택해 주세요. / Select your current state.',true);$('studentState').focus();return;}
 if(payload.display_name.length<2||payload.display_name.length>40){status('Nickname must be 2–40 characters.',true);return;}
 if(!isAdmin&&window.TYC_NicknameRules?.isReserved(payload.display_name)){status(window.TYC_NicknameRules.message,true);return;}
 if(confirmedNickname!==payload.display_name && !(await checkNickname())){status('Please choose an available nickname first. / 닉네임 중복 확인을 해주세요.',true);return;}
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
async function loadMemberNames(){
 // Both member-only RPCs are authorized by the database. Load in parallel
 // so the name, verification pill, and year number appear in one render.
 const [r,years]=await Promise.all([
  db.rpc('tyc_constellation_members'),
  db.rpc('tyc_pta_experience_badges')
 ]);
 verifiedMemberYears=!years.error&&Array.isArray(years.data)
  ?new Map(years.data.filter(m=>Number.isInteger(m.years_of_practice)&&m.years_of_practice>=1)
    .map(m=>[m.member_id,m.years_of_practice]))
  :new Map();
 if(!r.error&&Array.isArray(r.data)){
  members=new Map(r.data.map(m=>[m.member_id,m.nickname]));
  verifiedMemberRoles=new Map(r.data.map(m=>[m.member_id,m.member_role]));
  return;
 }
 verifiedMemberRoles=new Map();
 verifiedMemberYears=new Map();
 const fallback=await db.rpc('pta_approved_display_names');
 if(!fallback.error)members=new Map((fallback.data||[]).map(m=>[m.user_id,m.display_name]));
}
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

/* Current calendar week in Los Angeles resets each Monday at midnight.
   Database handles authoritative counts and automatic 30-day honors. */
const weekly=(id)=>weeklyStats.get(id)||{week_likes:0,total_likes:0,week_views:0,hall_until:null,liked_by_me:false};
const honorActive=id=>{const until=weekly(id).hall_until;return !!until&&new Date(until).getTime()>Date.now();};
function communityWeekKey(){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
 const day=new Date(Date.UTC(parts.year,parts.month-1,parts.day));
 day.setUTCDate(day.getUTCDate()-((day.getUTCDay()+6)%7));
 return day.toISOString().slice(0,10);
}
let lastCommunityWeek=communityWeekKey();
async function refreshWeekIfNeeded(){
 const current=communityWeekKey();
 if(!isMember||current===lastCommunityWeek)return;
 lastCommunityWeek=current;
 await loadWeeklyStats();
 if(!$('topics').classList.contains('hidden'))renderTopics();
}
async function loadWeeklyStats(){
 if(!isMember)return;
 const r=await db.rpc('pta_community_weekly_stats');
 if(r.error){console.warn('Weekly rankings unavailable:',r.error.message);status('이번 주 인기글 순위를 불러오지 못했습니다: '+errorMessage(r.error),true);return;}
 weeklyStats=new Map((r.data||[]).map(x=>[x.topic_id,x]));
}
async function toggleLike(topic){
 if(!user||!isMember||topic.is_hidden||topic.is_deleted||likeBusy.has(topic.id))return;
 likeBusy.add(topic.id);
 const was=!!weekly(topic.id).liked_by_me;
 const r=was?await db.from('pta_topic_likes').delete().eq('topic_id',topic.id).eq('user_id',user.id)
            :await db.from('pta_topic_likes').insert({topic_id:topic.id,user_id:user.id});
 if(r.error){status('좋아요 처리 실패: '+errorMessage(r.error),true);likeBusy.delete(topic.id);return;}
 await loadWeeklyStats();likeBusy.delete(topic.id);
 if(activeTopic?.id===topic.id){const old=$('detail').querySelector('.topic-detail-like');if(old)old.replaceWith(likeButton(topic,true));}
 else renderTopics();
}
function likeButton(topic,detail=false){
 const x=weekly(topic.id),liked=!!x.liked_by_me;
 const b=button((liked?'♥':'♡')+' '+Number(x.total_likes||0),()=>toggleLike(topic));
 b.className='topic-like'+(liked?' is-liked':'')+(detail?' topic-detail-like':'');
 b.setAttribute('aria-pressed',String(liked));
 b.setAttribute('aria-label',(liked?'Unlike ':'Like ')+topic.title+'; '+Number(x.total_likes||0)+' likes');
 return b;
}
function weeklyBadge(topic){
 const x=weekly(topic.id),line=make('span','community-weekly-stats');
 line.append(make('span','','👁 '+Number(x.week_views||0)+' this week'));
 line.append(make('span','','♥ '+Number(x.week_likes||0)+' this week'));
 return line;
}
function honorBadge(topic){
 if(!honorActive(topic.id))return null;
 const until=new Date(weekly(topic.id).hall_until).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
 const label=make('span','community-hall-badge','🏆 HALL OF FAME · PINNED UNTIL '+until);
 return label;
}
function categoryTabs(){
 const bar=$('community-category-tabs');if(!bar)return;
 // Separate mobile swipe rows; desktop preserves the original flex-wrap layout.
 const previousCategories=bar.querySelector('.community-mobile-category-strip')?.scrollLeft||0;
 const previousRanking=bar.querySelector('.community-mobile-ranking-strip')?.scrollLeft||0;
 bar.replaceChildren();
 const categoryStrip=make('div','community-mobile-category-strip');
 const rankingStrip=make('div','community-mobile-ranking-strip');
 categoryStrip.setAttribute('role','group');categoryStrip.setAttribute('aria-label','Discussion categories');
 rankingStrip.setAttribute('role','group');rankingStrip.setAttribute('aria-label','Weekly rankings');
 bar.append(categoryStrip,rankingStrip);
 const currentSort=$('topicSort').value,currentCategory=$('filter').value;
 const visible=topics.filter(t=>isAdmin||(!t.is_hidden&&!t.is_deleted));
 for(const opt of $('filter').options){
  const value=opt.value;
  const active=currentCategory===value&&(value!==''||!['popular','liked','hall'].includes(currentSort));
  const b=make('button','community-category-tab'+(active?' active':''),value||'ALL');
  b.type='button';b.setAttribute('aria-pressed',String(active));
  const n=value?visible.filter(t=>t.category===value).length:visible.length;
  b.append(make('span','',String(n)));
  b.onclick=()=>{$('filter').value=value;$('topicSort').value='newest';renderTopics();};
  categoryStrip.append(b);
 }
 const separator=make('span','community-ranking-divider');separator.setAttribute('aria-hidden','true');rankingStrip.append(separator);
 const specials=[
  {id:'popular',name:'👁 WEEKLY TOP VIEWS',count:visible.filter(t=>Number(weekly(t.id).week_views||0)>0).length},
  {id:'liked',name:'♥ WEEKLY TOP LIKES',count:visible.filter(t=>Number(weekly(t.id).week_likes||0)>0).length},
  {id:'hall',name:'🏆 HALL OF FAME',count:visible.filter(t=>honorActive(t.id)).length}
 ];
 for(const item of specials){
  const active=currentSort===item.id&&currentCategory==='';
  const b=make('button','community-category-tab community-ranking-tab'+(active?' active':'') ,item.name);
  b.type='button';b.setAttribute('aria-pressed',String(active));
  b.setAttribute('aria-label',item.name+'; '+item.count+' qualifying discussions');
  b.append(make('span','',String(item.count)));
  b.onclick=()=>{$('filter').value='';$('topicSort').value=item.id;renderTopics();};
  rankingStrip.append(b);
 }
 categoryStrip.scrollLeft=previousCategories;
 rankingStrip.scrollLeft=previousRanking;
}
async function loadReplyCounts(){
  try{
    const {data,error}=await db.rpc('tyc_community_reply_counts');
    if(error)throw error;
    replyCountMap=new Map((data||[]).map(row=>[row.topic_id,Number(row.reply_count)||0]));
  }catch(error){
    console.warn('Community reply counts unavailable',error);
    replyCountMap=new Map();
  }
}
async function loadTopics(){if(!isMember)return;const [r]=await Promise.all([db.from('pta_topics').select('id,author_id,category,title,body,created_at,is_hidden,is_deleted,edited_at,post_number,is_notice,is_exam_pass,show_siren_badge,public_preview_enabled,public_preview_text').order('created_at',{ascending:false}),loadMemberNames()]);if(r.error){status('토론을 불러올 수 없습니다: '+errorMessage(r.error),true);return;}topics=r.data||[];await Promise.all([loadBookmarks(),loadWeeklyStats(),loadReplyCounts()]);renderTopics();
if(window.TYC_Views){try{topicViewMap=await window.TYC_Views.counts('community',topics.map(t=>t.id));renderTopics()}catch(error){console.warn('Community view counts unavailable',error)}}
const deepId=new URLSearchParams(location.search).get('topic');
if(deepId&&/^[0-9a-f-]{36}$/i.test(deepId)){
 const match=topics.find(t=>t.id===deepId&&!t.is_deleted&&!t.is_hidden);
 if(match)await openTopic(match);
}}
function adminNoticeBadge(){
 const badge=make('span','community-admin-notice-badge','🚨');
 badge.setAttribute('aria-label','Flashing announcement siren / 공지 사이렌');
 return badge;
}
function examPassBadge(){
 const badge=make('span','community-exam-pass-badge','PASS');
 badge.setAttribute('aria-label','Board exam passed · PASS');
 return badge;
}
function examBadgeSelector(input,checked=false){
 const wrap=make('label','community-exam-pass-option');
 const box=make('input');box.type='checkbox';box.checked=!!checked;
 const caption=make('span','community-exam-pass-option-copy');
 caption.append(examPassBadge(),make('span','','보드시험 합격 자랑하기 · Show off your board exam PASS!'));
 wrap.append(box,caption);
 return {wrap,box};
}
function topicViewBadge(x){const badge=make('span','tyc-view-count tyc-view-count-in-list',window.TYC_Views?.label(topicViewMap.get(x.id))||'👁 — views');badge.dataset.viewId=String(x.id);return badge;}
function displayCommunityTitle(title){return String(title||'').replace(/\*\*/g,'').trim();}
function renderTopics(){
  activeTopic=null;
  show('detail',false);$('topics').classList.remove('hidden');
  $('topics').closest('.community-discussions')?.classList.remove('community-reading-mode');
  const root=$('topics'),q=$('search').value.toLowerCase().trim(),cat=$('filter').value;
  if(!root){status('게시글 목록을 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.',true);return;}
  root.replaceChildren();
  const selected=topics.filter(t=>(isAdmin||(!t.is_hidden&&!t.is_deleted))&&(!cat||t.category===cat)&&(!q||`${t.title} ${t.body}`.toLowerCase().includes(q))&&(!$('savedOnly').checked||bookmarks.has(t.id)));
  const sort=$('topicSort').value;
  if(sort==='hall')selected.splice(0,selected.length,...selected.filter(t=>t.is_notice||honorActive(t.id)));
 selected.sort((a,b)=>{
  if(!!a.is_notice!==!!b.is_notice)return a.is_notice?-1:1;
  if(a.is_notice&&b.is_notice)return new Date(b.created_at)-new Date(a.created_at);
  if(sort!=='hall'&&honorActive(a.id)!==honorActive(b.id))return honorActive(a.id)?-1:1;
  if(sort==='oldest')return new Date(a.created_at)-new Date(b.created_at);
  if(sort==='popular')return Number(weekly(b.id).week_views||0)-Number(weekly(a.id).week_views||0)||new Date(b.created_at)-new Date(a.created_at);
  if(sort==='liked')return Number(weekly(b.id).week_likes||0)-Number(weekly(a.id).week_likes||0)||new Date(b.created_at)-new Date(a.created_at);
  if(sort==='hall')return new Date(weekly(b.id).hall_until)-new Date(weekly(a.id).hall_until);
  return new Date(b.created_at)-new Date(a.created_at);
 });
  categoryTabs();
  text('communityTopicCount',selected.length+' TOPICS');
  if(!selected.length){root.append(make('p','meta','아직 게시글이 없거나 검색 결과가 없습니다.'));return;}
  const heading=make('div','community-board-head');
  for(const label of ['NO.','CATEGORY','DISCUSSION','ID / NAME','POSTED','VIEWS','LIKES'])heading.append(make('span','',label));
  const saveHeading=make('span','community-board-save-heading');
  saveHeading.append(make('span','','SAVE'));
  heading.append(saveHeading);
  root.append(heading);
  for(const x of selected){
    const wrapper=make('article','topic-entry community-board-row'+(x.is_hidden?' topic-hidden':'')+(honorActive(x.id)?' community-honored-topic':'')+(x.is_notice?' community-notice-row':''));wrapper.dataset.topicId=x.id;
    const postNumber=make('span','community-board-number'+(x.is_notice?' is-notice':''),x.is_notice?'NOTICE':String(x.post_number??'—'));
    const category=make('span','community-board-category',x.category+(x.is_deleted?' · Deleted':x.is_hidden?' · Hidden':''));
    const b=make('button','topic community-board-title');b.type='button';b.onclick=()=>openTopic(x,true);
    if(honorActive(x.id))b.append(honorBadge(x));
    const headingText=make('span','community-board-title-line');
    // Reserve the same siren-sized space for every topic so all titles align.
    // Only opted-in official notices display an actual flashing siren.
    const sirenSlot=make('span','community-siren-slot');
    if(x.is_notice && x.show_siren_badge)sirenSlot.append(adminNoticeBadge());
    else sirenSlot.setAttribute('aria-hidden','true');
    headingText.append(sirenSlot);
    if(x.is_exam_pass && x.category==='License & Exam')headingText.append(examPassBadge());
    headingText.append(make('strong','',displayCommunityTitle(x.title)));
    const freshBadge=newPostBadge(x.created_at);
    if(freshBadge)headingText.append(freshBadge);
    const replies=Number(replyCountMap.get(x.id)||0);
    if(replies>0){
      const badge=make('span','community-reply-count','[ '+replies.toLocaleString('en-US')+' ]');
      badge.setAttribute('aria-label',replies+' replies including nested replies');
      headingText.append(badge);
    }
    if(isAdmin&&x.edited_at)headingText.append(make('small','community-board-edited','Edited'));
    b.append(headingText);
    // A plain-text excerpt only: never interpret user-authored HTML in a hover preview.
    const excerpt=window.TYC_CommunityRich.plain(x.body).replace(/\s+/g,' ').trim();
    if(excerpt||String(x.body).includes('data-tyc-path')){
      const preview=make('span','community-board-preview');
      preview.setAttribute('role','tooltip');
      preview.append(make('span','community-board-preview-label','DISCUSSION PREVIEW'));
      window.TYC_CommunityRich.preview(preview,x.body,db);
      preview.append(make('span','community-board-preview-foot','Click to read the full discussion & replies'));
      b.append(preview);
    }
    const author=make('span','community-board-author');const authorName=make('span','',displayName(x.author_id));if(!x.is_deleted){authorName.dataset.tycMember=x.author_id;authorName.tabIndex=0;authorName.setAttribute('role','button');}author.append(authorName);
    const listBadge=verifiedBadge(x.author_id);
    if(listBadge)author.append(' ',listBadge);
    const posted=make('time','community-board-date',niceDate(x.created_at));posted.dateTime=x.created_at;
    const views=make('div','community-board-views');
    const totalViews=topicViewMap.get(x.id);
    const viewMain=make('span','community-board-metric',totalViews==null?'—':Number(totalViews).toLocaleString('en-US'));
    viewMain.setAttribute('aria-label',(totalViews??'Unknown')+' total views');
    views.append(viewMain);
    const likes=make('div','community-board-likes');
    if(!x.is_hidden&&!x.is_deleted){
      likes.append(likeButton(x));
    }else likes.append(make('span','community-board-metric','—'));
    const controls=make('div','community-board-controls');
    if(!x.is_deleted&&!x.is_hidden){
      const save=bookmarkButton(x);
      save.classList.add('community-board-save');
      save.textContent=bookmarks.has(x.id)?'★':'☆';
      save.title=bookmarks.has(x.id)?'Remove saved discussion / 저장 해제':'Save discussion / 저장';
      controls.append(save);
    }
    const actions=make('details','community-board-actions');
    const toggle=make('summary','','⋯');toggle.setAttribute('aria-label','More actions for '+x.title);
    toggle.setAttribute('title','More actions / 설정');
    const panel=make('div','community-board-menu');
    if(!x.is_deleted&&!x.is_hidden)panel.append(reportButton('topic',x.id));
    if(isAdmin&&!x.is_deleted){panel.append(noticeActionButton(x));if(x.is_notice)panel.append(sirenActionButton(x));panel.append(topicVisibilityButton(x));}
    if(isAdmin&&x.is_deleted)panel.append(topicRestoreButton(x),topicPermanentDeleteButton(x));
    if(!x.is_deleted&&(isAdmin||x.author_id===user?.id))panel.append(topicOwnerActions(x));
    actions.append(toggle,panel);
    controls.append(actions);
    wrapper.append(postNumber,category,b,author,posted,views,likes,controls);
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
function sirenActionButton(topic){
 const enabled=!!topic.show_siren_badge;
 const b=button(enabled?'🚨 Remove Siren / 사이렌 해제':'🚨 Add Siren / 사이렌 추가',()=>setTopicSiren(topic,!enabled));
 b.className='topic-notice-action';
 return b;
}
async function setTopicSiren(topic,enabled){
 if(!isAdmin||!user||topic.is_deleted||!topic.is_notice)return;
 const r=await db.from('pta_topics').update({show_siren_badge:enabled}).eq('id',topic.id).select('id,show_siren_badge').maybeSingle();
 if(r.error||!r.data){status('사이렌 변경 실패: '+(r.error?errorMessage(r.error):'관리자 권한을 확인해 주세요.'),true);return;}
 topic.show_siren_badge=r.data.show_siren_badge;
 status(enabled?'사이렌 배지를 적용했습니다.':'사이렌 배지를 해제했습니다.');
 if(activeTopic?.id===topic.id)openTopic(topic);else renderTopics();
}
function noticeActionButton(topic){
 const b=button(topic.is_notice?'Remove Notice / 공지 해제':'Set as Notice / 공지 지정',()=>setTopicNotice(topic,!topic.is_notice));
 b.className='topic-notice-action';
 b.setAttribute('aria-label',topic.title+': '+(topic.is_notice?'Remove notice status':'Make an announcement'));
 return b;
}
async function setTopicNotice(topic,makeNotice){
 if(!user||!isAdmin||topic.is_deleted)return;
 const label=makeNotice?'Pin this post as an official notice?':'Remove notice status from this post?';
 if(!confirm(label))return;
 const r=await db.from('pta_topics').update({is_notice:makeNotice,show_siren_badge:makeNotice?!!topic.show_siren_badge:false}).eq('id',topic.id).select('id,is_notice,show_siren_badge').maybeSingle();
 if(r.error||!r.data){status('Notice update failed: '+(r.error?errorMessage(r.error):'Check administrator permissions'),true);return;}
 topic.is_notice=r.data.is_notice;
 topic.show_siren_badge=r.data.show_siren_badge;
 status(makeNotice?'Official notice published.':'Notice status removed.');
 if(activeTopic?.id===topic.id)openTopic(topic);else renderTopics();
}
function topicVisibilityButton(topic){
  const b=button(topic.is_hidden?'Unhide / 다시 공개':'Hide / 숨기기',()=>setTopicVisibility(topic,!topic.is_hidden));
  b.className='topic-visibility-action';
  b.setAttribute('aria-label',`${topic.title}: ${topic.is_hidden?'다시 공개':'숨기기'}`);
  return b;
}
function topicOwnerActions(topic){
  const row=make('div','owner-actions');
  if(topic.author_id===user?.id){
   const edit=button('Edit / 수정',()=>editTopic(topic));
   edit.classList.add('topic-edit-action');row.append(edit);
  }
  if(isAdmin||topic.author_id===user?.id){
   const remove=button(isAdmin&&topic.author_id!==user?.id
    ?'Delete post / 관리자 삭제':'Delete / 삭제',()=>deleteTopic(topic));
   remove.classList.add('topic-delete-action');
   remove.setAttribute('aria-label','Delete discussion '+topic.title);
   row.append(remove);
  }
  return row;
}
function topicRestoreButton(topic){
  const b=button('Restore / 복구',()=>restoreTopic(topic));b.className='topic-visibility-action';return b;
}
function topicPermanentDeleteButton(topic){
  const b=button('Permanently Delete / 영구 삭제',()=>permanentlyDeleteTopic(topic));
  b.className='topic-permanent-delete-action';
  b.setAttribute('aria-label','Permanently delete '+topic.title);
  return b;
}
async function permanentlyDeleteTopic(topic){
  if(!isAdmin||!user||!topic?.is_deleted)return;
  const warning='Permanently delete post #'+topic.post_number+'?\\n\\n'+topic.title+'\\n\\nThis also removes all associated replies, likes, bookmarks, reports and view history. It CANNOT be undone.';
  if(!confirm(warning))return;
  const typed=prompt('FINAL CONFIRMATION: Type DELETE to permanently remove this post and its related data.');
  if(typed!=='DELETE'){if(typed!==null)status('Permanent deletion cancelled: confirmation did not match.');return;}
  const r=await db.rpc('pta_permanently_delete_topic',{p_topic_id:topic.id});
  if(r.error||r.data!==true){status('Permanent deletion failed: '+(r.error?errorMessage(r.error):'Not removed'),true);return;}
  topics=topics.filter(t=>t.id!==topic.id);
  status('Post #'+topic.post_number+' permanently deleted.');
  await loadTopics();
}
// This excerpt is intentionally public once the author explicitly opts in.
function autoPublicPreview(body){
 const source=window.TYC_CommunityRich.plain(body);
 const clean=String(source||'').replace(/<[^>]*>/g,' ').replace(/[<>]/g,'').replace(/\*\*/g,'').replace(/\s+/g,' ').trim();
 const excerpt=Array.from(clean).slice(0,280).join('').trim();
 if(excerpt.length>=30)return excerpt;
 const fallback='PTA/SPTA 커뮤니티에 공유된 게시글입니다. 전체 내용과 댓글은 승인된 회원만 볼 수 있습니다.';
 return excerpt?excerpt+' · '+fallback:fallback;
}
function publicPreviewPayload(enabled,body){
 return {public_preview_enabled:!!enabled,public_preview_text:enabled?autoPublicPreview(body):null};
}
function createPreviewEditor(checked=false){
 const wrap=make('div','community-public-preview-editor');
 const label=make('label','community-preview-consent');
 const enabled=make('input');enabled.type='checkbox';enabled.checked=!!checked;
 label.append(enabled,make('strong','','검색 공개 미리보기 허용 / Public search preview (optional)'));
 const notice=make('p','community-public-preview-help','선택하면 게시글 앞부분 최대 280자가 미리보기로 자동 공개됩니다. 게시글 제목, 카테고리와 미리보기는 비회원·검색엔진에도 보입니다. 환자 정보·개인정보가 포함되어 있지 않은지 확인해 주세요. 전체 본문과 댓글은 승인된 회원 전용입니다. / Automatically shares the opening excerpt publicly; full post and replies remain members-only.');
 wrap.append(label,notice);
 return {wrap,enabled,payload:body=>publicPreviewPayload(enabled.checked,body)};
}
function editTopic(topic){
  if(!user||topic.author_id!==user.id||topic.is_deleted)return;
  const dialog=make('dialog','edit-topic-dialog');
  const form=make('form','stack');
  const title=make('h2','','Edit Discussion / 게시글 수정');
  const top=make('div','edit-topic-top');const topActions=make('div','edit-topic-top-actions');
  const topSave=make('button','btn primary edit-topic-top-save','Save Changes / 수정 완료');topSave.type='submit';
  const close=make('button','edit-topic-top-close','×');close.type='button';close.setAttribute('aria-label','Close editor / 닫기');close.onclick=()=>dialog.close();
  topActions.append(topSave,close);top.append(title,topActions);
  const categoryLabel=make('label','','Category / 카테고리');
  const category=make('select');
  for(const name of ['General','PTA Career','PT/PTA School','Compensation & Benefits','License & Exam','CEU','Clinical Discussion','Resources']){
    const option=make('option','',name);option.value=name;category.append(option);
  }
  category.value=topic.category;categoryLabel.append(category);
  const examOption=examBadgeSelector(null,topic.is_exam_pass);
  const syncExamOption=()=>{const on=category.value==='License & Exam';examOption.wrap.hidden=!on;if(!on)examOption.box.checked=false;};
  category.onchange=syncExamOption;syncExamOption();
  const titleLabel=make('label','','Title / 제목');const titleInput=make('input');
  titleInput.required=true;titleInput.minLength=4;titleInput.maxLength=150;titleInput.value=topic.title;titleLabel.append(titleInput);
  const bodyLabel=make('div','community-compose-field');const bodyName=make('label','','Content / 내용');const bodyHost=make('div');bodyLabel.append(bodyName,bodyHost);const body=window.TYC_CommunityRich.mount(bodyHost,topic.body,db,user);
  const previewEditor=createPreviewEditor(topic.public_preview_enabled);
  const actions=make('div','actions');const save=make('button','btn primary','Save Changes / 저장');save.type='submit';
  const cancel=button('Cancel / 취소',()=>dialog.close());actions.append(save,cancel);
  const note=make('p','meta');note.setAttribute('role','status');form.append(top,categoryLabel,examOption.wrap,titleLabel,bodyLabel,previewEditor.wrap,actions,note);
  form.onsubmit=async e=>{
    e.preventDefault();if(save.disabled||!form.reportValidity())return;
    const newTitle=titleInput.value.trim(),newBody=body.value();
    if(newTitle.length<4||(!body.plain()&&!newBody.includes('data-tyc-path'))||newBody.length>30000||body.busy()){note.textContent='Please enter content (max 30,000 characters) and finish image uploads before saving.';return;}
    save.disabled=topSave.disabled=true;
    const r=await db.from('pta_topics').update({category:category.value,title:newTitle,body:newBody,is_exam_pass:category.value==='License & Exam'&&examOption.box.checked,...previewEditor.payload(newBody)}).eq('id',topic.id).eq('author_id',user.id).eq('is_deleted',false).select('id');
    if(r.error||!r.data?.length){note.textContent='수정 실패: '+(r.error?errorMessage(r.error):'수정 권한을 확인해 주세요.');save.disabled=topSave.disabled=false;return;}
    dialog.close();
    status('게시글을 수정했습니다.');
    await loadTopics();
    const updatedTopic=topics.find(item=>item.id===topic.id);
    if(updatedTopic)await openTopic(updatedTopic);
    else status('게시글은 저장되었지만 상세 화면을 다시 열지 못했습니다. 목록을 새로고침해 주세요.',true);
  };
  dialog.append(form);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
}
async function deleteTopic(topic){
  if(!user||topic.is_deleted||(!isAdmin&&topic.author_id!==user.id))return;
  const isOtherMember=isAdmin&&topic.author_id!==user.id;
  const warning=(isOtherMember?'관리자로서 다른 회원의 게시글을 삭제합니다.\n\n':'')
   +'#'+topic.post_number+' · '+topic.title
   +'\n\n이 게시글을 삭제할까요? 회원 목록에서 사라지며 댓글도 보이지 않지만 관리자는 복구할 수 있습니다.';
  if(!confirm(warning))return;
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
async function openTopic(x,addHistory=false){
  if((x.is_hidden||x.is_deleted)&&!isAdmin){status('열람할 수 없는 게시글입니다.',true);return;}
  if(addHistory)pushTopicRoute(x.id);
  activeTopic=x;
  const discussions=$('topics').closest('.community-discussions');
  discussions?.classList.add('community-reading-mode');
  // Keep the discussion directory visible above the opened post, so scrolling up
  // or selecting another title works without returning to the list first.
  $('topics').classList.remove('hidden');
  $('topics').querySelectorAll('.community-board-row').forEach(row=>{
    const selected=row.dataset.topicId===x.id;
    row.classList.toggle('community-current-topic',selected);
    const title=row.querySelector('.community-board-title');
    if(title){if(selected)title.setAttribute('aria-current','true');else title.removeAttribute('aria-current');}
  });
  show('detail',true);show('replyForm',!x.is_deleted);
  // Rebuild the picker for the current approved member whenever a new topic opens.
  const existingPicker=$('replyForm').querySelector('.community-reaction-wrap');
  if(existingPicker)existingPicker.remove();
  window.TYC_CommunityReactions?.attach({
   host:$('replyBody').parentElement,db,user,
   onEmoji:emoji=>window.TYC_CommunityReactions.insertAtCaret($('replyBody'),emoji),
   onGif:path=>window.TYC_CommunityReactions.insertAtCaret($('replyBody'),'\n'+window.TYC_CommunityReactions.replyToken(path)+'\n'),
       onGiphy:id=>window.TYC_CommunityReactions.insertAtCaret($('replyBody'),'\n'+window.TYC_CommunityReactions.giphyToken(id)+'\n')
  });
  text('detailTitle',displayCommunityTitle(x.title));
  if(x.is_notice && x.show_siren_badge){$('detailTitle').prepend(document.createTextNode(' '));$('detailTitle').prepend(adminNoticeBadge());}
  if(x.is_exam_pass && x.category==='License & Exam'){
    $('detailTitle').prepend(document.createTextNode(' '));
    $('detailTitle').prepend(examPassBadge());
  }
  const oldPreviewLink=$('detail').querySelector('.community-public-share-link');if(oldPreviewLink)oldPreviewLink.remove();
  if(x.public_preview_enabled&&!x.is_hidden&&!x.is_deleted){
   const link=make('a','community-public-share-link','↗ Public preview / 공개 미리보기 링크');
   link.href='discussion.html?id='+encodeURIComponent(x.id);
   $('detailTitle').insertAdjacentElement('afterend',link);
  }
  text('detailMeta',`${x.is_notice?'NOTICE':'#'+x.post_number} · ${x.category} · `);const detailName=make('span','',displayName(x.author_id));if(!x.is_deleted){detailName.dataset.tycMember=x.author_id;detailName.tabIndex=0;detailName.setAttribute('role','button');}$('detailMeta').append(detailName);
  const detailBadge=verifiedBadge(x.author_id);
  if(detailBadge)$('detailMeta').append(' ',detailBadge);
  $('detailMeta').append(document.createTextNode(` · ${niceDate(x.created_at)}${isAdmin&&x.edited_at?' · (Edited)':''}${x.is_deleted?' · Deleted / 삭제됨':x.is_hidden?' · Hidden / 숨김':''}`));
  window.TYC_CommunityRich.render($('detailBody'),x.body,db);const oldNotice=$('detail').querySelector('.topic-detail-notice');if(oldNotice)oldNotice.remove();const priorLike=$('detail').querySelector('.topic-detail-like');if(priorLike)priorLike.remove();const priorHonor=$('detail').querySelector('.topic-detail-honor');if(priorHonor)priorHonor.remove();if(honorActive(x.id)){const badge=honorBadge(x);badge.classList.add('topic-detail-honor');$('detailMeta').insertAdjacentElement('beforebegin',badge);}if(!x.is_hidden&&!x.is_deleted)$('detailMeta').insertAdjacentElement('afterend',likeButton(x,true));const priorBookmark=$('detail').querySelector('.topic-detail-bookmark');if(priorBookmark)priorBookmark.remove();if(!x.is_hidden&&!x.is_deleted){$('detailMeta').insertAdjacentElement('afterend',bookmarkButton(x,true));}let viewEl=$('detail').querySelector('.tyc-topic-detail-views');if(!viewEl){viewEl=make('span','tyc-view-count tyc-view-count-detail tyc-topic-detail-views');$('detailMeta').insertAdjacentElement('afterend',viewEl)}viewEl.textContent=window.TYC_Views?.label(topicViewMap.get(x.id))||'👁 — views';if(window.TYC_Views)window.TYC_Views.record('community',x.id).then(n=>{if(n!==null){topicViewMap.set(x.id,n);if(activeTopic?.id===x.id)viewEl.textContent=window.TYC_Views.label(n)}});if(!x.is_hidden&&!x.is_deleted)db.rpc('pta_track_weekly_topic_view',{p_topic_id:x.id}).then(({error})=>{if(error)console.warn('Weekly view recording unavailable',error.message);});
  // Insert the moderation control without changing community.html.
  const detail=$('detail'),old=detail.querySelector('.topic-detail-visibility');if(old)old.remove();const oldReport=detail.querySelector('.topic-detail-report');if(oldReport)oldReport.remove();
  if(!x.is_hidden&&!x.is_deleted){const report=reportButton('topic',x.id);report.classList.add('topic-detail-report');$('detailBody').insertAdjacentElement('afterend',report);}
  if(isAdmin){const action=x.is_deleted?topicRestoreButton(x):topicVisibilityButton(x);action.classList.add('topic-detail-visibility');
    const body=$('detailBody');body.insertAdjacentElement('afterend',action);const oldDelete=detail.querySelector('.topic-detail-permanent-delete');if(oldDelete)oldDelete.remove();if(x.is_deleted){const hardDelete=topicPermanentDeleteButton(x);hardDelete.classList.add('topic-detail-permanent-delete');body.insertAdjacentElement('afterend',hardDelete);}const oldNoticeAction=detail.querySelector('.topic-detail-notice-action');if(oldNoticeAction)oldNoticeAction.remove();const oldSirenAction=detail.querySelector('.topic-detail-siren-action');if(oldSirenAction)oldSirenAction.remove();if(!x.is_deleted){const notice=noticeActionButton(x);notice.classList.add('topic-detail-notice-action');body.insertAdjacentElement('afterend',notice);if(x.is_notice){const siren=sirenActionButton(x);siren.classList.add('topic-detail-siren-action');body.insertAdjacentElement('afterend',siren);}}}
  const prev=detail.querySelector('.topic-detail-owner');if(prev)prev.remove();
  if(user&&!x.is_deleted&&(isAdmin||x.author_id===user.id)){const actions=topicOwnerActions(x);actions.classList.add('topic-detail-owner');$('detailBody').insertAdjacentElement('afterend',actions);}
  requestAnimationFrame(()=>detail.scrollIntoView({behavior:'auto',block:'start'}));await loadReplies();
}
// Replies: a top-level reply plus up to 5 nested replies.
async function loadReplies(){
  if(!activeTopic)return;
  const topicId=activeTopic.id;
  const r=await db.from('pta_replies').select('id,author_id,body,created_at,parent_id,edited_at,is_hidden,is_deleted').eq('topic_id',topicId).order('created_at',{ascending:true});
  if(!activeTopic||activeTopic.id!==topicId)return;
  const root=$('replies');if(!root){status('댓글 영역을 찾지 못했습니다. 페이지를 새로고침해 주세요.',true);return;}root.replaceChildren();
  if(r.error){root.append(make('p','meta','답글을 불러오지 못했습니다: '+errorMessage(r.error)));return;}
  const data=r.data||[];
  // Keep the list badge current after posting, editing or deleting a reply.
  replyCountMap.set(topicId,data.filter(item=>!item.is_hidden||isAdmin).length);
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
    const content=make('p','prewrap');
    if(item.is_deleted)content.textContent='댓글이 삭제되었습니다.';
    else if(item.is_hidden)content.textContent='This reply is hidden by a moderator. / 관리자가 숨긴 댓글입니다.';
    else if(window.TYC_CommunityReactions)window.TYC_CommunityReactions.renderReply(content,item.body,db);
    else content.textContent=item.body;
    const replyMeta=make('p','meta');const replyName=make('span','',item.is_deleted?'Deleted / 삭제됨':displayName(item.author_id));if(!item.is_deleted){replyName.dataset.tycMember=item.author_id;replyName.tabIndex=0;replyName.setAttribute('role','button');}replyMeta.append(replyName);
    const replyBadge=item.is_deleted?null:verifiedBadge(item.author_id);
    if(replyBadge)replyMeta.append(' ',replyBadge);
    if(!item.is_deleted)replyMeta.append(document.createTextNode(` · ${niceDate(item.created_at)}${isAdmin&&item.edited_at?' · (Edited)':''}`));
    box.append(replyMeta,content);
    const replyActions=make('div','community-reply-actions');
    box.append(replyActions);
    if(!item.is_hidden&&!item.is_deleted&&!activeTopic.is_deleted)replyActions.append(reportButton('reply',item.id));
    if(item.is_hidden&&!isAdmin&&!item.is_deleted){target.append(box);return;}
    // Authors may edit their own replies, including nested replies.
    if(user&&item.author_id===user.id&&!activeTopic.is_deleted&&!item.is_hidden&&!item.is_deleted){
      const edit=button('Edit / 수정',()=>{});edit.className='reply-edit-action';
      const holder=make('div','reply-composer hidden');const form=make('form','stack');
      const label=make('label','','Edit Reply / 댓글 수정');const area=make('textarea');
      area.required=true;area.minLength=2;area.maxLength=4000;area.rows=3;area.value=item.body;label.append(area);
      window.TYC_CommunityReactions?.attach({
       host:label,db,user,
       onEmoji:emoji=>window.TYC_CommunityReactions.insertAtCaret(area,emoji),
       onGif:path=>window.TYC_CommunityReactions.insertAtCaret(area,'\n'+window.TYC_CommunityReactions.replyToken(path)+'\n'),
       onGiphy:id=>window.TYC_CommunityReactions.insertAtCaret(area,'\n'+window.TYC_CommunityReactions.giphyToken(id)+'\n')
      });
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
      replyActions.append(edit);box.append(holder);
    }
    // Authors and administrators can soft-delete replies without affecting nested replies.
    if(!item.is_deleted && !activeTopic.is_deleted && user && (isAdmin || item.author_id===user.id)){
      const remove=button('Delete / 삭제',async()=>{
        if(!activeTopic||activeTopic.id!==topicId)return;
        const hasChildren=(children.get(item.id)||[]).length>0;
        const question=hasChildren
          ? '이 댓글만 삭제하고 아래 대댓글은 그대로 유지할까요?'
          : '이 댓글을 삭제할까요?';
        if(!confirm(question))return;
        remove.disabled=true;
        const result=await db.rpc('pta_soft_delete_reply',{p_reply_id:item.id});
        if(result.error||result.data!==true){
          status('댓글 삭제 실패: '+(result.error?errorMessage(result.error):'작성자 권한을 확인해 주세요.'),true);
          remove.disabled=false;
          return;
        }
        status('댓글이 삭제되었습니다. 대댓글은 그대로 유지됩니다.');
        await loadReplies();
      });
      remove.className='reply-delete-action';
      replyActions.append(remove);
    }
    // Permanent removal is restricted to administrators and previously
    // soft-deleted replies; removing a parent cascades to all nested replies.
    if(isAdmin&&item.is_deleted){
      const hardDelete=button('Permanently Delete / 영구 삭제',async()=>{
        if(!activeTopic||activeTopic.id!==topicId)return;
        const hasChildren=(children.get(item.id)||[]).length>0;
        const warning='PERMANENT DELETE / 댓글 영구 삭제\n\n'
          +'This cannot be undone. / 복구할 수 없습니다.\n'
          +(hasChildren?'Nested replies and reports will also be deleted. / 연결된 대댓글과 신고 기록도 함께 삭제됩니다.\n':'')
          +'Proceed with permanent removal?';
        if(!confirm(warning))return;
        const typed=prompt('FINAL CONFIRMATION: Type DELETE to permanently remove this reply'+(hasChildren?' and its descendants':'')+'.');
        if(typed!=='DELETE'){if(typed!==null)status('Permanent deletion cancelled.');return;}
        hardDelete.disabled=true;
        const result=await db.rpc('pta_admin_permanently_delete_reply',{p_reply_id:item.id});
        if(result.error||result.data!==true){
          status('댓글 영구 삭제 실패: '+(result.error?errorMessage(result.error):'Administrator permission required'),true);
          hardDelete.disabled=false;return;
        }
        status('댓글이 영구 삭제되었습니다. / Reply permanently deleted.');
        await loadReplies();
      });
      hardDelete.className='reply-permanent-delete-action';
      replyActions.append(hardDelete);
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
      window.TYC_CommunityReactions?.attach({
       host:label,db,user,
       onEmoji:emoji=>window.TYC_CommunityReactions.insertAtCaret(textarea,emoji),
       onGif:path=>window.TYC_CommunityReactions.insertAtCaret(textarea,'\n'+window.TYC_CommunityReactions.replyToken(path)+'\n'),
       onGiphy:id=>window.TYC_CommunityReactions.insertAtCaret(textarea,'\n'+window.TYC_CommunityReactions.giphyToken(id)+'\n')
      });
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
      replyActions.insertBefore(action,replyActions.firstChild);box.append(holder);
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
  const content=String(body||'').trim();
  if(content.length<2||content.length>4000)return '댓글은 2~4,000자 사이여야 합니다.';
  const r=await db.from('pta_replies').insert({topic_id:activeTopic.id,author_id:user.id,body:content,parent_id:parentId});
  return r.error?errorMessage(r.error):null;
}
async function newTopic(e){
e.preventDefault();if(!isMember||!composeRich)return;
const title=$('topicTitle').value.trim(),body=composeRich.value();
if(title.length<4||(!composeRich.plain()&&!body.includes('data-tyc-path')&&!body.includes('data-tyc-giphy'))||body.length>30000||composeRich.busy()){status('Enter a title and content (max 30,000 characters) and complete image uploads first.',true);return;}
const submit=$('topicForm').querySelector('button[type=submit]');submit.disabled=true;
try{
const previewChoice=$('topicPreviewEnabled').checked;
const createPayload={author_id:user.id,category:$('topicCategory').value,title,body,is_exam_pass:$('topicCategory').value==='License & Exam'&&$('topicExamPass').checked,...publicPreviewPayload(previewChoice,body)};
if(isAdmin){createPayload.is_notice=$('topicIsNotice').checked;createPayload.show_siren_badge=createPayload.is_notice&&$('topicSirenBadge').checked;}
const r=await db.from('pta_topics').insert(createPayload);
if(r.error)throw r.error;
$('topicDialog').close();$('topicForm').reset();show('topicExamPassArea',false);$('topicSirenBadge').disabled=true;composeRich.set('');
status(createPayload.is_notice?'Official notice published and pinned above regular discussions.':'Discussion published.');await loadTopics();
}catch(err){status('Unable to publish discussion: '+errorMessage(err),true);}
finally{submit.disabled=false;}
}
async function reply(e){e.preventDefault();if(!isMember||!activeTopic)return;
const submit=$('replyForm').querySelector('[type="submit"]');submit.disabled=true;
try{const err=await saveReply($('replyBody').value);if(err){status('답글 저장 실패: '+err,true);return;}
$('replyForm').reset();status('답글이 등록되었습니다.');await loadReplies();}
finally{submit.disabled=false;}}
// Close a discussion action menu when clicking outside or pressing Escape.
function setupDiscussionMenuDismissal(){
 document.addEventListener('pointerdown',event=>{
  document.querySelectorAll('details.community-board-actions[open]').forEach(menu=>{
   if(!menu.contains(event.target))menu.open=false;
  });
 });
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  const openMenus=document.querySelectorAll('details.community-board-actions[open]');
  if(!openMenus.length)return;
  openMenus.forEach(menu=>menu.open=false);
  event.preventDefault();
 });
 document.addEventListener('toggle',event=>{
  const menu=event.target;
  if(!menu.matches?.('details.community-board-actions')||!menu.open)return;
  document.querySelectorAll('details.community-board-actions[open]').forEach(other=>{
   if(other!==menu)other.open=false;
  });
 },true);
}
async function init(){setupDiscussionMenuDismissal();const stateEl=$('licenseState'),studentStateEl=$('studentState');for(const code of states){const label=stateNames[code]+' ('+code+')';const licenseOption=make('option','',label);licenseOption.value=code;stateEl.append(licenseOption);const studentOption=make('option','',label);studentOption.value=code;studentStateEl.append(studentOption)}stateEl.value='';studentStateEl.value='';if(!valid){status('Supabase 공개 연결 설정을 확인해 주세요. Secret Key는 입력하면 안 됩니다.',true);return;}db=window.supabase.createClient(projectURL,pubkey);
function openVerification(type){if(!user||memberRow||isAdmin)return;$('memberType').value=type;applicantTypeChanged();$('verifyFormTitle').textContent=type+' Verification / '+(type==='PTA'?'면허 인증':'재학 인증');$('verifyPTA').setAttribute('aria-pressed',String(type==='PTA'));$('verifySPTA').setAttribute('aria-pressed',String(type==='SPTA'));show('verifyArea',false);show('requestArea',true);$('requestArea').scrollIntoView({block:'start'});$('displayName').focus({preventScroll:true});}if($('verifyPTA'))$('verifyPTA').onclick=()=>openVerification('PTA');if($('verifySPTA'))$('verifySPTA').onclick=()=>openVerification('SPTA');if($('verifyBack'))$('verifyBack').onclick=()=>{show('requestArea',false);show('verifyArea',true);$('verifyPTA').focus();};
$('displayName').addEventListener('input',clearNicknameCheck);$('checkNickname').addEventListener('click',checkNickname);$('memberType').onchange=applicantTypeChanged;$('studentProof').addEventListener('change',proofFileChanged);applicantTypeChanged();$('requestForm').onsubmit=apply;$('composeBtn').onclick=()=>{$('topicNoticeArea').hidden=!isAdmin;$('topicIsNotice').checked=false;$('topicSirenBadge').checked=false;$('topicSirenBadge').disabled=true;$('topicExamPass').checked=false;$('topicPreviewEnabled').checked=false;show('topicExamPassArea',$('topicCategory').value==='License & Exam');composeRich=window.TYC_CommunityRich.mount($('topicRichHost'),'',db,user);$('topicDialog').showModal();};$('topicForm').onsubmit=newTopic;$('topicIsNotice').addEventListener('change',()=>{const checked=$('topicIsNotice').checked;$('topicSirenBadge').disabled=!checked;if(!checked)$('topicSirenBadge').checked=false;});
$('topicCategory').addEventListener('change',()=>{
  const exam=$('topicCategory').value==='License & Exam';show('topicExamPassArea',exam);if(!exam)$('topicExamPass').checked=false;
  const compensation=$('topicCategory').value==='Compensation & Benefits';
  show('compensationHint',compensation);
  if(compensation && composeRich && !composeRich.plain()){
    composeRich.set([
      'State / City (지역): ',
      'Setting (Outpatient / HH / SNF / Hospital / Other): ',
      'Experience (경력 연수): ',
      'Employment (W-2 / 1099 / PRN): ',
      'Pay (시급 / 방문당 / 연봉, 세전 기준): ',
      'Benefits / Bonus (선택): ',
      'Additional notes (선택): '
    ].join('\n'));
  }
});$('replyForm').onsubmit=reply;$('backBtn').onclick=async()=>{
 clearTopicRoute();
 await loadWeeklyStats();
 renderTopics();
 requestAnimationFrame(()=>$('topics').scrollIntoView({behavior:'smooth',block:'start'}));
};
window.addEventListener('popstate',()=>{
 if(!isMember)return;
 const topicId=new URLSearchParams(location.search).get('topic');
 const topic=topicId&&topics.find(t=>t.id===topicId&&!t.is_deleted&&(!t.is_hidden||isAdmin));
 if(topic){
  // Browser Back/Forward restores the topic without pushing another entry.
  openTopic(topic);
 }else{
  renderTopics();
  requestAnimationFrame(()=>$('topics').scrollIntoView({behavior:'auto',block:'start'}));
 }
});$('search').oninput=renderTopics;$('filter').onchange=renderTopics;$('topicSort').onchange=renderTopics;$('savedOnly').onchange=renderTopics;$('logoutBtn').onclick=logout;$('accountLogout').onclick=logout;
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden){
  refreshWeekIfNeeded();
  document.querySelectorAll('.community-new-badge[data-expiry]').forEach(badge=>{
   if(Date.now()>=Number(badge.dataset.expiry))badge.remove();
  });
 }
});setInterval(()=>{if(!document.hidden)refreshWeekIfNeeded();},120000);
await refresh();db.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(refresh,0)});}
init().catch(e=>status('오류: '+errorMessage(e),true));
})();
