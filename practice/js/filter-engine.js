/**
 * filter-engine.js
 * Applies filters to loaded question pool
 * WB ANM GNM 2026 Preparation Platform
 */

(function(window) {
  'use strict';

  // ─── Bengali Name Maps ──────────────────────────────────────────────────────

  const SUBJECT_BN = {
    'life-science'      : 'জীবন বিজ্ঞান',
    'physical-science'  : 'ভৌত বিজ্ঞান',
    'mathematics'       : 'গণিত',
    'general-knowledge' : 'সাধারণ জ্ঞান',
    'logical-reasoning' : 'যুক্তিবিদ্যা',
    'basic-english'     : 'ইংরেজি'
  };

  const UNIT_BN = {
    // life-science
    '01-cell-structure-functions' : 'কোষের গঠন',
    '02-tissues'                  : 'কলা',
    '03-digestive-system'         : 'পাচনতন্ত্র',
    '04-respiratory-system'       : 'শ্বসনতন্ত্র',
    '05-circulatory-system'       : 'রক্ত সংবহনতন্ত্র',
    '06-excretory-system'         : 'রেচনতন্ত্র',
    '07-nervous-system'           : 'স্নায়ুতন্ত্র',
    '08-reproductive-system'      : 'প্রজননতন্ত্র',
    '09-sense-organs'             : 'ইন্দ্রিয়',
    '10-nutrition-health'         : 'পুষ্টি ও স্বাস্থ্য',
    '11-common-diseases'          : 'সাধারণ রোগ',
    '12-immunity'                 : 'রোগ প্রতিরোধ',
    '13-first-aid-fundamentals'   : 'প্রাথমিক চিকিৎসা',
    // physical-science
    '01-matter-and-states'        : 'পদার্থ ও অবস্থা',
    '02-atomic-structure'         : 'পারমাণবিক গঠন',
    '03-chemical-reactions'       : 'রাসায়নিক বিক্রিয়া',
    '04-acids-bases-salts'        : 'অ্যাসিড, ক্ষার ও লবণ',
    '05-force-and-motion'         : 'বল ও গতি',
    '06-work-and-energy'          : 'কাজ ও শক্তি',
    '07-light-reflection-refraction': 'আলোর প্রতিফলন ও প্রতিসরণ',
    '08-electricity-and-circuits' : 'বিদ্যুৎ ও বর্তনী',
    '09-heat-and-temperature'     : 'তাপ ও তাপমাত্রা',
    '10-measurements'             : 'পরিমাপ',
    '11-basic-organic-chemistry'  : 'জৈব রসায়ন',
    '12-environmental-chemistry'  : 'পরিবেশ রসায়ন',
    // mathematics
    '01-number-system'            : 'সংখ্যা পদ্ধতি',
    '02-lcm-hcf'                  : 'লসাগু ও গসাগু',
    '03-fractions-decimals'       : 'ভগ্নাংশ',
    '04-ratio-proportion'         : 'অনুপাত',
    '05-percentages'              : 'শতাংশ',
    '06-profit-loss'              : 'লাভ ও ক্ষতি',
    '07-simple-interest'          : 'সরল সুদ',
    '08-compound-interest'        : 'চক্রবৃদ্ধি সুদ',
    '09-average'                  : 'গড়',
    '10-time-work'                : 'সময় ও কাজ',
    '11-speed-distance'           : 'গতি ও দূরত্ব',
    '12-mensuration'              : 'ক্ষেত্রমিতি',
    '13-data-interpretation'      : 'তথ্য বিশ্লেষণ',
    '14-basic-algebra'            : 'বীজগণিত',
    // general-knowledge
    '01-indian-history'           : 'ভারতীয় ইতিহাস',
    '02-indian-freedom-struggle'  : 'স্বাধীনতা আন্দোলন',
    '03-geography-physical'       : 'ভৌগোলিক বিজ্ঞান',
    '04-geography-political'      : 'রাজনৈতিক ভূগোল',
    '05-indian-polity'            : 'ভারতীয় রাজনীতি',
    '06-current-affairs'          : 'সাম্প্রতিক ঘটনা',
    '07-sports'                   : 'খেলাধুলা',
    '08-awards-honours'           : 'পুরস্কার ও সম্মান',
    '09-books-authors'            : 'বই ও লেখক',
    '10-science-technology'       : 'বিজ্ঞান ও প্রযুক্তি',
    '11-west-bengal-gk'           : 'পশ্চিমবঙ্গ সাধারণ জ্ঞান',
    // logical-reasoning
    '01-analogies'                : 'সাদৃশ্য',
    '02-classification'           : 'শ্রেণীবিভাগ',
    '03-number-series'            : 'সংখ্যা সিরিজ',
    '04-letter-series'            : 'অক্ষর সিরিজ',
    '05-coding-decoding'          : 'কোডিং-ডিকোডিং',
    '06-blood-relations'          : 'রক্ত সম্পর্ক',
    '07-direction-sense'          : 'দিক নির্ণয়',
    '08-syllogism'                : 'অনুমান',
    '09-seating-arrangement'      : 'আসন বিন্যাস',
    '10-puzzles'                  : 'ধাঁধা',
    '11-statement-assumption'     : 'বিবৃতি ও অনুমান',
    '12-cause-effect'             : 'কারণ ও প্রভাব',
    '13-venn-diagrams'            : 'ভেন চিত্র',
    '14-non-verbal-reasoning'     : 'অ-মৌখিক যুক্তি',
    // basic-english
    '01-tenses'                   : 'কাল',
    '02-articles'                 : 'আর্টিকেল',
    '03-prepositions'             : 'অব্যয়',
    '04-subject-verb-agreement'   : 'ক্রিয়া সামঞ্জস্য',
    '05-synonyms'                 : 'সমার্থক শব্দ',
    '06-antonyms'                 : 'বিপরীতার্থক শব্দ',
    '07-reading-comprehension'    : 'পাঠ বোঝার ক্ষমতা',
    '08-sentence-rearrangement'   : 'বাক্য পুনর্বিন্যাস',
    '09-error-spotting'           : 'ত্রুটি খোঁজা',
    '10-fill-in-the-blanks'       : 'শূন্যস্থান পূরণ',
    '11-one-word-substitution'    : 'এক শব্দে প্রকাশ',
    '12-basic-writing-skills'     : 'লেখার দক্ষতা'
  };

  const TYPE_BN = {
    'theory'     : 'তত্ত্ব',
    'numerical'  : 'গাণিতিক',
    'memory'     : 'মুখস্থ',
    'application': 'প্রয়োগ'
  };

  const DIFFICULTY_BN = {
    'easy'  : 'সহজ',
    'medium': 'মাঝারি',
    'hard'  : 'কঠিন'
  };

  // Subject color palette for UI
  const SUBJECT_COLORS = {
    'life-science'      : '#4caf50',
    'physical-science'  : '#2196f3',
    'mathematics'       : '#9c27b0',
    'general-knowledge' : '#ff9800',
    'logical-reasoning' : '#00bcd4',
    'basic-english'     : '#e91e63'
  };

  // Difficulty colors
  const DIFFICULTY_COLORS = {
    'easy'  : '#4caf50',
    'medium': '#ff9800',
    'hard'  : '#f44336'
  };

  // ─── Core Filter Function ───────────────────────────────────────────────────

  /**
   * Apply filters to question pool.
   * @param {Array}  questions  full question pool
   * @param {object} filters    filter configuration object
   * @returns {Array}           filtered (and optionally randomized/sliced) array
   */
  function applyFilters(questions, filters) {
    if (!questions || !Array.isArray(questions)) {
      console.error('FilterEngine: Invalid questions array');
      return [];
    }

    if (!filters || typeof filters !== 'object') {
      console.warn('FilterEngine: No filters provided, returning all');
      return questions.slice();
    }

    console.log('FilterEngine: Applying filters to', questions.length, 'questions', filters);

    let result = questions.slice(); // shallow copy

    // ── Filter 1: Subject ──────────────────────────────────────────────────
    const subjects = filters.subjects;
    if (Array.isArray(subjects) && subjects.length > 0 && !subjects.includes('all')) {
      result = result.filter(function(q) {
        return q && subjects.includes(q.subject);
      });
      console.log('FilterEngine: After subject filter:', result.length);
    }

    // ── Filter 2: Unit ─────────────────────────────────────────────────────
    const units = filters.units;
    if (Array.isArray(units) && units.length > 0 && !units.includes('all')) {
      result = result.filter(function(q) {
        return q && units.includes(q.unit);
      });
      console.log('FilterEngine: After unit filter:', result.length);
    }

    // ── Filter 3: Type ─────────────────────────────────────────────────────
    const types = filters.types;
    if (Array.isArray(types) && types.length > 0 && !types.includes('all')) {
      result = result.filter(function(q) {
        return q && types.includes(q.type);
      });
      console.log('FilterEngine: After type filter:', result.length);
    }

    // ── Filter 4: Difficulty ───────────────────────────────────────────────
    const difficulties = filters.difficulties;
    if (Array.isArray(difficulties) && difficulties.length > 0 && !difficulties.includes('all')) {
      result = result.filter(function(q) {
        return q && difficulties.includes(q.difficulty);
      });
      console.log('FilterEngine: After difficulty filter:', result.length);
    }

    // ── Step 5: Randomize ──────────────────────────────────────────────────
    if (filters.random === true) {
      result = shuffleArray(result);
    }

    // ── Step 6: Limit count ────────────────────────────────────────────────
    const count = filters.count;
    if (count && count !== 'all') {
      const n = parseInt(count, 10);
      if (!isNaN(n) && n > 0) {
        result = result.slice(0, n);
      }
    }

    console.log('FilterEngine: Final count:', result.length);
    return result;
  }

  // ─── Utility Functions ──────────────────────────────────────────────────────

  /**
   * Fisher-Yates shuffle.
   * @param {Array} arr
   * @returns {Array} new shuffled array
   */
  function shuffleArray(arr) {
    if (!Array.isArray(arr)) return [];
    const shuffled = arr.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      var tmp      = shuffled[i];
      shuffled[i]  = shuffled[j];
      shuffled[j]  = tmp;
    }
    return shuffled;
  }

  /**
   * Count questions per subject.
   * @param {Array} questions
   * @returns {object} { 'life-science': 45, ... }
   */
  function getBreakdown(questions) {
    if (!Array.isArray(questions)) return {};
    const breakdown = {};
    questions.forEach(function(q) {
      if (!q || !q.subject) return;
      breakdown[q.subject] = (breakdown[q.subject] || 0) + 1;
    });
    return breakdown;
  }

  /**
   * Count questions per unit within a subject.
   * @param {Array}  questions
   * @param {string} subject
   * @returns {object} { 'unit-key': count, ... }
   */
  function getUnitBreakdown(questions, subject) {
    if (!Array.isArray(questions)) return {};
    const breakdown = {};
    questions.forEach(function(q) {
      if (!q || q.subject !== subject || !q.unit) return;
      breakdown[q.unit] = (breakdown[q.unit] || 0) + 1;
    });
    return breakdown;
  }

  /**
   * Get available units grouped by subject from filtered question pool.
   * @param {Array} questions
   * @param {Array} selectedSubjects
   * @returns {object} { 'life-science': ['01-cell...', ...], ... }
   */
  function getAvailableUnits(questions, selectedSubjects) {
    if (!Array.isArray(questions)) return {};
    const useAll = !selectedSubjects ||
                   selectedSubjects.length === 0 ||
                   selectedSubjects.includes('all');
    const unitSets = {};

    questions.forEach(function(q) {
      if (!q || !q.subject || !q.unit || q.unit === 'unknown') return;
      if (!useAll && !selectedSubjects.includes(q.subject)) return;
      if (!unitSets[q.subject]) unitSets[q.subject] = new Set();
      unitSets[q.subject].add(q.unit);
    });

    // Convert Sets to sorted arrays
    const result = {};
    Object.keys(unitSets).forEach(function(subject) {
      result[subject] = Array.from(unitSets[subject]).sort();
    });
    return result;
  }

  /**
   * Count how many questions match given filters (without slice/shuffle).
   * Used for live preview.
   */
  function countFiltered(questions, filters) {
    return applyFilters(questions, Object.assign({}, filters, {
      random: false,
      count: 'all'
    })).length;
  }

  // ─── Name Lookup Helpers ────────────────────────────────────────────────────

  function getSubjectBn(key)    { return SUBJECT_BN[key]    || key; }
  function getUnitBn(key)       { return UNIT_BN[key]        || key; }
  function getTypeBn(key)       { return TYPE_BN[key]        || key; }
  function getDifficultyBn(key) { return DIFFICULTY_BN[key]  || key; }
  function getSubjectColor(key) { return SUBJECT_COLORS[key] || '#999'; }
  function getDifficultyColor(key) { return DIFFICULTY_COLORS[key] || '#999'; }

  function getAllSubjects() {
    return Object.keys(SUBJECT_BN);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  window.FilterEngine = {
    applyFilters      : applyFilters,
    shuffleArray      : shuffleArray,
    getBreakdown      : getBreakdown,
    getUnitBreakdown  : getUnitBreakdown,
    getAvailableUnits : getAvailableUnits,
    countFiltered     : countFiltered,
    getSubjectBn      : getSubjectBn,
    getUnitBn         : getUnitBn,
    getTypeBn         : getTypeBn,
    getDifficultyBn   : getDifficultyBn,
    getSubjectColor   : getSubjectColor,
    getDifficultyColor: getDifficultyColor,
    getAllSubjects     : getAllSubjects,
    SUBJECT_BN        : SUBJECT_BN,
    UNIT_BN           : UNIT_BN,
    TYPE_BN           : TYPE_BN,
    DIFFICULTY_BN     : DIFFICULTY_BN,
    SUBJECT_COLORS    : SUBJECT_COLORS,
    DIFFICULTY_COLORS : DIFFICULTY_COLORS
  };

})(window);