/**
 * filter-loader.js (FIXED)
 * Loads all JSON question files from all subjects
 * WB ANM GNM 2026 Preparation Platform
 */

(function(window) {
  'use strict';
  
  // Built-in manifest fallback
  var BUILT_IN_MANIFEST = {
    subjects: {
      'life-science': { sets: 10, totalSets: 10 },
      'physical-science': { sets: 10, totalSets: 10 },
      'mathematics': { sets: 10, totalSets: 10 },
      'general-knowledge': { sets: 10, totalSets: 10 },
      'logical-reasoning': { sets: 10, totalSets: 10 },
      'basic-english': { sets: 10, totalSets: 10 }
    }
  };
  
  var DEFAULTS = {
    type: 'theory',
    difficulty: 'medium',
    unit: 'unknown'
  };
  
  /**
   * Get number of sets from config — handles BOTH "sets" and "totalSets"
   */
  function getSetCount(config) {
    if (!config) return 10;
    if (typeof config.sets === 'number') return config.sets;
    if (typeof config.totalSets === 'number') return config.totalSets;
    return 10;
  }
  
  /**
   * Fetch manifest.json with fallback
   */
  async function fetchManifest() {
    var path = './data/manifest.json';
    try {
      var res = await fetch(path);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      if (data && data.subjects && typeof data.subjects === 'object') {
        console.log('FilterLoader: manifest.json loaded OK');
        return data;
      }
      throw new Error('Invalid manifest structure');
    } catch (e) {
      console.warn('FilterLoader: manifest.json failed (' + e.message + '), using built-in');
      return BUILT_IN_MANIFEST;
    }
  }
  
  /**
   * Fetch one JSON set file safely
   */
  async function fetchSet(subject, setNum) {
    var path = './data/' + subject + '/set-' + setNum + '.json';
    try {
      var res = await fetch(path);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      
      // Validate structure
      if (!data) {
        console.warn('FilterLoader: Null data in', path);
        return [];
      }
      
      // Support both {questions:[...]} and direct array [...]
      var questionsArray = null;
      if (Array.isArray(data.questions)) {
        questionsArray = data.questions;
      } else if (Array.isArray(data)) {
        questionsArray = data;
      } else {
        console.warn('FilterLoader: No questions array in', path);
        return [];
      }
      
      if (questionsArray.length === 0) {
        console.warn('FilterLoader: Empty questions in', path);
        return [];
      }
      
      // Tag each question
      var setId = subject + '-set-' + setNum;
      var tagged = [];
      for (var i = 0; i < questionsArray.length; i++) {
        var q = questionsArray[i];
        if (!q) continue;
        tagged.push({
          id: q.id || (i + 1),
          question: q.question || '',
          options: Array.isArray(q.options) ? q.options : [],
          answer: typeof q.answer === 'number' ? q.answer : 0,
          explanation: q.explanation || '',
          subject: q.subject || subject,
          unit: q.unit || DEFAULTS.unit,
          type: q.type || DEFAULTS.type,
          difficulty: q.difficulty || DEFAULTS.difficulty,
          setId: setId,
          _setNum: setNum,
          _subject: subject
        });
      }
      
      console.log('FilterLoader: Loaded', tagged.length, 'questions from', path);
      return tagged;
      
    } catch (e) {
      // 404, network error, JSON parse error — skip
      console.warn('FilterLoader: Skip', path, '—', e.message);
      return [];
    }
  }
  
  /**
   * Load ALL questions from ALL subjects
   */
  async function loadAllQuestions(onProgress) {
    console.log('FilterLoader: Starting full load...');
    
    // Step 1: Get manifest
    var manifest = await fetchManifest();
    if (!manifest || !manifest.subjects) {
      console.error('FilterLoader: No manifest');
      return [];
    }
    
    // Step 2: Build task list
    var tasks = [];
    var subjectKeys = Object.keys(manifest.subjects);
    
    console.log('FilterLoader: Found subjects:', subjectKeys.join(', '));
    
    for (var s = 0; s < subjectKeys.length; s++) {
      var subject = subjectKeys[s];
      var config = manifest.subjects[subject];
      var numSets = getSetCount(config);
      
      console.log('FilterLoader:', subject, '→', numSets, 'sets');
      
      for (var i = 1; i <= numSets; i++) {
        var setNum = String(i).padStart(2, '0');
        tasks.push({ subject: subject, setNum: setNum });
      }
    }
    
    var total = tasks.length;
    var loaded = 0;
    var allQuestions = [];
    
    console.log('FilterLoader: Total sets to fetch:', total);
    
    // Step 3: Load in batches of 6
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
          try {
            onProgress(loaded, total);
          } catch (e) {
            console.warn('FilterLoader: Progress callback error', e);
          }
        }
      }
    }
    
    console.log('FilterLoader: ✅ Complete! Total questions:', allQuestions.length);
    return allQuestions;
  }
  
  // Public API
  window.FilterLoader = {
    loadAllQuestions: loadAllQuestions,
    fetchManifest: fetchManifest
  };
  
})(window);