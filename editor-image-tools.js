/* Image + GIF editing controls shared by Blog and Community.
   UI is outside saved HTML; only safe inline width survives sanitization.
   Supports pointer resizing, numeric width, click-to-move/copy, drag/drop. */
(()=>{'use strict';
 const EN=(document.documentElement.dataset.communityLanguage==='en'||/\/community-en(?:\.html)?\/?$/i.test(location.pathname));
 function attach(editor){
  if(!editor||editor.dataset.tycImageTools)return;
  editor.dataset.tycImageTools='2';
  let selected=null,dragged=null,placement=null,resizeInProgress=false,activeHandle=null;
  const community=editor.classList.contains('community-rich-editable');
  const bar=document.createElement('div');
  bar.className='tyc-image-edit-bar';bar.hidden=true;
  const label=document.createElement('span');
  label.className='tyc-image-edit-label';label.textContent=(EN?"Image / GIF selected":'Image / GIF selected · 사진 / GIF 선택');
  bar.append(label);
  const button=(text,action,title,cls='')=>{
   const b=document.createElement('button');b.type='button';b.textContent=text;b.title=title;
   b.setAttribute('aria-label',title);if(cls)b.className=cls;
   b.addEventListener('mousedown',e=>e.preventDefault());
   b.addEventListener('click',action);bar.append(b);return b;
  };
  const valid=()=>!!selected&&editor.contains(selected)&&!editor.hidden&&editor.isConnected;
  const block=img=>{let n=img;while(n.parentNode&&n.parentNode!==editor)n=n.parentNode;return n;};
  const imageOnly=n=>n===selected||(!n.textContent?.trim()&&n.querySelectorAll?.('img').length===1);
  const notify=()=>editor.dispatchEvent(new Event('input',{bubbles:true}));
  const sizeWrap=document.createElement('label');sizeWrap.className='tyc-image-width-label';
  sizeWrap.textContent=(EN?"Width":'Width / 너비');
  const widthField=document.createElement('input');
  widthField.type='number';widthField.step='any';
  widthField.inputMode='numeric';widthField.setAttribute('aria-label',(EN?"Image width in pixels":'Image width in pixels / 이미지 너비(px)'));
  sizeWrap.append(widthField);bar.append(sizeWrap);
  const owner=editor.closest('dialog')||document.body;
  // Community has four corner and two side handles. The side handles stay
  // usable when a tall image is partially scrolled out of the editor.
  const corners=community?['nw','ne','sw','se','w','e']:['se'];
  const handles=corners.map(corner=>{
   const h=document.createElement('button');h.type='button';
   h.className='tyc-image-resize-handle'+(community?' tyc-community-resize-handle':'');
   h.dataset.corner=corner;h.hidden=true;h.textContent=community?'':'↘';
   const help=EN?'Drag to resize image or GIF':'Drag to resize / 이미지 크기 조절';
   h.setAttribute('aria-label',help+' ('+corner.toUpperCase()+')');h.title=help;
   owner.append(h);return h;
  });
  const hideHandles=()=>handles.forEach(h=>{h.hidden=true});
  let frame=0;
  function updateHandle(){
   frame=0;
   if(!valid()||placement||!selected.getClientRects().length||(owner.tagName==='DIALOG'&&!owner.open)){hideHandles();return;}
   const r=selected.getBoundingClientRect(),v=editor.getBoundingClientRect();
   if(!community){
    const h=handles[0],x=r.right,y=r.bottom;
    const inside=x>v.left+7&&x<v.right+12&&y>v.top+8&&y<v.bottom+12;
    h.hidden=!inside;if(inside){h.style.left=Math.round(x-13)+'px';h.style.top=Math.round(y-13)+'px';}return;
   }
   const d=owner.tagName==='DIALOG'?owner.getBoundingClientRect():{left:0,top:0,right:window.innerWidth,bottom:window.innerHeight};
   const left=Math.max(v.left+3,d.left+3,3),right=Math.min(v.right-3,d.right-3,window.innerWidth-3);
   let top=Math.max(v.top+3,d.top+3,3),bottom=Math.min(v.bottom-3,d.bottom-3,window.innerHeight-3);
   const sticky=owner.querySelector?.('.edit-topic-top,.dialog-heading');
   if(sticky){const sr=sticky.getBoundingClientRect();if(sr.bottom>top&&sr.top<top+10)top=Math.min(bottom,sr.bottom+3);}
   const imageVisible=r.right>left&&r.left<right&&r.bottom>top&&r.top<bottom;
   const mid=(Math.max(r.top,top)+Math.min(r.bottom,bottom))/2;
   for(const h of handles){
    const c=h.dataset.corner,x=c.includes('w')?r.left:r.right;
    const y=c.includes('n')?r.top:c.includes('s')?r.bottom:mid;
    const visible=imageVisible&&x>=left-7&&x<=right+7&&y>=top-4&&y<=bottom+4;
    // Do not hide a handle that currently owns the pointer capture.
    h.hidden=!visible&&h!==activeHandle;
    if(!h.hidden){
     const px=Math.min(right-7,Math.max(left+7,x));
     const py=Math.min(bottom-7,Math.max(top+7,y));
     h.style.left=Math.round(px)+'px';h.style.top=Math.round(py)+'px';
    }
   }
  }
  function queueHandle(){if(!frame)frame=requestAnimationFrame(updateHandle);}
  function clear(){
   if(selected)selected.removeAttribute('data-tyc-image-selected');
   selected=null;placement=null;bar.hidden=true;hideHandles();
   editor.classList.remove('tyc-image-placement-active');
   selectionEvent();
  }
  function select(img){
   if(selected&&selected!==img)selected.removeAttribute('data-tyc-image-selected');
   if(!img||!editor.contains(img)||editor.hidden){clear();return;}
   selected=img;placement=null;img.setAttribute('data-tyc-image-selected','');
   img.draggable=true;bar.hidden=false;
   widthField.value=String(Math.round(img.getBoundingClientRect().width));
   updateAlignButtons();
   label.textContent=(EN?"Image / GIF selected":'Image / GIF selected · 사진 / GIF 선택');
   editor.classList.remove('tyc-image-placement-active');
   queueHandle();selectionEvent();
  }
  const availableWidth=()=>{
   if(!community)return Math.max(80,Math.min(1600,editor.clientWidth-38));
   const el=selected?.parentElement||editor,es=getComputedStyle(editor),ps=getComputedStyle(el);
   const inner=(node,style)=>node.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0);
   return Math.max(80,Math.min(1600,inner(editor,es),el.clientWidth?inner(el,ps):1600));
  };
  function setWidth(px){
   if(!valid())return;
   const n=Number(px);
   if(!Number.isFinite(n)||String(px).trim()===''){widthField.value=String(Math.round(selected.getBoundingClientRect().width));return;}
   const width=Math.round(Math.min(availableWidth(),Math.max(80,n)));
   selected.style.width=width+'px';selected.style.maxWidth='100%';
   selected.style.height='auto';
   widthField.value=String(width);
   queueHandle();notify();
  }
  widthField.addEventListener('change',()=>setWidth(widthField.value));
  widthField.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();setWidth(widthField.value);widthField.blur();}});
  button((EN?"Fit":'Fit / 맞춤'),()=>setWidth(availableWidth()),(EN?"Fit image/GIF to editor width":'Fit image/GIF to editor width / 편집창 너비에 맞추기'));
  const alignButtons=new Map();
  function updateAlignButtons(){
   const align=selected?.getAttribute('data-tyc-align')||'center';
   for(const [key,b] of alignButtons)b.setAttribute('aria-pressed',String(key===align));
  }
  function alignImage(align){
   if(!valid())return false;
   selected.setAttribute('data-tyc-align',align);
   updateAlignButtons();notify();queueHandle();return true;
  }
  for(const [key,label] of [['left',(EN?"Left":'Left / 왼쪽')],['center',(EN?"Center":'Center / 가운데')],['right',(EN?"Right":'Right / 오른쪽')]]){
   alignButtons.set(key,button(label,()=>alignImage(key),'Align image '+key+' / '+label));
  }
  function move(delta){
   if(!valid())return;
   const img=selected;let unit=block(img);
   const neighbor=delta<0?unit.previousSibling:unit.nextSibling;if(!neighbor)return;
   if(!imageOnly(unit)){const p=document.createElement('p');p.append(img);unit=p;}
   if(delta<0)editor.insertBefore(unit,neighbor);
   else editor.insertBefore(unit,neighbor.nextSibling);
   select(img);notify();img.scrollIntoView({block:'nearest'});
  }
  button('↑',()=>move(-1),(EN?"Move image/GIF up":'Move image/GIF up / 위로 이동'));
  button('↓',()=>move(1),(EN?"Move image/GIF down":'Move image/GIF down / 아래로 이동'));
  function placementMode(copy){
   if(!valid())return;
   if(copy&&editor.classList.contains('community-rich-editable')&&editor.querySelectorAll('img[data-tyc-path],img[data-tyc-giphy]').length>=10){
    label.textContent=(EN?"Maximum 10 images per discussion":'Maximum 10 images per discussion / 이미지 최대 10개');return;
   }
   placement={img:selected,copy};
   label.textContent=copy?(EN?"Click where you want a copy":'Click where you want a copy / 복사할 위치 클릭'):(EN?"Click destination in the article":'Click destination in the article / 이동할 위치 클릭');
   editor.classList.add('tyc-image-placement-active');
   hideHandles();
   editor.focus({preventScroll:true});
  }
  button((EN?"Move":'Move / 이동'),()=>placementMode(false),(EN?"Click target paragraph to move image or GIF there":'Click target paragraph to move image or GIF there / 이동 후 원하는 위치 클릭'));
  button((EN?"Copy":'Copy / 복사'),()=>placementMode(true),(EN?"Click target paragraph to insert a copy of this image or GIF":'Click target paragraph to insert a copy of this image or GIF / 복사 후 원하는 위치 클릭'));
  function remove(){
   if(!valid())return;
   const img=selected,unit=block(img),only=imageOnly(unit);
   clear();if(only)unit.remove();else img.remove();notify();
  }
  button((EN?"Delete":'Delete / 삭제'),remove,(EN?"Delete selected image/GIF":'Delete selected image/GIF / 선택 이미지 삭제'),'tyc-image-delete');
  button('×',clear,(EN?"Deselect":'Deselect / 선택 해제'));
  editor.before(bar);
  editor.tycImageAlignment={apply:alignImage,current:()=>valid()?(selected.getAttribute('data-tyc-align')||'center'):null};
  const selectionEvent=()=>editor.dispatchEvent(new Event('tyc-image-selection',{bubbles:true}));
  function insertAt(img,target,clientY,copy=false){
   let unit=block(img);
   let top=target;
   while(top&&top!==editor&&top.parentNode!==editor)top=top.parentNode;
   if(!top||top===editor)top=null;
   if(!copy&&top===unit)return select(img);
   let anchor=null;
   if(top&&top.parentNode===editor){
    const rect=top.getBoundingClientRect();
    anchor=clientY<rect.top+rect.height/2?top:top.nextSibling;
   }else if(clientY<editor.getBoundingClientRect().top+18)anchor=editor.firstChild;
   let moving;
   if(copy){
    moving=document.createElement('p');
    const cloned=img.cloneNode(true);
    cloned.removeAttribute('data-tyc-image-selected');
    cloned.draggable=true;moving.append(cloned);
    editor.insertBefore(moving,anchor);select(cloned);
   }else{
    moving=unit;
    if(!imageOnly(unit)){moving=document.createElement('p');moving.append(img);}
    editor.insertBefore(moving,anchor);select(img);
   }
   notify();queueHandle();
  }
  editor.addEventListener('click',e=>{
   if(placement){
    const action=placement;placement=null;
    e.preventDefault();e.stopPropagation();
    insertAt(action.img,e.target,e.clientY,action.copy);
    return;
   }
   const img=e.target.closest?.('img');
   if(img&&editor.contains(img)){e.preventDefault();select(img);}
   else if(!resizeInProgress)clear();
  },true);
  editor.addEventListener('keydown',e=>{
   if(e.key==='Escape'&&placement){placement=null;editor.classList.remove('tyc-image-placement-active');label.textContent=(EN?"Image / GIF selected":'Image / GIF selected · 사진 / GIF 선택');queueHandle();e.preventDefault();return;}
   if(!valid()||placement)return;
   if(e.key==='Escape'){clear();return;}
   if(e.key==='Delete'||e.key==='Backspace'){
    e.preventDefault();remove();
   }else if(!e.ctrlKey&&!e.metaKey&&!e.altKey)clear();
  });
  editor.addEventListener('dragstart',e=>{
   const img=e.target.closest?.('img');
   if(!img||!editor.contains(img))return;
   dragged=img;select(img);
   e.dataTransfer.effectAllowed='move';
   e.dataTransfer.setData('text/plain','tyc-editor-image');
  });
  editor.addEventListener('dragover',e=>{
   if(dragged&&editor.contains(dragged)){e.preventDefault();e.dataTransfer.dropEffect='move';}
  },true);
  editor.addEventListener('drop',e=>{
   if(!dragged||!editor.contains(dragged))return;
   e.preventDefault();e.stopImmediatePropagation();
   const img=dragged;dragged=null;
   insertAt(img,e.target,e.clientY,false);
  },true);
  editor.addEventListener('dragend',()=>{dragged=null;queueHandle()});
  for(const handle of handles){
   handle.addEventListener('pointerdown',e=>{
    if(!valid()||resizeInProgress||(e.pointerType==='mouse'&&e.button!==0))return;
    e.preventDefault();e.stopPropagation();
    const img=selected,initialX=e.clientX,initialY=e.clientY,rect=img.getBoundingClientRect(),startWidth=rect.width;
    const corner=handle.dataset.corner,sign=corner.includes('w')?-1:1;
    const alignment=img.getAttribute('data-tyc-align');
    const horizontalFactor=community&&alignment==='center'?2:1;
    const ratio=rect.width/Math.max(1,rect.height);
    resizeInProgress=true;activeHandle=handle;
    handle.setPointerCapture(e.pointerId);
    function moving(event){
     if(event.pointerId!==e.pointerId||!editor.contains(img)||selected!==img)return;
     const dx=(event.clientX-initialX)*sign*horizontalFactor;
     const dy=(event.clientY-initialY)*(corner.includes('n')?-1:1)*ratio;
     const delta=community&&corner.length===2&&Math.abs(dy)>Math.abs(dx)?dy:dx;
     setWidth(startWidth+delta);
    }
    function stop(event){
     if(event.pointerId!==e.pointerId)return;
     handle.removeEventListener('pointermove',moving);
     handle.removeEventListener('pointerup',stop);
     handle.removeEventListener('pointercancel',stop);
     handle.removeEventListener('lostpointercapture',stop);
     resizeInProgress=false;activeHandle=null;queueHandle();
    }
    handle.addEventListener('pointermove',moving);
    handle.addEventListener('pointerup',stop);
    handle.addEventListener('pointercancel',stop);
    handle.addEventListener('lostpointercapture',stop);
   });
  }
  editor.addEventListener('scroll',queueHandle,{passive:true});
  editor.addEventListener('load',queueHandle,true);
  owner.addEventListener('scroll',queueHandle,{passive:true});
  window.addEventListener('resize',queueHandle,{passive:true});
  window.addEventListener('scroll',queueHandle,{passive:true});
  const observer=new MutationObserver(()=>{
   if(selected&&!valid())clear();else if(selected)queueHandle();
  });
  observer.observe(editor,{childList:true,subtree:true});
  const resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(queueHandle):null;
  resizeObserver?.observe(editor);
  if(owner.tagName==='DIALOG'){
   owner.addEventListener('close',()=>{
    clear();hideHandles();
    // Community edit dialogs are created and removed for every edit.
    // Disconnect their global listeners so reopening cannot leak handlers.
    if(owner.classList.contains('edit-topic-dialog')){
     observer.disconnect();resizeObserver?.disconnect();
     window.removeEventListener('resize',queueHandle);
     window.removeEventListener('scroll',queueHandle);
     handles.forEach(h=>h.remove());
    }
   },{passive:true});
  }
 }
 window.TYC_ImageEditor={attach};
})();