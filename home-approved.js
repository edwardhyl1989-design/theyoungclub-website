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
 const refreshStats=async()=>{try{const {data,error}=await db.rpc('tyc_home_activity_counts');if(error||!data)return;for(const [id,key] of [['p-verified','verified_members'],['p-new-posts','new_posts'],['p-active-jobs','active_jobs']]){const n=Number(data[key]);if(Number.isSafeInteger(n)&&n>=0)$(id).textContent=n.toLocaleString('en-US')}}catch{}};
 const launch=$('p-shop-items').firstElementChild.cloneNode(true);
 let shopVersion=0;
 async function loadShop(){const ver=++shopVersion;$('p-shop-items').replaceChildren(launch.cloneNode(true));$('p-shop-admin').hidden=true;try{const {data:{session}}=await db.auth.getSession();if(!session?.user||ver!==shopVersion)return;const staff=await db.rpc('tyc_has_staff_scope',{p_scope:'shop'});if(staff.error||staff.data!==true||ver!==shopVersion)return;$('p-shop-admin').hidden=false;const {data,error}=await db.from('tyc_apparel_products').select('id,title,category,image_paths').eq('is_published',true).order('created_at',{ascending:false}).limit(4);if(error||ver!==shopVersion||!data?.length)return;const items=[];for(const p of data){const path=(p.image_paths||[]).find(s=>typeof s==='string'&&/^products\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp|avif)$/i.test(s));if(!path)continue;const a=E('a','p-shop-product');a.href='shop.html';const im=E('img');im.src=db.storage.from('tyc-apparel').getPublicUrl(path).data.publicUrl;im.alt='';im.loading='lazy';a.append(im,E('strong','',S(p.title,'TYC Apparel')),E('small','','Preview · Coming 2028'));items.push(a)}if(items.length)$('p-shop-items').replaceChildren(...items)}catch{}}
 const slides=[{title:'Fitness & Lifestyle',desc:'Share your workouts, recovery and everyday life.',image:'challenge-covers/preset-workout.webp',href:'the-club.html#feed',tag:'THE CLUB'},{title:'Community Challenges',desc:'Join a challenge and stay motivated together.',image:'challenge-covers/preset-walking.webp',href:'the-club.html#challenges',tag:'CHALLENGES'}];
 let active=0;
 function paintSlide(i){active=(i+slides.length)%slides.length;const s=slides[active];$('p-club-feature-link').href=s.href;$('p-club-photo').src=s.image;$('p-club-title').textContent=s.title;$('p-club-desc').textContent=s.desc;$('p-club-tag').textContent=s.tag;const dots=slides.map((_,idx)=>{const b=E('button');b.type='button';b.setAttribute('aria-label','Featured item '+(idx+1));b.setAttribute('aria-current',String(idx===active));b.onclick=()=>paintSlide(idx);return b});$('p-club-dots').replaceChildren(...dots)}
 $('p-club-next').onclick=()=>paintSlide(active+1);paintSlide(0);
 async function loadChallenges(){try{const {data,error}=await db.from('club_posts').select('id,title,body,kind,challenge_days,challenge_activity,challenge_cover,created_at,is_official_challenge').eq('kind','Challenge').order('is_official_challenge',{ascending:false}).order('created_at',{ascending:false}).limit(20);if(error)return;const presets=['preset-healthy-eating','preset-hydration','preset-meditation','preset-running','preset-sleep','preset-stretching','preset-walking','preset-workout'];const rows=(data||[]).filter(p=>Date.parse(p.created_at)+Number(p.challenge_days||30)*86400000>Date.now()).slice(0,3).map(p=>({title:S(p.title,'Active challenge'),desc:S(p.body,'Join the community challenge.').replace(/<[^>]*>/g,'').slice(0,160),image:presets.includes(p.challenge_cover)?'challenge-covers/'+p.challenge_cover+'.webp':/walk/i.test(p.challenge_activity||'')?'challenge-covers/preset-walking.webp':'challenge-covers/preset-workout.webp',href:'the-club.html#challenges/post/'+encodeURIComponent(p.id),tag:p.is_official_challenge?'★ Official Challenge':'Featured Challenge'}));if(rows.length){slides.unshift(...rows);paintSlide(0)}}catch{}}
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
 Promise.allSettled([loadBlog().catch(()=>note('p-blog-items','Live posts unavailable. View the blog.')),loadCommunity().catch(()=>note('p-community-items','Live previews unavailable. Open the community.')),loadNews().catch(()=>{}),refreshStats(),loadShop(),loadChallenges(),membership()]);db.auth.onAuthStateChange(()=>setTimeout(()=>{void membership();void loadShop()},0));setInterval(()=>{if(!document.hidden)void refreshStats()},60000);
}else{note('p-blog-items','Live content is unavailable. Open the blog to explore.');}
 // Give the header sprout the same live dialogue without recording another visit.
 // The visitor constellation is now in the HOME header.
 const brand=document.querySelector('.p-brand'),header=document.querySelector('.p-header-inner');
 if(brand&&header){const bubble=E('div','tyc-sprout-dialogue');bubble.setAttribute('aria-hidden','true');const star=E('span','tyc-sprout-dialogue-star','✦'),line=E('span','tyc-sprout-dialogue-line');bubble.append(star,line);header.append(bubble);let hover=false,focus=false,active=false,version=0;const sleep=ms=>new Promise(r=>setTimeout(r,ms));const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const current=v=>active&&version===v;async function write(s,v){if(!current(v))return;line.textContent='';if(reduced){line.textContent=s;return}for(const c of Array.from(s)){if(!current(v))return;line.textContent+=c;await sleep(c===' '?40:63)}}async function talk(v){await write('별이… 몇 개나 떠 있나……',v);await sleep(1100);let host=document.querySelector('.p-header .tyc-visitor-constellation[data-star-count]');for(let i=0;!host&&i<15&&current(v);i++){await sleep(250);host=document.querySelector('.p-header .tyc-visitor-constellation[data-star-count]')}const raw=host?.getAttribute('data-star-count'),n=raw==null?null:Number(raw),valid=Number.isSafeInteger(n)&&n>=0;await write(valid?n.toLocaleString('ko-KR')+'개나 떠 있잖아?':'아직 별을 세는 중이네…',v);await sleep(1300);await write('I wonder how many stars are out there…',v);await sleep(1100);await write(valid?'There are '+n.toLocaleString('en-US')+' stars!':'Still counting the stars…',v)}function sync(){const next=hover||focus;if(next===active)return;active=next;version++;bubble.classList.toggle('is-visible',next);if(next)void talk(version);else line.textContent=''}brand.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hover=true;sync()}});brand.addEventListener('pointerleave',()=>{hover=false;sync()});brand.addEventListener('focus',()=>{focus=true;sync()});brand.addEventListener('blur',()=>{focus=false;sync()});window.addEventListener('pagehide',()=>{hover=focus=false;sync()})}
})();