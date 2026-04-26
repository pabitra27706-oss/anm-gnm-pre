(function () {
  'use strict';

  const MANIFEST_PATH  = './data/manifest.json';
  const LETTERS        = ['A','B','C','D','E'];
  const BATCH_SIZE     = 6;
  const FETCH_TIMEOUT  = 12000;

  let manifest      = null;
  let scanning      = false;
  let renderToken   = 0;
  const cache = {};

  document.addEventListener('DOMContentLoaded', () => {
    console.log('UnitFilterApp: DOMContentLoaded');
    boot();
  });

  async function boot() {
    wireStaticButtons();
    manifest = await fetchManifest();
    if (!manifest) {
      setResults(errorBox('ম্যানিফেস্ট লোড করতে সমস্যা হয়েছে।', 'manifest fetch failed', true));
      return;
    }
    fillSubjectDropdown();
    console.log('UnitFilterApp: Boot complete — subjects:', Object.keys(manifest.subjects).length);
  }

  async function fetchManifest() {
    console.log('UnitFilterApp: Fetching manifest:', MANIFEST_PATH);
    try {
      const res = await fetchWithTimeout(MANIFEST_PATH);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data || typeof data.subjects !== 'object') throw new Error('Bad structure');
      return data;
    } catch (e) {
      console.error('UnitFilterApp: Manifest error:', e.message);
      return null;
    }
  }

  function fillSubjectDropdown() {
    const sel = $('subjectSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- বিষয় বাছাই করুন --</option>';
    Object.entries(manifest.subjects).forEach(([id, sub]) => {
      const o = document.createElement('option');
      o.value = id;
      o.textContent = sub.name;
      sel.appendChild(o);
    });
    console.log('UnitFilterApp: Subject dropdown filled');
  }

  async function onSubjectChange() {
    const subjectId = $val('subjectSelect');
    console.log('UnitFilterApp: Subject changed →', subjectId || '(none)');

    resetUnitUI();
    resetResults();
    hideMeta();

    if (!subjectId) return;

    if (cache[subjectId] && cache[subjectId].done) {
      console.log('UnitFilterApp: Using cache for', subjectId);
      buildUnitDropdown(subjectId);
      return;
    }

    await scanSubject(subjectId);
    buildUnitDropdown(subjectId);
  }

  async function scanSubject(subjectId) {
    if (scanning) { console.warn('UnitFilterApp: Already scanning'); return; }
    scanning = true;

    const subInfo   = manifest.subjects[subjectId];
    const totalSets = subInfo ? subInfo.sets : 0;

    console.log(`UnitFilterApp: Scanning subject "${subjectId}" — ${totalSets} sets expected`);

    cache[subjectId] = {
      done:      false,
      units:     new Map(),
      questions: [],
      loaded:    0,
      failed:    0,
      total:     totalSets,
    };

    const entry = cache[subjectId];

    showScanBox();
    setScanBar(0);
    setScanText(`প্রস্তুতি হচ্ছে… মোট ${toBn(totalSets)}টি সেট`);

    const unitSel = $('unitSelect');
    if (unitSel) {
      unitSel.disabled = true;
      unitSel.innerHTML = '<option value="">লোড হচ্ছে…</option>';
    }

    for (let bStart = 1; bStart <= totalSets; bStart += BATCH_SIZE) {

      if ($val('subjectSelect') !== subjectId) {
        console.log('UnitFilterApp: Scan aborted — subject changed');
        scanning = false;
        return;
      }

      const bEnd     = Math.min(bStart + BATCH_SIZE - 1, totalSets);
      const promises = [];

      for (let i = bStart; i <= bEnd; i++) {
        const setId = 'set-' + String(i).padStart(2, '0');
        const path  = `./data/${subjectId}/${setId}.json`;
        promises.push(fetchOneSet(path, i, subjectId));
      }

      const results = await Promise.allSettled(promises);

      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value) {
          const { ok, questions } = r.value;
          if (ok && questions.length > 0) {
            entry.loaded++;
            questions.forEach(q => {
              entry.questions.push(q);
              if (q.unit && typeof q.unit === 'string' && !entry.units.has(q.unit)) {
                entry.units.set(q.unit, resolveUnitName(q.unit));
              }
            });
          } else if (!ok) {
            entry.failed++;
          }
        } else {
          entry.failed++;
        }
      });

      const done   = Math.min(bEnd, totalSets);
      const pct    = Math.round((done / totalSets) * 100);
      setScanBar(pct);
      setScanText(
        `${toBn(done)} / ${toBn(totalSets)} সেট পড়া হয়েছে` +
        ` • ${toBn(entry.questions.length)} প্রশ্ন পাওয়া গেছে`
      );
    }

    entry.done = true;
    scanning   = false;

    console.log(
      `UnitFilterApp: Scan done — loaded:${entry.loaded} failed:${entry.failed}`,
      `units:${entry.units.size} questions:${entry.questions.length}`
    );

    hideScanBox();
    showUnitSummary(entry);
  }

  async function fetchOneSet(path, setIndex, subjectId) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetchWithTimeout(path);

        if (res.status === 404) {
          return { ok: false, questions: [] };
        }

        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }

        let data;
        try {
          data = await res.json();
        } catch (parseErr) {
          throw new Error('JSON parse failed: ' + parseErr.message);
        }

        if (!data || !Array.isArray(data.questions)) {
          throw new Error('No questions array in ' + path);
        }

        const questions = data.questions
          .filter(q => q && typeof q === 'object' && q.question && Array.isArray(q.options))
          .map(q => ({
            ...q,
            _setIndex:  setIndex,
            _subject:   subjectId,
          }));

        if (attempt > 1) {
          console.log(`UnitFilterApp: Retry succeeded: ${path}`);
        }

        return { ok: true, questions };

      } catch (e) {
        if (attempt === 1) {
          console.warn(`UnitFilterApp: Attempt ${attempt} failed for ${path}: ${e.message} — retrying`);
          await sleep(300);
        } else {
          console.warn(`UnitFilterApp: Both attempts failed for ${path}: ${e.message}`);
          return { ok: false, questions: [] };
        }
      }
    }
    return { ok: false, questions: [] };
  }

  function fetchWithTimeout(url, ms) {
    const timeout = ms || FETCH_TIMEOUT;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return fetch(url, { signal: controller.signal })
      .finally(() => clearTimeout(timer));
  }

  function buildUnitDropdown(subjectId) {
    const entry   = cache[subjectId];
    const unitSel = $('unitSelect');
    const diffSel = $('diffSelect');
    const filterBtn   = $('filterBtn');

    if (!unitSel) return;

    if (!entry || entry.units.size === 0) {
      unitSel.innerHTML = '<option value="">কোনো চ্যাপ্টার পাওয়া যায়নি</option>';
      unitSel.disabled  = true;
      if (filterBtn) filterBtn.disabled = true;
      console.warn('UnitFilterApp: No units found for', subjectId);
      return;
    }

    const sorted = [...entry.units.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    unitSel.innerHTML = '<option value="">-- চ্যাপ্টার বাছাই করুন --</option>';
    sorted.forEach(([id, name]) => {
      const o = document.createElement('option');
      o.value       = id;
      o.textContent = name;
      unitSel.appendChild(o);
    });

    unitSel.disabled = false;
    if (diffSel) diffSel.disabled = false;
    if (filterBtn)   filterBtn.disabled   = true;

    console.log(`UnitFilterApp: Unit dropdown: ${sorted.length} units`);
    showUnitSummary(entry);
  }

  async function performFilter() {
    const subjectId  = $val('subjectSelect');
    const unitId     = $val('unitSelect');
    const difficulty = $val('diffSelect');

    if (!subjectId || !unitId) {
      setResults(placeholderBox('বিষয় ও চ্যাপ্টার বাছাই করুন'));
      hideMeta();
      return;
    }

    const entry = cache[subjectId];
    if (!entry || !entry.done) {
      console.warn('UnitFilterApp: Cache not ready — not filtering');
      return;
    }

    const token = ++renderToken;
    setFilterBtnLoading(true);

    setResults(`
      <div class="loading-box">
        <div class="spinner"></div>
        <p>ফিল্টার করা হচ্ছে…</p>
      </div>
    `);
    hideMeta();
    await sleep(40);

    if (token !== renderToken) { setFilterBtnLoading(false); return; }

    let matched = entry.questions.filter(q => q.unit === unitId);
    if (difficulty) {
      matched = matched.filter(q => q.difficulty === difficulty);
    }

    console.log(
      `UnitFilterApp: unit="${unitId}" diff="${difficulty||'all'}" → ${matched.length} questions`
    );

    setFilterBtnLoading(false);
    if (token !== renderToken) return;

    if (matched.length === 0) {
      hideMeta();
      const unitName = resolveUnitName(unitId);
      const diffTxt  = difficulty ? ` (${diffLabel(difficulty)})` : '';
      setResults(`
        <div class="empty-box">
          <p>কোনো প্রশ্ন পাওয়া যায়নি</p>
          <p class="em-sub">"${esc(unitName)}${diffTxt}" — এই ফিল্টারে প্রশ্ন নেই</p>
        </div>
      `);
      return;
    }

    renderCards(matched, subjectId, unitId, difficulty);
  }

  function renderCards(questions, subjectId, unitId, difficulty) {
    const container = $('resultsContainer');
    if (!container) return;

    const subName  = manifest.subjects[subjectId]?.name || subjectId;
    const unitName = resolveUnitName(unitId);
    const diffTxt  = difficulty ? ` › ${diffLabel(difficulty)}` : '';

    const metaCount = $('metaCount');
    const metaLabel = $('metaLabel');
    const metaBar   = $('metaBar');

    if (metaCount) metaCount.innerHTML = `<strong>${toBn(questions.length)}</strong>টি প্রশ্ন`;
    if (metaLabel) metaLabel.textContent = `${subName} › ${unitName}${diffTxt}`;
    if (metaBar)   metaBar.classList.add('show');

    const frag = document.createDocumentFragment();
    questions.forEach((q, i) => {
      const card = buildCard(q, i + 1);
      if (card) frag.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(frag);

    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    console.log('UnitFilterApp: Rendered', questions.length, 'cards');
  }

  function buildCard(q, num) {
    if (!q || !Array.isArray(q.options) || !q.question) {
      console.warn('UnitFilterApp: Skipping malformed question', q?.id);
      return null;
    }

    const isMulti   = q.multi === true;
    const correct   = Array.isArray(q.answer) ? q.answer : [q.answer];

    const badges = [];
    if (q.unit)       badges.push(badge('b-unit',   resolveUnitName(q.unit)));
    if (q.difficulty) {
      const map = { easy:['সহজ','b-easy'], medium:['মাঝারি','b-medium'], hard:['কঠিন','b-hard'] };
      const d   = map[q.difficulty];
      if (d) badges.push(badge(d[1], d[0]));
    }
    if (isMulti)      badges.push(badge('b-multi',  'বহু সঠিক উত্তর'));

    const optsHtml = q.options.map((opt, i) => {
      const ok  = correct.includes(i);
      const ltr = LETTERS[i] || String(i+1);
      return `
        <div class="q-opt${ok ? ' correct' : ''}">
          <span class="opt-letter">${ok ? '✓\u00a0' : ''}${ltr}.</span>
          <span class="opt-text">${esc(String(opt))}</span>
        </div>`;
    }).join('');

    const ansLetters = correct
      .filter(i => typeof i === 'number' && i >= 0 && i < LETTERS.length)
      .map(i => LETTERS[i])
      .join(', ');

    const hasExp = q.explanation &&
      q.explanation.trim() !== '' &&
      q.explanation.trim() !== 'No explanation available.';

    const setLabel = q._setIndex
      ? `<span class="q-set">সেট ${toBn(q._setIndex)}</span>`
      : '';

    const card = document.createElement('div');
    card.className = 'q-card';
    card.innerHTML = `
      <div class="q-head">
        <span class="q-num">Q.${num}</span>
        ${setLabel}
        <div class="q-badges">${badges.join('')}</div>
      </div>
      <p class="q-text">${esc(String(q.question))}</p>
      <div class="q-options">${optsHtml}</div>
      <div class="q-answer">
        <span class="ans-label">সঠিক উত্তর:</span>
        <span class="ans-val">${esc(ansLetters)}</span>
      </div>
      ${hasExp ? `
        <div class="q-exp">
          <span class="exp-label">ব্যাখ্যা:</span>
          <span class="exp-text">${esc(String(q.explanation))}</span>
        </div>` : ''}
    `;
    return card;
  }

  function wireStaticButtons() {
    on('backBtn', 'click', () => {
      window.location.href = '../index.html';
    });

    on('printBtn', 'click', () => window.print());

    on('subjectSelect', 'change', () => onSubjectChange());

    on('unitSelect', 'change', () => {
      const filterBtn = $('filterBtn');
      if (filterBtn) filterBtn.disabled = !$val('unitSelect');
    });

    on('filterBtn', 'click', () => performFilter());

    console.log('UnitFilterApp: Static buttons wired');
  }

  function resetUnitUI() {
    const unitSel = $('unitSelect');
    const diffSel = $('diffSelect');
    const filterBtn   = $('filterBtn');
    if (unitSel) {
      unitSel.innerHTML = '<option value="">-- আগে বিষয় বাছাই করুন --</option>';
      unitSel.disabled  = true;
    }
    if (diffSel) diffSel.disabled = true;
    if (filterBtn)   filterBtn.disabled   = true;
    hideScanBox();
    hideUnitSummary();
  }

  function resetResults() {
    setResults(`
      <div class="placeholder">
        <div class="ph-emoji">📖</div>
        <p>বিষয় ও চ্যাপ্টার বাছাই করুন</p>
        <p class="ph-sub">তারপর <strong>দেখুন</strong> বাটনে ক্লিক করুন</p>
      </div>
    `);
  }

  function setResults(html) {
    const el = $('resultsContainer');
    if (el) el.innerHTML = html;
  }

  function hideMeta() {
    const el = $('metaBar');
    if (el) el.classList.remove('show');
  }

  function showScanBox() {
    const el = $('scanBox');
    if (el) el.classList.add('show');
  }

  function hideScanBox() {
    const el = $('scanBox');
    if (el) el.classList.remove('show');
  }

  function setScanBar(pct) {
    const el = $('scanBarFill');
    if (el) el.style.width = pct + '%';
  }

  function setScanText(txt) {
    const el = $('scanText');
    if (el) el.textContent = txt;
  }

  function showUnitSummary(entry) {
    const el = $('unitSummary');
    if (!el) return;
    el.textContent =
      `✓ ${toBn(entry.loaded)} সেট লোড হয়েছে` +
      (entry.failed > 0 ? ` • ${toBn(entry.failed)} সেট পাওয়া যায়নি` : '') +
      ` • ${toBn(entry.units.size)} চ্যাপ্টার` +
      ` • ${toBn(entry.questions.length)} প্রশ্ন`;
    el.classList.add('show');
  }

  function hideUnitSummary() {
    const el = $('unitSummary');
    if (el) el.classList.remove('show');
  }

  function setFilterBtnLoading(on) {
    const btn = $('filterBtn');
    if (!btn) return;
    btn.disabled    = on;
    btn.textContent = on ? 'প্রক্রিয়াজাত হচ্ছে…' : 'দেখুন';
  }

  function badge(cls, text) {
    return `<span class="badge ${cls}">${esc(text)}</span>`;
  }

  function errorBox(msg, detail, showRefresh) {
    return `
      <div class="error-box">
        <p>${esc(msg)}</p>
        ${detail ? `<p class="err-detail">${esc(detail)}</p>` : ''}
        ${showRefresh ? '<button class="retry-btn" onclick="location.reload()">পেজ রিফ্রেশ করুন</button>' : ''}
      </div>`;
  }

  function placeholderBox(msg) {
    return `
      <div class="placeholder">
        <div class="ph-emoji">🔍</div>
        <p>${esc(msg)}</p>
      </div>`;
  }

  function resolveUnitName(unitId) {
    if (!unitId) return '';
    const m = UNIT_MAP[unitId];
    if (m) return m;
    return unitId
      .replace(/^\d+-/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  const UNIT_MAP = {
    '01-cell-structure-functions': 'কোষের গঠন ও কার্যাবলী',
    '02-tissues':                  'কলাতন্ত্র',
    '03-digestive-system':         'পাচনতন্ত্র',
    '04-respiratory-system':       'শ্বসনতন্ত্র',
    '05-circulatory-system':       'রক্ত সংবহনতন্ত্র',
    '06-excretory-system':         'রেচনতন্ত্র',
    '07-nervous-system':           'স্নায়ুতন্ত্র',
    '08-reproductive-system':      'প্রজননতন্ত্র',
    '09-sense-organs':             'ইন্দ্রিয় অঙ্গ',
    '10-nutrition-health':         'পুষ্টি ও স্বাস্থ্য',
    '11-common-diseases':          'সাধারণ রোগসমূহ',
    '12-immunity':                 'রোগ প্রতিরোধ ক্ষমতা',
    '13-first-aid-fundamentals':   'প্রাথমিক চিকিৎসার মূলনীতি',
    '01-physics-basics':           'পদার্থবিজ্ঞানের মূল বিষয়',
    '02-chemistry-basics':         'রসায়নের মূল বিষয়',
    '03-biology-basics':           'জীববিজ্ঞানের মূল বিষয়',
    '04-environmental-science':    'পরিবেশ বিজ্ঞান',
    '05-everyday-science':         'দৈনন্দিন বিজ্ঞান',
    '01-number-system':            'সংখ্যা পদ্ধতি',
    '02-hcf-lcm':                  'গ.সা.গু ও ল.সা.গু',
    '03-percentage':               'শতকরা',
    '04-profit-loss':              'লাভ ও ক্ষতি',
    '05-simple-interest':          'সরল সুদ',
    '06-compound-interest':        'চক্রবৃদ্ধি সুদ',
    '07-ratio-proportion':         'অনুপাত ও সমানুপাত',
    '08-time-work':                'সময় ও কাজ',
    '09-time-distance':            'সময়, গতি ও দূরত্ব',
    '10-average':                  'গড়',
    '11-mixture-alligation':       'মিশ্রণ',
    '01-verbal-reasoning':         'মৌখিক যুক্তিবিদ্যা',
    '02-non-verbal-reasoning':     'অমৌখিক যুক্তিবিদ্যা',
    '03-analogies':                'সাদৃশ্য',
    '04-coding-decoding':          'কোডিং-ডিকোডিং',
    '05-blood-relations':          'রক্তের সম্পর্ক',
    '01-indian-history':           'ভারতের ইতিহাস',
    '02-indian-geography':         'ভারতের ভূগোল',
    '03-indian-polity':            'ভারতের রাজনীতি ও সংবিধান',
    '04-indian-economy':           'ভারতের অর্থনীতি',
    '05-sports':                   'খেলাধুলা',
    '06-awards-honours':           'পুরস্কার ও সম্মান',
    '07-books-authors':            'বই ও লেখক',
    '01-antonyms':                 'বিপরীত শব্দ (Antonyms)',
    '02-articles':                 'আর্টিকেল (Articles)',
    '03-tenses':                   'কাল (Tenses)',
    '04-fill-in-the-blanks':       'শূন্যস্থান পূরণ',
    '05-one-word-substitution':    'এক শব্দে প্রকাশ',
    '06-prepositions':             'পদান্বয়ী অব্যয় (Prepositions)',
    '07-sentence-rearrangement':   'বাক্য পুনর্বিন্যাস',
    '08-subject-verb-agreement':   'কর্তা-ক্রিয়ার মিল',
    '09-synonyms':                 'প্রতিশব্দ (Synonyms)',
    '10-reading-comprehension':    'পঠন অনুধাবন',
    '11-error-spotting':           'ভুল চিহ্নিতকরণ',
  };

  function $(id) {
    const el = document.getElementById(id);
    if (!el) console.warn('UnitFilterApp: element not found —', id);
    return el;
  }

  function $val(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function on(id, ev, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(ev, fn);
    else    console.warn('UnitFilterApp: Cannot attach event — element missing:', id);
  }

  function diffLabel(d) {
    return { easy:'সহজ', medium:'মাঝারি', hard:'কঠিন' }[d] || d;
  }

  function toBn(n) {
    if (n === undefined || n === null) return '';
    const d = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    return String(n).replace(/[0-9]/g, c => d[+c]);
  }

  function esc(s) {
    if (typeof s !== 'string') return String(s);
    return s
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

})();