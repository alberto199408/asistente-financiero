const test = require('node:test');
const assert = require('node:assert/strict');
require('../www/js/plan.js');
const U = require('../www/js/util.js');
require('../www/js/tarjetas.js');
require('../www/js/informes.js');
const PDF = require('../www/js/pdf.js');
const A = require('../www/js/archivos.js');

function datos() {
  const d = { ajustes: { diaCobro: 1, pais: 'EC', moneda: 'USD' }, movs: [], tarjetas: [], pagosFijos: [], metas: [], presupuestos: [], categorias: [] };
  let n = 0; const m = (tipo, monto, cat, fecha, desc) => d.movs.push({ id: 'm' + (++n), creado: n, tipo, monto, cat, fecha, desc: desc || '' });
  m('ingreso', 1000, 'sueldo', '2026-11-01'); m('gasto', 25.5, 'comida_hogar', '2026-11-02', 'Mercado (grande) \\ ñandú'); m('gasto', 3, 'antojos', '2026-11-03', 'Helado 🍦');
  for (let i = 0; i < 100; i++) m('gasto', 5 + i, 'transporte', '2026-11-04');
  return d;
}
const RANGO = { desde: '2026-11-01', hasta: '2026-11-30', etiqueta: 'de noviembre de 2026' };
const texto = (u8) => Buffer.from(u8).toString('latin1');

test('PDF: estructura válida y tabla de referencias cruzadas con las posiciones exactas', () => {
  const u8 = PDF.informe(datos(), RANGO, { nombre: 'Luis', hoy: '2026-11-06', completo: true });
  const t = texto(u8);
  assert.ok(t.startsWith('%PDF-1.4'));
  assert.ok(t.trimEnd().endsWith('%%EOF'));
  const ini = Number(t.match(/startxref\n(\d+)/)[1]);
  assert.equal(t.slice(ini, ini + 4), 'xref');
  const n = Number(t.match(/\/Size (\d+)/)[1]);
  const filas = t.slice(ini).split('\n').slice(3, 3 + n - 1);
  filas.forEach((f, i) => { const off = Number(f.slice(0, 10)); assert.ok(t.slice(off).startsWith((i + 1) + ' 0 obj'), 'objeto ' + (i + 1)); });
  const paginas = Number(t.match(/\/Count (\d+)/)[1]);
  assert.ok(paginas >= 3, 'con 102 movimientos debe haber varias páginas, hay ' + paginas);
  assert.equal((t.match(/\/Type \/Page /g) || []).length, paginas);
});
test('PDF: acentos y ñ en WinAnsi, y caracteres raros (emoji, paréntesis) no rompen el texto', () => {
  const t = texto(PDF.informe(datos(), RANGO, {}));
  assert.ok(t.includes('Categor\xEDa'));                   // í
  assert.ok(t.includes('\xF1and\xFA'));                     // ñandú
  assert.ok(t.includes('Mercado \\(grande\\) \\\\'));       // paréntesis y barra escapados
  assert.ok(!t.includes('\uD83C'));
});
test('PDF: recortar no pasa del ancho', () => {
  const s = PDF.recortar('Una descripción larguísima que no cabe en el espacio', 100, 9);
  assert.ok(PDF.anchoDe(s, 9) <= 100); assert.ok(s.endsWith('…'));
});

// Lector mínimo de ZIP para comprobar lo que escribimos (cabeceras, CRC y contenido)
function leerZip(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const fin = u8.length - 22; assert.equal(dv.getUint32(fin, true), 0x06054b50);
  const n = dv.getUint16(fin + 10, true); let p = dv.getUint32(fin + 16, true); const out = {};
  for (let i = 0; i < n; i++) {
    assert.equal(dv.getUint32(p, true), 0x02014b50);
    const crc = dv.getUint32(p + 16, true), tam = dv.getUint32(p + 24, true), ln = dv.getUint16(p + 28, true), off = dv.getUint32(p + 42, true);
    const nombre = Buffer.from(u8.subarray(p + 46, p + 46 + ln)).toString('utf8');
    assert.equal(dv.getUint32(off, true), 0x04034b50);
    const ini = off + 30 + dv.getUint16(off + 26, true);
    const datos = u8.subarray(ini, ini + tam);
    assert.equal(A.crc32(datos), crc, 'CRC de ' + nombre);
    out[nombre] = Buffer.from(datos).toString('utf8'); p += 46 + ln;
  }
  return out;
}
test('CRC32 conocido', () => { assert.equal(A.crc32(new TextEncoder().encode('123456789')), 0xCBF43926); });
test('Excel: es un ZIP válido con las partes de un .xlsx y los datos dentro', () => {
  const z = leerZip(A.excelMovimientos(datos(), '2026-11-01', '2026-11-30'));
  ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml', 'xl/worksheets/sheet3.xml'].forEach((k) => assert.ok(z[k], k));
  assert.ok(z['xl/worksheets/sheet1.xml'].includes('<v>25.5</v>'));
  assert.ok(z['xl/worksheets/sheet1.xml'].includes('Mercado (grande) \\ ñandú'));
  assert.ok(z['xl/workbook.xml'].includes('name="Por categoría"'));
  assert.ok(z['xl/worksheets/sheet1.xml'].includes('<v>' + Math.round((Date.UTC(2026, 10, 1) - Date.UTC(1899, 11, 30)) / 86400000) + '</v>'));
});
test('Excel: el texto con símbolos XML queda escapado', () => {
  const z = leerZip(A.xlsx([{ nombre: 'A/B', columnas: [{ t: 'x<y' }], filas: [['a & b < c']] }]));
  assert.ok(z['xl/worksheets/sheet1.xml'].includes('a &amp; b &lt; c'));
  assert.ok(z['xl/workbook.xml'].includes('name="A B"'));
});
