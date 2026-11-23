/* Inline PTA BLOG admin editor. Security is enforced by Supabase RLS. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const access=$('blog-admin-controls'),dialog=$('blog-editor-dialog');
 if(!access||!dialog)return;
 const form=$('blog-editor-form'),list=$('blog-editor-list'),msg=$('blog-editor-message'),body=$('blog-editor-body');
 let db=null,admin=false,editing=null,entries=[],busy=false;
 const validImage={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
 const node=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
 const setMessage=(message,error=false)=>{msg.textContent=message;msg.classList.toggle('error',error)};
 const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 function reset(){
  editing=null;form.reset();$('blog-editor-id').value='';$('blog-editor-date').value=today();
  $('blog-editor-heading').textContent='Create a Story';
  $('blog-editor-delete').hidden=true;$('blog-editor-preview').hidden=true;
  list.hidden=true;setMessage('');
 }
 function fill(post){
  editing=post.id;$('blog-editor-id').value=post.id;
  $('blog-editor-title').value=post.title||'';$('blog-editor-date').value=post.date||today();
  const select=$('blog-editor-category');
  if(![...select.options].some(o=>o.value===post.category))select.add(new Option(post.category,post.category));
  select.value=post.category;
  $('blog-editor-summary').value=post.summary||'';
  $('blog-editor-cover').value=post.cover||'';
  body.value=post.body||'';
  $('blog-editor-heading').textContent='Edit Existing Story';
  $('blog-editor-delete').hidden=false;
  $('blog-editor-preview').hidden=true;list.hidden=true;
  setMessage(post.published?'Editing a published story. Save Draft will temporarily unpublish it.':'This story is currently a draft.');
 }
 function insertHtml(text){
  const a=body.selectionStart,b=body.selectionEnd;
  body.setRangeText(text,a,b,'end');body.focus();
 }
 function wrap(tag){
  const start=body.selectionStart,end=body.selectionEnd;
  const selected=body.value.slice(start,end)||'Write here';
  insertHtml('<'+tag+'>'+selected+'</'+tag+'>');
 }
 function preview(){
  const slot=$('blog-editor-preview');
  slot.hidden=!slot.hidden;
  if(slot.hidden)return;
  const doc=new DOMParser().parseFromString(body.value,'text/html');
  const allowed=new Set(['P','BR','H2','H3','H4','STRONG','B','EM','I','U','UL','OL','LI','BLOCKQUOTE','A','IMG','HR','PRE','CODE']);
  function clean(n){
   if(n.nodeType===Node.TEXT_NODE)return document.createTextNode(n.textContent);
   if(n.nodeType!==Node.ELEMENT_NODE)return document.createDocumentFragment();
   if(!allowed.has(n.tagName)){
    const frag=document.createDocumentFragment();
    if(!['SCRIPT','STYLE','IFRAME','SVG','OBJECT','FORM'].includes(n.tagName))for(const c of n.childNodes)frag.append(clean(c));
    return frag;
   }
   const e=document.createElement(n.tagName.toLowerCase());
   if(n.tagName==='A'){try{const u=new URL(n.getAttribute('href'),location.href);if(['https:','http:'].includes(u.protocol)){e.href=u.href;e.target='_blank';e.rel='noopener noreferrer'}}catch{}}
   if(n.tagName==='IMG'){try{const u=new URL(n.getAttribute('src'),location.href);if(!['https:','http:'].includes(u.protocol))return document.createDocumentFragment();e.src=u.href;e.alt=n.getAttribute('alt')||'';e.loading='lazy'}catch{return document.createDocumentFragment();}}
   for(const c of n.childNodes)e.append(clean(c));return e;
  }
  slot.replaceChildren();
  for(const c of doc.body.childNodes)slot.append(clean(c));
 }
 async function loadEntries(){
  const result=await db.from('tyc_blog_posts').select('id,title,date,category,summary,body,cover,published,updated_at').order('date',{ascending:false}).order('created_at',{ascending:false});
  if(result.error){setMessage('Could not load posts: '+result.error.message,true);return false}
  entries=result.data||[];return true;
 }
 async function editPostById(id){
  if(!admin||!id||busy)return;
  reset();
  dialog.showModal();
  setMessage('Loading selected story…');
  try{
   const {data,error}=await db.from('tyc_blog_posts')
    .select('id,title,date,category,summary,body,cover,published')
    .eq('id',id).maybeSingle();
   if(error)throw error;
   if(!data){setMessage('This story could not be found.',true);return;}
   fill(data);
  }catch(error){setMessage('Could not open this story: '+(error.message||'Unknown error'),true);}
 }
 async function manage(){
  if(!admin)return;
  if(!(await loadEntries()))return;
  list.hidden=false;list.replaceChildren(node('h3','', 'Manage Existing Stories ('+entries.length+')'));
  entries.forEach(post=>{
   const row=node('div','blog-editor-entry'),label=node('span','',post.title);
   label.append(node('small','',(post.published?'Published':'Draft')+' · '+post.date+' · '+post.category));
   const edit=node('button','','Edit');edit.type='button';edit.onclick=()=>fill(post);
   row.append(label,edit);list.append(row);
  });
 }
 function slug(text){
  const part=text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,54);
  return (part||'pta-story')+'-'+crypto.randomUUID().slice(0,8);
 }
 function normalizeBody(raw){
  const value=raw.trim();
  if(/<(p|h[2-4]|div|img|ul|ol|blockquote|br)\b/i.test(value))return value;
  const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return value.split(/\n\s*\n/).map(part=>'<p>'+escape(part).replace(/\n/g,'<br>')+'</p>').join('');
 }
 async function save(published){
  if(!admin||busy)return;
  const title=$('blog-editor-title').value.trim(),date=$('blog-editor-date').value,
   summary=$('blog-editor-summary').value.trim(),category=$('blog-editor-category').value,
   content=normalizeBody(body.value),cover=$('blog-editor-cover').value.trim()||null;
  if(title.length<2||!date||!content){setMessage('Title, publication date and article body are required.',true);return}
  if(cover){try{const u=new URL(cover,location.href);if(!['https:','http:'].includes(u.protocol))throw Error('Invalid URL')}catch{setMessage('Cover image must use a valid web URL.',true);return}}
  busy=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);
  setMessage(published?'Publishing story…':'Saving draft…');
  try{
   const id=editing||slug(title);
   const data={id,title,date,category,summary,body:content,cover,published,updated_at:new Date().toISOString()};
   const r=editing?
    await db.from('tyc_blog_posts').update(data).eq('id',editing).select('id'):
    await db.from('tyc_blog_posts').insert(data).select('id');
   if(r.error)throw r.error;
   if(!r.data?.length)throw Error('Administrator permission was not granted.');
   editing=id;
   setMessage(published?'Published successfully. The blog will show your story after refresh.':'Draft saved. Only administrators can see the draft.');
   await loadEntries();
   if(published){dialog.close();window.location.reload();}
   else {$('blog-editor-delete').hidden=false;$('blog-editor-heading').textContent='Edit Draft';}
  }catch(e){setMessage('Save failed: '+(e.message||'Unknown error'),true)}
  finally{busy=false;form.querySelectorAll('button').forEach(b=>b.disabled=false)}
 }
 async function remove(){
  if(!editing||!admin||busy)return;
  if(!confirm('Permanently delete this story? Existing comments and view history may remain associated with its ID. This action cannot be undone.'))return;
  busy=true;try{
   const r=await db.from('tyc_blog_posts').delete().eq('id',editing).select('id');
   if(r.error)throw r.error;
   reset();setMessage('Story deleted.');await loadEntries();
   location.reload();
  }catch(e){setMessage('Delete failed: '+e.message,true)}
  finally{busy=false}
 }
 async function imageUpload(ev){
  if(!admin)return;
  const file=ev.target.files?.[0];if(!file)return;
  if(!validImage[file.type]||!file.size||file.size>8388608){setMessage('Use a JPG, PNG or WebP image smaller than 8 MB.',true);ev.target.value='';return;}
  const path='articles/'+crypto.randomUUID()+'.'+validImage[file.type];
  setMessage('Uploading image…');ev.target.disabled=true;
  try{
   const r=await db.storage.from('tyc-blog').upload(path,file,{contentType:file.type,upsert:false});
   if(r.error)throw r.error;
   const u=db.storage.from('tyc-blog').getPublicUrl(path).data.publicUrl;
   if(!$('blog-editor-cover').value)$('blog-editor-cover').value=u;
   const safeAlt=file.name.replace(/[<>"&]/g,'').slice(0,100);
   insertHtml('<p><img src="'+u+'" alt="'+safeAlt+'"></p>');
   setMessage('Image uploaded and inserted into article. Cover is set if it was empty.');
  }catch(e){setMessage('Image upload failed: '+e.message,true)}
  finally{ev.target.disabled=false;ev.target.value=''}
 }
 async function init(){
  db=window.TYC_BlogData?.db();
  if(!db)return;
  const {data,error}=await db.auth.getUser();
  if(error||!data?.user)return;
  const r=await db.from('job_admins').select('user_id').eq('user_id',data.user.id).maybeSingle();
  if(r.error||!r.data)return;
  admin=true;access.hidden=false;
  // Blog cards use this authenticated editor entrypoint instead of exposing write controls.
  window.TYC_BlogEditor={open:id=>editPostById(id)};
  document.dispatchEvent(new CustomEvent('tyc-blog-admin-ready'));
  const requested=new URLSearchParams(location.search).get('edit');
  if(requested){editPostById(requested);}
  $('blog-editor-open').onclick=()=>{reset();dialog.showModal()};
  $('blog-editor-manage').onclick=async()=>{reset();dialog.showModal();await manage()};
  $('blog-editor-close').onclick=()=>dialog.close();
  $('blog-editor-new').onclick=reset;
  $('blog-editor-delete').onclick=remove;
  $('blog-editor-image').onchange=imageUpload;
  $('blog-preview-toggle').onclick=preview;
  document.querySelectorAll('#blog-editor-dialog [data-wrap]').forEach(b=>b.onclick=()=>wrap(b.dataset.wrap));
  $('blog-insert-paragraph').onclick=()=>wrap('p');
  $('blog-insert-link').onclick=()=>{
   const link=prompt('Paste HTTPS article link');
   if(!link)return;
   try{const u=new URL(link);if(u.protocol!=='https:')throw Error('Only HTTPS');insertHtml('<a href="'+u.href.replace(/"/g,'&quot;')+'">Link text</a>')}
   catch{setMessage('Only HTTPS links are supported.',true)}
  };
  form.onsubmit=e=>{
   e.preventDefault();save(e.submitter?.id==='blog-editor-publish');
  };
  $('blog-editor-date').value=today();
 }
 init().catch(e=>console.warn('Blog manager initialization failed',e));
})();