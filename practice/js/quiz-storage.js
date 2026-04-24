/* ============================================================
   practice/js/quiz-storage.js
   localStorage manager for quiz results and progress
   WB ANM GNM 2026 Preparation Platform
   ============================================================ */

const QuizStorage = (function () {
  'use strict';

  /* ── Storage keys ── */
  const KEYS = {
    RESULTS:        'practice_results',
    COMPLETED:      'practice_completed',
    RESULT_DETAILS: 'practice_result_details',
  };

  /* ── Max results to store (prevent localStorage overflow) ── */
  const MAX_RESULTS = 200;

  /* ============================================================
     SAFE JSON HELPERS
     ============================================================ */
  function safeGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn(`[QuizStorage] Failed to read "${key}":`, e);
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      /* localStorage might be full or blocked */
      console.warn(`[QuizStorage] Failed to write "${key}":`, e);
      return false;
    }
  }

  /* ============================================================
     SAVE QUIZ RESULT (summary)
     ============================================================ */

  /**
   * Append a quiz result summary to the results array.
   *
   * @param {string} subject  - Subject ID e.g. "life-science"
   * @param {string} set      - Set number e.g. "01"
   * @param {Object} result   - From QuizScorer.calculateScore()
   */
  function saveQuizResult(subject, set, result) {
    const results = safeGet(KEYS.RESULTS, []);

    const entry = {
      id:          generateId(),
      subject:     subject,
      set:         String(set).padStart(2, '0'),
      score:       result.rawScore,
      displayScore: result.score,
      correct:     result.correct,
      wrong:       result.wrong,
      unattempted: result.unattempted,
      total:       result.total,
      percentage:  result.percentage,
      grade:       result.grade ? result.grade.letter : '—',
      timeTaken:   result.timeTaken || 0,
      date:        new Date().toISOString(),
    };

    results.push(entry);

    /* Trim if over limit */
    if (results.length > MAX_RESULTS) {
      results.splice(0, results.length - MAX_RESULTS);
    }

    safeSet(KEYS.RESULTS, results);
    return entry;
  }

  /* ============================================================
     SAVE FULL RESULT DETAILS (for result page)
     ============================================================ */

  /**
   * Save the detailed per-question results.
   * Only keeps the LATEST attempt (for result.html to read).
   *
   * @param {Array}  details - From QuizScorer.getDetailedResults()
   * @param {Object} result  - Score summary
   * @param {string} subject
   * @param {string} set
   */
  function saveResultDetails(details, result, subject, set) {
    const payload = {
      subject,
      set:       String(set).padStart(2, '0'),
      result,
      details,
      savedAt:   new Date().toISOString(),
    };
    safeSet(KEYS.RESULT_DETAILS, payload);
  }

  /* ============================================================
     GET RESULT DETAILS (read by result.html)
     ============================================================ */

  /**
   * Retrieve the most recently saved detailed result.
   * Returns null if not found or expired.
   */
  function getResultDetails() {
    const data = safeGet(KEYS.RESULT_DETAILS, null);
    if (!data) return null;

    /* Validate it's recent (within 10 minutes) */
    const savedAt  = new Date(data.savedAt).getTime();
    const now      = Date.now();
    const tenMins  = 10 * 60 * 1000;

    if (now - savedAt > tenMins) {
      /* Stale — clear it */
      localStorage.removeItem(KEYS.RESULT_DETAILS);
      return null;
    }

    return data;
  }

  /* ============================================================
     MARK SET COMPLETED
     ============================================================ */

  /**
   * Mark a set as completed for a subject.
   * Updates the progress bars on the index page.
   *
   * @param {string} subject - Subject ID
   * @param {string|number} set - Set number
   */
  function markSetCompleted(subject, set) {
    const completed = safeGet(KEYS.COMPLETED, {});

    if (!completed[subject]) {
      completed[subject] = [];
    }

    const setNum = parseInt(set);
    if (!completed[subject].includes(setNum)) {
      completed[subject].push(setNum);
      /* Keep sorted */
      completed[subject].sort((a, b) => a - b);
    }

    safeSet(KEYS.COMPLETED, completed);
  }

  /* ============================================================
     GET COMPLETION STATUS
     ============================================================ */

  /**
   * Get completion status for all subjects or one subject.
   *
   * @param {string} [subject] - Optional: filter by subject
   * @returns {Object|Array}
   */
  function getCompletionStatus(subject) {
    const completed = safeGet(KEYS.COMPLETED, {});
    if (subject) {
      return completed[subject] || [];
    }
    return completed;
  }

  /* ============================================================
     GET QUIZ HISTORY
     ============================================================ */

  /**
   * Get all past results, optionally filtered.
   *
   * @param {string} [subject]   - Filter by subject
   * @param {string} [set]       - Filter by set number
   * @returns {Array}
   */
  function getQuizHistory(subject, set) {
    const results = safeGet(KEYS.RESULTS, []);

    return results.filter((r) => {
      const matchSubject = subject ? r.subject === subject     : true;
      const matchSet     = set     ? r.set     === String(set).padStart(2, '0') : true;
      return matchSubject && matchSet;
    });
  }

  /* ============================================================
     GET BEST SCORE
     ============================================================ */

  /**
   * Get best (highest raw) score for a subject+set.
   *
   * @param {string} subject
   * @param {string|number} set
   * @returns {number|null}
   */
  function getBestScore(subject, set) {
    const history = getQuizHistory(subject, set);
    if (history.length === 0) return null;

    const scores = history.map(r => parseFloat(r.score) || 0);
    return Math.max(...scores);
  }

  /* ============================================================
     GET STATISTICS
     ============================================================ */

  /**
   * Returns aggregate statistics for dashboard.
   *
   * @param {string} [subject] - Optional filter
   * @returns {Object}
   */
  function getStatistics(subject) {
    const history = getQuizHistory(subject);

    if (history.length === 0) {
      return {
        totalAttempts:   0,
        averageScore:    0,
        averagePct:      0,
        bestScore:       0,
        bestPct:         0,
        totalCorrect:    0,
        totalWrong:      0,
        totalUnattempted:0,
        totalTime:       0,
      };
    }

    const totalAttempts    = history.length;
    const totalScore       = history.reduce((s, r) => s + (parseFloat(r.score) || 0), 0);
    const totalPct         = history.reduce((s, r) => s + (parseFloat(r.percentage) || 0), 0);
    const totalCorrect     = history.reduce((s, r) => s + (r.correct     || 0), 0);
    const totalWrong       = history.reduce((s, r) => s + (r.wrong       || 0), 0);
    const totalUnattempted = history.reduce((s, r) => s + (r.unattempted || 0), 0);
    const totalTime        = history.reduce((s, r) => s + (r.timeTaken   || 0), 0);
    const bestScore        = Math.max(...history.map(r => parseFloat(r.score) || 0));
    const bestPct          = Math.max(...history.map(r => parseFloat(r.percentage) || 0));

    return {
      totalAttempts,
      averageScore:     (totalScore / totalAttempts).toFixed(2),
      averagePct:       (totalPct   / totalAttempts).toFixed(1),
      bestScore:        bestScore.toFixed(2),
      bestPct:          bestPct.toFixed(1),
      totalCorrect,
      totalWrong,
      totalUnattempted,
      totalTime,
    };
  }

  /* ============================================================
     CLEAR DATA
     ============================================================ */

  /**
   * Clear all practice data (use with caution).
   */
  function clearAllData() {
    Object.values(KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * Clear results for a specific subject only.
   */
  function clearSubjectData(subject) {
    /* Remove from results */
    const results = safeGet(KEYS.RESULTS, []);
    const filtered = results.filter(r => r.subject !== subject);
    safeSet(KEYS.RESULTS, filtered);

    /* Remove from completed */
    const completed = safeGet(KEYS.COMPLETED, {});
    delete completed[subject];
    safeSet(KEYS.COMPLETED, completed);
  }

  /* ============================================================
     EXPORT DATA (for backup)
     ============================================================ */

  /**
   * Export all data as JSON string (for download).
   */
  function exportData() {
    return JSON.stringify({
      results:   safeGet(KEYS.RESULTS,   []),
      completed: safeGet(KEYS.COMPLETED, {}),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /* ============================================================
     ID GENERATOR
     ============================================================ */
  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  return {
    saveQuizResult,
    saveResultDetails,
    getResultDetails,
    markSetCompleted,
    getCompletionStatus,
    getQuizHistory,
    getBestScore,
    getStatistics,
    clearAllData,
    clearSubjectData,
    exportData,
  };

})();