/* Shared blog content loader. Supabase is authoritative; legacy posts.json is emergency fallback only. */
window.TYC_BlogData=(()=>{
 let client=null;
 function db(){
  if(client)return client;
  if(!window.supabase?.createClient||!window.TYC_SUPABASE_URL||!window.TYC_SUPABASE_PUBLISHABLE_KEY)return null;
  client=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
  return client;
 }
 async function all(){
  const c=db();
  if(c){
   try{
    const {data,error}=await c.from('tyc_blog_posts').select('id,title,date,category,summary,body,cover,published,is_featured,created_at').eq('published',true).order('date',{ascending:false});
    if(!error&&Array.isArray(data))return data;
    console.warn('Live blog posts unavailable; trying backup archive.',error?.message||'');
   }catch(e){console.warn('Blog content request failed',e);}
  }
  const response=await fetch('posts.json',{cache:'no-store'});
  if(!response.ok)throw Error('Blog backup unavailable');
  const posts=await response.json();
  if(!Array.isArray(posts))throw Error('Invalid blog backup');
  return posts;
 }
 return {db,all};
})();