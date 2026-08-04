/* ============================================================
   13d-world-hub.js
   ── 「지음 프로젝트」 글쓰기 게임 모듈 (구 13-writing-games.js 분할본 4/6)
   ── 담당: 오늘의 미션 · 게임 허브 · 세계관 대사 · 등장인물 도감 · 장소 서사 · 엔딩 · 인사/날씨

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
   2순위: 오늘의 미션 — 매일 3개, 날짜 시드로 선정.
   보상은 절제(완수 시 보너스 20💧, 일일 상한 내). 성취감 위주.
   각 게임의 '오늘 진척'을 자체 통계로 판정한다.
   ══════════════════════════════════════════════════════════ */

// 미션 후보 풀: {키, 라벨, 목표, 진척함수, 게임진입함수}
function wgMissionPool() {
  return [
    { id: 'bingo', label: '오감 빙고 한 줄 이상 켜기', goal: 1,
      prog: function () { const s = wgLoad('bingo', { date: '', maxRewarded: 0 }); return (s.date === wgToday()) ? Math.min(1, s.maxRewarded) : 0; },
      go: null, hint: '일기 화면에서 표현 쓰기' },
    { id: 'monster', label: '맞춤법 몬스터 2마리 처치', goal: 2,
      prog: function () { const s = wgLoad('monsterDaily', { date: '', n: 0 }); return (s.date === wgToday()) ? s.n : 0; },
      go: 'wgStartMonsterHunt' },
    { id: 'tele', label: '텔레파시 1번 성공', goal: 1,
      prog: function () { const s = wgLoad('teleDaily', { date: '', n: 0 }); return (s.date === wgToday()) ? s.n : 0; },
      go: 'wgStartTelepathy' },
    { id: 'diet', label: '문장 다이어트 1번 성공', goal: 1,
      prog: function () { const s = wgLoad('dietDaily', { date: '', n: 0 }); return (s.date === wgToday()) ? s.n : 0; },
      go: 'wgStartDiet' },
    { id: 'temp', label: '상상력 온도 다이얼 1번', goal: 1,
      prog: function () { const s = wgLoad('tempDaily', { date: '', n: 0 }); return (s.date === wgToday()) ? s.n : 0; },
      go: 'wgStartTemp' },
    { id: 'combo', label: '문장 늘리기 2단계 이상', goal: 1,
      prog: function () { const s = wgLoad('comboDaily', { date: '', n: 0 }); return (s.date === wgToday()) ? s.n : 0; },
      go: 'wgStartCombo' },
    { id: 'truth', label: '진실게임 1문제 도전', goal: 1,
      prog: function () { const s = wgLoad('truthDaily', { date: '', n: 0 }); return (s.date === wgToday()) ? s.n : 0; },
      go: 'wgStartTruth' }
  ];
}

/** 오늘의 미션 3개 선정 (날짜 시드로 고정) */
function wgTodayMissions() {
  return wgSeedPick(wgMissionPool(), 3, 'mission-' + wgToday());
}

/** 일일 진척 카운터 증가 (각 게임 성공 시 호출) */
function wgBumpDaily(key) {
  const s = wgLoad(key + 'Daily', { date: '', n: 0 });
  if (s.date !== wgToday()) { s.date = wgToday(); s.n = 0; }
  s.n += 1;
  wgSave(key + 'Daily', s);
}

/** 오늘의 미션 위젯 HTML */
function wgDailyMissionHtml() {
  const missions = wgTodayMissions();
  let doneCount = 0;
  const rows = missions.map(function (m) {
    const cur = m.prog();
    const done = cur >= m.goal;
    if (done) doneCount++;
    return '<div class="wg-mission ' + (done ? 'on' : 'off') + '">' +
      '<span class="mk">' + (done ? '✓' : '○') + '</span>' +
      '<span>' + wgEsc(m.label) + ' <span style="color:#aaa">(' + Math.min(cur, m.goal) + '/' + m.goal + ')</span></span>' +
      (!done && m.go ? '<span class="mgo" onclick="' + m.go + '()">하러가기</span>' : '') +
      '</div>';
  }).join('');

  const allDone = (doneCount >= missions.length);
  const claimed = wgLoad('missionClaim', { date: '' }).date === wgToday();
  const pct = Math.round((doneCount / missions.length) * 100);

  let footer;
  if (allDone && !claimed) {
    footer = '<div class="wg-daily-done"><button class="wg-btn" style="padding:7px 16px;" onclick="wgClaimMission()">🎁 완주 보너스 받기 (+20💧)</button></div>';
  } else if (allDone && claimed) {
    footer = '<div class="wg-daily-done">🎉 오늘 미션 완주! 내일 새 미션이 기다려요</div>';
  } else {
    footer = '';
  }

  return '<div class="wg-daily">' +
    '<div class="wg-daily-head"><span>📋 오늘의 미션</span><span style="font-size:12px;color:#888;">' + doneCount + '/' + missions.length + ' 완료</span></div>' +
    '<div class="wg-daily-bar"><div class="wg-daily-bar-fill" style="width:' + pct + '%"></div></div>' +
    rows + footer +
    '</div>';
}

/** 미션 완주 보너스 지급 (하루 1회) */
function wgClaimMission() {
  const claim = wgLoad('missionClaim', { date: '' });
  if (claim.date === wgToday()) { wgToast('오늘 보너스는 이미 받았어요!'); return; }
  // 실제로 다 완료했는지 재확인
  const missions = wgTodayMissions();
  const allDone = missions.every(function (m) { return m.prog() >= m.goal; });
  if (!allDone) { wgToast('아직 미션이 남았어요!'); return; }
  claim.date = wgToday();
  wgSave('missionClaim', claim);
  wgAddInk(20, '(오늘의 미션 완주!)');
  wgFireworks();
  wgOpenHub();   // 허브 새로고침
}
window.wgClaimMission = wgClaimMission;

/* ── 약점 표현 범주 → 추천 게임 매핑 ──────────────────────────
   각 게임이 실제로 훈련시키는 것과 범주를 맞춰 둔 표.
   (감각 4종은 모두 텔레파시로 모임 — 이름을 못 쓰고 감각 묘사만으로
    전달해야 하는 게임이라 감각어 부족에 가장 직접적으로 대응한다) */
const WG_WEAK_GAME = {
  sight:      { key: 'tele',    why: '눈에 보이는 걸 말로 그려 보기' },
  sound:      { key: 'tele',    why: '소리만으로 설명해 보기' },
  touch:      { key: 'tele',    why: '손끝 느낌을 말로 옮겨 보기' },
  smellTaste: { key: 'tele',    why: '냄새·맛을 말로 설명해 보기' },
  emotion:    { key: 'temp',    why: '마음을 두 가지 온도로 써 보기' },
  simile:     { key: 'temp',    why: '뻔한 표현을 참신하게 바꿔 보기' },
  dialogue:   { key: 'speed',   why: '말한 걸 그대로 글로 옮겨 보기' },
  mimetic:    { key: 'auction', why: '흉내 내는 말을 모아 두기' },
  number:     { key: 'combo',   why: '문장에 구체적인 정보를 붙여 보기' }
};

function wgOpenHub() {
  // 최초 1회: 세계관 프롤로그 (건너뛰기 가능)
  if (wgShowPrologue(false)) return;
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

  /* ── 오늘의 추천: 약점(최근 덜 쓴 표현) 기반, 없으면 날짜 시드 랜덤 ── */
  const RECO = ['tele', 'monster', 'combo', 'diet', 'temp', 'auction', 'smuggle', 'speed', 'truth', 'robot', 'det'];
  const weak = (typeof wgWeakCell === 'function') ? wgWeakCell() : null;
  const wmap = weak ? WG_WEAK_GAME[weak.cell.id] : null;
  const useWeak = !!(wmap && RECO.indexOf(wmap.key) !== -1);
  const reco = useWeak ? wmap.key : wgSeedPick(RECO, 1, 'reco-' + wgToday())[0];
  const star = function (k) { return (k === reco) ? ' <b style="color:#f4c430">⭐오늘의 추천</b>' : ''; };
  const recoNote = useWeak
    ? '<div class="wg-reco-note">🧚 <b>요즘 ' + wgEsc(weak.cell.label.replace(/^\S+\s*/, '')) +
      '</b> 표현이 뜸했어. 오늘은 <b>' + wgEsc(wmap.why) + '</b> 어때?' +
      '<span class="wg-note" style="display:block;margin-top:3px;">' +
      '최근 일기 ' + wgLoad('expr', { log: [] }).log.length + '편을 보고 고른 추천이야. 점수가 아니라 권유니까 다른 걸 골라도 좋아!</span></div>'
    : '';

  wgOpenModal(
    '<h3>🎮 글쓰기 게임 센터</h3>' +
    '<p class="wg-note">오늘 게임 잉크: <b>' + inkUsed + ' / ' + WG_INK_DAILY_CAP + '</b> · 잉크보다 값진 건 늘어나는 표현력!</p>' +
    '<button class="wg-saga-btn" onclick="wgOpenSaga()">📔 잉크 요정의 성장 일지 — ' +
      (function () { const c = wgChapterCleared(); const ch = wgChapters()[Math.min(c, 4)]; return ch.icon + ' ' + wgEsc(ch.name) + ' · ' + c + '/5장'; })() +
    '</button>' +
    wgWeatherHtml() +
    wgDailyMissionHtml() +
    recoNote +

    '<div class="wg-stage">🌱 돋움 — 표현·문장 훈련</div>' +
    '<button class="wg-menu-btn" onclick="wgStartTelepathy()">📡 텔레파시 (사물/감정)' + star('tele') + ' <span class="wg-note">— 이름 없이 설명만으로 전달 · 성공 ' + teleWins + '번</span>' + wgProgBar(teleWins, 5, '성공') + '</button>' +
    '<button class="wg-menu-btn" onclick="wgStartMonsterHunt()">⚔️ 맞춤법 몬스터 사냥' + star('monster') + ' <span class="wg-note">— 매판 새 문제 · 처치 ' + kills + '마리</span>' + wgProgBar(kills, 10, '처치') + '</button>' +
    '<button class="wg-menu-btn" onclick="wgStartCombo()">🪄 문장 늘리기 콤보' + star('combo') + ' <span class="wg-note">— 문장을 6겹까지 키우기</span></button>' +
    '<button class="wg-menu-btn" onclick="wgStartDiet()">✂️ 문장 다이어트' + star('diet') + ' <span class="wg-note">— 군더더기 빼고 핵심만 · 성공 ' + dietWins + '번</span>' + wgProgBar(dietWins, 5, '성공') + '</button>' +
    '<button class="wg-menu-btn" onclick="wgOpenAuction()">🔨 오늘의 낱말 경매' + star('auction') + ' <span class="wg-note">— ' + wgEsc(auState) + '</span></button>' +
    '<button class="wg-menu-btn" onclick="wgStartTemp()">🌡️ 상상력 온도 다이얼' + star('temp') + ' <span class="wg-note">— 뻔하게 vs 참신하게, 두 온도로 이어 쓰기 · 도전 ' + tempPlays + '번</span>' + wgProgBar(tempPlays, 5, '도전') + '</button>' +

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
   16.5 세계관 「잉크 요정의 성장 일지」 [v5 신규]

   설계 원칙: 새 세계관을 발명하지 않고, 이미 코드에 내장된
   서사를 드러낸다. 펫의 첫 대사가 "글을 쓰면 깨어날게요!"이고
   5단계 진화(🥚→🐣→🌱→🧚→🧙)가 이미 있으므로, 그것을
   모든 게임·기능을 꿰는 축으로 쓴다.

   서사가 실제 동작을 '설명'하도록 매핑 (임의 설정 아님):
     · 몽타주   = 요정의 눈  — 묘사가 정확할수록 또렷하게 그려짐
                  (실제로 묘사 일치율이 그림/점수를 결정)
     · 단어자판기 = 말의 씨앗 — 먼 두 낱말을 이으면 새 싹이 돋음
     · AI 그림일기 = 요정의 붓 — 글이 풍부할수록 그림이 선명
                  (실제로 richness가 그림 품질을 결정)
     · 잉크     = 요정을 자라게 하는 물

   Phase 1: 펫이 모든 게임에 반응하는 해설자
   Phase 2: 펫 5단계 = 5개 챕터, 목표는 여러 모듈에 걸침
            (자율성 보호를 위해 '택N' 방식)
   ══════════════════════════════════════════════════════════ */

/* ── Phase 1: 세계관 대사 풀 (게임별 3~4개, 반복 피로 방지) ── */
const WG_LORE = {
  bingo:    ['오감을 하나씩 켤 때마다 내 몸에 빛이 돌아 ✨', '네가 본 걸 말해주면 나도 보여!', '색깔이… 소리가… 점점 선명해져!'],
  monster:  ['틀린 말을 바로잡을 때마다 안개가 걷혀 🌫️', '맞춤법 몬스터는 말을 흐리게 만드는 녀석이야!', '고쳐 쓴 문장에서 맑은 기운이 나!'],
  combo:    ['문장이 길어질수록 뿌리가 깊어져 🌱', '한 겹씩 붙일 때마다 줄기가 자라!', '짧던 문장이 이렇게 커지다니!'],
  diet:     ['군더더기를 덜어내니 알맹이가 반짝여 ✂️', '짧아졌는데 더 또렷해졌어!', '덜어내는 것도 마법이야.'],
  tele:     ['이름 없이도 마음이 전해졌어 📡', '네 설명이 그림처럼 그려졌어!', '말로 그림을 그리는 재주가 있구나.'],
  temp:     ['뻔한 길과 놀라운 길, 둘 다 갈 줄 알다니 🌡️', '상상력의 온도를 네 마음대로 돌리는구나!', '차갑게도, 뜨겁게도 — 그게 이야기꾼의 힘이야.'],
  auction:  ['좋은 낱말은 심어 두면 몇 배로 돌아와 💧', '낱말을 사 모으는 수집가구나!'],
  smuggle:  ['감쪽같이 숨겼네, 아무도 못 찾았어 🤫', '낱말이 문장 속에 자연스레 녹았어!'],
  speed:    ['말이 글이 되는 순간이 제일 신기해 🎤', '입에서 나온 말에 옷을 입혀 보자!'],
  truth:    ['진짜 같은 거짓엔 늘 자세한 장면이 있더라 🎭', '디테일이 이야기를 진짜로 만들어!'],
  robot:    ['순서대로 빠짐없이 — 그게 설명의 마법이야 🤖', '네 말대로만 움직이는 로봇, 어렵지?'],
  det:      ['사실과 의견을 가르는 눈이 생겼구나 🔍', '좋은 기사는 둘을 섞지 않아!'],
  /* 돋움 본 기능 & 이음 그림일기 */
  montage:  ['네 말이 정확할수록 내 눈이 또렷해져 👁️', '묘사 하나로 얼굴이 떠올랐어!', '본 것을 그대로 옮기는 힘, 그게 첫 번째 마법이야.'],
  poemword: ['멀리 떨어진 두 낱말을 이으니 새 싹이 돋았어 🌿', '엉뚱한 만남에서 시가 태어나!', '아무도 안 이어본 두 말을 네가 이었어.'],
  diaryImg: ['네 글이 내 붓이 됐어 🖌️', '감각이 풍부할수록 그림이 선명해져!', '오늘 하루가 그림으로 남았네.'],
  diary:    ['오늘의 이야기, 잘 받았어 📖', '한 편이 쌓일 때마다 내가 자라.']
};

/** 세계관 톤으로 펫이 말하기 (+ 가끔 다른 게임 진척을 교차 언급) */
function wgLoreSay(key) {
  try {
    const pool = WG_LORE[key];
    if (!pool || !pool.length) return;
    let line = pool[Math.floor(Math.random() * pool.length)];
    // 30% 확률로 교차 언급 — 게임들이 하나의 여정임을 느끼게
    if (Math.random() < 0.3) {
      const cross = wgCrossRefLine(key);
      if (cross) line += ' ' + cross;
    }
    wgSayQueued(line);
  } catch (e) {}
}

/** 다른 게임의 누적 성과를 끌어와 한마디 덧붙임 */
function wgCrossRefLine(exceptKey) {
  const refs = [];
  const kills = wgLoad('monster', { kills: 0 }).kills || 0;
  const tele = wgLoad('tele', { wins: 0 }).wins || 0;
  const temp = wgLoad('temp', { plays: 0 }).plays || 0;
  const q = wgQuestAll();
  if (exceptKey !== 'monster' && kills >= 3) refs.push('지금까지 몬스터 ' + kills + '마리나 물리쳤잖아!');
  if (exceptKey !== 'tele' && tele >= 2) refs.push('텔레파시도 ' + tele + '번이나 통했고!');
  if (exceptKey !== 'temp' && temp >= 2) refs.push('상상력 온도도 ' + temp + '번 돌렸지!');
  if (exceptKey !== 'montage' && (q.montage || 0) >= 1) refs.push('몽타주도 그려냈던 그 눈으로!');
  if (exceptKey !== 'diaryImg' && (q.diaryImg || 0) >= 1) refs.push('네 글로 그림도 그렸잖아!');
  if (!refs.length) return '';
  return refs[Math.floor(Math.random() * refs.length)];
}

/* ══════════════════════════════════════════════════════════
   16.6 인물 열전 & 단계별 서사 [v6 신규]

   흩어져 있던 게임 속 AI 화자들(외계인·세관원·로봇·탐정…)을
   하나의 배역표로 묶는다. 각 인물은 '흐림에 무언가를 빼앗긴 이'
   라는 공통 배경을 갖고, 어느 모듈에 사는지가 정해져 있다.
   → 게임이 12개의 미니게임이 아니라 12번의 만남이 된다.
   ══════════════════════════════════════════════════════════ */

const WG_CAST = [
  { id: 'fairy',   em: '🧚', name: '잉크 요정',      home: '어디에나',
    lost: '스스로 글을 쓰는 법',
    intro: '나는 잉크를 쓸 줄만 알지 만들 줄은 몰라. 그래서 네가 필요해. 같이 가자!' },
  { id: 'montage', em: '👤', name: '얼굴을 잃은 이',  home: '돋움',
    lost: '자기 얼굴',
    intro: '…나는 내가 어떻게 생겼는지 잊어버렸어. 네가 본 대로 말해 줄래? 네 말이 정확할수록 내 얼굴이 돌아와.' },
  { id: 'monster', em: '👾', name: '말 흐리개',      home: '돋움',
    lost: '(흐림이 만든 존재)',
    intro: '히히, 나는 바른 말을 비틀어 흐리게 만드는 녀석이야. 나를 바로잡을 수 있겠어?' },
  { id: 'alien',   em: '👽', name: '이름 없는 손님',  home: '돋움',
    lost: '지구의 모든 이름',
    intro: '나는 아주 멀리서 왔어. 그런데 여기 물건들 이름을 하나도 몰라. 이름 말고 설명으로 알려 줄래?' },
  { id: 'vending', em: '🎰', name: '씨앗 자판기',    home: '돋움',
    lost: '주인',
    intro: '덜컹— 나는 말의 씨앗을 뱉는 낡은 기계야. 멀리 떨어진 씨앗 둘을 이어 심어 봐. 없던 싹이 돋을 거야.' },
  { id: 'thermo',  em: '🌡️', name: '온도계',        home: '돋움',
    lost: '눈금 하나',
    intro: '나는 이야기의 온도를 재. 뻔하면 차갑고, 놀라우면 뜨겁지. 둘 다 낼 줄 아는 사람이 진짜 이야기꾼이야.' },
  { id: 'auction', em: '🔨', name: '씨앗 경매사',    home: '돋움',
    lost: '단골 손님들',
    intro: '좋은 낱말은 공짜로 안 줘. 잉크를 걸어. 대신 그 낱말을 글에 심으면 값은 고스란히 돌려주지.' },
  { id: 'customs', em: '🛃', name: '세관원',        home: '이음',
    lost: '믿음',
    intro: '억지로 끼워 넣은 낱말은 뿌리를 못 내리고 곧 흐려져. 자연스럽게 스몄는지 내가 검사하겠어.' },
  { id: 'detect',  em: '🕵️', name: '이야기 탐정',    home: '이음',
    lost: '거짓을 못 알아보는 눈',
    intro: '진짜 같은 거짓엔 늘 자세한 장면이 있더군. 나를 속여 보게. 디테일이 곧 무기야.' },
  { id: 'robot',   em: '🤖', name: '고장난 로봇',    home: '틔움',
    lost: '차례(순서)',
    intro: '삐빅. 저는 시킨 것만, 시킨 그대로만 합니다. 하나라도 빠뜨리면… 이상한 일이 벌어져요.' },
  { id: 'scale',   em: '🎚️', name: '저울잡이',       home: '이음·틔움',
    lost: '한쪽으로만 기울던 저울',
    intro: '주장은 무게가 있어. 근거 없이 던진 말은 가볍게 날아가 버리지. 네 말을 저울에 올려 볼까?' },
  { id: 'trimmer', em: '✂️', name: '다듬는 이',      home: '이음',
    lost: '처음 쓴 원고들',
    intro: '고쳐 쓰는 건 못 써서가 아니야. 더 잘 쓸 수 있어서야. …그걸 아는 데 오래 걸렸어.' },
  { id: 'picker',  em: '🕯️', name: '고르는 이',      home: '돋움',
    lost: '자기가 고른 낱말들',
    intro: '시에 쓸 말은 아무거나 되는 게 아니야. 많이 쓴다고 시가 되지도 않아. 딱 맞는 하나를 골라내는 거지.' },
  { id: 'lazy',    em: '😶‍🌫️', name: '대충이',          home: '네 마음속', art: 'daechung',
    lost: '(흐림이 아니라 게으름에서 태어남)',
    intro: '이만하면 됐잖아~ 누가 본다고. 나랑 놀자, 응?' },
  { id: 'jium',    em: '🖤', name: '지움',            home: '안개 너머', art: 'jium',
    lost: '아주 소중했던 무언가',
    intro: '적어 두면 나중에 더 아파. …나는 아프지 않게 해 주는 거야.' },
  { id: 'editor',  em: '🔍', name: '기록 검사관',    home: '지음',
    lost: '흐려진 옛 기록들',
    intro: '사실과 의견이 뒤엉킨 기록에는 흐림이 스며. 무엇이 일어난 일이고 무엇이 네 생각인지 가려 두게.' }
];

function wgCastById(id) {
  return WG_CAST.filter(function (c) { return c.id === id; })[0];
}

/** 처음 만나는 인물이면 소개 장면을 띄우고 도감에 기록 */
function wgMeetCast(id, thenFn) {
  const met = wgLoad('cast', []);
  if (met.indexOf(id) !== -1) { wgRevisitSay(id); if (thenFn) thenFn(); return false; }
  const c = wgCastById(id);
  if (!c) { if (thenFn) thenFn(); return false; }
  met.push(id);
  wgSave('cast', met);
  if (met.length >= WG_CAST.length) {   // 마지막 인물 → 도감 완성 엔딩
    if (thenFn) setTimeout(thenFn, 100);
    setTimeout(function () { wgCheckEnding(); }, 600);
    return true;
  }
  _wgMeetThen = thenFn || null;
  wgNarrate(WG_PRI.meet, 'meet_' + id, function (remain) {
  wgQOpen(
    '<div class="wg-note" style="text-align:center;">✨ 새로운 만남</div>' +
    (c.art ? '<div class="wg-artbox">' + WG_ART[c.art] + '</div>' : '<div style="text-align:center;font-size:56px;margin:6px 0;">' + c.em + '</div>') +
    '<h3 style="text-align:center;margin:0 0 4px;">' + wgEsc(c.name) + '</h3>' +
    '<div class="wg-note" style="text-align:center;">사는 곳: ' + wgEsc(c.home) +
      ' · 흐림에 빼앗긴 것: ' + wgEsc(c.lost) + '</div>' +
    '<div class="wg-saga-story" style="margin-top:10px;">' + wgEsc(c.intro) + '</div>' +
    '<button class="wg-btn" onclick="wgMeetGo()">만나러 가기 →</button>',
    remain);
  });
  return true;
}
let _wgMeetThen = null;
function wgMeetGo() {
  const f = _wgMeetThen; _wgMeetThen = null;
  wgCloseModal();
  if (typeof f === 'function') setTimeout(f, 120);
}
window.wgMeetGo = wgMeetGo;

/** 인물 도감 HTML (성장 일지에 표시) */
function wgCastDexHtml() {
  const met = wgLoad('cast', []);
  const cells = WG_CAST.map(function (c) {
    const ok = met.indexOf(c.id) !== -1;
    return '<div class="wg-dex' + (ok ? '' : ' locked') + '"' +
      (ok ? ' onclick="wgDexShow(\'' + c.id + '\')"' : '') + '>' +
      '<div class="wg-dex-em">' + (ok ? c.em : '❔') + '</div>' +
      '<div class="wg-dex-nm">' + (ok ? wgEsc(c.name) : '???') + '</div></div>';
  }).join('');
  return '<div class="wg-saga-head" style="margin-top:14px;">🗂️ 만난 이들 — ' + met.length + ' / ' + WG_CAST.length + '</div>' +
    '<div class="wg-dexgrid">' + cells + '</div>';
}

function wgDexShow(id) {
  const c = wgCastById(id);
  if (!c) return;
  wgOpenModal(
    (c.art ? '<div class="wg-artbox">' + WG_ART[c.art] + '</div>' : '<div style="text-align:center;font-size:56px;margin:6px 0;">' + c.em + '</div>') +
    '<h3 style="text-align:center;margin:0 0 4px;">' + wgEsc(c.name) + '</h3>' +
    '<div class="wg-note" style="text-align:center;">사는 곳: ' + wgEsc(c.home) +
      ' · 흐림에 빼앗긴 것: ' + wgEsc(c.lost) + '</div>' +
    '<div class="wg-saga-story" style="margin-top:10px;">' + wgEsc(c.intro) + '</div>' +
    '<button class="wg-btn" onclick="wgOpenSaga()">← 일지로</button>' +
    '<button class="wg-btn gray" onclick="wgCloseModal()">닫기</button>'
  );
}
window.wgDexShow = wgDexShow;

/* ── 단계별 서사: 네 모듈에 각각의 장소 정체성 부여 ── */
const WG_PLACE = {
  dodum: { name: '말의 밭', line: '🌱 여기는 말의 밭이야. 문장이 되기 전의 씨앗들이 자라는 곳. 좋은 씨앗을 모아 두면 나중에 크게 쓰여.' },
  ieum:  { name: '하루의 방', line: '📖 여기는 하루의 방이야. 여기 적힌 하루에는 흐림이 닿지 못해. 네가 적으면 내가 그려 줄게.' },
  ttieum:{ name: '말문의 숲', line: '🌳 여기는 말문의 숲이야. 흐림 속에서 길을 잃은 이들이 있어. 말을 주고받으면 그들의 안개가 걷혀.' },
  jieum: { name: '기록의 서고', line: '📚 여기는 기록의 서고야. 여기 놓인 것은 영영 사라지지 않아. 네 이야기를 책으로 지어 두자.' }
};

/** 모듈 진입 시 장소 서사 한 줄 (하루 1회, 펫 말풍선으로 조용히) */
function wgPlaceLore(mod) {
  try {
    const p = WG_PLACE[mod];
    if (!p) return;
    const s = wgLoad('place', { date: '', seen: [] });
    if (s.date !== wgToday()) { s.date = wgToday(); s.seen = []; }
    if (s.seen.indexOf(mod) !== -1) return;   // 하루 1회만
    s.seen.push(mod);
    wgSave('place', s);
    wgSayQueued(p.line);
  } catch (e) {}
}

/** 돋움 탭별 서사 (탭 = 밭의 구역) */
const WG_DODUM_LORE = {
  montage: '👤 얼굴을 잃은 이가 기다리고 있어. 네가 본 대로 말해 주면 얼굴이 돌아와.',
  word:    '🎰 씨앗 자판기가 덜컹거려. 멀리 떨어진 두 씨앗을 이어 심어 봐.',
  poem:    '🌿 시의 씨앗을 고르는 구역이야. 마음에 드는 낱말을 골라 봐.'
};

/* ── 모듈/탭 진입 훅 ── */
function wgPatchPlaces() {
  if (!window._wgPlacePatched && typeof window.launchApp === 'function') {
    const _o = window.launchApp;
    window.launchApp = async function (n) {
      const r = await _o.apply(this, arguments);
      try { wgPlaceLore(n); } catch (e) {}
      return r;
    };
    window._wgPlacePatched = true;
  }
  // 틔움: 이야기 주고받기 → 숲의 안개가 걷힘
  if (!window._wgStoryPatched && typeof window.sendStory === 'function') {
    const _os = window.sendStory;
    window.sendStory = async function () {
      const r = await _os.apply(this, arguments);
      try { wgQuestBump('ttieum'); wgForestProgress(); } catch (e) {}
      return r;
    };
    window._wgStoryPatched = true;
  }
  // 지음: 그림책 저장 → 서고에 책이 꽂힘
  if (!window._wgBookPatched && typeof window.saveCurrentBook === 'function') {
    const _ob = window.saveCurrentBook;
    window.saveCurrentBook = async function () {
      const r = await _ob.apply(this, arguments);
      try { wgQuestBump('book'); wgLibraryProgress(); wgCheckEnding(); } catch (e) {}
      return r;
    };
    window._wgBookPatched = true;
  }
  if (!window._wgPoemPickPatched && typeof window.dodumGetPoeticWords === 'function') {
    const _op = window.dodumGetPoeticWords;
    window.dodumGetPoeticWords = async function () {
      const r = await _op.apply(this, arguments);
      try { wgPickerSay(); } catch (e) {}
      return r;
    };
    window._wgPoemPickPatched = true;
  }
  if (!window._wgDodumTabPatched && typeof window.switchDodumTab === 'function') {
    const _o2 = window.switchDodumTab;
    window.switchDodumTab = function (tab) {
      const r = _o2.apply(this, arguments);
      try {
        const line = WG_DODUM_LORE[tab];
        const s = wgLoad('dodumTabLore', { date: '', seen: [] });
        if (s.date !== wgToday()) { s.date = wgToday(); s.seen = []; }
        if (line && s.seen.indexOf(tab) === -1) {
          s.seen.push(tab); wgSave('dodumTabLore', s);
          wgSayQueued(line);
        }
      } catch (e) {}
      return r;
    };
    window._wgDodumTabPatched = true;
  }
}

/* ══════════════════════════════════════════════════════════
   16.7 엔딩 [v7 신규]
     ① 만남의 끝   — 인물 도감 11/11 완성
     ② 나만의 책   — 성장 일지 5장 완주
     ③ 다시, 사각사각 (진 엔딩) — 위 둘을 모두 이룬 뒤
   각 엔딩은 최초 1회 자동 재생, 이후 성장 일지에서 다시 볼 수 있다.
   ══════════════════════════════════════════════════════════ */

const WG_ENDINGS = [
  {
    id: 'cast', title: '만남의 끝', badge: '모두의 친구',
    cond: function () { return (wgLoad('cast', []) || []).length >= WG_CAST.length; },
    scenes: [
      { art: '🌈', text: '이상해. 오늘따라 세상이…<br><b>색이 돌아왔어.</b>' },
      { art: '👤', text: '👤 "내 얼굴, 이제 기억나. 네가 말해 준 그대로였어."<br><br>👽 "지구의 이름들을 다 배웠어. 이제 안 헤매."<br><br>🤖 "삐빅. 차례를 되찾았습니다. 감사합니다."' },
      { art: '🛃', text: '🛃 "낱말이 뿌리내리는 걸 오랜만에 봤군."<br><br>🕵️ "자네한테 여러 번 속았네. 훌륭한 이야기꾼이야."<br><br>🎰 "덜컹— 씨앗이 다 팔렸어. 이런 날은 처음이야."' },
      { art: '✨', text: '네가 만난 이들이 <b>모두 잃어버린 것을 되찾았어.</b><br><br>어떻게 했는지 알아?<br>특별한 마법을 쓴 게 아니야.<br><b>그냥 자세히 봐 준 거야.</b> 그게 다야.' }
    ]
  },
  {
    id: 'saga', title: '나만의 책', badge: '흐림을 걷은 아이',
    cond: function () { return wgChapterCleared() >= 5; },
    scenes: [
      { art: '🧙', text: '이제 말해도 되겠다.<br><br>사실 나는… <b>처음부터 마법을 부린 적이 없어.</b>' },
      { art: '💧', text: '흐림을 걷어낸 건 내 잉크가 아니었어.<br><b>네 글이었어.</b><br><br>나는 그저 네가 만든 잉크를 옮겨 담았을 뿐이야.' },
      { art: '🪄', text: '진짜 마법사는 나였던 적이 없어.<br><br><b>처음부터 너였어.</b>' },
      { art: '📚', text: '마지막으로 하나만 부탁할게.<br><br>우리가 지나온 이야기를 <b>책으로 지어 줘.</b><br>적힌 것은 사라지지 않아.<br>책이 된 이야기에는 흐림이 영영 닿지 못하거든.' }
    ]
  },
  {
    id: 'true', title: '다시, 사각사각', badge: '이야기의 주인',
    cond: function () {
      const seen = wgLoad('endings', []);
      return seen.indexOf('cast') !== -1 && seen.indexOf('saga') !== -1;
    },
    scenes: [
      { art: '🥚', text: '나는 이제 다시 알로 돌아가.<br>슬퍼하지 마. 잠깐 자는 것뿐이야.' },
      { art: '✏️', text: '언젠가 또 어떤 아이가<br>글자를 적는 소리를 내면<br><br>사각… 사각…<br><br>나는 다시 깨어날 거야.' },
      { art: '📖', text: '그때 그 아이에게 <b>네 책을 보여 줄게.</b><br><br>"이렇게 쓰면 돼" 하고.' },
      { art: '🌱', text: '안녕. 잘 지내.<br><br>그리고… <b>계속 써 줘.</b><br>네가 쓰는 한, 세상은 흐려지지 않아.' }
    ]
  }
];

let _wgEnd = null, _wgEndIdx = 0;

/** 조건이 충족된 미공개 엔딩이 있으면 재생 */
function wgCheckEnding() {
  try {
    const seen = wgLoad('endings', []);
    for (let i = 0; i < WG_ENDINGS.length; i++) {
      const e = WG_ENDINGS[i];
      if (seen.indexOf(e.id) !== -1) continue;
      if (!e.cond()) continue;
      if (e.id === 'true' && wgCheckJiumFinal()) return true;   // 떠남 먼저
      seen.push(e.id);
      wgSave('endings', seen);
      if (e.badge) wgAddBadge(e.badge);
      wgFireworks();
      wgNarrate(WG_PRI.ending, 'end_' + e.id, function () { wgPlayEnding(e.id); });
      return true;
    }
  } catch (err) {}
  return false;
}

function wgPlayEnding(id) {
  const e = WG_ENDINGS.filter(function (x) { return x.id === id; })[0];
  if (!e) return;
  _wgEnd = e; _wgEndIdx = 0;
  wgRenderEnding();
}
window.wgPlayEnding = wgPlayEnding;

function wgRenderEnding() {
  const e = _wgEnd;
  if (!e) return;
  const sc = e.scenes[_wgEndIdx];
  const last = (_wgEndIdx >= e.scenes.length - 1);
  wgOpenModal(
    '<div class="wg-note" style="text-align:center;letter-spacing:2px;">— ' + wgEsc(e.title) + ' —</div>' +
    '<div style="text-align:center;font-size:60px;margin:10px 0;">' + sc.art + '</div>' +
    '<div class="wg-saga-story" style="font-size:14.5px;min-height:110px;line-height:1.9;">' + sc.text + '</div>' +
    '<div class="wg-note" style="text-align:center;margin-top:8px;">' + (_wgEndIdx + 1) + ' / ' + e.scenes.length + '</div>' +
    '<button class="wg-btn" onclick="wgEndNext()">' + (last ? '🌟 마치기' : '다음 →') + '</button>' +
    (last ? '' : '<button class="wg-btn gray" onclick="wgEndSkip()">건너뛰기</button>')
  );
}

function wgEndNext() {
  if (!_wgEnd) { wgCloseModal(); return; }
  if (_wgEndIdx >= _wgEnd.scenes.length - 1) {
    const fin = _wgEnd;
    _wgEnd = null;
    wgOpenModal(
      '<h3 style="text-align:center;">🌟 ' + wgEsc(fin.title) + '</h3>' +
      '<p class="wg-note" style="text-align:center;">엔딩을 보았어요!' + (fin.badge ? ' 뱃지 「' + wgEsc(fin.badge) + '」 획득' : '') + '</p>' +
      '<p class="wg-note" style="text-align:center;">📔 성장 일지에서 언제든 다시 볼 수 있어요.</p>' +
      '<button class="wg-btn" onclick="wgOpenSaga()">📔 일지 보기</button>' +
      '<button class="wg-btn gray" onclick="wgCloseModal()">계속 쓰기</button>'
    );
    // 진 엔딩 조건이 방금 충족됐을 수 있으므로 한 번 더 확인
    setTimeout(function () { wgCheckEnding(); }, 400);
    return;
  }
  _wgEndIdx++;
  wgRenderEnding();
}
window.wgEndNext = wgEndNext;

function wgEndSkip() {
  const fin = _wgEnd;
  _wgEnd = null;
  wgCloseModal();
  if (fin) setTimeout(function () { wgCheckEnding(); }, 400);
}
window.wgEndSkip = wgEndSkip;

/** 성장 일지에 표시할 '본 엔딩' 목록 */
function wgEndingListHtml() {
  const seen = wgLoad('endings', []);
  const cells = WG_ENDINGS.map(function (e) {
    const ok = seen.indexOf(e.id) !== -1;
    const hint = (e.id === 'cast') ? '만난 이들 모두 모으기'
               : (e.id === 'saga') ? '성장 일지 5장 완주'
               : '위 두 엔딩을 모두 보기';
    return '<div class="wg-mission ' + (ok ? 'on' : 'off') + '">' +
      '<span class="mk">' + (ok ? '★' : '☆') + '</span>' +
      '<span>' + (ok ? wgEsc(e.title) : '???') + ' <span style="color:#aaa">— ' + wgEsc(hint) + '</span></span>' +
      (ok ? '<span class="mgo" onclick="wgPlayEnding(\'' + e.id + '\')">다시 보기</span>' : '') +
      '</div>';
  }).join('');
  return '<div class="wg-saga-head" style="margin-top:14px;">🌟 엔딩 — ' + seen.length + ' / ' + WG_ENDINGS.length + '</div>' + cells;
}

/* ══════════════════════════════════════════════════════════
   16.8 살아있는 서사 [v8 신규]
     ① 접속 인사 — 시간대 · 연속 방문 · 오랜만의 복귀
     ② 이정표     — 일기 1·5·10·20·30편의 특별한 장면
     ③ 오늘의 날씨 — 날짜 시드로 정해지는 그날의 세계 상태
     ④ 인물 재회   — 이미 만난 이의 두 번째 이후 대사
     ⑤ 부진 위로   — 잘 안 풀릴 때의 다정한 말
   톤 원칙: 죄책감을 주지 않는다. 재촉하지 않는다.
   ══════════════════════════════════════════════════════════ */

/* ── ① 접속 인사 ── */
const WG_TIME_GREET = {
  morning: ['🌅 좋은 아침! 밤사이 흐림이 살짝 내려앉았어. 같이 걷어낼까?',
            '🌅 아침 공기에서 무슨 냄새가 나? 그것도 잉크가 될 수 있어.'],
  noon:    ['🏫 학교 다녀왔어? 오늘 본 것 중에 제일 기억나는 게 뭐야?',
            '☀️ 한낮이야. 지금 창밖은 무슨 색이야?'],
  evening: ['🌆 오늘 하루 어땠어? 잊기 전에 적어 두자.',
            '🌆 해가 지네. 오늘 있었던 일 중 하나만 골라 볼래?'],
  night:   ['🌙 늦었네. 딱 한 줄만 적고 자도 좋아.',
            '🌙 조용한 밤이야. 이런 밤에 쓴 글은 유난히 잘 스며들더라.']
};

const WG_STREAK_LINES = {
  2:  '🔥 이틀째 네 소리가 들려. 계속 들려줘.',
  3:  '🔥 사흘 연속이야! 내 몸에 잉크가 도는 게 느껴져.',
  5:  '🔥 닷새째… 이 근처 흐림이 눈에 띄게 옅어졌어.',
  7:  '🎇 일주일 내내라니. 이런 아이는 처음이야, 정말로.',
  14: '🎇 두 주 동안 하루도 빠짐없이! 네 글씨를 눈 감고도 알아보겠어.',
  30: '🏆 한 달이야. 너는 이제 그냥 쓰는 아이가 아니라 <b>기록자</b>야.'
};

function wgHourBand() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'noon';
  if (h >= 18 && h < 23) return 'evening';
  return 'night';
}

function wgDaysBetween(a, b) {
  try { return Math.round((new Date(b) - new Date(a)) / 86400000); } catch (e) { return 0; }
}

/** 앱 진입 시 하루 한 번 인사 (연속 방문·복귀 반영) */
function wgGreet() {
  try {
    const today = wgToday();
    const s = wgLoad('visit', { last: '', streak: 0, greeted: '' });
    if (s.greeted === today) return;

    let line = '';
    if (!s.last) {
      line = '👋 처음 만났네. 나는 잉크 요정이야. 네가 쓰면 나도 자라.';
      s.streak = 1;
    } else {
      const gap = wgDaysBetween(s.last, today);
      if (gap === 0) {
        // 같은 날 재방문 — 인사 생략
      } else if (gap === 1) {
        s.streak = (s.streak || 0) + 1;
        line = WG_STREAK_LINES[s.streak] || '';
      } else if (gap >= 3) {
        // 복귀 — 절대 탓하지 않는다
        s.streak = 1;
        line = '🌱 한동안 조용했지? 괜찮아, 흐림은 언제든 다시 걷으면 돼.<br>돌아와 줘서 고마워.';
      } else {
        s.streak = 1;
      }
    }
    if (!line) line = wgSeedPick(WG_TIME_GREET[wgHourBand()], 1, 'greet-' + today + '-' + wgNick())[0];

    s.last = today;
    s.greeted = today;
    wgSave('visit', s);
    wgSayQueued(line);
  } catch (e) {}
}

/* ── ② 이정표: 일기 편수 ── */
const WG_MILESTONE = {
  1:  { art: '✒️', text: '네 <b>첫 글</b>이야.<br><br>이건 내가 영원히 기억할게.<br>흐림이 절대 못 지우는 곳에 넣어 뒀어.' },
  5:  { art: '📄', text: '벌써 다섯 편이네.<br><br>이제 네 글씨체가 익숙해졌어.<br>멀리서도 알아볼 수 있을 것 같아.' },
  10: { art: '📗', text: '열 편이야!<br><br>책 한 권의 시작이 이런 거래.<br>낱장이 모여서 어느 날 갑자기 책이 되는 거.' },
  20: { art: '📚', text: '스무 편.<br><br>네가 지나간 자리마다 색이 남아 있어.<br>돌아보면 보일 거야.' },
  30: { art: '🏛️', text: '서른 편…<br><br>이제 확실히 말할 수 있어.<br>너는 <b>기록자</b>야. 세상을 흐리지 않게 지키는 사람.' }
};

function wgCheckMilestone() {
  try {
    const n = wgQuestGet('diary');
    const m = WG_MILESTONE[n];
    if (!m) return;
    const seen = wgLoad('milestone', []);
    if (seen.indexOf(n) !== -1) return;
    seen.push(n);
    wgSave('milestone', seen);
    wgFireworks();
    wgNarrate(WG_PRI.milestone, 'ms' + n, function (remain) {
      wgQOpen(
        '<div class="wg-note" style="text-align:center;letter-spacing:2px;">— 일기 ' + n + '편 —</div>' +
        '<div style="text-align:center;font-size:58px;margin:10px 0;">' + m.art + '</div>' +
        '<div class="wg-saga-story" style="font-size:14px;line-height:1.9;">' + m.text + '</div>' +
        '<button class="wg-btn" onclick="wgCloseModal()">고마워 🌱</button>',
        remain);
    });
  } catch (e) {}
}

/* ── ③ 오늘의 날씨: 날짜 시드로 결정되는 세계의 상태 ── */
const WG_WEATHER = [
  { id: 'clear', w: 60, em: '☀️', name: '맑음',       line: '오늘은 흐림이 옅어. 뭘 써도 잘 스밀 거야.' },
  { id: 'ink',   w: 12, em: '🌧️', name: '잉크비',     line: '잉크비가 내려! 이런 날엔 표현이 유난히 잘 떠올라.' },
  { id: 'fog',   w: 12, em: '🌫️', name: '짙은 흐림',  line: '오늘은 흐림이 짙어. 평소보다 <b>더 자세히</b> 봐야 걷힐 거야.' },
  { id: 'wind',  w: 8,  em: '🍃', name: '낱말 바람',   line: '낱말 바람이 불어. 엉뚱한 말들이 자꾸 날아와.' },
  { id: 'star',  w: 8,  em: '✨', name: '잉크별',      line: '밤새 잉크별이 떨어졌대. 오늘 쓴 글은 오래 반짝일 거야.' }
];

function wgTodayWeather() {
  const rnd = wgSeedRand('weather-' + wgToday())();
  const total = WG_WEATHER.reduce(function (a, b) { return a + b.w; }, 0);
  let acc = 0, pick = WG_WEATHER[0];
  const target = rnd * total;
  for (let i = 0; i < WG_WEATHER.length; i++) {
    acc += WG_WEATHER[i].w;
    if (target <= acc) { pick = WG_WEATHER[i]; break; }
  }
  return pick;
}

function wgWeatherHtml() {
  const w = wgTodayWeather();
  return '<div class="wg-weather"><span class="wg-w-em">' + w.em + '</span>' +
    '<span><b>오늘의 하늘 — ' + wgEsc(w.name) + '</b><br>' +
    '<span class="wg-note" style="margin:0;">' + w.line + '</span></span></div>';
}

/* ── ④ 인물 재회: 두 번째 이후에 듣는 말 ── */
const WG_REVISIT = {
  alien:   ['👽 또 왔구나! 지난번 설명, 아직도 기억나.', '👽 이번엔 어떤 걸 알려 줄 거야?'],
  monster: ['👾 흥, 이번엔 안 질 거야!', '👾 또 너냐… 이번 문제는 좀 어려울걸.'],
  thermo:  ['🌡️ 눈금 준비됐어. 오늘은 몇 도까지 올려 볼래?'],
  auction: ['🔨 어서 와. 오늘 들어온 씨앗은 물건이야.'],
  customs: ['🛃 또 뭔가 숨겨 왔군. …이번엔 못 찾을지도 모르겠어.'],
  detect:  ['🕵️ 자네 이야기는 늘 흥미로워. 오늘도 속여 보게.'],
  robot:   ['🤖 삐빅. 지난번보다 나은 지시를 기대합니다.'],
  editor:  ['🔍 기록을 가져왔나? 사실과 의견부터 가르지.'],
  montage: ['👤 네 덕에 얼굴이 조금 더 또렷해졌어. 또 봐 줄래?'],
  vending: ['🎰 덜컹— 오늘의 씨앗도 뽑아 가.']
};

function wgRevisitSay(id) {
  try {
    const pool = WG_REVISIT[id];
    if (!pool || Math.random() > 0.35) return;   // 35%만 — 매번 뜨면 성가심
    wgPetSay(pool[Math.floor(Math.random() * pool.length)]);
  } catch (e) {}
}

/* ── ⑤ 부진 위로: 잘 안 풀릴 때 ── */
const WG_COMFORT = [
  '괜찮아. 한 번에 되는 게 오히려 이상한 거야.',
  '틀린 만큼 또렷해져. 진짜야.',
  '조금 쉬었다 해도 돼. 흐림은 도망 안 가.',
  '나도 처음엔 알 껍질도 못 깼는걸.',
  '지금 막힌 그 자리가 제일 많이 자라는 자리래.'
];

function wgOnLose() {
  try {
    const s = wgLoad('lose', { date: '', n: 0 });
    if (s.date !== wgToday()) { s.date = wgToday(); s.n = 0; }
    s.n += 1;
    wgSave('lose', s);
    // 하루에 3번째 실패마다 한 번씩만 위로 (과잉 개입 방지)
    if (s.n % 3 === 0) {
      wgPetSay(WG_COMFORT[Math.floor(Math.random() * WG_COMFORT.length)]);
    }
  } catch (e) {}
}
