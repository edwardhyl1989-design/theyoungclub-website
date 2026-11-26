/* THE YOUNG CLUB — visitor-to-admin support chat.
   Public on Blog + individual posts, Community, PTA News and Jobs. No client-side secrets. */
(()=>{'use strict';
 const path=(location.pathname.split('/').filter(Boolean).pop()||'index.html').toLowerCase();
 const page=path.includes('.')?path:path+'.html';
 if(!new Set(['blog.html','post.html','community.html','community-ko.html','community-en.html','pta-news.html','jobs.html','the-club.html']).has(page))return;
 const clubEnglish=page==='the-club.html'||page==='community-en.html';
 const wrapper=document.createElement('div');
 wrapper.className='tyc-support-widget';
 wrapper.innerHTML=[
  '<button class="tyc-support-launcher" type="button" aria-expanded="false" aria-controls="tyc-support-panel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.3a8.4 8.4 0 0 1-8.6 8.3 8.4 8.4 0 0 1-4.1-1.1L3.5 20l1.5-4A8.3 8.3 0 1 1 20.5 11.3Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7.9 11.6h8.2M7.9 14.5h5.3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span>Chat with TYC Admin</span><span class="tyc-support-launcher-sub">문의 · 메시지 남기기</span><span class="tyc-support-launcher-emoji" aria-hidden="true">💬</span></button>',
  '<section id="tyc-support-panel" class="tyc-support-panel" role="dialog" aria-label="Chat with TYC Admin" hidden>',
   '<div class="tyc-support-heading"><div><h2>Chat with TYC Admin<span>.</span></h2></div><button type="button" class="tyc-support-close" aria-label="Close support chat">×</button></div>',
   '<div class="tyc-support-state"><span class="tyc-support-status-dot"></span><span class="tyc-support-status-text">Checking availability…</span></div>',
   '<div class="tyc-support-transcript" role="log" aria-live="polite" aria-relevant="additions text"><div class="tyc-support-empty"><span lang="ko">안녕하세요! 무엇을 도와드릴까요? 👋</span><span lang="en">Hi! How can we help?</span><small>Replies are saved in this browser. / 답변은 이 브라우저에 저장됩니다.</small></div></div>',
   '<form class="tyc-support-form" novalidate>',
    '<div class="tyc-support-guest" hidden><label>Your name / 이름<input class="tyc-support-name" type="text" maxlength="60" autocomplete="name" placeholder="Name (required)" required></label><label>Email (optional) / 이메일<input class="tyc-support-email" type="email" maxlength="160" autocomplete="email" placeholder="For a follow-up outside this browser"></label></div>',
    '<label class="tyc-support-message-label" for="tyc-support-input">Message / 메시지</label>',
    '<textarea id="tyc-support-input" class="tyc-support-input" maxlength="1500" rows="2" required placeholder="Type a message / 메시지 입력…"></textarea>',
    '<div class="tyc-support-submit"><button type="submit" aria-label="Send message / 메시지 전송" title="Send / 전송"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7Z M22 2 11 13"/></svg></button></div>',
   '</form>',
   '<p class="tyc-support-feedback" role="status" aria-live="polite"></p>',
   '<button type="button" class="tyc-support-new" hidden>+ New conversation / 새 문의 작성</button>',
   '<p class="tyc-support-privacy">No sensitive or patient information, medical records or passwords. / 개인정보·환자정보·비밀번호 전송 금지.</p>',
  '</section>'
 ].join('');
 if(clubEnglish){wrapper.querySelectorAll('[lang=ko]').forEach(n=>n.remove());const pairs={'문의 · 메시지 남기기':'Leave a message',' / 답변은 이 브라우저에 저장됩니다.':'',' / 이름':'',' / 이메일':'',' / 메시지 입력…':'…',' / 메시지 전송':'',' / 메시지':'',' / 전송':'',' / 새 문의 작성':'',' / 개인정보·환자정보·비밀번호 전송 금지.':''};let markup=wrapper.innerHTML;for(const [from,to] of Object.entries(pairs))markup=markup.replaceAll(from,to);wrapper.innerHTML=markup;}
 document.body.append(wrapper);
 const $=selector=>wrapper.querySelector(selector);
 const launch=$('.tyc-support-launcher'),panel=$('.tyc-support-panel'),close=$('.tyc-support-close');
 const form=$('.tyc-support-form'),guestForm=$('.tyc-support-guest'),name=$('.tyc-support-name'),email=$('.tyc-support-email');
 const input=$('.tyc-support-input'),transcript=$('.tyc-support-transcript'),statusText=$('.tyc-support-status-text');
 const statusDot=$('.tyc-support-status-dot'),launcherSub=$('.tyc-support-launcher-sub'),feedback=$('.tyc-support-feedback'),newButton=$('.tyc-support-new'),sendButton=form.querySelector('button[type="submit"]');
 const alertDot=document.createElement('span');alertDot.className='tyc-support-alert';alertDot.textContent='!';alertDot.hidden=true;alertDot.setAttribute('aria-hidden','true');launch.append(alertDot);
 const widgetStorage='tyc-support-guest-v1';
 const sourcePage=page.replace('.html','');
 const state={admin:false,roleReady:false,roleVersion:0,db:null,uid:null,guestKey:null,thread:null,open:false,busy:false,polling:false,lastMessages:'',timer:null,initializing:null};
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const adminBox=el('div','tyc-support-operator');adminBox.hidden=true;panel.append(adminBox);
 const adminBar=el('div','tyc-support-operator-bar'),adminTitle=el('strong','',(clubEnglish?'Inbox':'Inbox / 문의 목록')),fullInbox=el('a','','Full Inbox ↗');fullInbox.href='admin-support.html';adminBar.append(adminTitle,fullInbox);
 const adminList=el('div','tyc-support-operator-list'),adminLog=el('div','tyc-support-transcript'),adminMeta=el('p','tyc-support-operator-meta'),adminActions=el('div','tyc-support-operator-bar'),back=el('button','','← Inbox'),resolve=el('button','','Resolve');back.type=resolve.type='button';adminActions.append(back,resolve);
 const adminForm=el('form','tyc-support-form'),adminInput=el('textarea','tyc-support-input'),adminSubmit=el('button','',(clubEnglish?'Send':'Send / 전송')),adminFeedback=el('p','tyc-support-feedback');adminInput.maxLength=1500;adminInput.required=true;adminInput.placeholder=(clubEnglish?'Reply':'Reply / 답장');adminSubmit.type='submit';adminForm.append(adminInput,adminSubmit);
 adminBox.append(adminBar,adminList,adminActions,adminMeta,adminLog,adminForm,adminFeedback);
 let adminThread=null,adminEpoch=0,adminPolling=false,adminSending=false,adminClosed=false,adminSig='',alertBusy=false;
 const visitorParts=[ $('.tyc-support-state'),transcript,form,feedback,newButton,$('.tyc-support-privacy') ];
 function badge(n){alertDot.hidden=!(n>0);launch.setAttribute('aria-label',(state.admin?'Admin Inbox':'Chat with TYC Admin')+(n>0?' · '+n+' unread':''));}
 async function rpc(name,args={}){const r=await state.db.rpc(name,args);if(r.error)throw r.error;return r.data;}
 function resetAdminView(){adminThread=null;adminEpoch++;adminSig='';adminInput.value='';adminFeedback.textContent='';adminTitle.textContent=(clubEnglish?'Inbox':'Inbox / 문의 목록');adminList.hidden=false;adminList.replaceChildren(el('p','','Loading…'));adminActions.hidden=adminMeta.hidden=adminLog.hidden=adminForm.hidden=true;}
 function showAdmin(){resetAdminView();void pollAdmin();}
 async function syncRole(){if(!state.db)state.db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);const v=++state.roleVersion;const {data}=await state.db.auth.getSession();const uid=data?.session?.user?.id||null;let admin=false;if(uid){const r=await state.db.rpc('tyc_has_staff_scope',{p_scope:'community'});admin=!r.error&&!!r.data;}if(v!==state.roleVersion)return;if(state.roleReady&&uid===state.uid&&admin===state.admin)return;state.roleReady=true;state.uid=uid;state.admin=admin;state.thread=null;state.guestKey=null;state.lastMessages='';transcript.replaceChildren();input.value='';name.value='';email.value='';setFeedback('');badge(0);resetAdminView();adminBox.hidden=!admin;for(const part of visitorParts)part.hidden=admin;newButton.hidden=true;guestForm.hidden=!!uid;launch.querySelector('span').textContent=admin?'Admin Inbox':'Chat with TYC Admin';panel.querySelector('h2').textContent=admin?'Admin Inbox':'Chat with TYC Admin.';launcherSub.textContent=admin?(clubEnglish?'Manage inquiries':'관리자 문의 관리'):(clubEnglish?'Leave a message':'문의 · 메시지 남기기');if(state.open){if(admin)showAdmin();else await init();}}
 async function pollAlert(){if(document.hidden||alertBusy||!state.roleReady)return;alertBusy=true;const v=state.roleVersion;try{if(state.admin){const n=await rpc('tyc_support_admin_unread_count');if(v===state.roleVersion)badge(n);return;}const guest=state.uid?null:fromStorage(widgetStorage)?.guestKey||null;const rows=await rpc('tyc_support_visitor_inbox',{p_guest_key:guest,p_mark_read:null});if(v!==state.roleVersion)return;badge((rows||[]).reduce((sum,t)=>sum+Number(t.unread||0),0));}catch{}finally{alertBusy=false;}}
 async function pollAdmin(){if(!state.admin||!state.open||document.hidden||adminPolling)return;adminPolling=true;const epoch=adminEpoch,id=adminThread,rv=state.roleVersion;try{const rows=await rpc('tyc_support_admin_list');if(rv!==state.roleVersion||epoch!==adminEpoch||!state.open)return;badge((rows||[]).reduce((n,t)=>n+Number(t.unread||0),0));if(!id){const sig=JSON.stringify(rows);if(sig!==adminSig){adminSig=sig;adminList.replaceChildren();for(const t of rows||[]){const b=el('button','tyc-support-operator-thread');b.type='button';const top=el('span','tyc-support-operator-row');top.append(el('strong','',t.name||'Visitor'),el('small','',new Date(t.last_at).toLocaleDateString()));const bottom=el('span','tyc-support-operator-row');bottom.append(el('span','tyc-support-operator-preview',t.last_text||''));if(t.unread)bottom.append(el('span','tyc-support-unread',String(t.unread)));b.append(top,el('small','',t.email||'Guest · No email'),bottom);if(t.closed)b.append(el('small','','Resolved'));b.onclick=()=>{adminThread=t.id;adminEpoch++;adminSig='';adminTitle.textContent=t.name||'Visitor';adminList.hidden=true;adminActions.hidden=adminMeta.hidden=adminLog.hidden=false;adminForm.hidden=true;adminLog.replaceChildren(el('p','','Loading…'));adminInput.value='';adminFeedback.textContent='';void pollAdmin();};adminList.append(b);}if(!rows?.length)adminList.append(el('p','','No conversations yet.'));}return;}
 const data=await rpc('tyc_support_admin_open',{p_thread:id});if(rv!==state.roleVersion||epoch!==adminEpoch||!state.open)return;adminTitle.textContent=data.name||'Visitor';adminMeta.textContent=[data.member_role||'guest',data.email||'No email',data.source||''].join(' · ');adminClosed=!!data.closed;resolve.textContent=adminClosed?'Reopen':'Resolve';adminForm.hidden=adminClosed;const sig=JSON.stringify(data.messages||[]);if(sig!==adminSig){adminSig=sig;adminLog.replaceChildren();for(const m of data.messages||[]){const b=el('div','tyc-support-message '+(m.sender==='admin'?'is-visitor':'is-admin'));b.append(el('div','tyc-support-message-meta',(m.sender==='admin'?'Admin':'Visitor')+' · '+new Date(m.created_at).toLocaleString()),el('div','tyc-support-message-body',m.body));adminLog.append(b);}adminLog.scrollTop=adminLog.scrollHeight;}window.dispatchEvent(new Event('tyc-admin-queue-updated'));void pollAlert();
 }catch(e){adminFeedback.textContent=e.message||'Unable to load messages';}finally{adminPolling=false;if(epoch!==adminEpoch&&state.admin&&state.open)void pollAdmin();}}
 back.onclick=showAdmin;resolve.onclick=async()=>{if(!adminThread||adminSending)return;const id=adminThread;try{await rpc('tyc_support_admin_close',{p_thread:id,p_close:!adminClosed});adminSig='';await pollAdmin();}catch(e){adminFeedback.textContent=e.message;}};
 adminForm.onsubmit=async e=>{e.preventDefault();if(!state.admin||!adminThread||adminSending||!adminInput.value.trim())return;const id=adminThread,epoch=adminEpoch;adminSending=true;adminSubmit.disabled=true;try{await rpc('tyc_support_admin_send',{p_thread:id,p_body:adminInput.value.trim()});if(epoch===adminEpoch){adminInput.value='';adminFeedback.textContent='';}await pollAdmin();}catch(e){adminFeedback.textContent=e.message;}finally{adminSending=false;adminSubmit.disabled=false;}};
 adminInput.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();adminForm.requestSubmit();}});
 function setFeedback(text,error=false){feedback.textContent=text;feedback.classList.toggle('is-error',error);}
 function setOnline(online){
  if(state.admin)return;
  statusDot.classList.toggle('is-online',online);
  launcherSub.classList.toggle('is-online',online);
  launcherSub.textContent=online?(clubEnglish?'LIVE CHAT':'문의 · LIVE CHAT'):(clubEnglish?'Leave a message':'문의 · 메시지 남기기');
  statusText.textContent=online?(clubEnglish?'Online · Live chat':'Online · 실시간 문의'):(clubEnglish?'Leave a message · Reply when available':'Leave a message · 확인 후 답변');
 }
 function fromStorage(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
 function saveStorage(key,obj){try{localStorage.setItem(key,JSON.stringify(obj))}catch{}}
 function memberKey(){return 'tyc-support-member-v1:'+state.uid}
 function getThreadCredential(){return state.uid?null:state.guestKey}
 function displayMessages(messages){
  const encoded=JSON.stringify(messages.map(x=>x.id));
  if(encoded===state.lastMessages)return;
  state.lastMessages=encoded;
  transcript.replaceChildren();
  if(!messages.length){
   const welcome=document.createElement('div');
   welcome.className='tyc-support-empty';
   const ko=document.createElement('span');
   ko.lang='ko';
   ko.textContent='안녕하세요! 무엇을 도와드릴까요? 👋';
   const en=document.createElement('span');
   en.lang='en';
   en.textContent='Hi! How can we help?';
   const notice=document.createElement('small');
   notice.textContent=(clubEnglish?'Replies are saved in this browser.':'Replies are saved in this browser. / 답변은 이 브라우저에 저장됩니다.');
   if(!clubEnglish)welcome.append(ko);welcome.append(en,notice);
   transcript.append(welcome);return;
  }
  for(const msg of messages){
   const entry=document.createElement('div');
   entry.className='tyc-support-message '+(msg.sender==='visitor'?'is-visitor':'is-admin');
   const heading=document.createElement('div');
   heading.className='tyc-support-message-meta';
   const at=new Date(msg.created_at);
   heading.textContent=(msg.sender==='visitor'?'You':'THE YOUNG CLUB')+' · '+(Number.isNaN(at.getTime())?'':at.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}));
   const body=document.createElement('div');
   body.className='tyc-support-message-body';
   body.textContent=msg.body; // never treat member or admin text as HTML
   entry.append(heading,body);transcript.append(entry);
  }
  transcript.scrollTop=transcript.scrollHeight;
 }
 // Presence of an administrator is checked even while the widget is collapsed.
 // "LIVE CHAT" must not be advertised unless an admin has recently been active
 // in Support Inbox (server presence expires after about 55 seconds).
 let checkingAvailability=false;
 async function checkLauncherAvailability(){
  if(document.hidden||checkingAvailability||state.admin)return;
  if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){
   setOnline(false);return;
  }
  checkingAvailability=true;
  try{
   if(!state.db)state.db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
   const {data,error}=await state.db.rpc('tyc_support_admin_available');
   if(error)throw error;
   setOnline(!!data);
  }catch{setOnline(false);}
  finally{checkingAvailability=false;}
 }
 async function updateAvailability(){
  if(!state.open||!state.db||state.thread)return;
  await checkLauncherAvailability();
 }
 async function loadThread(){
  if(state.admin||!state.open||!state.db||!state.thread||state.polling)return;
  state.polling=true;
  try{
   const {data,error}=await state.db.rpc('tyc_support_load',{p_thread:state.thread,p_guest_key:getThreadCredential()});
   if(error)throw error;
   setOnline(!!data?.admin_online);
   displayMessages(data?.messages||[]);
   if(state.open&&!document.hidden){await rpc('tyc_support_visitor_inbox',{p_guest_key:getThreadCredential(),p_mark_read:state.thread});void pollAlert();}
   if(data?.closed){
    sendButton.disabled=true;input.disabled=true;newButton.hidden=false;
    setFeedback((clubEnglish?'This conversation is resolved. You can start another inquiry.':'This conversation is resolved. You can start another inquiry. / 이전 대화가 처리되었습니다.'),false);
   }else{
    input.disabled=false;sendButton.disabled=state.busy;
    newButton.hidden=true;
   }
  }catch(e){setFeedback('Could not refresh chat: '+(e.message||'Please retry.'),true);}
  finally{state.polling=false;}
 }
 async function beginThread(){
  if(state.thread)return state.thread;
  let guestKey=null,guestName=null,guestEmail=null;
  if(!state.uid){
   guestName=name.value.trim();guestEmail=email.value.trim()||null;
   if(guestName.length<2||guestName.length>60)throw Error((clubEnglish?'Please enter your name (2–60 characters).':'Please enter your name (2–60 characters). / 이름을 입력해 주세요.'));
   if(guestEmail&&(!email.checkValidity()||guestEmail.length>160))throw Error('Please enter a valid email address.');
   guestKey=state.guestKey||crypto.randomUUID();
  }
  const {data,error}=await state.db.rpc('tyc_support_start',{
   p_guest_key:guestKey,p_guest_name:guestName,p_guest_email:guestEmail,p_source_page:sourcePage
  });
  if(error)throw error;
  state.thread=data;
  if(state.uid)saveStorage(memberKey(),{thread:data});
  else{
   state.guestKey=guestKey;
   saveStorage(widgetStorage,{thread:data,guestKey:guestKey,guestName:guestName,guestEmail:guestEmail});
  }
  guestForm.hidden=true;
  return data;
 }
 async function init(){
  if(state.initializing)return state.initializing;
  state.initializing=(async()=>{
   if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){
    throw Error((clubEnglish?'Chat connection unavailable.':'Chat connection unavailable. / 채팅 서버를 연결할 수 없습니다.'));
   }
   if(!state.db)state.db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
   let session=null;
   try{const result=await state.db.auth.getSession();session=result.data?.session||null;}catch{}
   const uid=session?.user?.id||null;
   if(uid!==state.uid){state.thread=null;state.lastMessages='';}
   state.uid=uid;
   if(uid){
    guestForm.hidden=true;
    const record=fromStorage(memberKey());
    if(record?.thread)state.thread=record.thread;
    // Find the account's existing conversation even on a new browser.
    if(!state.thread){
     const existing=await rpc('tyc_support_visitor_inbox',{p_guest_key:null,p_mark_read:null});const target=existing?.find(t=>t.unread>0)||existing?.[0];if(target){state.thread=target.id;saveStorage(memberKey(),{thread:target.id});}
     if(!state.thread){const {data,error}=await state.db.rpc('tyc_support_start',{p_guest_key:null,p_guest_name:null,p_guest_email:null,p_source_page:sourcePage});
     if(error)throw error;
     state.thread=data;
     saveStorage(memberKey(),{thread:data});}
    }
   }else{
    const previous=fromStorage(widgetStorage);
    if(previous?.thread&&previous?.guestKey){
     state.thread=previous.thread;state.guestKey=previous.guestKey;
     name.value=previous.guestName||'';email.value=previous.guestEmail||'';
     guestForm.hidden=true;
    }else{
     guestForm.hidden=false;
    }
   }
   if(state.thread)await loadThread();
   else await updateAvailability();
  })();
  try{await state.initializing;}finally{state.initializing=null;}
 }
 async function send(event){
  event.preventDefault();
  if(state.busy||state.admin)return;
  const body=input.value.trim();
  if(!body||body.length>1500)return;
  state.busy=true;sendButton.disabled=true;setFeedback((clubEnglish?'Sending…':'Sending… / 전송 중…'));
  try{
   await init();
   const thread=await beginThread();
   const {error}=await state.db.rpc('tyc_support_send',{p_thread:thread,p_guest_key:getThreadCredential(),p_body:body});
   if(error)throw error;
   input.value='';setFeedback((clubEnglish?'✓ Message saved. Admin will see it even when offline.':'✓ Message saved. Admin will see it even when offline. / 메시지가 저장됐습니다.'));
   await loadThread();
  }catch(e){setFeedback('Could not send message: '+(e.message||'Try again.'),true);}
  finally{state.busy=false;sendButton.disabled=false;}
 }
 async function open(){
  if(state.open)return;
  if(window.matchMedia('(max-width: 760px)').matches){
   window.dispatchEvent(new CustomEvent('tyc-chat-widget-open',{detail:{source:'support'}}));
  }
  state.open=true;panel.hidden=false;launch.setAttribute('aria-expanded','true');
  setFeedback('');
  try{await syncRole();if(state.admin){showAdmin();}else{await init();input.focus();}}catch(e){setFeedback(e.message||'Chat unavailable.',true);}
  state.timer=setInterval(()=>{if(state.open&&!document.hidden){if(state.admin)void pollAdmin();else if(state.thread)void loadThread();else void updateAvailability();}},4500);
 }
 function shut(){
  state.open=false;adminEpoch++;panel.hidden=true;launch.setAttribute('aria-expanded','false');
  clearInterval(state.timer);state.timer=null;launch.focus();
 }
 window.addEventListener('tyc-chat-widget-open',event=>{
  if(event.detail?.source==='member'&&state.open)shut();
 });
 // Update the collapsed button on first load and when returning to the page.
 setTimeout(async()=>{try{await syncRole();state.db.auth.onAuthStateChange(()=>setTimeout(()=>{void syncRole().then(pollAlert).catch(()=>{});},0));await pollAlert();void checkLauncherAvailability();}catch{}},0);
 const alertTimer=setInterval(()=>{void pollAlert();},5000);
 const availabilityTimer=setInterval(()=>{void checkLauncherAvailability();},20000);
 window.addEventListener('pagehide',()=>{clearInterval(availabilityTimer);clearInterval(alertTimer)});
 launch.addEventListener('click',()=>state.open?shut():void open());
 close.addEventListener('click',shut);
 newButton.addEventListener('click',()=>{
  if(state.busy)return;
  state.thread=null;state.lastMessages='';state.guestKey=null;
  newButton.hidden=true;input.value='';input.disabled=false;sendButton.disabled=false;
  if(state.uid){try{localStorage.removeItem(memberKey())}catch{}}
  else{try{localStorage.removeItem(widgetStorage)}catch{};guestForm.hidden=false;}
  displayMessages([]);setFeedback((clubEnglish?'Ready for a new conversation.':'Ready for a new conversation. / 새 문의를 작성해 주세요.'));
  input.focus();
 });
 form.addEventListener('submit',send);
 input.addEventListener('keydown',event=>{
  if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){
   event.preventDefault();form.requestSubmit();
  }
 });
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.open)shut()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){void pollAlert();void checkLauncherAvailability();if(state.open&&state.admin)void pollAdmin();else if(state.open&&state.thread)void loadThread();}});
})();
