/**
 * countdown.js
 * Exam countdown for WB ANM GNM 2026 Preparation Platform
 *
 * - Reads exam date from localStorage key: 'anm_exam_date'
 * - Default: 2026-06-01
 * - Updates #countdownDays with Bengali numerals
 * - Exposes window.refreshCountdown() for external calls
 */

(function() {
  'use strict';
  
  const STORAGE_KEY = 'anm_exam_date';
  const DEFAULT_DATE = '2026-06-01';
  const DAYS_ELEMENT_ID = 'countdownDays';
  const UNIT_ELEMENT_ID = 'countdownUnit';
  
  // Bengali digit map
  const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  
  // ── Entry Point ──────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    console.log('Countdown: Initializing');
    startCountdown();
  });
  
  // ── Expose refresh function globally ─────────
  window.refreshCountdown = function() {
    console.log('Countdown: Refreshing');
    startCountdown();
  };
  
  // ── Main Countdown Function ───────────────────
  function startCountdown() {
    const daysEl = document.getElementById(DAYS_ELEMENT_ID);
    const unitEl = document.getElementById(UNIT_ELEMENT_ID);
    
    if (!daysEl) {
      console.warn('Countdown: #' + DAYS_ELEMENT_ID + ' not found');
      return;
    }
    
    try {
      const examDate = resolveExamDate();
      
      if (!examDate || isNaN(examDate.getTime())) {
        console.warn('Countdown: Invalid date, showing placeholder');
        daysEl.textContent = '--';
        if (unitEl) unitEl.textContent = 'দিন বাকি';
        return;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const target = new Date(examDate);
      target.setHours(0, 0, 0, 0);
      
      const diffMs = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      console.log('Countdown: Date =', target.toDateString(), '| Days =', diffDays);
      
      renderCountdown(daysEl, unitEl, diffDays);
      updateAriaLabel(daysEl, diffDays);
      
    } catch (err) {
      console.error('Countdown: Error:', err);
      
      const daysElFallback = document.getElementById(DAYS_ELEMENT_ID);
      if (daysElFallback) daysElFallback.textContent = '--';
      
      const unitElFallback = document.getElementById(UNIT_ELEMENT_ID);
      if (unitElFallback) unitElFallback.textContent = 'দিন বাকি';
    }
  }
  
  // ── Render ────────────────────────────────────
  function renderCountdown(daysEl, unitEl, diffDays) {
    if (diffDays < 0) {
      daysEl.textContent = '০';
      if (unitEl) unitEl.textContent = 'পরীক্ষা শেষ হয়েছে';
      
    } else if (diffDays === 0) {
      daysEl.textContent = 'আজ';
      if (unitEl) unitEl.textContent = 'পরীক্ষার দিন!';
      
    } else {
      daysEl.textContent = toBengaliNumerals(diffDays);
      if (unitEl) unitEl.textContent = 'দিন বাকি';
    }
  }
  
  // ── Resolve Exam Date ─────────────────────────
  function resolveExamDate() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      
      if (stored && stored.trim() !== '') {
        const parsed = new Date(stored.trim());
        
        if (!isNaN(parsed.getTime())) {
          console.log('Countdown: Using stored date:', stored);
          return parsed;
        }
        
        console.warn('Countdown: Stored date invalid:', stored);
      }
    } catch (err) {
      console.warn('Countdown: localStorage read error:', err);
    }
    
    console.log('Countdown: Using default date:', DEFAULT_DATE);
    return new Date(DEFAULT_DATE);
  }
  
  // ── ARIA Label ────────────────────────────────
  function updateAriaLabel(el, diffDays) {
    if (!el) return;
    
    try {
      if (diffDays < 0) {
        el.setAttribute('aria-label', 'পরীক্ষা শেষ হয়েছে');
      } else if (diffDays === 0) {
        el.setAttribute('aria-label', 'আজ পরীক্ষার দিন');
      } else {
        el.setAttribute('aria-label', 'পরীক্ষার ' + diffDays + ' দিন বাকি');
      }
    } catch (err) {
      console.warn('Countdown: aria-label update error:', err);
    }
  }
  
  // ── Bengali Numerals ──────────────────────────
  function toBengaliNumerals(num) {
    return String(num).replace(/[0-9]/g, function(d) {
      return BN_DIGITS[parseInt(d, 10)];
    });
  }
  
})();