(()=>{'use strict';
if(window.TYC_MemberDM||!window.supabase?.createClient)return;
const clubEnglish=true; // Shared chat controls use English across the site.
const db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
let me=null,peer=null,version=0,busy=false,loading=false,ready=false,lastPeer=null,pendingRefresh=false;
const node=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
const btn=(txt,fn)=>{const b=node('button','',txt);b.type='button';b.onclick=fn;return b;};
const root=node('div','tyc-dm');root.hidden=true;
const launcher=btn((clubEnglish?'✉ Messages':'✉ Messages / 메시지'),()=>{if(!panel.hidden&&!peer){panel.hidden=true;version++;return;}showInbox();});launcher.className='tyc-dm-launch';launcher.textContent='';launcher.append(node('span','tyc-dm-launch-text',(clubEnglish?'✉ Messages':'✉ Messages / 메시지')),node('span','tyc-dm-launch-emoji','✉️'));const alertDot=node('span','tyc-dm-launch-alert','!');alertDot.hidden=true;alertDot.setAttribute('aria-hidden','true');launcher.append(alertDot);
const panel=node('section','tyc-dm-panel');panel.hidden=true;panel.setAttribute('aria-label','Private member messages');
const head=node('div','tyc-dm-head'),title=node('strong','','Messages'),closeButton=btn('×',()=>closeConversation());closeButton.setAttribute('aria-label','Close conversation');head.append(title,closeButton);
const rules=node('div','tyc-dm-rules');rules.append(node('p','','No harassment, threats, discrimination, sexual harassment, scams, or spam. Never share patient or sensitive personal information.'));if(!clubEnglish)rules.append(node('p','','욕설·괴롭힘·협박·차별·성희롱·사기·스팸 금지. 환자 정보 및 민감한 개인정보를 공유하지 마세요.'));
const chatActions=node('div','tyc-dm-actions');chatActions.hidden=true;
const content=node('div','tyc-dm-content'),notice=node('p','tyc-dm-status');notice.setAttribute('role','status');
const form=node('form','tyc-dm-form');form.hidden=true;const input=node('textarea');input.maxLength=2000;input.required=true;input.placeholder=(clubEnglish?'Write a message':'Write a message / 메시지 입력');const send=node('button','tyc-dm-send');send.type='submit';send.setAttribute('aria-label','Send message');send.append(node('span','tyc-dm-send-text','Send'));const sendIcon=document.createElementNS('http://www.w3.org/2000/svg','svg');sendIcon.setAttribute('class','tyc-dm-send-icon');sendIcon.setAttribute('viewBox','0 0 24 24');sendIcon.setAttribute('fill','none');sendIcon.setAttribute('stroke','currentColor');sendIcon.setAttribute('stroke-width','1.8');sendIcon.setAttribute('stroke-linecap','round');sendIcon.setAttribute('stroke-linejoin','round');sendIcon.setAttribute('aria-hidden','true');const sendPath=document.createElementNS('http://www.w3.org/2000/svg','path');sendPath.setAttribute('d','M12 19V5m-6 6 6-6 6 6');sendIcon.append(sendPath);send.append(sendIcon);const emojiToggle=btn('☺',()=>{const opening=emojiPicker.hidden;emojiPicker.hidden=!opening;emojiToggle.setAttribute('aria-expanded',String(opening));if(opening){renderEmoji();emojiSearch.focus();}});emojiToggle.className='tyc-dm-emoji-toggle';emojiToggle.setAttribute('aria-label',(clubEnglish?'Emoji':'Emoji / 이모티콘'));emojiToggle.setAttribute('aria-expanded','false');
const emojiPicker=node('div','tyc-dm-emoji-picker');emojiPicker.hidden=true;const emojiSearch=node('input','tyc-dm-emoji-search');emojiSearch.type='search';emojiSearch.placeholder=(clubEnglish?'Search emoji':'Search emoji / 검색');emojiSearch.setAttribute('aria-label','Search emoji');const emojiGrid=node('div','tyc-dm-emoji-grid');emojiPicker.append(emojiSearch,emojiGrid);
const fallback='😀 😄 😂 😊 🙂 😉 😍 🥰 🤔 😅 😢 😭 😎 🥳 👍 👎 👋 🙌 👏 🙏 🤝 💪 ❤️ 💚 💛 ✨ 🎉 🔥 ✅ 🌱 💯'.split(' ');
let emojiRange=null;
function closeEmoji(){emojiPicker.hidden=true;emojiToggle.setAttribute('aria-expanded','false');emojiRange=null;}
function renderEmoji(){const q=emojiSearch.value.trim();const entries=window.TYC_EmojiCatalog?.search(q,400)||fallback.filter(e=>!q||e.includes(q)).map(emoji=>({emoji}));emojiGrid.replaceChildren();for(const item of entries){const b=btn(item.emoji,()=>{const [a,z]=emojiRange||[input.value.length,input.value.length];if(input.value.length-(z-a)+item.emoji.length>input.maxLength)return;input.setRangeText(item.emoji,a,z,'end');closeEmoji();input.dispatchEvent(new Event('input',{bubbles:true}));input.focus({preventScroll:true});});b.title=item.english||item.emoji;b.setAttribute('aria-label',item.english||item.emoji);emojiGrid.append(b);}if(!entries.length)emojiGrid.append(node('span','','No matches')); }
emojiSearch.addEventListener('input',renderEmoji);emojiToggle.addEventListener('pointerdown',()=>{emojiRange=[input.selectionStart,input.selectionEnd];});input.addEventListener('select',()=>{if(!emojiPicker.hidden)emojiRange=[input.selectionStart,input.selectionEnd];});
if(!window.TYC_EmojiCatalog){const script=node('script');script.src='emoji-catalog.js?v=1';script.onload=()=>{if(!emojiPicker.hidden)renderEmoji();};document.head.append(script);}
document.addEventListener('click',e=>{if(!emojiPicker.hidden&&!emojiPicker.contains(e.target)&&!emojiToggle.contains(e.target)&&e.target!==input)closeEmoji();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!emojiPicker.hidden)closeEmoji();});
form.append(emojiToggle,input,send,emojiPicker);if(document.getElementById('clubMessages')){const disclosure=node('details','club-dm-rules');disclosure.append(node('summary','','Community messaging guidelines'),rules);panel.append(head,chatActions,disclosure,content,notice,form);}else panel.append(head,chatActions,rules,content,notice,form);root.append(panel,launcher);const clubHost=document.getElementById('clubMessages');const embedded=!!clubHost;if(embedded){root.classList.add('club-dm-embedded');clubHost.append(root);launcher.hidden=true;}else document.body.append(root);

/* Club mobile messenger: reuse the same authenticated conversation, not a duplicate chat. */
const mobileMode=window.matchMedia('(max-width: 760px)');
let mobileDialog=null,mobilePeerProfile=null,mobileRestoreFocus=null,openRequest=0;
const mobileBack=btn('←',()=>closeConversation()),mobileAvatar=node('img','club-dm-mobile-avatar'),mobileMore=btn('⋯',()=>{const opened=panel.classList.toggle('club-dm-menu-open');mobileMore.setAttribute('aria-expanded',String(opened));});
mobileBack.className='club-dm-mobile-back';mobileBack.setAttribute('aria-label','Back to friends');mobileAvatar.alt='';mobileMore.className='club-dm-mobile-more';mobileMore.setAttribute('aria-label','Conversation options');mobileMore.setAttribute('aria-expanded','false');
head.prepend(mobileBack,mobileAvatar);head.append(mobileMore);
function closeMobileMenu(){panel.classList.remove('club-dm-menu-open');mobileMore.setAttribute('aria-expanded','false');}
function updateMobileViewport(){
 if(!mobileDialog?.open)return;
 const vv=window.visualViewport,atBottom=content.scrollHeight-content.scrollTop-content.clientHeight<60;
 mobileDialog.style.setProperty('--dm-height',(vv?.height||window.innerHeight)+'px');
 mobileDialog.style.setProperty('--dm-width',(vv?.width||window.innerWidth)+'px');
 mobileDialog.style.setProperty('--dm-top',(vv?.offsetTop||0)+'px');
 mobileDialog.style.setProperty('--dm-left',(vv?.offsetLeft||0)+'px');
 const keyboard=!!vv&&window.innerHeight-vv.height>100;mobileDialog.classList.toggle('has-keyboard',keyboard);if(atBottom)requestAnimationFrame(()=>{if(mobileDialog?.open)content.scrollTop=content.scrollHeight;});
}
function restoreEmbeddedChat(){
 if(!mobileDialog)return;
 closeMobileMenu();
 if(root.parentNode===mobileDialog)clubHost.append(root);input.style.removeProperty('height');
 if(mobileDialog.open)mobileDialog.close();
 document.documentElement.classList.remove('tyc-club-mobile-chat-open');
}
function syncMobileChat(){
 if(!embedded)return;
 const on=mobileMode.matches&&!panel.hidden&&!!peer;
 if(!on){restoreEmbeddedChat();return;}
 if(!mobileDialog){
  mobileDialog=node('dialog','club-dm-mobile-dialog');mobileDialog.setAttribute('aria-label','Private conversation');
  mobileDialog.addEventListener('cancel',event=>{event.preventDefault();if(!emojiPicker.hidden){closeEmoji();return;}if(panel.classList.contains('club-dm-menu-open')){closeMobileMenu();return;}closeConversation();});
  mobileDialog.addEventListener('close',()=>{if(root.parentNode===mobileDialog&&!mobileDialog.open)closeConversation();});
  document.body.append(mobileDialog);
 }
 mobileAvatar.src=window.TYC_ClubChatUI?.avatarURL(peer)||'club-green-sprout.svg';mobileAvatar.onerror=()=>{mobileAvatar.onerror=null;mobileAvatar.src='club-green-sprout.svg';};
 if(root.parentNode!==mobileDialog){mobileRestoreFocus=document.activeElement;mobileDialog.append(root);}
 if(!mobileDialog.open){mobileDialog.showModal();document.documentElement.classList.add('tyc-club-mobile-chat-open');mobileBack.focus({preventScroll:true});}
 updateMobileViewport();resizeMobileInput();requestAnimationFrame(()=>{if(mobileDialog?.open)content.scrollTop=content.scrollHeight;});
}
function closeConversation(){
 const previousPeer=peer,wasMobile=!!mobileDialog?.open;openRequest++;version++;panel.hidden=true;peer=null;mobilePeerProfile=null;closeEmoji();closeMobileMenu();restoreEmbeddedChat();
 if(embedded)window.dispatchEvent(new Event('tyc-club-chat-closed'));
 if(wasMobile){const target=mobileRestoreFocus;mobileRestoreFocus=null;requestAnimationFrame(()=>{if(target?.isConnected)target.focus({preventScroll:true});else window.TYC_ClubChatUI?.focusFriend(previousPeer);});}
}
mobileMode.addEventListener?.('change',syncMobileChat);
window.visualViewport?.addEventListener('resize',updateMobileViewport);
window.visualViewport?.addEventListener('scroll',updateMobileViewport);
window.addEventListener('resize',updateMobileViewport);
function resizeMobileInput(){if(!mobileDialog?.open){input.style.removeProperty('height');return;}const atBottom=content.scrollHeight-content.scrollTop-content.clientHeight<60;input.style.height='42px';input.style.height=Math.min(110,Math.max(42,input.scrollHeight+2))+'px';if(atBottom)content.scrollTop=content.scrollHeight;}
input.addEventListener('input',resizeMobileInput);
head.addEventListener('click',e=>{if(e.target===mobileAvatar&&peer&&mobileDialog?.open){const id=peer;closeConversation();window.TYC_ClubChatUI?.viewSpace(id);}});
function mobileProfileIntro(id,profile){
 const intro=node('div','club-dm-mobile-profile'),image=node('img');image.alt='';image.src=window.TYC_ClubChatUI?.avatarURL(id)||'club-green-sprout.svg';image.onerror=()=>{image.onerror=null;image.src='club-green-sprout.svg';};
 intro.append(image,node('strong','',profileName(profile)),node('small','','THE CLUB · Friends'),btn('View Space',()=>{closeConversation();window.TYC_ClubChatUI?.viewSpace(id);}));return intro;
}
function mobileConversationActions(id){
 if(!embedded)return;
 const view=btn('View Space',()=>{closeConversation();window.TYC_ClubChatUI?.viewSpace(id);}),remove=btn('Unfriend',()=>{closeMobileMenu();window.TYC_ClubChatUI?.unfriend(id);});
 view.className='club-dm-mobile-action';remove.className='club-dm-mobile-action club-dm-mobile-unfriend';
 chatActions.prepend(view);chatActions.append(remove);
}

const profileCard=node('section','tyc-member-profile-flyout');profileCard.hidden=true;profileCard.setAttribute('aria-label','Member profile');document.body.append(profileCard);let profileEpoch=0,profileHideTimer=null;
const menu=node('div','tyc-member-dropdown');menu.hidden=true;document.body.append(menu);let menuAnchor=null;
function cancelProfileHide(){clearTimeout(profileHideTimer);profileHideTimer=null;}
function scheduleProfileHide(){cancelProfileHide();profileHideTimer=setTimeout(closeProfile,220);}
function closeProfile(){cancelProfileHide();profileEpoch++;profileCard.hidden=true;profileCard.replaceChildren();menu.querySelector('.tyc-member-profile-trigger')?.setAttribute('aria-expanded','false');}
function closeMenu(){closeProfile();menu.hidden=true;menuAnchor?.setAttribute('aria-expanded','false');menuAnchor=null;}
function showMenu(anchor){if(menuAnchor===anchor&&!menu.hidden){closeMenu();return;}closeMenu();menuAnchor=anchor;anchor.setAttribute('aria-expanded','true');const id=anchor.dataset.tycMember;const profileButton=btn((clubEnglish?'Profile  ›':'Profile / 프로필  ›'),()=>{cancelProfileHide();if(!profileCard.hidden)return;void profile(id);});profileButton.addEventListener('pointerenter',e=>{if(e.pointerType==='touch'||!me)return;cancelProfileHide();if(profileCard.hidden)void profile(id);});profileButton.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')scheduleProfileHide();});profileButton.addEventListener('focus',()=>{cancelProfileHide();if(me&&profileCard.hidden)void profile(id);});profileButton.className='tyc-member-profile-trigger';profileButton.setAttribute('aria-expanded','false');menu.replaceChildren(profileButton);if(id!==me?.id)menu.append(btn((clubEnglish?'Message':'Message / 메시지'),async()=>{closeMenu();if(!me){signIn();return;}try{const uid=me.id;const p=await rpc('tyc_member_card',{p_member:id});if(me?.id===uid&&p)await openPeer(id,p);}catch(e){status(e.message||'Member unavailable');panel.hidden=false;}}));const host=anchor.closest('dialog[open]')||document.body;if(menu.parentNode!==host)host.append(menu);menu.hidden=false;const r=anchor.getBoundingClientRect(),w=menu.offsetWidth,h=menu.offsetHeight;menu.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';menu.style.top=Math.max(8,r.bottom+h+5>innerHeight?r.top-h-5:r.bottom+5)+'px';}
profileCard.addEventListener('pointerenter',cancelProfileHide);profileCard.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')scheduleProfileHide();});
window.addEventListener('resize',closeMenu);window.addEventListener('scroll',e=>{if(!menu.contains(e.target)&&!profileCard.contains(e.target))closeMenu();},true);
const css=node('link');css.rel='stylesheet';css.href='member-dm.css?v=club-mobile-composer-a2';document.head.append(css);
function status(t){notice.textContent=t||'';}
async function rpc(name,args={}){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data;}
const formatDate=v=>v?new Date(v).toLocaleDateString():'—';
function profileName(p){return p?.nickname||'Registered member';}
function signIn(){location.href='auth.html?next='+encodeURIComponent(location.pathname.split('/').pop()+location.search);}
function positionProfile(){if(profileCard.hidden||menu.hidden)return;const r=menu.getBoundingClientRect(),w=profileCard.offsetWidth,h=profileCard.offsetHeight,gap=6;let x=r.right+gap,y=r.top;if(x+w>innerWidth-8){if(r.left-w-gap>=8)x=r.left-w-gap;else{x=Math.max(8,Math.min(r.left,innerWidth-w-8));y=r.bottom+gap;}}if(y+h>innerHeight-8)y=Math.max(8,innerHeight-h-8);profileCard.style.left=x+'px';profileCard.style.top=y+'px';}
async function profile(id){
 if(!me){signIn();return;}
 if(menu.hidden||!menuAnchor)return;
 const uid=me.id,epoch=++profileEpoch;
 const host=menu.parentNode;if(profileCard.parentNode!==host)host.append(profileCard);
 profileCard.replaceChildren(node('p','tyc-member-profile-loading','Loading member…'));profileCard.hidden=false;menu.querySelector('.tyc-member-profile-trigger')?.setAttribute('aria-expanded','true');positionProfile();
 try{const p=await rpc('tyc_member_card',{p_member:id});if(me?.id!==uid||epoch!==profileEpoch||profileCard.hidden)return;if(!p)throw Error('Member unavailable');
 const name=node('strong','tyc-member-profile-name',profileName(p));const badges=node('div','tyc-member-profile-badges');const verified=p.verified_role||(p.role==='PTA'||p.role==='SPTA'?p.role:null);if(verified){const role=node('span','tyc-member-profile-role','✓ VERIFIED '+verified);role.dataset.role=verified;badges.append(role);}if(p.role==='ADMIN'){const admin=node('span','tyc-member-profile-role','ADMIN');admin.dataset.role='ADMIN';badges.append(admin);}else if(!verified){const role=node('span','tyc-member-profile-role','REGISTERED MEMBER');role.dataset.role='MEMBER';badges.append(role);}
 const details=node('div','tyc-member-profile-details');const row=(label,value)=>{const r=node('div','tyc-member-profile-row');r.append(node('span','',label),node('strong','',value));return r;};details.append(row((clubEnglish?'Joined':'Joined / 가입일'),formatDate(p.joined)));
 if(verified==='PTA')details.append(row((clubEnglish?'PTA experience':'PTA 연차'),p.license_year?Math.max(0,new Date().getFullYear()-p.license_year)+' years (approx.)':'Not provided'));
 profileCard.replaceChildren(name,badges,details);positionProfile();
 }catch(e){if(epoch!==profileEpoch)return;profileCard.replaceChildren(node('p','tyc-member-profile-loading',e.message||'Profile unavailable'));positionProfile();}
}
function showInbox(){restoreEmbeddedChat();closeMobileMenu();if(!embedded&&window.matchMedia('(max-width: 760px)').matches){window.dispatchEvent(new CustomEvent('tyc-chat-widget-open',{detail:{source:'member'}}));}chatActions.hidden=true;chatActions.replaceChildren();closeEmoji();peer=null;rememberPeer(null);version++;panel.hidden=false;title.textContent=(clubEnglish?'Messages':'Messages / 메시지');form.hidden=true;input.value='';status('');clearHistory();content.append(node('p','','Loading conversations…'));void refresh();}
function clearHistory(){content.replaceChildren();delete content.dataset.sig;delete content.dataset.peer;}
function rememberPeer(value){lastPeer=value;try{const key='tyc-dm-last:'+me.id;if(value)sessionStorage.setItem(key,JSON.stringify(value));else sessionStorage.removeItem(key);}catch{}}
async function openPeer(id,p){if(!me||id===me.id)return;if(document.getElementById('clubFriends')&&!window.TYC_ClubFriendIds?.has(id))return;if(!embedded&&window.matchMedia('(max-width: 760px)').matches){window.dispatchEvent(new CustomEvent('tyc-chat-widget-open',{detail:{source:'member'}}));}closeEmoji();chatActions.hidden=true;chatActions.replaceChildren();peer=id;mobilePeerProfile=p;rememberPeer({id,profile:p});version++;input.value='';clearHistory();content.append(node('p','','Loading messages…'));panel.hidden=false;title.textContent=profileName(p);form.hidden=false;status('');closeMobileMenu();syncMobileChat();await refresh();}
async function refresh(){if(!me||document.hidden)return;if(loading){pendingRefresh=true;return;}loading=true;const uid=me.id,v=version,active=peer;
 try{let rows=await rpc('tyc_dm_inbox');if(document.getElementById('clubFriends')){rows=(rows||[]).filter(x=>window.TYC_ClubFriendIds?.has(x.peer));if(active&&!window.TYC_ClubFriendIds?.has(active)&&me?.id===uid&&v===version){closeConversation();return;}}if(me?.id!==uid||v!==version)return;const count=(rows||[]).reduce((a,r)=>a+Number(r.unread||0),0);alertDot.hidden=count===0;if(embedded){const dot=document.getElementById('clubMessageCount');if(dot){dot.hidden=!count;dot.textContent=count>99?'99+':String(count);}}launcher.setAttribute('aria-label',(clubEnglish?'Messages':'Messages / 메시지')+(count?' · '+count+' unread messages':''));
 if(panel.hidden)return;
 if(!active){title.textContent=(clubEnglish?'Messages':'Messages / 메시지');form.hidden=true;clearHistory();for(const r of rows||[]){const b=btn('',()=>void openPeer(r.peer,r.profile));b.className='tyc-dm-thread'+(r.unread?' is-unread':'');const top=node('span','tyc-dm-thread-top');top.append(node('strong','',profileName(r.profile)),node('time','tyc-dm-thread-time',r.last_at?new Date(r.last_at).toLocaleDateString()+' '+new Date(r.last_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):''));if(embedded){const icon=node('span','club-dm-thread-avatar');const image=node('img');image.alt='';image.src='club-green-sprout.svg';icon.append(image);b.append(icon);}const bottom=node('span','tyc-dm-thread-bottom');bottom.append(node('span','tyc-dm-thread-preview',(r.last_mine?'You: ':'')+(r.last_text||'')));if(r.unread)bottom.append(node('span','tyc-dm-thread-unread',String(r.unread)));b.append(top,bottom);content.append(b);}if(!rows?.length)content.append(node('p','','No conversations yet. Open a member’s My Space to start a conversation.'));return;}
 const r=await db.from('tyc_member_dm').select('id,sender_id,body,created_at').or('and(sender_id.eq.'+uid+',recipient_id.eq.'+active+'),and(sender_id.eq.'+active+',recipient_id.eq.'+uid+')').order('created_at',{ascending:false}).limit(100);
 if(r.error)throw r.error;if(me?.id!==uid||v!==version||panel.hidden)return;
 const sig=JSON.stringify(r.data);if(content.dataset.sig!==sig||content.dataset.peer!==active){content.dataset.sig=sig;content.dataset.peer=active;content.replaceChildren();chatActions.replaceChildren();chatActions.append(btn(document.getElementById('clubFriends')?'← Friends':'← Inbox',()=>{if(document.getElementById('clubFriends'))closeConversation();else showInbox();}),btn((clubEnglish?'Block':'Block / 차단'),async()=>{if(!confirm('Block messages from this member?'))return;const res=await db.from('tyc_dm_blocks').upsert({owner_id:uid,blocked_id:active},{ignoreDuplicates:true});status(res.error?res.error.message:'Member blocked');}),btn((clubEnglish?'Unblock':'Unblock / 해제'),async()=>{const res=await db.from('tyc_dm_blocks').delete().eq('owner_id',uid).eq('blocked_id',active);status(res.error?res.error.message:'Member unblocked');}));chatActions.hidden=false;mobileConversationActions(active);if(embedded)content.append(mobileProfileIntro(active,mobilePeerProfile));for(const m of [...r.data].reverse()){const b=node('div','tyc-dm-bubble'+(m.sender_id===uid?' mine':''),m.body);b.append(node('small','',new Date(m.created_at).toLocaleString()));content.append(b);}if(!r.data.length)content.append(node('p','','No messages yet. Start the conversation below.'));content.scrollTop=content.scrollHeight;}
 await rpc('tyc_dm_read',{p_peer:active});
 }catch(e){status(e.message||'Messages unavailable');}finally{loading=false;const again=pendingRefresh;pendingRefresh=false;if(me&&(again||(v!==version&&!panel.hidden)))void refresh();}
}
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();if(!busy&&input.value.trim())form.requestSubmit();}});
form.onsubmit=async e=>{e.preventDefault();if(!peer||!me||busy||!input.value.trim())return;busy=true;send.disabled=true;const id=peer,v=version;try{await rpc(document.getElementById('clubFriends')?'club_friend_send':'tyc_dm_send',{p_recipient:id,p_body:input.value.trim()});if(v===version){input.value='';resizeMobileInput();closeEmoji();status('');}await refresh();}catch(e){status(e.message||'Message not sent');}finally{busy=false;send.disabled=false;}};
function userChanged(user){if(me?.id===user?.id&&ready)return;ready=true;restoreEmbeddedChat();closeMobileMenu();openRequest++;me=user||null;version++;peer=null;mobilePeerProfile=null;lastPeer=null;chatActions.hidden=true;chatActions.replaceChildren();clearHistory();if(me){try{const saved=JSON.parse(sessionStorage.getItem('tyc-dm-last:'+me.id)||'null');if(saved&&typeof saved.id==='string'&&/^[0-9a-f-]{36}$/i.test(saved.id)&&saved.id!==me.id)lastPeer=saved;}catch{}}input.value='';status('');panel.hidden=true;closeEmoji();closeMenu();alertDot.hidden=true;launcher.setAttribute('aria-label',(clubEnglish?'Messages':'Messages / 메시지'));root.hidden=!me;if(me)void refresh();}
window.addEventListener('tyc-chat-widget-open',event=>{if(event.detail?.source==='support'&&!embedded&&!panel.hidden){panel.hidden=true;version++;closeEmoji();}});
window.TYC_MemberDM={profile,openInbox(){if(!me){signIn();return;}showInbox();},close(){closeConversation();},async message(id,hint){if(!me){signIn();return;}const request=++openRequest,uid=me.id;try{const p=embedded&&mobileMode.matches&&hint?.nickname?hint:await rpc('tyc_member_card',{p_member:id});if(request!==openRequest||me?.id!==uid)return;if(p)await openPeer(id,p);else if(embedded)window.dispatchEvent(new Event('tyc-club-chat-closed'));}catch(e){if(request!==openRequest||me?.id!==uid)return;if(embedded){window.dispatchEvent(new Event('tyc-club-chat-closed'));alert(e.message||'Member unavailable');}else{showInbox();status(e.message||'Member unavailable');}}}};
document.addEventListener('click',e=>{const t=e.target.closest('[data-tyc-member]');if(!t){if(!menu.contains(e.target)&&!profileCard.contains(e.target))closeMenu();return;}e.preventDefault();e.stopPropagation();showMenu(t);},true);
document.addEventListener('keydown',e=>{const t=e.target.closest('[data-tyc-member]');if(e.key==='Escape')closeMenu();if(t&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showMenu(t);}});
db.auth.getSession().then(r=>userChanged(r.data?.session?.user));db.auth.onAuthStateChange((_,s)=>setTimeout(()=>userChanged(s?.user),0));
setInterval(()=>void refresh(),5000);window.addEventListener('focus',()=>void refresh());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
})();