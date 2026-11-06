/* ===== js/util.js ===== */
/* Utilidades base: texto, números dichos en palabras, dinero, fechas. Sin dependencias. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});

  /* ------------------------------------------------------------------ Texto */
  // minúsculas y sin tildes (la ñ se vuelve n: "cabañas" => "cabanas")
  const norm = (s) =>
    String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const r2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  /* ------------------------------------------------- Números en palabras */
  const UNI = { uno: 1, un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
    diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18,
    diecinueve: 19, veintiuno: 21, veintiun: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
    veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29 };
  const DEC = { veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
  const CEN = { cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
    cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
    setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900 };
  const SOLO_UNO = new Set(['uno', 'un', 'una']);
  const MONEDA_PALABRA = /^(dolar|dolares|centavo|centavos|usd|euro|euros|peso|pesos|sol|soles|mil|millon|millones)$/;

  // Lee una racha de palabras-número desde t[i]. Devuelve { valor, fin } o null.
  function leerRacha(t, i) {
    let total = 0, cur = 0, j = i, prev = null, usados = 0;
    const inicio = (p) => p === null || p === 'cen' || p === 'mil' || p === 'mill';
    while (j < t.length) {
      const w = t[j];
      if (w in CEN && (prev === null || prev === 'mil' || prev === 'mill')) { cur += CEN[w]; prev = 'cen'; }
      else if (w in DEC && inicio(prev) && prev !== 'dec') { cur += DEC[w]; prev = 'dec'; }
      else if (w in UNI) {
        const v = UNI[w];
        if (v >= 10 && inicio(prev)) { cur += v; prev = 'uni2'; }
        else if (v < 10 && inicio(prev)) { cur += v; prev = 'uni'; }
        else if (v < 10 && prev === 'y') { cur += v; prev = 'uni'; }
        else break;
      } else if (w === 'y' && prev === 'dec' && j + 1 < t.length && UNI[t[j + 1]] >= 1 && UNI[t[j + 1]] <= 9) {
        prev = 'y';
      } else if (w === 'mil' && prev !== 'mil' && prev !== 'mill') {
        total += (prev === null ? 1 : cur) * 1000; cur = 0; prev = 'mil';
      } else if ((w === 'millon' || w === 'millones') && prev !== 'mill') {
        total += (prev === null ? 1 : cur || 1) * 1e6; cur = 0; prev = 'mill';
      } else break;
      j++; usados++;
    }
    if (!usados) return null;
    // "un/uno/una" solo cuenta como número si lo sigue una palabra de dinero ("una dolar" no existe, pero "un dolar" sí)
    if (usados === 1 && SOLO_UNO.has(t[i])) {
      const sig = t[i + 1];
      if (!(sig && MONEDA_PALABRA.test(sig))) return null;
    }
    return { valor: total + cur, fin: j };
  }

  // "gaste veinte y cinco dolares con cincuenta" => "gaste 25 dolares con 50"
  function palabrasANumeros(texto) {
    const t = norm(texto).split(/\s+/).filter(Boolean);
    const out = [];
    for (let i = 0; i < t.length;) {
      const r = leerRacha(t, i);
      if (r) { out.push(String(r.valor)); i = r.fin; }
      else { out.push(t[i]); i++; }
    }
    return out.join(' ');
  }

  // "20,50" "20.50" "1.234,56" "1,234.56" "1.500" => número
  function parseNumero(str) {
    let s = String(str).replace(/[^\d.,]/g, '');
    if (!s) return null;
    const c = s.lastIndexOf(','), p = s.lastIndexOf('.');
    if (c >= 0 && p >= 0) {
      const dec = c > p ? ',' : '.';
      const mil = dec === ',' ? '.' : ',';
      s = s.split(mil).join('').replace(dec, '.');
    } else if (c >= 0 || p >= 0) {
      const sep = c >= 0 ? ',' : '.';
      const partes = s.split(sep);
      if (partes.length > 2) s = partes.join('');                         // 1.234.567
      else if (partes[1].length === 3 && partes[0].length <= 3 && partes[0] !== '0') s = partes.join(''); // 1.500
      else s = partes[0] + '.' + partes[1];
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }

  /* ------------------------------------------------------------------ Dinero */
  // 1060 => "1.060" ; 20.5 => "20,50" ; opciones: { simbolo, fijo (siempre 2 decimales), signo }
  function dinero(n, o = {}) {
    const PLAN = AF.PLAN;
    const mon = (PLAN && PLAN.monedas[o.moneda || (AF.estado && AF.estado.moneda) || 'USD']) || { simbolo: '$' };
    const simbolo = o.simbolo != null ? o.simbolo : mon.simbolo;
    let v = r2(n || 0);
    const neg = v < 0; v = Math.abs(v);
    const entero = Number.isInteger(v) && !o.fijo;
    const [ent, dec] = (entero ? String(v) : v.toFixed(2)).split('.');
    const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const cuerpo = simbolo + miles + (dec ? ',' + dec : '');
    if (neg) return '−' + cuerpo;
    return (o.signo ? '+' : '') + cuerpo;
  }
  const pct = (x, dec = 0) => (x * 100).toFixed(dec).replace('.', ',') + ' %';

  /* ------------------------------------------------------------------ Fechas */
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const deISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const hoyISO = (now) => iso(now || new Date());
  const sumarDias = (s, n) => { const d = deISO(s); d.setDate(d.getDate() + n); return iso(d); };
  const sumarMeses = (s, n) => {
    const d = deISO(s); const dia = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + n);
    const ult = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(dia, ult)); return iso(d);
  };
  const inicioMes = (s) => s.slice(0, 8) + '01';
  const finMes = (s) => { const d = deISO(s); return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
  const inicioAnio = (s) => s.slice(0, 4) + '-01-01';
  const inicioSemana = (s) => { const d = deISO(s); const dow = (d.getDay() + 6) % 7; return sumarDias(s, -dow); }; // lunes
  const diasEntre = (a, b) => Math.round((deISO(b) - deISO(a)) / 86400000);
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const DIAS_BONITOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const nombreMes = (s) => MESES[deISO(s).getMonth()];
  // "5 de noviembre de 2026"
  const fechaLarga = (s) => { const f = deISO(s); return f.getDate() + ' de ' + MESES[f.getMonth()] + ' de ' + f.getFullYear(); };
  const diaSemana = (s) => DIAS_BONITOS[deISO(s).getDay()];
  // "6 nov", "hoy", "ayer"
  function fechaCorta(s, hoy) {
    hoy = hoy || hoyISO();
    const d = diasEntre(s, hoy);
    if (d === 0) return 'hoy';
    if (d === 1) return 'ayer';
    const f = deISO(s);
    return f.getDate() + ' ' + MESES_CORTOS[f.getMonth()];
  }
  // Próxima fecha de cobro (día del mes) en o después de "desde"
  function proximoDia(desde, dia) {
    const d = deISO(desde);
    const ult = (y, m) => new Date(y, m + 1, 0).getDate();
    let y = d.getFullYear(), m = d.getMonth();
    let dd = Math.min(dia, ult(y, m));
    if (dd < d.getDate()) { m++; if (m > 11) { m = 0; y++; } dd = Math.min(dia, ult(y, m)); }
    return iso(new Date(y, m, dd));
  }

  AF.util = { norm, escapeRe, uid, r2, cap, leerRacha, palabrasANumeros, parseNumero, dinero, pct, pad, iso, deISO, hoyISO, sumarDias,
    sumarMeses, inicioMes, finMes, inicioAnio, inicioSemana, diasEntre, MESES, DIAS, DIAS_BONITOS, MESES_CORTOS, nombreMes,
    diaSemana, fechaCorta, fechaLarga, proximoDia };
  if (typeof module === 'object' && module.exports) module.exports = AF.util;
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/ui.js ===== */
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
;

/* ===== js/store.js ===== */
/* Almacén de datos: todo vive en el teléfono. Cada cambio queda en el historial y se puede deshacer. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const U = AF.util, PLAN = AF.PLAN;

  /* ---------------------------------------------------------------- Eventos */
  const oyentes = {};
  const bus = {
    on(ev, fn) { (oyentes[ev] = oyentes[ev] || []).push(fn); return () => { oyentes[ev] = oyentes[ev].filter((f) => f !== fn); }; },
    emit(ev, x) { (oyentes[ev] || []).slice().forEach((f) => { try { f(x); } catch (e) { if (g.console) console.error(e); } }); },
  };

  /* ------------------------------------------------------------------ Datos */
  const COLECCIONES = ['movs', 'tarjetas', 'pagosFijos', 'metas', 'prestamos', 'presupuestos', 'retos', 'bandeja', 'categorias', 'viajes', 'grupo'];
  function vacio() {
    const p = PLAN.pais(PLAN.app.paisInicial);
    const o = {
      v: 1, creado: new Date().toISOString(),
      ajustes: { nombre: '', pais: p.codigo, moneda: p.moneda, diaCobro: PLAN.bienvenida.diaCobroDefecto, sueldo: null, cargas: 0,
        tema: 'claro', colorApp: 'marino', respuestaVoz: true, bloqueoSeg: PLAN.sesion.bloquearTrasSegundos, bienvenidaHecha: false },
      plan: { inicioPrueba: null, proHasta: null, ia: {} },
      diccionario: {}, historial: [],
    };
    COLECCIONES.forEach((c) => { o[c] = []; });
    return o;
  }

  let d = vacio();
  let adaptador = null;     // { escribir(obj): Promise }
  let tGuardar = null;

  function guardarYa() {
    clearTimeout(tGuardar); tGuardar = null;
    if (adaptador && adaptador.escribir) return Promise.resolve(adaptador.escribir(d));
    return Promise.resolve();
  }
  function guardar() { clearTimeout(tGuardar); tGuardar = setTimeout(guardarYa, 250); }

  function cargar(obj, ad) {
    d = obj ? Object.assign(vacio(), obj) : vacio();
    d.ajustes = Object.assign(vacio().ajustes, d.ajustes || {});
    d.plan = Object.assign(vacio().plan, d.plan || {});
    COLECCIONES.forEach((c) => { if (!Array.isArray(d[c])) d[c] = []; });
    if (!d.diccionario) d.diccionario = {};
    if (!Array.isArray(d.historial)) d.historial = [];
    adaptador = ad || null;
    bus.emit('cargado');
    return d;
  }

  /* -------------------------------------------------------------- Historial */
  function anotar(col, op, ref, antes, despues, nota) {
    d.historial.push({ id: U.uid(), ts: Date.now(), col, op, ref, antes: antes || null, despues: despues || null, nota: nota || '', deshecho: false });
    const max = PLAN.historial.maxEntradas;
    if (d.historial.length > max) d.historial.splice(0, d.historial.length - max);
  }
  const copia = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));

  function agregar(col, obj, nota) {
    const o = Object.assign({ id: U.uid(), creado: Date.now() }, copia(obj));
    d[col].push(o);
    anotar(col, 'add', o.id, null, copia(o), nota);
    guardar(); bus.emit('cambio', { col, op: 'add', id: o.id });
    return o;
  }
  function editar(col, id, patch, nota) {
    const o = d[col].find((x) => x.id === id);
    if (!o) return null;
    const antes = copia(o);
    Object.assign(o, copia(patch), { editado: Date.now() });
    anotar(col, 'upd', id, antes, copia(o), nota);
    guardar(); bus.emit('cambio', { col, op: 'upd', id });
    return o;
  }
  function borrar(col, id, nota) {
    const i = d[col].findIndex((x) => x.id === id);
    if (i < 0) return false;
    const [o] = d[col].splice(i, 1);
    anotar(col, 'del', id, copia(o), null, nota);
    guardar(); bus.emit('cambio', { col, op: 'del', id });
    return true;
  }
  function buscar(col, id) { return d[col].find((x) => x.id === id) || null; }

  // Deshace el último cambio que aún no se haya deshecho. Devuelve su nota (o null si no hay nada).
  function deshacer() {
    for (let i = d.historial.length - 1; i >= 0; i--) {
      const h = d.historial[i];
      if (h.deshecho) continue;
      const lista = d[h.col];
      if (h.op === 'add') { const k = lista.findIndex((x) => x.id === h.ref); if (k >= 0) lista.splice(k, 1); }
      else if (h.op === 'upd') { const k = lista.findIndex((x) => x.id === h.ref); if (k >= 0) lista[k] = copia(h.antes); else lista.push(copia(h.antes)); }
      else if (h.op === 'del') { if (!lista.some((x) => x.id === h.ref)) lista.push(copia(h.antes)); }
      h.deshecho = true;
      guardar(); bus.emit('cambio', { col: h.col, op: 'deshacer', id: h.ref });
      return h.nota || 'Cambio deshecho';
    }
    return null;
  }
  const puedeDeshacer = () => d.historial.some((h) => !h.deshecho);

  /* ---------------------------------------------------------------- Ajustes */
  function ajustar(patch) { Object.assign(d.ajustes, patch); guardar(); bus.emit('ajustes'); return d.ajustes; }
  function aprender(palabra, catId) {
    const k = U.norm(palabra).trim();
    if (!k || !catId) return;
    d.diccionario[k] = catId; guardar();
  }
  function olvidarAprendido(palabra) { delete d.diccionario[U.norm(palabra).trim()]; guardar(); }

  /* -------------------------------------------------------------- Categorías */
  // Las de fábrica salen de PLAN; las propias (Pro) viven en los datos.
  const categorias = (tipo) => PLAN.categorias.concat(d.categorias).filter((c) => !tipo || c.tipo === tipo);
  const categoria = (id) => categorias().find((c) => c.id === id) || PLAN.categoria('otros');

  /* ----------------------------------------------------------- Movimientos */
  const movs = () => d.movs;
  function movsEntre(desde, hasta, filtro) {
    return d.movs.filter((m) => m.fecha >= desde && m.fecha <= hasta && (!filtro || filtro(m)));
  }
  function ultimoMov(tipo) {
    return d.movs.filter((m) => !tipo || m.tipo === tipo).sort((a, b) => (b.fecha === a.fecha ? b.creado - a.creado : b.fecha < a.fecha ? -1 : 1))[0] || null;
  }

  /* ------------------------------------------------------------ Respaldo */
  const exportar = () => JSON.parse(JSON.stringify(d));
  function reemplazarTodo(obj) { cargar(obj, adaptador); guardarYa(); }
  function borrarTodo() { cargar(null, adaptador); return guardarYa(); }

  AF.bus = bus;
  AF.store = { bus, vacio, cargar, datos: () => d, get d() { return d; }, guardar, guardarYa, agregar, editar, borrar, buscar, deshacer, puedeDeshacer,
    ajustar, aprender, olvidarAprendido, categorias, categoria, movs, movsEntre, ultimoMov, exportar, reemplazarTodo, borrarTodo, COLECCIONES };
  if (typeof module === 'object' && module.exports) module.exports = AF.store;
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/acceso.js ===== */
/* Gratis vs Pro. No decide nada por su cuenta: todo se lee de PLAN (funciones, límites, prueba, IA). */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const U = AF.util, PLAN = AF.PLAN;
  const datos = () => AF.store.d;
  const mesClave = (hoy) => hoy.slice(0, 7);

  // { tipo: 'pro' | 'prueba' | 'gratis', diasPrueba: n }
  function estado(hoy) {
    hoy = hoy || U.hoyISO();
    const p = datos().plan;
    if (p.proHasta && p.proHasta >= hoy) return { tipo: 'pro', hasta: p.proHasta, diasPrueba: 0 };
    if (p.inicioPrueba) {
      const usados = U.diasEntre(p.inicioPrueba, hoy);
      if (usados >= 0 && usados < PLAN.prueba.diasProGratis) return { tipo: 'prueba', diasPrueba: PLAN.prueba.diasProGratis - usados };
    }
    return { tipo: 'gratis', diasPrueba: 0 };
  }
  const esPro = (hoy) => estado(hoy).tipo !== 'gratis';

  function tiene(funcion, hoy) {
    const f = PLAN.funciones[funcion];
    if (!f) return false;
    return esPro(hoy) ? !!f.p : !!f.g;
  }
  const limite = (nombre, hoy) => PLAN.limites[esPro(hoy) ? 'pro' : 'gratis'][nombre];
  const puedeAgregar = (nombre, cantidadActual, hoy) => cantidadActual < limite(nombre, hoy);
  const explicacion = (funcion) => PLAN.explicacionPro[funcion] || 'Disponible en Pro.';

  function iniciarPrueba(hoy) {
    const p = datos().plan;
    if (!p.inicioPrueba) { p.inicioPrueba = hoy || U.hoyISO(); AF.store.guardar(); }
  }
  function activarPro(hasta) { datos().plan.proHasta = hasta; AF.store.guardar(); AF.bus.emit('plan'); }

  /* ---- IA (solo Pro, con tope mensual) */
  function iaUsadas(hoy) { return datos().plan.ia[mesClave(hoy || U.hoyISO())] || 0; }
  function iaRestantes(hoy) { return Math.max(0, PLAN.ia.limiteMensualConsultas - iaUsadas(hoy)); }
  function iaDisponible(hoy) { return !!PLAN.ia.urlWorker && esPro(hoy) && iaRestantes(hoy) > 0; }
  function iaUsar(hoy) {
    const k = mesClave(hoy || U.hoyISO());
    datos().plan.ia[k] = (datos().plan.ia[k] || 0) + 1;
    AF.store.guardar();
  }

  AF.acceso = { estado, esPro, tiene, limite, puedeAgregar, explicacion, iniciarPrueba, activarPro, iaUsadas, iaRestantes, iaDisponible, iaUsar };
  if (typeof module === 'object' && module.exports) module.exports = AF.acceso;
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/parser.js ===== */
/* El intérprete de frases (botón único): reglas + diccionario + lo aprendido. Sin internet.
   interpretar(texto, ctx) -> { tipo: 'registrar' | 'preguntar' | 'corregir' | 'presupuesto' | 'informe' | 'ayuda' | 'desconocido', ... }
   ctx = { hoy, categorias, dicc (lo aprendido), tarjetas }                                                       */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const U = AF.util;

  /* ---------------------------------------------------------------- Listas de palabras */
  const set = (s) => new Set(s.split(/\s+/).filter(Boolean));
  const V_GASTO = set('gaste gastamos gasto gastado gastaron pague pagamos pagado compre compramos comprado pedi consumi done aboné abone inverti');
  const V_INGRESO = set('gane ganamos gano ganancia cobre cobramos recibi recibimos ingrese ingresaron vendi vendimos');
  const FRASES_INGRESO = ['me pagaron', 'me depositaron', 'me llego', 'me llegaron', 'me entro', 'me dieron', 'me regalaron', 'me transfirieron', 'me abonaron', 'me depositaron', 'me pagan', 'ingreso de', 'un ingreso'];
  const FRASES_GASTO = ['me cobraron', 'me costo', 'me salio', 'un gasto', 'gasto de'];
  const PARADA = set('el la los las un una unos unas de del en por para con al a y e o mi mis tu tus su sus me se lo que es fue era fueron hoy ayer anoche dolares dolar usd pesos euros soles centavos centavo mas casi como pues entonces porque cuando donde yo cargue cargamos tanquee fui fuimos llene eche echamos pase pasamos sali salimos');
  const MONEDAS = set('dolar dolares usd $ pesos peso euros euro soles sol dolarcitos');
  const OPENER_PREGUNTA = set('cuanto cuantos cuanta cuantas cual cuales dime muestrame desglosame desglosa resumeme resumen cuando donde hay tengo puedo podria alcanza conviene que');
  const V_CORREGIR = set('cambia cambialo cambiale cambiar corrige corrigelo corregir modifica modificalo edita editalo ponlo pon pone marca marcalo borra borralo borrar elimina eliminalo eliminar quita quitalo anula anulalo anular deshaz deshacer olvidalo mejor');
  const V_BORRAR = set('borra borralo borrar elimina eliminalo eliminar quita quitalo anula anulalo anular olvidalo');
  const MESES_N = U.MESES;
  const DIAS_N = U.DIAS;

  /* ------------------------------------------------------------------------ Tokens */
  const limpiar = (raw) => U.norm(raw).replace(/^[¿¡"'(\[]+/, '').replace(/[?!"')\].,;:]+$/, '');
  const esNumToken = (n) => /^\$?\d[\d.,]*\$?$/.test(n) || /^\d[\d.,]*(usd|dolares|dolar)$/.test(n);
  function numDeToken(n) {
    const m = n.match(/^\$?(\d[\d.,]*)/);
    return m ? U.parseNumero(m[1]) : null;
  }

  function tokenizar(texto) {
    const crudos = String(texto || '').trim().split(/\s+/).filter(Boolean);
    let toks = crudos.map((raw) => ({ raw, n: limpiar(raw), coma: /[,;]$/.test(raw) }));
    // 1) palabras-número => un solo token numérico ("veinte y cinco" => 25)
    const ns = toks.map((t) => t.n);
    const out = [];
    for (let i = 0; i < toks.length;) {
      const r = U.leerRacha(ns, i);
      if (r) {
        const partes = toks.slice(i, r.fin);
        out.push({ raw: partes.map((p) => p.raw).join(' '), n: String(r.valor), num: r.valor, coma: partes[partes.length - 1].coma, palabras: true });
        i = r.fin;
      } else { out.push(toks[i]); i++; }
    }
    toks = out;
    // 2) números con dígitos
    toks.forEach((t) => { if (t.num == null && esNumToken(t.n)) { const v = numDeToken(t.n); if (v != null) t.num = v; } });
    // 3) "veinte con cincuenta (centavos)" => 20,50
    for (let i = 0; i < toks.length - 2; i++) {
      const a = toks[i];
      if (a.num == null) continue;
      let j = i + 1;
      const hayMoneda = toks[j] && MONEDAS.has(toks[j].n);
      if (hayMoneda) j++;
      if (toks[j] && /^(con|punto|coma)$/.test(toks[j].n) && toks[j + 1] && toks[j + 1].num != null && toks[j + 1].num < 100 && Number.isInteger(toks[j + 1].num)) {
        const b = toks[j + 1];
        const cent = toks[j + 2] && /^(centavo|centavos|ctvs|ctv)$/.test(toks[j + 2].n);
        const alFinal = j + 1 === toks.length - 1;
        const monedaDespues = toks[j + 2] && MONEDAS.has(toks[j + 2].n);
        const centavoTipico = b.num % 5 === 0 && b.num >= 10 || b.num === 99;
        const sigGente = toks[j + 2] && /^(amigos|amigas|personas|gente|ninos|companeros|familia|invitados)$/.test(toks[j + 2].n);
        if (cent || hayMoneda || alFinal || monedaDespues || (centavoTipico && !sigGente)) {
          const fin = (cent || monedaDespues) ? j + 3 : j + 2;
          const nuevo = { raw: toks.slice(i, fin).map((p) => p.raw).join(' '), n: String(a.num + b.num / 100), num: a.num + b.num / 100, coma: toks[fin - 1].coma, palabras: true };
          toks.splice(i, fin - i, nuevo);
        }
      }
    }
    // "nueve cincuenta" (dos números dichos seguidos) => 9,50
    for (let i = 0; i < toks.length - 1; i++) {
      const a = toks[i], b = toks[i + 1];
      if (a.palabras && b.palabras && Number.isInteger(a.num) && a.num >= 1 && a.num <= 999 && Number.isInteger(b.num) && ((b.num % 5 === 0 && b.num >= 10 && b.num <= 95) || b.num === 99)) {
        toks.splice(i, 2, { raw: a.raw + ' ' + b.raw, n: String(a.num + b.num / 100), num: a.num + b.num / 100, coma: b.coma, palabras: true });
      }
    }
    return toks;
  }

  /* ---------------------------------------------------------------- Índice de categorías */
  const indiceCache = new WeakMap();
  function indice(cats) {
    if (indiceCache.has(cats)) return indiceCache.get(cats);
    const m = new Map();
    const poner = (frase, cat, peso) => {
      const k = U.norm(frase).trim();
      if (!k) return;
      const lista = m.get(k) || [];
      lista.push({ cat, peso });
      m.set(k, lista);
    };
    cats.forEach((c) => {
      (c.palabras || []).forEach((p) => poner(p, c, 2));
      (c.palabrasDebiles || []).forEach((p) => poner(p, c, 0.8));
      poner(c.nombre, c, 2.5);
    });
    indiceCache.set(cats, m);
    return m;
  }
  const singular = (w) => (w.length > 3 && w.endsWith('es') && !w.endsWith('ses') ? [w.slice(0, -2), w.slice(0, -1)] : w.length > 3 && w.endsWith('s') ? [w.slice(0, -1)] : []);

  // Busca la mejor categoría entre los tokens dados. usados = índices de token que sirvieron.
  function clasificar(palabras, idx, tipo, ctx) {
    const cats = ctx.categorias;
    const m = indice(cats);
    const mejor = { cat: null, score: 0, usados: [], aprendido: false };
    const dicc = ctx.dicc || {};
    for (let i = 0; i < palabras.length; i++) {
      for (let len = Math.min(4, palabras.length - i); len >= 1; len--) {
        const trozo = palabras.slice(i, i + len);
        const variantes = [trozo.join(' ')];
        const ult = trozo[len - 1];
        singular(ult).forEach((s) => variantes.push(trozo.slice(0, -1).concat(s).join(' ')));
        variantes.push(trozo.slice(0, -1).concat(ult + 's').join(' '));
        for (const fr of variantes) {
          // 1) lo aprendido de las correcciones del usuario gana siempre
          if (dicc[fr]) {
            const c = cats.find((x) => x.id === dicc[fr] && (!tipo || x.tipo === tipo));
            if (c) { const sc = 100 + len; if (sc > mejor.score) { mejor.cat = c; mejor.score = sc; mejor.usados = idx.slice(i, i + len); mejor.aprendido = true; } }
          }
          // 2) el diccionario de fábrica (palabras largas pesan más: "tanque de gas" gana a "tanque")
          const hits = m.get(fr);
          if (hits) {
            hits.forEach((h) => {
              if (tipo && h.cat.tipo !== tipo) return;
              const sc = h.peso * (len > 1 ? 1 + len * 0.6 : 1);
              if (sc > mejor.score) { mejor.cat = h.cat; mejor.score = sc; mejor.usados = idx.slice(i, i + len); mejor.aprendido = false; }
            });
          }
        }
      }
    }
    return mejor;
  }

  /* ------------------------------------------------------------------------- Fechas */
  // Devuelve { fecha, usados:[idx] }. Por defecto hoy.
  function leerFecha(toks, hoy) {
    const usados = [];
    const n = toks.map((t) => t.n);
    let fecha = hoy, hallada = false;
    for (let i = 0; i < n.length; i++) {
      if (n[i] === 'hoy') { usados.push(i); hallada = true; }
      else if (n[i] === 'ayer') { fecha = U.sumarDias(hoy, -1); usados.push(i); hallada = true; }
      else if (n[i] === 'anoche') { fecha = U.sumarDias(hoy, -1); usados.push(i); hallada = true; }
      else if (n[i] === 'anteayer' || n[i] === 'antier' || n[i] === 'antiayer') { fecha = U.sumarDias(hoy, -2); usados.push(i); hallada = true; }
      else if (n[i] === 'antes' && n[i + 1] === 'de' && n[i + 2] === 'ayer') { fecha = U.sumarDias(hoy, -2); usados.push(i, i + 1, i + 2); hallada = true; }
      else if (n[i] === 'hace' && toks[i + 1] && toks[i + 1].num != null && /^dias?$/.test(n[i + 2] || '')) { fecha = U.sumarDias(hoy, -toks[i + 1].num); usados.push(i, i + 1, i + 2); hallada = true; }
      else if (DIAS_N.includes(n[i]) && (n[i - 1] === 'el' || n[i - 1] === 'este' || n[i - 1] === 'del')) {
        // el último <día> que ya pasó (o hoy si coincide)
        const objetivo = DIAS_N.indexOf(n[i]);
        let f = hoy;
        for (let k = 0; k < 7; k++) { if (U.deISO(f).getDay() === objetivo) break; f = U.sumarDias(f, -1); }
        if (U.deISO(hoy).getDay() === objetivo && n[i - 1] !== 'este') f = hoy;
        fecha = f; usados.push(i - 1, i); hallada = true;
      } else if (toks[i].num != null && n[i + 1] === 'de' && MESES_N.includes(n[i + 2]) && Number.isInteger(toks[i].num) && toks[i].num >= 1 && toks[i].num <= 31) {
        const mes = MESES_N.indexOf(n[i + 2]) + 1;
        let anio = Number(hoy.slice(0, 4));
        let f = anio + '-' + U.pad(mes) + '-' + U.pad(toks[i].num);
        if (f > hoy) f = (anio - 1) + f.slice(4);
        fecha = f; usados.push(i, i + 1, i + 2); if (n[i - 1] === 'el') usados.push(i - 1); hallada = true;
      }
    }
    return { fecha, usados, hallada };
  }

  /* ------------------------------------------------------------------------ Periodos */
  function leerPeriodo(toks, hoy) {
    const n = toks.map((t) => t.n);
    const t = n.join(' ');
    const usados = [];
    const marca = (re) => { const m = t.match(re); return m; };
    let clave = null, desde, hasta, etiqueta;
    if (/\bhoy\b/.test(t)) { clave = 'hoy'; desde = hasta = hoy; etiqueta = 'hoy'; }
    else if (/\bayer\b/.test(t)) { clave = 'ayer'; desde = hasta = U.sumarDias(hoy, -1); etiqueta = 'ayer'; }
    else if (/semana pasada/.test(t)) { clave = 'semana_pasada'; desde = U.sumarDias(U.inicioSemana(hoy), -7); hasta = U.sumarDias(desde, 6); etiqueta = 'la semana pasada'; }
    else if (/\bsemana\b/.test(t)) { clave = 'semana'; desde = U.inicioSemana(hoy); hasta = hoy; etiqueta = 'esta semana'; }
    else if (/mes pasado|mes anterior|ultimo mes/.test(t)) { const a = U.sumarMeses(U.inicioMes(hoy), -1); clave = 'mes_pasado'; desde = a; hasta = U.finMes(a); etiqueta = 'el mes pasado'; }
    else if (/ano pasado|ano anterior/.test(t)) { const y = Number(hoy.slice(0, 4)) - 1; clave = 'anio_pasado'; desde = y + '-01-01'; hasta = y + '-12-31'; etiqueta = 'el año pasado'; }
    else if (/\b(este|en el|del) ano\b|\ben el ano\b|\bdel ano\b/.test(t)) { clave = 'anio'; desde = U.inicioAnio(hoy); hasta = hoy; etiqueta = 'este año'; }
    else if (/ultimos? (\d+) dias/.test(t)) { const k = Number(t.match(/ultimos? (\d+) dias/)[1]); clave = 'dias'; desde = U.sumarDias(hoy, -(k - 1)); hasta = hoy; etiqueta = 'los últimos ' + k + ' días'; }
    else if (/acumulado|en total|desde siempre|siempre|historico|todo/.test(t)) { clave = 'todo'; desde = '0000-01-01'; hasta = '9999-12-31'; etiqueta = 'en total'; }
    else {
      const mi = MESES_N.findIndex((mm) => new RegExp('\\b' + mm + '\\b').test(t));
      if (mi >= 0) {
        let y = Number(hoy.slice(0, 4)); if (mi + 1 > Number(hoy.slice(5, 7))) y -= 1;
        desde = y + '-' + U.pad(mi + 1) + '-01'; hasta = U.finMes(desde); clave = 'mes_nombre'; etiqueta = 'en ' + MESES_N[mi];
      } else { clave = 'mes'; desde = U.inicioMes(hoy); hasta = U.finMes(hoy); etiqueta = 'este mes'; }
    }
    n.forEach((w, i) => { if (/^(hoy|ayer|semana|mes|ano|pasada|pasado|este|esta|acumulado|total|ultimos|ultimo|dias)$/.test(w) || MESES_N.includes(w)) usados.push(i); });
    return { clave, desde, hasta, etiqueta, usados };
  }

  /* ---------------------------------------------------------------------- Intenciones */
  const tiene = (txt, re) => re.test(txt);

  function detectarCorreccion(toks, n, txt, ctx) {
    const primeras = n.slice(0, 3);
    const abre = primeras.some((w) => V_CORREGIR.has(w)) || /^(no era|era un|era una|es un|es una|fue un|fue una)\b/.test(txt) || /^deshaz/.test(txt)
      || /^(no,? )?(era|eran|fue|fueron)\b/.test(txt) || /^(el|la) (ultimo|ultima|anterior)\b(?! (mes|ano|semana|dia))/.test(txt) || /^(ese|esa|eso)\b/.test(txt) || /^me equivoque\b/.test(txt);
    if (!abre) return null;
    // "pon" también aparece en "ponme un límite": eso es presupuesto
    if (/\b(limite|presupuesto|tope)\b/.test(txt)) return null;
    // "mejor" solo cuenta si pide cambiar algo
    if (n[0] === 'mejor' && !/\b(a|en|como)\b/.test(txt)) return null;
    const accion = {};
    if (n.some((w) => V_BORRAR.has(w))) accion.accion = 'borrar';
    else if (/\bdesha[cz]/.test(txt) || /vuelve atras|deja como estaba/.test(txt)) accion.accion = 'deshacer';
    else {
      const cant = toks.find((t) => t.num != null);
      const quiereTipoIngreso = /\b(ingreso|ganancia)\b/.test(txt) && !/\bgasto\b/.test(txt.replace(/era (un )?gasto/, ''));
      const quiereTipoGasto = /\bgasto\b/.test(txt) && !/\bingreso\b/.test(txt);
      if (/\bnecesari[oa]\b/.test(txt)) { accion.accion = 'necesidad'; accion.nec = 'N'; }
      else if (/\b(gusto|capricho|lujo)\b/.test(txt)) { accion.accion = 'necesidad'; accion.nec = 'G'; }
      else if (cant && !/\b(a|en|de|como|era)\s+(la |el )?(salud|comida|transporte)/.test(txt) && cant.num != null && /\b(monto|valor|precio|a|por|eran|fue|fueron|era)\b/.test(txt) && !tieneCategoriaPalabra(n, ctx)) {
        accion.accion = 'monto'; accion.monto = cant.num;
      } else {
        // ¿cambia de categoría?
        const rest = n.filter((w) => !V_CORREGIR.has(w) && !PARADA.has(w) && !/^(ultimo|ultima|anterior|gasto|ingreso|movimiento|registro|categoria|lo|eso|esto)$/.test(w));
        const c = clasificar(rest, rest.map((_, i) => i), null, ctx);
        if (c.cat) { accion.accion = 'categoria'; accion.cat = c.cat.id; accion.catNombre = c.cat.nombre; }
        else if (quiereTipoIngreso) { accion.accion = 'tipo'; accion.nuevoTipo = 'ingreso'; }
        else if (quiereTipoGasto) { accion.accion = 'tipo'; accion.nuevoTipo = 'gasto'; }
        else if (cant) { accion.accion = 'monto'; accion.monto = cant.num; }
        else { accion.accion = 'desconocida'; }
      }
    }
    // ¿a cuál movimiento se refiere? por defecto, el último
    const objetivo = { cual: 'ultimo' };
    const dicho = n.filter((w) => !V_CORREGIR.has(w) && !PARADA.has(w) && !/^(ultimo|ultima|anterior|gasto|ingreso|movimiento|registro|categoria|lo|eso|esto|a|en|como|era|monto|valor|precio)$/.test(w) && !/^\d/.test(w));
    if (accion.accion === 'borrar' || accion.accion === 'monto' || accion.accion === 'necesidad' || accion.accion === 'tipo') {
      const c = clasificar(dicho, dicho.map((_, i) => i), null, ctx);
      if (c.cat) objetivo.cat = c.cat.id;
    }
    return Object.assign({ tipo: 'corregir', objetivo }, accion);
  }
  function tieneCategoriaPalabra(n, ctx) {
    const rest = n.filter((w) => !V_CORREGIR.has(w) && !PARADA.has(w));
    return !!clasificar(rest, rest.map((_, i) => i), null, ctx).cat;
  }

  function detectarPresupuesto(toks, n, txt, ctx) {
    if (!/\b(limite|presupuesto|tope)\b/.test(txt)) return null;
    if (/^(cuanto|cual|dime|como|que)\b/.test(txt)) return null;
    const cant = toks.find((t) => t.num != null);
    if (!cant) return { tipo: 'presupuesto', monto: null, cat: null };
    const rest = n.filter((w, i) => !PARADA.has(w) && !/^(limite|presupuesto|tope|ponme|pon|ponle|pone|crea|crear|quiero|un|de|mensual|mes|al|general|total)$/.test(w) && toks[i].num == null);
    const c = clasificar(rest, rest.map((_, i) => i), 'gasto', ctx);
    return { tipo: 'presupuesto', monto: cant.num, cat: c.cat ? c.cat.id : null, catNombre: c.cat ? c.cat.nombre : null, periodo: 'mes' };
  }

  function detectarInforme(n, txt) {
    if (!/\b(informe|reporte|pdf|exporta|exportar|exportame|imprime)\b/.test(txt)) return null;
    if (/^(cuanto|dime)\b/.test(txt)) return null;
    return { tipo: 'informe', formato: /\bpdf\b/.test(txt) ? 'pdf' : /\b(excel|xlsx)\b/.test(txt) ? 'excel' : /\bcsv\b/.test(txt) ? 'csv' : 'pantalla' };
  }

  function detectarPregunta(toks, n, txt, ctx) {
    const abre = OPENER_PREGUNTA.has(n[0]) || (n[0] === 'en' && n[1] === 'que') || /^(como voy|como estoy|como me va|a cuanto|me queda|me alcanza|me conviene|que tal)/.test(txt) || /^(por favor |oye |dime |asistente )+(cuanto|cual|como|en que)/.test(txt);
    const signo = /\?\s*$/.test(txt) || /^[¿]/.test(txt);
    if (!abre && !signo) return null;
    // "puedo", "hay", "tengo", "que" solo abren pregunta si no hay verbo de registro
    const hayVerbo = n.some((w) => V_GASTO.has(w) || V_INGRESO.has(w));
    if (hayVerbo && toks.some((t) => t.num != null) && !/^(cuanto|cuantos|cuanta|cuantas|dime|muestrame|desglosame)/.test(n[0])) return null;
    if (hayVerbo && /^que\b/.test(txt) && !/\?/.test(txt)) return null;

    const per = leerPeriodo(toks, ctx.hoy);
    const cant = toks.find((t) => t.num != null);
    const q = { tipo: 'preguntar', tema: 'balance', periodo: per, texto: txt };
    // tema
    if (/\b(puedo gastar|puedes gastar|me queda|cuanto me queda|disponible|me alcanza para hoy|libre)\b/.test(txt)) q.tema = 'disponible';
    else if (/\b(me conviene|conviene comprar|vale la pena)\b/.test(txt) || (/\b(me alcanza|puedo comprar|podria comprar|puedo pagar)\b/.test(txt) && cant)) { q.tema = 'meconviene'; q.monto = cant ? cant.num : null; }
    else if (/\b(tarjeta|tarjetas|visa|mastercard|diners|amex)\b/.test(txt) && /\b(debo|deber|pagar|pago|cuota|cuotas|corte|vence|vencimiento|saldo|cupo|intereses|minimo)\b/.test(txt)) {
      q.tema = 'tarjeta';
      q.tarjetaId = tarjetaDeTexto(n, ctx);
      q.cuando = /\b(cuando|fecha|vence|vencimiento|corte)\b/.test(txt);
    }
    else if (/\b(en que gasto mas|que gasto mas|donde gasto mas|mayor gasto|gasto mas)\b/.test(txt)) q.tema = 'masgasto';
    else if (/\bhormiga\b/.test(txt)) q.tema = 'hormiga';
    else if (/\b(ahorr)/.test(txt)) q.tema = 'ahorro';
    else if (/\b(necesari|gusto|vanidad|capricho)/.test(txt)) q.tema = 'necesario_gusto';
    else if (/\b(ingres\w*|gane|ganado|ganancias?|cobre|cobrado|sueldo|recibi|recibido)\b/.test(txt) && !/\b(gast|desglos)\b/.test(txt)) q.tema = 'ingresos';
    else if (/\b(gast|desglos|compre|pague|salio|salieron|egreso)/.test(txt)) {
      q.tema = /desglos|detall|por categoria|en que/.test(txt) ? 'desglose' : 'gastos';
      const rest = n.filter((w, i) => !PARADA.has(w) && toks[i].num == null && !per.usados.includes(i) && !/^(cuanto|cuantos|he|has|hemos|gastado|gaste|gasto|gastos|desglosame|desglosa|dime|muestrame|mis|mi|lo|total|en|por|categoria|categorias)$/.test(w));
      const c = clasificar(rest, rest.map((_, i) => i), 'gasto', ctx);
      if (c.cat) { q.cat = c.cat.id; q.catNombre = c.cat.nombre; q.tema = 'gastos'; }
    }
    else if (/\b(como voy|como estoy|resumen|resumeme|balance|como me va)\b/.test(txt)) q.tema = 'balance';
    else q.tema = 'balance';
    return q;
  }

  function tarjetaDeTexto(n, ctx) {
    const tarjetas = ctx.tarjetas || [];
    let mejor = null, sc = 0;
    tarjetas.forEach((t) => {
      const pal = U.norm([t.nombre, t.banco, t.red, t.nivel].filter(Boolean).join(' ')).split(/\s+/).filter((w) => w && !PARADA.has(w) && !/^(tarjeta|banco|credito|de|del|la)$/.test(w));
      const hit = pal.filter((w) => n.includes(w)).length;
      if (hit > sc) { sc = hit; mejor = t.id; }
    });
    return mejor;
  }

  /* ------------------------------------------------------------------- Registrar */
  function interpretarRegistro(toks, n, txt, ctx) {
    const hoy = ctx.hoy;
    const roles = new Array(toks.length).fill('');
    const consumidos = new Set();
    const marcar = (idxs, rol) => idxs.forEach((i) => { if (i >= 0 && i < toks.length) { consumidos.add(i); if (rol) roles[i] = rol; } });

    /* ---- fecha */
    const f = leerFecha(toks, hoy);
    marcar(f.usados, 'otro');

    /* ---- tarjeta y forma de pago */
    const credito = { modo: null, meses: null, cuota: null, interes: null };
    let usaTarjeta = false, efectivoExplicito = false;
    // Detectar "pagué LA tarjeta" / "pagué DE la tarjeta" = pago al banco, NO compra con tarjeta
    const esPagoATarjeta = /\b(pagu[eé]|pagamos|abon[eé]|abonamos|pagar?)\s+(la|de la|a la|mi|al)\s+tarjeta\b/.test(txt)
      || /\b(pago|abono)\s+(de |a |al )?(la\s+)?(tarjeta|banco)\b/.test(txt)
      || /\bpag(ué?|e|amos)\s+del?\s+(banco|austro|pichincha|guayaquil|bolivariano|produbanco|internacional|pacifico|solidario|biess)\b/.test(txt);
    n.forEach((w, i) => {
      // Solo marcar como "pago con tarjeta" si NO es un pago a la tarjeta
      if (!esPagoATarjeta && /^(tarjeta|tarjetas|visa|mastercard|master|diners|amex|american)$/.test(w)) { usaTarjeta = true; marcar([i], 'otro'); }
      if (/^(credito)$/.test(w) && n[i - 1] !== 'del' && n[i - 1] !== 'de') { usaTarjeta = true; }
      if (/^(efectivo|cash)$/.test(w)) { efectivoExplicito = true; marcar([i], 'otro'); }
      if (/^(debito)$/.test(w)) { efectivoExplicito = true; marcar([i], 'otro'); }
      if (/^(corriente|contado)$/.test(w)) { credito.modo = 'corriente'; usaTarjeta = true; marcar([i], 'otro'); }
      if (/^(rotativo|rotativa)$/.test(w)) { credito.modo = 'rotativo'; usaTarjeta = true; marcar([i], 'otro'); }
      if (/^(diferido|diferida|diferi|diferir|diferidos)$/.test(w)) { credito.modo = 'diferido'; usaTarjeta = true; marcar([i], 'otro'); }
      if ((w === 'sin' && /^intereses?$/.test(n[i + 1] || ''))) { credito.interes = false; marcar([i, i + 1], 'otro'); }
      if ((w === 'con' && /^intereses?$/.test(n[i + 1] || ''))) { credito.interes = true; marcar([i, i + 1], 'otro'); }
      if (w === 'a' && n[i + 1] === 'plazos') { credito.modo = 'diferido'; usaTarjeta = true; marcar([i, i + 1], 'otro'); }
    });
    for (let i = 0; i < toks.length; i++) {
      // cuotas de 49
      if (/^cuotas?$/.test(n[i])) {
        let j = i + 1;
        if (/^(mensual|mensuales|fijas?)$/.test(n[j] || '')) j++;
        if (n[j] === 'de') j++;
        if (toks[j] && toks[j].num != null && !/^(meses|mes)$/.test(n[j + 1] || '')) {
          credito.cuota = toks[j].num; credito.modo = credito.modo || 'diferido'; usaTarjeta = true;
          marcar([i, j], 'otro'); if (n[i + 1] === 'de' || /^(mensual|mensuales|fijas?)$/.test(n[i + 1] || '')) marcar([i + 1, j - 1 > i ? j - 1 : i + 1], 'otro');
          for (let k = i; k <= j; k++) marcar([k], 'otro');
          if (/^(mensual|mensuales)$/.test(n[j + 1] || '')) marcar([j + 1], 'otro');
        } else if (!credito.modo) { credito.modo = 'diferido'; usaTarjeta = true; marcar([i], 'otro'); }
        continue;
      }
      // a 6 meses / en 12 cuotas / 6 meses
      if (toks[i].num != null && /^(meses|mes|cuotas|pagos)$/.test(n[i + 1] || '') && Number.isInteger(toks[i].num) && toks[i].num >= 1 && toks[i].num <= 72) {
        credito.meses = toks[i].num; credito.modo = credito.modo || 'diferido'; usaTarjeta = true;
        marcar([i, i + 1], 'otro'); if (/^(a|en|por|de)$/.test(n[i - 1] || '')) marcar([i - 1], 'otro');
        if (n[i + 1] === 'meses' && n[i + 2] === 'sin' && /^intereses?$/.test(n[i + 3] || '')) { credito.interes = false; }
        continue;
      }
      // a un año / a 1 año
      if (/^(a|en)$/.test(n[i]) && /^(1|un|una)$/.test(n[i + 1] || '') && /^anos?$/.test(n[i + 2] || '')) { credito.meses = 12; credito.modo = credito.modo || 'diferido'; usaTarjeta = true; marcar([i, i + 1, i + 2], 'otro'); }
    }
    if (credito.modo === 'diferido' && credito.meses == null && credito.cuota == null) credito.meses = credito.meses; // pendiente: la app pregunta
    if (credito.modo === 'diferido' && credito.interes == null) credito.interes = null; // se decide con la tarjeta o se pregunta

    /* ---- tarjeta concreta */
    let tarjetaId = null, tarjetaDuda = false, sinTarjetas = false;
    if (usaTarjeta) {
      tarjetaId = tarjetaDeTexto(n, ctx);
      const ts = ctx.tarjetas || [];
      if (!tarjetaId) {
        if (ts.length === 1) tarjetaId = ts[0].id;
        else if (ts.length === 0) sinTarjetas = true;
        else tarjetaDuda = true;
      }
      if (!credito.modo) credito.modo = 'corriente';
    }

    /* ---- tipo (gasto / ingreso) */
    let tipo = null, verboIdx = [];
    FRASES_INGRESO.forEach((fr) => { const k = txt.indexOf(fr); if (k >= 0 && !tipo) tipo = 'ingreso'; });
    FRASES_GASTO.forEach((fr) => { const k = txt.indexOf(fr); if (k >= 0 && !tipo) tipo = 'gasto'; });
    for (let i = 0; i < n.length; i++) {
      const w = n[i];
      if (!tipo && V_INGRESO.has(w)) { tipo = 'ingreso'; verboIdx.push(i); }
      else if (!tipo && V_GASTO.has(w)) { tipo = 'gasto'; verboIdx.push(i); }
      else if (tipo === 'ingreso' && V_INGRESO.has(w)) verboIdx.push(i);
      else if (tipo === 'gasto' && V_GASTO.has(w)) verboIdx.push(i);
      if (w === 'saque' && /\bsueldo\b/.test(txt)) { tipo = 'ingreso'; verboIdx.push(i); }
    }
    // frases con "me" + verbo: marcar las dos palabras
    n.forEach((w, i) => { if (w === 'me' && toks[i + 1] && /^(pagaron|depositaron|llego|llegaron|entro|dieron|regalaron|transfirieron|abonaron|cobraron|costo|salio)$/.test(n[i + 1])) { verboIdx.push(i, i + 1); } });
    let tipoDuda = false;
    if (!tipo) {
      // sin verbo: ¿hay palabras de ingreso (sueldo, propina, venta)?
      const rest = n.filter((w, i) => !PARADA.has(w) && toks[i].num == null);
      const ci = clasificar(rest, rest.map((_, i) => i), 'ingreso', ctx);
      const cg = clasificar(rest, rest.map((_, i) => i), 'gasto', ctx);
      if (ci.cat && ci.score > (cg.score || 0)) tipo = 'ingreso';
      else { tipo = 'gasto'; if (n.includes('saque')) tipoDuda = true; }
    }
    marcar(verboIdx, 'tipo');

    /* ---- candidatos a monto */
    const hayMarca = (i) => (toks[i].n.startsWith('$') || toks[i].n.endsWith('$') || /(usd|dolares|dolar)$/.test(toks[i].n) || (n[i + 1] && MONEDAS.has(n[i + 1])) || (n[i - 1] && n[i - 1] === '$'));
    let cands = [];
    const CANTIDAD = /^(amigos|amigas|personas|persona|gente|ninos|ninas|companeros|invitados|veces|vez|horas|hora|dias|kilos|kilo|libras|libra|litros|litro|galones|galon|unidades|metros)$/;
    toks.forEach((t, i) => { if (t.num != null && !consumidos.has(i) && !/%$/.test(t.n) && !CANTIDAD.test(n[i + 1] || '')) cands.push(i); });
    const puntaje = (i) => {
      let s = 0;
      if (hayMarca(i)) s += 5;
      const ant = n[i - 1] || '';
      if (verboIdx.includes(i - 1)) s += 3;
      if (/^(en|por|de|a|con)$/.test(ant) && !hayMarca(i)) s += 1;
      const sig = n[i + 1];
      if (sig && !MONEDAS.has(sig) && !PARADA.has(sig) && !hayMarca(i) && toks[i].num <= 12 && Number.isInteger(toks[i].num)) s -= 4; // "2 pizzas": cantidad
      else if (sig && !MONEDAS.has(sig) && !PARADA.has(sig) && !hayMarca(i)) s -= 0.5;
      return s;
    };

    // ¿varias cosas en una frase? ("gasté 3 en salchipapa y 5 en pasaje")
    let segmentos = [{ desde: 0, hasta: toks.length - 1 }];
    if (cands.length > 1) {
      const cortes = [];
      let ok = true;
      for (let k = 0; k < cands.length - 1; k++) {
        const a = cands[k], b = cands[k + 1];
        let corte = -1;
        for (let i = b - 1; i > a; i--) { if (/^(y|e|ademas|tambien|luego|despues|mas)$/.test(n[i]) || toks[i].coma) { corte = toks[i].coma && !/^(y|e)$/.test(n[i]) ? i + 1 : i + 1; break; } }
        if (corte < 0) { ok = false; break; }
        cortes.push(corte);
      }
      if (ok) {
        const segs = [];
        let ini = 0;
        cortes.forEach((c) => { segs.push({ desde: ini, hasta: c - 1 }); ini = c; });
        segs.push({ desde: ini, hasta: toks.length - 1 });
        const cuenta = (s) => cands.filter((i) => i >= s.desde && i <= s.hasta).length;
        if (segs.every((s) => cuenta(s) === 1)) segmentos = segs;
      }
    }

    const items = [];
    const nuevos = [];
    segmentos.forEach((sg, si) => {
      const mios = cands.filter((i) => i >= sg.desde && i <= sg.hasta);
      if (!mios.length) return;
      let elegido = mios[0], mejorS = -99;
      mios.forEach((i) => { const s = puntaje(i); if (s > mejorS || (s === mejorS && i > elegido)) { mejorS = s; elegido = i; } });
      marcar([elegido], 'monto');
      // palabra de moneda pegada al monto
      if (n[elegido + 1] && MONEDAS.has(n[elegido + 1])) marcar([elegido + 1], 'monto');
      if (n[elegido - 1] === '$') marcar([elegido - 1], 'monto');

      // concepto = tokens del segmento que no son verbo/monto/fecha/tarjeta/palabras de relleno
      const idx = [];
      for (let i = sg.desde; i <= sg.hasta; i++) {
        if (roles[i] === 'tipo' || roles[i] === 'monto' || roles[i] === 'otro') continue;
        if (consumidos.has(i) && roles[i] !== 'cat') continue;
        idx.push(i);
      }
      const palabras = idx.map((i) => n[i]).filter((w, k) => true);
      // el tipo del segmento: hereda del primero salvo que tenga verbo propio
      let tipoItem = tipo;
      if (si > 0) {
        const vp = n.slice(sg.desde, sg.hasta + 1).findIndex((w) => V_INGRESO.has(w) || w === 'gane');
        const vg = n.slice(sg.desde, sg.hasta + 1).findIndex((w) => V_GASTO.has(w));
        if (vp >= 0) tipoItem = 'ingreso'; else if (vg >= 0) tipoItem = 'gasto';
      }
      const c = clasificar(palabras, idx, tipoItem, ctx);
      let catId = null, conf = 'ninguna';
      if (c.cat) {
        catId = c.cat.id;
        conf = c.aprendido || c.score >= 2 ? 'alta' : 'media';
        marcar(c.usados, 'cat');
      } else if (tipoItem === 'ingreso') {
        catId = 'extra'; conf = 'media';
      } else if (esPagoATarjeta) {
        // "pagué la tarjeta del austro $600" => categoría Deudas y cuotas
        catId = 'deudas'; conf = 'alta';
      } else { catId = 'otros'; conf = 'ninguna'; }
      // texto libre del concepto (sin palabras de relleno)
      const contenido = idx.filter((i) => roles[i] !== 'cat' || true).filter((i) => !PARADA.has(n[i]) && toks[i].num == null).map((i) => toks[i].raw.replace(/[?!.,;:]+$/, ''));
      let desc = contenido.join(' ').trim();
      let palabraNueva = null;
      if (conf === 'ninguna' && contenido.length) {
        palabraNueva = U.norm(contenido[contenido.length - 1]);
        if (contenido.length > 1 && contenido.length <= 3) palabraNueva = U.norm(contenido.join(' '));
        nuevos.push(palabraNueva);
      }
      const cat = (ctx.categorias.find((x) => x.id === catId)) || null;
      items.push({
        tipo: tipoItem, monto: toks[elegido].num, cat: catId, catNombre: cat ? cat.nombre : null, catIcono: cat ? cat.icono : null,
        catConfianza: conf, desc: desc ? U.cap(desc) : '', fecha: f.fecha, nec: cat ? cat.nec : null, palabraNueva,
        cuenta: tipoItem === 'gasto' && usaTarjeta && !efectivoExplicito ? 'tarjeta' : 'efectivo',
      });
    });

    if (!items.length) {
      // hay verbo pero ningún monto
      return { tipo: 'registrar', items: [], falta: 'monto', partes: partes(toks, roles), texto: txt };
    }
    if (items[0].cuenta === 'tarjeta') {
      items.forEach((it) => { if (it.cuenta === 'tarjeta') Object.assign(it, { tarjetaId, credito: Object.assign({}, credito) }); });
    }
    const dudas = [];
    if (items.some((it) => it.catConfianza === 'ninguna')) dudas.push('categoria');
    if (tarjetaDuda) dudas.push('tarjeta');
    if (tipoDuda) dudas.push('tipo');
    if (credito.modo === 'diferido' && credito.meses == null && credito.cuota == null) dudas.push('meses');
    return { tipo: 'registrar', items, tarjetaDuda, sinTarjetas, dudas, partes: partes(toks, roles), texto: txt, fecha: f.fecha };
  }

  // Convierte tokens + roles en trozos para mostrar la frase anotada
  function partes(toks, roles) {
    const out = [];
    toks.forEach((t, i) => {
      const rol = roles[i] || '';
      const ult = out[out.length - 1];
      if (ult && ult.rol === rol && rol !== '') ult.texto += ' ' + t.raw;
      else out.push({ texto: t.raw, rol });
    });
    // une trozos sueltos consecutivos sin rol
    const res = [];
    out.forEach((p) => { const u = res[res.length - 1]; if (u && !u.rol && !p.rol) u.texto += ' ' + p.texto; else res.push(p); });
    return res;
  }

  /* ---------------------------------------------------------------------- Principal */
  function interpretar(texto, ctx) {
    ctx = Object.assign({ hoy: U.hoyISO(), categorias: AF.PLAN.categorias, dicc: {}, tarjetas: [] }, ctx || {});
    const crudo = String(texto || '').trim();
    if (!crudo) return { tipo: 'desconocido', texto: '' };
    const toks = tokenizar(crudo);
    const n = toks.map((t) => t.n);
    const txt = n.join(' ');
    if (/^(ayuda|que puedes hacer|como funciona|que haces)\b/.test(txt)) return { tipo: 'ayuda', texto: txt };

    const cor = detectarCorreccion(toks, n, txt, ctx);
    if (cor) return Object.assign(cor, { texto: txt, partes: partes(toks, new Array(toks.length).fill('')) });
    const pre = detectarPresupuesto(toks, n, txt, ctx);
    if (pre) return Object.assign(pre, { texto: txt });
    const inf = detectarInforme(n, txt);
    if (inf) return Object.assign(inf, { texto: txt, periodo: leerPeriodo(toks, ctx.hoy) });
    const preg = detectarPregunta(toks, n, txt, ctx);
    if (preg) return preg;

    const hayNumero = toks.some((t) => t.num != null);
    const hayVerbo = n.some((w) => V_GASTO.has(w) || V_INGRESO.has(w)) || FRASES_INGRESO.concat(FRASES_GASTO).some((fr) => txt.includes(fr));
    if (hayNumero || hayVerbo) return interpretarRegistro(toks, n, txt, ctx);
    return { tipo: 'desconocido', texto: txt, partes: partes(toks, new Array(toks.length).fill('')) };
  }

  AF.parser = { interpretar, tokenizar, clasificar, leerPeriodo, leerFecha };
  if (typeof module === 'object' && module.exports) module.exports = AF.parser;
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/bancos-datos.js ===== */
/* CATÁLOGO DE BANCOS Y TARIFAS — es la ÚNICA tabla de bancos de la app.
   Se puede reemplazar sin publicar versión: PLAN.remoto.urlTarifas apunta a un JSON con esta misma forma (ver bancos.js → actualizarRemoto).

   REGLAS (no negociables):
   - Solo van cifras que se leyeron en un documento oficial del banco o de la autoridad. Cada banco con datos trae `fuente` (documento, vigencia, enlace).
   - Lo que no se pudo leer con certeza NO se escribe: queda sin dato y la app le pide a la persona que lo anote ella.
   - Los textos de `costos` ya vienen con IVA (15 %) salvo que digan lo contrario. Son informativos: manda el estado de cuenta.
   - Tasas: la app calcula con tasa NOMINAL anual (cuota = tasa/12). Los bancos publican la EFECTIVA; bancos.js convierte (16,77 % efectiva ≈ 15,60 % nominal). */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});

  const sinDatos = null;

  // Avance «$X + IVA por cada fracción de $100» (rangos x01 a x00,99; los centavos cuentan en el rango menor).
  // Devuelve [desde, valorConIVA] para n tramos: n × base y luego el IVA, en centavos enteros (así no hay errores de decimales).
  const tramos100 = (desdeUsd, n, baseUsd, ivaPct) => Array.from({ length: n }, (_, i) => {
    const base = Math.round(baseUsd * 100) * (i + 1);
    return [i === 0 ? desdeUsd : i * 100 + 1, (base + Math.round((base * ivaPct) / 100)) / 100];
  });

  // Texto de una tabla de avance a partir de sus escalones: «$7,19 hasta $100,99 · $12,32 hasta $200,99 · … · $316,25 desde $10.001».
  // Así el texto que se muestra nunca se contradice con los valores con los que calcula la app.
  const usd = (n) => { const [e, d] = Math.abs(n).toFixed(2).split('.'); return '$' + e.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d; };
  const rangosTexto = (esc) => esc.map(([desde, valor], i) => (i + 1 < esc.length ? usd(valor) + ' hasta ' + usd(esc[i + 1][0] - 0.01) : usd(valor) + ' desde ' + usd(desde))).join(' · ');

  // Banco Guayaquil: el tarifario de junio 2026 trae DOS tablas de avance que se traslapan y no dice cuál manda; se publican las dos, tal cual.
  // Tabla «Avances en efectivo local — rangos estándar» (p. 7): columna «cajero automáticos, banca electrónica y banca móvil» y columna «oficina y corresponsales no bancarios».
  const GYE_CAJERO = [[0, 7.19], [101, 12.32], [201, 17.46], [301, 25.67], [401, 30.81], [501, 53.39], [801, 57.50], [901, 76.73], [1001, 82.14], [1301, 87.27], [1401, 92.41], [1501, 98.58], [2001, 127.33], [3001, 156.08], [4001, 184.83], [5001, 213.58], [6001, 242.33], [7001, 271.08], [8001, 287.50], [10001, 299.83]];
  const GYE_OFICINA = [[0, 20.54], [301, 28.75], [401, 34.50], [501, 46.21], [601, 51.34], [701, 53.39], [801, 57.50], [901, 77.00], [1001, 82.14], [1301, 87.27], [1401, 92.41], [1501, 99.60], [1601, 106.79], [1701, 113.98], [1801, 115.00], [2001, 143.75], [3001, 172.50], [4001, 201.25], [5001, 230.00], [6001, 258.75], [7001, 287.50], [10001, 316.25]];
  // Tabla «Avances en efectivo exterior» (p. 8): «cajeros / internet, propios, locales o del exterior» y «ventanilla local o del exterior».
  const GYE_CAJERO_EXT = [[1, 7.19], [101, 12.32], [201, 17.46], [301, 22.59], [401, 27.73], [501, 53.39]];
  const GYE_VENTANILLA = [[1, 20.54], [301, 25.67], [401, 30.81], [501, 35.94], [601, 41.07], [701, 46.21], [801, 51.34], [901, 56.48], [1001, 64.69], [2001, 86.25], [3001, 115.00], [4001, 143.75], [5001, 172.50], [6001, 201.25], [7001, 230.00], [8001, 258.75], [9001, 287.50], [10001, 316.25]];

  AF.CATALOGO_BANCOS = {
    version: 1,
    actualizado: '2026-11-06',

    // Techo legal por país (no es la tasa de tu tarjeta: tu banco puede cobrar menos).
    techoLegal: {
      EC: {
        efectivaAnual: 16.77,
        etiqueta: 'Techo legal del crédito de consumo',
        vigencia: 'marzo 2026',
        fuente: 'Junta de Política y Regulación Financiera, según El Diario (4 mar. 2026)',
        url: 'https://www.eldiario.ec/negocios/bancos-en-ecuador-estas-son-las-tasas-de-interes-vigentes-para-los-servicios-financieros-este-2026-04032026/',
      },
    },

    bancos: [
      /* ------------------------------------------------------------------ ECUADOR */
      {
        // Tarifario «web» de noviembre 2026, sección 3.5 «Servicios financieros tarjetas de crédito», Personas (Visa, Discover y Mastercard). Actualizado desde el de febrero 2026.
        // No explica cómo funciona el corriente (días sin interés, pago mínimo): solo publica tasas y tarifas. Tampoco trae el recargo de mora (dice «según regulación del Banco Central»).
        // Los niveles usan los nombres de los productos del tarifario (el plan de recompensas se cobra por producto). Su logo oficial es un SVG.
        id: 'ec-pichincha', pais: 'EC', nombre: 'Banco Pichincha', corto: 'Pichincha',
        redes: ['Visa', 'Mastercard', 'Discover'],
        niveles: ['Premium Miles / Joven Miles', 'Prestige Miles', 'Platinum Miles', 'Signature Miles', 'Infinite / Black Miles', 'Discover'],
        fuente: { texto: 'Tarifario de servicios financieros de Banco Pichincha (noviembre 2026), sección 3.5 (tarjetas de crédito, personas)', vigencia: 'noviembre 2026',
          url: 'https://www.pichincha.com/transparencia' },
        tarifarioUrl: 'https://www.pichincha.com/sites/default/files/documents/2026-10/tarifario-web-noviembre-2026.pdf',
        // Tasa que el banco publica para personas: la misma para diferido (todos los plazos) y rotativo. Es igual al máximo legal.
        tasaPublicada: { efectivaAnual: 16.77, aplicaA: 'diferido y rotativo (personas)' },
        // Avance: $4,46 + IVA por cada $100 o fracción, máximo $133,80 + IVA; mismo valor en cajero propio, cajero local, exterior y oficina/web/teléfono.
        avance: { tipo: 'porCada100', baseUsd: 4.46, topeBaseUsd: 133.80, ivaPct: 15 },
        recompensasPorNivel: {
          'Premium Miles / Joven Miles': 'Plan de recompensas $11,50 · prestaciones en el exterior $8,05 (Premium Miles, Internacional Microfinanzas, Premium Microfinanzas Miles y Joven Miles)',
          'Prestige Miles': 'Plan de recompensas $26,45 · prestaciones en el exterior $12,65',
          'Platinum Miles': 'Plan de recompensas $32,20 · prestaciones en el exterior $18,40',
          'Signature Miles': 'Plan de recompensas $50,60 · prestaciones en el exterior $23,00',
          'Infinite / Black Miles': 'Plan de recompensas $62,10 · prestaciones en el exterior $27,60 (Infinite Miles, Elite Privilege Miles, Quantum, Black Miles y Business Black)',
          'Discover': 'Plan de recompensas $26,45 (Discover, Discover Microfinanzas y Discover Me); el tarifario no trae prestaciones en el exterior para Discover',
        },
        costos: {
          avance: { texto: '$5,13 por cada $100 (o fracción) · máximo $153,87',
            nota: '$4,46 + IVA por cada $100 o fracción, con máximo de $133,80 + IVA. Igual en cajeros propios, cajeros locales, exterior y oficina, web o teléfono. Los intereses del avance van aparte.' },
          diferido: { texto: '16,77 % efectivo anual, igual para todos los plazos', nota: 'Plazos de 2, 3, 6, 9, 12, 24 y 36 meses en adelante: todos 16,77 %. El tarifario no publica factores por plazo.' },
          rotativo: { texto: '16,77 % efectivo anual', nota: 'Es igual al máximo legal del crédito de consumo. El tarifario solo publica tasas y tarifas: no explica los días sin interés ni el pago mínimo; míralo en tu contrato o estado de cuenta.' },
          mantenimiento: { texto: '$0,00', nota: 'Mantenimiento con pago mínimo y con pago total, bloqueo o cancelación, reclamos y estado de cuenta a domicilio: $0,00.' },
          uso: { texto: 'Exterior: $1,96 por consumos de más de $100 · $1,02 por consulta en cajero del exterior',
            nota: 'Gasolineras: $0,23 por consumo. Su tarifario no trae otros cobros por usar la tarjeta, pero tampoco dice expresamente $0,00 para los consumos nacionales. Segunda entrega de la clave: $1,73. Paquete de mensajes (SMS) con tus transacciones o con el manejo de tu tarjeta, pedido en oficina: $2,01.' },
          emision: { texto: '$5,03', nota: 'Emisión y renovación con chip. La renovación aplica cuando vence el plástico.' },
          reposicion: { texto: '$5,03 en agencia o courier · $30,23 en el exterior' },
          recompensas: { texto: '$11,50 a $62,10 según el producto',
            nota: 'Plan de recompensas por producto: Premium Miles y Joven Miles $11,50 · Prestige $26,45 · Platinum $32,20 · Signature $50,60 · Infinite, Elite Privilege, Quantum, Black y Business Black $62,10 · Discover $26,45. Prestaciones en el exterior: $8,05 · $12,65 · $18,40 · $23,00 · $27,60 en ese mismo orden. El tarifario no dice cada cuánto se cobra.' },
          voucher: { texto: '$2,06 local · $10,27 del exterior' },
          estado: { texto: 'A domicilio $0,00 · copia $0,52', nota: 'Referencias bancarias: $2,59. Corte impreso de movimientos: $1,87.' },
          pagoTarjeta: { texto: '$0,39 por banca telefónica, celular, internet o kiosko · $0,45 por ventanilla, corresponsal, entidades auxiliares o cajero', nota: 'Cheque devuelto: $2,86 (nacional) o $3,32 (exterior, más $15,00 que se transfieren al banco del exterior).' },
          gasolinera: { texto: '$0,23 por consumo' },
          cobranza: { texto: 'De $6,38 a $43,99 sin IVA (con IVA, de $7,34 a $50,59: cálculo de la app)',
            nota: 'Si te atrasas: depende de la deuda y los días de mora. 1 a 30 días: $6,38 · $7,35 · $7,92 · $8,32 · $8,63 · $8,88. 31 a 60: $16,23 · $16,46 · $17,83 · $20,34 · $23,99 · $28,78. 61 a 90: $23,17 · $23,85 · $25,27 · $27,43 · $30,34 · $34,01. Más de 90: $25,56 · $26,46 · $29,03 · $32,72 · $37,70 · $43,99; por deuda de menos de $100 · $100–199 · $200–299 · $300–499 · $500–999 · más de $1.000. Para $100–199 con más de 90 días su tabla dice $26,46 y los otros bancos publican $26,64: puede ser un error de digitación. Su nota dice «IVA no detallado en el estado de cuenta» y que todas las tarifas gravan el 15 % de IVA.' },
          mora: { texto: 'La fija el Banco Central', nota: 'El tarifario solo dice "según regulación del Banco Central": no publica el porcentaje.' },
        },
      },
      {
        id: 'ec-produbanco', pais: 'EC', nombre: 'Produbanco', corto: 'Produbanco',
        redes: ['Visa', 'Mastercard', 'Otra'],
        fuente: { texto: 'Tarifario de tarjetas de crédito y tarifas (octubre 2026) y pizarra de tasas (noviembre 2026)', vigencia: 'octubre y noviembre 2026',
          url: 'https://www.produbanco.com.ec/normas-de-transparencia/tasas-de-interes-y-tarifas/' },
        // Tasa efectiva anual para personas (segmento Consumo): la misma para diferido y rotativo.
        tasaPublicada: { efectivaAnual: 16.77, aplicaA: 'diferido y rotativo (personas, segmento Consumo)' },
        // Escalones: desde ese monto (USD) y hasta antes del siguiente, el valor final con IVA.
        avance: { tipo: 'escalones', escalones: [
          [0, 7.19], [101, 12.32], [201, 17.46], [301, 25.67], [401, 30.81], [501, 35.94], [601, 41.07], [701, 46.21], [801, 51.34],
          [901, 56.48], [1101, 61.55], [1201, 66.68], [1301, 71.81], [1401, 76.94], [1501, 82.06], [1601, 87.19], [1701, 92.32],
          [1801, 97.45], [1901, 102.58], [2001, 107.71], [2101, 112.84], [2201, 117.97], [2301, 123.10], [2401, 128.23],
          [2501, 133.35], [2601, 138.48], [2701, 143.61], [2801, 148.74], [2901, 153.87], [5001, 172.50], [6001, 201.25],
          [7001, 230.00], [8001, 258.75], [9001, 287.50],
        ] },
        // Programa de recompensas y prestaciones en el exterior, por segmento del tarifario (valor con IVA).
        recompensasPorNivel: {
          'Black': '$62,10 recompensa + $27,60 prestaciones en el exterior',
          'Infinite': '$62,10 recompensa + $27,60 prestaciones en el exterior',
          'Signature': '$50,60 recompensa + $23,00 prestaciones en el exterior',
          'Platinum': '$32,20 recompensa + $18,40 prestaciones en el exterior',
          'Gold': '$26,45 recompensa + $12,65 prestaciones en el exterior',
          'Clásica': '$11,50 recompensa + $8,05 prestaciones en el exterior (la Clásica básica no cobra recompensa: solo $8,05)',
        },
        costos: {
          rotativo: { texto: '16,77 % efectivo anual',
            nota: 'Si pagas el 100 % del saldo hasta la fecha máxima de pago, no se cobra interés de consumo corriente. Si pagas una parte, o pagas después de la fecha, se cobra interés. Tasa publicada para personas (segmento Consumo).' },
          diferido: { texto: '16,77 % efectivo anual, igual para todos los plazos (2 a 24 meses)',
            nota: 'El interés se calcula por los días reales entre la compra y cada pago. Factor de referencia para estimar el interés total: 2 meses 1,95 % · 3 meses 2,61 % · 6 meses 4,60 % · 9 meses 6,61 % · 12 meses 8,65 % · 24 meses 17,05 %. Una compra diferida entra al estado de cuenta si pasaron más de 30 días desde la compra hasta la fecha máxima de pago; si no, pasa al estado siguiente.' },
          tasa: { texto: '16,77 % efectivo anual (máxima publicada para consumo)', nota: 'Es la tasa efectiva máxima del segmento Consumo según el Banco Central para noviembre de 2026.' },
          mora: { texto: 'Hasta 1,1 veces la tasa pactada', nota: 'La mora se cobra con un recargo de hasta 10 % sobre la tasa pactada o vigente para esa obligación.' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta', nota: 'También $0,00: activación, mantenimiento, pago mínimo, pago total, bloqueo, notificaciones. En gasolineras se cobra $0,23 por consumo.' },
          mantenimiento: { texto: '$0,00' },
          avance: { texto: 'Desde $7,19 hasta $287,50 según el monto', nota: 'Escalonado: $7,19 hasta $100,99; $12,32 hasta $200,99; $17,46 hasta $300,99… El documento no separa avance en cajero, ventanilla o exterior. Los intereses del avance son aparte.' },
          emision: { texto: '$5,03 con chip (emisión y renovación) · $0,00 con banda lectora' },
          reposicion: { texto: '$5,03 con chip · $0,00 con banda lectora · en el exterior $77,00 Visa y $154,02 Mastercard' },
          voucher: { texto: '$2,06 local · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta Produbanco · $0,45 si pagas una tarjeta de otra entidad' },
          gasolinera: { texto: '$0,23 por consumo' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA', nota: 'Si te atrasas: depende de la cuota vencida y los días. Desde $7,34 (1 a 30 días, menos de $100) hasta $50,59 (más de 90 días, desde $1.000).' },
        },
        // No publica en estos documentos: cuota anual de la tarjeta (más allá del programa de recompensas) ni tarjetas adicionales.
      },
      {
        id: 'ec-bolivariano', pais: 'EC', nombre: 'Banco Bolivariano', corto: 'Bolivariano', redes: ['Visa', 'Mastercard', 'UnionPay', 'Otra'],
        // Sus tarjetas de crédito las maneja «Bankard» (el procesador de tarjetas del banco): por eso su pizarra de tasas se llama «Tasas Bankard».
        fuente: { texto: 'Tarifario de servicios financieros Banco Bolivariano y Bankard (octubre–diciembre 2026), pizarra de tasas (vigente desde el 1 de octubre de 2026) y tabla «Tasas Bankard» (sin fecha)', vigencia: 'octubre a diciembre 2026',
          url: 'https://www.bolivariano.com/informacion-institucional/transparencia-de-la-informacion' },
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjetas de crédito (Visa, Mastercard y UnionPay), rotativo y diferido' },
        // Avance en cajero automático (local o exterior): desde ese monto (USD) y hasta antes del siguiente, el valor final con IVA.
        avance: { tipo: 'escalones', escalones: [[0, 7.19], [101, 12.32], [201, 17.46], [301, 22.59], [401, 27.73], [501, 53.39]],
          otrosCanales: { etiqueta: 'Oficina, medios virtuales o corresponsal', escalones: [[0, 20.54], [301, 25.67], [401, 30.81], [501, 35.94], [601, 41.07], [701, 46.21], [801, 51.34], [901, 56.48], [1001, 61.61], [2001, 66.75], [3001, 71.88]] } },
        recompensasPorNivel: {
          'Black': '$62,10 recompensa + $27,60 prestaciones en el exterior',
          'Infinite': '$62,10 recompensa + $27,60 prestaciones en el exterior',
          'Signature': '$50,60 recompensa + $23,00 prestaciones en el exterior',
          'Platinum': '$32,20 recompensa + $18,40 prestaciones en el exterior',
          'Gold': '$26,45 recompensa + $12,65 prestaciones en el exterior',
          'Clásica': '$11,50 recompensa + $8,05 prestaciones en el exterior',
        },
        costos: {
          rotativo: { texto: '15,60 % nominal anual (16,77 % efectivo)', nota: 'Tasa publicada para tarjetas de crédito de consumo (Visa, Mastercard y UnionPay). Los documentos del banco no explican cuándo se cobra o no el interés del consumo corriente: pregúntalo en tu estado de cuenta.' },
          diferido: { texto: '15,60 % nominal anual, igual para todos los plazos (3 a 84 meses)',
            nota: 'Factor de referencia para estimar el interés total: 3 meses 2,61 % · 6 meses 4,60 % · 9 meses 6,61 % · 12 meses 8,65 % · 18 meses 12,80 % · 24 meses 17,05 % · 36 meses 25,86 % · 48 meses 35,05 % · 60 meses 44,64 % · 72 meses 54,60 % · 84 meses 64,93 %.' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual', nota: 'Es la tasa de consumo para tarjetas de crédito, vigente desde el 1 de octubre de 2026.' },
          mora: { texto: 'Recargo hasta: 5 % (1 a 15 días) · 7 % (16 a 30) · 9 % (31 a 60) · 10 % (más de 60)', nota: 'La pizarra lo presenta como recargo por morosidad según los días de atraso.' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta', nota: 'También $0,00: activación, mantenimiento, pago mínimo, pago total, bloqueo, adicionales y frecuencia de transacciones. En el exterior, consumos de más de $100 cobran $1,96; en gasolineras $0,23.' },
          mantenimiento: { texto: '$0,00', nota: 'Incluye pago mínimo y pago total.' },
          avance: { texto: 'Cajero: desde $7,19 hasta $53,39 · oficina o virtual: desde $20,54 hasta $71,88', nota: 'Cajero: $7,19 hasta $100,99; $12,32 hasta $200,99; $17,46 hasta $300,99; $22,59 hasta $400,99; $27,73 hasta $500,99; $53,39 desde $501. Los intereses del avance son aparte.' },
          cobranza: { texto: 'De $6,38 a $43,99 más IVA', nota: 'Si te atrasas: depende de la cuota vencida y los días. Desde $6,38 (1 a 30 días, cuota menor a $100) hasta $43,99 (más de 90 días, desde $1.000), sin IVA.' },
          emision: { texto: '$5,03 con chip (emisión y renovación) · $0,00 con banda lectora' },
          reposicion: { texto: '$5,03 con chip · $0,00 por migración o falla de banda · en el exterior $51,34' },
          recompensas: { texto: '$11,50 a $62,10 según el producto', nota: 'Plan de recompensas (Fast Point): depende del segmento de tu tarjeta.' },
          voucher: { texto: '$2,06 local · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta por los canales del banco' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },
      {
        id: 'ec-pacifico', pais: 'EC', nombre: 'Banco del Pacífico', corto: 'Pacífico', redes: ['Visa', 'Mastercard', 'Otra'],
        niveles: ['Clásica', 'Gold', 'Platinum', 'Infinite', 'Black', 'Premium (Legend)', 'Corporativa'],
        fuente: { texto: 'Tabla de remuneraciones por servicios (vigente desde el 23 de febrero de 2026), pizarra de operaciones de crédito (1 al 30 de noviembre de 2026) y contrato de tarjeta de crédito persona natural (2026)', vigencia: 'febrero y noviembre 2026',
          url: 'https://www.bancodelpacifico.com/transparencia-de-informacion' },
        tarifarioUrl: 'https://www.bancodelpacifico.com/BancoPacifico/media/pdf/TranspInformacion/2026/Tabla_de_remuneraciones_x_servicios.pdf',
        // Tasa máxima del segmento Consumo en su pizarra: nominal 15,6042 % y efectiva 16,77 %.
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'consumo (diferido y rotativo)' },
        // Avance en cajero automático (en el país o en el exterior): desde ese monto (USD) y hasta antes del siguiente, el valor final con IVA.
        avance: { tipo: 'escalones', escalones: [[0, 7.19], [101, 12.32], [201, 17.46], [301, 25.67], [401, 30.81], [501, 35.94], [601, 41.07], [701, 46.21], [801, 51.34], [901, 56.48], [1001, 64.40], [2001, 86.25], [3001, 115.00], [4001, 143.75], [5001, 150.08]],
          otrosCanales: { etiqueta: 'Oficina, kiosco, internet o corresponsal', escalones: [[0, 7.19], [101, 12.32], [201, 17.46], [301, 25.67], [401, 30.81], [501, 35.94], [601, 41.07], [701, 46.21], [801, 51.34], [901, 56.48], [1001, 64.40], [2001, 86.25], [3001, 115.00], [4001, 143.75], [5001, 172.50], [6001, 201.25], [7001, 230.00], [8001, 258.75], [9001, 287.50]] } },
        recompensasPorNivel: {
          'Black': '$62,10 recompensa + $27,60 prestaciones en el exterior',
          'Infinite': '$62,10 recompensa + $27,60 prestaciones en el exterior',
          'Premium (Legend)': '$62,10 recompensa + $27,60 prestaciones en el exterior',
          'Platinum': '$32,20 recompensa + $18,40 prestaciones en el exterior',
          'Gold': '$26,45 recompensa + $12,65 prestaciones en el exterior',
          'Clásica': '$11,50 recompensa + $8,05 prestaciones en el exterior',
        },
        costos: {
          rotativo: { texto: '15,60 % nominal anual (16,77 % efectivo)',
            nota: 'Tienes 15 días desde que se emite el estado de cuenta para pagar el total o el mínimo. Pagando el total no se cobra interés de financiamiento por esos consumos. Si pagas solo el mínimo (o menos del total) pasas al crédito rotativo y se cobran intereses sobre el saldo. El mínimo es el saldo rotativo dividido para un factor que fija el banco, más intereses, cuotas del diferido y cuotas vencidas. Si abonas o cancelas, el interés se recalcula sobre el saldo pendiente y no se cobra recargo.' },
          diferido: { texto: '15,60 % nominal anual (tasa máxima de consumo), de 2 a 24 meses en su tabla',
            nota: 'Factor de referencia para estimar el interés total de una compra diferida de consumo: 2 meses 1,95 % · 3 meses 2,61 % · 6 meses 4,59 % · 9 meses 6,61 % · 12 meses 8,65 % · 24 meses 17,05 %. Si precancelas, se recalcula el interés y no se cobra recargo. Su página de PacifiCard también habla de «Diferido Flex» (desde $100, hasta 48 meses), pero ese plazo no está en la tabla de factores.' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual', nota: 'Es la tasa máxima del segmento Consumo que publican para noviembre de 2026. El documento no dice si tu tarjeta cobra exactamente esa tasa o una menor: míralo en tu estado de cuenta.' },
          mora: { texto: 'A la tasa máxima que fije el regulador, desde la fecha máxima de pago', nota: 'Según el contrato: si no pagas el mínimo o el total a tiempo, el valor adeudado genera interés de mora a la tasa máxima que determine el organismo regulador, contado desde la «fecha máxima de pago». El contrato no publica un porcentaje propio.' },
          uso: { texto: '$0,00 por usar la tarjeta (frecuencia de transacciones)', nota: 'También $0,00: activación, mantenimiento, pago mínimo, pago total, bloqueo y notificaciones. En gasolineras se cobra $0,23 por consumo. Es cargo máximo según la tabla del banco.' },
          mantenimiento: { texto: '$0,00', nota: 'Incluye mantenimiento con pago mínimo y con pago total.' },
          avance: { texto: 'Cajero: desde $7,19 hasta $150,08 · oficina o internet: desde $7,19 hasta $287,50', nota: 'Escalonado por monto: $7,19 hasta $100,99; $12,32 hasta $200,99; $17,46 hasta $300,99; $25,67 hasta $400,99; $30,81 hasta $500,99… hasta $56,48 en $901–$1.000; $64,40 en $1.001–$2.000; $86,25 en $2.001–$3.000. Los intereses del avance son aparte.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA', nota: 'Si te atrasas: depende de la cuota vencida y los días. Desde $7,34 (1 a 30 días, cuota menor a $100) hasta $50,59 (más de 90 días, cuota desde $1.000). No se cobra nada por la gestión antes de la fecha de pago.' },
          emision: { texto: '$5,03 con chip (emisión y renovación) · $0,00 con banda lectora' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro · $0,00 por migración o falla de la banda o el chip' },
          recompensas: { texto: '$11,50 a $62,10 según el producto', nota: 'Plan de recompensas: es un cargo anual y debes aceptarlo por escrito antes de que te lo cobren. Depende del segmento de tu tarjeta.' },
          voucher: { texto: '$2,05 local · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta por los canales del banco' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },
      {
        // Tarifario de servicios financieros, sección «Tarifa por servicios aplicados a tarjetas de crédito» (junio 2026): American Express, Visa y Mastercard.
        // Su logo oficial es blanco (lo usan sobre el magenta de su marca, #bc157c): por eso va con `logoFondo`.
        id: 'ec-guayaquil', pais: 'EC', nombre: 'Banco de Guayaquil', corto: 'Guayaquil', redes: ['Visa', 'Mastercard', 'American Express'], logoFondo: '#bc157c',
        niveles: ['Clásica', 'Estándar', 'Oro', 'Platinum', 'Signature', 'Elite', 'Prima', 'Zero', 'Blue', 'Verde'],
        fuente: { texto: 'Tarifario de servicios financieros de Banco Guayaquil, sección de tarjetas de crédito (junio 2026; es el que publican como vigente en su página de transparencia, consultado el 6 de noviembre de 2026)', vigencia: 'junio 2026',
          url: 'https://www.bancoguayaquil.com/conocenos/transparencia/' },
        tarifarioUrl: 'https://assets.ctfassets.net/jhuukrkt1w7q/6ZE5gSTute00w7lxCPOilb/bb243ec833d8c434653b0023a35923a3/TARIFARIO_JUNIO_2026.pdf',
        // Su tarifario dice que la tarjeta cobra la «tasa máxima convencional del segmento de consumo»: es el techo legal, no una tasa propia menor.
        tasaPublicada: { efectivaAnual: 16.77, aplicaA: 'tarjetas de crédito (rotativo y diferido): «tasa máxima convencional del segmento de consumo»' },
        // Avance: valor fijo con IVA según el monto. Dos tablas del mismo tarifario que se traslapan y no dicen cuál manda: se muestran las cuatro columnas.
        avance: {
          tipo: 'escalones', etiqueta: 'Cajero, banca electrónica y móvil (en el país, rangos estándar)',
          escalones: GYE_CAJERO,
          otrosCanales: [
            { etiqueta: 'Oficina y corresponsales no bancarios (en el país, rangos estándar)', escalones: GYE_OFICINA },
            { etiqueta: 'Cajero o internet, propios, locales o del exterior (tabla de avances exterior)', escalones: GYE_CAJERO_EXT },
            { etiqueta: 'Ventanilla, local o del exterior (tabla de avances exterior)', escalones: GYE_VENTANILLA },
          ],
        },
        recompensasPorNivel: {
          'Clásica': 'Visa Clásica $26,45 · Visa Tricolor, Taca Clásica y Manchester United $11,50 (al año)',
          'Estándar': 'Mastercard Estándar y Mastercard Taca Clásica $11,50 (al año)',
          'Oro': '$32,20 al año (Visa, Mastercard y American Express Oro)',
          'Platinum': 'Visa Platinum y American Express Platinum $50,60 · Mastercard Platinum $32,20 (al año)',
          'Signature': 'Visa Signature $50,60 · Visa Signature Lifemiles $62,10 (al año)',
          'Elite': '$62,10 al año (American Express Taca Elite y AAdvantage Elite)',
          'Prima': 'El tarifario no publica cargo de recompensas para Mastercard Prima (solo prestaciones en el exterior: $8,05 al año)',
          'Zero': 'El tarifario no publica cargo de recompensas para Visa Zero (solo prestaciones en el exterior: $8,05 al año)',
          'Blue': 'American Express Blue $26,45 (al año)',
          'Verde': 'American Express Verde Pago y Verde Crédito $26,45 (al año)',
        },
        costos: {
          rotativo: { texto: 'Sin interés si pagas el total antes de la fecha tope; con pago parcial, o si pagas tarde, se cobra interés',
            nota: 'Su tarifario dice: no se cobran intereses cuando el pago es total antes de la fecha tope de pago (pago de contado); sí se cobran cuando el pago es parcial antes de la fecha tope, o cuando el pago, parcial o total, es después de esa fecha. La tasa es la «tasa máxima convencional del segmento de consumo». No publica cuántos días hay entre el corte y la fecha tope, ni desde cuándo corre el interés.' },
          diferido: { texto: 'Plazos de 2, 3, 6, 9, 12 y 24 meses con la tasa máxima convencional del segmento de consumo (16,77 % efectiva)',
            nota: 'El tarifario no publica factores por plazo; la app calcula la cuota con la tasa.' },
          tasa: { texto: '16,77 % efectiva anual (tasa máxima convencional del segmento de consumo)',
            nota: 'Es el techo legal de consumo: el banco no publica para la tarjeta una tasa propia más baja. Equivale a cerca de 15,60 % nominal (cálculo de la app).' },
          mora: { texto: 'Recargo sobre la tasa: 5 % (1 a 15 días), 7 % (16 a 30), 9 % (31 a 60) y 10 % (más de 60 días)',
            nota: 'Se aplica después del vencimiento (con 0 días de retraso: 0 %). Sobre 15,60 % nominal da cerca de 16,38 %, 16,69 %, 17,00 % y 17,16 % (cálculo de la app, no cifra publicada).' },
          uso: { texto: '$0,00 por frecuencia de transacciones',
            nota: 'Consumos de más de $100 en el exterior: $1,96 (hasta $100 no cobran). Consultas en el exterior: $1,02. Gasolineras: $0,23 por consumo. Cambio de clave: $1,54. Pago de impuestos con la tarjeta: $0,52. Tarjeta de coordenadas, renovación anual: $1,02. Tarjeta de emergencia en el exterior: $25,67 (Visa y Mastercard) o $128,35 (American Express).' },
          mantenimiento: { texto: '$0,00', nota: 'Mantenimiento, con pago mínimo y con pago total; afiliación y renovación de tarjetas de crédito de titulares o adicionales: $0,00.' },
          avance: { texto: 'Desde $7,19 hasta $316,25 según el monto y el canal',
            nota: 'Valor fijo con IVA. El tarifario trae dos tablas de avance que se traslapan y no dice cuál aplica a tu caso; confírmalo con el banco o míralo en tu estado de cuenta. '
              + 'Cajero, banca electrónica y móvil (país, rangos estándar): ' + rangosTexto(GYE_CAJERO) + '. '
              + 'Oficina y corresponsales no bancarios (país, rangos estándar): ' + rangosTexto(GYE_OFICINA) + '. '
              + 'Cajero o internet, propios, locales o del exterior (tabla de avances exterior): ' + rangosTexto(GYE_CAJERO_EXT) + '. '
              + 'Ventanilla, local o del exterior (tabla de avances exterior): ' + rangosTexto(GYE_VENTANILLA) + '. '
              + 'Los intereses se cobran aparte. Tiene campañas de avance con tasa preferencial (con términos propios en su página de transparencia).' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'La tabla de la regulación está sin IVA (de $6,38 a $43,99, más el IVA); con 15 % sale de $7,34 a $50,59 (cálculo de la app). Depende del valor de la cuota vencida y los días de atraso (1 a 30, 31 a 60, 61 a 90 y más de 90). Un solo cargo por la cuota con más días vencidos.' },
          emision: { texto: '$5,03 con chip (emisión y renovación)', nota: 'Con banda lectora (sin chip): $0,00.' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro físico', nota: 'Por migración o falla de la banda lectora o del chip: $0,00.' },
          recompensas: { texto: '$11,50 a $62,10 al año según la tarjeta (plan de millas)',
            nota: 'Su tarifario aclara que corresponde al plan de acumulación de millas que aparece en tu estado de cuenta, y lo publica por segmento con la lista de tarjetas de cada uno (la app lo muestra según el nivel que elijas). Plan de recompensas (anual): AA+ $62,10 · A+ $50,60 · B+ $32,20 · C+ $26,45 · D+ $11,50. Prestaciones en el exterior (anual): AA+ $27,60 · A+ $23,00 · B+ $18,40 · C+ $12,65 · D+ y D $8,05. No hay recargo adicional por consumos en el exterior y se cobra con tu aceptación por escrito. Las tarjetas de marca compartida (Taca, Supermaxi, Chevrolet y otras) tienen su segmento en el tarifario.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · corte de estado $1,87 · copia $0,52', nota: 'Referencias financieras: $2,73.' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta por los diferentes canales' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },
      {
        // Tarifario «Tasas de interés y cargos por servicios – Tarjetas de crédito» (actualización noviembre 2026). Visa y Mastercard.
        // Niveles: los de persona natural que lista el tarifario; «Corporate» y «Business» (empresariales) no se incluyen.
        id: 'ec-austro', pais: 'EC', nombre: 'Banco del Austro', corto: 'Austro', redes: ['Visa', 'Mastercard'],
        niveles: ['Internacional', 'Gold', 'Platinum', 'Signature', 'Infinite', 'Black'],
        fuente: { texto: 'Tarifario de tasas de interés y cargos por servicios de tarjetas de crédito (actualización noviembre 2026)', vigencia: 'noviembre 2026',
          url: 'https://www.bancodelaustro.com/Portals/0/Tarifarios/TarjetaCreditoClientes.pdf' },
        tarifarioUrl: 'https://www.bancodelaustro.com/Portals/0/Tarifarios/TarjetaCreditoClientes.pdf',
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjetas de consumo (corriente/rotativo y diferido)' },
        // Avance: valor fijo con IVA según el monto. Una tabla para el país (ventanilla, cajero, internet/app, CNB) y otra para el exterior.
        avance: {
          tipo: 'escalones', etiqueta: 'En el país (ventanilla, cajero, internet/app o CNB)',
          escalones: [[1, 13.35], [101, 20.54], [301, 25.67], [401, 30.81], [501, 35.94], [601, 41.07], [701, 46.21], [801, 56.48], [901, 77.00], [1001, 82.14], [1301, 87.27], [1401, 92.41], [1501, 96.97], [1601, 102.68], [1701, 112.94], [1801, 118.08], [1901, 123.21], [2001, 154.02], [5001, 256.69]],
          otrosCanales: [
            { etiqueta: 'En el exterior (ventanilla o cajero)',
              escalones: [[1, 5.18], [101, 5.98], [201, 15.30], [301, 24.50], [401, 34.39], [501, 44.74], [601, 56.24], [701, 66.82], [801, 78.43], [901, 90.62], [1001, 103.16], [2001, 116.27], [3001, 129.72], [4001, 143.64], [5001, 158.01], [6001, 172.50]] },
          ],
        },
        costos: {
          rotativo: { texto: '15,60 % nominal (16,77 % efectiva) para el consumo corriente / rotativo',
            nota: 'El tarifario publica la tasa del corriente/rotativo (sin factor de ponderación) pero no explica si hay un período sin interés entre el corte y la fecha de pago ni desde cuándo corre el interés; míralo en tu contrato o estado de cuenta.' },
          diferido: { texto: '15,60 % nominal con factor por plazo: 3 meses 2,61 % · 6 meses 4,60 % · 12 meses 8,65 % · 24 meses 17,06 % · 36 meses 25,86 %',
            nota: 'También 9 meses 6,61 %. El factor sirve para estimar el interés total sobre el monto diferido (por ejemplo, $1.000 a 12 meses ≈ $86,50 de interés; cálculo de la app).' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual',
            nota: 'Es la tasa de consumo, para las tarjetas Visa y Mastercard (Internacional, Gold, Platinum, Signature, Infinite y Black). El mismo tarifario trae tasas de otros segmentos (nominal): Corporativo 7,48 % · Empresarial 9,74 % · PYMES 9,45 % · Minorista 25,12 % · Microcrédito simple 22,43 % y ampliada 20,09 %; no dice a qué tarjeta corresponde cada una.' },
          mora: { texto: 'Recargo sobre la tasa: 5 % (1 a 15 días), 7 % (16 a 30), 9 % (31 a 60) y 10 % (más de 60 días)',
            nota: 'Sobre 15,60 % nominal da cerca de 16,38 %, 16,69 %, 17,00 % y 17,16 % (cálculo de la app, no cifra publicada).' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta',
            nota: 'Consumos de más de $100 en el exterior: $1,96 (hasta $100 no cobran). Gasolineras: $0,23 por consumo. Consulta impresa de saldo en cajero: $0,36. Activación, notificaciones de tus consumos y frecuencia de transacciones: $0,00.' },
          mantenimiento: { texto: '$0,00', nota: 'Mantenimiento, con pago mínimo y con pago total; afiliación y renovación de titular y adicional: $0,00.' },
          avance: { texto: 'Desde $5,18 hasta $256,69 según el monto y el lugar',
            nota: 'Valor fijo con IVA. En el país (ventanilla, cajero propio o de otro banco, internet/app y CNB; el CNB solo para menos de $200): $13,35 hasta $100,99 · $20,54 hasta $300,99 · $25,67 hasta $400,99 · $30,81 hasta $500,99 · $35,94 hasta $600,99 · $41,07 hasta $700,99 · $46,21 hasta $800,99 · $56,48 hasta $900,99 · $77,00 hasta $1.000,99 · $82,14 hasta $1.300,99 · $87,27 hasta $1.400,99 · $92,41 hasta $1.500,99 · $96,97 hasta $1.600,99 · $102,68 hasta $1.700,99 · $112,94 hasta $1.800,99 · $118,08 hasta $1.900,99 · $123,21 hasta $2.000,99 · $154,02 hasta $5.000,99 · $256,69 desde $5.001. En el exterior (ventanilla o cajero): $5,18 hasta $100,99 · $5,98 hasta $200,99 · $15,30 hasta $300,99 · $24,50 hasta $400,99 · $34,39 hasta $500,99 · $44,74 hasta $600,99 · $56,24 hasta $700,99 · $66,82 hasta $800,99 · $78,43 hasta $900,99 · $90,62 hasta $1.000,99 · $103,16 hasta $2.000,99 · $116,27 hasta $3.000,99 · $129,72 hasta $4.000,99 · $143,64 hasta $5.000,99 · $158,01 hasta $6.000,99 · $172,50 desde $6.001. Los intereses se cobran aparte.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'La tabla de la regulación está sin IVA (de $6,38 a $43,99, más el IVA); con 15 % sale de $7,34 a $50,59 (cálculo de la app). Depende del valor de la cuota vencida y los días de atraso (1 a 30, 31 a 60, 61 a 90 y más de 90). Un solo cargo por la cuota con más días vencidos; la gestión preventiva antes del vencimiento no se cobra.' },
          emision: { texto: '$5,03 con chip (emisión y renovación)', nota: 'Con banda lectora (sin chip): $0,00. La renovación solo se cobra cuando venció el plástico (vigencia mínima de 3 años).' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro físico', nota: 'Por migración o falla de la banda o del chip: $0,00.' },
          recompensas: { texto: '$5,75 a $62,10 al año según el segmento',
            nota: 'El tarifario lo publica por «segmento», no por tarjeta, y no dice qué tarjeta corresponde a cada segmento: pregunta al banco. Plan de recompensas (anual): AA+ $62,10 · A+ $50,60 · B+ $32,20 · C+ $26,45 · D+ $11,50 · E+ $5,75. Prestaciones en el exterior (anual): AA+ y AA $27,60 · A+ y A $23,00 · B+ y B $18,40 · C+ y C $12,65 · D+ y D $8,05. Se cobra por períodos anuales y con tu aceptación por escrito.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta por cualquier canal del banco',
            nota: 'Si pagas desde canales de otra entidad: $0,39 por banca telefónica, celular, internet o kiosko · $0,45 por ventanilla, corresponsal, entidades auxiliares o cajero.' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },
      {
        id: 'ec-internacional', pais: 'EC', nombre: 'Banco Internacional', corto: 'Internacional', redes: ['Visa', 'Mastercard', 'Otra'],
        // Su logo oficial viene en blanco y naranja (para fondo oscuro): se muestra sobre este color.
        logoFondo: '#1e2a3a',
        fuente: { texto: 'Página de tarifarios del banco: tasas de interés de tarjeta de crédito, servicios de cargo máximo, cargo diferenciado, básicos y cobranzas (noviembre 2026)', vigencia: 'noviembre 2026',
          url: 'https://www.bancointernacional.com.ec/tarifarios/' },
        tarifarioUrl: 'https://www.bancointernacional.com.ec/tarifarios/',
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjeta de crédito de personas naturales, diferido y rotativo (tasa máxima)' },
        // Avance en cajero (país o exterior): hasta $500,99. Oficina y banca virtual hasta $1.000,99; más arriba el banco cobra por cada $100 adicional (se avisa, no se calcula).
        avance: { tipo: 'escalones', etiqueta: 'Cajero automático', maxUsd: 500.99,
          aviso: 'El banco publica el cajero solo hasta $500,99.',
          escalones: [[0, 7.19], [101, 12.32], [201, 17.46], [301, 22.59], [401, 27.73]],
          otrosCanales: [
            { etiqueta: 'Oficina', maxUsd: 1000.99, aviso: 'Sobre $1.000,99: $7,19 más por cada $100 adicional o fracción, con tope de $287,50.',
              escalones: [[0, 7.19], [101, 12.32], [201, 17.46], [301, 25.67], [401, 30.81], [501, 35.94], [601, 41.07], [701, 46.21], [801, 51.34], [901, 56.48]] },
            { etiqueta: 'Banca online, kiosco o móvil', maxUsd: 1000.99, aviso: 'Sobre $1.000,99: $6,16 más por cada $100 adicional o fracción, con tope de $287,50.',
              escalones: [[0, 6.16], [101, 11.29], [201, 16.43], [301, 23.62], [401, 28.75], [501, 33.88], [601, 39.02], [701, 44.15], [801, 49.29], [901, 51.34]] },
          ] },
        costos: {
          rotativo: { texto: 'Hasta 16,77 % efectivo anual (tasa máxima publicada)',
            nota: 'Es el tope que publica para tarjetas de personas naturales. La página no explica cuándo se cobra o no el interés del consumo corriente: míralo en tu estado de cuenta o en tu contrato.' },
          diferido: { texto: '15,60 % nominal (16,77 % efectivo) anual, igual de 3 a 24 meses',
            nota: 'Factor de referencia para estimar el interés total de la compra diferida: 3 meses 2,61 % · 4 meses 3,27 % · 6 meses 4,60 % · 9 meses 6,61 % · 12 meses 8,65 % · 15 meses 10,71 % · 18 meses 12,80 % · 24 meses 17,05 %.' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual', nota: 'Es la tasa que el banco publica para tarjeta de crédito de personas naturales (la máxima). Si tu estado de cuenta dice otra, anótala.' },
          mora: { texto: 'Recargo sobre la tasa: 5 % (1 a 15 días) · 7 % (16 a 30) · 9 % (31 a 60) · 10 % (más de 60)', nota: 'Se cuenta desde el primer día después de vencida la obligación. Es el «porcentaje adicional de interés» que publica el banco.' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta', nota: 'También $0,00: activación, mantenimiento, pago mínimo, pago total, bloqueo, notificaciones y afiliación o renovación para personas naturales. Gasolineras $0,23 por consumo; en el exterior, compras de más de $100 cobran $1,96.' },
          mantenimiento: { texto: '$0,00', nota: 'Incluye mantenimiento con pago mínimo y con pago total. Afiliación y renovación de la tarjeta (persona natural): $0,00.' },
          avance: { texto: 'Cajero: desde $7,19 hasta $27,73 · oficina: desde $7,19 hasta $56,48 · banca virtual: desde $6,16 hasta $51,34', nota: 'Por monto: hasta $100,99 → $7,19 (oficina o cajero) o $6,16 (banca virtual); hasta $200,99 → $12,32 o $11,29; hasta $300,99 → $17,46 o $16,43… Sobre $1.000,99 se suma $7,19 (oficina) o $6,16 (virtual) por cada $100 adicional o fracción, con tope de $250 + IVA. Los intereses del avance son aparte.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA', nota: 'Si te atrasas: depende de la cuota vencida y los días. Desde $7,34 (1 a 30 días, menos de $100) hasta $50,59 (más de 90 días, desde $1.000).' },
          emision: { texto: '$5,03 con chip (emisión y renovación) · $0,00 con banda lectora' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro · $0,00 por falla de banda o chip · en el exterior hasta $51,34' },
          recompensas: { texto: '$5,75 a $62,10 según el segmento de tu tarjeta', nota: 'Plan de recompensas por segmento: AA+ $62,10 · A+ $50,60 · B+ $32,20 · C+ $26,45 · D+ $11,50 · E+ $5,75. Prestaciones en el exterior: AA+/AA $27,60 · A+/A $23,00 · B+/B $18,40 · C+/C $12,65 · D+/D $8,05. La página no dice a qué nivel (Gold, Platinum…) corresponde cada segmento.' },
          voucher: { texto: '$2,06 local · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta por los canales del banco', nota: 'Su tabla de cargos máximos también lista $0,39 por pagos a tarjetas de crédito por banca móvil, internet o autoservicio; la página no aclara a qué caso se refiere.' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },
      {
        id: 'ec-diners', pais: 'EC', nombre: 'Diners Club del Ecuador', corto: 'Diners Club', redes: ['Diners', 'Visa', 'Mastercard', 'Otra'],
        // Familias de tarjeta del tarifario (Diners Club, Discover y TITANIUM Visa / Mastercard).
        niveles: ['Diners Club', 'Discover', 'Titanium', 'Platinum Miles', 'Signature Miles', 'Infinite / Black Miles'],
        fuente: { texto: 'Tarifario de costos y servicios personales (1 de noviembre de 2026) y pizarra multimarca de noviembre 2026', vigencia: 'noviembre 2026',
          url: 'https://www.dinersclub.com.ec/transparencia' },
        tarifarioUrl: 'https://dce-documents.s3.amazonaws.com/tarifario-personal-multimarca-multicanal-noviembre-2026.pdf',
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjetas personales Diners Club, Discover y TITANIUM: diferido y financiamiento' },
        // Avance en efectivo (local y exterior; cajero, internet u oficinas): desde ese monto (USD) y hasta antes del siguiente, el valor final con IVA.
        avance: { tipo: 'escalones', escalones: [[0, 5.13], [101, 10.26], [201, 15.39], [301, 25.65], [501, 28.05], [901, 33.88], [1001, 40.03], [1201, 49.24], [1501, 64.60],
          [2001, 79.95], [2501, 86.25], [3001, 110.65], [3501, 115.00], [4001, 141.36], [4501, 143.75], [5001, 172.50], [6001, 201.25], [7001, 230.00], [8001, 258.75], [9001, 287.50]] },
        recompensasPorNivel: {
          'Diners Club': 'No aparece en la lista de planes de recompensas del tarifario · $12,65 de prestaciones en el exterior (Diners Club Internacional)',
          'Discover': '$26,45 recompensa (Discover Me, Discover, Discover More y las BSC)',
          'Titanium': '$26,45 recompensa + $12,65 prestaciones en el exterior (Visa World Card Miles, Visa Euphoria, Mastercard Miles)',
          'Platinum Miles': '$32,20 recompensa + $18,40 prestaciones en el exterior (también Diners Club Claro, AAdvantage y Miles)',
          'Signature Miles': '$50,60 recompensa + $23,00 prestaciones en el exterior (TITANIUM Visa Signature Miles - AAdvantage)',
          'Infinite / Black Miles': '$62,10 recompensa + $27,60 prestaciones en el exterior (Infinite, Black, Black Beyond, Sphaera y Mcnamara)',
        },
        costos: {
          rotativo: { texto: 'Sin recargo hasta la fecha máxima de pago; después, interés de financiamiento',
            nota: 'Período de gracia: desde la fecha de emisión del estado de cuenta hasta la «fecha máxima de pago», sin recargos financieros. Si pagas el mínimo o más, el interés de financiamiento se aplica al saldo de capital de los consumos corrientes desde la fecha máxima de pago (y al saldo rotativo desde el inicio del corte). Si no alcanzas ni el mínimo, el interés se calcula sobre el capital del mes, sin contar la cuota de capital del pago mínimo. Su tabla de tasas publica 15,60 % nominal (16,77 % efectivo) para el diferido; no muestra una tasa aparte para el rotativo, así que míralo en tu estado de cuenta.' },
          diferido: { texto: '15,60 % nominal anual (16,77 % efectivo), igual para todos los plazos',
            nota: 'Diferido propio: 3 meses 2,63 % · 6 meses 4,65 % · 12 meses 8,76 % · 24 meses 17,29 % · 36 meses 26,23 % (factor de referencia para estimar el interés total). Consumos en el exterior, avance en efectivo y crédito vehicular: 3, 6 y 12 meses con los mismos factores. El tarifario menciona además una contribución anual del 0,5 % sobre el monto de las operaciones de financiamiento.' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual', nota: 'Tasa que publican para el crédito diferido de tarjetas personales (Diners Club, Discover y TITANIUM): diferido propio, consumos en el exterior, avance en efectivo y reestructuraciones.' },
          mora: { texto: 'Nominal anual: 16,38 % · 16,69 % (30 días) · 17,00 % (60 días) · 17,16 % (90 días o más)', nota: 'Efectiva: 17,67 % · 18,03 % · 18,39 % · 18,58 %. Es la tasa aplicada al saldo que dejas de pagar a la fecha máxima de pago, por los días hasta que pagas. (Las cifras equivalen a un recargo de 5 %, 7 %, 9 % y 10 % sobre 15,60 %.)' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta', nota: 'También $0,00: activación, mantenimiento, pago mínimo, pago total, entrega del estado de cuenta y bloqueo. Gasolineras: $0,23 por consumo. Consumos de más de $100 en el exterior: $1,96 (el tarifario dice que aplica a Diners Club Miles y Diners Club Internacional).' },
          mantenimiento: { texto: '$0,00', nota: 'Incluye mantenimiento con pago mínimo y con pago total.' },
          avance: { texto: 'Desde $5,13 hasta $287,50 según el monto', nota: 'Local y exterior, en cajero, internet u oficinas: $5,13 hasta $100,99; $10,26 hasta $200,99; $15,39 hasta $300,99; $25,65 hasta $500,99; $28,05 hasta $900,99; $33,88 hasta $1.000,99; luego sube por tramos hasta $287,50 desde $9.001 (máximo $250 + IVA). Los intereses del avance son aparte (también se puede diferir a 3, 6 o 12 meses).' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA', nota: 'Si te atrasas: depende de la cuota vencida y los días. Desde $7,34 (1 a 30 días, menos de $100) hasta $50,59 (más de 90 días, desde $1.000).' },
          emision: { texto: '$5,03 con chip (emisión y renovación)' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro · $0,00 por migración o falla de banda o chip' },
          recompensas: { texto: '$26,45 a $62,10 según la tarjeta', nota: 'Plan de recompensas: es un cargo para periodos anuales y debes aceptarlo por escrito. Depende del tipo de tarjeta (Discover, TITANIUM, Miles…).' },
          voucher: { texto: '$2,06 local · $10,27 del exterior' },
          estado: { texto: 'Entrega a domicilio $0,00 · copia $0,52' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },
      {
        // Solo emite Visa (todas sus tarjetas se llaman «BGR Visa …»).
        id: 'ec-bgr', pais: 'EC', nombre: 'Banco General Rumiñahui', corto: 'Rumiñahui', redes: ['Visa'],
        niveles: ['Clásica', 'ON / Mujeres', 'Supermaxi', 'Club Deportivo El Nacional', 'Cerrada Universidades', 'Nacional', 'Oro / Cero Costo', 'Platinum', 'Infinite Active', 'Empresarial'],
        fuente: { texto: 'Tasas de interés y tarifas por servicios aplicados a las tarjetas de crédito (vigencia 1 de noviembre de 2026)', vigencia: 'noviembre 2026',
          url: 'https://www.bgr.com.ec/informacion-corporativa' },
        tarifarioUrl: 'https://www.bgr.com.ec/resources/pdf/transparencia-de-la-informacion/2026/tarifarios/tasas-de-interes-tarifas-servicios-aplicados-tarjetas-de-credito.pdf',
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjetas personales BGR Visa (rotativo; el diferido usa factores)' },
        // Avance en efectivo: valor fijo con IVA según el monto (no es un porcentaje). País: cajero, ventanilla, internet y banca celular. Exterior: cajero y ventanilla.
        avance: {
          tipo: 'escalones', etiqueta: 'En el país (cajero, ventanilla, internet y banca celular)',
          escalones: [[0, 5.13], [51, 8.21], [101, 9.25], [151, 10.27], [401, 15.40], [501, 20.54], [701, 30.81], [1001, 41.07], [2001, 51.34], [3001, 61.61]],
          otrosCanales: [{
            etiqueta: 'En el exterior (cajero y ventanilla)', escalones: [[0, 5.13], [51, 7.19], [101, 8.21], [151, 9.25], [201, 11.29]], maxUsd: 400.99,
            aviso: 'Para tarjetas personales el tarifario publica el avance en el exterior solo hasta $400; más arriba, pregunta al banco.',
          }],
        },
        recompensasPorNivel: {
          'Clásica': '$11,50 recompensa + $8,05 prestaciones en el exterior',
          'ON / Mujeres': '$11,50 recompensa + $8,05 prestaciones en el exterior',
          'Supermaxi': '$11,50 recompensa + $8,05 prestaciones en el exterior',
          'Club Deportivo El Nacional': '$11,50 recompensa + $8,05 prestaciones en el exterior',
          'Cerrada Universidades': '$11,50 recompensa (el tarifario no le asigna prestaciones en el exterior)',
          'Nacional': '$5,75 recompensa · sin prestaciones en el exterior (no aplica)',
          'Oro / Cero Costo': '$26,45 recompensa + $12,65 prestaciones en el exterior',
          'Platinum': '$32,20 recompensa + $18,40 prestaciones en el exterior',
          'Infinite Active': '$62,10 recompensa + $27,60 prestaciones en el exterior',
          'Empresarial': '$62,10 recompensa + $27,60 prestaciones en el exterior (no aplica a la Empresarial del sector público)',
        },
        costos: {
          rotativo: { texto: 'Sin interés entre la fecha de corte y la fecha máxima de pago; después, 15,60 % nominal sobre el capital que quede',
            nota: 'Tarifario: para el crédito corriente «no hay cargo de intereses entre la fecha de corte y la fecha máxima de pago» y, cuando se aplica, el interés corre sobre el capital deudor. En el diferido corre «desde la fecha de consumo». Forma de pago: pago mínimo o total, que eliges en la solicitud. Tasa máxima rotativo: 15,60 % nominal (16,77 % efectiva). La tarjeta Empresarial tiene tasas menores: 9,45 % PYME, 9,74 % Empresarial y 7,48 % Corporativo (nominal). Se suma una contribución SOLCA de 0,5 % tanto a consumos rotativos como diferidos.' },
          diferido: { texto: 'Mismo 15,60 % nominal, repartido en cuotas con «factores» según el plazo',
            nota: 'Factor para estimar el interés total sobre el monto diferido (tarjetas personales): 3 meses 2,63 % · 6 meses 4,65 % · 12 meses 8,76 % · 24 meses 17,29 % · 36 meses 26,23 % · 48 meses 35,57 % · 60 meses 45,31 % · 72 meses 55,44 % · 84 meses 65,95 %. La tabla completa llega hasta 86 meses. La Empresarial tiene su propia tabla (3 a 84 meses).' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual (máxima)', nota: 'Rotativo de las tarjetas personales BGR Visa (principal y adicional). Es la «tasa máxima» que publica el banco; en tu estado de cuenta verás la que te aplican.' },
          mora: { texto: 'Nominal anual desde el día siguiente a la fecha máxima de pago: 16,38 % · 16,69 % (16 a 30 días) · 17,00 % (31 a 60 días) · 17,16 % (más de 60 días)',
            nota: 'Se aplica sobre el capital en mora. Equivale a un recargo de 5 %, 7 %, 9 % y 10 % sobre 15,60 %. El primer tramo aparece en el tarifario como «0 días».' },
          uso: { texto: '$0,00 por consumos en el país y por internet (nacional o internacional)',
            nota: 'Consumos de más de $100 en el exterior: $1,96 (no aplica a la Visa Nacional). Gasolineras: $0,23 por consumo. Hasta $5.188,26 al año de consumos en el exterior no se retiene el ISD; sobre el excedente se aplica 5 %.' },
          mantenimiento: { texto: '$0,00', nota: 'Mantenimiento, mantenimiento con pago mínimo y con pago total: $0,00.' },
          avance: { texto: 'Desde $5,13 hasta $61,61 según el monto (en el país)',
            nota: 'Valor fijo con IVA, no un porcentaje: $5,13 hasta $50,99; $8,21 hasta $100,99; $9,25 hasta $150,99; $10,27 hasta $400,99; $15,40 hasta $500,99; $20,54 hasta $700,99; $30,81 hasta $1.000,99; $41,07 hasta $2.000,99; $51,34 hasta $3.000,99; $61,61 desde $3.001. En el exterior: $5,13 · $7,19 · $8,21 · $9,25 y $11,29 de $201 a $400. Los intereses del avance se cobran aparte. El PIN para sacar efectivo te llega por SMS.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA', nota: 'Se cobra sobre la cuota más vencida, según su valor y los días de atraso. De 1 a 30 días: $7,34 (cuota menor a $100), $8,45 ($100 a $199), $9,11 ($200 a $299), $9,57 ($300 a $499), $9,92 ($500 a $999), $10,21 (desde $1.000). De 91 a 120 días: desde $29,39 hasta $50,59. La gestiona el banco o empresas externas autorizadas.' },
          emision: { texto: '$5,03 con chip (emisión y renovación)', nota: 'La renovación se cobra solo cuando venció el plástico.' },
          reposicion: { texto: '$5,03 en el país por pérdida o robo' },
          recompensas: { texto: '$5,75 a $62,10 según la tarjeta', nota: 'Programa de recompensas (cargo anual): Nacional $5,75 · Clásica, ON, Mujeres, Supermaxi, Club Deportivo El Nacional y Cerrada Universidades $11,50 · Oro $26,45 · Platinum $32,20 · Infinite y Empresarial $62,10. Prestaciones en el exterior: $8,05 · $12,65 · $18,40 · $27,60 según el nivel.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior', nota: 'La Visa Nacional no tiene copia de voucher del exterior.' },
          estado: { texto: 'Envío del estado de cuenta $0,00 · copia $0,52', nota: 'Certificado de manejo de cuentas o referencias: $2,59. Cheque devuelto: $2,86 nacional · $3,32 del exterior.' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },

      {
        // Tarifario «Operaciones activas: costos financieros y operativos» (octubre 2026). Emite Visa y Mastercard.
        // Su logo oficial es blanco (lo usan sobre el verde del encabezado de su web): por eso va con `logoFondo`.
        id: 'ec-machala', pais: 'EC', nombre: 'Banco de Machala', corto: 'Machala', redes: ['Visa', 'Mastercard'], logoFondo: '#295135',
        niveles: ['Clásica / Clásica Mi Comisariato', 'Oro / Oro Mi Comisariato', 'Platinum / Platinum Mi Comisariato', 'Black / Infinite', 'Empresarial', 'Nacional'],
        fuente: { texto: 'Tarifario «Operaciones activas: costos financieros y operativos» (octubre 2026)', vigencia: 'octubre 2026',
          url: 'https://www.bancomachala.com/de-tu-interes/transparencia' },
        tarifarioUrl: 'https://www.bancomachala.com/docs/default-source/tarifas-y-tasas/tarifas-y-tasas/tarifario-general-bm.pdf',
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjetas de crédito de personas naturales (rotativo y diferido)' },
        // Avance: valor fijo con IVA por rango de $100 (cada rango va de $x01 a $x00,99). Cajero: hasta $500 por retiro. Oficinas y canales virtuales: hasta $5.500.
        avance: {
          tipo: 'escalones', etiqueta: 'Cajero automático',
          escalones: [[0, 5.13], [101, 10.26], [201, 15.39], [301, 20.52], [401, 25.65]], maxUsd: 500,
          aviso: 'El tarifario fija un límite de $500 por retiro en cajero; para más, usa oficina o canales virtuales.',
          otrosCanales: [{
            etiqueta: 'Oficinas y canales virtuales',
            escalones: [5.13, 10.26, 15.39, 20.52, 25.65, 30.77, 35.90, 41.03, 46.16, 51.29, 56.42, 61.55, 66.68, 71.81, 76.94, 82.06, 87.19, 92.32, 97.45, 102.58,
              107.71, 112.84, 117.97, 123.10, 128.23, 133.35, 138.48, 143.61, 148.74, 153.87, 159.00, 164.13, 169.26, 174.39, 179.52, 184.64, 189.77, 194.90, 200.03,
              205.16, 210.29, 215.42, 220.55, 225.68, 230.81, 235.93, 241.06, 246.19, 251.32, 256.45, 261.58, 266.71, 271.84, 276.97, 282.10].map((v, i) => [i ? i * 100 + 1 : 0, v]),
            maxUsd: 5500, aviso: 'El tarifario fija un límite de $5.500 por transacción en oficinas y canales virtuales.',
          }],
        },
        recompensasPorNivel: {
          'Clásica / Clásica Mi Comisariato': '$11,50 recompensa + $8,05 prestaciones en el exterior (cobro anual)',
          'Oro / Oro Mi Comisariato': '$26,45 recompensa + $12,65 prestaciones en el exterior (cobro anual)',
          'Platinum / Platinum Mi Comisariato': '$32,20 recompensa + $18,40 prestaciones en el exterior (cobro anual)',
          'Black / Infinite': '$62,10 recompensa + $27,60 prestaciones en el exterior (cobro anual)',
          'Empresarial': '$32,20 recompensa + $18,40 prestaciones en el exterior (el tarifario las junta con Platinum)',
          'Nacional': '$5,75 recompensa · sin prestaciones en el exterior (cobro anual)',
        },
        costos: {
          rotativo: { texto: '15,60 % nominal · 16,77 % efectiva anual',
            nota: 'El tarifario publica la tasa del crédito rotativo pero no explica desde qué fecha corre el interés ni si hay un período sin interés; míralo en tu contrato o estado de cuenta.' },
          diferido: { texto: '15,60 % nominal (16,77 % efectiva) con factor por plazo: 3 meses 2,61 % · 6 meses 4,60 % · 12 meses 8,65 % · 24 meses 17,05 % · 36 meses 25,86 %',
            nota: 'También publica 9 meses 6,61 %. El factor sirve para estimar el interés total sobre el monto diferido. Las tarjetas corporativas, empresariales y pymes tienen tasas propias más bajas (nominal: corporativo 7,62 %, empresarial 9,90 %, pymes 9,52 %).' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual', nota: 'Tarjetas de crédito de personas naturales, tanto rotativo como diferido.' },
          mora: { texto: 'Recargo sobre la tasa: 5 % (1 a 15 días), 9 % (31 a 60 días) y 10 % (más de 60 días)',
            nota: 'Sale de la tabla general de crédito del tarifario (recargo por morosidad desde el vencimiento hasta el día de pago); no tiene una tabla propia para tarjetas. El tramo de 16 a 30 días aparece con 0,00 %, que parece un error: confírmalo con el banco. Sobre 15,60 % esos recargos dan cerca de 16,38 %, 17,00 % y 17,16 % (cálculo de la app, no cifra publicada).' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta',
            nota: 'Consumos de más de $100 en el exterior: $1,96. Consulta de saldo en cajero del exterior: $1,02. Gasolineras: $0,23 por consumo. Activación, afiliación y bloqueo: $0,00. El tarifario prohíbe pasarte el cargo que se cobra a los comercios.' },
          mantenimiento: { texto: '$0,00', nota: 'Mantenimiento, mantenimiento con pago mínimo y con pago total: $0,00.' },
          avance: { texto: 'Desde $5,13 hasta $282,10 según el monto y el canal',
            nota: 'Valor fijo con IVA por rango de $100. Cajero automático: $5,13 hasta $100,99; $10,26 hasta $200,99; $15,39 hasta $300,99; $20,52 hasta $400,99; $25,65 hasta $500 (límite $500 por retiro). Oficinas y canales virtuales: sube unos $5,13 por cada $100, hasta $282,10 de $5.401 a $5.500 (límite $5.500 por transacción). Los intereses del avance se cobran aparte.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'El tarifario publica el cargo sin IVA (de $6,38 a $43,99, más el IVA); con 15 % de IVA sale de $7,34 a $50,59 (cálculo de la app). Depende del valor de la cuota vencida y de los días de atraso: 1 a 30, 31 a 60, 61 a 90 y más de 90 días. Se cobra un solo cargo por la cuota con más días vencidos, y la gestión preventiva antes del vencimiento no se cobra.' },
          emision: { texto: '$5,03 con chip (emisión y renovación)', nota: 'Con banda lectora (sin chip) la emisión y la renovación son $0,00. La renovación solo se cobra cuando venció el plástico (vigencia mínima de 3 años).' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro físico', nota: 'Con banda lectora (sin chip) $0,00. Si es por migración o por falla de la banda o del chip: $0,00.' },
          recompensas: { texto: '$5,75 a $62,10 al año según la tarjeta',
            nota: 'Cobro anual del plan de recompensas: Nacional $5,75 · Clásica $11,50 · Oro $26,45 · Platinum y Empresarial $32,20 · Black/Infinite $62,10. Prestaciones del exterior: $8,05 · $12,65 · $18,40 · $27,60 (la Nacional no tiene). Se cobra por períodos anuales y debes aceptarlo por escrito; el banco aclara que no hay recargo adicional por consumos en el exterior.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52 · corte de estado de cuenta $1,87',
            nota: 'Referencias bancarias: $2,59. Cheque devuelto: $2,86 nacional · $3,32 del exterior (más lo que cobre el banco receptor del cheque).' },
          pagoTarjeta: { texto: '$0,00 por los canales de Machala · $0,39 por banca telefónica, celular, internet o kiosko de otra entidad · $0,45 por ventanilla, corresponsal o cajero de otra entidad' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },

      {
        // Tarifario «Tasas de interés y tarifas por servicios aplicados a las tarjetas de crédito» (hoja 2 de su transparencia). Solo Visa.
        // Su logo oficial es blanco (lo usan sobre el verde del encabezado de su web): por eso va con `logoFondo`.
        id: 'ec-loja', pais: 'EC', nombre: 'Banco de Loja', corto: 'Loja', redes: ['Visa'], logoFondo: '#76BC21',
        niveles: ['Clásica', 'Universidades', 'Oro', 'Infinite', 'Pymes'],
        fuente: { texto: 'Tasas de interés y tarifas por servicios aplicados a las tarjetas de crédito (vigencia 1 de agosto de 2026 para consumo y 1 de noviembre de 2026 para pymes)', vigencia: 'agosto-noviembre 2026',
          url: 'https://www.bancodeloja.fin.ec/informacion/links-de-interes/transparencia-de-informacion' },
        tarifarioUrl: 'https://www.bancodeloja.fin.ec/Portals/0/Transparencia%20de%20la%20Informaci%C3%B3n/Tasas%20Alco/2_TARJETA_CREDITO.pdf',
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjetas de crédito de consumo (rotativo y diferido)' },
        // Avance: valor fijo con IVA según el monto. Cajero del país (desde $10); oficina, banca web y celular; y exterior (oficina y cajero).
        avance: {
          tipo: 'escalones', etiqueta: 'Cajero automático (en el país)',
          escalones: [[10, 4.11], [301, 8.21], [501, 15.40]], maxUsd: 1000.99,
          aviso: 'El tarifario no publica el avance en cajero de más de $1.000,99; usa oficina o banca web/celular.',
          otrosCanales: [
            { etiqueta: 'Oficina, banca web y banca celular (en el país)',
              escalones: [[0, 5.13], [101, 10.27], [501, 25.67], [1001, 46.21], [2001, 77.00], [3001, 128.35], [5001, 150.08]] },
            { etiqueta: 'En el exterior (oficina y cajero)',
              escalones: [[10, 10.27], [500, 25.67], [1000, 46.21], [2000, 77.00], [3000, 128.35], [5000, 150.08]] },
          ],
        },
        recompensasPorNivel: {
          'Clásica': 'El tarifario no publica cargo de recompensas ni de prestaciones en el exterior para esta tarjeta',
          'Universidades': 'El tarifario no publica cargo de recompensas ni de prestaciones en el exterior para esta tarjeta',
          'Oro': 'El tarifario no publica cargo de recompensas ni de prestaciones en el exterior para esta tarjeta',
          'Infinite': '$27,60 prestaciones en el exterior (cobro anual)',
          'Pymes': '$4,92 prestaciones en el exterior (cobro anual)',
        },
        costos: {
          rotativo: { texto: '16,77 % efectiva anual (15,60 % nominal)',
            nota: 'El tarifario publica la tasa del crédito rotativo pero no explica si hay un período sin interés entre el corte y la fecha de pago ni desde cuándo corre el interés; míralo en tu contrato o estado de cuenta. Visa Pymes: 10,11 % efectiva.' },
          diferido: { texto: '16,77 % efectiva anual con factor por plazo: 3 meses 2,63 % · 6 meses 4,65 % · 12 meses 8,76 % · 24 meses 17,29 % · 36 meses 26,23 %',
            nota: 'También 9 meses 6,69 %. El factor sirve para estimar el interés total sobre el monto diferido. Visa Pymes (10,11 % efectiva): 3 meses 1,63 % · 6 meses 2,87 % · 12 meses 5,38 % · 24 meses 10,52 % · 36 meses 15,82 %. El tarifario aclara: «plazo máximo de diferimiento hasta 60 meses y aplica únicamente para avances de efectivo».' },
          tasa: { texto: '16,77 % efectiva · 15,60 % nominal anual', nota: 'Tarjetas de consumo (Clásica, Universidades, Oro, Infinite). Visa Pymes: 10,11 % efectiva.' },
          mora: { texto: 'Recargo sobre la tasa: 5 % (1 a 15 días), 7 % (16 a 30), 9 % (31 a 60) y 10 % (más de 60 días)',
            nota: 'Se aplica desde el primer día de vencimiento del capital, según la tabla de recargo por mora de su hoja de cargos asociados. Sobre 15,60 % nominal da cerca de 16,38 %, 16,69 %, 17,00 % y 17,16 % (cálculo de la app, no cifra publicada).' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta', nota: 'Activación, reclamos, frecuencia de transacciones y notificaciones de tus consumos: $0,00. Gasolineras: $0,23 por consumo. Consulta de saldo en cajero del exterior: $1,02.' },
          mantenimiento: { texto: '$0,00', nota: 'Mantenimiento, mantenimiento con pago mínimo o total, y afiliación y renovación de titular y adicional: $0,00.' },
          avance: { texto: 'Desde $4,11 hasta $150,08 según el monto y el canal',
            nota: 'Valor fijo con IVA. Cajero (país): $4,11 de $10 a $300,99; $8,21 hasta $500,99; $15,40 hasta $1.000,99. Oficina, banca web y celular (país): $5,13 hasta $100,99; $10,27 hasta $500,99; $25,67 hasta $1.000,99; $46,21 hasta $2.000,99; $77,00 hasta $3.000,99; $128,35 hasta $5.000,99; $150,08 desde $5.001. Exterior (oficina o cajero): $10,27 de $10 a $499,99; $25,67 hasta $999,99; $46,21 hasta $1.999,99; $77,00 hasta $2.999,99; $128,35 hasta $4.999,99; $150,08 desde $5.000. El avance se puede diferir. Los intereses se cobran aparte.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'La tabla de la regulación está sin IVA (de $6,38 a $43,99, más el IVA); con 15 % sale de $7,34 a $50,59 (cálculo de la app). Depende del valor de la cuota vencida y los días de atraso. Un solo cargo por la cuota con más días vencidos; la gestión preventiva antes del vencimiento no se cobra.' },
          emision: { texto: '$5,03 con chip (emisión y renovación)', nota: 'Con banda lectora (sin chip): $0,00. La renovación solo se cobra cuando venció el plástico (vigencia mínima de 3 años).' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro físico', nota: 'Con banda lectora (sin chip) $0,00; por migración o falla de la banda o del chip $0,00.' },
          recompensas: { texto: 'Solo publica cargo para Visa Infinite ($27,60) y Visa Pymes ($4,92) por prestaciones en el exterior',
            nota: 'Se cobra por períodos anuales y con tu aceptación por escrito; no hay recargo adicional por consumos en el exterior. Para Clásica, Universidades y Oro el tarifario no publica este cargo.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52', nota: 'Referencias bancarias: $2,59 en oficina y $0,62 por internet.' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta por cualquier canal del banco' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },

      {
        // Tarjetas «Alia» (Classic, Gold, Platinum, Black y Mi Socia). Tasas: octubre 2026; servicios: septiembre 2026; cómo funciona el corriente: su contrato de la tarjeta.
        // Su logo oficial es blanco: va sobre el celeste de los encabezados de su propio tarifario (#11C1FF) con `logoFondo`.
        // La red (Visa, Mastercard…) no aparece en los documentos leídos: se deja la lista general.
        id: 'ec-solidario', pais: 'EC', nombre: 'Banco Solidario', corto: 'Solidario', logoFondo: '#11C1FF',
        niveles: ['Classic', 'Gold', 'Platinum', 'Black', 'Mi Socia'],
        fuente: { texto: 'Tarifario de tasas activas (octubre 2026), tarifario de servicios financieros (septiembre 2026) y contrato de emisión y uso de la tarjeta Alia', vigencia: 'octubre 2026',
          url: 'https://www.banco-solidario.com/transparencia' },
        tarifarioUrl: 'https://www.banco-solidario.com/sites/default/files/tarifario/Banco_Solidario_TARIFARIO_%20OCTUBRE_2026_Activas.pdf',
        tasaPublicada: { efectivaAnual: 16.75, nominalAnual: 15.59, aplicaA: 'tarjetas Alia Classic, Gold, Platinum y Black (corriente a financiar y diferido)' },
        // Avance: $4,46 + IVA (= $5,13) por cada fracción de $100. El banco publica el valor de un tramo; la app multiplica por tramos (n × $4,46 y luego el IVA).
        avance: {
          tipo: 'escalones', etiqueta: 'Cajero automático (propio, local o de otro banco)',
          escalones: tramos100(50, 10, 4.46, 15), maxUsd: 1000.99,
          aviso: 'El tarifario publica el avance en cajero solo hasta $1.000; más arriba usa web, ventanilla o corresponsal.',
          otrosCanales: [
            { etiqueta: 'Web, ventanilla (país o exterior), corresponsales y entidades auxiliares',
              escalones: [...tramos100(100, 29, 4.46, 15), [2901, 150.08]] },
            { etiqueta: 'App Solidario',
              escalones: [[1, 0.35], [10, 1.30], [20, 2.10], [30, 2.90], [40, 3.80], ...tramos100(50, 29, 4.46, 15), [2901, 150.08]] },
          ],
        },
        costos: {
          rotativo: { texto: 'Pagas el total dentro de 15 días del estado de cuenta: sin interés. Si pagas solo el mínimo, el saldo corriente se difiere solo',
            nota: 'Según su contrato de emisión y uso de la tarjeta Alia (sin fecha de publicación): dentro de los 15 días posteriores a la emisión del estado de cuenta, pagar el total o el mínimo no causa interés. Si no cubres lo pendiente en ese plazo, cobran intereses normales desde el vencimiento del estado de cuenta, más mora y gastos de cobranza documentados. Si pagas solo el mínimo (o menos del total), aceptas diferir el saldo de tus consumos corrientes al plazo que defina el banco. El mínimo incluye impuestos, cargos, intereses, servicios financieros, cuotas de diferidos y un factor de los consumos corrientes. El interés de financiamiento se calcula sobre los saldos de los consumos de cada mes. Puedes prepagar diferidos sin recargo.' },
          diferido: { texto: '15,59 % nominal (16,75 % efectiva). Factor de cuota por cada $1: 3 meses 0,3420 · 6 meses 0,1743 · 12 meses 0,0905 · 24 meses 0,0488 · 36 meses 0,0350',
            nota: 'Plazos publicados: 2 meses 0,5098 · 3 meses 0,3420 · 6 meses 0,1743 · 9 meses 0,1185 · 12 meses 0,0905 · 18 meses 0,0627 · 24 meses 0,0488 · 36 meses 0,0350. Es el «factor de ponderación» del tarifario; coincide con la cuota mensual por cada $1 diferido (por ejemplo, $1.000 a 12 meses ≈ $90,50 al mes; cálculo de la app). El saldo corriente que no pagas pasa a diferido.' },
          tasa: { texto: '15,59 % nominal · 16,75 % efectiva anual',
            nota: 'Tarjetas Alia Classic, Gold, Platinum y Black. Alia Mi Socia, según su tipo de microcrédito: minorista 28,20 % efectiva · simple 22,42 % nominal / 24,87 % efectiva · ampliada 20,08 % nominal / 22,03 % efectiva.' },
          mora: { texto: 'Recargo sobre la tasa: 5 % (1 a 15 días), 7 % (16 a 30), 9 % (31 a 60) y 10 % (más de 60 días)',
            nota: 'Su tarifario dice que aplica a todos los productos vigentes. Sobre 15,59 % nominal da cerca de 16,37 %, 16,68 %, 16,99 % y 17,15 % (cálculo de la app, no cifra publicada).' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta',
            nota: 'Consumos de más de $100 en el exterior: $1,96 (hasta $100 no cobran). Consulta de saldo en cajero del exterior: $1,02. Gasolineras: $0,23 por consumo. Activación, bloqueo y notificaciones de tus consumos: $0,00.' },
          mantenimiento: { texto: '$0,00', nota: 'Mantenimiento, mantenimiento con pago mínimo y con pago total: $0,00.' },
          avance: { texto: '$5,13 por cada $100 o fracción; desde $0,35 en la app; $150,08 sobre $2.900',
            nota: 'Cajero (propio, local o externo): $5,13 por cada fracción de $100, de $50 a $1.000. Web, ventanilla (país o exterior), corresponsales y entidades auxiliares: $5,13 por fracción de $100 hasta $2.900 (el tarifario dice «desde $100»). App Solidario: $0,35 de $1 a $9,99 · $1,30 de $10 a $19,99 · $2,10 de $20 a $29,99 · $2,90 de $30 a $39,99 · $3,80 de $40 a $49,99, y desde $50 igual que lo anterior. Más de $2.900 por web, app, ventanilla o corresponsal: $150,08. El banco publica el valor de un tramo; los de varios tramos (por ejemplo $200 = $10,26) los calcula la app. Los centavos cuentan en el rango menor. Los intereses del avance van aparte.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'Por cuota vencida y días de atraso (1 a 30, 31 a 60, 61 a 90 y más de 90 días). Un solo cargo por la cuota con más días vencidos; la gestión preventiva antes del vencimiento no se cobra. Según el contrato, los gastos de cobranza van por tu cuenta.' },
          emision: { texto: '$5,03 con chip (emisión y renovación)', nota: 'Con banda lectora (sin chip): $0,00. La renovación solo se cobra cuando venció el plástico (vigencia mínima de 3 años).' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro físico', nota: 'Con banda lectora (sin chip): $0,00. Por migración o falla de la banda o del chip: $0,00.' },
          recompensas: { texto: '$5,75 a $62,10 al año según el segmento',
            nota: 'El tarifario lo publica por «segmento», no por tarjeta, y no dice qué tarjeta Alia corresponde a cada segmento: pregunta al banco. Plan de recompensas (anual): AA+ $62,10 · A+ $50,60 · B+ $32,20 · C+ $26,45 · D+ $11,50 · E+ $5,75. Prestaciones en el exterior (anual): AA+ y AA $27,60 · A+ y A $23,00 · B+ y B $18,40 · C+ y C $12,65 · D+ y D $8,05. Se cobra por períodos anuales y con tu aceptación por escrito.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52', nota: 'Referencias bancarias: $2,59 en oficina.' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta por cualquier canal del banco' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },

      {
        // Documento «Tasas y tarifas por servicios aplicados a las tarjetas de crédito» (SIN fecha de vigencia) + contrato de la tarjeta VISA (rev. junio 2023).
        // Ese documento no trae la tasa de la tarjeta ni los factores de diferido: se dejan sin dato (la app usa el techo legal como punto de partida).
        // El contrato leído es de Visa; no se sabe si emiten otra red, por eso se deja la lista general de redes.
        id: 'ec-amazonas', pais: 'EC', nombre: 'Banco Amazonas', corto: 'Amazonas',
        fuente: { texto: 'Tasas y tarifas por servicios aplicados a las tarjetas de crédito (documento sin fecha de vigencia, publicado en su página de transparencia; consultado el 6 de noviembre de 2026) y contrato de la tarjeta VISA (rev. junio 2023)', vigencia: 'sin fecha publicada (consultado nov. 2026)',
          url: 'https://www.bancoamazonas.com/transparencia-de-la-informacion/' },
        tarifarioUrl: 'https://cdn.sanity.io/files/1tcepar5/production/39b3bc03c865cfe051de5c72f295cc9729b6335c.pdf',
        // Avance: valor fijo con IVA según el monto. Cajero en el país y cajero en el exterior.
        avance: {
          tipo: 'escalones', etiqueta: 'Cajero automático (en el país)',
          escalones: [[0, 11.50], [101, 13.80], [201, 19.55], [301, 28.75], [401, 34.50], [501, 40.25], [601, 46.00], [701, 51.75], [801, 57.50], [901, 63.25], [1001, 72.13], [2001, 96.60], [3001, 128.80], [4001, 161.00], [5001, 168.08]],
          otrosCanales: [
            { etiqueta: 'Cajero automático (en el exterior)',
              escalones: [[0, 5.13], [100.01, 10.27], [200.01, 15.40], [300.01, 20.54]] },
          ],
        },
        costos: {
          rotativo: { texto: 'Tienes 15 días desde el estado de cuenta para pagar el total o el mínimo sin interés. Si pagas el mínimo o menos, el saldo pasa al «rotativo»',
            nota: 'Según el contrato de la tarjeta VISA (rev. junio 2023): si pagas el total o el mínimo dentro de los 15 días posteriores a la emisión del estado de cuenta no hay interés; si pagas solo el mínimo o menos, se activa automáticamente el sistema de saldo rotativo y el interés se recalcula sobre el capital pendiente. El mínimo suma el saldo rotativo dividido para el factor del banco, el interés de financiamiento, la afiliación o renovación, las cuotas de diferidos y las cuotas vencidas. Si no pagas a tiempo, corre la mora desde la fecha de vencimiento. El tarifario de tarjetas no publica la tasa ni el factor: pídelos al banco o míralos en tu estado de cuenta.' },
          mora: { texto: 'Recargo sobre la tasa: 5 % (1 a 15 días), 7 % (16 a 30), 9 % (31 a 60) y 10 % (más de 60 días)',
            nota: 'Sale de su tabla de tasas activas, no del documento de tarjetas, y se cuenta desde la fecha de vencimiento. Ese mismo documento trae un máximo de consumo de 17,30 % efectiva que no coincide con el techo legal que publican otros bancos (16,77 %), así que parece desactualizado: la app no lo usa como tasa de tu tarjeta.' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta',
            nota: 'Consumos de más de $100 en el exterior: $1,96. Consulta de saldo en cajero del exterior: $1,02. Gasolineras: $0,23 por consumo. Activación, bloqueo y frecuencia de transacciones: $0,00.' },
          mantenimiento: { texto: '$0,00', nota: 'Mantenimiento, afiliación y renovación de servicios básicos: $0,00.' },
          avance: { texto: 'Desde $5,13 hasta $168,08 según el monto y el lugar',
            nota: 'Valor fijo con IVA. Cajero en el país: $11,50 hasta $100,99 · $13,80 hasta $200,99 · $19,55 hasta $300,99 · $28,75 hasta $400,99 · $34,50 hasta $500,99 · $40,25 hasta $600,99 · $46,00 hasta $700,99 · $51,75 hasta $800,99 · $57,50 hasta $900,99 · $63,25 hasta $1.000,99 · $72,13 hasta $2.000,99 · $96,60 hasta $3.000,99 · $128,80 hasta $4.000,99 · $161,00 hasta $5.000,99 · $168,08 desde $5.001. Cajero en el exterior: $5,13 hasta $100 · $10,27 hasta $200 · $15,40 hasta $300 · $20,54 de $300,01 en adelante. Los intereses se cobran aparte. El documento no publica el avance por ventanilla.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'Misma tabla de la regulación (cobranza extrajudicial) que usan otros bancos; depende del valor de la cuota vencida y los días de atraso. Un solo cargo por la cuota con más días vencidos.' },
          emision: { texto: '$5,03 con chip (emisión y renovación)', nota: 'Activación, afiliación y renovación de servicios básicos: $0,00.' },
          reposicion: { texto: '$5,03 con chip por pérdida o robo', nota: 'Por actualización o falla de la banda: $0,00. Reposición en el exterior: $256,69.' },
          recompensas: { texto: '$5,75 a $50,60 al año según el segmento',
            nota: 'Lo publican por «segmento», no por tarjeta, y no dicen qué tarjeta corresponde a cada segmento: pregunta al banco. Plan de recompensas (anual): A+ $50,60 · B+ $32,20 · C+ $26,45 · D+ $11,50 · E+ $5,75. Prestaciones en el exterior (anual): A+ $23,00 · B+ $18,40 · C+ $12,65 · D+ $8,05.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior' },
          estado: { texto: 'Corte de estado de cuenta $1,87 · copia $0,52', nota: 'Referencias bancarias: $2,59.' },
          pagoTarjeta: { texto: 'Si pagas desde otra entidad: $0,39 por banca telefónica, celular, internet o kiosko · $0,45 por oficina, corresponsal o cajero',
            nota: 'Pago de tarjeta por teléfono (Amazonas Express): $6,90. Cheque devuelto: $2,86 o $3,32.' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },

      {
        // Tarifario «Costos de Servicios» (edición noviembre 2026) + contrato de emisión y uso de la tarjeta de crédito (archivo del 19 de mayo de 2025).
        // La página de la tarjeta dice «Tarjetas de Crédito Visa Clásica y Gold»; el tarifario solo nombra esos dos segmentos (C+ Gold-Oro y D+ Clásica).
        // El tarifario NO trae: recargo de mora de tarjeta, factores de diferido, plan de recompensas ni voucher → quedan sin dato.
        // Su logo oficial es verde oscuro (#006636) sobre fondo transparente: va sobre fondo claro.
        id: 'ec-manabi', pais: 'EC', nombre: 'Banco Comercial de Manabí', corto: 'Manabí', redes: ['Visa'],
        niveles: ['Clásica', 'Gold'],
        fuente: { texto: 'Tarifario de costos de servicios de Banco Manabí (noviembre 2026, sección «Costos de Servicios» de su página) y contrato de emisión y uso de la tarjeta de crédito (19 de mayo de 2025)', vigencia: 'noviembre 2026',
          url: 'https://www.bcmanabi.com/' },
        tarifarioUrl: 'https://www.bcmanabi.com/storage/files/TARIFARIO_NOVIEMBRE_2026-2026-11-05.pdf',
        // Su tabla de tasas dice «Interés en tarjetas de créditos»: 15,60 % nominal, 16,77 % efectiva, y la columna de máximos de la Junta marca también 16,77 %.
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjetas de crédito («interés en tarjetas de créditos»); es igual al máximo que publica la Junta' },
        // Avance: «$4,46 + IVA por cada $100,99 o fracción; sobre $2.901 el máximo es $130,50 + IVA». Misma fórmula para el país (cajero u oficina) y el exterior (oficina o cajero).
        // El banco publica el valor de un tramo; la app multiplica por tramos (n × $4,46 y luego el IVA).
        avance: {
          tipo: 'escalones', etiqueta: 'En el país y en el exterior (cajero u oficina)',
          escalones: [...tramos100(1, 29, 4.46, 15), [2901, 150.08]],
        },
        costos: {
          rotativo: { texto: 'Pagas el total dentro de 15 días del estado de cuenta: sin interés. Pagar solo el mínimo (o menos) te pasa al crédito rotativo',
            nota: 'Según su contrato de la tarjeta (archivo de mayo de 2025): tienes 15 días desde que se emite el estado de cuenta para pagar el total o el mínimo. Pagar el total en ese plazo no causa interés. El mínimo suma el saldo rotativo dividido para un factor que define el banco, los intereses de financiamiento, la afiliación o renovación, las cuotas de los diferidos y las cuotas vencidas; el factor puede cambiar y te lo informan en el estado de cuenta. Un pago parcial se aplica primero a intereses, luego a cargos y gastos, y el resto a capital, y el interés normal se cobra solo sobre lo pendiente. Si vence el plazo sin cubrir lo pendiente, el banco puede cobrar interés normal desde la fecha del consumo hasta el vencimiento, y desde ahí interés de mora más honorarios y gastos de cobranza documentados. Puedes prepagar total o parcialmente sin recargo. El tarifario no publica el factor del mínimo ni la tasa de mora de la tarjeta.' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual',
            nota: 'Es lo que su tarifario publica como «interés en tarjetas de créditos» y es igual al máximo que fija la Junta (16,77 % efectiva), o sea que no es una tasa menor al techo legal. No separa corriente de diferido ni publica factores por plazo; su página de la tarjeta dice que hay diferidos con y sin interés. Las tasas de otros segmentos de su tabla (productivo, microcrédito, sobregiros) no son de la tarjeta.' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta',
            nota: 'Consumos de más de $100 en el exterior: $1,96. Consulta de saldo en cajero del exterior: $1,02. Gasolineras: $0,23 por consumo. Activación, notificaciones de tus consumos y frecuencia de transacciones: $0,00.' },
          mantenimiento: { texto: '$0,00',
            nota: 'Mantenimiento, con pago mínimo y con pago total; afiliación y renovación de la tarjeta principal y de la adicional (persona natural): $0,00. Aparte, en «servicios de terceros» su tarifario pone el seguro de desgravamen para clientes con tarjeta de crédito: $4,99 más impuestos ($5,20); no dice cada cuánto se cobra. En la línea de arriba del mismo seguro dice: si aceptas y firmas el débito del servicio de la aseguradora, 1 por mil mensual sobre el saldo adeudado, impuestos incluidos; no aclara cuál de las dos te toca: confírmalo con el banco.' },
          avance: { texto: '$5,13 por cada $100 o fracción; $150,08 sobre $2.900',
            nota: 'Cajero u oficina, en el país o en el exterior: $4,46 + IVA (= $5,13) por cada $100 o fracción. El banco publica el valor de un tramo; los de varios tramos (por ejemplo $200 = $10,26) los calcula la app. Desde $2.901 el máximo es $130,50 + IVA = $150,08. Los centavos cuentan en el rango menor. Los intereses del avance van aparte.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'Cobranza extrajudicial de créditos y tarjetas, por monto vencido (menos de $100 · $100–199 · $200–299 · $300–499 · $500–999 · más de $1.000) y días de atraso. 1 a 30 días: $7,34 · $8,45 · $9,11 · $9,57 · $9,92 · $10,21. 31 a 60 días: $18,66 · $18,93 · $20,50 · $23,39 · $27,59 · $33,10. 61 a 90 días: $26,65 · $27,43 · $29,06 · $31,54 · $34,89 · $39,11. Más de 90 días: $29,39 · $30,64 · $33,38 · $37,63 · $43,36 · $50,59.' },
          emision: { texto: '$5,03 con chip (emisión y renovación)', nota: 'Con banda lectora (sin chip): $0,00.' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro físico', nota: 'Por migración, actualización o falla de la banda o del chip: $0,00. Con banda lectora: $0,00.' },
          recompensas: { texto: 'Prestaciones en el exterior: $12,65 (Gold-Oro) · $8,05 (Clásica)',
            nota: 'Es lo único de este tipo que su tarifario publica, por segmento: C+ (Gold-Oro) $12,65 y D+ (Clásica) $8,05. No dice cada cuánto se cobra. No trae un plan de recompensas.' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 (cualquier medio) · copia en oficina $0,52', nota: 'Referencias bancarias y confirmaciones para auditores sobre tarjeta de crédito: $2,59. Copia de microfilm y documentos: $2,50.' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta por cualquier canal del banco',
            nota: 'Si pagas desde canales de otra entidad: $0,39 por banca celular o internet · $0,45 por entidades de servicios auxiliares; ese cargo lo cobra la entidad dueña del canal. Cheque devuelto, aplicado a tarjeta de crédito: $2,86 (nacional) o $3,32 (del exterior).' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
        recompensasPorNivel: {
          'Clásica': 'Prestaciones en el exterior (segmento D+ Clásica): $8,05',
          'Gold': 'Prestaciones en el exterior (segmento C+ Gold-Oro): $12,65',
        },
      },

      {
        // Tarifario «de costos y comisiones» de cada tarjeta (julio 2026; el de la Standard y el de la Black son idénticos), preguntas frecuentes de cada tarjeta y tabla de tasas (octubre 2026).
        // Su tarifario general (octubre–diciembre 2026) NO trae tarjeta de crédito, solo débito. Las dos tarjetas son Mastercard; la Black es «solo bajo invitación».
        // Sus documentos se contradicen en varios puntos (plazo del diferido, tasa, pago mínimo, día de corte): se publican las dos versiones y no se escoge una.
        // La «Tarifa máxima» del tarifario es el techo permitido; las preguntas frecuentes dicen qué cobran hoy (por eso el uso en el exterior va a $0,00).
        // Su logo oficial es rojo sobre fondo transparente (colores del sitio, #D9272E y dos tonos cercanos): va sobre fondo claro.
        id: 'ec-atlantida', pais: 'EC', nombre: 'Banco Atlántida', corto: 'Atlántida', redes: ['Mastercard'],
        niveles: ['Standard', 'Black'],
        fuente: { texto: 'Tarifario de costos y comisiones de las tarjetas de crédito Standard y Black (julio 2026, idénticos), sus preguntas frecuentes y su tabla de tasas (octubre 2026)', vigencia: 'julio 2026',
          url: 'https://www.bancoatlantida.ec/banca-personas/tarjetas/tarjeta-credito-standard/' },
        tarifarioUrl: 'https://www.bancoatlantida.ec/docs/banca-personas/tarjetas/tc-standard/tarifario-tc-standard.pdf',
        // Sin `tasaPublicada`: la única tasa que dan es ambigua (ver costos.tasa), así que la app parte del techo legal y la persona la corrige.
        // Avance: «$5,13 por cada $100 en cajero nacional y $8,21 por cada $100 en cajero internacional» (sus preguntas frecuentes; ya incluyen IVA).
        // Límites: $500 por día (y $200 por transacción en cajero). Más de $500 no se calcula: se muestra el aviso.
        avance: {
          tipo: 'porCada100', baseUsd: 5.13, ivaPct: 0, etiqueta: 'Cajero automático (en el país)', maxUsd: 500,
          aviso: 'Banco Atlántida limita el avance a $500 por día (y $200 por transacción en cajero).',
          otrosCanales: [
            { tipo: 'porCada100', baseUsd: 8.21, ivaPct: 0, etiqueta: 'Cajero automático (en el exterior)', maxUsd: 500,
              aviso: 'Banco Atlántida limita el avance a $500 por día (y $200 por transacción en cajero).' },
          ],
        },
        costos: {
          rotativo: { texto: 'Pagas el total antes de la fecha máxima de pago (los 15): sin interés en las compras corrientes. Si pagas solo el mínimo, el saldo pendiente genera interés',
            nota: 'Según su tarifario de tarjetas (julio 2026): en el «crédito corriente» no hay cargo por intereses si cubres la deuda total hasta la fecha máxima de pago del estado de cuenta; en el «crédito rotativo» se aplica la tasa de financiamiento sobre el valor pendiente de pago, y los intereses se calculan sobre lo que queda después de tu pago (preguntas frecuentes). Fecha de corte: el día 30 de cada mes; fecha máxima de pago: el día 15. Pago mínimo: el tarifario dice 5 % del total adeudado más las cuotas diferidas, y las preguntas frecuentes de la Black dicen 4 % del total consumido; no coinciden, así que confirma el tuyo en el estado de cuenta. Si el día de corte cae en feriado o fin de semana, el tarifario lo pasa al siguiente día hábil y las preguntas frecuentes al día hábil anterior. Si no pagas ni el mínimo a tiempo, entras en mora.' },
          diferido: { texto: 'Plazos de 3, 6, 9, 12, 18 y 36 meses con intereses; referencia: 15 % nominal (16,08 % efectiva)',
            nota: 'El tarifario da esa tasa «como referencia» y no publica factores por plazo. Sus preguntas frecuentes dicen otra cosa: monto mínimo para diferir $100, plazo de hasta 24 meses, tasa de 15,15 % y un cargo que depende del monto y del plazo (el valor exacto te lo dicen al hacer el diferido). No se difiere en el comercio: compras como corriente y pides el diferido en una agencia. Para tarjetas de microcrédito la referencia es 17 % nominal (18,39 % efectiva).' },
          tasa: { texto: 'Consumo: 15,15 % según sus preguntas frecuentes (no dice si es nominal o efectiva)',
            nota: 'Es lo que responde la pregunta «¿cuáles son las tasas de interés?» de la tarjeta Black. Su tarifario da otra referencia para el diferido de consumo (15 % nominal, 16,08 % efectiva) y su tabla de tasas de octubre 2026 pone 16,77 % efectiva como máximo del segmento consumo. Como no queda claro cómo se expresa el 15,15 %, la app no lo toma como la tasa de tu tarjeta: mira tu estado de cuenta.' },
          mora: { texto: 'Porcentaje sobre el pago mínimo vencido: 5 % (1 a 15 días), 7 % (16 a 30), 9 % (31 a 60) y 10 % (más de 60 días)',
            nota: 'Su tarifario lo titula «interés calculado sobre el pago mínimo vencido» y no dice a qué tasa se aplica cada porcentaje ni cuánto da en total. Es la misma escala que otros bancos publican como recargo sobre su tasa.' },
          uso: { texto: '$0,00 por compras físicas y digitales, en Ecuador y en el exterior',
            nota: 'Según sus preguntas frecuentes, hoy solo cobran $0,23 por consumo en gasolineras. Su tarifario trae como máximos permitidos (techos) $1,96 por consumos de más de $100 en el exterior, $1,02 por consulta en cajero del exterior y $0,36 por consulta impresa en cajero nacional. Activación, notificaciones de tus consumos y frecuencia de transacciones: $0,00.' },
          mantenimiento: { texto: '$0,00',
            nota: 'Mantenimiento, pagos del mínimo y del total, entrega del estado de cuenta, bloqueo y cancelación de la tarjeta: $0,00. Renovar el servicio anual del token virtual: $3,45. Su tarifario anota caducidad del servicio de 1 año y del plástico de 5 años.' },
          avance: { texto: '$5,13 por cada $100 en cajero del país · $8,21 por cada $100 en cajero del exterior',
            nota: 'Valores con IVA, de sus preguntas frecuentes (el tarifario de tarjetas no los trae). Hasta el 50 % del cupo, $500 por día y $200 por transacción en cajero; también se hace por ventanilla en sus agencias (no publican un costo aparte). El banco dueño del cajero puede cobrar además. Los intereses del avance van aparte. Los valores de varios tramos los calcula la app (por ejemplo $200 = $10,26).' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'Por monto vencido (menos de $100 · $100–199 · $200–299 · $300–499 · $500–999 · $1.000–4.999) y días de atraso. 1 a 30 días: $7,34 · $8,45 · $9,11 · $9,57 · $9,92 · $10,21. 31 a 60 días: $18,66 · $18,93 · $20,50 · $23,39 · $27,59 · $33,10. 61 a 90 días: $26,65 · $27,43 · $29,06 · $31,54 · $34,89 · $39,11. 91 a 120 días: $29,39 · $30,64 · $33,38 · $37,63 · $43,36 · $50,59. Vía llamada, SMS, correo, carta o visita.' },
          emision: { texto: '$5,03 (emisión del plástico)',
            nota: 'Lo dicen sus preguntas frecuentes y su tarifario (emisión, renovación y reposición, $5,03 como máximo). Con banda lectora: $0,00. La tarjeta adicional cuesta $5,03 de emisión (preguntas frecuentes de la Black).' },
          reposicion: { texto: '$5,03 por reposición de la tarjeta (máximo del tarifario)', nota: 'Con banda lectora: $0,00.' },
          recompensas: { texto: '$8,05 al año por las prestaciones de la franquicia',
            nota: 'Sus preguntas frecuentes (Standard y Black, con el mismo texto) dicen que solo te debitan eso por las prestaciones nacionales e internacionales; no hablan de un plan de recompensas. La Black lista más prestaciones (Concierge, salas VIP, garantía extendida…) pero con el mismo valor.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior', nota: 'Copia de voucher o vale (máximos del tarifario).' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52', nota: 'Te lo envían por correo y por SMS. Corte de movimientos: $1,87. Referencias bancarias: $2,59.' },
          pagoTarjeta: { texto: '$0,00 al pagar el mínimo o el total',
            nota: 'Canales de pago: agencias, cajeros, bancas móviles de otras entidades y débito automático de una cuenta Atlántida. No publican un cobro por pagar desde otro banco. Cheque devuelto: $2,86 (país) y $3,32 (exterior).' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },

      /* ---------------------------------------------------------------- COOPERATIVAS (Ecuador) */
      {
        // PRIMERA COOPERATIVA. Tarifario «Tarifario Tarjetas de Crédito» (código ROTO-01-02, versión 10/2026; archivo «Tarifario-TC-Octubre-2026.pdf») + las páginas de su sitio
        // de tarjetas: ¿Cómo diferir?, Servicios, JEP Recompensas y la ficha de la Visa Clásica (cupos de avance).
        // El tarifario publica «Tasa Máxima Nominal» (15,60 % en consumo = máximo de la Junta): es un techo, no necesariamente lo que cobran → se dice en la ficha.
        // El tarifario NO explica el corriente; su contrato (sin fecha) da el plazo de 15 días para pagar el total y cómo se arma el mínimo (sin porcentaje). La mora se publica como «recargo por morosidad» sin decir sobre qué valor.
        // Sus valores de cobranza vienen SIN IVA (lo dice el pie de la tabla); aquí van ya con IVA (valor × 1,15, cálculo de la app). El valor de más de 90 días para cuotas de $100 a $199,99 es
        // $26,54 en su tarifario, y otros bancos publican $26,64: se muestra lo que dice la cooperativa y se avisa.
        // Su logo oficial (archivo SVG de jep.coop) trae un lema en blanco que no se ve sobre fondo claro: se usa solo el círculo verde con «JEP».
        id: 'ec-jep', pais: 'EC', tipo: 'cooperativa', nombre: 'Cooperativa JEP (Juventud Ecuatoriana Progresista)', corto: 'JEP', redes: ['Visa', 'Mastercard'],
        niveles: ['Clásica / Standard', 'Gold', 'Signature', 'Infinite / Black'],
        fuente: { texto: 'Tarifario de tarjetas de crédito de la Cooperativa JEP (octubre 2026, versión 10/2026) y las páginas de su sitio de tarjetas (cómo diferir, servicios, JEP Recompensas, Visa Clásica)', vigencia: 'octubre 2026',
          url: 'https://www.tarjetasjep.com/tarjeta-credito/tarifario' },
        tarifarioUrl: 'https://www.tarjetasjep.com/documents/20181/0/Tarifario-TC-Octubre-2026.pdf/',
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjetas de consumo (rotativo y diferido): su tarifario la llama «tasa máxima nominal» y es igual al máximo de la Junta' },
        // Avance: «por cada $100,00 o fracción $4,46 + IVA, con un máximo de $223,00 + IVA» (cajero u oficina; propios, locales y exterior).
        // Su tabla de rangos va de $0,01 a $100,00, de $100,01 a $200,00… (el centavo cuenta en el tramo siguiente) y de $4.900,01 en adelante: $223,00 + IVA = $256,45.
        avance: {
          tipo: 'escalones', etiqueta: 'Cajero u oficina, en el país y en el exterior',
          escalones: [...tramos100(1, 49, 4.46, 15).map(([, v], i) => [Number((i === 0 ? 0.01 : i * 100 + 0.01).toFixed(2)), v]), [4900.01, 256.45]],
        },
        costos: {
          rotativo: { texto: 'Pagas el total dentro de 15 días desde que se emite el estado de cuenta; si pagas solo el mínimo pasas al crédito rotativo. Su contrato no dice expresamente que esos 15 días sean sin interés',
            nota: 'Según su contrato de emisión y uso de la tarjeta (documento sin fecha, https://www.jep.coop/documents/20182/183306/contrato-emision-uso-tc.pdf): el estado de cuenta trae la fecha de corte y la fecha máxima de pago, y el pago total debe hacerse dentro de los 15 días posteriores a su emisión. El mínimo es la suma de los valores exigibles (cuotas de consumos, intereses y costos) más un porcentaje de tus consumos del último mes que no dice cuál es, y la cooperativa puede cambiar la forma de calcularlo. Pagar solo el mínimo te pasa al crédito rotativo. Los intereses de financiamiento se calculan sobre los saldos de uso del cupo, con las tasas vigentes a la fecha del consumo. Su tarifario (octubre 2026) publica solo la tasa del rotativo (15,60 % nominal en consumo; es el máximo). Fechas de corte que publica: fin de cada mes, 12, 15, 18, 03 y 26; fechas de pago: 15, 27, 30, 03, 18 y 11 de cada mes, escritas en ese mismo orden. Para diferir debes haber pagado el valor mínimo. El plástico vale 6 años.' },
          diferido: { texto: '15,60 % nominal (16,77 % efectiva) con factor por plazo: 3 meses 2,61 % · 6 meses 4,60 % · 12 meses 8,65 % · 24 meses 17,06 % · 36 meses 25,86 % · 60 meses 44,64 %',
            nota: 'También 9 meses 6,61 % · 18 meses 12,80 % · 30 meses 21,41 % · 48 meses 35,05 %. El factor sirve para estimar el interés total sobre el monto diferido (por ejemplo, $1.000 a 12 meses ≈ $86,50 de interés; cálculo de la app). Hasta 60 meses. Cómo diferir: llamando al 07 413 5000 (todos los días, 24 horas); su ficha de la Visa Clásica añade agencias, JEPMóvil y JEPVirtual. Se puede diferir: compras corrientes nacionales, del exterior o por internet, del mes actual o de meses anteriores, y avances en cajero o en ventanilla. Hasta un día antes de la fecha de corte y con el valor mínimo ya pagado. En comercios afiliados del país hay diferidos con y sin intereses; si el comercio no te lo permite, compras en corriente y los llamas. Pymes, empresarial y corporativo tienen tasas y factores propios más bajos (a 12 meses: 5,23 % · 5,44 % · 4,17 %).' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual (consumo)',
            nota: 'Su tarifario titula la fila «Tasa Máxima Nominal»; para consumo es igual al máximo que fija la Junta (16,77 % efectiva), o sea que es el techo y no necesariamente lo que te cobran: míralo en tu estado de cuenta. Otros segmentos de su tabla (nominal / efectiva): Pymes 9,52 % / 9,95 % · empresarial 9,89 % / 10,35 % · corporativo 7,61 % / 7,88 %. No separa corriente de rotativo con otra tasa.' },
          mora: { texto: 'Recargo por morosidad: 5 % (1 a 15 días) · 7 % (16 a 30) · 9 % (31 a 60) · 10 % (más de 60 días)',
            nota: 'Su tarifario lo titula «Tasa mora» y «recargo por morosidad»; no dice sobre qué valor se aplica ni cada cuánto (otros bancos publican la misma escala como recargo sobre su tasa). Confírmalo con la cooperativa.' },
          uso: { texto: '$0,00 por consumos nacionales; $1,96 por consumos de más de $100 en el exterior',
            nota: 'En consumos en el exterior se cobra además el 5 % de Impuesto a la Salida de Divisas (lo dice su tarifario). Ojo: en su tabla de recompensas la misma hoja dice que no autoriza cargo adicional por consumos en el exterior; confirma con la cooperativa si te cobran los $1,96. Frecuencia de transacciones, activación y consultas en JEPMóvil, cajeros, JEPVirtual, Call Center y oficina: $0,00. Consulta de saldo impresa en cajero propio o nacional: $0,36; en cajero del exterior: $1,02 (su tabla escribe $0,31 en la columna de tarifa pero el total es $1,02, igual que en su tarifa de prepago).' },
          mantenimiento: { texto: '$0,00',
            nota: 'Mantenimiento de la tarjeta de crédito, pagos por canales JEP, bloqueo, anulación y cancelación, y estados de cuenta por medios electrónicos: $0,00. Aparte hay un seguro de desgravamen solo si firmas la solicitud de adhesión (según la póliza vigente): cobertura normal $0,89 para saldos hasta $10.000 y $1,30 hasta $15.000 (el costo sube por rangos), y cobertura por accidentes personales $0,86 al mes hasta $10.000 y $1,25 hasta $15.000. Para la cobertura normal no dice cada cuánto se cobra; los valores incluyen impuestos.' },
          avance: { texto: '$5,13 por cada $100 o fracción; $256,45 desde $4.900,01',
            nota: 'Cajero u oficina, en el país o en el exterior: $4,46 + IVA (= $5,13) por cada $100 o fracción, con un máximo de $223,00 + IVA ($256,45). Su tabla da el valor de cada tramo (por ejemplo $200 = $10,26 · $1.000 = $51,29 · $2.500 = $128,23). Los rangos son de $x00,01 a $x00,00. Límites por día, según cupo disponible (ficha de la Visa Clásica; las demás tarjetas pueden tener otros): ventanilla nacional $1.500 (mensual $2.000), ventanilla del exterior $1.010, cajero nacional y del exterior $510. En cajeros JEP y de las redes Banred, Plus, Cirrus y Maestro; la clave la pides al Call Center. Los intereses del avance van aparte, y el avance se puede diferir.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'Su tabla trae los valores sin IVA; aquí van ya con IVA (valor × 1,15, cálculo de la app). Por cuota vencida (menos de $100 · $100–199,99 · $200–299,99 · $300–499,99 · $500–999,99 · desde $1.000) y días de atraso. 1 a 30 días: $7,34 · $8,45 · $9,11 · $9,57 · $9,92 · $10,21. 31 a 60 días: $18,66 · $18,93 · $20,50 · $23,39 · $27,59 · $33,10. 61 a 90 días: $26,65 · $27,43 · $29,06 · $31,54 · $34,89 · $39,11. Más de 90 días: $29,39 · $30,52 · $33,38 · $37,63 · $43,36 · $50,59. Ojo: para $100–199,99 y más de 90 días la cooperativa publica $26,54 (= $30,52 con IVA); otros bancos publican $26,64 (= $30,64).' },
          emision: { texto: '$5,03 (tarjeta principal o adicional con chip; la renovación cuesta igual)',
            nota: 'Para pedir la tarjeta debes ser socio de la cooperativa. Las adicionales son para familiares hasta el segundo grado de consanguinidad y el primero de afinidad. Reposición por falla de la banda lectora o del chip, o por migración: $0,00.' },
          reposicion: { texto: '$5,03 por pérdida, robo o deterioro físico', nota: 'Por migración o por falla de la banda lectora o del chip: $0,00.' },
          recompensas: { texto: 'JEP Recompensas: de $11,50 a $62,10 al año según la tarjeta (1 punto por cada $1 de consumo)',
            nota: 'Cuesta por año y solo se cobra si aceptas entrar al programa: Visa Clásica y Mastercard Standard $11,50 · Gold $26,45 · Visa Signature $50,60 · Mastercard Black y Visa Infinite $62,10 (todo con IVA). Las prestaciones en el exterior salen $0,00. No suman puntos los avances, las gasolineras ni el pago de servicios básicos y públicos; los consumos de adicionales suman al titular. Los pagos vencidos o retrasados, cancelar la tarjeta o salir del programa te pueden quitar los puntos.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior', nota: 'Copia de voucher o vale.' },
          estado: { texto: 'Estado de cuenta electrónico y a domicilio $0,00 · copia $0,52', nota: 'Corte impreso de movimientos en oficina: $1,87. Referencias financieras: $2,59.' },
          pagoTarjeta: { texto: '$0,00 al pagar por los canales de JEP (agencias, JEPMóvil, JEPVirtual)',
            nota: 'No publica un cobro por pagar desde otra entidad. Cheque devuelto aplicado a la tarjeta: $2,86 (nacional) o $3,32 (del exterior).' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
        recompensasPorNivel: {
          'Clásica / Standard': 'JEP Recompensas: $11,50 al año (segmento D+) · prestaciones en el exterior $0,00',
          'Gold': 'JEP Recompensas: $26,45 al año (segmento C+) · prestaciones en el exterior $0,00',
          'Signature': 'JEP Recompensas: $50,60 al año (segmento A+) · prestaciones en el exterior $0,00',
          'Infinite / Black': 'JEP Recompensas: $62,10 al año (segmento AA+) · prestaciones en el exterior $0,00',
        },
      },

      {
        // SEGUNDA COOPERATIVA. Tarifario «Tarifario» de la CPN (noviembre 2026, archivo tarifario-2026-11.pdf, publicado en su sección Transparencia) + sus páginas de tarjetas y de avances de efectivo.
        // Su sitio pidió un captcha («No soy un robot», Radware): lo pulsó Luis a mano; la app no lo salta.
        // Su tarifario mezcla valores con y sin IVA (por ejemplo emisión de la tarjeta de crédito $4,37 y de la de débito $5,03) y al pie de una tabla dice «Valores con IVA»: se publican tal cual y se avisa.
        // NO publica recargo de mora de tarjeta ni explica el corriente (días sin interés, pago mínimo, fechas de corte): quedan sin dato / dicho en la ficha.
        // La tabla de planes de recompensa llama «Mastercard Clásica» al segmento D+; su página de la tarjeta de entrada se llama «Standard».
        // Su logo oficial (archivo SVG de su sitio) es gris oscuro y naranja sobre fondo transparente: va sobre fondo claro.
        id: 'ec-cpn', pais: 'EC', tipo: 'cooperativa', nombre: 'Cooperativa Policía Nacional (CPN)', corto: 'CPN', redes: ['Mastercard'],
        niveles: ['Standard', 'Gold', 'Platinum', 'Black'],
        fuente: { texto: 'Tarifario de la Cooperativa de Ahorro y Crédito Policía Nacional (noviembre 2026) y las páginas de sus tarjetas y de avances de efectivo', vigencia: 'noviembre 2026',
          url: 'https://www.cpn.fin.ec/transparencia' },
        tarifarioUrl: 'https://www.cpn.fin.ec/Portals/0/Footer/tarifario-2026-11.pdf',
        // Rotativo: «16,77 %» en la columna de tasa efectiva. Diferido: 15,60 % nominal y 16,77 % efectiva con factores. Ambas son iguales al máximo de la Junta.
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjeta de crédito: rotativo 16,77 % efectiva; diferido 15,60 % nominal (16,77 % efectiva); es igual al máximo de la Junta' },
        // Avance: «Hasta $2.900: $4,46 por cada $100 o fracción · Superior a $2.900: $133,93 por cada avance». No dice si lleva IVA: la app calcula con el valor tal cual (sin sumar IVA) y lo avisa.
        avance: {
          tipo: 'escalones', etiqueta: 'Avance de efectivo (cajero, oficina o app)',
          escalones: [...tramos100(1, 29, 4.46, 0).map(([, v], i) => [Number((i === 0 ? 0.01 : i * 100 + 0.01).toFixed(2)), v]), [2900.01, 133.93]],
        },
        costos: {
          rotativo: { texto: 'Su tarifario publica la tasa del rotativo (16,77 % efectiva), pero no explica cuántos días tienes sin interés ni cómo se calcula el pago mínimo',
            nota: 'Ni su tarifario ni las páginas de sus tarjetas explican cuándo corre el interés del corriente, cuánto es el pago mínimo ni cuáles son las fechas de corte y de pago: míralo en tu contrato y en tu estado de cuenta. Lo que sí publica: mantenimiento con pago mínimo y con pago total, $0,00.' },
          diferido: { texto: '15,60 % nominal (16,77 % efectiva) con factor por plazo: 3 meses 2,61 % · 6 meses 4,60 % · 9 meses 6,61 % · 12 meses 8,65 % · 24 meses 17,05 %',
            nota: 'El factor sirve para estimar el interés total sobre el monto diferido (por ejemplo, $1.000 a 12 meses ≈ $86,50 de interés; cálculo de la app). Sus páginas dicen: diferir hasta 24 meses con intereses o hasta 12 meses sin intereses según el establecimiento; los avances de efectivo se difieren de 3 a 24 meses desde $100. La página de la Gold habla de refinanciar consumos o saldos hasta 36 meses, un plazo que el tarifario no trae.' },
          tasa: { texto: '16,77 % efectiva (rotativo) · 15,60 % nominal = 16,77 % efectiva (diferido)',
            nota: 'Su tarifario no trae la tasa nominal del rotativo (solo 16,77 % efectiva), y las dos son iguales al máximo que fija la Junta: es el techo, no necesariamente lo que te cobran. Míralo en tu estado de cuenta.' },
          uso: { texto: '$0,00 por consumos nacionales; $1,70 por consumos de más de $100 en el exterior',
            nota: 'Los consumos de $100 o menos en el exterior no tienen cargo, salvo los valores que dispone la ley (como el Impuesto a la Salida de Divisas). Consulta en cajero del exterior: $0,89. Consulta impresa en cajero: $0,36. Gasolineras: $0,23. Notificaciones de tus consumos y frecuencia de transacciones: $0,00. Su tarifario no aclara si estos valores llevan IVA.' },
          mantenimiento: { texto: '$0,00',
            nota: 'Mantenimiento de la tarjeta de crédito, con pago mínimo y con pago total; pagos de la tarjeta por cualquier canal de la CPN; activación; bloqueo, anulación y cancelación; estados de cuenta en cualquier medio: $0,00. Sus páginas dicen que la Standard y la Platinum no tienen costo de mantenimiento. Aparte, su tabla de «gastos con terceros» trae seguro de desgravamen para tarjeta de crédito (personas naturales): 1,59 por mil; no dice sobre qué valor ni cada cuánto se cobra.' },
          avance: { texto: '$4,46 por cada $100 o fracción hasta $2.900; $133,93 desde $2.900,01',
            nota: 'Su tarifario no dice si el valor lleva IVA (otras entidades publican $4,46 + IVA = $5,13 por cada $100): la app calcula con el valor tal como está publicado, así que si te cobran IVA aparte el costo real es un 15 % mayor. Los valores de varios tramos los calcula la app (por ejemplo $200 = $8,92). Lo pides en la App CPN Móvil, la Cooperativa Virtual, las oficinas o los más de 160 cajeros; el dinero llega a tu cuenta de ahorros CPN, hasta tu cupo disponible. Los intereses del avance van aparte.' },
          cobranza: { texto: 'De $6,38 a $43,99 (valores de su tabla)',
            nota: 'Por monto vencido (menos de $100 · $100–199 · $200–299 · $300–499 · $500–999 · más de $1.000) y días de atraso. 1 a 30 días: $6,38 · $7,35 · $7,92 · $8,32 · $8,63 · $8,88. 31 a 60 días: $16,23 · $16,46 · $17,83 · $20,34 · $23,99 · $28,78. 61 a 90 días: $23,17 · $23,85 · $25,27 · $27,43 · $30,34 · $34,01. Más de 90 días: $25,56 · $26,64 · $29,03 · $32,72 · $37,70 · $43,99. Su tabla dice «Valores con IVA», pero son las mismas cifras que JEP y otras entidades publican sin IVA (JEP aclara que se les suma el IVA); si hay que sumarlo serían de $7,34 a $50,59 (cálculo de la app). No cobran nada por la gestión hecha antes del vencimiento ni por la gestión preventiva.' },
          emision: { texto: '$4,37 por emisión del plástico con chip (la renovación cuesta igual)',
            nota: 'Su tarifario no aclara si lleva IVA (en otras entidades es $4,37 + IVA = $5,03). Vigencia mínima del plástico: tres años. Con banda lectora: $0,00. Sus páginas dicen que la pides desde la App CPN Móvil, su sitio web u oficinas, desde los 18 años.' },
          reposicion: { texto: '$4,37 por pérdida, robo o deterioro físico (con chip)', nota: 'Por migración, actualización o falla de la banda lectora o del chip: $0,00. Con banda lectora: $0,00.' },
          recompensas: { texto: 'Plan de recompensas anual (columna «Cargo»): Black $54,00 · Platinum $28,00 · Gold $23,00 · Clásica $10,00',
            nota: 'Prestaciones en el exterior: Black $24,00 · Platinum $16,00 · Gold $11,00 · Clásica $7,00. Segmentos: AA+ Black, B+ Platinum, C+ Gold y D+ Clásica. Es un cargo anual que solo se cobra si aceptas por escrito entrar al plan, y su tarifario dice que no autoriza cargo adicional por consumos en el exterior. Si la columna «Cargo» no incluye IVA, con 15 % serían $62,10 · $32,20 · $26,45 · $11,50 (plan) y $27,60 · $18,40 · $12,65 · $8,05 (prestaciones); cálculo de la app, y son los mismos totales que publican otros bancos.' },
          voucher: { texto: '$1,79 del país · $8,93 del exterior', nota: 'Copia de voucher o vale (valores de su tabla; no aclara si llevan IVA).' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 (medios electrónicos y físicos) · copia $0,45', nota: 'Corte impreso de movimientos en oficina: $1,87. Referencias bancarias de tarjeta de crédito: $2,59. No aclara si llevan IVA.' },
          pagoTarjeta: { texto: '$0,00 al pagar por cualquier canal de la CPN', nota: 'No publica un cobro por pagar desde otra entidad. Cheque devuelto nacional: $2,49.' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
        recompensasPorNivel: {
          'Standard': 'Plan de recompensas $10,00 al año · prestaciones en el exterior $7,00 (segmento D+, valores de su tabla)',
          'Gold': 'Plan de recompensas $23,00 al año · prestaciones en el exterior $11,00 (segmento C+, valores de su tabla)',
          'Platinum': 'Plan de recompensas $28,00 al año · prestaciones en el exterior $16,00 (segmento B+, valores de su tabla)',
          'Black': 'Plan de recompensas $54,00 al año · prestaciones en el exterior $24,00 (segmento AA+, valores de su tabla)',
        },
      },

      {
        // TERCERA COOPERATIVA. Sí ofrece «Tarjeta de Crédito Mastercard» (su página: se pide en una agencia, hay que ser socio con la cuenta activa), pero NO publica sus tasas ni costos:
        // su tarifario de octubre 2026 trae tasas de crédito de consumo/vivienda/microcrédito y cobranza por tipo de crédito (no de tarjeta), y su catálogo de productos y servicios 2025 no menciona la tarjeta de crédito.
        // La única línea que nombra la tarjeta de crédito es la reposición del plástico con chip ($5,03, «cargo máximo»), compartida con la de débito.
        // Por eso solo va esa fila y el resto queda «sin dato» para que la persona lo anote. La tasa sugerida sale del techo legal (no se toma la del crédito de consumo: no es la de la tarjeta).
        // Su logo oficial (PNG de su sitio) es verde y amarillo sobre fondo transparente, con el lema «Invierte en tu futuro…»: va sobre fondo claro.
        id: 'ec-pmv', pais: 'EC', tipo: 'cooperativa', nombre: 'Cooperativa Pablo Muñoz Vega', corto: 'Pablo Muñoz Vega', redes: ['Mastercard'],
        fuente: { texto: 'Tarifario de octubre 2026 y catálogo de productos y servicios 2025 de la Cooperativa Pablo Muñoz Vega (no publican tasas ni costos de su tarjeta de crédito)', vigencia: 'octubre 2026',
          url: 'https://www.cpmv.fin.ec/servicios/tarjeta-de-credito-mastercard' },
        tarifarioUrl: 'https://www.cpmv.fin.ec/documentos/transparencia/tarifario-2026-10-octubre.pdf',
        aviso: 'La cooperativa ofrece la Tarjeta de Crédito Mastercard, pero no publica sus tasas ni sus costos (ni en su tarifario de octubre 2026 ni en su catálogo): pídelos en una agencia o anótalos de tu contrato y estado de cuenta.',
        costos: {
          reposicion: { texto: '$5,03 como máximo (plástico con chip, por pérdida, robo o deterioro físico)',
            nota: 'Es el cargo máximo que su tarifario pone para «tarjeta de crédito / tarjeta de débito con chip», sin separar una de otra; no dice cuánto cobran por la de crédito. Se exceptúan las fallas del chip.' },
        },
      },

      {
        // CUARTA COOPERATIVA. Tarifario específico «Tarjeta de crédito» de Cooprogreso (noviembre 2026), publicado en su sección de transparencia, más su tabla de «tasas de interés de crédito» y su tabla de costos de servicios.
        // Emite «Tarjeta de Crédito Mastercard» y su página la muestra en dos niveles (Mastercard y Black). Su tarifario NO separa los costos por nivel: lo que va aquí vale para la tarjeta de crédito en general.
        // Su tabla de tasas dice «15,15 %» y «16,25 %» para la tarjeta ($300 a $20.000, 3 a 36 meses): 15,15 % es la NOMINAL y 16,25 % la efectiva (cálculo de la app: con capitalización mensual 15,15 % equivale a 16,25 %). No dice si es una tasa fija o un máximo.
        // No trae factores de diferido, ni la tasa del rotativo por separado, ni el detalle de recompensas por tarjeta: eso queda «sin dato» y no se inventa.
        // Su logo oficial (PNG de su sitio) es verde claro y verde oscuro sobre fondo transparente: va sobre fondo claro.
        id: 'ec-cooprogreso', pais: 'EC', tipo: 'cooperativa', nombre: 'Cooperativa Cooprogreso', corto: 'Cooprogreso', redes: ['Mastercard'],
        niveles: ['Mastercard', 'Black'],
        fuente: { texto: 'Tarifario de la tarjeta de crédito de Cooprogreso (noviembre 2026), sus tasas de crédito y sus costos de servicios', vigencia: 'noviembre 2026',
          url: 'https://www.cooprogreso.fin.ec/tarjetas/credito' },
        tarifarioUrl: 'https://www.cooprogreso.fin.ec/Portals/0/Documentos/transparencia-de-la-informacion/costos-financieros/2026/tarifario-tarjeta-de-credito-noviembre-2026.pdf',
        tasaPublicada: { efectivaAnual: 16.25, nominalAnual: 15.15, aplicaA: 'tarjeta de crédito Mastercard ($300 a $20.000, 3 a 36 meses); su tabla no dice si es fija o máxima' },
        // Avance: dos tablas con valores totales (ya con IVA, el mismo $5,13 por cada $100 que publican otras entidades): una para cajeros y ventanillas del país y otra para cajeros del exterior.
        avance: {
          tipo: 'escalones', etiqueta: 'Cajeros y ventanillas nacionales',
          escalones: [[0.01, 5.13], [100.01, 10.27], [200.01, 15.40], [300.01, 20.54], [500.01, 25.67], [700.01, 30.81], [1000.01, 35.94]],
          otrosCanales: { etiqueta: 'Cajeros internacionales', escalones: [[0.01, 8.21], [100.01, 16.43], [200.01, 24.64], [300.01, 32.86], [500.01, 41.07], [700.01, 49.29], [1000.01, 57.50]] },
        },
        costos: {
          rotativo: { texto: 'Pagas en tu fecha de pago (15 días después del corte) y no pasas al rotativo; su tarifario no publica una tasa separada para el rotativo',
            nota: 'Fechas de corte: el 17 o el 2 de cada mes (según tu tarjeta); la fecha de pago es 15 días después. Su tarifario publica una sola tasa para la tarjeta (15,15 % nominal · 16,25 % efectiva) y no separa corriente de rotativo ni explica cómo se calcula el pago mínimo: míralo en tu contrato y en tu estado de cuenta.' },
          diferido: { texto: '15,15 % nominal (16,25 % efectiva) a 3, 6, 9, 12, 18 o 36 meses',
            nota: 'No publica factores por plazo, así que la app calcula el interés con la tasa nominal y el plazo que elijas (cálculo de la app, no un valor del tarifario).' },
          tasa: { texto: '15,15 % nominal · 16,25 % efectiva anual',
            nota: 'De su tabla de tasas de interés de crédito (tarjeta de crédito Mastercard, de $300 a $20.000, de 3 a 36 meses). No dice si es la tasa que te cobran o un máximo: míralo en tu estado de cuenta. Está por debajo del techo que fija la Junta para consumo (16,77 % efectiva).' },
          mora: { texto: 'Recargo por mora de 5 %, 7 %, 9 % o 10 % sobre el pago mínimo vencido',
            nota: 'El porcentaje sube con los días de atraso; los tramos exactos están en su tarifario.' },
          mantenimiento: { texto: '$0,00',
            nota: 'Su tarifario pone el mantenimiento de la tarjeta de crédito, con pago mínimo y con pago total, entre los servicios y transacciones gratuitos; también la activación y el bloqueo, anulación o cancelación.' },
          avance: { texto: 'De $5,13 a $35,94 en cajeros y ventanillas del país, según el monto; de $8,21 a $57,50 en cajeros del exterior',
            nota: 'Dos tablas por canal. País: $0,01–$100 = $5,13 · $100,01–$200 = $10,27 · $200,01–$300 = $15,40 · $300,01–$500 = $20,54 · $500,01–$700 = $25,67 · $700,01–$1.000 = $30,81 · desde $1.000,01 = $35,94. Exterior: $8,21 · $16,43 · $24,64 · $32,86 · $41,07 · $49,29 · $57,50 en esos mismos rangos. Su tarifario aclara que el cargo aplica también cuando se hace el avance en cajeros de la cooperativa con una tarjeta de crédito de otra entidad. Los intereses del avance van aparte.' },
          cobranza: { texto: 'Para un vencido de más de $1.000: $10,21 (1 a 30 días) · $33,10 (31 a 60) · $39,11 (61 a 90) · $50,59 (más de 90), con IVA',
            nota: 'Su tabla es por monto vencido y días de atraso; en el texto que registré leí completa solo la fila de más de $1.000: $8,88 · $28,78 · $34,01 · $43,99, sin IVA (con IVA ×1,15: cálculo de la app). Los otros montos están en su tarifario y no los transcribí.' },
          emision: { texto: '$5,03 por emisión del plástico con chip (la renovación cuesta igual)',
            nota: '$4,37 + IVA. Su tarifario lista la emisión de plástico de tarjeta de crédito con chip y la renovación de plástico de tarjeta de crédito con chip.' },
          reposicion: { texto: '$5,03 por pérdida, robo o deterioro físico', nota: 'Es el mismo valor que la emisión; su tarifario excluye los casos que indica en la nota de ese servicio.' },
          recompensas: { texto: 'Plan de recompensas anual con cargo según tu segmento; su tarifario no dice qué tarjeta lleva cada segmento',
            nota: 'La fila que alcancé a leer completa es el Segmento E+: $5,00. Los demás segmentos y los puntos que da cada uno están en su tarifario.' },
          voucher: { texto: '$2,06 del país · $8,93 del exterior', nota: 'Copia de voucher o vale. En el país: $1,79 + IVA. Del exterior su tabla solo trae $8,93.' },
          estado: { texto: 'Estado de cuenta a domicilio $1,91 · copia $0,52', nota: 'Entrega a domicilio: $1,66 + IVA. Copia: $0,45 + IVA.' },
          gasolinera: { texto: '$0,23 por consumo', nota: '$0,20 + IVA, en consumos con tarjeta de crédito o débito.' },
        },
      },

      {
        // QUINTA COOPERATIVA. Su sitio tiene una página «Tarjeta de Crédito» (https://mushucruna.com/tarjeta-de-credito-n3/) pero sin texto con tasas ni costos (la página solo trae el menú y el pie),
        // y su documento de costos financieros de julio 2026 (https://mushucruna.com/wp-content/uploads/COSTOS-FINANCIEROS-JULIO-2026.pdf) es una imagen escaneada de 1 página: no se pudo leer como texto desde aquí y NO se transcribe nada de memoria.
        // Por eso queda registrada con su logo y un aviso, sin ninguna cifra (todo «sin dato»): la persona anota sus valores o los pide en una agencia. Su tabla de costos tiene fecha de julio 2026: puede estar desactualizada.
        // Su logo oficial (PNG de su sitio, «Logo-H-Mushuc-Runa.png») es rojo y verde sobre fondo transparente: va sobre fondo claro. La red de la tarjeta no consta: no se asume.
        id: 'ec-mushucruna', pais: 'EC', tipo: 'cooperativa', nombre: 'Cooperativa Mushuc Runa', corto: 'Mushuc Runa',
        fuente: { texto: 'Página de la tarjeta de crédito de Mushuc Runa y su documento de costos financieros de julio 2026 (imagen escaneada, no leída)', vigencia: 'julio 2026',
          url: 'https://mushucruna.com/tarjeta-de-credito-n3/' },
        tarifarioUrl: 'https://mushucruna.com/wp-content/uploads/COSTOS-FINANCIEROS-JULIO-2026.pdf',
        aviso: 'La cooperativa tiene una página de tarjeta de crédito, pero no pude leer sus tasas ni sus costos (su tabla de costos de julio 2026 es una imagen): pídelos en una agencia o anótalos de tu contrato y estado de cuenta.',
        costos: sinDatos,
      },

      {
        // SEXTA COOPERATIVA. «Tarifario tarjeta de crédito» de OSCUS (Latacunga), «información actualizada a octubre 2026» (código GCM.TDC.RGO.004, rev. 06), publicado en su sitio en
        // Transparencia → Tarifarios de la Cooperativa (https://oscus.coop/dashboard/tarifarios-cooperativa). El PDF vive en el almacenamiento de Google que usa su propio sitio.
        // Detalle que se avisa: el pie del mismo PDF dice «Ref: 02/Julio/2024» (es la referencia del formulario; el encabezado dice octubre 2026).
        // Su sitio ofrece OSCUS Mastercard en tres niveles (Standard, Gold y Black); el tarifario es uno solo y no separa costos por nivel.
        // Sus avances y varios servicios vienen SIN IVA («se le agregará el 15 % correspondiente al IVA»): la app los muestra con IVA (valor × 1,15, cálculo de la app, redondeado al centavo).
        // Sí trae factores de diferido y fechas de corte y de pago; NO trae recompensas ni una tasa propia del rotativo. Su logo oficial (PNG de su sitio) va sobre fondo claro.
        id: 'ec-oscus', pais: 'EC', tipo: 'cooperativa', nombre: 'Cooperativa OSCUS', corto: 'OSCUS', redes: ['Mastercard'],
        niveles: ['Standard', 'Gold', 'Black'],
        fuente: { texto: 'Tarifario de tarjeta de crédito de OSCUS (información actualizada a octubre 2026) y la página de sus tarjetas', vigencia: 'octubre 2026',
          url: 'https://oscus.coop/dashboard/tarifarios-cooperativa' },
        tarifarioUrl: 'https://oscus.coop/dashboard/tarifarios-cooperativa',
        tasaPublicada: { efectivaAnual: 15.79, nominalAnual: 14.75, aplicaA: 'crédito diferido de la tarjeta (todos los plazos); su tarifario no da otra tasa para el rotativo' },
        // Avance: dos tablas por rango (valores del tarifario sin IVA × 1,15): cajero automático del país y ventanilla del país.
        avance: {
          tipo: 'escalones', etiqueta: 'Cajero automático del país',
          escalones: [[0.01, 4.52], [100.01, 9.04], [200.01, 10.84], [300.01, 13.56], [400.01, 16.26], [500.01, 18.98]],
          otrosCanales: { etiqueta: 'Ventanilla del país', escalones: [[0.01, 18.01], [500.01, 27.03], [1000.01, 36.03], [1500.01, 45.03], [2000.01, 54.04], [3000.01, 63.05]] },
        },
        costos: {
          rotativo: { texto: 'Sin interés si pagas el total de tus consumos hasta el 15 del mes (corte a fin de mes); el interés corre desde que pagas solo el mínimo y pasas al rotativo',
            nota: 'Su tarifario dice: «No se aplica cargo de interés si cancela el pago total de consumos hasta la fecha máxima de pago» y «se aplica cargo desde cuando se acoge al crédito rotativo y pagos mínimos». Fecha de corte: fin de mes. Fecha tope de pago: 15 de cada mes. No publica una tasa propia del rotativo ni explica cómo se calcula el pago mínimo.' },
          diferido: { texto: '14,75 % nominal (15,79 % efectiva) con factor por plazo: 3 meses 2,47 % · 6 meses 4,35 % · 9 meses 6,25 % · 12 meses 8,17 % · 18 meses 12,08 % · 24 meses 16,08 % · 36 meses 24,35 %',
            nota: 'El factor sirve para estimar el interés total sobre el monto diferido (por ejemplo, $1.000 a 12 meses ≈ $81,70 de interés; cálculo de la app). La tasa es la misma para todos los plazos.' },
          tasa: { texto: '14,75 % nominal · 15,79 % efectiva anual (diferido)',
            nota: 'Es la que publica su tarifario para el crédito diferido; no dice si es un máximo. Las dos son coherentes entre sí (capitalización mensual) y están por debajo del techo de la Junta para consumo (16,77 % efectiva).' },
          mora: { texto: 'Recargo por morosidad: 1,05 % (1 a 15 días) · 1,07 % (16 a 30) · 1,09 % (31 a 60) · 1,10 % (más de 60 días)',
            nota: 'Su tarifario lo titula «Tasa de mora» y «recargo por morosidad»; no dice sobre qué valor se aplica ni cada cuánto. Con 0 días de mora es 0 %. Confírmalo con la cooperativa.' },
          mantenimiento: { texto: '$0,00',
            nota: 'Mantenimiento de la tarjeta de crédito, pago de la tarjeta, bloqueo, anulación o cancelación, frecuencia de transacciones, activación, atención de reclamos y estados de cuenta electrónicos: $0,00.' },
          avance: { texto: 'Cajero del país: de $4,52 a $18,98 según el monto · Ventanilla del país: de $18,01 a $63,05 según el monto (con IVA)',
            nota: 'Su tarifario publica los valores sin IVA y dice que se les suma el 15 %; aquí van con IVA (cálculo de la app). Cajero: $1–100 = $4,52 · $101–200 = $9,04 · $201–300 = $10,84 · $301–400 = $13,56 · $401–500 = $16,26 · desde $501 = $18,98. Ventanilla: $1–500 = $18,01 · $501–1.000 = $27,03 · $1.001–1.500 = $36,03 · $1.501–2.000 = $45,03 · $2.001–3.000 = $54,04 · desde $3.001 = $63,05. Su tabla corta los rangos en enteros (por ejemplo $100 y $101): la app toma el siguiente rango desde un centavo más. Cupos: avance en cajero del país desde $10 hasta $800 por día, hasta cuatro transacciones, y hasta $1.500 al mes según el cupo; avance en ventanilla desde $300 hasta el 80 % del cupo disponible (la tabla del PDF viene desordenada: confírmalo en el original). Los intereses del avance van aparte.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'Su tabla trae los valores sin IVA y dice que se les agrega el 15 %; aquí van ya con IVA (valor × 1,15, cálculo de la app). Por monto vencido (menos de $100 · $100–199 · $200–299 · $300–499 · $500–999 · más de $1.000) y días de atraso. 1 a 30 días: $7,34 · $8,45 · $9,11 · $9,57 · $9,92 · $10,21. 31 a 60 días: $18,66 · $18,93 · $20,50 · $23,39 · $27,59 · $33,10. 61 a 90 días: $26,65 · $27,43 · $29,06 · $31,54 · $34,89 · $39,11. Más de 90 días: $29,39 · $30,64 · $33,38 · $37,63 · $43,36 · $50,59. Son tarifas máximas. Para $100–199 y más de 90 días ella publica $26,64 (= $30,64), no $26,54 como JEP.' },
          uso: { texto: '$1,96 por consumos de más de $100 en el exterior',
            nota: 'Con IVA ($1,70 + $0,26). Consulta impresa de saldos en cajero: $0,36; consulta en cajeros del exterior: $1,02; consumo en gasolinera nacional: $0,23.' },
          emision: { texto: '$5,03 por emisión del plástico con chip (la renovación cuesta igual)',
            nota: '$4,37 + IVA. Vigencia del plástico: 3 años. Tarjetas adicionales pedidas por el titular: máximo 6.' },
          reposicion: { texto: '$5,03 por pérdida, robo o deterioro físico (con chip)', nota: 'Por migración, actualización o fallas de la banda lectora o del chip: $0,00. Excepción: fallos del chip.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior', nota: 'Copia de voucher o vale (con IVA).' },
          estado: { texto: 'Estado de cuenta electrónico $0,00 · copia $0,52', nota: 'Corte impreso de movimientos en oficina: $1,87. Referencias financieras: $2,59. Su tarifario no trae un precio para el estado de cuenta a domicilio.' },
          pagoTarjeta: { texto: '$0,00 el pago de la tarjeta de crédito', nota: 'Cheque devuelto nacional: $2,86; del exterior: $3,32.' },
          gasolinera: { texto: '$0,23 por consumo nacional' },
        },
      },

      {
        // SÉPTIMA COOPERATIVA. Su sitio ofrece «Tarjetas de Crédito VISA Andalucía» en tres niveles (Gold, Platinum y Signature) y el programa «Andalucía My Rewards» (https://www.andalucia.fin.ec/tarjetas-visa.php).
        // Su tarifario de noviembre 2026 («Tarifario de tasas y costos de servicios», versión del 1 de noviembre de 2026) está en una página hecha con Canva enlazada desde su sección «Andalucía Transparente»
        // (https://tasasycostosandalucia.my.canva.site/tarjeta). Sus tablas son imágenes: desde aquí solo se pudo leer el título de la sección, así que NO se transcribe ninguna cifra y todo queda «sin dato».
        // Su logo oficial (img/logoandablue.png de su sitio) es azul sobre fondo transparente: va sobre fondo claro.
        id: 'ec-andalucia', pais: 'EC', tipo: 'cooperativa', nombre: 'Cooperativa Andalucía', corto: 'Andalucía', redes: ['Visa'],
        niveles: ['Gold', 'Platinum', 'Signature'],
        fuente: { texto: 'Tarifario de tasas y costos de la Cooperativa Andalucía (noviembre 2026; sus tablas son imágenes, no leídas) y la página de sus tarjetas de crédito Visa', vigencia: 'noviembre 2026',
          url: 'https://www.andalucia.fin.ec/tarjetas-visa.php' },
        tarifarioUrl: 'https://tasasycostosandalucia.my.canva.site/tarjeta',
        aviso: 'La cooperativa tiene tarjetas de crédito Visa (Gold, Platinum y Signature) y publica su tarifario de noviembre 2026, pero en imágenes que no pude leer con certeza: abre el enlace de su tarifario o anota los valores de tu contrato y estado de cuenta.',
        costos: sinDatos,
      },

      /* -------------------------------------------------------- Otros países: solo nombres */
      { id: 'co-bancolombia', pais: 'CO', nombre: 'Bancolombia', corto: 'Bancolombia', costos: sinDatos },
      { id: 'co-davivienda', pais: 'CO', nombre: 'Davivienda', corto: 'Davivienda', costos: sinDatos },
      { id: 'co-bogota', pais: 'CO', nombre: 'Banco de Bogotá', corto: 'Bogotá', costos: sinDatos },
      { id: 'co-bbva', pais: 'CO', nombre: 'BBVA', corto: 'BBVA', costos: sinDatos },
      { id: 'pe-bcp', pais: 'PE', nombre: 'BCP', corto: 'BCP', costos: sinDatos },
      { id: 'pe-interbank', pais: 'PE', nombre: 'Interbank', corto: 'Interbank', costos: sinDatos },
      { id: 'pe-bbva', pais: 'PE', nombre: 'BBVA', corto: 'BBVA', costos: sinDatos },
      { id: 'pe-scotiabank', pais: 'PE', nombre: 'Scotiabank', corto: 'Scotiabank', costos: sinDatos },
      { id: 'mx-bbva', pais: 'MX', nombre: 'BBVA', corto: 'BBVA', costos: sinDatos },
      { id: 'mx-banorte', pais: 'MX', nombre: 'Banorte', corto: 'Banorte', costos: sinDatos },
      { id: 'mx-santander', pais: 'MX', nombre: 'Santander', corto: 'Santander', costos: sinDatos },
      { id: 'mx-citibanamex', pais: 'MX', nombre: 'Citibanamex', corto: 'Citibanamex', costos: sinDatos },
      { id: 'es-santander', pais: 'ES', nombre: 'Santander', corto: 'Santander', costos: sinDatos },
      { id: 'es-bbva', pais: 'ES', nombre: 'BBVA', corto: 'BBVA', costos: sinDatos },
      { id: 'es-caixabank', pais: 'ES', nombre: 'CaixaBank', corto: 'CaixaBank', costos: sinDatos },
      { id: 'es-sabadell', pais: 'ES', nombre: 'Sabadell', corto: 'Sabadell', costos: sinDatos },
      { id: 'us-chase', pais: 'US', nombre: 'Chase', corto: 'Chase', costos: sinDatos },
      { id: 'us-bofa', pais: 'US', nombre: 'Bank of America', corto: 'BofA', costos: sinDatos },
      { id: 'us-citi', pais: 'US', nombre: 'Citi', corto: 'Citi', costos: sinDatos },
      { id: 'us-wells', pais: 'US', nombre: 'Wells Fargo', corto: 'Wells Fargo', costos: sinDatos },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = AF.CATALOGO_BANCOS;
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/bancos.js ===== */
/* Bancos y costos de tarjetas: busca en el catálogo (bancos-datos.js), calcula el costo de un avance y convierte tasas.
   REGLA: aquí no se escribe ninguna cifra de un banco. Todo sale del catálogo, con su fuente y vigencia, o queda "sin dato". */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const base = () => AF.CATALOGO_BANCOS || (typeof require === 'function' ? require('./bancos-datos.js') : { bancos: [], techoLegal: {} });
  const r2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;
  const PLANT = () => (AF.PLAN && AF.PLAN.tarjetas) || {};

  let activo = null;                        // catálogo mezclado con el remoto (si lo hay)
  const catalogo = () => activo || base();

  /* ----------------------------------------------------------------- consulta */
  const lista = (pais) => catalogo().bancos.filter((b) => b.pais === pais);
  const buscar = (id) => (id ? catalogo().bancos.find((b) => b.id === id) || null : null);
  const tieneCostos = (b) => !!(b && b.costos && Object.keys(b.costos).length);

  // "Banco Pichincha" → "Pi"; "Diners Club" → "DC"; "BCP" → "BC"
  function iniciales(texto) {
    const p = String(texto || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    if (p.length === 1) return p[0].slice(0, 2).replace(/^./, (c) => c.toUpperCase());
    return (p[0][0] + p[1][0]).toUpperCase();
  }

  const redesDe = (b) => (b && b.redes && b.redes.length ? b.redes : PLANT().redes || []);
  const nivelesDe = (b) => (b && b.niveles && b.niveles.length ? b.niveles : PLANT().niveles || []);

  /* -------------------------------------------------------------------- tasas */
  // Los bancos publican la tasa EFECTIVA anual; la app calcula con la NOMINAL (cuota = tasa/12).
  const efectivaANominal = (ef) => r2(12 * (Math.pow(1 + ef / 100, 1 / 12) - 1) * 100);
  const nominalAEfectiva = (nom) => r2((Math.pow(1 + nom / 100 / 12, 12) - 1) * 100);

  // Qué tasa se le puede ofrecer a la persona como punto de partida (nunca se guarda sola).
  function tasaSugerida(b, pais) {
    if (b && b.tasaPublicada) {
      const t = b.tasaPublicada;
      const nominal = t.nominalAnual != null ? t.nominalAnual : efectivaANominal(t.efectivaAnual);
      return { nominal, efectiva: t.efectivaAnual, delBanco: true, aplicaA: t.aplicaA || '', vigencia: b.fuente && b.fuente.vigencia, fuente: b.fuente && b.fuente.texto };
    }
    const tl = catalogo().techoLegal && catalogo().techoLegal[pais];
    if (tl) return { nominal: efectivaANominal(tl.efectivaAnual), efectiva: tl.efectivaAnual, delBanco: false, aplicaA: tl.etiqueta, vigencia: tl.vigencia, fuente: tl.fuente };
    return null;
  }

  /* ------------------------------------------------------------------- avance */
  // Costo (con IVA) de sacar `monto` en efectivo con la tarjeta, o null si el banco no publicó cómo se calcula.
  // `canal`: sin indicar = la tabla principal (cajero); 'otros' (o un número) = otra tabla que el banco publicó (oficina, banca virtual, corresponsal…).
  // `otrosCanales` puede ser una tabla o una lista de tablas.
  const otrasTablas = (a) => (!a || !a.otrosCanales ? [] : Array.isArray(a.otrosCanales) ? a.otrosCanales : [a.otrosCanales]);
  function costoAvance(b, monto, canal) {
    let a = b && b.avance; const m = Number(monto);
    if (a && canal != null) a = otrasTablas(a)[canal === 'otros' ? 0 : Number(canal)] || null;
    if (!a || !(m > 0)) return null;
    // `maxUsd`: hasta qué monto el banco publicó la tabla (más allá no se inventa un valor).
    if (a.maxUsd != null && m > a.maxUsd) return null;
    if (a.tipo === 'porCada100') {
      const tramos = Math.ceil(m / 100);
      const tope = a.topeBaseUsd != null ? a.topeBaseUsd : Infinity;
      return r2(Math.min(tramos * a.baseUsd, tope) * (1 + (a.ivaPct || 0) / 100));
    }
    if (a.escalones) {
      let v = null;
      for (const [desde, valor] of a.escalones) { if (m >= desde) v = valor; else break; }
      return v;
    }
    return null;
  }
  // Todas las formas de sacar el avance que el banco publicó: [{ etiqueta, valor }] (o { etiqueta, texto } si el monto pasa de lo publicado).
  function costosAvance(b, monto) {
    const a = b && b.avance; if (!a) return [];
    const out = [], m = Number(monto), otras = otrasTablas(a);
    // Si el monto pasa de lo que el banco publicó para ese canal, se muestra su aviso (texto del propio banco) en vez de un valor inventado.
    const aviso = (t) => (t && t.maxUsd != null && m > t.maxUsd && t.aviso ? t.aviso : null);
    const v1 = costoAvance(b, monto), l1 = otras.length ? (a.etiqueta || 'Cajero automático') : 'Comisión';
    if (v1 != null) out.push({ etiqueta: l1, valor: v1 }); else if (aviso(a)) out.push({ etiqueta: l1, texto: aviso(a) });
    otras.forEach((t, i) => {
      const v = costoAvance(b, monto, i);
      if (v != null) out.push({ etiqueta: t.etiqueta, valor: v }); else if (aviso(t)) out.push({ etiqueta: t.etiqueta, texto: aviso(t) });
    });
    return out;
  }

  /* -------------------------------------------------------------------- filas */
  // Lo que se le muestra a la persona en «Costos de tu tarjeta»: el orden y los nombres salen de PLAN.tarjetas.costos.
  // `propios` = lo que la persona anotó ella misma ({ clave: { texto, fecha } }); manda sobre el catálogo.
  function filas(b, nivel, propios) {
    const defs = PLANT().costos || [];
    const cat = (b && b.costos) || {};
    const porNivel = b && b.recompensasPorNivel && nivel ? b.recompensasPorNivel[nivel] : null;
    const fu = b && b.fuente ? { texto: b.fuente.texto, vigencia: b.fuente.vigencia, url: b.fuente.url } : null;
    return defs.map((d) => {
      let v = cat[d.clave] || null;
      if (d.clave === 'recompensas' && porNivel) v = { texto: porNivel, nota: 'Según el segmento de tu tarjeta en el tarifario.' };
      const p = propios && propios[d.clave];
      if (p && p.texto) return { clave: d.clave, etiqueta: d.etiqueta, icono: d.icono, texto: p.texto, nota: 'Lo anotaste tú' + (p.fecha ? ' el ' + p.fecha : '') + '.', propio: true, fuente: null };
      return { clave: d.clave, etiqueta: d.etiqueta, icono: d.icono, texto: v ? v.texto : null, nota: v ? v.nota || '' : '', propio: false, fuente: v ? fu : null };
    });
  }

  /* ----------------------------------------------------------- catálogo remoto */
  // Un archivo remoto solo se acepta si tiene la forma esperada; cada banco reemplaza al local con el mismo id.
  function validar(j) {
    if (!j || typeof j !== 'object' || typeof j.version !== 'number' || !Array.isArray(j.bancos)) return false;
    return j.bancos.every((b) => b && typeof b.id === 'string' && typeof b.pais === 'string' && typeof b.nombre === 'string' && b.id.length < 60 && b.nombre.length < 80);
  }
  function fusionar(remoto) {
    if (!validar(remoto)) return false;
    const b0 = base();
    const mapa = new Map(b0.bancos.map((b) => [b.id, b]));
    remoto.bancos.forEach((b) => mapa.set(b.id, b));
    activo = { version: remoto.version, actualizado: remoto.actualizado || b0.actualizado, techoLegal: Object.assign({}, b0.techoLegal, remoto.techoLegal || {}), bancos: Array.from(mapa.values()) };
    return true;
  }
  const CLAVE_CACHE = 'af.catalogo.remoto';
  function cargarCache() {
    try { const t = g.localStorage && g.localStorage.getItem(CLAVE_CACHE); if (t) return fusionar(JSON.parse(t)); } catch (e) { /* sin caché */ }
    return false;
  }
  // Se llama al abrir la app. Si PLAN.remoto.urlTarifas está vacío no hace nada. Falla en silencio: la app sigue con lo que trae.
  async function actualizarRemoto() {
    const R = AF.PLAN && AF.PLAN.remoto;
    if (!R || !R.urlTarifas || typeof fetch !== 'function') return { usado: false };
    try {
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      const t = ctl ? setTimeout(() => ctl.abort(), 8000) : null;
      const resp = await fetch(R.urlTarifas, { cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (t) clearTimeout(t);
      if (!resp.ok) return { usado: false };
      const j = await resp.json();
      if (!fusionar(j)) return { usado: false };
      try { g.localStorage && g.localStorage.setItem(CLAVE_CACHE, JSON.stringify(j)); } catch (e) { /* sin caché */ }
      return { usado: true, version: j.version };
    } catch (e) { return { usado: false }; }
  }

  AF.bancos = { catalogo, lista, buscar, tieneCostos, iniciales, redesDe, nivelesDe, efectivaANominal, nominalAEfectiva, tasaSugerida, costoAvance, costosAvance, filas, validar, fusionar, cargarCache, actualizarRemoto };
  if (typeof module === 'object' && module.exports) module.exports = AF.bancos;
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/tarjetas.js ===== */
/* Motor de tarjetas: corriente, diferido (con y sin intereses), rotativo. Cuotas, corte, vencimiento y deuda.
   REGLA: nunca se inventa una tasa. Si falta, el resultado trae faltaTasa/faltanDatos y la app la pide.
   Todos los valores son ESTIMADOS: el estado de cuenta del banco manda (botón "ajustar con mi estado de cuenta"). */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const U = AF.util;
  const r2 = U.r2;

  /* ------------------------------------------------------------ Matemática de cuotas */
  // Cuota fija (sistema francés). tasaAnual en % nominal anual (15.6 = 15,6 %). Mensual = tasa / 12.
  function cuotaFrancesa(monto, tasaAnual, n) {
    if (!n || n < 1) return null;
    const i = (tasaAnual || 0) / 100 / 12;
    if (i === 0) return r2(monto / n);
    return r2((monto * i) / (1 - Math.pow(1 + i, -n)));
  }
  // Tasa anual (%) que explica una cuota informada. null si la cuota no cubre ni el capital (cuota*n < monto).
  function tasaImplicita(monto, cuota, n) {
    if (!(monto > 0 && cuota > 0 && n > 0) || cuota * n < monto - 0.005) return null;
    if (Math.abs(cuota * n - monto) < 0.005) return 0;
    let lo = 0, hi = 5; // hasta 500 % mensual: de sobra
    for (let k = 0; k < 80; k++) {
      const mid = (lo + hi) / 2;
      const c = (monto * mid) / (1 - Math.pow(1 + mid, -n));
      if (c > cuota) hi = mid; else lo = mid;
    }
    return r2(((lo + hi) / 2) * 12 * 100);
  }

  /* ----------------------------------------------------------------------- Fechas de tarjeta */
  const diaEnMes = (y, m, dia) => Math.min(dia, new Date(y, m + 1, 0).getDate());
  // Primera fecha de corte >= desde
  function proximoCorte(tarjeta, desde) {
    const f = U.deISO(desde);
    let y = f.getFullYear(), m = f.getMonth();
    let c = U.iso(new Date(y, m, diaEnMes(y, m, tarjeta.diaCorte)));
    if (c < desde) { m++; c = U.iso(new Date(y, m, diaEnMes(y + Math.floor(m / 12), m % 12, tarjeta.diaCorte))); }
    return c;
  }
  // Fecha límite de pago del estado que cierra en "corte": el diaVencimiento siguiente al corte.
  function vencimientoDe(tarjeta, corte) {
    const f = U.deISO(corte);
    let y = f.getFullYear(), m = f.getMonth();
    let v = U.iso(new Date(y, m, diaEnMes(y, m, tarjeta.diaVencimiento)));
    if (v <= corte) { m++; v = U.iso(new Date(y + Math.floor(m / 12), m % 12, diaEnMes(y + Math.floor(m / 12), m % 12, tarjeta.diaVencimiento))); }
    return v;
  }
  const sumarCortes = (tarjeta, corte, k) => {
    const f = U.deISO(corte); let m = f.getMonth() + k, y = f.getFullYear() + Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return U.iso(new Date(y, m, diaEnMes(y, m, tarjeta.diaCorte)));
  };

  /* ------------------------------------------------------------------- Plan de una compra */
  // mov = { monto, fecha, credito: { modo, meses, cuota, interes, tasaAnual } }
  function planCompra(mov, tarjeta) {
    const cr = mov.credito || { modo: 'corriente' };
    const modo = cr.modo || 'corriente';
    const faltan = [];
    if (!(tarjeta && tarjeta.diaCorte && tarjeta.diaVencimiento)) faltan.push('fechas');
    const out = { modo, cuotas: [], total: mov.monto, interesTotal: 0, faltaTasa: false, informada: false, faltanDatos: faltan, avisos: [] };
    if (faltan.length) return out;
    const corte1 = proximoCorte(tarjeta, mov.fecha);
    const venceDe = (k) => vencimientoDe(tarjeta, sumarCortes(tarjeta, corte1, k));

    if (modo === 'corriente' || modo === 'rotativo') {
      out.cuotas = [{ n: 1, de: 1, monto: r2(mov.monto), interes: 0, capital: r2(mov.monto), vence: venceDe(0) }];
      if (modo === 'rotativo') out.avisos.push('Rotativo: lo que no pagues del total genera intereses. Pon la tasa de tu tarjeta para estimarlos.');
      return out;
    }
    // diferido
    let n = cr.meses || null;
    const sinInteres = cr.interes === false;
    const tasa = cr.tasaAnual != null ? cr.tasaAnual : (tarjeta.tasaAnual != null ? tarjeta.tasaAnual : null);
    if (!n && cr.cuota) { n = Math.round(mov.monto / cr.cuota); out.avisos.push('No dijiste el número de cuotas: se supone ' + n + '.'); }
    if (!n) { out.faltanDatos.push('meses'); return out; }

    let cuota = null, tasaUsada = 0;
    if (cr.cuota != null) {                                   // cuota informada por la persona: manda
      cuota = r2(cr.cuota); out.informada = true;
      const imp = tasaImplicita(mov.monto, cuota, n);
      if (imp == null) out.avisos.push('Revisa: ' + n + ' cuotas de ' + U.dinero(cuota) + ' suman ' + U.dinero(cuota * n) + ', menos que la compra de ' + U.dinero(mov.monto) + '.');
      else if (sinInteres && imp > 0.5) out.avisos.push('Dijiste sin intereses, pero ' + n + ' cuotas de ' + U.dinero(cuota) + ' suman ' + U.dinero(cuota * n) + ' para una compra de ' + U.dinero(mov.monto) + '. Revisa el valor.');
      else if (imp > 80) out.avisos.push('Esas cuotas implican una tasa de ' + imp + ' % anual. Revisa el valor.');
      tasaUsada = imp || 0;
    } else if (sinInteres) {
      cuota = r2(mov.monto / n);
    } else if (tasa == null) {
      out.faltaTasa = true; out.faltanDatos.push('tasa');
      return out;                                             // sin tasa no hay cuota: se le pide a la persona
    } else {
      cuota = cuotaFrancesa(mov.monto, tasa, n); tasaUsada = tasa;
    }
    // tabla: interés sobre saldo; la última cuota absorbe el redondeo
    let saldo = mov.monto; const i = tasaUsada / 100 / 12; let sumaCuotas = 0;
    for (let k = 1; k <= n; k++) {
      const interes = r2(saldo * i);
      let monto = cuota;
      let capital = r2(monto - interes);
      if (k === n) { capital = r2(saldo); monto = r2(capital + interes); }
      saldo = r2(saldo - capital);
      sumaCuotas += monto;
      out.cuotas.push({ n: k, de: n, monto, interes, capital, vence: venceDe(k - 1) });
    }
    out.total = r2(sumaCuotas);
    out.interesTotal = r2(sumaCuotas - mov.monto);
    return out;
  }

  /* --------------------------------------------------------------- Estado de una tarjeta */
  // movs: todos los movimientos. Se usan los de esta tarjeta (compras con cuenta 'tarjeta' y pagos 'pago_tarjeta').
  function estado(tarjeta, movs, hoy) {
    hoy = hoy || U.hoyISO();
    const faltanDatos = [];
    if (!(tarjeta.diaCorte && tarjeta.diaVencimiento)) faltanDatos.push('fechas');
    const compras = movs.filter((m) => m.tipo === 'gasto' && m.cuenta === 'tarjeta' && m.tarjetaId === tarjeta.id);
    const pagos = movs.filter((m) => m.tipo === 'pago_tarjeta' && m.tarjetaId === tarjeta.id);
    let todas = [], avisos = [], sinTasa = [];
    compras.forEach((c) => {
      const p = planCompra(c, tarjeta);
      p.avisos.forEach((a) => avisos.push(a));
      if (p.faltaTasa) sinTasa.push(c);
      p.cuotas.forEach((q) => todas.push(Object.assign({ compraId: c.id, desc: c.desc, cat: c.cat }, q)));
    });
    todas.sort((a, b) => (a.vence < b.vence ? -1 : a.vence > b.vence ? 1 : a.n - b.n));
    // pagos aplicados a las cuotas más antiguas primero
    let abono = r2(pagos.reduce((s, p) => s + p.monto, 0));
    todas.forEach((q) => {
      const aplica = Math.min(abono, q.monto);
      q.pagado = r2(aplica); q.pendiente = r2(q.monto - aplica); abono = r2(abono - aplica);
    });
    const pendientes = todas.filter((q) => q.pendiente > 0.004);
    const deudaTotal = r2(pendientes.reduce((s, q) => s + q.pendiente, 0));
    const capitalPendiente = r2(pendientes.reduce((s, q) => s + q.capital * (q.pendiente / q.monto), 0));
    // próximo vencimiento = la fecha más próxima con algo pendiente
    const prox = pendientes[0] || null;
    const proximoVence = prox ? prox.vence : null;
    const aPagarProximo = prox ? r2(pendientes.filter((q) => q.vence === proximoVence).reduce((s, q) => s + q.pendiente, 0)) : 0;
    const interesProximo = prox ? r2(pendientes.filter((q) => q.vence === proximoVence).reduce((s, q) => s + q.interes, 0)) : 0;
    const cuotasProximo = prox ? pendientes.filter((q) => q.vence === proximoVence) : [];
    const diferidasProximo = r2(cuotasProximo.filter((q) => q.de > 1).reduce((s, q) => s + q.pendiente, 0));
    const corriente = r2(aPagarProximo - diferidasProximo);
    let pagoMinimo = null;
    if (tarjeta.pagoMinimoPct != null) pagoMinimo = r2(Math.min(aPagarProximo, diferidasProximo + corriente * (tarjeta.pagoMinimoPct / 100)));
    const cupoUsado = capitalPendiente;
    const cupoDisponible = tarjeta.cupo != null ? r2(tarjeta.cupo - cupoUsado) : null;
    const siguienteCorte = tarjeta.diaCorte ? proximoCorte(tarjeta, hoy) : null;
    return {
      cuotas: todas, pendientes, deudaTotal, capitalPendiente, cupoUsado, cupoDisponible, proximoVence, aPagarProximo, interesProximo,
      diferidasProximo, pagoMinimo, siguienteCorte,
      diasParaVencer: proximoVence ? U.diasEntre(hoy, proximoVence) : null,
      diasParaCorte: siguienteCorte ? U.diasEntre(hoy, siguienteCorte) : null,
      faltanDatos, avisos, comprasSinTasa: sinTasa.length,
    };
  }

  // Compara pagar el mínimo o el total (solo si hay tasa y mínimo conocidos: nunca se inventan)
  function minimoVsTotal(tarjeta, est) {
    if (tarjeta.tasaAnual == null || est.pagoMinimo == null || !est.aPagarProximo) return null;
    const resto = r2(est.aPagarProximo - est.pagoMinimo);
    const interesMes = r2(resto * (tarjeta.tasaAnual / 100 / 12));
    return { pagarTotal: est.aPagarProximo, pagarMinimo: est.pagoMinimo, queda: resto, interesEstimadoMes: interesMes };
  }

  AF.tarjetas = { cuotaFrancesa, tasaImplicita, proximoCorte, vencimientoDe, planCompra, estado, minimoVsTotal };
  if (typeof module === 'object' && module.exports) module.exports = AF.tarjetas;
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/informes.js ===== */
/* Informes y respuestas: todo se calcula desde los datos (funciones puras: datos + fecha de hoy). */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const U = AF.util, PLAN = AF.PLAN;
  const r2 = U.r2;
  const $ = (n) => U.dinero(n);

  const catDe = (d, id) => (d.categorias || []).concat(PLAN.categorias).find((c) => c.id === id) || PLAN.categoria('otros');
  const enRango = (m, desde, hasta) => m.fecha >= desde && m.fecha <= hasta;

  /* ------------------------------------------------------------------------ Totales */
  function totales(d, desde, hasta) {
    let ingresos = 0, gastos = 0;
    const cat = {}, nec = { N: 0, G: 0, sin: 0 };
    d.movs.forEach((m) => {
      if (!enRango(m, desde, hasta)) return;
      if (m.tipo === 'ingreso') ingresos += m.monto;
      else if (m.tipo === 'gasto') {
        gastos += m.monto;
        cat[m.cat] = (cat[m.cat] || 0) + m.monto;
        const c = catDe(d, m.cat); const n = m.nec !== undefined ? m.nec : c.nec;
        nec[n === 'N' ? 'N' : n === 'G' ? 'G' : 'sin'] += m.monto;
      }
    });
    const lista = Object.entries(cat).map(([id, total]) => ({ id, total: r2(total), cat: catDe(d, id) })).sort((a, b) => b.total - a.total);
    lista.forEach((x) => { x.pct = gastos ? x.total / gastos : 0; });
    return { ingresos: r2(ingresos), gastos: r2(gastos), balance: r2(ingresos - gastos), porCategoria: lista, nec: { N: r2(nec.N), G: r2(nec.G), sin: r2(nec.sin) } };
  }
  function ingresosPorCategoria(d, desde, hasta) {
    const cat = {};
    d.movs.forEach((m) => { if (m.tipo === 'ingreso' && enRango(m, desde, hasta)) cat[m.cat] = (cat[m.cat] || 0) + m.monto; });
    return Object.entries(cat).map(([id, total]) => ({ id, total: r2(total), cat: catDe(d, id) })).sort((a, b) => b.total - a.total);
  }

  /* -------------------------------------------------------------------- Gastos hormiga */
  function hormiga(d, desde, hasta) {
    const max = PLAN.hormiga.montoMaximo;
    const prod = {};
    let total = 0, veces = 0;
    d.movs.forEach((m) => {
      if (m.tipo !== 'gasto' || !enRango(m, desde, hasta) || m.monto > max) return;
      const c = catDe(d, m.cat); if (!c.hormiga) return;
      const k = (m.desc || c.nombre).trim().toLowerCase();
      prod[k] = prod[k] || { nombre: m.desc || c.nombre, total: 0, veces: 0, icono: c.icono };
      prod[k].total += m.monto; prod[k].veces++; total += m.monto; veces++;
    });
    const dias = Math.max(1, U.diasEntre(desde, hasta < U.hoyISO() ? hasta : U.hoyISO()) + 1);
    return { total: r2(total), veces, porProducto: Object.values(prod).map((p) => Object.assign(p, { total: r2(p.total) })).sort((a, b) => b.total - a.total), alAnio: r2((total / dias) * 365) };
  }

  /* ---------------------------------------------------------- Ciclo de cobro y disponible */
  const ultimoDiaCobro = (hoy, dia) => {
    const f = U.deISO(hoy); const y = f.getFullYear(), m = f.getMonth();
    const cand = (yy, mm) => U.iso(new Date(yy, mm, Math.min(dia, new Date(yy, mm + 1, 0).getDate())));
    let c = cand(y, m);
    if (c > hoy) c = m === 0 ? cand(y - 1, 11) : cand(y, m - 1);
    return c;
  };
  function ciclo(d, hoy) {
    const dia = d.ajustes.diaCobro || 1;
    const inicio = ultimoDiaCobro(hoy, dia);
    const proximo = U.proximoDia(U.sumarDias(hoy, 1), dia);
    return { inicio, proximo, dias: Math.max(1, U.diasEntre(hoy, proximo)), diaCobro: dia };
  }

  function fijosPendientes(d, cic, hoy) {
    let total = 0; const lista = [];
    (d.pagosFijos || []).forEach((p) => {
      if (p.activo === false) return;
      const vence = U.proximoDia(cic.inicio, p.dia);
      if (vence >= cic.proximo) return;
      const pagado = d.movs.some((m) => m.pagoFijoId === p.id && m.fecha >= cic.inicio);
      if (!pagado) { total += p.monto; lista.push({ nombre: p.nombre, monto: p.monto, vence, atrasado: vence < hoy }); }
    });
    return { total: r2(total), lista };
  }

  // modo 'simple' (Gratis): ingresos − pagos fijos − gastos.  modo 'completo' (Pro): además cuotas de tarjeta y metas.
  function puedesGastarHoy(d, hoy, modo) {
    const cic = ciclo(d, hoy);
    const completo = modo === 'completo';
    let ingresos = 0, estimado = false;
    d.movs.forEach((m) => { if (m.tipo === 'ingreso' && enRango(m, cic.inicio, hoy)) ingresos += m.monto; });
    if (ingresos === 0 && d.ajustes.sueldo) { ingresos = d.ajustes.sueldo; estimado = true; }
    const cuenta = (m) => m.tipo === 'gasto' && (!completo || m.cuenta !== 'tarjeta');
    let antes = 0, hoyG = 0;
    d.movs.forEach((m) => { if (!cuenta(m)) return; if (enRango(m, cic.inicio, U.sumarDias(hoy, -1))) antes += m.monto; else if (m.fecha === hoy) hoyG += m.monto; });
    const fijos = fijosPendientes(d, cic, hoy);
    let cuotas = 0, metas = 0;
    if (completo) {
      (d.tarjetas || []).forEach((t) => {
        const e = AF.tarjetas.estado(t, d.movs, hoy);
        e.pendientes.forEach((q) => { if (q.vence < cic.proximo) cuotas += q.pendiente; });
      });
      // Lo que ya aportaste este ciclo es plata apartada (sale de lo disponible), y lo que falta para tu aporte mensual también.
      (d.metas || []).forEach((mt) => {
        const aportado = (mt.aportes || []).filter((a) => a.fecha >= cic.inicio).reduce((s, a) => s + a.monto, 0);
        metas += aportado + Math.max(0, (mt.aporteMensual || 0) - aportado);
      });
    }
    const disponible = r2(ingresos - antes - fijos.total - cuotas - metas);
    const porDia = r2(disponible / cic.dias);
    const hoyDisponible = r2(porDia - hoyG);
    return Object.assign({ ingresos: r2(ingresos), estimado, gastadoAntes: r2(antes), gastadoHoy: r2(hoyG), fijos: fijos.total, fijosLista: fijos.lista,
      cuotas: r2(cuotas), metas: r2(metas), disponible, porDia, hoyDisponible, resto: r2(disponible - hoyG), pasado: hoyDisponible < 0, modo: completo ? 'completo' : 'simple' }, cic);
  }

  /* ------------------------------------------------------------------------ Presupuestos */
  function presupuestos(d, hoy) {
    const desde = U.inicioMes(hoy), hasta = U.finMes(hoy);
    return (d.presupuestos || []).map((p) => {
      let gastado = 0;
      d.movs.forEach((m) => { if (m.tipo === 'gasto' && enRango(m, desde, hasta) && (!p.cat || m.cat === p.cat)) gastado += m.monto; });
      const pct = p.monto ? gastado / p.monto : 0;
      const nivel = pct >= PLAN.alertas.presupuestoDetenerDesde ? 'detente' : pct >= PLAN.alertas.presupuestoAvisoDesde ? 'aviso' : 'bien';
      return Object.assign({}, p, { gastado: r2(gastado), pct, nivel, queda: r2(p.monto - gastado), nombre: p.cat ? catDe(d, p.cat).nombre : 'Todos los gastos' });
    });
  }

  /* --------------------------------------------------------------------------- Alertas */
  function alertas(d, hoy, pro) {
    const out = [];
    presupuestos(d, hoy).forEach((p) => {
      if (p.nivel === 'detente') out.push({ tipo: 'presupuesto', nivel: 'alto', texto: 'Detente: llegaste al límite de ' + p.nombre.toLowerCase() + ' (' + $(p.monto) + ').', accion: 'movimientos' });
      else if (p.nivel === 'aviso') out.push({ tipo: 'presupuesto', nivel: 'medio', texto: 'Vas en ' + Math.round(p.pct * 100) + ' % del límite de ' + p.nombre.toLowerCase() + '. Te quedan ' + $(p.queda) + '.', accion: 'movimientos' });
    });
    (d.tarjetas || []).forEach((t) => {
      const e = AF.tarjetas.estado(t, d.movs, hoy);
      if (e.proximoVence && e.diasParaVencer != null && e.diasParaVencer <= Math.max.apply(null, PLAN.alertas.diasAntesVencimiento)) {
        out.push({ tipo: 'tarjeta', nivel: e.diasParaVencer <= 1 ? 'alto' : 'medio', texto: t.nombre + ' vence ' + (e.diasParaVencer <= 0 ? 'hoy' : e.diasParaVencer === 1 ? 'mañana' : 'en ' + e.diasParaVencer + ' días') + ': ' + $(e.aPagarProximo) + '.', accion: 'tarjetas' });
      }
    });
    (d.pagosFijos || []).forEach((p) => {
      if (p.activo === false) return;
      const cic = ciclo(d, hoy);
      const f = fijosPendientes(d, cic, hoy).lista.find((x) => x.nombre === p.nombre);
      if (f && f.atrasado) out.push({ tipo: 'fijo', nivel: 'alto', texto: p.nombre + ' está sin pagar (' + $(p.monto) + ').', accion: 'mas' });
      else if (f && U.diasEntre(hoy, f.vence) <= 3) out.push({ tipo: 'fijo', nivel: 'medio', texto: p.nombre + ' vence el ' + U.deISO(f.vence).getDate() + ': ' + $(p.monto) + '.', accion: 'mas' });
    });
    if (pro) {                                                  // predictivas (Pro): con acción
      const pg = puedesGastarHoy(d, hoy, 'completo');
      // Con pocos días de datos el ritmo no dice nada (un solo gasto grande lo dispara): se espera a tener una semana.
      const transcurridos = Math.max(1, U.diasEntre(pg.inicio, hoy));
      const ritmo = pg.gastadoAntes / transcurridos;
      const proyectado = ritmo * pg.dias;
      const falta = r2(proyectado - (pg.disponible - pg.gastadoHoy));
      if (transcurridos >= PLAN.alertas.diasMinimosPrediccion && pg.gastadoAntes > 0 && falta > 1) out.push({ tipo: 'prediccion', nivel: 'medio', pro: true, texto: 'Al ritmo actual te faltarán unos ' + $(Math.round(falta)) + ' antes de tu cobro.', accion: 'inicio' });
    }
    return out;
  }

  /* ------------------------------------------------------------------------------ SRI */
  function sri(d, anio) {
    const S = PLAN.sri;
    const desde = anio + '-01-01', hasta = anio + '-12-31';
    const porRubro = {}; let total = 0;
    d.movs.forEach((m) => {
      if (m.tipo !== 'gasto' || !enRango(m, desde, hasta)) return;
      const rubro = m.sri !== undefined ? m.sri : catDe(d, m.cat).sri;
      if (!rubro) return;
      porRubro[rubro] = (porRubro[rubro] || 0) + m.monto; total += m.monto;
    });
    const cargas = Math.min(5, d.ajustes.cargas || 0);
    const canastas = S.canastasPorCargas[cargas];
    const tope = r2(canastas * S.canastaBasica);
    const base = Math.min(total, tope);
    return {
      porRubro: Object.entries(porRubro).map(([k, v]) => ({ rubro: k, nombre: S.rubros[k] || k, total: r2(v) })).sort((a, b) => b.total - a.total),
      total: r2(total), cargas, canastas, tope, base: r2(base), rebaja: r2(base * S.porcentajeRebaja),
      rebajaMaxima: r2(S.canastasPorCargas[5] * S.canastaBasica * S.porcentajeRebaja), topeRubroConocido: S.topePorRubro != null,
    };
  }

  /* ------------------------------------------------------------------------ Series */
  function serieMensual(d, hoy, n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const ini = U.sumarMeses(U.inicioMes(hoy), -i);
      const t = totales(d, ini, U.finMes(ini));
      out.push({ mes: ini.slice(0, 7), etiqueta: U.MESES_CORTOS[U.deISO(ini).getMonth()], ingresos: t.ingresos, gastos: t.gastos });
    }
    return out;
  }

  /* --------------------------------------------------------------------- Exportar CSV */
  function csv(d, desde, hasta) {
    const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const filas = [['Fecha', 'Tipo', 'Monto', 'Categoría', 'Descripción', 'Cuenta', 'Necesario o gusto']];
    d.movs.filter((m) => (!desde || m.fecha >= desde) && (!hasta || m.fecha <= hasta)).sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).forEach((m) => {
      const c = catDe(d, m.cat);
      filas.push([m.fecha, m.tipo, String(m.monto).replace('.', ','), c.nombre, m.desc || '', m.cuenta === 'tarjeta' ? 'Tarjeta' : 'Efectivo', (m.nec !== undefined ? m.nec : c.nec) === 'N' ? 'Necesario' : (m.nec !== undefined ? m.nec : c.nec) === 'G' ? 'Gusto' : '']);
    });
    return '﻿' + filas.map((f) => f.map(esc).join(';')).join('\r\n');
  }

  /* ------------------------------------------------------- Resumen para compartir (sin montos) */
  // rango (opcional): { desde, hasta, etiqueta }; sin rango, el mes de «hoy».
  function resumenCompartir(d, hoy, rango) {
    const t = rango ? totales(d, rango.desde, rango.hasta) : totales(d, U.inicioMes(hoy), U.finMes(hoy));
    const nombre = rango ? rango.etiqueta : U.nombreMes(hoy);
    const lineas = ['Mi ' + nombre + ' con ' + PLAN.app.nombre];
    t.porCategoria.slice(0, 3).forEach((c) => lineas.push(c.cat.icono + ' ' + Math.round(c.pct * 100) + ' % en ' + c.cat.nombre.toLowerCase()));
    const totalNec = t.nec.N + t.nec.G + t.nec.sin;
    if (totalNec) lineas.push('Necesario ' + Math.round((t.nec.N / totalNec) * 100) + ' %, gustos ' + Math.round((t.nec.G / totalNec) * 100) + ' %');
    if (t.ingresos > 0) lineas.push('Me sobró ' + Math.max(0, Math.round(((t.ingresos - t.gastos) / t.ingresos) * 100)) + ' % de lo que gané');
    return lineas.join('\n');
  }

  /* ---------------------------------------------------------- Respuestas del botón único */
  // Devuelve { texto, voz, filas:[{icono, etiqueta, valor}], bloqueado?: funcion, ir?: pestaña }
  function responder(q, d, hoy, esPro) {
    const per = q.periodo || { desde: U.inicioMes(hoy), hasta: U.finMes(hoy), etiqueta: 'este mes' };
    const filasCat = (lista, n) => lista.slice(0, n || 8).map((x) => ({ icono: x.cat.icono, etiqueta: x.cat.nombre, valor: $(x.total) }));
    const quitaSimbolo = (t) => t.replace(/\$/g, '').replace(/−/g, 'menos ');
    const res = (texto, extra) => Object.assign({ texto, voz: texto.replace(/\$([\d.,]+)/g, (_, n) => n.replace(/\./g, '').replace(',', ' con ') + ' dólares') }, extra);
    const dinero = (v) => $(v);

    switch (q.tema) {
      case 'ingresos': {
        const t = totales(d, per.desde, per.hasta);
        if (!t.ingresos) return res('No tienes ingresos registrados ' + per.etiqueta + '.');
        const partes = ingresosPorCategoria(d, per.desde, per.hasta);
        const detalle = partes.length > 1 ? ' (' + partes.map((p) => dinero(p.total) + ' de ' + p.cat.nombre.toLowerCase()).join(' + ') + ')' : '';
        return res('Tus ingresos ' + per.etiqueta + ' son ' + dinero(t.ingresos) + detalle + '.', { filas: partes.map((p) => ({ icono: p.cat.icono, etiqueta: p.cat.nombre, valor: dinero(p.total) })) });
      }
      case 'gastos': {
        const t = totales(d, per.desde, per.hasta);
        if (q.cat) {
          const x = t.porCategoria.find((c) => c.id === q.cat);
          const nombre = catDe(d, q.cat).nombre.toLowerCase();
          return res(x ? 'En ' + nombre + ' gastaste ' + dinero(x.total) + ' ' + per.etiqueta + '.' : 'No tienes gastos en ' + nombre + ' ' + per.etiqueta + '.');
        }
        return res('Has gastado ' + dinero(t.gastos) + ' ' + per.etiqueta + '.', { filas: filasCat(t.porCategoria, 5) });
      }
      case 'desglose': {
        const t = totales(d, per.desde, per.hasta);
        if (!t.gastos) return res('No tienes gastos registrados ' + per.etiqueta + '.');
        return res('Gastos ' + per.etiqueta + ': ' + dinero(t.gastos) + ' en total.', { filas: filasCat(t.porCategoria, 12), grafica: 'categorias' });
      }
      case 'masgasto': {
        const t = totales(d, per.desde, per.hasta);
        if (!t.porCategoria.length) return res('Aún no tienes gastos ' + per.etiqueta + '.');
        const a = t.porCategoria[0];
        let extra = '';
        const ant = U.sumarMeses(U.inicioMes(per.desde), -1);
        const tp = totales(d, ant, U.finMes(ant)); const antes = tp.porCategoria.find((c) => c.id === a.id);
        if (antes && antes.total > 0 && per.clave === 'mes') { const dif = Math.round(((a.total - antes.total) / antes.total) * 100); extra = dif > 0 ? ' Subió ' + dif + ' % frente al mes pasado.' : dif < 0 ? ' Bajó ' + Math.abs(dif) + ' % frente al mes pasado.' : ''; }
        return res('Gastas más en ' + a.cat.nombre.toLowerCase() + ': ' + dinero(a.total) + ' (' + Math.round(a.pct * 100) + ' % de tus gastos).' + extra, { filas: filasCat(t.porCategoria, 5) });
      }
      case 'balance': {
        const t = totales(d, per.desde, per.hasta);
        return res('Ingresos ' + dinero(t.ingresos) + ', gastos ' + dinero(t.gastos) + '. Balance ' + dinero(t.balance) + ' ' + per.etiqueta + '.', { filas: [{ icono: '💼', etiqueta: 'Ingresos', valor: dinero(t.ingresos) }, { icono: '🧾', etiqueta: 'Gastos', valor: dinero(t.gastos) }, { icono: '⚖️', etiqueta: 'Balance', valor: dinero(t.balance) }] });
      }
      case 'necesario_gusto': {
        const t = totales(d, per.desde, per.hasta);
        const tot = t.nec.N + t.nec.G + t.nec.sin;
        if (!tot) return res('Aún no hay gastos ' + per.etiqueta + '.');
        return res('De tus gastos ' + per.etiqueta + ', ' + Math.round((t.nec.N / tot) * 100) + ' % es necesario (' + dinero(t.nec.N) + ') y ' + Math.round((t.nec.G / tot) * 100) + ' % es gusto (' + dinero(t.nec.G) + ').');
      }
      case 'hormiga': {
        const h = hormiga(d, per.desde, per.hasta);
        if (!h.veces) return res('No tienes gastos hormiga ' + per.etiqueta + '. Muy bien.');
        if (!esPro) return res('Tus gastos hormiga ' + per.etiqueta + ' suman ' + dinero(h.total) + ' en ' + h.veces + (h.veces === 1 ? ' compra pequeña' : ' compras pequeñas') + '.', { bloqueado: 'hormigaDetalle', gancho: 'Al año serían unos ' + dinero(h.alAnio) + '. Pro te muestra cuáles son y cuánto ahorrarías.' });
        return res('Gastos hormiga ' + per.etiqueta + ': ' + dinero(h.total) + ' en ' + h.veces + ' compras. Al ritmo actual serían unos ' + dinero(h.alAnio) + ' al año.', { filas: h.porProducto.slice(0, 6).map((p) => ({ icono: p.icono, etiqueta: p.nombre + ' (' + p.veces + ')', valor: dinero(p.total) })) });
      }
      case 'ahorro': {
        const t = totales(d, per.desde, per.hasta);
        return res(t.balance >= 0 ? 'Has ahorrado ' + dinero(t.balance) + ' ' + per.etiqueta + '.' : 'Gastaste ' + dinero(-t.balance) + ' más de lo que ganaste ' + per.etiqueta + '.');
      }
      case 'disponible': {
        const p = puedesGastarHoy(d, hoy, esPro ? 'completo' : 'simple');
        if (!p.ingresos) return res('Aún no tengo tus ingresos de este periodo. Registra tu sueldo y te digo cuánto puedes gastar.');
        return res(p.pasado ? 'Hoy ya te pasaste ' + dinero(-p.hoyDisponible) + ' de lo que podías gastar.' : 'Hoy puedes gastar ' + dinero(p.hoyDisponible) + '. Hasta tu cobro te quedan ' + dinero(p.resto) + ' en ' + p.dias + ' días.', { ir: 'inicio' });
      }
      case 'tarjeta': {
        const ts = d.tarjetas || [];
        if (!ts.length) return res('Aún no tienes tarjetas. Agrégala en la pestaña Tarjetas y te calculo lo que debes pagar.', { ir: 'tarjetas' });
        const lista = q.tarjetaId ? ts.filter((t) => t.id === q.tarjetaId) : ts;
        const filas = []; let total = 0; let masProx = null;
        lista.forEach((t) => {
          const e = AF.tarjetas.estado(t, d.movs, hoy);
          total += e.aPagarProximo;
          if (e.proximoVence && (!masProx || e.proximoVence < masProx)) masProx = e.proximoVence;
          filas.push({ icono: '💳', etiqueta: t.nombre + (e.proximoVence ? ' (vence ' + U.fechaCorta(e.proximoVence, hoy) + ')' : ''), valor: dinero(e.aPagarProximo) });
        });
        if (!total) return res('No debes pagar nada de ' + (lista.length === 1 ? lista[0].nombre : 'tus tarjetas') + ' por ahora.', { filas });
        return res('Debes pagar ' + dinero(total) + (masProx ? ' hasta el ' + U.deISO(masProx).getDate() + ' de ' + U.nombreMes(masProx) : '') + '. Es un estimado: ajústalo con tu estado de cuenta.', { filas, ir: 'tarjetas' });
      }
      case 'meconviene': {
        if (!esPro) {
          const p = puedesGastarHoy(d, hoy, 'simple');
          return res('Esta respuesta es de Pro.', { bloqueado: 'meConviene', gancho: q.monto ? 'Una compra de ' + dinero(q.monto) + ' es el ' + (p.disponible > 0 ? Math.round((q.monto / p.disponible) * 100) : 100) + ' % de lo que te queda hasta el cobro. Pro te dice si te conviene.' : 'Pro te dice si te alcanza sin descuadrar el mes.' });
        }
        if (!q.monto) return res('¿De cuánto es la compra? Dime el monto y te digo si te alcanza.');
        const p = puedesGastarHoy(d, hoy, 'completo');
        const queda = r2(p.resto - q.monto);
        if (queda >= 0) return res('Sí te alcanza: después de ' + dinero(q.monto) + ' te quedarían ' + dinero(queda) + ' hasta tu cobro, unos ' + dinero(Math.floor(queda / p.dias)) + ' por día.');
        return res('No te alcanza este periodo: te faltarían ' + dinero(-queda) + ' antes de tu cobro. Si la difieres, la cuota pesa menos; mira el simulador.');
      }
      default:
        return res('No entendí qué quieres saber. Prueba con «cuánto gasté este mes» o «desglósame mis gastos».');
    }
  }

  /* ------------------------------------------------- Pagos fijos, suscripciones, préstamos */
  // Estado de un pago fijo en el ciclo de cobro actual.
  function estadoFijo(d, p, hoy) {
    const cic = ciclo(d, hoy);
    const venceCiclo = U.proximoDia(cic.inicio, p.dia);
    const enCiclo = venceCiclo < cic.proximo;
    const pagado = enCiclo && d.movs.some((m) => m.pagoFijoId === p.id && m.fecha >= cic.inicio);
    const proxima = !enCiclo ? venceCiclo : pagado ? U.proximoDia(cic.proximo, p.dia) : venceCiclo;
    return { proxima, pagado, atrasado: enCiclo && !pagado && venceCiclo < hoy, diasPara: U.diasEntre(hoy, proxima) };
  }

  // Pagos que se repiten solos cada mes (mismo concepto, monto parecido, mismo día más o menos) y aún no están en «pagos fijos».
  function suscripcionesDetectadas(d, hoy) {
    const cfg = PLAN.suscripciones;
    const conocidas = new Set((d.pagosFijos || []).map((p) => U.norm(p.nombre)));
    const grupos = {};
    d.movs.forEach((m) => {
      if (m.tipo !== 'gasto' || m.monto <= PLAN.hormiga.montoMaximo) return;
      const c = catDe(d, m.cat);
      const nombre = (m.desc || (c.id === 'suscripciones' ? c.nombre : '')).trim();
      if (!nombre) return;
      const k = U.norm(nombre);
      (grupos[k] = grupos[k] || { nombre, cat: m.cat, porMes: {} }).porMes[m.fecha.slice(0, 7)] = m;
    });
    const mesAnterior = U.sumarMeses(U.inicioMes(hoy), -1).slice(0, 7);
    const out = [];
    Object.keys(grupos).forEach((k) => {
      if (conocidas.has(k)) return;
      const g = grupos[k];
      const meses = Object.keys(g.porMes).sort();
      // racha de meses seguidos que termina en el último mes con pago
      let run = [meses[meses.length - 1]];
      for (let i = meses.length - 2; i >= 0; i--) { if (U.sumarMeses(meses[i] + '-01', 1).slice(0, 7) === run[0]) run.unshift(meses[i]); else break; }
      if (run.length < cfg.minimoMeses || run[run.length - 1] < mesAnterior) return;       // se dejó de repetir
      const ms = run.map((x) => g.porMes[x]);
      const montos = ms.map((m) => m.monto).sort((a, b) => a - b), med = montos[Math.floor(montos.length / 2)];
      if (ms.some((m) => Math.abs(m.monto - med) > med * cfg.toleranciaMonto)) return;
      const dias = ms.map((m) => Number(m.fecha.slice(8)));
      if (Math.max.apply(null, dias) - Math.min.apply(null, dias) > cfg.toleranciaDias) return;
      const ult = ms[ms.length - 1];
      out.push({ nombre: g.nombre, monto: r2(ult.monto), dia: Number(ult.fecha.slice(8)), cat: g.cat, meses: run.length, ultima: ult.fecha });
    });
    return out.sort((a, b) => b.monto - a.monto);
  }

  // Cuánto falta por cobrar / pagar en un préstamo entre personas
  const pendientePrestamo = (p) => r2(Math.max(0, p.monto - (p.abonos || []).reduce((s, a) => s + a.monto, 0)));
  function prestamosResumen(d) {
    let meDeben = 0, debo = 0;
    (d.prestamos || []).forEach((p) => { if (p.pagado) return; const x = pendientePrestamo(p); if (p.direccion === 'me_deben') meDeben += x; else debo += x; });
    return { meDeben: r2(meDeben), debo: r2(debo) };
  }

  /* ---------------------------------------------------------------------------- Retos */
  // Reto «30 días sin gastos hormiga». La racha cuenta días completos desde el último gasto hormiga.
  function reto(d, hoy) {
    const r = (d.retos || []).find((x) => x.estado === 'activo');
    if (!r) return null;
    const meta = PLAN.reto.dias, max = PLAN.hormiga.montoMaximo;
    const fallas = new Set();
    d.movs.forEach((m) => { if (m.tipo === 'gasto' && m.fecha >= r.inicio && m.fecha <= hoy && m.monto <= max && catDe(d, m.cat).hormiga) fallas.add(m.fecha); });
    const ultima = Array.from(fallas).sort().pop() || null;
    const desde = ultima ? U.sumarDias(ultima, 1) : r.inicio;
    const racha = desde <= hoy ? U.diasEntre(desde, hoy) : 0;
    const antes = hormiga(d, U.sumarDias(r.inicio, -30), U.sumarDias(r.inicio, -1));
    const dias = [];
    for (let i = 0; i < meta; i++) { const f = U.sumarDias(desde, i); dias.push({ fecha: f, estado: f < hoy ? 'ok' : f === hoy ? (ultima === hoy ? 'falla' : 'hoy') : 'futuro' }); }
    return { id: r.id, inicio: r.inicio, meta, racha: Math.min(racha, meta), ultimaFalla: ultima, fallaHoy: ultima === hoy, fallos: fallas.size, completado: racha >= meta,
      ahorroEstimado: r2((antes.total / 30) * Math.min(racha, meta)), dias };
  }

  /* ----------------------------------------------------------------------- Conciliar */
  // Compara líneas de un estado de cuenta con lo registrado. Cada línea se une con a lo más un movimiento.
  // lineas: [{fecha, desc, monto}] (gastos). tarjetaId (opcional) limita a esa tarjeta y permite ver lo que «sobra».
  function conciliar(d, lineas, tarjetaId) {
    const tol = PLAN.conciliar;
    const usados = new Set();
    const candidatos = d.movs.filter((m) => m.tipo === 'gasto' && (!tarjetaId || (m.cuenta === 'tarjeta' && m.tarjetaId === tarjetaId)));
    const res = lineas.map((l) => {
      let mejor = null, mejorDif = 1e9;
      candidatos.forEach((m) => {
        if (usados.has(m.id) || Math.abs(m.monto - l.monto) > tol.toleranciaMonto) return;
        const dif = Math.abs(U.diasEntre(m.fecha, l.fecha));
        if (dif <= tol.toleranciaDias && dif < mejorDif) { mejor = m; mejorDif = dif; }
      });
      if (mejor) usados.add(mejor.id);
      return Object.assign({}, l, { estado: mejor ? 'ya' : 'falta', mov: mejor });
    });
    let sobran = [];
    if (tarjetaId && lineas.length) {
      const fechas = lineas.map((l) => l.fecha).sort(), desde = U.sumarDias(fechas[0], -tol.toleranciaDias), hasta = U.sumarDias(fechas[fechas.length - 1], tol.toleranciaDias);
      sobran = candidatos.filter((m) => !usados.has(m.id) && m.fecha >= desde && m.fecha <= hasta);
    }
    return { lineas: res, sobran, faltan: res.filter((x) => x.estado === 'falta').length, ya: res.filter((x) => x.estado === 'ya').length };
  }

  /* ---------------------------------------------------------- Aplicar una corrección */
  // Busca el movimiento al que se refiere: el último (o el último de una categoría).
  function objetivoDeCorreccion(d, objetivo) {
    const lista = d.movs.filter((m) => m.tipo !== 'pago_tarjeta' && (!objetivo || !objetivo.cat || m.cat === objetivo.cat));
    return lista.sort((a, b) => (b.fecha === a.fecha ? b.creado - a.creado : b.fecha < a.fecha ? -1 : 1))[0] || null;
  }

  AF.informes = { totales, ingresosPorCategoria, hormiga, ciclo, ultimoDiaCobro, puedesGastarHoy, presupuestos, alertas, sri, serieMensual, csv, resumenCompartir, responder, objetivoDeCorreccion, catDe,
    estadoFijo, suscripcionesDetectadas, pendientePrestamo, prestamosResumen, reto, conciliar };
  if (typeof module === 'object' && module.exports) module.exports = AF.informes;
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/lector.js ===== */
/* Lector: saca monto, fecha, comercio y tipo de lo que dice una factura (el texto de la foto) o un mensaje del banco.
   Es un lector de reglas, no adivina: lo que no encuentra queda vacío y la persona lo confirma antes de guardar. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const U = AF.util;

  const MESES_N = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MESES_ABR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const blancos = (m) => ' '.repeat(m.length);

  /* ------------------------------------------------------------------ montos */
  // Tapa lo que parece número pero no es plata: fechas, horas, series de factura, RUC, tarjetas, porcentajes.
  function enmascarar(t) {
    return t
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, blancos)
      .replace(/\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/g, blancos)
      .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, blancos)
      .replace(/\b\d{3}-\d{3}-\d{6,9}\b/g, blancos)
      .replace(/\b\d{1,2}\/\d{1,2}\b(?!\d)/g, blancos)                                   // 05/11 o cuota 3/6
      .replace(/(?:terminad[ao]s?\s+en|termina\s+en|tarjeta\s+(?:no\.?|n[°º])?)\s*[*xX•.\s]*\d{3,4}/gi, blancos)
      .replace(/[*xX•]{2,}\s*\d{2,4}/g, blancos)
      .replace(/\b\d{6,}\b/g, blancos)
      .replace(/\d+(?:[.,]\d+)?\s*%/g, blancos);
  }
  // [{ valor, simbolo, pos }] en el orden en que aparecen
  function montosEn(linea) {
    const t = enmascarar(linea), out = [];
    const re = /(\$|US\$|USD\s*)?\s*(-?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|-?\d+(?:[.,]\d{1,2})?)(?:\s*(USD|d[oó]lares))?/gi;
    let m;
    while ((m = re.exec(t))) {
      const crudo = m[2];
      const v = U.parseNumero(crudo);
      if (v == null || v === 0 && !/[.,]/.test(crudo)) continue;
      out.push({ valor: Math.abs(v), negativo: /^-/.test(crudo) || /^\(/.test(t.slice(Math.max(0, m.index - 1), m.index + 1)), simbolo: !!(m[1] || m[3]), decimales: /[.,]\d{1,2}$/.test(crudo), pos: m.index });
    }
    return out;
  }

  /* ------------------------------------------------------------------- fecha */
  function fecha(texto, hoy) {
    hoy = hoy || U.hoyISO();
    const y = Number(hoy.slice(0, 4));
    const valida = (a, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= new Date(a, m, 0).getDate();
    const iso = (a, m, d) => a + '-' + U.pad(m) + '-' + U.pad(d);
    let m = texto.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (m && valida(+m[1], +m[2], +m[3])) return iso(+m[1], +m[2], +m[3]);
    m = texto.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})\b/);
    if (m) {
      let d = +m[1], mo = +m[2]; const a = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      if (mo > 12 && d <= 12) { const t = d; d = mo; mo = t; }
      if (valida(a, mo, d)) return iso(a, mo, d);
    }
    const n = U.norm(texto);
    m = n.match(/\b(\d{1,2})\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.?(?:\s+(?:de(?:l)?\s+)?(\d{4}))?/);
    if (m) {
      const nombre = m[2] === 'setiembre' ? 'septiembre' : m[2];
      let mo = MESES_N.indexOf(nombre) + 1; if (!mo) mo = MESES_ABR.indexOf(nombre) + 1;
      let a = m[3] ? +m[3] : y;
      if (!m[3] && iso(a, mo, +m[1]) > U.sumarDias(hoy, 1)) a -= 1;
      if (valida(a, mo, +m[1])) return iso(a, mo, +m[1]);
    }
    m = texto.match(/\b(\d{1,2})\/(\d{1,2})\b(?!\/)/);                          // 05/11 sin año
    if (m && valida(y, +m[2], +m[1])) { let a = y; if (iso(a, +m[2], +m[1]) > U.sumarDias(hoy, 1)) a -= 1; return iso(a, +m[2], +m[1]); }
    return null;
  }

  // «JUAN PEREZ» → «Juan Perez»; «de», «del», «y»… quedan en minúscula; «s.a.» → «S.A.»
  const MENORES = new Set(['de', 'del', 'y', 'e', 'en', 'a']);
  const nombrePropio = (t) => String(t).toLowerCase().split(/\s+/).filter(Boolean).map((w, i) => (i > 0 && MENORES.has(w) ? w : /^(?:[a-z]\.){2,}$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');

  /* -------------------------------------------------------------------- tipo */
  const RE_INGRESO = /(deposito|depositaron|acredit|recibiste|has recibido|recibida|recibido|transferencia recibida|ingreso a tu cuenta|ingreso a su cuenta|abono a tu cuenta|abono en tu cuenta|nomina|sueldo|reembolso|devolucion|te pagaron|te enviaron|te transfirieron|pago recibido|credito a tu cuenta)/;
  const RE_GASTO = /(compra|consumo|pago|pagaste|debito|retiro|retiraste|cargo|enviaste|transferencia enviada|transferiste|compraste|debitado|debitaron|gastaste|consumiste|se realizo|transaccion)/;
  function tipoDe(texto) {
    const n = U.norm(texto);
    const i = RE_INGRESO.test(n), gg = RE_GASTO.test(n);
    if (i && !/(pago recibido|recibiste|recibida|recibido|deposito|acredit)/.test(n) && gg) return { tipo: 'gasto', duda: true };
    if (i) return { tipo: 'ingreso', duda: false };
    if (gg) return { tipo: 'gasto', duda: false };
    return { tipo: 'gasto', duda: true };
  }

  /* ---------------------------------------------------------------- comercio */
  const NO_COMERCIO = new Set(('banco pichincha pacifico guayaquil produbanco bolivariano internacional austro diners club visa mastercard master amex american express tarjeta usd ' +
    'transaccion notificacion alerta consumo compra pago retiro debito credito cuenta cta ahorros corriente cajero atm ref referencia aprobada autorizacion factura fecha hora ' +
    'estimado cliente le informa informamos se realizo por valor monto de en el la su con ec ecuador').split(' '));
  function comercio(texto) {
    const runs = texto.match(/[A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9&.'*\-]{1,}(?:\s+[A-ZÁÉÍÓÚÑ0-9&][A-ZÁÉÍÓÚÑ0-9&.'*\-]*){0,4}/g) || [];
    for (const r of runs) {
      const toks = r.split(/\s+/).filter((w) => !NO_COMERCIO.has(U.norm(w).replace(/[^a-z0-9]/g, '')) && !/^\d+([.,]\d+)?$/.test(w) && !/^[*x]+\d*$/i.test(w));
      const limpio = toks.join(' ').replace(/[.,;:*]+$/, '').trim();
      if (limpio.length >= 3 && /[A-ZÁÉÍÓÚÑ]{3}/.test(limpio)) return limpio;
    }
    const m = texto.match(/\ben\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9][A-Za-zÁÉÍÓÚÑáéíóúñ0-9 .&'\-]{2,30}?)(?=\s*(?:[.,;]|\bcon\b|\bel\b|\bla\b|\bpor\b|\bfecha\b|\btarjeta\b|$))/);
    return m ? m[1].trim() : '';
  }

  /* ---------------------------------------------------------------- categoría */
  function categoriaDe(texto, tipo, ctx) {
    const base = tipo === 'ingreso' ? 'otros_ingresos' : 'otros';
    if (!AF.parser || !ctx || !ctx.categorias) return { cat: base, conf: 'ninguna' };
    const palabras = U.norm(texto).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const c = AF.parser.clasificar(palabras, palabras.map((_, i) => i), tipo, { categorias: ctx.categorias, dicc: ctx.dicc || {} });
    return c.cat ? { cat: c.cat.id, conf: c.aprendido || c.score >= 2 ? 'alta' : 'media' } : { cat: base, conf: 'ninguna' };
  }

  /* ------------------------------------------------------------------ mensaje del banco */
  // Un mensaje (SMS, correo copiado, texto compartido). Devuelve { ok, tipo, monto, fecha, desc, cat, catConfianza, tarjeta4, duda:[] }
  function bancario(texto, ctx) {
    ctx = ctx || {};
    const hoy = ctx.hoy || U.hoyISO();
    const t = String(texto || '').replace(/\s+/g, ' ').trim();
    const ms = montosEn(t);
    const elegido = ms.find((x) => x.simbolo) || ms.find((x) => x.decimales) || null;
    const tp = tipoDe(t);
    const desc = comercio(t);
    const c = categoriaDe(desc || t, tp.tipo, ctx);
    const f = fecha(t, hoy);
    const t4 = (t.match(/(?:terminad[ao]s?\s+en|termina\s+en|tarjeta[^\d]{0,16}|[*xX•]{2,})\s*(\d{4})\b/i) || [])[1] || null;
    const duda = [];
    if (!elegido) duda.push('monto');
    if (tp.duda) duda.push('tipo');
    if (!f) duda.push('fecha');
    if (c.conf === 'ninguna') duda.push('categoria');
    return { ok: !!elegido, tipo: tp.tipo, monto: elegido ? U.r2(elegido.valor) : null, fecha: f || hoy, desc: desc ? nombrePropio(desc) : '', cat: c.cat, catConfianza: c.conf, tarjeta4: t4, duda };
  }
  // Un texto con varios mensajes (separados por línea en blanco) o varias líneas con fecha y monto.
  function bancarioVarios(texto, ctx) {
    const t = String(texto || '').trim();
    if (!t) return [];
    let trozos = t.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    if (trozos.length === 1) {
      const lineas = t.split(/\n/).map((x) => x.trim()).filter(Boolean);
      const conPlata = lineas.filter((l) => montosEn(l).length && fecha(l, (ctx && ctx.hoy) || U.hoyISO()));
      if (conPlata.length >= 2) trozos = conPlata;
    }
    return trozos.map((x) => Object.assign(bancario(x, ctx), { texto: x })).filter((x) => x.ok);
  }

  /* --------------------------------------------------------------------- factura */
  const ETIQUETAS = /(total|subtotal|sub total|iva|descuento|propina|efectivo|cambio|tarjeta|forma de pago|ice|base imponible|servicio|recibido|vuelto|saldo|cantidad|descripcion|precio|valor|p\.?\s*unit|cant)\b/;
  function factura(texto, ctx) {
    ctx = ctx || {};
    const hoy = ctx.hoy || U.hoyISO();
    const lineas = String(texto || '').split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const normales = lineas.map((l) => U.norm(l));
    const duda = [];

    /* total: la última línea que dice «total» (sin ser subtotal ni descuento) */
    let monto = null;
    for (let i = 0; i < lineas.length; i++) {
      const n = normales[i];
      if (!/^\W*(importe\s+)?(valor\s+)?(total|a pagar)(\s+a\s+pagar|\s+factura|\s+general|\s+usd)?\b/.test(n)) continue;
      if (/sub\s*total|descuento|sin\s+iva|sin\s+impuestos|total\s+iva|total\s+ice/.test(n)) continue;
      let ms = montosEn(lineas[i]);
      for (let k = 1; !ms.length && k <= 2 && i + k < lineas.length; k++) { const s = montosEn(lineas[i + k]); if (s.length && !/[a-z]{3}/.test(normales[i + k])) ms = s; }
      if (ms.length) monto = ms[ms.length - 1].valor;
    }
    if (monto == null) {
      const todos = [].concat(...lineas.map((l) => montosEn(l).filter((x) => x.decimales))).map((x) => x.valor);
      if (todos.length) { monto = Math.max.apply(null, todos); duda.push('monto'); }
    }

    /* fecha */
    const f = fecha(String(texto || ''), hoy);
    if (!f) duda.push('fecha');

    /* comercio: la primera línea que parece un nombre */
    let nombre = '';
    for (let i = 0; i < Math.min(lineas.length, 8); i++) {
      const l = lineas[i], n = normales[i];
      if (/factura|ruc|autorizacion|fecha|cliente|direccion|telefono|nota de venta|obligado|contribuyente|sucursal|matriz|r\.u\.c|ambiente|emision/.test(n)) continue;
      if (!/[a-z]{3}/.test(n) || /^\W*\d/.test(l)) continue;
      nombre = l.replace(/[^\wÁÉÍÓÚÑáéíóúñ&.' -]/g, '').trim(); break;
    }
    const ruc = (String(texto || '').match(/\b(\d{10}001)\b/) || [])[1] || null;

    /* productos: «cant descripción p.unit total» o «descripción total» */
    const items = [];
    lineas.forEach((l, i) => {
      const n = normales[i];
      let m = l.match(/^(\d+(?:[.,]\d+)?)\s+(.{3,}?)\s+\$?\s*(\d+[.,]\d{2,4})\s+\$?\s*(\d+[.,]\d{2})$/);
      if (m && !ETIQUETAS.test(U.norm(m[2]))) { items.push({ desc: m[2].trim(), monto: U.parseNumero(m[4]) }); return; }
      m = l.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ][^\d$]{2,40}?)\s+\$?\s*(\d+[.,]\d{2})$/);
      if (m && !ETIQUETAS.test(n)) items.push({ desc: m[1].trim(), monto: U.parseNumero(m[2]) });
    });
    const sumaItems = U.r2(items.reduce((s, x) => s + x.monto, 0));
    const itemsFiables = items.length >= 2 && monto != null && sumaItems > 0 && sumaItems <= monto * 1.2 + 0.01;   // si no cuadran con el total, no se ofrecen

    const base = categoriaDe(nombre, 'gasto', ctx);
    return { ok: monto != null && monto > 0, tipo: 'gasto', monto: monto != null ? U.r2(monto) : null, fecha: f || hoy, desc: nombre ? nombrePropio(nombre) : '', cat: base.cat, catConfianza: base.conf, ruc,
      items: itemsFiables ? items.map((x) => Object.assign(x, categoriaPorItem(x.desc, ctx))) : [], duda };
  }
  function categoriaPorItem(desc, ctx) { const c = categoriaDe(desc, 'gasto', ctx); return { cat: c.cat, catConfianza: c.conf }; }

  /* -------------------------------------------------------------- estado de cuenta */
  // Texto copiado de un estado de cuenta: líneas «fecha  descripción  valor». Los pagos y abonos se marcan aparte.
  function estadoCuenta(texto, ctx) {
    ctx = ctx || {};
    const hoy = ctx.hoy || U.hoyISO();
    const out = [];
    String(texto || '').split(/\r?\n/).forEach((crudo) => {
      const l = crudo.replace(/\s+/g, ' ').trim();
      if (!l) return;
      const f = fecha(l, hoy);
      if (!f) return;
      const ms = montosEn(l);
      if (!ms.length) return;
      const m = ms[ms.length >= 2 && /saldo/.test(U.norm(l)) ? ms.length - 2 : ms.length - 1];
      const n = U.norm(l);
      const esPago = m.negativo || /\b(pago|abono|cancelacion|payment|reverso|devolucion|credito a favor)\b/.test(n) || /\bcr\b$/.test(n);
      let desc = l.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ').replace(/\b\d{1,2}[/\-.]\d{1,2}(?:[/\-.]\d{2,4})?\b/g, ' ')
        .replace(/\b(\d{1,2})\s+(?:de\s+)?(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\.?(?:\s+\d{4})?/gi, ' ')
        .replace(/[$]?\s*-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\b/g, ' ').replace(/\s+/g, ' ').trim();
      if (!desc) desc = 'Movimiento';
      const c = categoriaDe(desc, 'gasto', ctx);
      out.push({ fecha: f, desc: nombrePropio(desc), monto: U.r2(m.valor), esPago, cat: c.cat, catConfianza: c.conf });
    });
    return out;
  }

  AF.lector = { montosEn, fecha, tipoDe, comercio, bancario, bancarioVarios, factura, estadoCuenta, enmascarar };
  if (typeof module === 'object' && module.exports) module.exports = AF.lector;
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/pdf.js ===== */
/* PDF sin librerías: un escritor mínimo (texto, rectángulos, líneas; fuente Helvetica del propio PDF) y el informe de la app.
   Los acentos y la ñ salen bien (WinAnsi). Los emojis no existen en esa fuente: en el PDF van solo los nombres. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const U = AF.util;

  /* ------------------------------------------------------------- anchos Helvetica (por 1000) */
  const W = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015,
    667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333,
    556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  const WB = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975,
    722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333,
    556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
  const ESPECIAL = { '€': 0x80, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '−': 0x2D };

  // Texto → cadena de bytes WinAnsi (lo que no existe en la fuente se omite)
  function codificar(s) {
    let o = '';
    for (const ch of String(s == null ? '' : s)) {
      const c = ch.codePointAt(0);
      if (ESPECIAL[ch] != null) o += String.fromCharCode(ESPECIAL[ch]);
      else if (c >= 32 && c <= 126) o += ch;
      else if (c >= 0xA0 && c <= 0xFF) o += ch;
      else if (c === 9 || c === 10) o += ' ';
    }
    return o;
  }
  const escapar = (s) => s.replace(/[\\()]/g, '\\$&');
  function anchoDe(s, tam, negrita) {
    const T = negrita ? WB : W; let t = 0;
    for (const ch of codificar(s)) {
      const c = ch.charCodeAt(0);
      if (c >= 32 && c <= 126) t += T[c - 32];
      else { const base = ch.normalize('NFD').charCodeAt(0); t += base >= 32 && base <= 126 ? T[base - 32] : 556; }
    }
    return (t * tam) / 1000;
  }
  function recortar(s, max, tam, negrita) {
    s = String(s == null ? '' : s);
    if (anchoDe(s, tam, negrita) <= max) return s;
    while (s.length > 1 && anchoDe(s + '…', tam, negrita) > max) s = s.slice(0, -1);
    return s.trimEnd() + '…';
  }
  const col = (hex) => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(3)).join(' '); };
  const f2 = (n) => (Math.round(n * 100) / 100).toFixed(2);

  /* ------------------------------------------------------------------------ documento */
  const A4 = { w: 595.28, h: 841.89 };
  function crear(meta) {
    const paginas = [];
    function pagina() {
      const ops = [];
      const P = {
        ancho: A4.w, alto: A4.h,
        rect(x, y, w, h, color) { ops.push(col(color) + ' rg ' + f2(x) + ' ' + f2(A4.h - y - h) + ' ' + f2(w) + ' ' + f2(h) + ' re f'); },
        linea(x1, y1, x2, y2, color, grosor) { ops.push(col(color) + ' RG ' + f2(grosor || 0.75) + ' w ' + f2(x1) + ' ' + f2(A4.h - y1) + ' m ' + f2(x2) + ' ' + f2(A4.h - y2) + ' l S'); },
        // y = línea base del texto (desde arriba). align: izq | der | centro
        texto(x, y, s, o) {
          o = o || {}; const tam = o.tam || 10;
          let t = o.max ? recortar(s, o.max, tam, o.negrita) : String(s == null ? '' : s);
          const w = anchoDe(t, tam, o.negrita);
          const x0 = o.align === 'der' ? x - w : o.align === 'centro' ? x - w / 2 : x;
          ops.push('BT ' + col(o.color || '#0E1A2E') + ' rg /' + (o.negrita ? 'F2' : 'F1') + ' ' + f2(tam) + ' Tf ' + f2(x0) + ' ' + f2(A4.h - y) + ' Td (' + escapar(codificar(t)) + ') Tj ET');
          return w;
        },
        ops,
      };
      paginas.push(P); return P;
    }
    function bytes(pie) {
      const n = paginas.length;
      if (pie) paginas.forEach((p, i) => pie(p, i + 1, n));
      const objs = [];                                                          // objs[i] = cuerpo del objeto i+1
      objs[0] = '<< /Type /Catalog /Pages 2 0 R >>';
      objs[2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
      objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
      const info = (meta && meta.titulo ? '/Title (' + escapar(codificar(meta.titulo)) + ') ' : '') + '/Producer (Asistente Financiero)';
      objs[4] = '<< ' + info + ' >>';
      const kids = [];
      paginas.forEach((p, i) => {
        const idPag = 6 + i * 2, idCont = 7 + i * 2;
        kids.push(idPag + ' 0 R');
        const flujo = p.ops.join('\n');
        objs[idPag - 1] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + f2(A4.w) + ' ' + f2(A4.h) + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + idCont + ' 0 R >>';
        objs[idCont - 1] = '<< /Length ' + flujo.length + ' >>\nstream\n' + flujo + '\nendstream';
      });
      objs[1] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>';
      let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const pos = [];
      objs.forEach((o, i) => { pos.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
      const ini = out.length;
      out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + pos.map((p) => String(p).padStart(10, '0') + ' 00000 n \n').join('');
      out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R /Info 5 0 R >>\nstartxref\n' + ini + '\n%%EOF\n';
      const u = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) u[i] = out.charCodeAt(i) & 255;
      return u;
    }
    return { pagina, bytes, get paginas() { return paginas; } };
  }

  /* -------------------------------------------------------------------------- informe */
  const C = { oscuro: '#10233F', crema: '#FFFFFF', naranja: '#F28A1B', oro: '#F2B63A', gris: '#56647A', linea: '#DDE4EE', zebra: '#F3F6FB', verde: '#0E8A5F', rojo: '#C62F2F', pista: '#E4ECF8' };
  const M = 40;                                                                   // margen

  // d: datos, rango {desde, hasta, etiqueta}, o: { nombre, hoy, completo, moneda }
  function informe(d, rango, o) {
    o = o || {};
    const I = AF.informes, hoy = o.hoy || U.hoyISO();
    const $ = (n) => U.dinero(n, o.moneda ? { moneda: o.moneda } : undefined);
    const doc = crear({ titulo: 'Resumen ' + rango.etiqueta });
    const t = I.totales(d, rango.desde, rango.hasta);
    const movs = d.movs.filter((m) => m.fecha >= rango.desde && m.fecha <= rango.hasta && m.tipo !== 'pago_tarjeta')
      .sort((a, b) => (a.fecha === b.fecha ? a.creado - b.creado : a.fecha < b.fecha ? -1 : 1));

    /* ---- página 1 */
    let p = doc.pagina();
    p.rect(0, 0, p.ancho, 128, C.oscuro);
    p.rect(M, 40, 26, 4, C.naranja);
    p.texto(M, 62, 'Asistente Financiero', { tam: 10, negrita: true, color: C.oro });
    p.texto(M, 96, 'Resumen ' + rango.etiqueta, { tam: 24, negrita: true, color: C.crema, max: p.ancho - 2 * M });
    p.texto(M, 116, (o.nombre ? o.nombre + ' · ' : '') + 'del ' + U.fechaLarga(rango.desde) + ' al ' + U.fechaLarga(rango.hasta), { tam: 9.5, color: '#B5B1A8' });

    const kpi = [['Ingresos', t.ingresos, C.verde], ['Gastos', t.gastos, C.rojo], ['Balance', t.balance, t.balance >= 0 ? C.verde : C.rojo]];
    const cw = (p.ancho - 2 * M) / 3;
    kpi.forEach(([et, v, color], i) => { p.texto(M + i * cw, 162, et, { tam: 10, color: C.gris }); p.texto(M + i * cw, 188, $(v), { tam: 22, negrita: true, color }); });
    p.linea(M, 206, p.ancho - M, 206, C.linea, 1);

    let y = 232;
    p.texto(M, y, 'En qué se fue tu plata', { tam: 14, negrita: true }); y += 20;
    if (!t.porCategoria.length) { p.texto(M, y + 4, 'No hay gastos en este periodo.', { tam: 10, color: C.gris }); y += 26; }
    const cats = t.porCategoria.slice(0, 9);
    const resto = t.porCategoria.slice(9).reduce((s, x) => s + x.total, 0);
    const lista = cats.map((x) => ({ nombre: x.cat.nombre, total: x.total, pct: x.pct }));
    if (resto > 0) lista.push({ nombre: 'Otras categorías', total: U.r2(resto), pct: t.gastos ? resto / t.gastos : 0 });
    const max = Math.max.apply(null, lista.map((x) => x.total).concat([1]));
    lista.forEach((x) => {
      p.texto(M, y + 8, x.nombre, { tam: 10, max: 140 });
      p.rect(M + 150, y, 250, 9, C.pista);
      p.rect(M + 150, y, Math.max(2, (x.total / max) * 250), 9, C.oscuro);
      p.texto(p.ancho - M - 44, y + 8, $(x.total), { tam: 10, negrita: true, align: 'der' });
      p.texto(p.ancho - M, y + 8, Math.round(x.pct * 100) + ' %', { tam: 9, color: C.gris, align: 'der' });
      y += 20;
    });

    /* necesario o gusto */
    const tot = t.nec.N + t.nec.G + t.nec.sin;
    if (tot > 0) {
      y += 14; p.texto(M, y, 'Necesario o gusto', { tam: 14, negrita: true }); y += 14;
      const ancho = p.ancho - 2 * M; let x = M;
      [[t.nec.N, C.oscuro, 'Necesario'], [t.nec.G, C.oro, 'Gusto'], [t.nec.sin, '#CFC9C0', 'Sin clasificar']].forEach(([v, c]) => { if (v > 0) { const w = Math.max(3, (v / tot) * ancho - 2); p.rect(x, y, w, 12, c); x += w + 2; } });
      y += 30;
      [[t.nec.N, C.oscuro, 'Necesario'], [t.nec.G, C.oro, 'Gusto'], [t.nec.sin, '#CFC9C0', 'Sin clasificar']].filter((z) => z[0] > 0).forEach((z, i) => {
        const x0 = M + i * 170; p.rect(x0, y - 8, 9, 9, z[1]); p.texto(x0 + 14, y, z[2] + ' ' + $(z[0]) + ' · ' + Math.round((z[0] / tot) * 100) + ' %', { tam: 9.5 });
      });
      y += 10;
    }
    const hm = I.hormiga(d, rango.desde, rango.hasta);
    if (hm.veces) { y += 14; p.texto(M, y, 'Gastos hormiga: ' + $(hm.total) + ' en ' + hm.veces + (hm.veces === 1 ? ' compra pequeña' : ' compras pequeñas') + '. Al ritmo de este periodo serían unos ' + $(hm.alAnio) + ' al año.', { tam: 9.5, color: C.gris, max: p.ancho - 2 * M }); y += 6; }

    /* con el informe completo: mes a mes */
    if (o.completo) {
      const serie = I.serieMensual(d, rango.hasta < hoy ? rango.hasta : hoy, 6);
      y += 26; p.texto(M, y, 'Últimos 6 meses', { tam: 14, negrita: true }); y += 14;
      const alto = 80, mx = Math.max.apply(null, serie.map((s) => Math.max(s.ingresos, s.gastos)).concat([1])), bw = 22, paso = (p.ancho - 2 * M) / serie.length;
      serie.forEach((s, i) => {
        const x = M + i * paso + (paso - 2 * bw - 4) / 2;
        p.rect(x, y + alto - (s.ingresos / mx) * alto, bw, (s.ingresos / mx) * alto, C.verde);
        p.rect(x + bw + 4, y + alto - (s.gastos / mx) * alto, bw, (s.gastos / mx) * alto, C.rojo);
        p.texto(x + bw + 2, y + alto + 14, s.etiqueta, { tam: 9, color: C.gris, align: 'centro' });
      });
      p.linea(M, y + alto, p.ancho - M, y + alto, C.linea, 1);
      p.rect(M, y + alto + 26, 9, 9, C.verde); p.texto(M + 14, y + alto + 34, 'Ingresos', { tam: 9 });
      p.rect(M + 80, y + alto + 26, 9, 9, C.rojo); p.texto(M + 94, y + alto + 34, 'Gastos', { tam: 9 });
    }

    /* ---- movimientos (varias páginas) */
    const porPag = AF.PLAN.pdf.filasPorPagina;
    const cabeceraTabla = (pg, yy) => {
      pg.texto(M, yy, 'Movimientos', { tam: 14, negrita: true }); yy += 18;
      pg.rect(M, yy - 11, pg.ancho - 2 * M, 18, C.oscuro);
      pg.texto(M + 6, yy + 1, 'Fecha', { tam: 9, negrita: true, color: C.crema });
      pg.texto(M + 66, yy + 1, 'Detalle', { tam: 9, negrita: true, color: C.crema });
      pg.texto(M + 290, yy + 1, 'Categoría', { tam: 9, negrita: true, color: C.crema });
      pg.texto(pg.ancho - M - 6, yy + 1, 'Monto', { tam: 9, negrita: true, color: C.crema, align: 'der' });
      return yy + 18;
    };
    if (movs.length) {
      let i = 0;
      while (i < movs.length) {
        p = doc.pagina(); let yy = cabeceraTabla(p, 56);
        for (let k = 0; k < porPag && i < movs.length; k++, i++) {
          const m = movs[i], c = I.catDe(d, m.cat);
          if (k % 2 === 0) p.rect(M, yy - 11, p.ancho - 2 * M, 17, C.zebra);
          p.texto(M + 6, yy, U.deISO(m.fecha).getDate() + ' ' + U.MESES_CORTOS[U.deISO(m.fecha).getMonth()] + ' ' + m.fecha.slice(2, 4), { tam: 9 });
          p.texto(M + 66, yy, m.desc || c.nombre, { tam: 9, max: 210 });
          p.texto(M + 290, yy, c.nombre, { tam: 9, max: 150, color: C.gris });
          p.texto(p.ancho - M - 6, yy, (m.tipo === 'ingreso' ? '+' : '-') + $(m.monto).replace('−', '-'), { tam: 9, negrita: true, color: m.tipo === 'ingreso' ? C.verde : C.oscuro, align: 'der' });
          yy += 17;
        }
      }
    }

    return doc.bytes((pg, n, total) => {
      pg.linea(M, pg.alto - 40, pg.ancho - M, pg.alto - 40, C.linea, 0.75);
      pg.texto(M, pg.alto - 26, 'Asistente Financiero · valores calculados con lo que registraste; no es asesoría financiera.', { tam: 8, color: C.gris });
      pg.texto(pg.ancho - M, pg.alto - 26, 'Página ' + n + ' de ' + total, { tam: 8, color: C.gris, align: 'der' });
    });
  }

  AF.pdf = { crear, informe, anchoDe, recortar, codificar };
  if (typeof module === 'object' && module.exports) module.exports = AF.pdf;
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/archivos.js ===== */
/* Archivos de Excel (.xlsx real, con números y fechas de verdad) armados sin librerías: un .xlsx es un ZIP de XML. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const U = AF.util;
  const enc = new TextEncoder();

  /* --------------------------------------------------------------------- ZIP (sin comprimir) */
  const TABLA = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = TABLA[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

  // archivos: [{ nombre, datos: Uint8Array | string }]
  function zip(archivos, ahora) {
    const f = ahora || new Date();
    const dosFecha = ((f.getFullYear() - 1980) << 9) | ((f.getMonth() + 1) << 5) | f.getDate(), dosHora = (f.getHours() << 11) | (f.getMinutes() << 5) | (f.getSeconds() >> 1);
    const trozos = [], central = []; let pos = 0;
    archivos.forEach((a) => {
      const nombre = enc.encode(a.nombre), datos = typeof a.datos === 'string' ? enc.encode(a.datos) : a.datos, crc = crc32(datos);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, dosHora, true); lh.setUint16(12, dosFecha, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, datos.length, true); lh.setUint32(22, datos.length, true); lh.setUint16(26, nombre.length, true); lh.setUint16(28, 0, true);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, dosHora, true); ch.setUint16(14, dosFecha, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, datos.length, true); ch.setUint32(24, datos.length, true); ch.setUint16(28, nombre.length, true); ch.setUint32(42, pos, true);
      trozos.push(new Uint8Array(lh.buffer), nombre, datos);
      central.push(new Uint8Array(ch.buffer), nombre);
      pos += 30 + nombre.length + datos.length;
    });
    const tamCentral = central.reduce((s, x) => s + x.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true); fin.setUint32(12, tamCentral, true); fin.setUint32(16, pos, true);
    const todo = trozos.concat(central, [new Uint8Array(fin.buffer)]);
    const out = new Uint8Array(todo.reduce((s, x) => s + x.length, 0)); let o = 0;
    todo.forEach((x) => { out.set(x, o); o += x.length; });
    return out;
  }

  /* ------------------------------------------------------------------------------ XLSX */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const letra = (i) => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
  const serial = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000); };
  const ESTILO = { texto: 0, fecha: 1, dinero: 2, cabecera: 3, negrita: 4, porcentaje: 5 };

  // hojas: [{ nombre, columnas: [{ t, ancho, tipo }], filas: [[valor,...]] }]   tipo: texto | fecha | dinero | num | porcentaje
  function xlsx(hojas) {
    const celda = (v, tipo, r, c) => {
      const ref = letra(c) + r;
      if (v == null || v === '') return '';
      if (tipo === 'fecha') return '<c r="' + ref + '" s="' + ESTILO.fecha + '"><v>' + serial(v) + '</v></c>';
      if (tipo === 'dinero') return '<c r="' + ref + '" s="' + ESTILO.dinero + '"><v>' + Number(v) + '</v></c>';
      if (tipo === 'porcentaje') return '<c r="' + ref + '" s="' + ESTILO.porcentaje + '"><v>' + Number(v) + '</v></c>';
      if (tipo === 'num') return '<c r="' + ref + '"><v>' + Number(v) + '</v></c>';
      return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
    };
    const hojasXml = hojas.map((h) => {
      const filas = ['<row r="1">' + h.columnas.map((c, i) => '<c r="' + letra(i) + '1" s="' + ESTILO.cabecera + '" t="inlineStr"><is><t>' + esc(c.t) + '</t></is></c>').join('') + '</row>'];
      h.filas.forEach((f, i) => filas.push('<row r="' + (i + 2) + '">' + f.map((v, c) => celda(v, h.columnas[c].tipo, i + 2, c)).join('') + '</row>'));
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
        + '<cols>' + h.columnas.map((c, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (c.ancho || 14) + '" customWidth="1"/>').join('') + '</cols>'
        + '<sheetData>' + filas.join('') + '</sheetData></worksheet>';
    });
    const nombres = hojas.map((h) => esc(h.nombre.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31)));
    const archivos = [
      { nombre: '[Content_Types].xml', datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        + hojas.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>' },
      { nombre: '_rels/.rels', datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { nombre: 'xl/workbook.xml', datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
        + nombres.map((n, i) => '<sheet name="' + n + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>' },
      { nombre: 'xl/_rels/workbook.xml.rels', datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + hojas.map((_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('')
        + '<Relationship Id="rId' + (hojas.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { nombre: 'xl/styles.xml', datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        + '<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/></numFmts>'
        + '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFBEBD3"/><name val="Calibri"/></font></fonts>'
        + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1A1B1F"/><bgColor indexed="64"/></patternFill></fill></fills>'
        + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
        + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        + '<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
        + '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
        + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>'
        + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' },
    ].concat(hojasXml.map((x, i) => ({ nombre: 'xl/worksheets/sheet' + (i + 1) + '.xml', datos: x })));
    return zip(archivos);
  }

  // El Excel de la app: movimientos del periodo, resumen por categoría y totales.
  function excelMovimientos(d, desde, hasta) {
    const I = AF.informes, t = I.totales(d, desde, hasta);
    const movs = d.movs.filter((m) => m.fecha >= desde && m.fecha <= hasta && m.tipo !== 'pago_tarjeta').sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.creado - b.creado));
    const nec = (m, c) => { const v = m.nec !== undefined ? m.nec : c.nec; return v === 'N' ? 'Necesario' : v === 'G' ? 'Gusto' : ''; };
    return xlsx([
      { nombre: 'Movimientos', columnas: [{ t: 'Fecha', tipo: 'fecha', ancho: 12 }, { t: 'Tipo', ancho: 10 }, { t: 'Monto', tipo: 'dinero', ancho: 12 }, { t: 'Categoría', ancho: 22 }, { t: 'Detalle', ancho: 32 }, { t: 'Cuenta', ancho: 12 }, { t: 'Necesario o gusto', ancho: 18 }],
        filas: movs.map((m) => { const c = I.catDe(d, m.cat); return [m.fecha, m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto', m.monto, c.nombre, m.desc || '', m.cuenta === 'tarjeta' ? 'Tarjeta' : 'Efectivo', m.tipo === 'gasto' ? nec(m, c) : '']; }) },
      { nombre: 'Por categoría', columnas: [{ t: 'Categoría', ancho: 26 }, { t: 'Gastado', tipo: 'dinero', ancho: 14 }, { t: '% de tus gastos', tipo: 'porcentaje', ancho: 16 }],
        filas: t.porCategoria.map((x) => [x.cat.nombre, x.total, x.pct]) },
      { nombre: 'Resumen', columnas: [{ t: 'Concepto', ancho: 22 }, { t: 'Monto', tipo: 'dinero', ancho: 14 }],
        filas: [['Ingresos', t.ingresos], ['Gastos', t.gastos], ['Balance', t.balance], ['Necesario', t.nec.N], ['Gusto', t.nec.G]] },
    ]);
  }

  AF.archivos = { crc32, zip, xlsx, excelMovimientos };
  if (typeof module === 'object' && module.exports) module.exports = AF.archivos;
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/seguridad.js ===== */
/* Seguridad: bóveda cifrada local.
   - Una clave de datos K (AES-256-GCM) al azar cifra todo lo de la cuenta. K nunca se guarda en claro.
   - K se guarda envuelta dos veces: con una clave derivada del PIN (PBKDF2) y, si se activa la huella,
     con un secreto al azar que el teléfono entrega solo tras la huella (almacén seguro nativo).
   - PIN olvidado = datos irrecuperables (se avisa al crear el PIN); se puede reiniciar la cuenta.
   - Cada cuenta (proveedor + id) tiene su propio espacio: dos personas en el mismo teléfono no se mezclan. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const PLAN = AF.PLAN;
  const S = () => PLAN.sesion;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const subtle = () => g.crypto.subtle;

  /* -------------------------------------------------------------------- utilidades */
  const b64 = (buf) => { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
  const deB64 = (t) => { const s = atob(t); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
  const azar = (n) => g.crypto.getRandomValues(new Uint8Array(n));
  const hash = async (t) => b64(await subtle().digest('SHA-256', enc.encode(t))).replace(/[^A-Za-z0-9]/g, '').slice(0, 16);

  /* ------------------------------------------------------------------ almacén simple */
  // Por defecto localStorage; nativo.js puede cambiarlo por Preferences. Interfaz asíncrona.
  let almacen = {
    async get(k) { try { return g.localStorage.getItem(k); } catch (e) { return mem[k] == null ? null : mem[k]; } },
    async set(k, v) { try { g.localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
    async del(k) { try { g.localStorage.removeItem(k); } catch (e) { delete mem[k]; } },
  };
  const mem = {};
  const usarAlmacen = (a) => { almacen = a; };
  const leerJSON = async (k) => { const t = await almacen.get(k); if (!t) return null; try { return JSON.parse(t); } catch (e) { return null; } };
  const escribirJSON = (k, o) => almacen.set(k, JSON.stringify(o));

  const clave = async (ns, parte) => 'af:' + (await hash(ns)) + ':' + parte;

  /* --------------------------------------------------------------- cifrado de bloques */
  async function importarAes(raw, usos) { return subtle().importKey('raw', raw, 'AES-GCM', false, usos || ['encrypt', 'decrypt']); }
  async function cifrar(key, bytes) { const iv = azar(12); const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, key, bytes); return { iv: b64(iv), ct: b64(ct) }; }
  async function descifrar(key, bloque) { return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: deB64(bloque.iv) }, key, deB64(bloque.ct))); }
  async function claveDePin(pin, salt, iter) {
    const base = await subtle().importKey('raw', enc.encode(String(pin)), 'PBKDF2', false, ['deriveKey']);
    return subtle().deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  /* --------------------------------------------------------------------- estado */
  let K = null;          // CryptoKey de datos (solo en memoria)
  let Kraw = null;       // bytes de K (solo en memoria; hace falta para activar huella / cambiar PIN)
  let nsActual = null;
  const estaAbierta = () => !!K;
  function bloquear() { K = null; if (Kraw) Kraw.fill(0); Kraw = null; }

  const pinValido = (pin) => new RegExp('^\\d{' + S().pinMin + ',' + S().pinMax + '}$').test(String(pin || ''));
  const pinDebil = (pin) => {
    const p = String(pin);
    return /^(\d)\1+$/.test(p) || '0123456789'.includes(p) || '9876543210'.includes(p);
  };

  /* ------------------------------------------------------------------ intentos de PIN */
  async function estadoIntentos(ns) {
    const o = (await leerJSON(await clave(ns, 'intentos'))) || { n: 0, hasta: 0 };
    const ahora = Date.now();
    return { n: o.n, bloqueadoHasta: o.hasta, espera: o.hasta > ahora ? Math.ceil((o.hasta - ahora) / 1000) : 0, restantes: Math.max(0, S().intentosPinMax - o.n) };
  }
  async function falloPin(ns) {
    const k = await clave(ns, 'intentos');
    const o = (await leerJSON(k)) || { n: 0, hasta: 0 };
    o.n++;
    if (o.n >= S().intentosPinMax) { o.hasta = Date.now() + S().esperaTrasIntentosSeg * 1000 * Math.min(8, o.n - S().intentosPinMax + 1); }
    await escribirJSON(k, o);
  }
  const limpiarIntentos = async (ns) => almacen.del(await clave(ns, 'intentos'));

  /* ------------------------------------------------------------------- bóveda */
  async function existe(ns) { return !!(await leerJSON(await clave(ns, 'boveda'))); }
  async function longitudPin(ns) { const b = await leerJSON(await clave(ns, 'boveda')); return (b && b.len) || S().pinMin; }

  async function crear(ns, pin) {
    if (!pinValido(pin)) throw new Error('PIN_INVALIDO');
    const raw = azar(32);
    const salt = azar(16), iter = S().pbkdf2Iteraciones;
    const kPin = await claveDePin(pin, salt, iter);
    const boveda = { v: 1, salt: b64(salt), iter, len: String(pin).length, pin: await cifrar(kPin, raw), bio: null };
    await escribirJSON(await clave(ns, 'boveda'), boveda);
    await limpiarIntentos(ns);
    K = await importarAes(raw); Kraw = raw; nsActual = ns;
    return true;
  }

  // Devuelve { ok } o { ok:false, motivo:'espera'|'incorrecto'|'sin_boveda', espera, restantes }
  async function abrirConPin(ns, pin) {
    const b = await leerJSON(await clave(ns, 'boveda'));
    if (!b) return { ok: false, motivo: 'sin_boveda' };
    const est = await estadoIntentos(ns);
    if (est.espera > 0) return { ok: false, motivo: 'espera', espera: est.espera, restantes: 0 };
    try {
      const kPin = await claveDePin(pin, deB64(b.salt), b.iter);
      const raw = await descifrar(kPin, b.pin);
      K = await importarAes(raw); Kraw = raw; nsActual = ns;
      await limpiarIntentos(ns);
      return { ok: true };
    } catch (e) {
      await falloPin(ns);
      const e2 = await estadoIntentos(ns);
      return { ok: false, motivo: e2.espera > 0 ? 'espera' : 'incorrecto', espera: e2.espera, restantes: e2.restantes };
    }
  }

  async function cambiarPin(ns, pinNuevo) {
    if (!K || !Kraw) throw new Error('BLOQUEADA');
    if (!pinValido(pinNuevo)) throw new Error('PIN_INVALIDO');
    const b = await leerJSON(await clave(ns, 'boveda'));
    const salt = azar(16);
    b.salt = b64(salt); b.len = String(pinNuevo).length; b.pin = await cifrar(await claveDePin(pinNuevo, salt, b.iter), Kraw);
    await escribirJSON(await clave(ns, 'boveda'), b);
    return true;
  }

  /* ------------------------------------------------------------------- huella */
  // `secretos` = { guardar(ns, b64) , leer(ns) } ; leer pide la huella. Lo aporta nativo.js.
  async function activarHuella(ns, secretos) {
    if (!K || !Kraw) throw new Error('BLOQUEADA');
    const secreto = azar(32);
    await secretos.guardar(ns, b64(secreto));
    const b = await leerJSON(await clave(ns, 'boveda'));
    b.bio = await cifrar(await importarAes(secreto), Kraw);
    await escribirJSON(await clave(ns, 'boveda'), b);
    return true;
  }
  async function huellaActiva(ns) { const b = await leerJSON(await clave(ns, 'boveda')); return !!(b && b.bio); }
  async function desactivarHuella(ns, secretos) {
    const b = await leerJSON(await clave(ns, 'boveda'));
    if (b) { b.bio = null; await escribirJSON(await clave(ns, 'boveda'), b); }
    try { if (secretos && secretos.borrar) await secretos.borrar(ns); } catch (e) { /* ya no existe */ }
  }
  async function abrirConHuella(ns, secretos) {
    const b = await leerJSON(await clave(ns, 'boveda'));
    if (!b || !b.bio) return { ok: false, motivo: 'sin_huella' };
    try {
      const t = await secretos.leer(ns);               // el teléfono pide la huella aquí
      if (!t) return { ok: false, motivo: 'cancelado' };
      const raw = await descifrar(await importarAes(deB64(t)), b.bio);
      K = await importarAes(raw); Kraw = raw; nsActual = ns;
      return { ok: true };
    } catch (e) { return { ok: false, motivo: 'cancelado' }; }
  }

  /* -------------------------------------------------------------------- datos */
  async function guardarDatos(ns, obj) {
    if (!K) throw new Error('BLOQUEADA');
    const bloque = await cifrar(K, enc.encode(JSON.stringify(obj)));
    await escribirJSON(await clave(ns, 'datos'), { v: 1, ts: Date.now(), bloque });
  }
  async function leerDatos(ns) {
    if (!K) throw new Error('BLOQUEADA');
    const r = await leerJSON(await clave(ns, 'datos'));
    if (!r) return null;
    return JSON.parse(dec.decode(await descifrar(K, r.bloque)));
  }
  async function marcaDatos(ns) { const r = await leerJSON(await clave(ns, 'datos')); return r ? r.ts : null; }

  // Para copia en la nube: todo sale YA cifrado (la nube nunca ve nada legible).
  async function paqueteRespaldo(ns) {
    return { app: 'asistente-financiero', v: 1, ts: Date.now(), boveda: await leerJSON(await clave(ns, 'boveda')), datos: await leerJSON(await clave(ns, 'datos')) };
  }
  async function restaurarPaquete(ns, p) {
    if (!p || p.app !== 'asistente-financiero' || !p.boveda || !p.datos) throw new Error('PAQUETE_INVALIDO');
    await escribirJSON(await clave(ns, 'boveda'), Object.assign({}, p.boveda, { bio: null }));   // la huella es del teléfono: se vuelve a activar
    await escribirJSON(await clave(ns, 'datos'), p.datos);
    bloquear();
  }

  /* ------------------------------------------------------------------ borrados */
  async function borrarCuenta(ns, secretos) {
    bloquear();
    for (const p of ['boveda', 'datos', 'intentos']) await almacen.del(await clave(ns, p));
    try { if (secretos && secretos.borrar) await secretos.borrar(ns); } catch (e) { /* nada que borrar */ }
  }

  /* ------------------------------------------------------------------- sesión */
  const claveSesion = 'af:sesion';
  async function sesion() { return leerJSON(claveSesion); }
  async function guardarSesion(s) { await escribirJSON(claveSesion, s); }
  async function cerrarSesion() { bloquear(); await almacen.del(claveSesion); }
  const espacioDe = (s) => s.proveedor + ':' + s.id;

  /* ---------------------------------------------------- bloqueo por tiempo en segundo plano */
  let ultimaSalida = 0;
  function marcarSalida(ahora) { ultimaSalida = ahora || Date.now(); }
  function debeBloquear(segundos, ahora) {
    if (!K) return true;
    if (!ultimaSalida) return false;
    return ((ahora || Date.now()) - ultimaSalida) / 1000 >= (segundos == null ? S().bloquearTrasSegundos : segundos);
  }
  function marcarEntrada() { ultimaSalida = 0; }

  // Crea la bóveda con un PIN interno generado automáticamente (modo sin PIN).
  // El "auto-PIN" se guarda en localStorage; si se borra, el usuario deberá reiniciar la cuenta.
  async function crearSinPin(ns) {
    const autoPin = String(Math.floor(100000 + Math.random() * 900000));
    try { localStorage.setItem('af_clave_' + ns, autoPin); } catch (e) { /* private mode */ }
    return crear(ns, autoPin);
  }
  // Devuelve el PIN interno si existe (modo sin PIN), o null.
  function obtenerAutoPin(ns) {
    try { return localStorage.getItem('af_clave_' + ns); } catch (e) { return null; }
  }

  AF.seguridad = { usarAlmacen, pinValido, pinDebil, existe, longitudPin, crear, crearSinPin, obtenerAutoPin, abrirConPin, cambiarPin, bloquear, estaAbierta, estadoIntentos,
    activarHuella, huellaActiva, desactivarHuella, abrirConHuella, guardarDatos, leerDatos, marcaDatos, paqueteRespaldo, restaurarPaquete,
    borrarCuenta, sesion, guardarSesion, cerrarSesion, espacioDe, marcarSalida, marcarEntrada, debeBloquear, b64, deB64 };
  if (typeof module === 'object' && module.exports) module.exports = AF.seguridad;
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/nativo.js ===== */
/* Capa nativa: todo lo que toca el teléfono pasa por aquí (Google/Facebook, huella, voz, cámara, avisos, compartir, compras, Drive).
   Cada función tiene una salida clara cuando no hay teléfono (navegador): nunca revienta, devuelve un motivo. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const PLAN = AF.PLAN;
  const C = () => g.Capacitor;
  const esNativo = () => !!(C() && C().isNativePlatform && C().isNativePlatform());
  const plugin = (n) => (C() && C().Plugins && C().Plugins[n]) || null;
  const esLocal = () => /^(localhost|127\.0\.0\.1)$/.test((g.location && g.location.hostname) || '');
  const err = (codigo, mensaje) => Object.assign(new Error(mensaje || codigo), { codigo });
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ------------------------------------------------------------------ almacén local */
  // En el teléfono: Preferences (almacén privado de la app). En navegador: localStorage.
  function almacenNativo() {
    const P = plugin('Preferences');
    if (!esNativo() || !P) return null;
    return {
      async get(k) { const r = await P.get({ key: k }); return r.value == null ? null : r.value; },
      async set(k, v) { await P.set({ key: k, value: v }); },
      async del(k) { await P.remove({ key: k }); },
    };
  }

  /* --------------------------------------------------------------- Google / Facebook */
  let sociales = false;
  async function prepararSociales() {
    const L = plugin('SocialLogin'); if (!L) throw err('no_disponible', 'El inicio de sesión solo funciona en la app instalada.');
    if (sociales) return L;
    const s = PLAN.sesion, cfg = {};
    if (s.googleClientIdWeb) cfg.google = { webClientId: s.googleClientIdWeb };
    if (s.facebookAppId && s.facebookClientToken) cfg.facebook = { appId: s.facebookAppId, clientToken: s.facebookClientToken };
    await L.initialize(cfg);
    sociales = true;
    return L;
  }
  const proveedorListo = (p) => (p === 'google' ? !!PLAN.sesion.googleClientIdWeb : p === 'facebook' ? !!(PLAN.sesion.facebookAppId && (!esNativo() || PLAN.sesion.facebookClientToken)) : false);

  /* ---- Versión web (se instala desde Chrome): Google Identity Services y Facebook SDK, sin pasar por Capacitor */
  const scriptsWeb = {};
  function cargarScript(src) {
    if (!scriptsWeb[src]) scriptsWeb[src] = new Promise((res, rej) => {
      const s = g.document.createElement('script'); s.src = src; s.async = true; s.onload = () => res(); s.onerror = () => { delete scriptsWeb[src]; rej(err('sin_red', 'No pude conectar con el servicio de inicio de sesión. Revisa tu internet.')); };
      g.document.head.appendChild(s);
    });
    return scriptsWeb[src];
  }
  const URL_GOOGLE = 'https://accounts.google.com/gsi/client';
  const urlFacebook = () => 'https://connect.facebook.net/es_LA/sdk.js';
  let tokenGoogle = null;                                                  // { token, vence, drive, email } solo en memoria (nunca en disco)
  let fbIniciado = false;
  // Se llama al mostrar la portada: así las ventanas de Google/Facebook abren en el mismo toque del botón (si no, Chrome las bloquea).
  function precargarWeb() {
    if (esNativo()) return;
    if (PLAN.sesion.googleClientIdWeb) cargarScript(URL_GOOGLE).catch(() => {});
    if (PLAN.sesion.facebookAppId) cargarFacebookWeb().catch(() => {});
  }
  async function cargarFacebookWeb() {
    await cargarScript(urlFacebook());
    if (!g.FB) throw err('fallo', 'Facebook no respondió. Revisa tu internet.');
    if (!fbIniciado) { g.FB.init({ appId: PLAN.sesion.facebookAppId, cookie: false, xfbml: false, version: PLAN.sesion.facebookVersion || 'v23.0' }); fbIniciado = true; }
    return g.FB;
  }
  // Pide a Google un permiso de acceso (ventana de Google). Devuelve la respuesta con access_token.
  async function pedirTokenGoogle(alcance, pista, pedirConsentimiento) {
    await cargarScript(URL_GOOGLE);
    if (!(g.google && g.google.accounts && g.google.accounts.oauth2)) throw err('fallo', 'Google no respondió. Revisa tu internet.');
    return new Promise((res, rej) => {
      const cfg = {
        client_id: PLAN.sesion.googleClientIdWeb, scope: alcance,
        callback: (r) => (r && r.error ? rej(err(r.error === 'access_denied' ? 'cancelado' : 'fallo', 'Google respondió: ' + (r.error_description || r.error))) : res(r)),
        error_callback: (e) => rej(err(e && /popup_closed/.test(e.type) ? 'cancelado' : 'fallo', e && e.type === 'popup_failed_to_open' ? 'Chrome bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo otra vez.' : 'No pude abrir Google (' + ((e && e.type) || 'error') + ').')),
      };
      if (pista) cfg.hint = pista;
      g.google.accounts.oauth2.initTokenClient(cfg).requestAccessToken(pedirConsentimiento ? { prompt: 'consent' } : {});
    });
  }
  const guardarTokenGoogle = (r, email) => {
    const alcance = PLAN.sesion.googleAlcanceDrive;
    tokenGoogle = { token: r.access_token, vence: Date.now() + (Number(r.expires_in) || 3000) * 1000, drive: !!(g.google.accounts.oauth2.hasGrantedAllScopes && g.google.accounts.oauth2.hasGrantedAllScopes(r, alcance)), email: email || '' };
  };
  async function iniciarGoogleWeb() {
    const r = await pedirTokenGoogle('openid email profile ' + PLAN.sesion.googleAlcanceDrive);
    let u;
    try { u = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + r.access_token } })).json(); }
    catch (e) { throw err('sin_red', 'Entraste a Google pero no pude leer tu cuenta. Revisa tu internet.'); }
    if (!u || (!u.sub && !u.email)) throw err('fallo', 'Google no devolvió tu cuenta.');
    guardarTokenGoogle(r, u.email);
    return { proveedor: 'google', id: String(u.sub || u.email), nombre: u.given_name || u.name || '', email: u.email || '', foto: u.picture || '' };
  }
  async function iniciarFacebookWeb() {
    const FB = await cargarFacebookWeb();
    const r = await new Promise((res) => FB.login(res, { scope: PLAN.sesion.facebookPermisos.join(',') }));
    if (!r || !r.authResponse) throw err('cancelado', 'Cancelaste el inicio de sesión.');
    const me = await new Promise((res) => FB.api('/me', { fields: 'id,name,email' }, res));
    if (!me || !me.id) throw err('fallo', 'Facebook no devolvió tu cuenta.');
    return { proveedor: 'facebook', id: String(me.id), nombre: String(me.name || '').split(' ')[0], email: me.email || '', foto: '' };
  }

  // Devuelve { proveedor, id, nombre, email, foto }
  async function iniciarSesion(proveedor) {
    if (!proveedorListo(proveedor)) throw err('sin_configurar', proveedor === 'google' ? 'Falta configurar Google (ID de cliente web).' : 'Falta configurar Facebook (ID de app).');
    if (!esNativo()) return proveedor === 'google' ? iniciarGoogleWeb() : iniciarFacebookWeb();
    if (!plugin('SocialLogin')) throw err('no_disponible', 'El inicio de sesión no está disponible aquí.');
    const L = await prepararSociales();
    let r;
    try {
      r = proveedor === 'google'
        ? await L.login({ provider: 'google', options: {} })                                           // sin "scopes": el correo y el nombre ya vienen
        : await L.login({ provider: 'facebook', options: { permissions: PLAN.sesion.facebookPermisos } });
    } catch (e) {
      const m = String((e && (e.code || e.message)) || e);
      if (/cancel/i.test(m)) throw err('cancelado', 'Cancelaste el inicio de sesión.');
      throw err('fallo', m);
    }
    const x = r.result || {}, p = x.profile || {};
    if (proveedor === 'google') {
      if (!p.id && !p.email) throw err('fallo', 'Google no devolvió tu cuenta.');
      return { proveedor, id: String(p.id || p.email), nombre: p.givenName || p.name || '', email: p.email || '', foto: p.imageUrl || '' };
    }
    const uid = p.userID || (x.accessToken && x.accessToken.userId);
    if (!uid) throw err('fallo', 'Facebook no devolvió tu cuenta.');
    return { proveedor, id: String(uid), nombre: (p.name || '').split(' ')[0], email: p.email || '', foto: p.imageURL || '' };
  }
  async function cerrarSesionSocial(proveedor) {
    tokenGoogle = null;
    try { if (!esNativo()) { if (proveedor === 'facebook' && g.FB && fbIniciado) g.FB.logout(() => {}); return; } const L = plugin('SocialLogin'); if (L && sociales) await L.logout({ provider: proveedor }); } catch (e) { /* ya estaba cerrada */ }
  }

  /* ------------------------------------------------------------------------ huella */
  const BIO = 1;   // AccessControl.BIOMETRY_CURRENT_SET: el secreto muere si cambian las huellas registradas
  async function huellaDisponible() {
    const B = plugin('NativeBiometric'); if (!esNativo() || !B) return false;
    try { const r = await B.isAvailable({ useFallback: false }); return !!r.isAvailable; } catch (e) { return false; }
  }
  const secretosHuella = {
    async guardar(ns, valor) {
      const B = plugin('NativeBiometric'); if (!B) throw err('no_disponible');
      await B.setData({ key: 'af.bio.' + ns, value: valor, accessControl: BIO, title: 'Activa tu huella', negativeButtonText: 'Cancelar' });
    },
    async leer(ns) {
      const B = plugin('NativeBiometric'); if (!B) return null;
      const r = await B.getSecureData({ key: 'af.bio.' + ns, title: PLAN.app.nombre, subtitle: 'Confirma que eres tú', negativeButtonText: 'Usar PIN' });
      return r && r.value;
    },
    async borrar(ns) { const B = plugin('NativeBiometric'); if (B) await B.deleteData({ key: 'af.bio.' + ns }); },
  };

  /* -------------------------------------------------------------------------- voz */
  const idiomaVoz = () => (PLAN.pais(AF.store && AF.store.d.ajustes.pais).idioma || 'es-EC');
  async function vozDisponible() {
    const R = plugin('SpeechRecognition');
    if (esNativo() && R) { try { return !!(await R.available()).available; } catch (e) { return false; } }
    return !!(g.SpeechRecognition || g.webkitSpeechRecognition);
  }
  // Devuelve { parar(), terminado: Promise<string> }. alParcial(texto) recibe lo que va entendiendo.
  async function escuchar(alParcial) {
    const R = plugin('SpeechRecognition');
    if (esNativo() && R) {
      let permiso = await R.checkPermissions();
      if (permiso.speechRecognition !== 'granted') permiso = await R.requestPermissions();
      if (permiso.speechRecognition !== 'granted') throw err('permiso', 'Sin permiso del micrófono no puedo escucharte. Puedes escribir.');
      let ultimo = '', cierra, cerrado = false;
      const terminado = new Promise((res) => { cierra = (t) => { if (cerrado) return; cerrado = true; res(t); }; });
      await R.removeAllListeners();
      await R.addListener('partialResults', (d) => { if (d && d.matches && d.matches[0]) { ultimo = d.matches[0]; if (alParcial) alParcial(ultimo); } });
      await R.addListener('listeningState', (d) => { if (d && d.status === 'stopped') setTimeout(() => cierra(ultimo), 250); });
      await R.start({ language: idiomaVoz(), maxResults: 3, partialResults: true, popup: false });
      return { parar: async () => { try { await R.stop(); } catch (e) { /* ya estaba detenido */ } setTimeout(() => cierra(ultimo), 400); }, terminado };
    }
    const W = g.SpeechRecognition || g.webkitSpeechRecognition;
    if (!W) throw err('sin_voz', 'Este equipo no tiene reconocimiento de voz. Escribe lo que quieres registrar.');
    const rec = new W(); rec.lang = idiomaVoz(); rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = true;
    let ultimo = '', parado = false;
    const terminado = new Promise((res, rej) => {
      rec.onresult = (e) => {
        // En modo continuo, acumular todos los resultados (finales e intermedios)
        let acum = '';
        for (let i = 0; i < e.results.length; i++) acum += e.results[i][0].transcript;
        ultimo = acum.trim();
        if (alParcial) alParcial(ultimo);
      };
      rec.onerror = (e) => {
        if (e.error === 'no-speech') return; // en continuo, el silencio no es error — seguir escuchando
        rej(err('sin_voz', 'No pude escuchar (' + e.error + ').'));
      };
      rec.onend = () => { if (!parado) { try { rec.start(); } catch (er) { res(ultimo); } } else res(ultimo); };
    });
    rec.start();
    return { parar: async () => { parado = true; try { rec.stop(); } catch (e) { /* nada */ } }, terminado };
  }
  async function hablar(texto) {
    if (!texto) return;
    const T = plugin('TextToSpeech');
    try {
      if (esNativo() && T) { await T.speak({ text: texto, lang: idiomaVoz(), rate: 1.0, queueStrategy: 0 }); return; }
      if (g.speechSynthesis) { g.speechSynthesis.cancel(); const u = new g.SpeechSynthesisUtterance(texto); u.lang = idiomaVoz(); g.speechSynthesis.speak(u); }
    } catch (e) { /* si no puede hablar, la respuesta ya está en pantalla */ }
  }
  const callar = async () => { try { const T = plugin('TextToSpeech'); if (T) await T.stop(); else if (g.speechSynthesis) g.speechSynthesis.cancel(); } catch (e) { /* nada */ } };

  /* ------------------------------------------------- foto de factura / captura (ML Kit) */
  const aBase64 = (blob) => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1]); f.onerror = rej; f.readAsDataURL(blob); });
  // Acepta un File/Blob (de la cámara, galería o pantalla compartida). Devuelve el texto leído.
  async function leerTextoDeImagen(blob) {
    const TR = plugin('TextRecognition'), FS = plugin('Filesystem');
    if (!esNativo() || !TR || !FS) throw err('solo_app', 'Leer fotos todavía no está disponible en esta versión.');
    const nombre = 'lectura-' + Date.now() + '.jpg';
    const w = await FS.writeFile({ path: nombre, data: await aBase64(blob), directory: 'CACHE' });
    try {
      const r = await TR.processImage({ path: w.uri });
      return r.text || '';
    } finally { try { await FS.deleteFile({ path: nombre, directory: 'CACHE' }); } catch (e) { /* ya no está */ } }
  }
  // Lo compartido desde el banco u otra app (texto o imágenes) llega aquí.
  async function escucharCompartidos(cb) {
    const S = plugin('CapacitorShareTarget');
    if (!esNativo() || !S) {                                  // versión web: Android abre la app con ?title=…&text=…&url=… (share_target del manifest)
      try {
        const q = new g.URLSearchParams(g.location.search);
        if (!q.has('text') && !q.has('url') && !q.has('title')) return;
        const textos = []; for (const k of ['text', 'url', 'title']) { const v = (q.get(k) || '').trim(); if (v && !textos.some((x) => x.includes(v))) textos.push(v); }
        g.history.replaceState(null, '', g.location.pathname);
        if (textos.length) cb({ textos, imagenes: [] });
      } catch (e) { /* sin texto compartido */ }
      return;
    }
    await S.addListener('shareReceived', async (ev) => {
      const textos = (ev.texts || []).filter(Boolean);
      const imagenes = [];
      for (const f of ev.files || []) {
        if (!/^image\//.test(f.mimeType || '')) continue;
        try { const b = await (await fetch(C().convertFileSrc(f.uri))).blob(); imagenes.push(await leerTextoDeImagen(b)); } catch (e) { /* esa imagen no se pudo leer */ }
      }
      cb({ textos, imagenes });
    });
  }

  /* ------------------------------------------------------------------ avisos locales */
  const ID_AVISO_BASE = 7000;
  async function permisoAvisos() {
    const N = plugin('LocalNotifications'); if (!esNativo() || !N) return false;
    try { let p = await N.checkPermissions(); if (p.display !== 'granted') p = await N.requestPermissions(); return p.display === 'granted'; } catch (e) { return false; }
  }
  // lista = [{ titulo, cuerpo, cuando: Date }]  → reemplaza los avisos anteriores de la app
  async function programarAvisos(lista) {
    const N = plugin('LocalNotifications'); if (!esNativo() || !N) return 0;
    if (!(await permisoAvisos())) return 0;
    try {
      const pend = await N.getPending();
      const mios = (pend.notifications || []).filter((n) => n.id >= ID_AVISO_BASE && n.id < ID_AVISO_BASE + 1000);
      if (mios.length) await N.cancel({ notifications: mios.map((n) => ({ id: n.id })) });
      const ahora = Date.now();
      const nuevos = lista.filter((a) => a.cuando.getTime() > ahora).slice(0, 60)
        .map((a, i) => ({ id: ID_AVISO_BASE + i, title: a.titulo, body: a.cuerpo, schedule: { at: a.cuando, allowWhileIdle: true } }));
      if (nuevos.length) await N.schedule({ notifications: nuevos });
      return nuevos.length;
    } catch (e) { return 0; }
  }

  /* -------------------------------------------------------------------- compartir */
  async function compartirTexto(titulo, texto) {
    const S = plugin('Share');
    if (esNativo() && S) { try { await S.share({ title: titulo, text: texto, dialogTitle: titulo }); return true; } catch (e) { return false; } }
    if (g.navigator && g.navigator.share) { try { await g.navigator.share({ title: titulo, text: texto }); return true; } catch (e) { return false; } }
    try { await g.navigator.clipboard.writeText(texto); return 'copiado'; } catch (e) { return false; }
  }
  // contenido: string (texto) o Uint8Array (binario: PDF, imagen). Devuelve true si se abrió el menú de compartir/descarga.
  async function entregarArchivo(nombre, contenido, mime) {
    const FS = plugin('Filesystem'), S = plugin('Share');
    if (esNativo() && FS && S) {
      const data = typeof contenido === 'string' ? btoa(unescape(encodeURIComponent(contenido))) : AF.seguridad.b64(contenido);
      const w = await FS.writeFile({ path: nombre, data, directory: 'CACHE' });
      await S.share({ title: nombre, url: w.uri, dialogTitle: 'Enviar o guardar ' + nombre });
      return true;
    }
    const blob = new Blob([contenido], { type: mime });
    const a = g.document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; g.document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    return true;
  }

  /* ---------------------------------------------------------------------- compras */
  async function comprarPro(plan) {
    const NP = plugin('NativePurchases');
    if (!esNativo() || !NP) throw err('solo_app', 'El pago de Pro se activa con la versión de Google Play.');
    const ids = PLAN.precios.productosPlay;
    if (!ids || !ids[plan]) throw err('sin_configurar', 'Pro todavía no está publicado en Google Play.');
    try {
      const t = await NP.purchaseProduct({ productIdentifier: ids[plan], productType: 'subs', planIdentifier: ids[plan + 'Plan'] });
      return { ok: true, id: t.transactionId };
    } catch (e) { throw err(/cancel/i.test(String(e && (e.message || e.code))) ? 'cancelado' : 'fallo', String(e && e.message)); }
  }
  async function restaurarCompras() {
    const NP = plugin('NativePurchases'); if (!esNativo() || !NP) return [];
    try { await NP.restorePurchases(); const r = await NP.getPurchases({ productType: 'subs' }); return r.purchases || []; } catch (e) { return []; }
  }

  /* ------------------------------------------------------------------------ Drive */
  // Respaldo en la carpeta PRIVADA de la app en tu Drive (appDataFolder): ni tú la ves ni otras apps. Solo cuentas de Google.
    const NOMBRE_RESPALDO = 'asistente-financiero-respaldo.json';
  // interactivo=false: solo si ya hay permiso en memoria (no abre ventanas sin que la persona toque un botón).
  async function tokenDrive(interactivo) {
    if (!esNativo()) {
      if (tokenGoogle && tokenGoogle.drive && tokenGoogle.vence > Date.now() + 60000) return tokenGoogle.token;
      if (interactivo === false) throw err('sin_token', 'Toca «Hacer copia ahora» para conectar tu Drive.');
      const sesionEmail = (tokenGoogle && tokenGoogle.email) || '';
      const r = await pedirTokenGoogle(PLAN.sesion.googleAlcanceDrive, sesionEmail);
      guardarTokenGoogle(r, sesionEmail);
      if (!tokenGoogle.drive) throw err('sin_permiso', 'Para la copia en Drive tienes que marcar el permiso de Drive cuando Google lo pregunte.');
      return tokenGoogle.token;
    }
    const L = await prepararSociales();
    const r = await L.login({ provider: 'google', options: { scopes: [PLAN.sesion.googleAlcanceDrive] } });
    const t = r.result && r.result.accessToken && r.result.accessToken.token;
    if (!t) throw err('sin_permiso', 'Google no dio permiso para el respaldo.');
    return t;
  }
  async function driveFetch(token, url, op) {
    const r = await fetch(url, Object.assign({}, op, { headers: Object.assign({ Authorization: 'Bearer ' + token }, (op && op.headers) || {}) }));
    if (!r.ok) throw err('drive', 'Drive respondió ' + r.status);
    return r;
  }
  async function driveBuscar(token) {
    const q = encodeURIComponent("name='" + NOMBRE_RESPALDO + "'");
    const r = await (await driveFetch(token, 'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=' + q + '&fields=files(id,modifiedTime)')).json();
    return (r.files || [])[0] || null;
  }
  async function respaldoSubir(paquete) {
    const token = await tokenDrive(); const cuerpo = JSON.stringify(paquete);
    const f = await driveBuscar(token);
    if (f) { await driveFetch(token, 'https://www.googleapis.com/upload/drive/v3/files/' + f.id + '?uploadType=media', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: cuerpo }); return f.id; }
    const lim = 'af' + Date.now();
    const multi = '--' + lim + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify({ name: NOMBRE_RESPALDO, parents: ['appDataFolder'] })
      + '\r\n--' + lim + '\r\nContent-Type: application/json\r\n\r\n' + cuerpo + '\r\n--' + lim + '--';
    const r = await (await driveFetch(token, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + lim }, body: multi })).json();
    return r.id;
  }
  // opciones.soloSiHayPermiso: no pide nada a la persona; si no hay permiso a mano devuelve null (sirve para ofrecer recuperar una copia al entrar).
  async function respaldoInfo(opciones) {
    const silencioso = !!(opciones && opciones.soloSiHayPermiso);
    if (silencioso && esNativo()) return null;
    let token;
    try { token = await tokenDrive(esNativo() ? undefined : false); } catch (e) { if (silencioso) return null; throw e; }
    const f = await driveBuscar(token); return f ? { id: f.id, fecha: f.modifiedTime } : null;
  }
  async function respaldoBajar() {
    const token = await tokenDrive(); const f = await driveBuscar(token);
    if (!f) return null;
    return (await driveFetch(token, 'https://www.googleapis.com/drive/v3/files/' + f.id + '?alt=media')).json();
  }
  async function respaldoBorrar() {
    const token = await tokenDrive(); const f = await driveBuscar(token);
    if (f) await driveFetch(token, 'https://www.googleapis.com/drive/v3/files/' + f.id, { method: 'DELETE' });
    return !!f;
  }

  /* ------------------------------------------------------ versión web: instalar y guardar */
  let eventoInstalar = null; const oyentesInstalar = [];
  const instaladaComoApp = () => { try { return !!(g.matchMedia && g.matchMedia('(display-mode: standalone)').matches) || g.navigator.standalone === true || esNativo(); } catch (e) { return false; } };
  if (g.addEventListener && !esNativo()) {
    g.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); eventoInstalar = e; oyentesInstalar.forEach((f) => f()); });
    g.addEventListener('appinstalled', () => { eventoInstalar = null; oyentesInstalar.forEach((f) => f()); });
  }
  const instalacion = {
    instalada: instaladaComoApp,
    disponible: () => !!eventoInstalar && !instaladaComoApp(),
    alCambiar: (f) => { oyentesInstalar.push(f); },
    async instalar() { if (!eventoInstalar) return false; const ev = eventoInstalar; eventoInstalar = null; ev.prompt(); let r; try { r = await ev.userChoice; } catch (e) { return false; } oyentesInstalar.forEach((f) => f()); return !!r && r.outcome === 'accepted'; },
  };
  // Registra el sw.js (copia para abrir sin internet) y pide que el navegador NO borre los datos si falta espacio.
  function prepararWeb() {
    if (esNativo() || !g.navigator) return;
    try { if ('serviceWorker' in g.navigator && (g.location.protocol === 'https:' || esLocal())) g.navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* sin sw: la app funciona igual, solo que sin internet no abre */ }
    try { if (g.navigator.storage && g.navigator.storage.persist) g.navigator.storage.persist().catch(() => {}); } catch (e) { /* nada */ }
  }

  /* ----------------------------------------------------------------- varios */
  async function vibrar() { try { const H = plugin('Haptics'); if (H) await H.impact({ style: 'LIGHT' }); else if (g.navigator.vibrate) g.navigator.vibrate(10); } catch (e) { /* sin vibración */ } }
  function alVolverAPrimerPlano(alSalir, alEntrar) {
    const A = plugin('App');
    if (esNativo() && A) { A.addListener('appStateChange', (s) => (s.isActive ? alEntrar() : alSalir())); return; }
    g.document.addEventListener('visibilitychange', () => (g.document.hidden ? alSalir() : alEntrar()));
  }
  function alAbrirEnlace(cb) {                                             // asistente://voz  → abre el micrófono (widget de pantalla de inicio)
    const A = plugin('App');
    if (!esNativo() || !A) {                                               // versión web: atajo «Hablar» del ícono (manifest) abre ?voz=1
      try { if (new g.URLSearchParams(g.location.search).has('voz')) { g.history.replaceState(null, '', g.location.pathname); cb('asistente://voz'); } } catch (e) { /* sin atajo */ }
      return;
    }
    A.addListener('appUrlOpen', (d) => { if (/^asistente:\/\//.test(d.url || '')) cb(d.url); });
    A.getLaunchUrl && A.getLaunchUrl().then((d) => { if (d && /^asistente:\/\//.test(d.url || '')) cb(d.url); }).catch(() => {});
  }
  function botonAtras(cb) { const A = plugin('App'); if (esNativo() && A) A.addListener('backButton', cb); }
  async function salir() { const A = plugin('App'); if (A && A.exitApp) await A.exitApp(); }

  AF.nativo = { esNativo, esLocal, plugin, almacenNativo, proveedorListo, iniciarSesion, cerrarSesionSocial, huellaDisponible, secretosHuella, vozDisponible, escuchar, hablar, callar,
    leerTextoDeImagen, escucharCompartidos, permisoAvisos, programarAvisos, compartirTexto, entregarArchivo, comprarPro, restaurarCompras,
    respaldoSubir, respaldoInfo, respaldoBajar, respaldoBorrar, precargarWeb, prepararWeb, instalacion, vibrar, alVolverAPrimerPlano, alAbrirEnlace, botonAtras, salir, espera };
  if (typeof module === 'object' && module.exports) module.exports = AF.nativo;
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/ia.js ===== */
/* IA (solo Pro, con tope mensual): el teléfono NUNCA lleva la clave. Habla con un Worker propio que la guarda. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const PLAN = AF.PLAN;
  // Devuelve un resultado con la MISMA forma que AF.parser.interpretar, o null si no pudo (se queda con lo local).
  async function interpretar(texto, ctx) {
    if (!AF.acceso.iaDisponible()) return null;
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), PLAN.ia.tiempoMaxMs);
      const r = await fetch(PLAN.ia.urlWorker.replace(/\/$/, '') + '/interpretar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({ texto, hoy: ctx.hoy, moneda: AF.store.d.ajustes.moneda, pais: AF.store.d.ajustes.pais,
          categorias: ctx.categorias.map((c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo })), tarjetas: ctx.tarjetas.map((x) => ({ id: x.id, nombre: x.nombre })) }),
      });
      clearTimeout(t);
      if (!r.ok) return null;
      const j = await r.json();
      if (!j || !j.tipo) return null;
      AF.acceso.iaUsar();
      return normalizar(j, texto, ctx);
    } catch (e) { return null; }
  }
  // Aunque el Worker responda raro, aquí se valida: solo categorías y montos válidos pasan.
  function normalizar(j, texto, ctx) {
    if (j.tipo !== 'registrar') return Object.assign({ texto }, j);
    const items = (j.items || []).filter((i) => i && Number(i.monto) > 0).map((i) => {
      const cat = ctx.categorias.find((c) => c.id === i.cat && c.tipo === (i.tipo === 'ingreso' ? 'ingreso' : 'gasto')) || ctx.categorias.find((c) => c.id === (i.tipo === 'ingreso' ? 'otros_ingresos' : 'otros'));
      return { tipo: i.tipo === 'ingreso' ? 'ingreso' : 'gasto', monto: AF.util.r2(Number(i.monto)), cat: cat.id, catNombre: cat.nombre, catIcono: cat.icono, catConfianza: i.cat === cat.id ? 'media' : 'ninguna',
        desc: String(i.desc || '').slice(0, 60), fecha: /^\d{4}-\d{2}-\d{2}$/.test(i.fecha || '') ? i.fecha : ctx.hoy, nec: cat.nec || null, palabraNueva: null, cuenta: 'efectivo' };
    });
    if (!items.length) return null;
    return { tipo: 'registrar', items, dudas: items.some((i) => i.catConfianza === 'ninguna') ? ['categoria'] : [], partes: [{ texto, rol: '' }], texto, fecha: items[0].fecha };
  }
  AF.ia = { interpretar };
  if (typeof module === 'object' && module.exports) module.exports = AF.ia;
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/vistas/comun.js ===== */
/* Piezas compartidas por las pantallas: frase anotada, filas de movimientos, formulario de movimiento, confirmaciones, Pro. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, hoja, aviso, fila, campo } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const $ = (n, o) => U.dinero(n, o);
  const V = (AF.vistas = AF.vistas || {});

  /* ----------------------------------------------------------------- frase anotada */
  // partes: [{texto, rol}] del intérprete. Cada rol se marca con su color: tipo, monto, categoría, otro.
  function fraseAnotada(partes, tipo, animar) {
    const el = h('p', { class: 'frase' + (animar ? ' entra' : ''), 'aria-label': (partes || []).map((p) => p.texto).join(' ') });
    (partes || []).forEach((p, i) => {
      const clase = p.rol === 'monto' ? 'm m-monto' : p.rol === 'cat' ? 'm m-cat' : p.rol === 'tipo' ? 'm m-tipo' + (tipo === 'ingreso' ? ' ingreso' : '') : p.rol === 'otro' ? 'm m-otro' : '';
      el.appendChild(clase ? h('span', { class: clase }, p.texto) : g.document.createTextNode(p.texto));
      if (i < partes.length - 1) el.appendChild(g.document.createTextNode(' '));
    });
    return el;
  }

  /* ----------------------------------------------------------------------- movimientos */
  const catDe = (id) => AF.store.categoria(id);
  function subDeMov(m, hoy) {
    const c = catDe(m.cat), partes = [c.nombre];
    if (m.cuenta === 'tarjeta') {
      const t = AF.store.buscar('tarjetas', m.tarjetaId);
      partes.push(t ? t.nombre : 'Tarjeta');
      if (m.credito && m.credito.modo === 'diferido' && m.credito.meses) partes.push(m.credito.meses + ' cuotas');
    }
    if (hoy) partes.push(U.fechaCorta(m.fecha, hoy));
    return partes.join(' · ');
  }
  function filaMov(m, hoy, onclick, conFecha) {
    if (m.tipo === 'pago_tarjeta') {
      const t = AF.store.buscar('tarjetas', m.tarjetaId);
      return fila({ icono: '💳', titulo: 'Pago de ' + (t ? t.nombre : 'tarjeta'), sub: U.fechaCorta(m.fecha, hoy), derecha: h('span', { class: 'monto' }, $(m.monto)), onclick });
    }
    const c = catDe(m.cat);
    return fila({
      icono: c.icono, titulo: m.desc || c.nombre, sub: subDeMov(m, conFecha ? hoy : null),
      derecha: h('span', { class: 'monto ' + (m.tipo === 'ingreso' ? 'ingreso' : 'gasto') }, (m.tipo === 'ingreso' ? '+' : '−') + $(m.monto)), onclick,
    });
  }
  // Devuelve [{fecha, titulo, total, movs}] más reciente primero
  function agruparPorDia(movs, hoy) {
    const mapa = {};
    movs.forEach((m) => { (mapa[m.fecha] = mapa[m.fecha] || []).push(m); });
    return Object.keys(mapa).sort().reverse().map((f) => {
      const lista = mapa[f].sort((a, b) => b.creado - a.creado);
      const total = lista.reduce((s, m) => s + (m.tipo === 'gasto' ? -m.monto : m.tipo === 'ingreso' ? m.monto : 0), 0);
      return { fecha: f, titulo: U.cap(U.fechaCorta(f, hoy)), total, movs: lista };
    });
  }

  /* ------------------------------------------------------------------ confirmaciones */
  function confirmar(o) {
    return new Promise((res) => {
      let listo = false;
      const fin = (v) => { if (!listo) { listo = true; res(v); } };
      hoja({
        titulo: o.titulo, cuerpo: h('p', { class: 'suave', estilo: { marginTop: '6px' } }, o.texto), alCerrar: () => fin(false),
        acciones: [{ texto: o.no || 'Cancelar', clase: 'btn-borde', onclick: () => fin(false) }, { texto: o.si || 'Aceptar', clase: o.peligro ? 'btn-primario btn-peligro-fondo' : 'btn-primario', onclick: () => fin(true) }],
      });
    });
  }

  /* ----------------------------------------------------------------------------- Pro */
  function pedirPro(funcion) {
    const st = AF.acceso.estado();
    const texto = AF.acceso.explicacion(funcion);
    hoja({
      titulo: 'Esto es de Pro',
      cuerpo: h('div', null, h('p', { class: 'suave', estilo: { margin: '6px 0 0' } }, texto),
        st.tipo === 'gratis' && !AF.store.d.plan.inicioPrueba ? h('p', { class: 'texto-sm', estilo: { marginTop: '12px' } }, 'Pruébalo ' + PLAN.prueba.diasProGratis + ' días gratis, sin tarjeta.') : null),
      acciones: [{ texto: 'Ahora no', clase: 'btn-borde' }, { texto: 'Ver Pro', clase: 'btn-primario', onclick: () => AF.app.abrir('Pro', (c) => V.pro.render(c)) }],
    });
  }
  // Llegó al tope de Gratis de algo (tarjetas, límites, metas…): lo dice con el número y ofrece Pro.
  function pedirLimite(clave, singular, plural) {
    const n = PLAN.limites.gratis[clave], st = AF.acceso.estado();
    hoja({
      titulo: 'Llegaste al tope de Gratis',
      cuerpo: h('p', { class: 'suave', estilo: { marginTop: '6px' } }, 'En Gratis puedes tener ' + n + ' ' + (n === 1 ? singular : plural) + '. Con Pro no hay tope.' + (st.tipo === 'gratis' && !AF.store.d.plan.inicioPrueba ? ' Pruébalo ' + PLAN.prueba.diasProGratis + ' días gratis, sin tarjeta.' : '')),
      acciones: [{ texto: 'Ahora no', clase: 'btn-borde' }, { texto: 'Ver Pro', clase: 'btn-primario', onclick: () => AF.app.abrir('Pro', (c) => V.pro.render(c)) }],
    });
  }
  // Si no tiene la función, muestra la invitación a Pro y devuelve false.
  function requiere(funcion) { if (AF.acceso.tiene(funcion)) return true; pedirPro(funcion); return false; }
  const gancho = (texto, funcion) => h('button', { class: 'nota pro', type: 'button', onclick: () => pedirPro(funcion), estilo: { width: '100%', textAlign: 'left' } },
    ico('estrella', 'relleno'), h('span', null, texto, ' ', AF.ui.chipPro()));

  /* --------------------------------------------------------- selector de categoría */
  function selectorCategoria(tipo, valor, alCambiar) {
    const caja = h('div', { class: 'opciones' });
    const pintar = (sel) => {
      AF.ui.vaciar(caja);
      AF.store.categorias(tipo).forEach((c) => caja.appendChild(h('button', { type: 'button', class: 'opcion', 'aria-pressed': c.id === sel ? 'true' : 'false', onclick: () => { alCambiar(c.id); pintar(c.id); } }, c.icono + ' ' + c.nombre)));
    };
    pintar(valor);
    return caja;
  }

  /* ------------------------------------------------------------------ formulario */
  // Alta y edición manual. o = { mov?, inicial?, alGuardar(m), alBorrar() }
  function formMovimiento(o) {
    const hoy = AF.app.hoy();
    const edit = !!o.mov;
    const m0 = Object.assign({ tipo: 'gasto', monto: '', cat: null, desc: '', fecha: hoy, cuenta: 'efectivo', nec: undefined }, o.inicial || {}, o.mov || {});
    const e = { tipo: m0.tipo, cat: m0.cat, nec: m0.nec === undefined ? 'auto' : m0.nec === null ? 'auto' : m0.nec, cuenta: m0.cuenta || 'efectivo', tarjetaId: m0.tarjetaId || null,
      modo: (m0.credito && m0.credito.modo) || 'corriente', conInteres: m0.credito ? m0.credito.interes !== false : false, meses: (m0.credito && m0.credito.meses) || 6, cuota: (m0.credito && m0.credito.cuota) || '' };
    if (!e.cat) e.cat = AF.store.categorias(e.tipo).find((c) => c.id === (e.tipo === 'gasto' ? 'otros' : 'sueldo')).id;
    const monto = h('input', { class: 'entrada grande', inputmode: 'decimal', placeholder: '0', value: m0.monto === '' ? '' : String(m0.monto).replace('.', ','), 'aria-label': 'Monto' });
    const desc = h('input', { class: 'entrada', placeholder: 'Detalle (opcional)', value: m0.desc || '', maxlength: 80 });
    const fecha = h('input', { class: 'entrada', type: 'date', value: m0.fecha, max: U.sumarDias(hoy, 366) });
    const zonaTipo = h('div'), zonaCat = h('div'), zonaNec = h('div'), zonaCuenta = h('div'), err = h('div', { class: 'ayuda', estilo: { color: 'var(--gasto)', minHeight: '18px', marginTop: '8px' } });

    function pintar() {
      AF.ui.vaciar(zonaTipo); AF.ui.vaciar(zonaCat); AF.ui.vaciar(zonaNec); AF.ui.vaciar(zonaCuenta);
      zonaTipo.appendChild(h('div', { class: 'segmentos' }, [['gasto', 'Gasto'], ['ingreso', 'Ingreso']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': e.tipo === k ? 'true' : 'false', onclick: () => {
        if (e.tipo !== k) { e.tipo = k; e.cat = AF.store.categorias(k)[0].id; if (k === 'ingreso') e.cuenta = 'efectivo'; pintar(); }
      } }, t))));
      zonaCat.appendChild(campo('Categoría', selectorCategoria(e.tipo, e.cat, (id) => { e.cat = id; })));
      if (e.tipo === 'gasto') {
        zonaNec.appendChild(campo('¿Necesario o gusto?', h('div', { class: 'segmentos' }, [['auto', 'Automático'], ['N', 'Necesario'], ['G', 'Gusto']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': e.nec === k ? 'true' : 'false', onclick: () => { e.nec = k; pintar(); } }, t)))));
        const tarjetas = AF.store.d.tarjetas;
        if (tarjetas.length) {
          zonaCuenta.appendChild(campo('¿Con qué pagaste?', h('div', { class: 'segmentos' }, [['efectivo', 'Efectivo o débito'], ['tarjeta', 'Tarjeta de crédito']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': e.cuenta === k ? 'true' : 'false', onclick: () => { e.cuenta = k; if (k === 'tarjeta' && !e.tarjetaId) e.tarjetaId = tarjetas[0].id; pintar(); } }, t)))));
          if (e.cuenta === 'tarjeta') {
            const sel = h('select', { class: 'entrada', onchange: (ev) => { e.tarjetaId = ev.target.value; } }, tarjetas.map((t) => h('option', { value: t.id, selected: t.id === e.tarjetaId }, t.nombre)));
            zonaCuenta.appendChild(campo('Tarjeta', sel));
            const pro = AF.acceso.tiene('tarjetaDiferidoCuotas');
            zonaCuenta.appendChild(campo('Forma de pago', h('div', { class: 'opciones' }, [['corriente', 'Corriente'], ['diferido', PLAN.pais(AF.store.d.ajustes.pais).palabraCuotas === 'diferido' ? 'Diferido' : 'En cuotas']].map(([k, t]) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': e.modo === k ? 'true' : 'false', onclick: () => { if (k === 'diferido' && !pro) { pedirPro('tarjetaDiferidoCuotas'); return; } e.modo = k; pintar(); } }, t, k === 'diferido' && !pro ? AF.ui.chipPro() : null)))));
            if (e.modo === 'diferido') {
              zonaCuenta.appendChild(campo('¿Con intereses?', h('div', { class: 'segmentos' }, [[false, 'Sin intereses'], [true, 'Con intereses']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': e.conInteres === k ? 'true' : 'false', onclick: () => { e.conInteres = k; pintar(); } }, t)))));
              zonaCuenta.appendChild(campo('Meses', h('div', { class: 'opciones' }, PLAN.tarjetas.mesesComunes.map((n) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': e.meses === n ? 'true' : 'false', onclick: () => { e.meses = n; pintar(); } }, String(n))))));
              if (e.conInteres) zonaCuenta.appendChild(campo('Valor de la cuota (opcional)', h('input', { class: 'entrada', inputmode: 'decimal', placeholder: 'Si lo sabes, mejor', value: e.cuota === '' ? '' : String(e.cuota).replace('.', ','), oninput: (ev) => { e.cuota = ev.target.value; } }), 'Si no la pones, uso la tasa de tu tarjeta. Nunca invento una tasa.'));
            }
          }
        }
      }
    }
    pintar();

    const cuerpo = h('div', null, zonaTipo,
      campo('Monto', monto), zonaCat, campo('Detalle', desc), campo('Fecha', fecha), zonaNec, zonaCuenta, err);

    function leer() {
      const v = U.parseNumero(monto.value);
      if (!(v > 0)) { err.textContent = 'Escribe un monto mayor que cero.'; monto.focus(); return null; }
      if (!fecha.value) { err.textContent = 'Elige la fecha.'; return null; }
      const m = { tipo: e.tipo, monto: U.r2(v), cat: e.cat, desc: desc.value.trim(), fecha: fecha.value };
      if (e.tipo === 'gasto') {
        const c = catDe(e.cat);
        m.nec = e.nec === 'auto' ? (c.nec || null) : e.nec;
        m.cuenta = e.cuenta;
        if (e.cuenta === 'tarjeta') {
          m.tarjetaId = e.tarjetaId;
          m.credito = e.modo === 'diferido' ? { modo: 'diferido', meses: e.meses, interes: e.conInteres, cuota: e.conInteres && e.cuota !== '' ? U.parseNumero(e.cuota) : null } : { modo: 'corriente' };
        }
      }
      return m;
    }
    const acciones = [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => { const m = leer(); if (!m) return false; o.alGuardar(m); } }];
    if (edit) acciones.unshift({ texto: 'Eliminar', clase: 'btn-borde btn-peligro', onclick: () => { if (o.alBorrar) o.alBorrar(); } });
    return hoja({ titulo: edit ? 'Editar movimiento' : 'Agregar movimiento', cuerpo, acciones });
  }

  // Guardar / editar / borrar con aviso y "Deshacer"
  function guardarMov(m, existente) {
    const S = AF.store;
    if (existente) { S.editar('movs', existente.id, m, 'Cambié un movimiento'); aviso('Cambios guardados', { texto: 'Deshacer', onclick: () => S.deshacer() }); }
    else { S.agregar('movs', m, 'Agregué un movimiento'); aviso('Guardado', { texto: 'Deshacer', onclick: () => S.deshacer() }); }
  }
  function borrarMov(m) { AF.store.borrar('movs', m.id, 'Borré un movimiento'); aviso('Movimiento borrado', { texto: 'Deshacer', onclick: () => AF.store.deshacer() }); }
  function editarMov(m) {
    formMovimiento({ mov: m, alGuardar: (nuevo) => guardarMov(nuevo, m), alBorrar: () => { borrarMov(m); } });
  }

  V.comun = { pedirLimite, fraseAnotada, filaMov, subDeMov, agruparPorDia, confirmar, pedirPro, requiere, gancho, selectorCategoria, formMovimiento, guardarMov, borrarMov, editarMov, catDe };
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/vistas/acceso-pantallas.js ===== */
/* Primera pantalla (Google / Facebook), bienvenida, creación de PIN, huella y pantalla de bloqueo. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, hoja, aviso, campo } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN, Sg = () => AF.seguridad, N = () => AF.nativo;
  const V = (AF.vistas = AF.vistas || {});
  const d = g.document;

  /* ------------------------------------------------------------------- teclado de PIN */
  // o = { titulo, sub, len, alCompletar(pin) -> Promise<{ok, mensaje}>, huella: fn|null, arriba: Node, pie: [Node] }
  function pantallaPin(o) {
    let pin = '', ocupado = false, len = o.len;
    const puntos = h('div', { class: 'pin-puntos', role: 'img' });
    const error = h('div', { class: 'pin-error', role: 'alert' });
    const pintar = () => {
      AF.ui.vaciar(puntos);
      for (let i = 0; i < len; i++) puntos.appendChild(h('i', { class: i < pin.length ? 'lleno' : '' }));
      puntos.setAttribute('aria-label', pin.length + ' de ' + len + ' dígitos');
    };
    async function enviar() {
      ocupado = true;
      const r = await o.alCompletar(pin);
      ocupado = false;
      if (r && r.ok) return;
      error.textContent = (r && r.mensaje) || 'Intenta otra vez.';
      puntos.classList.remove('error'); void puntos.offsetWidth; puntos.classList.add('error');
      N().vibrar();
      setTimeout(() => { pin = ''; pintar(); }, 380);
    }
    function digito(c) {
      if (ocupado || pin.length >= len) return;
      error.textContent = ''; pin += c; pintar();
      if (pin.length === len) enviar();
    }
    const borrar = () => { if (ocupado) return; pin = pin.slice(0, -1); error.textContent = ''; pintar(); };
    const tecla = (c) => h('button', { class: 'tecla', type: 'button', 'aria-label': c, onclick: () => digito(c) }, c);
    const teclado = h('div', { class: 'teclado' },
      ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(tecla),
      o.huella ? h('button', { class: 'tecla accion', type: 'button', 'aria-label': 'Usar huella', onclick: o.huella }, ico('huella')) : h('span', { class: 'tecla vacia' }),
      tecla('0'),
      h('button', { class: 'tecla accion', type: 'button', onclick: borrar }, 'Borrar'));
    const el = h('main', { class: 'pantalla-pin' }, AF.ui.logoApp(64),
      h('h1', { class: 'h1' }, o.titulo), o.sub ? h('p', { class: 'suave' }, o.sub) : null, o.arriba || null, puntos, error, teclado,
      h('div', { estilo: { marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', paddingTop: '8px' } }, o.pie || []));
    pintar();
    const teclas = (ev) => {
      if (!el.isConnected) { d.removeEventListener('keydown', teclas); return; }
      if (/^\d$/.test(ev.key)) digito(ev.key); else if (ev.key === 'Backspace') borrar();
    };
    d.addEventListener('keydown', teclas);
    return { el, cambiarLargo(n) { len = n; pin = ''; pintar(); }, limpiar() { pin = ''; pintar(); }, error: (t) => { error.textContent = t; } };
  }

  /* ---------------------------------------------------------------------- portada */
  // Una sola pantalla continua: logo grande, nombre, una línea de qué hace, y los botones. Sin tarjetas ni dibujos.
  function portada() {
    const app = AF.app;
    app.pantalla(null);
    const mensaje = h('p', { class: 'texto-sm', role: 'alert', estilo: { color: '#FF9C9C', minHeight: '20px', textAlign: 'center' } });

    async function entrar(prov, boton) {
      mensaje.textContent = '';
      boton.disabled = true;
      try { await app.iniciarSesion(await N().iniciarSesion(prov)); }
      catch (e) { if (e.codigo !== 'cancelado') mensaje.textContent = e.message || 'No pude iniciar sesión.'; boton.disabled = false; }
    }
    const bG = h('button', { class: 'btn btn-bloque btn-google', type: 'button', onclick: () => entrar('google', bG) }, AF.ui.logoGoogle(), 'Continuar con Google');
    const bF = h('button', { class: 'btn btn-bloque', type: 'button', estilo: { background: '#1877F2', color: '#fff' }, onclick: () => entrar('facebook', bF) }, h('span', { estilo: { display: 'grid', placeItems: 'center', width: '22px', height: '22px', background: '#fff', borderRadius: '50%' } }, AF.ui.logoFacebook()), 'Continuar con Facebook');
    const botones = PLAN.sesion.proveedores.map((p) => (p === 'google' ? bG : bF));
    const demo = (PLAN.sesion.permitirSinCuenta || N().esLocal()) && !N().esNativo()
      ? h('button', { class: 'btn-texto', type: 'button', onclick: () => app.iniciarSesion({ proveedor: 'demo', id: 'local', nombre: '', email: '' }) }, 'Probar sin cuenta') : null;
    N().precargarWeb();                                  // deja listas las ventanas de Google/Facebook para el toque del botón
    // Instalar como app (solo en el navegador; si ya está instalada no aparece)
    const instalar = h('div', { estilo: { textAlign: 'center' } });
    const pintarInstalar = () => {
      AF.ui.vaciar(instalar);
      if (N().esNativo() || N().instalacion.instalada()) return;
      instalar.appendChild(N().instalacion.disponible()
        ? h('button', { class: 'btn-texto', type: 'button', onclick: async () => { await N().instalacion.instalar(); pintarInstalar(); } }, 'Instalar en este teléfono')
        : h('p', { class: 'portada-legal' }, 'Para instalarla: menú ⋮ de Chrome → «Instalar aplicación».'));
    };
    pintarInstalar(); N().instalacion.alCambiar(() => { if (instalar.isConnected) pintarInstalar(); });

    const el = h('main', { class: 'portada' },
      h('div', { class: 'portada-marca' }, AF.ui.logoApp(176), h('h1', { class: 'portada-nombre' }, PLAN.app.nombre),
        h('p', { class: 'portada-sub' }, 'Dilo con tu voz. Lo registro, lo ordeno y te digo cuánto puedes gastar hoy.')),
      h('div', { class: 'portada-acciones' }, botones, mensaje, demo, instalar,
        h('p', { class: 'portada-legal' }, 'Tus datos se guardan cifrados en este teléfono. Entrar con tu cuenta solo sirve para reconocerte (con Google, además, para guardar tu copia en tu propio Drive); no leemos tu banco ni tu correo.')));
    app.pantalla(el);
  }

  /* -------------------------------------------------------------------- bienvenida */
  function bienvenida(sesion) {
    const app = AF.app;
    const p0 = PLAN.pais(PLAN.app.paisInicial);
    const r = { nombre: (sesion && sesion.nombre) || '', pais: p0.codigo, moneda: p0.moneda, diaCobro: PLAN.bienvenida.diaCobroDefecto, sueldo: null, cargas: 0, tarjetas: [] };
    const pasos = () => PLAN.bienvenida.preguntas.filter((k) => !(k === 'cargas' && PLAN.bienvenida.cargasSoloSiSRI && !PLAN.pais(r.pais).sri));
    let k = 0;

    function mostrar() {
      const lista = pasos(), clave = lista[k];
      const total = lista.length + 1;                    // +1: crear PIN
      const cabeza = h('div', { class: 'paso-cabeza' }, h('div', { class: 'pasos', 'aria-label': 'Paso ' + (k + 1) + ' de ' + total }, Array.from({ length: total }, (_, i) => h('i', { class: i <= k ? 'hecho' : '' }))));
      let cuerpo, validar = () => true, opcional = false, titulo, sub, textoSiguiente = 'Siguiente', alSaltar = () => { r.sueldo = null; };
      const siguiente = () => { if (!validar()) return; if (k + 1 >= lista.length) pasoPin(); else { k++; mostrar(); } };

      if (clave === 'nombre') {
        titulo = '¿Cómo te llamo?'; sub = 'Para saludarte. Solo se queda en tu teléfono.';
        const inp = h('input', { class: 'entrada grande', value: r.nombre, placeholder: 'Tu nombre', autocomplete: 'given-name', maxlength: 30, oninput: (e) => { r.nombre = e.target.value; }, onkeydown: (e) => { if (e.key === 'Enter') siguiente(); } });
        cuerpo = campo('Nombre', inp); setTimeout(() => inp.focus(), 80);
        validar = () => { r.nombre = r.nombre.trim(); if (!r.nombre) { inp.focus(); return false; } return true; };
      } else if (clave === 'pais') {
        titulo = '¿Dónde vives?'; sub = 'Así uso las palabras de tu país (diferido, cuotas…) y tu moneda.';
        const zona = h('div');
        let filtroPais = '';
        const inpBusca = h('input', { class: 'entrada', type: 'search', placeholder: '🔍 Buscar país…', 'aria-label': 'Buscar país', style: 'margin-top:8px', oninput: (e) => { filtroPais = U.norm(e.target.value); pint(); } });
        const pint = () => {
          AF.ui.vaciar(zona);
          zona.appendChild(inpBusca);
          const filtrados = PLAN.paises.filter((p) => !filtroPais || U.norm(p.nombre).includes(filtroPais));
          const lista = h('div', { style: 'max-height:220px;overflow-y:auto;border:2px solid var(--linea);border-radius:12px;margin-top:8px' },
            filtrados.map((p) => h('button', {
              type: 'button',
              style: 'display:flex;align-items:center;width:100%;padding:12px 16px;border:0;border-bottom:1px solid var(--linea);background:' + (r.pais === p.codigo ? 'var(--panel-suave)' : 'var(--hoja)') + ';color:' + (r.pais === p.codigo ? 'var(--acento)' : 'var(--texto)') + ';font-weight:' + (r.pais === p.codigo ? '700' : '400') + ';font-size:var(--t-md);text-align:left;cursor:pointer',
              onclick: () => { r.pais = p.codigo; r.moneda = p.moneda; filtroPais = ''; inpBusca.value = ''; pint(); },
            }, (r.pais === p.codigo ? '✓ ' : '') + p.nombre)));
          zona.appendChild(lista);
          zona.appendChild(campo('Moneda', h('div', { class: 'opciones', style: 'margin-top:4px' }, Object.keys(PLAN.monedas).map((m) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': r.moneda === m ? 'true' : 'false', onclick: () => { r.moneda = m; pint(); } }, PLAN.monedas[m].simbolo + ' ' + m)))));
        };
        pint(); cuerpo = zona;
      } else if (clave === 'moneda') {
        return (k++, mostrar());                          // ya se eligió junto con el país
      } else if (clave === 'diaCobro') {
        titulo = '¿Qué día te pagan?'; sub = 'Con esto calculo cuánto puedes gastar por día hasta tu próximo cobro.';
        const inp = h('input', { class: 'entrada grande', inputmode: 'numeric', value: r.diaCobro, maxlength: 2, 'aria-label': 'Día del mes', oninput: (e) => { r.diaCobro = Number(e.target.value.replace(/\D/g, '')) || 0; } });
        cuerpo = h('div', null, campo('Día del mes (1 a 31)', inp), h('div', { class: 'opciones', estilo: { marginTop: '12px' } }, [1, 5, 10, 15, 20, 25, 30].map((n) => h('button', { type: 'button', class: 'opcion', onclick: () => { r.diaCobro = n; inp.value = n; } }, 'Día ' + n))));
        validar = () => { if (!(r.diaCobro >= 1 && r.diaCobro <= 31)) { inp.focus(); return false; } return true; };
      } else if (clave === 'sueldo') {
        titulo = '¿Cuánto cobras al mes?'; sub = 'Es opcional. Sirve para la primera cuenta de «cuánto puedes gastar hoy». Luego tus ingresos reales mandan.';
        opcional = true;
        const inp = h('input', { class: 'entrada grande', inputmode: 'decimal', placeholder: PLAN.monedas[r.moneda].simbolo + ' 0', value: r.sueldo || '', 'aria-label': 'Ingreso mensual', oninput: (e) => { r.sueldo = U.parseNumero(e.target.value); } });
        cuerpo = campo('Ingreso mensual', inp);
      } else if (clave === 'cargas') {
        titulo = '¿Cuántas cargas familiares tienes?'; sub = 'Hijos u otras personas que dependen de ti. Con esto calculo la rebaja de impuestos (SRI) por gastos personales.';
        cuerpo = h('div', { class: 'opciones', estilo: { marginTop: '12px' } }, [0, 1, 2, 3, 4, 5].map((n) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': r.cargas === n ? 'true' : 'false', onclick: (e) => { r.cargas = n; e.currentTarget.parentNode.querySelectorAll('.opcion').forEach((b, i) => b.setAttribute('aria-pressed', i === n ? 'true' : 'false')); } }, n === 5 ? '5 o más' : String(n))));
      } else if (clave === 'tarjetas') {
        titulo = '¿Tienes tarjeta de crédito?'; sub = 'Dime cuál es y te muestro lo que cobra el banco: avances, diferidos, renovación. Si no tienes, sigue.';
        const zona = h('div', { estilo: { marginTop: '16px' } });
        const pint = () => {
          AF.ui.vaciar(zona);
          const t = r.tarjetas[0];
          if (t) {
            const b = AF.bancos.buscar(t.bancoId);
            zona.appendChild(h('div', { class: 'tarjeta-previa grande' }, AF.ui.insigniaBanco(b || { id: '', nombre: t.banco || t.nombre, corto: t.banco || '+' }, 52),
              h('div', { class: 'tarjeta-previa-texto' }, h('strong', null, t.nombre), h('span', null, [t.banco, t.red, t.nivel].filter(Boolean).join(' · ')))));
            zona.appendChild(h('div', { estilo: { display: 'flex', gap: '10px', marginTop: '12px' } },
              h('button', { class: 'btn btn-borde', type: 'button', estilo: { flex: 1 }, onclick: () => abrir(t) }, 'Cambiar'),
              h('button', { class: 'btn btn-borde', type: 'button', estilo: { flex: 1 }, onclick: () => { r.tarjetas = []; pint(); mostrarBoton(); } }, 'Quitar')));
            zona.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '14px' } }, 'Las demás tarjetas las agregas desde la pestaña Tarjetas.'));
          } else {
            zona.appendChild(h('button', { class: 'btn btn-voz btn-bloque', type: 'button', onclick: () => abrir(null) }, 'Sí, agregar mi tarjeta'));
            zona.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '14px' } }, 'Eliges el banco, la red (Visa, Mastercard…) y el nivel. Los datos del estado de cuenta los puedes poner ahora o después.'));
          }
        };
        const abrir = (t) => AF.vistas.tarjetas.asistente({ pais: r.pais, tarjeta: t, textoGuardar: 'Listo', alGuardar: (o) => { r.tarjetas = [o]; pint(); mostrarBoton(); } });
        const mostrarBoton = () => { const bt = document.querySelector('[data-siguiente]'); if (bt) bt.textContent = r.tarjetas.length ? 'Siguiente' : 'No tengo tarjeta'; };
        pint(); cuerpo = zona; textoSiguiente = r.tarjetas.length ? 'Siguiente' : 'No tengo tarjeta'; alSaltar = () => { r.tarjetas = []; };
      }
      const pie = h('div', { estilo: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 var(--margen) calc(20px + env(safe-area-inset-bottom))', marginTop: 'auto' } },
        h('button', { class: 'btn btn-primario btn-bloque', type: 'button', 'data-siguiente': '', onclick: siguiente }, textoSiguiente),
        opcional ? h('button', { class: 'btn-texto', type: 'button', onclick: () => { alSaltar(); k + 1 >= lista.length ? pasoPin() : (k++, mostrar()); } }, 'Saltar') : null);
      const atras = k > 0 ? h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Atrás', onclick: () => { k = Math.max(0, k - 1); mostrar(); } }, ico('atras')) : null;
      app.pantalla(h('main', { class: 'pantalla' }, cabeza,
        h('div', { class: 'contenido-solo', estilo: { flex: 1 } }, atras, h('h1', { class: 'h1', estilo: { marginTop: '8px' } }, titulo), h('p', { class: 'suave', estilo: { marginTop: '8px' } }, sub), cuerpo), pie));
    }

    /* ---- crear PIN (último paso) */
    function pasoPin() {
      let len = PLAN.sesion.pinMin, primero = null;
      const segm = h('div', { class: 'segmentos', estilo: { marginTop: '18px', width: '220px' } },
        [PLAN.sesion.pinMin, PLAN.sesion.pinMax].map((n) => h('button', { type: 'button', 'aria-pressed': n === len ? 'true' : 'false', onclick: (e) => { len = n; vista.cambiarLargo(n); segm.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === e.currentTarget ? 'true' : 'false')); } }, n + ' dígitos')));
      const vista = pantallaPin({
        titulo: 'Crea tu PIN', sub: 'Opcional. Si no quieres PIN, entra sin él (tus datos siguen cifrados).', len, arriba: segm,
        pie: [
          h('button', { class: 'btn-texto', type: 'button', onclick: () => { k = pasos().length - 1; mostrar(); } }, 'Volver'),
          h('button', { class: 'btn-texto', type: 'button', style: 'margin-top:4px;opacity:0.7', onclick: async () => {
            try { await app.crearCuenta({ ajustes: r, pin: null }); }
            catch (e) { /* ya se manejó */ }
          } }, 'Continuar sin PIN'),
        ],
        alCompletar: async (pin) => {
          if (primero === null) {
            if (Sg().pinDebil(pin)) return { ok: false, mensaje: 'Ese PIN es muy fácil de adivinar. Prueba otro.' };
            primero = pin; segm.classList.add('oculto');
            vista.el.querySelector('h1').textContent = 'Repite tu PIN'; vista.limpiar(); return { ok: true };
          }
          if (pin !== primero) { primero = null; segm.classList.remove('oculto'); vista.el.querySelector('h1').textContent = 'Crea tu PIN'; return { ok: false, mensaje: 'No coinciden. Empieza de nuevo.' }; }
          try { await app.crearCuenta({ ajustes: r, pin }); }
          catch (e) { primero = null; return { ok: false, mensaje: 'No pude guardar tu PIN. Intenta otra vez.' }; }
          return { ok: true };
        },
      });
      app.pantalla(vista.el);
    }
    mostrar();
  }

  /* ------------------------------------------------------------- oferta de huella */
  async function ofrecerHuella() {
    const app = AF.app;
    if (!(await N().huellaDisponible())) return;
    return new Promise((res) => {
      const msg = h('p', { class: 'pin-error' });
      const el = h('main', { class: 'pantalla-pin' }, AF.ui.logoApp(64),
        h('h1', { class: 'h1' }, '¿Entrar con tu huella?'),
        h('p', { class: 'suave' }, 'Abres la app con un toque. El PIN sigue sirviendo siempre.'),
        h('div', { estilo: { margin: '36px 0 12px', color: 'var(--voz)' } }, ico('huella', 'grande')), msg,
        h('div', { estilo: { marginTop: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' } },
          h('button', { class: 'btn btn-voz btn-bloque', type: 'button', onclick: async (e) => {
            e.currentTarget.disabled = true;
            try { await Sg().activarHuella(app.ns, N().secretosHuella); aviso('Huella activada'); res(true); }
            catch (er) { msg.textContent = 'No pude activarla. Puedes hacerlo luego en Más → Ajustes.'; setTimeout(() => res(false), 1600); }
          } }, 'Activar huella'),
          h('button', { class: 'btn-texto', type: 'button', onclick: () => res(false) }, 'Ahora no')));
      el.querySelector('.ico-svg').style.cssText = 'width:96px;height:96px;stroke-width:1.3';
      app.pantalla(el);
    });
  }

  /* ----------------------------------------------------------------------- bloqueo */
  async function bloqueo() {
    const app = AF.app;
    const ns = app.ns;

    // Cuenta creada sin PIN: entrar automáticamente con el auto-PIN guardado.
    const autoPin = Sg().obtenerAutoPin(ns);
    if (autoPin) {
      const r = await Sg().abrirConPin(ns, autoPin);
      if (r.ok) { await app.entrar(); return; }
      // Si falló (localStorage borrado), mostrar pantalla de error limpia
    }

    const len = await Sg().longitudPin(ns);
    const nombre = (app.sesion && app.sesion.nombre) || '';
    const conHuella = (await Sg().huellaActiva(ns)) && (await N().huellaDisponible());
    let vista;
    async function intentarHuella() {
      const r = await Sg().abrirConHuella(ns, N().secretosHuella);
      if (r.ok) await app.entrar();
    }
    async function enEspera() {
      const e = await Sg().estadoIntentos(ns);
      if (e.espera > 0) vista.error('Demasiados intentos. Espera ' + e.espera + ' s.');
    }
    vista = pantallaPin({
      titulo: nombre ? 'Hola, ' + nombre : 'Bienvenido de nuevo', sub: 'Escribe tu PIN para entrar.', len,
      huella: conHuella ? intentarHuella : null,
      pie: [h('button', { class: 'btn-texto', type: 'button', onclick: () => olvidePin() }, '¿Olvidaste tu PIN?')],
      alCompletar: async (pin) => {
        const r = await Sg().abrirConPin(ns, pin);
        if (r.ok) { await app.entrar(); return { ok: true }; }
        if (r.motivo === 'espera') return { ok: false, mensaje: 'Demasiados intentos. Espera ' + r.espera + ' s.' };
        return { ok: false, mensaje: 'PIN incorrecto. Te quedan ' + r.restantes + ' intentos.' };
      },
    });
    app.pantalla(vista.el);
    enEspera();
    if (conHuella && !app.sinHuellaAuto) setTimeout(intentarHuella, 350);
  }
  function olvidePin() {
    const app = AF.app;
    hoja({
      titulo: '¿Olvidaste tu PIN?',
      cuerpo: h('div', null,
        h('p', { class: 'suave', estilo: { marginTop: '6px' } }, 'Tus datos están cifrados con tu PIN: nadie puede recuperarlos sin él, ni siquiera nosotros.'),
        h('p', { class: 'suave', estilo: { marginTop: '10px' } }, 'Si tenías copia en Google Drive, puedes empezar de nuevo y restaurarla (te pedirá el PIN que usabas cuando la hiciste).')),
      acciones: [
        { texto: 'Volver', clase: 'btn-borde' },
        { texto: 'Borrar y empezar de nuevo', clase: 'btn-primario', onclick: async () => {
          if (await V.comun.confirmar({ titulo: '¿Borrar todo?', texto: 'Se borran los datos de esta cuenta en este teléfono. No se puede deshacer.', si: 'Sí, borrar', peligro: true })) await app.reiniciarCuenta();
        }, cierra: true },
      ],
    });
  }

  V.acceso = { portada, bienvenida, ofrecerHuella, bloqueo, pantallaPin };
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/vistas/inicio.js ===== */
/* Inicio: «cuánto puedes gastar hoy», alertas, necesario vs gusto, hormiga y últimos movimientos. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, fila } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const $ = (n) => U.dinero(n);
  const C = () => V.comun;

  const SUGERENCIAS = ['Pagué 30 dólares de luz', 'Me pagaron el sueldo, 1.200', 'Cuánto gasté este mes'];

  function horizonte(D, hoy) {
    const modo = AF.acceso.tiene('puedesGastarHoyCompleto') ? 'completo' : 'simple';
    const p = AF.informes.puedesGastarHoy(D, hoy, modo);
    const nombre = D.ajustes.nombre || '';
    const hora = new Date().getHours();
    const saludo = (hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches') + (nombre ? ', ' + nombre : '') + (hora < 6 ? ' 🌙' : hora < 12 ? ' ☀️' : hora < 19 ? ' 🌤️' : ' 🌙');
    const cab = h('div', { class: 'saludo' },
      h('div', { class: 'avatar', 'aria-hidden': 'true' }, (nombre || '·').charAt(0).toUpperCase()),
      h('div', { class: 'saludo-texto' }, saludo),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Ajustes', onclick: () => AF.app.abrir('Ajustes', (c) => V.mas.ajustes(c)) }, ico('ajustes')));
    const el = h('section', { class: 'horizonte', 'aria-label': 'Resumen financiero' }, cab);

    if (!p.ingresos) {
      el.appendChild(h('div', { class: 'cifra-bloque' },
        h('div', { class: 'cifra-etiqueta' }, 'Sin ingreso registrado'),
        h('div', { class: 'cifra' }, '—'),
        h('p', { class: 'cifra-pie suave' }, 'Registra tu sueldo y te digo cuánto te queda hasta tu cobro.'),
        h('button', { class: 'btn btn-voz', type: 'button', estilo: { marginTop: '18px' }, onclick: () => C().formMovimiento({ inicial: { tipo: 'ingreso', cat: 'sueldo', monto: D.ajustes.sueldo || '' }, alGuardar: (m) => C().guardarMov(m) }) }, 'Registrar mi sueldo')));
      return el;
    }

    // Número principal: lo que queda hasta el cobro (siempre positivo o cero)
    const cobro = U.deISO(p.proximo).getDate() + ' de ' + U.nombreMes(p.proximo);
    const restoPositivo = Math.max(0, p.resto);
    const sinDinero = p.resto <= 0;
    const usado = p.ingresos > 0 ? Math.min(1, Math.max(0, (p.gastadoAntes + p.gastadoHoy + p.fijos + p.cuotas + p.metas) / p.ingresos)) : 0;
    const diasTexto = p.dias === 1 ? '1 día' : p.dias + ' días';

    el.appendChild(h('div', { class: 'cifra-bloque' },
      h('div', { class: 'cifra-etiqueta' }, sinDinero ? 'Sin saldo hasta el cobro' : 'Disponible hasta el ' + cobro),
      h('div', { class: 'cifra' + (sinDinero ? ' pasado' : ''), 'aria-live': 'polite' }, h('span', { class: 'cambio-cifra' }, $(restoPositivo))),
      h('p', { class: 'cifra-pie suave' }, sinDinero
        ? 'Tu cobro es el ' + cobro + '.'
        : diasTexto + (p.dias > 0 ? ' · ' + $(Math.round(restoPositivo / p.dias)) + ' por día' : ''))));

    // Barra de progreso
    el.appendChild(h('div', { class: 'avance' + (usado > 0.85 ? ' alerta' : ''), role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(usado * 100), 'aria-label': 'Del ingreso usado' }, h('i', { estilo: { width: Math.round(usado * 100) + '%' } })));

    // Fila ingresos / gastos
    el.appendChild(h('div', { class: 'dos-datos' },
      h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Ingresos'), h('div', { class: 'dato-valor' }, $(p.ingresos))),
      h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Gastos'), h('div', { class: 'dato-valor' }, $(p.gastadoAntes + p.gastadoHoy)))));

    // Notas pequeñas (pagos fijos, cuotas, metas)
    if (p.fijos || p.cuotas || p.metas) {
      const notas = [];
      if (p.fijos) notas.push($(p.fijos) + ' en pagos fijos');
      if (p.cuotas) notas.push($(p.cuotas) + ' en cuotas');
      if (p.metas) notas.push($(p.metas) + ' para metas');
      el.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '10px' } }, 'Ya aparté: ' + notas.join(' · ') + '.'));
    }
    return el;
  }

  function seccionResumenMes(D, hoy) {
    // Resumen compacto del mes: necesario vs gusto, solo si hay datos
    const t = AF.informes.totales(D, U.inicioMes(hoy), U.finMes(hoy));
    const tot = t.nec.N + t.nec.G + t.nec.sin;
    if (!tot) return null;
    const pc = (v) => tot > 0 ? Math.round((v / tot) * 100) : 0;
    return h('section', { class: 'seccion' },
      h('div', { class: 'seccion-cabeza' },
        h('h2', { class: 'h2' }, 'Este mes'),
        h('button', { class: 'enlace', type: 'button', onclick: () => AF.app.ir('movimientos') }, 'Ver detalle')),
      h('div', { class: 'barra-dividida', role: 'img', 'aria-label': 'Necesario ' + pc(t.nec.N) + '%, gusto ' + pc(t.nec.G) + '%' },
        t.nec.N ? h('i', { class: 'seg-nec', estilo: { flex: t.nec.N } }) : null,
        t.nec.G ? h('i', { class: 'seg-gus', estilo: { flex: t.nec.G } }) : null,
        t.nec.sin ? h('i', { class: 'seg-sin', estilo: { flex: t.nec.sin } }) : null),
      h('div', { class: 'dos-datos', estilo: { marginTop: '10px' } },
        h('div', null,
          h('div', { class: 'dato-etiqueta suave' }, '🔵 Necesario'),
          h('div', { class: 'dato-valor' }, $(t.nec.N) + ' · ' + pc(t.nec.N) + '%')),
        h('div', null,
          h('div', { class: 'dato-etiqueta suave' }, '🟠 Gusto'),
          h('div', { class: 'dato-valor' }, $(t.nec.G) + ' · ' + pc(t.nec.G) + '%'))));
  }

  function seccionHormiga(D, hoy) {
    const hm = AF.informes.hormiga(D, U.inicioMes(hoy), U.finMes(hoy));
    if (!hm.veces) return null;
    const pro = AF.acceso.tiene('hormigaDetalle');
    return h('section', { class: 'seccion' },
      h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Gastos hormiga')),
      fila({ icono: '🐜', titulo: $(hm.total) + ' este mes', sub: hm.veces + (hm.veces === 1 ? ' compra pequeña' : ' compras pequeñas') + ' · al año serían ' + $(hm.alAnio), derecha: pro ? ico('derecha') : AF.ui.chipPro(),
        onclick: () => (pro ? AF.app.abrir('Gastos hormiga', (c) => V.informesUI.hormiga(c)) : C().pedirPro('hormigaDetalle')) }));
  }

  function seccionUltimos(D, hoy) {
    const movs = D.movs.slice().sort((a, b) => (b.fecha === a.fecha ? b.creado - a.creado : b.fecha < a.fecha ? -1 : 1)).slice(0, 5);
    if (!movs.length) {
      return h('section', { class: 'seccion' }, h('div', { class: 'vacio' }, h('strong', null, 'Aquí aparecerán tus movimientos'), 'Toca el micrófono y dilo como lo dirías:',
        h('div', { class: 'opciones', estilo: { marginTop: '14px' } }, SUGERENCIAS.map((s) => h('button', { class: 'opcion', type: 'button', onclick: () => V.voz.abrir({ modo: 'texto', texto: s }) }, '«' + s + '»')))));
    }
    return h('section', { class: 'seccion' },
      h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Últimos movimientos'), h('button', { class: 'enlace', type: 'button', onclick: () => AF.app.ir('movimientos') }, 'Ver todo')),
      h('div', { class: 'lista' }, movs.map((m) => C().filaMov(m, hoy, () => C().editarMov(m), true))));
  }

  function render(cont) {
    const D = AF.store.d, hoy = AF.app.hoy();
    cont.appendChild(horizonte(D, hoy));
    const cuerpo = h('div', { class: 'contenido' });
    const st = AF.acceso.estado(hoy);
    if (st.tipo === 'prueba') cuerpo.appendChild(h('button', { class: 'nota pro', type: 'button', estilo: { width: '100%', textAlign: 'left', marginTop: '20px' }, onclick: () => AF.app.abrir('Pro', (c) => V.pro.render(c)) },
      ico('estrella', 'relleno'), h('span', null, h('strong', null, 'Pro gratis: ' + (st.diasPrueba === 1 ? 'te queda 1 día' : 'te quedan ' + st.diasPrueba + ' días') + '. '), 'Mira qué conservas después.')));
    AF.informes.alertas(D, hoy, AF.acceso.tiene('alertasPredictivas')).slice(0, 2).forEach((a) => {
      cuerpo.appendChild(h('div', { class: 'nota', estilo: { marginTop: '16px' }, role: 'status' }, ico('alerta'), h('span', null, a.texto)));
    });
    [seccionResumenMes(D, hoy), seccionHormiga(D, hoy), seccionUltimos(D, hoy)].forEach((s) => s && cuerpo.appendChild(s));
    cuerpo.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '28px', textAlign: 'center' } }, PLAN.app.avisoLegal));
    cont.appendChild(cuerpo);
  }

  V.inicio = { render };
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/vistas/voz.js ===== */
/* El botón único: habla o escribe. Muestra lo que entendió ANTES de guardar, responde preguntas, corrige y aprende. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, hoja, aviso } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const d = g.document;
  const $ = (n) => U.dinero(n);
  const S = () => AF.store, N = () => AF.nativo, C = () => V.comun;

  let capa = null, escucha = null, vivo = false;

  const ctx = () => ({ hoy: AF.app.hoy(), categorias: S().categorias(), dicc: S().d.diccionario, tarjetas: S().d.tarjetas });
  const hablar = (t) => { if (S().d.ajustes.respuestaVoz) N().hablar(t); };

  /* ------------------------------------------------------------- diálogos pequeños */
  function dialogo(titulo, construir, acciones) {
    return new Promise((res) => {
      let listo = false, api = null;
      const fin = (v) => { if (!listo) { listo = true; res(v); } };
      const cierra = () => api && api.cerrar();
      api = hoja({ titulo, cuerpo: construir(fin, cierra), alCerrar: () => fin(null), acciones: (acciones || []).map((a) => Object.assign({}, a, { onclick: () => (a.onclick ? a.onclick(fin) : undefined) })) });
    });
  }
  const elegirCategoria = (tipo, actual) => dialogo('¿En qué categoría va?', (fin, cierra) => h('div', { estilo: { marginTop: '12px' } }, C().selectorCategoria(tipo, actual, (id) => { fin(id); cierra(); })));
  function pedirNumero(titulo, actual, ayuda) {
    return dialogo(titulo, (fin, cierra) => {
      const inp = h('input', { class: 'entrada grande', inputmode: 'decimal', value: actual == null ? '' : String(actual).replace('.', ','), 'aria-label': titulo });
      setTimeout(() => inp.focus(), 120);
      const ok = () => { const v = U.parseNumero(inp.value); if (v > 0) { fin(v); cierra(); } else inp.focus(); };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
      return h('div', null, h('div', { class: 'campo' }, inp, ayuda ? h('div', { class: 'ayuda' }, ayuda) : null), h('div', { class: 'hoja-acciones' }, h('button', { class: 'btn btn-primario', type: 'button', onclick: ok }, 'Aceptar')));
    });
  }
  const elegirFecha = (actual) => dialogo('¿De qué día?', (fin, cierra) => {
    const inp = h('input', { class: 'entrada', type: 'date', value: actual, max: AF.app.hoy() });
    return h('div', null, h('div', { class: 'campo' }, inp), h('div', { class: 'hoja-acciones' }, h('button', { class: 'btn btn-primario', type: 'button', onclick: () => { if (inp.value) { fin(inp.value); cierra(); } } }, 'Aceptar')));
  });
  const elegirOpcion = (titulo, opciones) => dialogo(titulo, (fin, cierra) => h('div', { class: 'opciones', estilo: { marginTop: '14px' } }, opciones.map(([v, t]) => h('button', { type: 'button', class: 'opcion', onclick: () => { fin(v); cierra(); } }, t))));
  function pedirTasa(t) {
    return dialogo('Tasa de ' + t.nombre, (fin, cierra) => {
      const inp = h('input', { class: 'entrada grande', inputmode: 'decimal', placeholder: 'Ej. 16,5', 'aria-label': 'Tasa anual en porcentaje' });
      const ok = () => { const v = U.parseNumero(inp.value); if (v != null && v >= 0 && v < 200) { fin(v); cierra(); } else inp.focus(); };
      return h('div', null, h('p', { class: 'suave', estilo: { marginTop: '6px' } }, 'Para calcular tus cuotas con intereses necesito la tasa anual de tu tarjeta (%). Está en tu estado de cuenta o en la app del banco. No la invento.'),
        h('div', { class: 'campo' }, inp), h('div', { class: 'hoja-acciones' }, h('button', { class: 'btn btn-borde', type: 'button', onclick: () => { fin(null); cierra(); } }, 'No la sé'), h('button', { class: 'btn btn-primario', type: 'button', onclick: ok }, 'Guardar')));
    });
  }

  /* ----------------------------------------------------------------------- capa */
  function crearCapa() {
    cerrar();
    capa = h('div', { class: 'voz', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Asistente de voz' });
    d.getElementById('app').appendChild(capa); vivo = true;
    return capa;
  }
  function cerrar() {
    vivo = false;
    if (escucha) { try { escucha.parar(); } catch (e) { /* nada */ } escucha = null; }
    N().callar();
    if (capa) { capa.remove(); capa = null; }
  }
  const cabeza = (izq) => h('div', { class: 'voz-cabeza' }, h('div', { class: 'suave' }, izq || ''), h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Cerrar', onclick: cerrar }, ico('cerrar')));
  function pintar(partes) {
    if (!capa) return;
    AF.ui.vaciar(capa);
    partes.forEach((p) => p && capa.appendChild(p));
    const foco = capa.querySelector('[data-foco]'); if (foco) setTimeout(() => foco.focus(), 60);
  }

  /* ------------------------------------------------------------------ escuchando */
  async function escuchar() {
    const vivoLocal = {}; let ultimo = '';
    const trans = h('p', { class: 'transcripcion', 'aria-live': 'polite' }, h('span', { class: 'tenue' }, 'Habla ahora…'));
    const onda = h('div', { class: 'onda escuchando', 'aria-hidden': 'true' }, Array.from({ length: 15 }, () => h('i')));
    const estado = h('div', { class: 'voz-estado' }, 'Te escucho');
    const btn = h('button', { class: 'mic-grande escuchando', type: 'button', 'aria-label': 'Terminar', onclick: () => { if (escucha) escucha.parar(); } }, ico('mic'));
    pintar([cabeza(), h('div', { class: 'voz-cuerpo' }, estado, trans, onda), h('div', { class: 'voz-pie' }, btn, h('button', { class: 'btn-texto', type: 'button', style: 'color:var(--sobre-panel)', onclick: () => { if (escucha) { escucha.parar(); escucha = null; } mostrarTexto(ultimo); } }, 'Prefiero escribir'))]);
    try {
      const e = await N().escuchar((t) => { ultimo = t; AF.ui.vaciar(trans); trans.appendChild(d.createTextNode(t)); });
      escucha = e; vivoLocal.e = e;
      const final = await e.terminado;
      if (escucha !== e) return;                       // cambió de pantalla mientras tanto
      escucha = null;
      if (!vivo) return;
      if (!final || !final.trim()) return sinAudio();
      procesar(final.trim());
    } catch (er) {
      escucha = null;
      if (!vivo) return;
      mostrarTexto('', er && er.message);
    }
  }
  function sinAudio() {
    pintar([cabeza(), h('div', { class: 'voz-cuerpo' }, h('p', { class: 'transcripcion' }, 'No te escuché.'), h('p', { class: 'voz-estado' }, 'Habla más cerca o escribe lo que quieres registrar.')),
      h('div', { class: 'voz-pie' }, h('button', { class: 'btn btn-voz btn-bloque', type: 'button', onclick: escuchar }, ico('mic'), 'Intentar otra vez'), h('button', { class: 'btn-texto', type: 'button', style: 'color:var(--sobre-panel)', onclick: () => mostrarTexto('') }, 'Escribir'))]);
  }

  /* --------------------------------------------------------------------- escribir */
  function mostrarTexto(valor, aviso2) {
    const ta = h('textarea', { class: 'texto-voz', rows: 3, placeholder: 'Ej.: pagué 30 de luz', 'data-foco': '1', 'aria-label': 'Lo que quieres registrar o preguntar', value: valor || '' });
    const enviar = () => { const t = ta.value.trim(); if (t) procesar(t); };
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } });
    pintar([cabeza(), h('div', { class: 'voz-cuerpo' },
      h('p', { class: 'transcripcion' }, 'Escríbelo como lo dirías'),
      aviso2 ? h('p', { class: 'voz-estado', estilo: { marginTop: '8px' } }, aviso2) : null,
      h('div', { estilo: { marginTop: '18px' } }, ta),
      h('div', { class: 'opciones', estilo: { marginTop: '14px' } }, ['Pagué 30 de luz', 'Me pagaron 1.200', 'Cuánto gasté este mes'].map((s) => h('button', { class: 'opcion', type: 'button', style: 'background:rgba(255,255,255,.08);border-color:transparent;color:var(--sobre-panel)', onclick: () => { ta.value = s; enviar(); } }, s)))),
      h('div', { class: 'voz-pie' }, h('button', { class: 'btn btn-voz btn-bloque', type: 'button', onclick: enviar }, ico('enviar'), 'Enviar'), h('button', { class: 'btn-texto', type: 'button', style: 'color:var(--sobre-panel)', onclick: escuchar }, 'Hablar en vez de escribir'))]);
  }

  /* --------------------------------------------------------------------- procesar */
  async function procesar(texto) {
    let r = AF.parser.interpretar(texto, ctx());
    const dudoso = r.tipo === 'desconocido' || (r.tipo === 'registrar' && r.items && r.items.length && r.items.every((i) => i.catConfianza === 'ninguna') && !r.items.some((i) => i.palabraNueva === null));
    if (dudoso && AF.ia && AF.acceso.tiene('entenderFraseLibreIA') && AF.acceso.iaDisponible()) {
      pintar([cabeza(), h('div', { class: 'voz-cuerpo' }, h('p', { class: 'transcripcion' }, texto), h('p', { class: 'voz-estado', estilo: { marginTop: '14px' } }, 'Pensando…'))]);
      const x = await AF.ia.interpretar(texto, ctx());
      if (x) r = x;
      if (!vivo) return;
    }
    mostrar(r, texto);
  }
  function mostrar(r, texto) {
    switch (r.tipo) {
      case 'registrar': return vistaRegistrar(r, texto);
      case 'preguntar': return vistaPregunta(r, texto);
      case 'corregir': return vistaCorregir(r, texto);
      case 'presupuesto': return vistaPresupuesto(r, texto);
      case 'informe': cerrar(); return V.informesUI.abrir({ formato: r.formato, periodo: r.periodo });
      case 'ayuda': return vistaAyuda();
      default: return vistaNoEntendi(texto);
    }
  }

  const Salir = (texto, acciones, extra) => pintar([cabeza(), h('div', { class: 'voz-cuerpo' }, extra), h('div', { class: 'voz-pie' }, acciones)]);
  const btnPrim = (t, f, cls) => h('button', { class: 'btn ' + (cls || 'btn-voz') + ' btn-bloque', type: 'button', onclick: f }, t);
  const btnTxt = (t, f) => h('button', { class: 'btn-texto', type: 'button', style: 'color:var(--sobre-panel)', onclick: f }, t);

  /* ------------------------------------------------------------------- registrar */
  function vistaRegistrar(r, texto) {
    if (!r.items || !r.items.length) {
      const t0 = r.falta === 'monto' ? 'No escuché cuánto fue.' : 'No pude armar un movimiento con eso.';
      return Salir(null, [btnPrim('Completar a mano', () => { cerrar(); C().formMovimiento({ inicial: { desc: texto }, alGuardar: (m) => C().guardarMov(m) }); }), btnTxt('Intentar otra vez', () => mostrarTexto(texto))],
        [h('p', { class: 'transcripcion' }, t0), r.partes && r.partes.length ? C().fraseAnotada(r.partes, null, false) : null]);
    }
    const items = r.items.map((i) => Object.assign({}, i, { credito: i.credito ? Object.assign({}, i.credito) : i.credito }));
    const tarjetas = S().d.tarjetas;
    const E = { tarjetaDuda: !!r.tarjetaDuda, sinTarjetas: !!r.sinTarjetas, dudas: (r.dudas || []).slice() };
    const hablaTexto = (it) => it.tipo === 'ingreso' ? 'Ingreso de ' + $(it.monto) + ' en ' + it.catNombre : 'Gasto de ' + $(it.monto) + ' en ' + it.catNombre;

    function dibujar() {
      const bloques = items.map((it, idx) => {
        const duda = it.catConfianza === 'ninguna';
        const fil = (etiqueta, valor, onclick, extraClase) => h('button', { class: 'entendido-fila', type: 'button', onclick }, h('span', { class: 'entendido-etiqueta' }, etiqueta), h('span', { class: 'entendido-valor ' + (extraClase || '') }, valor, ico('derecha', 'chico')));
        const filas = [
          fil(it.tipo === 'ingreso' ? 'Ingreso de' : 'Gasto de', $(it.monto), async () => { const v = await pedirNumero('Monto', it.monto); if (v) { it.monto = v; dibujar(); } }, 'monto-grande'),
          fil('Categoría', (it.catIcono || '') + ' ' + it.catNombre + (duda ? ' ·  ?' : ''), async () => {
            const id = await elegirCategoria(it.tipo, it.cat);
            if (!id) return;
            const c = S().categoria(id); it.cat = id; it.catNombre = c.nombre; it.catIcono = c.icono; it.catConfianza = 'alta'; if (it.tipo === 'gasto') it.nec = c.nec || null;
            if (it.palabraNueva) { S().aprender(it.palabraNueva, id); aviso('Aprendí que «' + it.palabraNueva + '» es ' + c.nombre.toLowerCase()); it.palabraNueva = null; }
            dibujar();
          }),
        ];
        if (it.tipo === 'gasto') filas.push(fil('¿Necesario o gusto?', it.nec === 'N' ? 'Necesario' : it.nec === 'G' ? 'Gusto' : 'Sin clasificar', () => { it.nec = it.nec === 'N' ? 'G' : it.nec === 'G' ? null : 'N'; dibujar(); }));
        filas.push(fil('Fecha', U.cap(U.fechaCorta(it.fecha, AF.app.hoy())), async () => { const f = await elegirFecha(it.fecha); if (f) { it.fecha = f; dibujar(); } }));
        if (it.tipo === 'gasto' && (tarjetas.length || it.cuenta === 'tarjeta')) {
          let txt = 'Efectivo o débito';
          if (it.cuenta === 'tarjeta') {
            const t = tarjetas.find((x) => x.id === it.tarjetaId);
            txt = t ? t.nombre : '¿Cuál tarjeta?';
            if (it.credito && it.credito.modo === 'diferido') txt += ' · ' + (it.credito.meses ? it.credito.meses + ' cuotas' : '¿cuántos meses?') + (it.credito.interes === false ? ' sin intereses' : '');
          }
          filas.push(fil('Pagado con', txt, async () => {
            const opc = [['efectivo', 'Efectivo o débito']].concat(tarjetas.map((t) => [t.id, t.nombre]));
            const v = await elegirOpcion('¿Con qué pagaste?', opc);
            if (!v) return;
            if (v === 'efectivo') { it.cuenta = 'efectivo'; delete it.tarjetaId; delete it.credito; }
            else { it.cuenta = 'tarjeta'; it.tarjetaId = v; it.credito = it.credito || { modo: 'corriente' }; }
            dibujar();
          }, it.cuenta === 'tarjeta' && !it.tarjetaId ? 'duda' : ''));
          if (it.cuenta === 'tarjeta' && it.credito && it.credito.modo === 'diferido' && !it.credito.meses) {
            filas.push(fil('Meses', '¿A cuántos?', async () => { const v = await elegirOpcion('¿A cuántos meses?', PLAN.tarjetas.mesesComunes.map((n) => [n, n + ' meses'])); if (v) { it.credito.meses = v; dibujar(); } }, 'duda'));
          }
        }
        return h('div', { class: 'entendido' }, items.length > 1 ? h('div', { class: 'entendido-etiqueta', estilo: { padding: '12px 0 0' } }, 'Movimiento ' + (idx + 1) + ' de ' + items.length) : null, filas);
      });
      const avisos = [];
      if (E.sinTarjetas && items.some((i) => i.cuenta === 'tarjeta' && !tarjetas.length)) avisos.push('Aún no tienes tarjetas guardadas. Lo guardo como pago normal; agrégala en la pestaña Tarjetas.');
      items.forEach((it) => {
        if (it.cuenta === 'tarjeta' && it.credito && it.credito.modo === 'diferido' && !AF.acceso.tiene('tarjetaDiferidoCuotas')) avisos.push('Con Pro calculo las cuotas de «' + (it.desc || it.catNombre) + '». Ahora lo guardo como compra con tarjeta.');
      });
      pintar([cabeza('Esto entendí'), h('div', { class: 'voz-cuerpo' }, C().fraseAnotada(r.partes, items[0].tipo, true), bloques,
        avisos.map((a) => h('p', { class: 'texto-sm', estilo: { color: 'var(--sobre-panel2)', marginTop: '12px' } }, a))),
      h('div', { class: 'voz-pie' }, btnPrim(items.length > 1 ? 'Guardar los ' + items.length : 'Guardar', guardar), btnTxt('Cancelar', cerrar))]);
    }

    async function guardar() {
      if (!vivo) return;                              // si el usuario ya canceló, no guardar nada
      const D = S().d, hoy = AF.app.hoy();
      const guardados = [];
      for (const it of items) {
        const m = { tipo: it.tipo, monto: it.monto, cat: it.cat, desc: it.desc || '', fecha: it.fecha };
        if (it.tipo === 'gasto') {
          m.nec = it.nec || null; m.cuenta = it.cuenta === 'tarjeta' && it.tarjetaId ? 'tarjeta' : 'efectivo';
          if (m.cuenta === 'tarjeta') {
            m.tarjetaId = it.tarjetaId;
            const pro = AF.acceso.tiene('tarjetaDiferidoCuotas');
            m.credito = it.credito && it.credito.modo === 'diferido' && pro && it.credito.meses ? { modo: 'diferido', meses: it.credito.meses, interes: it.credito.interes !== false, cuota: it.credito.cuota || null } : { modo: 'corriente' };
            if (m.credito.modo === 'diferido' && m.credito.interes && m.credito.cuota == null) {
              const t = S().buscar('tarjetas', it.tarjetaId);
              if (t && t.tasaAnual == null) { const tasa = await pedirTasa(t); if (tasa != null) S().editar('tarjetas', t.id, { tasaAnual: tasa }, 'Puse la tasa de ' + t.nombre); }
            }
          }
        }
        guardados.push(S().agregar('movs', m, 'Agregué ' + (it.desc || it.catNombre)));
      }
      if (!vivo) return;
      confirmacion(guardados);
    }
    dibujar();
    hablar(items.length === 1 ? hablaTexto(items[0]) + '. ¿Lo guardo?' : 'Entendí ' + items.length + ' movimientos. ¿Los guardo?');
  }

  function confirmacion(movs) {
    const D = S().d, hoy = AF.app.hoy();
    const total = movs.reduce((s, m) => s + m.monto, 0);
    const c = S().categoria(movs[0].cat);
    const linea = movs.length === 1 ? 'Guardé ' + $(movs[0].monto) + ' en ' + c.nombre.toLowerCase() + '.' : 'Guardé ' + movs.length + ' movimientos por ' + $(total) + '.';
    const extras = [];
    const modo = AF.acceso.tiene('puedesGastarHoyCompleto') ? 'completo' : 'simple';
    const p = AF.informes.puedesGastarHoy(D, hoy, modo);
    if (movs.some((m) => m.tipo === 'gasto') && p.ingresos) {
      if (p.hoyDisponible >= 0) extras.push('Hoy todavía puedes gastar ' + $(p.hoyDisponible) + '.');
      else if (p.hoyDisponible < -1) extras.push('Hoy te pasaste ' + $(-p.hoyDisponible) + ' de tu presupuesto diario.');
    }
    AF.informes.presupuestos(D, hoy).forEach((b) => {
      if (movs.some((m) => m.tipo === 'gasto' && (!b.cat || b.cat === m.cat))) {
        if (b.nivel === 'detente') extras.push('Detente: llegaste al límite de ' + b.nombre.toLowerCase() + '.');
        else if (b.nivel === 'aviso') extras.push('Ojo: vas en ' + Math.round(b.pct * 100) + ' % del límite de ' + b.nombre.toLowerCase() + '.');
      }
    });
    movs.forEach((m) => { if (m.cuenta === 'tarjeta') { const t = S().buscar('tarjetas', m.tarjetaId); if (t && !(t.diaCorte && t.diaVencimiento)) extras.push('Completa el corte y vencimiento de ' + t.nombre + ' para ver cuándo pagas.'); } });
    pintar([cabeza(), h('div', { class: 'voz-cuerpo' },
      h('div', { class: 'mic-grande', estilo: { background: 'var(--ingreso)', marginTop: '28px' }, 'aria-hidden': 'true' }, ico('ok')),
      h('p', { class: 'voz-respuesta', estilo: { textAlign: 'center' } }, linea),
      extras.map((t) => h('p', { class: 'texto-sm suave', estilo: { textAlign: 'center', marginTop: '8px' } }, t))),
    h('div', { class: 'voz-pie' }, btnPrim('Listo', cerrar), btnTxt('Deshacer', () => { movs.forEach(() => S().deshacer()); cerrar(); aviso('Quité lo que acabas de guardar'); }))]);
    hablar(linea + ' ' + extras.join(' '));
    if (!extras.length) setTimeout(() => { if (capa && vivo && capa.querySelector('.mic-grande')) cerrar(); }, 2600);
  }

  /* -------------------------------------------------------------------- preguntar */
  function vistaPregunta(q, texto) {
    const D = S().d, hoy = AF.app.hoy();
    const res = AF.informes.responder(q, D, hoy, AF.acceso.esPro());
    const filas = (res.filas || []).map((f) => h('div', { class: 'entendido-fila' }, h('span', null, f.icono + ' ' + f.etiqueta), h('span', { class: 'entendido-valor' }, f.valor)));
    pintar([cabeza('Tu pregunta'), h('div', { class: 'voz-cuerpo' },
      h('p', { class: 'frase', estilo: { fontSize: '22px', color: 'var(--sobre-panel2)' } }, '«' + texto + '»'),
      res.bloqueado ? h('div', null, h('p', { class: 'voz-respuesta' }, res.gancho || res.texto), h('p', { class: 'texto-sm suave', estilo: { marginTop: '10px' } }, res.texto))
        : h('p', { class: 'voz-respuesta' }, res.texto),
      filas.length ? h('div', { class: 'entendido' }, filas) : null),
    h('div', { class: 'voz-pie' }, res.bloqueado ? btnPrim('Ver Pro', () => { cerrar(); AF.app.abrir('Pro', (c) => V.pro.render(c)); }) : res.ir ? btnPrim('Ver ' + (res.ir === 'tarjetas' ? 'tarjetas' : 'inicio'), () => { cerrar(); AF.app.ir(res.ir); }) : btnPrim('Listo', cerrar),
      btnTxt('Preguntar otra cosa', escuchar))]);
    hablar(res.voz);
  }

  /* --------------------------------------------------------------------- corregir */
  function vistaCorregir(r, texto) {
    const D = S().d;
    const fin = (linea, deshacerPasos) => {
      pintar([cabeza(), h('div', { class: 'voz-cuerpo' }, h('div', { class: 'mic-grande', estilo: { background: 'var(--ingreso)', marginTop: '28px' } }, ico('ok')), h('p', { class: 'voz-respuesta', estilo: { textAlign: 'center' } }, linea)),
        h('div', { class: 'voz-pie' }, btnPrim('Listo', cerrar), deshacerPasos ? btnTxt('Deshacer', () => { for (let i = 0; i < deshacerPasos; i++) S().deshacer(); cerrar(); aviso('Lo dejé como estaba'); }) : null)]);
      hablar(linea);
      setTimeout(() => { if (capa && vivo && capa.querySelector('.mic-grande')) cerrar(); }, 3200);
    };
    if (r.accion === 'deshacer') {
      const nota = S().deshacer();
      return fin(nota ? 'Deshecho: ' + nota.charAt(0).toLowerCase() + nota.slice(1) + '.' : 'No hay nada que deshacer.', 0);
    }
    const m = AF.informes.objetivoDeCorreccion(D, r.objetivo);
    if (!m) return fin('No encontré ningún movimiento para cambiar.', 0);
    const nombre = '«' + (m.desc || S().categoria(m.cat).nombre) + '» de ' + $(m.monto);
    if (r.accion === 'borrar') { S().borrar('movs', m.id, 'Borré ' + nombre); return fin('Borré ' + nombre + '.', 1); }
    if (r.accion === 'categoria') {
      const c = S().categoria(r.cat), vieja = S().categoria(m.cat);
      const patch = { cat: c.id }; if (m.tipo === 'gasto' && (m.nec === vieja.nec || m.nec == null)) patch.nec = c.nec || null;
      S().editar('movs', m.id, patch, 'Cambié ' + nombre + ' a ' + c.nombre);
      if (m.desc) S().aprender(m.desc, c.id);
      return fin('Listo, cambié ' + nombre + ' a ' + c.nombre.toLowerCase() + '.' + (m.desc ? ' Ya sé que «' + m.desc.toLowerCase() + '» va ahí.' : ''), 1);
    }
    if (r.accion === 'monto') { S().editar('movs', m.id, { monto: r.monto }, 'Cambié el monto'); return fin('Listo, ahora son ' + $(r.monto) + '.', 1); }
    if (r.accion === 'necesidad') { S().editar('movs', m.id, { nec: r.nec }, 'Cambié necesario/gusto'); return fin('Listo, ' + nombre + ' ahora es ' + (r.nec === 'N' ? 'necesario' : 'un gusto') + '.', 1); }
    if (r.accion === 'tipo') {
      const cat = S().categorias(r.nuevoTipo)[0].id;
      S().editar('movs', m.id, { tipo: r.nuevoTipo, cat, nec: null }, 'Cambié el tipo');
      return fin('Listo, ahora es un ' + r.nuevoTipo + '.', 1);
    }
    return vistaNoEntendi(texto, 'No entendí qué quieres cambiar.');
  }

  /* ------------------------------------------------------------------ presupuesto */
  function vistaPresupuesto(r, texto) {
    const D = S().d;
    if (!r.monto) return vistaNoEntendi(texto, 'No escuché el monto del límite.');
    const nombre = r.cat ? S().categoria(r.cat).nombre : 'todos tus gastos';
    const guardar = () => {
      if (r.cat && !AF.acceso.tiene('presupuestoPorCategoria')) { cerrar(); return C().pedirPro('presupuestoPorCategoria'); }
      const ya = D.presupuestos.find((b) => (b.cat || null) === (r.cat || null));
      if (!ya && !AF.acceso.puedeAgregar('presupuestos', D.presupuestos.length)) { cerrar(); return C().pedirLimite('presupuestos', 'límite de gasto', 'límites de gasto'); }
      if (ya) S().editar('presupuestos', ya.id, { monto: r.monto }, 'Cambié un límite'); else S().agregar('presupuestos', { cat: r.cat || null, monto: r.monto, periodo: 'mes' }, 'Puse un límite');
      const linea = 'Listo: límite de ' + $(r.monto) + ' al mes en ' + nombre.toLowerCase() + '.';
      pintar([cabeza(), h('div', { class: 'voz-cuerpo' }, h('div', { class: 'mic-grande', estilo: { background: 'var(--ingreso)', marginTop: '28px' } }, ico('ok')), h('p', { class: 'voz-respuesta', estilo: { textAlign: 'center' } }, linea)),
        h('div', { class: 'voz-pie' }, btnPrim('Listo', cerrar), btnTxt('Deshacer', () => { S().deshacer(); cerrar(); }))]);
      hablar(linea);
    };
    pintar([cabeza('Esto entendí'), h('div', { class: 'voz-cuerpo' }, h('p', { class: 'frase', estilo: { fontSize: '22px', color: 'var(--sobre-panel2)' } }, '«' + texto + '»'),
      h('div', { class: 'entendido' },
        h('div', { class: 'entendido-fila' }, h('span', { class: 'entendido-etiqueta' }, 'Límite'), h('span', { class: 'entendido-valor monto-grande' }, $(r.monto))),
        h('div', { class: 'entendido-fila' }, h('span', { class: 'entendido-etiqueta' }, 'En'), h('span', { class: 'entendido-valor' }, r.cat ? S().categoria(r.cat).icono + ' ' + nombre : 'Todos los gastos')),
        h('div', { class: 'entendido-fila' }, h('span', { class: 'entendido-etiqueta' }, 'Cada'), h('span', { class: 'entendido-valor' }, 'Mes')))),
    h('div', { class: 'voz-pie' }, btnPrim('Guardar límite', guardar), btnTxt('Cancelar', cerrar))]);
    hablar('Un límite de ' + $(r.monto) + ' en ' + nombre.toLowerCase() + '. ¿Lo guardo?');
  }

  /* --------------------------------------------------------------- ayuda / no entendí */
  const EJEMPLOS_AYUDA = [
    ['Pagué 30 de luz', 'Registrar un gasto'], ['Me pagaron el sueldo, 1.200', 'Registrar un ingreso'], ['Pagué 30 de luz y 12 de internet', 'Varios a la vez'],
    ['Cuánto gasté este mes', 'Preguntar'], ['Cuánto puedo gastar hoy', 'Tu día de hoy'], ['Cambia el último a salud', 'Corregir'], ['Borra el último', 'Borrar'], ['Ponme un límite de 100 en salidas', 'Poner un límite'],
  ];
  function vistaAyuda() {
    pintar([cabeza('Qué puedo hacer'), h('div', { class: 'voz-cuerpo' }, h('p', { class: 'transcripcion' }, 'Háblame normal'), h('div', { class: 'entendido' }, EJEMPLOS_AYUDA.map(([f, t]) => h('button', { class: 'entendido-fila', type: 'button', onclick: () => procesar(f) }, h('span', null, '«' + f + '»'), h('span', { class: 'entendido-etiqueta' }, t))))), h('div', { class: 'voz-pie' }, btnPrim('Hablar', escuchar), btnTxt('Cerrar', cerrar))]);
  }
  function vistaNoEntendi(texto, mensaje) {
    pintar([cabeza(), h('div', { class: 'voz-cuerpo' }, h('p', { class: 'transcripcion' }, mensaje || 'No lo entendí del todo.'), h('p', { class: 'voz-estado', estilo: { marginTop: '10px' } }, 'Dijiste: «' + texto + '»'),
      h('div', { class: 'entendido' }, EJEMPLOS_AYUDA.slice(0, 4).map(([f, t]) => h('button', { class: 'entendido-fila', type: 'button', onclick: () => procesar(f) }, h('span', null, '«' + f + '»'), h('span', { class: 'entendido-etiqueta' }, t))))),
    h('div', { class: 'voz-pie' }, btnPrim('Escribirlo de otra forma', () => mostrarTexto(texto)), btnTxt('Cerrar', cerrar))]);
  }

  /* -------------------------------------------------------------------------- API */
  function abrir(o) {
    o = o || {};
    crearCapa();
    N().vibrar();
    if (o.texto) { procesar(o.texto); return; }
    if (o.modo === 'texto') mostrarTexto(''); else escuchar();
  }
  V.voz = { abrir, cerrar, procesar };
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/vistas/movimientos.js ===== */
/* Movimientos: lista por día con filtros y búsqueda, y la tabla para cargar y corregir muchos a la vez. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const $ = (n) => U.dinero(n);
  const C = () => V.comun, S = () => AF.store;

  const est = { mes: null, tipo: 'todos', texto: '', buscar: false, tabla: false, pagina: 1, cat: null };

  function filtrar(D) {
    const desde = U.inicioMes(est.mes), hasta = U.finMes(est.mes);
    const q = U.norm(est.texto).trim();
    return D.movs.filter((m) => m.fecha >= desde && m.fecha <= hasta
      && (est.tipo === 'todos' || (est.tipo === 'gasto' ? m.tipo === 'gasto' : est.tipo === 'ingreso' ? m.tipo === 'ingreso' : true))
      && (!est.cat || m.cat === est.cat)
      && (!q || U.norm((m.desc || '') + ' ' + S().categoria(m.cat).nombre).includes(q)));
  }

  function cabecera(cont) {
    const hoy = AF.app.hoy();
    if (!est.mes) est.mes = U.inicioMes(hoy);
    const esActual = est.mes === U.inicioMes(hoy);
    const nombre = U.cap(U.nombreMes(est.mes)) + ' ' + est.mes.slice(0, 4);
    cont.appendChild(h('header', { class: 'barra-superior' },
      h('h1', { class: 'h2' }, 'Movimientos'),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Buscar', 'aria-pressed': est.buscar ? 'true' : 'false', onclick: () => { est.buscar = !est.buscar; if (!est.buscar) est.texto = ''; AF.app.redibujar(); } }, ico('buscar')),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': est.tabla ? 'Ver lista' : 'Ver tabla', onclick: () => { est.tabla = !est.tabla; est.pagina = 1; AF.app.redibujar(); } }, ico(est.tabla ? 'movimientos' : 'archivo')),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Agregar movimiento', onclick: () => C().formMovimiento({ alGuardar: (m) => C().guardarMov(m) }) }, ico('mas_'))));
    const sub = h('div', { class: 'contenido-solo', estilo: { paddingBottom: '0' } });
    sub.appendChild(h('div', { estilo: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Mes anterior', onclick: () => { est.mes = U.sumarMeses(est.mes, -1); est.pagina = 1; AF.app.redibujar(); } }, ico('atras')),
      h('strong', { class: 'h2', estilo: { fontSize: '18px' } }, esActual ? nombre + ' · este mes' : nombre),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Mes siguiente', disabled: esActual, estilo: { opacity: esActual ? '.3' : '1' }, onclick: () => { if (!esActual) { est.mes = U.sumarMeses(est.mes, 1); est.pagina = 1; AF.app.redibujar(); } } }, ico('derecha'))));
    if (est.buscar) {
      const inp = h('input', { class: 'entrada', type: 'search', placeholder: 'Buscar por detalle o categoría', value: est.texto, 'aria-label': 'Buscar movimientos',
        oninput: (e) => { est.texto = e.target.value; clearTimeout(est.t); est.t = setTimeout(() => { AF.app.redibujar(); setTimeout(() => { const i = g.document.querySelector('input[type=search]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 30); }, 260); } });
      sub.appendChild(h('div', { estilo: { marginTop: '8px' } }, inp)); setTimeout(() => { if (!est.texto) inp.focus(); }, 40);
    }
    sub.appendChild(h('div', { class: 'segmentos', estilo: { marginTop: '12px' } }, [['todos', 'Todos'], ['gasto', 'Gastos'], ['ingreso', 'Ingresos']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': est.tipo === k ? 'true' : 'false', onclick: () => { est.tipo = k; est.pagina = 1; AF.app.redibujar(); } }, t))));
    cont.appendChild(sub);
  }

  function resumen(lista) {
    const ing = lista.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0), gas = lista.filter((m) => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);
    return h('div', { class: 'dos-datos', estilo: { marginTop: '16px' } },
      h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Ingresos'), h('div', { class: 'dato-valor', estilo: { color: 'var(--ingreso)' } }, $(ing))),
      h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Gastos'), h('div', { class: 'dato-valor', estilo: { color: 'var(--gasto)' } }, $(gas))));
  }

  /* ------------------------------------------------------------------------ lista */
  function lista(cont, D, hoy) {
    const movs = filtrar(D);
    const cuerpo = h('div', { class: 'contenido' });
    cuerpo.appendChild(resumen(movs));
    if (!movs.length) {
      cuerpo.appendChild(h('div', { class: 'vacio' }, h('strong', null, est.texto ? 'No encontré nada con «' + est.texto + '»' : 'Sin movimientos en este periodo'), est.texto ? 'Prueba con otra palabra.' : 'Toca el micrófono o el + para agregar uno.'));
    } else {
      const total = movs.length;
      agrupar(movs, hoy).forEach((dia) => {
        cuerpo.appendChild(h('div', { class: 'dia-titulo' }, h('span', null, dia.titulo), h('span', { class: 'num' }, (dia.total >= 0 ? '+' : '−') + $(Math.abs(dia.total)))));
        cuerpo.appendChild(h('div', { class: 'lista' }, dia.movs.map((m) => C().filaMov(m, hoy, () => C().editarMov(m), false))));
      });
      cuerpo.appendChild(h('p', { class: 'texto-xs suave', estilo: { textAlign: 'center', marginTop: '24px' } }, total + (total === 1 ? ' movimiento' : ' movimientos')));
    }
    cont.appendChild(cuerpo);
  }
  const agrupar = (movs, hoy) => C().agruparPorDia(movs, hoy);

  /* ------------------------------------------------------------------------ tabla */
  function tabla(cont, D, hoy) {
    const todos = filtrar(D).sort((a, b) => (b.fecha === a.fecha ? b.creado - a.creado : b.fecha < a.fecha ? -1 : 1));
    const porPagina = PLAN.tabla.filasPorPagina, visibles = todos.slice(0, est.pagina * porPagina);
    const cats = (tipo) => S().categorias(tipo);
    const opcionesCat = (tipo, sel) => cats(tipo).map((c) => h('option', { value: c.id, selected: c.id === sel }, c.icono + ' ' + c.nombre));
    const errorEl = h('div', { class: 'ayuda', role: 'alert', estilo: { color: 'var(--gasto)', minHeight: '18px', marginTop: '8px' } });

    /* fila nueva */
    const n = { fecha: hoy, tipo: 'gasto', monto: '', cat: 'otros', desc: '', nec: 'auto' };
    const iFecha = h('input', { type: 'date', value: n.fecha, max: hoy, 'aria-label': 'Fecha nueva' });
    const iTipo = h('select', { 'aria-label': 'Tipo nuevo', onchange: (e) => { n.tipo = e.target.value; AF.ui.vaciar(iCat); opcionesCat(n.tipo, null).forEach((o) => iCat.appendChild(o)); n.cat = iCat.value; } }, h('option', { value: 'gasto' }, 'Gasto'), h('option', { value: 'ingreso' }, 'Ingreso'));
    const iMonto = h('input', { inputmode: 'decimal', placeholder: '0,00', 'aria-label': 'Monto nuevo' });
    const iCat = h('select', { 'aria-label': 'Categoría nueva', onchange: (e) => { n.cat = e.target.value; } }, opcionesCat('gasto', 'otros'));
    const iDesc = h('input', { placeholder: 'Detalle', 'aria-label': 'Detalle nuevo' });
    const iNec = h('select', { 'aria-label': 'Necesario o gusto nuevo' }, h('option', { value: 'auto' }, 'Auto'), h('option', { value: 'N' }, 'Necesario'), h('option', { value: 'G' }, 'Gusto'));
    function agregar() {
      const v = U.parseNumero(iMonto.value);
      if (!(v > 0)) { errorEl.textContent = 'Escribe un monto mayor que cero.'; iMonto.focus(); return; }
      errorEl.textContent = '';
      const tipo = iTipo.value, cat = iCat.value, c = S().categoria(cat);
      const m = { tipo, monto: U.r2(v), cat, desc: iDesc.value.trim(), fecha: iFecha.value || hoy, cuenta: 'efectivo' };
      if (tipo === 'gasto') m.nec = iNec.value === 'auto' ? (c.nec || null) : iNec.value;
      S().agregar('movs', m, 'Agregué un movimiento (tabla)');
      AF.app.redibujar();
      setTimeout(() => { const x = g.document.querySelector('tr.nueva input[inputmode=decimal]'); if (x) x.focus(); }, 80);
    }
    [iMonto, iDesc].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') agregar(); }));
    const filaNueva = h('tr', { class: 'nueva' }, h('td', null, iFecha), h('td', null, iTipo), h('td', { class: 'num' }, iMonto), h('td', null, iCat), h('td', null, iDesc), h('td', null, iNec),
      h('td', null, h('button', { class: 'btn btn-chico btn-voz', type: 'button', estilo: { margin: '0 6px', minHeight: '36px' }, onclick: agregar }, 'Agregar')));

    /* filas existentes: se guardan al salir de la celda */
    const filas = visibles.map((m) => {
      const aplicar = (patch, nota) => { S().editar('movs', m.id, patch, nota || 'Edité un movimiento (tabla)'); };
      const c0 = S().categoria(m.cat);
      const esPago = m.tipo === 'pago_tarjeta';
      return h('tr', { 'data-id': m.id },
        h('td', null, h('input', { type: 'date', value: m.fecha, max: U.sumarDias(hoy, 366), 'aria-label': 'Fecha', onchange: (e) => { if (e.target.value) aplicar({ fecha: e.target.value }); else e.target.value = m.fecha; } })),
        h('td', null, esPago ? h('span', { class: 'suave', estilo: { padding: '0 8px' } }, 'Pago tarjeta') : h('select', { 'aria-label': 'Tipo', onchange: (e) => { const t = e.target.value; aplicar({ tipo: t, cat: cats(t)[0].id, nec: null }); AF.app.redibujar(); } }, h('option', { value: 'gasto', selected: m.tipo === 'gasto' }, 'Gasto'), h('option', { value: 'ingreso', selected: m.tipo === 'ingreso' }, 'Ingreso'))),
        h('td', { class: 'num' }, h('input', { inputmode: 'decimal', value: String(m.monto).replace('.', ','), 'aria-label': 'Monto', onchange: (e) => { const v = U.parseNumero(e.target.value); if (v > 0) aplicar({ monto: U.r2(v) }); else e.target.value = String(m.monto).replace('.', ','); } })),
        h('td', null, esPago ? null : h('select', { 'aria-label': 'Categoría', onchange: (e) => { const c = S().categoria(e.target.value); const p = { cat: c.id }; if (m.tipo === 'gasto' && (m.nec == null || m.nec === c0.nec)) p.nec = c.nec || null; aplicar(p); if (m.desc) S().aprender(m.desc, c.id); } }, opcionesCat(m.tipo, m.cat))),
        h('td', null, h('input', { value: m.desc || '', maxlength: 80, 'aria-label': 'Detalle', onchange: (e) => aplicar({ desc: e.target.value.trim() }) })),
        h('td', null, m.tipo === 'gasto' ? h('select', { 'aria-label': 'Necesario o gusto', onchange: (e) => aplicar({ nec: e.target.value === 'S' ? null : e.target.value }) }, h('option', { value: 'S', selected: m.nec == null }, '—'), h('option', { value: 'N', selected: m.nec === 'N' }, 'Necesario'), h('option', { value: 'G', selected: m.nec === 'G' }, 'Gusto')) : null),
        h('td', null, h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Borrar', estilo: { width: '40px', height: '40px', color: 'var(--gasto)' }, onclick: () => { C().borrarMov(m); AF.app.redibujar(); } }, ico('basura'))));
    });
    const cab = ['Fecha', 'Tipo', 'Monto', 'Categoría', 'Detalle', 'Necesario o gusto', ''];
    const caja = h('div', { class: 'tabla-caja', estilo: { marginTop: '14px' } }, h('table', { class: 'tabla' }, h('colgroup', null, ['c-fecha', 'c-tipo', 'c-monto', 'c-cat', 'c-detalle', 'c-nec', 'c-acc'].map((c) => h('col', { class: c }))), h('thead', null, h('tr', null, cab.map((t) => h('th', { scope: 'col' }, t)))), h('tbody', null, filaNueva, filas)));
    cont.appendChild(h('div', { class: 'contenido' }, resumen(todos), h('p', { class: 'texto-sm suave', estilo: { marginTop: '10px' } }, 'Escribe en la fila de arriba y pulsa Enter para agregar. Cambia cualquier celda y se guarda sola.'), errorEl, caja,
      todos.length > visibles.length ? h('button', { class: 'btn btn-borde btn-bloque', type: 'button', estilo: { marginTop: '16px' }, onclick: () => { est.pagina++; AF.app.redibujar(); } }, 'Ver más (' + (todos.length - visibles.length) + ')') : null,
      h('div', { estilo: { height: '30px' } })));
  }

  function render(cont) {
    const D = S().d, hoy = AF.app.hoy();
    cabecera(cont);
    if (est.tabla) { AF.app.noRefrescar = true; tabla(cont, D, hoy); } else { AF.app.noRefrescar = false; lista(cont, D, hoy); }
  }

  // Abre la lista de movimientos en un mes (lo usa Resumen al tocar una barra o el botón «Ver movimientos»).
  function irAMes(mesISO) { est.mes = U.inicioMes(mesISO); est.tipo = 'todos'; est.cat = null; est.texto = ''; est.buscar = false; est.pagina = 1; AF.app.ir('movimientos'); }
  V.movimientos = { render, estado: est , irAMes };
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/vistas/tarjetas.js ===== */
/* Tarjetas de crédito: cuánto pagas, cuándo, cuotas pendientes, mínimo vs total. Todo estimado hasta que ajustes con tu estado de cuenta. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, hoja, aviso, fila, campo } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const $ = (n) => U.dinero(n);
  const S = () => AF.store, C = () => V.comun;

  const fechaLarga = (iso) => U.deISO(iso).getDate() + ' de ' + U.nombreMes(iso);
  const palabraCuotas = () => PLAN.pais(S().d.ajustes.pais).palabraCuotas;

  // Lo que se muestra: el estado de cuenta si la persona lo ajustó, si no, el estimado.
  function visto(t, hoy) {
    const e = AF.tarjetas.estado(t, S().d.movs, hoy);
    const r = t.estadoReal;
    if (r && r.vence >= hoy) {
      const pagadoDespues = S().d.movs.filter((m) => m.tipo === 'pago_tarjeta' && m.tarjetaId === t.id && m.fecha >= (r.fecha || '0')).reduce((s, m) => s + m.monto, 0);
      const aPagar = Math.max(0, U.r2(r.total - pagadoDespues));
      return Object.assign({}, e, { proximoVence: r.vence, aPagarProximo: aPagar, pagoMinimo: r.minimo != null ? Math.min(r.minimo, aPagar) : e.pagoMinimo, diasParaVencer: U.diasEntre(hoy, r.vence), origen: 'estado' });
    }
    return Object.assign({}, e, { origen: 'estimado' });
  }

  // Acabado del plástico según el nivel que eligió la persona (no es un dato del banco: solo cambia el color para que se parezca a la tarjeta real).
  function acabado(nivel) {
    const n = U.norm(String(nivel || ''));
    if (/black|infinite|signature|legend|premium/.test(n)) return 'n-negra';
    if (/platinum|platino/.test(n)) return 'n-plata';
    if (/gold|oro/.test(n)) return 'n-oro';
    return 'n-base';
  }
  // Marca de la red en la esquina: Mastercard son sus dos círculos; las demás, el nombre en letras.
  function marcaRed(red) {
    const n = U.norm(String(red || ''));
    if (!n) return null;
    if (n.includes('mastercard')) return h('span', { class: 'red-mc', role: 'img', 'aria-label': 'Mastercard' }, h('i'), h('i'));
    return h('span', { class: 'red-texto red-' + n.replace(/[^a-z]/g, ''), role: 'img', 'aria-label': red }, red);
  }
  function chipTarjeta() {
    const c = h('span', { class: 'chip-plastico', 'aria-hidden': 'true' });
    const w = h('span', { class: 'sin-contacto', 'aria-hidden': 'true' });
    w.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8.5 8.5a5 5 0 0 1 0 7"/><path d="M12 6a8.5 8.5 0 0 1 0 12"/><path d="M15.5 3.5a12 12 0 0 1 0 17"/></svg>';
    return h('div', { class: 'plastico-chip' }, c, w);
  }

  function plastico(t, e, hoy, grande) {
    const venceTxt = e.proximoVence && e.aPagarProximo ? 'Vence ' + (e.diasParaVencer <= 0 ? 'hoy' : e.diasParaVencer === 1 ? 'mañana' : 'el ' + fechaLarga(e.proximoVence)) : 'Sin pagos pendientes';
    const usado = t.cupo ? Math.min(1, e.cupoUsado / t.cupo) : null;
    const banco = t.bancoId ? B().buscar(t.bancoId) : null;
    return h('div', { class: 'plastico tarjeta-credito ' + acabado(t.nivel) },
      h('div', { class: 'plastico-cabeza' }, banco ? AF.ui.insigniaBanco(banco, 30) : h('span', { class: 'plastico-nombre' }, t.nombre), marcaRed(t.red)),
      h('div', { class: 'plastico-medio' }, chipTarjeta(),
        h('div', { class: 'plastico-monto' }, h('div', { class: 'suave texto-xs' }, e.origen === 'estado' ? 'A pagar · según tu estado' : 'A pagar · estimado'), h('div', { class: 'plastico-cifra' }, $(e.aPagarProximo)))),
      h('div', { class: 'plastico-numero' }, h('span', { class: 'plastico-digitos' }, t.ultimos4 ? '•••• •••• •••• ' + t.ultimos4 : t.nombre), t.nivel ? h('span', { class: 'suave plastico-nivel' }, t.nivel) : null),
      h('div', null, h('div', { class: 'plastico-pie' }, h('span', null, venceTxt), t.cupo ? h('span', { class: 'suave' }, 'Cupo libre ' + $(Math.max(0, t.cupo - e.cupoUsado))) : null),
        usado != null ? h('div', { class: 'cupo', role: 'img', 'aria-label': 'Cupo usado ' + Math.round(usado * 100) + ' por ciento' }, h('i', { estilo: { width: Math.round(usado * 100) + '%' } })) : null));
  }

  /* ------------------------------------------------------------------ lista */
  function render(cont) {
    const D = S().d, hoy = AF.app.hoy();
    cont.appendChild(h('header', { class: 'barra-superior' }, h('h1', { class: 'h2' }, 'Tarjetas'),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Agregar tarjeta', onclick: nueva }, ico('mas_'))));
    const cuerpo = h('div', { class: 'contenido' });
    if (!D.tarjetas.length) {
      cuerpo.appendChild(h('div', { class: 'vacio' }, h('strong', null, 'Agrega tu tarjeta de crédito'),
        'Te digo cuánto pagar, cuándo, y cómo van tus ' + palabraCuotas() + '. Pones tú el corte, el pago y la tasa: no invento nada.',
        h('div', { estilo: { marginTop: '16px' } }, h('button', { class: 'btn btn-voz', type: 'button', onclick: nueva }, 'Agregar tarjeta'))));
    } else {
      cuerpo.appendChild(h('div', { estilo: { display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' } },
        D.tarjetas.map((t) => { const e = visto(t, hoy); return h('button', { type: 'button', estilo: { textAlign: 'left', width: '100%' }, 'aria-label': 'Ver ' + t.nombre, onclick: () => AF.app.abrir(t.nombre, (c) => detalle(c, t.id)) }, plastico(t, e, hoy)); })));
      const pagos = D.tarjetas.map((t) => ({ t, e: visto(t, hoy) })).filter((x) => x.e.proximoVence && x.e.aPagarProximo).sort((a, b) => (a.e.proximoVence < b.e.proximoVence ? -1 : 1));
      if (pagos.length) {
        cuerpo.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Próximos pagos')),
          h('div', { class: 'lista' }, pagos.map(({ t, e }) => fila({ icono: AF.ui.ico('calendario'), titulo: t.nombre, sub: 'Vence el ' + fechaLarga(e.proximoVence) + (e.diasParaVencer <= 3 ? ' · ' + (e.diasParaVencer <= 0 ? 'hoy' : 'en ' + e.diasParaVencer + (e.diasParaVencer === 1 ? ' día' : ' días')) : ''), derecha: h('span', { class: 'monto' }, $(e.aPagarProximo)), onclick: () => AF.app.abrir(t.nombre, (c) => detalle(c, t.id)) })))));
      }
      cuerpo.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '24px' } }, 'Los valores son estimados con lo que registraste. Si tu banco dice otra cosa, toca la tarjeta y usa «Ajustar con mi estado de cuenta».'));
    }
    cont.appendChild(cuerpo);
  }

  function nueva() {
    if (!AF.acceso.puedeAgregar('tarjetas', S().d.tarjetas.length)) return pedirLimite();
    formTarjeta(null);
  }
  function pedirLimite() {
    hoja({ titulo: 'Más tarjetas con Pro', cuerpo: h('p', { class: 'suave', estilo: { marginTop: '6px' } }, 'Gratis incluye ' + AF.acceso.limite('tarjetas') + ' tarjeta. Con Pro agregas todas las que uses.'),
      acciones: [{ texto: 'Ahora no', clase: 'btn-borde' }, { texto: 'Ver Pro', clase: 'btn-primario', onclick: () => AF.app.abrir('Pro', (c) => V.pro.render(c)) }] });
  }

  /* ------------------------------------------------------------------ asistente: banco → tarjeta → datos */
  const B = () => AF.bancos;
  const coma = (n) => (n == null ? '' : String(n).replace('.', ','));
  const OTRO = { id: '', nombre: 'Otro banco', corto: '+', esOtro: true };

  // Abre la hoja para agregar o editar una tarjeta. No guarda por su cuenta: entrega el objeto a o.alGuardar(obj)
  // (así sirve igual en Tarjetas y en la bienvenida). Si alGuardar devuelve false, la hoja queda abierta.
  function asistente(o) {
    const pais = o.pais || S().d.ajustes.pais, t = o.tarjeta || null;
    const x = Object.assign({ bancoId: '', banco: '', red: '', nivel: '', nivelOtro: '' }, t || {});
    if (x.nivel && !B().nivelesDe(B().buscar(x.bancoId)).includes(x.nivel)) { x.nivelOtro = x.nivel; x.nivel = 'Otra'; }
    const f = { nombre: x.nombre || '', u4: x.ultimos4 || '', cupo: coma(x.cupo), corte: coma(x.diaCorte), venc: coma(x.diaVencimiento), tasa: coma(x.tasaAnual), minimo: coma(x.pagoMinimoPct) };
    let nombreTocado = !!(t && t.nombre);
    let paso = t ? 'datos' : 'banco';
    const cont = h('div');
    const api = hoja({ cuerpo: cont });

    const banco = () => B().buscar(x.bancoId);
    const nombreBanco = () => (banco() ? banco().nombre : x.banco);
    const nivelFinal = () => (x.nivel === 'Otra' ? x.nivelOtro.trim() : x.nivel);
    const nombreAuto = () => [banco() ? banco().corto : x.banco, x.red, nivelFinal()].filter(Boolean).join(' ');
    const objBanco = () => banco() || { id: '', nombre: x.banco || 'Tu banco', corto: x.banco ? x.banco : '+' };
    const ir = (p) => { paso = p; pintar(); api.el.scrollTop = 0; };

    const previa = () => h('div', { class: 'tarjeta-previa' }, AF.ui.insigniaBanco(objBanco(), 40),
      h('div', { class: 'tarjeta-previa-texto' }, h('strong', null, nombreBanco() || 'Tu banco'), h('span', null, [x.red, nivelFinal()].filter(Boolean).join(' ') || 'Tipo de tarjeta')));
    const cabeza = (n, titulo, sub) => h('div', { class: 'asistente-cabeza' },
      h('div', { class: 'pasos', 'aria-label': 'Paso ' + n + ' de 3' }, [1, 2, 3].map((i) => h('i', { class: i <= n ? 'hecho' : '' }))),
      h('h2', { class: 'h2' }, titulo), sub ? h('p', { class: 'suave', estilo: { marginTop: '4px' } }, sub) : null);
    const pie = (...bots) => h('div', { class: 'hoja-acciones' }, bots);
    const pills = (lista, actual, alElegir) => h('div', { class: 'opciones', estilo: { marginTop: '8px' } },
      lista.map(([val, txt]) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': actual === val ? 'true' : 'false', onclick: () => alElegir(val) }, txt)));

    /* ---- 1 · banco */
    function pasoBanco() {
      const lista = B().lista(pais);
      const rej = h('div', { class: 'rejilla-bancos' });
      const q = h('input', { class: 'entrada', type: 'search', placeholder: 'Buscar tu banco', 'aria-label': 'Buscar banco', autocomplete: 'off' });
      const op = (b) => h('button', { type: 'button', class: 'banco-op', 'aria-pressed': (b.esOtro ? !x.bancoId && x.banco !== '' : x.bancoId === b.id) ? 'true' : 'false',
        onclick: () => {
          x.bancoId = b.id; x.banco = b.esOtro ? '' : b.nombre;
          if (!B().redesDe(b.esOtro ? null : b).includes(x.red)) x.red = '';
          if (x.nivel && x.nivel !== 'Otra' && !B().nivelesDe(b.esOtro ? null : b).includes(x.nivel)) x.nivel = '';
          if (!nombreTocado) f.nombre = '';
          ir('tipo');
        } },
        AF.ui.insigniaBanco(b, 52), h('span', { class: 'banco-nombre' }, b.corto === '+' ? 'Otro banco' : b.corto),
        B().tieneCostos(b) ? h('span', { class: 'banco-tag' }, 'Con costos') : null);
      const pintaRej = () => {
        AF.ui.vaciar(rej);
        const n = U.norm(q.value.trim());
        const vistos = lista.filter((b) => !n || U.norm(b.nombre + ' ' + b.corto).includes(n));
        // Bancos y cooperativas van en grupos separados (la cooperativa lleva tipo: 'cooperativa' en el catálogo); el título solo sale si hay de los dos.
        const bancos = vistos.filter((b) => b.tipo !== 'cooperativa'), coops = vistos.filter((b) => b.tipo === 'cooperativa');
        if (bancos.length && coops.length) rej.appendChild(h('p', { class: 'rejilla-titulo' }, 'Bancos'));
        bancos.forEach((b) => rej.appendChild(op(b)));
        if (coops.length) {
          if (bancos.length) rej.appendChild(h('p', { class: 'rejilla-titulo' }, 'Cooperativas'));
          coops.forEach((b) => rej.appendChild(op(b)));
        }
        if (!n || 'otro banco'.includes(n)) rej.appendChild(op(OTRO));
        if (!rej.children.length) rej.appendChild(h('p', { class: 'suave' }, 'No lo encuentro. Prueba con «Otro banco».'));
      };
      q.addEventListener('input', pintaRej); pintaRej();
      cont.appendChild(h('div', null, cabeza(1, '¿De qué banco es tu tarjeta?', 'Toca el tuyo. Si no está, elige «Otro banco».'), q, rej,
        pie(h('button', { class: 'btn btn-borde', type: 'button', onclick: () => { api.cerrar(); if (o.alCancelar) o.alCancelar(); } }, 'Cancelar'))));
    }

    /* ---- 2 · red y nivel */
    function pasoTipo() {
      const b = banco(), redes = B().redesDe(b);
      const niveles = B().nivelesDe(b).slice(); if (!niveles.includes('Otra')) niveles.push('Otra');
      const err = h('div', { class: 'ayuda', role: 'alert', estilo: { color: 'var(--gasto)', minHeight: '18px', marginTop: '8px' } });
      const nom = !b ? h('input', { class: 'entrada', value: x.banco, maxlength: 40, placeholder: 'Ej.: Banco Solidario', 'aria-label': 'Nombre del banco', oninput: (e) => { x.banco = e.target.value; } }) : null;
      const otroNivel = h('input', { class: 'entrada', value: x.nivelOtro, maxlength: 30, placeholder: 'Ej.: Premium, Black…', 'aria-label': 'Nombre del nivel', oninput: (e) => { x.nivelOtro = e.target.value; } });
      cont.appendChild(h('div', null, cabeza(2, '¿Qué tarjeta es?', 'Mira el frente del plástico: ahí dice la red y el nivel.'), previa(),
        nom ? campo('¿Cómo se llama el banco?', nom) : null,
        campo('Red', pills(redes.map((r) => [r, r]), x.red, (r) => { x.red = r; if (!nombreTocado) f.nombre = ''; pintar(); })),
        campo('Nivel', pills([['', 'No sé']].concat(niveles.map((n) => [n, n])), x.nivel, (n) => { x.nivel = n; if (!nombreTocado) f.nombre = ''; pintar(); }), 'Clásica, Gold, Platinum… Si no lo sabes, déjalo en «No sé».'),
        x.nivel === 'Otra' ? campo('Nombre del nivel', otroNivel) : null, err,
        pie(h('button', { class: 'btn btn-borde', type: 'button', onclick: () => ir('banco') }, 'Atrás'),
          h('button', { class: 'btn btn-primario', type: 'button', onclick: () => {
            if (nom && !x.banco.trim()) { err.textContent = 'Escribe el nombre del banco.'; nom.focus(); return; }
            if (!x.red) { err.textContent = 'Elige la red de tu tarjeta (Visa, Mastercard…).'; return; }
            x.banco = nombreBanco().trim(); ir('datos');
          } }, 'Siguiente'))));
    }

    /* ---- 3 · datos */
    function pasoDatos() {
      const b = banco();
      if (!nombreTocado && !f.nombre) f.nombre = nombreAuto();
      const num = (clave, ph, etq) => h('input', { class: 'entrada', inputmode: 'decimal', value: f[clave], placeholder: ph, 'aria-label': etq, oninput: (e) => { f[clave] = e.target.value; } });
      const nombre = h('input', { class: 'entrada', placeholder: 'Ej.: Pichincha Visa Platinum', value: f.nombre, maxlength: 40, 'aria-label': 'Nombre de la tarjeta', oninput: (e) => { f.nombre = e.target.value; nombreTocado = true; } });
      const u4 = h('input', { class: 'entrada', inputmode: 'numeric', maxlength: 4, value: f.u4, placeholder: '1234', 'aria-label': 'Últimos 4 dígitos', oninput: (e) => { f.u4 = e.target.value; } });
      const tasa = num('tasa', 'La de tu estado de cuenta', 'Tasa anual nominal');
      const err = h('div', { class: 'ayuda', role: 'alert', estilo: { color: 'var(--gasto)', minHeight: '18px', marginTop: '8px' } });

      // Tasa: solo se SUGIERE (con su fuente); la persona decide si la usa.
      const sug = B().tasaSugerida(b, pais);
      const caja = sug ? h('div', { class: 'sugerencia' },
        h('p', null, sug.delBanco
          ? h('span', null, h('strong', null, nombreBanco() + ' publica ' + coma(sug.efectiva) + ' % efectiva anual'), ' para ' + sug.aplicaA + (sug.vigencia ? ' (' + sug.vigencia + ')' : '') + '. La app usa tasa nominal: eso equivale a ' + coma(sug.nominal) + ' %.')
          : h('span', null, h('strong', null, 'Techo legal: ' + coma(sug.efectiva) + ' % efectiva anual'), ' (' + sug.aplicaA.toLowerCase() + ', ' + sug.vigencia + '). Tu banco puede cobrar menos; lo seguro es la tasa de tu estado de cuenta. Equivale a ' + coma(sug.nominal) + ' % nominal.')),
        h('button', { class: 'btn btn-borde', type: 'button', onclick: () => { f.tasa = coma(sug.nominal); tasa.value = f.tasa; } }, 'Usar ' + coma(sug.nominal) + ' %')) : null;

      const notaCostos = b && b.aviso ? null : b && B().tieneCostos(b)
        ? h('div', { class: 'nota', estilo: { marginTop: '16px' } }, ico('info'), h('span', null, h('strong', null, 'Ya tengo los costos de ' + b.nombre + '. '), 'Los ves dentro de tu tarjeta, con su fuente y fecha (' + b.fuente.vigencia + ').'))
        : h('div', { class: 'nota', estilo: { marginTop: '16px' } }, ico('info'), h('span', null, h('strong', null, 'Aún no tengo los costos de ' + (nombreBanco() || 'este banco') + '. '), 'No los invento: dentro de tu tarjeta puedes anotar lo que te cobra' + (b && b.tarifarioUrl ? ', y abajo está su tarifario oficial.' : '.')));
      // Aviso propio de la entidad (por ejemplo, «publica su tarifario en imágenes» o «no publica sus costos»): se muestra tal cual.
      const avisoBanco = b && b.aviso ? h('div', { class: 'nota', estilo: { marginTop: '10px' } }, ico('info'), h('span', null, b.aviso)) : null;
      const abrir = b && b.tarifarioUrl && (!B().tieneCostos(b) || b.aviso)
        ? h('a', { class: 'btn btn-borde btn-bloque', href: b.tarifarioUrl, target: '_blank', rel: 'noopener noreferrer', estilo: { marginTop: '10px' } }, 'Abrir tarifario de ' + b.corto) : null;

      cont.appendChild(h('div', null, cabeza(3, 'Los datos de tu tarjeta', 'Todo es opcional menos el nombre. Lo encuentras en tu estado de cuenta o en la app del banco.'), previa(),
        t ? h('button', { class: 'btn-texto', type: 'button', onclick: () => ir('banco') }, 'Cambiar banco o tipo de tarjeta') : null,
        campo('Nombre', nombre), campo('Últimos 4 dígitos', u4), campo('Cupo', num('cupo', 'Opcional', 'Cupo')),
        campo('Día de corte', num('corte', 'Ej. 20', 'Día de corte'), 'El día del mes en que cierra tu estado de cuenta.'),
        campo('Día límite de pago', num('venc', 'Ej. 5', 'Día límite de pago'), 'El día del mes en que debes pagar.'),
        campo('Tasa anual nominal %', tasa, 'Si no la pones, no calculo intereses.'), caja,
        campo('Pago mínimo %', num('minimo', 'Opcional', 'Pago mínimo'), 'Qué parte del total te piden como mínimo, si lo sabes.'),
        notaCostos, avisoBanco, abrir, err,
        pie(h('button', { class: 'btn btn-borde', type: 'button', onclick: () => ir('tipo') }, 'Atrás'),
          h('button', { class: 'btn btn-primario', type: 'button', onclick: () => {
            const nom = f.nombre.trim(); if (!nom) { err.textContent = 'Ponle un nombre.'; nombre.focus(); return; }
            const dd = (v) => { const n = U.parseNumero(v); return n >= 1 && n <= 31 ? Math.round(n) : null; };
            const c = dd(f.corte), vv = dd(f.venc);
            if (f.corte && !c) { err.textContent = 'El día de corte va de 1 a 31.'; return; }
            if (f.venc && !vv) { err.textContent = 'El día de pago va de 1 a 31.'; return; }
            const obj = { nombre: nom, banco: nombreBanco(), bancoId: x.bancoId || null, red: x.red, nivel: nivelFinal() || null, ultimos4: f.u4.replace(/\D/g, '').slice(0, 4),
              cupo: f.cupo ? U.parseNumero(f.cupo) : null, diaCorte: c, diaVencimiento: vv, tasaAnual: f.tasa ? U.parseNumero(f.tasa) : null, pagoMinimoPct: f.minimo ? U.parseNumero(f.minimo) : null };
            if (o.alGuardar(obj) === false) return;
            api.cerrar();
          } }, o.textoGuardar || 'Guardar tarjeta'))));
    }

    function pintar() { AF.ui.vaciar(cont); (paso === 'banco' ? pasoBanco : paso === 'tipo' ? pasoTipo : pasoDatos)(); }
    pintar();
    return api;
  }

  function formTarjeta(t) {
    asistente({ tarjeta: t, textoGuardar: t ? 'Guardar cambios' : 'Guardar tarjeta', alGuardar: (o) => {
      if (t) S().editar('tarjetas', t.id, o, 'Edité ' + o.nombre); else S().agregar('tarjetas', o, 'Agregué ' + o.nombre);
      aviso('Tarjeta guardada');
    } });
  }

  /* ------------------------------------------------------------------ detalle */
  function detalle(cont, id) {
    const t = S().buscar('tarjetas', id), hoy = AF.app.hoy();
    if (!t) { AF.app.atras(); return; }
    const e = visto(t, hoy);
    cont.appendChild(plastico(t, e, hoy, true));
    cont.appendChild(h('div', { estilo: { display: 'flex', gap: '10px', marginTop: '14px' } },
      h('button', { class: 'btn btn-primario', type: 'button', estilo: { flex: 1 }, onclick: () => registrarPago(t, e) }, 'Registrar un pago'),
      h('button', { class: 'btn btn-borde', type: 'button', 'aria-label': 'Editar tarjeta', onclick: () => formTarjeta(t) }, ico('editar'))));

    // datos que faltan (nunca se inventan)
    if (e.faltanDatos.includes('fechas')) cont.appendChild(h('div', { class: 'nota', estilo: { marginTop: '16px' } }, ico('alerta'), h('span', null, h('strong', null, 'Faltan el corte y el día de pago. '), 'Sin eso no sé cuándo vence cada cuota. ', h('button', { class: 'enlace', type: 'button', onclick: () => formTarjeta(t) }, 'Completar'))));
    if (e.comprasSinTasa) cont.appendChild(h('div', { class: 'nota', estilo: { marginTop: '16px' } }, ico('alerta'), h('span', null, h('strong', null, 'Falta la tasa anual. '), 'Hay ' + e.comprasSinTasa + (e.comprasSinTasa === 1 ? ' compra' : ' compras') + ' con intereses sin calcular. ', h('button', { class: 'enlace', type: 'button', onclick: () => formTarjeta(t) }, 'Poner la tasa'))));
    e.avisos.slice(0, 2).forEach((a) => cont.appendChild(h('div', { class: 'nota', estilo: { marginTop: '12px' } }, ico('info'), h('span', null, a))));

    const datos = [];
    if (e.proximoVence) datos.push(['Próximo pago', fechaLarga(e.proximoVence) + (e.diasParaVencer != null ? ' · ' + (e.diasParaVencer <= 0 ? 'hoy' : 'en ' + e.diasParaVencer + (e.diasParaVencer === 1 ? ' día' : ' días')) : '')]);
    if (e.interesProximo > 0 && e.origen === 'estimado') datos.push(['Intereses en ese pago', $(e.interesProximo)]);
    datos.push(['Deuda total', $(e.deudaTotal)]);
    if (t.cupo) datos.push(['Cupo disponible', $(Math.max(0, t.cupo - e.cupoUsado))]);
    if (e.siguienteCorte) datos.push(['Próximo corte', fechaLarga(e.siguienteCorte) + ' · en ' + e.diasParaCorte + (e.diasParaCorte === 1 ? ' día' : ' días')]);
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'lista' }, datos.map(([a, b]) => h('div', { class: 'interruptor', estilo: { minHeight: '52px' } }, h('span', null, a), h('strong', { class: 'num' }, b))))));

    seccionCostos(cont, t);

    // mínimo vs total (Pro)
    const mv = AF.tarjetas.minimoVsTotal(t, e);
    if (AF.acceso.tiene('asesorTarjeta')) {
      if (mv) cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, '¿Mínimo o total?')),
        h('div', { class: 'nota pro' }, ico('info'), h('span', null, 'Si pagas el total (' + $(mv.pagarTotal) + ') no pagas intereses. Si pagas solo el mínimo (' + $(mv.pagarMinimo) + '), quedan ' + $(mv.queda) + ' y te cobrarían unos ' + $(mv.interesEstimadoMes) + ' de interés en un mes (estimado).'))));
      else if (e.aPagarProximo) cont.appendChild(h('div', { class: 'nota pro', estilo: { marginTop: '16px' } }, ico('info'), h('span', null, 'Para comparar mínimo y total necesito la tasa anual y el % de pago mínimo de tu tarjeta. ', h('button', { class: 'enlace', type: 'button', onclick: () => formTarjeta(t) }, 'Ponerlos'))));
    } else if (e.aPagarProximo) cont.appendChild(h('div', { estilo: { marginTop: '16px' } }, C().gancho('Pro te dice si conviene pagar el mínimo o el total.', 'asesorTarjeta')));

    // cuotas pendientes
    const pend = e.pendientes.filter((q) => q.de > 1 || e.pendientes.length <= 8).slice(0, 24);
    if (pend.length) {
      cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Lo que viene')),
        h('div', { class: 'lista' }, pend.map((q) => fila({ icono: q.de > 1 ? '🧾' : '🛒', titulo: q.desc || S().categoria(q.cat).nombre, sub: (q.de > 1 ? 'Cuota ' + q.n + ' de ' + q.de + ' · ' : '') + 'vence ' + fechaLarga(q.vence), derecha: h('span', { class: 'monto' }, $(q.pendiente)) })))));
    }
    cont.appendChild(h('button', { class: 'btn btn-borde btn-bloque', type: 'button', estilo: { marginTop: '22px' }, onclick: () => ajustar(t) }, 'Ajustar con mi estado de cuenta'));
    cont.appendChild(h('button', { class: 'btn-texto btn-peligro', type: 'button', estilo: { marginTop: '8px', width: '100%' }, onclick: async () => {
      if (await C().confirmar({ titulo: '¿Quitar ' + t.nombre + '?', texto: 'Sus compras y pagos siguen en tus movimientos, pero ya no se calculan cuotas ni vencimientos.', si: 'Quitar tarjeta', peligro: true })) { S().borrar('tarjetas', t.id, 'Quité ' + t.nombre); AF.app.atras(); }
    } }, 'Quitar esta tarjeta'));
  }

  /* ------------------------------------------------------------------ costos de la tarjeta */
  // Lo que cobra el banco: compacto por defecto, expandible al tocar.
  function seccionCostos(cont, t) {
    const b = B().buscar(t.bancoId);
    const todas = B().filas(b, t.nivel, t.costos);
    const con = todas.filter((x) => x.texto), sin = todas.filter((x) => !x.texto);
    const fu = b && b.fuente;
    const sec = h('section', { class: 'seccion' });

    if (!con.length) {
      // Sin datos: nota compacta + botón para anotar
      sec.appendChild(h('div', { class: 'nota' }, ico('info'), h('span', null,
        h('strong', null, 'Sin costos de ' + (t.banco || 'tu banco') + '. '), 'Anótalos y los recuerdo.',
        sin.length ? h('button', { class: 'enlace', type: 'button', estilo: { marginLeft: '4px' }, onclick: () => elegirCosto(t, sin) }, 'Anotar') : null)));
      if (b && b.tarifarioUrl) sec.appendChild(h('a', { class: 'btn-texto', href: b.tarifarioUrl, target: '_blank', rel: 'noopener noreferrer', estilo: { display: 'block', textAlign: 'center', marginTop: '4px', fontSize: 'var(--t-xs)' } }, 'Tarifario oficial de ' + (b.corto || b.nombre)));
      cont.appendChild(sec);
      return;
    }

    // Con datos: cabeza colapsable
    let abierto = false;
    const detDiv = h('div', { style: 'display:none' });
    const toggle = h('button', { type: 'button', style: 'display:flex;align-items:center;justify-content:space-between;width:100%;background:none;border:0;padding:0;cursor:pointer;text-align:left', onclick: () => {
      abierto = !abierto;
      detDiv.style.display = abierto ? '' : 'none';
      flecha.style.transform = abierto ? 'rotate(90deg)' : '';
    } },
      h('h2', { class: 'h2' }, 'Costos de tu tarjeta'),
      h('span', { style: 'display:flex;align-items:center;gap:6px' },
        h('span', { class: 'texto-xs suave' }, con.length + ' conceptos'),
        h('span', { style: 'transition:transform .2s;display:inline-block' }, ico('adelante'))));
    // guardar ref al ícono de flecha
    const flecha = toggle.querySelector('span > span:last-child');

    if (fu && B().tieneCostos(b)) detDiv.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginBottom: '8px', marginTop: '6px' } }, b.nombre + ' · ' + fu.vigencia + '. Con IVA.'));
    detDiv.appendChild(h('div', { class: 'lista' }, con.map((x) => fila({ icono: x.icono, titulo: x.etiqueta, sub: x.texto, derecha: ico('adelante'), onclick: () => editarCosto(t, x) }))));
    const calc = calculadoraAvance(b);
    if (calc) detDiv.appendChild(calc);
    if (sin.length) detDiv.appendChild(h('button', { class: 'btn btn-borde btn-bloque', type: 'button', estilo: { marginTop: '10px' }, onclick: () => elegirCosto(t, sin) }, 'Anotar otro costo'));
    detDiv.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '8px' } }, 'Toca una línea para ajustar el valor si tu estado de cuenta dice otra cosa.'));

    sec.appendChild(toggle);
    sec.appendChild(detDiv);
    cont.appendChild(sec);
  }

  // «Si sacas un avance de $X, la comisión es $Y». Solo aparece si el banco publicó cómo se calcula.
  function calculadoraAvance(b) {
    if (!b || !b.avance) return null;
    const inp = h('input', { class: 'entrada', inputmode: 'decimal', placeholder: 'Monto', 'aria-label': 'Monto del avance' });
    const res = h('div', { class: 'calc-resultado', role: 'status' }, 'Escribe un monto para ver la comisión.');
    inp.addEventListener('input', () => {
      const m = U.parseNumero(inp.value), c = m > 0 ? B().costosAvance(b, m) : [];
      res.textContent = !c.length ? 'Escribe un monto para ver la comisión.'
        : (c.length === 1 && c[0].valor != null ? 'Comisión del avance: ' + $(c[0].valor) : 'Comisión del avance: ' + c.map((x) => x.etiqueta + ' ' + (x.valor != null ? $(x.valor) : x.texto)).join(' · ')) + ' (con IVA). Los intereses son aparte.';
    });
    return h('div', { class: 'calc-avance' }, h('strong', null, '¿Cuánto cuesta un avance?'), inp, res);
  }

  function elegirCosto(t, lista) {
    hoja({ titulo: '¿Qué costo quieres anotar?', cuerpo: h('div', { class: 'lista' }, lista.map((x) => fila({ icono: x.icono, titulo: x.etiqueta, derecha: ico('adelante'), onclick: () => { setTimeout(() => editarCosto(t, x), 60); } }))), acciones: [{ texto: 'Cerrar', clase: 'btn-borde' }] });
  }

  function editarCosto(t, x) {
    const hoy = AF.app.hoy();
    const actual = (S().buscar('tarjetas', t.id) || t).costos || {};
    const inp = h('input', { class: 'entrada', maxlength: 120, value: x.propio ? x.texto : '', placeholder: 'Ej.: $5 por cada $100', 'aria-label': x.etiqueta });
    const cuerpo = h('div', null,
      x.texto && !x.propio ? h('div', { class: 'nota', estilo: { marginTop: '8px' } }, ico('info'), h('span', null, h('strong', null, x.texto), x.nota ? h('span', null, ' ' + x.nota) : null,
        x.fuente ? h('span', { class: 'suave' }, ' Fuente: ' + x.fuente.texto + ' (' + x.fuente.vigencia + ').') : null)) : null,
      x.propio && x.nota ? h('p', { class: 'suave', estilo: { marginTop: '6px' } }, x.nota) : null,
      campo(x.texto && !x.propio ? 'Lo que te cobra a ti (opcional)' : 'Lo que te cobra', inp, 'Escríbelo como aparece en tu estado de cuenta o en el tarifario de tu banco.'),
      x.fuente && x.fuente.url ? h('a', { class: 'btn-texto', href: x.fuente.url, target: '_blank', rel: 'noopener noreferrer', estilo: { display: 'block', marginTop: '10px' } }, 'Abrir el documento del banco') : null);
    const acciones = [{ texto: 'Cerrar', clase: 'btn-borde' }, { texto: 'Guardar', clase: 'btn-primario', onclick: () => {
      const v = inp.value.trim(); if (!v) return x.propio ? quitar() : false;
      S().editar('tarjetas', t.id, { costos: Object.assign({}, actual, { [x.clave]: { texto: v, fecha: hoy } }) }, 'Anoté ' + x.etiqueta.toLowerCase() + ' de ' + t.nombre);
      aviso('Anotado');
    } }];
    function quitar() { const c = Object.assign({}, actual); delete c[x.clave]; S().editar('tarjetas', t.id, { costos: c }, 'Quité mi dato de ' + x.etiqueta.toLowerCase()); aviso('Quité tu dato'); }
    hoja({ titulo: x.etiqueta, cuerpo, acciones });
  }

  function registrarPago(t, e) {
    const inp = h('input', { class: 'entrada grande', inputmode: 'decimal', value: e.aPagarProximo ? String(e.aPagarProximo).replace('.', ',') : '', 'aria-label': 'Monto pagado' });
    const fecha = h('input', { class: 'entrada', type: 'date', value: AF.app.hoy(), max: AF.app.hoy() });
    hoja({ titulo: 'Registrar un pago', cuerpo: h('div', null, h('p', { class: 'suave', estilo: { marginTop: '4px' } }, 'No cuenta como gasto: solo baja lo que debes de ' + t.nombre + '.'), campo('Monto pagado', inp), campo('Fecha', fecha)),
      acciones: [{ texto: 'Guardar pago', clase: 'btn-primario', onclick: () => {
        const v = U.parseNumero(inp.value); if (!(v > 0)) { inp.focus(); return false; }
        S().agregar('movs', { tipo: 'pago_tarjeta', monto: U.r2(v), fecha: fecha.value || AF.app.hoy(), tarjetaId: t.id, cat: null, desc: 'Pago ' + t.nombre }, 'Pagué ' + t.nombre);
        aviso('Pago registrado', { texto: 'Deshacer', onclick: () => S().deshacer() });
      } }] });
    setTimeout(() => inp.select(), 150);
  }

  function ajustar(t) {
    const r = t.estadoReal || {};
    const hoy = AF.app.hoy();
    const total = h('input', { class: 'entrada grande', inputmode: 'decimal', value: r.total != null ? String(r.total).replace('.', ',') : '', placeholder: '0,00', 'aria-label': 'Total a pagar' });
    const minimo = h('input', { class: 'entrada', inputmode: 'decimal', value: r.minimo != null ? String(r.minimo).replace('.', ',') : '', placeholder: 'Opcional', 'aria-label': 'Pago mínimo' });
    const vence = h('input', { class: 'entrada', type: 'date', value: r.vence || '' });
    const err = h('div', { class: 'ayuda', role: 'alert', estilo: { color: 'var(--gasto)', minHeight: '18px' } });
    hoja({ titulo: 'Ajustar con tu estado de cuenta', cuerpo: h('div', null, h('p', { class: 'suave', estilo: { marginTop: '4px' } }, 'Copia estos datos de tu estado de cuenta y los usaré en lugar de mi estimado hasta que venza.'), campo('Total a pagar', total), campo('Pago mínimo', minimo), campo('Fecha límite de pago', vence), err),
      acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
        const tv = U.parseNumero(total.value);
        if (!(tv >= 0) || tv == null) { err.textContent = 'Pon el total a pagar.'; return false; }
        if (!vence.value || vence.value < hoy) { err.textContent = 'Elige una fecha límite que no haya pasado.'; return false; }
        S().editar('tarjetas', t.id, { estadoReal: { total: U.r2(tv), minimo: minimo.value ? U.parseNumero(minimo.value) : null, vence: vence.value, fecha: hoy } }, 'Ajusté ' + t.nombre + ' con el estado de cuenta');
        aviso('Ajustado con tu estado de cuenta');
      } }] });
  }

  V.tarjetas = { render, formTarjeta, asistente, visto };
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/vistas/finanzas.js ===== */
/* Tu plata: límites de gasto, metas de ahorro, pagos fijos, préstamos entre personas, suscripciones y el reto sin gastos hormiga. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, hoja, aviso, campo } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const S = () => AF.store, C = () => V.comun, I = () => AF.informes, N = () => AF.nativo;
  const $ = (n) => U.dinero(n);
  const num = (el) => U.parseNumero(el.value);
  const diaMes = (iso) => U.deISO(iso).getDate() + ' de ' + U.nombreMes(iso);
  const diaMesC = (iso) => U.deISO(iso).getDate() + ' ' + U.MESES_CORTOS[U.deISO(iso).getMonth()];
  const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);

  /* ------------------------------------------------------------------- piezas */
  const boton = (texto, clase, fn) => h('button', { class: 'btn ' + clase, type: 'button', onclick: fn }, texto);
  const masBtn = (etq, fn) => ({ derecha: h('button', { class: 'boton-icono', type: 'button', 'aria-label': etq, onclick: fn }, ico('mas_')) });
  const intro = (t) => h('p', { class: 'suave', estilo: { margin: '4px 0 8px' } }, t);
  const vacio = (titulo, texto, textoBtn, fn) => h('div', { class: 'vacio' }, h('strong', null, titulo), texto, textoBtn ? h('div', { estilo: { marginTop: '16px' } }, boton(textoBtn, 'btn-primario', fn)) : null);
  const progreso = (pct, nivel) => h('div', { class: 'progreso ' + (nivel || ''), role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(Math.max(0, Math.min(1, pct)) * 100) },
    h('i', { estilo: { width: Math.max(0, Math.min(1, pct)) * 100 + '%' } }));
  const seccion = (titulo, hijos, extra) => h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, titulo), extra || null), hijos);
  // Un renglón con icono, textos, algo a la derecha, una barra de avance opcional y una nota. accion = botón aparte (no anidar botones).
  function bloque(o) {
    const principal = h(o.onclick ? 'button' : 'div', { class: 'bloque-cab' + (o.onclick ? ' fila-boton' : ''), type: o.onclick ? 'button' : null, onclick: o.onclick },
      h('div', { class: 'ico ' + (o.tono || '') }, o.icono),
      h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, o.titulo), o.sub ? h('div', { class: 'fila-sub' }, o.sub) : null),
      o.derecha || null);
    return h('div', { class: 'bloque' }, h('div', { class: 'bloque-fila' }, principal, o.accion || null),
      o.progreso != null ? progreso(o.progreso, o.nivel) : null, o.nota ? h('div', { class: 'bloque-nota' }, o.nota) : null);
  }
  const entradaMonto = (valor, ph, etq) => h('input', { class: 'entrada grande', inputmode: 'decimal', placeholder: ph || '0', value: valor == null || valor === '' ? '' : String(valor).replace('.', ','), 'aria-label': etq || 'Monto' });
  const errorEl = () => h('div', { class: 'ayuda', role: 'alert', estilo: { color: 'var(--gasto)', minHeight: '18px', marginTop: '8px' } });
  const eliminar = async (col, id, titulo, texto, nota) => {
    if (!(await C().confirmar({ titulo, texto, si: 'Eliminar', peligro: true }))) return false;
    S().borrar(col, id, nota); aviso('Eliminado', { texto: 'Deshacer', onclick: () => S().deshacer() }); return true;
  };
  const cierra = (api, fn) => { api.cerrar(); if (fn) fn(); return false; };      // cierra esta hoja y luego hace algo (p. ej. abrir otra)

  /* ======================================================================= LÍMITES DE GASTO */
  function presupuestos(cont) {
    const D = S().d, hoy = AF.app.hoy();
    const lista = I().presupuestos(D, hoy);
    cont.appendChild(intro('Pon cuánto quieres gastar al mes. Te aviso al llegar al 80 % y cuando lo alcances.'));
    if (!lista.length) cont.appendChild(vacio('Aún no tienes límites', 'Pon un tope general o por categoría y mira cuánto llevas.', 'Poner un límite', () => formPresupuesto(null)));
    else cont.appendChild(h('div', { class: 'lista' }, lista.map((p) => bloque({
      icono: p.cat ? S().categoria(p.cat).icono : '🎯', titulo: p.nombre, sub: $(p.gastado) + ' de ' + $(p.monto) + ' este mes',
      derecha: h('span', { class: 'monto' }, Math.round(p.pct * 100) + ' %'), progreso: p.pct, nivel: p.nivel === 'detente' ? 'alto' : p.nivel === 'aviso' ? 'aviso' : '',
      nota: p.queda >= 0 ? 'Te quedan ' + $(p.queda) : 'Te pasaste ' + $(-p.queda), onclick: () => formPresupuesto(p),
    }))));
    return masBtn('Agregar límite', () => formPresupuesto(null));
  }
  function formPresupuesto(p) {
    const D = S().d, edit = !!p;
    if (!edit && !AF.acceso.puedeAgregar('presupuestos', D.presupuestos.length)) return C().pedirLimite('presupuestos', 'límite de gasto', 'límites de gasto');
    const e = { cat: edit ? p.cat || null : null };
    const monto = entradaMonto(edit ? p.monto : '', '0', 'Límite al mes'), err = errorEl(), zonaCat = h('div');
    const usadas = new Set(D.presupuestos.filter((x) => !edit || x.id !== p.id).map((x) => x.cat || null));
    const pintar = () => {
      AF.ui.vaciar(zonaCat);
      if (edit) { zonaCat.appendChild(campo('En', h('div', { class: 'opciones' }, h('span', { class: 'opcion activa' }, (e.cat ? S().categoria(e.cat).icono + ' ' + S().categoria(e.cat).nombre : '🎯 Todos los gastos'))))); return; }
      const pro = AF.acceso.tiene('presupuestoPorCategoria');
      const ops = [{ id: null, t: '🎯 Todos los gastos' }].concat(S().categorias('gasto').map((c) => ({ id: c.id, t: c.icono + ' ' + c.nombre }))).filter((o) => !usadas.has(o.id));
      zonaCat.appendChild(campo('¿En qué?', h('div', { class: 'opciones' }, ops.map((o) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': e.cat === o.id ? 'true' : 'false',
        onclick: () => { if (o.id && !pro) { cierraYPide(); return; } e.cat = o.id; pintar(); } }, o.t, o.id && !pro ? AF.ui.chipPro() : null)))));
    };
    let api;
    const cierraYPide = () => { api.cerrar(); C().pedirPro('presupuestoPorCategoria'); };
    pintar();
    api = hoja({ titulo: edit ? 'Editar límite' : 'Nuevo límite', cuerpo: h('div', null, zonaCat, campo('Límite al mes', monto), err),
      acciones: (edit ? [{ texto: 'Eliminar', clase: 'btn-borde btn-peligro', onclick: (a) => cierra(a, () => eliminar('presupuestos', p.id, '¿Eliminar este límite?', 'Dejas de ver cuánto llevas, pero no se borra ningún gasto.', 'Quité un límite')) }] : [])
        .concat([{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
          const v = num(monto); if (!(v > 0)) { err.textContent = 'Escribe un monto mayor que cero.'; monto.focus(); return false; }
          if (edit) S().editar('presupuestos', p.id, { monto: U.r2(v) }, 'Cambié un límite'); else S().agregar('presupuestos', { cat: e.cat, monto: U.r2(v), periodo: 'mes' }, 'Puse un límite');
          aviso('Límite guardado');
        } }]) });
    setTimeout(() => monto.focus(), 200);
  }

  /* ======================================================================= METAS DE AHORRO */
  const ICONOS_META = ['🏝️', '🏠', '🚗', '🎓', '💻', '📱', '💍', '🛟', '🎁', '🏁'];
  const ahorrado = (m) => U.r2((m.aportes || []).reduce((s, a) => s + a.monto, 0));
  function ritmoMeta(m, hoy) {
    const falta = U.r2(Math.max(0, m.objetivo - ahorrado(m)));
    if (falta === 0) return '¡Meta lograda!';
    if (m.aporteMensual > 0) { const n = Math.ceil(falta / m.aporteMensual), f = U.sumarMeses(hoy, n); return 'Con ' + $(m.aporteMensual) + ' al mes llegas en ' + plural(n, 'mes', 'meses') + ' (' + U.nombreMes(f) + ' de ' + f.slice(0, 4) + ').'; }
    if (m.fechaMeta && m.fechaMeta > hoy) {
      const meses = Math.max(1, Math.round(U.diasEntre(hoy, m.fechaMeta) / 30.4));
      return 'Para llegar el ' + diaMes(m.fechaMeta) + ' aparta unos ' + $(Math.ceil(falta / meses)) + ' al mes.';
    }
    return 'Dime cuánto aportas al mes y te digo cuándo llegas.';
  }
  function metas(cont) {
    const D = S().d, hoy = AF.app.hoy();
    cont.appendChild(intro('Ahorra para algo concreto. Con Pro, «Hoy puedes gastar» aparta tus aportes antes de decirte cuánto te queda.'));
    if (!D.metas.length) cont.appendChild(vacio('Aún no tienes metas', 'Un viaje, una moto, un colchón para emergencias. Ponle nombre y monto.', 'Crear una meta', () => formMeta(null)));
    else cont.appendChild(h('div', { class: 'lista' }, D.metas.map((m) => { const a = ahorrado(m), pct = m.objetivo ? a / m.objetivo : 0;
      return bloque({ icono: m.icono || '🏁', titulo: m.nombre, sub: $(a) + ' de ' + $(m.objetivo), derecha: h('span', { class: 'monto' }, Math.round(pct * 100) + ' %'), progreso: pct, nivel: pct >= 1 ? 'ok' : '',
        nota: ritmoMeta(m, hoy), onclick: () => AF.app.abrir(m.nombre, (c) => detalleMeta(c, m.id)) }); })));
    return masBtn('Nueva meta', () => formMeta(null));
  }
  function detalleMeta(cont, id) {
    const m = S().buscar('metas', id), hoy = AF.app.hoy();
    if (!m) { setTimeout(() => AF.app.atras(), 0); return; }
    const a = ahorrado(m), pct = m.objetivo ? Math.min(1, a / m.objetivo) : 0;
    cont.appendChild(h('div', { class: 'plastico' },
      h('div', { class: 'plastico-cabeza' }, h('span', null, (m.icono || '🏁') + ' ' + m.nombre), h('span', { class: 'suave' }, Math.round(pct * 100) + ' %')),
      h('div', null, h('div', { class: 'suave texto-sm' }, 'Llevas'), h('div', { class: 'plastico-cifra' }, $(a))),
      h('div', null, h('div', { class: 'plastico-pie' }, h('span', null, 'Meta ' + $(m.objetivo)), h('span', { class: 'suave' }, 'Faltan ' + $(Math.max(0, m.objetivo - a)))), h('div', { class: 'cupo' }, h('i', { estilo: { width: pct * 100 + '%' } })))));
    cont.appendChild(h('p', { class: 'suave', estilo: { margin: '14px 0 0' } }, ritmoMeta(m, hoy)));
    cont.appendChild(h('div', { estilo: { display: 'flex', gap: '10px', marginTop: '16px' } }, boton('Aportar o retirar', 'btn-voz', () => formAporte(m)), h('button', { class: 'btn btn-borde', type: 'button', 'aria-label': 'Editar meta', onclick: () => formMeta(m) }, ico('editar'))));
    const ap = (m.aportes || []).slice().sort((x, y) => (x.fecha < y.fecha ? 1 : -1));
    cont.appendChild(seccion('Movimientos de esta meta', ap.length ? h('div', { class: 'lista' }, ap.map((x) => h('div', { class: 'fila' },
      h('div', { class: 'ico ' + (x.monto >= 0 ? 'ingreso' : 'gasto') }, x.monto >= 0 ? '＋' : '－'),
      h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, x.monto >= 0 ? 'Aporte' : 'Retiro'), h('div', { class: 'fila-sub' }, diaMes(x.fecha))),
      h('span', { class: 'monto ' + (x.monto >= 0 ? 'ingreso' : 'gasto') }, (x.monto >= 0 ? '+' : '−') + $(Math.abs(x.monto))),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Quitar este movimiento', onclick: () => { S().editar('metas', m.id, { aportes: m.aportes.filter((z) => z.id !== x.id) }, 'Quité un aporte'); } }, ico('basura')))))
      : h('p', { class: 'suave' }, 'Aún no has aportado. Toca «Aportar» cuando separes plata para esta meta.')));
    cont.appendChild(h('div', { estilo: { textAlign: 'center', marginTop: '24px' } }, h('button', { class: 'btn-texto btn-peligro', type: 'button', onclick: async () => { if (await eliminar('metas', m.id, '¿Eliminar la meta «' + m.nombre + '»?', 'Se borra la meta y sus aportes. Tus gastos no se tocan.', 'Eliminé una meta')) AF.app.atras(); } }, 'Eliminar esta meta')));
  }
  function formAporte(m) {
    const e = { signo: 1 }, hoy = AF.app.hoy();
    const monto = entradaMonto('', '0', 'Monto'), fecha = h('input', { class: 'entrada', type: 'date', value: hoy, max: hoy }), err = errorEl(), tabs = h('div', { class: 'segmentos' });
    const pintar = () => { AF.ui.vaciar(tabs); [[1, 'Aportar'], [-1, 'Retirar']].forEach(([s, t]) => tabs.appendChild(h('button', { type: 'button', 'aria-pressed': e.signo === s ? 'true' : 'false', onclick: () => { e.signo = s; pintar(); } }, t))); };
    pintar();
    hoja({ titulo: 'Aporte a «' + m.nombre + '»', cuerpo: h('div', null, tabs, campo('Monto', monto), campo('Fecha', fecha), err),
      acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
        const v = num(monto); if (!(v > 0)) { err.textContent = 'Escribe un monto mayor que cero.'; return false; }
        if (e.signo < 0 && v > ahorrado(m)) { err.textContent = 'Solo tienes ' + $(ahorrado(m)) + ' en esta meta.'; return false; }
        S().editar('metas', m.id, { aportes: (m.aportes || []).concat([{ id: U.uid(), fecha: fecha.value || hoy, monto: U.r2(v * e.signo) }]) }, e.signo > 0 ? 'Aporté a una meta' : 'Retiré de una meta');
        const lograda = e.signo > 0 && ahorrado(m) < m.objetivo && ahorrado(S().buscar('metas', m.id)) >= m.objetivo;
        aviso(lograda ? '🎉 ¡Meta lograda!' : e.signo > 0 ? 'Aporte guardado' : 'Retiro guardado', { texto: 'Deshacer', onclick: () => S().deshacer() });
        if (lograda) AF.ui.confeti();
      } }] });
    setTimeout(() => monto.focus(), 200);
  }
  function formMeta(m) {
    const D = S().d, edit = !!m;
    if (!edit && !AF.acceso.puedeAgregar('metas', D.metas.length)) return C().pedirLimite('metas', 'meta de ahorro', 'metas de ahorro');
    const e = { icono: edit ? m.icono || '🏁' : ICONOS_META[0] };
    const nombre = h('input', { class: 'entrada', placeholder: 'Ej.: viaje a la playa', maxlength: 40, value: edit ? m.nombre : '', 'aria-label': 'Nombre de la meta' });
    const objetivo = entradaMonto(edit ? m.objetivo : '', '0', 'Cuánto quieres juntar');
    const aporte = h('input', { class: 'entrada', inputmode: 'decimal', placeholder: 'Opcional', value: edit && m.aporteMensual ? String(m.aporteMensual).replace('.', ',') : '', 'aria-label': 'Aporte al mes' });
    const fechaMeta = h('input', { class: 'entrada', type: 'date', value: edit && m.fechaMeta ? m.fechaMeta : '', min: AF.app.hoy() });
    const err = errorEl(), zonaIcono = h('div');
    const pintar = () => { AF.ui.vaciar(zonaIcono); zonaIcono.appendChild(h('div', { class: 'opciones' }, ICONOS_META.map((i) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': e.icono === i ? 'true' : 'false', 'aria-label': 'Icono ' + i, onclick: () => { e.icono = i; pintar(); } }, i)))); };
    pintar();
    hoja({ titulo: edit ? 'Editar meta' : 'Nueva meta', cuerpo: h('div', null, campo('Nombre', nombre), campo('Icono', zonaIcono), campo('Cuánto quieres juntar', objetivo), campo('Cuánto aportas al mes', aporte, 'Con esto te digo cuándo llegas. Puedes dejarlo vacío.'), campo('Fecha que te gustaría llegar', fechaMeta, 'Opcional.'), err),
      acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
        const n = nombre.value.trim(), o = num(objetivo), a = aporte.value.trim() ? num(aporte) : null;
        if (!n) { err.textContent = 'Ponle un nombre a la meta.'; nombre.focus(); return false; }
        if (!(o > 0)) { err.textContent = 'Escribe cuánto quieres juntar.'; objetivo.focus(); return false; }
        if (a != null && !(a > 0)) { err.textContent = 'El aporte mensual debe ser mayor que cero (o déjalo vacío).'; return false; }
        const datos = { nombre: n, icono: e.icono, objetivo: U.r2(o), aporteMensual: a != null ? U.r2(a) : null, fechaMeta: fechaMeta.value || null };
        if (edit) S().editar('metas', m.id, datos, 'Edité una meta'); else S().agregar('metas', Object.assign(datos, { aportes: [] }), 'Creé una meta');
        aviso('Meta guardada');
      } }] });
    setTimeout(() => nombre.focus(), 200);
  }

  /* ========================================================================= PAGOS FIJOS */
  const delTipo = (esSub) => (p) => !!p.suscripcion === esSub;
  function pagar(p) {
    const cat = p.cat || 'otros';
    S().agregar('movs', { tipo: 'gasto', monto: p.monto, cat, desc: p.nombre, fecha: AF.app.hoy(), cuenta: 'efectivo', nec: S().categoria(cat).nec || null, pagoFijoId: p.id }, 'Pagué ' + p.nombre);
    aviso(p.nombre + ': pagado', { texto: 'Deshacer', onclick: () => S().deshacer() });
  }
  function filaFijo(p, hoy) {
    const e = I().estadoFijo(S().d, p, hoy);
    const sub = e.pagado ? 'Pagado · próximo ' + diaMesC(e.proxima)
      : e.atrasado ? 'Atrasado · venció el ' + diaMesC(e.proxima) : 'Vence el ' + diaMesC(e.proxima) + (e.diasPara <= 3 ? (e.diasPara <= 0 ? ' · hoy' : ' · en ' + plural(e.diasPara, 'día', 'días')) : '');
    return bloque({ icono: S().categoria(p.cat || 'otros').icono, tono: e.atrasado ? 'gasto' : '', titulo: p.nombre, sub, derecha: h('span', { class: 'monto' }, $(p.monto)), onclick: () => formFijo(p, !!p.suscripcion),
      accion: e.pagado ? h('span', { class: 'etiqueta-estado ya' }, 'Pagado') : h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => pagar(p) }, 'Pagar') });
  }
  function fijos(cont) {
    const D = S().d, hoy = AF.app.hoy(), lista = D.pagosFijos.filter(delTipo(false));
    cont.appendChild(intro('Lo que pagas todos los meses. «Hoy puedes gastar» ya lo aparta para que no te falte.'));
    if (!lista.length) cont.appendChild(vacio('Aún no tienes pagos fijos', 'Arriendo, internet, colegio, la cuota de la moto…', 'Agregar un pago fijo', () => formFijo(null, false)));
    else {
      cont.appendChild(h('div', { class: 'resumen-dos' }, h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Al mes'), h('div', { class: 'dato-valor' }, $(lista.filter((p) => p.activo !== false).reduce((s, p) => s + p.monto, 0)))),
        h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Pendiente este ciclo'), h('div', { class: 'dato-valor' }, $(I().puedesGastarHoy(D, hoy, 'simple').fijos)))));
      cont.appendChild(h('div', { class: 'lista', estilo: { marginTop: '12px' } }, lista.slice().sort((a, b) => I().estadoFijo(D, a, hoy).proxima.localeCompare(I().estadoFijo(D, b, hoy).proxima)).map((p) => filaFijo(p, hoy))));
    }
    return masBtn('Agregar pago fijo', () => formFijo(null, false));
  }
  function formFijo(p, esSub) {
    const D = S().d, edit = !!p;
    if (!edit && !esSub && !AF.acceso.puedeAgregar('pagosFijos', D.pagosFijos.filter(delTipo(false)).length)) return C().pedirLimite('pagosFijos', 'pago fijo', 'pagos fijos');
    const e = { cat: edit ? p.cat || 'otros' : esSub ? 'suscripciones' : 'otros', manual: edit };
    const nombre = h('input', { class: 'entrada', placeholder: esSub ? 'Ej.: Netflix' : 'Ej.: arriendo', maxlength: 40, value: edit ? p.nombre : '', 'aria-label': 'Nombre' });
    const monto = entradaMonto(edit ? p.monto : '', '0', 'Monto'), dia = h('input', { class: 'entrada', inputmode: 'numeric', placeholder: '1 a 31', maxlength: 2, value: edit ? p.dia : '', 'aria-label': 'Día del mes' });
    const err = errorEl(), zonaCat = h('div');
    const pintarCat = () => { AF.ui.vaciar(zonaCat); zonaCat.appendChild(campo('Categoría', C().selectorCategoria('gasto', e.cat, (id) => { e.cat = id; e.manual = true; }))); };
    nombre.addEventListener('change', () => {                                                    // sugiere la categoría según el nombre, si aún no la elegiste
      if (e.manual || !nombre.value.trim() || !AF.parser) return;
      const pal = U.norm(nombre.value).split(/\s+/).filter(Boolean);
      const c = AF.parser.clasificar(pal, pal.map((_, i) => i), 'gasto', { categorias: S().categorias(), dicc: D.diccionario });
      if (c.cat) { e.cat = c.cat.id; pintarCat(); }
    });
    pintarCat();
    hoja({ titulo: edit ? 'Editar' : esSub ? 'Nueva suscripción' : 'Nuevo pago fijo', cuerpo: h('div', null, campo('Nombre', nombre), campo('Monto', monto), campo('Se cobra el día', dia, 'Del 1 al 31. Si el mes no tiene ese día, se cobra el último.'), zonaCat, err),
      acciones: (edit ? [{ texto: 'Eliminar', clase: 'btn-borde btn-peligro', onclick: (a) => cierra(a, () => eliminar('pagosFijos', p.id, '¿Eliminar «' + p.nombre + '»?', 'Los gastos que ya registraste se quedan.', 'Quité un pago fijo')) }] : [])
        .concat([{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
          const n = nombre.value.trim(), v = num(monto), dd = Math.round(U.parseNumero(dia.value) || 0);
          if (!n) { err.textContent = 'Ponle un nombre.'; nombre.focus(); return false; }
          if (!(v > 0)) { err.textContent = 'Escribe un monto mayor que cero.'; monto.focus(); return false; }
          if (!(dd >= 1 && dd <= 31)) { err.textContent = 'El día debe ser del 1 al 31.'; dia.focus(); return false; }
          const datos = { nombre: n, monto: U.r2(v), dia: dd, cat: e.cat, activo: true, suscripcion: edit ? !!p.suscripcion : !!esSub };
          if (edit) S().editar('pagosFijos', p.id, datos, 'Edité un pago fijo'); else S().agregar('pagosFijos', datos, 'Agregué un pago fijo');
          aviso('Guardado'); AF.app.programarAvisos && AF.app.programarAvisos();
        } }]) });
    setTimeout(() => nombre.focus(), 200);
  }

  /* ======================================================================= SUSCRIPCIONES */
  function suscripciones(cont) {
    const D = S().d, hoy = AF.app.hoy(), lista = D.pagosFijos.filter(delTipo(true));
    const total = lista.filter((p) => p.activo !== false).reduce((s, p) => s + p.monto, 0);
    cont.appendChild(intro('Lo que pagas cada mes sin pensarlo: streaming, música, la nube, el gimnasio.'));
    if (lista.length) cont.appendChild(h('div', { class: 'resumen-dos' }, h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Al mes'), h('div', { class: 'dato-valor' }, $(total))), h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Al año'), h('div', { class: 'dato-valor' }, $(U.r2(total * 12))))));
    if (!lista.length) cont.appendChild(vacio('Aún no tienes suscripciones', 'Anótalas y mira cuánto suman al año; a veces sorprende.', 'Agregar una suscripción', () => formFijo(null, true)));
    else cont.appendChild(h('div', { class: 'lista', estilo: { marginTop: '12px' } }, lista.map((p) => filaFijo(p, hoy))));
    // Pro: las que se repiten solas en tus gastos
    const detectadas = I().suscripcionesDetectadas(D, hoy);
    if (AF.acceso.tiene('suscripcionesDetectadas')) {
      if (detectadas.length) cont.appendChild(seccion('Encontré pagos que se repiten', [h('p', { class: 'texto-sm suave' }, 'Mismo concepto, mismo monto y casi el mismo día cada mes. Agrégalos si quieres que los aparte.'),
        h('div', { class: 'lista' }, detectadas.map((x) => h('div', { class: 'bloque' }, h('div', { class: 'bloque-fila' }, h('div', { class: 'bloque-cab' }, h('div', { class: 'ico' }, S().categoria(x.cat).icono),
          h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, x.nombre), h('div', { class: 'fila-sub' }, $(x.monto) + ' · el día ' + x.dia + ' · ' + x.meses + ' meses seguidos'))),
          h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => { S().agregar('pagosFijos', { nombre: x.nombre, monto: x.monto, dia: x.dia, cat: x.cat, activo: true, suscripcion: true }, 'Agregué una suscripción'); aviso(x.nombre + ' agregada'); } }, 'Agregar')))))]));
      else cont.appendChild(h('p', { class: 'texto-sm suave', estilo: { marginTop: '24px' } }, 'Cuando se repita un pago en tus gastos, aquí te aviso para que lo agregues.'));
    } else cont.appendChild(h('div', { estilo: { marginTop: '24px' } }, C().gancho('Pro encuentra solo los pagos que se repiten cada mes en tus gastos.', 'suscripcionesDetectadas')));
    return masBtn('Agregar suscripción', () => formFijo(null, true));
  }

  /* ====================================================================== PRÉSTAMOS */
  const pend = (p) => I().pendientePrestamo(p);
  function mensajeCobro(p) {
    return 'Hola ' + p.persona + ', te escribo para recordarte que me debes ' + $(pend(p)) + (p.nota ? ' por ' + p.nota.toLowerCase() : '') + (p.fechaLimite ? ' (acordamos para el ' + diaMes(p.fechaLimite) + ')' : '') + '. ¡Gracias!';
  }
  function filaPrestamo(p, hoy) {
    const vencido = !p.pagado && p.fechaLimite && p.fechaLimite < hoy;
    const sub = (p.nota ? p.nota + ' · ' : '') + (p.pagado ? 'Saldado' : p.fechaLimite ? (vencido ? 'Venció el ' : 'Para el ') + diaMes(p.fechaLimite) : 'Sin fecha');
    return bloque({ icono: p.direccion === 'me_deben' ? '📥' : '📤', tono: vencido ? 'gasto' : '', titulo: p.persona, sub, derecha: h('span', { class: 'monto ' + (p.pagado ? '' : p.direccion === 'me_deben' ? 'ingreso' : 'gasto') }, p.pagado ? $(p.monto) : $(pend(p))),
      nota: !p.pagado && (p.abonos || []).length ? 'De ' + $(p.monto) + ' · ya abonaron ' + $(U.r2(p.monto - pend(p))) : null, onclick: () => opcionesPrestamo(p) });
  }
  function prestamos(cont) {
    const D = S().d, hoy = AF.app.hoy(), r = I().prestamosResumen(D);
    cont.appendChild(intro('Lo que prestaste y lo que te prestaron. No cuenta como gasto ni como ingreso.'));
    if (!D.prestamos.length) { cont.appendChild(vacio('Nadie te debe y no le debes a nadie', 'Anota un préstamo para no olvidarte de cobrarlo o pagarlo.', 'Anotar un préstamo', () => formPrestamo(null))); return masBtn('Anotar préstamo', () => formPrestamo(null)); }
    cont.appendChild(h('div', { class: 'resumen-dos' }, h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Te deben'), h('div', { class: 'dato-valor', estilo: { color: 'var(--ingreso)' } }, $(r.meDeben))), h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Debes'), h('div', { class: 'dato-valor', estilo: { color: 'var(--gasto)' } }, $(r.debo)))));
    const activos = D.prestamos.filter((p) => !p.pagado), meDeben = activos.filter((p) => p.direccion === 'me_deben'), debo = activos.filter((p) => p.direccion !== 'me_deben'), saldados = D.prestamos.filter((p) => p.pagado);
    if (meDeben.length) cont.appendChild(seccion('Te deben', h('div', { class: 'lista' }, meDeben.map((p) => filaPrestamo(p, hoy)))));
    if (debo.length) cont.appendChild(seccion('Debes', h('div', { class: 'lista' }, debo.map((p) => filaPrestamo(p, hoy)))));
    if (saldados.length) cont.appendChild(seccion('Ya saldados', h('div', { class: 'lista' }, saldados.slice(-5).reverse().map((p) => filaPrestamo(p, hoy)))));
    return masBtn('Anotar préstamo', () => formPrestamo(null));
  }
  function opcionesPrestamo(p) {
    const boton2 = (t, fn, clase) => h('button', { class: 'btn ' + (clase || 'btn-borde') + ' btn-bloque', type: 'button', onclick: () => { api.cerrar(); fn(); } }, t);
    const cuerpo = h('div', { estilo: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' } });
    if (!p.pagado) {
      cuerpo.appendChild(boton2(p.direccion === 'me_deben' ? 'Me abonaron' : 'Abonar', () => formAbono(p), 'btn-primario'));
      cuerpo.appendChild(boton2('Marcar como saldado', () => { S().editar('prestamos', p.id, { pagado: true, fechaPago: AF.app.hoy() }, 'Saldé un préstamo'); aviso('Saldado', { texto: 'Deshacer', onclick: () => S().deshacer() }); AF.app.programarAvisos && AF.app.programarAvisos(); }));
      if (p.direccion === 'me_deben') cuerpo.appendChild(h('button', { class: 'btn btn-borde btn-bloque', type: 'button', onclick: () => { if (!C().requiere('cobroPorWhatsApp')) { api.cerrar(); return; } N().compartirTexto('Recordatorio de pago', mensajeCobro(p)).then((r) => { if (r === 'copiado') aviso('Mensaje copiado: pégalo en WhatsApp'); }); } }, 'Recordarle por WhatsApp', AF.acceso.tiene('cobroPorWhatsApp') ? null : AF.ui.chipPro()));
    } else cuerpo.appendChild(boton2('Volver a abrir', () => S().editar('prestamos', p.id, { pagado: false, fechaPago: null }, 'Reabrí un préstamo')));
    cuerpo.appendChild(boton2('Editar', () => formPrestamo(p)));
    cuerpo.appendChild(h('button', { class: 'btn-texto btn-peligro', type: 'button', onclick: () => { api.cerrar(); eliminar('prestamos', p.id, '¿Eliminar este préstamo?', 'Se borra de tu lista.', 'Eliminé un préstamo'); } }, 'Eliminar'));
    const api = hoja({ titulo: p.persona + ' · ' + $(p.pagado ? p.monto : pend(p)), cuerpo });
  }
  function formAbono(p) {
    const monto = entradaMonto('', '0', 'Monto del abono'), err = errorEl();
    hoja({ titulo: p.direccion === 'me_deben' ? 'Abono de ' + p.persona : 'Abonar a ' + p.persona, cuerpo: h('div', null, h('p', { class: 'suave' }, 'Falta ' + $(pend(p)) + '.'), campo('Monto', monto), err),
      acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
        const v = num(monto); if (!(v > 0)) { err.textContent = 'Escribe un monto mayor que cero.'; return false; }
        if (v > pend(p) + 0.001) { err.textContent = 'Solo falta ' + $(pend(p)) + '.'; return false; }
        const abonos = (p.abonos || []).concat([{ fecha: AF.app.hoy(), monto: U.r2(v) }]);
        const salda = U.r2(pend(p) - v) <= 0;
        S().editar('prestamos', p.id, { abonos, pagado: salda, fechaPago: salda ? AF.app.hoy() : null }, 'Abono a un préstamo');
        aviso(salda ? 'Saldado' : 'Abono guardado', { texto: 'Deshacer', onclick: () => S().deshacer() });
      } }] });
    setTimeout(() => monto.focus(), 200);
  }
  function formPrestamo(p) {
    const D = S().d, edit = !!p;
    if (!edit && !AF.acceso.puedeAgregar('prestamos', D.prestamos.filter((x) => !x.pagado).length)) return C().pedirLimite('prestamos', 'préstamo abierto', 'préstamos abiertos');
    const e = { dir: edit ? p.direccion : 'me_deben' };
    const persona = h('input', { class: 'entrada', placeholder: 'Nombre', maxlength: 40, value: edit ? p.persona : '', 'aria-label': 'Persona' });
    const monto = entradaMonto(edit ? p.monto : '', '0', 'Monto'), nota = h('input', { class: 'entrada', placeholder: 'Ej.: para el arriendo', maxlength: 60, value: edit ? p.nota || '' : '', 'aria-label': 'Nota' });
    const limite = h('input', { class: 'entrada', type: 'date', value: edit && p.fechaLimite ? p.fechaLimite : '' });
    const err = errorEl(), tabs = h('div', { class: 'segmentos' });
    const pintar = () => { AF.ui.vaciar(tabs); [['me_deben', 'Me deben'], ['debo', 'Debo']].forEach(([k, t]) => tabs.appendChild(h('button', { type: 'button', 'aria-pressed': e.dir === k ? 'true' : 'false', onclick: () => { e.dir = k; pintar(); } }, t))); };
    pintar();
    hoja({ titulo: edit ? 'Editar préstamo' : 'Nuevo préstamo', cuerpo: h('div', null, tabs, campo('¿Con quién?', persona), campo('Monto', monto), campo('Nota', nota), campo('Fecha límite', limite, 'Opcional. Te aviso ese día.'), err),
      acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
        const n = persona.value.trim(), v = num(monto);
        if (!n) { err.textContent = 'Escribe con quién es.'; persona.focus(); return false; }
        if (!(v > 0)) { err.textContent = 'Escribe un monto mayor que cero.'; monto.focus(); return false; }
        const datos = { persona: n, monto: U.r2(v), direccion: e.dir, nota: nota.value.trim(), fechaLimite: limite.value || null };
        if (edit) S().editar('prestamos', p.id, datos, 'Edité un préstamo'); else S().agregar('prestamos', Object.assign(datos, { pagado: false, abonos: [], fecha: AF.app.hoy() }), 'Anoté un préstamo');
        aviso('Guardado'); AF.app.programarAvisos && AF.app.programarAvisos();
      } }] });
    setTimeout(() => persona.focus(), 200);
  }

  /* ============================================================================ RETOS */
  function retos(cont) {
    const D = S().d, hoy = AF.app.hoy(), r = I().reto(D, hoy), hist = D.retos.filter((x) => x.estado !== 'activo');
    const hm30 = I().hormiga(D, U.sumarDias(hoy, -29), hoy);   // 30 días contando hoy (antes no contaba lo de hoy y decía «vas bien» con un gasto hormiga ya registrado)
    if (!r) {
      cont.appendChild(h('div', { class: 'plastico', estilo: { minHeight: '0', gap: '10px' } }, h('div', { class: 'plastico-cabeza' }, h('span', null, '🏆 ' + PLAN.reto.nombre)),
        h('p', { estilo: { fontSize: '22px', lineHeight: 1.3, fontWeight: 600, margin: 0 } }, 'Un día a la vez: si no compras antojos ni gastos chiquitos, la racha sigue.'),
        hm30.total > 0 ? h('p', { class: 'suave texto-sm' }, 'En los últimos 30 días gastaste ' + $(hm30.total) + ' en ' + plural(hm30.veces, 'compra pequeña', 'compras pequeñas') + '. Ese es el ahorro que te juegas.') : h('p', { class: 'suave texto-sm' }, 'Los últimos 30 días no tienes gastos hormiga registrados. Vas bien.')));
      cont.appendChild(h('div', { estilo: { marginTop: '16px' } }, boton('Empezar el reto hoy', 'btn-voz btn-bloque', () => { S().agregar('retos', { tipo: 'hormiga', estado: 'activo', inicio: hoy }, 'Empecé un reto'); aviso('Reto en marcha: ¡el día 1 es hoy!'); })));
      cont.appendChild(h('p', { class: 'texto-sm suave', estilo: { marginTop: '14px' } }, 'Cuenta como gasto hormiga una compra de ' + $(PLAN.hormiga.montoMaximo) + ' o menos en categorías como antojos o comida de la calle. Si registras una, la racha vuelve a cero.'));
    } else {
      const falla = r.fallaHoy;
      cont.appendChild(h('div', { class: 'plastico', estilo: { gap: '6px' } },
        h('div', { class: 'plastico-cabeza' }, h('span', null, '🏆 ' + PLAN.reto.nombre), h('span', { class: 'suave' }, r.fallos ? plural(r.fallos, 'recaída', 'recaídas') : 'Sin recaídas')),
        h('div', null, h('div', { class: 'suave texto-sm' }, r.completado ? '¡Lo lograste!' : falla ? 'Hoy se cortó la racha' : 'Llevas'), h('div', { class: 'plastico-cifra' }, r.racha + (r.racha === 1 ? ' día' : ' días'))),
        h('div', { class: 'plastico-pie' }, h('span', null, 'Meta: ' + r.meta + ' días seguidos'), r.ahorroEstimado > 0 ? h('span', { class: 'suave' }, 'Ahorro estimado ' + $(r.ahorroEstimado)) : null),
        h('div', { class: 'cupo' }, h('i', { estilo: { width: (r.racha / r.meta) * 100 + '%' } }))));
      cont.appendChild(h('div', { class: 'rejilla-dias', role: 'img', 'aria-label': 'Días de la racha actual: ' + r.racha + ' de ' + r.meta }, r.dias.map((x) => h('i', { class: 'punto-dia ' + (x.estado === 'ok' ? 'ok' : x.estado === 'hoy' ? 'hoy' : x.estado === 'falla' ? 'falla' : '') }))));
      cont.appendChild(h('p', { class: 'texto-sm suave', estilo: { marginTop: '16px' } }, r.completado ? 'Treinta días seguidos sin un gasto hormiga. Guarda el logro y, si quieres, empieza otro.'
        : falla ? 'Registraste un gasto hormiga hoy. No pasa nada: mañana empieza una racha nueva.' : 'Faltan ' + (r.meta - r.racha) + ' días. Hoy cuenta cuando termine el día sin gastos hormiga.'));
      cont.appendChild(h('div', { estilo: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px' } },
        r.completado ? boton('Guardar el logro', 'btn-voz btn-bloque', () => S().editar('retos', r.id, { estado: 'logrado', fin: hoy, ahorro: r.ahorroEstimado }, 'Terminé un reto'))
          : h('button', { class: 'btn-texto btn-peligro', type: 'button', onclick: async () => { if (await C().confirmar({ titulo: '¿Dejar el reto?', texto: 'Se cierra y pierdes la racha de ' + r.racha + (r.racha === 1 ? ' día.' : ' días.'), si: 'Dejarlo', peligro: true })) S().editar('retos', r.id, { estado: 'abandonado', fin: hoy }, 'Dejé un reto'); } }, 'Dejar el reto')));
    }
    if (hist.length) cont.appendChild(seccion('Tus retos', h('div', { class: 'lista' }, hist.slice().reverse().slice(0, 8).map((x) => h('div', { class: 'fila' }, h('div', { class: 'ico' }, x.estado === 'logrado' ? '🏆' : '🏳️'),
      h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, x.estado === 'logrado' ? 'Logrado' : 'Lo dejaste'), h('div', { class: 'fila-sub' }, diaMes(x.inicio) + (x.fin ? ' → ' + diaMes(x.fin) : ''))),
      x.ahorro ? h('span', { class: 'monto ingreso' }, '≈ ' + $(x.ahorro)) : null)))));
  }

  V.finanzas = { presupuestos, metas, fijos, prestamos, suscripciones, retos, ritmoMeta, ahorrado, mensajeCobro };
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/vistas/informes-ui.js ===== */
/* Resumen y reportes: mes, año, acumulado y comparar; gráficas; PDF, Excel y CSV; el resumen para compartir (texto o imagen). */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, aviso, fila } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const S = () => AF.store, C = () => V.comun, I = () => AF.informes, N = () => AF.nativo;
  const $ = (n) => U.dinero(n);
  const hoyISO = () => AF.app.hoy();

  const est = { modo: 'mes', mes: null, anio: null };
  const MODOS = [['mes', 'Mes', null], ['anio', 'Año', 'resumenAnualAcumulado'], ['todo', 'Todo', 'resumenAnualAcumulado'], ['comparar', 'Comparar', 'compararMeses']];

  /* ---------------------------------------------------------------- periodos */
  const primeraFecha = (D) => D.movs.reduce((m, x) => (x.fecha < m ? x.fecha : m), hoyISO());
  const nombreMesAnio = (iso) => U.cap(U.nombreMes(iso)) + ' ' + iso.slice(0, 4);
  // El rango de lo que se está viendo (o de lo que pidió la voz: periodo = salida del intérprete)
  function rangoDe(modo, mes, anio, periodo) {
    const D = S().d, hoy = hoyISO();
    if (periodo && !['mes', 'mes_pasado', 'mes_nombre', 'anio', 'anio_pasado', 'todo'].includes(periodo.clave)) {
      return { desde: periodo.desde, hasta: periodo.hasta < hoy ? periodo.hasta : hoy, etiqueta: periodo.etiqueta, clave: periodo.clave, titulo: U.cap(periodo.etiqueta) };
    }
    if (modo === 'anio') { const a = String(anio); return { desde: a + '-01-01', hasta: a + '-12-31', etiqueta: 'del año ' + a, clave: 'anio', titulo: 'Año ' + a, corto: a }; }
    if (modo === 'todo') return { desde: primeraFecha(D), hasta: hoy, etiqueta: 'acumulado', clave: 'todo', titulo: 'Todo lo que llevas', corto: 'acumulado' };
    const ini = U.inicioMes(mes || hoy);
    return { desde: ini, hasta: U.finMes(ini), etiqueta: 'de ' + U.nombreMes(ini) + ' de ' + ini.slice(0, 4), clave: 'mes', titulo: nombreMesAnio(ini), corto: U.nombreMes(ini) };
  }
  function modoDePeriodo(p) {
    if (!p) return { modo: 'mes' };
    if (p.clave === 'anio' || p.clave === 'anio_pasado') return { modo: 'anio', anio: p.desde.slice(0, 4) };
    if (p.clave === 'todo') return { modo: 'todo' };
    if (p.clave === 'mes' || p.clave === 'mes_pasado' || p.clave === 'mes_nombre') return { modo: 'mes', mes: U.inicioMes(p.desde) };
    return { modo: 'mes' };
  }

  /* ---------------------------------------------------------------- exportar */
  async function exportar(formato, r) {
    const D = S().d, hoy = hoyISO();
    const sello = r.clave === 'mes' ? r.desde.slice(0, 7) : r.clave === 'anio' ? r.desde.slice(0, 4) : r.clave === 'todo' ? 'acumulado' : r.desde + '_' + r.hasta;
    try {
      if (formato === 'csv') {
        if (!C().requiere('exportarCSV')) return false;
        await N().entregarArchivo('movimientos-' + sello + '.csv', I().csv(D, r.desde, r.hasta), 'text/csv');
      } else if (formato === 'excel') {
        if (!C().requiere('exportarExcel')) return false;
        await N().entregarArchivo('movimientos-' + sello + '.xlsx', AF.archivos.excelMovimientos(D, r.desde, r.hasta), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      } else if (formato === 'pdf') {
        if (!C().requiere(r.clave === 'mes' ? 'pdfMensualBasico' : 'pdfProfesional')) return false;
        const bytes = AF.pdf.informe(D, { desde: r.desde, hasta: r.hasta, etiqueta: r.etiqueta }, { nombre: D.ajustes.nombre, hoy, completo: AF.acceso.tiene('pdfProfesional'), moneda: D.ajustes.moneda });
        await N().entregarArchivo('resumen-' + sello + '.pdf', bytes, 'application/pdf');
      }
      aviso('Archivo listo');
      return true;
    } catch (e) { aviso('No pude crear el archivo'); return false; }
  }

  /* ----------------------------------------------------------------- gráficas */
  const NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, ...hijos) {
    const el = g.document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (v != null) el.setAttribute(k, v); });
    hijos.flat().forEach((c) => { if (c != null) el.appendChild(typeof c === 'string' ? g.document.createTextNode(c) : c); });
    return el;
  }
  const TIPOS_GRAFICA = [['barras', 'Barras'], ['lineas', 'Líneas'], ['circulo', 'Círculo']];
  const tipoGrafica = () => (S().d.ajustes.grafica || 'barras');
  const selectorGrafica = () => h('div', { class: 'segmentos segmentos-chico', role: 'tablist', 'aria-label': 'Tipo de gráfica' }, TIPOS_GRAFICA.map(([k, t]) => h('button', { type: 'button', role: 'tab', 'aria-pressed': tipoGrafica() === k ? 'true' : 'false', onclick: () => S().ajustar({ grafica: k }) }, t)));
  const nombreMesLargo = (mes) => U.cap(U.nombreMes(mes + '-01')) + ' ' + mes.slice(0, 4);
  const etiquetaMes = (s) => nombreMesLargo(s.mes) + ': ingresos ' + $(s.ingresos) + ', gastos ' + $(s.gastos) + '. Toca para ver el detalle de ese mes.';

  // Ingresos (verde) y gastos (rojo) por mes. Tocar un mes abre el resumen de ese mes.
  function graficaMeses(serie, alTocar) {
    const tipo = tipoGrafica();
    const mx = Math.max.apply(null, serie.map((s) => Math.max(s.ingresos, s.gastos)).concat([1]));
    if (tipo === 'lineas') {
      const W = 320, H = 150, px = 18, py = 16, n = serie.length;
      const X = (i) => (n === 1 ? W / 2 : px + (i * (W - 2 * px)) / (n - 1)), Y = (v) => H - 22 - (v / mx) * (H - 22 - py);
      const linea = (clave, color) => svg('polyline', { points: serie.map((s, i) => X(i) + ',' + Y(s[clave])).join(' '), fill: 'none', stroke: color, 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
      const puntos = (clave, color) => serie.map((s, i) => svg('circle', { cx: X(i), cy: Y(s[clave]), r: 4.5, fill: color, stroke: 'var(--hoja)', 'stroke-width': 2 }));
      const ancho = n === 1 ? W : (W - 2 * px) / (n - 1);
      return svg('svg', { class: 'grafica-lineas', viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': 'Ingresos y gastos por mes' },
        [0, 0.5, 1].map((f) => svg('line', { x1: 0, x2: W, y1: Y(mx * f), y2: Y(mx * f), stroke: 'var(--linea)', 'stroke-width': 1 })),
        linea('ingresos', 'var(--ingreso-vivo)'), linea('gastos', 'var(--gasto-vivo)'), puntos('ingresos', 'var(--ingreso-vivo)'), puntos('gastos', 'var(--gasto-vivo)'),
        serie.map((s, i) => svg('text', { x: X(i), y: H - 6, 'text-anchor': 'middle', class: 'grafica-etq' }, s.etiqueta)),
        serie.map((s, i) => svg('rect', { x: X(i) - ancho / 2, y: 0, width: ancho, height: H, fill: 'transparent', class: 'grafica-toque', tabindex: 0, role: 'button', 'aria-label': etiquetaMes(s), onclick: null,
          'data-mes': s.mes })));
    }
    if (tipo === 'circulo') {
      const tot = serie.reduce((a, s) => a + s.gastos, 0) || 1, R = 54, C = 2 * Math.PI * R;
      let acum = 0; const tonos = serie.map((s, i) => 'hsl(0 ' + (62 + (i % 2) * 8) + '% ' + (34 + Math.round((i / Math.max(1, serie.length - 1)) * 34)) + '%)');
      const trozos = serie.map((s, i) => { const len = (s.gastos / tot) * C; const c = svg('circle', { cx: 70, cy: 70, r: R, fill: 'none', stroke: tonos[i], 'stroke-width': 26, 'stroke-dasharray': Math.max(0, len - 1.5) + ' ' + (C - Math.max(0, len - 1.5)), 'stroke-dashoffset': -acum, transform: 'rotate(-90 70 70)', class: 'grafica-toque', 'data-mes': s.mes, role: 'button', tabindex: 0, 'aria-label': etiquetaMes(s) }); acum += len; return c; });
      return h('div', { class: 'grafica-circulo' },
        svg('svg', { viewBox: '0 0 140 140', class: 'donut', role: 'group', 'aria-label': 'Gastos por mes' }, trozos,
          svg('text', { x: 70, y: 66, 'text-anchor': 'middle', class: 'donut-etq' }, 'Gastos'), svg('text', { x: 70, y: 84, 'text-anchor': 'middle', class: 'donut-valor' }, $(tot))),
        h('div', { class: 'lista-meses' }, serie.map((s, i) => h('button', { type: 'button', class: 'mes-fila', 'aria-label': etiquetaMes(s), onclick: () => alTocar(s.mes) },
          h('i', { estilo: { background: tonos[i] } }), h('span', null, nombreMesLargo(s.mes)), h('strong', { class: 'num' }, $(s.gastos)), h('small', { class: 'suave' }, Math.round((s.gastos / tot) * 100) + ' %')))));
    }
    return h('div', { class: 'barra-vertical' }, serie.map((s) => h('button', { type: 'button', class: 'col-mes', 'aria-label': etiquetaMes(s), onclick: () => alTocar(s.mes) },
      h('div', { class: 'par' }, h('i', { class: 'i', estilo: { height: Math.max(1, (s.ingresos / mx) * 100) + '%' } }), h('i', { class: 'g', estilo: { height: Math.max(1, (s.gastos / mx) * 100) + '%' } })), h('small', null, s.etiqueta))));
  }
  // Se conectan los toques de las gráficas SVG (los círculos y rectángulos con data-mes)
  function conectarToques(el, alTocar) { el.querySelectorAll('[data-mes]').forEach((n) => { const ir = () => alTocar(n.getAttribute('data-mes')); n.addEventListener('click', ir); n.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ir(); } }); }); return el; }

  // Leyenda: dice con palabras qué es cada color.
  const leyendaIG = () => h('div', { class: 'leyenda leyenda-grande' },
    h('span', null, h('i', { estilo: { background: 'var(--ingreso-vivo)' } }), h('b', null, 'Verde: '), 'ingresos (lo que entró)'),
    h('span', null, h('i', { estilo: { background: 'var(--gasto-vivo)' } }), h('b', null, 'Rojo: '), 'gastos (lo que salió)'));
  function barrasCategorias(lista, n) {
    const mx = lista.length ? lista[0].total : 1;
    return h('div', null, lista.slice(0, n).map((x) => h('div', { class: 'barra-h' }, h('span', { class: 'barra-h-ico', 'aria-hidden': 'true' }, x.cat.icono),
      h('div', { class: 'barra-h-pista' }, h('i', { estilo: { width: Math.max(3, (x.total / mx) * 100) + '%', background: x.cat.color || '' } })), h('span', { class: 'monto' }, $(x.total)),
      h('div', { class: 'barra-h-nombre' }, h('span', null, x.cat.nombre), h('span', { class: 'suave' }, Math.round(x.pct * 100) + ' %')))));
  }
  function circuloCategorias(lista, n) {
    const top = lista.slice(0, n), tot = top.reduce((a, x) => a + x.total, 0) || 1, R = 54, C = 2 * Math.PI * R;
    let acum = 0;
    const trozos = top.map((x, i) => { const len = (x.total / tot) * C; const c = svg('circle', { cx: 70, cy: 70, r: R, fill: 'none', stroke: x.cat.color || PLAN.apariencia.paleta[i % PLAN.apariencia.paleta.length], 'stroke-width': 26, 'stroke-dasharray': Math.max(0, len - 1.5) + ' ' + (C - Math.max(0, len - 1.5)), 'stroke-dashoffset': -acum, transform: 'rotate(-90 70 70)' }); acum += len; return c; });
    return h('div', { class: 'grafica-circulo' },
      svg('svg', { viewBox: '0 0 140 140', class: 'donut', role: 'img', 'aria-label': 'Gastos por categoría' }, trozos, svg('text', { x: 70, y: 66, 'text-anchor': 'middle', class: 'donut-etq' }, 'Gastos'), svg('text', { x: 70, y: 84, 'text-anchor': 'middle', class: 'donut-valor' }, $(tot))),
      h('div', { class: 'lista-meses' }, top.map((x) => h('div', { class: 'mes-fila' }, h('i', { estilo: { background: x.cat.color || 'var(--acento)' } }), h('span', null, x.cat.icono + ' ' + x.cat.nombre), h('strong', { class: 'num' }, $(x.total)), h('small', { class: 'suave' }, Math.round(x.pct * 100) + ' %')))));
  }
  function serieDe(r, modo) {
    const D = S().d, hoy = hoyISO();
    if (modo === 'anio') { const out = []; for (let m = 0; m < 12; m++) { const ini = r.desde.slice(0, 5) + U.pad(m + 1) + '-01'; const t = I().totales(D, ini, U.finMes(ini)); out.push({ mes: ini.slice(0, 7), etiqueta: U.MESES_CORTOS[m], ingresos: t.ingresos, gastos: t.gastos }); } return out; }
    return I().serieMensual(D, modo === 'mes' ? r.hasta < hoy ? r.hasta : hoy : hoy, modo === 'mes' ? 6 : 12);
  }
  function bloqueNecGusto(t) {
    const tot = t.nec.N + t.nec.G + t.nec.sin; if (!tot) return null;
    const pc = (v) => Math.round((v / tot) * 100);
    return h('div', null, h('div', { class: 'barra-dividida', role: 'img', 'aria-label': 'Necesario ' + pc(t.nec.N) + ' por ciento, gusto ' + pc(t.nec.G) + ' por ciento' },
      t.nec.N ? h('i', { class: 'seg-nec', estilo: { flex: t.nec.N } }) : null, t.nec.G ? h('i', { class: 'seg-gus', estilo: { flex: t.nec.G } }) : null, t.nec.sin ? h('i', { class: 'seg-sin', estilo: { flex: t.nec.sin } }) : null),
      h('div', { class: 'leyenda' }, h('span', null, h('i', { class: 'seg-nec' }), 'Necesario ' + $(t.nec.N) + ' · ' + pc(t.nec.N) + ' %'), h('span', null, h('i', { class: 'seg-gus' }), 'Gusto ' + $(t.nec.G) + ' · ' + pc(t.nec.G) + ' %')));
  }
  const seccion = (titulo, ...hijos) => h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, titulo)), hijos);

  /* ------------------------------------------------------- tarjeta para compartir */
  // El «Wrapped»: una tarjeta con porcentajes y sin montos, para mandar a quien quieras.
  function datosWrapped(D, r) {
    const t = I().totales(D, r.desde, r.hasta), tot = t.nec.N + t.nec.G + t.nec.sin;
    const top = t.porCategoria.slice(0, 3);
    const ahorro = t.ingresos > 0 ? Math.round(((t.ingresos - t.gastos) / t.ingresos) * 100) : null;
    const gran = ahorro != null && ahorro > 0 ? ['Me sobró el ', ahorro + ' %', ' de lo que gané'] : top.length ? ['Lo que más gasté: ', top[0].cat.nombre.toLowerCase(), ''] : ['Aún no tengo gastos', '', ''];
    const lineas = top.map((c) => c.cat.icono + ' ' + Math.round(c.pct * 100) + ' % en ' + c.cat.nombre.toLowerCase());
    if (tot) lineas.push('⚖️ Necesario ' + Math.round((t.nec.N / tot) * 100) + ' %, gustos ' + Math.round((t.nec.G / tot) * 100) + ' %');
    return { gran, lineas, titulo: 'Mi ' + (r.clave === 'mes' ? r.corto : r.clave === 'anio' ? 'año ' + r.corto : r.clave === 'todo' ? 'recorrido' : 'periodo') };
  }
  function tarjetaWrapped(D, r) {
    const w = datosWrapped(D, r);
    return h('div', { class: 'tarjeta-wrapped' }, h('div', { class: 'mes' }, w.titulo + ' con ' + PLAN.app.nombre),
      h('div', { class: 'gran' }, w.gran[0], w.gran[1] ? h('em', null, w.gran[1]) : null, w.gran[2]), h('ul', null, w.lineas.map((l) => h('li', null, l))));
  }
  async function imagenWrapped(D, r) {
    const w = datosWrapped(D, r), W = 1080, H = 1350, c = g.document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), fam = 'Bricolage, system-ui, sans-serif';
    try { await Promise.all([g.document.fonts.load('700 60px Bricolage'), g.document.fonts.load('500 40px Bricolage')]); } catch (e) { /* usa la fuente del sistema */ }
    const fondo = x.createLinearGradient(0, 0, W, H); fondo.addColorStop(0, '#0B1A30'); fondo.addColorStop(1, '#14305A');
    x.fillStyle = fondo; x.fillRect(0, 0, W, H);
    const sol = x.createRadialGradient(W - 200, H - 280, 30, W - 160, H - 240, 380); sol.addColorStop(0, '#F5A33A'); sol.addColorStop(1, '#F28A1B');
    x.fillStyle = sol; x.beginPath(); x.arc(W - 120, H - 200, 360, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#FFC53D'; x.fillRect(90, 130, 90, 12);
    x.fillStyle = '#B9C6DA'; x.font = '500 40px ' + fam; x.fillText(w.titulo + ' con ' + PLAN.app.nombre, 90, 210);
    // línea grande con la parte clave en naranja, partida en renglones
    x.font = '700 96px ' + fam; let y = 380;
    const trozos = [[w.gran[0], '#FFFFFF'], [w.gran[1], '#FFD166'], [w.gran[2], '#FFFFFF']].filter((t) => t[0]);
    let cx = 90; const lh = 118;
    trozos.forEach(([txt, col]) => { txt.split(/(\s+)/).forEach((p) => { const wd = x.measureText(p).width; if (cx + wd > W - 90 && p.trim()) { cx = 90; y += lh; } if (!(cx === 90 && !p.trim())) { x.fillStyle = col; x.fillText(p, cx, y); cx += wd; } }); });
    x.fillStyle = '#FFFFFF'; x.font = '500 50px ' + fam; y += 150;
    w.lineas.forEach((l) => { x.fillText(l, 90, y); y += 84; });
    x.fillStyle = '#B9C6DA'; x.font = '500 34px ' + fam; x.fillText('Sin montos: solo porcentajes', 90, 1250);
    const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
    return new Uint8Array(await blob.arrayBuffer());
  }

  /* ----------------------------------------------------------------- pantalla */
  function resumen(cont) {
    const D = S().d, hoy = hoyISO();
    if (!est.mes) est.mes = U.inicioMes(hoy);
    if (!est.anio) est.anio = hoy.slice(0, 4);
    // Gratis solo ve el mes
    if (est.modo !== 'mes' && !AF.acceso.tiene(est.modo === 'comparar' ? 'compararMeses' : 'resumenAnualAcumulado')) est.modo = 'mes';

    cont.appendChild(h('div', { class: 'segmentos', role: 'tablist', 'aria-label': 'Periodo' }, MODOS.map(([k, t, fn]) => h('button', { type: 'button', role: 'tab', 'aria-pressed': est.modo === k ? 'true' : 'false',
      onclick: () => { if (fn && !AF.acceso.tiene(fn)) return C().pedirPro(fn); est.modo = k; AF.app.redibujar(); } }, t, fn && !AF.acceso.tiene(fn) ? h('span', { class: 'mini-pro', role: 'img', 'aria-label': 'Pro' }, ico('estrella', 'relleno')) : null))));
    if (est.modo === 'comparar') return comparar(cont);

    const r = rangoDe(est.modo, est.mes, est.anio);
    // navegación del periodo
    if (est.modo !== 'todo') {
      const esMes = est.modo === 'mes', actual = esMes ? est.mes >= U.inicioMes(hoy) : est.anio >= hoy.slice(0, 4);
      const mover = (n) => { if (esMes) est.mes = U.sumarMeses(est.mes, n); else est.anio = String(Number(est.anio) + n); AF.app.redibujar(); };
      cont.appendChild(h('div', { estilo: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' } },
        h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Anterior', onclick: () => mover(-1) }, ico('atras')),
        h('strong', { class: 'h2', estilo: { fontSize: '18px' } }, r.titulo + (actual ? ' · actual' : '')),
        h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Siguiente', disabled: actual, estilo: { opacity: actual ? '.3' : '1' }, onclick: () => { if (!actual) mover(1); } }, ico('derecha'))));
    }
    const t = I().totales(D, r.desde, r.hasta);
    if (!t.ingresos && !t.gastos) {
      cont.appendChild(h('div', { class: 'vacio' }, h('strong', null, 'Nada que mostrar aquí'), 'No hay movimientos en este periodo. Cuando registres gastos o ingresos, aparecen aquí.'));
      return;
    }
    cont.appendChild(h('div', { class: 'dos-datos' },
      h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Ingresos'), h('div', { class: 'dato-valor', estilo: { color: 'var(--ingreso)' } }, $(t.ingresos))),
      h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Gastos'), h('div', { class: 'dato-valor', estilo: { color: 'var(--gasto)' } }, $(t.gastos)))));
    cont.appendChild(h('p', { class: 'texto-sm', estilo: { marginTop: '12px' } }, t.balance >= 0 ? 'Te sobraron ' : 'Gastaste ', h('strong', null, $(Math.abs(t.balance))), t.balance >= 0 ? (t.ingresos ? ' (' + Math.round((t.balance / t.ingresos) * 100) + ' % de lo que ganaste).' : '.') : ' más de lo que ganaste.'));
    // Tocar un mes en la gráfica abre el resumen de ese mes.
    const alTocarMes = (mes) => { est.modo = 'mes'; est.mes = mes + '-01'; AF.app.redibujar(); };
    const circulo = tipoGrafica() === 'circulo';
    cont.appendChild(seccion(est.modo === 'anio' ? 'Mes a mes' : 'Últimos meses', selectorGrafica(),
      h('div', { estilo: { marginTop: '12px' } }, circulo ? h('p', { class: 'texto-sm suave', estilo: { marginBottom: '8px' } }, 'Lo que gastaste en cada mes (tonos de rojo).') : leyendaIG(),
        conectarToques(graficaMeses(serieDe(r, est.modo), alTocarMes), alTocarMes),
        h('p', { class: 'texto-xs suave', estilo: { marginTop: '10px' } }, 'Toca un mes para ver todo lo que pasó en él.'))));
    if (est.modo === 'mes') cont.appendChild(h('button', { class: 'btn btn-borde btn-bloque', type: 'button', estilo: { marginTop: '16px' }, onclick: () => V.movimientos.irAMes(est.mes) }, 'Ver los movimientos de ' + U.cap(U.nombreMes(est.mes))));
    if (t.porCategoria.length) cont.appendChild(seccion('En qué se fue', circulo ? circuloCategorias(t.porCategoria, 8) : barrasCategorias(t.porCategoria, 8)));
    const nec = bloqueNecGusto(t); if (nec) cont.appendChild(seccion('Necesario o gusto', nec));
    const hm = I().hormiga(D, r.desde, r.hasta);
    if (hm.veces) { const pro = AF.acceso.tiene('hormigaDetalle');
      cont.appendChild(seccion('Gastos hormiga', fila({ icono: '🐜', titulo: $(hm.total) + ' en ' + hm.veces + (hm.veces === 1 ? ' compra' : ' compras'), sub: 'Al año serían unos ' + $(hm.alAnio), derecha: pro ? ico('derecha') : AF.ui.chipPro(), onclick: () => (pro ? AF.app.abrir('Gastos hormiga', (c) => hormiga(c)) : C().pedirPro('hormigaDetalle')) }))); }

    /* compartir */
    cont.appendChild(seccion('Compartir', tarjetaWrapped(D, r),
      h('div', { estilo: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' } },
        h('button', { class: 'btn btn-primario btn-bloque', type: 'button', onclick: async () => { const x = await N().compartirTexto('Mi resumen', I().resumenCompartir(D, hoy, { desde: r.desde, hasta: r.hasta, etiqueta: r.corto || r.etiqueta })); if (x === 'copiado') aviso('Resumen copiado'); } }, 'Compartir como texto'),
        h('button', { class: 'btn btn-borde btn-bloque', type: 'button', onclick: async () => {
          if (!C().requiere('compartirCaptura')) return;
          try { await N().entregarArchivo('mi-resumen.png', await imagenWrapped(D, r), 'image/png'); } catch (e) { aviso('No pude crear la imagen'); }
        } }, 'Compartir como imagen', AF.acceso.tiene('compartirCaptura') ? null : AF.ui.chipPro())),
      h('p', { class: 'texto-xs suave', estilo: { marginTop: '10px' } }, 'Va sin montos: solo porcentajes.')));

    /* exportar */
    cont.appendChild(seccion('Descargar', h('div', { class: 'lista' },
      fila({ icono: '📕', titulo: 'PDF', sub: 'Resumen con gráficas y lista de movimientos', derecha: AF.acceso.tiene(r.clave === 'mes' ? 'pdfMensualBasico' : 'pdfProfesional') ? ico('derecha') : AF.ui.chipPro(), onclick: () => exportar('pdf', r) }),
      fila({ icono: '📗', titulo: 'Excel', sub: 'Movimientos y resumen en hojas separadas', derecha: AF.acceso.tiene('exportarExcel') ? ico('derecha') : AF.ui.chipPro(), onclick: () => exportar('excel', r) }),
      fila({ icono: '📄', titulo: 'CSV', sub: 'Para abrir en cualquier hoja de cálculo', derecha: ico('derecha'), onclick: () => exportar('csv', r) }))));
  }

  /* ----------------------------------------------------------------- comparar */
  function comparar(cont) {
    const D = S().d, hoy = hoyISO();
    const b = est.mes, a = U.sumarMeses(b, -1), actual = b >= U.inicioMes(hoy);
    cont.appendChild(h('div', { estilo: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' } },
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Mes anterior', onclick: () => { est.mes = U.sumarMeses(b, -1); AF.app.redibujar(); } }, ico('atras')),
      h('strong', { class: 'h2', estilo: { fontSize: '18px', textAlign: 'center' } }, U.cap(U.nombreMes(b)) + ' frente a ' + U.nombreMes(a)),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Mes siguiente', disabled: actual, estilo: { opacity: actual ? '.3' : '1' }, onclick: () => { if (!actual) { est.mes = U.sumarMeses(b, 1); AF.app.redibujar(); } } }, ico('derecha'))));
    const tb = I().totales(D, b, U.finMes(b)), ta = I().totales(D, a, U.finMes(a));
    if (!tb.gastos && !ta.gastos) { cont.appendChild(h('div', { class: 'vacio' }, h('strong', null, 'No hay con qué comparar'), 'Necesito gastos en alguno de los dos meses.')); return; }
    const pill = (nuevo, viejo, malSube) => {
      if (!viejo) return nuevo ? h('span', { class: 'cambio igual' }, 'nuevo') : h('span', { class: 'cambio igual' }, '—');
      const dif = Math.round(((nuevo - viejo) / viejo) * 100);
      if (dif === 0) return h('span', { class: 'cambio igual' }, '= igual');
      return h('span', { class: 'cambio ' + ((dif > 0) === malSube ? 'sube' : 'baja') }, (dif > 0 ? '▲ ' : '▼ ') + Math.abs(dif) + ' %');
    };
    const fila2 = (t, va, vb, malSube) => h('div', { class: 'fila', estilo: { minHeight: '56px' } }, h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, t), h('div', { class: 'fila-sub' }, $(va) + ' → ' + $(vb))), pill(vb, va, malSube));
    cont.appendChild(seccion('En total', h('div', { class: 'lista' }, fila2('Gastos', ta.gastos, tb.gastos, true), fila2('Ingresos', ta.ingresos, tb.ingresos, false), fila2('Balance', ta.balance, tb.balance, false))));
    const ids = Array.from(new Set(ta.porCategoria.map((x) => x.id).concat(tb.porCategoria.map((x) => x.id))));
    const filas = ids.map((id) => ({ cat: I().catDe(D, id), va: (ta.porCategoria.find((x) => x.id === id) || { total: 0 }).total, vb: (tb.porCategoria.find((x) => x.id === id) || { total: 0 }).total }))
      .sort((x, y) => Math.max(y.va, y.vb) - Math.max(x.va, x.vb));
    cont.appendChild(seccion('Por categoría', h('div', { class: 'lista' }, filas.map((x) => h('div', { class: 'fila', estilo: { minHeight: '60px' } }, h('div', { class: 'ico' }, x.cat.icono),
      h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, x.cat.nombre), h('div', { class: 'fila-sub' }, $(x.va) + ' → ' + $(x.vb))), pill(x.vb, x.va, true))))));
  }

  /* ----------------------------------------------------------------- hormiga (Pro) */
  function hormiga(cont) {
    const D = S().d, hoy = hoyISO(), hm = I().hormiga(D, U.inicioMes(hoy), hoy);
    if (!hm.veces) { cont.appendChild(h('div', { class: 'vacio' }, h('strong', null, 'Sin gastos hormiga este mes'), 'Una compra de ' + $(PLAN.hormiga.montoMaximo) + ' o menos en antojos o comida de la calle cuenta como hormiga. Aquí no hay ninguna.')); return; }
    cont.appendChild(h('div', { class: 'plastico' }, h('div', { class: 'plastico-cabeza' }, h('span', null, '🐜 Gastos hormiga'), h('span', { class: 'suave' }, 'Este mes')),
      h('div', { class: 'plastico-cifra' }, $(hm.total)), h('div', { class: 'plastico-pie' }, h('span', null, hm.veces + (hm.veces === 1 ? ' compra' : ' compras')), h('span', { class: 'suave' }, 'Al año: ' + $(hm.alAnio)))));
    cont.appendChild(h('div', { class: 'nota', estilo: { marginTop: '16px' } }, ico('info'), h('span', null, 'Si los reduces a la mitad, ahorras unos ', h('strong', null, $(U.r2(hm.alAnio / 2))), ' al año.')));
    const mx = hm.porProducto[0].total;
    cont.appendChild(seccion('Cuáles son', h('div', { class: 'lista' }, hm.porProducto.slice(0, 10).map((p) => h('div', { class: 'bloque' },
      h('div', { class: 'bloque-fila' }, h('div', { class: 'bloque-cab' }, h('div', { class: 'ico' }, p.icono), h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, U.cap(p.nombre)), h('div', { class: 'fila-sub' }, p.veces + (p.veces === 1 ? ' vez' : ' veces'))), h('span', { class: 'monto' }, $(p.total)))),
      h('div', { class: 'progreso' }, h('i', { estilo: { width: (p.total / mx) * 100 + '%' } })))))));
    cont.appendChild(h('div', { estilo: { marginTop: '20px' } }, h('button', { class: 'btn btn-voz btn-bloque', type: 'button', onclick: () => AF.app.abrir('Retos', (c) => V.finanzas.retos(c)) }, 'Probar el reto de 30 días')));
  }

  /* ------------------------------------------------- lo que pide la voz: «dame el informe en PDF» */
  function abrir(o) {
    o = o || {};
    if (!o.formato || o.formato === 'pantalla') {
      const m = modoDePeriodo(o.periodo);
      est.modo = m.modo; if (m.mes) est.mes = m.mes; if (m.anio) est.anio = m.anio;
      if (est.modo !== 'mes' && !AF.acceso.tiene('resumenAnualAcumulado')) { est.modo = 'mes'; }
      return AF.app.abrir('Resumen', (c) => resumen(c));
    }
    const m = modoDePeriodo(o.periodo);
    return exportar(o.formato, rangoDe(m.modo, m.mes, m.anio, o.periodo));
  }

  V.informesUI = { resumen, hormiga, abrir, exportar, rangoDe, datosWrapped, imagenWrapped, estado: est };
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/vistas/bandeja.js ===== */
/* Agregar sin escribir: foto de una factura, mensajes del banco compartidos o pegados, y estados de cuenta.
   Nada se guarda solo: todo cae en «Por revisar» y la persona confirma (o corrige) cada cosa. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, hoja, aviso, campo } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const S = () => AF.store, C = () => V.comun, N = () => AF.nativo, L = () => AF.lector, I = () => AF.informes;
  const $ = (n) => U.dinero(n);
  const ctx = () => ({ hoy: AF.app.hoy(), categorias: S().categorias(), dicc: S().d.diccionario });
  const ORIGEN = { factura: ['🧾', 'Factura'], banco: ['🏦', 'Mensaje del banco'], captura: ['📷', 'Captura'], texto: ['📝', 'Texto'] };
  const diaMes = (iso) => U.deISO(iso).getDate() + ' ' + U.MESES_CORTOS[U.deISO(iso).getMonth()];

  /* ------------------------------------------------------------- a la bandeja */
  // x = salida del lector ({ok, tipo, monto, fecha, desc, cat, items, tarjeta4, duda}) o null si no se entendió nada
  function agregarABandeja(origen, texto, x) {
    const prop = x && x.ok ? { tipo: x.tipo, monto: x.monto, cat: x.cat, desc: x.desc || '', fecha: x.fecha } : null;
    const t4 = x && x.tarjeta4 ? x.tarjeta4 : null;
    const tj = t4 ? S().d.tarjetas.find((t) => t.ultimos4 === t4) : null;
    if (prop && tj && prop.tipo === 'gasto') { prop.cuenta = 'tarjeta'; prop.tarjetaId = tj.id; }
    return S().agregar('bandeja', { origen, texto: String(texto || '').slice(0, 2000), propuesta: prop, items: x && x.items ? x.items : [], dividir: false, tarjeta4: t4, duda: x ? x.duda : ['monto'], hecho: false }, 'Llegó algo a la bandeja');
  }
  const pendientes = () => S().d.bandeja.filter((b) => !b.hecho);
  const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
  // Abre «Por revisar»; si ya estamos ahí solo la redibuja (no apila la misma pantalla dos veces)
  function mostrar() {
    const tope = AF.app.pila[AF.app.pila.length - 1];
    if (tope && tope.titulo === 'Por revisar') AF.app.redibujar(); else AF.app.abrir('Por revisar', (c) => render(c));
  }
  // Ejecuta fn y devuelve un «Deshacer» que revierte exactamente lo que fn anotó en el historial
  function conDeshacer(fn) {
    const antes = S().d.historial.length, r = fn(), k = Math.max(0, S().d.historial.length - antes);
    return { resultado: r, accion: { texto: 'Deshacer', onclick: () => { for (let i = 0; i < k; i++) S().deshacer(); AF.app.redibujar(); } } };
  }

  function movDe(p) {
    const m = { tipo: p.tipo, monto: U.r2(p.monto), cat: p.cat, desc: p.desc || '', fecha: p.fecha, cuenta: p.cuenta || 'efectivo' };
    if (p.tipo === 'gasto') m.nec = S().categoria(p.cat).nec || null;
    if (m.cuenta === 'tarjeta') { m.tarjetaId = p.tarjetaId; m.credito = { modo: 'corriente' }; }
    return m;
  }
  // Productos de una factura, solo si caben dentro del total. Lo que falte (IVA, propina, redondeo) va en una línea aparte
  // para que la suma de las partes sea EXACTAMENTE el total de la factura.
  function partes(it) {
    const p = it.propuesta, xs = it.items || [];
    if (!p || xs.length < 2) return null;
    const suma = U.r2(xs.reduce((s, x) => s + x.monto, 0)), resto = U.r2(p.monto - suma);
    if (resto < -0.005) return null;
    const lista = xs.map((x) => Object.assign({}, p, { monto: x.monto, cat: x.cat, desc: x.desc }));
    if (resto >= 0.01) lista.push(Object.assign({}, p, { monto: resto, desc: p.desc ? p.desc + ' (IVA y otros)' : 'IVA y otros', corto: 'IVA y otros' }));
    return lista;
  }
  function guardarItem(it) {
    const p = it.propuesta; if (!p) return 0;
    const dividida = it.dividir ? partes(it) : null;
    const lista = dividida || [p];
    lista.forEach((q) => S().agregar('movs', movDe(q), 'Guardé desde la bandeja'));
    S().editar('bandeja', it.id, { hecho: true, resultado: 'guardado' }, 'Revisé un pendiente');
    return lista.length;
  }

  /* ------------------------------------------------------------------ pantalla */
  function render(cont) {
    const D = S().d, pend = pendientes();
    cont.appendChild(h('p', { class: 'suave', estilo: { margin: '4px 0 12px' } }, 'Aquí caen las facturas y los mensajes del banco. Tú confirmas antes de que cuenten.'));
    cont.appendChild(h('div', { estilo: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } },
      h('button', { class: 'btn btn-borde', type: 'button', onclick: fotoFactura }, ico('camara', 'chico'), 'Foto'),
      h('button', { class: 'btn btn-borde', type: 'button', onclick: pegarTexto }, ico('papel', 'chico'), 'Pegar texto')));
    if (!pend.length) {
      cont.appendChild(h('div', { class: 'vacio' }, h('strong', null, 'Nada por revisar'),
        'Comparte un mensaje de tu app del banco o de WhatsApp y elige «' + PLAN.app.nombreCorto + '». También puedes sacar una foto a una factura o pegar el texto.'));
    } else {
      cont.appendChild(h('div', { class: 'lista', estilo: { marginTop: '8px' } }, pend.map(tarjetaItem)));
      const validos = pend.filter((x) => x.propuesta);
      if (validos.length >= 2) cont.appendChild(h('div', { estilo: { marginTop: '18px' } }, h('button', { class: 'btn btn-primario btn-bloque', type: 'button', onclick: () => {
        const u = conDeshacer(() => validos.reduce((s, x) => s + guardarItem(x), 0)); aviso(plural(u.resultado, 'movimiento guardado', 'movimientos guardados'), u.accion);
      } }, 'Guardar los ' + validos.length)));
    }
    const hechos = D.bandeja.filter((b) => b.hecho).length;
    if (hechos) cont.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '24px', textAlign: 'center' } }, plural(hechos, 'ya revisado', 'ya revisados')));
  }

  function tarjetaItem(it) {
    const p = it.propuesta, [em, nom] = ORIGEN[it.origen] || ORIGEN.texto;
    const cuerpo = h('div', { class: 'bloque' });
    cuerpo.appendChild(h('div', { class: 'bloque-fila' }, h('div', { class: 'bloque-cab' }, h('div', { class: 'ico ' + (p ? (p.tipo === 'ingreso' ? 'ingreso' : 'gasto') : '') }, p ? S().categoria(p.cat).icono : em),
      h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, p ? (p.desc || S().categoria(p.cat).nombre) : 'No pude leer un monto'),
        h('div', { class: 'fila-sub' }, p ? S().categoria(p.cat).nombre + ' · ' + diaMes(p.fecha) + (p.cuenta === 'tarjeta' ? ' · ' + (S().buscar('tarjetas', p.tarjetaId) || { nombre: 'tarjeta' }).nombre : '') : nom)),
      p ? h('span', { class: 'monto ' + (p.tipo === 'ingreso' ? 'ingreso' : 'gasto') }, (p.tipo === 'ingreso' ? '+' : '−') + $(p.monto)) : null)));
    if (it.duda && it.duda.length && p) cuerpo.appendChild(h('div', { class: 'bloque-nota' }, 'Revisa: ' + it.duda.map((d) => ({ monto: 'el monto', tipo: 'si es gasto o ingreso', fecha: 'la fecha', categoria: 'la categoría' }[d] || d)).join(', ') + '.'));
    if (it.texto) cuerpo.appendChild(h('details', { class: 'bloque-nota' }, h('summary', { estilo: { cursor: 'pointer' } }, 'Ver lo que leí'), h('pre', { estilo: { whiteSpace: 'pre-wrap', margin: '8px 0 0', font: 'inherit', fontSize: '13px' } }, it.texto)));
    const pp = p ? partes(it) : null;
    if (pp) {
      const pro = AF.acceso.tiene('fotoFacturaProductos');
      cuerpo.appendChild(h('button', { class: 'interruptor', type: 'button', role: 'switch', 'aria-checked': it.dividir && pro ? 'true' : 'false', estilo: { width: '100%', textAlign: 'left', minHeight: '56px', borderBottom: 0, paddingBottom: 0 },
        onclick: () => { if (!pro) return C().pedirPro('fotoFacturaProductos'); S().editar('bandeja', it.id, { dividir: !it.dividir }, 'Cambié cómo guardar'); } },
        h('div', { class: 'interruptor-texto' }, h('div', { class: 'fila-titulo', estilo: { whiteSpace: 'normal' } }, 'Dividir por productos (' + pp.length + ')', pro ? null : AF.ui.chipPro()),
          h('div', { class: 'fila-sub', estilo: { whiteSpace: 'normal' } }, pp.slice(0, 3).map((x) => (x.corto || x.desc) + ' ' + $(x.monto)).join(' · ') + (pp.length > 3 ? '…' : ''))), h('span', { class: 'pastilla' })));
    }
    cuerpo.appendChild(h('div', { estilo: { display: 'flex', gap: '8px', marginTop: '12px' } },
      p ? h('button', { class: 'btn btn-primario btn-chico', type: 'button', estilo: { flex: 1 }, onclick: () => { const u = conDeshacer(() => guardarItem(it)); aviso(u.resultado > 1 ? u.resultado + ' movimientos guardados' : 'Guardado', u.accion); } }, 'Guardar') : null,
      h('button', { class: 'btn btn-borde btn-chico', type: 'button', estilo: { flex: p ? 'none' : 1 }, onclick: () => editar(it) }, p ? 'Editar' : 'Escribirlo yo'),
      h('button', { class: 'btn btn-borde btn-chico', type: 'button', 'aria-label': 'Descartar', onclick: () => { S().editar('bandeja', it.id, { hecho: true, resultado: 'descartado' }, 'Descarté un pendiente'); aviso('Descartado', { texto: 'Deshacer', onclick: () => S().deshacer() }); } }, ico('basura', 'chico'))));
    return cuerpo;
  }
  function editar(it) {
    const p = it.propuesta;
    C().formMovimiento({ inicial: p ? Object.assign({}, p) : { tipo: 'gasto', fecha: AF.app.hoy(), desc: '' },
      alGuardar: (m) => { S().agregar('movs', m, 'Guardé desde la bandeja'); S().editar('bandeja', it.id, { hecho: true, resultado: 'guardado' }, 'Revisé un pendiente'); aviso('Guardado'); } });
  }

  /* ---------------------------------------------------- foto de una factura */
  async function elegirArchivo() {
    return AF.app.sinBloqueo(async () => {
      const inp = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'oculto', 'aria-hidden': 'true' });
      g.document.body.appendChild(inp);
      try {
        return await new Promise((res) => {
          const fin = (f) => res(f || null);
          inp.addEventListener('change', () => fin(inp.files && inp.files[0]));
          inp.addEventListener('cancel', () => fin(null));
          setTimeout(() => fin(null), 180000);                         // si nunca contesta, no se queda sin bloqueo para siempre
          inp.click();
        });
      } finally { inp.remove(); }
    });
  }
  async function fotoFactura() {
    const f = await elegirArchivo(); if (!f) return;
    aviso('Leyendo la factura…');
    let texto;
    try { texto = await AF.app.sinBloqueo(() => N().leerTextoDeImagen(f)); }
    catch (e) {
      if (e.codigo === 'solo_app') return pegarTexto('Leer fotos todavía no está disponible en esta versión. Mientras tanto, pega aquí el texto de la factura.');
      return aviso('No pude leer esa foto. Prueba con más luz y la factura bien plana.');
    }
    if (!String(texto).trim()) return aviso('No encontré texto en la foto. Prueba con más luz y la factura bien plana.');
    const x = L().factura(texto, ctx());
    agregarABandeja('factura', texto, x);
    mostrar();
  }

  /* -------------------------------------------------------- pegar un texto */
  function pegarTexto(mensaje) {
    const ta = h('textarea', { class: 'entrada', rows: 6, placeholder: 'Pega aquí el mensaje del banco o el texto de la factura', estilo: { height: '150px', padding: '12px 16px', resize: 'none' }, 'aria-label': 'Texto a leer' });
    const err = h('div', { class: 'ayuda', role: 'alert', estilo: { color: 'var(--gasto)', minHeight: '18px', marginTop: '8px' } });
    hoja({ titulo: 'Pegar un texto', cuerpo: h('div', null, typeof mensaje === 'string' ? h('p', { class: 'suave', estilo: { marginTop: '6px' } }, mensaje) : null, campo('Texto', ta, 'Puede traer varios mensajes: dejo una línea en blanco entre uno y otro.'), err),
      acciones: [{ texto: 'Leer', clase: 'btn-primario', onclick: () => { const n = leerTexto(ta.value, 'texto'); if (!n) { err.textContent = 'No encontré ningún monto en ese texto.'; return false; } mostrar(); } }] });
    setTimeout(() => ta.focus(), 200);
  }
  // Decide si es una factura o mensajes del banco. Devuelve cuántos pendientes creó.
  function leerTexto(texto, origen) {
    const t = String(texto || '').trim(); if (!t) return 0;
    const pareceFactura = /factura|ruc\b|subtotal|iva\b/i.test(U.norm(t));
    const f = pareceFactura ? L().factura(t, ctx()) : null;
    if (f && f.ok) { agregarABandeja(origen === 'captura' ? 'captura' : 'factura', t, f); return 1; }
    const lista = L().bancarioVarios(t, ctx());
    if (lista.length) { lista.forEach((x) => agregarABandeja(origen === 'captura' ? 'captura' : 'banco', x.texto, x)); return lista.length; }
    const f2 = L().factura(t, ctx());
    if (f2.ok) { agregarABandeja(origen === 'captura' ? 'captura' : 'factura', t, f2); return 1; }
    return 0;
  }

  /* ------------------------------------------- lo que llega desde otra app (compartir) */
  function recibir(x) {
    let n = 0, sinLeer = 0;
    (x.textos || []).forEach((t) => { const k = leerTexto(t, 'banco'); if (k) n += k; else { agregarABandeja('texto', t, null); sinLeer++; } });
    if ((x.imagenes || []).length) {
      if (!AF.acceso.tiene('compartirCaptura')) C().pedirPro('compartirCaptura');
      else x.imagenes.forEach((t) => { const k = leerTexto(t, 'captura'); if (k) n += k; else if (String(t).trim()) { agregarABandeja('captura', t, null); sinLeer++; } });
    }
    if (n + sinLeer) { aviso(plural(n + sinLeer, 'cosa por revisar', 'cosas por revisar')); mostrar(); }
  }

  /* ======================================================= estado de cuenta */
  const imp = { texto: '', tarjetaId: '', lineas: null, sel: new Set(), conciliado: null };
  function importar(cont) {
    const D = S().d, pro = AF.acceso.tiene('conciliar');
    cont.appendChild(h('p', { class: 'suave', estilo: { margin: '4px 0 6px' } }, 'Pega el texto de tu estado de cuenta (copiado de la app del banco o de tu PDF). Reviso línea por línea; tú eliges qué agregar.'));
    const zona = h('div');
    const ta = h('textarea', { class: 'entrada', rows: 6, placeholder: 'Fecha   Descripción   Valor\n05/10/2026  SUPERMAXI  45,30\n…', estilo: { height: '150px', padding: '12px 16px', resize: 'none' }, 'aria-label': 'Texto del estado de cuenta', value: imp.texto });
    ta.addEventListener('input', () => { imp.texto = ta.value; });
    const sel = D.tarjetas.length ? h('select', { class: 'entrada', 'aria-label': 'Tarjeta', onchange: (e) => { imp.tarjetaId = e.target.value; if (imp.lineas) { calcular(); pintar(); } } },
      h('option', { value: '' }, 'No es de una tarjeta de crédito'), D.tarjetas.map((t) => h('option', { value: t.id, selected: t.id === imp.tarjetaId }, t.nombre))) : null;
    if (sel) cont.appendChild(campo('¿De qué tarjeta?', sel));
    cont.appendChild(campo('Texto', ta));
    cont.appendChild(h('div', { estilo: { display: 'flex', gap: '10px', marginTop: '12px' } },
      h('button', { class: 'btn btn-primario', type: 'button', estilo: { flex: 1 }, onclick: () => { imp.texto = ta.value; imp.lineas = L().estadoCuenta(imp.texto, ctx()); if (!imp.lineas.length) { aviso('No encontré líneas con fecha y valor'); imp.lineas = null; } calcular(); pintar(); } }, 'Leer'),
      h('button', { class: 'btn btn-borde', type: 'button', 'aria-label': 'Leer desde una foto o captura', onclick: async () => {
        if (!C().requiere('importarPDF')) return;
        const f = await elegirArchivo(); if (!f) return;
        aviso('Leyendo…');
        try { const t = await AF.app.sinBloqueo(() => N().leerTextoDeImagen(f)); imp.texto = t; ta.value = t; imp.lineas = L().estadoCuenta(t, ctx()); if (!imp.lineas.length) { aviso('No encontré líneas con fecha y valor'); imp.lineas = null; } calcular(); pintar(); }
        catch (e) { aviso(e.codigo === 'solo_app' ? 'Leer fotos todavía no está disponible en esta versión' : 'No pude leer esa imagen'); }
      } }, ico('camara', 'chico'), AF.acceso.tiene('importarPDF') ? null : AF.ui.chipPro())));
    cont.appendChild(zona);

    function calcular() {
      imp.sel = new Set(); imp.conciliado = null; if (!imp.lineas) return;
      const gastos = imp.lineas.filter((x) => !x.esPago);
      imp.conciliado = pro ? I().conciliar(D, gastos, imp.tarjetaId || null) : null;
      imp.lineas.forEach((x, i) => {
        const g2 = x.esPago ? null : gastos.indexOf(x), c = imp.conciliado && g2 != null ? imp.conciliado.lineas[g2] : null;
        x.estado = x.esPago ? 'pago' : c ? c.estado : null;
        if (x.esPago ? !!imp.tarjetaId : !c || c.estado === 'falta') imp.sel.add(i);
      });
    }
    function pintar() {
      AF.ui.vaciar(zona);
      if (!imp.lineas) return;
      const c = imp.conciliado;
      zona.appendChild(h('div', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, plural(imp.lineas.length, 'línea', 'líneas') + ' leídas')),
        c ? h('p', { class: 'texto-sm suave' }, (c.ya ? plural(c.ya, 'ya la tienes', 'ya las tienes') + ' · ' : '') + plural(c.faltan, 'falta', 'faltan') + ' en tu registro') : null,
        c ? null : C().gancho('Pro marca cuáles ya tienes registradas para que no las repitas.', 'conciliar'),
        h('div', { class: 'lista', estilo: { marginTop: '8px' } }, imp.lineas.map((x, i) => {
          const bloqueada = x.esPago && !imp.tarjetaId;
          const marca = h('button', { class: 'check', type: 'button', role: 'checkbox', 'aria-checked': imp.sel.has(i) ? 'true' : 'false', 'aria-label': 'Incluir ' + x.desc, disabled: bloqueada, estilo: { opacity: bloqueada ? '.35' : '1' },
            onclick: () => { if (imp.sel.has(i)) imp.sel.delete(i); else imp.sel.add(i); pintar(); } }, ico('ok'));
          return h('div', { class: 'fila' }, marca, h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, x.desc), h('div', { class: 'fila-sub' }, diaMes(x.fecha) + (x.esPago ? ' · pago o abono' : ' · ' + S().categoria(x.cat).nombre))),
            x.estado === 'ya' ? h('span', { class: 'etiqueta-estado ya' }, 'Ya está') : x.estado === 'falta' ? h('span', { class: 'etiqueta-estado falta' }, 'Falta') : x.estado === 'pago' ? h('span', { class: 'etiqueta-estado pago' }, 'Pago') : null,
            h('span', { class: 'monto' }, (x.esPago ? '+' : '−') + $(x.monto)));
        })),
        c && c.sobran.length ? h('div', { class: 'nota', estilo: { marginTop: '14px' } }, ico('info'), h('span', null, 'En tu registro hay ' + plural(c.sobran.length, 'compra', 'compras') + ' de esta tarjeta que el estado no trae: ' + c.sobran.slice(0, 3).map((m) => (m.desc || S().categoria(m.cat).nombre) + ' ' + $(m.monto)).join(', ') + (c.sobran.length > 3 ? '…' : '') + '. Puede ser de otro corte.')) : null,
        h('div', { estilo: { marginTop: '16px' } }, h('button', { class: 'btn btn-primario btn-bloque', type: 'button', disabled: !imp.sel.size, onclick: agregarMarcadas }, imp.sel.size ? 'Agregar ' + plural(imp.sel.size, 'marcada', 'marcadas') : 'Marca lo que quieras agregar'))));
    }
    function agregarMarcadas() {
      let n = 0; const tj = imp.tarjetaId || null;
      Array.from(imp.sel).sort((a, b) => a - b).forEach((i) => {
        const x = imp.lineas[i];
        if (x.esPago) { if (!tj) return; S().agregar('movs', { tipo: 'pago_tarjeta', monto: x.monto, fecha: x.fecha, tarjetaId: tj, cat: null, desc: 'Pago ' + (S().buscar('tarjetas', tj) || { nombre: 'tarjeta' }).nombre }, 'Importé un pago'); n++; return; }
        S().agregar('movs', movDe({ tipo: 'gasto', monto: x.monto, cat: x.cat, desc: x.desc, fecha: x.fecha, cuenta: tj ? 'tarjeta' : 'efectivo', tarjetaId: tj }), 'Importé un movimiento'); n++;
      });
      aviso(plural(n, 'movimiento agregado', 'movimientos agregados'), { texto: 'Deshacer', onclick: () => { for (let i = 0; i < n; i++) S().deshacer(); AF.app.redibujar(); } });
      imp.lineas = null; imp.texto = ''; imp.sel = new Set(); imp.conciliado = null; AF.app.redibujar();
    }
    if (imp.lineas) pintar();
  }

  V.bandeja = { render, importar, fotoFactura, recibir, pegarTexto, leerTexto, agregarABandeja, guardarItem, pendientes, partes };
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/vistas/pro.js ===== */
/* Pro: plan y precios, SRI, simulador, pareja/familia y viajes con otras monedas. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, hoja, aviso, fila, campo } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const S = () => AF.store, N = () => AF.nativo, C = () => V.comun;
  const $ = (n, o) => U.dinero(n, o);
  const num = (el) => U.parseNumero(el.value);
  const entrada = (ph, val, etq) => h('input', { class: 'entrada', inputmode: 'decimal', placeholder: ph || '', value: val == null ? '' : String(val).replace('.', ','), 'aria-label': etq || ph });

  /* ------------------------------------------------------------------ pantalla Pro */
  const ETIQUETAS = {
    entenderFraseLibreIA: 'Entiende frases libres con IA', corregirLibreIA: 'Corrige con IA, con tus propias palabras', preguntasLibresIA: 'Responde cualquier pregunta sobre tu plata',
    puedesGastarHoyCompleto: '«Hoy puedes gastar» con cuotas y metas', hormigaDetalle: 'Qué gastos hormiga son y cuánto ahorrarías', presupuestoPorCategoria: 'Límites por categoría',
    tarjetaDiferidoCuotas: 'Diferidos y cuotas con intereses', asesorTarjeta: '¿Pago el mínimo o el total?', meConviene: '«¿Me conviene?» antes de comprar', simulador: 'Simulador «¿qué pasa si…?»',
    alertasPredictivas: 'Alertas que se adelantan', sri: 'SRI: gastos deducibles (Ecuador)', fotoFacturaProductos: 'Factura foto: producto por producto', compartirCaptura: 'Compartir captura de tu resumen',
    importarPDF: 'Importar estado de cuenta', conciliar: 'Conciliar con tu estado de cuenta', suscripcionesDetectadas: 'Detecta suscripciones solo', cobroPorWhatsApp: 'Cobros por WhatsApp',
    parejaFamilia: 'Pareja o familia', resumenAnualAcumulado: 'Año completo y acumulado', compararMeses: 'Comparar meses', pdfMensualBasico: 'PDF mensual', pdfProfesional: 'PDF completo para compartir',
    exportarExcel: 'Exportar a Excel', variasMonedasViajes: 'Viajes y otras monedas',
  };
  const LIMITES_TXT = { tarjetas: 'Tarjetas', presupuestos: 'Límites de gasto', metas: 'Metas de ahorro', pagosFijos: 'Pagos fijos', prestamos: 'Préstamos entre personas', categoriasPropias: 'Categorías propias' };

  function render(cont) {
    const st = AF.acceso.estado(AF.app.hoy()), p = PLAN.precios;
    const cab = h('section', { class: 'nota pro', estilo: { alignItems: 'center' } }, ico('estrella', 'relleno'), h('div', null,
      st.tipo === 'pro' ? h('div', null, h('strong', null, 'Eres Pro'), ' hasta el ' + U.fechaCorta(st.hasta, AF.app.hoy()) + '.')
        : st.tipo === 'prueba' ? h('div', null, h('strong', null, 'Pro gratis: ' + (st.diasPrueba === 1 ? 'te queda 1 día' : 'te quedan ' + st.diasPrueba + ' días')), '. Después sigues con Gratis; no pierdes tus datos.')
          : h('div', null, h('strong', null, 'Estás en Gratis'), '. Todo lo básico funciona; Pro suma lo de abajo.')));
    cont.appendChild(cab);
    if (st.tipo === 'gratis' && !S().d.plan.inicioPrueba) {
      cont.appendChild(h('button', { class: 'btn btn-voz btn-bloque', type: 'button', estilo: { marginTop: '16px' }, onclick: () => { AF.acceso.iniciarPrueba(AF.app.hoy()); AF.bus.emit('plan'); aviso('Pro activado ' + PLAN.prueba.diasProGratis + ' días'); } }, 'Probar Pro ' + PLAN.prueba.diasProGratis + ' días gratis'));
      cont.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '8px', textAlign: 'center' } }, 'Sin tarjeta. Si no te gusta, sigues en Gratis.'));
    }
    const filas = [h('div', { class: 'cab' }, ''), h('div', { class: 'cab centro' }, 'Gratis'), h('div', { class: 'cab centro' }, 'Pro')];
    Object.keys(PLAN.limites.gratis).forEach((k) => {
      if (!LIMITES_TXT[k]) return;
      const gv = PLAN.limites.gratis[k], pv = PLAN.limites.pro[k];
      filas.push(h('div', null, LIMITES_TXT[k]), h('div', { class: 'centro num' }, gv === 0 ? '—' : String(gv)), h('div', { class: 'centro num' }, pv == null ? '∞' : String(pv)));
    });
    Object.keys(PLAN.funciones).forEach((k) => {
      const f = PLAN.funciones[k]; if (f.g || !f.p || !ETIQUETAS[k]) return;
      if (k === 'sri' && !PLAN.pais(S().d.ajustes.pais).sri) return;
      filas.push(h('div', null, ETIQUETAS[k]), h('div', { class: 'centro suave' }, '—'), h('div', { class: 'centro', estilo: { color: 'var(--acento)' } }, ico('ok', 'chico')));
    });
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Lo que cambia')), h('div', { class: 'pro-comparar' }, filas)));
    if (st.tipo !== 'pro') {
      const ahorro = Math.round((1 - p.anualUSD / (p.mensualUSD * 12)) * 100);
      cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Elige tu plan')),
        h('div', { estilo: { display: 'flex', flexDirection: 'column', gap: '10px' } },
          h('button', { class: 'btn btn-primario btn-bloque', type: 'button', onclick: () => comprar('anual') }, 'Anual · ' + $(p.anualUSD, { moneda: 'USD', fijo: true }) + ' al año (ahorras ' + ahorro + ' %)'),
          h('button', { class: 'btn btn-borde btn-bloque', type: 'button', onclick: () => comprar('mensual') }, 'Mensual · ' + $(p.mensualUSD, { moneda: 'USD', fijo: true }) + ' al mes'),
          h('button', { class: 'btn-texto', type: 'button', onclick: restaurar }, 'Ya pagué: restaurar mi compra')),
        h('p', { class: 'texto-xs suave', estilo: { marginTop: '12px' } }, 'El cobro lo hace Google Play y puedes cancelar cuando quieras desde Play. Los precios pueden variar según tu país.')));
    }
  }
  async function comprar(plan) {
    try {
      const r = await N().comprarPro(plan);
      const hasta = U.sumarDias(AF.app.hoy(), plan === 'anual' ? 366 : 32);
      AF.acceso.activarPro(hasta); aviso('¡Listo! Ya eres Pro'); return r;
    } catch (e) {
      aviso(e.codigo === 'cancelado' ? 'Compra cancelada' : e.codigo === 'solo_app' ? 'El pago de Pro se activa con la versión de Google Play. Mientras tanto tienes los días de prueba.' : 'Pro aún no está disponible en Google Play.');
    }
  }
  async function restaurar() {
    const l = await N().restaurarCompras();
    const act = l.filter((x) => x.isActive !== false);
    if (act.length) { const f = act.map((x) => x.expirationDate).filter(Boolean).sort().pop(); AF.acceso.activarPro(f ? String(f).slice(0, 10) : U.sumarDias(AF.app.hoy(), 31)); aviso('Pro restaurado'); }
    else aviso('No encontré una compra activa.');
  }
  // Se llama al entrar: si hay una suscripción vigente, la respeta aunque el teléfono sea nuevo.
  async function verificarCompras() { try { const l = await N().restaurarCompras(); const act = l.filter((x) => x.isActive !== false); if (act.length) { const f = act.map((x) => x.expirationDate).filter(Boolean).sort().pop(); if (f) AF.acceso.activarPro(String(f).slice(0, 10)); } } catch (e) { /* sin conexión: queda lo guardado */ } }

  /* ------------------------------------------------------------------------- SRI */
  const bloqueado = (cont, fn, texto) => {
    if (AF.acceso.tiene(fn)) return false;
    cont.appendChild(h('div', { class: 'vacio' }, h('strong', null, 'Esto es de Pro'), AF.acceso.explicacion(fn), h('div', { estilo: { marginTop: '14px' } }, h('button', { class: 'btn btn-primario', type: 'button', onclick: () => AF.app.abrir('Pro', (c) => render(c)) }, 'Ver Pro'))));
    return true;
  };
  function sri(cont) {
    if (bloqueado(cont, 'sri')) return;
    const D = S().d, anio = Number(AF.app.hoy().slice(0, 4)), r = AF.informes.sri(D, anio), rub = PLAN.sri.rubros;
    cont.appendChild(h('div', { class: 'horizonte', estilo: { margin: '0 calc(var(--margen) * -1)', borderRadius: '28px' } },
      h('div', { class: 'cifra-etiqueta' }, 'Rebaja aproximada de impuestos ' + anio), h('div', { class: 'cifra', estilo: { fontSize: '52px' } }, $(r.rebaja)),
      h('p', { class: 'cifra-pie suave' }, 'Es el ' + Math.round(PLAN.sri.porcentajeRebaja * 100) + ' % de tus gastos deducibles (' + $(r.base) + '), hasta un máximo para tus ' + r.cargas + (r.cargas === 1 ? ' carga' : ' cargas') + ': ' + $(r.tope) + '.')));
    cont.appendChild(h('div', { class: 'nota', estilo: { marginTop: '16px' } }, ico('info'), h('span', null, 'Es una estimación. Solo cuentan gastos con factura a tu nombre y dentro de lo que permite el SRI. Revisa tu formulario de gastos personales' + (PLAN.sri.formularioMes ? ' (se entrega en ' + PLAN.sri.formularioMes + ')' : '') + '.')));
    if (r.total > r.tope) cont.appendChild(h('div', { class: 'nota', estilo: { marginTop: '10px' } }, ico('alerta'), h('span', null, 'Tus gastos deducibles (' + $(r.total) + ') ya pasan el tope de ' + $(r.tope) + '. Lo de más no suma.')));
    else cont.appendChild(h('p', { class: 'texto-sm suave', estilo: { marginTop: '12px' } }, 'Aún podrías deducir ' + $(r.tope - r.total) + ' más antes de llegar al tope.'));
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Por rubro')),
      r.porRubro.length ? h('div', { class: 'lista' }, r.porRubro.map((x) => fila({ icono: '🏛️', titulo: x.nombre, derecha: h('span', { class: 'monto' }, $(x.total)) }))) : h('p', { class: 'suave' }, 'Aún no hay gastos en rubros deducibles este año.')));
    const gastos = D.movs.filter((m) => m.tipo === 'gasto' && m.fecha.startsWith(String(anio))).sort((a, b) => b.monto - a.monto).slice(0, 25);
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Tus gastos más grandes')), h('p', { class: 'texto-sm suave' }, 'Toca uno para decir si es deducible y de qué rubro.'),
      h('div', { class: 'lista' }, gastos.map((m) => { const rb = m.sri !== undefined ? m.sri : C().catDe(m.cat).sri;
        return fila({ icono: C().catDe(m.cat).icono, titulo: m.desc || C().catDe(m.cat).nombre, sub: rb ? rub[rb] : 'No deducible', derecha: h('span', { class: 'monto' }, $(m.monto)), onclick: () => elegirRubro(m) }); }))));
  }
  function elegirRubro(m) {
    hoja({ titulo: '¿De qué rubro es?', cuerpo: h('div', { class: 'opciones', estilo: { marginTop: '12px' } }, Object.entries(PLAN.sri.rubros).map(([k, t]) => h('button', { type: 'button', class: 'opcion', onclick: (e) => { S().editar('movs', m.id, { sri: k }, 'Marqué como deducible'); e.currentTarget.closest('.hoja').previousSibling.click(); } }, t)).concat(h('button', { type: 'button', class: 'opcion', onclick: (e) => { S().editar('movs', m.id, { sri: null }, 'Marqué como no deducible'); e.currentTarget.closest('.hoja').previousSibling.click(); } }, 'No deducible'))) });
  }

  /* ----------------------------------------------------------------------- simulador */
  function simulador(cont) {
    if (bloqueado(cont, 'simulador')) return;
    const D = S().d, hoy = AF.app.hoy();
    let modo = 'compra';
    const caja = h('div'); const tabs = h('div', { class: 'segmentos', estilo: { marginBottom: '8px' } });
    const salida = h('div', { 'aria-live': 'polite', estilo: { marginTop: '18px' } });
    const pintarTabs = () => { AF.ui.vaciar(tabs); [['compra', 'Una compra'], ['ahorro', 'Ahorrar'], ['recorte', 'Gastar menos']].forEach(([k, t]) => tabs.appendChild(h('button', { type: 'button', 'aria-pressed': modo === k ? 'true' : 'false', onclick: () => { modo = k; pintar(); } }, t))); };
    function pintar() {
      pintarTabs(); AF.ui.vaciar(caja); AF.ui.vaciar(salida);
      const hoyPG = AF.informes.puedesGastarHoy(D, hoy, 'completo');
      if (modo === 'compra') {
        const monto = entrada('0', '', 'Precio'), meses = entrada('6', '', 'Meses'), tasa = entrada('Tasa anual %', '', 'Tasa anual');
        let forma = 'contado';
        const zona = h('div'), btns = h('div', { class: 'opciones', estilo: { marginTop: '10px' } });
        const calc = () => {
          AF.ui.vaciar(salida);
          const m = num(monto); if (!(m > 0)) return;
          const n = Math.round(num(meses)) || 0;
          const lineas = [];
          if (forma === 'contado') lineas.push(['Pagas hoy', $(m)], ['Te quedarían hasta el cobro', $(hoyPG.resto - m)]);
          else {
            if (!(n >= 1)) { salida.appendChild(h('p', { class: 'suave' }, 'Pon los meses.')); return; }
            let cuota, total;
            if (forma === 'sin') { cuota = U.r2(m / n); total = m; }
            else { const t = num(tasa); if (t == null) { salida.appendChild(h('p', { class: 'suave' }, 'Pon la tasa anual de tu tarjeta para calcular los intereses.')); return; } cuota = AF.tarjetas.cuotaFrancesa(m, t, n); total = U.r2(cuota * n); }
            lineas.push(['Cuota mensual', $(cuota)], ['Total que pagarás', $(total)], ['Intereses', $(total - m)], ['Tu cuota frente a lo que gastas por día', Math.round((cuota / Math.max(1, hoyPG.porDia * 30)) * 100) + ' % de tu presupuesto mensual disponible']);
          }
          salida.appendChild(h('div', { class: 'lista' }, lineas.map(([a, b]) => h('div', { class: 'interruptor', estilo: { minHeight: '48px' } }, h('span', null, a), h('strong', { class: 'num' }, b)))));
          salida.appendChild(h('p', { class: 'texto-xs suave' }, 'Simulación: no cambia tus datos.'));
        };
        const pintForma = () => { AF.ui.vaciar(btns); [['contado', 'De contado'], ['sin', 'Sin intereses'], ['con', 'Con intereses']].forEach(([k, t]) => btns.appendChild(h('button', { type: 'button', class: 'opcion', 'aria-pressed': forma === k ? 'true' : 'false', onclick: () => { forma = k; pintForma(); AF.ui.vaciar(zona); if (k !== 'contado') zona.appendChild(campo('Meses', meses)); if (k === 'con') zona.appendChild(campo('Tasa anual %', tasa, 'La de tu tarjeta; no la invento.')); calc(); } }, t))); };
        [monto, meses, tasa].forEach((i) => i.addEventListener('input', calc));
        pintForma(); caja.appendChild(campo('Si compro algo de', monto)); caja.appendChild(btns); caja.appendChild(zona);
      } else if (modo === 'ahorro') {
        const mes = entrada('0', '', 'Por mes'), meses = entrada('12', '', 'Meses');
        const calc = () => { AF.ui.vaciar(salida); const a = num(mes), n = Math.round(num(meses)); if (!(a > 0 && n > 0)) return; salida.appendChild(h('p', { class: 'voz-respuesta', estilo: { color: 'var(--tinta)' } }, 'Ahorrando ' + $(a) + ' al mes, en ' + n + ' meses tendrías ' + $(a * n) + '.')); salida.appendChild(h('p', { class: 'texto-sm suave' }, 'Equivale a ' + $(U.r2(a / 30)) + ' por día. Sin contar intereses.')); };
        [mes, meses].forEach((i) => i.addEventListener('input', calc)); caja.appendChild(campo('Si ahorro por mes', mes)); caja.appendChild(campo('Durante cuántos meses', meses));
      } else {
        const hasta = U.finMes(hoy), t = AF.informes.totales(D, U.inicioMes(hoy), hasta);
        const pcs = entrada('10', '', 'Porcentaje'); let cat = t.porCategoria[0] ? t.porCategoria[0].id : null;
        const zonaCat = h('div', { class: 'opciones', estilo: { marginTop: '10px' } });
        const calc = () => { AF.ui.vaciar(salida); const p = num(pcs); const c = t.porCategoria.find((x) => x.id === cat); if (!c || !(p > 0 && p <= 100)) return; const ah = U.r2(c.total * (p / 100)); salida.appendChild(h('p', { class: 'voz-respuesta', estilo: { color: 'var(--tinta)' } }, 'Si bajas ' + p + ' % en ' + c.cat.nombre.toLowerCase() + ', ahorras ' + $(ah) + ' al mes y ' + $(ah * 12) + ' al año.')); salida.appendChild(h('p', { class: 'texto-sm suave' }, 'Calculado con lo que gastaste este mes en esa categoría (' + $(c.total) + ').')); };
        const pintCat = () => { AF.ui.vaciar(zonaCat); t.porCategoria.slice(0, 8).forEach((c) => zonaCat.appendChild(h('button', { type: 'button', class: 'opcion', 'aria-pressed': cat === c.id ? 'true' : 'false', onclick: () => { cat = c.id; pintCat(); calc(); } }, c.cat.icono + ' ' + c.cat.nombre))); };
        pcs.addEventListener('input', calc);
        if (!t.porCategoria.length) caja.appendChild(h('p', { class: 'suave' }, 'Aún no tienes gastos este mes para simular.')); else { pintCat(); caja.appendChild(campo('¿En qué categoría?', zonaCat)); caja.appendChild(campo('Cuánto menos (%)', pcs)); }
      }
    }
    cont.appendChild(h('p', { class: 'suave', estilo: { marginTop: '4px' } }, 'Prueba antes de decidir. Nada de esto toca tus datos reales.'));
    cont.appendChild(h('div', { estilo: { marginTop: '14px' } }, tabs)); cont.appendChild(caja); cont.appendChild(salida);
    pintar();
  }

  /* --------------------------------------------------------------- pareja / familia */
  // El grupo vive en este teléfono (sin nube); se comparte el resumen por mensaje. Cada gasto: quién pagó y entre quiénes se divide.
  function grupoDatos() {
    const D = S().d; D.grupo = D.grupo || [];
    let cfg = D.grupo.find((x) => x.tipo === 'config');
    if (!cfg) cfg = S().agregar('grupo', { tipo: 'config', miembros: [{ id: 'yo', nombre: D.ajustes.nombre || 'Yo' }] }, 'Creé el grupo');
    return cfg;
  }
  function saldos(cfg, gastos) {
    const s = {}; cfg.miembros.forEach((m) => { s[m.id] = 0; });
    gastos.forEach((x) => {
      const entre = (x.entre && x.entre.length ? x.entre : cfg.miembros.map((m) => m.id)).filter((id) => s[id] != null);
      if (!entre.length) return;
      const parte = x.monto / entre.length;
      if (s[x.pagoPor] != null) s[x.pagoPor] += x.monto; entre.forEach((id) => { s[id] -= parte; });
    });
    return s;
  }
  function transferencias(s, nombres) {
    const deudores = Object.entries(s).filter(([, v]) => v < -0.005).map(([id, v]) => [id, -v]).sort((a, b) => b[1] - a[1]);
    const acreedores = Object.entries(s).filter(([, v]) => v > 0.005).sort((a, b) => b[1] - a[1]).map(([id, v]) => [id, v]);
    const out = []; let i = 0, j = 0;
    while (i < deudores.length && j < acreedores.length) { const m = Math.min(deudores[i][1], acreedores[j][1]); out.push({ de: deudores[i][0], a: acreedores[j][0], monto: U.r2(m) }); deudores[i][1] -= m; acreedores[j][1] -= m; if (deudores[i][1] < 0.005) i++; if (acreedores[j][1] < 0.005) j++; }
    return out;
  }
  function pareja(cont) {
    if (bloqueado(cont, 'parejaFamilia')) return;
    const cfg = grupoDatos(), D = S().d, hoy = AF.app.hoy();
    const gastos = D.grupo.filter((x) => x.tipo === 'gasto').sort((a, b) => (b.fecha === a.fecha ? b.creado - a.creado : b.fecha < a.fecha ? -1 : 1));
    const nombre = (id) => (cfg.miembros.find((m) => m.id === id) || { nombre: '—' }).nombre;
    const sd = saldos(cfg, gastos), tr = transferencias(sd);
    cont.appendChild(h('p', { class: 'suave', estilo: { marginTop: '4px' } }, 'Anota lo que pagan entre varios y te digo quién le debe a quién. Se guarda en este teléfono.'));
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Personas'), h('button', { class: 'enlace', type: 'button', onclick: () => nuevoMiembro(cfg) }, 'Agregar')),
      h('div', { class: 'opciones' }, cfg.miembros.map((m) => h('span', { class: 'chip' }, m.nombre)))));
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Quién debe a quién')),
      tr.length ? h('div', { class: 'lista' }, tr.map((t) => fila({ icono: '💸', titulo: nombre(t.de) + ' le debe a ' + nombre(t.a), derecha: h('span', { class: 'monto' }, $(t.monto)), onclick: () => saldar(cfg, t) }))) : h('p', { class: 'suave' }, gastos.length ? 'Están a mano.' : 'Aún no hay gastos compartidos.'),
      tr.length ? h('button', { class: 'btn btn-borde btn-bloque', type: 'button', estilo: { marginTop: '12px' }, onclick: () => N().compartirTexto('Cuentas', tr.map((t) => nombre(t.de) + ' le debe ' + $(t.monto) + ' a ' + nombre(t.a)).join('\n')) }, ico('enviar'), 'Compartir las cuentas') : null));
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Gastos compartidos'), h('button', { class: 'enlace', type: 'button', onclick: () => nuevoGasto(cfg) }, 'Agregar')),
      gastos.length ? h('div', { class: 'lista' }, gastos.slice(0, 40).map((x) => fila({ icono: x.liquidacion ? '🤝' : '🧾', titulo: x.desc || (x.liquidacion ? 'Pago entre ustedes' : 'Gasto'), sub: (x.liquidacion ? nombre(x.pagoPor) + ' pagó a ' + nombre(x.entre[0]) : 'Pagó ' + nombre(x.pagoPor)) + ' · ' + U.fechaCorta(x.fecha, hoy), derecha: h('span', { class: 'monto' }, $(x.monto)), onclick: () => borrarGasto(x) }))) : h('p', { class: 'suave' }, 'Toca «Agregar» para anotar el primero.')));
  }
  function nuevoMiembro(cfg) {
    const inp = h('input', { class: 'entrada', placeholder: 'Nombre', maxlength: 24, 'aria-label': 'Nombre' });
    hoja({ titulo: 'Agregar persona', cuerpo: campo('Nombre', inp), acciones: [{ texto: 'Agregar', clase: 'btn-primario', onclick: () => { const n = inp.value.trim(); if (!n) return false; S().editar('grupo', cfg.id, { miembros: cfg.miembros.concat([{ id: U.uid(), nombre: n }]) }, 'Agregué a ' + n); } }] });
    setTimeout(() => inp.focus(), 150);
  }
  function nuevoGasto(cfg) {
    const desc = h('input', { class: 'entrada', placeholder: 'Ej.: Supermercado', maxlength: 60, 'aria-label': 'Detalle' }), monto = entrada('0', '', 'Monto');
    let paga = cfg.miembros[0].id; const entre = new Set(cfg.miembros.map((m) => m.id));
    const zP = h('div', { class: 'opciones' }), zE = h('div', { class: 'opciones' });
    const pint = () => { AF.ui.vaciar(zP); AF.ui.vaciar(zE); cfg.miembros.forEach((m) => { zP.appendChild(h('button', { type: 'button', class: 'opcion', 'aria-pressed': paga === m.id ? 'true' : 'false', onclick: () => { paga = m.id; pint(); } }, m.nombre)); zE.appendChild(h('button', { type: 'button', class: 'opcion', 'aria-pressed': entre.has(m.id) ? 'true' : 'false', onclick: () => { entre.has(m.id) ? entre.delete(m.id) : entre.add(m.id); pint(); } }, m.nombre)); }); };
    pint();
    hoja({ titulo: 'Gasto compartido', cuerpo: h('div', null, campo('Detalle', desc), campo('Monto', monto), campo('¿Quién pagó?', zP), campo('¿Entre quiénes se divide?', zE)), acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
      const v = num(monto); if (!(v > 0) || !entre.size) return false;
      S().agregar('grupo', { tipo: 'gasto', desc: desc.value.trim(), monto: U.r2(v), pagoPor: paga, entre: Array.from(entre), fecha: AF.app.hoy() }, 'Anoté un gasto compartido'); aviso('Anotado');
    } }] });
  }
  function saldar(cfg, t) {
    C().confirmar({ titulo: '¿Ya pagó?', texto: 'Se anota que ' + cfg.miembros.find((m) => m.id === t.de).nombre + ' le pagó ' + $(t.monto) + ' a ' + cfg.miembros.find((m) => m.id === t.a).nombre + '.', si: 'Sí, ya pagó' }).then((ok) => {
      if (ok) S().agregar('grupo', { tipo: 'gasto', liquidacion: true, desc: 'Pago entre ustedes', monto: t.monto, pagoPor: t.de, entre: [t.a], fecha: AF.app.hoy() }, 'Saldé una cuenta');
    });
  }
  async function borrarGasto(x) { if (await C().confirmar({ titulo: '¿Borrar este gasto compartido?', texto: x.desc || 'Sin detalle', si: 'Borrar', peligro: true })) S().borrar('grupo', x.id, 'Borré un gasto compartido'); }

  /* ------------------------------------------------------------------------ viajes */
  const MONEDAS_VIAJE = ['EUR', 'USD', 'COP', 'PEN', 'MXN'];
  function viajes(cont) {
    if (bloqueado(cont, 'variasMonedasViajes')) return;
    const D = S().d;
    cont.appendChild(h('p', { class: 'suave', estilo: { marginTop: '4px' } }, 'Anota gastos en otra moneda y los paso a la tuya con el cambio que tú pongas. No invento tasas.'));
    cont.appendChild(h('div', { estilo: { marginTop: '14px' } }, h('button', { class: 'btn btn-voz', type: 'button', onclick: nuevoViaje }, 'Nuevo viaje')));
    cont.appendChild(h('section', { class: 'seccion' }, D.viajes.length ? h('div', { class: 'lista' }, D.viajes.map((v) => { const t = D.movs.filter((m) => m.viajeId === v.id).reduce((s, m) => s + m.monto, 0);
      return fila({ icono: '✈️', titulo: v.nombre, sub: v.moneda + ' · 1 ' + D.ajustes.moneda + ' = ' + String(v.tasa).replace('.', ',') + ' ' + v.moneda, derecha: h('span', { class: 'monto' }, $(t)), onclick: () => AF.app.abrir(v.nombre, (c) => viaje(c, v.id)) }); }))
      : h('div', { class: 'vacio' }, h('strong', null, 'Aún no tienes viajes'), 'Crea uno antes de salir.')));
  }
  function nuevoViaje() {
    const base = S().d.ajustes.moneda;
    const nombre = h('input', { class: 'entrada', placeholder: 'Ej.: Cartagena', maxlength: 40, 'aria-label': 'Nombre del viaje' }), tasa = entrada('Ej. 4000', '', 'Cambio');
    let mon = MONEDAS_VIAJE.find((m) => m !== base) || 'EUR';
    const z = h('div', { class: 'opciones' }), pint = () => { AF.ui.vaciar(z); MONEDAS_VIAJE.filter((m) => m !== base).forEach((m) => z.appendChild(h('button', { type: 'button', class: 'opcion', 'aria-pressed': mon === m ? 'true' : 'false', onclick: () => { mon = m; pint(); } }, PLAN.monedas[m].simbolo + ' ' + m))); }; pint();
    hoja({ titulo: 'Nuevo viaje', cuerpo: h('div', null, campo('Nombre', nombre), campo('Moneda del viaje', z), campo('¿Cuántas ' + mon + ' recibes por 1 ' + base + '?', tasa, 'Mira el cambio de hoy en tu banco o casa de cambio y escríbelo.')),
      acciones: [{ texto: 'Crear', clase: 'btn-primario', onclick: () => { const t = num(tasa); if (!nombre.value.trim() || !(t > 0)) return false; S().agregar('viajes', { nombre: nombre.value.trim(), moneda: mon, tasa: t }, 'Creé un viaje'); } }] });
  }
  function viaje(cont, id) {
    const v = S().buscar('viajes', id), D = S().d, hoy = AF.app.hoy(); if (!v) { AF.app.atras(); return; }
    const movs = D.movs.filter((m) => m.viajeId === id).sort((a, b) => (b.fecha === a.fecha ? b.creado - a.creado : b.fecha < a.fecha ? -1 : 1));
    const total = movs.reduce((s, m) => s + m.monto, 0), orig = movs.reduce((s, m) => s + (m.montoOriginal || 0), 0);
    cont.appendChild(h('div', { class: 'horizonte', estilo: { margin: '0 calc(var(--margen) * -1)', borderRadius: '28px' } }, h('div', { class: 'cifra-etiqueta' }, 'Llevas gastado'), h('div', { class: 'cifra', estilo: { fontSize: '52px' } }, $(total)), h('p', { class: 'cifra-pie suave' }, $(orig, { simbolo: PLAN.monedas[v.moneda].simbolo }) + ' ' + v.moneda + ' · cambio 1 ' + D.ajustes.moneda + ' = ' + String(v.tasa).replace('.', ',') + ' ' + v.moneda)));
    cont.appendChild(h('div', { estilo: { display: 'flex', gap: '10px', marginTop: '16px' } }, h('button', { class: 'btn btn-voz', type: 'button', estilo: { flex: 1 }, onclick: () => gastoViaje(v) }, 'Agregar gasto'), h('button', { class: 'btn btn-borde', type: 'button', onclick: () => editarTasa(v) }, 'Cambio')));
    cont.appendChild(h('section', { class: 'seccion' }, movs.length ? h('div', { class: 'lista' }, movs.map((m) => fila({ icono: C().catDe(m.cat).icono, titulo: m.desc || C().catDe(m.cat).nombre, sub: $(m.montoOriginal, { simbolo: PLAN.monedas[v.moneda].simbolo }) + ' ' + v.moneda + ' · ' + U.fechaCorta(m.fecha, hoy), derecha: h('span', { class: 'monto gasto' }, '−' + $(m.monto)), onclick: () => C().editarMov(m) }))) : h('div', { class: 'vacio' }, h('strong', null, 'Sin gastos todavía'), 'Agrega el primero.')));
  }
  function gastoViaje(v) {
    const D = S().d, monto = entrada('0', '', 'Monto en ' + v.moneda), desc = h('input', { class: 'entrada', placeholder: 'Detalle', maxlength: 60, 'aria-label': 'Detalle' });
    let cat = 'turismo'; const zc = C().selectorCategoria('gasto', cat, (c) => { cat = c; });
    const prev = h('p', { class: 'texto-sm suave', estilo: { marginTop: '8px' } }); monto.addEventListener('input', () => { const x = num(monto); prev.textContent = x > 0 ? '≈ ' + $(U.r2(x / v.tasa)) : ''; });
    hoja({ titulo: 'Gasto en ' + v.moneda, cuerpo: h('div', null, campo('Monto en ' + v.moneda, monto), prev, campo('Detalle', desc), campo('Categoría', zc)), acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
      const x = num(monto); if (!(x > 0)) return false;
      S().agregar('movs', { tipo: 'gasto', monto: U.r2(x / v.tasa), montoOriginal: U.r2(x), monedaOriginal: v.moneda, viajeId: v.id, cat, desc: desc.value.trim(), fecha: AF.app.hoy(), cuenta: 'efectivo', nec: C().catDe(cat).nec || null }, 'Gasto de viaje'); aviso('Guardado');
    } }] });
  }
  function editarTasa(v) {
    const t = entrada('', v.tasa, 'Cambio');
    hoja({ titulo: 'Cambio del viaje', cuerpo: campo('Por 1 ' + S().d.ajustes.moneda + ' recibes (' + v.moneda + ')', t, 'Los gastos ya anotados no cambian; solo los nuevos usan este cambio.'), acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => { const x = num(t); if (!(x > 0)) return false; S().editar('viajes', v.id, { tasa: x }, 'Cambié el cambio'); } }] });
  }

  V.pro = { render, sri, simulador, pareja, viajes, verificarCompras, saldos, transferencias };
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/vistas/mas.js ===== */
/* Más: acceso a todo lo demás, ajustes, seguridad, respaldo y borrado total. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, hoja, aviso, fila, campo } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const S = () => AF.store, N = () => AF.nativo, Sg = () => AF.seguridad, C = () => V.comun;
  const $ = (n) => U.dinero(n);

  const ir = (t, f) => () => AF.app.abrir(t, (c) => f(c));
  const proChip = (fn) => (AF.acceso.tiene(fn) ? ico('derecha') : AF.ui.chipPro());

  /* --------------------------------------------------------------------- hub */
  function render(cont) {
    const D = S().d, hoy = AF.app.hoy(), st = AF.acceso.estado(hoy);
    cont.appendChild(h('header', { class: 'barra-superior' }, h('h1', { class: 'h2' }, 'Más')));
    const cuerpo = h('div', { class: 'contenido' });
    // Plan
    cuerpo.appendChild(h('button', { class: 'nota pro', type: 'button', estilo: { width: '100%', textAlign: 'left' }, onclick: ir('Pro', (c) => V.pro.render(c)) }, ico('estrella', 'relleno'),
      h('span', null, st.tipo === 'pro' ? h('strong', null, 'Eres Pro') : st.tipo === 'prueba' ? h('strong', null, 'Pro gratis: ' + (st.diasPrueba === 1 ? 'te queda 1 día' : 'te quedan ' + st.diasPrueba + ' días')) : h('strong', null, 'Gratis'),
        st.tipo === 'gratis' ? ' · Mira qué te da Pro' : ' · Ver mi plan')));
    const grupo = (titulo, filas) => h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, titulo)), h('div', { class: 'lista' }, filas));
    const f = (icono, titulo, sub, onclick, derecha) => fila({ icono, titulo, sub, onclick, derecha: derecha || ico('derecha') });
    cuerpo.appendChild(grupo('Tu plata', [
      f('📊', 'Resumen y reportes', 'Mes, año, comparar, PDF y Excel', ir('Resumen', (c) => V.informesUI.resumen(c))),
      f('🎯', 'Límites de gasto', D.presupuestos.length ? D.presupuestos.length + (D.presupuestos.length === 1 ? ' activo' : ' activos') : 'Para no pasarte', ir('Límites de gasto', (c) => V.finanzas.presupuestos(c))),
      f('🏁', 'Metas de ahorro', D.metas.length ? D.metas.length + (D.metas.length === 1 ? ' meta' : ' metas') : 'Ahorra para algo concreto', ir('Metas', (c) => V.finanzas.metas(c))),
      f('🔁', 'Pagos fijos', 'Arriendo, internet, colegio…', ir('Pagos fijos', (c) => V.finanzas.fijos(c))),
      f('🤝', 'Préstamos entre personas', 'Quién te debe y a quién le debes', ir('Préstamos', (c) => V.finanzas.prestamos(c))),
      f('📺', 'Suscripciones', 'Lo que pagas cada mes', ir('Suscripciones', (c) => V.finanzas.suscripciones(c))),
      f('🏆', 'Retos', '30 días sin gastos hormiga', ir('Retos', (c) => V.finanzas.retos(c))),
    ]));
    cuerpo.appendChild(grupo('Agregar sin escribir', [
      f('🧾', 'Foto de una factura', 'La leo y tú confirmas', () => V.bandeja.fotoFactura()),
      f('📥', 'Bandeja por revisar', (D.bandeja.filter((b) => !b.hecho).length ? D.bandeja.filter((b) => !b.hecho).length + ' por revisar' : 'Nada por revisar') + ' · compartidos del banco', ir('Por revisar', (c) => V.bandeja.render(c))),
      f('📄', 'Importar un estado de cuenta', 'Pega el texto y lo comparo con lo tuyo', ir('Importar estado de cuenta', (c) => V.bandeja.importar(c)), proChip('importarPDF')),
    ]));
    cuerpo.appendChild(grupo('Con Pro', [
      f('🧮', 'Simulador «¿qué pasa si…?»', 'Prueba sin tocar tus datos', ir('Simulador', (c) => V.pro.simulador(c)), proChip('simulador')),
      PLAN.pais(D.ajustes.pais).sri ? f('🏛️', 'SRI: gastos deducibles', 'Rebaja aproximada de impuestos', ir('SRI', (c) => V.pro.sri(c)), proChip('sri')) : null,
      f('👫', 'Pareja o familia', 'Gastos compartidos', ir('Pareja o familia', (c) => V.pro.pareja(c)), proChip('parejaFamilia')),
      f('✈️', 'Viajes y otras monedas', 'Gasta en otra moneda sin enredarte', ir('Viajes', (c) => V.pro.viajes(c)), proChip('variasMonedasViajes')),
    ]));
    if (N().instalacion.disponible()) cuerpo.appendChild(grupo('Esta app', [
      f('📲', 'Instalar en este teléfono', 'Se abre como una app, sin barra del navegador', async () => { if (await N().instalacion.instalar()) aviso('Instalada'); }, h('span')),
    ]));
    cuerpo.appendChild(grupo('Tu cuenta', [
      f('⚙️', 'Ajustes', 'Nombre, país, modo y color, bloqueo, voz', ir('Ajustes', (c) => ajustes(c))),
      f('☁️', 'Copia de seguridad', N().proveedorListo && AF.app.sesion && AF.app.sesion.proveedor === 'google' ? 'En tu Google Drive' : 'En un archivo', ir('Copia de seguridad', (c) => respaldo(c))),
      f('🚪', 'Cerrar sesión', AF.app.sesion && AF.app.sesion.email ? AF.app.sesion.email : 'Vuelves a la primera pantalla', cerrarSesion, h('span')),
    ]));
    cuerpo.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '28px', textAlign: 'center' } }, PLAN.app.nombre + ' ' + PLAN.app.version + ' · ' + PLAN.app.avisoLegal));
    cont.appendChild(cuerpo);
  }
  async function cerrarSesion() {
    if (await C().confirmar({ titulo: '¿Cerrar sesión?', texto: 'Tus datos siguen cifrados en este teléfono. Al volver a entrar con la misma cuenta, los recuperas con tu PIN.', si: 'Cerrar sesión' })) AF.app.cerrarSesion();
  }

  /* ------------------------------------------------------------------ ajustes */
  const editor = (titulo, valor, tipo, alGuardar, ayuda) => {
    const inp = h('input', { class: 'entrada grande', inputmode: tipo === 'texto' ? 'text' : 'decimal', value: valor == null ? '' : String(valor).replace('.', ','), 'aria-label': titulo });
    hoja({ titulo, cuerpo: h('div', null, campo('', inp, ayuda)), acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => { const r = alGuardar(inp.value); return r === false ? false : undefined; } }] });
    setTimeout(() => inp.focus(), 150);
  };
  function ajustes(cont) {
    const D = S().d, a = D.ajustes;
    const p = PLAN.pais(a.pais);
    const fila2 = (icono, titulo, valor, onclick) => fila({ icono, titulo, sub: valor, onclick, derecha: ico('derecha') });
    const sw = (titulo, sub, activo, cambia) => h('button', { class: 'interruptor', type: 'button', role: 'switch', 'aria-checked': activo ? 'true' : 'false', estilo: { width: '100%', textAlign: 'left' }, onclick: () => cambia(!activo) }, h('div', { class: 'interruptor-texto' }, h('div', { class: 'fila-titulo', estilo: { whiteSpace: 'normal' } }, titulo), sub ? h('div', { class: 'fila-sub', estilo: { whiteSpace: 'normal' } }, sub) : null), h('span', { class: 'pastilla' }));
    const sec = (t) => h('div', { class: 'seccion-cabeza', estilo: { marginTop: '28px' } }, h('h2', { class: 'h2' }, t));
    cont.appendChild(h('div', { estilo: { marginTop: '4px' } }));
    cont.appendChild(sec('Tus datos'));
    cont.appendChild(h('div', { class: 'lista' },
      fila2('🙂', 'Nombre', a.nombre || 'Sin nombre', () => editor('Nombre', a.nombre, 'texto', (v) => { if (!v.trim()) return false; S().ajustar({ nombre: v.trim() }); })),
      fila2('🌎', 'País y moneda', p.nombre + ' · ' + a.moneda, () => hoja({ titulo: 'País y moneda', cuerpo: h('div', null, h('div', { class: 'opciones', estilo: { marginTop: '10px' } }, PLAN.paises.map((x) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': a.pais === x.codigo ? 'true' : 'false', onclick: (e) => { S().ajustar({ pais: x.codigo, moneda: x.moneda }); AF.app.refrescar(); e.currentTarget.closest('.hoja').previousSibling.click(); } }, x.nombre))),
        campo('Moneda', h('div', { class: 'opciones' }, Object.keys(PLAN.monedas).map((m) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': a.moneda === m ? 'true' : 'false', onclick: (e) => { S().ajustar({ moneda: m }); e.currentTarget.closest('.hoja').previousSibling.click(); } }, PLAN.monedas[m].simbolo + ' ' + m))))) })),
      fila2('📅', 'Día de cobro', 'Día ' + a.diaCobro, () => editor('Día de cobro', a.diaCobro, 'num', (v) => { const n = Math.round(U.parseNumero(v)); if (!(n >= 1 && n <= 31)) return false; S().ajustar({ diaCobro: n }); })),
      fila2('💼', 'Ingreso mensual', a.sueldo ? $(a.sueldo) : 'Sin definir', () => editor('Ingreso mensual', a.sueldo, 'num', (v) => { S().ajustar({ sueldo: v.trim() ? U.parseNumero(v) : null }); }, 'Se usa solo si aún no registras ingresos en el periodo.')),
      p.sri ? fila2('👨‍👩‍👧', 'Cargas familiares', String(a.cargas || 0), () => hoja({ titulo: 'Cargas familiares', cuerpo: h('div', { class: 'opciones', estilo: { marginTop: '12px' } }, [0, 1, 2, 3, 4, 5].map((n) => h('button', { type: 'button', class: 'opcion', onclick: (e) => { S().ajustar({ cargas: n }); e.currentTarget.closest('.hoja').previousSibling.click(); } }, n === 5 ? '5 o más' : String(n)))) })) : null));
    cont.appendChild(sec('Apariencia y voz'));
    cont.appendChild(h('div', null,
      h('div', { class: 'campo' }, h('label', null, 'Color de la app'), h('div', { class: 'opciones' }, PLAN.apariencia.colores.map((c) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': (a.colorApp || 'marino') === c.id ? 'true' : 'false', onclick: () => S().ajustar({ colorApp: c.id }) },
        h('span', { class: 'muestra-color', estilo: { background: AF.tema.paleta('claro', c.id).voz } }), c.nombre)))),
      h('div', { class: 'campo' }, h('label', null, 'Gráficas'), h('div', { class: 'segmentos' }, [['barras', 'Barras'], ['lineas', 'Líneas'], ['circulo', 'Círculo']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': (a.grafica || 'barras') === k ? 'true' : 'false', onclick: () => S().ajustar({ grafica: k }) }, t)))),
      h('div', { class: 'campo' }, h('label', null, 'Modo'), h('div', { class: 'segmentos' }, [['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': (a.tema || 'auto') === k ? 'true' : 'false', onclick: () => S().ajustar({ tema: k }) }, t)))),
      sw('Que me responda en voz alta', 'Lee en voz alta lo que entendió y las respuestas.', a.respuestaVoz, (v) => S().ajustar({ respuestaVoz: v }))));
    cont.appendChild(sec('Seguridad'));
    cont.appendChild(h('div', { class: 'lista' },
      fila2('⏱️', 'Pedir PIN o huella', a.bloqueoSeg === 0 ? 'Cada vez que salgas' : 'Tras ' + (a.bloqueoSeg >= 60 ? a.bloqueoSeg / 60 + ' min' : a.bloqueoSeg + ' s') + ' fuera de la app', () => hoja({ titulo: 'Pedir PIN o huella', cuerpo: h('div', { class: 'opciones', estilo: { marginTop: '12px' } }, [[0, 'Siempre'], [30, '30 segundos'], [60, '1 minuto'], [300, '5 minutos']].map(([s, t]) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': a.bloqueoSeg === s ? 'true' : 'false', onclick: (e) => { S().ajustar({ bloqueoSeg: s }); e.currentTarget.closest('.hoja').previousSibling.click(); } }, t))) })),
      fila2('🔑', 'Cambiar mi PIN', 'Uno nuevo de ' + PLAN.sesion.pinMin + ' a ' + PLAN.sesion.pinMax + ' dígitos', cambiarPin)));
    const zonaHuella = h('div'); cont.appendChild(zonaHuella);
    N().huellaDisponible().then(async (ok) => {
      if (!ok) { zonaHuella.appendChild(h('p', { class: 'texto-sm suave', estilo: { marginTop: '8px' } }, 'Este teléfono no tiene huella configurada.')); return; }
      const on = await Sg().huellaActiva(AF.app.ns);
      zonaHuella.appendChild(sw('Entrar con huella', 'El PIN sigue sirviendo siempre.', on, async (v) => {
        try { if (v) await Sg().activarHuella(AF.app.ns, N().secretosHuella); else await Sg().desactivarHuella(AF.app.ns, N().secretosHuella); aviso(v ? 'Huella activada' : 'Huella desactivada'); }
        catch (e) { aviso('No pude cambiar la huella'); }
        AF.app.refrescar();
      }));
    });
    cont.appendChild(sec('Tus palabras'));
    const aprendidas = Object.entries(D.diccionario);
    cont.appendChild(aprendidas.length ? h('div', { class: 'lista' }, aprendidas.slice(0, 30).map(([w, cat]) => fila({ icono: S().categoria(cat).icono, titulo: w, sub: S().categoria(cat).nombre, derecha: h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Olvidar ' + w, onclick: () => { S().olvidarAprendido(w); AF.app.refrescar(); } }, ico('cerrar')) })))
      : h('p', { class: 'texto-sm suave' }, 'Cuando corriges una categoría, aprendo la palabra y la verás aquí.'));
    cont.appendChild(sec('Datos'));
    cont.appendChild(h('div', { class: 'lista' },
      fila2('🗑️', 'Borrar todos mis datos', 'Movimientos, tarjetas y metas. No se puede deshacer.', borrarTodo)));
    cont.appendChild(h('div', { estilo: { height: '24px' } }));
  }

  function cambiarPin() {
    const n = PLAN.sesion;
    const nuevo = h('input', { class: 'entrada grande', type: 'password', inputmode: 'numeric', maxlength: n.pinMax, 'aria-label': 'PIN nuevo', placeholder: '••••' });
    const rep = h('input', { class: 'entrada grande', type: 'password', inputmode: 'numeric', maxlength: n.pinMax, 'aria-label': 'Repite el PIN nuevo', placeholder: '••••' });
    const err = h('div', { class: 'ayuda', role: 'alert', estilo: { color: 'var(--gasto)', minHeight: '18px' } });
    hoja({ titulo: 'Cambiar mi PIN', cuerpo: h('div', null, h('p', { class: 'suave', estilo: { marginTop: '4px' } }, 'Si lo olvidas, los datos no se pueden recuperar.'), campo('PIN nuevo (' + n.pinMin + ' a ' + n.pinMax + ' números)', nuevo), campo('Repítelo', rep), err),
      acciones: [{ texto: 'Cambiar PIN', clase: 'btn-primario', onclick: async () => {
        if (!Sg().pinValido(nuevo.value)) { err.textContent = 'Usa de ' + n.pinMin + ' a ' + n.pinMax + ' números.'; return false; }
        if (Sg().pinDebil(nuevo.value)) { err.textContent = 'Ese PIN es muy fácil de adivinar.'; return false; }
        if (nuevo.value !== rep.value) { err.textContent = 'No coinciden.'; return false; }
        try { await Sg().cambiarPin(AF.app.ns, nuevo.value); aviso('PIN cambiado'); } catch (e) { aviso('No pude cambiar el PIN'); }
      } }] });
  }

  async function borrarTodo() {
    const ok = await C().confirmar({ titulo: '¿Borrar todos tus datos?', texto: 'Se borran movimientos, tarjetas, metas y ajustes de este teléfono. No se puede deshacer. Si tienes copia en Drive, se queda hasta que la borres.', si: 'Borrar todo', peligro: true });
    if (!ok) return;
    const ok2 = await C().confirmar({ titulo: 'Última confirmación', texto: 'Esto no tiene vuelta atrás. ¿Seguro que quieres empezar de cero?', si: 'Sí, borrar todo', peligro: true });
    if (!ok2) return;
    await AF.app.reiniciarCuenta();
  }

  /* ------------------------------------------------------------------ respaldo */
  function respaldo(cont) {
    const D = S().d, esGoogle = AF.app.sesion && AF.app.sesion.proveedor === 'google';
    const info = h('p', { class: 'texto-sm suave', estilo: { marginTop: '8px' } }, 'Revisando…');
    cont.appendChild(h('p', { class: 'suave', estilo: { marginTop: '4px' } }, 'La copia sale ya cifrada con tu PIN: ni Google ni nadie puede leerla. Para restaurarla necesitas el PIN que usabas al hacerla.'));
    const msg = (t) => { info.textContent = t; };
    const hacer = async (fn, ok, mal) => { try { await fn(); aviso(ok); } catch (e) { aviso(mal || (e && e.message) || 'No se pudo'); } };
    const copia = async () => { await S().guardarYa(); return Sg().paqueteRespaldo(AF.app.ns); };
    if (esGoogle) {
      cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'En tu Google Drive')), info,
        h('p', { class: 'texto-xs suave' }, 'Se guarda en una carpeta privada de la app que ni tú ves en Drive.'),
        h('div', { estilo: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' } },
          h('button', { class: 'btn btn-primario btn-bloque', type: 'button', onclick: async (e) => { const boton = e.currentTarget; boton.disabled = true; await hacer(async () => { await N().respaldoSubir(await copia()); S().ajustar({ ultimaCopia: Date.now() }); msg('Última copia: ahora mismo.'); }, 'Copia guardada en Drive', 'No pude subir la copia. ¿Tienes internet y diste permiso?'); boton.disabled = false; } }, ico('nube'), 'Hacer copia ahora'),
          h('button', { class: 'btn btn-borde btn-bloque', type: 'button', onclick: async () => {
            if (!(await C().confirmar({ titulo: '¿Restaurar la copia de Drive?', texto: 'Reemplaza lo que tienes ahora por la copia. Te pedirá el PIN que usabas al hacerla.', si: 'Restaurar' }))) return;
            await hacer(async () => { const p = await N().respaldoBajar(); if (!p) throw new Error('No hay ninguna copia en tu Drive.'); await Sg().restaurarPaquete(AF.app.ns, p); S().cargar(null); AF.app.abierta = false; await V.acceso.bloqueo(); }, 'Copia restaurada');
          } }, 'Restaurar desde Drive'),
          h('button', { class: 'btn-texto btn-peligro', type: 'button', onclick: async () => { if (await C().confirmar({ titulo: '¿Borrar la copia de Drive?', texto: 'Tus datos del teléfono no se tocan.', si: 'Borrar copia', peligro: true })) await hacer(async () => { const r = await N().respaldoBorrar(); msg(r ? 'Copia borrada.' : 'No había copia.'); }, 'Copia de Drive borrada'); } }, 'Borrar la copia de Drive'))));
      N().respaldoInfo().then((i) => msg(i ? 'Última copia en Drive: ' + new Date(i.fecha).toLocaleDateString('es') + '.' : 'Aún no tienes copia en Drive.')).catch((e) => msg(e && e.codigo === 'sin_token' ? 'Toca «Hacer copia ahora» y Google te pedirá permiso para guardarla.' : 'No pude consultar Drive ahora.'));
    }
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'En un archivo')),
      h('p', { class: 'texto-sm suave' }, esGoogle ? 'Otra opción: guarda la copia cifrada donde quieras.' : 'Guarda la copia cifrada donde quieras (correo, WhatsApp, tu computadora).'),
      h('div', { estilo: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' } },
        h('button', { class: 'btn btn-borde btn-bloque', type: 'button', onclick: () => hacer(async () => { const p = await copia(); await N().entregarArchivo('asistente-financiero-' + AF.app.hoy() + '.copia', JSON.stringify(p), 'application/json'); }, 'Copia lista', 'No pude crear el archivo') }, ico('archivo'), 'Guardar copia en un archivo'),
        h('label', { class: 'btn btn-borde btn-bloque', estilo: { cursor: 'pointer' } }, 'Restaurar desde un archivo', h('input', { type: 'file', class: 'oculto', accept: '.copia,.json,application/json', onchange: async (e) => {
          const f = e.target.files[0]; if (!f) return;
          if (!(await C().confirmar({ titulo: '¿Restaurar esta copia?', texto: 'Reemplaza lo que tienes ahora. Te pedirá el PIN que usabas al hacerla.', si: 'Restaurar' }))) return;
          await hacer(async () => { const p = JSON.parse(await f.text()); await Sg().restaurarPaquete(AF.app.ns, p); S().cargar(null); AF.app.abierta = false; await V.acceso.bloqueo(); }, 'Copia restaurada', 'Ese archivo no es una copia válida');
        } })))));
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Borrar todo')),
      h('p', { class: 'texto-sm suave' }, 'Borra todos tus datos de este teléfono.'),
      h('button', { class: 'btn btn-borde btn-bloque btn-peligro', type: 'button', estilo: { marginTop: '12px' }, onclick: borrarTodo }, 'Borrar todos mis datos')));
  }

  V.mas = { render, ajustes, respaldo };
})(typeof window !== 'undefined' ? window : globalThis);
;

/* ===== js/app.js ===== */
/* Arranque, sesión, bloqueo, navegación. Aquí se decide qué pantalla toca. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, aviso } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const Sg = () => AF.seguridad, N = () => AF.nativo, S = () => AF.store;
  const d = g.document;
  const V = () => AF.vistas;

  const app = {
    sesion: null, ns: null, abierta: false, tab: 'inicio', pila: [], exento: false, sinHuellaAuto: false,
    hoy: () => U.hoyISO(),
    pro: () => AF.acceso.esPro(),
  };
  const raiz = () => d.getElementById('app');

  /* ------------------------------------------------------------------ estructura */
  let vistaEl, pestanasEl, compositorEl;
  const TABS = [['inicio', 'Inicio', 'inicio'], ['movimientos', 'Movimientos', 'movimientos'], ['tarjetas', 'Tarjetas', 'tarjeta'], ['mas', 'Más', 'mas']];

  function armar() {
    if (vistaEl) return;
    vistaEl = h('div', { id: 'vista' });
    pestanasEl = h('nav', { class: 'pestanas oculto', 'aria-label': 'Secciones' }, TABS.map(([k, t, i]) => h('button', { class: 'pestana', type: 'button', 'data-tab': k, onclick: () => app.ir(k) }, h('span', { class: 'ico-wrap' }, ico(i)), t)));
    compositorEl = h('div', { class: 'compositor oculto' }, h('div', { class: 'compositor-barra' },
      h('button', { class: 'compositor-texto', type: 'button', onclick: () => V().voz.abrir({ modo: 'texto' }) }, 'Dime un gasto o un ingreso'),
      h('button', { class: 'mic', type: 'button', 'aria-label': 'Hablar', onclick: () => V().voz.abrir({ modo: 'voz' }) }, ico('mic'))));
    const r = raiz(); r.appendChild(vistaEl); r.appendChild(pestanasEl); r.appendChild(compositorEl);
  }
  function cerrarCapas() { raiz().querySelectorAll('.telon, .hoja, .voz, .aviso-flotante').forEach((e) => e.remove()); }

  // Muestra una pantalla completa sin barra de pestañas (portada, bienvenida, PIN)
  app.pantalla = function (nodo) {
    armar(); cerrarCapas();
    app.abierta = false;
    pestanasEl.classList.add('oculto'); compositorEl.classList.add('oculto');
    AF.ui.vaciar(vistaEl);
    if (nodo) vistaEl.appendChild(nodo);
    AF.tema.aplicar('auto');
    g.scrollTo(0, 0);
  };

  /* ------------------------------------------------------------------ navegación */
  function pintarPestanas() {
    pestanasEl.querySelectorAll('.pestana').forEach((b) => { if (b.dataset.tab === app.tab && !app.pila.length) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  }
  function dibujar() {
    if (!app.abierta) return;
    const y = g.scrollY;
    AF.ui.vaciar(vistaEl);
    const tope = app.pila[app.pila.length - 1];
    if (tope) {
      const cuerpo = h('div', { class: 'contenido' });
      const cab = h('header', { class: 'barra-superior' }, h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Atrás', onclick: () => app.atras() }, ico('atras')), h('h1', { class: 'h2' }, tope.titulo));
      vistaEl.appendChild(h('main', { class: 'pantalla' }, cab, cuerpo));
      const extra = tope.render(cuerpo, tope);
      if (extra && extra.derecha) cab.appendChild(extra.derecha);
    } else {
      const v = V()[app.tab];
      const cont = h('main', { class: 'pantalla' });
      vistaEl.appendChild(cont);
      v.render(cont);
    }
    pintarPestanas();
    g.scrollTo(0, y);
  }
  let rafRef = 0;
  app.noRefrescar = false;
  app.refrescar = () => { if (app.noRefrescar) return; cancelAnimationFrame(rafRef); rafRef = requestAnimationFrame(dibujar); };
  app.redibujar = () => { cancelAnimationFrame(rafRef); rafRef = requestAnimationFrame(dibujar); };
  app.ir = (tab) => { app.noRefrescar = false; app.tab = tab; app.pila = []; cerrarCapas(); g.scrollTo(0, 0); dibujar(); };
  app.abrir = (titulo, render) => { app.noRefrescar = false; app.pila.push({ titulo, render }); g.scrollTo(0, 0); dibujar(); };
  app.atras = () => { if (app.pila.length) { app.noRefrescar = false; app.pila.pop(); g.scrollTo(0, 0); dibujar(); return true; } return false; };

  /* ----------------------------------------------------------------- datos y tema */
  function aplicarAjustes() {
    const a = S().d.ajustes;
    AF.estado = { moneda: a.moneda };
    AF.tema.aplicar(a.tema || 'auto', a.colorApp);
  }
  AF.bus.on('cambio', () => app.refrescar());
  AF.bus.on('ajustes', () => { if (app.abierta) { aplicarAjustes(); app.refrescar(); } });
  AF.bus.on('plan', () => app.refrescar());

  /* --------------------------------------------------------------------- sesión */
  async function despuesDeSesion() {
    app.ns = Sg().espacioDe(app.sesion);
    if (await Sg().existe(app.ns)) return V().acceso.bloqueo();
    if (await ofrecerRecuperar()) return V().acceso.bloqueo();
    return V().acceso.bienvenida(app.sesion);
  }
  // Teléfono nuevo (o datos borrados): si entró con Google y ya tiene una copia en su Drive, se la ofrece antes de empezar de cero.
  async function ofrecerRecuperar() {
    try {
      if (!app.sesion || app.sesion.proveedor !== 'google') return false;
      const info = await N().respaldoInfo({ soloSiHayPermiso: true });
      if (!info) return false;
      const si = await V().comun.confirmar({ titulo: 'Encontré una copia tuya en Drive', texto: 'Es del ' + new Date(info.fecha).toLocaleDateString('es') + '. ¿La recupero? Vas a necesitar el PIN que usabas entonces.', si: 'Recuperar mi copia', no: 'Empezar de cero' });
      if (!si) return false;
      const p = await N().respaldoBajar(); if (!p) return false;
      await Sg().restaurarPaquete(app.ns, p);
      return true;
    } catch (e) { return false; }      // sin internet o sin permiso: sigue como cuenta nueva (la copia se puede recuperar luego desde Más → Copia de seguridad)
  }
  app.iniciarSesion = async (s) => {
    app.sesion = s; await Sg().guardarSesion(s);
    return despuesDeSesion();
  };

  // Se llama al terminar la bienvenida: crea la bóveda, guarda los ajustes y entra.
  app.crearCuenta = async ({ ajustes, pin }) => {
    if (pin !== null && pin !== undefined) {
      await Sg().crear(app.ns, pin);
    } else {
      await Sg().crearSinPin(app.ns);
    }
    const nuevo = S().vacio();
    Object.assign(nuevo.ajustes, { nombre: ajustes.nombre, pais: ajustes.pais, moneda: ajustes.moneda, diaCobro: ajustes.diaCobro, sueldo: ajustes.sueldo || null, cargas: ajustes.cargas || 0, bienvenidaHecha: true });
    nuevo.tarjetas = (ajustes.tarjetas || []).map((t) => Object.assign({ id: AF.util.uid(), creado: Date.now() }, t));
    if (PLAN.prueba.iniciaAlCrearCuenta) nuevo.plan.inicioPrueba = app.hoy();
    S().cargar(nuevo, { escribir: (dd) => Sg().guardarDatos(app.ns, dd) });
    await S().guardarYa();
    await V().acceso.ofrecerHuella();
    await app.entrar(true);
  };

  app.entrar = async (yaCargado) => {
    if (!yaCargado) {
      const datos = await Sg().leerDatos(app.ns);
      S().cargar(datos, { escribir: (dd) => Sg().guardarDatos(app.ns, dd) });
    }
    app.abierta = true; Sg().marcarEntrada();
    aplicarAjustes();
    cerrarCapas();
    pestanasEl.classList.remove('oculto'); compositorEl.classList.remove('oculto');
    app.tab = 'inicio'; app.pila = [];
    dibujar();
    programarAvisos();
    if (app.pendienteVoz) { app.pendienteVoz = false; V().voz.abrir({ modo: 'voz' }); }
    if (app.pendienteCompartido && V().bandeja) { const x = app.pendienteCompartido; app.pendienteCompartido = null; V().bandeja.recibir(x); }
  };

  app.bloquear = async () => {
    if (!app.abierta) return;
    try { await S().guardarYa(); } catch (e) { /* se reintenta al volver */ }
    app.abierta = false;
    Sg().bloquear();
    S().cargar(null);
    app.sinHuellaAuto = false;
    cerrarCapas();
    return V().acceso.bloqueo();
  };

  app.cerrarSesion = async () => {
    try { await S().guardarYa(); } catch (e) { /* nada */ }
    const prov = app.sesion && app.sesion.proveedor;
    app.abierta = false;
    if (PLAN.sesion.cerrarSesionBorraDatos && app.ns) await Sg().borrarCuenta(app.ns, N().secretosHuella);
    await N().cerrarSesionSocial(prov);
    await Sg().cerrarSesion();
    S().cargar(null);
    app.sesion = null; app.ns = null;
    V().acceso.portada();
  };

  app.reiniciarCuenta = async () => {
    await Sg().borrarCuenta(app.ns, N().secretosHuella);
    S().cargar(null);
    return V().acceso.bienvenida(app.sesion);
  };

  // Para pantallas del sistema (cámara, galería, compartir) que sacan la app de primer plano
  app.sinBloqueo = async (fn) => { app.exento = true; try { return await fn(); } finally { setTimeout(() => { app.exento = false; }, 800); } };

  /* ------------------------------------------------------------- avisos del teléfono */
  function programarAvisos() {
    if (!N().esNativo()) return;
    const hoy = app.hoy(), D = S().d, lista = [];
    const a9 = (iso) => { const f = U.deISO(iso); f.setHours(9, 0, 0, 0); return f; };
    D.tarjetas.forEach((t) => {
      const e = AF.tarjetas.estado(t, D.movs, hoy);
      if (!e.proximoVence || !e.aPagarProximo) return;
      PLAN.alertas.diasAntesVencimiento.forEach((n) => lista.push({ titulo: t.nombre + ' vence ' + (n === 1 ? 'mañana' : 'en ' + n + ' días'), cuerpo: 'A pagar: ' + U.dinero(e.aPagarProximo) + ' (estimado)', cuando: a9(U.sumarDias(e.proximoVence, -n)) }));
    });
    D.pagosFijos.forEach((p) => {
      if (p.activo === false) return;
      const v = U.proximoDia(hoy, p.dia);
      lista.push({ titulo: p.nombre + ' vence mañana', cuerpo: U.dinero(p.monto), cuando: a9(U.sumarDias(v, -1)) });
    });
    D.prestamos.forEach((p) => { if (p.pagado || !p.fechaLimite) return; lista.push({ titulo: 'Recordatorio: ' + p.persona, cuerpo: (p.direccion === 'me_deben' ? 'Te debe ' : 'Le debes ') + U.dinero(p.monto), cuando: a9(p.fechaLimite) }); });
    N().programarAvisos(lista);
  }
  app.programarAvisos = programarAvisos;

  /* ------------------------------------------------------------------- arranque */
  app.iniciar = async function () {
    AF.tema.aplicar('auto');
    armar();
    if (AF.bancos) { AF.bancos.cargarCache(); AF.bancos.actualizarRemoto(); }     // tarifas de bancos: si hay archivo remoto, se actualizan solas
    const al = N().almacenNativo(); if (al) Sg().usarAlmacen(al);
    N().prepararWeb();                                                        // versión web: copia para abrir sin internet + datos que el navegador no borra

    N().alVolverAPrimerPlano(() => { if (app.abierta && !app.exento) Sg().marcarSalida(); }, () => {
      if (!app.abierta) return;
      if (app.exento) { Sg().marcarEntrada(); return; }
      if (Sg().debeBloquear(S().d.ajustes.bloqueoSeg)) app.bloquear(); else Sg().marcarEntrada();
    });
    N().alAbrirEnlace(() => { if (app.abierta) V().voz.abrir({ modo: 'voz' }); else app.pendienteVoz = true; });
    N().escucharCompartidos((x) => { if (app.abierta && V().bandeja) V().bandeja.recibir(x); else app.pendienteCompartido = x; }).catch(() => {});
    N().botonAtras(() => {
      if (raiz().querySelector('.voz')) { V().voz.cerrar(); return; }
      const hoja = raiz().querySelector('.telon'); if (hoja) { hoja.click(); return; }
      if (app.atras()) return;
      if (app.abierta && app.tab !== 'inicio') { app.ir('inicio'); return; }
      N().salir();
    });

    const s = await Sg().sesion();
    if (!s) return V().acceso.portada();
    app.sesion = s;
    return despuesDeSesion();
  };

  AF.app = app;
  if (d && d.getElementById && d.getElementById('app')) {
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', () => app.iniciar()); else app.iniciar();
  }
})(typeof window !== 'undefined' ? window : globalThis);
;
