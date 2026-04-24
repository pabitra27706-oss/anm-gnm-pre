/**
 * filter-history.js
 * Tracks solved questions across all filter quizzes
 * Stores in localStorage for persistence
 * WB ANM GNM 2026 Preparation Platform
 */

(function(window) {
  'use strict';

  var STORAGE_KEY = 'filter_quiz_solved_history';
  var QUIZ_LOG_KEY = 'filter_quiz_log';

  // ─── Safe localStorage Access ──────────────────────────────────────────────

  function getStoredData(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('FilterHistory: Parse error for', key, e);
      return fallback;
    }
  }

  function setStoredData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('FilterHistory: Storage error for', key, e);
      return false;
    }
  }

  // ─── Get Solved History Map ─────────────────────────────────────────────────

  function getSolvedMap() {
    return getStoredData(STORAGE_KEY, {});
  }

  // ─── Generate Unique Question Key ──────────────────────────────────────────

  function getQuestionKey(q) {
    if (!q) return 'unknown';
    if (q.id) return String(q.id);
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

  // ─── Save Quiz Results ──────────────────────────────────────────────────────

  function saveQuizResults(questions, userAnswers) {
    if (!questions || !Array.isArray(questions)) {
      console.warn('FilterHistory: Invalid questions array');
      return null;
    }
    if (!userAnswers || !Array.isArray(userAnswers)) {
      console.warn('FilterHistory: Invalid userAnswers array');
      return null;
    }

    var solvedMap = getSolvedMap();
    var now = new Date().toISOString();
    var quizSummary = {
      date: now,
      total: questions.length,
      correct: 0,
      wrong: 0,
      skipped: 0,
      subjects: {}
    };

    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      var userAns = userAnswers[i];

      if (!q) continue;

      var qKey = getQuestionKey(q);
      var isSkipped = (userAns === null || userAns === undefined);
      var isCorrect = false;

      if (!isSkipped) {
        isCorrect = (userAns === q.answer);
      }

      var existing = solvedMap[qKey] || {
        attempts: 0,
        correctCount: 0,
        wrongCount: 0,
        skipCount: 0,
        everCorrect: false
      };

      existing.attempts++;
      existing.lastAttempt = now;
      existing.subject = q.subject || 'unknown';
      existing.unit = q.unit || 'unknown';
      existing.difficulty = q.difficulty || 'medium';
      existing.lastAnswer = userAns;
      existing.correctAnswer = q.answer;

      if (isSkipped) {
        existing.skipCount++;
        existing.lastResult = 'skipped';
        quizSummary.skipped++;
      } else if (isCorrect) {
        existing.correctCount++;
        existing.lastResult = 'correct';
        existing.everCorrect = true;
        quizSummary.correct++;
      } else {
        existing.wrongCount++;
        existing.lastResult = 'wrong';
        quizSummary.wrong++;
      }

      solvedMap[qKey] = existing;

      var subj = q.subject || 'unknown';
      if (!quizSummary.subjects[subj]) {
        quizSummary.subjects[subj] = { total: 0, correct: 0 };
      }
      quizSummary.subjects[subj].total++;
      if (isCorrect) quizSummary.subjects[subj].correct++;
    }

    setStoredData(STORAGE_KEY, solvedMap);

    var quizLog = getStoredData(QUIZ_LOG_KEY, []);
    quizLog.unshift(quizSummary);
    if (quizLog.length > 100) quizLog.length = 100;
    setStoredData(QUIZ_LOG_KEY, quizLog);

    console.log('FilterHistory: Saved results for', questions.length, 'questions');
    console.log('FilterHistory: Total solved:', Object.keys(solvedMap).length);

    return quizSummary;
  }

  // ─── Check Question Status ─────────────────────────────────────────────────

  function getQuestionStatus(question) {
    if (!question) return 'unseen';
    var solvedMap = getSolvedMap();
    var key = getQuestionKey(question);
    var record = solvedMap[key];
    if (!record) return 'unseen';
    return record.lastResult || 'unseen';
  }

  function wasEverCorrect(question) {
    if (!question) return false;
    var solvedMap = getSolvedMap();
    var key = getQuestionKey(question);
    var record = solvedMap[key];
    return record ? (record.everCorrect === true) : false;
  }

  function getQuestionRecord(question) {
    if (!question) return null;
    var solvedMap = getSolvedMap();
    var key = getQuestionKey(question);
    return solvedMap[key] || null;
  }

  // ─── Tag Questions With History ─────────────────────────────────────────────

  function tagQuestionsWithHistory(questions) {
    if (!Array.isArray(questions)) return [];

    var solvedMap = getSolvedMap();

    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      if (!q) continue;

      var key = getQuestionKey(q);
      var record = solvedMap[key];

      if (record) {
        q._history = {
          status: record.lastResult || 'unseen',
          attempts: record.attempts || 0,
          everCorrect: record.everCorrect || false,
          lastAttempt: record.lastAttempt || null,
          correctCount: record.correctCount || 0,
          wrongCount: record.wrongCount || 0,
          skipCount: record.skipCount || 0
        };
      } else {
        q._history = {
          status: 'unseen',
          attempts: 0,
          everCorrect: false,
          lastAttempt: null,
          correctCount: 0,
          wrongCount: 0,
          skipCount: 0
        };
      }
    }

    return questions;
  }

  // ─── Statistics ──────────────────────────────────────────────────────────────

  function getOverallStats() {
    var solvedMap = getSolvedMap();
    var keys = Object.keys(solvedMap);

    var stats = {
      totalSolved: keys.length,
      totalCorrect: 0,
      totalWrong: 0,
      totalSkipped: 0,
      everCorrect: 0,
      totalAttempts: 0,
      bySubject: {}
    };

    for (var i = 0; i < keys.length; i++) {
      var record = solvedMap[keys[i]];
      if (!record) continue;

      stats.totalAttempts += (record.attempts || 0);

      if (record.lastResult === 'correct') stats.totalCorrect++;
      else if (record.lastResult === 'wrong') stats.totalWrong++;
      else stats.totalSkipped++;

      if (record.everCorrect) stats.everCorrect++;

      var subj = record.subject || 'unknown';
      if (!stats.bySubject[subj]) {
        stats.bySubject[subj] = { solved: 0, correct: 0, wrong: 0 };
      }
      stats.bySubject[subj].solved++;
      if (record.everCorrect) stats.bySubject[subj].correct++;
      if (record.lastResult === 'wrong') stats.bySubject[subj].wrong++;
    }

    return stats;
  }

  function countByStatus(questions) {
    if (!Array.isArray(questions)) {
      return { unseen: 0, correct: 0, wrong: 0, skipped: 0 };
    }

    var solvedMap = getSolvedMap();
    var counts = { unseen: 0, correct: 0, wrong: 0, skipped: 0 };

    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      if (!q) continue;
      var key = getQuestionKey(q);
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

  // ─── Filter by History ──────────────────────────────────────────────────────

  function filterByHistory(questions, historyFilter) {
    if (!historyFilter || historyFilter === 'all') return questions;
    if (!Array.isArray(questions)) return [];

    var solvedMap = getSolvedMap();

    var result = [];
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      if (!q) continue;

      var key = getQuestionKey(q);
      var record = solvedMap[key];
      var include = false;

      switch (historyFilter) {
        case 'unseen':
          include = !record;
          break;
        case 'correct':
          include = record && record.lastResult === 'correct';
          break;
        case 'wrong':
          include = record && record.lastResult === 'wrong';
          break;
        case 'attempted':
          include = !!record;
          break;
        case 'never-correct':
          include = !record || !record.everCorrect;
          break;
        case 'skipped':
          include = record && record.lastResult === 'skipped';
          break;
        default:
          include = true;
      }

      if (include) result.push(q);
    }

    return result;
  }

  // ─── Quiz Log ───────────────────────────────────────────────────────────────

  function getQuizLog() {
    return getStoredData(QUIZ_LOG_KEY, []);
  }

  // ─── Clear History ──────────────────────────────────────────────────────────

  function clearAllHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(QUIZ_LOG_KEY);
      console.log('FilterHistory: All history cleared');
      return true;
    } catch (e) {
      console.error('FilterHistory: Clear error', e);
      return false;
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  window.FilterHistory = {
    saveQuizResults: saveQuizResults,
    getSolvedMap: getSolvedMap,
    getQuestionStatus: getQuestionStatus,
    wasEverCorrect: wasEverCorrect,
    getQuestionRecord: getQuestionRecord,
    tagQuestionsWithHistory: tagQuestionsWithHistory,
    getOverallStats: getOverallStats,
    countByStatus: countByStatus,
    filterByHistory: filterByHistory,
    getQuizLog: getQuizLog,
    clearAllHistory: clearAllHistory,
    getQuestionKey: getQuestionKey
  };

  console.log('FilterHistory: Module loaded');

})(window);