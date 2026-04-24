/* ============================================================
   MOCK-SCORER.JS
   WB ANM GNM 2026 - Scoring Engine
   Exposed as: window.MockScorer
   ============================================================ */

(function () {
  'use strict';

  /* ── Public API ────────────────────────────────────────── */
  window.MockScorer = {
    calculateScore:     calculateScore,
    getSubjectAnalysis: getSubjectAnalysis,
    scoreCat1Question:  scoreCat1Question,
    scoreCat2Question:  scoreCat2Question,
    getQuestionResult:  getQuestionResult
  };

  /* ── Scoring Constants ─────────────────────────────────── */
  var CAT1_CORRECT   =  1;
  var CAT1_WRONG     = -0.25;
  var CAT2_MAX       =  2;
  var CAT2_WRONG     =  0;     /* no negative for Cat2 */
  var MAX_TOTAL      =  115;   /* 85×1 + 15×2 */

  /* ── Subject Name Map ──────────────────────────────────── */
  var SUBJECT_NAMES = {
    'life-science':      'জীবন বিজ্ঞান',
    'physical-science':  'ভৌত বিজ্ঞান',
    'mathematics':       'গণিত',
    'general-knowledge': 'সাধারণ জ্ঞান',
    'logical-reasoning': 'যৌক্তিক চিন্তন',
    'basic-english':     'ইংরেজি',
    'nursing':           'নার্সিং',
    'anatomy':           'শারীরবিদ্যা',
    'physiology':        'শরীরক্রিয়াবিদ্যা',
    'nutrition':         'পুষ্টিবিজ্ঞান',
    'health':            'স্বাস্থ্যবিজ্ঞান'
  };

  /* ══════════════════════════════════════════════════════════
     MAIN SCORE CALCULATOR
  ══════════════════════════════════════════════════════════ */
  function calculateScore(questions, userAnswers) {
    console.log('MockScorer: calculateScore() called');

    /* ── Input validation ── */
    if (!Array.isArray(questions)) {
      console.error('MockScorer: questions is not an array');
      return buildEmptyResult();
    }

    if (!userAnswers || typeof userAnswers !== 'object') {
      console.warn('MockScorer: userAnswers is invalid — treating as empty');
      userAnswers = {};
    }

    if (questions.length === 0) {
      console.warn('MockScorer: questions array is empty');
      return buildEmptyResult();
    }

    /* ── Separate Cat1 and Cat2 ── */
    var cat1Questions = [];
    var cat2Questions = [];

    questions.forEach(function (q, idx) {
      if (!q || typeof q !== 'object') {
        console.warn('MockScorer: Skipping invalid question at index', idx);
        return;
      }
      if (q.category === 2) {
        cat2Questions.push({ question: q, originalIndex: idx });
      } else {
        cat1Questions.push({ question: q, originalIndex: idx });
      }
    });

    console.log(
      'MockScorer: Cat1 =', cat1Questions.length,
      '| Cat2 =', cat2Questions.length
    );

    /* ── Score each category ── */
    var cat1Result = scoreCat1All(cat1Questions, userAnswers);
    var cat2Result = scoreCat2All(cat2Questions, userAnswers);

    /* ── Aggregate ── */
    var rawTotal    = cat1Result.score + cat2Result.score;
    var totalScore  = Math.max(0, parseFloat(rawTotal.toFixed(2)));
    var percentage  = ((totalScore / MAX_TOTAL) * 100).toFixed(2);

    var result = {
      totalScore:   totalScore,
      maxScore:     MAX_TOTAL,
      percentage:   percentage,
      cat1:         cat1Result,
      cat2:         cat2Result,
      totalCorrect: cat1Result.correct + cat2Result.fullyCorrect,
      totalWrong:   cat1Result.wrong   + cat2Result.wrong,
      totalUnattempted:
        cat1Result.unattempted + cat2Result.unattempted
    };

    console.log('MockScorer: Result =', result);
    return result;
  }

  /* ══════════════════════════════════════════════════════════
     SCORE ALL CAT-1 QUESTIONS
  ══════════════════════════════════════════════════════════ */
  function scoreCat1All(cat1List, userAnswers) {
    var score       = 0;
    var correct     = 0;
    var wrong       = 0;
    var unattempted = 0;

    cat1List.forEach(function (item) {
      var q          = item.question;
      var origIndex  = item.originalIndex;
      var result     = scoreCat1Question(q, userAnswers[origIndex]);

      score       += result.marks;
      correct     += result.isCorrect   ? 1 : 0;
      wrong       += result.isWrong     ? 1 : 0;
      unattempted += result.isUnattempted ? 1 : 0;
    });

    return {
      score:        parseFloat(Math.max(0, score).toFixed(2)),
      correct:      correct,
      wrong:        wrong,
      unattempted:  unattempted,
      total:        cat1List.length,
      maxScore:     cat1List.length * CAT1_CORRECT
    };
  }

  /* ══════════════════════════════════════════════════════════
     SCORE SINGLE CAT-1 QUESTION
  ══════════════════════════════════════════════════════════ */
  function scoreCat1Question(question, userAnswer) {
    /* Default result */
    var result = {
      marks:        0,
      isCorrect:    false,
      isWrong:      false,
      isUnattempted:false
    };

    if (!question) {
      console.warn('MockScorer: scoreCat1Question — null question');
      result.isUnattempted = true;
      return result;
    }

    /* Not answered */
    if (userAnswer === undefined || userAnswer === null) {
      result.isUnattempted = true;
      return result;
    }

    /* Get correct answer index */
    var correctAnswer = getCorrectAnswerIndex(question);

    if (correctAnswer === null) {
      console.warn(
        'MockScorer: scoreCat1Question — cannot determine correct answer',
        question
      );
      result.isUnattempted = true;
      return result;
    }

    /* Convert userAnswer to number for comparison */
    var userAnswerNum = parseInt(String(userAnswer), 10);

    if (isNaN(userAnswerNum)) {
      console.warn(
        'MockScorer: scoreCat1Question — userAnswer is not a number',
        userAnswer
      );
      result.isUnattempted = true;
      return result;
    }

    if (userAnswerNum === correctAnswer) {
      result.isCorrect = true;
      result.marks     = CAT1_CORRECT;
    } else {
      result.isWrong   = true;
      result.marks     = CAT1_WRONG;
    }

    return result;
  }

  /* ══════════════════════════════════════════════════════════
     SCORE ALL CAT-2 QUESTIONS
  ══════════════════════════════════════════════════════════ */
  function scoreCat2All(cat2List, userAnswers) {
    var score          = 0;
    var fullyCorrect   = 0;
    var partialCorrect = 0;
    var wrong          = 0;
    var unattempted    = 0;

    cat2List.forEach(function (item) {
      var q         = item.question;
      var origIndex = item.originalIndex;
      var result    = scoreCat2Question(q, userAnswers[origIndex]);

      score += result.marks;

      if (result.isUnattempted)   { unattempted++;    }
      else if (result.isWrong)    { wrong++;          }
      else if (result.isFull)     { fullyCorrect++;   }
      else if (result.isPartial)  { partialCorrect++; }
    });

    return {
      score:          parseFloat(score.toFixed(2)),
      fullyCorrect:   fullyCorrect,
      partialCorrect: partialCorrect,
      wrong:          wrong,
      unattempted:    unattempted,
      total:          cat2List.length,
      maxScore:       cat2List.length * CAT2_MAX
    };
  }

  /* ══════════════════════════════════════════════════════════
     SCORE SINGLE CAT-2 QUESTION
  ══════════════════════════════════════════════════════════ */
  function scoreCat2Question(question, userAnswer) {
    var result = {
      marks:        0,
      isFull:       false,
      isPartial:    false,
      isWrong:      false,
      isUnattempted:false
    };

    if (!question) {
      console.warn('MockScorer: scoreCat2Question — null question');
      result.isUnattempted = true;
      return result;
    }

    /* Not answered */
    if (
      userAnswer === undefined ||
      userAnswer === null ||
      (Array.isArray(userAnswer) && userAnswer.length === 0)
    ) {
      result.isUnattempted = true;
      return result;
    }

    /* Get correct answer indices */
    var correctIndices = getCorrectAnswerIndices(question);

    if (!correctIndices || correctIndices.length === 0) {
      console.warn(
        'MockScorer: scoreCat2Question — no correct answers defined',
        question
      );
      result.isUnattempted = true;
      return result;
    }

    /* Normalise userAnswer to array of numbers */
    var selectedIndices = [];

    if (Array.isArray(userAnswer)) {
      userAnswer.forEach(function (a) {
        var num = parseInt(String(a), 10);
        if (!isNaN(num)) {
          selectedIndices.push(num);
        }
      });
    } else {
      var num = parseInt(String(userAnswer), 10);
      if (!isNaN(num)) {
        selectedIndices.push(num);
      }
    }

    if (selectedIndices.length === 0) {
      result.isUnattempted = true;
      return result;
    }

    /* Check for any wrong selection */
    var hasWrongSelection = selectedIndices.some(function (sel) {
      return correctIndices.indexOf(sel) === -1;
    });

    if (hasWrongSelection) {
      result.isWrong = true;
      result.marks   = CAT2_WRONG;
      return result;
    }

    /* Count how many correct ones were selected */
    var selectedCorrectCount = selectedIndices.filter(function (sel) {
      return correctIndices.indexOf(sel) !== -1;
    }).length;

    var totalCorrectCount = correctIndices.length;

    if (selectedCorrectCount === totalCorrectCount) {
      /* Full marks */
      result.isFull  = true;
      result.marks   = CAT2_MAX;
    } else if (selectedCorrectCount > 0) {
      /* Partial marks */
      result.isPartial = true;
      result.marks     = parseFloat(
        (CAT2_MAX * (selectedCorrectCount / totalCorrectCount)).toFixed(2)
      );
    } else {
      result.isWrong = true;
      result.marks   = CAT2_WRONG;
    }

    return result;
  }

  /* ══════════════════════════════════════════════════════════
     GET QUESTION RESULT (for result page rendering)
  ══════════════════════════════════════════════════════════ */
  function getQuestionResult(question, questionIndex, userAnswer) {
    if (!question || typeof question !== 'object') {
      return {
        status:        'unattempted',
        marks:          0,
        userAnswer:    null,
        correctAnswer: null,
        isCorrect:     false,
        isWrong:       false,
        isUnattempted: true
      };
    }

    var isCat2  = question.category === 2;
    var scoring;

    if (isCat2) {
      scoring = scoreCat2Question(question, userAnswer);
    } else {
      scoring = scoreCat1Question(question, userAnswer);
    }

    var status = 'unattempted';
    if (scoring.isCorrect || scoring.isFull)   { status = 'correct';    }
    else if (scoring.isPartial)                 { status = 'partial';    }
    else if (scoring.isWrong)                   { status = 'wrong';      }

    /* Build human-readable answer strings */
    var userAnswerText    = buildAnswerText(question, userAnswer);
    var correctAnswerText = buildCorrectAnswerText(question);

    return {
      status:            status,
      marks:             scoring.marks,
      userAnswer:        userAnswer,
      userAnswerText:    userAnswerText,
      correctAnswerText: correctAnswerText,
      isCorrect:         !!(scoring.isCorrect || scoring.isFull),
      isPartial:         !!scoring.isPartial,
      isWrong:           !!scoring.isWrong,
      isUnattempted:     !!scoring.isUnattempted
    };
  }

  /* ══════════════════════════════════════════════════════════
     SUBJECT ANALYSIS
  ══════════════════════════════════════════════════════════ */
  function getSubjectAnalysis(questions, userAnswers) {
    console.log('MockScorer: getSubjectAnalysis()');

    if (!Array.isArray(questions)) {
      console.error('MockScorer: getSubjectAnalysis — questions is not array');
      return {};
    }

    if (!userAnswers || typeof userAnswers !== 'object') {
      userAnswers = {};
    }

    /* Group questions by subject */
    var subjectMap = {};

    questions.forEach(function (q, idx) {
      if (!q || typeof q !== 'object') return;

      var subject = q.subject || 'unknown';

      if (!subjectMap[subject]) {
        subjectMap[subject] = [];
      }
      subjectMap[subject].push({ question: q, originalIndex: idx });
    });

    /* Score each subject */
    var analysis = {};

    Object.keys(subjectMap).forEach(function (subject) {
      var items       = subjectMap[subject];
      var correct     = 0;
      var wrong       = 0;
      var unattempted = 0;
      var scoreSum    = 0;
      var maxScore    = 0;

      items.forEach(function (item) {
        var q          = item.question;
        var origIndex  = item.originalIndex;
        var answer     = userAnswers[origIndex];
        var scoring;

        if (q.category === 2) {
          scoring  = scoreCat2Question(q, answer);
          maxScore += CAT2_MAX;
        } else {
          scoring  = scoreCat1Question(q, answer);
          maxScore += CAT1_CORRECT;
        }

        scoreSum += Math.max(0, scoring.marks);

        if (scoring.isUnattempted) {
          unattempted++;
        } else if (
          scoring.isCorrect || scoring.isFull || scoring.isPartial
        ) {
          correct++;
        } else {
          wrong++;
        }
      });

      var total    = items.length;
      var accuracy = total > 0
        ? parseFloat(((correct / total) * 100).toFixed(1))
        : 0;

      analysis[subject] = {
        subject:     subject,
        subjectName: SUBJECT_NAMES[subject] || capitalise(subject),
        total:       total,
        correct:     correct,
        wrong:       wrong,
        unattempted: unattempted,
        score:       parseFloat(scoreSum.toFixed(2)),
        maxScore:    maxScore,
        accuracy:    accuracy
      };
    });

    console.log(
      'MockScorer: Subject analysis complete —',
      Object.keys(analysis).length, 'subjects'
    );

    return analysis;
  }

  /* ══════════════════════════════════════════════════════════
     INTERNAL HELPERS
  ══════════════════════════════════════════════════════════ */

  /* Get single correct answer index (Cat-1) */
  function getCorrectAnswerIndex(question) {
    if (!question) return null;

    /* Support multiple answer key formats */
    if (typeof question.answer === 'number') {
      return question.answer;
    }

    if (Array.isArray(question.answer) && question.answer.length > 0) {
      var first = parseInt(String(question.answer[0]), 10);
      return isNaN(first) ? null : first;
    }

    if (typeof question.correct === 'number') {
      return question.correct;
    }

    if (typeof question.correctAnswer === 'number') {
      return question.correctAnswer;
    }

    if (
      Array.isArray(question.correctAnswer) &&
      question.correctAnswer.length > 0
    ) {
      var firstCA = parseInt(String(question.correctAnswer[0]), 10);
      return isNaN(firstCA) ? null : firstCA;
    }

    console.warn('MockScorer: Cannot find correct answer in question', question);
    return null;
  }

  /* Get array of correct answer indices (Cat-2) */
  function getCorrectAnswerIndices(question) {
    if (!question) return [];

    var indices = [];

    if (Array.isArray(question.answer)) {
      question.answer.forEach(function (a) {
        var num = parseInt(String(a), 10);
        if (!isNaN(num)) indices.push(num);
      });
      return indices;
    }

    if (Array.isArray(question.correctAnswer)) {
      question.correctAnswer.forEach(function (a) {
        var num = parseInt(String(a), 10);
        if (!isNaN(num)) indices.push(num);
      });
      return indices;
    }

    if (typeof question.answer === 'number') {
      return [question.answer];
    }

    console.warn(
      'MockScorer: Cannot find correct answer indices for Cat2', question
    );
    return [];
  }

  /* Build text representation of user's answer */
  function buildAnswerText(question, userAnswer) {
    if (
      userAnswer === undefined ||
      userAnswer === null ||
      (Array.isArray(userAnswer) && userAnswer.length === 0)
    ) {
      return 'উত্তর দেওয়া হয়নি';
    }

    if (!Array.isArray(question.options)) {
      return String(userAnswer);
    }

    if (Array.isArray(userAnswer)) {
      return userAnswer.map(function (idx) {
        var opt = question.options[idx];
        return opt !== undefined ? String(opt) : ('বিকল্প ' + (idx + 1));
      }).join(', ');
    }

    var idx = parseInt(String(userAnswer), 10);
    if (isNaN(idx)) return String(userAnswer);

    var opt = question.options[idx];
    return opt !== undefined ? String(opt) : ('বিকল্প ' + (idx + 1));
  }

  /* Build text for correct answer(s) */
  function buildCorrectAnswerText(question) {
    if (!question) return 'অজানা';

    var indices = [];
    var isCat2  = question.category === 2;

    if (isCat2) {
      indices = getCorrectAnswerIndices(question);
    } else {
      var single = getCorrectAnswerIndex(question);
      if (single !== null) indices = [single];
    }

    if (indices.length === 0) return 'সংজ্ঞায়িত নয়';

    if (!Array.isArray(question.options)) {
      return indices.map(function (i) { return String(i + 1); }).join(', ');
    }

    return indices.map(function (idx) {
      var opt = question.options[idx];
      return opt !== undefined ? String(opt) : ('বিকল্প ' + (idx + 1));
    }).join(', ');
  }

  /* Build an empty/zero result structure */
  function buildEmptyResult() {
    return {
      totalScore:       0,
      maxScore:         MAX_TOTAL,
      percentage:       '0.00',
      cat1: {
        score: 0, correct: 0, wrong: 0,
        unattempted: 0, total: 0, maxScore: 0
      },
      cat2: {
        score: 0, fullyCorrect: 0, partialCorrect: 0,
        wrong: 0, unattempted: 0, total: 0, maxScore: 0
      },
      totalCorrect:     0,
      totalWrong:       0,
      totalUnattempted: 0
    };
  }

  /* Capitalise first letter */
  function capitalise(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  console.log('MockScorer: Module loaded — window.MockScorer ready');

}());