/* THE CLUB — published Christmas piano and jazzy holiday recordings, with track-specific source and license links. */
(()=>{'use strict';
const root=document.getElementById('clubMusic');if(!root)return;
const now=new Date(),month=now.getMonth()+1,day=now.getDate();
if(!((month===11&&day>=25)||month===12||(month===1&&day<=6)))return;
const $=id=>document.getElementById(id),toggle=$('clubMusicToggle'),listButton=$('clubMusicListButton'),menu=$('clubMusicMenu'),list=$('clubMusicTracks'),volume=$('clubMusicVolume'),status=$('clubMusicStatus'),level=$('clubMusicLevel');
const get=(key,fallback)=>{try{return localStorage.getItem('tyc-club-jazz-'+key)??fallback}catch{return fallback}},put=(key,val)=>{try{localStorage.setItem('tyc-club-jazz-'+key,String(val))}catch{}};
const songs=[
 {
  "title": "Silent Night",
  "artist": "Kevin MacLeod · Gentle Christmas piano · 72 BPM",
  "file": "https://upload.wikimedia.org/wikipedia/commons/0/0f/Silent_Night_%28ISRC_USUAN1100075%29.mp3",
  "fallback": "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Silent%20Night.mp3",
  "source": "https://commons.wikimedia.org/wiki/File:Silent_Night_(ISRC_USUAN1100075).mp3",
  "license": "CC BY 3.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/3.0/"
 },
 {
  "title": "Oh Tannenbaum",
  "artist": "John Bartmann · Jazzy lo-fi Christmas",
  "file": "https://files.freemusicarchive.org/storage-freemusicarchive-org/tracks/wbc9cX3LhlOMrCk0Jb7bv3o0h7G2jbg49V1KIgkT.mp3",
  "fallback": "https://upload.wikimedia.org/wikipedia/commons/d/d3/John_Bartmann_-_Oh_Tannenbaum.ogg",
  "source": "https://commons.wikimedia.org/wiki/File:John_Bartmann_-_Oh_Tannenbaum.ogg",
  "license": "CC BY 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/4.0/"
 },
 {
  "title": "What Child Is This",
  "artist": "Kevin MacLeod · Relaxed Christmas piano · 86 BPM",
  "file": "https://incompetech.com/music/royalty-free/mp3-royaltyfree/What%20Child%20is%20This.mp3",
  "source": "https://commons.wikimedia.org/wiki/File:What_Child_is_This_(Kevin_MacLeod)_(ISRC_USUAN1100012).oga",
  "license": "CC BY 3.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/3.0/"
 },
 {
  "title": "O Christmas Tree — Solo Piano",
  "artist": "Alexander Blu · Slow holiday piano",
  "file": "https://orangefreesounds.com/wp-content/uploads/2025/12/Free-o-christmas-tree-relaxing-solo-piano.mp3",
  "source": "https://orangefreesounds.com/free-o-christmas-tree-relaxing-solo-piano/",
  "license": "CC BY 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/4.0/"
 }
];
let enabled=get('enabled','1')!=='0',vol=Math.max(0,Math.min(100,Number(get('christmas-lounge-volume','5'))||0))/100;
let index=Math.max(0,Math.min(songs.length-1,parseInt(get('christmas-lounge-track-2026','0'),10)||0)),blocked=false,unlocked=false,failed=false,alternate=false,serial=0,raf=0,failures=0;
const audio=new Audio();audio.preload='none';audio.volume=vol;audio.loop=false;
const playingVideos=new Set();
function currentVideo(v){if(!v.isConnected||v.paused||v.ended||v.closest('[hidden]'))return false;const dialog=v.closest('dialog');return !dialog||dialog.open;}
function videoBusy(){for(const v of playingVideos){if(!currentVideo(v)){playingVideos.delete(v);if(v.isConnected&&!v.paused&&!v.ended)v.pause();}}return playingVideos.size>0;}
function want(){return enabled&&!document.hidden&&!videoBusy();}
function draw(){
 const busy=videoBusy(),active=enabled&&!audio.paused&&!audio.ended&&!busy&&!document.hidden;
 const state=!enabled?'Music off':busy?'Paused for video':failed?'Track unavailable · choose another':active?'Playing':blocked?'Tap to start':document.hidden?'Paused':'Ready to play';
 toggle.setAttribute('aria-pressed',String(enabled));toggle.dataset.playing=String(active);toggle.dataset.waiting=String(enabled&&(blocked||failed)&&!busy);toggle.title=state;toggle.setAttribute('aria-label',enabled?'Music on. '+state+'. Click to turn off.':'Music off. Click to turn on.');
 $('clubMusicToggleText').textContent=enabled?'ON':'OFF';
 status.textContent=state+' · '+songs[index].title;volume.value=Math.round(vol*100);level.textContent=Math.round(vol*100)+'%';
 [...list.children].forEach((b,i)=>{b.setAttribute('aria-checked',String(i===index));b.classList.toggle('active',i===index);});
}
function selectSource(){audio.src=alternate&&songs[index].fallback?songs[index].fallback:songs[index].file;audio.volume=vol;}
function sync(gesture=false){
 const token=++serial;
 if(!want()){audio.pause();draw();return;}
 if(failed){if(!gesture){draw();return;}failed=false;alternate=false;failures=0;selectSource();}
 if(blocked&&!gesture){draw();return;}
 if(!audio.getAttribute('src'))selectSource();
 audio.volume=vol;
 audio.play().then(()=>{if(token!==serial){if(!want())audio.pause();return;}if(!want()){audio.pause();draw();return;}blocked=false;unlocked=true;draw();}).catch(err=>{if(token!==serial)return;if(err?.name==='NotAllowedError'){blocked=true;draw();}else if(err?.name!=='AbortError'&&!audio.error){failed=true;draw();}});
}
function choose(i,gesture=true){serial++;audio.pause();index=i;put('christmas-lounge-track-2026',i);alternate=false;failed=false;blocked=false;if(gesture)failures=0;selectSource();enabled=true;put('enabled','1');sync(gesture);}
audio.addEventListener('playing',()=>{unlocked=true;blocked=false;failed=false;failures=0;if(!want())audio.pause();draw();});
audio.addEventListener('pause',draw);
audio.addEventListener('ended',()=>{if(want())choose((index+1)%songs.length,false);else draw();});
audio.addEventListener('error',()=>{if(!enabled||!audio.error)return;
 if(!alternate&&songs[index].fallback){alternate=true;selectSource();sync();return;}
 if(++failures<songs.length&&want()){choose((index+1)%songs.length,false);return;}
 failed=true;draw();
});
for(const [i,song] of songs.entries()){const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitemradio');b.setAttribute('aria-checked','false');const title=document.createElement('strong'),sub=document.createElement('small');title.textContent=song.title;sub.textContent=song.artist;b.append(title,sub);b.onclick=()=>choose(i);list.append(b);}
const credits=document.createElement('details');credits.className='club-music-credits';
const summary=document.createElement('summary');summary.textContent='Music credits & licenses';credits.append(summary);
for(const song of songs){const p=document.createElement('p'),a=document.createElement('a'),l=document.createElement('a');a.href=song.source;a.target='_blank';a.rel='noopener noreferrer';a.textContent=song.title+' — '+song.artist;l.href=song.licenseUrl;l.target='_blank';l.rel='noopener noreferrer';l.textContent=song.license;p.append(a,document.createTextNode(' · '),l);credits.append(p);}
menu.append(credits);
function openMenu(open){menu.hidden=!open;listButton.setAttribute('aria-expanded',String(open));}
toggle.onclick=()=>{if(enabled&&(blocked||failed)&&!videoBusy()){sync(true);return;}enabled=!enabled;put('enabled',enabled?'1':'0');sync(true);};
listButton.onclick=()=>openMenu(menu.hidden);
volume.oninput=()=>{vol=Number(volume.value)/100;put('christmas-lounge-volume',volume.value);audio.volume=vol;draw();};
function unlockGesture(e){if(enabled&&!unlocked&&!failed&&!root.contains(e.target)&&!e.target.closest?.('video,#detail,#discussionDetail'))sync(true);}
document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))openMenu(false);if(e.pointerType==='mouse')unlockGesture(e);},{passive:true});
document.addEventListener('click',unlockGesture,true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){openMenu(false);listButton.focus();}if(e.key!=='Escape')unlockGesture(e);});
function updateVideo(e){const v=e.target;if(!(v instanceof HTMLVideoElement))return;if(e.type==='play'||e.type==='playing')playingVideos.add(v);else playingVideos.delete(v);sync();}
for(const event of ['play','playing','pause','ended','emptied','error'])document.addEventListener(event,updateVideo,true);
for(const v of document.querySelectorAll('video'))if(currentVideo(v))playingVideos.add(v);
function checkSoon(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const before=playingVideos.size;videoBusy();if(before!==playingVideos.size)sync();});}
new MutationObserver(checkSoon).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open']});
document.addEventListener('visibilitychange',()=>sync());window.addEventListener('pagehide',()=>{serial++;audio.pause();});window.addEventListener('pageshow',()=>sync());
root.hidden=false;document.body.classList.add('club-music-season');draw();if(enabled)sync();
})();