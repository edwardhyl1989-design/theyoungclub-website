/* THE YOUNG CLUB: ZIP-informed regional PTA pay finder.
 * ZIP lookup: Zippopotam.us. For LA/Orange Counties only: Census coordinate->county
 * -> verified 2025 BLS LA-Long Beach-Anaheim OEWS metro figure.
 * Else: published statewide BLS May 2025 mean (not ZIP-specific).
 */
(()=>{'use strict';
const form=document.getElementById('pta-zip-form');if(!form)return;
const input=document.getElementById('pta-zip-input'),button=document.getElementById('pta-zip-submit');
const title=document.getElementById('pta-zip-region'),hourly=document.getElementById('pta-zip-hourly'),annual=document.getElementById('pta-zip-annual'),info=document.getElementById('pta-zip-meta'),message=document.getElementById('pta-zip-message'),source=document.getElementById('pta-zip-source'),kicker=document.getElementById('pta-zip-scope');
const money=n=>'$'+Math.round(n).toLocaleString('en-US');
const stateWages=()=>window.TYC_PTA_STATE_WAGES_2025||{};
const linkState='https://www.bls.gov/oes/2025/may/oessrcst.htm';
const linkLA='https://www.bls.gov/regions/west/news-release/2026/occupationalemploymentandwages_losangeles_20260709.htm';
let token=0;
function render(area,year,hour,count,label,sourceUrl,note){
 title.textContent=area;hourly.textContent='$'+hour.toFixed(2);annual.textContent=money(year);
 kicker.textContent=label;info.textContent='May 2025 · '+(count?count.toLocaleString('en-US')+' estimated PTA jobs · ':'')+'BLS OEWS mean wage';
 source.href=sourceUrl;source.textContent=label==='METROPOLITAN AREA DATA'?'VIEW BLS METRO REPORT ↗':'VIEW BLS STATE WAGES ↗';
 message.textContent=note;message.classList.remove('is-error');
}
async function getJSON(url){
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8500);
 try{const res=await fetch(url,{signal:controller.signal,mode:'cors',cache:'no-store'});
 if(!res.ok)throw Error('Lookup failed ('+res.status+')');return await res.json();}
 finally{clearTimeout(timeout);}
}
async function resolveCounty(lon,lat){
 const url='https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x='+encodeURIComponent(lon)+'&y='+encodeURIComponent(lat)+'&benchmark=Public_AR_Current&vintage=Current_Current&format=json';
 const obj=await getJSON(url);
 const counties=obj?.result?.geographies?.Counties||[];
 const county=counties[0];return county?{state:String(county.STATE||''),county:String(county.COUNTY||'')}:null;
}
async function lookup(zip){
 const id=++token;button.disabled=true;button.textContent='LOOKING UP…';message.classList.remove('is-error');message.textContent='Finding the ZIP location and available BLS reporting area…';
 try{
  const data=await getJSON('https://api.zippopotam.us/us/'+encodeURIComponent(zip));
  if(id!==token)return;
  const p=data.places?.[0];const abbr=p?.['state abbreviation'];const annualState=stateWages()[abbr];
  if(!p||!Number.isFinite(annualState))throw Error('No verified state PTA wage data found for this ZIP.');
  const locality=p['place name']+', '+abbr,lat=Number(p.latitude),lon=Number(p.longitude);
  let isLAMetro=false;
  if(abbr==='CA'&&Number.isFinite(lat)&&Number.isFinite(lon)){
   try{
    const county=await resolveCounty(lon,lat);
    isLAMetro=county?.state==='06'&&(county.county==='037'||county.county==='059');
   }catch(e){console.warn('County lookup unavailable; using statewide BLS data',e);}
  }
  if(id!==token)return;
  if(isLAMetro){
   render('Los Angeles · Long Beach · Anaheim',81680,39.27,3730,'METROPOLITAN AREA DATA',linkLA,
    'ZIP '+zip+' · '+locality+' · Los Angeles/Orange County (based on ZIP coordinate). This is the metro-area average, not an individual ZIP-code wage.');
  }else{
   render(p.state+' · statewide',annualState,annualState/2080,null,'STATEWIDE DATA',linkState,
    'ZIP '+zip+' · '+locality+' · BLS metro-level pay for this ZIP has not been verified here, so the '+p.state+' statewide mean is shown. This is not a ZIP-specific estimate.');
  }
 }catch(e){if(id!==token)return;message.classList.add('is-error');message.textContent='Could not verify that ZIP right now. Please check the five digits and try again. '+(e.message||'');}
 finally{if(id===token){button.disabled=false;button.textContent='LOOK UP PAY →';}}
}
form.addEventListener('submit',e=>{e.preventDefault();const zip=input.value.trim();if(!/^\d{5}$/.test(zip)){message.classList.add('is-error');message.textContent='Enter a valid 5-digit US ZIP Code.';input.focus();return;}lookup(zip);});
})();
