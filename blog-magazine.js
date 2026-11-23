/* PTA BLOG contemporary editorial front-end. Supabase posts and the existing view count API. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const postsEl=$('posts'),feature=$('featured-story'),search=$('query'),category=$('category'),categories=$('sidebarCategories'),count=$('journal-result-count');
const knownCategories=['PTA Career','PTA School','License & Exam','Clinical Notes','Life & Updates','Promotions & Announcements'];
const safeText=v=>String(v??'');
const el=(tag,cls,value)=>{
 const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node;
};
let posts=[],views=new Map(),helpfulCounts=new Map(),visibleLimit=12,adminReady=!!window.TYC_BlogEditor;
const likeLabel=id=>'♥ '+(helpfulCounts.has(id)?helpfulCounts.get(id).toLocaleString('en-US'):'—')+' helpful';
document.addEventListener('tyc-blog-admin-ready',()=>{adminReady=true;render()});
function manageButton(p){
 const button=el('button','journal-card-manage','✎ MANAGE');
 button.type='button';
 button.setAttribute('aria-label','Manage article: '+p.title);
 button.addEventListener('click',event=>{
  event.preventDefault();event.stopPropagation();
  window.TYC_BlogEditor?.open(p.id);
 });
 return button;
}
const pageSize=12,moreButton=$('journal-load-more'),progress=$('journal-load-progress');
const dateText=d=>{
 const date=new Date(String(d||'')+'T00:00:00');
 return Number.isNaN(date.getTime())?String(d||''):date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
};
function safeImg(src){
 if(!src)return '';
 try{
  const u=new URL(src,location.href);
  return ['https:','http:'].includes(u.protocol)?u.href:'';
 }catch{return '';}
}
function cover(p){
 if(p.cover)return safeImg(p.cover);
 // Articles may contain an inline image even if no separate cover has been set.
 const src=safeText(p.body).match(/<img\b[^>]*\bsrc\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/i);
 return safeImg(src?.[1]||src?.[2]||'');
}
const href=p=>'post.html?id='+encodeURIComponent(p.id);
function picture(p,featured){
 const wrap=el('span',featured?'journal-feature-picture':'journal-card-media');
 const url=cover(p);
 if(url){
  const img=el('img');img.src=url;img.alt='';img.loading=featured?'eager':'lazy';img.decoding='async';
  img.addEventListener('error',()=>{img.remove();placeholder(wrap,featured);},{once:true});
  wrap.append(img);
 }else placeholder(wrap,featured);
 if(featured){
  // Small editorial accents enrich the photo without changing its source.
  const stamp=el('span','journal-feature-stamp','FEATURED / 01');
  const credit=el('span','journal-feature-photo-credit');
  credit.append(el('span','journal-feature-credit-rule'),el('span','', 'THE YOUNG CLUB  /  FIELD NOTES'));
  wrap.append(stamp,credit);
 }
 return wrap;
}
function placeholder(wrap,featured){
 if(wrap.querySelector('.journal-fallback, .journal-card-placeholder'))return;
 const box=el('span',featured?'journal-fallback':'journal-card-placeholder');
 box.append(el(featured?'span':'strong',featured?'journal-fallback-mark':'','TYC'),el('small','',featured?'THE YOUNG CLUB / JOURNAL':'THE YOUNG CLUB'));
 wrap.append(box);
}
function updateCategories(){
 const active=category.value;
 const all=[...new Set([...knownCategories,...posts.map(p=>p.category).filter(Boolean)])];
 categories.replaceChildren();
 const names=['',...all];
 names.forEach(name=>{
  const b=el('button','journal-category');
  b.type='button';b.dataset.value=name;b.setAttribute('aria-pressed',String(active===name));
  if(name===active)b.classList.add('active');
  b.append(document.createTextNode(name||'ALL'));
  b.append(el('span','category-count',String(name?posts.filter(p=>p.category===name).length:posts.length)));
  b.addEventListener('click',()=>{
   category.value=name;
   visibleLimit=pageSize;render();
  });
  categories.append(b);
 });
}
function featuredPost(p){
 feature.replaceChildren();
 if(!p){feature.hidden=true;return;}
 feature.hidden=false;
 const imageLink=el('a');imageLink.href=href(p);imageLink.setAttribute('aria-label','Read '+p.title);imageLink.append(picture(p,true));
 const article=el('div','journal-feature-copy');
 article.append(el('span','journal-overline','FEATURED STORY / '+safeText(p.category||'PTA BLOG')));
 const title=el('h2');const link=el('a','',safeText(p.title));link.href=href(p);title.append(link);article.append(title);
 if(p.summary)article.append(el('p','',p.summary));
 const read=el('a','journal-read','READ THE STORY ↗');read.href=href(p);article.append(read);
 const featuredStats=el('div','journal-feature-stats');
 featuredStats.append(
  el('span','journal-feature-meta',dateText(p.date)),
  el('span','journal-feature-view tyc-view-count',window.TYC_Views?.label(views.get(p.id))||'👁 — views'),
  el('span','journal-feature-like',likeLabel(p.id))
 );
 article.append(featuredStats);
 if(adminReady)article.append(manageButton(p));
 feature.append(imageLink,article);
}
function articleCard(p){
 const a=el('a','journal-card');a.href=href(p);
 a.append(picture(p,false));
 const meta=el('span','journal-card-meta'),cat=el('span','',p.category||'PTA BLOG'),date=el('time','',dateText(p.date));date.dateTime=safeText(p.date);meta.append(cat,date);a.append(meta);
 a.append(el('h3','',p.title));
 if(p.summary)a.append(el('p','',p.summary));
 const bottom=el('span','journal-card-bottom');
 const stats=el('span','journal-card-stats');
 stats.append(
  el('span','journal-view tyc-view-count tyc-view-count-in-list',window.TYC_Views?.label(views.get(p.id))||'👁 — views'),
  el('span','journal-like-count',likeLabel(p.id))
 );
 bottom.append(stats,el('span','journal-cta','READ ↗'));
 a.append(bottom);
 const frame=el('div','journal-card-frame');
 frame.append(a);
 if(adminReady)frame.append(manageButton(p));
 return frame;
}
function render(){
 updateCategories();
 const q=search.value.trim().toLocaleLowerCase(),cat=category.value;
 const filtered=posts.filter(p=>(!cat||p.category===cat)&&(!q||[p.title,p.summary,p.category].map(safeText).join(' ').toLocaleLowerCase().includes(q)));
 count.textContent=filtered.length+' '+(filtered.length===1?'STORY':'STORIES');
 // Editor's Pick is independent of browsing filters: administrator selection
 // takes priority; otherwise show the most recent published story.
 const choice=q?null:(posts.find(p=>p.is_featured===true)||posts[0]||null);
 featuredPost(choice);
 // The featured story is also included in the complete ALL archive.
 const list=filtered;
 postsEl.replaceChildren();
 if(!filtered.length){postsEl.append(el('p','journal-empty',posts.length?'No articles match your search or category.':'No articles yet. Check back soon.'));moreButton.hidden=true;progress.textContent='0 / 0';return;}
 const visible=list.slice(0,visibleLimit);
 visible.forEach(p=>postsEl.append(articleCard(p)));
 progress.textContent='SHOWING '+visible.length+' OF '+list.length+' STORIES';
 moreButton.hidden=visible.length>=list.length;
}
function init(){
 window.TYC_BlogData.all()
 .then(data=>{
  if(!Array.isArray(data))throw Error('Invalid article list');
  posts=data.filter(p=>p&&p.id&&p.title&&p.published!==false).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.created_at||'').localeCompare(String(a.created_at||''))||String(a.id).localeCompare(String(b.id)));
  category.replaceChildren(new Option('All categories',''));
  [...new Set([...knownCategories,...posts.map(p=>p.category).filter(Boolean)])].forEach(v=>category.append(new Option(v,v)));
  render();
  if(window.TYC_Views)window.TYC_Views.counts('blog',posts.map(p=>p.id)).then(result=>{views=result;render()}).catch(()=>{});
  // Reuse the existing published-article helpful-vote RPC; it only reads
  // aggregate counts when visitor and helpful are null. No sign-in required.
  // Limit concurrency for larger archives; a failed request leaves a dash.
  const client=window.TYC_BlogData.db();
  if(client){
   const ids=posts.map(p=>p.id);
   (async()=>{
    const results=new Map();
    for(let i=0;i<ids.length;i+=12){
     const batch=await Promise.all(ids.slice(i,i+12).map(async id=>{
      try{
       const {data,error}=await client.rpc('tyc_blog_helpful',{p_article_id:id,p_visitor:null,p_helpful:null});
       return error?null:[id,Math.max(0,Number(data?.count)||0)];
      }catch{return null;}
     }));
     for(const pair of batch)if(pair)results.set(pair[0],pair[1]);
    }
    helpfulCounts=results;render();
   })().catch(()=>{});
  }
 })
 .catch(()=>{featuredPost(null);postsEl.replaceChildren(el('p','journal-empty','Could not load articles. Please refresh the page.'));});
}
search.addEventListener('input',()=>{visibleLimit=pageSize;render();});
category.addEventListener('change',()=>{visibleLimit=pageSize;render();});
moreButton.addEventListener('click',()=>{visibleLimit+=pageSize;render();});
init();
})();