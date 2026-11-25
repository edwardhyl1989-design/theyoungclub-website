// PUBLIC client settings for THE YOUNG CLUB.
// Never place a service_role key, secret key, or admin password in this file.
window.TYC_SUPABASE_URL = 'https://rtumpdvpbauuzionvphy.supabase.co';
window.TYC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_gTcx5287MXrPVwpQS7c4nQ_EkNiIl6z';

/* Use Supabase's built-in browser persistence (localStorage).
   Its defaults keep a login across same-origin tabs, windows and browser restarts,
   and auto-refresh tokens while the member remains signed in.

   Migrate one existing sessionStorage login from our previous session-only
   setup so active members don't unnecessarily have to log in again.
   The migration guard prevents an older tab's saved session from restoring
   a login after the member explicitly signs out. */
(()=>{
 'use strict';
 try{
  const projectRef = new URL(window.TYC_SUPABASE_URL).hostname.split('.')[0];
  if(!/^[a-z0-9]+$/.test(projectRef))return;
  const authKey='sb-'+projectRef+'-auth-token';
  const migrationMarker='tyc-auth-storage-migrated-v1';
  const saved=window.sessionStorage.getItem(authKey);
  if(saved && !window.localStorage.getItem(authKey) &&
     !window.localStorage.getItem(migrationMarker)){
   window.localStorage.setItem(authKey,saved);
   window.localStorage.setItem(migrationMarker,'1');
  }
  // The old per-tab token must not be reused after logout.
  window.sessionStorage.removeItem(authKey);
 }catch{
  // Browsers that block storage can still use Supabase's normal fallback.
 }
})();
