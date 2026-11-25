/* CEU carousel: pointer-drag, touch native swipe, button and keyboard controls. */
(()=>{'use strict';const track=document.getElementById('ceu-carousel');if(!track)return;

const section=track.closest('.insights-ceu-section');
const entries=[
['Rehab Education','Shoulder Dysfunction: A Practical Approach to Examination and Treatment','Orthopedics','Per course','In-person / Online','','https://rehabed.com/events/shoulder-dysfunction-a-practical-approach-to-examination-and-treatment/','See scheduled format, tuition and PTA credit'],
['Rehab Education','Treating Tendonitis in the Upper Extremity','Orthopedics','Per course','In-person / Online','','https://rehabed.com/events/treating-tendonitis-in-the-upper-extremity/','See scheduled format, tuition and PTA credit'],
['APTA','Introduction to Continuing Competence','Professional practice','Free to members','Online','1','https://learningcenter.apta.org/products/apta-introduction-to-continuing-competence-for-physical-therapists?in_package=214171','Check eligibility and price on provider'],
['APTA','Essential Skills for Tomorrow’s Professionals','Professional practice','Bundle','Online','12','https://learningcenter.apta.org/products/essential-skills-for-tomorrows-professionals','See member/nonmember pricing'],
['APTA','COVID-19 Bundle: In Hospital Management','Acute care','Bundle','Online','','https://learningcenter.apta.org/products/covid19-bundle-in-hospital-management','See provider pricing'],
['Healthclick','Stroke in the Home-Bound Patient','Neurology / Home health','Membership','Online','','https://www.healthclick.com/courses/stroke-in-the-home-bound-patient.php','$189/year subscription available'],
['Healthclick','Acute Care Rehab','Acute care','Membership','Online','','https://www.healthclick.com/courses/acute-care-rehab.php','$189/year subscription available'],
['Healthclick','Treating Balance Dysfunction','Balance / Vestibular','Membership','Online','','https://www.healthclick.com/courses/treating-balance-dysfunction.php','$189/year subscription available'],
['Healthclick','Elbow, Wrist and Hand Injury','Orthopedics','Membership','Online','','https://www.healthclick.com/courses/elbow-wrist-and-hand-injury-and-orthotic-fabrication.php','$189/year subscription available'],
['Healthclick','Restoring Functional Gait','Mobility','Membership','Online','','https://www.healthclick.com/courses/restoring-functional-gait.php','$189/year subscription available'],
['Healthclick','PNF to Enhance Gait','Neurology / Mobility','Membership','Online','','https://www.healthclick.com/courses/pnf-to-enhance-gait.php','$189/year subscription available'],
['Healthclick','Fundamentals of Lymphedema Treatment','Lymphedema','Membership','Online','','https://www.healthclick.com/courses/the-fundamentals-of-lymphedema-treatment.php','$189/year subscription available'],
['Healthclick','Advanced Functional Mobility with PNF','Mobility','Membership','Online','','https://www.healthclick.com/courses/achieving-advanced-levels-of-functional-mobility-with-pnf.php','$189/year subscription available'],
['Healthclick','Balance and Falls in the Elderly Population','Geriatrics','Membership','Online','','https://www.healthclick.com/courses/balance-and-falls-in-the-elderly-population.php','$189/year subscription available']
];
const catalogs=[
['Innovative Educational Services','Individual CE courses','Per course','Online / Live','https://www.cheapceus.com/online_courses/aTo3Ow%3D%3D','Individual prices listed; live webinars $39.95 for 3 hours'],
['ICE Physio','Clinical courses and workshops','Per course','Online / In-person','https://ptonice.com/our-courses/','Confirm PTA participation and credit'],
['Rehab Education','Course registration catalog','Per course','Online / In-person / Live','https://courses.rehabed.com/cart/Default.aspx','See course-specific tuition and eligibility'],
['PhysicalTherapy.com','Free course selection','Free','Online','https://www.physicaltherapy.com/free-course','Free course offer; terms apply'],
['PhysicalTherapy.com','Full course library','Membership','Online','https://www.physicaltherapy.com/pt-ceus/all/','$129/year; 500+ courses'],
['APTA','Full course catalog','Per course / Bundle','Online / Live','https://learningcenter.apta.org/catalog','Member and nonmember pricing'],
['APTA','Free to members','Free to members','Online','https://learningcenter.apta.org/free','Membership may be required'],
['APTA','Courses and events','Per course','Online / In-person / Live','https://www.apta.org/your-career/courses-and-events','See event pricing'],
['PESI','PT and PTA education','Per course / Free','Online / Live','https://www.pesi.com/professions/pt/','See individual offers and credit'],
['Summit Professional Education','Course catalog','Membership / Per course','Online / In-person / Live','https://summit-education.com/','See catalog and pricing'],
['Medbridge','Continuing education library','Membership','Online','https://www.medbridge.com/educate/continuing-education','See subscription options'],
['Healthclick','PT and OT course library','Membership','Online','https://www.healthclick.com/physical-therapy-online-continuing-education.php','$189/year subscription available']
];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,label)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' <span class="tyc-diagonal-icon" aria-hidden="true"></span></a>';
const existing=[...track.querySelectorAll('.insights-ceu-card')].map(c=>{const d=[...c.querySelectorAll('dd')];return ['PhysicalTherapy.com',c.querySelector('h3').textContent,c.querySelector('span').textContent,'Membership','Online',c.querySelector('.insights-ceu-credit strong').textContent,c.querySelector('a').href,d[2].textContent]});
const all=existing.concat(entries);
window.TYC_NewsUpdates?.publish('ceu-courses',section,[all,catalogs]);
const box=document.createElement('div');box.className='tyc-ceu-finder';box.id='ceu-finder';
box.innerHTML='<div class="ceu-finder-lead"><span>02 / COURSE DISCOVERY</span><h3>Find the right course<span>.</span></h3><p>Search individual courses by specialty, provider, payment and contact hours — or open a complete course catalog. Browsing this directory does not require a THE YOUNG CLUB membership.</p></div><div class="tyc-ceu-filters"><label>Search<input type="search" data-f="q" placeholder="Gait, ethics, stroke…"></label><label>Payment<select data-f="pay"><option value="">All payment types</option><option>Free</option><option>Free to members</option><option>Membership</option><option>Per course</option><option>Bundle</option></select></label><label>Provider<select data-f="provider"><option value="">All providers</option>'+[...new Set(catalogs.map(x=>x[0]))].sort().map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></label><label>Format<select data-f="format"><option value="">All formats</option><option>Online</option><option>In-person</option><option>Live</option></select></label><label>Specialty<select data-f="topic"><option value="">All specialties</option>'+[...new Set(all.map(x=>x[2]))].sort().map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></label><label>Minimum contact hours<select data-f="hours"><option value="0">Any / not listed</option><option>1</option><option>2</option><option>3</option><option>6</option><option>12</option></select></label><button type="button" data-reset>Clear filters ↺</button></div><p>State approval varies. '+link('https://www.fsbpt.org/Free-Resources/Licensing-Authorities','Find your state board')+' · '+link('https://www.medbridge.com/educate/ceu-requirements/california-pt','California CE guide')+'</p><div class="ceu-results-title"><h4>Individual courses</h4><span>DIRECT COURSE LINKS</span></div><p data-count aria-live="polite"></p><div class="tyc-ceu-results"></div><button type="button" data-more>Load more courses</button><div class="ceu-results-title"><h4>Provider catalogs</h4><span>12 COURSE LIBRARIES</span></div><p>Browse provider libraries to explore more classes and confirm current prices and PTA credit directly.</p><details class="ceu-catalogs-disclosure"><summary>Browse all 12 provider libraries</summary><div class="tyc-ceu-catalogs"></div></details><p class="insights-map-note">Prices and credits may change. Unlisted hours are not assumed. Confirm PTA eligibility and state-specific credit before enrollment. Directory reviewed November 2026; not a live feed.</p>';
section.querySelector('.insights-ceu-instructions').after(box);
let limit=6;
const field=k=>box.querySelector('[data-f="'+k+'"]').value;
const match=(provider,title,topic,pay,format)=>[provider,title,topic].join(' ').toLowerCase().includes(field('q').trim().toLowerCase())&&(!field('provider')||provider===field('provider'))&&(!field('pay')||(field('pay')==='Free'?pay.split(' / ').includes('Free'):pay.includes(field('pay'))))&&(!field('format')||format.includes(field('format')));
function updateFinder(){const found=all.filter(x=>(!field('topic')||x[2]===field('topic'))&&match(...x.slice(0,5))&&(!Number(field('hours'))||Number(x[5])>=Number(field('hours'))));box.querySelector('[data-count]').textContent=found.length+' matching individual courses';box.querySelector('.tyc-ceu-results').innerHTML=found.slice(0,limit).map(x=>'<article class="tyc-ceu-result"><small>'+esc(x[0]+' · '+x[2])+'</small><h4>'+esc(x[1])+'</h4><p>'+esc(x[5]?x[5]+' contact hours (verify state credit)':'Contact hours: see provider')+'</p><p>'+esc(x[3]+' · '+x[4])+'</p><p>'+esc(x[7])+'</p>'+link(x[6],'View course & state credit')+'</article>').join('')||'<p>No matching individual courses. Try clearing filters or explore provider catalogs.</p>';box.querySelector('[data-more]').hidden=found.length<=limit;box.querySelector('.tyc-ceu-catalogs').innerHTML=catalogs.filter(x=>match(x[0],x[1],'',x[2],x[3])).map(x=>'<article class="tyc-ceu-result"><small>'+esc(x[2]+' · '+x[3])+'</small><h4>'+esc(x[0])+'</h4><p>'+esc(x[1])+'</p><p>'+esc(x[5])+'</p>'+link(x[4],'Browse catalog')+'</article>').join('')||'<p>No matching catalogs. Clear filters to browse all providers.</p>';}
box.querySelectorAll('input,select').forEach(e=>e.addEventListener('input',()=>{limit=6;updateFinder()}));box.querySelector('[data-more]').addEventListener('click',()=>{limit+=6;updateFinder()});
box.querySelector('[data-reset]').addEventListener('click',()=>{
 box.querySelectorAll('[data-f]').forEach(el=>{el.value=el.tagName==='SELECT'?el.options[0].value:'';});
 limit=6;updateFinder();box.querySelector('[data-f="q"]').focus();
});
updateFinder();

const cards=[...track.querySelectorAll('.insights-ceu-card')],prev=document.getElementById('ceu-prev'),next=document.getElementById('ceu-next'),label=document.getElementById('ceu-position');
let dragging=false,startX=0,startScroll=0,travel=0,suppressClick=false,pointerId=null;
const index=()=>{const x=track.scrollLeft;let best=0,min=Infinity;cards.forEach((card,i)=>{const d=Math.abs(card.offsetLeft-cards[0].offsetLeft-x);if(d<min){min=d;best=i;}});return best;};
function render(){const i=index();label.textContent=String(i+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0');prev.disabled=i===0;next.disabled=i===cards.length-1;}
function go(dir){let i=index()+dir;i=Math.max(0,Math.min(cards.length-1,i));track.scrollTo({left:cards[i].offsetLeft-cards[0].offsetLeft,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
prev.addEventListener('click',()=>go(-1));next.addEventListener('click',()=>go(1));
track.addEventListener('keydown',e=>{if(e.target.closest('a,button,input,select'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go(e.key==='ArrowRight'?1:-1);}});
track.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.button!==0||e.target.closest('a,button'))return;dragging=true;pointerId=e.pointerId;startX=e.clientX;startScroll=track.scrollLeft;travel=0;suppressClick=false;track.classList.add('is-dragging');track.setPointerCapture(e.pointerId);});
track.addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==pointerId)return;travel=Math.abs(e.clientX-startX);track.scrollLeft=startScroll-(e.clientX-startX);if(travel>6)suppressClick=true;});
function finish(){if(!dragging)return;dragging=false;pointerId=null;track.classList.remove('is-dragging');render();}
track.addEventListener('pointerup',finish);track.addEventListener('pointercancel',finish);track.addEventListener('lostpointercapture',finish);
track.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopPropagation();suppressClick=false;}},true);
track.addEventListener('scroll',()=>requestAnimationFrame(render),{passive:true});window.addEventListener('resize',render);render();
})();