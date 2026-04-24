/**
 * results-print.js
 * PURPOSE : Handle print functionality for the results dashboard.
 *           Adds/removes printing class, sets up print button listener.
 * PATTERN : IIFE → exposes ResultsPrint to window
 */

(function() {
  'use strict';
  
  /* ═══════════════════════════════════════════════════════
     CONSTANTS
  ═══════════════════════════════════════════════════════ */
  var PRINTING_CLASS = 'is-printing';
  var PRINT_BTN_ID = 'btnPrint';
  
  /* ═══════════════════════════════════════════════════════
     INTERNAL STATE
  ═══════════════════════════════════════════════════════ */
  var _isPrinting = false;
  
  /* ═══════════════════════════════════════════════════════
     INTERNAL: beforePrint
  ═══════════════════════════════════════════════════════ */
  
  /**
   * Called just before the browser opens the print dialog.
   * Adds printing class to body so CSS can adjust layout.
   */
  function beforePrint() {
    try {
      _isPrinting = true;
      document.body.classList.add(PRINTING_CLASS);
      console.log('[Print] Before print — printing class added');
      
      /* Update print button state if it exists */
      var btn = document.getElementById(PRINT_BTN_ID);
      if (btn) {
        btn.setAttribute('disabled', 'true');
        btn.setAttribute('aria-busy', 'true');
      }
    } catch (err) {
      console.error('[Print] beforePrint error:', err);
    }
  }
  
  /* ═══════════════════════════════════════════════════════
     INTERNAL: afterPrint
  ═══════════════════════════════════════════════════════ */
  
  /**
   * Called after the print dialog closes (print or cancel).
   * Removes printing class and restores button state.
   */
  function afterPrint() {
    try {
      _isPrinting = false;
      document.body.classList.remove(PRINTING_CLASS);
      console.log('[Print] After print — printing class removed');
      
      /* Restore print button */
      var btn = document.getElementById(PRINT_BTN_ID);
      if (btn) {
        btn.removeAttribute('disabled');
        btn.removeAttribute('aria-busy');
      }
    } catch (err) {
      console.error('[Print] afterPrint error:', err);
    }
  }
  
  /* ═══════════════════════════════════════════════════════
     PUBLIC: handlePrint
  ═══════════════════════════════════════════════════════ */
  
  /**
   * Trigger the browser print dialog.
   * Guard against double-triggering.
   */
  function handlePrint() {
    if (_isPrinting) {
      console.warn('[Print] Print already in progress');
      return;
    }
    
    console.log('[Print] Triggering window.print()');
    
    try {
      window.print();
    } catch (err) {
      console.error('[Print] window.print() error:', err);
    }
  }
  
  /* ═══════════════════════════════════════════════════════
     PUBLIC: setupPrintButton
  ═══════════════════════════════════════════════════════ */
  
  /**
   * Attach click listener to the print button.
   * Also registers window.onbeforeprint / onafterprint handlers.
   * Safe to call multiple times (idempotent via flag).
   */
  var _printSetupDone = false;
  
  function setupPrintButton() {
    if (_printSetupDone) {
      console.log('[Print] Print button already set up');
      return;
    }
    
    /* ── Register browser print events ── */
    
    /* Modern browsers: matchMedia */
    if (window.matchMedia) {
      try {
        var mediaQueryList = window.matchMedia('print');
        
        /* addListener is deprecated but kept for older browsers */
        if (typeof mediaQueryList.addEventListener === 'function') {
          mediaQueryList.addEventListener('change', function(mql) {
            if (mql.matches) {
              beforePrint();
            } else {
              afterPrint();
            }
          });
          console.log('[Print] matchMedia print listener attached');
        } else if (typeof mediaQueryList.addListener === 'function') {
          /* Fallback for older browsers */
          mediaQueryList.addListener(function(mql) {
            if (mql.matches) {
              beforePrint();
            } else {
              afterPrint();
            }
          });
          console.log('[Print] matchMedia.addListener (legacy) attached');
        }
      } catch (mqlErr) {
        console.warn('[Print] matchMedia listener failed:', mqlErr);
      }
    }
    
    /* window.onbeforeprint / onafterprint (IE + modern) */
    var prevBefore = window.onbeforeprint;
    window.onbeforeprint = function() {
      beforePrint();
      if (typeof prevBefore === 'function') prevBefore();
    };
    
    var prevAfter = window.onafterprint;
    window.onafterprint = function() {
      afterPrint();
      if (typeof prevAfter === 'function') prevAfter();
    };
    
    console.log('[Print] window.onbeforeprint / onafterprint registered');
    
    /* ── Attach button click ── */
    var btn = document.getElementById(PRINT_BTN_ID);
    if (!btn) {
      console.warn('[Print] Print button #' + PRINT_BTN_ID + ' not found in DOM');
      /* Don't return — print events still work via keyboard shortcut */
    } else {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('[Print] Print button clicked');
        handlePrint();
      });
      
      /* Keyboard accessibility */
      btn.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePrint();
        }
      });
      
      console.log('[Print] Print button listener attached');
    }
    
    _printSetupDone = true;
    console.log('[Print] setupPrintButton complete');
  }
  
  /* ═══════════════════════════════════════════════════════
     PUBLIC: isPrinting
  ═══════════════════════════════════════════════════════ */
  
  /**
   * Returns true if print dialog is currently open.
   * @returns {boolean}
   */
  function isPrinting() {
    return _isPrinting;
  }
  
  /* ═══════════════════════════════════════════════════════
     EXPOSE TO WINDOW
  ═══════════════════════════════════════════════════════ */
  window.ResultsPrint = {
    setupPrintButton: setupPrintButton,
    handlePrint: handlePrint,
    isPrinting: isPrinting
  };
  
  console.log('[Print] ResultsPrint ready');
  
})();