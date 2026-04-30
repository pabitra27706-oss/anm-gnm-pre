/**
 * filter-loader.js – Loads all questions from unit JSON files.
 * Uses IndexedDB for persistent cache, localStorage for metadata.
 */
(function(window) {
  'use strict';

  const DB_NAME    = 'WB_ANM_GNM_QUESTIONS';
  const DB_VERSION = 1;
  const STORE_NAME = 'questions';
  const META_KEY   = 'filter_loader_meta';
  const BATCH_SIZE = 8;
  const TIMEOUT    = 12000;

  /* ── IndexedDB helpers ── */
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror   = (e) => reject(e.target.error);
    });
  }

  async function getCachedQuestions() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const all = store.getAll();
      all.onsuccess = () => { db.close(); resolve(all.result); };
      all.onerror   = (e) => { db.close(); reject(e); };
    });
  }

  async function saveQuestionsToDB(questions) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      questions.forEach(q => store.put(q));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror    = (e) => { db.close(); reject(e); };
    });
  }

  async function clearDB() {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => { db.close(); resolve(); };
    });
  }

  /* ── Metadata (subject totals) ── */
  function saveMeta(meta) {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch(e) {}
  }

  function loadMeta() {
    try {
      const raw = localStorage.getItem(META_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  /* ── Fetch manifest ── */
  async function fetchManifest() {
    const res = await fetchWithTimeout('./data/manifest.json');
    if (!res.ok) throw new Error('Failed to load manifest');
    return res.json();
  }

  /* ── Fetch a single unit file ── */
  async function fetchUnitFile(subject, unitEntry) {
    const path = `./data/${subject}/${unitEntry.file}`;
    const res = await fetchWithTimeout(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const questions = (data.questions || []).filter(q => q && q.question);
    return questions.map(q => ({
      ...q,
      subject: subject,
      unit: unitEntry.unit,
      _subject: subject
    }));
  }

  /* ── Main loader ── */
  async function loadAllQuestions(onProgress) {
    // 1. Try IndexedDB first
    try {
      const cached = await getCachedQuestions();
      if (cached.length > 0) {
        console.log('[FilterLoader] Loaded from IndexedDB, count:', cached.length);
        if (onProgress) onProgress(cached.length, cached.length);
        cached.emptySubjects = [];
        return cached;
      }
    } catch(e) { console.warn('[FilterLoader] DB read error:', e); }

    // 2. Fetch all unit files
    console.log('[FilterLoader] Fetching manifest...');
    const manifest = await fetchManifest();
    const tasks = [];
    for (const [subject, info] of Object.entries(manifest.subjects)) {
      for (const unit of info.units) {
        tasks.push({ subject, unit });
      }
    }

    const total = tasks.length;
    let loaded = 0;
    const allQuestions = [];

    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = tasks.slice(i, i + BATCH_SIZE);
      const promises = batch.map(t => fetchUnitFile(t.subject, t.unit).catch(() => []));
      const results = await Promise.all(promises);
      results.forEach(arr => allQuestions.push(...arr));
      loaded += batch.length;
      if (onProgress) onProgress(loaded, total);
    }

    // 3. Save to IndexedDB
    try {
      await saveQuestionsToDB(allQuestions);
      console.log('[FilterLoader] Saved to IndexedDB:', allQuestions.length);
    } catch(e) { console.warn('[FilterLoader] DB write error:', e); }

    // 4. Save metadata
    const subjectCounts = {};
    allQuestions.forEach(q => {
      const s = q.subject;
      if (s) subjectCounts[s] = (subjectCounts[s] || 0) + 1;
    });
    saveMeta({ totalQuestions: allQuestions.length, subjectCounts });

    allQuestions.emptySubjects = [];
    return allQuestions;
  }

  /* ── Public API ── */
  window.FilterLoader = {
    loadAllQuestions,
    clearCache: async () => {
      await clearDB();
      localStorage.removeItem(META_KEY);
    }
  };

  /* ── Utilities ── */
  function fetchWithTimeout(url, ms = TIMEOUT) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
  }

})(window);