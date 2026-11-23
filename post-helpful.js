/* THE YOUNG CLUB — simple "Was this helpful?" article feedback.
   No account is required. One stored preference per browser and article. */
(()=>{'use strict';
 const browserKey='tyc-blog-helpful-id-v1';
 let currentArticle=null,working=false,helpful=false,count=0;
 const $=id=>document.getElementById(id);
 function visitorId(){
  try{
   let id=localStorage.getItem(browserKey);
   if(id&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return id;
   id=crypto.randomUUID();
   localStorage.setItem(browserKey,id);
   return id;
  }catch{return crypto.randomUUID?.()||null;}
 }
 let id=null;
 function db(){return window.TYC_BlogData?.db?.()||null;}
 function draw(){
  const btn=$('post-helpful-button'),number=$('post-helpful-count'),message=$('post-helpful-feedback');
  if(!btn||!number)return;
  btn.disabled=working;
  btn.setAttribute('aria-pressed',String(helpful));
  btn.classList.toggle('is-helpful',helpful);
  btn.querySelector('[data-helpful-icon]').textContent=helpful?'♥':'♡';
  btn.querySelector('[data-helpful-label]').textContent=helpful?'Helpful · Thank you!':'This was helpful';
  number.textContent=count.toLocaleString('en-US')+(count===1?' reader found this helpful':' readers found this helpful');
  if(message&&working)message.textContent='Saving…';
 }
 async function load(){
  const client=db(),message=$('post-helpful-feedback');
  if(!client||!id){if(message)message.textContent='Feedback is unavailable right now.';return;}
  try{
   const {data,error}=await client.rpc('tyc_blog_helpful',{p_article_id:currentArticle,p_visitor:id,p_helpful:null});
   if(error)throw error;
   count=Number(data?.count)||0;
   helpful=!!data?.helpful;
   if(message)message.textContent='';
   draw();
  }catch(e){if(message)message.textContent='Unable to load helpful votes.';console.warn('[Blog helpful]',e);}
 }
 async function onVote(){
  if(working||!currentArticle)return;
  const client=db(),message=$('post-helpful-feedback');
  if(!client||!id){if(message)message.textContent='Feedback is unavailable right now.';return;}
  const desired=!helpful;
  working=true;draw();
  try{
   const {data,error}=await client.rpc('tyc_blog_helpful',{p_article_id:currentArticle,p_visitor:id,p_helpful:desired});
   if(error)throw error;
   count=Number(data?.count)||0;helpful=!!data?.helpful;
   if(message)message.textContent=helpful?'Thanks for your feedback! / 도움이 되었다니 기쁩니다.':'Feedback removed. / 선택이 취소되었습니다.';
  }catch(e){
   if(message)message.textContent='Could not save feedback. Please try again. / 저장하지 못했습니다.';
   console.warn('[Blog helpful]',e);
  }finally{working=false;draw();}
 }
 function mount(article){
  if(!article)return;
  currentArticle=article;
  helpful=false;count=0;
  id=visitorId();
  const box=$('post-helpful-section');
  if(!box)return;
  box.hidden=false;
  draw();
  const btn=$('post-helpful-button');
  btn.onclick=onVote;
  load();
 }
 document.addEventListener('tyc-post-rendered',event=>mount(event.detail?.id));
})();
