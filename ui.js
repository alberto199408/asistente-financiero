/* Ayudas de interfaz: construir elementos (siempre con texto escapado), íconos, hojas inferiores, avisos. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const d = g.document;

  /* ------------------------------------------------------------ Elementos */
  // h('div', { class:'x', onclick: fn, 'aria-label':'..' }, 'texto', otroNodo, [lista])
  // Los textos se insertan como texto (nunca como HTML): lo que dicte la persona no puede inyectar código.
  function h(tag, attrs, ...hijos) {
    const el = d.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'estilo') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked' || k === 'disabled' || k === 'hidden') el[k] = !!v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    add(el, hijos);
    if (attrs && typeof attrs.class === 'string' && /(^|\s)ico(\s|$)/.test(attrs.class) && !/(^|\s)(gasto|ingreso)(\s|$)/.test(attrs.class) && typeof hijos[0] === 'string') {
      const c = tinteDe(hijos[0]);
      el.style.setProperty('--c', c); el.style.setProperty('--c-suave', c + '2E');
    }
    return el;
  }
  // Color de un ícono: el de su categoría; si no es de una categoría, uno fijo de la paleta (mismo ícono = mismo color)
  function tinteDe(emoji) {
    const P = AF.PLAN; if (!P) return '#2F6FD0';
    const c = P.categorias.find((x) => x.icono === emoji);
    if (c && c.color) return c.color;
    const paleta = P.apariencia.paleta; let n = 0;
    for (const ch of String(emoji)) n += ch.codePointAt(0);
    return paleta[n % paleta.length];
  }
  function add(el, hijos) {
    for (const c of hijos) {
      if (c == null || c === false) continue;
      if (Array.isArray(c)) add(el, c);
      else if (c instanceof Node) el.appendChild(c);
      else el.appendChild(d.createTextNode(String(c)));
    }
  }
  const vaciar = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  /* --------------------------------------------------------------- Íconos */
  // Trazos propios de 24x24. Solo cadenas fijas del código (nunca datos de la persona).
  const P = {
    inicio: '<path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.5 9.8V20h13V9.8"/><path d="M10 20v-5.5h4V20"/>',
    movimientos: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M3.8 6h.4M3.8 12h.4M3.8 18h.4"/>',
    tarjeta: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M6.5 15h4"/>',
    mas: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
    teclado: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>',
    cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
    atras: '<path d="M15 5l-7 7 7 7"/>',
    derecha: '<path d="M9 5l7 7-7 7"/>',
    candado: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    huella: '<path d="M6 10.5a6 6 0 0 1 12 0c0 2.2.2 4.4-.6 6.5"/><path d="M9 20c.9-1.9 1.2-3.8 1.2-6a1.8 1.8 0 0 1 3.6 0c0 2.2.6 4.2 1.7 5.8"/><path d="M12 11v1M3.5 13c.2-1 .5-2 .9-2.9M7 17.5c.7-1.2 1-2.6 1-4a4 4 0 0 1 8 0"/>',
    mas_: '<path d="M12 5v14M5 12h14"/>',
    ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    estrella: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.8 6.9 19.5l1-5.7-4.1-4 5.7-.8z"/>',
    alerta: '<path d="M12 4l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
    camara: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.2-2h6.6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.4"/>',
    grafica: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
    meta: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    repetir: '<path d="M4 11V9a3 3 0 0 1 3-3h11l-2.5-2.5M20 13v2a3 3 0 0 1-3 3H6l2.5 2.5"/>',
    personas: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5a6 6 0 0 1 12 0"/><path d="M16 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.5a6 6 0 0 1 3.5 5"/>',
    archivo: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5a.5.5 0 0 1-.5-.5z"/><path d="M14 3.5V8h4M9 13h6M9 16.5h6"/>',
    ajustes: '<path d="M4 7h8.5M17.5 7H20M4 12h2.5M11.5 12H20M4 17h10.5M19.5 17H20"/><circle cx="15" cy="7" r="2.5"/><circle cx="9" cy="12" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
    buscar: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    basura: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.5h9.4L17.5 7M10 11v5M14 11v5"/>',
    editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    deshacer: '<path d="M9 8H5V4"/><path d="M5.5 8A8 8 0 1 1 4 13"/>',
    enviar: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
    salir: '<path d="M10 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H10M15 8l4 4-4 4M19 12H9.5"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
    nube: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A5.5 5.5 0 0 1 17 8.9a3.8 3.8 0 0 1 .5 7.6z"/><path d="M9 15l3-3 3 3M12 12v6"/>',
    ojo: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    calendario: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    papel: '<path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z"/><path d="M9 8.5h6M9 12h6"/>',
  };
  function ico(nombre, clase) {
    const s = d.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'ico-svg' + (clase ? ' ' + clase : ''));
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = P[nombre] || '';
    return s;
  }
  // Logos de marca (colores oficiales) para los botones de inicio de sesión.
  function logoGoogle() {
    const s = d.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 48 48'); s.setAttribute('width', '22'); s.setAttribute('height', '22'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.6 5.9c4.4-4.1 6.9-10.2 6.9-17.6z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>';
    return s;
  }
  function logoFacebook() {
    const s = d.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '22'); s.setAttribute('height', '22'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.02 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.09 24 12.07z"/>';
    return s;
  }
  // Insignia de un banco: su logo si hay un archivo www/img/bancos/<id>.png (o .svg, .webp); si no, solo el nombre en letra clara.
  // El logo se muestra ancho (los logos de banco son horizontales) sobre fondo blanco. Los archivos de logo los pone el dueño de la app:
  // son marcas de cada banco y no vienen incluidos. Lista de nombres de archivo: ver www/img/bancos/LEEME.txt
  // En la versión publicada (archivos sueltos) los logos van dentro de logos.js: AF.recursos['img/bancos/x.png'] = 'data:image/png;base64,…'. En desarrollo no existe y se usa el archivo.
  const recurso = (ruta) => (AF.recursos && AF.recursos[ruta]) || ruta;
  function insigniaBanco(b, tam) {
    const t = tam || 48, nombre = (b && (b.corto || b.nombre)) || 'Otro banco';
    const el = h('span', { class: 'insignia-banco', role: 'img', 'aria-label': (b && b.nombre) || 'Otro banco', estilo: { '--t': t + 'px' } }, nombre === '+' ? 'Otro banco' : nombre);
    if (b && b.id) {
      const exts = ['png', 'svg', 'webp'].filter((x) => !AF.recursos || AF.recursos['img/bancos/' + b.id + '.' + x]); let i = 0;
      if (!exts.length) return el;
      // Sin loading="lazy": una imagen suelta (aún no puesta en la pantalla) con carga diferida nunca se descarga y el logo no aparecería.
      const img = h('img', { alt: '' });
      // `logoFondo`: algunos bancos solo tienen su logo en blanco (para fondo oscuro): se muestra sobre ese color.
      img.addEventListener('load', () => { el.textContent = ''; el.classList.add('con-logo'); if (b.logoFondo) { el.style.background = b.logoFondo; el.classList.add('logo-oscuro'); } el.appendChild(img); });
      img.addEventListener('error', () => { i += 1; if (i < exts.length) img.src = recurso('img/bancos/' + b.id + '.' + exts[i]); });
      img.src = recurso('img/bancos/' + b.id + '.' + exts[0]);
    }
    return el;
  }
  const logoApp = (tam) => h('img', { src: recurso('img/logo.png'), alt: '', width: tam || 44, height: tam || 44 });
  const chipPro = (texto) => h('span', { class: 'chip-pro' }, ico('estrella', 'relleno'), texto || 'Pro');

  /* -------------------------------------------------------- Hoja inferior */
  // hoja({ titulo, cuerpo: Node|[Node], acciones: [{texto, clase, onclick}], alCerrar }) -> { cerrar }
  function hoja(o) {
    const cont = d.getElementById('app');
    const telon = h('div', { class: 'telon' });
    const caja = h('div', { class: 'hoja', role: 'dialog', 'aria-modal': 'true', 'aria-label': o.titulo || 'Opciones' },
      h('div', { class: 'hoja-asa' }),
      o.titulo ? h('h2', { class: 'h2 hoja-titulo' }, o.titulo) : null,
      o.cuerpo,
      o.acciones && o.acciones.length
        ? h('div', { class: 'hoja-acciones' }, o.acciones.map((a) => h('button', {
          class: 'btn ' + (a.clase || 'btn-primario'), type: 'button',
          onclick: () => { if (a.onclick) { if (a.onclick(api) === false) return; } if (a.cierra !== false) api.cerrar(); },
        }, a.texto))) : null);
    const api = {
      cerrar() { telon.remove(); caja.remove(); if (o.alCerrar) o.alCerrar(); },
      el: caja,
    };
    telon.addEventListener('click', api.cerrar);
    cont.appendChild(telon); cont.appendChild(caja);
    return api;
  }

  /* ------------------------------------------------------------------ Aviso */
  let avisoEl = null, avisoT = null;
  function aviso(texto, accion) {
    if (avisoEl) avisoEl.remove();
    clearTimeout(avisoT);
    avisoEl = h('div', { class: 'aviso-flotante', role: 'status' }, h('span', null, texto),
      accion ? h('button', { type: 'button', onclick: () => { accion.onclick(); avisoEl && avisoEl.remove(); } }, accion.texto) : null);
    d.getElementById('app').appendChild(avisoEl);
    avisoT = setTimeout(() => avisoEl && avisoEl.remove(), accion ? 6500 : 3200);
  }

  /* ------------------------------------------------------- Piezas comunes */
  const fila = (o) => {
    const dentro = [
      h('div', { class: 'ico ' + (o.tono || '') }, o.icono),
      h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, o.titulo), o.sub ? h('div', { class: 'fila-sub' }, o.sub) : null),
      o.derecha || null,
    ];
    return o.onclick
      ? h('button', { class: 'fila fila-boton', type: 'button', onclick: o.onclick }, dentro)
      : h('div', { class: 'fila' }, dentro);
  };
  const campo = (etiqueta, input, ayuda) => h('div', { class: 'campo' }, h('label', null, etiqueta), input, ayuda ? h('div', { class: 'ayuda' }, ayuda) : null);

  /* Lluvia corta de confeti para festejar (meta lograda, reto cumplido). No hace nada si la persona pidió menos movimiento. */
  function confeti() {
    if (!d || (g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const raiz = d.getElementById('app'); if (!raiz) return;
    const colores = ['#F28A1B', '#F2B63A', '#E04848', '#2F7BFF', '#1DB57A', '#0EA5B7'];
    const capa = h('div', { 'aria-hidden': 'true', estilo: { position: 'fixed', left: 0, right: 0, top: 0, height: '0', zIndex: 70, pointerEvents: 'none', overflow: 'visible' } });
    raiz.appendChild(capa);
    for (let i = 0; i < 46; i++) {
      const pieza = h('i', { estilo: { position: 'absolute', left: (10 + Math.random() * 80) + '%', top: '-10px', width: (6 + Math.random() * 6) + 'px', height: (8 + Math.random() * 8) + 'px', background: colores[i % colores.length], borderRadius: i % 3 ? '2px' : '50%' } });
      capa.appendChild(pieza);
      if (pieza.animate) pieza.animate([{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + ((Math.random() - 0.5) * 160) + 'px,' + (g.innerHeight * (0.55 + Math.random() * 0.4)) + 'px) rotate(' + (360 + Math.random() * 540) + 'deg)', opacity: 0.9 }], { duration: 1300 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
    }
    setTimeout(() => capa.remove(), 2600);
  }

  AF.ui = { h, vaciar, tinteDe, confeti, ico, logoGoogle, logoFacebook, logoApp, insigniaBanco, chipPro, hoja, aviso, fila, campo, iconos: Object.keys(P) };
  if (typeof module === 'object' && module.exports) module.exports = AF.ui;
})(typeof window !== 'undefined' ? window : globalThis);
