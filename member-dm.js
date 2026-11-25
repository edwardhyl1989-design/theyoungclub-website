(()=>{'use strict';
if(window.TYC_MemberDM||!window.supabase?.createClient)return;
const db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
let me=null,peer=null,version=0,busy=false,loading=false,ready=false,lastPeer=null,pendingRefresh=false;
const node=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
const btn=(txt,fn)=>{const b=node('button','',txt);b.type='button';b.onclick=fn;return b;};
const root=node('div','tyc-dm');root.hidden=true;
const launcher=btn('✉ Messages / 메시지',()=>{if(!panel.hidden&&!peer){panel.hidden=true;version++;return;}showInbox();});launcher.className='tyc-dm-launch';const alertDot=node('span','tyc-dm-launch-alert','!');alertDot.hidden=true;alertDot.setAttribute('aria-hidden','true');launcher.append(alertDot);
const panel=node('section','tyc-dm-panel');panel.hidden=true;panel.setAttribute('aria-label','Private member messages');
const head=node('div','tyc-dm-head'),title=node('strong','','Messages');head.append(title,btn('×',()=>{panel.hidden=true;version++;}));
const rules=node('div','tyc-dm-rules');rules.append(node('p','','No harassment, threats, discrimination, sexual harassment, scams, or spam. Never share patient or sensitive personal information.'),node('p','','욕설·괴롭힘·협박·차별·성희롱·사기·스팸 금지. 환자 정보 및 민감한 개인정보를 공유하지 마세요.'));
const content=node('div','tyc-dm-content'),notice=node('p','tyc-dm-status');notice.setAttribute('role','status');
const form=node('form','tyc-dm-form');form.hidden=true;const input=node('textarea');input.maxLength=2000;input.required=true;input.placeholder='Write a message / 메시지 입력';const send=node('button','','Send');send.type='submit';const emojiToggle=btn('☺',()=>{const opening=emojiPicker.hidden;emojiPicker.hidden=!opening;emojiToggle.setAttribute('aria-expanded',String(opening));if(opening){renderEmoji();emojiSearch.focus();}});emojiToggle.className='tyc-dm-emoji-toggle';emojiToggle.setAttribute('aria-label','Emoji / 이모티콘');emojiToggle.setAttribute('aria-expanded','false');
const emojiPicker=node('div','tyc-dm-emoji-picker');emojiPicker.hidden=true;const emojiSearch=node('input','tyc-dm-emoji-search');emojiSearch.type='search';emojiSearch.placeholder='Search emoji / 검색';emojiSearch.setAttribute('aria-label','Search emoji');const emojiGrid=node('div','tyc-dm-emoji-grid');emojiPicker.append(emojiSearch,emojiGrid);
const fallback='😀 😄 😂 😊 🙂 😉 😍 🥰 🤔 😅 😢 😭 😎 🥳 👍 👎 👋 🙌 👏 🙏 🤝 💪 ❤️ 💚 💛 ✨ 🎉 🔥 ✅ 🌱 💯'.split(' ');
let emojiRange=null;
function closeEmoji(){emojiPicker.hidden=true;emojiToggle.setAttribute('aria-expanded','false');emojiRange=null;}
function renderEmoji(){const q=emojiSearch.value.trim();const entries=window.TYC_EmojiCatalog?.search(q,400)||fallback.filter(e=>!q||e.includes(q)).map(emoji=>({emoji}));emojiGrid.replaceChildren();for(const item of entries){const b=btn(item.emoji,()=>{const [a,z]=emojiRange||[input.value.length,input.value.length];if(input.value.length-(z-a)+item.emoji.length>input.maxLength)return;input.setRangeText(item.emoji,a,z,'end');emojiRange=[input.selectionStart,input.selectionEnd];input.focus();});b.title=item.english||item.emoji;b.setAttribute('aria-label',item.english||item.emoji);emojiGrid.append(b);}if(!entries.length)emojiGrid.append(node('span','','No matches')); }
emojiSearch.addEventListener('input',renderEmoji);emojiToggle.addEventListener('pointerdown',()=>{emojiRange=[input.selectionStart,input.selectionEnd];});input.addEventListener('select',()=>{if(!emojiPicker.hidden)emojiRange=[input.selectionStart,input.selectionEnd];});
if(!window.TYC_EmojiCatalog){const script=node('script');script.src='emoji-catalog.js?v=1';script.onload=()=>{if(!emojiPicker.hidden)renderEmoji();};document.head.append(script);}
document.addEventListener('click',e=>{if(!emojiPicker.hidden&&!emojiPicker.contains(e.target)&&!emojiToggle.contains(e.target)&&e.target!==input)closeEmoji();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!emojiPicker.hidden)closeEmoji();});
form.append(emojiToggle,input,send,emojiPicker);panel.append(head,rules,content,notice,form);root.append(panel,launcher);document.body.append(root);
const modal=node('dialog','tyc-dm-profile');document.body.append(modal);
const menu=node('div','tyc-member-dropdown');menu.hidden=true;document.body.append(menu);let menuAnchor=null;
function closeMenu(){menu.hidden=true;menuAnchor?.setAttribute('aria-expanded','false');menuAnchor=null;}
function showMenu(anchor){if(menuAnchor===anchor&&!menu.hidden){closeMenu();return;}closeMenu();menuAnchor=anchor;anchor.setAttribute('aria-expanded','true');const id=anchor.dataset.tycMember;menu.replaceChildren(btn('Profile / 프로필',()=>{closeMenu();void profile(id,'profile');}));if(id!==me?.id)menu.append(btn('Message / 메시지',async()=>{closeMenu();if(!me){signIn();return;}try{const uid=me.id;const p=await rpc('tyc_member_card',{p_member:id});if(me?.id===uid&&p)await openPeer(id,p);}catch(e){status(e.message||'Member unavailable');panel.hidden=false;}}));const host=anchor.closest('dialog[open]')||document.body;if(menu.parentNode!==host)host.append(menu);menu.hidden=false;const r=anchor.getBoundingClientRect(),w=menu.offsetWidth,h=menu.offsetHeight;menu.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';menu.style.top=Math.max(8,r.bottom+h+5>innerHeight?r.top-h-5:r.bottom+5)+'px';}
window.addEventListener('resize',closeMenu);window.addEventListener('scroll',e=>{if(!menu.contains(e.target))closeMenu();},true);
const css=node('link');css.rel='stylesheet';css.href='member-dm.css?v=soft-red10';document.head.append(css);
function status(t){notice.textContent=t||'';}
async function rpc(name,args={}){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data;}
const formatDate=v=>v?new Date(v).toLocaleDateString():'—';
function profileName(p){return p?.nickname||'Registered member';}
function signIn(){location.href='auth.html?next='+encodeURIComponent(location.pathname.split('/').pop()+location.search);}
async function profile(id,mode='menu'){
 if(!me){signIn();return;}
 const uid=me.id;modal.replaceChildren(node('p','','Loading member…'),btn('×',()=>modal.close()));if(!modal.open)modal.showModal();
 try{const p=await rpc('tyc_member_card',{p_member:id});if(me?.id!==uid||!modal.open)return;if(!p)throw Error('Member unavailable');
 modal.replaceChildren();const top=node('div','tyc-dm-head');top.append(node('strong','',profileName(p)),btn('×',()=>modal.close()));modal.append(top);
 if(mode==='menu'){modal.append(btn('Profile / 프로필',()=>void profile(id,'profile')));}
 else{modal.append(node('p','', 'Joined / 가입일: '+formatDate(p.joined)),node('p','',p.role==='PTA'||p.role==='SPTA'?'VERIFIED '+p.role:p.role==='ADMIN'?'ADMIN':'REGISTERED MEMBER'));if(p.role==='PTA')modal.append(node('p','',p.license_year?'PTA license issued: '+p.license_year+' · Approx. '+Math.max(0,new Date().getFullYear()-p.license_year)+' years since licensure':'PTA experience: Not provided'));}
 if(id!==uid)modal.append(btn('Message / 메시지',()=>{modal.close();void openPeer(id,p);}));
 }catch(e){modal.replaceChildren(node('p','',e.message||'Profile unavailable'),btn('Close',()=>modal.close()));}
}
function showInbox(){closeEmoji();peer=null;rememberPeer(null);version++;panel.hidden=false;title.textContent='Messages / 메시지';form.hidden=true;input.value='';status('');clearHistory();content.append(node('p','','Loading conversations…'));void refresh();}
function clearHistory(){content.replaceChildren();delete content.dataset.sig;delete content.dataset.peer;}
function rememberPeer(value){lastPeer=value;try{const key='tyc-dm-last:'+me.id;if(value)sessionStorage.setItem(key,JSON.stringify(value));else sessionStorage.removeItem(key);}catch{}}
async function openPeer(id,p){if(!me||id===me.id)return;closeEmoji();peer=id;rememberPeer({id,profile:p});version++;input.value='';clearHistory();content.append(node('p','','Loading messages…'));panel.hidden=false;title.textContent=profileName(p);form.hidden=false;status('');await refresh();}
async function refresh(){if(!me||document.hidden)return;if(loading){pendingRefresh=true;return;}loading=true;const uid=me.id,v=version,active=peer;
 try{const rows=await rpc('tyc_dm_inbox');if(me?.id!==uid||v!==version)return;const count=(rows||[]).reduce((a,r)=>a+Number(r.unread||0),0);alertDot.hidden=count===0;launcher.setAttribute('aria-label','Messages / 메시지'+(count?' · '+count+' unread messages':''));
 if(panel.hidden)return;
 if(!active){title.textContent='Messages / 메시지';form.hidden=true;clearHistory();for(const r of rows||[]){const b=btn('',()=>void openPeer(r.peer,r.profile));b.className='tyc-dm-thread'+(r.unread?' is-unread':'');const top=node('span','tyc-dm-thread-top');top.append(node('strong','',profileName(r.profile)),node('time','tyc-dm-thread-time',r.last_at?new Date(r.last_at).toLocaleDateString()+' '+new Date(r.last_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):''));const bottom=node('span','tyc-dm-thread-bottom');bottom.append(node('span','tyc-dm-thread-preview',(r.last_mine?'You: ':'')+(r.last_text||'')));if(r.unread)bottom.append(node('span','tyc-dm-thread-unread',String(r.unread)));b.append(top,bottom);content.append(b);}if(!rows?.length)content.append(node('p','','No conversations yet. Click a member nickname to start.'));return;}
 const r=await db.from('tyc_member_dm').select('id,sender_id,body,created_at').or('and(sender_id.eq.'+uid+',recipient_id.eq.'+active+'),and(sender_id.eq.'+active+',recipient_id.eq.'+uid+')').order('created_at',{ascending:false}).limit(100);
 if(r.error)throw r.error;if(me?.id!==uid||v!==version||panel.hidden)return;
 const sig=JSON.stringify(r.data);if(content.dataset.sig!==sig||content.dataset.peer!==active){content.dataset.sig=sig;content.dataset.peer=active;content.replaceChildren();const actions=node('div','tyc-dm-actions');actions.append(btn('← Inbox',showInbox),btn('Block / 차단',async()=>{if(!confirm('Block messages from this member?'))return;const res=await db.from('tyc_dm_blocks').upsert({owner_id:uid,blocked_id:active},{ignoreDuplicates:true});status(res.error?res.error.message:'Member blocked');}),btn('Unblock / 해제',async()=>{const res=await db.from('tyc_dm_blocks').delete().eq('owner_id',uid).eq('blocked_id',active);status(res.error?res.error.message:'Member unblocked');}));content.append(actions);for(const m of [...r.data].reverse()){const b=node('div','tyc-dm-bubble'+(m.sender_id===uid?' mine':''),m.body);b.append(node('small','',new Date(m.created_at).toLocaleString()));content.append(b);}if(!r.data.length)content.append(node('p','','No messages yet. Start the conversation below.'));content.scrollTop=content.scrollHeight;}
 await rpc('tyc_dm_read',{p_peer:active});
 }catch(e){status(e.message||'Messages unavailable');}finally{loading=false;const again=pendingRefresh;pendingRefresh=false;if(me&&(again||(v!==version&&!panel.hidden)))void refresh();}
}
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();if(!busy&&input.value.trim())form.requestSubmit();}});
form.onsubmit=async e=>{e.preventDefault();if(!peer||!me||busy||!input.value.trim())return;busy=true;send.disabled=true;const id=peer,v=version;try{await rpc('tyc_dm_send',{p_recipient:id,p_body:input.value.trim()});if(v===version){input.value='';closeEmoji();status('');}await refresh();}catch(e){status(e.message||'Message not sent');}finally{busy=false;send.disabled=false;}};
function userChanged(user){if(me?.id===user?.id&&ready)return;ready=true;me=user||null;version++;peer=null;lastPeer=null;clearHistory();if(me){try{const saved=JSON.parse(sessionStorage.getItem('tyc-dm-last:'+me.id)||'null');if(saved&&typeof saved.id==='string'&&/^[0-9a-f-]{36}$/i.test(saved.id)&&saved.id!==me.id)lastPeer=saved;}catch{}}input.value='';status('');panel.hidden=true;closeEmoji();closeMenu();if(modal.open)modal.close();alertDot.hidden=true;launcher.setAttribute('aria-label','Messages / 메시지');root.hidden=!me;if(me)void refresh();}
window.TYC_MemberDM={profile};
document.addEventListener('click',e=>{const t=e.target.closest('[data-tyc-member]');if(!t){if(!menu.contains(e.target))closeMenu();return;}e.preventDefault();e.stopPropagation();showMenu(t);},true);
document.addEventListener('keydown',e=>{const t=e.target.closest('[data-tyc-member]');if(e.key==='Escape')closeMenu();if(t&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showMenu(t);}});
db.auth.getSession().then(r=>userChanged(r.data?.session?.user));db.auth.onAuthStateChange((_,s)=>setTimeout(()=>userChanged(s?.user),0));
setInterval(()=>void refresh(),5000);window.addEventListener('focus',()=>void refresh());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
})();