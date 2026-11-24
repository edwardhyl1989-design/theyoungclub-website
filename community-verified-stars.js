/* PTA Community / verified-member constellation.
   Exactly one small gold light per approved member; no private member data is sent to clients. */
(()=>{'use strict';
  const panel=document.querySelector('.community-hero-art.community-hero-sprout');
  const field=document.getElementById('community-verified-stars');
  if(!panel||!field)return;
  let previous=null;
  let memberNames=[];
  let ownId=null;
  let ownPending=false;
  const sproutTip=document.createElement('button');
  sproutTip.type='button';sproutTip.className='community-sprout-identity';
  sproutTip.setAttribute('aria-label','Grow With Us · 함께 성장해요');
  sproutTip.dataset.tooltip='Grow With Us · 함께 성장해요';
  sproutTip.setAttribute('aria-expanded','false');
  panel.append(sproutTip);
  // Hover/focus displays the tooltip on desktop. Tap/click toggles it on touch.
  function closeSproutMessage(){
    panel.classList.remove('is-sprout-open');
    sproutTip.setAttribute('aria-expanded','false');
  }
  // The arrow/callout is ONLY for guests who have not signed up.
  // Logged-in users, including pending PTA/SPTA applicants, never see it.
  function setGuestInvite(guest){
    panel.classList.toggle('is-sprout-guest',Boolean(guest));
    if(!guest)closeSproutMessage();
  }
  sproutTip.addEventListener('click',event=>{
    event.stopPropagation();
    const opening=!panel.classList.contains('is-sprout-open');
    panel.classList.toggle('is-sprout-open',opening);
    sproutTip.setAttribute('aria-expanded',String(opening));
  });
  document.addEventListener('click',event=>{
    if(!panel.contains(event.target))closeSproutMessage();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')closeSproutMessage();
  });
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
    star.setAttribute('role','img');
    star.dataset.index=String(index);
    applyStarIdentity(star,index);
    star.style.setProperty('--star-x',x.toFixed(2)+'%');
    star.style.setProperty('--star-y',y.toFixed(2)+'%');
    star.style.setProperty('--star-size',(2.6+randomFor(index,3)*2.4).toFixed(2)+'px');
    star.style.setProperty('--star-delay',(-randomFor(index,4)*5).toFixed(2)+'s');
    star.style.setProperty('--star-duration',(3.8+randomFor(index,5)*4).toFixed(2)+'s');
    if(randomFor(index,6)>.81)star.classList.add('is-sparkle');
    field.append(star);
  }
  function applyStarIdentity(star,index){
    const member=memberNames[index];
    const label=member?(member.member_id===ownId?member.member_role:member.nickname+' · '+member.member_role):'PTA';
    // Only the styled tooltip should appear (no browser-native title tooltip).
    star.removeAttribute('title');
    star.dataset.tooltip=label;
    star.setAttribute('aria-label',label);
    star.tabIndex=0;
  }
  function syncNames(){
    for(const star of field.children)applyStarIdentity(star,Number(star.dataset.index));
    const self=memberNames.find(m=>m.member_id===ownId);
    const label=self?self.nickname+' · '+self.member_role:(ownPending?'Grow With Us · 인증 대기 중':'Grow With Us · 함께 성장해요');
    sproutTip.dataset.tooltip=label;
    sproutTip.removeAttribute('title');
    sproutTip.setAttribute('aria-label',label);
  }
  function render(count){
    if(!Number.isSafeInteger(count)||count<0)return;
    if(count===previous){syncNames();return;}
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
    syncNames();
    panel.setAttribute('aria-label','THE YOUNG CLUB glowing sprout surrounded by '+count+' gold stars, one for each verified PTA member');
  }
  async function refresh(db){
    try{
      // Read auth first, so a failing constellation request cannot leave the
      // guest hint in the wrong state. Fail closed while auth is uncertain.
      const auth=await db.auth.getUser();
      if(auth.error)setGuestInvite(false);
      else setGuestInvite(!auth.data?.user);
      ownId=auth.error?null:(auth.data?.user?.id||null);
      const {data,error}=await db.rpc('tyc_verified_pta_member_count');
      if(error)throw error;
      const count=Number(data);
      if(Number.isSafeInteger(count)&&count>=0)render(count);
      // Anonymous/non-approved visitors see only generic lights, never nicknames.
      memberNames=[];
      ownPending=false;
      if(ownId){
       const [list,membership]=await Promise.all([
        db.rpc('tyc_constellation_members'),
        db.from('pta_members').select('membership_status').eq('user_id',ownId).maybeSingle()
       ]);
       if(!list.error&&Array.isArray(list.data))memberNames=list.data;
       if(!membership.error)ownPending=membership.data?.membership_status==='pending';
      }
      syncNames();
    }catch(err){console.warn('Verified member lights unavailable',err);}
  }
  function init(){
    if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY)return;
    const db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
    refresh(db);
    // Switch the hint immediately after signup/login or logout without reload.
    // Never perform database work synchronously in an auth event callback.
    db.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_IN'){
        setGuestInvite(false);
        window.setTimeout(()=>refresh(db),0);
      }else if(event==='SIGNED_OUT'){
        setGuestInvite(true);
        window.setTimeout(()=>refresh(db),0);
      }
    });
    // Refresh on return and periodically so new approvals appear without reload.
    const poll=window.setInterval(()=>{if(!document.hidden)refresh(db);},60000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(db);});
    window.addEventListener('pagehide',()=>window.clearInterval(poll),{once:true});
  }
  init();
})();