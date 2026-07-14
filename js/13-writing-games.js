/* ============================================================
   13-writing-games.js — 글쓰기 게이미피케이션 확장 모듈 (v5)
   ─ 로드 순서: 12-ieum-review.js 뒤, 반드시 마지막
   ─ 기존 파일 수정 없음. UI(빙고 칩·팝업·런처·모달·CSS)는
     이 파일이 스스로 DOM에 주입한다.

   포함 게임
     ① 오감 빙고        : 팝업형(v4) — 좌하단 칩 버튼 + 플로팅 팝업
     ② 펫 단어 편식     : 일일 표현 미션, saveDiary 후킹
     ③ 맞춤법 몬스터 사냥: 검수된 문제은행 50문항 (AI 생성 미사용, v3)
     ④ 문장 늘리기 콤보  : 문장 확장 훈련 (AI는 '판정'에만 사용)

   v5 추가
     ⑤ 계정 전환 시 화면 초기화 — confirmNick/loginAnonymous를
        래핑해 닉네임이 바뀌면 이전 사용자의 작성 중 일기·논설문·
        이야기 채팅·감상문 입력이 화면에 남지 않도록 리셋
     ⑥ 로그인 안내 문구 모드 전환 — switchLoginMode 래핑

   설계 원칙: 과정 보상 / 일일 잉크 상한 150 / 경쟁 없음 /
   정보적 피드백 동반 / 기존 API 안전 래퍼 재사용
   ============================================================ */

(function () {
  'use strict';

  /* ══════════════ 0. 공용 유틸 ══════════════ */

  const WG_INK_DAILY_CAP = 150;

  function wg$(id) {
    return (typeof $ === 'function') ? $(id) : document.getElementById(id);
  }
  function wgToast(msg) {
    if (typeof toast === 'function') toast(msg);
    else console.log('[writing-games]', msg);
  }
  function wgToday() { return new Date().toISOString().slice(0, 10); }
  function wgNickKey(base) {
    let n = '';
    try { n = (typeof currentNick !== 'undefined' && currentNick) ? currentNick : ''; } catch (e) {}
    return base + (n ? '_' + n : '');
  }
  function wgLoad(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function wgSave(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function wgEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function wgAddInk(amount, reason) {
    const key = wgNickKey('mdj_wg_ink');
    const s = wgLoad(key, { date: '', total: 0 });
    const today = wgToday();
    if (s.date !== today) { s.date = today; s.total = 0; }
    const remain = WG_INK_DAILY_CAP - s.total;
    if (remain <= 0) {
      wgToast('오늘 게임 잉크는 다 모았어요! 내일 또 만나요 🌙');
      return 0;
    }
    const grant = Math.min(amount, remain);
    s.total += grant;
    wgSave(key, s);
    if (typeof addInk === 'function') { try { addInk(grant); } catch (e) {} }
    wgToast('잉크 +' + grant + '! ' + (reason || ''));
    return grant;
  }
  function wgInkStatus() {
    const s = wgLoad(wgNickKey('mdj_wg_ink'), { date: '', total: 0 });
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

  /* ── 뱃지: 기존 addBadge('한글 이름') + BADGE_INFO {이름→요소id} 체계에 등록 ── */
  const WG_BADGES = {
    '빙고 마스터':   { el: 'badge_wg1', icon: '🎯' },
    '펫 미식가':     { el: 'badge_wg2', icon: '🍽️' },
    '몬스터 헌터':   { el: 'badge_wg3', icon: '⚔️' },
    '문장 마법사':   { el: 'badge_wg4', icon: '🪄' }
  };
  function wgRegisterBadges() {
    try {
      if (typeof BADGE_INFO === 'object' && BADGE_INFO) {
        Object.keys(WG_BADGES).forEach(function (name) {
          if (!BADGE_INFO[name]) BADGE_INFO[name] = WG_BADGES[name].el;
        });
      }
    } catch (e) {}
  }
  async function wgAddBadge(name) {
    const key = wgNickKey('mdj_wg_badges');
    const mine = wgLoad(key, []);
    if (mine.indexOf(name) >= 0) return;
    mine.push(name);
    wgSave(key, mine);
    let handled = false;
    if (typeof addBadge === 'function') {
      try { await addBadge(name); handled = true; } catch (e) {}
    }
    if (!handled) wgToast((WG_BADGES[name] ? WG_BADGES[name].icon + ' ' : '') + '새 뱃지 획득: ' + name + '!');
    wgFireworks();
  }

  /* ── AI 호출 (문장 콤보 '판정' 전용) ── */
  async function wgCallAI(promptText, maxTokens) {
    if (typeof callClaude !== 'function') return null;
    try {
      const r = await callClaude({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens || 250,
        messages: [{ role: 'user', content: promptText }]
      });
      if (typeof r === 'string' && r.trim()) return r;
      if (r && typeof r.text === 'string') return r.text;
      if (r && r.content && r.content[0] && r.content[0].text) return r.content[0].text;
    } catch (e) {}
    return null;
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

  /* ══════════════ 1. 스타일 주입 ══════════════ */

  function wgInjectStyles() {
    if (document.getElementById('wgStyles')) return;
    const st = document.createElement('style');
    st.id = 'wgStyles';
    st.textContent = [
      '/* 빙고 칩 (좌하단) */',
      '#wgBingoChip { position:fixed; left:14px; bottom:84px; z-index:239; display:none;',
      '  padding:8px 14px; border:none; border-radius:20px; background:#fff; color:#555;',
      '  font-family:inherit; font-size:13px; font-weight:bold; cursor:pointer;',
      '  box-shadow:0 3px 10px rgba(0,0,0,.18); }',
      '#wgBingoChip.hot { background:#ffe066; color:#333; }',
      '/* 빙고 팝업 */',
      '#wgBingoPop { position:fixed; left:14px; bottom:132px; z-index:239; display:none;',
      '  width:min(300px, 82vw); background:#fffdf5; border:2px dashed #b8a; border-radius:14px;',
      '  padding:12px; box-shadow:0 8px 24px rgba(0,0,0,.2); }',
      '#wgBingoPop h4 { margin:0 0 8px; font-size:13px; color:#555; padding-right:24px; }',
      '#wgBingoPopClose { position:absolute; top:8px; right:8px; border:none; background:none;',
      '  font-size:16px; cursor:pointer; color:#999; }',
      '#wgBingoBoard { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; }',
      '.wg-cell { padding:7px 3px; text-align:center; font-size:11px; border-radius:8px;',
      '  background:#f0ede4; color:#999; border:1px solid #ddd; transition:all .3s; }',
      '.wg-cell.filled { background:#ffe066; color:#333; border-color:#f4c430; font-weight:700; transform:scale(1.04); }',
      '#wgBingoStatus { margin-top:6px; font-size:11px; color:#776; }',
      '/* 게임 런처 (좌하단) */',
      '#wgLauncher { position:fixed; left:14px; bottom:22px; z-index:240;',
      '  width:52px; height:52px; border-radius:50%; border:none; background:#6c5ce7; color:#fff;',
      '  font-size:24px; cursor:pointer; box-shadow:0 3px 10px rgba(0,0,0,.25); }',
      '#wgLauncher:hover { transform:scale(1.08); }',
      '/* 모달 */',
      '#wgOverlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:9991;',
      '  display:none; align-items:center; justify-content:center; }',
      '#wgOverlay.open { display:flex; }',
      '#wgModal { width:min(480px,92vw); max-height:84vh; overflow-y:auto; background:#fff;',
      '  border-radius:14px; padding:20px; font-family:inherit; }',
      '#wgModal h3 { margin:0 0 10px; font-size:18px; }',
      '.wg-btn { display:inline-block; margin:4px 4px 4px 0; padding:10px 14px; border:none;',
      '  border-radius:10px; background:#6c5ce7; color:#fff; font-family:inherit; font-size:14px; cursor:pointer; }',
      '.wg-btn.gray { background:#b2bec3; }',
      '.wg-btn.green { background:#00b894; }',
      '.wg-btn:disabled { opacity:.5; cursor:default; }',
      '.wg-menu-btn { display:block; width:100%; text-align:left; margin:6px 0; padding:12px;',
      '  border:1px solid #ddd; border-radius:10px; background:#f9f8f4; font-family:inherit;',
      '  font-size:14px; cursor:pointer; }',
      '.wg-menu-btn:hover { background:#efece2; }',
      '.wg-sentence { padding:10px; margin:8px 0; background:#f4f1ff; border-radius:8px;',
      '  font-size:15px; line-height:1.5; }',
      '.wg-input { width:100%; box-sizing:border-box; padding:10px; margin:6px 0;',
      '  border:1px solid #ccc; border-radius:8px; font-family:inherit; font-size:14px; }',
      '.wg-note { font-size:12px; color:#888; margin-top:8px; }',
      '.wg-combo-chain { font-size:13px; color:#555; margin:6px 0; }',
      '.wg-combo-chain b { color:#6c5ce7; }',
      '.wg-hp { font-size:13px; margin-bottom:6px; }'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ══════════════ 2. 공용 모달 ══════════════ */

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

  /* ══════════════ 3. 게임 ① 오감 빙고 (팝업형) ══════════════ */

  const WG_BINGO_CELLS = [
    { id: 'sight',      label: '👀 색깔·모양',   re: /(빨갛|빨간|파랗|파란|노랗|노란|까맣|까만|하얗|하얀|초록|보라|분홍|주황|반짝|눈부시|알록달록|동그란|네모난)/ },
    { id: 'sound',      label: '👂 소리',        re: /(소리|들리|들렸|시끄러|조용하|웅성|속삭)/ },
    { id: 'touch',      label: '🖐️ 촉감',        re: /(부드럽|딱딱|말랑|차갑|차가운|뜨겁|뜨거운|따뜻|폭신|미끌|까끌|촉촉|보들)/ },
    { id: 'smellTaste', label: '👃 냄새·맛',     re: /(냄새|향기|고소|달콤|매콤|짭짤|시큼|쌉싸름|구수|향긋|새콤)/ },
    { id: 'emotion',    label: '💖 감정',        re: /(기뻤|기쁘|슬펐|슬프|화났|화가 나|신났|신나|무서웠|무서|설레|뿌듯|속상|행복|즐거|외로|긴장|부끄러)/ },
    { id: 'simile',     label: '🌈 비유',        re: /(처럼|마치|듯이)/ },
    { id: 'dialogue',   label: '💬 대화 글',     re: /["\u201C][^"\u201C\u201D]{1,80}["\u201D]/ },
    { id: 'mimetic',    label: '🎵 흉내 내는 말', re: /(살금살금|반짝반짝|데굴데굴|펄쩍펄쩍|쿵쿵|덜덜|훨훨|살랑살랑|둥실둥실|쨍그랑|콰르릉|주룩주룩|솔솔|뒤뚱뒤뚱|헐레벌떡|바스락|보글보글|철썩|씽씽|쌩쌩|엉금엉금|폴짝)/ },
    { id: 'number',     label: '🔢 정확한 숫자', re: /([0-9]+|[한두세네]|다섯|여섯|일곱|여덟|아홉|열)\s?(개|명|번|시간|마리|살|송이|권|잔|분)/ }
  ];
  const WG_BINGO_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  let _wgBingoTimer = null;
  let _wgBingoBound = false;

  function wgBingoScan(text) {
    return WG_BINGO_CELLS.map(function (c) { return c.re.test(text); });
  }
  function wgBingoLineCount(filled) {
    return WG_BINGO_LINES.filter(function (line) {
      return line.every(function (i) { return filled[i]; });
    }).length;
  }

  function wgEnsureBingoUI() {
    if (document.getElementById('wgBingoChip')) return;
    const chip = document.createElement('button');
    chip.id = 'wgBingoChip';
    chip.textContent = '🎯 빙고 0줄';
    chip.addEventListener('click', wgToggleBingoPop);
    document.body.appendChild(chip);

    const pop = document.createElement('div');
    pop.id = 'wgBingoPop';
    pop.innerHTML =
      '<button id="wgBingoPopClose">✕</button>' +
      '<h4>🎯 오감 빙고 — 표현이 들어가면 불이 켜져요!</h4>' +
      '<div id="wgBingoBoard">' +
      WG_BINGO_CELLS.map(function (c) {
        return '<div class="wg-cell" id="wg_cell_' + c.id + '">' + c.label + '</div>';
      }).join('') +
      '</div>' +
      '<div id="wgBingoStatus">빙고 줄 0개 · 한 줄 +30, 다 채우면 +100!</div>';
    document.body.appendChild(pop);
    pop.querySelector('#wgBingoPopClose').addEventListener('click', wgToggleBingoPop);
  }

  function wgToggleBingoPop() {
    const pop = document.getElementById('wgBingoPop');
    if (!pop) return;
    pop.style.display = (pop.style.display === 'block') ? 'none' : 'block';
    if (pop.style.display === 'block') {
      const ta = wg$('diary');
      wgBingoRender(ta ? (ta.value || '') : '', true);
    }
  }

  /* 그림일기 화면이 보일 때만 칩 표시 + textarea 리스너 연결 */
  function wgBingoWatch() {
    const ta = wg$('diary');
    const chip = document.getElementById('wgBingoChip');
    const pop = document.getElementById('wgBingoPop');
    if (!chip) return;
    const visible = !!(ta && ta.offsetParent !== null);
    chip.style.display = visible ? 'block' : 'none';
    if (!visible && pop) pop.style.display = 'none';
    if (ta && !_wgBingoBound) {
      _wgBingoBound = true;
      wgBingoRender(ta.value || '', true);
      ta.addEventListener('input', function () {
        clearTimeout(_wgBingoTimer);
        _wgBingoTimer = setTimeout(function () { wgBingoRender(ta.value || '', false); }, 400);
      });
      /* 옛 일기 불러오기/붙여넣기 직후 잉크 파밍 방지: 포커스 시 기준선 재동기화 */
      ta.addEventListener('focus', function () { wgBingoRender(ta.value || '', true); });
    }
  }

  function wgBingoRender(text, baselineOnly) {
    const filled = wgBingoScan(text);
    WG_BINGO_CELLS.forEach(function (c, i) {
      const el = document.getElementById('wg_cell_' + c.id);
      if (el) el.classList.toggle('filled', filled[i]);
    });
    const lines = wgBingoLineCount(filled);

    const status = document.getElementById('wgBingoStatus');
    if (status) status.textContent = '빙고 줄 ' + lines + '개 · 한 줄 +30, 다 채우면 +100!';
    const chip = document.getElementById('wgBingoChip');
    if (chip) {
      chip.textContent = '🎯 빙고 ' + lines + '줄';
      chip.classList.toggle('hot', lines > 0);
    }

    const key = wgNickKey('mdj_wg_bingo');
    const s = wgLoad(key, { date: '', maxRewarded: 0, blackout: false });
    if (s.date !== wgToday()) { s.date = wgToday(); s.maxRewarded = 0; s.blackout = false; }

    if (baselineOnly) {
      s.maxRewarded = Math.max(s.maxRewarded, lines);
      wgSave(key, s);
      return;
    }
    if (lines > s.maxRewarded) {
      const gained = lines - s.maxRewarded;
      s.maxRewarded = lines;
      wgSave(key, s);
      wgAddInk(30 * gained, '(오감 빙고!)');
      wgPetSay('빙고! 네가 찾은 표현 덕분에 글이 살아 움직여 ✨');
    }
    if (filled.every(Boolean) && !s.blackout) {
      s.blackout = true;
      wgSave(key, s);
      wgAddInk(100, '(빙고판 블랙아웃!)');
      wgAddBadge('빙고 마스터');
      wgPetSay('세상에… 아홉 칸을 전부 채우다니! 진짜 표현의 달인이야 🎆');
    }
  }

  /* ══════════════ 4. 게임 ② 펫 단어 편식 ══════════════ */

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
  function wgCheckPetCraving() {
    const key = wgNickKey('mdj_wg_pet');
    const s = wgLoad(key, { date: '', done: false, count: 0 });
    if (s.date !== wgToday()) { s.date = wgToday(); s.done = false; }
    if (s.done) return;
    const ta = wg$('diary');
    const text = ta ? (ta.value || '') : '';
    const craving = wgTodayCraving();
    const re = wgCravingRegex(craving.id);
    if (!text || !re || !re.test(text)) return;
    s.done = true;
    s.count = (s.count || 0) + 1;
    wgSave(key, s);
    wgAddPetExp(20);
    wgAddInk(10, '(펫 밥 주기 성공!)');
    wgPetSay('냠냠! 네 글 속에서 ' + craving.label + '을(를) 찾아 먹었어. 정말 근사한 표현이었어 💕');
    if (s.count >= 7) wgAddBadge('펫 미식가');
  }
  function wgPatchSaveDiary() {
    if (window._wgSaveDiaryPatched) return;
    if (typeof window.saveDiary === 'function') {
      const orig = window.saveDiary;
      window.saveDiary = function () {
        const result = orig.apply(this, arguments);
        try { wgCheckPetCraving(); } catch (e) {}
        return result;
      };
      window._wgSaveDiaryPatched = true;
    }
  }

  /* ══════════════ 5. 게임 ③ 맞춤법 몬스터 사냥 (문제은행 v3) ══════════════
     - AI 문장 생성 미사용: 국립국어원 표준 표기 기준으로 검수한 50문항
     - 한 판 4마리 = 서로 다른 유형 4개 보장
     - 최근 문항 24개 + 유형 12개 이중 중복 방지
     - 일기 교정 조언(spellingAdvice) 키워드 매칭으로 취약 유형 우선 출제 */

  const WG_MONSTER_BANK = [
    { t:'되다/돼다', w:'내일 학교에 가야 되.', r:'내일 학교에 가야 돼.', h:'"되어"로 바꿔 말이 되면 "돼"를 써요.' },
    { t:'되다/돼다', w:'이제 집에 가도 되?', r:'이제 집에 가도 돼?', h:'문장 끝에서는 "돼"를 써요. ("되어"의 준말)' },
    { t:'되다/돼다', w:'커서 의사가 돼고 싶다.', r:'커서 의사가 되고 싶다.', h:'"되어고"는 말이 안 되죠? 그럼 "되고"예요.' },
    { t:'안/않', w:'숙제를 다 하지 안았다.', r:'숙제를 다 하지 않았다.', h:'"아니 하다"의 준말은 "않다"예요.' },
    { t:'안/않', w:'오늘은 비가 오지 안는다.', r:'오늘은 비가 오지 않는다.', h:'"-지" 뒤에는 "않다"를 써요.' },
    { t:'안/않', w:'밥을 않 먹었다.', r:'밥을 안 먹었다.', h:'혼자 쓰일 때는 "안"이에요. (안 먹다, 안 가다)' },
    { t:'왠/웬', w:'오늘은 웬지 기분이 좋다.', r:'오늘은 왠지 기분이 좋다.', h:'"왜인지"의 준말은 "왠지"예요. 나머지는 다 "웬"!' },
    { t:'왠/웬', w:'왠 떡이야?', r:'웬 떡이야?', h:'"어찌 된"의 뜻일 때는 "웬"을 써요.' },
    { t:'낫다/낳다', w:'감기가 빨리 낳았으면 좋겠다.', r:'감기가 빨리 나았으면 좋겠다.', h:'병이 좋아지는 것은 "낫다"예요. "낳다"는 아기를 낳을 때!' },
    { t:'낫다/낳다', w:'우리 고양이가 새끼를 났다.', r:'우리 고양이가 새끼를 낳았다.', h:'새끼나 알은 "낳다"를 써요.' },
    { t:'며칠', w:'몇일 동안 비가 왔다.', r:'며칠 동안 비가 왔다.', h:'날짜를 셀 때는 언제나 "며칠"이에요. "몇일"은 틀린 말!' },
    { t:'며칠', w:'오늘이 몇 월 몇일이지?', r:'오늘이 몇 월 며칠이지?', h:'"몇일"이라는 말은 국어에 없어요. 항상 "며칠"!' },
    { t:'금세', w:'아이스크림이 금새 녹았다.', r:'아이스크림이 금세 녹았다.', h:'"금시에"의 준말이라서 "금세"예요.' },
    { t:'오랜만', w:'오랫만에 할머니를 만났다.', r:'오랜만에 할머니를 만났다.', h:'"오래간만"의 준말이라서 "오랜만"이에요.' },
    { t:'오랜만', w:'정말 오랫동안 기다렸다며 반가워했다. 오랫만이야!', r:'정말 오랫동안 기다렸다며 반가워했다. 오랜만이야!', h:'"오랫동안"은 ㅅ이 있고, "오랜만"은 ㅅ이 없어요.' },
    { t:'바라/바래', w:'네 소원이 이루어지길 바래.', r:'네 소원이 이루어지길 바라.', h:'"바라다"가 기본형이라 "바라"가 맞아요. "바래다"는 색이 변하는 것!' },
    { t:'-ㄹ게', w:'내가 먼저 갈께!', r:'내가 먼저 갈게!', h:'소리는 [께]라도 적을 때는 "-ㄹ게"예요.' },
    { t:'-ㄹ게', w:'이따가 전화할께.', r:'이따가 전화할게.', h:'"-ㄹ게"로 적어요. (할게, 갈게, 줄게)' },
    { t:'봬요', w:'선생님, 내일 뵈요!', r:'선생님, 내일 봬요!', h:'"뵈어요"의 준말이라서 "봬요"가 맞아요.' },
    { t:'-던/-든', w:'먹던지 말던지 마음대로 해.', r:'먹든지 말든지 마음대로 해.', h:'선택은 "-든지", 과거 기억은 "-던지"예요.' },
    { t:'-던/-든', w:'어제 먹든 피자가 생각난다.', r:'어제 먹던 피자가 생각난다.', h:'과거를 떠올릴 때는 "-던"을 써요.' },
    { t:'맞히다/맞추다', w:'퀴즈 정답을 맞췄다.', r:'퀴즈 정답을 맞혔다.', h:'정답은 "맞히다", 퍼즐 조각은 "맞추다"예요.' },
    { t:'맞히다/맞추다', w:'친구와 답을 맞혀 보았다.', r:'친구와 답을 맞춰 보았다.', h:'서로 비교할 때는 "맞추다"를 써요.' },
    { t:'잃다/잊다', w:'지우개를 잊어버렸다.', r:'지우개를 잃어버렸다.', h:'물건은 "잃어버리다", 기억은 "잊어버리다"예요.' },
    { t:'잃다/잊다', w:'숙제하는 것을 깜빡 잃어버렸다.', r:'숙제하는 것을 깜빡 잊어버렸다.', h:'기억이 안 나는 것은 "잊어버리다"예요.' },
    { t:'붙이다/부치다', w:'편지에 우표를 부쳤다.', r:'편지에 우표를 붙였다.', h:'풀로 붙이는 것은 "붙이다", 편지를 보내는 것은 "부치다"예요.' },
    { t:'붙이다/부치다', w:'삼촌에게 소포를 붙였다.', r:'삼촌에게 소포를 부쳤다.', h:'우편으로 보낼 때는 "부치다"를 써요.' },
    { t:'가리키다/가르치다', w:'선생님이 수학을 가리켜 주셨다.', r:'선생님이 수학을 가르쳐 주셨다.', h:'지식은 "가르치다", 손가락으로 방향은 "가리키다"예요.' },
    { t:'가리키다/가르치다', w:'시계 바늘이 3시를 가르쳤다.', r:'시계 바늘이 3시를 가리켰다.', h:'방향이나 대상을 콕 짚는 것은 "가리키다"예요.' },
    { t:'다르다/틀리다', w:'내 생각은 네 생각과 틀리다.', r:'내 생각은 네 생각과 다르다.', h:'같지 않은 것은 "다르다", 정답이 아닌 것은 "틀리다"예요.' },
    { t:'다르다/틀리다', w:'쌍둥이인데 성격이 서로 틀려요.', r:'쌍둥이인데 성격이 서로 달라요.', h:'비교해서 같지 않으면 "다르다"!' },
    { t:'작다/적다', w:'내 동생은 키가 적다.', r:'내 동생은 키가 작다.', h:'크기는 "작다", 수나 양은 "적다"예요.' },
    { t:'작다/적다', w:'용돈이 너무 작다.', r:'용돈이 너무 적다.', h:'돈의 양은 "적다"를 써요.' },
    { t:'-이/-히', w:'곰곰히 생각해 보았다.', r:'곰곰이 생각해 보았다.', h:'"곰곰이"가 표준어예요. (더욱이, 일찍이도 -이!)' },
    { t:'-이/-히', w:'방을 깨끗히 청소했다.', r:'방을 깨끗이 청소했다.', h:'"깨끗이"로 적어요. [깨끄시]로 소리 나기 때문!' },
    { t:'-대/-데', w:'내일 소풍 간데!', r:'내일 소풍 간대!', h:'남에게 들은 말 전달은 "-대"(~다고 해)예요.' },
    { t:'-대/-데', w:'어제 가 보니 바다가 정말 멋있대.', r:'어제 가 보니 바다가 정말 멋있데.', h:'내가 직접 겪은 감탄은 "-데"(~더라)예요.' },
    { t:'띄어쓰기', w:'나는 수영을 할수있다.', r:'나는 수영을 할 수 있다.', h:'"할 수 있다"는 세 낱말이라 띄어 써요.' },
    { t:'띄어쓰기', w:'이 연필은 내거야.', r:'이 연필은 내 거야.', h:'"거(것)"는 앞말과 띄어 써요.' },
    { t:'띄어쓰기', w:'우리 반에서 내가 제일 잘한다. 너도 할수 있어!', r:'우리 반에서 내가 제일 잘한다. 너도 할 수 있어!', h:'"할 수 있다"는 항상 띄어 써요.' },
    { t:'어이없다', w:'정말 어의없는 일이었다.', r:'정말 어이없는 일이었다.', h:'"어이없다"가 맞아요. "어의"는 임금님 옷!' },
    { t:'희한하다', w:'정말 희안한 꿈을 꾸었다.', r:'정말 희한한 꿈을 꾸었다.', h:'"희한하다"가 표준어예요. (드물 희, 드물 한)' },
    { t:'역할', w:'연극에서 내 역활은 토끼였다.', r:'연극에서 내 역할은 토끼였다.', h:'"역할"이 맞는 표기예요.' },
    { t:'설레다', w:'소풍 전날이라 마음이 설레인다.', r:'소풍 전날이라 마음이 설렌다.', h:'기본형은 "설레다"라서 "설렌다"가 맞아요.' },
    { t:'설레다', w:'설레이는 마음으로 선물을 열었다.', r:'설레는 마음으로 선물을 열었다.', h:'"설레이다"는 틀린 말, "설레다"가 맞아요.' },
    { t:'-예요/-이에요', w:'제 꿈은 화가에요.', r:'제 꿈은 화가예요.', h:'받침 없는 말 뒤에는 "-예요"를 써요.' },
    { t:'-예요/-이에요', w:'이것은 제 책이예요.', r:'이것은 제 책이에요.', h:'받침 있는 말 뒤에는 "-이에요"를 써요.' },
    { t:'무난하다', w:'그 옷은 색이 문안하다.', r:'그 옷은 색이 무난하다.', h:'"무난하다"(어렵지 않다)가 맞아요. "문안"은 안부 인사!' },
    { t:'담그다', w:'김치를 담궜다.', r:'김치를 담갔다.', h:'기본형이 "담그다"라서 "담갔다"가 맞아요.' },
    { t:'잠그다', w:'문을 꼭 잠궈라.', r:'문을 꼭 잠가라.', h:'기본형이 "잠그다"라서 "잠가라"가 맞아요.' }
  ];

  let _wgMonsters = [];
  let _wgMonsterIdx = 0;
  let _wgMonsterFails = 0;

  async function wgWeakTypes() {
    const weak = [];
    try {
      if (typeof getEntries === 'function') {
        const entries = (await getEntries()) || [];
        const recent = entries.slice(-10);
        const adviceText = recent.map(function (e) {
          return (e && e.spellingAdvice) ? String(e.spellingAdvice) : '';
        }).join(' ');
        const typeKeywords = {
          '되다/돼다': /되|돼/, '안/않': /않|안 /, '왠/웬': /왠|웬/, '며칠': /며칠|몇일/,
          '낫다/낳다': /낫|낳/, '띄어쓰기': /띄어|띄여/, '-예요/-이에요': /예요|이에요/,
          '맞히다/맞추다': /맞히|맞추/, '잃다/잊다': /잃|잊/, '설레다': /설레/
        };
        Object.keys(typeKeywords).forEach(function (t) {
          if (typeKeywords[t].test(adviceText)) weak.push(t);
        });
      }
    } catch (e) {}
    return weak;
  }

  async function wgBuildMonsters() {
    const histKey = wgNickKey('mdj_wg_mhist');
    const hist = wgLoad(histKey, { sents: [], types: [] });
    const weak = await wgWeakTypes();

    const pool = WG_MONSTER_BANK.filter(function (q) {
      return hist.sents.indexOf(q.w) < 0;
    });
    function pickFrom(arr, usedTypes) {
      const fresh = arr.filter(function (q) {
        return usedTypes.indexOf(q.t) < 0 && hist.types.indexOf(q.t) < 0;
      });
      const cand = fresh.length ? fresh : arr.filter(function (q) {
        return usedTypes.indexOf(q.t) < 0;
      });
      if (!cand.length) return null;
      return cand[Math.floor(Math.random() * cand.length)];
    }

    const picked = [];
    const usedTypes = [];
    /* 취약 유형 우선 최대 2문항 */
    const weakPool = pool.filter(function (q) { return weak.indexOf(q.t) >= 0; });
    while (picked.length < 2 && weakPool.length) {
      const q = pickFrom(weakPool, usedTypes);
      if (!q) break;
      picked.push(q); usedTypes.push(q.t);
      weakPool.splice(weakPool.indexOf(q), 1);
    }
    /* 나머지 무작위 유형 */
    while (picked.length < 4) {
      const q = pickFrom(pool.filter(function (x) { return picked.indexOf(x) < 0; }), usedTypes);
      if (!q) break;
      picked.push(q); usedTypes.push(q.t);
    }
    /* 이력 갱신 (문항 24개 · 유형 12개 기억) */
    picked.forEach(function (q) {
      hist.sents.push(q.w); hist.types.push(q.t);
    });
    hist.sents = hist.sents.slice(-24);
    hist.types = hist.types.slice(-12);
    wgSave(histKey, hist);
    return picked;
  }

  function wgNorm(s, dropSpace) {
    let t = String(s || '').trim().replace(/[.,!?…~"'\u201C\u201D]/g, '').replace(/\s+/g, ' ');
    if (dropSpace) t = t.replace(/\s/g, '');
    return t;
  }

  async function wgStartMonsterHunt() {
    wgOpenModal('<h3>⚔️ 맞춤법 몬스터 사냥</h3><p>몬스터를 불러오는 중… 잠깐만요! 🔮</p>');
    _wgMonsters = await wgBuildMonsters();
    _wgMonsterIdx = 0;
    _wgMonsterFails = 0;
    if (!_wgMonsters.length) {
      wgOpenModal('<h3>⚔️ 맞춤법 몬스터 사냥</h3><p>몬스터 준비에 문제가 생겼어요. 잠시 후 다시 열어 주세요!</p><button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>');
      return;
    }
    wgRenderMonster();
  }
  window.wgStartMonsterHunt = wgStartMonsterHunt;

  function wgRenderMonster() {
    if (_wgMonsterIdx >= _wgMonsters.length) {
      const kills = wgLoad(wgNickKey('mdj_wg_monster'), { kills: 0 }).kills;
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
      ' · 기회 ' + (2 - _wgMonsterFails) + '번 남음 · 유형: ' + wgEsc(q.t) + '</div>' +
      '<p>👾 몬스터가 틀린 문장을 외치고 있어요! 바르게 고쳐서 물리치세요.</p>' +
      '<div class="wg-sentence">' + wgEsc(q.w) + '</div>' +
      '<input class="wg-input" id="wgMonsterInput" placeholder="바르게 고친 문장을 써 보세요">' +
      '<div id="wgMonsterMsg" class="wg-note"></div>' +
      '<button class="wg-btn" onclick="wgAnswerMonster()">공격!</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">그만하기</button>'
    );
    const inp = document.getElementById('wgMonsterInput');
    if (inp) {
      inp.focus();
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); wgAnswerMonster(); }
      });
    }
  }

  function wgAnswerMonster() {
    const q = _wgMonsters[_wgMonsterIdx];
    const input = document.getElementById('wgMonsterInput');
    const msg = document.getElementById('wgMonsterMsg');
    const ans = input ? input.value : '';
    if (wgNorm(ans) === wgNorm(q.r)) { wgMonsterCorrect(q); return; }
    if (wgNorm(ans, true) === wgNorm(q.r, true)) {
      if (msg) msg.textContent = '💡 거의 다 왔어요! 띄어쓰기만 다시 살펴보세요.';
      return;
    }
    _wgMonsterFails++;
    if (_wgMonsterFails >= 2) {
      wgOpenModal(
        '<h3>👾 몬스터가 도망갔어요!</h3>' +
        '<p>정답은 이거예요:</p><div class="wg-sentence">✅ ' + wgEsc(q.r) + '</div>' +
        '<p class="wg-note">💡 ' + wgEsc(q.h || '') + '</p>' +
        '<p>정답 문장을 한 번 소리 내어 읽고 다음으로 넘어가요!</p>' +
        '<button class="wg-btn" onclick="wgNextMonster()">다 읽었어요, 다음!</button>'
      );
    } else {
      if (msg) msg.textContent = '❌ 아직 몬스터가 버티고 있어요! 힌트: ' + (q.h || '틀린 낱말 하나를 찾아보세요.');
    }
  }
  window.wgAnswerMonster = wgAnswerMonster;

  function wgMonsterCorrect(q) {
    wgOpenModal(
      '<h3>💥 명중!</h3>' +
      '<div class="wg-sentence">✅ ' + wgEsc(q.r) + '</div>' +
      '<p class="wg-note">💡 ' + wgEsc(q.h || '') + '</p>' +
      '<p>📢 마지막 한 방! 고친 문장을 <b>큰 소리로 읽으면</b> 몬스터가 쓰러져요.</p>' +
      '<button class="wg-btn green" onclick="wgConfirmKill()">다 읽었어요!</button>'
    );
  }
  function wgConfirmKill() {
    const key = wgNickKey('mdj_wg_monster');
    const s = wgLoad(key, { kills: 0 });
    s.kills = (s.kills || 0) + 1;
    wgSave(key, s);
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

  /* ══════════════ 6. 게임 ④ 문장 늘리기 콤보 ══════════════ */

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
    const inp = document.getElementById('wgComboInput');
    if (inp) {
      inp.focus();
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); wgSubmitCombo(); }
      });
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

  /* ══════════════ 7. 게임 런처 (허브) ══════════════ */

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
    const petState = wgLoad(wgNickKey('mdj_wg_pet'), { done: false, count: 0, date: '' });
    const cravingDone = (petState.date === wgToday() && petState.done);
    const kills = wgLoad(wgNickKey('mdj_wg_monster'), { kills: 0 }).kills;

    wgOpenModal(
      '<h3>🎮 글쓰기 게임</h3>' +
      '<p class="wg-note">오늘 게임 잉크: <b>' + inkUsed + ' / ' + WG_INK_DAILY_CAP + '</b></p>' +
      '<button class="wg-menu-btn" onclick="wgStartMonsterHunt()">' +
      '⚔️ 맞춤법 몬스터 사냥 <span class="wg-note">— 지금까지 ' + kills + '마리 처치</span></button>' +
      '<button class="wg-menu-btn" onclick="wgStartCombo()">' +
      '🪄 문장 늘리기 콤보 <span class="wg-note">— 문장을 6겹까지 키워 보세요</span></button>' +
      '<p class="wg-note">🍽️ 오늘 펫의 편식: <b>' + wgEsc(craving.label) + '</b> ' +
      (cravingDone ? '(오늘 먹여 줬어요 ✅)' : '(일기에 쓰고 저장하면 먹어요!)') + '</p>' +
      '<p class="wg-note">🎯 오감 빙고는 그림일기 화면 왼쪽 아래 칩을 눌러 열 수 있어요.</p>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
  }
  window.wgOpenHub = wgOpenHub;

  /* ══════════════ 8. ✅ [v5 신규] 계정 전환 시 화면 초기화 ══════════════
     문제: 일기 데이터는 닉네임별로 분리 저장되지만, 다른 계정으로
     로그인해도 이전 사용자가 화면에 남긴 작성 중 일기·논설문·이야기
     채팅·감상문 입력이 그대로 보인다 (공용 기기 프라이버시 문제).
     해결: confirmNick / loginAnonymous를 래핑해 닉네임이 실제로
     바뀌었을 때 각 모듈의 초기화 함수를 호출하고 입력 필드를 비운다. */

  function wgResetAllUserUI() {
    /* ① 그림일기 에디터 (텍스트·그림·점수·스탬프 전부 초기화) */
    try { if (typeof newDiary === 'function') newDiary(); } catch (e) {}
    /* ② 논설문 에디터 */
    try { if (typeof newEssay === 'function') newEssay(); } catch (e) {}
    /* ③ 틔움 이야기/토론 채팅 로그 */
    try { if (typeof resetStory === 'function') resetStory(); } catch (e) {}
    /* ④ 남아 있을 수 있는 입력 필드 비우기 (감상문·틔움 입력 등) */
    [
      'storyInput', 'interestInput',
      'reviewCharInput', 'reviewFact', 'reviewThought', 'reviewTitleInput', 'reviewFinalText',
      'rvBrainCharInput', 'rvBrainCore', 'rvBrainTitleInput',
      'rvVennChar', 'rvVennMe', 'rvVennCommon',
      'rvNewsHeadline', 'rvNewsLead', 'rvNewsBody', 'rvNewsQuote',
      'rvCertTitle', 'rvCertCitation'
    ].forEach(function (id) {
      const el = wg$(id);
      if (el && 'value' in el) el.value = '';
    });
    /* ⑤ 게임 모듈 자체 상태 리셋 (빙고 기준선은 닉네임별 키라 자동 분리) */
    const ta = wg$('diary');
    if (ta) wgBingoRender(ta.value || '', true);
  }

  function wgGetNick() {
    try { return (typeof currentNick !== 'undefined' && currentNick) ? currentNick : null; } catch (e) { return null; }
  }

  function wgPatchLogin(fnName) {
    const orig = window[fnName];
    if (typeof orig !== 'function' || orig._wgPatched) return;
    const wrapped = async function () {
      const prev = wgGetNick();
      const result = await orig.apply(this, arguments);
      const now = wgGetNick();
      if (now && now !== prev) {
        try { wgResetAllUserUI(); } catch (e) {}
      }
      return result;
    };
    wrapped._wgPatched = true;
    window[fnName] = wrapped;
  }

  /* ══════════════ 9. ✅ [v5 신규] 로그인 안내 문구 모드 전환 ══════════════
     로그인 영역 1줄 개편으로 익명 모드 전용 안내가 사라졌으므로,
     모드 전환 시 nickPwHint 문구를 바꿔 준다. */

  function wgPatchSwitchLoginMode() {
    const orig = window.switchLoginMode;
    if (typeof orig !== 'function' || orig._wgPatched) return;
    const wrapped = function (mode) {
      const result = orig.apply(this, arguments);
      const hint = wg$('nickPwHint');
      if (hint) {
        hint.textContent = (mode === 'anon')
          ? '🔒 선생님이 나눠준 학급 코드와 비밀번호로 로그인해요. 이름·학교·이메일은 절대 입력하지 않아요! (코드를 잃어버렸다면 선생님께 문의)'
          : '🔐 처음 쓰는 이름이면 지금 비밀번호로 새로 등록돼요. 다음에도 같은 이름 + 비밀번호로 들어와주세요!';
      }
      return result;
    };
    wrapped._wgPatched = true;
    window.switchLoginMode = wrapped;
  }

  /* ══════════════ 10. 초기화 ══════════════ */

  function wgInit() {
    wgInjectStyles();
    wgEnsureModal();
    wgRegisterBadges();
    wgInjectLauncher();
    wgEnsureBingoUI();
    wgPatchSaveDiary();
    wgPatchLogin('confirmNick');
    wgPatchLogin('loginAnonymous');
    wgPatchSwitchLoginMode();

    setInterval(function () {
      try {
        wgBingoWatch();          // 그림일기 화면 감시 (칩 표시/숨김)
        wgPatchSaveDiary();      // 늦게 정의되는 경우 대비
        wgPatchLogin('confirmNick');
        wgPatchLogin('loginAnonymous');
        wgPatchSwitchLoginMode();
      } catch (e) {}
    }, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wgInit);
  } else {
    wgInit();
  }

})();
