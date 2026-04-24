/* ============================================================
   practice/js/quiz-scorer.js
   Score calculation for practice quiz
   Category-1 only: +1 correct, -0.25 wrong, 0 unattempted
   WB ANM GNM 2026 Preparation Platform
   ============================================================ */

const QuizScorer = (function () {
  'use strict';

  /* ============================================================
     CALCULATE SCORE
     ============================================================ */

  /**
   * Calculate total score for a completed quiz.
   *
   * @param {Array}  questions  - Array of question objects from JSON
   * @param {Object} answers    - { questionId: optionIndex (0-based) }
   * @returns {Object} Score summary
   */
  function calculateScore(questions, answers) {
    let correct     = 0;
    let wrong       = 0;
    let unattempted = 0;
    let rawScore    = 0;

    questions.forEach((q) => {
      const userAnswer = answers[q.id];

      if (userAnswer === undefined || userAnswer === null) {
        /* Not attempted */
        unattempted++;

      } else if (userAnswer === q.answer) {
        /* Correct answer (answer is 0-based index in JSON) */
        correct++;
        rawScore += 1;

      } else {
        /* Wrong answer */
        wrong++;
        rawScore -= 0.25;
      }
    });

    /* Score cannot go below 0 for display but preserve raw */
    const finalScore     = Math.max(0, rawScore);
    const total          = questions.length;
    const percentage     = total > 0
      ? ((correct / total) * 100).toFixed(1)
      : '0.0';
    const marksObtained  = rawScore.toFixed(2);

    return {
      score:          finalScore,
      rawScore:       parseFloat(marksObtained),
      correct,
      wrong,
      unattempted,
      total,
      percentage:     parseFloat(percentage),
      maxScore:       total,   /* Maximum possible score = total questions */
      grade:          getGrade(parseFloat(percentage)),
    };
  }

  /* ============================================================
     DETAILED RESULTS
     ============================================================ */

  /**
   * Build per-question result array for review page.
   *
   * @param {Array}  questions - Question objects
   * @param {Object} answers   - { questionId: optionIndex }
   * @returns {Array} Detailed result per question
   */
  function getDetailedResults(questions, answers) {
    return questions.map((q, idx) => {
      const userAnswer    = answers[q.id];
      const isAttempted   = userAnswer !== undefined && userAnswer !== null;
      const isCorrect     = isAttempted && userAnswer === q.answer;
      const isWrong       = isAttempted && !isCorrect;

      return {
        index:         idx,                    /* 0-based position */
        id:            q.id,
        question:      q.question,
        options:       q.options || [],
        correctAnswer: q.answer,               /* 0-based correct index */
        userAnswer:    isAttempted ? userAnswer : null,
        isAttempted,
        isCorrect,
        isWrong,
        explanation:   q.explanation || '',
        chapter:       q.chapter    || '',
        scoreChange:   isCorrect ? +1 : isWrong ? -0.25 : 0,
      };
    });
  }

  /* ============================================================
     GRADE HELPER
     ============================================================ */

  /**
   * Returns a letter grade based on percentage.
   * Mapped to WB ANM GNM context.
   */
  function getGrade(percentage) {
    if (percentage >= 90) return { letter: 'A+', label: 'অসাধারণ',    color: '#22c55e' };
    if (percentage >= 75) return { letter: 'A',  label: 'খুব ভালো',    color: '#84cc16' };
    if (percentage >= 60) return { letter: 'B',  label: 'ভালো',        color: '#f59e0b' };
    if (percentage >= 45) return { letter: 'C',  label: 'মোটামুটি',    color: '#fb923c' };
    if (percentage >= 30) return { letter: 'D',  label: 'আরো পড়ুন',   color: '#f87171' };
    return                       { letter: 'F',  label: 'আরো চেষ্টা',  color: '#ef4444' };
  }

  /* ============================================================
     SCORE BREAKDOWN (for chart)
     ============================================================ */

  /**
   * Returns percentage widths for performance bar chart.
   */
  function getChartData(result) {
    const total = result.total || 1; /* Prevent division by zero */
    return {
      correctPct:     ((result.correct     / total) * 100).toFixed(1),
      wrongPct:       ((result.wrong       / total) * 100).toFixed(1),
      unattemptedPct: ((result.unattempted / total) * 100).toFixed(1),
    };
  }

  /* ============================================================
     FORMAT TIME HELPER
     ============================================================ */

  /**
   * Format seconds into MM:SS Bengali string.
   */
  function formatTime(totalSeconds) {
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
  };

})();