/* ============================================================
   practice/js/quiz-storage.js
   localStorage manager for quiz results and progress
   WB ANM GNM 2026 Preparation Platform

   UPDATED FOR NEW JSON FORMAT:
   ─────────────────────────────────────────────
   1. saveQuizResult() stores multiCount + multiScore
   2. saveResultDetails() stores isMulti/isPartial per question
   3. getResultDetails() validates new result structure
   4. getStatistics() aggregates multi stats
   5. All existing localStorage KEYS unchanged (backward compat)
   6. Set numbers padded to 2 digits in all storage keys
   ============================================================ */

const QuizStorage = (function () {
  'use strict';

  /* ── Storage keys — UNCHANGED for backward compatibility ── */
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
      console.warn(`[QuizStorage] Failed to write "${key}":`, e);
      return false;
    }
  }

  /* ============================================================
     SAVE QUIZ RESULT (summary)
     UPDATED: stores multiCount + multiScore from new scorer
  ============================================================ */

  /**
   * Append a quiz result summary to the results array.
   *
   * @param {string} subject - Subject ID e.g. "life-science"
   *                           (NEW keys: life-science, general-science,
   *                            arithmetic-mathematics,
   *                            reasoning-general-knowledge,
   *                            general-knowledge, english-grammar)
   * @param {string} set     - Set number e.g. "01"
   * @param {Object} result  - From QuizScorer.calculateScore()
   *                           NEW fields: multiCount, multiScore
   */
  function saveQuizResult(subject, set, result) {
    if (!subject || !set || !result) {
      console.warn('[QuizStorage] saveQuizResult: missing arguments');
      return null;
    }

    const results = safeGet(KEYS.RESULTS, []);

    const entry = {
      id:           generateId(),
      subject:      subject,
      set:          String(set).padStart(2, '0'),
      score:        typeof result.rawScore === 'number'
                      ? result.rawScore
                      : (result.score || 0),
      displayScore: result.score       || 0,
      correct:      result.correct     || 0,
      wrong:        result.wrong       || 0,
      unattempted:  result.unattempted || 0,
      total:        result.total       || 0,
      percentage:   result.percentage  || 0,
      grade:        result.grade ? result.grade.letter : '—',
      timeTaken:    result.timeTaken   || 0,
      /*
        NEW: multi question stats
        multiCount: number of multi questions in this set
        multiScore: marks earned from multi questions (partial + full)
      */
      multiCount:   result.multiCount  || 0,
      multiScore:   result.multiScore  || 0,
      date:         new Date().toISOString(),
    };

    results.push(entry);

    /* Trim oldest if over limit */
    if (results.length > MAX_RESULTS) {
      results.splice(0, results.length - MAX_RESULTS);
    }

    safeSet(KEYS.RESULTS, results);
    return entry;
  }

  /* ============================================================
     SAVE FULL RESULT DETAILS (for result page)
     UPDATED: details now include isMulti, isPartial, scoreEarned
  ============================================================ */

  /**
   * Save the detailed per-question results.
   * Only keeps the LATEST attempt (for result.html to read).
   *
   * @param {Array}  details - From QuizScorer.getDetailedResults()
   *   Each detail item now has:
   *     id (string), isMulti, isPartial, scoreEarned,
   *     answer (number|array), userAnswer (number|array|null)
   * @param {Object} result  - Score summary (with multiCount/multiScore)
   * @param {string} subject - New subject key format
   * @param {string} set
   */
  function saveResultDetails(details, result, subject, set) {
    if (!subject || !set) {
      console.warn('[QuizStorage] saveResultDetails: missing subject/set');
      return false;
    }

    /* Validate details is a usable array */
    const safeDetails = Array.isArray(details) ? details : [];

    const payload = {
      subject,
      set:      String(set).padStart(2, '0'),
      result:   result   || {},
      details:  safeDetails,
      /*
        NEW: store summary of multi questions for quick access
        by result page without scanning all details
      */
      multiSummary: {
        total:        result ? (result.multiCount || 0) : 0,
        score:        result ? (result.multiScore || 0) : 0,
        hasPartial:   safeDetails.some(d => d && d.isPartial === true),
      },
      savedAt:  new Date().toISOString(),
    };

    return safeSet(KEYS.RESULT_DETAILS, payload);
  }

  /* ============================================================
     GET RESULT DETAILS (read by result.html)
     UPDATED: validates new result structure fields
  ============================================================ */

  /**
   * Retrieve the most recently saved detailed result.
   * Returns null if not found or stale (> 10 minutes).
   *
   * @returns {Object|null}
   * Shape:
   * {
   *   subject, set, result, details,
   *   multiSummary: { total, score, hasPartial },
   *   savedAt
   * }
   */
  function getResultDetails() {
    const data = safeGet(KEYS.RESULT_DETAILS, null);

    if (!data) return null;

    /* Validate minimum required fields */
    if (!data.subject || !data.result) {
      console.warn('[QuizStorage] getResultDetails: invalid structure');
      try { localStorage.removeItem(KEYS.RESULT_DETAILS); } catch (e) {}
      return null;
    }

    /* Validate it's recent (within 10 minutes) */
    try {
      const savedAt = new Date(data.savedAt).getTime();
      const now     = Date.now();
      const tenMins = 10 * 60 * 1000;

      if (isNaN(savedAt) || (now - savedAt > tenMins)) {
        try { localStorage.removeItem(KEYS.RESULT_DETAILS); } catch (e) {}
        return null;
      }
    } catch (e) {
      console.warn('[QuizStorage] getResultDetails: date parse error', e);
      return null;
    }

    /*
      NEW: ensure backward compat — if multiSummary missing
      (old format result), add defaults so result.html won't crash
    */
    if (!data.multiSummary) {
      data.multiSummary = { total: 0, score: 0, hasPartial: false };
    }

    /* Ensure result has multiCount/multiScore (old format compat) */
    if (typeof data.result.multiCount === 'undefined') {
      data.result.multiCount = 0;
    }
    if (typeof data.result.multiScore === 'undefined') {
      data.result.multiScore = 0;
    }

    /* Ensure details is always array */
    if (!Array.isArray(data.details)) {
      data.details = [];
    }

    return data;
  }

  /* ============================================================
     MARK SET COMPLETED — unchanged logic, updated comment
  ============================================================ */

  /**
   * Mark a set as completed for a subject.
   *
   * @param {string}        subject - New format key e.g. "english-grammar"
   * @param {string|number} set     - Set number (stored as integer)
   */
  function markSetCompleted(subject, set) {
    if (!subject || set === undefined || set === null) {
      console.warn('[QuizStorage] markSetCompleted: missing arguments');
      return false;
    }

    const completed = safeGet(KEYS.COMPLETED, {});

    if (!completed[subject]) {
      completed[subject] = [];
    }

    const setNum = parseInt(set, 10);
    if (isNaN(setNum)) {
      console.warn('[QuizStorage] markSetCompleted: invalid set number', set);
      return false;
    }

    if (!completed[subject].includes(setNum)) {
      completed[subject].push(setNum);
      completed[subject].sort((a, b) => a - b);
    }

    return safeSet(KEYS.COMPLETED, completed);
  }

  /* ============================================================
     GET COMPLETION STATUS — unchanged
  ============================================================ */

  /**
   * Get completion status for all subjects or one subject.
   *
   * @param {string} [subject] - Optional: filter by subject
   * @returns {Object|Array}   - All completed sets
   */
  function getCompletionStatus(subject) {
    const completed = safeGet(KEYS.COMPLETED, {});
    if (subject) {
      return Array.isArray(completed[subject])
        ? completed[subject]
        : [];
    }
    return completed;
  }

  /* ============================================================
     IS SET COMPLETED — NEW HELPER
  ============================================================ */

  /**
   * Check if a specific set is completed.
   *
   * @param {string}        subject
   * @param {string|number} set
   * @returns {boolean}
   */
  function isSetCompleted(subject, set) {
    const completedSets = getCompletionStatus(subject);
    const setNum = parseInt(set, 10);
    return Array.isArray(completedSets) && completedSets.includes(setNum);
  }

  /* ============================================================
     GET QUIZ HISTORY — unchanged
  ============================================================ */

  /**
   * Get all past results, optionally filtered.
   *
   * @param {string} [subject] - Filter by subject (new key format)
   * @param {string} [set]     - Filter by set number
   * @returns {Array}
   */
  function getQuizHistory(subject, set) {
    const results = safeGet(KEYS.RESULTS, []);

    if (!Array.isArray(results)) return [];

    return results.filter((r) => {
      if (!r) return false;
      const matchSubject = subject
        ? r.subject === subject
        : true;
      const matchSet = set
        ? r.set === String(set).padStart(2, '0')
        : true;
      return matchSubject && matchSet;
    });
  }

  /* ============================================================
     GET BEST SCORE — unchanged
  ============================================================ */

  /**
   * Get best (highest) score for a subject+set.
   *
   * @param {string}        subject
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
     UPDATED: aggregates multiCount + multiScore across history
  ============================================================ */

  /**
   * Returns aggregate statistics for dashboard.
   *
   * @param {string} [subject] - Optional filter
   * @returns {Object}
   */
  function getStatistics(subject) {
    const history = getQuizHistory(subject);

    if (!Array.isArray(history) || history.length === 0) {
      return {
        totalAttempts:    0,
        averageScore:     0,
        averagePct:       0,
        bestScore:        0,
        bestPct:          0,
        totalCorrect:     0,
        totalWrong:       0,
        totalUnattempted: 0,
        totalTime:        0,
        /* NEW multi stats */
        totalMultiCount:  0,
        totalMultiScore:  0,
        averageMultiScore: 0,
      };
    }

    const totalAttempts    = history.length;
    const totalScore       = history.reduce(
      (s, r) => s + (parseFloat(r.score)      || 0), 0
    );
    const totalPct         = history.reduce(
      (s, r) => s + (parseFloat(r.percentage) || 0), 0
    );
    const totalCorrect     = history.reduce(
      (s, r) => s + (r.correct     || 0), 0
    );
    const totalWrong       = history.reduce(
      (s, r) => s + (r.wrong       || 0), 0
    );
    const totalUnattempted = history.reduce(
      (s, r) => s + (r.unattempted || 0), 0
    );
    const totalTime        = history.reduce(
      (s, r) => s + (r.timeTaken   || 0), 0
    );
    const bestScore        = Math.max(
      ...history.map(r => parseFloat(r.score) || 0)
    );
    const bestPct          = Math.max(
      ...history.map(r => parseFloat(r.percentage) || 0)
    );

    /*
      NEW: aggregate multi statistics
      Old entries without multiCount/multiScore default to 0
    */
    const totalMultiCount  = history.reduce(
      (s, r) => s + (r.multiCount || 0), 0
    );
    const totalMultiScore  = history.reduce(
      (s, r) => s + (parseFloat(r.multiScore) || 0), 0
    );
    const multiAttempts    = history.filter(
      r => (r.multiCount || 0) > 0
    ).length;
    const averageMultiScore = multiAttempts > 0
      ? (totalMultiScore / multiAttempts).toFixed(2)
      : 0;

    return {
      totalAttempts,
      averageScore:      parseFloat((totalScore / totalAttempts).toFixed(2)),
      averagePct:        parseFloat((totalPct   / totalAttempts).toFixed(1)),
      bestScore:         parseFloat(bestScore.toFixed(2)),
      bestPct:           parseFloat(bestPct.toFixed(1)),
      totalCorrect,
      totalWrong,
      totalUnattempted,
      totalTime,
      /* NEW */
      totalMultiCount,
      totalMultiScore:   parseFloat(totalMultiScore.toFixed(2)),
      averageMultiScore: parseFloat(averageMultiScore),
    };
  }

  /* ============================================================
     CLEAR DATA — unchanged
  ============================================================ */

  /**
   * Clear all practice data (use with caution).
   */
  function clearAllData() {
    Object.values(KEYS).forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('[QuizStorage] clearAllData: failed to remove', key, e);
      }
    });
  }

  /**
   * Clear results for a specific subject only.
   *
   * @param {string} subject - New format key e.g. "arithmetic-mathematics"
   */
  function clearSubjectData(subject) {
    if (!subject) return;

    /* Remove from results */
    const results  = safeGet(KEYS.RESULTS, []);
    const filtered = Array.isArray(results)
      ? results.filter(r => r && r.subject !== subject)
      : [];
    safeSet(KEYS.RESULTS, filtered);

    /* Remove from completed */
    const completed = safeGet(KEYS.COMPLETED, {});
    delete completed[subject];
    safeSet(KEYS.COMPLETED, completed);
  }

  /* ============================================================
     EXPORT DATA (for backup) — unchanged
  ============================================================ */

  /**
   * Export all data as JSON string (for download).
   * @returns {string} JSON string
   */
  function exportData() {
    return JSON.stringify({
      results:    safeGet(KEYS.RESULTS,   []),
      completed:  safeGet(KEYS.COMPLETED, {}),
      exportedAt: new Date().toISOString(),
      /*
        NEW: version marker so future imports can detect format
        v2 = new JSON format with multi questions + string IDs
      */
      version:    2,
    }, null, 2);
  }

  /* ============================================================
     GET SUBJECT PROGRESS — NEW HELPER
     Used by practice-app.js to show per-subject progress
  ============================================================ */

  /**
   * Get completion count and best score for a subject.
   *
   * @param {string} subject - e.g. "life-science"
   * @param {number} totalSets - Total sets in this subject (from manifest)
   * @returns {Object}
   * {
   *   completedCount: number,
   *   totalSets:      number,
   *   progressPct:    number,
   *   bestScore:      number|null,
   *   lastPlayed:     string|null,  ISO date string
   * }
   */
  function getSubjectProgress(subject, totalSets) {
    if (!subject) {
      return {
        completedCount: 0,
        totalSets:      totalSets || 0,
        progressPct:    0,
        bestScore:      null,
        lastPlayed:     null,
      };
    }

    const completedSets = getCompletionStatus(subject);
    const completedCount = Array.isArray(completedSets)
      ? completedSets.length
      : 0;

    const total    = totalSets || 1;
    const progress = Math.min(100,
      parseFloat(((completedCount / total) * 100).toFixed(1))
    );

    /* Best score across all attempts for this subject */
    const history   = getQuizHistory(subject);
    const bestScore = history.length > 0
      ? Math.max(...history.map(r => parseFloat(r.score) || 0))
      : null;

    /* Most recent play date */
    const lastPlayed = history.length > 0
      ? history
          .map(r => r.date || '')
          .filter(Boolean)
          .sort()
          .pop() || null
      : null;

    return {
      completedCount,
      totalSets:  totalSets || 0,
      progressPct: progress,
      bestScore:  bestScore !== null
        ? parseFloat(bestScore.toFixed(2))
        : null,
      lastPlayed,
    };
  }

  /* ============================================================
     ID GENERATOR — unchanged
  ============================================================ */
  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /* ============================================================
     PUBLIC API
  ============================================================ */
  return {
    /* Core result storage */
    saveQuizResult,
    saveResultDetails,
    getResultDetails,
    /* Progress tracking */
    markSetCompleted,
    isSetCompleted,           /* NEW */
    getCompletionStatus,
    getSubjectProgress,       /* NEW */
    /* History & stats */
    getQuizHistory,
    getBestScore,
    getStatistics,
    /* Maintenance */
    clearAllData,
    clearSubjectData,
    exportData,
  };

})();