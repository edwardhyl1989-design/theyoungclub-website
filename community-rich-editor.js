/* THE YOUNG CLUB community rich-text editor.
   Private, members-only images. All stored HTML is sanitized before display.
   Plain-text legacy discussions remain supported. */
(()=>{'use strict';
const EN=(document.documentElement.dataset.communityLanguage==='en'||/\/community-en(?:\.html)?\/?$/i.test(location.pathname));
const BUCKET='tyc-community-images';
const fontList=['Arial','Noto Sans KR','Georgia','Verdana','Times New Roman','Trebuchet MS','Tahoma','Courier New'];
const tags=new Set(['P','DIV','BR','B','STRONG','I','EM','U','S','H2','H3','BLOCKQUOTE','UL','OL','LI','A','SPAN','FONT','IMG']);
const blocked=new Set(['SCRIPT','STYLE','SVG','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','VIDEO','AUDIO','TEMPLATE','MATH']);
const pathPattern=/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(?:png|jpg|jpeg|webp|avif|gif)$/i;
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
   const mediaAlign=n.getAttribute('data-tyc-align');
   if(['left','center','right'].includes(mediaAlign))img.setAttribute('data-tyc-align',mediaAlign);
   const mediaWidth=n.style.width;
   if(/^\d{2,4}px$/.test(mediaWidth)){
    const pixels=Number.parseInt(mediaWidth,10);
    if(pixels>=80&&pixels<=1600)img.style.width=pixels+'px';
   }
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
   const decoration=style.textDecorationLine||style.textDecoration||'';
   const lines=[];
   if(decoration.includes('underline'))lines.push('underline');
   if(decoration.includes('line-through'))lines.push('line-through');
   if(lines.length)el.style.textDecoration=lines.join(' ');
   const background=style.backgroundColor;
   if(/^#[\da-f]{6}$/i.test(background)||/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(background))el.style.backgroundColor=background;
   if(['p','div','h2','h3','blockquote','ul','ol','li'].includes(t)&&
      ['left','center','right','justify'].includes(style.textAlign))el.style.textAlign=style.textAlign;
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
 const d=document.createElement('div');d.innerHTML=cleaned(body);
 const p=document.createElement('span');p.className='community-board-preview-text community-board-preview-formatted';
 let remaining=600,truncated=false,ellipsisAdded=false,hasImage=false;
 function copy(n){
  if(n.nodeType===3){
   const value=n.textContent||'';if(!value)return null;
   const chars=Array.from(value),part=chars.slice(0,Math.max(0,remaining)).join('');
   remaining-=Array.from(part).length;
   if(chars.length>Array.from(part).length&&chars.slice(Array.from(part).length).join('').trim()){
    truncated=true;
    if(!ellipsisAdded){ellipsisAdded=true;return document.createTextNode(part+'…');}
   }
   return part?document.createTextNode(part):null;
  }
  if(n.nodeType!==1)return null;
  if(n.tagName==='IMG'){
   hasImage=true;
   const pic=document.createElement('img');pic.className='community-board-preview-image';pic.alt=n.alt;
   if(n.dataset.tycPath)pic.dataset.tycPath=n.dataset.tycPath;
   if(n.dataset.tycGiphy)pic.dataset.tycGiphy=n.dataset.tycGiphy;
   pic.loading='lazy';return pic;
  }
  const block=['P','DIV','H2','H3','BLOCKQUOTE','UL','OL','LI'].includes(n.tagName);
  if(remaining>0&&(block||n.tagName==='BR'))remaining=Math.max(0,remaining-1);
  const el=document.createElement(n.tagName==='A'?'span':n.tagName.toLowerCase());
  if(n.tagName==='A')el.className='community-preview-link-text';
  if(n.style.fontWeight)el.style.fontWeight=n.style.fontWeight;
  if(n.style.fontStyle)el.style.fontStyle=n.style.fontStyle;
  if(n.style.textDecoration)el.style.textDecoration=n.style.textDecoration;
  for(const child of n.childNodes){const item=copy(child);if(item)el.append(item);}
  if(!el.childNodes.length&&n.tagName!=='BR')return null;
  return el;
 }
 for(const child of d.childNodes){const item=copy(child);if(item)p.append(item);}
 if(truncated&&!ellipsisAdded)p.append(document.createTextNode('…'));
 if(hasImage)p.classList.add('community-preview-has-media');
 node.append(p);
 // Defer loading private attachments until the member actually opens the preview.
 if(db&&hasImage){
  const trigger=node.parentElement;
  const load=()=>{if(p.dataset.mediaLoaded)return;p.dataset.mediaLoaded='1';loadImages(p,db);};
  if(trigger){trigger.addEventListener('mouseenter',load,{once:true});trigger.addEventListener('focus',load,{once:true});}
  else {queueMicrotask(()=>{const parent=node.parentElement;if(parent){parent.addEventListener('mouseenter',load,{once:true});parent.addEventListener('focus',load,{once:true});if(parent.matches(':hover,:focus-visible'))load();}});}
 }
}
function mount(host,initial,db,user){
 const wrap=document.createElement('div');wrap.className='community-rich-wrap';
 const tools=document.createElement('div');tools.className='community-rich-toolbar';tools.setAttribute('role','toolbar');tools.setAttribute('aria-label','Discussion editor formatting');
 const editor=document.createElement('div');editor.className='community-rich-editable';editor.contentEditable='true';editor.role='textbox';editor.setAttribute('aria-multiline','true');editor.setAttribute('aria-label','Discussion content');editor.dataset.placeholder='Write here… Paste an image (Ctrl+V / Cmd+V) or use + Image to upload.';
 editor.innerHTML=String(initial||'').trim()?cleaned(initial):'';
 editor.tabIndex=0;
 editor.spellcheck=true;
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
 const message=document.createElement('p');message.className='community-rich-hint';message.setAttribute('role','status');message.setAttribute('aria-live','polite');message.textContent='Paste an image with Ctrl+V / Cmd+V, or use + Image. Up to 10 JPG, PNG, WebP or AVIF images (5 MB each). Images are private to approved members.';
 // Keep the selected phrase when a formatting dropdown receives focus.
 let editorRange=null;
 function rememberRange(){
  if(sourceMode)return;
  const sel=window.getSelection();
  if(!sel?.rangeCount)return;
  const range=sel.getRangeAt(0);
  if(editor.contains(range.commonAncestorContainer))editorRange=range.cloneRange();
 }
 function restoreRange(){
  editor.focus({preventScroll:true});
  if(editorRange&&editor.contains(editorRange.commonAncestorContainer)){
   const sel=window.getSelection();
   sel.removeAllRanges();sel.addRange(editorRange);
  }
 }
 editor.addEventListener('mouseup',rememberRange);
 editor.addEventListener('keyup',rememberRange);
 tools.addEventListener('pointerdown',rememberRange,true);
 tools.addEventListener('mousedown',event=>{
  if(event.target.closest('button'))event.preventDefault();
 });
 // Toolbar is in normal document flow above the internally scrolling body.
 // Do not offset it into the editable area when the outer dialog scrolls.
 editor.addEventListener('input',rememberRange);
 editor.addEventListener('focus',()=>{
  if(!editor.innerHTML.trim())editorRange=null;
 });
 function refreshToolbarState(){
  const selection=window.getSelection(),inEditor=selection?.rangeCount&&editor.contains(selection.getRangeAt(0).commonAncestorContainer);
  const media=editor.tycImageAlignment?.current();
  for(const b of tools.querySelectorAll('[data-tyc-command]')){
   const cmd=b.dataset.tycCommand;if(cmd==='removeFormat')continue;
   const align={justifyLeft:'left',justifyCenter:'center',justifyRight:'right'}[cmd];let active=false;
   try{if(media&&align)active=media===align;else if(!media&&inEditor)active=document.queryCommandState(cmd);}catch{}
   b.setAttribute('aria-pressed',String(!!active));
  }
 }
 editor.addEventListener('tyc-image-selection',refreshToolbarState);
 for(const event of ['input','mouseup','keyup'])editor.addEventListener(event,refreshToolbarState);
 const toolbarButton=(label,title,cmd)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.dataset.tycCommand=cmd;b.onclick=()=>{if(sourceMode)return;const align={justifyLeft:'left',justifyCenter:'center',justifyRight:'right'}[cmd];if(align&&editor.tycImageAlignment?.apply(align)){refreshToolbarState();return;}restoreRange();document.execCommand(cmd,false,null);rememberRange();refreshToolbarState();};tools.append(b);};
 const selector=(label,options,cmd)=>{const s=document.createElement('select');s.title=label;s.setAttribute('aria-label',label);const defaultOpt=document.createElement('option');defaultOpt.value='';defaultOpt.textContent=label;s.append(defaultOpt);for(const [value,text] of options){const o=document.createElement('option');o.value=value;o.textContent=text;s.append(o);}s.addEventListener('pointerdown',rememberRange);s.onchange=()=>{if(s.value){if(sourceMode){message.textContent=(EN?"Switch to Visual mode to format selected text.":'Switch to Visual mode to format selected text. / Visual 모드에서 글자 크기를 변경해 주세요.');}else{restoreRange();document.execCommand(cmd,false,s.value);rememberRange();}}s.value='';};tools.append(s);};
 selector('Font',fontList.map(f=>[f,f]),'fontName');
 selector((EN?"Font Size":'Font Size / 글자 크기'),[['1','11px'],['2','13px'],['3','15px'],['4','19px'],['5','24px'],['6','30px'],['7','36px']],'fontSize');
 selector('Paragraph',[['p','Normal'],['h2','Heading'],['h3','Subheading'],['blockquote','Quote']],'formatBlock');
 toolbarButton('B',(EN?"Bold":'Bold / 굵게'),'bold');toolbarButton('I',(EN?"Italic":'Italic / 기울임'),'italic');toolbarButton('U',(EN?"Underline":'Underline / 밑줄'),'underline');toolbarButton('S',(EN?"Strikethrough":'Strikethrough / 취소선'),'strikeThrough');
 toolbarButton('•','Bulleted list','insertUnorderedList');toolbarButton('1.','Numbered list','insertOrderedList');
 function colorPicker(title,initial,command){
  const host=document.createElement('div');
  host.className='tyc-easy-color-host';
  tools.append(host);
  const kind=command==='foreColor'?'text':'highlight';
  const applyColor=color=>{
   if(sourceMode){
    message.textContent=(EN?"Switch to Visual editor for colors.":'Visual 모드에서 색상을 적용해 주세요. / Switch to Visual editor for colors.');
    return false;
   }
   restoreRange();
   document.execCommand('styleWithCSS',false,true);
   document.execCommand(command,false,color);
   document.execCommand('styleWithCSS',false,false);
   rememberRange();
   return true;
  };
  if(window.TYC_ColorPalette){
   window.TYC_ColorPalette.attach(host,{
    kind,label:title,initial,
    onBeforeOpen:rememberRange,
    onApply:applyColor
   });
  }else{
   // Native input fallback if the shared palette script did not load.
   const fallback=document.createElement('input');
   fallback.type='color';fallback.value=initial;
   fallback.setAttribute('aria-label',title);
   fallback.addEventListener('pointerdown',rememberRange);
   fallback.addEventListener('change',()=>applyColor(fallback.value));
   host.append(fallback);
  }
 }
 colorPicker((EN?"Text":'Text / 글자색'),'#193c2a','foreColor');
 colorPicker((EN?"Highlight":'Highlight / 형광펜'),'#fff2a8','hiliteColor');
 toolbarButton('⇤',(EN?"Align left":'Align left / 왼쪽 정렬'),'justifyLeft');
 toolbarButton('≡',(EN?"Center":'Center / 가운데 정렬'),'justifyCenter');
 toolbarButton('⇥',(EN?"Align right":'Align right / 오른쪽 정렬'),'justifyRight');
 const link=document.createElement('button');link.type='button';link.textContent='Link';link.onclick=()=>{
 const url=prompt('Enter an https:// link');if(!url)return;
 try{const u=new URL(url);if(!['https:','http:'].includes(u.protocol))throw Error();restoreRange();document.execCommand('createLink',false,u.href);rememberRange();}catch{alert('Enter a valid http(s) URL.');}
 };tools.append(link);
 toolbarButton('Clear','Remove formatting','removeFormat');
 const htmlToggle=document.createElement('button');htmlToggle.type='button';htmlToggle.textContent='HTML';
 htmlToggle.title=(EN?"Edit HTML source":'Edit HTML source / HTML 코드 직접 수정');htmlToggle.setAttribute('aria-pressed','false');
 htmlToggle.onclick=()=>{
  if(!sourceMode){
   source.value=sourceValue();
   editor.hidden=true;source.hidden=false;sourceMode=true;htmlToggle.textContent='Visual';
   htmlToggle.setAttribute('aria-pressed','true');source.focus();
   message.textContent=(EN?"HTML source editing mode.":'HTML 코드 수정 모드입니다. Visual 버튼을 누르면 안전하게 변환되어 표시됩니다. / HTML source editing mode.');
  }else{
   applySource();source.hidden=true;editor.hidden=false;sourceMode=false;
   htmlToggle.textContent='HTML';htmlToggle.setAttribute('aria-pressed','false');editor.focus();
   message.textContent=(EN?"HTML applied safely.":'HTML을 안전하게 변환했습니다. / HTML applied safely.');
  }
 };
 tools.append(htmlToggle);
 const file=document.createElement('input');file.type='file';file.accept='image/png,image/jpeg,image/webp,image/avif';file.multiple=true;file.hidden=true;
 const upload=document.createElement('button');upload.type='button';upload.textContent='＋ Image';upload.title='Upload images to this discussion';tools.append(upload,file);
 upload.onclick=()=>file.click();
 let busy=false;
 const imageTypes={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
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
     errors.push('Only JPG, PNG, WebP or AVIF images up to 5 MB are supported.');
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
  onEmoji:emoji=>{restoreRange();document.execCommand('insertText',false,emoji);rememberRange();},
  onGif:path=>{
   if(!pathPattern.test(path)||editor.querySelectorAll('img[data-tyc-path],img[data-tyc-giphy]').length>=10)return;
   restoreRange();
   const html='<p><img data-tyc-path="'+path+'" class="community-rich-image" alt="Community GIF"></p>';
   document.execCommand('insertHTML',false,html);
   loadImages(editor,db);
  },
  onGiphy:id=>{
   if(!giphyRE.test(id)||editor.querySelectorAll('img[data-tyc-path],img[data-tyc-giphy]').length>=10)return;
   restoreRange();
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
 set:x=>{sourceMode=false;source.hidden=true;editor.hidden=false;htmlToggle.textContent='HTML';htmlToggle.setAttribute('aria-pressed','false');editorRange=null;editor.innerHTML=String(x||'').trim()?cleaned(x):'';loadImages(editor,db)}
 };
}
window.TYC_CommunityRich={mount,render,preview,plain,cleaned};
})();