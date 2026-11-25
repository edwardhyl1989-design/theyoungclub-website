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