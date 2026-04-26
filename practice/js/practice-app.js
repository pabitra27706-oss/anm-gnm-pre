/* ============================================================
   practice/js/practice-app.js
   Subject loader, modal handler, navigation
   WB ANM GNM 2026 Preparation Platform

   UPDATED FOR NEW JSON FORMAT:
   - Reads new manifest.json structure with 6 subjects
   - Subject keys: life-science, general-science,
     arithmetic-mathematics, reasoning-general-knowledge,
     general-knowledge, english-grammar
   - Uses QuizStorage.getSubjectProgress() for stats
   - Handles varying set counts per subject
   - Set URLs padded to 2 digits
   - Updated SVG icons for new subjects
   ============================================================ */

(function PracticeApp() {
  'use strict';

  // Check dependency
  if (typeof QuizStorage === 'undefined') {
    console.error('[PracticeApp] QuizStorage not loaded! Add quiz-storage.js before this file in HTML.');
  }

  const MANIFEST_PATH = 'data/manifest.json';

  let manifest        = null;
  let activeSubjectId = null;

  let elGrid;
  let elLoading;
  let elError;
  let elStats;
  let elStatCompleted;
  let elStatTotal;
  let elStatBest;
  let elStatTotalSets;
  let elStatTotalQuestions;
  let elOverlay;
  let elModalIcon;
  let elModalTitle;
  let elModalSubtitle;
  let elSetGrid;
  let elProgressText;
  let elProgressFill;
  let elProgressBarWrap;
  let elCloseBtn;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    resolveDOM();
    bindGlobalEvents();
    loadManifest();
  }

  function resolveDOM() {
    elGrid               = document.getElementById('subject-grid');
    elLoading            = document.getElementById('loading-state');
    elError              = document.getElementById('error-state');
    elStats              = document.getElementById('overall-stats');
    elStatCompleted      = document.getElementById('stat-completed');
    elStatTotal          = document.getElementById('stat-total');
    elStatBest           = document.getElementById('stat-best');
    elStatTotalSets      = document.getElementById('stat-total-sets');
    elStatTotalQuestions = document.getElementById('stat-total-questions');
    elOverlay            = document.getElementById('modal-overlay');
    elModalIcon          = document.getElementById('modal-icon');
    elModalTitle         = document.getElementById('modal-title');
    elModalSubtitle      = document.getElementById('modal-subtitle');
    elSetGrid            = document.getElementById('set-grid');
    elProgressText       = document.getElementById('modal-progress-text');
    elProgressFill       = document.getElementById('modal-progress-fill');
    elProgressBarWrap    = document.getElementById('modal-progress-bar-wrap');
    elCloseBtn           = document.getElementById('modal-close-btn');
  }

  async function loadManifest() {
    showLoading(true);
    try {
      const response = await fetch(MANIFEST_PATH);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data || !data.subjects || typeof data.subjects !== 'object') {
        throw new Error('ম্যানিফেস্ট ফরম্যাট সঠিক নয়।');
      }
      manifest = data;
      showLoading(false);
      renderSubjects(manifest.subjects);
      renderOverallStats(manifest);
    } catch (err) {
      console.error('[PracticeApp] Manifest load failed:', err);
      showLoading(false);
      showError(true);
    }
  }

  function renderSubjects(subjects) {
    if (!elGrid) return;
    const fragment = document.createDocumentFragment();

    Object.entries(subjects).forEach(([id, data]) => {
      let progress = { completedCount: 0, totalSets: data.sets || 0, progressPct: 0, bestScore: null, lastPlayed: null };
      try {
        if (typeof QuizStorage !== 'undefined') {
          progress = QuizStorage.getSubjectProgress(id, data.sets);
        }
      } catch (e) {
        console.warn('[PracticeApp] getSubjectProgress failed for', id, e);
      }
      const card = buildSubjectCard(id, data, progress);
      fragment.appendChild(card);
    });

    elGrid.appendChild(fragment);
    elGrid.removeAttribute('hidden');
  }

  function buildSubjectCard(id, data, progress) {
    if (!data) return document.createElement('div');

    const total = data.sets || 0;
    const done  = progress.completedCount || 0;
    const pct   = progress.progressPct    || 0;

    const card = document.createElement('article');
    card.className = 'subject-card';
    card.tabIndex  = 0;
    card.role      = 'button';
    card.style.setProperty('--card-color', data.color || '#6366f1');
    card.style.setProperty('--card-color-light', data.colorLight || `${data.color}15`);
    card.setAttribute('aria-label', `${data.name} — ${done}/${total} সেট সম্পন্ন। সেট বেছে নিতে ক্লিক করুন।`);
    card.dataset.subjectId = id;

    const iconMap = {
      'life-science':                'microscope',
      'general-science':             'atom',
      'arithmetic-mathematics':      'calculator',
      'reasoning-general-knowledge': 'brain',
      'general-knowledge':           'globe',
      'english-grammar':             'book',
    };
    const iconName = iconMap[id] || 'book';

    card.innerHTML = `
      <div class="subject-card__top">
        <div class="subject-card__icon" aria-hidden="true">
          ${getSubjectSVG(iconName, data.color)}
        </div>
        <div class="subject-card__names">
          <span class="subject-card__name-bn">${data.name}</span>
          <span class="subject-card__name-en">${data.english}</span>
        </div>
      </div>
      <div class="subject-card__meta">
        <div class="subject-card__sets">
          <span class="subject-card__sets-count">${toBn(total)}</span>
          <span>&nbsp;টি সেট উপলব্ধ</span>
        </div>
        ${done > 0 ? `<span class="subject-card__completed-badge" aria-label="${done}টি সম্পন্ন">✓ ${toBn(done)} সম্পন্ন</span>` : ''}
      </div>
      <div class="subject-card__progress-wrap">
        <div class="subject-card__progress-label">
          <span>অগ্রগতি</span>
          <span>${toBn(Math.round(pct))}%</span>
        </div>
        <div class="subject-card__progress-bar" role="progressbar" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${total}" aria-label="${data.name} অগ্রগতি">
          <div class="subject-card__progress-fill" style="width: ${pct}%"></div>
        </div>
      </div>
      <div class="subject-card__cta" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        সেট শুরু করুন
      </div>
    `;

    card.addEventListener('click', () => showSetModal(id, data));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showSetModal(id, data);
      }
    });

    return card;
  }

  function showSetModal(subjectId, data) {
    if (!elOverlay || !data) return;
    activeSubjectId = subjectId;

    let progress = { completedCount: 0, progressPct: 0 };
    try {
      if (typeof QuizStorage !== 'undefined') {
        progress = QuizStorage.getSubjectProgress(subjectId, data.sets);
      }
    } catch (e) {}

    const total = data.sets || 0;
    const done  = progress.completedCount || 0;
    const pct   = progress.progressPct    || 0;

    elOverlay.style.setProperty('--modal-color', data.color || '#6366f1');
    elOverlay.style.setProperty('--modal-color-light', data.colorLight || `${data.color}15`);

    if (elModalIcon) {
      elModalIcon.style.background = data.colorLight || `${data.color}15`;
      const iconMap = {
        'life-science': 'microscope', 'general-science': 'atom',
        'arithmetic-mathematics': 'calculator', 'reasoning-general-knowledge': 'brain',
        'general-knowledge': 'globe', 'english-grammar': 'book',
      };
      elModalIcon.innerHTML = getSubjectSVG(iconMap[subjectId] || 'book', data.color);
    }

    if (elModalTitle) elModalTitle.textContent = data.name;
    if (elModalSubtitle) elModalSubtitle.textContent = `${data.english} — সেট নির্বাচন করুন`;
    if (elProgressText) elProgressText.textContent = `${toBn(done)}/${toBn(total)} সম্পন্ন`;
    if (elProgressFill) elProgressFill.style.width = `${pct}%`;
    if (elProgressBarWrap) {
      elProgressBarWrap.setAttribute('aria-valuenow', done);
      elProgressBarWrap.setAttribute('aria-valuemax', total);
    }

    buildSetButtons(subjectId, data);
    elOverlay.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      if (!elSetGrid) return;
      const firstBtn = elSetGrid.querySelector('.set-btn');
      if (firstBtn) firstBtn.focus();
    });
  }

  function buildSetButtons(subjectId, data) {
    if (!elSetGrid || !data) return;
    elSetGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const total = data.sets || 0;

    for (let i = 1; i <= total; i++) {
      const setNum = String(i).padStart(2, '0');
      let isDone = false;
      let bestScore = null;
      try {
        if (typeof QuizStorage !== 'undefined') {
          isDone = QuizStorage.isSetCompleted(subjectId, i);
          if (isDone) bestScore = QuizStorage.getBestScore(subjectId, setNum);
        }
      } catch (e) {}

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `set-btn${isDone ? ' set-btn--completed' : ''}`;
      btn.setAttribute('aria-label', `সেট ${i}${isDone ? ' — সম্পন্ন' : ''}`);
      btn.dataset.set = setNum;

      btn.innerHTML = `
        <span class="set-btn__number">${toBn(i)}</span>
        <span class="set-btn__label">সেট</span>
        ${isDone ? `<span class="set-btn__check" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>` : ''}
        ${bestScore !== null ? `<span class="set-btn__score" title="সেরা স্কোর">${toBn(parseFloat(bestScore).toFixed(1))}</span>` : ''}
      `;

      btn.addEventListener('click', () => { navigateToQuiz(subjectId, setNum); });
      btn.addEventListener('keydown', (e) => { handleSetGridKeyNav(e, total); });
      fragment.appendChild(btn);
    }

    elSetGrid.appendChild(fragment);
  }

  function handleSetGridKeyNav(e, total) {
    if (!elSetGrid) return;
    const buttons = Array.from(elSetGrid.querySelectorAll('.set-btn'));
    const idx = buttons.indexOf(document.activeElement);
    if (idx === -1) return;
    const cols = 5;
    let next = -1;
    switch (e.key) {
      case 'ArrowRight': next = Math.min(idx + 1, total - 1); break;
      case 'ArrowLeft':  next = Math.max(idx - 1, 0); break;
      case 'ArrowDown':  next = Math.min(idx + cols, total - 1); break;
      case 'ArrowUp':    next = Math.max(idx - cols, 0); break;
      default: return;
    }
    e.preventDefault();
    if (buttons[next]) buttons[next].focus();
  }

  function navigateToQuiz(subjectId, setNum) {
    const url = `quiz.html?subject=${encodeURIComponent(subjectId)}&set=${setNum}`;
    window.location.href = url;
  }

  function bindGlobalEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#modal-close-btn')) closeModal();
    });
    document.addEventListener('click', (e) => {
      if (e.target === elOverlay || e.target.classList.contains('modal-overlay')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elOverlay && !elOverlay.hidden) closeModal();
    });
  }

  function closeModal() {
    if (!elOverlay) return;
    elOverlay.setAttribute('hidden', '');
    document.body.style.overflow = '';
    if (activeSubjectId) {
      const card = document.querySelector(`[data-subject-id="${activeSubjectId}"]`);
      if (card) card.focus();
    }
    activeSubjectId = null;
  }

  function renderOverallStats(manifest) {
    if (!elStats) return;

    let totalDone = 0;
    try {
      if (typeof QuizStorage !== 'undefined') {
        const completed = QuizStorage.getCompletionStatus();
        if (completed && typeof completed === 'object') {
          Object.values(completed).forEach(arr => {
            if (Array.isArray(arr)) totalDone += arr.length;
          });
        }
      }
    } catch (e) {}

    let bestScore = null;
    try {
      if (typeof QuizStorage !== 'undefined') {
        const stats = QuizStorage.getStatistics();
        bestScore = stats.bestScore || null;
      }
    } catch (e) {}

    if (elStatCompleted) elStatCompleted.textContent = toBn(totalDone);
    if (elStatTotal) elStatTotal.textContent = toBn(manifest.totalFiles || 467);
    if (elStatBest) elStatBest.textContent = bestScore !== null ? toBn(parseFloat(bestScore).toFixed(2)) : '—';
    if (elStatTotalSets) elStatTotalSets.textContent = toBn(manifest.totalFiles || 467);
    if (elStatTotalQuestions) {
      const total = manifest.totalQuestions || 15410;
      const formatted = total.toLocaleString('en-US');
      elStatTotalQuestions.textContent = toBn(formatted);
    }

    elStats.removeAttribute('hidden');
  }

  function showLoading(visible) {
    if (!elLoading) return;
    if (visible) elLoading.removeAttribute('hidden');
    else elLoading.setAttribute('hidden', '');
  }

  function showError(visible) {
    if (!elError) return;
    if (visible) elError.removeAttribute('hidden');
    else elError.setAttribute('hidden', '');
  }

  function toBn(num) {
    const map = { '0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯', ',':',', '.':'.' };
    return String(num).replace(/[0-9,.]/g, d => map[d] || d);
  }

  function getSubjectSVG(iconName, color) {
    const c = color || '#6366f1';
    const icons = {
      microscope: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h8"/><path d="M3 21h18"/><path d="M14 21v-4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4"/><path d="M10 3v4"/><path d="M8 3h4"/><path d="M14 7a4 4 0 0 1 0 6"/><circle cx="10" cy="10" r="4"/></svg>`,
      atom: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9C11.17 3.77 5.84 1.75 3.8 3.8c-2.04 2.03-.02 7.36 4.5 11.9 4.53 4.53 9.86 6.55 11.9 4.5z"/><path d="M3.8 20.2c2.04 2.05 7.37.03 11.9-4.5 4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.53 4.53-6.55 9.86-4.5 11.9z"/></svg>`,
      calculator: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/><line x1="16" y1="18" x2="16" y2="18"/></svg>`,
      globe: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
      brain: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></svg>`,
      book: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
    };
    return icons[iconName] || icons['book'];
  }

})();