/* Admin dashboard: authorization enforced by Supabase RLS and user/admin lookup. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
const setMessage=(text,error=false)=>{const n=$('admin-message');n.textContent=text;n.classList.toggle('error',error);n.hidden=false;};
let db,user,rows=[],busy=false,nicknameReviewBusy=false,nicknameRequests=[];
const expandedApplications=new Set();
const stateNames={
 AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',
 GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
 MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',
 NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',
 RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
 WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',PR:'Puerto Rico',GU:'Guam',VI:'U.S. Virgin Islands',MP:'Northern Mariana Islands',AS:'American Samoa'
};
const residenceState=r=>r.residence_state||(r.member_type==='SPTA'?r.student_state:'')||'';
const memberState=r=>residenceState(r)||(r.member_type==='PTA'?r.license_state:'')||'';
const stateText=state=>stateNames[state]?stateNames[state]+' ('+state+')':state;
const statusOrder={pending:0,approved:1,rejected:2};
const compareText=(a,b)=>String(a||'').localeCompare(String(b||''),'en',{numeric:true,sensitivity:'base'});
const newestFirst=(a,b)=>(Date.parse(b.created_at)||0)-(Date.parse(a.created_at)||0)||compareText(a.user_id,b.user_id);
function compareApplications(a,b,sort){
 const type=(who,order)=>order.indexOf(who.member_type);
 const rank=(row,priority)=>row.membership_status===priority?0:1+statusOrder[row.membership_status];
 const aState=memberState(a),bState=memberState(b);
 switch(sort){
  case 'oldest':return -newestFirst(a,b);
  case 'type-pta':return type(a,['PTA','SPTA'])-type(b,['PTA','SPTA'])||newestFirst(a,b);
  case 'type-spta':return type(a,['SPTA','PTA'])-type(b,['SPTA','PTA'])||newestFirst(a,b);
  case 'state-asc':
  case 'state-desc':{
   if(!aState||!bState)return Number(!aState)-Number(!bState)||newestFirst(a,b);
   const delta=compareText(aState,bState);
   return (sort==='state-desc'?-delta:delta)||newestFirst(a,b);
  }
  case 'status-pending':return rank(a,'pending')-rank(b,'pending')||newestFirst(a,b);
  case 'status-approved':return rank(a,'approved')-rank(b,'approved')||newestFirst(a,b);
  case 'status-rejected':return rank(a,'rejected')-rank(b,'rejected')||newestFirst(a,b);
  default:return newestFirst(a,b);
 }
}
const memberFilters={type:'all',state:'all',status:'all'};
const filterKinds=['type','state','status'];
function closeMemberFilterMenus(){
 for(const kind of filterKinds){
  const wrap=document.querySelector('[data-member-filter="'+kind+'"]');
  if(!wrap)continue;
  const menu=wrap.querySelector('.admin-inline-menu');
  const trigger=wrap.querySelector('.admin-inline-trigger');
  if(menu)menu.hidden=true;
  if(trigger)trigger.setAttribute('aria-expanded','false');
  wrap.classList.remove('is-open');
 }
}
function openMemberFilterMenu(kind){
 for(const other of filterKinds){
  const wrap=document.querySelector('[data-member-filter="'+other+'"]');
  if(!wrap)continue;
  const active=kind===other;
  wrap.querySelector('.admin-inline-menu').hidden=!active;
  wrap.querySelector('.admin-inline-trigger').setAttribute('aria-expanded',String(active));
  wrap.classList.toggle('is-open',active);
 }
}
function syncMemberFilters(){
 for(const kind of filterKinds){
  const wrap=document.querySelector('[data-member-filter="'+kind+'"]');
  if(!wrap)continue;
  const selected=memberFilters[kind];
  const short=kind==='type'?(selected==='all'?'ALL':selected):
   kind==='state'?(selected==='all'?'ALL':selected==='missing'?'N/A':selected):
   selected==='all'?'ALL':selected==='rejected'?'DENIED':selected.toUpperCase();
  wrap.querySelector('[data-filter-label]').textContent=short;
  wrap.classList.toggle('has-selection',selected!=='all');
  wrap.querySelectorAll('button[data-filter-value]').forEach(button=>{
   const current=button.dataset.filterValue===selected;
   button.setAttribute('aria-pressed',String(current));
   button.classList.toggle('is-selected',current);
  });
 }
}
function populateStateFilter(){
 // Only states submitted by the selected member type are offered; never
 // populate the menu with every possible US state.
 const scoped=rows.filter(r=>memberFilters.type==='all'||r.member_type===memberFilters.type);
 const unique=[...new Set(scoped.map(memberState).filter(Boolean))].sort((a,b)=>compareText(stateNames[a]||a,stateNames[b]||b));
 const hasMissing=scoped.some(row=>!memberState(row));
 if(memberFilters.state!=='all'&&(memberFilters.state==='missing'?!hasMissing:!unique.includes(memberFilters.state))){
  memberFilters.state='all';
 }
 const menu=$('admin-state-menu');
 menu.replaceChildren();
 const add=(value,label,count)=>{
  const item=el('button','admin-inline-option',label);
  item.type='button';item.dataset.filterValue=value;
  item.setAttribute('aria-pressed',String(memberFilters.state===value));
  if(memberFilters.state===value)item.classList.add('is-selected');
  const amount=el('small','admin-inline-option-count',String(count));
  item.append(amount);menu.append(item);
 };
 add('all','All States / 전체',scoped.length);
 for(const state of unique)add(state,stateText(state),scoped.filter(row=>memberState(row)===state).length);
 if(hasMissing)add('missing','Not provided / 미입력',scoped.filter(row=>!memberState(row)).length);
 syncMemberFilters();
}
function selectMemberFilter(kind,value){
 if(kind==='type'&&value!=='all'&&value!=='PTA'&&value!=='SPTA')return;
 if(kind==='status'&&!['all','approved','rejected','pending'].includes(value))return;
 if(kind==='state'&&!Array.from($('admin-state-menu').querySelectorAll('[data-filter-value]')).some(button=>button.dataset.filterValue===value))return;
 memberFilters[kind]=value;
 if(kind==='type')populateStateFilter();
 syncMemberFilters();closeMemberFilterMenus();render();
}
function setupMemberFilterMenus(){
 for(const kind of filterKinds){
  const wrap=document.querySelector('[data-member-filter="'+kind+'"]');
  const trigger=wrap.querySelector('.admin-inline-trigger');
  const menu=wrap.querySelector('.admin-inline-menu');
  trigger.addEventListener('click',()=>{
   if(menu.hidden)openMemberFilterMenu(kind);
   else closeMemberFilterMenus();
  });
  menu.addEventListener('click',event=>{
   const option=event.target.closest('button[data-filter-value]');
   if(option&&menu.contains(option))selectMemberFilter(kind,option.dataset.filterValue);
  });
  if(kind!=='state'){
   // TYPE and STATUS open on mouse hover, while STATE is click-only.
   wrap.addEventListener('pointerenter',event=>{
    if(event.pointerType==='mouse')openMemberFilterMenu(kind);
   });
   wrap.addEventListener('pointerleave',event=>{
    if(event.pointerType==='mouse')closeMemberFilterMenus();
   });
  }
 }
 document.addEventListener('pointerdown',event=>{
  if(!event.target.closest('.admin-inline-filters'))closeMemberFilterMenus();
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
   const expanded=filterKinds.some(kind=>!document.querySelector('[data-member-filter="'+kind+'"] .admin-inline-menu').hidden);
   if(expanded){
    event.preventDefault();const active=filterKinds.find(kind=>!document.querySelector('[data-member-filter="'+kind+'"] .admin-inline-menu').hidden);
    closeMemberFilterMenus();document.querySelector('[data-member-filter="'+active+'"] .admin-inline-trigger')?.focus();
   }
  }
 });
 syncMemberFilters();
}
function clearFilters(){
 $('admin-search').value='';
 memberFilters.type='all';memberFilters.state='all';memberFilters.status='all';
 $('admin-sort').value='newest';
 populateStateFilter();closeMemberFilterMenus();render();
}
const date=v=>{if(!v)return '—';const x=new Date(v);return Number.isNaN(x.getTime())?'—':x.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});};
const human=s=>({pending:'Pending',approved:'Approved',rejected:'Denied'}[s]||'Unknown');
const licenseClock=()=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'numeric'}).formatToParts(new Date());return {year:Number(parts.find(p=>p.type==='year').value),month:Number(parts.find(p=>p.type==='month').value)};};
function yearsFromIssue(issue,month=null,clock=licenseClock()){
 if(!Number.isInteger(issue)||issue<1950||issue>clock.year)return null;
 if(month!==null&&(!Number.isInteger(month)||month<1||month>12||(issue===clock.year&&month>clock.month)))return null;
 return clock.year-issue+1-(month!==null&&month>clock.month?1:0);
}
function approvedYearsInput(r){
 const wrap=el('div','admin-pta-experience');
 const heading=el('strong','admin-pta-years-label','최초 PTA 면허 발급 연월 / First PTA License Issued');
 const fields=el('div','admin-pta-date-fields');
 const yearLabel=el('label','admin-pta-date-field','Year / 연도');
 const monthLabel=el('label','admin-pta-date-field','Month / 월');
 const year=el('select','admin-pta-years-input'),month=el('select','admin-pta-years-input');
 function option(select,value,label){const o=el('option','',label);o.value=value;select.append(o);}
 option(year,'','Select year');option(month,'','Select month');
 for(let y=licenseClock().year;y>=1950;y--)option(year,String(y),String(y));
 const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 for(let m=1;m<=12;m++)option(month,String(m),months[m-1]+' ('+m+')');
 year.value=String(r.pta_license_issued_year??'');month.value=String(r.pta_license_issued_month??'');
 yearLabel.append(year);monthLabel.append(month);fields.append(yearLabel,monthLabel);
 const info=el('small','admin-pta-years-help');
 function updateHint(){
  const clock=licenseClock(),y=Number(year.value);
  for(const o of month.options)o.disabled=!!o.value&&y===clock.year&&Number(o.value)>clock.month;
  if(month.selectedOptions[0]?.disabled)month.value='';
  const n=year.value&&month.value?yearsFromIssue(y,Number(month.value),clock):null;
  if(n===null){const old=yearsFromIssue(r.pta_license_issued_year,r.pta_license_issued_month??null);info.textContent=old!==null&&!r.pta_license_issued_month?'기존 '+old+'년차 유지 · 발급 월을 확인해 주세요. / Existing badge retained until month is verified.':'최초 면허 발급 연도와 월을 선택해 주세요. / Select the verified issue year and month.';return;}
  info.textContent=n+'년차 / Year '+n+' · 발급 월마다 자동 갱신 / Updates each license anniversary month.';
 }
 year.addEventListener('change',updateHint);month.addEventListener('change',updateHint);updateHint();
 wrap.append(heading,fields,info);r._issueYearInput=year;r._issueMonthInput=month;return wrap;
}
function verifiedIssueYearFromInput(r){
 const year=r._issueYearInput,month=r._issueMonthInput;
 const y=Number(year?.value),m=Number(month?.value);
 if(!year?.value||!month?.value||yearsFromIssue(y,m)===null){
  setMessage('최초 PTA 면허 발급 연도와 월을 확인해 주세요. / Select a valid first license issue year and month.',true);
  (!year?.value?year:month)?.focus();return null;
 }
 return {year:y,month:m};
}
function stats(){const count=s=>rows.filter(r=>r.membership_status===s).length;$('count-total').textContent=rows.length;$('count-pending').textContent=count('pending');$('count-approved').textContent=count('approved');$('count-rejected').textContent=count('rejected');}
const meta=(caption,value)=>{const box=el('div');box.append(el('span','',caption),el('strong','',value||'—'));return box;};
function action(caption,cls,callback){const b=el('button','admin-action '+cls,caption);b.type='button';b.disabled=busy;b.addEventListener('click',callback);return b;}
const summaryFact=(title,value)=>{
 const node=el('div','admin-summary-fact');
 node.append(el('span','admin-summary-fact-label',title),el('strong','admin-summary-fact-value',value??'—'));
 return node;
};
function updateExpandToggle(){
 const toggle=$('admin-toggle-details');if(!toggle)return;
 const items=Array.from($('admin-member-list').querySelectorAll('details.admin-member-compact'));
 toggle.disabled=!items.length;
 toggle.textContent=items.length&&items.every(item=>item.open)
  ?'Collapse All / 모두 접기':'Expand All / 모두 펼치기';
}
function render(){
 const q=$('admin-search').value.toLocaleLowerCase().trim();
 const status=memberFilters.status,type=memberFilters.type,state=memberFilters.state,sort=$('admin-sort').value;
 const list=rows.filter(r=>
  (status==='all'||r.membership_status===status) &&
  (type==='all'||r.member_type===type) &&
  (state==='all'||(state==='missing'?!memberState(r):memberState(r)===state)) &&
  (!q||[r.display_name,r.legal_first_name,r.legal_last_name,r.license_state,r.license_number,r.member_type,r.student_school,r.student_program,r.student_state,r.residence_state]
   .some(v=>String(v||'').toLocaleLowerCase().includes(q)))
 ).sort((a,b)=>compareApplications(a,b,sort));
 // The title summary reflects the same visible records as the list,
 // including every active TYPE, STATE, STATUS and text-search filter.
 const count=predicate=>list.filter(predicate).length;
 $('admin-result-total').textContent=String(list.length);
 $('admin-result-pta').textContent=String(count(r=>r.member_type==='PTA'));
 $('admin-result-spta').textContent=String(count(r=>r.member_type==='SPTA'));
 $('admin-result-approved').textContent=String(count(r=>r.membership_status==='approved'));
 $('admin-result-denied').textContent=String(count(r=>r.membership_status==='rejected'));
 $('admin-result-pending').textContent=String(count(r=>r.membership_status==='pending'));
 const root=$('admin-member-list');root.replaceChildren();
 if(!list.length){root.append(el('p','admin-empty','검색 조건에 해당하는 회원 신청이 없습니다. / No matching applications.'));updateExpandToggle();return;}
 for(const r of list){
 const card=el('details','admin-member admin-member-compact');
 card.dataset.memberId=r.user_id;
 card.open=expandedApplications.has(r.user_id);
 card.addEventListener('toggle',()=>{
  if(card.open)expandedApplications.add(r.user_id);
  else expandedApplications.delete(r.user_id);
  updateExpandToggle();
 });
 const summary=el('summary','admin-member-summary');
 const person=el('div','admin-member-person');
 person.append(el('h3','',r.display_name||'Community Applicant'),
  el('p','admin-subtitle',((r.legal_first_name||'')+' '+(r.legal_last_name||'')).trim()||'—'));
 const facts=el('div','admin-member-summary-facts');
 const isStudent=r.member_type==='SPTA';
 if(r._upgradeId)person.append(el('p','admin-subtitle','SPTA → PTA upgrade · SPTA access remains active'));
 const matchedIssue=r.membership_status==='pending'&&r._licenseReview?.result==='matched'?r._licenseReview.issue_date:null;
 const years=yearsFromIssue(r.pta_license_issued_year??(matchedIssue?Number(matchedIssue.slice(0,4)):null),r.pta_license_issued_month??(matchedIssue?Number(matchedIssue.slice(5,7)):null));
 if(r.membership_status==='pending')person.append(el('p','admin-subtitle',isStudent?(r.student_proof_path?'Student Proof Submitted':'Additional Review Required'):(r._licenseReview?.result==='matched'?'Auto-Verified Record':r._licenseReview?.result==='mismatch'?'Verification Mismatch':'Additional Review Required')));
 facts.append(
  summaryFact('Type / 유형',isStudent?'SPTA':'PTA'),
  summaryFact('Residence / 거주 주',residenceState(r)||'Not provided'),
  summaryFact(isStudent?'School / 학교':'PTA Years / 연차',
   isStudent?(r.student_school||'Not provided'):(years===null?'Not set':years+' years')),
  summaryFact('Applied / 신청일',date(r.created_at))
 );
 const endGroup=el('div','admin-member-summary-end');
 const tag=el('span','admin-tag '+r.membership_status,human(r.membership_status));
 const expand=el('span','admin-summary-expand');
 expand.append(el('span','admin-summary-expand-text','Details / 상세'),el('span','admin-summary-chevron'));
 expand.lastChild.setAttribute('aria-hidden','true');
 endGroup.append(tag,expand);
 summary.append(person,facts,endGroup);card.append(summary);

 const content=el('div','admin-member-details');
 const detail=el('div','admin-meta');
 detail.append(meta('Applicant Type / 가입 유형',r._upgradeId?'SPTA → PTA (upgrade)':r.member_type||'PTA'));
 if(isStudent){
  detail.append(meta('Current State / 거주 주',residenceState(r)||'Not provided'),
   meta('School / 학교',r.student_school),meta('PTA Program / 프로그램',r.student_program),meta('Expected Graduation / 졸업 예정',r.student_expected_graduation?.slice(0,7)||'Not provided'));
 }else{
  detail.append(meta('Residence / 거주 주',residenceState(r)||'Not provided'),meta('License State / 면허 주',r.license_state),
   meta('PTA License Number / 면허번호',r.license_number||'Not supplied'));
 }
 detail.append(meta('Applied / 신청일',date(r.created_at)),
  meta('Verified / 승인일',date(r.verified_at)),
  meta('Current Status / 상태',human(r.membership_status)));
 content.append(detail);
 if(!isStudent){
  if(r.membership_status==='pending'){
   const review=r._licenseReview;
   const panel=el('div','admin-pta-experience');
   const matched=review?.result==='matched';
   const mismatch=review?.result==='mismatch';
   const label=matched?'Auto-Verified Record / 공식 기록 일치':mismatch?'Verification Mismatch / 기록 불일치':'Additional Review Required / 추가 확인 필요';
   panel.append(el('strong','admin-pta-years-label',label));
   panel.append(el('p','admin-subtitle',review?.reason||'Official data is unavailable. Please check the issuing board.'));
   if(review?.source_as_of)panel.append(meta('Source data date',review.source_as_of));
   if(review?.license_status)panel.append(meta('License status',review.license_status));
   if(review?.issue_date)panel.append(meta('Original issue date',review.issue_date));
   if(review?.expiration_date)panel.append(meta('Expiration date',review.expiration_date));
   const link=el('a','admin-action secondary','Official license lookup ↗');link.href=r.license_state==='CA'?'https://search.dca.ca.gov/':'https://www.fsbpt.org/Secondary-Pages/The-Public/Verify-a-PT-PTA-License';link.target='_blank';link.rel='noopener noreferrer';panel.append(link);
   panel.append(el('small','admin-pta-years-help','Record matching does not establish identity or grant membership. Confirm the earliest license issue date if the applicant held a license in another state. Administrator approval is required.'));
   content.append(panel);
   if(matched&&review.issue_date&&!r.pta_license_issued_year){r.pta_license_issued_year=Number(review.issue_date.slice(0,4));r.pta_license_issued_month=Number(review.issue_date.slice(5,7));}
  }
  content.append(approvedYearsInput(r));
 }else if(r.membership_status==='pending'){content.append(meta('Review / 심사',r.student_proof_path?'Student Proof Submitted / 증빙 확인 필요':'Additional Review Required / 추가 확인 필요'));}
 if(r.statement)content.append(el('p','admin-statement',r.statement));
 if(isStudent&&r.student_proof_path){
  const proof=el('button','admin-action secondary admin-proof-action','View private enrollment proof ↗');
  proof.type='button';proof.onclick=()=>viewProof(r);content.append(proof);
 }
 const buttons=el('div','admin-actions');
 if(r.membership_status==='pending'){
  buttons.append(action('Approve / 승인','',()=>change(r,'approved')),
   action('Reject / 반려','secondary',()=>change(r,'rejected')));
 }else if(r.membership_status==='approved'){
  if(!isStudent)buttons.append(action('Save License Date / 발급 연월 저장','secondary',()=>saveYears(r)));
  buttons.append(action('Revoke Access / 권한 해제','warn',()=>change(r,'rejected',true)));
 }else if(r.membership_status==='rejected'){
  buttons.append(action('Approve / 승인','secondary',()=>change(r,'approved')));
 }
 content.append(buttons);
 card.append(content);root.append(card);
 }
 updateExpandToggle();
}
async function refresh(){
 if(busy)return;
 setMessage('Loading membership applications… / 회원 목록을 불러오는 중…');
 const {data,error}=await db.from('pta_members').select('user_id,display_name,legal_first_name,legal_last_name,license_state,license_number,statement,membership_status,created_at,verified_at,member_type,student_school,student_program,student_state,residence_state,student_expected_graduation,student_proof_path,pta_license_issued_year,pta_license_issued_month').order('created_at',{ascending:false}).limit(1000);
 if(error){setMessage('Could not load member applications: '+error.message,true);return;}
 rows=data||[];
 const upgrades=await db.from('pta_license_upgrades').select('id,user_id,legal_first_name,legal_last_name,license_state,residence_state,license_number,statement,created_at').eq('status','pending');
 if(upgrades.error){setMessage('Could not load PTA upgrade applications: '+upgrades.error.message,true);return;}
 const pendingUpgrades=new Map((upgrades.data||[]).map(u=>[u.user_id,u]));
 rows=rows.map(r=>{const u=pendingUpgrades.get(r.user_id);return u&&r.member_type==='SPTA'&&r.membership_status==='approved'?{...r,...u,member_type:'PTA',membership_status:'pending',pta_license_issued_year:null,pta_license_issued_month:null,_upgradeId:u.id}:r;});
 try{const result=await db.rpc('tyc_pta_license_review_results');if(!result.error&&Array.isArray(result.data)){const lookup=new Map(result.data.map(x=>[x.user_id,x]));for(const row of rows)row._licenseReview=lookup.get(row.user_id);}}catch(e){/* Review stays manual when the source is unavailable. */}
 stats();populateStateFilter();render();$('admin-message').hidden=true;
 window.dispatchEvent(new Event('tyc-admin-queue-updated'));
}
function nicknameMessage(message,error=false){
 const el=$('admin-nickname-feedback');
 el.textContent=message;
 el.classList.toggle('error',error);
}
function renderNicknameRequests(){
 const root=$('admin-nickname-request-list');
 root.replaceChildren();
 const pending=nicknameRequests.filter(r=>r.status==='pending');
 const recent=nicknameRequests.filter(r=>r.status!=='pending').slice(0,8);
 $('admin-nickname-count').textContent=pending.length+' pending / 대기';
 if(!pending.length){
  root.append(el('p','admin-nickname-empty','현재 검토 대기 중인 닉네임 변경 요청이 없습니다. / No pending nickname requests.'));
 }
 for(const r of [...pending,...recent]){
  const card=el('article','admin-nickname-request'+(r.status==='pending'?'':' is-reviewed'));
  const head=el('div','admin-nickname-request-top');
  const title=el('h3','',r.current_name+' → '+r.requested_name);
  const status=el('span','admin-nickname-state is-'+r.status,
   r.status==='pending'?'Pending / 대기':r.status==='approved'?'Approved / 승인':'Rejected / 반려');
  head.append(title,status);
  const sent=el('p','admin-nickname-time','Requested / 요청일: '+date(r.created_at));
  const reason=el('p','admin-nickname-reason',r.reason);
  card.append(head,sent,el('strong','admin-nickname-reason-title','Change reason / 변경 사유'),reason);
  if(r.status==='pending'){
   const actions=el('div','admin-actions');
   actions.append(
    action('Approve Nickname / 승인','',()=>reviewNickname(r,true)),
    action('Reject / 반려','secondary',()=>reviewNickname(r,false))
   );
   actions.querySelectorAll('button').forEach(b=>b.disabled=nicknameReviewBusy);
   card.append(actions);
  }else{
   if(r.review_note)card.append(el('p','admin-nickname-time','Admin note / 관리 메모: '+r.review_note));
   if(r.reviewed_at)card.append(el('p','admin-nickname-time','Reviewed: '+date(r.reviewed_at)));
  }
  root.append(card);
 }
}
async function refreshNicknameRequests(){
 const {data,error}=await db.from('tyc_nickname_change_requests')
  .select('id,current_name,requested_name,reason,status,created_at,reviewed_at,review_note')
  .order('created_at',{ascending:false}).limit(200);
 if(error){
  nicknameMessage('Could not load nickname requests: '+error.message,true);
  return;
 }
 nicknameRequests=data||[];
 renderNicknameRequests();
 window.dispatchEvent(new Event('tyc-admin-queue-updated'));
 if(!nicknameReviewBusy)nicknameMessage(nicknameRequests.some(r=>r.status==='pending')
  ?'Review the reason and the proposed nickname before making a decision. / 변경 사유와 희망 닉네임을 확인해 주세요.'
  :'No pending nickname requests. / 대기 중인 요청이 없습니다.');
}
async function reviewNickname(r,approve){
 if(nicknameReviewBusy||r.status!=='pending')return;
 let note=null;
 if(approve){
  if(!window.confirm('닉네임 변경 요청 승인\n\n현재: '+r.current_name+'\n변경: '+r.requested_name+'\n사유: '+r.reason+'\n\n승인하면 30일 제한 중에도 즉시 변경되며 기록이 남습니다.\n\nApprove this nickname change now?'))return;
 }else{
  note=window.prompt('반려 사유 / Reason for rejection (optional; visible to member):','');
  if(note===null)return;
  note=note.trim().slice(0,500)||null;
  if(!window.confirm('이 닉네임 변경 요청을 반려하시겠습니까?\nReject request for "'+r.requested_name+'"?'))return;
 }
 nicknameReviewBusy=true;
 renderNicknameRequests();
 nicknameMessage('Saving administrator decision… / 검토 결과 저장 중…');
 try{
  const {error}=await db.rpc('tyc_review_nickname_change_request',{
   p_request_id:r.id,p_approve:approve,p_review_note:note
  });
  if(error)throw error;
  nicknameReviewBusy=false;
  await Promise.all([refreshNicknameRequests(),refresh()]);
  nicknameMessage(approve
   ?'✓ Approved. The member nickname was changed immediately. / 승인 완료. 닉네임이 즉시 변경되었습니다.'
   :'✓ Request rejected. The member has been informed in their profile status. / 반려 완료.');
 }catch(error){
  nicknameReviewBusy=false;
  renderNicknameRequests();
  nicknameMessage('Could not '+(approve?'approve':'reject')+' nickname request: '+(error.message||'Please retry.'),true);
 }
}
async function viewProof(r){
 if(!db||!user||!r.student_proof_path)return;
 const {data,error}=await db.storage.from('tyc-student-verification').createSignedUrl(r.student_proof_path,120);
 if(error||!data?.signedUrl){setMessage('Cannot open enrollment proof: '+(error?.message||'No accessible file'),true);return;}
 window.open(data.signedUrl,'_blank','noopener,noreferrer');
}
async function saveYears(r){
 if(busy||r.member_type==='SPTA'||r.membership_status!=='approved')return;
 const issued=verifiedIssueYearFromInput(r);
 if(issued===null)return;
 if(r.pta_license_issued_year===issued.year&&r.pta_license_issued_month===issued.month){
  setMessage('현재 PTA 연차와 동일합니다. / PTA years are unchanged.');return;
 }
 busy=true;setMessage('Saving verified PTA experience… / 연차 저장 중…');
 try{
  const {data,error}=await db.from('pta_members').update({pta_license_issued_year:issued.year,pta_license_issued_month:issued.month})
   .eq('user_id',r.user_id).eq('member_type','PTA').eq('membership_status','approved').select('user_id');
  if(error)throw error;
  if(!data?.length)throw Error('Member record changed; refresh and retry.');
  busy=false;await refresh();
  setMessage('✓ PTA 연차가 저장됐습니다. 해당 회원의 게시글·댓글 배지에 표시됩니다.');
 }catch(e){busy=false;setMessage('PTA 연차 저장 실패: '+(e.message||'Unknown error'),true);}
}
async function change(r,target,revoke=false){
 if(busy)return;
 let note=null;
 let issuedYear=null;
 if(target==='approved'){
   if(r.member_type!=='SPTA'){
    issuedYear=verifiedIssueYearFromInput(r);
    if(issuedYear===null)return;
   }
   if(!window.confirm(r.member_type==='SPTA'?'재학 증빙을 직접 확인하고 PTA 프로그램 재학 상태가 유효하다는 것을 검토했나요? 이 학생의 가입을 승인할까요?':'공식 PTA 면허 확인을 완료했나요? 이 신청을 승인할까요?'))return;
 }else{
   if(!window.confirm(revoke?'이 회원의 PTA Community 접근 권한을 해제할까요?':'이 PTA 가입 신청을 반려할까요?'))return;
   note=window.prompt('관리 기록용 사유 (선택 사항). 신청자에게 자동 발송되지 않습니다.',revoke?'Access revoked by administrator':'');
   if(note===null)return;note=note.trim().slice(0,500)||null;
 }
 busy=true;render();setMessage('Updating member access… / 변경사항을 저장하는 중…');
 try{
   const payload={membership_status:target,review_note:target==='approved'?null:note,verified_at:target==='approved'?new Date().toISOString():null,verified_by:target==='approved'?user.id:null};
   if(target==='approved'&&r.member_type!=='SPTA'){payload.pta_license_issued_year=issuedYear.year;payload.pta_license_issued_month=issuedYear.month;}
   if(r._upgradeId){
    const {error}=await db.rpc('tyc_review_pta_upgrade',{p_request:r._upgradeId,p_target:target,p_year:issuedYear?.year??null,p_month:issuedYear?.month??null,p_note:note});
    if(error)throw error;
   }else{
    const {data,error}=await db.from('pta_members').update(payload).eq('user_id',r.user_id).eq('membership_status',r.membership_status).select('user_id');
    if(error)throw error;if(!data?.length)throw Error('Membership status was changed by another administrator. Refresh the list.');
   }
   busy=false;await refresh();setMessage(target==='approved'?'Member approved successfully. / 승인 완료.':'Membership access updated. / 회원 상태 변경 완료.');
 }catch(error){busy=false;setMessage('Could not update membership: '+(error.message||'Please retry.'),true);render();}
}
async function init(){
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){setMessage('Supabase connection unavailable. / 계정 연결 설정을 확인하세요.',true);return;}
 db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data,error}=await db.auth.getUser();user=data?.user;
 if(error||!user){location.replace('auth.html?next=admin-members.html');return;}
 const check=await db.rpc('tyc_has_staff_scope',{p_scope:'community'});
 if(check.error||!check.data){setMessage('Administrator access required. / 관리자 전용 페이지입니다.',true);return;}
 // Only full administrators can open the all-account directory and assign roles.
 const full=await db.from('job_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(!full.error&&full.data){
  const link=document.createElement('a');
  link.href='admin-users.html';link.className='admin-back';
  link.textContent='All Users →';
  document.querySelector('.admin-top-links')?.append(link);
 }
 $('admin-dashboard').hidden=false;
 setupMemberFilterMenus();
 $('admin-search').addEventListener('input',render);
 $('admin-sort').addEventListener('change',render);
 $('admin-clear-filters').addEventListener('click',clearFilters);
 $('admin-refresh').addEventListener('click',()=>{void Promise.all([refresh(),refreshNicknameRequests()]);});
 $('admin-toggle-details').addEventListener('click',()=>{
  const cards=Array.from($('admin-member-list').querySelectorAll('details.admin-member-compact'));
  const expand=cards.some(card=>!card.open);
  for(const card of cards){
   card.open=expand;
   if(expand)expandedApplications.add(card.dataset.memberId);
   else expandedApplications.delete(card.dataset.memberId);
  }
  updateExpandToggle();
 });
 await Promise.all([refresh(),refreshNicknameRequests()]);
 if(location.hash==='#admin-nickname-requests'){
  requestAnimationFrame(()=>$('admin-nickname-requests')?.scrollIntoView({block:'start',behavior:'auto'}));
 }
}
init().catch(e=>setMessage('Unable to open member management: '+(e.message||'Unknown error'),true));
})();