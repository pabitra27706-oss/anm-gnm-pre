/* ═══════════════════════════════════════════════════════════════
   PYQ-SCORER.JS
   Purpose : Calculate scores, show result modal, manage submit flow
   Author  : WB ANM GNM 2026 Preparation Platform
   Depends : pyq-loader.js (must load first)

   SCORING RULES:
   ─────────────────────────────────────────
   Category-1 (85 questions, single correct):
     Correct   → +1.00
     Wrong     → -0.25
     Skipped   → 0

   Category-2 (15 questions, multi-correct):
     All correct, none wrong  → +2.00 (full)
     Some correct, none wrong → +2 × (got/total)  (partial)
     Any wrong option marked  → 0  (even if some correct)
     Skipped                  → 0
   ─────────────────────────────────────────
   Maximum possible score = 85 + 30 = 115 marks
═══════════════════════════════════════════════════════════════ */

'use strict';

const PYQScorer = (() => {

  /* ══════════════════════════════════════
     PRIVATE STATE
  ══════════════════════════════════════ */

  /** Stores the last computed result for print access */
  let _lastResult = null;

  /* ─────────────────────────────────────
     BENGALI NUMBER HELPER
  ───────────────────────────────────── */
  const BN = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];

  function toBn(num) {
    /* Handle decimals like 21.50 */
    return String(
      typeof num === 'number' ? num.toFixed(2).replace(/\.?0+$/, '') : num
    )
      .split('')
      .map(ch => (/\d/.test(ch) ? BN[+ch] : ch))
      .join('');
  }

  function toBnInt(num) {
    return String(Math.round(num))
      .split('')
      .map(ch => (/\d/.test(ch) ? BN[+ch] : ch))
      .join('');
  }

  /* ══════════════════════════════════════
     CORE SCORING FUNCTIONS
  ══════════════════════════════════════ */

  /* ─────────────────────────────────────
     CATEGORY-1 SCORER
     Single correct MCQ
     +1 correct, -0.25 wrong, 0 skipped
  ───────────────────────────────────── */
  function scoreCat1(questions, answers) {
    let score   = 0;
    let correct = 0;
    let wrong   = 0;
    let skipped = 0;

    questions.forEach(q => {
      const userAns = answers[q.id];

      /* Skipped — no answer recorded */
      if (!userAns || userAns.length === 0) {
        skipped++;
        return;
      }

      /* Cat-1 must have exactly one answer */
      const userChoice   = userAns[0];
      const correctChoice = q.answer[0];

      if (userChoice === correctChoice) {
        score += 1;
        correct++;
      } else {
        score -= 0.25;
        wrong++;
      }
    });

    /* Score cannot go below 0 — floor at 0 */
    return {
      score  : Math.max(0, score),
      correct,
      wrong,
      skipped,
      rawScore: score,   /* Keep raw for display purposes */
    };
  }

  /* ─────────────────────────────────────
     CATEGORY-2 SCORER
     Multi-correct MCQ
     Full / Partial / Zero based on rules
  ───────────────────────────────────── */
  function scoreCat2(questions, answers) {
    let score       = 0;
    let fullCorrect = 0;   /* All correct options selected */
    let partial     = 0;   /* Some correct, none wrong */
    let wrong       = 0;   /* Any wrong option selected */
    let skipped     = 0;

    questions.forEach(q => {
      const userAns = answers[q.id];

      /* Skipped */
      if (!userAns || userAns.length === 0) {
        skipped++;
        return;
      }

      const correctSet = new Set(q.answer);
      const userSet    = new Set(userAns);

      /* Check if any wrong option was selected */
      const hasWrongSelection = [...userSet].some(
        selected => !correctSet.has(selected)
      );

      if (hasWrongSelection) {
        /* Zero marks — wrong option included */
        wrong++;
        return;
      }

      /* Count how many correct options the user got */
      const selectedCorrectCount = [...userSet].filter(
        s => correctSet.has(s)
      ).length;

      const totalCorrect = correctSet.size;

      /* Partial credit formula:  2 × (correct selected / total correct) */
      const questionScore = 2 * (selectedCorrectCount / totalCorrect);
      score += questionScore;

      if (selectedCorrectCount === totalCorrect) {
        fullCorrect++;
      } else {
        partial++;
      }
    });

    return {
      score      : score,
      fullCorrect,
      partial,
      wrong,
      skipped,
    };
  }

  /* ─────────────────────────────────────
     TOTAL SCORE CALCULATOR
     Combines Cat-1 and Cat-2 results
  ───────────────────────────────────── */
  function calculateTotal(questions, answers) {
    const cat1Questions = questions.filter(q => q.category === 1);
    const cat2Questions = questions.filter(q => q.category === 2);

    const cat1Result = scoreCat1(cat1Questions, answers);
    const cat2Result = scoreCat2(cat2Questions, answers);

    const totalScore = cat1Result.score + cat2Result.score;

    /* Aggregate attempt stats across both categories */
    const totalCorrect    = cat1Result.correct + cat2Result.fullCorrect;
    const totalWrong      = cat1Result.wrong    + cat2Result.wrong;
    const totalSkipped    = cat1Result.skipped  + cat2Result.skipped;
    const totalAttempted  = questions.length - totalSkipped;
    const percentageScore = (totalScore / 115) * 100;

    return {
      cat1Score      : cat1Result.score,
      cat2Score      : cat2Result.score,
      totalScore     : parseFloat(totalScore.toFixed(2)),
      maxScore       : 115,
      percentageScore: parseFloat(percentageScore.toFixed(2)),

      /* Category detail */
      cat1Detail     : cat1Result,
      cat2Detail     : cat2Result,

      /* Aggregate counts */
      totalCorrect,
      totalWrong,
      totalSkipped,
      totalAttempted,
      totalQuestions : questions.length,
    };
  }

  /* ══════════════════════════════════════
     SUBMIT FLOW
  ══════════════════════════════════════ */

  /* ─────────────────────────────────────
     CONFIRM SUBMIT MODAL
     Shows a summary before final submit
  ───────────────────────────────────── */
  function confirmSubmit() {
    /* Get current state from loader */
    const state     = PYQLoader.getState();
    const questions = PYQLoader.getQuestions();
    const answers   = PYQLoader.getAnswers();

    if (state.isSubmitted) return;

    /* Calculate quick stats for the confirm dialog */
    let attempted = 0;
    let review    = 0;

    questions.forEach(q => {
      const hasAns = answers[q.id] !== null &&
                     (answers[q.id] ?? []).length > 0;
      if (hasAns)                             attempted++;
      if (state.markedForReview?.has(q.id))  review++;
    });

    const unattempted = questions.length - attempted;

    /* Build summary HTML */
    const summaryEl = document.getElementById('confirm-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:0.875rem;">
          <tr>
            <td style="padding:4px 0; color:#5f6368;">মোট প্রশ্ন</td>
            <td style="padding:4px 0; font-weight:700; text-align:right;">
              ${toBn(questions.length)}
            </td>
          </tr>
          <tr>
            <td style="padding:4px 0; color:#34a853;">উত্তর দেওয়া হয়েছে</td>
            <td style="padding:4px 0; font-weight:700; color:#34a853; text-align:right;">
              ${toBn(attempted)}
            </td>
          </tr>
          <tr>
            <td style="padding:4px 0; color:#9aa0a6;">উত্তর দেওয়া হয়নি</td>
            <td style="padding:4px 0; font-weight:700; color:#9aa0a6; text-align:right;">
              ${toBn(unattempted)}
            </td>
          </tr>
          <tr>
            <td style="padding:4px 0; color:#ff9800;">পরে দেখুন চিহ্নিত</td>
            <td style="padding:4px 0; font-weight:700; color:#ff9800; text-align:right;">
              ${toBn(review)}
            </td>
          </tr>
        </table>
        <p style="margin:0.75rem 0 0; font-size:0.8rem; color:#9aa0a6;">
          জমা দেওয়ার পরে আর উত্তর পরিবর্তন করা যাবে না।
        </p>
      `;
    }

    /* Show modal */
    const modal = document.getElementById('confirm-modal');
    if (modal) {
      modal.classList.remove('hidden');

      /* Focus the cancel button for accessibility */
      const cancelBtn = modal.querySelector('.modal-btn--cancel');
      if (cancelBtn) {
        requestAnimationFrame(() => cancelBtn.focus());
      }

      /* Trap focus within modal */
      trapFocus(modal);
    }
  }

  /* ─────────────────────────────────────
     CLOSE CONFIRM MODAL
  ───────────────────────────────────── */
  function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.add('hidden');
    releaseFocus();
  }

  /* ─────────────────────────────────────
     SUBMIT EXAM
     Called when user confirms submission
  ───────────────────────────────────── */
  function submitExam() {
    /* Close confirm modal */
    closeConfirmModal();

    /* Get data from loader */
    const questions = PYQLoader.getQuestions();
    const answers   = PYQLoader.getAnswers();
    const paperMeta = PYQLoader.getPaperMeta();

    /* Calculate result */
    const result = calculateTotal(questions, answers);

    /* Store for print access */
    _lastResult = {
      ...result,
      paperTitle: paperMeta?.title || 'প্রশ্নপত্র',
      paperId   : PYQLoader.getPaperId(),
    };

    /* Tell loader exam is done (stops timer, switches to review mode) */
    PYQLoader.setSubmitted();

    /* Refresh all palette buttons to show correct/wrong (optional color) */
    PYQLoader.refreshAllPaletteButtons();

    /* Show result modal */
    showResultModal(result, paperMeta?.title || 'প্রশ্নপত্র');
  }

  /* ─────────────────────────────────────
     SHOW RESULT MODAL
     Populates all result fields and shows modal
  ───────────────────────────────────── */
  function showResultModal(result, paperTitle) {
    const modal = document.getElementById('result-modal');
    if (!modal) return;

    /* ── Paper name ── */
    const paperNameEl = document.getElementById('result-paper-name');
    if (paperNameEl) paperNameEl.textContent = paperTitle;

    /* ── Score circle ── */
    const scorePct = (result.totalScore / 115) * 100;
    const circleEl = document.getElementById('result-score-circle');
    if (circleEl) {
      circleEl.style.setProperty(
        '--score-percent',
        `${scorePct.toFixed(1)}%`
      );
    }

    const totalScoreEl = document.getElementById('result-total-score');
    if (totalScoreEl) {
      totalScoreEl.textContent = toBn(result.totalScore);
    }

    /* ── Category scores ── */
    const cat1ScoreEl  = document.getElementById('result-cat1-score');
    const cat1DetailEl = document.getElementById('result-cat1-detail');
    const cat2ScoreEl  = document.getElementById('result-cat2-score');
    const cat2DetailEl = document.getElementById('result-cat2-detail');

    if (cat1ScoreEl) {
      cat1ScoreEl.textContent =
        `${toBn(result.cat1Score)} / ৮৫`;
    }

    if (cat1DetailEl) {
      const d = result.cat1Detail;
      cat1DetailEl.textContent =
        `সঠিক: ${toBn(d.correct)} · ভুল: ${toBn(d.wrong)} · বাদ: ${toBn(d.skipped)}`;
    }

    if (cat2ScoreEl) {
      cat2ScoreEl.textContent =
        `${toBn(result.cat2Score)} / ৩০`;
    }

    if (cat2DetailEl) {
      const d = result.cat2Detail;
      cat2DetailEl.textContent =
        `পূর্ণ সঠিক: ${toBn(d.fullCorrect)} · আংশিক: ${toBn(d.partial)} · ভুল: ${toBn(d.wrong)}`;
    }

    /* ── Stats ── */
    const correctEl     = document.getElementById('result-correct');
    const wrongEl       = document.getElementById('result-wrong');
    const unattemptedEl = document.getElementById('result-unattempted');
    const percentEl     = document.getElementById('result-percent');

    if (correctEl)     correctEl.textContent     = toBnInt(result.totalCorrect);
    if (wrongEl)       wrongEl.textContent       = toBnInt(result.totalWrong);
    if (unattemptedEl) unattemptedEl.textContent = toBnInt(result.totalSkipped);
    if (percentEl)     percentEl.textContent     = `${toBn(result.percentageScore)}%`;

    /* ── Animate score circle ── */
    animateScoreCircle(scorePct);

    /* ── Show modal ── */
    modal.classList.remove('hidden');

    /* Focus result modal for accessibility */
    const firstBtn = modal.querySelector('.result-btn');
    if (firstBtn) {
      requestAnimationFrame(() => firstBtn.focus());
    }

    trapFocus(modal);
  }

  /* ─────────────────────────────────────
     ANIMATE SCORE CIRCLE
     Smoothly fills the conic-gradient ring
  ───────────────────────────────────── */
  function animateScoreCircle(targetPct) {
    const circleEl = document.getElementById('result-score-circle');
    if (!circleEl) return;

    let current = 0;
    const step  = targetPct / 40; /* 40 frames */

    const tick = () => {
      current = Math.min(current + step, targetPct);
      circleEl.style.setProperty('--score-percent', `${current.toFixed(1)}%`);
      if (current < targetPct) requestAnimationFrame(tick);
    };

    /* Start after a short delay */
    setTimeout(() => requestAnimationFrame(tick), 100);
  }

  /* ─────────────────────────────────────
     VIEW ANSWERS
     Closes result modal, puts viewer in review mode
     starting from question 1
  ───────────────────────────────────── */
  function viewAnswers() {
    /* Close result modal */
    const modal = document.getElementById('result-modal');
    if (modal) modal.classList.add('hidden');
    releaseFocus();

    /* Go to first question in review mode */
    PYQLoader.goToQuestion(0);

    /* Scroll to question area */
    document.getElementById('question-container')?.scrollIntoView({
      behavior: 'smooth'
    });
  }

  /* ══════════════════════════════════════
     FOCUS TRAP  (accessibility)
     Keeps Tab focus inside the open modal
  ══════════════════════════════════════ */
  let _focusTrapHandler = null;
  let _previousFocus    = null;

  function trapFocus(modalEl) {
    /* Save where focus was before opening */
    _previousFocus = document.activeElement;

    /* Find all focusable elements inside modal */
    const focusable = modalEl.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    /* Remove old handler if any */
    releaseFocus();

    _focusTrapHandler = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        /* Shift+Tab: going backwards */
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        /* Tab: going forwards */
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', _focusTrapHandler);
  }

  function releaseFocus() {
    if (_focusTrapHandler) {
      document.removeEventListener('keydown', _focusTrapHandler);
      _focusTrapHandler = null;
    }
    /* Restore focus to where it was */
    if (_previousFocus && typeof _previousFocus.focus === 'function') {
      _previousFocus.focus();
      _previousFocus = null;
    }
  }

  /* ══════════════════════════════════════
     PUBLIC GETTER FOR PRINT
  ══════════════════════════════════════ */
  function getLastResult() {
    return _lastResult;
  }

  /* ══════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════ */
  return {
    /* Exposed to HTML onclick */
    confirmSubmit,
    closeConfirmModal,
    submitExam,
    viewAnswers,

    /* Exposed to pyq-print.js */
    getLastResult,

    /* Exposed for testing / external use */
    calculateTotal,
    scoreCat1,
    scoreCat2,
  };

})();