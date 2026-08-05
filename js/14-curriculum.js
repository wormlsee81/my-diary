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
     ② WG_UNITS (교과서 단원 번호·단원명·학습 목표)
        → **6학년은 실물 교과서에서 직접 확인해 채웠다.**
          5-1·5-2·6-2 는 「차례」 면에서('나' 책 단원까지 실려 있다),
          6-1 은 차례 면이 없어 각 단원 도입면에서 읽었다.
          ✅ 5·6학년 32개 단원 신뢰 가능.
        → **5학년도 실물 교과서로 채웠다.** 5-1·5-2 「차례」 면에서 확인했다.
          5·6학년 8권을 모두 확인해 32개 단원의 단원명·학습 목표가 전부 채워졌다.
        → 표지 저작자가 「교육부」인 **국정 교과서**이므로(제조는 (주)미래엔)
          단원명은 전국 공통이며 출판사별로 다르지 않다.
        → 선생님이 앱 안 「📖 단원」 → ✏️ 단원 직접 만들기 로 추가할 수도 있다.
     ③ elem (내용 요소)
        → 교육부 고시 국어과 「내용 체계」 5~6학년 칸의 문구를 그대로 옮겼다. ✅
     ④ std (성취기준 코드)
        → ✅ **교사용 지도서 4권의 단원별 성취기준 표와 대조 완료.**
          32개 단원 전부 확정값이며, WG_STD 문구도 지도서 수록 교육과정
          원문 그대로다. (과거 [6국02-04] 문구 오류를 이때 바로잡았다:
          원문은 '다양한 관점의 글을 읽고 문제 해결에 활용', 타당성 평가는 [6국02-03])

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
  { code: '6국01-01', area: '듣말', text: '대화에서 생략된 내용을 추론하며 듣는다' },
  { code: '6국01-02', area: '듣말', text: '주장을 파악하고 이유나 근거가 타당한지 평가하며 듣는다' },
  { code: '6국01-03', area: '듣말', text: '주제와 관련하여 궁금한 내용을 질문하며 적극적으로 듣고 말한다' },
  { code: '6국01-04', area: '듣말', text: '면담의 절차를 이해하고 상대와 매체를 고려하여 면담한다' },
  { code: '6국01-05', area: '듣말', text: '자료를 선별하여 핵심 정보를 중심으로 내용을 구성하고 매체를 활용하여 발표한다' },
  { code: '6국01-06', area: '듣말', text: '토의에 협력적으로 참여하며 서로의 의견을 비교하고 조정한다' },
  { code: '6국01-07', area: '듣말', text: '절차와 규칙을 지키고 타당한 이유와 근거를 제시하며 토론한다' },
  { code: '6국02-01', area: '읽기', text: '글의 구조를 고려하며 주제나 주장을 파악하고 글 내용을 요약한다' },
  { code: '6국02-02', area: '읽기', text: '글에서 생략된 내용이나 함축된 표현을 문맥을 고려하여 추론한다' },
  { code: '6국02-03', area: '읽기', text: '글이나 자료를 읽고 내용의 타당성과 표현의 적절성을 평가한다' },
  { code: '6국02-04', area: '읽기', text: '문제 상황과 관련된 다양한 관점의 글을 읽고 이를 문제 해결에 활용한다' },
  { code: '6국02-05', area: '읽기', text: '긍정적인 읽기 동기를 형성하고 적극적으로 읽기에 참여하는 태도를 기른다' },
  { code: '6국03-01', area: '쓰기', text: '알맞은 내용을 선정하여 대상의 특성이 나타나게 설명하는 글을 쓴다' },
  { code: '6국03-02', area: '쓰기', text: '적절한 근거를 사용하고 인용의 출처를 밝히며 주장하는 글을 쓴다' },
  { code: '6국03-03', area: '쓰기', text: '체험한 일에 대한 감상을 나타내는 글을 쓴다' },
  { code: '6국03-04', area: '쓰기', text: '독자와 매체를 고려하여 내용을 생성하고 표현하며 글을 쓴다' },
  { code: '6국03-05', area: '쓰기', text: '쓰기 과정을 점검·조정하며 글을 쓰고, 글 전체를 대상으로 통일성 있게 고쳐 쓴다' },
  { code: '6국03-06', area: '쓰기', text: '쓰기에 적극적으로 참여하며 자신의 글을 독자와 공유하는 태도를 지닌다' },
  { code: '6국04-01', area: '문법', text: '음성 언어 및 문자 언어의 특성을 이해하고 다양한 매체 자료에서 표현 효과를 평가한다' },
  { code: '6국04-02', area: '문법', text: '표준어와 방언의 기능을 파악하고 언어 공동체와 국어생활과의 관계를 이해한다' },
  { code: '6국04-03', area: '문법', text: '고유어와 관용 표현의 쓰임과 가치를 이해하고 상황에 맞게 표현한다' },
  { code: '6국04-04', area: '문법', text: '문장 성분을 이해하고 호응 관계가 올바른 문장을 구성한다' },
  { code: '6국04-05', area: '문법', text: '글과 담화에 쓰인 시간 표현을 이해하고 상황에 맞게 표현한다' },
  { code: '6국04-06', area: '문법', text: '글과 담화에 쓰인 단어 및 문장, 띄어쓰기를 민감하게 살펴 바르게 고치는 태도를 지닌다' },
  { code: '6국05-01', area: '문학', text: '작가의 의도를 생각하며 작품을 읽는다' },
  { code: '6국05-02', area: '문학', text: '비유적 표현의 효과에 유의하여 작품을 감상한다' },
  { code: '6국05-03', area: '문학', text: '소설이나 극을 읽고 인물, 사건, 배경을 파악한다' },
  { code: '6국05-04', area: '문학', text: '인상적인 부분을 중심으로 작품에 대한 의견을 나눈다' },
  { code: '6국05-05', area: '문학', text: '자신의 경험을 시, 소설, 극, 수필 등 적절한 갈래로 표현한다' },
  { code: '6국05-06', area: '문학', text: '작품을 읽고 자신의 삶과 연관 지어 성찰하는 태도를 지닌다' },
  { code: '6국06-01', area: '매체', text: '정보 검색 도구를 활용하여 자신의 목적에 맞는 매체 자료를 찾는다' },
  { code: '6국06-02', area: '매체', text: '뉴스 및 각종 정보 매체 자료의 신뢰성을 평가한다' },
  { code: '6국06-03', area: '매체', text: '적합한 양식과 수용자의 반응을 고려하여 복합양식 매체 자료를 제작하고 공유한다' },
  { code: '6국06-04', area: '매체', text: '자신의 매체 이용 양상에 대해 성찰한다' },
  { code: '4국03-04', area: '쓰기', text: '(3~4학년군) 목적과 주제를 고려하여 독자에게 마음을 전하는 글을 쓴다' },
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
  { id: 'essay',    icon: '⚖️', name: '이음 · 주장하는 글',      std: ['6국03-02', '6국03-05'], go: "launchApp('ieum')" },
  { id: 'review',   icon: '📖', name: '이음 · 독서 감상문',      std: ['6국05-03', '6국05-04'], go: "launchApp('ieum')" },
  { id: 'relay',    icon: '🌱', name: '틔움 · 릴레이 동화',      std: ['6국05-05'],             go: "launchApp('ttieum')" },
  { id: 'debate',   icon: '🗣️', name: '틔움 · 토론',            std: ['6국01-07', '6국01-06'],             go: "launchApp('ttieum')" },
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
  { id: 'g_det',     icon: '🔍', name: '게임 · 기자 검증',       std: ['6국02-03', '6국06-02'], go: 'wgStartDetective()' },
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
const WG_UNITS = [
  /* ── 5학년 1학기 (실물 교과서 「차례」 확인) ────────────
     단원명·번호는 「차례」 면에서, 학습 목표는 각 단원 도입면에서 확인했다. */
  { grade:'5-1', no:0, label:'독서 단원', name:'책을 읽고 함께 이야기해요',
    goal:'책을 읽고 인상 깊은 내용 이야기하기',
    std:['6국02-01', '6국05-04', '6국02-05'], acts:['review'] },
  { grade:'5-1', no:1, name:'대화를 나누어요',
    goal:'상대를 배려하고 생략된 내용을 짐작하며 대화하기',
    std:['6국01-01', '6국01-03'], acts:['g_tele','g_smuggle'] },
  { grade:'5-1', no:2, name:'체험한 일을 글로 써요',
    goal:'시간 표현을 활용하여 체험한 일 쓰기',
    std:['6국03-03', '6국04-05'], acts:['diary','g_speed','g_truth'] },
  { grade:'5-1', no:3, name:'발표하고 질문해요',
    goal:'자료를 활용하여 발표하고 질문하며 듣기',
    std:['6국01-05', '6국01-03', '6국06-01'], acts:['g_speed','explain'] },
  { grade:'5-1', no:3.5, label:'매체 단원', name:'필요한 정보를 찾아요',
    goal:'검색 도구를 활용하여 필요한 정보 찾기',
    std:['6국06-01'], acts:['g_det','explain'] },
  { grade:'5-1', no:4, name:'대상을 설명해요',
    goal:'글의 구조를 고려해 내용을 요약하고 설명하는 글 쓰기',
    std:['6국03-01', '6국02-01'], acts:['explain','g_robot','g_tele'] },
  { grade:'5-1', no:5, name:'의논하며 토의해요',
    goal:'다양한 관점을 이해하며 토의하기',
    std:['6국01-06', '6국02-04'], acts:['debate','g_det'] },
  { grade:'5-1', no:6, name:'작품을 즐겨요',
    goal:'비유적 표현과 인상적인 부분을 생각하며 작품 감상하기',
    std:['6국05-02', '6국05-04'], acts:['poem','metaphor','review','g_temp'] },

  /* ── 5학년 2학기 (실물 교과서 확인 · 학습 목표까지) ───── */
  { grade:'5-2', no:0, label:'독서 단원', name:'여러 가지 형태의 책을 읽어요',
    goal:'매체를 활용해 책 읽기',
    std:['6국02-05', '6국06-01'], acts:['review'] },
  { grade:'5-2', no:1, name:'작품에 대한 의견을 나누어요',
    goal:'작품을 읽고 인상적인 부분에 대한 의견 나누기',
    std:['6국05-04', '6국01-06'], acts:['review'] },
  { grade:'5-2', no:2, name:'올바른 문장으로 글을 써요',
    goal:'올바른 문장을 구성하고 매체를 고려해 글 쓰기',
    std:['6국04-04', '6국03-04'], acts:['g_combo','g_diet','g_monster','diary'] },
  { grade:'5-2', no:3, name:'표준어와 방언을 알아봐요',
    goal:'표준어와 방언을 이해하고 방언이 나오는 작품 감상하기',
    std:['6국04-02', '6국05-06'], acts:['g_auction','g_smuggle'] },
  { grade:'5-2', no:3.5, label:'매체 단원', name:'판단하며 이용해요',
    goal:'매체 자료의 신뢰성 판단하기',
    std:['6국06-02'], acts:['g_det'] },
  { grade:'5-2', no:4, name:'의견을 조정해요',
    goal:'토의를 통해 의견을 조정하며 문제 해결하기',
    std:['6국01-06', '6국01-03'], acts:['debate'] },
  { grade:'5-2', no:5, name:'추론하며 읽어요',
    goal:'생략된 내용을 추론하며 읽기',
    std:['6국02-02', '6국02-01'], acts:['review','g_det'] },
  { grade:'5-2', no:6, name:'작품을 감상해요',
    goal:'이야기와 극본을 이해하며 감상하기',
    std:['6국05-03', '6국05-04', '6국02-05'], acts:['review','relay','poem'] },

  /* ── 6학년 1학기 (실물 교과서 확인) ───────────────────── */
  { grade:'6-1', no:0, label:'독서 단원', name:'같은 주제에 대한 책을 읽고 생각을 나누어요',
    goal:'같은 주제의 책을 읽고 생각 나누기',
    std:['6국02-05', '6국01-06'], acts:['review','g_det'] },
  { grade:'6-1', no:1, name:'자신의 삶과 관련지어 읽어요',
    goal:'인물이 추구하는 가치를 이해하고 자신의 삶 되돌아보기',
    std:['6국05-06', '6국02-05', '6국01-03'], acts:['review'] },
  { grade:'6-1', no:2, name:'바르게 고쳐 써요',
    goal:'글을 바르게 고쳐 쓰고 쓴 글 공유하기',
    std:['6국04-06', '6국04-04', '6국03-06'], acts:['diary','g_monster','g_diet'] },
  { grade:'6-1', no:3, name:'절차를 지키며 토론해요',
    goal:'타당한 이유와 근거를 제시하며 절차를 지켜 토론하기',
    std:['6국01-07', '6국01-02'], acts:['debate'] },
  { grade:'6-1', no:3.5, label:'매체 단원', name:'매체 자료를 만들어요',
    goal:'복합양식 매체 자료 만들기',
    std:['6국06-03'], acts:['publish'] },
  { grade:'6-1', no:4, name:'상황에 맞게 표현해요',
    goal:'관용 표현의 가치를 이해하고 표현하기',
    std:['6국04-03', '6국03-03'], acts:['g_auction','g_smuggle'] },
  { grade:'6-1', no:5, name:'자신의 글쓰기 과정을 살펴봐요',
    goal:'주장하는 글을 쓰고 자신의 글쓰기 과정 되돌아보기',
    std:['6국03-02', '6국03-05', '6국04-06'], acts:['essay','diary'] },
  { grade:'6-1', no:6, name:'비판적으로 읽어요',
    goal:'정보와 표현을 판단하며 읽기',
    std:['6국02-03', '6국02-04'], acts:['g_det'] },

  /* ── 6학년 2학기 (실물 교과서 확인) ───────────────────── */
  { grade:'6-2', no:0, label:'독서 단원', name:'다양한 책을 읽고 문제를 해결해요',
    goal:'다양한 관점의 글을 읽고 창의적인 해결 방안 마련하기',
    std:['6국02-04', '6국03-06'], acts:['g_det','review'] },
  { grade:'6-2', no:1, name:'깊이 있게 감상해요',
    goal:'작가의 의도를 짐작하며 작품을 읽고 이야기의 줄거리 간추리기',
    std:['6국02-01', '6국05-01', '6국04-05'], acts:['review'] },
  { grade:'6-2', no:2, name:'궁금한 점을 해결해요',
    goal:'상대와 매체를 고려하여 면담하기',
    std:['6국01-04', '6국01-03'], acts:['g_tele','g_speed'] },
  { grade:'6-2', no:3, name:'보거나 듣고 판단해요',
    goal:'주장, 이유, 근거의 타당성을 판단하며 보거나 듣기',
    std:['6국01-02', '6국02-03'], acts:['g_det','debate'] },
  { grade:'6-2', no:3.5, label:'매체 단원', name:'매체 이용 습관을 돌아봐요',
    goal:'자신의 매체 이용 습관 돌아보기',
    std:['6국06-04'], acts:['diary'] },
  { grade:'6-2', no:4, name:'소중한 우리말',
    goal:'고유어의 가치를 이해하고 우리말을 상황에 맞게 표현하기',
    std:['6국04-02', '6국04-03', '6국02-02'], acts:['g_auction','g_smuggle'] },
  { grade:'6-2', no:5, name:'언어와 소통',
    goal:'매체 자료에서 언어의 표현 효과를 이해하고 독자를 고려하여 글 쓰기',
    std:['6국04-01', '6국03-04'], acts:['explain','g_robot','g_diet','g_combo'] },
  { grade:'6-2', no:6, name:'시와 이야기로 표현해요',
    goal:'자신의 경험을 시나 이야기로 표현하기',
    std:['6국05-05', '6국05-02', '6국03-06'], acts:['poem','relay','g_temp'] }

];

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

/** '3단원' / '독서 단원' / '매체 단원' */
function wgUnitHead(u) {
  return u.label ? wgEsc(u.label) : (u.no + '단원');
}

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
  const u = wgCurUnit();
  if (!u) return true;
  /* 성취기준 코드가 없는 단원(면담·매체 점검 등)은 acts 로 직접 연결한다 */
  if (Array.isArray(u.acts) && u.acts.length) {
    if (u.acts.indexOf(act.id) !== -1) return true;
  }
  const on = wgActiveStd();
  if (!on.length) return (Array.isArray(u.acts) && u.acts.length) ? false : true;
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
      ? (u.grade + ' ' + (u.label || (u.no + '단원')) + ' · ' + u.name)
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
          wgUnitHead(u) + ' · ' + wgEsc(u.name) +
          '<span class="wg-note">— ' + wgEsc(u.goal || '') + '</span></button>';
      });
    });
  } else {
    /* 단원표가 비었을 때: 성취기준 영역으로 대체 제공 */
    html +=
      '<div class="wg-banner">📗 <b>단원 목록이 비어 있어요.</b><br>' +
      '아래 <b>영역</b>으로 고르시거나 <b>✏️ 단원 직접 만들기</b>로 추가해 주세요.</div>';
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
  wgSetCurUnit({ kind: 'unit', grade: u.grade, no: u.no, label: u.label,
                 name: u.name, goal: u.goal, std: u.std || [], acts: u.acts || [] });
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
  const title = (u.kind === 'unit') ? (u.grade + ' ' + (u.label || (u.no + '단원')) + ' · ' + u.name) : (u.area + ' 영역');
  const acts = WG_ACTIVITY.filter(wgActivityMatches);

  let html = '<h3>📖 ' + wgEsc(title) + '</h3>' +
    '<p class="wg-note">이 단원에서 해 볼 수 있는 활동이에요.</p>';

  if (u.goal) {
    html += '<div class="wg-banner">🎯 <b>학습 목표</b> — ' + wgEsc(u.goal) + '</div>';
  } else if (u.kind === 'unit') {
    html += '<p class="wg-note">이 단원의 학습 목표는 아직 확인하지 못했어요. ' +
            '교과서 단원 첫 쪽에 적혀 있어요.</p>';
  }
  html += '<div class="wg-stage">📘 성취기준</div>';

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
  const label = (u.kind === 'unit') ? (u.grade + ' ' + (u.label || (u.no + '단원')) + ' · ' + u.name) : (u.area + ' 영역');
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
