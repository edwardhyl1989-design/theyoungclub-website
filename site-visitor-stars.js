/* THE YOUNG CLUB — date-seeded gold visitor stars.
   One lightweight DOM star per today's unique visitor. Scoped to the dark header
   or the top dark band on HOME. No stars anywhere in SHOP. */
(()=>{'use strict';
const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
const supported=new Set(['index.html','blog.html','post.html','community.html','pta-news.html','jobs.html','about.html']);
if(!supported.has(page))return;

let host=null,selectedHeader=null,count=-1,day='';
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
const hash=str=>{let h=2166136261;for(let i=0;i<str.length;i++)h=Math.imul(h^str.charCodeAt(i),16777619);return h>>>0;};
const rng=seed=>()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
function mount(){
 const target=page==='index.html'?document.querySelector('.home-art'):document.querySelector('header.tyc-site-header');
 if(!target)return false;
 if(target===selectedHeader&&host?.isConnected)return true;
 host?.remove();selectedHeader=target;
 target.classList.add('tyc-has-visitor-stars');
 if(page==='index.html')target.classList.add('tyc-home-star-surface');
 host=document.createElement('div');
 host.className='tyc-visitor-constellation';
 host.setAttribute('aria-hidden','true');
 host.dataset.starCount=String(Math.max(0,count));
 target.append(host);
 return true;
}
function paint(){
 if(!mount())return;
 host.replaceChildren();
 const makeRandom=rng(hash(day||'today'));
 const fragment=document.createDocumentFragment();
 for(let i=0;i<count;i++){
   const star=document.createElement('span');
   const x=2+makeRandom()*96,y=14+makeRandom()*72;
   const sz=3.4+makeRandom()*3,delay=makeRandom()*-8,duration=3.5+makeRandom()*5;
   star.className='tyc-gold-visitor-star';
   star.style.left=x+'%';star.style.top=y+'%';
   star.style.setProperty('--star-size',sz.toFixed(2)+'px');
   star.style.setProperty('--star-delay',delay.toFixed(2)+'s');
   star.style.setProperty('--star-duration',duration.toFixed(2)+'s');
   fragment.append(star);
 }
 host.append(fragment);
 host.dataset.starCount=String(count);
 host.dataset.starDay=day;
}
function update(n,visitDate){
 const next=Math.max(0,Math.floor(Number(n)||0)),key=String(visitDate||'');
 if(next===count&&key===day&&host?.isConnected)return;
 count=next;day=key;paint();
}
window.TYC_VisitorStars={update};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(count>=0)paint();},{once:true});
})();
