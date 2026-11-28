// Public URL discovery only. No account credentials, member content or private topic access.
const SITE = "https://theyoungclub.com";
const BASE = ["/","/blog.html","/jobs.html","/community.html","/community-en.html","/community-ko.html","/community-explore.html","/pta-news.html","/the-club.html","/shop.html","/about.html","/qna.html","/privacy.html","/terms.html"];
const xmlEscape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const render = urls => '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+[...new Set(urls)].map(url=>'  <url><loc>'+xmlEscape(url)+'</loc></url>').join('\n')+'\n</urlset>\n';
async function rows(project,key,table,filter){
 const result=[];
 for(let offset=0;offset<20000;offset+=500){
  const url=new URL('/rest/v1/'+table,project);
  Object.entries(filter).forEach(([k,v])=>url.searchParams.set(k,v));
  url.searchParams.set('limit','500');url.searchParams.set('offset',String(offset));
  const response=await fetch(url,{headers:{apikey:key,Accept:'application/json'},signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw new Error('Public listing unavailable');
  const page=await response.json();if(!Array.isArray(page))throw new Error('Invalid listing');
  result.push(...page);if(page.length<500)break;
 }
 return result;
}
export async function onRequestGet(context){
 const requestURL=new URL(context.request.url);
 if(!['theyoungclub.com','www.theyoungclub.com'].includes(requestURL.hostname))return new Response(render([]),{headers:{'Content-Type':'application/xml; charset=utf-8','X-Robots-Tag':'noindex, nofollow','Cache-Control':'no-store'}});
 const urls=BASE.map(path=>SITE+path);
 try{
  const configResponse=await context.env.ASSETS.fetch(new Request(new URL('/supabase-config.js',requestURL)));
  if(!configResponse.ok)throw new Error('Public config unavailable');
  const config=await configResponse.text();
  const project=config.match(/window\.TYC_SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/i)?.[1];
  const key=config.match(/window\.TYC_SUPABASE_PUBLISHABLE_KEY\s*=\s*['"]([^'"]+)['"]/i)?.[1];
  if(!project||!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/i.test(project)||!key||!key.startsWith('sb_publishable_'))throw new Error('Missing publishable config');
  const [blog,previews]=await Promise.all([
   rows(project,key,'tyc_blog_posts',{select:'id',published:'eq.true',order:'id.asc'}),
   rows(project,key,'pta_topic_public_previews',{select:'topic_id',order:'topic_id.asc'})
  ]);
  for(const row of blog){if(typeof row.id==='string'&&/^[a-zA-Z0-9_-]{1,150}$/.test(row.id))urls.push(SITE+'/post.html?id='+encodeURIComponent(row.id));}
  for(const row of previews){if(typeof row.topic_id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8a-f][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(row.topic_id))urls.push(SITE+'/discussion.html?id='+encodeURIComponent(row.topic_id));}
  return new Response(render(urls),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}});
 }catch(error){
  // Do not enumerate stale private/unpublished records on an upstream failure.
  return new Response('Public sitemap temporarily unavailable; retry shortly.',{status:503,headers:{'Retry-After':'120','Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}});
 }
}
