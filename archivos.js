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
