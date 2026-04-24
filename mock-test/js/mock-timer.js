/* ============================================================
   MOCK-TIMER.JS
   WB ANM GNM 2026 - Timer Utility Module
   Provides: formatSeconds, getElapsedTime, updateRing
   Exposed as: window.MockTimer
   ============================================================ */

(function() {
  'use strict';
  
  /* ── Public API ────────────────────────────────────────── */
  window.MockTimer = {
    formatSeconds: formatSeconds,
    formatMillis: formatMillis,
    getElapsedTime: getElapsedTime,
    getElapsedSeconds: getElapsedSeconds,
    updateRing: updateRing,
    getTimerState: getTimerState
  };
  
  /* ── Constants ─────────────────────────────────────────── */
  /* SVG circle r=32 → circumference = 2π×32 ≈ 201.06 */
  var RING_CIRCUMFERENCE = 201.06;
  
  /* ══════════════════════════════════════════════════════════
     FORMAT SECONDS → "MM:SS"
  ══════════════════════════════════════════════════════════ */
  function formatSeconds(totalSeconds) {
    console.log('MockTimer: formatSeconds()', totalSeconds);
    
    if (
      typeof totalSeconds !== 'number' ||
      isNaN(totalSeconds)
    ) {
      console.warn('MockTimer: formatSeconds — invalid input', totalSeconds);
      return '00:00';
    }
    
    /* Clamp to zero */
    var secs = Math.max(0, Math.floor(totalSeconds));
    var mins = Math.floor(secs / 60);
    var remainSecs = secs % 60;
    
    return (
      String(mins).padStart(2, '0') + ':' +
      String(remainSecs).padStart(2, '0')
    );
  }
  
  /* ══════════════════════════════════════════════════════════
     FORMAT MILLISECONDS → "MM:SS"
  ══════════════════════════════════════════════════════════ */
  function formatMillis(milliseconds) {
    if (
      typeof milliseconds !== 'number' ||
      isNaN(milliseconds)
    ) {
      console.warn('MockTimer: formatMillis — invalid input', milliseconds);
      return '00:00';
    }
    
    var totalSecs = Math.floor(Math.max(0, milliseconds) / 1000);
    return formatSeconds(totalSecs);
  }
  
  /* ══════════════════════════════════════════════════════════
     GET ELAPSED TIME STRING FROM START TIMESTAMP
  ══════════════════════════════════════════════════════════ */
  function getElapsedTime(startTimestamp) {
    if (
      typeof startTimestamp !== 'number' ||
      isNaN(startTimestamp) ||
      startTimestamp <= 0
    ) {
      console.warn(
        'MockTimer: getElapsedTime — invalid startTimestamp', startTimestamp
      );
      return '00:00';
    }
    
    var now = Date.now();
    var elapsed = now - startTimestamp;
    
    if (elapsed < 0) {
      console.warn('MockTimer: getElapsedTime — elapsed is negative', elapsed);
      return '00:00';
    }
    
    return formatMillis(elapsed);
  }
  
  /* ══════════════════════════════════════════════════════════
     GET ELAPSED SECONDS (numeric)
  ══════════════════════════════════════════════════════════ */
  function getElapsedSeconds(startTimestamp) {
    if (
      typeof startTimestamp !== 'number' ||
      isNaN(startTimestamp) ||
      startTimestamp <= 0
    ) {
      return 0;
    }
    
    var elapsed = Date.now() - startTimestamp;
    return Math.max(0, Math.floor(elapsed / 1000));
  }
  
  /* ══════════════════════════════════════════════════════════
     UPDATE SVG RING PROGRESS
     (called by mock-engine if ring element exists)
  ══════════════════════════════════════════════════════════ */
  function updateRing(remainingSeconds, totalSeconds) {
    if (
      typeof remainingSeconds !== 'number' ||
      typeof totalSeconds !== 'number' ||
      totalSeconds <= 0
    ) {
      console.warn('MockTimer: updateRing — invalid params');
      return;
    }
    
    var ringFill = document.getElementById('timerRingFill');
    if (!ringFill) {
      /* Ring element not present in current layout — skip silently */
      return;
    }
    
    var ratio = remainingSeconds / totalSeconds;
    var clampedRatio = Math.min(1, Math.max(0, ratio));
    var offset = RING_CIRCUMFERENCE * (1 - clampedRatio);
    
    ringFill.style.strokeDashoffset = String(offset);
    
    /* Colour by state */
    ringFill.classList.remove('warning', 'critical');
    
    if (remainingSeconds <= 120) {
      ringFill.classList.add('critical');
    } else if (remainingSeconds <= 600) {
      ringFill.classList.add('warning');
    }
  }
  
  /* ══════════════════════════════════════════════════════════
     GET HUMAN-READABLE TIMER STATE
  ══════════════════════════════════════════════════════════ */
  function getTimerState(remainingSeconds) {
    if (typeof remainingSeconds !== 'number' || isNaN(remainingSeconds)) {
      return 'unknown';
    }
    
    if (remainingSeconds <= 0) return 'expired';
    if (remainingSeconds <= 120) return 'critical';
    if (remainingSeconds <= 600) return 'warning';
    return 'normal';
  }
  
  console.log('MockTimer: Module loaded — window.MockTimer ready');
  
}());