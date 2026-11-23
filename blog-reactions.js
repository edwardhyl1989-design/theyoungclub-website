/* Blog emoji and GIF toolbar for guest comments and admin article editor. */
(()=>{'use strict';
const emojis=['😀','😁','😂','🤣','😊','😍','🥰','😉','😎','🥳','🥹','😢','😭','🤔','🙌','👏','🙏','👍','👎','🫶','❤️','💚','💛','💕','🔥','⭐','✨','🎉','🎊','💪','🌱','🍀','🥇','🩺','📚','🏥','🧘','🏃','💯','✅'];
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
 const tabs=elt('div','tyc-blog-reaction-tabs');
 const emojiTab=elt('button'),gifTab=elt('button');
 emojiTab.type=gifTab.type='button';emojiTab.textContent='Emoji';gifTab.textContent='Search GIF';
 tabs.append(emojiTab,gifTab);
 const emojiGrid=elt('div','tyc-blog-emoji-grid');
 for(const emoji of emojis){
  const btn=elt('button');btn.type='button';btn.textContent=emoji;btn.setAttribute('aria-label','Insert '+emoji);
  btn.onclick=()=>{onEmoji(emoji);panel.hidden=true;};
  emojiGrid.append(btn);
 }
 const gifView=elt('div','tyc-blog-gif-view');gifView.hidden=true;
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
 panel.append(top,tabs,emojiGrid,gifView);
 root.append(row,panel);host.append(root);
 let mode='emoji',timer=null,sequence=0,cache=new Map();
 const toggle=(next)=>{
  if(panel.hidden){panel.hidden=false;setMode(next);}else if(next===mode){panel.hidden=true;}else setMode(next);
 };
 function setMode(next){
  mode=next;emojiGrid.hidden=next!=='emoji';gifView.hidden=next!=='gif';
  emojiTab.classList.toggle('active',next==='emoji');gifTab.classList.toggle('active',next==='gif');
  if(next==='gif')search.focus();
 }
 emojiBtn.onclick=()=>toggle('emoji');gifBtn.onclick=()=>toggle('gif');
 emojiTab.onclick=()=>setMode('emoji');gifTab.onclick=()=>setMode('gif');close.onclick=()=>{panel.hidden=true};
 add.onclick=()=>{
  const id=parseLink(link.value);if(!id){feedback.textContent='Please paste a valid GIPHY GIF link.';return;}
  onGif(id);panel.hidden=true;link.value='';feedback.textContent='';
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
   b.append(image);b.onclick=()=>{onGif(entry.id);panel.hidden=true};results.append(b);
  }
 }
 search.oninput=()=>{clearTimeout(timer);timer=setTimeout(find,550)};
 document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!root.contains(e.target))panel.hidden=true});
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