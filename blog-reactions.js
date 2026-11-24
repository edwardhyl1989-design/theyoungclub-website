/* Blog emoji and GIF toolbar for guest comments and admin article editor. */
(()=>{'use strict';
const emojis=['😀','😁','😂','🤣','😊','😍','🥰','😉','😎','🥳','🥹','😢','😭','🤔','🙌','👏','🙏','👍','👎','🫶','❤️','💚','💛','💕','🔥','⭐','✨','🎉','🎊','💪','🌱','🍀','🥇','🩺','📚','🏥','🧘','🏃','💯','✅']; // fallback if catalog unavailable
const idOK=/^[A-Za-z0-9]{4,90}$/;
const gifURL=id=>idOK.test(id)?'https://media.giphy.com/media/'+encodeURIComponent(id)+'/giphy.gif':'';
function parseLink(link){
 try{
  const url=new URL(String(link).trim());
  if(url.protocol!=='https:')return '';
  if(/^(?:www\.)?giphy\.com$/i.test(url.hostname)){
   const part=url.pathname.split('/').filter(Boolean).pop()||'';
   const candidate=part.split('-').pop()||'';
   return idOK.test(candidate)?candidate:'';
  }
  if(/^(?:media\d*|i)\.giphy\.com$/i.test(url.hostname)){
   const m=url.pathname.match(/\/media\/([a-zA-Z0-9]{4,90})(?:\/|$)/);
   return m?m[1]:'';
  }
 }catch{}
 return '';
}
const elt=(tag,cls)=>{const e=document.createElement(tag);if(cls)e.className=cls;return e;};
function attach(host,{onEmoji,onGif}){
 if(!host)return;
 const root=elt('div','tyc-blog-reaction');
 const row=elt('div','tyc-blog-reaction-row'),panel=elt('div','tyc-blog-reaction-panel');
 panel.hidden=true;
 const emojiBtn=elt('button','tyc-blog-reaction-button');emojiBtn.type='button';emojiBtn.textContent='☺ Emoji';
 const gifBtn=elt('button','tyc-blog-reaction-button');gifBtn.type='button';gifBtn.textContent='GIF';
 row.append(emojiBtn,gifBtn);
 const tabs=elt('div','tyc-blog-reaction-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Emoji or GIF / 이모지 또는 GIF 선택');
 const emojiTab=elt('button'),gifTab=elt('button');
 emojiTab.type=gifTab.type='button';emojiTab.textContent='Emoji / 이모지';gifTab.textContent='Search GIF / GIF 검색';
 emojiTab.setAttribute('role','tab');gifTab.setAttribute('role','tab');
 tabs.append(emojiTab,gifTab);
 const emojiView=elt('div','tyc-blog-emoji-view');emojiView.setAttribute('role','tabpanel');emojiView.setAttribute('aria-label','Emoji search and selection / 이모지 검색');
 const emojiSearch=elt('input','tyc-blog-emoji-search');
 emojiSearch.type='search';emojiSearch.maxLength=64;
 emojiSearch.placeholder='Search emoji / 이모지 검색 (love, 사랑, 운동…)';
 emojiSearch.setAttribute('aria-label','Search emoji in English or Korean');
 const emojiSummary=elt('div','tyc-blog-emoji-summary');
 const emojiGrid=elt('div','tyc-blog-emoji-grid');
 emojiGrid.setAttribute('role','group');emojiGrid.setAttribute('aria-label','Emoji results');
 emojiView.append(emojiSearch,emojiSummary,emojiGrid);
 function renderEmojis(){
  const query=emojiSearch.value.trim();
  const catalog=window.TYC_EmojiCatalog;
  const matches=catalog?.search(query,400)||emojis.filter(e=>!query||e.includes(query)).map(emoji=>({emoji,category:'Popular',english:'',korean:''}));
  emojiSummary.textContent=(query?'Search / 검색 · ':'Emoji / 이모지 · ')+matches.length+' results';
  emojiGrid.replaceChildren();
  if(!matches.length){const empty=elt('p','tyc-blog-emoji-empty');empty.textContent='No matching emojis / 검색 결과가 없습니다.';emojiGrid.append(empty);return;}
  let currentCategory='',section=null;
  for(const item of matches){
   if(item.category!==currentCategory){
    currentCategory=item.category;
    section=elt('section','tyc-blog-emoji-group');
    const heading=elt('div','tyc-blog-emoji-category');heading.textContent=item.category;section.append(heading);
    const entries=elt('div','tyc-blog-emoji-items');section.append(entries);
    emojiGrid.append(section);
   }
   const button=elt('button','tyc-blog-emoji-item');button.type='button';button.textContent=item.emoji;
   button.title=[item.english,item.korean].filter(Boolean).join(' / ')||item.emoji;
   button.setAttribute('aria-label','Insert '+(item.english||item.emoji));
   button.onclick=()=>{onEmoji(item.emoji);hidePanel();};
   section.lastElementChild.append(button);
  }
 }
 emojiSearch.oninput=renderEmojis;
 renderEmojis();
 const gifView=elt('div','tyc-blog-gif-view');gifView.hidden=true;gifView.setAttribute('role','tabpanel');gifView.setAttribute('aria-label','GIF search and selection / GIF 검색');
 const search=elt('input');search.type='search';search.maxLength=70;search.placeholder='Search GIFs… / GIF 검색';
 const results=elt('div','tyc-blog-gif-grid');
 const fallback=elt('div','tyc-blog-gif-fallback');
 const link=elt('input');link.type='url';link.placeholder='Or paste a GIPHY link / GIF 링크 붙여넣기';link.setAttribute('aria-label','GIPHY GIF link');
 const add=elt('button');add.type='button';add.textContent='Insert GIF';
 const feedback=elt('p','tyc-blog-gif-feedback');feedback.setAttribute('role','status');
 const attribution=elt('a','tyc-blog-giphy-credit');attribution.href='https://giphy.com/';attribution.target='_blank';attribution.rel='noopener noreferrer';attribution.textContent='Powered by GIPHY';
 fallback.append(link,add);
 gifView.append(search,results,fallback,feedback,attribution);
 const close=elt('button','tyc-blog-reaction-close');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close picker');
 const top=elt('div','tyc-blog-reaction-top');top.append(document.createTextNode('THE YOUNG CLUB / EXPRESS'),close);
 panel.append(top,tabs,emojiView,gifView);
 root.append(row,panel);host.append(root);

 const ownerDialog=host.closest('dialog');
 function positionFloating(){
  if(!ownerDialog||panel.hidden)return;
  const rect=(mode==='gif'?gifBtn:emojiBtn).getBoundingClientRect();
  const width=Math.min(350,window.innerWidth-24);
  panel.style.width=width+'px';
  panel.style.left=Math.max(12,Math.min(window.innerWidth-width-12,rect.left))+'px';
  const desiredHeight=Math.min(475,Math.max(260,panel.scrollHeight));
  const roomBelow=window.innerHeight-rect.bottom;
  const y=roomBelow>Math.min(desiredHeight,270)+16?rect.bottom+8:rect.top-desiredHeight-8;
  panel.style.top=Math.max(10,Math.min(window.innerHeight-desiredHeight-10,y))+'px';
 }
 function floatPanel(){
  if(ownerDialog&&panel.parentNode!==ownerDialog){
   ownerDialog.append(panel);
   panel.classList.add('tyc-blog-reaction-floating');
  }
  positionFloating();
 }
 function hidePanel(){
  panel.hidden=true;
  if(ownerDialog&&panel.parentNode===ownerDialog){
   panel.classList.remove('tyc-blog-reaction-floating');
   panel.style.removeProperty('width');panel.style.removeProperty('top');panel.style.removeProperty('left');
   root.append(panel);
  }
 }
 if(ownerDialog){
  ownerDialog.addEventListener('scroll',positionFloating,{passive:true});
  window.addEventListener('resize',positionFloating,{passive:true});
 }

 let mode='emoji',timer=null,sequence=0,cache=new Map();
 const toggle=(next)=>{
  if(panel.hidden){panel.hidden=false;setMode(next);floatPanel();}else if(next===mode){hidePanel();}else {setMode(next);positionFloating();}
 };
 function setMode(next){
  mode=next;
  const emojiActive=next==='emoji';
  emojiView.hidden=!emojiActive;gifView.hidden=emojiActive;
  emojiView.setAttribute('aria-hidden',String(!emojiActive));
  gifView.setAttribute('aria-hidden',String(emojiActive));
  emojiTab.setAttribute('aria-selected',String(emojiActive));
  gifTab.setAttribute('aria-selected',String(!emojiActive));
  emojiTab.classList.toggle('active',emojiActive);gifTab.classList.toggle('active',!emojiActive);
  panel.scrollTop=0;
  if(emojiActive){renderEmojis();emojiSearch.focus({preventScroll:true});}
  else search.focus({preventScroll:true});
  positionFloating();
 }
 emojiBtn.onclick=()=>toggle('emoji');gifBtn.onclick=()=>toggle('gif');
 emojiTab.onclick=()=>setMode('emoji');gifTab.onclick=()=>setMode('gif');close.onclick=hidePanel;
 add.onclick=()=>{
  const id=parseLink(link.value);if(!id){feedback.textContent='Please paste a valid GIPHY GIF link.';return;}
  onGif(id);hidePanel();link.value='';feedback.textContent='';
 };
 async function find(){
  const q=search.value.trim();const seq=++sequence;results.replaceChildren();
  if(q.length<2)return;
  if(cache.has(q)){show(cache.get(q));return;}
  results.textContent='Searching GIFs…';
  try{
   const project=String(window.TYC_SUPABASE_URL||'').replace(/\/$/,'');
   const key=window.TYC_SUPABASE_PUBLISHABLE_KEY;
   const res=await fetch(project+'/functions/v1/tyc-blog-giphy-search',{
    method:'POST',headers:{'Content-Type':'application/json','apikey':key},body:JSON.stringify({query:q})
   });
   const json=await res.json().catch(()=>({}));
   if(seq!==sequence)return;
   if(!res.ok||json.error)throw Error(json.error||'Search unavailable');
   const list=Array.isArray(json.results)?json.results:[];
   cache.set(q,list);if(cache.size>25)cache.delete(cache.keys().next().value);
   show(list);feedback.textContent='';
  }catch(err){
   if(seq!==sequence)return;
   results.textContent='GIF search unavailable. Paste a GIPHY link below instead.';
   feedback.textContent=err.message||'Search unavailable';
  }
 }
 function show(items){
  results.replaceChildren();
  if(!items.length){results.textContent='No matching GIFs';return;}
  for(const entry of items){
   if(!idOK.test(entry.id))continue;
   const b=elt('button','tyc-blog-gif-tile');b.type='button';b.title=entry.title||'Select GIF';
   const image=elt('img');image.loading='lazy';image.alt=entry.title||'GIPHY GIF';
   try{
    const u=new URL(entry.preview);
    if(u.protocol==='https:'&&/^(media\d*|i)\.giphy\.com$/i.test(u.hostname))image.src=u.href;
   }catch{}
   b.append(image);b.onclick=()=>{onGif(entry.id);hidePanel()};results.append(b);
  }
 }
 search.oninput=()=>{clearTimeout(timer);timer=setTimeout(find,550)};
 document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!root.contains(e.target)&&!panel.contains(e.target))hidePanel()});
}
function token(id){return idOK.test(id)?'[[tyc-giphy:'+id+']]':'';}
function render(target,message){
 const val=String(message||'');const re=/\[\[tyc-giphy:([a-zA-Z0-9]{4,90})\]\]/g;
 target.replaceChildren();let prev=0,m;
 while((m=re.exec(val))){
  if(m.index>prev)target.append(document.createTextNode(val.slice(prev,m.index)));
  const img=elt('img','tyc-blog-comment-gif');img.src=gifURL(m[1]);img.alt='GIF from GIPHY';img.loading='lazy';
  target.append(img);prev=re.lastIndex;
 }
 if(prev<val.length)target.append(document.createTextNode(val.slice(prev)));
}
window.TYC_BlogReactions={attach,token,render,gifURL,parseLink};
})();