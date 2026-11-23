/* PTA Daily News: bilingual, source-linked, admin-moderated, no generated content in browser. */
(()=>{'use strict';
 const $=(id)=>document.getElementById(id),root=document.querySelector('[data-pta-daily-news]'),archive=document.querySelector('[data-pta-news-archive]');
 if(!root&&!archive)return;
 const host=archive||root,create=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n;};
 const initial=host?.getAttribute('data-language')||(archive?'ko':'en');
 let lang=initial,db=null,items=[],admin=false,visible=20;
 const arrowIcon=()=>{const a=create('span','tyc-diagonal-icon');a.setAttribute('aria-hidden','true');return a;};
 const fmt=d=>d?new Date(d+'T12:00:00').toLocaleDateString(lang==='ko'?'ko-KR':'en-US',{year:'numeric',month:'short',day:'numeric'}):'—';
 function text(v){return String(v||'');}
 function safeUrl(raw){try{const u=new URL(raw);return u.protocol==='https:'?u.href:null}catch{return null}}
 function toggleLanguage(){lang=lang==='ko'?'en':'ko';render();}
 function newsCard(p){
  const card=create('article','pta-news-item');
  const over=create('div','pta-news-item-top');
  over.append(create('span','pta-news-cat',p.category||'PTA NEWS'),create('span','pta-news-date',fmt(p.article_published_at)));
  const title=create('h3','pta-news-title',text(p[lang==='ko'?'title_ko':'title_en']));
  const summary=create('p','pta-news-summary',text(p[lang==='ko'?'summary_ko':'summary_en']));
  const footer=create('div','pta-news-item-footer');
  const link=create('a','pta-news-source',p.source_name);link.append(arrowIcon());
  const href=safeUrl(p.source_url);
  if(href){link.href=href;link.target='_blank';link.rel='noopener noreferrer nofollow';}
  else {link.removeAttribute('href');link.textContent='Source unavailable';}
  footer.append(link);
  if(archive){const collected=create('span','pta-news-collected',(lang==='ko'?'수집 ':'Collected ')+fmt(p.collected_on));footer.append(collected);}
  // Compact community news displays factual headlines and original sources only.
  // This removes legacy AI-translation/disclaimer filler from older news summaries.
  if(archive)card.append(over,title,summary,footer);else card.append(over,title,footer);
  if(admin){
   const controls=create('div','pta-news-admin-actions');
   const hide=create('button','pta-news-admin-btn',p.status==='hidden'?'Publish':'Hide');
   const del=create('button','pta-news-admin-btn delete','Delete');
   hide.type=del.type='button';
   hide.addEventListener('click',async()=>{
    if(!window.confirm(p.status==='hidden'?'Publish this verified article?':'Hide this article from visitors?'))return;
    hide.disabled=true;const {error}=await db.from('pta_daily_news').update({status:p.status==='hidden'?'published':'hidden'}).eq('id',p.id);
    if(error)alert('Update failed: '+error.message);await load();
   });
   del.addEventListener('click',async()=>{
    if(!window.confirm('Permanently delete this article? This cannot be undone.'))return;
    del.disabled=true;const {error}=await db.from('pta_daily_news').delete().eq('id',p.id);
    if(error)alert('Deletion failed: '+error.message);await load();
   });
   controls.append(hide,del);card.append(controls);
  }
  if(p.status==='hidden')card.classList.add('is-hidden');
  return card;
 }
 function renderPanel(el,full){
  // Community news starts closed. Preserve manual open/close state when data reloads.
  const wasOpen=!full&&el.querySelector('.pta-news-collapsible')?.open===true;
  el.replaceChildren();
  let content=el;
  if(!full){
   const details=create('details','pta-news-collapsible');
   details.open=wasOpen;
   const summary=create('summary','pta-news-toggle');
   summary.setAttribute('aria-label','PHYSICAL THERAPY NEWS, expand or collapse');
   summary.append(create('span','pta-news-toggle-title','PHYSICAL THERAPY NEWS'));
   const indicator=create('span','pta-news-toggle-indicator','⌄');
   indicator.setAttribute('aria-hidden','true');summary.append(indicator);
   details.append(summary);
   content=create('div','pta-news-collapse-content');details.append(content);
   el.append(details);
  }else{
   const header=create('div','pta-news-header');
   const top=create('div','pta-news-header-top');
   top.append(create('span','pta-news-kicker','THE YOUNG CLUB / NEWS'));
   const language=create('button','pta-news-language',lang==='ko'?'EN':'한국어');language.type='button';language.setAttribute('aria-label','Switch news language');language.addEventListener('click',toggleLanguage);top.append(language);
   header.append(top);
   header.append(create('h2','','PTA News Archive'));
   header.append(create('p','pta-news-intro',lang==='ko'?'PTA 커리어·면허·시험·교육 관련 주요 업데이트':'PTA career, licensure, exams and education updates'));
   el.append(header);
  }
  const list=create('div','pta-news-list');
  const shown=full?items.slice(0,visible):items.filter(p=>p.status==='published').slice(0,6);
  for(const p of shown)list.append(newsCard(p));
  if(!shown.length)list.append(create('p','pta-news-empty',lang==='ko'?'현재 확인된 새 소식이 없습니다. 출처가 검증된 기사만 게시됩니다.':'No verified news yet. Only source-checked articles are published.'));
  content.append(list);
  if(full){
   if(visible<items.length){const more=create('button','pta-news-more','LOAD MORE STORIES ↓');more.type='button';more.addEventListener('click',()=>{visible+=20;render()});el.append(more)}
  }else if(document.getElementById('news-archive')){
   const a=create('a','pta-news-archive-link',lang==='ko'?'지난 뉴스 모두 보기':'VIEW NEWS ARCHIVE');a.append(arrowIcon());a.href='#news-archive';content.append(a);
  }
 }
 function render(){if(root)renderPanel(root,false);if(archive)renderPanel(archive,true);}
 async function load(){
  if(!db)return;
  let q=db.from('pta_daily_news').select('id,source_url,source_name,title_en,title_ko,summary_en,summary_ko,category,article_published_at,collected_on,status,created_at').order('collected_on',{ascending:false}).order('article_published_at',{ascending:false}).limit(250);
  if(!archive)q=q.eq('status','published');
  const {data,error}=await q;
  if(error){items=[];render();console.warn('News load error',error.message);return;}
  items=data||[];render();
 }
 async function init(){
  if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){render();return;}
  db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
  if(archive){
   const {data}=await db.auth.getUser();
   if(data?.user){
    const r=await db.from('job_admins').select('user_id').eq('user_id',data.user.id).maybeSingle();
    admin=!!r.data&&!r.error;
   }
  }
  await load();
 }
 render();init().catch(e=>{console.warn('PTA news unavailable',e);render()});
})();
