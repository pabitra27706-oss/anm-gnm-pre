/**
 * filter-app.js – Full featured filter app with default 'never-correct', custom count, custom IDs, and view correct answers.
 */
(function(window) {
  'use strict';

  let allQuestions = [], emptySubjects = [];
  let availableSubjects = [];

  // filters state
  let currentFilters = {
    subject: 'all',
    unit: 'all',
    difficulty: 'all',
    types: ['all'],
    multi: 'all',
    history: 'never-correct',   // DEFAULT: never correct (unseen + wrong + partial)
    count: 20,
    random: true
  };

  const toBengali = num => String(num).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  const getEl = id => document.getElementById(id);

  function initCollapsible() {
    const header = getEl('advancedToggle');
    const body = getEl('advancedBody');
    if (header && body) {
      header.addEventListener('click', () => {
        header.classList.toggle('open');
        body.classList.toggle('open');
      });
      header.classList.remove('open');
      body.classList.remove('open');
    }
  }

  function populateSubjects() {
    const sel = getEl('subjectSelect');
    if (!sel || !window.FilterEngine) return;
    sel.innerHTML = '<option value="all">সব বিষয়</option>';
    availableSubjects = FilterEngine.getAllSubjects();
    availableSubjects.forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub;
      opt.textContent = FilterEngine.getSubjectBn(sub);
      sel.appendChild(opt);
    });
    sel.value = 'all';
  }

  function populateUnits() {
    const unitSel = getEl('unitSelect');
    if (!unitSel || !window.FilterEngine) return;
    const subject = currentFilters.subject;
    let units = [];
    if (subject === 'all') {
      const viable = allQuestions.filter(q => emptySubjects.indexOf(q._subject) === -1);
      const unitMap = FilterEngine.getAvailableUnits(viable, ['all']);
      let flatUnits = [];
      Object.values(unitMap).forEach(arr => flatUnits.push(...arr));
      units = [...new Set(flatUnits)].sort();
    } else {
      const viable = allQuestions.filter(q => q.subject === subject && emptySubjects.indexOf(q._subject) === -1);
      const unitMap = FilterEngine.getAvailableUnits(viable, [subject]);
      units = unitMap[subject] || [];
    }
    unitSel.innerHTML = '<option value="all">সব অধ্যায়</option>';
    units.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = FilterEngine.getUnitBn(u);
      unitSel.appendChild(opt);
    });
    unitSel.disabled = false;
    unitSel.value = 'all';
    currentFilters.unit = 'all';
  }

  function createPill(label, value, group, color) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-pill';
    btn.textContent = label;
    btn.dataset.value = value;
    btn.dataset.group = group;
    if (color) btn.dataset.color = color;
    btn.addEventListener('click', () => {
      if (group === 'type') handleMultiToggle('types', value, 'typePills');
      else if (group === 'multi') handleMultiFilterChange(value);
      else if (group === 'history') { currentFilters.history = value; updatePillVisuals('historyPills', [value]); updateBottomBar(); }
    });
    return btn;
  }

  function updatePillVisuals(containerId, selected) {
    const c = getEl(containerId);
    if (!c) return;
    c.querySelectorAll('.filter-pill').forEach(p => {
      const val = p.dataset.value;
      const isSel = selected.indexOf(val) > -1;
      p.classList.toggle('active', isSel);
      if (isSel) {
        const col = p.dataset.color;
        if (col && val !== 'all') {
          p.style.backgroundColor = col;
          p.style.borderColor = col;
          p.style.color = 'white';
        } else {
          p.style.backgroundColor = '#e91e63';
          p.style.borderColor = '#e91e63';
          p.style.color = 'white';
        }
      } else {
        p.style.backgroundColor = '';
        p.style.borderColor = '';
        p.style.color = '';
      }
    });
  }

  function handleMultiToggle(filterKey, value, containerId) {
    const arr = currentFilters[filterKey];
    if (value === 'all') {
      currentFilters[filterKey] = ['all'];
    } else {
      const allIdx = arr.indexOf('all');
      if (allIdx > -1) arr.splice(allIdx, 1);
      const idx = arr.indexOf(value);
      if (idx > -1) arr.splice(idx, 1);
      else arr.push(value);
      if (arr.length === 0) currentFilters[filterKey] = ['all'];
    }
    updatePillVisuals(containerId, currentFilters[filterKey]);
    updateBottomBar();
  }

  function handleMultiFilterChange(value) {
    currentFilters.multi = value;
    updatePillVisuals('multiPills', [value]);
    updateBottomBar();
  }

  function renderTypePills() {
    const c = getEl('typePills');
    if (!c) return;
    c.innerHTML = '';
    ['all','theory','numerical','memory','application'].forEach(t => {
      const label = t === 'all' ? 'সব' : FilterEngine.getTypeBn(t);
      c.appendChild(createPill(label, t, 'type'));
    });
    updatePillVisuals('typePills', currentFilters.types);
  }

  function renderMultiPills() {
    const c = getEl('multiPills');
    if (!c) return;
    c.innerHTML = '';
    [
      {value:'all', label:'সব প্রশ্ন'},
      {value:'multi-only', label:'শুধু বহু-সঠিক'},
      {value:'single-only', label:'শুধু এককটি সঠিক'}
    ].forEach(o => c.appendChild(createPill(o.label, o.value, 'multi', '#1976d2')));
    updatePillVisuals('multiPills', [currentFilters.multi]);
  }

  function renderHistoryPills() {
    const c = getEl('historyPills');
    if (!c) return;
    c.innerHTML = '';
    const opts = [
      {key:'all', label:'সব প্রশ্ন'},
      {key:'unseen', label:'নতুন (অদেখা)'},
      {key:'wrong', label:'ভুল হয়েছিল'},
      {key:'correct', label:'সঠিক হয়েছিল'},
      {key:'attempted', label:'আগে দিয়েছি'},
      {key:'never-correct', label:'কখনও সঠিক হয়নি'}
    ];
    opts.forEach(opt => {
      const pill = document.createElement('button');
      pill.type='button'; pill.className='filter-pill'; pill.textContent=opt.label; pill.dataset.value=opt.key; pill.dataset.group='history';
      pill.addEventListener('click', () => { currentFilters.history = opt.key; updatePillVisuals('historyPills', [opt.key]); updateBottomBar(); });
      c.appendChild(pill);
    });
    updatePillVisuals('historyPills', [currentFilters.history]);
  }

  function renderCountButtons() {
    const c = getEl('countButtons');
    if (!c) return;
    const counts = [10,20,30,50,'all'];
    const labels = ['১০','২০','৩০','৫০','সব'];
    c.innerHTML = '';
    counts.forEach((cnt,i) => {
      const btn = document.createElement('button');
      btn.type='button'; btn.className='count-btn'; btn.textContent=labels[i]; btn.dataset.count=cnt;
      btn.addEventListener('click', () => {
        currentFilters.count = cnt;
        updateCountVisuals();
        const customInput = getEl('customCountInput');
        if (customInput) customInput.value = '';
        updateBottomBar();
      });
      c.appendChild(btn);
    });
    updateCountVisuals();
  }

  function updateCountVisuals() {
    const c = getEl('countButtons');
    if (!c) return;
    c.querySelectorAll('.count-btn').forEach(btn => btn.classList.toggle('active', String(btn.dataset.count) === String(currentFilters.count)));
  }

  function getBaseFilteredQuestions() {
    if (!allQuestions.length) return [];
    const subjects = currentFilters.subject === 'all' ? ['all'] : [currentFilters.subject];
    const units = currentFilters.unit === 'all' ? ['all'] : [currentFilters.unit];
    const difficulties = currentFilters.difficulty === 'all' ? ['all'] : [currentFilters.difficulty];
    return FilterEngine.applyFilters(allQuestions, {
      subjects, units, types: currentFilters.types, difficulties,
      multi: currentFilters.multi, random: false, count: 'all'
    });
  }

  function updateBottomBar() {
    if (!allQuestions.length) return;
    const filtered = getBaseFilteredQuestions();
    const finalFiltered = window.FilterHistory ? FilterHistory.filterByHistory(filtered, currentFilters.history) : filtered;
    const matchCount = finalFiltered.length;
    let quizCount = matchCount;
    if (currentFilters.count !== 'all') {
      const num = parseInt(currentFilters.count, 10);
      if (!isNaN(num)) quizCount = Math.min(matchCount, num);
    }
    const countEl = getEl('bottomQuizCount');
    if (countEl) countEl.textContent = toBengali(quizCount);
    const btn = getEl('startQuizBtn');
    if (btn) {
      btn.disabled = matchCount === 0;
      btn.textContent = matchCount === 0 ? 'কোনো প্রশ্ন নেই' : `কুইজ শুরু করুন (${toBengali(quizCount)}টি)`;
    }
  }

  function startQuiz() {
    const customIdsRaw = getEl('customIdsInput')?.value.trim();
    let filtered = [];

    if (customIdsRaw) {
      const ids = customIdsRaw.split(',').map(s => s.trim()).filter(s => s);
      if (ids.length) {
        filtered = allQuestions.filter(q => ids.includes(q.id));
        if (filtered.length === 0) {
          alert('দেওয়া ID-এর সাথে কোনো প্রশ্ন মেলেনি। সঠিক ID ব্যবহার করুন (যেমন: ls-01-005)');
          return;
        }
        currentFilters.count = filtered.length;
      } else {
        filtered = getBaseFilteredQuestions();
        if (window.FilterHistory && currentFilters.history !== 'all') filtered = FilterHistory.filterByHistory(filtered, currentFilters.history);
      }
    } else {
      filtered = getBaseFilteredQuestions();
      if (window.FilterHistory && currentFilters.history !== 'all') filtered = FilterHistory.filterByHistory(filtered, currentFilters.history);
    }

    if (currentFilters.random && !customIdsRaw) filtered = FilterEngine.shuffleArray(filtered);
    if (currentFilters.count !== 'all' && !customIdsRaw) filtered = filtered.slice(0, parseInt(currentFilters.count,10) || 20);

    if (!filtered.length) { alert('কোনো প্রশ্ন পাওয়া যায়নি।'); return; }
    sessionStorage.setItem('filter_quiz_questions', JSON.stringify(filtered));
    sessionStorage.setItem('filter_quiz_config', JSON.stringify(currentFilters));
    window.location.href = './quiz.html';
  }

  async function init() {
    if (!window.FilterLoader || !window.FilterEngine) {
      alert('প্রয়োজনীয় স্ক্রিপ্ট লোড হয়নি');
      return;
    }
    try {
      allQuestions = await FilterLoader.loadAllQuestions(() => {});
    } catch(e) {
      alert('প্রশ্ন লোড করতে সমস্যা।');
      return;
    }
    emptySubjects = allQuestions.emptySubjects || [];
    if (!allQuestions.length) {
      alert('কোনো প্রশ্ন নেই।');
      return;
    }

    populateSubjects();
    populateUnits();

    getEl('subjectSelect').addEventListener('change', function() {
      currentFilters.subject = this.value;
      populateUnits();
      updateBottomBar();
    });
    getEl('unitSelect').addEventListener('change', function() {
      currentFilters.unit = this.value;
      updateBottomBar();
    });
    getEl('diffSelect').addEventListener('change', function() {
      currentFilters.difficulty = this.value;
      updateBottomBar();
    });

    initCollapsible();
    renderTypePills();
    renderMultiPills();
    renderHistoryPills();
    renderCountButtons();

    const randomToggle = getEl('randomToggle');
    if (randomToggle) {
      randomToggle.checked = currentFilters.random;
      randomToggle.addEventListener('change', () => { currentFilters.random = randomToggle.checked; });
    }

    const customCountInput = getEl('customCountInput');
    const applyCustomBtn = getEl('applyCustomCountBtn');
    if (applyCustomBtn && customCountInput) {
      applyCustomBtn.addEventListener('click', () => {
        let val = parseInt(customCountInput.value, 10);
        if (isNaN(val) || val < 1) {
          alert('দয়া করে ১ বা তার বেশি সংখ্যা দিন');
          return;
        }
        const maxPossible = allQuestions.length;
        if (val > maxPossible) val = maxPossible;
        currentFilters.count = val;
        document.querySelectorAll('.count-btn').forEach(btn => btn.classList.remove('active'));
        updateBottomBar();
      });
    }

    const clearIdsBtn = getEl('clearCustomIdsBtn');
    if (clearIdsBtn) {
      clearIdsBtn.addEventListener('click', () => {
        const idsInput = getEl('customIdsInput');
        if (idsInput) idsInput.value = '';
      });
    }

    const viewCorrectBtn = getEl('viewCorrectBtn');
    if (viewCorrectBtn) {
      viewCorrectBtn.addEventListener('click', () => {
        if (!window.FilterHistory) { alert('হিস্ট্রি মডিউল পাওয়া যায়নি।'); return; }
        const solvedMap = FilterHistory.getSolvedMap();
        const correctQuestions = [];
        for (const [key, record] of Object.entries(solvedMap)) {
          if (record.everCorrect === true) {
            const q = allQuestions.find(qq => FilterHistory.getQuestionKey(qq) === key);
            if (q) correctQuestions.push(q);
          }
        }
        if (correctQuestions.length === 0) {
          alert('কোনো সঠিক উত্তর দেওয়া প্রশ্ন নেই।');
          return;
        }
        sessionStorage.setItem('correct_questions', JSON.stringify(correctQuestions));
        window.location.href = './correct-answers.html';
      });
    }

    getEl('startQuizBtn').addEventListener('click', startQuiz);
    updateBottomBar();
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);