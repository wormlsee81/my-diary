/* ============================================================
   13-writing-games.js — 글쓰기 게이미피케이션 확장 모듈
   v4 : 오감 빙고를 인라인 → 플로팅 팝업으로 변경
        (일기장 공간을 차지하지 않음. 좌측 하단 🎯 칩 버튼으로 열고 닫음)
   v3 : 몬스터 사냥 AI 생성 제거, 검수 문제은행 50문항(24유형)
   ─ 로드 순서: 12-ieum-review.js 뒤, 반드시 마지막
   ─ 기존 파일 수정 없음. UI/CSS는 이 파일이 스스로 주입한다.

   포함 게임
     ① 오감 빙고        : 팝업 빙고판 + 실시간 표현 감지 (API 비용 0)
     ② 펫 단어 편식     : 일일 표현 미션, saveDiary 후킹
     ③ 맞춤법 몬스터 사냥: 검수된 문제은행 50문항 (AI 미사용)
     ④ 문장 늘리기 콤보  : 문장 확장 훈련 (haiku 판정, 폴백 있음)

   설계 원칙
     - 결과가 아닌 '과정(전략 사용)'에 보상
     - 일일 게임 잉크 상한 150
     - 경쟁 요소 없음(자기 기준 완성형)
     - 기존 시스템(addInk/petSay/addPetExp/addBadge/BADGE_INFO/
       callClaude/showFireworks/getEntries) 재사용 + 안전 래퍼
   ============================================================ */

(function () {
  'use strict';

  /* ══════════════ 0. 공용 유틸 ══════════════ */

  var WG_INK_DAILY_CAP = 150;

  function wg$(id) { return document.getElementById(id); }

  function wgToast(msg) {
    if (typeof toast === 'function') { try { toast(msg); return; } catch (e) {} }
    console.log('[writing-games]', msg);
  }

  function wgToday() { return new Date().toISOString().slice(0, 10); }

  function wgNick() {
    try {
      if (typeof nickname === 'string' && nickname) return nickname;
      if (typeof window.currentUser === 'string' && window.currentUser) return window.currentUser;
      var n = localStorage.getItem('mdj_nickname') || localStorage.getItem('nickname');
      if (n) return n.replace(/^"|"$/g, '');
    } catch (e) {}
    return 'guest';
  }

  function wgKey(base) { return base + '_' + wgNick(); }

  function wgLoad(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
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
    var s = wgLoad(wgKey('mdj_wg_ink'), { date: '', total: 0 });
    var today = wgToday();
    if (s.date !== today) { s.date = today; s.total = 0; }
    var remain = WG_INK_DAILY_CAP - s.total;
    if (remain <= 0) {
      wgToast('오늘 게임 잉크는 다 모았어요! 내일 또 만나요 🌙');
      return 0;
    }
    var grant = Math.min(amount, remain);
    s.total += grant;
    wgSave(wgKey('mdj_wg_ink'), s);
    if (typeof addInk === 'function') { try { addInk(grant); } catch (e) {} }
    wgToast('잉크 +' + grant + '! ' + (reason || ''));
    return grant;
  }

  function wgInkStatus() {
    var s = wgLoad(wgKey('mdj_wg_ink'), { date: '', total: 0 });
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

  /* ── 뱃지 (이름 → 요소 id 매핑 방식, 기존 addBadge 재사용) ── */
  var WG_BADGES = {
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

  function wgAddBadge(name) {
    var mine = wgLoad(wgKey('mdj_wg_badges'), []);
    if (mine.indexOf(name) >= 0) return;
    mine.push(name);
    wgSave(wgKey('mdj_wg_badges'), mine);
    var handled = false;
    if (typeof addBadge === 'function') {
      try { addBadge(name); handled = true; } catch (e) {}
    }
    if (!handled) {
      var b = WG_BADGES[name];
      wgToast((b ? b.icon + ' ' : '') + '새 뱃지 획득: ' + name + '!');
    }
    wgFireworks();
  }

  /* ── AI 호출 (문장 콤보 '판정' 전용, 실패 시 null) ── */
  function wgCallAI(prompt, maxTokens) {
    return new Promise(function (resolve) {
      if (typeof callClaude !== 'function') { resolve(null); return; }
      var body = {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens || 250,
        messages: [{ role: 'user', content: prompt }]
      };
      Promise.resolve()
        .then(function () { return callClaude(body); })
        .then(function (r) {
          if (typeof r === 'string' && r.trim()) { resolve(r); return; }
          if (r && typeof r.text === 'string') { resolve(r.text); return; }
          if (r && r.content && r.content[0] && r.content[0].text) { resolve(r.content[0].text); return; }
          resolve(null);
        })
        .catch(function () { resolve(null); });
    });
  }

  function wgParseJSON(raw) {
    if (!raw) return null;
    try {
      var m = String(raw).match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      return m ? JSON.parse(m[0]) : null;
    } catch (e) { return null; }
  }

  /* ══════════════ 1. 스타일 주입 ══════════════ */

  function wgInjectStyles() {
    if (wg$('wgStyles')) return;
    var st = document.createElement('style');
    st.id = 'wgStyles';
    st.textContent = [
      /* ── 빙고 칩 버튼 (좌측 하단, 🎮 런처 위) ── */
      '#wgBingoChip { position: fixed; left: 14px; bottom: 84px; z-index: 240;',
      '  display: none; align-items: center; gap: 6px; padding: 8px 14px;',
      '  border: 2px solid #b8a; border-radius: 20px; background: #fffdf5;',
      '  font-family: inherit; font-size: 13px; font-weight: 700; color: #776;',
      '  cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.18); }',
      '#wgBingoChip.on { display: flex; }',
      '#wgBingoChip.glow { border-color: #f4c430; background: #fff6d8; color: #a80; }',

      /* ── 빙고 팝업 패널 (타이핑을 막지 않는 플로팅 창) ── */
      '#wgBingoPop { position: fixed; left: 14px; bottom: 136px; z-index: 241;',
      '  display: none; width: 300px; max-width: calc(100vw - 28px);',
      '  padding: 12px; background: #fffdf5; border: 2px dashed #b8a;',
      '  border-radius: 14px; box-shadow: 0 6px 20px rgba(0,0,0,.22); }',
      '#wgBingoPop.open { display: block; }',
      '#wgBingoPop h4 { margin: 0 22px 8px 0; font-size: 13px; color: #665; }',
      '#wgBingoClose { position: absolute; top: 8px; right: 10px; border: none;',
      '  background: none; font-size: 16px; cursor: pointer; color: #998; }',
      '#wgBingoBoard { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 5px; }',
      '.wg-cell { padding: 8px 2px; text-align: center; font-size: 11px; border-radius: 8px;',
      '  background: #f0ede4; color: #999; border: 1px solid #ddd; transition: all .3s; }',
      '.wg-cell.filled { background: #ffe066; color: #333; border-color: #f4c430;',
      '  font-weight: 700; transform: scale(1.04); }',
      '#wgBingoStatus { margin-top: 7px; font-size: 11px; color: #776; }',

      /* ── 게임 런처 ── */
      '#wgLauncher { position: fixed; left: 14px; bottom: 22px; z-index: 240;',
      '  width: 52px; height: 52px; border-radius: 50%; border: none;',
      '  background: #6c5ce7; color: #fff; font-size: 24px; cursor: pointer;',
      '  box-shadow: 0 3px 10px rgba(0,0,0,.25); }',
      '#wgLauncher:hover { transform: scale(1.08); }',

      /* ── 공용 모달 ── */
      '#wgOverlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 9991;',
      '  display: none; align-items: center; justify-content: center; }',
      '#wgOverlay.open { display: flex; }',
      '#wgModal { width: min(480px, 92vw); max-height: 84vh; overflow-y: auto;',
      '  background: #fff; border-radius: 14px; padding: 20px; }',
      '#wgModal h3 { margin: 0 0 10px; font-size: 18px; }',
      '.wg-btn { display: inline-block; margin: 4px 4px 4px 0; padding: 10px 14px;',
      '  border: none; border-radius: 10px; background: #6c5ce7; color: #fff;',
      '  font-family: inherit; font-size: 14px; cursor: pointer; }',
      '.wg-btn.gray { background: #b2bec3; }',
      '.wg-btn.green { background: #00b894; }',
      '.wg-btn:disabled { opacity: .5; cursor: default; }',
      '.wg-menu-btn { display: block; width: 100%; text-align: left; margin: 6px 0;',
      '  padding: 12px; border: 1px solid #ddd; border-radius: 10px;',
      '  background: #f9f8f4; font-family: inherit; font-size: 14px; cursor: pointer; }',
      '.wg-menu-btn:hover { background: #efece2; }',
      '.wg-sentence { padding: 10px; margin: 8px 0; background: #f4f1ff; border-radius: 8px;',
      '  font-size: 15px; line-height: 1.5; }',
      '.wg-input { width: 100%; box-sizing: border-box; padding: 10px; margin: 6px 0;',
      '  border: 1px solid #ccc; border-radius: 8px; font-family: inherit; font-size: 14px; }',
      '.wg-note { font-size: 12px; color: #888; margin-top: 8px; }',
      '.wg-combo-chain { font-size: 13px; color: #555; margin: 6px 0; }',
      '.wg-combo-chain b { color: #6c5ce7; }',
      '.wg-hp { font-size: 13px; margin-bottom: 6px; }',

      /* 모바일: 팝업 폭 보정 */
      '@media (max-width: 480px) {',
      '  #wgBingoPop { width: calc(100vw - 28px); }',
      '}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ══════════════ 2. 공용 모달 ══════════════ */

  function wgEnsureModal() {
    if (wg$('wgOverlay')) return;
    var ov = document.createElement('div');
    ov.id = 'wgOverlay';
    ov.innerHTML = '<div id="wgModal"></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) wgCloseModal(); });
    document.body.appendChild(ov);
  }

  function wgOpenModal(html) {
    wgEnsureModal();
    wg$('wgModal').innerHTML = html;
    wg$('wgOverlay').classList.add('open');
  }

  function wgCloseModal() {
    var ov = wg$('wgOverlay');
    if (ov) ov.classList.remove('open');
  }
  window.wgCloseModal = wgCloseModal;

  /* ══════════════════════════════════════════════════════════
     3. 게임 ① 오감 빙고 — 플로팅 팝업 방식 (v4)
        - 일기 화면에서만 좌측 하단에 🎯 칩 버튼 표시
        - 칩을 누르면 빙고판 팝업이 떠서 확인 (타이핑 방해 없음)
        - 감지는 팝업이 닫혀 있어도 항상 동작, 칩에 줄 수 실시간 표시
        - 잉크 파밍 방어: 하루 최대 지급 줄 수 기억 + focus 시 기준선 재동기화
     ══════════════════════════════════════════════════════════ */

  var WG_BINGO_CELLS = [
    { id: 'sight',      label: '👀 색깔·모양',   re: /(빨갛|빨간|파랗|파란|노랗|노란|까맣|까만|하얗|하얀|초록|보라|분홍|주황|반짝|눈부시|알록달록|동그란|네모난)/ },
    { id: 'sound',      label: '👂 소리',        re: /(소리|들리|들렸|시끄러|조용하|웅성|속삭)/ },
    { id: 'touch',      label: '🖐️ 촉감',        re: /(부드럽|딱딱|말랑|차갑|차가운|뜨겁|뜨거운|따뜻|폭신|미끌|까끌|촉촉|보들)/ },
    { id: 'smellTaste', label: '👃 냄새·맛',     re: /(냄새|향기|고소|달콤|매콤|짭짤|시큼|쌉싸름|구수|향긋|새콤)/ },
    { id: 'emotion',    label: '💖 감정',        re: /(기뻤|기쁘|슬펐|슬프|화났|화가 나|신났|신나|무서웠|무서|설레|뿌듯|속상|행복|즐거|외로|긴장|부끄러)/ },
    { id: 'simile',     label: '🌈 비유',        re: /(처럼|마치|듯이)/ },
    { id: 'dialogue',   label: '💬 대화 글',     re: /["“][^"“”]+["”]/ },
    { id: 'mimetic',    label: '🎵 흉내 내는 말', re: /(살금살금|반짝반짝|데굴데굴|펄쩍펄쩍|쿵쿵|덜덜|훨훨|살랑살랑|둥실둥실|쨍그랑|콰르릉|주룩주룩|솔솔|뒤뚱뒤뚱|헐레벌떡|바스락|보글보글|철썩|씽씽|쌩쌩|엉금엉금|폴짝)/ },
    { id: 'number',     label: '🔢 정확한 숫자', re: /([0-9]+|[한두세네]|다섯|여섯|일곱|여덟|아홉|열)\s?(개|명|번|시간|마리|살|송이|권|잔|분)/ }
  ];

  var WG_BINGO_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  var _wgBingoTimer = null;
  var _wgBingoBound = false;

  function wgBingoScan(text) {
    return WG_BINGO_CELLS.map(function (c) { return c.re.test(text); });
  }

  function wgBingoLineCount(filled) {
    return WG_BINGO_LINES.filter(function (line) {
      return line.every(function (i) { return filled[i]; });
    }).length;
  }

  function wgEnsureBingoUI() {
    if (wg$('wgBingoChip')) return;

    var chip = document.createElement('button');
    chip.id = 'wgBingoChip';
    chip.type = 'button';
    chip.innerHTML = '🎯 빙고 <span id="wgBingoChipCount">0</span>줄';
    chip.title = '오감 빙고판 열기/닫기';
    chip.addEventListener('click', function () {
      var pop = wg$('wgBingoPop');
      if (pop) pop.classList.toggle('open');
    });
    document.body.appendChild(chip);

    var pop = document.createElement('div');
    pop.id = 'wgBingoPop';
    pop.innerHTML =
      '<button id="wgBingoClose" type="button" title="닫기">✕</button>' +
      '<h4>🎯 오감 빙고 — 글에 표현이 들어가면 불이 켜져요!</h4>' +
      '<div id="wgBingoBoard">' +
      WG_BINGO_CELLS.map(function (c) {
        return '<div class="wg-cell" id="wg_cell_' + c.id + '">' + c.label + '</div>';
      }).join('') +
      '</div>' +
      '<div id="wgBingoStatus">빙고 줄 0개 · 한 줄마다 잉크 +30, 다 채우면 +100!</div>';
    document.body.appendChild(pop);

    pop.querySelector('#wgBingoClose').addEventListener('click', function () {
      pop.classList.remove('open');
    });
  }

  function wgBindBingo() {
    var ta = wg$('diary');
    if (!ta || _wgBingoBound) return;
    _wgBingoBound = true;

    wgBingoRender(ta.value || '', true);

    ta.addEventListener('input', function () {
      clearTimeout(_wgBingoTimer);
      _wgBingoTimer = setTimeout(function () {
        wgBingoRender(ta.value || '', false);
      }, 400);
    });

    /* 옛 일기 불러오기·붙여넣기 직후 보상 방지: 포커스 시 기준선 재동기화 */
    ta.addEventListener('focus', function () {
      wgBingoRender(ta.value || '', true);
    });
  }

  function wgBingoVisibility() {
    var ta = wg$('diary');
    var chip = wg$('wgBingoChip');
    var pop = wg$('wgBingoPop');
    if (!chip) return;
    var visible = !!(ta && ta.offsetParent !== null);
    chip.classList.toggle('on', visible);
    if (!visible && pop) pop.classList.remove('open');
  }

  function wgBingoRender(text, baselineOnly) {
    var filled = wgBingoScan(text);
    WG_BINGO_CELLS.forEach(function (c, i) {
      var el = wg$('wg_cell_' + c.id);
      if (el) el.classList.toggle('filled', filled[i]);
    });

    var lines = wgBingoLineCount(filled);

    var cnt = wg$('wgBingoChipCount');
    if (cnt) cnt.textContent = lines;
    var chip = wg$('wgBingoChip');
    if (chip) chip.classList.toggle('glow', lines > 0);

    var status = wg$('wgBingoStatus');
    if (status) status.textContent = '빙고 줄 ' + lines + '개 · 한 줄마다 잉크 +30, 다 채우면 +100!';

    var s = wgLoad(wgKey('mdj_wg_bingo'), { date: '', maxRewarded: 0, blackout: false });
    if (s.date !== wgToday()) { s.date = wgToday(); s.maxRewarded = 0; s.blackout = false; }

    if (baselineOnly) {
      if (lines > s.maxRewarded) { s.maxRewarded = lines; }
      wgSave(wgKey('mdj_wg_bingo'), s);
      return;
    }

    if (lines > s.maxRewarded) {
      var newLines = lines - s.maxRewarded;
      s.maxRewarded = lines;
      wgSave(wgKey('mdj_wg_bingo'), s);
      wgAddInk(30 * newLines, '(오감 빙고!)');
      wgPetSay('빙고! 네가 찾은 표현 덕분에 글이 살아 움직여 ✨');
    }

    if (filled.every(Boolean) && !s.blackout) {
      s.blackout = true;
      wgSave(wgKey('mdj_wg_bingo'), s);
      wgAddInk(100, '(빙고판 블랙아웃!)');
      wgAddBadge('빙고 마스터');
      wgPetSay('세상에… 아홉 칸을 전부 채우다니! 진짜 표현의 달인이야 🎆');
    }
  }

  /* ══════════════════════════════════════════════════════════
     4. 게임 ② 펫 단어 편식
     ══════════════════════════════════════════════════════════ */

  var WG_CRAVINGS = [
    { id: 'mimetic',    label: '흉내 내는 말', say: '오늘은 "반짝반짝" 같은 흉내 내는 말이 먹고 싶어!' },
    { id: 'simile',     label: '비유 표현',    say: '오늘은 "~처럼" 하고 빗대는 표현이 먹고 싶어!' },
    { id: 'emotion',    label: '감정 표현',    say: '오늘은 네 마음이 어땠는지 감정 표현이 먹고 싶어!' },
    { id: 'smellTaste', label: '냄새·맛 표현', say: '오늘은 킁킁… 냄새나 맛 표현이 먹고 싶어!' },
    { id: 'touch',      label: '촉감 표현',    say: '오늘은 말랑말랑~ 촉감 표현이 먹고 싶어!' },
    { id: 'dialogue',   label: '대화 글',      say: '오늘은 누가 한 말을 따옴표로 쓴 대화 글이 먹고 싶어!' }
  ];

  function wgTodayCraving() {
    var d = wgToday();
    var hash = 0;
    for (var i = 0; i < d.length; i++) hash = (hash * 31 + d.charCodeAt(i)) >>> 0;
    return WG_CRAVINGS[hash % WG_CRAVINGS.length];
  }

  function wgCravingRegex(id) {
    var cell = null;
    WG_BINGO_CELLS.forEach(function (c) { if (c.id === id) cell = c; });
    return cell ? cell.re : null;
  }

  function wgAnnounceCraving() {
    var s = wgLoad(wgKey('mdj_wg_pet'), { date: '', done: false, count: 0 });
    if (s.date === wgToday() && s.done) return;
    setTimeout(function () { wgPetSay(wgTodayCraving().say); }, 2500);
  }

  function wgCheckPetCraving() {
    var s = wgLoad(wgKey('mdj_wg_pet'), { date: '', done: false, count: 0 });
    if (s.date !== wgToday()) { s.date = wgToday(); s.done = false; }
    if (s.done) return;

    var ta = wg$('diary');
    var text = ta ? (ta.value || '') : '';
    var craving = wgTodayCraving();
    var re = wgCravingRegex(craving.id);
    if (!text || !re || !re.test(text)) return;

    s.done = true;
    s.count = (s.count || 0) + 1;
    wgSave(wgKey('mdj_wg_pet'), s);

    wgAddPetExp(20);
    wgAddInk(10, '(펫 밥 주기 성공!)');
    wgPetSay('냠냠! 네 글 속에서 ' + craving.label + '을(를) 찾아 먹었어. 정말 근사한 표현이었어 💕');

    if (s.count >= 7) wgAddBadge('펫 미식가');
  }

  function wgPatchSaveDiary() {
    if (window._wgSaveDiaryPatched) return;
    if (typeof window.saveDiary === 'function') {
      var _orig = window.saveDiary;
      window.saveDiary = function () {
        var result = _orig.apply(this, arguments);
        try { wgCheckPetCraving(); } catch (e) {}
        return result;
      };
      window._wgSaveDiaryPatched = true;
    }
  }

  /* ══════════════════════════════════════════════════════════
     5. 게임 ③ 맞춤법 몬스터 사냥 (v3: 검수 문제은행 전용)
        - AI 문장 생성 제거 → 오답 정답 원천 차단
        - 24유형 50문항, 한 판 4마리 = 서로 다른 4유형
        - 최근 문항 24개 + 유형 12개 이중 중복 방지
        - 일기 교정 조언(spellingAdvice) 키워드 매칭으로
          취약 유형을 한 판에 최대 2문항 우선 배치
     ══════════════════════════════════════════════════════════ */

  var WG_MONSTER_BANK = [
    { t: '되돼',   w: '이제 집에 가도 되?',                 r: '이제 집에 가도 돼?',                 h: '"되어"로 바꿔 자연스러우면 "돼"를 써요.' },
    { t: '되돼',   w: '그렇게 하면 안 되요.',               r: '그렇게 하면 안 돼요.',               h: '"되어요"로 바꿀 수 있으니 "돼요"가 맞아요.' },
    { t: '되돼',   w: '나는 커서 의사가 돼고 싶다.',         r: '나는 커서 의사가 되고 싶다.',         h: '"되어고"는 말이 안 되니까 "되고"가 맞아요.' },
    { t: '안않',   w: '밥을 먹지 안았다.',                   r: '밥을 먹지 않았다.',                   h: '"아니 하다"의 준말은 "않다"예요.' },
    { t: '안않',   w: '오늘은 비가 오지 안는다.',             r: '오늘은 비가 오지 않는다.',             h: '"-지" 뒤에는 "않다"를 써요.' },
    { t: '안않',   w: '동생이 말을 듣지 안아서 속상했다.',     r: '동생이 말을 듣지 않아서 속상했다.',     h: '"-지 않다"로 붙여서 기억해요.' },
    { t: '왠웬',   w: '오늘은 왠일인지 일찍 일어났다.',       r: '오늘은 웬일인지 일찍 일어났다.',       h: '"왠"은 "왠지"에만 쓰고, 나머지는 "웬"이에요.' },
    { t: '왠웬',   w: '웬지 좋은 일이 생길 것 같다.',         r: '왠지 좋은 일이 생길 것 같다.',         h: '"왜인지"의 준말이니까 "왠지"가 맞아요.' },
    { t: '며칠',   w: '몇일 뒤에 방학이 시작된다.',           r: '며칠 뒤에 방학이 시작된다.',           h: '날짜를 셀 때는 언제나 "며칠"이에요.' },
    { t: '며칠',   w: '감기가 몇일째 낫지 않는다.',           r: '며칠째 감기가 낫지 않는다.',           h: '"몇일"이라는 말은 없어요. 항상 "며칠"!' },
    { t: '낫낳',   w: '감기가 얼른 낳았으면 좋겠다.',         r: '감기가 얼른 나았으면 좋겠다.',         h: '병이 좋아지는 것은 "낫다"예요.' },
    { t: '낫낳',   w: '우리 집 강아지가 새끼를 나았다.',       r: '우리 집 강아지가 새끼를 낳았다.',       h: '아기를 낳는 것은 "낳다"예요.' },
    { t: '금세',   w: '아이스크림이 금새 녹아 버렸다.',       r: '아이스크림이 금세 녹아 버렸다.',       h: '"금시에"의 준말이라 "금세"가 맞아요.' },
    { t: '금세',   w: '소문이 금새 퍼졌다.',                 r: '소문이 금세 퍼졌다.',                 h: '"금세"로 기억해요. "금새"는 틀린 말이에요.' },
    { t: '오랜만', w: '오랫만에 할머니 댁에 갔다.',           r: '오랜만에 할머니 댁에 갔다.',           h: '"오래간만"의 준말이라 "오랜만"이 맞아요.' },
    { t: '오랜만', w: '친구를 오랫만에 만나서 반가웠다.',     r: '친구를 오랜만에 만나서 반가웠다.',     h: '"오랫만"이 아니라 "오랜만"이에요.' },
    { t: '바라',   w: '네가 행복하길 바래.',                 r: '네가 행복하길 바라.',                 h: '기본형이 "바라다"라서 "바라"가 맞아요.' },
    { t: '바라',   w: '시험을 잘 보길 바랬다.',               r: '시험을 잘 보길 바랐다.',               h: '"바라다"를 활용하면 "바랐다"가 돼요.' },
    { t: 'ㄹ게',   w: '내가 먼저 갈께!',                     r: '내가 먼저 갈게!',                     h: '소리는 [께]지만 쓸 때는 "-ㄹ게"예요.' },
    { t: 'ㄹ게',   w: '다음에 꼭 연락할께.',                 r: '다음에 꼭 연락할게.',                 h: '"-할게"로 써요. "-할께"는 틀린 표기예요.' },
    { t: '봬요',   w: '선생님, 내일 뵈요!',                   r: '선생님, 내일 봬요!',                   h: '"뵈어요"의 준말은 "봬요"예요.' },
    { t: '봬요',   w: '다음 주에 또 뵈요.',                   r: '다음 주에 또 봬요.',                   h: '"하어요→해요"처럼 "뵈어요→봬요"가 돼요.' },
    { t: '던든',   w: '사과던 배던 다 좋아.',                 r: '사과든 배든 다 좋아.',                 h: '골라야 할 때는 "-든", 지난 일은 "-던"이에요.' },
    { t: '던든',   w: '어제 먹든 피자가 생각난다.',           r: '어제 먹던 피자가 생각난다.',           h: '지난 일을 떠올릴 때는 "-던"을 써요.' },
    { t: '맞히다', w: '퀴즈 정답을 맞췄다.',                 r: '퀴즈 정답을 맞혔다.',                 h: '문제의 답은 "맞히다", 퍼즐 조각은 "맞추다"예요.' },
    { t: '맞히다', w: '주사를 맞추러 병원에 갔다.',           r: '주사를 맞으러 병원에 갔다.',           h: '주사는 "맞다", 답은 "맞히다"예요.' },
    { t: '잃잊',   w: '우산을 잊어버려서 비를 맞았다.',       r: '우산을 잃어버려서 비를 맞았다.',       h: '물건은 잃어버리고, 기억은 잊어버려요.' },
    { t: '잃잊',   w: '숙제를 깜빡 잃어버렸다.',             r: '숙제를 깜빡 잊어버렸다.',             h: '기억에서 사라지면 "잊어버리다"예요.' },
    { t: '붙부',   w: '편지에 우표를 부쳤다.',               r: '편지에 우표를 붙였다.',               h: '풀로 딱 붙이는 건 "붙이다"예요.' },
    { t: '붙부',   w: '삼촌께 소포를 붙였다.',               r: '삼촌께 소포를 부쳤다.',               h: '물건을 보내는 건 "부치다"예요.' },
    { t: '가리가르', w: '선생님이 수학을 가리켜 주셨다.',     r: '선생님이 수학을 가르쳐 주셨다.',       h: '지식은 "가르치다", 방향은 "가리키다"예요.' },
    { t: '가리가르', w: '시계 바늘이 세 시를 가르쳤다.',       r: '시계 바늘이 세 시를 가리켰다.',       h: '손가락이나 바늘이 향하는 건 "가리키다"예요.' },
    { t: '다르틀리', w: '내 생각은 네 생각과 틀리다.',         r: '내 생각은 네 생각과 다르다.',         h: '같지 않은 것은 "다르다", 답이 아닌 것은 "틀리다"예요.' },
    { t: '다르틀리', w: '쌍둥이인데도 성격이 서로 틀리다.',     r: '쌍둥이인데도 성격이 서로 다르다.',     h: '비교할 때는 "다르다"를 써요.' },
    { t: '작적',   w: '용돈이 너무 작아서 아쉽다.',           r: '용돈이 너무 적어서 아쉽다.',           h: '크기는 "작다", 양이나 개수는 "적다"예요.' },
    { t: '작적',   w: '신발이 발보다 적어서 발이 아프다.',     r: '신발이 발보다 작아서 발이 아프다.',     h: '크기를 말할 때는 "작다"예요.' },
    { t: '이히',   w: '곰곰히 생각해 보았다.',               r: '곰곰이 생각해 보았다.',               h: '"곰곰이"처럼 [이]로만 소리 나면 "-이"로 써요.' },
    { t: '이히',   w: '방을 깨끗히 청소했다.',               r: '방을 깨끗이 청소했다.',               h: '"깨끗이"가 표준 표기예요.' },
    { t: '대데',   w: '친구가 내일 이사 간데.',               r: '친구가 내일 이사 간대.',               h: '남에게 들은 말을 전할 때는 "-대"를 써요.' },
    { t: '대데',   w: '동생이 아이스크림을 다 먹었데.',       r: '동생이 아이스크림을 다 먹었대.',       h: '"-다고 해"의 준말은 "-대"예요.' },
    { t: '띄어',   w: '나도 할수있다.',                       r: '나도 할 수 있다.',                     h: '"할 수 있다"는 세 낱말로 띄어 써요.' },
    { t: '띄어',   w: '이 연필은 내거야.',                   r: '이 연필은 내 거야.',                   h: '"거(것)"는 앞말과 띄어 써요.' },
    { t: '띄어',   w: '우리집에 놀러 와.',                   r: '우리 집에 놀러 와.',                   h: '"우리 집"은 띄어 쓰는 게 원칙이에요.' },
    { t: '띄어',   w: '학교에 가는길에 무지개를 봤다.',       r: '학교에 가는 길에 무지개를 봤다.',       h: '"가는 길"처럼 꾸며 주는 말과 띄어 써요.' },
    { t: '어이',   w: '정말 어의없는 일이 벌어졌다.',         r: '정말 어이없는 일이 벌어졌다.',         h: '"어이없다"가 맞는 표현이에요.' },
    { t: '희한',   w: '참 희안한 꿈을 꾸었다.',               r: '참 희한한 꿈을 꾸었다.',               h: '"희한하다"가 표준어예요.' },
    { t: '역할',   w: '연극에서 왕 역활을 맡았다.',           r: '연극에서 왕 역할을 맡았다.',           h: '"역할"이 맞아요. "역활"은 틀린 말이에요.' },
    { t: '설레',   w: '소풍 생각에 마음이 설레인다.',         r: '소풍 생각에 마음이 설렌다.',           h: '기본형은 "설레다"라서 "설렌다"가 맞아요.' },
    { t: '예요',   w: '제 취미는 독서에요.',                 r: '제 취미는 독서예요.',                 h: '받침 없는 말 뒤에는 "-예요"를 써요.' },
    { t: '예요',   w: '이건 제 책이예요.',                   r: '이건 제 책이에요.',                   h: '받침 있는 말 뒤에는 "-이에요"를 써요.' }
  ];

  /* 일기 교정 조언에서 취약 유형을 찾기 위한 키워드 */
  var WG_TYPE_KEYWORDS = {
    '되돼': ['되', '돼'], '안않': ['않', '안 '], '왠웬': ['왠', '웬'],
    '며칠': ['며칠', '몇일'], '낫낳': ['낫', '낳', '나았'], '금세': ['금세', '금새'],
    '오랜만': ['오랜만', '오랫만'], '바라': ['바라', '바래'], 'ㄹ게': ['ㄹ게', '할게', '갈게', '께'],
    '봬요': ['봬', '뵈'], '던든': ['던지', '든지'], '맞히다': ['맞히', '맞추'],
    '잃잊': ['잃어', '잊어'], '붙부': ['붙이', '부치'], '가리가르': ['가리키', '가르치'],
    '다르틀리': ['다르', '틀리'], '작적': ['작다', '적다'], '이히': ['깨끗이', '곰곰이', '-이', '-히'],
    '대데': ['-대', '-데'], '띄어': ['띄어'], '어이': ['어이없'], '희한': ['희한'],
    '역할': ['역할', '역활'], '설레': ['설레'], '예요': ['예요', '이에요']
  };

  var _wgMonsters = [];
  var _wgMonsterIdx = 0;
  var _wgMonsterFails = 0;

  function wgGetEntriesSafe() {
    return new Promise(function (resolve) {
      if (typeof getEntries !== 'function') { resolve([]); return; }
      Promise.resolve()
        .then(function () { return getEntries(); })
        .then(function (arr) { resolve(Array.isArray(arr) ? arr : []); })
        .catch(function () { resolve([]); });
    });
  }

  function wgWeakTypes(entries) {
    var text = entries.slice(-10).map(function (e) {
      return (e && typeof e.spellingAdvice === 'string') ? e.spellingAdvice : '';
    }).join(' ');
    if (!text.trim()) return [];
    var weak = [];
    Object.keys(WG_TYPE_KEYWORDS).forEach(function (t) {
      var hit = WG_TYPE_KEYWORDS[t].some(function (kw) { return text.indexOf(kw) >= 0; });
      if (hit) weak.push(t);
    });
    return weak;
  }

  function wgShuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function wgPickMonsters(weakTypes) {
    var rec = wgLoad(wgKey('mdj_wg_mrec'), { items: [], types: [] });
    var recentItems = rec.items || [];
    var recentTypes = rec.types || [];

    var picked = [];
    var usedTypes = {};

    function tryPick(pool) {
      for (var i = 0; i < pool.length && picked.length < 4; i++) {
        var q = pool[i];
        if (usedTypes[q.t]) continue;
        if (recentItems.indexOf(q.w) >= 0) continue;
        picked.push(q);
        usedTypes[q.t] = true;
      }
    }

    /* 1순위: 취약 유형 (최대 2문항) */
    var weakPool = wgShuffle(WG_MONSTER_BANK.filter(function (q) {
      return weakTypes.indexOf(q.t) >= 0;
    })).slice(0, 8);
    var before = picked.length;
    tryPick(weakPool);
    if (picked.length - before > 2) picked = picked.slice(0, before + 2);

    /* 2순위: 최근 안 나온 유형 우선 */
    var freshPool = wgShuffle(WG_MONSTER_BANK.filter(function (q) {
      return recentTypes.indexOf(q.t) < 0;
    }));
    tryPick(freshPool);

    /* 3순위: 전체에서 보충 (중복 문항만 피함) */
    tryPick(wgShuffle(WG_MONSTER_BANK));

    /* 최후: 그래도 4개 미만이면 기억을 무시하고 채움 */
    if (picked.length < 4) {
      wgShuffle(WG_MONSTER_BANK).forEach(function (q) {
        if (picked.length >= 4) return;
        if (usedTypes[q.t]) return;
        picked.push(q);
        usedTypes[q.t] = true;
      });
    }

    /* 출제 기억 갱신 */
    picked.forEach(function (q) {
      recentItems.push(q.w);
      recentTypes.push(q.t);
    });
    rec.items = recentItems.slice(-24);
    rec.types = recentTypes.slice(-12);
    wgSave(wgKey('mdj_wg_mrec'), rec);

    return picked;
  }

  function wgStartMonsterHunt() {
    wgOpenModal('<h3>⚔️ 맞춤법 몬스터 사냥</h3><p>몬스터를 불러오는 중… 잠깐만요! 🔮</p>');
    wgGetEntriesSafe().then(function (entries) {
      var weak = [];
      try { weak = wgWeakTypes(entries); } catch (e) {}
      _wgMonsters = wgPickMonsters(weak);
      _wgMonsterIdx = 0;
      _wgMonsterFails = 0;
      wgRenderMonster();
    });
  }
  window.wgStartMonsterHunt = wgStartMonsterHunt;

  function wgRenderMonster() {
    if (_wgMonsterIdx >= _wgMonsters.length) {
      var kills = wgLoad(wgKey('mdj_wg_monster'), { kills: 0 }).kills;
      wgOpenModal(
        '<h3>🏆 사냥 완료!</h3>' +
        '<p>오늘의 몬스터를 모두 물리쳤어요.<br>지금까지 물리친 몬스터: <b>' + kills + '마리</b></p>' +
        '<button class="wg-btn" onclick="wgStartMonsterHunt()">한 판 더!</button>' +
        '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
      );
      return;
    }
    var q = _wgMonsters[_wgMonsterIdx];
    wgOpenModal(
      '<h3>⚔️ 맞춤법 몬스터 사냥</h3>' +
      '<div class="wg-hp">몬스터 ' + (_wgMonsterIdx + 1) + ' / ' + _wgMonsters.length +
      ' · 기회 ' + (2 - _wgMonsterFails) + '번 남음</div>' +
      '<p>👾 몬스터가 틀린 문장을 외치고 있어요! 바르게 고쳐서 물리치세요.</p>' +
      '<div class="wg-sentence">' + wgEsc(q.w) + '</div>' +
      '<input class="wg-input" id="wgMonsterInput" placeholder="바르게 고친 문장을 써 보세요">' +
      '<div id="wgMonsterMsg" class="wg-note"></div>' +
      '<button class="wg-btn" onclick="wgAnswerMonster()">공격!</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">그만하기</button>'
    );
    var input = wg$('wgMonsterInput');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); wgAnswerMonster(); }
      });
      input.focus();
    }
  }

  function wgNorm(s, dropSpace) {
    var t = String(s || '').trim()
      .replace(/[.,!?…~"'“”]/g, '')
      .replace(/\s+/g, ' ');
    if (dropSpace) t = t.replace(/\s/g, '');
    return t;
  }

  function wgAnswerMonster() {
    var q = _wgMonsters[_wgMonsterIdx];
    var input = wg$('wgMonsterInput');
    var msg = wg$('wgMonsterMsg');
    var ans = input ? input.value : '';

    if (wgNorm(ans) === wgNorm(q.r)) {
      wgMonsterCorrect(q);
      return;
    }
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
    var s = wgLoad(wgKey('mdj_wg_monster'), { kills: 0 });
    s.kills = (s.kills || 0) + 1;
    wgSave(wgKey('mdj_wg_monster'), s);
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
     ══════════════════════════════════════════════════════════ */

  var WG_COMBO_BASES = [
    '고양이가 잔다.', '아이가 달린다.', '새가 난다.',
    '비가 온다.', '동생이 웃는다.', '강아지가 먹는다.'
  ];
  var WG_COMBO_REWARDS = { 2: 10, 4: 30, 6: 60 };

  var _wgCombo = { base: '', current: '', level: 0, rewarded: {} };
  var _wgComboBusy = false;

  function wgStartCombo() {
    var base = WG_COMBO_BASES[Math.floor(Math.random() * WG_COMBO_BASES.length)];
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
    var input = wg$('wgComboInput');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); wgSubmitCombo(); }
      });
      input.focus();
    }
  }

  function wgSubmitCombo() {
    if (_wgComboBusy) return;
    var input = wg$('wgComboInput');
    var msg = wg$('wgComboMsg');
    var btn = wg$('wgComboBtn');
    var next = input ? input.value.trim() : '';

    if (!next) { if (msg) msg.textContent = '문장을 먼저 써 주세요!'; return; }
    if (next.length < _wgCombo.current.length + 2) {
      if (msg) msg.textContent = '지금 문장보다 더 길고 자세하게 만들어야 콤보가 이어져요!';
      return;
    }

    _wgComboBusy = true;
    if (btn) { btn.disabled = true; btn.textContent = '판정 중…'; }

    var prompt =
      '너는 초등학생 문장 확장 게임의 심판이야.\n' +
      '기본 문장: "' + _wgCombo.base + '"\n' +
      '직전 문장: "' + _wgCombo.current + '"\n' +
      '학생의 새 문장: "' + next + '"\n\n' +
      '판정 규칙:\n' +
      '1. 기본 문장의 주어와 서술어(핵심 뜻)가 유지되어야 한다.\n' +
      '2. 꾸며 주는 말이 추가되어 더 구체적이어야 한다.\n' +
      '3. 문장 호응이 어색하면 안 된다.\n' +
      '반드시 JSON만 출력: {"ok": true 또는 false, "comment": "초등학생 눈높이의 한 문장 코멘트"}';

    wgCallAI(prompt, 250).then(function (raw) {
      var ok = null, comment = '';
      var parsed = wgParseJSON(raw);
      if (parsed && typeof parsed.ok === 'boolean') {
        ok = parsed.ok;
        comment = parsed.comment || '';
      }

      /* AI 실패 시 휴리스틱 폴백 */
      if (ok === null) {
        var core = _wgCombo.base.replace(/[.!?]/g, '').split(/\s+/);
        var keep = core.filter(function (w) {
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

      var reward = WG_COMBO_REWARDS[_wgCombo.level];
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
    });
  }
  window.wgSubmitCombo = wgSubmitCombo;

  /* ══════════════ 7. 게임 런처 (허브) ══════════════ */

  function wgInjectLauncher() {
    if (wg$('wgLauncher')) return;
    var btn = document.createElement('button');
    btn.id = 'wgLauncher';
    btn.type = 'button';
    btn.title = '글쓰기 게임';
    btn.textContent = '🎮';
    btn.addEventListener('click', wgOpenHub);
    document.body.appendChild(btn);
  }

  function wgOpenHub() {
    var inkUsed = wgInkStatus();
    var craving = wgTodayCraving();
    var petState = wgLoad(wgKey('mdj_wg_pet'), { done: false, count: 0, date: '' });
    var cravingDone = (petState.date === wgToday() && petState.done);
    var kills = wgLoad(wgKey('mdj_wg_monster'), { kills: 0 }).kills;

    wgOpenModal(
      '<h3>🎮 글쓰기 게임</h3>' +
      '<p class="wg-note">오늘 게임 잉크: <b>' + inkUsed + ' / ' + WG_INK_DAILY_CAP + '</b></p>' +
      '<button class="wg-menu-btn" onclick="wgStartMonsterHunt()">' +
      '⚔️ 맞춤법 몬스터 사냥 <span class="wg-note">— 지금까지 ' + kills + '마리 처치</span></button>' +
      '<button class="wg-menu-btn" onclick="wgStartCombo()">' +
      '🪄 문장 늘리기 콤보 <span class="wg-note">— 문장을 6겹까지 키워 보세요</span></button>' +
      '<p class="wg-note">🍽️ 오늘 펫의 편식: <b>' + wgEsc(craving.label) + '</b> ' +
      (cravingDone ? '(오늘 먹여 줬어요 ✅)' : '(일기에 쓰고 저장하면 먹어요!)') + '</p>' +
      '<p class="wg-note">🎯 오감 빙고는 그림일기 화면 왼쪽 아래 <b>🎯 빙고</b> 버튼으로 열 수 있어요.</p>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
  }
  window.wgOpenHub = wgOpenHub;

  /* ══════════════ 8. 초기화 ══════════════ */

  function wgInit() {
    wgInjectStyles();
    wgEnsureModal();
    wgRegisterBadges();
    wgInjectLauncher();
    wgEnsureBingoUI();
    wgPatchSaveDiary();
    wgAnnounceCraving();

    setInterval(function () {
      try {
        wgBindBingo();        // #diary가 생기면 1회 바인딩
        wgBingoVisibility();  // 일기 화면일 때만 칩 표시
        wgPatchSaveDiary();   // saveDiary가 늦게 정의되는 경우 대비
        wgRegisterBadges();   // BADGE_INFO가 늦게 정의되는 경우 대비
      } catch (e) {}
    }, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wgInit);
  } else {
    wgInit();
  }

})();
