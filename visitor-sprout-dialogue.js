/* THE YOUNG CLUB — one shared sprout/visitor-star conversation.
   Reads the number already used to draw daily golden visitor stars.
   No extra visit event or fabricated count is produced here. */
(()=>{'use strict';
 const path=(location.pathname.split('/').filter(Boolean).pop()||'index.html').toLowerCase();
 const page=path.includes('.')?path:path+'.html';
 const starPages=new Set(['index.html','blog.html','post.html','community.html','community-ko.html','community-en.html','pta-news.html','jobs.html','about.html','auth.html','privacy.html','terms.html','admin-analytics.html']);
 if(!starPages.has(page))return;

 function setup(){
  const home=page==='index.html';
  const art=home?document.querySelector('.home-art'):null;
  const brand=home?null:document.querySelector('header.tyc-site-header .tyc-header-brand');
  const holder=home?art:brand?.closest('.tyc-header-inner');
  if(!holder||(!home&&!brand))return;

  // Keep the existing large blog link clickable; only the sprout area starts speaking.
  let trigger=brand;
  let focusTarget=brand;
  if(home){
   focusTarget=art.querySelector('.home-zone.blog');
   if(!focusTarget)return;
   trigger=document.createElement('span');
   trigger.className='tyc-home-sprout-hit';
   trigger.setAttribute('aria-hidden','true');
   focusTarget.append(trigger);
  }

  const bubble=document.createElement('div');
  bubble.className='tyc-sprout-dialogue';
  bubble.setAttribute('aria-hidden','true');
  const glyph=document.createElement('span');
  glyph.className='tyc-sprout-dialogue-star';
  glyph.setAttribute('aria-hidden','true');
  glyph.textContent='✦';
  const line=document.createElement('span');
  line.className='tyc-sprout-dialogue-line';
  bubble.append(glyph,line);
  holder.append(bubble);

  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let hovered=false,focused=false,active=false,session=0;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const current=id=>active&&id===session;

  // The constellation is updated by the site's existing visitor count script.
  // Using it keeps the spoken number identical to the visible star count.
  function dailyCount(){
   const stars=document.querySelector('.tyc-visitor-constellation[data-star-count]');
   if(!stars)return null;
   const raw=stars.getAttribute('data-star-count');
   if(raw===null||raw==='')return null;
   const count=Number(raw);
   return Number.isSafeInteger(count)&&count>=0?count:null;
  }

  async function write(sentence,id){
   if(!current(id))return;
   line.textContent='';
   if(reduced){line.textContent=sentence;return;}
   for(const char of Array.from(sentence)){
    if(!current(id))return;
    line.textContent+=char;
    await sleep(char==='…'?170:char===' '?40:63);
   }
  }

  async function conversation(id){
   await sleep(170);
   if(!current(id))return;
   await write('별이… 몇 개나 떠 있나……',id);
   await sleep(1100);
   if(!current(id))return;

   let count=dailyCount();
   const deadline=Date.now()+4300;
   while(count===null&&Date.now()<deadline&&current(id)){
    await sleep(220);
    count=dailyCount();
   }
   if(!current(id))return;
   const second=count===null?'아직 별을 세는 중이네…':count.toLocaleString('ko-KR')+'개나 떠 있잖아?';
   await write(second,id);
   await sleep(1300);
   if(!current(id))return;
   await write('I wonder how many stars are out there…',id);
   await sleep(1100);
   if(!current(id))return;
   const englishCount=count===null?'Still counting the stars…':'There are '+count.toLocaleString('en-US')+' stars!';
   await write(englishCount,id);
  }

  function reveal(){
   if(active)return;
   active=true;
   const id=++session;
   bubble.classList.add('is-visible');
   if(home)art.classList.add('tyc-sprout-active');
   conversation(id);
  }
  function conceal(){
   if(!active)return;
   active=false;
   ++session;
   bubble.classList.remove('is-visible');
   if(home)art.classList.remove('tyc-sprout-active');
   line.textContent='';
  }
  function sync(){(hovered||focused)?reveal():conceal();}
  if(window.matchMedia('(hover: hover) and (pointer: fine)').matches){
   trigger.addEventListener('pointerenter',()=>{hovered=true;sync();});
   trigger.addEventListener('pointerleave',()=>{hovered=false;sync();});
  }
  focusTarget.addEventListener('focus',()=>{focused=true;sync();});
  focusTarget.addEventListener('blur',()=>{focused=false;sync();});
  window.addEventListener('pagehide',conceal);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
 else setup();
})();
