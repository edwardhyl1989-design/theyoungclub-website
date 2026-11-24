/* THE YOUNG CLUB — visitor-to-admin support chat.
   Public on Blog, Community, PTA News and Jobs. No client-side secrets. */
(()=>{'use strict';
 const path=(location.pathname.split('/').filter(Boolean).pop()||'index.html').toLowerCase();
 const page=path.includes('.')?path:path+'.html';
 if(!new Set(['blog.html','community.html','pta-news.html','jobs.html']).has(page))return;
 const wrapper=document.createElement('div');
 wrapper.className='tyc-support-widget';
 wrapper.innerHTML=[
  '<button class="tyc-support-launcher" type="button" aria-expanded="false" aria-controls="tyc-support-panel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.3a8.4 8.4 0 0 1-8.6 8.3 8.4 8.4 0 0 1-4.1-1.1L3.5 20l1.5-4A8.3 8.3 0 1 1 20.5 11.3Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7.9 11.6h8.2M7.9 14.5h5.3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span>Chat with Admin</span><span class="tyc-support-launcher-sub">문의 · LIVE CHAT</span></button>',
  '<section id="tyc-support-panel" class="tyc-support-panel" role="dialog" aria-label="Chat with THE YOUNG CLUB administrator" hidden>',
   '<div class="tyc-support-heading"><div><span class="tyc-support-eyebrow">THE YOUNG CLUB · SUPPORT</span><h2>Chat with Admin<span>.</span></h2></div><button type="button" class="tyc-support-close" aria-label="Close support chat">×</button></div>',
   '<div class="tyc-support-state"><span class="tyc-support-status-dot"></span><span class="tyc-support-status-text">Checking availability…</span></div>',
   '<p class="tyc-support-intro">Questions about the site, PTA community, or feedback? Leave a message anytime. 관리자 오프라인에도 메시지가 저장됩니다.</p>',
   '<div class="tyc-support-transcript" role="log" aria-live="polite" aria-relevant="additions text"><div class="tyc-support-empty">안녕하세요! 👋<br>How can we help you today?<small>Messages stay here for your next visit in this browser.</small></div></div>',
   '<form class="tyc-support-form">',
    '<div class="tyc-support-guest" hidden><label>Your name / 이름<input class="tyc-support-name" type="text" maxlength="60" autocomplete="name" placeholder="Name (required)" required></label><label>Email (optional) / 이메일<input class="tyc-support-email" type="email" maxlength="160" autocomplete="email" placeholder="For a follow-up outside this browser"></label></div>',
    '<label class="tyc-support-message-label" for="tyc-support-input">Message / 메시지</label>',
    '<textarea id="tyc-support-input" class="tyc-support-input" maxlength="1500" rows="3" required placeholder="질문이나 의견을 남겨주세요…"></textarea>',
    '<div class="tyc-support-submit"><span>Enter to send · Shift+Enter for new line</span><button type="submit">Send / 전송</button></div>',
   '</form>',
   '<p class="tyc-support-feedback" role="status" aria-live="polite"></p>',
   '<p class="tyc-support-privacy">Please do not send patient information, medical records, passwords or sensitive details. 개인정보·환자정보는 보내지 마세요.</p>',
  '</section>'
 ].join('');
 document.body.append(wrapper);
 const $=selector=>wrapper.querySelector(selector);
 const launch=$('.tyc-support-launcher'),panel=$('.tyc-support-panel'),close=$('.tyc-support-close');
 const form=$('.tyc-support-form'),guestForm=$('.tyc-support-guest'),name=$('.tyc-support-name'),email=$('.tyc-support-email');
 const input=$('.tyc-support-input'),transcript=$('.tyc-support-transcript'),statusText=$('.tyc-support-status-text');
 const statusDot=$('.tyc-support-status-dot'),feedback=$('.tyc-support-feedback'),sendButton=form.querySelector('button[type="submit"]');
 const widgetStorage='tyc-support-guest-v1';
 const sourcePage=page.replace('.html','');
 const state={db:null,uid:null,guestKey:null,thread:null,open:false,busy:false,polling:false,lastMessages:'',timer:null,initializing:null};
 function setFeedback(text,error=false){feedback.textContent=text;feedback.classList.toggle('is-error',error);}
 function setOnline(online){
  statusDot.classList.toggle('is-online',online);
  statusText.textContent=online?'Admin online · 라이브 채팅 가능':'Leave a message · 관리자 답장은 저장됩니다';
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
   welcome.textContent='안녕하세요! 👋 문의를 남겨주시면 관리자가 확인 후 답장드립니다.';
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
 async function loadThread(){
  if(!state.open||!state.db||!state.thread||state.polling)return;
  state.polling=true;
  try{
   const {data,error}=await state.db.rpc('tyc_support_load',{p_thread:state.thread,p_guest_key:getThreadCredential()});
   if(error)throw error;
   setOnline(!!data?.admin_online);
   displayMessages(data?.messages||[]);
   if(data?.closed){
    sendButton.disabled=true;input.disabled=true;
    setFeedback('This conversation is closed. / 이 대화는 종료되었습니다.');
   }
  }catch(e){setFeedback('Could not refresh chat: '+(e.message||'Please retry.'),true);}
  finally{state.polling=false;}
 }
 async function beginThread(){
  if(state.thread)return state.thread;
  let guestKey=null,guestName=null,guestEmail=null;
  if(!state.uid){
   guestName=name.value.trim();guestEmail=email.value.trim()||null;
   if(guestName.length<2||guestName.length>60)throw Error('Please enter your name (2–60 characters). / 이름을 입력해 주세요.');
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
    throw Error('Chat connection unavailable. / 채팅 서버를 연결할 수 없습니다.');
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
     const {data,error}=await state.db.rpc('tyc_support_start',{p_guest_key:null,p_guest_name:null,p_guest_email:null,p_source_page:sourcePage});
     if(error)throw error;
     state.thread=data;
     saveStorage(memberKey(),{thread:data});
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
   else setOnline(false);
  })();
  try{await state.initializing;}finally{state.initializing=null;}
 }
 async function send(event){
  event.preventDefault();
  if(state.busy)return;
  const body=input.value.trim();
  if(!body||body.length>1500)return;
  state.busy=true;sendButton.disabled=true;setFeedback('Sending… / 전송 중…');
  try{
   await init();
   const thread=await beginThread();
   const {error}=await state.db.rpc('tyc_support_send',{p_thread:thread,p_guest_key:getThreadCredential(),p_body:body});
   if(error)throw error;
   input.value='';setFeedback('✓ Message saved. Admin will see it even when offline. / 메시지가 저장됐습니다.');
   await loadThread();
  }catch(e){setFeedback('Could not send message: '+(e.message||'Try again.'),true);}
  finally{state.busy=false;sendButton.disabled=false;}
 }
 async function open(){
  if(state.open)return;
  state.open=true;panel.hidden=false;launch.setAttribute('aria-expanded','true');
  setFeedback('');
  try{await init()}catch(e){setFeedback(e.message||'Chat unavailable.',true);}
  input.focus();
  state.timer=setInterval(()=>{if(state.open&&!document.hidden)void loadThread();},4500);
 }
 function shut(){
  state.open=false;panel.hidden=true;launch.setAttribute('aria-expanded','false');
  clearInterval(state.timer);state.timer=null;launch.focus();
 }
 launch.addEventListener('click',()=>state.open?shut():void open());
 close.addEventListener('click',shut);
 form.addEventListener('submit',send);
 input.addEventListener('keydown',event=>{
  if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){
   event.preventDefault();form.requestSubmit();
  }
 });
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.open)shut()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.open)void loadThread()});
})();
