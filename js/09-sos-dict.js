/* ============================================================
 * SOS 영단어 도우미(개별 입력창용 + 전역 플로팅 패널)
 * (분할 자동 생성 — 원본 index.html에서 추출, 로드 순서 유지 필수)
 * ============================================================ */
const _sosHistory = []; // 최근 검색 히스토리 (최대 5개)

/**
 * 파트 2: SOS 팝업 열기/닫기 토글
 */
function toggleSosDict() {
  const panel = $('sosDictPanel');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (isOpen) {
    // 열릴 때 입력창에 포커스
    setTimeout(() => $('sosInput')?.focus(), 80);
    renderSosHistory();
  }
}

/**
 * 파트 2: SOS — Claude에게 한글 단어/문장 영어 번역 요청
 */
async function askSosDict() {
  const inputEl  = $('sosInput');
  const resultEl = $('sosResultArea');
  const askBtn   = $('sosAskBtn');
  if (!inputEl || !resultEl) return;

  const query = inputEl.value.trim();
  if (!query) {
    inputEl.focus();
    return;
  }

  // 로딩 표시
  askBtn.disabled = true;
  resultEl.innerHTML = `
    <div class="sos-loading">
      <div class="sos-spinner"></div>
      <span>영어 단어 찾는 중... 🔍</span>
    </div>`;

  try {
    const raw = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You are a friendly English dictionary for Korean elementary students (ages 8-12).
When given a Korean word or short phrase, return ONLY valid JSON (no markdown, no preamble):
{
  "word": "<main English word or phrase>",
  "pronunciation": "<simple Korean pronunciation guide, e.g. 어팔러자이즈>",
  "meaning": "<brief Korean meaning, max 10 chars>",
  "example": "<simple English example sentence using this word>",
  "exampleKo": "<Korean translation of the example sentence>"
}
Rules:
- Choose the most common, child-friendly form of the word
- Example sentence must be simple enough for a 10-year-old
- word field: just the base form (e.g. "apologize", not "I apologize")`,
      messages: [{ role: 'user', content: `Korean input: "${query}"` }]
    });

    const data = parseJSON(raw);
    if (!data || !data.word) throw new Error('parse fail');

    // 히스토리에 추가 (중복 제거, 최대 5개)
    const alreadyIdx = _sosHistory.findIndex(h => h.query === query);
    if (alreadyIdx !== -1) _sosHistory.splice(alreadyIdx, 1);
    _sosHistory.unshift({ query, word: data.word });
    if (_sosHistory.length > 5) _sosHistory.pop();

    // 결과 렌더링
    resultEl.innerHTML = `
      <div class="sos-result-item">
        <div class="sos-result-word">
          📖 <span style="font-size:18px;">${escHtml(data.word)}</span>
          <span style="font-size:11px; font-weight:normal; color:#999; margin-left:2px;">${escHtml(data.pronunciation || '')}</span>
        </div>
        <div style="font-size:12px; color:#888; margin-bottom:2px;">
          🇰🇷 <b>${escHtml(query)}</b> = ${escHtml(data.meaning || '')}
        </div>
        <div class="sos-result-ex">
          ✏️ ${escHtml(data.example || '')}
        </div>
        <div class="sos-result-ex" style="color:#aaa;">
          &nbsp;&nbsp;→ ${escHtml(data.exampleKo || '')}
        </div>
        <button class="sos-insert-btn"
          onclick="sosInsertWord('${escAttr(data.word)}')">
          ＋ 에세이에 넣기
        </button>
      </div>`;

    renderSosHistory();
    inputEl.value = '';
    inputEl.focus();

  } catch(e) {
    resultEl.innerHTML = `
      <div style="color:#e55; font-size:12px; padding:4px 0;">
        😥 앗, 찾지 못했어요. 다시 시도해봐요!
      </div>`;
  } finally {
    askBtn.disabled = false;
  }
}

/**
 * 파트 2: SOS 결과 단어를 현재 활성 에세이 입력창에 삽입
 */
function sosInsertWord(word) {
  // 초급 모드면 현재 포커스된 step textarea에, 고급이면 essayTextarea에
  let ta = null;
  if (_essayMode === 'basic') {
    // 마지막으로 포커스된 step input 찾기
    const stepIds = ['essayStepIntro','essayStepBody1','essayStepBody2','essayStepConcl'];
    ta = stepIds.map(id => $(id)).find(el => el === document.activeElement) || $(stepIds[0]);
  } else {
    ta = $('essayTextarea');
  }
  if (!ta) return;

  const s = ta.selectionStart ?? ta.value.length;
  const e2 = ta.selectionEnd ?? ta.value.length;
  ta.value = ta.value.slice(0, s) + word + ta.value.slice(e2);
  const pos = s + word.length;
  ta.setSelectionRange(pos, pos);
  ta.focus();

  toast(`✅ "${word}" 를 에세이에 넣었어요!`);
  // 팝업 닫기
  $('sosDictPanel')?.classList.remove('open');
  if (_essayMode === 'advanced') onEssayInput();
}

/**
 * 파트 2: 최근 검색 히스토리 칩 렌더링
 */
function renderSosHistory() {
  const wrap = $('sosHistory');
  if (!wrap) return;
  if (_sosHistory.length === 0) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  wrap.innerHTML = _sosHistory.map(h =>
    `<button class="sos-history-chip"
       onclick="$('sosInput').value='${escAttr(h.query)}'; askSosDict();"
       title="${escHtml(h.query)} = ${escHtml(h.word)}">
       ${escHtml(h.query)}
     </button>`
  ).join('');
}

/* ══════════════════════════════════════════════════════════
   파트 3 추가: Grammar Diff — 토큰 단위 변경 부분 하이라이트
   원문(original)과 수정문(corrected)을 단어 단위로 비교하여
   추가/변경된 토큰은 .diff-highlight(초록 굵은 글씨)로 마킹
══════════════════════════════════════════════════════════ */

/**
 * 파트 3: LCS 기반 토큰 diff — 변경/추가된 단어를 초록 강조 HTML로 반환
 * @param {string} original   - 학생 원문 (문자열)
 * @param {string} corrected  - 수정된 문장 (문자열)
 * @returns {string}          - 하이라이트 HTML 문자열
 */
function buildDiffHighlight(original, corrected) {
  // 공백 기준으로 토큰화 (구두점은 단어에 붙임)
  const tokA = tokenize(original);
  const tokB = tokenize(corrected);

  // LCS(최장 공통 부분 수열) DP 테이블 구성
  const m = tokA.length, n = tokB.length;
  const dp = Array.from({length: m + 1}, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (tokA[i-1].toLowerCase() === tokB[j-1].toLowerCase()) {
        dp[i][j] = dp[i-1][j-1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
  }

  // 역추적으로 공통/변경 구간 구분
  const ops = []; // { type: 'same'|'add'|'del', text }
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokA[i-1].toLowerCase() === tokB[j-1].toLowerCase()) {
      ops.unshift({ type: 'same', text: tokB[j-1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      ops.unshift({ type: 'add', text: tokB[j-1] });
      j--;
    } else {
      ops.unshift({ type: 'del', text: tokA[i-1] });
      i--;
    }
  }

  // HTML 조립 — 변경/추가 토큰만 강조
  return ops.map(op => {
    if (op.type === 'same') return escHtml(op.text);
    if (op.type === 'add')  return `<span class="diff-highlight">${escHtml(op.text)}</span>`;
    if (op.type === 'del')  return `<span class="diff-deleted">${escHtml(op.text)}</span>`;
    return '';
  }).join(' ');
}

/** 문자열을 공백 기준 토큰 배열로 분리 */
function tokenize(str) {
  return (str || '').trim().split(/\s+/).filter(Boolean);
}

/** HTML 특수문자 이스케이프 (XSS 방지) */
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
/** 속성값용 이스케이프 */
function escAttr(s) {
  return String(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}



/* ══════════════════════════════════════════════════════════
   파트 1 추가: 글로벌 SOS 영단어 도우미 (전역 플로팅 챗봇)
   - 어떤 탭(돋움/이음/틔음/지음)에서든 작동하는 전역 영단어 도우미
   - 한글 입력 → callClaude() → 영어 단어 + 예문 반환
   - 결과 클릭 시 현재 포커스된 textarea에 텍스트 삽입
══════════════════════════════════════════════════════════ */

const _gsosHistory = []; // 최근 SOS 검색 히스토리 (최대 5개)
let _gsosPanelOpen = false;

/**
 * 파트 1: 글로벌 SOS 패널 열기/닫기 토글
 */
function toggleGlobalSos() {
  const panel = $('globalSosPanel');
  if (!panel) return;
  _gsosPanelOpen = !_gsosPanelOpen;
  panel.classList.toggle('open', _gsosPanelOpen);
  if (_gsosPanelOpen) {
    setTimeout(() => $('gsosInput')?.focus(), 80);
    renderGsosHistory();
    // 언어에 맞게 UI 갱신
    updateGsosPanelLang();
  }
}

/**
 * 파트 1: 글로벌 SOS 패널 언어 UI 갱신
 */
function updateGsosPanelLang() {
  const isEn = (_currentLang === 'en');
  const btnLabel   = $('globalSosBtnLabel');
  const panelTitle = $('gsosPanelTitle');
  const hint       = $('gsosPanelHint');
  const askLabel   = $('gsosAskBtnLabel');
  const placeholder = $('gsosPlaceholder');
  const input      = $('gsosInput');

  if (btnLabel)   btnLabel.textContent   = isEn ? "What's this in English?" : '이거 영어로 뭐예요?';
  if (panelTitle) panelTitle.textContent = isEn ? 'SOS Word Helper 🚨' : '영단어 SOS 도우미';
  if (hint) hint.innerHTML = isEn
    ? 'Type a Korean word → get the English word + example!<br>Click the result to insert it into your writing ✍️'
    : '한글로 단어나 문장을 쓰면 영어로 알려드려요!<br>결과를 클릭하면 글쓰기 창에 바로 입력돼요 ✍️';
  if (askLabel)   askLabel.textContent   = isEn ? 'Ask!' : '물어보기';
  if (placeholder) placeholder.textContent = isEn ? 'Type a Korean word here 🔍' : '모르는 단어를 한글로 써보세요 🔍';
  if (input)      input.placeholder = isEn ? 'e.g. 사과하다, 그리움...' : '예) 사과하다, 그리움...';
}

/**
 * 파트 1: 포커스된 textarea 또는 앱 내 주요 textarea 반환
 * 어떤 탭에 있든 가장 적절한 입력창에 단어를 삽입하기 위함
 */
function _getActiveTextarea() {
  // 1순위: 현재 document.activeElement가 textarea/input 이면 그것 사용
  const active = document.activeElement;
  if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT') && active.id !== 'gsosInput') {
    return active;
  }
  // 2순위: 현재 활성 앱 탭 기준으로 가장 대표적인 textarea 반환
  const activeScreen = document.querySelector('.app-screen.active');
  if (!activeScreen) return null;
  // 화면 내 textarea 중 첫 번째 (비활성화되지 않은 것)
  const tas = activeScreen.querySelectorAll('textarea:not([disabled])');
  if (tas.length > 0) return tas[0];
  return null;
}

/**
 * 파트 1: SOS 결과 단어를 현재 포커스된 textarea에 삽입
 */
function gsosInsertWord(word) {
  const ta = _getActiveTextarea();
  if (!ta) {
    toast(_currentLang === 'en' ? '✏️ Please click your writing area first!' : '✏️ 먼저 글쓰기 창을 클릭해주세요!');
    // 패널 닫기
    _gsosPanelOpen = false;
    $('globalSosPanel')?.classList.remove('open');
    return;
  }

  const s  = ta.selectionStart ?? ta.value.length;
  const e2 = ta.selectionEnd   ?? ta.value.length;
  const space = (s > 0 && ta.value[s - 1] !== ' ' && ta.value[s - 1] !== '\n') ? ' ' : '';
  ta.value = ta.value.slice(0, s) + space + word + ta.value.slice(e2);
  const pos = s + space.length + word.length;
  ta.setSelectionRange(pos, pos);
  ta.focus();

  toast(_currentLang === 'en' ? `✅ "${word}" inserted!` : `✅ "${word}" 을(를) 입력창에 넣었어요!`);
  // 패널 닫기
  _gsosPanelOpen = false;
  $('globalSosPanel')?.classList.remove('open');
}

/**
 * 파트 1: Claude에게 한글 단어/문장 영어 번역 요청
 */
async function askGlobalSos() {
  const inputEl  = $('gsosInput');
  const resultEl = $('gsosResultArea');
  const askBtn   = $('gsosAskBtn');
  if (!inputEl || !resultEl) return;

  const query = inputEl.value.trim();
  if (!query) {
    toast(_currentLang === 'en' ? '✏️ Please type a Korean word!' : '✏️ 단어를 입력해주세요!');
    return;
  }

  // 로딩 표시
  if (askBtn) { askBtn.disabled = true; askBtn.innerHTML = '<span class="gsos-spinner"></span>'; }
  resultEl.innerHTML = `<div class="gsos-loading"><div class="gsos-spinner"></div> <span>${_currentLang === 'en' ? 'Looking it up...' : '찾아보는 중...'}</span></div>`;

  try {
    const raw = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You are a bilingual English-Korean vocabulary helper for Korean elementary school students.
Given a Korean word or short phrase, return ONLY valid JSON (no markdown) with 2-3 English word suggestions.

Format:
{
  "results": [
    {
      "word": "apologize",
      "korean": "사과하다",
      "example": "I apologize to my friend.",
      "example_ko": "나는 친구에게 사과했어요."
    }
  ]
}

Rules:
- word: the most natural English word/phrase for elementary students
- korean: the Korean meaning in 2-4 syllables
- example: a SHORT, simple English sentence (max 10 words)
- example_ko: the Korean translation of the example sentence
- Provide 1-2 results max (the most useful ones)
- Use the simplest possible vocabulary for elementary school level`,
      messages: [{ role: 'user', content: `Korean input: "${query}"` }]
    });

    // 파싱
    let data;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      data = JSON.parse(clean);
    } catch {
      data = null;
    }

    if (!data || !Array.isArray(data.results) || data.results.length === 0) {
      resultEl.innerHTML = `<div style="color:#999;font-size:12px;text-align:center;padding:10px;">${_currentLang === 'en' ? 'Could not find a result. Try again!' : '결과를 찾지 못했어요. 다시 시도해보세요!'}</div>`;
      return;
    }

    // 히스토리에 추가 (최대 5개)
    const firstResult = data.results[0];
    const histEntry = { query, word: firstResult.word };
    const existIdx = _gsosHistory.findIndex(h => h.query === query);
    if (existIdx >= 0) _gsosHistory.splice(existIdx, 1);
    _gsosHistory.unshift(histEntry);
    if (_gsosHistory.length > 5) _gsosHistory.pop();

    // 결과 렌더링
    resultEl.innerHTML = data.results.map(r => {
      const wordSafe    = escHtml(r.word || '');
      const koreanSafe  = escHtml(r.korean || '');
      const exSafe      = escHtml(r.example || '');
      const exKoSafe    = escHtml(r.example_ko || '');
      // 삽입 시 "word (korean)" 형태로 넣어줌
      const insertText  = `${r.word} (${r.korean})`;
      return `
        <div class="gsos-result-item">
          <div class="gsos-result-word">
            🔤 <b>${wordSafe}</b>
            <span style="font-size:12px;color:#888;font-weight:normal;">(${koreanSafe})</span>
          </div>
          <div class="gsos-result-ex">
            📝 ${exSafe}<br>
            <span style="color:#aaa;font-style:normal;font-size:11px;">→ ${exKoSafe}</span>
          </div>
          <button class="gsos-insert-btn"
            onclick="gsosInsertWord('${escAttr(r.word)}')"
            title="${escAttr(_currentLang === 'en' ? 'Insert into writing area' : '글쓰기 창에 삽입')}">
            ✏️ ${_currentLang === 'en' ? 'Insert' : '삽입하기'}
          </button>
        </div>`;
    }).join('');

    // 히스토리 렌더링
    renderGsosHistory();

    // 입력창 초기화
    if (inputEl) inputEl.value = '';

  } catch (err) {
    resultEl.innerHTML = `<div style="color:#e55;font-size:12px;text-align:center;padding:10px;">⚠️ ${_currentLang === 'en' ? 'Error. Please try again.' : '오류가 발생했어요. 다시 시도해보세요.'}</div>`;
    console.error('[askGlobalSos]', err);
  } finally {
    if (askBtn) {
      askBtn.disabled = false;
      askBtn.innerHTML = `<span id="gsosAskBtnLabel">${_currentLang === 'en' ? 'Ask!' : '물어보기'}</span>`;
    }
  }
}

/**
 * 파트 1: 최근 검색 히스토리 칩 렌더링
 */
function renderGsosHistory() {
  const wrap = $('gsosHistory');
  if (!wrap) return;
  if (_gsosHistory.length === 0) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  wrap.innerHTML = _gsosHistory.map(h =>
    `<button class="gsos-history-chip"
       onclick="$('gsosInput').value='${escAttr(h.query)}'; askGlobalSos();"
       title="${escHtml(h.query)} → ${escHtml(h.word)}">
       ${escHtml(h.query)}
     </button>`
  ).join('');
}

/**
 * 파트 1: 앱 진입 시 글로벌 SOS 버튼 표시 / 홈에서 숨김
 * launchApp() 에서 호출됨
 */
function showGlobalSosBtn() {
  const btn = $('globalSosBtn');
  if (btn) btn.style.display = 'flex';
}
function hideGlobalSosBtn() {
  const btn = $('globalSosBtn');
  if (btn) btn.style.display = 'none';
  // 패널도 닫기
  _gsosPanelOpen = false;
  $('globalSosPanel')?.classList.remove('open');
}

/* ── 파트 1: 외부 클릭 시 글로벌 SOS 패널 닫기 ── */
document.addEventListener('click', (e) => {
  const panel = $('globalSosPanel');
  const btn   = $('globalSosBtn');
  if (panel && _gsosPanelOpen) {
    if (!panel.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
      _gsosPanelOpen = false;
      panel.classList.remove('open');
    }
  }
});

/* ══════════════════════════════════════
   🌐 언어 선택 (한국어 / 영어)
══════════════════════════════════════ */
