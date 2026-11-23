// ============================================================================
//  APP CONFIGURATION
//
//  mode: 'demo'     -> everything runs inside the browser (IndexedDB). Used when the
//                      site is opened from disk / USB or on localhost. NOT for production.
//  mode: 'supabase' -> the live site: data lives in Supabase (database/supabase.sql).
//                      Chosen automatically when the site is served from the web
//                      (e.g. GitHub Pages) and SUPABASE_URL is filled in below.
//  mode: 'server'   -> a custom REST backend (docs/API_CONTRACT.md).
//
//  The anon key is meant to be public: the database only allows the api_* functions,
//  and each one checks the PIN / Student ID session itself.
// ============================================================================
(function () {
  var SUPABASE_URL = '';        // e.g. 'https://abcdefghijkl.supabase.co'
  var SUPABASE_ANON_KEY = '';   // Supabase → Project Settings → API → "anon public" key
  var onWeb = /^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  window.APP_CONFIG = {
    mode: SUPABASE_URL && onWeb ? 'supabase' : 'demo',
    apiBase: '/api',
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    academicYear: '2026–2027',
    schoolNameEn: 'Zayed Educational Complex – Suhaila',
    schoolNameAr: 'مجمع زايد التعليمي - سهيلة',
  };
  // Demo mode only: the offline student list (never deployed to the live site).
  if (window.APP_CONFIG.mode === 'demo') document.write('<script src="data/students-data.js"><\/script>');
})();
