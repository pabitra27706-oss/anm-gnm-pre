/* ============================================================
   RESULT-APP.JS
   WB ANM GNM 2026 - Result Page Controller
   Reads stored result and renders full analysis UI
   ============================================================ */

(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────── */
  var mockId       = null;
  var resultData   = null;
  var mockQuestions = [];
  var currentFilter = 'all';

  /* ── Circle constants (r=52 → circumference ≈ 326.73) ─── */
  var CIRCUMFERENCE = 326.73;

  /* ══════════════════════════════════════════════════════════
     ENTRY POINT
  ══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    console.log('ResultApp: DOM ready');
    initResultPage();
  });

  async function initResultPage() {
    console.log('ResultApp: initResultPage()');

    try {
      showLoading(true);

      /* Parse mock ID from URL */
      mockId = getMockIdFromURL();
      if (!mockId) {
        throw new Error('URL-এ mock ID পাওয়া যায়নি।');
      }

      console.log('ResultApp: mockId =', mockId);

      /* Load result from storage */
      if (!window.MockStorage) {
        throw new Error('MockStorage module লোড হয়নি।');
      }

      resultData = window.MockStorage.getLatestResult(mockId);

      if (!resultData) {
        throw new Error(
          'মক টেস্ট ' + mockId + ' এর ফলাফল পাওয়া যায়নি।'
        );
      }

      console.log('ResultApp: Result data loaded —', resultData);

      /* Load original questions for review */
      await loadMockQuestions(mockId);

      /* Render everything */
      renderScoreSection();
      renderSubjectAnalysis();
      renderQuestionReview();
      bindActionButtons();
      bindFilterButtons();

      showLoading(false);
      showContent(true);

      /* Animate circle after paint */
      setTimeout(animateScoreCircle, 300);

    } catch (error) {
      console.error('ResultApp: initResultPage failed —', error);
      showLoading(false);
      showError(error.message || 'ফলাফল লোড করতে সমস্যা হয়েছে।');
    }
  }

  /* ══════════════════════════════════════════════════════════
     URL PARSING
  ══════════════════════════════════════════════════════════ */
  function getMockIdFromURL() {
    try {
      var params = new URLSearchParams(window.location.search);
      var id     = params.get('mock');
      return id ? String(id).trim() : null;
    } catch (error) {
      console.error('ResultApp: getMockIdFromURL error —', error);
      return null;
    }
  }

  /* ══════════════════════════════════════════════════════════
     LOAD ORIGINAL QUESTIONS
  ══════════════════════════════════════════════════════════ */
  async function loadMockQuestions(id) {
    console.log('ResultApp: loadMockQuestions()', id);

    try {
      var paddedId = id.length === 1 ? '0' + id : id;
      var path     = './data/mock-' + paddedId + '.json';

      var response = await fetch(path);
      if (!response.ok) {
        console.warn(
          'ResultApp: Could not load questions — HTTP', response.status
        );
        return;
      }

      var data = await response.json();

      if (data && Array.isArray(data.questions)) {
        mockQuestions = data.questions;
        console.log('ResultApp: Questions loaded —', mockQuestions.length);
      } else {
        console.warn('ResultApp: Invalid question data structure');
      }

    } catch (error) {
      console.warn('ResultApp: loadMockQuestions error —', error);
      /* Non-fatal: review section will show limited info */
    }
  }

  /* ══════════════════════════════════════════════════════════
     RENDER SCORE SECTION
  ══════════════════════════════════════════════════════════ */
  function renderScoreSection() {
    console.log('ResultApp: renderScoreSection()');

    if (!resultData) return;

    var score      = safeNumber(resultData.totalScore, 0);
    var maxScore   = safeNumber(resultData.maxScore, 115);
    var percentage = safeString(resultData.percentage, '0.00');
    var timeTaken  = safeString(resultData.timeTaken, '--:--');
    var cat1Score  = safeNumber(resultData.cat1Score, 0);
    var cat2Score  = safeNumber(resultData.cat2Score, 0);
    var correct    = safeNumber(resultData.totalCorrect, 0);
    var wrong      = safeNumber(resultData.totalWrong, 0);

    setTextSafe('totalScore',    score.toFixed(2));
    setTextSafe('scoreMax',      '/' + maxScore);
    setTextSafe('percentage',    percentage + '%');
    setTextSafe('timeTaken',     timeTaken);
    setTextSafe('correctCount',  String(correct));
    setTextSafe('wrongCount',    String(wrong));

    /* Cat1 display */
    var cat1Correct = safeNumber(resultData.cat1Correct, 0);
    setTextSafe(
      'cat1ScoreDisplay',
      cat1Score.toFixed(2) + ' / 85  (' + cat1Correct + ' সঠিক)'
    );

    /* Cat2 display */
    var cat2FC = safeNumber(resultData.cat2FullyCorrect, 0);
    var cat2PC = safeNumber(resultData.cat2PartialCorrect, 0);
    setTextSafe(
      'cat2ScoreDisplay',
      cat2Score.toFixed(2) + ' / 30  (' + cat2FC + ' সম্পূর্ণ, ' +
      cat2PC + ' আংশিক)'
    );

    /* Performance banner */
    renderPerformanceBanner(parseFloat(percentage));
  }

  /* ── Animate Score Circle ──────────────────────────────── */
  function animateScoreCircle() {
    if (!resultData) return;

    var pct       = parseFloat(resultData.percentage) || 0;
    var fillEl    = document.getElementById('progressFill');

    if (!fillEl) {
      console.warn('ResultApp: #progressFill not found');
      return;
    }

    var offset = CIRCUMFERENCE - (CIRCUMFERENCE * (pct / 100));
    fillEl.style.strokeDashoffset = offset.toFixed(2);

    /* Colour by performance */
    fillEl.classList.remove('good', 'medium', 'poor');
    if (pct >= 60)      { fillEl.classList.add('good');   }
    else if (pct >= 35) { fillEl.classList.add('medium'); }
    else                { fillEl.classList.add('poor');   }
  }

  /* ── Performance Banner ────────────────────────────────── */
  function renderPerformanceBanner(percentage) {
    var banner = document.getElementById('performanceBanner');
    if (!banner) return;

    var message, cssClass;

    if (percentage >= 80) {
      message  = '🏆 অসাধারণ! আপনি দারুণ ফলাফল করেছেন।';
      cssClass = 'excellent';
    } else if (percentage >= 60) {
      message  = '✅ ভালো ফলাফল! আরো অনুশীলন করুন।';
      cssClass = 'good';
    } else if (percentage >= 35) {
      message  = '📚 গড় ফলাফল। আরো পড়াশোনা প্রয়োজন।';
      cssClass = 'average';
    } else {
      message  = '💪 হতাশ হবেন না। আবার চেষ্টা করুন!';
      cssClass = 'poor';
    }

    banner.textContent = message;
    banner.className   = 'performance-banner ' + cssClass;
  }

  /* ══════════════════════════════════════════════════════════
     RENDER SUBJECT ANALYSIS
  ══════════════════════════════════════════════════════════ */
  function renderSubjectAnalysis() {
    console.log('ResultApp: renderSubjectAnalysis()');

    var container = document.getElementById('subjectAnalysis');
    if (!container) {
      console.warn('ResultApp: #subjectAnalysis not found');
      return;
    }

    container.innerHTML = '';

    var analysis = resultData && resultData.subjectAnalysis;

    if (!analysis || typeof analysis !== 'object' ||
        Object.keys(analysis).length === 0) {
      container.innerHTML =
        '<p class="no-subject-data">বিষয়ভিত্তিক তথ্য পাওয়া যায়নি।</p>';
      return;
    }

    var fragment = document.createDocumentFragment();

    Object.keys(analysis).forEach(function (subject) {
      var data = analysis[subject];
      if (!data) return;

      var card     = buildSubjectCard(data);
      fragment.appendChild(card);
    });

    container.appendChild(fragment);

    /* Animate bars after paint */
    setTimeout(function () {
      var bars = container.querySelectorAll('.accuracy-bar-fill');
      bars.forEach(function (bar) {
        var width = bar.dataset.width || '0';
        bar.style.width = width + '%';
      });
    }, 100);
  }

  /* ── Build Subject Card ────────────────────────────────── */
  function buildSubjectCard(data) {
    var accuracy    = safeNumber(data.accuracy, 0);
    var total       = safeNumber(data.total, 0);
    var correct     = safeNumber(data.correct, 0);
    var wrong       = safeNumber(data.wrong, 0);
    var unattempted = safeNumber(data.unattempted, 0);
    var subjectName = data.subjectName || data.subject || 'অজানা বিষয়';

    var barClass = accuracy >= 60 ? 'high' : (accuracy >= 35 ? 'medium' : 'low');
    var badgeClass = barClass;

    var card = document.createElement('div');
    card.className = 'subject-card';

    card.innerHTML =
      '<div class="subject-card-header">' +
        '<h3>' + escapeHtml(subjectName) + '</h3>' +
        '<span class="subject-accuracy-badge ' + badgeClass + '">' +
          accuracy.toFixed(1) + '%' +
        '</span>' +
      '</div>' +
      '<div class="accuracy-bar">' +
        '<div class="accuracy-bar-fill ' + barClass + '"' +
          ' style="width:0" data-width="' + accuracy + '">' +
        '</div>' +
      '</div>' +
      '<div class="subject-stats-row">' +
        '<div class="subject-stat-box">' +
          '<span class="subject-stat-num">' + total + '</span>' +
          '<span class="subject-stat-lbl">মোট</span>' +
        '</div>' +
        '<div class="subject-stat-box">' +
          '<span class="subject-stat-num correct">' + correct + '</span>' +
          '<span class="subject-stat-lbl">সঠিক</span>' +
        '</div>' +
        '<div class="subject-stat-box">' +
          '<span class="subject-stat-num wrong">' + wrong + '</span>' +
          '<span class="subject-stat-lbl">ভুল</span>' +
        '</div>' +
        '<div class="subject-stat-box">' +
          '<span class="subject-stat-num unattempted">' +
            unattempted + '</span>' +
          '<span class="subject-stat-lbl">বাদ</span>' +
        '</div>' +
      '</div>';

    return card;
  }

  /* ══════════════════════════════════════════════════════════
     RENDER QUESTION REVIEW
  ══════════════════════════════════════════════════════════ */
  function renderQuestionReview() {
    console.log('ResultApp: renderQuestionReview()');

    updateFilterCounts();
    applyFilter('all');
  }

  /* ── Update Filter Button Counts ───────────────────────── */
  function updateFilterCounts() {
    if (!resultData) return;

    var answers   = resultData.answers || {};
    var questions = mockQuestions;
    var total     = Math.max(questions.length, 100);

    var correctCount     = 0;
    var wrongCount       = 0;
    var unattemptedCount = 0;

    for (var i = 0; i < total; i++) {
      var q      = questions[i];
      var answer = answers[i];

      if (answer === undefined || answer === null ||
          (Array.isArray(answer) && answer.length === 0)) {
        unattemptedCount++;
        continue;
      }

      if (!q || !window.MockScorer) {
        wrongCount++;
        continue;
      }

      var qResult = window.MockScorer.getQuestionResult(q, i, answer);

      if (qResult.isCorrect)   { correctCount++;     }
      else if (qResult.isWrong || qResult.isPartial) { wrongCount++; }
      else                     { unattemptedCount++; }
    }

    setTextSafe('correctFilterCount',     String(correctCount));
    setTextSafe('wrongFilterCount',       String(wrongCount));
    setTextSafe('unattemptedFilterCount', String(unattemptedCount));
  }

  /* ── Apply Filter ──────────────────────────────────────── */
  function applyFilter(filter) {
    console.log('ResultApp: applyFilter()', filter);

    currentFilter = filter;

    var listEl = document.getElementById('reviewList');
    var emptyEl = document.getElementById('reviewEmpty');

    if (!listEl) {
      console.warn('ResultApp: #reviewList not found');
      return;
    }

    listEl.innerHTML = '';

    var answers   = (resultData && resultData.answers) || {};
    var questions = mockQuestions;
    var total     = Math.max(questions.length, 100);
    var fragment  = document.createDocumentFragment();
    var count     = 0;

    for (var i = 0; i < total; i++) {
      var q      = questions[i];
      var answer = answers[i];

      /* Determine status */
      var status = 'unattempted';
      var qResult = null;

      if (
        answer !== undefined && answer !== null &&
        !(Array.isArray(answer) && answer.length === 0)
      ) {
        if (q && window.MockScorer) {
          qResult = window.MockScorer.getQuestionResult(q, i, answer);
          status  = qResult.status;
        } else {
          status = 'wrong';
        }
      }

      /* Filter logic */
      var include = false;
      if (filter === 'all')         { include = true; }
      else if (filter === 'correct' &&
        (status === 'correct' || status === 'partial')) {
        include = true;
      }
      else if (filter === 'wrong' && status === 'wrong') {
        include = true;
      }
      else if (filter === 'unattempted' && status === 'unattempted') {
        include = true;
      }

      if (!include) continue;

      var item = buildReviewItem(i, q, answer, status, qResult);
      fragment.appendChild(item);
      count++;
    }

    listEl.appendChild(fragment);

    /* Empty state */
    if (emptyEl) {
      if (count === 0) {
        emptyEl.classList.remove('hidden');
      } else {
        emptyEl.classList.add('hidden');
      }
    }

    console.log('ResultApp: Review rendered —', count, 'items');
  }

  /* ── Build Single Review Item ──────────────────────────── */
  function buildReviewItem(index, question, userAnswer, status, qResult) {
    var item = document.createElement('div');
    item.className = 'review-item ' + status;

    var questionText = question
      ? (question.question || question.text || '(প্রশ্ন পাওয়া যায়নি)')
      : '(প্রশ্ন পাওয়া যায়নি)';

    /* Truncate preview */
    var preview = questionText.length > 80
      ? questionText.substring(0, 80) + '…'
      : questionText;

    /* Status label */
    var statusLabels = {
      correct:     'সঠিক',
      partial:     'আংশিক',
      wrong:       'ভুল',
      unattempted: 'উত্তর দেননি'
    };
    var statusLabel = statusLabels[status] || status;

    /* Score chip */
    var marks     = qResult ? safeNumber(qResult.marks, 0) : 0;
    var chipClass = marks > 0 ? 'positive' : (marks < 0 ? 'negative' : 'zero');
    var marksStr  = marks > 0 ? '+' + marks.toFixed(2) : marks.toFixed(2);

    /* Header */
    item.innerHTML =
      '<div class="review-item-header">' +
        '<div class="review-item-left">' +
          '<span class="review-item-num">Q' + (index + 1) + '</span>' +
          '<span class="review-question-preview">' +
            escapeHtml(preview) +
          '</span>' +
        '</div>' +
        '<span class="review-status-badge ' + status + '">' +
          statusLabel +
        '</span>' +
        '<span class="review-toggle-icon">▼</span>' +
      '</div>' +
      '<div class="review-item-body">' +
        buildReviewBody(index, question, userAnswer, status, qResult,
          marksStr, chipClass) +
      '</div>';

    /* Toggle expand */
    var header = item.querySelector('.review-item-header');
    if (header) {
      header.addEventListener('click', function () {
        item.classList.toggle('expanded');
      });
    }

    return item;
  }

  /* ── Build Review Body HTML ────────────────────────────── */
  function buildReviewBody(index, question, userAnswer, status,
    qResult, marksStr, chipClass) {

    if (!question) {
      return '<p style="color:#9e9e9e;font-size:13px">' +
        'এই প্রশ্নের তথ্য উপলব্ধ নেই।</p>';
    }

    var questionText = question.question || question.text || '';
    var options      = Array.isArray(question.options) ? question.options : [];
    var isCat2       = question.category === 2;

    /* Correct answer indices */
    var correctIndices = [];
    if (window.MockScorer) {
      if (isCat2) {
        /* use internal helper via getQuestionResult */
      }
    }

    if (Array.isArray(question.answer)) {
      question.answer.forEach(function (a) {
        var n = parseInt(String(a), 10);
        if (!isNaN(n)) correctIndices.push(n);
      });
    } else if (typeof question.answer === 'number') {
      correctIndices.push(question.answer);
    }

    /* User selected indices */
    var selectedIndices = [];
    if (Array.isArray(userAnswer)) {
      userAnswer.forEach(function (a) {
        var n = parseInt(String(a), 10);
        if (!isNaN(n)) selectedIndices.push(n);
      });
    } else if (typeof userAnswer === 'number') {
      selectedIndices.push(userAnswer);
    }

    /* Build options HTML */
    var optionsHtml = '';
    options.forEach(function (opt, i) {
      var isCorrect  = correctIndices.indexOf(i) !== -1;
      var isSelected = selectedIndices.indexOf(i) !== -1;

      var optClass = 'neutral-option';
      var marker   = '○';

      if (isCorrect && isSelected) {
        optClass = 'correct-option';
        marker   = '✓';
      } else if (isCorrect && !isSelected) {
        optClass = 'correct-option';
        marker   = '✓';
      } else if (!isCorrect && isSelected) {
        optClass = 'wrong-selected';
        marker   = '✗';
      }

      optionsHtml +=
        '<div class="review-option ' + optClass + '">' +
          '<span class="review-option-marker">' + marker + '</span>' +
          '<span>' + escapeHtml(String(opt)) + '</span>' +
        '</div>';
    });

    /* User answer text */
    var userAnswerText = qResult
      ? safeString(qResult.userAnswerText, 'উত্তর দেওয়া হয়নি')
      : 'উত্তর দেওয়া হয়নি';

    var correctAnswerText = qResult
      ? safeString(qResult.correctAnswerText, 'অজানা')
      : 'অজানা';

    /* Explanation */
    var explanationHtml = '';
    if (question.explanation) {
      explanationHtml =
        '<div class="explanation-block">' +
          '<span class="explanation-label">ব্যাখ্যা</span>' +
          '<p class="explanation-text">' +
            escapeHtml(question.explanation) +
          '</p>' +
        '</div>';
    }

    return (
      '<p class="review-full-question">' +
        escapeHtml(questionText) +
      '</p>' +
      '<div class="review-options">' +
        optionsHtml +
      '</div>' +
      '<div class="review-score-row">' +
        '<span style="font-size:13px;color:#757575">নম্বর:</span>' +
        '<span class="score-chip ' + chipClass + '">' + marksStr + '</span>' +
      '</div>' +
      '<div class="review-answers-row">' +
        '<div class="answer-box ' +
          (status === 'correct' ? 'correct-box' :
           status === 'wrong'   ? 'wrong-box'   : '') + '">' +
          '<span class="answer-box-label">আপনার উত্তর</span>' +
          '<span class="answer-box-value">' +
            escapeHtml(userAnswerText) +
          '</span>' +
        '</div>' +
        '<div class="answer-box correct-box">' +
          '<span class="answer-box-label">সঠিক উত্তর</span>' +
          '<span class="answer-box-value">' +
            escapeHtml(correctAnswerText) +
          '</span>' +
        '</div>' +
      '</div>' +
      explanationHtml
    );
  }

  /* ══════════════════════════════════════════════════════════
     BIND FILTER BUTTONS
  ══════════════════════════════════════════════════════════ */
  function bindFilterButtons() {
    var filterBtns = document.querySelectorAll('.filter-btn');

    if (!filterBtns || filterBtns.length === 0) {
      console.warn('ResultApp: No .filter-btn elements found');
      return;
    }

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = btn.dataset.filter;
        if (!filter) return;

        /* Update active state */
        filterBtns.forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');

        applyFilter(filter);
      });
    });

    console.log('ResultApp: Filter buttons bound');
  }

  /* ══════════════════════════════════════════════════════════
     BIND ACTION BUTTONS
  ══════════════════════════════════════════════════════════ */
  function bindActionButtons() {
    /* Back button */
    var backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        window.location.href = './index.html';
      });
    } else {
      console.warn('ResultApp: #backBtn not found');
    }

    /* Retry same mock */
    var retryBtn = document.getElementById('retryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        if (mockId) {
          window.location.href = './test.html?mock=' + encodeURIComponent(mockId);
        }
      });
    } else {
      console.warn('ResultApp: #retryBtn not found');
    }

    /* Choose another mock */
    var anotherBtn = document.getElementById('anotherBtn');
    if (anotherBtn) {
      anotherBtn.addEventListener('click', function () {
        window.location.href = './index.html';
      });
    } else {
      console.warn('ResultApp: #anotherBtn not found');
    }

    /* Home */
    var homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
      homeBtn.addEventListener('click', function () {
        window.location.href = '/';
      });
    } else {
      console.warn('ResultApp: #homeBtn not found');
    }

    console.log('ResultApp: Action buttons bound');
  }

  /* ══════════════════════════════════════════════════════════
     UI HELPERS
  ══════════════════════════════════════════════════════════ */
  function showLoading(show) {
    var loadingEl = document.getElementById('resultLoading');
    if (loadingEl) {
      loadingEl.style.display = show ? 'flex' : 'none';
    }
  }

  function showContent(show) {
    var contentEl = document.getElementById('resultContent');
    if (contentEl) {
      if (show) {
        contentEl.classList.remove('hidden');
      } else {
        contentEl.classList.add('hidden');
      }
    }
  }

  function showError(message) {
    var errorEl  = document.getElementById('resultError');
    var msgEl    = document.getElementById('resultErrorMessage');

    if (errorEl) {
      errorEl.classList.remove('hidden');
    }
    if (msgEl) {
      msgEl.textContent = message || 'একটি সমস্যা হয়েছে।';
    }
  }

  function setTextSafe(id, text) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = text;
    } else {
      console.warn('ResultApp: setTextSafe — element not found:', id);
    }
  }

  function safeNumber(val, def) {
    var n = parseFloat(val);
    return (isNaN(n) || val === null || val === undefined) ? (def || 0) : n;
  }

  function safeString(val, def) {
    if (val === null || val === undefined) return def || '';
    return String(val);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  console.log('ResultApp: Module loaded');

}());