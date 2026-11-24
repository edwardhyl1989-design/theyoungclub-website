/* Image + GIF editing controls shared by Blog and Community.
   UI is outside saved HTML; only safe inline width survives sanitization.
   Supports pointer resizing, numeric width, click-to-move/copy, drag/drop. */
(()=>{'use strict';
 function attach(editor){
  if(!editor||editor.dataset.tycImageTools)return;
  editor.dataset.tycImageTools='2';
  let selected=null,dragged=null,placement=null,resizeInProgress=false;
  const bar=document.createElement('div');
  bar.className='tyc-image-edit-bar';bar.hidden=true;
  const label=document.createElement('span');
  label.className='tyc-image-edit-label';label.textContent='Image / GIF selected · 사진 / GIF 선택';
  bar.append(label);
  const button=(text,action,title,cls='')=>{
   const b=document.createElement('button');b.type='button';b.textContent=text;b.title=title;
   b.setAttribute('aria-label',title);if(cls)b.className=cls;
   b.addEventListener('mousedown',e=>e.preventDefault());
   b.addEventListener('click',action);bar.append(b);return b;
  };
  const valid=()=>!!selected&&editor.contains(selected)&&!editor.hidden;
  const block=img=>{let n=img;while(n.parentNode&&n.parentNode!==editor)n=n.parentNode;return n;};
  const imageOnly=n=>n===selected||(!n.textContent?.trim()&&n.querySelectorAll?.('img').length===1);
  const notify=()=>editor.dispatchEvent(new Event('input',{bubbles:true}));
  const sizeWrap=document.createElement('label');sizeWrap.className='tyc-image-width-label';
  sizeWrap.textContent='Width / 너비';
  const widthField=document.createElement('input');
  widthField.type='number';widthField.step='any';
  widthField.inputMode='numeric';widthField.setAttribute('aria-label','Image width in pixels / 이미지 너비(px)');
  sizeWrap.append(widthField);bar.append(sizeWrap);
  const owner=editor.closest('dialog')||document.body;
  const handle=document.createElement('button');handle.type='button';
  handle.className='tyc-image-resize-handle';handle.hidden=true;handle.textContent='↘';
  handle.setAttribute('aria-label','Drag to resize the selected image or GIF / 모서리를 끌어 이미지 크기 조절');
  handle.title='Drag this corner to resize / 모서리 드래그로 크기 조절';
  owner.append(handle);
  let frame=0;
  function updateHandle(){
   frame=0;
   if(!valid()||placement||resizeInProgress&&selected?.hidden){handle.hidden=true;return;}
   const r=selected.getBoundingClientRect(),v=editor.getBoundingClientRect();
   const x=r.right,y=r.bottom;
   const inside=x>v.left+7&&x<v.right+12&&y>v.top+8&&y<v.bottom+12;
   handle.hidden=!inside;
   if(inside){handle.style.left=Math.round(x-13)+'px';handle.style.top=Math.round(y-13)+'px';}
  }
  function queueHandle(){if(!frame)frame=requestAnimationFrame(updateHandle);}
  function clear(){
   if(selected)selected.removeAttribute('data-tyc-image-selected');
   selected=null;placement=null;bar.hidden=true;handle.hidden=true;
   editor.classList.remove('tyc-image-placement-active');
  }
  function select(img){
   if(selected&&selected!==img)selected.removeAttribute('data-tyc-image-selected');
   if(!img||!editor.contains(img)||editor.hidden){clear();return;}
   selected=img;placement=null;img.setAttribute('data-tyc-image-selected','');
   img.draggable=true;bar.hidden=false;
   widthField.value=String(Math.round(img.getBoundingClientRect().width));
   updateAlignButtons();
   label.textContent='Image / GIF selected · 사진 / GIF 선택';
   editor.classList.remove('tyc-image-placement-active');
   queueHandle();
  }
  const availableWidth=()=>Math.max(80,Math.min(1600,editor.clientWidth-38));
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
  button('Fit / 맞춤',()=>setWidth(availableWidth()),'Fit image/GIF to editor width / 편집창 너비에 맞추기');
  const alignButtons=new Map();
  function updateAlignButtons(){
   const align=selected?.getAttribute('data-tyc-align')||'center';
   for(const [key,b] of alignButtons)b.setAttribute('aria-pressed',String(key===align));
  }
  function alignImage(align){
   if(!valid())return;
   selected.setAttribute('data-tyc-align',align);
   updateAlignButtons();notify();queueHandle();
  }
  for(const [key,label] of [['left','Left / 왼쪽'],['center','Center / 가운데'],['right','Right / 오른쪽']]){
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
  button('↑',()=>move(-1),'Move image/GIF up / 위로 이동');
  button('↓',()=>move(1),'Move image/GIF down / 아래로 이동');
  function placementMode(copy){
   if(!valid())return;
   if(copy&&editor.classList.contains('community-rich-editable')&&editor.querySelectorAll('img[data-tyc-path],img[data-tyc-giphy]').length>=10){
    label.textContent='Maximum 10 images per discussion / 이미지 최대 10개';return;
   }
   placement={img:selected,copy};
   label.textContent=copy?'Click where you want a copy / 복사할 위치 클릭':'Click destination in the article / 이동할 위치 클릭';
   editor.classList.add('tyc-image-placement-active');
   handle.hidden=true;
   editor.focus({preventScroll:true});
  }
  button('Move / 이동',()=>placementMode(false),'Click target paragraph to move image or GIF there / 이동 후 원하는 위치 클릭');
  button('Copy / 복사',()=>placementMode(true),'Click target paragraph to insert a copy of this image or GIF / 복사 후 원하는 위치 클릭');
  function remove(){
   if(!valid())return;
   const img=selected,unit=block(img),only=imageOnly(unit);
   clear();if(only)unit.remove();else img.remove();notify();
  }
  button('Delete / 삭제',remove,'Delete selected image/GIF / 선택 이미지 삭제','tyc-image-delete');
  button('×',clear,'Deselect / 선택 해제');
  editor.before(bar);
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
   if(e.key==='Escape'&&placement){placement=null;editor.classList.remove('tyc-image-placement-active');label.textContent='Image / GIF selected · 사진 / GIF 선택';queueHandle();e.preventDefault();return;}
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
  handle.addEventListener('pointerdown',e=>{
   if(!valid())return;
   e.preventDefault();e.stopPropagation();
   const img=selected;const initialX=e.clientX,startWidth=img.getBoundingClientRect().width;
   resizeInProgress=true;
   handle.setPointerCapture(e.pointerId);
   function moving(event){
    if(event.pointerId!==e.pointerId||!editor.contains(img))return;
    setWidth(startWidth+(event.clientX-initialX));
   }
   function stop(event){
    if(event.pointerId!==e.pointerId)return;
    handle.removeEventListener('pointermove',moving);
    handle.removeEventListener('pointerup',stop);
    handle.removeEventListener('pointercancel',stop);
    resizeInProgress=false;queueHandle();
   }
   handle.addEventListener('pointermove',moving);
   handle.addEventListener('pointerup',stop);
   handle.addEventListener('pointercancel',stop);
  });
  editor.addEventListener('scroll',queueHandle,{passive:true});
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
    clear();handle.hidden=true;
    // Community edit dialogs are created and removed for every edit.
    // Disconnect their global listeners so reopening cannot leak handlers.
    if(owner.classList.contains('edit-topic-dialog')){
     observer.disconnect();resizeObserver?.disconnect();
     window.removeEventListener('resize',queueHandle);
     window.removeEventListener('scroll',queueHandle);
     handle.remove();
    }
   },{passive:true});
  }
 }
 window.TYC_ImageEditor={attach};
})();