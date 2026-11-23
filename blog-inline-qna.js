/* Inline PTA Blog Q&A: public accordion, authenticated admins only edit.
   Supabase row security restricts writes, not just the visible form. */
(()=>{'use strict';
const root=document.getElementById('blog-inline-qna');if(!root)return;
const list=document.getElementById('blog-inline-qna-items'),empty=document.getElementById('blog-inline-qna-empty'),controls=document.getElementById('blog-inline-qna-admin'),form=document.getElementById('blog-inline-qna-form'),msg=document.getElementById('blog-inline-qna-message'),cancel=document.getElementById('blog-inline-qna-cancel'),add=document.getElementById('blog-inline-qna-add'),search=document.getElementById('blog-inline-qna-search'),status=document.getElementById('blog-inline-qna-status');
let db=null,admin=false,items=[],editing=null;
const $=id=>document.getElementById(id),note=(text,error=false)=>{msg.textContent=text;msg.classList.toggle('error',error);};
function edit(item){
if(!admin)return;editing=item?.id||null;
$('blog-inline-qna-question').value=item?.question||'';
$('blog-inline-qna-answer').value=item?.answer||'';
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
for(const para of x.answer.split(/\n\s*\n/)){const p=document.createElement('p');p.textContent=para;answer.append(p);}
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
const payload={question:$('blog-inline-qna-question').value.trim(),answer:$('blog-inline-qna-answer').value.trim(),category:$('blog-inline-qna-category').value.trim()||'General',display_order:Number($('blog-inline-qna-order').value)||0,published:$('blog-inline-qna-published').checked};
if(!payload.question||!payload.answer){note('Both question and answer are required.',true);return;}
const save=$('blog-inline-qna-save');save.disabled=true;note('Saving...');
try{const query=editing?db.from('tyc_blog_qna').update(payload).eq('id',editing):db.from('tyc_blog_qna').insert(payload);const {error}=await query;if(error)throw error;
form.hidden=true;editing=null;await load();}catch(err){note(err.message||'Save failed',true);}finally{save.disabled=false;}
});
init();
})();