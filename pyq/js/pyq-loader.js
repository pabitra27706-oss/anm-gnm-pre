/* ═══════════════════════════════════════════════════════════════
   PYQ-LOADER.JS
   Purpose : Load a question paper JSON and drive the viewer UI
   Author  : WB ANM GNM 2026 Preparation Platform
   Depends : pyq/data/{paperId}.json  |  pyq-scorer.js (for submit)
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────
   NAMESPACE
───────────────────────────────────────── */
const PYQLoader = (() => {

  /* ══════════════════════════════════════
     STATE
  ══════════════════════════════════════ */
  let _state = {
    paperId        : null,    // e.g. "2021-1"
    paperMeta      : null,    // { paperId, title, questions:[] }
    questions      : [],      // full question array
    currentIndex   : 0,       // 0-based index of current question
    answers        : {},      // { [questionId]: [optionIndex, ...] | null }
    markedForReview: new Set(), // Set of question IDs marked for review
    isSubmitted    : false,   // true after exam submitted
    timerInterval  : null,    // setInterval handle
    secondsLeft    : 90 * 60, // 90 minutes default
    mobilePaletteOpen: false,
  };

  /* ── DOM element cache ── */
  let _els = {};

  /* ── Bengali digit map ── */
  const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];

  /* ══════════════════════════════════════
     UTILITY FUNCTIONS
  ══════════════════════════════════════ */

  /** Convert number to Bengali digits */
  function toBn(num) {
    return String(num)
      .split('')
      .map(ch => (/\d/.test(ch) ? BN_DIGITS[+ch] : ch))
      .join('');
  }

  /** Escape HTML to prevent XSS */
  function esc(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str ?? '')));
    return d.innerHTML;
  }

  /** Bengali option letters */
  const OPTION_LETTERS = ['ক', 'খ', 'গ', 'ঘ'];

  /** Subject ID → Bengali label */
  const SUBJECT_MAP = {
    'life-science'     : 'জীবন বিজ্ঞান',
    'physical-science' : 'ভৌত বিজ্ঞান',
    'mathematics'      : 'গণিত',
    'english'          : 'ইংরেজি',
    'general-knowledge': 'সাধারণ জ্ঞান',
    'logical-reasoning': 'যুক্তিবিদ্যা',
  };

  /** Announce to screen readers */
  function announce(msg) {
    const el = document.getElementById('sr-announcer');
    if (el) {
      el.textContent = '';
      requestAnimationFrame(() => { el.textContent = msg; });
    }
  }

  /* ══════════════════════════════════════
     STEP 1 — GET PAPER ID FROM URL
  ══════════════════════════════════════ */
  function getPaperIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    const id     = params.get('paper');
    if (!id) {
      throw new Error('URL-এ কোনো প্রশ্নপত্র ID নেই। ?paper=XXXX দিন।');
    }
    /* Basic validation — only alphanumeric + dash */
    if (!/^[\w-]{1,20}$/.test(id)) {
      throw new Error('অবৈধ প্রশ্নপত্র ID।');
    }
    return id;
  }

  /* ══════════════════════════════════════
     STEP 2 — LOAD PAPER JSON
  ══════════════════════════════════════ */
  async function loadPaper(paperId) {
    showLoadingState();

    try {
      const url      = `data/${paperId}.json`;
      const response = await fetch(url, {
        method:  'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(
          `প্রশ্নপত্র পাওয়া যায়নি (${response.status}).`
        );
      }

      const data = await response.json();

      /* Validate */
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('প্রশ্নপত্রের ফরম্যাট সঠিক নয়।');
      }
      if (data.questions.length === 0) {
        throw new Error('প্রশ্নপত্রে কোনো প্রশ্ন নেই।');
      }

      /* Store state */
      _state.paperId   = paperId;
      _state.paperMeta = data;
      _state.questions = data.questions;

      /* Initialize answers object — all null */
      _state.answers = {};
      data.questions.forEach(q => {
        _state.answers[q.id] = null;
      });

      /* Update page title */
      document.title = `${data.title} | WB ANM GNM 2026`;

      /* Update header */
      const titleEl    = document.getElementById('paper-title');
      const subtitleEl = document.getElementById('paper-subtitle');
      if (titleEl)    titleEl.textContent    = data.title || paperId;
      if (subtitleEl) subtitleEl.textContent =
        `${toBn(data.questions.length)}টি প্রশ্ন · ১১৫ নম্বর · ৯০ মিনিট`;

      /* Setup UI */
      setupPalette();
      setupTimer();
      renderQuestion(0);

    } catch (err) {
      console.error('[PYQLoader] Load error:', err);
      showErrorState(err.message);
    }
  }

  /* ══════════════════════════════════════
     STEP 3 — SETUP QUESTION PALETTE
  ══════════════════════════════════════ */
  function setupPalette() {
    const cat1Container = document.getElementById('palette-cat1');
    const cat2Container = document.getElementById('palette-cat2');

    if (!cat1Container || !cat2Container) return;

    cat1Container.innerHTML = '';
    cat2Container.innerHTML = '';

    _state.questions.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.type            = 'button';
      btn.className       = 'palette-btn';
      btn.dataset.qid     = q.id;
      btn.dataset.idx     = idx;
      btn.dataset.state   = 'not-attempted';
      btn.setAttribute('aria-label', `প্রশ্ন ${idx + 1}`);
      btn.textContent     = toBn(idx + 1);

      btn.addEventListener('click', () => {
        /* Close mobile palette if open */
        if (_state.mobilePaletteOpen) toggleMobilePalette();
        goToQuestion(idx);
      });

      /* Cat-1 → first container, Cat-2 → second */
      if (q.category === 1) {
        cat1Container.appendChild(btn);
      } else {
        cat2Container.appendChild(btn);
      }
    });

    /* Also build mobile palette body */
    syncMobilePalette();
  }

  /** Update a single palette button's visual state */
  function updatePaletteButton(questionId, idx) {
    /* Update both desktop and mobile palette */
    const btns = document.querySelectorAll(
      `[data-qid="${questionId}"]`
    );

    const hasAnswer  = _state.answers[questionId] !== null &&
                       (_state.answers[questionId] ?? []).length > 0;
    const isReview   = _state.markedForReview.has(questionId);
    const isCurrent  = idx === _state.currentIndex;

    let stateStr = 'not-attempted';

    if (isCurrent) {
      stateStr = 'current';
    } else if (hasAnswer && isReview) {
      stateStr = 'attempted-review';
    } else if (isReview) {
      stateStr = 'review';
    } else if (hasAnswer) {
      stateStr = 'attempted';
    }

    btns.forEach(btn => {
      btn.dataset.state = stateStr;
    });
  }

  /** Refresh ALL palette buttons */
  function refreshAllPaletteButtons() {
    _state.questions.forEach((q, idx) => {
      updatePaletteButton(q.id, idx);
    });
    updateStatsCounter();
  }

  /** Update answered/review counters */
  function updateStatsCounter() {
    let attempted = 0;
    let review    = 0;

    _state.questions.forEach(q => {
      const hasAns = _state.answers[q.id] !== null &&
                     (_state.answers[q.id] ?? []).length > 0;
      if (hasAns)                        attempted++;
      if (_state.markedForReview.has(q.id)) review++;
    });

    const aEl = document.getElementById('stat-attempted-count');
    const rEl = document.getElementById('stat-review-count');
    if (aEl) aEl.textContent = toBn(attempted);
    if (rEl) rEl.textContent = toBn(review);
  }

  /* ══════════════════════════════════════
     STEP 4 — RENDER QUESTION
  ══════════════════════════════════════ */
  function renderQuestion(index) {
    if (index < 0 || index >= _state.questions.length) return;

    /* Update previous button's palette state before moving */
    if (_state.currentIndex !== index) {
      const prevQ = _state.questions[_state.currentIndex];
      if (prevQ) updatePaletteButton(prevQ.id, _state.currentIndex);
    }

    _state.currentIndex = index;
    const q             = _state.questions[index];
    const isReview      = _state.isSubmitted;

    /* Show correct card */
    const questionCard = document.getElementById('question-card');
    const reviewCard   = document.getElementById('review-card');

    if (!isReview) {
      /* ── EXAM MODE ── */
      questionCard?.classList.remove('hidden');
      reviewCard?.classList.add('hidden');
      renderExamQuestion(q, index);
    } else {
      /* ── REVIEW MODE ── */
      questionCard?.classList.add('hidden');
      reviewCard?.classList.remove('hidden');
      renderReviewQuestion(q, index);
    }

    /* Update current button in palette */
    updatePaletteButton(q.id, index);

    /* Update progress bar */
    updateProgressBar(index);

    /* Update nav buttons */
    updateNavButtons(index);

    /* Scroll to top of question container */
    document.getElementById('question-container')?.scrollIntoView({
      behavior: 'smooth', block: 'nearest'
    });

    /* Announce for screen readers */
    announce(`প্রশ্ন ${toBn(index + 1)} — ${q.question?.substring(0, 60)}`);
  }

  /* ─────────────────────────────────────
     RENDER EXAM QUESTION (answering mode)
  ───────────────────────────────────── */
  function renderExamQuestion(q, index) {
    /* Question number + category badge */
    const numEl = document.getElementById('question-number');
    if (numEl) numEl.textContent = `প্রশ্ন ${toBn(index + 1)}`;

    const catBadge = document.getElementById('question-cat-badge');
    if (catBadge) {
      catBadge.textContent    = `ক্যাট-${q.category === 1 ? '১' : '২'}`;
      catBadge.dataset.cat    = String(q.category);
      catBadge.className      = `cat-badge cat-badge--${q.category}`;
    }

    /* Subject badge */
    const subBadge = document.getElementById('question-subject');
    if (subBadge) {
      subBadge.textContent =
        SUBJECT_MAP[q.subject] || q.subject || '';
    }

    /* Progress text */
    const progText = document.getElementById('question-progress-text');
    if (progText) {
      progText.textContent =
        `${toBn(index + 1)} / ${toBn(_state.questions.length)}`;
    }

    /* Question text */
    const qTextEl = document.getElementById('question-text');
    if (qTextEl) qTextEl.textContent = q.question || '';

    /* Cat-2 hint */
    const hint = document.getElementById('cat2-hint');
    if (hint) {
      if (q.category === 2) hint.classList.remove('hidden');
      else                  hint.classList.add('hidden');
    }

    /* Options */
    renderOptions(q);

    /* Mark-for-review button state */
    const reviewBtn = document.getElementById('mark-review-btn');
    if (reviewBtn) {
      const marked = _state.markedForReview.has(q.id);
      reviewBtn.setAttribute('aria-pressed', String(marked));
      reviewBtn.classList.toggle('is-marked', marked);
    }
  }

  /* ─────────────────────────────────────
     RENDER OPTIONS
  ───────────────────────────────────── */
  function renderOptions(q) {
    const container = document.getElementById('options-list');
    if (!container) return;

    container.innerHTML = '';

    const inputType     = q.category === 1 ? 'radio' : 'checkbox';
    const inputName     = `q_${q.id}`;
    const savedAnswers  = _state.answers[q.id] || [];

    q.options.forEach((optText, optIdx) => {
      /* ── Wrapper ── */
      const item = document.createElement('div');
      item.className =
        `option-item ${inputType === 'checkbox' ? 'option-item--checkbox' : ''}`;

      /* ── Input (hidden native) ── */
      const input       = document.createElement('input');
      input.type        = inputType;
      input.name        = inputName;
      input.id          = `opt_${q.id}_${optIdx}`;
      input.value       = String(optIdx);
      input.checked     = savedAnswers.includes(optIdx);

      /* ── Label ── */
      const label = document.createElement('label');
      label.htmlFor   = input.id;
      label.className = 'option-label';

      /* Letter indicator (ক / খ / গ / ঘ) */
      const letter = document.createElement('span');
      letter.className   = 'option-letter';
      letter.textContent = OPTION_LETTERS[optIdx] || String(optIdx + 1);
      letter.setAttribute('aria-hidden', 'true');

      /* Indicator dot/check */
      const indicator = document.createElement('span');
      indicator.className = 'option-indicator';
      indicator.setAttribute('aria-hidden', 'true');

      /* Option text */
      const text       = document.createElement('span');
      text.className   = 'option-text';
      text.textContent = optText;

      label.appendChild(letter);
      label.appendChild(indicator);
      label.appendChild(text);

      item.appendChild(input);
      item.appendChild(label);

      /* ── Change handler ── */
      input.addEventListener('change', () => saveAnswer(q, optIdx));

      container.appendChild(item);
    });
  }

  /* ─────────────────────────────────────
     RENDER REVIEW QUESTION (post-submit)
  ───────────────────────────────────── */
  function renderReviewQuestion(q, index) {
    /* Header */
    const numEl = document.getElementById('review-question-number');
    if (numEl) numEl.textContent = `প্রশ্ন ${toBn(index + 1)}`;

    const catBadge = document.getElementById('review-cat-badge');
    if (catBadge) {
      catBadge.textContent = `ক্যাট-${q.category === 1 ? '১' : '২'}`;
      catBadge.className   = `cat-badge cat-badge--${q.category}`;
    }

    /* Question text */
    const qTextEl = document.getElementById('review-question-text');
    if (qTextEl) qTextEl.textContent = q.question || '';

    /* Determine result */
    const userAnswers  = _state.answers[q.id] || [];
    const correctSet   = new Set(q.answer || []);
    const userSet      = new Set(userAnswers);

    let resultLabel = 'উত্তর দেওয়া হয়নি';
    let resultClass = 'unattempted';

    if (userAnswers.length > 0) {
      if (q.category === 1) {
        if (userAnswers[0] === q.answer[0]) {
          resultLabel = 'সঠিক ✓';
          resultClass = 'correct';
        } else {
          resultLabel = 'ভুল ✗';
          resultClass = 'wrong';
        }
      } else {
        /* Category 2 */
        const hasWrong = [...userSet].some(s => !correctSet.has(s));
        if (hasWrong) {
          resultLabel = 'ভুল ✗';
          resultClass = 'wrong';
        } else if (userAnswers.length === q.answer.length) {
          resultLabel = 'সম্পূর্ণ সঠিক ✓';
          resultClass = 'correct';
        } else {
          resultLabel = 'আংশিক সঠিক';
          resultClass = 'partial';
        }
      }
    }

    /* Result badge */
    const resultBadge = document.getElementById('review-result-badge');
    if (resultBadge) {
      resultBadge.textContent = resultLabel;
      resultBadge.className   = `review-result-badge ${resultClass}`;
    }

    /* Options with highlights */
    const optContainer = document.getElementById('review-options-list');
    if (optContainer) {
      optContainer.innerHTML = '';

      (q.options || []).forEach((optText, optIdx) => {
        const isCorrect  = correctSet.has(optIdx);
        const isSelected = userSet.has(optIdx);

        const div = document.createElement('div');
        div.className = 'review-option';

        /* Apply classes based on correctness */
        if (isCorrect)  div.classList.add('is-correct');
        if (isSelected && !isCorrect) div.classList.add('is-wrong');
        if (isSelected && isCorrect)  div.classList.add('is-user-correct');

        /* Indicator icon */
        const indicator = document.createElement('span');
        indicator.className = 'review-option__indicator';
        indicator.setAttribute('aria-hidden', 'true');

        if (isCorrect) {
          indicator.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="3"
                 stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>`;
        } else if (isSelected) {
          indicator.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="3"
                 stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>`;
        }

        /* Letter */
        const letter       = document.createElement('span');
        letter.className   = 'option-letter';
        letter.textContent = OPTION_LETTERS[optIdx] || String(optIdx + 1);

        /* Text */
        const text       = document.createElement('span');
        text.className   = 'option-text';
        text.textContent = optText;

        div.appendChild(indicator);
        div.appendChild(letter);
        div.appendChild(text);

        optContainer.appendChild(div);
      });
    }

    /* Explanation */
    const expSection = document.getElementById('review-explanation');
    const expText    = document.getElementById('review-explanation-text');
    if (expSection && expText) {
      if (q.explanation) {
        expText.textContent = q.explanation;
        expSection.classList.remove('hidden');
      } else {
        expSection.classList.add('hidden');
      }
    }
  }

  /* ══════════════════════════════════════
     SAVE ANSWER
  ══════════════════════════════════════ */
  function saveAnswer(q, selectedOptionIdx) {
    if (_state.isSubmitted) return;

    if (q.category === 1) {
      /* Single correct — replace */
      _state.answers[q.id] = [selectedOptionIdx];

    } else {
      /* Multiple correct — toggle */
      const current = new Set(_state.answers[q.id] || []);

      if (current.has(selectedOptionIdx)) {
        current.delete(selectedOptionIdx);
      } else {
        current.add(selectedOptionIdx);
      }

      _state.answers[q.id] =
        current.size > 0 ? [...current].sort((a, b) => a - b) : null;
    }

    /* Refresh palette button for this question */
    updatePaletteButton(q.id, _state.currentIndex);
    updateStatsCounter();
  }

  /* ══════════════════════════════════════
     CLEAR ANSWER
  ══════════════════════════════════════ */
  function clearAnswer() {
    if (_state.isSubmitted) return;

    const q = _state.questions[_state.currentIndex];
    if (!q) return;

    _state.answers[q.id] = null;

    /* Uncheck all inputs for this question */
    document.querySelectorAll(`input[name="q_${q.id}"]`)
      .forEach(inp => { inp.checked = false; });

    updatePaletteButton(q.id, _state.currentIndex);
    updateStatsCounter();
    announce('উত্তর মুছে দেওয়া হয়েছে।');
  }

  /* ══════════════════════════════════════
     MARK FOR REVIEW
  ══════════════════════════════════════ */
  function toggleMarkForReview() {
    if (_state.isSubmitted) return;

    const q = _state.questions[_state.currentIndex];
    if (!q) return;

    if (_state.markedForReview.has(q.id)) {
      _state.markedForReview.delete(q.id);
      announce('পরে দেখুন চিহ্ন সরানো হয়েছে।');
    } else {
      _state.markedForReview.add(q.id);
      announce('প্রশ্নটি পরে দেখুন হিসেবে চিহ্নিত করা হয়েছে।');
    }

    /* Update button appearance */
    const btn = document.getElementById('mark-review-btn');
    if (btn) {
      const marked = _state.markedForReview.has(q.id);
      btn.setAttribute('aria-pressed', String(marked));
    }

    updatePaletteButton(q.id, _state.currentIndex);
    updateStatsCounter();
  }

  /* ══════════════════════════════════════
     NAVIGATE QUESTION
  ══════════════════════════════════════ */
  function navigateQuestion(direction) {
    const total = _state.questions.length;

    if (direction === 'next') {
      if (_state.currentIndex < total - 1) {
        renderQuestion(_state.currentIndex + 1);
      }
    } else if (direction === 'prev') {
      if (_state.currentIndex > 0) {
        renderQuestion(_state.currentIndex - 1);
      }
    }
  }

  /** Jump directly to a specific index */
  function goToQuestion(index) {
    if (index >= 0 && index < _state.questions.length) {
      renderQuestion(index);
    }
  }

  /* ══════════════════════════════════════
     UPDATE NAV BUTTONS
  ══════════════════════════════════════ */
  function updateNavButtons(index) {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const total   = _state.questions.length;

    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === total - 1;
  }

  /* ══════════════════════════════════════
     UPDATE PROGRESS BAR
  ══════════════════════════════════════ */
  function updateProgressBar(index) {
    const fill = document.getElementById('progress-bar-fill');
    const bar  = document.getElementById('progress-bar-wrap');
    const pct  = ((index + 1) / _state.questions.length) * 100;

    if (fill) fill.style.width = `${pct.toFixed(1)}%`;

    if (bar) {
      bar.setAttribute('aria-valuenow', String(Math.round(pct)));
      bar.setAttribute('aria-valuetext',
        `${toBn(index + 1)} এর মধ্যে ${toBn(_state.questions.length)}`
      );
    }
  }

  /* ══════════════════════════════════════
     TIMER
  ══════════════════════════════════════ */
  function setupTimer() {
    updateTimerDisplay();

    _state.timerInterval = setInterval(() => {
      _state.secondsLeft--;

      if (_state.secondsLeft <= 0) {
        _state.secondsLeft = 0;
        clearInterval(_state.timerInterval);
        updateTimerDisplay();
        /* Auto-submit when time runs out */
        announce('সময় শেষ হয়ে গেছে! স্বয়ংক্রিয়ভাবে জমা দেওয়া হচ্ছে।');
        setTimeout(() => {
          if (!_state.isSubmitted && window.PYQScorer) {
            PYQScorer.submitExam();
          }
        }, 1500);
        return;
      }

      updateTimerDisplay();

      /* Warning styles at 10 min */
      if (_state.secondsLeft === 600) {
        const timerEl = document.getElementById('timer-display');
        if (timerEl) timerEl.classList.add('timer-warning');
        announce('সতর্কতা: মাত্র ১০ মিনিট বাকি!');
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const el  = document.getElementById('timer-text');
    if (!el) return;

    const m   = Math.floor(_state.secondsLeft / 60);
    const s   = _state.secondsLeft % 60;
    const mBn = toBn(String(m).padStart(2, '0'));
    const sBn = toBn(String(s).padStart(2, '0'));

    el.textContent = `${mBn}:${sBn}`;
  }

  function stopTimer() {
    if (_state.timerInterval) {
      clearInterval(_state.timerInterval);
      _state.timerInterval = null;
    }
  }

  /* ══════════════════════════════════════
     MOBILE PALETTE TOGGLE
  ══════════════════════════════════════ */
  function toggleMobilePalette() {
    const overlay = document.getElementById('mobile-palette-overlay');
    if (!overlay) return;

    _state.mobilePaletteOpen = !_state.mobilePaletteOpen;

    if (_state.mobilePaletteOpen) {
      overlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';

      /* Sync mobile palette content */
      syncMobilePalette();

      /* Update toggle button aria */
      const toggleBtn = document.getElementById('palette-toggle-btn');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');

      /* Focus the close button */
      const closeBtn = overlay.querySelector('.mobile-palette-close');
      if (closeBtn) closeBtn.focus();

    } else {
      overlay.classList.add('hidden');
      document.body.style.overflow = '';

      const toggleBtn = document.getElementById('palette-toggle-btn');
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.focus();
      }
    }
  }

  /** Copy palette state into mobile sheet */
  function syncMobilePalette() {
    const mobileBody = document.getElementById('mobile-palette-body');
    if (!mobileBody) return;

    /* Clone the desktop palette's category blocks */
    const cat1Block = document.getElementById('palette-cat1-block');
    const cat2Block = document.getElementById('palette-cat2-block');
    const legend    = document.querySelector('.palette-legend');

    mobileBody.innerHTML = '';

    if (cat1Block) {
      mobileBody.appendChild(cat1Block.cloneNode(true));
    }
    if (cat2Block) {
      mobileBody.appendChild(cat2Block.cloneNode(true));
    }
    if (legend) {
      mobileBody.appendChild(legend.cloneNode(true));
    }

    /* Re-attach click handlers on cloned buttons */
    mobileBody.querySelectorAll('.palette-btn').forEach(btn => {
      const idx = parseInt(btn.dataset.idx, 10);
      btn.addEventListener('click', () => {
        toggleMobilePalette();
        goToQuestion(idx);
      });
    });
  }

  /* ══════════════════════════════════════
     SHOW / HIDE UI STATES
  ══════════════════════════════════════ */
  function showLoadingState() {
    document.getElementById('qc-loading')?.classList.remove('hidden');
    document.getElementById('qc-error')?.classList.add('hidden');
    document.getElementById('question-card')?.classList.add('hidden');
    document.getElementById('review-card')?.classList.add('hidden');
  }

  function showErrorState(msg) {
    document.getElementById('qc-loading')?.classList.add('hidden');
    document.getElementById('question-card')?.classList.add('hidden');
    document.getElementById('review-card')?.classList.add('hidden');

    const errEl  = document.getElementById('qc-error');
    const msgEl  = document.getElementById('qc-error-msg');

    if (errEl)  errEl.classList.remove('hidden');
    if (msgEl)  msgEl.textContent = msg || 'প্রশ্নপত্র লোড হয়নি।';
  }

  function hideLoadingShowCard() {
    document.getElementById('qc-loading')?.classList.add('hidden');
    document.getElementById('question-card')?.classList.remove('hidden');
  }

  /* ══════════════════════════════════════
     PUBLIC: RETRY LOAD
  ══════════════════════════════════════ */
  function retryLoad() {
    const paperId = getPaperIdFromURL();
    loadPaper(paperId);
  }

  /* ══════════════════════════════════════
     KEYBOARD NAVIGATION
  ══════════════════════════════════════ */
  function setupKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      /* Don't intercept when typing in inputs */
      if (e.target.tagName === 'INPUT') return;
      if (_state.isSubmitted) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          navigateQuestion('next');
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          navigateQuestion('prev');
          break;
        case 'r':
        case 'R':
          /* R key = mark for review */
          toggleMarkForReview();
          break;
        case 'Escape':
          if (_state.mobilePaletteOpen) toggleMobilePalette();
          break;
      }
    });
  }

  /* ══════════════════════════════════════
     CLOSE OVERLAY ON BACKDROP CLICK
  ══════════════════════════════════════ */
  function setupOverlayClose() {
    const overlay = document.getElementById('mobile-palette-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) toggleMobilePalette();
      });
    }
  }

  /* ══════════════════════════════════════
     INIT
  ══════════════════════════════════════ */
  function init() {
    let paperId;

    try {
      paperId = getPaperIdFromURL();
    } catch (err) {
      showErrorState(err.message);
      return;
    }

    setupKeyboardNav();
    setupOverlayClose();
    loadPaper(paperId);
  }

  /* ══════════════════════════════════════
     BOOTSTRAP
  ══════════════════════════════════════ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ══════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════ */
  return {
    /* Called by HTML onclick attributes */
    navigateQuestion,
    toggleMarkForReview,
    clearAnswer,
    toggleMobilePalette,
    retryLoad,

    /* Called by pyq-scorer.js */
    getState     : () => ({ ..._state }),
    getQuestions : () => _state.questions,
    getAnswers   : () => _state.answers,
    getPaperId   : () => _state.paperId,
    getPaperMeta : () => _state.paperMeta,

    /* Called by scorer after submit */
    setSubmitted() {
      _state.isSubmitted = true;
      stopTimer();
      refreshAllPaletteButtons();

      /* Switch to review mode for current question */
      renderQuestion(_state.currentIndex);
    },

    /* Switch to review mode at given index */
    goToQuestion,
    refreshAllPaletteButtons,
  };

})();