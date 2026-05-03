'use strict';

const PYQLoader = (() => {

  const _state = {
    paperId: null,
    paperMeta: null,
    allQuestions: [],
    filteredIndices: [],
    currentFilteredIndex: 0,
    mode: 'exam',
    answers: {},
    markedForReview: new Set(),
    isSubmitted: false,
    timerInterval: null,
    secondsLeft: 90 * 60,
    mobilePaletteOpen: false,
    filterActive: false,
    activeSubjects: new Set(),
    activeCategories: new Set([1,2])
  };

  const BN = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  function toBn(num) { return String(num).split('').map(ch => (/\d/.test(ch) ? BN[+ch] : ch)).join(''); }
  function announce(msg) {
    const el = document.getElementById('sr-announcer');
    if (el) { el.textContent = ''; requestAnimationFrame(() => el.textContent = msg); }
  }

  const OPTION_LETTERS = ['A','B','C','D'];
  const SUBJECT_MAP = {
    'life-science': 'Life Science',
    'physical-science': 'Physical Science',
    'mathematics': 'Mathematics',
    'english': 'English',
    'general-knowledge': 'General Knowledge',
    'logical-reasoning': 'Logical Reasoning',
    'reasoning': 'Reasoning'
  };

  // ── Safe DOM helpers ──
  function getById(id) { return document.getElementById(id); }
  function safeStyle(id) { const el = getById(id); return el ? el.style : null; }
  function safeClassList(id) { const el = getById(id); return el ? el.classList : null; }
  function safeValue(id, val) { const el = getById(id); if (el) el.value = val; }
  function safeSetAttr(id, attr, val) { const el = getById(id); if (el) el.setAttribute(attr, val); }
  function safeText(id, text) { const el = getById(id); if (el) el.textContent = text; }

  // ── Filter helpers ──
  function isQuestionPassingFilter(q) {
    if (!_state.activeCategories.has(q.category)) return false;
    if (_state.activeSubjects.size > 0 && !_state.activeSubjects.has(q.subject)) return false;
    return true;
  }

  function rebuildFilteredIndices() {
    const indices = [];
    _state.allQuestions.forEach((q, i) => { if (isQuestionPassingFilter(q)) indices.push(i); });
    _state.filteredIndices = indices;
    if (_state.currentFilteredIndex >= indices.length) _state.currentFilteredIndex = Math.max(0, indices.length - 1);
  }

  function getCurrentQuestion() { return _state.allQuestions[_state.filteredIndices[_state.currentFilteredIndex]]; }

  // ── Load paper ──
  async function loadPaper(paperId) {
    showLoadingState();
    try {
      const resp = await fetch(`data/${paperId}.json`, { headers: {'Accept':'application/json'} });
      if (!resp.ok) throw new Error('Paper not found');
      const data = await resp.json();
      if (!data.questions) throw new Error('Invalid format');

      _state.paperId = paperId; _state.paperMeta = data;
      _state.allQuestions = data.questions;
      _state.filteredIndices = _state.allQuestions.map((_, i) => i);
      _state.currentFilteredIndex = 0;
      _state.answers = {}; data.questions.forEach(q => _state.answers[q.id] = null);
      _state.markedForReview.clear();
      _state.activeSubjects.clear(); _state.activeCategories = new Set([1,2]);

      safeText('paper-title', data.title || paperId);
      safeText('paper-subtitle', `${toBn(data.questions.length)} questions · 115 marks · 90 min`);
      document.title = `${data.title} | WB ANM GNM 2026`;

      setupPalette();
      buildFilterPanel();
      updateModeUI();

      if (_state.mode !== 'review') { setupTimer(); } else { stopTimer(); _state.isSubmitted = true; }
      renderQuestion(0);
      hideLoadingShowCard();
      setupSwipeNavigation();

    } catch (err) { showErrorState(err.message); }
  }

  // ── Mode ──
  function changeMode(newMode) {
    if (_state.isSubmitted && newMode !== 'review') return;
    _state.mode = newMode;
    if (newMode === 'exam') { setupTimer(); _state.isSubmitted = false; }
    else if (newMode === 'practice') { stopTimer(); _state.isSubmitted = false; }
    else { stopTimer(); _state.isSubmitted = true; }
    renderQuestion(_state.currentFilteredIndex);
    updateModeUI();
  }

  function updateModeUI() {
    const submitBtn = safeStyle('palette-submit-btn');
    const submitMain = safeStyle('submit-btn-main');
    const reviewBtn = safeStyle('mark-review-btn');
    const timerEl = safeStyle('timer-display');

    if (submitBtn) submitBtn.display = (_state.mode === 'exam') ? 'flex' : 'none';
    if (submitMain) submitMain.display = (_state.mode === 'exam') ? 'block' : 'none';
    if (reviewBtn) reviewBtn.display = (_state.mode === 'practice' || _state.mode === 'exam') ? 'flex' : 'none';
    if (timerEl) timerEl.display = (_state.mode === 'exam') ? 'flex' : 'none';

    safeValue('mode-selector', _state.mode);
  }

  // ── Filter UI ──
  function toggleFilter() {
    const overlay = getById('filter-overlay');
    if (overlay) {
      overlay.classList.toggle('hidden');
      const btn = getById('filter-toggle-btn');
      if (btn) btn.classList.toggle('active', !overlay.classList.contains('hidden'));
    }
  }

  function buildFilterPanel() {
    const subContainer = getById('filter-subjects');
    if (!subContainer) return;
    const subjectsSet = new Set(_state.allQuestions.map(q => q.subject));
    subContainer.innerHTML = '';
    subjectsSet.forEach(sub => {
      const lbl = document.createElement('label'); lbl.className = 'filter-checkbox';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = sub;
      cb.checked = _state.activeSubjects.has(sub);
      cb.addEventListener('change', () => {
        if (cb.checked) _state.activeSubjects.add(sub); else _state.activeSubjects.delete(sub);
      });
      lbl.appendChild(cb); lbl.appendChild(document.createTextNode(SUBJECT_MAP[sub] || sub));
      subContainer.appendChild(lbl);
    });
  }

  function applyFilter() {
    const cat1cb = document.querySelector('#filter-overlay input[data-cat="1"]');
    const cat2cb = document.querySelector('#filter-overlay input[data-cat="2"]');
    _state.activeCategories.clear();
    if (cat1cb?.checked) _state.activeCategories.add(1);
    if (cat2cb?.checked) _state.activeCategories.add(2);
    _state.activeSubjects.clear();
    document.querySelectorAll('#filter-subjects input[type="checkbox"]:checked').forEach(cb => _state.activeSubjects.add(cb.value));
    _state.filterActive = true;
    rebuildFilteredIndices();
    setupPalette();
    _state.currentFilteredIndex = 0;
    renderQuestion(0);
    toggleFilter();
  }

  function resetFilter() {
    _state.activeCategories = new Set([1,2]); _state.activeSubjects.clear();
    _state.filterActive = false;
    _state.filteredIndices = _state.allQuestions.map((_, i) => i);
    setupPalette(); buildFilterPanel();
    _state.currentFilteredIndex = 0; renderQuestion(0);
    toggleFilter();
  }

  // ── Palette ──
  function setupPalette() {
    const cat1Grid = getById('palette-cat1');
    const cat2Grid = getById('palette-cat2');
    if (!cat1Grid || !cat2Grid) return;
    cat1Grid.innerHTML = ''; cat2Grid.innerHTML = '';

    _state.filteredIndices.forEach((globalIdx, fidx) => {
      const q = _state.allQuestions[globalIdx];
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'palette-btn';
      btn.dataset.qid = q.id; btn.dataset.idx = fidx;
      btn.textContent = toBn(fidx + 1);
      btn.addEventListener('click', () => {
        if (_state.mobilePaletteOpen) toggleMobilePalette();
        goToFilteredIndex(fidx);
      });
      (q.category === 1 ? cat1Grid : cat2Grid).appendChild(btn);
    });

    const cat1Count = _state.filteredIndices.filter(i => _state.allQuestions[i].category === 1).length;
    const total = _state.filteredIndices.length;
    const cat1Info = document.querySelector('#palette-cat1-block .palette-category__info');
    const cat2Info = document.querySelector('#palette-cat2-block .palette-category__info');
    if (cat1Info) cat1Info.textContent = `Q 1 – ${cat1Count}`;
    if (cat2Info) cat2Info.textContent = `Q ${cat1Count+1} – ${total}`;

    refreshAllPaletteButtons();
    updateStatsCounter();
    syncMobilePalette();
  }

  function getPaletteStateForQuestion(qid, fidx) {
    const isCurrent = fidx === _state.currentFilteredIndex;
    if (_state.isSubmitted) {
      const q = _state.allQuestions.find(q => q.id === qid);
      const userAns = _state.answers[qid] || [];
      if (!q || userAns.length === 0) return 'not-attempted';
      if (q.category === 1) return (userAns[0] === q.answer[0]) ? 'correct' : 'wrong';
      const correctSet = new Set(q.answer);
      const hasWrong = userAns.some(a => !correctSet.has(a));
      if (hasWrong) return 'wrong';
      return (userAns.length === q.answer.length) ? 'correct' : 'correct';
    }
    const hasAnswer = _state.answers[qid] !== null && (_state.answers[qid] ?? []).length > 0;
    const isReview = _state.markedForReview.has(qid);
    if (isCurrent) return 'current';
    if (hasAnswer && isReview) return 'attempted-review';
    if (isReview) return 'review';
    if (hasAnswer) return 'attempted';
    return 'not-attempted';
  }

  function updatePaletteButton(qid, fidx) {
    document.querySelectorAll(`[data-qid="${qid}"]`).forEach(btn => {
      btn.dataset.state = getPaletteStateForQuestion(qid, fidx);
    });
  }

  function refreshAllPaletteButtons() {
    _state.filteredIndices.forEach((gidx, fidx) => updatePaletteButton(_state.allQuestions[gidx].id, fidx));
  }

  function updateStatsCounter() {
    let attempted = 0, review = 0;
    _state.allQuestions.forEach(q => {
      if (_state.answers[q.id] && _state.answers[q.id].length) attempted++;
      if (_state.markedForReview.has(q.id)) review++;
    });
    safeText('stat-attempted-count', toBn(attempted));
    safeText('stat-review-count', toBn(review));
  }

  // ── Navigation ──
  function goToFilteredIndex(fidx) {
    if (fidx >= 0 && fidx < _state.filteredIndices.length) {
      _state.currentFilteredIndex = fidx;
      renderQuestion(fidx);
    }
  }

  function navigateQuestion(dir) {
    const len = _state.filteredIndices.length;
    let newIdx = _state.currentFilteredIndex;
    if (dir === 'next' && newIdx < len-1) newIdx++;
    else if (dir === 'prev' && newIdx > 0) newIdx--;
    if (newIdx !== _state.currentFilteredIndex) goToFilteredIndex(newIdx);
  }

  // ── Render ──
  function renderQuestion(fidx) {
    if (fidx < 0 || fidx >= _state.filteredIndices.length) return;
    _state.currentFilteredIndex = fidx;
    const q = _state.allQuestions[_state.filteredIndices[fidx]];
    const isReviewMode = _state.mode === 'review' || _state.isSubmitted;

    const qCard = getById('question-card');
    const rCard = getById('review-card');
    if (qCard && rCard) {
      if (!isReviewMode) {
        qCard.classList.remove('hidden');
        rCard.classList.add('hidden');
        renderExamQuestion(q, fidx);
      } else {
        qCard.classList.add('hidden');
        rCard.classList.remove('hidden');
        renderReviewQuestion(q, fidx);
      }
    }

    updatePaletteButton(q.id, fidx);
    updateProgressBar(fidx);
    updateNavButtons(fidx);
    const container = getById('question-container');
    if (container) container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    announce(`Question ${toBn(fidx+1)}`);
  }

  function renderExamQuestion(q, fidx) {
    document.getElementById('question-number').textContent = `Q ${toBn(fidx+1)}`;
    const catBadge = document.getElementById('question-cat-badge');
    catBadge.textContent = `Cat-${q.category}`;
    catBadge.className = `cat-badge cat-badge--${q.category}`;
    document.getElementById('question-subject').textContent = SUBJECT_MAP[q.subject] || q.subject;
    document.getElementById('question-progress-text').textContent = `${toBn(fidx+1)} / ${toBn(_state.filteredIndices.length)}`;
    document.getElementById('question-text').textContent = q.question;
    document.getElementById('cat2-hint').classList.toggle('hidden', q.category !== 2);
    renderOptions(q);
    document.getElementById('mark-review-btn').setAttribute('aria-pressed', String(_state.markedForReview.has(q.id)));
    const fb = document.getElementById('practice-feedback');
    if (fb) fb.classList.add('hidden');
  }

  function renderOptions(q) {
    const container = document.getElementById('options-list');
    container.innerHTML = '';
    const type = q.category === 1 ? 'radio' : 'checkbox';
    const name = `q_${q.id}`;
    const saved = _state.answers[q.id] || [];
    q.options.forEach((opt, i) => {
      const item = document.createElement('div'); item.className = `option-item ${type === 'checkbox' ? 'option-item--checkbox' : ''}`;
      const inp = document.createElement('input'); inp.type = type; inp.name = name; inp.id = `opt_${q.id}_${i}`;
      inp.value = String(i); inp.checked = saved.includes(i);
      const label = document.createElement('label'); label.htmlFor = inp.id; label.className = 'option-label';
      label.innerHTML = `<span class="option-letter">${OPTION_LETTERS[i]}</span>
                         <span class="option-indicator"></span>
                         <span class="option-text">${opt}</span>`;
      item.appendChild(inp); item.appendChild(label);
      inp.addEventListener('change', () => saveAnswer(q, i));
      container.appendChild(item);
    });
  }

  function renderReviewQuestion(q, fidx) {
    document.getElementById('review-question-number').textContent = `Q ${toBn(fidx+1)}`;
    document.getElementById('review-cat-badge').textContent = `Cat-${q.category}`;
    document.getElementById('review-cat-badge').className = `cat-badge cat-badge--${q.category}`;
    document.getElementById('review-question-text').textContent = q.question;
    const userAns = _state.answers[q.id] || [];
    const correctSet = new Set(q.answer);
    const userSet = new Set(userAns);
    let label = 'Unattempted', cls = 'unattempted';
    if (userAns.length > 0) {
      if (q.category === 1) {
        if (userAns[0] === q.answer[0]) { label = 'Correct'; cls = 'correct'; }
        else { label = 'Wrong'; cls = 'wrong'; }
      } else {
        const hasWrong = [...userSet].some(a => !correctSet.has(a));
        if (hasWrong) { label = 'Wrong'; cls = 'wrong'; }
        else if (userAns.length === q.answer.length) { label = 'Fully Correct'; cls = 'correct'; }
        else { label = 'Partially Correct'; cls = 'partial'; }
      }
    }
    document.getElementById('review-result-badge').textContent = label;
    document.getElementById('review-result-badge').className = `review-result-badge ${cls}`;
    const optContainer = document.getElementById('review-options-list');
    optContainer.innerHTML = '';
    q.options.forEach((opt, i) => {
      const isCorrect = correctSet.has(i);
      const isSelected = userSet.has(i);
      const div = document.createElement('div');
      div.className = 'review-option';
      if (isCorrect) div.classList.add('is-correct');
      if (isSelected && !isCorrect) div.classList.add('is-wrong');
      div.innerHTML = `<span class="review-option__indicator">${isCorrect ? '✓' : (isSelected ? '✗' : '')}</span>
                       <span class="option-letter">${OPTION_LETTERS[i]}</span>
                       <span class="option-text">${opt}</span>`;
      optContainer.appendChild(div);
    });
    const expSec = document.getElementById('review-explanation');
    const expTxt = document.getElementById('review-explanation-text');
    if (q.explanation) { expTxt.textContent = q.explanation; expSec.classList.remove('hidden'); }
    else { expSec.classList.add('hidden'); }
  }

  // ── Save & Feedback ──
  function saveAnswer(q, idx) {
    if (_state.mode === 'review' || _state.isSubmitted) return;
    if (q.category === 1) { _state.answers[q.id] = [idx]; }
    else {
      const cur = new Set(_state.answers[q.id] || []);
      if (cur.has(idx)) cur.delete(idx); else cur.add(idx);
      _state.answers[q.id] = cur.size > 0 ? [...cur].sort((a,b)=>a-b) : null;
    }
    updatePaletteButton(q.id, _state.currentFilteredIndex);
    updateStatsCounter();
    if (_state.mode === 'practice') showPracticeFeedback(q);
  }

  function showPracticeFeedback(q) {
    const fb = document.getElementById('practice-feedback');
    if (!fb) return;
    const userAns = _state.answers[q.id] || [];
    const correctSet = new Set(q.answer);
    let isCorrect = false, isPartial = false;
    if (q.category === 1) { isCorrect = (userAns[0] === q.answer[0]); }
    else {
      const hasWrong = userAns.some(a => !correctSet.has(a));
      if (hasWrong) isCorrect = false;
      else if (userAns.length === q.answer.length) isCorrect = true;
      else isPartial = true;
    }
    fb.classList.remove('hidden');
    fb.className = 'practice-feedback';
    if (isCorrect) { fb.classList.add('correct'); document.getElementById('practice-feedback-indicator').textContent = '✓ Correct'; }
    else if (isPartial) { fb.classList.add('partial'); document.getElementById('practice-feedback-indicator').textContent = 'ⓘ Partial'; }
    else { fb.classList.add('incorrect'); document.getElementById('practice-feedback-indicator').textContent = '✗ Incorrect'; }
    document.getElementById('practice-feedback-text').textContent = q.explanation || '';
  }

  function clearAnswer() {
    if (_state.mode === 'review' || _state.isSubmitted) return;
    const q = getCurrentQuestion();
    _state.answers[q.id] = null;
    document.querySelectorAll(`input[name="q_${q.id}"]`).forEach(inp => inp.checked = false);
    updatePaletteButton(q.id, _state.currentFilteredIndex);
    updateStatsCounter();
    const fb = document.getElementById('practice-feedback');
    if (_state.mode === 'practice' && fb) fb.classList.add('hidden');
  }

  function toggleMarkForReview() {
    if (_state.mode === 'review' || _state.isSubmitted) return;
    const q = getCurrentQuestion();
    if (!q) return;
    if (_state.markedForReview.has(q.id)) _state.markedForReview.delete(q.id);
    else _state.markedForReview.add(q.id);
    const btn = document.getElementById('mark-review-btn');
    if (btn) btn.setAttribute('aria-pressed', String(_state.markedForReview.has(q.id)));
    updatePaletteButton(q.id, _state.currentFilteredIndex);
    updateStatsCounter();
  }

  // ── Progress & Nav Buttons ──
  function updateProgressBar(fidx) {
    const fill = document.getElementById('progress-bar-fill');
    if (fill) {
      const pct = ((fidx + 1) / _state.filteredIndices.length) * 100;
      fill.style.width = `${pct.toFixed(1)}%`;
    }
  }

  function updateNavButtons(fidx) {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    if (prevBtn) prevBtn.disabled = fidx === 0;
    if (nextBtn) nextBtn.disabled = fidx === _state.filteredIndices.length - 1;
  }

  // ── Timer ──
  function setupTimer() {
    stopTimer();
    if (_state.mode !== 'exam') { updateTimerDisplay(); return; }
    _state.secondsLeft = 90 * 60;
    _state.timerInterval = setInterval(() => {
      _state.secondsLeft--;
      if (_state.secondsLeft <= 0) {
        _state.secondsLeft = 0;
        clearInterval(_state.timerInterval);
        updateTimerDisplay();
        announce('Time up! Auto-submitting...');
        setTimeout(() => { if (!_state.isSubmitted && window.PYQScorer) PYQScorer.submitExam(); }, 1500);
        return;
      }
      updateTimerDisplay();
      if (_state.secondsLeft === 600) {
        const timerEl = document.getElementById('timer-display');
        if (timerEl) timerEl.classList.add('timer-warning');
      }
    }, 1000);
    updateTimerDisplay();
  }

  function stopTimer() { if (_state.timerInterval) { clearInterval(_state.timerInterval); _state.timerInterval = null; } }

  function updateTimerDisplay() {
    const el = document.getElementById('timer-text');
    if (!el) return;
    const m = Math.floor(_state.secondsLeft / 60);
    const s = _state.secondsLeft % 60;
    el.textContent = `${toBn(String(m).padStart(2,'0'))}:${toBn(String(s).padStart(2,'0'))}`;
  }

  // ── Swipe ──
  function setupSwipeNavigation() {
    const container = document.getElementById('question-container');
    if (!container) return;
    let startX = 0;
    container.addEventListener('touchstart', e => startX = e.touches[0].clientX, { passive: true });
    container.addEventListener('touchend', e => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) navigateQuestion('next');
        else navigateQuestion('prev');
      }
    });
  }

  // ── Mobile Palette ──
  function toggleMobilePalette() {
    const overlay = document.getElementById('mobile-palette-overlay');
    if (!overlay) return;
    _state.mobilePaletteOpen = !_state.mobilePaletteOpen;
    if (_state.mobilePaletteOpen) {
      overlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      syncMobilePalette();
      const toggleBtn = document.getElementById('palette-toggle-btn');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
      overlay.querySelector('.mobile-palette-close')?.focus();
    } else {
      overlay.classList.add('hidden');
      document.body.style.overflow = '';
      const toggleBtn = document.getElementById('palette-toggle-btn');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
      const plBtn = document.getElementById('palette-toggle-btn');
      if (plBtn) plBtn.focus();
    }
  }

  function syncMobilePalette() {
    const body = document.getElementById('mobile-palette-body');
    if (!body) return;
    body.innerHTML = '';
    const cat1 = document.getElementById('palette-cat1-block')?.cloneNode(true);
    const cat2 = document.getElementById('palette-cat2-block')?.cloneNode(true);
    const leg = document.querySelector('.palette-legend')?.cloneNode(true);
    if (cat1) body.appendChild(cat1);
    if (cat2) body.appendChild(cat2);
    if (leg) body.appendChild(leg);
    body.querySelectorAll('.palette-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleMobilePalette();
        goToFilteredIndex(parseInt(btn.dataset.idx));
      });
    });
  }

  // ── Loading / Error ──
  function showLoadingState() {
    const loading = document.getElementById('qc-loading');
    const error = document.getElementById('qc-error');
    const qCard = document.getElementById('question-card');
    const rCard = document.getElementById('review-card');
    if (loading) loading.classList.remove('hidden');
    if (error) error.classList.add('hidden');
    if (qCard) qCard.classList.add('hidden');
    if (rCard) rCard.classList.add('hidden');
  }

  function hideLoadingShowCard() {
    const loading = document.getElementById('qc-loading');
    const qCard = document.getElementById('question-card');
    if (loading) loading.classList.add('hidden');
    if (qCard) qCard.classList.remove('hidden');
  }

  function showErrorState(msg) {
    const loading = document.getElementById('qc-loading');
    const qCard = document.getElementById('question-card');
    const rCard = document.getElementById('review-card');
    const error = document.getElementById('qc-error');
    const msgEl = document.getElementById('qc-error-msg');
    if (loading) loading.classList.add('hidden');
    if (qCard) qCard.classList.add('hidden');
    if (rCard) rCard.classList.add('hidden');
    if (error) error.classList.remove('hidden');
    if (msgEl) msgEl.textContent = msg || 'Failed to load.';
  }

  // ── Init ──
  function getPaperIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('paper');
    if (!id) throw new Error('No paper ID');
    return id;
  }

  function init() {
    try {
      const paperId = getPaperIdFromURL();
      setupKeyboardNav();
      setupOverlayClose();
      loadPaper(paperId);
    } catch (err) { showErrorState(err.message); }
  }

  function setupKeyboardNav() {
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (_state.isSubmitted && _state.mode !== 'review') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); navigateQuestion('next'); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); navigateQuestion('prev'); }
      else if (e.key === 'r' || e.key === 'R') toggleMarkForReview();
      else if (e.key === 'Escape' && _state.mobilePaletteOpen) toggleMobilePalette();
    });
  }

  function setupOverlayClose() {
    document.getElementById('mobile-palette-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) toggleMobilePalette();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // ── Public API ──
  return {
    navigateQuestion,
    toggleMarkForReview,
    clearAnswer,
    toggleMobilePalette,
    retryLoad: () => loadPaper(getPaperIdFromURL()),
    toggleFilter,
    applyFilter,
    resetFilter,
    changeMode,
    setSubmitted() {
      _state.isSubmitted = true;
      stopTimer();
      refreshAllPaletteButtons();
      renderQuestion(_state.currentFilteredIndex);
    },
    goToQuestion: goToFilteredIndex,
    refreshAllPaletteButtons,
    getState: () => ({ ..._state }),
    getQuestions: () => _state.allQuestions,
    getAnswers: () => _state.answers,
    getPaperId: () => _state.paperId,
    getPaperMeta: () => _state.paperMeta,
  };

})();