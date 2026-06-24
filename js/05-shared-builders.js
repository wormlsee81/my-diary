/* ============================================================
 * 공용 출력 빌더(에러표시 · 진행바 · 프롬프트 워크숍 · 인쇄 HTML 생성)
 * (분할 자동 생성 — 원본 index.html에서 추출, 로드 순서 유지 필수)
 * ============================================================ */
function showDiaryError(t,d){$('errorTitle').textContent=t;$('errorDetail').textContent=d;$('errorOverlay').style.display='flex';}
function hideDiaryError(){$('errorOverlay').style.display='none';}
function startProgress(from,to,dur){
  clearInterval(progTimer);const el=$('progressFill'),lbl=$('progressLabel');
  const steps=40,ms=dur/steps,sv=(to-from)/steps;let cur=from;
  progTimer=setInterval(()=>{cur+=sv;if(cur>=to){cur=to;clearInterval(progTimer);}el.style.width=`${cur}%`;lbl.textContent=`${Math.round(cur)}%`;},ms);
}

async function generateImage(){
  const text=$('diary').value.trim();if(!text){toast('일기를 먼저 써보세요!');return;}
  const btn=$('genBtn');hideDiaryError();btn.disabled=true;
  $('dLoading').style.display='flex';clearInterval(progTimer);
  $('progressFill').style.width='0%';$('progressLabel').textContent='0%';
  startProgress(0,50,5000);
  try{
    $('loadingMsg').textContent='일기 분석 중...';
    const a=await analyzeDiary(text);
    curRich=a.richness;curAdvice=a.advice;curMissionScore=a.missionScore;
    curEmpathy=a.empathy||'';curGoodExpression=a.goodExpression||'';curNextChallenge=a.nextChallenge||'';
    curExprAdvice=a.exprAdvice||'';curContentAdvice=a.contentAdvice||'';curSpellingAdvice=a.spellingAdvice||'';curVoca=a.voca||''; /* 파트 4 */
    $('richnessFill').style.width=`${a.richness*10}%`;$('richnessScore').textContent=`살아있는 표현 ${a.richness}/10`;
    updateStamp(a.richness);updateQualityBadge(a.richness);
    setTeacher('advice',a.advice,a.goodExpression,a.nextChallenge,a.exprAdvice,a.contentAdvice,a.empathy,a.spellingAdvice,a.voca||'');
    if(a.title)$('imgTitle').textContent=`[ ${a.title} ]`;
    startProgress(50,95,a.richness>=7?20000:10000);
    $('loadingMsg').textContent='그림 그리는 중...';

    // ✅ imagePrompt 없으면 일기 전체에서 핵심 장면을 추출해 프롬프트 생성
    let imagePrompt = '';
    if (a.imagePrompt && a.imagePrompt.trim()) {
      imagePrompt = a.imagePrompt;
    } else {
      // 일기 전체를 기반으로 가장 생생한 장면 묘사 추출 (앞부분만 자르지 않음)
      const fullDiary = text.replace(/[\n\r]+/g, ' ').trim();
      // 일기가 길면 중간~끝 부분도 포함해 핵심 장면 포착
      const excerpt = fullDiary.length > 300
        ? fullDiary.slice(0, 150) + ' ... ' + fullDiary.slice(-150)
        : fullDiary;
      imagePrompt = `Children's picture book illustration of the most vivid scene from this Korean diary: "${excerpt}". Show the key emotional moment, specific character and setting. Soft watercolor art, Korean picture book style, warm colors, no text, no letters, no numbers.`;
    }
    const b64=await generateDalle(imagePrompt, a.richness, msg=>{$('loadingMsg').textContent=msg;});
    curImgB64=b64;
    clearInterval(progTimer);$('progressFill').style.width='100%';$('progressLabel').textContent='100%';
    await sleep(200);
    $('dLoading').style.display='none';$('placeholder').style.display='none';
    $('imgMain').src=b64;$('imgMain').style.display='block';
    $('richnessBadge').textContent=`🎨 살아있는 표현 ${a.richness}/10`;$('richnessBadge').style.display='block';
    $('missionFill').style.width=`${curMissionScore*10}%`;
    $('missionScoreText').textContent=missionDrawn&&currentMission?`${curMissionScore}/10`:'— 대기중';
    await checkLocalBadges(text, curRich, curMissionScore);
    toast('그림일기 완성! 🎉');
  }catch(err){
    clearInterval(progTimer);$('dLoading').style.display='none';
    if(curImgB64){$('placeholder').style.display='none';$('imgMain').style.display='block';}
    showDiaryError('그림 생성 실패',err.message);
  }
  btn.disabled=false;
}

/* ══════════════════════════════════════
   🎨 그림 프롬프트 조율소
══════════════════════════════════════ */
let _pwBasePrompt='', _pwRichness=5, _pwTitle='', _pwSource='';

async function openPromptWorkshop(basePrompt, richness, title, source='diary') {
  // imagePrompt가 없으면 기본값 사용
  if (!basePrompt || basePrompt.trim() === '') {
    basePrompt = 'Cute colorful children storybook illustration, Korean elementary school art style, cheerful scene, white background.';
  }
  _pwBasePrompt = basePrompt;
  _pwRichness = richness || 5;
  _pwTitle = title || '';
  _pwSource = source;

  // 모달 요소 존재 확인
  const modal = $('promptWorkshopModal');
  if (!modal) { console.error('promptWorkshopModal 요소를 찾을 수 없습니다'); return; }

  const reqEl = $('pwUserRequest');
  if (reqEl) reqEl.value = '';
  const fbEl = $('pwFinalPromptBox');
  if (fbEl) fbEl.style.display = 'none';
  const btnEl = $('pwDrawBtn');
  if (btnEl) { btnEl.disabled = false; btnEl.textContent = '🖌️ 이대로 그려줘!'; }

  // AI가 프롬프트에서 핵심 태그 추출
  try {
    const tagsRaw = await callClaude({
      model: 'claude-haiku-4-5-20251001', max_tokens: 300,
      system: `주어진 영어 이미지 프롬프트에서 핵심 요소를 한국어로 추출해서 JSON으로만 답해.
형식: {"tags":[{"label":"주인공","value":"토끼"},{"label":"장소","value":"숲속"},{"label":"분위기","value":"신나는"},{"label":"행동","value":"달리기"}]}
최대 5개. label은 주인공/장소/분위기/행동/특징/시간 중 하나.`,
      messages: [{ role: 'user', content: basePrompt }]
    });
    const parsed = parseJSON(tagsRaw) || { tags: [] };
    const tagEl = $('pwTags');
    tagEl.innerHTML = parsed.tags.length
      ? parsed.tags.map(t => `<div class="pw-tag"><span class="pw-tag-label">${t.label}</span> ${t.value}</div>`).join('')
      : '<span style="color:#bbb;font-size:12px;">태그를 불러오지 못했어요. 추가 요구사항을 직접 써보세요!</span>';
  } catch {
    $('pwTags').innerHTML = '<span style="color:#bbb;font-size:12px;">추가 요구사항을 직접 써주세요!</span>';
  }
  $('promptWorkshopModal').classList.add('open');
}

async function executePromptWorkshop() {
  const btn = $('pwDrawBtn');
  btn.disabled = true;
  btn.textContent = '그림 생성 중... ⏳';

  const userReq = $('pwUserRequest').value.trim();
  let finalPrompt = _pwBasePrompt;

  if (userReq) {
    // 한글 요청을 영어 프롬프트에 합치기
    try {
      const merged = await callClaude({
        model: 'claude-haiku-4-5-20251001', max_tokens: 80,
        system: `Merge the English base prompt with the Korean user request into a single English image prompt. Max 30 words. Return ONLY the merged prompt.`,
        messages: [{ role: 'user', content: `Base: ${_pwBasePrompt}\nUser request: ${userReq}` }]
      });
      finalPrompt = merged.trim();
    } catch { /* base prompt 그대로 사용 */ }
    $('pwFinalPromptText').textContent = finalPrompt;
    $('pwFinalPromptBox').style.display = 'block';
  }

  try {
    if (_pwSource === 'book') {
      // 그림책 페이지용
      await _executeBookPageDraw(finalPrompt);
    } else {
      // 일기용
      $('dLoading').style.display = 'flex';
      startProgress(55, 95, _pwRichness >= 7 ? 20000 : 10000);
      const b64 = await generateDalle(finalPrompt, _pwRichness, msg => { $('loadingMsg').textContent = msg; });
      curImgB64 = b64;
      clearInterval(progTimer); $('progressFill').style.width = '100%'; $('progressLabel').textContent = '100%';
      await sleep(200);
      $('dLoading').style.display = 'none'; $('placeholder').style.display = 'none';
      $('imgMain').src = b64; $('imgMain').style.display = 'block';
      $('richnessBadge').textContent = `🎨 살아있는 표현 ${_pwRichness}/10`; $('richnessBadge').style.display = 'block';
      $('missionFill').style.width = `${curMissionScore * 10}%`;
      $('missionScoreText').textContent = currentMission ? `${curMissionScore}/10` : '— 대기중';
      await checkLocalBadges($('diary').value.trim(), curRich, curMissionScore);
      toast('그림일기 완성! 🎉');
    }
    closeModal('promptWorkshopModal');
  } catch (err) {
    clearInterval(progTimer);
    $('dLoading').style.display = 'none';
    toast('그림 생성 실패: ' + err.message);
  }
  btn.disabled = false;
  btn.textContent = '🖌️ 이대로 그려줘!';
}

async function _executeBookPageDraw(finalPrompt) {
  const text = _bookPendingText;
  if (!bookPages.length) $('bookViewer').innerHTML = '';
  const b64 = await generateDalle(finalPrompt.trim(), 4);
  const pageIdx = bookPages.length + 1;
  bookPages.push({ text, b64 });
  $('bookViewer').insertAdjacentHTML('beforeend',
    `<div class="b-page"><img src="${b64}" class="b-page-img"><div class="b-page-text">${text}</div><div class="b-page-num">- ${pageIdx} -</div></div>`);
  $('bookViewer').scrollLeft = $('bookViewer').scrollWidth;
  $('bookInput').value = '';
  toast(`${pageIdx}페이지 완성! 🎉`);
  await saveCurrentBook();
  $('bDrawBtn').disabled = false;
  $('bDrawBtn').textContent = '📖 이 내용으로 페이지 추가하기';
}

/* ═══════════════════════════════════════════════
   출력 관련 코드 (그림책 PDF 전용)
   ※ 일기 출력 → openDiaryPrintModal()  (이음 탭 전용)
   ※ 시화 JPG → openPoemJpgSave()       (지음 탭 전용)
   ※ 그림책 PDF → openPrintModal('book') (지음 탭 전용)
═══════════════════════════════════════════════ */
let printMode='book', printSelected=new Set(), printSource='book';
async function openPrintModal(mode){
  // 안전 장치: 'diary' 모드 호출 완전 차단 (jieumApp에서 절대 열리지 않도록)
  if (mode === 'diary') {
    console.warn('[openPrintModal] diary 모드는 openDiaryPrintModal()을 사용하세요. 이 호출은 무시됩니다.');
    return;
  }
  printMode=mode;printSelected.clear();
  const titles={diary:'🖼️ 일기 이미지(JPG) 저장',book:'🖨️ 그림책 PDF 출력',poem:'🖼️ 시화 이미지(JPG) 저장'};
  $('printModalTitle').textContent=titles[mode];
  const items=await getPrintItems(mode),el=$('printModalContent');
  el.innerHTML=!items.length?'<div class="empty-list">출력할 항목이 없어요</div>'
    :items.map((item,i)=>`<div class="sel-item" id="pitem_${i}" onclick="togglePrint(${i})">
      <div class="chk" id="pchk_${i}"></div>
      ${item.thumb?`<img src="${item.thumb}" class="thumb-img">`:`<div class="thumb-img" style="display:flex;align-items:center;justify-content:center;font-size:18px;">${item.icon||'📄'}</div>`}
      <div style="flex:1;min-width:0;"><div style="font-size:10px;color:#aaa;">${item.sub||''}</div>
        <div style="font-size:12px;margin-top:2px;">${item.label||''}</div></div>
    </div>`).join('');
  $('printSelCount').textContent='선택: 0개';
  printSource=mode;
  $('printModal').classList.add('open');
}

async function getPrintItems(mode){
  if(mode==='diary'){const e=await getEntries();return e.map((e,i)=>({idx:i,thumb:e.imgB64||null,icon:'📝',label:(e.text||'').substring(0,24)+'...',sub:e.dateLabel||'',entry:e}));}
  if(mode==='book'){const books=await getAllBooks();return books.map((b,i)=>({idx:i,thumb:b.pages?.[0]?.b64||null,icon:'📖',label:b.title||`책 ${i+1}`,sub:`${b.pages?.length||0}페이지`,book:b}));}
  if(mode==='poem'){const poems=await getSavedPoems();return poems.map((p,i)=>({idx:i,thumb:p.imgB64||null,icon:'🌸',label:`시화 ${i+1}: `+(p.poemText||'').split('\n')[0],sub:p.dateLabel||'',poem:p}));}
  return[];
}

function togglePrint(i){
  if(printSelected.has(i))printSelected.delete(i);else printSelected.add(i);
  $(`pitem_${i}`).classList.toggle('selected',printSelected.has(i));
  $(`pchk_${i}`).textContent=printSelected.has(i)?'✓':'';
  $('printSelCount').textContent=`선택: ${printSelected.size}개`;
}

async function doPrint(){
  if(!printSelected.size){toast('출력할 항목을 선택해주세요!');return;}
  closeModal('printModal');
  const indices=[...printSelected].sort((a,b)=>a-b),items=await getPrintItems(printMode);
  const selected=indices.map(i=>items[i]).filter(Boolean);
  showOverlay(`저장하는 중... (${selected.length}항목)`);
  try{
    if(printMode === 'book') {
      const pages=[];
      for(let i=0;i<selected.length;i++){
        $('overlayMsg').textContent=`(${i+1}/${selected.length}) 렌더링 중...`;
        const book=selected[i].book;
        pages.push({html:buildBookCoverHTML(book)});
        for(let j=0; j<(book.pages||[]).length; j++){ pages.push({html:buildBookPageHTML(book.pages[j], j+1)}); }
      }
      $('overlayMsg').textContent='PDF 생성 중...';
      const doc=await buildPDF(pages);
      doc.save(`그림책_${currentNick}_${Date.now()}.pdf`);
      toast(`📄 PDF 저장 완료!`);
    } else {
      for(let i=0;i<selected.length;i++){
        $('overlayMsg').textContent=`(${i+1}/${selected.length}) 이미지 저장 중...`;
        let htmlStr = '';
        let elWidth = 420;
        if(printMode==='diary') { htmlStr = buildDiaryHTML(selected[i].entry); elWidth = 420; }
        else { htmlStr = buildPoemOutputHTML(selected[i].poem); elWidth = 794; }

        // 안전한 오프스크린 렌더링 컨테이너
        const wrapper = document.createElement('div');
        wrapper.style.cssText = [
          'position:fixed',
          'left:0',
          'top:0',
          `width:${elWidth}px`,
          'z-index:-9999',
          'visibility:hidden',
          'pointer-events:none',
          'background:white',
          'font-family:\'Jua\',sans-serif',
        ].join(';');
        wrapper.innerHTML = htmlStr;
        document.body.appendChild(wrapper);

        // 폰트 로드 대기
        await Promise.allSettled([
          document.fonts.load("900 20px 'NanumHyejun'"),
          document.fonts.load("700 20px 'NanumBarunpen'"),
          document.fonts.load("400 20px 'Jua'")
        ]);
        // 이미지 로드 대기
        const imgs = wrapper.querySelectorAll('img');
        await Promise.all(Array.from(imgs).map(img => new Promise(res => {
          if(img.complete && img.naturalWidth > 0) return res();
          img.onload = res; img.onerror = res;
          // crossorigin 없으면 canvas가 tainted됨
          if(!img.crossOrigin) img.crossOrigin = 'anonymous';
        })));
        await sleep(600);

        // wrapper를 visible 상태로 잠깐 전환해서 html2canvas 렌더링
        wrapper.style.visibility = 'visible';
        wrapper.style.zIndex = '-9998';

        const canvas = await html2canvas(wrapper, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: elWidth,
          windowWidth: elWidth
        });
        document.body.removeChild(wrapper);

        const filename = `${printMode==='diary'?'그림일기':'시화'}_${currentNick}_${Date.now()}_${i+1}.jpg`;

        // Blob + createObjectURL 방식 (모바일/태블릿 브라우저 정책 우회)
        await new Promise((resolve, reject) => {
          canvas.toBlob(blob => {
            if (!blob) { reject(new Error('이미지 변환 실패')); return; }
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = filename;
            link.href = blobUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              try { document.body.removeChild(link); } catch{}
              URL.revokeObjectURL(blobUrl);
              resolve();
            }, 1000);
          }, 'image/jpeg', 0.93);
        });
        await sleep(400);
      }
      toast(`🖼️ 이미지 저장 완료! (${selected.length}개)`);
    }
  }catch(e){
    toast('저장 실패: '+e.message);
    console.error('[doPrint error]', e);
  }
  hideOverlay();
}

function buildDiaryHTML(e){
  const rich=e.richness||0,sd=STAMPS[rich];
  const fontFamily = "'NanumHyejun', 'Nanum Pen Script', cursive";
  const teacherComment = e.empathy || e.teacherAdvice || '';
  const goodExpr = e.goodExpression || '';
  const nextChallenge = e.nextChallenge || '';
  const spellingAdvice = e.spellingAdvice || '';
  const title = (e.title||'').replace(/[\[\]]/g,'').trim()||'오늘의 일기';
  const diaryText = e.text || '';
  const dateStr = e.dateLabel || dateLabel;

  // 장착된 데코 아이템 읽기 (동기 localStorage 캐시)
  let decos = [];
  try { decos = JSON.parse(localStorage.getItem('mdj_shop')||'{}').equippedDeco || []; } catch{}
  const hasSparkle  = decos.includes('deco_sparkle');
  const hasRainbow  = decos.includes('deco_rainbow');
  const hasCloud    = decos.includes('deco_cloud');
  const hasGold     = decos.includes('deco_gold');
  const hasDragon   = decos.includes('deco_stamp_dragon');

  // 바깥 테두리 스타일
  let outerBorder = '3px solid #d4b896';
  let outerExtra  = '';
  if(hasRainbow)  { outerBorder='4px solid transparent'; outerExtra='background-clip:padding-box;outline:4px solid;outline-color:red;box-shadow:0 0 0 4px orange,0 0 0 8px yellow,0 0 0 12px green,0 0 0 16px blue,0 0 0 20px violet;'; }
  if(hasSparkle)  { outerExtra += 'box-shadow:0 0 0 3px #f5c842,0 0 16px 4px #f5e642aa;'; }

  // 배경
  let bgStyle = 'background:#fff9f0';
  if(hasCloud) bgStyle = 'background:linear-gradient(180deg,#e8f4ff 0%,#fff9f0 60%)';

  // 도장 결정
  let stampColor='#62b3a4', stampIcon='⭐', stampTxt='훌륭해요';
  if(hasDragon) { stampColor='#8a00b8'; stampIcon='🐉'; stampTxt='전설!'; }
  else if(hasGold) {
    if(rich>=9){stampColor='#d4af37';stampIcon='🏅';stampTxt='황금!';}
    else if(rich>=7){stampColor='#d4af37';stampIcon='🥇';stampTxt='금메달!';}
    else{stampColor='#d4af37';stampIcon='💛';stampTxt='골드';}
  } else {
    if(rich>=9){stampColor='#e85c4a';stampIcon='🏆';stampTxt='최고예요!';}
    else if(rich>=7){stampColor='#f49f5a';stampIcon='🌟';stampTxt='잘했어요!';}
    else if(rich>=5){stampColor='#62b3a4';stampIcon='👍';stampTxt='좋아요!';}
    else if(rich>=3){stampColor='#8a7ce8';stampIcon='✏️';stampTxt='노력중!';}
    else{stampColor='#aaa';stampIcon='🌱';stampTxt='더 써봐요';}
  }

  // 빨간펜 조언
  const redPenLines = [];
  if(teacherComment) redPenLines.push(`💬 ${teacherComment}`);
  if(goodExpr) redPenLines.push(`⭐ 잘된 표현: ${goodExpr}`);
  if(nextChallenge) redPenLines.push(`✏️ 다음엔: ${nextChallenge}`);
  if(spellingAdvice) redPenLines.push(`📝 맞춤법: ${spellingAdvice}`);

  return `<div style="width:420px;${bgStyle};font-family:'Jua',sans-serif;padding:0;margin:0;overflow:hidden;position:relative;border:${outerBorder};border-radius:4px;${outerExtra}">

    <!-- ① 맨 위 : 날짜/날씨 헤더 줄 -->
    <div style="background:#fffef8;border-bottom:2px solid #d4b896;padding:7px 14px;display:flex;align-items:center;gap:8px;font-size:13px;color:#555;">
      <span style="font-weight:bold;color:#4a8a7a;">🎨 그림일기</span>
      <span style="flex:1;text-align:right;font-size:11px;color:#aaa;">${dateStr}</span>
    </div>

    <!-- ② 이름 / 제목 / 도장 행 -->
    <div style="display:flex;align-items:stretch;border-bottom:2px solid #d4b896;background:#fffef8;">
      <div style="padding:6px 10px;border-right:2px solid #d4b896;min-width:70px;text-align:center;">
        <div style="font-size:9px;color:#aaa;margin-bottom:2px;">이름</div>
        <div style="font-size:15px;color:#333;">${currentNick}</div>
      </div>
      <div style="padding:6px 12px;flex:1;">
        <div style="font-size:9px;color:#aaa;margin-bottom:2px;">제목</div>
        <div style="font-size:15px;color:#2a2a2a;">${title}</div>
      </div>
      <!-- 선생님 도장 -->
      <div style="padding:6px 10px;border-left:2px solid #d4b896;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:62px;gap:2px;">
        <div style="border:3px solid ${stampColor};border-radius:50%;width:46px;height:46px;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-7deg);background:rgba(255,255,255,0.7);">
          <div style="font-size:16px;line-height:1;">${stampIcon}</div>
          <div style="font-size:8px;color:${stampColor};font-weight:bold;line-height:1.2;">${stampTxt}</div>
        </div>
      </div>
    </div>

    <!-- ③ 그림 영역 (격자 배경) -->
    <div style="background:#fdf5e6;border-bottom:3px solid #d4b896;height:260px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background-image:linear-gradient(#e8e0d0 1px,transparent 1px),linear-gradient(90deg,#e8e0d0 1px,transparent 1px);background-size:20px 20px;">
      ${e.imgB64?`<img src="${e.imgB64}" style="max-width:100%;max-height:256px;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,.15));">`:`<div style="color:#ddd;font-size:36px;">🖼️</div>`}
    </div>

    <!-- ④ 일기 내용 — 초등 노트 줄 배경 -->
    <div style="padding:10px 16px 12px;background:#fffef8;border-bottom:2px solid #d4b896;">
      <div style="
        background-image: repeating-linear-gradient(transparent 0px, transparent 34px, #b8d4c8 34px, #b8d4c8 36px);
        padding: 4px 2px 4px 2px;
        min-height: 144px;
      ">
        <div style="font-family:${fontFamily};font-size:19px;font-weight:900;line-height:1.9;color:#1a1a1a;word-break:keep-all;white-space:pre-wrap;letter-spacing:0.5px;">${diaryText}</div>
      </div>
    </div>

    <!-- ⑤ 빨간펜 선생님 조언 -->
    ${redPenLines.length ? `
    <div style="padding:10px 16px 12px;background:#fff8f8;border-bottom:2px solid #f5b8b8;position:relative;">
      <div style="position:absolute;top:-11px;left:14px;background:#fff8f8;border:2px solid #e88080;border-radius:20px;padding:1px 10px;font-size:10px;color:#c04040;font-weight:bold;">✏️ 선생님 빨간펜</div>
      ${redPenLines.map(l=>`<div style="font-family:'NanumBarunpen','Nanum Pen Script',cursive;font-size:17px;font-weight:700;color:#cc2020;line-height:1.8;margin-bottom:2px;">${l}</div>`).join('')}
    </div>` : ''}

    <!-- ⑥ 하단 바 -->
    <div style="padding:5px 14px;background:#f0e8d8;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#bbb;">
      <span>✍️ 지음 프로젝트</span>
      <span>살아있는 표현 ${rich}/10</span>
    </div>
  </div>`;
}

function buildBookCoverHTML(book){
  return `<div style="width:794px;height:600px;background:linear-gradient(160deg,#ff8e8b,#ffb347);display:flex;flex-direction:column;justify-content:center;align-items:center;gap:16px;font-family:sans-serif;">
    <div style="font-size:60px;">📖</div><div style="font-size:36px;color:white;">${book.title||currentNick+'의 그림책'}</div>
    <div style="font-size:16px;color:rgba(255,255,255,.9);">작가: ${currentNick}</div>
  </div>`;
}

function buildBookPageHTML(p,idx){
  return `<div style="padding:30px 36px;font-family:sans-serif;display:flex;flex-direction:column;gap:14px;background:white;min-height:600px;">
    <div style="text-align:center;font-size:13px;color:#aaa;">- ${idx} -</div>
    <div style="text-align:center;"><img src="${p.b64}" style="max-width:440px;max-height:280px;border-radius:12px;border:2px solid #eee;"></div>
    <div style="font-size:17px;line-height:2;word-break:keep-all;text-align:center;">${p.text}</div>
  </div>`;
}

function buildPoemOutputHTML(p){
  return `<div style="padding:32px;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;gap:14px;background:white;">
    <img src="${p.imgB64}" style="width:680px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.12);">
  </div>`;
}

/* ═══════════════════════════════════════════════
   3단계: 틔음 (100분 토론 50종 주제 전체 복원)
═══════════════════════════════════════════════ */
