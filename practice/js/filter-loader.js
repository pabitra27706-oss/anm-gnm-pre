/**
 * filter-loader.js – Loads all questions with persistent localStorage cache
 */
(function(window) {
  'use strict';
  const CACHE_KEY = 'wb_anm_gnm_all_questions';
  const CACHE_VERSION = 'v3';
  const BATCH_SIZE = 8;
  const BATCH_TIMEOUT_MS = 10000;
  const BUILT_IN_MANIFEST = {
    subjects: {
      'life-science': { sets: 70, name: 'জীবন বিজ্ঞান' },
      'general-science': { sets: 146, name: 'সাধারণ বিজ্ঞান' },
      'arithmetic-mathematics': { sets: 144, name: 'গণিত' },
      'reasoning-general-knowledge': { sets: 24, name: 'যুক্তিবিদ্যা ও সাধারণ জ্ঞান' },
      'general-knowledge': { sets: 42, name: 'সাধারণ জ্ঞান' },
      'english-grammar': { sets: 41, name: 'ইংরেজি ব্যাকরণ' }
    },
    totalFiles: 467,
    totalQuestions: 15410
  };
  const DEFAULTS = { type: 'memory', difficulty: 'medium', unit: 'unknown' };
  function getSetCount(config) { if(!config) return 10; if(typeof config.sets === 'number') return config.sets; if(typeof config.totalSets === 'number') return config.totalSets; return 10; }
  async function fetchManifest() { try { let res = await fetch('./data/manifest.json'); if(!res.ok) throw new Error(); let data = await res.json(); if(data && data.subjects) return data; throw new Error(); } catch(e) { console.warn('[FilterLoader] Using built-in manifest'); return BUILT_IN_MANIFEST; } }
  async function fetchSet(subject, setNum) { let path = `./data/${subject}/set-${setNum}.json`; try { let res = await fetch(path); if(!res.ok) throw new Error(`HTTP ${res.status}`); let data = await res.json(); let questionsArray = Array.isArray(data.questions) ? data.questions : (Array.isArray(data) ? data : []); let tagged = []; for(let i=0; i<questionsArray.length; i++) { let q = questionsArray[i]; if(!q) continue; if(q.multi === true && !Array.isArray(q.answer)) q.answer = [q.answer]; let normalised = { id: q.id || `${subject}-set-${setNum}-q${i+1}`, question: q.question || '', options: Array.isArray(q.options) ? q.options : [], answer: q.answer, multi: q.multi === true, explanation: q.explanation || '', subject: q.subject || subject, unit: q.unit || DEFAULTS.unit, type: q.type || DEFAULTS.type, difficulty: q.difficulty || DEFAULTS.difficulty, setId: `${subject}-set-${setNum}`, _setNum: parseInt(setNum,10), _subject: subject }; if(normalised.answer !== undefined && normalised.answer !== null) tagged.push(normalised); } return tagged; } catch(e) { console.warn(`[FilterLoader] Failed ${path}:`, e.message); return []; } }
  async function loadAllQuestions(onProgress) {
    try { let cached = localStorage.getItem(CACHE_KEY); if(cached) { let data = JSON.parse(cached); if(data.version === CACHE_VERSION && Array.isArray(data.questions)) { console.log('[FilterLoader] Using cached questions, count:', data.questions.length); if(onProgress) onProgress(data.questions.length, data.questions.length); let allSubjects = Object.keys(BUILT_IN_MANIFEST.subjects); let loadedSubjects = new Set(); data.questions.forEach(q => { if(q._subject) loadedSubjects.add(q._subject); }); let emptySubjects = allSubjects.filter(s => !loadedSubjects.has(s)); data.questions.emptySubjects = emptySubjects; return data.questions; } } } catch(e) { console.warn('[FilterLoader] Cache read error', e); }
    console.log('[FilterLoader] Loading fresh from network...'); let manifest = await fetchManifest(); let subjectKeys = Object.keys(manifest.subjects); let tasks = []; for(let s of subjectKeys) { let numSets = getSetCount(manifest.subjects[s]); for(let i=1; i<=numSets; i++) tasks.push({ subject: s, setNum: String(i).padStart(2,'0') }); } let total = tasks.length, loaded = 0, allQuestions = [];
    for(let batchStart=0; batchStart<tasks.length; batchStart+=BATCH_SIZE) { let batch = tasks.slice(batchStart, batchStart+BATCH_SIZE); let promises = batch.map(t => fetchSet(t.subject, t.setNum)); let timeoutPromise = new Promise((_,reject) => setTimeout(() => reject(new Error('Batch timeout')), BATCH_TIMEOUT_MS)); let batchResults; try { batchResults = await Promise.race([Promise.all(promises), timeoutPromise]); } catch(err) { console.error('[FilterLoader] Batch failed:', err); let retry = confirm(`একটি ব্যাচ লোড করতে সমস্যা হয়েছে (${err.message})।\n\nOK দিলে আবার চেষ্টা করবে, Cancel দিলে এখন পর্যন্ত লোড হওয়া প্রশ্ন দিয়েই চলবে।`); if(retry) { batchStart -= BATCH_SIZE; continue; } else break; } for(let res of batchResults) { if(res && res.length) allQuestions = allQuestions.concat(res); loaded++; if(onProgress) onProgress(loaded, total); } }
    let loadedSubjects = new Set(); allQuestions.forEach(q => { if(q._subject) loadedSubjects.add(q._subject); }); let emptySubjects = subjectKeys.filter(s => !loadedSubjects.has(s)); allQuestions.emptySubjects = emptySubjects;
    try { let toCache = { version: CACHE_VERSION, timestamp: Date.now(), questions: allQuestions }; localStorage.setItem(CACHE_KEY, JSON.stringify(toCache)); console.log('[FilterLoader] Cached', allQuestions.length, 'questions'); } catch(e) { console.warn('[FilterLoader] Cache save failed (quota?)', e); }
    return allQuestions;
  }
  window.FilterLoader = { loadAllQuestions: loadAllQuestions, clearCache: function() { localStorage.removeItem(CACHE_KEY); console.log('[FilterLoader] Cache cleared'); } };
})(window);