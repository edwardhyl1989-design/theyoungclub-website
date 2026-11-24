// Configure these two PUBLIC values in Supabase → Project Settings → API Keys.
// Use your Project URL and publishable key (or legacy anon key).
// NEVER place a service_role key, secret key, or admin password in this file.
window.TYC_SUPABASE_URL = 'https://rtumpdvpbauuzionvphy.supabase.co';
window.TYC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_gTcx5287MXrPVwpQS7c4nQ_EkNiIl6z';


/* TYC_session_only_auth (2026-11)
   Keep the active Supabase login for normal navigation and refreshes, but do
   NOT persist the refresh token in localStorage across browser sessions.
   SessionStorage is wiped on ordinary tab/browser closure in modern browsers.
   Browser 'restore previous session' can retain sessionStorage — the browser
   controls that, so closing can never be a guaranteed server-side sign-out. */
(()=>{
 'use strict';
 const sdk=window.supabase;
 if(!sdk||typeof sdk.createClient!=='function')return;
 if(sdk.createClient.__tycSessionOnly)return;

 // Discard the previous long-lived token. Never modify other saved site data
 // (community drafts, preferences, bookmarks, view counters, etc.).
 try{
  const ref=new URL(window.TYC_SUPABASE_URL).hostname.split('.')[0];
  if(/^[a-z0-9]+$/.test(ref)){
   window.localStorage.removeItem('sb-'+ref+'-auth-token');
  }
 }catch{}

 // Some privacy-restricted contexts deny access to sessionStorage. Use
 // memory-only persistence as a safe, less-persistent fallback.
 let storage;
 try{
  const storageCheck='__tyc_session_test__';
  window.sessionStorage.setItem(storageCheck,'1');
  window.sessionStorage.removeItem(storageCheck);
  storage=window.sessionStorage;
 }catch{
  const memory=new Map();
  storage={
   getItem:key=>memory.has(key)?memory.get(key):null,
   setItem:(key,value)=>{memory.set(key,String(value));},
   removeItem:key=>{memory.delete(key);}
  };
 }

 const original=sdk.createClient;
 const wrapped=function(supabaseUrl,supabaseKey,options){
  const settings=options&&typeof options==='object'?options:{};
  const originalAuth=settings.auth&&typeof settings.auth==='object'?settings.auth:{};
  return original.call(sdk,supabaseUrl,supabaseKey,{
   ...settings,
   auth:{
    ...originalAuth,
    persistSession:true,
    storage
   }
  });
 };
 Object.defineProperty(wrapped,'__tycSessionOnly',{value:true});
 sdk.createClient=wrapped;
})();
