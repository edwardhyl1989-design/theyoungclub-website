/* Step 8: PTA Community moderation. All authorizations remain server-side (Supabase RLS). */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const node=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n;};
const message=(str,error=false)=>{const m=$('mod-message');m.textContent=str;m.classList.toggle('error',error);m.hidden=false;};
const fmt=s=>{if(!s)return '—';const d=new Date(s);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});};
const state=s=>s?'Hidden / 숨김':'Visible / 공개';
let db,user,view='reports',topics=[],replies=[],reports=[],names=new Map(),busy=false;
const author=id=>names.get(id)||'PTA Member';
const action=(label,kind,fn)=>{const b=node('button','admin-action '+kind,label);b.type='button';b.disabled=busy;b.addEventListener('click',fn);return b;};
function readablePreview(body){
 const rich=window.TYC_CommunityRich;
 if(!rich)return 'Content preview unavailable. Please refresh.';
 const doc=new DOMParser().parseFromString(rich.cleaned(body),'text/html');
 const parts=[];
 function walk(n){
  if(n.nodeType===3){parts.push(n.textContent||'');return;}
  if(n.nodeType!==1)return;
  if(n.tagName==='IMG'){parts.push(' [Image / 이미지] ');return;}
  if(n.tagName==='BR'){parts.push(' ');return;}
  const block=['P','DIV','H2','H3','LI','UL','OL','BLOCKQUOTE'].includes(n.tagName);
  if(block)parts.push(' ');
  for(const child of n.childNodes)walk(child);
  if(block)parts.push(' ');
 }
 walk(doc.body);
 return parts.join('').replace(/\s+/g,' ').trim();
}
function contentPreview(body){
 const wrap=node('details','mod-rich-preview');
 const summary=node('summary','mod-rich-summary');
 const excerpt=readablePreview(body);
 const snippet=node('span','mod-rich-excerpt',Array.from(excerpt).slice(0,320).join('')+(Array.from(excerpt).length>320?'…':''));
 const label=node('span','mod-rich-toggle','View full content / 본문 보기');
 summary.append(snippet,label);
 const content=node('div','mod-content-body community-rich-content mod-rich-full');
 wrap.append(summary,content);
 wrap.addEventListener('toggle',()=>{
  label.textContent=wrap.open?'Collapse / 접기':'View full content / 본문 보기';
  if(wrap.open&&!content.dataset.rendered){
   if(window.TYC_CommunityRich){window.TYC_CommunityRich.render(content,body,db);content.dataset.rendered='true';}
   else content.textContent='Unable to render content. Please refresh.';
  }
 });
 return wrap;
}
function card(title,sub,body,status){const box=node('article','admin-member'),header=node('div','admin-member-top'),name=node('div');name.append(node('h3','',title),node('p','admin-subtitle',sub));header.append(name,node('span','admin-tag '+(status?'rejected':'approved'),status?'Hidden / 숨김':'Visible / 공개'));box.append(header);if(body)box.append(contentPreview(body));return box;}
function topicLanguage(t){return t?.community_language||'unknown';}
function itemLanguage(x){if(view==='topics')return topicLanguage(x);if(view==='replies')return topicLanguage(x.pta_topics||topics.find(t=>t.id===x.topic_id));const reply=x.reply_id?replies.find(r=>r.id===x.reply_id):null;return topicLanguage(x.pta_topics||x.pta_replies?.pta_topics||topics.find(t=>t.id===(x.topic_id||reply?.topic_id))||reply?.pta_topics);}
function render(){
 const q=$('mod-search').value.toLowerCase().trim(),filter=$('mod-filter').value,root=$('mod-list');root.replaceChildren();
 const language=$('mod-language').value,source=view==='reports'?reports:view==='topics'?topics:replies;
 const filtered=source.filter(x=>{
   let text='';
   if(view==='reports'){
     const target=x.topic_id?topics.find(t=>t.id===x.topic_id):replies.find(r=>r.id===x.reply_id);
     text=[x.reason,x.topic_id?'topic':'reply',target?.title,target?.body,author(target?.author_id)].join(' ');
   }else text=[x.title,x.body,x.category,author(x.author_id)].join(' ');
   const statusOk=view==='reports'?(filter==='all'||x.status===filter):(filter==='all'||(filter==='pending'&&x.is_hidden)||(filter==='resolved'&&!x.is_hidden));
   return (language==='all'||itemLanguage(x)===language)&&statusOk&&(!q||text.toLowerCase().includes(q));
 });
 $('mod-results').textContent=filtered.length+' result(s)';
 $('mod-section-title').textContent=view==='reports'?'Reports / 신고':view==='topics'?'Topics / 게시글':'Replies / 댓글';
 if(!filtered.length){root.append(node('p','admin-empty','표시할 항목이 없습니다. / No matching items.'));return;}
 for(const x of filtered){
   if(view==='reports'){
     const isTopic=!!x.topic_id, target=isTopic?topics.find(t=>t.id===x.topic_id):replies.find(r=>r.id===x.reply_id);
     const box=node('article','admin-member'),head=node('div','admin-member-top'),title=node('div');
     title.append(node('h3','',isTopic?'Reported Topic / 신고된 게시글':'Reported Reply / 신고된 댓글'),node('p','admin-subtitle','Reported '+fmt(x.created_at)+' · '+({ko:'KOR',en:'ENG'}[itemLanguage(x)]||'Unknown language')));
     head.append(title,node('span','admin-tag '+(x.status==='pending'?'pending':'approved'),x.status==='pending'?'Pending':'Resolved'));box.append(head);
     box.append(node('p','mod-context','Content: '+(target?(target.title||'Reply / 댓글'):'Content unavailable / 삭제된 콘텐츠')));if(target?.body)box.append(contentPreview(target.body));
     box.append(node('p','mod-content-body','Reason / 신고 사유: '+x.reason));
     const a=node('div','admin-actions');
     if(x.status==='pending')a.append(action('Mark Resolved / 처리 완료','secondary',()=>resolveReport(x)));
     if(target&&x.status==='pending'&&!target.is_hidden&&!target.is_deleted)a.append(action('Hide Content / 숨기기','warn',()=>changeVisibility(isTopic?'topic':'reply',target,true)));
     box.append(a);root.append(box);continue;
   }
   const isTopic=view==='topics',name=author(x.author_id),box=card(isTopic?x.title:'Reply / 댓글',name+' · '+fmt(x.created_at)+' · '+({ko:'KOR',en:'ENG'}[itemLanguage(x)]||'Unknown language')+(isTopic?' · '+(x.category||''):' · Topic: '+(topics.find(t=>t.id===x.topic_id)?.title||'Unknown')),x.body,x.is_hidden);
   if(x.is_deleted)box.append(node('p','mod-context','Deleted by author / 작성자가 삭제한 게시글'));
   const a=node('div','admin-actions');
   if(isTopic&&x.is_deleted)a.append(action('Restore Deleted Topic / 삭제 복구','secondary',()=>restoreTopic(x)));
   else a.append(action(x.is_hidden?'Unhide / 다시 공개':'Hide / 숨기기',x.is_hidden?'secondary':'warn',()=>changeVisibility(isTopic?'topic':'reply',x,!x.is_hidden)));
   box.append(a);root.append(box);
 }
}
function stats(){
 $('stat-reports').textContent=reports.filter(r=>r.status==='pending').length;
 $('stat-topics').textContent=topics.length;$('stat-hidden-topics').textContent=topics.filter(t=>t.is_hidden).length;
 $('stat-hidden-replies').textContent=replies.filter(r=>r.is_hidden).length;
}
async function load(){
 if(busy)return;
 message('Loading moderation data… / 콘텐츠를 불러오는 중…');
 const [a,b,c,n]=await Promise.all([
 db.from('pta_topics').select('id,author_id,category,title,body,created_at,is_hidden,is_deleted,community_language').order('created_at',{ascending:false}).limit(200),
 db.from('pta_replies').select('id,topic_id,author_id,body,created_at,is_hidden,pta_topics(community_language)').order('created_at',{ascending:false}).limit(200),
 db.from('pta_content_reports').select('id,topic_id,reply_id,reason,status,created_at,pta_topics(community_language),pta_replies(pta_topics(community_language))').order('created_at',{ascending:false}).limit(200),
 db.rpc('pta_approved_display_names')
 ]);
 for(const result of [a,b,c])if(result.error){message('Could not load moderation data: '+result.error.message,true);return;}
 topics=a.data||[];replies=b.data||[];reports=c.data||[];
 if(!n.error)names=new Map((n.data||[]).map(x=>[x.user_id,x.display_name]));
 stats();render();$('mod-message').hidden=true;
 window.dispatchEvent(new Event('tyc-admin-queue-updated'));
}
async function mutate(resultPromise,label){
 busy=true;render();message('Saving… / 저장 중…');
 try{const r=await resultPromise;if(r.error)throw r.error;if(!r.data?.length)throw Error('No row changed; refresh the page.');
 busy=false;await load();message(label);
 }catch(e){busy=false;render();message('Save failed: '+(e.message||'Please retry.'),true);}
}
async function changeVisibility(type,x,hidden){
 if(busy)return;
 if(!confirm(hidden?'콘텐츠를 숨길까요? 일반 회원에게 표시되지 않습니다.':'콘텐츠를 다시 공개할까요?'))return;
 const table=type==='topic'?'pta_topics':'pta_replies';
 await mutate(db.from(table).update({is_hidden:hidden}).eq('id',x.id).eq('is_hidden',!hidden).select('id'),hidden?'숨김 완료 / Content hidden.':'공개 완료 / Content restored.');
}
async function restoreTopic(x){
 if(busy||!confirm('작성자가 삭제한 게시글을 복구할까요?'))return;
 await mutate(db.from('pta_topics').update({is_deleted:false}).eq('id',x.id).eq('is_deleted',true).select('id'),'게시글을 복구했습니다.');
}
async function resolveReport(x){
 if(busy||!confirm('신고를 처리 완료 상태로 변경할까요?'))return;
 await mutate(db.from('pta_content_reports').update({status:'resolved',reviewed_at:new Date().toISOString(),reviewed_by:user.id}).eq('id',x.id).eq('status','pending').select('id'),'신고를 처리 완료했습니다.');
}
async function init(){
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){message('Supabase connection unavailable.',true);return;}
 db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data,error}=await db.auth.getUser();user=data?.user;
 if(error||!user){location.replace('auth.html?next=admin-content.html');return;}
 const check=await db.rpc('tyc_has_staff_scope',{p_scope:'community'});
 if(check.error||!check.data){message('Administrator access required. / 관리자 전용 페이지입니다.',true);return;}
 $('mod-dashboard').hidden=false;
 for(const btn of document.querySelectorAll('[data-view]'))btn.addEventListener('click',()=>{view=btn.dataset.view;for(const other of document.querySelectorAll('[data-view]'))other.setAttribute('aria-pressed',String(other===btn));$('mod-filter').innerHTML=view==='reports'?'<option value="all">All / 전체</option><option value="pending">Pending / 미처리</option><option value="resolved">Resolved / 완료</option>':'<option value="all">All / 전체</option><option value="pending">Hidden / 숨김</option><option value="resolved">Visible / 공개</option>';render();});
 $('mod-search').addEventListener('input',render);$('mod-language').addEventListener('change',render);$('mod-filter').addEventListener('change',render);$('mod-refresh').addEventListener('click',load);
 await load();
}
init().catch(e=>message('Unable to open moderation: '+(e.message||'Unknown error'),true));
})();