/* ============================================================
   practice/js/practice-app.js
   Subject loader, modal handler, navigation
   WB ANM GNM 2026 Preparation Platform
   ============================================================ */

(function PracticeApp() {
  'use strict';

  /* ── Constants ── */
  const MANIFEST_PATH     = 'data/manifest.json';
  const STORAGE_COMPLETED = 'practice_completed';
  const STORAGE_RESULTS   = 'practice_results';

  /* ── State ── */
  let manifest        = null;
  let activeSubjectId = null;

  /* ── DOM refs (resolved after DOMContentLoaded) ── */
  let elGrid;
  let elLoading;
  let elError;
  let elStats;
  let elOverlay;
  let elModalIcon;
  let elModalTitle;
  let elModalSubtitle;
  let elSetGrid;
  let elProgressText;
  let elProgressFill;
  let elProgressBarWrap;
  let elCloseBtn;

  /* ============================================================
     INIT
     ============================================================ */
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    resolveDOM();
    bindGlobalEvents();
    loadManifest();
  }

  /* Resolve all DOM references once */
  function resolveDOM() {
    elGrid             = document.getElementById('subject-grid');
    elLoading          = document.getElementById('loading-state');
    elError            = document.getElementById('error-state');
    elStats            = document.getElementById('overall-stats');
    elOverlay          = document.getElementById('modal-overlay');
    elModalIcon        = document.getElementById('modal-icon');
    elModalTitle       = document.getElementById('modal-title');
    elModalSubtitle    = document.getElementById('modal-subtitle');
    elSetGrid          = document.getElementById('set-grid');
    elProgressText     = document.getElementById('modal-progress-text');
    elProgressFill     = document.getElementById('modal-progress-fill');
    elProgressBarWrap  = document.getElementById('modal-progress-bar-wrap');
    elCloseBtn         = document.getElementById('modal-close-btn');
  }

  /* ============================================================
     MANIFEST LOADER
     ============================================================ */
  async function loadManifest() {
    showLoading(true);

    try {
      const response = await fetch(MANIFEST_PATH);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      manifest = await response.json();
      showLoading(false);
      renderSubjects(manifest.subjects);
      renderOverallStats(manifest.subjects);

    } catch (err) {
      console.error('[PracticeApp] Manifest load failed:', err);
      showLoading(false);
      showError(true);
    }
  }

  /* ============================================================
     RENDER SUBJECTS
     ============================================================ */
  function renderSubjects(subjects) {
    const completed = getCompletionStatus();
    const fragment  = document.createDocumentFragment();

    Object.entries(subjects).forEach(([id, data]) => {
      const completedSets = completed[id] || [];
      const card = buildSubjectCard(id, data, completedSets);
      fragment.appendChild(card);
    });

    elGrid.appendChild(fragment);
    elGrid.removeAttribute('hidden');
  }

  /* Build one subject card element */
  function buildSubjectCard(id, data, completedSets) {
    const total      = data.totalSets;
    const done       = completedSets.length;
    const pct        = total > 0 ? Math.round((done / total) * 100) : 0;

    const card = document.createElement('article');
    card.className    = 'subject-card';
    card.tabIndex     = 0;
    card.role         = 'button';
    card.style.setProperty('--card-color',       data.color);
    card.style.setProperty('--card-color-light',  data.colorLight);
    card.setAttribute('aria-label',
      `${data.name} — ${done}/${total} সেট সম্পন্ন। সেট বেছে নিতে ক্লিক করুন।`
    );
    card.dataset.subjectId = id;

    card.innerHTML = `
      <div class="subject-card__top">
        <div class="subject-card__icon" aria-hidden="true">
          ${getSubjectSVG(data.icon, data.color)}
        </div>
        <div class="subject-card__names">
          <span class="subject-card__name-bn">${data.name}</span>
          <span class="subject-card__name-en">${data.english}</span>
        </div>
      </div>

      <div class="subject-card__meta">
        <div class="subject-card__sets">
          <span class="subject-card__sets-count">${total}</span>
          <span>&nbsp;টি সেট উপলব্ধ</span>
        </div>
        ${done > 0
          ? `<span class="subject-card__completed-badge"
               aria-label="${done}টি সম্পন্ন">
               ✓ ${done} সম্পন্ন
             </span>`
          : ''
        }
      </div>

      <div class="subject-card__progress-wrap">
        <div class="subject-card__progress-label">
          <span>অগ্রগতি</span>
          <span>${pct}%</span>
        </div>
        <div class="subject-card__progress-bar"
             role="progressbar"
             aria-valuenow="${done}"
             aria-valuemin="0"
             aria-valuemax="${total}"
             aria-label="${data.name} অগ্রগতি">
          <div class="subject-card__progress-fill"
               style="width: ${pct}%"></div>
        </div>
      </div>

      <div class="subject-card__cta" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        সেট শুরু করুন
      </div>
    `;

    /* Events */
    card.addEventListener('click',   () => showSetModal(id, data));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showSetModal(id, data);
      }
    });

    return card;
  }

  /* ============================================================
     SET SELECTION MODAL
     ============================================================ */
  function showSetModal(subjectId, data) {
    activeSubjectId = subjectId;

    const completedSets = (getCompletionStatus()[subjectId] || []);
    const total         = data.totalSets;
    const done          = completedSets.length;
    const pct           = total > 0 ? Math.round((done / total) * 100) : 0;

    /* Set modal color vars */
    elOverlay.style.setProperty('--modal-color',       data.color);
    elOverlay.style.setProperty('--modal-color-light',  data.colorLight);

    /* Fill header */
    elModalIcon.style.background = data.colorLight;
    elModalIcon.innerHTML        = getSubjectSVG(data.icon, data.color);
    elModalTitle.textContent     = data.name;
    elModalSubtitle.textContent  = `${data.english} — সেট নির্বাচন করুন`;

    /* Progress */
    elProgressText.textContent               = `${done}/${total} সম্পন্ন`;
    elProgressFill.style.width               = `${pct}%`;
    elProgressBarWrap.setAttribute('aria-valuenow', done);
    elProgressBarWrap.setAttribute('aria-valuemax', total);

    /* Build set buttons */
    buildSetButtons(subjectId, data, completedSets);

    /* Show overlay */
    elOverlay.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';

    /* Focus first set button for accessibility */
    requestAnimationFrame(() => {
      const firstBtn = elSetGrid.querySelector('.set-btn');
      if (firstBtn) firstBtn.focus();
    });
  }

  function buildSetButtons(subjectId, data, completedSets) {
    elSetGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (let i = 1; i <= data.totalSets; i++) {
      const setNum    = String(i).padStart(2, '0');
      const isDone    = completedSets.includes(i);
      const btnLabel  = `সেট ${i}${isDone ? ' — সম্পন্ন' : ''}`;

      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = `set-btn${isDone ? ' set-btn--completed' : ''}`;
      btn.setAttribute('aria-label', btnLabel);
      btn.dataset.set = setNum;

      /* Get best score for this set if completed */
      const bestScore = isDone ? getBestScore(subjectId, i) : null;

      btn.innerHTML = `
        <span class="set-btn__number">${i}</span>
        <span class="set-btn__label">সেট</span>
        ${isDone
          ? `<span class="set-btn__check" aria-hidden="true">
               <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="3.5"
                 stroke-linecap="round" stroke-linejoin="round">
                 <polyline points="20 6 9 17 4 12"></polyline>
               </svg>
             </span>`
          : ''
        }
        ${bestScore !== null
          ? `<span class="set-btn__score" title="সেরা স্কোর">${bestScore}</span>`
          : ''
        }
      `;

      btn.addEventListener('click', () => {
        navigateToQuiz(subjectId, setNum);
      });

      btn.addEventListener('keydown', (e) => {
        handleSetGridKeyNav(e, data.totalSets);
      });

      fragment.appendChild(btn);
    }

    elSetGrid.appendChild(fragment);
  }

  /* Arrow-key navigation within set grid */
  function handleSetGridKeyNav(e, total) {
    const buttons = Array.from(elSetGrid.querySelectorAll('.set-btn'));
    const idx     = buttons.indexOf(document.activeElement);
    if (idx === -1) return;

    const cols = 5; // 5 columns
    let next   = -1;

    switch (e.key) {
      case 'ArrowRight': next = Math.min(idx + 1, total - 1);      break;
      case 'ArrowLeft':  next = Math.max(idx - 1, 0);              break;
      case 'ArrowDown':  next = Math.min(idx + cols, total - 1);   break;
      case 'ArrowUp':    next = Math.max(idx - cols, 0);           break;
      default: return;
    }

    e.preventDefault();
    buttons[next].focus();
  }

  /* Navigate to quiz page */
  function navigateToQuiz(subjectId, setNum) {
    const url = `quiz.html?subject=${encodeURIComponent(subjectId)}&set=${setNum}`;
    window.location.href = url;
  }

  /* ============================================================
     MODAL — CLOSE
     ============================================================ */
  function bindGlobalEvents() {
    /* Close button */
    document.addEventListener('click', (e) => {
      if (e.target.closest('#modal-close-btn')) {
        closeModal();
      }
    });

    /* Click outside modal box */
    document.addEventListener('click', (e) => {
      if (
        e.target === elOverlay ||
        e.target.classList.contains('modal-overlay')
      ) {
        closeModal();
      }
    });

    /* Escape key */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elOverlay && !elOverlay.hidden) {
        closeModal();
      }
    });
  }

  function closeModal() {
    if (!elOverlay) return;
    elOverlay.setAttribute('hidden', '');
    document.body.style.overflow = '';

    /* Return focus to the card that opened the modal */
    if (activeSubjectId) {
      const card = document.querySelector(
        `[data-subject-id="${activeSubjectId}"]`
      );
      if (card) card.focus();
    }
    activeSubjectId = null;
  }

  /* ============================================================
     OVERALL STATS
     ============================================================ */
  function renderOverallStats(subjects) {
    const completed  = getCompletionStatus();
    const results    = JSON.parse(
      localStorage.getItem(STORAGE_RESULTS) || '[]'
    );

    /* Count total completed sets across all subjects */
    let totalDone = 0;
    Object.values(completed).forEach(arr => {
      totalDone += (arr || []).length;
    });

    /* Best score ever */
    let bestScore = null;
    if (results.length > 0) {
      const scores = results.map(r => parseFloat(r.score) || 0);
      bestScore    = Math.max(...scores).toFixed(2);
    }

    const elCompleted = document.getElementById('stat-completed');
    const elBest      = document.getElementById('stat-best');

    if (elCompleted) {
      elCompleted.textContent = toBengaliNumerals(totalDone);
    }
    if (elBest) {
      elBest.textContent = bestScore !== null
        ? toBengaliNumerals(bestScore)
        : '—';
    }

    elStats.removeAttribute('hidden');
  }

  /* ============================================================
     LOCAL STORAGE HELPERS
     ============================================================ */

  /* Returns { "life-science": [1,3,5], ... } */
  function getCompletionStatus() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_COMPLETED) || '{}');
    } catch {
      return {};
    }
  }

  /* Returns best score for a specific subject+set */
  function getBestScore(subjectId, setNum) {
    try {
      const results = JSON.parse(
        localStorage.getItem(STORAGE_RESULTS) || '[]'
      );
      const matching = results.filter(
        r => r.subject === subjectId && parseInt(r.set) === setNum
      );
      if (matching.length === 0) return null;
      const best = Math.max(...matching.map(r => parseFloat(r.score) || 0));
      return best.toFixed(1);
    } catch {
      return null;
    }
  }

  /* ============================================================
     UI STATE HELPERS
     ============================================================ */
  function showLoading(visible) {
    if (!elLoading) return;
    if (visible) {
      elLoading.removeAttribute('hidden');
    } else {
      elLoading.setAttribute('hidden', '');
    }
  }

  function showError(visible) {
    if (!elError) return;
    if (visible) {
      elError.removeAttribute('hidden');
    } else {
      elError.setAttribute('hidden', '');
    }
  }

  /* ============================================================
     BENGALI NUMERALS CONVERTER
     ============================================================ */
  function toBengaliNumerals(num) {
    const map = {
      '0':'০','1':'১','2':'২','3':'৩','4':'৪',
      '5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'
    };
    return String(num).replace(/[0-9]/g, d => map[d] || d);
  }

  /* ============================================================
     INLINE SVG ICONS (subject-specific)
     ============================================================ */
  function getSubjectSVG(iconName, color) {
    const c = color || '#6366f1';
    const icons = {

      /* Microscope — Life Science */
      microscope: `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="${c}" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true">
          <path d="M6 18h8"/>
          <path d="M3 21h18"/>
          <path d="M14 21v-4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4"/>
          <path d="M10 3v4"/>
          <path d="M8 3h4"/>
          <path d="M14 7a4 4 0 0 1 0 6"/>
          <circle cx="10" cy="10" r="4"/>
        </svg>`,

      /* Atom — Physical Science */
      atom: `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="${c}" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true">
          <circle cx="12" cy="12" r="1"/>
          <path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9C11.17 3.77
                   5.84 1.75 3.8 3.8c-2.04 2.03-.02 7.36 4.5 11.9
                   4.53 4.53 9.86 6.55 11.9 4.5z"/>
          <path d="M3.8 20.2c2.04 2.05 7.37.03 11.9-4.5
                   4.52-4.54 6.54-9.87 4.5-11.9
                   -2.03-2.04-7.36-.02-11.9 4.5
                   -4.53 4.53-6.55 9.86-4.5 11.9z"/>
        </svg>`,

      /* Calculator — Mathematics */
      calculator: `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="${c}" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2"/>
          <line x1="8"  y1="6"  x2="16" y2="6"/>
          <line x1="8"  y1="10" x2="8"  y2="10"/>
          <line x1="12" y1="10" x2="12" y2="10"/>
          <line x1="16" y1="10" x2="16" y2="10"/>
          <line x1="8"  y1="14" x2="8"  y2="14"/>
          <line x1="12" y1="14" x2="12" y2="14"/>
          <line x1="16" y1="14" x2="16" y2="14"/>
          <line x1="8"  y1="18" x2="12" y2="18"/>
          <line x1="16" y1="18" x2="16" y2="18"/>
        </svg>`,

      /* Globe — General Knowledge */
      globe: `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="${c}" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2"  y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10
                   15.3 15.3 0 0 1-4 10
                   15.3 15.3 0 0 1-4-10
                   15.3 15.3 0 0 1 4-10z"/>
        </svg>`,

      /* Brain / Puzzle — Logical Reasoning */
      brain: `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="${c}" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true">
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0
                   0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08
                   3 3 0 0 1-.34-5.58 2.5 2.5 0 0
                   1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5
                   2.5 0 0 1 9.5 2z"/>
          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5
                   0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08
                   3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24
                   2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/>
        </svg>`,

      /* Book — Basic English */
      book: `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="${c}" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4
                   19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          <line x1="8"  y1="7"  x2="16" y2="7"/>
          <line x1="8"  y1="11" x2="14" y2="11"/>
        </svg>`,
    };

    return icons[iconName] || icons['book'];
  }

})();