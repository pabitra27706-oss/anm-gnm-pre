/**
 * results-loader.js
 * PURPOSE : Safely read all result types from localStorage,
 *           merge them into one sorted array with type tags.
 * PATTERN : IIFE → exposes ResultsLoader to window
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════
     CONSTANTS
  ═══════════════════════════════════════════════════════ */
  var KEYS = {
    mock:     'mock_results',
    practice: 'practice_results',
    pyq:      'pyq_results'
  };

  /* Subject display name map (Bengali) */
  var SUBJECT_NAMES = {
    'life-science':       'জীবন বিজ্ঞান',
    'physical-science':   'ভৌত বিজ্ঞান',
    'mathematics':        'গণিত',
    'english':            'ইংরেজি',
    'general-knowledge':  'সাধারণ জ্ঞান',
    'anatomy':            'অ্যানাটমি',
    'physiology':         'ফিজিওলজি',
    'nursing':            'নার্সিং',
    'nutrition':          'পুষ্টি বিজ্ঞান',
    'community-health':   'কমিউনিটি স্বাস্থ্য'
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
     UTILITY: Validate required fields
  ═══════════════════════════════════════════════════════ */

  /**
   * Check a mock result has minimum required fields.
   * @param {*} item
   * @returns {boolean}
   */
  function isValidMock(item) {
    return (
      item !== null &&
      typeof item === 'object' &&
      (item.mockId !== undefined || item.totalScore !== undefined)
    );
  }

  /**
   * Check a practice result has minimum required fields.
   * @param {*} item
   * @returns {boolean}
   */
  function isValidPractice(item) {
    return (
      item !== null &&
      typeof item === 'object' &&
      item.subject !== undefined
    );
  }

  /**
   * Check a PYQ result has minimum required fields.
   * @param {*} item
   * @returns {boolean}
   */
  function isValidPYQ(item) {
    return (
      item !== null &&
      typeof item === 'object' &&
      (item.paperId !== undefined || item.totalScore !== undefined)
    );
  }

  /* ═══════════════════════════════════════════════════════
     DISPLAY TITLE BUILDERS
  ═══════════════════════════════════════════════════════ */

  /**
   * Build display title for mock test.
   * e.g. "মক টেস্ট ০১"
   * @param {Object} item
   * @returns {string}
   */
  function buildMockTitle(item) {
    try {
      if (item.mockId !== undefined && item.mockId !== null) {
        return 'মক টেস্ট ' + toBengaliNum(
          String(item.mockId).padStart(2, '0')
        );
      }
      return 'মক টেস্ট';
    } catch (e) {
      return 'মক টেস্ট';
    }
  }

  /**
   * Build display title for practice set.
   * e.g. "জীবন বিজ্ঞান - সেট ০১"
   * @param {Object} item
   * @returns {string}
   */
  function buildPracticeTitle(item) {
    try {
      var subjectLabel = SUBJECT_NAMES[item.subject] || item.subject || 'অনুশীলন';
      var setLabel = '';
      if (item.set !== undefined && item.set !== null) {
        setLabel = ' - সেট ' + toBengaliNum(
          String(item.set).padStart(2, '0')
        );
      }
      return subjectLabel + setLabel;
    } catch (e) {
      return 'অনুশীলন';
    }
  }

  /**
   * Build display title for PYQ paper.
   * e.g. "পুরনো প্রশ্ন ২০২৩"
   * @param {Object} item
   * @returns {string}
   */
  function buildPYQTitle(item) {
    try {
      if (item.paperId !== undefined && item.paperId !== null) {
        return 'পুরনো প্রশ্ন ' + toBengaliNum(item.paperId);
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
   * Handles string "71.74" or number 71.74.
   * Falls back to computing from score/maxScore.
   * @param {Object} item
   * @returns {number}
   */
  function normalizePercentage(item) {
    try {
      if (item.percentage !== undefined && item.percentage !== null) {
        var pct = parseFloat(item.percentage);
        if (!isNaN(pct)) return Math.min(100, Math.max(0, pct));
      }
      /* Compute from totalScore / maxScore */
      if (item.totalScore !== undefined && item.maxScore) {
        var computed = (parseFloat(item.totalScore) / parseFloat(item.maxScore)) * 100;
        if (!isNaN(computed)) return Math.min(100, Math.max(0, computed));
      }
      /* Compute from correct / total (practice) */
      if (item.correct !== undefined && item.total !== undefined && item.total > 0) {
        var prac = (item.correct / item.total) * 100;
        if (!isNaN(prac)) return Math.min(100, Math.max(0, prac));
      }
      return 0;
    } catch (e) {
      return 0;
    }
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: getMockResults
  ═══════════════════════════════════════════════════════ */

  /**
   * Load mock results from localStorage.
   * Validates each item, filters invalid ones.
   * @returns {Array}
   */
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

  /**
   * Load practice results from localStorage.
   * @returns {Array}
   */
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

  /**
   * Load PYQ results from localStorage.
   * @returns {Array}
   */
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

  /**
   * Merge all result types into one array.
   * Each item gets:
   *   type         : 'mock' | 'practice' | 'pyq'
   *   displayTitle : Bengali string
   *   displayDate  : Formatted Bengali date
   *   normalizedPct: number 0–100
   *   _timestamp   : number for sorting
   *
   * Sorted by timestamp descending (newest first).
   * @returns {Array}
   */
  function getAllResults() {
    console.log('[Loader] getAllResults() called');

    var mocks    = getMockResults();
    var practice = getPracticeResults();
    var pyqs     = getPYQResults();

    /* Tag mock results */
    var taggedMocks = mocks.map(function (item) {
      return Object.assign({}, item, {
        type:          'mock',
        displayTitle:  buildMockTitle(item),
        displayDate:   formatDate(item.date),
        normalizedPct: normalizePercentage(item),
        _timestamp:    getTimestamp(item)
      });
    });

    /* Tag practice results */
    var taggedPractice = practice.map(function (item) {
      return Object.assign({}, item, {
        type:          'practice',
        displayTitle:  buildPracticeTitle(item),
        displayDate:   formatDate(item.date),
        normalizedPct: normalizePercentage(item),
        _timestamp:    getTimestamp(item)
      });
    });

    /* Tag PYQ results */
    var taggedPYQs = pyqs.map(function (item) {
      return Object.assign({}, item, {
        type:          'pyq',
        displayTitle:  buildPYQTitle(item),
        displayDate:   formatDate(item.date),
        normalizedPct: normalizePercentage(item),
        _timestamp:    getTimestamp(item)
      });
    });

    /* Merge */
    var merged = taggedMocks.concat(taggedPractice).concat(taggedPYQs);

    /* Sort by timestamp descending */
    merged.sort(function (a, b) {
      return b._timestamp - a._timestamp;
    });

    console.log('[Loader] Total merged results:', merged.length);
    return merged;
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: clearAllResults
  ═══════════════════════════════════════════════════════ */

  /**
   * Remove all result keys from localStorage.
   * Returns true on success, false on error.
   * @returns {boolean}
   */
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
     (exposed so results-app can use it for card rendering)
  ═══════════════════════════════════════════════════════ */

  /**
   * Get Bengali display name for a subject key.
   * @param {string} key
   * @returns {string}
   */
  function getSubjectName(key) {
    return SUBJECT_NAMES[key] || key || 'অজানা বিষয়';
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: toBengaliNum (re-export for use in app)
  ═══════════════════════════════════════════════════════ */

  /* ═══════════════════════════════════════════════════════
     EXPOSE TO WINDOW
  ═══════════════════════════════════════════════════════ */
  window.ResultsLoader = {
    getMockResults:     getMockResults,
    getPracticeResults: getPracticeResults,
    getPYQResults:      getPYQResults,
    getAllResults:       getAllResults,
    clearAllResults:    clearAllResults,
    getSubjectName:     getSubjectName,
    toBengaliNum:       toBengaliNum,
    formatDate:         formatDate,
    normalizePercentage: normalizePercentage
  };

  console.log('[Loader] ResultsLoader ready');

})();