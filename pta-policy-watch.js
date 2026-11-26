/* Real policy headlines only: existing free RSS data; never invent legal updates. */
(()=>{'use strict';
 const root=document.getElementById('pta-policy-feed');
 if(!root)return;
 const create=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
 function show(items,failed=false){
  root.replaceChildren(create('span','insights-policy-kicker','LATEST PTA POLICY HEADLINES'));
  if(!items.length){
   root.append(create('p','insights-policy-none',failed?'Unable to load policy headlines right now. Refresh to try again, or check the official sources below.':'No new PTA-specific policy or licensing headline is currently available in the RSS feed. Check the official boards below for current rules.'));
   return;
  }
  for(const x of items){
   const row=create('div','insights-policy-item'),link=create('a','',x.title_en||'Policy update');
   try{const u=new URL(x.source_url);if(u.protocol!=='https:')throw Error('invalid');link.href=u.href;link.target='_blank';link.rel='noopener noreferrer nofollow'}catch{continue}
   const d=create('small','',String(x.article_published_at||'')+' · '+String(x.source_name||'Source'));
   row.append(link,d);root.append(row);
  }
 }
 async function init(){
  if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY){show([],true);return}
  const db=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
  const {data,error}=await db.from('pta_daily_news')
    .select('id,title_en,article_published_at,source_name,source_url,created_at')
    .eq('status','published').in('category',['LICENSE','POLICY','ADVOCACY','PAYMENT'])
    .order('article_published_at',{ascending:false}).limit(3);
  if(error)throw error;const rows=data||[];show(rows);window.TYC_NewsUpdates?.publish('policy',root.closest('.insights-watch'),rows.map(x=>[x.id,x.title_en,x.source_url,x.article_published_at]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),window.TYC_NewsUpdates?.recent(rows));
 }
 init().catch(error=>{console.warn('PTA policy headlines unavailable:',error);show([],true);});
})();