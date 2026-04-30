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
 * 9. Removed built-in manifest fallback; manifest always fetched from network
 * 10. UNIT_BN now fully Bengali
 */

(function(window) {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════════
     Bengali Name Maps – all 6 subjects
     ══════════════════════════════════════════════════════════════════════ */

  const SUBJECT_BN = {
    'life-science':                'জীবন বিজ্ঞান',
    'general-science':             'সাধারণ বিজ্ঞান',
    'arithmetic-mathematics':      'গণিত',
    'reasoning-general-knowledge': 'যুক্তিবিদ্যা ও সাধারণ জ্ঞান',
    'general-knowledge':           'সাধারণ জ্ঞান',
    'english-grammar':             'ইংরেজি ব্যাকরণ',
  };

  /* ══════════════════════════════════════════════════════════════════════
     Fully Bengali Unit map – covers all units from manifest.json
     ══════════════════════════════════════════════════════════════════════ */

  const UNIT_BN = {
    /* ── life-science ── */
    '01-circulatory-system':           'রক্ত সংবহনতন্ত্র',
    '02-common-diseases':              'সাধারণ রোগ',
    '03-digestive-system':             'পাচনতন্ত্র',
    '04-excretory-system':             'রেচনতন্ত্র',
    '05-first-aid-fundamentals':       'প্রাথমিক চিকিৎসা',
    '06-immunity':                     'রোগ প্রতিরোধ ক্ষমতা',
    '07-nervous-system':               'স্নায়ুতন্ত্র',
    '08-nutrition-and-health':         'পুষ্টি ও স্বাস্থ্য',
    '09-reproductive-system':          'প্রজননতন্ত্র',
    '10-respiratory-system':           'শ্বসনতন্ত্র',
    '11-sense-organs':                 'ইন্দ্রিয় অঙ্গ',
    '12-tissues':                      'কলাতন্ত্র',

    /* ── general-science ── */
    '01-acids-bases-salts':            'অ্যাসিড, ক্ষার ও লবণ',
    '02-atomic-structure':             'পারমাণবিক গঠন',
    '03-basic-organic-chemistry':      'জৈব রসায়নের মৌলিক ধারণা',
    '04-chemical-reactions':           'রাসায়নিক বিক্রিয়া',
    '05-electricity-and-circuits':     'তড়িৎ প্রবাহ ও বর্তনী',
    '06-environmental-chemistry':      'পরিবেশ রসায়ন',
    '07-force-and-motion':             'বল ও গতি',
    '08-heat-and-temperature':         'তাপ ও তাপমাত্রা',
    '09-light-reflection-refraction':  'আলোর প্রতিফলন ও প্রতিসরণ',
    '10-matter-and-states':            'পদার্থ ও তার বিভিন্ন অবস্থা',
    '11-measurements':                 'পরিমাপ',
    '12-work-and-energy':              'কার্য ও শক্তি',

    /* ── arithmetic-mathematics ── */
    '01-average':                      'গড়',
    '02-basic-algebra':                'প্রাথমিক বীজগণিত',
    '03-compound-interest':            'চক্রবৃদ্ধি সুদ',
    '04-data-interpretation':          'তথ্য বিশ্লেষণ',
    '05-fractions-decimals':           'ভগ্নাংশ ও দশমিক',
    '06-lcm-hcf':                      'ল.সা.গু ও গ.সা.গু',
    '07-mensuration':                  'ক্ষেত্রমিতি',
    '08-number-system':                'সংখ্যা পদ্ধতি',
    '09-percentages':                  'শতকরা',
    '10-profit-loss':                  'লাভ ও ক্ষতি',
    '11-ratio-proportion':             'অনুপাত ও সমানুপাত',
    '12-simple-interest':              'সরল সুদ',
    '13-speed-distance':               'গতি, সময় ও দূরত্ব',
    '14-time-work':                    'সময় ও কাজ',

    /* ── reasoning-general-knowledge ── */
    '01-analogies':                    'সাদৃশ্য',
    '02-blood-relations':              'রক্ত সম্পর্ক',
    '03-cause-effect':                 'কারণ ও প্রভাব',
    '04-classification':               'শ্রেণিবিভাগ',
    '05-coding-decoding':              'কোডিং – ডিকোডিং',
    '06-direction-sense':              'দিক নির্ণয়',
    '07-letter-series':                'অক্ষরক্রম',
    '08-number-series':                'সংখ্যাক্রম',
    '09-puzzles':                      'ধাঁধা',
    '10-seating-arrangement':          'আসন বিন্যাস',
    '11-statement-assumption':         'বিবৃতি ও অনুমান',
    '12-syllogism':                    'অনুমান (Syllogism)',
    '13-venn-diagrams':                'ভেনচিত্র',

    /* ── general-knowledge ── */
    '01-awards-and-honours':           'পুরস্কার ও সম্মাননা',
    '02-books-and-authors':            'বই ও লেখক',
    '03-indian-freedom-struggle':      'ভারতের স্বাধীনতা সংগ্রাম',
    '04-indian-history':               'ভারতের ইতিহাস',
    '05-indian-polity':                'ভারতের শাসন ব্যবস্থা',
    '06-physical-geography':           'ভৌত ভূগোল',
    '07-political-geography':          'রাজনৈতিক ভূগোল',
    '08-science-and-technology':       'বিজ্ঞান ও প্রযুক্তি',
    '09-sports':                       'খেলাধুলা',
    '10-west-bengal-gk':               'পশ্চিমবঙ্গ সাধারণ জ্ঞান',

    /* ── english-grammar ── */
    '01-antonyms':                     'বিপরীত শব্দ (Antonyms)',
    '02-articles':                     'Articles (a, an, the)',
    '03-basic-writing-skills':         'প্রাথমিক লেখার দক্ষতা',
    '04-error-spotting':               'ত্রুটি নির্ণয়',
    '05-fill-in-the-blanks':           'শূন্যস্থান পূরণ',
    '06-one-word-substitution':        'এক কথায় প্রকাশ',
    '07-prepositions':                 'Prepositions',
    '08-sentence-rearrangement':       'বাক্য পুনর্বিন্যাস',
    '09-subject-verb-agreement':       'Subject – Verb agreement',
    '10-synonyms':                     'সমার্থক শব্দ (Synonyms)',
    '11-tenses':                       'Tenses (কাল)',
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

  const MULTI_BN = {
    'all':        'সব প্রশ্ন',
    'multi-only': 'শুধু বহু-সঠিক',
    'single-only':'শুধু এককটি সঠিক',
  };

  /* ══════════════════════════════════════════════════════════════════════
     Subject color palette
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
     ══════════════════════════════════════════════════════════════════════ */

  function applyFilters(questions, filters) {
    if (!questions || !Array.isArray(questions)) {
      console.error('[FilterEngine] Invalid questions array');
      return [];
    }

    if (!filters || typeof filters !== 'object') {
      console.warn('[FilterEngine] No filters provided, returning all');
      return questions.slice();
    }

    let result = questions.slice();

    /* Subject */
    const subjects = filters.subjects;
    if (Array.isArray(subjects) && subjects.length > 0 && !subjects.includes('all')) {
      result = result.filter(q => q && subjects.includes(q.subject));
    }

    /* Unit */
    const units = filters.units;
    if (Array.isArray(units) && units.length > 0 && !units.includes('all')) {
      result = result.filter(q => q && units.includes(q.unit));
    }

    /* Type */
    const types = filters.types;
    if (Array.isArray(types) && types.length > 0 && !types.includes('all')) {
      result = result.filter(q => q && types.includes(q.type));
    }

    /* Difficulty */
    const difficulties = filters.difficulties;
    if (Array.isArray(difficulties) && difficulties.length > 0 && !difficulties.includes('all')) {
      result = result.filter(q => q && difficulties.includes(q.difficulty));
    }

    /* Multi */
    const multiFilter = filters.multi;
    if (multiFilter && multiFilter !== 'all') {
      if (multiFilter === 'multi-only') {
        result = result.filter(q => q && q.multi === true);
      } else if (multiFilter === 'single-only') {
        result = result.filter(q => q && q.multi !== true);
      }
    }

    /* Randomize */
    if (filters.random === true) {
      result = shuffleArray(result);
    }

    /* Limit count */
    const count = filters.count;
    if (count && count !== 'all') {
      const n = parseInt(count, 10);
      if (!isNaN(n) && n > 0) {
        result = result.slice(0, n);
      }
    }

    return result;
  }

  function shuffleArray(arr) {
    if (!Array.isArray(arr)) return [];
    const shuffled = arr.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /* ══════════════════════════════════════════════════════════════════════
     BREAKDOWN FUNCTIONS
     ══════════════════════════════════════════════════════════════════════ */

  function getBreakdown(questions) {
    if (!Array.isArray(questions)) return {};
    const breakdown = {};
    questions.forEach(q => {
      if (!q || !q.subject) return;
      if (!breakdown[q.subject]) {
        breakdown[q.subject] = { count: 0, multiCount: 0 };
      }
      breakdown[q.subject].count++;
      if (q.multi === true) breakdown[q.subject].multiCount++;
    });
    return breakdown;
  }

  function getUnitBreakdown(questions, subject) {
    if (!Array.isArray(questions)) return {};
    const breakdown = {};
    questions.forEach(q => {
      if (!q || q.subject !== subject || !q.unit) return;
      if (!breakdown[q.unit]) {
        breakdown[q.unit] = { count: 0, multiCount: 0 };
      }
      breakdown[q.unit].count++;
      if (q.multi === true) breakdown[q.unit].multiCount++;
    });
    return breakdown;
  }

  function getMultiBreakdown(questions) {
    if (!Array.isArray(questions)) return { total: 0, multiCount: 0, singleCount: 0 };
    let multiCount = 0, singleCount = 0;
    questions.forEach(q => {
      if (!q) return;
      if (q.multi === true) multiCount++;
      else singleCount++;
    });
    return { total: questions.length, multiCount, singleCount };
  }

  function getAvailableUnits(questions, selectedSubjects) {
    if (!Array.isArray(questions)) return {};
    const useAll = !selectedSubjects || selectedSubjects.length === 0 || selectedSubjects.includes('all');
    const unitSets = {};
    questions.forEach(q => {
      if (!q || !q.subject || !q.unit) return;
      if (q.unit === 'unknown') return;
      if (!useAll && !selectedSubjects.includes(q.subject)) return;
      if (!unitSets[q.subject]) unitSets[q.subject] = new Set();
      unitSets[q.subject].add(q.unit);
    });
    const result = {};
    Object.keys(unitSets).forEach(subject => {
      result[subject] = Array.from(unitSets[subject]).sort();
    });
    return result;
  }

  function countFiltered(questions, filters) {
    return applyFilters(questions, Object.assign({}, filters, { random: false, count: 'all' })).length;
  }

  function countFilteredMulti(questions, filters) {
    const filtered = applyFilters(questions, Object.assign({}, filters, { random: false, count: 'all' }));
    return filtered.filter(q => q && q.multi === true).length;
  }

  /* ══════════════════════════════════════════════════════════════════════
     NAME LOOKUP HELPERS
     ══════════════════════════════════════════════════════════════════════ */

  function getSubjectBn(key)  { return SUBJECT_BN[key] || key; }
  function getUnitBn(key)     { return UNIT_BN[key] || key.replace(/^\d+-/, '').replace(/-/g, ' '); }
  function getTypeBn(key)     { return TYPE_BN[key] || key; }
  function getDifficultyBn(key) { return DIFFICULTY_BN[key] || key; }
  function getMultiBn(key)    { return MULTI_BN[key] || key; }
  function getSubjectColor(key) { return SUBJECT_COLORS[key] || '#9e9e9e'; }
  function getDifficultyColor(key) { return DIFFICULTY_COLORS[key] || '#9e9e9e'; }
  function getAllSubjects()   { return Object.keys(SUBJECT_BN); }

  /* ══════════════════════════════════════════════════════════════════════
     Manifest fetching – always from network, no fallback
     ══════════════════════════════════════════════════════════════════════ */
  async function fetchManifest() {
    const res = await fetch('./data/manifest.json');
    if (!res.ok) throw new Error('Failed to load manifest');
    return res.json();
  }

  /* ══════════════════════════════════════════════════════════════════════
     Public API
     ══════════════════════════════════════════════════════════════════════ */
  window.FilterEngine = {
    applyFilters,
    shuffleArray,
    getBreakdown,
    getUnitBreakdown,
    getMultiBreakdown,
    getAvailableUnits,
    countFiltered,
    countFilteredMulti,
    getSubjectBn,
    getUnitBn,
    getTypeBn,
    getDifficultyBn,
    getMultiBn,
    getSubjectColor,
    getDifficultyColor,
    getAllSubjects,
    fetchManifest,
    /* Expose maps for other scripts */
    SUBJECT_BN,
    UNIT_BN,
    TYPE_BN,
    DIFFICULTY_BN,
    MULTI_BN,
    SUBJECT_COLORS,
    DIFFICULTY_COLORS,
  };

})(window);