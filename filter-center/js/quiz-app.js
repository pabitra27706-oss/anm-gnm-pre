/**
 * quiz-app.js – Quiz taking logic (extracted from quiz.html)
 * WB ANM GNM 2026
 */
(function() {
  'use strict';

  /* ── Helpers ── */
  // FIXED: Correct Bengali digit mapping
  const toBengali = num => String(num).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  const formatTime = sec => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return toBengali(String(m).padStart(2, '0')) + ':' + toBengali(String(s).padStart(2, '0'));
  };
  const escapeHtml = str => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  // Dynamic Bengali option letters (supports up to 26 options)
  const getOptionLetter = (index) => {
    const letters = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ', 'ঝ', 'ঞ',
                     'ট', 'ঠ', 'ড', 'ঢ', 'ণ', 'ত', 'থ', 'দ', 'ধ', 'ন',
                     'প', 'ফ', 'ব', 'ভ', 'ম', 'য'];
    return letters[index] || String.fromCharCode(2453 + index);
  };

  /* ── State ── */
  let questions = [];
  let userAnswers = {};
  let currentIndex = 0;
  let startTime = Date.now();
  let timerInterval = null;
  let quizSubmitted = false;

  /* ── Subject/Unit labels (as defined in filter-engine) ── */
  const SUBJECT_BN = {
    'life-science': 'জীবন বিজ্ঞান',
    'general-science': 'সাধারণ বিজ্ঞান',
    'arithmetic-mathematics': 'গণিত',
    'reasoning-general-knowledge': 'যুক্তিবিদ্যা ও সাধারণ জ্ঞান',
    'general-knowledge': 'সাধারণ জ্ঞান',
    'english-grammar': 'ইংরেজি ব্যাকরণ'
  };
  const UNIT_BN = {
    '01-antonyms': 'Antonyms',
    '02-articles': 'Articles',
    '03-basic-writing-skills': 'Basic Writing Skills',
    '04-error-spotting': 'Error Spotting',
    '05-fill-in-the-blanks': 'Fill in the Blanks',
    '06-one-word-substitution': 'One Word Substitution',
    '07-prepositions': 'Prepositions',
    '08-sentence-rearrangement': 'Sentence Rearrangement',
    '09-subject-verb-agreement': 'Subject-Verb Agreement',
    '10-synonyms': 'Synonyms',
    '11-tenses': 'Tenses',
    '01-awards-and-honours': 'পুরস্কার ও সম্মান',
    '02-books-and-authors': 'বই ও লেখক',
    '03-indian-freedom-struggle': 'ভারতের স্বাধীনতা সংগ্রাম',
    '04-indian-history': 'ভারতের ইতিহাস',
    '05-indian-polity': 'ভারতের রাজনীতি',
    '06-physical-geography': 'ভৌত ভূগোল',
    '07-political-geography': 'রাজনৈতিক ভূগোল',
    '08-science-and-technology': 'বিজ্ঞান ও প্রযুক্তি',
    '09-sports': 'খেলাধুলা',
    '10-west-bengal-gk': 'পশ্চিমবঙ্গের সাধারণ জ্ঞান',
    '01-acids-bases-salts': 'অ্যাসিড, ক্ষার ও লবণ',
    '02-atomic-structure': 'পরমাণুর গঠন',
    '03-basic-organic-chemistry': 'মৌলিক জৈব রসায়ন',
    '04-chemical-reactions': 'রাসায়নিক বিক্রিয়া',
    '05-electricity-and-circuits': 'তড়িৎ ও বর্তনী',
    '06-environmental-chemistry': 'পরিবেশ রসায়ন',
    '07-force-and-motion': 'বল ও গতি',
    '08-heat-and-temperature': 'তাপ ও তাপমাত্রা',
    '09-light-reflection-refraction': 'আলোর প্রতিফলন ও প্রতিসরণ',
    '10-matter-and-states': 'পদার্থ ও অবস্থা',
    '11-measurements': 'পরিমাপ',
    '12-work-and-energy': 'কাজ ও শক্তি',
    '01-average': 'গড়',
    '02-basic-algebra': 'প্রাথমিক বীজগণিত',
    '03-compound-interest': 'চক্রবৃদ্ধি সুদ',
    '04-data-interpretation': 'ডাটা বিশ্লেষণ',
    '05-fractions-decimals': 'ভগ্নাংশ ও দশমিক',
    '06-lcm-hcf': 'ল.সা.গু ও গ.সা.গু',
    '07-mensuration': 'ক্ষেত্রমিতি',
    '08-number-system': 'সংখ্যা পদ্ধতি',
    '09-percentages': 'শতকরা',
    '10-profit-loss': 'লাভ ও ক্ষতি',
    '11-ratio-proportion': 'অনুপাত ও সমানুপাত',
    '12-simple-interest': 'সরল সুদ',
    '13-speed-distance': 'গতি ও দূরত্ব',
    '14-time-work': 'সময় ও কাজ',
    '01-analogies': 'সাদৃশ্য',
    '02-blood-relations': 'রক্ত সম্পর্ক',
    '03-cause-effect': 'কারণ ও প্রভাব',
    '04-classification': 'শ্রেণীবিভাজন',
    '05-coding-decoding': 'কোডিং–ডিকোডিং',
    '06-direction-sense': 'দিক নির্ণয়',
    '07-letter-series': 'অক্ষর সিরিজ',
    '08-number-series': 'সংখ্যা সিরিজ',
    '09-puzzles': 'ধাঁধা',
    '10-seating-arrangement': 'আসন বিন্যাস',
    '11-statement-assumption': 'বিবৃতি ও অনুমান',
    '12-syllogism': 'সিলোজিজম',
    '13-venn-diagrams': 'ভেন ডায়াগ্রাম',
    '01-circulatory-system': 'রক্ত সংবহনতন্ত্র',
    '02-common-diseases': 'সাধারণ রোগ',
    '03-digestive-system': 'পাচনতন্ত্র',
    '04-excretory-system': 'রেচনতন্ত্র',
    '05-first-aid-fundamentals': 'প্রাথমিক চিকিৎসা',
    '06-immunity': 'রোগ প্রতিরোধ ক্ষমতা',
    '07-nervous-system': 'স্নায়ুতন্ত্র',
    '08-nutrition-and-health': 'পুষ্টি ও স্বাস্থ্য',
    '09-reproductive-system': 'প্রজননতন্ত্র',
    '10-respiratory-system': 'শ্বসনতন্ত্র',
    '11-sense-organs': 'ইন্দ্রিয় অঙ্গ',
    '12-tissues': 'কলাতন্ত্র'
  };
  function getUnitBn(u) { return UNIT_BN[u] || u?.replace(/-/g, ' ') || ''; }
  function getQid(q) { return q.id; }

  /* ── Evaluation ── */
  function evaluateSingle(q, ans) {
    if (ans === null || ans === undefined) return 'skipped';
    if (q.multi === true) {
      const correctSet = new Set(Array.isArray(q.answer) ? q.answer : [q.answer]);
      const userSet = new Set(Array.isArray(ans) ? ans : []);
      let hasWrong = false;
      userSet.forEach(s => { if (!correctSet.has(s)) hasWrong = true; });
      if (hasWrong) return 'wrong';
      let correctCount = 0;
      userSet.forEach(s => { if (correctSet.has(s)) correctCount++; });
      if (correctCount === correctSet.size) return 'correct';
      if (correctCount > 0) return 'partial';
      return 'wrong';
    } else {
      const correct = Array.isArray(q.answer) ? q.answer[0] : q.answer;
      return ans === correct ? 'correct' : 'wrong';
    }
  }

  function loadQuestions() {
    try {
      const raw = sessionStorage.getItem('filter_quiz_questions');
      if (!raw) throw new Error();
      questions = JSON.parse(raw);
      if (!questions.length) throw new Error();
      userAnswers = {};
      questions.forEach(q => { userAnswers[getQid(q)] = null; });
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ── Rendering ── */
  function renderCurrentQuestion() {
    if (!questions.length || quizSubmitted) return;
    const q = questions[currentIndex];
    const qid = getQid(q);
    const selectedVal = userAnswers[qid];
    const isMulti = q.multi === true;

    let html = `<div class="question-card"><div class="meta-badges">`;
    if (q.subject) html += `<span class="badge badge-subject">${SUBJECT_BN[q.subject] || q.subject}</span>`;
    if (q.unit) html += `<span class="badge badge-unit">${getUnitBn(q.unit)}</span>`;
    if (q.type) html += `<span class="badge badge-type">${q.type === 'theory' ? 'তত্ত্ব' : q.type === 'numerical' ? 'গাণিতিক' : q.type}</span>`;
    if (q.difficulty) html += `<span class="badge badge-${q.difficulty}">${q.difficulty === 'easy' ? 'সহজ' : q.difficulty === 'medium' ? 'মাঝারি' : 'কঠিন'}</span>`;
    if (isMulti) html += `<span class="badge badge-multi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> বহু সঠিক</span>`;
    html += `</div><div class="question-text">${escapeHtml(q.question)}</div>`;

    if (isMulti) html += `<div class="multi-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 16 12"/></svg> একাধিক উত্তর সঠিক হতে পারে। সঠিক সব উত্তর নির্বাচন করুন।</div>`;

    html += `<div class="options-list" id="optionsList">`;
    for (let i = 0; i < q.options.length; i++) {
      let isSelected = false;
      if (isMulti) isSelected = Array.isArray(selectedVal) && selectedVal.includes(i);
      else isSelected = (selectedVal === i);
      const selectedClass = isSelected ? ' selected' : '';
      const letter = getOptionLetter(i);
      if (isMulti) {
        html += `<div class="option${selectedClass}" data-opt-index="${i}"><input type="checkbox" class="option-checkbox" ${isSelected ? 'checked' : ''}><div class="option-letter">${letter}</div><div class="option-text">${escapeHtml(q.options[i])}</div></div>`;
      } else {
        html += `<div class="option${selectedClass}" data-opt-index="${i}"><div class="option-letter">${letter}</div><div class="option-text">${escapeHtml(q.options[i])}</div></div>`;
      }
    }
    html += `</div></div><div class="nav-buttons">`;
    html += `<button class="nav-btn" id="prevBtn" ${currentIndex === 0 ? 'disabled' : ''}>◀ আগের</button>`;
    if (currentIndex === questions.length - 1) {
      html += `<button class="nav-btn nav-btn-primary" id="submitQuizBtn">✅ জমা দিন</button>`;
    } else {
      html += `<button class="nav-btn nav-btn-primary" id="nextBtn">পরবর্তী ▶</button>`;
    }
    html += `</div><div class="swipe-hint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg> সোয়াইপ করে প্রশ্ন পরিবর্তন <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>`;

    document.getElementById('questionSwipeArea').innerHTML = html;

    document.querySelectorAll('.option').forEach(opt => {
      const idx = parseInt(opt.dataset.optIndex);
      if (isMulti) {
        const chk = opt.querySelector('.option-checkbox');
        opt.addEventListener('click', (e) => {
          if (e.target !== chk) chk.checked = !chk.checked;
          if (!quizSubmitted) handleMultiSelection(idx, chk.checked);
        });
        chk.addEventListener('change', (e) => {
          e.stopPropagation();
          if (!quizSubmitted) handleMultiSelection(idx, chk.checked);
        });
      } else {
        opt.addEventListener('click', () => {
          if (!quizSubmitted) handleSingleSelection(idx);
        });
      }
    });

    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => navigateQuestion(-1));
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.addEventListener('click', () => navigateQuestion(1));
    const submitBtn = document.getElementById('submitQuizBtn');
    if (submitBtn) submitBtn.addEventListener('click', () => submitQuiz());

    updateProgressAndCounter();
    updatePalette();
  }

  function handleSingleSelection(idx) {
    const q = questions[currentIndex];
    userAnswers[getQid(q)] = idx;
    renderCurrentQuestion();
  }

  function handleMultiSelection(idx, checked) {
    const q = questions[currentIndex];
    const qid = getQid(q);
    let cur = userAnswers[qid];
    let arr = Array.isArray(cur) ? [...cur] : [];
    if (checked) { if (!arr.includes(idx)) arr.push(idx); }
    else { arr = arr.filter(i => i !== idx); }
    userAnswers[qid] = arr.length ? arr : null;
    renderCurrentQuestion();
  }

  function navigateQuestion(delta) {
    const newIdx = currentIndex + delta;
    if (newIdx >= 0 && newIdx < questions.length) {
      currentIndex = newIdx;
      renderCurrentQuestion();
    }
  }

  let touchStartX = 0;
  function initSwipe() {
    const area = document.getElementById('questionSwipeArea');
    if (!area) return;
    area.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; });
    area.addEventListener('touchend', e => {
      if (!touchStartX) return;
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 50) {
        if (diff > 0 && currentIndex > 0) navigateQuestion(-1);
        else if (diff < 0 && currentIndex < questions.length - 1) navigateQuestion(1);
      }
      touchStartX = 0;
    });
  }

  function updateProgressAndCounter() {
    let answered = 0;
    questions.forEach(q => { if (userAnswers[getQid(q)] !== null) answered++; });
    const percent = (answered / questions.length) * 100;
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('questionCounter').innerText = `${toBengali(currentIndex + 1)}/${toBengali(questions.length)} (উত্তর: ${toBengali(answered)})`;
    document.getElementById('headerSubtitle').innerText = `${toBengali(questions.length)} প্রশ্ন • উত্তর ${toBengali(answered)}টি`;
  }

  function updatePalette() {
    const grid = document.getElementById('paletteGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < questions.length; i++) {
      const answered = userAnswers[getQid(questions[i])] !== null;
      const btn = document.createElement('button');
      btn.textContent = toBengali(i + 1);
      btn.classList.add('palette-btn');
      if (answered) btn.classList.add('answered');
      if (i === currentIndex) btn.classList.add('current');
      btn.addEventListener('click', () => {
        currentIndex = i;
        renderCurrentQuestion();
        closePalette();
      });
      grid.appendChild(btn);
    }
  }

  function openPalette() { document.getElementById('paletteOverlay').classList.add('open'); }
  function closePalette() { document.getElementById('paletteOverlay').classList.remove('open'); }

  function submitQuiz() {
    if (quizSubmitted) return;
    quizSubmitted = true;
    if (timerInterval) clearInterval(timerInterval);

    let correct = 0, wrong = 0, partial = 0, skipped = 0;
    const subjectStats = {};
    const wrongQuestions = [];

    questions.forEach(q => {
      const ans = userAnswers[getQid(q)];
      const res = evaluateSingle(q, ans);
      if (res === 'correct') correct++;
      else if (res === 'partial') partial++;
      else if (res === 'wrong') wrong++;
      else skipped++;

      const sub = q.subject || 'unknown';
      if (!subjectStats[sub]) subjectStats[sub] = { total: 0, correct: 0 };
      subjectStats[sub].total++;
      if (res === 'correct') subjectStats[sub].correct++;
      if (res === 'wrong') wrongQuestions.push(q);
    });

    const total = questions.length;
    const percentage = Math.round((correct / total) * 100);

    if (window.FilterHistory) {
      try { FilterHistory.saveQuizResults(questions, userAnswers); } catch (e) {}
    }

    showResultScreen({ correct, wrong, partial, skipped, total, percentage, subjectStats, wrongQuestions });
  }

  function populateReviewList(questions, userAnswers) {
    const reviewList = document.getElementById('reviewList');
    if (!reviewList) return;
    reviewList.innerHTML = '';

    questions.forEach((q, idx) => {
      const qid = q.id;
      const userAns = userAnswers[qid];
      const result = evaluateSingle(q, userAns);

      let correctText = '';
      if (q.multi) {
        const correctIndices = Array.isArray(q.answer) ? q.answer : [q.answer];
        correctText = correctIndices.map(i => `${getOptionLetter(i)}. ${q.options[i]}`).join('; ');
      } else {
        const correctIdx = Array.isArray(q.answer) ? q.answer[0] : q.answer;
        correctText = `${getOptionLetter(correctIdx)}. ${q.options[correctIdx]}`;
      }

      let userText = 'এড়িয়ে গেছেন';
      if (userAns !== null && userAns !== undefined) {
        if (q.multi) {
          const selected = Array.isArray(userAns) ? userAns : [];
          if (selected.length) userText = selected.map(i => `${getOptionLetter(i)}. ${q.options[i]}`).join('; ');
          else userText = 'কোনো উত্তর নির্বাচন করেনি';
        } else {
          const idx = typeof userAns === 'number' ? userAns : null;
          userText = idx !== null ? `${getOptionLetter(idx)}. ${q.options[idx]}` : 'অবৈধ উত্তর';
        }
      }

      const statusClass = result === 'correct' ? 'correct' : (result === 'partial' ? 'partial' : (result === 'wrong' ? 'wrong' : 'skipped'));
      const statusText = result === 'correct' ? '✓ সঠিক' : (result === 'partial' ? '⚠ আংশিক সঠিক' : (result === 'wrong' ? '✗ ভুল' : '⊘ এড়িয়ে গেছেন'));

      const itemDiv = document.createElement('div');
      itemDiv.className = `review-item ${statusClass}`;
      itemDiv.innerHTML = `
        <div class="review-question">${idx + 1}. ${escapeHtml(q.question)}</div>
        <div class="review-answer-row">
          <span class="review-label">✅ সঠিক উত্তর:</span>
          <span class="review-correct">${escapeHtml(correctText)}</span>
        </div>
        <div class="review-answer-row">
          <span class="review-label">📝 আপনার উত্তর:</span>
          <span class="${result === 'correct' ? 'review-user-correct' : 'review-user-wrong'}">${escapeHtml(userText)}</span>
          <span style="margin-left:8px; font-weight:600;">${statusText}</span>
        </div>
        ${q.explanation ? `<div class="review-explanation">💡 ব্যাখ্যা: ${escapeHtml(q.explanation)}</div>` : ''}
      `;
      reviewList.appendChild(itemDiv);
    });
  }

  function showResultScreen(stats) {
    document.querySelector('.progress-row').style.display = 'none';
    document.querySelector('.swipe-container').style.display = 'none';
    const resultDiv = document.getElementById('resultContainer');
    resultDiv.style.display = 'block';

    let subjectHtml = '';
    for (const sub in stats.subjectStats) {
      const data = stats.subjectStats[sub];
      const pct = data.total ? Math.round((data.correct / data.total) * 100) : 0;
      const subName = SUBJECT_BN[sub] || sub;
      const color = sub === 'life-science' ? '#4caf50' : sub === 'general-science' ? '#2196f3' : sub === 'arithmetic-mathematics' ? '#ff9800' : sub === 'general-knowledge' ? '#9c27b0' : sub === 'reasoning-general-knowledge' ? '#00bcd4' : '#e91e63';
      subjectHtml += `<div class="breakdown-item"><span>${subName}</span><span style="color:${color};font-weight:700;">${toBengali(data.correct)}/${toBengali(data.total)} (${toBengali(pct)}%)</span></div>`;
    }

    let improvementHtml = '';
    if (window.FilterHistory) {
      let improved = 0, stillWrong = 0, newWrong = 0, newCorrect = 0;
      questions.forEach(q => {
        const prevStatus = FilterHistory.getQuestionStatus(q);
        const ans = userAnswers[getQid(q)];
        const currentRes = evaluateSingle(q, ans);
        if (prevStatus === 'wrong' && currentRes === 'correct') improved++;
        else if (prevStatus === 'wrong' && currentRes === 'wrong') stillWrong++;
        else if (prevStatus !== 'wrong' && currentRes === 'wrong') newWrong++;
        else if (prevStatus === 'unseen' && currentRes === 'correct') newCorrect++;
      });
      if (improved > 0) improvementHtml += `<div class="improvement-item"><div class="improvement-icon improved">📈</div><span>আগে ভুল ছিল, এবার সঠিক</span><span>${toBengali(improved)}টি</span></div>`;
      if (newCorrect > 0) improvementHtml += `<div class="improvement-item"><div class="improvement-icon improved">✨</div><span>নতুন প্রশ্ন সঠিক</span><span>${toBengali(newCorrect)}টি</span></div>`;
      if (stillWrong > 0) improvementHtml += `<div class="improvement-item"><div class="improvement-icon same">🔄</div><span>আগেও ভুল ছিল, এবারও ভুল</span><span>${toBengali(stillWrong)}টি</span></div>`;
      if (newWrong > 0) improvementHtml += `<div class="improvement-item"><div class="improvement-icon new-wrong">⚠️</div><span>এবার নতুন ভুল</span><span>${toBengali(newWrong)}টি</span></div>`;
    }

    const retryWrongBtnHtml = stats.wrongQuestions.length > 0 ? `<button class="action-btn action-btn-wrong" id="retryWrongBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>ভুল প্রশ্নগুলো আবার দিন (${toBengali(stats.wrongQuestions.length)}টি)</button>` : '';

    resultDiv.innerHTML = `
      <div class="result-card"><div><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="${stats.percentage >= 80 ? '#4caf50' : '#e91e63'}" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
      <div style="font-size:1.3rem;font-weight:800;margin:10px 0;">কুইজ সম্পন্ন হয়েছে!</div>
      <div style="font-size:2.2rem;font-weight:800;color:var(--pink)">${toBengali(stats.correct)}/${toBengali(stats.total)}</div>
      <div style="margin:5px 0;">${toBengali(stats.percentage)}%</div>
      <div class="stats-grid"><div class="stat-item"><div class="stat-value correct">${toBengali(stats.correct)}</div><div>সঠিক</div></div><div class="stat-item"><div class="stat-value wrong">${toBengali(stats.wrong + stats.partial)}</div><div>ভুল/আংশিক</div></div><div class="stat-item"><div class="stat-value skipped">${toBengali(stats.skipped)}</div><div>এড়িয়ে গেছেন</div></div></div>
      <div class="history-saved-banner"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>আপনার অগ্রগতি সেভ হয়েছে!</span></div></div>
      ${improvementHtml ? `<div class="improvement-card"><div style="font-weight:700;margin-bottom:12px;">📈 উন্নতির বিশ্লেষণ</div>${improvementHtml}</div>` : ''}
      <div class="subject-breakdown"><div style="font-weight:700;margin-bottom:12px;">বিষয় অনুযায়ী ফলাফল</div>${subjectHtml}</div>
      <div class="action-buttons">
        <button class="action-btn action-btn-primary" onclick="window.location.href='./index.html'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>আবার ফিল্টার করুন</button>
        ${retryWrongBtnHtml}
        <button class="action-btn action-btn-secondary" onclick="location.reload()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>একই কুইজ আবার দিন</button>
        <button class="action-btn action-btn-secondary" onclick="window.location.href='./index.html'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>হোম পেজে ফিরে যান</button>
      </div>
      <div class="review-section">
        <button class="review-toggle" id="reviewToggleBtn">📖 সব প্রশ্নের উত্তর দেখুন</button>
        <div class="review-list" id="reviewList"></div>
      </div>
    `;

    setTimeout(() => {
      populateReviewList(questions, userAnswers);
      const toggleBtn = document.getElementById('reviewToggleBtn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          document.getElementById('reviewList').classList.toggle('open');
        });
      }
    }, 0);

    const retryBtn = document.getElementById('retryWrongBtn');
    if (retryBtn && stats.wrongQuestions.length) {
      retryBtn.addEventListener('click', () => {
        sessionStorage.setItem('filter_quiz_questions', JSON.stringify(stats.wrongQuestions));
        sessionStorage.setItem('filter_quiz_config', JSON.stringify({ random: true, count: 'all' }));
        location.reload();
      });
    }
    window.scrollTo({ top: 0 });
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    startTime = Date.now();
    timerInterval = setInterval(() => {
      if (!quizSubmitted) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        document.getElementById('timerText').innerText = formatTime(elapsed);
      }
    }, 1000);
  }

  function init() {
    if (!loadQuestions()) {
      document.getElementById('loadingState').innerHTML = '<div class="error-state">⚠️ কোনো প্রশ্ন নেই। ফিল্টার পৃষ্ঠায় যান</div><button onclick="window.location.href=\'./index.html\'" style="margin:12px auto;display:block;padding:8px 20px;background:#e91e63;color:white;border:none;border-radius:30px;">ফিল্টার পৃষ্ঠা</button>';
      return;
    }
    document.getElementById('loadingState').style.display = 'none';
    startTimer();
    renderCurrentQuestion();
    initSwipe();

    document.getElementById('paletteToggleBtn').addEventListener('click', openPalette);
    document.getElementById('closePaletteBtn').addEventListener('click', closePalette);
    document.getElementById('paletteOverlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('paletteOverlay')) closePalette();
    });

    document.getElementById('exitBtn').addEventListener('click', (e) => {
      if (!quizSubmitted) {
        const anyAnswered = Object.values(userAnswers).some(v => v !== null);
        if (anyAnswered && !confirm('কুইজ অসম্পূর্ণ, প্রস্থান করবেন?')) e.preventDefault();
        else window.location.href = './index.html';
      }
    });
  }

  init();

})();