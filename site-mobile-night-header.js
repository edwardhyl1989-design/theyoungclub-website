/* F Night Sky mobile header, preserving existing navigation and account controls. */
(()=>{'use strict';
const mobile=matchMedia('(max-width:720px)');
const pages=[['Home','index.html'],['PTA Blog','blog.html'],['PTA Community','community.html'],['THE CLUB','the-club.html'],['PTA News','pta-news.html'],['JOBS','jobs.html'],['SHOP','shop.html'],['About','about.html'],['My Profile','profile.html']];
const icons={search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',menu:'<path d="M3 5h18M3 12h18M3 19h18"/>'};
const make=(tag,cls)=>{const e=document.createElement(tag);if(cls)e.className=cls;return e;};
function icon(type,cls,label,href){const b=make(href?'a':'button',cls);if(href)b.href=href;else b.type='button';b.setAttribute('aria-label',label);b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[type]+'</svg>';return b;}
function stars(header){const sky=make('span','tyc-night-sky tyc-night-only');sky.setAttribute('aria-hidden','true');[[5,18,5],[12,74,8],[24,28,11],[29,69,5],[37,12,4],[64,18,5],[70,63,9],[80,34,5],[91,16,8],[96,65,4]].forEach(([x,y,s],i)=>{const star=make('i');star.style.cssText='--x:'+x+'%;--y:'+y+'%;--s:'+s+'px;--d:-'+(i*.67)+'s';sky.append(star);});header.prepend(sky);}
function wordmark(brand){
 const mark=make('span','tyc-night-wordmark tyc-night-only');mark.textContent='THE CLUB';mark.setAttribute('aria-hidden','true');
 const logo=make('span','tyc-night-logo tyc-night-only');logo.setAttribute('aria-hidden','true');
 const sprout=make('img','tyc-night-sprout'),wing=make('img','tyc-night-gold-wing');sprout.alt=wing.alt='';sprout.draggable=wing.draggable=false;
 wing.src='tyc-gold-wing-star.svg?v=gold32';logo.append(sprout,wing);brand.append(logo,mark);
 // Match the actual luminous leaf bounds in the approved transparent PNG to the original gold wing artwork.
 let bounds=null;
 function align(){if(!bounds||!logo.clientWidth||!logo.clientHeight)return;
  const {w,h,l,r,t,b}=bounds,sw=r-l+1,sh=b-t+1;
  const fit=Math.min(logo.clientWidth*.72/sw,logo.clientHeight*.81/sh);
  const ox=(logo.clientWidth-sw*fit)/2-l*fit,oy=(logo.clientHeight-sh*fit)/2-t*fit;
  sprout.style.cssText='width:'+(w*fit)+'px;height:'+(h*fit)+'px;left:'+ox+'px;top:'+oy+'px;';
  const sx=sw/1116,sy=sh/735;
  wing.style.cssText='left:'+(ox+(l+(807.5-243)*sx)*fit)+'px;top:'+(oy+(t+(500-132)*sy)*fit)+'px;width:'+(1365*sx*fit)+'px;height:'+(770*sy*fit)+'px;';
 }
 function measure(){try{const w=sprout.naturalWidth,h=sprout.naturalHeight;if(!w||!h)return;const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return;ctx.drawImage(sprout,0,0);const d=ctx.getImageData(0,0,w,h).data;let l=w,r=0,t=h,b=0,n=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,R=d[i],G=d[i+1],B=d[i+2],A=d[i+3];if(A>=100&&G>120&&G-R>44&&G>B+12){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);n++;}}if(n>=40&&r-l>=8&&b-t>=8){bounds={w,h,l,r,t,b};align();}}catch(e){console.warn('Mobile gold wing alignment unavailable',e);}}
 sprout.addEventListener('load',measure,{once:true});sprout.src='header-sprout-transparent.png?v=original30';if(sprout.complete)measure();
 if(typeof ResizeObserver==='function')new ResizeObserver(align).observe(logo);else mobile.addEventListener('change',align);
}
function directoryPanel(header,search){
 const panel=make('div','tyc-night-panel tyc-night-only'),label=make('label'),input=make('input'),results=make('div','tyc-night-results');input.type='search';input.id='tycNightSearch';input.placeholder='Search sections or articles';label.htmlFor=input.id;label.textContent='Search THE YOUNG CLUB';results.setAttribute('aria-live','polite');panel.append(label,input,results);header.append(panel);
 function render(){results.replaceChildren();const q=input.value.trim();const matches=pages.filter(([name])=>!q||name.toLowerCase().includes(q.toLowerCase()));for(const [name,href] of matches){const link=make('a');link.href=href;link.textContent=name;results.append(link);}if(q){const link=make('a');link.href='blog.html?q='+encodeURIComponent(q);link.textContent='Search PTA Blog for “'+q+'”';results.append(link);const club=make('a');club.href='the-club.html?q='+encodeURIComponent(q);club.textContent='Search THE CLUB for “'+q+'”';results.append(club);}}
 input.addEventListener('input',render);render();search.setAttribute('aria-controls',input.id);return input;
}
function setup(){
 if(/\/shop(?:\.html)?\/?$/.test(location.pathname)||document.querySelector('header.shop-header'))return;
 let header=document.querySelector('header.tyc-site-header.tyc-compact-nav,header.club-top');
 if(document.querySelector('.home-art'))return;
 if(!header)return;
 const club=header.classList.contains('club-top'),home=header.classList.contains('tyc-night-home');
 const inner=club?header:header.querySelector('.tyc-header-inner'),brand=inner?.querySelector(club?'.brand':'.tyc-header-brand');if(!inner||!brand)return;
 header.classList.add('tyc-night-header');if(club)header.classList.add('tyc-glass-header');else stars(header);wordmark(brand);
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
