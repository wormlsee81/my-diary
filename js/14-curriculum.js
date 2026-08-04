/* ============================================================
   14-curriculum.js — 📖 단원 모드 (2022 개정 국어과 연동)

   목적
     "이번 주 국어 단원"을 고르면, 그 단원의 성취기준에 해당하는
     일기 미션·게임·활동만 앱 전체에서 골라 주는 수업 투입 레이어.

   ⚠️⚠️ 반드시 읽고 쓸 것 — 데이터 신뢰도 구분 ⚠️⚠️
     ① WG_STD (성취기준 코드·문구)
        → 교육부 고시 제2022-33호 [별책5] 국어과 교육과정 기준.
          curriculum-mapping-2022.md 에서 이미 원문 대조한 항목이다.
          ✅ 신뢰 가능.
     ② WG_UNITS (교과서 단원명·단원 번호)
        → **비어 있는 채로 출고된다.** 2022 개정 5~6학년 국어 교과서는
          2026학년도부터 처음 적용되어, 개발 시점에 단원명을 확정할 수
          없었다. 지어낸 단원명을 넣으면 교실에서 그대로 틀린 정보가
          되므로 의도적으로 비워 두었다.
        → 선생님이 실물 교과서를 보고 아래 두 방법 중 하나로 채운다:
             (a) 이 파일의 WG_UNITS 배열을 직접 편집 (권장·영구 반영)
             (b) 앱 안 「📖 단원」 → ✏️ 단원 직접 만들기 (기기에만 저장)
        → 단원명을 안 채워도 앱은 정상 동작한다.
          그 경우 단원 대신 '성취기준 영역'으로 고를 수 있게 자동 대체된다.

   로드 순서: 13f-games-init.js 뒤 (13번 계열의 wg* 유틸을 재사용)
   ============================================================ */
'use strict';

/* ══════════════════════════════════════════════════════════
   1. 성취기준 표 — 교육부 고시 제2022-33호 [별책5] 기준 ✅
      code : 성취기준 코드
      area : 영역 (듣말/읽기/쓰기/문법/문학/매체)
      text : 성취기준 문구 (요약)
   ══════════════════════════════════════════════════════════ */
const WG_STD = [
  { code: '6국01-07', area: '듣말', text: '절차와 규칙을 지키고 타당한 이유와 근거를 제시하며 토론한다' },
  { code: '6국02-04', area: '읽기', text: '글에 나타난 사실과 의견을 구분하고 필자와 자신의 의견을 비교한다' },
  { code: '6국03-01', area: '쓰기', text: '알맞은 내용을 선정하여 대상의 특성이 나타나게 설명하는 글을 쓴다' },
  { code: '6국03-02', area: '쓰기', text: '적절한 근거를 사용하고 인용의 출처를 밝히며 주장하는 글을 쓴다' },
  { code: '6국03-03', area: '쓰기', text: '체험한 일에 대한 감상을 나타내는 글을 쓴다' },
  { code: '6국03-05', area: '쓰기', text: '쓰기 과정을 점검·조정하며 글 전체를 통일성 있게 고쳐 쓴다' },
  { code: '6국04-03', area: '문법', text: '고유어와 관용 표현의 쓰임과 가치를 이해하고 상황에 맞게 표현한다' },
  { code: '6국04-04', area: '문법', text: '문장 성분을 이해하고 호응 관계가 올바른 문장을 구성한다' },
  { code: '6국04-06', area: '문법', text: '단어·문장·띄어쓰기를 민감하게 살펴 바르게 고치는 태도를 지닌다' },
  { code: '6국05-02', area: '문학', text: '비유적 표현의 효과에 유의하여 작품을 감상한다' },
  { code: '6국05-03', area: '문학', text: '소설이나 극을 읽고 인물, 사건, 배경을 파악한다' },
  { code: '6국05-04', area: '문학', text: '인상적인 부분을 중심으로 작품에 대한 의견을 나눈다' },
  { code: '6국05-05', area: '문학', text: '자신의 경험을 시, 소설, 극, 수필 등 적절한 갈래로 표현한다' },
  { code: '6국06-02', area: '매체', text: '뉴스 및 각종 정보 매체 자료의 신뢰성을 평가한다' },
  { code: '6국06-03', area: '매체', text: '적합한 양식과 수용자의 반응을 고려하여 복합양식 매체 자료를 제작·공유한다' },
  { code: '4국03-04', area: '쓰기', text: '(3~4학년군) 목적과 주제를 고려하여 독자에게 마음을 전하는 글을 쓴다' }
];

function wgStdInfo(code) {
  for (let i = 0; i < WG_STD.length; i++) if (WG_STD[i].code === code) return WG_STD[i];
  return null;
}

/* ══════════════════════════════════════════════════════════
   2. 앱 활동 ↔ 성취기준 매핑 ✅
      (curriculum-mapping-2022.md 의 표를 코드로 옮긴 것)
      go : 눌렀을 때 실행할 함수 이름 (없으면 안내만)
   ══════════════════════════════════════════════════════════ */
const WG_ACTIVITY = [
  { id: 'diary',    icon: '🎨', name: '이음 · 그림일기',        std: ['6국03-03', '6국03-05'], go: "launchApp('ieum')" },
  { id: 'explain',  icon: '📚', name: '이음 · 설명하는 글 미션', std: ['6국03-01'],             go: "launchApp('ieum')" },
  { id: 'letter',   icon: '✉️', name: '이음 · 편지 형식 미션',   std: ['4국03-04'],             go: "launchApp('ieum')" },
  { id: 'essay',    icon: '⚖️', name: '이음 · 주장하는 글',      std: ['6국03-02', '6국04-03'], go: "launchApp('ieum')" },
  { id: 'review',   icon: '📖', name: '이음 · 독서 감상문',      std: ['6국05-03', '6국05-04'], go: "launchApp('ieum')" },
  { id: 'relay',    icon: '🌱', name: '틔움 · 릴레이 동화',      std: ['6국05-05'],             go: "launchApp('ttieum')" },
  { id: 'debate',   icon: '🗣️', name: '틔움 · 토론',            std: ['6국01-07'],             go: "launchApp('ttieum')" },
  { id: 'metaphor', icon: '🌈', name: '돋움 · 비유 징검다리',    std: ['6국05-02'],             go: "launchApp('dodum')" },
  { id: 'poem',     icon: '🕯️', name: '돋움 · 시어 출력기',      std: ['6국05-05'],             go: "launchApp('dodum')" },
  { id: 'publish',  icon: '📰', name: '지음 · 출판(기사·상장)',  std: ['6국06-03'],             go: "launchApp('jieum')" },

  /* 게임 (13번 계열) */
  { id: 'g_monster', icon: '⚔️', name: '게임 · 맞춤법 몬스터',   std: ['6국04-06'],             go: 'wgStartMonsterHunt()' },
  { id: 'g_combo',   icon: '🪄', name: '게임 · 문장 늘리기',     std: ['6국04-04'],             go: 'wgStartCombo()' },
  { id: 'g_diet',    icon: '✂️', name: '게임 · 문장 다이어트',   std: ['6국03-05', '6국04-04'], go: 'wgStartDiet()' },
  { id: 'g_tele',    icon: '📡', name: '게임 · 텔레파시',        std: ['6국03-01'],             go: 'wgStartTelepathy()' },
  { id: 'g_temp',    icon: '🌡️', name: '게임 · 상상력 온도',     std: ['6국05-02'],             go: 'wgStartTemp()' },
  { id: 'g_auction', icon: '🔨', name: '게임 · 낱말 경매',       std: ['6국04-03'],             go: 'wgOpenAuction()' },
  { id: 'g_robot',   icon: '🤖', name: '게임 · 고장난 로봇',     std: ['6국03-01'],             go: 'wgStartRobot()' },
  { id: 'g_det',     icon: '🔍', name: '게임 · 기자 검증',       std: ['6국02-04', '6국06-02'], go: 'wgStartDetective()' },
  { id: 'g_speed',   icon: '🎤', name: '게임 · 60초 스피드런',   std: ['6국03-03'],             go: 'wgStartSpeedrun()' },
  { id: 'g_smuggle', icon: '🕵️', name: '게임 · 비밀 단어 밀수꾼', std: ['6국04-03'],            go: 'wgStartSmuggle()' },
  { id: 'g_truth',   icon: '🎭', name: '게임 · 진실 둘 거짓 하나', std: ['6국03-03'],           go: 'wgStartTruth()' }
];

/* ══════════════════════════════════════════════════════════
   3. 교과서 단원표 — ⚠️ 의도적으로 비어 있음 (위 헤더 주석 참고)

   채우는 법 (예시 형태만 보여 준다. 아래 주석을 풀고 실제 단원명으로 교체):

     const WG_UNITS = [
       { grade: '5-1', no: 1, name: '(교과서에 적힌 단원명)', std: ['6국05-02'] },
       { grade: '5-1', no: 2, name: '(교과서에 적힌 단원명)', std: ['6국03-01'] },
       ...
     ];

   · grade : '5-1' | '5-2' | '6-1' | '6-2'
   · no    : 단원 번호(숫자)
   · name  : 교과서에 인쇄된 단원명 그대로
   · std   : 그 단원의 성취기준 코드 배열 (교사용 지도서 앞부분에 나옴)
   ══════════════════════════════════════════════════════════ */
const WG_UNITS = [];

/* 사용자(선생님)가 앱 안에서 추가한 단원 — 이 기기에만 저장 */
function wgUserUnits() {
  try {
    const raw = localStorage.getItem('mdj_units');
    const a = raw ? JSON.parse(raw) : [];
    return Array.isArray(a) ? a : [];
  } catch (e) { return []; }
}
function wgSaveUserUnits(a) {
  try { localStorage.setItem('mdj_units', JSON.stringify(a)); } catch (e) {}
}
function wgAllUnits() { return WG_UNITS.concat(wgUserUnits()); }

/* ══════════════════════════════════════════════════════════
   4. 선택 상태 — 이번 주 단원 (또는 영역)
      { kind:'unit', grade, no, name, std:[] }  |  { kind:'area', area, std:[] }  |  null
   ══════════════════════════════════════════════════════════ */
function wgCurUnit() {
  try {
    const raw = localStorage.getItem('mdj_cur_unit');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function wgSetCurUnit(u) {
  try {
    if (u) localStorage.setItem('mdj_cur_unit', JSON.stringify(u));
    else localStorage.removeItem('mdj_cur_unit');
  } catch (e) {}
  wgRenderUnitChip();
  if (typeof wgUnitOnChange === 'function') wgUnitOnChange();
}

/** 지금 선택된 성취기준 코드 배열 (선택 없으면 빈 배열 = 필터 해제) */
function wgActiveStd() {
  const u = wgCurUnit();
  return (u && Array.isArray(u.std)) ? u.std : [];
}
window.wgActiveStd = wgActiveStd;

/** 활동 하나가 현재 단원에 해당하는지 */
function wgActivityMatches(act) {
  const on = wgActiveStd();
  if (!on.length) return true;
  for (let i = 0; i < act.std.length; i++) if (on.indexOf(act.std[i]) !== -1) return true;
  return false;
}

/* ══════════════════════════════════════════════════════════
   5. 홈 화면 칩 — 지금 어떤 단원인지 항상 보이게
   ══════════════════════════════════════════════════════════ */
function wgInjectUnitChip() {
  if (document.getElementById('wgUnitChip')) return;
  const grid = document.getElementById('appGridKo');
  if (!grid) return;
  const wrap = document.createElement('div');
  wrap.id = 'wgUnitChipWrap';
  wrap.style.cssText = 'width:100%;display:flex;justify-content:center;margin:2px 0 4px;';
  wrap.innerHTML = '<button id="wgUnitChip" class="wg-unit-chip" onclick="wgOpenUnitPicker()"></button>';
  grid.insertAdjacentElement('beforebegin', wrap);
  wgRenderUnitChip();
}

function wgRenderUnitChip() {
  const el = document.getElementById('wgUnitChip');
  if (!el) return;
  const u = wgCurUnit();
  if (!u) {
    el.className = 'wg-unit-chip';
    el.innerHTML = '📖 이번 주 단원 고르기';
  } else {
    el.className = 'wg-unit-chip on';
    const label = (u.kind === 'unit')
      ? (u.grade + ' ' + u.no + '단원 · ' + u.name)
      : (u.area + ' 영역');
    el.innerHTML = '📖 <b>' + wgEsc(label) + '</b> <span style="opacity:.7">— 바꾸기</span>';
  }
}

/* ══════════════════════════════════════════════════════════
   6. 단원 선택 모달
   ══════════════════════════════════════════════════════════ */
function wgOpenUnitPicker() {
  const units = wgAllUnits();
  const cur = wgCurUnit();
  let html = '<h3>📖 이번 주 국어 단원</h3>' +
    '<p class="wg-note">고르면 그 단원에 맞는 활동만 추천돼요. 안 골라도 전부 다 쓸 수 있어요!</p>';

  if (cur) {
    html += '<button class="wg-btn gray" style="margin-bottom:8px;" onclick="wgSetCurUnit(null);wgOpenUnitPicker();">✖️ 단원 선택 해제 (전체 보기)</button>';
  }

  if (units.length) {
    /* 인덱스로만 넘긴다 — 단원명에 따옴표가 들어가도 안전하도록 */
    const byGrade = {};
    units.forEach(function (u, i) {
      u._i = i;
      (byGrade[u.grade] = byGrade[u.grade] || []).push(u);
    });
    Object.keys(byGrade).sort().forEach(function (g) {
      html += '<div class="wg-stage">' + wgEsc(g) + '학기</div>';
      byGrade[g].sort(function (a, b) { return a.no - b.no; }).forEach(function (u) {
        const on = cur && cur.kind === 'unit' && cur.grade === u.grade && cur.no === u.no;
        html += '<button class="wg-menu-btn' + (on ? ' wg-unit-on' : '') + '" ' +
          'onclick="wgPickUnit(' + u._i + ')">' +
          u.no + '단원 · ' + wgEsc(u.name) +
          '<span class="wg-note">— ' + u.std.map(wgEsc).join(', ') + '</span></button>';
      });
    });
  } else {
    /* 단원표가 비었을 때: 성취기준 영역으로 대체 제공 */
    html +=
      '<div class="wg-banner">📗 <b>교과서 단원표가 아직 비어 있어요.</b><br>' +
      '2022 개정 5~6학년 국어 교과서 단원명은 앱에 미리 넣어 두지 않았어요. ' +
      '잘못된 단원명이 교실에서 그대로 쓰이는 걸 막기 위해서예요.<br>' +
      '아래 <b>영역</b>으로 먼저 쓰시거나, <b>✏️ 단원 직접 만들기</b>로 실제 단원명을 넣어 주세요.</div>';
  }

  html += '<div class="wg-stage">📚 성취기준 영역으로 고르기</div>';
  const areas = [];
  WG_STD.forEach(function (s) { if (areas.indexOf(s.area) === -1) areas.push(s.area); });
  areas.forEach(function (a) {
    const codes = WG_STD.filter(function (s) { return s.area === a; }).map(function (s) { return s.code; });
    const on = cur && cur.kind === 'area' && cur.area === a;
    const n = WG_ACTIVITY.filter(function (act) {
      return act.std.some(function (c) { return codes.indexOf(c) !== -1; });
    }).length;
    html += '<button class="wg-menu-btn' + (on ? ' wg-unit-on' : '') + '" onclick="wgPickArea(\'' + a + '\')">' +
      wgEsc(a) + ' 영역 <span class="wg-note">— 관련 활동 ' + n + '개</span></button>';
  });

  html +=
    '<button class="wg-btn" style="margin-top:10px;" onclick="wgOpenUnitEditor()">✏️ 단원 직접 만들기</button>' +
    '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>';

  wgOpenModal(html, true);
}
window.wgOpenUnitPicker = wgOpenUnitPicker;

function wgPickUnit(i) {
  const u = wgAllUnits()[i];
  if (!u) return;
  wgSetCurUnit({ kind: 'unit', grade: u.grade, no: u.no, name: u.name, std: u.std });
  wgCloseModal();
  wgShowUnitBoard();
}
window.wgPickUnit = wgPickUnit;

function wgPickArea(area) {
  const std = WG_STD.filter(function (s) { return s.area === area; }).map(function (s) { return s.code; });
  wgSetCurUnit({ kind: 'area', area: area, std: std });
  wgCloseModal();
  wgShowUnitBoard();
}
window.wgPickArea = wgPickArea;

/* ══════════════════════════════════════════════════════════
   7. 단원 보드 — 이 단원에 쓸 활동 목록
   ══════════════════════════════════════════════════════════ */
function wgShowUnitBoard() {
  const u = wgCurUnit();
  if (!u) return;
  const title = (u.kind === 'unit') ? (u.grade + ' ' + u.no + '단원 · ' + u.name) : (u.area + ' 영역');
  const acts = WG_ACTIVITY.filter(wgActivityMatches);

  let html = '<h3>📖 ' + wgEsc(title) + '</h3>' +
    '<p class="wg-note">이 단원에서 해 볼 수 있는 활동이에요.</p>';

  html += '<div class="wg-stage">🎯 성취기준</div>';
  u.std.forEach(function (c) {
    const s = wgStdInfo(c);
    html += '<div class="wg-banner" style="border-style:solid;background:#f6fbfa;border-color:#a8e0d6;">' +
      '<b>[' + wgEsc(c) + ']</b> ' + wgEsc(s ? s.text : '(성취기준 표에 없는 코드)') + '</div>';
  });

  html += '<div class="wg-stage">✍️ 이 단원 활동 ' + acts.length + '개</div>';
  if (!acts.length) {
    html += '<p class="wg-note">이 성취기준에 연결된 활동이 아직 없어요.</p>';
  } else {
    acts.forEach(function (a) {
      html += '<button class="wg-menu-btn" onclick="wgCloseModal();' + a.go + '">' +
        a.icon + ' ' + wgEsc(a.name) +
        '<span class="wg-note">— ' + a.std.map(wgEsc).join(', ') + '</span></button>';
    });
  }
  html += '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>';
  wgOpenModal(html, true);
}
window.wgShowUnitBoard = wgShowUnitBoard;

/* ══════════════════════════════════════════════════════════
   8. 단원 직접 만들기 (교사용)
   ══════════════════════════════════════════════════════════ */
function wgOpenUnitEditor() {
  let html = '<h3>✏️ 단원 직접 만들기</h3>' +
    '<p class="wg-note">교과서를 보고 그대로 입력해 주세요. 이 기기에만 저장돼요.</p>' +
    '<div style="display:flex;gap:6px;margin-bottom:8px;">' +
    '<select id="wgUeGrade" class="wg-input" style="flex:1;">' +
    ['5-1', '5-2', '6-1', '6-2'].map(function (g) { return '<option>' + g + '</option>'; }).join('') +
    '</select>' +
    '<input id="wgUeNo" class="wg-input" type="number" min="1" max="12" value="1" style="flex:1;" placeholder="단원 번호">' +
    '</div>' +
    '<input id="wgUeName" class="wg-input" maxlength="30" placeholder="단원명 (교과서에 적힌 그대로)" style="margin-bottom:8px;">' +
    '<div class="wg-stage">이 단원의 성취기준 (여러 개 선택 가능)</div>' +
    '<div id="wgUeStd" style="max-height:200px;overflow-y:auto;">';
  WG_STD.forEach(function (s) {
    html += '<label class="wg-check"><input type="checkbox" value="' + s.code + '"> ' +
      '<b>[' + s.code + ']</b> <span class="wg-note">' + wgEsc(s.text) + '</span></label>';
  });
  html += '</div>' +
    '<button class="wg-btn green" onclick="wgSaveUnitFromEditor()">💾 저장</button>' +
    '<button class="wg-btn gray" onclick="wgOpenUnitPicker()">← 뒤로</button>';

  const saved = wgUserUnits();
  if (saved.length) {
    html += '<div class="wg-stage">저장한 단원 ' + saved.length + '개</div>';
    saved.forEach(function (u, i) {
      html += '<div class="wg-banner" style="display:flex;align-items:center;gap:8px;">' +
        '<span style="flex:1;">' + wgEsc(u.grade + ' ' + u.no + '단원 · ' + u.name) + '</span>' +
        '<button class="wg-btn gray" style="width:auto;padding:4px 10px;font-size:12px;margin:0;" onclick="wgDeleteUnit(' + i + ')">삭제</button></div>';
    });
  }
  wgOpenModal(html, true);
}
window.wgOpenUnitEditor = wgOpenUnitEditor;

function wgSaveUnitFromEditor() {
  const grade = document.getElementById('wgUeGrade').value;
  const no = parseInt(document.getElementById('wgUeNo').value, 10);
  const name = (document.getElementById('wgUeName').value || '').trim();
  const std = Array.prototype.slice
    .call(document.querySelectorAll('#wgUeStd input:checked'))
    .map(function (c) { return c.value; });
  if (!name) { wgToast('단원명을 입력해 주세요!'); return; }
  if (!no || no < 1) { wgToast('단원 번호를 확인해 주세요!'); return; }
  if (!std.length) { wgToast('성취기준을 하나 이상 골라 주세요!'); return; }
  const list = wgUserUnits();
  list.push({ grade: grade, no: no, name: name, std: std });
  wgSaveUserUnits(list);
  wgToast('📖 단원이 저장되었어요!');
  wgOpenUnitPicker();
}
window.wgSaveUnitFromEditor = wgSaveUnitFromEditor;

function wgDeleteUnit(i) {
  const list = wgUserUnits();
  const gone = list[i];
  list.splice(i, 1);
  wgSaveUserUnits(list);
  const cur = wgCurUnit();
  if (gone && cur && cur.kind === 'unit' && cur.grade === gone.grade && cur.no === gone.no) wgSetCurUnit(null);
  wgOpenUnitEditor();
}
window.wgDeleteUnit = wgDeleteUnit;

/* ══════════════════════════════════════════════════════════
   9. 미션 뽑기 연동 — 단원이 켜져 있으면 그 성취기준 미션만

   drawMission() 은 04-ieum-diary.js 의 전역 함수라 여기서 감싼다.
   ⚠️ DIARY_MISSIONS 원본에는 성취기준 필드가 없다. 미션별 코드는
      아래 WG_MISSION_STD 로 '덧붙이는' 방식이라 원본 수정이 없다.
      (표에 없는 미션은 기본 [6국03-03] 체험 감상문으로 본다)
   ══════════════════════════════════════════════════════════ */
const WG_MISSION_STD = {
  m51: ['6국03-01'],   // 신입생 가이드 — 절차 설명
  m52: ['6국03-01'],   // 척척박사 사전 — 특성 설명
  m53: ['4국03-04']    // 편지 형식 마스터
};
const WG_MISSION_DEFAULT_STD = ['6국03-03'];

function wgMissionStd(m) {
  return (m && WG_MISSION_STD[m.id]) ? WG_MISSION_STD[m.id] : WG_MISSION_DEFAULT_STD;
}

function wgPatchDrawMission() {
  if (window._wgDrawMissionPatched) return;
  if (typeof window.drawMission !== 'function') return;
  if (typeof window.DIARY_MISSIONS === 'undefined') return;

  const _orig = window.drawMission;
  window.drawMission = function () {
    const on = wgActiveStd();
    if (!on.length) return _orig.apply(this, arguments);

    /* 이 단원에 맞는 미션만 후보로 남긴다 */
    const pool = DIARY_MISSIONS.filter(function (m) {
      return wgMissionStd(m).some(function (c) { return on.indexOf(c) !== -1; });
    });
    if (!pool.length) return _orig.apply(this, arguments);   // 후보 없으면 원래대로

    /* 원본과 같은 표시 절차를 따르되 후보만 좁힌다 */
    const m = pool[Math.floor(Math.random() * pool.length)];
    window.currentMission = m;
    window.missionDrawn = true;
    const t = wg$('mTitle'), d = wg$('mDesc'), ta = wg$('diary');
    if (t) t.textContent = '🎯 ' + m.title;
    if (d) d.textContent = m.desc;
    if (m.template && ta && !ta.value.trim()) ta.value = m.template;
    const fill = wg$('missionFill'), st = wg$('missionScoreText');
    if (fill) fill.style.width = ((window.curMissionScore || 0) * 10) + '%';
    if (st) st.textContent = (window.curMissionScore || 0) + '/10';
    wgToast('📖 이번 단원 미션 도착! 💌');
    return undefined;
  };
  window._wgDrawMissionPatched = true;
}

/** 단원이 바뀌면 일기 화면 상단 안내도 갱신 */
function wgUnitOnChange() {
  try { wgRenderUnitBanner(); } catch (e) {}
}

/* 일기 화면 안내 배너 */
function wgInjectUnitBanner() {
  if (document.getElementById('wgUnitBanner')) return;
  const mission = wg$('missionBox');
  if (!mission) return;
  const el = document.createElement('div');
  el.id = 'wgUnitBanner';
  el.style.display = 'none';
  mission.insertAdjacentElement('beforebegin', el);
  wgRenderUnitBanner();
}

function wgRenderUnitBanner() {
  const el = document.getElementById('wgUnitBanner');
  if (!el) return;
  const u = wgCurUnit();
  if (!u) { el.style.display = 'none'; el.innerHTML = ''; return; }
  const label = (u.kind === 'unit') ? (u.grade + ' ' + u.no + '단원 · ' + u.name) : (u.area + ' 영역');
  el.style.display = 'block';
  el.innerHTML = '<div class="wg-banner" style="border-style:solid;background:#f6fbfa;border-color:#a8e0d6;">' +
    '📖 <b>' + wgEsc(label) + '</b> 수업 중 — 미션이 이 단원에 맞춰 나와요 ' +
    '<button class="wg-btn gray" style="width:auto;padding:4px 10px;font-size:12px;margin:0 0 0 6px;" onclick="wgOpenUnitPicker()">바꾸기</button></div>';
}

/* ══════════════════════════════════════════════════════════
   10. CSS · 초기화
   ══════════════════════════════════════════════════════════ */
function wgInjectUnitStyles() {
  if (document.getElementById('wgUnitStyles')) return;
  const css = [
    '.wg-unit-chip { font-family:inherit; font-size:13px; padding:6px 16px; border-radius:14px; cursor:pointer;',
    '  background:#fff; color:var(--mint,#62b3a4); border:2px dashed var(--mint,#62b3a4); max-width:100%;',
    '  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
    '.wg-unit-chip.on { background:var(--mint-light,#eaf6f4); border-style:solid; }',
    '.wg-menu-btn.wg-unit-on { outline:3px solid var(--mint,#62b3a4); }',
    '.wg-check { display:block; padding:6px 4px; font-size:12px; line-height:1.5; cursor:pointer; border-bottom:1px solid #f0f0f0; }',
    '.wg-check input { margin-right:6px; }',
    '.wg-input { width:100%; padding:9px 12px; border:2px solid #ddd; border-radius:10px;',
    '  font-family:inherit; font-size:14px; outline:none; box-sizing:border-box; }',
    '.wg-input:focus { border-color:var(--mint,#62b3a4); }'
  ].join('\n');
  const st = document.createElement('style');
  st.id = 'wgUnitStyles';
  st.textContent = css;
  document.head.appendChild(st);
}

function wgUnitInit() {
  wgInjectUnitStyles();
  wgInjectUnitChip();
  /* 13번 계열이 UI를 다 주입한 뒤에 붙어야 하므로 살짝 늦게 */
  setTimeout(function () {
    try {
      wgPatchDrawMission();
      wgInjectUnitBanner();
      wgRenderUnitChip();
    } catch (e) {}
  }, 1400);
  /* 앱 화면 전환 때마다 배너 상태 재확인 (가벼운 폴링) */
  setInterval(function () { try { wgInjectUnitBanner(); wgRenderUnitBanner(); } catch (e) {} }, 3000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wgUnitInit);
} else {
  wgUnitInit();
}
