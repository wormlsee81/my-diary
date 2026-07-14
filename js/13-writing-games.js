/* ============================================================
   13-writing-games.js (v2) — 글쓰기 게이미피케이션 확장 모듈
   ─ 로드 순서: 12-ieum-review.js 뒤, 반드시 마지막에 로드
   ─ 기존 파일 수정 없음. UI(빙고판·런처·모달·CSS)는 이 파일이
     스스로 DOM에 주입한다.

   [v2 변경 — 맞춤법 몬스터 사냥 대폭 확장]
     1. 공용 문제은행 6문항 → 48문항 (오류 유형 20종 분류)
     2. 최근 출제 24문항 기억 → 같은 문제 반복 출제 차단
     3. AI 출제를 '항상' 시도: 학생 오답(spellingAdvice)이 있으면
        개인화 출제, 없어도 무작위 유형 × 무작위 소재로 새 문제 생성
     4. 한 판 3마리 → 4마리, AI 실패 시 문제은행 폴백 유지

   포함 게임
     ① 오감 빙고        : 그림일기 실시간 표현 감지 (API 비용 0)
     ② 펫 단어 편식     : 일일 표현 미션, saveDiary 후킹
     ③ 맞춤법 몬스터 사냥: 개인화+무작위 교정 게임 (haiku 판정)
     ④ 문장 늘리기 콤보  : 문장 확장 훈련 (haiku 판정)

   설계 원칙: 과정 보상 / 일일 잉크 상한 150 / 경쟁 없음 /
   정보적 피드백 동반 / 기존 시스템(addInk·petSay·addBadge·
   BADGE_INFO·callClaude·parseJSON·getEntries·showFireworks) 재사용
   ============================================================ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     0. 공용 유틸 — 기존 전역 함수 안전 래퍼
     ══════════════════════════════════════════════════════════ */

  const WG_INK_DAILY_CAP = 150;                       // 게임 잉크 일일 상한
  const WG_MODEL = 'claude-haiku-4-5-20251001';       // 코드베이스 공용 모델

  function wg$(id) {
    return (typeof $ === 'function') ? $(id) : document.getElementById(id);
  }

  function wgToast(msg) {
    if (typeof toast === 'function') toast(msg);
    else console.log('[writing-games]', msg);
  }

  function wgToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function wgNick() {
    try { if (typeof currentNick === 'string' && currentNick) return currentNick; } catch (e) {}
    return 'guest';
  }

  function wgKey(name) {
    return 'mdj_wg_' + name + '_' + wgNick();          // 닉네임별 분리 저장
  }

  function wgLoad(name, fallback) {
    try {
      const raw = localStorage.getItem(wgKey(name));
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function wgSave(name, val) {
    try { localStorage.setItem(wgKey(name), JSON.stringify(val)); } catch (e) {}
  }

  function wgEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** 일일 상한이 적용된 잉크 지급. 실제 지급량 반환 */
  function wgAddInk(amount, reason) {
    const s = wgLoad('ink', { date: '', total: 0 });
    if (s.date !== wgToday()) { s.date = wgToday(); s.total = 0; }
    const remain = WG_INK_DAILY_CAP - s.total;
    if (remain <= 0) {
      wgToast('오늘 게임 잉크는 다 모았어요! 내일 또 만나요 🌙');
      return 0;
    }
    const grant = Math.min(amount, remain);
    s.total += grant;
    wgSave('ink', s);
    if (typeof addInk === 'function') {
      try { addInk(grant); } catch (e) {}
    }
    wgToast('잉크 +' + grant + '! ' + (reason || ''));
    return grant;
  }

  function wgInkStatus() {
    const s = wgLoad('ink', { date: '', total: 0 });
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

  /* ── 뱃지 4종: BADGE_INFO(이름→요소id)에 런타임 등록 ────── */
  const WG_BADGE_DEFS = [
    { name: '빙고 마스터',  el: 'badge_wg1' },
    { name: '펫 미식가',    el: 'badge_wg2' },
    { name: '몬스터 헌터',  el: 'badge_wg3' },
    { name: '문장 마법사',  el: 'badge_wg4' }
  ];

  function wgRegisterBadges() {
    try {
      if (typeof BADGE_INFO === 'object' && BADGE_INFO) {
        WG_BADGE_DEFS.forEach(function (b) {
          if (!BADGE_INFO[b.name]) BADGE_INFO[b.name] = b.el;
        });
      }
    } catch (e) {}
  }

  function wgAddBadge(name) {
    const mine = wgLoad('badges', []);
    if (mine.indexOf(name) !== -1) return;            // 중복 지급 방지
    mine.push(name);
    wgSave('badges', mine);
    if (typeof addBadge === 'function') {
      try { addBadge(name); } catch (e) { wgToast('🎉 새 뱃지: ' + name + '!'); }
    } else {
      wgToast('🎉 새 뱃지: ' + name + '!');
    }
    wgFireworks();
  }

  /* ── AI 호출 래퍼: callClaude({model,max_tokens,system,messages}) ── */
  async function wgCallAI(systemPrompt, userPrompt, maxTokens) {
    if (typeof callClaude !== 'function') return null;
    try {
      const r = await callClaude({
        model: WG_MODEL,
        max_tokens: maxTokens || 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      });
      return (typeof r === 'string' && r.trim()) ? r : null;
    } catch (e) { return null; }
  }

  function wgParseJSON(raw) {
    if (!raw) return null;
    if (typeof parseJSON === 'function') {
      try { const r = parseJSON(raw); if (r) return r; } catch (e) {}
    }
    try {
      const m = String(raw).match(/\[[\s\S]*\]|\{[\s\S]*\}/);
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
      '#wgBingoWrap { margin: 12px 0; padding: 12px; border: 2px dashed #b8a; border-radius: 12px; background: #fffdf5; }',
      '#wgBingoWrap h4 { margin: 0 0 8px; font-size: 14px; }',
      '#wgBingoBoard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }',
      '.wg-cell { padding: 8px 4px; text-align: center; font-size: 12px; border-radius: 8px; background: #f0ede4; color: #999; border: 1px solid #ddd; transition: all .3s; }',
      '.wg-cell.filled { background: #ffe066; color: #333; border-color: #f4c430; font-weight: 700; transform: scale(1.04); }',
      '#wgBingoStatus { margin-top: 6px; font-size: 12px; color: #776; }',
      '#wgLauncher { position: fixed; left: 14px; bottom: 22px; z-index: 240; width: 52px; height: 52px; border-radius: 50%; border: none; background: #6c5ce7; color: #fff; font-size: 24px; cursor: pointer; box-shadow: 0 3px 10px rgba(0,0,0,.25); }',
      '#wgLauncher:hover { transform: scale(1.08); }',
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
     3. 게임 ① 오감 빙고 (변경 없음)
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

    wgBingoRender(ta.value || '', true);   // 기존 글은 기준선만 설정

    ta.addEventListener('input', function () {
      clearTimeout(_wgBingoTimer);
      _wgBingoTimer = setTimeout(function () { wgBingoRender(ta.value || '', false); }, 400);
    });
    // 옛 일기 불러오기·붙여넣기로 잉크를 받는 경로 차단: 포커스 시 기준선 재동기화
    ta.addEventListener('focus', function () { wgBingoRender(ta.value || '', true); });
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

    const s = wgLoad('bingo', { date: '', maxRewarded: 0, blackout: false });
    if (s.date !== wgToday()) { s.date = wgToday(); s.maxRewarded = 0; s.blackout = false; }

    if (baselineOnly) {
      s.maxRewarded = Math.max(s.maxRewarded, lines);
      wgSave('bingo', s);
      return;
    }

    if (lines > s.maxRewarded) {
      const newLines = lines - s.maxRewarded;
      s.maxRewarded = lines;
      wgSave('bingo', s);
      wgAddInk(30 * newLines, '(오감 빙고!)');
      wgPetSay('빙고! 네가 찾은 표현 덕분에 글이 살아 움직여 ✨');
    }

    if (filled.every(Boolean) && !s.blackout) {
      s.blackout = true;
      wgSave('bingo', s);
      wgAddInk(100, '(빙고판 블랙아웃!)');
      wgAddBadge('빙고 마스터');
      wgPetSay('세상에… 아홉 칸을 전부 채우다니! 진짜 표현의 달인이야 🎆');
    }
  }

  /* ══════════════════════════════════════════════════════════
     4. 게임 ② 펫 단어 편식 (변경 없음)
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
    const s = wgLoad('pet', { date: '', done: false, count: 0 });
    if (s.date === wgToday() && s.done) return;
    setTimeout(function () { wgPetSay(wgTodayCraving().say); }, 2500);
  }

  function wgCheckPetCraving() {
    const s = wgLoad('pet', { date: '', done: false, count: 0 });
    if (s.date !== wgToday()) { s.date = wgToday(); s.done = false; }
    if (s.done) return;

    const ta = wg$('diary');
    const text = ta ? (ta.value || '') : '';
    const craving = wgTodayCraving();
    const re = wgCravingRegex(craving.id);
    if (!text || !re || !re.test(text)) return;

    s.done = true;
    s.count = (s.count || 0) + 1;
    wgSave('pet', s);

    wgAddPetExp(20);
    wgAddInk(10, '(펫 밥 주기 성공!)');
    wgPetSay('냠냠! 네 글 속에서 ' + craving.label + '을(를) 찾아 먹었어. 정말 근사한 표현이었어 💕');

    if (s.count >= 7) wgAddBadge('펫 미식가');
  }

  function wgPatchSaveDiary() {
    if (window._wgSaveDiaryPatched) return;
    if (typeof window.saveDiary === 'function') {
      const _orig = window.saveDiary;
      window.saveDiary = function () {
        const result = _orig.apply(this, arguments);
        try { wgCheckPetCraving(); } catch (e) {}
        return result;
      };
      window._wgSaveDiaryPatched = true;
    }
  }

  /* ══════════════════════════════════════════════════════════
     5. 게임 ③ 맞춤법 몬스터 사냥 (v2 — 대폭 확장)
        - 문제은행 48문항 / 오류 유형 20종
        - 최근 출제 24문항 기억 → 반복 차단
        - AI 출제 '항상' 시도: 개인화(오답 데이터) 또는
          무작위 유형×소재 조합으로 매번 새 문제 생성
        - 한 판 4마리, 정답 후 소리 내어 읽기 확인 시 처치 확정
     ══════════════════════════════════════════════════════════ */

  const WG_MONSTER_TYPES = [
    '되/돼 구분', '안/않 구분', '왠지/웬 구분', '며칠 표기', '낫다/낳다 구분',
    '금세/금방 표기', '바라/바래 구분', '-ㄹ게/-ㄹ께 표기', '봬요/뵈요 구분',
    '-든지/-던지 구분', '맞히다/맞추다 구분', '잃어버리다/잊어버리다 구분',
    '붙이다/부치다 구분', '가르치다/가리키다 구분', '다르다/틀리다 구분',
    '작다/적다 구분', '-이/-히 부사 표기', '자주 틀리는 낱말 표기',
    '-대/-데 구분', '띄어쓰기'
  ];

  const WG_MONSTER_TOPICS = [
    '학교 쉬는 시간', '급식 시간', '운동회', '반려동물', '가족 여행',
    '눈 오는 날', '생일 파티', '놀이터', '도서관', '방학 숙제',
    '보드게임', '전학 온 친구', '비 오는 날 하굣길', '시장 구경'
  ];

  const WG_MONSTER_BANK = [
    /* 되/돼 */
    { wrong: '내일 학교에 가야 되.',              right: '내일 학교에 가야 돼.',              hint: '"되어"로 바꿔 말이 되면 "돼"를 써요.' },
    { wrong: '숙제 다 하면 게임해도 되?',          right: '숙제 다 하면 게임해도 돼?',          hint: '문장 끝에서는 "되"가 혼자 올 수 없어요. "되어"의 준말 "돼"!' },
    { wrong: '커서 소방관이 돼고 싶다.',           right: '커서 소방관이 되고 싶다.',           hint: '"되어고 싶다"는 어색하죠? 그러면 "되고"가 맞아요.' },
    { wrong: '지금 들어가도 되요?',                right: '지금 들어가도 돼요?',                hint: '"되어요"로 바꿀 수 있으면 "돼요"라고 써요.' },
    /* 안/않 */
    { wrong: '숙제를 다 하지 안았다.',             right: '숙제를 다 하지 않았다.',             hint: '"-지" 뒤에는 "않다"를 써요. "아니 하다"의 준말이에요.' },
    { wrong: '오늘은 밥을 않 먹었다.',             right: '오늘은 밥을 안 먹었다.',             hint: '"아니"로 바꿀 수 있으면 "안"을 써요.' },
    { wrong: '동생이 내 말을 듣지 안는다.',        right: '동생이 내 말을 듣지 않는다.',        hint: '"-지 않다"가 한 묶음이에요.' },
    /* 왠/웬 */
    { wrong: '오늘은 웬지 기분이 좋다.',           right: '오늘은 왠지 기분이 좋다.',           hint: '"왜인지"의 준말은 "왠지"예요. 나머지는 거의 다 "웬"!' },
    { wrong: '왠일로 형이 일찍 일어났다.',         right: '웬일로 형이 일찍 일어났다.',         hint: '"어찌 된 일"이라는 뜻일 때는 "웬일"이에요.' },
    /* 며칠 */
    { wrong: '몇일 동안 비가 왔다.',               right: '며칠 동안 비가 왔다.',               hint: '날짜를 셀 때는 언제나 "며칠"이라고 써요.' },
    { wrong: '오늘이 몇 월 몇일이지?',             right: '오늘이 몇 월 며칠이지?',             hint: '"몇일"이라는 말은 없어요. 항상 "며칠"!' },
    /* 낫다/낳다 */
    { wrong: '감기가 빨리 낳았으면 좋겠다.',       right: '감기가 빨리 나았으면 좋겠다.',       hint: '병이 좋아지는 것은 "낫다", 아기를 낳는 것은 "낳다"예요.' },
    { wrong: '우리 강아지가 새끼를 나았다.',       right: '우리 강아지가 새끼를 낳았다.',       hint: '새끼나 알은 "낳다"를 써요.' },
    /* 자주 틀리는 낱말 */
    { wrong: '정말 어의없는 일이었다.',            right: '정말 어이없는 일이었다.',            hint: '기가 막힐 때는 "어이없다"예요. "어의"는 임금님 의사!' },
    { wrong: '아이스크림이 금새 녹았다.',          right: '아이스크림이 금세 녹았다.',          hint: '"금시에"가 줄어서 "금세"가 됐어요.' },
    { wrong: '오랫만에 할머니 댁에 갔다.',         right: '오랜만에 할머니 댁에 갔다.',         hint: '"오래간만"의 준말이라 "오랜만"이에요.' },
    { wrong: '소풍 생각에 마음이 설레인다.',       right: '소풍 생각에 마음이 설렌다.',         hint: '기본형이 "설레다"라서 "설렌다"가 맞아요.' },
    { wrong: '정말 희안한 꿈을 꿨다.',             right: '정말 희한한 꿈을 꿨다.',             hint: '드물고 신기하다는 뜻의 낱말은 "희한하다"예요.' },
    { wrong: '연극에서 왕 역활을 맡았다.',         right: '연극에서 왕 역할을 맡았다.',         hint: '맡은 일은 "역할"이라고 써요.' },
    { wrong: '점심에 김치찌게를 먹었다.',          right: '점심에 김치찌개를 먹었다.',          hint: '찌개, 베개처럼 "-개"로 끝나요.' },
    { wrong: '학교 앞에서 떡볶기를 사 먹었다.',    right: '학교 앞에서 떡볶이를 사 먹었다.',    hint: '볶은 음식 이름은 "떡볶이"라고 써요.' },
    { wrong: '푹신한 배게를 베고 잤다.',           right: '푹신한 베개를 베고 잤다.',           hint: '베는 물건이라서 "베개"예요.' },
    { wrong: '넘어져서 무릅이 아팠다.',            right: '넘어져서 무릎이 아팠다.',            hint: '몸의 부위는 "무릎"이라고 써요.' },
    { wrong: '제 이름은 김민준이예요.',            right: '제 이름은 김민준이에요.',            hint: '받침이 있는 이름 뒤에는 "이에요"를 써요.' },
    { wrong: '친구가 일부로 공을 세게 던졌다.',    right: '친구가 일부러 공을 세게 던졌다.',    hint: '"일부러"가 맞는 표기예요.' },
    { wrong: '구지 따라오지 않아도 돼.',           right: '굳이 따라오지 않아도 돼.',           hint: '소리는 [구지]지만 "굳이"라고 써요.' },
    /* 바라/바래, -ㄹ게, 봬요 */
    { wrong: '소원이 꼭 이루어지길 바래.',         right: '소원이 꼭 이루어지길 바라.',         hint: '기본형이 "바라다"라서 "바라"가 맞아요. "바래다"는 색이 변하는 것!' },
    { wrong: '내가 먼저 청소할께.',                right: '내가 먼저 청소할게.',                hint: '소리는 [께]지만 "-ㄹ게"라고 적어요.' },
    { wrong: '숙제 끝나고 전화할께.',              right: '숙제 끝나고 전화할게.',              hint: '"-ㄹ게"는 항상 "게"로 써요.' },
    { wrong: '선생님, 내일 뵈요!',                 right: '선생님, 내일 봬요!',                 hint: '"뵈어요"의 준말이라 "봬요"예요. "되→돼"와 같은 원리!' },
    /* -든지/-던지 */
    { wrong: '어제는 얼마나 춥든지 손이 꽁꽁 얼었다.', right: '어제는 얼마나 춥던지 손이 꽁꽁 얼었다.', hint: '지난 일을 떠올릴 때는 "-던지"를 써요.' },
    { wrong: '사과던지 배던지 하나만 골라.',       right: '사과든지 배든지 하나만 골라.',       hint: '고르는 것일 때는 "-든지"를 써요.' },
    /* 맞히다/맞추다 */
    { wrong: '수수께끼 정답을 맞췄다.',            right: '수수께끼 정답을 맞혔다.',            hint: '정답을 맞게 하는 것은 "맞히다", 서로 대 보는 것은 "맞추다"예요.' },
    { wrong: '친구와 답을 맞히어 보았다.',         right: '친구와 답을 맞추어 보았다.',         hint: '서로 비교해 보는 것은 "맞추다"를 써요.' },
    /* 잃어버리다/잊어버리다 */
    { wrong: '지우개를 잊어버려서 새로 샀다.',     right: '지우개를 잃어버려서 새로 샀다.',     hint: '물건이 없어지면 "잃어버리다", 기억이 없어지면 "잊어버리다"!' },
    { wrong: '친구와 한 약속을 잃어버렸다.',       right: '친구와 한 약속을 잊어버렸다.',       hint: '기억에서 사라진 것은 "잊어버리다"예요.' },
    /* 붙이다/부치다 */
    { wrong: '편지 봉투에 우표를 부쳤다.',         right: '편지 봉투에 우표를 붙였다.',         hint: '풀로 딱 붙게 하는 것은 "붙이다"예요.' },
    { wrong: '할머니께 소포를 붙였다.',            right: '할머니께 소포를 부쳤다.',            hint: '우편으로 보내는 것은 "부치다"예요.' },
    /* 가르치다/가리키다 */
    { wrong: '선생님이 수학을 가리켜 주셨다.',     right: '선생님이 수학을 가르쳐 주셨다.',     hint: '지식을 알려 주는 것은 "가르치다"예요.' },
    { wrong: '형이 손가락으로 달을 가르쳤다.',     right: '형이 손가락으로 달을 가리켰다.',     hint: '방향을 집어 주는 것은 "가리키다"예요.' },
    /* 다르다/틀리다, 작다/적다 */
    { wrong: '내 생각은 네 생각과 틀리다.',        right: '내 생각은 네 생각과 다르다.',        hint: '같지 않은 것은 "다르다", 답이 잘못된 것은 "틀리다"예요.' },
    { wrong: '내 키는 형보다 적다.',               right: '내 키는 형보다 작다.',               hint: '크기·키는 "작다", 개수·양은 "적다"를 써요.' },
    { wrong: '이번 달 용돈이 너무 작다.',          right: '이번 달 용돈이 너무 적다.',          hint: '양이 모자란 것은 "적다"예요.' },
    /* -이/-히 */
    { wrong: '곰곰히 생각해 보았다.',              right: '곰곰이 생각해 보았다.',              hint: '"곰곰이"는 "-이"로 끝나요.' },
    { wrong: '방을 깨끗히 청소했다.',              right: '방을 깨끗이 청소했다.',              hint: '"깨끗이"는 "-이"로 써요.' },
    /* -대/-데 */
    { wrong: '민수가 숙제를 벌써 다 했데.',        right: '민수가 숙제를 벌써 다 했대.',        hint: '남에게 들은 말을 전할 때는 "-대"를 써요.' },
    /* 띄어쓰기 */
    { wrong: '나도 자전거를 탈수 있다.',           right: '나도 자전거를 탈 수 있다.',          hint: '"-ㄹ 수 있다"의 "수"는 띄어 써요.' },
    { wrong: '이 연필은 내꺼야.',                  right: '이 연필은 내 거야.',                 hint: '"거"는 "것"을 뜻하는 낱말이라 띄어 쓰고, "꺼"가 아니라 "거"예요.' },
    { wrong: '주말에 친구가 우리집에 놀러 왔다.',  right: '주말에 친구가 우리 집에 놀러 왔다.', hint: '"우리"와 "집"은 띄어 써요.' }
  ];

  const WG_HUNT_SIZE = 4;          // 한 판에 나오는 몬스터 수
  const WG_RECENT_MAX = 24;        // 반복 차단용 최근 출제 기억 개수

  let _wgMonsters = [];
  let _wgMonsterIdx = 0;
  let _wgMonsterFails = 0;

  function wgNorm(s, dropSpace) {
    let t = String(s || '').trim().replace(/[.,!?…~"'“”]/g, '').replace(/\s+/g, ' ');
    if (dropSpace) t = t.replace(/\s/g, '');
    return t;
  }

  function wgRecentList() {
    return wgLoad('monsterRecent', []);
  }

  function wgRemember(questions) {
    let recent = wgRecentList();
    questions.forEach(function (q) {
      const key = wgNorm(q.wrong, true);
      if (recent.indexOf(key) === -1) recent.push(key);
    });
    if (recent.length > WG_RECENT_MAX) recent = recent.slice(recent.length - WG_RECENT_MAX);
    wgSave('monsterRecent', recent);
  }

  function wgPickN(arr, n) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy.slice(0, n);
  }

  /** 최근 출제를 제외하고 문제은행에서 n개 추출 (부족하면 재사용 허용) */
  function wgPickFromBank(n, excludeKeys) {
    const recent = wgRecentList();
    const used = excludeKeys || [];
    const fresh = WG_MONSTER_BANK.filter(function (q) {
      const key = wgNorm(q.wrong, true);
      return recent.indexOf(key) === -1 && used.indexOf(key) === -1;
    });
    const pool = fresh.length >= n ? fresh : WG_MONSTER_BANK.filter(function (q) {
      return used.indexOf(wgNorm(q.wrong, true)) === -1;
    });
    return wgPickN(pool, n);
  }

  /** 저장된 일기에서 spellingAdvice 수집 (localforage 기반 getEntries) */
  async function wgCollectSpellingData() {
    try {
      if (typeof getEntries === 'function') {
        const entries = await getEntries();
        return (entries || []).slice(-10)
          .map(function (e) { return (e && typeof e.spellingAdvice === 'string') ? e.spellingAdvice.trim() : ''; })
          .filter(Boolean);
      }
    } catch (e) {}
    return [];
  }

  /** AI 문제 검증: 형식·길이·정오 구분이 온전한 것만 통과 */
  function wgValidateAIQuestions(parsed) {
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(function (q) {
      return q && typeof q.wrong === 'string' && typeof q.right === 'string' &&
        q.wrong.trim() && q.right.trim() &&
        wgNorm(q.wrong, true) !== wgNorm(q.right, true) &&
        q.wrong.length <= 60 && q.right.length <= 60 &&
        /[가-힣]/.test(q.wrong);
    }).map(function (q) {
      return { wrong: q.wrong.trim(), right: q.right.trim(), hint: String(q.hint || '').trim() };
    });
  }

  /** v2: AI 출제를 항상 시도 (개인화 or 무작위 유형×소재) + 은행 보충 */
  async function wgBuildMonsters() {
    const advice = await wgCollectSpellingData();
    const types = wgPickN(WG_MONSTER_TYPES, 4);
    const topics = wgPickN(WG_MONSTER_TOPICS, 3);
    const recent = wgRecentList();

    let userPrompt;
    if (advice.length) {
      userPrompt =
        '아래는 이 학생이 실제로 받았던 맞춤법 교정 조언이야:\n' +
        advice.map(function (a) { return '- ' + a; }).join('\n') +
        '\n\n위 조언에 나온 오류 유형을 우선으로 하되, 부족하면 다음 유형에서 골라 줘: ' +
        types.join(', ') + '\n' +
        '문장 소재는 "' + topics.join('", "') + '" 중에서 다양하게 골라 줘.';
    } else {
      userPrompt =
        '다음 오류 유형에서 하나씩 골라 문제를 만들어 줘: ' + types.join(', ') + '\n' +
        '문장 소재는 "' + topics.join('", "') + '" 중에서 다양하게 골라 줘.';
    }
    userPrompt +=
      '\n\n초등학생 맞춤법 게임용으로, 맞춤법이 틀린 짧은 문장 ' + WG_HUNT_SIZE + '개를 만들어 줘.\n' +
      '규칙:\n' +
      '- 문장은 초등학생의 일상 이야기, 오류는 문장당 정확히 1개\n' +
      '- 욕설·폭력·죽음 소재 금지\n' +
      '- 다음 문장들과 겹치지 않게: ' + (recent.slice(-8).join(' / ') || '(없음)') + '\n' +
      '반드시 아래 JSON 배열만 출력해:\n' +
      '[{"wrong":"틀린 문장","right":"고친 문장","hint":"초등학생 눈높이 힌트 한 문장"}]';

    const raw = await wgCallAI(
      '너는 한국 초등학생을 위한 맞춤법 게임 문제 출제자야. 국립국어원 표준 맞춤법을 정확히 따르고, 반드시 JSON만 출력해.',
      userPrompt, 700
    );
    let questions = wgValidateAIQuestions(wgParseJSON(raw));

    // 최근 출제와 겹치는 AI 문제 제거
    questions = questions.filter(function (q) {
      return recent.indexOf(wgNorm(q.wrong, true)) === -1;
    }).slice(0, WG_HUNT_SIZE);

    // 부족분은 문제은행에서 보충
    if (questions.length < WG_HUNT_SIZE) {
      const usedKeys = questions.map(function (q) { return wgNorm(q.wrong, true); });
      questions = questions.concat(wgPickFromBank(WG_HUNT_SIZE - questions.length, usedKeys));
    }

    wgRemember(questions);
    return questions;
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
      const kills = wgLoad('monster', { kills: 0 }).kills;
      wgOpenModal(
        '<h3>🏆 사냥 완료!</h3>' +
        '<p>오늘의 몬스터를 모두 물리쳤어요.<br>지금까지 물리친 몬스터: <b>' + kills + '마리</b></p>' +
        '<button class="wg-btn" onclick="wgStartMonsterHunt()">한 판 더!</button>' +
        '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
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
    const input = document.getElementById('wgMonsterInput');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') wgAnswerMonster();
      });
      input.focus();
    }
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
      '<p class="wg-note">💡 ' + wgEsc(q.hint || '') + '</p>' +
      '<p>📢 마지막 한 방! 고친 문장을 <b>큰 소리로 읽으면</b> 몬스터가 쓰러져요.</p>' +
      '<button class="wg-btn green" onclick="wgConfirmKill()">다 읽었어요!</button>'
    );
  }

  function wgConfirmKill() {
    const s = wgLoad('monster', { kills: 0 });
    s.kills = (s.kills || 0) + 1;
    wgSave('monster', s);
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
     6. 게임 ④ 문장 늘리기 콤보 (변경 없음)
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
    const input = document.getElementById('wgComboInput');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') wgSubmitCombo();
      });
      input.focus();
    }
  }

  async function wgSubmitCombo() {
    if (_wgComboBusy) return;
    const input = document.getElementById('wgComboInput');
    const msg = document.getElementById('wgComboMsg');
    const btn = document.getElementById('wgComboBtn');
    const next = input ? input.value.trim() : '';

    if (!next) { if (msg) msg.textContent = '문장을 먼저 써 주세요!'; return; }
    if (next.length < _wgCombo.current.length + 2) {
      if (msg) msg.textContent = '지금 문장보다 더 길고 자세하게 만들어야 콤보가 이어져요!';
      return;
    }

    _wgComboBusy = true;
    if (btn) { btn.disabled = true; btn.textContent = '판정 중…'; }

    const raw = await wgCallAI(
      '너는 초등학생 문장 확장 게임의 심판이야. 반드시 JSON만 출력해.',
      '기본 문장: "' + _wgCombo.base + '"\n' +
      '직전 문장: "' + _wgCombo.current + '"\n' +
      '학생의 새 문장: "' + next + '"\n\n' +
      '판정 규칙:\n' +
      '1. 기본 문장의 주어와 서술어(핵심 뜻)가 유지되어야 한다.\n' +
      '2. 꾸며 주는 말이 추가되어 더 구체적이어야 한다.\n' +
      '3. 문장 호응이 어색하면 안 된다.\n' +
      '출력: {"ok": true 또는 false, "comment": "초등학생 눈높이의 한 문장 코멘트"}',
      250
    );
    const parsed = wgParseJSON(raw);
    let ok = null, comment = '';
    if (parsed && typeof parsed.ok === 'boolean') {
      ok = parsed.ok;
      comment = parsed.comment || '';
    }

    if (ok === null) {   // AI 실패 시 휴리스틱 폴백
      const core = _wgCombo.base.replace(/[.!?]/g, '').split(/\s+/);
      const keep = core.filter(function (w) {
        return next.indexOf(w.slice(0, Math.max(1, w.length - 1))) !== -1;
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
    const petState = wgLoad('pet', { done: false, count: 0, date: '' });
    const cravingDone = (petState.date === wgToday() && petState.done);
    const kills = wgLoad('monster', { kills: 0 }).kills;

    wgOpenModal(
      '<h3>🎮 글쓰기 게임</h3>' +
      '<p class="wg-note">오늘 게임 잉크: <b>' + inkUsed + ' / ' + WG_INK_DAILY_CAP + '</b></p>' +
      '<button class="wg-menu-btn" onclick="wgStartMonsterHunt()">⚔️ 맞춤법 몬스터 사냥 <span class="wg-note">— 매판 새 문제 · 지금까지 ' + kills + '마리 처치</span></button>' +
      '<button class="wg-menu-btn" onclick="wgStartCombo()">🪄 문장 늘리기 콤보 <span class="wg-note">— 문장을 6겹까지 키워 보세요</span></button>' +
      '<p class="wg-note">🍽️ 오늘 펫의 편식: <b>' + wgEsc(craving.label) + '</b> ' +
      (cravingDone ? '(오늘 먹여 줬어요 ✅)' : '(일기에 쓰고 저장하면 먹어요!)') + '</p>' +
      '<p class="wg-note">🎯 오감 빙고는 그림일기 쓰기 화면에 있어요.</p>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
  }
  window.wgOpenHub = wgOpenHub;

  /* ══════════════════════════════════════════════════════════
     8. 초기화 — #diary는 화면 전환 후 생기므로 주기 감시
     ══════════════════════════════════════════════════════════ */

  function wgInit() {
    wgInjectStyles();
    wgEnsureModal();
    wgRegisterBadges();
    wgInjectLauncher();
    wgPatchSaveDiary();
    wgAnnounceCraving();

    setInterval(function () {
      try {
        wgInjectBingo();
        wgPatchSaveDiary();
        wgRegisterBadges();
      } catch (e) {}
    }, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wgInit);
  } else {
    wgInit();
  }

})();
