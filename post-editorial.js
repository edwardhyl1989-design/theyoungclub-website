/* THE YOUNG CLUB / Journal article enhancements.
   Progressive enhancement; original content, comments and admin management stay intact. */
(()=>{'use strict';
 const progress=document.getElementById('post-reading-progress');
 const shareIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.8 6.6-4.1m-6.6 6.6 6.6 4.1"/></svg>';
 const linkIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3A5 5 0 0 0 13.46 3.46l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3A5 5 0 0 0 10.54 20.54l1.71-1.71"/></svg>';
 let currentTitle='';
 function notify(message){
  const output=document.getElementById('post-share-message');
  if(output)output.textContent=message;
 }
 async function copyLink(){
  const link=location.href;
  try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard not available');
   await navigator.clipboard.writeText(link);
   notify('Link copied / 링크가 복사되었습니다.');
  }catch{
   // Native share is an alternative if Clipboard API is unavailable.
   try{
    if(navigator.share){await navigator.share({title:currentTitle||document.title,url:link});notify('');}
    else notify('Please copy the URL from your address bar. / 주소창의 링크를 복사해 주세요.');
   }catch(e){if(e?.name!=='AbortError')notify('Sharing unavailable. Please copy the page URL.');}
  }
 }
 async function shareArticle(){
  if(navigator.share){
   try{await navigator.share({title:currentTitle||document.title,url:location.href});return;}
   catch(e){if(e?.name==='AbortError')return;}
  }
  await copyLink();
 }
 function createAction(label,icon,callback){
  const button=document.createElement('button');
  button.type='button';button.className='post-action';
  button.innerHTML=icon;
  const text=document.createElement('span');text.textContent=label;button.append(text);
  button.addEventListener('click',callback);
  return button;
 }
 function buildActions(title){
  currentTitle=title;
  const container=document.getElementById('post-actions');
  if(!container)return;
  container.replaceChildren(
   createAction('SHARE / 공유',shareIcon,shareArticle),
   createAction('COPY LINK / 링크 복사',linkIcon,copyLink)
  );
  updateProgress();
 }
 function updateProgress(){
  if(!progress)return;
  const article=document.querySelector('#post-root .article-body');
  if(!article||!article.getBoundingClientRect){progress.style.width='0%';return;}
  const start=article.getBoundingClientRect().top+window.scrollY-window.innerHeight*.25;
  const end=article.getBoundingClientRect().bottom+window.scrollY-window.innerHeight*.7;
  const distance=Math.max(1,end-start);
  const value=Math.max(0,Math.min(1,(window.scrollY-start)/distance));
  progress.style.width=(value*100).toFixed(2)+'%';
 }
 let pending=false;
 window.addEventListener('scroll',()=>{
  if(pending)return;
  pending=true;
  requestAnimationFrame(()=>{pending=false;updateProgress();});
 },{passive:true});
 window.addEventListener('resize',updateProgress,{passive:true});
 document.addEventListener('tyc-post-rendered',event=>buildActions(event.detail?.title||document.title));
})();
