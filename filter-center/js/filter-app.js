/**
 * filter-app.js – Redesigned with dropdowns for subject/unit/difficulty,
 * and collapsible advanced filters (type, multi, history, count, random).
 */
(function(window) {
  'use strict';

  let allQuestions = [], emptySubjects = [];
  let availableSubjects = [];  // from FilterEngine

  // filters state
  let currentFilters = {
    subject: 'all',     // single string
    unit: 'all',
    difficulty: 'all',
    types: ['all'],
    multi: 'all',
    history: 'all',
    count: 20,
    random: true
  };

  /* ── Helpers ── */
  const toBengali = num => String(num).replace(/[0-9]/g, d => '০১১২৩৪৫৬৭৮৯'[d]); // fixed typo in previous (0123456789)
  const getEl = id => document.getElementById(id);

  /* ── Collapsible toggle ── */
  function initCollapsible() {
    const header = getEl('advancedToggle');
    const body = getEl('advancedBody');
    if (header && body) {
      header.addEventListener('click', () => {
        header.classList.toggle('open');
        body.classList.toggle('open');
      });
      // start collapsed
      header.classList.remove('open');
      body.classList.remove('open');
    }
  }

  /* ── Populate subject dropdown ── */
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

  /* ── Populate unit dropdown based on selected subject ── */
  function populateUnits() {
    const unitSel = getEl('unitSelect');
    if (!unitSel || !window.FilterEngine) return;

    const subject = currentFilters.subject;
    let units = [];

    if (subject === 'all') {
      // Get all units from all subjects
      const viable = allQuestions.filter(q => emptySubjects.indexOf(q._subject) === -1);
      units = FilterEngine.getAvailableUnits(viable, ['all']); // object {subject: [units]}
      // flatten
      let flatUnits = [];
      Object.values(units).forEach(arr => flatUnits.push(...arr));
      units = [...new Set(flatUnits)].sort();
    } else {
      // units for that subject only
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
    unitSel.value = 'all';  // reset to all
    currentFilters.unit = 'all';
  }

  /* ── Advanced filter pills ── */
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

  /* ── Render advanced sections ── */
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
    const counts = [10,20,30,50,'all']; const labels = ['১০','২০','৩০','৫০','সব'];
    c.innerHTML = '';
    counts.forEach((cnt,i) => {
      const btn = document.createElement('button');
      btn.type='button'; btn.className='count-btn'; btn.textContent=labels[i]; btn.dataset.count=cnt;
      btn.addEventListener('click', () => { currentFilters.count = cnt; updateCountVisuals(); updateBottomBar(); });
      c.appendChild(btn);
    });
    updateCountVisuals();
  }

  function updateCountVisuals() {
    const c = getEl('countButtons');
    if (!c) return;
    c.querySelectorAll('.count-btn').forEach(btn => btn.classList.toggle('active', String(btn.dataset.count) === String(currentFilters.count)));
  }

  /* ── Build base filter set and update bottom bar ── */
  function getBaseFilteredQuestions() {
    if (!allQuestions.length) return [];
    // Build subjects array from single selection
    const subjects = currentFilters.subject === 'all' ? ['all'] : [currentFilters.subject];
    const units = currentFilters.unit === 'all' ? ['all'] : [currentFilters.unit];
    const difficulties = currentFilters.difficulty === 'all' ? ['all'] : [currentFilters.difficulty];

    return FilterEngine.applyFilters(allQuestions, {
      subjects,
      units,
      types: currentFilters.types,
      difficulties,
      multi: currentFilters.multi,
      random: false,
      count: 'all'
    });
  }

  function updateBottomBar() {
    if (!allQuestions.length) return;
    const filtered = getBaseFilteredQuestions();
    const finalFiltered = window.FilterHistory ? FilterHistory.filterByHistory(filtered, currentFilters.history) : filtered;
    const matchCount = finalFiltered.length;
    const quizCount = currentFilters.count === 'all' ? matchCount : Math.min(matchCount, parseInt(currentFilters.count,10) || 20);

    const countEl = getEl('bottomQuizCount');
    if (countEl) countEl.textContent = toBengali(quizCount);
    const btn = getEl('startQuizBtn');
    if (btn) {
      btn.disabled = matchCount === 0;
      btn.textContent = matchCount === 0 ? 'কোনো প্রশ্ন নেই' : `কুইজ শুরু করুন (${toBengali(quizCount)}টি)`;
    }
  }

  /* ── Start quiz ── */
  function startQuiz() {
    let filtered = getBaseFilteredQuestions();
    if (window.FilterHistory && currentFilters.history !== 'all') filtered = FilterHistory.filterByHistory(filtered, currentFilters.history);
    if (currentFilters.random) filtered = FilterEngine.shuffleArray(filtered);
    if (currentFilters.count !== 'all') filtered = filtered.slice(0, parseInt(currentFilters.count,10) || 20);
    if (!filtered.length) { alert('কোনো প্রশ্ন পাওয়া যায়নি।'); return; }
    sessionStorage.setItem('filter_quiz_questions', JSON.stringify(filtered));
    sessionStorage.setItem('filter_quiz_config', JSON.stringify(currentFilters));
    window.location.href = './quiz.html';
  }

  /* ── Init ── */
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

    // Setup UI
    populateSubjects();
    populateUnits(); // will show all units because subject='all'

    // Attach event listeners
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

    // Render advanced filters
    renderTypePills();
    renderMultiPills();
    renderHistoryPills();
    renderCountButtons();

    // Random toggle
    const randomToggle = getEl('randomToggle');
    if (randomToggle) {
      randomToggle.checked = currentFilters.random;
      randomToggle.addEventListener('change', () => { currentFilters.random = randomToggle.checked; });
    }

    // Start button
    getEl('startQuizBtn').addEventListener('click', startQuiz);

    updateBottomBar();
  }

  document.addEventListener('DOMContentLoaded', init);

})(window);