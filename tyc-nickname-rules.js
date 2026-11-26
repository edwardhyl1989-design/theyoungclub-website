/* THE YOUNG CLUB · Nickname impersonation guard.
   Immediate UX feedback only. Supabase enforces the same restriction on all writes. */
(()=>{
 'use strict';
 const reserved=/(admin|administrator|moderator|modteam|staff|superuser|siteowner|webmaster|support|helpdesk|official|operator|theyoungclub|관리자|운영자|운영진|운영팀|관리팀|사이트관리|관리계정|스태프|스탭|고객센터|고객지원|공식|모더레이터|최고관리)/u;
 const normalizeName=value=>{
  return String(value||'').normalize('NFKC').toLowerCase()
   .replace(/@/g,'a').replace(/[!1]/g,'i').replace(/[$5]/g,'s')
   .replace(/0/g,'o').replace(/3/g,'e').replace(/4/g,'a').replace(/7/g,'t')
   .replace(/[^a-z0-9\uac00-\ud7a3]+/gu,'');
 };
 const isReserved=name=>reserved.test(normalizeName(name));
 const message=(document.documentElement.dataset.communityLanguage==='en'||/\/community-en(?:\.html)?\/?$/i.test(location.pathname))?'Reserved administrator-related nickname. Please choose a different name.':'Reserved administrator-related nickname. Please choose a different name. / 관리자·운영자와 혼동될 수 있는 닉네임은 사용할 수 없습니다.';
 window.TYC_NicknameRules=Object.freeze({isReserved,message});
})();
