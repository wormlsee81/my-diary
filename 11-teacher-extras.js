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

async function openTeacherDashboard() {
  $('teacherDashModal').classList.add('open');
  await refreshDashboard();
}
function closeTeacherDashboard() {
  $('teacherDashModal').classList.remove('open');
}

async function getDashboardData() {
  // 모든 닉네임 키에서 일기 데이터 수집
  const allKeys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      allKeys.push(localStorage.key(i));
    }
  } catch(e) {}
  const students = [];
  const seen = new Set();
  for (const key of allKeys) {
    if (!key.startsWith('mdj_entries_')) continue;
    const nick = key.replace('mdj_entries_', '');
    if (seen.has(nick)) continue;
    seen.add(nick);
    try {
      const entries = JSON.parse(localStorage.getItem(key) || '[]');
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
      <span class="dash-score-chip ${cls}">${cls2} 묘사력 ${sc}/10</span>
      <span class="dash-score-chip mid">🎯 미션 ${s.latestMission}/10</span>
      <span class="dash-score-chip mid">📝 ${s.entryCount}편</span>
      ${s.isToday ? '<span style="font-size:11px;background:#eaf6f4;color:var(--mint);padding:2px 8px;border-radius:10px;">오늘 작성 ✅</span>' : ''}
      <span class="dash-preview">${escHtml(s.latestText)}…</span>
      <button class="dash-comment-btn" onclick="openDashComment('${escAttr(s.nick)}')">💬 피드백</button>
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
   💡 AI 피드백 투명화 (Explainable AI)
═══════════════════════════════════════════════════════════ */
function openXaiModal() {
  const score = curRich || 0;
  $('xaiScoreBig').textContent = score;
  // 채점 기준 항목별 평가
  const text = ($('diary').value || '').toLowerCase();
  const criteria = [
    { label: '오감 표현 (보이는 것·소리·냄새·맛·느낌)', max: 3, keywords: ['보이','들리','냄새','향기','맛','느낌','느껴','뜨겁','차갑','부드럽','거칠','시끄','조용','밝','어두','빨강','파랑','초록','노랗','하얀','검은'], check: (t) => { const k=['보이','들리','냄새','향기','맛','느낌','느껴','뜨겁','차갑','부드럽','거칠','시끄','조용','밝','어두','빛']; return k.some(w=>t.includes(w)); } },
    { label: '감정 표현 (기뻤다·무서웠다·두근두근)', max: 2, check: (t) => { const k=['기뻤','기분','행복','슬펐','무서','두근','설레','걱정','화가','짜증','즐거','신났','실망','뿌듯']; return k.some(w=>t.includes(w)); } },
    { label: '비유 표현 (~처럼, ~같이, 마치)', max: 2, check: (t) => t.includes('처럼') || t.includes('같이') || t.includes('마치') || t.includes('인 것 같') || t.includes('ike ') || t.includes(' as ') },
    { label: '구체적 묘사 (막연한 표현 대신 세밀한 묘사)', max: 2, check: (t) => t.length > 80 },
    { label: '독특한 관점이나 재미있는 표현', max: 1, check: (t) => t.length > 150 }
  ];
  const container = $('xaiCriteria');
  if (!container) return;
  let earned = 0;
  container.innerHTML = criteria.map(c => {
    const got = c.check(text);
    if (got) earned += c.max;
    return `
    <div class="xai-row">
      <span style="font-size:16px;">${got?'✅':'⭕'}</span>
      <span class="xai-row-label">${c.label}</span>
      <span class="xai-row-score ${got?'earned':'not-earned'}">${got?`+${c.max}점`:`0/${c.max}`}</span>
    </div>`;
  }).join('');
  // 총점 메모
  container.insertAdjacentHTML('beforeend', `
    <div style="text-align:center;margin-top:10px;padding:8px;background:#f0fdf9;border-radius:10px;font-size:12px;color:#2a6a4a;">
      📊 예상 점수: <b>${Math.min(10, earned)}/10점</b> (AI 실제 점수: <b>${score}/10점</b>)<br>
      <span style="color:#888;font-size:11px;">※ AI는 전체 문맥을 종합적으로 분석하므로 예상치와 약간 다를 수 있어요.</span>
    </div>`);
  $('xaiOverlay').classList.add('open');
  // 트리거 버튼 표시
  const btn = $('xaiTriggerBtn');
  if (btn) btn.style.display = 'inline-block';
}
function closeXaiModal() { $('xaiOverlay').classList.remove('open'); }

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
    if (lastScore > firstScore) growthNote.textContent = `✨ 처음(${firstScore}점) → 지금(${lastScore}점) — 묘사력이 자랐어요! 🌱`;
    else if (lastScore === firstScore) growthNote.textContent = `📊 꾸준히 ${lastScore}점을 유지하고 있어요!`;
    else growthNote.textContent = `💪 묘사력 ${firstScore}점 → ${lastScore}점. 도전을 계속해봐요!`;
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
      <div class="portfolio-card" onclick="toast('이 일기: 묘사력 ${score}점 | 미션 ${e.missionScore||0}점')">
        <div class="portfolio-card-date">${e.date || '날짜 없음'}</div>
        <div class="portfolio-card-title">${escHtml((e.title||'오늘의 일기').slice(0,18))}</div>
        <div style="font-size:11px;color:#888;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.5;">${escHtml((e.text||'').slice(0,60))}…</div>
        <div class="portfolio-score-row">
          <span class="portfolio-score-chip" style="color:${scoreColor};border-color:${scoreColor};background:${scoreColor}18;">묘사력 ${score}/10</span>
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
const _origSwitchIeumTab = switchIeumTab;
function switchIeumTab(tab) {
  // 기존 diary/essay 처리
  ['diary','essay','peer'].forEach(t => {
    const content = $(`ieumContent_${t}`);
    if (content) content.style.display = (t === tab) ? 'flex' : 'none';
    const btn = $(`ieumTab_${t}`);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  if (tab === 'essay') renderEssayList();
  if (tab === 'peer')  refreshPeerList();
  // currentIeumTab 업데이트
  if (typeof _currentIeumTab !== 'undefined') { /* already updated above */ }
}

/* XAI 트리거 버튼: 점수 나오면 표시 */
const _origSetTeacher = setTeacher;
function setTeacher(st, ...args) {
  _origSetTeacher(st, ...args);
  const btn = $('xaiTriggerBtn');
  if (btn) btn.style.display = (st === 'advice') ? 'inline-block' : 'none';
}


