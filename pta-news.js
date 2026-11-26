/* PTA Daily News: bilingual, source-linked, admin-moderated, no generated content in browser. */
(()=>{'use strict';
 const $=(id)=>document.getElementById(id),root=document.querySelector('[data-pta-daily-news]'),archive=document.querySelector('[data-pta-news-archive]');
 if(!root&&!archive)return;
 const host=archive||root,create=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n;};
 const initial=host?.getAttribute('data-language')||(archive?'ko':'en');
 let lang=initial,db=null,items=[],admin=false,visible=20,loaded=false,loadFailed=false,officialVisible=10,generalVisible=3;
 const arrowIcon=()=>{const a=create('span','tyc-diagonal-icon');a.setAttribute('aria-hidden','true');return a;};
 const fmt=d=>d?new Date(d+'T12:00:00').toLocaleDateString(lang==='ko'?'ko-KR':'en-US',{year:'numeric',month:'short',day:'numeric'}):'—';
 function text(v){return String(v||'');}
 function safeUrl(raw){try{const u=new URL(raw);return u.protocol==='https:'?u.href:null}catch{return null}}
 function toggleLanguage(){lang=lang==='ko'?'en':'ko';render();}
 function newsCard(p,briefingKind){
  const card=create('article','pta-news-item');
  if(briefingKind)card.classList.add('briefing-story','briefing-story--'+briefingKind);
  const over=create('div','pta-news-item-top');
  const tags=create('div','briefing-story-tags');
  if(briefingKind==='apta')tags.append(create('span','briefing-apta-source','APTA'));
  tags.append(create('span','pta-news-cat',p.category||'PTA NEWS'));
  over.append(briefingKind?tags:tags.firstChild,create('span','pta-news-date',fmt(p.article_published_at)));
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
  // PTA News Daily Briefing starts open; community news starts closed.
  // Preserve a visitor's open/closed choice when the feed rerenders.
  const existingDetails=el.querySelector('.pta-news-collapsible:not(.pta-apta-collapsible)');
  const aptaOpen=el.querySelector('.pta-apta-collapsible')?.open??true;
  const split=!full&&!!el.closest('#daily-briefing');
  const isApta=p=>/^(american physical therapy association|apta)$/i.test(String(p.source_name||'').trim())||/^https:\/\/(?:www\.)?apta\.org\//i.test(p.source_url||'');
  const wasOpen=!full&&(existingDetails?existingDetails.open:!!el.closest('#daily-briefing'));
  el.replaceChildren();
  let content=el;
  if(split){
   const apta=create('details','pta-news-collapsible pta-apta-collapsible');apta.open=aptaOpen;
   const heading=create('summary','pta-news-toggle pta-apta-toggle');
   const group=create('span','briefing-section-heading');
   const wordmark=create('span','briefing-apta-wordmark','APTA');
   const labels=create('span','briefing-heading-labels');labels.append(create('span','pta-news-toggle-title','Official APTA News'),create('span','briefing-heading-subtitle','American Physical Therapy Association'));
   group.append(wordmark,labels);heading.append(group,create('span','pta-news-toggle-indicator',''));
   apta.append(heading);
   const body=create('div','pta-news-collapse-content');
   const list=create('div','pta-news-list');
   const allOfficial=items.filter(p=>p.status==='published'&&isApta(p)).sort((a,b)=>String(b.article_published_at).localeCompare(String(a.article_published_at)));const official=allOfficial.slice(0,officialVisible);
   for(const p of official)list.append(newsCard(p,'apta'));
   if(!official.length)list.append(create('p','pta-news-empty',loadFailed?'Unable to load APTA headlines. Please try refreshing the page.':!loaded?'Loading APTA headlines…':'No APTA headlines collected yet. Check the official news page below.'));
   body.append(list);
   if(allOfficial.length>officialVisible){const more=create('button','pta-news-more','SHOW MORE APTA NEWS ('+(allOfficial.length-officialVisible)+' remaining) ↓');more.type='button';more.addEventListener('click',()=>{officialVisible+=10;render();});body.append(more);}
   const officialLink=create('a','pta-news-archive-link','MORE FROM APTA');officialLink.href='https://www.apta.org/news';officialLink.target='_blank';officialLink.rel='noopener noreferrer';officialLink.append(arrowIcon());body.append(officialLink);
   apta.append(body);el.append(apta);
  }
  if(!full){
   const details=create('details','pta-news-collapsible');
   details.open=wasOpen;if(split)details.classList.add('briefing-general-group');
   const summary=create('summary','pta-news-toggle');
   summary.setAttribute('aria-label','PHYSICAL THERAPY NEWS, expand or collapse');
   if(split){const labels=create('span','briefing-heading-labels');labels.append(create('span','pta-news-toggle-title','Physical Therapy News'),create('span','briefing-heading-subtitle','Industry, education & clinical headlines'));summary.append(labels);}else summary.append(create('span','pta-news-toggle-title','PHYSICAL THERAPY NEWS'));
   const indicator=create('span','pta-news-toggle-indicator',split?'':'⌄');
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
  const generalItems=items.filter(p=>p.status==='published'&&(!split||!isApta(p)));const shown=full?items.slice(0,visible):generalItems.slice(0,split?generalVisible:6);
  for(const p of shown)list.append(newsCard(p,split?'general':undefined));
  if(!shown.length)list.append(create('p','pta-news-empty',loadFailed?(lang==='ko'?'뉴스를 불러오지 못했습니다. 새로고침해 주세요.':'Unable to load news. Please try refreshing the page.'):!loaded?(lang==='ko'?'뉴스를 불러오는 중…':'Loading news…'):lang==='ko'?'현재 확인된 새 소식이 없습니다. 출처가 검증된 기사만 게시됩니다.':'No verified news yet. Only source-checked articles are published.'));
  content.append(list);
  if(split&&generalItems.length>generalVisible){const more=create('button','pta-news-more','SHOW MORE NEWS ('+(generalItems.length-generalVisible)+' remaining) ↓');more.type='button';more.addEventListener('click',()=>{generalVisible+=10;render();});content.append(more);}
  if(full){
   if(visible<items.length){const more=create('button','pta-news-more','LOAD MORE STORIES ↓');more.type='button';more.addEventListener('click',()=>{visible+=20;render()});el.append(more)}
  }else if(document.getElementById('news-archive')){
   const a=create('a','pta-news-archive-link',lang==='ko'?'지난 뉴스 모두 보기':'VIEW NEWS ARCHIVE');a.append(arrowIcon());a.href='#news-archive';content.append(a);
  }
 }
 function render(){if(root)renderPanel(root,false);if(archive)renderPanel(archive,true);if(loaded&&root?.closest('#daily-briefing')){const isApta=p=>/^(american physical therapy association|apta)$/i.test(String(p.source_name||'').trim())||/^https:\/\/(?:www\.)?apta\.org\//i.test(p.source_url||'');const published=items.filter(p=>p.status==='published');for(const [key,selector,rows] of [['apta-news','.pta-apta-collapsible',published.filter(isApta)],['general-news','.briefing-general-group',published.filter(p=>!isApta(p))]]){const data=rows.map(p=>[p.id,p.title_en,p.title_ko,p.source_url,p.article_published_at]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));window.TYC_NewsUpdates?.publish(key,root.querySelector(selector),data,window.TYC_NewsUpdates?.recent(rows));}}}
 async function load(){
  if(!db)return;
  let q=db.from('pta_daily_news').select('id,source_url,source_name,title_en,title_ko,summary_en,summary_ko,category,article_published_at,collected_on,status,created_at').order('collected_on',{ascending:false}).order('article_published_at',{ascending:false}).limit(250);
  if(!archive)q=q.eq('status','published');
  const {data,error}=await q;
  if(error){loadFailed=true;render();console.warn('News load error',error.message);return;}
  items=data||[];loaded=true;loadFailed=false;render();
 }
 async function init(){
  if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){loadFailed=true;render();return;}
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
 render();init().catch(e=>{loadFailed=true;console.warn('PTA news unavailable',e);render()});
})();
