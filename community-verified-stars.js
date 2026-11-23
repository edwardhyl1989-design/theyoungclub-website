/* PTA Community / verified-member constellation.
   Exactly one small gold light per approved member; no private member data is sent to clients. */
(()=>{'use strict';
  const panel=document.querySelector('.community-hero-art.community-hero-sprout');
  const field=document.getElementById('community-verified-stars');
  if(!panel||!field)return;
  let previous=null;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');

  // Deterministic pseudo-random position for each index: stars don't jump on refresh
  // and existing stars do not move when another member is approved.
  function randomFor(index,salt){
    let n=(Math.imul(index+1,0x9e3779b1)^(salt*0x85ebca6b))>>>0;
    n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;
    n=Math.imul(n,0x846ca68b);n^=n>>>16;
    return (n>>>0)/4294967296;
  }
  function coords(index){
    // Restrict lights to the outer area, leaving the neon sprout unobstructed.
    const angle=2*Math.PI*randomFor(index,1);
    const r=Math.sqrt(.46+(.93-.46)*randomFor(index,2));
    const x=50+46*r*Math.cos(angle);
    const y=50+44*r*Math.sin(angle);
    return {x:Math.min(95,Math.max(5,x)),y:Math.min(93,Math.max(7,y))};
  }
  function addStar(index){
    const {x,y}=coords(index);
    const star=document.createElement('span');
    star.className='community-verified-star';
    star.setAttribute('aria-hidden','true');
    star.style.setProperty('--star-x',x.toFixed(2)+'%');
    star.style.setProperty('--star-y',y.toFixed(2)+'%');
    star.style.setProperty('--star-size',(2.6+randomFor(index,3)*2.4).toFixed(2)+'px');
    star.style.setProperty('--star-delay',(-randomFor(index,4)*5).toFixed(2)+'s');
    star.style.setProperty('--star-duration',(3.8+randomFor(index,5)*4).toFixed(2)+'s');
    if(randomFor(index,6)>.81)star.classList.add('is-sparkle');
    field.append(star);
  }
  function render(count){
    if(!Number.isSafeInteger(count)||count<0)return;
    if(count===previous)return;
    previous=count;
    const current=field.childElementCount;
    if(current>count){for(let i=current;i>count;i--)field.lastElementChild?.remove();}
    if(current<count){
      // Append in small batches so even a large community doesn't lock the UI.
      let i=current;
      const pump=()=>{
        if(count!==previous)return;
        const target=Math.min(count,i+150);
        for(;i<target;i++)addStar(i);
        if(i<count)window.setTimeout(pump,0);
      };
      pump();
    }
    panel.setAttribute('aria-label','THE YOUNG CLUB glowing sprout surrounded by '+count+' gold stars, one for each verified PTA member');
  }
  async function refresh(db){
    try{
      const {data,error}=await db.rpc('tyc_verified_pta_member_count');
      if(error)throw error;
      const count=Number(data);
      if(Number.isSafeInteger(count)&&count>=0)render(count);
    }catch(err){console.warn('Verified member lights unavailable',err);}
  }
  function init(){
    if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY)return;
    const db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
    refresh(db);
    // Refresh on return and periodically so new approvals appear without reload.
    const poll=window.setInterval(()=>{if(!document.hidden)refresh(db);},60000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(db);});
    window.addEventListener('pagehide',()=>window.clearInterval(poll),{once:true});
  }
  init();
})();