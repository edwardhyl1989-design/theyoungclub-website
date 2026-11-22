(() => {
'use strict';
const $ = id => document.getElementById(id);
const configOk = /^https:\/\/[-\w]+\.supabase\.co\/?$/.test(window.TYC_SUPABASE_URL || '') &&
  !String(window.TYC_SUPABASE_PUBLISHABLE_KEY || '').startsWith('PASTE_');
let db = null, user = null, isAdmin = false, publicJobs = [], jobViewMap=new Map(), mine = [], pending = [];
const setText = (id, value, error=false) => {const n = $(id); n.textContent=value || ''; n.classList.toggle('error',error);};
const node = (tag, className, content) => {const el = document.createElement(tag); if(className) el.className=className; if(content!==undefined)el.textContent=String(content); return el;};
const show = (id, visible) => $(id).classList.toggle('hidden', !visible);
const fmtDate = value => value ? new Date(value).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '';
const cleanExternal = url => { try{const u = new URL(url);return u.protocol==='https:'?u.href:null;}catch{return null;} };
const cleanEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') ? email : null;
function btn(text, handler, kind='secondary') {const b=node('button','btn '+kind,text);b.type='button';b.addEventListener('click',handler);return b;}
function safeLink(text, href) {const a=node('a','',text); a.href=href; if(href.startsWith('https://')){a.target='_blank';a.rel='noopener noreferrer nofollow';}return a;}
function getBody(form){return {
 title:$('positionTitle').value.trim(), company:$('company').value.trim(),location:$('location').value.trim(),
 employment_type:$('employmentType').value, compensation:$('compensation').value.trim(),
 apply_email:$('applyEmail').value.trim() || null, apply_url:$('applyUrl').value.trim() || null,
 description:$('description').value.trim()
};}
function validateJob(j){
 if(!j.title || !j.company || !j.location || j.description.length<20 || !j.employment_type)return '필수 정보를 입력하고 상세 설명을 최소 20자 작성해 주세요.';
 if(!j.apply_email && !j.apply_url)return '지원 이메일 또는 지원 링크 중 하나를 입력해 주세요.';
 if(j.apply_email && !cleanEmail(j.apply_email))return '올바른 지원 이메일 주소를 입력해 주세요.';
 if(j.apply_url && !cleanExternal(j.apply_url))return '지원 링크는 https:// 주소만 사용할 수 있어요.';
 return null;
}
function renderCards(){
 const root=$('publicJobs'),q=$('jobSearch').value.trim().toLowerCase(),type=$('jobType').value;
 const selected=publicJobs.filter(p=>(!type||p.employment_type===type)&&(!q||[p.title,p.company,p.location,p.description].join(' ').toLowerCase().includes(q)));
 root.replaceChildren();
 if(!selected.length){root.append(node('p','muted','아직 공개된 채용공고가 없거나 검색 결과가 없습니다.'));return;}
 selected.forEach(p=>{
  const card=node('article','card job-listing');
  const details=node('details','job-details');
  const summary=node('summary','job-summary');
  const heading=node('span','job-title',p.title);
  const meta=node('span','eyebrow',`${p.employment_type} · ${fmtDate(p.published_at||p.created_at)}`);
  const subline=node('span','subline',`${p.company}  ·  ${p.location}${p.compensation?'  ·  '+p.compensation:''}`);
  const prompt=node('span','job-expand-hint','View details');
  summary.append(meta,heading,subline,prompt);const views=node('span','tyc-view-count job-view-count',window.TYC_Views?.label(jobViewMap.get(p.id))||'👁 — views');summary.append(views);details.addEventListener('toggle',async()=>{if(!details.open||details.dataset.viewRecorded)return;details.dataset.viewRecorded='true';if(!window.TYC_Views)return;const count=await window.TYC_Views.record('job',p.id);if(count!==null){jobViewMap.set(p.id,count);views.textContent=window.TYC_Views.label(count)}});
  const body=node('div','job-expanded');
  body.append(node('p','description',p.description));
  const links=node('div','card-actions');
  if(p.apply_url&&cleanExternal(p.apply_url))links.append(safeLink('Apply online ↗',cleanExternal(p.apply_url)));
  if(p.apply_email&&cleanEmail(p.apply_email))links.append(safeLink('Apply by email',`mailto:${p.apply_email}`));
  body.append(links);
  details.append(summary,body);
  card.append(details);
  root.append(card);
 });
}
function renderMine(){const root=$('myJobs');root.replaceChildren();if(!mine.length){root.append(node('p','muted','아직 등록한 공고가 없습니다.'));return;}
 mine.forEach(p=>{const row=node('div','rowjob');const info=node('div');info.append(node('strong','',p.title),node('div','small',`${p.company} · ${p.location}`),node('div','status '+p.status,({pending:'Pending review',approved:'Approved / Public',rejected:'Needs changes'})[p.status]||p.status));if(p.status==='rejected'&&p.rejection_reason)info.append(node('p','small','반려 사유: '+p.rejection_reason));row.append(info,btn('Edit',()=>openJob(p)));root.append(row);});}
function renderPending(){const root=$('pendingJobs');root.replaceChildren();if(!pending.length){root.append(node('p','muted','현재 승인 대기 중인 공고가 없습니다.'));return;}
 pending.forEach(p=>{const c=node('article','card');c.append(node('p','eyebrow',`${p.employment_type} · ${fmtDate(p.created_at)}`),node('h3','',p.title),node('div','subline',`${p.company} · ${p.location} · ${p.compensation||'Pay not stated'}`),node('p','description',p.description));const actions=node('div','card-actions');actions.append(btn('Approve',()=>moderate(p.id,'approved'),'primary'),btn('Reject',()=>moderate(p.id,'rejected')));c.append(actions);root.append(c);});}
async function loadPublic(){if(!db)return;const {data,error}=await db.from('job_postings').select('id,title,company,location,employment_type,compensation,description,apply_email,apply_url,created_at,published_at').eq('status','approved').order('published_at',{ascending:false});if(error){$('publicJobs').replaceChildren(node('p','muted','공고를 불러올 수 없습니다: '+error.message));return;}publicJobs=data||[];renderCards();if(window.TYC_Views){const map=await window.TYC_Views.counts('job',publicJobs.map(j=>j.id));jobViewMap=map;renderCards();}}
async function loadMine(){if(!db||!user)return;const {data,error}=await db.from('job_postings').select('*').eq('owner_id',user.id).order('created_at',{ascending:false});if(error){$('myJobs').replaceChildren(node('p','muted',error.message));return;}mine=data||[];renderMine();}
async function loadPending(){if(!db||!isAdmin)return;const {data,error}=await db.from('job_postings').select('*').eq('status','pending').order('created_at',{ascending:true});if(error){$('pendingJobs').replaceChildren(node('p','muted',error.message));return;}pending=data||[];renderPending();}
async function moderate(id,status){if(!user||!isAdmin)return;let reason=null;if(status==='rejected'){reason=prompt('Optional: reason for rejection / 반려 사유')||null;}
 const {error}=await db.from('job_postings').update({status,rejection_reason:reason}).eq('id',id);if(error){alert('처리 실패: '+error.message);return;}await Promise.all([loadPublic(),loadPending(),loadMine()]);}
function openJob(p=null){if(!user){$('authDialog').showModal();return;}
 $('jobForm').reset();setText('jobMessage','');$('editingId').value=p?.id||'';$('jobDialogTitle').textContent=p?'Edit Job Posting':'Post a Job';
 const mapping={positionTitle:'title',company:'company',location:'location',employmentType:'employment_type',compensation:'compensation',applyEmail:'apply_email',applyUrl:'apply_url',description:'description'};
 for(const [id,key] of Object.entries(mapping))$(id).value=p?.[key]||'';
 $('jobDialog').showModal();}
async function saveJob(event){event.preventDefault();if(!db||!user)return;const body=getBody(),err=validateJob(body);if(err){setText('jobMessage',err,true);return;}
 const editId=$('editingId').value;const submit=$('saveJobBtn');submit.disabled=true;setText('jobMessage','저장 중...');
 // Database triggers enforce pending review and immutable ownership even if the browser is modified.
 const result=editId?await db.from('job_postings').update(body).eq('id',editId).eq('owner_id',user.id).select('id'):
  await db.from('job_postings').insert({...body,owner_id:user.id}).select('id');
 submit.disabled=false;
 if(result.error){setText('jobMessage','저장 실패: '+result.error.message,true);return;}
 if(!result.data?.length){setText('jobMessage','이 공고를 수정할 권한이 없습니다.',true);return;}
 $('jobDialog').close();await Promise.all([loadMine(),loadPending(),loadPublic()]);alert('공고가 접수되었습니다. 관리자 승인 후 공개됩니다.');}
async function onSession(session){user=session?.user||null;isAdmin=false;
 if(user){const {data}=await db.from('job_admins').select('user_id').eq('user_id',user.id).maybeSingle();isAdmin=!!data;}
 show('accountArea',!!user);show('adminArea',!!isAdmin);show('logoutBtn',!!user);$('authBtn').textContent=user?'My Account':'Sign Up / Log In';
 setText('identity',user?`Signed in: ${user.email}${isAdmin?' · Administrator':''}`:'No login is required to browse published job postings.');
 if(user){await loadMine();if(isAdmin)await loadPending();}else{mine=[];pending=[];}
}
async function doAuth(mode){if(!db)return;const email=$('authEmail').value.trim(),password=$('authPassword').value;setText('authMessage','');if(!email||!password){setText('authMessage','이메일과 비밀번호를 입력해 주세요.',true);return;}
 const {data,error}=mode==='signup'?await db.auth.signUp({email,password,options:{emailRedirectTo:new URL('jobs.html',location.href).href}}):await db.auth.signInWithPassword({email,password});
 if(error){setText('authMessage',error.message,true);return;}
 if(mode==='signup'&&!data.session){setText('authMessage','가입 확인 이메일을 확인해 주세요. 확인 후 로그인할 수 있습니다.');return;}
 $('authDialog').close();await onSession(data.session);}
async function passwordReset(){const email=$('authEmail').value.trim();if(!email){setText('authMessage','먼저 이메일을 입력해 주세요.',true);return;}const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:new URL('jobs.html',location.href).href});setText('authMessage',error?error.message:'비밀번호 재설정 이메일을 확인해 주세요.',!!error);}
async function init(){
 $('jobSearch').addEventListener('input',renderCards);$('jobType').addEventListener('change',renderCards);
 $('authBtn').addEventListener('click',()=>{if(user){$('accountArea').scrollIntoView({behavior:'smooth'});}else $('authDialog').showModal();});
 $('newJobBtn').addEventListener('click',()=>openJob());$('cancelJobBtn').addEventListener('click',()=>$('jobDialog').close());
 $('jobForm').addEventListener('submit',saveJob);$('authForm').addEventListener('submit',e=>{e.preventDefault();doAuth('login');});$('signupSubmit').addEventListener('click',()=>doAuth('signup'));
 $('resetPassword').addEventListener('click',passwordReset);$('logoutBtn').addEventListener('click',async()=>{await db.auth.signOut();await onSession(null);});
 if(!configOk||!window.supabase?.createClient){show('setupNotice',true);$('publicJobs').replaceChildren(node('p','muted','회원 게시판을 연결하려면 Supabase 설정이 필요합니다.'));$('authBtn').disabled=true;$('newJobBtn').disabled=true;return;}
 db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data:{session}}=await db.auth.getSession();await onSession(session);await loadPublic();
 db.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'){setTimeout(async()=>{const password=prompt('Enter a new password (at least 6 characters)');if(password){const {error}=await db.auth.updateUser({password});alert(error?error.message:'Password updated.');}},0);}else if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='TOKEN_REFRESHED'){setTimeout(()=>onSession(session),0);}});
}
init().catch(err=>{show('setupNotice',true);$('setupNotice').textContent='설정 확인 필요: '+err.message;});
})();
