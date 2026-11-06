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
