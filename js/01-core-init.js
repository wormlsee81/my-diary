/* ============================================================
 * 음성인식(STT) · 첫문장 도우미 · 펫 시스템 · 욕설 필터 · 백업/복원 · 연속작성(스트릭) · 이스터에그 · 상점/테마 · 타임어택 · AI 프록시 & 이미지 생성
 * (분할 자동 생성 — 원본 index.html에서 추출, 로드 순서 유지 필수)
 * ============================================================ */
/* ═══════════════════════════════════════════════
   음성 인식 (STT) & 첫 문장 도우미
═══════════════════════════════════════════════ */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
function startSTT(targetId) {
  if (!SpeechRecognition) {
    toast('현재 브라우저에서는 음성 인식을 지원하지 않아요. (크롬 권장)');
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = 'ko-KR';
  recognition.interimResults = false;
  
  recognition.onstart = () => { toast('🎤 듣고 있어요. 말씀해 주세요!'); };
  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    const el = document.getElementById(targetId);
    el.value += (el.value ? ' ' : '') + text;
    if(targetId === 'diary') onDiaryInput();
  };
  recognition.onerror = (e) => { toast('음성 인식 오류: ' + e.error); };
  recognition.start();
}

const STARTERS = [
  // 일상 및 학교
  "오늘 아침에 눈을 떴을 때 ",
  "학교 가는 길에 우연히 ",
  "오늘 급식에서 내가 제일 좋아하는 ",
  "쉬는 시간에 친구들과 ",
  "오늘 수업 시간 중에 제일 재미있었던 것은 ",
  "체육 시간에 땀을 뻘뻘 흘리며 ",
  "집에 돌아오는 길에 하늘을 보니 ",
  "숙제를 하려고 책상에 앉았는데 ",
  "오늘따라 엄마(아빠)의 뒷모습을 보니 ",
  "오늘 점심시간에는 ",
  "갑자기 등 뒤에서 ",
  "아침에 눈을 뜨자마자 ",
  "우리 가족이 함께 ",
  "가장 기억에 남는 장면은 ",
  // 감정 및 생각
  "오늘 나를 가장 크게 웃게 만든 일은 ",
  "오늘은 왠지 모르게 기분이 ",
  "요즘 내가 가장 즐겨 하는 생각은 ",
  "갑자기 화가 났던 순간이 있었는데, 바로 ",
  "오늘 제일 칭찬받고 싶었던 일은 ",
  "누군가에게 고마운 마음이 들었다. 누구냐면 ",
  "솔직히 말해서 오늘 조금 부끄러웠던 일은 ",
  "잠자리에 누웠는데 갑자기 이런 생각이 들었다. ",
  // 엉뚱한 상상
  "만약 내가 하늘을 날 수 있다면 가장 먼저 ",
  "갑자기 내 지우개가 말을 걸어왔다. ",
  "우리 집 강아지(고양이)가 사람 말을 한다면 ",
  "내가 만약 하루 동안 투명 인간이 된다면 ",
  "타임머신을 타고 과거로 갈 수 있다면 ",
  // 날씨 및 관찰
  "오늘의 날씨를 내 기분으로 표현하자면 ",
  "창밖으로 비(눈)가 내리는 모습을 보며 ",
  "길을 걷다가 길고양이를 마주쳤는데 "
];

// ✅ [추가] 영어 첫 문장 배열 — STARTERS의 한국어 문장에 1:1 대응
const STARTERS_EN = [
  // Daily Life & School
  "When I opened my eyes this morning, ",
  "On my way to school, I happened to ",
  "My absolute favorite lunch menu today was ",
  "During break time, my friends and I ",
  "The most fun part of class today was ",
  "During P.E., I was sweating so much while ",
  "On my way home, I looked up at the sky and ",
  "I sat down at my desk to do homework, but ",
  "For some reason, seeing Mom's (Dad's) back today made me feel ",
  "At lunchtime today, ",
  "All of a sudden, from behind me, ",
  "The moment I opened my eyes this morning, ",
  "My whole family got together and ",
  "The scene I remember most is ",
  // Feelings & Thoughts
  "The thing that made me laugh the hardest today was ",
  "For some reason, I just felt ",
  "Lately, my favorite thing to think about is ",
  "There was a moment I suddenly got upset — it was when ",
  "The thing I most wanted to be praised for today was ",
  "I felt grateful toward someone today. That person was ",
  "Honestly, the most embarrassing thing that happened today was ",
  "As I lay in bed, a thought suddenly came to me: ",
  // Wild Imagination
  "If I could fly through the sky, the first thing I'd do is ",
  "All of a sudden, my eraser started talking to me. ",
  "If my dog (cat) could speak like a human, ",
  "If I could be invisible for a whole day, ",
  "If I could ride a time machine back to the past, ",
  // Weather & Observation
  "If I had to describe today's weather as a feeling, I'd say ",
  "Watching the rain (snow) fall outside the window, ",
  "While walking down the street, I ran into a stray cat, and "
];

function useStarter(targetId) {
  const el = document.getElementById(targetId);
  // ✅ [수정] 현재 언어 설정에 따라 한국어/영어 배열 선택
  const startersToUse = (_currentLang === 'en') ? STARTERS_EN : STARTERS;
  const randomStarter = startersToUse[Math.floor(Math.random() * startersToUse.length)];
  let currentText = el.value;
  let replaced = false;
  // ✅ [수정] 선택된 배열(startersToUse) 기준으로 기존 첫 문장 교체 여부 확인
  for (let i = 0; i < startersToUse.length; i++) {
    if (currentText.startsWith(startersToUse[i])) {
      currentText = randomStarter + currentText.substring(startersToUse[i].length);
      replaced = true; break;
    }
  }
  if (!replaced) currentText = randomStarter + currentText;
  el.value = currentText;
  if(targetId === 'diary') onDiaryInput();
  // ✅ [수정] 토스트 메시지도 언어에 따라 분기
  toast(_currentLang === 'en' ? '🎲 A new first sentence has been generated!' : '🎲 새로운 첫 문장이 나왔어요!');
}

/* ═══════════════════════════════════════════════
   💧 잉크방울 재화 시스템
═══════════════════════════════════════════════ */
async function getInk(){ return parseInt((await lsGet('mdj_ink'))||'0'); }
async function setInk(n){ await lsSet('mdj_ink', Math.max(0,n)); await refreshInkUI(); }
async function addInk(n, x, y){
  await setInk(await getInk()+n);
  if(x && y){
    const el=document.createElement('div');
    el.className='ink-float'; el.textContent=`+${n}💧`;
    el.style.left=`${x}px`; el.style.top=`${y}px`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 1500);
  }
}
async function spendInk(n){ const c=await getInk(); if(c<n) return false; await setInk(c-n); return true; }
async function refreshInkUI(){
  const v=await getInk();
  document.querySelectorAll('#homeInkCount,#ieumInkCount,#shopInkDisplay').forEach(el=>{ if(el) el.textContent=v; });
  const hd=$('homeInkDisplay'); if(hd) hd.style.display='flex';
}

/* ═══════════════════════════════════════════════
   🐾 펫 시스템
═══════════════════════════════════════════════ */
const PET_STAGES=[
  {icon:'🥚',name:'알',msg:['글을 쓰면 깨어날게요!','빨리 일기 써줘요 💬']},
  {icon:'🐣',name:'아기새',msg:['짹짹! 잘 쓰고 있어요!','감각어가 늘고 있어요 👀','조금만 더 자세히 써봐요!']},
  {icon:'🌱',name:'새싹 요정',msg:['오, 오감을 쓰니 좋아요!','비유 표현 훌륭해요! 💐','미션도 해봐요~']},
  {icon:'🧚',name:'꼬마 요정',msg:['와! 묘사력이 쑥쑥 자라요!','오늘도 멋진 글이에요 ✨','네 글이 점점 특별해져요!']},
  {icon:'🧙',name:'글쓰기 마법사',msg:['진정한 글쓰기 마법사!','모든 감각을 다 쓰는군요!','이제 책을 써도 되겠어요! 📚']}
];
const PET_EXP_PER_LV=[0,50,150,350,700];
async function getPetData(){ return (await lsGet('mdj_pet'))||{exp:0,stage:0}; }
async function savePetData(d){ await lsSet('mdj_pet',d); }
async function addPetExp(n){
  const d=await getPetData();
  d.exp+=n;
  let newStage=0;
  for(let i=PET_EXP_PER_LV.length-1;i>=0;i--){ if(d.exp>=PET_EXP_PER_LV[i]){newStage=i;break;} }
  if(newStage>d.stage){ d.stage=newStage; toast(`🎉 펫이 진화했어요! ${PET_STAGES[newStage].icon} ${PET_STAGES[newStage].name}`); }
  await savePetData(d);
  await renderPet();
}
async function renderPet(){
  const w=$('petWidget'); if(!w) return;
  w.style.display='flex';
  const d=await getPetData();
  const st=PET_STAGES[Math.min(d.stage,PET_STAGES.length-1)];
  $('petBody').textContent=st.icon;
  $('petLevel').textContent=`Lv.${d.stage+1} ${st.name}`;
  const curLvExp=PET_EXP_PER_LV[d.stage]||0;
  const nxtLvExp=PET_EXP_PER_LV[d.stage+1]||PET_EXP_PER_LV[PET_EXP_PER_LV.length-1]+200;
  const pct=Math.min(100,((d.exp-curLvExp)/(nxtLvExp-curLvExp))*100);
  $('petExpFill').style.width=`${pct}%`;
}
async function petTap(){
  const d=await getPetData();
  const st=PET_STAGES[Math.min(d.stage,PET_STAGES.length-1)];
  const msg=st.msg[Math.floor(Math.random()*st.msg.length)];
  const b=$('petBubble'); b.textContent=msg; b.classList.add('show');
  setTimeout(()=>b.classList.remove('show'),2800);
}
let petMsgTimer;
function petSay(msg){
  clearTimeout(petMsgTimer);
  const b=$('petBubble'); if(!b) return;
  b.textContent=msg; b.classList.add('show');
  petMsgTimer=setTimeout(()=>b.classList.remove('show'),3200);
}

/* ═══════════════════════════════════════════════
   🔒 비속어 필터 (클라이언트 단 안전장치)
═══════════════════════════════════════════════ */
const BLOCKED_WORDS = [
  '씨발','시발','씨바','ㅅㅂ','개새','새끼','존나','지랄','병신','미친놈',
  '꺼져','닥쳐','죽어','죽어라','ㅂㅅ','ㅈㄹ','ㄲㅈ','애미','에미','니미'
];
function containsBlockedWord(text) {
  const lower = text.toLowerCase().replace(/\s/g,'');
  return BLOCKED_WORDS.some(w => lower.includes(w));
}
function checkProfanity(text, fieldName='입력창') {
  if (containsBlockedWord(text)) {
    toast(`⚠️ ${fieldName}에 사용할 수 없는 단어가 포함되어 있어요. 바꿔서 써볼까요? 😊`);
    return false;
  }
  return true;
}

/* ═══════════════════════════════════════════════
   💾 데이터 백업 / 복원 (교실 공용 기기 대응)
═══════════════════════════════════════════════ */
async function backupData() {
  try {
    const allData = {};
    const keys = [
      SK.nick, SK.entries(currentNick), SK.bookList(currentNick),
      SK.poems(currentNick), SK.stories(currentNick), SK.badges(currentNick),
      'mdj_ink', 'mdj_pet', 'mdj_streak', 'mdj_shop'
    ];
    for (const k of keys) {
      const v = await lsGet(k);
      if (v !== null && v !== undefined) allData[k] = v;
    }
    const json = JSON.stringify({ version:1, nick:currentNick, exportedAt:new Date().toISOString(), data:allData }, null, 2);
    const blob = new Blob([json], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `지음_백업_${currentNick}_${Date.now()}.json`;
    a.style.display='none'; document.body.appendChild(a); a.click();
    setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
    toast('💾 데이터 백업 파일이 다운로드되었어요!');
  } catch(e) { toast('백업 실패: ' + e.message); }
}
async function restoreData(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed.data || !parsed.nick) { toast('❌ 올바른 백업 파일이 아니에요.'); return; }
    if (!confirm(`"${parsed.nick}"의 데이터를 복원할까요?\n현재 데이터 위에 덮어씌워집니다.`)) return;
    for (const [k, v] of Object.entries(parsed.data)) {
      await lsSet(k, v);
    }
    currentNick = parsed.nick;
    await refreshInkUI(); await initStreakUI(); await renderPet();
    toast('✅ 데이터 복원 완료! 앱을 새로고침하세요.');
  } catch(e) { toast('복원 실패: ' + e.message); }
}
function openBackupRestoreModal() {
  $('backupRestoreModal').classList.add('open');
}
function triggerRestoreUpload() {
  const input = document.createElement('input');
  input.type='file'; input.accept='.json';
  input.onchange = e => { if(e.target.files[0]) restoreData(e.target.files[0]); };
  input.click();
}
function getTodayStr(){ const d=new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
async function getStreak(){ return (await lsGet('mdj_streak'))||{count:0,last:''}; }
async function recordTodayWrite(){
  const today=getTodayStr(), s=await getStreak();
  const yesterday=new Date(); yesterday.setDate(yesterday.getDate()-1);
  const yStr=`${yesterday.getFullYear()}-${yesterday.getMonth()+1}-${yesterday.getDate()}`;
  if(s.last===today) return s.count;
  if(s.last===yStr){ s.count+=1; }
  else { s.count=1; }
  s.last=today;
  await lsSet('mdj_streak',s);
  if(s.count===3){ await addInk(500); toast('🔥 3일 연속! 잉크 2배 버프 발동! +500💧 보너스!'); }
  if(s.count===7){ await addInk(1000); await addBadge('꾸준함의 달인'); toast('🏆 7일 연속! 전설의 황금 보너스! +1,000💧'); }
  renderStreak(s.count);
  return s.count;
}
function renderStreak(count){
  if(!count) return;
  const el=$('homeStreakDisplay'); if(!el) return;
  el.style.display='flex';
  el.innerHTML=`<div class="streak-badge"><span class="sf">🔥</span>${count}일 연속 글쓰기!</div>`;
}
async function initStreakUI(){ const s=await getStreak(); if(s.count>0) renderStreak(s.count); }

/* ═══════════════════════════════════════════════
   🎁 이스터에그 시스템
═══════════════════════════════════════════════ */
const EASTER_WORDS={
  // 기존 (희귀도: common)
  '외계인':{emoji:'👽',title:'외계어 번역가 발견!',msg:'우주에서 날아온 비밀 신호를 포착했습니다! 외계인 뱃지를 획득했어요!',badge:'꿈꾸는 별',ink:500,rare:'common'},
  '무지개':{emoji:'🌈',title:'무지개 화가 발견!',msg:'7가지 색깔을 모두 담은 특별한 단어를 찾았어요! 색깔 마법사 칭호를 드립니다!',badge:'묘사왕 피카소',ink:400,rare:'common'},
  '블랙홀':{emoji:'🌌',title:'우주 탐험가 발견!',msg:'블랙홀에서 빠져나오다니 대단해요! 상상력 뱃지를 획득했습니다!',badge:'상상력 대장',ink:600,rare:'rare'},
  '마법사':{emoji:'🧙',title:'마법 주문 발견!',msg:'마법사의 비밀 주문을 일기장에 담았군요! 글쓰기 마법사 칭호!',badge:'꿈꾸는 별',ink:700,rare:'rare'},
  '공룡':{emoji:'🦕',title:'고생대 탐험 발견!',msg:'공룡과 함께 시간 여행을 했군요! 위대한 모험가 뱃지!',badge:'위대한 모험가',ink:400,rare:'common'},
  '마라탕':{emoji:'🍲',title:'맛의 탐정 발견!',msg:'얼얼하고 화끈한 맛을 발견! 먹방요정 뱃지를 획득했어요!',badge:'먹방 요정',ink:400,rare:'common'},
  // 부산 지역 특색 (희귀도: uncommon)
  '광안대교':{emoji:'🌉',title:'부산 빛의 목격자!',msg:'반짝반짝 빛나는 광안대교를 발견! 부산 탐험가 뱃지 획득!',badge:'위대한 모험가',ink:600,rare:'uncommon'},
  '갈매기':{emoji:'🐦',title:'끼룩끼룩!',msg:'끼룩끼룩! 갈매기가 잉크를 물고 날아왔어요! 바다 친구 뱃지!',badge:'꼬마 자연인',ink:500,rare:'uncommon'},
  '씨앗호떡':{emoji:'🥞',title:'부산 맛의 달인!',msg:'바삭바삭 씨앗호떡을 발견! 부산 미식가 뱃지 획득!',badge:'먹방 요정',ink:500,rare:'uncommon'},
  '밀면':{emoji:'🍜',title:'부산 면 전도사!',msg:'시원하고 쫄깃한 밀면 한 그릇을 발견! 먹방요정 뱃지!',badge:'먹방 요정',ink:500,rare:'uncommon'},
  '해운대':{emoji:'🏖️',title:'해운대 수호자!',msg:'부산의 보물 해운대를 발견! 여름 바다 뱃지 획득!',badge:'꼬마 자연인',ink:600,rare:'uncommon'},
  // 학교 생활 (희귀도: common)
  '급식':{emoji:'🍱',title:'급식 탐정 발견!',msg:'오늘의 급식을 발견! 맛있게 먹는 미식가 뱃지!',badge:'먹방 요정',ink:300,rare:'common'},
  '여름방학':{emoji:'☀️',title:'방학 기다리미 발견!',msg:'여름방학을 기다리는 마음이 느껴져요! 설렘 뱃지 획득!',badge:'긍정왕',ink:350,rare:'common'},
  '체육시간':{emoji:'⚽',title:'운동장 챔피언!',msg:'체육시간의 열정을 발견! 스포츠 왕 뱃지!',badge:'위대한 모험가',ink:300,rare:'common'},
  '교장선생님':{emoji:'🏫',title:'교장실 방문자!',msg:'학교의 최고 어른을 발견! 학교 탐험 뱃지!',badge:'세밀한 관찰자',ink:400,rare:'uncommon'},
  '알림장':{emoji:'📋',title:'알림장 꼼꼼이!',msg:'알림장을 꼼꼼히 쓰는 모습이 대단해요! 성실왕 뱃지!',badge:'꾸준함의 달인',ink:300,rare:'common'},
  // 판타지/상상 (희귀도: rare/legendary)
  '유니콘':{emoji:'🦄',title:'신비한 유니콘 발견!',msg:'무지개빛 유니콘이 나타났어요! 환상 여행자 뱃지 획득!',badge:'꿈꾸는 별',ink:800,rare:'rare'},
  '투명인간':{emoji:'👻',title:'투명인간 포착!',msg:'눈에 보이지 않는 투명인간을 발견! 신비의 탐정 뱃지!',badge:'상상력 대장',ink:700,rare:'rare'},
  '시간여행':{emoji:'⏰',title:'타임머신 탑승!',msg:'과거와 미래를 넘나드는 시간여행자를 발견! 역사 탐험가 뱃지!',badge:'위대한 모험가',ink:800,rare:'rare'},
  '순간이동':{emoji:'⚡',title:'순간이동 능력자!',msg:'빛보다 빠른 순간이동 능력을 발견! 초능력 뱃지 전설 달성!',badge:'상상력 대장',ink:1000,rare:'legendary'},
  // 추가 특별 (legendary)
  '지음':{emoji:'✍️',title:'지음 프로젝트 마스터!',msg:'이 앱의 이름을 발견한 진정한 탐험가! 전설의 마스터 뱃지!',badge:'묘사왕 피카소',ink:2000,rare:'legendary'},
  '마법봉':{emoji:'🪄',title:'마법사의 지팡이!',msg:'마법봉으로 글을 쓰는 마법사를 발견! 레전드 뱃지!',badge:'꿈꾸는 별',ink:900,rare:'rare'},
  '용':{emoji:'🐉',title:'용의 글쓰기 비밀!',msg:'용이 불꽃으로 쓴 편지를 발견했어요! 드래곤 뱃지!',badge:'상상력 대장',ink:800,rare:'rare'},
  '별똥별':{emoji:'🌠',title:'소원 성취!',msg:'별똥별을 발견! 소원 한 가지가 이루어질 것 같아요!',badge:'꿈꾸는 별',ink:600,rare:'uncommon'},
  '보물섬':{emoji:'🏴‍☠️',title:'보물 지도 발견!',msg:'보물섬의 비밀 지도를 발견! 해적 탐험가 뱃지!',badge:'위대한 모험가',ink:700,rare:'rare'},
};
const RARE_COLORS = {common:'#62b3a4', uncommon:'#4a90e2', rare:'#8a7ce8', legendary:'#f49f5a'};
const RARE_NAMES = {common:'일반', uncommon:'비범', rare:'희귀', legendary:'🌟 전설'};
const foundEasterWords=new Set();
async function checkEasterEgg(text){
  for(const [word, data] of Object.entries(EASTER_WORDS)){
    if(text.includes(word) && !foundEasterWords.has(word)){
      foundEasterWords.add(word);
      showEaster(word, data);
      return;
    }
  }
}
function showEaster(word, data){
  const rareColor = RARE_COLORS[data.rare||'common'];
  const rareName = RARE_NAMES[data.rare||'common'];
  $('easterEmoji').textContent=data.emoji;
  $('easterTitle').textContent=data.title;
  $('easterMsg').textContent=`"${word}" ${data.msg} 잉크 방울 +${data.ink}💧`;
  // 희귀도 표시 업데이트
  const rareEl = $('easterRare');
  if(rareEl){ rareEl.textContent=rareName; rareEl.style.background=rareColor; }
  const rain=$('emojiRain'); rain.innerHTML='';
  const dropCount = data.rare==='legendary' ? 40 : data.rare==='rare' ? 30 : data.rare==='uncommon' ? 22 : 15;
  for(let i=0;i<dropCount;i++){
    const d=document.createElement('div');
    d.className='e-drop'; d.textContent=data.emoji;
    d.style.left=`${Math.random()*100}%`;
    d.style.animationDuration=`${1.5+Math.random()*2}s`;
    d.style.animationDelay=`${Math.random()*1.5}s`;
    d.style.fontSize=`${18 + Math.random()*18}px`;
    rain.appendChild(d);
  }
  $('easterOverlay').classList.add('show');
  addInk(data.ink);
  if(data.badge) addBadge(data.badge);
}
function closeEaster(){ $('easterOverlay').classList.remove('show'); $('emojiRain').innerHTML=''; }

/* ═══════════════════════════════════════════════
   🏆 명예의 전당
═══════════════════════════════════════════════ */
async function getBestWorks(){
  const entries=(await lsGet(SK.entries(currentNick)))||[];
  const sorted=[...entries].filter(e=>e.imgB64).sort((a,b)=>(b.richness||0)-(a.richness||0));
  return sorted.slice(0,6);
}
async function openHallModal(){
  const works=await getBestWorks();
  const el=$('hallContent');
  if(!works.length){
    el.innerHTML='<div style="text-align:center;color:#aaa;padding:20px;">아직 그림 일기가 없어요. 일기를 쓰고 그림을 그려보세요! 🎨</div>';
  } else {
    const ranks=['🥇','🥈','🥉'];
    const rankClasses=['gold','silver','bronze'];
    el.innerHTML=works.map((e,i)=>`
      <div class="hall-card" onclick="closeModal('hallModal')">
        <div class="hall-rank ${rankClasses[i]||''}">${ranks[i]||`#${i+1}`}</div>
        ${e.imgB64?`<img src="${e.imgB64}" class="hall-card-img" style="display:block;">`:'<div class="hall-card-img">🖼️</div>'}
        <div class="hall-card-title">${(e.title||'').replace(/[\[\]]/g,'').trim()||'오늘의 일기'}</div>
        <div class="hall-card-nick">✍️ ${currentNick||'작가 미상'} · 묘사력 ${e.richness||0}/10</div>
        <div style="font-size:10px;color:#bbb;margin-top:3px;">${e.dateLabel||''}</div>
      </div>`).join('');
  }
  $('hallModal').classList.add('open');
}

/* ═══════════════════════════════════════════════
   🛒 잉크 상점
═══════════════════════════════════════════════ */
const SHOP_ITEMS=[
  // ── 🎨 테마 (앱 색상) ──────────────────────────────
  {id:'theme_default', name:'기본 파스텔',    icon:'🌸', price:0,     type:'theme',   desc:'따뜻한 파스텔 (기본)'},
  {id:'theme_space',   name:'우주 탐험가',    icon:'🚀', price:3000,  type:'theme',   desc:'신비로운 우주 다크 블루'},
  {id:'theme_dino',    name:'공룡 탐험',      icon:'🦕', price:3000,  type:'theme',   desc:'쥬라기 싱그러운 초록'},
  {id:'theme_ocean',   name:'해저 탐험',      icon:'🐠', price:3000,  type:'theme',   desc:'깊고 시원한 바다'},
  {id:'theme_galaxy',  name:'은하수 밤하늘',  icon:'🌌', price:5000,  type:'theme',   desc:'별이 쏟아지는 보라빛 밤'},
  {id:'theme_sakura',  name:'벚꽃 봄날',      icon:'🌸', price:4000,  type:'theme',   desc:'분홍빛 봄바람'},
  {id:'theme_autumn',  name:'단풍 가을',      icon:'🍁', price:4000,  type:'theme',   desc:'붉고 황금빛 가을숲'},
  {id:'theme_candy',   name:'캔디 왕국',      icon:'🍬', price:4500,  type:'theme',   desc:'달콤한 파스텔 카니발'},
  {id:'theme_midnight',name:'미드나잇 블루',  icon:'🌙', price:5500,  type:'theme',   desc:'깊은 밤의 청색'},

  // ── 🖼️ 그림 스타일 (AI 이미지 프롬프트) ─────────────
  {id:'style_pixel',     name:'픽셀 아트',    icon:'👾', price:4000,  type:'style',   desc:'레트로 16비트 도트 그림'},
  {id:'style_watercolor',name:'수채화',        icon:'🎨', price:4000,  type:'style',   desc:'부드러운 수채화 느낌'},
  {id:'style_disney',    name:'3D 디즈니',     icon:'✨', price:8000,  type:'style',   desc:'화려한 3D 픽사 스타일'},
  {id:'style_ghibli',    name:'지브리 감성',   icon:'🌿', price:7000,  type:'style',   desc:'따뜻한 손그림 지브리'},
  {id:'style_oilpaint',  name:'유화 명작',     icon:'🖼️', price:10000, type:'style',   desc:'고풍스러운 임파스토 유화'},
  {id:'style_comicbook', name:'만화책',        icon:'💥', price:5000,  type:'style',   desc:'팝아트 만화책 컷'},
  {id:'style_sketch',    name:'연필 스케치',   icon:'✏️', price:3500,  type:'style',   desc:'섬세한 연필 소묘'},
  {id:'style_pastel',    name:'파스텔 크레용', icon:'🖍️', price:3500,  type:'style',   desc:'크레파스로 그린 느낌'},
  {id:'style_neon',      name:'네온 사이버',   icon:'🔮', price:9000,  type:'style',   desc:'사이버펑크 네온 글로우'},

  // ── 🍭 펫 먹이 (소모품) ──────────────────────────────
  {id:'pet_food',      name:'달콤한 간식 ×3', icon:'🍭', price:1500,  type:'petfood', desc:'펫 EXP +30 즉시 지급'},
  {id:'pet_royal',     name:'왕실 만찬',       icon:'👑', price:5000,  type:'petfood', desc:'펫 EXP +150 & 레벨업 찬스'},
  {id:'pet_superstar', name:'슈퍼스타 도시락', icon:'⭐', price:8000,  type:'petfood', desc:'펫 EXP +300 & 특별 대사 해금'},

  // ── ⚡ 잉크 부스터 (소모품) ──────────────────────────
  {id:'boost_double',  name:'잉크 2배 쿠폰',  icon:'💎', price:2000,  type:'boost',   desc:'다음 저장 보상 2배!'},
  {id:'boost_triple',  name:'잉크 3배 쿠폰',  icon:'💜', price:4500,  type:'boost',   desc:'다음 저장 보상 3배!'},
  {id:'boost_mission', name:'미션 힌트 ×3',   icon:'🎯', price:1000,  type:'boost',   desc:'오늘 미션 AI 힌트 3회 추가'},

  // ── 🎭 일기장 꾸미기 (소모품 / 효과) ────────────────
  {id:'deco_sparkle',  name:'반짝이 표지',     icon:'🌟', price:2000,  type:'deco',    desc:'일기 출력에 별 테두리 추가'},
  {id:'deco_rainbow',  name:'무지개 테두리',   icon:'🌈', price:2500,  type:'deco',    desc:'일기 출력에 무지개 프레임'},
  {id:'deco_cloud',    name:'구름 배경지',      icon:'☁️', price:2000,  type:'deco',    desc:'일기 출력 배경이 하늘로!'},
  {id:'deco_gold',     name:'황금 도장',        icon:'🏅', price:6000,  type:'deco',    desc:'선생님 도장이 황금빛으로!'},
  {id:'deco_stamp_dragon', name:'드래곤 도장', icon:'🐉', price:8000,  type:'deco',    desc:'레전드 용 도장 획득!'},
];
const THEME_STYLES={
  theme_default:  {bg:'var(--bg)',                         header:'linear-gradient(135deg,#62b3a4,#f49f5a)'},
  theme_space:    {bg:'#0d1b2a',                           header:'linear-gradient(135deg,#1a1a4e,#4a0080)'},
  theme_dino:     {bg:'#f0fff0',                           header:'linear-gradient(135deg,#4a7c45,#8bc34a)'},
  theme_ocean:    {bg:'#e8f4fd',                           header:'linear-gradient(135deg,#006994,#00bcd4)'},
  theme_galaxy:   {bg:'#0a0a1a',                           header:'linear-gradient(135deg,#1a0030,#0d004d,#4a0080)'},
  theme_sakura:   {bg:'#fff0f5',                           header:'linear-gradient(135deg,#e06090,#ffb3cc)'},
  theme_autumn:   {bg:'#fff8f0',                           header:'linear-gradient(135deg,#c0392b,#e67e22,#f1c40f)'},
  theme_candy:    {bg:'#fff5fb',                           header:'linear-gradient(135deg,#ff80c8,#ffb3e6,#c084fc)'},
  theme_midnight: {bg:'#0d1117',                           header:'linear-gradient(135deg,#0f2027,#203a43,#2c5364)'},
};
const STYLE_PROMPTS={
  style_default:    '',
  style_pixel:      ', pixel art style, 16-bit retro game graphics, chunky pixels',
  style_watercolor: ', soft watercolor painting style, gentle brushstrokes, paper texture',
  style_disney:     ', 3D Disney Pixar movie style, vibrant, cinematic lighting',
  style_ghibli:     ', Studio Ghibli watercolor illustration, warm pastel tones, hand-drawn',
  style_oilpaint:   ', classic oil painting style, impasto texture, rich warm colors',
  style_comicbook:  ', pop art comic book style, bold outlines, halftone dots, bright flat colors',
  style_sketch:     ', detailed pencil sketch, fine hatching, grayscale, sketchbook',
  style_pastel:     ', crayon and pastel drawing, childlike strokes, soft blended colors',
  style_neon:       ', cyberpunk neon glow, dark background, electric neon colors, sci-fi',
};
async function getShopData(){ return (await lsGet('mdj_shop'))||{owned:['theme_default'],equippedTheme:'theme_default',equippedStyle:'style_default'}; }
async function saveShopData(d){ await lsSet('mdj_shop',d); }
function getEquippedStylePrompt(){
  // 동기적 접근 필요시 localStorage 폴백 (스타일 프롬프트는 즉시 필요)
  try { const d=JSON.parse(localStorage.getItem('mdj_shop')||'{}'); return STYLE_PROMPTS[d.equippedStyle]||''; } catch { return ''; }
}
async function openShopModal(){
  await refreshInkUI();
  const d=await getShopData();
  const el=$('shopContent');

  // 카테고리별로 그룹핑
  const categories=[
    {key:'theme',   label:'🎨 앱 테마',          color:'#62b3a4'},
    {key:'style',   label:'🖼️ AI 그림 스타일',   color:'#8a7ce8'},
    {key:'petfood', label:'🐾 펫 먹이',           color:'#f49f5a'},
    {key:'boost',   label:'⚡ 잉크 부스터',       color:'#4a90e2'},
    {key:'deco',    label:'✨ 일기장 꾸미기',     color:'#e06090'},
  ];

  let html = '';
  for(const cat of categories){
    const items = SHOP_ITEMS.filter(i=>i.type===cat.key);
    if(!items.length) continue;
    html += `<div style="width:100%;font-size:12px;font-weight:bold;color:${cat.color};border-bottom:2px solid ${cat.color}33;padding:6px 2px 4px;margin:10px 0 6px;letter-spacing:.5px;">${cat.label}</div>`;
    html += items.map(item=>{
      const owned = d.owned.includes(item.id) || item.price===0;
      const isBoostOrDeco = item.type==='boost'||item.type==='deco';
      const eqTheme = d.equippedTheme===item.id;
      const eqStyle = d.equippedStyle===item.id;
      const eqDeco  = (d.equippedDeco||[]).includes(item.id);
      const isEquipped = eqTheme||eqStyle||eqDeco;
      let btnHtml='';
      if(item.type==='petfood'){
        if(item.id==='pet_superstar') btnHtml=`<button class="shop-btn buy" onclick="buyPetSuperstar()">${item.price}💧 구매</button>`;
        else if(item.id==='pet_royal') btnHtml=`<button class="shop-btn buy" onclick="buyPetRoyal()">${item.price}💧 구매</button>`;
        else btnHtml=`<button class="shop-btn buy" onclick="buyPetFood()">${item.price}💧 구매</button>`;
      } else if(item.type==='boost'){
        btnHtml=`<button class="shop-btn buy" onclick="buyBoost('${item.id}')">${item.price}💧 구매</button>`;
      } else if(item.type==='deco'){
        if(owned && isEquipped) btnHtml=`<button class="shop-btn equipped-lbl">✅ 적용중</button>`;
        else if(owned) btnHtml=`<button class="shop-btn equip" onclick="equipItem('${item.id}','deco')">👔 적용</button>`;
        else btnHtml=`<button class="shop-btn buy" onclick="buyItem('${item.id}')">${item.price}💧 구매</button>`;
      } else if(isEquipped){
        btnHtml=`<button class="shop-btn equipped-lbl">✅ 착용중</button>`;
      } else if(owned){
        btnHtml=`<button class="shop-btn equip" onclick="equipItem('${item.id}','${item.type}')">👔 착용</button>`;
      } else {
        btnHtml=`<button class="shop-btn buy" onclick="buyItem('${item.id}')">${item.price}💧 구매</button>`;
      }
      return `<div class="shop-item ${owned&&!isBoostOrDeco?'owned':''} ${isEquipped?'equipped':''}">
        <div class="shop-item-icon">${item.icon}</div>
        <div class="shop-item-name">${item.name}</div>
        <div style="font-size:10px;color:#999;word-break:keep-all;">${item.desc}</div>
        <div class="shop-item-price ${item.price===0?'free':''}">${item.price===0?'기본 제공':`${item.price}💧`}</div>
        ${btnHtml}
      </div>`;
    }).join('');
  }
  el.innerHTML = html;
  $('shopModal').classList.add('open');
}
async function buyItem(id){
  const item=SHOP_ITEMS.find(i=>i.id===id); if(!item) return;
  if(!await spendInk(item.price)){ toast(`💧 잉크방울이 부족해요! ${item.price}개 필요`); return; }
  const d=await getShopData();
  if(!d.owned.includes(id)) d.owned.push(id);
  await saveShopData(d);
  toast(`🎉 "${item.name}" 구매 완료!`);
  await openShopModal();
}
async function equipItem(id, type){
  const d=await getShopData();
  if(type==='theme') d.equippedTheme=id;
  else if(type==='style') d.equippedStyle=id;
  else if(type==='deco'){
    if(!d.equippedDeco) d.equippedDeco=[];
    const idx=d.equippedDeco.indexOf(id);
    if(idx>=0) d.equippedDeco.splice(idx,1); // 토글 off
    else d.equippedDeco.push(id);            // 토글 on
  }
  await saveShopData(d);
  try { localStorage.setItem('mdj_shop', JSON.stringify(d)); } catch{}
  applyTheme(d.equippedTheme||'theme_default');
  toast(`👔 "${SHOP_ITEMS.find(i=>i.id===id)?.name}" 적용!`);
  await openShopModal();
}
async function buyPetFood(){
  if(!await spendInk(1500)){ toast('💧 잉크방울이 부족해요!'); return; }
  await addPetExp(30);
  toast('🍭 펫이 간식을 먹었어요! EXP+30');
  await openShopModal();
}
async function buyPetRoyal(){
  if(!await spendInk(5000)){ toast('💧 잉크방울이 부족해요!'); return; }
  await addPetExp(150);
  toast('👑 왕실 만찬! EXP+150 & 레벨업 찬스!');
  await openShopModal();
}
async function buyPetSuperstar(){
  if(!await spendInk(8000)){ toast('💧 잉크방울이 부족해요!'); return; }
  await addPetExp(300);
  toast('⭐ 슈퍼스타 도시락! EXP+300! 펫이 반짝반짝해요!');
  showFireworks();
  await openShopModal();
}
async function buyBoost(id){
  const item=SHOP_ITEMS.find(i=>i.id===id); if(!item) return;
  if(!await spendInk(item.price)){ toast(`💧 잉크방울이 부족해요! ${item.price}개 필요`); return; }
  const d=await getShopData();
  if(!d.boosts) d.boosts={};
  d.boosts[id]=(d.boosts[id]||0)+1;
  await saveShopData(d);
  try { localStorage.setItem('mdj_shop', JSON.stringify(d)); } catch{}
  if(id==='boost_double') toast('💎 잉크 2배 쿠폰 획득! 다음 저장 때 2배로 받아요!');
  else if(id==='boost_triple') toast('💜 잉크 3배 쿠폰 획득! 엄청난 보상이 기다려요!');
  else if(id==='boost_mission') toast('🎯 미션 힌트 3회 추가! 도전해보세요!');
  await openShopModal();
}
function applyTheme(themeId){
  const t=THEME_STYLES[themeId]; if(!t) return;
  document.body.style.background=t.bg;
  document.querySelectorAll('#ieumApp header,#dodumApp header,#ttieumApp header,#jieumApp header').forEach(h=>{ h.style.background=t.header; });
  const hsc=$('homeScreen'); if(hsc) hsc.style.background=t.header;
}
async function initShopTheme(){
  const d=await getShopData();
  // localStorage 캐시 갱신
  try { localStorage.setItem('mdj_shop', JSON.stringify(d)); } catch{}
  applyTheme(d.equippedTheme||'theme_default');
}

/* ═══════════════════════════════════════════════
   ⏱️ 타임어택 (돋움 전용)
═══════════════════════════════════════════════ */
let taActive=false, taTimer=null, taSeconds=60;
function toggleTimeAttack(){
  if(taActive) stopTimeAttack();
  else startTimeAttack();
}
function startTimeAttack(){
  if(!$('mWitnessBox').querySelector('img')){ toast('먼저 [기억 되살리기]로 범인을 확인하세요!'); return; }
  taActive=true; taSeconds=60;
  $('timerWrap').classList.add('active');
  $('timeAttackBtn').textContent='⏹ 중지';
  $('timeAttackBtn').style.background='rgba(200,50,50,.7)';
  $('mMontageInput').value='';
  $('mMontageInput').focus();
  toast('⚡ 타임어택 시작! 60초 안에 묘사하세요!');
  updateTimerUI();
  taTimer=setInterval(()=>{
    taSeconds--;
    updateTimerUI();
    if(taSeconds<=0) timeUp();
  },1000);
}
function stopTimeAttack(){
  taActive=false;
  clearInterval(taTimer);
  $('timerWrap').classList.remove('active');
  $('timeAttackBtn').textContent='⚡ 타임어택';
  $('timeAttackBtn').style.background='rgba(255,107,53,.7)';
}
function updateTimerUI(){
  $('timerDisplay').textContent=taSeconds;
  const pct=(taSeconds/60)*100;
  $('timerBar').style.width=`${pct}%`;
  $('timerBar').className=taSeconds<=15?'danger':'';
}
function timeUp(){
  stopTimeAttack();
  const input=$('mMontageInput').value.trim();
  if(input){ 
    drawMontage();
    toast('⏰ 시간 종료! 자동으로 채점합니다!');
  } else {
    toast('⏰ 시간 종료! 다음엔 꼭 써보세요!');
  }
}

/* ═══════════════════════════════════════════════
   비용 트래킹 및 이미지 압축 최적화 (저장 오류 해결)
═══════════════════════════════════════════════ */
const PROXY = 'https://magic-diary.vercel.app/api/proxy';

let totalCost = parseFloat(localStorage.getItem('mdj_cost') || '0');
function updateCost(amount) {
  totalCost += amount;
  try { localStorage.setItem('mdj_cost', totalCost.toFixed(4)); } catch(e){}
}

async function callClaude(body) {
  const res = await fetch(PROXY, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
  const raw = await res.text();
  if (!raw?.trim()) throw new Error(`빈 응답 ${res.status}`);
  let d; try { d=JSON.parse(raw); } catch { throw new Error('파싱 실패'); }
  if (!res.ok) throw new Error(d.error?.message || `HTTP ${res.status}`);
  updateCost(0.0005);
  return (d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
}

async function compressImage(srcB64, maxW=800, maxH=800, quality=0.8) {
  return new Promise(resolve => {
    if(!srcB64) return resolve(null);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if(w > maxW || h > maxH) {
        const ratio = Math.min(maxW/w, maxH/h);
        w *= ratio; h *= ratio;
      }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; 
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(srcB64);
    img.src = srcB64;
  });
}

function sanitizePrompt(p) {
  // ④ 정서적 수용: 무서움/화남/슬픔 감정은 그대로 보존하되, 
  //    실제 유해 콘텐츠(무기, 혈액 등)만 중립적으로 완화
  const rep = [
    [/\b(weapon|gun|knife|sword|bomb)\b/gi,'item'],
    [/\b(blood|gore|kill|murder|dead body)\b/gi,'scene'],
    [/\b(cctv|surveillance)\b/gi,'camera'],
    // monster/criminal은 완전 제거하지 않고 'cartoon character'로만 변환
    [/\b(suspect|criminal)\b/gi,'character'],
  ];
  let s = p;
  // 한국어/일본어/중국어 문자 제거 → Together AI FLUX가 글자를 이미지에 렌더링하면 깨짐
  s = s.replace(/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/g, '');
  // 중복 공백 정리
  s = s.replace(/\s+/g, ' ').trim();
  for (const [r,v] of rep) s=s.replace(r,v);
  return s;
}

// Together AI에서 글자 깨짐을 막는 공통 no-text suffix
const NO_TEXT_SUFFIX = ' absolutely NO text, NO letters, NO words, NO captions, NO watermarks, NO writing of any kind in the image.';

async function generateDalle(prompt, richness=5, onStatus, isPhoto=false) {
  // imagePrompt가 비어있으면 기본 장면으로
  const rawPrompt = (prompt && prompt.trim())
    ? prompt.trim()
    : 'Korean elementary school child in a heartwarming daily life scene';

  const safe = sanitizePrompt(rawPrompt);
  let styleSuffix;

  if (isPhoto) {
    styleSuffix = ' Simple illustration style, clear front view, full body, plain background.';
  } else {
    // 묘사력에 따라 스타일 변화: 크레파스(낮음) → 수채화(높음) — 3단계로 명확히 구분
    if (richness <= 3) {
      // 묘사력 1~3: 채도 낮은 회색 톤, 매우 단순한 크레파스 스케치
      styleSuffix = " 8-year-old Korean child's crayon sketch, black and white only, very simple rough crayon lines, grayscale monochrome, childlike hand-drawn doodle, minimal detail, scribbled unfinished lines, almost no color at all, white paper background.";
    } else if (richness <= 7) {
      // 묘사력 4~7: 단순한 그림에 색상은 아주 약간만
      styleSuffix = " 9-year-old Korean child's crayon drawing, simple clean crayon outlines, only a small touch of soft muted color added here and there, most of the picture left uncolored white, moderate detail, hand-drawn childlike art, white paper background.";
    } else {
      // 묘사력 8~10: 채도 높고 풍성한 수채화 느낌
      styleSuffix = " Korean child's vivid crayon and watercolor picture-book illustration, highly saturated bright colors, rich translucent watercolor washes blended with bold crayon strokes, fully colored in with no blank areas, joyful and richly detailed scene, skilled hand-painted children's book quality, warm glowing colors, light paper texture.";
    }
  }

  const styleExtra = getEquippedStylePrompt();
  // 일기 내용(safe)을 맨 앞에 + 글자 깨짐 방지 no-text suffix
  const finalPrompt = `${safe}${styleSuffix}${styleExtra ? ' ' + styleExtra : ''}${NO_TEXT_SUFFIX}`;
  if (onStatus) onStatus('그림 생성 중...');

  // Together AI FLUX 모델 사용 (FLUX.1-schnell 서버리스)
  // ⚠️ 생성 해상도 768x768로 제한: 1024x1024 PNG는 base64 인코딩 시
  //    Vercel 서버리스 함수의 응답 페이로드 한도(4.5MB)를 넘기는 경우가 많아
  //    이미지가 통째로 실패하는 원인이 됨. 어차피 아래 compressImage()에서
  //    800x800으로 다시 줄이므로 1024로 생성할 필요가 없음.
  const togetherModel = 'black-forest-labs/FLUX.1-schnell';
  const GEN_SIZE = 768;
  const body = {
    target: 'together-image',
    model: togetherModel,
    prompt: finalPrompt,
    width: GEN_SIZE,
    height: GEN_SIZE,
    steps: 4,
    n: 1,
  };

  // Vercel 플랫폼 레벨 오류(413 FUNCTION_PAYLOAD_TOO_LARGE 등)는 JSON이 아닐 수 있으므로
  // 텍스트로 먼저 받아 안전하게 파싱한다 (callClaude와 동일한 패턴).
  async function parseProxyResponse(res) {
    const raw = await res.text();
    if (!raw?.trim()) throw new Error(`이미지 서버 빈 응답 (HTTP ${res.status})`);
    try {
      return JSON.parse(raw);
    } catch {
      // 페이로드 초과 등으로 Vercel이 JSON이 아닌 응답(HTML 등)을 돌려준 경우
      const sizeHint = res.status === 413 ? ' (이미지 용량이 너무 큽니다)' : '';
      throw new Error(`이미지 서버 응답 파싱 실패 (HTTP ${res.status})${sizeHint}`);
    }
  }

  const res = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await parseProxyResponse(res);

  let rawB64 = '';
  if (!res.ok) {
    // 안전 정책 오류 시 기본 장면으로 재시도
    if (data.error?.message?.includes('safety') || data.error?.message?.includes('content_policy') || data.error?.message?.includes('moderat')) {
      if (onStatus) onStatus('프롬프트 조정 후 재시도...');
      const fb = {
        target: 'together-image',
        model: togetherModel,
        prompt: "Korean elementary school child in a cheerful daily scene, warm watercolor illustration, no text, no letters, plain background.",
        width: GEN_SIZE, height: GEN_SIZE, steps: 4, n: 1,
      };
      const res2 = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fb) });
      const d2 = await parseProxyResponse(res2);
      if (!res2.ok) throw new Error(d2.error?.message || `HTTP ${res2.status}`);
      if (!d2.data?.[0]?.b64_json) throw new Error('이미지 데이터가 없습니다 (fallback)');
      updateCost(0.001);
      rawB64 = `data:image/png;base64,${d2.data[0].b64_json}`;
    } else {
      throw new Error(data.error?.message || `HTTP ${res.status}`);
    }
  } else {
    if (!data.data?.[0]?.b64_json) throw new Error('이미지 데이터가 없습니다');
    updateCost(0.001); // Together AI FLUX.1-schnell 비용 (0.0027/MP)
    rawB64 = `data:image/png;base64,${data.data[0].b64_json}`;
  }
  return await compressImage(rawB64, 800, 800, 0.8);
}

async function buildPDF(pages) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const W=210, H=297;
  for (let i=0; i<pages.length; i++) {
    if (i>0) doc.addPage();
    const el = document.createElement('div');
    el.style.cssText = `position:absolute; top:-10000px; left:0; width:794px; background:white; font-family:Jua,sans-serif; z-index:-1;`;
    el.innerHTML = pages[i].html;
    document.body.appendChild(el);
    await sleep(400); 
    const imgs = el.querySelectorAll('img');
    await Promise.all(Array.from(imgs).map(img => new Promise(res => {
        if(img.complete) return res();
        img.onload = res; img.onerror = res;
    })));

    const canvas = await html2canvas(el, { scale:2, useCORS:true, backgroundColor:'#ffffff', logging:false });
    document.body.removeChild(el);
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const ratio = canvas.width / canvas.height;
    let iW = W, iH = W / ratio;
    if (iH > H) { iH = H; iW = H * ratio; }
    const x = (W - iW) / 2, y = (H - iH) / 2;
    doc.addImage(imgData, 'JPEG', x, y, iW, iH);
  }
  return doc;
}

