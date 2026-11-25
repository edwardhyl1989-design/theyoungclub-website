import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.57.0";

// All-account directory is ONLY available to a signed-in full administrator.
// The secret service key never reaches the client.
const origins=new Set(["https://theyoungclub.com","https://www.theyoungclub.com"]);
function json(body:unknown,status=200,origin:string|null=null){
 const selected=origin&&origins.has(origin)?origin:"https://theyoungclub.com";
 return new Response(JSON.stringify(body),{status,headers:{
  "Content-Type":"application/json; charset=utf-8","Cache-Control":"private, no-store",
  "Access-Control-Allow-Origin":selected,"Access-Control-Allow-Methods":"POST,OPTIONS",
  "Access-Control-Allow-Headers":"content-type,apikey,authorization,x-client-info",
  "Vary":"Origin"
 }});
}
const text=(value:unknown)=>typeof value==="string"?value.trim():"";
Deno.serve(async(req)=>{
 const origin=req.headers.get("origin");
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
  "Access-Control-Allow-Origin":origin&&origins.has(origin)?origin:"https://theyoungclub.com",
  "Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"content-type,apikey,authorization,x-client-info","Vary":"Origin"
 }});
 if(req.method!=="POST"||!origin||!origins.has(origin))return json({error:"Not available"},403,origin);
 const url=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!serviceKey)return json({error:"Server configuration unavailable"},503,origin);
 const client=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const bearer=req.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
 if(!bearer)return json({error:"Administrator sign-in required"},401,origin);
 const own=await client.auth.getUser(bearer);
 const caller=own.data?.user?.id;
 if(own.error||!caller)return json({error:"Administrator sign-in required"},401,origin);
 const authorized=await client.from("job_admins").select("user_id").eq("user_id",caller).maybeSingle();
 if(authorized.error||!authorized.data)return json({error:"Full administrator permission required"},403,origin);
 try{
  const raw=await req.text();if(raw.length>1500)return json({error:"Request too large"},413,origin);
  const body=JSON.parse(raw);const action=text(body?.action);
  if(action==="list"){
   const all=[];
   // Paginate Auth users: never rely on a default first page.
   for(let page=1;page<=100;page++){
    const result=await client.auth.admin.listUsers({page,perPage:200});
    if(result.error)throw result.error;
    const segment=result.data?.users||[];all.push(...segment);
    if(segment.length<200)break;
    if(page===100)return json({error:"Directory exceeds the supported limit; use a paged directory."},503,origin);
   }
   const [members,fulls,scoped,activity,owners,bans]=await Promise.all([
    client.from("pta_members").select("user_id,display_name,legal_first_name,legal_last_name,member_type,membership_status,created_at,verified_at").limit(10000),
    client.from("job_admins").select("user_id").limit(2000),
    client.from("tyc_staff_grants").select("user_id,role").limit(2000),
    client.from("tyc_member_presence").select("user_id,last_seen_at").limit(20000),
    client.from("tyc_staff_owner").select("user_id").limit(10),
    client.from("tyc_user_bans").select("user_id,reason,banned_at").limit(10000)
   ]);
   for(const item of [members,fulls,scoped,activity,owners,bans])if(item.error)throw item.error;
   const memberBy=new Map((members.data||[]).map(x=>[x.user_id,x]));
   const fullSet=new Set((fulls.data||[]).map(x=>x.user_id));
   const scopeBy=new Map((scoped.data||[]).map(x=>[x.user_id,x.role]));
   const seenBy=new Map((activity.data||[]).map(x=>[x.user_id,x.last_seen_at]));
   const ownerSet=new Set((owners.data||[]).map(x=>x.user_id));
   const banBy=new Map((bans.data||[]).map(x=>[x.user_id,x]));
   const now=Date.now();
   const users=all.map(u=>{
    const m=memberBy.get(u.id);
    const metadata=u.user_metadata||{};
    const first=text(m?.legal_first_name||metadata.first_name||metadata.given_name);
    const last=text(m?.legal_last_name||metadata.last_name||metadata.family_name);
    const display=(first+" "+last).trim()||text(metadata.full_name||metadata.name)||"Not provided";
    const nickname=text(m?.display_name||metadata.display_name||metadata.nickname)||"Not provided";
    const lastSeen=seenBy.get(u.id)||null;
    const ban=banBy.get(u.id);
    const online=!ban&&!!lastSeen&&now-Date.parse(lastSeen)>=0&&now-Date.parse(lastSeen)<=150000;
    return {id:u.id,name:display,nickname,email:u.email||"",joined_at:u.created_at||null,
      membership_type:m?.member_type||null,membership_status:m?.membership_status||null,
      applied_at:m?.created_at||null,approved_at:m?.verified_at||null,
      last_seen_at:lastSeen,last_sign_in_at:u.last_sign_in_at||null,
      online,role:fullSet.has(u.id)?"full":scopeBy.get(u.id)||"member",
      owner:ownerSet.has(u.id),banned:!!ban,ban_reason:ban?.reason||null,banned_at:ban?.banned_at||null};
   }).sort((a,b)=>Date.parse(b.joined_at||"")-Date.parse(a.joined_at||""));
   const applications=users.filter(u=>u.membership_type);
   return json({users,stats:{total:users.length,applied:applications.length,
    standard:users.length-applications.length,
    approved:applications.filter(u=>u.membership_status==="approved").length,
    pending:applications.filter(u=>u.membership_status==="pending").length,
    online:users.filter(u=>u.online).length,
    banned:users.filter(u=>u.banned).length},online_window_seconds:150},200,origin);
  }
  if(!["set_role","ban","delete_banned"].includes(action))return json({error:"Unknown action"},400,origin);
  const target=text(body?.user_id),newRole=text(body?.role);
  if(!/^[a-f0-9-]{36}$/i.test(target))
   return json({error:"Invalid member ID"},400,origin);
  if(action==="set_role"&&!["member","full","shop","community"].includes(newRole))
   return json({error:"Invalid role request"},400,origin);
  const targetResult=await client.auth.admin.getUserById(target);
  if(targetResult.error||!targetResult.data?.user)return json({error:"User does not exist"},404,origin);
  if(target===caller&&(action!=="set_role"||newRole!=="full"))return json({error:"You cannot restrict your own administrator account"},403,origin);
  const [owner,full,grant,banRecord]=await Promise.all([
   client.from("tyc_staff_owner").select("user_id").eq("user_id",target).maybeSingle(),
   client.from("job_admins").select("user_id").eq("user_id",target).maybeSingle(),
   client.from("tyc_staff_grants").select("role").eq("user_id",target).maybeSingle(),
   client.from("tyc_user_bans").select("user_id,reason").eq("user_id",target).maybeSingle()
  ]);
  if(owner.error||full.error||grant.error||banRecord.error)throw Error("Could not confirm role");
  if(action==="ban"){
   if(owner.data||full.data)return json({error:"Full administrators cannot be banned. Remove elevated permissions first, except for the protected site owner."},403,origin);
   if(banRecord.data)return json({error:"This account is already banned"},409,origin);
   const reason=text(body?.reason);
   if(reason.length<10||reason.length>500)return json({error:"Enter a ban reason between 10 and 500 characters"},400,origin);
   const result=await client.from("tyc_user_bans").insert({user_id:target,reason,banned_by:caller});
   if(result.error)throw result.error;
   return json({ok:true,banned:true},200,origin);
  }
  if(action==="delete_banned"){
   if(owner.data||full.data)return json({error:"Administrator accounts cannot be deleted here"},403,origin);
   if(!banRecord.data)return json({error:"Only banned accounts can be permanently deleted"},403,origin);
   if(text(body?.confirm_email).toLowerCase()!==text(targetResult.data.user.email).toLowerCase())
    return json({error:"Confirm the exact account email before permanent deletion"},400,origin);
   const removal=await client.auth.admin.deleteUser(target,false);
   if(removal.error){
    const detail=String(removal.error.message||"");
    return json({error:/storage|object owner/i.test(detail)?
      "This user owns uploaded files. Review and remove their files in Supabase Storage before deleting the account. The ban remains active.":
      "Could not permanently delete the account. Its ban remains active; check linked records and Storage ownership."},409,origin);
   }
   return json({ok:true,deleted:true},200,origin);
  }
  if(banRecord.data)return json({error:"Banned accounts cannot be assigned permissions"},403,origin);
  if(owner.data&&newRole!=="full")return json({error:"The original site owner must remain a full administrator"},403,origin);
  const before=full.data?"full":grant.data?.role||"member";
  if(before===newRole)return json({ok:true,role:newRole},200,origin);
  if(newRole==="full"){
   const r=await client.from("job_admins").upsert({user_id:target},{onConflict:"user_id"});
   if(r.error)throw r.error;
   const d=await client.from("tyc_staff_grants").delete().eq("user_id",target);
   if(d.error)throw d.error;
  }else{
   // Grant limited access first, before removing unrestricted access.
   if(newRole==="shop"||newRole==="community"){
    const r=await client.from("tyc_staff_grants").upsert({
     user_id:target,role:newRole,granted_by:caller,granted_at:new Date().toISOString()
    },{onConflict:"user_id"});
    if(r.error)throw r.error;
   }
   if(full.data){
    const d=await client.from("job_admins").delete().eq("user_id",target);
    if(d.error)throw d.error;
   }
   if(newRole==="member"){
    const d=await client.from("tyc_staff_grants").delete().eq("user_id",target);
    if(d.error)throw d.error;
   }
  }
  const audit=await client.from("tyc_staff_role_audit").insert({actor_id:caller,target_id:target,old_role:before,new_role:newRole});
  if(audit.error)return json({ok:true,role:newRole,warning:"Role changed but audit logging needs review"},200,origin);
  return json({ok:true,role:newRole},200,origin);
 }catch(error){
  return json({error:"Unable to complete administrator request"},503,origin);
 }
});