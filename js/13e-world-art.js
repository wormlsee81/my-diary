/* ============================================================
   13e-world-art.js
   ── 「지음 프로젝트」 글쓰기 게임 모듈 (구 13-writing-games.js 분할본 5/6)
   ── 담당: 패배 위로 · 대충이/지움(악역) · ASCII 아트 · 장소 진척 · 월드보드

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
   16.9 악역 [v9 신규] — 대충이 & 지움

   설계 원칙: 「흐림은 악당이 아니다」는 원래 설정을 깨지 않는다.
     · 대충이 = 아이 안의 '이만하면 됐지' 하는 마음을 밖으로 꺼낸 것
                (외부의 적이 아니라 자기 유혹의 의인화)
     · 지움   = 흐림을 퍼뜨리지만 악의가 아니라 '상실의 아픔' 때문
                물리치지 않고 설득한다. 결말은 화해가 아니라 '떠남'.
   그림은 인라인 SVG (외부 이미지 의존 없음)
   ══════════════════════════════════════════════════════════ */

const WG_ART = {
  /* 대충이 — 축 늘어진 잿빛 덩어리, 졸린 눈, 하품 */
  daechung:
    '<svg viewBox="0 0 140 130" width="100%" height="100%" role="img" aria-label="대충이">' +
    '<ellipse cx="70" cy="112" rx="44" ry="8" fill="#00000014"/>' +
    '<path d="M26 92 q-4 -46 44 -48 q48 2 44 48 q2 16 -14 17 h-60 q-16 -1 -14 -17 z" fill="#c9c2b4"/>' +
    '<path d="M34 86 q-3 -38 36 -40 q39 2 36 40 q2 13 -11 14 h-50 q-13 -1 -11 -14 z" fill="#ddd7cb"/>' +
    '<path d="M50 66 q8 7 16 0" stroke="#6b6355" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M74 66 q8 7 16 0" stroke="#6b6355" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="70" cy="86" rx="8" ry="10" fill="#8a8175"/>' +
    '<ellipse cx="70" cy="89" rx="5" ry="6" fill="#6b6355"/>' +
    '<circle cx="44" cy="78" r="5" fill="#00000010"/><circle cx="96" cy="78" r="5" fill="#00000010"/>' +
    '<path d="M104 44 q7 -5 5 -12" stroke="#c9c2b4" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<path d="M112 34 q6 -4 4 -10" stroke="#c9c2b4" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".55"/>' +
    '<text x="118" y="26" font-size="13" fill="#a89f90" opacity=".8">z</text>' +
    '<text x="126" y="17" font-size="10" fill="#a89f90" opacity=".55">z</text>' +
    '</svg>',

  /* 지움 — 후드를 쓴 긴 형체, 얼굴이 비어 있고 발밑은 안개. 무섭기보다 쓸쓸하게 */
  jium:
    '<svg viewBox="0 0 140 150" width="100%" height="100%" role="img" aria-label="지움">' +
    '<defs><linearGradient id="wgJiumG" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#4a4a5e"/><stop offset="100%" stop-color="#2e2e3c"/>' +
    '</linearGradient>' +
    '<linearGradient id="wgFogG" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#cfcfe0" stop-opacity="0"/><stop offset="100%" stop-color="#cfcfe0" stop-opacity=".85"/>' +
    '</linearGradient></defs>' +
    '<path d="M70 16 q30 0 34 40 l8 62 q-18 10 -42 10 t-42 -10 l8 -62 q4 -40 34 -40 z" fill="url(#wgJiumG)"/>' +
    '<path d="M70 24 q22 0 25 30 q-11 12 -25 12 t-25 -12 q3 -30 25 -30 z" fill="#20202c"/>' +
    '<path d="M56 52 q14 -9 28 0" stroke="#8f8fa8" stroke-width="2" fill="none" opacity=".5" stroke-linecap="round"/>' +
    '<circle cx="70" cy="50" r="3.5" fill="#b9b9d4" opacity=".55"/>' +
    '<path d="M18 116 q22 -10 52 -10 t52 10 v22 q-24 10 -52 10 t-52 -10 z" fill="url(#wgFogG)"/>' +
    '<path d="M40 90 h26" stroke="#7b7b96" stroke-width="3" opacity=".35" stroke-linecap="round"/>' +
    '<path d="M46 100 h34" stroke="#7b7b96" stroke-width="3" opacity=".22" stroke-linecap="round"/>' +
    '<path d="M52 108 h18" stroke="#7b7b96" stroke-width="3" opacity=".12" stroke-linecap="round"/>' +
    '<path d="M108 42 q10 6 12 16" stroke="#cfcfe0" stroke-width="2" fill="none" opacity=".35" stroke-linecap="round"/>' +
    '<path d="M22 46 q-9 7 -10 17" stroke="#cfcfe0" stroke-width="2" fill="none" opacity=".3" stroke-linecap="round"/>' +
    '</svg>'
};

/* ── 대충이: 짧게 쓰고 저장할 때 나타나는 유혹 (하루 1회) ── */
const WG_LAZY_LINES = [
  '이만하면 됐잖아~ 누가 본다고.',
  '오~ 짧게 끝냈네! 역시 똑똑해. 놀러 가자!',
  '자세히 쓰면 손만 아파. 그치?',
  '어차피 아무도 자세히 안 읽어. 대충 하자~'
];

function wgLazyAppear() {
  try {
    const s = wgLoad('lazy', { date: '', shown: false, beaten: 0 });
    if (s.date !== wgToday()) { s.date = wgToday(); s.shown = false; }
    if (s.shown) return;
    s.shown = true;
    wgSave('lazy', s);

    const line = WG_LAZY_LINES[Math.floor(Math.random() * WG_LAZY_LINES.length)];
    wgNarrate(WG_PRI.lazy, 'lazy', function (remain) {
      wgQOpen(
        '<div class="wg-note" style="text-align:center;">😶‍🌫️ 누군가 나타났다</div>' +
        '<div class="wg-artbox">' + WG_ART.daechung + '</div>' +
        '<h3 style="text-align:center;margin:4px 0;">대충이</h3>' +
        '<div class="wg-saga-story">' + wgEsc(line) + '</div>' +
        '<div class="wg-saga-story" style="background:#f6f2ff;margin-top:8px;">🧚 …쟤 말 듣지 마. 근데 진짜로, 딱 <b>한 문장만</b> 더 쓰면 대충이는 사라져.</div>' +
        '<button class="wg-btn" onclick="wgLazyFight()">✍️ 한 문장 더 써 볼래</button>' +
        '<button class="wg-btn gray" onclick="wgLazyLet()">오늘은 이만</button>',
        remain);
    });
  } catch (e) {}
}

function wgLazyFight() {
  wgCloseModal();
  const ta = wg$('diary');
  if (ta) { ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) {} }
  const s = wgLoad('lazy', { date: wgToday(), shown: true, beaten: 0 });
  s.beaten = (s.beaten || 0) + 1;
  wgSave('lazy', s);
  wgPetSay('좋아! 대충이가 스르륵 사라졌어. 한 문장이면 충분했지? ✨');
  if (s.beaten >= 5) wgAddBadge('대충이 퇴치사');
}
window.wgLazyFight = wgLazyFight;

function wgLazyLet() {
  wgCloseModal();
  wgPetSay('그래, 오늘은 여기까지도 좋아. 쓴 것만으로 이미 잉크가 생겼어 🌱');
}
window.wgLazyLet = wgLazyLet;

/* ── 지움: 3막 서사 (챕터 2 → 챕터 4 → 진 엔딩 직전) ── */
const WG_JIUM_ACTS = {
  act1: {
    title: '먼발치의 그림자',
    scenes: [
      { art: 'jium', text: '갑자기 요정이 말을 멈췄어.<br><br>🧚 "…누가 보고 있어."' },
      { art: 'jium', text: '안개 속에 검은 형체가 서 있었어.<br>아무 말도 하지 않고, 그저 우리를 보고만 있었어.' },
      { art: 'jium', text: '그러다 스르륵— 안개에 섞여 사라졌어.<br><br>🧚 "…저건 <b>지움</b>이야. 흐림을 <b>일부러</b> 퍼뜨리고 다니는 존재."' }
    ]
  },
  act2: {
    title: '지움의 말',
    scenes: [
      { art: 'jium', text: '이번엔 지움이 먼저 말을 걸었어.<br><br>🖤 "왜 자꾸 적지?"' },
      { art: 'jium', text: '🖤 "적어 두면 나중에 더 아파.<br>나도 예전엔 전부 적어 뒀어. 하나도 빠짐없이."' },
      { art: 'jium', text: '🖤 "…그런데 그게 전부 사라졌을 때,<br>차라리 <b>처음부터 없었으면</b> 했어."' },
      { art: 'jium', text: '🧚 "그래서 세상의 이름을 지우고 다니는 거야?"<br><br>🖤 "아프지 않게 해 주는 거야. 이건 친절이야."' },
      { art: 'jium', text: '지움은 대답을 기다리지 않고 돌아섰어.<br>발밑에서 안개가 더 짙게 번졌어.' }
    ]
  },
  act3: {
    title: '떠남',
    scenes: [
      { art: 'jium', text: '지움이 네 책 앞에 서 있었어.<br>손을 뻗어 첫 장을 펼쳤어.' },
      { art: 'jium', text: '🖤 "…이 글씨. 서툴러."<br><br>🖤 "그런데 왜… <b>지워지지가 않지?</b>"' },
      { art: 'jium', text: '🧚 "이 아이는 <b>진짜로 본 것</b>만 적었거든.<br>진짜는 잘 안 지워져."' },
      { art: 'jium', text: '지움이 아주 오래 말이 없었어.<br><br>🖤 "…적어 두면, 정말 사라지지 않아?"' },
      { art: 'jium', text: '🖤 "그럼… 나도 언젠가 적어 볼까.<br>내가 <b>잃어버린 것</b>에 대해서."' },
      { art: 'jium', text: '지움이 돌아섰어.<br>그리고 처음으로 — <b>아무것도 지우지 않고</b> 안개 속으로 걸어갔어.<br><br>🧚 "…쫓아낸 게 아니야. 스스로 간 거야."' }
    ]
  }
};

let _wgAct = null, _wgActIdx = 0;

function wgPlayAct(key) {
  const a = WG_JIUM_ACTS[key];
  if (!a) return;
  _wgAct = a; _wgActIdx = 0;
  wgRenderAct();
}
window.wgPlayAct = wgPlayAct;

function wgRenderAct() {
  const a = _wgAct;
  if (!a) return;
  const sc = a.scenes[_wgActIdx];
  const last = (_wgActIdx >= a.scenes.length - 1);
  wgOpenModal(
    '<div class="wg-note" style="text-align:center;letter-spacing:2px;">— ' + wgEsc(a.title) + ' —</div>' +
    '<div class="wg-artbox dark">' + (WG_ART[sc.art] || '') + '</div>' +
    '<div class="wg-saga-story" style="font-size:14px;min-height:92px;line-height:1.9;">' + sc.text + '</div>' +
    '<div class="wg-note" style="text-align:center;">' + (_wgActIdx + 1) + ' / ' + a.scenes.length + '</div>' +
    '<button class="wg-btn" onclick="wgActNext()">' + (last ? '…' : '다음 →') + '</button>' +
    (last ? '' : '<button class="wg-btn gray" onclick="wgActSkip()">건너뛰기</button>')
  );
}

function wgActNext() {
  if (!_wgAct) { wgCloseModal(); return; }
  if (_wgActIdx >= _wgAct.scenes.length - 1) { wgActSkip(); return; }
  _wgActIdx++;
  wgRenderAct();
}
window.wgActNext = wgActNext;

function wgActSkip() {
  _wgAct = null;
  wgCloseModal();
  setTimeout(function () { wgCheckEnding(); }, 500);
}
window.wgActSkip = wgActSkip;

/** 챕터 진행에 맞춰 지움의 막을 재생 */
function wgCheckJium(clearedChapters) {
  try {
    const seen = wgLoad('jium', []);
    let key = null;
    if (clearedChapters >= 2 && seen.indexOf('act1') === -1) key = 'act1';
    else if (clearedChapters >= 4 && seen.indexOf('act2') === -1) key = 'act2';
    if (!key) return false;
    seen.push(key);
    wgSave('jium', seen);
    if (key === 'act1') { const m = wgLoad('cast', []); if (m.indexOf('jium') === -1) { m.push('jium'); wgSave('cast', m); } }
    wgNarrate(WG_PRI.jium, 'jium_' + key, function () { wgPlayAct(key); });
    return true;
  } catch (e) { return false; }
}

/** 진 엔딩 직전 3막(떠남) */
function wgCheckJiumFinal() {
  try {
    const seen = wgLoad('jium', []);
    if (seen.indexOf('act3') !== -1) return false;
    if (seen.indexOf('act2') === -1) return false;
    seen.push('act3');
    wgSave('jium', seen);
    wgAddBadge('지움을 배웅한 아이');
    wgNarrate(WG_PRI.jium, 'jium_act3', function () { wgPlayAct('act3'); });
    return true;
  } catch (e) { return false; }
}

/* ══════════════════════════════════════════════════════════
   16.10 돋움 심화 서사 [v10 신규]
     ① 몽타주  — 성공할수록 「얼굴을 잃은 이」의 얼굴이 또렷해짐
                 (4단계 SVG, 5회 성공 시 완전 복원 장면)
     ② 단어자판기 — 문장을 만들 때마다 「말의 밭」에 싹이 자람
     ③ 시 단어뽑기 — 새 인물 「고르는 이」 등장
   핵심: 활동 결과가 세계에 눈에 보이는 변화를 남기게 한다.
   ══════════════════════════════════════════════════════════ */

/** 얼굴 복원 SVG — step 0~3 (흐릴수록 blur가 크고 이목구비가 없음) */
function wgFaceArt(step) {
  const blur = [5.5, 3, 1.4, 0][Math.min(3, step)];
  const op = [0.35, 0.6, 0.85, 1][Math.min(3, step)];
  let feat = '';
  if (step >= 1) {   // 눈
    feat += '<ellipse cx="56" cy="62" rx="4.5" ry="5.5" fill="#4a4038"/>' +
            '<ellipse cx="84" cy="62" rx="4.5" ry="5.5" fill="#4a4038"/>';
  }
  if (step >= 2) {   // 코 + 눈썹
    feat += '<path d="M70 66 q3 10 -3 13" stroke="#8a7a68" stroke-width="3" fill="none" stroke-linecap="round"/>' +
            '<path d="M48 52 q8 -4 15 -1" stroke="#5d5145" stroke-width="3" fill="none" stroke-linecap="round"/>' +
            '<path d="M77 51 q7 -3 15 1" stroke="#5d5145" stroke-width="3" fill="none" stroke-linecap="round"/>';
  }
  if (step >= 3) {   // 입 (미소)
    feat += '<path d="M56 88 q14 12 28 0" stroke="#a8583f" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
            '<circle cx="45" cy="78" r="6" fill="#f3a89a" opacity=".45"/>' +
            '<circle cx="95" cy="78" r="6" fill="#f3a89a" opacity=".45"/>';
  }
  return '<svg viewBox="0 0 140 140" width="100%" height="100%" role="img" aria-label="얼굴을 잃은 이">' +
    '<defs><filter id="wgFaceB"><feGaussianBlur stdDeviation="' + blur + '"/></filter></defs>' +
    '<g filter="url(#wgFaceB)" opacity="' + op + '">' +
    '<ellipse cx="70" cy="74" rx="40" ry="46" fill="#f0d9c2"/>' +
    '<path d="M30 62 q6 -34 40 -34 t40 34 q-8 -14 -40 -14 t-40 14 z" fill="#6b5a48"/>' +
    feat +
    '</g>' +
    (step < 3 ? '<path d="M18 108 q26 -8 52 -8 t52 8 v14 q-26 8 -52 8 t-52 -8 z" fill="#d9d9e4" opacity="' + (0.5 - step * 0.15) + '"/>' : '') +
    '</svg>';
}

/** 말의 밭 SVG — 심은 씨앗 수에 따라 자람 */
function wgFieldArt(n) {
  let plants = '';
  const spots = [[34, 96], [58, 100], [82, 98], [106, 95], [46, 108], [94, 108]];
  for (let i = 0; i < Math.min(spots.length, n); i++) {
    const x = spots[i][0], y = spots[i][1];
    const big = (n >= 5 && i < 2);
    if (big) {
      plants += '<path d="M' + x + ' ' + y + ' v-30" stroke="#6b8f4e" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="' + x + '" cy="' + (y - 36) + '" r="13" fill="#8fc46a"/>' +
        '<circle cx="' + (x - 8) + '" cy="' + (y - 28) + '" r="9" fill="#7db457"/>' +
        '<circle cx="' + (x + 8) + '" cy="' + (y - 28) + '" r="9" fill="#a3d47f"/>';
    } else {
      plants += '<path d="M' + x + ' ' + y + ' v-14" stroke="#6b8f4e" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M' + x + ' ' + (y - 12) + ' q-9 -4 -10 -12 q9 1 10 12" fill="#8fc46a"/>' +
        '<path d="M' + x + ' ' + (y - 8) + ' q9 -4 10 -12 q-9 1 -10 12" fill="#a3d47f"/>';
    }
  }
  return '<svg viewBox="0 0 140 130" width="100%" height="100%" role="img" aria-label="말의 밭">' +
    '<path d="M10 100 q60 -14 120 0 v22 q-60 12 -120 0 z" fill="#c9a678"/>' +
    '<path d="M10 100 q60 -14 120 0 v6 q-60 12 -120 0 z" fill="#a8845a"/>' +
    plants +
    (n === 0 ? '<text x="70" y="60" font-size="12" fill="#b0a48f" text-anchor="middle">아직 아무것도 심지 않았어</text>' : '') +
    '</svg>';
}

/* ── ① 몽타주: 단계별 대사 + 실패 위로 + 완전 복원 ── */
function wgFaceStep() {
  const n = wgQuestGet('montage');
  return (n >= 5) ? 3 : (n >= 3) ? 2 : (n >= 1) ? 1 : 0;
}

const WG_FACE_LINES = {
  1: '👤 "…눈이 보여. 네가 눈 이야기를 해 줬거든. 조금만 더."',
  2: '👤 "코와 눈썹도 돌아왔어! 이제 거의 다 왔어. 한 번만 더 봐 줄래?"',
  3: '👤 "웃을 수 있게 됐어. …고마워. 나, 이렇게 생겼었구나."'
};

function wgMontageProgress(success) {
  try {
    if (!success) {
      wgPetSay('👤 "아직 흐릿해… 괜찮아. 다음엔 색이나 모양을 하나만 더 얹어 줘."');
      return;
    }
    const step = wgFaceStep();
    const seen = wgLoad('faceStep', { s: 0 });
    if (step > (seen.s || 0)) {
      seen.s = step;
      wgSave('faceStep', seen);
      if (step >= 3) {
        wgAddBadge('얼굴을 되찾아 준 아이');
        wgFireworks();
        wgNarrate(WG_PRI.place, 'faceFull', function (remain) {
          wgQOpen(
            '<div class="wg-note" style="text-align:center;letter-spacing:2px;">— 되찾은 얼굴 —</div>' +
            '<div class="wg-artbox">' + wgFaceArt(3) + '</div>' +
            '<div class="wg-saga-story">👤 "웃을 수 있게 됐어.<br><br>…고마워. 나, <b>이렇게 생겼었구나.</b>"</div>' +
            '<div class="wg-saga-story" style="background:#f6f2ff;margin-top:8px;">🧚 "봤지? 특별한 마법이 아니었어. 네가 <b>자세히 봐 준 것</b>뿐이야."</div>' +
            '<button class="wg-btn" onclick="wgCloseModal()">🌱 좋아</button>',
            remain);
        });
      } else {
        wgSayQueued(WG_FACE_LINES[step]);
      }
    }
  } catch (e) {}
}

/* ── ② 단어자판기: 밭에 씨앗이 쌓임 ── */
function wgFieldProgress() {
  try {
    const n = wgQuestGet('poemword');
    const seen = wgLoad('fieldSeen', { n: 0 });
    if (n <= (seen.n || 0)) return;
    seen.n = n;
    wgSave('fieldSeen', seen);
    if (n === 1 || n === 3 || n === 5) {
      const msg = (n === 1) ? '🎰 "첫 씨앗이 심겼어. 저기 봐, 벌써 싹이 텄어."'
                : (n === 3) ? '🎰 "세 알째. 밭이 제법 초록해졌군."'
                : '🎰 "다섯 알… 이제 <b>나무</b>가 자라기 시작했어. 네 밭이야."';
      if (n >= 5) wgAddBadge('말의 밭 주인');
      wgNarrate(WG_PRI.place, 'field' + n, function (remain) {
        wgQOpen(
          '<div class="wg-note" style="text-align:center;letter-spacing:2px;">— 말의 밭 —</div>' +
          '<div class="wg-artbox">' + wgFieldArt(n) + '</div>' +
          '<div class="wg-saga-story">' + msg + '</div>' +
          '<p class="wg-note" style="text-align:center;">심은 씨앗 ' + n + '알</p>' +
          '<button class="wg-btn" onclick="wgCloseModal()">🌱 좋아</button>',
          remain);
      });
    }
  } catch (e) {}
}

/* ── ③ 시 단어뽑기: 새 인물 「고르는 이」 ── */
const WG_PICKER_LINES = [
  '🕯️ "시에 쓸 말은 아무거나 되는 게 아니야. 골라야 해."',
  '🕯️ "많이 쓴다고 시가 되진 않아. <b>딱 맞는 하나</b>를 찾는 거야."',
  '🕯️ "마음에 걸리는 낱말이 있으면, 그게 네 시의 씨앗이야."'
];

function wgPickerSay() {
  try {
    const s = wgLoad('picker', { date: '', n: 0 });
    if (s.date !== wgToday()) { s.date = wgToday(); s.n = 0; }
    s.n += 1;
    wgSave('picker', s);
    wgQuestBump('poempick');
    if (s.n === 1) {
      wgMeetCast('picker');
      wgSayQueued(WG_PICKER_LINES[Math.floor(Math.random() * WG_PICKER_LINES.length)]);
    }
  } catch (e) {}
}

/* ── 돋움 상태판: 지금까지의 변화를 한눈에 (성장 일지에 표시) ── */
function wgDodumBoardHtml() {
  const face = wgFaceStep();
  const seeds = wgQuestGet('poemword');
  return '<div class="wg-saga-head" style="margin-top:14px;">🌱 말의 밭 — 돋움의 기록</div>' +
    '<div class="wg-board">' +
      '<div class="wg-board-cell"><div class="wg-board-art">' + wgFaceArt(face) + '</div>' +
        '<div class="wg-note" style="margin:0;">얼굴 복원 ' + face + ' / 3</div></div>' +
      '<div class="wg-board-cell"><div class="wg-board-art">' + wgFieldArt(Math.min(6, seeds)) + '</div>' +
        '<div class="wg-note" style="margin:0;">심은 씨앗 ' + seeds + '알</div></div>' +
    '</div>';
}

/* ══════════════════════════════════════════════════════════
   16.11 이음·틔움·지음 심화 서사 [v11 신규]
     이음  「하루의 방」   — 일기를 쓸수록 방에 불이 켜지고 채워짐
     틔움  「말문의 숲」   — 이야기를 주고받을수록 안개가 걷힘
     지음  「기록의 서고」 — 작품을 낼수록 책장이 채워짐
   돋움과 같은 원리: 활동이 세계에 눈에 보이는 흔적을 남긴다.
   ══════════════════════════════════════════════════════════ */

/** 하루의 방 — step 0~3 (일기 0 / 1+ / 5+ / 10+) */
function wgRoomArt(step) {
  const s = Math.min(3, step);
  const dark = [0.62, 0.4, 0.2, 0][s];
  let stuff = '';
  if (s >= 1) {  // 램프
    stuff += '<path d="M104 96 v-16" stroke="#8a7a68" stroke-width="3"/>' +
      '<path d="M94 80 h20 l-5 -12 h-10 z" fill="#f4c430"/>' +
      '<circle cx="104" cy="80" r="22" fill="#ffe9a8" opacity=".45"/>';
  }
  if (s >= 2) {  // 책상 + 공책
    stuff += '<rect x="26" y="86" width="56" height="6" rx="2" fill="#a8845a"/>' +
      '<rect x="30" y="92" width="5" height="18" fill="#8a6a44"/>' +
      '<rect x="73" y="92" width="5" height="18" fill="#8a6a44"/>' +
      '<rect x="40" y="76" width="26" height="10" rx="2" fill="#fdfbf4"/>' +
      '<path d="M44 80 h18 M44 83 h14" stroke="#c9c2b4" stroke-width="1.5"/>';
  }
  if (s >= 3) {  // 액자(요정이 그린 그림)
    stuff += '<rect x="34" y="26" width="34" height="28" rx="3" fill="#fdfbf4" stroke="#c9a678" stroke-width="3"/>' +
      '<circle cx="45" cy="36" r="5" fill="#ffd166"/>' +
      '<path d="M37 50 q9 -14 16 -4 t13 4 z" fill="#8fc46a"/>';
  }
  return '<svg viewBox="0 0 140 120" role="img" aria-label="하루의 방">' +
    '<rect x="8" y="8" width="124" height="104" rx="8" fill="#f3ead9"/>' +
    '<rect x="84" y="20" width="34" height="34" rx="3" fill="#bfd8ef" stroke="#9db9d4" stroke-width="2"/>' +
    '<path d="M101 20 v34 M84 37 h34" stroke="#9db9d4" stroke-width="2"/>' +
    '<rect x="8" y="100" width="124" height="12" fill="#d9c6a8"/>' +
    stuff +
    '<rect x="8" y="8" width="124" height="104" rx="8" fill="#1e1e2e" opacity="' + dark + '"/>' +
    '</svg>';
}

/** 말문의 숲 — step 0~3 (주고받은 횟수 0 / 1+ / 5+ / 12+) */
function wgForestArt(step) {
  const s = Math.min(3, step);
  const fog = [0.82, 0.55, 0.28, 0.05][s];
  let extra = '';
  if (s >= 2) {  // 새
    extra += '<path d="M96 34 q6 -5 11 0 q5 -5 11 0" stroke="#5d5145" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
  }
  if (s >= 3) {  // 햇살
    extra += '<circle cx="26" cy="26" r="12" fill="#ffd166" opacity=".8"/>' +
      '<path d="M26 8 v6 M26 38 v6 M8 26 h6 M38 26 h6" stroke="#ffd166" stroke-width="2.5" stroke-linecap="round"/>';
  }
  function tree(x, y, h, c) {
    return '<path d="M' + x + ' ' + y + ' v-' + h + '" stroke="#7a5c3a" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="' + x + '" cy="' + (y - h - 8) + '" r="17" fill="' + c + '"/>' +
      '<circle cx="' + (x - 12) + '" cy="' + (y - h + 2) + '" r="12" fill="' + c + '" opacity=".9"/>' +
      '<circle cx="' + (x + 12) + '" cy="' + (y - h + 2) + '" r="12" fill="' + c + '" opacity=".85"/>';
  }
  return '<svg viewBox="0 0 140 120" role="img" aria-label="말문의 숲">' +
    '<rect x="0" y="0" width="140" height="120" fill="#e8f2e4"/>' +
    tree(38, 100, 32, '#6fa855') + tree(96, 104, 26, '#82ba63') + tree(68, 96, 40, '#5d9448') +
    '<rect x="0" y="98" width="140" height="22" fill="#c9b98f"/>' +
    extra +
    '<rect x="0" y="0" width="140" height="120" fill="#dcdce8" opacity="' + fog + '"/>' +
    '</svg>';
}

/** 기록의 서고 — 낸 작품 수만큼 책이 꽂힘 */
function wgLibraryArt(n) {
  const colors = ['#e07a5f', '#81b29a', '#f2cc8f', '#8a7ce8', '#6fa855', '#d98cb3', '#5b9bd5', '#e5a663'];
  let books = '';
  const perShelf = 6;
  for (let i = 0; i < Math.min(12, n); i++) {
    const shelf = Math.floor(i / perShelf);
    const idx = i % perShelf;
    const x = 24 + idx * 16;
    const y = 40 + shelf * 40;
    const h = 26 + (i % 3) * 4;
    books += '<rect x="' + x + '" y="' + (y + (30 - h)) + '" width="12" height="' + h + '" rx="2" fill="' + colors[i % colors.length] + '"/>' +
      '<rect x="' + x + '" y="' + (y + (30 - h) + 4) + '" width="12" height="2" fill="#ffffff88"/>';
  }
  return '<svg viewBox="0 0 140 120" role="img" aria-label="기록의 서고">' +
    '<rect x="10" y="10" width="120" height="104" rx="6" fill="#8a6a44"/>' +
    '<rect x="16" y="16" width="108" height="92" rx="4" fill="#c9a678"/>' +
    '<rect x="16" y="68" width="108" height="6" fill="#8a6a44"/>' +
    '<rect x="16" y="102" width="108" height="6" fill="#8a6a44"/>' +
    books +
    (n === 0 ? '<text x="70" y="60" font-size="11" fill="#8a6a44" text-anchor="middle">아직 비어 있어</text>' : '') +
    '</svg>';
}

/* ── 진행 단계 계산 ── */
function wgRoomStep()   { const n = wgQuestGet('diary');  return n >= 10 ? 3 : n >= 5 ? 2 : n >= 1 ? 1 : 0; }
function wgForestStep() { const n = wgQuestGet('ttieum'); return n >= 12 ? 3 : n >= 5 ? 2 : n >= 1 ? 1 : 0; }

/* ── 이정표 장면 공통 ── */
function wgPlaceMilestone(key, art, title, text, badge) {
  const seen = wgLoad('placeMs', []);
  if (seen.indexOf(key) !== -1) return;
  seen.push(key);
  wgSave('placeMs', seen);
  if (badge) wgAddBadge(badge);
  wgFireworks();
  wgNarrate(WG_PRI.place, 'pm_' + key, function (remain) {
    wgQOpen(
      '<div class="wg-note" style="text-align:center;letter-spacing:2px;">— ' + wgEsc(title) + ' —</div>' +
      '<div class="wg-artbox">' + art + '</div>' +
      '<div class="wg-saga-story">' + text + '</div>' +
      '<button class="wg-btn" onclick="wgCloseModal()">🌱 좋아</button>',
      remain);
  });
}

/* ── 이음: 하루의 방이 밝아짐 ── */
function wgRoomProgress() {
  try {
    const st = wgRoomStep();
    const prev = wgLoad('roomStep', { s: 0 });
    if (st <= (prev.s || 0)) return;
    prev.s = st; wgSave('roomStep', prev);
    const texts = {
      1: '🧚 "방에 불이 하나 켜졌어.<br>네가 하루를 적었더니 이 방이 생긴 거야."',
      2: '🧚 "책상이 생겼어! 이제 여기서 마음 놓고 쓸 수 있겠다.<br>다섯 편이나 쌓였거든."',
      3: '🧚 "벽에 <b>내가 그린 그림</b>을 걸었어.<br>이제 여긴 진짜 <b>네 방</b>이야. 흐림은 여기 못 들어와."'
    };
    wgPlaceMilestone('room' + st, wgRoomArt(st), '하루의 방', texts[st], st >= 3 ? '하루의 방 주인' : null);
  } catch (e) {}
}

/* ── 틔움: 숲의 안개가 걷힘 ── */
function wgForestProgress() {
  try {
    const st = wgForestStep();
    const prev = wgLoad('forestStep', { s: 0 });
    if (st <= (prev.s || 0)) return;
    prev.s = st; wgSave('forestStep', prev);
    const texts = {
      1: '🧚 "안개가 조금 옅어졌어.<br>말을 주고받으면 이렇게 걷히는구나."',
      2: '🧚 "나무가 보여! 새소리도 들리고.<br>여기 이렇게 넓은 숲이었어?"',
      3: '🧚 "해가 들어왔어.<br>네가 말을 걸어 준 만큼 <b>숲이 깨어난 거야.</b>"'
    };
    wgPlaceMilestone('forest' + st, wgForestArt(st), '말문의 숲', texts[st], st >= 3 ? '숲을 깨운 아이' : null);
  } catch (e) {}
}

/* ── 지음: 서고가 채워짐 ── */
function wgLibraryProgress() {
  try {
    const n = wgQuestGet('book');
    const prev = wgLoad('bookSeen', { n: 0 });
    if (n <= (prev.n || 0)) return;
    prev.n = n; wgSave('bookSeen', prev);
    if (n !== 1 && n !== 3 && n !== 6) return;
    const texts = {
      1: '🧚 "네 <b>첫 책</b>이 꽂혔어.<br>이 책장에 놓인 건 영영 사라지지 않아. 약속할게."',
      3: '🧚 "세 권째. 책장이 제법 그럴듯해졌는걸?"',
      6: '🧚 "여섯 권…<br>이제 누가 물으면 이렇게 말해도 돼. <b>\'나 책 쓰는 사람이야\'</b>라고."'
    };
    wgPlaceMilestone('book' + n, wgLibraryArt(n), '기록의 서고', texts[n], n >= 6 ? '서고의 주인' : null);
  } catch (e) {}
}

/* ── 세계 상태판: 네 장소를 한눈에 (성장 일지) ── */
function wgWorldBoardHtml() {
  const face = wgFaceStep();
  const seeds = wgQuestGet('poemword');
  return '<div class="wg-saga-head" style="margin-top:14px;">🗺️ 내가 바꾼 세계</div>' +
    '<div class="wg-board">' +
      '<div class="wg-board-cell"><div class="wg-board-art">' + wgFaceArt(face) + '</div>' +
        '<div class="wg-note" style="margin:0;">돋움 · 얼굴 ' + face + '/3</div></div>' +
      '<div class="wg-board-cell"><div class="wg-board-art">' + wgFieldArt(Math.min(6, seeds)) + '</div>' +
        '<div class="wg-note" style="margin:0;">돋움 · 씨앗 ' + seeds + '알</div></div>' +
      '<div class="wg-board-cell"><div class="wg-board-art">' + wgRoomArt(wgRoomStep()) + '</div>' +
        '<div class="wg-note" style="margin:0;">이음 · 하루의 방 ' + wgRoomStep() + '/3</div></div>' +
      '<div class="wg-board-cell"><div class="wg-board-art">' + wgForestArt(wgForestStep()) + '</div>' +
        '<div class="wg-note" style="margin:0;">틔움 · 말문의 숲 ' + wgForestStep() + '/3</div></div>' +
      '<div class="wg-board-cell" style="grid-column:1/-1;"><div class="wg-board-art" style="width:110px;height:94px;">' + wgLibraryArt(wgQuestGet('book')) + '</div>' +
        '<div class="wg-note" style="margin:0;">지음 · 기록의 서고 ' + wgQuestGet('book') + '권</div></div>' +
    '</div>';
}

/* ══════════════════════════════════════════════════════════
   16.12 활동별 서사 보강 [v12 신규]
     그동안 비어 있던 활동에 이야기를 채운다.
       이음 — 논설문 / 퇴고 / 감상문 생각그물
       틔움 — 토론
       지음 — 시화
     신규 인물: 🎚️ 저울잡이(주장) · ✂️ 다듬는 이(퇴고)
     원칙: 대부분 펫 말풍선으로 (팝업 피로 방지),
           첫 경험만 인물 소개 장면.
   ══════════════════════════════════════════════════════════ */

const WG_ACT_LORE = {
  essay: [
    '🎚️ "주장은 무게가 있어. 근거 없이 던진 말은 가볍게 날아가 버리지."',
    '🎚️ "네 주장을 저울에 올려 봤어. …제법 묵직한데?"',
    '🎚️ "왜 그렇게 생각하는지를 붙이면, 말이 갑자기 무거워져."'
  ],
  revise: [
    '✂️ "처음 쓴 글이 완벽한 사람은 없어. 나도, 요정도, 어른들도."',
    '✂️ "고쳐 쓰는 건 <b>못 써서</b>가 아니야. <b>더 잘 쓸 수 있어서</b>야."',
    '✂️ "한 번 더 읽는 사람만 볼 수 있는 게 있어. 방금 네가 봤잖아."',
    '✂️ "흐림은 대충 쓴 글보다 <b>고치다 만 글</b>에 더 잘 스며. 끝까지 다듬자."'
  ],
  brain: [
    '🧚 "흩어져 있던 생각이 그물처럼 이어졌어. 이 순간이 제일 좋아."',
    '🧚 "머릿속에만 있던 게 밖으로 나오니까 보이지? 이게 첫걸음이야."'
  ],
  debate: [
    '🎚️ "맞서는 말도 필요해. 부딪혀야 진짜 생각이 나오거든."',
    '🎚️ "상대 말을 끝까지 듣는 사람이 결국 이기더라. 이상하지?"',
    '🎚️ "이기려고 하는 말과 <b>알아내려고 하는 말</b>은 달라."'
  ],
  poem: [
    '🕯️ "시는 덜어내는 글이야. 짧을수록 더 오래 남지."',
    '🕯️ "설명하지 마. <b>보여 줘.</b> 그게 시야."',
    '🕯️ "한 줄에 하루를 담을 수 있다면, 그건 마법이야."'
  ]
};

/** 활동 서사: 첫 경험이면 인물 소개, 이후엔 말풍선 (하루 1회) */
function wgActLore(key, castId) {
  try {
    const pool = WG_ACT_LORE[key];
    if (!pool) return;
    wgQuestBump('act_' + key);
    const n = wgQuestGet('act_' + key);

    if (n === 1 && castId) {          // 첫 경험 → 인물 등장
      wgMeetCast(castId);
      return;
    }
    const s = wgLoad('actLore', { date: '', seen: [] });
    if (s.date !== wgToday()) { s.date = wgToday(); s.seen = []; }
    if (s.seen.indexOf(key) !== -1) return;   // 하루 1회
    s.seen.push(key);
    wgSave('actLore', s);
    wgSayQueued(pool[Math.floor(Math.random() * pool.length)]);
  } catch (e) {}
}

/* ── 퇴고 이정표: 고쳐 쓰기는 따로 크게 기린다 ── */
function wgReviseMilestone() {
  try {
    const n = wgQuestGet('act_revise');
    if (n !== 1 && n !== 5 && n !== 15) return;
    const texts = {
      1:  '✂️ "처음으로 <b>고쳐 썼구나.</b><br><br>있잖아, 글을 잘 쓰는 사람과 못 쓰는 사람의 차이는<br>재능이 아니라 <b>몇 번 고쳐 썼느냐</b>래."',
      5:  '✂️ "다섯 번째 퇴고야.<br><br>이제 알겠지? 처음 쓴 글은 <b>재료</b>일 뿐이라는 걸."',
      15: '✂️ "열다섯 번…<br><br>너는 이제 <b>고쳐 쓸 줄 아는 사람</b>이야.<br>그건 쓸 줄 아는 것보다 훨씬 드문 능력이야."'
    };
    if (n >= 15) wgAddBadge('고쳐 쓰는 사람');
    wgFireworks();
    wgNarrate(WG_PRI.milestone, 'rev' + n, function (remain) {
      wgQOpen(
        '<div class="wg-note" style="text-align:center;letter-spacing:2px;">— 다듬는 손 —</div>' +
        '<div style="text-align:center;font-size:54px;margin:8px 0;">✂️</div>' +
        '<div class="wg-saga-story">' + texts[n] + '</div>' +
        '<button class="wg-btn" onclick="wgCloseModal()">🌱 좋아</button>',
        remain);
    });
  } catch (e) {}
}

/* ── 활동 훅 ── */
function wgPatchActivities() {
  // 이음 · 논설문 저장
  if (!window._wgEssayPatched && typeof window.saveEssay === 'function') {
    const _o = window.saveEssay;
    window.saveEssay = async function () {
      const r = await _o.apply(this, arguments);
      try { wgActLore('essay', 'scale'); } catch (e) {}
      return r;
    };
    window._wgEssayPatched = true;
  }
  // 이음 · 퇴고 (교육적 핵심)
  if (!window._wgRevisePatched && typeof window.reviseEssayWithAI === 'function') {
    const _o2 = window.reviseEssayWithAI;
    window.reviseEssayWithAI = async function () {
      const r = await _o2.apply(this, arguments);
      try { wgActLore('revise', 'trimmer'); wgReviseMilestone(); } catch (e) {}
      return r;
    };
    window._wgRevisePatched = true;
  }
  // 이음 · 감상문 생각그물 / 벤다이어그램
  if (!window._wgBrainPatched && typeof window.rvSubmitBrainMap === 'function') {
    const _o3 = window.rvSubmitBrainMap;
    window.rvSubmitBrainMap = async function () {
      const r = await _o3.apply(this, arguments);
      try { wgActLore('brain'); } catch (e) {}
      return r;
    };
    window._wgBrainPatched = true;
  }
  if (!window._wgVennPatched && typeof window.rvSubmitVenn === 'function') {
    const _o4 = window.rvSubmitVenn;
    window.rvSubmitVenn = async function () {
      const r = await _o4.apply(this, arguments);
      try { wgActLore('brain'); } catch (e) {}
      return r;
    };
    window._wgVennPatched = true;
  }
  // 틔움 · 토론
  if (!window._wgDebatePatched && typeof window.drawDebateTopic === 'function') {
    const _o5 = window.drawDebateTopic;
    window.drawDebateTopic = function () {
      const r = _o5.apply(this, arguments);
      try { wgActLore('debate', 'scale'); } catch (e) {}
      return r;
    };
    window._wgDebatePatched = true;
  }
  // 지음 · 시화
  if (!window._wgPoemSavePatched && typeof window.savePoem === 'function') {
    const _o6 = window.savePoem;
    window.savePoem = async function () {
      const r = await _o6.apply(this, arguments);
      try {
        wgActLore('poem', 'picker');
        wgQuestBump('book');            // 시화도 서고에 꽂힌다
        wgLibraryProgress();
      } catch (e) {}
      return r;
    };
    window._wgPoemSavePatched = true;
  }
}
