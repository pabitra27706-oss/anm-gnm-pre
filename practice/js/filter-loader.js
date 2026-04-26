/**
 * filter-loader.js
 * Loads all JSON question files from all subjects
 * WB ANM GNM 2026 Preparation Platform
 *
 * UPDATED FOR NEW JSON FORMAT:
 * ─────────────────────────────────────────────
 * 1. Uses new manifest.json subject keys
 * 2. Reads .sets field (not .totalSets)
 * 3. Tags questions with multi: true/false
 * 4. Preserves question.id as STRING
 * 5. Preserves question.answer as NUMBER or ARRAY
 * 6. Handles varying set counts per subject
 * 7. NEW: Adds placeholder entries for subjects with zero questions
 *         so filter UI shows all 6 subjects
 * 8. NEW: Normalizes multi answer (wraps single number in array)
 */

(function(window) {
  'use strict';
  
  var BUILT_IN_MANIFEST = {
    subjects: {
      'life-science': { sets: 70, name: 'জীবন বিজ্ঞান', english: 'Life Science' },
      'general-science': { sets: 146, name: 'সাধারণ বিজ্ঞান', english: 'General Science' },
      'arithmetic-mathematics': { sets: 144, name: 'গণিত', english: 'Mathematics' },
      'reasoning-general-knowledge': { sets: 24, name: 'যুক্তিবিদ্যা ও সাধারণ জ্ঞান', english: 'Reasoning & GK' },
      'general-knowledge': { sets: 42, name: 'সাধারণ জ্ঞান', english: 'General Knowledge' },
      'english-grammar': { sets: 41, name: 'ইংরেজি ব্যাকরণ', english: 'English Grammar' }
    },
    totalFiles: 467,
    totalQuestions: 15410
  };
  
  var DEFAULTS = {
    type: 'memory',
    difficulty: 'medium',
    unit: 'unknown'
  };
  
  function getSetCount(config) {
    if (!config) return 10;
    if (typeof config.sets === 'number') return config.sets;
    if (typeof config.totalSets === 'number') return config.totalSets;
    return 10;
  }
  
  async function fetchManifest() {
    var path = './data/manifest.json';
    try {
      var res = await fetch(path);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
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
  
  async function fetchSet(subject, setNum) {
    var path = './data/' + subject + '/set-' + setNum + '.json';
    try {
      var res = await fetch(path);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      if (!data) {
        console.warn('[FilterLoader] Null data in', path);
        return [];
      }
      
      var questionsArray = null;
      if (Array.isArray(data.questions)) {
        questionsArray = data.questions;
      } else if (Array.isArray(data)) {
        questionsArray = data;
      } else {
        console.warn('[FilterLoader] No questions array in', path);
        return [];
      }
      
      if (questionsArray.length === 0) {
        console.warn('[FilterLoader] Empty questions in', path);
        return [];
      }
      
      var setId = subject + '-set-' + setNum;
      var tagged = [];
      
      for (var i = 0; i < questionsArray.length; i++) {
        var q = questionsArray[i];
        if (!q) continue;
        
        // Normalize answer for multi questions
        if (q.multi === true && !Array.isArray(q.answer)) {
          q.answer = [q.answer];
        }
        
        var normalised = {
          id: q.id || (subject + '-set-' + setNum + '-q' + (i + 1)),
          question: q.question || '',
          options: Array.isArray(q.options) ? q.options : [],
          answer: q.answer,
          multi: q.multi === true,
          explanation: q.explanation || '',
          subject: q.subject || subject,
          unit: q.unit || DEFAULTS.unit,
          type: q.type || DEFAULTS.type,
          difficulty: q.difficulty || DEFAULTS.difficulty,
          setId: setId,
          _setNum: parseInt(setNum, 10) || parseInt(setNum.replace(/^0+/, ''), 10) || i + 1,
          _subject: subject
        };
        
        if (normalised.answer === undefined || normalised.answer === null) {
          console.warn('[FilterLoader] Question missing answer:', path, 'id:', normalised.id);
          continue;
        }
        
        tagged.push(normalised);
      }
      
      console.log('[FilterLoader] Loaded', tagged.length, 'questions from', path);
      return tagged;
      
    } catch (e) {
      console.warn('[FilterLoader] Skip', path, '—', e.message);
      return [];
    }
  }
  
  async function loadAllQuestions(onProgress) {
    console.log('[FilterLoader] Starting full load...');
    
    var manifest = await fetchManifest();
    if (!manifest || !manifest.subjects) {
      console.error('[FilterLoader] No manifest available');
      return [];
    }
    
    var tasks = [];
    var subjectKeys = Object.keys(manifest.subjects);
    console.log('[FilterLoader] Found subjects:', subjectKeys.join(', '));
    
    for (var s = 0; s < subjectKeys.length; s++) {
      var subject = subjectKeys[s];
      var config = manifest.subjects[subject];
      var numSets = getSetCount(config);
      console.log('[FilterLoader]', subject, '→', numSets, 'sets');
      for (var i = 1; i <= numSets; i++) {
        var setNum = String(i).padStart(2, '0');
        tasks.push({ subject: subject, setNum: setNum });
      }
    }
    
    var total = tasks.length;
    var loaded = 0;
    var allQuestions = [];
    
    console.log('[FilterLoader] Total sets to fetch:', total);
    
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
        if (typeof onProgress === 'function') {
          try { onProgress(loaded, total); } catch (e) { console.warn('[FilterLoader] Progress callback error', e); }
        }
      }
    }
    
    // Check which subjects are completely missing
    var loadedSubjects = {};
    for (var k = 0; k < allQuestions.length; k++) {
      var sub = allQuestions[k]._subject;
      loadedSubjects[sub] = true;
    }
    
    var allSubjectKeys = Object.keys(manifest.subjects);
    allSubjectKeys.forEach(function(subject) {
      if (!loadedSubjects[subject]) {
        console.warn('[FilterLoader] Subject with 0 questions:', subject, '- adding placeholder');
        allQuestions.push({
          id: 'placeholder-' + subject + '-0',
          question: '',
          options: [],
          answer: 0,
          multi: false,
          explanation: '',
          subject: subject,
          unit: 'unknown',
          type: 'memory',
          difficulty: 'easy',
          setId: 'placeholder',
          _setNum: 0,
          _subject: subject,
          _isPlaceholder: true
        });
      }
    });
    
    console.log('[FilterLoader] ✅ Complete! Total questions:', allQuestions.length);
    return allQuestions;
  }
  
  window.FilterLoader = {
    loadAllQuestions: loadAllQuestions,
    fetchManifest: fetchManifest
  };
  
})(window);