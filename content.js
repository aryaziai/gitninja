// Content script for GitNinja — only runs on GitHub pages (registered in manifest).
// It injects a toggle panel to collapse/expand file diffs grouped by file extension.

(function () {
  if (location.hostname !== 'github.com') return;
  // Only run on PR "Files changed" views (e.g., /pull/123/files)
  if (!/\/pull\/\d+\/files/.test(location.pathname)) return;

  const SELECTOR = 'copilot-diff-entry, diff-entry';
  const PANEL_ID = 'ext-toggle-panel';

  function injectTogglePanel() {
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
      p.style.cssText = v;
      p.innerHTML = `\n        <div class="ninja-btn" style="--g:conic-gradient(${d})"></div>\n        <div class="menu">\n          ${s.map((x, i) => `\n            <label style="--i:${i}">\n              <span>${x} (${(m.get(x).length / entries.length * 100).toFixed(1)}%)</span>\n              <input type="checkbox" data-ext="${x}">\n            </label>\n          `).join('')}\n        </div>\n      `;

      document.body.appendChild(p);

      // populate menu items programmatically so we can set per-label --c and checked state
      const menuEl = p.querySelector('.menu');
      if (menuEl) {
        menuEl.innerHTML = '';
        s.forEach((x, i) => {
          const label = document.createElement('label');
          label.style.cssText = `--i:${i}; --c: var(--c${i})`;

          const span = document.createElement('span');
          span.textContent = `${x} (${(m.get(x).length / entries.length * 100).toFixed(1)}%)`;

          const input = document.createElement('input');
          input.type = 'checkbox';
          input.dataset.ext = x;
          input.checked = true;

          label.appendChild(span);
          label.appendChild(input);
          menuEl.appendChild(label);
        });
      }

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

      // styles moved to styles.css (loaded via manifest / content_scripts)


    } catch (err) {
      console.error('GitNinja content script error:', err);
    }
  }

  // Observe DOM for GitHub dynamic content (PR diffs load asynchronously)
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if ([...m.addedNodes].some(n => n.nodeType === 1 && n.querySelector && n.querySelector(SELECTOR))) {
        injectTogglePanel();
        return;
      }
    }

    // Also attempt injection if page already has entries
    if (document.querySelector(SELECTOR)) injectTogglePanel();
  });

  // Start observing document body
  observer.observe(document.body, { childList: true, subtree: true });

  // Try immediately in case the elements are already present
  injectTogglePanel();

})();
