/* Image editing controls shared by blog and community. UI stays outside saved HTML. */
(()=>{'use strict';
function attach(editor){
 if(!editor||editor.dataset.tycImageTools)return;
 editor.dataset.tycImageTools='1';
 let selected=null,dragged=null;
 const bar=document.createElement('div');bar.className='tyc-image-edit-bar';bar.hidden=true;
 const label=document.createElement('span');label.className='tyc-image-edit-label';label.textContent='Image selected / 사진 선택';bar.append(label);
 function control(text,action,title){const b=document.createElement('button');b.type='button';b.textContent=text;b.title=title;b.setAttribute('aria-label',title);b.addEventListener('mousedown',e=>e.preventDefault());b.addEventListener('click',action);bar.append(b);return b;}
 function valid(){return selected&&editor.contains(selected)&&!editor.hidden;}
 function clear(){if(selected)selected.removeAttribute('data-tyc-image-selected');selected=null;bar.hidden=true;}
 function select(img){clear();if(!img||!editor.contains(img)||editor.hidden)return;selected=img;img.setAttribute('data-tyc-image-selected','');bar.hidden=false;}
 function block(img){let n=img;while(n.parentNode&&n.parentNode!==editor){n=n.parentNode;}return n;}
 function imageOnly(n){return n===selected||(!n.textContent.trim()&&n.querySelectorAll?.('img').length===1);}
 function move(delta){
  if(!valid())return;
  const img=selected;let unit=block(img);
  const neighbor=delta<0?unit.previousSibling:unit.nextSibling;if(!neighbor)return;
  if(!imageOnly(unit)){const p=document.createElement('p');p.append(img);unit=p;}
  if(delta<0)editor.insertBefore(unit,neighbor);else editor.insertBefore(unit,neighbor.nextSibling);
  select(img);editor.dispatchEvent(new Event('input',{bubbles:true}));img.scrollIntoView({block:'nearest'});
 }
 function remove(){if(!valid())return;const img=selected,unit=block(img);const only=imageOnly(unit);clear();if(only)unit.remove();else img.remove();editor.dispatchEvent(new Event('input',{bubbles:true}));}
 control('↑',()=>move(-1),'Move image up / 위로 이동');
 control('↓',()=>move(1),'Move image down / 아래로 이동');
 control('Delete / 삭제',remove,'Delete selected image / 선택 이미지 삭제').className='tyc-image-delete';
 control('×',clear,'Deselect image / 선택 해제');
 editor.before(bar);
 editor.addEventListener('click',e=>{const img=e.target.closest?.('img');if(img&&editor.contains(img)){e.preventDefault();select(img);}else clear();});
 editor.addEventListener('keydown',e=>{if(!valid())return;if(e.key==='Escape'){clear();return;}if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}else if(!e.ctrlKey&&!e.metaKey&&!e.altKey)clear();});
 editor.addEventListener('dragstart',e=>{const img=e.target.closest?.('img');if(!img||!editor.contains(img))return;dragged=img;select(img);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','tyc-editor-image');});
 editor.addEventListener('dragover',e=>{if(dragged&&editor.contains(dragged)){e.preventDefault();e.dataTransfer.dropEffect='move';}});
 editor.addEventListener('drop',e=>{
  if(!dragged||!editor.contains(dragged))return;
  e.preventDefault();e.stopImmediatePropagation();
  const img=dragged;dragged=null;const unit=block(img);
  let target=e.target;while(target&&target!==editor&&target.parentNode!==editor)target=target.parentNode;
  if(target===unit){select(img);return;}
  let anchor=null;
  if(target&&target!==editor&&target.parentNode===editor){const rect=target.getBoundingClientRect();anchor=e.clientY<rect.top+rect.height/2?target:target.nextSibling;}
  else if(e.clientY<editor.getBoundingClientRect().top+16)anchor=editor.firstChild;
  let moving=unit;if(!imageOnly(unit)){moving=document.createElement('p');moving.append(img);}
  editor.insertBefore(moving,anchor);select(img);editor.dispatchEvent(new Event('input',{bubbles:true}));
 },true);
 editor.addEventListener('dragend',()=>{dragged=null;});
 new MutationObserver(()=>{if(selected&&!valid())clear();}).observe(editor,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
}
window.TYC_ImageEditor={attach};
})();
