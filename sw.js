// ============================================================
// SERVICE WORKER - ANM GNM PRE EXAM
// Version: v3.0.0 - FULL PRE-CACHE (all files)
// ============================================================

const CACHE_NAME = 'anm-gnm-v3';

// =================================================================
// COMPLETE ASSETS LIST - EVERY STATIC FILE IN THE PROJECT
// Generated from your project tree (no file skipped)
// =================================================================
const ASSETS_TO_CACHE = [
  // ==================== ROOT ====================
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.json",
  "./about-exam.html",
  "./strategy.html",
  "./syllabus.html",
  "./sw.js",
  "./.gitignore",
  "./README.md",
  
  // ==================== ROOT JS ====================
  "./js/app.js",
  "./js/config.js",
  "./js/countdown.js",
  "./js/scorer.js",
  "./js/storage.js",
  "./js/utils.js",
  
  // ==================== ROOT CSS ====================
  "./css/base.css",
  "./css/pages.css",
  
  // ==================== ASSETS/CSS ====================
  "./assets/css/base.css",
  "./assets/css/print.css",
  "./assets/css/reset.css",
  "./assets/css/typography.css",
  "./assets/css/utilities.css",
  "./assets/css/variables.css",
  
  // ==================== FONTS ====================
  "./assets/fonts/hind-siliguri/bold.woff2",
  "./assets/fonts/hind-siliguri/medium.woff2",
  "./assets/fonts/hind-siliguri/regular.woff2",
  
  // ==================== IMAGES & SVG ====================
  "./assets/images/og-image.png",
  "./assets/images/placeholder.png",
  "./assets/svg/icons.svg",
  "./assets/svg/logo.svg",
  
  // ==================== ICONS ====================
  "./icons/icon-72.png",
  "./icons/icon-96.png",
  "./icons/icon-128.png",
  "./icons/icon-144.png",
  "./icons/icon-152.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  
  // ==================== PAGES ====================
  "./pages/about.html",
  "./pages/contact.html",
  "./pages/exam-pattern.html",
  "./pages/preparation-strategy.html",
  "./pages/privacy.html",
  "./pages/syllabus.html",
  "./pages/css/pages.css",
  
  // ==================== MOCK TEST ====================
  "./mock-test/index.html",
  "./mock-test/result.html",
  "./mock-test/test.html",
  "./mock-test/css/analysis.css",
  "./mock-test/css/mock-layout.css",
  "./mock-test/css/test-interface.css",
  "./mock-test/css/timer.css",
  "./mock-test/js/mock-app.js",
  "./mock-test/js/mock-engine.js",
  "./mock-test/js/mock-loader.js",
  "./mock-test/js/mock-navigation.js",
  "./mock-test/js/mock-print.js",
  "./mock-test/js/mock-scorer.js",
  "./mock-test/js/mock-storage.js",
  "./mock-test/js/mock-timer.js",
  "./mock-test/js/result-app.js",
  "./mock-test/data/manifest.json",
  "./mock-test/data/mock-01.json",
  "./mock-test/data/mock-2.json",
  "./mock-test/data/mock-3.json",
  "./mock-test/data/mock-4.json",
  "./mock-test/data/mock-5.json",
  "./mock-test/data/mock-6.json",
  "./mock-test/data/mock-7.json",
  "./mock-test/data/mock-8.json",
  "./mock-test/data/mock-9.json",
  "./mock-test/data/mock-10.json",
  
  // ==================== PRACTICE ====================
  "./practice/index.html",
  "./practice/filter-quiz.html",
  "./practice/filter.html",
  "./practice/quiz.html",
  "./practice/result.html",
  "./practice/unit-filter.html",
  "./practice/css/practice-layout.css",
  "./practice/css/quiz-interface.css",
  "./practice/css/result-card.css",
  "./practice/js/filter-app.js",
  "./practice/js/filter-engine.js",
  "./practice/js/filter-history.js",
  "./practice/js/filter-loader.js",
  "./practice/js/practice-app.js",
  "./practice/js/quiz-engine.js",
  "./practice/js/quiz-print.js",
  "./practice/js/quiz-scorer.js",
  "./practice/js/quiz-storage.js",
  "./practice/js/unit-filter-app.js",
  "./practice/data/manifest.json",
  
  // ----- english-grammar (set-01 to set-41) -----
  ...Array.from({ length: 41 }, (_, i) => `./practice/data/english-grammar/set-${String(i+1).padStart(2,'0')}.json`),
  
  // ----- general-knowledge (set-01 to set-42) -----
  ...Array.from({ length: 42 }, (_, i) => `./practice/data/general-knowledge/set-${String(i+1).padStart(2,'0')}.json`),
  
  // ----- reasoning-general-knowledge (set-01 to set-24) -----
  ...Array.from({ length: 24 }, (_, i) => `./practice/data/reasoning-general-knowledge/set-${String(i+1).padStart(2,'0')}.json`),
  
  // ----- general-science (set-01 to set-146) -----
  ...Array.from({ length: 146 }, (_, i) => `./practice/data/general-science/set-${String(i+1).padStart(3,'0')}.json`),
  
  // ----- arithmetic-mathematics (set-01 to set-144) -----
  ...Array.from({ length: 144 }, (_, i) => `./practice/data/arithmetic-mathematics/set-${String(i+1).padStart(3,'0')}.json`),
  
  // ----- life-science (set-01 to set-70) -----
  ...Array.from({ length: 70 }, (_, i) => `./practice/data/life-science/set-${String(i+1).padStart(2,'0')}.json`),
  
  // ==================== PREVIOUS YEAR QUESTIONS (PYQ) ====================
  "./pyq/index.html",
  "./pyq/viewer.html",
  "./pyq/css/pyq-layout.css",
  "./pyq/css/pyq-viewer.css",
  "./pyq/js/pyq-app.js",
  "./pyq/js/pyq-engine.js",
  "./pyq/js/pyq-loader.js",
  "./pyq/js/pyq-print.js",
  "./pyq/js/pyq-scorer.js",
  "./pyq/js/pyq-scoring.js",
  "./pyq/data/manifest.json",
  "./pyq/data/2021-1.json",
  "./pyq/data/2021-2.json",
  "./pyq/data/2022-1.json",
  "./pyq/data/2022-2.json",
  "./pyq/data/2023.json",
  "./pyq/data/2024.json",
  "./pyq/data/2025.json",
  
  // ==================== RESULTS ====================
  "./results/index.html",
  "./results/css/results.css",
  "./results/js/results-app.js",
  "./results/js/results-filter.js",
  "./results/js/results-loader.js",
  "./results/js/results-print.js",
  
  // ==================== SUBJECTS ====================
  "./subjects/index.html",
  "./subjects/css/subjects.css",
  "./subjects/css/chapter.css",
  "./subjects/js/subjects-nav.js",
  "./subjects/js/chapter-reader.js",
  
  // ----- Basic English (12 chapters) -----
  "./subjects/basic-english/index.html",
  "./subjects/basic-english/01-tenses.html",
  "./subjects/basic-english/02-articles.html",
  "./subjects/basic-english/03-prepositions.html",
  "./subjects/basic-english/04-subject-verb-agreement.html",
  "./subjects/basic-english/05-synonyms.html",
  "./subjects/basic-english/06-antonyms.html",
  "./subjects/basic-english/07-reading-comprehension.html",
  "./subjects/basic-english/08-sentence-rearrangement.html",
  "./subjects/basic-english/09-error-spotting.html",
  "./subjects/basic-english/10-fill-in-the-blanks.html",
  "./subjects/basic-english/11-one-word-substitution.html",
  "./subjects/basic-english/12-basic-writing-skills.html",
  
  // ----- General Knowledge (11 chapters) -----
  "./subjects/general-knowledge/index.html",
  "./subjects/general-knowledge/01-indian-history.html",
  "./subjects/general-knowledge/02-indian-freedom-struggle.html",
  "./subjects/general-knowledge/03-geography-physical.html",
  "./subjects/general-knowledge/04-geography-political.html",
  "./subjects/general-knowledge/05-indian-polity.html",
  "./subjects/general-knowledge/06-current-affairs.html",
  "./subjects/general-knowledge/07-sports.html",
  "./subjects/general-knowledge/08-awards-honours.html",
  "./subjects/general-knowledge/09-books-authors.html",
  "./subjects/general-knowledge/10-science-technology.html",
  "./subjects/general-knowledge/11-west-bengal-gk.html",
  
  // ----- Life Science (13 chapters) -----
  "./subjects/life-science/index.html",
  "./subjects/life-science/01-cell-structure-functions.html",
  "./subjects/life-science/02-tissues.html",
  "./subjects/life-science/03-digestive-system.html",
  "./subjects/life-science/04-respiratory-system.html",
  "./subjects/life-science/05-circulatory-system.html",
  "./subjects/life-science/06-excretory-system.html",
  "./subjects/life-science/07-nervous-system.html",
  "./subjects/life-science/08-reproductive-system.html",
  "./subjects/life-science/09-sense-organs.html",
  "./subjects/life-science/10-nutrition-health.html",
  "./subjects/life-science/11-common-diseases.html",
  "./subjects/life-science/12-immunity.html",
  "./subjects/life-science/13-first-aid-fundamentals.html",
  
  // ----- Logical Reasoning (14 chapters) -----
  "./subjects/logical-reasoning/index.html",
  "./subjects/logical-reasoning/01-analogies.html",
  "./subjects/logical-reasoning/02-classification.html",
  "./subjects/logical-reasoning/03-number-series.html",
  "./subjects/logical-reasoning/04-letter-series.html",
  "./subjects/logical-reasoning/05-coding-decoding.html",
  "./subjects/logical-reasoning/06-blood-relations.html",
  "./subjects/logical-reasoning/07-direction-sense.html",
  "./subjects/logical-reasoning/08-syllogism.html",
  "./subjects/logical-reasoning/09-seating-arrangement.html",
  "./subjects/logical-reasoning/10-puzzles.html",
  "./subjects/logical-reasoning/11-statement-assumption.html",
  "./subjects/logical-reasoning/12-cause-effect.html",
  "./subjects/logical-reasoning/13-venn-diagrams.html",
  "./subjects/logical-reasoning/14-non-verbal-reasoning.html",
  
  // ----- Mathematics (14 chapters) -----
  "./subjects/mathematics/index.html",
  "./subjects/mathematics/01-number-system.html",
  "./subjects/mathematics/02-lcm-hcf.html",
  "./subjects/mathematics/03-fractions-decimals.html",
  "./subjects/mathematics/04-ratio-proportion.html",
  "./subjects/mathematics/05-percentages.html",
  "./subjects/mathematics/06-profit-loss.html",
  "./subjects/mathematics/07-simple-interest.html",
  "./subjects/mathematics/08-compound-interest.html",
  "./subjects/mathematics/09-average.html",
  "./subjects/mathematics/10-time-work.html",
  "./subjects/mathematics/11-speed-distance.html",
  "./subjects/mathematics/12-mensuration.html",
  "./subjects/mathematics/13-data-interpretation.html",
  "./subjects/mathematics/14-basic-algebra.html",
  
  // ----- Physical Science (12 chapters) -----
  "./subjects/physical-science/index.html",
  "./subjects/physical-science/01-matter-and-states.html",
  "./subjects/physical-science/02-atomic-structure.html",
  "./subjects/physical-science/03-chemical-reactions.html",
  "./subjects/physical-science/04-acids-bases-salts.html",
  "./subjects/physical-science/05-force-and-motion.html",
  "./subjects/physical-science/06-work-and-energy.html",
  "./subjects/physical-science/07-light-reflection-refraction.html",
  "./subjects/physical-science/08-electricity-and-circuits.html",
  "./subjects/physical-science/09-heat-and-temperature.html",
  "./subjects/physical-science/10-measurements.html",
  "./subjects/physical-science/11-basic-organic-chemistry.html",
  "./subjects/physical-science/12-environmental-chemistry.html",
  
  // ==================== QUESTIONS (TXT FILES) ====================
  // Life Science
  "./questions/life-science/cell_structure_and_functions.txt",
  "./questions/life-science/circulatory_system.txt",
  "./questions/life-science/common_diseases.txt",
  "./questions/life-science/digestive_system.txt",
  "./questions/life-science/excretory_system.txt",
  "./questions/life-science/first_aid_fundamentals.txt",
  "./questions/life-science/immunity.txt",
  "./questions/life-science/nervous_system.txt",
  "./questions/life-science/nutrition_and_health.txt",
  "./questions/life-science/reproductive_system.txt",
  "./questions/life-science/respiratory_system.txt",
  "./questions/life-science/sense_organs.txt",
  "./questions/life-science/tissues.txt",
  
  // GK
  "./questions/gk/awards_and_honours.txt",
  "./questions/gk/books_and_authors.txt",
  "./questions/gk/indian_freedom_struggle.txt",
  "./questions/gk/indian_history.txt",
  "./questions/gk/indian_polity.txt",
  "./questions/gk/physical_geography.txt",
  "./questions/gk/political_geography.txt",
  "./questions/gk/science_and_technology.txt",
  "./questions/gk/sports.txt",
  "./questions/gk/west_bengal_gk.txt",
  
  // Physics
  "./questions/physics/acids_bases_and_salts.txt",
  "./questions/physics/atomic_structure.txt",
  "./questions/physics/basic_organic_chemistry.txt",
  "./questions/physics/chemical_reactions.txt",
  "./questions/physics/electricity_and_circuits.txt",
  "./questions/physics/environmental_chemistry.txt",
  "./questions/physics/force_and_motion.txt",
  "./questions/physics/heat_and_temperature.txt",
  "./questions/physics/light_reflection_and_refraction.txt",
  "./questions/physics/matter_and_states.txt",
  "./questions/physics/measurements.txt",
  "./questions/physics/work_and_energy.txt",
  
  // Logic
  "./questions/logic/analogies.txt",
  "./questions/logic/blood_relations.txt",
  "./questions/logic/cause_and_effect.txt",
  "./questions/logic/classification.txt",
  "./questions/logic/coding_decoding.txt",
  "./questions/logic/direction_sense.txt",
  "./questions/logic/letter_series.txt",
  "./questions/logic/number_series.txt",
  "./questions/logic/puzzles.txt",
  "./questions/logic/seating_arrangement.txt",
  "./questions/logic/statement_and_assumption.txt",
  "./questions/logic/syllogism.txt",
  "./questions/logic/venn_diagrams.txt",
  
  // English
  "./questions/eng/antonyms.txt",
  "./questions/eng/articles.txt",
  "./questions/eng/basic_writing_skills.txt",
  "./questions/eng/error_spotting.txt",
  "./questions/eng/fill_in_the_blanks.txt",
  "./questions/eng/one_word_substitution.txt",
  "./questions/eng/prepositions.txt",
  "./questions/eng/tenses.txt",
  "./questions/eng/synonyms.txt",
  "./questions/eng/sentence_rearrangement.txt",
  "./questions/eng/subject_verb_agreement.txt",
  
  // Math
  "./questions/math/average.txt",
  "./questions/math/basic_algebra.txt",
  "./questions/math/compound_interest.txt",
  "./questions/math/data_interpretation.txt",
  "./questions/math/fractions_and_decimals.txt",
  "./questions/math/lcm_and_hcf.txt",
  "./questions/math/mensuration.txt",
  "./questions/math/number_system.txt",
  "./questions/math/percentages.txt",
  "./questions/math/profit_and_loss.txt",
  "./questions/math/ratio_and_proportion.txt",
  "./questions/math/simple_interest.txt",
  "./questions/math/speed_and_distance.txt",
  "./questions/math/time_and_work.txt"
];

// =================================================================
// SERVICE WORKER INSTALL - Pre-cache every single file
// =================================================================
self.addEventListener('install', event => {
  console.log('[SW] Installing - caching ALL static files');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(asset => 
          cache.add(asset).catch(err => 
            console.warn(`[SW] Failed to cache: ${asset}`, err)
          )
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// =================================================================
// ACTIVATE - Clean up old caches
// =================================================================
self.addEventListener('activate', event => {
  console.log('[SW] Activating - removing old caches');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`[SW] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// =================================================================
// HELPERS
// =================================================================
function isHtmlRequest(request) {
  const accept = request.headers.get('accept') || '';
  return request.mode === 'navigate' || accept.includes('text/html');
}

function isAssetRequest(request) {
  const assetExts = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.json', '.txt'];
  return assetExts.some(ext => request.url.endsWith(ext));
}

function isApiRequest(request) {
  return request.url.includes('/data/') && request.url.endsWith('.json');
}

// =================================================================
// FETCH - Network-first for HTML, cache-first for assets
// =================================================================
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  // HTML pages: network first, fallback to cache, then offline.html
  if (isHtmlRequest(request)) {
    event.respondWith(
      fetch(request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return caches.match('./offline.html');
      })
    );
    return;
  }

  // Static assets: cache first (with background update)
  if (isAssetRequest(request)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => {});
        
        if (cached) {
          fetchPromise.catch(console.error);
          return cached;
        }
        return fetchPromise;
      })
    );
    return;
  }

  // API / data: network only
  if (isApiRequest(request)) {
    event.respondWith(
      fetch(request).catch(() => 
        new Response(JSON.stringify({ error: 'Offline - data not available' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Everything else: network first, fallback to cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// =================================================================
// MESSAGE HANDLER
// =================================================================
self.addEventListener('message', event => {
  if (event.data?.action === 'skipWaiting') {
    self.skipWaiting();
  }
});