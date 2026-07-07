/* ============================================================
 * [지음-그림책·시화] 그림책 페이지 생성/저장/불러오기 · 시화 생성/저장/불러오기
 * ⚠️ 2026-07 전면 재작성: 기존 07-jieum.js에는 04-ieum-diary.js의
 *    오래된 스냅샷(중복 DIARY_MISSIONS 선언 포함)이 잘못 들어있었고,
 *    index.html의 그림책·시화 버튼이 실제로 호출하는 함수
 *    (addBookPage, createPoemArt, saveCurrentBook, resetBook,
 *     openBookListModal, savePoem, resetPoem, openPoemListModal,
 *     adjustPoemFontSize 등)는 프로젝트 전체 어디에도 정의돼 있지
 *     않았음 — 즉 지음 4단계의 그림책/시화 기능은 실제로 동작하지
 *     않는 상태였음. 이 파일이 그 실제 구현을 담당한다.
 * ⚠️ 2026-07 추가 수정: 한글 장면 설명을 영어 프롬프트에 그대로
 *    끼워 넣으면 generateDalle()의 sanitizePrompt()가 한글을 전부
 *    제거해버려 "장면과 무관한 그림"이 나오는 문제 발견 → 번역
 *    전처리 함수 translateToScenePrompt()를 02-core-utils.js로
 *    옮기고(이음-일기 폴백 경로에서도 재사용하기 위해), 여기서는
 *    그 공용 함수를 그대로 사용한다.
 * ============================================================ */

/* ────────────────────────────────────────────────────────────
   한글 → 영어 장면 묘사 변환
   ⚠️ generateDalle() 내부의 sanitizePrompt()가 한글(CJK) 문자를
      전부 제거하므로(Together AI FLUX가 글자를 깨진 형태로 그리는
      것을 막기 위함), 한글 원문을 그대로 프롬프트에 넣으면 내용이
      통째로 사라진다. 반드시 이 함수로 영어 장면 묘사로 바꾼 뒤
      generateDalle에 넘겨야 한다. (04-ieum-diary.js의 analyzeDiary
      가 하는 방식과 동일한 패턴)
   ──────────────────────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────
   그림책(Book)
   ──────────────────────────────────────────────────────────── */
let currentBookPages = [];   // [{ b64, text }, ...] — 지금 만들고 있는 책
let currentBookId = null;    // 저장된 책을 불러왔다면 그 id, 새 책이면 null
let currentBookTitle = '';

async function getAllBooks() { return (await lsGet(SK.bookList(currentNick))) || []; }
async function setAllBooks(books) { await lsSet(SK.bookList(currentNick), books); }

function renderBookViewer() {
  const el = $('bookViewer');
  if (!el) return;
  if (!currentBookPages.length) {
    el.innerHTML = `<div style="color:#aaa;font-size:13px;text-align:center;width:100%;margin-top:100px;">내용을 적고 [페이지 추가하기]를 눌러보세요! ✨</div>`;
    return;
  }
  el.innerHTML = currentBookPages.map((p, idx) => `
    <div style="position:relative;background:white;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 2px 10px rgba(0,0,0,.1);">
      <div style="text-align:center;font-size:12px;color:#aaa;margin-bottom:8px;">- ${idx + 1} -</div>
      <img src="${p.b64}" style="width:100%;border-radius:8px;display:block;">
      <div style="font-size:15px;line-height:1.8;text-align:center;margin-top:10px;word-break:keep-all;">${escHtml(p.text)}</div>
      <button onclick="deleteBookPage(${idx})" title="이 페이지 삭제" style="position:absolute;top:8px;right:8px;background:rgba(255,255,255,.92);border:1px solid #eee;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:13px;">🗑️</button>
    </div>
  `).join('');
  el.scrollTop = el.scrollHeight;
}

function deleteBookPage(idx) {
  if (!confirm(`${idx + 1}번째 페이지를 삭제할까요?`)) return;
  currentBookPages.splice(idx, 1);
  renderBookViewer();
}

async function addBookPage() {
  const input = $('bookInput');
  const text = (input?.value || '').trim();
  if (!text) { toast('그림책에 들어갈 내용을 먼저 써주세요!'); return; }
  if (!checkProfanity(text, '그림책 내용')) return;
  if (currentBookPages.length >= 12) { toast('한 권에는 최대 12쪽까지 담을 수 있어요! 저장하고 새 책을 시작해보세요 📖'); return; }

  const btn = $('bDrawBtn'), label = $('bDrawBtnLabel');
  if (btn) btn.disabled = true;
  const origLabel = label ? label.textContent : '';
  if (label) label.textContent = '그림 그리는 중... 🎨';
  try {
    const sceneEn = await translateToScenePrompt(text); // 한글 → 영어 장면 묘사 (sanitizePrompt가 한글을 지우므로 필수)
    const prompt = `Children's picture book illustration of this scene: ${sceneEn}. Show the key characters, action, and setting clearly and vividly. Soft watercolor art, Korean picture book style, warm colors, no text, no letters, no numbers.`;
    const b64 = await generateDalle(prompt, 8); // 지음은 완성작 단계이므로 항상 풍성한 수채화 톤
    currentBookPages.push({ b64, text });
    renderBookViewer();
    input.value = '';
    toast(`📖 ${currentBookPages.length}번째 페이지 완성!`);
  } catch (e) {
    console.warn('[addBookPage]', e);
    toast('그림 생성에 실패했어요: ' + e.message);
  } finally {
    if (btn) btn.disabled = false;
    if (label) label.textContent = origLabel;
  }
}

async function saveCurrentBook() {
  if (!currentBookPages.length) { toast('아직 페이지가 없어요! 먼저 페이지를 추가해주세요.'); return; }
  let title = currentBookTitle;
  if (!title) {
    title = (prompt('그림책 제목을 지어주세요!', '') || '').trim() || `${currentNick}의 그림책`;
  }
  const books = await getAllBooks();
  const now = Date.now();
  if (currentBookId) {
    const idx = books.findIndex(b => b.id === currentBookId);
    const updated = { id: currentBookId, title, pages: currentBookPages, createdAt: (books[idx]?.createdAt) || now, updatedAt: now };
    if (idx >= 0) books[idx] = updated; else books.unshift(updated);
  } else {
    currentBookId = 'book_' + now;
    books.unshift({ id: currentBookId, title, pages: currentBookPages, createdAt: now, updatedAt: now });
  }
  currentBookTitle = title;
  await setAllBooks(books);
  await addInk(50 + currentBookPages.length * 10, window.innerWidth / 2, 200);
  await addBadge('그림책 작가');
  toast(`💾 "${title}" 저장 완료!`);
}

function resetBook() {
  if (currentBookPages.length && !confirm('지금 만들고 있는 그림책 내용이 사라져요. 새로 시작할까요?')) return;
  currentBookPages = [];
  currentBookId = null;
  currentBookTitle = '';
  if ($('bookInput')) $('bookInput').value = '';
  renderBookViewer();
  toast('🔄 새 그림책을 시작해요!');
}

async function openBookListModal() {
  const books = await getAllBooks();
  const el = $('bookListContent');
  if (!el) return;
  if (!books.length) {
    el.innerHTML = `<div class="empty-list">저장된 그림책이 없어요</div>`;
  } else {
    el.innerHTML = books.map(b => `
      <div class="story-list-item">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="flex:1;" onclick="loadBook('${b.id}')">
            <div class="story-list-title">📖 ${escHtml(b.title)} <span style="font-size:10px;color:#aaa;font-weight:normal;">${b.pages.length}쪽</span></div>
            <div class="story-list-preview">${escHtml((b.pages[0]?.text || '').slice(0, 40))}...</div>
          </div>
          <button class="d-del" onclick="deleteBook('${b.id}')">🗑️</button>
        </div>
      </div>`).join('');
  }
  $('bookListModal').classList.add('open');
}

async function loadBook(id) {
  const books = await getAllBooks();
  const b = books.find(x => x.id === id);
  if (!b) return;
  currentBookPages = b.pages.map(p => ({ ...p }));
  currentBookId = b.id;
  currentBookTitle = b.title;
  renderBookViewer();
  closeModal('bookListModal');
  toast(`📖 "${b.title}" 불러왔어요!`);
}

async function deleteBook(id) {
  if (!confirm('이 그림책을 정말 삭제할까요? 되돌릴 수 없어요.')) return;
  let books = await getAllBooks();
  books = books.filter(x => x.id !== id);
  await setAllBooks(books);
  if (currentBookId === id) resetBook();
  openBookListModal();
}

/* ────────────────────────────────────────────────────────────
   시화(Poem Art)
   AI는 "글자가 없는" 배경 그림만 그리고(모델이 한글을 정확히 그리지
   못하므로), 실제 시 텍스트는 이 파일이 HTML로 그림 위에 얹은 뒤
   저장 시 html2canvas로 하나의 이미지로 합쳐 imgB64에 담는다.
   ──────────────────────────────────────────────────────────── */
let poemFontSize = 28;
let currentPoemBgB64 = null; // AI가 그려준 배경(텍스트 없음)
let currentPoemId = null;

async function getSavedPoems() { return (await lsGet(SK.poems(currentNick))) || []; }
async function setSavedPoems(poems) { await lsSet(SK.poems(currentNick), poems); }

function renderPoemOverlay() {
  const overlay = $('poemTextOverlay');
  if (!overlay) return;
  const text = ($('poemInput')?.value || '').trim();
  const title = ($('poemTitleInput')?.value || '').trim();
  overlay.innerHTML =
    (title ? `<div style="font-weight:bold;margin-bottom:12px;font-size:${poemFontSize + 6}px;">${escHtml(title)}</div>` : '') +
    `<div style="white-space:pre-wrap;">${escHtml(text)}</div>`;
  overlay.style.fontSize = `${poemFontSize}px`;
}

function adjustPoemFontSize(delta) {
  poemFontSize = Math.max(16, Math.min(48, poemFontSize + delta));
  if ($('poemFontSizeLabel')) $('poemFontSizeLabel').textContent = `${poemFontSize}px`;
  if (currentPoemBgB64) renderPoemOverlay();
}

async function createPoemArt() {
  const text = ($('poemInput')?.value || '').trim();
  if (!text) { toast('시를 먼저 써보세요!'); return; }
  if (!checkProfanity(text, '시')) return;

  if ($('pPlaceholder')) $('pPlaceholder').style.display = 'none';
  if ($('pLoading')) $('pLoading').style.display = 'flex';
  if ($('poemCanvas')) $('poemCanvas').style.display = 'none';
  try {
    const sceneEn = await translateToScenePrompt(text.slice(0, 200)); // 한글 → 영어 장면 묘사 (sanitizePrompt가 한글을 지우므로 필수)
    const prompt = `Dreamy atmospheric background illustration matching this mood and imagery: ${sceneEn}. Soft watercolor style, gentle blended colors, purely atmospheric scenery, no text, no letters, no numbers, no characters, no people's faces close up.`;
    const b64 = await generateDalle(prompt, 9);
    currentPoemBgB64 = b64;
    $('poemCanvas').src = b64;
    $('poemCanvas').style.display = 'block';
    renderPoemOverlay();
    toast('🎨 시화 완성! 마음에 들면 저장해보세요.');
  } catch (e) {
    console.warn('[createPoemArt]', e);
    toast('시화 생성에 실패했어요: ' + e.message);
    if ($('pPlaceholder')) $('pPlaceholder').style.display = 'flex';
  } finally {
    if ($('pLoading')) $('pLoading').style.display = 'none';
  }
}

async function flattenPoemArt() {
  // 배경 이미지 + 텍스트 오버레이가 함께 보이는 미리보기 영역을 캡처해 최종 이미지 1장으로 합성
  const wrap = $('pPreviewWrap');
  const canvas = await html2canvas(wrap, { backgroundColor: null, scale: 2, useCORS: true });
  return canvas.toDataURL('image/png');
}

async function savePoem() {
  if (!currentPoemBgB64) { toast('먼저 [시화로 꾸미기]를 눌러 시화를 완성해주세요!'); return; }
  let flatB64;
  try {
    flatB64 = await flattenPoemArt();
  } catch (e) {
    console.warn('[savePoem/flatten]', e);
    toast('시화 합성에 실패했어요: ' + e.message);
    return;
  }
  const poems = await getSavedPoems();
  const now = Date.now();
  const dateLabel = new Date(now).toLocaleDateString('ko-KR');
  const entry = {
    id: currentPoemId || ('poem_' + now),
    poemText: ($('poemInput')?.value || '').trim(),
    title: ($('poemTitleInput')?.value || '').trim() || '제목 없는 시',
    imgB64: flatB64,
    dateLabel,
    createdAt: now
  };
  const idx = poems.findIndex(p => p.id === entry.id);
  if (idx >= 0) poems[idx] = entry; else poems.unshift(entry);
  currentPoemId = entry.id;
  await setSavedPoems(poems);
  await addInk(60, window.innerWidth / 2, 200);
  await addBadge('시인');
  toast(`💾 "${entry.title}" 저장 완료!`);
}

function resetPoem() {
  const hasContent = ($('poemInput')?.value || '').trim() || currentPoemBgB64;
  if (hasContent && !confirm('지금 쓰고 있는 시화 내용이 사라져요. 새로 시작할까요?')) return;
  if ($('poemInput')) $('poemInput').value = '';
  if ($('poemTitleInput')) $('poemTitleInput').value = '';
  currentPoemBgB64 = null;
  currentPoemId = null;
  poemFontSize = 28;
  if ($('poemFontSizeLabel')) $('poemFontSizeLabel').textContent = '28px';
  if ($('poemCanvas')) { $('poemCanvas').style.display = 'none'; $('poemCanvas').src = ''; }
  if ($('poemTextOverlay')) $('poemTextOverlay').innerHTML = '';
  if ($('pPlaceholder')) $('pPlaceholder').style.display = 'flex';
  toast('🔄 새 시화를 시작해요!');
}

async function openPoemListModal() {
  const poems = await getSavedPoems();
  const el = $('poemListContent');
  if (!el) return;
  if (!poems.length) {
    el.innerHTML = `<div class="empty-list">저장된 시화가 없어요</div>`;
  } else {
    el.innerHTML = poems.map(p => `
      <div class="story-list-item">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="flex:1;" onclick="loadPoem('${p.id}')">
            <div class="story-list-title">🌸 ${escHtml(p.title)} <span style="font-size:10px;color:#aaa;font-weight:normal;">${p.dateLabel || ''}</span></div>
            <div class="story-list-preview">${escHtml((p.poemText || '').slice(0, 40))}...</div>
          </div>
          <button class="d-del" onclick="deletePoem('${p.id}')">🗑️</button>
        </div>
      </div>`).join('');
  }
  $('poemListModal').classList.add('open');
}

async function loadPoem(id) {
  const poems = await getSavedPoems();
  const p = poems.find(x => x.id === id);
  if (!p) return;
  if ($('poemInput')) $('poemInput').value = p.poemText || '';
  if ($('poemTitleInput')) $('poemTitleInput').value = p.title || '';
  currentPoemBgB64 = p.imgB64; // 합성된 최종본을 배경 삼아 불러옴(다시 저장하면 그 위에 텍스트가 한 번 더 얹히지 않도록 아래 참고)
  currentPoemId = p.id;
  if ($('poemCanvas')) { $('poemCanvas').src = p.imgB64; $('poemCanvas').style.display = 'block'; }
  if ($('pPlaceholder')) $('pPlaceholder').style.display = 'none';
  // ⚠️ 불러온 시화는 이미 텍스트가 합성된 완성본이므로, 오버레이를 다시 그리면 글씨가 두 번 겹쳐 보일 수 있음
  if ($('poemTextOverlay')) $('poemTextOverlay').innerHTML = '';
  closeModal('poemListModal');
  toast(`🌸 "${p.title}" 불러왔어요! (수정 후 다시 [시화로 꾸미기]를 누르면 배경을 새로 그려요)`);
}

async function deletePoem(id) {
  if (!confirm('이 시화를 정말 삭제할까요? 되돌릴 수 없어요.')) return;
  let poems = await getSavedPoems();
  poems = poems.filter(x => x.id !== id);
  await setSavedPoems(poems);
  if (currentPoemId === id) resetPoem();
  openPoemListModal();
}

// 시/제목을 입력하는 동안, 이미 배경이 그려져 있다면 오버레이 텍스트를 실시간으로 갱신
document.addEventListener('DOMContentLoaded', () => {
  const poemInputEl = $('poemInput');
  const poemTitleEl = $('poemTitleInput');
  if (poemInputEl) poemInputEl.addEventListener('input', () => { if (currentPoemBgB64) renderPoemOverlay(); });
  if (poemTitleEl) poemTitleEl.addEventListener('input', () => { if (currentPoemBgB64) renderPoemOverlay(); });
});
