/* ============================================================
 * [이음-일기] 미션 뽑기 · 일기 작성/분석 · 선생님 피드백 · 인쇄/JPG 저장 · 퇴고 모달
 * (분할 자동 생성 — 원본 index.html에서 추출, 로드 순서 유지 필수)
 * ============================================================ */
let monsterFeatures='';
async function getWitnessReport(){
  const box=$('mWitnessBox'),btn=$('witnessBtn'),drawBtn=$('mDrawBtn');
  btn.disabled=true;drawBtn.disabled=true;
  $('mMontageInput').value='';$('mScoreBox').style.display='none';
  $('mResultImg').style.display='none';$('mImgPlaceholder').style.display='flex';
  
  $('mCrimeDesc').textContent = '기억을 떠올리는 중...';
  box.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;gap:10px;"><div style="font-size:28px;animation:spin 1s linear infinite;">⏳</div><div id="witnessStatus" style="color:#666;font-size:12px;text-align:center;">목격자 정보 받는 중...</div></div>`;
  
  try{
    const raw=await callClaude({
      model:'claude-haiku-4-5-20251001', max_tokens: 250,
      system:`Create a random target for a witness memory. Randomly choose between a 'unique human', a 'cute animal thief', OR a 'fun fantasy creature/monster' based on the crime.
Return ONLY valid JSON format:
{
  "features": "한국어 외형 묘사 2-3문장",
  "crime": "초등학생이 웃을 수 있는 귀여운 범행 내용 (예: 몰래 냉장고 푸딩 다 먹고 도망친 죄 등)",
  "prompt": "clear front view character design, full body, caught on cctv, highly detailed"
}`,
      messages:[{role:'user',content:'Create'}]
    });
    
    const d=parseJSON(raw);
    if(!d || !d.prompt) throw new Error('API 데이터 형식이 올바르지 않습니다.');
    
    monsterFeatures=d.features;
    $('mCrimeDesc').textContent = `🚨 죄목: ${d.crime}`;
    
    const el=$('witnessStatus');if(el)el.textContent='이미지 복원 중...';
    const b64=await generateDalle(d.prompt + ", plain background, full body", 3, msg=>{const e=$('witnessStatus');if(e)e.textContent=msg;}, true);
    
    box.innerHTML=`<img src="${b64}" style="width:100%;height:100%;object-fit:contain;border-radius:12px;">`;
    drawBtn.disabled=false; toast('🎉 기억 복원 완료!');
  }catch(e){
    box.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px;"><div style="font-size:26px;">😢</div><div style="color:#e55;font-size:12px;text-align:center;">오류: ${e.message}</div><button onclick="getWitnessReport()" style="background:var(--blue);color:white;border:none;border-radius:8px;padding:7px 14px;font-family:inherit;font-size:12px;cursor:pointer;">🔄 다시 시도</button></div>`;
    $('mCrimeDesc').textContent = '';
  }
  btn.disabled=false;
}

async function drawMontage(){
  const input=$('mMontageInput').value.trim();if(!input){toast('묘사를 입력해줘!');return;}
  const btn=$('mDrawBtn'),loading=$('mLoading');
  
  // ★ API 호출을 시작하기 전에 타임어택 타이머 멈춤 (추가)
  if(taActive) {
    clearInterval(taTimer);
  }

  btn.disabled=true;loading.style.display='flex';
  $('mImgPlaceholder').style.display='none';$('mResultImg').style.display='none';$('mScoreBox').style.display='none';
  $('mArrestStamp').className = 'arrest-stamp';  
  try{
    const[scoreRaw,promptRaw]=await Promise.all([
      callClaude({
        model:'claude-haiku-4-5-20251001', max_tokens:200,
        system:`Compare original features: [${monsterFeatures}] with user description: [${input}]. 
Return ONLY JSON format: {
  "score":<0-100>,
  "feedback":"<Korean 1 sentence warm feedback>",
  "goodPoint":"<Korean: what specific expression in the student's writing was good, e.g. '파란 눈동자라고 쓴 표현이 정확해요'>",
  "nextTip":"<Korean: one specific thing the student could add next time to describe better, e.g. '다음엔 귀 모양이나 입 표정도 써보면 어떨까요?'>"
}`,
        messages:[{role:'user',content:'Evaluate'}]
      }),
      callClaude({
        model:'claude-haiku-4-5-20251001', max_tokens:80,
        system:`Convert Korean description to English image prompt. Style: Cute cartoon, thick outline, bright colors, plain white background, full body character. Max 25 words. Return ONLY the English prompt, NO Korean characters.`,
        messages:[{role:'user',content:input}]
      })
    ]);
    
    const sc=parseJSON(scoreRaw)||{score:75,feedback:'잘 묘사했어요!',goodPoint:'',nextTip:''};
    const richScore=Math.round(sc.score/10);
    const b64=await generateDalle(promptRaw.trim(), richScore, msg=>{$('mLoadingMsg').textContent=msg;});
    
    loading.style.display='none';
    $('mResultImg').src=b64;$('mResultImg').style.display='block';
    $('mScoreText').textContent=`일치율: ${sc.score}%`;
    $('mFeedbackText').textContent=sc.feedback;
    
    const coachEl=$('mCoachText');
    if(coachEl && (sc.goodPoint || sc.nextTip)){
      let coachHtml='';
      if(sc.goodPoint) coachHtml+=`⭐ <b>잘된 표현:</b> ${sc.goodPoint}<br>`;
      if(sc.nextTip) coachHtml+=`✏️ <b>다음엔 이것도:</b> ${sc.nextTip}`;
      coachEl.innerHTML=coachHtml;
      coachEl.style.display='block';
    }
    
    const stampEl = $('mArrestStamp');
    if (sc.score >= 70) {
      stampEl.textContent = '검거 성공!';
      stampEl.classList.add('success');
    } else {
      stampEl.textContent = '검거 실패..';
      stampEl.classList.add('fail');
    }
    
    $('mScoreBox').style.display='flex';
    setTimeout(() => stampEl.classList.add('show'), 100);

    // ⚡ 타임어택 보너스
    if(taActive && sc.score>=80){
      stopTimeAttack();
      addInk(50);
      toast(`🏆 명탐정 칭호! 타임어택 성공! +50💧 보너스`);
    } else if(taActive) {
      stopTimeAttack();
    }

  }catch(e){
    loading.style.display='none';$('mImgPlaceholder').style.display='flex';
    toast('오류: '+e.message);
  }
  btn.disabled=false;
}

/* ═══════════════════════════════════════════════
   2단계: 이음 (50종 미션 전체 복원 및 일기 + 퇴고)
═══════════════════════════════════════════════ */
const DIARY_MISSIONS = [
  { id: 'm1', title: '색깔 사냥꾼 🎨', desc: '오늘 본 가장 예쁜 색깔 3가지를 찾고, 왜 예뻤는지 이유 적기.', aiRule: 'Check if text mentions at least 3 colors and reasons.' },
  { id: 'm2', title: '소리 수집가 🎧', desc: '눈 감고 딱 1분 동안 들린 소리 모두 적어보기. 방금전 들린 소리에도 색이 있다면?', aiRule: 'Check if text lists sounds heard and associates a color with them.' },
  { id: 'm3', title: '맛 칼럼니스트 😋', desc: '오늘 먹은 음식 중 가장 맛있었던 것의 맛을 아주 길게 설명하기.', aiRule: 'Check if there is a highly detailed description of taste/food.' },
  { id: 'm4', title: '사물의 비밀 🗝️', desc: '내 방에서 가장 오래된 물건을 찾아보고, 그 물건의 사연 상상하기.', aiRule: 'Check if user imagines a backstory for an old object.' },
  { id: 'm5', title: '동물 다큐멘터리 🐹', desc: '주변 동물의 10분 관찰기 쓰기.', aiRule: 'Check if there is a detailed observation of an animal.' },
  { id: 'm6', title: '날씨 번역기 ☁️', desc: '오늘의 날씨를 냄새나 촉감으로 표현해 보기 (예: 뽀송뽀송한 냄새).', aiRule: 'Check if weather is described using smell or touch senses.' },
  { id: 'm7', title: '식물 도감 🌿', desc: '길가다 마주친 이름 모를 식물이나 꽃의 생김새 묘사하기.', aiRule: 'Check if there is a visual description of a plant or flower.' },
  { id: 'm8', title: '구름 극장 ☁️', desc: '구름 모양을 관찰하고 어떤 이야기인지 지어내기.', aiRule: 'Check if user creates a story based on cloud shapes.' },
  { id: 'm9', title: '소리 탐정 🕵️', desc: '가족들 발소리나 목소리 특징만으로 누구인지 묘사하기.', aiRule: 'Check if family members are described using only sound/voice traits.' },
  { id: 'm10', title: '지우개의 시선 ✏️', desc: '내 책상 위 지우개 입장에서 오늘 하루를 써보기.', aiRule: 'Check if diary is written from the perspective of an eraser.' },
  { id: 'm11', title: '타임슬립 ⏱️', desc: '타임머신을 타고 조선시대나 고려시대로 간다면 제일 먼저 할 일은?', aiRule: 'Check if user imagines doing something in a past historical era.' },
  { id: 'm12', title: '억만장자 💰', desc: '나에게 갑자기 100억 원이 생긴다면 어떻게 쓸지 구체적으로 계획하기.', aiRule: 'Check if user plans how to spend a large fictional amount of money.' },
  { id: 'm13', title: '일일 교장선생님 🏫', desc: '내가 초등학교 교장선생님이라면 꼭 만들고 싶은 규칙 3가지.', aiRule: 'Check if user lists 3 new school rules as a principal.' },
  { id: 'm14', title: '투명 인간 👻', desc: '오늘 하루 투명 인간이 되었다면 어디서 무엇을 했을까?', aiRule: 'Check if user imagines actions as an invisible person.' },
  { id: 'm15', title: '외계인 가이드 👽', desc: '외계인이 우리 집에 놀러 온다면 가장 먼저 소개해주고 싶은 물건.', aiRule: 'Check if user explains a household object to an alien.' },
  { id: 'm16', title: '게임 속으로 🎲', desc: '내가 게임 속 캐릭터나 방해물이 된다면?', aiRule: 'Check if user imagines themselves inside a board game.' },
  { id: 'm17', title: '동물 통역기 🐕', desc: '동물과 대화할 수 있다면 제일 먼저 물어보고 싶은 것.', aiRule: 'Check if user writes a question they would ask an animal.' },
  { id: 'm18', title: '최후의 만찬 🍽️', desc: '내일 지구가 멸망한다면 오늘 저녁으로 먹고 싶은 메뉴.', aiRule: 'Check if user chooses a final meal before the end of the world.' },
  { id: 'm19', title: '순간이동 🚀', desc: '하늘을 날거나 순간이동을 할 수 있다면 당장 가고 싶은 곳과 이유.', aiRule: 'Check if user imagines teleporting to a specific place with a reason.' },
  { id: 'm20', title: '미래로 보내는 편지 ✉️', desc: '20년 뒤 어른이 된 나에게 쓰는 짧은 편지.', aiRule: 'Check if user writes a letter to their future self.' },
  { id: 'm21', title: '웃음 버튼 😂', desc: '오늘 나를 가장 크게 웃게 만든 일은 무엇인지.', aiRule: 'Check if user describes a funny event that made them laugh.' },
  { id: 'm22', title: '화남 주의보 😡', desc: '요즘 나를 가장 화나게 하거나 짜증 나게 하는 것.', aiRule: 'Check if user describes something that makes them angry or annoyed.' },
  { id: 'm23', title: '이불 킥 😳', desc: '최근에 제일 창피했던 순간과 그때의 솔직한 기분.', aiRule: 'Check if user describes an embarrassing moment and their feelings.' },
  { id: 'm24', title: '나만의 사전 📖', desc: '내가 생각하는 "행복"이란 무엇인지 나만의 말로 정의해 보기.', aiRule: 'Check if user provides their own definition of happiness.' },
  { id: 'm25', title: '칭찬 샤워 🚿', desc: '다른 사람에게 칭찬받았을 때 기분을 아주 자세히 쓰기.', aiRule: 'Check if user describes the feeling of being complimented.' },
  { id: 'm26', title: '지루함 탈출 🥱', desc: '오늘 하루 중 가장 지루했던 시간은 언제였고 왜 그랬는지.', aiRule: 'Check if user describes a boring moment and explains why.' },
  { id: 'm27', title: '공포 체험 😱', desc: '내가 가장 무서워하는 것과 그 이유 분석해 보기.', aiRule: 'Check if user explains their biggest fear and reasons.' },
  { id: 'm28', title: '눈물 한 방울 😢', desc: '오늘 눈물 날 뻔했거나 슬펐던 순간 (없다면 슬펐던 영화 이야기).', aiRule: 'Check if user describes a sad moment or sad movie.' },
  { id: 'm29', title: '질투의 화신 😒', desc: '솔직히 조금 질투 났던 적이 있다면 일기장에만 털어놓기.', aiRule: 'Check if user confesses a moment of jealousy.' },
  { id: 'm30', title: '감정 일기보 ⚡', desc: '오늘 하루 내 기분을 날씨(맑음, 흐림, 번개 등)로 표현해 보기.', aiRule: 'Check if user uses weather metaphors to describe their mood.' },
  { id: 'm31', title: '부모님 인터뷰 🎤', desc: '엄마나 아빠의 어릴 적 장래 희망이나 꿈을 인터뷰하고 적기.', aiRule: 'Check if user writes about their parents childhood dreams.' },
  { id: 'm32', title: '우리 집 헌법 📜', desc: '우리 가족만의 특별한 규칙이나 재미있는 습관 소개하기.', aiRule: 'Check if user describes a unique family rule or habit.' },
  { id: 'm33', title: '칭찬 릴레이 🤝', desc: '내 짝꿍이나 베스트 프렌드의 장점 3가지 찾아내서 적어보기.', aiRule: 'Check if user lists 3 strengths of a friend.' },
  { id: 'm34', title: '비밀 편지 💌', desc: '부모님께 평소 못 했던 고마운 마음이나 서운한 마음 쓰기.', aiRule: 'Check if user writes a heartfelt message to parents.' },
  { id: 'm35', title: '워너비 프렌드 🙋', desc: '내가 가장 친해지고 싶은 친구와 그 이유.', aiRule: 'Check if user mentions someone they want to befriend and why.' },
  { id: 'm36', title: '추억 여행 ✈️', desc: '가족과 함께 갔던 여행 중 가장 기억에 남는 곳.', aiRule: 'Check if user recounts a memorable family trip.' },
  { id: 'm37', title: '미래의 부모님 👨‍👩‍👧', desc: '만약 내가 엄마/아빠가 된다면 어떤 부모가 되고 싶은지.', aiRule: 'Check if user imagines what kind of parent they want to be.' },
  { id: 'm38', title: '화해의 기술 🤝', desc: '친구와 싸웠을 때 화해하는 나만의 비법.', aiRule: 'Check if user shares a personal tip for reconciling with friends.' },
  { id: 'm39', title: '존경하는 인물 🌟', desc: '부모님이나 어른들께 꼭 배우고 싶은 점 한 가지.', aiRule: 'Check if user specifies one trait they want to learn from an adult.' },
  { id: 'm40', title: '우리 반 뉴스 📰', desc: '오늘 우리 반에서 일어난 가장 웃기거나 황당한 에피소드 특종 보도.', aiRule: 'Check if user reports a funny/absurd event from class.' },
  { id: 'm41', title: '다섯 글자 요약 ✋', desc: '오늘 하루를 딱 5글자로 요약하고 이유 쓰기.', aiRule: 'Check if user summarizes their day in exactly 5 characters before explaining.' },
  { id: 'm42', title: '마인드맵 일기 🧠', desc: '오늘 한 일을 마인드맵으로 쫙 펼쳐서 그려보기 (글로 구조화).', aiRule: 'Check if text is structured like a mindmap (keywords and branches).' },
  { id: 'm43', title: '영화 포스터 🎬', desc: '오늘 하루를 영화 제목처럼 지어보고 간단한 줄거리 쓰기.', aiRule: 'Check if user creates a movie title and synopsis for their day.' },
  { id: 'm44', title: '디지털 디톡스 📵', desc: '스마트폰 없이 1시간 버티기 도전! 그리고 그 후기 쓰기.', aiRule: 'Check if user writes about spending time without a smartphone.' },
  { id: 'm45', title: '나만의 발명품 💡', desc: '내가 발명가가 된다면 꼭 만들고 싶은 기계의 설명서 쓰기.', aiRule: 'Check if user writes a manual/description for an imagined invention.' },
  { id: 'm46', title: '억지 칭찬 😇', desc: '오늘 하루 동안 내가 한 "착한 일" 3가지 어떻게든 억지로 찾아내기.', aiRule: 'Check if user forces themselves to list 3 good deeds they did.' },
  { id: 'm47', title: '4컷 만화 🖼️', desc: '만화책이나 웹툰 형식으로 오늘 하루를 4컷으로 나누어 쓰기.', aiRule: 'Check if diary is divided into 4 distinct scenes/panels.' },
  { id: 'm48', title: '나를 광고하라 📢', desc: '나 자신을 다른 사람에게 홍보하는 짧은 광고 문구 만들기.', aiRule: 'Check if user writes an advertisement copy promoting themselves.' },
  { id: 'm49', title: '스마트폰 반성문 📱', desc: '오늘 나의 스크린 타임 기록을 확인해보고 내 사용 습관 평가하기.', aiRule: 'Check if user evaluates their screen time and smartphone habits.' },
  { id: 'm50', title: '내일의 시나리오 📝', desc: '내일 하루 동안 일어났으면 하는 일들을 영화 대본처럼 써보기.', aiRule: 'Check if user writes their wishes for tomorrow in a script format.' }
];

let currentMission = null, curMissionScore = 0;
let missionDrawn = false; // 미션 뽑기 여부 추적
function drawMission() {
  /* 파트 2: 영어 모드일 때 DIARY_MISSIONS_EN 배열 사용 */
  if(_currentLang === 'en'){
    const missionEn = DIARY_MISSIONS_EN[Math.floor(Math.random() * DIARY_MISSIONS_EN.length)];
    // currentMission은 aiRule이 영어로 이미 저장돼 있으므로 그대로 사용
    currentMission = missionEn;
    missionDrawn = true;
    $('mTitle').textContent = `🎯 ${missionEn.title}`;
    // 설명 + 한글 뜻을 찾아 병기 (한국어 DIARY_MISSIONS에서 같은 id 찾기)
    const koMission = DIARY_MISSIONS.find(m => m.id === missionEn.id);
    const koHint = koMission
      ? `<span style="font-size:11px;color:#888;display:block;margin-top:3px;">(${koMission.desc})</span>`
      : '';
    $('mDesc').innerHTML = `${missionEn.desc}${koHint}`;
  } else {
    currentMission = DIARY_MISSIONS[Math.floor(Math.random() * DIARY_MISSIONS.length)];
    missionDrawn = true;
    $('mTitle').textContent = `🎯 ${currentMission.title}`;
    $('mDesc').textContent = currentMission.desc;
  }
  // 미션 뽑으면 점수 표시 활성화 (현재 일기 내용으로 즉시 채점)
  $('missionFill').style.width = `${curMissionScore*10}%`;
  $('missionScoreText').textContent = `${curMissionScore}/10`;
  toast(_currentLang==='en' ? 'New mission arrived! 💌' : '새 미션 도착! 💌');
}

let curImgB64=null,curRich=0,curEntryId=null,progTimer=null;
let curAdvice='잘 썼어요!',curGoodExpression='',curNextChallenge='',curExprAdvice='',curContentAdvice='',curEmpathy='',curSpellingAdvice='',curVoca=''; /* 파트 4: voca 변수 추가 */
// ✅ 분석 캐시: 동일 텍스트 재분석 방지
let _lastAnalyzedText='', _lastAnalysis=null;
const STAMPS=[null,
  {cls:'s1',icon:'📝',text:'노력해봐요'},{cls:'s1',icon:'📝',text:'노력해봐요'},
  {cls:'s2',icon:'🌱',text:'조금 더'},{cls:'s2',icon:'🌱',text:'조금 더'},
  {cls:'s3',icon:'⭐',text:'보통이에요'},{cls:'s3',icon:'⭐',text:'보통이에요'},
  {cls:'s4',icon:'👍',text:'잘했어요'},{cls:'s4',icon:'👍',text:'잘했어요'},
  {cls:'s5',icon:'🌟',text:'참 잘했어요'},{cls:'s5',icon:'🌟',text:'참 잘했어요'},
];

function updateQualityBadge(r){
  const b=$('qualityBadge');
  if(r<=3){b.className='quality-badge low';b.textContent='기본 묘사';}
  else if(r<=6){b.className='quality-badge mid';b.textContent='감각·감정 있음';}
  else{b.className='quality-badge high';b.textContent='생생한 표현 ✨';}
}

function updateStamp(r){
  const el=$('diaryStamp');el.classList.remove('show','s1','s2','s3','s4','s5');
  if(r>=1){const g=STAMPS[r];$('diaryStampIcon').textContent=g.icon;$('diaryStampText').textContent=g.text;el.classList.add(g.cls);requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('show')));}
}

const BADGE_INFO = {
  // 기존 뱃지
  "첫걸음": "badge_1", "개근상": "badge_2", "꾸준함의 달인": "badge_3", "수다쟁이": "badge_4",
  "미션 클리어": "badge_5", "미션 마스터": "badge_6", "묘사왕 피카소": "badge_7", "오감술사": "badge_8",
  "감정의 마술사": "badge_9", "상상력 대장": "badge_10", "긍정왕": "badge_11", "세밀한 관찰자": "badge_12",
  "솔직담백": "badge_13", "위대한 모험가": "badge_14", "가족 사랑": "badge_15", "우정 지킴이": "badge_16",
  "꼬마 자연인": "badge_17", "먹방 요정": "badge_18", "유머러스": "badge_19", "꿈꾸는 별": "badge_20",
  // 누적 등급 뱃지 (일기 개수)
  "브론즈 작가": "badge_21", "실버 작가": "badge_22", "골드 작가": "badge_23", "다이아 작가": "badge_24",
  // 누적 등급 뱃지 (미션)
  "브론즈 미션러": "badge_25", "실버 미션러": "badge_26", "골드 미션러": "badge_27", "다이아 미션러": "badge_28",
  // 누적 등급 뱃지 (퇴고)
  "브론즈 퇴고왕": "badge_29", "실버 퇴고왕": "badge_30", "골드 퇴고왕": "badge_31", "다이아 퇴고왕": "badge_32",
  // 감각별 전문가
  "시각 마법사": "badge_33", "청각 마법사": "badge_34", "촉각 마법사": "badge_35",
  "후각 마법사": "badge_36", "미각 마법사": "badge_37", "비유 마법사": "badge_38",
  // 이스터에그 관련
  "이스터에그 헌터": "badge_39", "희귀 발굴가": "badge_40", "전설 발굴가": "badge_41",
  // 스트릭 (연속 글쓰기)
  "3일 불꽃": "badge_42", "7일 불꽃": "badge_43", "14일 불꽃": "badge_44", "30일 불꽃": "badge_45",
  // 특별 활동
  "토론왕": "badge_46", "이야기꾼": "badge_47", "시인": "badge_48",
  "그림책 작가": "badge_49", "올라운더": "badge_50",
  // 여분
  "꾸준함의 달인 브론즈": "badge_51", "꾸준함의 달인 실버": "badge_52"
};

async function getBadges(){ return (await lsGet(SK.badges(currentNick))) || []; }
async function addBadge(b){
  const bs = await getBadges();
  if(!bs.includes(b)){ bs.push(b); await lsSet(SK.badges(currentNick), bs); setTimeout(()=>toast(`🎉 숨겨진 뱃지 획득: ${b}!`), 1000); updateBadgeProgress(); }
}

async function updateBadgeProgress() {
  const bs = await getBadges();
  const count = bs.length;
  const total = Object.keys(BADGE_INFO).length;
  const el=$('badgeCountText'); if(el) el.textContent = count;
  const totalEl=$('badgeTotalText'); if(totalEl) totalEl.textContent = total;
  const fill=$('badgeProgressFill'); if(fill) fill.style.width = `${(count / total) * 100}%`;
}

async function openBadgeModal() {
  const bs = await getBadges();
  for(const [name, id] of Object.entries(BADGE_INFO)) {
    const el = document.getElementById(id);
    if(el) el.classList.toggle('earned', bs.includes(name));
  }
  await updateBadgeProgress();
  $('badgeModal').classList.add('open');
}

async function checkLocalBadges(text, rich, missionScore) {
  const entries = (await lsGet(SK.entries(currentNick))) || [];
  const count = entries.length;
  // 기존 뱃지
  if (count >= 1) await addBadge("첫걸음");
  if (count >= 3) await addBadge("개근상");
  if (count >= 10) await addBadge("꾸준함의 달인");
  if (text.length >= 150) await addBadge("수다쟁이");
  if (missionScore === 10) await addBadge("미션 클리어");
  if (missionScore === 10 && entries.filter(e => e.missionScore === 10).length >= 5) await addBadge("미션 마스터");
  if (rich === 10) await addBadge("묘사왕 피카소");
  // ② 누적 일기 등급 뱃지
  if (count >= 5) await addBadge("브론즈 작가");
  if (count >= 20) await addBadge("실버 작가");
  if (count >= 50) await addBadge("골드 작가");
  if (count >= 100) await addBadge("다이아 작가");
  // 누적 미션 등급
  const missionCnt = entries.filter(e => e.missionScore >= 8).length;
  if (missionCnt >= 3) await addBadge("브론즈 미션러");
  if (missionCnt >= 10) await addBadge("실버 미션러");
  if (missionCnt >= 25) await addBadge("골드 미션러");
  if (missionCnt >= 50) await addBadge("다이아 미션러");
  // 스트릭 뱃지
  const streak = await getStreak();
  if (streak.count >= 3) await addBadge("3일 불꽃");
  if (streak.count >= 7) await addBadge("7일 불꽃");
  if (streak.count >= 14) await addBadge("14일 불꽃");
  if (streak.count >= 30) await addBadge("30일 불꽃");
  // 올라운더: 모든 앱 사용
  const stories = await getStoredStories();
  const books = await getAllBooks();
  if (count >= 5 && stories.length >= 3 && books.length >= 1) await addBadge("올라운더");
  // 이스터에그 헌터
  if (foundEasterWords.size >= 3) await addBadge("이스터에그 헌터");
  if ([...foundEasterWords].some(w => EASTER_WORDS[w]?.rare === 'rare' || EASTER_WORDS[w]?.rare === 'legendary')) await addBadge("희귀 발굴가");
  if ([...foundEasterWords].some(w => EASTER_WORDS[w]?.rare === 'legendary')) await addBadge("전설 발굴가");
}

async function getEntries(){ return (await lsGet(SK.entries(currentNick)))||[]; }
async function setEntries(a){ await lsSet(SK.entries(currentNick),a); }

async function saveDiary(){
  let text=$('diary').value.trim();if(!text){toast('일기를 먼저 써보세요!');return;}
  /* ✅ [신규] PII 마스킹 — 저장 전 개인정보(전화번호/주소/이메일) 자동 제거 */
  const { text: maskedText, piiFound } = maskPII(text);
  text = maskedText;
  if (piiFound) { $('diary').value = text; } // 에디터에도 마스킹 반영
  // ⑤ 비속어 필터
  if(!checkProfanity(text,'일기')) return;  const entries=await getEntries(),now=Date.now(),title=$('imgTitle').textContent;
  const upd={text,title,richness:curRich,missionScore:curMissionScore,mission:currentMission,teacherAdvice:curAdvice,goodExpression:curGoodExpression||'',nextChallenge:curNextChallenge||'',spellingAdvice:curSpellingAdvice||'',exprAdvice:curExprAdvice||'',contentAdvice:curContentAdvice||'',empathy:curEmpathy||'',voca:curVoca||'',dateLabel,updatedAt:now}; /* 파트 4: voca 저장 */
  if(curImgB64) upd.imgB64=curImgB64;
  let isNewEntry = false;
  if(curEntryId){
    const idx=entries.findIndex(e=>e.id===curEntryId);
    if(idx!==-1) entries[idx]={...entries[idx],...upd};
    else entries.unshift({id:curEntryId,createdAt:now,...upd});
  }else{
    const id=`e_${now}_${Math.random().toString(36).slice(2,6)}`;
    entries.unshift({id,createdAt:now,...upd}); curEntryId=id;
    isNewEntry = true;
  }
  await setEntries(entries);
  await checkLocalBadges(text, curRich, curMissionScore);
  if(isNewEntry) {
    // 부스터 쿠폰 체크
    const shopD = await getShopData();
    let boostMult = 1;
    if(shopD.boosts?.boost_triple > 0){
      boostMult = 3;
      shopD.boosts.boost_triple--;
      toast('💜 잉크 3배 쿠폰 적용!');
    } else if(shopD.boosts?.boost_double > 0){
      boostMult = 2;
      shopD.boosts.boost_double--;
      toast('💎 잉크 2배 쿠폰 적용!');
    }
    if(boostMult > 1){ await saveShopData(shopD); try{localStorage.setItem('mdj_shop',JSON.stringify(shopD));}catch{} }

    // ② 황금 분할: 초고 저장 시 전체 보상의 40%만 지급
    const baseInk = Math.floor(text.length/10) + (curRich*100);
    const inkEarned = Math.floor(baseInk * 0.4 * boostMult); // 40% × boost
    const btnEl=$('genBtn');
    const bx=btnEl?btnEl.getBoundingClientRect():null;
    await addInk(inkEarned, bx?bx.x+bx.width/2:window.innerWidth/2, bx?bx.y:200);
    // 나머지 60% 기대치 안내
    toast(`💾 저장! 초고 보상 +${inkEarned}💧 (퇴고하면 추가 ${Math.floor(baseInk*0.6*boostMult)}💧 보너스!)`);
    await recordTodayWrite();
    await addPetExp(Math.floor(inkEarned/3));
    petSay(`새 일기 저장! +${inkEarned}💧 획득! 퇴고로 더 많이 받아요!`);
  } else {
    petSay(`일기가 수정되었어요! ✏️`);
    toast('💾 일기 저장 완료!');
  }
  await checkEasterEgg(text);
  if(curRich>=8) toast(`🌟 묘사력 ${curRich}/10! 명예의 전당 후보입니다!`);
}

async function openListModal(){
  const entries=await getEntries(),el=$('listModalContent');
  el.innerHTML=!entries.length?'<div class="empty-list">저장된 일기가 없어요 📝</div>'
    :entries.map(e=>`<div class="sel-item" onclick="loadEntry('${e.id}')">
      ${e.imgB64?`<img src="${e.imgB64}" class="thumb-img">`:`<div class="thumb-img" style="display:flex;align-items:center;justify-content:center;font-size:18px;">📝</div>`}
      <div style="flex:1;min-width:0;"><div style="font-size:10px;color:#aaa;">${e.dateLabel||''}</div>
        <div style="font-size:12px;margin-top:2px;">${(e.text||'').substring(0,28)}...</div>
        ${e.richness?`<div style="font-size:10px;color:var(--mint);">${STAMPS[e.richness]?.text||''} (${e.richness}/10)</div>`:''}</div>
      <button class="d-del" onclick="event.stopPropagation();deleteEntry('${e.id}')">🗑️</button>
    </div>`).join('');
  $('listModal').classList.add('open');
}

async function loadEntry(id){
  const entries=await getEntries();
  const e=entries.find(x=>x.id===id);if(!e)return;
  curEntryId=e.id;$('diary').value=e.text||'';$('imgTitle').textContent=e.title||'[ 오늘의 그림 ]';
  curRich=e.richness||0;curImgB64=e.imgB64||null;curAdvice=e.teacherAdvice||'잘 썼어요!';
  curSpellingAdvice=e.spellingAdvice||'';
  curMissionScore=e.missionScore||0; currentMission=e.mission||null;
  missionDrawn=!!currentMission; // 불러온 일기에 미션이 있으면 표시
  $('richnessFill').style.width=`${curRich*10}%`;$('richnessScore').textContent=`묘사력 ${curRich}/10`;
  if(currentMission){ $('mTitle').textContent=`🎯 ${currentMission.title}`; $('mDesc').textContent=currentMission.desc; $('missionFill').style.width=`${curMissionScore*10}%`; $('missionScoreText').textContent=`${curMissionScore}/10`; }
  else { $('mTitle').textContent='🎯 오늘의 미션'; $('mDesc').textContent='버튼을 눌러 재미있는 글쓰기 미션을 뽑아보세요!'; $('missionFill').style.width='0%'; $('missionScoreText').textContent='— 대기중'; }
  updateStamp(curRich);updateQualityBadge(curRich);
  setTeacher('advice',curAdvice,e.goodExpression||'',e.nextChallenge||'',e.exprAdvice||'',e.contentAdvice||'',e.empathy||'',e.spellingAdvice||'',e.voca||'');
  if(e.imgB64){$('imgMain').src=e.imgB64;$('imgMain').style.display='block';$('placeholder').style.display='none';}
  else{$('imgMain').style.display='none';$('imgMain').src='';$('placeholder').style.display='flex';}
  closeModal('listModal');toast('📖 불러왔어요!');
}

async function deleteEntry(id){
  if(!confirm('삭제할까요?'))return;
  const a=(await getEntries()).filter(e=>e.id!==id);
  await setEntries(a);
  if(curEntryId===id) newDiary();
  await openListModal();toast('삭제됐어요.');
}

function newDiary(){
  $('diary').value='';$('imgTitle').textContent='[ 오늘의 그림 ]';
  $('richnessFill').style.width='0%';$('richnessScore').textContent='— 대기중';
  $('missionFill').style.width='0%'; $('missionScoreText').textContent='— 대기중';
  $('mTitle').textContent='🎯 오늘의 미션'; $('mDesc').textContent='버튼을 눌러 재미있는 글쓰기 미션을 뽑아보세요!';
  $('imgMain').style.display='none';$('imgMain').src='';$('placeholder').style.display='flex';
  $('richnessBadge').style.display='none';
  const s=$('diaryStamp');s.classList.remove('show','s1','s2','s3','s4','s5');
  hideDiaryError();$('dLoading').style.display='none';clearInterval(progTimer);
  setTeacher('idle');curEntryId=null;curImgB64=null;curRich=0;curAdvice='잘 썼어요!';curGoodExpression='';curNextChallenge='';curSpellingAdvice='';
  curMissionScore=0; currentMission=null; curEmpathy=''; curVoca=''; missionDrawn=false; /* 파트 4 */
  updateQualityBadge(0);
}

/* 참고: 그림체(크레파스→수채화) 적용은 generateDalle()(01-core-init.js)가
   richness 값을 받아 직접 담당한다. 여기 analyzeDiary()는 "내용(누가/무엇을/
   어디서)"만 뽑아내고 그림체 단어는 넣지 않도록 안내해, 두 군데서 스타일
   지시가 중복/충돌하지 않게 한다. */

async function analyzeDiary(text){
  // ✅ 동일 텍스트면 캐시된 결과 반환 (타이핑 중 분석 → 그림 버튼 클릭 시 중복 호출 방지)
  if (_lastAnalyzedText === text && _lastAnalysis) return _lastAnalysis;
  const missionPrompt = currentMission ? `Evaluate mission achievement based on this rule: "${currentMission.aiRule}". Score 0-10.` : `Set missionScore to 0.`;

  /* 파트 4 수정: 영어 모드일 때 영문 바이링궐 프롬프트 분기 */
  const isEn = _currentLang === 'en';

  const raw=await callClaude({
    model:'claude-haiku-4-5-20251001', max_tokens:1400,
    system: isEn
      ? `You are a warm and encouraging English Writing Coach for Korean elementary school students (ages 10-13).
Read the student's diary entry carefully and provide specific, helpful bilingual (English + Korean) feedback.

🚨 TOP PRIORITY — Detect meaningless input FIRST:
If ANY of these apply, return ONLY this JSON immediately:
- Same letter/character repeated 3+ times (e.g. "aaa", "kkk")
- Only symbols, numbers, or random keyboard input with no meaningful words
- Keyboard smash (e.g. "asdfgh", "qwerty")
{"richness":0,"missionScore":0,"empathy":"","goodExpression":"","nextChallenge":"","spellingAdvice":"","exprAdvice":"","contentAdvice":"","advice":"Try writing a real sentence about your day! 😊","title":"My Diary","imagePrompt":"","badges":[],"voca":""}

RICHNESS SCORE 1-10 — judge EACH of these 5 criteria as true/false and reflect the result
exactly in richnessBreakdown. The richness total must equal the sum of the criteria points
that are true (e.g. senses+emotion+specific true → 3+2+2=7):
- Sensory details (sight/sound/smell/taste/touch): +3 → senses
- Emotion words (excited, nervous, proud): +2 → emotion
- Similes/metaphors (like, as ... as): +2 → metaphor
- Specific details (not "food" but "sweet and chewy tteokbokki"): +2 → specific
- Unique perspective or creative expression: +1 → unique

⚠️ ALL fields REQUIRED — never leave empty!
- empathy: 1 sentence that mentions a SPECIFIC detail from the diary. No vague "That sounds fun!" — reference actual content.
- goodExpression: Quote a good phrase from the diary, explain WHY it's good (in simple English + 한국어).
- nextChallenge: An OPEN QUESTION (not a command). Help the student recall more details. e.g. "What sounds did you hear at that moment?" / "If you could describe your feeling as a color, what would it be?"
- spellingAdvice: Find 1-2 spelling/grammar errors and explain kindly (English + Korean). If none: "Your spelling is great! 👍 (맞춤법이 완벽해요!)"
- exprAdvice: 2 sentences with specific examples from their diary on how to improve expression. Bilingual.
- contentAdvice: 2 OPEN QUESTIONS (not commands) to help them recall more of the moment. Bilingual.
- advice: 1 warm, specific overall comment that directly references the diary content.
- voca: Pick 2-3 interesting/useful English words FROM your feedback. Format: "word (한국어뜻), word (한국어뜻)". e.g. "sensory (감각의), specific (구체적인), emotion (감정)"

ONLY return valid JSON (no markdown):
{
  "richness":<1-10>,
  "richnessBreakdown":{"senses":<true|false>,"emotion":<true|false>,"metaphor":<true|false>,"specific":<true|false>,"unique":<true|false>},
  "missionScore":<0-10>,
  "empathy":"<specific mention of diary content>",
  "goodExpression":"<quoted phrase + bilingual explanation>",
  "nextChallenge":"<1 open question, bilingual>",
  "spellingAdvice":"<1-2 corrections bilingual, or praise>",
  "exprAdvice":"<2 sentences with examples, bilingual>",
  "contentAdvice":"<2 open questions, bilingual>",
  "advice":"<1 warm specific sentence, bilingual>",
  "title":"<English diary title, max 5 words>",
  "imagePrompt":"<English ONLY image prompt. MANDATORY RULES:\n1. Read the FULL diary. Find the most vivid/emotional moment.\n2. Include: WHO + WHAT ACTION + WHERE + KEY DETAIL.\n3. Never use vague descriptions or only illustrate the first sentence.\n4. If the diary mentions a real, identifiable public figure (politician, head of state, celebrity, historical leader, etc.), do NOT use their real name or specific identity — describe them generically by role/appearance instead (e.g. 'a tall bronze statue of a historical leader' instead of naming a specific president; 'a famous singer performing' instead of a specific celebrity's name). This keeps the scene's content but avoids real-person depiction issues.\n5. FORMAT: [who] [action] [where], [sensory/emotional detail]. Describe ONLY the scene content — do NOT add any art style words (no 'watercolor', 'cartoon', 'crayon', etc.) since style is added separately afterward.>",
  "badges":[],"voca":"<2-3 words from your feedback: word (뜻), word (뜻)>"
}
${missionPrompt}`
      : `너는 초등학교 글쓰기를 가르치는 다정하고 열정적인 베테랑 선생님이야. 학생이 쓴 일기를 꼼꼼히 읽고, 아이가 실제로 글을 더 잘 쓸 수 있게 구체적이고 도움이 되는 조언을 반드시 제공해야 해.

⚠️ 중요: 일기가 길더라도 반드시 전체를 끝까지 읽은 후 분석해. 첫 문장이나 앞부분만 보고 imagePrompt를 만들지 마. 일기 전체에서 가장 핵심적이고 생생한 장면을 찾아 imagePrompt에 반영해야 해.

🚨 최우선 규칙 — 무의미한 글 감지 (다른 분석보다 먼저 확인):
아래 중 하나라도 해당하면, 즉시 아래 JSON만 반환하고 절대 다른 분석을 하지 마:
- 같은 글자·자음·모음이 3회 이상 연속 반복 (예: "아아아", "ㄱㄱㄱ", "ㅋㅋㅋ", "ㅏㅏㅏ", "ㅎㅎㅎ")
- 의미 있는 단어나 문장 없이 글자·기호·숫자만 나열된 경우
- 실제 일기 내용 없이 무작위 키보드 입력처럼 보이는 경우 (예: "qwerty", "ㅂㅈㄷㄱ")
- 단어가 있더라도 전체 글자 수의 50% 이상이 같은 문자 반복인 경우
감지 시 반환할 JSON (이것만 반환, 다른 내용 절대 추가 금지):
{"richness":0,"missionScore":0,"empathy":"","goodExpression":"","nextChallenge":"","spellingAdvice":"","exprAdvice":"","contentAdvice":"","advice":"의미 있는 문장으로 이야기를 들려줄래?","title":"오늘의 일기","imagePrompt":"","badges":[],"voca":""}

묘사력 점수 1-10 기준 — 아래 5개 기준 각각을 충족했는지(true/false) 반드시 판단하고,
그 결과를 richnessBreakdown에 정확히 반영해. richness 총점은 충족한 기준들의 점수 합과
일치해야 해 (예: 오감+감정+구체적 묘사 충족 → 3+2+2=7점):
- 오감 표현(보이는 것/소리/냄새/맛/느낌): +3점 → senses
- 감정 표현(기뻤다, 무서웠다, 두근두근): +2점 → emotion
- 비유 표현(~처럼, ~같이, 마치 ~인 것 같았다): +2점 → metaphor
- 구체적 묘사("음식이 맛있었다" 대신 "달콤하고 쫄깃한 떡볶이"): +2점 → specific
- 독특한 관점이나 재미있는 표현: +1점 → unique

⚠️ 절대 규칙 — 반드시 지켜야 해. 비어있는 값 금지! 모든 필드는 반드시 구체적으로 채워야 해!
- empathy: 반드시 일기의 구체적 내용을 언급하며 공감하는 1문장. 예: "평양이랑 금강산 구경을 상상하는 게 정말 엉뚱하고 재미있다!" 막연한 "참 재미있겠다" 금지.
- goodExpression: 일기에서 잘 쓴 표현을 찾아 따옴표로 인용하고, 초등학생이 이해할 수 있게 칭찬해. 아무리 짧은 글이어도 반드시 잘된 점 1개를 찾아내. 예: '"하늘이 분홍빛으로 물들었다"는 색깔로 하늘을 표현해서 그림이 그려지는 것 같아. 정말 멋진 표현이야!'
- nextChallenge: ⭐ 반드시 발문(질문) 형태로 써야 해. "~해봐!", "~를 추가해!" 같은 지시형 절대 금지. 학생이 스스로 기억을 떠올리게 만드는 열린 질문 1개로 작성. 예: "그때 어떤 소리가 들렸어? 그 소리를 일기에 담아볼 수 있을까?", "그 순간 네 기분을 색깔로 표현한다면 무슨 색일 것 같아?", "그 장면에서 어떤 냄새가 났는지 기억나?", "그때 가장 눈에 띈 것은 무엇이었어?"
- spellingAdvice: 일기에서 틀린 맞춤법이나 문법 오류를 1~2개 찾아 친절하게 고쳐줘. 없으면 "맞춤법이 정확해요! 👍"라고 써줘. 예: '"됬다"는 "됐다"로 써야 해. "안되" 는 "안 돼"로 띄어 써야 해.'
- exprAdvice: 표현·구조 조언 2문장. 일기의 실제 내용을 예시로 들어 구체적으로. 예: '"놀러 갔다"보다 "엄마 손을 잡고 한라산 입구에 도착했다"처럼 누구랑 어디로 갔는지 쓰면 훨씬 생생해. 문장 맨 앞에 "그리고"를 너무 많이 쓰면 지루하니까, "그래서" 또는 "그런데"로 바꿔봐!'
- contentAdvice: ⭐ 반드시 발문(질문) 형태로 써야 해. "~를 추가해!", "~에 대해 써봐!" 같은 지시형 절대 금지. 학생이 그 순간을 스스로 떠올리게 만드는 열린 질문 2개로 작성. 예: "그때 같이 있던 사람은 누구였어? 그 사람의 표정은 어땠는지 기억나?", "밥을 먹었다고 했는데, 그 맛이 어땠는지 눈을 감고 떠올려볼 수 있어?", "그 일이 있고 난 뒤에 네 마음은 어떻게 달라졌어?"
- advice: 따뜻하고 구체적인 전체 총평 1문장 (일기 내용을 직접 언급).
- voca: 피드백에서 사용한 표현 중 영어 단어 2~3개를 뽑아 형식: "word (뜻), word (뜻)". 예: "sensory (감각의), specific (구체적인), vivid (생생한)"

ONLY return valid JSON (no markdown, no explanation):
{
  "richness":<1-10>,
  "richnessBreakdown":{"senses":<true|false>,"emotion":<true|false>,"metaphor":<true|false>,"specific":<true|false>,"unique":<true|false>},
  "missionScore":<0-10>,
  "empathy":"<일기 내용 구체적 언급 필수>",
  "goodExpression":"<실제 표현 인용 필수>",
  "nextChallenge":"<발문 형태의 열린 질문 1개>",
  "spellingAdvice":"<맞춤법·문법 피드백 1~2개, 없으면 칭찬>",
  "exprAdvice":"<실제 예시 포함 2문장>",
  "contentAdvice":"<발문 형태의 열린 질문 2개>",
  "advice":"<따뜻하고 구체적인 총평 1문장>",
  "title":"<한국어 제목 최대 10자>",
  "imagePrompt":"<English ONLY image prompt. MANDATORY RULES — STRICTLY FOLLOW:\n\n🔍 STEP 1 — SCAN THE ENTIRE DIARY (not just the beginning):\n  Read the FULL diary text carefully from start to finish. Find the single MOST VIVID or EMOTIONALLY SIGNIFICANT moment — the scene that best represents the whole diary.\n\n🎯 STEP 2 — EXTRACT THESE 4 ELEMENTS from that key scene:\n  (a) WHO: specific person (e.g. Korean girl, Korean boy, grandmother, friend named Minho)\n  (b) WHAT ACTION: the exact thing they are doing (e.g. eating tteokbokki, crying while reading, laughing with friends)\n  (c) WHERE: the specific place (e.g. school rooftop, grandmother's kitchen, Han River park)\n  (d) KEY DETAIL: one unique sensory or emotional detail from the diary (e.g. steam rising, tears on cheeks, autumn leaves falling)\n\n🚫 STEP 3 — AVOID GENERIC IMAGES:\n  ❌ NEVER use vague descriptions like 'Korean child at school' or 'student writing diary'\n  ❌ NEVER illustrate only the first sentence if the diary's main theme is elsewhere\n  ❌ NEVER invent scenes not mentioned in the diary\n  ✅ ALWAYS base the image on the most emotionally or narratively important moment in the full text\n\n⚠️ STEP 3-1 — REAL PUBLIC FIGURES (매우 중요):\n  일기에 실제 존재하는 공인(정치 지도자, 역사 인물, 유명인, 연예인 등)이 언급되면,\n  절대 실명/특정 신원으로 표현하지 말고 역할이나 외형으로만 일반화해서 묘사할 것\n  (예: '김일성 동상' → 'a tall bronze statue of a historical leader',\n  특정 연예인 이름 → 'a famous singer performing'). 장면의 내용은 살리되 실제 인물\n  특정은 피해야 이미지 생성 안전 정책에 걸리지 않는다.\n\n📌 STEP 4 — EXAMPLE TRANSFORMATIONS:\n  Diary about money/earning → show: 'Korean boy counting coins at a desk, excited expression, piggy bank nearby'\n  Diary about fight with friend → show: 'Two Korean girls turning away from each other in classroom, one looking sad'\n  Diary about delicious food → show: 'Korean child eating steaming ramen with wide happy eyes at dinner table'\n\n✏️ FORMAT: [who] [doing what] [where], [key emotional/sensory detail from diary]. Describe ONLY the scene content — do NOT add any art style words (no 'watercolor', 'cartoon', 'crayon', etc.) since the art style is added separately afterward by code, not by you.>",
  "badges":[],
  "voca":"<피드백에 사용한 영단어 2~3개: word (뜻), word (뜻)>"
}
뱃지 조건(한국어 이름): "오감술사"=오감 표현 5개 이상, "감정의 마술사"=풍부한 감정 표현, "상상력 대장"=비유/상상력, "긍정왕"=긍정적 톤, "세밀한 관찰자"=세밀한 관찰, "솔직담백"=솔직한 고백, "위대한 모험가"=새로운 경험, "가족 사랑"=가족 온기, "우정 지킴이"=우정, "꼬마 자연인"=자연/동물, "먹방 요정"=음식 생생 묘사, "유머러스"=재미있는 이야기, "꿈꾸는 별"=꿈/미래.
${missionPrompt}`,
    messages:[{role:'user',content: isEn ? `Diary:\n${text}` : `일기:\n${text}`}]
  });
  /* 파트 4 수정: voca 필드 fallback 포함 */
  const data = parseJSON(raw)||{richness:3,richnessBreakdown:{senses:false,emotion:false,metaphor:false,specific:false,unique:false},missionScore:0,empathy:'',goodExpression:'',nextChallenge:'',spellingAdvice:'',exprAdvice:'',contentAdvice:'',advice: isEn ? 'Great diary! Keep writing! 😊' : '일기를 잘 썼어요!',title: isEn ? 'My Diary' : '오늘의 일기',imagePrompt:'',badges:[],voca:''};
  if (!data.richnessBreakdown) data.richnessBreakdown = {senses:false,emotion:false,metaphor:false,specific:false,unique:false};
  if(!data.voca) data.voca = '';
  if(data.badges && data.badges.length > 0) { data.badges.forEach(b => addBadge(b)); }
  // ✅ 캐시 저장
  _lastAnalyzedText = text;
  _lastAnalysis = data;
  return data;
}

/* ══════════════════════════════════════════════════════════
   💡 "왜?" 버튼 — 묘사력 점수 산출 기준 투명화(XAI) 모달
   index.html에 모달 HTML/CSS(.xai-overlay 등)는 이미 준비돼 있었지만
   openXaiModal()/closeXaiModal() 자체가 어느 파일에도 정의돼 있지 않아
   버튼을 눌러도 아무 반응이 없던 것 — 여기서 새로 구현.
   analyzeDiary()가 이미 만들어 캐시해 둔 _lastAnalysis.richnessBreakdown을
   그대로 사용하므로 추가 API 호출 없이 즉시 표시된다.
══════════════════════════════════════════════════════════ */
const XAI_CRITERIA_KO = [
  { key:'senses',   label:'오감 표현 (보이는 것·소리·냄새·맛·느낌)',         points:3 },
  { key:'emotion',  label:'감정 표현 (기뻤다, 무서웠다, 두근두근 등)',        points:2 },
  { key:'metaphor', label:'비유 표현 (~처럼, ~같이, 마치 ~인 것 같았다)',     points:2 },
  { key:'specific', label:'구체적인 묘사 (막연한 표현 대신 자세하게)',       points:2 },
  { key:'unique',   label:'독특한 관점이나 재미있는 표현',                   points:1 },
];
const XAI_CRITERIA_EN = [
  { key:'senses',   label:'Sensory details (sight, sound, smell, taste, touch)', points:3 },
  { key:'emotion',  label:'Emotion words (excited, nervous, proud...)',          points:2 },
  { key:'metaphor', label:'Similes/metaphors (like..., as...as...)',             points:2 },
  { key:'specific', label:'Specific details instead of vague words',             points:2 },
  { key:'unique',   label:'Unique perspective or creative expression',          points:1 },
];

function openXaiModal() {
  console.log('[xai-modal] openXaiModal() 호출됨');
  const overlay = $('xaiOverlay');
  console.log('[xai-modal] overlay element:', overlay);
  if (!overlay) { console.warn('[xai-modal] #xaiOverlay 요소를 찾을 수 없음'); return; }
  const r = _lastAnalysis;
  const isEn = _currentLang === 'en';

  const scoreBig = $('xaiScoreBig');
  if (scoreBig) scoreBig.textContent = (r && typeof r.richness === 'number') ? r.richness : '—';

  const criteriaEl = $('xaiCriteria');
  if (criteriaEl) {
    if (!r) {
      criteriaEl.innerHTML = `<div style="font-size:12px;color:#999;text-align:center;padding:10px 0;">${isEn ? 'Write your diary first to see your score breakdown!' : '일기를 먼저 써야 점수 기준을 볼 수 있어요!'}</div>`;
    } else {
      const breakdown = r.richnessBreakdown || {};
      const criteriaList = isEn ? XAI_CRITERIA_EN : XAI_CRITERIA_KO;
      criteriaEl.innerHTML = criteriaList.map(c => {
        const earned = !!breakdown[c.key];
        const pointLabel = isEn ? `${earned ? '+' + c.points : '0'}pt` : `${earned ? '+' + c.points : '0'}점`;
        return `
          <div class="xai-row">
            <div class="xai-row-label">${earned ? '✅' : '⬜'} ${c.label}</div>
            <div class="xai-row-score ${earned ? 'earned' : 'not-earned'}">${pointLabel}</div>
          </div>`;
      }).join('');
    }
  }

  overlay.classList.add('open');
  // 2026 버그 수정: 에세이 탭의 자기평가 모달에서 겪었던 것과 동일한 증상
  // (display:flex를 줘도 화면에 안 보이는 현상) — 다른 스크립트/CSS가 조상 요소에
  // 영향을 줄 가능성에 대비해, body의 바로 자식으로 옮기고 !important로 강제 표시.
  // forceShowModal/forceHideModal은 08-ieum-essay.js에 정의되어 있고, 클릭 시점에는
  // 모든 스크립트가 이미 로드되어 있으므로 로딩 순서와 무관하게 안전하게 호출 가능.
  if (typeof forceShowModal === 'function') {
    forceShowModal(overlay);
  } else {
    if (overlay.parentElement !== document.body) document.body.appendChild(overlay);
    overlay.style.setProperty('display', 'flex', 'important');
  }
  console.log('[xai-modal] 모달 표시 완료. 최종 display 값:', getComputedStyle(overlay).display, '/ 부모 요소:', overlay.parentElement);
}

function closeXaiModal() {
  const overlay = $('xaiOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  if (typeof forceHideModal === 'function') {
    forceHideModal(overlay);
  } else {
    overlay.style.setProperty('display', 'none', 'important');
  }
}

let hintTimer;
function onDiaryInput(){
  clearTimeout(hintTimer);const txt=$('diary').value.trim();
  // 텍스트가 바뀌면 캐시 무효화
  if(txt !== _lastAnalyzedText){ _lastAnalysis=null; }
  // ✅ 비용 절약: 최소 40자 미만은 분석 생략 (기존 10자)
  if(txt.length<40){setTeacher('idle');return;}setTeacher('thinking');
  // ✅ 비용 절약: debounce 6000ms (기존 2800ms) — 타이핑 중 불필요한 API 호출 감소
  hintTimer=setTimeout(async()=>{
    try{
      const r=await analyzeDiary(txt);curRich=r.richness;curAdvice=r.advice;curMissionScore=r.missionScore;
      curEmpathy=r.empathy||'';curGoodExpression=r.goodExpression||'';curNextChallenge=r.nextChallenge||'';
      curExprAdvice=r.exprAdvice||'';curContentAdvice=r.contentAdvice||'';curSpellingAdvice=r.spellingAdvice||'';curVoca=r.voca||''; /* 파트 4 */
      $('richnessFill').style.width=`${r.richness*10}%`;$('richnessScore').textContent=`묘사력 ${r.richness}/10`;
      // 미션 점수는 미션 뽑기 눌렀을 때만 표시
      if(missionDrawn && currentMission){
        $('missionFill').style.width=`${r.missionScore*10}%`; $('missionScoreText').textContent=`${r.missionScore}/10`;
      } else {
        $('missionFill').style.width='0%'; $('missionScoreText').textContent='— 대기중';
      }
      updateStamp(r.richness);updateQualityBadge(r.richness);
      setTeacher('advice',r.advice,r.goodExpression,r.nextChallenge,r.exprAdvice,r.contentAdvice,r.empathy,r.spellingAdvice,r.voca||'');
    }catch{setTeacher('idle');}
  },6000);
}

function setTeacher(st, msg, goodExpr, nextChallenge, exprAdvice, contentAdvice, empathy, spellingAdvice, voca){
  const face=$('teacherFace'), el=$('teacherMsg'), lbl=$('teacherLabel');
  if(!face || !el) return;
  face.classList.remove('thinking');

  /* 파트 4 수정: 언어 분기 */
  const isEn = _currentLang === 'en';

  // 모든 코치 패널 초기화
  const coachIds=['teacherCoachEmpathy','teacherCoachGood','teacherCoachNext','teacherCoachExpr','teacherCoachContent','teacherCoachSpelling'];
  coachIds.forEach(id=>{ const e=$(id); if(e){ e.style.display='none'; e.innerHTML=''; } });
  const wrap=$('teacherCoachWrap'); if(wrap) wrap.style.display='none';

  /* 파트 4: voca 패널 초기화 */
  let vocaEl = $('teacherCoachVoca');
  if(vocaEl){ vocaEl.style.display='none'; vocaEl.innerHTML=''; }

  if(st==='idle'){
    face.textContent='👩‍🏫';
    if(lbl) lbl.textContent = isEn ? 'Teacher' : '선생님';
    el.textContent = isEn ? 'Write your diary and I\'ll give you advice! 😊' : '일기를 쓰면 조언해드릴게요! 😊';
    return;
  }
  if(st==='thinking'){
    face.textContent='🤔'; face.classList.add('thinking');
    if(lbl) lbl.textContent = isEn ? 'Teacher' : '선생님';
    el.textContent = isEn ? 'Reading carefully... 📖' : '꼼꼼히 읽는 중... 📖';
    return;
  }

  // advice 모드
  face.textContent='✨';
  if(lbl) lbl.textContent = isEn ? '📝 Teacher\'s Comment' : '선생님 한마디';
  el.textContent=msg || (isEn ? 'Great diary! 😊' : '일기를 잘 썼어요! 😊');

  let hasCoach = false;

  if(empathy && empathy.trim()){
    const m=$('teacherCoachEmpathy');
    if(m){ m.innerHTML=`💬 <b>${isEn ? 'Empathy:' : '공감:'}</b> ${empathy}`; m.style.display='block'; hasCoach=true; }
  }
  if(goodExpr && goodExpr.trim()){
    const g=$('teacherCoachGood');
    if(g){ g.innerHTML=`⭐ <b>${isEn ? 'Great expression:' : '잘된 표현:'}</b> ${goodExpr}`; g.style.display='block'; hasCoach=true; }
  }
  // ④ 맞춤법 피드백은 초고 작성 중에는 숨김 (쓰기 흐름 보호)
  // spellingAdvice는 퇴고 모달에서만 표시됨
  if(nextChallenge && nextChallenge.trim()){
    const n=$('teacherCoachNext');
    if(n){ n.innerHTML=`✏️ <b>${isEn ? 'Today\'s challenge:' : '오늘의 도전:'}</b> ${nextChallenge}`; n.style.display='block'; hasCoach=true; }
  }
  if(exprAdvice && exprAdvice.trim()){
    const e=$('teacherCoachExpr');
    if(e){ e.innerHTML=`🔧 <b>${isEn ? 'Expression tip:' : '표현·구조:'}</b> ${exprAdvice}`; e.style.display='block'; hasCoach=true; }
  }
  if(contentAdvice && contentAdvice.trim()){
    const c=$('teacherCoachContent');
    if(c){ c.innerHTML=`💡 <b>${isEn ? 'Content idea:' : '내용 보강:'}</b> ${contentAdvice}`; c.style.display='block'; hasCoach=true; }
  }

  // 코치 패널이 하나라도 있으면 wrap 보이기
  if(hasCoach && wrap){
    wrap.style.display='block';
  }

  /* 파트 4: voca 미니 단어장 렌더링 */
  if(voca && voca.trim()){
    if(!vocaEl){
      vocaEl = document.createElement('div');
      vocaEl.id = 'teacherCoachVoca';
      if(wrap) wrap.appendChild(vocaEl);
    }
    vocaEl.style.cssText = 'display:block; margin-top:6px; background:#f0f7ff; border-left:3px solid #4a90e2; padding:6px 10px; border-radius:8px; font-size:11px; color:#2a5a8a; word-break:keep-all;';
    vocaEl.innerHTML = `💡 <b>${isEn ? 'Today\'s Words:' : '오늘의 단어:'}</b> ${voca}`;
    if(wrap && wrap.style.display==='none') wrap.style.display='block';
  }
}

// ═══════════════════════════════════════════════
//  🖼️ 이음 일기 전용 출력 (diaryPrintModal)
// ═══════════════════════════════════════════════
let _diaryPrintSelected = new Set();

async function openDiaryPrintModal() {
  _diaryPrintSelected.clear();
  const entries = await getEntries();
  const list = $('diaryPrintList');

  if (!entries.length) {
    list.innerHTML = '<div style="text-align:center;color:#aaa;padding:24px;">저장된 일기가 없어요! 먼저 일기를 저장해주세요 📝</div>';
  } else {
    list.innerHTML = entries.map((e, i) => {
      const thumb = e.imgB64
        ? `<img src="${e.imgB64}" style="width:54px;height:54px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid #eee;">`
        : `<div style="width:54px;height:54px;border-radius:8px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">📝</div>`;
      const preview = (e.text || '').slice(0, 40) + ((e.text||'').length > 40 ? '...' : '');
      const dateStr = e.dateLabel || '';
      return `
        <div id="dpitem_${i}" onclick="toggleDiaryPrint(${i})"
          style="display:flex;align-items:center;gap:12px;padding:10px 12px;border:2px solid #eee;border-radius:12px;cursor:pointer;transition:all .15s;background:white;">
          <div id="dpchk_${i}" style="width:22px;height:22px;border:2px solid #ddd;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;flex-shrink:0;transition:all .15s;color:white;"></div>
          ${thumb}
          <div style="flex:1;min-width:0;">
            <div style="font-size:10px;color:#aaa;margin-bottom:2px;">${dateStr}</div>
            <div style="font-size:13px;color:#333;word-break:break-all;">${preview}</div>
          </div>
        </div>`;
    }).join('');

    // 현재 열람/작성 중인 일기가 있으면 자동 선택
    if (curEntryId) {
      const currentIdx = entries.findIndex(e => e.id === curEntryId);
      if (currentIdx !== -1) toggleDiaryPrint(currentIdx);
    }
  }

  _updateDiaryPrintCount();
  $('diaryPrintModal').classList.add('open');
}

function toggleDiaryPrint(i) {
  const item = $(`dpitem_${i}`);
  const chk  = $(`dpchk_${i}`);
  if (_diaryPrintSelected.has(i)) {
    _diaryPrintSelected.delete(i);
    item.style.borderColor = '#eee';
    item.style.background  = 'white';
    chk.style.background   = 'transparent';
    chk.style.borderColor  = '#ddd';
    chk.textContent        = '';
  } else {
    _diaryPrintSelected.add(i);
    item.style.borderColor = 'var(--mint)';
    item.style.background  = '#f0faf8';
    chk.style.background   = 'var(--mint)';
    chk.style.borderColor  = 'var(--mint)';
    chk.textContent        = '✓';
  }
  _updateDiaryPrintCount();
}

function _updateDiaryPrintCount() {
  $('diaryPrintCount').textContent = `선택: ${_diaryPrintSelected.size}개`;
  const btn = $('diaryPrintBtn');
  if (btn) {
    btn.style.opacity = _diaryPrintSelected.size ? '1' : '0.5';
    btn.style.cursor  = _diaryPrintSelected.size ? 'pointer' : 'default';
  }
}

async function diaryPrintSelectAll() {
  const entries = await getEntries();
  entries.forEach((_, i) => {
    if (!_diaryPrintSelected.has(i)) toggleDiaryPrint(i);
  });
}

function diaryPrintClearAll() {
  [..._diaryPrintSelected].forEach(i => toggleDiaryPrint(i));
}

async function doDiaryPrint() {
  if (!_diaryPrintSelected.size) { toast('저장할 일기를 선택해주세요!'); return; }
  const entries = await getEntries();
  const indices = [..._diaryPrintSelected].sort((a, b) => a - b);
  const selected = indices.map(i => entries[i]).filter(Boolean);

  closeModal('diaryPrintModal');
  showOverlay(`📸 일기 이미지 저장 중... (0 / ${selected.length})`);

  try {
    for (let i = 0; i < selected.length; i++) {
      $('overlayMsg').textContent = `📸 이미지 변환 중... (${i + 1} / ${selected.length})`;

      const htmlStr = buildDiaryHTML(selected[i]);
      const elWidth = 420;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = [
        'position:fixed', 'left:0', 'top:0',
        `width:${elWidth}px`, 'z-index:-9999',
        'visibility:hidden', 'pointer-events:none',
        'background:white', "font-family:'Jua',sans-serif"
      ].join(';');
      wrapper.innerHTML = htmlStr;
      document.body.appendChild(wrapper);

      await Promise.allSettled([
        document.fonts.load("900 20px 'NanumHyejun'"),
        document.fonts.load("700 20px 'NanumBarunpen'"),
        document.fonts.load("400 20px 'Jua'")
      ]);
      const imgs = wrapper.querySelectorAll('img');
      await Promise.all(Array.from(imgs).map(img => new Promise(res => {
        if (img.complete && img.naturalWidth > 0) return res();
        img.crossOrigin = 'anonymous';
        img.onload = res; img.onerror = res;
      })));
      await sleep(500);

      wrapper.style.visibility = 'visible';
      wrapper.style.zIndex = '-9998';

      const canvas = await html2canvas(wrapper, {
        scale: 2, useCORS: true, allowTaint: true,
        backgroundColor: '#ffffff', logging: false,
        width: elWidth, windowWidth: elWidth
      });
      document.body.removeChild(wrapper);

      const filename = `그림일기_${currentNick}_${Date.now()}_${i + 1}.jpg`;
      await new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error('이미지 변환 실패')); return; }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            try { document.body.removeChild(a); } catch {}
            URL.revokeObjectURL(url);
            resolve();
          }, 1000);
        }, 'image/jpeg', 0.93);
      });
      await sleep(400);
    }
    toast(`🎉 그림일기 ${selected.length}개 저장 완료!`);
  } catch (e) {
    toast('저장 실패: ' + e.message);
    console.error('[doDiaryPrint]', e);
  }
  hideOverlay();
}

/* ═══════════════════════════════════════════════
   🖼️ 그림책 JPG 저장 (그림책 탭 전용)
═══════════════════════════════════════════════ */
let _bookJpgSelected = new Set();
let _bookJpgItems = []; // {type:'cover'|'page', book, page, pageIdx, label, thumb}

async function openBookJpgModal() {
  _bookJpgSelected.clear();
  _bookJpgItems = [];

  const books = await getAllBooks();
  const list = $('bookJpgList');

  if (!books.length) {
    list.innerHTML = '<div style="text-align:center;color:#aaa;padding:24px;">저장된 그림책이 없어요! 먼저 그림책을 만들어주세요 📖</div>';
    _updateBookJpgCount();
    $('bookJpgModal').classList.add('open');
    return;
  }

  // 모든 책의 표지 + 페이지를 리스트로 펼침
  books.forEach((book, bIdx) => {
    // 표지
    _bookJpgItems.push({ type: 'cover', book, label: `📚 ${book.title || (currentNick + '의 그림책')} — 표지`, thumb: book.pages?.[0]?.b64 || null });
    // 각 페이지
    (book.pages || []).forEach((page, pIdx) => {
      _bookJpgItems.push({ type: 'page', book, page, pageIdx: pIdx + 1, label: `${pIdx + 1}페이지: ${(page.text || '').slice(0, 24)}${(page.text||'').length > 24 ? '…' : ''}`, thumb: page.b64 || null });
    });
  });

  list.innerHTML = _bookJpgItems.map((item, i) => {
    const thumb = item.thumb
      ? `<img src="${item.thumb}" style="width:54px;height:54px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid #eee;">`
      : `<div style="width:54px;height:54px;border-radius:8px;background:#ffe4e4;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">${item.type==='cover'?'📚':'📄'}</div>`;
    return `
      <div id="bjitem_${i}" onclick="toggleBookJpg(${i})"
        style="display:flex;align-items:center;gap:12px;padding:10px 12px;border:2px solid #eee;border-radius:12px;cursor:pointer;transition:all .15s;background:white;">
        <div id="bjchk_${i}" style="width:22px;height:22px;border:2px solid #ddd;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;flex-shrink:0;transition:all .15s;color:white;"></div>
        ${thumb}
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:#333;word-break:break-all;">${item.label}</div>
        </div>
      </div>`;
  }).join('');

  _updateBookJpgCount();
  $('bookJpgModal').classList.add('open');
}

function toggleBookJpg(i) {
  const item = $(`bjitem_${i}`);
  const chk  = $(`bjchk_${i}`);
  if (_bookJpgSelected.has(i)) {
    _bookJpgSelected.delete(i);
    item.style.borderColor = '#eee';
    item.style.background  = 'white';
    chk.style.background   = 'transparent';
    chk.style.borderColor  = '#ddd';
    chk.textContent        = '';
  } else {
    _bookJpgSelected.add(i);
    item.style.borderColor = 'var(--pink)';
    item.style.background  = '#fff5f5';
    chk.style.background   = 'var(--pink)';
    chk.style.borderColor  = 'var(--pink)';
    chk.textContent        = '✓';
  }
  _updateBookJpgCount();
}

function _updateBookJpgCount() {
  $('bookJpgCount').textContent = `선택: ${_bookJpgSelected.size}개`;
  const btn = $('bookJpgBtn2');
  if (btn) {
    btn.style.opacity = _bookJpgSelected.size ? '1' : '0.5';
    btn.style.cursor  = _bookJpgSelected.size ? 'pointer' : 'default';
  }
}

function bookJpgSelectAll() {
  _bookJpgItems.forEach((_, i) => {
    if (!_bookJpgSelected.has(i)) toggleBookJpg(i);
  });
}

function bookJpgClearAll() {
  [..._bookJpgSelected].forEach(i => toggleBookJpg(i));
}

async function doBookJpgPrint() {
  if (!_bookJpgSelected.size) { toast('저장할 항목을 선택해주세요!'); return; }
  const indices = [..._bookJpgSelected].sort((a, b) => a - b);
  const selected = indices.map(i => _bookJpgItems[i]).filter(Boolean);

  closeModal('bookJpgModal');
  showOverlay(`📸 그림책 이미지 저장 중... (0 / ${selected.length})`);

  try {
    for (let i = 0; i < selected.length; i++) {
      $('overlayMsg').textContent = `📸 이미지 변환 중... (${i + 1} / ${selected.length})`;

      let htmlStr = '';
      let elWidth = 794;
      if (selected[i].type === 'cover') {
        htmlStr = buildBookCoverHTML(selected[i].book);
      } else {
        htmlStr = buildBookPageHTML(selected[i].page, selected[i].pageIdx);
      }

      const wrapper = document.createElement('div');
      wrapper.style.cssText = [
        'position:fixed', 'left:0', 'top:0',
        `width:${elWidth}px`, 'z-index:-9999',
        'visibility:hidden', 'pointer-events:none',
        'background:white', "font-family:'Jua',sans-serif"
      ].join(';');
      wrapper.innerHTML = htmlStr;
      document.body.appendChild(wrapper);

      await Promise.allSettled([
        document.fonts.load("900 20px 'NanumHyejun'"),
        document.fonts.load("700 20px 'NanumBarunpen'"),
        document.fonts.load("400 20px 'Jua'")
      ]);
      const imgs = wrapper.querySelectorAll('img');
      await Promise.all(Array.from(imgs).map(img => new Promise(res => {
        if (img.complete && img.naturalWidth > 0) return res();
        img.crossOrigin = 'anonymous';
        img.onload = res; img.onerror = res;
      })));
      await sleep(500);

      wrapper.style.visibility = 'visible';
      wrapper.style.zIndex = '-9998';

      const canvas = await html2canvas(wrapper, {
        scale: 2, useCORS: true, allowTaint: true,
        backgroundColor: '#ffffff', logging: false,
        width: elWidth, windowWidth: elWidth
      });
      document.body.removeChild(wrapper);

      const typeLabel = selected[i].type === 'cover' ? '표지' : `${selected[i].pageIdx}페이지`;
      const filename = `그림책_${currentNick}_${typeLabel}_${Date.now()}.jpg`;
      await new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error('이미지 변환 실패')); return; }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            try { document.body.removeChild(a); } catch {}
            URL.revokeObjectURL(url);
            resolve();
          }, 1000);
        }, 'image/jpeg', 0.93);
      });
      await sleep(400);
    }
    toast(`🎉 그림책 이미지 ${selected.length}개 저장 완료!`);
  } catch (e) {
    toast('저장 실패: ' + e.message);
    console.error('[doBookJpgPrint]', e);
  }
  hideOverlay();
}

/* ═══════════════════════════════════════════════
   🌸 시화 JPG 저장 (지음 탭 시화 전용)
   - openDiaryPrintModal()과 완전 독립
   - jieumApp 내 poemPrintBtn에서만 호출됨
═══════════════════════════════════════════════ */
async function openPoemJpgSave() {
  const poems = await getSavedPoems();
  if (!poems.length) {
    toast('저장된 시화가 없어요! 먼저 시화를 저장해주세요 🌸');
    return;
  }
  // 현재 작업 중인 시화(currentPoemB64)가 있으면 바로 다운로드
  if (currentPoemB64) {
    const filename = `시화_${currentNick}_${Date.now()}.jpg`;
    const a = document.createElement('a');
    a.href = currentPoemB64;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { document.body.removeChild(a); } catch {} }, 1000);
    toast('🌸 시화 JPG 저장 완료!');
    return;
  }
  // 저장된 시화 목록 중 최근 것을 다운로드
  const latest = poems[0];
  if (latest && latest.imgB64) {
    const filename = `시화_${currentNick}_${Date.now()}.jpg`;
    const a = document.createElement('a');
    a.href = latest.imgB64;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { document.body.removeChild(a); } catch {} }, 1000);
    toast('🌸 시화 JPG 저장 완료!');
  } else {
    toast('저장된 시화 이미지가 없어요. 시화를 먼저 만들어주세요!');
  }
}

// ② 폭죽 애니메이션
function showFireworks() {
  const container = document.createElement('div');
  container.id = 'fireworksContainer';
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';
  document.body.appendChild(container);
  const colors = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff922b','#cc5de8','#f06595'];
  const emojis = ['🎆','🎇','✨','🌟','💫','⭐','🎉','🎊'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    const isEmoji = Math.random() > 0.5;
    p.style.cssText = `
      position:absolute;
      left:${Math.random()*100}%;
      top:${Math.random()*60 + 10}%;
      font-size:${Math.random()*20 + 12}px;
      animation:fireworkPop ${0.5 + Math.random()*1}s ease-out forwards;
      animation-delay:${Math.random()*0.8}s;
      opacity:0;
    `;
    if (isEmoji) {
      p.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    } else {
      p.style.width = p.style.height = `${Math.random()*10+6}px`;
      p.style.background = colors[Math.floor(Math.random()*colors.length)];
      p.style.borderRadius = '50%';
    }
    container.appendChild(p);
  }
  setTimeout(() => container.remove(), 2500);
}
let revOriginal = '';

function openRevisionModal() {
  const text = $('diary').value.trim();
  if (!text) {
    toast('일기를 먼저 써야 퇴고를 할 수 있어요!');
    return;
  }
  // ① 최소 30자 미만 차단
  if (text.length < 30) {
    toast('AI 선생님이 조언을 해주려면 이야기가 조금 더 필요해요 ✏️');
    return;
  }
  revOriginal = text;
  $('revOriginalText').textContent = text;
  $('revEditText').value = text;
  // ④ 퇴고 모달에서 맞춤법 피드백 표시
  const spellEl = $('revSpellingBox');
  if (spellEl) {
    if (curSpellingAdvice && curSpellingAdvice.trim()) {
      spellEl.textContent = '📝 맞춤법 체크: ' + curSpellingAdvice;
      spellEl.style.display = 'block';
    } else {
      spellEl.style.display = 'none';
    }
  }
  $('revAiSuggestion').innerHTML = '<div style="color:#aaa;font-size:12px;text-align:center;padding-top:20px;">[AI 조언 받기] 버튼을 누르면 조언이 나타나요 🤔</div>';
  // 힌트 박스 초기화
  const hintBox = $('revHintBox');
  if (hintBox) hintBox.style.display = 'none';
  
  switchRevTab('write');
  $('revisionModal').classList.add('open');
}

function switchRevTab(tab) {
  document.querySelectorAll('.rev-tab').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.rev-tab-content').forEach(el => el.classList.remove('active'));
  
  if (tab === 'write') {
    document.querySelector('.rev-tab[onclick="switchRevTab(\'write\')"]').classList.add('active');
    $('revTabWrite').classList.add('active');
  } else {
    document.querySelector('.rev-tab[onclick="switchRevTab(\'compare\')"]').classList.add('active');
    $('revTabCompare').classList.add('active');
  }
}

async function getAiRevisionTip(extraCondition = '') {
  const text = $('revEditText').value.trim();
  const btn = $('revAiTipBtn');
  btn.disabled = true;
  btn.textContent = '조언 생성 중... ⏳';
  $('revRefinementBox').style.display = 'none';
  
  const conditionLine = extraCondition ? `\n추가 조건: "${extraCondition}"` : '';

  try {
    const raw = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 350,
      system: `너는 초등학생의 일기를 생생하게 만들어주는 다정한 글쓰기 선생님이야.${conditionLine}
학생이 고칠 수 있는 표현을 아래 3가지 관점에서 각각 1가지씩 제안해줘.
1. 시각(보이는 것)을 강조한 표현
2. 청각(소리) 또는 촉각(느낌)을 강조한 표현  
3. 비유(~처럼, ~같은)를 쓴 표현

반드시 아래 JSON 형식으로만 답해:
{"options":[
  {"type":"👁️ 시각 표현","text":"<구체적인 표현 예시 1문장>"},
  {"type":"👂 청각·촉각 표현","text":"<구체적인 표현 예시 1문장>"},
  {"type":"💭 비유 표현","text":"<구체적인 표현 예시 1문장>"}
]}`,
      messages: [{ role: 'user', content: text }]
    });

    const d = parseJSON(raw);
    if (!d || !d.options) throw new Error('파싱 실패');

    const labelClasses = ['sight', 'sound', 'simile'];
    const html = d.options.map((opt, i) => `
      <div class="rev-option-card">
        <div class="rev-option-header">
          <span class="rev-option-label ${labelClasses[i]}">${opt.type}</span>
        </div>
        <div class="rev-option-text">${opt.text}</div>
        <div class="rev-option-btns">
          <button class="rev-opt-btn like" onclick="revOptionLike(${i}, this)">👍 마음에 들어요</button>
          <button class="rev-opt-btn dislike" onclick="revOptionDislike()">👎 다시 추천해줘</button>
          <button class="rev-opt-btn apply" onclick="revOptionApply(${i})">✏️ 참고해서 쓰기</button>
        </div>
      </div>`).join('');

    /* ✅ [신규] AI 전체 교정본 생성 후 Diff 뷰 연계 버튼 추가 */
    const diffBtnHtml = `
      <div style="margin-top:12px;padding-top:10px;border-top:2px dashed #eee;">
        <div style="font-size:12px;color:#aaa;margin-bottom:7px;">📊 원문과 AI 개선 제안을 나란히 비교하고 싶다면:</div>
        <button onclick="openFullDiffView()" style="width:100%;padding:10px;background:linear-gradient(135deg,var(--mint),var(--orange));color:white;border:none;border-radius:12px;font-family:inherit;font-size:14px;cursor:pointer;font-weight:bold;">
          🔍 원문 ↔ AI 제안 나란히 비교하기
        </button>
      </div>`;

    $('revAiSuggestion').innerHTML = `<div style="color:var(--mint);font-weight:bold;margin-bottom:8px;font-size:12px;">🤖 3가지 표현 중 하나를 골라봐요!</div>${html}${diffBtnHtml}`;
    window._revOptions = d.options;
  } catch (e) {
    $('revAiSuggestion').innerHTML = `<span style="color:red;">조언을 가져오는데 실패했어요. 다시 시도해주세요.</span>`;
  }
  
  btn.disabled = false;
  btn.textContent = '🤖 AI 조언 받기';
}

function revOptionLike(idx, btn) {
  // 선택 표시
  document.querySelectorAll('.rev-option-card').forEach((c, i) => {
    c.style.borderColor = i === idx ? 'var(--mint)' : '#e0e0e0';
    c.style.background = i === idx ? '#eaf6f4' : 'white';
  });
  toast('👍 좋은 선택이에요! 참고해서 직접 써보세요 ✏️');
  $('revRefinementBox').style.display = 'none';
}

function revOptionDislike() {
  $('revRefinementBox').style.display = 'block';
  $('revRefinementInput').focus();
  toast('💬 어떤 느낌을 원하는지 알려주세요!');
}

function revOptionApply(idx) {
  const opts = window._revOptions || [];
  if (!opts[idx]) return;
  // ① AI 베끼기 방지: 직접 복사 대신 힌트 박스에 표시
  const hintBox = $('revHintBox');
  const hintText = $('revHintText');
  if (hintBox && hintText) {
    hintText.textContent = opts[idx].text;
    hintBox.style.display = 'block';
    $('revEditText').focus();
    toast('💡 힌트를 보면서 직접 네 말로 타이핑해보세요! ✏️');
  } else {
    // fallback
    const current = $('revEditText').value;
    $('revEditText').value = current ? current + '\n\n[참고] ' + opts[idx].text : opts[idx].text;
    toast('✏️ 수정본에 참고 표현을 추가했어요! 직접 고쳐 써보세요.');
  }
}

async function requestRefinedAdvice() {
  const condition = $('revRefinementInput').value.trim();
  if (!condition) { toast('조건을 입력해주세요!'); return; }
  $('revRefinementBox').style.display = 'none';
  await getAiRevisionTip(condition);
}

/* ✅ [신규] 전체 AI 교정본을 생성하고 Diff 뷰로 표시 */
async function openFullDiffView() {
  const originalText = $('revEditText')?.value?.trim() || $('diary')?.value?.trim() || '';
  if (!originalText || originalText.length < 10) { toast('원문이 없어요!'); return; }

  toast('🤖 AI 교정본 생성 중...');
  try {
    const isEn = _currentLang === 'en';
    const raw = await callClaude({
      model: 'claude-haiku-4-5-20251001', max_tokens: 600,
      system: isEn
        ? `You are a writing coach. Improve the student's diary with richer sensory details and expressions. Return ONLY valid JSON: {"improved":"<full improved text>","feedback":"<1 warm encouraging sentence>"}`
        : `너는 초등학생 일기 글쓰기 코치야. 학생의 일기를 오감 표현과 비유를 추가해 더 풍부하게 개선해줘. 단, 내용(사건)은 절대 바꾸지 마. ONLY valid JSON 반환: {"improved":"<개선된 전체 텍스트>","feedback":"<따뜻한 응원 1문장>"}`,
      messages: [{ role:'user', content: isEn ? `Student diary:\n${originalText}` : `학생 일기:\n${originalText}` }]
    });
    const d = parseJSON(raw);
    if (!d || !d.improved) { toast('교정본 생성 실패. 다시 시도해보세요.'); return; }
    // Diff 뷰 표시
    await openFrictionDiffView(originalText, d.improved, d.feedback || '');
  } catch(e) {
    toast('교정본 생성 오류: ' + e.message);
  }
}

async function doCompare() {
  const text2 = $('revEditText').value.trim();
  if (!text2) {
    toast('수정본을 작성해주세요!');
    return;
  }
  
  switchRevTab('compare');
  $('cmpText1').textContent = revOriginal;
  $('cmpText2').textContent = text2;
  
  showOverlay('전후 비교 분석 중...');
  try {
    const raw = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `Analyze two Korean diary entries: "v1" (original) and "v2" (revised).
      Count the exact number of expressions related to senses and similes.
      Return ONLY valid JSON:
      {
        "v1": {"sight":<int>, "sound":<int>, "touch":<int>, "smell":<int>, "taste":<int>, "simile":<int>, "emotion":<int>},
        "v2": {"sight":<int>, "sound":<int>, "touch":<int>, "smell":<int>, "taste":<int>, "simile":<int>, "emotion":<int>},
        "aiFeedback": "<Korean 1-2 sentences praising the improvement in the revised text>"
      }`,
      messages: [{role: 'user', content: `[v1]\n${revOriginal}\n\n[v2]\n${text2}`}]
    });
    
    const d = parseJSON(raw) || {
      v1: {sight:0, sound:0, touch:0, smell:0, taste:0, simile:0, emotion:0},
      v2: {sight:0, sound:0, touch:0, smell:0, taste:0, simile:0, emotion:0},
      aiFeedback: "수정본에서 표현력이 더 좋아졌어요!"
    };
    
    const charDiff = text2.length - revOriginal.length;
    $('statChars').textContent = charDiff >= 0 ? `+${charDiff}` : charDiff;
    $('statChars').className = `rev-stat-num ${charDiff > 0 ? 'up' : charDiff < 0 ? 'down' : ''}`;
    
    const v1SenseTotal = d.v1.sight + d.v1.sound + d.v1.touch + d.v1.smell + d.v1.taste + d.v1.simile;
    const v2SenseTotal = d.v2.sight + d.v2.sound + d.v2.touch + d.v2.smell + d.v2.taste + d.v2.simile;
    const senseDiff = v2SenseTotal - v1SenseTotal;
    $('statSense').textContent = senseDiff >= 0 ? `+${senseDiff}` : senseDiff;
    $('statSense').className = `rev-stat-num ${senseDiff > 0 ? 'up' : senseDiff < 0 ? 'down' : ''}`;
    
    const emoDiff = d.v2.emotion - d.v1.emotion;
    $('statEmotion').textContent = emoDiff >= 0 ? `+${emoDiff}` : emoDiff;
    $('statEmotion').className = `rev-stat-num ${emoDiff > 0 ? 'up' : emoDiff < 0 ? 'down' : ''}`;
    
    const updateBar = (id, v1, v2) => {
      const max = Math.max(v1, v2, 5); 
      const diff = v2 - v1;
      $(`bar1_${id}`).style.width = `${(v1/max)*100}%`;
      $(`bar2_${id}`).style.width = `${(v2/max)*100}%`;
      $(`nums_${id}`).textContent = `${v1}→${v2}`;
      
      let diffStr = diff > 0 ? `+${diff}` : diff === 0 ? '-' : `${diff}`;
      let diffClass = diff > 0 ? 'up' : diff === 0 ? 'same' : 'down';
      $(`diff_${id}`).textContent = diffStr;
      $(`diff_${id}`).className = `sense-diff ${diffClass}`;
    };
    
    updateBar('sight', d.v1.sight, d.v2.sight);
    updateBar('sound', d.v1.sound, d.v2.sound);
    updateBar('touch', d.v1.touch, d.v2.touch);
    updateBar('smell', d.v1.smell, d.v2.smell);
    updateBar('taste', d.v1.taste, d.v2.taste);
    updateBar('simile', d.v1.simile, d.v2.simile);
    
    $('revAiCompareFeedbackText').textContent = d.aiFeedback;
    $('revAiCompareFeedback').style.display = 'block';
    
    // ② 퇴고 보너스: 감각어/감정어 증가 시 60% 보너스 잉크 + 폭죽
    if (senseDiff > 0 || emoDiff > 0) {
      const origText = revOriginal;
      const baseInk = Math.floor(origText.length/10) + (curRich*100);
      const bonusInk = Math.floor(baseInk * 0.6) + (senseDiff * 200) + (emoDiff * 150);
      await addInk(bonusInk);
      showFireworks();
      toast(`🎆 퇴고 보너스! 감각어+${senseDiff} 감정어+${emoDiff} → +${bonusInk}💧 획득!`);
      // ② 퇴고 뱃지 카운터 누적
      const revCnt = ((await lsGet('mdj_rev_count_'+currentNick)) || 0) + 1;
      await lsSet('mdj_rev_count_'+currentNick, revCnt);
      if (revCnt >= 3) await addBadge('브론즈 퇴고왕');
      if (revCnt >= 10) await addBadge('실버 퇴고왕');
      if (revCnt >= 25) await addBadge('골드 퇴고왕');
      if (revCnt >= 50) await addBadge('다이아 퇴고왕');
    }
    
  } catch(e) {
    toast('분석 중 오류가 발생했어요.');
  }
  hideOverlay();
}

// ① 유사도 계산 (간단한 trigram 기반)
function calcSimilarity(a, b) {
  if (!a || !b) return 0;
  function getTrigrams(s) {
    const t = new Set();
    for (let i = 0; i < s.length - 2; i++) t.add(s.slice(i, i+3));
    return t;
  }
  const ta = getTrigrams(a), tb = getTrigrams(b);
  let common = 0;
  ta.forEach(g => { if (tb.has(g)) common++; });
  return common / Math.max(ta.size, tb.size, 1);
}

function applyRevision() {
  const text2 = $('revEditText').value.trim();
  if (!text2) {
    toast('수정본을 작성해주세요!');
    return;
  }
  // ① AI 제안 텍스트들과 유사도 검사
  const opts = window._revOptions || [];
  for (const opt of opts) {
    if (!opt || !opt.text) continue;
    const sim = calcSimilarity(text2, opt.text);
    if (sim > 0.72) {
      toast('🌟 AI의 생각을 너만의 멋진 표현으로 조금만 바꿔서 써볼까? ✏️');
      return;
    }
  }
  $('diary').value = text2;
  onDiaryInput(); 
  toast('수정본이 일기장에 적용되었어요!');
  closeModal('revisionModal');
}
// =========================================================

