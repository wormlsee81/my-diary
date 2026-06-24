/* ════════════════════════════════════════════════════════════
 * 12-ieum-review.js
 * 감상문 쓰기 (Review) 모듈 — 돋움 / 이음 / 지음 3단계 완전 연동
 *
 *  ① 돋움(dodumApp): 인물의 뇌구조도 + 나와 주인공 벤 다이어그램
 *  ② 이음(ieumApp):  사실/생각 분리 글쓰기 + AI 꼬리질문 + 단어칩 보상
 *  ③ 지음(jieumApp): 신문 기사형 / 상장 수여형 출판 + JPG·PDF 저장
 *
 *  이 파일은 03/08/10-i18n.js 가 모두 로드된 "뒤"에 실행되어야 하므로
 *  index.html의 <script> 목록 맨 끝(11-teacher-extras.js 다음)에 둔다.
 *  (switchIeumTab·setLang은 이미 정의된 함수를 감싸서 확장하고,
 *   switchTab은 기존에 정의되어 있지 않던 함수라 새로 정의한다 — 하단 ⑥ 참고)
 * ════════════════════════════════════════════════════════════ */

/* SK에 감상문 저장 키 추가 (mdj_review_<닉네임>) */
SK.review = u => `mdj_review_${u}`;

/* 감상문에 쓰면 좋은 감각어/감정어 후보 풀 — 매번 5개씩 랜덤 노출 */
const REVIEW_WORD_POOL = [
  '뭉클한', '흥미진진한', '아쉬웠다', '통쾌한', '손에 땀을 쥐는',
  '감동적인', '놀라웠다', '후련했다', '안타까웠다', '벅찼다',
  '짜릿한', '뿌듯했다', '울컥했다', '설레는'
];

let _rvCurrentChips = [];     // 이번 세션에 노출된 단어칩 5개
let _rvLastReview = null;     // 마지막으로 저장된 감상문 데이터 (지음 단계에서 사용)
let _rvFactDebounceTimer = null;
let _rvLastFactAsked = '';    // 같은 내용으로 중복 질문 방지
let _rvExportHtmlCache = '';  // PDF 저장용 — 마지막으로 렌더링한 템플릿 HTML 원본

/* ════════════════════════════════════════════════════════════
 * ① 돋움(dodumApp) — 감상 브레인맵 탭
 * ════════════════════════════════════════════════════════════ */

/* DODUM_TABS/DODUM_TAB_GOALS는 03-dodum.js에서 const로 선언되어 있지만
   const는 "재할당"만 막을 뿐 배열/객체 내부 변경(push, 속성 추가)은 가능하다.
   → switchDodumTab()을 건드리지 않고 안전하게 탭을 하나 추가할 수 있다. */
if (typeof DODUM_TABS !== 'undefined' && !DODUM_TABS.includes('review')) {
  DODUM_TABS.push('review');
}
if (typeof DODUM_TAB_GOALS !== 'undefined') {
  DODUM_TAB_GOALS.review = '💡 인물의 생각을 정리하고, 나와 비교해보며 감상문 아이디어를 모아보세요!';
}

/* 1. 인물의 뇌구조도 — AI 피드백 */
async function rvSubmitBrainMap() {
  const core = ($('rvBrainCore')?.value || '').trim();
  const p1 = ($('rvBrainP1')?.value || '').trim();
  const p2 = ($('rvBrainP2')?.value || '').trim();
  const p3 = ($('rvBrainP3')?.value || '').trim();
  if (!core || !p1 || !p2 || !p3) { toast('빈 칸을 모두 채워주세요! ✏️'); return; }

  const btn = $('rvBrainSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = '🤖 AI 선생님이 읽고 있어요...'; }
  try {
    const raw = await callClaude({
      model: 'claude-haiku-4-5-20251001', max_tokens: 300,
      system: '너는 독서/영화 지도 교사야. 학생이 작성한 인물의 뇌구조(가장 큰 생각 1개, 주변 생각 3개)를 보고, 인물의 심리를 잘 파악했다고 칭찬해. 그리고 "이 생각을 일기장(감상문)에 적어보면 어떨까?"라며 3문장 이내의 다정한 말투로 조언해줘. 출력은 반드시 {"feedback": "..."} 형태의 JSON으로 해.',
      messages: [{ role: 'user', content: `가장 큰 핵심 생각: ${core}\n주변 생각 1: ${p1}\n주변 생각 2: ${p2}\n주변 생각 3: ${p3}` }]
    });
    const cleaned = (raw || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = parseJSON(cleaned);
    if (!data) console.warn('[rvSubmitBrainMap] JSON 파싱 실패, 원본:', raw);
    const feedback = data?.feedback || '생각을 참 잘 정리했어요! 이 생각을 감상문에 적어보면 어떨까요? 😊';

    $('rvBrainFeedbackBox').style.display = 'block';
    $('rvBrainFeedbackText').textContent = feedback;
    $('rvBrainSendBtn').style.display = 'inline-block';
    $('rvBrainSendBtn').dataset.payload =
      `${core}. ${[p1, p2, p3].filter(Boolean).join(', ')}.`;
    await addInk(10);
  } catch (e) {
    toast('AI 선생님과 연결이 잠시 끊겼어요 😢 다시 시도해주세요.');
    console.warn('[rvSubmitBrainMap]', e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🤖 AI 선생님께 보여주기'; }
  }
}

function rvSendBrainToIeum() {
  const text = $('rvBrainSendBtn')?.dataset.payload || '';
  rvSendToIeum(text, '인물의 뇌구조도');
}

/* 2. 나와 주인공 벤 다이어그램 — AI 비교 문장 추천 */
async function rvSubmitVenn() {
  const charT = ($('rvVennChar')?.value || '').trim();
  const meT = ($('rvVennMe')?.value || '').trim();
  const commonT = ($('rvVennCommon')?.value || '').trim();
  if (!charT || !meT || !commonT) { toast('세 칸을 모두 채워주세요! ✏️'); return; }

  const btn = $('rvVennSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = '🤖 멋진 문장을 만들고 있어요...'; }
  try {
    const raw = await callClaude({
      model: 'claude-haiku-4-5-20251001', max_tokens: 300,
      system: '학생이 입력한 벤 다이어그램(주인공 특징, 나의 특징, 공통점) 데이터를 바탕으로, 감상문에 바로 활용할 수 있는 멋진 비교/공감 문장 1개를 만들어줘. 출력은 반드시 {"suggestedSentence": "...", "feedback": "..."} 형태의 JSON으로 해.',
      messages: [{ role: 'user', content: `주인공 특징: ${charT}\n나의 특징: ${meT}\n공통점: ${commonT}` }]
    });
    const cleaned = (raw || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = parseJSON(cleaned);
    if (!data) console.warn('[rvSubmitVenn] JSON 파싱 실패, 원본:', raw);
    const feedback = data?.feedback || '주인공과 나의 공통점을 참 잘 찾았어요! 😊';
    const sentence = data?.suggestedSentence || `나도 ${charT.split(/[,.\s]/)[0] || '주인공'}처럼 ${commonT}을 느낄 때가 있다.`;

    $('rvVennFeedbackBox').style.display = 'block';
    $('rvVennFeedbackText').textContent = feedback;
    $('rvVennSentenceBox').textContent = `💬 추천 문장: “${sentence}”`;
    $('rvVennSendBtn').style.display = 'inline-block';
    $('rvVennSendBtn').dataset.payload = sentence;
    await addInk(10);
  } catch (e) {
    toast('AI 선생님과 연결이 잠시 끊겼어요 😢 다시 시도해주세요.');
    console.warn('[rvSubmitVenn]', e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🤖 멋진 문장 만들기'; }
  }
}

function rvSendVennToIeum() {
  const text = $('rvVennSendBtn')?.dataset.payload || '';
  rvSendToIeum(text, '벤 다이어그램 비교 문장');
}

/* 돋움 → 이음 데이터 전송 (같은 페이지 안에 두 화면이 모두 떠 있으므로
   바로 reviewThought 텍스트창에 이어붙인다) */
function rvSendToIeum(text, sourceLabel) {
  if (!text) { toast('보낼 내용이 없어요!'); return; }
  const ta = $('reviewThought');
  if (ta) {
    ta.value = ta.value.trim() ? `${ta.value.trim()}\n${text}` : text;
  }
  const box = $('reviewDodumReceived');
  if (box) {
    box.innerHTML = `✅ <b>[${sourceLabel}]</b>에서 받은 내용이 ②번 칸에 추가되었어요!`;
  }
  toast(`💌 [이음] 탭 → 감상문 쓰기로 보냈어요! 확인해보세요 😊`);
}

/* ════════════════════════════════════════════════════════════
 * ② 이음(ieumApp) — 감상문 쓰기 탭
 * ════════════════════════════════════════════════════════════ */

/* switchIeumTab은 08-ieum-essay.js에서 처음 정의된 뒤
   11-teacher-extras.js에서 한 번 더 감싸여 'peer' 탭이 추가된 상태다.
   여기서 그 최종 버전을 다시 한번 감싸 'review' 탭을 추가한다
   (기존 함수 본문은 절대 수정하지 않음 — 11-teacher-extras.js와 동일한 패턴). */
const _origSwitchIeumTab_review = switchIeumTab;
switchIeumTab = function (tab) {
  _origSwitchIeumTab_review(tab);
  const content = $('ieumContent_review');
  const btn = $('ieumTab_review');
  if (content) content.style.display = (tab === 'review') ? 'flex' : 'none';
  if (btn) btn.classList.toggle('active', tab === 'review');
  if (tab === 'review') rvInitIeumReview();
};

function rvInitIeumReview() {
  if (!_rvCurrentChips.length) rvRenderChips();
  // 새로고침 등으로 입력칸이 비어있을 때만 저장된 초안을 복원 (작성 중인 내용을 덮어쓰지 않음)
  const factEmpty = !($('reviewFact')?.value || '').trim();
  const thoughtEmpty = !($('reviewThought')?.value || '').trim();
  if (factEmpty && thoughtEmpty && currentNick) {
    lsGet(SK.review(currentNick)).then(saved => {
      if (!saved) return;
      _rvLastReview = saved;
      if ($('reviewTitleInput')) $('reviewTitleInput').value = saved.title || '';
      if ($('reviewCharInput')) $('reviewCharInput').value = saved.character || '';
      if ($('reviewFact')) $('reviewFact').value = saved.fact || '';
      if ($('reviewThought')) $('reviewThought').value = saved.thought || '';
      if ($('reviewFinalText')) $('reviewFinalText').value = saved.finalText || '';
    }).catch(() => {});
  }
}

function rvRenderChips() {
  const box = $('reviewChips');
  if (!box) return;
  _rvCurrentChips = [...REVIEW_WORD_POOL].sort(() => Math.random() - 0.5).slice(0, 5);
  box.innerHTML = _rvCurrentChips
    .map(w => `<button class="rv-chip" onclick="rvInsertChip('${w}')">${w}</button>`)
    .join('');
}

function rvInsertChip(word) {
  const ta = $('reviewFinalText');
  if (!ta) return;
  const s = ta.selectionStart ?? ta.value.length, e2 = ta.selectionEnd ?? ta.value.length;
  const insertText = (s > 0 && ta.value[s - 1] && !/\s/.test(ta.value[s - 1])) ? ` ${word}` : word;
  ta.value = ta.value.slice(0, s) + insertText + ta.value.slice(e2);
  const p = s + insertText.length;
  ta.setSelectionRange(p, p);
  ta.focus();
}

/* 사실(reviewFact) 입력 3초 후 AI 꼬리질문 — 디바운스 */
function rvOnFactInput() {
  clearTimeout(_rvFactDebounceTimer);
  rvSetTeacher('idle');
  _rvFactDebounceTimer = setTimeout(rvAskFollowup, 3000);
}

async function rvAskFollowup() {
  const text = ($('reviewFact')?.value || '').trim();
  if (text.length < 5 || text === _rvLastFactAsked) return;
  _rvLastFactAsked = text;
  rvSetTeacher('thinking');
  try {
    const raw = await callClaude({
      model: 'claude-haiku-4-5-20251001', max_tokens: 80,
      system: '학생이 방금 작성한 \'가장 기억에 남는 장면\' 텍스트를 읽고, 학생의 감정이나 상상력을 끌어내는 30자 이내의 짧은 열린 질문 딱 1개만 던져줘. (예: "만약 네가 주인공이었다면 그 순간 어떤 선택을 했을까?") 텍스트로만 반환해.',
      messages: [{ role: 'user', content: text }]
    });
    const q = (raw || '').replace(/```/g, '').replace(/^["'\s]+|["'\s]+$/g, '').trim();
    rvSetTeacher('question', q || '그 장면에서 어떤 마음이 들었어?');
  } catch (e) {
    console.warn('[rvAskFollowup]', e);
    rvSetTeacher('idle');
  }
}

function rvSetTeacher(state, msg) {
  const face = $('reviewTeacherFace'), box = $('reviewTeacherMsg');
  if (!face || !box) return;
  if (state === 'thinking') {
    face.textContent = '🤔';
    box.innerHTML = `<span class="teacher-hi">감상문 선생님</span><br>음... 좋은 질문을 생각하고 있어요!`;
  } else if (state === 'question') {
    face.textContent = '💡';
    box.innerHTML = `<span class="teacher-hi">감상문 선생님</span><br><b style="color:var(--review);">${msg}</b>`;
  } else {
    face.textContent = '📖';
    box.innerHTML = `<span class="teacher-hi">감상문 선생님</span><br>인상 깊은 장면을 적어보면, 생각을 더 깊게 만들어줄 질문을 드릴게요! 😊`;
  }
}

/* 사실 + 생각 → 감상문 한 편으로 합치기 */
function rvMergeReview() {
  const fact = ($('reviewFact')?.value || '').trim();
  const thought = ($('reviewThought')?.value || '').trim();
  if (!fact && !thought) { toast('①, ② 칸에 내용을 먼저 써주세요! ✏️'); return; }
  const CONNECTORS = ['이 장면에서 나는,', '그 순간 나는,', '이 부분을 보면서 나는,', '그래서 나는,'];
  const conn = CONNECTORS[Math.floor(Math.random() * CONNECTORS.length)];
  let merged = fact;
  if (thought) merged += (merged ? `\n\n${conn} ` : `${conn} `) + thought;
  const ta = $('reviewFinalText');
  if (ta) ta.value = merged.trim();
  toast('📎 감상문으로 합쳤어요! 자유롭게 다듬어보세요 ✍️');
}

/* 감상문 완성하기 — 단어칩 사용 보상 + 저장 */
async function rvSubmitReview() {
  const finalText = ($('reviewFinalText')?.value || '').trim();
  if (finalText.length < 10) { toast('③번 칸의 감상문 내용을 좀 더 써주세요! ✏️'); return; }

  const usedWords = _rvCurrentChips.filter(w => finalText.includes(w));
  const btnRect = $('reviewSubmitBtn')?.getBoundingClientRect();
  if (usedWords.length) {
    await addInk(usedWords.length * 50, btnRect ? btnRect.x + btnRect.width / 2 : undefined, btnRect ? btnRect.y : undefined);
    showFireworks();
    toast(`🎉 추천 단어 ${usedWords.length}개를 사용했어요! 잉크 +${usedWords.length * 50}💧`);
  } else {
    toast('💾 감상문을 저장했어요! (추천 단어를 쓰면 잉크를 더 받을 수 있어요)');
  }

  const data = {
    title: ($('reviewTitleInput')?.value || '').trim(),
    character: ($('reviewCharInput')?.value || '').trim(),
    fact: ($('reviewFact')?.value || '').trim(),
    thought: ($('reviewThought')?.value || '').trim(),
    finalText,
    savedAt: Date.now()
  };
  _rvLastReview = data;
  try { await lsSet(SK.review(currentNick), data); } catch (e) { console.warn('[rvSubmitReview] 저장 실패', e); }

  setTimeout(() => toast('✅ [지음] 탭에서 신문이나 상장으로 만들어보세요! 🗞️🏆'), 1600);
}

/* ════════════════════════════════════════════════════════════
 * ③ 지음(jieumApp) — 감상문 출판 탭 (신문 기사형 / 상장 수여형)
 * ════════════════════════════════════════════════════════════ */

/* ⚠️ index.html에는 onclick="switchTab('book'/'poem')"이 있고
   02-core-utils.js의 launchApp()도 switchTab('book')을 호출하지만,
   업로드된 어떤 파일에도 switchTab 함수 자체가 정의되어 있지 않다 (기존 버그).
   여기서 책/시화/감상문 3개 탭을 모두 처리하는 switchTab을 새로 정의해
   기존 버그를 함께 고치고 감상문 탭을 추가한다. */
function switchTab(tab) {
  const TABS = {
    book: { btn: 'tabBook', content: 'tabContentBook' },
    poem: { btn: 'tabPoem', content: 'tabContentPoem' },
    review: { btn: 'tabReview', content: 'tabContentReview' }
  };
  Object.keys(TABS).forEach(t => {
    const btn = $(TABS[t].btn), content = $(TABS[t].content);
    if (btn) btn.classList.toggle('active', t === tab);
    if (content) content.classList.toggle('active', t === tab);
  });
  const bookBtns = ['bookSaveBtn', 'bookJpgBtn', 'bookPrintBtn', 'bookLoadBtn', 'bookResetBtn'];
  const poemBtns = ['poemSaveBtn', 'poemPrintBtn', 'poemLoadBtn', 'poemResetBtn'];
  const reviewBtns = ['reviewJpgBtn', 'reviewPdfBtn'];
  bookBtns.forEach(id => { const e = $(id); if (e) e.style.display = (tab === 'book') ? '' : 'none'; });
  poemBtns.forEach(id => { const e = $(id); if (e) e.style.display = (tab === 'poem') ? '' : 'none'; });
  reviewBtns.forEach(id => { const e = $(id); if (e) e.style.display = (tab === 'review' && _rvExportHtmlCache) ? '' : 'none'; });
  if (tab === 'review') rvInitJieumReview();
}

async function rvInitJieumReview() {
  if (!_rvLastReview && currentNick) {
    try { _rvLastReview = await lsGet(SK.review(currentNick)); } catch (e) { /* no-op */ }
  }
  const summary = $('reviewSourceSummary');
  if (!summary) return;
  if (_rvLastReview && _rvLastReview.finalText) {
    const snippet = _rvLastReview.finalText.length > 60
      ? _rvLastReview.finalText.slice(0, 60) + '...'
      : _rvLastReview.finalText;
    summary.innerHTML =
      `📚 <b>${_rvLastReview.title || '(제목 없음)'}</b> / 🧑 ${_rvLastReview.character || '(주인공 없음)'}<br>` +
      `<span style="color:#9a8a70;">"${snippet}"</span>`;
  } else {
    summary.textContent = '먼저 [이음] 탭에서 감상문을 완성해주세요! ✍️';
  }
}

function rvRequireReview() {
  if (!_rvLastReview || !_rvLastReview.finalText) {
    toast('먼저 [이음] 탭에서 감상문을 완성해주세요! ✍️');
    return null;
  }
  return _rvLastReview;
}

function rvShowExportPlaceholder(show) {
  const ph = $('reviewPlaceholder');
  if (ph) ph.style.display = show ? '' : 'none';
}

/* 3-A. 신문 기사형 */
async function rvGenerateNewspaper() {
  const rv = rvRequireReview();
  if (!rv) return;
  showOverlay('신문 기사를 작성하는 중...');
  try {
    const raw = await callClaude({
      model: 'claude-haiku-4-5-20251001', max_tokens: 700,
      system: `너는 어린이 신문 기자야. 학생이 쓴 독서·영화 감상문을 읽고 신문 보도기사처럼 재작성해줘.
- 모든 문장은 "~했습니다", "~라고 밝혔습니다"처럼 기사체 말투로 끝나야 해.
- 학생의 의견이나 느낀 점은 버리지 말고 "본지 평론가 ○○ 학생"의 인터뷰로 직접 인용해서 살려줘.
- 학생이 알려준 책/영화 제목과 주인공 이름을 기사에 자연스럽게 포함해.
- 출력은 반드시 아래 JSON 형식으로만 해 (마크다운, 코드블록 금지):
{"headline":"<12~22자 헤드라인>","lead":"<기사 첫 요약 문장 1개>","body":"<기사 본문 2~3문단, 문단 사이는 \\n\\n으로 구분>","quote":"<학생 의견을 살린 인터뷰 인용문 1~2문장>","scenePromptEn":"<삽화용 영어 장면 묘사 1문장. 인물의 행동과 배경 중심으로, 글자는 절대 포함하지 말 것>"}`,
      messages: [{ role: 'user', content: `책/영화 제목: ${rv.title || '(제목 없음)'}\n주인공 이름: ${rv.character || '(이름 없음)'}\n학생 이름: ${currentNick}\n감상문 내용:\n${rv.finalText}` }]
    });
    const cleaned = (raw || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = parseJSON(cleaned);
    if (!data) { console.warn('[rvGenerateNewspaper] JSON 파싱 실패, 원본:', raw); throw new Error('AI 응답을 이해하지 못했어요'); }

    $('overlayMsg').textContent = '신문 삽화를 그리는 중...';
    let imgB64 = null;
    try {
      imgB64 = await generateDalle(
        `${data.scenePromptEn || (rv.character + ' in a dramatic story scene')}. Vintage retro newspaper sketch illustration, black and white pen-and-ink line art, halftone dot print texture.`,
        5, null, true
      );
    } catch (e) { console.warn('[rvGenerateNewspaper] 삽화 생성 실패', e); }

    rvRenderNewspaper(data, imgB64, rv);
  } catch (e) {
    toast('기사 생성에 실패했어요: ' + e.message);
    console.warn('[rvGenerateNewspaper]', e);
  } finally {
    hideOverlay();
  }
}

function rvRenderNewspaper(data, imgB64, rv) {
  const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const bodyParas = (data.body || '').split(/\n\n+/).filter(Boolean)
    .map(p => `<p style="margin:0 0 10px;">${p}</p>`).join('');
  const html = `<div style="display:flex;justify-content:center;"><div style="width:440px;background:#fdf8ef;font-family:'Jua',sans-serif;padding:0;margin:0;border:3px double #5a4632;box-sizing:border-box;">
    <div style="display:flex;justify-content:space-between;padding:6px 16px;border-bottom:1.5px solid #5a4632;font-size:10px;color:#7a6a55;">
      <span>이음일보</span><span>${dateStr}</span>
    </div>
    <div style="text-align:center;padding:10px 16px 8px;border-bottom:4px solid #1a1410;">
      <div style="font-family:'NanumHyejun','Jua',sans-serif;font-weight:900;font-size:30px;color:#1a1410;letter-spacing:2px;">이 음 일 보</div>
      <div style="font-size:10px;color:#9a8a70;margin-top:2px;">우리들의 독서·영화 감상 신문</div>
    </div>
    <div style="padding:14px 18px 6px;">
      <div style="font-size:20px;font-weight:900;color:#1a1410;line-height:1.4;word-break:keep-all;">${data.headline || ''}</div>
      <div style="font-size:11px;color:#888;margin-top:6px;">이음 기자 ${currentNick} 학생 ${rv.title ? `| 『${rv.title}』 리뷰` : ''}</div>
    </div>
    ${imgB64 ? `<div style="padding:0 18px;"><img src="${imgB64}" style="width:100%;border:2px solid #1a1410;display:block;filter:grayscale(.15);"></div>
    <div style="padding:4px 18px 0;font-size:9px;color:#aaa;text-align:right;">▲ ${rv.character || '주인공'}의 모습을 그린 본지 삽화</div>` : ''}
    <div style="padding:12px 18px;font-size:13.5px;line-height:1.85;color:#2a2420;word-break:keep-all;">
      <p style="margin:0 0 10px;font-weight:bold;">${data.lead || ''}</p>
      ${bodyParas}
    </div>
    ${data.quote ? `<div style="margin:0 18px 16px;padding:10px 14px;background:#f0ebe0;border-left:4px solid #5a4632;font-size:12.5px;color:#4a3e30;line-height:1.7;">
      “${data.quote}”<br><span style="font-size:10px;color:#9a8a70;">— 본지 평론가 ${currentNick} 학생</span>
    </div>` : ''}
    <div style="padding:6px 18px 14px;border-top:1.5px solid #5a4632;font-size:9px;color:#aaa;text-align:center;">이음 AI 그림일기장 · 감상문 출판 코너</div>
  </div></div>`;
  rvCommitExport(html);
}

/* 3-B. 상장 수여형 */
async function rvGenerateCertificate() {
  const rv = rvRequireReview();
  if (!rv) return;
  showOverlay('상장 문구를 만드는 중...');
  try {
    const raw = await callClaude({
      model: 'claude-haiku-4-5-20251001', max_tokens: 400,
      system: `너는 따뜻한 말솜씨를 가진 시상식 진행자야. 학생이 쓴 독서·영화 감상문을 읽고, 그 이야기의 주인공에게 수여하는 '상장 문구'로 재작성해줘.
- 격식있는 상장 말투를 쓰고, 문구의 마지막은 반드시 "~하였으므로 이 상장을 수여합니다." 형태로 끝나야 해.
- 학생이 감상문에서 느낀 감동이나 배운 점을 문구 속에 자연스럽게 녹여 넣어줘.
- 출력은 반드시 아래 JSON 형식으로만 해 (마크다운, 코드블록 금지):
{"awardTitle":"<4~6자 상장 이름, 예: 감동상/우정상/용기상>","citation":"<상장 본문 2~4문장. '~하였으므로 이 상장을 수여합니다.'로 끝남>"}`,
      messages: [{ role: 'user', content: `책/영화 제목: ${rv.title || '(제목 없음)'}\n주인공 이름: ${rv.character || '주인공'}\n감상문 내용:\n${rv.finalText}` }]
    });
    const cleaned = (raw || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = parseJSON(cleaned);
    if (!data) { console.warn('[rvGenerateCertificate] JSON 파싱 실패, 원본:', raw); throw new Error('AI 응답을 이해하지 못했어요'); }
    rvRenderCertificate(data, rv);
  } catch (e) {
    toast('상장 생성에 실패했어요: ' + e.message);
    console.warn('[rvGenerateCertificate]', e);
  } finally {
    hideOverlay();
  }
}

function rvRenderCertificate(data, rv) {
  const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const html = `<div style="display:flex;justify-content:center;"><div style="width:400px;height:540px;background:#fffdf5;font-family:'Jua',sans-serif;padding:26px;box-sizing:border-box;position:relative;border:10px solid #c9a648;outline:2px solid #8a6d1f;outline-offset:-22px;display:flex;flex-direction:column;align-items:center;text-align:center;">
    <div style="position:absolute;top:14px;left:14px;font-size:18px;color:#c9a648;">✦</div>
    <div style="position:absolute;top:14px;right:14px;font-size:18px;color:#c9a648;">✦</div>
    <div style="position:absolute;bottom:14px;left:14px;font-size:18px;color:#c9a648;">✦</div>
    <div style="position:absolute;bottom:14px;right:14px;font-size:18px;color:#c9a648;">✦</div>

    <div style="font-size:12px;color:#8a6d1f;letter-spacing:6px;margin-top:14px;">A W A R D</div>
    <div style="font-family:'NanumHyejun','Jua',sans-serif;font-weight:900;font-size:38px;color:#5a4310;margin:6px 0 4px;">상　장</div>
    <div style="font-size:14px;color:#a8842a;margin-bottom:16px;">${data.awardTitle || '감동상'}</div>

    <div style="font-size:21px;font-weight:bold;color:#1a1410;margin:8px 0 4px;border-bottom:2px solid #c9a648;padding-bottom:6px;">${rv.character || '주인공'}</div>

    <div style="flex:1;display:flex;align-items:center;padding:14px 6px;">
      <div style="font-size:13.5px;line-height:2;color:#3a2f20;word-break:keep-all;">${data.citation || ''}</div>
    </div>

    <div style="width:100%;display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px;font-size:11.5px;color:#6a5a40;">
      <span>${dateStr}</span>
      <span style="display:flex;align-items:center;gap:6px;">이음 출판사 대표 <b style="font-size:15px;color:#5a4310;">${currentNick}</b>
        <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:2px solid #c0392b;border-radius:50%;color:#c0392b;font-size:9px;font-weight:bold;transform:rotate(-10deg);">認</span>
      </span>
    </div>
  </div></div>`;
  rvCommitExport(html);
}

function rvCommitExport(html) {
  _rvExportHtmlCache = html;
  const area = $('exportArea');
  if (area) area.innerHTML = html;
  rvShowExportPlaceholder(false);
  const jpgBtn = $('reviewJpgBtn'), pdfBtn = $('reviewPdfBtn');
  if (jpgBtn) jpgBtn.style.display = '';
  if (pdfBtn) pdfBtn.style.display = '';
}

/* JPG 저장 — 이미 화면에 떠 있는 #exportArea를 그대로 캡처 (기존 html2canvas 패턴 재사용) */
async function rvExportJpg() {
  const el = $('exportArea');
  if (!el || !el.innerHTML.trim()) { toast('먼저 신문이나 상장을 만들어주세요! 🗞️🏆'); return; }
  showOverlay('이미지로 저장하는 중...');
  try {
    await sleep(150);
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false });
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `감상문_${currentNick}_${Date.now()}.jpg`;
      a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(() => { try { document.body.removeChild(a); } catch (e) {} URL.revokeObjectURL(url); }, 1000);
    }, 'image/jpeg', 0.93);
    toast('🖼️ JPG로 저장했어요!');
  } catch (e) {
    toast('이미지 저장에 실패했어요: ' + e.message);
    console.warn('[rvExportJpg]', e);
  } finally {
    hideOverlay();
  }
}

/* PDF 저장 — 기존 buildPDF() 재사용 (01-core-init.js) */
async function rvExportPdf() {
  if (!_rvExportHtmlCache) { toast('먼저 신문이나 상장을 만들어주세요! 🗞️🏆'); return; }
  showOverlay('PDF로 저장하는 중...');
  try {
    const doc = await buildPDF([{ html: _rvExportHtmlCache }]);
    doc.save(`감상문_${currentNick}_${Date.now()}.pdf`);
    toast('📄 PDF로 저장했어요!');
  } catch (e) {
    toast('PDF 저장에 실패했어요: ' + e.message);
    console.warn('[rvExportPdf]', e);
  } finally {
    hideOverlay();
  }
}

/* ════════════════════════════════════════════════════════════
 * ④ 언어 모드 연동 — 감상문은 한국어 독서/영화 감상 활동이므로
 *    영어 모드(_currentLang==='en')에서는 탭을 숨긴다.
 * ════════════════════════════════════════════════════════════ */
function rvApplyLangVisibility() {
  const isEn = (typeof _currentLang !== 'undefined') && _currentLang === 'en';
  const ids = ['dodumTab_review', 'ieumTab_review', 'tabReview'];
  ids.forEach(id => { const e = $(id); if (e) e.style.display = isEn ? 'none' : ''; });
  // 영어 모드로 바뀌었는데 감상문 탭이 활성 상태였다면 기본 탭으로 되돌린다
  if (isEn) {
    if ($('ieumTab_review')?.classList.contains('active')) switchIeumTab('diary');
    if ($('tabReview')?.classList.contains('active')) switchTab('book');
  }
}

if (typeof setLang === 'function') {
  const _origSetLang_review = setLang;
  setLang = function (lang) {
    _origSetLang_review(lang);
    rvApplyLangVisibility();
  };
}
/* 페이지 로드 시점의 기본 언어(ko)에 맞춰 한 번 적용 */
rvApplyLangVisibility();
