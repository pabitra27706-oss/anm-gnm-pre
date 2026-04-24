/* ═══════════════════════════════════════════════════════════════
   PYQ-APP.JS
   Purpose : Load manifest and render year cards on pyq/index.html
   Author  : WB ANM GNM 2026 Preparation Platform
   Depends : pyq/data/manifest.json
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────
   NAMESPACE  — avoid global pollution
───────────────────────────────────────── */
const PYQApp = (() => {

  /* ── Private state ── */
  let _manifest   = null;   // cached manifest data
  let _retryCount = 0;      // how many times we have retried
  const MAX_RETRY = 3;

  /* ── DOM references (resolved after DOMContentLoaded) ── */
  let _els = {};

  /* ─────────────────────────────────────────
     BENGALI NUMBER CONVERTER
     Converts ASCII digits → Bengali digits
  ───────────────────────────────────────── */
  function toBengaliNumber(num) {
    const bengaliDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    return String(num)
      .split('')
      .map(ch => (/\d/.test(ch) ? bengaliDigits[parseInt(ch, 10)] : ch))
      .join('');
  }

  /* ─────────────────────────────────────────
     SUBJECT LABEL MAP
     Maps subject IDs → Bengali display names
  ───────────────────────────────────────── */
  const SUBJECT_LABELS = {
    'life-science'    : 'জীবন বিজ্ঞান',
    'physical-science': 'ভৌত বিজ্ঞান',
    'mathematics'     : 'গণিত',
    'english'         : 'ইংরেজি',
    'general-knowledge': 'সাধারণ জ্ঞান',
    'logical-reasoning': 'যুক্তিবিদ্যা',
  };

  /* ─────────────────────────────────────────
     UI HELPERS
  ───────────────────────────────────────── */

  /** Show loading, hide grid and error */
  function showLoading() {
    _els.loadingState.classList.remove('hidden');
    _els.errorState.classList.add('hidden');
    _els.cardsGrid.classList.add('hidden');
  }

  /** Show error panel with a message */
  function showError(message) {
    _els.loadingState.classList.add('hidden');
    _els.cardsGrid.classList.add('hidden');
    _els.errorState.classList.remove('hidden');
    _els.errorMessage.textContent = message ||
      'প্রশ্নপত্র লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।';
  }

  /** Show cards grid, hide loading and error */
  function showGrid() {
    _els.loadingState.classList.add('hidden');
    _els.errorState.classList.add('hidden');
    _els.cardsGrid.classList.remove('hidden');
  }

  /* ─────────────────────────────────────────
     LOAD MANIFEST
     Fetches pyq/data/manifest.json
     Retries up to MAX_RETRY times on failure
  ───────────────────────────────────────── */
  async function loadManifest() {
    showLoading();

    try {
      /* Use cache-busting only in development if needed */
      const url = 'data/manifest.json';
      const response = await fetch(url, {
        method:  'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(
          `সার্ভার ত্রুটি: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      /* Validate structure */
      if (!data || !Array.isArray(data.papers) || data.papers.length === 0) {
        throw new Error('ম্যানিফেস্ট ফাইলে কোনো প্রশ্নপত্র পাওয়া যায়নি।');
      }

      _manifest   = data;
      _retryCount = 0; // reset on success

      renderYearCards(data.papers);

    } catch (err) {
      console.error('[PYQApp] Manifest load error:', err);

      _retryCount++;

      const retryMsg = _retryCount < MAX_RETRY
        ? ` (চেষ্টা ${toBengaliNumber(_retryCount)}/${toBengaliNumber(MAX_RETRY)})`
        : ' — অনুগ্রহ করে পেজ রিলোড করুন।';

      showError(
        (err.message || 'অজানা ত্রুটি') + retryMsg
      );
    }
  }

  /* ─────────────────────────────────────────
     RENDER YEAR CARDS
     Creates card elements for each paper
     and inserts them into the grid
  ───────────────────────────────────────── */
  function renderYearCards(papers) {
    /* Clear previous content */
    _els.cardsGrid.innerHTML = '';

    if (papers.length === 0) {
      showError('কোনো প্রশ্নপত্র পাওয়া যায়নি।');
      return;
    }

    /* Build a document fragment for performance */
    const fragment = document.createDocumentFragment();

    papers.forEach((paper, index) => {
      const card = createYearCard(paper, index);
      fragment.appendChild(card);
    });

    _els.cardsGrid.appendChild(fragment);

    /* Stagger animation — add class with delay per card */
    const cards = _els.cardsGrid.querySelectorAll('.year-card');
    cards.forEach((card, i) => {
      card.style.animationDelay = `${i * 60}ms`;
      card.classList.add('year-card--animate-in');
    });

    showGrid();
  }

  /* ─────────────────────────────────────────
     CREATE YEAR CARD ELEMENT
     Builds a single card DOM node for a paper
  ───────────────────────────────────────── */
  function createYearCard(paper, index) {
    const card = document.createElement('div');
    card.className   = 'year-card';
    card.role        = 'listitem';
    card.tabIndex    = 0;
    card.dataset.paperId = paper.id;
    card.setAttribute('aria-label',
      `${paper.title} — ${toBengaliNumber(paper.totalQuestions)}টি প্রশ্ন`
    );

    /* ── Click and keyboard navigation ── */
    card.addEventListener('click', () => handleCardClick(paper.id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCardClick(paper.id);
      }
    });

    /* ── Build inner HTML ── */
    card.innerHTML = `
      <!-- Icon row -->
      <div class="year-card__icon-row">
        <div class="year-card__icon-wrap" aria-hidden="true">
          ${CALENDAR_SVG}
        </div>
        <span class="year-card__arrow" aria-hidden="true">
          ${ARROW_RIGHT_SVG}
        </span>
      </div>

      <!-- Year title -->
      <h3 class="year-card__title">${escapeHTML(paper.title)}</h3>

      <!-- Meta badges -->
      <div class="year-card__meta">
        <span class="year-card__badge year-card__badge--total">
          ${QUESTION_SVG_SM}
          ${toBengaliNumber(paper.totalQuestions)} প্রশ্ন
        </span>
        <span class="year-card__badge year-card__badge--cat1">
          ক্যাট-১: ${toBengaliNumber(paper.cat1)}
        </span>
        <span class="year-card__badge year-card__badge--cat2">
          ক্যাট-২: ${toBengaliNumber(paper.cat2)}
        </span>
      </div>

      <!-- CTA -->
      <div class="year-card__cta" aria-hidden="true">
        <span>অনুশীলন শুরু করুন</span>
        ${ARROW_RIGHT_SVG}
      </div>
    `;

    return card;
  }

  /* ─────────────────────────────────────────
     HANDLE CARD CLICK
     Navigates to viewer.html with paper ID
  ───────────────────────────────────────── */
  function handleCardClick(paperId) {
    if (!paperId) return;

    /* Small visual feedback before navigation */
    const card = _els.cardsGrid
      .querySelector(`[data-paper-id="${paperId}"]`);

    if (card) {
      card.style.transform = 'scale(0.97)';
      card.style.opacity   = '0.8';
    }

    /* Navigate after brief delay for visual feel */
    setTimeout(() => {
      window.location.href = `viewer.html?paper=${encodeURIComponent(paperId)}`;
    }, 120);
  }

  /* ─────────────────────────────────────────
     PUBLIC: RETRY LOAD
     Called by the retry button in HTML
  ───────────────────────────────────────── */
  function retryLoad() {
    if (_retryCount >= MAX_RETRY) {
      /* Hard reload on max retries exceeded */
      window.location.reload();
      return;
    }
    loadManifest();
  }

  /* ─────────────────────────────────────────
     SVG ICON CONSTANTS
     Inline SVGs used in cards
  ───────────────────────────────────────── */
  const CALENDAR_SVG = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8"  y1="2" x2="8"  y2="6"></line>
      <line x1="3"  y1="10" x2="21" y2="10"></line>
    </svg>`;

  const ARROW_RIGHT_SVG = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2.5"
         stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>`;

  const QUESTION_SVG_SM = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2.5"
         stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>`;

  /* ─────────────────────────────────────────
     SECURITY: HTML ESCAPE
  ───────────────────────────────────────── */
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  /* ─────────────────────────────────────────
     INJECT CARD ANIMATION CSS
     (keeps all animation logic in JS)
  ───────────────────────────────────────── */
  function injectAnimationStyles() {
    if (document.getElementById('pyq-card-anim')) return;

    const style = document.createElement('style');
    style.id = 'pyq-card-anim';
    style.textContent = `
      .year-card--animate-in {
        animation: card-fade-up 0.4s ease both;
      }
      @keyframes card-fade-up {
        from {
          opacity:   0;
          transform: translateY(16px);
        }
        to {
          opacity:   1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /* ─────────────────────────────────────────
     INIT
     Entry point — called on DOMContentLoaded
  ───────────────────────────────────────── */
  function init() {
    /* Resolve DOM references */
    _els = {
      loadingState : document.getElementById('loading-state'),
      errorState   : document.getElementById('error-state'),
      errorMessage : document.getElementById('error-message'),
      cardsGrid    : document.getElementById('year-cards-grid'),
    };

    /* Guard: make sure required elements exist */
    if (!_els.loadingState || !_els.cardsGrid) {
      console.error('[PYQApp] Required DOM elements not found.');
      return;
    }

    injectAnimationStyles();
    loadManifest();
  }

  /* ─────────────────────────────────────────
     BOOTSTRAP
  ───────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    /* DOM already ready (script deferred or at bottom) */
    init();
  }

  /* ── Expose only what HTML needs ── */
  return {
    retryLoad,
  };

})();