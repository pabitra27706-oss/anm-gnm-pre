/**
 * unit-filter-app.js – Unit filter / question viewer.
 * Uses manifest.json for unit lists, per‑file localStorage cache.
 */
(function() {
  'use strict';

  const MANIFEST_PATH = './data/manifest.json';
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const FILE_CACHE_PREFIX = 'unit_file_';

  let manifest = null;

  /* ── DOM helpers ── */
  const $ = id => document.getElementById(id);
  const $val = id => { const el = $(id); return el ? el.value : ''; };
  function on(id, ev, fn) { const el = $(id); if (el) el.addEventListener(ev, fn); }

  /* ── localStorage cache ── */
  function getFileCache(subject, fileName) {
    try {
      const raw = localStorage.getItem(FILE_CACHE_PREFIX + subject + '/' + fileName);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }
  function setFileCache(subject, fileName, data) {
    try {
      localStorage.setItem(FILE_CACHE_PREFIX + subject + '/' + fileName, JSON.stringify(data));
    } catch(e) {}
  }

  /* ── Filter button state ── */
  function updateFilterButtonState() {
    const subject = $val('subjectSelect');
    const unit = $val('unitSelect');
    const btn = $('filterBtn');
    if (btn) btn.disabled = !(subject && unit);
  }

  /* ── Initialisation ── */
  document.addEventListener('DOMContentLoaded', async () => {
    wireStaticButtons();
    try {
      manifest = await (await fetch(MANIFEST_PATH)).json();
      fillSubjectDropdown();
    } catch(e) {
      setResults(errorBox('ম্যানিফেস্ট লোড করা যায়নি।'));
    }
  });

  function fillSubjectDropdown() {
    const sel = $('subjectSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- বিষয় বাছাই করুন --</option>';
    Object.entries(manifest.subjects).forEach(([id, sub]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = sub.name;
      sel.appendChild(opt);
    });
  }

  function onSubjectChange() {
    const currentSubject = $val('subjectSelect');
    resetUnitUI();
    hideMeta();
    resetResults();

    if (!currentSubject) {
      updateFilterButtonState();
      return;
    }

    const entry = manifest.subjects[currentSubject];
    if (!entry) return;

    const unitSel = $('unitSelect');
    unitSel.innerHTML = '<option value="">-- চ্যাপ্টার বাছাই করুন --</option>';
    entry.units.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.unit;
      opt.textContent = u.name || u.unit.replace(/^\d+-/, '').replace(/-/g, ' ');
      unitSel.appendChild(opt);
    });
    unitSel.disabled = false;
    $('diffSelect').disabled = false;
    updateFilterButtonState();
  }

  async function performFilter() {
    const subject = $val('subjectSelect');
    const unitId  = $val('unitSelect');
    const difficulty = $val('diffSelect');

    if (!subject || !unitId) {
      setResults(placeholderBox('বিষয় ও চ্যাপ্টার বাছাই করুন'));
      hideMeta();
      return;
    }

    const subInfo = manifest.subjects[subject];
    const unitInfo = subInfo.units.find(u => u.unit === unitId);
    if (!unitInfo) return;

    let data = getFileCache(subject, unitInfo.file);
    if (!data) {
      setLoading(true);
      try {
        const res = await fetch(`./data/${subject}/${unitInfo.file}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
        setFileCache(subject, unitInfo.file, data);
      } catch(e) {
        setResults(errorBox('প্রশ্ন লোড করতে সমস্যা হয়েছে।'));
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    let questions = (data.questions || []).filter(q => q && q.question);
    if (difficulty) {
      questions = questions.filter(q => q.difficulty === difficulty);
    }

    if (questions.length === 0) {
      hideMeta();
      setResults(emptyBox('কোনো প্রশ্ন পাওয়া যায়নি।'));
      return;
    }

    renderCards(questions, subInfo.name, unitInfo.name || unitId, difficulty);
  }

  function renderCards(questions, subjectName, unitName, difficulty) {
    const diffText = difficulty ? ` › ${diffLabel(difficulty)}` : '';
    const metaCount = $('metaCount');
    const metaLabel = $('metaLabel');
    const metaBar   = $('metaBar');
    if (metaCount) metaCount.innerHTML = `<strong>${toBn(questions.length)}</strong>টি প্রশ্ন`;
    if (metaLabel) metaLabel.textContent = `${subjectName} › ${unitName}${diffText}`;
    if (metaBar)   metaBar.classList.add('show');

    const container = $('resultsContainer');
    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    questions.forEach((q, i) => {
      const card = buildCard(q, i + 1);
      if (card) frag.appendChild(card);
    });
    container.appendChild(frag);
  }

  /* ── Card builder (handles numeric indices & letter answers) ── */
  function buildCard(q, num) {
    if (!q || !Array.isArray(q.options) || !q.question) return null;

    // Normalise answer to array of indices (0-based)
    let correctIndices = [];
    if (Array.isArray(q.answer)) {
      correctIndices = q.answer.map(a => normalizeAnswerIndex(a, q.options.length));
    } else if (typeof q.answer === 'number') {
      correctIndices = [q.answer];
    } else if (typeof q.answer === 'string') {
      // Could be letter like "A" or "A,B"
      const parts = q.answer.split(/[, ]+/);
      correctIndices = parts.map(p => letterToIndex(p.trim())).filter(i => i !== -1);
      if (correctIndices.length === 0 && !isNaN(parseInt(q.answer))) {
        correctIndices = [parseInt(q.answer)];
      }
    }
    correctIndices = correctIndices.filter(i => i >= 0 && i < q.options.length);
    const isMulti = (q.multi === true) || correctIndices.length > 1;

    const badges = [];
    if (q.difficulty) {
      const map = { easy: ['সহজ', 'b-easy'], medium: ['মাঝারি', 'b-medium'], hard: ['কঠিন', 'b-hard'] };
      const d = map[q.difficulty];
      if (d) badges.push(badge(d[1], d[0]));
    }
    if (isMulti) badges.push(badge('b-multi', 'বহু সঠিক'));

    const optsHtml = q.options.map((opt, idx) => {
      const isCorrect = correctIndices.includes(idx);
      const letter = idx < LETTERS.length ? LETTERS[idx] : String(idx + 1);
      return `<div class="q-opt${isCorrect ? ' correct' : ''}">
        <span class="opt-letter">${isCorrect ? '✓\u00a0' : ''}${letter}.</span>
        <span class="opt-text">${esc(opt)}</span></div>`;
    }).join('');

    const ansLetters = correctIndices.map(i => (i < LETTERS.length ? LETTERS[i] : String(i + 1))).join(', ');
    const hasExp = q.explanation && q.explanation.trim() !== '' && q.explanation !== 'No explanation available.';

    const card = document.createElement('div');
    card.className = 'q-card';
    card.innerHTML = `
      <div class="q-head">
        <span class="q-num">Q.${num}</span>
        <div class="q-badges">${badges.join('')}</div>
      </div>
      <p class="q-text">${esc(q.question)}</p>
      <div class="q-options">${optsHtml}</div>
      <div class="q-answer"><span class="ans-label">সঠিক উত্তর:</span> <span class="ans-val">${esc(ansLetters)}</span></div>
      ${hasExp ? `<div class="q-exp"><span class="exp-label">ব্যাখ্যা:</span> <span class="exp-text">${esc(q.explanation)}</span></div>` : ''}
    `;
    return card;
  }

  function normalizeAnswerIndex(a, maxLen) {
    if (typeof a === 'number') return a;
    if (typeof a === 'string') return letterToIndex(a);
    return -1;
  }
  function letterToIndex(letter) {
    const upper = letter.trim().toUpperCase();
    const idx = LETTERS.indexOf(upper);
    return idx !== -1 ? idx : (parseInt(upper) - 1);
  }

  /* ── UI event wiring ── */
  function wireStaticButtons() {
    on('backBtn', 'click', () => window.location.href = 'index.html');
    on('printBtn', 'click', () => window.print());
    on('subjectSelect', 'change', onSubjectChange);
    on('unitSelect', 'change', updateFilterButtonState);
    on('filterBtn', 'click', performFilter);
  }

  function resetUnitUI() {
    const unitSel = $('unitSelect');
    const diffSel = $('diffSelect');
    if (unitSel) { unitSel.innerHTML = '<option value="">-- আগে বিষয় বাছাই করুন --</option>'; unitSel.disabled = true; }
    if (diffSel) diffSel.disabled = true;
    $('filterBtn').disabled = true;
  }

  function resetResults() {
    setResults(placeholderBox('বিষয় ও চ্যাপ্টার বাছাই করুন'));
  }

  function setLoading(show) {
    const btn = $('filterBtn');
    if (btn) { btn.disabled = show; btn.textContent = show ? 'লোডিং...' : 'দেখুন'; }
    if (show) setResults('<div class="loading-box"><div class="spinner"></div><p>লোড হচ্ছে...</p></div>');
  }

  function setResults(html) { const el = $('resultsContainer'); if (el) el.innerHTML = html; }
  function hideMeta() { const el = $('metaBar'); if (el) el.classList.remove('show'); }

  /* ── Utilities ── */
  function toBn(n) { return String(n).replace(/[0-9]/g, d => '০১১২৩৪৫৬৭৮৯'[d]); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function diffLabel(d) { return {easy: 'সহজ', medium: 'মাঝারি', hard: 'কঠিন'}[d] || d; }
  function badge(cls, text) { return `<span class="badge ${cls}">${esc(text)}</span>`; }
  function errorBox(msg) { return `<div class="error-box"><p>${esc(msg)}</p><button class="retry-btn" onclick="location.reload()">আবার চেষ্টা</button></div>`; }
  function placeholderBox(msg) { return `<div class="placeholder"><div class="ph-emoji">📖</div><p>${esc(msg)}</p><p class="ph-sub">তারপর <strong>দেখুন</strong> বাটনে ক্লিক করুন</p></div>`; }
  function emptyBox(msg) { return `<div class="empty-box"><p>${esc(msg)}</p></div>`; }
})();