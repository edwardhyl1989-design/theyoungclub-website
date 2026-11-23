/* Shared SHOP brand hover artwork, used by SHOP main and each product page.
   Uses the original retro logo asset with its baked-in background stripped out. */
(()=>{'use strict';
const targets=[...document.querySelectorAll('.shop-racing-brand-art')];
if(!targets.length)return;
const source=new Image();
source.onload=()=>{
 try{
  const w=310,h=94,scale=3,canvas=document.createElement('canvas');
  canvas.width=w*scale;canvas.height=h*scale;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)return;
  ctx.drawImage(source,((w-740)/2-70)*scale,((h-417)/2-28)*scale,740*scale,417*scale);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),p=pixels.data;
  for(let i=0;i<p.length;i+=4){
   const r=p[i],g=p[i+1],b=p[i+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);
   const darkness=(185-hi)/45,chroma=(hi-lo-34)/28;
   p[i+3]=Math.round(255*Math.max(0,Math.min(1,Math.max(darkness,chroma))));
  }
  ctx.putImageData(pixels,0,0);
  const url='url("'+canvas.toDataURL('image/png')+'")';
  targets.forEach(target=>{
   target.style.backgroundImage=url;
   target.style.backgroundSize='100% 100%';
   target.style.backgroundPosition='center';
   target.style.mixBlendMode='normal';
   target.style.webkitMaskImage='none';
   target.style.maskImage='none';
  });
 }catch(e){console.warn('SHOP retro wordmark fallback',e);}
};
source.src='homepage-reference-original.png';
})();