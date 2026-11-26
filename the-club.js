(()=>{'use strict';
const $=id=>document.getElementById(id), db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY), bucket=db.storage.from('tyc-club-media');
const categories=['General','Ask a PTA','Fitness & Exercise','Health & Wellness','Career & Education','Useful Resources','Lifestyle','Food','Travel','Opinions','Work','Learning','Tips','Pilates','Yoga','Physical Therapy'];
const topicGroups={feed:['General','Fitness & Exercise','Health & Wellness','Lifestyle','Food','Travel','Pilates','Yoga','Physical Therapy'],discussions:['General','Ask a PTA','Opinions','Work','Learning','Tips'],challenges:['Fitness & Exercise','Health & Wellness']};
const kindGroups={feed:['Photo','Video','Journal'],discussions:['Discussion','Poll'],challenges:['Workout','Challenge']};
const topicOf=p=>p.category==='Life in USA'?'General':p.category==='Career & Education'?'Work':p.category==='Useful Resources'?'Tips':p.category;
// General is shared only as a display label. Post kind identifies the section.
const sectionOf=p=>kindGroups.challenges.includes(p.kind)?'challenges':kindGroups.discussions.includes(p.kind)||['Ask a PTA','Opinions','Work','Learning','Tips'].includes(topicOf(p))?'discussions':'feed';
const savedTypes={All:null,Feed:'feed',Discussions:'discussions',Challenges:'challenges'};
const savedSectionLabel=p=>({feed:'Feed',discussions:'Discussions',challenges:'Challenges'})[sectionOf(p)];
const currentGroup=()=>['discussions','challenges'].includes(tab)?tab:'feed';
let composeGroup='feed',editingPost=null;
let user=null,me=null,admin=false,tab='home',category='',posts=[],profiles=new Map(),likes=[],votes=[],saved=new Set(),savedPosts=[],spaceId=null;
const el=(tag,cls,txt)=>{let n=document.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=txt;return n},btn=(txt,fn,cls)=>{let b=el('button',cls,txt);b.type='button';b.onclick=fn;return b};
const status=t=>$('status').textContent=t, url=p=>bucket.getPublicUrl(p).data.publicUrl;
const checked=async q=>{let r=await q;if(r.error)throw r.error;return r.data};
function guard(){if(user)return true;location.href='auth.html?next=the-club.html';return false}
function ready(){if(!guard())return false;if(!me){status('My Space is getting ready. Please refresh and try again.');return false}return true}
function options(id,items){$(id).replaceChildren(...items.map(v=>{let n=el('option','',v);n.value=v;return n}))}
function configureComposer(group){composeGroup=group;options('kind',kindGroups[group]);options('category',topicGroups[group]);if(topicGroups[group].includes(category))$('category').value=category;$('pollField').hidden=$('kind').value!=='Poll';$('composeStatus').textContent='';$('composer').querySelector('h2').textContent=({feed:'Create Feed post',discussions:'Start a discussion',challenges:'Create a challenge'})[group];}
configureComposer('feed');
$('kind').onchange=()=>{$('pollField').hidden=$('kind').value!=='Poll'};
function setHeaderAvatar(){const pic=$('clubAccountAvatar');pic.src=me?.avatar?url(me.avatar):'club-green-sprout.svg';pic.onerror=()=>{pic.onerror=null;pic.src='club-green-sprout.svg'};$('clubAccountName').textContent=me?.nickname||'My Account';$('clubBell').hidden=!user;}
function closeClubAccount(){ $('clubAccountMenu').hidden=true;$('account').setAttribute('aria-expanded','false');}
$('clubAccountSpace').onclick=()=>{if(!guard())return;closeClubAccount();spaceId=user.id;$('search').value='';switchTab('space')};
$('clubAccountSaved').onclick=()=>{if(!guard())return;closeClubAccount();spaceId=user.id;$('search').value='';switchTab('saved')};
$('clubAccountPoints').onclick=()=>{if(!guard())return;closeClubAccount();switchTab('points')};
/* Milestone chart shows progress only. No rewards are redeemable yet. */
const clubPointsTrack=$('clubPointsTrack');
const clubMilestoneButtons=[...document.querySelectorAll('#clubPoints .club-points-milestone')];
function closeClubMilestoneTips(){
 for(const button of clubMilestoneButtons){
  button.classList.remove('is-open');
  button.setAttribute('aria-expanded','false');
 }
}
function updateClubPointsMilestones(points){
 const valid=points!==null&&Number.isFinite(Number(points));
 const earned=valid?Math.max(0,Math.floor(Number(points))):0;
 let progress=0;
 if(earned>=500)progress=66.6667;
 else if(earned>=100)progress=33.3333+((earned-100)/400)*33.3334;
 else if(earned>=50)progress=((earned-50)/50)*33.3333;
 if(clubPointsTrack)clubPointsTrack.style.setProperty('--club-points-progress',progress.toFixed(2)+'%');
 for(const button of clubMilestoneButtons){
  const threshold=Number(button.dataset.milestone);
  const reached=valid&&earned>=threshold;
  button.classList.toggle('is-reached',reached);
  button.setAttribute('aria-label',threshold+' points milestone. '+(reached?'Milestone reached. ':'Not reached yet. ')+'Benefits and redemption details are coming soon.');
 }
}
for(const button of clubMilestoneButtons){
 button.addEventListener('click',()=>{
  const wasOpen=button.classList.contains('is-open');
  closeClubMilestoneTips();
  if(!wasOpen){button.classList.add('is-open');button.setAttribute('aria-expanded','true');}
 });
}
document.addEventListener('pointerdown',event=>{
 if(!event.target.closest('#clubPoints .club-points-milestone'))closeClubMilestoneTips();
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape')closeClubMilestoneTips();
});
let clubPointsRequest=0;
async function refreshClubPoints(){const req=++clubPointsRequest,uid=user?.id,total=$('clubPointsTotal'),note=$('clubPointsStatus');if(!uid){total.textContent='—';updateClubPointsMilestones(null);note.textContent='Log in to view your points.';return;}note.textContent='Loading…';try{const result=await db.from('club_point_ledger').select('earned_at',{count:'exact',head:true}).eq('recipient_id',uid);if(result.error)throw result.error;if(req!==clubPointsRequest||user?.id!==uid)return;const records=await challengePages(()=>db.from('club_challenge_checkins').select('post_id,checkin_day').eq('user_id',uid).order('post_id').order('checkin_day'));if(req!==clubPointsRequest||user?.id!==uid)return;const counts=new Map();for(const x of records)counts.set(x.post_id,(counts.get(x.post_id)||0)+1);let challengePoints=0;for(const [id,n] of counts){const p=posts.find(p=>p.id===id);challengePoints+=Math.min(n,p?.challenge_days||30);}const likePoints=Number(result.count||0),earned=likePoints+challengePoints;total.textContent=earned.toLocaleString();updateClubPointsMilestones(earned);note.textContent=likePoints+' like points · '+challengePoints+' challenge points';}catch(e){if(req===clubPointsRequest){total.textContent='—';updateClubPointsMilestones(null);note.textContent='Unable to load points. Please refresh.';}}}
$('clubPointsRefresh').onclick=refreshClubPoints;
setInterval(()=>{if(tab==='points'&&!document.hidden)void refreshClubPoints();},30000);
db.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'&&user){user=null;me=null;admin=false;saved=new Set();savedPosts=[];spaceId=null;closeClubAccount();setHeaderAvatar();location.reload();}else if(event==='SIGNED_IN'&&session?.user&&user&&session.user.id!==user.id){location.reload();}});
function avatar(p){let a=el('img','avatar');a.alt='';if(p?.avatar)a.src=url(p.avatar);else a.src='club-green-sprout.svg';return a}
let clubVerifiedRoles=new Map();
async function loadClubVerifiedRoles(){const result=await db.rpc('tyc_constellation_members');if(!result.error&&Array.isArray(result.data)){clubVerifiedRoles=new Map(result.data.filter(x=>['PTA','SPTA'].includes(x.member_role)).map(x=>[x.member_id,x.member_role]));}else{clubVerifiedRoles=new Map();}}
function author(id){let p=profiles.get(id),a=el('div','author');a.append(avatar(p),btn(p?.nickname||'Club member',()=>{spaceId=id;switchTab('space')}));const role=clubVerifiedRoles.get(id);if(role){const b=el('span','club-verified-role'+(role==='SPTA'?' is-spta':''),'✓ '+role+' Verified');b.setAttribute('aria-label','Verified '+role);a.append(b);}return a}
function media(paths){let m=el('div','media');for(let p of paths||[]){if(!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp|avif|gif|mp4|webm)$/i.test(p))continue;let v=/\.(mp4|webm)$/i.test(p),n=el(v?'video':'img');n.src=url(p);if(v){n.controls=true;n.playsInline=true;n.preload='metadata'}else{n.loading='lazy';n.alt='Club member attachment'}m.append(n)}return m}
async function upload(file){const ex={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif','image/gif':'gif','video/mp4':'mp4','video/webm':'webm'}[file.type];if(!ex||file.size>15728640)throw Error('Unsupported file or larger than 15 MB.');let path=user.id+'/'+crypto.randomUUID()+'.'+ex;await checked(bucket.upload(path,file,{contentType:file.type}));return path}
async function toggle(table,id){if(!ready())return;try{let exists=table==='club_likes'?likes.some(x=>x.post_id===id&&x.user_id===user.id):saved.has(id);await checked(exists?db.from(table).delete().eq('post_id',id).eq('user_id',user.id):db.from(table).insert({post_id:id,user_id:user.id}));await load();await refreshFeatured()}catch(e){status(e.message)}}
function poll(p){let d=el('div','poll'),v=votes.filter(x=>x.post_id===p.id),mine=v.find(x=>x.user_id===user?.id);p.poll_options.forEach((o,i)=>{let count=v.filter(x=>x.choice===i).length,b=btn(o+' · '+count+' votes',async()=>{if(!ready()||mine)return;try{await checked(db.from('club_votes').insert({post_id:p.id,user_id:user.id,choice:i}));await load();if($('detail').open)await openPost(p.id)}catch(e){status(e.message)}});if(mine)b.disabled=true;d.append(b)});return d}
function detailCard(p,full=false){let a=el('article','post');if(p.media?.length)a.append(media(p.media));if(p.kind==='Challenge'&&!(p.media||[]).some(x=>/\.(jpg|jpeg|png|webp|avif|gif)$/i.test(x))){const cover=challengeCoverURL(p.challenge_cover||p.challenge_activity);if(cover){let gallery=a.querySelector('.media');if(!gallery){gallery=el('div','media');a.prepend(gallery);}const im=el('img','challenge-detail-cover');im.src=cover;im.alt='Challenge cover';im.onerror=challengeCoverError(im,p.challenge_cover||p.challenge_activity,800,()=>im.remove());gallery.prepend(im);}}let c=el('div','copy');c.append(el('div','meta',topicOf(p).toUpperCase()+' / '+p.kind.toUpperCase()),author(p.author_id),el('h3','',p.title),el('p','',full?p.body:(p.body.length>500?p.body.slice(0,500)+'…':p.body)));if(p.kind==='Poll')c.append(poll(p));let actions=el('div','actions'),liked=likes.some(x=>x.post_id===p.id&&x.user_id===user?.id);actions.append(btn('♡ '+likes.filter(x=>x.post_id===p.id).length,()=>toggle('club_likes',p.id),liked?'active':''),btn('Comments',()=>openPost(p.id)),btn(saved.has(p.id)?'Saved ✓':'Save',()=>toggle('club_saved',p.id)),btn('Report',async()=>{if(!guard())return;let reason=prompt('Reason for reporting');if(!reason?.trim())return;try{await checked(db.from('club_reports').insert({post_id:p.id,reporter_id:user.id,reason:reason.trim().slice(0,500)}));status('Report submitted.')}catch(e){status(e.message)}}));if(user&&p.author_id===user.id)actions.append(btn('Edit',()=>editClubPost(p)));if(user&&(admin||p.author_id===user.id))actions.append(btn('Delete',async()=>{if(!confirm('Delete this post?'))return;try{await deleteClubPost(p);if($('detail').open)$('detail').close();await load()}catch(e){status(e.message)}}));c.append(actions);a.append(c);return a}
const feedIcons={heart:'<path d="M20.8 4.8a5.3 5.3 0 0 0-7.5 0L12 6.1l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z"/>',comment:'<path d="M21 11a8 8 0 0 1-8 8H9l-5 3 1-6a8 8 0 0 1-2-5 8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z"/>',save:'<path d="M6 3h12v18l-6-4-6 4Z"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'};
let commentCounts=new Map();
function feedIcon(key){const n=el('span','feed-icon');n.innerHTML='<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+feedIcons[key]+'</svg>';return n}
function actionIcon(key,label,count,fn,active=false){const b=btn('',fn,'feed-action'+(active?' is-active':''));b.setAttribute('aria-label',label);b.title=label;b.append(feedIcon(key));if(count!=null)b.append(el('span','',String(count)));if(key==='heart'||key==='save')b.setAttribute('aria-pressed',String(active));return b}
function relativeDate(value){const m=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/60000));if(m<1)return 'Just now';if(m<60)return m+'m ago';if(m<1440)return Math.floor(m/60)+'h ago';if(m<10080)return Math.floor(m/1440)+'d ago';return new Date(value).toLocaleDateString()}
function card(p,full=false){if(full)return detailCard(p,true);const a=el('article','post feed-row');const first=(p.media||[]).find(x=>/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp|avif|gif|mp4|webm)$/i.test(x));if(first){const t=btn('',()=>openPost(p.id),'feed-thumb');t.setAttribute('aria-label','Open '+p.title);const isVideo=/\.(mp4|webm)$/i.test(first),m=el(isVideo?'video':'img');m.src=url(first);if(isVideo){m.muted=true;m.playsInline=true;m.preload='metadata';t.append(m,el('span','feed-play','▶'))}else{m.loading='lazy';m.alt='';t.append(m)}a.append(t)}else a.classList.add('text-only');const c=el('div','feed-copy'),top=el('div','feed-top'),tag=el('span','feed-category',topicOf(p)==='Fitness & Exercise'?'Fitness':topicOf(p)==='Health & Wellness'?'Wellness':topicOf(p)==='Career & Education'?'Career':topicOf(p)==='Useful Resources'?'Resources':topicOf(p));const menu=el('details','feed-menu'),summary=el('summary');summary.setAttribute('aria-label','Post options');summary.append(feedIcon('more'));menu.append(summary);const choices=el('div','feed-menu-items');choices.append(btn('Report',async()=>{menu.open=false;if(!guard())return;const reason=prompt('Reason for reporting');if(!reason?.trim())return;try{await checked(db.from('club_reports').insert({post_id:p.id,reporter_id:user.id,reason:reason.trim().slice(0,500)}));status('Report submitted.')}catch(e){status(e.message)}}));if(user&&p.author_id===user.id)choices.append(btn('Edit',()=>{menu.open=false;editClubPost(p)}));if(user&&(admin||p.author_id===user.id))choices.append(btn('Delete',async()=>{menu.open=false;if(!confirm('Delete this post?'))return;try{await deleteClubPost(p);await load()}catch(e){status(e.message)}}));menu.append(choices);if(tab==='saved')tag.textContent=savedSectionLabel(p)+' · '+tag.textContent;top.append(tag,menu);const title=btn(p.title,()=>openPost(p.id),'feed-title');const body=el('p','feed-excerpt',p.body);const bottom=el('div','feed-bottom'),by=el('div','feed-byline');by.append(author(p.author_id),el('span','feed-time','· '+relativeDate(p.created_at)));const actions=el('div','feed-actions'),liked=likes.some(x=>x.post_id===p.id&&x.user_id===user?.id);actions.append(actionIcon('heart','Like',likes.filter(x=>x.post_id===p.id).length,()=>toggle('club_likes',p.id),liked),actionIcon('comment','Comments',commentCounts.get(p.id)??0,()=>openPost(p.id)),actionIcon('save','Save post',null,()=>toggle('club_saved',p.id),saved.has(p.id)));bottom.append(by,actions);c.append(top,title,body);if(p.kind==='Poll')c.append(poll(p));c.append(bottom);a.append(c);return a}
async function refreshCommentCounts(){const ids=[...new Set([...posts,...savedPosts].map(p=>p.id))];const counts=new Map();for(let i=0;i<ids.length;i+=50){const result=await db.from('club_comments').select('post_id').in('post_id',ids.slice(i,i+50));if(result.error)return;for(const r of result.data||[])counts.set(r.post_id,(counts.get(r.post_id)||0)+1);}commentCounts=counts;}


function renderHomeChallenges(){
 const section=$('homeChallenges'),track=$('homeChallengeTrack');if(!section||!track)return;
 const visible=['home','feed'].includes(tab);section.hidden=!visible;if(!visible)return;
 const offset=track.scrollLeft,counts=new Map(),now=Date.now();
 for(const row of likes)counts.set(row.post_id,(counts.get(row.post_id)||0)+1);
 const ranked=posts.filter(p=>p.kind==='Challenge'&&challengeActive(p,now)).sort((a,b)=>(counts.get(b.id)||0)-(counts.get(a.id)||0)||Date.parse(b.created_at)-Date.parse(a.created_at)||String(b.id).localeCompare(String(a.id))).slice(0,2);
 track.replaceChildren();
 for(const p of ranked){
  const profile=profiles.get(p.author_id),b=btn('',()=>openPost(p.id),'club-featured-post home-challenge-card'),thumb=el('div','featured-thumb');
  b.setAttribute('aria-label','Open challenge: '+p.title);
  const uploaded=(p.media||[]).find(x=>/\.(jpg|jpeg|png|webp|avif|gif)$/i.test(x)),key=p.challenge_cover||p.challenge_activity,cover=uploaded?url(uploaded):challengeCoverURL(key);
  const fallback=()=>thumb.replaceChildren(el('span','featured-text-preview',p.title));
  if(cover){const img=el('img');img.src=cover;img.loading='lazy';img.alt='';img.onerror=challengeCoverError(img,uploaded?'':key,800,fallback);thumb.append(img);}else fallback();
  const copy=el('div','featured-copy'),meta=el('div','featured-meta'),count=counts.get(p.id)||0;
  const duration=el('span','home-challenge-duration',(p.challenge_days||30)+' days');
  const heart=el('span','featured-heart','♡ '+count);heart.setAttribute('aria-label',count+' likes');
  meta.append(avatar(profile),el('span','featured-name',profile?.nickname||'Club member'),duration,heart);
  if(p.is_official_challenge)thumb.append(el('span','challenge-official-overlay','★ Official'));copy.append(el('strong','featured-title',p.title),meta);b.append(thumb,copy);track.append(b);
 }
 if(!ranked.length)track.append(el('p','featured-empty','No active challenges yet.'));
 track.scrollLeft=Math.min(offset,Math.max(0,track.scrollWidth-track.clientWidth));
}

function renderHighlights(){
 const strip=$('clubHighlights'),track=$('highlightMembers');if(!strip||!track)return;
 strip.hidden=!['home','feed'].includes(tab);
 const newest=posts.filter(p=>sectionOf(p)==='feed').sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||String(b.id).localeCompare(String(a.id)));const ids=[...new Set(newest.map(p=>p.author_id))].filter(id=>profiles.has(id)).slice(0,30);
 track.replaceChildren();
 for(const id of ids){const p=profiles.get(id);const b=btn('',()=>{spaceId=id;$('search').value='';switchTab('space');$('space').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},'highlight-member');
 b.setAttribute('aria-label','View posts by '+p.nickname);b.title=p.nickname;
 const ring=el('span','highlight-avatar');const pic=avatar(p);pic.loading='lazy';pic.onerror=()=>{pic.onerror=null;pic.src='club-green-sprout.svg'};ring.append(pic);b.append(ring,el('span','highlight-name',p.nickname));track.append(b);}
 $('highlightEmpty').hidden=ids.length>0;
}
/* Compact, accessible featured carousel arrows. Keep touch swipe available,
   but never show a visible browser horizontal scrollbar. */
const featuredRail=$('featuredTrack');
const featuredArrowPrev=$('featuredPrev');
const featuredArrowNext=$('featuredNext');
function updateFeaturedArrows(){
 if(!featuredRail||!featuredArrowPrev||!featuredArrowNext)return;
 const max=Math.max(0,featuredRail.scrollWidth-featuredRail.clientWidth);
 const hasCards=!!featuredRail.querySelector('.club-featured-post');
 const canSlide=hasCards&&featuredRail.clientWidth>0&&max>4;
 featuredArrowPrev.hidden=!canSlide||featuredRail.scrollLeft<=3;
 featuredArrowNext.hidden=!canSlide||featuredRail.scrollLeft>=max-3;
}
function slideFeatured(direction){
 if(!featuredRail)return;
 const cards=[...featuredRail.querySelectorAll('.club-featured-post')];
 if(!cards.length)return;
 const base=cards[0].offsetLeft;
 const positions=cards.map(card=>card.offsetLeft-base);
 const now=featuredRail.scrollLeft;
 const max=Math.max(0,featuredRail.scrollWidth-featuredRail.clientWidth);
 const next=direction>0
  ?(positions.find(x=>x>now+3)??max)
  :([...positions].reverse().find(x=>x<now-3)??0);
 const target=Math.max(0,Math.min(max,next));
 featuredRail.scrollTo({left:target,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}
if(featuredRail&&featuredArrowPrev&&featuredArrowNext){
 featuredArrowPrev.addEventListener('click',()=>slideFeatured(-1));
 featuredArrowNext.addEventListener('click',()=>slideFeatured(1));
 featuredRail.addEventListener('scroll',updateFeaturedArrows,{passive:true});
 featuredRail.tabIndex=0;
 featuredRail.setAttribute('role','region');
 featuredRail.setAttribute('aria-label','Featured Posts carousel');
 featuredRail.addEventListener('keydown',event=>{
  if(event.target!==featuredRail)return;
  if(event.key==='ArrowRight'){event.preventDefault();slideFeatured(1);}
  else if(event.key==='ArrowLeft'){event.preventDefault();slideFeatured(-1);}
 });
 window.addEventListener('resize',()=>requestAnimationFrame(updateFeaturedArrows),{passive:true});
 if('ResizeObserver' in window)new ResizeObserver(()=>requestAnimationFrame(updateFeaturedArrows)).observe(featuredRail);
}
let featured=[],featuredBusy=false,featuredError=false;
function renderFeatured(){const rail=$('featuredTrack');if(!rail)return;const previousScroll=rail.scrollLeft;rail.replaceChildren();for(const row of featured.filter(r=>sectionOf(r.post)==='feed')){const p=row.post,profile=profiles.get(p.author_id),b=btn('',()=>openPost(p.id),'club-featured-post');const thumb=el('div','featured-thumb');const first=(p.media||[]).find(x=>/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp|avif|gif|mp4|webm)$/i.test(x));if(first){const video=/\.(mp4|webm)$/i.test(first),m=el(video?'video':'img');m.src=url(first);if(video){m.muted=true;m.playsInline=true;m.preload='metadata';m.setAttribute('aria-hidden','true');}else{m.loading='lazy';m.alt='';}thumb.append(m);if(video)thumb.append(el('span','featured-video-mark','▶'));}else{thumb.append(el('span','featured-text-preview',p.body.slice(0,130)||p.title));}const copy=el('div','featured-copy'),meta=el('div','featured-meta'),name=el('span','featured-name',profile?.nickname||'Club member');meta.append(avatar(profile),name,el('span','featured-heart','♡ '+row.daily_likes));copy.append(el('strong','featured-title',p.title),meta);b.append(thumb,copy);rail.append(b);}if(!featured.some(r=>sectionOf(r.post)==='feed'))rail.append(el('p','featured-empty',featuredError?'Unable to load featured posts. Please refresh.':'No featured posts yet today. Give a Feed post a like!'));if(previousScroll>0)rail.scrollLeft=Math.min(previousScroll,Math.max(0,rail.scrollWidth-rail.clientWidth));requestAnimationFrame(updateFeaturedArrows);}
async function refreshFeatured(){if(featuredBusy||document.hidden)return;featuredBusy=true;try{featured=await checked(db.rpc('club_daily_featured'));featuredError=false;renderFeatured();}catch(e){featured=[];featuredError=true;renderFeatured();}finally{featuredBusy=false;}}
let discussionOpenId=null;
const clubViewCounts=new Map();
async function refreshClubViewCounts(){const ids=posts.filter(p=>sectionOf(p)==='discussions').map(p=>p.id);if(!ids.length||!window.TYC_Views)return;const counts=await window.TYC_Views.counts('club',ids);for(const [id,n] of counts)clubViewCounts.set(id,Math.max(n,clubViewCounts.get(id)||0));}
async function countClubDiscussionView(id){const n=await window.TYC_Views?.record('club',id);if(n==null)return;const value=Math.max(n,clubViewCounts.get(id)||0);clubViewCounts.set(id,value);for(const cell of document.querySelectorAll('.discussion-views[data-post-id]'))if(cell.dataset.postId===id){cell.querySelector('.discussion-view-value').textContent=value.toLocaleString('en-US');cell.setAttribute('aria-label',value+' views');}}
function renderDiscussionBoard(list){list=[...list].sort((a,b)=>Number(b.is_notice)-Number(a.is_notice)||Number(b.is_pinned)-Number(a.is_pinned));const host=$('feed'),table=el('table','club-discussion-table'),head=el('thead'),hr=el('tr');for(const label of ['No.','Topic','Title','Author','Date','Views','Likes','Replies','']){const th=el('th','',label);th.scope='col';hr.append(th);}head.append(hr);table.append(head);const body=el('tbody');const ranked=posts.filter(p=>sectionOf(p)==='discussions').sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)||String(a.id).localeCompare(String(b.id)));const ranks=new Map(ranked.map((p,i)=>[p.id,i+1]));for(const p of list){const row=el('tr',(p.is_notice?'discussion-notice-row ':'')+(p.id===discussionOpenId?'discussion-selected-row':'')),source=card(p),category=topicOf(p),topic=category==='Career & Education'?'Career':category==='Useful Resources'?'Resources':category;const no=el('td','discussion-no',p.is_notice?'NOTICE':String(ranks.get(p.id)||'')),cat=el('td','discussion-topic');cat.append(el('span','feed-category',topic));const title=el('td','discussion-title'),link=btn(p.title,()=>openPost(p.id),'discussion-title-link');title.append(link);if(p.is_pinned&&!p.is_notice)title.append(el('span','discussion-pin','📌'));const replies=commentCounts.get(p.id)||0;if(replies)title.append(el('span','discussion-reply-count','['+replies+']'));const age=Date.now()-Date.parse(p.created_at);if(age>=0&&age<86400000)title.append(el('span','discussion-new','NEW'));const who=el('td','discussion-author');who.append(author(p.author_id));const dateFull=new Date(p.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),dateShort=new Date(p.created_at).toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'2-digit'});const date=el('td','discussion-date'),fullDate=el('time','discussion-date-full',dateFull),compactDate=el('time','discussion-date-short',dateShort);fullDate.dateTime=p.created_at;compactDate.dateTime=p.created_at;date.title=dateFull;date.append(fullDate,compactDate);const views=el('td','discussion-views');views.dataset.postId=p.id;const viewTotal=clubViewCounts.get(p.id)||0;views.setAttribute('aria-label',viewTotal+' views');const eye=el('span','discussion-view-icon');eye.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';views.append(eye,el('span','discussion-view-value',viewTotal.toLocaleString('en-US')));const hearts=el('td','discussion-likes'),liked=likes.some(x=>x.post_id===p.id&&x.user_id===user?.id);hearts.append(actionIcon('heart','Like',likes.filter(x=>x.post_id===p.id).length,()=>toggle('club_likes',p.id),liked));const comments=el('td','discussion-replies'),replyButton=btn('',()=>openPost(p.id),'discussion-count-button');replyButton.setAttribute('aria-label',replies+' replies');replyButton.append(feedIcon('comment'),el('span','discussion-reply-value',String(replies)));comments.append(replyButton);const tools=el('td','discussion-tools');const menu=source.querySelector('.feed-menu');if(admin)appendDiscussionModeration(menu.querySelector('.feed-menu-items'),p);tools.append(actionIcon('save','Save post',null,()=>toggle('club_saved',p.id),saved.has(p.id)),menu);row.append(no,cat,title,who,date,views,hearts,comments,tools);row.title=String(p.title||'Discussion')+' · '+(profiles.get(p.author_id)?.nickname||'Club member')+' · '+dateFull;row.tabIndex=0;row.setAttribute('aria-label','Open discussion: '+String(p.title||'Untitled'));row.addEventListener('click',event=>{if(event.target.closest('button,a,summary,details,input,select,textarea'))return;void openPost(p.id);});row.addEventListener('keydown',event=>{if(event.target!==row)return;if(event.key==='Enter'||event.key===' '){event.preventDefault();void openPost(p.id);}});body.append(row);}if(!list.length){const row=el('tr'),cell=el('td','discussion-empty','No discussions yet. Be the first to start a conversation.');cell.colSpan=9;row.append(cell);body.append(row);}table.append(body);const wrap=el('div','club-discussion-board');wrap.append(table);host.replaceChildren(wrap);}
// Personal spaces use a compact gallery rather than the shared Feed cards.
function spacePostTile(p){
 const files=(p.media||[]).filter(x=>/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp|avif|gif|mp4|webm)$/i.test(x));
 const cover=files[0],isVideo=cover&&/\.(mp4|webm)$/i.test(cover);
 const tile=btn('',()=>openPost(p.id),'space-post-tile'+(cover?' has-media':' is-journal'));
 tile.setAttribute('aria-label','Open post: '+(p.title||'Untitled'));
 tile.title=p.title||'Open post';
 if(cover){
  const m=el(isVideo?'video':'img','space-post-media');m.src=url(cover);
  if(isVideo){m.muted=true;m.playsInline=true;m.preload='metadata';m.setAttribute('aria-hidden','true');}
  else{m.alt='';m.loading='lazy';m.decoding='async';}
  const fallback=el('span','space-media-fallback',p.title||'Open post');fallback.hidden=true;
  m.addEventListener('error',()=>{m.hidden=true;fallback.hidden=false;});
  tile.append(m,fallback);
  if(isVideo||files.length>1){
   const badges=el('span','space-post-badges');
   if(isVideo){const play=el('span','space-post-badge');play.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg>';badges.append(play);}
   if(files.length>1){const stack=el('span','space-post-badge');stack.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="13" height="13" rx="3"/><path d="M20 8v9a3 3 0 0 1-3 3H8"/></svg>';stack.title=files.length+' attachments';badges.append(stack);}
   badges.setAttribute('aria-hidden','true');tile.append(badges);
  }
 }else{
  const label=el('span','space-journal-label',p.kind==='Journal'?'Journal':topicOf(p)||p.kind||'Post');
  const title=el('strong','space-journal-title',p.title||'Untitled');
  const body=el('span','space-journal-excerpt',p.body||'');
  tile.append(label,title,body,el('span','space-journal-date',relativeDate(p.created_at)));
 }
 return tile;
}
function render(){scheduleChallengeExpiry();renderHomeChallenges();renderMyChallenges();renderChallengeBrowse();refreshChallengeDetailProgress();const challengeView=tab==='challenges';$('activeChallengeSection').hidden=!challengeView;$('feed').classList.toggle('is-challenge-grid',challengeView);renderChallengeSignals();const savedView=tab==='saved';const pointsView=tab==='points';$('clubPoints').hidden=!pointsView;const friendsView=tab==='friends';const spaceView=tab==='space';$('feed').classList.toggle('is-space-gallery',spaceView);$('discussionDetail').hidden=tab!=='discussions'||!discussionOpenId;$('feed').classList.toggle('is-discussion-board',tab==='discussions');$('clubFriends').hidden=!friendsView;for(const sel of ['.topic-heading','#categories','.section-head','#filters','#feed','#status'])document.querySelector(sel).hidden=friendsView||pointsView;for(const sel of ['.topic-heading','#categories','#contentTypes','#filters'])document.querySelector(sel).hidden=friendsView||pointsView||spaceView;$('filters').hidden=friendsView||pointsView||spaceView||tab==='discussions';if(savedView){document.querySelector('.topic-heading').hidden=true;$('categories').hidden=true;}$('create').parentElement.hidden=savedView||challengeView;if(challengeView){$('contentTypes').hidden=true;$('filters').hidden=true;document.querySelector('.topic-heading').hidden=true;$('categories').hidden=true;}else document.querySelector('.topic-heading').textContent='Explore by Topic';if(pointsView){document.querySelector('.club-intro').hidden=true;document.querySelector('.club-featured').hidden=true;$('clubHomeTabs').hidden=true;$('clubHighlights').hidden=true;$('space').hidden=true;void refreshClubPoints();return;}if(friendsView){document.querySelector('.club-intro').hidden=true;document.querySelector('.club-featured').hidden=true;$('clubHomeTabs').hidden=true;$('clubHighlights').hidden=true;$('space').hidden=true;renderFriends();return;}document.querySelector('.club-intro').hidden=!['home','feed','discussions','challenges'].includes(tab);document.querySelector('.club-featured').hidden=!['home','feed'].includes(tab);$('clubHomeTabs').hidden=!['home','feed','discussions','challenges'].includes(tab);renderFeatured();renderHighlights();let q=$('search').value.toLowerCase(),list=(savedView?savedPosts:posts).filter(p=>(savedView||!category||topicOf(p)===category)&&(!q||(p.title+' '+p.body).toLowerCase().includes(q)));if(savedView){const group=savedTypes[contentType];if(group)list=list.filter(p=>sectionOf(p)===group);}else if(contentType!=='All')list=list.filter(p=>contentType==='Photos'?p.kind==='Photo'||p.media?.some(x=>/\.(jpg|png|webp|avif|gif)$/i.test(x)):contentType==='Videos'?p.kind==='Video'||p.media?.some(x=>/\.(mp4|webm)$/i.test(x)):['Discussion','Poll'].includes(p.kind));if(['home','feed','discussions','challenges'].includes(tab))list=list.filter(p=>sectionOf(p)===currentGroup());if(tab==='saved')list=list.filter(p=>saved.has(p.id));if(tab==='space')list=list.filter(p=>p.author_id===spaceId);const newestFirst=(a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||String(b.id).localeCompare(String(a.id));if(tab==='discussions'){
 const likesByPost=new Map(),repliesByPost=commentCounts;
 for(const like of likes)likesByPost.set(like.post_id,(likesByPost.get(like.post_id)||0)+1);
 const score=discussionSort==='views'?p=>clubViewCounts.get(p.id)||0:discussionSort==='likes'?p=>likesByPost.get(p.id)||0:discussionSort==='replies'?p=>repliesByPost.get(p.id)||0:p=>Date.parse(p.created_at);
 list.sort((a,b)=>score(b)-score(a)||newestFirst(a,b));
}else list.sort(!challengeView&&$('sort').value==='popular'?(a,b)=>likes.filter(x=>x.post_id===b.id).length-likes.filter(x=>x.post_id===a.id).length||newestFirst(a,b):newestFirst);if(challengeView){renderChallengeDashboard(list);}else if(tab==='discussions'){renderDiscussionBoard(list);$('feed').hidden=false;}else{$('feed').replaceChildren(...list.map(p=>spaceView?spacePostTile(p):card(p)));if(!list.length)$('feed').append(el('div','empty',savedView?(savedPosts.length?'No saved posts match this filter.':'No saved posts yet. Save posts from Feed, Discussions or Challenges to see them here.'):challengeView?'No challenges yet. Choose Fitness or Wellness to start one.':'Nothing here yet. Be the first to share.'));}$('space').hidden=tab!=='space';if(tab==='space')renderSpace()}
let friendIds=new Set(),friendRows=[],friendInbox=new Map(),friendsLoading=false,friendBusy=false;
async function refreshFriends(){if(!user||friendsLoading)return;friendsLoading=true;const uid=user.id;try{const [rows,inbox]=await Promise.all([checked(db.from('club_friends').select('added_by,friend_id,created_at').or('added_by.eq.'+uid+',friend_id.eq.'+uid)),checked(db.rpc('tyc_dm_inbox'))]);if(user?.id!==uid)return;const old=friendIds;friendRows=rows;friendIds=new Set(rows.map(x=>x.added_by===uid?x.friend_id:x.added_by));friendInbox=new Map((inbox||[]).map(x=>[x.peer,x]));window.TYC_ClubFriendIds=friendIds;const n=[...friendIds].reduce((a,id)=>a+Number(friendInbox.get(id)?.unread||0),0);$('clubMessageCount').hidden=!n;$('clubMessageCount').textContent=n>99?'99+':String(n);if(tab==='friends')renderFriends();if(tab==='space'&&old.has(spaceId)!==friendIds.has(spaceId))renderSpace();}catch(e){$('clubFriendStatus').textContent=e.message||'Unable to load friends';}finally{friendsLoading=false;}}
function renderFriends(){const list=$('clubFriendList'),q=$('clubFriendSearch').value.trim().toLowerCase();list.replaceChildren();const ids=[...friendIds].sort((a,b)=>Date.parse(friendInbox.get(b)?.last_at||0)-Date.parse(friendInbox.get(a)?.last_at||0));for(const id of ids){const p=profiles.get(id),inbox=friendInbox.get(id),name=p?.nickname||inbox?.profile?.nickname||'Club member';if(q&&!name.toLowerCase().includes(q))continue;const row=el('div','club-friend-row'),chat=btn('',()=>openFriendChat(id),'club-friend-chat'),label=el('div','club-friend-label');label.append(el('strong','',name),el('small','',inbox?.last_text||'Start a conversation'));chat.append(avatar(p),label);if(inbox?.unread)chat.append(el('span','club-friend-unread',String(inbox.unread)));row.append(chat,btn('View Space',()=>{spaceId=id;switchTab('space')},'club-friend-view'),btn('Unfriend',()=>toggleFriend(id),'club-friend-remove'));list.append(row);}if(!list.childElementCount)list.append(el('p','club-friends-empty',q?'No matching friends.':'No friends yet. Visit a member’s My Space and choose Add Friend.'));}
async function toggleFriend(id){if(!guard()||friendBusy||id===user.id)return;const uid=user.id,remove=friendIds.has(id);if(remove&&!confirm('Remove this friend? Existing messages will be kept.'))return;friendBusy=true;try{if(remove){await checked(db.from('club_friends').delete().or('and(added_by.eq.'+uid+',friend_id.eq.'+id+'),and(added_by.eq.'+id+',friend_id.eq.'+uid+')'));friendIds.delete(id);window.TYC_MemberDM?.close();}else{const res=await db.from('club_friends').insert({added_by:uid,friend_id:id});if(res.error&&res.error.code!=='23505')throw res.error;friendIds.add(id);}window.TYC_ClubFriendIds=friendIds;await refreshFriends();if(tab==='space')renderSpace();else if(tab==='friends')renderFriends();}catch(e){alert(e.message||'Unable to update friends');}finally{friendBusy=false;}}
function openFriendChat(id){if(!friendIds.has(id))return;if(tab!=='friends')switchTab('friends');$('clubChatPlaceholder').hidden=true;window.TYC_MemberDM?.message(id);}
$('clubFriendSearch').oninput=renderFriends;
window.addEventListener('tyc-club-chat-closed',()=>{$('clubChatPlaceholder').hidden=false;});
setInterval(()=>{if(!document.hidden)void refreshFriends();},5000);
/* Open the avatar at its stored resolution, not as an enlarged 65px thumbnail.
   The owner retains the existing edit-photo shortcut instead of this viewer. */
const clubAvatarViewer=$('clubAvatarViewer');
const clubAvatarViewerImage=$('clubAvatarViewerImage');
const clubAvatarViewerName=$('clubAvatarViewerName');
$('clubAvatarViewerClose').addEventListener('click',()=>clubAvatarViewer.close());
clubAvatarViewer.addEventListener('click',event=>{
 if(event.target===clubAvatarViewer)clubAvatarViewer.close();
});
clubAvatarViewer.addEventListener('close',()=>{clubAvatarViewerImage.removeAttribute('src');});
function openMemberAvatarViewer(profile,thumbnail){
 const nickname=String(profile?.nickname||'Club member');
 clubAvatarViewerName.textContent=nickname;
 clubAvatarViewerImage.alt=nickname+' profile photo';
 clubAvatarViewerImage.onerror=()=>{clubAvatarViewerImage.onerror=null;clubAvatarViewerImage.src='club-green-sprout.svg';};
 clubAvatarViewerImage.src=thumbnail?.currentSrc||thumbnail?.src||'club-green-sprout.svg';
 if(!clubAvatarViewer.open)clubAvatarViewer.showModal();
}
function renderSpace(){const box=$('space'),owner=spaceId===user?.id;let p=profiles.get(spaceId);box.replaceChildren();if(!p&&owner){p={user_id:user.id,nickname:user.user_metadata?.display_name||'Member_'+user.id.replace(/-/g,'').slice(0,8),tagline:'',bio:'',theme:'#254638',avatar:null,cover:null};}if(!p){box.append(el('p','space-empty-notice','This member has not opened their space yet.'));return;}const h=el('div','spacehero space-profile');const theme=/^#[0-9a-f]{6}$/i.test(p.theme||'')?p.theme:'#254638';h.style.setProperty('--space-theme',owner&&$('profileDialog').open&&!$('profileDialog').classList.contains('avatar-only')?($('theme').value||theme):theme);
 const cover=el('div','space-profile-cover');if(p.cover){const img=el('img','cover');img.src=url(p.cover);img.alt='Member cover';cover.append(img);cover.classList.add('has-custom-cover');}else{const branding=el('div','space-profile-brand');const mark=el('img','space-profile-mark');mark.src='club-green-sprout.svg';mark.alt='';branding.append(mark,el('strong','','MY SPACE'),el('span','','A little space to share, grow & connect'));cover.append(branding);}if(owner){const addCover=btn('',chooseQuickCover,'space-cover-add');addCover.title='Change cover photo';addCover.setAttribute('aria-label',addCover.title);addCover.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';cover.append(addCover);}
 const info=el('div','space-profile-info'),identity=el('div','space-profile-identity'),pic=avatar(p),names=el('div','space-profile-names'),nameLine=el('div','space-profile-name-line');pic.onerror=()=>{pic.onerror=null;pic.src='club-green-sprout.svg';};nameLine.append(el('h2','',p.nickname));const role=clubVerifiedRoles.get(spaceId);if(role)nameLine.append(el('span','club-verified-role'+(role==='SPTA'?' is-spta':''),'✓ '+role+' Verified'));names.append(nameLine);if(p.tagline)names.append(el('h3','',p.tagline));else if(owner)names.append(btn('+ Add a tagline',()=>editProfile('tagline'),'space-add-text'));if(owner){const photoButton=btn('',()=>chooseQuickAvatar(),'space-avatar-edit');photoButton.title='Change profile photo';photoButton.setAttribute('aria-label',photoButton.title);photoButton.append(pic);identity.append(photoButton,names);}else{const photoViewerButton=btn('',()=>openMemberAvatarViewer(p,pic),'space-avatar-view');photoViewerButton.title='View enlarged profile photo';photoViewerButton.setAttribute('aria-label',String(p.nickname||'Member')+' · View enlarged profile photo');photoViewerButton.append(pic);identity.append(photoViewerButton,names);}info.append(identity);if(p.bio)info.append(el('p','space-profile-bio',p.bio));else if(owner)info.append(btn('+ Add your bio',()=>editProfile('bio'),'space-add-text space-add-bio'));const controls=el('div','space-profile-controls');if(owner)controls.append(btn('Edit My Space',()=>editProfile(),'lime'),btn('Saved posts',()=>switchTab('saved')));else if(user){const id=spaceId;controls.append(btn(friendIds.has(id)?'Unfriend':'+ Add Friend',()=>toggleFriend(id),'lime'));if(friendIds.has(id))controls.append(btn('Message',()=>openFriendChat(id)));}if(controls.childElementCount)info.append(controls);h.append(cover,info);box.append(h);if(owner&&challengeLoaded&&!challengeDataError)box.append(challengeSpaceStats());}
// Keep Club navigation in browser history rather than leaving the Club on Back.
const clubHistoryTabs=new Set(['home','feed','discussions','challenges','space','friends','saved','points']);
let clubHistoryReady=false,clubRestoringHistory=false;
let clubModalPostId=null,clubIgnoreDetailCloseEvents=0;
function clubSnapshot(){return {tycClub:true,tab,discussionId:tab==='discussions'?discussionOpenId:null,discussionFromList:!!history.state?.discussionFromList,postId:$('detail').open?clubModalPostId:null,spaceId:tab==='space'?spaceId:null,category,contentType,discussionSort,sort:$('sort').value,search:$('search').value,scroll:window.scrollY};}
function clubHistoryURL(state){const u=new URL(location.href);const base=state.tab==='space'&&state.spaceId?'space/'+encodeURIComponent(state.spaceId):state.tab==='discussions'&&state.discussionId?'discussions/'+encodeURIComponent(state.discussionId):state.tab;u.hash=state.postId?base+'/post/'+encodeURIComponent(state.postId):base;return u.href;}
function initClubHistory(){const old=history.state;clubHistoryReady=true;const hash=location.hash.slice(1),parts=hash.split('/');const requested=old?.tycClub?old:clubHistoryTabs.has(parts[0])?{tab:parts[0],spaceId:parts[0]==='space'&&/^[0-9a-f-]{36}$/i.test(parts[1]||'')?parts[1]:null,discussionId:parts[0]==='discussions'&&/^[0-9a-f-]{36}$/i.test(parts[1]||'')?parts[1]:null,postId:(()=>{const id=parts[0]==='space'&&parts[2]==='post'?parts[3]:parts[1]==='post'?parts[2]:null;return /^[0-9a-f-]{36}$/i.test(id||'')?id:null;})()}:null;restoreClubHistory(requested||{tab:'home'});history.replaceState(clubSnapshot(),'',clubHistoryURL(clubSnapshot()));}
function restoreClubHistory(state){clubRestoringHistory=true;try{if($('detail').open&&(!state?.postId||state.postId!==clubModalPostId)){clubIgnoreDetailCloseEvents++;$('detail').close();clubModalPostId=null;}const target=clubHistoryTabs.has(state?.tab)?state.tab:'home';if((target==='friends'||target==='saved'||target==='points'||(target==='space'&&!state.spaceId))&&!user){switchTab('home');return;}spaceId=state?.spaceId||user?.id||null;switchTab(target);category=state?.category||'';contentType=state?.contentType||'All';discussionSort=discussionSortOptions.some(x=>x.value===state?.discussionSort)?state.discussionSort:'latest';$('sort').value=state?.sort==='popular'?'popular':'latest';$('search').value=state?.search||'';renderCategories();render();if(target==='discussions'&&state?.discussionId)void openPost(state.discussionId,{restore:true});else if(state?.postId)void openPost(state.postId,{restore:true});requestAnimationFrame(()=>window.scrollTo({top:state?.scroll||0,behavior:'instant'}));}finally{clubRestoringHistory=false;}}
window.addEventListener('popstate',e=>{if(clubHistoryReady)restoreClubHistory(e.state?.tycClub?e.state:{tab:'home'});});
// Only move the mobile bottom bar when navigation actually changes.
// The user can still swipe freely; scrolling this element never moves the page.
function revealMobileClubTab(){
 if(!window.matchMedia('(max-width:640px)').matches)return;
 const rail=document.querySelector('main .layout > nav.rail');
 const active=rail?.querySelector('button.active[data-tab]:not(.rail-create)');
 if(!rail||!active)return;
 const container=rail.getBoundingClientRect(),rect=active.getBoundingClientRect();
 const left=container.left+7,right=container.right-(window.innerWidth<=360?81:88);
 let distance=0;
 if(rect.left<left)distance=rect.left-left-5;
 else if(rect.right>right)distance=rect.right-right+5;
 if(Math.abs(distance)<2)return;
 const target=Math.max(0,Math.min(rail.scrollLeft+distance,rail.scrollWidth-rail.clientWidth));
 rail.scrollTo({left:target,behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
}
function switchTab(t){if(t==='messages')t='friends';if((t==='friends'||t==='points'||t==='saved')&&!guard())return;if(tab==='friends'&&t!=='friends'&&t!=='create')window.TYC_MemberDM?.close();if(t==='create'){if(ready()&&!clubMediaBusy)openPostMenu(document.activeElement);return}if(['space','saved'].includes(t)&&!spaceId&&!guard())return;if(clubHistoryReady&&!clubRestoringHistory){const previous=history.state?.tycClub?history.state:clubSnapshot();history.replaceState({...clubSnapshot(),tab:previous.tab,spaceId:previous.spaceId,discussionId:previous.discussionId||null,discussionFromList:!!previous.discussionFromList},'',location.href);const next={tycClub:true,tab:t,spaceId:t==='space'?(spaceId||user?.id):null,category:'',contentType:'All',discussionSort:'latest',sort:['home','feed','discussions'].includes(t)?'latest':$('sort').value,search:$('search').value,scroll:0};if(previous.tab!==next.tab||previous.spaceId!==next.spaceId||previous.discussionId||previous.postId)history.pushState(next,'',clubHistoryURL(next));else history.replaceState(next,'',clubHistoryURL(next));}if(discussionOpenId){discussionOpenId=null;detailEpoch++;$('discussionDetail').replaceChildren();}tab=t;if(['home','feed','discussions'].includes(t))$('sort').value='latest';if(t==='discussions')discussionSort='latest';if(t==='space'&&!spaceId)spaceId=user?.id;category='';contentType='All';$('heading').textContent=({messages:'Messages',home:'Latest from the Club',feed:'Latest from the Club',discussions:'The conversation.',challenges:'Completed Challenges',space:'Posts',saved:'Saved Posts',friends:'Friends',points:'My Points'})[t];document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===t||(b.closest('#clubHomeTabs')&&t==='home'&&b.dataset.tab==='feed')));renderCategories();render();if(t==='friends')void refreshFriends();requestAnimationFrame(revealMobileClubTab);window.scrollTo({top:0,behavior:'instant'})}
let contentType='All';
const discussionSortOptions=[
 {value:'latest',label:'Latest',icon:'<path d="M12 3v9l6 3"/><circle cx="12" cy="12" r="9"/>'},
 {value:'views',label:'Most Viewed',icon:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'},
 {value:'likes',label:'Most Liked',icon:'<path d="M20.8 4.8a5.3 5.3 0 0 0-7.5 0L12 6.1l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z"/>'},
 {value:'replies',label:'Most Replies',icon:'<path d="M20 11.5a8 8 0 0 1-8.5 8 9.7 9.7 0 0 1-4-.9L3 21l1.4-4.4A8 8 0 1 1 20 11.5Z"/>'}
];
let discussionSort='latest';
function discussionSortRow(){
 const row=el('div','discussion-sort-row');
 row.setAttribute('role','group');
 row.setAttribute('aria-label','Sort Discussions');
 for(const choice of discussionSortOptions){
  const b=btn('',()=>{
   if(discussionSort===choice.value)return;
   discussionSort=choice.value;
   if(clubHistoryReady&&!clubRestoringHistory)history.replaceState({...clubSnapshot(),discussionSort},'',clubHistoryURL(clubSnapshot()));
   renderCategories();
   render();
  },'discussion-sort-option'+(discussionSort===choice.value?' is-selected':''));
  b.setAttribute('aria-pressed',String(discussionSort===choice.value));
  b.setAttribute('aria-label',choice.label);
  const icon=el('span','discussion-sort-icon');
  icon.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+choice.icon+'</svg>';
  b.append(icon,el('span','discussion-sort-label',choice.label));
  row.append(b);
 }
 return row;
}
function renderCategories(){if(tab==='challenges'){renderChallengeBrowse();$('categories').replaceChildren();$('contentTypes').replaceChildren();return;}if(tab==='saved'){$('categories').replaceChildren();if(!Object.prototype.hasOwnProperty.call(savedTypes,contentType))contentType='All';$('contentTypes').setAttribute('aria-label','Filter saved posts by section');$('contentTypes').replaceChildren(...Object.keys(savedTypes).map(v=>{const b=btn(v,()=>{contentType=v;renderCategories();render();if(clubHistoryReady&&!clubRestoringHistory)history.replaceState(clubSnapshot(),'',clubHistoryURL(clubSnapshot()));},contentType===v?'active':'');b.setAttribute('aria-pressed',String(contentType===v));return b}));return;}$('contentTypes').setAttribute('aria-label','Filter by post type');const icons=["<path d=\"M20.5 10.8c0 5-4.1 8.2-8.9 8.2-1.2 0-2.3-.2-3.3-.5L3 21l1.5-5C3.5 14.5 3 12.8 3 10.8 3 6 6.9 3 11.8 3s8.7 3 8.7 7.8Z\"/>","<path d=\"m2 8 10-5 10 5-10 5L2 8Zm4 2v7c3.5 3 8.5 3 12 0v-7m4-2v8\"/>","<path d=\"M2 9v6m3-9v12h3V6H5Zm11 0v12h3V6h-3ZM22 9v6M8 12h8\"/>","<path d=\"M20.8 4.8a5.3 5.3 0 0 0-7.5 0L12 6.1l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z\"/>","<path d=\"M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 1 1 14 0Z\"/><circle cx=\"12\" cy=\"9\" r=\"2.5\" stroke=\"#b98931\"/>","<rect x=\"2\" y=\"7\" width=\"20\" height=\"13\" rx=\"2\"/><path d=\"M8 7V4h8v3M2 12h20m-12 0v2h4v-2\"/>","<path d=\"m2 7 10-5 10 5-10 5L2 7Zm0 5 10 5 10-5M2 17l10 5 10-5\"/>","<path d=\"M12 2c1 6.2 3.8 9 10 10-6.2 1-9 3.8-10 10-1-6.2-3.8-9-10-10 6.2-1 9-3.8 10-10Z\"/>",'<circle cx="12" cy="12" r="7"/><path d="M3 4v6m3-6v6M4.5 10v10M21 4v16"/>','<path d="M22 2 9.5 14.5M22 2l-6 20-4-10-10-4Z"/>','<path d="M4 6h16v11H9l-5 3V6Z"/><path d="M8 10h8m-8 4h5"/>','<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18m-11 0v2h4v-2"/>','<path d="M3 5.5c3.8-1.4 6.6-1 9 1v13c-2.4-2-5.2-2.4-9-1V5.5Zm18 0c-3.8-1.4-6.6-1-9 1v13c2.4-2 5.2-2.4 9-1V5.5Z"/>','<path d="M9 18h6m-5 3h4m-6-6c-1.2-1.1-2-2.6-2-4.5a6 6 0 0 1 12 0c0 1.9-.8 3.4-2 4.5-.8.8-1 1.2-1 2H9c0-.8-.2-1.2-1-2Z"/>','<circle cx="6" cy="7" r="2"/><path d="m3 18 5-7 5 4 5-5 3 2M2 21h20M8 11l4-3 4 2"/>','<circle cx="12" cy="5" r="2"/><path d="m4 10 5 2 3-3 3 3 5-2M12 9v7m0 0-6 4h12l-6-4"/>','<path d="M8 3h8v5h5v8h-5v5H8v-5H3V8h5Z"/><path d="M8 12h2l1-3 2 6 1-3h2"/>'],labels=['General','Ask a PTA','Fitness','Wellness','Life in USA','Career','Resources','Lifestyle','Food','Travel','Opinions','Work','Learning','Tips','Pilates','Yoga','Physical Therapy'];const categoryButtons=topicGroups[currentGroup()].map(v=>{const i=['General','Ask a PTA','Fitness & Exercise','Health & Wellness','Life in USA','Career & Education','Useful Resources','Lifestyle','Food','Travel','Opinions','Work','Learning','Tips','Pilates','Yoga','Physical Therapy'].indexOf(v);const b=btn('',()=>{category=category===v?'':v;renderCategories();render()},tab!=='challenges'&&category===v?'active':'');const mark=el('span','topic-icon');mark.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[i]+'</svg>';const label=el('span','',labels[i]);if(v==='Physical Therapy'){label.style.whiteSpace='normal';label.style.textAlign='center';}b.append(mark,label);if(tab==='challenges')b.setAttribute('aria-label','Create '+labels[i]+' challenge');else b.setAttribute('aria-pressed',String(category===v));return b});const categoriesEl=$('categories'),previousTopicScroll=categoriesEl.querySelector('.discussion-topic-row')?.scrollLeft||0;
if(currentGroup()==='discussions'&&matchMedia('(max-width:640px)').matches){const topicRow=el('div','discussion-topic-row');topicRow.setAttribute('role','group');topicRow.setAttribute('aria-label','Discussion topics');topicRow.tabIndex=0;topicRow.append(...categoryButtons);categoriesEl.replaceChildren(discussionSortRow(),topicRow);categoriesEl.scrollLeft=0;topicRow.scrollLeft=previousTopicScroll;}else categoriesEl.replaceChildren(...(currentGroup()==='discussions'?[discussionSortRow(),...categoryButtons]:categoryButtons));$('contentTypes').replaceChildren(...(currentGroup()==='feed'?['All','Photos','Videos']:['All']).map(v=>btn(v,()=>{contentType=v;renderCategories();render()},contentType===v?'active':'')))}
let loadVersion=0;
// Read only the signed-in member's bookmarks, including entries beyond the recent Feed window.
async function readSavedIds(uid){if(!uid)return [];const rows=[];const size=200;for(let offset=0;;offset+=size){const batch=await checked(db.from('club_saved').select('post_id').eq('user_id',uid).order('post_id',{ascending:true}).range(offset,offset+size-1));rows.push(...batch);if(batch.length<size)break;}return rows;}
async function readSavedPosts(ids,recent){const byId=new Map(recent.map(p=>[p.id,p]));const missing=[...ids].filter(id=>!byId.has(id));for(let i=0;i<missing.length;i+=50){const batch=await checked(db.from('club_posts').select('*').in('id',missing.slice(i,i+50)));for(const p of batch)byId.set(p.id,p);}return [...ids].map(id=>byId.get(id)).filter(Boolean);}
async function load(){const v=++loadVersion,uid=user?.id;try{let data=await Promise.all([checked(db.from('club_posts').select('*').order('created_at',{ascending:false}).limit(100)),checked(db.from('club_profiles').select('*')),challengePages(()=>db.from('club_likes').select('*').order('post_id',{ascending:true}).order('user_id',{ascending:true})),checked(db.from('club_votes').select('*')),readSavedIds(uid),readChallengeData(),readChallengePosts()]);data[0]=[...data[0].filter(p=>p.kind!=='Challenge'),...data[6]];const nextSaved=new Set(data[4].map(x=>x.post_id));const nextSavedPosts=await readSavedPosts(nextSaved,data[0]);if(v!==loadVersion||user?.id!==uid)return;[posts,,likes,votes]=data;profiles=new Map(data[1].map(p=>[p.user_id,p]));me=profiles.get(user?.id)||null;setHeaderAvatar();saved=nextSaved;savedPosts=nextSavedPosts;applyChallengeData(data[5]);await Promise.all([refreshCommentCounts(),loadClubVerifiedRoles(),refreshClubViewCounts()]);if(v!==loadVersion)return;render();void refreshFeatured();if(admin)await loadReports()}catch(e){if(v===loadVersion)status('Unable to load: '+e.message)}}

/* Profile photo crop: local preview, pointer drag and zoom, square output. */
let avatarCrop=null,avatarCropVersion=0;
const cropCanvas=$('avatarCropCanvas'),cropZoom=$('avatarCropZoom'),cropPanel=$('avatarCropPanel');
function resetAvatarCrop(){avatarCropVersion++;if(avatarCrop?.bitmap?.close)avatarCrop.bitmap.close();avatarCrop=null;cropPanel.hidden=true;cropZoom.value='1';$('avatarCropStatus').textContent='';}
function cropBounds(){const a=avatarCrop;if(!a?.bitmap)return null;const size=cropCanvas.width,scale=Math.max(size/a.bitmap.width,size/a.bitmap.height)*Number(cropZoom.value),w=a.bitmap.width*scale,h=a.bitmap.height*scale;return {size,w,h,mx:Math.max(0,(w-size)/2),my:Math.max(0,(h-size)/2)}}
function drawAvatarCrop(){const a=avatarCrop,b=cropBounds();if(!a||!b)return;a.x=Math.max(-b.mx,Math.min(b.mx,a.x));a.y=Math.max(-b.my,Math.min(b.my,a.y));const ctx=cropCanvas.getContext('2d');ctx.clearRect(0,0,b.size,b.size);ctx.drawImage(a.bitmap,(b.size-b.w)/2+a.x,(b.size-b.h)/2+a.y,b.w,b.h);}
async function decodeAvatar(file){if(typeof createImageBitmap==='function'){try{return await createImageBitmap(file)}catch{}}return new Promise((resolve,reject)=>{const src=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(src);resolve(im)};im.onerror=()=>{URL.revokeObjectURL(src);reject(Error('Unable to open image.'))};im.src=src;});}
async function loadAvatarCrop(f){resetAvatarCrop();$('avatarCropPercent').textContent='100%';if(!f)return;const version=avatarCropVersion;cropPanel.hidden=false;$('avatarCropStatus').textContent='Loading photo…';avatarCrop={loading:true};try{if(!['image/jpeg','image/png','image/webp','image/avif'].includes(f.type)||f.size>15728640)throw Error('Choose a JPG, PNG, WebP or AVIF image up to 15 MB.');const bitmap=await decodeAvatar(f);if(version!==avatarCropVersion){bitmap.close?.();return}if(!bitmap.width||!bitmap.height)throw Error('Invalid image.');avatarCrop={bitmap,x:0,y:0};$('avatarCropStatus').textContent='';drawAvatarCrop();}catch(e){if(version!==avatarCropVersion)return;avatarCrop={error:true};$('avatarCropStatus').textContent=e.message;}}
$('avatar').addEventListener('change',()=>void loadAvatarCrop($('avatar').files[0]));
cropZoom.addEventListener('input',()=>{drawAvatarCrop();$('avatarCropPercent').textContent=Math.round(Number(cropZoom.value)*100)+'%';});
$('avatarCropReset').onclick=()=>{if(!avatarCrop?.bitmap)return;avatarCrop.x=avatarCrop.y=0;cropZoom.value='1';$('avatarCropPercent').textContent='100%';drawAvatarCrop();};
$('avatarCropCancel').onclick=()=>{if($('profileDialog').classList.contains('avatar-only')){$('profileDialog').close();return;}$('avatar').value='';resetAvatarCrop();};
let cropDrag=null;
cropCanvas.addEventListener('pointerdown',e=>{if(!avatarCrop?.bitmap||cropDrag)return;e.preventDefault();cropCanvas.setPointerCapture(e.pointerId);cropDrag={id:e.pointerId,x:e.clientX,y:e.clientY};});
cropCanvas.addEventListener('pointermove',e=>{if(!cropDrag||cropDrag.id!==e.pointerId||!avatarCrop?.bitmap)return;const k=cropCanvas.width/cropCanvas.getBoundingClientRect().width;avatarCrop.x+=(e.clientX-cropDrag.x)*k;avatarCrop.y+=(e.clientY-cropDrag.y)*k;cropDrag.x=e.clientX;cropDrag.y=e.clientY;drawAvatarCrop();});
for(const name of ['pointerup','pointercancel','lostpointercapture'])cropCanvas.addEventListener(name,e=>{if(cropDrag?.id===e.pointerId)cropDrag=null;});
cropCanvas.addEventListener('keydown',e=>{if(!avatarCrop?.bitmap)return;const delta={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];if(!delta)return;e.preventDefault();avatarCrop.x+=delta[0];avatarCrop.y+=delta[1];drawAvatarCrop();});
async function croppedAvatarFile(){if(!avatarCrop?.bitmap)throw Error('Please finish loading or choose another profile photo.');drawAvatarCrop();const blob=await new Promise(resolve=>cropCanvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Unable to prepare profile photo.');return new File([blob],'profile-photo.png',{type:'image/png'});}
$('profileDialog').addEventListener('close',()=>{if($('profileDialog').open)return;resetAvatarCrop();cropDrag=null;setAvatarOnly(false);$('quickAvatarInput').value='';});
function setAvatarOnly(on){const d=$('profileDialog');d.classList.toggle('avatar-only',on);d.querySelector('h2').textContent=on?'Profile Photo':'Edit My Space';$('profileForm').querySelector('button[type=submit]').textContent=on?'Save Photo':'Save Changes';}

let quickCoverFile=null,quickCoverURL=null,quickCoverBusy=false;
const quickCoverInput=$('quickCoverInput'),quickCoverDialog=$('quickCoverDialog'),quickCoverPreview=$('quickCoverPreview');
function chooseQuickCover(){if(!guard()||spaceId!==user.id||quickCoverBusy||quickCoverDialog.open)return;quickCoverInput.value='';quickCoverInput.click();}
quickCoverInput.addEventListener('change',()=>{const file=quickCoverInput.files[0];if(!file||!user||spaceId!==user.id||quickCoverBusy)return;if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)||!file.size||file.size>15728640){alert('Choose a JPG, PNG, WebP or AVIF image up to 15 MB.');return;}if(quickCoverURL)URL.revokeObjectURL(quickCoverURL);quickCoverFile=file;quickCoverURL=URL.createObjectURL(file);quickCoverPreview.src=quickCoverURL;$('quickCoverStatus').textContent='';$('quickCoverSave').disabled=false;quickCoverDialog.showModal();});
quickCoverPreview.addEventListener('error',()=>{$('quickCoverStatus').textContent='Unable to preview this image. Please select another photo.';$('quickCoverSave').disabled=true;});
$('quickCoverCancel').onclick=()=>{if(!quickCoverBusy)quickCoverDialog.close();};
quickCoverDialog.addEventListener('cancel',e=>{if(quickCoverBusy)e.preventDefault();});
quickCoverDialog.addEventListener('close',()=>{if(quickCoverURL)URL.revokeObjectURL(quickCoverURL);quickCoverURL=null;quickCoverFile=null;quickCoverInput.value='';quickCoverPreview.removeAttribute('src');});
$('quickCoverSave').onclick=async()=>{if(!quickCoverFile||!user||spaceId!==user.id||quickCoverBusy)return;const uid=user.id;quickCoverBusy=true;$('quickCoverSave').disabled=true;$('quickCoverCancel').disabled=true;$('quickCoverStatus').textContent='Saving…';try{await checked(db.rpc('tyc_club_ensure_profile'));if(user?.id!==uid)throw Error('Account changed.');const path=await upload(quickCoverFile);if(user?.id!==uid)throw Error('Account changed.');await checked(db.from('club_profiles').update({cover:path}).eq('user_id',uid).select('user_id').single());const previous=profiles.get(uid)||me||{};me={...previous,cover:path};profiles.set(uid,me);if(tab==='space'&&spaceId===uid)renderSpace();quickCoverDialog.close();}catch(e){$('quickCoverStatus').textContent=e.message||'Unable to save cover photo.';$('quickCoverSave').disabled=false;}finally{quickCoverBusy=false;$('quickCoverCancel').disabled=false;}};

function chooseQuickAvatar(){if(!guard()||spaceId!==user.id||$('profileDialog').open)return;const f=$('quickAvatarInput');f.value='';f.click();}
$('quickAvatarInput').addEventListener('change',()=>{const file=$('quickAvatarInput').files[0];if(!file||!user||spaceId!==user.id)return;$('profileForm').reset();setAvatarOnly(true);$('profileStatus').textContent='';$('profileDialog').showModal();void loadAvatarCrop(file);});


/* Theme selection is a local draft until the existing profile save succeeds. */
function syncSpaceThemePreview(){
 const select=$('theme'),picker=$('spaceThemeChoices'),preview=$('spaceThemePreview');if(!select||!picker||!preview)return;
 const option=select.selectedOptions[0]||select.options[0],color=option.value;
 for(const b of picker.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.theme===color));
 preview.style.setProperty('--space-theme',color);
 $('spaceThemeSelected').textContent=option.textContent;
 $('spaceThemePreviewName').textContent=$('clubLinkedNickname').textContent||'Club Member';
 $('spaceThemePreviewTagline').textContent=$('tagline').value.trim()||'A little space to share, grow & connect';
 const p=me||{};const img=$('spaceThemePreviewAvatar');img.src=p.avatar?url(p.avatar):'club-green-sprout.svg';
 const cover=$('spaceThemePreviewCover');cover.classList.toggle('has-custom-cover',!!p.cover);const photo=$('spaceThemePreviewCoverImage');
 if(p.cover){photo.src=url(p.cover);photo.hidden=false;}else{photo.hidden=true;photo.removeAttribute('src');}
 if(spaceId===user?.id){const hero=$('space').querySelector('.space-profile');if(hero)hero.style.setProperty('--space-theme',color);}
}
function restoreSpaceThemePreview(){if(spaceId===user?.id){const hero=$('space').querySelector('.space-profile'),p=me||profiles.get(spaceId);if(hero)hero.style.setProperty('--space-theme',/^#[0-9a-f]{6}$/i.test(p?.theme||'')?p.theme:'#254638');}}
function initSpaceThemePicker(){
 const select=$('theme'),picker=$('spaceThemeChoices');if(!select||!picker)return;
 for(const option of select.options){const b=btn('',()=>{select.value=option.value;syncSpaceThemePreview();},'space-theme-choice');b.dataset.theme=option.value;b.style.setProperty('--theme-swatch',option.value);b.setAttribute('aria-pressed','false');const swatch=el('span','space-theme-swatch'),mark=el('span','space-theme-check','✓');mark.setAttribute('aria-hidden','true');swatch.append(mark);b.append(swatch,el('span','space-theme-name',option.textContent));picker.append(b);}
 $('tagline').addEventListener('input',()=>{if($('profileDialog').open&&!$('profileDialog').classList.contains('avatar-only'))$('spaceThemePreviewTagline').textContent=$('tagline').value.trim()||'A little space to share, grow & connect';});
 $('profileDialog').addEventListener('close',()=>{if(!$('profileDialog').open)restoreSpaceThemePreview();});
}
initSpaceThemePicker();

function editProfile(focusField){if(!guard())return;if(focusField==='avatar'){chooseQuickAvatar();return;}setAvatarOnly(false);const p=me||{};$('profileForm').reset();resetAvatarCrop();$('avatarCropPercent').textContent='100%';$('clubLinkedNickname').textContent=p.nickname||user.user_metadata?.display_name||'Club Member';$('tagline').value=p.tagline||'';$('bio').value=p.bio||'';$('theme').value=[...$('theme').options].some(o=>o.value===p.theme)?p.theme:'#254638';syncSpaceThemePreview();$('profileStatus').textContent='';$('profileDialog').showModal();if(typeof focusField==='string'&&['tagline','bio','cover','avatar'].includes(focusField)){$(focusField).focus();if(focusField==='avatar')$('avatar').click();}}
$('profileForm').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;$('profileStatus').textContent='Saving your space…';try{const existing=await checked(db.rpc('tyc_club_ensure_profile'));const quick=$('profileDialog').classList.contains('avatar-only');const changes=quick?{avatar:await upload(await croppedAvatarFile())}:{tagline:$('tagline').value.trim(),bio:$('bio').value.trim(),theme:$('theme').value};if(!quick)for(const field of ['avatar','cover'])if($(field).files[0])changes[field]=await upload(field==='avatar'?await croppedAvatarFile():$(field).files[0]);await checked(db.from('club_profiles').update(changes).eq('user_id',user.id).select('user_id').single());me={...existing,...changes};setHeaderAvatar();$('profileDialog').close();spaceId=user.id;await load();if(tab!=='space')switchTab('space');else renderSpace()}catch(error){$('profileStatus').textContent=error.message||'Could not save your space.'}finally{b.disabled=false}};
// File picker and drag-and-drop share one validated, removable attachment queue.
const clubMediaTypes=new Set(['image/jpeg','image/png','image/webp','image/avif','image/gif','video/mp4','video/webm']);
const clubMediaLimit=15728640;
let clubMediaFiles=[],clubMediaBusy=false,clubDragDepth=0;
const dropZone=$('clubMediaDrop'),mediaInput=$('media'),mediaChoose=$('clubMediaChoose'),mediaPreviews=$('clubMediaPreviews'),mediaStatus=$('clubMediaStatus');
// Instagram-style staged composer. Crop settings are stored per attachment.
let composerStep='upload',composerIndex=0,composerMediaSignature='',composerPan=null;
const composer=$('composer'),composerStage=$('composerStage');
function isPhotoWizard(){return ['Photo','Video'].includes($('kind').value);}
function canCrop(entry){return !!entry?.file&&['image/jpeg','image/png','image/webp','image/avif'].includes(entry.file.type);}
function cropState(entry){return entry.crop||(entry.crop={ratio:'original',zoom:1,x:.5,y:.5});}
function cropRect(entry,w,h){const c=cropState(entry),ratio=c.ratio==='original'?w/h:Number(c.ratio);let cw=Math.min(w,h*ratio)/c.zoom,ch=cw/ratio;return {x:(w-cw)*c.x,y:(h-ch)*c.y,w:cw,h:ch};}
function setComposerStep(step){composerStep=step;composer.dataset.step=step;$('composerUpload').hidden=step!=='upload'&&step!=='write';$('composerCrop').hidden=step==='upload'||(step==='write'&&!clubMediaFiles.length);$('composerWrite').hidden=step!=='write';$('composerBack').hidden=step==='upload';$('composerNext').hidden=step==='write';$('composerNext').disabled=step==='upload'&&!clubMediaFiles.length;$('composerPublish').hidden=step!=='write';composer.querySelector('h2').textContent=step==='crop'?'Crop':editingPost?'Edit post':$('kind').value==='Challenge'?'Create a challenge':'Create new post';$('composerPublish').textContent=editingPost?'Save changes':'Share';$('composerUpload').classList.toggle('composer-upload-inline',step==='write');if(step==='write')$('composerWriterIdentity').replaceChildren(author(user?.id));paintComposerMedia(true);}
function paintComposerMedia(force=false){const e=clubMediaFiles[Math.min(composerIndex,Math.max(0,clubMediaFiles.length-1))];composerIndex=Math.min(composerIndex,Math.max(0,clubMediaFiles.length-1));$('composerMediaIndex').textContent=clubMediaFiles.length?(composerIndex+1)+' / '+clubMediaFiles.length:'0 / 0';$('composerPrevMedia').disabled=composerIndex===0;$('composerNextMedia').disabled=composerIndex>=clubMediaFiles.length-1;$('composerNext').disabled=composerStep==='upload'&&!clubMediaFiles.length;if(!e){composerStage.replaceChildren();composerMediaSignature='';return;}const video=e.file?e.file.type.startsWith('video/'):/\.(mp4|webm)$/i.test(e.path),editable=canCrop(e),c=cropState(e);$('composerRatio').disabled=!editable||composerStep==='write';$('composerZoom').disabled=!editable||composerStep==='write';$('composerRatio').value=c.ratio;$('composerZoom').value=c.zoom;$('composerCropHint').textContent=editable?'Drag to reposition':'Original media (video, GIF or existing attachment)';if(force||composerMediaSignature!==e.url){composerMediaSignature=e.url;composerStage.replaceChildren();const m=el(video?'video':'img','composer-stage-media');m.src=e.url;if(video){m.controls=true;m.playsInline=true;m.preload='metadata';}else{m.alt='Attachment preview';m.draggable=false;m.onload=()=>drawCropPreview();}composerStage.append(m);}drawCropPreview();}
function drawCropPreview(){const entry=clubMediaFiles[composerIndex],m=composerStage.querySelector('img');if(!entry||!m||!m.naturalWidth)return;const c=cropState(entry),rect=cropRect(entry,m.naturalWidth,m.naturalHeight);const ratio=rect.w/rect.h;composerStage.style.setProperty('--crop-ratio',ratio);if(!canCrop(entry)){m.style.cssText='';return;}const frame=composerStage.getBoundingClientRect();if(!frame.width||!frame.height)return;const scale=Math.min(frame.width/rect.w,frame.height/rect.h),fw=rect.w*scale,fh=rect.h*scale;let viewport=composerStage.querySelector('.composer-crop-viewport');if(!viewport){viewport=el('div','composer-crop-viewport');composerStage.append(viewport);viewport.append(m);}viewport.style.width=fw+'px';viewport.style.height=fh+'px';m.style.width=m.naturalWidth*scale+'px';m.style.height=m.naturalHeight*scale+'px';m.style.left=-rect.x*scale+'px';m.style.top=-rect.y*scale+'px';}
function beginComposer(){syncChallengeComposer();$('discussionPreview').hidden=true;$('discussionPreviewButton').hidden=composeGroup!=='discussions';$('discussionNoticeField').hidden=composeGroup!=='discussions'||!admin;$('discussionNotice').checked=!!editingPost?.is_notice;composerIndex=0;composerMediaSignature='';setComposerStep(isPhotoWizard()&&!editingPost?'upload':'write');composer.showModal();requestAnimationFrame(()=>paintComposerMedia(true));}
function askComposerDiscard(){if(clubMediaBusy)return;if(!clubMediaFiles.length&&!$('title').value&&!$('body').value&&!$('poll').value){composer.close();return;}$('composerDiscard').hidden=false;$('composerDiscardNo').focus();}
$('composerBack').onclick=()=>{if(clubMediaBusy)return;if(composerStep==='crop')setComposerStep('upload');else if(composerStep==='write'&&isPhotoWizard()&&clubMediaFiles.length)setComposerStep('crop');else askComposerDiscard();};$('composerNext').onclick=()=>{if(clubMediaBusy)return;if(composerStep==='upload'&&clubMediaFiles.length)setComposerStep('crop');else if(composerStep==='crop')setComposerStep('write');};$('composerDiscardNo').onclick=()=>{$('composerDiscard').hidden=true;};$('composerDiscardYes').onclick=()=>{$('composerDiscard').hidden=true;clearClubMedia();$('postForm').reset();editingPost=null;composer.close();};composer.addEventListener('cancel',e=>{e.preventDefault();if(!$('composerDiscard').hidden)$('composerDiscard').hidden=true;else askComposerDiscard();});
let composerOutside=false;function outsideComposer(e){const r=composer.getBoundingClientRect();return e.target===composer&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);}composer.addEventListener('pointerdown',e=>{composerOutside=outsideComposer(e);});composer.addEventListener('click',e=>{if(composerOutside&&outsideComposer(e)&&$('composerDiscard').hidden){if(!$('discussionPreview').hidden)$('discussionPreview').hidden=true;else askComposerDiscard();}composerOutside=false;});composer.addEventListener('close',()=>{$('composerDiscard').hidden=true;composerMediaSignature='';composerStage.replaceChildren();});
$('composerPrevMedia').onclick=()=>{if(!clubMediaBusy){composerIndex--;paintComposerMedia(true);}};$('composerNextMedia').onclick=()=>{if(!clubMediaBusy){composerIndex++;paintComposerMedia(true);}};$('composerAddMedia').onclick=()=>{if(!clubMediaBusy)mediaInput.click();};
$('composerRatio').onchange=()=>{const e=clubMediaFiles[composerIndex];if(canCrop(e)){cropState(e).ratio=$('composerRatio').value;drawCropPreview();}};$('composerZoom').oninput=()=>{const e=clubMediaFiles[composerIndex];if(canCrop(e)){cropState(e).zoom=Number($('composerZoom').value);drawCropPreview();}};
composerStage.addEventListener('pointerdown',e=>{const item=clubMediaFiles[composerIndex],m=composerStage.querySelector('img'),v=composerStage.querySelector('.composer-crop-viewport');if(composerStep!=='crop'||!canCrop(item)||!m?.naturalWidth||!v)return;const c=cropState(item),r=cropRect(item,m.naturalWidth,m.naturalHeight),scale=v.clientWidth/r.w;composerPan={item,x:e.clientX,y:e.clientY,cx:c.x,cy:c.y,dx:(m.naturalWidth-r.w)*scale,dy:(m.naturalHeight-r.h)*scale};composerStage.setPointerCapture(e.pointerId);});composerStage.addEventListener('pointermove',e=>{if(!composerPan)return;const p=composerPan,c=cropState(p.item);if(p.dx>0)c.x=Math.max(0,Math.min(1,p.cx-(e.clientX-p.x)/p.dx));if(p.dy>0)c.y=Math.max(0,Math.min(1,p.cy-(e.clientY-p.y)/p.dy));drawCropPreview();});for(const evt of ['pointerup','pointercancel','lostpointercapture'])composerStage.addEventListener(evt,()=>{composerPan=null;});
window.addEventListener('resize',()=>{if(composer.open)drawCropPreview();});
async function composerUploadFile(entry){if(!canCrop(entry)||!entry.crop||(entry.crop.ratio==='original'&&entry.crop.zoom===1))return entry.file;const img=new Image();img.src=entry.url;await img.decode();const r=cropRect(entry,img.naturalWidth,img.naturalHeight),scale=Math.min(1,2048/Math.max(r.w,r.h)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(r.w*scale));canvas.height=Math.max(1,Math.round(r.h*scale));canvas.getContext('2d').drawImage(img,r.x,r.y,r.w,r.h,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.92));if(!blob)throw Error('Could not crop image');return new File([blob],entry.file.name.replace(/\.[^.]+$/,'')+'.webp',{type:'image/webp'});}
function mediaNote(message='',error=false){mediaStatus.textContent=clubMediaFiles.length+' / 10 files · Max 15 MB each'+(message?' · '+message:'');mediaStatus.classList.toggle('is-error',error);}
function renderMediaQueue(){mediaPreviews.replaceChildren();for(const entry of clubMediaFiles){const tile=el('div','club-media-tile'),video=entry.file?entry.file.type.startsWith('video/'):/\.(mp4|webm)$/i.test(entry.path),preview=el(video?'video':'img','club-media-thumb');preview.src=entry.url;if(video){preview.muted=true;preview.playsInline=true;preview.preload='metadata';preview.controls=true;}else{preview.alt='Preview of '+(entry.file?.name||entry.path?.split('/').pop()||'Existing attachment');}const label=el('span','club-media-filename',(entry.file?.name||entry.path?.split('/').pop()||'Existing attachment'));label.title=(entry.file?.name||entry.path?.split('/').pop()||'Existing attachment');const remove=btn('×',()=>{if(clubMediaBusy)return;if(entry.file)URL.revokeObjectURL(entry.url);clubMediaFiles=clubMediaFiles.filter(x=>x!==entry);renderMediaQueue();mediaNote();},'club-media-remove');remove.disabled=clubMediaBusy;remove.setAttribute('aria-label','Remove '+(entry.file?.name||entry.path?.split('/').pop()||'Existing attachment'));tile.append(preview,label,remove);mediaPreviews.append(tile);}mediaChoose.disabled=clubMediaBusy;mediaInput.disabled=clubMediaBusy;if(composer.open){paintComposerMedia();if($('kind').value==='Challenge'&&$('clubChallengeCoverField'))paintChallengeCovers();}}
function addClubFiles(files){if(clubMediaBusy)return;const errors=[];for(const f of files){if(!clubMediaTypes.has(f.type)){errors.push(f.name+': unsupported file type');continue;}if(f.size===0||f.size>clubMediaLimit){errors.push(f.name+': must be 1 byte–15 MB');continue;}if(clubMediaFiles.some(e=>e.file&&e.file.name===f.name&&e.file.size===f.size&&e.file.lastModified===f.lastModified&&e.file.type===f.type))continue;if(clubMediaFiles.length>=10){errors.push('Maximum 10 files');break;}clubMediaFiles.push({file:f,url:URL.createObjectURL(f)});}renderMediaQueue();mediaNote(errors.join('; '),errors.length>0);if(composer.open&&composerStep==='upload'&&clubMediaFiles.length)setComposerStep('crop');}
function clearClubMedia(){for(const e of clubMediaFiles)if(e.file)URL.revokeObjectURL(e.url);clubMediaFiles=[];mediaInput.value='';renderMediaQueue();mediaNote();}
mediaChoose.onclick=()=>{if(!clubMediaBusy)mediaInput.click();};
mediaInput.addEventListener('change',()=>{addClubFiles(Array.from(mediaInput.files||[]));mediaInput.value='';});
const fileDrag=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
dropZone.addEventListener('dragenter',e=>{if(!fileDrag(e))return;e.preventDefault();clubDragDepth++;if(!clubMediaBusy)dropZone.classList.add('is-dragging');});
dropZone.addEventListener('dragover',e=>{if(!fileDrag(e))return;e.preventDefault();e.dataTransfer.dropEffect=clubMediaBusy?'none':'copy';});
dropZone.addEventListener('dragleave',e=>{if(!clubDragDepth)return;clubDragDepth=Math.max(0,clubDragDepth-1);if(!clubDragDepth)dropZone.classList.remove('is-dragging');});
dropZone.addEventListener('drop',e=>{e.preventDefault();clubDragDepth=0;dropZone.classList.remove('is-dragging');addClubFiles(Array.from(e.dataTransfer?.files||[]));});
$('composer').addEventListener('dragover',e=>{if(fileDrag(e))e.preventDefault();});
$('composer').addEventListener('drop',e=>{if(fileDrag(e))e.preventDefault();});
$('composer').addEventListener('close',()=>{clubDragDepth=0;dropZone.classList.remove('is-dragging');});
function editClubPost(p){if(!user||p.author_id!==user.id||clubMediaBusy)return;if($('detail').open)$('detail').close();editingPost=p;$('postForm').reset();clearClubMedia();configureComposer(sectionOf(p));if(!Array.from($('kind').options).some(o=>o.value===p.kind)){const o=el('option','',p.kind);o.value=p.kind;$('kind').append(o);}$('kind').value=p.kind;$('kind').disabled=true;$('category').value=topicOf(p);$('title').value=p.title;$('body').value=p.body||'';$('poll').value=(p.poll_options||[]).join('\n');$('poll').disabled=true;$('pollField').hidden=p.kind!=='Poll';for(const path of p.media||[])clubMediaFiles.push({path,url:url(path)});renderMediaQueue();mediaNote();$('composer').querySelector('h2').textContent='Edit post';$('postForm').querySelector('[type=submit]').textContent='Save changes';beginComposer();}
$('postForm').onsubmit=async e=>{e.preventDefault();if(clubMediaBusy||!ready())return;let b=e.submitter;b.disabled=true;clubMediaBusy=true;renderMediaQueue();try{let edit=editingPost,files=clubMediaFiles,kind=$('kind').value,opts=kind==='Poll'?$('poll').value.split('\n').map(s=>s.trim()).filter(Boolean):[];if((!edit&&!kindGroups[composeGroup].includes(kind))||!topicGroups[composeGroup].includes($('category').value))throw Error('Choose a valid topic and post type for this section.');if(files.length>10)throw Error('Maximum 10 files.');if(kind==='Poll'&&(opts.length<2||opts.length>6))throw Error('Use 2–6 options.');if(['Photo','Video'].includes(kind)&&!files.length)throw Error('Attach your media.');let paths=[];for(let i=0;i<files.length;i++){mediaNote('Uploading '+(i+1)+' / '+files.length+'…');paths.push(files[i].path||await upload(await composerUploadFile(files[i])));}const values={category:$('category').value,title:$('title').value.trim(),body:$('body').value,media:paths};if(kind==='Challenge'){values.challenge_days=Number(challengeDuration.value);values.challenge_activity=challengeActivity.value;values.challenge_cover=chosenChallengeCover||challengeActivity.value;if(admin)values.is_official_challenge=officialCheck.checked;}if(admin&&composeGroup==='discussions')values.is_notice=$('discussionNotice').checked;if(!values.title)throw Error('Title is required.');if(edit){await checked(db.from('club_posts').update(values).eq('id',edit.id).eq('author_id',user.id).select('id').single());}else await checked(db.from('club_posts').insert({author_id:user.id,kind,...values,poll_options:opts}));editingPost=null;clearClubMedia();$('composer').close();e.target.reset();$('pollField').hidden=true;await load();if(!edit)switchTab(composeGroup);else if(discussionOpenId===edit.id)await openPost(edit.id)}catch(e){$('composeStatus').textContent=e.message;mediaNote('Upload not completed. You can retry.',true)}finally{clubMediaBusy=false;b.disabled=false;renderMediaQueue();}};
let detailEpoch=0;
$('detail').addEventListener('close',()=>{
 // A browser Back/Forward may close one modal and open another in the same task.
 // Ignore a deferred close notification if its dialog has already reopened.
 if($('detail').open){
  if(clubIgnoreDetailCloseEvents>0)clubIgnoreDetailCloseEvents--;
  return;
 }
 detailEpoch++;
 $('detailBody').replaceChildren();
 const closedByHistory=clubIgnoreDetailCloseEvents>0;
 if(closedByHistory)clubIgnoreDetailCloseEvents--;
 clubModalPostId=null;
 // The X, backdrop, Escape, and iOS dialog-dismiss gestures should all
 // consume the post's history entry, not leave a ghost Back step behind.
 if(!closedByHistory&&clubHistoryReady&&history.state?.tycClub&&history.state?.postId){
  history.back();
 }
});
// Dismiss only when both the press and release occur outside the detail dialog.
const detailBackdropDialog=$('detail');let detailBackdropPressed=false;
function isDetailBackdrop(e){const rect=detailBackdropDialog.getBoundingClientRect();return e.target===detailBackdropDialog&&(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom);}
detailBackdropDialog.addEventListener('pointerdown',e=>{detailBackdropPressed=e.button===0&&isDetailBackdrop(e);});
detailBackdropDialog.addEventListener('pointercancel',()=>{detailBackdropPressed=false;});
detailBackdropDialog.addEventListener('click',e=>{const dismiss=detailBackdropPressed&&isDetailBackdrop(e);detailBackdropPressed=false;if(dismiss&&detailBackdropDialog.open)detailBackdropDialog.close();});
detailBackdropDialog.addEventListener('close',()=>{detailBackdropPressed=false;});

function appendDiscussionModeration(target,p){for(const [label,field] of [[p.is_notice?'Remove notice':'Make notice','is_notice'],[p.is_pinned?'Unpin':'Pin','is_pinned'],[p.comments_locked?'Unlock comments':'Lock comments','comments_locked']])target.append(btn(label,async()=>{try{const next={...p,[field]:!p[field]};await checked(db.rpc('club_moderate_post',{p_id:p.id,p_notice:!!next.is_notice,p_pin:!!next.is_pinned,p_lock:!!next.comments_locked}));Object.assign(p,next);await load();if(discussionOpenId===p.id)await openPost(p.id);}catch(e){alert(e.message);}}));}
function closeDiscussion(){if(tab!=='discussions'||!discussionOpenId)return;if(history.state?.discussionId===discussionOpenId&&history.state?.discussionFromList){history.back();return;}discussionOpenId=null;detailEpoch++;$('discussionDetail').hidden=true;$('discussionDetail').replaceChildren();render();if(clubHistoryReady)history.replaceState({...clubSnapshot(),discussionFromList:false},'',clubHistoryURL(clubSnapshot()));$('feed').scrollIntoView({block:'start'});}
function discussionPreview(){const root=$('discussionPreviewBody');root.replaceChildren(el('span','feed-category',$('category').value),el('h2','',$('title').value||'Untitled'),el('p','discussion-preview-text',$('body').value));for(const entry of clubMediaFiles){const video=entry.file?entry.file.type.startsWith('video/'):/\.(mp4|webm)$/i.test(entry.path);const m=el(video?'video':'img');m.src=entry.url;if(video)m.controls=true;root.append(m);}if($('kind').value==='Poll')for(const option of $('poll').value.split('\n').filter(x=>x.trim()))root.append(el('p','', '○ '+option));$('discussionPreview').hidden=false;}
$('discussionPreviewButton').onclick=discussionPreview;$('discussionPreviewClose').onclick=()=>{$('discussionPreview').hidden=true;};
async function openPost(id,{restore=false}={}){
 const p=posts.find(x=>x.id===id)||savedPosts.find(x=>x.id===id)||featured.find(x=>x.post_id===id)?.post;if(!p)return;if(sectionOf(p)==='discussions')void countClubDiscussionView(id);
 const inline=sectionOf(p)==='discussions'&&tab!=='space'&&tab!=='saved';if(inline&&tab!=='discussions')switchTab('discussions');if(inline){if(clubHistoryReady&&!clubRestoringHistory&&!restore&&discussionOpenId!==id){const prior=clubSnapshot();history.replaceState(prior,'',clubHistoryURL(prior));const next={...prior,discussionId:id,discussionFromList:true,scroll:0};history.pushState(next,'',clubHistoryURL(next));}discussionOpenId=id;$('discussionDetail').hidden=false;$('feed').hidden=false;}
 if(!inline){
  const detail=$('detail');
  if(clubHistoryReady&&!clubRestoringHistory&&!restore&&history.state?.postId!==id){
   const prior={...clubSnapshot(),postId:null,scroll:window.scrollY};
   if(detail.open){
    history.replaceState({...prior,postId:id},'',clubHistoryURL({...prior,postId:id}));
   }else{
    history.replaceState(prior,'',clubHistoryURL(prior));
    const next={...prior,postId:id};
    history.pushState(next,'',clubHistoryURL(next));
   }
  }
  clubModalPostId=id;
 }
 const epoch=++detailEpoch,root=inline?$('discussionDetail'):$('detailBody'),dialog=$('detail');const stillOpen=()=>inline?discussionOpenId===id:dialog.open;
 const existing=detailCard(p,true),gallery=existing.querySelector('.media'),copy=existing.querySelector('.copy'),actions=copy.querySelector('.actions');
 const layout=el('div',inline?'club-discussion-detail-layout':'club-detail-layout'+(gallery?.children.length?' has-media':'')),panel=el('div','club-detail-panel'),scroll=el('div','club-detail-scroll'),thread=el('div','club-detail-thread'),footer=el('div','club-detail-footer');
 if(gallery?.children.length){
  const stage=el('div','club-detail-stage'),items=[...gallery.children];let index=0;
  const dots=el('div','club-detail-dots'), indicator=el('div','club-detail-indicator'), counter=el('span','club-detail-counter');
  counter.setAttribute('aria-live','polite');
  const show=i=>{index=(i+items.length)%items.length;items.forEach((n,j)=>{n.hidden=j!==index;if(j!==index&&n.tagName==='VIDEO')n.pause();});[...dots.children].forEach((n,j)=>{n.setAttribute('aria-current',String(j===index));});counter.textContent=(index+1)+' / '+items.length;};
  stage.append(gallery);
  if(items.length>1){
   const arrow=(dir)=>{const b=btn('',()=>show(index+dir),dir<0?'club-detail-prev':'club-detail-next');b.setAttribute('aria-label',dir<0?'Previous attachment':'Next attachment');b.innerHTML='<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(dir<0?'m15 6-6 6 6 6':'m9 6 6 6-6 6')+'"/></svg>';return b;};
   stage.append(arrow(-1),arrow(1));items.forEach((n,i)=>{const b=btn('',()=>show(i));b.setAttribute('aria-label','Attachment '+(i+1)+' of '+items.length);dots.append(b)});indicator.append(dots);
   let x=0,y=0;gallery.addEventListener('touchstart',e=>{x=e.changedTouches[0].clientX;y=e.changedTouches[0].clientY},{passive:true});gallery.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-x,dy=e.changedTouches[0].clientY-y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.3&&e.target.tagName!=='VIDEO')show(index+(dx<0?1:-1))},{passive:true});
   stage.tabIndex=0;stage.setAttribute('aria-label','Media gallery');stage.addEventListener('keydown',e=>{if(e.target.tagName==='VIDEO')return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();show(index+(e.key==='ArrowLeft'?-1:1));}});
  }
  indicator.append(counter);stage.append(indicator);
  show(0);if(inline)copy.append(stage);else layout.append(stage);
 }
 const head=el('div','club-detail-author');const who=copy.querySelector('.author');if(who){head.append(who);who.querySelector('button')?.addEventListener('click',()=>{if(!inline)dialog.close();});}head.append(el('small','',relativeDate(p.created_at)));
 const more=el('details','club-detail-options'),summary=el('summary','','•••');summary.setAttribute('aria-label','Post options');more.append(summary);
 const opts=el('div','club-detail-options-list');for(const b of [...actions.children])if(/Report|Edit|Delete/.test(b.textContent)){opts.append(b);b.addEventListener('click',()=>more.open=false);}if(sectionOf(p)==='discussions'&&admin)appendDiscussionModeration(opts,p);more.append(opts);head.append(more);
 actions.remove();if(p.kind==='Challenge')copy.append(challengeProgressPanel(p,true));scroll.append(copy,thread);
 const tools=el('div','club-detail-tools'),count=el('div','club-detail-count');
 function refreshActions(){const liked=likes.some(x=>x.post_id===id&&x.user_id===user?.id),total=likes.filter(x=>x.post_id===id).length;tools.replaceChildren(actionIcon('heart','Like',null,async()=>{await toggle('club_likes',id);refreshActions()},liked),actionIcon('comment','Comment',null,()=>ta.focus()),actionIcon('save','Save post',null,async()=>{await toggle('club_saved',id);refreshActions()},saved.has(id)));count.textContent=total+' likes · '+(commentCounts.get(id)||0)+' comments';}
 const form=el('form','club-inline-comment'),ta=el('textarea'),send=el('button','','Post'),note=el('div','club-comment-note'),reply=el('div','club-reply-target');let parent=null,gifFile=null,gifURL=null;
 ta.rows=1;ta.maxLength=4000;ta.required=true;ta.placeholder='Add a comment…';ta.setAttribute('aria-label','Add a comment');send.type='submit';send.disabled=true;
 const emoji=btn('☺',()=>{picker.hidden=!picker.hidden},'club-comment-emoji');emoji.setAttribute('aria-label','Add emoji');const picker=el('div','club-comment-picker');picker.hidden=true;for(const item of ['😀','😂','😊','😍','👍','👏','🙌','🙏','💪','❤️','🔥','✨','🎉','🌱'])picker.append(btn(item,()=>{const a=ta.selectionStart,z=ta.selectionEnd;if(ta.value.length-(z-a)+item.length<=4000)ta.setRangeText(item,a,z,'end');ta.dispatchEvent(new Event('input'));ta.focus();picker.hidden=true;}));
 if(inline){const gif=el('input');gif.type='file';gif.accept='image/gif';gif.hidden=true;const preview=el('div','discussion-gif-preview');const gifButton=btn('GIF',()=>gif.click());gif.onchange=()=>{const f=gif.files[0];if(!f)return;if(f.type!=='image/gif'||f.size>15728640){note.textContent='GIF only, up to 15 MB';gif.value='';return;}if(gifURL)URL.revokeObjectURL(gifURL);gifFile=f;gifURL=URL.createObjectURL(f);const img=el('img');img.src=gifURL;preview.replaceChildren(img,btn('×',()=>{URL.revokeObjectURL(gifURL);gifFile=null;gifURL=null;gif.value='';preview.replaceChildren();send.disabled=!ta.value.trim()&&!gifFile;}));ta.required=false;send.disabled=false;};form.append(gifButton,gif);footer.append(preview);if(p.comments_locked&&!admin){ta.disabled=true;gifButton.disabled=true;emoji.disabled=true;note.textContent='Comments are locked';}}form.append(emoji,ta,send);footer.append(tools,count,reply,picker,form,note);panel.append(head,scroll,footer);layout.append(panel);root.replaceChildren();if(inline){const nav=el('div','discussion-detail-nav');nav.append(btn('← Back to Discussions',closeDiscussion));if(p.is_notice)nav.append(el('strong','discussion-pin','NOTICE'));root.append(nav);}root.append(layout);if(inline)render();refreshActions();if(!inline&&!dialog.open)dialog.showModal();if(inline&&!restore){root.scrollIntoView({block:'nearest',behavior:'instant'});if(clubHistoryReady&&history.state?.discussionId===id)history.replaceState({...history.state,scroll:window.scrollY},'',location.href);}
 ta.addEventListener('input',()=>{send.disabled=!ta.value.trim();});ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();if(ta.value.trim()&&!send.disabled)form.requestSubmit();}});
 function replyTo(c){parent=c?.id||null;reply.replaceChildren();if(c){reply.append(el('span','','Replying to '+(profiles.get(c.author_id)?.nickname||'Club member')),btn('×',()=>replyTo(null)));ta.focus();}}
 async function refreshThread(){
  const [comments,answers]=await Promise.all([checked(db.from('club_comments').select('*').eq('post_id',id).order('created_at')),checked(db.from('club_answers').select('*').eq('post_id',id))]);if(epoch!==detailEpoch||!stillOpen())return;
  const reactionRows=comments.length?await checked(db.from('club_comment_likes').select('comment_id,user_id').in('comment_id',comments.map(c=>c.id))):[];if(epoch!==detailEpoch||!stillOpen())return;
  const accepted=answers[0]?.comment_id;thread.replaceChildren(el('h3','','Comments'));
  if(!comments.length)thread.append(el('p','club-no-comments','Be the first to comment.'));
  function branch(parentId,depth){for(const c of comments.filter(x=>x.parent_id===parentId)){const n=el('div','comment'+(depth?' child':''));n.style.marginLeft=Math.min(depth,4)*12+'px';const who=author(c.author_id);who.querySelector('button')?.addEventListener('click',()=>{if(!inline)dialog.close();});n.append(who,el('p','',c.gif_path&&c.body==='[GIF]'?'':c.body));if(c.gif_path&&/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.gif$/i.test(c.gif_path)){const img=el('img','discussion-comment-gif');img.src=url(c.gif_path);img.alt='GIF attachment';n.append(img);}if(accepted===c.id)n.append(el('strong','badge','✓ Best answer'));const a=el('div','actions');a.append(el('small','',relativeDate(c.created_at)));let reactions=reactionRows.filter(x=>x.comment_id===c.id),liked=reactions.some(x=>x.user_id===user?.id),count=reactions.length;const heart=btn('',async()=>{if(!ready()||heart.disabled)return;heart.disabled=true;try{if(liked){await checked(db.from('club_comment_likes').delete().eq('comment_id',c.id).eq('user_id',user.id));}else{await checked(db.from('club_comment_likes').insert({comment_id:c.id,user_id:user.id}));}const rows=await checked(db.from('club_comment_likes').select('user_id').eq('comment_id',c.id));count=rows.length;liked=rows.some(x=>x.user_id===user.id);paint();}catch(e){note.textContent=e.message}finally{heart.disabled=false}},'club-comment-like');function paint(){heart.replaceChildren(feedIcon('heart'),el('span','',count?String(count):''));heart.classList.toggle('is-liked',liked);heart.setAttribute('aria-pressed',String(liked));heart.setAttribute('aria-label',(liked?'Unlike':'Like')+' comment, '+count+' likes');}paint();a.append(heart);if(depth<5)a.append(btn('Reply',()=>{if(ready())replyTo(c)}));if(user?.id===p.author_id&&p.category==='Ask a PTA'&&!accepted)a.append(btn('Accept answer',async()=>{try{await checked(db.from('club_answers').insert({post_id:id,comment_id:c.id}));await refreshThread()}catch(e){note.textContent=e.message}}));if(user&&(admin||c.author_id===user.id))a.append(btn('Delete',async()=>{if(!confirm('Delete reply?'))return;try{await checked(db.from('club_comments').delete().eq('id',c.id));await refreshThread();await refreshCommentCounts();render();refreshActions()}catch(e){note.textContent=e.message}}));n.append(a);thread.append(n);branch(c.id,depth+1)}}
  branch(null,0);commentCounts.set(id,comments.length);refreshActions();
 }
 form.onsubmit=async e=>{e.preventDefault();const body=ta.value.trim();if((!body&&!gifFile)||send.disabled||!ready()||(inline&&p.comments_locked&&!admin))return;send.disabled=true;note.textContent='';try{await checked(db.from('club_comments').insert({post_id:id,author_id:user.id,parent_id:parent,body:body||'[GIF]',...(gifFile?{gif_path:await upload(gifFile)}:{})}));if(epoch!==detailEpoch)return;ta.value='';if(gifURL){URL.revokeObjectURL(gifURL);gifURL=null;gifFile=null;footer.querySelector('.discussion-gif-preview')?.replaceChildren();form.querySelector('input[type=file]').value='';ta.required=true;}replyTo(null);await refreshThread();render();scroll.scrollTop=scroll.scrollHeight;ta.focus({preventScroll:true});}catch(e){note.textContent=e.message}finally{send.disabled=!ta.value.trim();}};
 try{await refreshThread()}catch(e){note.textContent=e.message}
}
let clubReportJumpDone=false;
async function loadReports(){if(!admin){$('reports').hidden=true;return;}const list=await checked(db.from('club_reports').select('*').order('created_at',{ascending:false}));const requested=new URLSearchParams(location.search).get('reports')==='1';$('reports').hidden=!list.length&&!requested;$('clubReportsCount').textContent=String(list.length);$('reportList').replaceChildren(...list.map(r=>{const d=el('div','club-report-item'),title=posts.find(p=>p.id===r.post_id)?.title;d.append(el('strong','club-report-title',title||'Reported post'),el('small','club-report-time',relativeDate(r.created_at)),el('p','',r.reason));const actions=el('div','club-report-actions');actions.append(btn('Review post',async()=>{try{let p=posts.find(p=>p.id===r.post_id);if(!p){p=await checked(db.from('club_posts').select('*').eq('id',r.post_id).maybeSingle());if(!p)throw Error('Post is no longer available.');posts.push(p);}switchTab(sectionOf(p));await openPost(p.id);}catch(e){alert(e.message);}}),btn('Dismiss',async()=>{if(!confirm('Dismiss this report? The original post will remain.'))return;try{await checked(db.from('club_reports').delete().eq('id',r.id).select('id').single());await loadReports();window.dispatchEvent(new Event('tyc-admin-queue-updated'));}catch(e){alert(e.message);}}));d.append(actions);return d}));if(!list.length&&requested)$('reportList').append(el('p','club-report-empty','No pending Club reports.'));if(!clubReportJumpDone&&requested){clubReportJumpDone=true;setTimeout(()=>$('reports').scrollIntoView({behavior:'smooth',block:'start'}),350);}}
setInterval(()=>{if(admin&&!document.hidden)void loadReports().catch(()=>{});},30000);



// Challenge participation: the author is enrolled by the database on creation.
let challengeMembers=[],challengeCheckins=[],challengeScores=[],challengeBusy=new Set(),challengeDataError='',challengeLoaded=false;
const challengeDay=()=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return parts.year+'-'+parts.month+'-'+parts.day;};
const challengeEnd=p=>Date.parse(p.created_at)+(p.challenge_days||30)*86400000;
const challengeActive=(p,now=Date.now())=>now<challengeEnd(p);
let challengeExpiryTimer=null;
function scheduleChallengeExpiry(){
 clearTimeout(challengeExpiryTimer);challengeExpiryTimer=null;
 if(!['home','feed','challenges'].includes(tab)||document.hidden)return;
 const now=Date.now(),next=posts.reduce((min,p)=>{const end=challengeEnd(p);return p.kind==='Challenge'&&end>now?Math.min(min,end):min;},Infinity);
 if(!Number.isFinite(next))return;
 challengeExpiryTimer=setTimeout(()=>{if(['home','feed','challenges'].includes(tab)&&!document.hidden)render();},Math.min(2147483647,Math.max(1,next-now+1)));
}
async function deleteClubPost(p){
 await checked(db.from('club_posts').delete().eq('id',p.id).select('id').single());
 if(p.kind!=='Challenge')return;
 ++loadVersion;
 posts=posts.filter(row=>row.id!==p.id);savedPosts=savedPosts.filter(row=>row.id!==p.id);saved.delete(p.id);
 challengeMembers=challengeMembers.filter(row=>row.post_id!==p.id);challengeCheckins=challengeCheckins.filter(row=>row.post_id!==p.id);challengeScores=challengeScores.filter(row=>row.post_id!==p.id);
 expandedChallengeHistory.delete(p.id);expandedChallengeMembers.delete(p.id);
 render();
}
const challengeJoined=p=>challengeMembers.some(m=>m.post_id===p.id&&m.user_id===user?.id);
const challengeChecked=p=>challengeCheckins.some(m=>m.post_id===p.id&&m.checkin_day===challengeDay());
const challengeField=el('label','club-challenge-duration');
challengeField.id='clubChallengeDurationField';challengeField.hidden=true;challengeField.append('Duration (days)');
const challengeDuration=el('input');challengeDuration.id='clubChallengeDuration';challengeDuration.type='number';challengeDuration.min='1';challengeDuration.max='365';challengeDuration.step='1';challengeDuration.defaultValue='30';challengeDuration.value='30';challengeDuration.disabled=true;challengeField.append(challengeDuration);const officialField=el('label','challenge-official-field');officialField.hidden=true;const officialCheck=el('input');officialCheck.type='checkbox';officialField.append(officialCheck,document.createTextNode(' Official THE CLUB Challenge'));
$('title').closest('label').after(challengeField);challengeField.after(officialField);
const challengeReminder=el('section','club-challenge-reminder');challengeReminder.id='clubChallengeReminder';challengeReminder.hidden=true;$('clubHomeTabs').closest('.club-editorial-header').after(challengeReminder);
const challengeCoverCatalog={
 'Fitness & Exercise':[
 ['workout','Workout',8401194],['running','Running',5037392],['marathon','Marathon',33995260],['strength-training','Strength Training',13088864],['walking','Walking / Steps',9986766],['cycling','Cycling',5644629],['swimming','Swimming',2062708],['hiking','Hiking',27776930],['stretching','Stretching / Mobility',4854279],['pilates','Yoga / Pilates',8769176]],
 'Health & Wellness':[
 ['healthy-eating','Healthy Eating / Diet',38706556],['meal-prep','Meal Prep',30635720],['nutrition','Balanced Nutrition',4220141],['hydration','Hydration',3124674],['sleep','Better Sleep',7505065],['meditation','Meditation',5201527],['stress-relief','Stress Relief',2908175],['journaling','Journaling / Gratitude',9032498],['mindfulness','Mindfulness',32097003],['self-care','Self-Care / Recovery',32628968]]
};
const challengeCoverAll=Object.values(challengeCoverCatalog).flat();
const challengeTemplates=[
 ['workout','Fitness & Exercise','Workout',30,'Aim for 30 minutes of movement or a planned recovery session each day. Choose an intensity that suits you. Check in after completing your daily plan.'],
 ['walking','Fitness & Exercise','Walking',30,'Aim for 8,000 steps a day, or a comfortable personal step target. Check in after meeting your goal.'],
 ['running','Fitness & Exercise','Running',14,'Follow a running or walk/run plan at your own pace. Include recovery days and check in after completing your planned activity or rest.'],
 ['stretching','Fitness & Exercise','Mobility',21,'Spend 15 minutes on comfortable stretching or mobility exercises each day. Avoid forcing painful movements.'],
 ['hydration','Health & Wellness','Hydration',14,'Meet your own appropriate daily hydration goal. Follow any fluid restrictions or guidance from your healthcare professional.'],
 ['sleep','Health & Wellness','Better Sleep',21,'Aim for a consistent bedtime and wake time, and make time for a calming bedtime routine each day.'],
 ['healthy-eating','Health & Wellness','Healthy Eating',30,'Include balanced meals and a variety of nourishing foods each day. Focus on sustainable habits rather than restriction.'],
 ['meditation','Health & Wellness','Meditation',7,'Set aside 10 minutes each day for meditation, quiet breathing or mindfulness.']
].map(([key,category,label,days,body])=>({key,category,label,days,body,cover:'preset-'+key,title:days+'-Day '+label+' Challenge'}));
const templateByCover=key=>challengeTemplates.find(t=>t.cover===key);
const challengeCoverChoices=()=>[...challengeTemplates.filter(t=>t.category===$('category').value).map(t=>[t.cover,t.label+' · New']),...challengeOptions()];

const challengeStockCoverURL=(key,width=800)=>{const item=challengeCoverAll.find(c=>c[0]===key);return item?'https://images.pexels.com/photos/'+item[2]+'/pexels-photo-'+item[2]+'.jpeg?auto=compress&cs=tinysrgb&w='+width:'';};
const challengeCoverURL=(key,width=800)=>templateByCover(key)?'challenge-covers/'+key+'.webp':key==='workout'?'challenge-workout.webp?v=2':challengeStockCoverURL(key,width);
function challengeCoverError(img,key,width,otherwise){return ()=>{const template=templateByCover(key);if(!img.dataset.coverFallback&&(template||key==='workout')){img.dataset.coverFallback='true';img.src=template?challengeCoverURL(template.key,width):challengeStockCoverURL(key,width);}else if(template?.key==='workout'&&img.dataset.coverFallback==='true'){img.dataset.coverFallback='stock';img.src=challengeStockCoverURL('workout',width);}else if(otherwise)otherwise();};}
const challengeOptions=()=>challengeCoverCatalog[$('category').value]||challengeCoverCatalog['Fitness & Exercise'];
const challengeTitleLabel=$('title').closest('label'),challengeBodyLabel=document.querySelector('label[for="body"]');
const challengeActivityField=el('label','challenge-activity-field');challengeActivityField.id='clubChallengeActivityField';challengeActivityField.hidden=true;challengeActivityField.append('Challenge type');
const challengeActivity=el('select');challengeActivity.id='clubChallengeActivity';challengeActivity.disabled=true;challengeActivityField.append(challengeActivity);challengeTitleLabel.before(challengeActivityField);
const challengeTitlePreview=el('div','challenge-title-preview');challengeTitlePreview.id='clubChallengeTitlePreview';challengeTitlePreview.hidden=true;challengeField.after(challengeTitlePreview);
const challengeCoverField=el('section','challenge-cover-field');challengeCoverField.id='clubChallengeCoverField';challengeCoverField.hidden=true;
const challengeCoverHead=el('strong','','Cover photo'),challengeCoverNote=el('p','challenge-cover-note'),challengeCoverGrid=el('div','challenge-cover-picker');challengeCoverGrid.setAttribute('role','group');challengeCoverGrid.setAttribute('aria-label','Choose a cover photo');
const challengeCoverCredit=el('a','challenge-cover-credit','Photos by Pexels');challengeCoverCredit.href='https://www.pexels.com/';challengeCoverCredit.target='_blank';challengeCoverCredit.rel='noopener noreferrer';
challengeCoverField.append(challengeCoverHead,challengeCoverNote,challengeCoverGrid,challengeCoverCredit);challengeTitlePreview.after(challengeCoverField);
let chosenChallengeCover='',legacyChallengeTitle='',customChallengeTitle=false;
const isChallengePhoto=entry=>entry.file?entry.file.type.startsWith('image/'):/\.(jpg|jpeg|png|webp|avif|gif)$/i.test(entry.path||'');
function updateChallengeTitle(){if($('kind').value!=='Challenge')return;const option=challengeOptions().find(x=>x[0]===challengeActivity.value);const days=Number(challengeDuration.value)||30;const template=challengeTemplates.find(t=>t.key===challengeActivity.value&&t.category===$('category').value);const title=customChallengeTitle?$('title').value:legacyChallengeTitle||days+'-Day '+(template?.label||option?.[1]||'Fitness')+' Challenge';$('title').value=title;challengeTitlePreview.textContent=title;}
function paintChallengeCovers(){if(challengeCoverField.hidden)return;const photo=clubMediaFiles.find(isChallengePhoto);challengeCoverGrid.replaceChildren();
 if(photo){challengeCoverNote.textContent='Your first uploaded photo will be used as the cover.';const img=el('img','challenge-upload-cover');img.src=photo.url;img.alt='Your uploaded cover photo';challengeCoverGrid.append(img);challengeCoverCredit.hidden=true;return;}
 challengeCoverCredit.hidden=false;challengeCoverNote.textContent='Choose a photo, or upload your own below.';for(const [key,label] of challengeCoverChoices()){const b=btn('',()=>{chosenChallengeCover=key;paintChallengeCovers();challengeCoverGrid.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});},'challenge-cover-option');b.setAttribute('aria-label','Select '+label+' cover');b.setAttribute('aria-pressed',String(chosenChallengeCover===key));const img=el('img');img.alt='';img.src=challengeCoverURL(key,360);img.loading='lazy';img.onerror=challengeCoverError(img,key,360,()=>{img.hidden=true;b.classList.add('cover-image-missing');});b.append(img,el('span','',label));challengeCoverGrid.append(b);}
}
function setChallengeActivities(preferred){const items=challengeOptions();challengeActivity.replaceChildren(...items.map(([key,label])=>{const option=el('option','',label);option.value=key;return option;}));challengeActivity.value=items.some(x=>x[0]===preferred)?preferred:items[0][0];}
challengeActivity.onchange=()=>{legacyChallengeTitle='';customChallengeTitle=false;chosenChallengeCover=challengeActivity.value;updateChallengeTitle();paintChallengeCovers();};
challengeDuration.addEventListener('input',()=>{legacyChallengeTitle='';updateChallengeTitle();});$('title').addEventListener('input',()=>{if($('kind').value==='Challenge'){customChallengeTitle=true;challengeTitlePreview.textContent=$('title').value;}});
$('category').addEventListener('change',()=>{if($('kind').value!=='Challenge')return;legacyChallengeTitle='';setChallengeActivities();chosenChallengeCover=challengeActivity.value;updateChallengeTitle();paintChallengeCovers();});
function syncChallengeComposer(){const active=$('kind').value==='Challenge';officialField.hidden=!(active&&admin);officialCheck.disabled=!(active&&admin);officialCheck.checked=!!editingPost?.is_official_challenge;challengeField.hidden=!active;challengeDuration.disabled=!active;challengeDuration.required=active;challengeActivityField.hidden=!active;challengeActivity.disabled=!active;challengeCoverField.hidden=!active;challengeTitlePreview.hidden=!active;challengeTitleLabel.hidden=false;$('title').readOnly=false;customChallengeTitle=!!(active&&editingPost);
 challengeBodyLabel.textContent=active?'Challenge Details':'Share your story';$('body').placeholder=active?'Add your goal, daily routine, guidelines or anything participants should know. E.g. Run 5 miles a day at your own pace.':'';
 if(active){challengeDuration.value=editingPost?.challenge_days||30;setChallengeActivities(editingPost?.challenge_activity);legacyChallengeTitle=editingPost&&!editingPost.challenge_activity?editingPost.title:'';chosenChallengeCover=challengeCoverChoices().some(x=>x[0]===editingPost?.challenge_cover)?editingPost.challenge_cover:challengeActivity.value;updateChallengeTitle();paintChallengeCovers();}
}

function createChallenge(){if(!ready()||clubMediaBusy)return;closePostMenu();showChallengePicker();}
async function challengePages(makeQuery){const rows=[];for(let from=0;;from+=500){const page=await checked(makeQuery().range(from,from+499));rows.push(...page);if(page.length<500)return rows;}}
async function readChallengePosts(){return challengePages(()=>db.from('club_posts').select('*').eq('kind','Challenge').order('created_at',{ascending:false}).order('id',{ascending:true}));}
async function readChallengeData(){
 if(!user)return {members:[],checkins:[],scores:[],error:''};
 try{const uid=user.id;const [members,checkins,scores]=await Promise.all([challengePages(()=>db.from('club_challenge_members').select('post_id,user_id,joined_at,share_progress').order('joined_at',{ascending:true}).order('post_id',{ascending:true}).order('user_id',{ascending:true})),challengePages(()=>db.from('club_challenge_checkins').select('post_id,checkin_day').eq('user_id',uid).order('post_id').order('checkin_day')),challengePages(()=>db.from('club_challenge_scores').select('post_id,user_id,days').order('post_id').order('user_id'))]);return {members,checkins,scores,error:''};}
 catch(e){return {members:[],checkins:[],scores:[],error:e.message||'Unable to load participation.'};}
}
function applyChallengeData(data){challengeMembers=data.members;challengeCheckins=data.checkins;challengeScores=data.scores||[];challengeDataError=data.error;challengeLoaded=true;}
async function changeChallenge(p,action){if(!ready()||challengeBusy.has(p.id))return;const uid=user.id,day=challengeDay();if(['checkin','undo-checkin'].includes(action)&&(!challengeActive(p)||!challengeJoined(p)||challengeDataError))return;if(['join','leave'].includes(action)&&(!challengeActive(p)||!challengeLoaded||challengeDataError))return;if(action==='leave'&&!confirm('Cancel your participation? All of your check-ins for this challenge will be removed. The challenge itself will remain.'))return;challengeBusy.add(p.id);render();try{
 if(action==='join'){const result=await db.from('club_challenge_members').insert({post_id:p.id,user_id:user.id});if(result.error&&result.error.code!=='23505')throw result.error;}
 else if(action==='leave')await checked(db.from('club_challenge_members').delete().eq('post_id',p.id).eq('user_id',uid));
 else if(action==='undo-checkin'){await checked(db.from('club_challenge_checkins').delete().eq('post_id',p.id).eq('user_id',uid).eq('checkin_day',day));}
 else if(action==='checkin'){const result=await db.from('club_challenge_checkins').insert({post_id:p.id,user_id:uid,checkin_day:day});if(result.error&&result.error.code!=='23505')throw result.error;}
 const next=await readChallengeData();if(user?.id!==uid)return;applyChallengeData(next);if(next.error)throw Error(next.error);if(action==='leave'&&challengeJoined(p))throw Error('Unable to cancel participation. Please try again.');if(action==='join'&&!challengeJoined(p))throw Error('Unable to join. Please try again.');if(action==='undo-checkin'&&next.checkins.some(m=>m.post_id===p.id&&m.checkin_day===day))throw Error('Unable to undo today’s check-in. Please try again.');
 }catch(e){alert(e.message||'Unable to update challenge.');}finally{challengeBusy.delete(p.id);render();}
}
function renderChallengeSignals(){
 const all=posts.filter(p=>p.kind==='Challenge'),badge=document.querySelector('nav.rail button[data-tab="challenges"]');
 const key='tyc-challenges-seen-'+(user?.id||'guest');let seen=0;try{seen=Number(localStorage.getItem(key)||0);}catch{}
 const latest=Math.max(0,...all.map(p=>Date.parse(p.created_at)||0));
 if(tab==='challenges'&&latest){seen=latest;try{localStorage.setItem(key,String(latest));}catch{}}
 if(badge){badge.classList.toggle('has-new-challenge',all.some(p=>p.author_id!==user?.id&&Date.parse(p.created_at)>seen));}
 challengeReminder.hidden=true;challengeReminder.replaceChildren();
 if(tab!=='home'||!user||!challengeLoaded||challengeDataError)return;
 const due=all.filter(p=>challengeActive(p)&&challengeJoined(p)&&!challengeChecked(p));if(!due.length)return;
 challengeReminder.hidden=false;const head=el('div','challenge-reminder-heading');head.append(el('strong','','Your daily challenge check-in'),el('span','','Are you keeping up with your goals today?'));challengeReminder.append(head);
 for(const p of due){const line=el('div','challenge-reminder-row');const b=btn('Done today',()=>changeChallenge(p,'checkin'),'challenge-primary');b.disabled=challengeBusy.has(p.id);line.append(btn(p.title,()=>{switchTab('challenges');requestAnimationFrame(()=>document.getElementById('challenge-'+p.id)?.scrollIntoView({behavior:'smooth',block:'center'}));},'challenge-reminder-link'),b);challengeReminder.append(line);}
}
const expandedChallengeMembers=new Set(),expandedChallengeHistory=new Set();
function challengeCard(p,compact=false){
 const a=el('article','club-challenge-card'+(compact?' challenge-compact':''));a.id='challenge-'+p.id;
 const thumb=btn('',()=>openPost(p.id),'challenge-cover');thumb.setAttribute('aria-label','Open '+p.title);
 const uploaded=(p.media||[]).find(x=>/\.(jpg|jpeg|png|webp|avif|gif)$/i.test(x));
 const cover=uploaded?url(uploaded):challengeCoverURL(p.challenge_cover||p.challenge_activity);
 const fallback=()=>{thumb.replaceChildren();thumb.classList.add('challenge-cover-fallback',topicOf(p)==='Health & Wellness'?'is-wellness':'is-fitness');thumb.append(el('span','challenge-cover-symbol',topicOf(p)==='Health & Wellness'?'♡':'✳'),el('span','challenge-cover-label',topicOf(p)==='Health & Wellness'?'WELLNESS':'FITNESS'));};
 if(cover){const m=el('img');m.src=cover;m.loading='lazy';m.alt='';m.onerror=challengeCoverError(m,uploaded?'':p.challenge_cover||p.challenge_activity,800,fallback);thumb.append(m);}else fallback();
 const copy=el('div','challenge-card-copy'),meta=el('div','challenge-card-meta'),active=challengeActive(p),joined=challengeJoined(p);
 meta.append(el('span','challenge-topic',topicOf(p)==='Health & Wellness'?'Wellness':'Fitness'),el('span','challenge-length',(p.challenge_days||30)+' days'),el('span','challenge-state',active?'Active':'Ended'));
 if(p.is_official_challenge)meta.prepend(el('span','challenge-official-badge','★ Official'));copy.append(meta,btn(p.title,()=>openPost(p.id),'challenge-title'));if(!compact)copy.append(el('p','challenge-description',p.body||''));copy.append(author(p.author_id));
 const actions=el('div','challenge-actions');if(active&&!joined){const b=btn('Join challenge',()=>changeChallenge(p,'join'),'challenge-primary');b.disabled=challengeBusy.has(p.id)||!!(user&&(!challengeLoaded||challengeDataError));if(p.author_id===user?.id)actions.append(el('span','challenge-joined','Host'));actions.append(b);}else if(joined){if(active){const joinedButton=btn(p.author_id===user?.id?'Host · Joined':'✓ Joined',()=>changeChallenge(p,'leave'),'challenge-secondary challenge-joined challenge-joined-toggle');joinedButton.disabled=challengeBusy.has(p.id)||!!challengeDataError||!challengeLoaded;joinedButton.setAttribute('aria-pressed','true');joinedButton.setAttribute('aria-label','Cancel participation');joinedButton.title='Click again to cancel participation';actions.append(joinedButton);}else actions.append(el('span','challenge-joined',p.author_id===user?.id?'Host · Joined':'✓ Joined'));if(active){const done=challengeChecked(p);const b=btn(done?'✓ Done today':'Check in',()=>changeChallenge(p,done?'undo-checkin':'checkin'),'challenge-primary'+(done?' challenge-done':''));b.disabled=challengeBusy.has(p.id)||!!challengeDataError||!challengeLoaded;b.setAttribute('aria-pressed',String(done));b.setAttribute('aria-label',done?'Undo today’s check-in':'Check in today');if(done)b.title='Click again to undo today’s check-in';actions.append(b);}}
 const options=el('div','challenge-options');options.append(btn(saved.has(p.id)?'Saved':'Save',()=>toggle('club_saved',p.id),'challenge-secondary'));if(user&&p.author_id===user.id)options.append(btn('Edit',()=>editClubPost(p),'challenge-secondary'));if(user&&(admin||p.author_id===user.id))options.append(btn('Delete',async()=>{if(!confirm('Permanently delete this challenge and its participation records? It will not appear in Completed Challenges.'))return;try{await deleteClubPost(p);await load();}catch(e){alert(e.message);}},'challenge-secondary'));actions.append(options);copy.append(actions);
 const members=el('div','challenge-members');const rows=challengeMembers.filter(m=>m.post_id===p.id);members.append(el('strong','',user&&!challengeDataError?'Participants ('+rows.length+')':'Participants'));
 if(!user)members.append(el('p','','Sign in to see who joined.'));else if(challengeDataError)members.append(el('p','','Unable to load participants.'));else if(!rows.length)members.append(el('p','','Be the first to join.'));else for(const row of rows){const line=el('div','challenge-member');const memberAuthor=author(row.user_id);memberAuthor.querySelector('.club-verified-role')?.remove();line.append(memberAuthor);if(row.user_id===p.author_id)line.append(el('small','','Host'));members.append(line);}
 if(compact){const d=el('details','challenge-member-disclosure');d.open=expandedChallengeMembers.has(p.id);const s=el('summary','',user&&!challengeDataError&&challengeLoaded?'Participants ('+rows.length+')':'Participants');members.firstElementChild?.remove();d.append(s,members);d.addEventListener('toggle',()=>{if(d.open)expandedChallengeMembers.add(p.id);else expandedChallengeMembers.delete(p.id);});a.append(thumb,copy,d);}else a.append(thumb,copy,members);return a;
}


let selectedMyChallenge='',myChallengeCalendar=new Set();
const dayIndex=s=>Math.round(Date.parse(s+'T00:00:00Z')/86400000);
const isoDay=n=>new Date(n*86400000).toISOString().slice(0,10);
const pacificDate=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).reduce((a,x)=>(a[x.type]=x.value,a),{});
function challengeDate(d){const v=pacificDate(d);return v.year+'-'+v.month+'-'+v.day;}
function challengeProgress(p){
 const goal=Math.max(1,Number(p.challenge_days)||30),start=dayIndex(challengeDate(new Date(p.created_at))),last=dayIndex(challengeDate(new Date(challengeEnd(p)-1))),today=dayIndex(challengeDay());
 const days=[...new Set(challengeCheckins.filter(x=>x.post_id===p.id).map(x=>dayIndex(x.checkin_day)))].filter(x=>x>=start&&x<=last&&x<=today).sort((a,b)=>a-b);
 let best=0,run=0,prev=-Infinity;for(const d of days){run=d===prev+1?run+1:1;best=Math.max(best,run);prev=d;}
 const end=Math.min(last,today),streak=prev>=end-1?run:0,done=Math.min(days.length,goal);
 return {goal,start,last,today,days:new Set(days),done,percent:Math.floor(done/goal*100),streak,best,complete:done>=goal};
}
function challengeBadge(text){return el('span','challenge-achievement-badge',text);}
function challengeCertificate(p,s){
 if(!s.complete||challengeActive(p)||!challengeJoined(p))return;
 const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=960;const g=canvas.getContext('2d');if(!g)return;
 g.fillStyle='#f5f8f1';g.fillRect(0,0,1400,960);g.strokeStyle='#164b35';g.lineWidth=5;g.strokeRect(40,40,1320,880);g.strokeStyle='#bd9349';g.lineWidth=2;g.strokeRect(60,60,1280,840);
 const line=(value,y,size,color,weight='400')=>{g.fillStyle=color;g.font=weight+' '+size+'px Georgia';while(g.measureText(value).width>1200&&size>20){size-=2;g.font=weight+' '+size+'px Georgia';}g.textAlign='center';g.fillText(value,700,y);};
 line('THE YOUNG CLUB',150,36,'#164b35','700');line('CERTIFICATE OF COMPLETION',270,49,'#164b35','700');line('Presented to',365,27,'#6a786a');line(profiles.get(user?.id)?.nickname||'Club member',455,62,'#164b35','700');line('for completing',540,27,'#6a786a');line(p.title,625,44,'#164b35','700');line(s.goal+' daily check-ins · '+challengeDate(new Date(challengeEnd(p)-1)),705,29,'#557561');line('Small steps. Bigger changes.',805,30,'#a87c37');line('Community participation certificate · Self-reported activity',860,21,'#6a786a');
 canvas.toBlob(blob=>{if(!blob)return;const u=URL.createObjectURL(blob),a=el('a');a.href=u;a.download='the-club-challenge-certificate.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);},'image/png');
}
function challengeProgressPanel(p,inDetail=false){
 const panel=el('section','challenge-progress-panel');if(inDetail)panel.dataset.challengeProgressId=p.id;
 if(p.is_official_challenge)panel.append(el('span','challenge-official-badge','★ Official THE CLUB Challenge'));
 const active=challengeActive(p),joined=challengeJoined(p),s=challengeProgress(p);
 if(!user){panel.append(el('p','challenge-progress-muted','Log in to join and track your challenge.'),btn('Log in',guard,'challenge-progress-button'));return panel;}
 if(!challengeLoaded||challengeDataError){panel.append(el('p','challenge-progress-muted',challengeDataError?'Progress is temporarily unavailable.':'Loading progress…'));return panel;}
 const actions=el('div','challenge-progress-actions');
 if(active){const b=btn(joined?(challengeChecked(p)?'✓ Done today':'Check in today'):'Join challenge',()=>changeChallenge(p,joined?(challengeChecked(p)?'undo-checkin':'checkin'):'join'),'challenge-progress-button');b.disabled=challengeBusy.has(p.id);actions.append(b);}
 if(joined){
  const heading=el('div','challenge-progress-heading');heading.append(el('strong','','My Progress'),el('strong','challenge-progress-percent',s.percent+'%'));panel.append(heading);
  const bar=el('progress','challenge-progress-bar');bar.max=s.goal;bar.value=s.done;bar.setAttribute('aria-label','Challenge completion');panel.append(bar);
  const stats=el('div','challenge-progress-stats');for(const [value,label] of [[s.done+' / '+s.goal,'Days completed'],[s.streak,active?'Current streak':'Final streak'],[s.best,'Best streak']]){const item=el('div');item.append(el('strong','',String(value)),el('small','',label));stats.append(item);}panel.append(stats);
  const badges=el('div','challenge-achievements');if(s.done)badges.append(challengeBadge('✦ First step'));if(s.best>=7)badges.append(challengeBadge('✦ 7-day streak'));if(s.percent>=50)badges.append(challengeBadge('✦ Halfway'));if(s.complete)badges.append(challengeBadge('★ Goal achieved'));if(badges.children.length)panel.append(badges);
  const calendar=el('details','challenge-calendar');calendar.open=myChallengeCalendar.has(p.id);calendar.append(el('summary','','Challenge Calendar · Pacific Time'));
  const grid=el('div','challenge-calendar-grid');let month='';for(let d=s.start;d<=s.last&&d<s.start+367;d++){const date=new Date(d*86400000),key=isoDay(d).slice(0,7);if(key!==month){month=key;const label=el('strong','challenge-calendar-month',date.toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'}));label.style.gridColumn='1 / -1';grid.append(label);for(const day of ['S','M','T','W','T','F','S'])grid.append(el('small','challenge-calendar-weekday',day));for(let n=0;n<date.getUTCDay();n++)grid.append(el('span'));}const cell=el('span','challenge-calendar-day'+(s.days.has(d)?' is-checked':d===s.today?' is-today':d>s.today?' is-future':''),String(date.getUTCDate()));cell.title=isoDay(d)+(s.days.has(d)?' · Checked in':d>s.today?' · Upcoming':' · Not checked in');cell.setAttribute('aria-label',cell.title);grid.append(cell);}calendar.append(grid,el('small','challenge-progress-muted','Green = checked in · Outline = today · Dates follow Pacific Time.'));calendar.addEventListener('toggle',()=>{if(calendar.open)myChallengeCalendar.add(p.id);else myChallengeCalendar.delete(p.id);});panel.append(calendar);
  if(!active&&s.complete)actions.append(btn('Download certificate',()=>challengeCertificate(p,s),'challenge-progress-secondary'));
  if(active&&s.complete)panel.append(el('p','challenge-progress-muted','Goal achieved! Your certificate will be available when the challenge ends.'));
 }
 if(actions.children.length)panel.append(actions);
 if(joined){
  const member=challengeMembers.find(m=>m.post_id===p.id&&m.user_id===user.id),label=el('label','challenge-share-progress'),check=el('input');check.type='checkbox';check.checked=!!member?.share_progress;check.disabled=challengeBusy.has(p.id);
  label.append(check,document.createTextNode(' Share my check-in total on this leaderboard'));
  check.onchange=async()=>{const uid=user.id;check.disabled=true;try{await checked(db.from('club_challenge_members').update({share_progress:check.checked}).eq('post_id',p.id).eq('user_id',uid));const next=await readChallengeData();if(user?.id!==uid)return;applyChallengeData(next);render();}catch(e){check.checked=!check.checked;check.disabled=false;alert(e.message||'Unable to update sharing.');}};panel.append(label);
 }
 const board=el('div','challenge-leaderboard');board.append(el('strong','','Leaderboard'));
 const ranked=challengeMembers.filter(m=>m.post_id===p.id&&m.share_progress).map(m=>({id:m.user_id,days:Math.min(s.goal,challengeScores.find(x=>x.post_id===p.id&&x.user_id===m.user_id)?.days||0)})).sort((a,b)=>b.days-a.days||a.id.localeCompare(b.id)).slice(0,10);
 if(!ranked.length)board.append(el('p','challenge-progress-muted','No members have shared progress yet.'));
 else for(let i=0;i<ranked.length;i++){const row=el('div','challenge-leaderboard-row'),rank=ranked.findIndex(x=>x.days===ranked[i].days)+1,profile=profiles.get(ranked[i].id);row.append(el('span','',String(rank)),avatar(profile),el('span','',profile?.nickname||'Club member'),el('strong','',ranked[i].days+' / '+s.goal));board.append(row);}
 board.append(el('small','challenge-progress-muted','Optional sharing · Ranked by check-ins, not exercise intensity.'));panel.append(board);return panel;
}
function myChallengeCard(p,onSelect){
 const progress=challengeProgress(p),profile=profiles.get(p.author_id),active=challengeActive(p),selected=p.id===selectedMyChallenge;
 const card=btn('',onSelect,'my-challenge-card'+(selected?' is-selected':''));
 card.dataset.challengeId=p.id;card.setAttribute('aria-pressed',String(selected));
 const thumb=el('div','my-challenge-thumb'),key=p.challenge_cover||p.challenge_activity,uploaded=(p.media||[]).find(x=>/\.(jpg|jpeg|png|webp|avif|gif)$/i.test(x)),cover=uploaded?url(uploaded):challengeCoverURL(key,360);
 const fallback=()=>{thumb.querySelector('img')?.remove();thumb.classList.add('is-fallback');thumb.prepend(el('span','my-challenge-cover-label',topicOf(p)==='Health & Wellness'?'WELLNESS':'FITNESS'));};
 if(cover){const img=el('img');img.src=cover;img.alt='';img.loading='lazy';img.onerror=challengeCoverError(img,uploaded?'':key,360,fallback);thumb.append(img);}else fallback();
 thumb.append(el('span','my-challenge-state'+(active?'':' is-ended'),active?'Active':'Ended'));
 if(p.is_official_challenge)thumb.append(el('span','my-challenge-official','★ Official'));
 const copy=el('div','my-challenge-copy'),title=el('strong','my-challenge-title',p.title);title.title=p.title;
 const host=el('span','my-challenge-host','by '+(profile?.nickname||'Club member'));
 const fmt=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Los_Angeles'});
 const dates=el('span','my-challenge-dates',fmt.format(new Date(p.created_at))+' – '+fmt.format(new Date(challengeEnd(p))));
 const track=el('span','my-challenge-meter'),fill=el('span');fill.style.width=progress.percent+'%';track.append(fill);
 const count=el('span','my-challenge-count',progress.percent+'% completed');
 copy.append(title,host,dates,track,count);card.append(thumb,copy);
 card.setAttribute('aria-label',p.title+', '+host.textContent+', '+dates.textContent+', '+(active?'Active':'Ended')+', '+count.textContent);
 return card;
}
function renderMyChallenges(){
 const root=$('myChallenges'),body=$('myChallengesBody');if(!root||!body)return;root.hidden=tab!=='challenges';if(root.hidden)return;
 const oldTrack=body.querySelector('.my-challenge-track'),offset=oldTrack?.scrollLeft||0,focusedId=oldTrack?.contains(document.activeElement)?document.activeElement.closest('.my-challenge-card')?.dataset.challengeId:null;
 body.replaceChildren();
 if(!user){body.append(el('p','challenge-progress-muted','Log in to track your challenges.'),btn('Log in',guard,'challenge-progress-button'));return;}
 if(!challengeLoaded||challengeDataError){body.append(el('p','challenge-progress-muted',challengeDataError?'Unable to load progress. Please refresh.':'Loading…'));return;}
 const mine=posts.filter(p=>p.kind==='Challenge'&&challengeJoined(p)).sort((a,b)=>Number(challengeActive(b))-Number(challengeActive(a))||Date.parse(b.created_at)-Date.parse(a.created_at));
 if(!mine.length){body.append(el('p','challenge-progress-muted','Join a challenge to see your personal progress here.'));return;}
 if(!mine.some(p=>p.id===selectedMyChallenge))selectedMyChallenge=mine[0].id;
 const rail=el('div','my-challenge-rail'),track=el('div','my-challenge-track');track.setAttribute('role','group');track.setAttribute('aria-label','Choose my challenge');track.tabIndex=0;
 const panel=el('div','my-challenge-selected-panel');
 function select(p){selectedMyChallenge=p.id;for(const item of track.children){const yes=item.dataset.challengeId===p.id;item.classList.toggle('is-selected',yes);item.setAttribute('aria-pressed',String(yes));}panel.replaceChildren(challengeProgressPanel(p));}
 for(const p of mine)track.append(myChallengeCard(p,()=>select(p)));
 const controls=el('div','my-challenge-controls'),hint=el('span','my-challenge-hint',mine.length+' joined · Select a challenge');
 const prev=btn('‹',()=>track.scrollBy({left:-Math.max(140,track.clientWidth*.75),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}),'my-challenge-arrow'),next=btn('›',()=>track.scrollBy({left:Math.max(140,track.clientWidth*.75),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}),'my-challenge-arrow');
 prev.setAttribute('aria-label','Previous challenges');next.setAttribute('aria-label','Next challenges');controls.append(hint,prev,next);rail.append(controls,track);body.append(rail,panel);select(mine.find(p=>p.id===selectedMyChallenge));track.scrollLeft=offset;
 function updateArrows(){const max=Math.max(0,track.scrollWidth-track.clientWidth);prev.hidden=next.hidden=max<=2;prev.disabled=track.scrollLeft<=2;next.disabled=track.scrollLeft>=max-2;}
 track.addEventListener('scroll',updateArrows,{passive:true});requestAnimationFrame(()=>{if(!track.isConnected)return;updateArrows();if(focusedId){[...track.children].find(c=>c.dataset.challengeId===focusedId)?.focus({preventScroll:true});}});
 track.addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();const cards=[...track.children],i=cards.findIndex(c=>c===document.activeElement),target=cards[Math.max(0,Math.min(cards.length-1,i+(e.key==='ArrowLeft'?-1:1)))];target?.focus();target?.scrollIntoView({block:'nearest',inline:'nearest'});});
}
function refreshChallengeDetailProgress(){const root=$('detailBody');if(!$('detail').open||!root)return;const old=root.querySelector('[data-challenge-progress-id]');if(!old)return;const p=posts.find(p=>p.id===old.dataset.challengeProgressId);if(p)old.replaceWith(challengeProgressPanel(p,true));else old.remove();}

function renderChallengeDashboard(list){
 const track=$('activeChallengeTrack'),history=$('feed'),offset=track.scrollLeft;
 const counts=new Map();for(const m of challengeMembers)counts.set(m.post_id,(counts.get(m.post_id)||0)+1);
 const canCount=!!user&&challengeLoaded&&!challengeDataError;
 const count=p=>counts.get(p.id)||0;
 const newest=(a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||String(b.id).localeCompare(String(a.id));
 const now=Date.now();
 const active=list.filter(p=>p.kind==='Challenge'&&challengeActive(p,now)).sort((a,b)=>(canCount?count(b)-count(a):0)||newest(a,b));
 const ended=list.filter(p=>p.kind==='Challenge'&&Number.isFinite(challengeEnd(p))&&!challengeActive(p,now)).sort((a,b)=>challengeEnd(b)-challengeEnd(a)||newest(a,b));
 $('activeChallengeCount').textContent=active.length+' active';
 $('activeChallengeSort').textContent=canCount?'Most participants first':user?(challengeDataError?'Participation unavailable':'Loading participation…'):'Sign in to see participation rankings';
 track.replaceChildren(...active.map(p=>challengeCard(p,true)));
 if(!active.length)track.append(el('p','challenge-dashboard-empty','No active challenges match this filter. Create a new challenge to get started.'));
 track.scrollLeft=offset;
 history.replaceChildren();
 if(!ended.length){history.append(el('p','challenge-dashboard-empty','No completed challenges match this filter. Finished challenges will appear here automatically.'));return;}
 const wrap=el('div','challenge-history-scroll'),table=el('table','challenge-history-table'),head=el('thead'),header=el('tr'),body=el('tbody');
 table.setAttribute('aria-label','Completed challenge history');
 for(const label of ['Challenge','Host','Duration','Completed','Participants','']){const th=el('th','',label);th.scope='col';header.append(th);}
 head.append(header);table.append(head,body);wrap.append(table);history.append(wrap);
 const fmt=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Los_Angeles'});
 for(const p of ended){
  const row=el('tr'),title=el('td','challenge-history-title'),host=el('td','challenge-history-host'),duration=el('td','',String(p.challenge_days||30)+' days'),date=el('td','',fmt.format(new Date(challengeEnd(p)))),participants=el('td','challenge-history-number',canCount?String(count(p)):'—'),action=el('td');
  title.append(btn(p.title,()=>openPost(p.id),'challenge-history-link'));host.append(author(p.author_id));
  const detailRow=el('tr','challenge-history-detail-row'),detailCell=el('td');detailCell.colSpan=6;
  const toggle=btn('Details',()=>{const open=detailRow.hidden;detailRow.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open){expandedChallengeHistory.add(p.id);if(!detailCell.firstChild)detailCell.append(challengeCard(p));}else expandedChallengeHistory.delete(p.id);},'challenge-history-link');
  const open=expandedChallengeHistory.has(p.id);detailRow.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)detailCell.append(challengeCard(p));action.append(toggle);
  row.append(title,host,duration,date,participants,action);detailRow.append(detailCell);body.append(row,detailRow);
 }
}


function renderChallengeBrowse(){
 const root=$('challengeBrowse');if(!root)return;root.hidden=tab!=='challenges';if(root.hidden)return;
 for(const b of root.querySelectorAll('[data-challenge-filter]'))b.setAttribute('aria-pressed',String(b.dataset.challengeFilter===category));
 const popular=$('challengePopular'),ranked=posts.filter(p=>p.kind==='Challenge'&&challengeActive(p)&&(!category||topicOf(p)===category));
 const counts=new Map();for(const x of likes)counts.set(x.post_id,(counts.get(x.post_id)||0)+1);
 ranked.sort((a,b)=>(counts.get(b.id)||0)-(counts.get(a.id)||0)||Date.parse(b.created_at)-Date.parse(a.created_at));
 popular.replaceChildren();
 if(ranked.length){popular.append(el('strong','','Popular in '+(category==='Fitness & Exercise'?'Fitness':category==='Health & Wellness'?'Wellness':'All Challenges')));const line=el('div','challenge-browse-links');for(const p of ranked.slice(0,2))line.append(btn(p.title+' · ♡ '+(counts.get(p.id)||0),()=>openPost(p.id),'challenge-browse-link'));popular.append(line);}
 const recommended=$('challengeRecommendations');recommended.replaceChildren();
 if(user&&challengeLoaded&&!challengeDataError){const own=posts.filter(p=>p.kind==='Challenge'&&challengeJoined(p)),fitness=own.filter(p=>topicOf(p)==='Fitness & Exercise').length,wellness=own.filter(p=>topicOf(p)==='Health & Wellness').length,preferred=fitness===wellness?'':fitness>wellness?'Fitness & Exercise':'Health & Wellness';const candidates=ranked.filter(p=>!challengeJoined(p));if(!category&&preferred)candidates.sort((a,b)=>Number(topicOf(b)===preferred)-Number(topicOf(a)===preferred));if(candidates.length){recommended.append(el('strong','','Recommended for you'));const line=el('div','challenge-browse-links');for(const p of candidates.slice(0,2))line.append(btn(p.title,()=>openPost(p.id),'challenge-browse-link'));recommended.append(line);}}
 const leaderboard=$('challengeCategoryLeaderboard');leaderboard.replaceChildren();
 if(user&&challengeLoaded&&!challengeDataError){const ids=new Set(posts.filter(p=>p.kind==='Challenge'&&(!category||topicOf(p)===category)).map(p=>p.id)),byUser=new Map(),sharing=new Set(challengeMembers.filter(m=>m.share_progress).map(m=>m.post_id+'|'+m.user_id)),byPost=new Map(posts.map(p=>[p.id,p]));
 for(const score of challengeScores){if(ids.has(score.post_id)&&sharing.has(score.post_id+'|'+score.user_id)){const days=Math.min(score.days,byPost.get(score.post_id)?.challenge_days||30);byUser.set(score.user_id,(byUser.get(score.user_id)||0)+days);}}
 const rows=[...byUser].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,10);
 const details=el('details','challenge-category-ranking');details.open=categoryLeaderboardOpen;details.addEventListener('toggle',()=>{categoryLeaderboardOpen=details.open;});details.append(el('summary','','Category Leaderboard · Shared check-ins'));
 if(!rows.length)details.append(el('p','challenge-progress-muted','No shared check-in totals yet.'));
 else rows.forEach(([id,days],i)=>{const row=el('div','challenge-leaderboard-row'),profile=profiles.get(id);row.append(el('span','',String(rows.findIndex(x=>x[1]===days)+1)),avatar(profile),el('span','',profile?.nickname||'Club member'),el('strong','',days+' days'));details.append(row);});
 details.append(el('small','challenge-progress-muted','Only opt-in totals are included. Not a measure of exercise intensity.'));leaderboard.append(details);}
}
let categoryLeaderboardOpen=false;
function challengeSpaceStats(){
 const section=el('section','challenge-space-stats');section.append(el('h3','','My Challenge Activity'));
 const grid=el('div','challenge-space-grid');
 for(const [key,label] of [['Fitness & Exercise','Fitness'],['Health & Wellness','Wellness']]){const mine=posts.filter(p=>p.kind==='Challenge'&&topicOf(p)===key&&challengeJoined(p)),cell=el('div','challenge-space-stat');cell.append(el('strong','',label),el('span','',mine.length+' joined · '+mine.filter(p=>!challengeActive(p)&&challengeProgress(p).complete).length+' completed'),el('small','',mine.reduce((n,p)=>n+challengeProgress(p).done,0)+' daily check-ins'));grid.append(cell);}
 section.append(grid,btn('View My Challenges',()=>switchTab('challenges'),'challenge-browse-link'));return section;
}
let pickerCategory='';
function showChallengePicker(){
 const dialog=$('challengePicker');if(!dialog)return;pickerCategory='';paintChallengePicker();if(!dialog.open)dialog.showModal();
}
function paintChallengePicker(){
 const dialog=$('challengePicker'),body=$('challengePickerBody'),title=$('challengePickerTitle');body.replaceChildren();
 if(!pickerCategory){title.textContent='Select a Category';const grid=el('div','challenge-picker-categories');for(const [key,label,desc] of [['Fitness & Exercise','Fitness','Movement & exercise'],['Health & Wellness','Wellness','Healthy daily habits']]){const b=btn('',()=>{pickerCategory=key;paintChallengePicker();},'challenge-picker-category');b.append(el('strong','',label),el('small','',desc));grid.append(b);}body.append(grid);return;}
 title.textContent='Choose a Template';body.append(btn('‹ Categories',()=>{pickerCategory='';paintChallengePicker();},'challenge-browse-link'));const grid=el('div','challenge-picker-grid');
 for(const t of challengeTemplates.filter(t=>t.category===pickerCategory)){const b=btn('',()=>{dialog.close();launchClubPost('challenges','Challenge',t.category);challengeActivity.value=t.key;challengeDuration.value=String(t.days);chosenChallengeCover=t.cover;customChallengeTitle=false;$('title').value=t.title;$('body').value=t.body;updateChallengeTitle();paintChallengeCovers();},'challenge-template-card');
 const img=el('img');img.src=challengeCoverURL(t.cover,360);img.alt='';img.loading='lazy';img.onerror=challengeCoverError(img,t.cover,360,()=>img.hidden=true);const copy=el('div');copy.append(el('strong','',t.title),el('small','',t.body.split('. ')[0]+'.'));b.append(img,copy);grid.append(b);}
 body.append(grid,btn('+ Create Your Own',()=>{const topic=pickerCategory;dialog.close();launchClubPost('challenges','Challenge',topic);$('body').value='';$('title').focus();},'challenge-picker-custom'));
}
$('challengePickerClose').onclick=()=>$('challengePicker').close();
$('createChallengeUnified').onclick=()=>createChallenge();
for(const b of $('challengeBrowse').querySelectorAll('[data-challenge-filter]'))b.onclick=()=>{category=b.dataset.challengeFilter;renderCategories();render();if(clubHistoryReady&&!clubRestoringHistory)history.replaceState(clubSnapshot(),'',clubHistoryURL(clubSnapshot()));};

let clubPostAnchor=null;
function closePostMenu(){const menu=$('clubPostMenu');menu.hidden=true;if(clubPostAnchor)clubPostAnchor.setAttribute('aria-expanded','false');$('create').setAttribute('aria-expanded','false');clubPostAnchor=null;}
function positionPostMenu(){const menu=$('clubPostMenu');if(menu.hidden||!clubPostAnchor)return;const r=clubPostAnchor.getBoundingClientRect(),w=menu.offsetWidth,h=menu.offsetHeight;menu.style.left=Math.max(8,Math.min(r.right-w,innerWidth-w-8))+'px';menu.style.top=Math.max(8,Math.min(r.bottom+7+h<=innerHeight?r.bottom+7:r.top-h-7,innerHeight-h-8))+'px';}
function launchClubPost(group,kind,topic){closePostMenu();editingPost=null;$('postForm').reset();clearClubMedia();$('kind').disabled=false;$('poll').disabled=false;configureComposer(group);if(topic&&topicGroups[group].includes(topic))$('category').value=topic;$('kind').value=kind;$('pollField').hidden=kind!=='Poll';$('composer').querySelector('h2').textContent='New '+kind+' Post';$('postForm').querySelector('[type=submit]').textContent='Publish';beginComposer();}
function openPostMenu(anchor){
 const menu=$('clubPostMenu');
 if(!menu.hidden&&clubPostAnchor===anchor){closePostMenu();return;}
 closePostMenu();
 clubPostAnchor=anchor instanceof HTMLElement&&anchor.matches('button')?anchor:$('create');
 const sidebar=clubPostAnchor.matches('nav.rail button[data-tab="create"]');
 const icons={Photo:'▧',Video:'▷',Journal:'✎',Discussion:'☷',Poll:'▥',Workout:'✳',Challenge:'☆'};
 menu.classList.toggle('club-post-sidebar-menu',sidebar);
 menu.setAttribute('aria-label',sidebar?'Choose post section':'Choose post type');
 menu.replaceChildren();
 if(sidebar){
  for(const [group,label] of [['feed','FEED'],['discussions','DISCUSSIONS'],['challenges','CHALLENGES']]){
   const b=btn(label,event=>{
    event.stopPropagation();
    menu.setAttribute('aria-label','Choose '+label.toLowerCase()+' post type');
    if(group==='challenges'){createChallenge();return;}
    const kinds=kindGroups[group];
    menu.replaceChildren(...kinds.map(kind=>btn(kind,()=>launchClubPost(group,kind),'club-post-subitem')));
    positionPostMenu();
    menu.querySelector('button')?.focus({preventScroll:true});
   },'club-post-section club-post-section-expand');
   menu.append(b);
  }
 }else{
  const group=currentGroup();
  menu.append(el('div','club-post-menu-label','POST TYPE'));
  for(const kind of kindGroups[group]){const b=btn('',()=>launchClubPost(group,kind));b.append(el('span','club-post-icon',icons[kind]||'+'),el('span','',kind));menu.append(b);}
 }
 menu.hidden=false;clubPostAnchor.setAttribute('aria-expanded','true');positionPostMenu();
}
document.addEventListener('click',e=>{if(!$('clubPostMenu').hidden&&!$('clubPostMenu').contains(e.target)&&!e.target.closest('#create,[data-tab="create"]'))closePostMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('clubPostMenu').hidden){const a=clubPostAnchor;closePostMenu();a?.focus();}});
window.addEventListener('resize',positionPostMenu);window.addEventListener('scroll',closePostMenu,{passive:true});

document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{if(b.dataset.tab==='space')spaceId=user?.id;if(b.dataset.tab==='create'){if(ready()&&!clubMediaBusy)openPostMenu(b);return;}closePostMenu();switchTab(b.dataset.tab)});document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());$('create').onclick=()=>{if(ready()&&!clubMediaBusy)openPostMenu($('create'));};let clubNotices=[],clubNoticesBusy=false,clubNoticeSig='',clubNoticeRevision=0;
const noticeBox=$('clubNotifications'),noticeBell=$('clubBell'),noticeList=$('clubNotificationList');
function closeNotices(){noticeBox.hidden=true;noticeBell.setAttribute('aria-expanded','false');}
function renderNotices(){clubNotices=clubNotices.filter(n=>!n.read_at);const unread=clubNotices.length;$('clubBellAlert').hidden=!unread;$('clubBellAlert').textContent=unread>99?'99+':String(unread);noticeBell.setAttribute('aria-label','Notifications'+(unread?' · '+unread+' unread':''));const sig=JSON.stringify(clubNotices);if(sig===clubNoticeSig)return;clubNoticeSig=sig;noticeList.replaceChildren();if(!clubNotices.length){noticeList.append(el('p','club-notice-empty',"You’re all caught up!"));return;}for(const n of clubNotices){const p=profiles.get(n.actor_id),name=p?.nickname||friendInbox.get(n.actor_id)?.profile?.nickname||n.actor_name||'Club member',english={like:' liked your post',friend:' added you as a friend',message:' sent you a message',comment:' commented on your post'};const b=btn('',()=>void followNotice(n),'club-notice-row'+(!n.read_at?' is-unread':'')),icon=el('span','club-notice-symbol',({like:'♡',friend:'＋',message:'✉',comment:'◌'})[n.kind]),copy=el('span','club-notice-copy');copy.append(el('strong','',name+english[n.kind]),el('time','',relativeDate(n.created_at)));b.append(avatar(p),copy,icon);if(!n.read_at)b.append(el('span','club-notice-dot'));noticeList.append(b);}}
async function refreshNotices(){if(!user||clubNoticesBusy||document.hidden)return;clubNoticesBusy=true;const uid=user.id,revision=clubNoticeRevision;try{const rows=await checked(db.from('club_notifications').select('id,actor_id,kind,post_id,created_at,read_at').eq('recipient_id',uid).is('read_at',null).order('created_at',{ascending:false}).limit(100));if(user?.id!==uid)return;for(const row of rows){if(!profiles.has(row.actor_id)&&!friendInbox.get(row.actor_id)?.profile){const result=await db.rpc('tyc_member_card',{p_member:row.actor_id});row.actor_name=result.data?.nickname;}}if(user?.id!==uid||revision!==clubNoticeRevision)return;clubNotices=rows;renderNotices();}catch(e){if(!noticeBox.hidden)noticeList.textContent=e.message||'Unable to load notifications';}finally{clubNoticesBusy=false;}}
async function followNotice(n){if(!user)return;try{if(n.kind==='like'||n.kind==='comment'){let post=posts.find(p=>p.id===n.post_id);if(!post){post=await checked(db.from('club_posts').select('*').eq('id',n.post_id).maybeSingle());if(!post)throw Error('This post is no longer available.');posts.push(post); }$('search').value='';switchTab(sectionOf(post));await openPost(post.id);}else if(n.kind==='friend'){spaceId=n.actor_id;$('search').value='';switchTab('space');}else if(n.kind==='message'){await refreshFriends();if(!friendIds.has(n.actor_id))throw Error('This member is no longer in your Friends list.');openFriendChat(n.actor_id);}if(!n.read_at){const at=new Date().toISOString();await checked(db.from('club_notifications').update({read_at:at}).eq('id',n.id).eq('recipient_id',user.id));n.read_at=at;clubNoticeRevision++;clubNotices=clubNotices.filter(row=>row.id!==n.id);}closeNotices();renderNotices();}catch(e){noticeList.prepend(el('p','club-notice-empty',e.message));}}
noticeBell.onclick=()=>{if(!guard())return;if(!noticeBox.hidden){closeNotices();return;}closeClubAccount();noticeBox.hidden=false;noticeBell.setAttribute('aria-expanded','true');renderNotices();void refreshNotices();};
$('clubNotificationsRead').onclick=async()=>{if(!user)return;try{const at=new Date().toISOString();await checked(db.from('club_notifications').update({read_at:at}).eq('recipient_id',user.id).is('read_at',null));clubNoticeRevision++;clubNotices=clubNotices.filter(n=>Date.parse(n.created_at)>Date.parse(at));renderNotices();void refreshNotices();}catch(e){noticeList.prepend(el('p','club-notice-empty',e.message));}};
document.addEventListener('click',e=>{if(!e.target.closest('.club-bell-root'))closeNotices();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeNotices();});setInterval(()=>void refreshNotices(),5000);window.addEventListener('focus',()=>void refreshNotices());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshNotices();});$('search').oninput=render;$('sort').onchange=render;renderCategories();matchMedia('(max-width:640px)').addEventListener('change',()=>{if(currentGroup()==='discussions')renderCategories();});
setInterval(()=>{if(['home','feed'].includes(tab))void refreshFeatured()},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&['home','feed'].includes(tab))void refreshFeatured()});
(async()=>{try{let r=await db.auth.getUser();user=r.data?.user||null;if(user){let ban=await db.rpc('tyc_my_ban_status');if(ban.error)throw ban.error;if(ban.data?.banned){await db.auth.signOut();user=null;status('Account access restricted.');}else{admin=!!(await db.rpc('tyc_has_staff_scope',{p_scope:'community'})).data;const initialized=await db.rpc('tyc_club_ensure_profile');if(initialized.error)status('My Space could not be initialized: '+initialized.error.message);setHeaderAvatar()}}await load();await refreshFriends();await refreshNotices();initClubHistory()}catch(e){status(e.message)}})();
const refreshFeed=()=>{if(!document.hidden&&['home','feed','discussions','challenges'].includes(tab)&&!document.querySelector('dialog[open]'))void load();};setInterval(refreshFeed,15000);window.addEventListener('focus',refreshFeed);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&['home','feed','challenges'].includes(tab)){render();refreshFeed();}else if(document.hidden){clearTimeout(challengeExpiryTimer);challengeExpiryTimer=null;}});
})();