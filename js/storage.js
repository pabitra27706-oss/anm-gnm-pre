/**
 * storage.js
 * Shared localStorage utility
 * WB ANM GNM 2026 Preparation Platform
 *
 * Global: window.AppStorage
 *   .get(key, defaultValue)
 *   .set(key, value)
 *   .remove(key)
 *   .clear()
 *   .has(key)
 *   .keys()
 */

(function() {
  'use strict';
  
  window.AppStorage = {
    get: getData,
    set: setData,
    remove: removeData,
    clear: clearAll,
    has: hasKey,
    keys: getAllKeys
  };
  
  // ── getData ───────────────────────────────────
  function getData(key, defaultValue) {
    if (!isValidKey(key)) {
      console.warn('Storage.get: invalid key:', key);
      return resolveDefault(defaultValue);
    }
    
    try {
      const raw = localStorage.getItem(key);
      
      if (raw === null || raw === undefined) {
        return resolveDefault(defaultValue);
      }
      
      return JSON.parse(raw);
      
    } catch (err) {
      console.warn('Storage.get: parse error for key "' + key + '":', err);
      return resolveDefault(defaultValue);
    }
  }
  
  // ── setData ───────────────────────────────────
  function setData(key, value) {
    if (!isValidKey(key)) {
      console.error('Storage.set: invalid key:', key);
      return false;
    }
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('Storage.set: error for key "' + key + '":', err);
      return false;
    }
  }
  
  // ── removeData ────────────────────────────────
  function removeData(key) {
    if (!isValidKey(key)) {
      console.error('Storage.remove: invalid key:', key);
      return false;
    }
    
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error('Storage.remove: error for key "' + key + '":', err);
      return false;
    }
  }
  
  // ── clearAll ──────────────────────────────────
  function clearAll() {
    try {
      localStorage.clear();
      console.log('Storage: cleared all data');
      return true;
    } catch (err) {
      console.error('Storage.clear: error:', err);
      return false;
    }
  }
  
  // ── hasKey ────────────────────────────────────
  function hasKey(key) {
    if (!isValidKey(key)) return false;
    
    try {
      return localStorage.getItem(key) !== null;
    } catch (err) {
      console.warn('Storage.has: error for key "' + key + '":', err);
      return false;
    }
  }
  
  // ── getAllKeys ────────────────────────────────
  function getAllKeys() {
    try {
      const result = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k !== null) result.push(k);
      }
      return result;
    } catch (err) {
      console.warn('Storage.keys: error:', err);
      return [];
    }
  }
  
  // ── Helpers ───────────────────────────────────
  function isValidKey(key) {
    return typeof key === 'string' && key.trim().length > 0;
  }
  
  function resolveDefault(defaultValue) {
    return defaultValue !== undefined ? defaultValue : null;
  }
  
  console.log('Storage: AppStorage ready');
  
})();