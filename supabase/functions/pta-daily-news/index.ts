import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const hosts=["apta.org","fsbpt.org","ptbc.ca.gov","bls.gov","cms.gov","capteonline.org","aptaeducation.org","federalregister.gov","hhs.gov"];
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Los_Angeles",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
function sourceURL(s:unknown):URL|null{try{if(typeof s!=="string")return null;const u=new URL(s);if(u.protocol!=="https:"||u.username||u.password||!hosts.some(h=>u.hostname===h||u.hostname.endsWith("."+h)))return null;u.hash="";return u;}catch{return null;}}
const date=(s:unknown)=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):null;
const respond=(x:unknown,n=200)=>new Response(JSON.stringify(x),{status:n,headers:{"content-type":"application/json"}});
async function verifyPage(u:URL,published:string){
 try{const r=await fetch(u,{signal:AbortSignal.timeout(8500),redirect:"follow"});if(!r.ok||!sourceURL(r.url)||(r.headers.get("content-type")||"").indexOf("text/html")<0)return false;
 const html=(await r.text()).slice(0,240000);
 const patterns=[/<meta[^>]+(?:property|name)=["'](?:article:published_time|datePublished|pubdate|citation_publication_date)["'][^>]+content=["']([^"']+)/i,/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:article:published_time|datePublished|pubdate|citation_publication_date)["']/i,/"datePublished"\s*:\s*"([^"]+)"/i,/<time[^>]+datetime=["']([^"']+)/i];
 return patterns.some(rx=>date(rx.exec(html)?.[1])===published);
 }catch{return false;}
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return respond({error:"Method not allowed"},405);
 const base=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!base||!service)return respond({error:"Service credentials missing"},503);
 const db=createClient(base,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const token=req.headers.get("x-pta-news-cron");
 if(!token)return respond({error:"Unauthorized"},401);
 const validated=await db.rpc("pta_news_verify_scheduler",{p_token:token});
 if(validated.error||validated.data!==true)return respond({error:"Unauthorized"},401);
 const day=today(),start=new Date(day+"T12:00:00Z");start.setUTCDate(start.getUTCDate()-14);const earliest=start.toISOString().slice(0,10);
 const prior=await db.from("pta_news_runs").select("status").eq("day",day).maybeSingle();
 if(prior.error)return respond({error:"Cannot query run status"},500);
 if(prior.data&&["complete","empty"].includes(prior.data.status))return respond({status:"already_processed",day});
 const started=await db.from("pta_news_runs").upsert({day,status:"running",articles_added:0,started_at:new Date().toISOString(),completed_at:null,error_message:null},{onConflict:"day"});
 if(started.error)return respond({error:"Cannot start run"},500);
 const finish=async(status:string,n:number,message:string|null=null)=>db.from("pta_news_runs").update({status,articles_added:n,error_message:message?.slice(0,600)||null,completed_at:new Date().toISOString()}).eq("day",day);
 try{
  const openai=Deno.env.get("OPENAI_API_KEY");
  if(!openai){await finish("error",0,"OPENAI_API_KEY is not configured");return respond({error:"Missing OPENAI_API_KEY"},503);}
  const prompt="Today in California: "+day+". Use live web search to find 0-5 significant real news articles on Physical Therapist Assistants (PTAs) in the United States published between "+earliest+" and "+day+". Prioritize FSBPT, APTA, PTBC, CAPTE, CMS, BLS and authoritative government sources. No evergreen posts, duplicates, invented events, guesses or unsupported publication dates. Return strictly JSON, object with key articles, each item keys source_url, source_name, article_published_at (YYYY-MM-DD), category, title_en, title_ko, summary_en, summary_ko. Summaries one or two factually grounded sentences each. If none, articles must be empty.";
  const result=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"authorization":"Bearer "+openai,"content-type":"application/json"},body:JSON.stringify({model:Deno.env.get("OPENAI_NEWS_MODEL")||"gpt-5.4",tools:[{type:"web_search",filters:{allowed_domains:hosts}}],tool_choice:"required",include:["web_search_call.action.sources"],input:prompt,max_output_tokens:2500}),signal:AbortSignal.timeout(95000)});
  if(!result.ok)throw Error("OpenAI HTTP "+result.status);
  const answer=await result.json();
  const text=(answer.output||[]).filter((o:any)=>o.type==="message").flatMap((o:any)=>o.content||[]).filter((o:any)=>o.type==="output_text").map((o:any)=>o.text).join("\n").trim();
  let parsed:any;try{parsed=JSON.parse(text);}catch{throw Error("Invalid AI news JSON");}
  if(!Array.isArray(parsed.articles))throw Error("Missing articles array");
  const sources=new Set<string>();
  for(const o of answer.output||[]){
    if(o.type==="web_search_call")for(const v of o.action?.sources||[])if(v.url)sources.add(v.url);
    if(o.type==="message")for(const part of o.content||[])for(const a of part.annotations||[])if(a.type==="url_citation"&&a.url)sources.add(a.url);
  }
  const citedHosts=new Set([...sources].map(v=>sourceURL(v)?.hostname).filter(Boolean));
  let count=0;const seen=new Set<string>();
  for(const a of parsed.articles.slice(0,8)){
   if(count===5)break;
   const u=sourceURL(a.source_url),published=date(a.article_published_at);
   if(!u||!published||published<earliest||published>day||seen.has(u.toString())||!citedHosts.has(u.hostname))continue;
   if(!["source_name","title_en","title_ko","summary_en","summary_ko"].every(k=>typeof a[k]==="string"&&a[k].trim().length>=5))continue;
   if(!(await verifyPage(u,published)))continue;
   seen.add(u.toString());
   const row={source_url:u.toString(),source_name:a.source_name.slice(0,130),article_published_at:published,collected_on:day,category:String(a.category||"PTA NEWS").slice(0,40),title_en:a.title_en.slice(0,350),title_ko:a.title_ko.slice(0,350),summary_en:a.summary_en.slice(0,1200),summary_ko:a.summary_ko.slice(0,1200),status:"published"};
   const save=await db.from("pta_daily_news").upsert(row,{onConflict:"source_url",ignoreDuplicates:true});
   if(!save.error)count++;
  }
  await finish(count?"complete":"empty",count);
  return respond({status:count?"complete":"empty",day,articles_added:count});
 }catch(e){await finish("error",0,String(e));return respond({error:"News collection failed, see run log"},502);}
});
