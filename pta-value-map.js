/* THE YOUNG CLUB • cost-of-living-adjusted PTA wage map.
   BLS May 2025 state mean annual wage, adjusted using BEA 2024 all-items state RPP.
   RPP measures relative price levels, NOT taxes or take-home income. */
(()=>{'use strict';
const root=document.getElementById('pta-value-map');if(!root)return;
const $=id=>document.getElementById(id);
const rppRows=`AL 88.823|AK 102.359|AZ 100.677|AR 86.937|CA 110.720|CO 103.052|CT 103.610|DE 99.808|DC 109.901|FL 103.414|GA 96.293|HI 109.951|ID 95.494|IL 99.958|IN 93.329|IA 87.762|KS 90.068|KY 90.159|LA 88.207|ME 97.050|MD 104.959|MA 105.757|MI 96.217|MN 98.621|MS 86.953|MO 90.817|MT 94.645|NE 90.103|NV 99.979|NH 104.165|NJ 108.805|NM 92.212|NY 107.921|NC 94.326|ND 88.959|OH 92.774|OK 87.843|OR 103.361|PA 97.572|RI 102.280|SC 93.749|SD 88.586|TN 91.870|TX 97.057|UT 98.864|VT 97.958|VA 101.104|WA 107.013|WV 89.497|WI 94.095|WY 92.691`;
const wageRows=`AL 63130|AK 77670|AZ 64970|AR 64500|CA 83080|CO 67520|CT 73730|DE 71070|DC 67130|FL 71110|GA 68580|HI 66160|ID 60200|IL 65810|IN 65470|IA 60220|KS 66320|KY 60490|LA 61250|ME 67300|MD 73000|MA 76350|MI 60260|MN 67730|MS 62850|MO 65190|MT 65320|NE 61890|NV 72960|NH 72140|NJ 77020|NM 62000|NY 65660|NC 68790|ND 60490|OH 67260|OK 57990|OR 70490|PA 63820|RI 67980|SC 68260|SD 52170|TN 64060|TX 75060|UT 62470|VT 71320|VA 72710|WA 65090|WV 61560|WI 65480|WY 65820`;
const parse=s=>Object.fromEntries(s.split('|').map(x=>x.trim().split(/\s+/)).map(([k,v])=>[k,+v]));
const prices=parse(rppRows),wages=parse(wageRows),nameByCode={}; 
const picker=$('pta-value-select'),comparison=$('pta-value-compare'),tip=$('pta-value-tip'),panel=$('pta-value-detail'),ranking=$('pta-value-ranking');
const money=n=>'$'+Math.round(n).toLocaleString('en-US'),one=n=>'$'+n.toFixed(2);
const adjusted=code=>wages[code]*100/prices[code];
const states=Object.keys(prices);let selected='CA';
function setup(){
 const source=$('pta-state-select');
 if(!source||source.options.length<50)return false;
 for(const opt of source.options){if(!opt.value)continue;nameByCode[opt.value]=opt.textContent;const a=document.createElement('option');a.value=opt.value;a.textContent=opt.textContent;picker.append(a);const b=a.cloneNode(true);comparison.append(b);}
 picker.value='CA';comparison.value='TX';
 picker.addEventListener('change',()=>select(picker.value));
 comparison.addEventListener('change',updateComparison);
 renderRank();select('CA');return true;
}
function valueColor(code){
 const values=states.map(adjusted),lo=Math.min(...values),hi=Math.max(...values);
 const t=Math.max(0,Math.min(1,(adjusted(code)-lo)/(hi-lo)));
 const a=[231,244,232],b=[12,90,58];return '#'+a.map((n,i)=>Math.round(n+(b[i]-n)*t).toString(16).padStart(2,'0')).join('');
}
function buildClone(){
 const source=$('pta-us-map')?.querySelector('svg');
 if(!source||source.querySelectorAll('path[data-state]').length!==51)return false;
 const svg=source.cloneNode(true);svg.removeAttribute('id');svg.setAttribute('aria-label','PTA purchasing-power-adjusted mean annual wage by U.S. state');
 svg.querySelectorAll('path[data-state]').forEach(path=>{
   const code=path.dataset.state;path.setAttribute('fill',valueColor(code));
   path.setAttribute('aria-label',nameByCode[code]+', purchasing-power adjusted PTA annual mean '+money(adjusted(code)));
   path.addEventListener('mouseenter',e=>{path.setAttribute('fill','#70b985');tooltip(code,e);});
   path.addEventListener('mousemove',e=>tooltip(code,e));
   path.addEventListener('mouseleave',()=>{path.setAttribute('fill',valueColor(code));tip.hidden=true;});
   path.addEventListener('focus',()=>tooltip(code));
   path.addEventListener('blur',()=>tip.hidden=true);
   path.addEventListener('click',()=>select(code));
   path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(code);}});
 });
 root.replaceChildren(svg);refreshSelection();return true;
}
function refreshSelection(){root.querySelectorAll('path[data-state]').forEach(p=>p.classList.toggle('is-selected',p.dataset.state===selected));}
function tooltip(code,event){
 tip.replaceChildren();const h=document.createElement('strong');h.textContent=nameByCode[code];
 const p=document.createElement('span');p.textContent=money(adjusted(code))+' purchasing power / year';
 const s=document.createElement('span');s.textContent='Nominal '+money(wages[code])+' · BEA RPP '+prices[code].toFixed(1);
 tip.append(h,p,s);tip.hidden=false;
 const box=tip.parentElement.getBoundingClientRect();
 tip.style.left=event?Math.max(10,Math.min(box.width-240,event.clientX-box.left+14))+'px':'12px';
 tip.style.top=event?Math.max(8,Math.min(box.height-85,event.clientY-box.top-35))+'px':'60px';
}
function select(code){
 if(!prices[code])return;selected=code;picker.value=code;refreshSelection();
 const rank=states.slice().sort((a,b)=>adjusted(b)-adjusted(a)).indexOf(code)+1;
 panel.innerHTML='<h3></h3><div class="insights-state-number"></div><div class="insights-state-label">2025 PTA MEAN PAY IN NATIONAL-AVERAGE PURCHASING POWER</div><div class="insights-value-details"></div><p class="insights-value-caveat">Purchasing power is a price-level comparison, not post-tax pay, savings, or a personal budget.</p>';
 panel.querySelector('h3').textContent=nameByCode[code];
 panel.querySelector('.insights-state-number').textContent=money(adjusted(code));
 const details=panel.querySelector('.insights-value-details');
 [['Published annual mean',money(wages[code])],['Published hourly equivalent',one(wages[code]/2080)+'/hr'],['2024 BEA price index',prices[code].toFixed(2)+' (US = 100)'],['Adjusted annual equivalent',money(adjusted(code))],['Adjusted hourly equivalent',one(adjusted(code)/2080)+'/hr'],['Purchasing-power rank','#'+rank+' / 51']].forEach(([label,value])=>{const row=document.createElement('div');const left=document.createElement('span');left.textContent=label;const right=document.createElement('strong');right.textContent=value;row.append(left,right);details.append(row);});
 updateComparison();
}
function updateComparison(){
 const code=comparison.value||'TX',n=80000*prices[code]/prices[selected];
 const out=$('pta-value-compare-result');
 out.textContent=money(80000)+' in '+nameByCode[selected]+' ≈ '+money(n)+' in '+nameByCode[code]+' for comparable statewide purchasing power (BEA 2024).';
}
function renderRank(){const ordered=states.slice().sort((a,b)=>adjusted(b)-adjusted(a));ranking.replaceChildren();ordered.slice(0,5).forEach((code,i)=>{const b=document.createElement('button');b.type='button';b.className='insights-state-rank insights-state-rank-button';const label=document.createElement('span');label.textContent=String(i+1).padStart(2,'0')+'  '+nameByCode[code];const val=document.createElement('strong');val.textContent=money(adjusted(code));b.append(label,val);b.addEventListener('click',()=>select(code));ranking.append(b);});}
let attempts=0;function ready(){if(!setup()){if(++attempts<40)setTimeout(ready,200);else root.textContent='State information unavailable.';return;}if(buildClone())return;const watch=new MutationObserver(()=>{if(buildClone())watch.disconnect();});const base=$('pta-us-map');if(base)watch.observe(base,{childList:true});setTimeout(()=>{watch.disconnect();if(root.querySelector('svg'))return;root.replaceChildren();const grid=document.createElement('div');grid.className='insights-map-fallback-grid';states.forEach(c=>{const b=document.createElement('button');b.type='button';b.textContent=c;b.addEventListener('click',()=>select(c));grid.append(b);});root.append(grid);},17000);}
ready();
})();