/* =============================================================
 * BauService — i18n loader
 * =============================================================
 * Loads /i18n/{lang}.json and swaps text/attributes on elements
 * carrying data-i18n attributes.
 *
 * Usage in HTML:
 *   <span data-i18n="nav.start">Start</span>
 *   <a data-i18n-attr="aria-label:header.logoAria" ...>
 *   <a data-i18n="nav.start" data-i18n-attr="title:nav.start" ...>
 *
 * The original German text is kept inline as the fallback in case
 * the JSON file is missing or a key isn't found.
 *
 * Language is resolved from (in order):
 *   1. ?lang= query parameter
 *   2. localStorage 'bauservice_lang'
 *   3. 'de' (default)
 *
 * Switching language updates ?lang= (via history.replaceState),
 * persists to localStorage, and re-renders without a full reload.
 * ============================================================= */
(function () {
  'use strict';

  var SUPPORTED = ['de', 'ru', 'ro', 'en', 'tr'];
  var DEFAULT_LANG = 'de';
  var STORAGE_KEY = 'bauservice_lang';
  var cache = {};        // lang → parsed JSON
  var current = null;    // currently active lang

  // -----------------------------------------------------------
  // Lang resolution
  // -----------------------------------------------------------
  function resolveInitialLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q && SUPPORTED.indexOf(q) !== -1) return q;
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    } catch (e) { /* localStorage blocked */ }
    return DEFAULT_LANG;
  }

  // -----------------------------------------------------------
  // Dictionary fetch with caching
  // -----------------------------------------------------------
  function fetchDict(lang) {
    if (cache[lang]) return Promise.resolve(cache[lang]);
    // Build absolute-from-root path so it works at /, /projekte/, etc.
    return fetch('/i18n/' + lang + '.json', { cache: 'force-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('i18n fetch failed: ' + lang);
        return r.json();
      })
      .then(function (data) { cache[lang] = data; return data; });
  }

  // -----------------------------------------------------------
  // Key lookup: 'footer.copyright' → dict.footer.copyright
  // -----------------------------------------------------------
  function lookup(dict, path) {
    var parts = path.split('.');
    var node = dict;
    for (var i = 0; i < parts.length; i++) {
      if (node == null) return null;
      node = node[parts[i]];
    }
    return (typeof node === 'string') ? node : null;
  }

  // -----------------------------------------------------------
  // Apply a dictionary to the DOM
  // -----------------------------------------------------------
  function applyDict(dict) {
    // Text content
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var text = lookup(dict, key);
      if (text != null) el.textContent = text;
    });
    // Attribute swaps via data-i18n-attr="attr:key,attr:key"
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      var pairs = el.getAttribute('data-i18n-attr').split(',');
      pairs.forEach(function (p) {
        var idx = p.indexOf(':');
        if (idx === -1) return;
        var attr = p.slice(0, idx).trim();
        var key = p.slice(idx + 1).trim();
        var val = lookup(dict, key);
        if (val != null) el.setAttribute(attr, val);
      });
    });
    // html.lang
    document.documentElement.setAttribute('lang', dict._meta && dict._meta.lang || 'de');
  }

  // -----------------------------------------------------------
  // Switch language
  // -----------------------------------------------------------
  function setLang(lang, opts) {
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    if (current === lang && !(opts && opts.force)) return Promise.resolve();
    current = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    // Update URL (no reload)
    var url = new URL(location.href);
    if (lang === DEFAULT_LANG) url.searchParams.delete('lang');
    else url.searchParams.set('lang', lang);
    history.replaceState(null, '', url.toString());
    // Fetch + apply (always re-apply DE too so untranslated keys reset)
    return fetchDict(DEFAULT_LANG)
      .then(function (deDict) {
        applyDict(deDict);                                // baseline
        if (lang !== DEFAULT_LANG) {
          return fetchDict(lang).then(applyDict);          // overlay
        }
      })
      .then(function () { renderSwitcher(); })
      .catch(function (err) {
        console.warn('[i18n]', err);
      });
  }

  // -----------------------------------------------------------
  // Language switcher widget — injected into [data-i18n-switcher]
  // -----------------------------------------------------------
  function renderSwitcher() {
    var hosts = document.querySelectorAll('[data-i18n-switcher]');
    if (!hosts.length) return;

    var META = {
      de: { name: 'Deutsch',  flag: '🇩🇪' },
      ru: { name: 'Русский',  flag: '🇷🇺' },
      ro: { name: 'Română',   flag: '🇷🇴' },
      en: { name: 'English',  flag: '🇬🇧' },
      tr: { name: 'Türkçe',   flag: '🇹🇷' }
    };

    hosts.forEach(function (host) {
      host.innerHTML = '';
      host.classList.add('lang-switcher');

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lang-switcher-btn';
      btn.setAttribute('aria-haspopup', 'true');
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '<span class="lang-flag">' + META[current].flag + '</span>'
        + '<span class="lang-code">' + current.toUpperCase() + '</span>'
        + '<svg class="lang-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>';

      var menu = document.createElement('ul');
      menu.className = 'lang-switcher-menu';
      menu.setAttribute('role', 'menu');
      SUPPORTED.forEach(function (lang) {
        var li = document.createElement('li');
        li.setAttribute('role', 'none');
        var a = document.createElement('button');
        a.type = 'button';
        a.setAttribute('role', 'menuitem');
        a.setAttribute('data-lang', lang);
        if (lang === current) a.setAttribute('aria-current', 'true');
        a.innerHTML = '<span class="lang-flag">' + META[lang].flag + '</span>'
          + '<span class="lang-name">' + META[lang].name + '</span>';
        a.addEventListener('click', function () {
          close();
          setLang(lang);
        });
        li.appendChild(a);
        menu.appendChild(li);
      });

      function open() {
        host.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        document.addEventListener('click', onDocClick, true);
        document.addEventListener('keydown', onKey);
      }
      function close() {
        host.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', onDocClick, true);
        document.removeEventListener('keydown', onKey);
      }
      function onDocClick(e) { if (!host.contains(e.target)) close(); }
      function onKey(e) { if (e.key === 'Escape') close(); }

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        host.classList.contains('open') ? close() : open();
      });

      host.appendChild(btn);
      host.appendChild(menu);
    });
  }

  // -----------------------------------------------------------
  // Inject CSS for the switcher widget (one-shot, idempotent)
  // -----------------------------------------------------------
  function injectStyles() {
    if (document.getElementById('i18n-switcher-styles')) return;
    var css = ''
      + '.lang-switcher{position:relative;display:inline-block;font-family:inherit}'
      + '.lang-switcher-btn{display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid rgba(255,255,255,0.12);color:inherit;padding:6px 10px;border-radius:6px;cursor:pointer;font:600 13px/1 inherit;letter-spacing:.06em;transition:border-color .2s,background .2s}'
      + '.lang-switcher-btn:hover{border-color:rgba(212,165,68,.6);background:rgba(212,165,68,.06)}'
      + '.lang-switcher-btn .lang-flag{font-size:14px;line-height:1}'
      + '.lang-switcher-btn .lang-code{font-weight:700;letter-spacing:.1em}'
      + '.lang-switcher-btn .lang-chev{transition:transform .2s;opacity:.7}'
      + '.lang-switcher.open .lang-switcher-btn{border-color:rgba(212,165,68,.6);background:rgba(212,165,68,.08)}'
      + '.lang-switcher.open .lang-chev{transform:rotate(180deg)}'
      + '.lang-switcher-menu{position:absolute;top:calc(100% + 6px);right:0;list-style:none;margin:0;padding:4px;min-width:160px;background:#111;border:1px solid rgba(212,165,68,.3);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.5);opacity:0;visibility:hidden;transform:translateY(-4px);transition:opacity .15s,transform .15s,visibility .15s;z-index:1000}'
      + '.lang-switcher.open .lang-switcher-menu{opacity:1;visibility:visible;transform:translateY(0)}'
      + '.lang-switcher-menu li{margin:0;padding:0}'
      + '.lang-switcher-menu button{display:flex;align-items:center;gap:10px;width:100%;background:transparent;border:0;color:#fff;padding:8px 12px;border-radius:4px;cursor:pointer;font:500 14px/1 inherit;text-align:left}'
      + '.lang-switcher-menu button:hover{background:rgba(212,165,68,.12);color:#f0c66e}'
      + '.lang-switcher-menu button[aria-current="true"]{background:rgba(212,165,68,.08);color:#d4a544}'
      + '.lang-switcher-menu .lang-flag{font-size:16px}'
      + '.lang-switcher-menu .lang-name{font-weight:500}'
      + '@media (max-width:560px){.lang-switcher-btn .lang-code{display:none}.lang-switcher-menu{right:auto;left:0}}';
    var s = document.createElement('style');
    s.id = 'i18n-switcher-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // -----------------------------------------------------------
  // Bootstrap
  // -----------------------------------------------------------
  function init() {
    injectStyles();
    var lang = resolveInitialLang();
    setLang(lang, { force: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging / external triggers
  window.BauI18n = { setLang: setLang, current: function () { return current; } };
})();
