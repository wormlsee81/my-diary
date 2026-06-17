/* ============================================================
 * 다국어(한국어/영어) 전환 — setLang()
 * (분할 자동 생성 — 원본 index.html에서 추출, 로드 순서 유지 필수)
 * ============================================================ */
let _currentLang = 'ko';
const LANG_CONTENT = {
  ko: {
    logo: '💡', title: '지음 프로젝트',
    desc: 'AI와 함께 상상력을 키우고 나만의 책을 완성해요!',
    nickLabel: '내 이름:', nickPlaceholder: '이름을 입력해주세요',
    confirmBtn: '확인 ✓',
    ieumTabDiary: '📖 그림일기', ieumTabEssay: '📝 Essay Builder',
  },
  en: {
    logo: '🌟', title: 'English Adventure!',
    desc: 'Go on an exciting English adventure with AI! 🚀',
    nickLabel: 'My Name:', nickPlaceholder: 'Enter your name',
    confirmBtn: 'Start ✓',
    ieumTabDiary: '✍️ Guided Writing', ieumTabEssay: '📝 Essay Builder',
  }
};

function setLang(lang) {
  _currentLang = lang;
  document.getElementById('langKo').classList.toggle('active', lang === 'ko');
  document.getElementById('langEn').classList.toggle('active', lang === 'en');
  const c = LANG_CONTENT[lang];
  const logoEl = document.getElementById('homeLogo'); if(logoEl) logoEl.textContent = c.logo;
  const titleEl = document.getElementById('homeTitle'); if(titleEl) titleEl.textContent = c.title;
  const descEl = document.getElementById('homeDesc'); if(descEl) descEl.textContent = c.desc;
  const nickLabelEl = document.getElementById('homeNickLabel'); if(nickLabelEl) nickLabelEl.textContent = c.nickLabel;
  const nickInput = document.getElementById('nickInput'); if(nickInput) nickInput.placeholder = c.nickPlaceholder;
  const confirmBtn = document.querySelector('.nick-confirm-btn'); if(confirmBtn) confirmBtn.textContent = c.confirmBtn;
  const gridKo = document.getElementById('appGridKo');
  const gridEn = document.getElementById('appGridEn');
  if(gridKo) gridKo.style.display = lang === 'ko' ? 'grid' : 'none';
  if(gridEn) gridEn.style.display = lang === 'en' ? 'grid' : 'none';
  const tabDiary = document.getElementById('ieumTab_diary');
  const tabEssay = document.getElementById('ieumTab_essay');
  if(tabDiary) tabDiary.textContent = c.ieumTabDiary;
  if(tabEssay) tabEssay.textContent = c.ieumTabEssay;

  // ── Essay Builder 탭: 한국어일 때 숨김, 영어일 때만 표시 ──
  if(tabEssay) tabEssay.style.display = lang === 'en' ? '' : 'none';
  // 한국어로 전환 시 Essay 탭이 활성화되어 있으면 diary 탭으로 강제 전환
  if(lang === 'ko' && typeof _currentIeumTab !== 'undefined' && _currentIeumTab === 'essay') {
    switchIeumTab('diary');
  }

  // Update Essay Builder UI for the selected language
  const essayTopicBox = document.getElementById('essayTopicBox');
  if(essayTopicBox && !_currentEssayTopic) {
    essayTopicBox.textContent = lang==='en' ? 'Pick a topic! 🎲' : '주제를 뽑아주세요! 🎲';
  }
  const essayChips = document.getElementById('essayChips');
  if(essayChips && !_currentEssayTopic) {
    essayChips.innerHTML = `<span style="color:#ccc;font-size:13px;">${lang==='en' ? 'Pick a topic to see recommended words & connectors ✨' : '주제를 뽑으면 추천 단어/문법이 나타나요 ✨'}</span>`;
  }
  // Update Essay Builder guide panel labels
  const guideTitle = document.getElementById('essayGuideTitle');
  if(guideTitle) guideTitle.textContent = lang==='en' ? '[ 📋 Essay Guide ]' : '[ 📋 에세이 가이드 ]';
  const essayStructureTitle = document.getElementById('essayStructureTitle');
  if(essayStructureTitle) essayStructureTitle.innerHTML = lang==='en' ? '🍔 Hamburger Essay Structure' : '🍔 햄버거 에세이 구조';
  // Update Essay Builder intro structure labels
  const essayIntroLabel = document.getElementById('essayIntroLabel');
  if(essayIntroLabel) essayIntroLabel.innerHTML = lang==='en' ? '<b>🍞 Intro</b> — Your opinion/claim' : '<b>🍞 Intro (서론)</b> — 나의 의견/주장 문장';
  const essayBody1Label = document.getElementById('essayBody1Label');
  if(essayBody1Label) essayBody1Label.innerHTML = lang==='en' ? '<b>🥩 Body 1</b> — 1st reason + example' : '<b>🥩 Body 1</b> — 첫 번째 이유 + 예시';
  const essayBody2Label = document.getElementById('essayBody2Label');
  if(essayBody2Label) essayBody2Label.innerHTML = lang==='en' ? '<b>🥩 Body 2</b> — 2nd reason + example' : '<b>🥩 Body 2</b> — 두 번째 이유 + 예시';
  const essayConcLabel = document.getElementById('essayConcLabel');
  if(essayConcLabel) essayConcLabel.innerHTML = lang==='en' ? '<b>🍞 Conclusion</b> — Restate opinion' : '<b>🍞 Conclusion (결론)</b> — 의견 재확인';
  const essayConnLabel = document.getElementById('essayConnLabel');
  if(essayConnLabel) essayConnLabel.textContent = lang==='en' ? '🔗 Useful connectors (click to insert):' : '🔗 유용한 접속사 (클릭하면 삽입):';
  const essaySavedLabel = document.getElementById('essaySavedLabel');
  if(essaySavedLabel) essaySavedLabel.textContent = lang==='en' ? '📚 Saved essays:' : '📚 저장된 에세이:';

  // Update ttieum tab labels
  const tabStory = document.getElementById('tabTtieumStory');
  const tabDebate = document.getElementById('tabTtieumDebate');
  if(tabStory) tabStory.textContent = lang==='en' ? '📚 AI Roleplay' : '📚 릴레이 동화';
  if(tabDebate) tabDebate.textContent = lang==='en' ? '⚖️ Debate Arena' : '⚖️ 100분 토론';
  const btnDebate = document.getElementById('btnDebateTopic');
  if(btnDebate) btnDebate.textContent = lang==='en' ? '🎲 Pick Topic' : '🎲 주제 뽑기';
  const storySendBtn = document.getElementById('storySendBtn');
  if(storySendBtn) storySendBtn.textContent = lang==='en' ? 'Send' : '전송';
  const storyInput = document.getElementById('storyInput');
  if(storyInput) storyInput.placeholder = lang==='en' ? 'Type here...' : '여기에 적어주세요...';

  const btnStorySave = document.getElementById('btnStorySave');
  if(btnStorySave) btnStorySave.textContent = lang==='en' ? '💾 Save' : '💾 저장';
  const btnStoryList = document.getElementById('btnStoryList');
  if(btnStoryList) btnStoryList.textContent = lang==='en' ? '📚 History' : '📚 저장목록';
  const btnStoryReset = document.getElementById('btnStoryReset');
  if(btnStoryReset) btnStoryReset.textContent = lang==='en' ? '🔄 New' : '🔄 새로하기';
  const storyListModalTitle = document.getElementById('storyListModalTitle');
  if(storyListModalTitle) storyListModalTitle.textContent = lang==='en' ? '📚 Saved Stories & Debates' : '📚 저장된 이야기 & 토론';
  const btnStoryListClose = document.getElementById('btnStoryListClose');
  if(btnStoryListClose) btnStoryListClose.textContent = lang==='en' ? 'Close' : '닫기';

  // Update Essay Builder left panel UI
  const btnEssaySkeleton = document.getElementById('btnEssaySkeleton');
  if(btnEssaySkeleton) btnEssaySkeleton.textContent = lang==='en' ? '🍔 Hamburger Frame' : '🍔 햄버거 뼈대';
  const btnEssayNew = document.getElementById('btnEssayNew');
  if(btnEssayNew) btnEssayNew.textContent = lang==='en' ? '✏️ New Essay' : '✏️ 새 에세이';
  const essayChipHint = document.getElementById('essayChipHint');
  if(essayChipHint) essayChipHint.textContent = lang==='en' ? '💡 Click a chip to insert it into your essay!' : '💡 클릭하면 에세이에 바로 삽입돼요!';
  const essayWriteHint = document.getElementById('essayWriteHint');
  if(essayWriteHint) essayWriteHint.textContent = lang==='en' ? '✏️ Write your English essay here!' : '✏️ 영어 에세이를 써보세요!';
  const btnEssayVoice = document.getElementById('btnEssayVoice');
  if(btnEssayVoice) btnEssayVoice.textContent = lang==='en' ? '🎤 Voice Input' : '🎤 음성 입력';

  /* 파트 4 추가: TTS·쉐도잉 버튼 언어 전환 */
  const btnEssayShadow = document.getElementById('btnEssayShadow');
  if(btnEssayShadow && !_isShadowing)
    btnEssayShadow.textContent = lang==='en' ? '🎤 Read It Aloud!' : '🎤 내가 직접 읽어보기';
  const btnTtsListen = document.getElementById('btnTtsListen');
  if(btnTtsListen && !window.speechSynthesis?.speaking)
    btnTtsListen.textContent = lang==='en' ? '🔊 Listen (Native)' : '🔊 원어민 발음 듣기';
  const ttsStatusLabel = document.getElementById('ttsStatusLabel');
  if(ttsStatusLabel && !window.speechSynthesis?.speaking)
    ttsStatusLabel.textContent = lang==='en'
      ? '🔊 Listen to native pronunciation'
      : '클릭하면 에세이를 원어민 발음으로 읽어줘요 👂';

  const essayBonusLabel = document.getElementById('essayBonusLabel');
  if(essayBonusLabel) essayBonusLabel.textContent = lang==='en' ? 'Bonus!' : '보너스!';
  // Update Essay textarea placeholder
  const essayTextarea = document.getElementById('essayTextarea');
  if(essayTextarea) {
    essayTextarea.placeholder = lang==='en'
      ? '🍞 [Intro] — State your opinion.\ne.g. I think smartphones are very helpful.\n\n🥩 [Body 1] — First reason and example.\ne.g. First, we can search for information easily.\n\n🥩 [Body 2] — Second reason and example.\ne.g. Second, we can communicate with friends.\n\n🍞 [Conclusion] — Restate your opinion.\ne.g. In conclusion, I believe smartphones are useful.'
      : '🍞 [Intro] 서론 — 나의 의견을 써보세요.\n예) I think smartphones are very helpful.\n\n🥩 [Body 1] 첫 번째 이유와 예시를 써보세요.\n예) First, we can search for information easily.\n\n🥩 [Body 2] 두 번째 이유와 예시를 써보세요.\n예) Second, we can communicate with friends.\n\n🍞 [Conclusion] 결론 — 의견을 다시 강조해보세요.\n예) In conclusion, I believe smartphones are useful.';
  }

  // Update Essay Modal text
  const essayModalTitle = document.getElementById('essayModalTitle');
  if(essayModalTitle) essayModalTitle.textContent = lang==='en' ? '🎯 Choose an Essay Topic' : '🎯 Essay 주제 선택';
  const essayModalDesc = document.getElementById('essayModalDesc');
  if(essayModalDesc) essayModalDesc.textContent = lang==='en' ? 'Pick a random topic, or type your own!' : '랜덤으로 주제를 뽑거나, 원하는 주제를 직접 써서 설정할 수 있어요!';
  const essayModalRandomBtn = document.getElementById('essayModalRandomBtn');
  if(essayModalRandomBtn) essayModalRandomBtn.textContent = lang==='en' ? '🎲 Pick a Random Topic' : '🎲 랜덤 주제 뽑기';
  const essayModalOrText = document.getElementById('essayModalOrText');
  if(essayModalOrText) essayModalOrText.textContent = lang==='en' ? 'or' : '또는';
  const essayModalInputLabel = document.getElementById('essayModalInputLabel');
  if(essayModalInputLabel) essayModalInputLabel.textContent = lang==='en' ? '✏️ Enter your own topic:' : '✏️ 주제 직접 입력:';
  const essayModalInputHint = document.getElementById('essayModalInputHint');
  if(essayModalInputHint) essayModalInputHint.textContent = lang==='en' ? '💡 Type freely in English or Korean!' : '💡 한국어 또는 영어로 자유롭게 입력하세요!';
  const essayModalConfirmBtn = document.getElementById('essayModalConfirmBtn');
  if(essayModalConfirmBtn) essayModalConfirmBtn.textContent = lang==='en' ? '✅ Start with this topic' : '✅ 이 주제로 시작하기';
  const essayModalCancelBtn = document.getElementById('essayModalCancelBtn');
  if(essayModalCancelBtn) essayModalCancelBtn.textContent = lang==='en' ? 'Cancel' : '취소';

  try { localStorage.setItem('mdj_lang', lang); } catch(e) {}

  /* 파트 1 추가: 글로벌 SOS 버튼 텍스트 언어 전환 */
  const gsosBtnLabel = document.getElementById('globalSosBtnLabel');
  if (gsosBtnLabel) gsosBtnLabel.textContent = lang === 'en' ? "What's this in English?" : '다른 표현은 뭐가 있을까?';
  // 패널이 열려 있으면 내부 텍스트도 갱신
  if (_gsosPanelOpen) updateGsosPanelLang();

  /* ══════════════════════════════════════════════
     파트 3 수정: 전체 탭 UI 텍스트 동적 전환
  ══════════════════════════════════════════════ */

  /* ── 돋움 탭 텍스트 전환 ── */
  const isEn = lang === 'en';

  // 돋움 탭 버튼
  const dodumTabLabelMontage = document.getElementById('dodumTabLabel_montage');
  if (dodumTabLabelMontage) dodumTabLabelMontage.textContent = isEn ? 'Monster Maker' : '몽타주';
  const dodumTabLabelWord = document.getElementById('dodumTabLabel_word');
  if (dodumTabLabelWord) dodumTabLabelWord.textContent = isEn ? '🎰 Word Machine' : '단어자판기';
  const dodumTabLabelPoem = document.getElementById('dodumTabLabel_poem');
  if (dodumTabLabelPoem) dodumTabLabelPoem.textContent = isEn ? '💎 Word Picker' : '시어출력기';

  // 돋움 헤더 오른쪽 버튼
  const dodumGoalBadgeText = document.getElementById('dodumGoalBadgeText');
  if (dodumGoalBadgeText) dodumGoalBadgeText.textContent = isEn
    ? "Today's Goal: Describe what you see accurately!"
    : '오늘의 목표: 본 것을 언어로 정확하게 표현하기';
  const timeAttackBtnLabel = document.getElementById('timeAttackBtnLabel');
  if (timeAttackBtnLabel) timeAttackBtnLabel.textContent = isEn ? 'Time Attack' : '타임어택';
  const witnessBtnLabel = document.getElementById('witnessBtnLabel');
  if (witnessBtnLabel) witnessBtnLabel.textContent = isEn ? 'Recall Memory' : '기억 되살리기';

  // 몽타주 탭 패널 제목
  const montagePanel1Title = document.getElementById('montagePanel1Title');
  if (montagePanel1Title) montagePanel1Title.textContent = isEn ? '1. What I Saw' : '1. 내가 본 모습';
  const montagePanel2Title = document.getElementById('montagePanel2Title');
  if (montagePanel2Title) montagePanel2Title.textContent = isEn ? '2. Describe the Monster' : '2. 몽타주 묘사하기';
  const montagePanel3Title = document.getElementById('montagePanel3Title');
  if (montagePanel3Title) montagePanel3Title.textContent = isEn ? '3. Result & Match Rate' : '3. 몽타주 결과 & 일치율';

  // 몽타주 체크리스트
  const montageChecklistTitle = document.getElementById('montageChecklistTitle');
  if (montageChecklistTitle) montageChecklistTitle.textContent = isEn ? 'Description Checklist' : '묘사 체크리스트';
  const montageCheck1 = document.getElementById('montageCheck1');
  if (montageCheck1) montageCheck1.textContent = isEn ? '□ Face features (eyes/nose/mouth shape)' : '□ 얼굴 생김새 (눈/코/입 모양)';
  const montageCheck2 = document.getElementById('montageCheck2');
  if (montageCheck2) montageCheck2.textContent = isEn ? '□ Colors (hair, skin, clothes)' : '□ 색깔 (머리, 피부, 옷 색)';
  const montageCheck3 = document.getElementById('montageCheck3');
  if (montageCheck3) montageCheck3.textContent = isEn ? '□ Unique features (patterns, accessories, vibe)' : '□ 독특한 특징 (무늬, 액세서리, 분위기)';

  // 몽타주 입력 textarea placeholder
  const mMontageInput = document.getElementById('mMontageInput');
  if (mMontageInput) mMontageInput.placeholder = isEn
    ? 'e.g. The monster has green hair and big eyes, wearing a striped shirt. It has pointy ears and a tail...\n(머리카락이 초록색이고 눈이 크고, 줄무늬 티셔츠를 입고 있어요)'
    : '예) 머리카락은 초록색이고 눈이 크며, 줄무늬 티셔츠를 입고 있어요. 귀가 뾰족하고 꼬리가 있어요...';
  const mDrawBtnLabel = document.getElementById('mDrawBtnLabel');
  if (mDrawBtnLabel) mDrawBtnLabel.textContent = isEn ? 'Sketch the Monster! 🎨' : '몽타주 스케치하기';

  // 단어자판기 탭
  const wordGameBadge = document.getElementById('wordGameBadge');
  if (wordGameBadge) wordGameBadge.textContent = isEn ? 'Poetry Warm-up Game' : '시 쓰기 몸풀기 게임';
  const wordGameTitle = document.getElementById('wordGameTitle');
  if (wordGameTitle) wordGameTitle.textContent = isEn ? 'Wacky Word Machine 🎰' : '엉뚱한 단어 자판기 🎰';
  const wordGameDesc = document.getElementById('wordGameDesc');
  if (wordGameDesc) wordGameDesc.textContent = isEn
    ? 'Connect two mismatched words to make a magical sentence!'
    : '전혀 안 어울리는 두 단어를 연결해 마법의 문장을 만들어봐요!';
  const dodumDrawBtnLabel = document.getElementById('dodumDrawBtnLabel');
  if (dodumDrawBtnLabel) dodumDrawBtnLabel.textContent = isEn ? 'Pick Words 🎲' : '단어 뽑기 🎲';
  const dodumMissionLabel = document.getElementById('dodumMissionLabel');
  if (dodumMissionLabel) dodumMissionLabel.textContent = isEn
    ? '🎯 Mission: Write a one-line poem using BOTH words!'
    : '🎯 미션: 두 단어가 모두 들어간 한 줄 시 쓰기!';
  const dodumPoemInput = document.getElementById('dodumPoemInput');
  if (dodumPoemInput) dodumPoemInput.placeholder = isEn
    ? 'Write your awesome poem here!\n(여기에 멋진 시를 적어주세요!)'
    : '여기에 멋진 시를 적어주세요!';
  const dodumCheckBtn = document.getElementById('dodumCheckBtn');
  if (dodumCheckBtn) dodumCheckBtn.textContent = isEn ? 'Show my poem to the AI teacher ✨' : 'AI 선생님에게 보여주기 ✨';

  // 시어출력기 탭
  const poemGenTitle = document.getElementById('poemGenTitle');
  if (poemGenTitle) poemGenTitle.textContent = isEn ? '💎 Poetry Word Picker' : '💎 시어 출력기';
  const poemGenDesc = document.getElementById('poemGenDesc');
  if (poemGenDesc) poemGenDesc.textContent = isEn
    ? 'Enter a theme to get poetry-perfect words!'
    : '주제를 적으면 시 쓰기에 딱 맞는 단어들이 쏟아져요!';
  const poemThemeInput = document.getElementById('poemThemeInput');
  if (poemThemeInput) poemThemeInput.placeholder = isEn
    ? 'e.g. spring, ocean, mom, school, friend... (봄, 바다, 엄마, 학교, 친구...)'
    : '예: 봄, 여름, 엄마, 학교, 바다, 친구...';
  const poemDrawBtnLabel = document.getElementById('poemDrawBtnLabel');
  if (poemDrawBtnLabel) poemDrawBtnLabel.textContent = isEn ? 'Pick 🎲' : '뽑기 🎲';
  const poemWordContainerEmpty = document.getElementById('poemWordContainerEmpty');
  if (poemWordContainerEmpty) poemWordContainerEmpty.textContent = isEn
    ? 'Enter a theme and pick words!'
    : '주제를 입력하고 단어를 뽑아보세요!';
  const poemWordClickHint = document.getElementById('poemWordClickHint');
  if (poemWordClickHint) poemWordClickHint.textContent = isEn
    ? '* Click a word to use it in the Metaphor Chat below 🎯'
    : '* 단어를 클릭하면 비유 징검다리 채팅창에서 활용할 수 있어요 🎯';

  // 비유 징검다리
  const poemBridgeTitle = document.getElementById('poemBridgeTitle');
  if (poemBridgeTitle) poemBridgeTitle.textContent = isEn ? '🪞 Metaphor Bridge' : '🪞 비유 징검다리';
  const poemChatResetBtn = document.getElementById('poemChatResetBtn');
  if (poemChatResetBtn) poemChatResetBtn.textContent = isEn ? 'Reset 🔄' : '초기화 🔄';
  const poemBridgeDesc = document.getElementById('poemBridgeDesc');
  if (poemBridgeDesc) poemBridgeDesc.textContent = isEn
    ? 'Chat with AI and create poetic expressions!'
    : 'AI 선생님과 대화하며 시적인 표현을 만들어요!';
  const poemChatInput = document.getElementById('poemChatInput');
  if (poemChatInput) poemChatInput.placeholder = isEn
    ? 'e.g. I feel angry. (나는 화가 나요.)'
    : '예: 나는 화가 나요.';
  const poemChatBtnLabel = document.getElementById('poemChatBtnLabel');
  if (poemChatBtnLabel) poemChatBtnLabel.textContent = isEn ? 'Send 🚀' : '전송 🚀';

  /* ── 이음 탭 텍스트 전환 ── */

  // 이음 일기 패널
  const ieumDiaryPanelTitle = document.getElementById('ieumDiaryPanelTitle');
  if (ieumDiaryPanelTitle) ieumDiaryPanelTitle.textContent = isEn ? "[ Today's Story ]" : '[ 오늘의 이야기 ]';
  const mTitleEl = document.getElementById('mTitle');
  if (mTitleEl && mTitleEl.textContent.trim() === '🎯 오늘의 미션' || (mTitleEl && !mTitleEl.textContent.includes('🎯 Mission')))
    mTitleEl && (mTitleEl.textContent = isEn ? '🎯 Today\'s Mission' : '🎯 오늘의 미션');
  const missionDrawBtn = document.getElementById('missionDrawBtn');
  if (missionDrawBtn) missionDrawBtn.textContent = isEn ? 'Draw Mission 🎲' : '미션 뽑기 🎲';
  const diaryFreeWriteHint = document.getElementById('diaryFreeWriteHint');
  if (diaryFreeWriteHint) diaryFreeWriteHint.textContent = isEn ? '✏️ Write freely!' : '✏️ 자유롭게 적어보세요';
  const diaryStarterBtn = document.getElementById('diaryStarterBtn');
  if (diaryStarterBtn) diaryStarterBtn.textContent = isEn ? '🎲 Sentence Starter' : '🎲 첫 문장 도우미';

  // 이음 일기 textarea placeholder
  const diaryTextarea = document.getElementById('diary');
  if (diaryTextarea) diaryTextarea.placeholder = isEn
    ? 'Write about your day in detail! 🌟\ne.g. Today I felt really excited because... (오늘 있었던 일을 자세히 적어주세요!)'
    : '오늘 있었던 일을 자세히 적어보세요! 🌟';

  // 이음 그림 패널
  const imgTitleEl = document.getElementById('imgTitle');
  if (imgTitleEl) imgTitleEl.textContent = isEn ? "[ Today's Drawing ]" : '[ 오늘의 그림 ]';
  const genBtnLabel = document.getElementById('genBtnLabel');
  if (genBtnLabel) genBtnLabel.textContent = isEn ? 'Draw Picture' : '그림 그리기';
  const placeholderMsg = document.getElementById('placeholderMsg');
  if (placeholderMsg) placeholderMsg.textContent = isEn
    ? 'Write your diary and draw a picture!'
    : '일기를 쓰고 그림을 그려보세요!';
  const diaryDrawTipBox = document.getElementById('diaryDrawTipBox');
  if (diaryDrawTipBox) diaryDrawTipBox.textContent = isEn
    ? '🖍️ The more sensory words (sizzling, icy, dazzling) and comparisons (like, as) you use, the richer the picture!'
    : '🖍️ 감각어(보글보글, 차갑게, 눈부시게)와 비유(~처럼, ~같이)를 쓸수록 더 풍부한 그림이 나와요!';
  const errorCloseBtn = document.getElementById('errorCloseBtn');
  if (errorCloseBtn) errorCloseBtn.textContent = isEn ? 'Close' : '닫기';

  // Essay Builder 초급 모드 레이블
  const essayStepIntroLabel = document.getElementById('essayStepIntroLabel');
  if (essayStepIntroLabel) essayStepIntroLabel.innerHTML = isEn
    ? '🍞 [Intro] — <em>I think... / In my opinion...</em>'
    : '🍞 [Intro] 서론 — <em>나의 의견을 써보세요</em>';
  const essayStepBody1Label = document.getElementById('essayStepBody1Label');
  if (essayStepBody1Label) essayStepBody1Label.innerHTML = isEn
    ? '🥩 [Body 1] — <em>First, ... Because...</em>'
    : '🥩 [Body 1] 본론1 — <em>첫 번째 이유와 예시</em>';
  const essayStepBody2Label = document.getElementById('essayStepBody2Label');
  if (essayStepBody2Label) essayStepBody2Label.innerHTML = isEn
    ? '🥩 [Body 2] — <em>Second, ... For example...</em>'
    : '🥩 [Body 2] 본론2 — <em>두 번째 이유와 예시</em>';
  const essayStepConclLabel = document.getElementById('essayStepConclLabel');
  if (essayStepConclLabel) essayStepConclLabel.innerHTML = isEn
    ? '🌟 [Conclusion] — <em>Therefore, ... In conclusion...</em>'
    : '🌟 [Conclusion] 결론 — <em>의견을 다시 강조해요</em>';

  // Essay Builder 초급 모드 textarea placeholder 병기
  const essayStepIntro = document.getElementById('essayStepIntro');
  if (essayStepIntro) essayStepIntro.placeholder = isEn
    ? 'e.g. I think smartphones are very helpful. (스마트폰이 매우 유용하다고 생각해요.)'
    : '예) I think smartphones are very helpful.';
  const essayStepBody1 = document.getElementById('essayStepBody1');
  if (essayStepBody1) essayStepBody1.placeholder = isEn
    ? 'e.g. First, we can search for information easily. (첫째, 정보를 쉽게 검색할 수 있어요.)'
    : '예) First, we can search for information easily.';
  const essayStepBody2 = document.getElementById('essayStepBody2');
  if (essayStepBody2) essayStepBody2.placeholder = isEn
    ? 'e.g. Second, we can communicate with our friends. (둘째, 친구들과 소통할 수 있어요.)'
    : '예) Second, we can communicate with our friends.';
  const essayStepConcl = document.getElementById('essayStepConcl');
  if (essayStepConcl) essayStepConcl.placeholder = isEn
    ? 'e.g. In conclusion, I believe smartphones are very useful. (결론적으로, 스마트폰이 매우 유용하다고 생각해요.)'
    : '예) In conclusion, I believe smartphones are very useful.';
  const essayCombineBtnLabel = document.getElementById('essayCombineBtnLabel');
  if (essayCombineBtnLabel) essayCombineBtnLabel.textContent = isEn ? 'Complete My Essay! 🪄' : '에세이 완성하기!';

  // Essay Builder 모드 토글
  const btnModeBasic = document.getElementById('btnModeBasic');
  if (btnModeBasic) btnModeBasic.innerHTML = isEn
    ? '🧩 Guided Mode<br><span style="font-size:10px;font-weight:normal;">Fill-in-the-blank (Beginner)</span>'
    : '🧩 초급 모드<br><span style="font-size:10px;font-weight:normal;">빈칸 채우기 (3~4학년)</span>';
  const btnModeAdvanced = document.getElementById('btnModeAdvanced');
  if (btnModeAdvanced) btnModeAdvanced.innerHTML = isEn
    ? '✏️ Advanced Mode<br><span style="font-size:10px;font-weight:normal;">Free writing (Advanced)</span>'
    : '✏️ 고급 모드<br><span style="font-size:10px;font-weight:normal;">자유 영작 (5~6학년)</span>';

  /* ── 틔음 탭 목표 뱃지 전환 ── */
  const ttieumGoalBadge = document.getElementById('ttieumGoalBadge');
  if (ttieumGoalBadge) ttieumGoalBadge.textContent = isEn
    ? '💡 Respond to AI\'s questions with your own story!'
    : '💡 AI의 질문에 내 이야기로 답해보세요';

  /* ── 지음 탭 텍스트 전환 ── */

  // 그림책 패널
  const bookPanel1Title = document.getElementById('bookPanel1Title');
  if (bookPanel1Title) bookPanel1Title.textContent = isEn ? '1. Write a Picture Book Scene' : '1. 그림책 장면 쓰기';
  const bookWriteTipTitle = document.getElementById('bookWriteTipTitle');
  if (bookWriteTipTitle) bookWriteTipTitle.textContent = isEn ? 'Scene Writing Tips' : '좋은 장면 쓰기 팁';
  const bookWriteTipDesc = document.getElementById('bookWriteTipDesc');
  if (bookWriteTipDesc) bookWriteTipDesc.textContent = isEn
    ? 'Include who, what, how + feelings at that moment!'
    : '누가, 무엇을, 어떻게 했는지 + 그때의 기분을 담아보세요!';
  const bookInput = document.getElementById('bookInput');
  if (bookInput) bookInput.placeholder = isEn
    ? 'e.g. The rabbit was running through the forest path and found a sleeping fox under a giant mushroom. It quietly crept over and gently touched it...\n(예: 토끼는 오솔길을 달리다 버섯 아래 잠든 여우를 발견했어요...)'
    : '예) 토끼는 숲 속 오솔길을 달리다가 커다란 버섯 아래에서 잠든 여우를 발견했어요. 살금살금 다가가서 살짝 건드려 보았더니...';
  const bDrawBtnLabel = document.getElementById('bDrawBtnLabel');
  if (bDrawBtnLabel) bDrawBtnLabel.textContent = isEn ? 'Add this as a Page 📖' : '이 내용으로 페이지 추가하기';
  const bookPanel2Title = document.getElementById('bookPanel2Title');
  if (bookPanel2Title) bookPanel2Title.textContent = isEn ? '2. My Picture Book Preview' : '2. 내 그림책 미리보기';

  // 시화 패널
  const poemPanel1Title = document.getElementById('poemPanel1Title');
  if (poemPanel1Title) poemPanel1Title.textContent = isEn ? '1. Write a Poem' : '1. 시 쓰기';
  const poemWriteTipTitle = document.getElementById('poemWriteTipTitle');
  if (poemWriteTipTitle) poemWriteTipTitle.textContent = isEn ? 'Poem Writing Tips' : '시 쓰기 팁';
  const poemWriteTipDesc = document.getElementById('poemWriteTipDesc');
  if (poemWriteTipDesc) poemWriteTipDesc.textContent = isEn
    ? 'Express your feelings in short sentences, using comparisons (e.g. Mom\'s hands are like warm sunshine)'
    : '마음속 느낌을 짧은 문장으로, 비슷한 것에 빗대어 써보세요 (예: 엄마 손은 따뜻한 햇살 같아)';
  const poemTitleLabel = document.getElementById('poemTitleLabel');
  if (poemTitleLabel) poemTitleLabel.textContent = isEn ? '📌 Title' : '📌 제목';
  const poemTitleInput = document.getElementById('poemTitleInput');
  if (poemTitleInput) poemTitleInput.placeholder = isEn
    ? 'Enter a title or let AI create one! (제목을 입력하거나 AI가 만들어줘요)'
    : '제목을 직접 입력하거나 AI가 만들어줘요';
  const poemFontSizeTitle = document.getElementById('poemFontSizeTitle');
  if (poemFontSizeTitle) poemFontSizeTitle.textContent = isEn ? '🔡 Font Size' : '🔡 글자 크기';
  const poemInput = document.getElementById('poemInput');
  if (poemInput) poemInput.placeholder = isEn
    ? 'Write your own poem!\n\ne.g. Cherry blossoms in spring\nFloat like snow...\n(나만의 시를 써보세요!)'
    : '나만의 시를 써보세요!\n\n봄날 벚꽃이\n눈처럼 흩날려...';
  const pPaintBtnLabel = document.getElementById('pPaintBtnLabel');
  if (pPaintBtnLabel) pPaintBtnLabel.textContent = isEn ? 'Turn into Poem Art 🎨' : '시화로 꾸미기';
  const poemPanel2Title = document.getElementById('poemPanel2Title');
  if (poemPanel2Title) poemPanel2Title.textContent = isEn ? '2. Poem Art Preview' : '2. 시화 미리보기';

  // 지음 탭 헤더 버튼
  const tabBookBtn = document.getElementById('tabBook');
  if (tabBookBtn) tabBookBtn.textContent = isEn ? '📖 Picture Book' : '📖 그림책';
  const tabPoemBtn = document.getElementById('tabPoem');
  if (tabPoemBtn) tabPoemBtn.textContent = isEn ? '🌸 Poem Art' : '🌸 시화';

  /* ── 이음 헤더 버튼 전환 ── */
  const ieumNewDiaryBtn = document.getElementById('ieumNewDiaryBtn');
  if (ieumNewDiaryBtn) ieumNewDiaryBtn.textContent = isEn ? '✏️ New Diary' : '✏️ 새 일기';
  const ieumAppTitle = document.getElementById('ieumAppTitle');
  if (ieumAppTitle) ieumAppTitle.textContent = isEn ? '🎨 [Guided Writing] AI Diary' : '🎨 [이음] AI 그림일기장';
  const ieumBadgeBtn = document.getElementById('ieumBadgeBtn');
  if (ieumBadgeBtn) ieumBadgeBtn.textContent = isEn ? '🏆 My Badges' : '🏆 내 뱃지';
  const ieumBackupBtn = document.getElementById('ieumBackupBtn');
  if (ieumBackupBtn) ieumBackupBtn.textContent = isEn ? '💾 Backup' : '💾 백업';
  const ieumSaveDiaryBtn = document.getElementById('ieumSaveDiaryBtn');
  if (ieumSaveDiaryBtn) ieumSaveDiaryBtn.textContent = isEn ? '💾 Save' : '💾 저장';
  const revBtnEl = document.getElementById('revBtn');
  if (revBtnEl) revBtnEl.textContent = isEn ? '✍️ Revise' : '✍️ 퇴고';
  const ieumDiaryListBtn = document.getElementById('ieumDiaryListBtn');
  if (ieumDiaryListBtn) ieumDiaryListBtn.textContent = isEn ? '📖 Diary List' : '📖 일기장';
  const ieumPrintBtn = document.getElementById('ieumPrintBtn');
  if (ieumPrintBtn) ieumPrintBtn.textContent = isEn ? '🖨️ Print' : '🖨️ 그림일기 출력';
  // ⚠️ 포트폴리오/교사 대시보드 버튼은 번역 로직이 빠져 있어 영어 모드에서도
  //    한글 그대로 남아있던 문제 수정
  const ieumPortfolioBtn = document.getElementById('ieumPortfolioBtn');
  if (ieumPortfolioBtn) ieumPortfolioBtn.textContent = lang === 'en' ? '📈 Portfolio' : '📈 포트폴리오';
  const ieumTeacherDashBtn = document.getElementById('ieumTeacherDashBtn');
  if (ieumTeacherDashBtn) ieumTeacherDashBtn.textContent = lang === 'en' ? '📊 Teacher Dashboard' : '📊 교사 대시보드';

  /* ── 이음 기타 UI 요소 전환 ── */
  const richnesBarLabel = document.getElementById('richnesBarLabel');
  if (richnesBarLabel) richnesBarLabel.textContent = isEn ? '✏️ Richness' : '✏️ 묘사력';
  const missionBarLabel = document.getElementById('missionBarLabel');
  if (missionBarLabel) missionBarLabel.textContent = isEn ? '🎯 Mission' : '🎯 미션 달성';
  const teacherLabel = document.getElementById('teacherLabel');
  if (teacherLabel) teacherLabel.textContent = isEn ? 'AI Teacher' : '선생님';
  const teacherMsg = document.getElementById('teacherMsg');
  if (teacherMsg && (teacherMsg.textContent === '일기를 쓰면 조언해드릴게요! 😊' || teacherMsg.textContent === 'Write your diary and I\'ll give you feedback! 😊'))
    teacherMsg.textContent = isEn ? 'Write your diary and I\'ll give you feedback! 😊' : '일기를 쓰면 조언해드릴게요! 😊';

  /* ── 돋움 탭: mWitnessMsg 초기 메시지 전환 ── */
  const mWitnessMsgEl = document.getElementById('mWitnessMsg');
  if (mWitnessMsgEl && (mWitnessMsgEl.textContent === '버튼을 눌러 시작!' || mWitnessMsgEl.textContent === 'Press the button to start!'))
    mWitnessMsgEl.textContent = isEn ? 'Press the button to start!' : '버튼을 눌러 시작!';

  /* 파트 4: 언어 전환 시 voca 패널 숨기기 (새 언어로 재분석 시 새로 렌더링) */
  ['teacherCoachVoca', 'essayCoachVoca', 'poemCoachVoca'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  /* 파트 4: 이음 선생님 분석 캐시 초기화 (언어 전환 → 새 언어로 재분석 유도) */
  _lastAnalyzedText = '';
  _lastAnalysis = null;
  _lastEssayText = '';
  _lastEssayAnalysis = null;
}

/* ── 에세이 주제 직접 입력 모달 ── */
