(()=>{'use strict';
const declaredLanguage=document.documentElement.dataset.communityLanguage;
const communityLanguage=declaredLanguage==='ko'||declaredLanguage==='en'?declaredLanguage:/\/community-en(?:\.html)?\/?$/i.test(location.pathname)?'en':'ko',EN=communityLanguage==='en';
const boardFor=language=>language==='en'?'community-en.html':'community-ko.html';
const noticeDestinationLabel=language=>({ko:'Korean Community',en:'English Community',both:'Both communities'})[language]||'Korean Community';
function noticeDestinationControl(value){const wrap=make('div','community-notice-destination');const label=make('label','',EN?'Publish notice to':'공지 게시 대상 / Publish notice to');const select=make('select');select.setAttribute('aria-label','Notice destination');for(const [key,caption] of [['ko','🇰🇷 Korean Community only'],['en','🇺🇸 English Community only'],['both','🇰🇷 🇺🇸 Both communities']]){const opt=make('option','',caption);opt.value=key;select.append(opt);}select.value=['ko','en','both'].includes(value)?value:communityLanguage;label.append(select);wrap.append(label,make('small','',EN?'Both shares one notice, including its replies and likes.':'Both 선택 시 하나의 공지와 댓글·좋아요를 두 게시판에서 공유합니다.'));return {wrap,select};}
let composeNoticeDestination=null;
const noticeDurations=[['week','1 Week'],['month','1 Month'],['permanent','Permanent']];
const noticeExpired=t=>!!t.is_notice&&!!t.notice_expires_at&&Date.parse(t.notice_expires_at)<=Date.now();
const noticeInAll=t=>!!t.notice_published_at&&Date.now()<Date.parse(t.notice_published_at)+7*86400000&&!noticeExpired(t)&&!t.is_hidden&&!t.is_deleted;
const noticeVisible=(t,cat,sort)=>!t.is_notice||(!['liked','popular','hall'].includes(sort)&&(cat?isAdmin||!noticeExpired(t):noticeInAll(t)));
function noticeDurationControl(value='permanent'){
 const wrap=make('div','community-notice-duration'),label=make('strong','',EN?'Announcement duration':'공지 게시 기간'),choices=make('div','community-duration-options'),hint=make('small','',EN?'New notices appear in ALL for 7 days at most. The selected duration controls visibility in the original category.':'새 공지는 ALL에서 최대 7일간 표시됩니다. 선택한 기간은 원래 카테고리의 게시 기간입니다.');
 let selected=noticeDurations.some(x=>x[0]===value)?value:'permanent';
 function sync(){for(const b of choices.children){const on=b.dataset.duration===selected;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}}
 for(const [key,caption] of noticeDurations){const b=button(caption,()=>{selected=key;sync();});b.dataset.duration=key;choices.append(b);}
 wrap.append(label,choices,hint);sync();return {wrap,get value(){return selected},set value(v){selected=v;sync();}};
}
let composeNoticeDuration=null,noticeExpiryTimer=null;
function refreshNoticeDirectory(){const opened=activeTopic;if(opened&&!isAdmin&&noticeExpired(opened)){clearTopicRoute();renderTopics();return;}renderTopics();if(opened){activeTopic=opened;show('detail',true);$('topics').closest('.community-discussions')?.classList.add('community-reading-mode');for(const row of $('topics').querySelectorAll('.community-board-row')){const current=row.dataset.topicId===opened.id;row.classList.toggle('community-current-topic',current);if(current)row.querySelector('.community-board-title')?.setAttribute('aria-current','true');}}}
function scheduleNoticeRefresh(){
 clearTimeout(noticeExpiryTimer);const now=Date.now();let next=Infinity;
 for(const t of topics){if(!t.is_notice)continue;for(const time of [t.notice_expires_at?Date.parse(t.notice_expires_at):NaN,t.notice_published_at?Date.parse(t.notice_published_at)+7*86400000:NaN])if(time>now)next=Math.min(next,time);}
 if(Number.isFinite(next))noticeExpiryTimer=setTimeout(()=>{if(!document.hidden)refreshNoticeDirectory();else scheduleNoticeRefresh();},Math.min(2147483647,Math.max(100,next-now+50)));
}
function noticeSection(root,count){
 const box=make('section','community-announcements'),head=button('',()=>setOpen(!opened)),name=make('strong','',EN?'Official Announcements':'Official Announcements · 공지사항'),n=make('span','community-announcement-count',count),chevron=make('span','community-announcement-chevron'),body=make('div','community-announcement-body'),collapse=button(EN?'Collapse announcements ⌃':'공지 접기 ⌃',()=>{setOpen(false);head.focus();});
 const key='tyc-community-announcements-open:'+communityLanguage;let opened=true;try{opened=localStorage.getItem(key)!=='0'}catch{}
 head.className='community-announcement-toggle';head.append(make('span','community-announcement-icon','◈'),name,n,chevron);body.id='community-announcement-body';head.setAttribute('aria-controls',body.id);collapse.className='community-announcement-collapse';
 function setOpen(on){opened=on;head.setAttribute('aria-expanded',String(on));body.hidden=!on;collapse.hidden=!on;chevron.textContent=on?'⌃':'⌄';try{localStorage.setItem(key,on?'1':'0')}catch{}}
 box.append(head,body,collapse);root.append(box);setOpen(opened);return body;
}
function noticeScheduleAction(topic){
 const b=button(EN?'Notice duration / renew':'공지 기간 설정 / 갱신',()=>{if(!isAdmin||!topic.is_notice)return;const dialog=make('dialog','community-notice-schedule-dialog'),form=make('form','stack'),duration=noticeDurationControl(topic.notice_duration),note=make('p','meta'),save=make('button','btn primary',EN?'Save & republish':'저장 및 다시 게시'),cancel=button(EN?'Cancel':'취소',()=>dialog.close());
 save.type='submit';form.append(make('h2','',EN?'Announcement duration':'공지 게시 기간'),duration.wrap,make('small','',EN?'Saving restarts the notice period and the 7-day ALL window, and unhides the notice.':'저장하면 게시 기간 및 ALL 7일 노출이 다시 시작되고 공지가 다시 공개됩니다.'),note,save,cancel);dialog.append(form);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});form.onsubmit=async e=>{e.preventDefault();save.disabled=true;const r=await db.from('pta_topics').update({notice_duration:duration.value,notice_published_at:new Date().toISOString(),is_hidden:false}).eq('id',topic.id).eq('is_notice',true).select('id,notice_duration,notice_published_at,notice_expires_at,is_hidden').maybeSingle();if(r.error||!r.data){note.textContent=r.error?errorMessage(r.error):'Permission denied';save.disabled=false;return;}Object.assign(topic,r.data);dialog.close();refreshNoticeDirectory();if(activeTopic?.id===topic.id)openTopic(topic);};dialog.showModal();});b.className='topic-notice-action community-notice-schedule-action';return b;
}

function syncComposeNoticeDestination(){if(!composeNoticeDestination)return;const enabled=isAdmin&&$('topicIsNotice').checked;composeNoticeDestination.wrap.hidden=!enabled;composeNoticeDestination.select.disabled=!enabled;if(composeNoticeDuration)composeNoticeDuration.wrap.hidden=!enabled;}
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
let composeRich=null,composePublishing=false;let db,user,isAdmin=false,isMember=false,memberRow=null,topics=[],members=new Map(),verifiedMemberRoles=new Map(),verifiedMemberYears=new Map(),activeTopic=null,topicViewMap=new Map(),replyCountMap=new Map(),bookmarks=new Set(),weeklyStats=new Map(),likeBusy=new Set();
function status(m,err=false){
 const target=$('message');
 target.classList.remove('community-email-confirmation');
 target.replaceChildren();
 target.classList.toggle('error',err);
 text('message',m);
}
function errorMessage(e){return e?.message||(EN?"Unable to process your request.":'요청을 처리하지 못했습니다.')}
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
 const badge=make('span','community-verified-role'+(role==='SPTA'?' is-spta':''),role);
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
 number.setAttribute('aria-label',(EN?"Years since initial PTA licensure: ":'PTA 면허 발급 기준 ')+years+(EN?" years":'년차'));
 number.title='Verified PTA · '+years+(EN?' years':'년차')+' (since initial license)';
 const lightning=make('span','community-pta-exp-lightning');lightning.setAttribute('aria-hidden','true');
 for(const side of ['upper-left','upper-right','lower-right','lower-left'])lightning.append(make('span','community-pta-exp-spark spark-'+side));
 number.append(lightning,digit);
 group.append(badge,number);
 return group;
}
async function logout(){const {error}=await db.auth.signOut();if(error){status(errorMessage(error),true);return;}await refresh();}
let upgradeMode=false,upgradePending=false,upgradeEligible=false;
function resetUpgradeForm(){
 upgradeMode=false;
 const name=$('displayName');name.readOnly=false;name.maxLength=40;
 $('checkNickname').hidden=false;
 $('nicknameCheckStatus').hidden=false;
}
function openUpgrade(){
 if(!user||!upgradeEligible||upgradePending||memberRow?.member_type!=='SPTA'||memberRow?.membership_status!=='approved')return;
 upgradeMode=true;$('memberType').value='PTA';applicantTypeChanged();
 const name=$('displayName');name.maxLength=55;name.value=memberRow.display_name||'';name.readOnly=true;
 $('checkNickname').hidden=true;$('nicknameCheckStatus').hidden=true;
 $('legalFirstName').value=memberRow.legal_first_name||'';$('legalLastName').value=memberRow.legal_last_name||'';
 $('ptaResidenceState').value=memberRow.residence_state||memberRow.student_state||'';$('licenseState').value='';$('licenseNumber').value='';$('statement').value='';
 $('verifyFormTitle').textContent=EN?'PTA License Verification · Membership Upgrade':'PTA 면허 인증 · 회원 유형 전환';
 show('verifyArea',false);show('memberArea',false);show('requestArea',true);
 $('requestArea').scrollIntoView({block:'start'});$('licenseState').focus({preventScroll:true});
}
async function refreshUpgradeCard(){
 const card=$('ptaUpgradeCard'),btn=$('ptaUpgradeButton');
 if(!card||!btn)return;
 card.hidden=true;upgradePending=false;upgradeEligible=false;
 if(!user||memberRow?.member_type!=='SPTA'||memberRow?.membership_status!=='approved')return;
 const uid=user.id;
 const {data,error}=await db.from('pta_license_upgrades').select('id').eq('user_id',uid).eq('status','pending').limit(1);
 if(error||user?.id!==uid||memberRow?.member_type!=='SPTA'||memberRow?.membership_status!=='approved')return;
 upgradeEligible=true;upgradePending=!!data?.length;
 $('ptaUpgradeTitle').textContent=upgradePending?(EN?'PTA verification pending':'PTA 면허 인증 심사 중'):(EN?'Earned your PTA license?':'PTA 면허를 취득하셨나요?');
 $('ptaUpgradeDescription').textContent=upgradePending?(EN?'Your SPTA membership stays active during review.':'심사 중에도 기존 SPTA 회원 자격은 유지됩니다.'):(EN?'Verify your license and get your PTA badge.':'면허 인증을 받고 PTA 배지로 전환하세요.');
 btn.hidden=upgradePending;btn.onclick=openUpgrade;card.hidden=false;
}
async function refresh(){resetUpgradeForm();upgradeEligible=false;upgradePending=false;if($('ptaUpgradeCard'))$('ptaUpgradeCard').hidden=true;const heroApproved=$('communityHeroStatus');if(heroApproved)heroApproved.hidden=true;const res=await db.auth.getUser();user=res.data?.user||null;isAdmin=false;isMember=false;memberRow=null;show('loginArea',!user);show('requestArea',false);show('verifyArea',false);show('memberArea',false);show('accountArea',!!user);if(!user){weeklyStats=new Map();replyCountMap=new Map();topics=[];status((EN?"This is a private community. Sign in with an approved account to read discussions.":'비공개 커뮤니티입니다. 로그인한 승인 회원만 글을 볼 수 있습니다.'));return;}
text('identity',`Signed in: ${user.email}`);
const [a,m]=await Promise.all([db.rpc('tyc_has_staff_scope',{p_scope:'community'}),db.from('pta_members').select('user_id,display_name,membership_status,member_type,legal_first_name,legal_last_name,residence_state,student_state').eq('user_id',user.id).maybeSingle()]);
if(a.error||m.error){status((EN?"Unable to load membership information. Please contact an administrator.":'회원 정보를 조회할 수 없습니다. 관리자에게 문의해 주세요.'),true);return;}
isAdmin=!!a.data;memberRow=m.data;isMember=isAdmin||m.data?.membership_status==='approved';
$('message').classList.toggle('community-review-pending',!isMember&&memberRow?.membership_status==='pending');
$('topicNoticeArea').hidden=!isAdmin;if(!isAdmin)$('topicIsNotice').checked=false;

if(!isMember){if(!memberRow){show('verifyArea',true);status((EN?"Choose your member type to get verified.":'PTA 또는 SPTA를 선택해 회원 인증을 시작해 주세요. / Choose your member type to get verified.'));}
else status(memberRow.membership_status==='pending'?(EN?"Your application is under review. Access will be available once approved.":'가입 신청을 검토 중입니다. 승인 후 열람할 수 있어요.'):(EN?"Your application was not approved. Please contact an administrator.":'가입 신청이 승인되지 않았습니다. 관리자에게 문의해 주세요.'));return;}
show('memberArea',true);if(heroApproved)heroApproved.hidden=false;status('');await Promise.all([loadTopics(),refreshUpgradeCard()]);}
let proofPreviewUrl=null;
function proofFileChanged(){
 const file=$('studentProof').files[0],preview=$('studentProofPreview');
 if(proofPreviewUrl){URL.revokeObjectURL(proofPreviewUrl);proofPreviewUrl=null;}
 preview.hidden=true;preview.removeAttribute('src');
 $('studentProofSelected').textContent=file?(EN?"Selected":'Selected / 선택한 파일: ')+file.name+' · '+(file.size/1048576).toFixed(2)+' MB':(EN?"No file selected":'No file selected / 첨부된 파일 없음');
 if(file&&['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)&&file.size<=5242880){
  proofPreviewUrl=URL.createObjectURL(file);preview.src=proofPreviewUrl;preview.hidden=false;
 }
}
function applicantTypeChanged(){
 const student=$('memberType').value==='SPTA';
 show('ptaLicenseFields',!student);show('sptaFields',student);
 $('licenseState').required=!student;$('ptaResidenceState').required=!student;$('licenseNumber').required=!student;$('studentState').required=student;
 $('studentSchool').required=student;$('studentProgram').required=student;$('studentProof').required=student;
}
let confirmedNickname='';
function clearNicknameCheck(){
 confirmedNickname='';
 const el=$('nicknameCheckStatus');if(el){el.textContent=(EN?"Check nickname availability before applying.":'Check nickname availability before applying. / 중복 확인을 해주세요.');el.classList.remove('nickname-available','nickname-taken');}
}
async function checkNickname(){
 if(!user){status('Please log in first.',true);return false;}
 const name=$('displayName').value.trim(),message=$('nicknameCheckStatus'),button=$('checkNickname');
 confirmedNickname='';
 if(name.length<2||name.length>40){message.textContent=(EN?"Nickname must be 2–40 characters.":'Nickname must be 2–40 characters. / 닉네임은 2~40자여야 합니다.');message.classList.add('nickname-taken');return false;}
 if(!isAdmin&&window.TYC_NicknameRules?.isReserved(name)){
  message.textContent=window.TYC_NicknameRules.message;
  message.classList.add('nickname-taken');message.classList.remove('nickname-available');return false;
 }
 button.disabled=true;message.textContent='Checking nickname…';
 try{
  const r=await db.rpc('tyc_nickname_available',{p_nickname:name});
  if(r.error)throw r.error;
  if($('displayName').value.trim()!==name){clearNicknameCheck();return false;}
  if(r.data===true){confirmedNickname=name;message.textContent=(EN?"✓ Available nickname":'✓ Available nickname / 사용 가능한 닉네임입니다.');message.classList.add('nickname-available');message.classList.remove('nickname-taken');return true;}
  message.textContent=(EN?"This nickname is already in use.":'This nickname is already in use. / 이미 사용 중인 닉네임입니다.');message.classList.add('nickname-taken');message.classList.remove('nickname-available');return false;
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
  residence_state:student?$('studentState').value:$('ptaResidenceState').value,
  student_expected_graduation:student&&/^\d{4}-\d{2}$/.test($('studentExpectedGraduation').value)?$('studentExpectedGraduation').value+'-01':null,
  license_number:student?null:($('licenseNumber').value.trim()||null),
  statement:$('statement').value.trim(),
  member_type:student?'SPTA':'PTA',
  student_school:student?$('studentSchool').value.trim():null,
  student_program:student?$('studentProgram').value.trim():null,
  student_proof_path:null,
  membership_status:'pending'
 };
 if(!payload.legal_first_name||!payload.legal_last_name){status((EN?"Enter your legal name.":'Legal Name을 입력해 주세요.'),true);return;}
 if(!student&&!states.includes(payload.license_state)){status((EN?"Select your PTA state of licensure.":'PTA 면허 발급 주를 선택해 주세요.'),true);return;}
 if(!student&&(!states.includes(payload.residence_state)||!payload.license_number)){status(EN?'Select your current state and enter your PTA license number.':'현재 거주 주와 PTA 면허번호를 입력해 주세요.',true);return;}
 if(student&&!states.includes(payload.student_state)){status((EN?"Select your current state.":'현재 거주하는 주(State)를 선택해 주세요. / Select your current state.'),true);$('studentState').focus();return;}
 if(!upgradeMode&&(payload.display_name.length<2||payload.display_name.length>40)){status('Nickname must be 2–40 characters.',true);return;}
 if(!upgradeMode&&!isAdmin&&window.TYC_NicknameRules?.isReserved(payload.display_name)){status(window.TYC_NicknameRules.message,true);return;}
 if(!upgradeMode&&confirmedNickname!==payload.display_name && !(await checkNickname())){status((EN?"Please choose an available nickname first.":'Please choose an available nickname first. / 닉네임 중복 확인을 해주세요.'),true);return;}
 if(student&&(!payload.student_school||!payload.student_program)){status((EN?"Enter your school and PTA program.":'학교명과 PTA 프로그램명을 입력해 주세요.'),true);return;}
 const accepted={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
 if(student&&(!file||!accepted[file.type]||!file.size||file.size>5242880)){status((EN?"Upload enrollment proof (PDF, JPG, PNG or WebP, up to 5 MB).":'SPTA 재학 증빙 PDF/JPG/PNG/WebP 파일(5MB 이하)을 첨부해 주세요.'),true);return;}
 const submit=$('requestForm').querySelector('button[type=submit]');submit.disabled=true;
 let uploaded=null;
 try{
  if(student){
   uploaded=user.id+'/'+crypto.randomUUID()+'.'+accepted[file.type];
   status((EN?"Uploading enrollment proof privately…":'학생 재학 증빙을 비공개로 업로드하고 있어요…'));
   const r=await db.storage.from('tyc-student-verification').upload(uploaded,file,{contentType:file.type,cacheControl:'3600',upsert:false});
   if(r.error)throw r.error;
   payload.student_proof_path=uploaded;
  }
  const r=upgradeMode?await db.from('pta_license_upgrades').insert({user_id:user.id,legal_first_name:payload.legal_first_name,legal_last_name:payload.legal_last_name,license_state:payload.license_state,residence_state:payload.residence_state,license_number:payload.license_number,statement:payload.statement}):await db.from('pta_members').insert(payload).select('user_id');
  if(r.error)throw r.error;
  uploaded=null;
  const wasUpgrade=upgradeMode;await refresh();if(wasUpgrade)status(EN?'PTA license verification submitted. Your SPTA membership stays active until approval.':'PTA 면허 인증을 신청했습니다. 승인 전까지 SPTA 자격은 유지됩니다.');
 }catch(error){
  if(uploaded)await db.storage.from('tyc-student-verification').remove([uploaded]);
  status((EN?"Application failed: ":'가입 신청 실패: ')+errorMessage(error),true);
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
 if(r.error){status((EN?"Could not load bookmarks: ":'북마크 불러오기 실패: ')+errorMessage(r.error),true);return;}
 bookmarks=new Set((r.data||[]).map(x=>x.topic_id));
}
async function toggleBookmark(topic){
 if(!isMember||!user||topic.is_hidden||topic.is_deleted)return;
 const saved=bookmarks.has(topic.id);
 const r=saved
  ?await db.from('pta_topic_bookmarks').delete().eq('user_id',user.id).eq('topic_id',topic.id)
  :await db.from('pta_topic_bookmarks').insert({user_id:user.id,topic_id:topic.id});
 if(r.error){status((EN?"Could not save bookmark: ":'북마크 저장 실패: ')+errorMessage(r.error),true);return;}
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
 if(r.error){console.warn('Weekly rankings unavailable:',r.error.message);status((EN?"Could not load weekly rankings: ":'이번 주 인기글 순위를 불러오지 못했습니다: ')+errorMessage(r.error),true);return;}
 const visibleIds=new Set(topics.map(t=>t.id));weeklyStats=new Map((r.data||[]).filter(x=>visibleIds.has(x.topic_id)).map(x=>[x.topic_id,x]));
}
async function toggleLike(topic){
 if(!user||!isMember||topic.is_hidden||topic.is_deleted||likeBusy.has(topic.id))return;
 likeBusy.add(topic.id);
 const was=!!weekly(topic.id).liked_by_me;
 const r=was?await db.from('pta_topic_likes').delete().eq('topic_id',topic.id).eq('user_id',user.id)
            :await db.from('pta_topic_likes').insert({topic_id:topic.id,user_id:user.id});
 if(r.error){status((EN?"Could not update like: ":'좋아요 처리 실패: ')+errorMessage(r.error),true);likeBusy.delete(topic.id);return;}
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
 line.append(make('span','community-weekly-views',Number(x.week_views||0)+' this week'));
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
 const previousScroll=bar.scrollLeft;
 const focused=document.activeElement?.closest?.('#community-category-tabs button')?.dataset.tabKey;
 bar.replaceChildren();
 const currentSort=$('topicSort').value,currentCategory=$('filter').value;
 const visible=topics.filter(t=>isAdmin||(!t.is_hidden&&!t.is_deleted&&!noticeExpired(t)));const rankable=visible.filter(t=>!t.is_notice&&!t.is_hidden&&!t.is_deleted);
 function ranking(item){
  const active=currentSort===item.id&&currentCategory==='';
  const b=make('button','community-category-tab community-ranking-tab community-ranking-'+item.id+(active?' active':''));
  b.type='button';b.dataset.tabKey='rank:'+item.id;b.setAttribute('aria-pressed',String(active));
  b.setAttribute('aria-label',item.name+(item.id==='hall'?'':', this week')+'; '+item.count+' qualifying discussions');
  b.title=item.id==='hall'?'Hall of Fame':'Ranked by '+(item.id==='liked'?'likes':'views')+' this week';
  const icon=make('span','community-rank-icon',item.icon);icon.setAttribute('aria-hidden','true');
  const count=make('span','community-rank-count',String(item.count));
  b.append(document.createTextNode(item.name+' '),icon,count);
  b.onclick=()=>{$('filter').value='';$('topicSort').value=item.id;renderTopics();};
  bar.append(b);
 }
 ranking({id:'liked',name:'Most Liked',icon:'♥',count:rankable.filter(t=>Number(weekly(t.id).week_likes||0)>0).length});
 ranking({id:'popular',name:'Most Viewed',icon:'👑',count:rankable.filter(t=>Number(weekly(t.id).week_views||0)>0).length});
 for(const opt of $('filter').options){
  const value=opt.value;
  const active=currentCategory===value&&(value!==''||!['popular','liked','hall'].includes(currentSort));
  const b=make('button','community-category-tab'+(active?' active':''),value||'ALL');
  b.type='button';b.dataset.tabKey='category:'+value;b.setAttribute('aria-pressed',String(active));
  const n=visible.filter(t=>(!value||t.category===value)&&noticeVisible(t,value,'newest')).length;
  b.append(make('span','',String(n)));
  b.onclick=()=>{$('filter').value=value;$('topicSort').value='newest';renderTopics();};
  bar.append(b);
 }
 ranking({id:'hall',name:'Hall of Fame',icon:'🏆',count:rankable.filter(t=>honorActive(t.id)).length});
 bar.scrollLeft=previousScroll;
 if(focused){const next=Array.from(bar.querySelectorAll('button')).find(b=>b.dataset.tabKey===focused);next?.focus({preventScroll:true});}
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
async function loadTopics(){if(!isMember)return;const [r]=await Promise.all([db.from('pta_topics').select('id,author_id,category,title,body,created_at,is_hidden,is_deleted,edited_at,post_number,community_post_number,is_notice,is_exam_pass,show_siren_badge,public_preview_enabled,public_preview_text,community_language,notice_duration,notice_published_at,notice_expires_at').in('community_language',[communityLanguage,'both']).order('created_at',{ascending:false}),loadMemberNames()]);if(r.error){status((EN?"Could not load discussions: ":'토론을 불러올 수 없습니다: ')+errorMessage(r.error),true);return;}topics=r.data||[];await Promise.all([loadBookmarks(),loadWeeklyStats(),loadReplyCounts()]);renderTopics();
if(window.TYC_Views){try{topicViewMap=await window.TYC_Views.counts('community',topics.map(t=>t.id));renderTopics()}catch(error){console.warn('Community view counts unavailable',error)}}
const deepId=new URLSearchParams(location.search).get('topic');
if(deepId&&/^[0-9a-f-]{36}$/i.test(deepId)){
 const match=topics.find(t=>t.id===deepId&&!t.is_deleted&&!t.is_hidden);
 if(match)await openTopic(match);else {const other=await db.from('pta_topics').select('community_language').eq('id',deepId).eq('is_deleted',false).eq('is_hidden',false).maybeSingle();if(other.data&&other.data.community_language!=='both'&&other.data.community_language!==communityLanguage)location.replace(boardFor(other.data.community_language)+'?topic='+encodeURIComponent(deepId));}
}}
function adminNoticeBadge(){
 const badge=make('span','community-admin-notice-badge','🚨');
 badge.setAttribute('aria-label',(EN?"Flashing announcement siren":'Flashing announcement siren / 공지 사이렌'));
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
 caption.append(examPassBadge(),make('span','',(EN?"Show off your board exam PASS!":'보드시험 합격 자랑하기 · Show off your board exam PASS!')));
 wrap.append(box,caption);
 return {wrap,box};
}
function topicViewBadge(x){const badge=make('span','tyc-view-count tyc-view-count-in-list',window.TYC_Views?.label(topicViewMap.get(x.id))||'— views');badge.dataset.viewId=String(x.id);return badge;}
function displayCommunityTitle(title){return String(title||'').replace(/\*\*/g,'').trim();}
function renderTopics(){
  activeTopic=null;
  show('detail',false);$('topics').classList.remove('hidden');
  $('topics').closest('.community-discussions')?.classList.remove('community-reading-mode');
  const root=$('topics'),q=$('search').value.toLowerCase().trim(),cat=$('filter').value;
  if(!root){status((EN?"Could not find the discussion list. Please refresh.":'게시글 목록을 찾지 못했습니다. 새로고침 후 다시 시도해 주세요.'),true);return;}
  root.replaceChildren();
  const sort=$('topicSort').value;
  const selected=topics.filter(t=>(isAdmin||(!t.is_hidden&&!t.is_deleted&&!noticeExpired(t)))&&noticeVisible(t,cat,sort)&&(!cat||t.category===cat)&&(!q||`${t.title} ${t.body}`.toLowerCase().includes(q))&&(!$('savedOnly').checked||bookmarks.has(t.id)));
  if(sort==='hall')selected.splice(0,selected.length,...selected.filter(t=>!t.is_notice&&honorActive(t.id)));
 selected.sort((a,b)=>{
  if(!!a.is_notice!==!!b.is_notice)return a.is_notice?-1:1;
  if(a.is_notice&&b.is_notice)return new Date(b.created_at)-new Date(a.created_at);
  if(sort!=='hall'&&honorActive(a.id)!==honorActive(b.id))return honorActive(a.id)?-1:1;
  const newest=()=>Number(b.community_post_number??b.post_number??0)-Number(a.community_post_number??a.post_number??0)||new Date(b.created_at)-new Date(a.created_at);
  if(sort==='oldest')return -newest();
  if(sort==='popular')return Number(weekly(b.id).week_views||0)-Number(weekly(a.id).week_views||0)||newest();
  if(sort==='liked')return Number(weekly(b.id).week_likes||0)-Number(weekly(a.id).week_likes||0)||newest();
  if(sort==='hall')return new Date(weekly(b.id).hall_until)-new Date(weekly(a.id).hall_until);
  return newest();
 });
  categoryTabs();scheduleNoticeRefresh();
  const notices=selected.filter(t=>t.is_notice),discussionsOnly=selected.filter(t=>!t.is_notice);
  text('communityTopicCount',discussionsOnly.length+' TOPICS');
  if(!selected.length){root.append(make('p','meta',(EN?"No discussions yet, or no matching results.":'아직 게시글이 없거나 검색 결과가 없습니다.')));return;}
  const heading=make('div','community-board-head');
  for(const label of ['NO.','CATEGORY','DISCUSSION','ID / NAME','POSTED','VIEWS','LIKES'])heading.append(make('span','',label));
  const saveHeading=make('span','community-board-save-heading');
  saveHeading.append(make('span','','SAVE'));
  heading.append(saveHeading);
  const noticeBody=notices.length?noticeSection(root,notices.length):null;
  if(noticeBody){const label=make('div','community-discussion-section-heading');label.append(make('strong','',EN?'COMMUNITY DISCUSSIONS':'COMMUNITY DISCUSSIONS · 게시판'),make('span','',discussionsOnly.length+' TOPICS'));root.append(label);}
  if(discussionsOnly.length)root.append(heading);
  const regularBody=make('div','community-regular-discussions');root.append(regularBody);
  if(!discussionsOnly.length)regularBody.append(make('p','meta',EN?'No discussions yet.':'아직 게시글이 없습니다.'));
  for(const x of selected){
    const wrapper=make('article','topic-entry community-board-row'+(x.is_hidden?' topic-hidden':'')+(honorActive(x.id)?' community-honored-topic':'')+(x.is_notice?' community-notice-row':''));wrapper.dataset.topicId=x.id;
    const postNumber=make('span','community-board-number'+(x.is_notice?' is-notice':''),x.is_notice?'NOTICE':String(x.community_post_number??x.post_number??'—'));
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
    if(excerpt||/data-tyc-(?:path|giphy)/.test(String(x.body))){
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
    const posted=make('time','community-board-date');posted.dateTime=x.created_at;posted.title=niceDate(x.created_at);posted.append(make('span','community-date-full',niceDate(x.created_at)),make('span','community-date-short',new Date(x.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})));
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
      save.title=bookmarks.has(x.id)?(EN?"Remove saved discussion":'Remove saved discussion / 저장 해제'):(EN?"Save discussion":'Save discussion / 저장');
      controls.append(save);
    }
    const actions=make('details','community-board-actions');
    const toggle=make('summary','','⋯');toggle.setAttribute('aria-label','More actions for '+x.title);
    toggle.setAttribute('title',(EN?"More actions":'More actions / 설정'));
    const panel=make('div','community-board-menu');
    if(!x.is_deleted&&!x.is_hidden)panel.append(reportButton('topic',x.id));
    if(isAdmin&&!x.is_deleted){panel.append(noticeActionButton(x));if(x.is_notice)panel.append(noticeScheduleAction(x),sirenActionButton(x));panel.append(topicVisibilityButton(x));}
    if(isAdmin&&x.is_deleted)panel.append(topicRestoreButton(x),topicPermanentDeleteButton(x));
    if(!x.is_deleted&&(isAdmin||x.author_id===user?.id))panel.append(topicOwnerActions(x));
    actions.append(toggle,panel);
    controls.append(actions);
    const meta=make('div','community-board-mobile-meta');meta.append(author,posted,views,likes);wrapper.append(postNumber,category,b,meta,controls);
    if(x.is_notice&&isAdmin){const schedule=make('span','community-notice-schedule-label',noticeExpired(x)?'Expired':x.is_hidden?'Hidden':x.notice_duration==='week'?'1 Week':x.notice_duration==='month'?'1 Month':'Permanent');schedule.title=x.notice_expires_at?'Expires '+niceDate(x.notice_expires_at):'Permanent';category.append(schedule);}
    (x.is_notice?noticeBody:regularBody).append(wrapper);
  }
}
function reportButton(type,id){
  const b=button((EN?"Report":'Report / 신고'),()=>reportContent(type,id));
  b.className='content-report-action';return b;
}
async function reportContent(type,id){
 if(!user||!isMember)return;
 const reason=prompt((EN?"Why are you reporting this content? (5–500 characters)":'신고 사유를 입력해 주세요. (5~500자) / Why are you reporting this content?'),'');
 if(reason===null)return;
 if(reason.trim().length<5||reason.trim().length>500){status((EN?"Enter a reason between 5 and 500 characters.":'신고 사유는 5~500자로 입력해 주세요.'),true);return;}
 const payload={reporter_id:user.id,reason:reason.trim(),topic_id:type==='topic'?id:null,reply_id:type==='reply'?id:null};
 const result=await db.from('pta_content_reports').insert(payload);
 status(result.error?(EN?"Report failed: ":'신고 실패: ')+errorMessage(result.error):(EN?"Report submitted.":'신고가 접수되었습니다. / Report submitted.'),!!result.error);
}
function sirenActionButton(topic){
 const enabled=!!topic.show_siren_badge;
 const b=button(enabled?(EN?"🚨 Remove Siren":'🚨 Remove Siren / 사이렌 해제'):(EN?"🚨 Add Siren":'🚨 Add Siren / 사이렌 추가'),()=>setTopicSiren(topic,!enabled));
 b.className='topic-notice-action';
 return b;
}
async function setTopicSiren(topic,enabled){
 if(!isAdmin||!user||topic.is_deleted||!topic.is_notice)return;
 const r=await db.from('pta_topics').update({show_siren_badge:enabled}).eq('id',topic.id).select('id,show_siren_badge').maybeSingle();
 if(r.error||!r.data){status((EN?"Could not update siren: ":'사이렌 변경 실패: ')+(r.error?errorMessage(r.error):(EN?"Administrator permission required.":'관리자 권한을 확인해 주세요.')),true);return;}
 topic.show_siren_badge=r.data.show_siren_badge;
 status(enabled?(EN?"Siren badge added.":'사이렌 배지를 적용했습니다.'):(EN?"Siren badge removed.":'사이렌 배지를 해제했습니다.'));
 if(activeTopic?.id===topic.id)openTopic(topic);else renderTopics();
}
function noticeActionButton(topic){
 const b=button(topic.is_notice?(EN?"Remove Notice":'Remove Notice / 공지 해제'):(EN?"Set as Notice":'Set as Notice / 공지 지정'),()=>setTopicNotice(topic,!topic.is_notice));
 b.className='topic-notice-action';
 b.setAttribute('aria-label',topic.title+': '+(topic.is_notice?'Remove notice status':'Make an announcement'));
 return b;
}
async function setTopicNotice(topic,makeNotice){
 if(!user||!isAdmin||topic.is_deleted)return;
 const label=makeNotice?'Pin this post as an official notice?':'Remove notice status from this post?';
 if(!confirm(label))return;
 const patch={is_notice:makeNotice,show_siren_badge:makeNotice?!!topic.show_siren_badge:false};if(!makeNotice&&topic.community_language==='both')patch.community_language=communityLanguage;
 const r=await db.from('pta_topics').update(patch).eq('id',topic.id).select('id,is_notice,show_siren_badge,community_language,notice_duration,notice_published_at,notice_expires_at').maybeSingle();
 if(r.error||!r.data){status('Notice update failed: '+(r.error?errorMessage(r.error):'Check administrator permissions'),true);return;}
 topic.is_notice=r.data.is_notice;topic.community_language=r.data.community_language;
 topic.show_siren_badge=r.data.show_siren_badge;Object.assign(topic,{notice_duration:r.data.notice_duration,notice_published_at:r.data.notice_published_at,notice_expires_at:r.data.notice_expires_at});
 status(makeNotice?'Official notice published.':'Notice status removed.');
 if(activeTopic?.id===topic.id)openTopic(topic);else renderTopics();
}
function topicVisibilityButton(topic){
  const b=button(topic.is_hidden?(EN?"Unhide":'Unhide / 다시 공개'):(EN?"Hide":'Hide / 숨기기'),()=>setTopicVisibility(topic,!topic.is_hidden));
  b.className='topic-visibility-action';
  b.setAttribute('aria-label',`${topic.title}: ${topic.is_hidden?(EN?"Unhide":'다시 공개'):(EN?"Hide":'숨기기')}`);
  return b;
}
function topicOwnerActions(topic){
  const row=make('div','owner-actions');
  if(topic.author_id===user?.id||(isAdmin&&topic.is_notice)){
   const edit=button((EN?"Edit":'Edit / 수정'),()=>editTopic(topic));
   edit.classList.add('topic-edit-action');row.append(edit);
  }
  if(isAdmin||topic.author_id===user?.id){
   const remove=button(isAdmin&&topic.author_id!==user?.id
    ?(EN?"Delete post":'Delete post / 관리자 삭제'):(EN?"Delete":'Delete / 삭제'),()=>deleteTopic(topic));
   remove.classList.add('topic-delete-action');
   remove.setAttribute('aria-label','Delete discussion '+topic.title);
   row.append(remove);
  }
  return row;
}
function topicRestoreButton(topic){
  const b=button((EN?"Restore":'Restore / 복구'),()=>restoreTopic(topic));b.className='topic-visibility-action';return b;
}
function topicPermanentDeleteButton(topic){
  const b=button((EN?"Permanently Delete":'Permanently Delete / 영구 삭제'),()=>permanentlyDeleteTopic(topic));
  b.className='topic-permanent-delete-action';
  b.setAttribute('aria-label','Permanently delete '+topic.title);
  return b;
}
async function permanentlyDeleteTopic(topic){
  if(!isAdmin||!user||!topic?.is_deleted)return;
  const warning='Permanently delete post #'+(topic.community_post_number??topic.post_number)+'?\\n\\n'+topic.title+'\\n\\nThis also removes all associated replies, likes, bookmarks, reports and view history. It CANNOT be undone.';
  if(!confirm(warning))return;
  const typed=prompt('FINAL CONFIRMATION: Type DELETE to permanently remove this post and its related data.');
  if(typed!=='DELETE'){if(typed!==null)status('Permanent deletion cancelled: confirmation did not match.');return;}
  const r=await db.rpc('pta_permanently_delete_topic',{p_topic_id:topic.id});
  if(r.error||r.data!==true){status('Permanent deletion failed: '+(r.error?errorMessage(r.error):'Not removed'),true);return;}
  topics=topics.filter(t=>t.id!==topic.id);
  status('Post #'+(topic.community_post_number??topic.post_number)+' permanently deleted.');
  await loadTopics();
}
// This excerpt is intentionally public once the author explicitly opts in.
function autoPublicPreview(body){
 const source=window.TYC_CommunityRich.plain(body);
 const clean=String(source||'').replace(/<[^>]*>/g,' ').replace(/[<>]/g,'').replace(/\*\*/g,'').replace(/\s+/g,' ').trim();
 const excerpt=Array.from(clean).slice(0,280).join('').trim();
 if(excerpt.length>=30)return excerpt;
 const fallback=(EN?"A discussion shared in the PTA/SPTA community. Full content and replies are for approved members.":'PTA/SPTA 커뮤니티에 공유된 게시글입니다. 전체 내용과 댓글은 승인된 회원만 볼 수 있습니다.');
 return excerpt?excerpt+' · '+fallback:fallback;
}
function publicPreviewPayload(enabled,body){
 return {public_preview_enabled:!!enabled,public_preview_text:enabled?autoPublicPreview(body):null};
}
function createPreviewEditor(checked=false){
 const wrap=make('div','community-public-preview-editor');
 const label=make('label','community-preview-consent');
 const enabled=make('input');enabled.type='checkbox';enabled.checked=!!checked;
 label.append(enabled,make('strong','',(EN?"Public search preview (optional)":'검색 공개 미리보기 허용 / Public search preview (optional)')));
 const notice=make('p','community-public-preview-help',(EN?"Automatically shares up to 280 characters publicly, including title and category. Do not include patient or private information. Full post and replies remain members-only.":'선택하면 게시글 앞부분 최대 280자가 미리보기로 자동 공개됩니다. 게시글 제목, 카테고리와 미리보기는 비회원·검색엔진에도 보입니다. 환자 정보·개인정보가 포함되어 있지 않은지 확인해 주세요. 전체 본문과 댓글은 승인된 회원 전용입니다. / Automatically shares the opening excerpt publicly; full post and replies remain members-only.'));
 wrap.append(label,notice);
 return {wrap,enabled,payload:body=>publicPreviewPayload(enabled.checked,body)};
}
// Both the new-post and edit forms use the same persisted rich-text body limit.
// Intervention subcategories are persisted as the canonical title prefix.
const interventionTypes=['Therapeutic Exercise','Manual Therapy','Neuromuscular Re-education','Therapeutic Activities','Gait Training','Modalities','Patient Education & HEP','Other'];
function splitInterventionTitle(value){
 const title=String(value||'').trim();
 const type=interventionTypes.find(t=>title.startsWith('['+t+']'));
 return {type:type||'',title:type?title.slice(type.length+2).trim():title};
}
function interventionTitle(type,title){return '['+type+'] '+splitInterventionTitle(title).title;}
function mountInterventionPicker(category,input,initialTitle=''){
 const field=make('label','intervention-picker',EN?'Intervention Type':'Intervention Type / 치료 유형');
 const select=make('select');select.setAttribute('aria-label',EN?'Intervention Type':'Intervention Type / 치료 유형');
 const placeholder=make('option','',EN?'Select an intervention type':'치료 유형을 선택하세요');placeholder.value='';select.append(placeholder);
 for(const type of interventionTypes){const o=make('option','',type);o.value=type;select.append(o);}
 field.append(select);
 const preview=make('div','intervention-title-preview');preview.setAttribute('aria-live','polite');
 const guidance=make('small','',EN?'The selected type is automatically added before your title.':'선택한 치료 유형이 제목 앞에 자동으로 추가됩니다.');
 const example=make('strong','');preview.append(guidance,example);
 const privacy=make('small','intervention-privacy',EN?'Share treatment approaches within the PT’s plan of care. Do not include patient identifiers.':'PT가 수립한 치료 계획 범위 내에서 치료 방법을 공유해 주세요. 환자 식별 정보는 포함하지 마세요.');
 preview.append(privacy);
 category.closest('label').insertAdjacentElement('afterend',field);
 input.closest('label').insertAdjacentElement('afterend',preview);
 if(category.value==='Interventions'){const parsed=splitInterventionTitle(initialTitle);select.value=parsed.type;input.value=parsed.title;}
 function sync(){
  const active=category.value==='Interventions';field.hidden=preview.hidden=!active;select.disabled=!active;select.required=active;
  const prefix=active&&select.value?'['+select.value+'] ':'';
  input.maxLength=150-prefix.length;
  const entered=active?splitInterventionTitle(input.value).title:input.value.trim();
  example.textContent=prefix+(entered||(EN?'Your discussion title':'게시글 제목'));
  input.setCustomValidity(entered.length>input.maxLength?(EN?'Shorten the title to fit the 150-character limit including its intervention type.':'치료 유형을 포함한 제목은 150자 이내여야 합니다.'):'');
 }
 function finalTitle(){
  sync();
  return category.value==='Interventions'?interventionTitle(select.value,input.value):input.value.trim();
 }
 category.addEventListener('change',sync);select.addEventListener('change',sync);input.addEventListener('input',sync);
 input.form?.addEventListener('reset',()=>queueMicrotask(sync));
 sync();return {sync,finalTitle,select};
}
let composeInterventionPicker=null;
function topicBodyValidation(title,html,editor){
 if(Array.from(splitInterventionTitle(title).title).length<4)return EN?'Enter a title of at least 4 characters.':'제목을 4자 이상 입력해 주세요.';
 if(Array.from(title.trim()).length>150)return EN?'Title must be 150 characters or fewer, including the intervention type.':'치료 유형을 포함한 제목은 150자 이내여야 합니다.';
 if(editor.busy())return EN?'Finish image uploads before saving.':'이미지 업로드를 완료한 후 저장해 주세요.';
 if(!editor.plain()&&!html.includes('data-tyc-path')&&!html.includes('data-tyc-giphy'))return EN?'Enter content or add an image or GIF.':'본문을 입력하거나 이미지 또는 GIF를 추가해 주세요.';
 const length=Array.from(html.trim()).length;
 if(length<10)return EN?'Content must contain at least 10 characters.':'본문은 최소 10자 이상이어야 합니다.';
 if(length>30000)return EN?'Content exceeds the 30,000-character limit including formatting. Shorten the content or simplify formatting, then try again.':'본문이 서식을 포함해 30,000자를 초과합니다. 내용이나 서식을 줄인 후 다시 저장해 주세요.';
 return '';
}
function editTopic(topic){
  if(!user||(! (isAdmin&&topic.is_notice)&&topic.author_id!==user.id)||topic.is_deleted)return;
  const dialog=make('dialog','edit-topic-dialog');
  const form=make('form','stack');
  const title=make('h2','',(EN?"Edit Discussion":'Edit Discussion / 게시글 수정'));
  const top=make('div','edit-topic-top');const topActions=make('div','edit-topic-top-actions');
  const topSave=make('button','btn primary edit-topic-top-save',(EN?"Save Changes":'Save Changes / 수정 완료'));topSave.type='submit';
  const close=make('button','edit-topic-top-close','×');close.type='button';close.setAttribute('aria-label',(EN?"Close editor":'Close editor / 닫기'));close.onclick=()=>dialog.close();
  topActions.append(topSave,close);top.append(title,topActions);
  const categoryLabel=make('label','',(EN?"Category":'Category / 카테고리'));
  const category=make('select');
  for(const name of ['General','PTA Career','PT/PTA School','Compensation & Benefits','License & Exam','CEU','Clinical Discussion','Interventions','Resources']){
    const option=make('option','',name);option.value=name;category.append(option);
  }
  category.value=topic.category;categoryLabel.append(category);
  const examOption=examBadgeSelector(null,topic.is_exam_pass);
  const syncExamOption=()=>{const on=category.value==='License & Exam';examOption.wrap.hidden=!on;if(!on)examOption.box.checked=false;};
  category.onchange=syncExamOption;syncExamOption();
  const titleLabel=make('label','',(EN?"Title":'Title / 제목'));const titleInput=make('input');
  titleInput.required=true;titleInput.minLength=4;titleInput.maxLength=150;titleInput.value=topic.title;titleLabel.append(titleInput);
  const bodyLabel=make('div','community-compose-field');const bodyName=make('label','',(EN?"Content":'Content / 내용'));const bodyHost=make('div');bodyLabel.append(bodyName,bodyHost);let body;
  const previewEditor=createPreviewEditor(topic.public_preview_enabled);
  const destination=isAdmin&&topic.is_notice?noticeDestinationControl(topic.community_language):null;
  // The sticky header already provides save and close; no duplicate footer.
  const note=make('p','meta');note.setAttribute('role','status');form.append(top,categoryLabel,examOption.wrap,titleLabel);const interventionPicker=mountInterventionPicker(category,titleInput,topic.title);if(destination)form.append(destination.wrap);form.append(bodyLabel,previewEditor.wrap,note);
  form.onsubmit=async e=>{
    e.preventDefault();if(topSave.disabled||!form.reportValidity())return;
    const newTitle=interventionPicker.finalTitle(),newBody=body.value();
    const validation=topicBodyValidation(newTitle,newBody,body);if(validation){note.textContent=validation;note.scrollIntoView({block:'center'});return;}
    topSave.disabled=true;
    const patch={category:category.value,title:newTitle,body:newBody,is_exam_pass:category.value==='License & Exam'&&examOption.box.checked,...previewEditor.payload(newBody)};if(destination)patch.community_language=destination.select.value;
    let query=db.from('pta_topics').update(patch).eq('id',topic.id).eq('is_deleted',false);if(!(isAdmin&&topic.is_notice))query=query.eq('author_id',user.id);const r=await query.select('id,community_language');
    if(r.error||!r.data?.length){note.textContent=(EN?"Edit failed: ":'수정 실패: ')+(r.error?errorMessage(r.error):(EN?"Check your editing permission.":'수정 권한을 확인해 주세요.'));topSave.disabled=false;note.scrollIntoView({block:'center'});return;}
    dialog.close();
    const target=r.data[0].community_language;if(destination&&target!==communityLanguage&&target!=='both'){const u=new URL(location.href);u.searchParams.delete('topic');history.replaceState(null,'',u);await loadTopics();status((EN?'Notice moved to ':'공지를 다음 게시판으로 이동했습니다: ')+noticeDestinationLabel(target));return;}
    status((EN?"Discussion updated.":'게시글을 수정했습니다.'));
    await loadTopics();
    const updatedTopic=topics.find(item=>item.id===topic.id);
    if(updatedTopic)await openTopic(updatedTopic);
    else status((EN?"Saved, but the discussion could not reopen. Refresh the list.":'게시글은 저장되었지만 상세 화면을 다시 열지 못했습니다. 목록을 새로고침해 주세요.'),true);
  };
  dialog.append(form);document.body.append(dialog);body=window.TYC_CommunityRich.mount(bodyHost,topic.body,db,user);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
}
async function deleteTopic(topic){
  if(!user||topic.is_deleted||(!isAdmin&&topic.author_id!==user.id))return;
  const isOtherMember=isAdmin&&topic.author_id!==user.id;
  const warning=(isOtherMember?(EN?"You are deleting another member's post as an administrator.\n\n":'관리자로서 다른 회원의 게시글을 삭제합니다.\n\n'):'')
   +'#'+(topic.community_post_number??topic.post_number)+' · '+topic.title
   +(EN?"\n\nDelete this discussion? It and its replies will be hidden from members. Administrators can restore it.":'\n\n이 게시글을 삭제할까요? 회원 목록에서 사라지며 댓글도 보이지 않지만 관리자는 복구할 수 있습니다.');
  if(!confirm(warning))return;
  const r=await db.rpc('pta_delete_own_topic',{p_topic_id:topic.id});
  if(r.error||r.data!==true){status((EN?"Delete failed: ":'게시글 삭제 실패: ')+(r.error?errorMessage(r.error):(EN?"Check author and membership permissions.":'작성자 및 회원 권한을 확인해 주세요.')),true);return;}
  status((EN?"Discussion deleted.":'게시글을 삭제했습니다.'));await loadTopics();
}
async function restoreTopic(topic){
  if(!isAdmin||!topic.is_deleted)return;
  if(!confirm((EN?"Restore this deleted discussion and its replies?":'삭제된 게시글을 복구할까요? 기존 댓글도 다시 표시됩니다.')))return;
  const r=await db.from('pta_topics').update({is_deleted:false}).eq('id',topic.id).select('id');
  if(r.error||!r.data?.length){status((EN?"Restore failed: ":'복구 실패: ')+(r.error?errorMessage(r.error):(EN?"Administrator permission required.":'관리자 권한을 확인해 주세요.')),true);return;}
  status((EN?"Discussion restored.":'게시글을 복구했습니다.'));await loadTopics();
}
async function setTopicVisibility(topic,hidden){
  if(!isAdmin||!user)return;
  const question=hidden
    ? (EN?"Hide this discussion and its replies from members? It can be restored later.":'이 게시글을 숨길까요? 일반 회원에게는 보이지 않지만 글과 댓글은 그대로 보관되며 다시 공개할 수 있습니다.')
    : (EN?"Make this discussion and its replies visible again?":'이 게시글을 다시 공개할까요? 글과 댓글이 회원들에게 다시 표시됩니다.');
  if(!confirm(question))return;
  const r=await db.from('pta_topics').update({is_hidden:hidden}).eq('id',topic.id).select('id,is_hidden,notice_duration,notice_published_at,notice_expires_at').maybeSingle();
  if(r.error){status((EN?"Could not change discussion visibility: ":'게시글 상태 변경 실패: ')+errorMessage(r.error),true);return;}
  if(!r.data){status((EN?"Could not change discussion visibility. Check administrator permissions.":'게시글을 변경하지 못했습니다. Supabase 관리자 권한과 SQL 정책을 확인해 주세요.'),true);return;}
  Object.assign(topic,r.data);
  status(hidden?(EN?"Discussion hidden. It can be restored anytime.":'게시글을 숨겼습니다. 언제든 다시 공개할 수 있습니다.'):(EN?"Discussion is visible again.":'게시글을 다시 공개했습니다.'));
  if(activeTopic?.id===topic.id){
    openTopic(topic);
  }else renderTopics();
}
async function openTopic(x,addHistory=false){
  if((x.is_hidden||x.is_deleted||noticeExpired(x))&&!isAdmin){status((EN?"This discussion is unavailable.":'열람할 수 없는 게시글입니다.'),true);return;}
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
   const link=make('a','community-public-share-link',(EN?"↗ Public preview":'↗ Public preview / 공개 미리보기 링크'));
   link.href='discussion.html?id='+encodeURIComponent(x.id);
   $('detailTitle').insertAdjacentElement('afterend',link);
  }
  text('detailMeta',`${x.is_notice?'NOTICE':'#'+(x.community_post_number??x.post_number)} · ${x.category} · `);const detailName=make('span','',displayName(x.author_id));if(!x.is_deleted){detailName.dataset.tycMember=x.author_id;detailName.tabIndex=0;detailName.setAttribute('role','button');}$('detailMeta').append(detailName);
  const detailBadge=verifiedBadge(x.author_id);
  if(detailBadge)$('detailMeta').append(' ',detailBadge);
  $('detailMeta').append(document.createTextNode(` · ${niceDate(x.created_at)}${isAdmin&&x.edited_at?' · (Edited)':''}${x.is_deleted?(EN?" · Deleted":' · Deleted / 삭제됨'):x.is_hidden?(EN?" · Hidden":' · Hidden / 숨김'):''}`));
  window.TYC_CommunityRich.render($('detailBody'),x.body,db);const oldNotice=$('detail').querySelector('.topic-detail-notice');if(oldNotice)oldNotice.remove();const priorLike=$('detail').querySelector('.topic-detail-like');if(priorLike)priorLike.remove();const priorHonor=$('detail').querySelector('.topic-detail-honor');if(priorHonor)priorHonor.remove();if(honorActive(x.id)){const badge=honorBadge(x);badge.classList.add('topic-detail-honor');$('detailMeta').insertAdjacentElement('beforebegin',badge);}if(!x.is_hidden&&!x.is_deleted)$('detailMeta').insertAdjacentElement('afterend',likeButton(x,true));const priorBookmark=$('detail').querySelector('.topic-detail-bookmark');if(priorBookmark)priorBookmark.remove();if(!x.is_hidden&&!x.is_deleted){$('detailMeta').insertAdjacentElement('afterend',bookmarkButton(x,true));}let viewEl=$('detail').querySelector('.tyc-topic-detail-views');if(!viewEl){viewEl=make('span','tyc-view-count tyc-view-count-detail tyc-topic-detail-views');$('detailMeta').insertAdjacentElement('afterend',viewEl)}viewEl.textContent=window.TYC_Views?.label(topicViewMap.get(x.id))||'— views';if(window.TYC_Views)window.TYC_Views.record('community',x.id).then(n=>{if(n!==null){topicViewMap.set(x.id,n);if(activeTopic?.id===x.id)viewEl.textContent=window.TYC_Views.label(n)}});if(!x.is_hidden&&!x.is_deleted)db.rpc('pta_track_weekly_topic_view',{p_topic_id:x.id}).then(({error})=>{if(error)console.warn('Weekly view recording unavailable',error.message);});
  // Insert the moderation control without changing community.html.
  const detail=$('detail'),old=detail.querySelector('.topic-detail-visibility');if(old)old.remove();const oldReport=detail.querySelector('.topic-detail-report');if(oldReport)oldReport.remove();
  if(!x.is_hidden&&!x.is_deleted){const report=reportButton('topic',x.id);report.classList.add('topic-detail-report');$('detailBody').insertAdjacentElement('afterend',report);}
  if(isAdmin){const action=x.is_deleted?topicRestoreButton(x):topicVisibilityButton(x);action.classList.add('topic-detail-visibility');
    const body=$('detailBody');body.insertAdjacentElement('afterend',action);const oldDelete=detail.querySelector('.topic-detail-permanent-delete');if(oldDelete)oldDelete.remove();if(x.is_deleted){const hardDelete=topicPermanentDeleteButton(x);hardDelete.classList.add('topic-detail-permanent-delete');body.insertAdjacentElement('afterend',hardDelete);}detail.querySelectorAll('.topic-detail-notice-action').forEach(n=>n.remove());const oldSirenAction=detail.querySelector('.topic-detail-siren-action');if(oldSirenAction)oldSirenAction.remove();if(!x.is_deleted){const notice=noticeActionButton(x);notice.classList.add('topic-detail-notice-action');body.insertAdjacentElement('afterend',notice);if(x.is_notice){const siren=sirenActionButton(x);siren.classList.add('topic-detail-siren-action');body.insertAdjacentElement('afterend',siren);const schedule=noticeScheduleAction(x);schedule.classList.add('topic-detail-notice-action');body.insertAdjacentElement('afterend',schedule);}}}
  // Both action rows use the existing ownership checks and edit/delete handlers.
  detail.querySelectorAll('.topic-detail-owner').forEach(row=>row.remove());
  if(user&&!x.is_deleted&&(isAdmin||x.author_id===user.id)){
    const actions=topicOwnerActions(x);actions.classList.add('topic-detail-owner');$('detailBody').insertAdjacentElement('afterend',actions);
    const toolbar=detail.querySelector('.topic-detail-toolbar');
    if(toolbar){const topActions=topicOwnerActions(x);topActions.classList.add('topic-detail-owner','topic-detail-owner-top');toolbar.append(topActions);}
  }
  requestAnimationFrame(()=>detail.scrollIntoView({behavior:'auto',block:'start'}));await loadReplies();
}
// Replies: a top-level reply plus up to 5 nested replies.
async function loadReplies(){
  if(!activeTopic)return;
  const topicId=activeTopic.id;
  const r=await db.from('pta_replies').select('id,author_id,body,created_at,parent_id,edited_at,is_hidden,is_deleted').eq('topic_id',topicId).order('created_at',{ascending:true});
  if(!activeTopic||activeTopic.id!==topicId)return;
  const root=$('replies');if(!root){status((EN?"Could not find replies. Please refresh.":'댓글 영역을 찾지 못했습니다. 페이지를 새로고침해 주세요.'),true);return;}root.replaceChildren();
  if(r.error){root.append(make('p','meta',(EN?"Could not load replies: ":'답글을 불러오지 못했습니다: ')+errorMessage(r.error)));return;}
  const data=r.data||[];
  // Keep the list badge current after posting, editing or deleting a reply.
  replyCountMap.set(topicId,data.filter(item=>!item.is_hidden||isAdmin).length);
  if(!data.length){root.append(make('p','meta',(EN?"No replies yet.":'아직 답글이 없습니다.')));return;}
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
    if(item.is_deleted)content.textContent=(EN?"This reply was deleted.":'댓글이 삭제되었습니다.');
    else if(item.is_hidden)content.textContent=(EN?"This reply is hidden by a moderator.":'This reply is hidden by a moderator. / 관리자가 숨긴 댓글입니다.');
    else if(window.TYC_CommunityReactions)window.TYC_CommunityReactions.renderReply(content,item.body,db);
    else content.textContent=item.body;
    const replyMeta=make('p','meta');const replyName=make('span','',item.is_deleted?(EN?"Deleted":'Deleted / 삭제됨'):displayName(item.author_id));if(!item.is_deleted){replyName.dataset.tycMember=item.author_id;replyName.tabIndex=0;replyName.setAttribute('role','button');}replyMeta.append(replyName);
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
      const edit=button((EN?"Edit":'Edit / 수정'),()=>{});edit.className='reply-edit-action';
      const holder=make('div','reply-composer hidden');const form=make('form','stack');
      const label=make('label','',(EN?"Edit Reply":'Edit Reply / 댓글 수정'));const area=make('textarea');
      area.required=true;area.minLength=2;area.maxLength=4000;area.rows=3;area.value=item.body;label.append(area);
      window.TYC_CommunityReactions?.attach({
       host:label,db,user,
       onEmoji:emoji=>window.TYC_CommunityReactions.insertAtCaret(area,emoji),
       onGif:path=>window.TYC_CommunityReactions.insertAtCaret(area,'\n'+window.TYC_CommunityReactions.replyToken(path)+'\n'),
       onGiphy:id=>window.TYC_CommunityReactions.insertAtCaret(area,'\n'+window.TYC_CommunityReactions.giphyToken(id)+'\n')
      });
      const actions=make('div','actions');const submit=make('button','btn primary',(EN?"Save":'Save / 저장'));submit.type='submit';
      const cancel=button((EN?"Cancel":'Cancel / 취소'),()=>holder.classList.add('hidden'));actions.append(submit,cancel);
      const note=make('p','meta');note.setAttribute('role','status');form.append(label,actions,note);
      form.onsubmit=async e=>{
        e.preventDefault();if(!form.reportValidity())return;
        if(area.value.trim().length<2){note.textContent=(EN?"Replies must contain at least 2 characters.":'댓글은 2글자 이상이어야 합니다.');return;}
        submit.disabled=true;
        const result=await db.from('pta_replies').update({body:area.value.trim()}).eq('id',item.id).eq('author_id',user.id).eq('topic_id',topicId).select('id');
        if(result.error||!result.data?.length){note.textContent=(EN?"Edit failed: ":'수정 실패: ')+(result.error?errorMessage(result.error):(EN?"Check your permissions.":'권한을 확인해 주세요.'));submit.disabled=false;return;}
        status((EN?"Reply updated.":'댓글을 수정했습니다.'));await loadReplies();
      };
      holder.append(form);edit.onclick=()=>{const open=holder.classList.contains('hidden');holder.classList.toggle('hidden',!open);if(open)area.focus();};
      replyActions.append(edit);box.append(holder);
    }
    // Authors and administrators can soft-delete replies without affecting nested replies.
    if(!item.is_deleted && !activeTopic.is_deleted && user && (isAdmin || item.author_id===user.id)){
      const remove=button((EN?"Delete":'Delete / 삭제'),async()=>{
        if(!activeTopic||activeTopic.id!==topicId)return;
        const hasChildren=(children.get(item.id)||[]).length>0;
        const question=hasChildren
          ? (EN?"Delete this reply and keep nested replies?":'이 댓글만 삭제하고 아래 대댓글은 그대로 유지할까요?')
          : (EN?"Delete this reply?":'이 댓글을 삭제할까요?');
        if(!confirm(question))return;
        remove.disabled=true;
        const result=await db.rpc('pta_soft_delete_reply',{p_reply_id:item.id});
        if(result.error||result.data!==true){
          status((EN?"Could not delete reply: ":'댓글 삭제 실패: ')+(result.error?errorMessage(result.error):(EN?"Author permission required.":'작성자 권한을 확인해 주세요.')),true);
          remove.disabled=false;
          return;
        }
        status((EN?"Reply deleted. Nested replies remain.":'댓글이 삭제되었습니다. 대댓글은 그대로 유지됩니다.'));
        await loadReplies();
      });
      remove.className='reply-delete-action';
      replyActions.append(remove);
    }
    // Permanent removal is restricted to administrators and previously
    // soft-deleted replies; removing a parent cascades to all nested replies.
    if(isAdmin&&item.is_deleted){
      const hardDelete=button((EN?"Permanently Delete":'Permanently Delete / 영구 삭제'),async()=>{
        if(!activeTopic||activeTopic.id!==topicId)return;
        const hasChildren=(children.get(item.id)||[]).length>0;
        const warning=(EN?"PERMANENT DELETE":'PERMANENT DELETE / 댓글 영구 삭제\n\n')
          +(EN?"This cannot be undone.":'This cannot be undone. / 복구할 수 없습니다.\n')
          +(hasChildren?(EN?"Nested replies and reports will also be deleted.":'Nested replies and reports will also be deleted. / 연결된 대댓글과 신고 기록도 함께 삭제됩니다.\n'):'')
          +'Proceed with permanent removal?';
        if(!confirm(warning))return;
        const typed=prompt('FINAL CONFIRMATION: Type DELETE to permanently remove this reply'+(hasChildren?' and its descendants':'')+'.');
        if(typed!=='DELETE'){if(typed!==null)status('Permanent deletion cancelled.');return;}
        hardDelete.disabled=true;
        const result=await db.rpc('pta_admin_permanently_delete_reply',{p_reply_id:item.id});
        if(result.error||result.data!==true){
          status((EN?"Permanent deletion failed: ":'댓글 영구 삭제 실패: ')+(result.error?errorMessage(result.error):'Administrator permission required'),true);
          hardDelete.disabled=false;return;
        }
        status((EN?"Reply permanently deleted.":'댓글이 영구 삭제되었습니다. / Reply permanently deleted.'));
        await loadReplies();
      });
      hardDelete.className='reply-permanent-delete-action';
      replyActions.append(hardDelete);
    }
    if(depth<5&&!activeTopic.is_deleted&&!item.is_hidden){
      const action=button((EN?"Reply":'Reply / 답글'),()=>{});
      action.className='reply-action';
      action.setAttribute('aria-expanded','false');
      const holder=make('div','reply-composer hidden');
      const form=make('form','stack');
      const label=make('label','',(EN?"Reply":'Reply / 답글'));
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
      const cancel=button((EN?"Cancel":'Cancel / 취소'),()=>{holder.classList.add('hidden');action.setAttribute('aria-expanded','false');});
      actions.append(submit,cancel);
      const note=make('p','meta');note.setAttribute('role','status');
      form.append(label,actions,note);
      form.onsubmit=async e=>{
        e.preventDefault();if(!form.reportValidity())return;
        submit.disabled=true;note.textContent='Posting reply...';
        const err=await saveReply(textarea.value,item.id);
        if(err){note.textContent=(EN?"Could not save reply: ":'답글 저장 실패: ')+err;submit.disabled=false;return;}
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
  if(!isMember||!activeTopic||!user||activeTopic.is_deleted)return (EN?"Check membership access and the discussion.":'회원 권한 또는 게시글을 확인해 주세요.');
  const content=String(body||'').trim();
  if(content.length<2||content.length>4000)return (EN?"Replies must contain 2–4,000 characters.":'댓글은 2~4,000자 사이여야 합니다.');
  const r=await db.from('pta_replies').insert({topic_id:activeTopic.id,author_id:user.id,body:content,parent_id:parentId});
  return r.error?errorMessage(r.error):null;
}
function composeMessage(message=''){const el=$('topicComposeMessage');el.textContent=message;el.hidden=!message;if(message&&$('topicDialog').open)el.scrollIntoView({block:'center'});}
function setComposePublishing(busy){
 composePublishing=busy;
 for(const id of ['topicTopPost','topicTopCancel','topicDiscardPost','topicDiscardCancel'])$(id).disabled=busy;
}
function resetTopicComposer(){
 $('topicForm').reset();composeInterventionPicker?.sync();show('topicExamPassArea',false);show('compensationHint',false);
 $('topicSirenBadge').disabled=true;
 if(composeNoticeDestination){composeNoticeDestination.select.value=communityLanguage;if(composeNoticeDuration)composeNoticeDuration.value='permanent';syncComposeNoticeDestination();}
 composeRich?.set('');composeMessage();
}
function setupTopicComposerDismissal(){
 const dialog=$('topicDialog'),confirm=$('topicDiscardDialog'),form=$('topicForm');
 let outsidePressed=false;
 function ask(){
  if(composePublishing)return;
  if(composeRich?.busy()){composeMessage(EN?'Please wait for image uploads to finish.':'이미지 업로드가 끝날 때까지 기다려 주세요.');return;}
  if(!confirm.open)confirm.showModal();
 }
 function outside(e){const r=dialog.getBoundingClientRect();return e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);}
 $('topicTopCancel').addEventListener('click',ask);
 dialog.addEventListener('cancel',e=>{e.preventDefault();ask();});
 dialog.addEventListener('pointerdown',e=>{outsidePressed=e.button===0&&outside(e);});
 dialog.addEventListener('pointercancel',()=>{outsidePressed=false;});
 dialog.addEventListener('click',e=>{const dismiss=outsidePressed&&outside(e);outsidePressed=false;if(dismiss&&dialog.open)ask();});
 $('topicDiscardKeep').addEventListener('click',()=>confirm.close());
 $('topicDiscardCancel').addEventListener('click',()=>{if(composePublishing||composeRich?.busy())return;confirm.close();resetTopicComposer();dialog.close();});
 $('topicDiscardPost').addEventListener('click',()=>{if(composePublishing)return;confirm.close();form.requestSubmit($('topicTopPost'));});
 confirm.addEventListener('cancel',e=>{e.preventDefault();confirm.close();});
 dialog.addEventListener('close',()=>{outsidePressed=false;if(confirm.open)confirm.close();});
}
async function newTopic(e){
e.preventDefault();if(!isMember||!composeRich||composePublishing)return;
composeMessage();
if(!e.currentTarget.reportValidity())return;
const title=composeInterventionPicker.finalTitle(),body=composeRich.value();
const validation=topicBodyValidation(title,body,composeRich);if(validation){composeMessage(validation);return;}
setComposePublishing(true);
try{
const previewChoice=$('topicPreviewEnabled').checked;
const createPayload={community_language:communityLanguage,author_id:user.id,category:$('topicCategory').value,title,body,is_exam_pass:$('topicCategory').value==='License & Exam'&&$('topicExamPass').checked,...publicPreviewPayload(previewChoice,body)};
if(isAdmin){createPayload.is_notice=$('topicIsNotice').checked;createPayload.show_siren_badge=createPayload.is_notice&&$('topicSirenBadge').checked;if(createPayload.is_notice&&composeNoticeDestination){createPayload.community_language=composeNoticeDestination.select.value;createPayload.notice_duration=composeNoticeDuration?.value||'permanent';}}
const r=await db.from('pta_topics').insert(createPayload).select('id,author_id,category,title,body,created_at,is_hidden,is_deleted,edited_at,post_number,community_post_number,is_notice,is_exam_pass,show_siren_badge,public_preview_enabled,public_preview_text,community_language,notice_duration,notice_published_at,notice_expires_at').single();
if(r.error)throw r.error;
const published=r.data;
$('topicDialog').close();resetTopicComposer();
status(createPayload.is_notice?'Official notice published · '+noticeDestinationLabel(createPayload.community_language):(EN?'Discussion published.':'게시글을 등록했습니다.'));
if(published.community_language!=='both'&&published.community_language!==communityLanguage){
 location.assign(boardFor(published.community_language)+'?topic='+encodeURIComponent(published.id));
 return;
}
// Persist the newly created topic in browser history before refreshing the list.
pushTopicRoute(published.id);
topics=[published,...topics.filter(t=>t.id!==published.id)];
try{
 await loadTopics();
 // If the directory refresh fails, the returned, successfully inserted row is still available.
 if(activeTopic?.id!==published.id&&new URLSearchParams(location.search).get('topic')===published.id){
  const fresh=topics.find(t=>t.id===published.id)||published;
  if(!topics.some(t=>t.id===published.id))topics.unshift(published);
  await openTopic(fresh);
 }
}catch(error){
 console.warn('Published discussion detail refresh failed',error);
 if(new URLSearchParams(location.search).get('topic')===published.id&&activeTopic?.id!==published.id){
  try{await openTopic(published);}catch{status(EN?'Discussion published. Refresh this page to view it.':'게시글은 등록되었습니다. 새로고침하면 확인할 수 있습니다.',true);}
 }
}
}catch(err){const message=(EN?'Unable to publish discussion: ':'게시글 등록 실패: ')+errorMessage(err);if($('topicDialog').open)composeMessage(message);else status(message,true);}
finally{setComposePublishing(false);}
}
async function reply(e){e.preventDefault();if(!isMember||!activeTopic)return;
const submit=$('replyForm').querySelector('[type="submit"]');submit.disabled=true;
try{const err=await saveReply($('replyBody').value);if(err){status((EN?"Could not save reply: ":'답글 저장 실패: ')+err,true);return;}
$('replyForm').reset();status((EN?"Reply posted.":'답글이 등록되었습니다.'));await loadReplies();}
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
async function init(){setupDiscussionMenuDismissal();const stateEl=$('licenseState'),studentStateEl=$('studentState'),residenceEl=$('ptaResidenceState');for(const code of states){const label=stateNames[code]+' ('+code+')';const licenseOption=make('option','',label);licenseOption.value=code;stateEl.append(licenseOption);const studentOption=make('option','',label);studentOption.value=code;studentStateEl.append(studentOption);residenceEl.append(studentOption.cloneNode(true))}stateEl.value='';studentStateEl.value='';residenceEl.value='';if(!valid){status((EN?"Public connection configuration is unavailable. Do not enter a secret key.":'Supabase 공개 연결 설정을 확인해 주세요. Secret Key는 입력하면 안 됩니다.'),true);return;}db=window.supabase.createClient(projectURL,pubkey);
function openVerification(type){if(!user||memberRow||isAdmin)return;$('memberType').value=type;applicantTypeChanged();$('verifyFormTitle').textContent=type+' Verification / '+(type==='PTA'?(EN?"License verification":'면허 인증'):(EN?"Enrollment verification":'재학 인증'));$('verifyPTA').setAttribute('aria-pressed',String(type==='PTA'));$('verifySPTA').setAttribute('aria-pressed',String(type==='SPTA'));show('verifyArea',false);show('requestArea',true);$('requestArea').scrollIntoView({block:'start'});$('displayName').focus({preventScroll:true});}if($('verifyPTA'))$('verifyPTA').onclick=()=>openVerification('PTA');if($('verifySPTA'))$('verifySPTA').onclick=()=>openVerification('SPTA');if($('verifyBack'))$('verifyBack').onclick=()=>{if(upgradeMode){resetUpgradeForm();show('requestArea',false);show('memberArea',true);$('ptaUpgradeButton')?.focus();return;}show('requestArea',false);show('verifyArea',true);$('verifyPTA').focus();};
$('displayName').addEventListener('input',clearNicknameCheck);$('checkNickname').addEventListener('click',checkNickname);$('memberType').onchange=applicantTypeChanged;$('studentProof').addEventListener('change',proofFileChanged);applicantTypeChanged();$('requestForm').onsubmit=apply;composeNoticeDestination=noticeDestinationControl(communityLanguage);composeNoticeDuration=noticeDurationControl();$('topicNoticeArea').append(composeNoticeDestination.wrap,composeNoticeDuration.wrap);syncComposeNoticeDestination();$('composeBtn').onclick=()=>{$('topicNoticeArea').hidden=!isAdmin;$('topicIsNotice').checked=false;$('topicSirenBadge').checked=false;$('topicSirenBadge').disabled=true;composeNoticeDestination.select.value=communityLanguage;if(composeNoticeDuration)composeNoticeDuration.value='permanent';syncComposeNoticeDestination();$('topicExamPass').checked=false;$('topicPreviewEnabled').checked=false;show('topicExamPassArea',$('topicCategory').value==='License & Exam');composeRich=window.TYC_CommunityRich.mount($('topicRichHost'),'',db,user);composeInterventionPicker?.sync();composeMessage();$('topicDialog').showModal();};composeInterventionPicker=mountInterventionPicker($('topicCategory'),$('topicTitle'));$('topicForm').onsubmit=newTopic;setupTopicComposerDismissal();$('topicIsNotice').addEventListener('change',()=>{const checked=$('topicIsNotice').checked;$('topicSirenBadge').disabled=!checked;if(!checked)$('topicSirenBadge').checked=false;syncComposeNoticeDestination();});
$('topicCategory').addEventListener('change',()=>{
  const exam=$('topicCategory').value==='License & Exam';show('topicExamPassArea',exam);if(!exam)$('topicExamPass').checked=false;
  const compensation=$('topicCategory').value==='Compensation & Benefits';
  show('compensationHint',compensation);
  if(compensation && composeRich && !composeRich.plain()){
    composeRich.set([
      (EN?"State / City: ":'State / City (지역): '),
      'Setting (Outpatient / HH / SNF / Hospital / Other): ',
      (EN?"Years of experience: ":'Experience (경력 연수): '),
      'Employment (W-2 / 1099 / PRN): ',
      (EN?"Pay (hourly / per visit / annual, before tax): ":'Pay (시급 / 방문당 / 연봉, 세전 기준): '),
      (EN?"Benefits / bonus (optional): ":'Benefits / Bonus (선택): '),
      (EN?"Additional notes (optional): ":'Additional notes (선택): ')
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
});$('search').oninput=renderTopics;$('filter').onchange=()=>{if(matchMedia('(max-width:760px)').matches)$('topicSort').value='newest';renderTopics();};$('topicSort').onchange=renderTopics;$('savedOnly').onchange=renderTopics;$('logoutBtn').onclick=logout;$('accountLogout').onclick=logout;
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden){
  if(isMember)refreshNoticeDirectory();
  refreshWeekIfNeeded();
  document.querySelectorAll('.community-new-badge[data-expiry]').forEach(badge=>{
   if(Date.now()>=Number(badge.dataset.expiry))badge.remove();
  });
 }
});setInterval(()=>{if(!document.hidden)refreshWeekIfNeeded();},120000);
await refresh();db.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(refresh,0)});}
init().catch(e=>status((EN?"Error: ":'오류: ')+errorMessage(e),true));
})();
