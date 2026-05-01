# WB ANM GNM 2026 প্রস্তুতি 🏥

> West Bengal ANM GNM প্রবেশিকা পরীক্ষা ২০২৬-এর জন্য সম্পূর্ণ বিনামূল্যে অনলাইন প্রস্তুতি প্ল্যাটফর্ম

[![GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-blue?logo=github)](https://github.com)
[![PWA](https://img.shields.io/badge/PWA-Ready-green?logo=pwa)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Language: Bengali](https://img.shields.io/badge/Language-Bengali-orange)](README.md)

---

## 📋 প্রকল্প বিবরণ

WB ANM GNM 2026 Preparation Platform হলো একটি Progressive Web App (PWA)
যা West Bengal Joint Entrance Exam Board (WB JEEB) আয়োজিত Auxiliary Nurse
& Midwifery (ANM) এবং General Nursing and Midwifery (GNM) প্রবেশিকা পরীক্ষার
জন্য তৈরি করা হয়েছে।

অ্যাপটি সম্পূর্ণ **বাংলা ভাষায়**, **অফলাইন ব্যবহারযোগ্য** এবং স্মার্টফোনে
ইনস্টলযোগ্য।

---

## ✨ বৈশিষ্ট্যসমূহ

### 📚 বিষয়ভিত্তিক পড়াশোনা
- জীবন বিজ্ঞান (Life Science)
- ভৌত বিজ্ঞান (Physical Science)
- ইংরেজি (Basic English)
- গণিত (Mathematics)
- সাধারণ জ্ঞান (General Knowledge)
- যুক্তিবিদ্যা (Logical Reasoning)

### 📝 পুরনো প্রশ্নপত্র (PYQ)
- বিগত বছরের প্রশ্ন ও সমাধান
- প্যাটার্ন বিশ্লেষণ

### ✏️ MCQ অনুশীলন
- বিষয়ভিত্তিক প্রশ্নোত্তর
- তাৎক্ষণিক ফিডব্যাক
- ভুল উত্তর পর্যালোচনা

### ⏱️ মক টেস্ট
- ১০০ প্রশ্ন / ৯০ মিনিট
- Category-1 ও Category-2 উভয় ধরনের প্রশ্ন
- নেগেটিভ মার্কিং সিমুলেশন
- বিস্তারিত ফলাফল বিশ্লেষণ

### 📊 ফলাফল ও Analytics
- পারফরম্যান্স ট্র্যাকিং
- বিষয়ভিত্তিক দুর্বলতা চিহ্নিতকরণ
- অগ্রগতির গ্রাফ

### 📱 PWA সুবিধা
- হোম স্ক্রিনে ইনস্টলযোগ্য
- অফলাইনে কাজ করে
- দ্রুত লোড হয়
- পুশ নোটিফিকেশন (আসছে)

---

## 🛠️ টেক স্ট্যাক

| প্রযুক্তি | বিবরণ |
|-----------|-------|
| HTML5 | Semantic markup |
| CSS3 | Custom Properties, Grid, Flexbox |
| Vanilla JS (ES6+) | No frameworks, no dependencies |
| Service Worker | Offline support & caching |
| Web App Manifest | PWA installability |
| Google Fonts | Hind Siliguri (Bengali typography) |
| GitHub Pages | Free hosting |

---

## 📁 ফোল্ডার স্ট্রাকচার
anm-gnm-prep/
│
├── assets/
│   ├── css/
│   │   ├── base.css
│   │   ├── print.css
│   │   ├── reset.css
│   │   ├── typography.css
│   │   ├── utilities.css
│   │   └── variables.css
│   ├── fonts/
│   │   └── hind-siliguri/
│   │       ├── bold.woff2
│   │       ├── medium.woff2
│   │       └── regular.woff2
│   ├── images/
│   │   ├── og-image.png
│   │   └── placeholder.png
│   └── svg/
│       ├── icons.svg
│       └── logo.svg
│
├── css/
│   ├── base.css
│   └── pages.css
│
├── icons/
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-72.png
│   └── icon-96.png
│
├── js/
│   ├── app.js
│   ├── config.js
│   ├── countdown.js
│   ├── scorer.js
│   ├── storage.js
│   └── utils.js
│
├── mock-test/
│   ├── css/
│   │   ├── analysis.css
│   │   ├── mock-layout.css
│   │   ├── test-interface.css
│   │   └── timer.css
│   ├── data/
│   │   ├── manifest.json
│   │   ├── mock-01.json
│   │   ├── mock-2.json
│   │   ├── mock-3.json
│   │   ├── mock-4.json
│   │   ├── mock-5.json
│   │   ├── mock-6.json
│   │   ├── mock-7.json
│   │   ├── mock-8.json
│   │   ├── mock-9.json
│   │   └── mock-10.json
│   ├── js/
│   │   ├── mock-app.js
│   │   ├── mock-engine.js
│   │   ├── mock-loader.js
│   │   ├── mock-navigation.js
│   │   ├── mock-print.js
│   │   ├── mock-scorer.js
│   │   ├── mock-storage.js
│   │   ├── mock-timer.js
│   │   └── result-app.js
│   ├── index.html
│   ├── result.html
│   └── test.html
│
├── pages/
│   ├── css/
│   │   └── pages.css
│   ├── about.html
│   ├── contact.html
│   ├── exam-pattern.html
│   ├── preparation-strategy.html
│   ├── privacy.html
│   └── syllabus.html
│
├── practice/
│   ├── css/
│   │   ├── practice-layout.css
│   │   ├── quiz-interface.css
│   │   └── result-card.css
│   ├── data/
│   │   ├── manifest.json
│   │   ├── english-grammar/
│   │   │   └── set-01.json to set-41.json (41 files)
│   │   ├── general-knowledge/
│   │   │   └── set-01.json to set-42.json (42 files)
│   │   ├── reasoning-general-knowledge/
│   │   │   └── set-01.json to set-24.json (24 files)
│   │   ├── general-science/
│   │   │   └── set-01.json to set-146.json (146 files)
│   │   ├── arithmetic-mathematics/
│   │   │   └── set-01.json to set-144.json (144 files)
│   │   └── life-science/
│   │       └── set-01.json to set-70.json (70 files)
│   ├── js/
│   │   ├── filter-app.js
│   │   ├── filter-engine.js
│   │   ├── filter-history.js
│   │   ├── filter-loader.js
│   │   ├── practice-app.js
│   │   ├── quiz-engine.js
│   │   ├── quiz-print.js
│   │   ├── quiz-scorer.js
│   │   ├── quiz-storage.js
│   │   └── unit-filter-app.js
│   ├── filter-quiz.html
│   ├── filter.html
│   ├── index.html
│   ├── quiz.html
│   ├── result.html
│   └── unit-filter.html
│
├── pyq/
│   ├── css/
│   │   ├── pyq-layout.css
│   │   └── pyq-viewer.css
│   ├── data/
│   │   ├── manifest.json
│   │   ├── 2021-1.json
│   │   ├── 2021-2.json
│   │   ├── 2022-1.json
│   │   ├── 2022-2.json
│   │   ├── 2023.json
│   │   ├── 2024.json
│   │   └── 2025.json
│   ├── js/
│   │   ├── pyq-app.js
│   │   ├── pyq-engine.js
│   │   ├── pyq-loader.js
│   │   ├── pyq-print.js
│   │   ├── pyq-scorer.js
│   │   └── pyq-scoring.js
│   ├── index.html
│   └── viewer.html
│
├── results/
│   ├── css/
│   │   └── results.css
│   ├── js/
│   │   ├── results-app.js
│   │   ├── results-filter.js
│   │   ├── results-loader.js
│   │   └── results-print.js
│   └── index.html
│
├── subjects/
│   ├── css/
│   │   ├── chapter.css
│   │   └── subjects.css
│   ├── js/
│   │   ├── chapter-reader.js
│   │   └── subjects-nav.js
│   ├── basic-english/
│   │   ├── index.html
│   │   ├── 01-tenses.html
│   │   ├── 02-articles.html
│   │   ├── 03-prepositions.html
│   │   ├── 04-subject-verb-agreement.html
│   │   ├── 05-synonyms.html
│   │   ├── 06-antonyms.html
│   │   ├── 07-reading-comprehension.html
│   │   ├── 08-sentence-rearrangement.html
│   │   ├── 09-error-spotting.html
│   │   ├── 10-fill-in-the-blanks.html
│   │   ├── 11-one-word-substitution.html
│   │   └── 12-basic-writing-skills.html
│   ├── general-knowledge/
│   │   ├── index.html
│   │   ├── 01-indian-history.html
│   │   ├── 02-indian-freedom-struggle.html
│   │   ├── 03-geography-physical.html
│   │   ├── 04-geography-political.html
│   │   ├── 05-indian-polity.html
│   │   ├── 06-current-affairs.html
│   │   ├── 07-sports.html
│   │   ├── 08-awards-honours.html
│   │   ├── 09-books-authors.html
│   │   ├── 10-science-technology.html
│   │   └── 11-west-bengal-gk.html
│   ├── life-science/
│   │   ├── index.html
│   │   ├── 01-cell-structure-functions.html
│   │   ├── 02-tissues.html
│   │   ├── 03-digestive-system.html
│   │   ├── 04-respiratory-system.html
│   │   ├── 05-circulatory-system.html
│   │   ├── 06-excretory-system.html
│   │   ├── 07-nervous-system.html
│   │   ├── 08-reproductive-system.html
│   │   ├── 09-sense-organs.html
│   │   ├── 10-nutrition-health.html
│   │   ├── 11-common-diseases.html
│   │   ├── 12-immunity.html
│   │   └── 13-first-aid-fundamentals.html
│   ├── logical-reasoning/
│   │   ├── index.html
│   │   ├── 01-analogies.html
│   │   ├── 02-classification.html
│   │   ├── 03-number-series.html
│   │   ├── 04-letter-series.html
│   │   ├── 05-coding-decoding.html
│   │   ├── 06-blood-relations.html
│   │   ├── 07-direction-sense.html
│   │   ├── 08-syllogism.html
│   │   ├── 09-seating-arrangement.html
│   │   ├── 10-puzzles.html
│   │   ├── 11-statement-assumption.html
│   │   ├── 12-cause-effect.html
│   │   ├── 13-venn-diagrams.html
│   │   └── 14-non-verbal-reasoning.html
│   ├── mathematics/
│   │   ├── index.html
│   │   ├── 01-number-system.html
│   │   ├── 02-lcm-hcf.html
│   │   ├── 03-fractions-decimals.html
│   │   ├── 04-ratio-proportion.html
│   │   ├── 05-percentages.html
│   │   ├── 06-profit-loss.html
│   │   ├── 07-simple-interest.html
│   │   ├── 08-compound-interest.html
│   │   ├── 09-average.html
│   │   ├── 10-time-work.html
│   │   ├── 11-speed-distance.html
│   │   ├── 12-mensuration.html
│   │   ├── 13-data-interpretation.html
│   │   └── 14-basic-algebra.html
│   ├── physical-science/
│   │   ├── index.html
│   │   ├── 01-matter-and-states.html
│   │   ├── 02-atomic-structure.html
│   │   ├── 03-chemical-reactions.html
│   │   ├── 04-acids-bases-salts.html
│   │   ├── 05-force-and-motion.html
│   │   ├── 06-work-and-energy.html
│   │   ├── 07-light-reflection-refraction.html
│   │   ├── 08-electricity-and-circuits.html
│   │   ├── 09-heat-and-temperature.html
│   │   ├── 10-measurements.html
│   │   ├── 11-basic-organic-chemistry.html
│   │   └── 12-environmental-chemistry.html
│   └── index.html
│
├── questions/
│   ├── life-science/
│   │   ├── cell_structure_and_functions.txt
│   │   ├── circulatory_system.txt
│   │   ├── common_diseases.txt
│   │   ├── digestive_system.txt
│   │   ├── excretory_system.txt
│   │   ├── first_aid_fundamentals.txt
│   │   ├── immunity.txt
│   │   ├── nervous_system.txt
│   │   ├── nutrition_and_health.txt
│   │   ├── reproductive_system.txt
│   │   ├── respiratory_system.txt
│   │   ├── sense_organs.txt
│   │   └── tissues.txt
│   ├── gk/
│   │   ├── awards_and_honours.txt
│   │   ├── books_and_authors.txt
│   │   ├── indian_freedom_struggle.txt
│   │   ├── indian_history.txt
│   │   ├── indian_polity.txt
│   │   ├── physical_geography.txt
│   │   ├── political_geography.txt
│   │   ├── science_and_technology.txt
│   │   ├── sports.txt
│   │   └── west_bengal_gk.txt
│   ├── physics/
│   │   ├── acids_bases_and_salts.txt
│   │   ├── atomic_structure.txt
│   │   ├── basic_organic_chemistry.txt
│   │   ├── chemical_reactions.txt
│   │   ├── electricity_and_circuits.txt
│   │   ├── environmental_chemistry.txt
│   │   ├── force_and_motion.txt
│   │   ├── heat_and_temperature.txt
│   │   ├── light_reflection_and_refraction.txt
│   │   ├── matter_and_states.txt
│   │   ├── measurements.txt
│   │   └── work_and_energy.txt
│   ├── logic/
│   │   ├── analogies.txt
│   │   ├── blood_relations.txt
│   │   ├── cause_and_effect.txt
│   │   ├── classification.txt
│   │   ├── coding_decoding.txt
│   │   ├── direction_sense.txt
│   │   ├── letter_series.txt
│   │   ├── number_series.txt
│   │   ├── puzzles.txt
│   │   ├── seating_arrangement.txt
│   │   ├── statement_and_assumption.txt
│   │   ├── syllogism.txt
│   │   └── venn_diagrams.txt
│   ├── eng/
│   │   ├── antonyms.txt
│   │   ├── articles.txt
│   │   ├── basic_writing_skills.txt
│   │   ├── error_spotting.txt
│   │   ├── fill_in_the_blanks.txt
│   │   ├── one_word_substitution.txt
│   │   ├── prepositions.txt
│   │   ├── tenses.txt
│   │   ├── synonyms.txt
│   │   ├── sentence_rearrangement.txt
│   │   └── subject_verb_agreement.txt
│   └── math/
│       ├── average.txt
│       ├── basic_algebra.txt
│       ├── compound_interest.txt
│       ├── data_interpretation.txt
│       ├── fractions_and_decimals.txt
│       ├── lcm_and_hcf.txt
│       ├── mensuration.txt
│       ├── number_system.txt
│       ├── percentages.txt
│       ├── profit_and_loss.txt
│       ├── ratio_and_proportion.txt
│       ├── simple_interest.txt
│       ├── speed_and_distance.txt
│       └── time_and_work.txt
│
├── .gitignore
├── README.md
├── about-exam.html
├── index.html
├── manifest.json
├── offline.html
├── strategy.html
├── syllabus.html
└── sw.js



---

## 🚀 লোকালি চালানোর পদ্ধতি

### পদ্ধতি ১: VS Code Live Server (সহজ)
```bash
# 1. রিপোজিটরি ক্লোন করুন
git clone https://github.com/pabitra27706-oss/anm-gnm-pre.git

# 2. ফোল্ডারে যান
cd anm-gnm-pre

# 3. VS Code-এ খুলুন
code .

# 4. Live Server এক্সটেনশন ইনস্টল করুন
# তারপর index.html-এ রাইট ক্লিক → "Open with Live Server"