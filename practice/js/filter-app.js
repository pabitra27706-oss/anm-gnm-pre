/**
 * filter-app.js (COMPLETE with History Integration)
 * Main filter UI controller for filter.html
 * WB ANM GNM 2026 Preparation Platform
 */

(function(window) {
  'use strict';

  // ─── State ──────────────────────────────────────────────────────────────────

  var allQuestions = [];

  var currentFilters = {
    subjects:     ['all'],
    units:        ['all'],
    types:        ['all'],
    difficulties: ['all'],
    history:      'all',
    count:        20,
    random:       true
  };

  // ─── Bengali Number ─────────────────────────────────────────────────────────

  function toBengali(num) {
    var bn = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    return String(num).replace(/[0-9]/g, function(d) {
      return bn[parseInt(d)];
    });
  }

  // ─── Safe DOM Access ────────────────────────────────────────────────────────

  function getEl(id) {
    var element = document.getElementById(id);
    if (!element) {
      console.warn('filter-app: Missing element #' + id);
    }
    return element;
  }

  // ─── Show/Hide ──────────────────────────────────────────────────────────────

  function showLoading(show) {
    var loadingEl = getEl('loadingState');
    var filterEl  = getEl('filterPanel');
    var errorEl   = getEl('errorState');

    if (show) {
      if (loadingEl) loadingEl.style.display = 'block';
      if (filterEl)  filterEl.style.display  = 'none';
      if (errorEl)   errorEl.style.display   = 'none';
    } else {
      if (loadingEl) loadingEl.style.display = 'none';
      if (filterEl)  filterEl.style.display  = 'block';
      if (errorEl)   errorEl.style.display   = 'none';
    }
    console.log('filter-app: showLoading(' + show + ')');
  }

  function showError(message) {
    var loadingEl = getEl('loadingState');
    var filterEl  = getEl('filterPanel');
    var errorEl   = getEl('errorState');
    var msgEl     = getEl('errorMessage');

    if (loadingEl) loadingEl.style.display = 'none';
    if (filterEl)  filterEl.style.display  = 'none';
    if (errorEl)   errorEl.style.display   = 'block';
    if (msgEl)     msgEl.textContent       = message;
    console.error('filter-app: ERROR:', message);
  }

  function updateLoadingProgress(loaded, total) {
    var pct     = total > 0 ? Math.round((loaded / total) * 100) : 0;
    var barEl   = getEl('progressBar');
    var textEl  = getEl('progressText');
    var countEl = getEl('progressCount');

    if (barEl)   barEl.style.width   = pct + '%';
    if (textEl)  textEl.textContent  = 'লোড হচ্ছে... ' + toBengali(pct) + '%';
    if (countEl) countEl.textContent = toBengali(loaded) + '/' + toBengali(total) + ' সেট লোড হয়েছে';
  }

  // ─── Pill Creation ──────────────────────────────────────────────────────────

  function createPill(label, value, group, color) {
    var btn = document.createElement('button');
    btn.type          = 'button';
    btn.className     = 'filter-pill';
    btn.textContent   = label;
    btn.dataset.value = value;
    btn.dataset.group = group;
    if (color) btn.dataset.color = color;

    btn.addEventListener('click', function() {
      if (group === 'subject') {
        handleSubjectChange(value);
      } else if (group === 'type') {
        handleMultiToggle('types', value, 'typePills');
      } else if (group === 'difficulty') {
        handleMultiToggle('difficulties', value, 'difficultyPills');
      }
    });

    return btn;
  }

  // ─── Pill Visual Update ──────────────────────────────────────────────────────

  function updatePillVisuals(containerId, selectedValues) {
    var container = getEl(containerId);
    if (!container) return;

    var pills = container.querySelectorAll('.filter-pill');
    for (var i = 0; i < pills.length; i++) {
      var pill = pills[i];
      var val  = pill.dataset.value;
      var isSelected = selectedValues.indexOf(val) > -1;

      if (isSelected) {
        pill.classList.add('active');
        var color = pill.dataset.color;
        if (color && val !== 'all') {
          pill.style.backgroundColor = color;
          pill.style.borderColor     = color;
          pill.style.color           = 'white';
        } else {
          pill.style.backgroundColor = '#e91e63';
          pill.style.borderColor     = '#e91e63';
          pill.style.color           = 'white';
        }
      } else {
        pill.classList.remove('active');
        pill.style.backgroundColor = '';
        pill.style.borderColor     = '';
        pill.style.color           = '';
      }
    }
  }

  // ─── Subject Filter ──────────────────────────────────────────────────────────

  function renderSubjectFilters() {
    var container = getEl('subjectPills');
    if (!container || !window.FilterEngine) return;

    container.innerHTML = '';

    // "All" pill
    container.appendChild(createPill('সব বিষয়', 'all', 'subject'));

    // Subject pills
    var subjects = FilterEngine.getAllSubjects();
    for (var i = 0; i < subjects.length; i++) {
      var s = subjects[i];
      container.appendChild(
        createPill(
          FilterEngine.getSubjectBn(s),
          s,
          'subject',
          FilterEngine.getSubjectColor(s)
        )
      );
    }

    updatePillVisuals('subjectPills', currentFilters.subjects);
    console.log('filter-app: Subject pills rendered');
  }

  function handleSubjectChange(value) {
    if (value === 'all') {
      currentFilters.subjects = ['all'];
    } else {
      var allIdx = currentFilters.subjects.indexOf('all');
      if (allIdx > -1) currentFilters.subjects.splice(allIdx, 1);

      var idx = currentFilters.subjects.indexOf(value);
      if (idx > -1) {
        currentFilters.subjects.splice(idx, 1);
      } else {
        currentFilters.subjects.push(value);
      }

      if (currentFilters.subjects.length === 0) {
        currentFilters.subjects = ['all'];
      }
    }

    currentFilters.units = ['all'];
    updatePillVisuals('subjectPills', currentFilters.subjects);
    renderUnitFilters();
    updateHistoryStats();
    updatePreview();
  }

  // ─── Multi Toggle ───────────────────────────────────────────────────────────

  function handleMultiToggle(filterKey, value, containerId) {
    var arr = currentFilters[filterKey];

    if (value === 'all') {
      currentFilters[filterKey] = ['all'];
    } else {
      var allIdx = arr.indexOf('all');
      if (allIdx > -1) arr.splice(allIdx, 1);

      var idx = arr.indexOf(value);
      if (idx > -1) {
        arr.splice(idx, 1);
      } else {
        arr.push(value);
      }

      if (arr.length === 0) {
        currentFilters[filterKey] = ['all'];
      }
    }

    updatePillVisuals(containerId, currentFilters[filterKey]);
    updateHistoryStats();
    updatePreview();
  }

  // ─── Unit Filters ────────────────────────────────────────────────────────────

  function renderUnitFilters() {
    var container = getEl('unitFilters');
    if (!container || !window.FilterEngine) return;

    container.innerHTML = '';

    var unitsBySubject = FilterEngine.getAvailableUnits(allQuestions, currentFilters.subjects);
    var subjectKeys = Object.keys(unitsBySubject);

    if (subjectKeys.length === 0) {
      container.innerHTML = '<p class="no-units-msg">কোনো অধ্যায় পাওয়া যায়নি</p>';
      return;
    }

    // "All units" pill
    var allPill = document.createElement('button');
    allPill.type          = 'button';
    allPill.className     = 'filter-pill';
    allPill.textContent   = 'সব অধ্যায়';
    allPill.dataset.value = 'all';
    allPill.addEventListener('click', function() { handleUnitChange('all'); });
    container.appendChild(allPill);

    // Grouped units
    var useAll = currentFilters.subjects.indexOf('all') > -1;
    var multiSubject = useAll || currentFilters.subjects.length > 1;

    for (var s = 0; s < subjectKeys.length; s++) {
      var subject = subjectKeys[s];
      var units   = unitsBySubject[subject];

      if (multiSubject) {
        var label = document.createElement('div');
        label.className = 'unit-group-label';
        label.style.color = FilterEngine.getSubjectColor(subject);
        label.textContent = FilterEngine.getSubjectBn(subject);
        container.appendChild(label);
      }

      for (var u = 0; u < units.length; u++) {
        (function(unitVal, subjectVal) {
          var pill = document.createElement('button');
          pill.type            = 'button';
          pill.className       = 'filter-pill unit-pill';
          pill.textContent     = FilterEngine.getUnitBn(unitVal);
          pill.dataset.value   = unitVal;
          pill.dataset.subject = subjectVal;
          pill.addEventListener('click', function() {
            handleUnitChange(unitVal);
          });
          container.appendChild(pill);
        })(units[u], subject);
      }
    }

    updateUnitPillVisuals();
  }

  function handleUnitChange(value) {
    if (value === 'all') {
      currentFilters.units = ['all'];
    } else {
      var allIdx = currentFilters.units.indexOf('all');
      if (allIdx > -1) currentFilters.units.splice(allIdx, 1);

      var idx = currentFilters.units.indexOf(value);
      if (idx > -1) {
        currentFilters.units.splice(idx, 1);
      } else {
        currentFilters.units.push(value);
      }

      if (currentFilters.units.length === 0) {
        currentFilters.units = ['all'];
      }
    }

    updateUnitPillVisuals();
    updateHistoryStats();
    updatePreview();
  }

  function updateUnitPillVisuals() {
    var container = getEl('unitFilters');
    if (!container) return;

    var pills    = container.querySelectorAll('.filter-pill');
    var selected = currentFilters.units;

    for (var i = 0; i < pills.length; i++) {
      var pill = pills[i];
      var val  = pill.dataset.value;
      var isActive = selected.indexOf(val) > -1 ||
                     (selected.indexOf('all') > -1 && val === 'all');

      if (isActive) {
        pill.classList.add('active');
        if (val === 'all') {
          pill.style.backgroundColor = '#e91e63';
          pill.style.borderColor     = '#e91e63';
          pill.style.color           = 'white';
        } else {
          var subj  = pill.dataset.subject;
          var color = subj ? FilterEngine.getSubjectColor(subj) : '#e91e63';
          pill.style.backgroundColor = color;
          pill.style.borderColor     = color;
          pill.style.color           = 'white';
        }
      } else {
        pill.classList.remove('active');
        pill.style.backgroundColor = '';
        pill.style.borderColor     = '';
        pill.style.color           = '';
      }
    }
  }

  // ─── Type Filters ────────────────────────────────────────────────────────────

  function renderTypeFilters() {
    var container = getEl('typePills');
    if (!container) return;

    container.innerHTML = '';
    container.appendChild(createPill('সব', 'all', 'type'));
    container.appendChild(createPill('তত্ত্ব', 'theory', 'type'));
    container.appendChild(createPill('গাণিতিক', 'numerical', 'type'));
    container.appendChild(createPill('মুখস্থ', 'memory', 'type'));
    container.appendChild(createPill('প্রয়োগ', 'application', 'type'));

    updatePillVisuals('typePills', currentFilters.types);
  }

  // ─── Difficulty Filters ──────────────────────────────────────────────────────

  function renderDifficultyFilters() {
    var container = getEl('difficultyPills');
    if (!container) return;

    container.innerHTML = '';
    container.appendChild(createPill('সব', 'all', 'difficulty'));
    container.appendChild(createPill('সহজ', 'easy', 'difficulty', '#4caf50'));
    container.appendChild(createPill('মাঝারি', 'medium', 'difficulty', '#ff9800'));
    container.appendChild(createPill('কঠিন', 'hard', 'difficulty', '#f44336'));

    updatePillVisuals('difficultyPills', currentFilters.difficulties);
  }

  // ─── History Filters (NEW) ──────────────────────────────────────────────────

  function renderHistoryFilters() {
    var container = getEl('historyPills');
    if (!container) return;

    container.innerHTML = '';

    var options = [
      { key: 'all',           label: 'সব প্রশ্ন',          color: null },
      { key: 'unseen',        label: 'নতুন (অদেখা)',       color: '#9e9e9e' },
      { key: 'wrong',         label: 'ভুল হয়েছিল',        color: '#f44336' },
      { key: 'correct',       label: 'সঠিক হয়েছিল',       color: '#4caf50' },
      { key: 'attempted',     label: 'আগে দিয়েছি',        color: '#2196f3' },
      { key: 'never-correct', label: 'কখনও সঠিক হয়নি',    color: '#ff9800' }
    ];

    for (var i = 0; i < options.length; i++) {
      (function(opt) {
        var pill = document.createElement('button');
        pill.type          = 'button';
        pill.className     = 'filter-pill';
        pill.textContent   = opt.label;
        pill.dataset.value = opt.key;
        pill.dataset.group = 'history';
        if (opt.color) pill.dataset.color = opt.color;

        pill.addEventListener('click', function() {
          currentFilters.history = opt.key;
          updatePillVisuals('historyPills', [opt.key]);
          updatePreview();
        });

        container.appendChild(pill);
      })(options[i]);
    }

    updatePillVisuals('historyPills', [currentFilters.history]);
    console.log('filter-app: History pills rendered');
  }

  function updateHistoryStats() {
    if (!window.FilterHistory) {
      console.log('filter-app: FilterHistory not loaded, skip stats');
      return;
    }

    var statsContainer = getEl('historyStats');
    var bannerEl       = getEl('historyBanner');
    var bannerIcon     = getEl('historyBannerIcon');
    var bannerTitle    = getEl('historyBannerTitle');
    var bannerSub      = getEl('historyBannerSub');
    var progressFill   = getEl('historyProgressFill');

    // Get filtered questions (before history filter)
    var filteredAll = getBaseFilteredQuestions();

    // Count statuses
    var statusCounts = FilterHistory.countByStatus(filteredAll);

    // Render mini stats
    if (statsContainer) {
      statsContainer.innerHTML = '';

      var items = [
        { label: 'অদেখা',  count: statusCounts.unseen,  cls: 'unseen' },
        { label: 'সঠিক',   count: statusCounts.correct, cls: 'correct' },
        { label: 'ভুল',    count: statusCounts.wrong,   cls: 'wrong' },
        { label: 'এড়ানো',  count: statusCounts.skipped, cls: 'skipped' }
      ];

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var div = document.createElement('div');
        div.className = 'history-stat-item';
        div.innerHTML =
          '<span class="history-dot ' + item.cls + '"></span>' +
          '<span>' + item.label + ': </span>' +
          '<span class="history-stat-count">' + toBengali(item.count) + '</span>';
        statsContainer.appendChild(div);
      }
    }

    // Update banner
    var overallStats = FilterHistory.getOverallStats();

    if (bannerEl) {
      if (overallStats.totalSolved > 0) {
        bannerEl.classList.remove('empty');

        if (bannerIcon) bannerIcon.textContent = '📊';

        if (bannerTitle) {
          bannerTitle.textContent =
            'আপনি ' + toBengali(overallStats.totalSolved) + 'টি প্রশ্ন সম্পন্ন করেছেন';
        }

        if (bannerSub) {
          var totalAvailable = allQuestions.length;
          var pct = totalAvailable > 0
            ? Math.round((overallStats.everCorrect / totalAvailable) * 100)
            : 0;
          bannerSub.textContent =
            toBengali(overallStats.everCorrect) + 'টি সঠিক • ' +
            toBengali(pct) + '% সাফল্যের হার';
        }

        if (progressFill && allQuestions.length > 0) {
          var fillPct = Math.round((overallStats.totalSolved / allQuestions.length) * 100);
          progressFill.style.width = Math.min(fillPct, 100) + '%';
        }
      } else {
        bannerEl.classList.add('empty');
        if (bannerIcon)  bannerIcon.textContent  = '📝';
        if (bannerTitle) bannerTitle.textContent  = 'এখনও কোনো কুইজ দেওয়া হয়নি';
        if (bannerSub)   bannerSub.textContent    = 'প্রথম কুইজ দিন এবং আপনার অগ্রগতি দেখুন!';
        if (progressFill) progressFill.style.width = '0%';
      }
    }
  }

  // ─── Count Buttons ──────────────────────────────────────────────────────────

  function renderCountButtons() {
    var container = getEl('countButtons');
    if (!container) return;

    var counts = [10, 20, 30, 50, 'all'];
    var labels = ['১০', '২০', '৩০', '৫০', 'সব'];

    container.innerHTML = '';
    for (var i = 0; i < counts.length; i++) {
      (function(count, label) {
        var btn = document.createElement('button');
        btn.type        = 'button';
        btn.className   = 'count-btn';
        btn.textContent = label;
        btn.dataset.count = count;
        btn.addEventListener('click', function() {
          currentFilters.count = count;
          updateCountVisuals();
          updatePreview();
        });
        container.appendChild(btn);
      })(counts[i], labels[i]);
    }

    updateCountVisuals();
  }

  function updateCountVisuals() {
    var container = getEl('countButtons');
    if (!container) return;
    var btns = container.querySelectorAll('.count-btn');
    for (var i = 0; i < btns.length; i++) {
      var isActive = String(btns[i].dataset.count) === String(currentFilters.count);
      btns[i].classList.toggle('active', isActive);
    }
  }

  // ─── Random Toggle ──────────────────────────────────────────────────────────

  function initRandomToggle() {
    var toggle = getEl('randomToggle');
    if (!toggle) return;
    toggle.checked = currentFilters.random;
    toggle.addEventListener('change', function() {
      currentFilters.random = toggle.checked;
    });
  }

  // ─── Helper: Get Base Filtered Questions (before history & count) ──────────

  function getBaseFilteredQuestions() {
    if (!window.FilterEngine) return allQuestions;
    if (allQuestions.length === 0) return [];

    return FilterEngine.applyFilters(allQuestions, {
      subjects:     currentFilters.subjects,
      units:        currentFilters.units,
      types:        currentFilters.types,
      difficulties: currentFilters.difficulties,
      random:       false,
      count:        'all'
    });
  }

  // ─── Preview Update ─────────────────────────────────────────────────────────

  function updatePreview() {
    if (!window.FilterEngine) return;
    if (allQuestions.length === 0) return;

    // Step 1: Base filters (subject, unit, type, difficulty)
    var filtered = getBaseFilteredQuestions();

    // Step 2: Apply history filter
    if (window.FilterHistory && currentFilters.history !== 'all') {
      filtered = FilterHistory.filterByHistory(filtered, currentFilters.history);
    }

    var matchCount = filtered.length;

    // Quiz count (capped)
    var quizCount = currentFilters.count === 'all'
      ? matchCount
      : Math.min(matchCount, parseInt(currentFilters.count) || 20);

    // Update count displays
    var matchEl = getEl('matchCount');
    var quizEl  = getEl('quizCount');
    if (matchEl) matchEl.textContent = toBengali(matchCount);
    if (quizEl)  quizEl.textContent  = toBengali(quizCount);

    // Update start button
    var startBtn = getEl('startQuizBtn');
    if (startBtn) {
      if (matchCount === 0) {
        startBtn.disabled    = true;
        startBtn.textContent = 'কোনো প্রশ্ন পাওয়া যায়নি';
      } else {
        startBtn.disabled    = false;
        startBtn.textContent = 'কুইজ শুরু করুন (' + toBengali(quizCount) + 'টি প্রশ্ন)';
      }
    }

    // Subject breakdown
    var breakdownEl = getEl('breakdownList');
    if (breakdownEl) {
      breakdownEl.innerHTML = '';
      if (matchCount === 0) {
        breakdownEl.innerHTML = '<span class="breakdown-empty">ফিল্টার পরিবর্তন করুন</span>';
      } else {
        var breakdown = FilterEngine.getBreakdown(filtered);
        var subjects  = Object.keys(breakdown);
        for (var i = 0; i < subjects.length; i++) {
          var sub  = subjects[i];
          var pill = document.createElement('span');
          pill.className = 'breakdown-pill';
          var color = FilterEngine.getSubjectColor(sub);
          pill.style.backgroundColor = color + '20';
          pill.style.borderColor     = color;
          pill.style.color           = color;
          pill.textContent = FilterEngine.getSubjectBn(sub) + ': ' + toBengali(breakdown[sub]);
          breakdownEl.appendChild(pill);
        }
      }
    }

    console.log('filter-app: Preview → ' + matchCount + ' match, quiz=' + quizCount);
  }

  // ─── Start Quiz ─────────────────────────────────────────────────────────────

  function startQuiz() {
    if (!window.FilterEngine) return;

    // Step 1: Base filters
    var filtered = FilterEngine.applyFilters(allQuestions, {
      subjects:     currentFilters.subjects,
      units:        currentFilters.units,
      types:        currentFilters.types,
      difficulties: currentFilters.difficulties,
      random:       false,
      count:        'all'
    });

    // Step 2: History filter
    if (window.FilterHistory && currentFilters.history !== 'all') {
      filtered = FilterHistory.filterByHistory(filtered, currentFilters.history);
    }

    // Step 3: Randomize
    if (currentFilters.random && window.FilterEngine) {
      filtered = FilterEngine.shuffleArray(filtered);
    }

    // Step 4: Limit count
    if (currentFilters.count !== 'all') {
      var limit = parseInt(currentFilters.count) || 20;
      filtered = filtered.slice(0, limit);
    }

    // Check
    if (filtered.length === 0) {
      alert('কোনো প্রশ্ন পাওয়া যায়নি। ফিল্টার পরিবর্তন করুন।');
      return;
    }

    // Save to sessionStorage
    try {
      sessionStorage.setItem('filter_quiz_questions', JSON.stringify(filtered));
      sessionStorage.setItem('filter_quiz_config', JSON.stringify(currentFilters));
      window.location.href = './filter-quiz.html';
    } catch (e) {
      console.error('filter-app: sessionStorage error', e);
      alert('কুইজ শুরু করতে সমস্যা। পেজ রিলোড করুন।');
    }
  }

  // ─── Update Stats Bar ───────────────────────────────────────────────────────

  function updateStatsBar() {
    var statsEl = getEl('totalLoadedText');
    if (statsEl && allQuestions.length > 0) {
      statsEl.textContent =
        'মোট ' + toBengali(allQuestions.length) + 'টি প্রশ্ন লোড হয়েছে • ৬টি বিষয়';
    }
  }

  // ─── INIT ───────────────────────────────────────────────────────────────────

  async function initFilterApp() {
    console.log('filter-app: ========== INIT START ==========');

    // Check dependencies
    if (!window.FilterLoader) {
      showError('FilterLoader লোড হয়নি। পেজ রিলোড করুন।');
      return;
    }
    if (!window.FilterEngine) {
      showError('FilterEngine লোড হয়নি। পেজ রিলোড করুন।');
      return;
    }

    console.log('filter-app: Dependencies OK');
    if (window.FilterHistory) {
      console.log('filter-app: FilterHistory available ✅');
    } else {
      console.log('filter-app: FilterHistory NOT loaded (history features disabled)');
    }

    // Show loading
    showLoading(true);

    // Load all questions
    try {
      allQuestions = await FilterLoader.loadAllQuestions(function(loaded, total) {
        updateLoadingProgress(loaded, total);
      });
    } catch (e) {
      console.error('filter-app: loadAllQuestions crashed', e);
      showError('প্রশ্ন লোড করতে সমস্যা: ' + e.message);
      return;
    }

    console.log('filter-app: Questions loaded =', allQuestions.length);

    // Check results
    if (!allQuestions || allQuestions.length === 0) {
      showError(
        'কোনো প্রশ্ন লোড হয়নি। data/ ফোল্ডারে JSON ফাইল আছে কিনা চেক করুন।'
      );
      return;
    }

    // Hide loading, show filters
    showLoading(false);
    console.log('filter-app: Rendering filters...');

    // Render all sections
    renderSubjectFilters();
    renderUnitFilters();
    renderTypeFilters();
    renderDifficultyFilters();
    renderHistoryFilters();
    renderCountButtons();
    initRandomToggle();
    updateStatsBar();
    updateHistoryStats();
    updatePreview();

    console.log('filter-app: ========== INIT COMPLETE ==========');
  }

  // ─── DOM Ready ──────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function() {
    console.log('filter-app: DOMContentLoaded');

    var startBtn = getEl('startQuizBtn');
    if (startBtn) {
      startBtn.addEventListener('click', startQuiz);
    }

    var retryBtn = getEl('retryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', function() {
        window.location.reload();
      });
    }

    initFilterApp();
  });

  // Debug
  window._FilterApp = {
    getAllQuestions:    function() { return allQuestions; },
    getCurrentFilters: function() { return currentFilters; },
    reInit:            initFilterApp
  };

})(window);