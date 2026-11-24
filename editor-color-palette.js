/* Accessible, bilingual one-click color palette for Blog and Community editors.
   Preset swatches, preview and optional custom color; popup escapes horizontal toolbars. */
(()=>{'use strict';
 const paletteSets={
  text:[
   ['#1B3A2E','기본','Default'],['#111827','검정','Black'],['#697586','회색','Gray'],['#FFFFFF','흰색','White'],
   ['#D9363E','빨강','Red'],['#E56B19','주황','Orange'],['#BD8200','금색','Gold'],['#258044','초록','Green'],
   ['#2563EB','파랑','Blue'],['#203A8F','남색','Navy'],['#8B44AE','보라','Purple'],['#D85B92','분홍','Pink']
  ],
  highlight:[
   ['#FFF2A8','연노랑','Yellow'],['#FFDBA9','살구','Peach'],['#F8BFCB','분홍','Pink'],['#E6C8FA','보라','Lavender'],
   ['#B9E8FB','하늘','Sky'],['#C8F0D4','민트','Mint'],['#E6F4A4','연두','Lime'],['#FCE8BE','크림','Cream'],
   ['#D6E4FF','연파랑','Blue'],['#F6D2D6','로즈','Rose'],['#E6E7E9','회색','Gray'],['#FFFFFF','없음','None']
  ]
 };
 let activeClose=null;
 function attach(host,{kind='text',label,onApply,onBeforeOpen,initial}={}){
  if(!host||host.dataset.tycColorPickerAttached==='1'||typeof onApply!=='function')return null;
  host.dataset.tycColorPickerAttached='1';
  const colors=paletteSets[kind==='highlight'?'highlight':'text'];
  const isHighlight=kind==='highlight';
  const title=label||(isHighlight?'Highlight / 형광펜':'Text Color / 글자색');
  const owner=host.closest('dialog')||document.body;
  const button=document.createElement('button');button.type='button';
  button.className='tyc-easy-color-trigger';
  button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
  button.setAttribute('aria-label',title+' — choose from preset colors');
  const symbol=document.createElement('span');symbol.className='tyc-easy-color-symbol';
  symbol.textContent=isHighlight?'▰':'A';symbol.setAttribute('aria-hidden','true');
  const word=document.createElement('span');word.className='tyc-easy-color-word';
  word.textContent=isHighlight?'형광펜':'글자색';
  const caret=document.createElement('span');caret.className='tyc-easy-color-caret';
  caret.textContent='⌄';caret.setAttribute('aria-hidden','true');
  button.append(symbol,word,caret);host.append(button);
  const pop=document.createElement('section');
  pop.className='tyc-easy-color-popover';
  pop.hidden=true;pop.setAttribute('role','dialog');pop.setAttribute('aria-label',title);
  const heading=document.createElement('div');heading.className='tyc-easy-color-heading';
  const info=document.createElement('div');
  const eyebrow=document.createElement('span');eyebrow.className='tyc-easy-color-eyebrow';eyebrow.textContent='THE YOUNG CLUB · EDITOR';
  const h=document.createElement('strong');h.textContent=title;
  info.append(eyebrow,h);
  const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='tyc-easy-color-close';dismiss.textContent='×';dismiss.setAttribute('aria-label','Close color palette / 닫기');
  heading.append(info,dismiss);
  const hint=document.createElement('p');hint.className='tyc-easy-color-hint';
  hint.textContent='먼저 본문 글자를 드래그해서 선택하세요. / Select text, then choose a color.';
  const grid=document.createElement('div');grid.className='tyc-easy-color-grid';
  grid.setAttribute('role','group');grid.setAttribute('aria-label','Quick colors / 추천 색상');
  const footer=document.createElement('div');footer.className='tyc-easy-color-footer';
  const customLabel=document.createElement('label');customLabel.className='tyc-easy-color-custom-label';
  const customText=document.createElement('span');customText.textContent='+ 직접 선택 / Custom';
  const custom=document.createElement('input');custom.type='color';
  custom.setAttribute('aria-label','Choose custom '+(isHighlight?'highlight':'text')+' color');
  customLabel.append(customText,custom);footer.append(customLabel);
  pop.append(heading,hint,grid,footer);owner.append(pop);
  let current=initial||colors[0][0],previousFocused=null;
  const preview=color=>{
   symbol.style.setProperty('--tyc-easy-color-current',color);
   custom.value=color;
   for(const tile of grid.children)tile.setAttribute('aria-pressed',String(tile.dataset.color===color.toUpperCase()));
  };
  preview(current);
  function position(){
   if(pop.hidden)return;
   const r=button.getBoundingClientRect(),width=Math.min(336,window.innerWidth-20);
   pop.style.width=width+'px';
   let left=Math.max(10,Math.min(r.left,window.innerWidth-width-10));
   const height=pop.getBoundingClientRect().height;
   let top=r.bottom+8;
   if(top+height>window.innerHeight-10&&r.top>height+12)top=r.top-height-8;
   top=Math.max(10,Math.min(top,window.innerHeight-height-10));
   pop.style.left=Math.round(left)+'px';
   pop.style.top=Math.round(top)+'px';
  }
  function close(restoreFocus=false){
   if(pop.hidden)return;
   pop.hidden=true;
   button.setAttribute('aria-expanded','false');
   if(activeClose===close)activeClose=null;
   if(restoreFocus)button.focus({preventScroll:true});
  }
  function open(){
   if(activeClose&&activeClose!==close)activeClose();
   if(typeof onBeforeOpen==='function')onBeforeOpen();
   pop.hidden=false;button.setAttribute('aria-expanded','true');
   activeClose=close;previousFocused=document.activeElement;
   preview(current);position();
  }
  function apply(color){
   if(!/^#[0-9A-F]{6}$/i.test(color))return;
   const hex=color.toUpperCase();
   if(onApply(hex)===false)return;
   current=hex;preview(hex);
   close(false);
  }
  for(const [color,korean,english] of colors){
   const tile=document.createElement('button');tile.type='button';tile.className='tyc-easy-color-tile';
   tile.dataset.color=color.toUpperCase();tile.setAttribute('aria-pressed','false');
   tile.title=english+' / '+korean+' ('+color+')';
   tile.setAttribute('aria-label',korean+' / '+english+', '+color);
   const swatch=document.createElement('span');swatch.className='tyc-easy-color-swatch';
   swatch.style.backgroundColor=color;
   const name=document.createElement('span');name.className='tyc-easy-color-name';name.textContent=korean;
   tile.append(swatch,name);
   tile.addEventListener('mousedown',event=>event.preventDefault());
   tile.addEventListener('click',()=>apply(color));grid.append(tile);
  }
  preview(current);
  custom.addEventListener('change',()=>apply(custom.value));
  // Keep the editable selection intact even when the toolbar button receives focus.
  button.addEventListener('mousedown',event=>{event.preventDefault();if(typeof onBeforeOpen==='function')onBeforeOpen();});
  button.addEventListener('click',()=>pop.hidden?open():close());
  dismiss.addEventListener('click',()=>close(true));
  pop.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();close(true);}
  });
  document.addEventListener('pointerdown',event=>{
   if(!pop.hidden&&!host.contains(event.target)&&!pop.contains(event.target))close();
  },true);
  owner.addEventListener('scroll',position,{passive:true});
  window.addEventListener('resize',position,{passive:true});
  if(owner.tagName==='DIALOG')owner.addEventListener('close',()=>close());
  return {close,button,pop};
 }
 window.TYC_ColorPalette={attach};
})();