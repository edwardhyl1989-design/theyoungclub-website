/* Admin dashboard: authorization enforced by Supabase RLS and user/admin lookup. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
const setMessage=(text,error=false)=>{const n=$('admin-message');n.textContent=text;n.classList.toggle('error',error);n.hidden=false;};
let db,user,rows=[],busy=false;
const date=v=>{if(!v)return '—';const x=new Date(v);return Number.isNaN(x.getTime())?'—':x.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});};
const human=s=>({pending:'Pending',approved:'Approved',rejected:'Not Approved'}[s]||'Unknown');
const currentLicenseYear=()=>Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric'}).format(new Date()));
const yearsFromIssue=issue=>Number.isInteger(issue)&&issue>=1950&&issue<=currentLicenseYear()?currentLicenseYear()-issue+1:null;
function approvedYearsInput(r){
 const wrap=el('div','admin-pta-experience');
 const label=el('label','admin-pta-years-label','PTA 몇 년차 / Years since first PTA license');
 const input=el('input','admin-pta-years-input');
 input.type='number';input.min='1';input.max=String(currentLicenseYear()-1950+1);input.step='1';
 input.inputMode='numeric';input.placeholder='e.g. 3';
 input.setAttribute('aria-label','Verified PTA year count, first license year basis');
 const savedYears=yearsFromIssue(r.pta_license_issued_year);
 input.value=savedYears===null?'':String(savedYears);
 const info=el('small','admin-pta-years-help');
 const updateHint=()=>{
  const n=Number(input.value);
  if(!input.value.trim()||!Number.isInteger(n)||n<1||n>currentLicenseYear()-1950+1){
   info.textContent='면허 발급 연도를 확인해 주세요. 승인 전 필수 입력 / Enter year count after checking licensure.';return;
  }
  info.textContent=n+'년차 → 최초 면허 발급 연도 '+(currentLicenseYear()-n+1)+' · 연도가 바뀌면 배지도 자동 업데이트됩니다.';
 };
 input.addEventListener('input',updateHint);updateHint();
 label.append(input);wrap.append(label,info);
 r._yearsInput=input;
 return wrap;
}
function verifiedIssueYearFromInput(r){
 const input=r._yearsInput;
 const n=Number(input?.value);
 const max=currentLicenseYear()-1950+1;
 if(!input?.value?.trim()||!Number.isInteger(n)||n<1||n>max){
  setMessage('PTA 면허 최초 발급 연도를 확인하고 올바른 연차(1~'+max+'년차)를 입력해 주세요.',true);
  input?.focus();
  return null;
 }
 return currentLicenseYear()-n+1;
}
function stats(){const count=s=>rows.filter(r=>r.membership_status===s).length;$('count-total').textContent=rows.length;$('count-pending').textContent=count('pending');$('count-approved').textContent=count('approved');$('count-rejected').textContent=count('rejected');}
const meta=(caption,value)=>{const box=el('div');box.append(el('span','',caption),el('strong','',value||'—'));return box;};
function action(caption,cls,callback){const b=el('button','admin-action '+cls,caption);b.type='button';b.disabled=busy;b.addEventListener('click',callback);return b;}
function render(){
 const q=$('admin-search').value.toLocaleLowerCase().trim(),filter=$('admin-filter').value;
 const list=rows.filter(r=>(filter==='all'||r.membership_status===filter)&&(!q||[r.display_name,r.legal_first_name,r.legal_last_name,r.license_state,r.license_number,r.member_type,r.student_school,r.student_program].some(v=>String(v||'').toLocaleLowerCase().includes(q))));
 $('admin-results').textContent=list.length+' result'+(list.length===1?'':'s');
 const root=$('admin-member-list');root.replaceChildren();
 if(!list.length){root.append(el('p','admin-empty','검색 조건에 해당하는 회원 신청이 없습니다. / No matching applications.'));return;}
 for(const r of list){
 const card=el('article','admin-member'),top=el('div','admin-member-top'),names=el('div'),tag=el('span','admin-tag '+r.membership_status,human(r.membership_status));
 names.append(el('h3','',r.display_name||'Community Applicant'),el('p','admin-subtitle',(r.legal_first_name||'')+' '+(r.legal_last_name||'')));
 top.append(names,tag);card.append(top);
 const detail=el('div','admin-meta');
 detail.append(meta('Applicant Type / 가입 유형',r.member_type||'PTA'));if(r.member_type==='SPTA'){detail.append(meta('School / 학교',r.student_school),meta('PTA Program / 프로그램',r.student_program));}else{detail.append(meta('License State / 면허 주',r.license_state),meta('PTA License Number / 면허번호',r.license_number||'Not supplied'));}detail.append(meta('Applied / 신청일',date(r.created_at)));
 detail.append(meta('Verified / 승인일',date(r.verified_at)),meta('Current Status / 상태',human(r.membership_status)));
 card.append(detail);
 if(r.member_type!=='SPTA')card.append(approvedYearsInput(r));
 if(r.statement)card.append(el('p','admin-statement',r.statement));if(r.member_type==='SPTA'&&r.student_proof_path){const proof=el('button','admin-action secondary','View private enrollment proof ↗');proof.type='button';proof.onclick=()=>viewProof(r);card.append(proof);}
 const buttons=el('div','admin-actions');
 if(r.membership_status==='pending'){
   buttons.append(action('Approve / 승인','',()=>change(r,'approved')),action('Reject / 반려','secondary',()=>change(r,'rejected')));
 }else if(r.membership_status==='approved'){
   if(r.member_type!=='SPTA')buttons.append(action('Save PTA Years / 연차 저장','secondary',()=>saveYears(r)));
   buttons.append(action('Revoke Access / 권한 해제','warn',()=>change(r,'rejected',true)));
 }else if(r.membership_status==='rejected'){
   buttons.append(action('Approve / 승인','secondary',()=>change(r,'approved')));
 }
 card.append(buttons);root.append(card);
 }
}
async function refresh(){
 if(busy)return;
 setMessage('Loading membership applications… / 회원 목록을 불러오는 중…');
 const {data,error}=await db.from('pta_members').select('user_id,display_name,legal_first_name,legal_last_name,license_state,license_number,statement,membership_status,created_at,verified_at,member_type,student_school,student_program,student_proof_path,pta_license_issued_year').order('created_at',{ascending:false}).limit(1000);
 if(error){setMessage('Could not load member applications: '+error.message,true);return;}
 rows=data||[];stats();render();$('admin-message').hidden=true;
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
 if(r.pta_license_issued_year===issued){
  setMessage('현재 PTA 연차와 동일합니다. / PTA years are unchanged.');return;
 }
 busy=true;setMessage('Saving verified PTA experience… / 연차 저장 중…');
 try{
  const {data,error}=await db.from('pta_members').update({pta_license_issued_year:issued})
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
   if(target==='approved'&&r.member_type!=='SPTA')payload.pta_license_issued_year=issuedYear;
   const {data,error}=await db.from('pta_members').update(payload).eq('user_id',r.user_id).eq('membership_status',r.membership_status).select('user_id');
   if(error)throw error;if(!data?.length)throw Error('Membership status was changed by another administrator. Refresh the list.');
   busy=false;await refresh();setMessage(target==='approved'?'Member approved successfully. / 승인 완료.':'Membership access updated. / 회원 상태 변경 완료.');
 }catch(error){busy=false;setMessage('Could not update membership: '+(error.message||'Please retry.'),true);render();}
}
async function init(){
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){setMessage('Supabase connection unavailable. / 계정 연결 설정을 확인하세요.',true);return;}
 db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data,error}=await db.auth.getUser();user=data?.user;
 if(error||!user){location.replace('auth.html?next=admin-members.html');return;}
 const check=await db.from('job_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(check.error||!check.data){setMessage('Administrator access required. / 관리자 전용 페이지입니다.',true);return;}
 $('admin-dashboard').hidden=false;
 $('admin-search').addEventListener('input',render);$('admin-filter').addEventListener('change',render);
 $('admin-refresh').addEventListener('click',refresh);
 await refresh();
}
init().catch(e=>setMessage('Unable to open member management: '+(e.message||'Unknown error'),true));
})();