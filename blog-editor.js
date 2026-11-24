/* Inline PTA BLOG admin editor. Security is enforced by Supabase RLS. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const access=$('blog-admin-controls'),dialog=$('blog-editor-dialog');
 if(!access||!dialog)return;
 const form=$('blog-editor-form'),list=$('blog-editor-list'),msg=$('blog-editor-message'),body=$('blog-editor-body');
 let db=null,admin=false,editing=null,entries=[],busy=false,editingPublished=false;
 const topSave=$('blog-editor-top-save');
 const validImage={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
 const node=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
 const setMessage=(message,error=false)=>{msg.textContent=message;msg.classList.toggle('error',error)};
 const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 let coverUploading=false,coverPreviewObject=null;
 function showCover(url,message,kind='neutral'){
  const state=$('blog-editor-cover-state'),preview=$('blog-editor-cover-preview'),label=$('blog-editor-cover-status'),hint=$('blog-editor-cover-hint');
  if(!state)return;
  state.dataset.state=kind;label.textContent=message;
  hint.textContent=kind==='saved'?'Cover saved to this article. / 게시글 커버에 저장 완료.'
   :kind==='ready'?'Upload finished. Click Publish / Save Draft to save this cover with your story. / 게시글 저장 버튼을 눌러 주세요.'
   :kind==='uploading'?'Uploading image to storage. Keep this editor open. / 이미지 업로드 중입니다.'
   :kind==='error'?'Please try selecting the image again. / 이미지를 다시 선택해 주세요.'
   :'The cover appears only on listing and related story cards, not inside the post. / 커버는 목록과 관련 글 카드에서만 보입니다.';
  if(url){preview.src=url;preview.hidden=false;}
  else{preview.removeAttribute('src');preview.hidden=true;}
 }
 function clearCoverObject(){if(coverPreviewObject){URL.revokeObjectURL(coverPreviewObject);coverPreviewObject=null;}}
 function showStoredCover(){
  clearCoverObject();
  const value=$('blog-editor-cover').value.trim();
  showCover(value,value?'Current cover image / 현재 커버 이미지':'No cover image selected',value?'saved':'neutral');
 }

 function reset(){
  editing=null;editingPublished=false;if(topSave)topSave.hidden=true;form.reset();$('blog-editor-featured').checked=false;setBody('');$('blog-editor-id').value='';$('blog-editor-date').value=today();
  $('blog-editor-heading').textContent='Create a Story';
  $('blog-editor-delete').hidden=true;$('blog-editor-preview').hidden=true;
  list.hidden=true;setMessage('');
  $('blog-editor-cover-image').value='';$('blog-editor-image').value='';showStoredCover();
 }
 function fill(post){
  editing=post.id;editingPublished=!!post.published;if(topSave)topSave.hidden=false;$('blog-editor-id').value=post.id;
  $('blog-editor-title').value=post.title||'';$('blog-editor-date').value=post.date||today();
  const select=$('blog-editor-category');
  if(![...select.options].some(o=>o.value===post.category))select.add(new Option(post.category,post.category));
  select.value=post.category;
  $('blog-editor-summary').value=post.summary||'';
  $('blog-editor-featured').checked=!!post.is_featured;
  $('blog-editor-cover').value=post.cover||'';
  $('blog-editor-cover-image').value='';showStoredCover();
  setBody(post.body||'');
  $('blog-editor-heading').textContent='Edit Existing Story';
  $('blog-editor-delete').hidden=false;
  $('blog-editor-preview').hidden=true;list.hidden=true;
  setMessage(post.published?'Editing a published story. Save Draft will temporarily unpublish it.':'This story is currently a draft.');
 }
 const rich=$('blog-editor-rich'), sourceLabel=$('blog-editor-source-label'), sourceToggle=$('blog-editor-source-toggle');
 let editingHtml=false;
 const allowedTags=new Set(['P','DIV','BR','H2','H3','H4','STRONG','B','EM','I','U','S','UL','OL','LI','BLOCKQUOTE','A','IMG','HR','PRE','CODE']);
 const blockedTags=new Set(['SCRIPT','STYLE','IFRAME','SVG','FORM','OBJECT','EMBED','VIDEO','AUDIO','META','LINK','INPUT','BUTTON','TEMPLATE']);
 const escapeHTML=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 function safeLink(raw,image=false){
  try{
   if(!raw)return '';
   const u=new URL(raw,location.href);
   if(!['https:','http:'].includes(u.protocol))return '';
   return u.href;
  }catch{return ''}
 }
 function cleanFragment(html){
  const parsed=new DOMParser().parseFromString(String(html||''),'text/html');
  function clean(item){
   if(item.nodeType===Node.TEXT_NODE)return document.createTextNode(item.textContent);
   if(item.nodeType!==Node.ELEMENT_NODE)return document.createDocumentFragment();
   if(blockedTags.has(item.tagName))return document.createDocumentFragment();
   const tag=allowedTags.has(item.tagName)?item.tagName.toLowerCase():null;
   if(!tag){
    const frag=document.createDocumentFragment();
    for(const c of [...item.childNodes])frag.append(clean(c));
    return frag;
   }
   const out=document.createElement(tag==='div'?'p':tag);
   if(tag==='a'){
    const href=safeLink(item.getAttribute('href'));
    if(href){out.href=href;out.rel='noopener noreferrer';out.target='_blank';}
   }
   if(tag==='img'){
    const src=safeLink(item.getAttribute('src'),true);
    if(!src)return document.createDocumentFragment();
    out.src=src;out.alt=(item.getAttribute('alt')||'').slice(0,180);out.loading='lazy';
   }
   for(const c of [...item.childNodes])out.append(clean(c));
   return out;
  }
  const fragment=document.createDocumentFragment();
  for(const c of [...parsed.body.childNodes])fragment.append(clean(c));
  return fragment;
 }
 function cleanHTML(html){const wrapper=document.createElement('div');wrapper.append(cleanFragment(html));return wrapper.innerHTML;}
 function normalizePlain(raw){
  const value=raw.trim();
  if(!value)return '';
  if(/<(p|h[2-4]|div|img|ul|ol|blockquote|br)\b/i.test(value))return value;
  return value.split(/\n\s*\n/).map(part=>'<p>'+escapeHTML(part).replace(/\n/g,'<br>')+'</p>').join('');
 }
 function setBody(html){
  editingHtml=false;sourceLabel.hidden=true;rich.hidden=false;
  sourceToggle.textContent='HTML 보기';sourceToggle.setAttribute('aria-pressed','false');
  const sanitized=cleanHTML(normalizePlain(String(html||'')));
  rich.replaceChildren(cleanFragment(sanitized));
  body.value=sanitized;
  $('blog-editor-preview').hidden=true;
 }
 function getBody(){
  const html=editingHtml?body.value:rich.innerHTML;
  return cleanHTML(normalizePlain(html));
 }
 function toggleHtml(){
  if(editingHtml){
   const sanitized=getBody();
   rich.replaceChildren(cleanFragment(sanitized));
   body.value=sanitized;
   editingHtml=false;
   rich.hidden=false;sourceLabel.hidden=true;
   sourceToggle.textContent='HTML 보기';sourceToggle.setAttribute('aria-pressed','false');
   rich.focus();
  }else{
   body.value=getBody();
   editingHtml=true;
   rich.hidden=true;sourceLabel.hidden=false;
   sourceToggle.textContent='글 편집기로 돌아가기';sourceToggle.setAttribute('aria-pressed','true');
   body.focus();
  }
  $('blog-editor-preview').hidden=true;
 }
 function editorCommand(command,value){
  if(editingHtml){setMessage('먼저 글 편집기로 돌아간 후 서식을 적용해 주세요.',true);return;}
  rich.focus();
  document.execCommand(command,false,value||null);
 }
 function format(tag){
  const name={strong:'bold',em:'italic',h2:'formatBlock',blockquote:'formatBlock',p:'formatBlock'}[tag];
  if(!name)return;
  editorCommand(name,name==='formatBlock'?tag:null);
 }
 function insertHtml(markup){
  if(editingHtml){
   body.setRangeText(markup,body.selectionStart,body.selectionEnd,'end');
   body.focus();return;
  }
  rich.focus();
  document.execCommand('insertHTML',false,cleanHTML(markup));
 }
 function preview(){
  const slot=$('blog-editor-preview');
  slot.hidden=!slot.hidden;
  if(!slot.hidden)slot.replaceChildren(cleanFragment(getBody()));
 }
 function insertLink(){
  if(editingHtml){setMessage('먼저 글 편집기로 돌아가 링크를 추가해 주세요.',true);return;}
  const selected=window.getSelection()?.toString()||'';
  const raw=prompt('Paste HTTPS article link');
  if(!raw)return;
  let href='';
  try{const u=new URL(raw);if(u.protocol!=='https:')throw Error('HTTPS only');href=u.href;}
  catch{setMessage('Only HTTPS links are supported.',true);return;}
  rich.focus();
  if(selected)document.execCommand('createLink',false,href);
  else insertHtml('<a href="'+escapeHTML(href)+'">'+escapeHTML(href)+'</a>');
 }
 async function loadEntries(){
  const result=await db.from('tyc_blog_posts').select('id,title,date,category,summary,body,cover,published,is_featured,updated_at,published_order').order('published_order',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false});
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
    .select('id,title,date,category,summary,body,cover,published,is_featured')
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
   label.append(node('small','',(post.is_featured?'★ FEATURED · ':'')+(post.published?'Published':'Draft')+' · '+post.date+' · '+post.category));
   const edit=node('button','','Edit');edit.type='button';edit.onclick=()=>fill(post);
   row.append(label,edit);list.append(row);
  });
 }
 function slug(text){
  const part=text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,54);
  return (part||'pta-story')+'-'+crypto.randomUUID().slice(0,8);
 }
 async function save(published){
  if(!admin||busy)return;
  if(coverUploading){setMessage('Please finish the cover upload before saving. / 커버 이미지 업로드가 끝난 후 저장해 주세요.',true);return;}
  const title=$('blog-editor-title').value.trim(),date=$('blog-editor-date').value,
   summary=$('blog-editor-summary').value.trim(),category=$('blog-editor-category').value,
   content=getBody(),cover=$('blog-editor-cover').value.trim()||null;
  if(title.length<2||!date||!content){setMessage('Title, publication date and article body are required.',true);return}
  if(cover){try{const u=new URL(cover,location.href);if(!['https:','http:'].includes(u.protocol))throw Error('Invalid URL')}catch{setMessage('Cover image must use a valid web URL.',true);return}}
  busy=true;if(topSave)topSave.disabled=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);
  setMessage(published?'Publishing story…':'Saving draft…');
  try{
   const id=editing||slug(title);
   const data={id,title,date,category,summary,body:content,cover,published,is_featured:$('blog-editor-featured').checked,updated_at:new Date().toISOString()};
   const r=editing?
    await db.from('tyc_blog_posts').update(data).eq('id',editing).select('id'):
    await db.from('tyc_blog_posts').insert(data).select('id');
   if(r.error)throw r.error;
   if(!r.data?.length)throw Error('Administrator permission was not granted.');
   editing=id;editingPublished=published;if(topSave)topSave.hidden=false;
   setMessage(published?'Published successfully. The blog will show your story after refresh.':'Draft saved. Only administrators can see the draft.');
   // On publish, open the just-saved story directly. The clean article URL
   // has no ?edit parameter, so the editor cannot automatically reopen.
   if(published){
    dialog.close();
    window.location.assign('post.html?id='+encodeURIComponent(id));
    return;
   }
   // Refresh draft management data without blocking the completed save.
   await loadEntries();
   $('blog-editor-delete').hidden=false;
   $('blog-editor-heading').textContent='Edit Draft';
  }catch(e){setMessage('Save failed: '+(e.message||'Unknown error'),true)}
  finally{busy=false;if(topSave)topSave.disabled=false;form.querySelectorAll('button').forEach(b=>b.disabled=false)}
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
 async function uploadBlogImage(ev,kind){
  if(!admin||busy)return;
  const input=ev.target,file=input.files?.[0];if(!file)return;
  if(!validImage[file.type]||!file.size||file.size>8388608){
   setMessage('Use a JPG, PNG or WebP image smaller than 8 MB.',true);
   if(kind==='cover')showCover(null,'Invalid cover image','error');
   return;
  }
  if(kind==='cover'){
   coverUploading=true;clearCoverObject();
   coverPreviewObject=URL.createObjectURL(file);
   showCover(coverPreviewObject,'Uploading: '+file.name,'uploading');
  }
  const path='articles/'+crypto.randomUUID()+'.'+validImage[file.type];
  setMessage(kind==='cover'?'Uploading cover image: '+file.name+'…':'Uploading body image: '+file.name+'…');
  input.disabled=true;
  try{
   const r=await db.storage.from('tyc-blog').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
   if(r.error)throw r.error;
   const u=db.storage.from('tyc-blog').getPublicUrl(path).data.publicUrl;
   if(!u)throw Error('Upload succeeded, but the image URL was not returned.');
   if(kind==='cover'){
    $('blog-editor-cover').value=u;
    // Editing an existing story? Persist only the cover immediately.
    // This does NOT modify the unpublished edits in the rest of the form.
    if(editing){
     const result=await db.from('tyc_blog_posts').update({cover:u,updated_at:new Date().toISOString()}).eq('id',editing).select('id');
     if(result.error)throw result.error;
     if(!result.data?.length)throw Error('Cover was uploaded but permission to save this story was denied.');
     const inList=entries.find(p=>p.id===editing);if(inList)inList.cover=u;
     showCover(u,'✓ Cover uploaded and saved: '+file.name,'saved');
     setMessage('✓ Cover saved to this article. Refresh the blog listing to see the new cover. / 커버 이미지가 게시글에 저장됐습니다.');
    }else{
     showCover(u,'✓ Cover uploaded: '+file.name,'ready');
     setMessage('✓ Cover uploaded. Click Publish Story or Save Draft to attach it to the new story. / 새 게시글 저장이 필요합니다.');
    }
   }else{
    const safeAlt=file.name.replace(/[<>"&]/g,'').slice(0,100);
    insertHtml('<p><img src="'+u+'" alt="'+safeAlt+'"></p>');
    setMessage('✓ Body image inserted. Click Save / Publish to save the article. / 본문 이미지는 게시글을 저장해야 반영됩니다.');
   }
  }catch(e){
   if(kind==='cover'){
    const url=$('blog-editor-cover').value.trim();
    showCover(url||coverPreviewObject,'Upload/save problem: '+file.name,'error');
   }
   setMessage('Image upload/save failed: '+(e.message||'Unknown error')+'. The selected filename is retained so you can retry.',true);
  }finally{
   input.disabled=false;
   if(kind==='cover'){
    coverUploading=false;
    clearCoverObject();
   }
   // Keep the chosen filename visible. It is reset only when editing another story.
  }
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
  if(requested){
   // Consume this one-time edit intent so reloads don't reopen the dialog.
   const clean=new URL(location.href);
   clean.searchParams.delete('edit');
   history.replaceState(history.state,'',clean.pathname+clean.search+clean.hash);
   editPostById(requested);
  }
  if(window.TYC_BlogReactions){
    window.TYC_BlogReactions.attach(document.querySelector('#blog-editor-dialog .blog-editor-tools'),{
      onEmoji:emoji=>{
       if(editingHtml){body.setRangeText(emoji,body.selectionStart,body.selectionEnd,'end');body.focus();}
       else insertHtml('<span>'+escapeHTML(emoji)+'</span>');
      },
      onGif:id=>{
       const url=window.TYC_BlogReactions.gifURL(id);
       if(url)insertHtml('<p><img src="'+url+'" alt="GIPHY GIF"></p>');
      }
    });
  }
  $('blog-editor-open').onclick=()=>{reset();dialog.showModal()};
  $('blog-editor-manage').onclick=async()=>{reset();dialog.showModal();await manage()};
  $('blog-editor-close').onclick=()=>dialog.close();
  if(topSave)topSave.onclick=()=>{if(!editing||busy)return;form.requestSubmit($(editingPublished?'blog-editor-publish':'blog-editor-save-draft'));};
  $('blog-editor-new').onclick=reset;
  $('blog-editor-delete').onclick=remove;
  $('blog-editor-image').onchange=e=>uploadBlogImage(e,'body');
  $('blog-editor-cover-image').onchange=e=>uploadBlogImage(e,'cover');
  $('blog-editor-cover').addEventListener('change',showStoredCover);
  $('blog-preview-toggle').onclick=preview;
  sourceToggle.onclick=toggleHtml;
  // Preserve text selection when clicking rich-text toolbar buttons.
  document.querySelectorAll('#blog-editor-dialog .blog-editor-tools button').forEach(btn=>{
   btn.addEventListener('mousedown',event=>event.preventDefault());
  });
  rich.addEventListener('paste',event=>{
   event.preventDefault();
   const html=event.clipboardData?.getData('text/html');
   const plain=event.clipboardData?.getData('text/plain')||'';
   if(html)insertHtml(html);
   else editorCommand('insertText',plain);
  });
  rich.addEventListener('drop',event=>event.preventDefault());
  document.querySelectorAll('#blog-editor-dialog [data-wrap]').forEach(b=>b.onclick=()=>format(b.dataset.wrap));
  $('blog-insert-paragraph').onclick=()=>format('p');
  $('blog-insert-link').onclick=insertLink;
  form.onsubmit=e=>{
   e.preventDefault();save(e.submitter?.id==='blog-editor-publish');
  };
  $('blog-editor-date').value=today();
 }
 init().catch(e=>console.warn('Blog manager initialization failed',e));
})();