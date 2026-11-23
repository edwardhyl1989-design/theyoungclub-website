/* Inline PTA Blog Q&A: public accordion, authenticated admins only edit.
   Supabase row security restricts writes, not just the visible form. */
(()=>{'use strict';
const root=document.getElementById('blog-inline-qna');if(!root)return;
const list=document.getElementById('blog-inline-qna-items'),empty=document.getElementById('blog-inline-qna-empty'),controls=document.getElementById('blog-inline-qna-admin'),form=document.getElementById('blog-inline-qna-form'),msg=document.getElementById('blog-inline-qna-message'),cancel=document.getElementById('blog-inline-qna-cancel'),add=document.getElementById('blog-inline-qna-add'),search=document.getElementById('blog-inline-qna-search'),status=document.getElementById('blog-inline-qna-status');
let db=null,admin=false,items=[],editing=null;
const $=id=>document.getElementById(id),note=(text,error=false)=>{msg.textContent=text;msg.classList.toggle('error',error);};
const rich=$('blog-inline-qna-answer');
const allowedTags=new Set(['P','DIV','BR','STRONG','B','EM','I','U','S','H3','BLOCKQUOTE','UL','OL','LI','A','SPAN','FONT']);
const blockedTags=new Set(['SCRIPT','STYLE','IFRAME','SVG','IMG','OBJECT','EMBED','FORM','INPUT','BUTTON','VIDEO','AUDIO','TABLE']);
const fontSet=new Set(['Arial','Georgia','Verdana','Times New Roman','Noto Sans KR']);
const safeText=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function sanitizeHTML(html){
 const parsed=new DOMParser().parseFromString(String(html||''),'text/html');
 function clean(node){
  if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(node.textContent);
  if(node.nodeType!==Node.ELEMENT_NODE)return document.createDocumentFragment();
  if(blockedTags.has(node.tagName))return document.createDocumentFragment();
  const tag=allowedTags.has(node.tagName)?node.tagName.toLowerCase():'span';
  const out=document.createElement(tag==='font'?'span':tag==='div'?'p':tag);
  if(node.tagName==='FONT'){
   const face=node.getAttribute('face');
   if(fontSet.has(face))out.style.fontFamily=face;
   const color=node.getAttribute('color');if(/^#[0-9a-f]{6}$/i.test(color||''))out.style.color=color;
   const size=Number(node.getAttribute('size'));
   if(size>=1&&size<=7)out.style.fontSize=({1:10,2:12,3:14,4:18,5:24,6:30,7:36})[size]+'px';
  }
  const style=node.style;
  if(style){
   const font=style.fontFamily.replace(/["']/g,'').trim();
   if(fontSet.has(font))out.style.fontFamily=font;
   const color=style.color;if(/^#[0-9a-f]{6}$/i.test(color))out.style.color=color;
   else if(/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(color))out.style.color=color;
   const size=style.fontSize;if(/^(1[0-9]|2[0-9]|3[0-6])px$/.test(size))out.style.fontSize=size;
   if(style.fontWeight==='bold'||Number(style.fontWeight)>=600)out.style.fontWeight='bold';
   if(style.fontStyle==='italic')out.style.fontStyle='italic';
   if(style.textDecoration.includes('underline'))out.style.textDecoration='underline';
  }
  if(tag==='a'){try{const url=new URL(node.getAttribute('href')||'',location.href);if(url.protocol==='https:'||url.protocol==='http:'){out.href=url.href;out.rel='noopener noreferrer';out.target='_blank';}}catch{}}
  for(const child of node.childNodes)out.append(clean(child));
  return out;
 }
 const safe=document.createElement('div');for(const node of parsed.body.childNodes)safe.append(clean(node));return safe.innerHTML;
}
function legacyToHTML(answer){
 return String(answer||'').split(/\n\s*\n/).map(part=>{
 const escaped=safeText(part).replace(/&lt;underline&gt;/g,'<u>').replace(/&lt;\/underline&gt;/g,'</u>');
 const decorated=escaped.replace(/\*\*(.+?)\*\*/gs,'<strong>$1</strong>').replace(/\*(.+?)\*/gs,'<em>$1</em>').replace(/\n/g,'<br>');
 return '<p>'+decorated+'</p>';
 }).join('');
}
function toSafeHTML(answer){
 const raw=String(answer||'');
 const isHtml=/^\s*<(?:p|div|h3|ul|ol|blockquote|span|strong|b|font)\b/i.test(raw);
 return sanitizeHTML(isHtml?raw:legacyToHTML(raw));
}
function setAnswer(value){rich.innerHTML=toSafeHTML(value);}
function getAnswer(){return sanitizeHTML(rich.innerHTML).trim();}
function format(cmd,value){rich.focus();document.execCommand(cmd,false,value||null);}
document.querySelectorAll('[data-qna-command]').forEach(button=>button.addEventListener('click',()=>format(button.dataset.qnaCommand)));
$('blog-qna-font').addEventListener('change',e=>{if(e.target.value)format('fontName',e.target.value);e.target.value='';});
$('blog-qna-size').addEventListener('change',e=>{if(e.target.value)format('fontSize',e.target.value);e.target.value='';});
$('blog-qna-block').addEventListener('change',e=>{if(e.target.value)format('formatBlock',e.target.value);e.target.value='';});
$('blog-qna-color').addEventListener('input',e=>format('foreColor',e.target.value));
$('blog-qna-insert-link').addEventListener('click',()=>{const url=prompt('Enter the link (https://...)');if(!url)return;try{const u=new URL(url);if(!['http:','https:'].includes(u.protocol))throw Error('Invalid protocol');format('createLink',u.href);}catch{alert('Please enter a valid http(s) link.');}});
rich.addEventListener('paste',e=>{
 e.preventDefault();const txt=e.clipboardData?.getData('text/plain')||'';document.execCommand('insertText',false,txt);
});
function edit(item){
if(!admin)return;editing=item?.id||null;
$('blog-inline-qna-question').value=item?.question||'';
setAnswer(item?.answer||'');
$('blog-inline-qna-category').value=item?.category||'General';
$('blog-inline-qna-order').value=item?.display_order??0;
$('blog-inline-qna-published').checked=item?.published??true;
form.hidden=false;note('');
$('blog-inline-qna-editor-title').textContent=editing?'EDIT Q&A':'ADD Q&A';
form.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function render(){
list.replaceChildren();
const q=search.value.trim().toLocaleLowerCase();
const shown=items.filter(x=>admin||x.published).filter(x=>!q||[x.question,x.answer,x.category].join(' ').toLocaleLowerCase().includes(q));
status.textContent=shown.length+' '+(shown.length===1?'QUESTION':'QUESTIONS');
for(const x of shown){
const article=document.createElement('article');article.className='blog-qna-row';
const d=document.createElement('details');d.className='blog-qna-details';
const summary=document.createElement('summary');const copy=document.createElement('span');copy.className='blog-qna-question';
const small=document.createElement('small');small.textContent=(x.category||'GENERAL')+(admin&&!x.published?' · DRAFT':'');
const headline=document.createElement('strong');headline.textContent=x.question;copy.append(small,headline);
const symbol=document.createElement('span');symbol.className='blog-qna-symbol';symbol.setAttribute('aria-hidden','true');symbol.textContent='+';
summary.append(copy,symbol);
const answer=document.createElement('div');answer.className='blog-qna-answer';
answer.innerHTML=toSafeHTML(x.answer);
d.append(summary,answer);article.append(d);
if(admin){const manage=document.createElement('div');manage.className='blog-qna-manage';
const b=document.createElement('button');b.type='button';b.textContent='EDIT';b.addEventListener('click',()=>edit(x));
const del=document.createElement('button');del.type='button';del.textContent='DELETE';del.className='danger';
del.addEventListener('click',async()=>{if(!confirm('Delete this Q&A permanently?'))return;del.disabled=true;const {error}=await db.from('tyc_blog_qna').delete().eq('id',x.id);if(error){alert(error.message);del.disabled=false;}else await load();});manage.append(b,del);article.append(manage);}
list.append(article);
}
empty.hidden=shown.length>0;if(!shown.length)empty.textContent=q?'No matching questions. / 검색 결과가 없습니다.': 'Questions and answers will appear here soon. / 질문과 답변을 준비 중입니다.';
}
async function load(){
if(!db)return;const {data,error}=await db.from('tyc_blog_qna').select('id,question,answer,category,display_order,published,created_at').order('display_order',{ascending:true}).order('created_at',{ascending:true});
if(error){console.warn('Q&A read unavailable:',error.message);status.textContent='UNAVAILABLE';empty.hidden=false;empty.textContent='Questions are temporarily unavailable.';return;}
items=data||[];render();
}
async function init(){
if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){status.textContent='UNAVAILABLE';return;}
db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
try{const {data}=await db.auth.getUser();if(data?.user){
const result=await db.from('job_admins').select('user_id').eq('user_id',data.user.id).maybeSingle();
admin=!!result.data&&!result.error;
}}
catch(e){console.warn('Q&A admin check',e);}
controls.hidden=!admin;
await load();
}
add.addEventListener('click',()=>edit(null));
cancel.addEventListener('click',()=>{form.hidden=true;editing=null;note('');});
search.addEventListener('input',render);
form.addEventListener('submit',async e=>{
e.preventDefault();if(!admin||!db)return;
const payload={question:$('blog-inline-qna-question').value.trim(),answer:getAnswer(),category:$('blog-inline-qna-category').value.trim()||'General',display_order:Number($('blog-inline-qna-order').value)||0,published:$('blog-inline-qna-published').checked};
if(!payload.question||!rich.textContent.trim()){note('Both question and answer are required.',true);return;}
const save=$('blog-inline-qna-save');save.disabled=true;note('Saving...');
try{const query=editing?db.from('tyc_blog_qna').update(payload).eq('id',editing):db.from('tyc_blog_qna').insert(payload);const {error}=await query;if(error)throw error;
form.hidden=true;editing=null;await load();}catch(err){note(err.message||'Save failed',true);}finally{save.disabled=false;}
});
init();
})();