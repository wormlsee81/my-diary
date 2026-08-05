/* ============================================================
 * [뜨이음] 릴레이 동화 · 100분 토론
 * (분할 자동 생성 — 원본 index.html에서 추출, 로드 순서 유지 필수)
 *
 * [수정 이력] 2026-08-05
 *   ① 오타 "늘려야 연다" → "늘려야 한다"
 *   ② 한/영 토론 주제를 DEBATE_PAIRS 로 **쌍 구성**
 *      (이전에는 두 배열의 순서가 달라, 영어 모드의 "Korean meaning" 힌트가
 *       전혀 다른 주제를 보여 주었다)
 *   ③ 한/영 의미 반전 1건 정정 — 일기장 검사 주제가 영어에서는 부정문이었다
 *   ④ loadStory() 에서 탭 전환이 fullStory 를 비우던 버그
 *      (불러온 글이 화면에는 보이지만 이어 쓰거나 저장하면 사라졌다)
 *   ⑤ 방어 코드 — 요소가 없을 때의 오류, 힌트 버블 누적,
 *      redirect id 충돌, 저장 목록 미리보기 이스케이프
 * ============================================================ */
let fullStory='';
let ttieumMode = 'story'; 

/* ────────────────────────────────────────────────────────────
   토론 주제 50개 — 한국어와 영어를 **한 쌍으로** 묶어 둔다.

   ⚠️ 이전 판은 DEBATE_TOPICS 와 DEBATE_TOPICS_EN 이 별개 배열이라
      순서가 서로 달랐다. 그런데 drawDebateTopic() 은 같은 인덱스로
      짝지어 영어 주제 아래에 "Korean meaning" 을 보여 주었기 때문에,
      학생이 전혀 다른 뜻을 배우게 되는 문제가 있었다.
      (예: "Homework should be completely abolished." 아래에
            "학교 쉬는 시간을 10분에서 20분으로 늘려야 한다" 가 표시됨)
      → 쌍으로 묶어 구조적으로 어긋날 수 없게 했다.
   ──────────────────────────────────────────────────────────── */
const DEBATE_PAIRS = [
  { ko: '초등학생의 교내 화장을 허용해야 한다.',
    en: 'Elementary school students should be allowed to wear makeup at school.' },
  { ko: '초등학생도 머리 모양이나 염색을 자유롭게 할 수 있어야 한다.',
    en: 'Elementary students should be allowed to choose their own hairstyle.' },
  { ko: '학교 쉬는 시간을 10분에서 20분으로 늘려야 한다.',
    en: 'School break time should be extended from 10 minutes to 20 minutes.' },
  { ko: '학교 급식 메뉴를 학생들이 직접 투표로 정해야 한다.',
    en: 'School lunch menus should be decided by student vote.' },
  { ko: '초등학생 교복 착용을 의무화해야 한다.',
    en: 'Elementary school students should be required to wear uniforms.' },
  { ko: '학원 숙제를 법으로 금지해야 한다.',
    en: 'Homework from private academies should be banned by law.' },
  { ko: '체육 시간을 매일 1시간씩 배정해야 한다.',
    en: 'PE (physical education) class should be held every day for at least one hour.' },
  { ko: '방학 숙제를 완전히 없애야 한다.',
    en: 'Vacation homework should be completely abolished.' },
  { ko: '반장(회장) 제도를 없애고 모두가 돌아가며 리더를 해야 한다.',
    en: 'Class presidents should be abolished so everyone can take turns leading.' },
  { ko: '학교에 스마트폰을 가져와서 쉬는 시간에 자유롭게 쓰게 해야 한다.',
    en: 'Students should be allowed to use smartphones freely during breaks at school.' },
  { ko: '부모님이 자녀의 스마트폰 사용 시간을 제한하는 것은 정당하다.',
    en: 'Parents have the right to limit their child\'s screen time.' },
  { ko: '초등학생의 틱톡, 유튜브 쇼츠 등 \'숏폼\' 시청을 금지해야 한다.',
    en: 'TikTok and short video content should be banned for children.' },
  { ko: '유튜버(크리에이터)는 미래 유망하고 좋은 직업이다.',
    en: 'YouTubers and content creators are a promising career for the future.' },
  { ko: '종이책보다 스마트 패드(전자책)로 공부하는 것이 더 효율적이다.',
    en: 'Studying with e-books and tablets is more effective than paper books.' },
  { ko: '게임은 아이들의 학업 스트레스 해소에 큰 도움이 된다.',
    en: 'Video games are a good way for students to relieve academic stress.' },
  { ko: 'SNS(인스타그램, 페이스북 등) 가입 연령을 만 14세 이상으로 엄격히 제한해야 한다.',
    en: 'Social media platforms should ban users under the age of 14.' },
  { ko: '챗GPT 같은 AI(인공지능)를 이용해 숙제를 하는 것은 부정행위다.',
    en: 'Using AI like ChatGPT to do homework is a form of cheating.' },
  { ko: '폭력적인 게임을 많이 하면 실제 성격도 폭력적으로 변한다.',
    en: 'Violent video games make people more aggressive in real life.' },
  { ko: '부모님이 자녀의 카카오톡이나 일기장을 검사해도 된다.',
    en: 'Parents should be allowed to check their child\'s messages or diary.' },
  { ko: '유명 연예인이나 유튜버의 사생활은 보호받아야 한다.',
    en: 'Famous celebrities and YouTubers deserve privacy protection.' },
  { ko: '초등학생 고학년의 한 달 용돈으로 3만 원은 적당하다.',
    en: 'Thirty thousand won a month is a reasonable allowance for an upper-grade student.' },
  { ko: '집안일을 돕거나 심부름을 하면 반드시 용돈을 받아야 한다.',
    en: 'Children should be paid for doing household chores.' },
  { ko: '형제자매가 있는 것이 외동으로 크는 것보다 무조건 좋다.',
    en: 'Having siblings is always better than being an only child.' },
  { ko: '다른 사람을 기분 좋게 하는 \'하얀 거짓말(착한 거짓말)\'은 해도 된다.',
    en: 'A white lie told to make someone feel better is acceptable.' },
  { ko: '마라탕, 탕후루 등 자극적인 음식의 판매를 초등학생에게 제한해야 한다.',
    en: 'Selling spicy or sugary street food to elementary students should be restricted.' },
  { ko: '반려동물로 고양이보다 강아지가 더 좋다.',
    en: 'Dogs are better pets than cats.' },
  { ko: '어린이날 선물로는 물건보다 \'현금\'을 받는 것이 더 좋다.',
    en: 'Receiving cash is better than receiving gifts on Children\'s Day.' },
  { ko: '건강을 위해 편식하는 습관은 강제로라도 고쳐야 한다.',
    en: 'Picky eating habits should be forcibly corrected for health reasons.' },
  { ko: '선행이나 기부는 남몰래 해야 진짜 의미가 있다.',
    en: 'Good deeds and donations mean more when done secretly.' },
  { ko: '친구와 크게 싸웠을 때, 내가 먼저 사과하는 것이 이기는 것이다.',
    en: 'When you fight with a friend, the one who apologizes first is actually the winner.' },
  { ko: '평생 여름만 있는 나라에서 살기 vs 평생 겨울만 있는 나라에서 살기',
    en: 'Living in a country with only summer forever vs. only winter forever — which is better?' },
  { ko: '과거로 돌아갈 수 있는 초능력 vs 미래로 갈 수 있는 초능력',
    en: 'Superpower to go back in time vs. superpower to travel to the future — which would you choose?' },
  { ko: '동물과 대화할 수 있는 능력 vs 투명인간이 되는 능력',
    en: 'Ability to talk to animals vs. ability to become invisible — which is better?' },
  { ko: '평생 치킨만 먹고 살기 vs 평생 피자만 먹고 살기',
    en: 'Eating only fried chicken for life vs. eating only pizza for life — which do you prefer?' },
  { ko: '무인도에 갈 때 딱 하나 가져간다면? 평생 안 끊기는 스마트폰 1개 vs 가장 친한 친구 1명',
    en: 'Stranded on a desert island: take one phone with unlimited battery or bring your best friend?' },
  { ko: '100억 부자이지만 친구가 0명 vs 평범한 재산이지만 절친이 100명',
    en: 'Be extremely rich but have zero friends vs. be average but have 100 close friends?' },
  { ko: '공부를 안 해도 무조건 시험 100점 맞는 약 vs 먹으면 키가 10cm 크는 약',
    en: 'A pill that guarantees 100% on every test vs. a pill that makes you grow 10 cm taller?' },
  { ko: '평생 양치 안 하기 vs 평생 샤워 안 하기',
    en: 'Never brush your teeth for life vs. never take a shower for life?' },
  { ko: '모기 10마리 있는 방에서 자기 vs 바퀴벌레 1마리 있는 방에서 자기',
    en: 'Sleep in a room with 10 mosquitoes vs. sleep in a room with 1 cockroach?' },
  { ko: '외계인은 우리 주변에 이미 존재한다.',
    en: 'Aliens already exist among us.' },
  { ko: '동물의 권리를 위해 동물원을 없애야 한다.',
    en: 'Zoos should be abolished to protect animal rights.' },
  { ko: '길고양이에게 먹이를 주는 것을 법으로 금지해야 한다.',
    en: 'Feeding stray cats should be banned by law.' },
  { ko: '환경 보호를 위해 카페나 식당에서 플라스틱 사용을 전면 금지해야 한다.',
    en: 'Plastic use should be completely banned in cafes and restaurants.' },
  { ko: '노키즈존(어린이 출입 금지 구역)을 만드는 것은 어린이에 대한 차별이다.',
    en: 'No-kids zones in restaurants are a form of discrimination against children.' },
  { ko: '로봇과 인공지능(AI)의 발달은 인간의 일자리를 빼앗는 재앙이 될 것이다.',
    en: 'The development of robots and AI is a disaster that will steal human jobs.' },
  { ko: '우주 개발(화성 탐사 등)보다 훼손된 지구 환경을 복구하는 데 돈을 먼저 써야 한다.',
    en: 'We should spend money on fixing Earth\'s environment before exploring space.' },
  { ko: '만약 타임머신이 발명된다면, 역사가 바뀔 위험이 있더라도 사용을 허락해야 한다.',
    en: 'If a time machine were invented, it should be allowed even if history could change.' },
  { ko: '모든 반려견은 산책할 때 입마개를 의무적으로 해야 한다.',
    en: 'All pet dogs should be required to wear a muzzle when walking outside.' },
  { ko: '1회용품을 많이 쓰는 사람에게 환경 세금을 더 거둬야 한다.',
    en: 'People who use too many disposable products should pay an extra environmental tax.' },
  { ko: '착한 일을 한 사람에게는 국가에서 돈으로 보상을 해줘야 한다.',
    en: 'Acts of kindness should be rewarded with money by the government.' },
];

/* 기존 코드 호환용 — 두 배열은 항상 같은 순서를 유지한다 */
const DEBATE_TOPICS    = DEBATE_PAIRS.map(function (p) { return p.ko; });
const DEBATE_TOPICS_EN = DEBATE_PAIRS.map(function (p) { return p.en; });

function switchTtieumTab(tab) {
  ttieumMode = tab;
  const tabS = $('tabTtieumStory'), tabD = $('tabTtieumDebate'), btnT = $('btnDebateTopic');
  if (tabS) { tabS.style.color = tab==='story'?'white':'#d0c4ff';
              tabS.style.borderBottomColor = tab==='story'?'white':'transparent'; }
  if (tabD) { tabD.style.color = tab==='debate'?'white':'#d0c4ff';
              tabD.style.borderBottomColor = tab==='debate'?'white':'transparent'; }
  if (btnT) btnT.style.display = tab==='debate'?'inline-block':'none';
  const goalBadge=$('ttieumGoalBadge');
  if(goalBadge) {
    if (_currentLang === 'en') {
      goalBadge.textContent = tab==='story'
        ? '💡 Your story — AI helps with questions'
        : '💡 Build your argument logically!';
    } else {
      goalBadge.textContent = tab==='story'
        ? '💡 이야기는 내가 써요 — AI는 질문으로 도와줘요'
        : '💡 내 주장을 논리적으로 펼쳐보세요';
    }
  }
  resetStory();
}

function drawDebateTopic() {
  const pair = DEBATE_PAIRS[Math.floor(Math.random() * DEBATE_PAIRS.length)];
  const input = $('storyInput');
  if (!input) return;

  if (_currentLang === 'en') {
    input.value = `[Debate Topic]: ${pair.en}\nMy argument: `;
    /* 영어 주제 아래에 **짝이 맞는** 한국어 뜻을 힌트로 보여 준다 */
    const chatBox = $('chatBox');
    if (chatBox) {
      /* 이전 힌트는 지워서 쌓이지 않게 한다 */
      chatBox.querySelectorAll('.debate-topic-hint').forEach(function (el) { el.remove(); });
      const hint = document.createElement('div');
      hint.className = 'bubble system debate-topic-hint';
      hint.style.cssText = 'font-size:11px;color:#888;background:#f5f0ff;' +
        'border:1px dashed var(--purple);border-radius:10px;padding:6px 10px;margin-top:4px;';
      const label = (typeof escHtml === 'function') ? escHtml(pair.ko) : pair.ko;
      hint.innerHTML = '📌 <span style="color:#8a7ce8;font-weight:bold;">Korean meaning:</span> ' + label;
      chatBox.appendChild(hint);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  } else {
    input.value = `[토론 주제]: ${pair.ko}\n나의 주장: `;
  }
  input.focus();
}

async function getStoredStories(){ return (await lsGet(SK.stories(currentNick)))||[]; }
function resetStory(){
  fullStory='';const box=$('chatBox');if(!box)return;box.innerHTML='';
  if (_currentLang === 'en') {
    const intro = ttieumMode === 'story'
      ? '📝 <b>Your story, your words!</b><br>AI will help you with questions.<br>Write the first scene of your story! ✨<br><span style="font-size:11px;color:#888;">e.g. One day, a magical rabbit found a mysterious box in the forest...</span>'
      : 'Welcome to the <b>AI Debate Arena</b>!<br>Click [Pick Topic] or type your own argument freely. ⚖️';
    addBubble(intro,'system');
  } else {
    const intro = ttieumMode === 'story' 
      ? '📝 <b>이야기는 네가 써!</b><br>AI는 질문으로 도와줄게요.<br>먼저 이야기 첫 장면을 직접 써볼까요? ✨<br><span style="font-size:11px;color:#888;">예) 어느 날 마법사 토끼가 숲 속에서 이상한 상자를 발견했어...</span>' 
      : 'AI와의 100분 토론에 오신 것을 환영합니다!<br>[주제 뽑기]를 누르거나 자유롭게 주장을 펼쳐보세요. ⚖️';
    addBubble(intro,'system');
  }
}
async function saveStory(){
  if(!fullStory.trim()){toast(_currentLang==='en'?'Nothing to save yet!':'저장할 내용이 없어요!');return;}
  const stories=await getStoredStories();
  const preview=fullStory.replace(/\[학생\]:\s*|\[AI\]:\s*|\[수정 지시\]:\s*/g,'').trim().substring(0,40);
  const id=`story_${Date.now()}`;
  stories.unshift({id,preview,content:fullStory,mode:ttieumMode,dateLabel,createdAt:Date.now()});
  await lsSet(SK.stories(currentNick),stories.slice(0,20));
  toast(_currentLang==='en'?'💾 Saved! (student + AI responses included)':'💾 저장 완료! (학생+AI 내용 모두 저장됨)');
}

async function openStoryListModal(){
  const stories=await getStoredStories(),el=$('storyListContent');
  if(!stories.length){
    el.innerHTML=`<div class="empty-list">${_currentLang==='en'?'No saved stories or debates yet':'저장된 이야기나 토론이 없어요'}</div>`;
    $('storyListModal').classList.add('open');return;
  }
  el.innerHTML=stories.map(s=>{
    const modeIcon = _currentLang==='en'
      ? (s.mode==='debate' ? '⚖️ Debate' : '📚 Story')
      : (s.mode==='debate' ? '⚖️ 토론'  : '📚 동화');
    const aiLines = (s.content||'').split('\n').filter(l=>l.startsWith('[AI]:')).length;
    const aiLabel = _currentLang==='en' ? `AI ${aiLines} replies` : `AI ${aiLines}회 응답`;
    return `
    <div class="story-list-item">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="flex:1;" onclick="loadStory('${s.id}')">
          <div class="story-list-title">${modeIcon} ${s.dateLabel||''} <span style="font-size:10px;color:#aaa;font-weight:normal;">${aiLabel}</span></div>
          <div class="story-list-preview">${(typeof escHtml==='function'?escHtml(s.preview||''):(s.preview||''))}...</div>
        </div>
        <button class="d-del" onclick="deleteStory('${s.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
  $('storyListModal').classList.add('open');
}

async function loadStory(id){
  const s=(await getStoredStories()).find(x=>x.id===id);if(!s)return;
  /* ⚠️ switchTtieumTab() 은 내부에서 resetStory() 를 불러 fullStory 를 비운다.
     따라서 **탭을 먼저 바꾼 뒤에** 내용을 넣어야 한다.
     (이전 판은 순서가 반대여서 불러온 글이 곧바로 지워졌다) */
  if(s.mode && s.mode !== ttieumMode) switchTtieumTab(s.mode);
  fullStory=s.content;
  const box=$('chatBox');if(!box)return;box.innerHTML='';
  addBubble(_currentLang==='en'
    ? `"${s.dateLabel}" record loaded! Continue where you left off 📖`
    : `"${s.dateLabel}" 기록을 불러왔어요! 이어서 진행해보세요 📖`,'system');
  const lines=s.content.split('\n').filter(l=>l.trim());
  for(const line of lines){
    if(line.startsWith('[학생]:'))addBubble(line.replace('[학생]:','').trim(),'user');
    else if(line.startsWith('[AI]:'))addBubble(line.replace('[AI]:','').trim(),'ai');
    else if(line.startsWith('[수정 지시]:'))addBubble(line,'system');
  }
  closeModal('storyListModal');toast(_currentLang==='en'?'📖 Loaded!':'📖 불러왔어요!');
}

async function deleteStory(id){
  if(!confirm(_currentLang==='en'?'Delete this entry?':'삭제할까요?'))return;
  const a=(await getStoredStories()).filter(s=>s.id!==id);await lsSet(SK.stories(currentNick),a);
  await openStoryListModal();toast(_currentLang==='en'?'Deleted.':'삭제됐어요.');
}

let _wgRedirectSeq = 0;   /* 같은 밀리초에 두 번 불려도 id가 겹치지 않게 */

function addBubble(text, sender, isRedirectable=false) {
  const box=$('chatBox');
  if(!box) return;                      /* 화면이 없으면 조용히 건너뛴다 */
  const b=document.createElement('div');
  b.className=`bubble ${sender}`;
  
  // 마크다운 기본 변환 (# 헤더, ** 볼드, 줄바꿈)
  let f = text
    .replace(/^#{1,3}\s+(.+)$/gm, '<b>$1</b>')   // # 헤더 → 볼드
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')        // **볼드**
    .replace(/\n---\n/g, '<hr style="border:none;border-top:1px dashed #c9b8ff;margin:8px 0;">')  // --- 구분선
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px dashed #c9b8ff;margin:8px 0;">')   // --- 단독 줄
    .replace(/(⚔️\s*AI\s*반박:|⚔️\s*AI\s*Rebuttal:)/g, '<span style="color:#e55;font-weight:bold;">$1</span>')  // 반박 레이블 강조
    .replace(/(💡\s*네\s*차례:|💡\s*Your\s*turn:)/g, '<span style="color:#8a7ce8;font-weight:bold;">$1</span>')  // 네 차례 레이블
    .replace(/(🔥\s*잘한\s*점:|🔥\s*Great\s*point:)/g, '<span style="color:#f49f5a;font-weight:bold;">$1</span>')  // 칭찬 레이블
    .replace(/(🤔\s*더\s*필요한\s*부분:|🤔\s*What\'s\s*missing:)/g, '<span style="color:#62b3a4;font-weight:bold;">$1</span>')  // 부족 레이블
    .replace(/(❓\s*생각해볼\s*질문:|❓\s*Think\s*about\s*this:)/g, '<span style="color:#4a90e2;font-weight:bold;">$1</span>')  // 질문 레이블
    .replace(/\n/g, '<br>');
  
  // AI 말풍선: 마지막 질문 문장만 하이라이트 (안전한 방식)
  if(sender==='ai' && text.includes('?')){
    // <br>로 분리된 마지막 문단 찾기
    const parts = f.split('<br>');
    let lastQIdx = -1;
    for(let i = parts.length-1; i >= 0; i--){
      if(parts[i].includes('?') && parts[i].trim()){
        lastQIdx = i;
        break;
      }
    }
    if(lastQIdx >= 0 && lastQIdx === parts.length - 1){
      // 마지막 줄이 질문인 경우만 하이라이트
      parts[lastQIdx] = `<span class="question-highlight">💡 ${parts[lastQIdx].trim()}</span>`;
      f = parts.join('<br>');
    }
  }
  
  b.innerHTML=f;
  box.appendChild(b);

  // AI 말풍선에 '방향 틀기' 버튼 추가
  if(sender==='ai' && isRedirectable) {
    const redirectId = 'redirect_' + Date.now() + '_' + (++_wgRedirectSeq);
    const redirectDiv = document.createElement('div');
    redirectDiv.className = 'ai-redirect-area';
    redirectDiv.innerHTML = `<button class="ai-redirect-btn" onclick="toggleRedirectInput('${redirectId}', this)">${_currentLang==='en' ? '🔄 Edit AI response' : '🔄 AI 대답 고치기'}</button>`;
    box.appendChild(redirectDiv);

    const inputDiv = document.createElement('div');
    inputDiv.className = 'redirect-input-box';
    inputDiv.id = redirectId;
    inputDiv.style.display = 'none';
    if (_currentLang === 'en') {
      inputDiv.innerHTML = `
        <div style="font-size:11px;color:var(--purple);font-weight:bold;">Did AI respond differently than you expected? Tell AI how to change its response!</div>
        <div class="redirect-input-row">
          <input class="redirect-input" placeholder="e.g. Make the hero fight bravely instead of running away" id="ri_${redirectId}">
          <button class="redirect-send-btn" onclick="sendRedirectInstruction('${redirectId}')">Redirect</button>
        </div>`;
    } else {
      inputDiv.innerHTML = `
        <div style="font-size:11px;color:var(--purple);font-weight:bold;">AI가 내 생각과 다르게 말했나요? AI에게 어떻게 고쳐달라고 할지 명령을 내려보세요!</div>
        <div class="redirect-input-row">
          <input class="redirect-input" placeholder="예) 주인공이 도망가지 말고 용감하게 싸우게 해줘" id="ri_${redirectId}">
          <button class="redirect-send-btn" onclick="sendRedirectInstruction('${redirectId}')">지시하기</button>
        </div>`;
    }
    box.appendChild(inputDiv);
    // 이전 redirect 버튼들은 숨기기
    document.querySelectorAll('.ai-redirect-area').forEach((el, idx, arr) => {
      if (el !== redirectDiv) el.style.display = 'none';
    });
  }

  box.scrollTop=box.scrollHeight;
}

function toggleRedirectInput(id, btn) {
  const el=$(id);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
  btn.textContent = isOpen ? (_currentLang==='en' ? '🔄 Edit AI response' : '🔄 AI 대답 고치기') : '✕ ' + (_currentLang==='en' ? 'Close' : '닫기');
  if (!isOpen) $(`ri_${id}`)?.focus();
}

async function sendRedirectInstruction(id) {
  const inputEl = $(`ri_${id}`);
  const instruction = inputEl?.value.trim();
  if (!instruction) { toast(_currentLang==='en' ? 'Please enter your instruction!' : '지시를 입력해주세요!'); return; }

  const box = $('chatBox');
  if (!box) return;
  const bubbles = box.querySelectorAll('.bubble.ai');
  const lastAiBubble = bubbles[bubbles.length - 1];
  const redirectAreas = box.querySelectorAll('.ai-redirect-area, .redirect-input-box');
  redirectAreas.forEach(el => el.remove());
  if (lastAiBubble) lastAiBubble.remove();

  const lines = fullStory.split('\n');
  const lastAiIdx = lines.map(l=>l.startsWith('[AI]:')).lastIndexOf(true);
  if (lastAiIdx !== -1) lines.splice(lastAiIdx, 1);
  fullStory = lines.join('\n');

  addBubble(`🔄 [Redirect]: ${instruction}`, 'system');
  fullStory += `\n[수정 지시]: ${instruction}`;

  const btn = $('storySendBtn');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }
  const lid = 'l' + Date.now();
  box.insertAdjacentHTML('beforeend', `<div class="bubble ai" id="${lid}">${_currentLang==='en' ? 'Thinking again... 💭' : '다시 생각 중... 💭'}</div>`);
  box.scrollTop = box.scrollHeight;

  let sysPrompt;
  if (_currentLang === 'en') {
    sysPrompt = ttieumMode === 'story'
      ? `You are a friendly story companion helping an elementary school student write a relay story in English.

📌 Relay Story Rules:
1. Briefly praise ONE good expression from the student's writing (1 sentence).
2. Continue the story with 2-3 sentences, naturally connecting to what the student wrote. Add a new event or character action to move the story forward.
3. At the end of your continuation, create a cliffhanger moment so the student can write next.
4. End by handing it back: "What happens next? You write it!" (or similar).
5. Keep the entire response within 5-6 sentences.
6. If the student gives a redirect instruction, incorporate it in your rewrite.`
      : `You are a friendly and logical debate coach running a "100-Minute Debate" with an elementary school student in English.

📌 Debate Coaching Rubric — analyze the student's writing each time using these 3 criteria:
① Claim: Is the student's main point clearly stated in one sentence?
② Reason: Is there an explanation for why they think so?
③ Evidence: Is there specific support such as experience, facts, or examples?

📌 Response order (always follow this order):
1. Specifically praise the criterion the student did well on (1 sentence). Label: "🔥 Great point:"
2. Point out ONE missing part clearly (1 sentence). Label: "🤔 What's missing:"
3. Guide the student to fill the gap themselves with a question (1 sentence). Label: "❓ Think about this:"
4. Add a "---" divider, then write a logical AI counterargument (1-2 sentences) from the opposing side. Simple language. Label: "⚔️ AI Rebuttal:"
5. End by inviting the student to respond. Label: "💡 Your turn:"
6. Keep the entire response within 6-8 sentences.
If the student gives a redirect instruction, incorporate it in your re-analysis.

⚠️ Important: Do NOT give the answer directly or complete the logic for the student.`;
  } else {
    sysPrompt = ttieumMode === 'story'
      ? `너는 초등학생과 함께 릴레이 동화를 쓰는 다정한 이야기 친구야.

📌 릴레이 동화 규칙:
1. 학생이 쓴 내용에서 잘된 표현 1가지를 짧게 칭찬해줘 (1문장).
2. 이야기를 2~3문장 직접 이어 써줘. 반드시 학생이 쓴 내용과 자연스럽게 연결되어야 해. 새로운 사건이나 인물의 행동을 추가해서 이야기가 앞으로 나아가게 해줘.
3. 이어 쓴 내용 마지막에, 학생이 다음을 쓸 수 있도록 이야기가 멈추는 순간을 만들어줘.
4. 마지막에 학생에게 "다음엔 어떻게 될까? 네가 이어 써봐!" 처럼 짧게 넘겨줘.
5. 전체 답변은 5~6문장 이내로.
6. 학생의 수정 지시가 있으면 그것을 반드시 반영해서 이야기를 다시 이어 써줘.`
      : `너는 초등학생과 '100분 토론'을 진행하는 다정하고 논리적인 토론 코치야.

📌 토론 코칭 루브릭 — 학생의 글을 매번 다음 3가지 기준으로 분석해:
① 주장: 학생이 말하고 싶은 것이 한 문장으로 명확하게 드러나는가?
② 이유: 왜 그렇게 생각하는지 설명이 제시되어 있는가?
③ 근거: 경험, 사실, 예시 등 구체적인 뒷받침이 있는가?

📌 답변 순서 (반드시 이 순서로):
1. 세 기준 중 학생이 잘 갖춘 부분을 먼저 구체적으로 칭찬해줘 (1문장). 앞에 "🔥 잘한 점:" 레이블 붙이기.
2. 부족한 부분 1가지를 콕 찍어 "주장/이유/근거 중 ○○이 조금 더 필요해"처럼 명확하게 알려줘 (1문장). 앞에 "🤔 더 필요한 부분:" 레이블 붙이기.
3. 부족한 부분을 스스로 보완할 수 있도록 발문으로 유도해줘 (1문장). 앞에 "❓ 생각해볼 질문:" 레이블 붙이기.
4. "---" 구분선을 넣은 뒤, AI 반박을 추가해. 학생의 주장에 반대하는 입장에서 논리적인 반박 1~2문장을 써줘. 앞에 "⚔️ AI 반박:" 레이블 붙이기. 단, 초등학생 수준에서 이해할 수 있는 쉬운 말로.
5. 마지막에 학생이 AI 반박에 다시 반박할 수 있도록 짧게 넘겨줘. 앞에 "💡 네 차례:" 레이블 붙이기.
6. 전체 답변은 6~8문장 이내로.
학생의 수정 지시가 있으면 그것을 반드시 반영해서 다시 분석해.

⚠️ 주의: 정답을 직접 알려주거나 학생 대신 논리를 완성하지 마. 스스로 생각하게 유도하는 것이 목표야.`;
  }

  try {
    const t = await callClaude({ model: 'claude-haiku-4-5-20251001', max_tokens: 550,
      system: sysPrompt, messages: [{ role: 'user', content: `So far:\n${fullStory}\n\nAI:` }] });
    $(lid)?.remove();
    addBubble(t, 'ai', true);
    fullStory += `\n[AI]: ${t}`;
  } catch {
    $(lid)?.remove();
    addBubble(_currentLang==='en' ? 'Error! Please try again. 😢' : '오류! 다시 시도해줘. 😢', 'system');
  }
  if (btn) { btn.disabled = false; btn.textContent = _currentLang==='en' ? 'Send' : '전송'; }
}

async function sendStory(){
  const input=$('storyInput'),text=input.value.trim(),btn=$('storySendBtn');if(!text)return;
  // ⑤ 비속어 필터
  if(!checkProfanity(text,'입력창')) return;
  addBubble(text,'user');fullStory+=`\n[학생]: ${text}`;input.value='';btn.disabled=true;btn.textContent='...';
  const lid='l'+Date.now();$('chatBox').insertAdjacentHTML('beforeend',`<div class="bubble ai" id="${lid}">${_currentLang==='en' ? 'Thinking... 💭' : '생각 중... 💭'}</div>`);$('chatBox').scrollTop=$('chatBox').scrollHeight;
  
  let sysPrompt;
  if (_currentLang === 'en') {
    sysPrompt = ttieumMode === 'story'
      ? `You are a friendly story companion helping an elementary school student write a relay story in English.

📌 Relay Story Rules:
1. Briefly praise ONE good expression from the student's writing (1 sentence).
2. Continue the story with 2-3 sentences, naturally connecting to what the student wrote. Add a new event or character action to move the story forward.
3. At the end of your continuation, create a cliffhanger moment (e.g., a door opened, someone appeared) so the student can write next.
4. End by handing it back: "What happens next? You write it!" (or similar).
5. Keep the entire response within 5-6 sentences.

⚠️ Important: Don't advance the story too far. Leave plenty of room for the student to write.`
      : `You are a friendly and logical debate coach running a "100-Minute Debate" with an elementary school student in English.

📌 Debate Coaching Rubric — analyze the student's writing each time using these 3 criteria:
① Claim: Is the student's main point clearly stated in one sentence?
② Reason: Is there an explanation for why they think so?
③ Evidence: Is there specific support such as experience, facts, or examples?

📌 Response order (always follow this order):
1. Specifically praise the criterion the student did well on (1 sentence). Label: "🔥 Great point:"
2. Point out ONE missing part clearly, e.g. "Your claim/reason/evidence needs a little more work." (1 sentence). Label: "🤔 What's missing:"
3. Guide the student to fill the gap themselves with a question (1 sentence). Label: "❓ Think about this:"
4. Add a "---" divider, then write a logical AI counterargument (1-2 sentences) from the opposing side. Use simple language an elementary student can understand. Label: "⚔️ AI Rebuttal:"
5. End by inviting the student to respond to the rebuttal. e.g. "How would you argue back? Give it a try! 💪" Label: "💡 Your turn:"
6. Keep the entire response within 6-8 sentences.

⚠️ Important: Do NOT give the answer directly or complete the logic for the student. The goal is to guide them to think for themselves.`;
  } else {
    sysPrompt = ttieumMode === 'story' 
      ? `너는 초등학생과 함께 릴레이 동화를 쓰는 다정한 이야기 친구야.

📌 릴레이 동화 규칙:
1. 학생이 쓴 내용에서 잘된 표현 1가지를 짧게 칭찬해줘 (1문장).
2. 이야기를 2~3문장 직접 이어 써줘. 반드시 학생이 쓴 내용과 자연스럽게 연결되어야 해. 새로운 사건이나 인물의 행동을 추가해서 이야기가 앞으로 나아가게 해줘.
3. 이어 쓴 내용 마지막에, 학생이 다음을 쓸 수 있도록 이야기가 멈추는 순간을 만들어줘 (예: 문이 열렸다, 누군가가 나타났다 등).
4. 마지막에 학생에게 "다음엔 어떻게 될까? 네가 이어 써봐!" 처럼 짧게 넘겨줘.
5. 전체 답변은 5~6문장 이내로.

⚠️ 주의: 이야기를 너무 많이 진행하지 마. 학생이 쓸 여지를 충분히 남겨둬.`
      : `너는 초등학생과 '100분 토론'을 진행하는 다정하고 논리적인 토론 코치야.

📌 토론 코칭 루브릭 — 학생의 글을 매번 다음 3가지 기준으로 분석해:
① 주장: 학생이 말하고 싶은 것이 한 문장으로 명확하게 드러나는가?
② 이유: 왜 그렇게 생각하는지 설명이 제시되어 있는가?
③ 근거: 경험, 사실, 예시 등 구체적인 뒷받침이 있는가?

📌 답변 순서 (반드시 이 순서로):
1. 세 기준 중 학생이 잘 갖춘 부분을 먼저 구체적으로 칭찬해줘 (1문장). 앞에 "🔥 잘한 점:" 레이블 붙이기.
2. 부족한 부분 1가지를 콕 찍어 "주장/이유/근거 중 ○○이 조금 더 필요해"처럼 명확하게 알려줘 (1문장). 앞에 "🤔 더 필요한 부분:" 레이블 붙이기.
3. 부족한 부분을 스스로 보완할 수 있도록 발문으로 유도해줘 (1문장). 앞에 "❓ 생각해볼 질문:" 레이블 붙이기.
4. "---" 구분선을 넣은 뒤, AI 반박을 추가해. 학생의 주장에 반대하는 입장에서 논리적인 반박 1~2문장을 써줘. 앞에 "⚔️ AI 반박:" 레이블 붙이기. 단, 초등학생 수준에서 이해할 수 있는 쉬운 말로.
5. 마지막에 학생이 AI 반박에 다시 반박할 수 있도록 짧게 넘겨줘. 예: "이 반박에 어떻게 답할 수 있을까? 다시 도전해봐! 💪" 앞에 "💡 네 차례:" 레이블 붙이기.
6. 전체 답변은 6~8문장 이내로.

⚠️ 주의: 정답을 직접 알려주거나 학생 대신 논리를 완성하지 마. 스스로 생각하게 유도하는 것이 목표야.`;
  }

  try{
    const t=await callClaude({model:'claude-haiku-4-5-20251001',max_tokens:550,
      system:sysPrompt, messages:[{role:'user',content:`So far:\n${fullStory}\n\nAI:`}]});
    document.getElementById(lid)?.remove();
    addBubble(t,'ai', true);  // isRedirectable=true
    fullStory+=`\n[AI]: ${t}`;
  }catch{document.getElementById(lid)?.remove();addBubble(_currentLang==='en'?'Error! Please try again. 😢':'오류! 다시 시도해줘. 😢','system');}
  btn.disabled=false;btn.textContent=_currentLang==='en'?'Send':'전송';input.focus();
}

