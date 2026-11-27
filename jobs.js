(() => {
'use strict';
const $ = id => document.getElementById(id);
const configOk = /^https:\/\/[-\w]+\.supabase\.co\/?$/.test(window.TYC_SUPABASE_URL || '') &&
  !String(window.TYC_SUPABASE_PUBLISHABLE_KEY || '').startsWith('PASTE_');
let db = null, user = null, isAdmin = false, publicJobs = [], jobViewMap=new Map(), mine = [], pending = [],savedJobs=new Set(), selectedLogo=null,removeLogo=false;
const setText = (id, value, error=false) => {const n = $(id); n.textContent=value || ''; n.classList.toggle('error',error);};
const node = (tag, className, content) => {const el = document.createElement(tag); if(className) el.className=className; if(content!==undefined)el.textContent=String(content); return el;};
const show = (id, visible) => $(id).classList.toggle('hidden', !visible);
const localDay=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const fmtDate = value => value ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value))?value+'T12:00:00':value).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '';
// Count local calendar days, not elapsed 24-hour periods, so jobs age naturally at midnight.
const jobAgeDays = value => {
 if(!value)return null;
 const date=new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value))?value+'T12:00:00':value);
 if(Number.isNaN(date.getTime()))return null;
 const today=new Date();
 const dayNumber=d=>Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000);
 return Math.max(0,dayNumber(today)-dayNumber(date));
};
const jobAgeBadge = value => {
 const days=jobAgeDays(value);
 if(days===null)return null;
 const tier=days<7?'fresh':days<14?'week2':days<21?'week3':'week4';
 const badge=node('span','career-job-age career-job-age-'+tier,days+' '+(days===1?'day':'days')+' ago');
 badge.title='Posted '+fmtDate(value)+' · '+days+' days elapsed';
 badge.setAttribute('aria-label','Posted '+days+' '+(days===1?'day':'days')+' ago');
 return badge;
};
const cleanExternal = url => { try{const u = new URL(url);return u.protocol==='https:'?u.href:null;}catch{return null;} };
const logoBucket='tyc-job-logos';
const allowedLogos={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
const logoUrl=path=>{
 if(!path||!new RegExp('^[a-f0-9-]{36}/[a-f0-9-]{36}[.](png|jpg|jpeg|webp|avif)$','i').test(path)||!db)return '';
 return db.storage.from(logoBucket).getPublicUrl(path).data.publicUrl;
};
const amount=v=>v===null||v===undefined||v===''?null:Number(v);
const listedPay=p=>{
 if(p.pay_min!=null||p.pay_max!=null){
  const unit={hour:'/hr',visit:'/visit',year:'/year'}[p.pay_unit]||'';
  const fmt=n=>'$'+Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
  if(p.pay_min!=null&&p.pay_max!=null)return fmt(p.pay_min)+'–'+fmt(p.pay_max)+unit;
  return (p.pay_min!=null?'From '+fmt(p.pay_min):'Up to '+fmt(p.pay_max))+unit;
 }
 return p.compensation||'Pay not listed';
};
const inferredRole=p=>{
 if(p.role_type)return p.role_type;
 const t=(p.title||'').toLowerCase();
 if(/\b(pta|physical therapist assistant)\b/.test(t))return 'PTA';
 if(/\b(pilates|reformer instructor)\b/.test(t))return 'Pilates Instructor';
 if(/\b(yoga instructor|yoga teacher|yoga coach|yoga)\b/.test(t))return 'Yoga Instructor';
 if(/\b(personal trainer|certified personal trainer|fitness trainer|cpt)\b/.test(t))return 'Personal Trainer';
 if(/\b(ota|occupational therapy assistant)\b/.test(t))return 'OTA';
 if(/\b(slp|speech.language pathologist)\b/.test(t))return 'SLP';
 if(/\b(ot|occupational therapist)\b/.test(t))return 'OT';
 if(/\b(pt|physical therapist)\b/.test(t))return 'PT';
 return 'Other';
};
const jobRolePriority=['PTA','PT','Personal Trainer','Pilates Instructor','Yoga Instructor','OT','OTA','SLP','Other'];
const roleBadgeName=role=>role==='Personal Trainer'?'CPT / Trainer':role;
const settingBadgeName=setting=>({
 'Outpatient':'OP','Inpatient':'IP','Home Health':'HH',
 'SNF':'SNF','Hospital':'Hospital','Rehab':'Rehab / IRF',
 'Gym / Fitness Center':'Gym','Pilates Studio':'Pilates Studio',
 'Yoga Studio':'Yoga Studio','Wellness / Sports Performance':'Wellness'
})[setting]||setting;
const inferredSetting=p=>{
 if(p.work_setting)return p.work_setting;
 const t=((p.title||'')+' '+(p.description||'')).toLowerCase();
 if(/home health|homecare|home care|\bhh\b/.test(t))return 'Home Health';
 if(/outpatient|out.patient|\bop\b/.test(t))return 'Outpatient';
 if(/skilled nursing|\bsnf\b/.test(t))return 'SNF';
 if(/inpatient rehabilitation|\birf\b|rehab hospital|rehabilitation facility/.test(t))return 'Rehab';
 if(/inpatient|in.patient|\bip\b/.test(t))return 'Inpatient';
 if(/hospital|acute care/.test(t))return 'Hospital';
 if(/pilates studio/.test(t))return 'Pilates Studio';
 if(/yoga studio/.test(t))return 'Yoga Studio';
 if(/gym|fitness center|fitness studio/.test(t))return 'Gym / Fitness Center';
 if(/wellness|sports performance/.test(t))return 'Wellness / Sports Performance';
 if(/rehab/.test(t))return 'Rehab';
 return 'Other';
};
const cleanEmail=email=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email||'')?email:null;
function btn(text, handler, kind='secondary') {const b=node('button','btn '+kind,text);b.type='button';b.addEventListener('click',handler);return b;}
const arrowIcon=()=>{const a=node('span','tyc-diagonal-icon');a.setAttribute('aria-hidden','true');return a;};
function safeLink(text, href) {const arrow=/\s*↗$/.test(text);const a=node('a','',arrow?text.replace(/\s*↗$/,''):text);if(arrow)a.append(arrowIcon()); a.href=href; if(href.startsWith('https://')){a.target='_blank';a.rel='noopener noreferrer nofollow';}return a;}
function getBody(){
 return {
 title:$('positionTitle').value.trim(),company:$('company').value.trim(),location:$('location').value.trim(),
 employment_type:$('employmentType').value,compensation:$('compensation').value.trim(),
 apply_email:$('applyEmail').value.trim()||null,apply_url:$('applyUrl').value.trim()||null,
 description:$('description').value.trim(),role_type:$('roleType').value||null,
 work_setting:$('workSetting').value||null,
 pay_min:amount($('payMin').value),pay_max:amount($('payMax').value),
 pay_unit:$('payUnit').value||null,expires_at:$('expiresAt').value||null
 };
}
function validateJob(j){
 if(!j.title || !j.company || !j.location || j.description.length<20 || !j.employment_type)return '필수 정보를 입력하고 상세 설명을 최소 20자 작성해 주세요.';
 if(!j.apply_email && !j.apply_url)return '지원 이메일 또는 지원 링크 중 하나를 입력해 주세요.';
 if(j.pay_min!==null&&(!Number.isFinite(j.pay_min)||j.pay_min<0))return 'Minimum pay must be zero or greater.';
 if(j.pay_max!==null&&(!Number.isFinite(j.pay_max)||j.pay_max<0))return 'Maximum pay must be zero or greater.';
 if(j.pay_min!==null&&j.pay_max!==null&&j.pay_min>j.pay_max)return 'Maximum pay must be greater than minimum pay.';
 if((j.pay_min!==null||j.pay_max!==null)&&!j.pay_unit)return 'Select a unit for structured pay.';
 if(j.expires_at&&j.expires_at<localDay())return 'Closing date cannot be in the past.';
 if(selectedLogo&&(!allowedLogos[selectedLogo.type]||selectedLogo.size===0||selectedLogo.size>2097152))return 'Logo must be JPG, PNG, or WebP under 2MB.';
 if(j.apply_email && !cleanEmail(j.apply_email))return '올바른 지원 이메일 주소를 입력해 주세요.';
 if(j.apply_url && !cleanExternal(j.apply_url))return '지원 링크는 https:// 주소만 사용할 수 있어요.';
 return null;
}

/* Mobile-only filter conveniences; the existing select controls remain the
   authoritative filters, so desktop results and permissions are unchanged. */
const mobileJobsMedia=typeof window.matchMedia==='function'
 ? window.matchMedia('(max-width:720px)'):null;
const advancedJobIds=['jobRole','jobSetting','jobType','jobLocation','jobMinPay','jobPayUnit'];
function advancedJobCount(){
 // Roles shown as quick chips are already visible. 'Other' is available only
 // inside More Filters, so keep its active state visible in the badge.
 const extra=advancedJobIds.filter(id=>id!=='jobRole'&&String($(id)?.value||'').trim()).length;
 const selectedRole=$('jobRole')?.value||'';
 const shortcutRoles=new Set(Array.from(document.querySelectorAll('#jobQuickRoles [data-role]'),button=>button.dataset.role));
 return extra+(selectedRole&&!shortcutRoles.has(selectedRole)?1:0);
}
function refreshMobileFilters(){
 const quick=$('jobQuickRoles'),count=$('jobAdvancedCount');
 if(quick){
  const selected=$('jobRole').value;
  quick.querySelectorAll('button[data-role]').forEach(button=>{
   button.setAttribute('aria-pressed',String(button.dataset.role===selected));
  });
 }
 if(count){
  const n=advancedJobCount();
  count.textContent=String(n);
  count.hidden=n===0;
 }
}
function setupMobileFilters(){
 const quick=$('jobQuickRoles'),advanced=$('jobAdvancedFilters'),guide=$('jobGuideDetails');
 if(!quick||!advanced||!guide)return;
 quick.addEventListener('click',event=>{
  const button=event.target.closest('button[data-role]');
  if(!button||!quick.contains(button))return;
  $('jobRole').value=button.dataset.role;
  renderCards();
 });
 const mobile=()=>!!mobileJobsMedia?.matches;
 const syncLayout=()=>{
  if(!mobile()){
   advanced.open=true;guide.open=true;
  }else{
   if(advanced.dataset.mobileUserToggle!=='1'){
    advanced.open=advancedJobCount()>0;
   }
   if(guide.dataset.mobileUserToggle!=='1')guide.open=false;
  }
  refreshMobileFilters();
 };
 // Distinguish an intentional tap from changing the <details open> property
 // programmatically; preserve the user's choice as filters update.
 for(const element of [advanced,guide]){
  element.querySelector('summary')?.addEventListener('click',()=>{
   if(mobile())element.dataset.mobileUserToggle='1';
  });
 }
 if(mobileJobsMedia){
  if(mobileJobsMedia.addEventListener)mobileJobsMedia.addEventListener('change',syncLayout);
  else mobileJobsMedia.addListener?.(syncLayout);
 }
 syncLayout();
}

/* On mobile, show a Readers two-person icon for all job view counts.
   Keep desktop's existing count label and all real view-count updates. */
function paintJobViews(element,count){
 const label=window.TYC_Views?.label(count)||'— views';
 const desktop=document.createElement('span');
 desktop.className='job-views-desktop';
 desktop.textContent=label;
 const mobile=document.createElement('span');
 mobile.className='job-views-mobile';
 const ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');
 svg.setAttribute('viewBox','0 0 24 24');
 svg.setAttribute('aria-hidden','true');
 svg.setAttribute('focusable','false');
 const addPath=d=>{const shape=document.createElementNS(ns,'path');shape.setAttribute('d',d);svg.append(shape);};
 addPath('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2');
 const head=document.createElementNS(ns,'circle');head.setAttribute('cx','9');head.setAttribute('cy','7');head.setAttribute('r','4');svg.append(head);
 addPath('M22 21v-2a4 4 0 0 0-3-3.87');
 addPath('M16 3.13a4 4 0 0 1 0 7.75');
 const value=document.createElement('span');
 value.textContent=label;
 mobile.append(svg,value);
 element.replaceChildren(desktop,mobile);
}
function renderCards(){
 refreshMobileFilters();
 const root=$('publicJobs'),q=$('jobSearch').value.trim().toLowerCase(),type=$('jobType').value;
 const role=$('jobRole').value,setting=$('jobSetting').value,location=$('jobLocation').value.trim().toLowerCase();
 const min=amount($('jobMinPay').value),unit=$('jobPayUnit').value;
 const selected=publicJobs.filter(p=>
  (!type||p.employment_type===type)&&(!role||inferredRole(p)===role)&&(!setting||inferredSetting(p)===setting)&&
  (!location||(p.location||'').toLowerCase().includes(location))&&
  (!q||[p.title,p.company,p.location,p.description,p.compensation,inferredRole(p),roleBadgeName(inferredRole(p)),inferredSetting(p),settingBadgeName(inferredSetting(p)),p.employment_type].join(' ').toLowerCase().includes(q))&&
  (!unit||p.pay_unit===unit)&&
  (min===null||(p.pay_unit&&p.pay_unit===unit&&p.pay_max!=null&&Number(p.pay_max)>=min))&&
  (!$('jobSavedOnly').checked||savedJobs.has(p.id)));
 const sort=$('jobSort').value;
 if(sort==='pta')selected.sort((a,b)=>{
  const rank=p=>{const n=jobRolePriority.indexOf(inferredRole(p));return n<0?jobRolePriority.length:n};
  return rank(a)-rank(b)||String(b.published_at||b.created_at).localeCompare(String(a.published_at||a.created_at));
 });
 else if(sort==='pay')selected.sort((a,b)=>Number(b.pay_max??b.pay_min??-1)-Number(a.pay_max??a.pay_min??-1));
 else if(sort==='deadline')selected.sort((a,b)=>(a.expires_at||'9999-12-31').localeCompare(b.expires_at||'9999-12-31'));
 else selected.sort((a,b)=>String(b.published_at||b.created_at).localeCompare(String(a.published_at||a.created_at)));
 $('jobResultCount').textContent=selected.length+' '+(selected.length===1?'OPENING':'OPENINGS');
 root.replaceChildren();
 if(!selected.length){
  const empty=node('div','career-empty');
  empty.append(node('strong','career-empty-title',publicJobs.length?'No matching opportunities':'No approved openings right now'));
  empty.append(node('p','career-empty-description',publicJobs.length?
    'Try a different role, location, or fewer filters. / 검색 조건을 조금 넓혀보세요.':
    'New opportunities will appear here once approved. / 승인된 공고가 등록되면 이곳에 표시됩니다.'));
  if(publicJobs.length){
   const clear=btn('Clear filters / 필터 초기화',()=>$('jobClearFilters').click(),'secondary');
   clear.classList.add('career-empty-clear');
   empty.append(clear);
  }
  root.append(empty);return;
 }
 selected.forEach(p=>{
  const card=node('article','card job-listing career-job-card');
  const top=node('div','career-job-card-top');
  const logo=node('div','career-job-logo');
  const src=logoUrl(p.logo_path);
  if(src){const image=node('img');image.src=src;image.alt=p.company+' logo';image.loading='lazy';image.addEventListener('error',()=>{image.remove();logo.textContent=(p.company||'J').slice(0,2).toUpperCase()});logo.append(image);}
  else logo.textContent=(p.company||'J').slice(0,2).toUpperCase();
  const head=node('div','career-job-card-header');
  head.append(node('span','career-job-company',p.company),node('span','career-job-location','⌖ '+p.location));
  const save=btn('',()=>toggleSave(p),'career-save');const bookmark=document.createElementNS('http://www.w3.org/2000/svg','svg');bookmark.setAttribute('viewBox','0 0 24 24');bookmark.setAttribute('aria-hidden','true');bookmark.setAttribute('fill',savedJobs.has(p.id)?'currentColor':'none');bookmark.setAttribute('stroke','currentColor');bookmark.setAttribute('stroke-width','1.6');const bookmarkPath=document.createElementNS('http://www.w3.org/2000/svg','path');bookmarkPath.setAttribute('d','M6 3h12v18l-6-4-6 4z');bookmark.append(bookmarkPath);save.append(bookmark);save.title=savedJobs.has(p.id)?'Remove saved job':'Save job';
  save.classList.toggle('saved',savedJobs.has(p.id));save.setAttribute('aria-pressed',String(savedJobs.has(p.id)));
  save.setAttribute('aria-label',(savedJobs.has(p.id)?'Remove saved job: ':'Save job: ')+p.title);
  top.append(logo,head,save);
  const details=node('details','job-details');
  const summary=node('summary','job-summary');
  const heading=node('span','job-title',p.title);
  const chips=node('div','career-job-chips');
  const role=inferredRole(p),setting=inferredSetting(p);
  for(const [name,value,display] of [
   ['role',role,roleBadgeName(role)],
   ['setting',setting,settingBadgeName(setting)],
   ['employment',p.employment_type,p.employment_type==='Per diem'?'Per Diem':p.employment_type]
  ]){
   const chip=node('span','career-chip career-chip-'+name,display);
   chip.title=value;
   chip.setAttribute('aria-label',name+': '+value);
   if(name==='role'&&role==='PTA')chip.classList.add('career-chip-pta');
   chips.append(chip);
  }
  const pay=node('span','career-job-pay',listedPay(p));
  const published=p.published_at||p.created_at;
  const dateInfo=node('span','career-job-date');
  dateInfo.append(node('span','career-job-date-text','POSTED '+fmtDate(published)));
  const ageBadge=jobAgeBadge(published);
  if(ageBadge)dateInfo.append(ageBadge);
  if(p.expires_at)dateInfo.append(node('span','career-job-closes','CLOSES '+fmtDate(p.expires_at)));
  const prompt=node('span','job-expand-hint','View details');prompt.append(arrowIcon());
  const excerpt=node('span','jobs-card-excerpt',String(p.description||'').trim().replace(/\s+/g,' ').slice(0,180));summary.append(heading,chips,pay,excerpt,dateInfo,prompt);
  const views=node('span','tyc-view-count job-view-count');paintJobViews(views,jobViewMap.get(p.id));views.dataset.viewId=String(p.id);summary.append(views);
  details.addEventListener('toggle',async()=>{if(!details.open||details.dataset.viewRecorded)return;details.dataset.viewRecorded='true';if(!window.TYC_Views)return;const count=await window.TYC_Views.record('job',p.id);if(count!==null){jobViewMap.set(p.id,count);paintJobViews(views,count)}});
  const body=node('div','job-expanded');
  body.append(node('p','description',p.description));
  const links=node('div','card-actions');
  if(p.apply_url&&cleanExternal(p.apply_url))links.append(safeLink('Apply online ↗',cleanExternal(p.apply_url)));
  if(p.apply_email&&cleanEmail(p.apply_email))links.append(safeLink('Apply by email','mailto:'+p.apply_email));
  body.append(links);details.append(summary,body);card.append(top,details);root.append(card);
 });
}
async function loadSaves(){
 savedJobs=new Set();
 if(!db||!user){renderCards();return;}
 const {data,error}=await db.from('job_saved_postings').select('job_id').eq('user_id',user.id);
 if(error){console.warn('Unable to load saved jobs',error);return;}
 savedJobs=new Set((data||[]).map(r=>r.job_id));renderCards();
}
async function toggleSave(p){
 if(!user){$('authDialog').showModal();return;}
 const has=savedJobs.has(p.id);
 const r=has?await db.from('job_saved_postings').delete().eq('user_id',user.id).eq('job_id',p.id):await db.from('job_saved_postings').insert({user_id:user.id,job_id:p.id});
 if(r.error){alert('Save failed: '+r.error.message);return;}
 if(has)savedJobs.delete(p.id);else savedJobs.add(p.id);
 renderCards();
}
function showLogoPreview(path=''){
 const slot=$('jobLogoPreview');slot.replaceChildren();
 if(selectedLogo){
  const img=node('img');img.src=URL.createObjectURL(selectedLogo);img.alt='Selected company logo preview';img.onload=()=>URL.revokeObjectURL(img.src);slot.append(img);
 }else if(!removeLogo&&path&&logoUrl(path)){
  const img=node('img');img.src=logoUrl(path);img.alt='Company logo';slot.append(img);
 }else slot.textContent='No logo selected';
}
function renderMine(){const root=$('myJobs');root.replaceChildren();if(!mine.length){root.append(node('p','muted','아직 등록한 공고가 없습니다.'));return;}
 mine.forEach(p=>{const row=node('div','rowjob');const info=node('div');info.append(node('strong','',p.title),node('div','small',`${p.company} · ${p.location}`),node('div','status '+p.status,(p.expires_at&&p.expires_at<new Date().toLocaleDateString('en-CA'))?'Expired / Edit to renew':(({pending:'Pending review',approved:'Approved / Public',rejected:'Needs changes'})[p.status]||p.status)));if(p.status==='rejected'&&p.rejection_reason)info.append(node('p','small','반려 사유: '+p.rejection_reason));row.append(info,btn('Edit',()=>openJob(p)));root.append(row);});}
function renderPending(){const root=$('pendingJobs');root.replaceChildren();if(!pending.length){root.append(node('p','muted','현재 승인 대기 중인 공고가 없습니다.'));return;}
 pending.forEach(p=>{const c=node('article','card');c.append(node('p','eyebrow',`${p.employment_type} · ${fmtDate(p.created_at)}`),node('h3','',p.title),node('div','subline',`${p.company} · ${p.location} · ${listedPay(p)}`),node('p','description',p.description));const actions=node('div','card-actions');actions.append(btn('Approve',()=>moderate(p.id,'approved'),'primary'),btn('Reject',()=>moderate(p.id,'rejected')));c.append(actions);root.append(c);});}
async function loadPublic(){if(!db)return;const {data,error}=await db.from('job_postings').select('id,title,company,location,employment_type,compensation,description,apply_email,apply_url,created_at,published_at,role_type,work_setting,pay_min,pay_max,pay_unit,expires_at,logo_path').eq('status','approved').or('expires_at.is.null,expires_at.gte.'+new Date().toLocaleDateString('en-CA')).order('published_at',{ascending:false});if(error){$('publicJobs').replaceChildren(node('p','muted','공고를 불러올 수 없습니다: '+error.message));return;}publicJobs=data||[];renderCards();if(window.TYC_Views){const map=await window.TYC_Views.counts('job',publicJobs.map(j=>j.id));jobViewMap=map;document.querySelectorAll('#publicJobs [data-view-id]').forEach(el=>{const n=map.get(el.dataset.viewId);if(n!==undefined)paintJobViews(el,n)});}}
async function loadMine(){if(!db||!user)return;const {data,error}=await db.from('job_postings').select('*').eq('owner_id',user.id).order('created_at',{ascending:false});if(error){$('myJobs').replaceChildren(node('p','muted',error.message));return;}mine=data||[];renderMine();}
async function loadPending(){if(!db||!isAdmin)return;const {data,error}=await db.from('job_postings').select('*').eq('status','pending').order('created_at',{ascending:true});if(error){$('pendingJobs').replaceChildren(node('p','muted',error.message));return;}pending=data||[];renderPending();}
async function moderate(id,status){if(!user||!isAdmin)return;let reason=null;if(status==='rejected'){reason=prompt('Optional: reason for rejection / 반려 사유')||null;}
 const {error}=await db.from('job_postings').update({status,rejection_reason:reason}).eq('id',id);if(error){alert('처리 실패: '+error.message);return;}await Promise.all([loadPublic(),loadPending(),loadMine()]);}
function openJob(p=null){if(!user){$('authDialog').showModal();return;}
 $('jobForm').reset();selectedLogo=null;removeLogo=false;setText('jobMessage','');$('expiresAt').min=localDay();$('editingId').value=p?.id||'';$('jobDialogTitle').textContent=p?'Edit Job Posting':'Post a Job';
 const mapping={positionTitle:'title',company:'company',location:'location',employmentType:'employment_type',compensation:'compensation',applyEmail:'apply_email',applyUrl:'apply_url',description:'description',roleType:'role_type',workSetting:'work_setting',payMin:'pay_min',payMax:'pay_max',payUnit:'pay_unit',expiresAt:'expires_at'};
 for(const [id,key] of Object.entries(mapping))$(id).value=p?.[key]??'';
 showLogoPreview(p?.logo_path);$('jobDialog').showModal();}
async function saveJob(event){
 event.preventDefault();if(!db||!user)return;
 const body=getBody(),err=validateJob(body);
 if(err){setText('jobMessage',err,true);return;}
 const editId=$('editingId').value,existing=mine.find(p=>p.id===editId);
 const submit=$('saveJobBtn');submit.disabled=true;setText('jobMessage','Saving your posting…');
 let uploaded=null;
 try{
  if(selectedLogo){
   const path=user.id+'/'+crypto.randomUUID()+'.'+allowedLogos[selectedLogo.type];
   const {error:uploadError}=await db.storage.from(logoBucket).upload(path,selectedLogo,{contentType:selectedLogo.type,upsert:false,cacheControl:'3600'});
   if(uploadError)throw uploadError;
   uploaded=path;body.logo_path=path;
  }else if(removeLogo)body.logo_path=null;
  const result=editId?await db.from('job_postings').update(body).eq('id',editId).eq('owner_id',user.id).select('id'):
   await db.from('job_postings').insert({...body,owner_id:user.id}).select('id');
  if(result.error)throw result.error;
  if(!result.data?.length)throw Error('You do not have permission to edit this listing.');
  if(existing?.logo_path&&(removeLogo||uploaded)&&existing.logo_path!==body.logo_path){
   const {error:cleanup}=await db.storage.from(logoBucket).remove([existing.logo_path]);
   if(cleanup)console.warn('Old logo cleanup failed',cleanup);
  }
  $('jobDialog').close();selectedLogo=null;removeLogo=false;
  await Promise.all([loadMine(),loadPending(),loadPublic()]);
  alert('Posting submitted. An administrator must approve it before publication.');
 }catch(e){
  if(uploaded)await db.storage.from(logoBucket).remove([uploaded]);
  setText('jobMessage','Save failed: '+e.message,true);
 }finally{submit.disabled=false;}
}
async function onSession(session){user=session?.user||null;isAdmin=false;
 if(user){const {data}=await db.from('job_admins').select('user_id').eq('user_id',user.id).maybeSingle();isAdmin=!!data;}
 show('accountArea',!!user);show('adminArea',!!isAdmin);show('logoutBtn',!!user);$('authBtn').textContent=user?'My Account':'Sign Up / Log In';
 setText('identity',user?`Signed in: ${user.email}${isAdmin?' · Administrator':''}`:'No login is required to browse published job postings.');
 if(user){await loadMine();await loadSaves();if(isAdmin)await loadPending();}else{mine=[];pending=[];savedJobs.clear();renderCards();}
}
async function doAuth(mode){if(!db)return;const email=$('authEmail').value.trim(),password=$('authPassword').value;setText('authMessage','');if(!email||!password){setText('authMessage','이메일과 비밀번호를 입력해 주세요.',true);return;}
 const {data,error}=mode==='signup'?await db.auth.signUp({email,password,options:{emailRedirectTo:new URL('jobs.html',location.href).href}}):await db.auth.signInWithPassword({email,password});
 if(error){setText('authMessage',error.message,true);return;}
 if(mode==='signup'&&!data.session){setText('authMessage','가입 확인 이메일을 확인해 주세요. 확인 후 로그인할 수 있습니다.');return;}
 $('authDialog').close();await onSession(data.session);}
async function passwordReset(){const email=$('authEmail').value.trim();if(!email){setText('authMessage','먼저 이메일을 입력해 주세요.',true);return;}const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:new URL('jobs.html',location.href).href});setText('authMessage',error?error.message:'비밀번호 재설정 이메일을 확인해 주세요.',!!error);}
async function init(){
 setupMobileFilters();
 ['jobSearch','jobLocation'].forEach(id=>$(id).addEventListener('input',renderCards));
 $('jobMinPay').addEventListener('input',()=>{if($('jobMinPay').value&&!$('jobPayUnit').value)$('jobPayUnit').value='hour';renderCards();});
 ['jobType','jobRole','jobSetting','jobPayUnit','jobSavedOnly','jobSort'].forEach(id=>$(id).addEventListener('change',renderCards));
 $('jobClearFilters').addEventListener('click',()=>{
  ['jobSearch','jobLocation','jobMinPay','jobRole','jobSetting','jobType','jobPayUnit'].forEach(id=>$(id).value='');
  $('jobSavedOnly').checked=false;$('jobSort').value='pta';renderCards();
 });
 $('jobLogo').addEventListener('change',e=>{selectedLogo=e.target.files[0]||null;if(selectedLogo){removeLogo=false;}showLogoPreview(mine.find(p=>p.id===$('editingId').value)?.logo_path);});
 $('removeJobLogo').addEventListener('click',()=>{selectedLogo=null;removeLogo=true;$('jobLogo').value='';showLogoPreview();});
 $('authBtn').addEventListener('click',()=>{if(user){$('accountArea').scrollIntoView({behavior:'smooth'});}else $('authDialog').showModal();});
 $('newJobBtn').addEventListener('click',()=>openJob());$('jobSidebarPost')?.addEventListener('click',()=>{if(!$('newJobBtn').disabled)$('newJobBtn').click()});$('jobSearchSubmit')?.addEventListener('click',renderCards);$('cancelJobBtn').addEventListener('click',()=>$('jobDialog').close());
 $('jobForm').addEventListener('submit',saveJob);$('authForm').addEventListener('submit',e=>{e.preventDefault();doAuth('login');});$('signupSubmit').addEventListener('click',()=>doAuth('signup'));
 $('resetPassword').addEventListener('click',passwordReset);$('logoutBtn').addEventListener('click',async()=>{await db.auth.signOut();await onSession(null);});
 if(!configOk||!window.supabase?.createClient){show('setupNotice',true);$('publicJobs').replaceChildren(node('p','muted','회원 게시판을 연결하려면 Supabase 설정이 필요합니다.'));$('authBtn').disabled=true;$('newJobBtn').disabled=true;return;}
 db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data:{session}}=await db.auth.getSession();await onSession(session);await loadPublic();
 db.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'){setTimeout(async()=>{const password=prompt('Enter a new password (at least 6 characters)');if(password){const {error}=await db.auth.updateUser({password});alert(error?error.message:'Password updated.');}},0);}else if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='TOKEN_REFRESHED'){setTimeout(()=>onSession(session),0);}});
}
init().catch(err=>{show('setupNotice',true);$('setupNotice').textContent='설정 확인 필요: '+err.message;});
})();