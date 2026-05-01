/**
 * results-loader.js - WB ANM GNM Platform Compatible
 * Reads from actual localStorage keys used across the platform
 * 
 * Storage Keys used by the platform:
 * - wb_anm_mock_results : Mock test results (from mock-test/js/mock-storage.js)
 * - practice_results     : Practice quiz results (from practice/js/quiz-storage.js)
 * - pyq_results          : PYQ results (from pyq/js/pyq-storage.js)
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════
     CONSTANTS - Matches actual platform storage keys
  ═══════════════════════════════════════════════════════ */
  var KEYS = {
    mock:     'wb_anm_mock_results',     // ✅ From mock-storage.js
    practice: 'practice_results',         // ✅ From quiz-storage.js
    pyq:      'pyq_results'              // ✅ From pyq-storage.js (create if missing)
  };

  /* Subject display name map (matches your practice/ subjects) */
  var SUBJECT_NAMES = {
    'life-science': 'জীবন বিজ্ঞান',
    'general-science': 'সাধারণ বিজ্ঞান',
    'physical-science': 'ভৌত বিজ্ঞান',
    'arithmetic-mathematics': 'পাটিগণিত ও গণিত',
    'mathematics': 'গণিত',
    'reasoning-general-knowledge': 'যুক্তি ও সাধারণ জ্ঞান',
    'general-knowledge': 'সাধারণ জ্ঞান',
    'english-grammar': 'ইংরেজি ব্যাকরণ',
    'english': 'ইংরেজি',
    'anatomy': 'অ্যানাটমি',
    'physiology': 'ফিজিওলজি',
    'nursing': 'নার্সিং',
    'nutrition': 'পুষ্টি বিজ্ঞান',
    'community-health': 'কমিউনিটি স্বাস্থ্য'
  };

  /* ═══════════════════════════════════════════════════════
     UTILITY: Safe localStorage Read
  ═══════════════════════════════════════════════════════ */

  /**
   * Safely read and parse a localStorage key.
   * Always returns an array (never null / undefined).
   * @param {string} key
   * @returns {Array}
   */
  function getStoredArray(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) {
        console.log('[Loader] No data found for key:', key);
        return [];
      }
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        console.warn('[Loader] Data for key is not an array:', key, parsed);
        return [];
      }
      console.log('[Loader] Loaded', parsed.length, 'records for key:', key);
      return parsed;
    } catch (err) {
      console.error('[Loader] Failed to read key:', key, err);
      return [];
    }
  }

  /* ═══════════════════════════════════════════════════════
     UTILITY: Bengali numeral converter
  ═══════════════════════════════════════════════════════ */

  /**
   * Convert Western digits to Bengali digits.
   * @param {string|number} value
   * @returns {string}
   */
  function toBengaliNum(value) {
    var map = {
      '0':'০','1':'১','2':'২','3':'৩','4':'৪',
      '5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'
    };
    return String(value).replace(/[0-9]/g, function (d) {
      return map[d] || d;
    });
  }

  /* ═══════════════════════════════════════════════════════
     UTILITY: Format date to Bengali-friendly string
  ═══════════════════════════════════════════════════════ */

  /**
   * Format ISO date string to readable Bengali date.
   * @param {string} dateStr  ISO 8601 date string
   * @returns {string}  e.g. "১৫ জানুয়ারি ২০২৫"
   */
  function formatDate(dateStr) {
    try {
      if (!dateStr) return 'তারিখ অজানা';
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'তারিখ অজানা';

      var months = [
        'জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল',
        'মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর',
        'অক্টোবর','নভেম্বর','ডিসেম্বর'
      ];

      var day   = toBengaliNum(d.getDate());
      var month = months[d.getMonth()];
      var year  = toBengaliNum(d.getFullYear());

      return day + ' ' + month + ' ' + year;
    } catch (err) {
      console.error('[Loader] Date format error:', err);
      return 'তারিখ অজানা';
    }
  }

  /* ═══════════════════════════════════════════════════════
     UTILITY: Get timestamp safely from a result object
  ═══════════════════════════════════════════════════════ */

  /**
   * Extract a numeric timestamp for sorting.
   * Falls back to Date.parse(date) then 0.
   * @param {Object} result
   * @returns {number}
   */
  function getTimestamp(result) {
    if (!result) return 0;
    if (typeof result.timestamp === 'number' && result.timestamp > 0) {
      return result.timestamp;
    }
    if (result.date) {
      var t = Date.parse(result.date);
      return isNaN(t) ? 0 : t;
    }
    return 0;
  }

  /* ═══════════════════════════════════════════════════════
     VALIDATION FUNCTIONS
  ═══════════════════════════════════════════════════════ */

  function isValidMock(item) {
    return (
      item !== null &&
      typeof item === 'object' &&
      (item.mockId !== undefined || item.totalScore !== undefined)
    );
  }

  function isValidPractice(item) {
    return (
      item !== null &&
      typeof item === 'object' &&
      (item.subject !== undefined || item.score !== undefined)
    );
  }

  function isValidPYQ(item) {
    return (
      item !== null &&
      typeof item === 'object' &&
      (item.paperId !== undefined || item.totalScore !== undefined || item.year !== undefined)
    );
  }

  /* ═══════════════════════════════════════════════════════
     DISPLAY TITLE BUILDERS
  ═══════════════════════════════════════════════════════ */

  function buildMockTitle(item) {
    try {
      if (item.mockId !== undefined && item.mockId !== null) {
        // Handle both number and string mockId
        var id = item.mockId;
        if (typeof id === 'number') {
          return 'মক টেস্ট ' + toBengaliNum(String(id).padStart(2, '0'));
        }
        if (typeof id === 'string' && !isNaN(parseInt(id))) {
          return 'মক টেস্ট ' + toBengaliNum(String(parseInt(id)).padStart(2, '0'));
        }
        return 'মক টেস্ট';
      }
      return 'মক টেস্ট';
    } catch (e) {
      return 'মক টেস্ট';
    }
  }

  function buildPracticeTitle(item) {
    try {
      var subjectLabel = SUBJECT_NAMES[item.subject] || item.subject || 'অনুশীলন';
      var setLabel = '';
      if (item.set !== undefined && item.set !== null) {
        var setNum = typeof item.set === 'number' ? item.set : parseInt(item.set);
        if (!isNaN(setNum)) {
          setLabel = ' - সেট ' + toBengaliNum(String(setNum).padStart(2, '0'));
        }
      }
      return subjectLabel + setLabel;
    } catch (e) {
      return 'অনুশীলন';
    }
  }

  function buildPYQTitle(item) {
    try {
      if (item.paperId !== undefined && item.paperId !== null) {
        return 'পুরনো প্রশ্ন ' + toBengaliNum(item.paperId);
      }
      if (item.year !== undefined && item.year !== null) {
        return 'পুরনো প্রশ্ন ' + toBengaliNum(item.year);
      }
      return 'পুরনো প্রশ্ন';
    } catch (e) {
      return 'পুরনো প্রশ্ন';
    }
  }

  /* ═══════════════════════════════════════════════════════
     PERCENTAGE NORMALIZER
  ═══════════════════════════════════════════════════════ */

  /**
   * Get percentage as a clean number (0–100).
   * Handles various data formats from different modules.
   * @param {Object} item
   * @returns {number}
   */
  function normalizePercentage(item) {
    try {
      // If percentage already exists as number or string
      if (item.percentage !== undefined && item.percentage !== null) {
        var pct = parseFloat(item.percentage);
        if (!isNaN(pct)) return Math.min(100, Math.max(0, pct));
      }
      
      // For mock tests: totalScore / maxScore (maxScore default 115)
      if (item.totalScore !== undefined && item.maxScore !== undefined && item.maxScore > 0) {
        var computed = (parseFloat(item.totalScore) / parseFloat(item.maxScore)) * 100;
        if (!isNaN(computed)) return Math.min(100, Math.max(0, computed));
      }
      
      // For mock tests with only totalScore (use default maxScore 115)
      if (item.totalScore !== undefined && item.maxScore === undefined) {
        var defaultComputed = (parseFloat(item.totalScore) / 115) * 100;
        if (!isNaN(defaultComputed)) return Math.min(100, Math.max(0, defaultComputed));
      }
      
      // For practice: correct / total
      if (item.correct !== undefined && item.total !== undefined && item.total > 0) {
        var prac = (item.correct / item.total) * 100;
        if (!isNaN(prac)) return Math.min(100, Math.max(0, prac));
      }
      
      // For practice with score/total
      if (item.score !== undefined && item.total !== undefined && item.total > 0) {
        var scorePct = (item.score / item.total) * 100;
        if (!isNaN(scorePct)) return Math.min(100, Math.max(0, scorePct));
      }
      
      // For practice with displayScore/total
      if (item.displayScore !== undefined && item.total !== undefined && item.total > 0) {
        var displayPct = (item.displayScore / item.total) * 100;
        if (!isNaN(displayPct)) return Math.min(100, Math.max(0, displayPct));
      }
      
      return 0;
    } catch (e) {
      return 0;
    }
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: getMockResults
  ═══════════════════════════════════════════════════════ */

  function getMockResults() {
    var raw = getStoredArray(KEYS.mock);
    var valid = raw.filter(function (item) {
      var ok = isValidMock(item);
      if (!ok) console.warn('[Loader] Skipping invalid mock result:', item);
      return ok;
    });
    console.log('[Loader] Valid mock results:', valid.length);
    return valid;
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: getPracticeResults
  ═══════════════════════════════════════════════════════ */

  function getPracticeResults() {
    var raw = getStoredArray(KEYS.practice);
    var valid = raw.filter(function (item) {
      var ok = isValidPractice(item);
      if (!ok) console.warn('[Loader] Skipping invalid practice result:', item);
      return ok;
    });
    console.log('[Loader] Valid practice results:', valid.length);
    return valid;
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: getPYQResults
  ═══════════════════════════════════════════════════════ */

  function getPYQResults() {
    var raw = getStoredArray(KEYS.pyq);
    var valid = raw.filter(function (item) {
      var ok = isValidPYQ(item);
      if (!ok) console.warn('[Loader] Skipping invalid PYQ result:', item);
      return ok;
    });
    console.log('[Loader] Valid PYQ results:', valid.length);
    return valid;
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: getAllResults
  ═══════════════════════════════════════════════════════ */

  function getAllResults() {
    console.log('[Loader] getAllResults() called');

    var mocks    = getMockResults();
    var practice = getPracticeResults();
    var pyqs     = getPYQResults();

    var taggedMocks = mocks.map(function (item) {
      return Object.assign({}, item, {
        type:          'mock',
        displayTitle:  buildMockTitle(item),
        displayDate:   formatDate(item.date),
        normalizedPct: normalizePercentage(item),
        _timestamp:    getTimestamp(item)
      });
    });

    var taggedPractice = practice.map(function (item) {
      return Object.assign({}, item, {
        type:          'practice',
        displayTitle:  buildPracticeTitle(item),
        displayDate:   formatDate(item.date),
        normalizedPct: normalizePercentage(item),
        _timestamp:    getTimestamp(item)
      });
    });

    var taggedPYQs = pyqs.map(function (item) {
      return Object.assign({}, item, {
        type:          'pyq',
        displayTitle:  buildPYQTitle(item),
        displayDate:   formatDate(item.date),
        normalizedPct: normalizePercentage(item),
        _timestamp:    getTimestamp(item)
      });
    });

    var merged = taggedMocks.concat(taggedPractice).concat(taggedPYQs);

    merged.sort(function (a, b) {
      return b._timestamp - a._timestamp;
    });

    console.log('[Loader] Total merged results:', merged.length);
    console.log('[Loader] Breakdown - Mock:', taggedMocks.length, 
                'Practice:', taggedPractice.length, 
                'PYQ:', taggedPYQs.length);
    
    return merged;
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: clearAllResults
  ═══════════════════════════════════════════════════════ */

  function clearAllResults() {
    try {
      localStorage.removeItem(KEYS.mock);
      localStorage.removeItem(KEYS.practice);
      localStorage.removeItem(KEYS.pyq);
      
      console.log('[Loader] All results cleared from localStorage');
      return true;
    } catch (err) {
      console.error('[Loader] Failed to clear results:', err);
      return false;
    }
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: getSubjectName
  ═══════════════════════════════════════════════════════ */

  function getSubjectName(key) {
    return SUBJECT_NAMES[key] || key || 'অজানা বিষয়';
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: getCompletedPracticeSetsCount
     Optional - reads from practice_completed key
  ═══════════════════════════════════════════════════════ */

  function getCompletedPracticeSetsCount() {
    try {
      var raw = localStorage.getItem('practice_completed');
      if (!raw) return 0;
      var completed = JSON.parse(raw);
      if (typeof completed !== 'object') return 0;
      
      var total = 0;
      for (var subject in completed) {
        if (Array.isArray(completed[subject])) {
          total += completed[subject].length;
        }
      }
      return total;
    } catch (e) {
      console.warn('[Loader] Failed to get completed practice sets:', e);
      return 0;
    }
  }

  /* ═══════════════════════════════════════════════════════
     EXPOSE TO WINDOW
  ═══════════════════════════════════════════════════════ */
  window.ResultsLoader = {
    getMockResults:     getMockResults,
    getPracticeResults: getPracticeResults,
    getPYQResults:      getPYQResults,
    getAllResults:      getAllResults,
    clearAllResults:    clearAllResults,
    getSubjectName:     getSubjectName,
    toBengaliNum:       toBengaliNum,
    formatDate:         formatDate,
    normalizePercentage: normalizePercentage,
    getCompletedPracticeSetsCount: getCompletedPracticeSetsCount
  };

  console.log('[Loader] ResultsLoader ready with platform-compatible keys');

})();