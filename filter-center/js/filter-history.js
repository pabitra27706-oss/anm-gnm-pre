/**
 * filter-history.js
 * Tracks solved questions across all filter quizzes
 * Stores in localStorage for persistence
 * WB ANM GNM 2026 Preparation Platform
 */

(function(window) {
  'use strict';

  var STORAGE_KEY  = 'filter_quiz_solved_history';
  var QUIZ_LOG_KEY = 'filter_quiz_log';

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

  function getSolvedMap() {
    return getStoredData(STORAGE_KEY, {});
  }

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

  function isAttemptedAnswer(question, userAnswer) {
    if (userAnswer === undefined || userAnswer === null) return false;
    if (question.multi === true) {
      return Array.isArray(userAnswer) && userAnswer.length > 0;
    }
    return typeof userAnswer === 'number';
  }

  function evaluateAnswer(question, userAnswer) {
    if (!isAttemptedAnswer(question, userAnswer)) {
      return 'skipped';
    }
    if (question.multi === true) {
      var correctSet = new Set(
        Array.isArray(question.answer) ? question.answer : [question.answer]
      );
      var userSet = new Set(
        Array.isArray(userAnswer) ? userAnswer : []
      );
      var hasWrong = false;
      userSet.forEach(function(s) {
        if (!correctSet.has(s)) hasWrong = true;
      });
      if (hasWrong) return 'wrong';
      var correctCount = 0;
      userSet.forEach(function(s) {
        if (correctSet.has(s)) correctCount++;
      });
      if (correctCount === correctSet.size) return 'correct';
      if (correctCount > 0) return 'partial';
      return 'wrong';
    } else {
      var correctAnswer = Array.isArray(question.answer)
        ? question.answer[0]
        : question.answer;
      return (userAnswer === correctAnswer) ? 'correct' : 'wrong';
    }
  }

  function saveQuizResults(questions, userAnswers) {
    if (!questions || !Array.isArray(questions)) {
      console.warn('[FilterHistory] Invalid questions array');
      return null;
    }
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
      partial:  0,
      multiCount: 0,
      subjects: {}
    };
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      if (!q) continue;
      var userAns = userAnswers[q.id];
      var qKey    = getQuestionKey(q);
      var isMulti = q.multi === true;
      var result = evaluateAnswer(q, userAns);
      switch (result) {
        case 'correct': quizSummary.correct++;  break;
        case 'wrong':   quizSummary.wrong++;    break;
        case 'partial': quizSummary.partial++;  break;
        default:        quizSummary.skipped++;  break;
      }
      if (isMulti) quizSummary.multiCount++;
      var existing = solvedMap[qKey] || {
        attempts:     0,
        correctCount: 0,
        wrongCount:   0,
        skipCount:    0,
        partialCount: 0,
        everCorrect:  false,
        isMulti:      false
      };
      existing.attempts++;
      existing.lastAttempt   = now;
      existing.subject       = q.subject    || 'unknown';
      existing.unit          = q.unit       || 'unknown';
      existing.difficulty    = q.difficulty || 'medium';
      existing.isMulti       = isMulti;
      existing.lastAnswer    = userAns;
      existing.correctAnswer = q.answer;
      switch (result) {
        case 'correct':
          existing.correctCount++;
          existing.lastResult  = 'correct';
          existing.everCorrect = true;
          break;
        case 'partial':
          existing.partialCount++;
          existing.lastResult = 'partial';
          break;
        case 'wrong':
          existing.wrongCount++;
          existing.lastResult = 'wrong';
          break;
        default:
          existing.skipCount++;
          existing.lastResult = 'skipped';
          break;
      }
      solvedMap[qKey] = existing;
      var subj = q.subject || 'unknown';
      if (!quizSummary.subjects[subj]) {
        quizSummary.subjects[subj] = { total: 0, correct: 0, partial: 0 };
      }
      quizSummary.subjects[subj].total++;
      if (result === 'correct') quizSummary.subjects[subj].correct++;
      if (result === 'partial') quizSummary.subjects[subj].partial++;
    }
    setStoredData(STORAGE_KEY, solvedMap);
    var quizLog = getStoredData(QUIZ_LOG_KEY, []);
    quizLog.unshift(quizSummary);
    if (quizLog.length > 100) quizLog.length = 100;
    setStoredData(QUIZ_LOG_KEY, quizLog);
    console.log('[FilterHistory] Saved results for', questions.length, 'questions');
    return quizSummary;
  }

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
          partialCount: record.partialCount || 0,
          isMulti:      record.isMulti      || false
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
          partialCount: 0,
          isMulti:      q.multi === true
        };
      }
    }
    return questions;
  }

  function getOverallStats() {
    var solvedMap = getSolvedMap();
    var keys      = Object.keys(solvedMap);
    var stats = {
      totalSolved:   keys.length,
      totalCorrect:  0,
      totalWrong:    0,
      totalSkipped:  0,
      totalPartial:  0,
      totalMulti:    0,
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
        case 'partial': stats.totalPartial++;  break;
        default:        stats.totalSkipped++;  break;
      }
      if (record.everCorrect)   stats.everCorrect++;
      if (record.isMulti)       stats.totalMulti++;
      var subj = record.subject || 'unknown';
      if (!stats.bySubject[subj]) {
        stats.bySubject[subj] = { solved: 0, correct: 0, wrong: 0, partial: 0 };
      }
      stats.bySubject[subj].solved++;
      if (record.everCorrect)           stats.bySubject[subj].correct++;
      if (record.lastResult === 'wrong') stats.bySubject[subj].wrong++;
      if (record.lastResult === 'partial') stats.bySubject[subj].partial++;
    }
    return stats;
  }

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
        case 'unseen':        include = !record; break;
        case 'correct':       include = !!(record && record.lastResult === 'correct'); break;
        case 'wrong':         include = !!(record && record.lastResult === 'wrong'); break;
        case 'partial':       include = !!(record && record.lastResult === 'partial'); break;
        case 'attempted':     include = !!record; break;
        case 'never-correct': include = !record || !record.everCorrect; break;
        case 'skipped':       include = !!(record && record.lastResult === 'skipped'); break;
        default:              include = true; break;
      }
      if (include) result.push(q);
    }
    return result;
  }

  function getQuizLog() {
    return getStoredData(QUIZ_LOG_KEY, []);
  }

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

  window.FilterHistory = {
    saveQuizResults,
    getSolvedMap,
    getQuestionStatus,
    wasEverCorrect,
    getQuestionRecord,
    tagQuestionsWithHistory,
    getOverallStats,
    countByStatus,
    filterByHistory,
    getQuizLog,
    clearAllHistory,
    getQuestionKey,
    evaluateAnswer,
    isAttemptedAnswer,
  };

})(window);