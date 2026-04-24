/**
 * app.js
 * Main application controller
 * WB ANM GNM 2026 Preparation Platform
 */

(function() {
  'use strict';
  
  let deferredPrompt = null;
  
  // ── Entry Point ────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    console.log('App: Initializing');
    registerServiceWorker();
    setupInstallPrompt();
    updateStats();
    setupOfflineDetection();
  });
  
  // ── Service Worker ─────────────────────────────
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('App: Service Worker not supported');
      return;
    }
    
    navigator.serviceWorker
      .register('./sw.js')
      .then(function(reg) {
        console.log('App: SW registered. Scope:', reg.scope);
      })
      .catch(function(err) {
        console.error('App: SW registration failed:', err);
      });
  }
  
  // ── PWA Install Prompt ─────────────────────────
  window.addEventListener('beforeinstallprompt', function(e) {
    console.log('App: beforeinstallprompt fired');
    e.preventDefault();
    deferredPrompt = e;
    
    const banner = document.getElementById('installBanner');
    if (banner) {
      banner.classList.add('visible');
    }
  });
  
  window.addEventListener('appinstalled', function() {
    console.log('App: PWA installed');
    deferredPrompt = null;
    
    const banner = document.getElementById('installBanner');
    if (banner) {
      banner.classList.remove('visible');
    }
  });
  
  function setupInstallPrompt() {
    const installBtn = document.getElementById('installBtn');
    
    if (!installBtn) {
      console.warn('App: installBtn not found');
      return;
    }
    
    installBtn.addEventListener('click', async function() {
      console.log('App: Install button clicked');
      
      if (!deferredPrompt) {
        console.warn('App: No deferred prompt available');
        return;
      }
      
      try {
        deferredPrompt.prompt();
        
        const result = await deferredPrompt.userChoice;
        console.log('App: Install outcome:', result.outcome);
        
        if (result.outcome === 'accepted') {
          const banner = document.getElementById('installBanner');
          if (banner) {
            banner.classList.remove('visible');
          }
        }
        
        deferredPrompt = null;
      } catch (err) {
        console.error('App: Install prompt error:', err);
      }
    });
  }
  
  // ── Stats ──────────────────────────────────────
  function updateStats() {
    try {
      const mockResultsRaw = localStorage.getItem('mock_results');
      const mockResults = mockResultsRaw ? JSON.parse(mockResultsRaw) : [];
      
      const practiceResultsRaw = localStorage.getItem('practice_results');
      const practiceResults = practiceResultsRaw ? JSON.parse(practiceResultsRaw) : [];
      
      const pyqCountRaw = localStorage.getItem('pyq_paper_count');
      const pyqCount = pyqCountRaw ? JSON.parse(pyqCountRaw) : null;
      
      console.log('App: Stats —', {
        mocks: mockResults.length,
        practice: practiceResults.length
      });
      
      if (pyqCount !== null && typeof pyqCount === 'number') {
        const statPYQEl = document.getElementById('statPYQ');
        if (statPYQEl) {
          // Convert to Bengali numerals for display
          statPYQEl.textContent = toBengaliNumerals(pyqCount);
        }
      }
      
    } catch (err) {
      console.warn('App: Stats error:', err);
    }
  }
  
  // ── Offline Detection ──────────────────────────
  function setupOfflineDetection() {
    const bar = document.getElementById('offlineBar');
    
    function showOffline() {
      console.log('App: Offline');
      if (bar) bar.classList.add('show');
    }
    
    function showOnline() {
      console.log('App: Online');
      if (bar) bar.classList.remove('show');
    }
    
    window.addEventListener('offline', showOffline);
    window.addEventListener('online', showOnline);
    
    if (!navigator.onLine) {
      showOffline();
    }
  }
  
  // ── Bengali Numeral Converter ──────────────────
  function toBengaliNumerals(num) {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, function(d) {
      return bnDigits[parseInt(d, 10)];
    });
  }
  
})();