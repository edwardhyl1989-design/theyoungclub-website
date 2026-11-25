/* Match the approved PNG's visible neon sprout; never replace its artwork. */
(()=>{'use strict';
const setup=()=>{
 const brands=[...document.querySelectorAll('.tyc-site-header .tyc-header-brand')];if(!brands.length)return;
 const source=new Image();
 source.onload=()=>{try{
 const w=source.naturalWidth,h=source.naturalHeight;if(!w||!h)return;
 const c=document.createElement('canvas');c.width=w;c.height=h;
 const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)return;
 ctx.drawImage(source,0,0);const d=ctx.getImageData(0,0,w,h).data;
 let l=w,r=0,t=h,b=0,n=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,R=d[i],G=d[i+1],B=d[i+2],A=d[i+3];if(A>=100&&G>120&&G-R>44&&G>B+12){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);n++;}}
 if(n<40||r-l<8||b-t<8)return;
 for(const brand of brands){
 if(brand.querySelector('.tyc-wing-layer'))continue;
 const layer=document.createElement('span');layer.className='tyc-wing-layer';layer.setAttribute('aria-hidden','true');
 const img=document.createElement('img');img.src='tyc-gold-wing-star.svg?v=31';img.alt='';img.draggable=false;layer.append(img);brand.append(layer);
 function align(){const bw=brand.clientWidth,bh=brand.clientHeight;if(!bw||!bh)return;const style=getComputedStyle(brand,'::before');const pw=parseFloat(style.width)||bw,ph=parseFloat(style.height)||bh;const fit=Math.min(pw/w,ph/h);const ox=(bw-w*fit)/2,oy=(bh-h*fit)/2;const sx=(r-l+1)/1116,sy=(b-t+1)/735;img.style.left=(ox+(l+(807.5-243)*sx)*fit)+'px';img.style.top=(oy+(t+(500-132)*sy)*fit)+'px';img.style.width=(1365*sx*fit)+'px';img.style.height=(770*sy*fit)+'px';}
 align();if(typeof ResizeObserver==='function')new ResizeObserver(align).observe(brand);else window.addEventListener('resize',align);
 }
 }catch(e){console.warn('Decorative sprout wing unavailable',e);}};
 source.src='header-sprout-transparent.png?v=original30';
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();