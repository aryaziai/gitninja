(function () {
  if (document.getElementById('ext-toggle-panel')) return;

  const e = Array.from(document.querySelectorAll('copilot-diff-entry, diff-entry'));
  const m = new Map();

  e.forEach(n => {
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
    const c = m.get(x).length / e.length * 100;
    const l = g(x, i);
    d.push(`hsl(${l}) ${t}% ${t + c}%`);
    t += c;
    return `--c${i}:${l}`;
  }).join(';');

  const p = document.createElement('div');
  p.id = 'ext-toggle-panel';
  p.style.cssText = v;
  p.innerHTML = `
    <div class="ninja-btn" style="--g:conic-gradient(${d})"></div>
    <div class="menu">
      ${s.map((x, i) => `
        <label style="--i:${i}">
          <span>${x} (${(m.get(x).length / e.length * 100).toFixed(1)}%)</span>
          <input type="checkbox" data-ext="${x}">
        </label>
      `).join('')}
    </div>
  `;

  document.body.appendChild(p);

  p.addEventListener('change', n => {
    if (!n.target.dataset.ext) return;
    m.get(n.target.dataset.ext).forEach(y => {
      const b = y.querySelector('.js-details-target');
      if (b && (b.getAttribute('aria-expanded') === 'true') === n.target.checked) b.click();
    });
  });

  document.head.insertAdjacentHTML('beforeend', `<style>
    #ext-toggle-panel {
      position: fixed;
      inset: 50px 20px auto auto;
      z-index: 9999;
    }

    .ninja-btn {
      background: #fff;
      border: 4px solid transparent;
      background-clip: padding-box;
      border-radius: 9999em;
      padding: 0.5rem 1rem;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      position: relative;
      width: 100%;
      text-align: center;
    }

    .ninja-btn::before {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: inherit;
      background: var(--g);
      z-index: -1;
    }

    .ninja-btn::after {
      content: '🥷';
      font-size: 18px;
      background: #fff;
      border-radius: 9999em;
    }

    #ext-toggle-panel:hover .ninja-btn::after {
      content: 'Collapse Files';
      font-size: 14px;
      font-weight: 600;
      color: #24292f;
    }

    .menu {
      display: none;
      flex-direction: column;
      gap: 6px;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 16px;
      padding: 14px 18px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
      margin-top: 8px;
      width: 200px;
    }

    #ext-toggle-panel:hover .menu {
      display: flex;
      animation: slideIn 0.2s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
    }

    .menu label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      gap: 10px;
      color: #24292f;
    }

    .menu label span {
      border-left: 3px solid hsl(var(--c, var(--c0)));
      padding-left: 8px;
    }

    .menu label[style*="--i:"] span {
      border-left-color: hsl(var(--c));
    }

    .menu label[style*="--i:"] input:checked {
      background: hsl(var(--c));
    }

    .menu label[style*="--i:"] input:checked::before {
      box-shadow: 0 2px 8px hsla(var(--c), 0.6);
    }

    .menu input {
      appearance: none;
      width: 36px;
      height: 20px;
      background: #ccc;
      border-radius: 20px;
      cursor: pointer;
      position: relative;
      flex-shrink: 0;
    }

    .menu input::before {
      content: '';
      position: absolute;
      inset: 2px auto 2px 2px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
      transition: translate 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .menu input:checked::before {
      translate: 16px 0;
    }

    ${s.map((_, i) => `.menu label[style*="--i:${i}"] { --c: var(--c${i}); }`).join('\n    ')}
  </style>`);
})();
