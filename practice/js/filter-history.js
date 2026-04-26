/**
 * filter-history.js
 * Tracks solved questions across all filter quizzes
 * Stores in localStorage for persistence
 * WB ANM GNM 2026 Preparation Platform
 *
 * UPDATED FOR NEW JSON FORMAT:
 * ─────────────────────────────────────────────
 * 1. question.id is STRING — used directly as key
 * 2. question.answer is NUMBER or ARRAY
 * 3. question.multi === true for multi-correct
 * 4. saveQuizResults() accepts userAnswers as OBJECT
 *    keyed by question.id (string), not array by index
 * 5. isCorrect check handles both single and multi
 * 6. History records store isMulti + isPartial flags
 * 7. countByStatus() adds 'partial' status count
 * 8. filterByHistory() handles 'partial' filter
 * 9. getOverallStats() includes multi stats
 */

(function(window) {
  'use strict';

  var STORAGE_KEY  = 'filter_quiz_solved_history';
  var QUIZ_LOG_KEY = 'filter_quiz_log';

  /* ══════════════════════════════════════════════════════════════════════
     SAFE LOCALSTORAGE ACCESS
     ══════════════════════════════════════════════════════════════════════ */

  function getStoredData(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[FilterHistory] Parse error for', key, e);
      return fallback;
    }
  }

  function setStoredData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[FilterHistory] Storage error for', key, e);
      return false;
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     GET SOLVED HISTORY MAP
     ══════════════════════════════════════════════════════════════════════ */

  function getSolvedMap() {
    return getStoredData(STORAGE_KEY, {});
  }

  /* ══════════════════════════════════════════════════════════════════════
     GENERATE UNIQUE QUESTION KEY
     UPDATED: question.id is STRING — use directly, no conversion
     ══════════════════════════════════════════════════════════════════════ */

  function getQuestionKey(q) {
    if (!q) return 'unknown';
    /*
      UPDATED: id is now a string like "eg-01-001"
      Use it directly as the key — guaranteed unique per question
    */
    if (q.id) return String(q.id);
    /* Fallback for questions without id */
    var text = (q.question || '').substring(0, 80);
    var subj = q.subject || '';
    return subj + '::' + simpleHash(text);
  }

  function simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /* ══════════════════════════════════════════════════════════════════════
     CORE ANSWER CHECKING HELPERS
     NEW: handles both single and multi-correct
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Check if a user answer is attempted.
   * Single: any number value
   * Multi:  array with at least one element
   */
  function isAttemptedAnswer(question, userAnswer) {
    if (userAnswer === undefined || userAnswer === null) return false;
    if (question.multi === true) {
      return Array.isArray(userAnswer) && userAnswer.length > 0;
    }
    return typeof userAnswer === 'number';
  }

  /**
   * Check correctness — handles single and multi.
   * Returns: 'correct' | 'partial' | 'wrong' | 'skipped'
   *
   * UPDATED scoring rules:
   *   Single: exact match → 'correct', else → 'wrong'
   *   Multi:
   *     any wrong selected → 'wrong'
   *     all correct, no wrong → 'correct'
   *     some correct, no wrong → 'partial'
   */
  function evaluateAnswer(question, userAnswer) {
    if (!isAttemptedAnswer(question, userAnswer)) {
      return 'skipped';
    }

    if (question.multi === true) {
      /*
        UPDATED: multi-correct evaluation
        answer is array (e.g. [1, 2])
        userAnswer is array (e.g. [1])
      */
      var correctSet = new Set(
        Array.isArray(question.answer) ? question.answer : [question.answer]
      );
      var userSet = new Set(
        Array.isArray(userAnswer) ? userAnswer : []
      );

      /* Any wrong selection → wrong */
      var hasWrong = false;
      userSet.forEach(function(s) {
        if (!correctSet.has(s)) hasWrong = true;
      });
      if (hasWrong) return 'wrong';

      /* Count correct selections */
      var correctCount = 0;
      userSet.forEach(function(s) {
        if (correctSet.has(s)) correctCount++;
      });

      if (correctCount === correctSet.size) return 'correct';   /* all correct */
      if (correctCount > 0)                 return 'partial';   /* partial */
      return 'wrong';

    } else {
      /*
        UPDATED: single correct evaluation
        answer may be number or array — normalise
      */
      var correctAnswer = Array.isArray(question.answer)
        ? question.answer[0]
        : question.answer;

      return (userAnswer === correctAnswer) ? 'correct' : 'wrong';
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     SAVE QUIZ RESULTS
     UPDATED: accepts userAnswers as OBJECT {id: answer}
              (not array by index)
              handles multi questions + partial results
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Save quiz results to localStorage history.
   *
   * @param {Array}  questions   - question objects (new format)
   * @param {Object} userAnswers - keyed by question.id (STRING)
   *   Single: { "eg-01-001": 2 }
   *   Multi:  { "eg-01-004": [1, 2] }
   * @returns {Object|null} quiz summary
   */
  function saveQuizResults(questions, userAnswers) {
    if (!questions || !Array.isArray(questions)) {
      console.warn('[FilterHistory] Invalid questions array');
      return null;
    }

    /*
      UPDATED: userAnswers is now an OBJECT keyed by string id
      Old code expected an array — this is now an object
    */
    if (!userAnswers || typeof userAnswers !== 'object') {
      console.warn('[FilterHistory] Invalid userAnswers object');
      return null;
    }

    var solvedMap = getSolvedMap();
    var now = new Date().toISOString();

    var quizSummary = {
      date:     now,
      total:    questions.length,
      correct:  0,
      wrong:    0,
      skipped:  0,
      partial:  0,     /* NEW: partial credit count */
      multiCount: 0,   /* NEW: multi question count */
      subjects: {}
    };

    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      if (!q) continue;

      /*
        UPDATED: look up answer by question.id (STRING)
        NOT by array index
      */
      var userAns = userAnswers[q.id];
      var qKey    = getQuestionKey(q);
      var isMulti = q.multi === true;

      /* Evaluate result using new helper */
      var result = evaluateAnswer(q, userAns);

      /* Update summary counts */
      switch (result) {
        case 'correct': quizSummary.correct++;  break;
        case 'wrong':   quizSummary.wrong++;    break;
        case 'partial': quizSummary.partial++;  break;
        default:        quizSummary.skipped++;  break;
      }
      if (isMulti) quizSummary.multiCount++;

      /* Build/update history record for this question */
      var existing = solvedMap[qKey] || {
        attempts:     0,
        correctCount: 0,
        wrongCount:   0,
        skipCount:    0,
        partialCount: 0,    /* NEW */
        everCorrect:  false,
        isMulti:      false /* NEW */
      };

      existing.attempts++;
      existing.lastAttempt   = now;
      existing.subject       = q.subject    || 'unknown';
      existing.unit          = q.unit       || 'unknown';
      existing.difficulty    = q.difficulty || 'medium';
      existing.isMulti       = isMulti;        /* NEW */
      existing.lastAnswer    = userAns;
      /*
        UPDATED: store answer as-is (number or array)
        for multi questions this is an array
      */
      existing.correctAnswer = q.answer;

      /* Update result counts */
      switch (result) {
        case 'correct':
          existing.correctCount++;
          existing.lastResult  = 'correct';
          existing.everCorrect = true;
          break;
        case 'partial':                        /* NEW */
          existing.partialCount++;
          existing.lastResult = 'partial';
          break;
        case 'wrong':
          existing.wrongCount++;
          existing.lastResult = 'wrong';
          break;
        default: /* skipped */
          existing.skipCount++;
          existing.lastResult = 'skipped';
          break;
      }

      solvedMap[qKey] = existing;

      /* Subject summary */
      var subj = q.subject || 'unknown';
      if (!quizSummary.subjects[subj]) {
        quizSummary.subjects[subj] = {
          total: 0, correct: 0, partial: 0 /* NEW */
        };
      }
      quizSummary.subjects[subj].total++;
      if (result === 'correct') quizSummary.subjects[subj].correct++;
      if (result === 'partial') quizSummary.subjects[subj].partial++;
    }

    /* Persist */
    setStoredData(STORAGE_KEY, solvedMap);

    var quizLog = getStoredData(QUIZ_LOG_KEY, []);
    quizLog.unshift(quizSummary);
    if (quizLog.length > 100) quizLog.length = 100;
    setStoredData(QUIZ_LOG_KEY, quizLog);

    console.log('[FilterHistory] Saved results for',
      questions.length, 'questions');
    console.log('[FilterHistory] Total unique solved:',
      Object.keys(solvedMap).length);

    return quizSummary;
  }

  /* ══════════════════════════════════════════════════════════════════════
     CHECK QUESTION STATUS
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Get last result for a question.
   * UPDATED: can now return 'partial' in addition to existing values
   *
   * @returns {string} 'unseen'|'correct'|'wrong'|'partial'|'skipped'
   */
  function getQuestionStatus(question) {
    if (!question) return 'unseen';
    var solvedMap = getSolvedMap();
    var key       = getQuestionKey(question);
    var record    = solvedMap[key];
    if (!record) return 'unseen';
    return record.lastResult || 'unseen';
  }

  function wasEverCorrect(question) {
    if (!question) return false;
    var solvedMap = getSolvedMap();
    var key       = getQuestionKey(question);
    var record    = solvedMap[key];
    return record ? (record.everCorrect === true) : false;
  }

  function getQuestionRecord(question) {
    if (!question) return null;
    var solvedMap = getSolvedMap();
    var key       = getQuestionKey(question);
    return solvedMap[key] || null;
  }

  /* ══════════════════════════════════════════════════════════════════════
     TAG QUESTIONS WITH HISTORY
     UPDATED: adds isMulti flag to _history object
     ══════════════════════════════════════════════════════════════════════ */

  function tagQuestionsWithHistory(questions) {
    if (!Array.isArray(questions)) return [];

    var solvedMap = getSolvedMap();

    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      if (!q) continue;

      var key    = getQuestionKey(q);
      var record = solvedMap[key];

      if (record) {
        q._history = {
          status:       record.lastResult   || 'unseen',
          attempts:     record.attempts     || 0,
          everCorrect:  record.everCorrect  || false,
          lastAttempt:  record.lastAttempt  || null,
          correctCount: record.correctCount || 0,
          wrongCount:   record.wrongCount   || 0,
          skipCount:    record.skipCount    || 0,
          partialCount: record.partialCount || 0,  /* NEW */
          isMulti:      record.isMulti      || false /* NEW */
        };
      } else {
        q._history = {
          status:       'unseen',
          attempts:     0,
          everCorrect:  false,
          lastAttempt:  null,
          correctCount: 0,
          wrongCount:   0,
          skipCount:    0,
          partialCount: 0,   /* NEW */
          isMulti:      q.multi === true /* NEW */
        };
      }
    }

    return questions;
  }

  /* ══════════════════════════════════════════════════════════════════════
     STATISTICS
     UPDATED: includes partial + multi counts
     ══════════════════════════════════════════════════════════════════════ */

  function getOverallStats() {
    var solvedMap = getSolvedMap();
    var keys      = Object.keys(solvedMap);

    var stats = {
      totalSolved:   keys.length,
      totalCorrect:  0,
      totalWrong:    0,
      totalSkipped:  0,
      totalPartial:  0,       /* NEW */
      totalMulti:    0,       /* NEW */
      everCorrect:   0,
      totalAttempts: 0,
      bySubject:     {}
    };

    for (var i = 0; i < keys.length; i++) {
      var record = solvedMap[keys[i]];
      if (!record) continue;

      stats.totalAttempts += (record.attempts || 0);

      switch (record.lastResult) {
        case 'correct': stats.totalCorrect++;  break;
        case 'wrong':   stats.totalWrong++;    break;
        case 'partial': stats.totalPartial++;  break;  /* NEW */
        default:        stats.totalSkipped++;  break;
      }

      if (record.everCorrect)   stats.everCorrect++;
      if (record.isMulti)       stats.totalMulti++;    /* NEW */

      var subj = record.subject || 'unknown';
      if (!stats.bySubject[subj]) {
        stats.bySubject[subj] = {
          solved: 0, correct: 0, wrong: 0,
          partial: 0 /* NEW */
        };
      }
      stats.bySubject[subj].solved++;
      if (record.everCorrect)           stats.bySubject[subj].correct++;
      if (record.lastResult === 'wrong') stats.bySubject[subj].wrong++;
      if (record.lastResult === 'partial') stats.bySubject[subj].partial++; /* NEW */
    }

    return stats;
  }

  /**
   * Count questions by history status in a given pool.
   * UPDATED: includes 'partial' status
   *
   * @param {Array} questions
   * @returns {Object} { unseen, correct, wrong, skipped, partial }
   */
  function countByStatus(questions) {
    if (!Array.isArray(questions)) {
      return { unseen: 0, correct: 0, wrong: 0, skipped: 0, partial: 0 };
    }

    var solvedMap = getSolvedMap();
    var counts    = { unseen: 0, correct: 0, wrong: 0, skipped: 0, partial: 0 };

    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      if (!q) continue;

      var key    = getQuestionKey(q);
      var record = solvedMap[key];

      if (!record) {
        counts.unseen++;
      } else {
        var status = record.lastResult || 'unseen';
        if (counts.hasOwnProperty(status)) {
          counts[status]++;
        } else {
          counts.unseen++;
        }
      }
    }

    return counts;
  }

  /* ══════════════════════════════════════════════════════════════════════
     FILTER BY HISTORY
     UPDATED: added 'partial' filter case
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Filter questions by history status.
   *
   * @param {Array}  questions
   * @param {string} historyFilter
   *   'all'|'unseen'|'correct'|'wrong'|'attempted'|
   *   'never-correct'|'skipped'|'partial'   ← NEW
   * @returns {Array}
   */
  function filterByHistory(questions, historyFilter) {
    if (!historyFilter || historyFilter === 'all') return questions;
    if (!Array.isArray(questions)) return [];

    var solvedMap = getSolvedMap();
    var result    = [];

    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      if (!q) continue;

      var key     = getQuestionKey(q);
      var record  = solvedMap[key];
      var include = false;

      switch (historyFilter) {
        case 'unseen':
          include = !record;
          break;
        case 'correct':
          include = !!(record && record.lastResult === 'correct');
          break;
        case 'wrong':
          include = !!(record && record.lastResult === 'wrong');
          break;
        case 'partial':                              /* NEW */
          include = !!(record && record.lastResult === 'partial');
          break;
        case 'attempted':
          include = !!record;
          break;
        case 'never-correct':
          include = !record || !record.everCorrect;
          break;
        case 'skipped':
          include = !!(record && record.lastResult === 'skipped');
          break;
        default:
          include = true;
          break;
      }

      if (include) result.push(q);
    }

    return result;
  }

  /* ══════════════════════════════════════════════════════════════════════
     QUIZ LOG
     ══════════════════════════════════════════════════════════════════════ */

  function getQuizLog() {
    return getStoredData(QUIZ_LOG_KEY, []);
  }

  /* ══════════════════════════════════════════════════════════════════════
     CLEAR HISTORY
     ══════════════════════════════════════════════════════════════════════ */

  function clearAllHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(QUIZ_LOG_KEY);
      console.log('[FilterHistory] All history cleared');
      return true;
    } catch (e) {
      console.error('[FilterHistory] Clear error', e);
      return false;
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     Public API
     ══════════════════════════════════════════════════════════════════════ */
  window.FilterHistory = {
    saveQuizResults:        saveQuizResults,
    getSolvedMap:           getSolvedMap,
    getQuestionStatus:      getQuestionStatus,
    wasEverCorrect:         wasEverCorrect,
    getQuestionRecord:      getQuestionRecord,
    tagQuestionsWithHistory:tagQuestionsWithHistory,
    getOverallStats:        getOverallStats,
    countByStatus:          countByStatus,
    filterByHistory:        filterByHistory,
    getQuizLog:             getQuizLog,
    clearAllHistory:        clearAllHistory,
    getQuestionKey:         getQuestionKey,
    /* NEW helpers */
    evaluateAnswer:         evaluateAnswer,
    isAttemptedAnswer:      isAttemptedAnswer,
  };

  console.log('[FilterHistory] Module loaded');

})(window);