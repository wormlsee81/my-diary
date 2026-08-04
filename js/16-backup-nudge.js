/* ============================================================
   16-backup-nudge.js — 💾 자동 백업 유도

   왜 필요한가 (사실 관계)
     이 앱의 학생 데이터는 전부 브라우저 로컬(localStorage /
     localforage→IndexedDB)에만 있다. 서버 사본이 없다.
     따라서 아래 상황에서 **글이 전부, 복구 불가능하게 사라진다**:
       · 브라우저 '인터넷 사용 기록 삭제' / 쿠키·사이트 데이터 삭제
       · 학교 공용 PC의 재부팅 시 초기화(Deep Freeze 등)
       · 시크릿/프라이빗 모드 사용
       · iOS Safari 의 7일 미사용 사이트 데이터 자동 삭제
       · 기기 교체·초기화
     01-core-init.js 에 backupData() 가 이미 있지만, 학생이
     스스로 찾아서 누를 이유가 없어 사실상 안 쓰이고 있었다.

   이 모듈이 하는 일
     ① 일기가 N편 쌓일 때마다 백업을 권유 (기본 5편)
     ② 마지막 백업 후 14일이 지나면 권유
     ③ 앱 첫 진입 시 저장소가 '휘발성'으로 보이면 즉시 경고
        (시크릿 모드 등 — navigator.storage.persist 로 추정)
     ④ 홈 화면에 백업 상태 칩 상시 노출
     ⑤ 백업 파일 복원 버튼도 같은 자리에 둠

   ⚠️ 강제하지 않는다. 학생 흐름을 끊지 않도록 모달은
      '저장 직후'에만, 하루 1회까지만 뜬다.

   로드 순서: 15-writing-plan.js 뒤
   ============================================================ */
'use strict';

const WG_BK_KEY        = 'mdj_backup_state';
const WG_BK_EVERY      = 5;    // 일기 몇 편마다 권유할지
const WG_BK_DAYS       = 14;   // 마지막 백업 후 며칠 지나면 권유할지
const WG_BK_MAX_PER_DAY = 1;   // 하루 최대 권유 횟수

function wgBkState() {
  try {
    const raw = localStorage.getItem(WG_BK_KEY);
    const o = raw ? JSON.parse(raw) : null;
    return o || { lastBackupAt: 0, lastNudgeDay: '', nudgesToday: 0, lastCount: 0 };
  } catch (e) {
    return { lastBackupAt: 0, lastNudgeDay: '', nudgesToday: 0, lastCount: 0 };
  }
}
function wgBkSave(s) {
  try { localStorage.setItem(WG_BK_KEY, JSON.stringify(s)); } catch (e) {}
}

/** 저장된 일기 편수 (getEntries 가 없으면 0) */
async function wgBkEntryCount() {
  try {
    if (typeof window.getEntries === 'function') {
      const e = await window.getEntries();
      return Array.isArray(e) ? e.length : 0;
    }
  } catch (e) {}
  return 0;
}

function wgBkDaysSince(ts) {
  if (!ts) return 9999;
  return Math.floor((Date.now() - ts) / 86400000);
}

/* ══════════════════════════════════════════════════════════
   1. 저장소 휘발성 추정
      navigator.storage.persisted() 가 false 이고 persist() 요청도
      거절되면, 브라우저가 공간 압박 시 데이터를 지울 수 있는 상태다.
      ⚠️ 이건 '지워진다'는 확정이 아니라 '지워질 수 있다'는 추정이다.
         브라우저마다 정책이 달라 오탐/미탐이 모두 가능하므로
         문구도 단정하지 않는다.
   ══════════════════════════════════════════════════════════ */
async function wgBkStorageRisky() {
  try {
    if (!navigator.storage || !navigator.storage.persisted) return null; // 판단 불가
    const already = await navigator.storage.persisted();
    if (already) return false;
    if (navigator.storage.persist) {
      const granted = await navigator.storage.persist();
      return !granted;
    }
    return true;
  } catch (e) { return null; }
}

/* ══════════════════════════════════════════════════════════
   2. 백업 실행 래퍼 — 성공 시 타임스탬프 기록
   ══════════════════════════════════════════════════════════ */
async function wgDoBackup() {
  if (typeof window.backupData !== 'function') {
    wgToast('백업 기능을 찾을 수 없어요. 선생님께 알려 주세요!');
    return;
  }
  try {
    await window.backupData();
    const s = wgBkState();
    s.lastBackupAt = Date.now();
    s.lastCount = await wgBkEntryCount();
    wgBkSave(s);
    wgRenderBkChip();
    wgCloseModal();
    if (typeof wgPetSay === 'function') wgPetSay('내려받은 파일, 잘 챙겨 둬! 그게 네 글의 사본이야 💾');
  } catch (e) {
    wgToast('백업에 실패했어요: ' + (e && e.message ? e.message : ''));
  }
}
window.wgDoBackup = wgDoBackup;

/* ══════════════════════════════════════════════════════════
   3. 권유 모달
   ══════════════════════════════════════════════════════════ */
function wgOpenBackupModal(reason, count) {
  const s = wgBkState();
  const days = wgBkDaysSince(s.lastBackupAt);
  const never = !s.lastBackupAt;

  let why = '';
  if (reason === 'count') why = '일기가 <b>' + count + '편</b> 쌓였어요.';
  else if (reason === 'days') why = '마지막 백업이 <b>' + days + '일</b> 전이에요.';
  else if (reason === 'risky') why = '지금 쓰는 브라우저가 <b>저장한 글을 지울 수도 있는 상태</b>로 보여요.';
  else why = '지금까지 쓴 글을 파일로 챙겨 둘 시간이에요.';

  wgOpenModal(
    '<h3>💾 글, 파일로 챙겨 둘까?</h3>' +
    '<div class="wg-banner">' + why + '<br>' +
    '이 앱은 네가 쓴 글을 <b>이 기기 안에만</b> 보관해. 인터넷 기록을 지우거나 다른 기기로 바꾸면 ' +
    '되돌릴 방법이 없어. 백업 파일 하나만 내려받아 두면 안심이야.</div>' +

    (never ? '<p class="wg-note">⚠️ 아직 한 번도 백업한 적이 없어요.</p>' : '') +

    '<button class="wg-btn green" onclick="wgDoBackup()">💾 지금 백업 파일 내려받기</button>' +
    '<button class="wg-btn gray" onclick="wgCloseModal()">나중에 할게</button>' +
    '<p class="wg-note" style="margin-top:8px;">내려받은 파일은 <b>지우지 말고</b> 보관해 주세요. ' +
    '나중에 홈 화면 💾 버튼 → 복원으로 되돌릴 수 있어요.</p>',
    false
  );
}
window.wgOpenBackupModal = wgOpenBackupModal;

/* ══════════════════════════════════════════════════════════
   4. 권유 판정 — 일기 저장 직후에만 호출
   ══════════════════════════════════════════════════════════ */
async function wgCheckBackupNudge() {
  const s = wgBkState();
  const today = wgToday();
  if (s.lastNudgeDay !== today) { s.lastNudgeDay = today; s.nudgesToday = 0; }
  if (s.nudgesToday >= WG_BK_MAX_PER_DAY) { wgBkSave(s); return; }

  const count = await wgBkEntryCount();
  const sinceBackup = count - (s.lastCount || 0);
  const days = wgBkDaysSince(s.lastBackupAt);

  let reason = '';
  if (sinceBackup >= WG_BK_EVERY) reason = 'count';
  else if (s.lastBackupAt && days >= WG_BK_DAYS) reason = 'days';
  else if (!s.lastBackupAt && count >= WG_BK_EVERY) reason = 'count';

  if (!reason) { wgBkSave(s); wgRenderBkChip(); return; }

  s.nudgesToday += 1;
  wgBkSave(s);
  wgOpenBackupModal(reason, sinceBackup > 0 ? sinceBackup : count);
}

/* ══════════════════════════════════════════════════════════
   5. 홈 화면 상태 칩
   ══════════════════════════════════════════════════════════ */
function wgInjectBkChip() {
  if (document.getElementById('wgBkChip')) return;
  const ink = document.getElementById('homeInkDisplay');
  if (!ink || !ink.parentElement) return;
  const btn = document.createElement('button');
  btn.id = 'wgBkChip';
  btn.className = 'wg-bk-chip';
  btn.onclick = wgOpenBackupPanel;
  ink.parentElement.appendChild(btn);
  wgRenderBkChip();
}

function wgRenderBkChip() {
  const el = document.getElementById('wgBkChip');
  if (!el) return;
  const s = wgBkState();
  if (!s.lastBackupAt) {
    el.className = 'wg-bk-chip warn';
    el.innerHTML = '💾 백업 안 함';
  } else {
    const d = wgBkDaysSince(s.lastBackupAt);
    el.className = 'wg-bk-chip' + (d >= WG_BK_DAYS ? ' warn' : ' ok');
    el.innerHTML = '💾 ' + (d === 0 ? '오늘 백업함' : d + '일 전 백업');
  }
}

function wgOpenBackupPanel() {
  const s = wgBkState();
  const never = !s.lastBackupAt;
  const d = wgBkDaysSince(s.lastBackupAt);
  wgOpenModal(
    '<h3>💾 내 글 지키기</h3>' +
    '<div class="wg-banner">' +
    (never ? '아직 백업한 적이 없어요.' : '마지막 백업: <b>' + d + '일 전</b>') +
    '<br><span class="wg-note">이 앱은 글을 이 기기 안에만 보관해요. ' +
    '공용 컴퓨터를 쓰거나 기기를 바꿀 계획이면 꼭 백업해 주세요.</span></div>' +
    '<button class="wg-btn green" onclick="wgDoBackup()">💾 백업 파일 내려받기</button>' +
    '<button class="wg-btn" onclick="wgPickRestore()">📂 백업 파일로 되돌리기</button>' +
    '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>',
    false
  );
}
window.wgOpenBackupPanel = wgOpenBackupPanel;

function wgPickRestore() {
  if (typeof window.restoreData !== 'function') {
    wgToast('복원 기능을 찾을 수 없어요. 선생님께 알려 주세요!');
    return;
  }
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json,.json';
  inp.style.display = 'none';
  inp.addEventListener('change', function () {
    if (inp.files && inp.files[0]) window.restoreData(inp.files[0]);
    setTimeout(function () { try { document.body.removeChild(inp); } catch (e) {} }, 500);
  });
  document.body.appendChild(inp);
  inp.click();
}
window.wgPickRestore = wgPickRestore;

/* ══════════════════════════════════════════════════════════
   6. 후킹 · 초기화
   ══════════════════════════════════════════════════════════ */
function wgPatchBackupHooks() {
  if (window._wgBkPatched) return;
  if (typeof window.saveDiary === 'function') {
    const _sd = window.saveDiary;
    window.saveDiary = function () {
      const r = _sd.apply(this, arguments);
      /* 계획 대조 모달(15번)과 겹치지 않도록 더 늦게 */
      setTimeout(function () { wgCheckBackupNudge().catch(function () {}); }, 4200);
      return r;
    };
    window._wgBkPatched = true;
  }
}

function wgInjectBkStyles() {
  if (document.getElementById('wgBkStyles')) return;
  const css = [
    '.wg-bk-chip { display:inline-flex; align-items:center; gap:5px; padding:6px 14px; border-radius:14px;',
    '  font-family:inherit; font-size:13px; font-weight:bold; cursor:pointer; border:2px solid; }',
    '.wg-bk-chip.ok   { background:#eaf6f4; border-color:#a8e0d6; color:#3a8a7a; }',
    '.wg-bk-chip.warn { background:#fff5f5; border-color:#ffc2c0; color:#c0504a; }'
  ].join('\n');
  const st = document.createElement('style');
  st.id = 'wgBkStyles';
  st.textContent = css;
  document.head.appendChild(st);
}

async function wgBkFirstRunCheck() {
  const risky = await wgBkStorageRisky();
  if (risky !== true) return;
  const s = wgBkState();
  if (s.riskWarned) return;
  s.riskWarned = true;
  wgBkSave(s);
  wgOpenBackupModal('risky', 0);
}

function wgBkInit() {
  wgInjectBkStyles();
  setTimeout(function () {
    try { wgPatchBackupHooks(); wgInjectBkChip(); } catch (e) {}
  }, 1500);
  /* 첫 진입 위험 경고는 홈 화면을 벗어난 뒤에만 (로그인 흐름 방해 금지) */
  setTimeout(function () {
    const home = document.getElementById('homeScreen');
    if (home && home.style.display !== 'none' && home.offsetParent !== null) return;
    wgBkFirstRunCheck().catch(function () {});
  }, 12000);
  setInterval(function () { try { wgInjectBkChip(); wgRenderBkChip(); } catch (e) {} }, 5000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wgBkInit);
} else {
  wgBkInit();
}
