/* ============================================================
 * [이음-에세이 / 논설문] 주제뽑기 · 작성/분석 · TTS · 쉐도잉
 * (분할 자동 생성 — 원본 index.html에서 추출, 로드 순서 유지 필수)
 *
 * 언어 분기 정책:
 *  - _currentLang === 'en'  → 영어 에세이 코치 (기존 기능 그대로)
 *  - _currentLang !== 'en'  → 국어 논설문 선생님 (주장하는 글쓰기)
 *    · 평가 기준: 한국어 맞춤법/띄어쓰기/문장 호응 + 서론-본론-결론 논리 구조
 *    · TTS/쉐도잉은 "영어 읽기 연습" 기능이므로 한국어 모드에서는
 *      버튼을 누르면 안내 토스트만 띄우도록 방어 코드를 추가함
 *      (기능 코드 자체는 원본 그대로 유지)
 * ============================================================ */
let _currentIeumTab = 'diary';
function switchIeumTab(tab) {
  _currentIeumTab = tab;
  ['diary','essay'].forEach(t => {
    const content = $(`ieumContent_${t}`);
    if (content) content.style.display = (t === tab) ? 'flex' : 'none';
    const btn = $(`ieumTab_${t}`);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  if (tab === 'essay') { renderEssayList(); applyEssayLangUI(); }
}

/* 한국어 모드에서는 "영어로 에세이를 써보세요" 힌트와 "원어민 발음 듣기(TTS)" 영역을
   화면에서 완전히 숨긴다 (영어 전용 기능이므로). 언어가 바뀔 수 있는 모든 진입점에서
   호출해 항상 현재 언어 상태에 맞게 동기화한다. */
const ESSAY_PLACEHOLDER_KO =
`🍞 [Intro] 서론 — 문제 상황과 나의 의견을 써보세요.
예) 요즘 스마트폰을 교실에서 써도 되는지에 대한 논쟁이 있습니다. 저는 스마트폰 사용에 찬성합니다.

🥩 [Body 1] 첫 번째 이유와 예시를 써보세요.
예) 첫째, 모르는 내용을 바로 검색해서 학습에 활용할 수 있습니다.

🥩 [Body 2] 두 번째 이유와 예시를 써보세요.
예) 둘째, 위급한 상황에서 가족과 빠르게 연락할 수 있습니다.

🍞 [Conclusion] 결론 — 의견을 다시 강조해보세요.
예) 이와 같은 이유로 저는 스마트폰 사용에 찬성합니다.`;

const ESSAY_PLACEHOLDER_EN =
`🍞 [Intro] — Describe the situation, then share your opinion.
e.g.) These days, people are debating whether students should use smartphones in class. I think smartphones are helpful.

🥩 [Body 1] First reason + example.
e.g.) First, we can search for information easily.

🥩 [Body 2] Second reason + example.
e.g.) Second, we can communicate with friends.

🍞 [Conclusion] Restate your opinion.
e.g.) In conclusion, I believe smartphones are useful.`;

function applyEssayLangUI() {
  const isEn = _currentLang === 'en';
  const hint = $('essayWriteHint');
  if (hint) hint.style.display = isEn ? '' : 'none';
  const ttsRow = $('essayTtsRow');
  if (ttsRow) ttsRow.style.display = isEn ? 'flex' : 'none';
  /* 유용한 접속사 칩은 영어 전용, 참고 사실/의견 박스는 한국어 전용 */
  const connBlock = $('essayConnectorsBlock');
  if (connBlock) connBlock.style.display = isEn ? '' : 'none';
  const factsBlock = $('essayFactsBlock');
  if (factsBlock) factsBlock.style.display = isEn ? 'none' : '';
  /* 2026 버그 수정: placeholder가 언어와 무관하게 항상 영어로 고정돼 있던 문제 —
     언어 전환 시점마다 placeholder도 함께 동기화한다 (item 2) */
  const ta = $('essayTextarea');
  if (ta) ta.placeholder = isEn ? ESSAY_PLACEHOLDER_EN : ESSAY_PLACEHOLDER_KO;
}

/* ── 2. 주제 데이터 ── */
const ESSAY_TOPICS = [
  { title:'스마트폰을 교실에서 써도 될까?',            titleEn:'Should students use smartphones in class?',              words:['smartphone','helpful','addicted'],           grammar:['I think','Because'],
    factsKo:[
      {stance:'찬성', text:'스마트폰으로 모르는 내용을 바로 검색해 학습에 활용할 수 있다.'},
      {stance:'찬성', text:'위급한 상황에서 가족이나 선생님께 빠르게 연락할 수 있다.'},
      {stance:'반대', text:'수업 중 알림이나 메시지로 집중력이 떨어질 수 있다.'},
      {stance:'반대', text:'친구들과 직접 얼굴을 보고 대화하는 시간이 줄어들 수 있다.'},
    ] },
  { title:'동물원은 필요할까, 필요하지 않을까?',        titleEn:'Are zoos necessary or not?',                             words:['freedom','endangered','protect'],            grammar:['However,','In my opinion,'],
    factsKo:[
      {stance:'찬성', text:'멸종 위기 동물을 보호하고 번식시키는 역할을 한다.'},
      {stance:'찬성', text:'직접 보면서 동물에 대한 생생한 교육적 경험을 할 수 있다.'},
      {stance:'반대', text:'좁은 우리에 갇혀 지내는 동물은 스트레스를 받을 수 있다.'},
      {stance:'반대', text:'야생에서 살아야 할 동물이 본래의 습성을 잃을 수 있다.'},
    ] },
  { title:'환경을 지키려면 우리가 무엇을 해야 할까?',  titleEn:'What should we do to protect the environment?',          words:['recycle','pollution','environment'],         grammar:['First,','Therefore,'],
    factsKo:[
      {stance:'참고', text:'분리배출을 철저히 하면 재활용률을 높일 수 있다.'},
      {stance:'참고', text:'일회용품 사용을 줄이는 것이 쓰레기를 줄이는 핵심 방법이다.'},
      {stance:'참고', text:'가까운 거리는 걷거나 자전거를 이용하면 탄소 배출을 줄일 수 있다.'},
    ] },
  { title:'학교 급식에 채소를 꼭 먹어야 할까?',        titleEn:'Should students be required to eat vegetables at lunch?', words:['healthy','nutrition','choice'],              grammar:['I believe','For example,'],
    factsKo:[
      {stance:'찬성', text:'채소에는 비타민과 식이섬유가 풍부해 성장기 건강에 도움이 된다.'},
      {stance:'찬성', text:'어릴 때부터 다양한 음식을 골고루 먹는 식습관을 기를 수 있다.'},
      {stance:'반대', text:'좋아하지 않는 채소를 억지로 먹으면 식사 시간이 즐겁지 않을 수 있다.'},
      {stance:'반대', text:'강요보다는 조금씩 맛보게 하는 방법이 더 효과적일 수 있다.'},
    ] },
  { title:'초등학생도 SNS를 써도 될까?',               titleEn:'Should elementary students be allowed to use social media?',words:['dangerous','social media','privacy'],        grammar:['On the other hand,','In conclusion,'],
    factsKo:[
      {stance:'찬성', text:'멀리 사는 친구나 가족과 소식을 주고받을 수 있다.'},
      {stance:'찬성', text:'다양한 정보와 관심사를 빠르게 접할 수 있다.'},
      {stance:'반대', text:'개인정보가 노출되거나 낯선 사람과 연락이 닿을 위험이 있다.'},
      {stance:'반대', text:'사용 시간이 길어지면 수면이나 학습에 방해가 될 수 있다.'},
    ] },
  { title:'학교 숙제는 꼭 필요할까?',                  titleEn:'Is school homework really necessary?',                   words:['practice','stress','improve'],               grammar:['Second,','In addition,'],
    factsKo:[
      {stance:'찬성', text:'수업에서 배운 내용을 다시 연습하며 복습할 수 있다.'},
      {stance:'찬성', text:'스스로 계획을 세워 공부하는 습관을 기를 수 있다.'},
      {stance:'반대', text:'숙제가 너무 많으면 쉬거나 놀 시간이 줄어든다.'},
      {stance:'반대', text:'가정 환경에 따라 숙제를 도와줄 사람이 없는 경우도 있다.'},
    ] },
  { title:'반려동물을 키우는 것이 좋을까?',            titleEn:'Is having a pet a good idea?',                           words:['responsibility','companion','care'],          grammar:['I think','Because'],
    factsKo:[
      {stance:'찬성', text:'동물을 돌보며 책임감과 생명 존중을 배울 수 있다.'},
      {stance:'찬성', text:'반려동물과 함께 있으면 정서적으로 안정감을 느낄 수 있다.'},
      {stance:'반대', text:'매일 먹이를 주고 산책시키는 등 꾸준한 돌봄이 필요하다.'},
      {stance:'반대', text:'가족 중 알레르기가 있거나 키우기를 반대하는 사람이 있을 수 있다.'},
    ] },
  { title:'미래에는 로봇이 선생님을 대신할 수 있을까?',titleEn:'Can robots replace teachers in the future?',             words:['artificial intelligence','emotion','replace'],grammar:['However,','I believe'],
    factsKo:[
      {stance:'찬성', text:'로봇은 같은 내용을 지치지 않고 반복해서 가르칠 수 있다.'},
      {stance:'찬성', text:'학생 개인의 학습 속도에 맞춰 문제 난이도를 조절해 줄 수 있다.'},
      {stance:'반대', text:'로봇은 학생의 감정을 이해하고 공감하는 데 한계가 있다.'},
      {stance:'반대', text:'친구나 선생님과의 인간적인 관계 속에서 배우는 것도 중요하다.'},
    ] },
  { title:'용돈을 받으면 어떻게 써야 할까?',           titleEn:'How should students spend their allowance?',             words:['save','spend','important'],                  grammar:['First,','For example,'],
    factsKo:[
      {stance:'저축', text:'미리 계획해서 저축하면 나중에 큰 금액이 필요할 때 도움이 된다.'},
      {stance:'저축', text:'용돈 기입장을 쓰면 돈을 어디에 썼는지 알 수 있어 절약에 도움이 된다.'},
      {stance:'소비', text:'필요한 학용품이나 책을 직접 사보며 합리적인 소비를 배울 수 있다.'},
      {stance:'소비', text:'가족이나 친구를 위한 작은 선물을 사보며 나누는 기쁨을 배울 수 있다.'},
    ] },
  { title:'스포츠는 모든 학생이 배워야 할까?',         titleEn:'Should all students be required to learn sports?',       words:['teamwork','healthy','competition'],           grammar:['In my opinion,','Therefore,'],
    factsKo:[
      {stance:'찬성', text:'규칙적인 운동은 체력과 건강을 길러준다.'},
      {stance:'찬성', text:'팀 스포츠를 통해 협동심과 배려심을 배울 수 있다.'},
      {stance:'반대', text:'학생마다 좋아하는 활동이 달라 흥미를 느끼지 못할 수 있다.'},
      {stance:'반대', text:'신체적인 차이로 인해 부담을 느끼는 학생도 있을 수 있다.'},
    ] },
  { title:'패스트푸드는 건강에 해로울까?',             titleEn:'Is fast food harmful to our health?',                    words:['nutrition','junk food','balanced'],           grammar:['I think','However,'],
    factsKo:[
      {stance:'찬성(해롭다)', text:'나트륨과 지방이 많아 자주 먹으면 건강에 좋지 않을 수 있다.'},
      {stance:'찬성(해롭다)', text:'영양소가 골고루 들어있지 않아 성장기에 부족할 수 있다.'},
      {stance:'반대(괜찮다)', text:'가끔 먹는 것은 큰 문제가 되지 않으며 기분 전환에도 도움이 될 수 있다.'},
      {stance:'반대(괜찮다)', text:'채소나 다른 음식과 균형 있게 함께 먹으면 보완할 수 있다.'},
    ] },
  { title:'학교에서 교복을 입어야 할까?',              titleEn:'Should students wear uniforms at school?',               words:['uniform','equality','freedom'],               grammar:['First,','In conclusion,'],
    factsKo:[
      {stance:'찬성', text:'매일 옷을 고민하지 않아도 되어 시간이 절약된다.'},
      {stance:'찬성', text:'친구들 사이의 옷차림 비교나 부담을 줄일 수 있다.'},
      {stance:'반대', text:'자신의 개성을 옷으로 표현할 자유가 줄어들 수 있다.'},
      {stance:'반대', text:'활동하기 불편하거나 계절에 맞지 않을 때가 있다.'},
    ] },

  /* ────────────────────────────────────────────────────────
   * 교과서 기반 논설문(주장하는 글) 주제 추가
   * 출처: 2015 개정 교육과정 [4국03-03] 의견이 드러나게 글쓰기,
   *       5~6학년군 국어 "주장과 근거를 판단해요"(논설문 단원),
   *       "토의하여 해결해요" / "토론을 해요" 단원에 실제로 제시되는
   *       전형적인 토론·논설문 주제를 초등 논설문 글쓰기에 맞게 재구성.
   *       (영어 칩이 아닌 국어 연결 표현 위주로 grammar 필드 구성)
   * ──────────────────────────────────────────────────────── */
  { title:'동물원은 꼭 있어야 할까?',                  words:['좁은 우리','스트레스','보호'],                grammar:['첫째,','왜냐하면'],
    factsKo:[
      {stance:'찬성', text:'멸종 위기에 처한 동물을 보호하고 안전하게 돌볼 수 있다.'},
      {stance:'찬성', text:'가까이에서 동물을 관찰하며 생태와 보호의 중요성을 배울 수 있다.'},
      {stance:'반대', text:'좁은 우리 안에서 지내는 동물은 스트레스를 받을 수 있다.'},
      {stance:'반대', text:'동물 본래의 서식지와 다른 환경에서 살아야 한다.'},
    ] },
  { title:'우리 전통 음식을 사랑해야 할까?',           words:['전통 음식','우수성','건강'],                  grammar:['첫째,','예를 들어'],
    factsKo:[
      {stance:'참고', text:'김치, 된장 등 발효 음식은 건강에 좋은 성분이 많다고 알려져 있다.'},
      {stance:'참고', text:'전통 음식에는 우리 조상들의 지혜와 문화가 담겨 있다.'},
      {stance:'참고', text:'명절이나 행사 때 먹는 전통 음식은 가족의 추억을 만들어 준다.'},
      {stance:'다른 의견', text:'입맛에 따라 낯설게 느껴지거나 덜 좋아하는 사람도 있을 수 있다.'},
    ] },
  { title:'올바른 우리말 사용, 왜 중요할까?',          words:['줄임말','우리말','바른 표현'],                grammar:['둘째,','따라서'],
    factsKo:[
      {stance:'참고', text:'줄임말을 너무 많이 쓰면 윗세대와 의사소통이 어려워질 수 있다.'},
      {stance:'참고', text:'바른 우리말 표현은 자신의 생각을 더 정확하게 전달하는 데 도움이 된다.'},
      {stance:'참고', text:'우리말에는 우리 고유의 문화와 정서가 담겨 있다.'},
      {stance:'다른 의견', text:'새로운 말이나 줄임말도 시대에 따라 자연스럽게 생기는 언어 변화로 볼 수 있다.'},
    ] },
  { title:'선의의 거짓말은 해도 될까?',                words:['선의의 거짓말','용기','신뢰'],                grammar:['그러나','왜냐하면'],
    factsKo:[
      {stance:'찬성', text:'상대방의 마음을 다치지 않게 하려는 따뜻한 마음에서 나온다.'},
      {stance:'찬성', text:'작은 거짓말이 상황을 더 부드럽게 만들 때도 있다.'},
      {stance:'반대', text:'거짓말이 들통나면 신뢰를 잃을 수 있다.'},
      {stance:'반대', text:'솔직하게 말하는 것이 장기적으로는 더 좋은 관계를 만든다.'},
    ] },
  { title:'학급의 날, 어떻게 보내면 좋을까?',          words:['장기 자랑','학급 행사','협동'],               grammar:['첫째,','둘째,'],
    factsKo:[
      {stance:'의견1', text:'장기자랑을 하면 서로의 다양한 재능을 알고 더 친해질 수 있다.'},
      {stance:'의견2', text:'체육대회를 하면 다 함께 몸을 움직이며 협동심을 기를 수 있다.'},
      {stance:'참고', text:'어떤 활동을 하든 모든 친구가 즐겁게 참여할 수 있는 방법을 고민하는 것이 중요하다.'},
    ] },
  { title:'독도는 왜 우리 땅이라고 말해야 할까?',      words:['독도','우리 영토','역사적 근거'],             grammar:['따라서','왜냐하면'],
    factsKo:[
      {stance:'사실', text:'독도는 역사적으로 우리나라 사람들이 오랫동안 살고 이용해 온 섬이다.'},
      {stance:'사실', text:'옛 기록과 지도 자료에서도 독도를 우리 영토로 표시한 것을 찾을 수 있다.'},
      {stance:'사실', text:'현재 독도에는 우리나라 경찰과 주민이 거주하며 실제로 관리하고 있다.'},
      {stance:'참고', text:'독도의 역사를 정확히 아는 것이 우리 땅이라고 주장하는 근거가 된다.'},
    ] },
  { title:'우리 동네 문제, 어떻게 해결해야 할까?',     words:['우리 동네','불편한 점','해결 방안'],           grammar:['첫째,','그러므로'],
    factsKo:[
      {stance:'참고', text:'동네 어른들께 여쭤보거나 설문조사를 하면 어떤 문제가 있는지 알 수 있다.'},
      {stance:'참고', text:'구청이나 주민센터에 의견을 전달하는 방법도 있다.'},
      {stance:'참고', text:'친구들과 함께 작은 캠페인이나 포스터를 만들어 알리는 것도 좋은 방법이다.'},
    ] },
  { title:'학급 규칙은 왜 지켜야 할까?',               words:['학급 규칙','약속','공동체'],                  grammar:['왜냐하면','따라서'],
    factsKo:[
      {stance:'참고', text:'규칙이 있으면 친구들과 다투는 일을 줄일 수 있다.'},
      {stance:'참고', text:'모두가 규칙을 지키면 교실이 더 안전하고 편안해진다.'},
      {stance:'참고', text:'규칙을 함께 정하고 지키는 경험은 사회의 법과 약속을 이해하는 데 도움이 된다.'},
    ] },
];

/* 교과서 기반 주제가 시작되는 인덱스 (12번째부터). UI에서 "교과서 주제" 배지 등을 붙일 때 참고용 */
const ESSAY_TOPICS_KO_TEXTBOOK_START = 12;
ESSAY_TOPICS.forEach((t, i) => { t._fromTextbook = (i >= ESSAY_TOPICS_KO_TEXTBOOK_START); });
let _currentEssayTopic = null;

/* ── 3. 주제 뽑기 ── */
/* 한국어 분기: 교과서 기반 국어 논설문 주제는 titleEn이 없으므로,
   영어 모드에서는 titleEn이 있는 주제만 추첨 대상으로 삼는다 */
function drawEssayTopic() {
  const isEn = _currentLang === 'en';
  const pool = isEn ? ESSAY_TOPICS.filter(t => !!t.titleEn) : ESSAY_TOPICS;
  const topic = pool[Math.floor(Math.random() * pool.length)];
  _currentEssayTopic = topic;
  const topicBox = $('essayTopicBox');
  const displayTitle = (isEn && topic.titleEn) ? topic.titleEn : topic.title;
  const textbookTag = (!isEn && topic._fromTextbook) ? ' <span style="font-size:11px;color:#888;">(교과서 주제)</span>' : '';
  if (topicBox) topicBox.innerHTML = '🎯 ' + displayTitle + textbookTag;
  renderEssayChips(topic);
  renderEssayFacts(topic);
  toast(isEn ? '✨ New topic picked! Click the word chips to start your essay!' : '✨ 새 주제가 뽑혔어요! 낱말 칩을 눌러 논설문을 시작해봐요!');
}

function renderEssayChips(topic) {
  const el = $('essayChips');
  if (!el) return;
  el.innerHTML = '';
  (topic.words || []).forEach(w => {
    const btn = document.createElement('button');
    btn.className = 'essay-chip';
    btn.textContent = '📘 ' + w;
    btn.onclick = () => insertEssayChipText(w + ' ');
    el.appendChild(btn);
  });
  (topic.grammar || []).forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'essay-chip grammar';
    btn.textContent = '🔗 ' + g;
    btn.onclick = () => insertEssayChipText(g + ' ');
    el.appendChild(btn);
  });
}

/* 한국어 모드 전용: 영어 접속사 칩 대신, 주제에 대해 참고할 수 있는 짧은 사실/의견을
   찬성·반대(또는 그에 준하는) 양쪽 입장을 모두 보여줘서 근거 아이디어를 얻도록 돕는다 */
function renderEssayFacts(topic) {
  const el = $('essayFactsList');
  if (!el) return;
  const facts = (topic && topic.factsKo) || [];
  if (facts.length === 0) {
    el.innerHTML = `<span style="color:#ccc; font-size:12px;">이 주제에 대한 참고 자료가 아직 없어요.</span>`;
    return;
  }
  const stanceColor = (s) => {
    if (s.startsWith('찬성')) return { bg:'#f0fef8', border:'#4caf8a', text:'#2a6a4a' };
    if (s.startsWith('반대')) return { bg:'#fff5f0', border:'#e07050', text:'#8a3a1a' };
    if (s === '사실')          return { bg:'#f0f7ff', border:'var(--blue)', text:'#2a5a8a' };
    return { bg:'#fdf8f0', border:'var(--orange)', text:'#8a5a1a' };
  };
  el.innerHTML = facts.map(f => {
    const c = stanceColor(f.stance);
    return `<div style="background:${c.bg};border-left:3px solid ${c.border};color:${c.text};border-radius:0 8px 8px 0;padding:6px 10px;font-size:11.5px;line-height:1.55;margin-bottom:5px;word-break:keep-all;">
      <b>[${f.stance}]</b> ${f.text}
    </div>`;
  }).join('');
}

/* ── 4. 칩 텍스트 삽입 ── */
function insertEssayChipText(text) {
  const ta = $('essayTextarea');
  if (!ta) return;
  const s = ta.selectionStart, e2 = ta.selectionEnd;
  ta.value = ta.value.slice(0, s) + text + ta.value.slice(e2);
  const p = s + text.length;
  ta.setSelectionRange(p, p);
  ta.focus();
  onEssayInput();
}

/* ── 5. 글쓰기 뼈대 삽입 (영어: 햄버거 뼈대 / 한국어: 서론-본론1-본론2-결론) ── */
function insertEssaySkeleton() {
  // 2026 UX 개편: 모드 토글이 사라졌으므로 메인 textarea에 곧바로 4단 구조를 삽입
  const ta = $('essayTextarea');
  if (!ta) return;
  const isEn = _currentLang === 'en';
  const hint = _currentEssayTopic ? '"' + (isEn && _currentEssayTopic.titleEn ? _currentEssayTopic.titleEn : _currentEssayTopic.title) + '"' : '...';

  if (isEn) {
    ta.value =
`🍞 [Intro — 서론: 문제 상황 + 나의 주장]
These days, many people are talking about ${hint}. (Describe the situation in your own words.)
I think _________________________________. (Write your clear opinion here.)

🥩 [Body 1 — 첫 번째 이유]
First, _________________________________. For example, _________________________________.

🥩 [Body 2 — 두 번째 이유]
Second, _________________________________. In addition, _________________________________.

🍞 [Conclusion — 결론]
In conclusion, I believe _________________________________. Therefore, _________________________________.`;
  } else {
    // 국어 논설문(주장하는 글) 4단 구조: 서론(문제 상황+주장) - 본론1 - 본론2 - 결론
    ta.value =
`🍞 [서론 — 문제 상황 + 나의 주장]
요즘 ${hint}에 대한 이야기가 많이 나오고 있습니다. (어떤 문제 상황인지 한두 문장으로 설명해보세요.)
저는 이 문제에 대해 (찬성/반대)합니다. (나의 주장을 분명하게 써보세요.)

🥩 [본론 1 — 첫 번째 근거]
첫째, _________________________________. 왜냐하면 _________________________________.

🥩 [본론 2 — 두 번째 근거]
둘째, _________________________________. 예를 들어 _________________________________.

🍞 [결론 — 주장 강조 및 요약]
이와 같은 이유로 저는 ${hint}에 대해 (찬성/반대)합니다. 우리 모두 _________________________________.`;
  }

  ta.focus();
  toast(isEn ? '🍔 Hamburger skeleton inserted! Fill in the blanks!' : '🍔 논설문 뼈대(서론-본론1-본론2-결론)를 넣었어요! 빈칸을 채워보세요!');
}

/* ── 6. 새 에세이 ── */
function newEssay() {
  const ta = $('essayTextarea');
  if (ta) { ta.value = ''; ta.focus(); }
  _currentEssayTopic = null;
  _lastEssayText = ''; _lastEssayAnalysis = null;
  const topicBox = $('essayTopicBox');
  if (topicBox) topicBox.textContent = _currentLang==='en' ? 'Pick a topic! 🎲' : '주제를 뽑아주세요! 🎲';
  const chips = $('essayChips');
  if (chips) chips.innerHTML = `<span style="color:#ccc;font-size:13px;">${_currentLang==='en' ? 'Pick a topic to see recommended words & connectors ✨' : '주제를 뽑으면 추천 낱말/표현이 나타나요 ✨'}</span>`;
  const factsEl = $('essayFactsList');
  if (factsEl) factsEl.innerHTML = `<span style="color:#ccc; font-size:12px;">주제를 뽑으면 참고할 만한 사실/의견이 나타나요 ✨</span>`;
  ['essayRichnessFill','essayBonusFill'].forEach(id => { const el=$(id); if(el) el.style.width='0%'; });
  $('essayRichnessScore').textContent = _currentLang==='en' ? '— waiting' : '— 대기 중';
  $('essayBonusScore').textContent    = _currentLang==='en' ? '— waiting' : '— 대기 중';
  const st = $('essayStamp');
  if (st) st.classList.remove('show','s1','s2','s3','s4','s5');
  const bb = $('essayBonusBadge');
  if (bb) bb.classList.remove('show');
  applyEssayLangUI();
  setEssayTeacher('idle');
}

/* ── 7. 입력 감지 + 분석 트리거 ── */
let _lastEssayText = '', _lastEssayAnalysis = null, _essayHintTimer;
function onEssayInput() {
  clearTimeout(_essayHintTimer);
  const txt = ($('essayTextarea')?.value || '').trim();
  if (txt !== _lastEssayText) _lastEssayAnalysis = null;
  if (txt.length < 15) { setEssayTeacher('idle'); return; }
  setEssayTeacher('thinking');
  _essayHintTimer = setTimeout(async () => {
    try {
      const r = await analyzeEssay(txt);
      const isEn = _currentLang === 'en';
      $('essayRichnessFill').style.width  = `${r.richness * 10}%`;
      $('essayRichnessScore').textContent = isEn ? `Score ${r.richness}/10` : `점수 ${r.richness}/10`;
      $('essayBonusFill').style.width     = `${(r.bonusInk / 5) * 100}%`;
      $('essayBonusScore').textContent    = isEn ? `Bonus +${r.bonusInk} 💧` : `보너스 +${r.bonusInk} 💧`;
      updateEssayStamp(r.richness);
      const bb = $('essayBonusBadge');
      if (bb) {
        $('essayBonusInkNum').textContent = r.bonusInk;
        bb.classList.toggle('show', r.bonusInk > 0);
      }
      setEssayTeacher('advice', r);
    } catch(e) { setEssayTeacher('idle'); }
  }, 2800);
}

/* ── 8. AI 분석 (영어: Essay Coach / 한국어: 국어 논설문 선생님) ── */
async function analyzeEssay(text) {
  if (_lastEssayText === text && _lastEssayAnalysis) return _lastEssayAnalysis;
  const topicWords   = _currentEssayTopic ? _currentEssayTopic.words.join(', ')   : '(none)';
  const topicGrammar = _currentEssayTopic ? _currentEssayTopic.grammar.join(', ') : '(none)';
  const topicTitle   = _currentEssayTopic ? _currentEssayTopic.title : (_currentLang==='en' ? 'Free topic' : '자유 주제');
  const topicFactsKo = (_currentEssayTopic && _currentEssayTopic.factsKo && _currentEssayTopic.factsKo.length)
    ? _currentEssayTopic.factsKo.map(f => `- [${f.stance}] ${f.text}`).join('\n')
    : '(이 주제에는 등록된 참고 자료가 없음. 일반적인 상식 안에서 제안할 것)';

  const isEn = _currentLang === 'en';

  /* 파트 3 수정: max_tokens 증가 + grammarErrors 배열 필드 추가 */
  /* 한국어 분기 추가: 영어 문법 채점 프롬프트 대신 국어 논설문(주장하는 글) 채점 프롬프트 사용 */
  /* 2026 개편: 서론=문제 상황+주장으로 기준 변경, 참고 자료 기반 contentIdea(구체적 근거/아이디어 제안) 필드 추가 */
  const systemPrompt = isEn ? `You are a warm English Essay Coach for elementary school students (ages 10-13).
Topic: "${topicTitle}"

SANDWICH FEEDBACK (always apply in 'advice'):
1. 🌟 PRAISE first — find something genuinely good
2. ✏️ GENTLE CORRECTION — fix one grammar/structure issue kindly
3. 💪 ENCOURAGEMENT — English only

ESSAY STRUCTURE CHECK:
- hasIntro: does the student describe the situation/problem AND state their opinion/claim at the start?
- hasBody: does the student give at least one reason with an example?
- hasConclusion: does the student restate their opinion at the end?

BONUS SCORING (bonusInk 0–5):
Recommended words: ${topicWords} → +1 each (max 3)
Recommended grammar/connectors: ${topicGrammar} → +1 each (max 2)
Count how many of these appear in the text. bonusInk = that count (max 5).

RICHNESS SCORING (1–10):
- Situation + clear opinion stated: +2
- At least 2 body paragraphs with reasons: +3
- Conclusion present: +2
- Vocabulary & grammar quality: +2
- Creativity: +1

GRAMMAR DIFF (파트 3):
Find up to 3 most important grammar mistakes in the student's essay.
For each mistake, provide:
- "original": the exact problematic sentence or phrase from the student's text (keep it short, max 1 sentence)
- "corrected": the corrected version of that sentence or phrase
- "type": error category, one of: "spelling" | "article" | "tense" | "subject-verb" | "word-order" | "preposition" | "plural" | "other"
If there are no grammar errors, return an empty array [].

Be specific, not generic. Quote a short phrase from the student's own text in your feedback whenever possible, instead of generic filler like "keep writing" or "add more detail".

Return ONLY valid JSON (no markdown, no code fences):
{
  "richness":<1-10>,
  "bonusInk":<0-5>,
  "hasIntro":<true|false>,
  "hasBody":<true|false>,
  "hasConclusion":<true|false>,
  "structureFeedback":"<English 1 sentence on structure — what's missing or well done, quoting the student's text if possible>",
  "wordUseFeedback":"<English 1 sentence on recommended word/grammar usage>",
  "grammarFeedback":"<sandwich-method grammar fix, English only, 1-2 sentences>",
  "grammarErrors":[
    {"original":"<student's original sentence>","corrected":"<corrected sentence>","type":"<error type>"}
  ],
  "nextChallenge":"<one concrete next step, English only>",
  "advice":"<sandwich overall: praise + correction + English encouragement, 2-3 sentences>",
  "voca":"<2-3 useful words from your feedback. Format: word (한국어뜻), word (한국어뜻). e.g. specific (구체적인), vivid (생생한), structure (구조)>"
}` : `너는 초등학생(10~13세)을 위한 다정하고 꼼꼼한 '국어 논설문 선생님'이야.
학생은 논설문(주장하는 글)을 쓰고 있어. 주제: "${topicTitle}"

이 과제는 영어 글쓰기가 아니라 국어 글쓰기야. 절대로 영어 문법(article, tense, preposition 등)을 기준으로 채점하지 말고, 아래 한국어 기준으로만 평가해줘.

[샌드위치 피드백] ('advice' 필드에 항상 이 순서로 적용)
1. 🌟 칭찬 먼저 — 글에서 진짜로 잘한 점 하나를 구체적으로 찾아 칭찬
2. ✏️ 부드러운 교정 — 맞춤법/띄어쓰기/문장 호응 중 한 가지를 다정하게 고쳐주기
3. 💪 격려 — 따뜻하게 다음 단계를 응원 (한국어로만)

[논설문 구조 평가] (서론-본론-결론의 논리적 흐름을 확인)
- hasIntro: 글 앞부분에 ① 어떤 문제 상황/논쟁인지 설명하고, ② 그에 대한 자신의 주장(찬성/반대 의견)을 분명히 밝혔는가? (둘 다 있어야 true)
- hasBody: 그 주장을 뒷받침하는 근거(이유)를 적어도 하나 이상, 예시와 함께 제시했는가?
- hasConclusion: 글 끝에서 자신의 주장을 다시 한 번 요약·강조했는가?

[보너스 점수] (bonusInk 0~5)
추천 낱말: ${topicWords} → 사용 시 +1점 (최대 3점)
추천 연결 표현: ${topicGrammar} → 사용 시 +1점 (최대 2점)
글 속에 위 낱말/표현이 몇 개나 나오는지 세어서 합산 (최대 5).

[풍부함 점수] (richness, 1~10)
- 문제 상황과 주장이 모두 명확하게 드러남: +2
- 근거가 2개 이상이고 각각 예시가 있음: +3
- 결론에서 주장을 다시 정리함: +2
- 어휘 수준과 문장 호응(맞춤법 포함)의 정확성: +2
- 글의 창의성·구체성: +1

[맞춤법·띄어쓰기·문장 호응 교정 목록] (grammarErrors)
학생 글에서 가장 중요한 맞춤법/띄어쓰기/문장 호응 오류를 최대 3개까지 찾아줘.
각 오류마다 다음을 제공:
- "original": 학생 글에서 문제가 있는 문장/구절 원문 그대로 (짧게, 한 문장 이내)
- "corrected": 맞춤법·띄어쓰기·문장 호응을 바르게 고친 문장
- "type": 오류 종류 — 다음 중 하나만 사용: "spelling"(맞춤법) | "spacing"(띄어쓰기) | "agreement"(문장 호응) | "punctuation"(문장 부호) | "word-choice"(낱말 선택) | "other"(기타)
오류가 없으면 빈 배열 []을 반환해.

[참고 자료 — 이 주제에 대해 미리 정리해 둔 사실/의견 목록]
${topicFactsKo}

[아이디어 제안] (contentIdea) — 가장 중요한 필드
위 참고 자료 목록과 학생의 글을 비교해서, 학생이 아직 쓰지 않은 근거나 아이디어 중
학생의 주장(찬성/반대) 방향과 어울리는 것을 1~2개 찾아 제안해줘.
"더 써보세요", "자세히 써보세요" 같은 뻔하고 일반적인 말은 절대 쓰지 말고,
"~라는 사실을 근거로 들어보면 어떨까요?" 처럼 학생이 다음 문장에 바로 활용할 수 있는
구체적인 문장/표현 형태로 제안해줘. 참고 자료에 학생 주장과 반대되는 입장의 근거가 있다면,
"반대쪽에서는 이런 주장도 할 수 있는데, 그에 대해 반박해보는 것도 좋아요" 처럼
반론을 다루는 방법도 제안해줄 수 있어.

[추천 어휘/사자성어] (voca)
글의 수준을 한 단계 높여줄 수 있는 고급 국어 어휘나 사자성어를 2~3개 추천해줘.
형식: 낱말(뜻 풀이), 낱말(뜻 풀이) 형태로, 예: 일관성(생각이나 태도가 한결같은 성질) 형태처럼 짧은 뜻 풀이를 함께 적어줘.

[일반 원칙]
모든 피드백 문장은 구체적이어야 해. 가능하면 학생이 실제로 쓴 표현을 짧게 인용해서 언급하고,
"잘 써보아요!", "확인해보아요!" 같은 막연한 말만 반복하지 마.

오직 유효한 JSON만 반환해 (마크다운 금지, 코드블록 금지):
{
  "richness":<1-10>,
  "bonusInk":<0-5>,
  "hasIntro":<true|false>,
  "hasBody":<true|false>,
  "hasConclusion":<true|false>,
  "structureFeedback":"<논설문 구조에 대한 한국어 1문장 — 무엇이 부족하거나 잘 되었는지, 가능하면 학생 글의 표현을 인용>",
  "contentIdea":"<학생이 다음 문장에 바로 활용할 수 있는 구체적인 근거/아이디어 제안. 한국어 2~3문장>",
  "wordUseFeedback":"<추천 낱말/연결 표현 활용에 대한 한국어 1문장>",
  "grammarFeedback":"<샌드위치 방식의 맞춤법·띄어쓰기·문장 호응 교정, 한국어로 1~2문장>",
  "grammarErrors":[
    {"original":"<학생 글의 원래 문장>","corrected":"<맞춤법/띄어쓰기/문장 호응을 고친 문장>","type":"<오류 종류>"}
  ],
  "nextChallenge":"<다음에 도전해볼 구체적인 한 가지, 한국어로>",
  "advice":"<샌드위치 종합 피드백: 칭찬 + 교정 + 격려, 한국어로 2~3문장>",
  "voca":"<글의 수준을 높여줄 고급 어휘나 사자성어 2~3개. 형식: 낱말(뜻), 낱말(뜻). 예: 일관성(한결같은 성질), 일목요연(한눈에 알기 쉽게 정리됨)>"
}`;

  const raw = await callClaude({
    model: 'claude-haiku-4-5-20251001', max_tokens: 1400,
    system: systemPrompt,
    messages: [{ role:'user', content:`${isEn ? "Student's essay:" : '학생이 쓴 논설문:'}\n${text}` }]
  });

  /* 방어적 파싱: 모델이 지시를 어기고 ```json 코드블록으로 감싸서 반환하는 경우를
     대비해 백틱 펜스를 미리 제거한 뒤 파싱한다. (생성형 모델은 종종 이렇게 응답함) */
  const cleanedRaw = (typeof raw === 'string' ? raw : (raw ? JSON.stringify(raw) : ''))
    .replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = parseJSON(cleanedRaw);
  if (!parsed) {
    // 디버깅용: 파싱이 실패하면 원본 응답을 콘솔에 남겨 원인을 추적할 수 있게 한다
    console.warn('[analyzeEssay] AI 응답 JSON 파싱 실패 — 기본 피드백으로 대체됨. 원본 응답:', raw);
  }
  const data = parsed || {
    richness:3, bonusInk:0,
    hasIntro:false, hasBody:false, hasConclusion:false,
    structureFeedback: isEn ? 'Try to include an intro, body, and conclusion!' : '서론, 본론, 결론을 모두 갖추어 써보아요!',
    contentIdea:       isEn ? '' : '',
    wordUseFeedback:   isEn ? 'Try using some of the recommended words!' : '추천 낱말이나 연결 표현을 사용해봐요!',
    grammarFeedback:   isEn ? 'Check your grammar and sentence structure!' : '맞춤법과 띄어쓰기를 한 번 더 확인해봐요!',
    grammarErrors:     [], /* 파트 3: Grammar Diff 빈 배열 fallback */
    nextChallenge:     isEn ? 'Keep writing! 😊' : '계속 써봐요! 😊',
    advice:            isEn ? 'Great effort on your essay! Keep it up! 💪' : '논설문을 잘 쓰고 있어요! 계속 해봐요! 💪',
    voca:              '' /* 파트 4: voca fallback */
  };
  if(!data.voca) data.voca = ''; /* 파트 4 */
  if(!data.contentIdea) data.contentIdea = '';

  if (data.bonusInk > 0) {
    const bb = $('essayBonusBadge');
    const bx = bb ? bb.getBoundingClientRect() : null;
    await addInk(data.bonusInk, bx ? bx.x + bx.width/2 : window.innerWidth/2, bx ? bx.y : 200);
  }

  _lastEssayText     = text;
  _lastEssayAnalysis = data;
  return data;
}

/* ── 9. Essay 도장 업데이트 ── */
function updateEssayStamp(r) {
  const el = $('essayStamp');
  if (!el || r < 1) return;
  el.classList.remove('show','s1','s2','s3','s4','s5');
  const g = STAMPS[Math.min(r, STAMPS.length - 1)];
  if (!g) return;
  $('essayStampIcon').textContent = g.icon;
  $('essayStampText').textContent  = g.text;
  el.classList.add(g.cls);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
}

/* ── 10. 선생님 피드백 UI (영어: Essay Coach / 한국어: 논설문 선생님) ── */
function setEssayTeacher(st, data) {
  const face = $('essayTeacherFace');
  const msg  = $('essayTeacherMsg');
  const wrap = $('essayCoachWrap');
  if (!face || !msg) return;
  face.classList.remove('thinking');
  ['essayCoachStructure','essayCoachIdea','essayCoachWordUse','essayCoachGrammar','essayCoachNext']
    .forEach(id => { const e=$(id); if(e){ e.style.display='none'; e.innerHTML=''; } });
  if (wrap) wrap.style.display = 'none';

  const isEn = _currentLang === 'en';
  const coachLabel = isEn ? 'Essay Coach' : '📝 논설문 선생님';

  if (st === 'idle') {
    face.textContent = '👩‍🏫';
    msg.innerHTML = `<span class="teacher-hi">${coachLabel}</span><br>${isEn ? 'Start writing your essay and I\'ll give you feedback! ✍️' : '논설문을 쓰면 피드백을 드릴게요! ✍️'}`;
    return;
  }
  if (st === 'thinking') {
    face.textContent = '🤔'; face.classList.add('thinking');
    msg.innerHTML = `<span class="teacher-hi">${coachLabel}</span><br>${isEn ? 'Reading your essay carefully... 📖' : '논설문을 꼼꼼히 읽고 있어요... 📖'}`;
    return;
  }

  face.textContent = '✨';
  msg.innerHTML = `<span class="teacher-hi">${isEn ? '🌟 Essay Feedback' : '🌟 논설문 피드백'}</span><br>${data.advice || (isEn ? 'Great essay! Keep it up! 💪' : '논설문을 잘 쓰고 있어요! 💪')}`;

  /* 파트 4 + 한국어 분기: TTS/힌트는 영어 전용 기능이므로 영어 모드에서만 노출 */
  applyEssayLangUI();

  let hasCoach = false;
  const baseStyle = 'display:block; border-radius:0 8px 8px 0; padding:7px 11px; font-size:11.5px; line-height:1.65; margin-bottom:5px; word-break:keep-all;';

  const structEl = $('essayCoachStructure');
  if (structEl && data.structureFeedback) {
    const ok = [], miss = [];
    if (data.hasIntro)      ok.push(isEn ? '🍞 Intro ✅' : '🍞 서론 ✅'); else miss.push(isEn ? 'Intro' : '서론');
    if (data.hasBody)       ok.push(isEn ? '🥩 Body ✅'  : '🥩 본론 ✅'); else miss.push(isEn ? 'Body'  : '본론');
    if (data.hasConclusion) ok.push(isEn ? '🍞 Conclusion ✅' : '🍞 결론 ✅'); else miss.push(isEn ? 'Conclusion' : '결론');
    structEl.style.cssText = baseStyle + 'background:#f0fef8; border-left:3px solid #4caf8a; color:#2a6a4a;';
    const addLabel  = isEn ? 'add ' : '';
    const perfectLb = isEn ? 'Perfect structure! 👏' : '완벽한 구조예요! 👏';
    structEl.innerHTML = `🍔 <b>${isEn ? 'Essay Structure:' : '논설문 구조:'}</b> ${ok.join(' / ')}${miss.length ? ' — <span style="color:var(--orange);">' + addLabel + miss.join(', ') + '!</span>' : ' ' + perfectLb}<br><small style="opacity:.8;">${data.structureFeedback}</small>`;
    hasCoach = true;
  }

  /* 2026 개편: 근거/아이디어가 부족한 막연한 조언 대신, 주제 참고 자료를 바탕으로 한
     구체적인 근거·아이디어 제안을 보여준다 (item 2 개선) */
  const ideaEl = $('essayCoachIdea');
  if (ideaEl && data.contentIdea && data.contentIdea.trim()) {
    ideaEl.style.cssText = baseStyle + 'background:#f5f0ff; border-left:3px solid #8a7ce8; color:#4a3a8a;';
    ideaEl.innerHTML = `💡 <b>${isEn ? 'Idea Suggestion:' : '아이디어 제안:'}</b> ${data.contentIdea}`;
    hasCoach = true;
  }

  const wordEl = $('essayCoachWordUse');
  if (wordEl && data.wordUseFeedback) {
    wordEl.style.cssText = baseStyle + 'background:#fffbf0; border-left:3px solid var(--orange); color:#8a5a1a;';
    wordEl.innerHTML = `💧 <b>${isEn ? 'Word & Grammar Usage:' : '추천 낱말/표현 활용:'}</b> ${data.wordUseFeedback}`;
    hasCoach = true;
  }

  const gramEl = $('essayCoachGrammar');
  if (gramEl && (data.grammarFeedback || (data.grammarErrors && data.grammarErrors.length > 0))) {
    gramEl.style.cssText = baseStyle + 'background:#fff8f0; border-left:3px solid #e07040; color:#7a3010;';

    /* 파트 3 수정: Grammar Diff 하이라이트 UI 렌더링 (한국어 모드: 맞춤법/띄어쓰기/문장호응) */
    const gramLabel = isEn ? 'Grammar:' : '맞춤법·띄어쓰기:';
    let diffHTML = `📝 <b>${gramLabel}</b> ${data.grammarFeedback || ''}`;

    const errors = Array.isArray(data.grammarErrors) ? data.grammarErrors : [];
    if (errors.length === 0) {
      // 오류 없음
      diffHTML += `<div class="grammar-diff-wrap" style="margin-top:6px;">
        <div class="diff-no-error">✅ <span>${isEn ? 'No grammar errors found! Great job! 🎉' : '맞춤법·띄어쓰기 오류가 없어요! 정말 잘 썼어요! 🎉'}</span></div>
      </div>`;
    } else {
      // 오류별 Diff 카드 렌더링
      // 영어 모드 오류 타입 + 한국어 모드 오류 타입(spacing/agreement/punctuation/word-choice)을 모두 매핑
      const typeLabel = {
        'spelling':'철자(맞춤법)','article':'관사','tense':'시제',
        'subject-verb':'주어-동사','word-order':'어순',
        'preposition':'전치사','plural':'복수형',
        'spacing':'띄어쓰기','agreement':'문장 호응',
        'punctuation':'문장 부호','word-choice':'낱말 선택',
        'other':'기타'
      };
      const diffCards = errors.map(err => {
        const orig      = escHtml(err.original  || '');
        const corrected = escHtml(err.corrected || '');
        const typeLbl   = typeLabel[err.type] || err.type || (isEn ? 'other' : '기타');
        // 토큰 단위 diff 계산 → 변경된 부분 초록 강조
        const highlightedCorrected = buildDiffHighlight(err.original || '', err.corrected || '');
        return `
          <div class="grammar-diff-wrap" style="margin-top:7px;">
            <span class="diff-type-badge">${escHtml(typeLbl)}</span>
            <div class="diff-original">${orig}</div>
            <div class="diff-corrected">${highlightedCorrected}</div>
          </div>`;
      }).join('');
      diffHTML += diffCards;
    }

    gramEl.innerHTML = diffHTML;
    hasCoach = true;
  }

  const nextEl = $('essayCoachNext');
  if (nextEl && data.nextChallenge) {
    nextEl.style.cssText = baseStyle + 'background:#f0f7ff; border-left:3px solid var(--blue); color:#2a5a8a; margin-bottom:0;';
    nextEl.innerHTML = `✏️ <b>${isEn ? 'Next challenge:' : '다음 도전:'}</b> ${data.nextChallenge}`;
    hasCoach = true;
  }

  if (hasCoach && wrap) wrap.style.display = 'block';

  /* 파트 4: 미니 단어장(voca) 렌더링 — 한국어 모드에서는 고급 어휘/사자성어 */
  const isEnEssay = _currentLang === 'en';
  let essayVocaEl = $('essayCoachVoca');
  if (data && data.voca && data.voca.trim()) {
    if (!essayVocaEl) {
      essayVocaEl = document.createElement('div');
      essayVocaEl.id = 'essayCoachVoca';
      if (wrap) wrap.appendChild(essayVocaEl);
    }
    essayVocaEl.style.cssText = 'display:block; margin-top:6px; background:#f0f7ff; border-left:3px solid #4a90e2; padding:6px 10px; border-radius:8px; font-size:11px; color:#2a5a8a; word-break:keep-all;';
    essayVocaEl.innerHTML = `💡 <b>${isEnEssay ? "Today's Words:" : "오늘의 어휘:"}</b> ${data.voca}`;
    if (wrap && wrap.style.display === 'none') wrap.style.display = 'block';
  } else if (essayVocaEl) {
    essayVocaEl.style.display = 'none';
  }
}

/* ══════════════════════════════════════════════════════════
   파트 4 추가: 원어민 발음 듣기(TTS) — window.speechSynthesis 활용
   ① toggleEssayTTS()    : 재생 / 정지 토글
   ② speakEssayText()    : 에세이 텍스트를 en-US 음성으로 읽기
   ③ stopEssayTTS()      : TTS 즉시 중지 & 버튼 원래 상태 복원
   ④ getCleanEssayText() : 이모지·마크다운 기호 제거 후 순수 영문 반환
══════════════════════════════════════════════════════════ */

let _ttsUtterance = null; // 현재 재생 중인 SpeechSynthesisUtterance 인스턴스

/**
 * 파트 4: 에세이 텍스트에서 이모지·한국어·특수기호를 제거해
 *         TTS에 전달할 깔끔한 영문 텍스트를 반환
 */
function getCleanEssayText() {
  const raw = ($('essayTextarea')?.value || '').trim();
  if (!raw) return '';
  return raw
    // 이모지 제거
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    // 한국어(가-힣, 자모) 제거
    .replace(/[\uAC00-\uD7A3\u3131-\u318E]/g, '')
    // 마크다운 기호·대괄호 제거
    .replace(/[\[\]#*_`~]/g, '')
    // 연속 공백·줄바꿈 정리
    .replace(/\n{3,}/g, '\n\n')
    .replace(/  +/g, ' ')
    .trim();
}

/**
 * 파트 4: TTS 재생 / 정지 토글
 * 방어 코드: 이 기능은 "영어 발음 듣기" 전용이므로 한국어(논설문) 모드에서는
 *           원본 TTS 로직을 그대로 호출하지 않고 안내만 띄운다.
 */
function toggleEssayTTS() {
  if (_currentLang !== 'en') {
    toast('🔊 원어민 발음 듣기는 영어 에세이 모드에서만 사용할 수 있어요!');
    return;
  }
  if (!window.speechSynthesis) {
    toast(_currentLang === 'en'
      ? '❌ Your browser does not support TTS. Please use Chrome!'
      : '❌ 이 브라우저는 TTS를 지원하지 않아요. 크롬을 이용해주세요!');
    return;
  }
  const btn = $('btnTtsListen');
  if (window.speechSynthesis.speaking) {
    stopEssayTTS();
    return;
  }
  speakEssayText();
}

/**
 * 파트 4: 에세이를 en-US 원어민 음성으로 읽어주기
 */
function speakEssayText() {
  const text = getCleanEssayText();
  if (!text) {
    toast(_currentLang === 'en'
      ? '✏️ Please write your essay first!'
      : '✏️ 먼저 에세이를 써주세요!');
    return;
  }

  const btn    = $('btnTtsListen');
  const label  = $('ttsStatusLabel');

  // 이미 재생 중이면 중지
  window.speechSynthesis.cancel();

  _ttsUtterance = new SpeechSynthesisUtterance(text);
  _ttsUtterance.lang  = 'en-US';
  _ttsUtterance.rate  = 0.88;   // 초등학생이 따라 듣기 좋은 속도
  _ttsUtterance.pitch = 1.0;
  _ttsUtterance.volume = 1.0;

  // 사용 가능한 en-US 음성 중 가장 자연스러운 것을 선택
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang === 'en-US' && v.localService)
                || voices.find(v => v.lang === 'en-US')
                || voices.find(v => v.lang.startsWith('en'));
  if (enVoice) _ttsUtterance.voice = enVoice;

  // 이벤트 핸들러
  _ttsUtterance.onstart = () => {
    if (btn) {
      btn.textContent = '⏹ 읽기 중지';
      btn.classList.add('speaking');
    }
    if (label) label.textContent = _currentLang === 'en'
      ? '🔊 Playing... Click to stop'
      : '🔊 재생 중... 클릭하면 중지돼요';
    toast(_currentLang === 'en'
      ? '🔊 Playing your essay in English!'
      : '🔊 에세이를 영어로 읽어드릴게요! 잘 들어봐요 👂');
  };

  _ttsUtterance.onend = () => {
    resetTtsBtn();
    toast(_currentLang === 'en'
      ? '✅ Finished! Now try reading it yourself 🎤'
      : '✅ 다 읽었어요! 이번엔 직접 읽어볼까요? 🎤');
  };

  _ttsUtterance.onerror = (e) => {
    resetTtsBtn();
    // 'interrupted' 는 정지 버튼으로 취소한 정상적인 경우이므로 토스트 생략
    if (e.error !== 'interrupted') {
      toast(_currentLang === 'en' ? '❌ TTS error: ' + e.error : '❌ TTS 오류: ' + e.error);
    }
  };

  window.speechSynthesis.speak(_ttsUtterance);
}

/**
 * 파트 4: TTS 중지 & 버튼 초기화
 */
function stopEssayTTS() {
  window.speechSynthesis.cancel();
  resetTtsBtn();
}

function resetTtsBtn() {
  const btn   = $('btnTtsListen');
  const label = $('ttsStatusLabel');
  if (btn) {
    btn.textContent = '🔊 원어민 발음 듣기';
    btn.classList.remove('speaking');
  }
  if (label) label.textContent = _currentLang === 'en'
    ? '🔊 Listen to native pronunciation'
    : '클릭하면 에세이를 원어민 발음으로 읽어줘요 👂';
}

/* ══════════════════════════════════════════════════════════
   파트 4 추가: 말하기(Shadowing) 훈련 — STT 활용
   ① startEssayShadowing()  : 학생이 에세이를 소리내어 읽으면 STT로 인식
   ② stopEssayShadowing()   : 녹음 중지
   ③ showShadowBonusPop()   : 축하 팝업 + 폭죽 + 보너스 잉크 +50 지급
   ④ closeShadowBonusPop()  : 팝업 닫기
══════════════════════════════════════════════════════════ */

let _shadowRecognition = null; // SpeechRecognition 인스턴스
let _isShadowing = false;      // 현재 쉐도잉 진행 여부

/**
 * 파트 4: 쉐도잉(내가 직접 읽어보기) 시작 / 중지 토글
 * 방어 코드: 영어 발음으로 소리내어 읽는 연습 기능이므로 한국어(논설문) 모드에서는
 *           원본 STT 로직을 그대로 호출하지 않고 안내만 띄운다.
 */
function startEssayShadowing() {
  if (_currentLang !== 'en') {
    toast('🎤 소리내어 읽기 연습은 영어 에세이 모드에서만 사용할 수 있어요!');
    return;
  }
  if (_isShadowing) {
    stopEssayShadowing();
    return;
  }

  const text = getCleanEssayText();
  if (!text) {
    toast(_currentLang === 'en'
      ? '✏️ Please write your essay first!'
      : '✏️ 먼저 에세이를 써주세요!');
    return;
  }

  if (!SpeechRecognition) {
    toast(_currentLang === 'en'
      ? '❌ Your browser does not support voice input. Please use Chrome!'
      : '❌ 이 브라우저는 음성 인식을 지원하지 않아요. 크롬을 이용해주세요!');
    return;
  }

  // 기존 TTS 재생 중이면 먼저 중지
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    stopEssayTTS();
  }

  _isShadowing = true;
  const btn = $('btnEssayShadow');
  if (btn) {
    btn.textContent = '⏹ 읽기 중지';
    btn.style.background = 'linear-gradient(135deg,#e8a44a,#c07820)';
    btn.classList.add('recording');
  }

  _shadowRecognition = new SpeechRecognition();
  _shadowRecognition.lang = 'en-US';  // 영어로 읽어야 함
  _shadowRecognition.interimResults = false;
  _shadowRecognition.maxAlternatives = 1;

  toast(_currentLang === 'en'
    ? '🎤 Start reading your essay aloud! Speak in English 📢'
    : '🎤 에세이를 크게 소리내어 읽어보세요! 영어로 읽어야 해요 📢');

  _shadowRecognition.onstart = () => {
    // 시작 성공
  };

  _shadowRecognition.onresult = (event) => {
    // 음성 인식 결과가 왔으면 → 쉐도잉 성공으로 간주
    const spoken = event.results[0][0].transcript.trim();
    if (spoken.length > 5) {
      stopEssayShadowing();
      showShadowBonusPop();
    }
  };

  _shadowRecognition.onerror = (e) => {
    stopEssayShadowing();
    if (e.error === 'no-speech') {
      toast(_currentLang === 'en'
        ? '🔇 No voice detected. Please speak louder!'
        : '🔇 목소리가 인식되지 않았어요. 더 크게 읽어보세요!');
    } else if (e.error !== 'aborted') {
      toast(_currentLang === 'en'
        ? '❌ Voice error: ' + e.error
        : '❌ 음성 인식 오류: ' + e.error);
    }
  };

  _shadowRecognition.onend = () => {
    // onresult 없이 끝났을 때 (no-speech 등) 버튼 복원
    if (_isShadowing) stopEssayShadowing();
  };

  _shadowRecognition.start();
}

/**
 * 파트 4: 쉐도잉 녹음 중지 & 버튼 복원
 */
function stopEssayShadowing() {
  _isShadowing = false;
  if (_shadowRecognition) {
    try { _shadowRecognition.abort(); } catch(e) {}
    _shadowRecognition = null;
  }
  const btn = $('btnEssayShadow');
  if (btn) {
    btn.textContent = '🎤 내가 직접 읽어보기';
    btn.style.background = 'linear-gradient(135deg,var(--mint),#4e9a8c)';
    btn.classList.remove('recording');
  }
}

/**
 * 파트 4: 쉐도잉 완료 → 축하 팝업 + 폭죽 + 보너스 잉크 +50
 */
async function showShadowBonusPop() {
  // 폭죽 애니메이션 (기존 showFireworks() 재활용)
  showFireworks();

  // 잉크 +50 지급
  await addInk(50);

  // 팝업 표시
  const pop = $('shadowBonusPop');
  if (pop) {
    pop.classList.add('show');
    // 5초 후 자동 닫기
    setTimeout(() => closeShadowBonusPop(), 5000);
  }

  toast(_currentLang === 'en'
    ? '🎉 Amazing! You read your essay out loud! +50💧 Bonus Ink!'
    : '🎉 브라보! 에세이를 직접 읽었어요! +50💧 잉크 보너스!');
}

/**
 * 파트 4: 쉐도잉 완료 팝업 닫기
 */
function closeShadowBonusPop() {
  const pop = $('shadowBonusPop');
  if (pop) pop.classList.remove('show');
}

/* ── 11. 저장 / 목록 / 불러오기 (한국어 모드: "논설문"으로 표기) ── */
async function saveEssay() {
  const text = ($('essayTextarea')?.value || '').trim();
  if (text.length < 20) { toast(_currentLang==='en' ? 'Please write a little more! ✏️' : '논설문을 좀 더 써주세요! ✏️'); return; }
  const entry = {
    id: Date.now(),
    date: dateLabel,
    topic: _currentEssayTopic?.title || (_currentLang==='en' ? 'Free topic' : '자유 주제'),
    topicData: _currentEssayTopic || null,
    text
  };
  const key   = `mdj_essays_${currentNick}`;
  const saved = (await lsGet(key)) || [];
  saved.unshift(entry);
  if (saved.length > 30) saved.pop();
  await lsSet(key, saved);
  toast(_currentLang==='en' ? '📝 Essay saved! Great work 🎉' : '📝 논설문이 저장됐어요! 수고했어요 🎉');
  renderEssayList();
}

async function renderEssayList() {
  const wrap = $('essayListWrap');
  if (!wrap) return;
  const key   = `mdj_essays_${currentNick}`;
  const saved = (await lsGet(key)) || [];
  if (!saved.length) {
    wrap.innerHTML = _currentLang==='en'
      ? '<div style="color:#ccc;font-size:13px;text-align:center;padding:20px;">No saved essays yet.<br>Write and save your first essay! 📝</div>'
      : '<div style="color:#ccc;font-size:13px;text-align:center;padding:20px;">저장된 논설문이 없어요.<br>논설문을 쓰고 저장해보세요! 📝</div>';
    return;
  }
  wrap.innerHTML = saved.map(e => `
    <div style="border:2px solid var(--border);border-radius:12px;padding:10px 12px;background:white;cursor:pointer;transition:all .15s;position:relative;"
         onmouseover="this.style.borderColor='var(--mint)';this.style.background='#f9fffe';"
         onmouseout="this.style.borderColor='var(--border)';this.style.background='white';"
         onclick="loadEssay(${e.id})">
      <div style="font-size:12px;color:var(--orange);font-weight:bold;margin-bottom:2px;">📝 ${e.topic}</div>
      <div style="font-size:11px;color:#aaa;margin-bottom:5px;">${e.date}</div>
      <div style="font-size:12px;color:#555;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.5;">
        ${e.text.replace(/[🍞🥩]/g,'').replace(/\[.*?\]/g,'').trim().slice(0,80)}…
      </div>
      <button onclick="event.stopPropagation();deleteEssay(${e.id})" class="d-del" style="position:absolute;top:8px;right:8px;">🗑️</button>
    </div>`).join('');
}

/* 2026 개편: "📈 포트폴리오" 버튼을 눌렀을 때만 "저장된 에세이" 목록이 나타나도록
   토글 방식으로 변경 (기본적으로는 숨겨져 있음). 다시 누르면 접힌다. */
function scrollToSavedEssays() {
  const section = $('essaySavedSection');
  if (!section) return;
  const isEn = _currentLang === 'en';
  const willShow = section.style.display === 'none' || !section.style.display;

  if (willShow) {
    section.style.display = 'block';
    renderEssayList();
    setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    section.style.transition = 'box-shadow .3s ease';
    section.style.boxShadow = '0 0 0 3px var(--orange)';
    setTimeout(() => { section.style.boxShadow = 'none'; }, 1400);
    toast(isEn ? '📈 Here are your saved essays!' : '📈 내가 쓴 논설문 모음이에요!');
  } else {
    section.style.display = 'none';
  }
}

async function loadEssay(id) {
  const key   = `mdj_essays_${currentNick}`;
  const saved = (await lsGet(key)) || [];
  const entry = saved.find(e => e.id === id);
  if (!entry) return;
  const ta = $('essayTextarea');
  if (ta) ta.value = entry.text;
  _currentEssayTopic = entry.topicData || null;
  _lastEssayText = ''; _lastEssayAnalysis = null;
  const topicBox = $('essayTopicBox');
  if (topicBox) topicBox.textContent = _currentEssayTopic
    ? '🎯 ' + ((_currentLang === 'en' && _currentEssayTopic.titleEn) ? _currentEssayTopic.titleEn : _currentEssayTopic.title)
    : (_currentLang==='en' ? '🎯 Free topic' : '🎯 자유 주제');
  if (_currentEssayTopic) { renderEssayChips(_currentEssayTopic); renderEssayFacts(_currentEssayTopic); }
  /* 파트 4 + 한국어 분기: TTS/힌트는 영어 전용 기능이므로 영어 모드에서만 노출 */
  applyEssayLangUI();
  toast(_currentLang==='en' ? '📖 Essay loaded!' : '📖 논설문을 불러왔어요!');
}

async function deleteEssay(id) {
  if (!confirm(_currentLang==='en' ? 'Delete this essay?' : '이 논설문을 삭제할까요?')) return;
  const key   = `mdj_essays_${currentNick}`;
  const saved = (await lsGet(key)) || [];
  const next  = saved.filter(e => e.id !== id);
  await lsSet(key, next);
  toast(_currentLang==='en' ? 'Deleted.' : '삭제됐어요.');
  renderEssayList();
}

/* ── 12. DOMContentLoaded: essayTextarea 이벤트 등록 ── */
document.addEventListener('DOMContentLoaded', () => {
  const ta = $('essayTextarea');
  if (ta) ta.addEventListener('input', onEssayInput);

  /* 초기 진입 시에도 현재 언어에 맞게 TTS/힌트 노출 여부 동기화 */
  applyEssayLangUI();
});

/* ══════════════════════════════════════════════════════════
   논설문 자기 평가 체크리스트 (5점 척도, 10문항)
   — 기존 openSelfAssessModal()(그림일기용)과는 별도로 동작하는,
     이음-에세이 탭 전용의 완전히 독립적인 모달/로직.
     (외부 openSelfAssessModal 미동작 이슈와 무관하게 항상 동작하도록
      이 파일 안에서 모달 표시/숨김까지 직접 처리함)
══════════════════════════════════════════════════════════ */
const ESSAY_SA_QUESTIONS = [
  '글의 처음(서론)에서 내 주장(의견)을 분명하게 밝혔다.',
  '주장을 뒷받침하는 이유(근거)를 2개 이상 썼다.',
  '각 이유마다 알맞은 예시나 설명을 덧붙였다.',
  '서론-본론-결론의 순서와 짜임새가 잘 갖춰져 있다.',
  "'첫째, 둘째, 왜냐하면, 그러므로' 같은 연결어를 알맞게 사용했다.",
  '결론에서 내 주장을 다시 한번 강조하며 마무리했다.',
  '맞춤법과 띄어쓰기를 확인하며 썼다.',
  '문장의 주어와 서술어가 잘 어울리게(호응되게) 썼다.',
  '읽는 사람이 이해하기 쉽도록 명확하게 썼다.',
  '글을 쓰는 동안 정성을 다해 최선을 다했다.'
];
const ESSAY_SA_SCALE_LABELS = ['전혀 아니다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다'];
let _essaySaRatings = {};

/* 2026 버그 수정: 콘솔 로그상으로는 modal.style.display='flex'가 정상 적용됐는데도
   화면에는 전혀 보이지 않는 현상이 확인됨. 다른 스크립트/CSS가 조상 요소에
   transform 등을 걸어 position:fixed 기준점이 틀어졌거나, 외부 CSS가 더 높은
   우선순위로 숨기고 있을 가능성이 있음. 아래 두 헬퍼는 (1) 모달을 body의 바로
   자식으로 옮겨 조상 요소의 영향을 원천적으로 배제하고, (2) display를
   !important로 강제 지정해 어떤 외부 CSS 충돌에도 확실히 보이도록 방어적으로
   처리한다. 우리 모달들(essaySelfAssessModal, essayRevisionModal)에 모두 적용. */
function forceShowModal(modal) {
  if (!modal) return;
  if (modal.parentElement !== document.body) document.body.appendChild(modal);
  modal.style.setProperty('display', 'flex', 'important');
}
function forceHideModal(modal) {
  if (!modal) return;
  modal.style.setProperty('display', 'none', 'important');
}

/** 자기 평가 모달 열기 — 매번 새로 그려서 이전 응답을 초기화
    (함수명을 launchEssaySaChecklist로 명명: 다른 스크립트 파일의 동명 함수와
     충돌할 가능성을 없애기 위한 방어적 조치) */
function launchEssaySaChecklist() {
  console.log('[essay-self-assess] launchEssaySaChecklist() 호출됨');
  const modal = $('essaySelfAssessModal');
  console.log('[essay-self-assess] modal element:', modal);
  if (!modal) { console.warn('[essay-self-assess] #essaySelfAssessModal 요소를 찾을 수 없음'); return; }
  _essaySaRatings = {};

  const wrap = $('essaySaItemsWrap');
  if (wrap) {
    wrap.innerHTML = ESSAY_SA_QUESTIONS.map((q, i) => `
      <div style="border:1.5px solid var(--border);border-radius:10px;padding:9px 11px;">
        <div style="font-size:12.5px;color:#444;margin-bottom:7px;line-height:1.5;word-break:keep-all;">${i + 1}. ${q}</div>
        <div style="display:flex;gap:5px;" id="essaySaRow${i}">
          ${[1, 2, 3, 4, 5].map(v => `
            <button type="button" onclick="setEssaySaRating(${i},${v},this)"
              title="${ESSAY_SA_SCALE_LABELS[v - 1]}"
              style="flex:1;padding:7px 0;border:1.5px solid var(--border);border-radius:8px;background:white;font-family:inherit;font-size:13px;font-weight:bold;color:#999;cursor:pointer;transition:all .12s;">${v}</button>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  const resultBox = $('essaySaResultBox');
  if (resultBox) { resultBox.style.display = 'none'; resultBox.innerHTML = ''; }

  forceShowModal(modal);
  console.log('[essay-self-assess] 모달 표시 완료. 최종 display 값:', getComputedStyle(modal).display, '/ 부모 요소:', modal.parentElement);
}

function dismissEssaySaChecklist() {
  forceHideModal($('essaySelfAssessModal'));
}

/** 문항별 1~5점 선택 — 선택된 버튼만 강조 표시 */
function setEssaySaRating(idx, value, btnEl) {
  _essaySaRatings[idx] = value;
  const row = $(`essaySaRow${idx}`);
  if (!row) return;
  Array.from(row.children).forEach((btn, i) => {
    const selected = (i + 1) === value;
    btn.style.background  = selected ? 'var(--orange)' : 'white';
    btn.style.color       = selected ? 'white' : '#999';
    btn.style.borderColor = selected ? 'var(--orange)' : 'var(--border)';
  });
}

/** 평가 완료 — 모든 문항 응답 확인 → 점수 집계 → 결과 표시 → 보너스 잉크 지급 */
async function submitEssaySelfAssessment() {
  const total    = ESSAY_SA_QUESTIONS.length;
  const answered = Object.keys(_essaySaRatings).length;
  if (answered < total) {
    toast(`✏️ 아직 ${total - answered}개 문항에 답하지 않았어요! 모든 문항에 1~5점을 골라주세요.`);
    return;
  }

  const sum = Object.values(_essaySaRatings).reduce((a, b) => a + b, 0);
  const avg = sum / total; // 1~5점 평균

  let comment;
  if      (avg >= 4.5) comment = '🌟 최고예요! 논설문에 필요한 요소를 꼼꼼하게 다 갖췄어요!';
  else if (avg >= 3.5) comment = '😊 아주 잘 썼어요! 조금만 더 다듬으면 완벽해질 거예요!';
  else if (avg >= 2.5) comment = '🙂 잘 하고 있어요! 부족했던 항목들을 다시 살펴봐요!';
  else if (avg >= 1.5) comment = '😅 조금 더 노력이 필요해요! 체크한 항목부터 다시 고쳐볼까요?';
  else                  comment = '💪 처음부터 차근차근, 다시 한번 도전해봐요!';

  let aiCompareHTML = '';
  if (_lastEssayAnalysis && typeof _lastEssayAnalysis.richness === 'number') {
    const selfOn10 = Math.round(avg * 2 * 10) / 10; // 5점 척도 → 10점 척도로 환산
    aiCompareHTML = `<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--orange);">🤖 AI 점수: <b>${_lastEssayAnalysis.richness}/10</b> &nbsp;vs&nbsp; 내 자기평가: <b>${selfOn10}/10</b></div>`;
  }

  const resultBox = $('essaySaResultBox');
  if (resultBox) {
    resultBox.style.display = 'block';
    resultBox.innerHTML = `📊 총점 <b>${sum}/${total * 5}점</b> (평균 ${avg.toFixed(1)}/5)<br>${comment}${aiCompareHTML}`;
  }

  toast('📝 자기 평가를 완료했어요! 스스로 돌아보는 멋진 습관이에요 🌱');
  try { await addInk(5); } catch (e) { /* 잉크 지급 실패는 평가 자체를 막지 않음 */ }
}

/* ══════════════════════════════════════════════════════════
   논설문 퇴고(다시쓰기) 시스템 — item: "논설문 쓰기에도 퇴고 버튼/시스템 추가"
   그림일기용 퇴고 모달(openRevisionModal, 04-ieum-diary.js)과는 완전히 독립적으로
   동작하며, essayTextarea를 직접 대상으로 한다. AI가 찾아준 문장별 개선 제안을
   학생이 하나씩 골라 적용하거나, 한 번에 모두 적용할 수 있다.
══════════════════════════════════════════════════════════ */
let _essayRevisions = []; // [{original, corrected, category, reason, applied}]

async function launchEssayRevision() {
  const modal = $('essayRevisionModal');
  if (!modal) return;
  const ta = $('essayTextarea');
  const text = (ta?.value || '').trim();
  const isEn = _currentLang === 'en';

  if (text.length < 15) {
    toast(isEn ? '✏️ Write a bit more before revising!' : '✏️ 퇴고하기 전에 조금 더 써보아요!');
    return;
  }

  const loadingEl   = $('essayRevisionLoading');
  const overallEl   = $('essayRevisionOverall');
  const emptyEl     = $('essayRevisionEmpty');
  const listWrap    = $('essayRevisionListWrap');
  const applyAllBtn = $('essayRevisionApplyAllBtn');

  if (overallEl)   { overallEl.style.display = 'none'; overallEl.innerHTML = ''; }
  if (emptyEl)     { emptyEl.style.display = 'none'; emptyEl.innerHTML = ''; }
  if (listWrap)    listWrap.innerHTML = '';
  if (applyAllBtn) applyAllBtn.style.display = 'none';
  if (loadingEl)   loadingEl.style.display = 'block';
  _essayRevisions = [];
  forceShowModal(modal);

  try {
    const result = await reviseEssayWithAI(text);
    _essayRevisions = (result.revisions || []).map(r => ({ ...r, applied: false }));

    if (loadingEl) loadingEl.style.display = 'none';

    if (overallEl && result.overallComment) {
      overallEl.style.display = 'block';
      overallEl.innerHTML = `🌟 ${result.overallComment}`;
    }

    if (_essayRevisions.length === 0) {
      if (emptyEl) {
        emptyEl.style.display = 'block';
        emptyEl.innerHTML = isEn
          ? '🎉 No revisions needed — your essay looks great!'
          : '🎉 더 고칠 부분이 없어요! 정말 잘 썼어요!';
      }
      return;
    }

    renderEssayRevisionList();
    if (applyAllBtn) applyAllBtn.style.display = 'block';
  } catch (e) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (emptyEl) {
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = isEn
        ? '⚠️ Could not load revision suggestions. Please try again.'
        : '⚠️ 퇴고 제안을 불러오지 못했어요. 다시 시도해주세요.';
    }
    console.warn('[essay-revision] 실패:', e);
  }
}

function renderEssayRevisionList() {
  const listWrap = $('essayRevisionListWrap');
  if (!listWrap) return;
  const isEn = _currentLang === 'en';
  const categoryColor = {
    '맞춤법':'#e07040', '띄어쓰기':'#e07040', '문장호응':'#e07040',
    'spelling':'#e07040', 'grammar':'#e07040',
    '표현':'var(--orange)', 'word-choice':'var(--orange)',
    '내용보강':'#8a7ce8', 'content':'#8a7ce8'
  };
  listWrap.innerHTML = _essayRevisions.map((r, i) => {
    const color = categoryColor[r.category] || 'var(--blue)';
    const highlightedCorrected = buildDiffHighlight(r.original || '', r.corrected || '');
    return `
      <div style="border:1.5px solid var(--border);border-radius:10px;padding:10px 12px;" id="essayRevItem${i}">
        <span style="display:inline-block;background:${color};color:white;font-size:10px;padding:2px 8px;border-radius:10px;margin-bottom:6px;">${escHtml(r.category || (isEn ? 'general' : '표현'))}</span>
        <div style="font-size:12px;color:#b33;text-decoration:line-through;opacity:.75;margin-bottom:3px;word-break:keep-all;">${escHtml(r.original || '')}</div>
        <div style="font-size:12.5px;color:#2a6a4a;font-weight:bold;margin-bottom:5px;word-break:keep-all;">${highlightedCorrected}</div>
        <div style="font-size:11px;color:#888;margin-bottom:7px;word-break:keep-all;">💬 ${escHtml(r.reason || '')}</div>
        <button onclick="applyEssayRevisionItem(${i})" id="essayRevApplyBtn${i}"
          style="padding:6px 14px;background:white;border:1.5px solid #4a90c2;color:#4a90c2;border-radius:8px;font-family:inherit;font-size:12px;font-weight:bold;cursor:pointer;">
          ${isEn ? '✅ Apply' : '✅ 적용하기'}
        </button>
      </div>`;
  }).join('');
}

/** 제안 하나를 essayTextarea에 직접 적용. opts.silent=true면 "원문을 못 찾음" 경고 토스트를 생략
    (전체 적용 시 토스트가 여러 번 겹쳐 뜨는 것을 방지하기 위함) */
function applyEssayRevisionItem(idx, opts) {
  const silent = !!(opts && opts.silent);
  const r = _essayRevisions[idx];
  if (!r || r.applied) return true;
  const ta = $('essayTextarea');
  if (!ta) return false;

  if (r.original && ta.value.includes(r.original)) {
    ta.value = ta.value.replace(r.original, r.corrected || '');
  } else {
    if (!silent) {
      toast(_currentLang === 'en'
        ? '⚠️ Could not find the exact original text — it may have changed.'
        : '⚠️ 원래 문장을 찾지 못했어요. 글이 바뀌었을 수 있어요.');
    }
    return false;
  }

  r.applied = true;
  const btn = $(`essayRevApplyBtn${idx}`);
  if (btn) {
    btn.textContent = _currentLang === 'en' ? '✔️ Applied' : '✔️ 적용됨';
    btn.disabled = true;
    btn.style.background = '#eee';
    btn.style.color = '#aaa';
    btn.style.borderColor = '#ddd';
    btn.style.cursor = 'default';
  }
  onEssayInput();
  return true;
}

function applyAllEssayRevisions() {
  let failCount = 0;
  _essayRevisions.forEach((r, i) => {
    if (!r.applied && !applyEssayRevisionItem(i, { silent: true })) failCount++;
  });
  const isEn = _currentLang === 'en';
  if (failCount > 0) {
    toast(isEn
      ? `✅ Applied! (${failCount} couldn't be matched — the text may have changed)`
      : `✅ 적용했어요! (${failCount}개는 원문을 찾지 못해 건너뛰었어요)`);
  } else {
    toast(isEn ? '✅ All suggestions applied!' : '✅ 모든 제안을 적용했어요!');
  }
}

function dismissEssayRevision() {
  forceHideModal($('essayRevisionModal'));
}

/* AI에게 퇴고(다시쓰기) 제안 요청 — analyzeEssay()의 채점용 프롬프트와는 별도로,
   "문장을 더 좋게 다시 쓰기"에 집중한 전용 프롬프트를 사용한다 */
async function reviseEssayWithAI(text) {
  const isEn = _currentLang === 'en';
  const topicTitle = _currentEssayTopic ? _currentEssayTopic.title : (isEn ? 'Free topic' : '자유 주제');

  const systemPrompt = isEn ? `You are a warm English writing teacher helping an elementary student (ages 10-13) revise their essay.
Topic: "${topicTitle}"

Find up to 5 sentences or phrases that could be revised to be clearer, more vivid, or more correct.
For each one, provide:
- "original": the exact original sentence/phrase from the student's text (short, max 1 sentence)
- "corrected": an improved version
- "category": one of "spelling" | "grammar" | "word-choice" | "content"
- "reason": one short, kind sentence explaining why this is better

Also give an "overallComment": 1 short encouraging sentence about the essay overall.
If the essay is already excellent, return an empty "revisions" array.

Return ONLY valid JSON (no markdown, no code fences):
{
  "revisions":[{"original":"...","corrected":"...","category":"...","reason":"..."}],
  "overallComment":"..."
}` : `너는 초등학생(10~13세)의 논설문 퇴고를 도와주는 다정한 국어 선생님이야.
주제: "${topicTitle}"

학생의 글에서 더 자연스럽고 풍부하게 고치면 좋을 문장이나 표현을 최대 5개 찾아줘.
각 항목마다:
- "original": 학생 글의 원래 문장/표현 그대로 (짧게, 1문장 이내)
- "corrected": 더 자연스럽고 구체적으로 고친 문장
- "category": 다음 중 하나 — "맞춤법" | "띄어쓰기" | "문장호응" | "표현" | "내용보강"
- "reason": 왜 이렇게 고치면 더 좋은지 다정하게 한 문장으로 설명

"overallComment"에는 전체적으로 퇴고하면 글이 얼마나 좋아질지 칭찬과 격려를 담아 1~2문장으로 적어줘.
이미 글이 훌륭하다면 "revisions"를 빈 배열로 반환해.

오직 유효한 JSON만 반환해 (마크다운 금지, 코드블록 금지):
{
  "revisions":[{"original":"...","corrected":"...","category":"...","reason":"..."}],
  "overallComment":"..."
}`;

  const raw = await callClaude({
    model: 'claude-haiku-4-5-20251001', max_tokens: 1400,
    system: systemPrompt,
    messages: [{ role:'user', content:`${isEn ? "Student's essay:" : '학생이 쓴 논설문:'}\n${text}` }]
  });

  const cleanedRaw = (typeof raw === 'string' ? raw : (raw ? JSON.stringify(raw) : ''))
    .replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = parseJSON(cleanedRaw);
  if (!parsed) {
    console.warn('[essay-revision] AI 응답 JSON 파싱 실패. 원본 응답:', raw);
    throw new Error('essay-revision-parse-failed');
  }
  if (!Array.isArray(parsed.revisions)) parsed.revisions = [];
  return parsed;
}

/* ══════════════════════════════════════════════════════════
   알(펫) 위젯 — 누를 때마다 다양한 대화가 말풍선에 나타나도록 추가
   petTap()은 다른 스크립트 파일(예: 01-core-init.js / 02-core-utils.js)에
   정의되어 있을 가능성이 높아, 그 파일은 직접 수정할 수 없음. 대신 기존
   petTap()의 동작(경험치 증가, 레벨업 등으로 추정)은 그대로 호출해서 보존하고,
   "다양한 대화 표시" 기능만 안전하게 덧붙인다.
   DOMContentLoaded 시점에는 모든 <script> 태그가 이미 실행을 마친 뒤이므로,
   petTap이 어느 파일에 정의되어 있든, 로딩 순서와 상관없이 항상 마지막에
   한 번 더 안전하게 감쌀 수 있다.
══════════════════════════════════════════════════════════ */
const PET_DIALOGUE_KO = [
  '오늘도 글쓰기 화이팅이야! 🌱',
  '꾸욱... 나 지금 알에서 깨어나는 중인가? 두근두근!',
  '네가 글을 쓸 때마다 나도 무럭무럭 자라는 기분이야!',
  '심심한데... 나랑 같이 이야기 하나 만들어볼래?',
  '오늘 날씨가 좋아서 글이 술술 나올 것 같아!',
  '최고의 문장은 짧고 솔직한 문장이래! 한번 써볼까?',
  '히히, 너 글씨 진짜 빨리 쓰네? 손가락 안 아파?',
  '내가 알에서 나오면 무슨 모습일지 궁금하지 않아?',
  '물방울 모으는 거 잊지 마! 글을 쓰면 쑥쑥 늘어나~',
  '음... 다음엔 어떤 이야기를 써볼까 고민 중이야',
  '너랑 매일 만나니까 진짜 좋아!',
  '쉿... 비밀인데, 사실 나도 글쓰기 좋아해',
  '오늘 일기엔 무슨 색깔이 어울릴까?',
  '토닥토닥, 잘하고 있어!',
  '글쓰기 슬럼프? 한 문장만 써봐, 그게 시작이야!',
  '나 한번 콕 찔러줄래? 헤헤',
  '다른 친구들은 오늘 어떤 글을 썼을까 궁금해!',
  '이야기 속 주인공이 되어보는 건 어떨까?',
  '오늘의 미션, 벌써 깼어? 대단한데!',
  '쪼끔만 더 크면... 나 뭐가 될까? 기대돼!',
  '글을 쓸 때 마음이 편안해지지 않아?',
  '고마워! 매일 나를 들여다봐줘서!',
  '혹시 오늘 기분은 어때? 글에 담아봐!',
  '단어 하나가 모이면 멋진 문장이 된대!',
  '너의 이야기, 다음 편이 너무 궁금해!',
  '쉿! 너만 알고 있어, 나는 사실 잠꾸러기야 😴',
  '글 쓰다가 막히면 그림부터 그려봐도 좋아!',
  '오늘도 와줘서 고마워! 보고 싶었어~',
];

const PET_DIALOGUE_EN = [
  "Keep writing — you're doing great! 🌱",
  "I wonder what I'll hatch into... so exciting!",
  "Every sentence you write helps me grow!",
  "Let's make up a story together!",
  "Don't forget to collect water drops by writing!",
  "You write so fast — your fingers must be tired!",
  "I love spending time with you every day!",
  "What story should we write next?",
  "One sentence is all it takes to start!",
  "I'm curious what I'll look like when I hatch!",
  "Thanks for checking on me today!",
  "Writing makes my heart feel warm too 💛",
  "Got any fun ideas for today's story?",
  "Shh... don't tell anyone, but I love naps too 😴",
];

let _petBubbleTimer = null;

/** 말풍선에 무작위 대화를 표시 (가끔은 현재 레벨을 언급하는 멘트도 살짝 섞음) */
function showRandomPetDialogue() {
  const bubble = $('petBubble');
  if (!bubble) return;
  const isEn = (typeof _currentLang !== 'undefined') && _currentLang === 'en';
  const pool = isEn ? PET_DIALOGUE_EN : PET_DIALOGUE_KO;

  const lvEl = $('petLevel');
  const lvNum = lvEl ? parseInt((lvEl.textContent || '').replace(/[^0-9]/g, ''), 10) : NaN;

  let line;
  if (!isNaN(lvNum) && lvNum > 0 && Math.random() < 0.15) {
    line = isEn ? `I'm already Lv.${lvNum} thanks to you! 🎉` : `벌써 Lv.${lvNum}이라니, 너 덕분이야! 🎉`;
  } else {
    line = pool[Math.floor(Math.random() * pool.length)];
  }

  bubble.textContent = line;
  /* petBubble의 정확한 CSS 동작 방식을 알 수 없어(외부 CSS 파일), class 토글과
     인라인 스타일을 함께 사용해 어떤 구현 방식이든 확실히 보이도록 방어적으로 처리 */
  bubble.style.display = 'block';
  bubble.style.opacity  = '1';
  bubble.classList.add('show');
  clearTimeout(_petBubbleTimer);
  _petBubbleTimer = setTimeout(() => {
    bubble.classList.remove('show');
    bubble.style.opacity = '0';
  }, 2600);
}

document.addEventListener('DOMContentLoaded', () => {
  const _originalPetTap = (typeof window.petTap === 'function') ? window.petTap : null;
  window.petTap = function () {
    if (_originalPetTap) {
      try { _originalPetTap(); } catch (e) { console.warn('[pet] 기존 petTap() 실행 중 오류:', e); }
    }
    showRandomPetDialogue();
  };
});
