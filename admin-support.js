/* THE YOUNG CLUB / private administrator Support Inbox.
   Admin role is validated by the database; all message text is escaped via textContent. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const panel=$('support-admin-zone');
 if(!panel)return;
 let db=null,selected=null,threads=[],ready=false,unreadOnly=false,filter='';
 let listBusy=false,chatBusy=false,sendBusy=false,resolveBusy=false,timer=null,openVersion=0;
 let previousMessageIds='',lastThreadId=null,lastListSig='';
 const status=$('support-admin-status'),list=$('support-admin-list'),msgs=$('support-admin-messages');
 const feedback=$('support-admin-feedback');
 const replyForm=$('support-admin-reply-form'),reply=$('support-admin-reply');
 const send=$('support-admin-send'),resolve=$('support-admin-resolve');
 function note(message,error=false){feedback.textContent=message;feedback.classList.toggle('is-error',error);}
 function notice(message,error=false){
  status.textContent=message;status.classList.toggle('error',error);
  status.hidden=false;
 }
 function displayDate(value,short=false){
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return '';
  return short?d.toLocaleDateString([],{month:'short',day:'numeric'})
   :d.toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
 }
 function div(tag,cls,text){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
 }
 function tellHeader(){window.dispatchEvent(new Event('tyc-admin-queue-updated'));}
 const roles={admin:'ADMIN',pta:'VERIFIED PTA',spta:'VERIFIED SPTA',pending:'PENDING VERIFICATION',registered:'REGISTERED MEMBER',guest:'GUEST'};
 function roleBadge(t){const key=Object.hasOwn(roles,t.member_role)?t.member_role:(t.member?'registered':'guest');return div('span','tyc-support-role role-'+key,roles[key]);}
 function paintThreads(){
  const matching=threads.filter(t=>{
   if(unreadOnly&&!(t.unread>0))return false;
   const term=filter.trim().toLocaleLowerCase();
   return !term||[t.name,t.original_name,t.email,t.source,t.last_text].some(s=>String(s||'').toLocaleLowerCase().includes(term));
  });
  list.replaceChildren();
  $('support-admin-count').textContent=String(threads.length);
  if(!matching.length){
   list.append(div('p','tyc-support-admin-empty',threads.length?'No conversations match your search. / 검색 결과가 없습니다.':'아직 문의가 없습니다. / No messages yet.'));
   return;
  }
  for(const t of matching){
   const btn=div('button','tyc-support-admin-thread-btn'+(selected===t.id?' is-active':''));
   btn.type='button';
   btn.setAttribute('role','listitem');
   btn.setAttribute('aria-label',t.name+(t.unread?' · '+t.unread+' unread':''));
   const top=div('div','tyc-support-admin-thread-top');
   top.append(div('span','tyc-support-admin-thread-name',t.name||'Visitor'),div('time','tyc-support-admin-thread-time',displayDate(t.last_at,true)));
   btn.append(top);
   btn.append(roleBadge(t));const identity=div('span','tyc-support-admin-identity',t.email||'No email provided');btn.append(identity);
   if(t.original_name&&t.original_name!==t.name)btn.append(div('span','tyc-support-admin-identity','Previously: '+t.original_name));
   btn.append(div('span','tyc-support-admin-thread-preview',t.last_text||'New conversation'));
   const flags=div('div','tyc-support-admin-thread-flags');
   flags.append(div('span','tyc-support-admin-thread-source',String(t.source||'website').toUpperCase()));
   if(t.unread>0)flags.append(div('span','tyc-support-admin-thread-unread',t.unread+' NEW'));
   if(t.visitor_online&&!t.closed)flags.append(div('span','tyc-support-admin-thread-online','ONLINE'));
   if(t.closed)flags.append(div('span','tyc-support-admin-thread-closed','RESOLVED'));
   btn.append(flags);
   btn.addEventListener('click',()=>{void chooseThread(t.id)});
   list.append(btn);
  }
 }
 async function fetchThreads(){
  if(!ready||document.hidden||listBusy)return;
  listBusy=true;
  try{
   const {data,error}=await db.rpc('tyc_support_admin_list');
   if(error)throw error;
   const next=Array.isArray(data)?data:[];
   const signature=JSON.stringify(next);
   threads=next;
   if(signature!==lastListSig){lastListSig=signature;paintThreads();}
  }catch(error){note('Could not refresh inbox: '+(error.message||'Please retry.'),true);}
  finally{listBusy=false;}
 }
 function renderMessages(messages){
  const ids=JSON.stringify(messages.map(m=>m.id));
  if(ids===previousMessageIds&&lastThreadId===selected)return;
  const wasNearEnd=msgs.scrollHeight-msgs.scrollTop-msgs.clientHeight<65;
  previousMessageIds=ids;lastThreadId=selected;
  msgs.replaceChildren();
  if(!messages.length){
   msgs.append(div('p','tyc-support-admin-select','No messages yet. / 아직 메시지가 없습니다.'));
   return;
  }
  for(const m of messages){
   const bubble=div('div','tyc-support-admin-message'+(m.sender==='admin'?' is-admin':''));
   bubble.append(div('div','tyc-support-admin-message-meta',(m.sender==='admin'?'THE YOUNG CLUB':'Visitor')+' · '+displayDate(m.created_at)));
   bubble.append(div('div','tyc-support-admin-message-body',m.body));
   msgs.append(bubble);
  }
  if(wasNearEnd||msgs.scrollTop===0)msgs.scrollTop=msgs.scrollHeight;
 }
 async function readThread(){
  if(!ready||!selected||document.hidden||chatBusy)return;
  chatBusy=true;
  const id=selected,version=openVersion;
  try{
   const {data,error}=await db.rpc('tyc_support_admin_open',{p_thread:id});
   if(error)throw error;
   if(version!==openVersion||id!==selected)return;
   $('support-admin-visitor').textContent=data?.name||'Visitor';
   const extra=[data?.email||'No email provided',data?.original_name&&data.original_name!==data.name?'Original nickname: '+data.original_name:'',data?.source?'From '+data.source:''].filter(Boolean).join(' · ');
   $('support-admin-visitor-meta').replaceChildren(roleBadge(data||{}),document.createTextNode(' · '+extra));
   const online=$('support-admin-online');
   online.classList.toggle('is-online',!!data?.visitor_online&&!data?.closed);
   online.textContent=data?.closed?'Resolved / 대화 종료'
    :data?.visitor_online?'Visitor online · 실시간 대화':'Visitor offline · 답장 저장 가능';
   resolve.hidden=false;
   resolve.textContent=data?.closed?'Reopen / 다시 열기':'Mark Resolved / 처리 완료';
   resolve.dataset.closed=String(!!data?.closed);
   replyForm.hidden=!!data?.closed;
   renderMessages(data?.messages||[]);
  }catch(e){note('Could not load conversation: '+(e.message||'Please retry.'),true);}
  finally{chatBusy=false;}
 }
 async function chooseThread(id){
  if(!ready)return;
  selected=id;openVersion++;previousMessageIds='';
  note('');
  paintThreads();
  await readThread();
  void fetchThreads();
  tellHeader();
 }
 async function sendReply(event){
  event.preventDefault();
  if(!selected||sendBusy)return;
  const body=reply.value.trim();
  if(!body||body.length>1500)return;
  sendBusy=true;send.disabled=true;note('Sending reply… / 답장 전송 중…');
  try{
   const {error}=await db.rpc('tyc_support_admin_send',{p_thread:selected,p_body:body});
   if(error)throw error;
   reply.value='';note('✓ Reply saved. The visitor will see it when they return. / 답장이 저장되었습니다.');
   await readThread();void fetchThreads();tellHeader();
  }catch(e){note('Could not send reply: '+(e.message||'Please retry.'),true);}
  finally{sendBusy=false;send.disabled=false;}
 }
 async function toggleResolved(){
  if(!selected||resolveBusy)return;
  const close=resolve.dataset.closed!=='true';
  if(close&&!window.confirm('Mark this conversation as resolved? / 이 대화를 처리 완료하시겠습니까?'))return;
  resolveBusy=true;resolve.disabled=true;
  try{
   const {error}=await db.rpc('tyc_support_admin_close',{p_thread:selected,p_close:close});
   if(error)throw error;
   note(close?'✓ Conversation marked as resolved. / 처리 완료되었습니다.':'✓ Conversation reopened. / 대화를 다시 열었습니다.');
   await readThread();void fetchThreads();tellHeader();
  }catch(e){note('Could not update conversation: '+(e.message||'Please retry.'),true);}
  finally{resolveBusy=false;resolve.disabled=false;}
 }
 async function init(){
  if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){
   notice('Supabase is unavailable. / 서버 연결을 확인해 주세요.',true);return;
  }
  db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
  let user=null;
  try{
   const {data,error}=await db.auth.getUser();if(error)throw error;
   user=data?.user;
  }catch{}
  if(!user){notice('Administrator sign-in required. / 관리자 로그인이 필요합니다.');return;}
  const {data:admin,error:roleError}=await db.from('job_admins')
   .select('user_id').eq('user_id',user.id).maybeSingle();
  if(roleError||!admin){notice('Administrator access required. / 관리자 계정에서만 접근할 수 있습니다.',true);return;}
  ready=true;panel.hidden=false;status.hidden=true;
  $('support-admin-refresh').addEventListener('click',()=>{void fetchThreads();if(selected)void readThread();});
  $('support-admin-search').addEventListener('input',event=>{filter=event.target.value;paintThreads();});
  $('support-admin-unread-only').addEventListener('change',event=>{unreadOnly=event.target.checked;paintThreads();});
  replyForm.addEventListener('submit',sendReply);
  reply.addEventListener('keydown',event=>{
   if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();replyForm.requestSubmit();}
  });
  resolve.addEventListener('click',()=>void toggleResolved());
  await fetchThreads();
  timer=setInterval(()=>{
   if(document.hidden||!ready)return;
   void fetchThreads();
   if(selected)void readThread();
  },4500);
  document.addEventListener('visibilitychange',()=>{
   if(!document.hidden&&ready){void fetchThreads();if(selected)void readThread();}
  });
  window.addEventListener('pagehide',()=>{clearInterval(timer)});
 }
 init().catch(error=>notice('Could not load Support Inbox: '+(error.message||'Try again.'),true));
})();
