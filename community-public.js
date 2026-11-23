(() => {
'use strict';
const list=document.getElementById('publicPreviewList');
const detail=document.getElementById('publicDiscussionDetail');
const alert=document.getElementById('publicDiscussionStatus');
const key=window.TYC_SUPABASE_PUBLISHABLE_KEY;
const project=window.TYC_SUPABASE_URL;
const valid=/^https:\/\/[-\w]+\.supabase\.co\/?$/.test(project||'') && !!key && window.supabase;
const node=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=String(txt);return el;};
if(!valid){if(list)list.textContent='공개 미리보기를 불러올 수 없습니다.';if(alert)alert.textContent='Unable to load preview.';return;}
const client=window.supabase.createClient(project,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const path=id=>'discussion.html?id='+encodeURIComponent(id);
if(list){
 client.from('pta_topic_public_previews').select('topic_id,title,category,preview_text,published_at').order('published_at',{ascending:false}).limit(30).then(({data,error})=>{
  list.replaceChildren();
  if(error){list.textContent='공개 게시글 미리보기를 불러오지 못했습니다.';return;}
  if(!data?.length){list.append(node('p','', '공개 미리보기가 등록되면 이곳에 표시됩니다. / Public previews will appear here when authors opt in.'));return;}
  for(const p of data){
   const a=node('a','community-public-card');a.href=path(p.topic_id);
   const date=new Date(p.published_at);
   const meta=node('small','',p.category+' · '+(Number.isNaN(date.getTime())?'':date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})));
   a.append(meta,node('strong','',p.title),node('p','',p.preview_text),node('small','','Read preview ↗'));
   list.append(a);
  }
 });
}
if(detail){
 const id=new URLSearchParams(location.search).get('id');
 if(!id||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8a-f][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)){
  if(alert)alert.textContent='Invalid discussion link / 잘못된 게시글 주소입니다.';
  return;
 }
 client.from('pta_topic_public_previews').select('topic_id,title,category,preview_text,published_at').eq('topic_id',id).maybeSingle().then(({data:p,error})=>{
  if(error||!p){if(alert)alert.textContent='이 게시글은 비공개이거나 공개 미리보기가 해제되었습니다. / This preview is unavailable.';return;}
  if(alert)alert.hidden=true;
  detail.hidden=false;
  detail.replaceChildren();
  detail.append(node('div','community-public-kicker','THE YOUNG CLUB / PTA COMMUNITY · '+p.category));
  const heading=node('h1','',p.title),para=node('p','community-public-excerpt',p.preview_text);
  const date=new Date(p.published_at);
  detail.append(heading,node('p','community-public-posted','Posted '+(Number.isNaN(date.getTime())?'':date.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}))),para);
  const gate=node('div','community-public-gate');
  gate.append(node('div','community-public-lock','🔒'),node('h2','','전체 게시글과 댓글은 회원 전용입니다.'),node('p','','Verified PTA & SPTA members can read the full discussion and participate. Join our community to continue.'));
  const actions=node('div','community-public-actions');
  const signup=node('a','community-public-button','Sign Up / 회원가입');signup.href='auth.html?next=community.html&mode=signup&topic='+encodeURIComponent(p.topic_id);
  const login=node('a','community-public-secondary','Log In / 로그인');login.href='auth.html?next=community.html&topic='+encodeURIComponent(p.topic_id);
  const full=node('a','community-public-secondary','Approved member? Read full discussion ↗');full.href='community.html?topic='+encodeURIComponent(p.topic_id);
  actions.append(signup,login,full);gate.append(actions);detail.append(gate);
  document.title=p.title+' | PTA Community | THE YOUNG CLUB';
  const m=document.querySelector('meta[name="description"]');if(m)m.content=p.preview_text.slice(0,160);
  let canonical=document.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical);}canonical.href='https://theyoungclub.com/'+path(p.topic_id);
 });
}
})();