// Content script for GitNinja — only runs on GitHub pages (registered in manifest).
// It injects a toggle panel to collapse/expand file diffs grouped by file extension.

(function () {
  if (location.hostname !== 'github.com') return;
  // Only run on PR "Files changed" views (e.g., /pull/123/files)
  if (!/\/pull\/\d+\/files/.test(location.pathname)) return;

  const SELECTOR = '.copilot-diff-entry, .diff-entry, [data-file-path], .file, .file.js-file, .js-diff-entry, .js-file';
  const PANEL_ID = 'ext-toggle-panel';

  async function injectTogglePanel() {
    try {
      if (document.getElementById(PANEL_ID)) return;

      const entries = Array.from(document.querySelectorAll(SELECTOR));
      if (!entries.length) return;

      const m = new Map();

      entries.forEach(n => {
        const x = (n.dataset.filePath || n.querySelector('[data-file-path]')?.dataset.filePath)?.match(/\.([^.]+)$/)?.[0];
        if (x) (m.get(x) || m.set(x, []).get(x)).push(n);
      });

      const s = [...m.keys()].sort();
      const φ = 0.618033988749895;

      const g = (x, i) => {
        let h = 0;
        for (let c of x) h = ((h << 5) - h) + c.charCodeAt(0);
        return `${((i * φ * 360) + Math.abs(h) % 60) % 360} ${45 + Math.abs(h >> 8) % 35}% ${40 + (x.length * 7) % 20}%`;
      };

      let d = [], t = 0;
      const v = s.map((x, i) => {
        const c = m.get(x).length / entries.length * 100;
        const l = g(x, i);
        d.push(`hsl(${l}) ${t}% ${t + c}%`);
        t += c;
        return `--c${i}:${l}`;
      }).join(';');

      const p = document.createElement('div');
      p.id = PANEL_ID;
      p.classList.add('git-ninja');
      p.setAttribute('role', 'toolbar');
      p.setAttribute('aria-label', 'GitNinja file toggles');
      p.style.cssText = v;
      p.innerHTML = `\n        <div class="ninja-btn" style="--g:conic-gradient(${d})" role="button" tabindex="0" aria-haspopup="true" aria-label="GitNinja menu"></div>\n        <div class="menu" role="menu">\n          <div class="controls">\n            <button class="gitninja-expand" type="button" aria-label="Expand all">Expand All</button>\n            <button class="gitninja-collapse" type="button" aria-label="Collapse all">Collapse All</button>\n          </div>\n          ${s.map((x, i) => `\n            <label style="--i:${i}">\n              <span>${x} (${(m.get(x).length / entries.length * 100).toFixed(1)}%)</span>\n              <input type="checkbox" data-ext="${x}" checked aria-checked="true">\n            </label>\n          `).join('')}\n        </div>\n      `;

      document.body.appendChild(p);
      // replace presentational structure with panel.html and populate list via template
      try {
        const html = await fetch(chrome.runtime.getURL('panel.html')).then(r => r.text());
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const fragmentPanel = tmp.querySelector('#ext-toggle-panel');
        if (fragmentPanel) p.innerHTML = fragmentPanel.innerHTML;
        p.querySelector('.ninja-btn')?.style?.setProperty('--g', `conic-gradient(${d})`);
        const listEl = p.querySelector('.list');
        if (listEl) {
          listEl.innerHTML = '';
          const tpl = tmp.querySelector('#gitninja-label-template')?.content?.firstElementChild;
          s.forEach((x, i) => {
            let label;
            if (tpl) {
              label = tpl.cloneNode(true);
              label.style.cssText = `--i:${i}; --c: var(--c${i})`;
              label.querySelector('span').textContent = `${x} (${(m.get(x).length / entries.length * 100).toFixed(1)}%)`;
              const input = label.querySelector('input');
              input.dataset.ext = x;
              input.checked = true;
              input.setAttribute('aria-checked', 'true');
              input.addEventListener('change', () => input.setAttribute('aria-checked', input.checked ? 'true' : 'false'));
            } else {
              label = document.createElement('label');
              label.style.cssText = `--i:${i}; --c: var(--c${i})`;
              const span = document.createElement('span'); span.textContent = `${x} (${(m.get(x).length / entries.length * 100).toFixed(1)}%)`;
              const input = document.createElement('input'); input.type = 'checkbox'; input.dataset.ext = x; input.checked = true; input.setAttribute('aria-checked', 'true');
              input.addEventListener('change', () => input.setAttribute('aria-checked', input.checked ? 'true' : 'false'));
              label.appendChild(span); label.appendChild(input);
            }
            listEl.appendChild(label);
          });
        }
      } catch (e) { /* ignore */ }

      // add toggle behavior for menu (hover + keyboard) and drag-to-move
      const ninjaBtn = p.querySelector('.ninja-btn');
      const menuEl = p.querySelector('.menu');

      // open/close menu via keyboard/space/enter or click
      menuEl.setAttribute('aria-hidden', 'true');
      ninjaBtn.setAttribute('aria-expanded', 'false');
      function openMenu() { p.classList.add('open'); ninjaBtn.setAttribute('aria-expanded', 'true'); menuEl.setAttribute('aria-hidden', 'false'); }
      function closeMenu() { p.classList.remove('open'); ninjaBtn.setAttribute('aria-expanded', 'false'); menuEl.setAttribute('aria-hidden', 'true'); }
      ninjaBtn.addEventListener('click', () => { if (p.classList.contains('open')) closeMenu(); else openMenu(); });
      ninjaBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); if (p.classList.contains('open')) closeMenu(); else openMenu(); }
        if (e.key === 'ArrowDown') { e.preventDefault(); openMenu(); setTimeout(() => menuEl.querySelector('input, button')?.focus(), 0); }
      });
      // hide on blur/click outside
      document.addEventListener('click', (ev) => { if (!p.contains(ev.target)) closeMenu(); });

      // drag-to-move and persist position
      let dragging = false;
      let startX = 0, startY = 0, startLeft = 0, startTop = 0;
      ninjaBtn.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0) return; // only left mouse
        ev.preventDefault();
        dragging = true;
        p.classList.add('dragging');
        startX = ev.clientX; startY = ev.clientY;
        const rect = p.getBoundingClientRect();
        startLeft = rect.left; startTop = rect.top;
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp, { once: true });
      });
      function onPointerMove(ev) {
        if (!dragging) return;
        const dx = ev.clientX - startX; const dy = ev.clientY - startY;
        const left = `${Math.max(10, startLeft + dx)}px`;
        const top = `${Math.max(10, startTop + dy)}px`;
        p.style.setProperty('--gitninja-left', left);
        p.style.setProperty('--gitninja-top', top);
        p.style.setProperty('--gitninja-right', 'auto');
        p.style.setProperty('--gitninja-bottom', 'auto');
      }
      function onPointerUp(ev) {
        dragging = false; p.classList.remove('dragging');
        document.removeEventListener('pointermove', onPointerMove);
        // persist as CSS variables so defaults continue to come from CSS
        try {
          const left = p.style.getPropertyValue('--gitninja-left') || '';
          const top = p.style.getPropertyValue('--gitninja-top') || '';
          chrome.storage.local.set({ 'gitninja-pos': { left, top } });
        } catch (e) { }
      }

      // restore position if saved
      try {
        chrome.storage.local.get('gitninja-pos', (res) => {
          const pos = res && res['gitninja-pos'];
          if (pos && pos.left && pos.top) {
            p.style.setProperty('--gitninja-left', pos.left);
            p.style.setProperty('--gitninja-top', pos.top);
            p.style.setProperty('--gitninja-right', 'auto');
            p.style.setProperty('--gitninja-bottom', 'auto');
          }
        });
      } catch (e) { }

      // keyboard navigation within menu (up/down to move focus, escape to close)
      menuEl.addEventListener('keydown', (e) => {
        const focusable = Array.from(menuEl.querySelectorAll('input, button'));
        const idx = focusable.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); const next = focusable[(idx + 1) % focusable.length]; next && next.focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); const prev = focusable[(idx - 1 + focusable.length) % focusable.length]; prev && prev.focus(); }
        if (e.key === 'Escape') { closeMenu(); ninjaBtn.focus(); }
      });

      // labels are populated from the `panel.html` template above


      // clicking toggles expansion of the file groups
      p.addEventListener('change', n => {
        if (!n.target.dataset.ext) return;
        m.get(n.target.dataset.ext).forEach(y => {
          const b = y.querySelector('.js-details-target');
          if (b && (b.getAttribute('aria-expanded') === 'true') !== n.target.checked) b.click();
        });
      });

      // initialize: check all inputs and trigger change so files are shown on load
      p.querySelectorAll('input[data-ext]').forEach(inp => {
        inp.checked = true;
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Expand/Collapse controls (buttons in the presentational panel.html)
      const expandBtn = p.querySelector('.gitninja-expand');
      const collapseBtn = p.querySelector('.gitninja-collapse');

      if (expandBtn) {
        expandBtn.addEventListener('click', () => {
          p.querySelectorAll('input[data-ext]').forEach(i => {
            if (!i.checked) { i.checked = true; i.dispatchEvent(new Event('change', { bubbles: true })); }
          });
        });
      }

      if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
          p.querySelectorAll('input[data-ext]').forEach(i => {
            if (i.checked) { i.checked = false; i.dispatchEvent(new Event('change', { bubbles: true })); }
          });
        });
      }

      // styles moved to styles.css (loaded via manifest / content_scripts)


    } catch (err) {
      console.error('GitNinja content script error:', err);
    }
  }

  // SPA helpers: ensure stylesheet and respond to URL changes
  function ensureStyles() {
    if (window.top !== window.self) return;
    try {
      const hasPanelRule = Array.from(document.styleSheets).some(ss => {
        try { return Array.from(ss.cssRules || []).some(r => r.cssText && r.cssText.includes('#ext-toggle-panel')); }
        catch (e) { return false; }
      });
      if (!hasPanelRule && !document.querySelector('link[data-gitninja-styles]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL('styles.css');
        link.setAttribute('data-gitninja-styles', '1');
        document.head.appendChild(link);
      }
    } catch (e) { /* ignore */ }
  }

  function onUrlChange() {
    ensureStyles();
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.remove();

    // re-evaluate observer root and reattach
    try {
      observer.disconnect();
      const root = getObserveRoot();
      observer.observe(root, { childList: true, subtree: true });
    } catch (e) { }

    injectTogglePanel();
  }

  const _push = history.pushState;
  history.pushState = function (...args) { _push.apply(this, args); onUrlChange(); };
  const _replace = history.replaceState;
  history.replaceState = function (...args) { _replace.apply(this, args); onUrlChange(); };
  window.addEventListener('popstate', onUrlChange);

  // helper: find a reasonable container to observe instead of document.body
  function getObserveRoot() {
    const example = document.querySelector(SELECTOR);
    if (!example) return document.body;
    let n = example;
    while (n && n !== document.body) {
      try {
        if (n.querySelectorAll && n.querySelectorAll(SELECTOR).length > 1) return n;
      } catch (e) { }
      n = n.parentNode;
    }
    return document.body;
  }

  // Debounce helper to reduce repeated work
  function debounce(fn, wait = 150) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  const debouncedInject = debounce(() => injectTogglePanel(), 150);

  // Observe DOM for GitHub dynamic content (PR diffs load asynchronously)
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if ([...m.addedNodes].some(n => n.nodeType === 1 && n.querySelector && n.querySelector(SELECTOR))) {
        debouncedInject();
        return;
      }
    }

    // Also attempt injection if page already has entries
    if (document.querySelector(SELECTOR)) debouncedInject();
  });

  // Start observing appropriate root
  const root = getObserveRoot();
  observer.observe(root, { childList: true, subtree: true });

  // Try immediately in case the elements are already present
  injectTogglePanel();

  // keyboard shortcuts removed (no runtime command handling)

  // disconnect observer on unload to avoid leaks
  window.addEventListener('unload', () => {
    try { observer.disconnect(); } catch (e) { }
  });

})();
