/* PTA BLOG contemporary editorial front-end. Supabase posts and the existing view count API. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const postsEl=$('posts'),feature=$('featured-story'),search=$('query'),category=$('category'),categories=$('sidebarCategories'),count=$('journal-result-count');
const knownCategories=['PTA Career','PTA School','License & Exam','Clinical Notes','Life & Updates','Promotions & Announcements'];
const safeText=v=>String(v??'');
const el=(tag,cls,value)=>{
 const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node;
};
let posts=[],views=new Map(),visibleLimit=12;
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
 article.append(el('span','journal-feature-meta',dateText(p.date)));
 feature.append(imageLink,article);
}
function articleCard(p){
 const a=el('a','journal-card');a.href=href(p);
 a.append(picture(p,false));
 const meta=el('span','journal-card-meta'),cat=el('span','',p.category||'PTA BLOG'),date=el('time','',dateText(p.date));date.dateTime=safeText(p.date);meta.append(cat,date);a.append(meta);
 a.append(el('h3','',p.title));
 if(p.summary)a.append(el('p','',p.summary));
 const bottom=el('span','journal-card-bottom');
 bottom.append(el('span','journal-view tyc-view-count tyc-view-count-in-list',window.TYC_Views?.label(views.get(p.id))||'— views'),el('span','journal-cta','READ ↗'));
 a.append(bottom);return a;
}
function render(){
 updateCategories();
 const q=search.value.trim().toLocaleLowerCase(),cat=category.value;
 const filtered=posts.filter(p=>(!cat||p.category===cat)&&(!q||[p.title,p.summary,p.category].map(safeText).join(' ').toLocaleLowerCase().includes(q)));
 count.textContent=filtered.length+' '+(filtered.length===1?'STORY':'STORIES');
 const choice=q?null:(filtered.find(p=>p.category==='PTA School'&&cover(p))||filtered.find(p=>cover(p))||filtered[0]);
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
  posts=data.filter(p=>p&&p.id&&p.title).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  category.replaceChildren(new Option('All categories',''));
  [...new Set([...knownCategories,...posts.map(p=>p.category).filter(Boolean)])].forEach(v=>category.append(new Option(v,v)));
  render();
  if(window.TYC_Views)window.TYC_Views.counts('blog',posts.map(p=>p.id)).then(result=>{views=result;render()}).catch(()=>{});
 })
 .catch(()=>{featuredPost(null);postsEl.replaceChildren(el('p','journal-empty','Could not load articles. Please refresh the page.'));});
}
search.addEventListener('input',()=>{visibleLimit=pageSize;render();});
category.addEventListener('change',()=>{visibleLimit=pageSize;render();});
moreButton.addEventListener('click',()=>{visibleLimit+=pageSize;render();});
init();
})();