/* ============================================================
   13f-games-init.js
   ── 「지음 프로젝트」 글쓰기 게임 모듈 (구 13-writing-games.js 분할본 6/6)
   ── 담당: 서사 우선순위 큐 · 챕터 · 프롤로그 · 성장 일지 · 외부 함수 패치 · 초기화(wgInit)

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
   16.13 서사 우선순위 큐 [v13 신규]

   문제: 일기 한 편을 저장하면 이정표·장소진행·챕터·대충이 등이
         동시에 wgOpenModal을 호출해 서로 <b>덮어써서 사라졌다.</b>
   해결: 모든 서사 팝업을 큐에 넣고 <b>하나씩 순서대로</b> 재생.
         · 중요한 이야기가 먼저 (엔딩 > 지움 > 챕터 > 이정표 > …)
         · 한 번에 최대 3개까지만, 나머지는 다음 기회로 대기
         · 펫 말풍선도 최소 간격을 두고 차례로
   ══════════════════════════════════════════════════════════ */

const WG_PRI = {
  ending:  100,   // 엔딩
  jium:     90,   // 지움 3막
  chapter:  80,   // 챕터 승급
  milestone:70,   // 일기·퇴고 이정표
  place:    60,   // 장소 진행(얼굴·밭·방·숲·서고)
  meet:     50,   // 인물 첫 만남
  lazy:     40    // 대충이
};
const WG_Q_BURST_MAX = 3;   // 한 번에 연달아 보여 줄 최대 개수

let _wgQ = [];              // {pri, id, render}
let _wgQBusy = false;
let _wgQBurst = 0;
let _wgQTimer = null;

/** 서사 팝업을 큐에 등록. render(remain)은 모달을 여는 함수 */
function wgNarrate(pri, id, render) {
  try {
    if (_wgQ.some(function (x) { return x.id === id; })) return;   // 중복 차단
    _wgQ.push({ pri: pri, id: id, render: render });
    _wgQ.sort(function (a, b) { return b.pri - a.pri; });          // 높은 우선순위 먼저
    clearTimeout(_wgQTimer);
    _wgQTimer = setTimeout(wgQTick, 650);   // 같은 순간의 호출들을 모아서 정렬
  } catch (e) {}
}

function wgQTick() {
  try {
    if (_wgQBusy) return;
    if (!_wgQ.length) { _wgQBurst = 0; return; }
    if (_wgQBurst >= WG_Q_BURST_MAX) {
      // 이번 묶음은 여기까지 — 남은 이야기는 다음 활동 때 이어서
      if (_wgQ.length) {
        wgPetSay('📔 아직 들려줄 이야기가 ' + _wgQ.length + '개 남았어. 조금 이따 마저 해 줄게!');
      }
      _wgQBurst = 0;
      return;
    }
    const item = _wgQ.shift();
    _wgQBusy = true;
    _wgQBurst += 1;
    item.render(_wgQ.length);
  } catch (e) { _wgQBusy = false; }
}

/** 서사 모달이 닫히면 다음 이야기로 */
function wgQRelease() {
  if (!_wgQBusy) return;
  _wgQBusy = false;
  clearTimeout(_wgQTimer);
  _wgQTimer = setTimeout(wgQTick, 420);
}

/** 큐가 여는 모달 — 닫힘이 곧 '다음'이 되도록 */
function wgQOpen(html, remain, wide) {
  const tail = (remain > 0)
    ? '<div class="wg-note" style="text-align:center;">📔 이어질 이야기 ' + remain + '개</div>'
    : '';
  wgOpenModal(html + tail, wide);
}

/* ── 펫 말풍선도 겹치지 않게: 최소 간격을 두고 차례로 ── */
let _wgBubQ = [];
let _wgBubLast = 0;
const WG_BUB_GAP = 4200;    // 말풍선 사이 최소 간격(ms)

function wgSayQueued(msg) {
  _wgBubQ.push(msg);
  if (_wgBubQ.length > 3) _wgBubQ = _wgBubQ.slice(-3);   // 너무 밀리면 최근 것만
  wgBubTick();
}

function wgBubTick() {
  if (!_wgBubQ.length) return;
  const now = Date.now();
  const wait = Math.max(0, WG_BUB_GAP - (now - _wgBubLast));
  setTimeout(function () {
    if (!_wgBubQ.length) return;
    const m = _wgBubQ.shift();
    _wgBubLast = Date.now();
    wgPetSay(m);
    if (_wgBubQ.length) wgBubTick();
  }, wait);
}

/* ── Phase 2: 퀘스트 카운터 (챕터 목표 추적) ── */
function wgQuestAll() {
  return wgLoad('quest', {});
}
function wgQuestBump(key) {
  const q = wgQuestAll();
  q[key] = (q[key] || 0) + 1;
  wgSave('quest', q);
}
function wgQuestGet(key) {
  return wgQuestAll()[key] || 0;
}

/* ── 5개 챕터 정의 (펫 5단계와 대응) ──
   goals: 각 목표 {label, cur함수, goal}
   need : 이 챕터를 넘기려면 몇 개를 달성해야 하는지 (택N) */
function wgChapters() {
  const q = wgQuestAll();
  return [
    {
      icon: '🥚', name: '알', title: '제1장 — 깨어나는 잉크',
      story: '깜깜했어. 얼마나 오래 잠들었는지 나도 몰라. 그런데 어디선가 사각… 사각… 누군가 글자를 적는 소리가 들렸어. 그 소리가 나를 깨웠어. 조금만 더 써 줄래?',
      need: 2,
      goals: [
        { label: '그림일기 1편 쓰기', cur: q.diary || 0, goal: 1 },
        { label: '오감 빙고 한 줄 켜기', cur: (wgLoad('bingo', { maxRewarded: 0 }).maxRewarded || 0) >= 1 ? 1 : 0, goal: 1 },
        { label: '아무 글쓰기 게임 1번', cur: (q.anyGame || 0), goal: 1 }
      ]
    },
    {
      icon: '🐣', name: '아기새', title: '제2장 — 첫 눈뜨기',
      story: '눈을 떴어! 그런데 세상이 온통 흐릿해. 아, 내 눈이 나쁜 게 아니야 — 저것들이 흐려진 거야. 아무도 자세히 봐 주지 않아서. 네가 대신 봐 줄래? 네가 본 것을 말해 주면 나도 볼 수 있어.',
      need: 2,
      goals: [
        { label: '돋움 몽타주 검거 성공', cur: q.montage || 0, goal: 1 },
        { label: '오감 빙고 세 줄 켜기', cur: Math.min(3, wgLoad('bingo', { maxRewarded: 0 }).maxRewarded || 0), goal: 3 },
        { label: '텔레파시 성공', cur: wgLoad('tele', { wins: 0 }).wins || 0, goal: 1 }
      ]
    },
    {
      icon: '🌱', name: '새싹 요정', title: '제3장 — 말의 뿌리',
      story: '봐 봐, 내 몸에서 싹이 났어! 네가 멀리 떨어진 두 낱말을 이어 문장을 만들었잖아. 세상에 그 둘을 이어 본 사람은 아무도 없었어. 그래서 아무도 본 적 없는 싹이 돋은 거야. 낱말은 씨앗이야.',
      need: 2,
      goals: [
        { label: '단어 자판기로 마법 문장 만들기', cur: q.poemword || 0, goal: 1 },
        { label: '문장 늘리기 4단계 콤보', cur: q.combo4 || 0, goal: 1 },
        { label: '문장 다이어트 성공', cur: wgLoad('diet', { wins: 0 }).wins || 0, goal: 1 },
        { label: '상상력 온도 다이얼 도전', cur: wgLoad('temp', { plays: 0 }).plays || 0, goal: 1 }
      ]
    },
    {
      icon: '🧚', name: '꼬마 요정', title: '제4장 — 이야기의 날개',
      story: '날개가 생겼어! 이제 네 글을 그림으로 그릴 수 있어. 미리 말해 둘 게 있어 — 내 붓은 네 글이야. 대충 쓰면 나도 흐리게밖에 못 그려. 색과 소리와 냄새까지 적어 주면 그만큼 선명하게 그릴게.',
      need: 2,
      goals: [
        { label: 'AI 그림일기로 그림 완성', cur: q.diaryImg || 0, goal: 1 },
        { label: '고장난 로봇 임무 성공', cur: (wgLoad('robot', { clears: [] }).clears || []).length, goal: 1 },
        { label: '비밀 단어 밀수 성공', cur: wgLoad('smuggle', { wins: 0 }).wins || 0, goal: 1 },
        { label: '진실게임 도전', cur: q.truthTry || 0, goal: 1 }
      ]
    },
    {
      icon: '🧙', name: '글쓰기 마법사', title: '제5장 — 나만의 책',
      story: '이제 말해도 되겠다. 사실 나는 처음부터 마법을 부린 적이 없어. 흐림을 걷어낸 건 내 잉크가 아니라 네 글이었어. 진짜 마법사는 나였던 적이 없어 — 처음부터 너였어. 마지막으로, 우리 이야기를 책으로 지어 줄래? 적힌 것에는 흐림이 닿지 못하거든.',
      need: 2,
      goals: [
        { label: '그림일기 5편 쌓기', cur: Math.min(5, q.diary || 0), goal: 5 },
        { label: '기자 검증 게임 통과', cur: wgLoad('det', { hi: 0 }).hi || 0, goal: 1 },
        { label: '글쓰기 게임 뱃지 3개 모으기', cur: Math.min(3, (wgLoad('badges', []) || []).length), goal: 3 }
      ]
    }
  ];
}

/** 현재 몇 장까지 깼는지 (0~5) */
function wgChapterCleared() {
  const chs = wgChapters();
  let cleared = 0;
  for (let i = 0; i < chs.length; i++) {
    const done = chs[i].goals.filter(function (g) { return g.cur >= g.goal; }).length;
    if (done >= chs[i].need) cleared = i + 1; else break;
  }
  return cleared;
}

/* ── 프롤로그: 최초 1회만, 반드시 건너뛸 수 있게 ── */
const WG_PROLOGUE = [
  { art: '🌫️', text: '세상 모든 것에는 원래 이름과 이야기가 있었어.<br>바다가 왜 짠지, 담벼락의 금이 어떻게 생겼는지 — 누군가는 그것을 보고, 말하고, 적었지.' },
  { art: '🌁', text: '그런데 사람들이 바빠졌어.<br>대충 보고, "그냥 좋았어"라고만 말하고, 적지 않고 지나갔어.<br>아무도 봐 주지 않은 것부터 천천히 <b>색이 빠지기 시작했어.</b>' },
  { art: '💧', text: '이걸 <b>「흐림」</b>이라고 불러.<br>흐림을 걷어내는 건 딱 하나야 — <b>잉크.</b><br>잉크는 누군가 무언가를 자세히 보고 정확한 말로 적을 때, 그 글자 사이에서 배어 나와.' },
  { art: '🥚', text: '그 잉크를 다룰 수 있는 존재가 있어. <b>잉크 요정.</b><br>하지만 요정은 스스로 글을 쓸 수 없어. 그래서 알 속에 들어가 잠들었지.<br>자기를 깨워 줄 아이가 <b>글자를 적는 소리</b>를 기다리면서.' },
  { art: '✏️', text: '…사각. 사각.<br>지금, 알에 아주 작은 금이 갔어.' }
];
let _wgProIdx = 0;

function wgShowPrologue(force) {
  const seen = wgLoad('prologue', { done: false });
  if (seen.done && !force) return false;
  _wgProIdx = 0;
  wgRenderPrologue();
  return true;
}
window.wgShowPrologue = wgShowPrologue;

function wgRenderPrologue() {
  const p = WG_PROLOGUE[_wgProIdx];
  const last = (_wgProIdx >= WG_PROLOGUE.length - 1);
  wgOpenModal(
    '<div style="text-align:center;font-size:56px;margin:6px 0 10px;">' + p.art + '</div>' +
    '<div class="wg-saga-story" style="font-size:14px;min-height:96px;">' + p.text + '</div>' +
    '<div class="wg-note" style="text-align:center;margin-top:8px;">' + (_wgProIdx + 1) + ' / ' + WG_PROLOGUE.length + '</div>' +
    '<button class="wg-btn" onclick="wgProNext()">' + (last ? '📔 시작하기' : '다음 →') + '</button>' +
    '<button class="wg-btn gray" onclick="wgProSkip()">건너뛰기</button>'
  );
}

function wgProNext() {
  if (_wgProIdx >= WG_PROLOGUE.length - 1) { wgProSkip(); return; }
  _wgProIdx++;
  wgRenderPrologue();
}
window.wgProNext = wgProNext;

function wgProSkip() {
  wgSave('prologue', { done: true });
  try { const m = wgLoad('cast', []); if (m.indexOf('fairy') === -1) { m.push('fairy'); wgSave('cast', m); } } catch (e) {}
  wgCloseModal();
  wgPetSay('사각사각… 네 글씨 소리가 들려. 조금만 더 써 줄래?');
}
window.wgProSkip = wgProSkip;

/** 성장 일지 화면 */
function wgOpenSaga() {
  const chs = wgChapters();
  const cleared = wgChapterCleared();
  const curIdx = Math.min(cleared, chs.length - 1);

  const html = chs.map(function (ch, i) {
    const done = ch.goals.filter(function (g) { return g.cur >= g.goal; }).length;
    const isClear = (i < cleared);
    const isNow = (i === cleared);
    const locked = (i > cleared);

    if (locked) {
      return '<div class="wg-saga-ch locked"><div class="wg-saga-head">🔒 제' + (i + 1) + '장 — ???</div>' +
        '<div class="wg-note">앞 장을 끝내면 열려요</div></div>';
    }

    const goalsHtml = ch.goals.map(function (g) {
      const ok = g.cur >= g.goal;
      return '<div class="wg-mission ' + (ok ? 'on' : 'off') + '">' +
        '<span class="mk">' + (ok ? '✓' : '○') + '</span>' +
        '<span>' + wgEsc(g.label) + ' <span style="color:#aaa">(' + Math.min(g.cur, g.goal) + '/' + g.goal + ')</span></span>' +
        '</div>';
    }).join('');

    return '<div class="wg-saga-ch' + (isClear ? ' clear' : '') + (isNow ? ' now' : '') + '">' +
      '<div class="wg-saga-head">' + ch.icon + ' ' + wgEsc(ch.title) + (isClear ? ' <span style="color:#00b894">✓ 완료</span>' : '') + '</div>' +
      '<div class="wg-saga-story">' + wgEsc(ch.story) + '</div>' +
      (isClear ? '' :
        '<div class="wg-note" style="margin-top:6px;">📌 아래 중 <b>' + ch.need + '개</b>를 이루면 다음 장이 열려요 (' + done + '/' + ch.need + ')</div>' + goalsHtml) +
      '</div>';
  }).join('');

  const petNow = chs[curIdx];
  wgOpenModal(
    '<h3>📔 잉크 요정의 성장 일지</h3>' +
    '<div class="wg-saga-story" style="font-size:12.5px;font-style:normal;">' +
      '🌫️ 아무도 자세히 봐 주지 않은 것은 색을 잃어요. 이걸 <b>「흐림」</b>이라고 해요.<br>' +
      '💧 흐림을 걷어내는 건 <b>잉크</b> 하나뿐. 잉크는 네가 자세히 보고 정확히 적을 때 글자 사이에서 배어 나와요.<br>' +
      '🧚 잉크 요정은 잉크를 쓸 줄만 알지 만들 줄은 몰라요. 그래서 <b>네 글</b>이 필요해요.' +
    '</div>' +
    '<p class="wg-note">지금은 <b>' + petNow.icon + ' ' + wgEsc(petNow.name) + '</b> — ' +
    cleared + ' / ' + chs.length + '장 완료 · <span style="text-decoration:underline;cursor:pointer;" onclick="wgShowPrologue(true)">처음 이야기 다시 보기</span></p>' +
    html + wgWorldBoardHtml() + wgCastDexHtml() + wgEndingListHtml() +
    '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>',
    true
  );
}
window.wgOpenSaga = wgOpenSaga;

/** 챕터가 새로 깨졌는지 확인하고 축하 (게임/기능 성공 직후 호출) */
function wgCheckChapterUp() {
  try {
    const now = wgChapterCleared();
    const rec = wgLoad('sagaSeen', { n: 0 });
    if (now > (rec.n || 0)) {
      rec.n = now;
      wgSave('sagaSeen', rec);
      const chs = wgChapters();
      const next = chs[Math.min(now, chs.length - 1)];
      wgFireworks();
      if (wgCheckJium(now)) return;   // 지움 서사가 우선
      if (now >= 5) { setTimeout(function () { wgCheckEnding(); }, 1200); return; }
      wgNarrate(WG_PRI.chapter, 'chapter' + now, function (remain) {
        wgQOpen(
          '<h3>✨ 새로운 장이 열렸어요!</h3>' +
          '<div style="font-size:52px;text-align:center;margin:8px 0;">' + next.icon + '</div>' +
          '<div class="wg-saga-story" style="font-size:14px;">' + wgEsc(next.story) + '</div>' +
          '<p class="wg-note">📔 성장 일지에서 전체 이야기를 볼 수 있어요.</p>' +
          '<button class="wg-btn" onclick="wgOpenSaga()">📔 일지 보기</button>' +
          '<button class="wg-btn gray" onclick="wgCloseModal()">계속 쓰기</button>',
          remain);
      });
    }
  } catch (e) {}
}

/** 게임 성공 공통 처리: 세계관 대사 + 퀘스트 + 챕터 확인 */
function wgOnWin(key) {
  wgQuestBump('anyGame');
  wgLoreSay(key);
  wgCheckChapterUp();
  wgCheckEnding();
}

/* ── 외부 기능 훅: 돋움 몽타주 / 단어자판기 / AI 그림일기 / 일기 ── */
function wgPatchExternal() {
  // ① 돋움 몽타주 — 검거 성공(일치율 70%+) 감지
  if (!window._wgMontagePatched && typeof window.drawMontage === 'function') {
    const _orig = window.drawMontage;
    window.drawMontage = async function () {
      const r = await _orig.apply(this, arguments);
      try {
        const stamp = document.getElementById('mArrestStamp');
        const txt = stamp ? (stamp.textContent || '') : '';
        if (txt.indexOf('성공') !== -1) {
          wgQuestBump('montage');
          wgMeetCast('montage');
          wgOnWin('montage');
          wgMontageProgress(true);
        } else if (txt.indexOf('실패') !== -1) {
          wgOnLose();
          wgMontageProgress(false);
        }
      } catch (e) {}
      return r;
    };
    window._wgMontagePatched = true;
  }

  // ② 돋움 단어 자판기 — 두 낱말로 문장 완성 감지
  if (!window._wgPoemPatched && typeof window.dodumCheckPoem === 'function') {
    const _orig2 = window.dodumCheckPoem;
    window.dodumCheckPoem = async function () {
      const r = await _orig2.apply(this, arguments);
      try {
        const fb = document.getElementById('dodumWordFeedback');
        const t = fb ? (fb.textContent || '') : '';
        // 오류 문구가 아니면 완성으로 인정 (두 낱말 포함 + 길이 검증을 통과한 것)
        if (t && t.indexOf('빠졌어요') === -1 && t.indexOf('짧아요') === -1 && t.indexOf('읽고 있어요') === -1) {
          wgQuestBump('poemword');
          wgMeetCast('vending');
          wgOnWin('poemword');
          wgFieldProgress();
        }
      } catch (e) {}
      return r;
    };
    window._wgPoemPatched = true;
  }

  // ③ AI 그림일기 — 그림 생성 완료 감지
  if (!window._wgImagePatched && typeof window.generateImage === 'function') {
    const _orig3 = window.generateImage;
    window.generateImage = async function () {
      const r = await _orig3.apply(this, arguments);
      try {
        wgQuestBump('diaryImg');
        wgOnWin('diaryImg');
      } catch (e) {}
      return r;
    };
    window._wgImagePatched = true;
  }

  // ④ 일기 저장 — 편수 누적 (펫 편식 체크는 기존 패치가 담당)
  if (!window._wgDiaryQuestPatched && typeof window.saveDiary === 'function') {
    const _orig4 = window.saveDiary;
    window.saveDiary = function () {
      const r = _orig4.apply(this, arguments);
      try {
        wgQuestBump('diary');
        wgLoreSay('diary');
        wgCheckMilestone();
        wgRoomProgress();
        try { const _t = wgDiaryText(); if (_t && _t.length < 80) wgLazyAppear(); } catch (e2) {}
        wgCheckChapterUp();
      } catch (e) {}
      return r;
    };
    window._wgDiaryQuestPatched = true;
  }
}

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
  wgGreet();

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
      wgPatchExternal();
      wgPatchPlaces();
      wgPatchActivities();
    } catch (e) {}
  }, 1200);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wgInit);
} else {
  wgInit();
}
