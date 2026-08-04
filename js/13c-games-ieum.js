/* ============================================================
   13c-games-ieum.js
   ── 「지음 프로젝트」 글쓰기 게임 모듈 (구 13-writing-games.js 분할본 3/6)
   ── 담당: 비밀 단어 밀수꾼 · 60초 스피드런 · 낱말 경매 · 진실 둘 거짓 하나 · 상상력 온도 · 기자 검증 · 일기 배너 · 게임 런처

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
  if (wgMeetCast('customs', wgStartSmuggle)) return;
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
    wgOnWin('smuggle');
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
      wgOnLose();
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
  if (!s.got) { s.got = true; wgAddInk(10, '(스피드런 완주!)'); wgOnWin('speed'); }
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
  if (wgMeetCast('auction', wgOpenAuction)) return;
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
  wgAddInk(40, '(경매 보너스!)');
  wgOnWin('auction');                    // 보너스 (일일 상한 적용)
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
  if (wgMeetCast('detect', wgStartTruth)) return;
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
    wgOnLose();
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
  wgBumpDaily('truth');
  wgQuestBump('truthTry');
  wgOnWin('truth');
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
  if (wgMeetCast('thermo', wgStartTemp)) return;
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
  wgBumpDaily('temp');
  wgOnWin('temp');
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
  if (wgMeetCast('editor', wgStartDetective)) return;
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
    wgOnWin('det');
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

/* ── 1순위: 게임별 진행바 HTML 생성 (현재값/목표) ── */
function wgProgBar(cur, goal, unit) {
  const c = Math.max(0, cur);
  const g = Math.max(1, goal);
  const pct = Math.min(100, Math.round((c / g) * 100));
  const done = c >= g;
  const label = done
    ? '🏆 뱃지 획득 완료!'
    : (unit || '') + ' ' + c + ' / ' + g + ' — ' + (g - c) + '번 더!';
  return '<div class="wg-prog"><div class="wg-prog-fill' + (done ? ' done' : '') +
    '" style="width:' + pct + '%"></div></div>' +
    '<div class="wg-prog-label">' + label + '</div>';
}
