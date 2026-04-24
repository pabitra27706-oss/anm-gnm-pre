/* ============================================================
   practice/js/quiz-engine.js
   Core quiz runtime — loads questions, manages state,
   handles navigation, renders UI, submits quiz
   WB ANM GNM 2026 Preparation Platform
   ============================================================ */

(function QuizEngine() {
  'use strict';

  /* ============================================================
     CONSTANTS
     ============================================================ */
  const OPTION_LABELS      = ['A', 'B', 'C', 'D'];
  const TOTAL_QUESTIONS    = 20;
  const DATA_BASE_PATH     = 'data';
  const RESULT_PAGE        = 'result.html';
  const STORAGE_SESSION    = 'quiz_session';

  /* Subject display names */
  const SUBJECT_NAMES = {
    'life-science':      'জীবন বিজ্ঞান',
    'physical-science':  'ভৌত বিজ্ঞান',
    'mathematics':       'গণিত',
    'general-knowledge': 'সাধারণ জ্ঞান',
    'logical-reasoning': 'যুক্তিবিদ্যা',
    'basic-english':     'ইংরেজি',
  };

  /* ============================================================
     STATE
     ============================================================ */
  const state = {
    subject:      null,   // e.g. "life-science"
    set:          null,   // e.g. "01"
    questions:    [],     // array of question objects
    currentIndex: 0,      // 0-based current question index
    userAnswers:  {},     // { questionId: optionIndex (0-3) }
    startTime:    null,   // Date.now() when quiz starts
    timerInterval: null,  // setInterval handle
    isSubmitted:  false,  // guard against double-submit
    isPaletteOpen: false, // mobile palette state
  };

  /* ============================================================
     DOM REFERENCES
     ============================================================ */
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

  /* ============================================================
     INIT
     ============================================================ */
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    resolveDOM();

    /* Parse URL params */
    const params = getQuizParams();
    if (!params.subject || !params.set) {
      showError('URL প্যারামিটার অনুপস্থিত। বিষয় এবং সেট নম্বর প্রয়োজন।');
      return;
    }

    state.subject = params.subject;
    state.set     = params.set;

    /* Update header immediately */
    updateHeader();

    /* Bind all events before loading */
    bindEvents();

    /* Load questions */
    await loadQuiz();
  }

  /* ============================================================
     URL PARAMS
     ============================================================ */
  function getQuizParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      subject: params.get('subject'),
      set:     params.get('set'),
    };
  }

  /* ============================================================
     LOAD QUIZ DATA
     ============================================================ */
  async function loadQuiz() {
    showLoading(true);

    try {
      const setNum   = String(state.set).padStart(2, '0');
      const url      = `${DATA_BASE_PATH}/${state.subject}/set-${setNum}.json`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} — ${url}`);
      }

      const data = await response.json();

      /* Validate structure */
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('প্রশ্নের ডেটা সঠিক ফরম্যাটে নেই।');
      }

      state.questions  = data.questions.slice(0, TOTAL_QUESTIONS);
      state.startTime  = Date.now();
      state.isSubmitted = false;
      state.userAnswers = {};
      state.currentIndex = 0;

      /* Restore session if exists (e.g. page refresh) */
      restoreSession();

      showLoading(false);
      setupQuizUI();

    } catch (err) {
      console.error('[QuizEngine] Load failed:', err);
      showLoading(false);
      showError(`প্রশ্ন লোড করতে সমস্যা হয়েছে। (${err.message})`);
    }
  }

  /* ============================================================
     SESSION SAVE / RESTORE
     ============================================================ */

  /* Save in-progress answers so refresh doesn't lose data */
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
      /* sessionStorage might be blocked — fail silently */
    }
  }

  function restoreSession() {
    try {
      const raw = sessionStorage.getItem(STORAGE_SESSION);
      if (!raw) return;

      const session = JSON.parse(raw);

      /* Only restore if same subject+set */
      if (
        session.subject === state.subject &&
        session.set     === state.set
      ) {
        /* Restore answers */
        state.userAnswers  = session.userAnswers  || {};
        state.startTime    = session.startTime    || Date.now();
        state.currentIndex = session.currentIndex || 0;
      }

      /* Clear session after restore */
      sessionStorage.removeItem(STORAGE_SESSION);

    } catch (e) {
      /* Ignore corrupt data */
    }
  }

  /* ============================================================
     SETUP QUIZ UI
     ============================================================ */
  function setupQuizUI() {
    /* Show card and nav */
    dom.questionCard.removeAttribute('hidden');
    dom.quizNav.removeAttribute('hidden');

    /* Set total in nav */
    dom.navTotal.textContent =
      toBengaliNumerals(state.questions.length);

    /* Build palette */
    setupPalette(state.questions.length);

    /* Show sidebar submit button */
    dom.sidebarSubmitBtn.removeAttribute('hidden');

    /* Render first question */
    renderQuestion(state.currentIndex);

    /* Start timer */
    startTimer();
  }

  /* ============================================================
     HEADER UPDATE
     ============================================================ */
  function updateHeader() {
    const subjectName =
      SUBJECT_NAMES[state.subject] || state.subject;
    const setNum = String(state.set).padStart(2, '0');

    if (dom.headerSubject) {
      dom.headerSubject.textContent = subjectName;
    }
    if (dom.headerSet) {
      dom.headerSet.textContent = `সেট ${toBengaliNumerals(parseInt(setNum))}`;
    }

    /* Page title */
    document.title =
      `সেট ${parseInt(setNum)} — ${subjectName} | WB ANM GNM 2026`;
  }

  /* ============================================================
     RENDER QUESTION
     ============================================================ */
  function renderQuestion(index) {
    const q = state.questions[index];
    if (!q) return;

    state.currentIndex = index;

    /* Question number badge */
    dom.questionNumber.textContent =
      toBengaliNumerals(index + 1);

    /* Question text */
    dom.questionText.textContent = q.question;

    /* Hide explanation */
    dom.explanationBox.setAttribute('hidden', '');
    dom.explanationText.textContent = '';

    /* Render options */
    renderOptions(q, state.userAnswers[q.id]);

    /* Update navigation buttons */
    updateNavButtons(index);

    /* Update progress */
    updateProgress(index);

    /* Update palette highlight */
    updatePaletteHighlight(index);

    /* Scroll question into view smoothly */
    dom.questionCard.scrollIntoView({
      behavior: 'smooth',
      block:    'start',
    });
  }

  /* ============================================================
     RENDER OPTIONS
     ============================================================ */
  function renderOptions(question, selectedIndex) {
    dom.optionsList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    question.options.forEach((optionText, idx) => {
      const isSelected = selectedIndex === idx;

      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = `option-card${isSelected ? ' option-card--selected' : ''}`;
      btn.setAttribute('role',       'radio');
      btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      btn.setAttribute('aria-label',
        `বিকল্প ${OPTION_LABELS[idx]}: ${optionText}`
      );
      btn.dataset.optionIndex = idx;

      btn.innerHTML = `
        <span class="option-label" aria-hidden="true">
          ${OPTION_LABELS[idx]}
        </span>
        <span class="option-text">${optionText}</span>
      `;

      btn.addEventListener('click', () => {
        selectOption(question.id, idx);
      });

      fragment.appendChild(btn);
    });

    dom.optionsList.appendChild(fragment);

    /* Update radiogroup labelling */
    dom.optionsList.setAttribute(
      'aria-label',
      `প্রশ্ন ${toBengaliNumerals(state.currentIndex + 1)}-এর উত্তর বিকল্প`
    );
  }

  /* ============================================================
     SELECT OPTION
     ============================================================ */
  function selectOption(questionId, optionIndex) {
    if (state.isSubmitted) return;

    /* Toggle: clicking same option deselects */
    if (state.userAnswers[questionId] === optionIndex) {
      delete state.userAnswers[questionId];
    } else {
      state.userAnswers[questionId] = optionIndex;
    }

    /* Re-render options to reflect new state */
    const q = state.questions[state.currentIndex];
    renderOptions(q, state.userAnswers[questionId]);

    /* Update palette for current question */
    updatePaletteCell(state.currentIndex);

    /* Update progress */
    updateProgress(state.currentIndex);

    /* Auto-save session */
    saveSession();

    /* Check if all answered — show submit */
    checkAllAnswered();
  }

  /* ============================================================
     QUESTION PALETTE
     ============================================================ */
  function setupPalette(totalQuestions) {
    dom.paletteGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < totalQuestions; i++) {
      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'palette-num';
      btn.id        = `palette-cell-${i}`;
      btn.setAttribute('role',      'listitem');
      btn.setAttribute('aria-label',
        `প্রশ্ন ${toBengaliNumerals(i + 1)}`
      );
      btn.textContent = toBengaliNumerals(i + 1);

      btn.addEventListener('click', () => {
        navigateToQuestion(i);
        /* Close palette on mobile after selection */
        if (window.innerWidth < 1024) {
          closePalette();
        }
      });

      fragment.appendChild(btn);
    }

    dom.paletteGrid.appendChild(fragment);

    /* Set initial current highlight */
    updatePaletteHighlight(0);
  }

  /* Update single palette cell state */
  function updatePaletteCell(index) {
    const cell = document.getElementById(`palette-cell-${index}`);
    if (!cell) return;

    const q          = state.questions[index];
    const isAnswered = state.userAnswers[q.id] !== undefined;
    const isCurrent  = index === state.currentIndex;

    cell.className = 'palette-num';
    if (isAnswered) cell.classList.add('palette-num--answered');
    if (isCurrent)  cell.classList.add('palette-num--current');

    cell.setAttribute('aria-label',
      `প্রশ্ন ${toBengaliNumerals(index + 1)}${isAnswered ? ' — উত্তর দেওয়া হয়েছে' : ''}`
    );
  }

  /* Update highlight — remove current from old, add to new */
  function updatePaletteHighlight(newIndex) {
    /* Remove current class from all */
    const allCells = dom.paletteGrid.querySelectorAll('.palette-num');
    allCells.forEach(cell => {
      cell.classList.remove('palette-num--current');
    });

    /* Refresh all cells */
    state.questions.forEach((_, idx) => {
      updatePaletteCell(idx);
    });

    /* Ensure new current is visible in palette */
    const currentCell = document.getElementById(
      `palette-cell-${newIndex}`
    );
    if (currentCell) {
      currentCell.scrollIntoView({
        behavior: 'smooth',
        block:    'nearest',
      });
    }
  }

  /* ============================================================
     NAVIGATION
     ============================================================ */
  function navigateQuestion(direction) {
    if (direction === 'next') {
      if (state.currentIndex < state.questions.length - 1) {
        renderQuestion(state.currentIndex + 1);
      }
    } else if (direction === 'prev') {
      if (state.currentIndex > 0) {
        renderQuestion(state.currentIndex - 1);
      }
    }
  }

  function navigateToQuestion(index) {
    if (index >= 0 && index < state.questions.length) {
      renderQuestion(index);
    }
  }

  /* ============================================================
     NAV BUTTONS UPDATE
     ============================================================ */
  function updateNavButtons(index) {
    const total     = state.questions.length;
    const isFirst   = index === 0;
    const isLast    = index === total - 1;

    /* Previous */
    dom.btnPrev.disabled = isFirst;

    /* Next / Submit toggle */
    if (isLast) {
      dom.btnNext.setAttribute('hidden', '');
      dom.btnSubmit.removeAttribute('hidden');
    } else {
      dom.btnNext.removeAttribute('hidden');
      dom.btnSubmit.setAttribute('hidden', '');
    }

    /* Nav counter */
    dom.navCurrent.textContent =
      toBengaliNumerals(index + 1);
  }

  /* Show submit button if all questions answered */
  function checkAllAnswered() {
    const answeredCount = Object.keys(state.userAnswers).length;
    const total         = state.questions.length;

    /* Always show submit on last question */
    /* Additionally show in nav if all answered */
    if (answeredCount === total && state.currentIndex !== total - 1) {
      dom.btnSubmit.removeAttribute('hidden');
      dom.btnNext.setAttribute('hidden', '');
    }
  }

  /* ============================================================
     PROGRESS UPDATE
     ============================================================ */
  function updateProgress(currentIndex) {
    const total       = state.questions.length;
    const answered    = Object.keys(state.userAnswers).length;
    const progressPct = ((currentIndex + 1) / total) * 100;
    const answeredPct = (answered / total) * 100;

    /* Header progress text */
    if (dom.progressText) {
      dom.progressText.textContent =
        `${toBengaliNumerals(answered)} / ${toBengaliNumerals(total)}`;
    }

    /* Mini progress bar — shows how many answered */
    if (dom.progressMiniFill) {
      dom.progressMiniFill.style.width = `${answeredPct}%`;
    }
  }

  /* ============================================================
     TIMER
     ============================================================ */
  function startTimer() {
    /* Clear any existing interval */
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
    }

    state.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
      renderTimer(elapsed);
    }, 1000);

    /* Initial render */
    renderTimer(0);
  }

  function renderTimer(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const formatted =
      `${toBengaliNumerals(String(mins).padStart(2, '0'))}:` +
      `${toBengaliNumerals(String(secs).padStart(2, '0'))}`;

    if (dom.timerDisplay) {
      dom.timerDisplay.textContent = formatted;
    }

    /* Warning style after 40 minutes */
    if (totalSeconds > 2400 && dom.quizTimer) {
      dom.quizTimer.classList.add('quiz-timer--warning');
    }
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

  /* ============================================================
     PALETTE TOGGLE (Mobile)
     ============================================================ */
  function openPalette() {
    state.isPaletteOpen = true;
    dom.paletteEl.classList.add('palette-open');
    dom.paletteBackdrop.classList.add('visible');
    dom.paletteToggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';

    /* Focus first palette cell */
    requestAnimationFrame(() => {
      const firstCell = dom.paletteGrid.querySelector('.palette-num');
      if (firstCell) firstCell.focus();
    });
  }

  function closePalette() {
    state.isPaletteOpen = false;
    dom.paletteEl.classList.remove('palette-open');
    dom.paletteBackdrop.classList.remove('visible');
    dom.paletteToggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function togglePalette() {
    if (state.isPaletteOpen) {
      closePalette();
    } else {
      openPalette();
    }
  }

  /* ============================================================
     SUBMIT QUIZ
     ============================================================ */
  function showSubmitConfirm() {
    const total      = state.questions.length;
    const answered   = Object.keys(state.userAnswers).length;
    const unanswered = total - answered;

    /* Build confirm stats HTML */
    dom.confirmStats.innerHTML = `
      <div class="confirm-stat">
        <span class="confirm-stat__num confirm-stat__num--green">
          ${toBengaliNumerals(answered)}
        </span>
        <span class="confirm-stat__label">উত্তর দেওয়া</span>
      </div>
      <div class="confirm-stat">
        <span class="confirm-stat__num confirm-stat__num--gray">
          ${toBengaliNumerals(unanswered)}
        </span>
        <span class="confirm-stat__label">বাকি</span>
      </div>
      <div class="confirm-stat">
        <span class="confirm-stat__num">
          ${toBengaliNumerals(total)}
        </span>
        <span class="confirm-stat__label">মোট</span>
      </div>
    `;

    dom.confirmOverlay.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';

    /* Focus confirm button */
    requestAnimationFrame(() => {
      dom.confirmSubmitBtn.focus();
    });
  }

  function hideSubmitConfirm() {
    dom.confirmOverlay.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  function submitQuiz() {
    if (state.isSubmitted) return;
    state.isSubmitted = true;

    /* Stop timer */
    stopTimer();
    const timeTaken = getElapsedSeconds();

    /* Calculate score */
    const result = QuizScorer.calculateScore(
      state.questions,
      state.userAnswers
    );
    result.timeTaken = timeTaken;

    /* Get detailed question results */
    const details = QuizScorer.getDetailedResults(
      state.questions,
      state.userAnswers
    );

    /* Save to localStorage */
    QuizStorage.saveQuizResult(state.subject, state.set, result);
    QuizStorage.markSetCompleted(state.subject, state.set);

    /* Store full details for result page */
    QuizStorage.saveResultDetails(details, result, state.subject, state.set);

    /* Clear session */
    sessionStorage.removeItem(STORAGE_SESSION);

    /* Redirect to result page */
    const url =
      `result.html?subject=${encodeURIComponent(state.subject)}` +
      `&set=${encodeURIComponent(state.set)}`;
    window.location.href = url;
  }

  /* ============================================================
     EVENT BINDING
     ============================================================ */
  function bindEvents() {

    /* Navigation buttons */
    document.addEventListener('click', (e) => {
      const id = e.target.closest('[id]')?.id;

      switch (id) {
        case 'btn-prev':
          navigateQuestion('prev');
          break;

        case 'btn-next':
          navigateQuestion('next');
          break;

        case 'btn-submit':
        case 'sidebar-submit-btn':
          if (!state.isSubmitted) showSubmitConfirm();
          break;

        case 'confirm-cancel-btn':
          hideSubmitConfirm();
          break;

        case 'confirm-submit-btn':
          hideSubmitConfirm();
          submitQuiz();
          break;

        case 'palette-toggle-btn':
          togglePalette();
          break;

        case 'palette-close-btn':
          closePalette();
          break;

        default:
          break;
      }
    });

    /* Palette backdrop click — close */
    if (dom.paletteBackdrop) {
      dom.paletteBackdrop.addEventListener('click', closePalette);
    }

    /* Confirm overlay click outside box */
    if (dom.confirmOverlay) {
      dom.confirmOverlay.addEventListener('click', (e) => {
        if (e.target === dom.confirmOverlay) {
          hideSubmitConfirm();
        }
      });
    }

    /* Keyboard navigation */
    document.addEventListener('keydown', handleKeyboard);

    /* Warn before leaving if quiz in progress */
    window.addEventListener('beforeunload', (e) => {
      if (!state.isSubmitted && state.questions.length > 0) {
        saveSession();
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  /* ============================================================
     KEYBOARD NAVIGATION
     ============================================================ */
  function handleKeyboard(e) {
    /* Don't intercept when typing in inputs */
    if (e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA') return;

    /* Don't navigate when modals open */
    const confirmOpen =
      dom.confirmOverlay && !dom.confirmOverlay.hidden;
    const paletteOpen = state.isPaletteOpen && window.innerWidth < 1024;

    switch (e.key) {
      /* Arrow Left / Right — previous / next question */
      case 'ArrowRight':
      case 'PageDown':
        if (!confirmOpen && !paletteOpen) {
          e.preventDefault();
          navigateQuestion('next');
        }
        break;

      case 'ArrowLeft':
      case 'PageUp':
        if (!confirmOpen && !paletteOpen) {
          e.preventDefault();
          navigateQuestion('prev');
        }
        break;

      /* 1-4 keys — select option */
      case '1': case '2': case '3': case '4':
        if (!confirmOpen && !paletteOpen) {
          const idx = parseInt(e.key) - 1;
          const q   = state.questions[state.currentIndex];
          if (q && idx < q.options.length) {
            selectOption(q.id, idx);
          }
        }
        break;

      /* Escape — close modals */
      case 'Escape':
        if (confirmOpen) {
          hideSubmitConfirm();
        } else if (paletteOpen) {
          closePalette();
        }
        break;

      /* Enter / Space on submit btn */
      case 'Enter':
        if (confirmOpen && document.activeElement === dom.confirmSubmitBtn) {
          hideSubmitConfirm();
          submitQuiz();
        }
        break;

      default:
        break;
    }
  }

  /* ============================================================
     UI STATE HELPERS
     ============================================================ */
  function showLoading(visible) {
    if (!dom.quizLoading) return;
    if (visible) {
      dom.quizLoading.removeAttribute('hidden');
    } else {
      dom.quizLoading.setAttribute('hidden', '');
    }
  }

  function showError(message) {
    if (dom.quizError) {
      dom.quizError.removeAttribute('hidden');
    }
    if (dom.quizErrorMsg && message) {
      dom.quizErrorMsg.textContent = message;
    }
    if (dom.questionCard) {
      dom.questionCard.setAttribute('hidden', '');
    }
    if (dom.quizNav) {
      dom.quizNav.setAttribute('hidden', '');
    }
  }

  /* ============================================================
     BENGALI NUMERALS
     ============================================================ */
  function toBengaliNumerals(num) {
    const map = {
      '0':'০','1':'১','2':'২','3':'৩','4':'৪',
      '5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'
    };
    return String(num).replace(/[0-9]/g, d => map[d] || d);
  }

})();