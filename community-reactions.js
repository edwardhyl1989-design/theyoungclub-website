/* THE YOUNG CLUB community emoji, GIPHY search, and private uploads. API key remains server-side. */
(()=>{'use strict';
const BUCKET='tyc-community-images';
const pathRE=/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.gif$/i;
const giphyRE=/^[A-Za-z0-9]{4,90}$/;
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
function attach({host,db,user,onEmoji,onGif,onGiphy=()=>{},canAddGif=()=>true}){
 if(!host||!db||!user)return null;
 const root=div('community-reaction-wrap');
 const triggers=div('community-reaction-triggers');
 const panel=div('community-reaction-picker');panel.hidden=true;
 const tabs=div('community-reaction-tabs');
 const grid=div('community-reaction-grid');
 const status=div('community-reaction-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const search=document.createElement('input');search.type='search';search.placeholder='Find an emoji / 이모지 검색';search.setAttribute('aria-label','Find an emoji');
 const file=document.createElement('input');file.type='file';file.accept='image/gif,.gif';file.hidden=true;
 let mode='emoji',open=false,cache=null,loading=false,searchTimer=null,searchSerial=0;
 const searchCache=new Map();
 const emojiTrigger=btn('☺ Emoji','community-reaction-trigger',()=>toggle('emoji'));
 const gifTrigger=btn('GIF','community-reaction-trigger',()=>toggle('gif'));
 triggers.append(emojiTrigger,gifTrigger);
 const close=btn('×','community-reaction-close',()=>toggle(false));close.setAttribute('aria-label','Close emoji and GIF picker');
 const heading=div('community-reaction-heading');heading.append(text('EXPRESS YOURSELF'),close);
 const emojiTab=btn('😊 Emoji','community-reaction-tab',()=>setMode('emoji'));
 const searchTab=btn('🔎 Search GIFs','community-reaction-tab',()=>setMode('search'));
 const gifTab=btn('My GIFs','community-reaction-tab',()=>setMode('gif'));
 tabs.append(emojiTab,searchTab,gifTab);
 const content=div('community-reaction-content');
 const emojiView=div('community-emoji-view');const gifView=div('community-gif-view');
 const giphyView=div('community-giphy-view');
 const giphyInput=document.createElement('input');giphyInput.type='search';giphyInput.maxLength=70;
 giphyInput.placeholder='Search reactions, emotions, moments…';giphyInput.setAttribute('aria-label','Search GIPHY GIFs');
 const giphyGrid=div('community-gif-grid community-giphy-grid');
 const giphyCredit=document.createElement('a');giphyCredit.className='community-giphy-attribution';giphyCredit.href='https://giphy.com/';giphyCredit.target='_blank';giphyCredit.rel='noopener noreferrer';giphyCredit.textContent='Powered by GIPHY';
 giphyView.append(giphyInput,giphyGrid,giphyCredit);
 const gifIntro=document.createElement('p');gifIntro.className='community-reaction-note';
 gifIntro.textContent='Choose a GIF you uploaded, or add a new one (max 5 MB). Only approved members can view these files. / 내가 올린 GIF 중 선택하거나 새 GIF를 업로드하세요.';
 const upload=btn('＋ Upload GIF','community-gif-upload',()=>file.click());
 const gifGrid=div('community-gif-grid');
 gifView.append(gifIntro,upload,file,gifGrid);
 emojiView.append(search,grid);
 content.append(emojiView,giphyView,gifView);
 panel.append(heading,tabs,content,status);
 root.append(triggers,panel);host.append(root);
 function toggle(target){
  const requested=target==='gif'?'search':target;
  open=requested===false?false:(open&&mode===requested?false:true);
  panel.hidden=!open;
  if(open)setMode(requested);
  emojiTrigger.setAttribute('aria-expanded',String(open&&mode==='emoji'));
  gifTrigger.setAttribute('aria-expanded',String(open&&mode!=='emoji'));
 }
 function setMode(target){
  mode=target;emojiView.hidden=target!=='emoji';gifView.hidden=target!=='gif';giphyView.hidden=target!=='search';
  emojiTab.classList.toggle('active',target==='emoji');gifTab.classList.toggle('active',target==='gif');searchTab.classList.toggle('active',target==='search');
  if(target==='emoji')renderEmoji();else if(target==='gif')loadGifs();else {giphyInput.focus();if(giphyInput.value.trim().length>=2)searchGiphy();}
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
 function showGiphy(items){
  giphyGrid.replaceChildren();
  if(!items.length){giphyGrid.append(text('No GIFs found. Try another search. / 검색 결과가 없습니다.','community-reaction-empty'));return;}
  for(const result of items){
   if(!giphyRE.test(result.id))continue;
   const tile=btn('','community-gif-tile',()=>{
    if(!canAddGif()){status.textContent='Maximum 10 images/GIFs per post.';return;}
    onGiphy(result.id);toggle(false);
   });
   tile.setAttribute('aria-label','Insert GIPHY GIF '+result.title);
   const img=document.createElement('img');img.loading='lazy';img.alt=result.title||'GIPHY GIF';
   try{
    const url=new URL(result.preview);
    if(url.protocol==='https:'&&/^(media\d*|i)\.giphy\.com$/i.test(url.hostname))img.src=url.href;
   }catch{}
   tile.append(img);giphyGrid.append(tile);
  }
 }
 async function searchGiphy(){
  const query=giphyInput.value.trim();
  const serial=++searchSerial;
  if(query.length<2){giphyGrid.replaceChildren(text('Search by keyword to find a GIF.','community-reaction-empty'));return;}
  const key=query.toLowerCase();
  if(searchCache.has(key)){showGiphy(searchCache.get(key));status.textContent='';return;}
  giphyGrid.replaceChildren(text('Searching GIPHY…','community-reaction-empty'));
  try{
   const {data,error}=await db.functions.invoke('tyc-giphy-search',{body:{query}});
   if(serial!==searchSerial)return;
   if(error)throw error;
   if(data?.error)throw Error(data.error);
   const items=Array.isArray(data?.results)?data.results:[];
   searchCache.set(key,items);if(searchCache.size>30)searchCache.delete(searchCache.keys().next().value);
   showGiphy(items);status.textContent='';
  }catch(e){if(serial!==searchSerial)return;giphyGrid.replaceChildren(text('GIF search unavailable. You can still upload your own GIF.','community-reaction-empty'));status.textContent=String(e?.message||'Search error');}
 }
 giphyInput.addEventListener('input',()=>{
  clearTimeout(searchTimer);
  searchTimer=setTimeout(searchGiphy,500);
 });
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
function giphyToken(id){return giphyRE.test(id)?'[[tyc-giphy:'+id+']]':'';}
function giphyUrl(id){return giphyRE.test(id)?'https://media.giphy.com/media/'+encodeURIComponent(id)+'/giphy.gif':'';}
function renderReply(target,body,db){
 // Treat the reply as plain text, interpreting only validated private-file and GIPHY tokens.
 const regex=/\[\[(tyc-gif|tyc-giphy):([A-Za-z0-9/-]+(?:\.gif)?)\]\]/gi;
 const input=String(body||'');target.replaceChildren();
 let previous=0,match;
 while((match=regex.exec(input))){
  if(match.index>previous)target.append(document.createTextNode(input.slice(previous,match.index)));
  const path=match[2],isGiphy=match[1].toLowerCase()==='tyc-giphy';
  const valid=isGiphy?giphyRE.test(path):pathRE.test(path);
  if(!valid){target.append(document.createTextNode(match[0]));previous=regex.lastIndex;continue;}
  const image=document.createElement('img');image.className='community-reply-gif';image.loading='lazy';image.alt=isGiphy?'GIPHY GIF':'Member GIF';
  target.append(image);
  if(isGiphy)image.src=giphyUrl(path);
  else db.storage.from(BUCKET).createSignedUrl(path,3600).then(({data,error})=>{
   if(error||!data?.signedUrl)throw Error('Unavailable');if(image.isConnected)image.src=data.signedUrl;
  }).catch(()=>{image.alt='GIF unavailable';});
  previous=regex.lastIndex;
 }
 if(previous<input.length)target.append(document.createTextNode(input.slice(previous)));
}
function insertAtCaret(area,value){
 const start=area.selectionStart??area.value.length,end=area.selectionEnd??start;
 area.setRangeText(value,start,end,'end');area.focus();
 area.dispatchEvent(new Event('input',{bubbles:true}));
}
window.TYC_CommunityReactions={attach,replyToken,giphyToken,giphyUrl,renderReply,insertAtCaret};
})();