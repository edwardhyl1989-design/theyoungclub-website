import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.57.0";
const names={"Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA","Colorado":"CO","Connecticut":"CT","Delaware":"DE","District of Columbia":"DC","Florida":"FL","Georgia":"GA","Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA","Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD","Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO","Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT","Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
Deno.serve(async req=>{
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 const token=req.headers.get("x-pta-news-cron")||"";
 const auth=await db.rpc("pta_news_verify_scheduler",{p_token:token});
 if(!token||auth.error||auth.data!==true)return reply({error:"Unauthorized"},401);
 try{
  const u="https://wagedex.com/data/wagedex-state-wages.csv";
  const response=await fetch(u,{signal:AbortSignal.timeout(25000),headers:{"Accept":"text/csv"}});
  if(!response.ok)throw Error("Source HTTP "+response.status);
  const content=await response.text();
  const rows=content.split(/\r?\n/).filter(x=>x.startsWith("31-2021,"));
  const recorded=new Map<string,any>();
  const number=(v:string)=>{if(v.trim()===""||v.trim()==="*"||v.trim()==="#")return null;const n=Number(v);return Number.isFinite(n)&&n>=0?Math.round(n):null;};
  for(const line of rows){
   const fields=line.split(",");
   if(fields.length!==10||fields[0]!=="31-2021"||fields[1]!=="Physical Therapist Assistants")continue;
   const [soc,title,state,total,mean,median,p10,p25,p75,p90]=fields;
   const abbr=names[state];
   if(!abbr)continue;
   if(recorded.has(abbr))throw Error("Duplicate state: "+abbr);
   const wages=[mean,median,p25,p75,p90].map(number);
   if(wages.some(v=>v===null))throw Error("Suppressed wage percentile for "+abbr);
   if(!(wages[2]<=wages[1]&&wages[1]<=wages[3]&&wages[3]<=wages[4]))throw Error("Out-of-order percentiles for "+abbr);
   recorded.set(abbr,{state_abbr:abbr,state_name:state,survey_year:2025,employment_estimate:number(total),mean_annual:wages[0],median_annual:wages[1],p25_annual:wages[2],p75_annual:wages[3],p90_annual:wages[4],source_url:u,retrieved_at:new Date().toISOString()});
  }
  if(recorded.size!==51)throw Error("Expected all 51 states/DC, received "+recorded.size);
  const data=[...recorded.values()];
  const result=await db.from("pta_state_wages").upsert(data,{onConflict:"state_abbr"});
  if(result.error)throw Error("Storage failed: "+result.error.message);
  return reply({status:"imported",source:u,records:data.length,california:data.find(x=>x.state_abbr==="CA"),florida:data.find(x=>x.state_abbr==="FL")});
 }catch(error){return reply({error:String(error)},502);}
});