/* ============================================================
   practice/js/quiz-scorer.js
   Score calculation for practice quiz
   WB ANM GNM 2026 Preparation Platform

   UPDATED:
   - Helper `normalizeAnswer` wraps single numbers in arrays for multi questions
   - All scoring functions use this helper
   ============================================================ */

const QuizScorer = (function () {
  'use strict';

  function isAttempted(question, userAnswer) {
    if (userAnswer === undefined || userAnswer === null) return false;
    if (question.multi === true) {
      return Array.isArray(userAnswer) && userAnswer.length > 0;
    }
    return typeof userAnswer === 'number';
  }

  /* Helper to ensure multi answer is always an array */
  function normalizeAnswer(question) {
    if (question.multi === true) {
      return Array.isArray(question.answer) ? question.answer : [question.answer];
    }
    return question.answer;
  }

  function isCorrect(question, userAnswer) {
    if (!isAttempted(question, userAnswer)) return false;
    if (question.multi === true) {
      if (!Array.isArray(userAnswer)) return false;
      const correctSet = new Set(normalizeAnswer(question));
      const userSet = new Set(userAnswer);
      if (userSet.size !== correctSet.size) return false;
      return [...correctSet].every(a => userSet.has(a));
    } else {
      const correctAnswer = Array.isArray(question.answer) ? question.answer[0] : question.answer;
      return userAnswer === correctAnswer;
    }
  }

  function calculateScore(questions, answers) {
    if (!Array.isArray(questions)) { questions = []; }
    if (!answers || typeof answers !== 'object') { answers = {}; }

    let correct = 0, wrong = 0, unattempted = 0, rawScore = 0;
    let multiCount = 0, multiScore = 0;

    questions.forEach((q) => {
      if (!q || typeof q.id === 'undefined') return;
      const userAnswer = answers[q.id];
      const attempted = isAttempted(q, userAnswer);

      if (q.multi === true) {
        multiCount++;
        if (!attempted) { unattempted++; return; }
        const selected = new Set(Array.isArray(userAnswer) ? userAnswer : []);
        const correctSet = new Set(normalizeAnswer(q));
        const hasWrong = [...selected].some(s => !correctSet.has(s));
        if (hasWrong) { wrong++; return; }
        const correctCount = [...selected].filter(s => correctSet.has(s)).length;
        if (correctCount === 0) { unattempted++; return; }
        if (correctCount === correctSet.size) {
          correct++;
          rawScore += 2;
          multiScore += 2;
        } else {
          correct++;
          const earned = 2 * (correctCount / correctSet.size);
          rawScore += earned;
          multiScore += earned;
        }
      } else {
        if (!attempted) { unattempted++; return; }
        const correctAnswer = Array.isArray(q.answer) ? q.answer[0] : q.answer;
        if (userAnswer === correctAnswer) { correct++; rawScore += 1; }
        else { wrong++; rawScore -= 0.25; }
      }
    });

    const finalScore = Math.max(0, parseFloat(rawScore.toFixed(2)));
    const total = questions.length;
    const percentage = total > 0 ? ((correct / total) * 100).toFixed(1) : '0.0';

    return {
      score: finalScore,
      rawScore: parseFloat(rawScore.toFixed(2)),
      correct,
      wrong,
      unattempted,
      total,
      percentage: parseFloat(percentage),
      maxScore: total,
      multiCount,
      multiScore: parseFloat(multiScore.toFixed(2)),
      grade: getGrade(parseFloat(percentage)),
    };
  }

  function getDetailedResults(questions, answers) {
    if (!Array.isArray(questions)) return [];
    if (!answers || typeof answers !== 'object') answers = {};

    return questions.map((q, idx) => {
      if (!q) return null;
      const userAnswer = answers[q.id];
      const attempted = isAttempted(q, userAnswer);
      const isMulti = q.multi === true;
      let fullyCorrect = false, isPartial = false, isWrong = false, scoreEarned = 0;

      if (!attempted) {
        // scoreEarned stays 0
      } else if (isMulti) {
        const selected = new Set(Array.isArray(userAnswer) ? userAnswer : []);
        const correctSet = new Set(normalizeAnswer(q));
        const hasWrong = [...selected].some(s => !correctSet.has(s));
        if (hasWrong) { isWrong = true; scoreEarned = 0; }
        else {
          const correctCount = [...selected].filter(s => correctSet.has(s)).length;
          if (correctCount === correctSet.size) { fullyCorrect = true; scoreEarned = 2; }
          else if (correctCount > 0) { isPartial = true; scoreEarned = parseFloat((2 * (correctCount / correctSet.size)).toFixed(4)); }
          else { isWrong = true; scoreEarned = 0; }
        }
      } else {
        const correctAnswer = Array.isArray(q.answer) ? q.answer[0] : q.answer;
        if (userAnswer === correctAnswer) { fullyCorrect = true; scoreEarned = 1; }
        else { isWrong = true; scoreEarned = -0.25; }
      }

      return {
        index: idx,
        id: q.id,
        question: q.question || '',
        options: Array.isArray(q.options) ? q.options : [],
        answer: q.answer,
        userAnswer: attempted ? userAnswer : null,
        isMulti,
        isAttempted: attempted,
        isCorrect: fullyCorrect,
        isPartial,
        isWrong,
        scoreEarned,
        correctAnswer: q.answer,
        scoreChange: scoreEarned,
        explanation: q.explanation || '',
        subject: q.subject || '',
        unit: q.unit || '',
        type: q.type || '',
        difficulty: q.difficulty || '',
      };
    }).filter(Boolean);
  }

  function getGrade(percentage) {
    if (percentage >= 90) return { letter: 'A+', label: 'অসাধারণ', color: '#22c55e' };
    if (percentage >= 75) return { letter: 'A', label: 'খুব ভালো', color: '#84cc16' };
    if (percentage >= 60) return { letter: 'B', label: 'ভালো', color: '#f59e0b' };
    if (percentage >= 45) return { letter: 'C', label: 'মোটামুটি', color: '#fb923c' };
    if (percentage >= 30) return { letter: 'D', label: 'আরো পড়ুন', color: '#f87171' };
    return { letter: 'F', label: 'আরো চেষ্টা', color: '#ef4444' };
  }

  function getChartData(result) {
    if (!result) return { correctPct: 0, wrongPct: 0, unattemptedPct: 0, multiPct: 0 };
    const total = result.total || 1;
    return {
      correctPct: parseFloat(((result.correct / total) * 100).toFixed(1)),
      wrongPct: parseFloat(((result.wrong / total) * 100).toFixed(1)),
      unattemptedPct: parseFloat(((result.unattempted / total) * 100).toFixed(1)),
      multiPct: parseFloat((((result.multiCount || 0) / total) * 100).toFixed(1)),
    };
  }

  function formatTime(totalSeconds) {
    if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) totalSeconds = 0;
    totalSeconds = Math.max(0, Math.floor(totalSeconds));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const map = { '0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯' };
    const bn = (n) => String(n).padStart(2, '0').replace(/[0-9]/g, d => map[d] || d);
    return `${bn(mins)}:${bn(secs)}`;
  }

  return {
    calculateScore,
    getDetailedResults,
    getGrade,
    getChartData,
    formatTime,
    isAttempted,
    isCorrect,
  };
})();