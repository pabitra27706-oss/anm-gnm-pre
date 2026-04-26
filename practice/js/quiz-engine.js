/* ============================================================
   practice/js/quiz-engine.js
   Core quiz runtime — loads questions, manages state,
   handles navigation, renders UI, submits quiz
   WB ANM GNM 2026 Preparation Platform

   UPDATED:
   - Validates questions on load, sets defaults for missing fields
   - Normalizes multi answer (wraps single number in array)
   - Safe rendering: avoids breaking on undefined fields
   ============================================================ */

(function QuizEngine() {
  'use strict';

  const OPTION_LABELS   = ['A', 'B', 'C', 'D', 'E'];
  const DATA_BASE_PATH  = 'data';
  const RESULT_PAGE     = 'result.html';
  const STORAGE_SESSION = 'quiz_session';

  const SUBJECT_NAMES = {
    'life-science':                'জীবন বিজ্ঞান',
    'general-science':             'সাধারণ বিজ্ঞান',
    'arithmetic-mathematics':      'গণিত',
    'reasoning-general-knowledge': 'যুক্তিবিদ্যা ও সাধারণ জ্ঞান',
    'general-knowledge':           'সাধারণ জ্ঞান',
    'english-grammar':             'ইংরেজি ব্যাকরণ',
  };

  const state = {
    subject:       null,
    set:           null,
    questions:     [],
    currentIndex:  0,
    userAnswers:   {},
    startTime:     null,
    timerInterval: null,
    isSubmitted:   false,
    isPaletteOpen: false,
  };

  const dom = {};

  function resolveDOM() {
    dom.headerSubject     = document.getElementById('header-subject');
    dom.headerSet         = document.getElementById('header-set');
    dom.progressText      = document.getElementById('progress-text');
    dom.progressMiniFill  = document.getElementById('progress-mini-fill');
    dom.timerDisplay      = document.getElementById('timer-display');
    dom.quizTimer         = document.getElementById('quiz-timer');
    dom.paletteGrid       = document.getElementById('palette-grid');
    dom.paletteToggleBtn  = document.getElementById('palette-toggle-btn');
    dom.paletteCloseBtn   = document.getElementById('palette-close-btn');
    dom.paletteEl         = document.getElementById('question-palette');
    dom.paletteBackdrop   = document.getElementById('palette-backdrop');
    dom.sidebarSubmitBtn  = document.getElementById('sidebar-submit-btn');
    dom.questionCard      = document.getElementById('question-card');
    dom.questionBadge     = document.getElementById('question-badge');
    dom.questionNumber    = document.getElementById('question-number');
    dom.badgeMulti        = document.getElementById('badge-multi');
    dom.badgeDifficulty   = document.getElementById('badge-difficulty');
    dom.questionMarksBadge= document.getElementById('question-marks-badge');
    dom.questionMeta      = document.getElementById('question-meta');
    dom.multiScoreBreakdown = document.getElementById('multi-score-breakdown');
    dom.questionText      = document.getElementById('question-text');
    dom.optionsList       = document.getElementById('options-list');
    dom.explanationBox    = document.getElementById('explanation-box');
    dom.explanationText   = document.getElementById('explanation-text');
    dom.quizNav           = document.getElementById('quiz-nav');
    dom.btnPrev           = document.getElementById('btn-prev');
    dom.btnNext           = document.getElementById('btn-next');
    dom.btnSubmit         = document.getElementById('btn-submit');
    dom.navCurrent        = document.getElementById('nav-current');
    dom.navTotal          = document.getElementById('nav-total');
    dom.quizLoading       = document.getElementById('quiz-loading');
    dom.quizError         = document.getElementById('quiz-error');
    dom.quizErrorMsg      = document.getElementById('quiz-error-msg');
    dom.confirmOverlay    = document.getElementById('confirm-overlay');
    dom.confirmStats      = document.getElementById('confirm-stats');
    dom.confirmCancelBtn  = document.getElementById('confirm-cancel-btn');
    dom.confirmSubmitBtn  = document.getElementById('confirm-submit-btn');
    dom.backBtn           = document.getElementById('back-btn');
  }

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    resolveDOM();
    const params = getQuizParams();
    if (!params.subject || !params.set) {
      showError('URL প্যারামিটার অনুপস্থিত। বিষয় এবং সেট নম্বর প্রয়োজন।');
      return;
    }
    state.subject = params.subject;
    state.set     = params.set;
    updateHeader();
    bindEvents();
    await loadQuiz();
  }

  function getQuizParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      subject: params.get('subject'),
      set:     params.get('set'),
    };
  }

  async function loadQuiz() {
    showLoading(true);
    try {
      const setNum = String(state.set).padStart(2, '0');
      const url = `${DATA_BASE_PATH}/${state.subject}/set-${setNum}.json`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status} — ${url}`);
      const data = await response.json();
      if (!data || !Array.isArray(data.questions)) {
        throw new Error('প্রশ্নের ডেটা সঠিক ফরম্যাটে নেই।');
      }
      if (data.questions.length === 0) {
        throw new Error('এই সেটে কোনো প্রশ্ন নেই।');
      }

      // Validate and clean each question
      state.questions = data.questions.map(function(q, idx) {
        if (!q) {
          console.error('[QuizEngine] Question at index', idx, 'is null');
          return { id: 'invalid-' + idx, question: 'প্রশ্ন পাওয়া যায়নি', options: [], answer: 0, multi: false };
        }
        // Normalize multi answer
        if (q.multi === true && !Array.isArray(q.answer)) {
          console.warn('[QuizEngine] Normalizing multi answer for', q.id);
          q.answer = [q.answer];
        }
        if (!q.question && (!q.options || q.options.length === 0)) {
          console.error('[QuizEngine] Question', q.id, 'has no text or options');
          return Object.assign({}, q, { question: 'প্রশ্ন লোড করা যায়নি', options: [] });
        }
        return q;
      });

      state.startTime    = Date.now();
      state.isSubmitted  = false;
      state.userAnswers  = {};
      state.currentIndex = 0;

      restoreSession();
      showLoading(false);
      setupQuizUI();

    } catch (err) {
      console.error('[QuizEngine] Load failed:', err);
      showLoading(false);
      showError(`প্রশ্ন লোড করতে সমস্যা হয়েছে। (${err.message})`);
    }
  }

  function saveSession() {
    try {
      const session = {
        subject:      state.subject,
        set:          state.set,
        userAnswers:  state.userAnswers,
        startTime:    state.startTime,
        currentIndex: state.currentIndex,
        savedAt:      Date.now(),
      };
      sessionStorage.setItem(STORAGE_SESSION, JSON.stringify(session));
    } catch (e) {
      console.warn('[QuizEngine] Session save failed:', e);
    }
  }

  function restoreSession() {
    try {
      const raw = sessionStorage.getItem(STORAGE_SESSION);
      if (!raw) return;
      const session = JSON.parse(raw);
      if (session.subject === state.subject && session.set === state.set) {
        state.userAnswers  = session.userAnswers  || {};
        state.startTime    = session.startTime    || Date.now();
        state.currentIndex = session.currentIndex || 0;
        if (state.currentIndex >= state.questions.length) {
          state.currentIndex = 0;
        }
      }
      sessionStorage.removeItem(STORAGE_SESSION);
    } catch (e) {
      console.warn('[QuizEngine] Session restore failed:', e);
    }
  }

  function setupQuizUI() {
    const el = dom.questionCard;
    if (el) el.removeAttribute('hidden');
    const nav = dom.quizNav;
    if (nav) nav.removeAttribute('hidden');
    if (dom.navTotal) dom.navTotal.textContent = toBn(state.questions.length);
    setupPalette(state.questions.length);
    if (dom.sidebarSubmitBtn) dom.sidebarSubmitBtn.removeAttribute('hidden');
    renderQuestion(state.currentIndex);
    startTimer();
  }

  function updateHeader() {
    const subjectName = SUBJECT_NAMES[state.subject] || state.subject;
    const setNum = parseInt(state.set, 10) || 1;
    if (dom.headerSubject) dom.headerSubject.textContent = subjectName;
    if (dom.headerSet) dom.headerSet.textContent = 'সেট ' + toBn(setNum);
    document.title = 'সেট ' + setNum + ' — ' + subjectName + ' | WB ANM GNM 2026';
  }

  /* ── RENDER QUESTION (with safety checks) ── */
  function renderQuestion(index) {
    const q = state.questions[index];
    if (!q) {
      console.error('[QuizEngine] Question at index', index, 'is undefined');
      return;
    }
    // Check if question is valid
    if (!q.question || (q.options && q.options.length === 0 && q.multi !== true)) {
      if (dom.questionText) dom.questionText.textContent = 'এই প্রশ্নটি লোড করা যায়নি।';
      if (dom.optionsList) dom.optionsList.innerHTML = '';
      return;
    }

    state.currentIndex = index;

    if (dom.questionNumber) dom.questionNumber.textContent = toBn(index + 1);
    if (dom.questionText) dom.questionText.textContent = q.question || '';

    const isMulti = q.multi === true;

    if (dom.badgeMulti) {
      if (isMulti) dom.badgeMulti.removeAttribute('hidden');
      else dom.badgeMulti.setAttribute('hidden', '');
    }

    if (dom.questionMarksBadge) {
      if (isMulti) {
        dom.questionMarksBadge.classList.add('is-multi');
        dom.questionMarksBadge.setAttribute('aria-label', 'নম্বর বণ্টন: বহু সঠিক সর্বোচ্চ +২');
      } else {
        dom.questionMarksBadge.classList.remove('is-multi');
        dom.questionMarksBadge.setAttribute('aria-label', 'নম্বর বণ্টন: সঠিক +১, ভুল -০.২৫');
      }
    }

    if (dom.badgeDifficulty) {
      if (q.difficulty) {
        dom.badgeDifficulty.removeAttribute('hidden');
        dom.badgeDifficulty.className = 'badge-difficulty';
        const diffMap = {
          easy:   { label: 'সহজ',   cls: 'badge-difficulty--easy'   },
          medium: { label: 'মাঝারি', cls: 'badge-difficulty--medium' },
          hard:   { label: 'কঠিন',  cls: 'badge-difficulty--hard'   },
        };
        const diff = diffMap[q.difficulty] || null;
        if (diff) {
          dom.badgeDifficulty.classList.add(diff.cls);
          dom.badgeDifficulty.textContent = diff.label;
        } else {
          dom.badgeDifficulty.setAttribute('hidden', '');
        }
      } else {
        dom.badgeDifficulty.setAttribute('hidden', '');
      }
    }

    if (dom.questionMeta) {
      if (q.unit || q.type) {
        dom.questionMeta.removeAttribute('hidden');
        dom.questionMeta.innerHTML = '';
        if (q.unit) {
          const tag = document.createElement('span');
          tag.className = 'question-meta__tag';
          tag.textContent = q.unit;
          dom.questionMeta.appendChild(tag);
        }
        if (q.type) {
          const tag = document.createElement('span');
          tag.className = 'question-meta__tag';
          tag.textContent = q.type;
          dom.questionMeta.appendChild(tag);
        }
      } else {
        dom.questionMeta.setAttribute('hidden', '');
      }
    }

    if (dom.explanationBox) dom.explanationBox.setAttribute('hidden', '');
    if (dom.explanationText) dom.explanationText.textContent = '';
    if (dom.multiScoreBreakdown) {
      dom.multiScoreBreakdown.setAttribute('hidden', '');
      dom.multiScoreBreakdown.innerHTML = '';
    }

    renderOptions(q, state.userAnswers[q.id]);

    updateNavButtons(index);
    updateProgress(index);
    updatePaletteHighlight(index);

    if (dom.questionCard) {
      dom.questionCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ── RENDER OPTIONS ── */
  function renderOptions(question, savedAnswer) {
    if (!dom.optionsList) return;
    dom.optionsList.innerHTML = '';

    const isMulti = question.multi === true;

    dom.optionsList.setAttribute('role', isMulti ? 'group' : 'radiogroup');
    dom.optionsList.setAttribute('aria-label', isMulti
      ? 'উত্তর বিকল্প (একাধিক সঠিক)'
      : `প্রশ্ন ${toBn(state.currentIndex + 1)}-এর উত্তর বিকল্প`
    );

    const fragment = document.createDocumentFragment();

    if (isMulti) {
      const warning = document.createElement('p');
      warning.className = 'multi-warning';
      warning.setAttribute('role', 'note');
      warning.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ...>...</svg> এক বা একাধিক সঠিক উত্তর থাকতে পারে`;
      fragment.appendChild(warning);
    }

    if (!Array.isArray(question.options)) {
      console.warn('[QuizEngine] No options array for', question.id);
      return;
    }

    question.options.forEach((optionText, idx) => {
      if (isMulti) {
        const label = document.createElement('label');
        label.className = 'option-label';
        label.htmlFor = `opt-${question.id}-${idx}`;
        const isChecked = Array.isArray(savedAnswer) ? savedAnswer.includes(idx) : false;
        if (isChecked) label.classList.add('option-label--selected');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `opt-${question.id}-${idx}`;
        input.name = `q-${question.id}`;
        input.value = idx;
        input.checked = isChecked;
        input.addEventListener('change', () => {
          selectOptionMulti(question.id, idx, input.checked, label);
        });
        const optLabel = document.createElement('span');
        optLabel.className = 'option-label-letter';
        optLabel.textContent = OPTION_LABELS[idx];
        optLabel.setAttribute('aria-hidden', 'true');
        const optText = document.createElement('span');
        optText.className = 'option-text';
        optText.textContent = optionText;
        label.appendChild(input);
        label.appendChild(optLabel);
        label.appendChild(optText);
        fragment.appendChild(label);
      } else {
        const isSelected = savedAnswer === idx;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-card' + (isSelected ? ' option-card--selected' : '');
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        btn.setAttribute('aria-label', `বিকল্প ${OPTION_LABELS[idx]}: ${optionText}`);
        btn.dataset.optionIndex = idx;
        btn.innerHTML = `<span class="option-label" aria-hidden="true">${OPTION_LABELS[idx]}</span><span class="option-text">${optionText}</span>`;
        btn.addEventListener('click', () => {
          selectOptionSingle(question.id, idx);
        });
        fragment.appendChild(btn);
      }
    });

    dom.optionsList.appendChild(fragment);
  }

  function selectOptionSingle(questionId, optionIndex) {
    if (state.isSubmitted) return;
    if (state.userAnswers[questionId] === optionIndex) {
      delete state.userAnswers[questionId];
    } else {
      state.userAnswers[questionId] = optionIndex;
    }
    const q = state.questions[state.currentIndex];
    if (q) renderOptions(q, state.userAnswers[q.id]);
    updatePaletteCell(state.currentIndex);
    updateProgress(state.currentIndex);
    saveSession();
    checkAllAnswered();
  }

  function selectOptionMulti(questionId, optionIndex, isChecked, labelEl) {
    if (state.isSubmitted) return;
    let current = Array.isArray(state.userAnswers[questionId]) ? [...state.userAnswers[questionId]] : [];
    if (isChecked) {
      if (!current.includes(optionIndex)) {
        current.push(optionIndex);
        current.sort((a, b) => a - b);
      }
    } else {
      current = current.filter(i => i !== optionIndex);
    }
    if (labelEl) {
      if (isChecked) labelEl.classList.add('option-label--selected');
      else labelEl.classList.remove('option-label--selected');
    }
    if (current.length > 0) {
      state.userAnswers[questionId] = current;
    } else {
      delete state.userAnswers[questionId];
    }
    updatePaletteCell(state.currentIndex);
    updateProgress(state.currentIndex);
    saveSession();
    checkAllAnswered();
  }

  function isAttempted(question) {
    const ans = state.userAnswers[question.id];
    if (ans === undefined || ans === null) return false;
    if (question.multi === true) return Array.isArray(ans) && ans.length > 0;
    return typeof ans === 'number';
  }

  function setupPalette(totalQuestions) {
    if (!dom.paletteGrid) return;
    dom.paletteGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < totalQuestions; i++) {
      const q = state.questions[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = `palette-cell-${i}`;
      btn.setAttribute('role', 'listitem');
      btn.setAttribute('aria-label', `প্রশ্ন ${toBn(i + 1)}${q && q.multi ? ' (বহু সঠিক)' : ''}`);
      btn.textContent = toBn(i + 1);
      btn.className = 'palette-num';
      if (q && q.multi === true) {
        btn.classList.add('palette-num--multi');
        btn.title = 'বহু সঠিক উত্তর প্রশ্ন';
      }
      btn.addEventListener('click', () => {
        navigateToQuestion(i);
        if (window.innerWidth < 1024) closePalette();
      });
      fragment.appendChild(btn);
    }
    dom.paletteGrid.appendChild(fragment);
    updatePaletteHighlight(0);
  }

  function updatePaletteCell(index) {
    const cell = document.getElementById(`palette-cell-${index}`);
    if (!cell) return;
    const q = state.questions[index];
    if (!q) return;
    const attempted = isAttempted(q);
    const isCurrent = index === state.currentIndex;
    const isMulti = q.multi === true;
    cell.className = 'palette-num';
    if (isMulti) cell.classList.add('palette-num--multi');
    if (attempted) cell.classList.add('palette-num--answered');
    if (isCurrent) cell.classList.add('palette-num--current');
  }

  function updatePaletteHighlight(newIndex) {
    if (!dom.paletteGrid) return;
    state.questions.forEach((_, idx) => updatePaletteCell(idx));
    const currentCell = document.getElementById(`palette-cell-${newIndex}`);
    if (currentCell) {
      currentCell.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function navigateQuestion(direction) {
    if (direction === 'next' && state.currentIndex < state.questions.length - 1) {
      renderQuestion(state.currentIndex + 1);
    } else if (direction === 'prev' && state.currentIndex > 0) {
      renderQuestion(state.currentIndex - 1);
    }
  }

  function navigateToQuestion(index) {
    if (index >= 0 && index < state.questions.length) {
      renderQuestion(index);
    }
  }

  function updateNavButtons(index) {
    const total = state.questions.length;
    const isFirst = index === 0;
    const isLast = index === total - 1;
    if (dom.btnPrev) dom.btnPrev.disabled = isFirst;
    if (isLast) {
      if (dom.btnNext) dom.btnNext.setAttribute('hidden', '');
      if (dom.btnSubmit) dom.btnSubmit.removeAttribute('hidden');
    } else {
      if (dom.btnNext) dom.btnNext.removeAttribute('hidden');
      if (dom.btnSubmit) dom.btnSubmit.setAttribute('hidden', '');
    }
    if (dom.navCurrent) dom.navCurrent.textContent = toBn(index + 1);
  }

  function checkAllAnswered() {
    const answeredCount = state.questions.filter(q => isAttempted(q)).length;
    const total = state.questions.length;
    if (answeredCount === total && state.currentIndex !== total - 1) {
      if (dom.btnSubmit) dom.btnSubmit.removeAttribute('hidden');
      if (dom.btnNext) dom.btnNext.setAttribute('hidden', '');
    }
  }

  function updateProgress(currentIndex) {
    const total = state.questions.length;
    const answered = state.questions.filter(q => isAttempted(q)).length;
    const answeredPct = total > 0 ? (answered / total) * 100 : 0;
    if (dom.progressText) dom.progressText.textContent = `${toBn(answered)} / ${toBn(total)}`;
    if (dom.progressMiniFill) dom.progressMiniFill.style.width = `${answeredPct}%`;
  }

  function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
      renderTimer(elapsed);
    }, 1000);
    renderTimer(0);
  }

  function renderTimer(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const formatted = `${toBn(String(mins).padStart(2, '0'))}:${toBn(String(secs).padStart(2, '0'))}`;
    if (dom.timerDisplay) dom.timerDisplay.textContent = formatted;
    if (totalSeconds > 2400 && dom.quizTimer) dom.quizTimer.classList.add('quiz-timer--warning');
  }

  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function getElapsedSeconds() {
    return Math.floor((Date.now() - state.startTime) / 1000);
  }

  function openPalette() {
    state.isPaletteOpen = true;
    if (dom.paletteEl) dom.paletteEl.classList.add('palette-open');
    if (dom.paletteBackdrop) dom.paletteBackdrop.classList.add('visible');
    if (dom.paletteToggleBtn) dom.paletteToggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const firstCell = dom.paletteGrid && dom.paletteGrid.querySelector('.palette-num');
      if (firstCell) firstCell.focus();
    });
  }

  function closePalette() {
    state.isPaletteOpen = false;
    if (dom.paletteEl) dom.paletteEl.classList.remove('palette-open');
    if (dom.paletteBackdrop) dom.paletteBackdrop.classList.remove('visible');
    if (dom.paletteToggleBtn) dom.paletteToggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function togglePalette() {
    state.isPaletteOpen ? closePalette() : openPalette();
  }

  function showSubmitConfirm() {
    const total = state.questions.length;
    const answered = state.questions.filter(q => isAttempted(q)).length;
    const unanswered = total - answered;
    const multiCount = state.questions.filter(q => q.multi === true).length;
    if (!dom.confirmStats) return;
    dom.confirmStats.innerHTML = `
      <div class="confirm-stats-row"><span>উত্তর দেওয়া হয়েছে</span><span class="confirm-answered-count">${toBn(answered)}</span></div>
      <div class="confirm-stats-row"><span>উত্তর দেওয়া হয়নি</span><span class="confirm-unanswered-count">${toBn(unanswered)}</span></div>
      ${multiCount > 0 ? `<div class="confirm-stats-row"><span>বহু-সঠিক প্রশ্ন</span><span class="confirm-multi-count">${toBn(multiCount)}</span></div>` : ''}
      <div class="confirm-stats-row"><span>মোট প্রশ্ন</span><strong>${toBn(total)}</strong></div>
    `;
    if (dom.confirmOverlay) dom.confirmOverlay.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => { if (dom.confirmSubmitBtn) dom.confirmSubmitBtn.focus(); });
  }

  function hideSubmitConfirm() {
    if (dom.confirmOverlay) dom.confirmOverlay.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  function submitQuiz() {
    if (state.isSubmitted) return;
    state.isSubmitted = true;
    stopTimer();
    const timeTaken = getElapsedSeconds();
    let result = null;
    try {
      result = QuizScorer.calculateScore(state.questions, state.userAnswers);
    } catch (e) {
      console.error('[QuizEngine] Score calculation failed:', e);
      result = { score: 0, correct: 0, wrong: 0, unattempted: state.questions.length, total: state.questions.length, percentage: '0.0', multiCount: 0, multiScore: 0 };
    }
    result.timeTaken = timeTaken;
    let details = [];
    try {
      details = QuizScorer.getDetailedResults(state.questions, state.userAnswers);
    } catch (e) { console.error('[QuizEngine] getDetailedResults failed:', e); }
    try {
      QuizStorage.saveQuizResult(state.subject, state.set, result);
      QuizStorage.markSetCompleted(state.subject, state.set);
      QuizStorage.saveResultDetails(details, result, state.subject, state.set);
    } catch (e) { console.error('[QuizEngine] Storage save failed:', e); }
    try { sessionStorage.removeItem(STORAGE_SESSION); } catch (e) {}
    const setStr = String(state.set).padStart(2, '0');
    const url = `${RESULT_PAGE}?subject=${encodeURIComponent(state.subject)}&set=${encodeURIComponent(setStr)}`;
    window.location.href = url;
  }

  function bindEvents() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[id]');
      if (!target) return;
      const id = target.id;
      switch (id) {
        case 'btn-prev': navigateQuestion('prev'); break;
        case 'btn-next': navigateQuestion('next'); break;
        case 'btn-submit':
        case 'sidebar-submit-btn':
          if (!state.isSubmitted) showSubmitConfirm(); break;
        case 'confirm-cancel-btn': hideSubmitConfirm(); break;
        case 'confirm-submit-btn': hideSubmitConfirm(); submitQuiz(); break;
        case 'palette-toggle-btn': togglePalette(); break;
        case 'palette-close-btn': closePalette(); break;
        default: break;
      }
    });
    if (dom.paletteBackdrop) dom.paletteBackdrop.addEventListener('click', closePalette);
    if (dom.confirmOverlay) {
      dom.confirmOverlay.addEventListener('click', (e) => { if (e.target === dom.confirmOverlay) hideSubmitConfirm(); });
    }
    document.addEventListener('keydown', handleKeyboard);
    window.addEventListener('beforeunload', (e) => {
      if (!state.isSubmitted && state.questions.length > 0) {
        saveSession();
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  function handleKeyboard(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const confirmOpen = dom.confirmOverlay && !dom.confirmOverlay.hidden;
    const paletteOpen = state.isPaletteOpen && window.innerWidth < 1024;
    switch (e.key) {
      case 'ArrowRight': case 'PageDown':
        if (!confirmOpen && !paletteOpen) { e.preventDefault(); navigateQuestion('next'); } break;
      case 'ArrowLeft': case 'PageUp':
        if (!confirmOpen && !paletteOpen) { e.preventDefault(); navigateQuestion('prev'); } break;
      case '1': case '2': case '3': case '4':
        if (!confirmOpen && !paletteOpen) {
          const q = state.questions[state.currentIndex];
          if (q && q.multi !== true) {
            const idx = parseInt(e.key, 10) - 1;
            if (idx < q.options.length) selectOptionSingle(q.id, idx);
          }
        } break;
      case 'Escape':
        if (confirmOpen) hideSubmitConfirm();
        else if (paletteOpen) closePalette(); break;
      case 'Enter':
        if (confirmOpen && document.activeElement === dom.confirmSubmitBtn) { hideSubmitConfirm(); submitQuiz(); } break;
      default: break;
    }
  }

  function showLoading(visible) {
    if (!dom.quizLoading) return;
    if (visible) dom.quizLoading.removeAttribute('hidden');
    else dom.quizLoading.setAttribute('hidden', '');
  }

  function showError(message) {
    if (dom.quizError) dom.quizError.removeAttribute('hidden');
    if (dom.quizErrorMsg && message) dom.quizErrorMsg.textContent = message;
    if (dom.questionCard) dom.questionCard.setAttribute('hidden', '');
    if (dom.quizNav) dom.quizNav.setAttribute('hidden', '');
    if (dom.quizLoading) dom.quizLoading.setAttribute('hidden', '');
  }

  function toBn(num) {
    const map = { '0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯' };
    return String(num).replace(/[0-9]/g, d => map[d] || d);
  }
})();