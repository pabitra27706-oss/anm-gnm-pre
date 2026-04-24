/**
 * results-filter.js
 * PURPOSE : Filter the merged results array by type,
 *           manage filter button active states,
 *           and notify the app when filter changes.
 * PATTERN : IIFE → exposes ResultsFilter to window
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════
     INTERNAL STATE
  ═══════════════════════════════════════════════════════ */
  var _currentFilter  = 'all';   /* active filter key        */
  var _allResults     = [];      /* reference to full array  */
  var _onChangeCallback = null;  /* called after filter change */

  /* ═══════════════════════════════════════════════════════
     PUBLIC: filterResults
  ═══════════════════════════════════════════════════════ */

  /**
   * Filter an array of tagged results by type.
   *
   * @param {Array}  allResults  Full merged results array
   * @param {string} type        'all' | 'mock' | 'practice' | 'pyq'
   * @returns {Array}            Filtered array
   */
  function filterResults(allResults, type) {
    /* Guard: ensure input is always array */
    if (!Array.isArray(allResults)) {
      console.warn('[Filter] filterResults: input is not an array');
      return [];
    }

    var filterType = (typeof type === 'string') ? type.trim().toLowerCase() : 'all';

    if (filterType === 'all' || filterType === '') {
      console.log('[Filter] Showing all results:', allResults.length);
      return allResults.slice(); /* return copy */
    }

    var filtered = allResults.filter(function (result) {
      if (!result || typeof result.type !== 'string') return false;
      return result.type === filterType;
    });

    console.log('[Filter] Filter "' + filterType + '" → ' + filtered.length + ' results');
    return filtered;
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: updateActiveFilter
  ═══════════════════════════════════════════════════════ */

  /**
   * Toggle active CSS class and aria-pressed on filter buttons.
   * Deactivates all buttons first, then activates the clicked one.
   *
   * @param {HTMLElement} activeBtn  The button that was clicked
   */
  function updateActiveFilter(activeBtn) {
    if (!activeBtn) {
      console.warn('[Filter] updateActiveFilter: no button provided');
      return;
    }

    /* Find filter bar container */
    var filterBar = document.getElementById('filterBar');
    if (!filterBar) {
      console.warn('[Filter] filterBar element not found in DOM');
      return;
    }

    /* Reset all buttons */
    var allBtns = filterBar.querySelectorAll('.filter-btn');
    if (allBtns && allBtns.length > 0) {
      for (var i = 0; i < allBtns.length; i++) {
        var btn = allBtns[i];
        if (btn) {
          btn.classList.remove('filter-btn--active');
          btn.setAttribute('aria-pressed', 'false');
        }
      }
    }

    /* Activate clicked button */
    activeBtn.classList.add('filter-btn--active');
    activeBtn.setAttribute('aria-pressed', 'true');

    console.log('[Filter] Active filter button updated to:',
      activeBtn.getAttribute('data-filter'));
  }

  /* ═══════════════════════════════════════════════════════
     INTERNAL: handleFilterClick
  ═══════════════════════════════════════════════════════ */

  /**
   * Handle click on a filter button.
   * Updates state, toggles active UI, calls callback.
   *
   * @param {Event}       e    Click event
   * @param {HTMLElement} btn  The clicked button
   */
  function handleFilterClick(e, btn) {
    if (e) e.preventDefault();
    if (!btn) return;

    var filterType = btn.getAttribute('data-filter');
    if (!filterType) {
      console.warn('[Filter] Button has no data-filter attribute:', btn);
      return;
    }

    /* Skip if same filter already active */
    if (filterType === _currentFilter) {
      console.log('[Filter] Same filter clicked, no change:', filterType);
      return;
    }

    _currentFilter = filterType;
    console.log('[Filter] Filter changed to:', _currentFilter);

    /* Update active UI */
    updateActiveFilter(btn);

    /* Get filtered results */
    var filtered = filterResults(_allResults, _currentFilter);

    /* Notify app */
    if (typeof _onChangeCallback === 'function') {
      _onChangeCallback(filtered, _currentFilter);
    } else {
      console.warn('[Filter] No onChange callback registered');
    }
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: setupFilterButtons
  ═══════════════════════════════════════════════════════ */

  /**
   * Attach click listeners to all filter buttons.
   * Stores reference to allResults for filtering.
   * Calls onChangeFn(filteredArray, filterType) on each change.
   *
   * @param {Array}    allResults   Full merged results array
   * @param {Function} onChangeFn   Callback: (filtered, type) => void
   */
  function setupFilterButtons(allResults, onChangeFn) {
    /* Validate inputs */
    if (!Array.isArray(allResults)) {
      console.error('[Filter] setupFilterButtons: allResults must be an array');
      return;
    }
    if (typeof onChangeFn !== 'function') {
      console.error('[Filter] setupFilterButtons: onChangeFn must be a function');
      return;
    }

    /* Store references */
    _allResults       = allResults;
    _onChangeCallback = onChangeFn;
    _currentFilter    = 'all';

    /* Find filter bar */
    var filterBar = document.getElementById('filterBar');
    if (!filterBar) {
      console.error('[Filter] filterBar element not found — cannot setup buttons');
      return;
    }

    /* Find all filter buttons */
    var btns = filterBar.querySelectorAll('.filter-btn');
    if (!btns || btns.length === 0) {
      console.warn('[Filter] No filter buttons found in filterBar');
      return;
    }

    console.log('[Filter] Setting up', btns.length, 'filter buttons');

    /* Attach listeners */
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        if (!btn) return;

        /* Remove any previous listener by cloning */
        var freshBtn = btn.cloneNode(true);
        if (btn.parentNode) {
          btn.parentNode.replaceChild(freshBtn, btn);
        }

        freshBtn.addEventListener('click', function (e) {
          handleFilterClick(e, freshBtn);
        });

        /* Keyboard: Enter / Space */
        freshBtn.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleFilterClick(e, freshBtn);
          }
        });

      })(btns[i]);
    }

    /* Set initial active state to 'all' */
    var filterBarFresh = document.getElementById('filterBar');
    if (filterBarFresh) {
      var allBtn = filterBarFresh.querySelector('[data-filter="all"]');
      if (allBtn) {
        updateActiveFilter(allBtn);
      }
    }

    console.log('[Filter] Filter buttons setup complete');
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: getCurrentFilter
  ═══════════════════════════════════════════════════════ */

  /**
   * Get the currently active filter type.
   * @returns {string}
   */
  function getCurrentFilter() {
    return _currentFilter;
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: resetFilter
  ═══════════════════════════════════════════════════════ */

  /**
   * Reset filter to 'all' and update UI.
   * Useful after clearing data.
   */
  function resetFilter() {
    _currentFilter = 'all';

    var filterBar = document.getElementById('filterBar');
    if (!filterBar) return;

    var allBtn = filterBar.querySelector('[data-filter="all"]');
    if (allBtn) {
      updateActiveFilter(allBtn);
      console.log('[Filter] Filter reset to all');
    }
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: updateResultsReference
  ═══════════════════════════════════════════════════════ */

  /**
   * Update the internal results array reference.
   * Called when results are cleared or reloaded.
   * @param {Array} newResults
   */
  function updateResultsReference(newResults) {
    if (!Array.isArray(newResults)) {
      console.warn('[Filter] updateResultsReference: not an array');
      _allResults = [];
      return;
    }
    _allResults = newResults;
    console.log('[Filter] Results reference updated:', _allResults.length, 'items');
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: getFilterLabel
  ═══════════════════════════════════════════════════════ */

  /**
   * Get Bengali label for a filter type.
   * @param {string} type
   * @returns {string}
   */
  function getFilterLabel(type) {
    var labels = {
      'all':      'সব',
      'mock':     'মক টেস্ট',
      'practice': 'অনুশীলন',
      'pyq':      'পুরনো প্রশ্ন'
    };
    return labels[type] || type || 'সব';
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC: getTypeBadgeLabel
  ═══════════════════════════════════════════════════════ */

  /**
   * Get short Bengali badge label for a result type.
   * Used on result cards.
   * @param {string} type
   * @returns {string}
   */
  function getTypeBadgeLabel(type) {
    var labels = {
      'mock':     'মক টেস্ট',
      'practice': 'অনুশীলন',
      'pyq':      'পুরনো প্রশ্ন'
    };
    return labels[type] || 'অজানা';
  }

  /* ═══════════════════════════════════════════════════════
     EXPOSE TO WINDOW
  ═══════════════════════════════════════════════════════ */
  window.ResultsFilter = {
    filterResults:           filterResults,
    setupFilterButtons:      setupFilterButtons,
    updateActiveFilter:      updateActiveFilter,
    getCurrentFilter:        getCurrentFilter,
    resetFilter:             resetFilter,
    updateResultsReference:  updateResultsReference,
    getFilterLabel:          getFilterLabel,
    getTypeBadgeLabel:       getTypeBadgeLabel
  };

  console.log('[Filter] ResultsFilter ready');

})();