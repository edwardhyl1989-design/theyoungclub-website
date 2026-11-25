/* Per-panel unread data revisions. No update is created by a filter or hover. */
(()=>{'use strict';
const key='tyc-pta-panel-revisions-v1',states=new Map();let records={};
try{records=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{}
const save=()=>{try{localStorage.setItem(key,JSON.stringify(records))}catch{}};
function fingerprint(value){const s=JSON.stringify(value);let a=2166136261,b=5381;for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b,33)^s.charCodeAt(i);}return (a>>>0).toString(36)+'-'+(b>>>0).toString(36)+'-'+s.length;}
function clear(state){if(state.timer)clearTimeout(state.timer);if(state.badge){observer.unobserve(state.badge);state.badge.remove();}state.timer=null;state.badge=null;}
const observer=new IntersectionObserver(entries=>{for(const e of entries){const state=states.get(e.target.dataset.revisionKey);if(!state||state.badge!==e.target)continue;
 if(e.isIntersecting&&e.intersectionRatio>=.6&&!document.hidden){if(!state.seen&&!state.timer)state.timer=setTimeout(()=>{state.timer=null;if(state.badge===e.target&&!document.hidden)state.seen=true;},200);}
 else{if(state.timer){clearTimeout(state.timer);state.timer=null;}if(!e.isIntersecting&&state.seen&&!document.hidden){records[state.key]={revision:state.revision,pending:false};save();clear(state);}}
}},{threshold:[0,.6]});
function publish(id,target,data,initialUpdated=false){
 if(typeof target==='string')target=document.querySelector(target);if(!target)return;
 const revision=fingerprint(data),previous=records[id],old=states.get(id);
 const pending=previous?previous.revision!==revision||!!previous.pending:!!initialUpdated;
 records[id]={revision,pending};save();
 if(old&&old.revision===revision&&old.badge?.isConnected&&old.target===target)return;
 if(old)clear(old);
 const state={key:id,revision,target,seen:old?.revision===revision&&old.seen||false,badge:null,timer:null};states.set(id,state);
 if(!pending)return;
 if(getComputedStyle(target).position==='static')target.classList.add('tyc-panel-positioned');
 const badge=document.createElement('span');badge.className='tyc-panel-updated';badge.dataset.revisionKey=id;badge.textContent='UPDATED';badge.setAttribute('aria-label','Updated content / 업데이트된 내용');target.append(badge);state.badge=badge;observer.observe(badge);
}
function recent(rows){return rows.some(x=>{const t=Date.parse(x.created_at||'');return Number.isFinite(t)&&Date.now()-t>=0&&Date.now()-t<86400000;});}
window.TYC_NewsUpdates={publish,recent};
function captureStatic(){
 const resources=document.getElementById('resources');if(resources)publish('resources',resources,[...resources.querySelectorAll('.insights-resources-grid a')].map(a=>[a.getAttribute('href'),a.textContent.trim()]));
 const zip=document.getElementById('zip-pay-finder');if(zip)publish('zip',zip,['pta-zip-region','pta-zip-hourly','pta-zip-annual','pta-zip-meta'].map(id=>document.getElementById(id)?.textContent));
}
captureStatic();
window.addEventListener('pageshow',()=>{for(const state of states.values()){if(state.badge?.isConnected){observer.unobserve(state.badge);observer.observe(state.badge);}}});
})();