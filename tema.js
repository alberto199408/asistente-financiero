/* Convierte PLAN.apariencia en variables CSS (claro, oscuro y automático). */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const kebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
  const vars = (o) => Object.entries(o).map(([k, v]) => `--${kebab(k)}:${v};`).join('');

  AF.tema = {
    // Paleta base + el color elegido (PLAN.apariencia.colores) encima.
    paleta(modo, color) {
      const a = AF.PLAN.apariencia, c = (a.colores || []).find((x) => x.id === color);
      return Object.assign({}, a[modo], c ? c[modo] : {});
    },
    css(color) {
      const claro = AF.tema.paleta('claro', color), oscuro = AF.tema.paleta('oscuro', color);
      return `:root{${vars(claro)}color-scheme:light}` +
        `@media (prefers-color-scheme:dark){:root:not([data-tema="claro"]){${vars(oscuro)}color-scheme:dark}}` +
        `:root[data-tema="oscuro"]{${vars(oscuro)}color-scheme:dark}`;
    },
    // modo: 'auto' | 'claro' | 'oscuro' · color: id de PLAN.apariencia.colores
    aplicar(modo, color) {
      const d = g.document; if (!d) return;
      let st = d.getElementById('tema-vars');
      if (!st) { st = d.createElement('style'); st.id = 'tema-vars'; d.head.appendChild(st); }
      st.textContent = AF.tema.css(color);
      if (!modo || modo === 'auto') d.documentElement.removeAttribute('data-tema');
      else d.documentElement.setAttribute('data-tema', modo);
      const oscuro = modo === 'oscuro' || ((!modo || modo === 'auto') && g.matchMedia && g.matchMedia('(prefers-color-scheme: dark)').matches);
      const meta = d.querySelector('meta[name="theme-color"]');
      const a = AF.tema.paleta(oscuro ? 'oscuro' : 'claro', color);
      if (meta) meta.setAttribute('content', a.papel);
    },
  };
  if (g.document && g.document.head) AF.tema.aplicar('auto');   // primer pintado ya con los colores (sin script en línea)
  if (typeof module === 'object' && module.exports) module.exports = AF.tema;
})(typeof window !== 'undefined' ? window : globalThis);
