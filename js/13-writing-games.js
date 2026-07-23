/* ============================================================
   13-writing-games.js (v3) — 글쓰기 게이미피케이션 확장 모듈
   ─ 로드 순서: 12-ieum-review.js 뒤, 반드시 마지막에 로드
   ─ 기존 파일 수정 없음. UI(빙고판·런처·모달·배너·CSS)는
     이 파일이 스스로 DOM에 주입한다.

   [v3 변경 — v2(4종) + 신규 게임 8종 병합]
     · v2의 게임 ①~④는 원본 그대로 보존
       (변경점 1개: 문장 늘리기 콤보의 AI 판정에 temperature 0
        적용 → 같은 답에 같은 판정이 나오도록 재현성 확보)
     · 신규 판정용 AI 호출은 모두 temperature 0 (재현성)
     · 게임 진입은 🎮 런처 허브 하나로 통일하되, 허브 안에서
       돋움/이음/틔움/지음 단계로 묶어 교육과정 배치를 유지
     · 흐름 결합형 게임(밀수꾼·경매 환급)은 그림일기 화면의
       미션 상자 아래 배너로, 기자 검증 게임은 감상문 출판의
       기사 편집기 옆 버튼으로 '맥락 주입'

   포함 게임 (단계별)
   ── 돋움: 표현·문장 훈련 ─────────────────────────────
     ①  오감 빙고         : 일기 실시간 표현 감지 (API 비용 0)
     ③  맞춤법 몬스터 사냥 : 개인화+무작위 교정 게임 (haiku)
     ④  문장 늘리기 콤보   : 문장 확장 훈련 (haiku)
     ⑤  텔레파시          : 사물 스무고개 / 감정 텔레파시
                            — 이름 없이 설명만으로 AI에게 전달
     ⑥  문장 다이어트      : 군더더기 빼고 핵심만 (콤보의 짝)
     ⑦  오늘의 낱말 경매   : 잉크로 낱말 입찰 → 일기에 쓰면 환급
   ── 이음: 그림일기와 함께 ────────────────────────────
     ②  펫 단어 편식       : 일일 표현 미션, saveDiary 후킹
     ⑧  비밀 단어 밀수꾼   : 단어를 자연스럽게 숨기기 (세관 AI)
     ⑨  60초 말하기 스피드런: 말로 초안 → 글말로 다듬기 (STT)
     ⑩  진실 둘 거짓 하나  : 디테일 훈련 (AI 탐정 / 친구 투표)
   ── 틔움: AI와 주고받기 ──────────────────────────────
     ⑪  고장난 로봇 조종   : 절차 설명문 3라운드 (문자 그대로 수행)
   ── 지음: 출판 검증 ─────────────────────────────────
     ⑫  기자 검증 게임     : 내 기사의 사실/의견 문장 가려내기

   설계 원칙 (교육학적 근거)
     - 결과(richness)가 아닌 '과정(전략 사용)'에 보상
     - 일일 게임 잉크 상한 150 → 본 활동 가치 보호
       (예외: 경매의 '원금 반환'은 보상이 아니라 반환이므로
        상한 미적용, 보너스 40만 상한 적용)
     - 경쟁 없음: 자기 기준 완성형 · 친구 모드는 투표 놀이만
     - 보상 시 정보적 피드백 동반 (자기결정성 이론)
     - 판정 AI는 temperature 0 (점수 재현성)

   기존 API 연동 (없어도 조용히 동작하도록 전부 방어)
     callClaude / addInk / spendInk / getInk / addPetExp / petSay
     addBadge / BADGE_INFO / getEntries / currentNick / toast / $
     parseJSON / showFireworks / launchApp / switchIeumTab
     generateDalle / DODUM_BANK_A / DODUM_BANK_B / rvAiAssistNews
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

  /* ── 뱃지 10종: BADGE_INFO(이름→요소id)에 런타임 등록 ───── */
  const WG_BADGE_DEFS = [
    { name: '빙고 마스터',     el: 'badge_wg1' },
    { name: '펫 미식가',       el: 'badge_wg2' },
    { name: '몬스터 헌터',     el: 'badge_wg3' },
    { name: '문장 마법사',     el: 'badge_wg4' },
    { name: '텔레파시 마스터', el: 'badge_wg5' },
    { name: '문장 요리사',     el: 'badge_wg6' },
    { name: '로봇 조련사',     el: 'badge_wg7' },
    { name: '슬쩍 넣기 달인',  el: 'badge_wg8' },
    { name: '명탐정 기자',     el: 'badge_wg9' },
    { name: '진실 탐정',       el: 'badge_wg10' },
    { name: '상상력 온도조절사', el: 'badge_wg11' }
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

  /* ── AI 호출 래퍼 ──────────────────────────────────────────
     v3: temperature 인자 추가. 판정(채점)용 호출은 0을 넘겨
     같은 입력에 같은 판정이 나오게 한다. 문제 '생성'용 호출은
     다양성이 필요하므로 지정하지 않는다(기본값 사용). */
  async function wgCallAI(systemPrompt, userPrompt, maxTokens, temperature) {
    if (typeof callClaude !== 'function') return null;
    try {
      const body = {
        model: WG_MODEL,
        max_tokens: maxTokens || 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      };
      if (typeof temperature === 'number') body.temperature = temperature;
      const r = await callClaude(body);
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

  /* ── v3 신규 공용 유틸 ──────────────────────────────────── */

  /** 날짜·닉네임 기반 시드 난수 — '오늘의 단어'가 하루 동안 고정되게 */
  function wgSeedRand(seedStr) {
    let h = 2166136261;
    const s = String(seedStr || '');
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h = (Math.imul(h, 1664525) + 1013904223) | 0; return (h >>> 0) / 4294967296; };
  }

  function wgSeedPick(arr, n, seedStr) {
    const rnd = wgSeedRand(seedStr);
    const copy = (arr || []).slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = copy[i]; copy[i] = copy[j]; copy[j] = t;
    }
    return copy.slice(0, n);
  }

  /** 사물/추상어 풀 — 돋움의 단어은행이 있으면 재사용(교육과정 정합),
      없으면 자체 풀로 폴백 */
  const WG_OBJECT_POOL = [
    '지우개', '선풍기', '신호등', '거울', '운동화', '우산', '냉장고', '리모컨',
    '의자', '자전거', '가방', '시계', '칫솔', '이불', '우체통', '화분',
    '양말', '달력', '책상', '주전자', '안경', '빗자루', '자석', '수건',
    '지갑', '열쇠', '가위', '베개'
  ];
  const WG_ABSTRACT_POOL = [
    '밤하늘', '비밀', '파도', '꿈', '봄바람', '마음', '별빛', '기억',
    '설렘', '그림자', '소원', '향기', '용기', '속삭임', '무지개', '고요함'
  ];

  function wgCleanWord(w) {
    return String(w || '').replace(/\(.*\)/, '').trim();
  }

  function wgObjectPool() {
    try {
      if (typeof DODUM_BANK_A !== 'undefined' && Array.isArray(DODUM_BANK_A) && DODUM_BANK_A.length >= 10) {
        return DODUM_BANK_A.map(wgCleanWord);
      }
    } catch (e) {}
    return WG_OBJECT_POOL;
  }

  function wgAbstractPool() {
    try {
      if (typeof DODUM_BANK_B !== 'undefined' && Array.isArray(DODUM_BANK_B) && DODUM_BANK_B.length >= 10) {
        return DODUM_BANK_B.map(wgCleanWord);
      }
    } catch (e) {}
    return WG_ABSTRACT_POOL;
  }

  /* ── 잉크 경제(경매용) 래퍼 — 함수가 없으면 조용히 실패 ── */
  async function wgGetInk() {
    try {
      if (typeof getInk === 'function') {
        const v = await getInk();
        if (typeof v === 'number') return v;
      }
    } catch (e) {}
    return 0;
  }

  async function wgTrySpendInk(n) {
    const bal = await wgGetInk();
    if (bal < n) return false;
    try {
      if (typeof spendInk === 'function') { await spendInk(n); return true; }
    } catch (e) {}
    return false;
  }

  /** 경매 '원금 반환' — 보상이 아니므로 일일 상한을 거치지 않는다 */
  async function wgRefundInk(n) {
    try {
      if (typeof addInk === 'function') { await addInk(n); return true; }
    } catch (e) {}
    return false;
  }

  /* ── 그림일기 화면 연동 ─────────────────────────────────── */
  function wgDiaryText() {
    const ta = wg$('diary');
    return ta ? (ta.value || '') : '';
  }

  /** 커서 위치에 삽입 + input 이벤트 발행 → 빙고·자동저장 등 기존 리스너 동작 */
  function wgInsertDiary(text) {
    const ta = wg$('diary');
    if (!ta) { wgToast('그림일기 화면(이음 → 그림일기)에서 쓸 수 있어요!'); return; }
    const st = (typeof ta.selectionStart === 'number') ? ta.selectionStart : ta.value.length;
    const en = (typeof ta.selectionEnd === 'number') ? ta.selectionEnd : st;
    const pre = ta.value.slice(0, st);
    const sp = (pre && !/\s$/.test(pre)) ? ' ' : '';
    ta.value = pre + sp + text + ta.value.slice(en);
    const p = st + sp.length + text.length;
    try { ta.setSelectionRange(p, p); } catch (e) {}
    ta.focus();
    try { ta.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
  }

  function wgIeumActive() {
    const el = document.getElementById('ieumApp');
    return !!(el && el.classList.contains('active'));
  }

  async function wgEnsureDiaryScreen() {
    try {
      if (!wgIeumActive() && typeof launchApp === 'function') await launchApp('ieum');
      if (typeof switchIeumTab === 'function') switchIeumTab('diary');
    } catch (e) {
      wgToast('홈에서 [이음 → 그림일기]로 들어가면 이어서 할 수 있어요!');
    }
  }

  /* ── 자체 미니 비속어 필터 (외부 함수 의존 없음) ───────── */
  const WG_BAD_WORDS = ['시발', '씨발', '병신', '개새', '지랄', '존나', '미친놈', '미친년'];
  function wgClean(text) {
    const t = String(text || '');
    return !WG_BAD_WORDS.some(function (w) { return t.indexOf(w) !== -1; });
  }

  /* ══════════════════════════════════════════════════════════
     1. 스타일 주입 (v2 + 신규 게임용 확장)
     ══════════════════════════════════════════════════════════ */

  function wgInjectStyles() {
    if (document.getElementById('wgStyles')) return;
    const st = document.createElement('style');
    st.id = 'wgStyles';
    st.textContent = [
      /* ── v2 기존 스타일 ── */
      /* ── 오감 빙고: 좌하단 플로팅 팝업 (SOS·펫 위젯과 반대편, 접으면 완전히 숨김) ── */
      '#wgBingoWrap { position: fixed; left: 14px; bottom: 84px; z-index: 232; width: 290px; max-width: calc(100vw - 28px); background: #fffdf5; border: 2px solid #f4c430; border-radius: 14px; box-shadow: 0 6px 20px rgba(0,0,0,.18); overflow: hidden; transition: opacity .2s ease; }',
      '#wgBingoWrap.collapsed { display: none; }',   /* 접으면 팝업 자체가 사라짐 */
      '#wgBingoHead { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; cursor: pointer; background: #ffe98a; user-select: none; }',
      '#wgBingoHead h4 { margin: 0; font-size: 13px; line-height: 1.3; }',
      '#wgBingoToggle { flex: 0 0 auto; font-size: 13px; font-weight: 700; color: #7a5c00; background: rgba(255,255,255,.6); border-radius: 8px; padding: 2px 8px; }',
      '#wgBingoBody { padding: 12px; }',
      '#wgBingoBoard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }',
      '.wg-cell { padding: 8px 4px; text-align: center; font-size: 12px; border-radius: 8px; background: #f0ede4; color: #999; border: 1px solid #ddd; transition: all .3s; }',
      '.wg-cell.filled { background: #ffe066; color: #333; border-color: #f4c430; font-weight: 700; transform: scale(1.04); }',
      '#wgBingoStatus { margin-top: 6px; font-size: 12px; color: #776; }',
      /* 접혔을 때 다시 펼치는 작은 칩 (좌하단, 런처 바로 위) */
      '#wgBingoChip { position: fixed; left: 76px; bottom: 24px; z-index: 232; display: none; align-items: center; gap: 5px; padding: 8px 12px; background: #ffe98a; border: 2px solid #f4c430; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,.18); cursor: pointer; font-size: 13px; font-weight: 700; color: #7a5c00; user-select: none; }',
      '#wgBingoChip.show { display: inline-flex; }',
      '#wgBingoChip:hover { background: #ffe066; }',
      '#wgLauncher { position: fixed; left: 14px; bottom: 22px; z-index: 240; width: 52px; height: 52px; border-radius: 50%; border: none; background: #6c5ce7; color: #fff; font-size: 24px; cursor: pointer; box-shadow: 0 3px 10px rgba(0,0,0,.25); }',
      '#wgLauncher:hover { transform: scale(1.08); }',
      '#wgOverlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 9991; display: none; align-items: center; justify-content: center; }',
      '#wgOverlay.open { display: flex; }',
      '#wgModal { width: min(480px, 92vw); max-height: 84vh; overflow-y: auto; background: #fff; border-radius: 14px; padding: 20px; }',
      '#wgModal.wide { width: min(680px, 94vw); }',
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
      '.wg-hp { font-size: 13px; margin-bottom: 6px; }',
      /* ── v3 신규 스타일 ── */
      '.wg-stage { margin: 14px 0 4px; font-size: 12.5px; font-weight: 700; color: #6c5ce7; border-bottom: 2px solid #e8e4ff; padding-bottom: 3px; }',
      '.wg-target { font-size: 22px; font-weight: 800; text-align: center; padding: 12px; background: #f4f1ff; border-radius: 12px; margin: 8px 0; letter-spacing: 2px; }',
      '.wg-banner { margin: 10px 0; padding: 10px 12px; border-radius: 10px; background: #fff8ec; border: 2px dashed #f0b429; font-size: 13px; line-height: 1.6; }',
      '.wg-chipbar { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }',
      '.wg-chip { padding: 5px 10px; border-radius: 14px; background: #efeaff; border: 1px solid #cfc4ff; font-size: 12.5px; cursor: pointer; user-select: none; }',
      '.wg-chip:hover { background: #e2daff; }',
      '.wg-log { max-height: 260px; overflow-y: auto; background: #f7f6f2; border-radius: 10px; padding: 10px; margin: 8px 0; }',
      '.wg-bub { margin: 6px 0; padding: 9px 12px; border-radius: 12px; font-size: 13.5px; line-height: 1.55; }',
      '.wg-bub.me { background: #dff3ee; }',
      '.wg-bub.bot { background: #efeaff; }',
      '.wg-bub.sys { background: #fde8e8; }',
      '.wg-bub img { max-width: 100%; border-radius: 10px; margin-top: 6px; }',
      '.wg-timer { font-size: 36px; font-weight: 800; text-align: center; color: #6c5ce7; margin: 6px 0; }',
      '.wg-live { min-height: 70px; max-height: 160px; overflow-y: auto; background: #f7f6f2; border-radius: 10px; padding: 10px; font-size: 14px; line-height: 1.6; }',
      '.wg-count { font-size: 12px; color: #888; text-align: right; }',
      '.wg-fcard { padding: 16px 12px; margin: 10px 0; background: #fff; border: 2px solid #d7cff5; border-radius: 12px; font-size: 15px; line-height: 1.6; min-height: 64px; }',
      '.wg-row2 { display: flex; gap: 8px; }',
      '.wg-row2 .wg-btn { flex: 1; margin: 4px 0; }',
      '.wg-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0; }',
      '.wg-task { padding: 12px 6px; border: 1px solid #ddd; border-radius: 10px; background: #f9f8f4; text-align: center; cursor: pointer; font-size: 12.5px; }',
      '.wg-task:hover { background: #efece2; }',
      '.wg-task .em { font-size: 24px; display: block; margin-bottom: 4px; }',
      '.wg-vote { display: block; width: 100%; text-align: left; margin: 5px 0; padding: 10px; border: 1px solid #ddd; border-radius: 10px; background: #fff; font-size: 13.5px; cursor: pointer; }',
      '.wg-vote.correct { background: #dff3ee; border-color: #00b894; }',
      '.wg-vote.wrong { background: #fde8e8; border-color: #e17055; }',
      '@keyframes wgPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(108,92,231,.45); } 50% { box-shadow: 0 0 0 9px rgba(108,92,231,0); } }',
      '.wg-pulse { animation: wgPulse 1.4s ease-in-out 6; }',
      '#wgDetBtn { margin: 6px 0; display: block; }'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ══════════════════════════════════════════════════════════
     2. 공용 모달 (v3: wide 파라미터 추가 — 기존 호출부 영향 없음)
     ══════════════════════════════════════════════════════════ */

  function wgEnsureModal() {
    if (document.getElementById('wgOverlay')) return;
    const ov = document.createElement('div');
    ov.id = 'wgOverlay';
    ov.innerHTML = '<div id="wgModal"></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) wgCloseModal(); });
    document.body.appendChild(ov);
  }

  function wgOpenModal(html, wide) {
    wgEnsureModal();
    const m = document.getElementById('wgModal');
    m.classList.toggle('wide', !!wide);
    m.innerHTML = html;
    document.getElementById('wgOverlay').classList.add('open');
  }

  function wgCloseModal() {
    const ov = document.getElementById('wgOverlay');
    if (ov) ov.classList.remove('open');
  }
  window.wgCloseModal = wgCloseModal;

  /* ══════════════════════════════════════════════════════════
     3. 게임 ① 오감 빙고 (v2 원본 유지)
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

    // 접힘 상태 복원 (기본: 펼침)
    const collapsed = wgLoad('bingoCollapsed', false);

    const wrap = document.createElement('div');
    wrap.id = 'wgBingoWrap';
    if (collapsed) wrap.classList.add('collapsed');
    wrap.innerHTML =
      '<div id="wgBingoHead" onclick="wgToggleBingo()">' +
        '<h4>🎯 오감 빙고<span class="wg-bingo-sub"> — 표현이 들어가면 불이 켜져요!</span></h4>' +
        '<span id="wgBingoToggle">접기 ✕</span>' +
      '</div>' +
      '<div id="wgBingoBody">' +
        '<div id="wgBingoBoard">' +
        WG_BINGO_CELLS.map(function (c) {
          return '<div class="wg-cell" id="wg_cell_' + c.id + '">' + c.label + '</div>';
        }).join('') +
        '</div>' +
        '<div id="wgBingoStatus">빙고 줄 0개 · 한 줄마다 잉크 +30, 다 채우면 +100!</div>' +
      '</div>';
    document.body.appendChild(wrap);   // 일기 아래가 아니라 화면에 고정(플로팅)

    // 접혔을 때 다시 펼치는 작은 칩 (게임 런처 옆)
    const chip = document.createElement('div');
    chip.id = 'wgBingoChip';
    if (collapsed) chip.classList.add('show');
    chip.setAttribute('onclick', 'wgToggleBingo()');
    chip.innerHTML = '🎯 오감 빙고';
    document.body.appendChild(chip);

    wgBingoRender(ta.value || '', true);   // 기존 글은 기준선만 설정

    ta.addEventListener('input', function () {
      clearTimeout(_wgBingoTimer);
      _wgBingoTimer = setTimeout(function () { wgBingoRender(ta.value || '', false); }, 400);
    });
    // 옛 일기 불러오기·붙여넣기로 잉크를 받는 경로 차단: 포커스 시 기준선 재동기화
    ta.addEventListener('focus', function () { wgBingoRender(ta.value || '', true); });
  }

  /** 오감 빙고 접기/펼치기: 접으면 팝업이 완전히 사라지고 작은 칩만 남음 */
  function wgToggleBingo() {
    const wrap = document.getElementById('wgBingoWrap');
    const chip = document.getElementById('wgBingoChip');
    if (!wrap || !chip) return;
    const nowCollapsed = wrap.classList.toggle('collapsed');
    chip.classList.toggle('show', nowCollapsed);
    wgSave('bingoCollapsed', nowCollapsed);
  }
  window.wgToggleBingo = wgToggleBingo;

  /** 일기 입력칸이 실제 화면에 보일 때만 빙고 노출 (다른 탭에선 팝업·칩 모두 숨김) */
  function wgSyncBingoVisibility() {
    const wrap = document.getElementById('wgBingoWrap');
    const chip = document.getElementById('wgBingoChip');
    if (!wrap) return;
    const ta = wg$('diary');
    // offsetParent가 null이면 화면에서 숨겨진 상태(다른 탭/화면)
    const visible = !!(ta && ta.offsetParent !== null);
    const collapsed = wrap.classList.contains('collapsed');
    if (!visible) {
      // 일기 화면이 아니면 둘 다 감춤
      wrap.style.display = 'none';
      if (chip) chip.style.display = 'none';
    } else {
      // 일기 화면이면 접힘 상태에 따라 팝업/칩 표시 (CSS 클래스가 실제 표시를 결정)
      wrap.style.display = collapsed ? 'none' : '';
      if (chip) chip.style.display = '';
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
     4. 게임 ② 펫 단어 편식 (v2 원본 유지)
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
     5. 게임 ③ 맞춤법 몬스터 사냥 (v2 원본 유지)
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
    { wrong: '주말에 친구가 우리집에 놀러 왔다.',  right: '주말에 친구가 우리 집에 놀러 왔다.', hint: '"우리"와 "집"은 띄어 써요.' },

     /* ═══ 확충: 되/돼 보강 ═══ */
     { wrong: '준비가 다 됫어요.',                  right: '준비가 다 됐어요.',                  hint: '"되었어요"의 준말은 "됐어요"예요.' },
     { wrong: '그렇게 하면 안 되.',                 right: '그렇게 하면 안 돼.',                 hint: '"되어"로 바꿀 수 있으면 "돼"를 써요.' },
     { wrong: '이제 집에 가도 되죠?',               right: '이제 집에 가도 되죠?',               hint: '"되죠"는 바른 표기예요. 이미 맞으면 그대로 쓰면 돼요!' },

     /* ═══ 확충: 안/않 보강 ═══ */
     { wrong: '숙제를 아직 끝내지 안았어.',          right: '숙제를 아직 끝내지 않았어.',          hint: '"-지 않았어"가 한 묶음이에요.' },
     { wrong: '오늘은 별로 안 춥다.',               right: '오늘은 별로 안 춥다.',               hint: '"아니"로 바꿀 수 있으니 "안"이 맞아요. 이미 바른 문장!' },
     { wrong: '아무리 불러도 대답을 안 한다.',       right: '아무리 불러도 대답을 안 한다.',       hint: '"안 한다"가 바른 표기예요.' },

     /* ═══ 확충: 가르치다/가리키다 보강 ═══ */
     { wrong: '엄마가 젓가락질을 가리켜 주셨다.',    right: '엄마가 젓가락질을 가르쳐 주셨다.',    hint: '방법을 알려 주는 것은 "가르치다"예요.' },
     { wrong: '시곗바늘이 세 시를 가르치고 있다.',   right: '시곗바늘이 세 시를 가리키고 있다.',   hint: '어떤 것을 집어 보이는 것은 "가리키다"예요.' },
     { wrong: '선생님이 칠판의 글자를 가르켰다.',    right: '선생님이 칠판의 글자를 가리켰다.',    hint: '방향이나 대상을 집을 땐 "가리키다"예요.' },

     /* ═══ 확충: 낫다/낳다/낮다 보강 ═══ */
     { wrong: '약을 먹었더니 감기가 다 낳았다.',     right: '약을 먹었더니 감기가 다 나았다.',     hint: '병이 좋아지는 것은 "낫다"예요.' },
     { wrong: '이 연필이 저 연필보다 낮다.',         right: '이 연필이 저 연필보다 낫다.',         hint: '더 좋다는 뜻은 "낫다", 높이가 아래인 건 "낮다"예요.' },
     { wrong: '암탉이 알을 다섯 개나 낫았다.',       right: '암탉이 알을 다섯 개나 낳았다.',       hint: '알이나 새끼는 "낳다"를 써요.' },

     /* ═══ 확충: 새 유형 — 든/던 ═══ */
     { wrong: '얼마나 빨리 뛰든지 숨이 찼다.',       right: '얼마나 빨리 뛰던지 숨이 찼다.',       hint: '지난 일을 떠올릴 땐 "-던지"를 써요.' },
     { wrong: '물이던 주스던 아무거나 좋아.',        right: '물이든 주스든 아무거나 좋아.',        hint: '고르는 것일 땐 "-든"을 써요.' },
     { wrong: '네가 가던지 내가 가던지 정하자.',     right: '네가 가든지 내가 가든지 정하자.',     hint: '선택할 땐 "-든지"를 써요.' },

     /* ═══ 확충: 새 유형 — 채/체/째 ═══ */
     { wrong: '자는 채 하지 말고 얼른 일어나.',      right: '자는 체 하지 말고 얼른 일어나.',      hint: '거짓으로 그런 척하는 건 "체"예요.' },
     { wrong: '사과를 껍질째 먹었다.',              right: '사과를 껍질째 먹었다.',              hint: '"통째로"의 "-째"가 맞아요. 이미 바른 문장!' },
     { wrong: '불을 켠 째로 잠이 들었다.',          right: '불을 켠 채로 잠이 들었다.',          hint: '그 상태 그대로일 땐 "채"를 써요.' },

     /* ═══ 확충: 새 유형 — 로서/로써 ═══ */
     { wrong: '학생으로써 최선을 다하겠다.',        right: '학생으로서 최선을 다하겠다.',        hint: '지위나 자격은 "로서"를 써요.' },
     { wrong: '대화로서 오해를 풀었다.',            right: '대화로써 오해를 풀었다.',            hint: '수단·방법은 "로써"를 써요.' },

     /* ═══ 확충: 새 유형 — 이따가/있다가 ═══ */
     { wrong: '있다가 다시 전화할게.',              right: '이따가 다시 전화할게.',              hint: '시간이 조금 지난 뒤는 "이따가"예요.' },
     { wrong: '집에 이따가 학원에 갔다.',           right: '집에 있다가 학원에 갔다.',           hint: '어떤 곳에 머무는 건 "있다가"예요.' },

     /* ═══ 확충: 새 유형 — 담다/담그다, 잠그다 ═══ */
     { wrong: '김치를 맛있게 담궜다.',              right: '김치를 맛있게 담갔다.',              hint: '기본형이 "담그다"라서 "담갔다"예요.' },
     { wrong: '나갈 때 문을 꼭 잠궈라.',            right: '나갈 때 문을 꼭 잠가라.',            hint: '기본형이 "잠그다"라서 "잠가라"예요.' },

     /* ═══ 확충: 자주 틀리는 낱말 보강 ═══ */
     { wrong: '오늘 날씨가 정말 덥든지 땀이 났다.',  right: '오늘 날씨가 정말 덥던지 땀이 났다.',  hint: '지난 일을 떠올릴 땐 "-던지"예요.' },
     { wrong: '동생이 자꾸 트집을 잡는다.',         right: '동생이 자꾸 트집을 잡는다.',         hint: '"트집"이 바른 표기예요. 이미 맞는 문장!' },
     { wrong: '깜빡하고 우산을 안 가져왔다.',       right: '깜빡하고 우산을 안 가져왔다.',       hint: '"깜빡"이 바른 표기예요. 이미 맞는 문장!' },
     { wrong: 'friend를 우리말로 하면 친구다.',     right: '친구와 사이좋게 지냈다.',            hint: '일기에는 우리말로 써요.' },
     { wrong: '창피해서 얼굴이 빨개졌다.',          right: '창피해서 얼굴이 빨개졌다.',          hint: '"창피"가 바른 표기예요. 이미 맞는 문장!' },
     { wrong: '나는 김치찌개를 제일 조아한다.',      right: '나는 김치찌개를 제일 좋아한다.',      hint: '"좋아한다"에는 받침 "ㅎ"이 있어요.' },
     { wrong: '어름이 꽁꽁 얼어붙었다.',            right: '얼음이 꽁꽁 얼어붙었다.',            hint: '"얼다"에서 온 말이라 "얼음"이에요.' },
     { wrong: '일찌기 일어나 운동을 했다.',         right: '일찍이 일어나 운동을 했다.',         hint: '"일찍"에 "-이"가 붙어 "일찍이"예요.' },
     { wrong: '설겆이를 도와드렸다.',              right: '설거지를 도와드렸다.',              hint: '"설거지"가 바른 표기예요.' },
     { wrong: '떡을 한 입에 널름 삼켰다.',          right: '떡을 한 입에 냉큼 삼켰다.',          hint: '"냉큼"이 표준어예요.' },
     { wrong: '발자국 소리가 들렸다.',              right: '발자국 소리가 들렸다.',              hint: '"발자국"이 바른 표기예요. 이미 맞는 문장!' },
     { wrong: '베게에 머리를 대자마자 잠들었다.',    right: '베개에 머리를 대자마자 잠들었다.',    hint: '베는 물건은 "베개"예요.' },
     { wrong: '숙제를 깜박 잊어버렸다.',            right: '숙제를 깜박 잊어버렸다.',            hint: '기억이 안 나는 건 "잊어버리다"예요. 이미 맞는 문장!' },
     { wrong: '우리는 금세 친해졌다.',              right: '우리는 금세 친해졌다.',              hint: '"금시에"의 준말 "금세"가 맞아요. 이미 바른 문장!' },
     { wrong: '눈꼽이 껴서 눈이 뻑뻑했다.',         right: '눈곱이 껴서 눈이 뻑뻑했다.',         hint: '눈에 끼는 건 "눈곱"이에요.' },
     { wrong: '문을 두드리는 소리가 났다.',         right: '문을 두드리는 소리가 났다.',         hint: '"두드리다"가 바른 표기예요. 이미 맞는 문장!' }
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

  /** 검증된 문제은행에서만 문제 추출 (AI 출제 제거 — 맞춤법 정확성 보장).
      최근 24문항 반복 차단은 wgPickFromBank가 처리한다. */
  function wgBuildMonsters() {
    const questions = wgPickFromBank(WG_HUNT_SIZE, []);
    wgRemember(questions);
    return questions;
  }

  function wgStartMonsterHunt() {
    _wgMonsters = wgBuildMonsters();
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
     6. 게임 ④ 문장 늘리기 콤보
        (v2 원본 — 변경 1곳: 판정 호출에 temperature 0)
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
      250, 0   /* v3: 판정 재현성을 위해 temperature 0 */
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
     7. 게임 ⑤ 텔레파시 [v3 신규 — 돋움 계열]
        사물 스무고개: 이름 없이 설명 → 외계인 AI가 추측
        감정 텔레파시: 감정 단어 없이 장면·행동 → AI가 감정 추측
        교육 목표: '말하지 말고 보여주기(show, don't tell)'
        — 몬스터 사냥과 달리 AI가 심판이 아니라 '독자' 역할:
          전달에 성공했는지가 곧 피드백이 된다
     ══════════════════════════════════════════════════════════ */

  const WG_TELE_EMOTIONS = [
    '설렘', '뿌듯함', '서운함', '질투', '억울함', '민망함', '안도감', '그리움',
    '긴장', '지루함', '고마움', '미안함', '부러움', '통쾌함', '걱정', '평온함'
  ];

  let _wgTele = { mode: 'object', target: '', round: 1 };
  let _wgTeleBusy = false;

  function wgStartTelepathy() {
    wgOpenModal(
      '<h3>📡 텔레파시</h3>' +
      '<p class="wg-note">정답의 <b>이름을 쓰지 않고</b>, 설명만으로 AI에게 전달하는 게임이에요.<br>' +
      '1차에 통하면 잉크 +20, 2차에 통하면 +10!</p>' +
      '<button class="wg-menu-btn" onclick="wgTeleBegin(\'object\')">👽 사물 스무고개 <span class="wg-note">— 지구에 막 온 외계인에게 물건 설명하기</span></button>' +
      '<button class="wg-menu-btn" onclick="wgTeleBegin(\'emotion\')">💜 감정 텔레파시 <span class="wg-note">— 감정 단어 없이 장면·행동으로 보여주기</span></button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
  }
  window.wgStartTelepathy = wgStartTelepathy;

  function wgTeleBegin(mode) {
    const pool = (mode === 'emotion') ? WG_TELE_EMOTIONS : wgObjectPool();
    const target = wgCleanWord(pool[Math.floor(Math.random() * pool.length)]);
    _wgTele = { mode: mode, target: target, round: 1 };
    wgTeleRender('', '');
  }
  window.wgTeleBegin = wgTeleBegin;

  function wgTeleRender(extraHtml, keepText) {
    const isEmo = (_wgTele.mode === 'emotion');
    wgOpenModal(
      '<h3>' + (isEmo ? '💜 감정 텔레파시' : '👽 사물 스무고개') + ' — ' + _wgTele.round + '차 시도</h3>' +
      '<div class="wg-target">🤫 ' + wgEsc(_wgTele.target) + '</div>' +
      '<p class="wg-note">' +
      (isEmo
        ? '이 <b>감정 단어를 쓰지 말고</b>, 그때의 장면·행동·표정만 2문장 이상으로 묘사해요. AI가 감정을 맞히면 성공!'
        : '이 <b>물건의 이름을 쓰지 말고</b>, 생김새·쓰임새·소리 등을 2문장 이상으로 설명해요. 외계인 AI가 맞히면 성공!') +
      '</p>' +
      (extraHtml || '') +
      '<textarea class="wg-input" id="wgTeleInput" rows="4" placeholder="여기에 설명을 써 보세요 (2문장 이상)">' + wgEsc(keepText || '') + '</textarea>' +
      '<div id="wgTeleMsg" class="wg-note"></div>' +
      '<button class="wg-btn" id="wgTeleBtn" onclick="wgTeleSubmit()">📡 텔레파시 보내기!</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">그만하기</button>'
    );
    const ta = document.getElementById('wgTeleInput');
    if (ta) ta.focus();
  }

  function wgTeleMatch(guess, target) {
    const g = wgNorm(guess, true), t = wgNorm(target, true);
    if (!g || !t) return false;
    return g === t || g.indexOf(t) !== -1 || t.indexOf(g) !== -1;
  }

  async function wgTeleSubmit() {
    if (_wgTeleBusy) return;
    const input = document.getElementById('wgTeleInput');
    const msgEl = document.getElementById('wgTeleMsg');
    const btn = document.getElementById('wgTeleBtn');
    const text = input ? input.value.trim() : '';
    const sentCnt = text.split(/[.!?…\n]/).filter(function (s) { return s.trim().length >= 2; }).length;

    if (text.length < 20 || sentCnt < 2) {
      if (msgEl) msgEl.textContent = '2문장 이상, 조금만 더 자세히 써 볼까요?';
      return;
    }
    if (wgNorm(text, true).indexOf(wgNorm(_wgTele.target, true)) !== -1) {
      if (msgEl) msgEl.textContent = '앗! 정답 낱말이 설명에 들어 있어요. 이름 없이 설명해 보세요 🤫';
      return;
    }
    if (!wgClean(text)) {
      if (msgEl) msgEl.textContent = '고운 말로 설명해 주세요!';
      return;
    }

    _wgTeleBusy = true;
    if (btn) { btn.disabled = true; btn.textContent = 'AI가 생각 중…'; }

    const isEmo = (_wgTele.mode === 'emotion');
    const sys = isEmo
      ? '너는 감정 맞히기 게임의 AI야. 학생의 장면 묘사만 읽고 감정을 추측해. 반드시 JSON만 출력해.'
      : '너는 지구에 막 도착해서 지구 물건의 이름을 배우는 중인 외계인이야. 설명만 듣고 물건을 추측해. 반드시 JSON만 출력해.';
    const user = isEmo
      ? '감정 후보 목록: ' + WG_TELE_EMOTIONS.join(', ') + '\n\n' +
        '학생의 묘사:\n"' + text + '"\n\n' +
        '목록에서 감정 1개를 고르고, 단서가 된 표현 / 확신이 없을 때 더 알고 싶은 점 질문 1개 / 추측에 도움이 될 묘사 제안 1개를 알려줘.\n' +
        '출력: {"guess":"감정 1개","reason":"단서가 된 표현 한 문장","question":"질문 1개","coach":"묘사 제안 한 문장"}'
      : '학생의 설명:\n"' + text + '"\n\n' +
        '지구의 흔한 물건 이름 1개를 한 단어로 추측하고, 단서가 된 표현 / 더 알고 싶은 점 질문 1개 / 추측에 도움이 될 설명 제안 1개를 알려줘.\n' +
        '출력: {"guess":"물건 이름","reason":"단서 한 문장","question":"질문 1개","coach":"설명 제안 한 문장"}';

    const parsed = wgParseJSON(await wgCallAI(sys, user, 350, 0));
    _wgTeleBusy = false;
    if (btn) { btn.disabled = false; btn.textContent = '📡 텔레파시 보내기!'; }

    if (!parsed || !parsed.guess) {
      if (msgEl) msgEl.textContent = 'AI 연결이 잠깐 어려워요. 다시 한 번 눌러 볼까요?';
      return;
    }

    if (wgTeleMatch(parsed.guess, _wgTele.target)) {
      const reward = (_wgTele.round === 1) ? 20 : 10;
      const s = wgLoad('tele', { wins: 0 });
      s.wins = (s.wins || 0) + 1;
      wgSave('tele', s);
      wgAddInk(reward, '(텔레파시 성공!)');
      if (s.wins >= 5) wgAddBadge('텔레파시 마스터');
      wgPetSay('통했다! 네 설명이 그림처럼 생생했나 봐 📡✨');
      wgOpenModal(
        '<h3>🎉 텔레파시 성공!</h3>' +
        '<p>AI의 추측: <b>' + wgEsc(parsed.guess) + '</b> (정답: ' + wgEsc(_wgTele.target) + ')</p>' +
        '<p class="wg-note">🔍 AI가 잡은 단서: ' + wgEsc(parsed.reason || '') + '</p>' +
        '<p class="wg-note">지금까지 성공 ' + s.wins + '번' + (s.wins < 5 ? ' (5번이면 뱃지!)' : '') + '</p>' +
        '<button class="wg-btn" onclick="wgTeleBegin(\'' + _wgTele.mode + '\')">한 번 더!</button>' +
        '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
      );
      return;
    }

    if (_wgTele.round === 1) {
      _wgTele.round = 2;
      wgTeleRender(
        '<div class="wg-sentence">🤖 AI의 추측: <b>' + wgEsc(parsed.guess) + '</b> … 아직 안 통했어요!<br>' +
        '❓ AI의 질문: ' + wgEsc(parsed.question || '조금 더 자세히 알려줘!') + '</div>' +
        '<p class="wg-note">질문에 답이 되도록 설명을 고치거나 덧붙여서 다시 보내 보세요.</p>',
        text
      );
      return;
    }

    wgOpenModal(
      '<h3>😅 이번엔 전달이 안 됐어요</h3>' +
      '<p>AI의 추측: <b>' + wgEsc(parsed.guess) + '</b> / 정답: <b>' + wgEsc(_wgTele.target) + '</b></p>' +
      '<p class="wg-note">💡 코치의 한마디: ' + wgEsc(parsed.coach || '모양·크기·쓰임새처럼 그것만의 특징을 콕 집어 보세요.') + '</p>' +
      '<button class="wg-btn" onclick="wgTeleBegin(\'' + _wgTele.mode + '\')">새 문제로 다시!</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
  }
  window.wgTeleSubmit = wgTeleSubmit;

  /* ══════════════════════════════════════════════════════════
     8. 게임 ⑥ 문장 다이어트 [v3 신규 — 돋움 계열]
        군더더기를 빼고 핵심만 남기기 (콤보의 반대 방향 훈련)
        교육 근거: 요약 활동은 쓰기 지도에서 효과가 크게 보고됨
     ══════════════════════════════════════════════════════════ */

  const WG_DIET_BANK = [
    { fat: '나는 오늘 아침에 눈을 뜨자마자 정말 진짜 너무너무 배가 몹시 고파서 밥을 아주 많이 엄청 빨리 허겁지겁 먹었다.', limit: 24, hint: '언제·누가·왜·어떻게 했는지만 남겨도 충분해요.' },
    { fat: '내 동생은 어제 저녁에 갑자기 아무런 별다른 이유도 없이 그냥 마구 크게 엉엉 소리 내어 울음을 터뜨리고 말았다.', limit: 22, hint: '"갑자기", "엉엉" 같은 알맹이만 골라 보세요.' },
    { fat: '우리 반 친구들은 점심시간에 운동장으로 우르르 몰려나가서 아주 신나고 재미있고 즐겁게 축구 경기를 하면서 놀았다.', limit: 24, hint: '비슷한 꾸밈말이 겹쳐 있어요. 하나만 남기면?' },
    { fat: '창밖에는 하루 종일 쉬지 않고 계속해서 주룩주룩 세차게 비가 내리고 또 내리고 있었다.', limit: 18, hint: '"내리고 또 내리고"는 한 번이면 돼요.' },
    { fat: '할머니께서 만들어 주신 김치찌개는 정말로 진짜 너무나도 맛있고 맛있어서 밥을 두 그릇이나 더 먹게 되었다.', limit: 26, hint: '"두 그릇"이라는 숫자가 맛을 증명해 줘요.' },
    { fat: '나는 숙제를 하기가 너무너무 싫고 귀찮고 하기 싫었지만 그래도 꾹 참고 끝까지 다 마쳤다.', limit: 20, hint: '"싫고 귀찮고 하기 싫었지만"에서 겹치는 말을 찾아요.' },
    { fat: '놀이터에 있는 미끄럼틀은 아주 매우 무척 길고 길어서 타고 내려올 때 정말 엄청나게 짜릿하고 신났다.', limit: 24, hint: '"아주 매우 무척"은 하나만 있어도 강해요.' },
    { fat: '우리 집 강아지는 내가 학교에서 돌아오면 언제나 항상 매번 꼬리를 마구마구 흔들면서 나를 반겨 준다.', limit: 26, hint: '"언제나 항상 매번"은 모두 같은 뜻이에요.' }
  ];

  let _wgDiet = null;
  let _wgDietBusy = false;

  function wgStartDiet() {
    _wgDiet = WG_DIET_BANK[Math.floor(Math.random() * WG_DIET_BANK.length)];
    wgDietRender('');
  }
  window.wgStartDiet = wgStartDiet;

  function wgDietRender(msg) {
    wgOpenModal(
      '<h3>✂️ 문장 다이어트</h3>' +
      '<p class="wg-note">군더더기를 빼고 <b>' + _wgDiet.limit + '자 이내</b>로! 단, 핵심 뜻은 살려야 해요. (성공 +15잉크)</p>' +
      '<div class="wg-sentence">' + wgEsc(_wgDiet.fat) + ' <span class="wg-note">(' + _wgDiet.fat.length + '자)</span></div>' +
      '<input class="wg-input" id="wgDietInput" placeholder="핵심만 남긴 문장을 써 보세요">' +
      '<div class="wg-count" id="wgDietCount">0 / ' + _wgDiet.limit + '자</div>' +
      '<div id="wgDietMsg" class="wg-note">' + wgEsc(msg || ('💡 힌트: ' + _wgDiet.hint)) + '</div>' +
      '<button class="wg-btn" id="wgDietBtn" onclick="wgDietSubmit()">✂️ 다이어트 완료!</button>' +
      '<button class="wg-btn gray" onclick="wgStartDiet()">다른 문장</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
    const input = document.getElementById('wgDietInput');
    if (input) {
      input.addEventListener('input', function () {
        const c = document.getElementById('wgDietCount');
        if (c) {
          c.textContent = input.value.length + ' / ' + _wgDiet.limit + '자';
          c.style.color = (input.value.length > _wgDiet.limit) ? '#e17055' : '#888';
        }
      });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') wgDietSubmit(); });
      input.focus();
    }
  }

  async function wgDietSubmit() {
    if (_wgDietBusy) return;
    const input = document.getElementById('wgDietInput');
    const msgEl = document.getElementById('wgDietMsg');
    const btn = document.getElementById('wgDietBtn');
    const slim = input ? input.value.trim() : '';

    if (slim.length < 6) { if (msgEl) msgEl.textContent = '문장을 먼저 써 주세요!'; return; }
    if (slim.length > _wgDiet.limit) {
      if (msgEl) msgEl.textContent = '아직 ' + (slim.length - _wgDiet.limit) + '자 초과! 더 뺄 군더더기를 찾아보세요.';
      return;
    }

    _wgDietBusy = true;
    if (btn) { btn.disabled = true; btn.textContent = '판정 중…'; }

    const parsed = wgParseJSON(await wgCallAI(
      '너는 초등학생 문장 요약 게임의 심판이야. 반드시 JSON만 출력해.',
      '원래 문장: "' + _wgDiet.fat + '"\n' +
      '학생이 줄인 문장: "' + slim + '"\n\n' +
      '판정 규칙:\n' +
      '1. 누가·무엇을 했는지(핵심 사건)가 그대로 남아 있으면 ok는 true\n' +
      '2. 원래 문장에 없던 새 내용을 지어내면 안 된다\n' +
      '3. 문장이 자연스러워야 한다\n' +
      '출력: {"ok": true 또는 false, "missing": "빠진 핵심(없으면 빈 문자열)", "comment": "초등학생 눈높이 한 문장 코멘트"}',
      250, 0
    ));
    _wgDietBusy = false;
    if (btn) { btn.disabled = false; btn.textContent = '✂️ 다이어트 완료!'; }

    if (!parsed || typeof parsed.ok !== 'boolean') {
      if (msgEl) msgEl.textContent = 'AI 연결이 잠깐 어려워요. 다시 눌러 볼까요?';
      return;
    }

    if (!parsed.ok) {
      if (msgEl) msgEl.textContent = '❌ ' + (parsed.missing ? '빠진 핵심: ' + parsed.missing + ' — ' : '') + (parsed.comment || '핵심 뜻을 살려서 다시!');
      return;
    }

    const s = wgLoad('diet', { wins: 0 });
    s.wins = (s.wins || 0) + 1;
    wgSave('diet', s);
    wgAddInk(15, '(다이어트 성공!)');
    if (s.wins >= 5) wgAddBadge('문장 요리사');
    wgOpenModal(
      '<h3>🎉 다이어트 성공!</h3>' +
      '<div class="wg-sentence">' + wgEsc(_wgDiet.fat) + ' <span class="wg-note">(' + _wgDiet.fat.length + '자)</span></div>' +
      '<div class="wg-sentence">✂️ ' + wgEsc(slim) + ' <span class="wg-note">(' + slim.length + '자)</span></div>' +
      '<p class="wg-note">' + wgEsc(parsed.comment || '군더더기 없이 핵심이 딱!') + ' · 지금까지 성공 ' + s.wins + '번</p>' +
      '<button class="wg-btn" onclick="wgStartDiet()">다른 문장도!</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
  }
  window.wgDietSubmit = wgDietSubmit;

  /* ══════════════════════════════════════════════════════════
     9. 게임 ⑪ 고장난 로봇 조종하기 [v3 신규 — 틔움 계열]
        절차 설명문 훈련: 로봇은 지시문을 '문자 그대로만' 수행.
        빠진 단계 → 우스꽝스러운 결과 → 전체 지시문 재작성(퇴고)
        3라운드 안에 성공하면 클리어. 릴레이 동화·토론처럼
        '내가 쓰고 AI가 반응하는' 틔움식 주고받기 구조.
        [6국03-01] 절차·특성이 드러나는 설명문과 직결.
     ══════════════════════════════════════════════════════════ */

  const WG_ROBOT_TASKS = [
    { id: 'sandwich', name: '샌드위치 만들기', em: '🥪',
      critical: ['빵을 두 장 준비한다', '잼(속재료) 뚜껑을 연다', '도구로 잼을 빵에 바른다', '다른 빵 한 장을 위에 덮는다'] },
    { id: 'plane', name: '종이비행기 접기', em: '✈️',
      critical: ['종이를 한 장 준비한다', '세로로 반을 접었다가 편다', '위쪽 두 모서리를 가운데 선에 맞춰 접는다', '반으로 접고 양쪽 날개를 접는다'] },
    { id: 'wash', name: '세수하기', em: '🧼',
      critical: ['소매를 걷는다', '물을 튼다', '손과 얼굴에 물을 묻히고 비누칠한다', '물로 헹구고 수건으로 닦는다', '물을 잠근다'] },
    { id: 'bag', name: '책가방 싸기', em: '🎒',
      critical: ['내일 시간표를 확인한다', '필요한 교과서와 공책을 고른다', '필통을 챙긴다', '가방에 넣고 지퍼를 닫는다'] },
    { id: 'cereal', name: '시리얼 말기', em: '🥣',
      critical: ['그릇을 준비한다', '시리얼을 그릇에 붓는다', '우유를 붓는다', '숟가락을 준비한다'] },
    { id: 'plant', name: '화분에 물 주기', em: '🪴',
      critical: ['물뿌리개(컵)에 물을 받는다', '화분의 흙에 천천히 붓는다', '넘치지 않게 양을 조절한다', '물뿌리개를 제자리에 둔다'] }
  ];

  let _wgRobot = { idx: -1, round: 1, scene: '' };
  let _wgRobotBusy = false;

  function wgStartRobot() {
    wgOpenModal(
      '<h3>🤖 고장난 로봇 조종하기</h3>' +
      '<p class="wg-note">이 로봇은 <b>시키는 것만, 시킨 그대로만</b> 해요. 빠진 단계가 있으면 이상한 일이 벌어져요!<br>' +
      '순서대로 빠짐없이 지시해서 3라운드 안에 임무를 성공시키면 +25잉크. 임무 3종을 깨면 뱃지!</p>' +
      '<div class="wg-grid">' +
      WG_ROBOT_TASKS.map(function (t, i) {
        return '<div class="wg-task" onclick="wgRobotBegin(' + i + ')"><span class="em">' + t.em + '</span>' + wgEsc(t.name) + '</div>';
      }).join('') +
      '</div>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>',
      true
    );
  }
  window.wgStartRobot = wgStartRobot;

  function wgRobotBegin(i) {
    const t = WG_ROBOT_TASKS[i];
    if (!t) return;
    _wgRobot = { idx: i, round: 1, scene: '' };
    wgOpenModal(
      '<h3>🤖 고장난 로봇 — ' + t.em + ' ' + wgEsc(t.name) + '</h3>' +
      '<div class="wg-log" id="wgRobotLog">' +
      '<div class="wg-bub bot">🤖 삐빅. 지시를 기다립니다. 저는 시키지 않은 일은 절대 하지 않아요. 처음부터 끝까지, 순서대로 알려 주세요.</div>' +
      '</div>' +
      '<div class="wg-note" id="wgRobotRound">라운드 1 / 3 — 지시문 <b>전체</b>를 써 주세요 (라운드마다 고쳐 쓰는 것이 곧 퇴고 연습!)</div>' +
      '<textarea class="wg-input" id="wgRobotInput" rows="4" placeholder="예) 먼저 ○○를 준비해. 그다음 ○○를 열어. 그리고 …"></textarea>' +
      '<div id="wgRobotFoot">' +
      '<button class="wg-btn" id="wgRobotBtn" onclick="wgRobotRun()">🤖 로봇 실행!</button>' +
      '<button class="wg-btn gray" onclick="wgStartRobot()">임무 바꾸기</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>' +
      '</div>',
      true
    );
    const ta = document.getElementById('wgRobotInput');
    if (ta) ta.focus();
  }
  window.wgRobotBegin = wgRobotBegin;

  function wgRobotBub(cls, html) {
    const log = document.getElementById('wgRobotLog');
    if (!log) return;
    const d = document.createElement('div');
    d.className = 'wg-bub ' + cls;
    d.innerHTML = html;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  async function wgRobotRun() {
    if (_wgRobotBusy) return;
    const t = WG_ROBOT_TASKS[_wgRobot.idx];
    const ta = document.getElementById('wgRobotInput');
    const btn = document.getElementById('wgRobotBtn');
    const roundEl = document.getElementById('wgRobotRound');
    const text = ta ? ta.value.trim() : '';
    if (!t) return;

    if (text.length < 20) { wgToast('지시문을 조금 더 자세히! (20자 이상)'); return; }
    if (!wgClean(text)) { wgToast('고운 말로 지시해 주세요!'); return; }

    _wgRobotBusy = true;
    if (btn) { btn.disabled = true; btn.textContent = '로봇 작동 중…'; }
    wgRobotBub('me', '🧑 ' + wgEsc(text.length > 90 ? text.slice(0, 90) + '…' : text));

    const parsed = wgParseJSON(await wgCallAI(
      '너는 "고장난 로봇" 게임의 심판이자 로봇이야. 로봇은 학생의 지시문에 적힌 것만, 적힌 그대로 수행하고 스스로 판단해서 보충하지 않아. 반드시 JSON만 출력해.',
      '임무: ' + t.name + '\n' +
      '임무의 필수 단계:\n' + t.critical.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n') + '\n\n' +
      '현재 라운드: ' + _wgRobot.round + ' / 3\n' +
      '학생의 지시문:\n"' + text + '"\n\n' +
      '판정 규칙:\n' +
      '- 필수 단계가 (다른 말로 표현했더라도) 모두 들어 있으면 success는 true\n' +
      '- 빠진 단계가 있으면, 로봇이 그 단계 없이 문자 그대로 행동해서 벌어지는 우스꽝스럽지만 안전한 결과를 performance에 2~3문장으로 묘사\n' +
      '- missing에는 가장 중요한 빠진 단계를 딱 1개만 (성공이면 빈 문자열)\n' +
      '- 성공이면 performance에 로봇이 임무를 잘 끝낸 모습을 신나게 묘사\n' +
      '- scene에는 그 장면을 영어 한 문장으로 (그림 생성용, 사람 이름 없이)\n' +
      '출력: {"success":false,"performance":"...","missing":"...","scene":"..."}',
      500, 0
    ));
    _wgRobotBusy = false;
    if (btn) { btn.disabled = false; btn.textContent = '🤖 로봇 실행!'; }

    if (!parsed || typeof parsed.success !== 'boolean') {
      wgRobotBub('sys', '📡 로봇과 통신이 끊겼어요. 다시 실행해 볼까요?');
      return;
    }

    wgRobotBub('bot', '🤖 ' + wgEsc(parsed.performance || '삐빅… 무언가 했습니다.'));

    if (parsed.success) {
      _wgRobot.scene = String(parsed.scene || '');
      const s = wgLoad('robot', { clears: [] });
      if (!Array.isArray(s.clears)) s.clears = [];
      if (s.clears.indexOf(t.id) === -1) s.clears.push(t.id);
      wgSave('robot', s);
      wgAddInk(25, '(로봇 임무 성공!)');
      if (s.clears.length >= 3) wgAddBadge('로봇 조련사');
      wgFireworks();
      if (roundEl) roundEl.innerHTML = '🎉 <b>임무 성공!</b> 순서대로 빠짐없이 — 그게 좋은 설명문의 비밀이에요. (클리어 ' + s.clears.length + ' / ' + WG_ROBOT_TASKS.length + ')';
      const foot = document.getElementById('wgRobotFoot');
      if (foot) {
        foot.innerHTML =
          (typeof generateDalle === 'function'
            ? '<button class="wg-btn green" id="wgRobotDrawBtn" onclick="wgRobotDraw()">🎨 성공 장면 그리기 (선택)</button>'
            : '') +
          '<button class="wg-btn" onclick="wgStartRobot()">다른 임무!</button>' +
          '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>';
      }
      return;
    }

    wgRobotBub('sys', '🔧 로봇 정비사: 빠진 부품(단계)이 있어요 — <b>' + wgEsc(parsed.missing || '순서를 다시 살펴보세요') + '</b>');
    _wgRobot.round += 1;

    if (_wgRobot.round > 3) {
      wgRobotBub('bot', '🤖 삐빅… 오늘 임무는 종료. 필수 단계는 이거였어요!<br>' +
        t.critical.map(function (s, i) { return (i + 1) + '. ' + wgEsc(s); }).join('<br>') +
        '<br><span class="wg-note">순서 낱말(먼저→그다음→마지막으로)을 쓰면 빠뜨리기 어려워요.</span>');
      if (roundEl) roundEl.textContent = '라운드 종료 — 단계를 참고해서 처음부터 다시 도전해 봐요!';
      const foot = document.getElementById('wgRobotFoot');
      if (foot) {
        foot.innerHTML =
          '<button class="wg-btn" onclick="wgRobotBegin(' + _wgRobot.idx + ')">처음부터 다시!</button>' +
          '<button class="wg-btn gray" onclick="wgStartRobot()">임무 바꾸기</button>' +
          '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>';
      }
      return;
    }

    if (roundEl) roundEl.innerHTML = '라운드 ' + _wgRobot.round + ' / 3 — 지시문 <b>전체</b>를 고쳐 써서 다시 실행!';
  }
  window.wgRobotRun = wgRobotRun;

  /** 성공 장면 그리기 — 선택 사항(이미지 생성 비용 고려, 성공 시에만 노출) */
  async function wgRobotDraw() {
    if (_wgRobotBusy) return;
    const b = document.getElementById('wgRobotDrawBtn');
    if (typeof generateDalle !== 'function' || !_wgRobot.scene) {
      wgToast('지금은 그림을 그릴 수 없어요.');
      return;
    }
    _wgRobotBusy = true;
    if (b) { b.disabled = true; b.textContent = '🎨 그리는 중…'; }
    try {
      /* 시그니처가 프로젝트와 다르면 이 호출부만 조정하면 된다 */
      const url = await generateDalle(_wgRobot.scene + ', cute cartoon robot, bright colors, children book illustration', 8, function () {});
      if (url && typeof url === 'string') {
        wgRobotBub('bot', '🎨 임무 성공 기념 사진!<br><img src="' + wgEsc(url) + '" alt="robot scene">');
      } else {
        wgRobotBub('sys', '🎨 그림이 잘 안 그려졌어요. 대신 상상해 볼까요?');
      }
    } catch (e) {
      wgRobotBub('sys', '🎨 그림이 잘 안 그려졌어요. 대신 상상해 볼까요?');
    }
    _wgRobotBusy = false;
    if (b) { b.disabled = false; b.textContent = '🎨 성공 장면 그리기 (선택)'; }
  }
  window.wgRobotDraw = wgRobotDraw;

  /* ══════════════════════════════════════════════════════════
     10. 게임 ⑧ 비밀 단어 밀수꾼 [v3 신규 — 이음(일기) 결합형]
         오늘의 비밀 단어를 일기에 '자연스럽게' 숨기면
         AI 세관원이 의심 단어 3개를 고른다. 안 걸리면 성공!
         교육 목표: 문맥 일관성 — 낱말이 어울리는 맥락을 역설계
         · 하루 1단어(닉네임·날짜 시드 → 친구와 서로 다름)
         · 검사 기회 2번, 일기 60자 이상일 때만
     ══════════════════════════════════════════════════════════ */

  let _wgSmuggleBusy = false;

  function wgSmuggleState() {
    const s = wgLoad('smuggle', { date: '', secret: '', tries: 0, done: false, wins: 0 });
    if (s.date !== wgToday()) {
      s.date = wgToday();
      const aucWords = wgAuctionWords();   // 오늘 경매 단어와 겹치지 않게
      const pool = wgObjectPool().filter(function (w) { return aucWords.indexOf(w) === -1; });
      const picked = wgSeedPick(pool.length ? pool : WG_OBJECT_POOL, 1, 'smuggle-' + wgToday() + '-' + wgNick());
      s.secret = picked[0] || '지우개';
      s.tries = 0;
      s.done = false;
      wgSave('smuggle', s);
    }
    return s;
  }

  function wgStartSmuggle() {
    const s = wgSmuggleState();
    if (s.done) {
      wgOpenModal(
        '<h3>🕵️ 비밀 단어 밀수꾼</h3>' +
        '<p>오늘 임무는 끝났어요! 내일 새 비밀 단어가 도착해요 📦</p>' +
        '<p class="wg-note">지금까지 밀수 성공: ' + (s.wins || 0) + '번' + ((s.wins || 0) < 3 ? ' (3번이면 뱃지!)' : '') + '</p>' +
        '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
      );
      return;
    }
    wgOpenModal(
      '<h3>🕵️ 비밀 단어 밀수꾼</h3>' +
      '<p class="wg-note">오늘의 일기 속에 아래 단어를 <b>자연스럽게</b> 숨겨 쓰세요.<br>' +
      '일기가 <b>60자 이상</b>이면 세관 검사를 받을 수 있어요. AI 세관원이 "일부러 끼워 넣은 것 같은" 단어 3개를 고르는데, 거기에 <b>안 걸리면 성공</b>! (+15잉크 · 검사 기회 2번)</p>' +
      '<div class="wg-target">📦 ' + wgEsc(s.secret) + '</div>' +
      '<p class="wg-note">💡 비법: 단어가 갑자기 튀어나오면 들켜요. 앞뒤 문장이 그 단어를 자연스럽게 불러오게 만들어 보세요.</p>' +
      '<button class="wg-btn" onclick="wgSmuggleGo()">📖 일기 화면으로 가기</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
  }
  window.wgStartSmuggle = wgStartSmuggle;

  async function wgSmuggleGo() {
    wgCloseModal();
    await wgEnsureDiaryScreen();
    wgRenderDiaryBar();
    wgToast('일기 속에 몰래 심어 보세요 🤫 (미션 상자 아래에 임무 배너가 있어요)');
  }
  window.wgSmuggleGo = wgSmuggleGo;

  async function wgSmuggleCheck() {
    if (_wgSmuggleBusy) return;
    const s = wgSmuggleState();
    if (s.done) { wgToast('오늘 임무는 이미 끝났어요!'); return; }

    const text = wgDiaryText();
    if (text.length < 60) { wgToast('일기를 60자 이상 쓴 뒤에 검사해요! (지금 ' + text.length + '자)'); return; }
    if (wgNorm(text, true).indexOf(wgNorm(s.secret, true)) === -1) {
      wgToast('아직 비밀 단어 「' + s.secret + '」가 일기에 없어요!');
      return;
    }

    _wgSmuggleBusy = true;
    wgToast('🛃 세관 검사 중…');

    const parsed = wgParseJSON(await wgCallAI(
      '너는 눈썰미 좋은 세관원이야. 이 학생의 일기에는 게임 규칙에 따라 몰래 심어 넣은 낱말이 딱 1개 있어. 반드시 JSON만 출력해.',
      '일기:\n"' + text + '"\n\n' +
      '문맥상 가장 "일부러 끼워 넣은" 것처럼 어색한 낱말(명사) 후보를 정확히 3개 고르고, 첫 번째 후보를 고른 이유를 한 문장으로 써 줘.\n' +
      '출력: {"suspects":["낱말1","낱말2","낱말3"],"why":"한 문장"}',
      300, 0
    ));
    _wgSmuggleBusy = false;

    if (!parsed || !Array.isArray(parsed.suspects)) {
      wgToast('세관원이 잠깐 자리를 비웠어요. 다시 검사해 볼까요?');
      return;
    }

    const suspects = parsed.suspects.map(function (x) { return String(x || ''); }).filter(Boolean).slice(0, 3);
    const secretN = wgNorm(s.secret, true);
    const caught = suspects.some(function (sp) {
      const n = wgNorm(sp, true);
      return n && (n.indexOf(secretN) !== -1 || secretN.indexOf(n) !== -1);
    });

    if (!caught) {
      s.done = true;
      s.wins = (s.wins || 0) + 1;
      wgSave('smuggle', s);
      wgAddInk(15, '(밀수 성공!)');
      if (s.wins >= 3) wgAddBadge('슬쩍 넣기 달인');
      wgFireworks();
      wgOpenModal(
        '<h3>🎉 밀수 성공!</h3>' +
        '<p>「<b>' + wgEsc(s.secret) + '</b>」는 무사히 통과! 그만큼 자연스럽게 스며들었다는 뜻이에요.</p>' +
        '<p class="wg-note">🛃 세관원이 의심한 단어: ' + suspects.map(wgEsc).join(', ') + '</p>' +
        '<p class="wg-note">지금까지 성공 ' + s.wins + '번</p>' +
        '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
      );
    } else {
      s.tries = (s.tries || 0) + 1;
      if (s.tries >= 2) {
        s.done = true;
        wgSave('smuggle', s);
        wgOpenModal(
          '<h3>🚨 들켰다!</h3>' +
          '<p>세관원의 의심: ' + suspects.map(wgEsc).join(', ') + '</p>' +
          '<p class="wg-note">🛃 이유: ' + wgEsc(parsed.why || '') + '</p>' +
          '<p class="wg-note">💡 갑자기 튀어나온 낱말은 앞뒤 문장이 도와줘야 자연스러워요. 내일 새 단어로 설욕전!</p>' +
          '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
        );
      } else {
        wgSave('smuggle', s);
        wgOpenModal(
          '<h3>🚨 1차 검사에서 걸렸어요!</h3>' +
          '<p>세관원의 의심: ' + suspects.map(wgEsc).join(', ') + '</p>' +
          '<p class="wg-note">🛃 이유: ' + wgEsc(parsed.why || '') + '</p>' +
          '<p>문장을 다듬고 <b>한 번 더</b> 도전할 수 있어요! (기회 1번 남음)</p>' +
          '<button class="wg-btn" onclick="wgSmuggleGo()">✍️ 일기 다듬으러 가기</button>' +
          '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
        );
      }
    }
    wgRenderDiaryBar();
  }
  window.wgSmuggleCheck = wgSmuggleCheck;

  /* ══════════════════════════════════════════════════════════
     11. 게임 ⑨ 60초 말하기 스피드런 [v3 신규 — 이음(일기) 결합형]
         말로 먼저 60초 → 받아 적힌 초안을 일기장에 붙여
         입말을 글말로 다듬는다. 쓰기 부진 학생의 진입 장벽을
         낮추는 '말하기→쓰기' 다리. (Web Speech API, 크롬 권장)
     ══════════════════════════════════════════════════════════ */

  let _wgSpeed = { rec: null, running: false, finals: '', timer: null, left: 60 };

  function wgSpeedSR() {
    try { return window.SpeechRecognition || window.webkitSpeechRecognition || null; } catch (e) { return null; }
  }

  function wgStartSpeedrun() {
    if (!wgSpeedSR()) {
      wgToast('이 브라우저는 음성 인식을 지원하지 않아요 (크롬 추천!)');
      return;
    }
    const best = wgLoad('speed', { best: 0 }).best || 0;
    wgOpenModal(
      '<h3>🎤 60초 말하기 스피드런</h3>' +
      '<p class="wg-note">오늘 있었던 일을 <b>60초 동안 말로</b> 먼저 쏟아내요!<br>' +
      '끝나면 받아 적힌 글을 일기장에 붙이고, <b>입말을 글말로</b> 다듬으면 돼요.<br>' +
      '(하루 첫 완주 +10잉크' + (best ? ' · 최고 기록 ' + best + '자' : '') + ')</p>' +
      '<p class="wg-note">💡 마이크 사용을 허용해 주세요. 잠깐 말이 막혀도 괜찮아요!</p>' +
      '<button class="wg-btn" onclick="wgSpeedGo()">🎙️ 시작하기!</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
  }
  window.wgStartSpeedrun = wgStartSpeedrun;

  function wgSpeedGo() {
    const SR = wgSpeedSR();
    if (!SR) return;

    wgOpenModal(
      '<h3>🎤 말하는 중…</h3>' +
      '<div class="wg-timer" id="wgSpeedTimer">60</div>' +
      '<div class="wg-live" id="wgSpeedLive"><span style="color:#aaa">여기에 말이 받아 적혀요…</span></div>' +
      '<button class="wg-btn gray" onclick="wgSpeedStop()">⏹ 그만 말하기</button>'
    );

    const rec = new SR();
    rec.lang = 'ko-KR';
    rec.continuous = true;
    rec.interimResults = true;

    _wgSpeed = { rec: rec, running: true, finals: '', timer: null, left: 60 };

    rec.onresult = function (e) {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tr = e.results[i][0].transcript;
        if (e.results[i].isFinal) _wgSpeed.finals += tr + ' ';
        else interim += tr;
      }
      const live = document.getElementById('wgSpeedLive');
      if (live) {
        live.innerHTML = wgEsc(_wgSpeed.finals) + '<span style="color:#aaa">' + wgEsc(interim) + '</span>';
        live.scrollTop = live.scrollHeight;
      }
    };
    rec.onerror = function (e) {
      if (e && e.error === 'not-allowed') wgToast('마이크 사용을 허용해 주세요!');
    };
    rec.onend = function () {
      // 브라우저가 중간에 인식을 끊으면 자동 재시작
      if (_wgSpeed.running) { try { rec.start(); } catch (err) {} }
    };
    try { rec.start(); } catch (e) {}

    _wgSpeed.timer = setInterval(function () {
      _wgSpeed.left -= 1;
      const t = document.getElementById('wgSpeedTimer');
      if (t) t.textContent = _wgSpeed.left;
      if (_wgSpeed.left <= 0) wgSpeedStop();
    }, 1000);
  }
  window.wgSpeedGo = wgSpeedGo;

  function wgSpeedStop() {
    if (_wgSpeed.timer) { clearInterval(_wgSpeed.timer); _wgSpeed.timer = null; }
    _wgSpeed.running = false;
    try { if (_wgSpeed.rec) _wgSpeed.rec.stop(); } catch (e) {}

    const text = (_wgSpeed.finals || '').trim();
    if (!text) {
      wgOpenModal(
        '<h3>😅 아무 말도 안 들렸어요</h3>' +
        '<p class="wg-note">마이크가 켜져 있는지 확인하고 다시 도전해 볼까요?</p>' +
        '<button class="wg-btn" onclick="wgSpeedGo()">🎙️ 다시!</button>' +
        '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
      );
      return;
    }

    const s = wgLoad('speed', { date: '', got: false, best: 0 });
    if (s.date !== wgToday()) { s.date = wgToday(); s.got = false; }
    if (!s.got) { s.got = true; wgAddInk(10, '(스피드런 완주!)'); }
    if (text.length > (s.best || 0)) s.best = text.length;
    wgSave('speed', s);

    wgOpenModal(
      '<h3>📝 받아 적기 완료 — ' + text.length + '자!</h3>' +
      '<textarea class="wg-input" id="wgSpeedText" rows="6">' + wgEsc(text) + '</textarea>' +
      '<p class="wg-note">💡 말과 글은 달라요. 일기장에 붙인 뒤 <b>"음…", "그래서 막"</b> 같은 입말을 글답게 다듬어 보세요. 오감 빙고 칸도 함께 켜질 거예요!</p>' +
      '<button class="wg-btn" onclick="wgSpeedApply()">📖 일기장에 붙이기</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
  }
  window.wgSpeedStop = wgSpeedStop;

  async function wgSpeedApply() {
    const ta = document.getElementById('wgSpeedText');
    const t = ta ? ta.value.trim() : '';
    if (!t) return;
    wgCloseModal();
    await wgEnsureDiaryScreen();
    wgInsertDiary(t);
    wgToast('붙였어요! 이제 입말 → 글말로 다듬어 보세요 ✍️');
  }
  window.wgSpeedApply = wgSpeedApply;

  /* ══════════════════════════════════════════════════════════
     12. 게임 ⑦ 오늘의 낱말 경매 [v3 신규 — 돋움→이음 핸드오프]
         잉크로 낱말을 '입찰'해 낙찰받고, 오늘 일기에 자연스럽게
         모두 쓰면 원금 전액 + 보너스 40💧를 돌려받는다.
         → '쌓기만 하는 보상'을 '걸고 쓰는 투자'로 전환.
         · 단어 6개(구체어 4 + 추상어 2)는 날짜 시드로 하루 고정
         · AI 입찰가는 30~90💧 사이 비밀값(단어별 시드 고정)
         · 단어마다 입찰 기회 1번, 최대 3개 낙찰
         · 원금 반환은 상한 미적용(반환), 보너스만 상한 적용
     ══════════════════════════════════════════════════════════ */

  const WG_AUC_MAX_WIN = 3;
  let _wgAucBusy = false;

  function wgAuctionWords() {
    const a = wgSeedPick(wgObjectPool(), 4, 'auc-a-' + wgToday());
    const b = wgSeedPick(wgAbstractPool(), 2, 'auc-b-' + wgToday());
    return a.concat(b);
  }

  function wgAucPrice(word) {
    return 30 + Math.floor(wgSeedRand('price-' + wgToday() + '-' + word)() * 61);   // 30~90
  }

  function wgAucState() {
    const s = wgLoad('auction', { date: '', items: [], lost: [], refunded: false });
    if (s.date !== wgToday()) {
      s.date = wgToday(); s.items = []; s.lost = []; s.refunded = false;
      wgSave('auction', s);
    }
    if (!Array.isArray(s.items)) s.items = [];
    if (!Array.isArray(s.lost)) s.lost = [];
    return s;
  }

  async function wgOpenAuction() {
    if (typeof spendInk !== 'function' || typeof addInk !== 'function') {
      wgToast('잉크 시스템을 찾지 못해 경매장을 열 수 없어요.');
      return;
    }
    wgAucRender(await wgGetInk());
  }
  window.wgOpenAuction = wgOpenAuction;

  function wgAucRender(balance) {
    const s = wgAucState();
    const words = wgAuctionWords();
    const rows = words.map(function (w, i) {
      const won = s.items.filter(function (it) { return it.word === w; })[0];
      const lost = s.lost.indexOf(w) !== -1;
      if (won) {
        return '<div class="wg-sentence">🏆 「' + wgEsc(w) + '」 — <b>낙찰!</b> (' + won.paid + '💧)</div>';
      }
      if (lost) {
        return '<div class="wg-sentence" style="opacity:.55">❌ 「' + wgEsc(w) + '」 — 유찰 (AI 입찰가는 ' + wgAucPrice(w) + '💧였어요)</div>';
      }
      if (s.items.length >= WG_AUC_MAX_WIN) {
        return '<div class="wg-sentence" style="opacity:.55">🔒 「' + wgEsc(w) + '」 — 오늘은 3개까지만 낙찰!</div>';
      }
      return '<div class="wg-sentence">「<b>' + wgEsc(w) + '</b>」 ' +
        '<input class="wg-input" style="width:90px;display:inline-block;margin:0 6px;" type="number" min="1" id="wgBid_' + i + '" placeholder="입찰가"> ' +
        '<button class="wg-btn" style="padding:8px 12px;" onclick="wgBid(' + i + ')">🔨 입찰!</button></div>';
    }).join('');

    wgOpenModal(
      '<h3>🔨 오늘의 낱말 경매</h3>' +
      '<p class="wg-note">보유 잉크: <b>' + balance + '💧</b> · AI의 비밀 입찰가(30~90💧)보다 높게 부르면 낙찰!<br>' +
      '단어마다 기회 1번 · 최대 ' + WG_AUC_MAX_WIN + '개 · 낙찰 단어를 <b>오늘 일기에 자연스럽게 모두</b> 쓰면 <b>원금 전액 + 보너스 40💧</b> 환급!</p>' +
      rows +
      (s.items.length
        ? '<p class="wg-note">💡 낙찰 낱말 칩은 그림일기 화면(미션 상자 아래)에 떠 있어요. 칩을 누르면 일기에 쏙!</p>' +
          '<button class="wg-btn green" onclick="wgAucGoDiary()">📖 일기 쓰러 가기</button>'
        : '') +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>',
      true
    );
  }

  async function wgAucGoDiary() {
    wgCloseModal();
    await wgEnsureDiaryScreen();
    wgRenderDiaryBar();
  }
  window.wgAucGoDiary = wgAucGoDiary;

  async function wgBid(i) {
    if (_wgAucBusy) return;
    const s = wgAucState();
    const words = wgAuctionWords();
    const w = words[i];
    if (!w) return;
    if (s.items.length >= WG_AUC_MAX_WIN) { wgToast('오늘은 3개까지만 낙찰할 수 있어요!'); return; }
    if (s.lost.indexOf(w) !== -1 || s.items.some(function (it) { return it.word === w; })) return;

    const inp = document.getElementById('wgBid_' + i);
    const bid = parseInt(inp ? inp.value : '', 10);
    if (!bid || bid < 1) { wgToast('입찰가를 숫자로 써 주세요!'); return; }

    _wgAucBusy = true;
    const rival = wgAucPrice(w);
    if (bid < rival) {
      s.lost.push(w);
      wgSave('auction', s);
      wgToast('유찰! AI는 ' + rival + '💧를 불렀어요. 다음 단어로 도전!');
    } else {
      const ok = await wgTrySpendInk(bid);
      if (!ok) {
        _wgAucBusy = false;
        wgToast('잉크가 부족해요! (필요: ' + bid + '💧)');
        return;
      }
      s.items.push({ word: w, paid: bid });
      wgSave('auction', s);
      wgToast('🏆 「' + w + '」 낙찰! (' + bid + '💧)');
      wgPetSay('오늘 일기에 「' + w + '」를 자연스럽게 녹여 보자! 다 쓰면 원금+보너스야 💧');
    }
    _wgAucBusy = false;
    wgAucRender(await wgGetInk());
    wgRenderDiaryBar();
  }
  window.wgBid = wgBid;

  async function wgAuctionCheck() {
    if (_wgAucBusy) return;
    const s = wgAucState();
    if (!s.items.length || s.refunded) return;

    const text = wgDiaryText();
    if (text.length < 60) { wgToast('일기를 60자 이상 쓴 뒤에 정산해요! (지금 ' + text.length + '자)'); return; }

    const textN = wgNorm(text, true);
    const missing = s.items.filter(function (it) { return textN.indexOf(wgNorm(it.word, true)) === -1; });
    if (missing.length) {
      wgToast('아직 안 쓴 낱말: ' + missing.map(function (m) { return '「' + m.word + '」'; }).join(' '));
      return;
    }

    _wgAucBusy = true;
    wgToast('🧾 정산 심사 중…');

    const wordList = s.items.map(function (it) { return it.word; }).join(', ');
    const parsed = wgParseJSON(await wgCallAI(
      '너는 낱말 활용 게임의 심판이야. 낱말이 일부러 끼워 넣은 티 없이 문맥에 자연스럽게 쓰였는지 판정해. 반드시 JSON만 출력해.',
      '일기:\n"' + text + '"\n\n확인할 낱말: ' + wordList + '\n\n' +
      '모든 낱말이 문맥에 자연스럽게 녹아 있으면 natural은 true.\n' +
      '아니라면 가장 어색한 낱말 1개를 awkward에, 자연스럽게 고칠 팁을 tip에 한 문장으로.\n' +
      '출력: {"natural": true 또는 false, "awkward": "", "tip": ""}',
      280, 0
    ));
    _wgAucBusy = false;

    if (!parsed || typeof parsed.natural !== 'boolean') {
      wgToast('심판이 잠깐 자리를 비웠어요. 다시 정산해 볼까요?');
      return;
    }

    if (!parsed.natural) {
      wgOpenModal(
        '<h3>🧾 조금만 더!</h3>' +
        '<p>「<b>' + wgEsc(parsed.awkward || '') + '</b>」가 살짝 튀어 보인대요.</p>' +
        '<p class="wg-note">💡 ' + wgEsc(parsed.tip || '앞뒤 문장이 그 낱말을 자연스럽게 불러오게 다듬어 보세요.') + '</p>' +
        '<button class="wg-btn" onclick="wgAucGoDiary()">✍️ 다듬으러 가기</button>' +
        '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
      );
      return;
    }

    const paidTotal = s.items.reduce(function (sum, it) { return sum + (it.paid || 0); }, 0);
    s.refunded = true;
    wgSave('auction', s);
    await wgRefundInk(paidTotal);                     // 원금 반환 (상한 미적용)
    wgAddInk(40, '(경매 보너스!)');                    // 보너스 (일일 상한 적용)
    wgFireworks();
    wgOpenModal(
      '<h3>💰 정산 완료!</h3>' +
      '<p>낙찰 낱말 ' + s.items.length + '개를 모두 자연스럽게 썼어요.<br>' +
      '<b>원금 ' + paidTotal + '💧</b> + <b>보너스 40💧</b>가 돌아왔습니다!</p>' +
      '<p class="wg-note">💡 좋은 낱말은 사 두면 글에서 몇 배로 돌아와요 — 진짜 투자처럼요!</p>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
    wgRenderDiaryBar();
  }
  window.wgAuctionCheck = wgAuctionCheck;

  function wgAucChip(i) {
    const s = wgAucState();
    const it = s.items[i];
    if (it) wgInsertDiary(it.word);
  }
  window.wgAucChip = wgAucChip;

  /* ══════════════════════════════════════════════════════════
     13. 게임 ⑩ 진실 둘, 거짓 하나 [v3 신규 — 이음(또래) 계열]
         진짜 2 + 그럴듯한 거짓 1 → AI 탐정 또는 친구가 추리.
         안 들키려면 디테일이 필요 → 구체적 묘사를 자연스럽게 강제.
         '상상력 탐정' 프레임: 지어내기는 게임 규칙임을 명시.
         · 친구 모드는 같은 기기(localStorage) 공유 — 교실 공용
           컴퓨터 시나리오 전용, 한계는 화면에 안내
     ══════════════════════════════════════════════════════════ */

  const WG_TRUTH_SHARED_KEY = 'mdj_wg_truth_shared';   // 기기 공유(닉네임 구분 없음)
  let _wgTruthBusy = false;
  let _wgTruthList = [];

  function wgTruthLoadShared() {
    try {
      const raw = localStorage.getItem(WG_TRUTH_SHARED_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function wgTruthSaveShared(list) {
    try { localStorage.setItem(WG_TRUTH_SHARED_KEY, JSON.stringify(list.slice(-30))); } catch (e) {}
  }

  function wgStartTruth() {
    wgOpenModal(
      '<h3>🎭 진실 둘, 거짓 하나</h3>' +
      '<p class="wg-note">오늘 있었던 진짜 일 <b>2개</b> + 그럴듯하게 <b>지어낸 일 1개</b>를 쓰세요.<br>' +
      '지어내기는 이 게임의 규칙이에요 — 상상력 탐정 놀이! 들키지 않으려면 <b>구체적인 디테일</b>이 필요해요.</p>' +
      '<button class="wg-menu-btn" onclick="wgTruthMode(\'ai\')">🤖 AI 탐정에게 도전 <span class="wg-note">— AI가 못 맞히면 +15잉크</span></button>' +
      '<button class="wg-menu-btn" onclick="wgTruthMode(\'friends\')">👥 친구들과 (같은 기기) <span class="wg-note">— 문제 올리고 투표하기</span></button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
  }
  window.wgStartTruth = wgStartTruth;

  function wgTruthMode(m) {
    if (m === 'friends') { wgTruthFriends(); return; }
    wgOpenModal(
      '<h3>🤖 AI 탐정에게 도전</h3>' +
      '<p class="wg-note">각 문장을 8자 이상, 최대한 진짜처럼! (몇 시에, 누구랑, 어디서 같은 디테일이 무기예요)</p>' +
      '<input class="wg-input" id="wgTr1" placeholder="1번 이야기">' +
      '<input class="wg-input" id="wgTr2" placeholder="2번 이야기">' +
      '<input class="wg-input" id="wgTr3" placeholder="3번 이야기">' +
      '<p class="wg-note">이 중 <b>거짓</b>은? ' +
      '<select id="wgTrLie" class="wg-input" style="width:auto;display:inline-block;">' +
      '<option value="1">1번</option><option value="2">2번</option><option value="3">3번</option>' +
      '</select></p>' +
      '<div id="wgTrMsg" class="wg-note"></div>' +
      '<button class="wg-btn" id="wgTrBtn" onclick="wgTruthAskAI()">🕵️ 탐정 소환!</button>' +
      '<button class="wg-btn gray" onclick="wgStartTruth()">뒤로</button>'
    );
  }
  window.wgTruthMode = wgTruthMode;

  async function wgTruthAskAI() {
    if (_wgTruthBusy) return;
    const g = function (id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const a = g('wgTr1'), b = g('wgTr2'), c = g('wgTr3');
    const msgEl = document.getElementById('wgTrMsg');
    const btn = document.getElementById('wgTrBtn');
    const lieSel = document.getElementById('wgTrLie');
    const myLie = lieSel ? parseInt(lieSel.value, 10) : 0;

    if (a.length < 8 || b.length < 8 || c.length < 8) {
      if (msgEl) msgEl.textContent = '세 문장 모두 8자 이상으로 써 주세요!';
      return;
    }
    if (!wgClean(a + b + c)) {
      if (msgEl) msgEl.textContent = '고운 말로 써 주세요!';
      return;
    }

    _wgTruthBusy = true;
    if (btn) { btn.disabled = true; btn.textContent = '탐정이 추리 중…'; }

    const parsed = wgParseJSON(await wgCallAI(
      '너는 "진실 둘 거짓 하나" 게임의 명탐정이야. 반드시 JSON만 출력해.',
      '초등학생이 말한 세 가지:\n1. ' + a + '\n2. ' + b + '\n3. ' + c + '\n\n' +
      '이 중 지어낸 거짓은 몇 번일까? 고른 이유와, 단서가 된 표현도 알려줘.\n' +
      '출력: {"lie": 1 또는 2 또는 3, "reason": "고른 이유 한 문장", "clue": "단서가 된 표현"}',
      300, 0
    ));
    _wgTruthBusy = false;
    if (btn) { btn.disabled = false; btn.textContent = '🕵️ 탐정 소환!'; }

    if (!parsed || [1, 2, 3].indexOf(parsed.lie) === -1) {
      if (msgEl) msgEl.textContent = '탐정이 잠깐 자리를 비웠어요. 다시 소환해 볼까요?';
      return;
    }

    if (parsed.lie === myLie) {
      wgOpenModal(
        '<h3>🕵️ AI 탐정이 맞혔어요!</h3>' +
        '<p>AI의 추리: <b>' + parsed.lie + '번</b>이 거짓!</p>' +
        '<p class="wg-note">🔍 이유: ' + wgEsc(parsed.reason || '') + '</p>' +
        '<p class="wg-note">💡 들킨 이유를 보면 어떤 <b>디테일</b>이 부족했는지 보여요. 진짜 같은 이야기에는 구체적인 장면이 필요하답니다!</p>' +
        '<button class="wg-btn" onclick="wgTruthMode(\'ai\')">설욕전!</button>' +
        '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
      );
    } else {
      const s = wgLoad('truth', { wins: 0 });
      s.wins = (s.wins || 0) + 1;
      wgSave('truth', s);
      wgAddInk(15, '(AI 탐정을 속였다!)');
      if (s.wins >= 3) wgAddBadge('진실 탐정');
      wgFireworks();
      wgOpenModal(
        '<h3>🎉 AI 탐정을 속였다!</h3>' +
        '<p>AI는 <b>' + parsed.lie + '번</b>을 골랐지만, 진짜 거짓은 <b>' + myLie + '번</b>!</p>' +
        '<p class="wg-note">🔍 AI가 헷갈린 이유: ' + wgEsc(parsed.reason || '') + '</p>' +
        '<p class="wg-note">네 거짓 이야기가 그만큼 그럴듯했다는 뜻 — 디테일의 승리예요! (성공 ' + s.wins + '번)</p>' +
        '<button class="wg-btn" onclick="wgTruthMode(\'ai\')">한 번 더!</button>' +
        '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
      );
    }
  }
  window.wgTruthAskAI = wgTruthAskAI;

  function wgTruthFriends() {
    const list = wgTruthLoadShared();
    // 옵션1: 모든 문제를 퀴즈로 표시 (기기를 돌려가며 푸는 방식)
    _wgTruthList = list.slice();

    const cards = _wgTruthList.length
      ? _wgTruthList.map(function (p, pi) {
          const myVote = p.votes ? p.votes[wgNick()] : undefined;
          const voted = (typeof myVote === 'number');
          const isMine = (p.nick === wgNick());
          const stHtml = p.st.map(function (stmt, k) {
            let cls = 'wg-vote';
            if (voted) {
              if (k + 1 === p.lie) cls += ' correct';
              else if (k + 1 === myVote) cls += ' wrong';
            }
            const tally = p.votes
              ? Object.keys(p.votes).filter(function (n) { return p.votes[n] === k + 1; }).length
              : 0;
            return '<button class="' + cls + '" ' +
              (voted ? 'disabled' : 'onclick="wgTruthVote(' + pi + ',' + (k + 1) + ')"') + '>' +
              (k + 1) + '. ' + wgEsc(stmt) +
              (voted ? ' <span class="wg-note">(' + tally + '표' + (k + 1 === p.lie ? ' · 정답!' : '') + ')</span>' : '') +
              '</button>';
          }).join('');
          const totalVotes = p.votes ? Object.keys(p.votes).length : 0;
          return '<div class="wg-sentence"><b>' + wgEsc(p.nick) + '</b>의 문제 — 거짓은 몇 번?' +
            (isMine ? ' <span class="wg-note">(내가 낸 문제 · 총 ' + totalVotes + '명 도전)</span>' : '') +
            '<br>' + stHtml +
            (voted ? '<div class="wg-note">' + (myVote === p.lie ? '🎉 명탐정! 맞혔어요' : '😅 아쉽! 정답은 ' + p.lie + '번') + '</div>' : '') +
            '</div>';
        }).join('')
      : '<p class="wg-note">아직 낸 문제가 없어요. 위에서 첫 문제를 올려 볼까요? 👆</p>';

    wgOpenModal(
      '<h3>👥 진실 둘, 거짓 하나 — 친구들과</h3>' +
      '<p class="wg-note">📝 내 문제 올리기 (한 사람당 1문제, 새로 올리면 교체돼요)</p>' +
      '<input class="wg-input" id="wgTf1" placeholder="1번 이야기">' +
      '<input class="wg-input" id="wgTf2" placeholder="2번 이야기">' +
      '<input class="wg-input" id="wgTf3" placeholder="3번 이야기">' +
      '<p class="wg-note">거짓은? <select id="wgTfLie" class="wg-input" style="width:auto;display:inline-block;">' +
      '<option value="1">1번</option><option value="2">2번</option><option value="3">3번</option></select> ' +
      '<button class="wg-btn" style="padding:8px 12px;" onclick="wgTruthPost()">올리기</button></p>' +
      '<hr style="border:none;border-top:1px solid #eee;margin:12px 0;">' +
      '<p class="wg-note">🕵️ 아래 문제의 거짓을 맞혀 보세요! (기기를 다음 친구에게 넘겨 풀게 해도 좋아요)</p>' +
      cards +
      '<p class="wg-note">※ 같은 기기(교실 공용 컴퓨터)에서 서로의 문제가 쌓여요.</p>' +
      '<button class="wg-btn gray" onclick="wgStartTruth()">뒤로</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>',
      true
    );
  }

  function wgTruthPost() {
    const g = function (id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const a = g('wgTf1'), b = g('wgTf2'), c = g('wgTf3');
    const lieSel = document.getElementById('wgTfLie');
    const lie = lieSel ? parseInt(lieSel.value, 10) : 0;
    if (a.length < 8 || b.length < 8 || c.length < 8) { wgToast('세 문장 모두 8자 이상으로!'); return; }
    if (!wgClean(a + b + c)) { wgToast('고운 말로 써 주세요!'); return; }

    // 기기 돌려쓰기: 항상 새 문제로 추가(교체 아님) + 고유 id 부여
    const list = wgTruthLoadShared();
    const id = 'q' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    list.push({ id: id, nick: wgNick(), date: wgToday(), st: [a, b, c], lie: lie, votes: {} });
    wgTruthSaveShared(list);
    wgToast('문제를 올렸어요! 이제 아래에서 풀 수 있어요 🕵️');
    wgTruthFriends();
  }
  window.wgTruthPost = wgTruthPost;

  function wgTruthVote(pi, choice) {
    const target = _wgTruthList[pi];
    if (!target) return;
    const list = wgTruthLoadShared();
    // 고유 id로 매칭 (구 데이터엔 id가 없으므로 nick+date로 폴백)
    const p = list.filter(function (x) {
      return target.id ? (x.id === target.id) : (x.nick === target.nick && x.date === target.date);
    })[0];
    if (!p) return;
    if (!p.votes) p.votes = {};
    if (typeof p.votes[wgNick()] === 'number') { wgToast('이미 투표했어요!'); return; }
    p.votes[wgNick()] = choice;
    wgTruthSaveShared(list);
    // 자기가 낸 문제는 정답을 이미 알고 있으므로 잉크를 주지 않음 (악용 방지)
    const isMine = (p.nick === wgNick());
    if (choice === p.lie && !isMine) {
      wgAddInk(5, '(명탐정!)');
    } else if (choice === p.lie && isMine) {
      wgToast('내가 낸 문제라 잉크는 없지만, 정답이에요! 😊');
    }
    wgTruthFriends();
  }
  window.wgTruthVote = wgTruthVote;

  /* ══════════════════════════════════════════════════════════
     13.5 게임 ⑬ 상상력 온도 다이얼 [v4 신규 — 돋움(표현 훈련) 계열]
         AI의 'temperature(창의성 조절)' 원리를 눈에 보이는 다이얼로.
         같은 문장 시작을 ❄️차갑게(뻔하게) / 🔥뜨겁게(참신하게) 두 번
         이어 써서, 상투적 표현을 '알고' 벗어나는 발산적 사고 훈련.
         [6국03-04] 창의적 표현 · 상투성 탈피와 연결.
         · AI는 각 버전의 '예상 가능도'를 0~100°로 판정(temperature 0)
         · 두 버전의 온도 차가 클수록(둘 다 잘 구사) 보너스
         · 판정 점수는 다소 흔들릴 수 있어 '방향(차/뜨)'에 무게를 둠
     ══════════════════════════════════════════════════════════ */

  const WG_TEMP_STARTERS = [
    '학교 가는 길에 갑자기',
    '교실 문을 열었더니',
    '내 짝꿍이 오늘따라',
    '급식 시간에 국을 뜨는데',
    '운동장에 나갔더니 하늘에서',
    '가방을 열어 보니 그 안에',
    '집에 돌아와 냉장고를 열자',
    '창밖을 봤더니 놀랍게도',
    '친구가 내 귀에 대고 속삭였다,',
    '체육 시간에 공을 찼는데 그 공이',
    '아침에 눈을 뜨자 내 방이',
    '할머니 댁에 갔더니 마당에',
    '길에서 주운 상자를 열었더니',
    '수업 중에 갑자기 창문으로',
    '내가 기르는 강아지가 오늘',
    '도서관에서 책을 펼쳤더니 글자가',
    '엘리베이터 문이 열리자',
    '숙제를 하려고 연필을 들었는데',
    '놀이터 미끄럼틀을 타고 내려오니',
    '비가 그친 뒤 웅덩이를 들여다보니'
  ];

  let _wgTemp = { starter: '', phase: 'cold', cold: '', hot: '' };
  let _wgTempBusy = false;

  function wgStartTemp() {
    const starter = WG_TEMP_STARTERS[Math.floor(Math.random() * WG_TEMP_STARTERS.length)];
    _wgTemp = { starter: starter, phase: 'cold', cold: '', hot: '' };
    wgTempRenderCold('');
  }
  window.wgStartTemp = wgStartTemp;

  /** 온도 게이지 SVG (0~100°) */
  function wgTempGauge(deg) {
    const d = Math.max(0, Math.min(100, deg));
    const pct = d / 100;
    // 색: 낮으면 파랑, 높으면 빨강
    const hue = Math.round(210 - pct * 210);   // 210(파랑)→0(빨강)
    return '<div style="margin:8px 0;">' +
      '<div style="height:16px;border-radius:10px;background:linear-gradient(90deg,#4a90e2,#7ed6a5,#ffd166,#ff6b6b);position:relative;">' +
        '<div style="position:absolute;top:-4px;left:calc(' + d + '% - 3px);width:6px;height:24px;background:#333;border-radius:3px;"></div>' +
      '</div>' +
      '<div style="text-align:center;font-weight:800;font-size:18px;color:hsl(' + hue + ',70%,45%);margin-top:4px;">' + d + '°</div>' +
    '</div>';
  }

  function wgTempRenderCold(msg) {
    wgOpenModal(
      '<h3>🌡️ 상상력 온도 다이얼</h3>' +
      '<p class="wg-note">AI는 "온도"로 글의 상상력을 조절해요. 낮으면 뻔하게, 높으면 엉뚱하게!<br>같은 문장을 <b>두 가지 온도</b>로 이어 써 볼까요?</p>' +
      '<div class="wg-target" style="font-size:17px;">' + wgEsc(_wgTemp.starter) + ' …</div>' +
      '<p class="wg-note">❄️ <b>1단계 — 차가운 버전</b><br>누구나 예상할 만한, <b>가장 뻔한</b> 다음 이야기를 이어 써 보세요. (일부러 평범하게!)</p>' +
      '<input class="wg-input" id="wgTempInput" placeholder="예) 비가 내리기 시작했다">' +
      '<div id="wgTempMsg" class="wg-note">' + wgEsc(msg || '') + '</div>' +
      '<button class="wg-btn" id="wgTempBtn" onclick="wgTempSubmitCold()">❄️ 차가운 버전 완성!</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
    const inp = document.getElementById('wgTempInput');
    if (inp) { inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') wgTempSubmitCold(); }); inp.focus(); }
  }

  function wgTempSubmitCold() {
    const inp = document.getElementById('wgTempInput');
    const msg = document.getElementById('wgTempMsg');
    const v = inp ? inp.value.trim() : '';
    if (v.length < 4) { if (msg) msg.textContent = '조금만 더 써 볼까요? (4자 이상)'; return; }
    if (!wgClean(v)) { if (msg) msg.textContent = '고운 말로 써 주세요!'; return; }
    _wgTemp.cold = v;
    _wgTemp.phase = 'hot';
    wgTempRenderHot('');
  }
  window.wgTempSubmitCold = wgTempSubmitCold;

  function wgTempRenderHot(msg) {
    wgOpenModal(
      '<h3>🌡️ 상상력 온도 다이얼</h3>' +
      '<div class="wg-target" style="font-size:17px;">' + wgEsc(_wgTemp.starter) + ' …</div>' +
      '<div class="wg-sentence" style="background:#eef6ff;">❄️ 차가운 버전: ' + wgEsc(_wgTemp.cold) + '</div>' +
      '<p class="wg-note">🔥 <b>2단계 — 뜨거운 버전</b><br>이번엔 <b>아무도 예상 못 할</b> 엉뚱하고 놀라운 전개로 이어 써 보세요! (마음껏 상상!)</p>' +
      '<input class="wg-input" id="wgTempInput" placeholder="예) 하늘에서 알록달록한 우산이 쏟아졌다">' +
      '<div id="wgTempMsg" class="wg-note">' + wgEsc(msg || '') + '</div>' +
      '<button class="wg-btn green" id="wgTempBtn" onclick="wgTempSubmitHot()">🔥 뜨거운 버전 완성!</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
    const inp = document.getElementById('wgTempInput');
    if (inp) { inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') wgTempSubmitHot(); }); inp.focus(); }
  }

  async function wgTempSubmitHot() {
    if (_wgTempBusy) return;
    const inp = document.getElementById('wgTempInput');
    const msg = document.getElementById('wgTempMsg');
    const btn = document.getElementById('wgTempBtn');
    const v = inp ? inp.value.trim() : '';
    if (v.length < 4) { if (msg) msg.textContent = '조금만 더 써 볼까요? (4자 이상)'; return; }
    if (!wgClean(v)) { if (msg) msg.textContent = '고운 말로 써 주세요!'; return; }
    _wgTemp.hot = v;

    _wgTempBusy = true;
    if (btn) { btn.disabled = true; btn.textContent = '🌡️ 온도 측정 중…'; }

    // AI가 두 버전의 '예상 가능도'를 0~100°로 판정 (temperature 0 → 재현성)
    const parsed = wgParseJSON(await wgCallAI(
      '너는 문장의 "예상 가능도"를 재는 온도계야. 뻔하고 예측되는 전개일수록 낮은 온도(0에 가까움), 참신하고 놀라운 전개일수록 높은 온도(100에 가까움)를 매겨. 반드시 JSON만 출력해.',
      '문장 시작: "' + _wgTemp.starter + ' …"\n\n' +
      'A안(차갑게 쓴 것): "' + _wgTemp.cold + '"\n' +
      'B안(뜨겁게 쓴 것): "' + _wgTemp.hot + '"\n\n' +
      '각 안이 문장 시작 뒤에 얼마나 예상 가능한지/참신한지를 0~100도로 매겨 줘.\n' +
      '- coldDeg: A안의 온도 (뻔할수록 낮게)\n' +
      '- hotDeg: B안의 온도 (참신할수록 높게)\n' +
      '- comment: 초등학생 눈높이로, 두 버전의 차이를 칭찬하는 한 문장\n' +
      '출력: {"coldDeg": 숫자, "hotDeg": 숫자, "comment": "한 문장"}',
      300, 0
    ));
    _wgTempBusy = false;

    let coldDeg, hotDeg, comment;
    if (parsed && typeof parsed.coldDeg === 'number' && typeof parsed.hotDeg === 'number') {
      coldDeg = Math.max(0, Math.min(100, Math.round(parsed.coldDeg)));
      hotDeg = Math.max(0, Math.min(100, Math.round(parsed.hotDeg)));
      comment = parsed.comment || '';
    } else {
      // AI 실패 시 폴백: 길이·감탄부호 등 간단 휴리스틱
      coldDeg = 30; hotDeg = 70;
      comment = '두 가지 온도로 잘 써 봤어요!';
    }

    const diff = hotDeg - coldDeg;   // 차가/뜨거 방향을 잘 구사했는가
    let reward, verdict;
    if (diff >= 40) {
      reward = 25; verdict = '🎉 완벽한 온도 조절! 뻔함과 참신함을 자유자재로 오갔어요!';
    } else if (diff >= 15) {
      reward = 15; verdict = '👍 좋아요! 두 버전의 온도 차이가 느껴져요.';
    } else if (diff > 0) {
      reward = 8; verdict = '🙂 방향은 맞아요! 뜨거운 버전을 조금 더 과감하게 상상해 볼까요?';
    } else {
      reward = 5; verdict = '💡 두 버전이 비슷한 온도네요. 차가운 건 더 평범하게, 뜨거운 건 더 엉뚱하게!';
    }

    const s = wgLoad('temp', { plays: 0, bestDiff: 0 });
    s.plays = (s.plays || 0) + 1;
    if (diff > (s.bestDiff || 0)) s.bestDiff = diff;
    wgSave('temp', s);
    wgAddInk(reward, '(온도 조절!)');
    if (s.plays >= 5) wgAddBadge('상상력 온도조절사');
    if (diff >= 40) wgFireworks();

    wgOpenModal(
      '<h3>🌡️ 온도 측정 결과!</h3>' +
      '<div class="wg-sentence" style="background:#eef6ff;">❄️ ' + wgEsc(_wgTemp.cold) + '</div>' +
      wgTempGauge(coldDeg) +
      '<div class="wg-sentence" style="background:#fff0ee;">🔥 ' + wgEsc(_wgTemp.hot) + '</div>' +
      wgTempGauge(hotDeg) +
      '<p style="text-align:center;font-weight:700;">온도 차이: ' + diff + '° · 잉크 +' + reward + '</p>' +
      '<p class="wg-note">' + wgEsc(verdict) + '</p>' +
      (comment ? '<p class="wg-note">🤖 온도계의 한마디: ' + wgEsc(comment) + '</p>' : '') +
      '<p class="wg-note">💡 좋은 이야기는 온도를 마음대로 조절해요 — 뻔하게 안심시키다가, 확 놀라게!' +
      (s.plays < 5 ? ' (5번 하면 뱃지!)' : '') + '</p>' +
      '<button class="wg-btn" onclick="wgStartTemp()">새 문장으로 또!</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
  }
  window.wgTempSubmitHot = wgTempSubmitHot;


  /* ══════════════════════════════════════════════════════════
     14. 게임 ⑫ 기자 검증 게임 [v3 신규 — 지음(출판) 관문]
         내가 쓴 독서 신문 기사를 문장 카드로 나눠
         사실/의견을 가려낸다. [6국02-04]·[6국06-02] 대응.
         진입: 감상문 출판 화면의 기사 편집기 옆 버튼
         (rvAiAssistNews 완료 후 버튼이 반짝여 자연스럽게 유도)
     ══════════════════════════════════════════════════════════ */

  let _wgDet = null;
  let _wgDetBusy = false;

  function wgInjectDetectiveBtn() {
    const ta = wg$('rvNewsBody');
    if (!ta || document.getElementById('wgDetBtn')) return;
    const b = document.createElement('button');
    b.id = 'wgDetBtn';
    b.className = 'wg-btn';
    b.type = 'button';
    b.textContent = '🔍 기자 검증 게임 — 사실/의견 가려내기';
    b.addEventListener('click', wgStartDetective);
    ta.insertAdjacentElement('afterend', b);
  }

  /** AI 기사 도우미가 끝나면 검증 버튼이 잠시 반짝이도록 래핑 */
  function wgPatchRvNews() {
    if (window._wgRvPatched) return;
    if (typeof window.rvAiAssistNews === 'function') {
      const _orig = window.rvAiAssistNews;
      window.rvAiAssistNews = async function () {
        const r = await _orig.apply(this, arguments);
        try {
          const b = document.getElementById('wgDetBtn');
          if (b) {
            b.classList.add('wg-pulse');
            setTimeout(function () { b.classList.remove('wg-pulse'); }, 9000);
          }
        } catch (e) {}
        return r;
      };
      window._wgRvPatched = true;
    }
  }

  async function wgStartDetective() {
    if (_wgDetBusy) return;
    const ta = wg$('rvNewsBody');
    const body = ta ? ta.value.trim() : '';
    if (body.length < 60) {
      wgToast('기사 본문을 먼저 완성해요! (지음 → 감상문 출판 → 신문 기사)');
      return;
    }

    _wgDetBusy = true;
    wgOpenModal('<h3>🔍 기자 검증 게임</h3><p>기사를 문장 카드로 만드는 중… 🗂️</p>');

    const parsed = wgParseJSON(await wgCallAI(
      '너는 초등 미디어 리터러시 게임의 출제자야. 반드시 JSON만 출력해.',
      '아래 독서 신문 기사를 문장 단위로 나누고, 각 문장이 "사실"(책·영화 속 내용이나 실제 정보를 그대로 전한 문장)인지 "의견"(글쓴이의 생각·느낌·평가·권유)인지 분류해 줘.\n' +
      '- 최대 8문장, 5자 미만의 짧은 조각은 제외\n' +
      '- k 값은 "fact" 또는 "opinion"만 사용\n\n' +
      '기사:\n"' + body + '"\n\n' +
      '출력: {"cards":[{"t":"문장","k":"fact"}]}',
      700, 0
    ));
    _wgDetBusy = false;

    const cards = (parsed && Array.isArray(parsed.cards))
      ? parsed.cards.filter(function (c) {
          return c && typeof c.t === 'string' && c.t.trim().length >= 5 &&
            (c.k === 'fact' || c.k === 'opinion');
        }).slice(0, 8)
      : [];

    if (cards.length < 2) {
      wgOpenModal(
        '<h3>🔍 기자 검증 게임</h3>' +
        '<p class="wg-note">문장을 나누지 못했어요. 기사에 문장 부호(.)가 있는지 확인하고 다시 시도해 주세요!</p>' +
        '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
      );
      return;
    }

    _wgDet = { cards: cards, idx: 0, ok: 0, combo: 0, maxCombo: 0 };
    wgDetRender();
  }
  window.wgStartDetective = wgStartDetective;

  function wgDetRender() {
    const d = _wgDet;
    const c = d.cards[d.idx];
    wgOpenModal(
      '<h3>🔍 기자 검증 게임</h3>' +
      '<p class="wg-note">문장 ' + (d.idx + 1) + ' / ' + d.cards.length +
      ' · 맞힌 수 ' + d.ok + ' · 콤보 <b>' + d.combo + '</b></p>' +
      '<div class="wg-fcard">' + wgEsc(c.t) + '</div>' +
      '<p class="wg-note">이 문장은 책·영화 속 내용을 그대로 전한 <b>사실</b>일까요, 글쓴이의 생각인 <b>의견</b>일까요?</p>' +
      '<div class="wg-row2">' +
      '<button class="wg-btn" onclick="wgDetPick(\'fact\')">📘 사실</button>' +
      '<button class="wg-btn green" onclick="wgDetPick(\'opinion\')">💭 의견</button>' +
      '</div>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">그만하기</button>'
    );
  }

  function wgDetPick(k) {
    const d = _wgDet;
    if (!d) return;
    const c = d.cards[d.idx];
    const correct = (c.k === k);
    if (correct) {
      d.ok += 1;
      d.combo += 1;
      if (d.combo > d.maxCombo) d.maxCombo = d.combo;
    } else {
      d.combo = 0;
    }
    const why = (c.k === 'fact')
      ? '책·영화에서 실제로 있었던 내용을 전한 문장이에요.'
      : '글쓴이의 생각·느낌·평가가 담긴 문장이에요.';
    const isLast = (d.idx + 1 >= d.cards.length);
    wgOpenModal(
      '<h3>' + (correct ? '⭕ 정답!' : '❌ 아쉽!') + (correct && d.combo >= 3 ? ' 🔥콤보 ' + d.combo : '') + '</h3>' +
      '<div class="wg-fcard">' + wgEsc(c.t) + '</div>' +
      '<p>정답: <b>' + (c.k === 'fact' ? '📘 사실' : '💭 의견') + '</b></p>' +
      '<p class="wg-note">💡 ' + why + '</p>' +
      '<button class="wg-btn" onclick="wgDetNext()">' + (isLast ? '🏁 결과 보기' : '다음 문장 →') + '</button>'
    );
  }
  window.wgDetPick = wgDetPick;

  function wgDetNext() {
    const d = _wgDet;
    if (!d) return;
    d.idx += 1;
    if (d.idx >= d.cards.length) { wgDetFinish(); return; }
    wgDetRender();
  }
  window.wgDetNext = wgDetNext;

  function wgDetFinish() {
    const d = _wgDet;
    const pct = Math.round((d.ok / d.cards.length) * 100);
    let bonusLine = '';
    if (pct >= 80) {
      wgAddInk(20, '(검증 통과!)');
      const s = wgLoad('det', { hi: 0 });
      s.hi = (s.hi || 0) + 1;
      wgSave('det', s);
      if (s.hi >= 3) wgAddBadge('명탐정 기자');
      bonusLine = '<p class="wg-note">🏅 정확도 80% 이상 — 검증 통과! (' + s.hi + '번째)</p>';
    }
    wgOpenModal(
      '<h3>🏁 검증 결과</h3>' +
      '<p>정확도 <b>' + pct + '%</b> (' + d.ok + ' / ' + d.cards.length + ') · 최고 콤보 ' + d.maxCombo + '</p>' +
      bonusLine +
      '<p class="wg-note">💡 좋은 기사는 사실과 의견이 뒤섞이지 않게 써요. 내 기사의 의견 문장에는 「~라고 생각한다」, 「~인 것 같다」처럼 <b>의견 표시</b>가 있는지 다시 살펴볼까요?</p>' +
      '<button class="wg-btn" onclick="wgStartDetective()">한 번 더 검증!</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
    );
    _wgDet = null;
  }

  /* ══════════════════════════════════════════════════════════
     15. 맥락 주입 — 그림일기 화면 게임 배너
         (밀수 임무 진행 중 / 경매 낙찰 낱말이 있을 때만 표시.
          평소에는 완전히 숨겨 툴바 혼잡을 만들지 않는다)
     ══════════════════════════════════════════════════════════ */

  function wgInjectDiaryBar() {
    if (document.getElementById('wgDiaryBar')) return;
    const mission = wg$('missionBox');
    const diary = wg$('diary');
    const bar = document.createElement('div');
    bar.id = 'wgDiaryBar';
    bar.style.display = 'none';
    if (mission) mission.insertAdjacentElement('afterend', bar);
    else if (diary) diary.insertAdjacentElement('beforebegin', bar);
    else return;
  }

  function wgRenderDiaryBar() {
    const bar = document.getElementById('wgDiaryBar');
    if (!bar) return;
    let html = '';

    const sm = wgLoad('smuggle', { date: '', secret: '', tries: 0, done: false });
    if (sm.date === wgToday() && sm.secret && !sm.done) {
      html +=
        '<div class="wg-banner">🕵️ <b>밀수 임무 진행 중</b> — 비밀 단어 「<b>' + wgEsc(sm.secret) + '</b>」를 자연스럽게! ' +
        '(검사 기회 ' + Math.max(0, 2 - (sm.tries || 0)) + '번 · 일기 60자 이상) ' +
        '<button class="wg-btn" style="padding:6px 10px;font-size:12px;" onclick="wgSmuggleCheck()">🛃 세관 검사</button></div>';
    }

    const au = wgLoad('auction', { date: '', items: [], refunded: false });
    if (au.date === wgToday() && Array.isArray(au.items) && au.items.length && !au.refunded) {
      html +=
        '<div class="wg-banner">🔨 <b>낙찰 낱말</b> — 칩을 누르면 일기에 쏙! 오늘 일기에 모두 자연스럽게 쓰면 원금+보너스 환급' +
        '<div class="wg-chipbar">' +
        au.items.map(function (it, i) {
          return '<span class="wg-chip" onclick="wgAucChip(' + i + ')">' + wgEsc(it.word) + '</span>';
        }).join('') +
        '</div>' +
        '<button class="wg-btn green" style="padding:6px 10px;font-size:12px;" onclick="wgAuctionCheck()">🧾 환급 정산 받기</button></div>';
    }

    const show = !!html;
    bar.style.display = show ? 'block' : 'none';
    if (bar.innerHTML !== html) bar.innerHTML = html;
  }
  window.wgRenderDiaryBar = wgRenderDiaryBar;

  /* ══════════════════════════════════════════════════════════
     16. 게임 런처 (허브) — v3: 돋움/이음/틔움/지음 단계로 묶어
         교육과정 배치를 유지 + 날짜 시드 '오늘의 추천' 1개
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
    const petState = wgLoad('pet', { date: '', done: false, count: 0 });
    const cravingDone = (petState.date === wgToday() && petState.done);
    const kills = wgLoad('monster', { kills: 0 }).kills;
    const teleWins = wgLoad('tele', { wins: 0 }).wins || 0;
    const dietWins = wgLoad('diet', { wins: 0 }).wins || 0;
    const robotClears = (wgLoad('robot', { clears: [] }).clears || []).length;
    const speedBest = wgLoad('speed', { best: 0 }).best || 0;
    const tempPlays = wgLoad('temp', { plays: 0 }).plays || 0;
    const sm = wgLoad('smuggle', { date: '', done: false });
    const smState = (sm.date === wgToday() && sm.done) ? '오늘 완료 ✅' : '오늘의 임무 도착!';
    const au = wgAucState();
    const auState = au.refunded ? '오늘 정산 완료 ✅' : (au.items.length ? '낙찰 ' + au.items.length + '개 — 일기에 쓰면 환급!' : '단어 6개 경매 중');

    const RECO = ['tele', 'monster', 'combo', 'diet', 'temp', 'auction', 'smuggle', 'speed', 'truth', 'robot', 'det'];
    const reco = wgSeedPick(RECO, 1, 'reco-' + wgToday())[0];
    const star = function (k) { return (k === reco) ? ' <b style="color:#f4c430">⭐오늘의 추천</b>' : ''; };

    wgOpenModal(
      '<h3>🎮 글쓰기 게임 센터</h3>' +
      '<p class="wg-note">오늘 게임 잉크: <b>' + inkUsed + ' / ' + WG_INK_DAILY_CAP + '</b> · 잉크보다 값진 건 늘어나는 표현력!</p>' +

      '<div class="wg-stage">🌱 돋움 — 표현·문장 훈련</div>' +
      '<button class="wg-menu-btn" onclick="wgStartTelepathy()">📡 텔레파시 (사물/감정)' + star('tele') + ' <span class="wg-note">— 이름 없이 설명만으로 전달 · 성공 ' + teleWins + '번</span></button>' +
      '<button class="wg-menu-btn" onclick="wgStartMonsterHunt()">⚔️ 맞춤법 몬스터 사냥' + star('monster') + ' <span class="wg-note">— 매판 새 문제 · 처치 ' + kills + '마리</span></button>' +
      '<button class="wg-menu-btn" onclick="wgStartCombo()">🪄 문장 늘리기 콤보' + star('combo') + ' <span class="wg-note">— 문장을 6겹까지 키우기</span></button>' +
      '<button class="wg-menu-btn" onclick="wgStartDiet()">✂️ 문장 다이어트' + star('diet') + ' <span class="wg-note">— 군더더기 빼고 핵심만 · 성공 ' + dietWins + '번</span></button>' +
      '<button class="wg-menu-btn" onclick="wgOpenAuction()">🔨 오늘의 낱말 경매' + star('auction') + ' <span class="wg-note">— ' + wgEsc(auState) + '</span></button>' +
      '<button class="wg-menu-btn" onclick="wgStartTemp()">🌡️ 상상력 온도 다이얼' + star('temp') + ' <span class="wg-note">— 뻔하게 vs 참신하게, 두 온도로 이어 쓰기 · 도전 ' + tempPlays + '번</span></button>' +

      '<div class="wg-stage">✍️ 이음 — 그림일기와 함께</div>' +
      '<button class="wg-menu-btn" onclick="wgStartSmuggle()">🕵️ 비밀 단어 밀수꾼' + star('smuggle') + ' <span class="wg-note">— ' + wgEsc(smState) + '</span></button>' +
      '<button class="wg-menu-btn" onclick="wgStartSpeedrun()">🎤 60초 말하기 스피드런' + star('speed') + ' <span class="wg-note">— 말로 초안 만들기' + (speedBest ? ' · 최고 ' + speedBest + '자' : '') + '</span></button>' +
      '<button class="wg-menu-btn" onclick="wgStartTruth()">🎭 진실 둘, 거짓 하나' + star('truth') + ' <span class="wg-note">— AI 탐정 속이기 / 친구 투표</span></button>' +
      '<p class="wg-note">🎯 오감 빙고는 일기 쓰기 화면에 늘 있어요 · 🍽️ 오늘 펫의 편식: <b>' + wgEsc(craving.label) + '</b> ' +
      (cravingDone ? '(먹여 줬어요 ✅)' : '(일기에 쓰고 저장하면 먹어요!)') + '</p>' +

      '<div class="wg-stage">🤝 틔움 — AI와 주고받기</div>' +
      '<button class="wg-menu-btn" onclick="wgStartRobot()">🤖 고장난 로봇 조종하기' + star('robot') + ' <span class="wg-note">— 순서대로 지시하는 설명문 훈련 · 클리어 ' + robotClears + '/' + WG_ROBOT_TASKS.length + '</span></button>' +

      '<div class="wg-stage">📰 지음 — 출판 검증</div>' +
      '<button class="wg-menu-btn" onclick="wgStartDetective()">🔍 기자 검증 게임' + star('det') + ' <span class="wg-note">— 내 기사의 사실/의견 가려내기 (감상문 출판 → 신문 기사)</span></button>' +

      '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>',
      true
    );
  }
  window.wgOpenHub = wgOpenHub;

  /* ══════════════════════════════════════════════════════════
     17. 초기화 — 화면 전환 후 생기는 요소들은 주기 감시로 주입
     ══════════════════════════════════════════════════════════ */

  function wgInit() {
    wgInjectStyles();
    wgEnsureModal();
    wgRegisterBadges();
    wgInjectLauncher();
    wgPatchSaveDiary();
    wgAnnounceCraving();
    wgPatchRvNews();

    setInterval(function () {
      try {
        wgInjectBingo();
        wgSyncBingoVisibility();
        wgPatchSaveDiary();
        wgRegisterBadges();
        wgInjectDiaryBar();
        wgRenderDiaryBar();
        wgInjectDetectiveBtn();
        wgPatchRvNews();
      } catch (e) {}
    }, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wgInit);
  } else {
    wgInit();
  }

})();
