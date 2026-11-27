/* Per-panel update badges remain visible for the entire PTA News visit. */
(()=>{'use strict';
const key='tyc-pta-panel-revisions-v1',states=new Map();let records={};
function readRecords(){try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{return records}}
records=readRecords();
const save=()=>{try{localStorage.setItem(key,JSON.stringify(records))}catch{}};
function fingerprint(value){const s=JSON.stringify(value);let a=2166136261,b=5381;for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b,33)^s.charCodeAt(i);}return (a>>>0).toString(36)+'-'+(b>>>0).toString(36)+'-'+s.length;}
function clear(state){if(state.badge)state.badge.remove();state.badge=null;}
function publish(id,target,data,initialUpdated=false){
 if(typeof target==='string')target=document.querySelector(target);if(!target)return;
 if(target.tagName==='DETAILS')target=target.querySelector('summary')||target;
 const revision=fingerprint(data),old=states.get(id);
 records=readRecords();const previous=records[id];
 // Keep a displayed update through scrolling, collapse and panel re-render.
 const pending=!!(old?.revision===revision&&old.pending)||(previous?previous.revision!==revision||!!previous.pending:!!initialUpdated);
 records[id]={revision,pending};save();
 if(old&&old.revision===revision&&old.badge?.isConnected&&old.target===target)return;
 if(old)clear(old);
 const state={key:id,revision,target,pending,badge:null};states.set(id,state);
 if(!pending)return;
 if(getComputedStyle(target).position==='static')target.classList.add('tyc-panel-positioned');target.classList.add('tyc-panel-revision-host');
 const badge=document.createElement('span');badge.className='tyc-panel-updated';badge.dataset.revisionKey=id;badge.textContent='UPDATED';badge.setAttribute('aria-label',document.documentElement.hasAttribute('data-english-only')?'Updated content':'Updated content / 업데이트된 내용');target.append(badge);state.badge=badge;
}
function recent(rows){return rows.some(x=>{const t=Date.parse(x.created_at||'');return Number.isFinite(t)&&Date.now()-t>=0&&Date.now()-t<86400000;});}
window.TYC_NewsUpdates={publish,recent};
function captureStatic(){
 const resources=document.getElementById('resources');if(resources)publish('resources',resources,[...resources.querySelectorAll('.insights-resources-grid a')].map(a=>[a.getAttribute('href'),a.textContent.trim()]));
 const zip=document.getElementById('zip-pay-finder');if(zip)publish('zip',zip,['pta-zip-region','pta-zip-hourly','pta-zip-annual','pta-zip-meta'].map(id=>document.getElementById(id)?.textContent));
}
captureStatic();
// Only acknowledge updates on departure, not on scrolling, tab switching or visibility changes.
// Do not acknowledge a newer revision saved by another tab.
window.addEventListener('pagehide',()=>{
 records=readRecords();
 for(const state of states.values()){
  if(state.pending&&records[state.key]?.revision===state.revision)records[state.key]={revision:state.revision,pending:false};
  state.pending=false;clear(state);
 }
 save();
});
})();