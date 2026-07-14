/* ============================================================
   13-writing-games.js — 글쓰기 게이미피케이션 확장 모듈 (신규)
   ─ 로드 순서: 12-ieum-review.js 뒤, 반드시 마지막에 로드
   ─ 기존 파일 수정 없음. UI(빙고판·게임 런처·모달·CSS)는
     이 파일이 스스로 DOM에 주입한다.

   포함 게임
     ① 오감 빙고        : 그림일기 실시간 표현 감지 (API 비용 0)
     ② 펫 단어 편식     : 일일 표현 미션, saveDiary 후킹
     ③ 맞춤법 몬스터 사냥: 개인화 오답(spellingAdvice) 기반 (haiku 판정)
     ④ 문장 늘리기 콤보  : 문장 확장 훈련 (haiku 판정)

   기존 API 연동 (실코드 확인 완료)
     - callClaude(body)               : 01-core-init.js / 텍스트 반환
     - addInk(n) / addPetExp / petSay : 02-core-utils.js (async)
     - addBadge('한글이름')           : 04-ieum-diary.js (async)
     - BADGE_INFO {이름: 요소id}      : 04-ieum-diary.js (런타임 등록)
     - getEntries() / currentNick     : 일기 데이터 (localforage)
     - showFireworks / toast / $ / parseJSON

   설계 원칙 (교육학적 근거)
     - 결과(richness)가 아닌 '과정(전략 사용)'에 보상
     - 일일 게임 잉크 상한 150 → 본 활동 가치 보호
     - 경쟁 없음: 빙고·수집·콤보 등 자기 기준 완성형만 사용
     - 보상 시 정보적 피드백 동반 (자기결정성 이론)
   ============================================================ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     0. 공용 유틸 — 기존 전역 함수 안전 래퍼
     ══════════════════════════════════════════════════════════ */

  const WG_INK_DAILY_CAP = 150;   // 게임으로 얻는 잉크 일일 상한
  const WG_MODEL = 'claude-haiku-4-5-20251001'; // 코드베이스 공통 모델

  function wg$(id) {
    return (typeof $ === 'function') ? $(id) : document.getElementById(id);
  }

  function wgToast(msg) {
    if (typeof toast === 'function') toast(msg);
    else console.log('[writing-games]', msg);
  }

  function wgNick() {
    try { return (typeof currentNick !== 'undefined' && currentNick) ? currentNick : 'guest'; }
    catch (e) { return 'guest'; }
  }

  function wgToday() {
    return new Date().toISOString().slice(0, 10);
  }

  /* 게임 상태는 닉네임별 localStorage 키로 분리 (공용 기기 대응) */
  function wgKey(base) {
    return base + '_' + wgNick();
  }

  function wgLoad(base, fallback) {
    try {
      const raw = localStorage.getItem(wgKey(base));
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function wgSave(base, val) {
    try { localStorage.setItem(wgKey(base), JSON.stringify(val)); } catch (e) {}
  }

  function wgEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** 일일 상한이 적용된 잉크 지급. 실제 지급량 반환 */
  function wgAddInk(amount, reason) {
    const s = wgLoad('mdj_wg_ink', { date: '', total: 0 });
    const today = wgToday();
    if (s.date !== today) { s.date = today; s.total = 0; }

    const remain = WG_INK_DAILY_CAP - s.total;
    if (remain <= 0) {
      wgToast('오늘 게임 잉크는 다 모았어요! 내일 또 만나요 🌙');
      return 0;
    }
    const grant = Math.min(amount, remain);
    s.total += grant;
    wgSave('mdj_wg_ink', s);

    if (typeof addInk === 'function') {
      try { addInk(grant); } catch (e) {}
    }
    wgToast('잉크 +' + grant + '! ' + (reason || ''));
    return grant;
  }

  function wgInkStatus() {
    const s = wgLoad('mdj_wg_ink', { date: '', total: 0 });
    return (s.date === wgToday()) ? s.total : 0;
  }

  function wgPetSay(msg) {
    if (typeof petSay === 'function') { try { petSay(msg); return; } catch (e) {} }
    wgToast(msg);
  }

  function wgAddPetExp(n) {
    if (typeof addPetExp === 'function') { try { addPetExp(n); } catch (e) {} }
  }

  function wgFireworks() {
    if (typeof showFireworks === 'function') { try { showFireworks(); } catch (e) {} }
  }

  /* ── 뱃지 4종: 기존 addBadge('한글 이름') + BADGE_INFO 등록 ── */
  const WG_BADGES = [
    { name: '빙고 마스터', el: 'badge_wg1' },
    { name: '펫 미식가',   el: 'badge_wg2' },
    { name: '몬스터 헌터', el: 'badge_wg3' },
    { name: '문장 마법사', el: 'badge_wg4' }
  ];

  function wgRegisterBadges() {
    try {
      if (typeof BADGE_INFO === 'object' && BADGE_INFO) {
        let added = false;
        WG_BADGES.forEach(function (b) {
          if (!BADGE_INFO[b.name]) { BADGE_INFO[b.name] = b.el; added = true; }
        });
        // 전체 뱃지 수(badgeTotalText)에 반영
        if (added && typeof updateBadgeProgress === 'function') {
          try { updateBadgeProgress(); } catch (e) {}
        }
      }
    } catch (e) {}
  }

  function wgAddBadge(name) {
    if (typeof addBadge === 'function') {
      try { addBadge(name); } catch (e) {}
    } else {
      wgToast('🎉 새 뱃지 획득: ' + name + '!');
    }
    wgFireworks();
  }

  /* ── AI 호출 래퍼: callClaude(body) 단일 시그니처 ─────────── */
  async function wgCallAI(prompt, maxTokens) {
    if (typeof callClaude !== 'function') return null;
    try {
      const txt = await callClaude({
        model: WG_MODEL,
        max_tokens: maxTokens || 300,
        messages: [{ role: 'user', content: prompt }]
      });
      return (typeof txt === 'string' && txt.trim()) ? txt : null;
    } catch (e) { return null; }
  }

  function wgParseJSON(raw) {
    if (!raw) return null;
    if (typeof parseJSON === 'function') {
      try { const r = parseJSON(raw); if (r) return r; } catch (e) {}
    }
    try {
      const m = String(raw).match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      return m ? JSON.parse(m[0]) : null;
    } catch (e) { return null; }
  }

  /* ══════════════════════════════════════════════════════════
     1. 스타일 주입
     ══════════════════════════════════════════════════════════ */

  function wgInjectStyles() {
    if (document.getElementById('wgStyles')) return;
    const st = document.createElement('style');
    st.id = 'wgStyles';
    st.textContent = [
      '/* 오감 빙고판 */',
      '#wgBingoWrap { margin: 12px 0; padding: 12px; border: 2px dashed #b8a; border-radius: 12px; background: #fffdf5; }',
      '#wgBingoWrap h4 { margin: 0 0 8px; font-size: 14px; }',
      '#wgBingoBoard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }',
      '.wg-cell { padding: 8px 4px; text-align: center; font-size: 12px; border-radius: 8px; background: #f0ede4; color: #999; border: 1px solid #ddd; transition: all .3s; }',
      '.wg-cell.filled { background: #ffe066; color: #333; border-color: #f4c430; font-weight: 700; transform: scale(1.04); }',
      '#wgBingoStatus { margin-top: 6px; font-size: 12px; color: #776; }',
      '/* 런처: 좌측 하단 (우측은 petWidget/globalSosBtn 점유) */',
      '#wgLauncher { position: fixed; left: 14px; bottom: 22px; z-index: 240; width: 52px; height: 52px; border-radius: 50%; border: none; background: #6c5ce7; color: #fff; font-size: 24px; cursor: pointer; box-shadow: 0 3px 10px rgba(0,0,0,.25); }',
      '#wgLauncher:hover { transform: scale(1.08); }',
      '/* 모달 */',
      '#wgOverlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 9991; display: none; align-items: center; justify-content: center; }',
      '#wgOverlay.open { display: flex; }',
      '#wgModal { width: min(480px, 92vw); max-height: 84vh; overflow-y: auto; background: #fff; border-radius: 14px; padding: 20px; }',
      '#wgModal h3 { margin: 0 0 10px; font-size: 18px; }',
      '.wg-btn { display: inline-block; margin: 4px 4px 4px 0; padding: 10px 14px; border: none; border-radius: 10px; background: #6c5ce7; color: #fff; font-size: 14px; cursor: pointer; }',
      '.wg-btn.gray { background: #b2bec3; }',
      '.wg-btn.green { background: #00b894; }',
      '.wg-btn:disabled { opacity: .5; cursor: default; }',
      '.wg-menu-btn { display: block; width: 100%; text-align: left; margin: 6px 0; padding: 12px; border: 1px solid #ddd; border-radius: 10px; background: #f9f8f4; font-size: 14px; cursor: pointer; }',
      '.wg-menu-btn:hover { background: #efece2; }',
      '.wg-sentence { padding: 10px; margin: 8px 0; background: #f4f1ff; border-radius: 8px; font-size: 15px; line-height: 1.5; }',
      '.wg-input { width: 100%; box-sizing: border-box; padding: 10px; margin: 6px 0; border: 1px solid #ccc; border-radius: 8px; font-size: 14px; }',
      '.wg-note { font-size: 12px; color: #888; margin-top: 8px; }',
      '.wg-combo-chain { font-size: 13px; color: #555; margin: 6px 0; }',
      '.wg-combo-chain b { color: #6c5ce7; }',
      '.wg-hp { font-size: 13px; margin-bottom: 6px; }'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ══════════════════════════════════════════════════════════
     2. 공용 모달
     ══════════════════════════════════════════════════════════ */

  function wgEnsureModal() {
    if (document.getElementById('wgOverlay')) return;
    const ov = document.createElement('div');
    ov.id = 'wgOverlay';
    ov.innerHTML = '<div id="wgModal"></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) wgCloseModal(); });
    document.body.appendChild(ov);
  }

  function wgOpenModal(html) {
    wgEnsureModal();
    document.getElementById('wgModal').innerHTML = html;
    document.getElementById('wgOverlay').classList.add('open');
  }

  function wgCloseModal() {
    const ov = document.getElementById('wgOverlay');
    if (ov) ov.classList.remove('open');
  }
  window.wgCloseModal = wgCloseModal;

  /* ══════════════════════════════════════════════════════════
     3. 게임 ① 오감 빙고
        - #diary 아래 3×3 빙고판 자동 주입
        - 정규식 실시간 감지(디바운스 400ms) → API 비용 0
        - '지급된 최대 줄 수'를 하루 단위로 저장 + focus 시
          기준선 재동기화 → 붙여넣기/옛글 불러오기 잉크 파밍 차단
     ══════════════════════════════════════════════════════════ */

  const WG_BINGO_CELLS = [
    { id: 'sight',      label: '👀 색깔·모양',   re: /(빨갛|빨간|파랗|파란|노랗|노란|까맣|까만|하얗|하얀|초록|보라|분홍|주황|반짝|눈부시|알록달록|동그란|네모난)/ },
    { id: 'sound',      label: '👂 소리',        re: /(소리|들리|들렸|시끄러|조용하|웅성|속삭)/ },
    { id: 'touch',      label: '🖐️ 촉감',        re: /(부드럽|딱딱|말랑|차갑|차가운|뜨겁|뜨거운|따뜻|폭신|미끌|까끌|촉촉|보들)/ },
    { id: 'smellTaste', label: '👃 냄새·맛',     re: /(냄새|향기|고소|달콤|매콤|짭짤|시큼|쌉싸름|구수|향긋|새콤)/ },
    { id: 'emotion',    label: '💖 감정',        re: /(기뻤|기쁘|슬펐|슬프|화났|화가 나|신났|신나|무서웠|무서|설레|뿌듯|속상|행복|즐거|외로|긴장|부끄러)/ },
    { id: 'simile',     label: '🌈 비유',        re: /(처럼|마치|듯이)/ },
    { id: 'dialogue',   label: '💬 대화 글',     re: /["“][^"“”]{1,80}["”]/ },
    { id: 'mimetic',    label: '🎵 흉내 내는 말', re: /(살금살금|반짝반짝|데굴데굴|펄쩍펄쩍|쿵쿵|덜덜|훨훨|살랑살랑|둥실둥실|쨍그랑|콰르릉|주룩주룩|솔솔|뒤뚱뒤뚱|헐레벌떡|바스락|보글보글|철썩|씽씽|쌩쌩|엉금엉금|폴짝)/ },
    { id: 'number',     label: '🔢 정확한 숫자', re: /([0-9]+|[한두세네]|다섯|여섯|일곱|여덟|아홉|열)\s?(개|명|번|시간|마리|살|송이|권|잔|분)/ }
  ];

  const WG_BINGO_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  let _wgBingoTimer = null;

  function wgBingoScan(text) {
    return WG_BINGO_CELLS.map(function (c) { return c.re.test(text); });
  }

  function wgBingoLineCount(filled) {
    return WG_BINGO_LINES.filter(function (line) {
      return line.every(function (i) { return filled[i]; });
    }).length;
  }

  function wgInjectBingo() {
    const ta = wg$('diary');
    if (!ta || document.getElementById('wgBingoWrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'wgBingoWrap';
    wrap.innerHTML =
      '<h4>🎯 오감 빙고 — 글 속에 표현이 들어가면 칸에 불이 켜져요!</h4>' +
      '<div id="wgBingoBoard">' +
      WG_BINGO_CELLS.map(function (c) {
        return '<div class="wg-cell" id="wg_cell_' + c.id + '">' + c.label + '</div>';
      }).join('') +
      '</div>' +
      '<div id="wgBingoStatus">빙고 줄 0개 · 한 줄마다 잉크 +30, 다 채우면 +100!</div>';
    ta.insertAdjacentElement('afterend', wrap);

    // 기존 글(수정 모드)은 보상 없이 기준선만 설정
    wgBingoRender(ta.value || '', true);

    // 포커스 시 기준선 재동기화 → 옛 일기 불러오기·붙여넣기 파밍 차단
    ta.addEventListener('focus', function () {
      wgBingoRender(ta.value || '', true);
    });

    ta.addEventListener('input', function () {
      clearTimeout(_wgBingoTimer);
      _wgBingoTimer = setTimeout(function () {
        wgBingoRender(ta.value || '', false);
      }, 400);
    });
  }

  function wgBingoRender(text, baselineOnly) {
    const filled = wgBingoScan(text);
    WG_BINGO_CELLS.forEach(function (c, i) {
      const el = document.getElementById('wg_cell_' + c.id);
      if (el) el.classList.toggle('filled', filled[i]);
    });

    const lines = wgBingoLineCount(filled);
    const status = document.getElementById('wgBingoStatus');
    if (status) status.textContent = '빙고 줄 ' + lines + '개 · 한 줄마다 잉크 +30, 다 채우면 +100!';

    const s = wgLoad('mdj_wg_bingo', { date: '', maxRewarded: 0, blackout: false });
    if (s.date !== wgToday()) { s.date = wgToday(); s.maxRewarded = 0; s.blackout = false; }

    if (baselineOnly) {
      // 이미 있는 줄 수는 보상된 것으로 간주 (중복 보상 차단)
      if (lines > s.maxRewarded) s.maxRewarded = lines;
      wgSave('mdj_wg_bingo', s);
      return;
    }

    if (lines > s.maxRewarded) {
      const newLines = lines - s.maxRewarded;
      s.maxRewarded = lines;
      wgSave('mdj_wg_bingo', s);
      wgAddInk(30 * newLines, '(오감 빙고!)');
      wgPetSay('빙고! 네가 찾은 표현 덕분에 글이 살아 움직여 ✨');
    }

    if (filled.every(Boolean) && !s.blackout) {
      s.blackout = true;
      wgSave('mdj_wg_bingo', s);
      wgAddInk(100, '(빙고판 블랙아웃!)');
      wgAddBadge('빙고 마스터');
      wgPetSay('세상에… 아홉 칸을 전부 채우다니! 진짜 표현의 달인이야 🎆');
    }
  }

  /* ══════════════════════════════════════════════════════════
     4. 게임 ② 펫 단어 편식
        - 매일 표현 범주 1개 요구 (날짜 해시로 고정)
        - saveDiary 래핑: 저장 시점에 충족 검사
        - 하루 1회 지급, 누적 7회 → '펫 미식가'
     ══════════════════════════════════════════════════════════ */

  const WG_CRAVINGS = [
    { id: 'mimetic',    label: '흉내 내는 말', say: '오늘은 "반짝반짝" 같은 흉내 내는 말이 먹고 싶어!' },
    { id: 'simile',     label: '비유 표현',    say: '오늘은 "~처럼" 하고 빗대는 표현이 먹고 싶어!' },
    { id: 'emotion',    label: '감정 표현',    say: '오늘은 네 마음이 어땠는지 감정 표현이 먹고 싶어!' },
    { id: 'smellTaste', label: '냄새·맛 표현', say: '오늘은 킁킁… 냄새나 맛 표현이 먹고 싶어!' },
    { id: 'touch',      label: '촉감 표현',    say: '오늘은 말랑말랑~ 촉감 표현이 먹고 싶어!' },
    { id: 'dialogue',   label: '대화 글',      say: '오늘은 누가 한 말을 따옴표로 쓴 대화 글이 먹고 싶어!' }
  ];

  function wgTodayCraving() {
    const d = wgToday();
    let hash = 0;
    for (let i = 0; i < d.length; i++) hash = (hash * 31 + d.charCodeAt(i)) >>> 0;
    return WG_CRAVINGS[hash % WG_CRAVINGS.length];
  }

  function wgCravingRegex(id) {
    const cell = WG_BINGO_CELLS.find(function (c) { return c.id === id; });
    return cell ? cell.re : null;
  }

  function wgAnnounceCraving() {
    const s = wgLoad('mdj_wg_pet', { date: '', done: false, count: 0 });
    if (s.date === wgToday() && s.done) return;   // 오늘 이미 충족
    setTimeout(function () { wgPetSay(wgTodayCraving().say); }, 2500);
  }

  function wgCheckPetCraving() {
    const s = wgLoad('mdj_wg_pet', { date: '', done: false, count: 0 });
    if (s.date !== wgToday()) { s.date = wgToday(); s.done = false; }
    if (s.done) return;                           // 하루 1회 제한

    const ta = wg$('diary');
    const text = ta ? (ta.value || '') : '';
    const craving = wgTodayCraving();
    const re = wgCravingRegex(craving.id);
    if (!text || !re || !re.test(text)) return;

    s.done = true;
    s.count = (s.count || 0) + 1;
    wgSave('mdj_wg_pet', s);

    wgAddPetExp(20);
    wgAddInk(10, '(펫 밥 주기 성공!)');
    wgPetSay('냠냠! 네 글 속에서 ' + craving.label + '을(를) 찾아 먹었어. 정말 근사한 표현이었어 💕');

    if (s.count >= 7) wgAddBadge('펫 미식가');
  }

  function wgPatchSaveDiary() {
    if (window._wgSaveDiaryPatched) return;
    if (typeof window.saveDiary === 'function') {
      const _orig = window.saveDiary;
      window.saveDiary = async function () {
        const result = await _orig.apply(this, arguments);
        try { wgCheckPetCraving(); } catch (e) {}
        return result;
      };
      window._wgSaveDiaryPatched = true;
    }
  }

  /* ══════════════════════════════════════════════════════════
     5. 게임 ③ 맞춤법 몬스터 사냥
        - getEntries() 최신 10편의 spellingAdvice 수집
          → haiku로 같은 유형의 오류 문장 3개 생성
        - 데이터 없음/AI 실패 시 공용 문제은행 폴백
        - 정답 후 "소리 내어 읽기" 확인을 거쳐야 처치 확정
        - 1마리 +15잉크, 누적 10마리 → '몬스터 헌터'
     ══════════════════════════════════════════════════════════ */

  const WG_MONSTER_BANK = [
    { wrong: '내일 학교에 가야 되.',          right: '내일 학교에 가야 돼.',          hint: '"되어"로 바꿔 말이 되면 "돼"를 써요.' },
    { wrong: '몇일 동안 비가 왔다.',          right: '며칠 동안 비가 왔다.',          hint: '날짜를 셀 때는 언제나 "며칠"이에요.' },
    { wrong: '숙제를 다 하지 안았다.',        right: '숙제를 다 하지 않았다.',        hint: '"아니 하다"의 준말은 "않다"예요.' },
    { wrong: '오늘은 웬지 기분이 좋다.',      right: '오늘은 왠지 기분이 좋다.',      hint: '"왜인지"의 준말은 "왠지"예요.' },
    { wrong: '감기가 빨리 낳았으면 좋겠다.',  right: '감기가 빨리 나았으면 좋겠다.',  hint: '병이 좋아지는 것은 "낫다"예요.' },
    { wrong: '정말 어의없는 일이었다.',       right: '정말 어이없는 일이었다.',       hint: '"어이없다"가 맞는 표현이에요.' }
  ];

  let _wgMonsters = [];
  let _wgMonsterIdx = 0;
  let _wgMonsterFails = 0;

  /** 일기(localforage)에서 spellingAdvice 수집 — 최신 10편 */
  async function wgCollectSpellingData() {
    try {
      if (typeof getEntries !== 'function') return [];
      const entries = (await getEntries()) || [];
      return entries.slice(0, 10)
        .map(function (e) { return (e && typeof e.spellingAdvice === 'string') ? e.spellingAdvice.trim() : ''; })
        .filter(Boolean);
    } catch (e) { return []; }
  }

  async function wgBuildMonsters() {
    const advice = await wgCollectSpellingData();
    if (advice.length) {
      const prompt =
        '너는 초등학생 맞춤법 게임 문제 출제자야.\n' +
        '아래는 한 학생이 실제로 받았던 맞춤법 교정 조언 목록이야:\n' +
        advice.map(function (a) { return '- ' + a; }).join('\n') + '\n\n' +
        '이 학생이 자주 틀리는 유형과 같은 유형으로, 맞춤법이 틀린 짧은 문장 3개를 만들어 줘.\n' +
        '규칙: 문장은 초등학생 일상 소재, 오류는 문장당 정확히 1개, 욕설·폭력 소재 금지.\n' +
        '반드시 아래 JSON 배열만 출력해:\n' +
        '[{"wrong":"틀린 문장","right":"고친 문장","hint":"한 문장 힌트"}]';
      const raw = await wgCallAI(prompt, 500);
      const parsed = wgParseJSON(raw);
      if (Array.isArray(parsed) && parsed.length >= 1 &&
          parsed.every(function (q) { return q && q.wrong && q.right; })) {
        return parsed.slice(0, 3);
      }
    }
    // 폴백: 공용 문제은행에서 무작위 3개
    const bank = WG_MONSTER_BANK.slice();
    for (let i = bank.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = bank[i]; bank[i] = bank[j]; bank[j] = t;
    }
    return bank.slice(0, 3);
  }

  function wgNorm(s, dropSpace) {
    let t = String(s || '').trim().replace(/[.,!?…~"'“”]/g, '').replace(/\s+/g, ' ');
    if (dropSpace) t = t.replace(/\s/g, '');
    return t;
  }

  async function wgStartMonsterHunt() {
    wgOpenModal('<h3>⚔️ 맞춤법 몬스터 사냥</h3><p>몬스터를 불러오는 중… 잠깐만요! 🔮</p>');
    _wgMonsters = await wgBuildMonsters();
    _wgMonsterIdx = 0;
    _wgMonsterFails = 0;
    wgRenderMonster();
  }
  window.wgStartMonsterHunt = wgStartMonsterHunt;

  function wgRenderMonster() {
    if (_wgMonsterIdx >= _wgMonsters.length) {
      const kills = wgLoad('mdj_wg_monster', { kills: 0 }).kills;
      wgOpenModal(
        '<h3>🏆 사냥 완료!</h3>' +
        '<p>오늘의 몬스터를 모두 물리쳤어요.<br>지금까지 물리친 몬스터: <b>' + kills + '마리</b></p>' +
        '<button class="wg-btn" onclick="wgCloseModal()">닫기</button>'
      );
      return;
    }
    const q = _wgMonsters[_wgMonsterIdx];
    wgOpenModal(
      '<h3>⚔️ 맞춤법 몬스터 사냥</h3>' +
      '<div class="wg-hp">몬스터 ' + (_wgMonsterIdx + 1) + ' / ' + _wgMonsters.length +
      ' · 기회 ' + (2 - _wgMonsterFails) + '번 남음</div>' +
      '<p>👾 몬스터가 틀린 문장을 외치고 있어요! 바르게 고쳐서 물리치세요.</p>' +
      '<div class="wg-sentence">' + wgEsc(q.wrong) + '</div>' +
      '<input class="wg-input" id="wgMonsterInput" placeholder="바르게 고친 문장을 써 보세요">' +
      '<div id="wgMonsterMsg" class="wg-note"></div>' +
      '<button class="wg-btn" onclick="wgAnswerMonster()">공격!</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">그만하기</button>'
    );
  }

  function wgAnswerMonster() {
    const q = _wgMonsters[_wgMonsterIdx];
    const input = document.getElementById('wgMonsterInput');
    const msg = document.getElementById('wgMonsterMsg');
    const ans = input ? input.value : '';

    if (wgNorm(ans) === wgNorm(q.right)) {
      wgMonsterCorrect(q);
      return;
    }
    if (wgNorm(ans, true) === wgNorm(q.right, true)) {
      if (msg) msg.textContent = '💡 거의 다 왔어요! 띄어쓰기만 다시 살펴보세요.';
      return;
    }
    _wgMonsterFails++;
    if (_wgMonsterFails >= 2) {
      wgOpenModal(
        '<h3>👾 몬스터가 도망갔어요!</h3>' +
        '<p>정답은 이거예요:</p><div class="wg-sentence">✅ ' + wgEsc(q.right) + '</div>' +
        '<p class="wg-note">💡 ' + wgEsc(q.hint || '') + '</p>' +
        '<p>정답 문장을 한 번 소리 내어 읽고 다음으로 넘어가요!</p>' +
        '<button class="wg-btn" onclick="wgNextMonster()">다 읽었어요, 다음!</button>'
      );
    } else {
      if (msg) msg.textContent = '❌ 아직 몬스터가 버티고 있어요! 힌트: ' + (q.hint || '틀린 낱말 하나를 찾아보세요.');
    }
  }
  window.wgAnswerMonster = wgAnswerMonster;

  /** 정답 → 소리 내어 읽기 확인 후에만 처치 확정 (오류 각인 방지) */
  function wgMonsterCorrect(q) {
    wgOpenModal(
      '<h3>💥 명중!</h3>' +
      '<div class="wg-sentence">✅ ' + wgEsc(q.right) + '</div>' +
      '<p>📢 마지막 한 방! 고친 문장을 <b>큰 소리로 읽으면</b> 몬스터가 쓰러져요.</p>' +
      '<button class="wg-btn green" onclick="wgConfirmKill()">다 읽었어요!</button>'
    );
  }

  function wgConfirmKill() {
    const s = wgLoad('mdj_wg_monster', { kills: 0 });
    s.kills = (s.kills || 0) + 1;
    wgSave('mdj_wg_monster', s);
    wgAddInk(15, '(몬스터 처치!)');
    if (s.kills >= 10) wgAddBadge('몬스터 헌터');
    wgNextMonster();
  }
  window.wgConfirmKill = wgConfirmKill;

  function wgNextMonster() {
    _wgMonsterIdx++;
    _wgMonsterFails = 0;
    wgRenderMonster();
  }
  window.wgNextMonster = wgNextMonster;

  /* ══════════════════════════════════════════════════════════
     6. 게임 ④ 문장 늘리기 콤보
        - 클라이언트 길이 선검사 → 불필요한 API 호출 차단
        - haiku가 {ok, comment} JSON으로 호응 판정 (250토큰)
        - 2단계 +10 / 4단계 +30 / 6단계 +60 + '문장 마법사'
     ══════════════════════════════════════════════════════════ */

  const WG_COMBO_BASES = [
    '고양이가 잔다.', '아이가 달린다.', '새가 난다.',
    '비가 온다.', '동생이 웃는다.', '강아지가 먹는다.'
  ];
  const WG_COMBO_REWARDS = { 2: 10, 4: 30, 6: 60 };

  let _wgCombo = { base: '', current: '', level: 0, rewarded: {} };
  let _wgComboBusy = false;

  function wgStartCombo() {
    const base = WG_COMBO_BASES[Math.floor(Math.random() * WG_COMBO_BASES.length)];
    _wgCombo = { base: base, current: base, level: 0, rewarded: {} };
    wgRenderCombo('기본 문장에 꾸며 주는 말을 한 겹씩 붙여 보세요!');
  }
  window.wgStartCombo = wgStartCombo;

  function wgRenderCombo(message) {
    wgOpenModal(
      '<h3>🪄 문장 늘리기 콤보</h3>' +
      '<div class="wg-combo-chain">콤보 <b>' + _wgCombo.level + '단계</b> · 2단계 +10 / 4단계 +30 / 6단계 +60 잉크</div>' +
      '<div class="wg-sentence">' + wgEsc(_wgCombo.current) + '</div>' +
      '<p class="wg-note">' + wgEsc(message || '') + '</p>' +
      '<input class="wg-input" id="wgComboInput" placeholder="더 길고 자세해진 문장을 통째로 써 보세요">' +
      '<div id="wgComboMsg" class="wg-note"></div>' +
      '<button class="wg-btn" id="wgComboBtn" onclick="wgSubmitCombo()">한 겹 추가!</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">끝내기</button>'
    );
  }

  async function wgSubmitCombo() {
    if (_wgComboBusy) return;
    const input = document.getElementById('wgComboInput');
    const msg = document.getElementById('wgComboMsg');
    const btn = document.getElementById('wgComboBtn');
    const next = input ? input.value.trim() : '';

    // 1) 클라이언트 선검사 (API 절약)
    if (!next) { if (msg) msg.textContent = '문장을 먼저 써 주세요!'; return; }
    if (next.length < _wgCombo.current.length + 2) {
      if (msg) msg.textContent = '지금 문장보다 더 길고 자세하게 만들어야 콤보가 이어져요!';
      return;
    }

    _wgComboBusy = true;
    if (btn) { btn.disabled = true; btn.textContent = '판정 중…'; }

    // 2) AI 호응 판정
    const prompt =
      '너는 초등학생 문장 확장 게임의 심판이야.\n' +
      '기본 문장: "' + _wgCombo.base + '"\n' +
      '직전 문장: "' + _wgCombo.current + '"\n' +
      '학생의 새 문장: "' + next + '"\n\n' +
      '판정 규칙:\n' +
      '1. 기본 문장의 주어와 서술어(핵심 뜻)가 유지되어야 한다.\n' +
      '2. 꾸며 주는 말이 추가되어 더 구체적이어야 한다.\n' +
      '3. 문장 호응이 어색하면 안 된다.\n' +
      '반드시 JSON만 출력: {"ok": true 또는 false, "comment": "초등학생 눈높이의 한 문장 코멘트"}';

    let ok = null, comment = '';
    const raw = await wgCallAI(prompt, 250);
    const parsed = wgParseJSON(raw);
    if (parsed && typeof parsed.ok === 'boolean') {
      ok = parsed.ok;
      comment = parsed.comment || '';
    }

    // 3) AI 실패 시 휴리스틱 폴백 (핵심 낱말 유지 검사)
    if (ok === null) {
      const core = _wgCombo.base.replace(/[.!?]/g, '').split(/\s+/);
      const keep = core.filter(function (w) {
        return next.indexOf(w.slice(0, Math.max(1, w.length - 1))) >= 0;
      });
      ok = keep.length >= Math.max(1, core.length - 1);
      comment = ok ? '문장이 한 겹 더 풍성해졌어요!' : '기본 문장의 주인공과 움직임은 그대로 남겨 주세요!';
    }

    _wgComboBusy = false;

    if (!ok) {
      wgRenderCombo('❌ ' + (comment || '문장 호응이 조금 어색해요. 다시 도전!'));
      return;
    }

    _wgCombo.current = next;
    _wgCombo.level += 1;

    const reward = WG_COMBO_REWARDS[_wgCombo.level];
    if (reward && !_wgCombo.rewarded[_wgCombo.level]) {
      _wgCombo.rewarded[_wgCombo.level] = true;
      wgAddInk(reward, '(콤보 ' + _wgCombo.level + '단계!)');
    }
    if (_wgCombo.level >= 6) {
      wgAddBadge('문장 마법사');
      wgOpenModal(
        '<h3>🎆 6단계 콤보 달성!</h3>' +
        '<div class="wg-sentence">' + wgEsc(_wgCombo.current) + '</div>' +
        '<p>짧은 문장 하나가 이렇게 자세한 문장이 됐어요. 문장 마법사님, 축하해요!</p>' +
        '<button class="wg-btn" onclick="wgStartCombo()">새 문장으로 또!</button>' +
        '<button class="wg-btn gray" onclick="wgCloseModal()">끝내기</button>'
      );
      return;
    }
    wgRenderCombo('⭕ ' + (comment || '좋아요! 또 한 겹 붙여 볼까요?'));
  }
  window.wgSubmitCombo = wgSubmitCombo;

  /* ══════════════════════════════════════════════════════════
     7. 게임 런처 (허브 모달)
     ══════════════════════════════════════════════════════════ */

  function wgInjectLauncher() {
    if (document.getElementById('wgLauncher')) return;
    const btn = document.createElement('button');
    btn.id = 'wgLauncher';
    btn.title = '글쓰기 게임';
    btn.textContent = '🎮';
    btn.addEventListener('click', wgOpenHub);
    document.body.appendChild(btn);
  }

  function wgOpenHub() {
    const inkUsed = wgInkStatus();
    const craving = wgTodayCraving();
    const petState = wgLoad('mdj_wg_pet', { done: false, count: 0, date: '' });
    const cravingDone = (petState.date === wgToday() && petState.done);
    const kills = wgLoad('mdj_wg_monster', { kills: 0 }).kills;

    wgOpenModal(
      '<h3>🎮 글쓰기 게임</h3>' +
      '<p class="wg-note">오늘 게임 잉크: <b>' + inkUsed + ' / ' + WG_INK_DAILY_CAP + '</b></p>' +
      '<button class="wg-menu-btn" onclick="wgStartMonsterHunt()">' +
      '⚔️ 맞춤법 몬스터 사냥 <span class="wg-note">— 지금까지 ' + kills + '마리 처치</span></button>' +
      '<button class="wg-menu-btn" onclick="wgStartCombo()">' +
      '🪄 문장 늘리기 콤보 <span class="wg-note">— 문장을 6겹까지 키워 보세요</span></button>' +
      '<p class="wg-note">🍽️ 오늘 펫의 편식: <b>' + wgEsc(craving.label) + '</b> ' +
      (cravingDone ? '(오늘 먹여 줬어요 ✅)' : '(일기에 쓰고 저장하면 먹어요!)') + '</p>' +
      '<p class="wg-note">🎯 오감 빙고는 그림일기 쓰기 화면에 있어요.</p>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
  }
  window.wgOpenHub = wgOpenHub;

  /* ══════════════════════════════════════════════════════════
     8. 초기화
        - 빙고판은 #diary가 나타난 뒤 주입해야 하므로
          1.2초 간격 감시 (SPA 화면 전환 대응)
     ══════════════════════════════════════════════════════════ */

  function wgInit() {
    wgInjectStyles();
    wgEnsureModal();
    wgInjectLauncher();
    wgRegisterBadges();
    wgPatchSaveDiary();
    wgAnnounceCraving();

    setInterval(function () {
      try {
        wgInjectBingo();       // #diary가 생기면 1회 주입
        wgPatchSaveDiary();    // saveDiary가 늦게 정의되는 경우 대비
        wgRegisterBadges();    // BADGE_INFO가 늦게 정의되는 경우 대비
      } catch (e) {}
    }, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wgInit);
  } else {
    wgInit();
  }

})();
