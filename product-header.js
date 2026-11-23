/* SHOP product detail: same header actions as SHOP homepage. */
(()=>{'use strict';
const searchToggle=document.getElementById('shop-search-toggle');
const panel=document.getElementById('shop-search-panel');
const input=document.getElementById('shop-search-input');
const clear=document.getElementById('shop-search-clear');
const bag=document.getElementById('shop-bag-dialog');
if(!searchToggle||!panel||!input||!clear||!bag)return;
function hideSearch(){panel.hidden=true;searchToggle.setAttribute('aria-expanded','false');}
searchToggle.addEventListener('click',()=>{
 const show=panel.hidden;panel.hidden=!show;
 searchToggle.setAttribute('aria-expanded',String(show));
 if(show)input.focus();
});
function goSearch(){
 const q=input.value.trim();
 if(!q){location.href='shop.html';return;}
 location.href='shop.html?search='+encodeURIComponent(q);
}
input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();goSearch();}});
clear.addEventListener('click',()=>{input.value='';input.focus();});
document.addEventListener('click',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!searchToggle.contains(e.target))hideSearch();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){hideSearch();if(bag.open)bag.close();}});
const cart=document.getElementById('shop-cart-toggle');
const close=document.getElementById('shop-bag-close');
const back=document.getElementById('shop-bag-back');
cart?.addEventListener('click',()=>bag.showModal());
close?.addEventListener('click',()=>bag.close());
back?.addEventListener('click',()=>bag.close());
bag.addEventListener('click',e=>{if(e.target===bag)bag.close();});
})();