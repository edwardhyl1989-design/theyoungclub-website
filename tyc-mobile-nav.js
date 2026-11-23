/* Shared mobile navigation toggle for THE YOUNG CLUB public pages. */
(()=>{'use strict';
 const headers=[...document.querySelectorAll('.tyc-site-header.tyc-compact-nav')];
 if(!headers.length)return;
 const mobile=window.matchMedia('(max-width:720px)');
 for(const header of headers){
  const button=header.querySelector('.tyc-mobile-menu-toggle');
  const nav=header.querySelector('.tyc-header-nav');
  if(!button||!nav)continue;
  const setOpen=open=>{
   const shown=!!open&&mobile.matches;
   header.classList.toggle('tyc-mobile-open',shown);
   button.setAttribute('aria-expanded',String(shown));
   button.setAttribute('aria-label',shown?'Close navigation menu':'Open navigation menu');
   const label=button.querySelector('.tyc-mobile-menu-label');
   if(label)label.textContent=shown?'CLOSE':'MENU';
  };
  button.addEventListener('click',()=>setOpen(!header.classList.contains('tyc-mobile-open')));
  nav.addEventListener('click',event=>{if(event.target.closest('a[href]'))setOpen(false);});
  document.addEventListener('pointerdown',event=>{if(!header.contains(event.target))setOpen(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&header.classList.contains('tyc-mobile-open')){setOpen(false);button.focus();}});
  const onWidth=()=>setOpen(false);
  if(mobile.addEventListener)mobile.addEventListener('change',onWidth);
  else if(mobile.addListener)mobile.addListener(onWidth);
 }
 document.documentElement.classList.add('tyc-mobile-menu-ready');
})();