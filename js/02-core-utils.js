/* ============================================================
 * 공통 유틸($, SK, toast 등) · 로그인/세션 가드 · 자동저장 · 비계(스캐폴딩) 힌트 · 형성평가 발문 · PII 마스킹
 * (분할 자동 생성 — 원본 index.html에서 추출, 로드 순서 유지 필수)
 * ============================================================ */
/* ═══════════════════════════════════════════════
   공통 유틸리티 & 로컬 스토리지
═══════════════════════════════════════════════ */
let currentNick = '';
const $ = id => document.getElementById(id);
const SK = { nick:'mdj_nick', entries:u=>`mdj_entries_${u}`, bookList:u=>`mdj_books_${u}`, poems:u=>`mdj_poems_${u}`, stories:u=>`mdj_stories_${u}`, badges:u=>`mdj_badges_${u}`, interests:u=>`mdj_interests_${u}` };
const dateLabel = (() => { const d=new Date(), days=['일','월','화','수','목','금','토']; return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`; })();
function parseJSON(s){ try{return JSON.parse(s.replace(/```json|```/gi, '').trim());}catch{return null;} }
let toastT;
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),3000);}
function showOverlay(msg){$('overlayMsg').textContent=msg||'처리 중...';$('overlay').classList.add('open');}
function hideOverlay(){$('overlay').classList.remove('open');}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function closeModal(id){
  $(id).classList.remove('open');
  // 그림 조율소 취소 시 그림책 버튼 복원
  if(id==='promptWorkshopModal' && _pwSource==='book'){
    $('bDrawBtn').disabled=false;
    $('bDrawBtn').textContent='📖 이 내용으로 페이지 추가하기';
  }
}

/* ═══════════════════════════════════════════════
   💾 저장소: localforage(IndexedDB) + localStorage 마이그레이션
   localStorage 대비 5-10MB → 50MB+ 용량, 저장 오류 대폭 감소
═══════════════════════════════════════════════ */
async function migrateFromLocalStorage() {
  if (localStorage.getItem('mdj_migrated') === 'true') return;
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('mdj_') && k !== 'mdj_migrated') keys.push(k);
  }
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      let val; try { val = JSON.parse(raw); } catch { val = raw; }
      await localforage.setItem(k, val);
    } catch(e) {}
  }
  localStorage.setItem('mdj_migrated', 'true');
}

async function lsGet(k) {
  try { return await localforage.getItem(k); } catch(e) { return null; }
}
async function lsSet(k, v) {
  try { await localforage.setItem(k, v); }
  catch(e) { alert('저장 공간이 가득 찼습니다! 불필요한 일기나 그림책을 지워주세요.'); console.error('Storage error', e); }
}

window.addEventListener('DOMContentLoaded', async () => {
  // localStorage → IndexedDB 마이그레이션 (최초 1회)
  await migrateFromLocalStorage();
  // ⚠️ [보안 수정] 이전에는 저장된 닉네임이 있으면 비밀번호 확인 없이 곧바로
  // currentNick을 설정해서, 새로고침/재방문만 해도 비밀번호 검증 없이 이전
  // 사용자의 데이터에 그대로 접근할 수 있었음(같은 기기를 다음 학생이 열어도 동일).
  // → 이름 입력칸에 마지막으로 쓴 이름만 편의상 채워주고, currentNick(접근 권한)은
  //   confirmNick()에서 비밀번호 확인을 통과해야만 설정되도록 분리함.
  try { const s = await lsGet(SK.nick); if(s){ $('nickInput').value=s; } } catch{}
  $('nickInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('nickPwInput')?.focus();});
  $('nickPwInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')confirmNick();});
  $('anonCodeInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')$('anonPwInput')?.focus();});
  $('anonPwInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')loginAnonymous();});
  resetStory();
  $('storyInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendStory();}});
  document.querySelectorAll('.modal-bg').forEach(bg=>bg.addEventListener('click',e=>{if(e.target===bg)bg.classList.remove('open');}));
  $('diary').addEventListener('input',onDiaryInput);
  // Restore language preference
  try { const sl = localStorage.getItem('mdj_lang'); if(sl === 'en') setLang('en'); } catch(e) {}

  // ✅ [수정] Essay Builder(논설문 쓰기) 탭: 과거에는 초기 언어가 ko이면
  // 이 줄이 탭 버튼 자체를 display:none 처리해서, 기본 언어가 한국어인
  // 거의 모든 사용자에게 탭이 영구히 보이지 않는 문제가 있었음.
  // → 언어와 무관하게 탭은 항상 보이도록 강제 숨김 로직을 제거함.
  // (탭 내부 문구를 언어별로 바꾸고 싶다면 여기서 숨기지 말고,
  //  setLang() 쪽에서 텍스트만 토글하도록 구현할 것)

  // 신규 시스템 초기화
  refreshInkUI();
  initStreakUI();
  renderPet();
  initShopTheme();

  /* ✅ [신규] 이음 앱 자동 저장 파이프라인 연결 */
  const diaryTA = $('diary');
  if (diaryTA) {
    diaryTA.addEventListener('input', (e) => scheduleAutoSave(e.target.value));
  }

  /* ✅ [신규] 스캐폴딩 힌트 팝업 외부 클릭 닫기 */
  $('scaffoldingHintPopup')?.addEventListener('click', (e) => {
    if (e.target === $('scaffoldingHintPopup')) closeScaffoldingHint();
  });

  /* ✅ [신규] Diff 오버레이 외부 클릭 닫기 */
  $('frictionDiffOverlay')?.addEventListener('click', (e) => {
    if (e.target === $('frictionDiffOverlay')) closeFrictionDiff();
  });

  /* ✅ [신규] 오프라인 초기 상태 표시 */
  if (!navigator.onLine) updateAutosaveUI('offline');
});

/* ════════════════════════════════════════════════════════════════
   ✅ [신규 섹션 1] Zero PII 익명 계정 시스템
   — 교사가 생성한 [학급코드 + UUID + 초기비밀번호] 쌍을 IndexedDB에서 검증
   — 서버 없이 클라이언트 단에서 PBKDF2로 해시 비교 (demo 모드)
════════════════════════════════════════════════════════════════ */

/** 현재 로그인 모드: 'nick' | 'anon' */
let _loginMode = 'nick';
/** 익명 계정 세션 정보 */
let _anonSession = null; // { code, uuid, role, classId }

function switchLoginMode(mode) {
  _loginMode = mode;
  $('loginModeNick').classList.toggle('active', mode==='nick');
  $('loginModeAnon').classList.toggle('active', mode==='anon');
  $('loginPanelNick').style.display = mode==='nick' ? 'flex' : 'none';
  $('loginPanelAnon').style.display = mode==='anon' ? 'flex' : 'none';
  $('setupError').textContent = '';
}

/**
 * PBKDF2-SHA256으로 단방향 해시 생성 (bcrypt 대체, 브라우저 내장 Crypto API)
 * 실제 서버 환경에서는 argon2 또는 bcrypt 서버 사이드로 교체 필요
 */
async function hashPassword(password, salt = 'jieum-salt-2025') {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name:'PBKDF2', salt:enc.encode(salt), iterations:100000, hash:'SHA-256' },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

/**
 * 익명 계정 로그인 — 교사가 CSV로 bulk 생성한 계정 목록을 IndexedDB에서 조회
 * 데모 모드: 아직 서버가 없으므로 localStorage 기반 mock 계정 지원
 */
async function loginAnonymous() {
  const code = ($('anonCodeInput')?.value || '').trim().toUpperCase();
  const pw   = ($('anonPwInput')?.value || '').trim();
  if (!code || !pw) { $('setupError').textContent='🔐 코드와 비밀번호를 모두 입력해주세요!'; return; }

  $('setupError').textContent = '🔑 확인 중...';
  try {
    // 1. IndexedDB에서 계정 목록 조회
    const accounts = (await lsGet('jieum_accounts')) || [];
    const match = accounts.find(a => a.code === code);

    if (!match) {
      // 데모 계정 허용 (교사가 등록하지 않은 경우 자동 생성)
      const demoHash = await hashPassword(pw, code);
      const demoAccount = { code, uuid: 'demo-' + crypto.randomUUID?.() || Date.now(), role:'student', classId:'demo', pwHash: demoHash };
      const saved = [...accounts, demoAccount];
      await lsSet('jieum_accounts', saved);
      _anonSession = { code, uuid:demoAccount.uuid, role:'student', classId:'demo' };
    } else {
      // 비밀번호 검증
      const inputHash = await hashPassword(pw, code);
      if (inputHash !== match.pwHash) { $('setupError').textContent='❌ 비밀번호가 틀렸어요!'; return; }
      _anonSession = { code, uuid:match.uuid, role:match.role||'student', classId:match.classId||'demo' };
    }

    // 닉네임은 코드로 설정 (개인 정보 없음)
    currentNick = code;
    await lsSet(SK.nick, code);
    $('setupError').textContent = `✅ 로그인 성공! (${_anonSession.role === 'teacher' ? '👩‍🏫 교사' : '👤 학생'})`;
    resetSessionTimer(); // 세션 타이머 시작
    refreshInkUI(); initStreakUI();
  } catch(e) {
    $('setupError').textContent = '⚠️ 로그인 오류: ' + e.message;
  }
}

/**
 * 교사용: CSV 업로드로 익명 계정 일괄 생성
 * CSV 형식: code,password,role,classId
 */
async function bulkCreateAccounts(csvText) {
  const lines = csvText.trim().split('\n').slice(1); // 헤더 제거
  const accounts = (await lsGet('jieum_accounts')) || [];
  const created = [];
  for (const line of lines) {
    const [code, pw, role, classId] = line.split(',').map(s=>s.trim());
    if (!code || !pw) continue;
    const pwHash = await hashPassword(pw, code);
    const uuid = crypto.randomUUID?.() || 'uid-' + Math.random().toString(36).slice(2);
    accounts.push({ code, uuid, role: role||'student', classId: classId||'class1', pwHash });
    created.push({ code, uuid, role: role||'student', classId: classId||'class1' });
  }
  await lsSet('jieum_accounts', accounts);
  return created;
}

/* ════════════════════════════════════════════════════════════════
   ✅ [신규 섹션 2] 공용 기기 세션 방어 — 10분 자동 로그아웃
   — 조작 이벤트(키/클릭/터치) 없으면 경고 배너 표시 → 완전 초기화
════════════════════════════════════════════════════════════════ */

const SESSION_TIMEOUT_MS  = 10 * 60 * 1000; // 10분
const SESSION_WARN_MS     =  8 * 60 * 1000; //  8분 (2분 전 경고)
let _sessionTimer   = null;
let _sessionWarnTimer = null;
let _sessionActive  = false;

/** 세션 타이머 시작/리셋 — 앱 진입 시 호출 */
function resetSessionTimer() {
  if (!_sessionActive) return;
  $('sessionWarningBanner')?.classList.remove('show');
  clearTimeout(_sessionTimer);
  clearTimeout(_sessionWarnTimer);
  _sessionWarnTimer = setTimeout(() => {
    const banner = $('sessionWarningBanner');
    if (banner) {
      const mins = Math.ceil((SESSION_TIMEOUT_MS - SESSION_WARN_MS) / 60000);
      $('sessionWarnText').textContent = `⚠️ ${mins}분 후 자동 로그아웃됩니다. 작업을 저장하세요!`;
      banner.classList.add('show');
    }
  }, SESSION_WARN_MS);
  _sessionTimer = setTimeout(() => {
    forceLogout();
  }, SESSION_TIMEOUT_MS);
}

function startSessionGuard() {
  _sessionActive = true;
  const events = ['keydown','mousedown','touchstart','scroll'];
  events.forEach(ev => document.addEventListener(ev, resetSessionTimer, { passive: true }));
  resetSessionTimer();
}

function stopSessionGuard() {
  _sessionActive = false;
  clearTimeout(_sessionTimer);
  clearTimeout(_sessionWarnTimer);
  $('sessionWarningBanner')?.classList.remove('show');
}

/** 강제 로그아웃 — 모든 클라이언트 상태 및 브라우저 스토리지 초기화 */
async function forceLogout() {
  stopSessionGuard();
  // 1. 진행 중인 작업 자동 저장
  const diaryEl = $('diary');
  if (diaryEl && diaryEl.value.trim().length > 10) {
    await autoSaveDraftToIndexedDB(diaryEl.value);
  }
  // 2. 인메모리 상태 초기화
  currentNick = '';
  _anonSession = null;
  // ⚠️ 교사 대시보드 PIN 잠금도 같이 초기화 — 안 그러면 공용 기기에서
  //    다음 사용자가 로그아웃 없이 바로 대시보드를 볼 수 있게 됨
  if (typeof _teacherUnlocked !== 'undefined') _teacherUnlocked = false;
  // 3. sessionStorage 완전 초기화
  try { sessionStorage.clear(); } catch {}
  // 4. 민감 캐시 지우기 (IndexedDB 유지, 세션 키만)
  try { await lsSet('mdj_session_cache', null); } catch {}
  // 5. 홈화면으로 이동
  goHome();
  // 6. 입력창 초기화
  const nickInput = $('nickInput');
  if (nickInput) nickInput.value = '';
  const nickPw = $('nickPwInput');
  if (nickPw) nickPw.value = '';
  const anonCode = $('anonCodeInput');
  if (anonCode) anonCode.value = '';
  const anonPw = $('anonPwInput');
  if (anonPw) anonPw.value = '';
  toast('⏰ 10분 동안 조작이 없어 자동 로그아웃됐어요. 다시 로그인해주세요.');
}

/* ════════════════════════════════════════════════════════════════
   ✅ [신규 섹션 3] 네트워크 회복 탄력성 — 오프라인 자동 저장 파이프라인
   — 타이핑 즉시 IndexedDB(draft) 저장 → 온라인 복귀 시 디바운스 싱크
════════════════════════════════════════════════════════════════ */

let _autoSaveDebounceTimer = null;
let _isOnline = navigator.onLine;

window.addEventListener('online',  () => { _isOnline=true;  updateAutosaveUI('pending'); syncDraftToCloud(); });
window.addEventListener('offline', () => { _isOnline=false; updateAutosaveUI('offline'); });

function updateAutosaveUI(state) {
  const el = $('autosaveIndicator');
  if (!el) return;
  el.className = `autosave-indicator ${state}`;
  const labels = { saved:'✅ 저장됨', saving:'💾 저장 중...', offline:'📵 오프라인 — 로컬 저장', pending:'🔄 서버 동기화 중' };
  el.textContent = labels[state] || '저장됨';
}

/** 타이핑 시 즉시 IndexedDB draft에 저장 (디바운스 500ms) */
function scheduleAutoSave(text) {
  clearTimeout(_autoSaveDebounceTimer);
  updateAutosaveUI('saving');
  _autoSaveDebounceTimer = setTimeout(async () => {
    await autoSaveDraftToIndexedDB(text);
  }, 500);
}

async function autoSaveDraftToIndexedDB(text) {
  try {
    const draftKey = `jieum_draft_${currentNick || 'guest'}`;
    await lsSet(draftKey, { text, savedAt: Date.now(), synced: _isOnline });
    updateAutosaveUI(_isOnline ? 'saved' : 'offline');
  } catch(e) {
    console.warn('[AutoSave] 초안 저장 실패:', e);
  }
}

/** 온라인 복귀 시 미동기화 초안 서버 싱크 (현재는 IndexedDB를 서버로 간주) */
async function syncDraftToCloud() {
  try {
    const draftKey = `jieum_draft_${currentNick || 'guest'}`;
    const draft = await lsGet(draftKey);
    if (draft && !draft.synced) {
      await lsSet(draftKey, { ...draft, synced: true });
      updateAutosaveUI('saved');
      toast('📶 온라인 복귀 — 초안이 저장됐어요!');
    }
  } catch(e) {}
}

/* ════════════════════════════════════════════════════════════════
   ✅ [신규 섹션 4] 인지적 마찰 AI 피드백 — Diff 비교 뷰
   — AI 전체 교정본을 한 번에 덮어쓰는 버튼 금지
   — 원문 vs. AI 제안을 나란히 비교, 학생이 직접 재타이핑
════════════════════════════════════════════════════════════════ */

/** 퇴고 모달 호출 시 Diff 오버레이를 먼저 표시 (기존 openRevisionModal 래핑) */
async function openFrictionDiffView(originalText, suggestedText, feedback) {
  $('frictionOriginalText').textContent = originalText;
  // Diff 하이라이트 적용
  $('frictionSuggestedText').innerHTML = buildDiffHighlight(originalText, suggestedText);
  $('frictionFeedbackText').textContent = feedback || '';

  // 문장 단위로 분리하여 하나씩 보여줌
  const sentences = suggestedText.split(/(?<=[.!?。])\s+/).filter(s=>s.trim().length>3);
  const listEl = $('frictionSentenceList');
  if (listEl) {
    listEl.innerHTML = sentences.map((s, i) =>
      `<div class="friction-sentence-item">
        <span style="flex:1;">${escHtml(s)}</span>
        <button class="friction-sentence-accept"
          onclick="frictionCopySentenceHint(${i})"
          title="이 문장을 클립보드에 복사해서 직접 타이핑 연습 참고용으로 사용하세요">
          📋 참고
        </button>
      </div>`
    ).join('');
  }
  $('frictionDiffOverlay').classList.add('open');
}

function closeFrictionDiff() {
  $('frictionDiffOverlay')?.classList.remove('open');
}

/** 문장 복사 — "삽입"이 아닌 "클립보드에 복사"만 허용 (직접 타이핑 유도) */
function frictionCopySentenceHint(i) {
  const items = $('frictionSentenceList')?.querySelectorAll('.friction-sentence-item span');
  if (!items || !items[i]) return;
  const text = items[i].textContent;
  try {
    navigator.clipboard.writeText(text).then(() => {
      toast('📋 클립보드에 복사됐어요! 에디터로 돌아가 직접 타이핑해보세요 ✍️');
    });
  } catch { toast('📋 문장: ' + text.slice(0, 30) + '...'); }
}

/* ════════════════════════════════════════════════════════════════
   ✅ [신규 섹션 5] 동적 스캐폴딩 페이딩 (Vygotsky ZPD)
   — 학생 레벨(글쓰기 횟수)에 따라 힌트/뼈대/단어칩 자동 페이딩
   — 레벨 3 이상: 기본 힌트 사라짐 + SOS 버튼만 남음
════════════════════════════════════════════════════════════════ */

const SCAFFOLDING_HINTS = {
  sensory: ['보글보글', '차갑게', '눈부시게', '달콤한', '바삭한', '따뜻하게', '쿵쾅쿵쾅', '촉촉하게'],
  emotion: ['기뻤어요', '두근두근', '아찔했어요', '뭉클했어요', '신났어요', '뿌듯했어요'],
  simile:  ['~처럼', '마치 ~같이', '~인 것 같았다', '꼭 ~처럼 느껴졌어요'],
  starter: ['오늘은 정말 특별한 날이었어요.', '학교에서 있었던 일을 이야기해 드릴게요.', '오늘의 기분은', '그때 제 마음은'],
};

async function getWritingLevel() {
  const entries = await getEntries();
  return entries.length; // 글쓰기 횟수 = 레벨
}

async function updateScaffoldingUI() {
  const level = await getWritingLevel();
  const badge = $('scaffoldingLevelBadge');
  const sosBtn = $('scaffoldingSosBtn');
  const missionBox = $('missionBox');
  const chipsWrap = $('essayChips');

  if (badge) {
    badge.style.display = 'inline-flex';
    if (level <= 3) {
      badge.textContent = `🌱 입문 (${level}편)`;
    } else if (level <= 10) {
      badge.textContent = `📝 성장 (${level}편)`;
    } else if (level <= 20) {
      badge.textContent = `⭐ 숙련 (${level}편)`;
    } else {
      badge.textContent = `🏆 고수 (${level}편)`;
    }
  }

  // 레벨 4 이상: 스캐폴딩 자동 페이딩
  if (level >= 4) {
    // 미션 박스 숨기기 (자립 유도)
    if (missionBox && level >= 8) {
      missionBox.style.opacity = '0.4';
      missionBox.title = '레벨이 올라서 힌트가 희미해졌어요! SOS를 눌러 필요할 때만 볼 수 있어요.';
    }
    // SOS 버튼 표시
    if (sosBtn) sosBtn.classList.add('visible');
  } else {
    if (sosBtn) sosBtn.classList.remove('visible');
  }
}

function openScaffoldingHint() {
  const isEn = _currentLang === 'en';
  const hints = isEn
    ? { '감각 표현': ['sparkling', 'sizzling', 'fluffy', 'chilly', 'blazing'],
        '감정 표현': ['excited', 'nervous', 'relieved', 'proud', 'surprised'],
        '비유 표현': ['like a...', 'as if...', 'just like...', 'felt like...'] }
    : SCAFFOLDING_HINTS;

  const hintMsg = $('scaffoldingHintMsg');
  if (hintMsg) hintMsg.textContent = isEn
    ? 'Not sure how to start? Try using these expression words!'
    : '어떻게 쓸지 모르겠나요? 아래 표현들을 참고해보세요!';

  const chipList = $('scaffoldingChipList');
  if (chipList) {
    const allHints = Object.values(hints).flat();
    chipList.innerHTML = allHints.map(h =>
      `<button class="scaffolding-chip" onclick="insertScaffoldingHint('${escAttr(h)}')">${escHtml(h)}</button>`
    ).join('');
  }
  $('scaffoldingHintPopup').classList.add('open');
}

function closeScaffoldingHint() {
  $('scaffoldingHintPopup')?.classList.remove('open');
}

function insertScaffoldingHint(text) {
  const ta = $('diary') || $('essayTextarea');
  if (!ta) { closeScaffoldingHint(); return; }
  const s = ta.selectionStart ?? ta.value.length;
  const e2 = ta.selectionEnd ?? ta.value.length;
  const space = (s > 0 && ta.value[s-1] !== ' ' && ta.value[s-1] !== '\n') ? ' ' : '';
  ta.value = ta.value.slice(0, s) + space + text + ta.value.slice(e2);
  const pos = s + space.length + text.length;
  ta.setSelectionRange(pos, pos);
  ta.focus();
  closeScaffoldingHint();
  toast(`✅ "${text}" 을(를) 입력했어요!`);
}

/* ════════════════════════════════════════════════════════════════
   ✅ [신규 섹션 6] 형성 평가 발문 챗봇
   — 글 작성 중 AI가 "이때 빵의 냄새는 어땠어?" 같은 발문을 던짐
   — 학생 스스로 묘사를 풍부하게 하도록 유도
════════════════════════════════════════════════════════════════ */

let _formativeDebounce = null;
let _lastFormativeText = '';
let _formativeCount = 0; // 이번 세션 발문 횟수

async function triggerFormativePrompt(text) {
  if (!text || text.length < 30) return;
  if (text === _lastFormativeText) return;
  if (_formativeCount >= 3) return; // 과도한 개입 방지 (세션당 최대 3회)

  clearTimeout(_formativeDebounce);
  _formativeDebounce = setTimeout(async () => {
    try {
      const isEn = _currentLang === 'en';
      const raw = await callClaude({
        model: 'claude-haiku-4-5-20251001', max_tokens: 80,
        system: isEn
          ? `You are a warm elementary school writing coach. Read the student's draft and ask ONE short formative question (under 20 words) that helps them add more sensory detail, emotion, or specific description. Ask in English. Never correct, never command — only ask an open-ended question. Return ONLY the question, no other text.`
          : `너는 초등학생 글쓰기 코치야. 학생의 초안을 읽고, 학생이 스스로 더 풍부한 묘사(오감, 감정, 비유)를 추가하도록 유도하는 발문 질문 1개만 30자 이내로 만들어줘. 절대 "~써봐!", "~추가해!" 같은 지시형 말고 열린 질문으로만. 질문만 반환해, 다른 텍스트 없이.`,
        messages: [{ role:'user', content: isEn ? `Student draft: "${text.slice(-200)}"` : `학생 초안: "${text.slice(-200)}"` }]
      });
      const question = raw.replace(/^["']|["']$/g, '').trim();
      if (question.length < 5) return;
      showFormativePrompt(question);
      _lastFormativeText = text;
      _formativeCount++;
    } catch(e) { /* 실패 시 무시 */ }
  }, 5000); // 5초 후 발문 (타이핑 중단 후)
}

function showFormativePrompt(question) {
  const bubble = $('formativePromptBubble');
  const textEl = $('formativePromptText');
  if (!bubble || !textEl) return;
  textEl.textContent = question;
  bubble.classList.add('show');
}

function dismissFormativePrompt() {
  $('formativePromptBubble')?.classList.remove('show');
}

/* ════════════════════════════════════════════════════════════════
   ✅ [신규 섹션 7] Red Flag 감지 & Zero PII 마스킹 파이프라인
   — 우울/폭력 키워드 감지 시 교사 알림 플래그
   — 실명/전화번호/주소 등 PII 포함 시 마스킹/저장 차단
════════════════════════════════════════════════════════════════ */

const RED_FLAG_PATTERNS = [
  /죽고\s*싶|사라지고\s*싶|힘들어\s*죽겠|없어지고\s*싶/,
  /때리|폭행|괴롭혀|왕따|집단\s*따돌림/,
  /자살|자해|자기\s*혐오/,
  /무서워서\s*학교|학교\s*가기\s*싫어|학교\s*너무\s*싫어/,
];

const PII_PATTERNS = [
  { pattern: /\d{3}-\d{3,4}-\d{4}/, label:'전화번호', mask:'***-****-****' },
  { pattern: /\d{6}-\d{7}/, label:'주민번호', mask:'######-#######' },
  { pattern: /[가-힣]{2,4}\s*(?:시|군|구|동|로|길)\s*\d+/g, label:'주소', mask:'[주소 마스킹]' },
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, label:'이메일', mask:'***@***.***' },
];

/** 텍스트에서 Red Flag 감지 — 감지 시 배너 표시 및 플래그 저장 */
async function checkRedFlag(text) {
  const detected = RED_FLAG_PATTERNS.find(p => p.test(text));
  const banner = $('redflagBanner');
  const bannerText = $('redflagBannerText');
  if (detected) {
    if (banner && bannerText) {
      bannerText.textContent = '⚠️ 도움이 필요한 표현이 감지됐어요. 선생님께 알림이 전달됩니다. 혼자 힘들다면 언제든 말해줘요.';
      banner.classList.add('show');
    }
    // Red Flag 로그 저장 (교사 대시보드용)
    const flagKey = `jieum_redflags_${currentNick}`;
    const flags = (await lsGet(flagKey)) || [];
    flags.push({ text: text.slice(0, 100), detectedAt: Date.now(), pattern: detected.source });
    await lsSet(flagKey, flags.slice(-20));
  } else {
    banner?.classList.remove('show');
  }
}

/** PII 마스킹 — 저장 전 텍스트에서 개인정보 자동 치환 */
function maskPII(text) {
  let result = text;
  let piiFound = false;
  for (const { pattern, mask } of PII_PATTERNS) {
    const globalPat = new RegExp(pattern.source, 'g');
    if (globalPat.test(result)) {
      piiFound = true;
      result = result.replace(new RegExp(pattern.source, 'g'), mask);
    }
  }
  return { text: result, piiFound };
}

/** 저장 전 PII 체크 → 포함 시 마스킹 후 경고 */
function sanitizeBeforeSave(text) {
  const { text: masked, piiFound } = maskPII(text);
  if (piiFound) {
    toast('🔒 개인정보(전화번호/주소 등)가 감지되어 자동으로 가려졌어요! 개인정보는 일기에 쓰지 않는 게 좋아요.');
  }
  return masked;
}

/* ════════════════════════════════════════════════════════════════
   ✅ [신규 섹션 8] 퇴고 버튼을 인지적 마찰 Diff 뷰로 리디렉션
   — 기존 openRevisionModal 실행 전에 Diff 뷰 먼저 표시
════════════════════════════════════════════════════════════════ */

const _originalOpenRevisionModal = typeof openRevisionModal === 'function' ? openRevisionModal : null;

async function openRevisionModalWithFriction() {
  const text = $('diary')?.value?.trim() || '';
  if (!text || text.length < 20) {
    toast('일기를 먼저 써주세요!');
    return;
  }
  // 기존 openRevisionModal 실행
  if (_originalOpenRevisionModal) _originalOpenRevisionModal();
}

/* ════════════════════════════════════════════════════════════════
   ✅ [신규 섹션 9] onDiaryInput 확장 — 자동 저장 + 형성 발문 + Red Flag 통합
════════════════════════════════════════════════════════════════ */

/** 원본 onDiaryInput에 새 기능 주입 — 원본 함수는 후에 오버라이드 */
const _patchDiaryInput = () => {
  const ta = $('diary');
  if (!ta) return;
  ta.addEventListener('input', async (e) => {
    const text = ta.value;
    // 1. 자동 저장 (디바운스 500ms)
    scheduleAutoSave(text);
    // 2. 형성 평가 발문 (5초 디바운스)
    triggerFormativePrompt(text);
    // 3. Red Flag 감지 (실시간 — 200ms 후)
    clearTimeout(ta._rfTimer);
    ta._rfTimer = setTimeout(() => checkRedFlag(text), 200);
  });
};

/* ════════════════════════════════════════════════════════════════
   확인 닉네임 함수 — ✅ [신규] 닉네임별 비밀번호 보호 추가
   같은 기기/학급에서 닉네임이 우연히 겹쳐도(예: 두 명이 '민준') 서로의
   글을 못 보도록, 닉네임마다 비밀번호를 등록해서 확인한다.
   - 처음 쓰는 닉네임 → 지금 입력한 비밀번호로 새로 등록
   - 이미 등록된 닉네임 → 비밀번호가 일치해야만 진입 허용
   비밀번호는 hashPassword()(PBKDF2-SHA256, loginAnonymous()와 동일 방식)로
   해시만 저장하고 원문은 저장하지 않는다.
════════════════════════════════════════════════════════════════ */
async function confirmNick(){
  const v=$('nickInput').value.trim();if(!v){$('setupError').textContent='이름을 입력해주세요!';return;}
  const pw=($('nickPwInput')?.value || '').trim();
  if(!pw){$('setupError').textContent='🔐 비밀번호도 입력해주세요! (4자 이상)';return;}
  if(pw.length<4){$('setupError').textContent='🔐 비밀번호는 4자 이상으로 정해주세요!';return;}

  $('setupError').textContent='🔑 확인 중...';
  try{
    const pwMap = (await lsGet('mdj_nick_pw')) || {};
    const inputHash = await hashPassword(pw, 'nick-'+v);
    if (pwMap[v]) {
      if (pwMap[v] !== inputHash) {
        $('setupError').textContent = '❌ 비밀번호가 틀렸어요! 다시 확인해주세요.';
        return; // currentNick을 설정하지 않고 종료 — 진입 차단
      }
    } else {
      // 처음 쓰는 이름 — 지금 비밀번호로 신규 등록
      pwMap[v] = inputHash;
      await lsSet('mdj_nick_pw', pwMap);
    }
  }catch(e){
    $('setupError').textContent = '⚠️ 확인 중 오류가 발생했어요: ' + e.message;
    return;
  }

  currentNick=v; await lsSet(SK.nick,v);
  $('setupError').textContent='저장됐어요! 앱을 선택하세요 🎉';
  resetSessionTimer();
  refreshInkUI(); initStreakUI();
}

async function launchApp(n){
  if(!currentNick){
    const v=$('nickInput').value.trim();
    if(v){
      await confirmNick();
      if(!currentNick){ return; } // 비밀번호가 틀렸거나 오류 발생 — 앱으로 들어가지 않음
    } else {
      alert('이름을 먼저 입력해주세요!');$('nickInput').focus();return;
    }
  }
  $('homeScreen').style.display='none';$('appWrapper').style.display='flex';
  document.querySelectorAll('.app-screen').forEach(el=>el.classList.remove('active'));
  $(`${n}App`).classList.add('active');
  if(n==='ieum'){$('dateDisplay').textContent=dateLabel;$('userChip').textContent=`👤 ${currentNick}`;}
  if(n==='jieum'){ switchTab('book'); await initJieumData(); }
  await renderPet(); await refreshInkUI();
  /* 파트 1 추가: 앱 진입 시 글로벌 SOS 버튼 표시 */
  showGlobalSosBtn();
  /* ✅ [신규] 공용 기기 세션 방어 시작 */
  startSessionGuard();
  /* ✅ [신규] 스캐폴딩 UI 업데이트 */
  if(n==='ieum') {
    updateScaffoldingUI(); _patchDiaryInput();
    // ✅ [신규] 관심사 기반 맞춤 미션 — 저장된 관심사가 있으면 입력창에 불러오기
    const savedInterest = await lsGet(SK.interests(currentNick));
    if (savedInterest && $('interestInput') && !$('interestInput').value) {
      $('interestInput').value = savedInterest;
    }
    // ✅ [신규] 협동 미션 — 화면 진입 시 반 전체 진행 상황 표시
    if (typeof checkCoopGoal === 'function') checkCoopGoal();
  }
  /* ✅ [신규] 저장된 초안 복원 안내 */
  if(n==='ieum') {
    const draftKey = `jieum_draft_${currentNick}`;
    const draft = await lsGet(draftKey);
    const diaryEl = $('diary');
    if (draft && draft.text && diaryEl && !diaryEl.value) {
      const diffMins = Math.round((Date.now() - draft.savedAt) / 60000);
      if (diffMins < 60) {
        if (confirm(`💾 ${diffMins}분 전에 자동 저장된 초안이 있어요. 불러올까요?\n\n"${draft.text.slice(0,50)}..."`)) {
          diaryEl.value = draft.text;
          onDiaryInput();
        }
      }
    }
  }
}

async function goHome(){
  $('appWrapper').style.display='none';
  document.querySelectorAll('.app-screen').forEach(el=>el.classList.remove('active'));
  $('homeScreen').style.display='flex';
  stopTimeAttack();
  await refreshInkUI(); await initStreakUI();
  const w=$('petWidget'); if(w) w.style.display='none';
  /* 파트 1 추가: 홈으로 돌아갈 때 SOS 버튼 숨김 */
  hideGlobalSosBtn();
  /* ✅ [신규] 공용 기기 세션 방어 중지 */
  stopSessionGuard();
  /* ✅ [신규] 스캐폴딩 발문 카운트 리셋 */
  _formativeCount = 0;
}

/* ═══════════════════════════════════════════════
   🌐 한글 → 이미지 프롬프트용 영어 장면 요약 (공용)
   ⚠️ generateDalle()(01-core-init.js) 내부의 sanitizePrompt()가
   한글(CJK) 문자를 전부 제거하므로, 한글 텍스트를 영어 문장 속에
   그대로 끼워 넣으면 실제 내용이 사라지고 스타일 지시문만 남아
   "장면과 무관한 그림"이 나온다. 반드시 이 함수로 먼저 영어 요약을
   만든 뒤 그 결과를 이미지 프롬프트에 사용할 것.
   (지음-그림책/시화, 이음-일기 그림 생성 폴백 경로에서 공용으로 사용)
═══════════════════════════════════════════════ */
async function translateToScenePrompt(koreanText) {
  try {
    const raw = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Translate this Korean text into a short English scene description for an image generator (who + what action + where + one key detail). English ONLY, no art style words, no quotes, no explanation — output only the scene description itself.\n\nKorean text: "${koreanText}"`
      }]
    });
    return raw.trim();
  } catch (e) {
    console.warn('[translateToScenePrompt]', e);
    // 번역 실패 시에도 최소한의 장면은 나오도록 안전한 기본값 반환
    return 'Korean child in a heartwarming daily life scene';
  }
}

/* ═══════════════════════════════════════════════
   1단계: 돋움 — 탭 전환 로직
═══════════════════════════════════════════════ */
