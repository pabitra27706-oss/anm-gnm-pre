/**
 * results-app.js
 * PURPOSE : Main controller for the Results Dashboard.
 *           Orchestrates loader, filter, print modules.
 *           Renders summary cards and result cards.
 * PATTERN : IIFE + DOMContentLoaded wrapper
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════
     INTERNAL STATE
  ═══════════════════════════════════════════════════════ */
  var _allResults     = [];   /* full merged array from loader   */
  var _currentResults = [];   /* currently displayed (filtered)  */

  /* ═══════════════════════════════════════════════════════
     UTILITY: Safe element getter
  ═══════════════════════════════════════════════════════ */

  /**
   * Get DOM element by ID with null check + optional warn.
   * @param {string}  id
   * @param {boolean} [warn=true]
   * @returns {HTMLElement|null}
   */
  function getEl(id, warn) {
    var el = document.getElementById(id);
    if (!el && warn !== false) {
      console.warn('[App] Element not found: #' + id);
    }
    return el;
  }

  /* ═══════════════════════════════════════════════════════
     UTILITY: Escape HTML to prevent XSS
  ═══════════════════════════════════════════════════════ */

  /**
   * Escape special HTML characters in a string.
   * @param {*} str
   * @returns {string}
   */
  function escHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }

  /* ═══════════════════════════════════════════════════════
     UTILITY: Bengali numeral (local shorthand)
  ═══════════════════════════════════════════════════════ */

  /**
   * Delegate to ResultsLoader.toBengaliNum with safety check.
   * @param {string|number} val
   * @returns {string}
   */
  function bn(val) {
    try {
      if (window.ResultsLoader && window.ResultsLoader.toBengaliNum) {
        return window.ResultsLoader.toBengaliNum(val);
      }
    } catch (e) { /* fall through */ }
    return String(val);
  }

  /* ═══════════════════════════════════════════════════════
     UTILITY: Show Toast Notification
  ═══════════════════════════════════════════════════════ */

  var _toastTimer = null;

  /**
   * Show a short toast message at the bottom of the screen.
   * Auto-hides after `duration` ms.
   * @param {string} message
   * @param {number} [duration=2800]
   */
  function showToast(message, duration) {
    var toast    = getEl('toastMsg',   false);
    var toastTxt = getEl('toastText',  false);
    if (!toast || !toastTxt) {
      console.log('[App] Toast:', message);
      return;
    }

    /* Clear any existing timer */
    if (_toastTimer) {
      clearTimeout(_toastTimer);
      _toastTimer = null;
    }

    toastTxt.textContent = message;
    toast.hidden = false;
    toast.classList.remove('toast--hide');

    var ms = (typeof duration === 'number' && duration > 0) ? duration : 2800;

    _toastTimer = setTimeout(function () {
      toast.classList.add('toast--hide');
      setTimeout(function () {
        if (toast) toast.hidden = true;
        if (toast) toast.classList.remove('toast--hide');
      }, 350);
    }, ms);

    console.log('[App] Toast shown:', message);
  }

  /* ═══════════════════════════════════════════════════════
     UTILITY: Update results count meta text
  ═══════════════════════════════════════════════════════ */

  /**
   * Update the "X টি ফলাফল" count display.
   * @param {number} count
   * @param {string} filterType
   */
  function updateResultsMeta(count, filterType) {
    var metaEl = getEl('resultsCount', false);
    if (!metaEl) return;

    var label = '';
    if (window.ResultsFilter && window.ResultsFilter.getFilterLabel) {
      label = window.ResultsFilter.getFilterLabel(filterType);
    }

    var countBn = bn(count);

    if (count === 0) {
      metaEl.textContent = 'কোনো ফলাফল পাওয়া যায়নি';
    } else if (filterType === 'all') {
      metaEl.textContent = 'মোট ' + countBn + 'টি ফলাফল';
    } else {
      metaEl.textContent = label + ': ' + countBn + 'টি ফলাফল';
    }
  }

  /* ═══════════════════════════════════════════════════════
     1. loadAllResults
  ═══════════════════════════════════════════════════════ */

  /**
   * Read all results from localStorage via ResultsLoader.
   * Populates _allResults and _currentResults.
   * @returns {Array}
   */
  function loadAllResults() {
    console.log('[App] loadAllResults() called');

    /* Guard: check loader is available */
    if (!window.ResultsLoader || typeof window.ResultsLoader.getAllResults !== 'function') {
      console.error('[App] ResultsLoader not available');
      _allResults     = [];
      _currentResults = [];
      return [];
    }

    try {
      _allResults     = window.ResultsLoader.getAllResults();
      _currentResults = _allResults.slice();
      console.log('[App] Total results loaded:', _allResults.length);
      return _allResults;
    } catch (err) {
      console.error('[App] loadAllResults error:', err);
      _allResults     = [];
      _currentResults = [];
      return [];
    }
  }

  /* ═══════════════════════════════════════════════════════
     2. calculateSummary
  ═══════════════════════════════════════════════════════ */

  /**
   * Calculate summary statistics from all results.
   *
   * Returns:
   * {
   *   totalAttempted : number,
   *   avgPercentage  : number,
   *   bestPercentage : number,
   *   practiceSets   : number
   * }
   *
   * @param {Array} allResults
   * @returns {Object}
   */
  function calculateSummary(allResults) {
    console.log('[App] calculateSummary() for', allResults.length, 'results');

    var summary = {
      totalAttempted: 0,
      avgPercentage:  0,
      bestPercentage: 0,
      practiceSets:   0
    };

    if (!Array.isArray(allResults) || allResults.length === 0) {
      return summary;
    }

    summary.totalAttempted = allResults.length;

    var totalPct   = 0;
    var bestPct    = 0;
    var practiceN  = 0;
    var validCount = 0;

    for (var i = 0; i < allResults.length; i++) {
      var result = allResults[i];
      if (!result || typeof result !== 'object') continue;

      /* Percentage */
      var pct = 0;
      if (typeof result.normalizedPct === 'number' && !isNaN(result.normalizedPct)) {
        pct = result.normalizedPct;
      }

      totalPct += pct;
      validCount++;

      if (pct > bestPct) bestPct = pct;

      /* Count practice sets */
      if (result.type === 'practice') practiceN++;
    }

    summary.avgPercentage  = validCount > 0
      ? Math.round(totalPct / validCount * 10) / 10
      : 0;
    summary.bestPercentage = Math.round(bestPct * 10) / 10;
    summary.practiceSets   = practiceN;

    console.log('[App] Summary calculated:', summary);
    return summary;
  }

  /* ═══════════════════════════════════════════════════════
     3. renderSummaryCards
  ═══════════════════════════════════════════════════════ */

  /**
   * Update the 4 summary stat cards with calculated values.
   * @param {Object} summary  Result of calculateSummary()
   */
  function renderSummaryCards(summary) {
    console.log('[App] renderSummaryCards() called');

    if (!summary || typeof summary !== 'object') {
      console.warn('[App] renderSummaryCards: invalid summary object');
      return;
    }

    /* Total Attempted */
    var elTotal = getEl('totalAttempted', false);
    if (elTotal) {
      elTotal.textContent = bn(summary.totalAttempted || 0);
    }

    /* Average Score */
    var elAvg = getEl('avgScore', false);
    if (elAvg) {
      elAvg.textContent = bn(summary.avgPercentage || 0) + '%';
    }

    /* Best Score */
    var elBest = getEl('bestScore', false);
    if (elBest) {
      elBest.textContent = bn(summary.bestPercentage || 0) + '%';
    }

    /* Practice Sets */
    var elPractice = getEl('practiceSets', false);
    if (elPractice) {
      elPractice.textContent = bn(summary.practiceSets || 0);
    }

    console.log('[App] Summary cards rendered');
  }

  /* ═══════════════════════════════════════════════════════
     4. createResultCard — MOCK
  ═══════════════════════════════════════════════════════ */

  /**
   * Build HTML string for a mock test result card.
   * @param {Object} result
   * @returns {string}
   */
  function createMockCard(result) {
    var pct        = result.normalizedPct || 0;
    var pctDisplay = bn(parseFloat(pct).toFixed(2)) + '%';
    var scoreStr   = '';

    if (result.totalScore !== undefined && result.maxScore !== undefined) {
      scoreStr = bn(result.totalScore) + ' / ' + bn(result.maxScore);
    }

    /* Subject analysis chips */
    var subjectHtml = '';
    if (result.subjectAnalysis && typeof result.subjectAnalysis === 'object') {
      var subjects = Object.keys(result.subjectAnalysis);
      if (subjects.length > 0) {
        subjectHtml += '<div class="result-card__subjects">';
        for (var s = 0; s < subjects.length; s++) {
          var key  = subjects[s];
          var data = result.subjectAnalysis[key];
          if (!data) continue;

          var subName = (window.ResultsLoader && window.ResultsLoader.getSubjectName)
            ? window.ResultsLoader.getSubjectName(key)
            : key;

          var correct     = typeof data.correct     === 'number' ? data.correct     : 0;
          var wrong       = typeof data.wrong       === 'number' ? data.wrong       : 0;
          var unattempted = typeof data.unattempted === 'number' ? data.unattempted : 0;

          subjectHtml += '<span class="subject-chip">' +
            escHtml(subName) +
            ': <span class="subject-chip--correct">✓' + bn(correct) + '</span>' +
            ' <span class="subject-chip--wrong">✗' + bn(wrong) + '</span>' +
            ' —' + bn(unattempted) +
          '</span>';
        }
        subjectHtml += '</div>';
      }
    }

    /* Cat scores */
    var catHtml = '';
    if (result.cat1Score !== undefined || result.cat2Score !== undefined) {
      catHtml = '<span class="stat-pill stat-pill--correct">' +
        'বিভাগ ১: ' + bn(result.cat1Score || 0) +
      '</span>' +
      '<span class="stat-pill stat-pill--skip">' +
        'বিভাগ ২: ' + bn(result.cat2Score || 0) +
      '</span>';
    }

    return (
      '<div class="result-card result-card--mock" role="listitem">' +

        /* Badge */
        '<span class="result-card__badge result-card__badge--mock">' +
          svgMockIcon() +
          'মক টেস্ট' +
        '</span>' +

        /* Title */
        '<h3 class="result-card__title">' +
          escHtml(result.displayTitle || 'মক টেস্ট') +
        '</h3>' +

        /* Meta */
        '<div class="result-card__meta">' +
          '<span class="result-card__meta-item">' +
            svgCalIcon() +
            escHtml(result.displayDate || '') +
          '</span>' +
          (result.timeTaken
            ? '<span class="result-card__meta-item">' +
                svgClockIcon() +
                'সময়: ' + escHtml(result.timeTaken) +
              '</span>'
            : '') +
          (catHtml
            ? '<div class="result-card__stats">' + catHtml + '</div>'
            : '') +
        '</div>' +

        /* Score */
        '<div class="result-card__score">' +
          '<span class="result-card__percent">' + pctDisplay + '</span>' +
          (scoreStr
            ? '<span class="result-card__score-detail">নম্বর: ' + scoreStr + '</span>'
            : '') +
        '</div>' +

        /* Progress bar + subjects */
        '<div class="result-card__bar-wrap">' +
          '<div class="result-card__bar-label">' +
            '<span>অগ্রগতি</span>' +
            '<span>' + pctDisplay + '</span>' +
          '</div>' +
          '<div class="result-card__bar-track">' +
            '<div class="result-card__bar-fill" style="width:' +
              Math.min(100, Math.max(0, pct)) + '%">' +
            '</div>' +
          '</div>' +
        '</div>' +

        subjectHtml +

      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════
     4. createResultCard — PRACTICE
  ═══════════════════════════════════════════════════════ */

  /**
   * Build HTML string for a practice result card.
   * @param {Object} result
   * @returns {string}
   */
  function createPracticeCard(result) {
    var pct        = result.normalizedPct || 0;
    var pctDisplay = bn(parseFloat(pct).toFixed(2)) + '%';

    var correct     = typeof result.correct     === 'number' ? result.correct     : 0;
    var wrong       = typeof result.wrong       === 'number' ? result.wrong       : 0;
    var unattempted = typeof result.unattempted === 'number' ? result.unattempted : 0;

    var scoreStr = '';
    if (result.score !== undefined) {
      scoreStr = bn(result.score);
    }

    return (
      '<div class="result-card result-card--practice" role="listitem">' +

        /* Badge */
        '<span class="result-card__badge result-card__badge--practice">' +
          svgBookIcon() +
          'অনুশীলন' +
        '</span>' +

        /* Title */
        '<h3 class="result-card__title">' +
          escHtml(result.displayTitle || 'অনুশীলন') +
        '</h3>' +

        /* Meta */
        '<div class="result-card__meta">' +
          '<span class="result-card__meta-item">' +
            svgCalIcon() +
            escHtml(result.displayDate || '') +
          '</span>' +
          (result.timeTaken
            ? '<span class="result-card__meta-item">' +
                svgClockIcon() +
                'সময়: ' + escHtml(result.timeTaken) +
              '</span>'
            : '') +
        '</div>' +

        /* Score */
        '<div class="result-card__score">' +
          '<span class="result-card__percent">' + pctDisplay + '</span>' +
          (scoreStr
            ? '<span class="result-card__score-detail">নম্বর: ' + scoreStr + '</span>'
            : '') +
        '</div>' +

        /* Progress bar */
        '<div class="result-card__bar-wrap">' +
          '<div class="result-card__bar-label">' +
            '<span>সঠিক উত্তর</span>' +
            '<span>' + pctDisplay + '</span>' +
          '</div>' +
          '<div class="result-card__bar-track">' +
            '<div class="result-card__bar-fill" style="width:' +
              Math.min(100, Math.max(0, pct)) + '%">' +
            '</div>' +
          '</div>' +
        '</div>' +

        /* Stats pills */
        '<div class="result-card__subjects">' +
          '<span class="stat-pill stat-pill--correct">' +
            svgCheckIcon() + ' সঠিক: ' + bn(correct) +
          '</span>' +
          '<span class="stat-pill stat-pill--wrong">' +
            svgXIcon() + ' ভুল: ' + bn(wrong) +
          '</span>' +
          '<span class="stat-pill stat-pill--skip">' +
            '— বাদ: ' + bn(unattempted) +
          '</span>' +
        '</div>' +

      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════
     4. createResultCard — PYQ
  ═══════════════════════════════════════════════════════ */

  /**
   * Build HTML string for a PYQ result card.
   * @param {Object} result
   * @returns {string}
   */
  function createPYQCard(result) {
    var pct        = result.normalizedPct || 0;
    var pctDisplay = bn(parseFloat(pct).toFixed(2)) + '%';
    var scoreStr   = '';

    if (result.totalScore !== undefined && result.maxScore !== undefined) {
      scoreStr = bn(result.totalScore) + ' / ' + bn(result.maxScore);
    }

    return (
      '<div class="result-card result-card--pyq" role="listitem">' +

        /* Badge */
        '<span class="result-card__badge result-card__badge--pyq">' +
          svgArchiveIcon() +
          'পুরনো প্রশ্ন' +
        '</span>' +

        /* Title */
        '<h3 class="result-card__title">' +
          escHtml(result.displayTitle || 'পুরনো প্রশ্ন') +
        '</h3>' +

        /* Meta */
        '<div class="result-card__meta">' +
          '<span class="result-card__meta-item">' +
            svgCalIcon() +
            escHtml(result.displayDate || '') +
          '</span>' +
          (result.timeTaken
            ? '<span class="result-card__meta-item">' +
                svgClockIcon() +
                'সময়: ' + escHtml(result.timeTaken) +
              '</span>'
            : '') +
        '</div>' +

        /* Score */
        '<div class="result-card__score">' +
          '<span class="result-card__percent">' + pctDisplay + '</span>' +
          (scoreStr
            ? '<span class="result-card__score-detail">নম্বর: ' + scoreStr + '</span>'
            : '') +
        '</div>' +

        /* Progress bar */
        '<div class="result-card__bar-wrap">' +
          '<div class="result-card__bar-label">' +
            '<span>অগ্রগতি</span>' +
            '<span>' + pctDisplay + '</span>' +
          '</div>' +
          '<div class="result-card__bar-track">' +
            '<div class="result-card__bar-fill" style="width:' +
              Math.min(100, Math.max(0, pct)) + '%">' +
            '</div>' +
          '</div>' +
        '</div>' +

      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════
     4. createResultCard — DISPATCHER
  ═══════════════════════════════════════════════════════ */

  /**
   * Route to the correct card builder based on result.type.
   * Returns an empty string for unknown types.
   * @param {Object} result
   * @returns {string}
   */
  function createResultCard(result) {
    if (!result || typeof result !== 'object') {
      console.warn('[App] createResultCard: invalid result object');
      return '';
    }

    try {
      switch (result.type) {
        case 'mock':     return createMockCard(result);
        case 'practice': return createPracticeCard(result);
        case 'pyq':      return createPYQCard(result);
        default:
          console.warn('[App] createResultCard: unknown type:', result.type);
          return '';
      }
    } catch (err) {
      console.error('[App] createResultCard error:', err, result);
      return '';
    }
  }

  /* ═══════════════════════════════════════════════════════
     5. renderResultsList
  ═══════════════════════════════════════════════════════ */

  /**
   * Render the results list DOM.
   * Shows empty state when array is empty.
   * @param {Array}  results
   * @param {string} [filterType='all']
   */
  function renderResultsList(results, filterType) {
    console.log('[App] renderResultsList() — count:', results ? results.length : 0);

    var listEl     = getEl('resultsList',  false);
    var emptyEl    = getEl('emptyState',   false);

    if (!listEl) {
      console.error('[App] resultsList element not found');
      return;
    }

    var type = (typeof filterType === 'string') ? filterType : 'all';

    /* Update meta count */
    updateResultsMeta(
      Array.isArray(results) ? results.length : 0,
      type
    );

    /* Empty state */
    if (!Array.isArray(results) || results.length === 0) {
      /* Clear list but keep empty state node */
      listEl.innerHTML = '';

      if (emptyEl) {
        /* Re-insert empty state (it was removed on previous render) */
        listEl.appendChild(emptyEl);
        emptyEl.hidden = false;
      } else {
        /* Fallback inline empty state */
        listEl.innerHTML =
          '<div class="empty-state" role="status">' +
            '<div class="empty-state__icon">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" ' +
              'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
              'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
                '<circle cx="12" cy="12" r="10"></circle>' +
                '<line x1="12" y1="8" x2="12" y2="12"></line>' +
                '<line x1="12" y1="16" x2="12.01" y2="16"></line>' +
              '</svg>' +
            '</div>' +
            '<h2 class="empty-state__title">কোনো ফলাফল নেই</h2>' +
            '<p class="empty-state__subtitle">পরীক্ষা দিন এবং এখানে ফলাফল দেখুন</p>' +
          '</div>';
      }

      console.log('[App] Empty state shown');
      return;
    }

    /* Build HTML for all cards */
    var html = '';
    for (var i = 0; i < results.length; i++) {
      var cardHtml = createResultCard(results[i]);
      if (cardHtml) html += cardHtml;
    }

    /* Replace list contents */
    listEl.innerHTML = html;

    /* Hide empty state if it was stored separately */
    if (emptyEl) emptyEl.hidden = true;

    /* Animate bars after render (RAF for paint) */
    requestAnimationFrame(function () {
      animateBars(listEl);
    });

    console.log('[App] Results list rendered with', results.length, 'cards');
  }

  /* ═══════════════════════════════════════════════════════
     UTILITY: Animate progress bars
  ═══════════════════════════════════════════════════════ */

  /**
   * Trigger CSS transition on progress bars by briefly
   * setting width to 0 then restoring the target width.
   * @param {HTMLElement} container
   */
  function animateBars(container) {
    if (!container) return;
    try {
      var fills = container.querySelectorAll('.result-card__bar-fill');
      for (var i = 0; i < fills.length; i++) {
        var fill = fills[i];
        if (!fill) continue;
        var target = fill.style.width;
        fill.style.transition = 'none';
        fill.style.width = '0%';
        /* Force reflow */
        void fill.offsetWidth;
        fill.style.transition = 'width 0.7s ease';
        fill.style.width = target;
      }
    } catch (err) {
      console.warn('[App] animateBars error:', err);
    }
  }

  /* ═══════════════════════════════════════════════════════
     6. handleClearAll
  ═══════════════════════════════════════════════════════ */

  /**
   * Show the confirmation modal for clearing all data.
   */
  function handleClearAll() {
    console.log('[App] handleClearAll() — showing confirmation modal');
    var modal = getEl('confirmModal', false);
    if (modal) {
      modal.hidden = false;
      /* Focus first button for accessibility */
      var cancelBtn = getEl('btnCancelClear', false);
      if (cancelBtn) {
        setTimeout(function () { cancelBtn.focus(); }, 50);
      }
    }
  }

  /**
   * Execute the actual clear after confirmation.
   */
  function executeClearAll() {
    console.log('[App] executeClearAll() — clearing data');

    var success = false;

    if (window.ResultsLoader && typeof window.ResultsLoader.clearAllResults === 'function') {
      success = window.ResultsLoader.clearAllResults();
    } else {
      /* Fallback: clear manually */
      try {
        localStorage.removeItem('mock_results');
        localStorage.removeItem('practice_results');
        localStorage.removeItem('pyq_results');
        success = true;
      } catch (err) {
        console.error('[App] Manual clear failed:', err);
      }
    }

    /* Close modal */
    var modal = getEl('confirmModal', false);
    if (modal) modal.hidden = true;

    if (success) {
      /* Reset state */
      _allResults     = [];
      _currentResults = [];

      /* Reset filter UI */
      if (window.ResultsFilter && typeof window.ResultsFilter.resetFilter === 'function') {
        window.ResultsFilter.resetFilter();
      }
      if (window.ResultsFilter && typeof window.ResultsFilter.updateResultsReference === 'function') {
        window.ResultsFilter.updateResultsReference([]);
      }

      /* Re-render */
      renderSummaryCards(calculateSummary([]));
      renderResultsList([], 'all');

      showToast('সব ফলাফল মুছে ফেলা হয়েছে');
      console.log('[App] All results cleared and UI updated');
    } else {
      showToast('মুছতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 3500);
      console.error('[App] Clear failed');
    }
  }

  /* ═══════════════════════════════════════════════════════
     SETUP: Clear Button & Modal
  ═══════════════════════════════════════════════════════ */

  /**
   * Attach event listeners to clear button and modal buttons.
   */
  function setupClearButton() {
    /* Open modal */
    var btnClear = getEl('btnClearAll', false);
    if (btnClear) {
      btnClear.addEventListener('click', function (e) {
        e.preventDefault();
        handleClearAll();
      });
      console.log('[App] Clear button listener attached');
    }

    /* Cancel — close modal */
    var btnCancel = getEl('btnCancelClear', false);
    if (btnCancel) {
      btnCancel.addEventListener('click', function () {
        var modal = getEl('confirmModal', false);
        if (modal) modal.hidden = true;
        console.log('[App] Clear cancelled');
      });
    }

    /* Confirm — execute clear */
    var btnConfirm = getEl('btnConfirmClear', false);
    if (btnConfirm) {
      btnConfirm.addEventListener('click', function () {
        executeClearAll();
      });
    }

    /* Close modal on overlay click */
    var modal = getEl('confirmModal', false);
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) {
          modal.hidden = true;
          console.log('[App] Modal closed via overlay click');
        }
      });
    }

    /* Close modal on Escape key */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var m = getEl('confirmModal', false);
        if (m && !m.hidden) {
          m.hidden = true;
          console.log('[App] Modal closed via Escape');
        }
      }
    });

    console.log('[App] setupClearButton complete');
  }

  /* ═══════════════════════════════════════════════════════
     SETUP: Filter Change Handler
  ═══════════════════════════════════════════════════════ */

  /**
   * Callback passed to ResultsFilter.setupFilterButtons().
   * Called whenever user clicks a filter button.
   * @param {Array}  filtered
   * @param {string} filterType
   */
  function onFilterChange(filtered, filterType) {
    console.log('[App] Filter changed:', filterType, '→', filtered.length, 'results');
    _currentResults = Array.isArray(filtered) ? filtered : [];
    renderResultsList(_currentResults, filterType);
  }

  /* ═══════════════════════════════════════════════════════
     MAIN: initializeApp
  ═══════════════════════════════════════════════════════ */

  /**
   * Entry point — called on DOMContentLoaded.
   * Orchestrates all setup in correct order.
   */
  function initializeApp() {
    console.log('[App] ═══════════════════════════════════');
    console.log('[App] Results Dashboard initializing...');
    console.log('[App] ═══════════════════════════════════');

    /* ── Step 1: Check required modules ── */
    if (!window.ResultsLoader) {
      console.error('[App] FATAL: ResultsLoader not loaded');
      showToast('পেজ লোডে সমস্যা হয়েছে। রিফ্রেশ করুন।', 5000);
      return;
    }
    if (!window.ResultsFilter) {
      console.error('[App] FATAL: ResultsFilter not loaded');
      return;
    }
    if (!window.ResultsPrint) {
      console.warn('[App] ResultsPrint not loaded — print disabled');
    }

    /* ── Step 2: Load data ── */
    _allResults = loadAllResults();

    /* ── Step 3: Calculate summary ── */
    var summary = calculateSummary(_allResults);

    /* ── Step 4: Render summary cards ── */
    renderSummaryCards(summary);

    /* ── Step 5: Render full results list ── */
    _currentResults = _allResults.slice();
    renderResultsList(_currentResults, 'all');

    /* ── Step 6: Setup filter buttons ── */
    if (window.ResultsFilter && typeof window.ResultsFilter.setupFilterButtons === 'function') {
      window.ResultsFilter.setupFilterButtons(_allResults, onFilterChange);
    }

    /* ── Step 7: Setup clear button & modal ── */
    setupClearButton();

    /* ── Step 8: Setup print button ── */
    if (window.ResultsPrint && typeof window.ResultsPrint.setupPrintButton === 'function') {
      window.ResultsPrint.setupPrintButton();
    }

    console.log('[App] ═══════════════════════════════════');
    console.log('[App] Initialization complete ✓');
    console.log('[App] Total results:', _allResults.length);
    console.log('[App] ═══════════════════════════════════');
  }

  /* ═══════════════════════════════════════════════════════
     INLINE SVG ICON HELPERS
     (kept here to avoid global namespace pollution)
  ═══════════════════════════════════════════════════════ */

  function svgMockIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" ' +
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" style="flex-shrink:0">' +
        '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 ' +
          '18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2">' +
        '</polygon>' +
      '</svg>';
  }

  function svgBookIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" ' +
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" style="flex-shrink:0">' +
        '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>' +
        '<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>' +
      '</svg>';
  }

  function svgArchiveIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" ' +
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" style="flex-shrink:0">' +
        '<polyline points="21 8 21 21 3 21 3 8"></polyline>' +
        '<rect x="1" y="3" width="22" height="5"></rect>' +
        '<line x1="10" y1="12" x2="14" y2="12"></line>' +
      '</svg>';
  }

  function svgCalIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" ' +
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" style="flex-shrink:0">' +
        '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>' +
        '<line x1="16" y1="2" x2="16" y2="6"></line>' +
        '<line x1="8"  y1="2" x2="8"  y2="6"></line>' +
        '<line x1="3"  y1="10" x2="21" y2="10"></line>' +
      '</svg>';
  }

  function svgClockIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" ' +
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" style="flex-shrink:0">' +
        '<circle cx="12" cy="12" r="10"></circle>' +
        '<polyline points="12 6 12 12 16 14"></polyline>' +
      '</svg>';
  }

  function svgCheckIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" ' +
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="3" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" style="flex-shrink:0">' +
        '<polyline points="20 6 9 17 4 12"></polyline>' +
      '</svg>';
  }

  function svgXIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" ' +
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="3" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" style="flex-shrink:0">' +
        '<line x1="18" y1="6" x2="6" y2="18"></line>' +
        '<line x1="6"  y1="6" x2="18" y2="18"></line>' +
      '</svg>';
  }

  /* ═══════════════════════════════════════════════════════
     DOM READY — BOOT
  ═══════════════════════════════════════════════════════ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    /* DOM already ready (script loaded late) */
    initializeApp();
  }

  /* ═══════════════════════════════════════════════════════
     EXPOSE LIMITED PUBLIC API
  ═══════════════════════════════════════════════════════ */
  window.ResultsApp = {
    reload: function () {
      console.log('[App] Manual reload triggered');
      _allResults = loadAllResults();
      renderSummaryCards(calculateSummary(_allResults));
      if (window.ResultsFilter && typeof window.ResultsFilter.updateResultsReference === 'function') {
        window.ResultsFilter.updateResultsReference(_allResults);
      }
      renderResultsList(_allResults, 'all');
    }
  };

  console.log('[App] results-app.js parsed');

})();