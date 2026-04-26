/* ============================================================
   practice/js/quiz-scorer.js
   Score calculation for practice quiz
   WB ANM GNM 2026 Preparation Platform

   UPDATED FOR NEW JSON FORMAT:
   ─────────────────────────────────────────────
   SINGLE correct (no multi field):
     correct:     +1
     wrong:       -0.25
     unattempted:  0

   MULTI correct (multi: true):
     all correct, no wrong:    +2
     some correct, no wrong:   +2 × (marked/total)   [partial]
     any wrong marked:          0
     unattempted:               0

   KEY CHANGES:
   1. question.id is STRING — used as userAnswers key
   2. question.answer is NUMBER or ARRAY
   3. question.multi === true means multi-correct
   4. userAnswers[id] is NUMBER (single) or ARRAY (multi)
   5. calculateScore returns multiCount + multiScore
   6. getDetailedResults returns isMulti + isPartial + scoreEarned
   ============================================================ */

const QuizScorer = (function () {
  'use strict';

  /* ============================================================
     CORE HELPERS
  ============================================================ */

  /**
   * isAttempted — works for single (number) and multi (array)
   * @param {Object} question
   * @param {*}      userAnswer
   * @returns {boolean}
   */
  function isAttempted(question, userAnswer) {
    if (userAnswer === undefined || userAnswer === null) {
      return false;
    }
    if (question.multi === true) {
      return Array.isArray(userAnswer) && userAnswer.length > 0;
    }
    return typeof userAnswer === 'number';
  }

  /**
   * isCorrect — full correctness check for single and multi
   * @param {Object} question
   * @param {*}      userAnswer
   * @returns {boolean}
   */
  function isCorrect(question, userAnswer) {
    if (!isAttempted(question, userAnswer)) return false;

    if (question.multi === true) {
      /* Multi: userAnswer must be array */
      if (!Array.isArray(userAnswer))         return false;
      if (!Array.isArray(question.answer))    return false;

      const userSet    = new Set(userAnswer);
      const correctSet = new Set(question.answer);

      /* Size must match AND every correct option must be selected */
      if (userSet.size !== correctSet.size)   return false;
      return [...correctSet].every(a => userSet.has(a));

    } else {
      /* Single: answer is number (or array[0] as fallback) */
      const correctAnswer = Array.isArray(question.answer)
        ? question.answer[0]
        : question.answer;
      return userAnswer === correctAnswer;
    }
  }

  /* ============================================================
     CALCULATE SCORE — FULL REWRITE
  ============================================================ */

  /**
   * Calculate total score for a completed quiz.
   *
   * @param {Array}  questions  - Question objects (new format)
   * @param {Object} answers    - { [question.id (string)]: number|array }
   * @returns {Object} Score summary with multi stats
   */
  function calculateScore(questions, answers) {
    if (!Array.isArray(questions)) {
      console.warn('[QuizScorer] questions is not an array');
      questions = [];
    }
    if (!answers || typeof answers !== 'object') {
      console.warn('[QuizScorer] answers is not an object');
      answers = {};
    }

    let correct     = 0;
    let wrong       = 0;
    let unattempted = 0;
    let rawScore    = 0;

    /* NEW: separate tracking for multi questions */
    let multiCount  = 0;   /* total multi questions in set */
    let multiScore  = 0;   /* marks earned from multi questions */

    questions.forEach((q) => {
      if (!q || typeof q.id === 'undefined') return;

      /*
        UPDATED: key is q.id (string)
        e.g. answers["eg-01-001"] not answers[0]
      */
      const userAnswer = answers[q.id];
      const attempted  = isAttempted(q, userAnswer);

      if (q.multi === true) {
        /* ════════════════════════════════════════
           MULTI-CORRECT SCORING
           ════════════════════════════════════════ */
        multiCount++;

        if (!attempted) {
          unattempted++;
          return; /* 0 marks, no penalty */
        }

        /*
          Safe array for user selection
          (selectOptionMulti always stores array but guard anyway)
        */
        const selected = new Set(
          Array.isArray(userAnswer) ? userAnswer : []
        );

        /*
          Safe array for correct answers
          (answer may be array or number in JSON)
        */
        const correctSet = new Set(
          Array.isArray(q.answer) ? q.answer : [q.answer]
        );

        /* Any wrong selection → 0 marks (no deduction) */
        const hasWrong = [...selected].some(s => !correctSet.has(s));

        if (hasWrong) {
          wrong++;
          /* score += 0 — no deduction for multi wrong */
          return;
        }

        /* Count how many correct options were selected */
        const correctCount = [...selected].filter(
          s => correctSet.has(s)
        ).length;

        if (correctCount === 0) {
          /* Edge case: empty selection after attempted check */
          unattempted++;
          return;
        }

        if (correctCount === correctSet.size) {
          /* All correct selected, no wrong → full +2 */
          correct++;
          const earned = 2;
          rawScore    += earned;
          multiScore  += earned;
        } else {
          /*
            Partial credit:
            +2 × (correctCount / totalCorrect)
            e.g. 2 of 3 correct → +1.333...
          */
          correct++; /* counted as partially correct */
          const earned = 2 * (correctCount / correctSet.size);
          rawScore    += earned;
          multiScore  += earned;
        }

      } else {
        /* ════════════════════════════════════════
           SINGLE-CORRECT SCORING
           ════════════════════════════════════════ */

        if (!attempted) {
          unattempted++;
          return; /* 0 marks */
        }

        /*
          UPDATED: answer may be number OR array in JSON
          Always normalise to number for comparison
        */
        const correctAnswer = Array.isArray(q.answer)
          ? q.answer[0]
          : q.answer;

        if (userAnswer === correctAnswer) {
          correct++;
          rawScore += 1;
        } else {
          wrong++;
          rawScore -= 0.25;
        }
      }
    });

    /* Score cannot go below 0 */
    const finalScore = Math.max(0, parseFloat(rawScore.toFixed(2)));
    const total      = questions.length;
    const percentage = total > 0
      ? ((correct / total) * 100).toFixed(1)
      : '0.0';

    return {
      score:       finalScore,
      rawScore:    parseFloat(rawScore.toFixed(2)),
      correct,
      wrong,
      unattempted,
      total,
      percentage:  parseFloat(percentage),
      maxScore:    total,
      /* NEW: multi fields for result page */
      multiCount,
      multiScore:  parseFloat(multiScore.toFixed(2)),
      grade:       getGrade(parseFloat(percentage)),
    };
  }

  /* ============================================================
     DETAILED RESULTS — FULL REWRITE
  ============================================================ */

  /**
   * Build per-question result array for review page.
   *
   * @param {Array}  questions - Question objects (new format)
   * @param {Object} answers   - { [question.id (string)]: number|array }
   * @returns {Array} Detailed result per question
   *
   * Each item:
   * {
   *   index:       number,       0-based position
   *   id:          string,       question.id (NEW: string)
   *   question:    string,
   *   options:     string[],
   *   answer:      number|array, the correct answer(s) (NEW)
   *   userAnswer:  number|array|null,
   *   isMulti:     boolean,      (NEW)
   *   isAttempted: boolean,
   *   isCorrect:   boolean,      fully correct
   *   isPartial:   boolean,      (NEW) partial credit earned
   *   isWrong:     boolean,      wrong or any-wrong for multi
   *   scoreEarned: number,       actual marks for this question
   *   explanation: string,
   *   subject:     string,       (NEW from JSON)
   *   unit:        string,       (NEW from JSON)
   *   type:        string,       (NEW from JSON)
   *   difficulty:  string,       (NEW from JSON)
   * }
   */
  function getDetailedResults(questions, answers) {
    if (!Array.isArray(questions)) return [];
    if (!answers || typeof answers !== 'object') answers = {};

    return questions.map((q, idx) => {
      if (!q) return null;

      const userAnswer = answers[q.id];
      const attempted  = isAttempted(q, userAnswer);
      const isMulti    = q.multi === true;

      let fullyCorrect = false;
      let isPartial    = false;
      let isWrong      = false;
      let scoreEarned  = 0;

      if (!attempted) {
        /* Unattempted — all flags false, score 0 */

      } else if (isMulti) {
        /* ── Multi question result ── */
        const selected = new Set(
          Array.isArray(userAnswer) ? userAnswer : []
        );
        const correctSet = new Set(
          Array.isArray(q.answer) ? q.answer : [q.answer]
        );

        const hasWrong = [...selected].some(s => !correctSet.has(s));

        if (hasWrong) {
          isWrong     = true;
          scoreEarned = 0;
        } else {
          const correctCount = [...selected].filter(
            s => correctSet.has(s)
          ).length;

          if (correctCount === correctSet.size) {
            /* Full marks */
            fullyCorrect = true;
            scoreEarned  = 2;
          } else if (correctCount > 0) {
            /* Partial */
            isPartial   = true;
            scoreEarned = parseFloat(
              (2 * (correctCount / correctSet.size)).toFixed(4)
            );
          } else {
            /* Selected nothing valid (edge case) */
            isWrong     = true;
            scoreEarned = 0;
          }
        }

      } else {
        /* ── Single question result ── */
        const correctAnswer = Array.isArray(q.answer)
          ? q.answer[0]
          : q.answer;

        if (userAnswer === correctAnswer) {
          fullyCorrect = true;
          scoreEarned  = 1;
        } else {
          isWrong     = true;
          scoreEarned = -0.25;
        }
      }

      return {
        index:       idx,
        /*
          UPDATED: id is string (e.g. "eg-01-001")
          NOT a number
        */
        id:          q.id,
        question:    q.question    || '',
        options:     Array.isArray(q.options) ? q.options : [],
        /*
          UPDATED: answer is number OR array
          stored as-is for result page to use
        */
        answer:      q.answer,
        userAnswer:  attempted ? userAnswer : null,
        /* NEW fields */
        isMulti,
        isAttempted: attempted,
        isCorrect:   fullyCorrect,
        isPartial,
        isWrong,
        scoreEarned,
        /* Kept for backwards compat */
        correctAnswer: q.answer,
        scoreChange:   scoreEarned,
        /* NEW metadata fields from JSON */
        explanation: q.explanation || '',
        subject:     q.subject     || '',
        unit:        q.unit        || '',
        type:        q.type        || '',
        difficulty:  q.difficulty  || '',
      };
    }).filter(Boolean); /* remove any null entries */
  }

  /* ============================================================
     GRADE HELPER — unchanged
  ============================================================ */

  /**
   * Returns a letter grade based on percentage.
   */
  function getGrade(percentage) {
    if (percentage >= 90)
      return { letter: 'A+', label: 'অসাধারণ',   color: '#22c55e' };
    if (percentage >= 75)
      return { letter: 'A',  label: 'খুব ভালো',   color: '#84cc16' };
    if (percentage >= 60)
      return { letter: 'B',  label: 'ভালো',        color: '#f59e0b' };
    if (percentage >= 45)
      return { letter: 'C',  label: 'মোটামুটি',    color: '#fb923c' };
    if (percentage >= 30)
      return { letter: 'D',  label: 'আরো পড়ুন',   color: '#f87171' };
    return { letter: 'F',    label: 'আরো চেষ্টা',  color: '#ef4444' };
  }

  /* ============================================================
     CHART DATA — updated for multi
  ============================================================ */

  /**
   * Returns percentage widths for performance bar chart.
   * UPDATED: includes multiPct for new multi bar
   *
   * @param {Object} result - from calculateScore()
   * @returns {Object}
   */
  function getChartData(result) {
    if (!result) return {
      correctPct: 0, wrongPct: 0,
      unattemptedPct: 0, multiPct: 0,
    };

    const total = result.total || 1;

    return {
      correctPct:     parseFloat(
        ((result.correct     / total) * 100).toFixed(1)
      ),
      wrongPct:       parseFloat(
        ((result.wrong       / total) * 100).toFixed(1)
      ),
      unattemptedPct: parseFloat(
        ((result.unattempted / total) * 100).toFixed(1)
      ),
      /* NEW: percentage of questions that are multi-correct */
      multiPct:       parseFloat(
        (((result.multiCount || 0) / total) * 100).toFixed(1)
      ),
    };
  }

  /* ============================================================
     FORMAT TIME HELPER — unchanged
  ============================================================ */

  /**
   * Format seconds into MM:SS Bengali string.
   * @param {number} totalSeconds
   * @returns {string}
   */
  function formatTime(totalSeconds) {
    if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) {
      totalSeconds = 0;
    }
    totalSeconds = Math.max(0, Math.floor(totalSeconds));

    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const map  = {
      '0':'০','1':'১','2':'২','3':'৩','4':'৪',
      '5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'
    };
    const bn = (n) =>
      String(n).padStart(2, '0').replace(/[0-9]/g, d => map[d] || d);

    return `${bn(mins)}:${bn(secs)}`;
  }

  /* ============================================================
     PUBLIC API
  ============================================================ */
  return {
    calculateScore,
    getDetailedResults,
    getGrade,
    getChartData,
    formatTime,
    /* Expose helpers for external use (quiz-engine, filter) */
    isAttempted,
    isCorrect,
  };

})();