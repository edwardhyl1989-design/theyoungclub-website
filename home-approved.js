(()=>{'use strict';
const $=id=>document.getElementById(id),E=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const fallback='media/what-is-a-physical-therapy-assistant-do.webp';
const S=(v,f='')=>typeof v==='string'&&v.trim()?v:f;
const fmt=x=>{if(!x)return '';const d=new Date(x);return Number.isNaN(+d)?'':d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Los_Angeles'})};
const arrow=()=>{const a=E('span','p-arrow','›');a.setAttribute('aria-hidden','true');return a};
const glyphs={chat:'<path d="M20 10c0 5-4 8-9 8l-6 3 1-5C3 14 2 12 2 10c0-4 4-7 9-7s9 3 9 7Z"/>',news:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h4v5H7zM14 8h4M14 11h4M7 16h11"/>',work:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/>'};
function mark(k){const s=E('span','p-row-icon');s.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+glyphs[k]+'</svg>';return s}
function line(k,t,sub,href,opt={}){const a=E('a','p-row');a.href=href;if(opt.thumb){const im=E('img','p-row-thumb');im.src=opt.thumb;im.alt='';im.loading='lazy';im.onerror=()=>{im.onerror=null;im.src=fallback};a.append(im)}else a.append(mark(k));const tx=E('span','p-row-text');tx.append(E('strong','',t),E('small','',sub));a.append(tx);if(opt.type)a.append(E('span','p-job-type',opt.type));else a.append(arrow());return a}
function cover(raw){try{if(!raw)return fallback;const u=new URL(raw,location.href);return u.origin===location.origin||u.protocol==='https:'?u.href:fallback}catch{return fallback}}
function note(id,s){$(id)?.append(E('p','p-status',s))}
const valid=window.supabase?.createClient&&/^https:\/\/[\w-]+\.supabase\.co\/?$/.test(window.TYC_SUPABASE_URL||'')&&window.TYC_SUPABASE_PUBLISHABLE_KEY;
if(valid){
 const db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const loadBlog=async()=>{
  const {data,error}=await db.from('tyc_blog_posts').select('id,title,summary,category,cover,is_featured,published_order').eq('published',true).order('is_featured',{ascending:false}).order('published_order',{ascending:false,nullsFirst:false}).limit(3);
  if(error)throw error;if(!data?.length){note('p-blog-items','No published posts yet.');return}
  const rows=data.map(p=>{
   const a=E('a','p-feature');a.href='post.html?id='+encodeURIComponent(p.id);
   const frame=E('div','p-feature-image'),im=E('img');im.src=cover(p.cover);im.alt='';im.loading='lazy';im.onerror=()=>{im.onerror=null;im.src=fallback};frame.append(im);
   if(p.is_featured)frame.append(E('span','p-feature-tag','★ Featured'));
   a.append(frame,E('strong','',S(p.title,'PTA Blog')),E('small','',[S(p.category,'Korean editorial'),S(p.summary)].filter(Boolean).join(' · ').slice(0,150)));return a
  });
  $('p-blog-items').replaceChildren(...rows)
 };
 const loadCommunity=async()=>{
  await Promise.all(['en','ko'].map(async lang=>{
   const target=$('p-community-'+lang+'-items');if(!target)return;
   const english=lang==='en';
   try{
    const {data,error}=await db.from('pta_topic_public_previews').select('topic_id,title,category,community_language,published_at').in('community_language',[lang,'both']).order('published_at',{ascending:false}).order('topic_id',{ascending:true}).limit(2);
    if(error)throw error;
    const rows=(data||[]).map(p=>line('chat',S(p.title).replace(/\*\*/g,'').trim(),[S(p.category),fmt(p.published_at)].filter(Boolean).join(' · '),(english?'community-en.html':'community-ko.html')+'?topic='+encodeURIComponent(p.topic_id)));
    target.replaceChildren(...(rows.length?rows:[E('p','p-community-empty',english?'No public posts yet.':'아직 공개된 게시글이 없습니다.')]));
   }catch{target.replaceChildren(E('p','p-community-empty',english?'Unable to load public posts.':'게시글을 불러오지 못했습니다.'));}
  }));
 };
 const loadNews=async()=>{const {data,error}=await db.from('pta_daily_news').select('id,title_en,category,article_published_at,source_name').eq('status','published').order('article_published_at',{ascending:false,nullsFirst:false}).limit(2);if(error)throw error;const rows=(data||[]).map(p=>line('news',S(p.title_en,'PTA News'),[S(p.source_name),fmt(p.article_published_at)].filter(Boolean).join(' · '),'pta-news.html#daily-briefing'));$('p-news-items').replaceChildren(...rows)};
 const loadJobs=async()=>{
  const target=$('p-jobs-items');if(!target)return;
  try{
   const today=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Los_Angeles'}).format(new Date());
   const {data,error}=await db.from('job_postings').select('id,title,company,location,employment_type').eq('status','approved').or('expires_at.is.null,expires_at.gte.'+today).order('published_at',{ascending:false,nullsFirst:false}).order('id',{ascending:true}).limit(3);
   if(error)throw error;
   const rows=(data||[]).map(p=>line('work',S(p.title,'Job opening'),[S(p.company),S(p.location),S(p.employment_type)].filter(Boolean).join(' · '),'jobs.html#publicJobs'));
   target.replaceChildren(...(rows.length?rows:[E('p','p-status','No approved openings right now.')]));
  }catch{target.replaceChildren(E('p','p-status','Live openings unavailable. View JOBS.'))}
 };
 const refreshStats=async()=>{try{const {data,error}=await db.rpc('tyc_home_activity_counts');if(error||!data)return;for(const [id,key] of [['p-verified','verified_members'],['p-new-posts','new_posts'],['p-active-jobs','active_jobs']]){const n=Number(data[key]);if(Number.isSafeInteger(n)&&n>=0)$(id).textContent=n.toLocaleString('en-US')}}catch{}};
 const launch=$('p-shop-items').firstElementChild.cloneNode(true);
 let shopVersion=0;
 async function loadShop(){const ver=++shopVersion;$('p-shop-items').replaceChildren(launch.cloneNode(true));$('p-shop-admin').hidden=true;try{const {data:{session}}=await db.auth.getSession();if(!session?.user||ver!==shopVersion)return;const staff=await db.rpc('tyc_has_staff_scope',{p_scope:'shop'});if(staff.error||staff.data!==true||ver!==shopVersion)return;$('p-shop-admin').hidden=false;const {data,error}=await db.from('tyc_apparel_products').select('id,title,category,image_paths').eq('is_published',true).order('created_at',{ascending:false}).limit(4);if(error||ver!==shopVersion||!data?.length)return;const items=[];for(const p of data){const path=(p.image_paths||[]).find(s=>typeof s==='string'&&/^products\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp|avif)$/i.test(s));if(!path)continue;const a=E('a','p-shop-product');a.href='shop.html';const im=E('img');im.src=db.storage.from('tyc-apparel').getPublicUrl(path).data.publicUrl;im.alt='';im.loading='lazy';a.append(im,E('strong','',S(p.title,'TYC Apparel')),E('small','','Preview · Coming 2028'));items.push(a)}if(items.length)$('p-shop-items').replaceChildren(...items)}catch{}}
 const clubBucket=db.storage.from('tyc-club-media');
 const clubMediaPath=/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp|avif|gif|mp4|webm)$/i;
 const clubImagePath=/\.(jpg|jpeg|png|webp|avif|gif)$/i;
 const clubDiscussionCategories=['Ask a PTA','Opinions','Work','Learning','Tips','Career & Education','Useful Resources'];
 const clubIsDiscussion=p=>['Discussion','Poll'].includes(p.kind)||(!['Challenge','Workout'].includes(p.kind)&&clubDiscussionCategories.includes(p.category));
 const clubIsFeed=p=>!['Challenge','Workout'].includes(p.kind)&&!clubIsDiscussion(p);
 const clubTopic=p=>({'Career & Education':'Work','Useful Resources':'Tips','Life in USA':'General'})[p.category]||p.category;
 const clubMediaURL=path=>clubBucket.getPublicUrl(path).data.publicUrl;
 const clubPresetKeys=['workout','walking','running','stretching','hydration','sleep','healthy-eating','meditation'];
 const clubStockCovers={'workout':8401194,'running':5037392,'marathon':33995260,'strength-training':13088864,'walking':9986766,'cycling':5644629,'swimming':2062708,'hiking':27776930,'stretching':4854279,'pilates':8769176,'healthy-eating':38706556,'meal-prep':30635720,'nutrition':4220141,'hydration':3124674,'sleep':7505065,'meditation':5201527,'stress-relief':2908175,'journaling':9032498,'mindfulness':32097003,'self-care':32628968};
 function clubChallengeCover(p){const key=p.challenge_cover||p.challenge_activity||'';if(clubPresetKeys.some(k=>'preset-'+k===key))return 'challenge-covers/'+key+'.webp';if(key==='workout')return 'challenge-workout.webp?v=2';const n=clubStockCovers[key];return n?'https://images.pexels.com/photos/'+n+'/pexels-photo-'+n+'.jpeg?auto=compress&cs=tinysrgb&w=400':''}
 function clubTextPreview(thumb,p){thumb.replaceChildren(E('span','p-club-preview-text',S(p.body,S(p.title,'Club post')).slice(0,120)))}
 function clubCard(p,type,count){
  const a=E('a','p-club-preview-card');a.href='the-club.html#'+(type==='challenges'?'challenges':'feed')+'/post/'+encodeURIComponent(p.id);
  const thumb=E('div','p-club-preview-thumb'),paths=Array.isArray(p.media)?p.media.filter(x=>typeof x==='string'&&clubMediaPath.test(x)):[];
  const path=type==='challenges'?paths.find(x=>clubImagePath.test(x)):paths[0];
  const src=path?clubMediaURL(path):type==='challenges'?clubChallengeCover(p):'';
  if(src){const video=path&&/\.(mp4|webm)$/i.test(path),m=E(video?'video':'img');m.src=src;if(video){m.muted=true;m.playsInline=true;m.preload='metadata';m.setAttribute('aria-hidden','true')}else{m.alt='';m.loading='lazy';const f=path&&p.media_framing?.[path];if(f&&typeof f==='object'){m.style.objectFit=f.mode==='fit'?'contain':'cover';if(f.mode!=='fit'&&Number.isFinite(f.x)&&Number.isFinite(f.y)){m.style.objectPosition=(Math.max(0,Math.min(1,f.x))*100)+'% '+(Math.max(0,Math.min(1,f.y))*100)+'%'}}}m.onerror=()=>{if(type==='challenges'&&path&&clubChallengeCover(p)&&m.getAttribute('src')!==clubChallengeCover(p)){m.src=clubChallengeCover(p)}else clubTextPreview(thumb,p)};thumb.append(m);if(video)thumb.append(E('span','p-club-preview-badge','▶ Video'))}else clubTextPreview(thumb,p);
  if(type==='challenges'&&p.is_official_challenge)thumb.append(E('span','p-club-preview-badge','★ Official'));
  const copy=E('div','p-club-preview-copy');copy.append(E('strong','',S(p.title,'Club post')));
  const meta=E('div','p-club-preview-meta');meta.append(E('span','',type==='challenges'?(Number(p.challenge_days)||30)+' days':S(clubTopic(p),'Feed')));if(Number.isFinite(count))meta.append(E('span','p-club-preview-likes','♡ '+count));copy.append(meta);a.append(thumb,copy);return a
 }
 function enableClubRailDrag(track){
  let press=null,suppress=false,timer=0;
  const overflow=()=>track.scrollWidth>track.clientWidth+2;
  const updateCursor=()=>track.classList.toggle('can-drag',overflow());
  track.addEventListener('pointerdown',e=>{
   if(e.pointerType!=='mouse'||e.button!==0||!overflow())return;
   clearTimeout(timer);suppress=false;press={id:e.pointerId,x:e.clientX,y:e.clientY,left:track.scrollLeft,drag:false};
  });
  window.addEventListener('pointermove',e=>{
   if(!press||e.pointerId!==press.id)return;
   if(!(e.buttons&1)){finish(e);return}
   const dx=e.clientX-press.x,dy=e.clientY-press.y;
   if(!press.drag){if(Math.abs(dx)<6||Math.abs(dx)<Math.abs(dy))return;press.drag=true;track.classList.add('is-grabbing');try{track.setPointerCapture(e.pointerId)}catch{}}
   e.preventDefault();track.scrollLeft=press.left-dx;
  },{passive:false});
  function finish(e){
   if(!press||(e.pointerId!=null&&e.pointerId!==press.id))return;
   const p=press;press=null;
   if(p.drag){suppress=true;clearTimeout(timer);timer=setTimeout(()=>{suppress=false},350)}
   track.classList.remove('is-grabbing');
   if(track.hasPointerCapture(p.id))track.releasePointerCapture(p.id);
  }
  window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);window.addEventListener('blur',finish);track.addEventListener('lostpointercapture',finish);
  track.addEventListener('dragstart',e=>e.preventDefault());
  track.addEventListener('click',e=>{if(suppress&&e.detail!==0){e.preventDefault();e.stopImmediatePropagation();suppress=false}},true);
  track.addEventListener('keydown',e=>{if(e.target!==track||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const card=track.querySelector('.p-club-preview-card');track.scrollBy({left:(e.key==='ArrowLeft'?-1:1)*(card?card.getBoundingClientRect().width+8:track.clientWidth),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})});
  return updateCursor;
 }
 function clubRailControls(id){const track=$('p-club-'+id+'-track');if(!track)return;const updateCursor=enableClubRailDrag(track);const buttons=[...document.querySelectorAll('[data-home-rail="'+id+'"]')];const update=()=>{updateCursor();for(const b of buttons)b.disabled=Number(b.dataset.dir)<0?track.scrollLeft<=2:track.scrollLeft>=track.scrollWidth-track.clientWidth-2};for(const b of buttons)b.onclick=()=>{const card=track.querySelector('.p-club-preview-card');const step=card?card.getBoundingClientRect().width+8:track.clientWidth;track.scrollBy({left:Number(b.dataset.dir)*step,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})};track.addEventListener('scroll',update,{passive:true});if(window.ResizeObserver)new ResizeObserver(update).observe(track);else window.addEventListener('resize',update);return update}
 const clubRailUpdates={featured:clubRailControls('featured'),challenges:clubRailControls('challenges')};
 function clubRail(id,rows,empty){const track=$('p-club-'+id+'-track');track.replaceChildren(...(rows.length?rows:[E('p','p-status',empty)]));requestAnimationFrame(()=>clubRailUpdates[id]?.())}
 async function loadClubFeatured(){
  const rows=[],seen=new Set();let failed=false;
  try{const {data,error}=await db.rpc('club_daily_featured');if(error)throw error;for(const r of data||[]){if(!r.post?.id||!clubIsFeed(r.post)||seen.has(r.post.id))continue;seen.add(r.post.id);rows.push({post:r.post,count:Number(r.daily_likes)||0});if(rows.length===4)break}}catch{failed=true}
  if(rows.length<4){try{
   const {data,error}=await db.from('club_posts').select('id,title,body,kind,category,media,media_framing,created_at').in('kind',['Photo','Video','Journal']).not('category','in','("Ask a PTA","Opinions","Work","Learning","Tips","Career & Education","Useful Resources")').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(8);
   if(error)throw error;
   for(const p of data||[]){if(!clubIsFeed(p)||seen.has(p.id))continue;seen.add(p.id);rows.push({post:p,count:NaN});if(rows.length===4)break}
   failed=false;
  }catch{failed=true}}
  clubRail('featured',rows.map(r=>clubCard(r.post,'featured',r.count)),failed?'Featured posts are temporarily unavailable.':'No Feed posts yet.');
 }
 async function loadClubChallenges(){try{
  const now=Date.now(),cutoff=new Date(now-365*86400000).toISOString(),posts=[];
  for(let offset=0;;offset+=500){const {data,error}=await db.from('club_posts').select('id,title,body,kind,category,media,media_framing,challenge_days,challenge_activity,challenge_cover,created_at,is_official_challenge').eq('kind','Challenge').gte('created_at',cutoff).order('created_at',{ascending:false}).order('id',{ascending:true}).range(offset,offset+499);if(error)throw error;posts.push(...(data||[]));if(!data||data.length<500)break}
  const active=posts.filter(p=>Date.parse(p.created_at)+(Number(p.challenge_days)||30)*86400000>now),counts=new Map();let ranked=true;
  for(let i=0;i<active.length&&ranked;i+=50){const ids=active.slice(i,i+50).map(p=>p.id);for(let offset=0;;offset+=500){const {data,error}=await db.from('club_likes').select('post_id').in('post_id',ids).order('post_id',{ascending:true}).order('user_id',{ascending:true}).range(offset,offset+499);if(error){ranked=false;break}for(const row of data||[])counts.set(row.post_id,(counts.get(row.post_id)||0)+1);if(!data||data.length<500)break}}
  active.sort((a,b)=>(ranked?(counts.get(b.id)||0)-(counts.get(a.id)||0):0)||Date.parse(b.created_at)-Date.parse(a.created_at)||String(b.id).localeCompare(String(a.id)));
  clubRail('challenges',active.slice(0,4).map(p=>clubCard(p,'challenges',ranked?counts.get(p.id)||0:NaN)),'No active challenges yet.');
 }catch{clubRail('challenges',[],'Challenges are temporarily unavailable.')}}
 async function loadClubDiscussions(){const target=$('p-club-discussions-list');try{const {data,error}=await db.from('club_posts').select('id,title,category,kind,created_at').or('kind.in.(Discussion,Poll),and(kind.not.in.(Challenge,Workout),category.in.("Ask a PTA","Opinions","Work","Learning","Tips","Career & Education","Useful Resources"))').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(4);if(error)throw error;const rows=(data||[]).filter(clubIsDiscussion).map(p=>line('chat',S(p.title,'Discussion'),[S(clubTopic(p)),fmt(p.created_at)].filter(Boolean).join(' · '),'the-club.html#discussions/'+encodeURIComponent(p.id)));target.replaceChildren(...(rows.length?rows:[E('p','p-status','No discussions yet.')]))}catch{target.replaceChildren(E('p','p-status','Discussions are temporarily unavailable.'))}}
 async function loadClubPreviews(){await Promise.allSettled([loadClubFeatured(),loadClubChallenges(),loadClubDiscussions()])}
 let memberVersion=0;
 function setMember(label,description,action,href){$('p-member-label').textContent=label;$('p-member-note').textContent=description;const a=$('p-member-action');a.href=href;a.replaceChildren(document.createTextNode(action+' '),arrow())}
 async function membership(){
  const v=++memberVersion,box=document.querySelector('.p-community .p-membership');
  setMember('VERIFIED MEMBERS','Full discussions and resources for approved PTA and SPTA members.','Explore membership','community.html');
  try{
   const {data:{session},error}=await db.auth.getSession();
   if(v!==memberVersion)return;
   if(error||!session?.user){if(box)box.hidden=false;return}
   const uid=session.user.id;
   const [m,staff]=await Promise.all([db.from('pta_members').select('membership_status,member_type').eq('user_id',uid).maybeSingle(),db.rpc('tyc_has_staff_scope',{p_scope:'community'})]);
   if(v!==memberVersion)return;
   if(!staff.error&&staff.data===true){if(box)box.hidden=true;return}
   if(box)box.hidden=false;
   if(m.error)return;
   const member=m.data;
   if(member?.membership_status==='approved'){setMember('VERIFIED '+(member.member_type==='SPTA'?'SPTA':'PTA'),'Your membership is active in both communities.','My membership','profile.html')}
   else if(member?.membership_status==='pending'){setMember('VERIFICATION PENDING','Your application is awaiting administrator review.','Check status','profile.html')}
   else{setMember('BECOME A VERIFIED MEMBER','Apply as a licensed PTA or PTA student. One membership, two communities.','Get verified','community-en.html#verifyArea')}
  }catch{if(v===memberVersion&&box)box.hidden=false}
 }
 Promise.allSettled([loadBlog().catch(()=>note('p-blog-items','Live posts unavailable. View the blog.')),loadCommunity().catch(()=>note('p-community-items','Live previews unavailable. Open the community.')),loadNews().catch(()=>{}),refreshStats(),loadJobs(),loadShop(),loadClubPreviews(),membership()]);db.auth.onAuthStateChange(()=>setTimeout(()=>{void membership();void loadShop();void loadClubPreviews()},0));setInterval(()=>{if(!document.hidden)void refreshStats()},60000);
}else{for(const id of ['featured-track','challenges-track','discussions-list'])$('p-club-'+id)?.replaceChildren(E('p','p-status','Live content unavailable. Open THE CLUB.'));note('p-blog-items','Live content is unavailable. Open the blog to explore.');$('p-jobs-items')?.replaceChildren(E('p','p-status','Live openings unavailable. View JOBS.'));}
 // Give the header sprout the same live dialogue without recording another visit.
 // The visitor constellation is now in the HOME header.
 const brand=document.querySelector('.p-brand'),header=document.querySelector('.p-header-inner');
 if(brand&&header){const bubble=E('div','tyc-sprout-dialogue');bubble.setAttribute('aria-hidden','true');const star=E('span','tyc-sprout-dialogue-star','✦'),line=E('span','tyc-sprout-dialogue-line');bubble.append(star,line);header.append(bubble);let hover=false,focus=false,active=false,version=0;const sleep=ms=>new Promise(r=>setTimeout(r,ms));const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const current=v=>active&&version===v;async function write(s,v){if(!current(v))return;line.textContent='';if(reduced){line.textContent=s;return}for(const c of Array.from(s)){if(!current(v))return;line.textContent+=c;await sleep(c===' '?40:63)}}async function talk(v){await write('별이… 몇 개나 떠 있나……',v);await sleep(1100);let host=document.querySelector('.p-header .tyc-visitor-constellation[data-star-count]');for(let i=0;!host&&i<15&&current(v);i++){await sleep(250);host=document.querySelector('.p-header .tyc-visitor-constellation[data-star-count]')}const raw=host?.getAttribute('data-star-count'),n=raw==null?null:Number(raw),valid=Number.isSafeInteger(n)&&n>=0;await write(valid?n.toLocaleString('ko-KR')+'개나 떠 있잖아?':'아직 별을 세는 중이네…',v);await sleep(1300);await write('I wonder how many stars are out there…',v);await sleep(1100);await write(valid?'There are '+n.toLocaleString('en-US')+' stars!':'Still counting the stars…',v)}function sync(){const next=hover||focus;if(next===active)return;active=next;version++;bubble.classList.toggle('is-visible',next);if(next)void talk(version);else line.textContent=''}brand.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hover=true;sync()}});brand.addEventListener('pointerleave',()=>{hover=false;sync()});brand.addEventListener('focus',()=>{focus=true;sync()});brand.addEventListener('blur',()=>{focus=false;sync()});window.addEventListener('pagehide',()=>{hover=focus=false;sync()})}
})();