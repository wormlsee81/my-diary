/* ============================================================
 * 에세이 주제 모달 · 교사 대시보드 · XAI(AI 피드백 설명) · 자기평가 · 포트폴리오 · 동료 피드백
 * (분할 자동 생성 — 원본 index.html에서 추출, 로드 순서 유지 필수)
 * ============================================================ */
function openEssayTopicModal() {
  const modal = document.getElementById('essayTopicModal');
  if(modal) modal.classList.add('open');
}
function closeEssayTopicModal() {
  const modal = document.getElementById('essayTopicModal');
  if(modal) modal.classList.remove('open');
}
function confirmCustomTopic() {
  const input = document.getElementById('customTopicInput');
  const topic = (input?.value || '').trim();
  if(!topic) { toast(_currentLang==='en' ? 'Please enter a topic!' : '주제를 입력해주세요!'); return; }
  _currentEssayTopic = { title: topic, words: [], grammar: ['I think', 'Because', 'First,', 'In conclusion,'] };
  const topicBox = $('essayTopicBox');
  if(topicBox) topicBox.textContent = '🎯 ' + topic;
  renderEssayChips(_currentEssayTopic);
  closeEssayTopicModal();
  if(input) input.value = '';
  toast(_currentLang==='en' ? '✨ Topic has been set!' : '✨ 주제가 설정되었어요!');
}
function drawRandomEssayTopic() {
  drawEssayTopic();
  closeEssayTopicModal();
}

/* ═══════════════════════════════════════════════════════════
   📊 교사 대시보드 — 실시간 학생 현황 (localStorage 기반)
═══════════════════════════════════════════════════════════ */
let _dashFilter = 'all';
let _dashCommentTarget = null;

/* ── 교사 대시보드 PIN 인증 ──────────────────────────────────
   교사 대시보드 버튼은 그동안 누구나 누를 수 있었음(권한 체크 없음).
   짧은 PIN으로 1차 보호막을 둠. 공용 기기에서 다른 사람이 로그아웃하면
   (forceLogout) 다시 잠기도록 _teacherUnlocked를 false로 초기화함. */
const TEACHER_PIN = '0914';
let _teacherUnlocked = false;

function openTeacherDashboard() {
  if (_teacherUnlocked) { _openTeacherDashboardUnlocked(); return; }
  const input = $('teacherPinInput');
  const err   = $('teacherPinError');
  if (input) input.value = '';
  if (err)   err.textContent = '';
  $('teacherPinModal')?.classList.add('open');
  setTimeout(() => input?.focus(), 50);
}

function submitTeacherPin() {
  const input = $('teacherPinInput');
  const err   = $('teacherPinError');
  const val = (input?.value || '').trim();
  if (val === TEACHER_PIN) {
    _teacherUnlocked = true;
    closeModal('teacherPinModal');
    _openTeacherDashboardUnlocked();
  } else {
    if (err) err.textContent = '❌ PIN 번호가 틀렸어요!';
    if (input) { input.value = ''; input.focus(); }
  }
}

async function _openTeacherDashboardUnlocked() {
  $('teacherDashModal').classList.add('open');
  await refreshDashboard();
}
function closeTeacherDashboard() {
  $('teacherDashModal').classList.remove('open');
}

async function getDashboardData() {
  // ⚠️ 일기 데이터는 02-core-utils.js의 lsSet()을 통해 localforage(IndexedDB)에
  //    저장된다 (mdj_entries_<닉네임> 키). 예전 코드는 localStorage를 직접 스캔해서
  //    실제 데이터를 한 번도 찾지 못하고 항상 빈 대시보드만 보여주고 있었음.
  let allKeys = [];
  try { allKeys = await localforage.keys(); } catch(e) {}
  const students = [];
  const seen = new Set();
  for (const key of allKeys) {
    if (!key.startsWith('mdj_entries_')) continue;
    const nick = key.replace('mdj_entries_', '');
    if (seen.has(nick)) continue;
    seen.add(nick);
    try {
      const entries = (await lsGet(key)) || [];
      if (entries.length > 0) {
        const latest = entries[0];
        const today = new Date().toLocaleDateString('ko-KR');
        students.push({
          nick,
          entryCount: entries.length,
          latestScore: latest.richness || 0,
          latestMission: latest.missionScore || 0,
          latestText: (latest.text || '').slice(0, 80),
          latestDate: latest.date || '',
          isToday: (latest.date || '').includes(today.slice(0,6)),
          entries
        });
      }
    } catch(e) {}
  }
  return students;
}

async function refreshDashboard() {
  const students = await getDashboardData();
  // 통계
  const total = students.length;
  const avgScore = total ? Math.round(students.reduce((s,x)=>s+x.latestScore,0)/total*10)/10 : '—';
  const high = students.filter(x=>x.latestScore>=7).length;
  const low  = students.filter(x=>x.latestScore<=3 && x.latestScore>0).length;
  const todayCnt = students.filter(x=>x.isToday).length;
  $('dashTotalStudents').textContent = total;
  $('dashAvgScore').textContent = avgScore;
  $('dashHighCount').textContent = high;
  $('dashLowCount').textContent  = low;
  $('dashTodayCount').textContent = todayCnt;
  renderDashList(students, _dashFilter);
}

// ✅ [신규] 학급 문집 자동 생성 — 학생별 '살아있는 표현' 최고점 일기 1편씩 모아 PDF로 출력
async function generateClassAnthology() {
  const students = await getDashboardData();
  if (!students.length) { toast('아직 모인 학생 일기가 없어요!'); return; }

  // 학생별 최고 점수 일기 1편 선정 (동점이면 배열 순서상 먼저 나오는 것 = 최신 항목)
  const picks = students
    .map(s => ({ nick: s.nick, entry: [...s.entries].sort((a,b) => (b.richness||0) - (a.richness||0))[0] }))
    .filter(x => x.entry && (x.entry.text || '').trim())
    .sort((a,b) => a.nick.localeCompare(b.nick, 'ko'));

  if (!picks.length) { toast('문집에 담을 완성된 일기가 없어요!'); return; }
  if (!confirm(`${picks.length}명의 대표 일기 1편씩을 모아 학급 문집 PDF를 만들까요?\n(각 학생의 '살아있는 표현' 최고 점수 일기가 자동 선택됩니다)`)) return;

  showOverlay(`학급 문집을 만드는 중... (0/${picks.length})`);
  const savedNick = currentNick; // ⚠️ buildDiaryHTML()이 이름 칸에 전역 currentNick을 그대로 표시하므로, 학생마다 임시로 바꿔줘야 함
  try {
    const todayStr = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' });
    const coverHtml = `<div style="width:794px;height:1000px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(160deg,#62b3a4,#f49f5a);font-family:'Jua',sans-serif;color:white;text-align:center;box-sizing:border-box;">
      <div style="font-size:64px;margin-bottom:20px;">📖</div>
      <div style="font-size:48px;font-weight:bold;margin-bottom:14px;">우리 반 이야기 모음</div>
      <div style="font-size:22px;opacity:0.9;margin-bottom:50px;">이음 AI 그림일기장</div>
      <div style="font-size:18px;background:rgba(255,255,255,0.25);padding:10px 28px;border-radius:30px;">${todayStr}</div>
      <div style="font-size:16px;margin-top:30px;opacity:0.85;">${picks.length}명의 이야기가 담겨 있어요</div>
    </div>`;
    const pages = [{ html: coverHtml }];

    for (let i = 0; i < picks.length; i++) {
      if ($('overlayMsg')) $('overlayMsg').textContent = `학급 문집을 만드는 중... (${i + 1}/${picks.length})`;
      currentNick = picks[i].nick; // buildDiaryHTML 내부 "이름" 칸에 이 학생 이름이 찍히도록 임시 교체
      const cardHtml = buildDiaryHTML(picks[i].entry);
      pages.push({ html: `<div style="width:794px;min-height:1000px;display:flex;align-items:center;justify-content:center;background:#fdf1ed;box-sizing:border-box;padding:50px;"><div style="transform:scale(1.5);">${cardHtml}</div></div>` });
      await sleep(50); // 진행 상황 메시지가 화면에 반영될 시간 확보
    }

    const doc = await buildPDF(pages);
    doc.save(`우리반_문집_${Date.now()}.pdf`);
    toast(`📚 학급 문집 완성! (${picks.length}명 참여)`);
  } catch (e) {
    console.warn('[generateClassAnthology]', e);
    toast('문집 생성에 실패했어요: ' + e.message);
  } finally {
    currentNick = savedNick; // 오류가 나더라도 반드시 원래 로그인 사용자로 복구
    hideOverlay();
  }
}

function renderDashList(students, filter) {
  const list = $('dashStudentList');
  if (!list) return;
  let filtered = students;
  if (filter === 'high')  filtered = students.filter(x=>x.latestScore>=7);
  else if (filter === 'mid')   filtered = students.filter(x=>x.latestScore>=4&&x.latestScore<=6);
  else if (filter === 'low')   filtered = students.filter(x=>x.latestScore<=3&&x.latestScore>0);
  else if (filter === 'today') filtered = students.filter(x=>x.isToday);
  if (!filtered.length) {
    list.innerHTML = '<div style="color:#ccc;font-size:13px;text-align:center;padding:20px;">해당 조건의 학생이 없어요.</div>';
    return;
  }
  // 점수 순 정렬 (높은 순)
  filtered.sort((a,b)=>b.latestScore-a.latestScore);
  list.innerHTML = filtered.map(s => {
    const sc = s.latestScore;
    const cls = sc>=7?'high':sc>=4?'mid':'low';
    const cls2 = sc>=7?'🟢':sc>=4?'🟡':'🔴';
    // 교사 댓글 확인
    let teacherComment = '';
    try { teacherComment = localStorage.getItem(`mdj_teacher_comment_${s.nick}`) || ''; } catch(e){}
    return `
    <div class="dash-student-row">
      <span class="dash-student-name">${escHtml(s.nick)}</span>
      <span class="dash-score-chip ${cls}">${cls2} 살아있는 표현 ${sc}/10</span>
      <span class="dash-score-chip mid">🎯 미션 ${s.latestMission}/10</span>
      <span class="dash-score-chip mid">📝 ${s.entryCount}편</span>
      ${s.isToday ? '<span style="font-size:11px;background:#eaf6f4;color:var(--mint);padding:2px 8px;border-radius:10px;">오늘 작성 ✅</span>' : ''}
      <span class="dash-preview">${escHtml(s.latestText)}…</span>
      <button class="dash-comment-btn" onclick="openDashComment('${escAttr(s.nick)}')">💬 피드백</button>
      <button class="dash-comment-btn" onclick="resetStudentNickPassword('${escAttr(s.nick)}')" style="background:#fff3cd;color:#8a6d1f;" title="학생이 비밀번호를 잊어버렸을 때 초기화해주세요">🔑 비번 초기화</button>
      ${teacherComment ? `<span style="font-size:10px;color:var(--teacher);background:var(--teacher-bg);padding:2px 8px;border-radius:8px;max-width:120px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;" title="${escHtml(teacherComment)}">💌 ${escHtml(teacherComment.slice(0,20))}…</span>` : ''}
    </div>`;
  }).join('');
}

function filterDash(filter, btn) {
  _dashFilter = filter;
  document.querySelectorAll('.dash-filter-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  getDashboardData().then(students=>renderDashList(students, filter));
}

/* ✅ [신규] 닉네임 비밀번호 초기화 — 학생이 비밀번호를 잊어버렸을 때 교사가 풀어준다.
   초기화하면 mdj_nick_pw 맵에서 해당 닉네임 항목만 지워지고, 다음 로그인 시
   학생이 입력하는 비밀번호로 새로 등록된다 (confirmNick()의 '처음 쓰는 이름' 경로와 동일). */
async function resetStudentNickPassword(nick) {
  if (!confirm(`'${nick}' 학생의 비밀번호를 초기화할까요?\n\n초기화 후 다음 로그인 시 입력하는 비밀번호로 새로 등록됩니다.`)) return;
  try {
    const pwMap = (await lsGet('mdj_nick_pw')) || {};
    if (!(nick in pwMap)) { toast(`'${nick}'은 아직 비밀번호가 등록되지 않았어요.`); return; }
    delete pwMap[nick];
    await lsSet('mdj_nick_pw', pwMap);
    toast(`🔑 '${nick}' 학생의 비밀번호를 초기화했어요!`);
  } catch(e) {
    toast('초기화 중 오류가 발생했어요: ' + e.message);
  }
}

function openDashComment(nick) {
  _dashCommentTarget = nick;
  $('dashCommentNick').textContent = nick;
  $('dashCommentArea').style.display = 'block';
  // 기존 댓글 로드
  try {
    const existing = localStorage.getItem(`mdj_teacher_comment_${nick}`) || '';
    $('dashCommentInput').value = existing;
  } catch(e) {}
  $('dashCommentInput').focus();
}

function submitTeacherComment() {
  if (!_dashCommentTarget) return;
  const comment = ($('dashCommentInput').value || '').trim();
  if (!comment) { toast('피드백 내용을 입력해주세요!'); return; }
  try {
    localStorage.setItem(`mdj_teacher_comment_${_dashCommentTarget}`, comment);
  } catch(e) {}
  $('dashCommentArea').style.display = 'none';
  $('dashCommentInput').value = '';
  toast(`💌 ${_dashCommentTarget} 학생에게 피드백을 남겼어요!`);
  refreshDashboard();
  _dashCommentTarget = null;
}

/* ═══════════════════════════════════════════════════════════
   💡 AI 피드백 투명화(Explainable AI)는 04-ieum-diary.js의
   openXaiModal()/closeXaiModal()이 실제 구현을 담당함
   (analyzeDiary()가 저장해 둔 _lastAnalysis.richnessBreakdown을
   그대로 보여주는 정확한 버전).
   ⚠️ 2026-07: 여기 있던 예전 키워드-매칭 방식의 중복 정의를 제거함 —
   이 파일이 04보다 나중에 로드되는 바람에, 텍스트에 특정 키워드가
   있는지만 대충 검사하는 이 예전 버전이 정확한 버전을 항상 덮어쓰고
   있었음 (같은 이름의 function 재선언은 문법 오류 없이 조용히
   마지막 정의로 교체되기 때문에 지금까지 눈에 띄지 않았음). 학생이
   보는 유일한 "💡 왜?" 버튼은 이제 정확한 04번 구현으로 연결됨.
═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   📝 자기 평가 (Self-Assessment) 루틴
═══════════════════════════════════════════════════════════ */
const _saSelections = { q1: '', q2: '' };

function selectSaOption(q, val, btn) {
  _saSelections[q] = val;
  const groupId = q==='q1' ? 'saQ1Options' : 'saQ2Options';
  document.querySelectorAll(`#${groupId} .sa-option-btn`).forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  // 점수 비교 업데이트
  if (q==='q1') {
    const aiScore = curRich || (_lastEssayAnalysis ? _lastEssayAnalysis.richness : 0);
    const selfMap = {'😄 아주 잘 쓴 것 같아':9,'🙂 나쁘지 않아':7,'😐 보통이야':5,'😔 좀 아쉬워':3};
    const selfScore = selfMap[val] || 5;
    $('saAiScore').textContent = aiScore || '—';
    $('saMySelfScore').textContent = selfScore;
    const diff = aiScore - selfScore;
    let msg = '';
    if (diff > 3) msg = '✨ AI가 더 높게 봤어요! 본인이 생각하는 것보다 잘 썼네요 😊';
    else if (diff < -3) msg = '💪 AI 점수보다 자신감이 있군요! 더 발전할 여지가 있어요 🔥';
    else msg = '🎯 AI와 스스로의 평가가 비슷해요! 자기 인식이 정확해요 👍';
    $('saCompareMsg').textContent = msg;
    $('saScoreCompare').style.display = 'block';
  }
}

function openSelfAssessModal() {
  // 초기화
  document.querySelectorAll('.sa-option-btn').forEach(b=>b.classList.remove('selected'));
  _saSelections.q1 = ''; _saSelections.q2 = '';
  $('saGoalInput').value = '';
  $('saScoreCompare').style.display = 'none';
  $('selfAssessModal').classList.add('open');
}
function closeSelfAssessModal() { $('selfAssessModal').classList.remove('open'); }

async function submitSelfAssessment() {
  if (!_saSelections.q1) { toast('첫 번째 질문에 답해주세요!'); return; }
  if (!_saSelections.q2) { toast('두 번째 질문에 답해주세요!'); return; }
  const goal = ($('saGoalInput').value||'').trim();
  if (!goal) { toast('다음 목표를 써주세요! ✏️'); return; }
  // 저장
  const record = {
    date: new Date().toLocaleDateString('ko-KR'),
    q1: _saSelections.q1,
    q2: _saSelections.q2,
    goal,
    aiScore: curRich || 0,
    timestamp: Date.now()
  };
  const key = `mdj_self_assess_${currentNick}`;
  const saved = await lsGet(key) || [];
  saved.unshift(record);
  if (saved.length > 30) saved.pop();
  await lsSet(key, saved);
  closeSelfAssessModal();
  await addInk(30);
  showFireworks();
  toast('🌟 자기 평가 완료! 잉크 +30💧 보너스! 성장 마인드셋 +1 🧠');
}

/* ═══════════════════════════════════════════════════════════
   📈 글쓰기 포트폴리오 타임라인
═══════════════════════════════════════════════════════════ */
async function openPortfolioModal() {
  $('portfolioModal').classList.add('open');
  await renderPortfolio();
}
function closePortfolioModal() { $('portfolioModal').classList.remove('open'); }

async function renderPortfolio() {
  const entries = (await lsGet(SK.entries(currentNick))) || [];
  const timeline = $('portfolioTimeline');
  const growthNote = $('portfolioGrowthNote');
  if (!timeline) return;
  if (!entries.length) {
    timeline.innerHTML = '<div style="color:#ccc;font-size:13px;text-align:center;padding:24px;">저장된 일기가 없어요.<br>일기를 쓰고 저장하면 여기에 성장 기록이 쌓여요! 🌱</div>';
    return;
  }
  // 최근 30개만
  const recent = entries.slice(0, 30).reverse(); // 오래된 것부터
  // 성장 그래프 (처음 vs 최근)
  const firstScore = recent[0]?.richness || 0;
  const lastScore = recent[recent.length-1]?.richness || 0;
  const avgMission = recent.length ? Math.round(recent.reduce((s,x)=>s+(x.missionScore||0),0)/recent.length*10)/10 : 0;
  const fillRich = $('pgFillRichness');
  const fillMiss = $('pgFillMission');
  const labRich  = $('pgLabelRichness');
  const labMiss  = $('pgLabelMission');
  if (fillRich) fillRich.style.width = `${lastScore*10}%`;
  if (labRich)  labRich.textContent  = `${lastScore}/10`;
  if (fillMiss) fillMiss.style.width = `${avgMission*10}%`;
  if (labMiss)  labMiss.textContent  = `${avgMission}/10`;
  if (growthNote) {
    if (lastScore > firstScore) growthNote.textContent = `✨ 처음(${firstScore}점) → 지금(${lastScore}점) — 살아있는 표현이 자랐어요! 🌱`;
    else if (lastScore === firstScore) growthNote.textContent = `📊 꾸준히 ${lastScore}점을 유지하고 있어요!`;
    else growthNote.textContent = `💪 살아있는 표현 ${firstScore}점 → ${lastScore}점. 도전을 계속해봐요!`;
  }
  // 타임라인 렌더
  timeline.innerHTML = recent.map((e, idx) => {
    const score = e.richness || 0;
    const isLast = idx === recent.length - 1;
    const pct = score * 10;
    const scoreColor = score>=7?'var(--mint)':score>=4?'var(--orange)':'#e55';
    return `
    <div class="portfolio-item">
      <div class="portfolio-dot-col">
        <div class="portfolio-dot" style="background:${scoreColor};box-shadow:0 0 0 2px ${scoreColor};"></div>
        ${!isLast ? '<div class="portfolio-line"></div>' : ''}
      </div>
      <div class="portfolio-card" onclick="toast('이 일기: 살아있는 표현 ${score}점 | 미션 ${e.missionScore||0}점')">
        <div class="portfolio-card-date">${e.date || '날짜 없음'}</div>
        <div class="portfolio-card-title">${escHtml((e.title||'오늘의 일기').slice(0,18))}</div>
        <div style="font-size:11px;color:#888;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.5;">${escHtml((e.text||'').slice(0,60))}…</div>
        <div class="portfolio-score-row">
          <span class="portfolio-score-chip" style="color:${scoreColor};border-color:${scoreColor};background:${scoreColor}18;">살아있는 표현 ${score}/10</span>
          ${e.missionScore ? `<span class="portfolio-score-chip" style="color:var(--purple);border-color:var(--purple);background:#f3f0ff;">미션 ${e.missionScore}/10</span>` : ''}
          ${e.imageUrl ? '<span class="portfolio-score-chip">🖼️ 그림 있음</span>' : ''}
        </div>
        <div class="portfolio-card-bar"><div class="portfolio-card-fill" style="width:${pct}%;"></div></div>
      </div>
    </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════
   🤝 동료 피드백 (Peer Review) — localStorage 공유 기반
═══════════════════════════════════════════════════════════ */
const PEER_SHARED_KEY = 'mdj_peer_shared_essays'; // 전역 공유 키

async function shareMeEssayForPeer() {
  const text = ($('essayTextarea')?.value || '').trim();
  if (text.length < 30) {
    toast(_currentLang==='en'
      ? '✏️ Write a longer essay before sharing!'
      : '✏️ 에세이를 좀 더 써야 공유할 수 있어요!'); return;
  }
  const nick = currentNick || '익명';
  const entry = {
    id: `${nick}_${Date.now()}`,
    nick,
    topic: _currentEssayTopic?.title || '자유 주제',
    text,
    date: new Date().toLocaleDateString('ko-KR'),
    comments: []
  };
  try {
    const shared = JSON.parse(localStorage.getItem(PEER_SHARED_KEY) || '[]');
    // 내 기존 공유글 제거 후 새로 추가 (1인 1편)
    const filtered = shared.filter(x=>x.nick!==nick);
    filtered.unshift(entry);
    if (filtered.length > 20) filtered.pop();
    localStorage.setItem(PEER_SHARED_KEY, JSON.stringify(filtered));
    toast('📤 에세이가 공유됐어요! 친구들의 피드백을 기다려보세요 🤝');
    await addInk(20);
    await refreshPeerList();
  } catch(e) { toast('공유 실패: ' + e.message); }
}

async function refreshPeerList() {
  const nick = currentNick || '익명';
  let shared = [];
  try { shared = JSON.parse(localStorage.getItem(PEER_SHARED_KEY) || '[]'); } catch(e) {}
  // 내 글 제외한 친구 글
  const others = shared.filter(x=>x.nick!==nick);
  const myEntry = shared.find(x=>x.nick===nick);
  const list = $('peerReviewList');
  const myFeedback = $('myReceivedFeedback');
  if (list) {
    if (!others.length) {
      list.innerHTML = '<div class="peer-empty">아직 공유된 에세이가 없어요.<br>친구들이 에세이를 공유하면 여기에 나타나요! 📝</div>';
    } else {
      list.innerHTML = others.map(e => `
      <div class="peer-essay-card" id="peer_${e.id}">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="peer-essay-nick">✍️ ${escHtml(e.nick)}</span>
          <span style="font-size:11px;color:#aaa;">${e.date} | 📌 ${escHtml(e.topic)}</span>
        </div>
        <div class="peer-essay-text">${escHtml(e.text)}</div>
        <div class="peer-comments-list" id="peerComments_${e.id}">
          ${(e.comments||[]).map(c=>`
          <div class="peer-comment-item">
            <span class="peer-comment-from">${escHtml(c.from)}:</span>${escHtml(c.text)}
          </div>`).join('') || '<div style="font-size:11px;color:#ccc;padding:4px 0;">아직 댓글이 없어요.</div>'}
        </div>
        <textarea class="peer-comment-input" id="peerInput_${e.id}" maxlength="120"
          placeholder="친구의 글에서 좋았던 점이나 응원의 말을 남겨주세요! 🌟"></textarea>
        <button class="peer-submit-btn" onclick="submitPeerComment('${escAttr(e.id)}')">💬 댓글 남기기</button>
      </div>`).join('');
    }
  }
  // 내가 받은 피드백
  if (myFeedback) {
    if (!myEntry || !(myEntry.comments||[]).length) {
      myFeedback.innerHTML = '<div class="peer-empty">아직 받은 피드백이 없어요.<br>에세이를 공유하면 친구들의 피드백을 받을 수 있어요! 🌟</div>';
    } else {
      myFeedback.innerHTML = `
      <div style="font-size:12px;color:#888;margin-bottom:8px;">📬 총 ${myEntry.comments.length}개의 피드백을 받았어요!</div>
      ${myEntry.comments.map(c=>`
      <div class="peer-comment-item">
        <span class="peer-comment-from">${escHtml(c.from)}:</span>${escHtml(c.text)}
        <span style="font-size:10px;color:#aaa;margin-left:6px;">${c.date||''}</span>
      </div>`).join('')}`;
    }
  }
}

async function submitPeerComment(essayId) {
  const inputEl = $(`peerInput_${essayId}`);
  const comment = (inputEl?.value||'').trim();
  if (!comment) { toast('댓글 내용을 입력해주세요!'); return; }
  if (!checkProfanity(comment, '댓글창')) return;
  const nick = currentNick || '익명';
  try {
    const shared = JSON.parse(localStorage.getItem(PEER_SHARED_KEY) || '[]');
    const target = shared.find(x=>x.id===essayId);
    if (!target) { toast('에세이를 찾을 수 없어요.'); return; }
    if (!target.comments) target.comments = [];
    // 내 댓글 하나만 허용 (수정 형태)
    target.comments = target.comments.filter(c=>c.from!==nick);
    target.comments.push({ from: nick, text: comment, date: new Date().toLocaleDateString('ko-KR') });
    localStorage.setItem(PEER_SHARED_KEY, JSON.stringify(shared));
    toast('🤝 동료 피드백을 남겼어요! 잉크 +15💧 보너스!');
    await addInk(15);
    if (inputEl) inputEl.value = '';
    await refreshPeerList();
  } catch(e) { toast('댓글 저장 실패: ' + e.message); }
}

/* switchIeumTab 확장 — peer 탭 지원 */
// ⚠️ function 선언문으로 재정의하면 호이스팅 때문에 아래 _origSwitchIeumTab가
//    원본이 아니라 이 함수 자신을 가리키게 됨 → 반드시 대입식(= function)으로 작성
const _origSwitchIeumTab = switchIeumTab;
switchIeumTab = function(tab) {
  // 기존 diary/essay 처리 + _currentIeumTab 갱신은 원본 함수에 위임
  _origSwitchIeumTab(tab);
  // peer 탭 표시/숨김만 추가로 처리
  const content = $(`ieumContent_peer`);
  if (content) content.style.display = (tab === 'peer') ? 'flex' : 'none';
  const btn = $(`ieumTab_peer`);
  if (btn) btn.classList.toggle('active', tab === 'peer');
  if (tab === 'peer') refreshPeerList();
};

/* XAI 트리거 버튼: 점수 나오면 표시 */
// ⚠️ 콜스택 초과(무한 재귀) 버그 수정: function 선언문은 호이스팅되어
//    이 줄보다 먼저 전역 setTeacher를 덮어쓰므로, 아래 _origSetTeacher가
//    04-ieum-diary.js의 원본이 아니라 자기 자신을 가리키게 되어 무한 루프가 발생했음.
//    대입식(= function)으로 바꿔 실행 순서를 보장.
const _origSetTeacher = setTeacher;
setTeacher = function(st, ...args) {
  _origSetTeacher(st, ...args);
  const btn = $('xaiTriggerBtn');
  if (btn) btn.style.display = (st === 'advice') ? 'inline-block' : 'none';
};


