/* Accessible compact mobile nav for the PTA Blog only. */
(()=>{'use strict';
const header=document.querySelector('body.blog-list-page .tyc-site-header');
if(!header)return;
const button=header.querySelector('.tyc-mobile-menu-toggle');
const nav=header.querySelector('.tyc-header-nav');
if(!button||!nav)return;
const mobile=window.matchMedia('(max-width:720px)');
function setOpen(open){
 const isOpen=!!open&&mobile.matches;
 header.classList.toggle('tyc-mobile-open',isOpen);
 button.setAttribute('aria-expanded',String(isOpen));
 button.setAttribute('aria-label',isOpen?'Close navigation menu':'Open navigation menu');
 const label=button.querySelector('.tyc-mobile-menu-label');if(label)label.textContent=isOpen?'CLOSE':'MENU';
}
button.addEventListener('click',()=>setOpen(!header.classList.contains('tyc-mobile-open')));
nav.addEventListener('click',event=>{
 if(event.target.closest('a[href]'))setOpen(false);
});
document.addEventListener('pointerdown',event=>{
 if(!header.contains(event.target))setOpen(false);
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&header.classList.contains('tyc-mobile-open')){
  setOpen(false);button.focus();
 }
});
if(mobile.addEventListener)mobile.addEventListener('change',()=>setOpen(false));
else if(mobile.addListener)mobile.addListener(()=>setOpen(false));
document.documentElement.classList.add('tyc-mobile-menu-ready');
})();