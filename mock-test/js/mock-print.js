/* ============================================================
   MOCK-PRINT.JS
   WB ANM GNM 2026 - Print Controller
   ============================================================ */

(function() {
  'use strict';
  
  document.addEventListener('DOMContentLoaded', function() {
    console.log('MockPrint: DOM ready');
    bindPrintButton();
    setupPrintHooks();
  });
  
  function bindPrintButton() {
    var printBtn = document.getElementById('printBtn');
    
    if (!printBtn) {
      console.warn('MockPrint: #printBtn not found — print button skipped');
      return;
    }
    
    printBtn.addEventListener('click', function() {
      console.log('MockPrint: Print button clicked');
      preparePrint();
      window.print();
    });
    
    console.log('MockPrint: Print button bound');
  }
  
  function preparePrint() {
    console.log('MockPrint: preparePrint()');
    
    /* Expand all collapsed review items */
    var reviewItems = document.querySelectorAll('.review-item');
    reviewItems.forEach(function(item) {
      if (!item.classList.contains('expanded')) {
        item.classList.add('expanded');
        item.dataset.expandedByPrint = 'true';
      }
    });
    
    /* Show all filter groups */
    var reviewList = document.getElementById('reviewList');
    if (reviewList) {
      var hiddenItems = reviewList.querySelectorAll('[style*="display: none"]');
      hiddenItems.forEach(function(el) {
        el.dataset.hiddenByPrint = el.style.display;
        el.style.display = '';
      });
    }
  }
  
  function restoreAfterPrint() {
    console.log('MockPrint: restoreAfterPrint()');
    
    /* Collapse items that were expanded for print */
    var expandedByPrint = document.querySelectorAll(
      '[data-expanded-by-print="true"]'
    );
    expandedByPrint.forEach(function(item) {
      item.classList.remove('expanded');
      delete item.dataset.expandedByPrint;
    });
    
    /* Re-hide items */
    var hiddenByPrint = document.querySelectorAll('[data-hidden-by-print]');
    hiddenByPrint.forEach(function(el) {
      el.style.display = el.dataset.hiddenByPrint;
      delete el.dataset.hiddenByPrint;
    });
  }
  
  function setupPrintHooks() {
    if (typeof window.matchMedia === 'function') {
      var mediaQuery = window.matchMedia('print');
      
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', function(mq) {
          if (mq.matches) {
            console.log('MockPrint: Print dialog opened');
            preparePrint();
          } else {
            console.log('MockPrint: Print dialog closed');
            restoreAfterPrint();
          }
        });
      }
    }
    
    window.onbeforeprint = function() {
      console.log('MockPrint: onbeforeprint');
      document.body.classList.add('is-printing');
    };
    
    window.onafterprint = function() {
      console.log('MockPrint: onafterprint');
      document.body.classList.remove('is-printing');
      restoreAfterPrint();
    };
  }
  
  console.log('MockPrint: Module loaded');
  
}());