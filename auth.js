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
const allowed=new Set(['blog.html','post.html','community.html','jobs.html','index.html','profile.html','admin-members.html','admin-content.html','admin-apparel.html','admin-analytics.html','shop.html']);
const url=new URL(location.href);let next=url.searchParams.get('next')||'community.html';
// Never redirect to an external URL or unsafe path.
if(!allowed.has(next))next='community.html';
$('continueLink').href=next;
if(next==='admin-apparel.html'){
 const context=$('auth-context');
 if(context)context.textContent='Use your existing The Young Club account to access Apparel Management. Administrator permission is required. / 기존 계정으로 로그인하세요. 관리자 권한이 필요합니다.';
}
let mode=url.searchParams.get('mode')==='signup'?'signup':'login',client=null,user=null;
function view(){const signup=mode==='signup';$('authHeading').textContent=signup?'Welcome to TYC':'Welcome Back';$('authEyebrow').textContent=signup?'THE YOUNG CLUB / CREATE AN ACCOUNT':'THE YOUNG CLUB / MEMBER ACCESS';const context=$('auth-context');if(context&&next!=='admin-apparel.html')context.textContent=signup?'Join The Young Club. Create your account to connect, share, and grow with our community.':'One account for Job Postings, PTA Community and Shop Management.';$('loginTab').classList.toggle('active',!signup);$('signupTab').classList.toggle('active',signup);$('loginTab').setAttribute('aria-pressed',String(!signup));$('signupTab').setAttribute('aria-pressed',String(signup));$('confirmWrap').hidden=!signup;$('authConfirm').required=signup;$('authPassword').autocomplete=signup?'new-password':'current-password';$('submitBtn').textContent=signup?'Create Account':'Log In';$('resetBtn').hidden=signup;msg('')}
$('loginTab').onclick=()=>{mode='login';view()};$('signupTab').onclick=()=>{mode='signup';view()};
function sessionView(current){user=current;$('signedIn').hidden=!user;$('authForm').hidden=!!user;$('resetBtn').hidden=!!user||mode==='signup';$('loginTab').disabled=!!user;$('signupTab').disabled=!!user;$('signedInEmail').textContent=user?'Signed in as '+user.email:'';}
async function init(){if(!window.supabase?.createClient||!/^https:\/\/[\w-]+\.supabase\.co\/?$/.test(window.TYC_SUPABASE_URL||'')||!window.TYC_SUPABASE_PUBLISHABLE_KEY){msg('Account service configuration is missing. Please contact the site administrator.',true);$('submitBtn').disabled=true;return;}
 client=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data:{session}}=await client.auth.getSession();sessionView(session?.user||null);
 client.auth.onAuthStateChange((event,session)=>{if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','INITIAL_SESSION'].includes(event))sessionView(session?.user||null);});
}
$('authForm').addEventListener('submit',async e=>{e.preventDefault();if(!client)return;const email=$('authEmail').value.trim(),password=$('authPassword').value,button=$('submitBtn');if(mode==='signup'&&password!==$('authConfirm').value){msg('Passwords do not match. / 비밀번호가 일치하지 않습니다.',true);return;}button.disabled=true;msg('Processing...');try{if(mode==='signup'){const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:new URL('auth.html?next='+encodeURIComponent(next),location.href).href}});if(error)throw error;if(data.session){sessionView(data.user);msg('Account created. You can continue. / 계정이 생성되었습니다.');}else msg('',false,'verify');}else{const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;location.assign(next)}}catch(error){msg(error.message||'Something went wrong.',true)}finally{button.disabled=false}});
$('resetBtn').addEventListener('click',async()=>{if(!client)return;const email=$('authEmail').value.trim();if(!email){msg('Enter your email address first. / 먼저 이메일을 입력해 주세요.',true);return;}const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:new URL('jobs.html',location.href).href});msg(error?error.message:'Please check your email for reset instructions. / 비밀번호 재설정 이메일을 확인해 주세요.',!!error)});
$('logoutBtn').addEventListener('click',async()=>{if(!client)return;const {error}=await client.auth.signOut();if(error)msg(error.message,true);else{mode='login';view();sessionView(null);msg('Signed out.')}});
view();init().catch(e=>msg(e.message,true));
})();