/* THE YOUNG CLUB community rich-text editor.
   Private, members-only images. All stored HTML is sanitized before display.
   Plain-text legacy discussions remain supported. */
(()=>{'use strict';
const BUCKET='tyc-community-images';
const fontList=['Arial','Georgia','Verdana','Times New Roman','Noto Sans KR'];
const tags=new Set(['P','DIV','BR','B','STRONG','I','EM','U','S','H2','H3','BLOCKQUOTE','UL','OL','LI','A','SPAN','FONT','IMG']);
const blocked=new Set(['SCRIPT','STYLE','SVG','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','VIDEO','AUDIO','TEMPLATE','MATH']);
const pathPattern=/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(?:png|jpg|jpeg|webp)$/i;
const esc=x=>String(x||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const isRich=x=>/^\s*<(?:p|div|h[23]|ul|ol|blockquote|span|strong|b|img|br)\b/i.test(x||'');
function cleaned(raw){
 const input=String(raw||'');
 if(!isRich(input)){return input.split(/\n\s*\n/).map(s=>'<p>'+esc(s).replace(/\n/g,'<br>')+'</p>').join('');}
 const html=new DOMParser().parseFromString(input,'text/html');
 function node(n){
  if(n.nodeType===3)return document.createTextNode(n.textContent||'');
  if(n.nodeType!==1)return document.createDocumentFragment();
  if(blocked.has(n.tagName))return document.createDocumentFragment();
  const t=tags.has(n.tagName)?n.tagName.toLowerCase():'span';
  if(t==='img'){
   const p=n.getAttribute('data-tyc-path')||'';
   if(!pathPattern.test(p))return document.createDocumentFragment();
   const img=document.createElement('img');
   img.dataset.tycPath=p;img.alt=(n.getAttribute('alt')||'Community discussion image').slice(0,160);
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
 const first=d.querySelector('img[data-tyc-path]');
 if(first){const pic=document.createElement('img');pic.className='community-board-preview-image';pic.alt=first.alt;pic.dataset.tycPath=first.dataset.tycPath;node.append(pic);if(db)loadImages(node,db);}
 const summary=(d.textContent||'').replace(/\s+/g,' ').trim();
 const p=document.createElement('span');p.className='community-board-preview-text';p.textContent=summary.length>360?summary.slice(0,357)+'…':summary;node.append(p);
}
function mount(host,initial,db,user){
 const wrap=document.createElement('div');wrap.className='community-rich-wrap';
 const tools=document.createElement('div');tools.className='community-rich-toolbar';tools.setAttribute('role','toolbar');tools.setAttribute('aria-label','Discussion editor formatting');
 const editor=document.createElement('div');editor.className='community-rich-editable';editor.contentEditable='true';editor.role='textbox';editor.setAttribute('aria-multiline','true');editor.setAttribute('aria-label','Discussion content');editor.dataset.placeholder='Write your discussion. Use the toolbar to format text or insert images.';
 editor.innerHTML=cleaned(initial);
 const message=document.createElement('p');message.className='community-rich-hint';message.textContent='Text style, color, links and up to 10 images (JPG, PNG or WebP, max 5 MB each). Images are visible to approved members only.';
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
 const file=document.createElement('input');file.type='file';file.accept='image/png,image/jpeg,image/webp';file.multiple=true;file.hidden=true;
 const upload=document.createElement('button');upload.type='button';upload.textContent='＋ Image';upload.title='Upload images to this discussion';tools.append(upload,file);
 upload.onclick=()=>file.click();
 let busy=false;
 file.onchange=async()=>{
   const files=[...file.files];file.value='';if(!files.length)return;
   if(editor.querySelectorAll('img[data-tyc-path]').length+files.length>10){message.textContent='Maximum 10 images per discussion.';return;}
   const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
   busy=true;upload.disabled=true;message.textContent='Uploading images privately…';
   for(const f of files){
    if(!types[f.type]||!f.size||f.size>5242880){message.textContent='Use JPG/PNG/WebP files up to 5 MB.';continue;}
    const path=user.id+'/'+crypto.randomUUID()+'.'+types[f.type];
    const result=await db.storage.from(BUCKET).upload(path,f,{contentType:f.type,upsert:false,cacheControl:'3600'});
    if(result.error){message.textContent='Image upload failed: '+result.error.message;continue;}
    const img=document.createElement('img');img.dataset.tycPath=path;img.className='community-rich-image';img.alt=f.name.slice(0,130);
    const p=document.createElement('p');p.append(img);
    editor.append(p);
    await loadImages(p,db);
    message.textContent='Image uploaded. You can continue writing and save the discussion.';
   }
   busy=false;upload.disabled=false;
 };
 editor.addEventListener('paste',e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData?.getData('text/plain')||'');});
 editor.addEventListener('drop',e=>{e.preventDefault();message.textContent='Use + Image to upload pictures.';});
 wrap.append(tools,editor,message);host.replaceChildren(wrap);
 loadImages(editor,db);
 return {value:()=>cleaned(editor.innerHTML),plain:()=>editor.textContent.trim(),busy:()=>busy,focus:()=>editor.focus(),set:x=>{editor.innerHTML=cleaned(x);loadImages(editor,db)}};
}
window.TYC_CommunityRich={mount,render,preview,plain,cleaned};
})();