/* One anonymous browser ID per install; count each content view at most once per 24h. */
(()=>{'use strict';
let client=null;
function getClient(){
 if(client)return client;
 if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY)return null;
 client=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 return client;
}
function visitor(){
 const key='tyc-view-visitor-v1';
 try{
   let id=localStorage.getItem(key);
   if(id && /^[a-f0-9-]{36}$/.test(id))return id;
   id=crypto.randomUUID();
   localStorage.setItem(key,id);return id;
 }catch{return crypto.randomUUID?.()||null}
}
const countsCache=new Map();
function label(n){return '👁 '+Number(n||0).toLocaleString('en-US')+' views';}
async function record(kind,id){
 const db=getClient();if(!db||!id)return null;
 try{const {data,error}=await db.rpc('tyc_view_count',{p_type:kind,p_id:String(id),p_visitor:visitor()});if(error)return null;
 const value=Number(data||0);countsCache.set(kind+':'+id,value);return value;}catch{return null;}
}
async function counts(kind,ids){
 const db=getClient(),output=new Map();if(!db||!ids?.length)return output;
 for(let i=0;i<ids.length;i+=100){
  try{
   const {data,error}=await db.rpc('tyc_view_counts',{p_type:kind,p_ids:ids.slice(i,i+100).map(String)});
   if(!error)for(const r of data||[]){const v=Number(r.views||0);output.set(String(r.content_id),v);countsCache.set(kind+':'+r.content_id,v);}
  }catch{}
 }
 return output;
}
window.TYC_Views={record,counts,label,cache:countsCache};
})();