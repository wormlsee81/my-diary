/* ============================================================
   15-writing-plan.js — 🕸️ 계획하기(생각그물) 단계

   왜 필요한가 (교육학적 근거)
     Flower & Hayes(1981)의 쓰기 과정 모형은 쓰기를
       계획하기(planning) → 작성하기(translating) → 검토하기(reviewing)
     의 회귀적 과정으로 본다. 이 앱은 지금까지
       작성(초고 보상 40%) → 검토(퇴고 보상 60%)
     두 단계만 구현되어 있었고 **계획하기가 비어 있었다.**
     계획하기의 하위 과정은 생성(generating) · 조직(organizing) ·
     목표 설정(goal-setting)인데, 이 모듈은 그중
       · 생성 = 중심 낱말에서 가지 뻗기
       · 조직 = 가지를 쓸 순서대로 놓기
       · 목표 설정 = "오늘 이건 꼭 쓴다" 한 줄
     을 30초 안에 끝나는 크기로 만든다.

   ⚠️ 설계 시 지킨 제약
     1) **강제하지 않는다.** 계획 없이도 바로 쓸 수 있다.
        초등 5~6학년에게 계획 단계를 의무화하면 쓰기 자체를
        회피하게 만들 수 있다는 우려가 있어 항상 건너뛸 수 있게 했다.
     2) **채점하지 않는다.** 계획과 결과를 비교해 주지만
        점수·잉크 차감은 없다. 계획을 바꾸는 것도 쓰기 과정의
        정상적인 일부(회귀성)이기 때문이다.
     3) 잉크 보상은 소액 고정(+15)이며 게임 잉크 일일 상한을 따른다.

   로드 순서: 14-curriculum.js 뒤
   ============================================================ */
'use strict';

const WG_PLAN_KEY = 'mdj_plan';
const WG_PLAN_BRANCHES = 3;     // 가지 개수 (인지 부하를 낮추려 3개 고정)

/* ══════════════════════════════════════════════════════════
   1. 저장/조회 — 대상별(일기 diary / 논설문 essay)로 따로 보관
   ══════════════════════════════════════════════════════════ */
function wgPlanAll() {
  try {
    const raw = localStorage.getItem(WG_PLAN_KEY);
    const o = raw ? JSON.parse(raw) : {};
    return (o && typeof o === 'object') ? o : {};
  } catch (e) { return {}; }
}
function wgPlanGet(target) {
  const all = wgPlanAll();
  const p = all[target];
  if (!p) return null;
  if (p.date !== wgToday()) return null;      // 하루 지나면 새 계획
  return p;
}
function wgPlanSet(target, plan) {
  const all = wgPlanAll();
  all[target] = plan;
  try { localStorage.setItem(WG_PLAN_KEY, JSON.stringify(all)); } catch (e) {}
  wgRenderPlanBar();
}
function wgPlanClear(target) {
  const all = wgPlanAll();
  delete all[target];
  try { localStorage.setItem(WG_PLAN_KEY, JSON.stringify(all)); } catch (e) {}
  wgRenderPlanBar();
}
window.wgPlanClear = wgPlanClear;

/* 대상별 입력칸 id */
const WG_PLAN_TARGET = {
  diary: { ta: 'diary',         name: '그림일기',   anchor: 'missionBox' },
  essay: { ta: 'essayTextarea', name: '주장하는 글', anchor: 'essayTopicBox' }
};

/** 지금 화면에서 활성인 대상 추정 */
function wgPlanActiveTarget() {
  const es = wg$('essayTextarea');
  if (es && es.offsetParent !== null) return 'essay';
  const dy = wg$('diary');
  if (dy && dy.offsetParent !== null) return 'diary';
  return null;
}

/* ══════════════════════════════════════════════════════════
   2. 계획하기 모달
   ══════════════════════════════════════════════════════════ */
function wgOpenPlan(target) {
  target = target || wgPlanActiveTarget() || 'diary';
  const meta = WG_PLAN_TARGET[target];
  if (!meta) return;
  const cur = wgPlanGet(target) || { center: '', branches: ['', '', ''], goal: '' };

  /* 미션이 뽑혀 있으면 중심 낱말 힌트로 준다 */
  let hint = '';
  try {
    if (target === 'diary' && window.currentMission && window.currentMission.title) {
      hint = String(window.currentMission.title).replace(/[\s\u{1F300}-\u{1FAFF}]+$/u, '');
    } else if (target === 'essay') {
      const tb = wg$('essayTopicBox');
      if (tb && tb.textContent && tb.textContent.indexOf('주제를 뽑') === -1) hint = tb.textContent.trim().slice(0, 20);
    }
  } catch (e) {}

  let html =
    '<h3>🕸️ 생각그물 30초</h3>' +
    '<p class="wg-note">쓰기 전에 <b>딱 30초</b>만. 무엇을 쓸지 미리 정해 두면 중간에 길을 안 잃어요.<br>' +
    '안 하고 바로 써도 괜찮아요 — 쓰다가 계획이 바뀌는 것도 자연스러운 일이에요!</p>' +

    '<div class="wg-stage">① 가운데 — 오늘 글의 중심은?</div>' +
    '<input id="wgPlanCenter" class="wg-input" maxlength="24" placeholder="' +
    (hint ? wgEsc(hint) : '예: 운동회, 전학 온 친구') + '" value="' + wgEsc(cur.center) + '">' +

    '<div class="wg-stage">② 가지 3개 — 그것에 대해 쓸 것</div>';

  for (let i = 0; i < WG_PLAN_BRANCHES; i++) {
    html += '<input id="wgPlanB' + i + '" class="wg-input" style="margin-bottom:6px;" maxlength="24" placeholder="가지 ' +
      (i + 1) + (i === 0 ? ' (예: 아침에 본 것)' : i === 1 ? ' (예: 그때 마음)' : ' (예: 끝나고 든 생각)') +
      '" value="' + wgEsc(cur.branches[i] || '') + '">';
  }

  html +=
    '<div class="wg-stage">③ 오늘의 목표 한 줄 (선택)</div>' +
    '<input id="wgPlanGoal" class="wg-input" maxlength="40" placeholder="예: 소리 표현을 두 번 넣기" value="' + wgEsc(cur.goal || '') + '">' +
    '<button class="wg-btn green" onclick="wgSavePlan(\'' + target + '\')">✅ 이대로 쓰러 가기</button>' +
    (wgPlanGet(target) ? '<button class="wg-btn gray" onclick="wgPlanClear(\'' + target + '\');wgCloseModal();">🗑️ 계획 지우기</button>' : '') +
    '<button class="wg-btn gray" onclick="wgCloseModal()">건너뛰고 바로 쓰기</button>';

  wgOpenModal(html, false);
  setTimeout(function () { const el = wg$('wgPlanCenter'); if (el) el.focus(); }, 120);
}
window.wgOpenPlan = wgOpenPlan;

function wgSavePlan(target) {
  const center = (wg$('wgPlanCenter').value || '').trim();
  const branches = [];
  for (let i = 0; i < WG_PLAN_BRANCHES; i++) {
    const v = (wg$('wgPlanB' + i).value || '').trim();
    if (v) branches.push(v);
  }
  const goal = (wg$('wgPlanGoal').value || '').trim();

  if (!center && !branches.length) { wgToast('중심 낱말이나 가지를 하나라도 적어 주세요!'); return; }

  const first = !wgPlanGet(target);
  wgPlanSet(target, {
    date: wgToday(), center: center, branches: branches, goal: goal,
    checked: false, createdAt: Date.now()
  });
  wgCloseModal();

  if (first) {
    wgAddInk(15, '(계획하기 완료!)');
    wgPetSay('좋아, 길을 정했구나! 이제 마음 놓고 써 봐 🕸️');
  } else {
    wgToast('🕸️ 계획을 고쳤어요!');
  }
}
window.wgSavePlan = wgSavePlan;

/* ══════════════════════════════════════════════════════════
   3. 화면 배너 — 계획을 쓰는 내내 보이게 (칩 누르면 본문에 삽입)
   ══════════════════════════════════════════════════════════ */
function wgInjectPlanBar() {
  const target = wgPlanActiveTarget();
  if (!target) return;
  const meta = WG_PLAN_TARGET[target];
  if (document.getElementById('wgPlanBar_' + target)) return;
  const anchor = wg$(meta.anchor) || wg$(meta.ta);
  if (!anchor) return;
  const el = document.createElement('div');
  el.id = 'wgPlanBar_' + target;
  el.className = 'wg-planbar-wrap';
  anchor.insertAdjacentElement('afterend', el);
  wgRenderPlanBar();
}

function wgRenderPlanBar() {
  Object.keys(WG_PLAN_TARGET).forEach(function (target) {
    const el = document.getElementById('wgPlanBar_' + target);
    if (!el) return;
    const p = wgPlanGet(target);

    if (!p) {
      el.innerHTML =
        '<div class="wg-plan-empty">🕸️ 쓰기 전에 <b>생각그물 30초</b> 어때? ' +
        '<button class="wg-btn" style="width:auto;padding:5px 12px;font-size:12px;margin:0 0 0 4px;" ' +
        'onclick="wgOpenPlan(\'' + target + '\')">계획 짜기</button></div>';
      return;
    }

    const ta = wg$(WG_PLAN_TARGET[target].ta);
    const text = ta ? (ta.value || '') : '';
    const done = p.branches.map(function (b) { return wgPlanHit(text, b); });
    const cnt = done.filter(Boolean).length;

    el.innerHTML =
      '<div class="wg-planbar">' +
      '<div class="wg-plan-head">🕸️ <b>' + wgEsc(p.center || '오늘의 계획') + '</b>' +
      '<span class="wg-note"> — 가지 ' + cnt + '/' + p.branches.length + ' 반영됨</span>' +
      '<button class="wg-plan-edit" onclick="wgOpenPlan(\'' + target + '\')">✏️ 고치기</button></div>' +
      '<div class="wg-chipbar">' +
      p.branches.map(function (b, i) {
        return '<span class="wg-chip' + (done[i] ? ' wg-chip-done' : '') + '" ' +
          'onclick="wgPlanInsert(\'' + target + '\',' + i + ')">' +
          (done[i] ? '✅ ' : '') + wgEsc(b) + '</span>';
      }).join('') +
      '</div>' +
      (p.goal ? '<div class="wg-plan-goal">🎯 오늘의 목표: <b>' + wgEsc(p.goal) + '</b></div>' : '') +
      '</div>';
  });
}
window.wgRenderPlanBar = wgRenderPlanBar;

/** 가지 낱말이 본문에 반영됐는지 — 어절 단위 부분일치(어미 변화 허용) */
function wgPlanHit(text, branch) {
  if (!text || !branch) return false;
  const b = branch.replace(/\s/g, '');
  if (b.length < 2) return false;
  const t = text.replace(/\s/g, '');
  if (t.indexOf(b) !== -1) return true;
  /* '운동회에서' 같은 조사·어미 변화를 감안해 앞 2글자 이상 어간 일치도 인정 */
  const stem = b.slice(0, Math.max(2, Math.floor(b.length * 0.7)));
  return stem.length >= 2 && t.indexOf(stem) !== -1;
}

/** 칩 클릭 — 본문 커서 위치에 가지 낱말 넣어 주기 */
function wgPlanInsert(target, i) {
  const p = wgPlanGet(target);
  const ta = wg$(WG_PLAN_TARGET[target].ta);
  if (!p || !ta) return;
  const w = p.branches[i];
  if (!w) return;
  const s = ta.selectionStart != null ? ta.selectionStart : ta.value.length;
  const e = ta.selectionEnd != null ? ta.selectionEnd : ta.value.length;
  ta.value = ta.value.slice(0, s) + w + ta.value.slice(e);
  ta.focus();
  const pos = s + w.length;
  try { ta.setSelectionRange(pos, pos); } catch (err) {}
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  wgRenderPlanBar();
}
window.wgPlanInsert = wgPlanInsert;

/* ══════════════════════════════════════════════════════════
   4. 저장 후 대조 — "계획한 것이 글에 들어갔나?"

   ⚠️ 이건 평가가 아니라 **되돌아보기**다. 빠진 가지가 있어도
      "틀렸다"가 아니라 "빼기로 한 거야? 아니면 깜빡한 거야?"로 묻는다.
      계획을 수정하는 것 자체가 쓰기 과정의 정상 동작이기 때문이다.
   ══════════════════════════════════════════════════════════ */
function wgPlanReview(target) {
  const p = wgPlanGet(target);
  if (!p || p.checked) return;
  const ta = wg$(WG_PLAN_TARGET[target].ta);
  const text = ta ? (ta.value || '') : '';
  if (!text.trim()) return;

  const done = p.branches.map(function (b) { return wgPlanHit(text, b); });
  const missing = p.branches.filter(function (_b, i) { return !done[i]; });

  p.checked = true;
  wgPlanSet(target, p);

  let html = '<h3>🕸️ 계획과 견주어 보기</h3>';
  html += '<div class="wg-banner" style="border-style:solid;background:#f6fbfa;border-color:#a8e0d6;">' +
    '중심: <b>' + wgEsc(p.center || '—') + '</b></div>';

  html += '<div class="wg-stage">계획한 가지</div>';
  p.branches.forEach(function (b, i) {
    html += '<div class="wg-mission ' + (done[i] ? 'on' : 'off') + '">' +
      '<span class="mk">' + (done[i] ? '✓' : '·') + '</span>' + wgEsc(b) + '</div>';
  });

  if (!missing.length) {
    html += '<p class="wg-note" style="margin-top:10px;">✨ 계획한 걸 모두 담았어요! 길을 잃지 않고 끝까지 갔네요.</p>';
  } else {
    html += '<p class="wg-note" style="margin-top:10px;">' +
      '「<b>' + wgEsc(missing.join('</b>」, 「<b>')) + '</b>」는 아직 안 보여요.<br>' +
      '<b>빼기로 한 건가요, 깜빡한 건가요?</b> 쓰다 보니 계획이 바뀌는 건 아주 자연스러운 일이에요. ' +
      '넣고 싶으면 지금 넣고, 뺄 거면 그대로 둬도 좋아요!</p>';
  }

  if (p.goal) {
    html += '<div class="wg-stage">오늘의 목표</div>' +
      '<div class="wg-banner">🎯 ' + wgEsc(p.goal) + '<br>' +
      '<span class="wg-note">이 목표는 스스로 지켰는지 직접 판단해 보세요. AI가 대신 정해 주지 않아요.</span></div>';
  }

  html += '<button class="wg-btn gray" onclick="wgCloseModal()">확인</button>';
  wgOpenModal(html, false);
}
window.wgPlanReview = wgPlanReview;

/* ══════════════════════════════════════════════════════════
   5. 기존 함수 후킹
   ══════════════════════════════════════════════════════════ */
function wgPatchPlanHooks() {
  if (window._wgPlanPatched) return;

  /* 일기 저장 후 계획 대조 */
  if (typeof window.saveDiary === 'function') {
    const _sd = window.saveDiary;
    window.saveDiary = function () {
      const r = _sd.apply(this, arguments);
      setTimeout(function () { try { wgPlanReview('diary'); } catch (e) {} }, 1600);
      return r;
    };
  }
  /* 논설문 저장 후 계획 대조 (함수가 있을 때만) */
  if (typeof window.saveEssay === 'function') {
    const _se = window.saveEssay;
    window.saveEssay = function () {
      const r = _se.apply(this, arguments);
      setTimeout(function () { try { wgPlanReview('essay'); } catch (e) {} }, 1600);
      return r;
    };
  }
  window._wgPlanPatched = true;
}

/* 입력 중 칩 상태 갱신 (디바운스) */
let _wgPlanTimer = null;
function wgWatchPlanTyping() {
  Object.keys(WG_PLAN_TARGET).forEach(function (t) {
    const ta = wg$(WG_PLAN_TARGET[t].ta);
    if (!ta || ta._wgPlanWatched) return;
    ta.addEventListener('input', function () {
      clearTimeout(_wgPlanTimer);
      _wgPlanTimer = setTimeout(wgRenderPlanBar, 500);
    });
    ta._wgPlanWatched = true;
  });
}

/* ══════════════════════════════════════════════════════════
   6. CSS · 초기화
   ══════════════════════════════════════════════════════════ */
function wgInjectPlanStyles() {
  if (document.getElementById('wgPlanStyles')) return;
  const css = [
    '.wg-planbar-wrap { margin: 8px 0; }',
    '.wg-plan-empty { font-size:12px; color:#888; padding:7px 10px; border:2px dashed #ddd;',
    '  border-radius:10px; display:flex; align-items:center; flex-wrap:wrap; gap:4px; }',
    '.wg-planbar { padding:10px 12px; border-radius:12px; background:#fffaf3;',
    '  border:2px solid #f0dec5; font-size:13px; line-height:1.6; }',
    '.wg-plan-head { display:flex; align-items:center; flex-wrap:wrap; gap:4px; }',
    '.wg-plan-edit { margin-left:auto; background:none; border:none; font-family:inherit;',
    '  font-size:11px; color:#888; cursor:pointer; text-decoration:underline; padding:0; }',
    '.wg-plan-goal { margin-top:6px; padding-top:6px; border-top:1px dashed #e5d4bb; font-size:12px; }',
    '.wg-chip-done { background:#e6f7ee !important; border-color:#7ed6a5 !important; color:#2c7a52 !important; }'
  ].join('\n');
  const st = document.createElement('style');
  st.id = 'wgPlanStyles';
  st.textContent = css;
  document.head.appendChild(st);
}

function wgPlanInit() {
  wgInjectPlanStyles();
  setTimeout(function () {
    try { wgPatchPlanHooks(); wgInjectPlanBar(); wgWatchPlanTyping(); } catch (e) {}
  }, 1500);
  setInterval(function () {
    try { wgInjectPlanBar(); wgWatchPlanTyping(); wgRenderPlanBar(); } catch (e) {}
  }, 3000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wgPlanInit);
} else {
  wgPlanInit();
}
