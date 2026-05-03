/* ============================================================
   MOCK-APP.JS
   WB ANM GNM 2026 - Mock Test Index Page Controller
   Handles: manifest loading, card rendering, navigation
   ============================================================ */

(function () {
  'use strict';

  /* ── Configuration ─────────────────────────────────────── */
  const CONFIG = {
    manifestPath: './data/manifest.json',
    testPagePath: './test.html',
    storageKey:   'mock_results'
  };

  /* ── State ─────────────────────────────────────────────── */
  let mockTests      = [];   // array from manifest.json
  let attemptHistory = {};   // { mockId: [ resultObj, ... ] }

  /* ── Difficulty Labels ─────────────────────────────────── */
  const DIFFICULTY_LABELS = {
    easy:   'সহজ',
    medium: 'মধ্যম',
    hard:   'কঠিন'
  };

  const DIFFICULTY_COLORS = {
    easy:   '#4caf50',
    medium: '#ff9800',
    hard:   '#f44336'
  };

  /* ══════════════════════════════════════════════════════════
     ENTRY POINT
  ══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    console.log('MockApp: DOM ready — starting initialization');
    initializeApp();
  });

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */
  async function initializeApp() {
    console.log('MockApp: initializeApp()');

    try {
      showLoadingState(true);
      setupHeaderListeners();

      await loadManifest();
      loadAttemptHistory();
      renderMockCards();

    } catch (error) {
      console.error('MockApp: initializeApp failed —', error);
      showError('অ্যাপ শুরু করতে সমস্যা হয়েছে: ' + error.message);
    } finally {
      showLoadingState(false);
    }
  }

  /* ══════════════════════════════════════════════════════════
     LOAD MANIFEST
  ══════════════════════════════════════════════════════════ */
  async function loadManifest() {
    console.log('MockApp: loadManifest() — fetching', CONFIG.manifestPath);

    let response;

    try {
      response = await fetch(CONFIG.manifestPath);
    } catch (networkError) {
      console.error('MockApp: Network error fetching manifest —', networkError);
      throw new Error('নেটওয়ার্ক সমস্যা। ইন্টারনেট সংযোগ পরীক্ষা করুন।');
    }

    if (!response.ok) {
      throw new Error(
        'manifest.json লোড হয়নি (HTTP ' + response.status + ')'
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('MockApp: JSON parse error —', parseError);
      throw new Error('manifest.json ফাইলটি সঠিক JSON ফরম্যাটে নেই।');
    }

    /* Validate structure */
    if (!data || typeof data !== 'object') {
      throw new Error('manifest.json এর ডেটা বৈধ নয়।');
    }

    if (!Array.isArray(data.mocks)) {
      throw new Error('manifest.json এ mocks অ্যারে পাওয়া যায়নি।');
    }

    if (data.mocks.length === 0) {
      throw new Error('manifest.json এ কোনো পরীক্ষা নেই।');
    }

    mockTests = data.mocks;
    console.log('MockApp: Manifest loaded —', mockTests.length, 'tests found');
  }

  /* ══════════════════════════════════════════════════════════
     LOAD ATTEMPT HISTORY FROM LOCALSTORAGE
  ══════════════════════════════════════════════════════════ */
  function loadAttemptHistory() {
    console.log('MockApp: loadAttemptHistory()');

    try {
      const stored = localStorage.getItem(CONFIG.storageKey);

      if (!stored) {
        console.log('MockApp: No attempt history found');
        return;
      }

      let results;
      try {
        results = JSON.parse(stored);
      } catch (parseError) {
        console.warn('MockApp: Corrupt attempt history — resetting', parseError);
        localStorage.removeItem(CONFIG.storageKey);
        return;
      }

      if (!Array.isArray(results)) {
        console.warn('MockApp: Attempt history is not an array — skipping');
        return;
      }

      /* Build a map: mockId → array of results */
      attemptHistory = {};

      results.forEach(function (result, index) {
        if (!result || typeof result !== 'object') {
          console.warn('MockApp: Invalid result at index', index, '— skipping');
          return;
        }

        if (!result.mockId) {
          console.warn('MockApp: Result missing mockId at index', index);
          return;
        }

        const id = String(result.mockId);
        if (!attemptHistory[id]) {
          attemptHistory[id] = [];
        }
        attemptHistory[id].push(result);
      });

      console.log(
        'MockApp: Attempt history loaded —',
        Object.keys(attemptHistory).length,
        'mocks have attempts'
      );

    } catch (error) {
      console.error('MockApp: loadAttemptHistory error —', error);
      attemptHistory = {};
    }
  }

  /* ══════════════════════════════════════════════════════════
     RENDER MOCK CARDS
  ══════════════════════════════════════════════════════════ */
  function renderMockCards() {
    console.log('MockApp: renderMockCards()');

    const mockList = document.getElementById('mockList');
    if (!mockList) {
      console.error('MockApp: #mockList element not found in DOM');
      return;
    }

    /* Clear container */
    mockList.innerHTML = '';

    if (mockTests.length === 0) {
      mockList.innerHTML =
        '<p class="empty-state">কোনো পরীক্ষা উপলব্ধ নেই।</p>';
      return;
    }

    /* Create a document fragment for performance */
    const fragment = document.createDocumentFragment();

    mockTests.forEach(function (mock) {
      if (!mock || !mock.id) {
        console.warn('MockApp: Skipping invalid mock entry —', mock);
        return;
      }

      try {
        const card = buildMockCard(mock);
        fragment.appendChild(card);
      } catch (cardError) {
        console.error(
          'MockApp: Error building card for mock', mock.id, '—', cardError
        );
      }
    });

    mockList.appendChild(fragment);
    console.log('MockApp: Cards rendered —', mockTests.length, 'cards');
  }

  /* ══════════════════════════════════════════════════════════
     BUILD SINGLE MOCK CARD ELEMENT
  ══════════════════════════════════════════════════════════ */
  function buildMockCard(mock) {
    const mockId   = String(mock.id);
    const attempts = attemptHistory[mockId] || [];
    const hasAttempt = attempts.length > 0;

    /* Find best score among all attempts */
    let bestAttempt = null;
    if (hasAttempt) {
      bestAttempt = attempts.reduce(function (best, curr) {
        if (!best) return curr;
        const currScore = (curr && typeof curr.totalScore === 'number')
          ? curr.totalScore : 0;
        const bestScore = (best && typeof best.totalScore === 'number')
          ? best.totalScore : 0;
        return currScore > bestScore ? curr : best;
      }, null);
    }

    /* Card wrapper */
    const card = document.createElement('div');
    card.className = 'mock-card' + (hasAttempt ? ' completed' : '');
    card.setAttribute('data-mock-id', mockId);

    /* ── Card Header ── */
    const header = document.createElement('div');
    header.className = 'mock-card-header';

    const iconDiv = document.createElement('div');
    iconDiv.className = 'mock-card-icon';
    iconDiv.setAttribute('aria-hidden', 'true');
    iconDiv.innerHTML = getMockIcon(parseInt(mockId, 10));

    const titleGroup = document.createElement('div');

    const titleEl = document.createElement('h3');
    titleEl.textContent = mock.title || ('মক টেস্ট ' + mockId);

    const diffEl = document.createElement('div');
    diffEl.className = 'difficulty-badge';

    const diffKey = mock.difficulty || 'medium';
    const diffLabel = DIFFICULTY_LABELS[diffKey] || diffKey;
    const diffColor = DIFFICULTY_COLORS[diffKey] || '#ff9800';

    diffEl.innerHTML =
      '<span style="display:inline-block;width:8px;height:8px;' +
      'border-radius:50%;background:' + diffColor + ';margin-right:5px;' +
      'vertical-align:middle;"></span>' + diffLabel;

    titleGroup.appendChild(titleEl);
    titleGroup.appendChild(diffEl);

    header.appendChild(iconDiv);
    header.appendChild(titleGroup);
    card.appendChild(header);

    /* ── Status Badge ── */
    const badge = document.createElement('div');
    badge.className = 'status-badge ' + (hasAttempt ? 'completed' : 'new');
    badge.textContent = hasAttempt
      ? (attempts.length + ' বার চেষ্টা করা হয়েছে')
      : 'নতুন';
    card.appendChild(badge);

    /* ── Stats Row ── */
    const statsRow = document.createElement('div');
    statsRow.className = 'mock-card-stats';

    statsRow.appendChild(
      buildStatBox('প্রশ্ন', '১০০')
    );
    statsRow.appendChild(
      buildStatBox('সময়', '৯০ মিনিট')
    );
    statsRow.appendChild(
      buildStatBox('নম্বর', '১১৫')
    );

    card.appendChild(statsRow);

    /* ── Best Score Row (if attempted) ── */
    if (bestAttempt && typeof bestAttempt.totalScore === 'number') {
      const scoreRow = document.createElement('div');
      scoreRow.className = 'best-score-row';

      const scoreLabel = document.createElement('span');
      scoreLabel.className = 'best-score-label';
      scoreLabel.textContent = 'সর্বোচ্চ স্কোর';

      const scoreValue = document.createElement('span');
      scoreValue.className = 'best-score-value';
      scoreValue.textContent =
        bestAttempt.totalScore.toFixed(2) + ' / 115';

      scoreRow.appendChild(scoreLabel);
      scoreRow.appendChild(scoreValue);
      card.appendChild(scoreRow);

      /* Last attempt date */
      if (bestAttempt.date) {
        try {
          const dateStr = new Date(bestAttempt.date).toLocaleDateString(
            'bn-IN',
            { day: 'numeric', month: 'short', year: 'numeric' }
          );
          const dateEl = document.createElement('p');
          dateEl.style.cssText =
            'font-size:12px;color:#9e9e9e;margin-bottom:10px;';
          dateEl.textContent = 'সর্বশেষ: ' + dateStr;
          card.appendChild(dateEl);
        } catch (dateError) {
          console.warn('MockApp: Date formatting error —', dateError);
        }
      }
    }

    /* ── Action Buttons ── */
    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:8px;margin-top:auto;';

    /* Start / Retry button */
    const startBtn = document.createElement('button');
    startBtn.className = 'start-btn';
    startBtn.textContent = hasAttempt ? 'আবার চেষ্টা করুন' : 'শুরু করুন';
    startBtn.setAttribute(
      'aria-label',
      (hasAttempt ? 'আবার চেষ্টা করুন: ' : 'শুরু করুন: ') +
        (mock.title || 'মক টেস্ট ' + mockId)
    );

    /* Capture mockId in closure */
    (function (id) {
      startBtn.addEventListener('click', function () {
        startMockTest(id);
      });
    }(mockId));

    btnGroup.appendChild(startBtn);

    /* View Result button (if attempted) */
    if (hasAttempt) {
      const resultBtn = document.createElement('button');
      resultBtn.className = 'start-btn';
      resultBtn.style.cssText =
        'background:#1976d2;flex:0 0 auto;width:auto;padding:13px 14px;';
      resultBtn.title = 'ফলাফল দেখুন';
      resultBtn.setAttribute('aria-label', 'ফলাফল দেখুন');
      resultBtn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"' +
        ' stroke="currentColor" stroke-width="2.5">' +
        '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
        '<circle cx="12" cy="12" r="3"/></svg>';

      (function (id) {
        resultBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          window.location.href = './result.html?mock=' + id;
        });
      }(mockId));

      btnGroup.appendChild(resultBtn);
    }

    card.appendChild(btnGroup);

    return card;
  }

  /* ── Stat Box Helper ───────────────────────────────────── */
  function buildStatBox(label, value) {
    const box = document.createElement('div');
    box.className = 'mock-stat';

    const lbl = document.createElement('span');
    lbl.className = 'mock-stat-label';
    lbl.textContent = label;

    const val = document.createElement('span');
    val.className = 'mock-stat-value';
    val.textContent = value;

    box.appendChild(lbl);
    box.appendChild(val);
    return box;
  }

  /* ── Mock Icon SVG by number ───────────────────────────── */
  function getMockIcon(num) {
    const colors = [
      '#e91e63','#9c27b0','#3f51b5','#2196f3','#00bcd4',
      '#009688','#4caf50','#ff9800','#ff5722','#607d8b'
    ];
    const color  = colors[(num - 1) % colors.length] || '#e91e63';
    const label  = String(num).padStart(2, '0');

    return (
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"' +
      ' stroke="' + color + '" stroke-width="2">' +
      '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
      '<line x1="3" y1="9" x2="21" y2="9"/>' +
      '<line x1="3" y1="15" x2="21" y2="15"/>' +
      '<line x1="9" y1="3" x2="9" y2="21"/>' +
      '</svg>'
    );
  }

  /* ══════════════════════════════════════════════════════════
     NAVIGATE TO TEST PAGE
  ══════════════════════════════════════════════════════════ */
  function startMockTest(mockId) {
    console.log('MockApp: startMockTest() —', mockId);

    if (!mockId) {
      console.error('MockApp: startMockTest called with no mockId');
      showError('পরীক্ষার ID পাওয়া যায়নি।');
      return;
    }

    /* Verify this mock exists in our list */
    const mockExists = mockTests.some(function (m) {
      return m && String(m.id) === String(mockId);
    });

    if (!mockExists) {
      console.error('MockApp: Mock ID not found in manifest —', mockId);
      showError('এই পরীক্ষাটি পাওয়া যায়নি।');
      return;
    }

    const url = CONFIG.testPagePath + '?mock=' + encodeURIComponent(mockId);
    console.log('MockApp: Navigating to —', url);
    window.location.href = url;
  }

  /* ══════════════════════════════════════════════════════════
     UI HELPERS
  ══════════════════════════════════════════════════════════ */
  function showLoadingState(show) {
    const loadingEl = document.getElementById('loadingState');
    if (!loadingEl) return;
    loadingEl.style.display = show ? 'flex' : 'none';
  }

  function showError(message) {
    console.error('MockApp: showError —', message);

    const container = document.getElementById('errorContainer');
    const msgEl     = document.getElementById('errorMessage');

    if (container) {
      container.classList.remove('hidden');
    } else {
      console.error('MockApp: #errorContainer not found');
    }

    if (msgEl) {
      msgEl.textContent = message || 'একটি সমস্যা হয়েছে।';
    } else {
      console.error('MockApp: #errorMessage not found');
    }
  }

  /* ══════════════════════════════════════════════════════════
     HEADER EVENT LISTENERS
  ══════════════════════════════════════════════════════════ */
  function setupHeaderListeners() {
    const backBtn = document.getElementById('backBtn');

    if (backBtn) {
      backBtn.addEventListener('click', function () {
        console.log('MockApp: Back button clicked');
        window.location.href = '/';
      });
    } else {
      console.warn('MockApp: #backBtn not found');
    }
  }

}());