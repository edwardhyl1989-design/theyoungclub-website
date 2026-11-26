(()=>{'use strict';
const $=id=>document.getElementById(id),body=$('body'),toggle=$('clubEmojiToggle'),panel=$('clubEmojiPanel'),search=$('clubEmojiSearch'),category=$('clubEmojiCategory'),grid=$('clubEmojiGrid'),catalog=window.TYC_EmojiCatalog;
if(!body||!toggle||!panel||!search||!category||!grid)return;
const fallback=['😀','😊','😂','😍','🥰','👍','👏','🙌','🙏','💪','❤️','💚','🔥','✨','🎉','🌱','🏋️','🏃','📷'].map(emoji=>({emoji,category:'',keywords:emoji}));
for(const name of catalog?.categories||[]){const opt=document.createElement('option');opt.value=name;opt.textContent=name;category.append(opt);}
let start=0,end=0;
function remember(){start=body.selectionStart??body.value.length;end=body.selectionEnd??start;}
for(const ev of ['select','keyup','click','input','blur'])body.addEventListener(ev,remember);
function close(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');}
function render(){const q=search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);const items=(catalog?.items||fallback).filter(i=>(!category.value||i.category===category.value)&&q.every(t=>i.keywords.includes(t)));grid.replaceChildren();for(const item of items){const b=document.createElement('button');b.type='button';b.textContent=item.emoji;b.title=[item.english,item.korean].filter(Boolean).join(' / ')||item.emoji;b.setAttribute('aria-label',b.title);b.addEventListener('click',()=>{const a=Math.min(start,body.value.length),z=Math.min(end,body.value.length);if(body.value.length-(z-a)+item.emoji.length>body.maxLength)return;body.setRangeText(item.emoji,a,z,'end');body.dispatchEvent(new Event('input',{bubbles:true}));body.focus({preventScroll:true});remember();});grid.append(b);}if(!items.length)grid.textContent='No matching emoji / 검색 결과 없음';}
toggle.addEventListener('click',()=>{if(!panel.hidden){close();return;}if(document.activeElement===body)remember();panel.hidden=false;toggle.setAttribute('aria-expanded','true');render();});
search.addEventListener('input',render);category.addEventListener('change',render);
panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();toggle.focus();}});
$('composer')?.addEventListener('close',()=>{close();start=end=0;search.value='';category.value='';});
$('postForm')?.addEventListener('reset',()=>{close();start=end=0;});
})();
/* My Space: independent, searchable emoji pickers for tagline and bio. */
(()=>{'use strict';
 const dialog=document.getElementById('profileDialog'),form=document.getElementById('profileForm');
 if(!dialog||!form)return;
 const catalog=window.TYC_EmojiCatalog;
 const fallback=['😀','😊','😂','🥰','👍','👏','🙏','💪','❤️','💚','🔥','✨','🎉','🌱','🏋️','🏃','📚','☕'].map(emoji=>({emoji,keywords:emoji}));
 let active=null;const pickers=[];
 function close(p,focus=false){p.panel.hidden=true;p.toggle.setAttribute('aria-expanded','false');if(active===p)active=null;if(focus)p.toggle.focus({preventScroll:true});}
 for(const id of ['tagline','bio']){
  const field=document.getElementById(id);if(!field)continue;
  const wrap=document.createElement('div');wrap.className='space-emoji-wrap';
  const toggle=document.createElement('button');toggle.type='button';toggle.className='space-emoji-toggle';toggle.setAttribute('aria-label',id==='tagline'?'Add tagline emoji / 한 줄 소개 이모지':'Add bio emoji / 자기소개 이모지');toggle.title='Add emoji / 이모지 추가';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','spaceEmojiPanel-'+id);
  toggle.innerHTML='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 14.5q4 4 8 0"/><path d="M9 9h.01M15 9h.01" stroke-width="2.5"/></svg>';
  const panel=document.createElement('div');panel.id='spaceEmojiPanel-'+id;panel.className='space-emoji-panel';panel.hidden=true;
  const search=document.createElement('input');search.type='search';search.placeholder='Search emoji / 이모지 검색';search.setAttribute('aria-label','Search emoji');search.autocomplete='off';
  const grid=document.createElement('div');grid.className='space-emoji-grid';
  panel.append(search,grid);field.before(wrap);wrap.append(field,toggle,panel);
  const p={field,wrap,toggle,panel,search,grid,start:0,end:0,remembered:false};pickers.push(p);
  function remember(){p.start=field.selectionStart??field.value.length;p.end=field.selectionEnd??p.start;p.remembered=true;}
  for(const event of ['focus','select','keyup','click','input','blur'])field.addEventListener(event,remember);
  function render(){const q=search.value.trim().toLowerCase();const items=catalog?.search(q,400)||fallback.filter(x=>x.keywords.includes(q));grid.replaceChildren();for(const item of items){const b=document.createElement('button');b.type='button';b.textContent=item.emoji;b.title=[item.english,item.korean].filter(Boolean).join(' / ')||item.emoji;b.setAttribute('aria-label',b.title);b.onclick=()=>{const a=Math.min(p.start,field.value.length),z=Math.max(a,Math.min(p.end,field.value.length));if(field.maxLength>=0&&field.value.length-(z-a)+item.emoji.length>field.maxLength)return;field.setRangeText(item.emoji,a,z,'end');field.dispatchEvent(new Event('input',{bubbles:true}));field.focus({preventScroll:true});remember();};grid.append(b);}if(!items.length){const msg=document.createElement('span');msg.className='space-emoji-empty';msg.textContent='No matching emoji / 검색 결과 없음';grid.append(msg);}}
  toggle.onclick=()=>{if(!panel.hidden){close(p);return;}if(active)close(active);if(!p.remembered)p.start=p.end=field.value.length;active=p;panel.hidden=false;toggle.setAttribute('aria-expanded','true');render();};
  search.addEventListener('input',render);panel.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(p,true);}});
 }
 dialog.addEventListener('click',e=>{if(active&&!active.wrap.contains(e.target))close(active);});
 function reset(){for(const p of pickers){close(p);p.start=p.end=0;p.remembered=false;p.search.value='';}}
 dialog.addEventListener('close',reset);form.addEventListener('reset',reset);
})();
