/**
 * chapter-reader.js
 * WB ANM GNM 2026 - Chapter Page Features
 * Handles print, progress marking, navigation, reading time
 */

(function() {
  'use strict';

  /**
   * Get subject and chapter from data attributes
   * @returns {Object|null} {subject, chapter} or null
   */
  function getChapterInfo() {
    const body = document.body;
    
    if (!body) {
      return null;
    }
    
    const subject = body.getAttribute('data-subject');
    const chapterStr = body.getAttribute('data-chapter');
    
    if (!subject || !chapterStr) {
      console.warn('Missing data-subject or data-chapter attribute on body');
      return null;
    }
    
    const chapter = parseInt(chapterStr, 10);
    
    if (isNaN(chapter) || chapter < 1) {
      console.warn('Invalid chapter number:', chapterStr);
      return null;
    }
    
    return { subject, chapter };
  }

  /**
   * Mark current chapter as read in localStorage
   */
  function markCurrentChapterRead() {
    const info = getChapterInfo();
    
    if (!info) {
      return;
    }
    
    try {
      // Try using the exposed API from subjects-nav.js
      if (window.WBSubjects && typeof window.WBSubjects.markChapterRead === 'function') {
        window.WBSubjects.markChapterRead(info.subject, info.chapter);
      } else {
        // Fallback: direct localStorage access
        const data = JSON.parse(localStorage.getItem('chapters_read') || '{}');
        
        if (!data[info.subject]) {
          data[info.subject] = [];
        }
        
        if (!data[info.subject].includes(info.chapter)) {
          data[info.subject].push(info.chapter);
          localStorage.setItem('chapters_read', JSON.stringify(data));
        }
      }
      
      // Show completed badge
      showCompletedBadge();
    } catch (error) {
      console.warn('Error marking chapter as read:', error.message);
    }
  }

  /**
   * Show "Chapter Completed" badge
   */
  function showCompletedBadge() {
    const badge = document.querySelector('.completed-badge');
    
    if (!badge) {
      return;
    }
    
    badge.classList.add('visible');
    
    // Optional: Hide after some time
    setTimeout(function() {
      badge.style.opacity = '0';
      badge.style.transition = 'opacity 0.5s ease';
      
      setTimeout(function() {
        badge.classList.remove('visible');
        badge.style.opacity = '1';
      }, 500);
    }, 3000);
  }

  /**
   * Setup print button functionality
   */
  function setupPrintButton() {
    const printBtn = document.getElementById('printBtn');
    
    if (!printBtn) {
      return;
    }
    
    printBtn.addEventListener('click', function() {
      window.print();
    });
    
    // Also support keyboard
    printBtn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.print();
      }
    });
  }

  /**
   * Setup previous/next navigation
   */
  function setupNavigation() {
    const info = getChapterInfo();
    
    if (!info) {
      return;
    }
    
    // Get total chapters from config or data attribute
    let totalChapters = 0;
    
    if (window.WBSubjects && window.WBSubjects.SUBJECTS_CONFIG) {
      const config = window.WBSubjects.SUBJECTS_CONFIG[info.subject];
      if (config) {
        totalChapters = config.total;
      }
    }
    
    // Fallback: try data attribute
    if (!totalChapters) {
      const totalAttr = document.body.getAttribute('data-total-chapters');
      if (totalAttr) {
        totalChapters = parseInt(totalAttr, 10);
      }
    }
    
    // If still unknown, just hide disabled buttons
    if (!totalChapters || isNaN(totalChapters)) {
      totalChapters = 99; // Assume more chapters exist
    }
    
    // Update previous button
    const prevBtn = document.querySelector('.nav-prev');
    if (prevBtn) {
      if (info.chapter <= 1) {
        prevBtn.style.visibility = 'hidden';
        prevBtn.setAttribute('aria-hidden', 'true');
      } else {
        const prevNum = info.chapter - 1;
        const prevHref = buildChapterHref(info.subject, prevNum);
        prevBtn.setAttribute('href', prevHref);
        prevBtn.style.visibility = 'visible';
        prevBtn.setAttribute('aria-hidden', 'false');
      }
    }
    
    // Update next button
    const nextBtn = document.querySelector('.nav-next');
    if (nextBtn) {
      if (info.chapter >= totalChapters) {
        nextBtn.style.visibility = 'hidden';
        nextBtn.setAttribute('aria-hidden', 'true');
      } else {
        const nextNum = info.chapter + 1;
        const nextHref = buildChapterHref(info.subject, nextNum);
        nextBtn.setAttribute('href', nextHref);
        nextBtn.style.visibility = 'visible';
        nextBtn.setAttribute('aria-hidden', 'false');
      }
    }
  }

  /**
   * Build chapter URL
   * @param {string} subject - Subject key
   * @param {number} chapterNum - Chapter number
   * @returns {string} Relative URL
   */
  function buildChapterHref(subject, chapterNum) {
    const numStr = String(chapterNum).padStart(2, '0');
    
    // Map subject to chapter filenames (simplified)
    const chapterMap = {
      'life-science': [
        'cell-structure-functions', 'tissues', 'digestive-system',
        'respiratory-system', 'circulatory-system', 'excretory-system',
        'nervous-system', 'reproductive-system', 'sense-organs',
        'nutrition-health', 'common-diseases', 'immunity',
        'first-aid-fundamentals'
      ],
      'mathematics': [
        'number-system', 'lcm-hcf', 'fractions-decimals',
        'ratio-proportion', 'percentages', 'profit-loss',
        'simple-interest', 'compound-interest', 'average',
        'time-work', 'speed-distance', 'mensuration',
        'data-interpretation', 'basic-algebra'
      ],
      'general-knowledge': [
        'indian-history', 'indian-freedom-struggle', 'geography-physical',
        'geography-political', 'indian-polity', 'current-affairs',
        'sports', 'awards-honours', 'books-authors',
        'science-technology', 'west-bengal-gk'
      ]
    };
    
    const names = chapterMap[subject];
    
    if (names && names[chapterNum - 1]) {
      return `./${numStr}-${names[chapterNum - 1]}.html`;
    }
    
    // Fallback
    return `./${numStr}-chapter.html`;
  }

  /**
   * Estimate and display reading time
   */
  function estimateReadingTime() {
    const content = document.querySelector('.chapter-content');
    const readingTimeEl = document.querySelector('.reading-time');
    
    if (!content || !readingTimeEl) {
      return;
    }
    
    const text = content.textContent || '';
    const wordCount = text.trim().split(/\s+/).length;
    
    // Average reading speed: 200 words per minute
    const minutes = Math.max(1, Math.ceil(wordCount / 200));
    
    readingTimeEl.textContent = '⏱️ পড়ার সময়: ' + minutes + ' মিনিট';
  }

  /**
   * Add scroll progress indicator
   */
  function setupScrollProgress() {
    const indicator = document.querySelector('.scroll-progress');
    
    if (!indicator) {
      return;
    }
    
    window.addEventListener('scroll', function() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      if (docHeight <= 0) {
        indicator.style.width = '0%';
        return;
      }
      
      const progress = Math.min(100, Math.round((scrollTop / docHeight) * 100));
      indicator.style.width = progress + '%';
    }, { passive: true });
  }

  /**
   * Add keyboard navigation (arrow keys for prev/next)
   */
  function setupKeyboardNav() {
    document.addEventListener('keydown', function(e) {
      // Only if not in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
      
      if (e.key === 'ArrowLeft' && e.altKey) {
        const prevBtn = document.querySelector('.nav-prev');
        if (prevBtn && prevBtn.style.visibility !== 'hidden') {
          window.location.href = prevBtn.getAttribute('href');
        }
      }
      
      if (e.key === 'ArrowRight' && e.altKey) {
        const nextBtn = document.querySelector('.nav-next');
        if (nextBtn && nextBtn.style.visibility !== 'hidden') {
          window.location.href = nextBtn.getAttribute('href');
        }
      }
    });
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    markCurrentChapterRead();
    setupPrintButton();
    setupNavigation();
    estimateReadingTime();
    setupScrollProgress();
    setupKeyboardNav();
  });

})();