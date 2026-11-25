/* Private complete account directory. Auth users are obtained exclusively
   from a full-admin-authorized server function, never via a browser secret. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const cell=(tag,text,cls='')=>{const node=document.createElement(tag);node.textContent=String(text??'—');if(cls)node.className=cls;return node};
 const names={full:'Full Administrator',shop:'SHOP Manager',community:'Community Manager',member:'Standard Member'};
 const roles=['member','shop','community','full'];
 const format=v=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})};
 const dateTime=v=>{if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toLocaleString('en-US',{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})};
 const msg=(value,error=false)=>{const n=$('all-users-status');n.textContent=value;n.classList.toggle('error',error);n.hidden=false;};
 let client,people=[],loading=false,moderationBusy=false,pendingBanTarget=null,pendingDeleteTarget=null;
 async function service(body){
  const {data:{session},error}=await client.auth.getSession();
  if(error||!session)throw Error('Log in with your full administrator account.');
  const result=await fetch(window.TYC_SUPABASE_URL.replace(/\/$/,'')+'/functions/v1/tyc-user-directory',{
   method:'POST',mode:'cors',cache:'no-store',
   headers:{'Content-Type':'application/json','apikey':window.TYC_SUPABASE_PUBLISHABLE_KEY,
    'Authorization':'Bearer '+session.access_token},body:JSON.stringify(body)
  });
  let data={};try{data=await result.json()}catch{}
  if(!result.ok)throw Error(data.error||'Unable to load user directory');
  return data;
 }
 function countFiltered(){
  const q=$('users-search').value.trim().toLocaleLowerCase(),kind=$('users-type').value,order=$('users-sort').value;
  return people.filter(u=>{
   const match=!q||[u.name,u.nickname,u.email,u.membership_type,u.membership_status,u.role].some(v=>String(v||'').toLocaleLowerCase().includes(q));
   if(!match)return false;
   if(kind==='general')return !u.membership_type;
   if(kind==='membership')return !!u.membership_type;
   if(kind==='approved')return u.membership_status==='approved';
   if(kind==='pending')return u.membership_status==='pending';
   if(kind==='banned')return u.banned===true;
   return true;
  }).sort((a,b)=>{
   if(order==='oldest')return (Date.parse(a.joined_at)||0)-(Date.parse(b.joined_at)||0);
   if(order==='name')return a.name.localeCompare(b.name,'en',{sensitivity:'base'});
   if(order==='active')return (Date.parse(b.last_seen_at)||0)-(Date.parse(a.last_seen_at)||0);
   if(order==='role')return roles.indexOf(b.role)-roles.indexOf(a.role);
   return (Date.parse(b.joined_at)||0)-(Date.parse(a.joined_at)||0);
  });
 }
 function render(){
  const users=countFiltered(),root=$('users-table-body');
  root.replaceChildren();
  $('users-match-count').textContent=users.length+' of '+people.length+' accounts';
  if(!users.length){
   const row=document.createElement('tr'),td=cell('td','No matching users / 해당하는 회원이 없습니다.','tyc-users-empty');td.colSpan=10;row.append(td);root.append(row);return;
  }
  for(const u of users){
   const tr=document.createElement('tr');
   const name=cell('td',u.name,'tyc-users-name');
   name.append(cell('small',u.membership_type?(u.membership_type+' · '+(u.membership_status||'unknown')):'General account','tyc-users-type'));
   if(u.banned)name.append(cell('span','BANNED / 강퇴','tyc-users-ban-badge'));
   tr.append(name,cell('td',u.nickname),cell('td',u.email),cell('td',format(u.joined_at)),
    cell('td',format(u.applied_at)),cell('td',format(u.approved_at)));
   const visit=cell('td',dateTime(u.last_seen_at)||'Not recorded');
   if(!u.last_seen_at){
    visit.title=u.last_sign_in_at?'Last signed in: '+(dateTime(u.last_sign_in_at)||'Unknown')+'; this is not a recorded site visit':'No tracked visit yet';
   }
   tr.append(visit);
   const presence=document.createElement('td');
   const dot=cell('span',u.banned?'Banned':u.online?'Online':'Offline','tyc-users-presence '+(u.banned?'is-banned':u.online?'is-online':'is-offline'));
   dot.title=u.online?'Active during the last 2 minutes 30 seconds':'No recent visible activity';
   presence.append(dot);tr.append(presence);
   const privilege=document.createElement('td');
   const control=document.createElement('div');control.className='tyc-users-role-control';
   const picker=document.createElement('select');picker.setAttribute('aria-label','Administrator permissions for '+u.email);
   for(const role of roles){
    const opt=new Option(names[role],role);picker.add(opt);
   }
   picker.value=u.role;
   const save=cell('button','Save','tyc-users-role-save');save.type='button';save.disabled=true;
   const protectedRole=u.owner||u.id===window.__tycCurrentFullAdmin||u.banned;
   if(protectedRole){picker.disabled=true;save.disabled=true;}
   const status=cell('small',u.owner?'Site owner · protected':u.id===window.__tycCurrentFullAdmin?'Your account · protected':u.banned?'Banned accounts cannot be promoted':'','tyc-users-role-note');
   picker.addEventListener('change',()=>{save.disabled=picker.value===u.role;});
   save.addEventListener('click',async()=>{
    if(save.disabled||loading)return;
    const candidate=picker.value;
    const prompt='Change permissions for '+u.email+'?\n\n'+names[u.role]+' → '+names[candidate]+'\n\nThis changes actual page and database permissions.';
    if(!window.confirm(prompt)){picker.value=u.role;save.disabled=true;return;}
    save.disabled=true;picker.disabled=true;loading=true;msg('Updating role for '+u.email+'…');
    try{
     const updated=await service({action:'set_role',user_id:u.id,role:candidate});
     u.role=updated.role||candidate;
     loading=false;
     await refresh();
     msg('✓ Permission updated: '+u.email+' → '+names[u.role]+(updated.warning?' ('+updated.warning+')':''));
    }catch(error){
     picker.value=u.role;msg(error.message||'Permission update failed',true);
    }finally{loading=false;picker.disabled=protectedRole;save.disabled=picker.value===u.role;}
   });
   control.append(picker,save);
   privilege.append(control,status);tr.append(privilege);
   const moderation=document.createElement('td');
   moderation.className='tyc-users-moderation';
   const protectedAccount=u.owner||u.id===window.__tycCurrentFullAdmin;
   if(u.banned){
    const banInfo=cell('small','Banned '+format(u.banned_at),'tyc-users-ban-date');
    const reason=cell('span',u.ban_reason||'Reason unavailable','tyc-users-ban-reason');
    reason.title=u.ban_reason||'';
    const remove=cell('button','Delete & Re-signup','tyc-users-action-delete');remove.type='button';
    remove.disabled=protectedAccount;
    remove.addEventListener('click',()=>openDeletion(u));
    moderation.append(banInfo,reason,remove);
   }else{
    const ban=cell('button','Ban / 강퇴','tyc-users-action-ban');ban.type='button';
    ban.disabled=protectedAccount||u.role==='full';
    ban.title=u.role==='full'?'Demote this full administrator before banning':protectedAccount?'Protected administrator account':'Ban this member and enter a reason';
    ban.addEventListener('click',()=>openBan(u));
    moderation.append(ban);
   }
   tr.append(moderation);root.append(tr);
  }
 }
 function renderCounts(s){
  for(const [id,value] of Object.entries({
   'users-total':s.total,'users-applied':s.applied,'users-general':s.standard,
   'users-approved':s.approved,'users-pending':s.pending,'users-online':s.online,'users-banned':s.banned
  }))$(id).textContent=Number(value||0).toLocaleString('en-US');
 }
 async function refresh(){
  if(loading)return;loading=true;
  try{
   const payload=await service({action:'list'});
   people=payload.users||[];renderCounts(payload.stats||{});render();
   $('all-users-dashboard').hidden=false;$('all-users-status').hidden=true;
  }finally{loading=false;}
 }

 function openBan(account){
  if(moderationBusy||loading||account.owner||account.role==='full'||account.banned)return;
  pendingBanTarget=account;
  $('tyc-ban-target').textContent=account.name+' · '+account.nickname+' · '+account.email;
  $('tyc-ban-reason').value='';
  $('tyc-ban-feedback').textContent='';
  $('tyc-ban-dialog').showModal();
  $('tyc-ban-reason').focus();
 }
 function openDeletion(account){
  if(moderationBusy||loading||account.owner||!account.banned)return;
  pendingDeleteTarget=account;
  $('tyc-ban-delete-target').textContent=account.email;
  $('tyc-ban-delete-email').value='';
  $('tyc-ban-delete-word').value='';
  $('tyc-ban-delete-feedback').textContent='';
  $('tyc-ban-delete-dialog').showModal();
  $('tyc-ban-delete-email').focus();
 }
 function setupModeration(){
  const banDialog=$('tyc-ban-dialog'),deleteDialog=$('tyc-ban-delete-dialog');
  banDialog.querySelector('[data-ban-cancel]').addEventListener('click',()=>{if(!moderationBusy)banDialog.close()});
  deleteDialog.querySelector('[data-ban-delete-cancel]').addEventListener('click',()=>{if(!moderationBusy)deleteDialog.close()});
  $('tyc-ban-form').addEventListener('submit',async event=>{
   event.preventDefault();if(moderationBusy||!pendingBanTarget)return;
   const account=pendingBanTarget,reason=$('tyc-ban-reason').value.trim();
   if(reason.length<10||reason.length>500){
    $('tyc-ban-feedback').textContent='Please enter a clear reason (10–500 characters).';return;
   }
   if(!window.confirm('Ban '+account.email+'?\n\nThey will be signed out and see the recorded reason when trying to log in. This cannot be reversed without deleting their account.'))return;
   moderationBusy=true;const button=$('tyc-ban-form').querySelector('button[type="submit"]');button.disabled=true;
   $('tyc-ban-feedback').textContent='Applying ban…';
   try{
    await service({action:'ban',user_id:account.id,reason});
    pendingBanTarget=null;banDialog.close();
    msg('✓ Banned: '+account.email);
    await refresh();
   }catch(error){$('tyc-ban-feedback').textContent=error.message||'Ban failed';msg(error.message||'Ban failed',true)}
   finally{moderationBusy=false;button.disabled=false;}
  });
  $('tyc-ban-delete-form').addEventListener('submit',async event=>{
   event.preventDefault();if(moderationBusy||!pendingDeleteTarget)return;
   const account=pendingDeleteTarget,email=$('tyc-ban-delete-email').value.trim();
   const word=$('tyc-ban-delete-word').value.trim();
   if(email.toLowerCase()!==account.email.toLowerCase()||word!=='DELETE'){
    $('tyc-ban-delete-feedback').textContent='The email and DELETE confirmation must match exactly.';return;
   }
   if(!window.confirm('PERMANENTLY DELETE '+account.email+'?\n\nThis permanently removes the old account and may delete membership applications, posts, replies, messages and other linked records. The person must sign up from the beginning. This cannot be undone.'))return;
   moderationBusy=true;const button=$('tyc-ban-delete-form').querySelector('button[type="submit"]');button.disabled=true;
   $('tyc-ban-delete-feedback').textContent='Deleting banned account…';
   try{
    await service({action:'delete_banned',user_id:account.id,confirm_email:email});
    pendingDeleteTarget=null;deleteDialog.close();
    msg('✓ Old account deleted. '+email+' can register a fresh account.');
    await refresh();
   }catch(error){$('tyc-ban-delete-feedback').textContent=error.message||'Deletion failed. The ban is still active.';msg(error.message||'Deletion failed. The ban remains active.',true)}
   finally{moderationBusy=false;button.disabled=false;}
  });
 }
 async function init(){
  if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL){msg('Supabase unavailable',true);return;}
  client=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user){window.location.replace('auth.html?next=admin-users.html');return;}
  window.__tycCurrentFullAdmin=data.user.id;
  const full=await client.from('job_admins').select('user_id').eq('user_id',data.user.id).maybeSingle();
  if(full.error||!full.data){msg('Only full administrators can manage all accounts and assign permissions.',true);return;}
  setupModeration();
  for(const id of ['users-search','users-type','users-sort']){
   $(id).addEventListener(id==='users-search'?'input':'change',render);
  }
  $('users-refresh').addEventListener('click',async()=>{msg('Refreshing account directory…');try{await refresh()}catch(e){msg(e.message,true);}});
  await refresh();
  // Refresh online indicators while the dashboard is visible, but never
  // replace a role selector while the administrator has an unsaved choice.
  window.setInterval(()=>{
   if(document.hidden||loading)return;
   const hasDraft=Array.from(document.querySelectorAll('.tyc-users-role-save')).some(b=>!b.disabled);
   if(hasDraft)return;
   void refresh().catch(error=>msg(error.message||'Unable to refresh user status',true));
  },60000);
 }
 init().catch(error=>msg(error.message||'Unable to load the account directory',true));
})();