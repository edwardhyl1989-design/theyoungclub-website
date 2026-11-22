(()=>{'use strict';
const $=id=>document.getElementById(id),msg=(s,error=false)=>{$('authMessage').textContent=s;$('authMessage').classList.toggle('error',error)};
const allowed=new Set(['blog.html','post.html','community.html','jobs.html','index.html','profile.html','admin-members.html','admin-content.html']);
const url=new URL(location.href);let next=url.searchParams.get('next')||'community.html';
// Never redirect to an external URL or unsafe path.
if(!allowed.has(next))next='community.html';
$('continueLink').href=next;
let mode='login',client=null,user=null;
function view(){const signup=mode==='signup';$('loginTab').classList.toggle('active',!signup);$('signupTab').classList.toggle('active',signup);$('loginTab').setAttribute('aria-pressed',String(!signup));$('signupTab').setAttribute('aria-pressed',String(signup));$('confirmWrap').hidden=!signup;$('authConfirm').required=signup;$('authPassword').autocomplete=signup?'new-password':'current-password';$('submitBtn').textContent=signup?'Create Account':'Log In';$('resetBtn').hidden=signup;msg('')}
$('loginTab').onclick=()=>{mode='login';view()};$('signupTab').onclick=()=>{mode='signup';view()};
function sessionView(current){user=current;$('signedIn').hidden=!user;$('authForm').hidden=!!user;$('resetBtn').hidden=!!user||mode==='signup';$('loginTab').disabled=!!user;$('signupTab').disabled=!!user;$('signedInEmail').textContent=user?'Signed in as '+user.email:'';}
async function init(){if(!window.supabase?.createClient||!/^https:\/\/[\w-]+\.supabase\.co\/?$/.test(window.TYC_SUPABASE_URL||'')||!window.TYC_SUPABASE_PUBLISHABLE_KEY){msg('Account service configuration is missing. Please contact the site administrator.',true);$('submitBtn').disabled=true;return;}
 client=window.supabase.createClient(window.TYC_SUPABASE_URL,window.TYC_SUPABASE_PUBLISHABLE_KEY);
 const {data:{session}}=await client.auth.getSession();sessionView(session?.user||null);
 client.auth.onAuthStateChange((event,session)=>{if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','INITIAL_SESSION'].includes(event))sessionView(session?.user||null);});
}
$('authForm').addEventListener('submit',async e=>{e.preventDefault();if(!client)return;const email=$('authEmail').value.trim(),password=$('authPassword').value,button=$('submitBtn');if(mode==='signup'&&password!==$('authConfirm').value){msg('Passwords do not match. / 비밀번호가 일치하지 않습니다.',true);return;}button.disabled=true;msg('Processing...');try{if(mode==='signup'){const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:new URL('auth.html?next='+encodeURIComponent(next),location.href).href}});if(error)throw error;if(data.session){sessionView(data.user);msg('Account created. You can continue. / 계정이 생성되었습니다.');}else msg('Please check your email to confirm your account, then log in. / 이메일 인증 후 로그인해 주세요.');}else{const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;location.assign(next)}}catch(error){msg(error.message||'Something went wrong.',true)}finally{button.disabled=false}});
$('resetBtn').addEventListener('click',async()=>{if(!client)return;const email=$('authEmail').value.trim();if(!email){msg('Enter your email address first. / 먼저 이메일을 입력해 주세요.',true);return;}const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:new URL('jobs.html',location.href).href});msg(error?error.message:'Please check your email for reset instructions. / 비밀번호 재설정 이메일을 확인해 주세요.',!!error)});
$('logoutBtn').addEventListener('click',async()=>{if(!client)return;const {error}=await client.auth.signOut();if(error)msg(error.message,true);else{mode='login';view();sessionView(null);msg('Signed out.')}});
view();init().catch(e=>msg(e.message,true));
})();