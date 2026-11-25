(()=>{'use strict';
if(window.TYC_MemberDM||!window.supabase?.createClient)return;
const db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
let me=null,peer=null,version=0,busy=false,loading=false,ready=false;
const node=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
const btn=(txt,fn)=>{const b=node('button','',txt);b.type='button';b.onclick=fn;return b;};
const root=node('div','tyc-dm');root.hidden=true;
const launcher=btn('✉ Messages / 메시지',()=>{panel.hidden=!panel.hidden;if(!panel.hidden){peer=null;void refresh();}});launcher.className='tyc-dm-launch';
const panel=node('section','tyc-dm-panel');panel.hidden=true;panel.setAttribute('aria-label','Private member messages');
const head=node('div','tyc-dm-head'),title=node('strong','','Messages');head.append(title,btn('×',()=>{panel.hidden=true;peer=null;version++;}));
const content=node('div','tyc-dm-content'),notice=node('p','tyc-dm-status');notice.setAttribute('role','status');
const form=node('form','tyc-dm-form');form.hidden=true;const input=node('textarea');input.maxLength=2000;input.required=true;input.placeholder='Write a message / 메시지 입력';const send=node('button','','Send');send.type='submit';form.append(input,send);panel.append(head,content,notice,form);root.append(panel,launcher);document.body.append(root);
const modal=node('dialog','tyc-dm-profile');document.body.append(modal);
const menu=node('div','tyc-member-dropdown');menu.hidden=true;document.body.append(menu);let menuAnchor=null;
function closeMenu(){menu.hidden=true;menuAnchor?.setAttribute('aria-expanded','false');menuAnchor=null;}
function showMenu(anchor){if(menuAnchor===anchor&&!menu.hidden){closeMenu();return;}closeMenu();menuAnchor=anchor;anchor.setAttribute('aria-expanded','true');const id=anchor.dataset.tycMember;menu.replaceChildren(btn('Profile / 프로필',()=>{closeMenu();void profile(id,'profile');}));if(id!==me?.id)menu.append(btn('Message / 메시지',async()=>{closeMenu();if(!me){signIn();return;}try{const uid=me.id;const p=await rpc('tyc_member_card',{p_member:id});if(me?.id===uid&&p)await openPeer(id,p);}catch(e){status(e.message||'Member unavailable');panel.hidden=false;}}));const host=anchor.closest('dialog[open]')||document.body;if(menu.parentNode!==host)host.append(menu);menu.hidden=false;const r=anchor.getBoundingClientRect(),w=menu.offsetWidth,h=menu.offsetHeight;menu.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';menu.style.top=Math.max(8,r.bottom+h+5>innerHeight?r.top-h-5:r.bottom+5)+'px';}
window.addEventListener('resize',closeMenu);window.addEventListener('scroll',e=>{if(!menu.contains(e.target))closeMenu();},true);
const css=node('link');css.rel='stylesheet';css.href='member-dm.css?v=clickfix3';document.head.append(css);
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
async function openPeer(id,p){if(!me||id===me.id)return;peer=id;version++;input.value='';content.replaceChildren();panel.hidden=false;title.textContent=profileName(p);form.hidden=false;status('');await refresh();}
async function refresh(){if(!me||loading||document.hidden)return;loading=true;const uid=me.id,v=version,active=peer;
 try{const rows=await rpc('tyc_dm_inbox');if(me?.id!==uid||v!==version)return;const count=(rows||[]).reduce((a,r)=>a+Number(r.unread||0),0);launcher.textContent='✉ Messages / 메시지'+(count?' · '+count+' NEW':'');launcher.classList.toggle('has-unread',count>0);
 if(panel.hidden)return;
 if(!active){title.textContent='Messages / 메시지';form.hidden=true;content.replaceChildren();for(const r of rows||[]){const b=btn(profileName(r.profile)+(r.unread?' · '+r.unread+' NEW':''),()=>void openPeer(r.peer,r.profile));b.className='tyc-dm-thread';content.append(b);}if(!rows?.length)content.append(node('p','','No conversations yet. Click a member nickname to start.'));return;}
 const r=await db.from('tyc_member_dm').select('id,sender_id,body,created_at').or('and(sender_id.eq.'+uid+',recipient_id.eq.'+active+'),and(sender_id.eq.'+active+',recipient_id.eq.'+uid+')').order('created_at',{ascending:false}).limit(100);
 if(r.error)throw r.error;if(me?.id!==uid||v!==version||panel.hidden)return;
 const sig=JSON.stringify(r.data);if(content.dataset.sig!==sig||content.dataset.peer!==active){content.dataset.sig=sig;content.dataset.peer=active;content.replaceChildren();const actions=node('div','tyc-dm-actions');actions.append(btn('← Inbox',()=>{peer=null;version++;content.replaceChildren();form.hidden=true;void refresh();}),btn('Block / 차단',async()=>{if(!confirm('Block messages from this member?'))return;const res=await db.from('tyc_dm_blocks').upsert({owner_id:uid,blocked_id:active},{ignoreDuplicates:true});status(res.error?res.error.message:'Member blocked');}),btn('Unblock / 해제',async()=>{const res=await db.from('tyc_dm_blocks').delete().eq('owner_id',uid).eq('blocked_id',active);status(res.error?res.error.message:'Member unblocked');}));content.append(actions);for(const m of [...r.data].reverse()){const b=node('div','tyc-dm-bubble'+(m.sender_id===uid?' mine':''),m.body);b.append(node('small','',new Date(m.created_at).toLocaleString()));content.append(b);}content.scrollTop=content.scrollHeight;}
 await rpc('tyc_dm_read',{p_peer:active});
 }catch(e){status(e.message||'Messages unavailable');}finally{loading=false;if(me&&v!==version&&!panel.hidden)void refresh();}
}
form.onsubmit=async e=>{e.preventDefault();if(!peer||!me||busy||!input.value.trim())return;busy=true;send.disabled=true;const id=peer,v=version;try{await rpc('tyc_dm_send',{p_recipient:id,p_body:input.value.trim()});if(v===version){input.value='';status('');}await refresh();}catch(e){status(e.message||'Message not sent');}finally{busy=false;send.disabled=false;}};
function userChanged(user){if(me?.id===user?.id&&ready)return;ready=true;me=user||null;version++;peer=null;content.replaceChildren();input.value='';status('');panel.hidden=true;closeMenu();if(modal.open)modal.close();root.hidden=!me;if(me)void refresh();}
window.TYC_MemberDM={profile};
document.addEventListener('click',e=>{const t=e.target.closest('[data-tyc-member]');if(!t){if(!menu.contains(e.target))closeMenu();return;}e.preventDefault();e.stopPropagation();showMenu(t);},true);
document.addEventListener('keydown',e=>{const t=e.target.closest('[data-tyc-member]');if(e.key==='Escape')closeMenu();if(t&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showMenu(t);}});
db.auth.getSession().then(r=>userChanged(r.data?.session?.user));db.auth.onAuthStateChange((_,s)=>setTimeout(()=>userChanged(s?.user),0));
setInterval(()=>void refresh(),5000);window.addEventListener('focus',()=>void refresh());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
})();