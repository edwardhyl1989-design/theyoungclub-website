// DEVELOPMENT ONLY. Do not merge into main.
window.TYC_ENVIRONMENT = 'development';
window.TYC_SUPABASE_URL = '';
window.TYC_SUPABASE_PUBLISHABLE_KEY = '';
// A branch preview in the production Pages project must not connect.
if (location.hostname === 'dev.theyoungclub.com' ||
    location.hostname === 'theyoungclub-dev.pages.dev' ||
    location.hostname.endsWith('.theyoungclub-dev.pages.dev')) {
  window.TYC_SUPABASE_URL = "https://manxspfufydqwgkxpwtw.supabase.co";
  window.TYC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_s6S44G0RPDC_utMrTFuLUg_9jzO45PA";
}
