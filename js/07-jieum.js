/* ============================================================
 * [지음] 그림책 · 시화
 * (분할 자동 생성 — 원본 index.html에서 추출, 로드 순서 유지 필수)
 * ============================================================ */
/* ═══════════════════════════════════════════════
   4단계: 지음 (그림책 & 시화)
═══════════════════════════════════════════════ */
function switchTab(tab){
  ['Book','Poem'].forEach(t=>{
    const l=t.toLowerCase();
    const tabBtn = $(`tab${t}`);
    const content = $(`tabContent${t}`);
    if(tabBtn) {
      tabBtn.style.color = l===tab ? 'white' : '#ffd1d0';
      tabBtn.style.borderBottomColor = l===tab ? 'white' : 'transparent';
    }
    if(content) content.classList.toggle('active',l===tab);
  });
  
  const isBook=tab==='book';
  ['bookSaveBtn','bookJpgBtn','bookPrintBtn','bookLoadBtn','bookResetBtn'].forEach(id=>$(id).style.display=isBook?'':'none');
  ['poemSaveBtn','poemPrintBtn','poemLoadBtn','poemResetBtn'].forEach(id=>$(id).style.display=!isBook?'':'none');
}

let bookPages=[], currentBookId=null;
async function getAllBooks(){ return (await lsGet(SK.bookList(currentNick)))||[]; }
async function saveAllBooks(books){ await lsSet(SK.bookList(currentNick),books); }

async function saveCurrentBook(){
  if(!bookPages.length){toast('저장할 페이지가 없어요!');return;}
  const books=await getAllBooks();
  const now=Date.now();
  if(currentBookId){
    const idx=books.findIndex(b=>b.id===currentBookId);
    if(idx!==-1) books[idx]={...books[idx], pages:bookPages.map(p=>({text:p.text,b64:p.b64})), updatedAt:now};
    else books.unshift({id:currentBookId,title:`${currentNick}의 그림책`,pages:bookPages.map(p=>({text:p.text,b64:p.b64})),createdAt:now,updatedAt:now});
  }else{
    currentBookId=`book_${now}`;
    books.unshift({id:currentBookId,title:`${currentNick}의 그림책`,pages:bookPages.map(p=>({text:p.text,b64:p.b64})),createdAt:now,updatedAt:now});
  }
  await saveAllBooks(books);
  toast('💾 그림책 저장 완료!');
}

async function openBookListModal(){
  const books=await getAllBooks(),el=$('bookListContent');
  if(!books.length){el.innerHTML='<div class="empty-list">저장된 그림책이 없어요</div>';$('bookListModal').classList.add('open');return;}
  el.innerHTML=books.map(b=>`
    <div class="story-list-item">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="flex:1;cursor:pointer;" onclick="loadBook('${b.id}')">
          <div class="story-list-title">📖 ${b.title||'제목 없음'}</div>
          <div class="story-list-preview">${b.pages?.length||0}페이지</div>
        </div>
        <button class="d-del" onclick="deleteBook('${b.id}')">🗑️</button>
      </div>
    </div>`).join('');
  $('bookListModal').classList.add('open');
}
async function loadBook(id){
  const b=(await getAllBooks()).find(x=>x.id===id);if(!b)return;
  currentBookId=b.id;
  bookPages=b.pages.map(p=>({...p}));
  renderBookViewer();
  closeModal('bookListModal');toast(`📖 "${b.title}" 불러왔어요!`);
}
async function deleteBook(id){
  if(!confirm('삭제할까요?'))return;
  const a=(await getAllBooks()).filter(b=>b.id!==id);await saveAllBooks(a);
  if(currentBookId===id){currentBookId=null;bookPages=[];renderBookViewer();}
  await openBookListModal();toast('삭제됐어요.');
}
function renderBookViewer(){
  const viewer=$('bookViewer');
  if(!bookPages.length){viewer.innerHTML=`<div style="color:#aaa;font-size:13px;text-align:center;width:100%;margin-top:100px;">내용을 적고 [페이지 추가하기]를 눌러보세요! ✨</div>`;return;}
  viewer.innerHTML='';
  bookPages.forEach((p,i)=>{
    // b-page 클래스에 CSS 애니메이션(pageTurn)이 적용되어 책 넘김 효과 부여
    viewer.insertAdjacentHTML('beforeend',`<div class="b-page"><img src="${p.b64}" class="b-page-img"><div class="b-page-text">${p.text}</div><div class="b-page-num">- ${i+1} -</div></div>`);
  });
}
function resetBook(){
  if(bookPages.length>0&&!confirm('지금까지 만든 책이 지워져요. 새로 시작할까요?'))return;
  bookPages=[];currentBookId=null;
  $('bookInput').value='';renderBookViewer();
}
async function addBookPage(){
  const text=$('bookInput').value.trim();if(!text){toast('이야기를 적어주세요!');return;}
  const btn=$('bDrawBtn');
  btn.disabled=true;btn.textContent='장면 분석 중... ⏳';
  try{
    const promptRaw=await callClaude({model:'claude-haiku-4-5-20251001',max_tokens:80,
      system:`Convert Korean children's story scene to English image prompt. Extract WHO, WHEN, WHERE, WHAT from the text. Style: simple children's book illustration, flat colors, no text, no letters. Max 25 words. Return ONLY the English prompt, NO Korean characters.`,
      messages:[{role:'user',content:text}]});
    _bookPendingText = text;
    await openPromptWorkshop(promptRaw.trim(), 4, '', 'book');
  }catch(e){
    toast('분석 실패: '+e.message);
    btn.disabled=false;btn.textContent='📖 이 내용으로 페이지 추가하기';
  }
}

/* ── 시화 (파스텔톤 프롬프트 추가) ── */
let currentPoemB64=null,currentPoemText='';
async function getSavedPoems(){ return (await lsGet(SK.poems(currentNick)))||[]; }
async function savePoem(){
  if(!currentPoemB64){toast('먼저 시화를 만들어주세요! 🌸');return;}
  const poems=await getSavedPoems();
  poems.unshift({imgB64:currentPoemB64,poemText:currentPoemText,dateLabel,createdAt:Date.now()});
  await lsSet(SK.poems(currentNick),poems.slice(0,30));
  toast('💾 시화 저장 완료!');
}
async function openPoemListModal(){
  const poems=await getSavedPoems(),el=$('poemListContent');
  if(!poems.length){el.innerHTML='<div class="empty-list">저장된 시화가 없어요</div>';$('poemListModal').classList.add('open');return;}
  el.innerHTML=poems.map((p,i)=>`
    <div class="story-list-item">
      <div style="display:flex;gap:10px;align-items:center;">
        ${p.imgB64?`<img src="${p.imgB64}" style="width:60px;height:45px;object-fit:cover;border-radius:6px;cursor:pointer;" onclick="loadPoem(${i})">`:''}
        <div style="flex:1;cursor:pointer;" onclick="loadPoem(${i})">
          <div class="story-list-title">🌸 ${p.dateLabel||''}</div>
          <div class="story-list-preview">${(p.poemText||'').split('\n')[0]}</div>
        </div>
        <button class="d-del" onclick="deletePoem(${i})">🗑️</button>
      </div>
    </div>`).join('');
  $('poemListModal').classList.add('open');
}
async function loadPoem(i){
  const poems=await getSavedPoems();
  const p=poems[i];if(!p)return;
  $('poemInput').value=p.poemText||'';
  currentPoemB64=p.imgB64;currentPoemText=p.poemText||'';
  if(p.imgB64){$('poemCanvas').src=p.imgB64;$('poemCanvas').style.display='block';$('pPlaceholder').style.display='none';}
  closeModal('poemListModal');toast('🌸 시화를 불러왔어요!');
}
async function deletePoem(i){
  if(!confirm('삭제할까요?'))return;
  const a=await getSavedPoems();a.splice(i,1);await lsSet(SK.poems(currentNick),a);
  await openPoemListModal();toast('삭제됐어요.');
}
function resetPoem(){if(!confirm('시화를 초기화할까요?'))return;$('poemInput').value='';if($('poemTitleInput'))$('poemTitleInput').value='';$('poemCanvas').style.display='none';$('pPlaceholder').style.display='flex';currentPoemB64=null;currentPoemText='';}

const PT={spring:{bg:'linear-gradient(160deg,#fff0f8,#ffe8f0)',ac:'#e88ab4',lc:'#f5c0d8'},summer:{bg:'linear-gradient(160deg,#e8f4ff,#d0edff)',ac:'#4a9fd4',lc:'#a0d4f0'},autumn:{bg:'linear-gradient(160deg,#fff8e8,#ffe8c8)',ac:'#e8823a',lc:'#f5c88a'},winter:{bg:'linear-gradient(160deg,#f0f4ff,#e0e8ff)',ac:'#6a7cd4',lc:'#b0c0f0'},night:{bg:'linear-gradient(160deg,#1a1a2e,#2d2b55)',ac:'#e0c060',lc:'#4a4a6a',dark:true},nature:{bg:'linear-gradient(160deg,#f0fff4,#d4f5e4)',ac:'#4ab87a',lc:'#98dbb8'}};
let pPT2;
function sPP(f,t,d){clearInterval(pPT2);const el=$('pProgressFill'),lb=$('pProgressLabel');const st=40,ms=d/st,sv=(t-f)/st;let c=f;pPT2=setInterval(()=>{c+=sv;if(c>=t){c=t;clearInterval(pPT2);}if(el)el.style.width=`${c}%`;if(lb)lb.textContent=`${Math.round(c)}%`;},ms);}

/* ── 시화 글자 크기 조정 ── */
let poemFontSize = 28; // 기본 28px
function adjustPoemFontSize(delta) {
  poemFontSize = Math.min(44, Math.max(16, poemFontSize + delta));
  const label = $('poemFontSizeLabel');
  if(label) label.textContent = poemFontSize + 'px';
  toast(`🔡 글자 크기: ${poemFontSize}px`);
}

async function createPoemArt(){
  const text=$('poemInput').value.trim();if(text.length<5){toast('시를 먼저 써주세요! 🌸');return;}
  // 사용자가 입력한 제목 먼저 확인
  const userTitle = ($('poemTitleInput')?.value||'').trim();
  const btn=$('pPaintBtn');btn.disabled=true;
  $('pLoading').style.display='flex';$('pPlaceholder').style.display='none';$('poemCanvas').style.display='none';
  sPP(0,50,5000);
  try{
    /* 파트 4 수정: 시화 AI 분석 영문화 + voca 추가 */
    const _isEnPoem = _currentLang === 'en';
    const raw=await callClaude({model:'claude-haiku-4-5-20251001',max_tokens:250,
      system:`Analyze the poem carefully. Extract the main subject/imagery/emotion to create a matching background image.
Return ONLY JSON format:
{
  "mood":"<spring/summer/autumn/winter/night/nature>",
  "scene":"<DALL-E background prompt 8-12 words reflecting poem's specific content. Soft watercolor, pastel, no text, no people.>",
  "title":"<${_isEnPoem ? 'English title max 5 words' : 'Korean title max 8 chars'}>",
  "feedback":"<${_isEnPoem ? 'English + Korean bilingual 1 sentence: praise one specific expression in the poem' : '한국어 1문장: 시에서 잘된 표현 1가지 칭찬'}>",
  "voca":"<${_isEnPoem ? '1-2 useful English words from your feedback: word (한국어뜻)' : '피드백에 쓴 영단어 1~2개: word (뜻)'}>"
}`,
      messages:[{role:'user',content:text}]});
    const a=parseJSON(raw)||{mood:'spring',scene:'cherry blossoms falling gentle breeze',title: _isEnPoem ? 'My Poem' : '나의 시',feedback:'',voca:''};
    // 사용자 직접 입력 제목이 있으면 우선 사용, 없으면 AI 생성 제목 사용
    const finalTitle = userTitle || a.title || '나의 시';
    const th=PT[a.mood]||PT.spring;const isDark=!!th.dark;
    
    if($('pLoadingMsg')) $('pLoadingMsg').textContent='배경 이미지 생성 중...';
    sPP(50,90,12000);
    // 시의 내용과 관련된 수채화/파스텔 배경 생성 (글자 없음)
    const bgB64=await generateDalle(
      `${a.scene}, soft pastel watercolor painting, gentle brushstrokes, dreamy atmosphere, translucent washes of color, Korean watercolor art style, no people, pure background only`,
      8
    );
    
    const tc=isDark?'#f0e8c0':'#2a1a0a';
    const lines=text.split('\n');
    const lineHeight=poemFontSize*1.8; 
    const headerH=90, footerH=40, padding=60;
    const contentH=lines.length*lineHeight+20;
    const totalH=Math.max(400, headerH+contentH+footerH+padding);

    const linesHtml=lines.map(l=>!l.trim()?`<div style="height:${Math.round(poemFontSize*0.5)}px;"></div>`
      :`<div style="display:flex;align-items:center;justify-content:center;margin-bottom:4px;">
          <span style="font-family:'NanumHyejun','Nanum Pen Script', cursive; font-size:${poemFontSize}px; font-weight:900; color:${tc}; line-height:1.7; text-shadow:${isDark?'0 0 8px rgba(255,240,180,.4)':'1px 1px 3px rgba(255,255,255,.8)'}; word-break:keep-all;">${l}</span>
        </div>`).join('');

    const rd=document.createElement('div');
    rd.style.cssText=`position:absolute; top:-10000px; left:0; width:660px; font-family:Jua,sans-serif; overflow:hidden; border-radius:20px; z-index:-1;`;
    rd.innerHTML=`<div style="position:relative;width:660px;min-height:${totalH}px;overflow:hidden;border-radius:20px;">
      <img src="${bgB64}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.48;">
      <div style="position:absolute;inset:0;background:${th.bg};opacity:0.62;"></div>
      <div style="position:absolute;top:0;left:0;right:0;height:5px;background:${th.ac};opacity:.7;"></div>
      <div style="position:absolute;top:0;left:0;bottom:0;width:4px;background:${th.ac};opacity:.5;"></div>
      <div style="position:relative;z-index:2;padding:22px 28px 18px 36px;display:flex;flex-direction:column;min-height:${totalH}px;box-sizing:border-box;">
        <div style="text-align:center;margin-bottom:10px;"><div style="display:inline-block;background:${th.ac};color:white;padding:4px 18px;border-radius:24px;font-size:18px;letter-spacing:2px;font-weight:bold;">${finalTitle}</div></div>
        <div style="text-align:center;margin-bottom:12px;font-family:'NanumHyejun','Nanum Pen Script', cursive; font-size:22px; font-weight:900; color:${isDark?'#c0a060':'#9a7040'};">✍️ ${currentNick}</div>
        <div style="width:100%;height:2px;background:${th.lc};margin-bottom:16px;border-radius:2px;"></div>
        <div style="flex:1;">${linesHtml}</div>
        <div style="display:flex;justify-content:flex-end;margin-top:10px;padding-top:8px;border-top:1px solid ${th.lc};font-size:10px;color:${isDark?'#a09060':'#aaa'};">${dateLabel}</div>
      </div>
    </div>`;
    document.body.appendChild(rd);
    
    // 폰트 로드 시도 (실패해도 캡처 계속 진행)
    await Promise.allSettled([document.fonts.load("900 20px 'NanumHyejun'")]);
    await sleep(600); 
    const canvas=await html2canvas(rd,{scale:2,useCORS:true,backgroundColor:null});
    document.body.removeChild(rd);
    
    clearInterval(pPT2);
    if($('pProgressFill')) $('pProgressFill').style.width='100%';
    if($('pProgressLabel')) $('pProgressLabel').textContent='완성!';
    await sleep(200);
    
    currentPoemB64=canvas.toDataURL('image/jpeg', 0.85);
    currentPoemText=text;
    $('pLoading').style.display='none';
    
    $('poemCanvas').src=currentPoemB64;
    $('poemCanvas').style.display='block';
    $('pPlaceholder').style.display='none';
    /* 파트 4: 시화 voca 미니 단어장 렌더링 */
    const poemVocaEl = document.getElementById('poemCoachVoca') || (() => {
      const el = document.createElement('div');
      el.id = 'poemCoachVoca';
      el.style.cssText = 'margin-top:8px;background:#f0f7ff;border-left:3px solid #4a90e2;padding:6px 10px;border-radius:8px;font-size:11px;color:#2a5a8a;word-break:keep-all;';
      const pPanel = document.querySelector('#jieumApp .p-panel');
      if (pPanel) pPanel.appendChild(el);
      return el;
    })();
    if (a.voca && a.voca.trim()) {
      poemVocaEl.innerHTML = `💡 <b>${_isEnPoem ? "Today's Words:" : "오늘의 단어:"}</b> ${a.voca}`;
      poemVocaEl.style.display = 'block';
    } else { poemVocaEl.style.display = 'none'; }

    const _fb = a.feedback || (_isEnPoem ? 'Great poem!' : '멋진 시예요!');
    toast(_isEnPoem ? `🌸 Poem Art done! "${_fb}"` : `🌸 시화 완성! "${_fb}"`);
  }catch(e){clearInterval(pPT2);$('pLoading').style.display='none';$('pPlaceholder').style.display='flex';toast('시화 실패: '+e.message);}
  btn.disabled=false;
}

async function initJieumData(){
  const books=await getAllBooks();
  if(books.length){
    const last=books[0];currentBookId=last.id;
    bookPages=(last.pages||[]).map(p=>({...p}));
  }else{bookPages=[];currentBookId=null;}
  renderBookViewer();
  const poems=await getSavedPoems();
  if(poems.length){
    currentPoemB64=poems[0].imgB64;currentPoemText=poems[0].poemText||'';
    if(currentPoemB64){$('poemCanvas').src=currentPoemB64;$('poemCanvas').style.display='block';$('pPlaceholder').style.display='none';}
  }
}


/* ════════════════════════════════════════════════════════
   📝 ESSAY BUILDER — 이음 앱 탭 2
════════════════════════════════════════════════════════ */

/* ── 1. 이음 탭 전환 ── */
