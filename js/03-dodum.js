/* ============================================================
 * [도담] 몽타주/낱말잔치/시어뽑기 탭
 * (분할 자동 생성 — 원본 index.html에서 추출, 로드 순서 유지 필수)
 * ============================================================ */
const DODUM_TABS = ['montage','word','poem'];
const DODUM_TAB_GOALS = {
  montage: '💡 오늘의 목표: 본 것을 언어로 정확하게 표현하기',
  word: '💡 엉뚱한 두 단어로 마법의 문장을 만들어봐요!',
  poem: '💡 시 쓰기에 딱 맞는 단어들을 뽑아보세요!'
};
function switchDodumTab(tab){
  DODUM_TABS.forEach(t=>{
    const content=$(`dodumContent_${t}`);
    if(content) content.style.display=(t===tab)?'flex':'none';
    const btn=$(`dodumTab_${t}`);
    if(btn){
      btn.style.background=t===tab?'rgba(255,255,255,.9)':'rgba(255,255,255,.2)';
      btn.style.color=t===tab?'var(--blue)':'white';
      btn.style.fontWeight=t===tab?'bold':'normal';
    }
  });
  const headerRight=$('dodumHeaderRight_montage');
  if(headerRight) headerRight.style.display=tab==='montage'?'flex':'none';
  const goal=$('dodumGoalBadge');
  if(goal) goal.textContent=DODUM_TAB_GOALS[tab]||'';
}

/* ═══════════════════════════════════════════════
   돋움: 엉뚱 단어 자판기
═══════════════════════════════════════════════ */
// 단어장 A — 구체적/일상적 사물 (확장)
const DODUM_BANK_A = [
  "지우개","선풍기","신호등","거울","운동화","우산","냉장고","리모컨","의자","자전거",
  "가방","시계","칫솔","이불","스탠드","우체통","화분","양말","달력","책상",
  "주전자","멜빵","안경","빗자루","체온계","돋보기","자석","솥뚜껑","고무장갑","수건",
  "전화기","우유팩","슬리퍼","지갑","열쇠","나침반","망원경","계산기","도시락통","가위"
];
// 단어장 B — 추상적/자연/감정 (확장)
const DODUM_BANK_B = [
  "밤하늘","그리움","비밀","시간","파도","꿈","메아리","봄바람","마음","눈물",
  "우주","별빛","기억","설렘","그림자","소원","향기","용기","기적","속삭임",
  "외로움","기쁨","슬픔","호기심","두근거림","아침이슬","낙엽","무지개","번개","고요함",
  "그리움","기다림","자유","희망","추억","상상","열정","평화","신비","조화"
];

/* ══════════════════════════════════════════════
   파트 2 추가: 이중 언어 단어 배열
   영어 단어에 한글 뜻을 괄호로 병기하여 스캐폴딩 제공
══════════════════════════════════════════════ */
// 단어장 A (영어) — 구체적/일상적 사물 + 한글 뜻 병기
const DODUM_BANK_A_EN = [
  "Eraser (지우개)","Fan (선풍기)","Traffic light (신호등)","Mirror (거울)","Sneakers (운동화)",
  "Umbrella (우산)","Refrigerator (냉장고)","Remote control (리모컨)","Chair (의자)","Bicycle (자전거)",
  "Backpack (가방)","Clock (시계)","Toothbrush (칫솔)","Blanket (이불)","Desk lamp (스탠드)",
  "Mailbox (우체통)","Flowerpot (화분)","Socks (양말)","Calendar (달력)","Desk (책상)",
  "Kettle (주전자)","Glasses (안경)","Broom (빗자루)","Thermometer (체온계)","Magnifying glass (돋보기)",
  "Magnet (자석)","Rubber gloves (고무장갑)","Towel (수건)","Wallet (지갑)","Key (열쇠)",
  "Compass (나침반)","Telescope (망원경)","Calculator (계산기)","Lunchbox (도시락통)","Scissors (가위)"
];
// 단어장 B (영어) — 추상적/자연/감정 + 한글 뜻 병기
const DODUM_BANK_B_EN = [
  "Night sky (밤하늘)","Longing (그리움)","Secret (비밀)","Time (시간)","Wave (파도)",
  "Dream (꿈)","Echo (메아리)","Spring breeze (봄바람)","Heart (마음)","Tears (눈물)",
  "Universe (우주)","Starlight (별빛)","Memory (기억)","Excitement (설렘)","Shadow (그림자)",
  "Wish (소원)","Fragrance (향기)","Courage (용기)","Miracle (기적)","Whisper (속삭임)",
  "Loneliness (외로움)","Joy (기쁨)","Sorrow (슬픔)","Curiosity (호기심)","Heartbeat (두근거림)",
  "Morning dew (아침이슬)","Fallen leaf (낙엽)","Rainbow (무지개)","Lightning (번개)","Stillness (고요함)",
  "Freedom (자유)","Hope (희망)","Memory (추억)","Imagination (상상)","Passion (열정)",
  "Peace (평화)","Mystery (신비)","Harmony (조화)"
];

// 시어 단어장 (영어) — 주제별 + 한글 뜻 병기
const POEM_WORD_BANKS_EN = {
  spring: ["sprout (새싹)","haze (아지랑이)","ticklish (간지러운)","pink (분홍빛)","softly (살랑살랑)","pollen (꽃가루)","yawn (하품)","cozy (포근한)","beginning (시작)","dandelion (민들레)","butterfly (나비)","blossom (꽃)","spring rain (봄비)","earthy smell (흙냄새)","lazy (나른한)","thrilling (설레는)","green (연두색)","bud (싹트다)"],
  summer: ["wave (파도)","cicada (매미)","dazzling (눈부신)","sweat (땀방울)","watermelon (수박)","splash (풍덩)","blue (푸른)","ice cream (아이스크림)","shower (소나기)","shade (그늘)","flash (번쩍)","thunder (천둥)","heat (열기)","beach (모래사장)","sparkling (반짝이는)","cool (시원한)","swim (헤엄치다)","cloud (뭉게구름)","sunflower (해바라기)"],
  autumn: ["maple leaf (단풍)","rustle (바스락)","lonely (쓸쓸한)","tall (높은)","scarecrow (허수아비)","acorn (도토리)","cricket (귀뚜라미)","sunset (노을)","wind (바람)","fallen leaf (낙엽)","red (빨간)","sky (하늘)","clear (청명한)","cool (서늘한)","harvest (추수)","golden (황금빛)"],
  winter: ["breath (입김)","fluffy (포근한)","snow-white (새하얀)","frozen (꽁꽁)","footprint (발자국)","warm bread (붕어빵)","hand warmer (손난로)","quiet (고요한)","dancing (춤추는)","blanket (이불)","icicle (고드름)","snowflake (눈송이)","warm (따뜻한)","red nose (빨간코)","snowman (눈사람)","cozy (으쓱)"],
  mom: ["warm (따뜻한)","embrace (품)","nagging (잔소리)","scent (향기)","dinner (저녁밥)","smile (웃음)","shadow (그림자)","umbrella (우산)","waiting (기다림)","love (사랑)","touch (손길)","lullaby (자장가)","hug (포옹)","worry (걱정)","miss (보고싶은)","tears (눈물)","warmth (온기)","gentle (다정한)","comfort (위로)"],
  family: ["laughter (웃음소리)","together (함께)","dinner table (저녁식탁)","argue (다투다)","make up (화해)","missing (그리운)","share (나누다)","photo (사진)","travel (여행)","memory (추억)","root (뿌리)","rely (의지하다)","sturdy (든든한)","happiness (행복)"],
  school: ["bell (종소리)","noisy (우당탕탕)","chat (수다)","eraser (지우개)","blackboard (칠판)","break time (쉬는시간)","pencil (연필)","desk partner (짝꿍)","excitement (설렘)","lunch (급식)","playground (운동장)","teacher (선생님)","friend (친구)","class (수업)","test (시험)"],
  ocean: ["wave (파도)","shell (조개)","seagull (갈매기)","horizon (수평선)","salty (소금기)","blue (파란)","sparkling (반짝이는)","foam (물거품)","lighthouse (등대)","seaweed (해초)","whale (고래)","dolphin (돌고래)","deep sea (심해)","sand (모래)","sunset (노을)"],
  dream: ["starlight (별빛)","sparkling (반짝이는)","wish (소원)","wings (날개)","sky (하늘)","soft (부드러운)","courage (용기)","fly away (날아가다)","possibility (가능성)","hope (희망)","shining (빛나는)","freedom (자유)","awaken (깨어나다)","imagine (상상)","miracle (기적)","dazzling (눈부신)"],
  friend: ["mischievous (장난꾸러기)","laughter (웃음)","argue (다투다)","reconcile (화해)","secret (비밀)","share (나누다)","together (함께)","comfort (위로)","hold hands (손잡다)","missing (그리운)","memory (추억)","run around (뛰어다니다)","shy (쑥스러운)","gentle (다정한)"],
};
// 영어 기본 단어 뱅크 (한글 뜻 병기)
const POEM_DEFAULT_WORDS_EN = [
  "starlight (별빛)","longing (그리움)","universe (우주)","secret (비밀)","whisper (속삭임)",
  "magic (마법)","memory (기억)","sweet (달콤한)","sparkling (반짝이는)","journey (여행)",
  "dream (꿈)","melody (노래)","cloud (구름)","transparent (투명한)","breeze (바람)",
  "thrill (설렘)","miracle (기적)","warmth (온기)","dance (춤)","light (빛)"
];

/* ══════════════════════════════════════════════
   파트 2 추가: 영문 미션 배열 (한글 뜻 병기)
   DIARY_MISSIONS 배열과 1:1 대응
══════════════════════════════════════════════ */
const DIARY_MISSIONS_EN = [
  { id: 'm1',  title: 'Color Hunter 🎨',         desc: 'Find 3 pretty colors you saw today. Write each color and why it was beautiful.',                   aiRule: 'Check if text mentions at least 3 colors and reasons.' },
  { id: 'm2',  title: 'Sound Collector 🎧',       desc: 'Close your eyes for 1 minute and list every sound you hear. If those sounds had a color, what would it be?', aiRule: 'Check if text lists sounds heard and associates a color with them.' },
  { id: 'm3',  title: 'Taste Columnist 😋',       desc: 'Describe the best food you ate today in as much detail as possible!',                            aiRule: 'Check if there is a highly detailed description of taste/food.' },
  { id: 'm4',  title: 'Object Secret 🗝️',        desc: 'Find the oldest object in your room. Imagine its backstory — where did it come from?',            aiRule: 'Check if user imagines a backstory for an old object.' },
  { id: 'm5',  title: 'Animal Documentary 🐹',   desc: 'Write a 10-minute observation report about an animal near you.',                                  aiRule: 'Check if there is a detailed observation of an animal.' },
  { id: 'm6',  title: 'Weather Translator ☁️',   desc: 'Describe today\'s weather using smell or touch (e.g., a fluffy-smelling breeze).',                aiRule: 'Check if weather is described using smell or touch senses.' },
  { id: 'm7',  title: 'Plant Explorer 🌿',        desc: 'Describe the appearance of an unknown plant or flower you passed by today.',                      aiRule: 'Check if there is a visual description of a plant or flower.' },
  { id: 'm8',  title: 'Cloud Theater ☁️',         desc: 'Watch cloud shapes and make up a story about what you see.',                                     aiRule: 'Check if user creates a story based on cloud shapes.' },
  { id: 'm9',  title: 'Sound Detective 🕵️',      desc: 'Describe your family members using only their footsteps or voice — who are they?',               aiRule: 'Check if family members are described using only sound/voice traits.' },
  { id: 'm10', title: 'Eraser\'s Point of View ✏️', desc: 'Write today from the eraser\'s point of view on your desk.',                                 aiRule: 'Check if diary is written from the perspective of an eraser.' },
  { id: 'm11', title: 'Time Slip ⏱️',            desc: 'If you rode a time machine to ancient times, what is the very first thing you would do?',        aiRule: 'Check if user imagines doing something in a past historical era.' },
  { id: 'm12', title: 'Billionaire 💰',           desc: 'If you suddenly had 10 million dollars, write a detailed plan for how you would spend it!',      aiRule: 'Check if user plans how to spend a large fictional amount of money.' },
  { id: 'm13', title: 'Principal for a Day 🏫',  desc: 'List 3 rules you would make if you were principal of your school.',                              aiRule: 'Check if user lists 3 new school rules as a principal.' },
  { id: 'm14', title: 'Invisible Person 👻',      desc: 'If you were invisible for today, where would you go and what would you do?',                     aiRule: 'Check if user imagines actions as an invisible person.' },
  { id: 'm15', title: 'Alien Guide 👽',           desc: 'If an alien visited your home, which object would you introduce first and why?',                  aiRule: 'Check if user explains a household object to an alien.' },
  { id: 'm16', title: 'Into the Game 🎲',         desc: 'If you became a character or obstacle in a game, what would you be?',                            aiRule: 'Check if user imagines themselves inside a board game.' },
  { id: 'm17', title: 'Animal Translator 🐕',     desc: 'If you could talk to animals, what is the very first question you would ask?',                   aiRule: 'Check if user writes a question they would ask an animal.' },
  { id: 'm18', title: 'Last Supper 🍽️',          desc: 'If the world ended tomorrow, what would you eat for dinner tonight?',                            aiRule: 'Check if user chooses a final meal before the end of the world.' },
  { id: 'm19', title: 'Teleportation 🚀',         desc: 'If you could fly or teleport, where would you go right now? Why?',                               aiRule: 'Check if user imagines teleporting to a specific place with a reason.' },
  { id: 'm20', title: 'Letter to Future Me ✉️',  desc: 'Write a short letter to yourself 20 years in the future.',                                       aiRule: 'Check if user writes a letter to their future self.' },
  { id: 'm21', title: 'Laugh Button 😂',          desc: 'What made you laugh the hardest today?',                                                         aiRule: 'Check if user describes a funny event that made them laugh.' },
  { id: 'm22', title: 'Anger Alert 😡',           desc: 'What has been making you the most angry or frustrated lately?',                                  aiRule: 'Check if user describes something that makes them angry or annoyed.' },
  { id: 'm23', title: 'Cringe Moment 😳',         desc: 'Write about your most embarrassing moment recently and how you honestly felt.',                   aiRule: 'Check if user describes an embarrassing moment and their feelings.' },
  { id: 'm24', title: 'My Own Dictionary 📖',     desc: 'Define "happiness" in your own words.',                                                          aiRule: 'Check if user provides their own definition of happiness.' },
  { id: 'm25', title: 'Compliment Shower 🚿',     desc: 'Write in detail how you feel when someone compliments you.',                                     aiRule: 'Check if user describes the feeling of being complimented.' },
  { id: 'm26', title: 'Boredom Escape 🥱',        desc: 'When was the most boring moment of your day today and why?',                                     aiRule: 'Check if user describes a boring moment and explains why.' },
  { id: 'm27', title: 'Fear Report 😱',           desc: 'What is your biggest fear? Try to analyze exactly why.',                                         aiRule: 'Check if user explains their biggest fear and reasons.' },
  { id: 'm28', title: 'One Teardrop 😢',          desc: 'Write about a moment that almost made you cry or a sad movie scene.',                            aiRule: 'Check if user describes a sad moment or sad movie.' },
  { id: 'm29', title: 'Green with Envy 😒',       desc: 'Honestly confess a time you felt a little jealous. Your diary is safe!',                        aiRule: 'Check if user confesses a moment of jealousy.' },
  { id: 'm30', title: 'Emotion Weather Report ⚡', desc: 'Describe your mood today using weather (sunny, cloudy, stormy...).',                            aiRule: 'Check if user uses weather metaphors to describe their mood.' },
  { id: 'm31', title: 'Parent Interview 🎤',      desc: 'Ask your mom or dad what they wanted to be when they were young. Write it down!',                aiRule: 'Check if user writes about their parents childhood dreams.' },
  { id: 'm32', title: 'Family Constitution 📜',   desc: 'What are the special rules or funny habits in your family?',                                     aiRule: 'Check if user describes a unique family rule or habit.' },
  { id: 'm33', title: 'Compliment Relay 🤝',      desc: 'Find 3 strengths of your best friend and write them down.',                                      aiRule: 'Check if user lists 3 strengths of a friend.' },
  { id: 'm34', title: 'Secret Letter 💌',         desc: 'Write something to your parents you have been too shy to say — thank you or I\'m sorry.',       aiRule: 'Check if user writes a heartfelt message to parents.' },
  { id: 'm35', title: 'Dream Friend 🙋',          desc: 'Who do you most want to become friends with, and why?',                                          aiRule: 'Check if user mentions someone they want to befriend and why.' },
  { id: 'm36', title: 'Memory Trip ✈️',           desc: 'Write about the most memorable trip you took with your family.',                                 aiRule: 'Check if user recounts a memorable family trip.' },
  { id: 'm37', title: 'Future Parent 👨‍👩‍👧',        desc: 'If you became a parent someday, what kind of parent do you want to be?',                        aiRule: 'Check if user imagines what kind of parent they want to be.' },
  { id: 'm38', title: 'Make-Up Skills 🤝',        desc: 'What is your personal tip for making up with a friend after a fight?',                           aiRule: 'Check if user shares a personal tip for reconciling with friends.' },
  { id: 'm39', title: 'My Hero 🌟',               desc: 'What is one thing you most want to learn from a parent or adult you admire?',                    aiRule: 'Check if user specifies one trait they want to learn from an adult.' },
  { id: 'm40', title: 'Class News 📰',            desc: 'Report the funniest or most surprising event that happened in class today.',                     aiRule: 'Check if user reports a funny/absurd event from class.' },
  { id: 'm41', title: 'Five-Word Summary ✋',     desc: 'Summarize your whole day in exactly 5 words, then explain why.',                                 aiRule: 'Check if user summarizes their day in exactly 5 characters before explaining.' },
  { id: 'm42', title: 'Mind Map Diary 🧠',        desc: 'Organize everything you did today as a mind map (in text form).',                                aiRule: 'Check if text is structured like a mindmap (keywords and branches).' },
  { id: 'm43', title: 'Movie Poster 🎬',          desc: 'Give your day a movie title and write a short synopsis.',                                        aiRule: 'Check if user creates a movie title and synopsis for their day.' },
  { id: 'm44', title: 'Digital Detox 📵',         desc: 'Challenge: stay away from your phone for 1 hour. Write your review!',                           aiRule: 'Check if user writes about spending time without a smartphone.' },
  { id: 'm45', title: 'My Invention 💡',           desc: 'If you were an inventor, describe the machine you would most want to create.',                   aiRule: 'Check if user writes a manual/description for an imagined invention.' },
  { id: 'm46', title: 'Forced Kindness 😇',       desc: 'Find 3 good things you did today — even if you have to stretch it a little!',                   aiRule: 'Check if user forces themselves to list 3 good deeds they did.' },
  { id: 'm47', title: '4-Panel Comic 🖼️',         desc: 'Divide your day into 4 scenes and write each one like a comic panel.',                          aiRule: 'Check if diary is divided into 4 distinct scenes/panels.' },
  { id: 'm48', title: 'Advertise Yourself 📢',    desc: 'Write a short advertisement promoting yourself to the world!',                                   aiRule: 'Check if user writes an advertisement copy promoting themselves.' },
  { id: 'm49', title: 'Screen Time Report 📱',    desc: 'Check your screen time and honestly evaluate your smartphone habits.',                           aiRule: 'Check if user evaluates their screen time and smartphone habits.' },
  { id: 'm50', title: 'Tomorrow\'s Script 📝',    desc: 'Write what you wish would happen tomorrow — like a movie script!',                              aiRule: 'Check if user writes their wishes for tomorrow in a script format.' }
];

let dodumCurrentWordA='', dodumCurrentWordB='', dodumIsSpinning=false;

async function dodumSpinWords(){
  if(dodumIsSpinning) return;
  dodumIsSpinning=true;
  const dodumWordInputSection=$('dodumWordInputSection');
  const dodumWordFeedback=$('dodumWordFeedback');
  if(dodumWordInputSection) dodumWordInputSection.style.display='none';
  if(dodumWordFeedback){ dodumWordFeedback.style.display='none'; }
  const inputEl=$('dodumPoemInput'); if(inputEl) inputEl.value='';
  const slotA=$('slotWordA'), slotB=$('slotWordB');
  if(!slotA||!slotB){ dodumIsSpinning=false; return; }
  // 슬롯머신 효과
  for(let i=0;i<15;i++){
    /* 파트 2: 영어 모드일 때 영어 배열 사용 */
    if(_currentLang==='en'){
      slotA.textContent=DODUM_BANK_A_EN[Math.floor(Math.random()*DODUM_BANK_A_EN.length)];
      slotB.textContent=DODUM_BANK_B_EN[Math.floor(Math.random()*DODUM_BANK_B_EN.length)];
    } else {
      slotA.textContent=DODUM_BANK_A[Math.floor(Math.random()*DODUM_BANK_A.length)];
      slotB.textContent=DODUM_BANK_B[Math.floor(Math.random()*DODUM_BANK_B.length)];
    }
    await new Promise(r=>setTimeout(r,60));
  }
  /* 파트 2: 영어 모드 최종 단어 뽑기 */
  if(_currentLang==='en'){
    dodumCurrentWordA=DODUM_BANK_A_EN[Math.floor(Math.random()*DODUM_BANK_A_EN.length)];
    dodumCurrentWordB=DODUM_BANK_B_EN[Math.floor(Math.random()*DODUM_BANK_B_EN.length)];
  } else {
    dodumCurrentWordA=DODUM_BANK_A[Math.floor(Math.random()*DODUM_BANK_A.length)];
    dodumCurrentWordB=DODUM_BANK_B[Math.floor(Math.random()*DODUM_BANK_B.length)];
  }
  slotA.textContent=dodumCurrentWordA;
  slotB.textContent=dodumCurrentWordB;
  const drawBtn=$('dodumDrawBtn'); if(drawBtn) drawBtn.textContent='다시 뽑기 🎲';
  if(dodumWordInputSection) dodumWordInputSection.style.display='block';
  const poemInput=$('dodumPoemInput'); if(poemInput) poemInput.focus();
  dodumIsSpinning=false;
}

async function dodumCheckPoem(){
  const text=$('dodumPoemInput').value.trim();
  const feedbackEl=$('dodumWordFeedback');
  if(!feedbackEl) return;
  if(text.length<5){
    feedbackEl.style.cssText='display:block;background:#fff5f5;border:2px solid #ff8e8b;color:#d64542;padding:14px;border-radius:12px;font-size:14px;animation:fadeIn 0.5s;line-height:1.6;margin-top:14px;';
    feedbackEl.innerHTML='😅 문장이 너무 짧아요. 조금 더 길게 상상력을 발휘해 볼까요?';
    return;
  }
  /* 파트 2: 영어 모드에서 단어 포함 여부는 괄호 앞 실제 영어 단어만 체크 */
  const _extractWord = (w) => w.includes('(') ? w.split('(')[0].trim() : w;
  const wordA_check = _extractWord(dodumCurrentWordA);
  const wordB_check = _extractWord(dodumCurrentWordB);
  const hasA=text.toLowerCase().includes(wordA_check.toLowerCase());
  const hasB=text.toLowerCase().includes(wordB_check.toLowerCase());
  if(!hasA||!hasB){
    feedbackEl.style.cssText='display:block;background:#fff5f5;border:2px solid #ff8e8b;color:#d64542;padding:14px;border-radius:12px;font-size:14px;animation:fadeIn 0.5s;line-height:1.6;margin-top:14px;';
    const missing=!hasA?wordA_check:wordB_check;
    feedbackEl.innerHTML=`🤔 아쉽게도 <b>'${missing}'</b>이(가) 빠졌어요. 두 단어를 모두 사용해서 문장을 이어주세요!`;
    return;
  }
  // AI 비유 적절성 판단 /* 파트 4 수정: 돋움 단어자판기 피드백 영문화 + voca */
  const _isEnWord = _currentLang === 'en';
  feedbackEl.style.cssText='display:block;background:#eaf6f4;border:2px solid #62b3a4;color:#2b7a6b;padding:14px;border-radius:12px;font-size:14px;line-height:1.6;margin-top:14px;';
  feedbackEl.innerHTML = _isEnWord ? '🤔 Teacher is reading your poem... ✨' : '🤔 선생님이 읽고 있어요... ✨';
  try{
    const raw=await callClaude({
      model:'claude-haiku-4-5-20251001',max_tokens:300,
      system: _isEnWord
        ? `You are a warm poetry teacher for Korean elementary students.
A student used '${dodumCurrentWordA}' and '${dodumCurrentWordB}' in a one-line poem.
Evaluate: (1) creative connection between words, (2) poetic feeling, (3) naturalness.
Return ONLY valid JSON:
{"isGood":<true/false>,"feedback":"<2 sentences bilingual praise or advice>","tip":"<1 sentence bilingual hint>","voca":"<1-2 useful words from your feedback: word (한국어뜻)>"}`
        : `너는 초등학생 시 쓰기를 가르치는 다정한 선생님이야.
학생이 '${dodumCurrentWordA}'와 '${dodumCurrentWordB}'를 사용해서 쓴 한 줄 시를 읽고 피드백을 줘야 해.
다음 기준으로 평가해줘: 1.두 단어 창의적 연결 2.시적 느낌 3.자연스러움
반드시 JSON으로만 답해:
{"isGood":<true/false>,"feedback":"<구체적 칭찬 또는 조언 2문장>","tip":"<1문장 힌트>","voca":"<피드백에 쓴 영단어 1~2개: word (뜻)>"}`,
      messages:[{role:'user',content: _isEnWord
        ? `Student's poem: "${text}"\nWord A: ${dodumCurrentWordA}, Word B: ${dodumCurrentWordB}`
        : `학생의 시: "${text}"\n단어A: ${dodumCurrentWordA}, 단어B: ${dodumCurrentWordB}`}]
    });
    const d=parseJSON(raw)||{isGood:true,feedback: _isEnWord?'Great poem!':'멋진 시예요!',tip:'',voca:''};
    const vocaHtml=(d.voca&&d.voca.trim())?`<div style="margin-top:6px;padding:5px 10px;background:#f0f7ff;border-left:3px solid #4a90e2;border-radius:8px;font-size:11px;color:#2a5a8a;">💡 <b>${_isEnWord?"Today's Words:":"오늘의 단어:"}</b> ${d.voca}</div>`:'';
    if(d.isGood){
      feedbackEl.style.cssText='display:block;background:#eaf6f4;border:2px solid #62b3a4;color:#2b7a6b;padding:14px;border-radius:12px;font-size:14px;animation:fadeIn 0.5s;line-height:1.6;margin-top:14px;';
      feedbackEl.innerHTML=_isEnWord
        ?`<div style="font-weight:bold;margin-bottom:6px;">👩‍🏫 Teacher's Comment:</div>
          Wow! <b>'${dodumCurrentWordA}'</b> + <b>'${dodumCurrentWordB}'</b> = a beautiful poem!<br>
          ${d.feedback}<br>
          ${d.tip?`<div style="margin-top:6px;padding:6px 10px;background:rgba(255,255,255,0.6);border-radius:8px;font-size:13px;">💡 ${d.tip}</div>`:''}
          ${vocaHtml}`
        :`<div style="font-weight:bold;margin-bottom:6px;">👩‍🏫 선생님의 감상평:</div>
          우와! <b>'${dodumCurrentWordA}'</b>와 <b>'${dodumCurrentWordB}'</b>가 만나니 정말 시적인 표현이 탄생했네요!<br>
          ${d.feedback}<br>
          ${d.tip?`<div style="margin-top:6px;padding:6px 10px;background:rgba(255,255,255,0.6);border-radius:8px;font-size:13px;">💡 ${d.tip}</div>`:''}
          ${vocaHtml}`;
    } else {
      feedbackEl.style.cssText='display:block;background:#fff8ec;border:2px solid #e8a44a;color:#7a5a1a;padding:14px;border-radius:12px;font-size:14px;animation:fadeIn 0.5s;line-height:1.6;margin-top:14px;';
      feedbackEl.innerHTML=_isEnWord
        ?`<div style="font-weight:bold;margin-bottom:6px;">👩‍🏫 Let's try again!</div>
          ${d.feedback}<br>
          ${d.tip?`<div style="margin-top:6px;padding:6px 10px;background:rgba(255,255,255,0.6);border-radius:8px;font-size:13px;">💡 Hint: ${d.tip}</div>`:''}
          ${vocaHtml}`
        :`<div style="font-weight:bold;margin-bottom:6px;">👩‍🏫 조금 더 해봐요!</div>
          ${d.feedback}<br>
          ${d.tip?`<div style="margin-top:6px;padding:6px 10px;background:rgba(255,255,255,0.6);border-radius:8px;font-size:13px;">💡 힌트: ${d.tip}</div>`:''}
          ${vocaHtml}`;
    }
  }catch(e){
    feedbackEl.innerHTML=_currentLang==='en'
      ?`<div style="font-weight:bold;margin-bottom:6px;">👩‍🏫 Teacher's Comment:</div>
         Wow! <b>'${dodumCurrentWordA}'</b> and <b>'${dodumCurrentWordB}'</b> made a magical sentence! 🎨`
      :`<div style="font-weight:bold;margin-bottom:6px;">👩‍🏫 선생님의 감상평:</div>
         우와! <b>'${dodumCurrentWordA}'</b>와 <b>'${dodumCurrentWordB}'</b>가 만나니 정말 마법 같은 문장이 탄생했네요! 🎨`;
  }
}

/* ═══════════════════════════════════════════════
   돋움: 시어 출력기 + 비유 징검다리
═══════════════════════════════════════════════ */
// 주제별 확장 단어 뱅크
const POEM_WORD_BANKS = {
  봄: ["새싹","아지랑이","간지러운","분홍빛","살랑살랑","꽃가루","하품","포근한","시작","민들레","진달래","나비","개나리","벚꽃","봄비","흙냄새","나른한","설레는","연두색","싹트다"],
  여름: ["파도","매미","눈부신","땀방울","수박","풍덩","푸른","아이스크림","소나기","그늘","번쩍","천둥","열기","모래사장","반짝이는","시원한","헤엄치다","뭉게구름","해바라기","무더운"],
  가을: ["단풍","바스락","쓸쓸한","높은","허수아비","도토리","귀뚜라미","노을","바람","낙엽","빨간","감","하늘","청명한","서늘한","추수","갈대","호박","기러기","황금빛"],
  겨울: ["입김","포근한","새하얀","꽁꽁","발자국","붕어빵","손난로","고요한","춤추는","이불","고드름","눈송이","따뜻한","빨간코","동치미","김이모락","솜사탕","크리스마스","눈사람","으쓱"],
  엄마: ["따뜻한","품","잔소리","향기","저녁밥","웃음","그림자","우산","기다림","사랑","손길","자장가","포옹","걱정","보고싶은","눈물","온기","다정한","위로","그리운"],
  가족: ["웃음소리","함께","저녁식탁","다투다","화해","그리운","나누다","사진","여행","추억","팔짱","담요","도란도란","보글보글","북적이는","진심","뿌리","의지하다","든든한","행복"],
  학교: ["종소리","우당탕탕","수다","지우개","칠판","쉬는시간","맛있는","연필","짝꿍","설렘","급식","운동장","복도","선생님","친구","도시락","수업","발표","시험","방과후"],
  바다: ["파도","조개","갈매기","수평선","소금기","파란","반짝이는","물거품","항구","등대","물결","해초","고래","돌고래","심해","넘실거리다","출렁이다","모래","조약돌","노을"],
  꿈: ["별빛","반짝이는","소원","날개","하늘","부드러운","용기","날아가다","가능성","희망","빛나는","무한한","자유","깨어나다","잠들다","상상","기적","설레는","눈부신","이루다"],
  친구: ["장난꾸러기","웃음","다투다","화해","비밀","나누다","함께","위로","손잡다","그리운","추억","운동장","뛰어다니다","싸우다","토라지다","금방","장난","쑥스러운","다정한","끈적한"],
};
// 기본 단어 뱅크
const POEM_DEFAULT_WORDS = ["별빛","그리움","우주","비밀","속삭임","마법","기억","달콤한","반짝이는","여행","꿈","노래","구름","투명한","바람","설렘","기적","온기","춤","빛"];

async function dodumGetPoeticWords(){
  const themeInput=$('poemThemeInput');
  const container=$('poemWordContainer');
  const btn=$('poemDrawBtn');
  const theme=(themeInput?themeInput.value.trim():'');
  if(!theme){ toast(_currentLang==='en' ? 'Please enter a theme! (e.g. spring, ocean, dream)' : '주제를 먼저 입력해주세요! (예: 여름, 엄마)'); if(themeInput) themeInput.focus(); return; }
  if(btn){ btn.disabled=true; btn.textContent=_currentLang==='en' ? 'Loading...' : '로딩중..'; }
  if(container) container.innerHTML=`<div style="width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:120px;color:#8a7ce8;"><div style="font-size:28px;animation:spin 1s linear infinite;margin-bottom:8px;">⏳</div><p style="margin:0;font-size:14px;">${_currentLang==='en' ? 'AI is picking words for you...' : 'AI가 단어를 고르는 중...'}</p></div>`;
  
  await new Promise(r=>setTimeout(r,300));

  /* 파트 2: 영어 모드 — POEM_WORD_BANKS_EN에서 주제 매칭 */
  let words=null;
  if(_currentLang==='en'){
    const themeMap={
      spring:['spring','스프링'],'summer':['summer','여름','sun','beach'],
      autumn:['autumn','fall','가을'],winter:['winter','snow','겨울'],
      mom:['mom','mother','엄마','어머니'],family:['family','가족'],
      school:['school','학교'],ocean:['ocean','sea','바다'],
      dream:['dream','꿈'],friend:['friend','친구']
    };
    for(const [bankKey, keywords] of Object.entries(themeMap)){
      if(keywords.some(k=>theme.toLowerCase().includes(k))){
        const bank=POEM_WORD_BANKS_EN[bankKey];
        if(bank){ words=[...bank].sort(()=>0.5-Math.random()).slice(0,15); break; }
      }
    }
    // 없으면 AI로 생성
    if(!words){
      try{
        const raw=await callClaude({
          model:'claude-haiku-4-5-20251001',max_tokens:250,
          system:`You are a bilingual poetry teacher for Korean elementary school students.
Generate 15 poetic words related to the given theme.
Each word must be in English with Korean meaning in parentheses.
Mix nouns, adjectives, and verbs.
Return ONLY valid JSON: {"words":["word1 (뜻1)","word2 (뜻2)",...]}`,
          messages:[{role:'user',content:`Theme: ${theme}`}]
        });
        const d=parseJSON(raw);
        if(d&&d.words&&d.words.length>0) words=d.words;
      }catch(e){}
    }
    if(!words||words.length===0) words=[...POEM_DEFAULT_WORDS_EN].sort(()=>0.5-Math.random()).slice(0,15);
  } else {
    // 한국어: 먼저 코딩된 단어로 찾기
    for(const [key,bank] of Object.entries(POEM_WORD_BANKS)){
      if(theme.includes(key)){ words=[...bank].sort(()=>0.5-Math.random()).slice(0,15); break; }
    }
  
    // 한국어: 없으면 AI로 단어 생성
    if(!words){
      try{
        const raw=await callClaude({
          model:'claude-haiku-4-5-20251001',max_tokens:200,
          system:`너는 초등학생 시 쓰기 선생님이야. 주어진 주제에 어울리는 시어(시 쓰기에 좋은 단어)를 15개 뽑아줘.
단어는 한국어로, 명사·형용사·동사 골고루, 감각적이고 시적인 단어로 골라줘.
반드시 JSON으로만 답해: {"words":["단어1","단어2",...]}`,
          messages:[{role:'user',content:`주제: ${theme}`}]
        });
        const d=parseJSON(raw);
        if(d&&d.words&&d.words.length>0) words=d.words;
      }catch(e){}
    }
    // 최후 fallback
    if(!words||words.length===0) words=[...POEM_DEFAULT_WORDS].sort(()=>0.5-Math.random()).slice(0,15);
  } // end else (한국어)

  if(container){
    container.innerHTML='';
    words.forEach((word,index)=>{
      const span=document.createElement('span');
      span.style.cssText=`cursor:pointer;transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1);background:white;border:2px solid #8a7ce8;padding:7px 14px;border-radius:18px;font-size:16px;color:#6a5cc8;box-shadow:0 3px 6px rgba(138,124,232,0.2);display:inline-block;animation:popIn 0.4s ease ${index*0.04}s both;`;
      span.textContent=word;
      span.addEventListener('mouseover',()=>{span.style.transform='scale(1.1) translateY(-3px)';span.style.background='#f3f0ff';});
      span.addEventListener('mouseout',()=>{span.style.transform='';span.style.background='white';});
      span.addEventListener('click',()=>{
        // 비유 징검다리 입력창에 단어 삽입
        const chatInput=$('poemChatInput');
        /* 파트 2: 영어 모드는 "word like" 형태로 삽입 */
        const pureWord = _currentLang==='en'
          ? (word.includes('(') ? word.split('(')[0].trim() : word)
          : word;
        const insertTxt = _currentLang==='en' ? pureWord+' like' : pureWord+'처럼';
        if(chatInput){ chatInput.value=insertTxt; chatInput.focus(); }
        toast(_currentLang==='en'
          ? `💜 '${pureWord}' selected! Use it in the Metaphor Bridge.`
          : `💜 '${word}' 를 선택했어요! 비유 징검다리에서 활용해봐요.`);
      });
      container.appendChild(span);
    });
  }
  if(themeInput) themeInput.value='';
  if(btn){ btn.disabled=false; btn.textContent='뽑기 🎲'; }
}

// 비유 징검다리 채팅 (AI 기반)
let poemChatHistory=[];
function resetPoemChat(){
  poemChatHistory=[];
  const display=$('poemChatDisplay');
  if(display) display.innerHTML=`<div style="max-width:85%;padding:9px 14px;border-radius:16px;font-size:14px;line-height:1.5;background:#e0d8ff;color:#4a3e9c;">안녕! 네 생각을 멋진 비유로 바꿔줄게. 다시 처음부터 해보자! 지금 어떤 기분이거나 무슨 생각이 드니?</div>`;
}

async function sendPoemChat(){
  const input=$('poemChatInput');
  const display=$('poemChatDisplay');
  const btn=$('poemChatBtn');
  if(!input||!display||!btn) return;
  const text=input.value.trim(); if(!text) return;
  // ⑤ 비속어 필터
  if(!checkProfanity(text,'입력창')) return;
  // 사용자 메시지 추가
  const userBubble=document.createElement('div');
  userBubble.style.cssText='max-width:85%;padding:9px 14px;border-radius:16px;font-size:14px;line-height:1.5;background:white;border:2px solid #8a7ce8;align-self:flex-end;margin-left:auto;word-break:keep-all;';
  userBubble.textContent=text;
  display.appendChild(userBubble);
  input.value=''; display.scrollTop=display.scrollHeight;
  btn.disabled=true;
  // 로딩
  const loadId='pc_load_'+Date.now();
  const loadBubble=document.createElement('div');
  loadBubble.id=loadId;
  loadBubble.style.cssText='max-width:85%;padding:9px 14px;border-radius:16px;font-size:14px;background:#e0d8ff;color:#aaa;';
  loadBubble.textContent='생각 중... 💭';
  display.appendChild(loadBubble); display.scrollTop=display.scrollHeight;
  // 대화 히스토리에 추가
  poemChatHistory.push({role:'user',content:text});
  try{
    const raw=await callClaude({
      model:'claude-haiku-4-5-20251001',max_tokens:250,
      system:`너는 초등학생이 시적인 비유 표현을 만들 수 있도록 도와주는 다정한 선생님이야.
학생의 감정이나 생각을 단계적으로 시적인 비유로 바꿀 수 있도록 대화로 이끌어줘.

대화 방식:
1단계: 학생의 감정/상황을 파악하고, "색깔/날씨/동물/소리" 중 하나로 빗대어 볼 것을 제안
2단계: 학생의 비유에서 더 구체적인 이미지를 끌어냄
3단계: "내 마음은 [   ]이다" 형식의 완성된 은유 문장 만들기
4단계: 칭찬하고 시 원고지에 쓰도록 독려

응답은 반드시 한국어로, 80자 이내로, 질문 1개만 포함해서 답해줘.
초등학생이 이해할 수 있는 쉬운 말로 써줘.`,
      messages:poemChatHistory
    });
    const loadEl=document.getElementById(loadId); if(loadEl) loadEl.remove();
    poemChatHistory.push({role:'assistant',content:raw});
    const aiBubble=document.createElement('div');
    aiBubble.style.cssText='max-width:85%;padding:9px 14px;border-radius:16px;font-size:14px;line-height:1.55;background:#e0d8ff;color:#4a3e9c;word-break:keep-all;';
    aiBubble.innerHTML=raw;
    display.appendChild(aiBubble); display.scrollTop=display.scrollHeight;
  }catch(e){
    const loadEl=document.getElementById(loadId); if(loadEl) loadEl.remove();
    const errBubble=document.createElement('div');
    errBubble.style.cssText='max-width:85%;padding:9px 14px;border-radius:16px;font-size:14px;background:#e0d8ff;color:#4a3e9c;';
    errBubble.textContent='잠깐 생각이 막혔어요 😅 다시 말해줄래?';
    display.appendChild(errBubble); display.scrollTop=display.scrollHeight;
  }
  btn.disabled=false; input.focus();
}

// 엔터키 지원
document.addEventListener('DOMContentLoaded',()=>{
  const pci=$('poemChatInput');
  if(pci) pci.addEventListener('keypress',e=>{ if(e.key==='Enter') sendPoemChat(); });
  const pti=$('poemThemeInput');
  if(pti) pti.addEventListener('keypress',e=>{ if(e.key==='Enter') dodumGetPoeticWords(); });
});

