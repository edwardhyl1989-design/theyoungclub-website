/* Extract the original racing logo from the original HOME art, retaining its colors. */
(()=>{'use strict';
 const art=new Image();
 art.onload=()=>{
  try {
   const w=700,h=212,c=document.createElement('canvas');c.width=w;c.height=h;
   const ctx=c.getContext('2d',{willReadFrequently:true});
   if(!ctx)return;
   ctx.drawImage(art,art.naturalWidth*285/740,art.naturalHeight*189.5/417,art.naturalWidth*310/740,art.naturalHeight*94/417,0,0,w,h);
   const pixels=ctx.getImageData(0,0,w,h),p=pixels.data;
   const alpha=new Float32Array(w*h),bg=new Float32Array(h*6);
   // The original background is a smooth horizontal/vertical ivory gradient.
   // Estimate each row from the clean narrow margins, not from the logo.
   for(let y=0;y<h;y++){
    for(let ch=0;ch<3;ch++){
     const left=[],right=[];
     for(let x=0;x<Math.max(3,Math.floor(w*.018));x++){left.push(p[(y*w+x)*4+ch]);right.push(p[(y*w+w-1-x)*4+ch]);}
     left.sort((a,b)=>a-b);right.sort((a,b)=>a-b);
     bg[y*6+ch]=left[Math.floor(left.length/2)];bg[y*6+3+ch]=right[Math.floor(right.length/2)];
    }
   }
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const k=y*w+x,i=k*4,t=x/(w-1);let diff=0;
    for(let ch=0;ch<3;ch++){const b=bg[y*6+ch]*(1-t)+bg[y*6+3+ch]*t;diff=Math.max(diff,Math.abs(p[i+ch]-b));}
    alpha[k]=Math.min(1,Math.max(0,(diff-18)/52));
   }
   // Flood-fill only the background connected to the image boundary.
   // Preserve the pale lettering and white outlines enclosed by the logo.
   const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let first=0,last=0;
   const visit=k=>{if(k<0||k>=seen.length||seen[k]||alpha[k]>=.36)return;seen[k]=1;queue[last++]=k;};
   for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}
   for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1);}
   while(first<last){const k=queue[first++],x=k%w;if(x>0)visit(k-1);if(x<w-1)visit(k+1);visit(k-w);visit(k+w);}
   for(let k=0;k<alpha.length;k++){
    const x=k%w,y=Math.floor(k/w),i=k*4;
    if(seen[k]){p[i+3]=0;continue;}
    // Keep interiors opaque; only decontaminate partially transparent edges.
    const near=(x>0&&seen[k-1])||(x<w-1&&seen[k+1])||(y>0&&seen[k-w])||(y<h-1&&seen[k+w]);
    if(!near)continue;
    const a=Math.max(.36,alpha[k]),t=x/(w-1);
    for(let ch=0;ch<3;ch++){const b=bg[y*6+ch]*(1-t)+bg[y*6+3+ch]*t;p[i+ch]=Math.max(0,Math.min(255,(p[i+ch]-b*(1-a))/a));}
    p[i+3]=Math.round(255*a);
   }
   ctx.putImageData(pixels,0,0);
   document.body.style.setProperty('--p-shop-retro-image','url("'+c.toDataURL('image/png')+'")');
   document.body.classList.add('p-shop-retro-ready');
  } catch(e){console.warn('Shop logo transparency unavailable',e);}
 };
 art.src='homepage-reference-original.png';
})();