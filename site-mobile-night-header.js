/* F Night Sky mobile header, preserving existing navigation and account controls. */
(()=>{'use strict';
const mobile=matchMedia('(max-width:720px)');
const pages=[['Home','index.html'],['PTA Blog','blog.html'],['PTA Community','community.html'],['THE CLUB','the-club.html'],['PTA News','pta-news.html'],['Job Postings','jobs.html'],['SHOP','shop.html'],['About','about.html'],['My Profile','profile.html']];
const icons={search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',menu:'<path d="M3 5h18M3 12h18M3 19h18"/>'};
const make=(tag,cls)=>{const e=document.createElement(tag);if(cls)e.className=cls;return e;};
function icon(type,cls,label,href){const b=make(href?'a':'button',cls);if(href)b.href=href;else b.type='button';b.setAttribute('aria-label',label);b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[type]+'</svg>';return b;}
function stars(header){const sky=make('span','tyc-night-sky tyc-night-only');sky.setAttribute('aria-hidden','true');[[5,18,5],[12,74,8],[24,28,11],[29,69,5],[37,12,4],[64,18,5],[70,63,9],[80,34,5],[91,16,8],[96,65,4]].forEach(([x,y,s],i)=>{const star=make('i');star.style.cssText='--x:'+x+'%;--y:'+y+'%;--s:'+s+'px;--d:-'+(i*.67)+'s';sky.append(star);});header.prepend(sky);}
function wordmark(brand){const mark=make('span','tyc-night-wordmark tyc-night-only');mark.textContent='THE CLUB';mark.setAttribute('aria-hidden','true');brand.append(mark);}
function directoryPanel(header,search){
 const panel=make('div','tyc-night-panel tyc-night-only'),label=make('label'),input=make('input'),results=make('div','tyc-night-results');input.type='search';input.id='tycNightSearch';input.placeholder='Search sections or articles';label.htmlFor=input.id;label.textContent='Search THE YOUNG CLUB';results.setAttribute('aria-live','polite');panel.append(label,input,results);header.append(panel);
 function render(){results.replaceChildren();const q=input.value.trim();const matches=pages.filter(([name])=>!q||name.toLowerCase().includes(q.toLowerCase()));for(const [name,href] of matches){const link=make('a');link.href=href;link.textContent=name;results.append(link);}if(q){const link=make('a');link.href='blog.html?q='+encodeURIComponent(q);link.textContent='Search PTA Blog for “'+q+'”';results.append(link);const club=make('a');club.href='the-club.html?q='+encodeURIComponent(q);club.textContent='Search THE CLUB for “'+q+'”';results.append(club);}}
 input.addEventListener('input',render);render();search.setAttribute('aria-controls',input.id);return input;
}
function homeHeader(){const h=make('header','tyc-night-home tyc-night-header');const inner=make('div','tyc-header-inner'),brand=make('a','tyc-header-brand'),toggle=make('button','tyc-mobile-menu-toggle'),nav=make('nav','tyc-header-nav');brand.href='index.html';brand.setAttribute('aria-label','THE YOUNG CLUB Home');brand.textContent='THE YOUNG CLUB';toggle.type='button';toggle.setAttribute('aria-label','Open navigation menu');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','tyc-night-home-nav');toggle.innerHTML='<span class="tyc-mobile-menu-bars" aria-hidden="true"><i></i><i></i><i></i></span>';nav.id='tyc-night-home-nav';nav.setAttribute('aria-label','Main navigation');for(const [name,href] of pages){const a=make('a');a.href=href;a.textContent=name;nav.append(a);}const login=make('a');login.href='auth.html?next=index.html';login.textContent='Log In / Account';nav.append(login);inner.append(brand,toggle,nav);h.append(inner);document.body.prepend(h);return h;}
function setup(){
 if(/\/shop(?:\.html)?\/?$/.test(location.pathname)||document.querySelector('header.shop-header'))return;
 let header=document.querySelector('header.tyc-site-header.tyc-compact-nav,header.club-top');
 if(!header&&document.querySelector('.home-art'))header=homeHeader();
 if(!header)return;
 const club=header.classList.contains('club-top'),home=header.classList.contains('tyc-night-home');
 const inner=club?header:header.querySelector('.tyc-header-inner'),brand=inner?.querySelector(club?'.brand':'.tyc-header-brand');if(!inner||!brand)return;
 header.classList.add('tyc-night-header');stars(header);wordmark(brand);
 const search=icon('search','tyc-night-search tyc-night-only','Search');search.setAttribute('aria-expanded','false');inner.prepend(search);
 let menu,input;
 const closeSearch=()=>{header.classList.remove('tyc-night-search-open');search.setAttribute('aria-expanded','false');};
 const closeMenu=()=>{if(!header.classList.contains('tyc-mobile-open'))return;if(!club&&!home)menu.click();else{header.classList.remove('tyc-mobile-open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation menu');}};
 if(club){
  const actions=header.querySelector('.club-header-actions');menu=icon('menu','tyc-night-menu tyc-night-only','Open navigation menu');menu.setAttribute('aria-expanded','false');const nav=header.querySelector('.club-site-links');nav.id=nav.id||'tyc-night-club-nav';menu.setAttribute('aria-controls',nav.id);actions.append(menu);input=header.querySelector('#search');search.setAttribute('aria-controls','search');
 }else{
  menu=inner.querySelector('.tyc-mobile-menu-toggle');if(!menu)return;
  const right=make('div','tyc-night-right');menu.before(right);const bell=icon('bell','tyc-night-bell tyc-night-only','Club notifications','the-club.html?notifications=1');right.append(bell,menu);input=directoryPanel(header,search);
 }
 menu.addEventListener('click',()=>{closeSearch();if(club||home){const open=header.classList.toggle('tyc-mobile-open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');}});
 search.addEventListener('click',()=>{const open=!header.classList.contains('tyc-night-search-open');closeMenu();header.classList.toggle('tyc-night-search-open',open);search.setAttribute('aria-expanded',String(open));if(open)requestAnimationFrame(()=>input?.focus());});
 document.addEventListener('pointerdown',e=>{if(!header.contains(e.target)){closeSearch();if(club||home)closeMenu();}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&header.classList.contains('tyc-night-search-open')){closeSearch();search.focus();}else if(e.key==='Escape'&&(club||home)&&header.classList.contains('tyc-mobile-open')){closeMenu();menu.focus();}});
 mobile.addEventListener('change',()=>{closeSearch();if(club||home)closeMenu();});
 if(club){
  const q=new URLSearchParams(location.search).get('q');if(q&&input){input.value=q;input.dispatchEvent(new Event('input',{bubbles:true}));}
  if(new URLSearchParams(location.search).get('notifications')==='1'){
   const bell=header.querySelector('#clubBell'),login=header.querySelector('#clubLogin');let done=false;
   const open=()=>{if(done)return;if(bell&&!bell.hidden){done=true;observer.disconnect();bell.click();}else if(login&&!login.hidden){done=true;observer.disconnect();location.href=login.href;}};
   const observer=new MutationObserver(open);if(bell)observer.observe(bell,{attributes:true,attributeFilter:['hidden']});if(login)observer.observe(login,{attributes:true,attributeFilter:['hidden']});open();
  }
 }
 if(location.pathname.endsWith('/blog.html')){const q=new URLSearchParams(location.search).get('q'),field=document.getElementById('query');if(q&&field){field.value=q;field.dispatchEvent(new Event('input',{bubbles:true}));}}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
