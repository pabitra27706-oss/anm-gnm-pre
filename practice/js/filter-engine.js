/**
 * filter-engine.js
 * Applies filters to loaded question pool
 * WB ANM GNM 2026 Preparation Platform
 *
 * UPDATED FOR NEW JSON FORMAT:
 * ─────────────────────────────────────────────
 * 1. SUBJECT_BN uses new 6 subject keys
 * 2. SUBJECT_COLORS updated for new keys
 * 3. Added MULTI_BN for multi filter display
 * 4. applyFilters() handles multi filter
 * 5. getBreakdown() includes multi count
 * 6. Added getMultiBreakdown() helper
 * 7. answer field preserved as number OR array
 * 8. All subject/unit maps updated
 */

(function(window) {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════════
     UPDATED: Bengali Name Maps — new subject keys
     ══════════════════════════════════════════════════════════════════════ */

  const SUBJECT_BN = {
    /* UPDATED: new subject keys matching manifest.json */
    'life-science':                'জীবন বিজ্ঞান',
    'general-science':             'সাধারণ বিজ্ঞান',
    'arithmetic-mathematics':      'গণিত',
    'reasoning-general-knowledge': 'যুক্তিবিদ্যা ও সাধারণ জ্ঞান',
    'general-knowledge':           'সাধারণ জ্ঞান',
    'english-grammar':             'ইংরেজি ব্যাকরণ',
  };

  /* ══════════════════════════════════════════════════════════════════════
     UPDATED: Unit maps — new folder/unit naming from JSON files
     Units come from question.unit field (e.g. "05-one-word-substitution")
     ══════════════════════════════════════════════════════════════════════ */

  const UNIT_BN = {
    /* ── life-science ── */
    '01-cell-structure-functions':    'কোষের গঠন ও কার্যাবলি',
    '02-tissues':                     'কলা',
    '03-digestive-system':            'পাচনতন্ত্র',
    '04-respiratory-system':          'শ্বসনতন্ত্র',
    '05-circulatory-system':          'রক্ত সংবহনতন্ত্র',
    '06-excretory-system':            'রেচনতন্ত্র',
    '07-nervous-system':              'স্নায়ুতন্ত্র',
    '08-reproductive-system':         'প্রজননতন্ত্র',
    '09-sense-organs':                'ইন্দ্রিয় অঙ্গ',
    '10-nutrition-health':            'পুষ্টি ও স্বাস্থ্য',
    '11-common-diseases':             'সাধারণ রোগ',
    '12-immunity':                    'রোগ প্রতিরোধ ক্ষমতা',
    '13-first-aid-fundamentals':      'প্রাথমিক চিকিৎসা',
    '14-genetics':                    'জিনতত্ত্ব',
    '15-evolution':                   'বিবর্তন',
    '16-ecology':                     'বাস্তুবিদ্যা',
    '17-human-anatomy':               'মানব শারীর বিজ্ঞান',
    '18-microbiology':                'অণুজীব বিজ্ঞান',

    /* ── general-science ── */
    '01-matter-and-states':           'পদার্থ ও অবস্থা',
    '02-atomic-structure':            'পারমাণবিক গঠন',
    '03-chemical-reactions':          'রাসায়নিক বিক্রিয়া',
    '04-acids-bases-salts':           'অ্যাসিড, ক্ষার ও লবণ',
    '05-force-and-motion':            'বল ও গতি',
    '06-work-and-energy':             'কাজ ও শক্তি',
    '07-light-reflection-refraction': 'আলোর প্রতিফলন ও প্রতিসরণ',
    '08-electricity-and-circuits':    'বিদ্যুৎ ও বর্তনী',
    '09-heat-and-temperature':        'তাপ ও তাপমাত্রা',
    '10-measurements':                'পরিমাপ',
    '11-basic-organic-chemistry':     'জৈব রসায়ন',
    '12-environmental-chemistry':     'পরিবেশ রসায়ন',
    '13-nuclear-physics':             'পারমাণবিক পদার্থবিজ্ঞান',
    '14-sound-waves':                 'শব্দ ও তরঙ্গ',
    '15-magnetism':                   'চুম্বকত্ব',

    /* ── arithmetic-mathematics ── */
    '01-number-system':               'সংখ্যা পদ্ধতি',
    '02-lcm-hcf':                     'লসাগু ও গসাগু',
    '03-fractions-decimals':          'ভগ্নাংশ ও দশমিক',
    '04-ratio-proportion':            'অনুপাত ও সমানুপাত',
    '05-percentages':                 'শতাংশ',
    '06-profit-loss':                 'লাভ ও ক্ষতি',
    '07-simple-interest':             'সরল সুদ',
    '08-compound-interest':           'চক্রবৃদ্ধি সুদ',
    '09-average':                     'গড়',
    '10-time-work':                   'সময় ও কাজ',
    '11-speed-distance':              'গতি ও দূরত্ব',
    '12-mensuration':                 'ক্ষেত্রমিতি',
    '13-data-interpretation':         'তথ্য বিশ্লেষণ',
    '14-basic-algebra':               'বীজগণিত',
    '15-geometry':                    'জ্যামিতি',
    '16-trigonometry':                'ত্রিকোণমিতি',
    '17-sets-and-probability':        'সেট ও সম্ভাবনা',

    /* ── reasoning-general-knowledge ── */
    '01-analogies':                   'সাদৃশ্য',
    '02-classification':              'শ্রেণীবিভাগ',
    '03-number-series':               'সংখ্যা সিরিজ',
    '04-letter-series':               'অক্ষর সিরিজ',
    '05-coding-decoding':             'কোডিং-ডিকোডিং',
    '06-blood-relations':             'রক্ত সম্পর্ক',
    '07-direction-sense':             'দিক নির্ণয়',
    '08-syllogism':                   'অনুমান',
    '09-seating-arrangement':         'আসন বিন্যাস',
    '10-puzzles':                     'ধাঁধা',
    '11-statement-assumption':        'বিবৃতি ও অনুমান',
    '12-cause-effect':                'কারণ ও প্রভাব',
    '13-venn-diagrams':               'ভেন চিত্র',
    '14-non-verbal-reasoning':        'অ-মৌখিক যুক্তি',

    /* ── general-knowledge ── */
    '01-indian-history':              'ভারতীয় ইতিহাস',
    '02-indian-freedom-struggle':     'স্বাধীনতা আন্দোলন',
    '03-geography-physical':          'ভৌগোলিক বিজ্ঞান',
    '04-geography-political':         'রাজনৈতিক ভূগোল',
    '05-indian-polity':               'ভারতীয় রাজনীতি',
    '06-current-affairs':             'সাম্প্রতিক ঘটনা',
    '07-sports':                      'খেলাধুলা',
    '08-awards-honours':              'পুরস্কার ও সম্মান',
    '09-books-authors':               'বই ও লেখক',
    '10-science-technology':          'বিজ্ঞান ও প্রযুক্তি',
    '11-west-bengal-gk':              'পশ্চিমবঙ্গ সাধারণ জ্ঞান',
    '12-constitution':                'ভারতীয় সংবিধান',

    /* ── english-grammar ── */
    '01-tenses':                      'কাল (Tense)',
    '02-articles':                    'আর্টিকেল',
    '03-prepositions':                'অব্যয় (Preposition)',
    '04-subject-verb-agreement':      'ক্রিয়া সামঞ্জস্য',
    '05-one-word-substitution':       'এক শব্দে প্রকাশ',
    '06-synonyms':                    'সমার্থক শব্দ',
    '07-antonyms':                    'বিপরীতার্থক শব্দ',
    '08-reading-comprehension':       'পাঠ বোঝার ক্ষমতা',
    '09-sentence-rearrangement':      'বাক্য পুনর্বিন্যাস',
    '10-error-spotting':              'ত্রুটি খোঁজা',
    '11-fill-in-the-blanks':          'শূন্যস্থান পূরণ',
    '12-basic-writing-skills':        'লেখার দক্ষতা',
    '13-voice-narration':             'Voice ও Narration',
    '14-phrases-idioms':              'Phrases ও Idioms',
  };

  const TYPE_BN = {
    'theory':      'তত্ত্ব',
    'numerical':   'গাণিতিক',
    'memory':      'মুখস্থ',
    'application': 'প্রয়োগ',
  };

  const DIFFICULTY_BN = {
    'easy':   'সহজ',
    'medium': 'মাঝারি',
    'hard':   'কঠিন',
  };

  /*
    NEW: Multi filter display names
    Used in filter-app.js to build #multiPills
  */
  const MULTI_BN = {
    'all':        'সব প্রশ্ন',
    'multi-only': 'শুধু বহু-সঠিক',
    'single-only':'শুধু এককটি সঠিক',
  };

  /* ══════════════════════════════════════════════════════════════════════
     UPDATED: Subject color palette — new keys
     ══════════════════════════════════════════════════════════════════════ */
  const SUBJECT_COLORS = {
    'life-science':                '#4caf50',
    'general-science':             '#2196f3',
    'arithmetic-mathematics':      '#ff9800',
    'reasoning-general-knowledge': '#e91e63',
    'general-knowledge':           '#9c27b0',
    'english-grammar':             '#00bcd4',
  };

  const DIFFICULTY_COLORS = {
    'easy':   '#4caf50',
    'medium': '#ff9800',
    'hard':   '#f44336',
  };

  /* ══════════════════════════════════════════════════════════════════════
     CORE FILTER FUNCTION
     UPDATED: added multi filter support
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Apply filters to question pool.
   *
   * @param {Array}  questions - full question pool (from filter-loader.js)
   * @param {Object} filters   - filter configuration:
   *   {
   *     subjects:     ['life-science', ...]  or ['all']
   *     units:        ['01-cell-...', ...]   or ['all']
   *     types:        ['memory', ...]        or ['all']
   *     difficulties: ['easy', ...]          or ['all']
   *     multi:        'all'|'multi-only'|'single-only'  (NEW)
   *     random:       true|false
   *     count:        number|'all'
   *   }
   * @returns {Array} filtered (and optionally randomized/sliced) questions
   */
  function applyFilters(questions, filters) {
    if (!questions || !Array.isArray(questions)) {
      console.error('[FilterEngine] Invalid questions array');
      return [];
    }

    if (!filters || typeof filters !== 'object') {
      console.warn('[FilterEngine] No filters provided, returning all');
      return questions.slice();
    }

    console.log('[FilterEngine] Applying filters to',
      questions.length, 'questions', filters);

    let result = questions.slice();

    /* ── Filter 1: Subject ── */
    const subjects = filters.subjects;
    if (Array.isArray(subjects) &&
        subjects.length > 0 &&
        !subjects.includes('all')) {
      result = result.filter(function(q) {
        return q && subjects.includes(q.subject);
      });
      console.log('[FilterEngine] After subject filter:', result.length);
    }

    /* ── Filter 2: Unit ── */
    const units = filters.units;
    if (Array.isArray(units) &&
        units.length > 0 &&
        !units.includes('all')) {
      result = result.filter(function(q) {
        return q && units.includes(q.unit);
      });
      console.log('[FilterEngine] After unit filter:', result.length);
    }

    /* ── Filter 3: Type ── */
    const types = filters.types;
    if (Array.isArray(types) &&
        types.length > 0 &&
        !types.includes('all')) {
      result = result.filter(function(q) {
        return q && types.includes(q.type);
      });
      console.log('[FilterEngine] After type filter:', result.length);
    }

    /* ── Filter 4: Difficulty ── */
    const difficulties = filters.difficulties;
    if (Array.isArray(difficulties) &&
        difficulties.length > 0 &&
        !difficulties.includes('all')) {
      result = result.filter(function(q) {
        return q && difficulties.includes(q.difficulty);
      });
      console.log('[FilterEngine] After difficulty filter:', result.length);
    }

    /* ── Filter 5: Multi (NEW) ──
       'all'         → no filter
       'multi-only'  → only questions where q.multi === true
       'single-only' → only questions where q.multi !== true
    */
    const multiFilter = filters.multi;
    if (multiFilter && multiFilter !== 'all') {
      if (multiFilter === 'multi-only') {
        result = result.filter(function(q) {
          return q && q.multi === true;
        });
      } else if (multiFilter === 'single-only') {
        result = result.filter(function(q) {
          return q && q.multi !== true;
        });
      }
      console.log('[FilterEngine] After multi filter:', result.length);
    }

    /* ── Step 6: Randomize ── */
    if (filters.random === true) {
      result = shuffleArray(result);
    }

    /* ── Step 7: Limit count ── */
    const count = filters.count;
    if (count && count !== 'all') {
      const n = parseInt(count, 10);
      if (!isNaN(n) && n > 0) {
        result = result.slice(0, n);
      }
    }

    console.log('[FilterEngine] Final count:', result.length);
    return result;
  }

  /* ══════════════════════════════════════════════════════════════════════
     UTILITY FUNCTIONS
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Fisher-Yates shuffle.
   */
  function shuffleArray(arr) {
    if (!Array.isArray(arr)) return [];
    const shuffled = arr.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j     = Math.floor(Math.random() * (i + 1));
      const tmp   = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }
    return shuffled;
  }

  /**
   * Count questions per subject.
   * UPDATED: also returns multiCount per subject
   *
   * @param {Array} questions
   * @returns {Object}
   * {
   *   'life-science': { count: 45, multiCount: 3 },
   *   ...
   * }
   */
  function getBreakdown(questions) {
    if (!Array.isArray(questions)) return {};
    const breakdown = {};

    questions.forEach(function(q) {
      if (!q || !q.subject) return;
      if (!breakdown[q.subject]) {
        breakdown[q.subject] = { count: 0, multiCount: 0 };
      }
      breakdown[q.subject].count++;
      if (q.multi === true) {
        breakdown[q.subject].multiCount++;
      }
    });

    return breakdown;
  }

  /**
   * Count questions per unit within a subject.
   * UPDATED: includes multiCount per unit
   *
   * @param {Array}  questions
   * @param {string} subject
   * @returns {Object} { 'unit-key': { count, multiCount }, ... }
   */
  function getUnitBreakdown(questions, subject) {
    if (!Array.isArray(questions)) return {};
    const breakdown = {};

    questions.forEach(function(q) {
      if (!q || q.subject !== subject || !q.unit) return;
      if (!breakdown[q.unit]) {
        breakdown[q.unit] = { count: 0, multiCount: 0 };
      }
      breakdown[q.unit].count++;
      if (q.multi === true) breakdown[q.unit].multiCount++;
    });

    return breakdown;
  }

  /**
   * NEW: Count multi vs single questions in pool.
   *
   * @param {Array} questions
   * @returns {Object} { total, multiCount, singleCount }
   */
  function getMultiBreakdown(questions) {
    if (!Array.isArray(questions)) {
      return { total: 0, multiCount: 0, singleCount: 0 };
    }

    let multiCount  = 0;
    let singleCount = 0;

    questions.forEach(function(q) {
      if (!q) return;
      if (q.multi === true) {
        multiCount++;
      } else {
        singleCount++;
      }
    });

    return {
      total:       questions.length,
      multiCount,
      singleCount,
    };
  }

  /**
   * Get available units grouped by subject.
   * UPDATED: skips unknown units more explicitly
   *
   * @param {Array} questions
   * @param {Array} selectedSubjects
   * @returns {Object} { 'life-science': ['01-cell...', ...], ... }
   */
  function getAvailableUnits(questions, selectedSubjects) {
    if (!Array.isArray(questions)) return {};

    const useAll = !selectedSubjects ||
                   selectedSubjects.length === 0 ||
                   selectedSubjects.includes('all');

    const unitSets = {};

    questions.forEach(function(q) {
      if (!q || !q.subject || !q.unit) return;
      if (q.unit === 'unknown') return;
      if (!useAll && !selectedSubjects.includes(q.subject)) return;

      if (!unitSets[q.subject]) {
        unitSets[q.subject] = new Set();
      }
      unitSets[q.subject].add(q.unit);
    });

    /* Convert Sets to sorted arrays */
    const result = {};
    Object.keys(unitSets).forEach(function(subject) {
      result[subject] = Array.from(unitSets[subject]).sort();
    });
    return result;
  }

  /**
   * Count matching questions without slice/shuffle.
   * Used for live preview.
   * UPDATED: passes multi filter through
   */
  function countFiltered(questions, filters) {
    return applyFilters(questions, Object.assign({}, filters, {
      random: false,
      count: 'all'
    })).length;
  }

  /**
   * NEW: Count multi questions in filtered pool.
   * Used by filter-app.js to update preview multi count.
   *
   * @param {Array}  questions
   * @param {Object} filters
   * @returns {number}
   */
  function countFilteredMulti(questions, filters) {
    const filtered = applyFilters(questions, Object.assign({}, filters, {
      random: false,
      count: 'all'
    }));
    return filtered.filter(function(q) {
      return q && q.multi === true;
    }).length;
  }

  /* ══════════════════════════════════════════════════════════════════════
     NAME LOOKUP HELPERS
     ══════════════════════════════════════════════════════════════════════ */

  function getSubjectBn(key) {
    return SUBJECT_BN[key] || key;
  }

  function getUnitBn(key) {
    /* Return Bengali name or format the key nicely */
    if (UNIT_BN[key]) return UNIT_BN[key];
    /* Format: "05-one-word-substitution" → "one word substitution" */
    return key.replace(/^\d+-/, '').replace(/-/g, ' ');
  }

  function getTypeBn(key) {
    return TYPE_BN[key] || key;
  }

  function getDifficultyBn(key) {
    return DIFFICULTY_BN[key] || key;
  }

  function getMultiBn(key) {
    return MULTI_BN[key] || key;
  }

  function getSubjectColor(key) {
    return SUBJECT_COLORS[key] || '#9e9e9e';
  }

  function getDifficultyColor(key) {
    return DIFFICULTY_COLORS[key] || '#9e9e9e';
  }

  /* UPDATED: returns new 6 subject keys */
  function getAllSubjects() {
    return Object.keys(SUBJECT_BN);
  }

  /* ══════════════════════════════════════════════════════════════════════
     Public API
     ══════════════════════════════════════════════════════════════════════ */
  window.FilterEngine = {
    applyFilters:       applyFilters,
    shuffleArray:       shuffleArray,
    getBreakdown:       getBreakdown,
    getUnitBreakdown:   getUnitBreakdown,
    getMultiBreakdown:  getMultiBreakdown,   /* NEW */
    getAvailableUnits:  getAvailableUnits,
    countFiltered:      countFiltered,
    countFilteredMulti: countFilteredMulti,  /* NEW */
    getSubjectBn:       getSubjectBn,
    getUnitBn:          getUnitBn,
    getTypeBn:          getTypeBn,
    getDifficultyBn:    getDifficultyBn,
    getMultiBn:         getMultiBn,          /* NEW */
    getSubjectColor:    getSubjectColor,
    getDifficultyColor: getDifficultyColor,
    getAllSubjects:      getAllSubjects,
    /* Expose maps for filter-app.js */
    SUBJECT_BN:         SUBJECT_BN,
    UNIT_BN:            UNIT_BN,
    TYPE_BN:            TYPE_BN,
    DIFFICULTY_BN:      DIFFICULTY_BN,
    MULTI_BN:           MULTI_BN,           /* NEW */
    SUBJECT_COLORS:     SUBJECT_COLORS,
    DIFFICULTY_COLORS:  DIFFICULTY_COLORS,
  };

})(window);