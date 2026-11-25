import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

/* Admin-only numeric access codes. Never store or log a plaintext code.
   The existing job_admins membership remains the sole source of authority. */
const allowedOrigins = new Set(["https://theyoungclub.com", "https://www.theyoungclub.com"]);
const encoder = new TextEncoder();
const ITERATIONS = 210000;

function response(body: unknown, status: number, origin: string | null) {
 const allowed = origin && allowedOrigins.has(origin) ? origin : "https://theyoungclub.com";
 return new Response(status===204 ? null : JSON.stringify(body), {status, headers:{
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"no-store, private",
  "Pragma":"no-cache",
  "Access-Control-Allow-Origin":allowed,
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Access-Control-Allow-Headers":"apikey, authorization, content-type, x-client-info",
  "Vary":"Origin"
 }});
}
function hex(bytes: Uint8Array) { return Array.from(bytes, b=>b.toString(16).padStart(2,"0")).join(""); }
async function sha(input: string) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(input)))); }
function fromBase64(b64: string) { return Uint8Array.from(atob(b64), c=>c.charCodeAt(0)); }
function base64(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)); }
async function hashCode(code: string, salt: Uint8Array) {
 const key = await crypto.subtle.importKey("raw", encoder.encode(code), "PBKDF2", false, ["deriveBits"]);
 const value = await crypto.subtle.deriveBits({ name:"PBKDF2", hash:"SHA-256",salt,iterations:ITERATIONS },key,256);
 return hex(new Uint8Array(value));
}
function sameDigest(a:string,b:string) {
 if(a.length!==b.length)return false;
 let v=0;
 for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);
 return v===0;
}

Deno.serve(async request=>{
 const origin=request.headers.get("origin");
 if(request.method==="OPTIONS")return response({},204,origin);
 if(request.method!=="POST"||!origin||!allowedOrigins.has(origin))
  return response({error:"Not available"},403,origin);
 const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
 const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!supabaseUrl||!secret)return response({error:"Service unavailable"},503,origin);
 const admin=createClient(supabaseUrl,secret,{auth:{autoRefreshToken:false,persistSession:false}});
 try{
  const raw=await request.text();
  if(raw.length>1200)return response({error:"Request too large"},413,origin);
  const body=JSON.parse(raw);
  const action=String(body?.action||"");
  if(action==="login"){
   // Atomic database limits apply across Edge Function instances. Per-address
   // and global limits help resist spoofed addresses and automated guessing.
   const rawIp=(request.headers.get("cf-connecting-ip")||request.headers.get("x-real-ip")
       ||request.headers.get("x-forwarded-for")||"unavailable").split(",")[0].trim().slice(0,90);
   const ipBucket="admin-ip-"+(await sha(rawIp));
   const [ipLimit, globalLimit]=await Promise.all([
     admin.rpc("tyc_admin_login_allow_attempt",{p_bucket:ipBucket,p_max_attempts:8,p_window_seconds:900}),
     admin.rpc("tyc_admin_login_allow_attempt",{p_bucket:"admin-global-15m",p_max_attempts:250,p_window_seconds:900})
   ]);
   if(ipLimit.error||globalLimit.error)return response({error:"Login is temporarily unavailable"},503,origin);
   if(!ipLimit.data||!globalLimit.data)return response({error:"Too many attempts. Please try again in 15 minutes."},429,origin);
   const code=String(body.code||"");
   if(!/^\d{16,32}$/.test(code))return response({error:"Invalid access code"},401,origin);
   const {data:keys,error:keyError}=await admin.from("tyc_admin_login_keys")
      .select("user_id,code_salt,code_hash").eq("enabled",true).limit(100);
   if(keyError)return response({error:"Login is temporarily unavailable"},503,origin);
   const matched=[];
   for(const row of keys||[]){
    const computed=await hashCode(code,fromBase64(row.code_salt));
    if(sameDigest(computed,row.code_hash))matched.push(row.user_id);
   }
   if(matched.length!==1)return response({error:"Invalid access code"},401,origin);
   const userId=matched[0];
   const [role,userResult]=await Promise.all([
    admin.from("job_admins").select("user_id").eq("user_id",userId).maybeSingle(),
    admin.auth.admin.getUserById(userId)
   ]);
   const email=userResult.data?.user?.email;
   if(role.error||!role.data||userResult.error||!email||!userResult.data?.user?.email_confirmed_at)
    return response({error:"Invalid access code"},401,origin);
   // A one-use Supabase Auth token creates the *existing* account session.
   // It does not create a second admin identity or modify normal email login.
   const generated=await admin.auth.admin.generateLink({type:"magiclink",email});
   const tokenHash=generated.data?.properties?.hashed_token;
   if(generated.error||!tokenHash)return response({error:"Could not start sign-in"},503,origin);
   await admin.from("tyc_admin_login_keys").update({last_used_at:new Date().toISOString()}).eq("user_id",userId);
   return response({token_hash:tokenHash},200,origin);
  }
  if(!["list","set","disable"].includes(action))return response({error:"Invalid action"},400,origin);
  const bearer=(request.headers.get("authorization")||"").match(/^Bearer (\S+)$/i)?.[1];
  if(!bearer)return response({error:"Administrator login required"},401,origin);
  const caller=await admin.auth.getUser(bearer);
  const uid=caller.data?.user?.id;
  if(caller.error||!uid)return response({error:"Administrator login required"},401,origin);
  const role=await admin.from("job_admins").select("user_id").eq("user_id",uid).maybeSingle();
  if(role.error||!role.data)return response({error:"Administrator access required"},403,origin);

  if(action==="list"){
   const [admins,keys]=await Promise.all([
     admin.from("job_admins").select("user_id,created_at").order("created_at",{ascending:true}).limit(100),
     admin.from("tyc_admin_login_keys").select("user_id,enabled,updated_at,last_used_at").limit(100)
   ]);
   if(admins.error||keys.error)return response({error:"Unable to load administrators"},503,origin);
   const results=await Promise.all((admins.data||[]).map(async row=>{
    const u=await admin.auth.admin.getUserById(row.user_id);
    const k=(keys.data||[]).find(key=>key.user_id===row.user_id);
    return {user_id:row.user_id,email:u.data?.user?.email||"(unknown)",enabled:!!k?.enabled,configured:!!k,updated_at:k?.updated_at||null,last_used_at:k?.last_used_at||null};
   }));
   return response({accounts:results},200,origin);
  }
  const userId=String(body.user_id||"");
  if(!/^[a-f0-9-]{36}$/i.test(userId))return response({error:"Invalid administrator"},400,origin);
  const target=await admin.from("job_admins").select("user_id").eq("user_id",userId).maybeSingle();
  if(target.error||!target.data)return response({error:"Administrator not found"},404,origin);
  if(action==="disable"){
    const updated=await admin.from("tyc_admin_login_keys").update({enabled:false,updated_at:new Date().toISOString()}).eq("user_id",userId);
    if(updated.error)return response({error:"Unable to disable code"},503,origin);
    return response({ok:true},200,origin);
  }
  const code=String(body.code||"");
  if(!/^\d{16,32}$/.test(code)||/^([0-9])\1+$/.test(code))
    return response({error:"Use a unique 16–32 digit access code; repeated digits are not allowed."},400,origin);
  const salt=crypto.getRandomValues(new Uint8Array(24));
  const code_hash=await hashCode(code,salt);
  const updated=await admin.from("tyc_admin_login_keys").upsert({
   user_id:userId,code_salt:base64(salt),code_hash,enabled:true,updated_at:new Date().toISOString()
  },{onConflict:"user_id"});
  if(updated.error)return response({error:"Unable to save access code"},503,origin);
  return response({ok:true},200,origin);
 }catch{
  return response({error:"Request could not be completed"},500,origin);
 }
});