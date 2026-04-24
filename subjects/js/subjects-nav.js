/**
 * subjects-nav.js
 * WB ANM GNM 2026 - Subject Dashboard Navigation & Progress
 * Handles localStorage progress tracking and UI updates
 */

(function() {
  'use strict';
  
  // Subject configuration
  const SUBJECTS_CONFIG = {
    'life-science': {
      total: 13,
      elementId: 'progress-life-science',
      percentId: 'percent-life-science'
    },
    'physical-science': {
      total: 12,
      elementId: 'progress-physical-science',
      percentId: 'percent-physical-science'
    },
    'mathematics': {
      total: 14,
      elementId: 'progress-mathematics',
      percentId: 'percent-mathematics'
    },
    'general-knowledge': {
      total: 11,
      elementId: 'progress-general-knowledge',
      percentId: 'percent-general-knowledge'
    },
    'logical-reasoning': {
      total: 14,
      elementId: 'progress-logical-reasoning',
      percentId: 'percent-logical-reasoning'
    },
    'basic-english': {
      total: 12,
      elementId: 'progress-basic-english',
      percentId: 'percent-basic-english'
    }
  };
  
  /**
   * Safely read from localStorage
   * @param {string} key - localStorage key
   * @returns {Object} Parsed object or empty object
   */
  function safeReadStorage(key) {
    try {
      const data = localStorage.getItem(key);
      if (!data) return {};
      
      const parsed = JSON.parse(data);
      
      // Validate structure
      if (typeof parsed !== 'object' || parsed === null) {
        return {};
      }
      
      // Validate each subject has an array
      Object.keys(parsed).forEach(subject => {
        if (!Array.isArray(parsed[subject])) {
          parsed[subject] = [];
        }
      });
      
      return parsed;
    } catch (error) {
      console.warn('Error reading localStorage:', error.message);
      return {};
    }
  }
  
  /**
   * Safely write to localStorage
   * @param {string} key - localStorage key
   * @param {*} data - Data to store
   * @returns {boolean} Success status
   */
  function safeWriteStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn('Error writing to localStorage:', error.message);
      return false;
    }
  }
  
  /**
   * Get chapters read for a specific subject
   * @param {string} subject - Subject key
   * @returns {Array} Array of chapter numbers read
   */
  function getChaptersRead(subject) {
    const data = safeReadStorage('chapters_read');
    
    if (!data[subject] || !Array.isArray(data[subject])) {
      return [];
    }
    
    // Return unique sorted numbers
    return [...new Set(data[subject])].sort((a, b) => a - b);
  }
  
  /**
   * Mark a chapter as read
   * @param {string} subject - Subject key
   * @param {number} chapterNum - Chapter number
   * @returns {boolean} Success status
   */
  function markChapterRead(subject, chapterNum) {
    if (!subject || typeof chapterNum !== 'number' || chapterNum < 1) {
      console.warn('Invalid parameters for markChapterRead');
      return false;
    }
    
    const data = safeReadStorage('chapters_read');
    
    if (!data[subject]) {
      data[subject] = [];
    }
    
    if (!data[subject].includes(chapterNum)) {
      data[subject].push(chapterNum);
    }
    
    return safeWriteStorage('chapters_read', data);
  }
  
  /**
   * Calculate progress percentage
   * @param {Array} read - Array of read chapter numbers
   * @param {number} total - Total chapters
   * @returns {number} Percentage (0-100)
   */
  function calculateProgress(read, total) {
    if (!Array.isArray(read) || total <= 0) {
      return 0;
    }
    
    const unique = [...new Set(read)].filter(n => n > 0 && n <= total);
    const percentage = Math.round((unique.length / total) * 100);
    
    return Math.min(100, Math.max(0, percentage));
  }
  
  /**
   * Update a progress bar element
   * @param {string} elementId - DOM element ID
   * @param {number} percentage - Progress percentage
   */
  function updateProgressBar(elementId, percentage) {
    const bar = document.getElementById(elementId);
    
    if (!bar) {
      return;
    }
    
    // Animate width
    bar.style.width = percentage + '%';
    bar.setAttribute('aria-valuenow', percentage);
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
  }
  
  /**
   * Update percentage text display
   * @param {string} elementId - DOM element ID
   * @param {number} percentage - Progress percentage
   */
  function updatePercentText(elementId, percentage) {
    const text = document.getElementById(elementId);
    
    if (!text) {
      return;
    }
    
    text.textContent = percentage + '% সম্পন্ন';
  }
  
  /**
   * Initialize all subject progress on dashboard
   */
  function initSubjects() {
    // Check if we're on the subjects dashboard
    const grid = document.querySelector('.subjects-grid');
    if (!grid) {
      return; // Not on subjects dashboard
    }
    
    // Update each subject's progress
    Object.keys(SUBJECTS_CONFIG).forEach(subject => {
      const config = SUBJECTS_CONFIG[subject];
      const read = getChaptersRead(subject);
      const percentage = calculateProgress(read, config.total);
      
      updateProgressBar(config.elementId, percentage);
      updatePercentText(config.percentId, percentage);
    });
    
    // Add click listeners to subject cards
    setupCardListeners();
  }
  
  /**
   * Setup click listeners on subject cards
   */
  function setupCardListeners() {
    const cards = document.querySelectorAll('.subject-card');
    
    cards.forEach(card => {
      card.addEventListener('click', function(e) {
        // Only handle if not clicking the button directly
        if (e.target.closest('.subject-btn')) {
          return;
        }
        
        const link = this.getAttribute('data-link');
        if (link) {
          window.location.href = link;
        }
      });
      
      // Add keyboard support
      card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const link = this.getAttribute('data-link');
          if (link) {
            window.location.href = link;
          }
        }
      });
    });
  }
  
  /**
   * Initialize chapter list page (subject index pages)
   */
  function initChapterList() {
    const chapterList = document.querySelector('.chapters-list');
    if (!chapterList) {
      return; // Not on a chapter list page
    }
    
    // Try to get subject from URL or data attribute
    const pathParts = window.location.pathname.split('/');
    const subjectFolder = pathParts[pathParts.length - 2] || '';
    
    if (!subjectFolder || !SUBJECTS_CONFIG[subjectFolder]) {
      return;
    }
    
    const read = getChaptersRead(subjectFolder);
    
    // Mark chapters as read in the list
    const chapterCards = chapterList.querySelectorAll('.chapter-card');
    chapterCards.forEach(card => {
      const href = card.getAttribute('href') || '';
      const match = href.match(/(\d+)-/);
      
      if (match) {
        const chapterNum = parseInt(match[1], 10);
        const statusDiv = card.querySelector('.chapter-status');
        
        if (statusDiv && read.includes(chapterNum)) {
          statusDiv.classList.add('read');
          statusDiv.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
          statusDiv.setAttribute('title', 'পড়া হয়েছে');
        }
      }
    });
  }
  
  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    initSubjects();
    initChapterList();
  });
  
  // Expose for use in chapter pages
  window.WBSubjects = {
    getChaptersRead: getChaptersRead,
    markChapterRead: markChapterRead,
    calculateProgress: calculateProgress,
    safeReadStorage: safeReadStorage,
    safeWriteStorage: safeWriteStorage,
    SUBJECTS_CONFIG: SUBJECTS_CONFIG
  };
  
})();