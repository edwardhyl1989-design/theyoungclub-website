/* Accessible PTA Q&A accordion. No login required to read. */
(()=>{'use strict';const items=Array.isArray(window.TYC_QNA_ITEMS)?window.TYC_QNA_ITEMS.filter(x=>x&&x.question?.trim()&&x.answer?.trim()):[];
const list=document.getElementById('qna-list'),search=document.getElementById('qna-search'),category=document.getElementById('qna-category'),count=document.getElementById('qna-count'),empty=document.getElementById('qna-empty');
if(!list)return;
const categories=[...new Set(items.map(x=>x.category||'General'))].sort();
for(const name of categories){const opt=document.createElement('option');opt.value=opt.textContent=name;category.append(opt);}
function draw(){const q=search.value.trim().toLocaleLowerCase(),cat=category.value;const visible=items.filter(x=>(!cat||(x.category||'General')===cat)&&(!q||[x.question,x.answer,x.category].join(' ').toLocaleLowerCase().includes(q)));
list.replaceChildren();for(const [i,x] of visible.entries()){
const details=document.createElement('details');details.className='qna-item';
const summary=document.createElement('summary');const line=document.createElement('span');line.className='qna-question-line';
const meta=document.createElement('span');meta.className='qna-topic';meta.textContent=x.category||'General';
const title=document.createElement('strong');title.textContent=x.question;line.append(meta,title);
const toggle=document.createElement('span');toggle.className='qna-toggle';toggle.setAttribute('aria-hidden','true');toggle.textContent='+';
summary.append(line,toggle);
const answer=document.createElement('div');answer.className='qna-answer';for(const paragraph of x.answer.split(/\n\s*\n/)){const p=document.createElement('p');p.textContent=paragraph;answer.append(p);}
details.append(summary,answer);list.append(details);
}
empty.hidden=visible.length>0;count.textContent=visible.length+' '+(visible.length===1?'ANSWER':'ANSWERS');
if(!items.length){empty.hidden=false;empty.textContent='The Q&A page is ready. Questions and answers will appear here as they are published. / 질문과 답변이 등록되면 이곳에 표시됩니다.';}else{empty.textContent='No matching Q&A yet. Try a different keyword or category.';}
}
search.addEventListener('input',draw);category.addEventListener('change',draw);draw();
})();