/* ============================================================
   13a-games-core.js
   ── 「지음 프로젝트」 글쓰기 게임 모듈 (구 13-writing-games.js 분할본 1/6)
   ── 담당: 공용 유틸 · AI 호출 래퍼 · 잉크/뱃지 · CSS 주입 · 공용 모달

   ⚠️ 분할 규칙 (반드시 지킬 것)
     1) 이 6개 파일(13a~13f)은 **하나의 스코프를 공유**한다.
        원본이 IIFE 하나였던 것을 클래식 스크립트 전역으로 펼친 것이므로,
        최상위 const/let 은 전역 렉시컬 환경을, function 은 window 를 공유한다.
     2) 따라서 index.html 에서 **13a → 13b → ... → 13f 순서로, 빠짐없이**
        로드해야 한다. 하나라도 빠지면 ReferenceError 가 난다.
     3) 실제 초기화(wgInit)는 마지막 파일 13f 에서만 실행된다.
     4) 새 최상위 이름은 반드시 wg / WG_ / _wg 접두어를 붙일 것 (전역 충돌 방지).
   ============================================================ */
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
  { name: '상상력 온도조절사', el: 'badge_wg11' },
  { name: '모두의 친구',       el: 'badge_wg12' },
  { name: '흐림을 걷은 아이',  el: 'badge_wg13' },
  { name: '이야기의 주인',     el: 'badge_wg14' },
  { name: '대충이 퇴치사',     el: 'badge_wg15' },
  { name: '지움을 배웅한 아이', el: 'badge_wg16' },
  { name: '얼굴을 되찾아 준 아이', el: 'badge_wg17' },
  { name: '말의 밭 주인',      el: 'badge_wg18' },
  { name: '하루의 방 주인',    el: 'badge_wg19' },
  { name: '숲을 깨운 아이',    el: 'badge_wg20' },
  { name: '서고의 주인',       el: 'badge_wg21' },
  { name: '고쳐 쓰는 사람',    el: 'badge_wg22' }
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
    /* [신규] 약점 기반 오늘의 추천 안내 */
    '.wg-reco-note { margin: 8px 0 12px; padding: 10px 12px; border-radius: 10px; background: #f3f0ff; border: 2px solid #d5cbff; font-size: 13px; line-height: 1.6; color: #4a3f8a; }',
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
    '#wgDetBtn { margin: 6px 0; display: block; }',
    /* ── 1순위: 게임별 진행바 ── */
    '.wg-prog { margin-top: 5px; height: 7px; border-radius: 6px; background: #ece8dd; overflow: hidden; }',
    '.wg-prog-fill { height: 100%; border-radius: 6px; background: linear-gradient(90deg,#7ed6a5,#6c5ce7); transition: width .4s ease; }',
    '.wg-prog-fill.done { background: linear-gradient(90deg,#ffd166,#f4c430); }',
    '.wg-prog-label { font-size: 11px; color: #999; margin-top: 2px; }',
    /* ── 2순위: 오늘의 미션 위젯 ── */
    '.wg-daily { margin: 4px 0 12px; padding: 12px 14px; border-radius: 12px; background: linear-gradient(135deg,#f4f1ff,#fff5ec); border: 2px solid #d7cff5; }',
    '.wg-daily-head { display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 800; color: #6c5ce7; margin-bottom: 8px; }',
    '.wg-daily-bar { height: 9px; border-radius: 6px; background: #e5e0f5; overflow: hidden; margin-bottom: 10px; }',
    '.wg-daily-bar-fill { height: 100%; background: linear-gradient(90deg,#7ed6a5,#6c5ce7); border-radius: 6px; transition: width .5s ease; }',
    '.wg-mission { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 5px 0; }',
    '.wg-mission .mk { flex: 0 0 auto; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; }',
    '.wg-mission.on .mk { background: #7ed6a5; color: #fff; }',
    '.wg-mission.off .mk { background: #ddd; color: #fff; }',
    '.wg-mission.on { color: #555; }',
    '.wg-mission.off { color: #888; }',
    '.wg-mission .mgo { margin-left: auto; font-size: 11px; color: #6c5ce7; cursor: pointer; text-decoration: underline; }',
    '.wg-daily-done { text-align: center; font-size: 13px; font-weight: 700; color: #00b894; padding: 4px; }',
    /* ── 세계관: 성장 일지 챕터 ── */
    '.wg-saga-ch { margin: 10px 0; padding: 12px 14px; border-radius: 12px; background: #faf8f2; border: 2px solid #e8e2d5; }',
    '.wg-saga-ch.clear { background: #f0fbf6; border-color: #a8e6c9; }',
    '.wg-saga-ch.now { background: #f6f2ff; border-color: #c9b8ff; box-shadow: 0 2px 10px rgba(108,92,231,.12); }',
    '.wg-saga-ch.locked { opacity: .55; }',
    '.wg-saga-head { font-size: 14px; font-weight: 800; color: #5b4b8a; margin-bottom: 6px; }',
    '.wg-saga-story { font-size: 13px; line-height: 1.7; color: #6b6255; background: rgba(255,255,255,.65); padding: 9px 11px; border-radius: 9px; font-style: italic; }',
    '.wg-saga-btn { display: block; width: 100%; margin: 6px 0 10px; padding: 12px; border: 2px solid #c9b8ff; border-radius: 12px; background: linear-gradient(135deg,#f6f2ff,#fff5ec); font-size: 14px; font-weight: 700; color: #5b4b8a; cursor: pointer; }',
    '.wg-saga-btn:hover { background: #efe9ff; }',
    '.wg-dexgrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin: 8px 0; }',
    '.wg-dex { padding: 9px 4px; border-radius: 10px; background: #f6f2ff; border: 1px solid #d7cff5; text-align: center; cursor: pointer; }',
    '.wg-dex:hover { background: #ece4ff; }',
    '.wg-dex.locked { background: #f0eee9; border-color: #e0dcd3; opacity: .6; cursor: default; }',
    '.wg-dex-em { font-size: 24px; line-height: 1.2; }',
    '.wg-dex-nm { font-size: 10.5px; color: #6b6255; margin-top: 2px; }',
    '.wg-weather { display: flex; align-items: center; gap: 10px; margin: 4px 0 10px; padding: 10px 12px; border-radius: 12px; background: linear-gradient(135deg,#eef6ff,#fff8ec); border: 1px solid #cfe0f5; font-size: 13px; }',
    '.wg-w-em { font-size: 28px; flex: 0 0 auto; }',
    '.wg-artbox { width: 132px; height: 132px; margin: 6px auto 8px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 40%, #ffffff, #f3f0e8); border-radius: 50%; box-shadow: inset 0 0 0 2px #eae5d8; }',
    '.wg-artbox.dark { background: radial-gradient(circle at 50% 40%, #f2f2f8, #dcdce8); box-shadow: inset 0 0 0 2px #cfcfe0; }',
    '.wg-board { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0; }',
    '.wg-board-cell { text-align: center; padding: 8px; background: #faf8f2; border: 1px solid #e8e2d5; border-radius: 12px; }',
    '.wg-board-art { width: 88px; height: 88px; margin: 0 auto 4px; }'
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
  try { wgQRelease(); } catch (e) {}   // 큐에 대기 중인 다음 이야기로
}
window.wgCloseModal = wgCloseModal;
