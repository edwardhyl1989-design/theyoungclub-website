/* THE CLUB — original, locally synthesized holiday jazz. No third-party recordings,
   external streaming, subscriptions or copyrighted song arrangements. */
(()=>{'use strict';
const root=document.getElementById('clubMusic');if(!root)return;
const now=new Date(),month=now.getMonth()+1,day=now.getDate();
if(!((month===11&&day>=25)||month===12||(month===1&&day<=6)))return;
const Audio=window.AudioContext||window.webkitAudioContext;
if(!Audio)return;
const $=id=>document.getElementById(id),toggle=$('clubMusicToggle'),listButton=$('clubMusicListButton'),menu=$('clubMusicMenu'),list=$('clubMusicTracks'),volume=$('clubMusicVolume'),status=$('clubMusicStatus'),level=$('clubMusicLevel');
const get=(key,fallback)=>{try{return localStorage.getItem('tyc-club-jazz-'+key)??fallback}catch{return fallback}},put=(key,val)=>{try{localStorage.setItem('tyc-club-jazz-'+key,String(val))}catch{}};
let enabled=get('enabled','1')!=='0',vol=Math.max(0,Math.min(100,Number(get('volume','12'))||0))/100;
const songs=[
 {title:'Snowfall at the Café',style:'Soft piano trio',bpm:72,chords:[
 [48,64,67,71,74],[45,60,64,67,71],[50,65,69,72,76],[43,65,69,71,76],
 [48,64,67,71,76],[52,67,71,74,78],[45,60,64,67,71],[43,65,69,71,74],
 [41,64,69,72,76],[46,62,65,69,72],[52,67,71,74,76],[45,64,67,71,72],
 [50,65,69,72,76],[43,65,69,71,74],[48,64,67,69,74],[43,65,69,71,74]],
 melody:[[76,74,71],[72,69,67],[69,72,76],[74,71],[76,79,74],[78,76,71],[72,71,69],[67,71,74],[76,72,69],[72,74,77],[76,74,71],[72,69],[77,76,72],[74,71,69],[67,69,72],[71,74]]},
 {title:'December Window',style:'Warm electric piano',bpm:68,chords:[
 [53,65,69,72,76],[50,65,69,72,76],[55,65,70,74,77],[48,64,67,70,74],
 [53,65,69,72,74],[57,64,67,72,76],[46,62,65,69,72],[48,64,67,70,76],
 [45,60,64,67,71],[50,65,69,72,76],[55,65,70,74,76],[48,64,67,70,74],
 [53,65,69,72,76],[50,65,69,72,76],[55,65,70,74,77],[48,64,67,70,74]],
 melody:[[72,76,77],[76,72,69],[74,77,79],[76,74,70],[69,72,74],[76,72,67],[69,72,74],[76,74],[71,72,76],[77,76,72],[74,70,67],[70,74,76],[77,76,72],[69,72,76],[74,77,74],[72,70]]},
 {title:'Quiet Christmas Lights',style:'Mellow jazz ballad',bpm:64,chords:[
 [43,59,62,66,69],[47,62,66,69,74],[52,64,67,71,74],[45,60,64,67,71],
 [50,62,66,69,72],[43,59,62,66,71],[48,64,67,71,74],[50,62,66,69,72],
 [47,62,66,69,74],[52,64,67,71,76],[45,60,64,67,71],[50,62,66,69,72],
 [43,59,62,66,69],[48,64,67,71,74],[45,60,64,67,71],[50,62,66,69,72]],
 melody:[[74,71,69],[74,78,76],[76,74,71],[72,71,67],[69,72,74],[71,69,67],[76,74,71],[69,72],[74,76,78],[76,71,67],[72,71,69],[74,72,69],[71,74,69],[76,74,71],[72,69,67],[66,69,72]]}
];
let index=Math.max(0,Math.min(songs.length-1,parseInt(get('track','0'),10)||0)),ctx=null,master=null,bus=null,noise=null,bar=0,next=0,unlocked=false,blocked=false,active=false,serial=0,raf=0;
const voices=new Set(),playingVideos=new Set();
function currentVideo(v){if(!v.isConnected||v.paused||v.ended||v.closest('[hidden]'))return false;const dialog=v.closest('dialog');return !dialog||dialog.open;}
function videoBusy(){for(const v of playingVideos){if(!currentVideo(v)){if(v.isConnected&&!v.paused&&!v.ended)v.pause();playingVideos.delete(v);}}return playingVideos.size>0;}
function draw(){
 const busy=videoBusy(),state=!enabled?'Music off':busy?'Paused for video':active?'Playing':blocked?'Tap to start':'Ready to play';
 toggle.setAttribute('aria-pressed',String(enabled));toggle.dataset.playing=String(active);toggle.dataset.waiting=String(enabled&&blocked&&!busy);toggle.title=state;toggle.setAttribute('aria-label',enabled?'Music on. '+state+'. Click to turn off.':'Music off. Click to turn on.');
 $('clubMusicToggleText').textContent=enabled?'ON':'OFF';
 status.textContent=state+' · '+songs[index].title;volume.value=Math.round(vol*100);level.textContent=Math.round(vol*100)+'%';
 [...list.children].forEach((b,i)=>{b.setAttribute('aria-checked',String(i===index));b.classList.toggle('active',i===index);});
}
function initialize(){
 if(ctx)return;ctx=new Audio();master=ctx.createGain();master.gain.value=0;bus=ctx.createGain();bus.gain.value=.65;
 const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.ratio.value=3;
 bus.connect(compressor);compressor.connect(master);master.connect(ctx.destination);
 noise=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.24),ctx.sampleRate);const a=noise.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1);
 ctx.addEventListener('statechange',()=>{active=ctx.state==='running'&&enabled&&!videoBusy()&&!document.hidden;draw();});
}
function trackSource(src){voices.add(src);src.onended=()=>voices.delete(src);}
function tone(midi,t,len,amp,kind='piano'){
 const f=440*Math.pow(2,(midi-69)/12),g=ctx.createGain(),a=ctx.createOscillator(),b=ctx.createOscillator(),partial=ctx.createGain();
 a.type='sine';a.frequency.value=f;b.type='sine';b.frequency.value=f*(kind==='bass'?2:2.001);partial.gain.value=kind==='bass'?.15:.23;
 a.connect(g);b.connect(partial);partial.connect(g);g.connect(bus);
 g.gain.setValueAtTime(.00001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0001,amp),t+(kind==='bass'?.025:.012));
 g.gain.exponentialRampToValueAtTime(Math.max(.00002,amp*.22),t+Math.min(len*.38,.20));g.gain.exponentialRampToValueAtTime(.00001,t+len);
 for(const o of [a,b]){trackSource(o);o.start(t);o.stop(t+len+.02);}
}
function brush(t,amp){const n=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();n.buffer=noise;f.type='bandpass';f.frequency.value=3400;f.Q.value=.7;n.connect(f);f.connect(g);g.connect(bus);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(amp,t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+.18);trackSource(n);n.start(t);n.stop(t+.20);}
function scheduleMeasure(t){
 const song=songs[index],beat=60/song.bpm,ch=song.chords[bar%song.chords.length],mel=song.melody[bar%song.melody.length],variation=Math.floor(bar/song.chords.length);
 for(const [beatPos,weight] of [[.04,1],[2.66,.48]])ch.slice(1).forEach((m,j)=>tone(m,t+beat*beatPos+j*.012,beat*(beatPos<1?2.65:1.22),.021*weight,'piano'));
 tone(ch[0]-12,t+.01,beat*1.85,.060,'bass');tone(ch[0]-5,t+2*beat,beat*1.7,.037,'bass');
 const positions=mel.length===2?[.67,2.65]:variation%2?[.33,1.67,3]:[.66,1.66,2.66];
 mel.forEach((m,j)=>tone(m,t+beat*positions[j],beat*(j===mel.length-1?1.20:.92),.048*(j===0?1:.82)));
 brush(t+beat,.009);brush(t+3*beat,.011);
 next=t+4*beat;bar++;
 // Each selection repeats its complete 32-bar arrangement.
 if(bar===song.chords.length*2)bar=0;
}
function reset(){for(const v of voices){try{v.stop()}catch{}}voices.clear();bar=0;next=0;}
function tick(){if(!ctx||ctx.state!=='running'||!enabled||videoBusy()||document.hidden)return;if(!next||next<ctx.currentTime)next=ctx.currentTime+.08;while(next<ctx.currentTime+.22)scheduleMeasure(next);}
function want(){return enabled&&!document.hidden&&!videoBusy();}
function sync(gesture=false){
 const token=++serial;
 if(!want()){
  active=false;if(ctx){master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setValueAtTime(0,ctx.currentTime);if(ctx.state==='running')ctx.suspend().catch(()=>{});}draw();return;
 }
 try{initialize();}catch{blocked=true;draw();return;}
 if(gesture||unlocked||!blocked){
  // Attempt autoplay, then retry during the first real gesture if browser policy blocks it.
  const promise=ctx.resume();
  if(ctx.state==='running'){unlocked=true;blocked=false;active=true;master.gain.setTargetAtTime(vol,ctx.currentTime,.07);tick();draw();}
  else{blocked=!unlocked;active=false;draw();}
  promise.then(()=>{if(token!==serial){if(!want())ctx.suspend().catch(()=>{});return;}if(!want()){sync();return;}unlocked=ctx.state==='running';blocked=!unlocked;active=unlocked;master.gain.setTargetAtTime(vol,ctx.currentTime,.07);tick();draw();}).catch(()=>{if(token===serial){blocked=true;active=false;draw();}});
 }else draw();
}
function choose(i){if(i!==index){index=i;put('track',i);reset();}enabled=true;put('enabled','1');sync(true);}
for(const [i,song] of songs.entries()){const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitemradio');b.setAttribute('aria-checked','false');const title=document.createElement('strong'),sub=document.createElement('small');title.textContent=song.title;sub.textContent=song.style;b.append(title,sub);b.onclick=()=>{choose(i);};list.append(b);}
function openMenu(open){menu.hidden=!open;listButton.setAttribute('aria-expanded',String(open));}
toggle.onclick=()=>{if(enabled&&blocked&&!videoBusy()&&!unlocked){sync(true);return;}enabled=!enabled;put('enabled',enabled?'1':'0');sync(true);};
listButton.onclick=()=>openMenu(menu.hidden);
volume.oninput=()=>{vol=Number(volume.value)/100;put('volume',volume.value);if(ctx&&active)master.gain.setTargetAtTime(vol,ctx.currentTime,.05);draw();};
document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))openMenu(false);if(enabled&&!unlocked&&!e.target.closest('video')&&!root.contains(e.target)&&!e.target.closest('#detail,#discussionDetail'))sync(true);},{passive:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){openMenu(false);listButton.focus();}if(enabled&&!unlocked&&!root.contains(e.target)&&!e.target.closest('video,#detail,#discussionDetail')&&e.key!=='Escape')sync(true);});
function updateVideo(e){const v=e.target;if(!(v instanceof HTMLVideoElement))return;if(e.type==='play'||e.type==='playing')playingVideos.add(v);else playingVideos.delete(v);sync();}
for(const event of ['play','playing','pause','ended','emptied','error'])document.addEventListener(event,updateVideo,true);
for(const v of document.querySelectorAll('video'))if(currentVideo(v))playingVideos.add(v);
function checkSoon(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const before=playingVideos.size;videoBusy();if(before!==playingVideos.size)sync();});}
new MutationObserver(checkSoon).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open']});
document.addEventListener('visibilitychange',()=>sync());window.addEventListener('pagehide',()=>{if(ctx){master.gain.value=0;ctx.suspend().catch(()=>{});}});window.addEventListener('pageshow',()=>sync());
setInterval(tick,80);root.hidden=false;document.body.classList.add('club-music-season');draw();if(enabled)sync();
})();
