/* ============================================================
   13b-games-dodum.js
   ── 「지음 프로젝트」 글쓰기 게임 모듈 (구 13-writing-games.js 분할본 2/6)
   ── 담당: 오감 빙고 · 펫 단어 편식 · 맞춤법 몬스터 · 문장 늘리기 · 텔레파시 · 문장 다이어트 · 고장난 로봇

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

/* ══════════════════════════════════════════════════════════
   3.5 표현 프로필 [신규] — '오늘의 추천'을 약점 기반으로

   설계 원칙
     · 비용 0 · 결정적: 이미 있는 빙고 정규식만 재사용한다.
       AI 채점(richness)은 호출마다 흔들릴 수 있어 진단에 쓰지 않는다.
     · 측정하는 것은 '실력'이 아니라 **최근 사용 빈도**다.
       "요즘 비유를 안 썼다"는 사실이지, "비유를 못한다"가 아니다.
     · 그래서 학생에게는 점수·순위로 노출하지 않고
       추천 게임 한 개 + 이유 한 줄로만 보여준다.
     · 표본이 적거나(3편 미만) 이미 골고루 쓰고 있으면 추천하지 않고
       기존 날짜 시드 랜덤으로 돌아간다 (과잉 진단 방지).
   ══════════════════════════════════════════════════════════ */

const WG_EXPR_WINDOW = 10;   // 최근 몇 편을 표본으로 볼지
const WG_EXPR_MIN    = 3;    // 이 편수 미만이면 추천 안 함
const WG_EXPR_OK     = 0.6;  // 최저 범주도 이 비율 이상이면 '약점 없음'
const WG_EXPR_MINLEN = 40;   // 공백 제외 이 글자 수 미만이면 표본에서 제외

/** 문자열 간이 해시 — 같은 글을 두 번 집계하지 않기 위한 용도 */
function wgHashText(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** 일기 저장 시 호출 — 9개 표현 범주 사용 여부를 굴림 기록 */
function wgRecordExpr() {
  try {
    const ta = wg$('diary');
    const text = ta ? (ta.value || '') : '';
    if (text.replace(/\s/g, '').length < WG_EXPR_MINLEN) return;
    const p = wgLoad('expr', { log: [], last: '' });
    /* ⚠️ 중복 방지 키는 '내용 해시'여야 한다.
       날짜+글자수로 잡으면 길이가 같은 다른 글이 통째로 무시된다
       (초고→퇴고처럼 글자 수가 그대로인 수정도 흔하다). */
    const stamp = wgToday() + '|' + wgHashText(text);
    if (p.last === stamp) return;             // 같은 글 반복 저장 중복 집계 방지
    p.last = stamp;
    if (!Array.isArray(p.log)) p.log = [];
    p.log.push(wgBingoScan(text).map(function (b) { return b ? 1 : 0; }));
    if (p.log.length > WG_EXPR_WINDOW) p.log = p.log.slice(-WG_EXPR_WINDOW);
    wgSave('expr', p);
  } catch (e) {}
}

/** 최근 일기에서 가장 덜 쓰인 표현 범주. 표본 부족·약점 없음이면 null */
function wgWeakCell() {
  try {
    const p = wgLoad('expr', { log: [] });
    const log = Array.isArray(p.log) ? p.log : [];
    if (log.length < WG_EXPR_MIN) return null;
    const rates = [];
    for (let i = 0; i < WG_BINGO_CELLS.length; i++) {
      let sum = 0;
      for (let j = 0; j < log.length; j++) sum += (log[j][i] || 0);
      rates.push({ idx: i, rate: sum / log.length, cell: WG_BINGO_CELLS[i] });
    }
    const min = Math.min.apply(null, rates.map(function (r) { return r.rate; }));
    if (min >= WG_EXPR_OK) return null;          // 이미 골고루 쓰고 있음
    /* ⚠️ 동점 처리: 그냥 앞에서부터 고르면 배열 순서상 감각어(앞쪽)만
       계속 추천된다. 날짜 시드로 흩어 같은 동점이어도 날마다 바뀌게 한다. */
    const tied = rates.filter(function (r) { return r.rate === min; });
    if (tied.length === 1) return tied[0];
    return wgSeedPick(tied, 1, 'weak-' + wgToday())[0];
  } catch (e) { return null; }
}
window.wgWeakCell = wgWeakCell;

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
    wgOnWin('bingo');
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
      try { wgRecordExpr(); } catch (e) {}   /* [신규] 약점 기반 추천용 표현 프로필 */
      return result;
    };
    window._wgSaveDiaryPatched = true;
  }
}

/* ══════════════════════════════════════════════════════════
   5. 게임 ③ 맞춤법 몬스터 사냥
      - 사람이 검수한 문제은행 89문항 / 오류 유형 20종
      - 최근 출제 24문항 기억 → 반복 차단
      - ⚠️ AI 출제는 제거됨. AI가 만든 문제에서 정답 오류가 나온 적이
        있어(맞춤법은 오답이 곧 오학습), 정확성 보장을 위해
        검증된 문제은행에서만 출제한다. 되살리지 말 것.
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
  if (wgMeetCast('monster', wgStartMonsterHunt)) return;
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
    wgOnLose();
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
  wgBumpDaily('monster');
  wgOnWin('monster');
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
  if (_wgCombo.level === 2) { wgBumpDaily('combo'); wgOnWin('combo'); }   // 2단계 도달 시 미션 달성
  if (_wgCombo.level === 4) wgQuestBump('combo4');                          // 4단계 = 성장일지 목표

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
  if (wgMeetCast('alien', wgStartTelepathy)) return;
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
    wgBumpDaily('tele');
    wgOnWin('tele');
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

  wgOnLose();
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
  wgBumpDaily('diet');
  wgOnWin('diet');
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
  if (wgMeetCast('robot', wgStartRobot)) return;
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
    wgOnWin('robot');
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
    wgOnLose();
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
