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
