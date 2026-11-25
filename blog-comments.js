/* THE YOUNG CLUB PTA BLOG guest comments with up to five nested reply levels. */
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
  const el=(tag,cls,text)=>{const a=document.createElement(tag);if(cls)a.className=cls;if(text!==undefined)a.textContent=text;return a;};
  const dateFmt=new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  function makeForm(post, parentId, onSuccess){
    const form=el('form','tyc-comment-form');
    const nameLabel=el('label',null,'Name / 닉네임');
    const name=el('input');name.type='text';name.maxLength=50;name.minLength=2;name.required=true;name.autocomplete='nickname';name.placeholder='Your display name';nameLabel.append(name);
    const textLabel=el('label',null,parentId?'Reply / 답글':'Comment / 댓글');
    const message=el('textarea');message.required=true;message.maxLength=2000;message.minLength=2;message.rows=parentId?3:4;message.placeholder=parentId?'Write a reply... / 답글을 남겨주세요':'Share your experience or question...';textLabel.append(message);
    const reactions=window.TYC_BlogReactions;
    if(reactions)reactions.attach(textLabel,{
      onEmoji:emoji=>{
        const start=message.selectionStart??message.value.length,end=message.selectionEnd??start;
        message.setRangeText(emoji,start,end,'end');message.focus();
      },
      onGif:id=>{
        const token=reactions.token(id);
        if(!token)return;
        const start=message.selectionStart??message.value.length,end=message.selectionEnd??start;
        message.setRangeText('\n'+token+'\n',start,end,'end');message.focus();
      }
    });
    const trapLabel=el('label','tyc-honeypot','Website (leave blank)');
    const trap=el('input');trap.type='text';trap.name='website';trap.tabIndex=-1;trap.autocomplete='off';trapLabel.append(trap);
    const submit=el('button',null,parentId?'Post Reply':'Post Comment');submit.type='submit';
    const status=el('p','tyc-comments-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    form.append(nameLabel,textLabel,trapLabel,submit,status);
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(!form.reportValidity())return;
      submit.disabled=true;status.textContent=parentId?'Posting reply...':'Posting comment...';
      try{
        const {error}=await client.rpc('blog_comment_submit',{
          p_post_id:post.id,p_display_name:name.value,p_message:message.value,p_website:trap.value,p_parent_id:parentId
        });
        if(error)throw error;
        message.value='';status.textContent=parentId?'Reply published! / 답글이 등록됐습니다.':'Comment published! / 댓글이 등록됐습니다.';
        await onSuccess();
      }catch(err){status.textContent='Could not publish: '+(err.message||'Please try again.');}
      finally{submit.disabled=false;}
    });
    return {form,name};
  }
  async function mount(post){
    root.className='tyc-comments';root.replaceChildren();
    const intro=el('p','tyc-comments-intro','Share your thoughts / 의견을 남겨주세요. No account or approval required.');
    const count=el('p','tyc-comments-count','Comments');
    const list=el('div');
    let admin=false;
    try{
      const {data:{session}}=await client.auth.getSession();
      if(session){const {data}=await client.from('job_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();admin=!!data;}
    }catch(_){/* show no admin controls */}
    const top=makeForm(post,null,refresh);
    root.append(intro,top.form,count,list);
    function addRow(item, target, depth){
      const row=el('div','tyc-comment');
      const header=el('div','tyc-comment-head');
      const nameNode=el('span','tyc-comment-name',item.display_name);if(item.member_id){nameNode.dataset.tycMember=item.member_id;nameNode.tabIndex=0;nameNode.setAttribute('role','button');}header.append(nameNode,el('span','tyc-comment-date',dateFmt.format(new Date(item.created_at))));
      if(admin){
        const del=el('button','tyc-delete','Delete');del.type='button';
        del.addEventListener('click',async()=>{
          const question=depth>0?'Delete this reply and all replies beneath it? / 이 답글과 하위 답글을 삭제할까요?':'Delete this comment and all replies beneath it? / 댓글과 하위 답글을 모두 삭제할까요?';
          if(!confirm(question))return;
          del.disabled=true;
          const {error}=await client.rpc('blog_comment_delete',{p_comment_id:item.id});
          if(error){alert('Could not delete comment: '+error.message);del.disabled=false;return;}
          await refresh();
        });
        header.append(del);
      }
      const content=el('p','tyc-comment-message');
      if(window.TYC_BlogReactions)window.TYC_BlogReactions.render(content,item.message);
      else content.textContent=item.message;
      row.append(header,content);
      if(depth<5){
        const action=el('button','tyc-reply-action','Reply / 답글');action.type='button';
        const holder=el('div','tyc-inline-reply');holder.hidden=true;
        const nested=makeForm(post,item.id,async()=>{holder.hidden=true;await refresh();});
        const cancel=el('button','tyc-cancel-reply','Cancel / 취소');cancel.type='button';cancel.addEventListener('click',()=>{holder.hidden=true;action.setAttribute('aria-expanded','false');});
        nested.form.append(cancel);holder.append(nested.form);
        action.setAttribute('aria-expanded','false');
        action.addEventListener('click',()=>{
          holder.hidden=!holder.hidden;
          action.setAttribute('aria-expanded',String(!holder.hidden));
          if(!holder.hidden)nested.name.focus();
        });
        row.append(action,holder);
      }
      target.append(row);
      return row;
    }
    async function refresh(){
      const {data,error}=await client.from('blog_guest_comments')
        .select('id,display_name,message,created_at,parent_id,member_id')
        .eq('post_id',post.id).order('created_at',{ascending:true}).limit(500);
      list.replaceChildren();
      if(error){list.append(el('p','tyc-comments-intro','Could not load comments. Please try again.'));return;}
      count.textContent=`Comments (${data.length}${data.length===500?'+':''})`;
      if(!data.length){list.append(el('p','tyc-comments-intro','Be the first to comment. / 첫 댓글을 남겨주세요.'));return;}
      const byParent=new Map();
      const ids=new Set(data.map(item=>item.id));
      for(const item of data){
        const parentKey=item.parent_id && ids.has(item.parent_id)?item.parent_id:null;
        if(!byParent.has(parentKey))byParent.set(parentKey,[]);
        byParent.get(parentKey).push(item);
      }
      const rendered=new Set();
      function draw(item,target,depth){
        if(rendered.has(item.id))return; // defensive guard against malformed cycles
        rendered.add(item.id);
        const row=addRow(item,target,depth);
        const children=byParent.get(item.id)||[];
        if(children.length && depth<6){
          const replies=el('div','tyc-replies');
          for(const child of children)draw(child,replies,depth+1);
          row.append(replies);
        }
      }
      for(const item of byParent.get(null)||[])draw(item,list,0);
      // Defensive fallback for legacy malformed/orphaned threads.
      for(const item of data){if(!rendered.has(item.id))draw(item,list,0);}

    }
    await refresh();
  }
  window.TYC_mountBlogGuestComments=mount;
})();
