/**
 * filter-loader.js
 * Loads all JSON question files from all subjects
 * WB ANM GNM 2026 Preparation Platform
 *
 * UPDATED FOR NEW JSON FORMAT:
 * ─────────────────────────────────────────────
 * 1. Uses new manifest.json subject keys:
 *    life-science, general-science, arithmetic-mathematics,
 *    reasoning-general-knowledge, general-knowledge, english-grammar
 * 2. Reads .sets field (not .totalSets) from manifest
 * 3. Tags questions with multi: true/false
 * 4. Preserves question.id as STRING
 * 5. Preserves question.answer as NUMBER or ARRAY
 * 6. Handles varying set counts per subject (not fixed 10)
 * 7. Validates new JSON structure: { subject, set, questions }
 */

(function(window) {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════════
     UPDATED: New manifest fallback with correct subject keys + counts
     ══════════════════════════════════════════════════════════════════════ */
  var BUILT_IN_MANIFEST = {
    subjects: {
      'life-science': {
        sets: 70,
        name: 'জীবন বিজ্ঞান',
        english: 'Life Science'
      },
      'general-science': {
        sets: 146,
        name: 'সাধারণ বিজ্ঞান',
        english: 'General Science'
      },
      'arithmetic-mathematics': {
        sets: 144,
        name: 'গণিত',
        english: 'Mathematics'
      },
      'reasoning-general-knowledge': {
        sets: 24,
        name: 'যুক্তিবিদ্যা ও সাধারণ জ্ঞান',
        english: 'Reasoning & GK'
      },
      'general-knowledge': {
        sets: 42,
        name: 'সাধারণ জ্ঞান',
        english: 'General Knowledge'
      },
      'english-grammar': {
        sets: 41,
        name: 'ইংরেজি ব্যাকরণ',
        english: 'English Grammar'
      }
    },
    totalFiles: 467,
    totalQuestions: 15410
  };

  /* Default values for missing fields */
  var DEFAULTS = {
    type: 'memory',        /* NEW: default type */
    difficulty: 'medium',
    unit: 'unknown'
  };

  /* ══════════════════════════════════════════════════════════════════════
     Get set count from manifest config
     UPDATED: uses .sets field (not .totalSets)
     ══════════════════════════════════════════════════════════════════════ */
  function getSetCount(config) {
    if (!config) return 10;
    if (typeof config.sets === 'number') return config.sets;
    /* Backward compat: check totalSets too */
    if (typeof config.totalSets === 'number') return config.totalSets;
    return 10;
  }

  /* ══════════════════════════════════════════════════════════════════════
     Fetch manifest.json with fallback
     ══════════════════════════════════════════════════════════════════════ */
  async function fetchManifest() {
    var path = './data/manifest.json';
    try {
      var res = await fetch(path);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();

      /*
        UPDATED validation: new format has subjects object
        { subjects: { "life-science": {...}, ... }, totalFiles, totalQuestions }
      */
      if (data && data.subjects && typeof data.subjects === 'object') {
        console.log('[FilterLoader] manifest.json loaded OK');
        return data;
      }
      throw new Error('Invalid manifest structure');
    } catch (e) {
      console.warn('[FilterLoader] manifest.json failed (' + e.message + '), using built-in');
      return BUILT_IN_MANIFEST;
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     Fetch one JSON set file safely
     UPDATED: handles new JSON structure + multi field + string IDs
     ══════════════════════════════════════════════════════════════════════ */
  async function fetchSet(subject, setNum) {
    /*
      UPDATED path format:
      data/<subject-folder>/set-<NN>.json
      e.g. data/life-science/set-01.json
           data/arithmetic-mathematics/set-144.json
    */
    var path = './data/' + subject + '/set-' + setNum + '.json';

    try {
      var res = await fetch(path);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();

      /*
        UPDATED validation: new format is
        {
          subject: "life-science",
          set: 1,
          questions: [...]
        }
      */
      if (!data) {
        console.warn('[FilterLoader] Null data in', path);
        return [];
      }

      var questionsArray = null;

      /* New format: data.questions */
      if (Array.isArray(data.questions)) {
        questionsArray = data.questions;
      }
      /* Fallback: direct array (old format) */
      else if (Array.isArray(data)) {
        questionsArray = data;
      }
      else {
        console.warn('[FilterLoader] No questions array in', path);
        return [];
      }

      if (questionsArray.length === 0) {
        console.warn('[FilterLoader] Empty questions in', path);
        return [];
      }

      /*
        UPDATED: Tag each question with normalized fields
        Preserve:
          - id (string)
          - answer (number or array)
          - multi (boolean)
        Add:
          - setId, _setNum, _subject for tracking
      */
      var setId = subject + '-set-' + setNum;
      var tagged = [];

      for (var i = 0; i < questionsArray.length; i++) {
        var q = questionsArray[i];
        if (!q) continue;

        /*
          UPDATED field mapping:
            id:          string (e.g. "eg-01-001") — PRESERVE AS-IS
            answer:      number OR array — PRESERVE AS-IS
            multi:       boolean — PRESERVE AS-IS
            subject:     string (from JSON or folder name)
            unit:        string (from JSON or default)
            type:        string (from JSON or default)
            difficulty:  string (from JSON or default)
        */
        var normalised = {
          /* UPDATED: id is STRING, preserve exactly */
          id: q.id || (subject + '-set-' + setNum + '-q' + (i + 1)),

          question: q.question || '',

          options: Array.isArray(q.options) ? q.options : [],

          /*
            UPDATED: answer can be number OR array
            DO NOT normalise to number — keep as-is
          */
          answer: q.answer, /* undefined, number, or array */

          /*
            NEW: multi field — preserve boolean
          */
          multi: q.multi === true,

          explanation: q.explanation || '',

          /* Subject/unit/type/difficulty with defaults */
          subject: q.subject || subject,
          unit: q.unit || DEFAULTS.unit,
          type: q.type || DEFAULTS.type,
          difficulty: q.difficulty || DEFAULTS.difficulty,

          /* Tracking fields */
          setId: setId,
          _setNum: parseInt(setNum, 10) || parseInt(setNum.replace(/^0+/, ''), 10) || i + 1,
          _subject: subject
        };

        /*
          SAFETY: Validate answer field exists
          If missing entirely, log warning and skip
        */
        if (normalised.answer === undefined || normalised.answer === null) {
          console.warn('[FilterLoader] Question missing answer:', path, 'id:', normalised.id);
          continue; /* skip invalid question */
        }

        tagged.push(normalised);
      }

      console.log('[FilterLoader] Loaded', tagged.length, 'questions from', path);
      return tagged;

    } catch (e) {
      /* 404, network error, JSON parse error — skip silently */
      console.warn('[FilterLoader] Skip', path, '—', e.message);
      return [];
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     Load ALL questions from ALL subjects
     UPDATED: handles varying set counts per subject
     ══════════════════════════════════════════════════════════════════════ */
  async function loadAllQuestions(onProgress) {
    console.log('[FilterLoader] Starting full load...');

    /* Step 1: Get manifest */
    var manifest = await fetchManifest();
    if (!manifest || !manifest.subjects) {
      console.error('[FilterLoader] No manifest available');
      return [];
    }

    /* Step 2: Build task list */
    var tasks = [];
    var subjectKeys = Object.keys(manifest.subjects);

    console.log('[FilterLoader] Found subjects:', subjectKeys.join(', '));

    for (var s = 0; s < subjectKeys.length; s++) {
      var subject = subjectKeys[s];
      var config = manifest.subjects[subject];

      /*
        UPDATED: use getSetCount() which reads .sets
        Different subjects have different counts:
          life-science:                70
          general-science:             146
          arithmetic-mathematics:      144
          reasoning-general-knowledge: 24
          general-knowledge:           42
          english-grammar:             41
      */
      var numSets = getSetCount(config);

      console.log('[FilterLoader]', subject, '→', numSets, 'sets');

      for (var i = 1; i <= numSets; i++) {
        /* Pad to 2 digits: 01, 02, ... 146 */
        var setNum = String(i).padStart(2, '0');
        tasks.push({ subject: subject, setNum: setNum });
      }
    }

    var total = tasks.length;
    var loaded = 0;
    var allQuestions = [];

    console.log('[FilterLoader] Total sets to fetch:', total);

    /*
      Step 3: Load in batches of 6 (parallel)
      Reduces total time while avoiding browser request limits
    */
    var BATCH_SIZE = 6;

    for (var batchStart = 0; batchStart < tasks.length; batchStart += BATCH_SIZE) {
      var batch = tasks.slice(batchStart, batchStart + BATCH_SIZE);

      var promises = [];
      for (var b = 0; b < batch.length; b++) {
        promises.push(fetchSet(batch[b].subject, batch[b].setNum));
      }

      var batchResults = await Promise.all(promises);

      for (var r = 0; r < batchResults.length; r++) {
        var questions = batchResults[r];
        if (questions && questions.length > 0) {
          allQuestions = allQuestions.concat(questions);
        }
        loaded++;

        /* Progress callback */
        if (typeof onProgress === 'function') {
          try {
            onProgress(loaded, total);
          } catch (e) {
            console.warn('[FilterLoader] Progress callback error', e);
          }
        }
      }
    }

    console.log('[FilterLoader] ✅ Complete! Total questions:', allQuestions.length);
    return allQuestions;
  }

  /* ══════════════════════════════════════════════════════════════════════
     Public API
     ══════════════════════════════════════════════════════════════════════ */
  window.FilterLoader = {
    loadAllQuestions: loadAllQuestions,
    fetchManifest: fetchManifest
  };

})(window);