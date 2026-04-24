/* ============================================================
   MOCK-STORAGE.JS
   WB ANM GNM 2026 - LocalStorage Manager
   Exposed as: window.MockStorage
   ============================================================ */

(function () {
  'use strict';

  /* ── Storage Keys ──────────────────────────────────────── */
  var RESULTS_KEY  = 'wb_anm_mock_results';
  var PROGRESS_KEY = 'wb_anm_mock_progress';
  var MAX_RESULTS  = 200;

  /* ── Public API ────────────────────────────────────────── */
  window.MockStorage = {
    saveResult:       saveResult,
    getResults:       getResults,
    getLatestResult:  getLatestResult,
    getBestResult:    getBestResult,
    getAllResults:     getAllResults,
    saveProgress:     saveProgress,
    getProgress:      getProgress,
    clearProgress:    clearProgress,
    clearAllResults:  clearAllResults,
    getStats:         getStats
  };

  /* ══════════════════════════════════════════════════════════
     SAVE RESULT
  ══════════════════════════════════════════════════════════ */
  function saveResult(mockId, resultData) {
    console.log('MockStorage: saveResult()', mockId);

    if (!mockId) {
      console.error('MockStorage: saveResult — mockId is required');
      return false;
    }

    if (!resultData || typeof resultData !== 'object') {
      console.error('MockStorage: saveResult — resultData is invalid');
      return false;
    }

    try {
      /* Load existing results */
      var results = loadResultsArray();

      /* Build sanitised entry */
      var entry = {
        mockId:      String(mockId),
        totalScore:  safeNumber(resultData.totalScore, 0),
        maxScore:    safeNumber(resultData.maxScore, 115),
        percentage:  safeString(resultData.percentage, '0.00'),
        timeTaken:   safeString(resultData.timeTaken, '00:00'),
        date:        new Date().toISOString(),
        timestamp:   Date.now(),

        /* Cat1 details */
        cat1Score:       safeNumber(
          resultData.cat1 && resultData.cat1.score, 0
        ),
        cat1Correct:     safeNumber(
          resultData.cat1 && resultData.cat1.correct, 0
        ),
        cat1Wrong:       safeNumber(
          resultData.cat1 && resultData.cat1.wrong, 0
        ),
        cat1Unattempted: safeNumber(
          resultData.cat1 && resultData.cat1.unattempted, 0
        ),

        /* Cat2 details */
        cat2Score:          safeNumber(
          resultData.cat2 && resultData.cat2.score, 0
        ),
        cat2FullyCorrect:   safeNumber(
          resultData.cat2 && resultData.cat2.fullyCorrect, 0
        ),
        cat2PartialCorrect: safeNumber(
          resultData.cat2 && resultData.cat2.partialCorrect, 0
        ),
        cat2Wrong:          safeNumber(
          resultData.cat2 && resultData.cat2.wrong, 0
        ),
        cat2Unattempted:    safeNumber(
          resultData.cat2 && resultData.cat2.unattempted, 0
        ),

        /* Aggregates */
        totalCorrect:     safeNumber(resultData.totalCorrect, 0),
        totalWrong:       safeNumber(resultData.totalWrong, 0),
        totalUnattempted: safeNumber(resultData.totalUnattempted, 0),

        /* Subject analysis (simplified — only store keys+accuracy) */
        subjectAnalysis: sanitiseSubjectAnalysis(
          resultData.subjectAnalysis
        ),

        /* User answers (for review page) */
        answers:      sanitiseAnswers(resultData.answers),
        markedReview: sanitiseMarkedReview(resultData.markedReview)
      };

      results.push(entry);

      /* Trim to max */
      if (results.length > MAX_RESULTS) {
        results = results.slice(results.length - MAX_RESULTS);
      }

      localStorage.setItem(RESULTS_KEY, JSON.stringify(results));

      console.log(
        'MockStorage: Result saved — score:', entry.totalScore,
        '| total results:', results.length
      );

      /* Clear in-progress after save */
      clearProgress(mockId);

      return true;

    } catch (error) {
      console.error('MockStorage: saveResult error —', error);

      /* Try to free space if quota exceeded */
      if (error.name === 'QuotaExceededError') {
        console.warn('MockStorage: Storage quota exceeded — trimming old data');
        trimStorageAndRetry(mockId, resultData);
      }

      return false;
    }
  }

  /* ── Retry after trimming ──────────────────────────────── */
  function trimStorageAndRetry(mockId, resultData) {
    try {
      var results = loadResultsArray();
      /* Keep only last 50 */
      results = results.slice(-50);
      localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
      console.log('MockStorage: Storage trimmed — retrying save');
      saveResult(mockId, resultData);
    } catch (retryError) {
      console.error('MockStorage: Retry also failed —', retryError);
    }
  }

  /* ══════════════════════════════════════════════════════════
     GET RESULTS FOR A MOCK ID
  ══════════════════════════════════════════════════════════ */
  function getResults(mockId) {
    console.log('MockStorage: getResults()', mockId);

    if (!mockId) {
      console.error('MockStorage: getResults — mockId is required');
      return [];
    }

    try {
      var all = loadResultsArray();
      var filtered = all.filter(function (r) {
        return r && String(r.mockId) === String(mockId);
      });

      console.log(
        'MockStorage: getResults —', filtered.length,
        'results for mock', mockId
      );

      return filtered;

    } catch (error) {
      console.error('MockStorage: getResults error —', error);
      return [];
    }
  }

  /* ══════════════════════════════════════════════════════════
     GET LATEST RESULT FOR A MOCK ID
  ══════════════════════════════════════════════════════════ */
  function getLatestResult(mockId) {
    console.log('MockStorage: getLatestResult()', mockId);

    var results = getResults(mockId);

    if (results.length === 0) {
      console.log('MockStorage: No results found for mock', mockId);
      return null;
    }

    /* Sort by timestamp descending */
    var sorted = results.slice().sort(function (a, b) {
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    console.log(
      'MockStorage: Latest result — score:', sorted[0].totalScore
    );

    return sorted[0];
  }

  /* ══════════════════════════════════════════════════════════
     GET BEST RESULT FOR A MOCK ID
  ══════════════════════════════════════════════════════════ */
  function getBestResult(mockId) {
    console.log('MockStorage: getBestResult()', mockId);

    var results = getResults(mockId);

    if (results.length === 0) {
      return null;
    }

    var best = results.reduce(function (bestSoFar, current) {
      if (!bestSoFar) return current;

      var bestScore    = safeNumber(bestSoFar.totalScore, 0);
      var currentScore = safeNumber(current.totalScore,   0);

      return currentScore > bestScore ? current : bestSoFar;
    }, null);

    console.log(
      'MockStorage: Best result — score:', best ? best.totalScore : 'N/A'
    );

    return best;
  }

  /* ══════════════════════════════════════════════════════════
     GET ALL RESULTS (all mocks)
  ══════════════════════════════════════════════════════════ */
  function getAllResults() {
    console.log('MockStorage: getAllResults()');

    try {
      var all = loadResultsArray();
      console.log('MockStorage: Total results in storage —', all.length);
      return all;
    } catch (error) {
      console.error('MockStorage: getAllResults error —', error);
      return [];
    }
  }

  /* ══════════════════════════════════════════════════════════
     SAVE IN-PROGRESS (for resume functionality)
  ══════════════════════════════════════════════════════════ */
  function saveProgress(mockId, progressData) {
    console.log('MockStorage: saveProgress()', mockId);

    if (!mockId || !progressData) {
      console.warn('MockStorage: saveProgress — invalid params');
      return false;
    }

    try {
      var key   = PROGRESS_KEY + '_' + String(mockId);
      var entry = {
        mockId:        String(mockId),
        savedAt:       Date.now(),
        answers:       sanitiseAnswers(progressData.answers),
        markedReview:  sanitiseMarkedReview(progressData.markedReview),
        currentIndex:  safeNumber(progressData.currentIndex, 0),
        timeRemaining: safeNumber(progressData.timeRemaining, 5400)
      };

      localStorage.setItem(key, JSON.stringify(entry));
      console.log('MockStorage: Progress saved for mock', mockId);
      return true;

    } catch (error) {
      console.error('MockStorage: saveProgress error —', error);
      return false;
    }
  }

  /* ══════════════════════════════════════════════════════════
     GET IN-PROGRESS
  ══════════════════════════════════════════════════════════ */
  function getProgress(mockId) {
    console.log('MockStorage: getProgress()', mockId);

    if (!mockId) {
      console.warn('MockStorage: getProgress — mockId required');
      return null;
    }

    try {
      var key    = PROGRESS_KEY + '_' + String(mockId);
      var stored = localStorage.getItem(key);

      if (!stored) {
        console.log('MockStorage: No progress found for mock', mockId);
        return null;
      }

      var data = JSON.parse(stored);

      if (!data || typeof data !== 'object') {
        console.warn('MockStorage: Invalid progress data for mock', mockId);
        return null;
      }

      /* Check if progress is stale (> 3 hours) */
      var savedAt  = safeNumber(data.savedAt, 0);
      var ageHours = (Date.now() - savedAt) / (1000 * 60 * 60);

      if (ageHours > 3) {
        console.log('MockStorage: Progress is stale — clearing');
        clearProgress(mockId);
        return null;
      }

      console.log('MockStorage: Progress found for mock', mockId);
      return data;

    } catch (error) {
      console.error('MockStorage: getProgress error —', error);
      return null;
    }
  }

  /* ══════════════════════════════════════════════════════════
     CLEAR PROGRESS FOR A MOCK
  ══════════════════════════════════════════════════════════ */
  function clearProgress(mockId) {
    if (!mockId) return;

    try {
      var key = PROGRESS_KEY + '_' + String(mockId);
      localStorage.removeItem(key);
      console.log('MockStorage: Progress cleared for mock', mockId);
    } catch (error) {
      console.error('MockStorage: clearProgress error —', error);
    }
  }

  /* ══════════════════════════════════════════════════════════
     CLEAR ALL RESULTS
  ══════════════════════════════════════════════════════════ */
  function clearAllResults() {
    console.log('MockStorage: clearAllResults()');

    try {
      localStorage.removeItem(RESULTS_KEY);
      console.log('MockStorage: All results cleared');
      return true;
    } catch (error) {
      console.error('MockStorage: clearAllResults error —', error);
      return false;
    }
  }

  /* ══════════════════════════════════════════════════════════
     GET AGGREGATE STATS
  ══════════════════════════════════════════════════════════ */
  function getStats() {
    console.log('MockStorage: getStats()');

    try {
      var all = loadResultsArray();

      if (all.length === 0) {
        return {
          totalAttempts: 0,
          averageScore:  0,
          bestScore:     0,
          worstScore:    0,
          uniqueMocks:   0
        };
      }

      var scores     = all.map(function (r) {
        return safeNumber(r.totalScore, 0);
      });
      var uniqueMocks = new Set(all.map(function (r) {
        return r.mockId;
      })).size;
      var avgScore   = scores.reduce(function (sum, s) {
        return sum + s;
      }, 0) / scores.length;

      return {
        totalAttempts: all.length,
        averageScore:  parseFloat(avgScore.toFixed(2)),
        bestScore:     Math.max.apply(null, scores),
        worstScore:    Math.min.apply(null, scores),
        uniqueMocks:   uniqueMocks
      };

    } catch (error) {
      console.error('MockStorage: getStats error —', error);
      return { totalAttempts: 0, averageScore: 0, bestScore: 0,
               worstScore: 0, uniqueMocks: 0 };
    }
  }

  /* ══════════════════════════════════════════════════════════
     PRIVATE HELPERS
  ══════════════════════════════════════════════════════════ */

  function loadResultsArray() {
    try {
      var stored = localStorage.getItem(RESULTS_KEY);
      if (!stored) return [];

      var parsed = JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        console.warn('MockStorage: Stored results is not an array — resetting');
        return [];
      }

      return parsed;

    } catch (parseError) {
      console.warn('MockStorage: Corrupt results data — resetting', parseError);
      try {
        localStorage.removeItem(RESULTS_KEY);
      } catch (e) { /* ignore */ }
      return [];
    }
  }

  function sanitiseAnswers(answers) {
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return {};
    }
    var safe = {};
    Object.keys(answers).forEach(function (key) {
      var val = answers[key];
      if (
        typeof val === 'number' ||
        Array.isArray(val)
      ) {
        safe[key] = val;
      }
    });
    return safe;
  }

  function sanitiseMarkedReview(markedReview) {
    if (!markedReview) return [];
    if (Array.isArray(markedReview)) {
      return markedReview.filter(function (v) {
        return typeof v === 'number';
      });
    }
    return [];
  }

  function sanitiseSubjectAnalysis(analysis) {
    if (!analysis || typeof analysis !== 'object') return {};
    var safe = {};
    Object.keys(analysis).forEach(function (subject) {
      var data = analysis[subject];
      if (!data || typeof data !== 'object') return;
      safe[subject] = {
        subject:     safeString(data.subject, subject),
        subjectName: safeString(data.subjectName, subject),
        total:       safeNumber(data.total, 0),
        correct:     safeNumber(data.correct, 0),
        wrong:       safeNumber(data.wrong, 0),
        unattempted: safeNumber(data.unattempted, 0),
        accuracy:    safeNumber(data.accuracy, 0),
        score:       safeNumber(data.score, 0),
        maxScore:    safeNumber(data.maxScore, 0)
      };
    });
    return safe;
  }

  function safeNumber(val, defaultVal) {
    var n = parseFloat(val);
    return (isNaN(n) || val === null || val === undefined)
      ? (defaultVal || 0)
      : n;
  }

  function safeString(val, defaultVal) {
    if (val === null || val === undefined) return defaultVal || '';
    return String(val);
  }

  console.log('MockStorage: Module loaded — window.MockStorage ready');

}());