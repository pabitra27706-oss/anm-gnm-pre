/* ============================================================
   practice/js/quiz-print.js
   Print result handler for result.html
   WB ANM GNM 2026 Preparation Platform
   ============================================================ */

const QuizPrint = (function () {
  'use strict';

  /* ── Elements to hide during print (handled via CSS too) ── */
  const HIDE_SELECTORS = [
    '.action-buttons',
    '.review-filters',
    '.print-btn',
    '#back-to-practice',
    '.result-header',
  ];

  /* ── Track print state ── */
  let isPrinting = false;

  /* ============================================================
     PRINT BEFORE / AFTER HOOKS
     ============================================================ */
  window.onbeforeprint = function () {
    isPrinting = true;
    document.body.classList.add('printing');
    prepareForPrint();
  };

  window.onafterprint = function () {
    isPrinting = false;
    document.body.classList.remove('printing');
    restoreAfterPrint();
  };

  /* ============================================================
     PREPARE FOR PRINT
     ============================================================ */
  function prepareForPrint() {
    /* 1. Expand all review items (remove any collapsed state) */
    const allItems = document.querySelectorAll('.review-item');
    allItems.forEach(item => {
      item.style.display = 'block';
    });

    /* 2. Ensure all filter views show — reset to 'all' */
    const reviewList = document.getElementById('review-list');
    if (reviewList) {
      /* Show all hidden items */
      const hiddenItems = reviewList.querySelectorAll('[hidden]');
      hiddenItems.forEach(item => {
        item.dataset.wasHidden = 'true';
        item.removeAttribute('hidden');
      });
    }

    /* 3. Add print-specific title block */
    injectPrintTitle();

    /* 4. Force chart bars to their final width */
    forceChartWidths();
  }

  /* ============================================================
     RESTORE AFTER PRINT
     ============================================================ */
  function restoreAfterPrint() {
    /* Remove injected print title */
    const printTitle = document.getElementById('print-title-block');
    if (printTitle) printTitle.remove();

    /* Restore previously hidden items */
    const reviewList = document.getElementById('review-list');
    if (reviewList) {
      const wasHidden = reviewList.querySelectorAll('[data-was-hidden]');
      wasHidden.forEach(item => {
        item.setAttribute('hidden', '');
        item.removeAttribute('data-was-hidden');
      });
    }
  }

  /* ============================================================
     INJECT PRINT TITLE BLOCK
     ============================================================ */
  function injectPrintTitle() {
    /* Remove old one if exists */
    const old = document.getElementById('print-title-block');
    if (old) old.remove();

    /* Read meta from header */
    const metaEl    = document.getElementById('result-header-meta');
    const metaText  = metaEl ? metaEl.textContent.trim() : '';

    /* Score data */
    const scorePct  = document.getElementById('score-pct');
    const statScore = document.getElementById('stat-score');
    const scoreGrade= document.getElementById('score-grade');

    const block = document.createElement('div');
    block.id = 'print-title-block';
    block.style.cssText = `
      display: none;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 1rem;
      margin-bottom: 1.5rem;
    `;

    block.innerHTML = `
      <h1 style="font-size:18pt;font-weight:700;color:#1e293b;margin:0 0 .25rem">
        WB ANM GNM 2026 — অনুশীলন ফলাফল
      </h1>
      <p style="font-size:11pt;color:#64748b;margin:0 0 .5rem">
        ${metaText}
      </p>
      <p style="font-size:10pt;color:#94a3b8;margin:0">
        প্রিন্টের তারিখ: ${formatPrintDate(new Date())}
      </p>
    `;

    /* Insert at top of result content */
    const content = document.getElementById('result-content');
    if (content) {
      content.insertBefore(block, content.firstChild);
      /* Show it — CSS @media print will control visibility */
      block.style.display = 'block';
    }
  }

  /* ============================================================
     FORCE CHART WIDTHS (so they render in print)
     ============================================================ */
  function forceChartWidths() {
    /* Chart bars use CSS transitions — force inline styles */
    const bars = [
      { id: 'chart-correct',     valId: 'chart-correct-val'     },
      { id: 'chart-wrong',       valId: 'chart-wrong-val'       },
      { id: 'chart-unattempted', valId: 'chart-unattempted-val' },
    ];

    bars.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      /* Read computed style width and apply inline */
      const computed = window.getComputedStyle(el).width;
      const parent   = el.parentElement;
      if (!parent) return;

      const parentW  = parent.offsetWidth;
      const elW      = parseFloat(computed) || 0;
      const pct      = parentW > 0 ? ((elW / parentW) * 100).toFixed(1) : '0';

      el.style.width = `${pct}%`;
    });
  }

  /* ============================================================
     MAIN PRINT FUNCTION
     ============================================================ */

  /**
   * Trigger browser print dialog.
   * Prepares the page, prints, then restores.
   */
  function printResult() {
    if (isPrinting) return;

    /* Manually call prepare in case onbeforeprint isn't fired first */
    prepareForPrint();

    /* Small delay to ensure DOM updates before print dialog */
    setTimeout(() => {
      window.print();
    }, 150);
  }

  /* ============================================================
     FORMAT DATE (Bengali)
     ============================================================ */
  function formatPrintDate(date) {
    const map = {
      '0':'০','1':'১','2':'২','3':'৩','4':'৪',
      '5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'
    };
    const bn = (n) =>
      String(n).replace(/[0-9]/g, d => map[d] || d);

    const months = [
      'জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল',
      'মে','জুন','জুলাই','আগস্ট',
      'সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'
    ];

    const day   = bn(date.getDate());
    const month = months[date.getMonth()];
    const year  = bn(date.getFullYear());
    const hrs   = bn(String(date.getHours()).padStart(2, '0'));
    const mins  = bn(String(date.getMinutes()).padStart(2, '0'));

    return `${day} ${month} ${year}, ${hrs}:${mins}`;
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  return {
    printResult,
  };

})();