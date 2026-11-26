(() => {
'use strict';
const language=location.pathname.endsWith('/community-en.html')||new URLSearchParams(location.search).get('lang')==='en'?'en':'ko',EN=language==='en';const board=lang=>lang==='en'?'community-en.html':'community-ko.html';
const list=document.getElementById('publicPreviewList');
const detail=document.getElementById('publicDiscussionDetail');
const alert=document.getElementById('publicDiscussionStatus');
const key=window.TYC_SUPABASE_PUBLISHABLE_KEY;
const project=window.TYC_SUPABASE_URL;
const valid=/^https:\/\/[-\w]+\.supabase\.co\/?$/.test(project||'') && !!key && window.supabase;
const node=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=String(txt);return el;};
const arrowIcon=()=>{const a=node('span','tyc-diagonal-icon');a.setAttribute('aria-hidden','true');return a;};
const setMeta=(property,value)=>{
 let m=document.querySelector('meta[property="'+property+'"]');
 if(!m){m=document.createElement('meta');m.setAttribute('property',property);document.head.append(m);}
 m.content=value;
};
if(!valid){if(list)list.textContent=(EN?"Unable to load public previews.":'공개 미리보기를 불러올 수 없습니다.');if(alert)alert.textContent='Unable to load preview.';return;}
const client=window.supabase.createClient(project,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const path=id=>'discussion.html?id='+encodeURIComponent(id);
if(list){
 const isArchive=list.dataset.mode==='all';
 const formatTitle=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/\*\*/g,'').replace(/\s+/g,' ').trim();
 const formatPreview=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/\*\*/g,'').replace(/\s+/g,' ').trim();
 const dateText=value=>{
  const dt=new Date(value);
  return Number.isNaN(dt.getTime())?'':dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
 };
 async function fetchPublic(){
  const table='pta_topic_public_previews',cols='topic_id,title,category,preview_text,published_at,community_language';
  if(!isArchive){
   const {data,error}=await client.from(table).select(cols).eq('community_language',language).order('published_at',{ascending:false}).limit(3);
   if(error)throw error;return data||[];
  }
  const collected=[];const pageSize=100;
  for(let offset=0;offset<10000;offset+=pageSize){
   const {data,error}=await client.from(table).select(cols).eq('community_language',language).order('published_at',{ascending:false}).range(offset,offset+pageSize-1);
   if(error)throw error;
   collected.push(...(data||[]));
   if(!data||data.length<pageSize)break;
  }
  return collected;
 }
 fetchPublic().then(data=>{
  list.replaceChildren();
  if(!data.length){
   list.append(node('p','community-preview-empty',(EN?"Public conversations will appear here soon.":'아직 공개된 게시글이 없습니다. / Public conversations will appear here soon.')));
   return;
  }
  for(const p of data){
   const row=node('a','community-preview-row');
   row.href=path(p.topic_id);
   const info=node('span','community-preview-info');
   info.append(node('span','community-preview-category',p.category||'DISCUSSION'));
   if(isArchive){
    const d=dateText(p.published_at);
    if(d)info.append(node('span','community-preview-date',d));
   }
   info.append(node('strong','community-preview-title',formatTitle(p.title)));
   if(isArchive){
    info.append(node('span','community-preview-excerpt',formatPreview(p.preview_text)));
   }
   const arrow=node('span','community-preview-arrow');arrow.append(arrowIcon());row.append(info,arrow);
   list.append(row);
  }
 }).catch(error=>{
  console.warn('Public discussions unavailable',error);
  list.replaceChildren(node('p','community-preview-empty',(EN?"Unable to load public discussions. Please try again.":'공개 게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')));
 });
}
if(detail){
 const id=new URLSearchParams(location.search).get('id');
 if(!id||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8a-f][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)){
  if(alert)alert.textContent=(EN?"Invalid discussion link":'Invalid discussion link / 잘못된 게시글 주소입니다.');
  return;
 }
 client.from('pta_topic_public_previews').select('topic_id,title,category,preview_text,published_at,community_language').eq('topic_id',id).maybeSingle().then(({data:p,error})=>{
  if(error||!p){if(alert)alert.textContent=(EN?"This preview is unavailable.":'이 게시글은 비공개이거나 공개 미리보기가 해제되었습니다. / This preview is unavailable.');return;}
  if(alert)alert.hidden=true;
  detail.hidden=false;
  detail.replaceChildren();
  detail.append(node('div','community-public-kicker','THE YOUNG CLUB / PTA COMMUNITY · '+p.category));
  const heading=node('h1','',p.title),para=node('p','community-public-excerpt',p.preview_text);
  const date=new Date(p.published_at);
  detail.append(heading,node('p','community-public-posted','Posted '+(Number.isNaN(date.getTime())?'':date.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}))),para);
  const gate=node('div','community-public-gate');
  gate.append(node('div','community-public-lock','🔒'),node('h2','',(p.community_language==='en'?"Full discussions and replies are members-only.":'전체 게시글과 댓글은 회원 전용입니다.')),node('p','','Verified PTA & SPTA members can read the full discussion and participate. Join our community to continue.'));
  const actions=node('div','community-public-actions');
  const signup=node('a','community-public-button',(p.community_language==='en'?"Sign Up":'Sign Up / 회원가입'));signup.href='auth.html?next='+board(p.community_language)+'&mode=signup&topic='+encodeURIComponent(p.topic_id);
  const login=node('a','community-public-secondary',(p.community_language==='en'?"Log In":'Log In / 로그인'));login.href='auth.html?next='+board(p.community_language)+'&topic='+encodeURIComponent(p.topic_id);
  const full=node('a','community-public-secondary','Approved member? Read full discussion');full.append(arrowIcon());full.href=board(p.community_language)+'?topic='+encodeURIComponent(p.topic_id);
  actions.append(signup,login,full);gate.append(actions);
  const note=node('p','community-gate-note',(p.community_language==='en'?"Already have an account? Log in. New members complete PTA/SPTA verification before access.":'Already have an account? Log in. New members complete PTA/SPTA verification before access. / 기존 계정이 있으면 로그인하세요. 커뮤니티 승인 후 전체 열람이 가능합니다.'));
  gate.append(note);detail.append(gate);
  document.title=p.title+' | PTA Community | THE YOUNG CLUB';
  const m=document.querySelector('meta[name="description"]');if(m)m.content=p.preview_text.slice(0,160);
  const canonicalUrl='https://theyoungclub.com/'+path(p.topic_id);
  setMeta('og:type','article');setMeta('og:site_name','THE YOUNG CLUB');
  setMeta('og:title',p.title+' | PTA Community');
  setMeta('og:description',p.preview_text.slice(0,160));setMeta('og:url',canonicalUrl);
  const schema=document.createElement('script');schema.type='application/ld+json';schema.id='tyc-public-discussion-schema';
  const jsonLd={'@context':'https://schema.org','@type':'WebPage',name:p.title,
    url:canonicalUrl,description:p.preview_text,inLanguage:p.community_language,
    isPartOf:{'@type':'WebSite',name:'THE YOUNG CLUB',url:'https://theyoungclub.com/'}};
  schema.textContent=JSON.stringify(jsonLd).replace(/</g,'\\u003c');document.head.append(schema);
  let canonical=document.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical);}canonical.href='https://theyoungclub.com/'+path(p.topic_id);
 });
}
})();