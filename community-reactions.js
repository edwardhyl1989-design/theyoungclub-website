/* THE YOUNG CLUB community emoji & private GIF picker.
   No third-party tracking or API keys. GIF library is the member's own uploads. */
(()=>{'use strict';
const BUCKET='tyc-community-images';
const pathRE=/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.gif$/i;
const emojis={
 'Smileys':['😀','😃','😄','😁','😆','😅','😂','🤣','🥹','😊','☺️','😇','🙂','🙃','😉','😍','🥰','😘','😗','😋','😎','🤩','🥳','😏','🥲','😔','😢','😭','😤','😡','🤯','🥺','😳','🤔','🫡','😴','🤒','🤗','🤭','🫢','🫣','🤫','😬','🙄','😮','😱','😷','🤠','👻','💀','🥸'],
 'Gestures':['👍','👎','👏','🙌','🫶','🤝','🙏','💪','✌️','🤞','👌','👋','🤙','✋','☝️','👀','💅','👊','🤜','🤛','🫰'],
 'Hearts':['❤️','🧡','💛','💚','💙','💜','🩷','🤍','🖤','💖','💗','💓','💞','💯','✨','⭐','🌟','🔥','🎉','🎊','🏆','✅','❗','💡'],
 'Life':['🌱','🌿','🌳','🌈','☀️','🌙','🌸','🍀','🌻','🌊','🐶','🐱','☕','🍵','🥑','🍕','🎂','🏃','🚴','🧘','🏋️','🩺','📚','💻','📝','🏥','💊','🎓','🏅','🎯']
};
const div=(cls)=>{const n=document.createElement('div');if(cls)n.className=cls;return n;};
const text=(s,cls)=>{const n=document.createElement('span');if(cls)n.className=cls;n.textContent=s;return n;};
const btn=(label,cls,handler)=>{const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=handler;return b;};
function validFile(file){return !!file&&file.type==='image/gif'&&file.size>0&&file.size<=5242880}
function attach({host,db,user,onEmoji,onGif,canAddGif=()=>true}){
 if(!host||!db||!user)return null;
 const root=div('community-reaction-wrap');
 const triggers=div('community-reaction-triggers');
 const panel=div('community-reaction-picker');panel.hidden=true;
 const tabs=div('community-reaction-tabs');
 const grid=div('community-reaction-grid');
 const status=div('community-reaction-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const search=document.createElement('input');search.type='search';search.placeholder='Find an emoji / 이모지 검색';search.setAttribute('aria-label','Find an emoji');
 const file=document.createElement('input');file.type='file';file.accept='image/gif,.gif';file.hidden=true;
 let mode='emoji',open=false,cache=null,loading=false;
 const emojiTrigger=btn('☺ Emoji','community-reaction-trigger',()=>toggle('emoji'));
 const gifTrigger=btn('GIF','community-reaction-trigger',()=>toggle('gif'));
 triggers.append(emojiTrigger,gifTrigger);
 const close=btn('×','community-reaction-close',()=>toggle(false));close.setAttribute('aria-label','Close emoji and GIF picker');
 const heading=div('community-reaction-heading');heading.append(text('EXPRESS YOURSELF'),close);
 const emojiTab=btn('😊 Emoji','community-reaction-tab',()=>setMode('emoji'));
 const gifTab=btn('GIF · My uploads','community-reaction-tab',()=>setMode('gif'));
 tabs.append(emojiTab,gifTab);
 const content=div('community-reaction-content');
 const emojiView=div('community-emoji-view');const gifView=div('community-gif-view');
 const gifIntro=document.createElement('p');gifIntro.className='community-reaction-note';
 gifIntro.textContent='Choose a GIF you uploaded, or add a new one (max 5 MB). Only approved members can view these files. / 내가 올린 GIF 중 선택하거나 새 GIF를 업로드하세요.';
 const upload=btn('＋ Upload GIF','community-gif-upload',()=>file.click());
 const gifGrid=div('community-gif-grid');
 gifView.append(gifIntro,upload,file,gifGrid);
 emojiView.append(search,grid);
 content.append(emojiView,gifView);
 panel.append(heading,tabs,content,status);
 root.append(triggers,panel);host.append(root);
 function toggle(target){
  open=target===false?false:(open&&mode===target?false:true);
  panel.hidden=!open;emojiTrigger.setAttribute('aria-expanded',String(open&&mode==='emoji'));gifTrigger.setAttribute('aria-expanded',String(open&&mode==='gif'));
  if(open)setMode(target);
 }
 function setMode(target){
  mode=target;emojiView.hidden=target!=='emoji';gifView.hidden=target!=='gif';
  emojiTab.classList.toggle('active',target==='emoji');gifTab.classList.toggle('active',target==='gif');
  if(target==='emoji')renderEmoji();else loadGifs();
 }
 function renderEmoji(){
  grid.replaceChildren();
  const query=search.value.trim().toLowerCase();
  for(const [category,items] of Object.entries(emojis)){
   if(query&&category.toLowerCase().indexOf(query)<0&&!items.some(e=>e.includes(query)))continue;
   const group=div('community-emoji-group');group.append(text(category,'community-emoji-category'));
   const itemsWrap=div('community-emoji-items');
   for(const emoji of items){
    const b=btn(emoji,'community-emoji-item',()=>{onEmoji(emoji);toggle(false)});
    b.setAttribute('aria-label','Insert emoji '+emoji);itemsWrap.append(b);
   }
   group.append(itemsWrap);grid.append(group);
  }
  if(!grid.childNodes.length)grid.append(text('No matching emojis. / 검색 결과가 없습니다.','community-reaction-empty'));
 }
 search.oninput=renderEmoji;
 async function loadGifs(refresh=false){
  if(loading)return;
  if(cache&&!refresh){renderGifs();return;}
  loading=true;status.textContent='Loading your GIFs…';
  try{
   const {data,error}=await db.storage.from(BUCKET).list(user.id,{limit:80,sortBy:{column:'created_at',order:'desc'}});
   if(error)throw error;
   cache=(data||[]).filter(item=>/^[a-f0-9-]{36}\.gif$/i.test(item.name)).slice(0,30).map(x=>user.id+'/'+x.name);
   renderGifs();status.textContent='';
  }catch(e){status.textContent='Could not load GIF library: '+(e.message||'Unknown error');}
  finally{loading=false;}
 }
 function renderGifs(){
  gifGrid.replaceChildren();
  if(!cache?.length){gifGrid.append(text('No GIFs uploaded yet. Choose ＋ Upload GIF to start.','community-reaction-empty'));return;}
  for(const path of cache){
   if(!pathRE.test(path))continue;
   const b=btn('','community-gif-tile',()=>{if(!canAddGif()){status.textContent='Maximum 10 images/GIFs per post.';return;}onGif(path);toggle(false);});
   b.setAttribute('aria-label','Insert saved GIF');
   const img=document.createElement('img');img.alt='Your saved GIF';img.loading='lazy';b.append(img);
   gifGrid.append(b);
   db.storage.from(BUCKET).createSignedUrl(path,3600).then(({data,error})=>{if(!error&&img.isConnected)img.src=data.signedUrl;}).catch(()=>{});
  }
 }
 file.onchange=async()=>{
  const f=file.files?.[0];file.value='';if(!f)return;
  if(!validFile(f)){status.textContent='Select a GIF under 5 MB. / 5MB 이하 GIF 파일만 가능합니다.';return;}
  if(!canAddGif()){status.textContent='Maximum 10 images/GIFs per post.';return;}
  const header=new Uint8Array(await f.slice(0,6).arrayBuffer());
  if(String.fromCharCode(...header)!=='GIF89a'&&String.fromCharCode(...header)!=='GIF87a'){
   status.textContent='Invalid GIF file. / GIF 형식이 아닙니다.';return;
  }
  const path=user.id+'/'+crypto.randomUUID()+'.gif';
  upload.disabled=true;status.textContent='Uploading private GIF…';loading=true;
  try{
   const {error}=await db.storage.from(BUCKET).upload(path,f,{contentType:'image/gif',upsert:false,cacheControl:'3600'});
   if(error)throw error;
   cache=null;onGif(path);toggle(false);
   status.textContent='GIF attached. Save your message to publish. / GIF 첨부 완료, 글을 저장해 주세요.';
  }catch(e){status.textContent='GIF upload failed: '+(e.message||'Unknown error');}
  finally{loading=false;upload.disabled=false;}
 };
 document.addEventListener('pointerdown',e=>{if(open&&root.isConnected&&!root.contains(e.target))toggle(false)});
 renderEmoji();
 return {busy:()=>loading,close:()=>toggle(false),reset:()=>{cache=null;toggle(false)}};
}
function replyToken(path){return pathRE.test(path)?'[[tyc-gif:'+path+']]':'';}
function renderReply(target,body,db){
 // Never parse untrusted reply HTML. Only server-controlled GIF path tokens get signed images.
 const regex=/\[\[tyc-gif:([a-f0-9-]{36}\/[a-f0-9-]{36}\.gif)\]\]/gi;
 const input=String(body||'');target.replaceChildren();
 let previous=0,match,hasGif=false;
 while((match=regex.exec(input))){
  if(match.index>previous)target.append(document.createTextNode(input.slice(previous,match.index)));
  const path=match[1];const image=document.createElement('img');
  image.className='community-reply-gif';image.alt='Member GIF';image.loading='lazy';
  target.append(image);hasGif=true;
  db.storage.from(BUCKET).createSignedUrl(path,3600).then(({data,error})=>{
   if(error||!data?.signedUrl)throw Error('Unavailable');
   if(image.isConnected)image.src=data.signedUrl;
  }).catch(()=>{image.alt='GIF unavailable';});
  previous=regex.lastIndex;
 }
 if(previous<input.length)target.append(document.createTextNode(input.slice(previous)));
 if(!hasGif)target.textContent=input;
}
function insertAtCaret(area,value){
 const start=area.selectionStart??area.value.length,end=area.selectionEnd??start;
 area.setRangeText(value,start,end,'end');area.focus();
 area.dispatchEvent(new Event('input',{bubbles:true}));
}
window.TYC_CommunityReactions={attach,replyToken,renderReply,insertAtCaret};
})();