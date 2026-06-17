/* ============================================================
 * [이음-에세이] 주제뽑기 · 에세이 작성/분석 · TTS · 쉐도잉
 * (분할 자동 생성 — 원본 index.html에서 추출, 로드 순서 유지 필수)
 * ============================================================ */
let _currentIeumTab = 'diary';
function switchIeumTab(tab) {
  _currentIeumTab = tab;
  ['diary','essay'].forEach(t => {
    const content = $(`ieumContent_${t}`);
    if (content) content.style.display = (t === tab) ? 'flex' : 'none';
    const btn = $(`ieumTab_${t}`);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  if (tab === 'essay') renderEssayList();
}

/* ── 2. 주제 데이터 ── */
const ESSAY_TOPICS = [
  { title:'스마트폰을 교실에서 써도 될까?',            titleEn:'Should students use smartphones in class?',              words:['smartphone','helpful','addicted'],           grammar:['I think','Because'] },
  { title:'동물원은 필요할까, 필요하지 않을까?',        titleEn:'Are zoos necessary or not?',                             words:['freedom','endangered','protect'],            grammar:['However,','In my opinion,'] },
  { title:'환경을 지키려면 우리가 무엇을 해야 할까?',  titleEn:'What should we do to protect the environment?',          words:['recycle','pollution','environment'],         grammar:['First,','Therefore,'] },
  { title:'학교 급식에 채소를 꼭 먹어야 할까?',        titleEn:'Should students be required to eat vegetables at lunch?', words:['healthy','nutrition','choice'],              grammar:['I believe','For example,'] },
  { title:'초등학생도 SNS를 써도 될까?',               titleEn:'Should elementary students be allowed to use social media?',words:['dangerous','social media','privacy'],        grammar:['On the other hand,','In conclusion,'] },
  { title:'학교 숙제는 꼭 필요할까?',                  titleEn:'Is school homework really necessary?',                   words:['practice','stress','improve'],               grammar:['Second,','In addition,'] },
  { title:'반려동물을 키우는 것이 좋을까?',            titleEn:'Is having a pet a good idea?',                           words:['responsibility','companion','care'],          grammar:['I think','Because'] },
  { title:'미래에는 로봇이 선생님을 대신할 수 있을까?',titleEn:'Can robots replace teachers in the future?',             words:['artificial intelligence','emotion','replace'],grammar:['However,','I believe'] },
  { title:'용돈을 받으면 어떻게 써야 할까?',           titleEn:'How should students spend their allowance?',             words:['save','spend','important'],                  grammar:['First,','For example,'] },
  { title:'스포츠는 모든 학생이 배워야 할까?',         titleEn:'Should all students be required to learn sports?',       words:['teamwork','healthy','competition'],           grammar:['In my opinion,','Therefore,'] },
  { title:'패스트푸드는 건강에 해로울까?',             titleEn:'Is fast food harmful to our health?',                    words:['nutrition','junk food','balanced'],           grammar:['I think','However,'] },
  { title:'학교에서 교복을 입어야 할까?',              titleEn:'Should students wear uniforms at school?',               words:['uniform','equality','freedom'],               grammar:['First,','In conclusion,'] },
];
let _currentEssayTopic = null;

/* ── 3. 주제 뽑기 ── */
function drawEssayTopic() {
  const topic = ESSAY_TOPICS[Math.floor(Math.random() * ESSAY_TOPICS.length)];
  _currentEssayTopic = topic;
  const topicBox = $('essayTopicBox');
  const displayTitle = (_currentLang === 'en' && topic.titleEn) ? topic.titleEn : topic.title;
  if (topicBox) topicBox.textContent = '🎯 ' + displayTitle;
  renderEssayChips(topic);
  toast(_currentLang==='en' ? '✨ New topic picked! Click the word chips to start your essay!' : '✨ 새 주제가 뽑혔어요! 단어 칩을 눌러 에세이를 시작해봐요!');
}

function renderEssayChips(topic) {
  const el = $('essayChips');
  if (!el) return;
  el.innerHTML = '';
  (topic.words || []).forEach(w => {
    const btn = document.createElement('button');
    btn.className = 'essay-chip';
    btn.textContent = '📘 ' + w;
    btn.onclick = () => insertEssayChipText(w + ' ');
    el.appendChild(btn);
  });
  (topic.grammar || []).forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'essay-chip grammar';
    btn.textContent = '🔗 ' + g;
    btn.onclick = () => insertEssayChipText(g + ' ');
    el.appendChild(btn);
  });
}

/* ── 4. 칩 텍스트 삽입 ── */
function insertEssayChipText(text) {
  const ta = $('essayTextarea');
  if (!ta) return;
  const s = ta.selectionStart, e2 = ta.selectionEnd;
  ta.value = ta.value.slice(0, s) + text + ta.value.slice(e2);
  const p = s + text.length;
  ta.setSelectionRange(p, p);
  ta.focus();
  onEssayInput();
}

/* ── 5. 햄버거 뼈대 삽입 ── */
function insertEssaySkeleton() {
  // 파트 1: 뼈대 삽입 시 고급 모드로 전환
  setEssayMode('advanced');
  const ta = $('essayTextarea');
  if (!ta) return;
  const hint = _currentEssayTopic ? '"' + _currentEssayTopic.title + '"' : '...';
  ta.value =
`🍞 [Intro — 서론]
I think ${hint}. In my opinion, _________________________________.

🥩 [Body 1 — 첫 번째 이유]
First, _________________________________. For example, _________________________________.

🥩 [Body 2 — 두 번째 이유]
Second, _________________________________. In addition, _________________________________.

🍞 [Conclusion — 결론]
In conclusion, I believe _________________________________. Therefore, _________________________________.`;
  ta.focus();
  toast(_currentLang==='en' ? '🍔 Hamburger skeleton inserted! Fill in the blanks!' : '🍔 햄버거 뼈대를 넣었어요! 빈칸을 채워보세요!');
}

/* ══════════════════════════════════════════════════════════
   파트 1 추가: 단계별 마법사 모드 — 초급(빈칸채우기) / 고급(자유영작) 토글
══════════════════════════════════════════════════════════ */
let _essayMode = 'basic'; // 'basic' | 'advanced'

/**
 * 파트 1: 초급/고급 모드 전환
 * - 초급: textarea 숨기고 3분할 입력창 표시
 * - 고급: 3분할 입력창 숨기고 textarea 표시
 */
function setEssayMode(mode) {
  _essayMode = mode;
  const stepWrap  = $('essayStepWrap');
  const textarea  = $('essayTextarea');
  const btnBasic    = $('btnModeBasic');
  const btnAdvanced = $('btnModeAdvanced');
  const voiceRow  = $('btnEssayVoice');

  if (mode === 'basic') {
    // 초급 모드: 분리 입력창 보이기, textarea 숨기기
    if (stepWrap)  { stepWrap.style.display  = 'flex'; }
    if (textarea)  { textarea.style.display  = 'none'; }
    if (btnBasic)    { btnBasic.classList.add('active');    btnBasic.classList.remove('advanced'); }
    if (btnAdvanced) { btnAdvanced.classList.remove('active'); }
    // 음성 버튼은 초급에선 숨김 (입력 대상이 분산됨)
    if (voiceRow && voiceRow.parentElement) voiceRow.parentElement.style.display = 'none';
  } else {
    // 고급 모드: textarea 보이기, 분리 입력창 숨기기
    if (stepWrap)  { stepWrap.style.display  = 'none'; }
    if (textarea)  { textarea.style.display  = ''; }
    if (btnAdvanced) { btnAdvanced.classList.add('active'); }
    if (btnBasic)    { btnBasic.classList.remove('active'); }
    if (voiceRow && voiceRow.parentElement) voiceRow.parentElement.style.display = 'flex';
    textarea?.focus();
  }
}

/**
 * 파트 1: 초급 모드 — 서론/본론/결론 합치기
 * 세 칸을 모두 채우면 하나로 합쳐 고급 textarea에 넣고 분석 실행
 */
function combineEssaySteps() {
  const intro = ($('essayStepIntro')?.value || '').trim();
  const body1 = ($('essayStepBody1')?.value || '').trim();
  const body2 = ($('essayStepBody2')?.value || '').trim();
  const concl = ($('essayStepConcl')?.value || '').trim();

  const missing = [];
  if (!intro) missing.push(_currentLang==='en' ? 'Intro' : '서론 (Intro)');
  if (!body1) missing.push(_currentLang==='en' ? 'Body 1' : '첫 번째 이유 (Body 1)');
  if (!body2) missing.push(_currentLang==='en' ? 'Body 2' : '두 번째 이유 (Body 2)');
  if (!concl) missing.push(_currentLang==='en' ? 'Conclusion' : '결론 (Conclusion)');

  if (missing.length > 0) {
    toast(_currentLang==='en'
      ? `✏️ Please fill in: ${missing.join(', ')}!`
      : `✏️ 빈칸을 채워주세요: ${missing.join(', ')}!`);
    return;
  }

  // 합쳐서 textarea에 삽입
  const combined =
`[Intro]
${intro}

[Body 1]
${body1}

[Body 2]
${body2}

[Conclusion]
${concl}`;

  const ta = $('essayTextarea');
  if (ta) ta.value = combined;

  // 고급 모드로 전환해서 분석 결과 보여주기
  setEssayMode('advanced');

  /* 파트 4 추가: 에세이 합치기 완료 시 TTS 버튼 행 즉시 표시 */
  const ttsRow = $('essayTtsRow');
  if (ttsRow) ttsRow.style.display = 'flex';

  toast(_currentLang==='en'
    ? '🪄 Your essay is combined! Analyzing now... 🔍'
    : '🪄 에세이를 합쳤어요! 분석 중... 🔍');

  // 분석 즉시 트리거
  _lastEssayAnalysis = null;
  onEssayInput();
}

/* ── 6. 새 에세이 ── */
function newEssay() {
  const ta = $('essayTextarea');
  if (ta) ta.value = '';
  // 파트 1: 초급 모드 입력창도 초기화
  ['essayStepIntro','essayStepBody1','essayStepBody2','essayStepConcl'].forEach(id => {
    const el = $(id); if (el) el.value = '';
  });
  // 초급 모드로 기본값 복원 (3~4학년 친화적)
  setEssayMode(_essayMode);
  _currentEssayTopic = null;
  _lastEssayText = ''; _lastEssayAnalysis = null;
  const topicBox = $('essayTopicBox');
  if (topicBox) topicBox.textContent = _currentLang==='en' ? 'Pick a topic! 🎲' : '주제를 뽑아주세요! 🎲';
  const chips = $('essayChips');
  if (chips) chips.innerHTML = `<span style="color:#ccc;font-size:13px;">${_currentLang==='en' ? 'Pick a topic to see recommended words & connectors ✨' : '주제를 뽑으면 추천 단어/문법이 나타나요 ✨'}</span>`;
  ['essayRichnessFill','essayBonusFill'].forEach(id => { const el=$(id); if(el) el.style.width='0%'; });
  $('essayRichnessScore').textContent = '— waiting';
  $('essayBonusScore').textContent    = '— waiting';
  const st = $('essayStamp');
  if (st) st.classList.remove('show','s1','s2','s3','s4','s5');
  const bb = $('essayBonusBadge');
  if (bb) bb.classList.remove('show');
  setEssayTeacher('idle');
}

/* ── 7. 입력 감지 + 분석 트리거 ── */
let _lastEssayText = '', _lastEssayAnalysis = null, _essayHintTimer;
function onEssayInput() {
  clearTimeout(_essayHintTimer);
  const txt = ($('essayTextarea')?.value || '').trim();
  if (txt !== _lastEssayText) _lastEssayAnalysis = null;
  if (txt.length < 15) { setEssayTeacher('idle'); return; }
  setEssayTeacher('thinking');
  _essayHintTimer = setTimeout(async () => {
    try {
      const r = await analyzeEssay(txt);
      $('essayRichnessFill').style.width  = `${r.richness * 10}%`;
      $('essayRichnessScore').textContent = `Score ${r.richness}/10`;
      $('essayBonusFill').style.width     = `${(r.bonusInk / 5) * 100}%`;
      $('essayBonusScore').textContent    = `Bonus +${r.bonusInk} 💧`;
      updateEssayStamp(r.richness);
      const bb = $('essayBonusBadge');
      if (bb) {
        $('essayBonusInkNum').textContent = r.bonusInk;
        bb.classList.toggle('show', r.bonusInk > 0);
      }
      setEssayTeacher('advice', r);
    } catch(e) { setEssayTeacher('idle'); }
  }, 2800);
}

/* ── 8. Essay AI 분석 ── */
async function analyzeEssay(text) {
  if (_lastEssayText === text && _lastEssayAnalysis) return _lastEssayAnalysis;
  const topicWords   = _currentEssayTopic ? _currentEssayTopic.words.join(', ')   : '(none)';
  const topicGrammar = _currentEssayTopic ? _currentEssayTopic.grammar.join(', ') : '(none)';
  const topicTitle   = _currentEssayTopic ? _currentEssayTopic.title : (_currentLang==='en' ? 'Free topic' : '자유 주제');

  const isEn = _currentLang === 'en';

  /* 파트 3 수정: max_tokens 증가 + grammarErrors 배열 필드 추가 */
  const raw = await callClaude({
    model: 'claude-haiku-4-5-20251001', max_tokens: 1000,
    system: `You are a warm English Essay Coach for elementary school students (ages 10-13).
Topic: "${topicTitle}"

SANDWICH FEEDBACK (always apply in 'advice'):
1. 🌟 PRAISE first — find something genuinely good
2. ✏️ GENTLE CORRECTION — fix one grammar/structure issue kindly
3. 💪 ENCOURAGEMENT — ${isEn ? 'English only' : 'English + Korean'}

ESSAY STRUCTURE CHECK:
- hasIntro: does the student state their opinion/claim at the start?
- hasBody: does the student give at least one reason with an example?
- hasConclusion: does the student restate their opinion at the end?

BONUS SCORING (bonusInk 0–5):
Recommended words: ${topicWords} → +1 each (max 3)
Recommended grammar/connectors: ${topicGrammar} → +1 each (max 2)
Count how many of these appear in the text. bonusInk = that count (max 5).

RICHNESS SCORING (1–10):
- Clear opinion stated: +2
- At least 2 body paragraphs with reasons: +3
- Conclusion present: +2
- Vocabulary & grammar quality: +2
- Creativity: +1

GRAMMAR DIFF (파트 3):
Find up to 3 most important grammar mistakes in the student's essay.
For each mistake, provide:
- "original": the exact problematic sentence or phrase from the student's text (keep it short, max 1 sentence)
- "corrected": the corrected version of that sentence or phrase
- "type": error category, one of: "spelling" | "article" | "tense" | "subject-verb" | "word-order" | "preposition" | "plural" | "other"
If there are no grammar errors, return an empty array [].

Return ONLY valid JSON (no markdown):
{
  "richness":<1-10>,
  "bonusInk":<0-5>,
  "hasIntro":<true|false>,
  "hasBody":<true|false>,
  "hasConclusion":<true|false>,
  "structureFeedback":"<${isEn ? 'English' : 'Korean'} 1 sentence on structure — what's missing or well done>",
  "wordUseFeedback":"<${isEn ? 'English' : 'Korean'} 1 sentence on recommended word/grammar usage>",
  "grammarFeedback":"<sandwich-method grammar fix, ${isEn ? 'English only' : 'English+Korean'}, 1-2 sentences>",
  "grammarErrors":[
    {"original":"<student's original sentence>","corrected":"<corrected sentence>","type":"<error type>"}
  ],
  "nextChallenge":"<one concrete next step, ${isEn ? 'English only' : 'bilingual English+Korean'}>",
  "advice":"<sandwich overall: praise + correction + ${isEn ? 'English encouragement' : 'bilingual encouragement'}, 2-3 sentences>",
  "voca":"<2-3 useful words from your feedback. Format: word (한국어뜻), word (한국어뜻). e.g. specific (구체적인), vivid (생생한), structure (구조)>"
}`,
    messages: [{ role:'user', content:`Student's essay:\n${text}` }]
  });

  const data = parseJSON(raw) || {
    richness:3, bonusInk:0,
    hasIntro:false, hasBody:false, hasConclusion:false,
    structureFeedback: isEn ? 'Try to include an intro, body, and conclusion!' : '서론, 본론, 결론을 모두 써보세요!',
    wordUseFeedback:   isEn ? 'Try using some of the recommended words!' : '추천 단어를 사용해봐요!',
    grammarFeedback:   isEn ? 'Check your grammar and sentence structure!' : '문법을 확인해보세요!',
    grammarErrors:     [], /* 파트 3: Grammar Diff 빈 배열 fallback */
    nextChallenge:     isEn ? 'Keep writing! 😊' : '계속 써봐요! 😊',
    advice:            isEn ? 'Great effort on your essay! Keep it up! 💪' : '에세이를 잘 쓰고 있어요! 계속 해봐요! 💪',
    voca:              '' /* 파트 4: voca fallback */
  };
  if(!data.voca) data.voca = ''; /* 파트 4 */

  if (data.bonusInk > 0) {
    const bb = $('essayBonusBadge');
    const bx = bb ? bb.getBoundingClientRect() : null;
    await addInk(data.bonusInk, bx ? bx.x + bx.width/2 : window.innerWidth/2, bx ? bx.y : 200);
  }

  _lastEssayText     = text;
  _lastEssayAnalysis = data;
  return data;
}

/* ── 9. Essay 도장 업데이트 ── */
function updateEssayStamp(r) {
  const el = $('essayStamp');
  if (!el || r < 1) return;
  el.classList.remove('show','s1','s2','s3','s4','s5');
  const g = STAMPS[Math.min(r, STAMPS.length - 1)];
  if (!g) return;
  $('essayStampIcon').textContent = g.icon;
  $('essayStampText').textContent  = g.text;
  el.classList.add(g.cls);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
}

/* ── 10. Essay 선생님 피드백 UI ── */
function setEssayTeacher(st, data) {
  const face = $('essayTeacherFace');
  const msg  = $('essayTeacherMsg');
  const wrap = $('essayCoachWrap');
  if (!face || !msg) return;
  face.classList.remove('thinking');
  ['essayCoachStructure','essayCoachWordUse','essayCoachGrammar','essayCoachNext']
    .forEach(id => { const e=$(id); if(e){ e.style.display='none'; e.innerHTML=''; } });
  if (wrap) wrap.style.display = 'none';

  const isEn = _currentLang === 'en';

  if (st === 'idle') {
    face.textContent = '👩‍🏫';
    msg.innerHTML = `<span class="teacher-hi">Essay Coach</span><br>${isEn ? 'Start writing your essay and I\'ll give you feedback! ✍️' : '에세이를 쓰면 피드백을 드릴게요! ✍️'}`;
    return;
  }
  if (st === 'thinking') {
    face.textContent = '🤔'; face.classList.add('thinking');
    msg.innerHTML = `<span class="teacher-hi">Essay Coach</span><br>${isEn ? 'Reading your essay carefully... 📖' : '에세이를 열심히 읽고 있어요... 📖'}`;
    return;
  }

  face.textContent = '✨';
  msg.innerHTML = `<span class="teacher-hi">🌟 Essay Feedback</span><br>${data.advice || (isEn ? 'Great essay! Keep it up! 💪' : '에세이를 잘 쓰고 있어요! 💪')}`;

  /* 파트 4 추가: 피드백이 나오면 TTS 버튼 행 표시 */
  const ttsRow = $('essayTtsRow');
  if (ttsRow) ttsRow.style.display = 'flex';

  let hasCoach = false;
  const baseStyle = 'display:block; border-radius:0 8px 8px 0; padding:7px 11px; font-size:11.5px; line-height:1.65; margin-bottom:5px; word-break:keep-all;';

  const structEl = $('essayCoachStructure');
  if (structEl && data.structureFeedback) {
    const ok = [], miss = [];
    if (data.hasIntro)      ok.push(isEn ? '🍞 Intro ✅' : '🍞 서론 ✅'); else miss.push(isEn ? 'Intro' : '서론');
    if (data.hasBody)       ok.push(isEn ? '🥩 Body ✅'  : '🥩 본론 ✅'); else miss.push(isEn ? 'Body'  : '본론');
    if (data.hasConclusion) ok.push(isEn ? '🍞 Conclusion ✅' : '🍞 결론 ✅'); else miss.push(isEn ? 'Conclusion' : '결론');
    structEl.style.cssText = baseStyle + 'background:#f0fef8; border-left:3px solid #4caf8a; color:#2a6a4a;';
    const addLabel  = isEn ? 'add ' : '';
    const perfectLb = isEn ? 'Perfect structure! 👏' : '완벽해요! 👏';
    structEl.innerHTML = `🍔 <b>${isEn ? 'Essay Structure:' : 'Essay 구조:'}</b> ${ok.join(' / ')}${miss.length ? ' — <span style="color:var(--orange);">' + addLabel + miss.join(', ') + '!</span>' : ' ' + perfectLb}<br><small style="opacity:.8;">${data.structureFeedback}</small>`;
    hasCoach = true;
  }

  const wordEl = $('essayCoachWordUse');
  if (wordEl && data.wordUseFeedback) {
    wordEl.style.cssText = baseStyle + 'background:#fffbf0; border-left:3px solid var(--orange); color:#8a5a1a;';
    wordEl.innerHTML = `💧 <b>${isEn ? 'Word & Grammar Usage:' : '추천 단어/문법 활용:'}</b> ${data.wordUseFeedback}`;
    hasCoach = true;
  }

  const gramEl = $('essayCoachGrammar');
  if (gramEl && (data.grammarFeedback || (data.grammarErrors && data.grammarErrors.length > 0))) {
    gramEl.style.cssText = baseStyle + 'background:#fff8f0; border-left:3px solid #e07040; color:#7a3010;';

    /* 파트 3 수정: Grammar Diff 하이라이트 UI 렌더링 */
    let diffHTML = `📝 <b>Grammar:</b> ${data.grammarFeedback || ''}`;

    const errors = Array.isArray(data.grammarErrors) ? data.grammarErrors : [];
    if (errors.length === 0) {
      // 오류 없음
      diffHTML += `<div class="grammar-diff-wrap" style="margin-top:6px;">
        <div class="diff-no-error">✅ <span>${isEn ? 'No grammar errors found! Great job! 🎉' : '문법 오류가 없어요! 정말 잘 썼어요! 🎉'}</span></div>
      </div>`;
    } else {
      // 오류별 Diff 카드 렌더링
      const typeLabel = {
        'spelling':'철자','article':'관사','tense':'시제',
        'subject-verb':'주어-동사','word-order':'어순',
        'preposition':'전치사','plural':'복수형','other':'기타'
      };
      const diffCards = errors.map(err => {
        const orig      = escHtml(err.original  || '');
        const corrected = escHtml(err.corrected || '');
        const typeLbl   = typeLabel[err.type] || err.type || 'other';
        // 토큰 단위 diff 계산 → 변경된 부분 초록 강조
        const highlightedCorrected = buildDiffHighlight(err.original || '', err.corrected || '');
        return `
          <div class="grammar-diff-wrap" style="margin-top:7px;">
            <span class="diff-type-badge">${escHtml(typeLbl)}</span>
            <div class="diff-original">${orig}</div>
            <div class="diff-corrected">${highlightedCorrected}</div>
          </div>`;
      }).join('');
      diffHTML += diffCards;
    }

    gramEl.innerHTML = diffHTML;
    hasCoach = true;
  }

  const nextEl = $('essayCoachNext');
  if (nextEl && data.nextChallenge) {
    nextEl.style.cssText = baseStyle + 'background:#f0f7ff; border-left:3px solid var(--blue); color:#2a5a8a; margin-bottom:0;';
    nextEl.innerHTML = `✏️ <b>Next challenge:</b> ${data.nextChallenge}`;
    hasCoach = true;
  }

  if (hasCoach && wrap) wrap.style.display = 'block';

  /* 파트 4: Essay 미니 단어장(voca) 렌더링 */
  const isEnEssay = _currentLang === 'en';
  let essayVocaEl = $('essayCoachVoca');
  if (data && data.voca && data.voca.trim()) {
    if (!essayVocaEl) {
      essayVocaEl = document.createElement('div');
      essayVocaEl.id = 'essayCoachVoca';
      if (wrap) wrap.appendChild(essayVocaEl);
    }
    essayVocaEl.style.cssText = 'display:block; margin-top:6px; background:#f0f7ff; border-left:3px solid #4a90e2; padding:6px 10px; border-radius:8px; font-size:11px; color:#2a5a8a; word-break:keep-all;';
    essayVocaEl.innerHTML = `💡 <b>${isEnEssay ? "Today's Words:" : "오늘의 단어:"}</b> ${data.voca}`;
    if (wrap && wrap.style.display === 'none') wrap.style.display = 'block';
  } else if (essayVocaEl) {
    essayVocaEl.style.display = 'none';
  }
}

/* ══════════════════════════════════════════════════════════
   파트 4 추가: 원어민 발음 듣기(TTS) — window.speechSynthesis 활용
   ① toggleEssayTTS()    : 재생 / 정지 토글
   ② speakEssayText()    : 에세이 텍스트를 en-US 음성으로 읽기
   ③ stopEssayTTS()      : TTS 즉시 중지 & 버튼 원래 상태 복원
   ④ getCleanEssayText() : 이모지·마크다운 기호 제거 후 순수 영문 반환
══════════════════════════════════════════════════════════ */

let _ttsUtterance = null; // 현재 재생 중인 SpeechSynthesisUtterance 인스턴스

/**
 * 파트 4: 에세이 텍스트에서 이모지·한국어·특수기호를 제거해
 *         TTS에 전달할 깔끔한 영문 텍스트를 반환
 */
function getCleanEssayText() {
  const raw = ($('essayTextarea')?.value || '').trim();
  if (!raw) return '';
  return raw
    // 이모지 제거
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    // 한국어(가-힣, 자모) 제거
    .replace(/[\uAC00-\uD7A3\u3131-\u318E]/g, '')
    // 마크다운 기호·대괄호 제거
    .replace(/[\[\]#*_`~]/g, '')
    // 연속 공백·줄바꿈 정리
    .replace(/\n{3,}/g, '\n\n')
    .replace(/  +/g, ' ')
    .trim();
}

/**
 * 파트 4: TTS 재생 / 정지 토글
 */
function toggleEssayTTS() {
  if (!window.speechSynthesis) {
    toast(_currentLang === 'en'
      ? '❌ Your browser does not support TTS. Please use Chrome!'
      : '❌ 이 브라우저는 TTS를 지원하지 않아요. 크롬을 이용해주세요!');
    return;
  }
  const btn = $('btnTtsListen');
  if (window.speechSynthesis.speaking) {
    stopEssayTTS();
    return;
  }
  speakEssayText();
}

/**
 * 파트 4: 에세이를 en-US 원어민 음성으로 읽어주기
 */
function speakEssayText() {
  const text = getCleanEssayText();
  if (!text) {
    toast(_currentLang === 'en'
      ? '✏️ Please write your essay first!'
      : '✏️ 먼저 에세이를 써주세요!');
    return;
  }

  const btn    = $('btnTtsListen');
  const label  = $('ttsStatusLabel');

  // 이미 재생 중이면 중지
  window.speechSynthesis.cancel();

  _ttsUtterance = new SpeechSynthesisUtterance(text);
  _ttsUtterance.lang  = 'en-US';
  _ttsUtterance.rate  = 0.88;   // 초등학생이 따라 듣기 좋은 속도
  _ttsUtterance.pitch = 1.0;
  _ttsUtterance.volume = 1.0;

  // 사용 가능한 en-US 음성 중 가장 자연스러운 것을 선택
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang === 'en-US' && v.localService)
                || voices.find(v => v.lang === 'en-US')
                || voices.find(v => v.lang.startsWith('en'));
  if (enVoice) _ttsUtterance.voice = enVoice;

  // 이벤트 핸들러
  _ttsUtterance.onstart = () => {
    if (btn) {
      btn.textContent = '⏹ 읽기 중지';
      btn.classList.add('speaking');
    }
    if (label) label.textContent = _currentLang === 'en'
      ? '🔊 Playing... Click to stop'
      : '🔊 재생 중... 클릭하면 중지돼요';
    toast(_currentLang === 'en'
      ? '🔊 Playing your essay in English!'
      : '🔊 에세이를 영어로 읽어드릴게요! 잘 들어봐요 👂');
  };

  _ttsUtterance.onend = () => {
    resetTtsBtn();
    toast(_currentLang === 'en'
      ? '✅ Finished! Now try reading it yourself 🎤'
      : '✅ 다 읽었어요! 이번엔 직접 읽어볼까요? 🎤');
  };

  _ttsUtterance.onerror = (e) => {
    resetTtsBtn();
    // 'interrupted' 는 정지 버튼으로 취소한 정상적인 경우이므로 토스트 생략
    if (e.error !== 'interrupted') {
      toast(_currentLang === 'en' ? '❌ TTS error: ' + e.error : '❌ TTS 오류: ' + e.error);
    }
  };

  window.speechSynthesis.speak(_ttsUtterance);
}

/**
 * 파트 4: TTS 중지 & 버튼 초기화
 */
function stopEssayTTS() {
  window.speechSynthesis.cancel();
  resetTtsBtn();
}

function resetTtsBtn() {
  const btn   = $('btnTtsListen');
  const label = $('ttsStatusLabel');
  if (btn) {
    btn.textContent = '🔊 원어민 발음 듣기';
    btn.classList.remove('speaking');
  }
  if (label) label.textContent = _currentLang === 'en'
    ? '🔊 Listen to native pronunciation'
    : '클릭하면 에세이를 원어민 발음으로 읽어줘요 👂';
}

/* ══════════════════════════════════════════════════════════
   파트 4 추가: 말하기(Shadowing) 훈련 — STT 활용
   ① startEssayShadowing()  : 학생이 에세이를 소리내어 읽으면 STT로 인식
   ② stopEssayShadowing()   : 녹음 중지
   ③ showShadowBonusPop()   : 축하 팝업 + 폭죽 + 보너스 잉크 +50 지급
   ④ closeShadowBonusPop()  : 팝업 닫기
══════════════════════════════════════════════════════════ */

let _shadowRecognition = null; // SpeechRecognition 인스턴스
let _isShadowing = false;      // 현재 쉐도잉 진행 여부

/**
 * 파트 4: 쉐도잉(내가 직접 읽어보기) 시작 / 중지 토글
 */
function startEssayShadowing() {
  if (_isShadowing) {
    stopEssayShadowing();
    return;
  }

  const text = getCleanEssayText();
  if (!text) {
    toast(_currentLang === 'en'
      ? '✏️ Please write your essay first!'
      : '✏️ 먼저 에세이를 써주세요!');
    return;
  }

  if (!SpeechRecognition) {
    toast(_currentLang === 'en'
      ? '❌ Your browser does not support voice input. Please use Chrome!'
      : '❌ 이 브라우저는 음성 인식을 지원하지 않아요. 크롬을 이용해주세요!');
    return;
  }

  // 기존 TTS 재생 중이면 먼저 중지
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    stopEssayTTS();
  }

  _isShadowing = true;
  const btn = $('btnEssayShadow');
  if (btn) {
    btn.textContent = '⏹ 읽기 중지';
    btn.style.background = 'linear-gradient(135deg,#e8a44a,#c07820)';
    btn.classList.add('recording');
  }

  _shadowRecognition = new SpeechRecognition();
  _shadowRecognition.lang = 'en-US';  // 영어로 읽어야 함
  _shadowRecognition.interimResults = false;
  _shadowRecognition.maxAlternatives = 1;

  toast(_currentLang === 'en'
    ? '🎤 Start reading your essay aloud! Speak in English 📢'
    : '🎤 에세이를 크게 소리내어 읽어보세요! 영어로 읽어야 해요 📢');

  _shadowRecognition.onstart = () => {
    // 시작 성공
  };

  _shadowRecognition.onresult = (event) => {
    // 음성 인식 결과가 왔으면 → 쉐도잉 성공으로 간주
    const spoken = event.results[0][0].transcript.trim();
    if (spoken.length > 5) {
      stopEssayShadowing();
      showShadowBonusPop();
    }
  };

  _shadowRecognition.onerror = (e) => {
    stopEssayShadowing();
    if (e.error === 'no-speech') {
      toast(_currentLang === 'en'
        ? '🔇 No voice detected. Please speak louder!'
        : '🔇 목소리가 인식되지 않았어요. 더 크게 읽어보세요!');
    } else if (e.error !== 'aborted') {
      toast(_currentLang === 'en'
        ? '❌ Voice error: ' + e.error
        : '❌ 음성 인식 오류: ' + e.error);
    }
  };

  _shadowRecognition.onend = () => {
    // onresult 없이 끝났을 때 (no-speech 등) 버튼 복원
    if (_isShadowing) stopEssayShadowing();
  };

  _shadowRecognition.start();
}

/**
 * 파트 4: 쉐도잉 녹음 중지 & 버튼 복원
 */
function stopEssayShadowing() {
  _isShadowing = false;
  if (_shadowRecognition) {
    try { _shadowRecognition.abort(); } catch(e) {}
    _shadowRecognition = null;
  }
  const btn = $('btnEssayShadow');
  if (btn) {
    btn.textContent = '🎤 내가 직접 읽어보기';
    btn.style.background = 'linear-gradient(135deg,var(--mint),#4e9a8c)';
    btn.classList.remove('recording');
  }
}

/**
 * 파트 4: 쉐도잉 완료 → 축하 팝업 + 폭죽 + 보너스 잉크 +50
 */
async function showShadowBonusPop() {
  // 폭죽 애니메이션 (기존 showFireworks() 재활용)
  showFireworks();

  // 잉크 +50 지급
  await addInk(50);

  // 팝업 표시
  const pop = $('shadowBonusPop');
  if (pop) {
    pop.classList.add('show');
    // 5초 후 자동 닫기
    setTimeout(() => closeShadowBonusPop(), 5000);
  }

  toast(_currentLang === 'en'
    ? '🎉 Amazing! You read your essay out loud! +50💧 Bonus Ink!'
    : '🎉 브라보! 에세이를 직접 읽었어요! +50💧 잉크 보너스!');
}

/**
 * 파트 4: 쉐도잉 완료 팝업 닫기
 */
function closeShadowBonusPop() {
  const pop = $('shadowBonusPop');
  if (pop) pop.classList.remove('show');
}

/* ── 11. Essay 저장 / 목록 / 불러오기 ── */
async function saveEssay() {
  const text = ($('essayTextarea')?.value || '').trim();
  if (text.length < 20) { toast(_currentLang==='en' ? 'Please write a little more! ✏️' : '에세이를 좀 더 써주세요! ✏️'); return; }
  const entry = {
    id: Date.now(),
    date: dateLabel,
    topic: _currentEssayTopic?.title || (_currentLang==='en' ? 'Free topic' : '자유 주제'),
    topicData: _currentEssayTopic || null,
    text
  };
  const key   = `mdj_essays_${currentNick}`;
  const saved = (await lsGet(key)) || [];
  saved.unshift(entry);
  if (saved.length > 30) saved.pop();
  await lsSet(key, saved);
  toast(_currentLang==='en' ? '📝 Essay saved! Great work 🎉' : '📝 에세이가 저장됐어요! 수고했어요 🎉');
  renderEssayList();
}

async function renderEssayList() {
  const wrap = $('essayListWrap');
  if (!wrap) return;
  const key   = `mdj_essays_${currentNick}`;
  const saved = (await lsGet(key)) || [];
  if (!saved.length) {
    wrap.innerHTML = _currentLang==='en'
      ? '<div style="color:#ccc;font-size:13px;text-align:center;padding:20px;">No saved essays yet.<br>Write and save your first essay! 📝</div>'
      : '<div style="color:#ccc;font-size:13px;text-align:center;padding:20px;">저장된 에세이가 없어요.<br>에세이를 쓰고 저장해보세요! 📝</div>';
    return;
  }
  wrap.innerHTML = saved.map(e => `
    <div style="border:2px solid var(--border);border-radius:12px;padding:10px 12px;background:white;cursor:pointer;transition:all .15s;position:relative;"
         onmouseover="this.style.borderColor='var(--mint)';this.style.background='#f9fffe';"
         onmouseout="this.style.borderColor='var(--border)';this.style.background='white';"
         onclick="loadEssay(${e.id})">
      <div style="font-size:12px;color:var(--orange);font-weight:bold;margin-bottom:2px;">📝 ${e.topic}</div>
      <div style="font-size:11px;color:#aaa;margin-bottom:5px;">${e.date}</div>
      <div style="font-size:12px;color:#555;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.5;">
        ${e.text.replace(/[🍞🥩]/g,'').replace(/\[.*?\]/g,'').trim().slice(0,80)}…
      </div>
      <button onclick="event.stopPropagation();deleteEssay(${e.id})" class="d-del" style="position:absolute;top:8px;right:8px;">🗑️</button>
    </div>`).join('');
}

async function loadEssay(id) {
  const key   = `mdj_essays_${currentNick}`;
  const saved = (await lsGet(key)) || [];
  const entry = saved.find(e => e.id === id);
  if (!entry) return;
  const ta = $('essayTextarea');
  if (ta) ta.value = entry.text;
  _currentEssayTopic = entry.topicData || null;
  _lastEssayText = ''; _lastEssayAnalysis = null;
  const topicBox = $('essayTopicBox');
  if (topicBox) topicBox.textContent = _currentEssayTopic
    ? '🎯 ' + ((_currentLang === 'en' && _currentEssayTopic.titleEn) ? _currentEssayTopic.titleEn : _currentEssayTopic.title)
    : (_currentLang==='en' ? '🎯 Free topic' : '🎯 자유 주제');
  if (_currentEssayTopic) renderEssayChips(_currentEssayTopic);
  /* 파트 4 추가: 불러온 에세이에서도 TTS 버튼 표시 */
  const ttsRow = $('essayTtsRow');
  if (ttsRow) ttsRow.style.display = 'flex';
  toast(_currentLang==='en' ? '📖 Essay loaded!' : '📖 에세이를 불러왔어요!');
}

async function deleteEssay(id) {
  if (!confirm(_currentLang==='en' ? 'Delete this essay?' : '이 에세이를 삭제할까요?')) return;
  const key   = `mdj_essays_${currentNick}`;
  const saved = (await lsGet(key)) || [];
  const next  = saved.filter(e => e.id !== id);
  await lsSet(key, next);
  toast(_currentLang==='en' ? 'Deleted.' : '삭제됐어요.');
  renderEssayList();
}

/* ── 12. DOMContentLoaded: essayTextarea 이벤트 등록 ── */
document.addEventListener('DOMContentLoaded', () => {
  const ta = $('essayTextarea');
  if (ta) ta.addEventListener('input', onEssayInput);

  /* 파트 1: 초기 모드 설정 — 기본값은 초급(basic) */
  setEssayMode('basic');

  /* 파트 2: 팝업 외부 클릭 시 닫기 */
  document.addEventListener('click', (e) => {
    const panel = $('sosDictPanel');
    const btn   = $('sosDictBtn');
    if (panel && panel.classList.contains('open')) {
      if (!panel.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
        panel.classList.remove('open');
      }
    }
  });
});

/* ══════════════════════════════════════════════════════════
   파트 2 추가: SOS 영단어 도우미 — 미니 챗봇
   한글 단어/문장 → Claude API → 영어 단어 + 예문 즉시 반환
══════════════════════════════════════════════════════════ */
