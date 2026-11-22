/* THE YOUNG CLUB PTA BLOG guest comments. Uses Supabase public project settings only. */
(function(){
  'use strict';
  const root=document.getElementById('comment-box');
  if(!root)return;
  const projectUrl=String(window.TYC_SUPABASE_URL||'').replace(/\/$/,'');
  const projectKey=String(window.TYC_SUPABASE_PUBLISHABLE_KEY||'');
  if(!projectUrl.startsWith('https://') || !projectKey || projectUrl.includes('PASTE_') || projectKey.includes('PASTE_') || !window.supabase){
    root.textContent='Comments are temporarily unavailable.';return;
  }
  const client=window.supabase.createClient(projectUrl,projectKey);
  const el=(tag,cls,text)=>{const a=document.createElement(tag);if(cls)a.className=cls;if(text!==undefined)a.textContent=text;return a};
  const dateFmt=new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  async function mount(post){
    root.className='tyc-comments';root.replaceChildren();
    const intro=el('p','tyc-comments-intro','Share your thoughts / 의견을 남겨주세요. No account or approval required.');
    const form=el('form','tyc-comment-form');
    const nameLabel=el('label',null,'Name / 닉네임');
    const name=el('input');name.type='text';name.maxLength=50;name.minLength=2;name.required=true;name.autocomplete='nickname';name.placeholder='Your display name';nameLabel.append(name);
    const textLabel=el('label',null,'Comment / 댓글');
    const message=el('textarea');message.required=true;message.maxLength=2000;message.minLength=2;message.rows=4;message.placeholder='Share your experience or question...';textLabel.append(message);
    const trapLabel=el('label','tyc-honeypot','Website (leave blank)');
    const trap=el('input');trap.type='text';trap.name='website';trap.tabIndex=-1;trap.autocomplete='off';trapLabel.append(trap);
    const submit=el('button',null,'Post Comment');submit.type='submit';
    const status=el('p','tyc-comments-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    form.append(nameLabel,textLabel,trapLabel,submit);
    const count=el('p','tyc-comments-count','Comments');const list=el('div');
    root.append(intro,form,status,count,list);
    let admin=false;
    try{const {data:{session}}=await client.auth.getSession();if(session){const {data}=await client.from('job_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();admin=!!data;}}catch(_){/* hide admin controls if unavailable */}
    async function refresh(){
      const {data,error}=await client.from('blog_guest_comments').select('id,display_name,message,created_at').eq('post_id',post.id).order('created_at',{ascending:true}).limit(200);
      list.replaceChildren();if(error){status.textContent='Could not load comments. Please try again.';return;}
      count.textContent=`Comments (${data.length}${data.length===200?'+':''})`;
      if(!data.length)list.append(el('p','tyc-comments-intro','Be the first to comment. / 첫 댓글을 남겨주세요.'));
      for(const item of data){
        const row=el('div','tyc-comment');const header=el('div','tyc-comment-head');const nameBlock=el('span','tyc-comment-name',item.display_name);
        const d=el('span','tyc-comment-date',dateFmt.format(new Date(item.created_at)));
        header.append(nameBlock,d);
        if(admin){const del=el('button','tyc-delete','Delete');del.type='button';del.addEventListener('click',async()=>{
          if(!confirm('Delete this comment? / 댓글을 삭제할까요?'))return;
          del.disabled=true;const {error}=await client.rpc('blog_comment_delete',{p_comment_id:item.id});
          if(error){status.textContent='Could not delete comment: '+error.message;del.disabled=false;return;}
          status.textContent='Comment removed.';await refresh();
        });header.append(del);}
        row.append(header,el('p','tyc-comment-message',item.message));list.append(row);
      }
    }
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(!form.reportValidity())return;
      submit.disabled=true;status.textContent='Posting comment...';
      try{
        const {error}=await client.rpc('blog_comment_submit',{
          p_post_id:post.id,p_display_name:name.value,p_message:message.value,p_website:trap.value
        });
        if(error)throw error;
        message.value='';status.textContent='Comment published! / 댓글이 등록됐습니다.';
        await refresh();
      }catch(err){status.textContent='Could not publish: '+(err.message||'Please try again.');}
      finally{submit.disabled=false;}
    });
    await refresh();
  }
  window.TYC_mountBlogGuestComments=mount;
})();
