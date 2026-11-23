import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

/* Free syndicated RSS collector. Does not use OpenAI or paid services.
   Original feed titles and descriptions only. No AI translations or summaries. */
const feeds=[
 {name:"PTA Headlines",url:"https://news.google.com/rss/search?q=%22physical+therapist+assistant%22+when%3A30d&hl=en-US&gl=US&ceid=US%3Aen"},
 {name:"PTA Licensing",url:"https://news.google.com/rss/search?q=%22physical+therapy%22+%28license+OR+licensure+OR+FSBPT%29+when%3A30d&hl=en-US&gl=US&ceid=US%3Aen"},
 {name:"PTA Education",url:"https://news.google.com/rss/search?q=%22physical+therapist+assistant%22+%28education+OR+exam+OR+career%29+when%3A30d&hl=en-US&gl=US&ceid=US%3Aen"}
];
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const pacificDay=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Los_Angeles",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
function xmlValue(block:string,tag:string){
 const match=block.match(new RegExp("<"+tag+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+tag+">","i"));
 return match?.[1]||"";
}
function decode(input:string){
 return input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&#x([0-9a-f]+);/gi,(_,c)=>String.fromCodePoint(parseInt(c,16))).replace(/&#([0-9]+);/g,(_,c)=>String.fromCodePoint(Number(c))).replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&apos;|&#39;/gi,"'").replace(/&nbsp;/gi," ");
}
function plain(raw:string){return decode(raw).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();}
function validLink(raw:string){try{const u=new URL(plain(raw));if(!["https:"].includes(u.protocol)||u.username||u.password)return null;return u.href;}catch{return null;}}
function parseFeed(text:string,feedName:string){
 const items=[...text.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(v=>v[1]);
 return items.slice(0,35).map(block=>{
  const fullTitle=plain(xmlValue(block,"title"));
  const publisher=plain(xmlValue(block,"source"))||feedName;
  const title=fullTitle.endsWith(" - "+publisher)?fullTitle.slice(0,-publisher.length-3):fullTitle;
  const description=plain(xmlValue(block,"description"));
  const url=validLink(xmlValue(block,"link"));
  const publishedRaw=plain(xmlValue(block,"pubDate"));
  const time=Date.parse(publishedRaw);
  const published=Number.isFinite(time)?new Date(time).toISOString().slice(0,10):null;
  return {title,publisher,description,url,published};
 }).filter(x=>x.title.length>15&&x.url&&x.published);
}
function category(title:string){
 const t=title.toLowerCase();
 if(/licens|board|scope|law|regulat|legislat/.test(t))return "LICENSE";
 if(/exam|school|student|program|education|accredit|capte/.test(t))return "EDUCATION";
 if(/medicare|medicaid|reimburs|billing|cms|payment/.test(t))return "POLICY";
 if(/clinic|treatment|rehabilit|patient|practice/.test(t))return "CLINICAL";
 return "CAREER";
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return reply({error:"Server credentials unavailable"},503);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const auth=req.headers.get("x-pta-news-cron");
 if(!auth)return reply({error:"Unauthorized"},401);
 const verified=await db.rpc("pta_news_verify_scheduler",{p_token:auth});
 if(verified.error||verified.data!==true)return reply({error:"Unauthorized"},401);
 const today=pacificDay(),limit=new Date(today+"T12:00:00Z");limit.setUTCDate(limit.getUTCDate()-30);const earliest=limit.toISOString().slice(0,10);
 const prior=await db.from("pta_news_runs").select("status").eq("day",today).maybeSingle();
 if(prior.error)return reply({error:"Could not query run status",detail:prior.error.message},500);
 if(prior.data&&["complete","empty"].includes(prior.data.status))return reply({day:today,status:"already_processed"});
 const began=await db.from("pta_news_runs").upsert({day:today,status:"running",articles_added:0,started_at:new Date().toISOString(),completed_at:null,error_message:null},{onConflict:"day"});
 if(began.error)return reply({error:"Could not start run",detail:began.error.message},500);
 const finish=async(state:string,n:number,msg:string|null=null)=>db.from("pta_news_runs").update({status:state,articles_added:n,error_message:msg?.slice(0,600)||null,completed_at:new Date().toISOString()}).eq("day",today);
 try{
  let available=0;const found=[];
  for(const feed of feeds){
   try{
    const response=await fetch(feed.url,{headers:{"accept":"application/rss+xml,application/xml,text/xml;q=0.9","user-agent":"Mozilla/5.0 (compatible; TYCPTANews/1.0)"},
     signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error("HTTP "+response.status);
    const xml=await response.text();
    if(!xml.includes("<rss")&&!xml.includes("<channel"))throw Error("Response not RSS");
    available++;
    found.push(...parseFeed(xml,feed.name));
   }catch(e){console.warn("RSS unavailable:",feed.name,String(e));}
  }
  if(!available)throw Error("All RSS providers unavailable; retry on next scheduled run");
  const seen=new Set<string>();let added=0;
  // Newest first; limited to 5 per day. Only original feed excerpts, no fabricated content.
  found.sort((a,b)=>String(b.published).localeCompare(String(a.published)));
  for(const article of found){
   if(added>=5)break;
   if(!article.url||!article.published||article.published<earliest||article.published>today)continue;
   if(seen.has(article.url))continue;seen.add(article.url);
   const combined=(article.title+" "+article.description).toLowerCase();
   if(!/(physical therapist assistant|physical therapy assistant|\bpta\b|\bptas\b)/i.test(article.title))continue;
   if(/sponsored|advertisement|coupon|sale ends/i.test(article.title))continue;
   const excerpt="Source: "+article.publisher+". "+article.title+". Read the original article for full reporting and details.";
   const englishTitle=article.title.slice(0,350);
   const translatedTitle=englishTitle; // unaltered; no translation service used
   const englishSummary=excerpt.slice(0,1100);
   const koreanNotice="PTA 관련 영문 뉴스입니다. AI 번역·요약을 사용하지 않습니다. 원문 제목: "+article.title.slice(0,350)+". 기사 내용은 아래 원문 링크에서 확인해 주세요.";
   const row={source_url:article.url,source_name:article.publisher.slice(0,130),article_published_at:article.published,collected_on:today,
    category:category(article.title),title_en:englishTitle,title_ko:translatedTitle,summary_en:englishSummary,summary_ko:koreanNotice,status:"published"};
   const saved=await db.from("pta_daily_news").insert(row);
   if(!saved.error)added++;
   else if(saved.error.code!=="23505")console.warn("RSS article store failed:",saved.error.message);
  }
  await finish(added?"complete":"empty",added);
  return reply({day:today,status:added?"complete":"empty",added,feeds_available:available,feeds_checked:feeds.length,items_seen:found.length,mode:"free_rss"});
 }catch(e){await finish("error",0,String(e));return reply({error:"Free RSS collection failed; retry scheduled",message:String(e)},502);}
});
