/* ═══════════════════════════════════════════════════════════════
   PYQ-PRINT.JS
   Purpose : Handle printing of question paper and result sheet
   Author  : WB ANM GNM 2026 Preparation Platform
   Depends : pyq-loader.js, pyq-scorer.js
═══════════════════════════════════════════════════════════════ */

'use strict';

const PYQPrint = (() => {

  /* ─────────────────────────────────────
     BENGALI HELPER
  ───────────────────────────────────── */
  const BN = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];

  function toBn(num) {
    return String(
      typeof num === 'number'
        ? parseFloat(num.toFixed(2)).toString()
        : num
    )
      .split('')
      .map(ch => (/\d/.test(ch) ? BN[+ch] : ch))
      .join('');
  }

  const OPTION_LETTERS = ['ক', 'খ', 'গ', 'ঘ'];

  /* ══════════════════════════════════════
     PRINT QUESTION PAPER
     Generates a print-friendly view of
     all 100 questions and opens print dialog
  ══════════════════════════════════════ */
  function printPaper() {
    /* Get questions from loader */
    const questions = PYQLoader.getQuestions();
    const paperMeta = PYQLoader.getPaperMeta();

    if (!questions || questions.length === 0) {
      alert('প্রশ্নপত্র এখনো লোড হয়নি।');
      return;
    }

    const paperTitle = paperMeta?.title || 'প্রশ্নপত্র';
    const paperId    = PYQLoader.getPaperId() || '';

    /* Build full print HTML */
    const printHTML = buildPaperHTML(questions, paperTitle, paperId);

    /* Open new window and print */
    openPrintWindow(printHTML, `${paperTitle} — WB ANM GNM 2026`);
  }

  /* ─────────────────────────────────────
     BUILD PAPER HTML
     Creates print-ready HTML for all questions
  ───────────────────────────────────── */
  function buildPaperHTML(questions, title, paperId) {
    const cat1 = questions.filter(q => q.category === 1);
    const cat2 = questions.filter(q => q.category === 2);

    const questionsHTML = questions.map((q, idx) =>
      buildQuestionHTML(q, idx + 1, false)
    ).join('');

    return `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8" />
        <title>${esc(title)} — WB ANM GNM 2026</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <style>
          ${getPrintStyles()}
        </style>
      </head>
      <body>

        <!-- Header -->
        <div class="print-header">
          <div class="print-header__logo">WB ANM GNM 2026</div>
          <h1 class="print-header__title">${esc(title)}</h1>
          <div class="print-header__meta">
            <span>মোট প্রশ্ন: ${toBn(questions.length)}</span>
            <span>ক্যাট-১: ${toBn(cat1.length)} · ক্যাট-২: ${toBn(cat2.length)}</span>
            <span>মোট নম্বর: ১১৫</span>
            <span>সময়: ৯০ মিনিট</span>
          </div>
          <div class="print-header__rules">
            <strong>নিয়ম:</strong>
            ক্যাট-১: সঠিক +১, ভুল -০.২৫ |
            ক্যাট-২: পূর্ণ সঠিক +২, আংশিক আনুপাতিক, কোনো ভুল = ০
          </div>
        </div>

        <!-- Divider -->
        <hr class="print-divider" />

        <!-- Category 1 heading -->
        <div class="print-section-heading">
          বিভাগ-১ (Category-1) — একটি সঠিক উত্তর বেছে নিন
          <span class="print-section-count">(প্রশ্ন ১–${toBn(cat1.length)})</span>
        </div>

        <!-- All questions -->
        <div class="questions-list">
          ${questionsHTML}
        </div>

        <!-- Footer -->
        <div class="print-footer">
          <span>WB ANM GNM 2026 প্রস্তুতি প্ল্যাটফর্ম</span>
          <span>প্রশ্নপত্র ID: ${esc(paperId)}</span>
        </div>

      </body>
      </html>
    `;
  }

  /* ─────────────────────────────────────
     BUILD SINGLE QUESTION HTML
     Used in both paper print and result print
     showAnswer: true = highlight correct
  ───────────────────────────────────── */
  function buildQuestionHTML(q, displayNum, showAnswer, userAnswers) {
    const isCategory2Boundary =
      q.category === 2 && displayNum > 1 &&
      /* Check if previous was cat-1 */
      displayNum === (q.category === 2 ? 86 : 0);

    const cat2Label = q.category === 2
      ? `<span class="print-cat2-marker">ক্যাট-২</span>` : '';

    const optionsHTML = (q.options || []).map((opt, i) => {
      let cls = 'print-option';

      if (showAnswer) {
        const isCorrect  = (q.answer || []).includes(i);
        const isSelected = (userAnswers || []).includes(i);

        if (isCorrect && isSelected) cls += ' print-option--correct-selected';
        else if (isCorrect)          cls += ' print-option--correct';
        else if (isSelected)         cls += ' print-option--wrong';
      }

      const letter = OPTION_LETTERS[i] || String(i + 1);

      return `
        <div class="${cls}">
          <span class="print-option-letter">${letter}.</span>
          <span class="print-option-text">${esc(opt)}</span>
          ${showAnswer && (q.answer || []).includes(i)
            ? '<span class="print-correct-mark">✓</span>'
            : ''}
        </div>
      `;
    }).join('');

    /* Category-2 section break */
    const sectionBreak = q.category === 2 && displayNum === 86
      ? `<div class="print-section-heading print-section-heading--cat2">
           বিভাগ-২ (Category-2) — এক বা একাধিক সঠিক উত্তর বেছে নিন
           <span class="print-section-count">(প্রশ্ন ৮৬–১০০)</span>
         </div>`
      : '';

    return `
      ${sectionBreak}
      <div class="print-question">
        <div class="print-question__header">
          <span class="print-question__num">${toBn(displayNum)}.</span>
          ${cat2Label}
        </div>
        <p class="print-question__text">${esc(q.question || '')}</p>
        <div class="print-options">
          ${optionsHTML}
        </div>
        ${showAnswer && q.explanation
          ? `<div class="print-explanation">
               <strong>ব্যাখ্যা:</strong> ${esc(q.explanation)}
             </div>`
          : ''}
      </div>
    `;
  }

  /* ══════════════════════════════════════
     PRINT RESULT
     Generates result sheet with score breakdown
     and all questions with correct answers highlighted
  ══════════════════════════════════════ */
  function printResult() {
    const result    = PYQScorer.getLastResult();
    const questions = PYQLoader.getQuestions();
    const answers   = PYQLoader.getAnswers();
    const paperMeta = PYQLoader.getPaperMeta();

    if (!result) {
      alert('ফলাফল পাওয়া যায়নি। আগে পরীক্ষা জমা দিন।');
      return;
    }

    const paperTitle = paperMeta?.title || 'প্রশ্নপত্র';

    const resultHTML = buildResultHTML(
      result, questions, answers, paperTitle
    );

    openPrintWindow(resultHTML, `ফলাফল — ${paperTitle} | WB ANM GNM 2026`);
  }

  /* ─────────────────────────────────────
     BUILD RESULT HTML
  ───────────────────────────────────── */
  function buildResultHTML(result, questions, answers, paperTitle) {
    /* Score summary card */
    const scoreSummaryHTML = `
      <div class="result-summary-card">
        <div class="result-summary-card__title">${esc(paperTitle)}</div>

        <div class="result-score-display">
          <div class="result-score-display__main">
            <span class="result-score-display__number">${toBn(result.totalScore)}</span>
            <span class="result-score-display__max">/ ১১৫</span>
          </div>
          <div class="result-score-display__pct">
            ${toBn(result.percentageScore)}%
          </div>
        </div>

        <table class="result-table">
          <thead>
            <tr>
              <th>বিভাগ</th>
              <th>প্রাপ্ত নম্বর</th>
              <th>সর্বোচ্চ</th>
              <th>সঠিক</th>
              <th>ভুল</th>
              <th>বাদ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ক্যাট-১</td>
              <td class="score-cell">${toBn(result.cat1Score)}</td>
              <td>৮৫</td>
              <td class="correct-cell">${toBn(result.cat1Detail.correct)}</td>
              <td class="wrong-cell">${toBn(result.cat1Detail.wrong)}</td>
              <td>${toBn(result.cat1Detail.skipped)}</td>
            </tr>
            <tr>
              <td>ক্যাট-২</td>
              <td class="score-cell">${toBn(result.cat2Score)}</td>
              <td>৩০</td>
              <td class="correct-cell">${toBn(result.cat2Detail.fullCorrect)}</td>
              <td class="wrong-cell">${toBn(result.cat2Detail.wrong)}</td>
              <td>${toBn(result.cat2Detail.skipped)}</td>
            </tr>
            <tr class="total-row">
              <td><strong>মোট</strong></td>
              <td class="score-cell"><strong>${toBn(result.totalScore)}</strong></td>
              <td><strong>১১৫</strong></td>
              <td class="correct-cell">
                <strong>${toBn(result.totalCorrect)}</strong>
              </td>
              <td class="wrong-cell">
                <strong>${toBn(result.totalWrong)}</strong>
              </td>
              <td><strong>${toBn(result.totalSkipped)}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="result-print-meta">
          <span>পরীক্ষার তারিখ: ${new Date().toLocaleDateString('bn-IN')}</span>
          <span>WB ANM GNM 2026 প্রস্তুতি প্ল্যাটফর্ম</span>
        </div>
      </div>
    `;

    /* All questions with answers */
    const allQuestionsHTML = questions.map((q, idx) =>
      buildQuestionHTML(q, idx + 1, true, answers[q.id] || [])
    ).join('');

    return `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8" />
        <title>ফলাফল — ${esc(paperTitle)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <style>
          ${getPrintStyles()}
          ${getResultPrintStyles()}
        </style>
      </head>
      <body>

        <!-- Result summary — first page -->
        <div class="print-header">
          <div class="print-header__logo">WB ANM GNM 2026</div>
          <h1 class="print-header__title">পরীক্ষার ফলাফল</h1>
        </div>

        ${scoreSummaryHTML}

        <div style="page-break-after: always;"></div>

        <!-- All questions with answers — subsequent pages -->
        <div class="print-header">
          <h2 class="print-header__title" style="font-size:1.1rem;">
            উত্তরপত্র — ${esc(paperTitle)}
          </h2>
          <div class="print-answer-legend">
            <span class="legend-correct">■ সঠিক উত্তর</span>
            <span class="legend-selected">■ আপনার সঠিক উত্তর</span>
            <span class="legend-wrong">■ আপনার ভুল উত্তর</span>
          </div>
        </div>

        <div class="questions-list">
          ${allQuestionsHTML}
        </div>

        <div class="print-footer">
          <span>WB ANM GNM 2026 প্রস্তুতি প্ল্যাটফর্ম</span>
          <span>মোট নম্বর: ${toBn(result.totalScore)} / ১১৫</span>
        </div>

      </body>
      </html>
    `;
  }

  /* ══════════════════════════════════════
     OPEN PRINT WINDOW
     Creates a new tab, writes HTML, prints
  ══════════════════════════════════════ */
  function openPrintWindow(html, title) {
    const win = window.open('', '_blank', 'width=900,height=700');

    if (!win) {
      alert(
        'পপআপ ব্লক করা আছে। ব্রাউজারের পপআপ অনুমতি দিন এবং আবার চেষ্টা করুন।'
      );
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();

    /* Wait for fonts and resources to load before printing */
    win.onload = () => {
      setTimeout(() => {
        win.focus();
        win.print();
        /* Close window after print dialog dismissal */
        win.onafterprint = () => win.close();
      }, 500);
    };
  }

  /* ══════════════════════════════════════
     PRINT STYLES — QUESTION PAPER
  ══════════════════════════════════════ */
  function getPrintStyles() {
    return `
      * {
        box-sizing: border-box;
        margin:     0;
        padding:    0;
      }

      body {
        font-family: 'Hind Siliguri', 'Noto Sans Bengali', Arial, sans-serif;
        font-size:   11pt;
        line-height: 1.6;
        color:       #000000;
        background:  #ffffff;
        padding:     1cm 1.5cm;
      }

      /* ── Header ── */
      .print-header {
        text-align:    center;
        margin-bottom: 0.75rem;
      }

      .print-header__logo {
        font-size:   9pt;
        color:       #555;
        margin-bottom: 0.25rem;
      }

      .print-header__title {
        font-size:   16pt;
        font-weight: 700;
        margin-bottom: 0.375rem;
      }

      .print-header__meta {
        font-size:   9pt;
        color:       #444;
        display:     flex;
        justify-content: center;
        gap:         1.5rem;
        flex-wrap:   wrap;
        margin-bottom: 0.25rem;
      }

      .print-header__rules {
        font-size:     8.5pt;
        color:         #555;
        border:        1px solid #ccc;
        border-radius: 4px;
        padding:       4px 10px;
        display:       inline-block;
        margin-top:    0.25rem;
      }

      /* ── Divider ── */
      .print-divider {
        border:     none;
        border-top: 2px solid #000;
        margin:     0.5rem 0 0.75rem;
      }

      /* ── Section headings ── */
      .print-section-heading {
        font-size:       10.5pt;
        font-weight:     700;
        background:      #f0f0f0;
        padding:         6px 10px;
        border-left:     3px solid #1a73e8;
        margin-bottom:   0.75rem;
        margin-top:      1rem;
      }

      .print-section-heading--cat2 {
        border-left-color: #9c27b0;
        margin-top:        1.5rem;
      }

      .print-section-count {
        font-weight: 400;
        font-size:   9pt;
        color:       #666;
        margin-left: 0.5rem;
      }

      /* ── Question ── */
      .print-question {
        margin-bottom:     1rem;
        page-break-inside: avoid;
        break-inside:      avoid;
        padding-bottom:    0.75rem;
        border-bottom:     1px solid #e8e8e8;
      }

      .print-question__header {
        display:     flex;
        align-items: center;
        gap:         0.5rem;
        margin-bottom: 0.25rem;
      }

      .print-question__num {
        font-weight: 700;
        font-size:   10.5pt;
        min-width:   2rem;
      }

      .print-cat2-marker {
        font-size:     8pt;
        font-weight:   700;
        background:    #f3e5f5;
        color:         #7b1fa2;
        padding:       1px 6px;
        border-radius: 3px;
      }

      .print-question__text {
        font-size:     10.5pt;
        margin-bottom: 0.5rem;
        padding-left:  2rem;
      }

      /* ── Options ── */
      .print-options {
        display:        flex;
        flex-direction: column;
        gap:            0.25rem;
        padding-left:   2rem;
      }

      .print-option {
        display:     flex;
        align-items: flex-start;
        gap:         0.5rem;
        font-size:   10pt;
        padding:     2px 6px;
        border-radius: 3px;
      }

      .print-option-letter {
        font-weight: 600;
        min-width:   1.5rem;
        flex-shrink: 0;
      }

      .print-option-text {
        flex: 1;
      }

      .print-correct-mark {
        color:       #137333;
        font-weight: 700;
        margin-left: auto;
      }

      /* Answer states */
      .print-option--correct {
        background: #e6f4ea;
        color:      #137333;
      }

      .print-option--correct-selected {
        background: #e6f4ea;
        color:      #137333;
        font-weight: 600;
      }

      .print-option--wrong {
        background: #fce8e6;
        color:      #c5221f;
        text-decoration: line-through;
      }

      /* ── Explanation ── */
      .print-explanation {
        margin-top:    0.5rem;
        padding:       0.5rem 0.75rem;
        background:    #e8f0fe;
        border-left:   3px solid #1a73e8;
        font-size:     9.5pt;
        border-radius: 0 4px 4px 0;
        padding-left:  2rem;
        margin-left:   2rem;
      }

      /* ── Footer ── */
      .print-footer {
        margin-top:  1.5rem;
        border-top:  1px solid #ccc;
        padding-top: 0.5rem;
        display:     flex;
        justify-content: space-between;
        font-size:   8.5pt;
        color:       #666;
      }

      /* ── Page break control ── */
      @page {
        size:   A4;
        margin: 1.5cm;
      }

      @media print {
        body { padding: 0; }
      }
    `;
  }

  /* ══════════════════════════════════════
     RESULT-SPECIFIC PRINT STYLES
  ══════════════════════════════════════ */
  function getResultPrintStyles() {
    return `
      /* ── Result summary card ── */
      .result-summary-card {
        border:        2px solid #000;
        border-radius: 6px;
        padding:       1.25rem;
        margin:        1rem 0 1.5rem;
      }

      .result-summary-card__title {
        font-size:     13pt;
        font-weight:   700;
        text-align:    center;
        margin-bottom: 1rem;
        color:         #1a73e8;
      }

      /* Score display */
      .result-score-display {
        text-align:    center;
        margin-bottom: 1rem;
        display:       flex;
        align-items:   baseline;
        justify-content: center;
        gap:           1rem;
      }

      .result-score-display__main {
        display:     flex;
        align-items: baseline;
        gap:         0.25rem;
      }

      .result-score-display__number {
        font-size:   32pt;
        font-weight: 800;
        color:       #1a73e8;
        line-height: 1;
      }

      .result-score-display__max {
        font-size:  14pt;
        color:      #666;
      }

      .result-score-display__pct {
        font-size:   20pt;
        font-weight: 700;
        color:       #34a853;
      }

      /* Result table */
      .result-table {
        width:           100%;
        border-collapse: collapse;
        margin-bottom:   1rem;
        font-size:       10pt;
      }

      .result-table th,
      .result-table td {
        border:  1px solid #ccc;
        padding: 6px 10px;
        text-align: center;
      }

      .result-table th {
        background:  #f0f0f0;
        font-weight: 700;
      }

      .result-table td:first-child {
        text-align: left;
        font-weight: 600;
      }

      .score-cell   { font-weight: 700; color: #1a73e8; }
      .correct-cell { color: #137333; }
      .wrong-cell   { color: #c5221f; }

      .total-row {
        background: #f8f9fa;
        font-size:  10.5pt;
      }

      .result-print-meta {
        display:         flex;
        justify-content: space-between;
        font-size:       8.5pt;
        color:           #666;
        border-top:      1px solid #e0e0e0;
        padding-top:     0.5rem;
        margin-top:      0.5rem;
      }

      /* Answer legend */
      .print-answer-legend {
        display:  flex;
        gap:      1.5rem;
        justify-content: center;
        font-size: 9pt;
        margin-top: 0.25rem;
      }

      .legend-correct  { color: #137333; }
      .legend-selected { color: #1a73e8; }
      .legend-wrong    { color: #c5221f; }
    `;
  }

  /* ══════════════════════════════════════
     SECURITY: HTML ESCAPE
  ══════════════════════════════════════ */
  function esc(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str ?? '')));
    return d.innerHTML;
  }

  /* ══════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════ */
  return {
    printPaper,
    printResult,
  };

})();