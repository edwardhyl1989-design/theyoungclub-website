/* Only authorized administrators see the Shop banner editing shortcut.
   Mouse hover/focus for 3 seconds; mobile long press. Database RLS protects edits. */
(()=>{'use strict';
 const banner=document.getElementById('shop-hero-carousel');
 const button=document.getElementById('shop-hero-admin-edit');
 if(!banner||!button)return;
 const DELAY=3000;
 let admin=false,hover=false,focus=false,touchStart=null,touchReady=false,timer=null;
 const clear=()=>{if(timer!==null){clearTimeout(timer);timer=null;}};
 const hide=()=>{clear();button.hidden=true;};
 function schedule(){
  clear();
  if(!admin)return;
  timer=setTimeout(()=>{
   timer=null;
   if(admin&&(hover||focus||touchStart)) {button.hidden=false;if(touchStart)touchReady=true;}
  },DELAY);
 }
 button.addEventListener('click',e=>{
  e.stopPropagation();
  window.location.assign('admin-apparel.html#shop-hero-manager');
 });
 // The button itself is part of the carousel so mouse transitions don't cause flicker.
 banner.addEventListener('pointerenter',e=>{
  if(e.pointerType==='mouse'||e.pointerType==='pen'){hover=true;schedule();}
 });
 banner.addEventListener('pointerleave',e=>{
  if(e.pointerType==='mouse'||e.pointerType==='pen'){hover=false;if(!focus)hide();}
 });
 banner.addEventListener('focusin',()=>{
  focus=true;if(!button.hidden)return;schedule();
 });
 banner.addEventListener('focusout',e=>{
  if(!banner.contains(e.relatedTarget)){focus=false;if(!hover)hide();}
 });
 // A stationary 3-second long press exposes the shortcut on touch devices.
 banner.addEventListener('touchstart',e=>{
  if(!admin||e.touches.length!==1||e.target.closest('button'))return;
  const t=e.touches[0];touchStart={x:t.clientX,y:t.clientY};touchReady=false;schedule();
 },{passive:true});
 banner.addEventListener('touchmove',e=>{
  if(!touchStart||e.touches.length!==1)return;
  const t=e.touches[0];
  if(Math.hypot(t.clientX-touchStart.x,t.clientY-touchStart.y)>14){
   touchStart=null;touchReady=false;if(!hover&&!focus)hide();
  }
 },{passive:true});
 banner.addEventListener('touchend',()=>{
  touchStart=null;clear();
  if(!touchReady&&!hover&&!focus)hide();
 });
 banner.addEventListener('touchcancel',()=>{touchStart=null;touchReady=false;if(!hover&&!focus)hide();});
 document.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'&&!banner.contains(e.target)){touchReady=false;if(!hover&&!focus)hide();}
 });
 async function verify(db){
  try{
   const {data,error}=await db.auth.getUser();
   if(error||!data?.user){admin=false;hide();return;}
   const {data:row,error:adminError}=await db.from('job_admins')
     .select('user_id').eq('user_id',data.user.id).maybeSingle();
   admin=!adminError&&!!row;
   if(!admin){hide();return;}
   if(hover||focus||touchStart)schedule();
  }catch(_){admin=false;hide();}
 }
 async function init(){
  if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY)return;
  const db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
  await verify(db);
  db.auth.onAuthStateChange(()=>{
   // Schedule outside auth callback to avoid nested auth calls during token updates.
   setTimeout(()=>{verify(db);},0);
  });
 }
 init().catch(()=>{admin=false;hide();});
})();