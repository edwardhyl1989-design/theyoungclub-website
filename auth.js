(()=>{'use strict';
const $=id=>document.getElementById(id);
const msg=(s,error=false,kind='')=>{
 const el=$('authMessage');el.replaceChildren();el.classList.toggle('error',error);el.classList.toggle('auth-verification-notice',kind==='verify');
 if(kind!=='verify'){el.textContent=s;return;}
 const icon=document.createElement('span');icon.className='auth-verification-icon';icon.setAttribute('aria-hidden','true');icon.textContent='✉';
 const content=document.createElement('div');content.className='auth-verification-content';
 const label=document.createElement('span');label.className='auth-verification-label';label.textContent='EMAIL VERIFICATION';
 const title=document.createElement('strong');title.className='auth-verification-title';title.textContent='인증 이메일을 보냈습니다!';
 const detail=document.createElement('p');detail.textContent='가입하신 이메일의 받은편지함을 확인하고, 인증 링크를 누른 후 로그인해 주세요.';
 const english=document.createElement('p');english.className='auth-verification-english';english.textContent='Check your inbox and click the verification link before logging in.';
 const tip=document.createElement('p');tip.className='auth-verification-tip';tip.textContent='메일이 보이지 않나요? 스팸함 또는 프로모션함도 확인해 주세요.';
 const login=document.createElement('button');login.type='button';login.className='auth-verification-login';login.textContent='Go to Log In / 로그인하기';
 login.addEventListener('click',()=>{mode='login';view();$('authPassword').value='';$('authEmail').focus();});
 content.append(label,title,detail,english,tip,login);el.append(icon,content);
};
const allowed=new Set(['blog.html','post.html','community.html','community-ko.html','community-en.html','the-club.html','jobs.html','index.html','profile.html','admin-users.html','admin-members.html','admin-content.html','admin-apparel.html','admin-analytics.html','shop.html']);
const url=new URL(location.href);let next=url.searchParams.get('next')||'community.html';
// Never redirect to an external URL or unsafe path.
if(!allowed.has(next))next='community.html';
const requestedTopic=url.searchParams.get('topic');
const safeTopic=requestedTopic&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedTopic)?requestedTopic:null;
const communityRoute=['community.html','community-ko.html','community-en.html'].includes(next);
const returnUrl=communityRoute&&safeTopic?next+'?topic='+encodeURIComponent(safeTopic):next;
$('continueLink').href=returnUrl;
const communityJoin=communityRoute&&!!safeTopic;
if($('tycJoinContext'))$('tycJoinContext').hidden=!communityJoin;
if(next==='admin-apparel.html'){
 const context=$('auth-context');
 if(context)context.textContent='Use your existing The Young Club account to access Apparel Management. Administrator permission is required. / 기존 계정으로 로그인하세요. 관리자 권한이 필요합니다.';
}
let mode=url.searchParams.get('mode')==='signup'?'signup':'login',client=null,user=null,initError='';
function view(){const signup=mode==='signup';document.querySelector('.auth-card')?.classList.toggle('is-signup',signup);$('authHeading').textContent=signup?'Welcome to TYC':'Welcome Back';$('authEyebrow').textContent=signup?'THE YOUNG CLUB / CREATE AN ACCOUNT':'THE YOUNG CLUB / MEMBER ACCESS';const context=$('auth-context');if(context&&next!=='admin-apparel.html')context.textContent=communityJoin
 ?(signup?'Create an account to continue to the discussion. Community verification is required to read the full post.':'Log in to continue to the discussion. Verified PTA/SPTA membership is required.')
 :(signup?'Create your account to connect, share, and grow.':'One account for Job Postings, PTA Community and Shop Management.');$('loginTab').classList.toggle('active',!signup);$('signupTab').classList.toggle('active',signup);$('loginTab').setAttribute('aria-pressed',String(!signup));$('signupTab').setAttribute('aria-pressed',String(signup));$('confirmWrap').hidden=!signup;$('authConfirm').required=signup;$('authPassword').autocomplete=signup?'new-password':'current-password';$('submitBtn').textContent=signup?'Create Account':'Log In';$('resetBtn').hidden=signup;msg(initError,!!initError)}
$('loginTab').onclick=()=>{mode='login';view()};$('signupTab').onclick=()=>{mode='signup';view()};
function sessionView(current){user=current;$('signedIn').hidden=!user;$('authForm').hidden=!!user;$('resetBtn').hidden=!!user||mode==='signup';$('loginTab').disabled=!!user;$('signupTab').disabled=!!user;$('signedInEmail').textContent=user?'Signed in as '+user.email:'';}
function validConfig(){return /^https:\/\/[\w-]+\.supabase\.co\/?$/.test(window.TYC_SUPABASE_URL||'')&&!!window.TYC_SUPABASE_PUBLISHABLE_KEY;}
function loadScript(src){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.onload=resolve;el.onerror=()=>reject(new Error('Unable to load account service resources.'));document.head.appendChild(el);});}
async function init(){
 $('submitBtn').disabled=true;
 try {
  if(!validConfig())await loadScript('supabase-config.js?v=dev-isolated-20261126b&retry='+Date.now());
  if(!window.supabase?.createClient)await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
  if(!validConfig()||!window.supabase?.createClient)throw new Error('Development account service is not connected. Open dev.theyoungclub.com and refresh the page.');
 }catch(e){initError=e.message;msg(initError,true);return;}
 initError='';msg('');
 client=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 $('submitBtn').disabled=false;
 const {data:{session}}=await client.auth.getSession();sessionView(session?.user||null);
 client.auth.onAuthStateChange((event,session)=>{if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','INITIAL_SESSION'].includes(event))sessionView(session?.user||null);});
}
$('authForm').addEventListener('submit',async e=>{e.preventDefault();if(!client)return;const email=$('authEmail').value.trim(),password=$('authPassword').value,button=$('submitBtn');if(mode==='signup'&&password!==$('authConfirm').value){msg('Passwords do not match. / 비밀번호가 일치하지 않습니다.',true);return;}button.disabled=true;msg('Processing...');try{if(mode==='signup'){const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:new URL('auth.html?next='+encodeURIComponent(next)+(safeTopic?'&topic='+encodeURIComponent(safeTopic):''),location.href).href}});if(error)throw error;if(data.session){sessionView(data.user);msg('Account created. You can continue. / 계정이 생성되었습니다.');}else msg('',false,'verify');}else{
 const {data,error}=await client.auth.signInWithPassword({email,password});
 if(error)throw error;
 // Credentials are checked first, so ban reasons are only revealed to
 // the account holder rather than to anyone who knows an email address.
 if(!data?.user?.id)throw Error('Sign-in did not return a valid account.');
 try{
  const blocked=await window.TYC_CHECK_BAN(client,data.user.id);
  if(blocked){sessionView(null);return;}
 }catch(verificationError){
  try{await client.auth.signOut();}catch{}
  throw Error('Unable to verify account access. Please try again. / 계정 상태를 확인하지 못했습니다.');
 }
 location.replace(returnUrl);
}}catch(error){msg(error.message||'Something went wrong.',true)}finally{button.disabled=false}});
// Signed-in visitors may use Continue after account creation or returning to auth.
// Do not leave this intermediate page in mobile browser Back history.
$('continueLink').addEventListener('click',event=>{
 if(!user||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();
 location.replace(returnUrl);
});
$('resetBtn').addEventListener('click',async()=>{if(!client)return;const email=$('authEmail').value.trim();if(!email){msg('Enter your email address first. / 먼저 이메일을 입력해 주세요.',true);return;}const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:new URL('jobs.html',location.href).href});msg(error?error.message:'Please check your email for reset instructions. / 비밀번호 재설정 이메일을 확인해 주세요.',!!error)});
$('logoutBtn').addEventListener('click',async()=>{if(!client)return;const {error}=await client.auth.signOut();if(error)msg(error.message,true);else{mode='login';view();sessionView(null);msg('Signed out.')}});
view();init().catch(e=>{initError=e.message||'Account service initialization failed.';msg(initError,true);$('submitBtn').disabled=!client;});
})();