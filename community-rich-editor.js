/* THE YOUNG CLUB community rich-text editor.
   Private, members-only images. All stored HTML is sanitized before display.
   Plain-text legacy discussions remain supported. */
(()=>{'use strict';
const BUCKET='tyc-community-images';
const fontList=['Arial','Georgia','Verdana','Times New Roman','Noto Sans KR'];
const tags=new Set(['P','DIV','BR','B','STRONG','I','EM','U','S','H2','H3','BLOCKQUOTE','UL','OL','LI','A','SPAN','FONT','IMG']);
const blocked=new Set(['SCRIPT','STYLE','SVG','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','VIDEO','AUDIO','TEMPLATE','MATH']);
const pathPattern=/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(?:png|jpg|jpeg|webp|gif)$/i;
const giphyRE=/^[A-Za-z0-9]{4,90}$/;
const esc=x=>String(x||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const isRich=x=>/^\s*<(?:p|div|h[23]|ul|ol|blockquote|span|strong|b|img|br)\b/i.test(x||'');
function cleaned(raw){
 // Some visual-editor pastes arrive as escaped HTML inside an ordinary paragraph.
 // Interpret only supported formatting tags, then sanitize all nodes/attributes.
 // Unsafe or unsupported HTML remains text and can never execute as markup.
 const input=String(raw||'').replace(/&lt;(\/?(?:p|div|br|strong|b|em|i|u|h[23]|ul|ol|li|blockquote)\b[^&<>]*?)&gt;/gi,(_,tag)=>'<'+tag+'>');
 const hasMarkup=/<\/?(?:p|div|br|strong|b|em|i|u|h[23]|ul|ol|li|blockquote|img|span)\b/i.test(input);
 if(!isRich(input)&&!hasMarkup){return input.split(/\n\s*\n/).map(s=>'<p>'+esc(s).replace(/\n/g,'<br>')+'</p>').join('');}
 const html=new DOMParser().parseFromString(input,'text/html');
 function node(n){
  if(n.nodeType===3)return document.createTextNode(n.textContent||'');
  if(n.nodeType!==1)return document.createDocumentFragment();
  if(blocked.has(n.tagName))return document.createDocumentFragment();
  const t=tags.has(n.tagName)?n.tagName.toLowerCase():'span';
  if(t==='img'){
   const p=n.getAttribute('data-tyc-path')||'';
   const gif=n.getAttribute('data-tyc-giphy')||'';
   if(!pathPattern.test(p)&&!giphyRE.test(gif))return document.createDocumentFragment();
   const img=document.createElement('img');
   if(pathPattern.test(p))img.dataset.tycPath=p;
   else img.dataset.tycGiphy=gif;
   img.alt=(n.getAttribute('alt')||'Community discussion image').slice(0,160);
   img.className='community-rich-image';img.loading='lazy';return img;
  }
  const el=document.createElement(t==='font'?'span':t==='div'?'p':t);
  if(t==='a'){
   try{const u=new URL(n.getAttribute('href'),location.href);
    if(u.protocol==='https:'||u.protocol==='http:'){el.href=u.href;el.rel='noopener noreferrer';el.target='_blank';}}
   catch{}
  }
  const style=n.style;
  if(t==='font'){
   const face=n.getAttribute('face');if(fontList.includes(face))el.style.fontFamily=face;
   const size=Number(n.getAttribute('size'));if(size>=1&&size<=7)el.style.fontSize=({1:11,2:13,3:15,4:19,5:24,6:30,7:36})[size]+'px';
   const color=n.getAttribute('color');if(/^#[\da-f]{6}$/i.test(color||''))el.style.color=color;
  }
  if(style){
   const f=style.fontFamily.replace(/['"]/g,'').trim();if(fontList.includes(f))el.style.fontFamily=f;
   const size=style.fontSize;if(/^(1[1-9]|2\d|3[0-6])px$/.test(size))el.style.fontSize=size;
   const c=style.color;
   if(/^#[\da-f]{6}$/i.test(c)||/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(c))el.style.color=c;
   if(style.fontWeight==='bold'||Number(style.fontWeight)>=600)el.style.fontWeight='bold';
   if(style.fontStyle==='italic')el.style.fontStyle='italic';
   if(style.textDecoration.includes('underline'))el.style.textDecoration='underline';
  }
  for(const child of n.childNodes)el.append(node(child));
  return el;
 }
 const container=document.createElement('div');
 for(const n of html.body.childNodes)container.append(node(n));
 return container.innerHTML;
}
async function loadImages(container,db){
 for(const image of container.querySelectorAll('img[data-tyc-giphy]')){
  const id=image.dataset.tycGiphy;
  if(giphyRE.test(id))image.src='https://media.giphy.com/media/'+encodeURIComponent(id)+'/giphy.gif';
 }
 const images=[...container.querySelectorAll('img[data-tyc-path]')];
 await Promise.all(images.map(async image=>{
  const path=image.dataset.tycPath;
  if(!pathPattern.test(path))return;
  try{const {data,error}=await db.storage.from(BUCKET).createSignedUrl(path,3600);
   if(error)throw error;if(image.isConnected)image.src=data.signedUrl;
  }catch(e){image.alt='Image unavailable (member access required)';image.classList.add('community-rich-image-unavailable');}
 }));
}
function render(el,body,db){
 el.innerHTML=cleaned(body);
 if(db)loadImages(el,db);
}
function plain(body){
 const d=document.createElement('div');d.innerHTML=cleaned(body);return d.textContent||'';
}
function preview(node,body,db){
 node.replaceChildren();
 const d=document.createElement('div');d.innerHTML=cleaned(body);
 const first=d.querySelector('img[data-tyc-path],img[data-tyc-giphy]');
 if(first){const pic=document.createElement('img');pic.className='community-board-preview-image';pic.alt=first.alt;if(first.dataset.tycPath)pic.dataset.tycPath=first.dataset.tycPath;if(first.dataset.tycGiphy)pic.dataset.tycGiphy=first.dataset.tycGiphy;node.append(pic);if(db)loadImages(node,db);}
 const summary=(d.textContent||'').replace(/\s+/g,' ').trim();
 const p=document.createElement('span');p.className='community-board-preview-text';p.textContent=summary.length>360?summary.slice(0,357)+'…':summary;node.append(p);
}
function mount(host,initial,db,user){
 const wrap=document.createElement('div');wrap.className='community-rich-wrap';
 const tools=document.createElement('div');tools.className='community-rich-toolbar';tools.setAttribute('role','toolbar');tools.setAttribute('aria-label','Discussion editor formatting');
 const editor=document.createElement('div');editor.className='community-rich-editable';editor.contentEditable='true';editor.role='textbox';editor.setAttribute('aria-multiline','true');editor.setAttribute('aria-label','Discussion content');editor.dataset.placeholder='Write here… Paste an image (Ctrl+V / Cmd+V) or use + Image to upload.';
 editor.innerHTML=cleaned(initial);
 const source=document.createElement('textarea');
 source.className='community-rich-source';source.setAttribute('aria-label','Edit HTML source');
 source.spellcheck=false;source.hidden=true;
 let sourceMode=false;
 // Safely parse HTML fragments even when they start with ordinary text.
 const cleanSource=value=>cleaned('<div>'+String(value||'')+'</div>');
 const looksLikeLiteralMarkup=text=>/<\/?(?:div|p|br|h[23]|strong|b|em|ul|ol|li|span|blockquote)\b[^>]*>/i.test(text||'');
 const sourceValue=()=>{
  const literal=editor.textContent||'';
  // A prior plain-text paste may have left HTML tags displayed literally.
  return looksLikeLiteralMarkup(literal)&&editor.querySelectorAll('div,p,h2,h3,ul,ol,blockquote').length<2?literal:editor.innerHTML;
 };
 const applySource=()=>{
  const sanitized=cleanSource(source.value);
  editor.innerHTML=sanitized;
  loadImages(editor,db);
 };
 const message=document.createElement('p');message.className='community-rich-hint';message.setAttribute('role','status');message.setAttribute('aria-live','polite');message.textContent='Paste an image with Ctrl+V / Cmd+V, or use + Image. Up to 10 JPG, PNG or WebP images (5 MB each). Images are private to approved members.';
 const toolbarButton=(label,title,cmd)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.onclick=()=>{editor.focus();document.execCommand(cmd,false,null);};tools.append(b);};
 const selector=(label,options,cmd)=>{const s=document.createElement('select');s.title=label;s.setAttribute('aria-label',label);const defaultOpt=document.createElement('option');defaultOpt.value='';defaultOpt.textContent=label;s.append(defaultOpt);for(const [value,text] of options){const o=document.createElement('option');o.value=value;o.textContent=text;s.append(o);}s.onchange=()=>{if(s.value){editor.focus();document.execCommand(cmd,false,s.value);}s.value='';};tools.append(s);};
 selector('Font',fontList.map(f=>[f,f]),'fontName');
 selector('Size',[['2','Small'],['3','Normal'],['4','Large'],['5','XL'],['6','XXL']],'fontSize');
 selector('Paragraph',[['p','Normal'],['h2','Heading'],['h3','Subheading'],['blockquote','Quote']],'formatBlock');
 toolbarButton('B','Bold','bold');toolbarButton('I','Italic','italic');toolbarButton('U','Underline','underline');
 toolbarButton('•','Bulleted list','insertUnorderedList');toolbarButton('1.','Numbered list','insertOrderedList');
 const colorLabel=document.createElement('label');colorLabel.className='community-rich-color';colorLabel.textContent='Color ';
 const color=document.createElement('input');color.type='color';color.value='#193c2a';color.setAttribute('aria-label','Text color');color.oninput=()=>{editor.focus();document.execCommand('foreColor',false,color.value);};colorLabel.append(color);tools.append(colorLabel);
 const link=document.createElement('button');link.type='button';link.textContent='Link';link.onclick=()=>{
 const url=prompt('Enter an https:// link');if(!url)return;
 try{const u=new URL(url);if(!['https:','http:'].includes(u.protocol))throw Error();editor.focus();document.execCommand('createLink',false,u.href);}catch{alert('Enter a valid http(s) URL.');}
 };tools.append(link);
 toolbarButton('Clear','Remove formatting','removeFormat');
 const htmlToggle=document.createElement('button');htmlToggle.type='button';htmlToggle.textContent='HTML';
 htmlToggle.title='Edit HTML source / HTML 코드 직접 수정';htmlToggle.setAttribute('aria-pressed','false');
 htmlToggle.onclick=()=>{
  if(!sourceMode){
   source.value=sourceValue();
   editor.hidden=true;source.hidden=false;sourceMode=true;htmlToggle.textContent='Visual';
   htmlToggle.setAttribute('aria-pressed','true');source.focus();
   message.textContent='HTML 코드 수정 모드입니다. Visual 버튼을 누르면 안전하게 변환되어 표시됩니다. / HTML source editing mode.';
  }else{
   applySource();source.hidden=true;editor.hidden=false;sourceMode=false;
   htmlToggle.textContent='HTML';htmlToggle.setAttribute('aria-pressed','false');editor.focus();
   message.textContent='HTML을 안전하게 변환했습니다. / HTML applied safely.';
  }
 };
 tools.append(htmlToggle);
 const file=document.createElement('input');file.type='file';file.accept='image/png,image/jpeg,image/webp';file.multiple=true;file.hidden=true;
 const upload=document.createElement('button');upload.type='button';upload.textContent='＋ Image';upload.title='Upload images to this discussion';tools.append(upload,file);
 upload.onclick=()=>file.click();
 let busy=false;
 const imageTypes={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
 const imageCount=()=>editor.querySelectorAll('img[data-tyc-path],img[data-tyc-giphy]').length;
 // Insert temporary markers at the exact caret position BEFORE any async upload.
 // Clipboard screenshots, copied photos and file-picker uploads share the same
 // private bucket, file type, 5MB and 10-image validation.
 function pasteMarkers(files){
  editor.focus();
  const selection=window.getSelection();
  let range;
  if(selection&&selection.rangeCount&&editor.contains(selection.anchorNode)){
   range=selection.getRangeAt(0).cloneRange();
  }else{
   range=document.createRange();range.selectNodeContents(editor);range.collapse(false);
  }
  range.deleteContents();
  const markers=[];
  for(const f of files){
   const marker=document.createElement('span');
   marker.className='community-rich-paste-progress';
   marker.textContent='Uploading image…';
   marker.setAttribute('contenteditable','false');
   range.insertNode(marker);
   range.setStartAfter(marker);range.collapse(true);
   markers.push(marker);
  }
  if(selection){selection.removeAllRanges();selection.addRange(range);}
  return markers;
 }
 async function uploadImages(files,markers=null){
  if(busy){message.textContent='Please finish the current image upload before adding more.';return;}
  if(imageCount()+files.length>10){
   message.textContent='Maximum 10 images per discussion. Remove an image before adding more.';
   if(markers)markers.forEach(marker=>marker.remove());
   return;
  }
  busy=true;upload.disabled=true;
  let added=0,errors=[];
  message.textContent='Uploading '+files.length+' image'+(files.length===1?'':'s')+' privately…';
  try{
   for(let i=0;i<files.length;i++){
    const f=files[i],marker=markers?.[i];
    if(!imageTypes[f.type]||!f.size||f.size>5242880){
     errors.push('Only JPG, PNG or WebP images up to 5 MB are supported.');
     if(marker)marker.remove();
     continue;
    }
    try{
     const path=user.id+'/'+crypto.randomUUID()+'.'+imageTypes[f.type];
     const result=await db.storage.from(BUCKET).upload(path,f,{contentType:f.type,upsert:false,cacheControl:'3600'});
     if(result.error)throw result.error;
     const img=document.createElement('img');
     img.dataset.tycPath=path;img.className='community-rich-image';
     img.alt=(f.name||'Pasted image').slice(0,130);
     if(marker){
      if(marker.isConnected)marker.replaceWith(img);
     }else{
      const paragraph=document.createElement('p');paragraph.append(img);editor.append(paragraph);
     }
     await loadImages(img.parentElement||editor,db);
     added++;
    }catch(error){
     if(marker)marker.remove();
     errors.push('Image upload failed: '+(error?.message||'Please try again.'));
    }
   }
  }finally{
   busy=false;upload.disabled=false;
   message.textContent=errors.length
    ?(added?added+' image(s) added. ':'')+errors.join(' ')
    :added+' image(s) added. Continue writing or publish your discussion.';
  }
 }
 file.onchange=async()=>{
  const chosen=[...file.files];file.value='';
  if(chosen.length)await uploadImages(chosen);
 };
 const reactions=window.TYC_CommunityReactions?.attach({
  host:tools,db,user,
  canAddGif:()=>editor.querySelectorAll('img[data-tyc-path],img[data-tyc-giphy]').length<10,
  onEmoji:emoji=>{editor.focus();document.execCommand('insertText',false,emoji);},
  onGif:path=>{
   if(!pathPattern.test(path)||editor.querySelectorAll('img[data-tyc-path],img[data-tyc-giphy]').length>=10)return;
   editor.focus();
   const html='<p><img data-tyc-path="'+path+'" class="community-rich-image" alt="Community GIF"></p>';
   document.execCommand('insertHTML',false,html);
   loadImages(editor,db);
  },
  onGiphy:id=>{
   if(!giphyRE.test(id)||editor.querySelectorAll('img[data-tyc-path],img[data-tyc-giphy]').length>=10)return;
   editor.focus();
   document.execCommand('insertHTML',false,'<p><img data-tyc-giphy="'+id+'" alt="GIPHY GIF"></p>');
   loadImages(editor,db);
  }
 });
 editor.addEventListener('paste',e=>{
  const clipboard=e.clipboardData;
  // Prefer binary image data, not external <img> HTML or untrusted data URLs.
  // Pasted screenshots/photos are uploaded privately, just like + Image files.
  const images=[...(clipboard?.items||[])]
   .filter(item=>item.kind==='file'&&item.type.startsWith('image/'))
   .map(item=>item.getAsFile()).filter(Boolean);
  if(!images.length){
   images.push(...[...(clipboard?.files||[])].filter(f=>f.type.startsWith('image/')));
  }
  if(images.length){
   e.preventDefault();
   if(busy){message.textContent='Please finish the current upload before pasting another image.';return;}
   if(imageCount()+images.length>10){message.textContent='Maximum 10 images per discussion.';return;}
   const markers=pasteMarkers(images);
   void uploadImages(images,markers);
   return;
  }
  // Plain-text pastes remain text-only: never insert unsafe external HTML.
  e.preventDefault();
  document.execCommand('insertText',false,clipboard?.getData('text/plain')||'');
 });
 editor.addEventListener('drop',e=>{e.preventDefault();message.textContent='Use + Image to upload pictures.';});
 wrap.append(tools,editor,source,message);host.replaceChildren(wrap);
 window.TYC_ImageEditor?.attach(editor);
 loadImages(editor,db);
 return {value:()=>sourceMode?cleanSource(source.value):cleaned(editor.innerHTML),
 plain:()=>{if(!sourceMode)return editor.textContent.trim();const d=document.createElement('div');d.innerHTML=cleanSource(source.value);return d.textContent.trim();},
 busy:()=>busy||!!reactions?.busy(),
 focus:()=>sourceMode?source.focus():editor.focus(),
 set:x=>{sourceMode=false;source.hidden=true;editor.hidden=false;htmlToggle.textContent='HTML';htmlToggle.setAttribute('aria-pressed','false');editor.innerHTML=cleaned(x);loadImages(editor,db)}
 };
}
window.TYC_CommunityRich={mount,render,preview,plain,cleaned};
})();