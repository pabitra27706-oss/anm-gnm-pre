/* ============================================================
   MOCK-ENGINE.JS
   WB ANM GNM 2026 - Core Test Engine
   Handles: question loading, rendering, navigation,
            answer tracking, palette, submission
   ============================================================ */

(function () {
  'use strict';

  /* ── Constants ─────────────────────────────────────────── */
  const TOTAL_TIME      = 5400;   // 90 minutes in seconds
  const TOTAL_QUESTIONS = 100;
  const CAT1_COUNT      = 85;
  const CAT2_COUNT      = 15;

  /* ── State ─────────────────────────────────────────────── */
  const state = {
    mockId:         null,
    mockData:       null,       // full JSON loaded from file
    questions:      [],         // array of question objects
    currentIndex:   0,          // 0-based current question index
    userAnswers:    {},         // { questionIndex: answer }
    markedReview:   new Set(),  // set of question indexes
    testStartTime:  null,       // Date.now() at start
    timeRemaining:  TOTAL_TIME,
    timerInterval:  null,
    testActive:     false,      // false after submit/time-up
    submitted:      false
  };

  /* ══════════════════════════════════════════════════════════
     ENTRY POINT
  ══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    console.log('MockEngine: DOM ready');
    initEngine();
  });

  /* ══════════════════════════════════════════════════════════
     INITIALIZE ENGINE
  ══════════════════════════════════════════════════════════ */
  async function initEngine() {
    console.log('MockEngine: initEngine()');

    try {
      /* Parse mock ID from URL */
      state.mockId = getMockIdFromURL();

      if (!state.mockId) {
        throw new Error('URL-এ mock ID পাওয়া যায়নি।');
      }

      console.log('MockEngine: mockId =', state.mockId);

      /* Update page title */
      setTestTitle('মক টেস্ট ' + state.mockId);

      /* Show loading */
      showQuestionLoading(true);

      /* Load JSON data */
      await loadMockData(state.mockId);

      /* Extract and validate questions */
      validateAndSetQuestions();

      /* Build palette */
      buildPalette();

      /* Render first question */
      renderQuestion(0);

      /* Start timer */
      startCountdown();

      /* Bind all UI events */
      bindEvents();

      /* Guard against accidental page close */
      window.addEventListener('beforeunload', onBeforeUnload);

      state.testActive = true;

      console.log('MockEngine: Engine ready — questions:', state.questions.length);

    } catch (error) {
      console.error('MockEngine: initEngine failed —', error);
      showFatalError(error.message || 'পরীক্ষা লোড করতে সমস্যা হয়েছে।');
    }
  }

  /* ══════════════════════════════════════════════════════════
     URL PARSING
  ══════════════════════════════════════════════════════════ */
  function getMockIdFromURL() {
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('mock');
      console.log('MockEngine: URL param mock =', id);
      return id ? String(id).trim() : null;
    } catch (error) {
      console.error('MockEngine: getMockIdFromURL error —', error);
      return null;
    }
  }

  /* ══════════════════════════════════════════════════════════
     LOAD MOCK DATA FROM JSON
  ══════════════════════════════════════════════════════════ */
  async function loadMockData(mockId) {
    /* Zero-pad id if numeric */
    const paddedId = mockId.length === 1 ? '0' + mockId : mockId;
    const filePath = './data/mock-' + paddedId + '.json';

    console.log('MockEngine: loadMockData() — fetching', filePath);

    let response;
    try {
      response = await fetch(filePath);
    } catch (networkError) {
      console.error('MockEngine: Network error —', networkError);
      throw new Error('নেটওয়ার্ক সমস্যা। ফাইল লোড হয়নি: ' + filePath);
    }

    if (!response.ok) {
      throw new Error(
        'পরীক্ষার ফাইল পাওয়া যায়নি (HTTP ' + response.status +
        '). Path: ' + filePath
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('MockEngine: JSON parse error —', parseError);
      throw new Error('পরীক্ষার ফাইল সঠিক JSON ফরম্যাটে নেই।');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('পরীক্ষার ডেটা বৈধ নয়।');
    }

    state.mockData = data;
    console.log('MockEngine: Data loaded — keys:', Object.keys(data));
  }

  /* ══════════════════════════════════════════════════════════
     VALIDATE QUESTIONS ARRAY
  ══════════════════════════════════════════════════════════ */
  function validateAndSetQuestions() {
    console.log('MockEngine: validateAndSetQuestions()');

    const data = state.mockData;

    if (!data) {
      throw new Error('Mock data is null');
    }

    if (!Array.isArray(data.questions)) {
      throw new Error(
        'questions অ্যারে পাওয়া যায়নি। ' +
        'JSON এ "questions" key থাকতে হবে।'
      );
    }

    if (data.questions.length === 0) {
      throw new Error('প্রশ্ন তালিকা খালি।');
    }

    /* Filter out any null/malformed entries */
    state.questions = data.questions.filter(function (q, idx) {
      if (!q || typeof q !== 'object') {
        console.warn('MockEngine: Skipping invalid question at index', idx);
        return false;
      }
      if (!q.question && !q.text) {
        console.warn('MockEngine: Question has no text at index', idx);
        return false;
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        console.warn('MockEngine: Question has < 2 options at index', idx);
        return false;
      }
      return true;
    });

    if (state.questions.length === 0) {
      throw new Error('সমস্ত প্রশ্ন অবৈধ।');
    }

    console.log('MockEngine: Valid questions —', state.questions.length);
  }

  /* ══════════════════════════════════════════════════════════
     BUILD QUESTION PALETTE
  ══════════════════════════════════════════════════════════ */
  function buildPalette() {
    console.log('MockEngine: buildPalette()');

    const grid = document.getElementById('paletteGrid');
    if (!grid) {
      console.error('MockEngine: #paletteGrid not found');
      return;
    }

    grid.innerHTML = '';

    const fragment = document.createDocumentFragment();
    const total    = state.questions.length;

    for (let i = 0; i < total; i++) {
      const q   = state.questions[i];
      const btn = document.createElement('button');

      btn.className    = 'palette-btn' + (q && q.category === 2 ? ' cat2' : '');
      btn.textContent  = String(i + 1);
      btn.dataset.index = String(i);
      btn.setAttribute('role', 'listitem');
      btn.setAttribute(
        'aria-label',
        'প্রশ্ন ' + (i + 1) +
          (q && q.category === 2 ? ' (বহু উত্তর)' : '')
      );
      btn.title = 'প্রশ্ন ' + (i + 1);

      /* Use closure to avoid i-mutation bug */
      (function (index) {
        btn.addEventListener('click', function () {
          goToQuestion(index);
          closePaletteOnMobile();
        });
      }(i));

      fragment.appendChild(btn);
    }

    grid.appendChild(fragment);
    console.log('MockEngine: Palette built —', total, 'buttons');
  }

  /* ══════════════════════════════════════════════════════════
     RENDER QUESTION
  ══════════════════════════════════════════════════════════ */
  function renderQuestion(index) {
    console.log('MockEngine: renderQuestion()', index);

    if (typeof index !== 'number' || isNaN(index)) {
      console.error('MockEngine: renderQuestion — invalid index', index);
      return;
    }

    if (index < 0 || index >= state.questions.length) {
      console.warn('MockEngine: renderQuestion — index out of range', index);
      return;
    }

    state.currentIndex = index;
    const q = state.questions[index];

    if (!q) {
      console.error('MockEngine: Question at index', index, 'is null');
      return;
    }

    /* Question text (support both "question" and "text" keys) */
    const questionText = q.question || q.text || '(প্রশ্ন পাওয়া যায়নি)';

    /* Category */
    const cat      = (q.category === 2) ? 2 : 1;
    const isCat2   = cat === 2;
    const marksStr = isCat2 ? '(+২ সম্পূর্ণ / আংশিক)' : '(+১ / −০.২৫)';

    /* Update DOM — with null checks on every element */
    setTextSafe('questionNumber',   String(index + 1));
    setTextSafe('currentQNum',      String(index + 1));
    setTextSafe('totalQNum',        String(state.questions.length));
    setTextSafe('questionText',     questionText);
    setTextSafe('questionMarks',    marksStr);

    const catEl = document.getElementById('questionCategory');
    if (catEl) {
      catEl.textContent = 'Category-' + cat;
      catEl.className   = 'question-category' + (isCat2 ? ' cat2' : '');
    }

    /* Render options */
    renderOptions(index, q, isCat2);

    /* Restore "mark for review" checkbox */
    const reviewCb = document.getElementById('markReviewCheckbox');
    if (reviewCb) {
      reviewCb.checked = state.markedReview.has(index);
    }

    /* Navigation button states */
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
      prevBtn.disabled = (index === 0);
    }

    if (nextBtn) {
      nextBtn.textContent =
        index === state.questions.length - 1 ? 'জমা দিন' : 'পরবর্তী →';
      nextBtn.className =
        index === state.questions.length - 1
          ? 'btn btn-danger'
          : 'btn btn-primary';
    }

    /* Update palette highlight */
    refreshPalette();

    /* Reveal card, hide loader */
    showQuestionLoading(false);

    const card = document.getElementById('questionCard');
    if (card) {
      card.classList.remove('hidden');
    }
  }

  /* ── Render Options ────────────────────────────────────── */
  function renderOptions(questionIndex, q, isMultiple) {
    const container = document.getElementById('optionsContainer');
    if (!container) {
      console.error('MockEngine: #optionsContainer not found');
      return;
    }

    container.innerHTML = '';

    if (!Array.isArray(q.options)) {
      console.error('MockEngine: options is not an array for Q', questionIndex);
      container.innerHTML = '<p style="color:red">বিকল্পসমূহ পাওয়া যায়নি।</p>';
      return;
    }

    const savedAnswer = state.userAnswers[questionIndex];
    const inputType   = isMultiple ? 'checkbox' : 'radio';

    q.options.forEach(function (optionText, optIndex) {
      if (typeof optionText !== 'string' && typeof optionText !== 'number') {
        console.warn(
          'MockEngine: Option at index', optIndex, 'is not a string/number'
        );
        return;
      }

      const label = document.createElement('label');
      label.className = 'option-label';

      const input = document.createElement('input');
      input.type  = inputType;
      input.name  = 'q_' + questionIndex;
      input.value = String(optIndex);

      /* Restore previously selected answer */
      if (savedAnswer !== undefined && savedAnswer !== null) {
        if (isMultiple) {
          if (Array.isArray(savedAnswer) && savedAnswer.indexOf(optIndex) !== -1) {
            input.checked = true;
            label.classList.add('selected');
          }
        } else {
          if (savedAnswer === optIndex) {
            input.checked = true;
            label.classList.add('selected');
          }
        }
      }

      /* Answer change handler — closure */
      (function (qIdx, oIdx, lbl) {
        input.addEventListener('change', function () {
          handleAnswerChange(qIdx, isMultiple);
          /* Update selected highlight */
          const siblings = container.querySelectorAll('.option-label');
          siblings.forEach(function (sibling) {
            sibling.classList.remove('selected');
          });
          if (!isMultiple) {
            lbl.classList.add('selected');
          } else {
            if (input.checked) {
              lbl.classList.add('selected');
            } else {
              lbl.classList.remove('selected');
            }
          }
        });
      }(questionIndex, optIndex, label));

      const span = document.createElement('span');
      span.className   = 'option-text';
      span.textContent = String(optionText);

      label.appendChild(input);
      label.appendChild(span);
      container.appendChild(label);
    });
  }

  /* ══════════════════════════════════════════════════════════
     HANDLE ANSWER CHANGE
  ══════════════════════════════════════════════════════════ */
  function handleAnswerChange(questionIndex, isMultiple) {
    console.log('MockEngine: handleAnswerChange() Q', questionIndex);

    const container = document.getElementById('optionsContainer');
    if (!container) {
      console.error('MockEngine: #optionsContainer not found in handleAnswerChange');
      return;
    }

    const inputs   = container.querySelectorAll('input');
    const checked  = [];

    inputs.forEach(function (inp) {
      if (inp.checked) {
        checked.push(parseInt(inp.value, 10));
      }
    });

    if (checked.length === 0) {
      delete state.userAnswers[questionIndex];
    } else if (isMultiple) {
      state.userAnswers[questionIndex] = checked;
    } else {
      state.userAnswers[questionIndex] = checked[0];
    }

    refreshPalette();
    refreshStats();
  }

  /* ══════════════════════════════════════════════════════════
     PALETTE REFRESH
  ══════════════════════════════════════════════════════════ */
  function refreshPalette() {
    const btns = document.querySelectorAll('.palette-btn');

    btns.forEach(function (btn) {
      const idx = parseInt(btn.dataset.index, 10);

      if (isNaN(idx)) return;

      /* Reset classes (preserve cat2) */
      btn.classList.remove('attempted', 'reviewed', 'current');

      if (idx === state.currentIndex) {
        btn.classList.add('current');
      }

      if (state.markedReview.has(idx)) {
        btn.classList.add('reviewed');
      } else if (state.userAnswers[idx] !== undefined) {
        btn.classList.add('attempted');
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     STATS PANEL REFRESH
  ══════════════════════════════════════════════════════════ */
  function refreshStats() {
    const total    = state.questions.length;
    const answered = Object.keys(state.userAnswers).length;
    const reviewed = state.markedReview.size;
    const remaining = total - answered;

    let cat1Count = 0;
    let cat2Count = 0;

    Object.keys(state.userAnswers).forEach(function (idxStr) {
      const idx = parseInt(idxStr, 10);
      const q   = state.questions[idx];
      if (q) {
        if (q.category === 2) {
          cat2Count++;
        } else {
          cat1Count++;
        }
      }
    });

    setTextSafe('answeredCount',  String(answered));
    setTextSafe('cat1Count',      String(cat1Count));
    setTextSafe('cat2Count',      String(cat2Count));
    setTextSafe('reviewCount',    String(reviewed));
    setTextSafe('remainingCount', String(remaining));
  }

  /* ══════════════════════════════════════════════════════════
     NAVIGATION
  ══════════════════════════════════════════════════════════ */
  function goToQuestion(index) {
    console.log('MockEngine: goToQuestion()', index);

    if (typeof index !== 'number' || isNaN(index)) {
      console.error('MockEngine: goToQuestion — invalid index', index);
      return;
    }

    if (index < 0 || index >= state.questions.length) {
      console.warn('MockEngine: goToQuestion — out of range', index);
      return;
    }

    renderQuestion(index);
  }

  function goToPrev() {
    if (state.currentIndex > 0) {
      goToQuestion(state.currentIndex - 1);
    }
  }

  function goToNext() {
    const lastIndex = state.questions.length - 1;

    if (state.currentIndex < lastIndex) {
      goToQuestion(state.currentIndex + 1);
    } else {
      /* Last question — next acts as submit */
      openSubmitModal();
    }
  }

  /* ══════════════════════════════════════════════════════════
     MARK FOR REVIEW
  ══════════════════════════════════════════════════════════ */
  function handleMarkReview(checked) {
    if (checked) {
      state.markedReview.add(state.currentIndex);
    } else {
      state.markedReview.delete(state.currentIndex);
    }
    refreshPalette();
    refreshStats();
  }

  /* ══════════════════════════════════════════════════════════
     CLEAR RESPONSE
  ══════════════════════════════════════════════════════════ */
  function clearCurrentResponse() {
    console.log('MockEngine: clearCurrentResponse() Q', state.currentIndex);

    delete state.userAnswers[state.currentIndex];

    /* Uncheck all inputs */
    const container = document.getElementById('optionsContainer');
    if (container) {
      container.querySelectorAll('input').forEach(function (inp) {
        inp.checked = false;
      });
      container.querySelectorAll('.option-label').forEach(function (lbl) {
        lbl.classList.remove('selected');
      });
    }

    refreshPalette();
    refreshStats();
  }

  /* ══════════════════════════════════════════════════════════
     SUBMIT MODAL
  ══════════════════════════════════════════════════════════ */
  function openSubmitModal() {
    console.log('MockEngine: openSubmitModal()');

    const total     = state.questions.length;
    const answered  = Object.keys(state.userAnswers).length;
    const unattempted = total - answered;
    const reviewed  = state.markedReview.size;

    setTextSafe('modalAnswered',     String(answered));
    setTextSafe('unAttemptedCount',  String(unattempted));
    setTextSafe('modalReview',       String(reviewed));

    const modal = document.getElementById('submitModal');
    if (modal) {
      modal.classList.remove('hidden');
    } else {
      console.error('MockEngine: #submitModal not found');
    }
  }

  function closeSubmitModal() {
    const modal = document.getElementById('submitModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  /* ══════════════════════════════════════════════════════════
     CONFIRM SUBMIT
  ══════════════════════════════════════════════════════════ */
  function confirmSubmit() {
    console.log('MockEngine: confirmSubmit()');

    if (state.submitted) {
      console.warn('MockEngine: Already submitted — ignoring');
      return;
    }

    state.submitted  = true;
    state.testActive = false;

    /* Stop timer */
    stopCountdown();

    /* Remove beforeunload guard */
    window.removeEventListener('beforeunload', onBeforeUnload);

    /* Calculate elapsed time */
    const elapsedSeconds = TOTAL_TIME - state.timeRemaining;
    const timeTaken      = formatSeconds(elapsedSeconds);

    /* Build score using MockScorer (loaded in HTML) */
    let scoreData = null;

    if (window.MockScorer && typeof window.MockScorer.calculateScore === 'function') {
      scoreData = window.MockScorer.calculateScore(
        state.questions,
        state.userAnswers
      );
    } else {
      console.warn('MockEngine: MockScorer not available — building basic result');
      scoreData = {
        totalScore:  0,
        percentage:  '0.00',
        cat1:        { score: 0, correct: 0, wrong: 0, unattempted: 0, total: CAT1_COUNT },
        cat2:        { score: 0, fullyCorrect: 0, partialCorrect: 0, wrong: 0, unattempted: 0, total: CAT2_COUNT }
      };
    }

    scoreData.timeTaken      = timeTaken;
    scoreData.mockId         = state.mockId;
    scoreData.answers        = state.userAnswers;
    scoreData.markedReview   = Array.from(state.markedReview);

    /* Get subject analysis */
    if (
      window.MockScorer &&
      typeof window.MockScorer.getSubjectAnalysis === 'function'
    ) {
      scoreData.subjectAnalysis = window.MockScorer.getSubjectAnalysis(
        state.questions,
        state.userAnswers
      );
    } else {
      scoreData.subjectAnalysis = {};
    }

    /* Save to localStorage using MockStorage */
    if (window.MockStorage && typeof window.MockStorage.saveResult === 'function') {
      const saved = window.MockStorage.saveResult(state.mockId, scoreData);
      console.log('MockEngine: Result saved —', saved);
    } else {
      console.warn('MockEngine: MockStorage not available — result not saved');
    }

    /* Navigate to result page */
    const resultURL = './result.html?mock=' + encodeURIComponent(state.mockId);
    console.log('MockEngine: Navigating to result —', resultURL);
    window.location.href = resultURL;
  }

  /* ══════════════════════════════════════════════════════════
     TIMER
  ══════════════════════════════════════════════════════════ */
  function startCountdown() {
    console.log('MockEngine: startCountdown()');

    state.testStartTime  = Date.now();
    state.timeRemaining  = TOTAL_TIME;

    updateTimerDisplay(state.timeRemaining);

    state.timerInterval = setInterval(function () {
      state.timeRemaining--;

      if (state.timeRemaining < 0) {
        state.timeRemaining = 0;
        handleTimeUp();
        return;
      }

      updateTimerDisplay(state.timeRemaining);
    }, 1000);
  }

  function stopCountdown() {
    if (state.timerInterval !== null) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      console.log('MockEngine: Timer stopped');
    }
  }

  function updateTimerDisplay(seconds) {
    const timerEl = document.getElementById('timer');
    if (!timerEl) return;

    timerEl.textContent = formatSeconds(seconds);

    /* Apply CSS state classes */
    timerEl.classList.remove('normal', 'warning', 'critical', 'expired');

    if (seconds <= 0) {
      timerEl.classList.add('expired');
    } else if (seconds <= 120) {
      timerEl.classList.add('critical');
    } else if (seconds <= 600) {
      timerEl.classList.add('warning');
    } else {
      timerEl.classList.add('normal');
    }

    /* Also update ring fill if MockTimer is available */
    if (
      window.MockTimer &&
      typeof window.MockTimer.updateRing === 'function'
    ) {
      window.MockTimer.updateRing(seconds, TOTAL_TIME);
    }
  }

  function handleTimeUp() {
    console.log('MockEngine: handleTimeUp()');

    stopCountdown();
    state.testActive = false;

    /* Show time-up modal */
    const modal = document.getElementById('timeUpModal');
    if (modal) {
      modal.classList.remove('hidden');
    }

    /* Auto-submit after 2.5 seconds */
    setTimeout(function () {
      confirmSubmit();
    }, 2500);
  }

  /* ══════════════════════════════════════════════════════════
     MOBILE PALETTE TOGGLE
  ══════════════════════════════════════════════════════════ */
  function openPaletteOnMobile() {
    const palette = document.getElementById('questionPalette');
    const overlay = document.getElementById('paletteOverlay');
    const toggleBtn = document.getElementById('paletteToggleBtn');

    if (palette) {
      palette.classList.add('open');
    }
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.classList.add('visible');
    }
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', 'true');
    }
  }

  function closePaletteOnMobile() {
    const palette = document.getElementById('questionPalette');
    const overlay = document.getElementById('paletteOverlay');
    const toggleBtn = document.getElementById('paletteToggleBtn');

    if (palette) {
      palette.classList.remove('open');
    }
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.classList.remove('visible');
    }
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  }

  /* ══════════════════════════════════════════════════════════
     BIND ALL EVENTS
  ══════════════════════════════════════════════════════════ */
  function bindEvents() {
    console.log('MockEngine: bindEvents()');

    /* Previous button */
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', goToPrev);
    } else {
      console.warn('MockEngine: #prevBtn not found');
    }

    /* Next button */
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', goToNext);
    } else {
      console.warn('MockEngine: #nextBtn not found');
    }

    /* Submit header button */
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', openSubmitModal);
    } else {
      console.warn('MockEngine: #submitBtn not found');
    }

    /* Exit button → open submit modal */
    const exitBtn = document.getElementById('exitBtn');
    if (exitBtn) {
      exitBtn.addEventListener('click', function () {
        if (state.testActive) {
          openSubmitModal();
        }
      });
    } else {
      console.warn('MockEngine: #exitBtn not found');
    }

    /* Mark for review checkbox */
    const reviewCb = document.getElementById('markReviewCheckbox');
    if (reviewCb) {
      reviewCb.addEventListener('change', function () {
        handleMarkReview(this.checked);
      });
    } else {
      console.warn('MockEngine: #markReviewCheckbox not found');
    }

    /* Clear response button */
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearCurrentResponse);
    } else {
      console.warn('MockEngine: #clearBtn not found');
    }

    /* Modal — confirm submit */
    const confirmBtn = document.getElementById('confirmSubmit');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', confirmSubmit);
    } else {
      console.warn('MockEngine: #confirmSubmit not found');
    }

    /* Modal — cancel submit */
    const cancelBtn = document.getElementById('cancelSubmit');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeSubmitModal);
    } else {
      console.warn('MockEngine: #cancelSubmit not found');
    }

    /* Modal overlay click to close */
    const modalOverlay = document.getElementById('submitModalOverlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', closeSubmitModal);
    }

    /* Mobile palette toggle */
    const paletteToggleBtn = document.getElementById('paletteToggleBtn');
    if (paletteToggleBtn) {
      paletteToggleBtn.addEventListener('click', openPaletteOnMobile);
    } else {
      console.warn('MockEngine: #paletteToggleBtn not found');
    }

    /* Palette close button */
    const paletteClose = document.getElementById('paletteClose');
    if (paletteClose) {
      paletteClose.addEventListener('click', closePaletteOnMobile);
    } else {
      console.warn('MockEngine: #paletteClose not found');
    }

    /* Overlay tap → close palette */
    const paletteOverlay = document.getElementById('paletteOverlay');
    if (paletteOverlay) {
      paletteOverlay.addEventListener('click', closePaletteOnMobile);
    }

    /* Keyboard shortcuts */
    document.addEventListener('keydown', handleKeyboard);

    console.log('MockEngine: All events bound');
  }

  /* ── Keyboard Navigation ───────────────────────────────── */
  function handleKeyboard(e) {
    /* Don't intercept when typing in input */
    if (e.target && e.target.tagName === 'INPUT') return;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        goToNext();
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        goToPrev();
        break;

      case 'Escape':
        closeSubmitModal();
        closePaletteOnMobile();
        break;

      default:
        break;
    }
  }

  /* ── Before Unload Guard ───────────────────────────────── */
  function onBeforeUnload(e) {
    if (state.testActive && !state.submitted) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  }

  /* ══════════════════════════════════════════════════════════
     UI UTILITY HELPERS
  ══════════════════════════════════════════════════════════ */
  function setTextSafe(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = text;
    } else {
      console.warn('MockEngine: setTextSafe — element not found:', elementId);
    }
  }

  function setTestTitle(title) {
    const el = document.getElementById('testTitle');
    if (el) {
      el.textContent = title;
    }
    document.title = title + ' | WB ANM GNM 2026';
  }

  function showQuestionLoading(show) {
    const loadingEl = document.getElementById('questionLoading');
    const cardEl    = document.getElementById('questionCard');
    const navEl     = document.getElementById('navigationControls');

    if (loadingEl) {
      loadingEl.style.display = show ? 'flex' : 'none';
    }
    if (cardEl) {
      if (show) {
        cardEl.classList.add('hidden');
      }
    }
    if (navEl) {
      navEl.style.visibility = show ? 'hidden' : 'visible';
    }
  }

  function showFatalError(message) {
    console.error('MockEngine: FATAL —', message);

    /* Stop timer if running */
    stopCountdown();

    /* Replace page content */
    const body = document.body;
    if (!body) return;

    body.innerHTML =
      '<div style="' +
        'display:flex;flex-direction:column;align-items:center;' +
        'justify-content:center;min-height:100vh;padding:24px;' +
        'font-family:sans-serif;text-align:center;background:#fff8f8">' +
      '<svg width="64" height="64" viewBox="0 0 24 24" fill="none"' +
        ' stroke="#f44336" stroke-width="2" style="margin-bottom:20px">' +
        '<circle cx="12" cy="12" r="10"/>' +
        '<line x1="12" y1="8" x2="12" y2="12"/>' +
        '<line x1="12" y1="16" x2="12.01" y2="16"/>' +
      '</svg>' +
      '<h2 style="color:#d32f2f;font-size:20px;margin-bottom:12px">' +
        'পরীক্ষা লোড হয়নি' +
      '</h2>' +
      '<p style="color:#757575;font-size:15px;max-width:400px;' +
        'margin-bottom:24px;line-height:1.6">' +
        escapeHtml(message) +
      '</p>' +
      '<button onclick="window.location.href=\'./index.html\'"' +
        ' style="padding:12px 28px;background:#e91e63;color:white;' +
        'border:none;border-radius:8px;font-size:15px;cursor:pointer">' +
        'মক টেস্ট তালিকায় ফিরুন' +
      '</button>' +
      '</div>';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Format Seconds to MM:SS ───────────────────────────── */
  function formatSeconds(totalSeconds) {
    if (
      typeof totalSeconds !== 'number' ||
      isNaN(totalSeconds) ||
      totalSeconds < 0
    ) {
      return '00:00';
    }

    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return (
      String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0')
    );
  }

}());