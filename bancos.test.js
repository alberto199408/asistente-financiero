const test = require('node:test');
const assert = require('node:assert/strict');
require('../www/js/plan.js');
require('../www/js/bancos-datos.js');
const B = require('../www/js/bancos.js');
const PLAN = globalThis.AF.PLAN;
const near = (a, b, tol = 0.011) => assert.ok(Math.abs(a - b) <= tol, a + ' vs ' + b);

test('tasa efectiva ↔ nominal: 16,77 % efectiva es 15,60 % nominal (como publica el Bolivariano)', () => {
  near(B.efectivaANominal(16.77), 15.6);
  near(B.nominalAEfectiva(15.6), 16.77);
});

test('avance Pichincha: $4,46 + IVA por cada $100 o fracción, tope $133,80 + IVA', () => {
  const b = B.buscar('ec-pichincha');
  assert.equal(B.costoAvance(b, 100), 5.13);
  assert.equal(B.costoAvance(b, 50), 5.13);
  assert.equal(B.costoAvance(b, 101), 10.26);
  assert.equal(B.costoAvance(b, 5000), 153.87);       // tope: 133,80 × 1,15
  assert.equal(B.costoAvance(b, 0), null);
});

test('avance Produbanco: escalones del tarifario', () => {
  const b = B.buscar('ec-produbanco');
  assert.equal(B.costoAvance(b, 50), 7.19);
  assert.equal(B.costoAvance(b, 100.99), 7.19);
  assert.equal(B.costoAvance(b, 101), 12.32);
  assert.equal(B.costoAvance(b, 2950), 153.87);
  assert.equal(B.costoAvance(b, 5001), 172.5);
  assert.equal(B.costoAvance(b, 12000), 287.5);
});

test('avance Pacífico e Internacional: varios canales y nunca un valor más allá de lo publicado', () => {
  const pac = B.buscar('ec-pacifico');
  assert.equal(B.costoAvance(pac, 1500), 64.4);
  assert.equal(B.costoAvance(pac, 6000), 150.08);        // cajero: más de $5.000
  assert.equal(B.costoAvance(pac, 6000, 'otros'), 172.5); // oficina: $5.001 a $6.000
  const int = B.buscar('ec-internacional');
  assert.equal(B.costoAvance(int, 450), 27.73);           // cajero
  assert.equal(B.costoAvance(int, 450, 0), 30.81);        // oficina
  assert.equal(B.costoAvance(int, 450, 1), 28.75);        // banca virtual
  assert.equal(B.costoAvance(int, 700), null);            // el cajero solo se publicó hasta $500,99
  assert.equal(B.costoAvance(int, 1500, 0), null);        // oficina: sobre $1.000,99 solo hay regla por cada $100, no se inventa
  const c = B.costosAvance(int, 1500);
  assert.equal(c.length, 3);
  assert.ok(c.every((x) => x.valor == null && /\$/.test(x.texto)));
});

test('avance BGR: escalones del país, tabla del exterior y nada más allá de lo publicado', () => {
  const b = B.buscar('ec-bgr');
  assert.equal(B.costoAvance(b, 50), 5.13);
  assert.equal(B.costoAvance(b, 100), 8.21);
  assert.equal(B.costoAvance(b, 101), 9.25);
  assert.equal(B.costoAvance(b, 300), 10.27);
  assert.equal(B.costoAvance(b, 5000), 61.61);
  assert.equal(B.costoAvance(b, 300, 0), 11.29);          // exterior
  assert.equal(B.costoAvance(b, 450, 0), null);           // exterior: no publican más de $400 para personales
  assert.equal(B.costosAvance(b, 450).length, 2);
  assert.deepEqual(B.redesDe(b), ['Visa']);
  assert.match(B.filas(b, 'Platinum').find((f) => f.clave === 'recompensas').texto, /\$32,20/);
});

test('avance Machala: cajero hasta $500, oficina hasta $5.500 y rangos de $x01 a $x00,99', () => {
  const b = B.buscar('ec-machala');
  assert.equal(B.costoAvance(b, 100.99), 5.13);
  assert.equal(B.costoAvance(b, 101), 10.26);
  assert.equal(B.costoAvance(b, 500), 25.65);
  assert.equal(B.costoAvance(b, 600), null);              // cajero: límite de $500 por retiro
  assert.equal(B.costoAvance(b, 600, 0), 30.77);          // oficina
  assert.equal(B.costoAvance(b, 2500, 0), 128.23);
  assert.equal(B.costoAvance(b, 5500, 0), 282.1);
  assert.equal(B.costoAvance(b, 5600, 0), null);          // más del límite publicado
  assert.equal(b.avance.otrosCanales[0].escalones.length, 55);
  // el valor de cada rango coincide con 4,46 + IVA por cada $100 (comprobación cruzada de lo transcrito)
  b.avance.otrosCanales[0].escalones.forEach(([, v], i) => near(v, (i + 1) * 4.46 * 1.15, 0.021));
  assert.equal(b.logoFondo, '#295135');
});

test('avance Loja: cajero desde $10 hasta $1.000, oficina y exterior con sus propios rangos', () => {
  const b = B.buscar('ec-loja');
  assert.equal(B.costoAvance(b, 5), null);                // desde $10
  assert.equal(B.costoAvance(b, 300), 4.11);
  assert.equal(B.costoAvance(b, 301), 8.21);
  assert.equal(B.costoAvance(b, 600), 15.4);
  assert.equal(B.costoAvance(b, 1500), null);             // cajero: no se publicó más de $1.000,99
  assert.equal(B.costoAvance(b, 1500, 0), 46.21);         // oficina / web / celular
  assert.equal(B.costoAvance(b, 5000, 0), 128.35);
  assert.equal(B.costoAvance(b, 5001, 0), 150.08);
  assert.equal(B.costoAvance(b, 5000, 1), 150.08);        // exterior
  assert.equal(B.costoAvance(b, 499.99, 1), 10.27);
  assert.equal(B.costosAvance(b, 1500).length, 3);
  assert.deepEqual(B.redesDe(b), ['Visa']);
  assert.equal(b.logoFondo, '#76BC21');
});

test('avance Solidario: $5,13 por cada fracción de $100, centavos al rango menor, app con montos chicos y plano sobre $2.900', () => {
  const b = B.buscar('ec-solidario');
  assert.equal(B.costoAvance(b, 40), null);               // cajero: desde $50
  assert.equal(B.costoAvance(b, 50), 5.13);
  assert.equal(B.costoAvance(b, 100.99), 5.13);           // los centavos cuentan en el rango menor
  assert.equal(B.costoAvance(b, 101), 10.26);
  assert.equal(B.costoAvance(b, 150, 0), 10.26);          // web: $101 a $200,99
  assert.equal(B.costoAvance(b, 99, 0), null);            // el tarifario dice «desde $100»
  assert.equal(B.costoAvance(b, 1000, 0), 51.29);
  assert.equal(B.costoAvance(b, 1000), 51.29);            // cajero
  assert.equal(B.costoAvance(b, 1001), null);             // cajero: no se publicó más de $1.000,99
  assert.equal(B.costoAvance(b, 2900.5, 0), 148.74);
  assert.equal(B.costoAvance(b, 2901, 0), 150.08);
  assert.equal(B.costoAvance(b, 5, 1), 0.35);             // app
  assert.equal(B.costoAvance(b, 45, 1), 3.8);
  assert.equal(B.costoAvance(b, 50, 1), 5.13);
  assert.equal(B.costoAvance(b, 5000, 1), 150.08);
  assert.equal(b.logoFondo, '#11C1FF');
  assert.deepEqual(B.redesDe(b), PLAN.tarjetas.redes);    // la red no se leyó en sus documentos: lista general
});

test('avance Amazonas: cajero del país por escalones, exterior con sus rangos y sin inventar tasa ni diferido', () => {
  const b = B.buscar('ec-amazonas');
  assert.equal(B.costoAvance(b, 50), 11.5);
  assert.equal(B.costoAvance(b, 100.99), 11.5);
  assert.equal(B.costoAvance(b, 101), 13.8);
  assert.equal(B.costoAvance(b, 1000), 63.25);
  assert.equal(B.costoAvance(b, 1500), 72.13);
  assert.equal(B.costoAvance(b, 5000), 161);
  assert.equal(B.costoAvance(b, 9000), 168.08);
  assert.equal(B.costoAvance(b, 100, 0), 5.13);          // exterior: hasta $100
  assert.equal(B.costoAvance(b, 100.5, 0), 10.27);
  assert.equal(B.costoAvance(b, 300, 0), 15.4);
  assert.equal(B.costoAvance(b, 800, 0), 20.54);
  assert.equal(B.costosAvance(b, 150).length, 2);
  // el documento no trae tasa de tarjeta ni factores de diferido: queda sin dato y la tasa sugerida es el techo legal
  const f = B.filas(b, null);
  assert.equal(f.find((x) => x.clave === 'diferido').texto, null);
  assert.equal(f.find((x) => x.clave === 'tasa').texto, null);
  assert.equal(B.tasaSugerida(b, 'EC').delBanco, false);
  assert.match(b.fuente.vigencia, /sin fecha/);
  assert.deepEqual(B.redesDe(b), PLAN.tarjetas.redes);
});

test('avance Austro: tabla del país, tabla del exterior y comprobación cruzada con el IVA', () => {
  const b = B.buscar('ec-austro');
  assert.equal(B.costoAvance(b, 0.5), null);
  assert.equal(B.costoAvance(b, 100.99), 13.35);
  assert.equal(B.costoAvance(b, 101), 20.54);
  assert.equal(B.costoAvance(b, 300.99), 20.54);          // el rango $101–$300,99 es uno solo
  assert.equal(B.costoAvance(b, 900.5), 56.48);
  assert.equal(B.costoAvance(b, 1000), 77);
  assert.equal(B.costoAvance(b, 1200), 82.14);
  assert.equal(B.costoAvance(b, 5000.99), 154.02);
  assert.equal(B.costoAvance(b, 5001), 256.69);
  assert.equal(B.costoAvance(b, 100, 0), 5.18);           // exterior
  assert.equal(B.costoAvance(b, 150, 0), 5.98);
  assert.equal(B.costoAvance(b, 250, 0), 15.3);
  assert.equal(B.costoAvance(b, 6000.99, 0), 158.01);
  assert.equal(B.costoAvance(b, 7000, 0), 172.5);
  assert.equal(B.costosAvance(b, 150).length, 2);
  assert.deepEqual(B.redesDe(b), ['Visa', 'Mastercard']);
  assert.ok(B.nivelesDe(b).includes('Black'));
  assert.equal(B.tasaSugerida(b, 'EC').delBanco, true);
  near(B.tasaSugerida(b, 'EC').nominal, 15.6);
  // cada valor publicado = cargo sin IVA × 1,15 (los cargos sin IVA del tarifario son los de la tabla de la regulación)
  const sinIva = { pais: [11.61, 17.86, 22.32, 26.79, 31.25, 35.71, 40.18, 49.11, 66.96, 71.43, 75.89, 80.36, 84.32, 89.29, 98.21, 102.68, 107.14, 133.93, 223.21],
    ext: [4.50, 5.20, 13.30, 21.30, 29.90, 38.90, 48.90, 58.10, 68.20, 78.80, 89.70, 101.10, 112.80, 124.90, 137.40, 150.00] };
  b.avance.escalones.forEach(([, v], i) => near(v, sinIva.pais[i] * 1.15, 0.011));
  b.avance.otrosCanales[0].escalones.forEach(([, v], i) => near(v, sinIva.ext[i] * 1.15, 0.011));
});

test('avance Guayaquil: dos tablas que se traslapan, se muestran las cuatro columnas y se cruzan con el IVA', () => {
  const b = B.buscar('ec-guayaquil');
  assert.equal(B.costoAvance(b, 0), null);                 // sin monto no hay avance (el rango estándar parte de $0)
  assert.equal(B.costoAvance(b, 100.99), 7.19);            // cajero / banca (país, estándar)
  assert.equal(B.costoAvance(b, 350), 25.67);
  assert.equal(B.costoAvance(b, 950), 76.73);
  assert.equal(B.costoAvance(b, 1800), 98.58);
  assert.equal(B.costoAvance(b, 9000), 287.5);
  assert.equal(B.costoAvance(b, 12000), 299.83);
  assert.equal(B.costoAvance(b, 350, 0), 28.75);           // oficina y corresponsales (país, estándar)
  assert.equal(B.costoAvance(b, 2000, 0), 115);
  assert.equal(B.costoAvance(b, 12000, 0), 316.25);
  assert.equal(B.costoAvance(b, 350, 1), 22.59);           // cajero o internet (tabla exterior)
  assert.equal(B.costoAvance(b, 600, 1), 53.39);
  assert.equal(B.costoAvance(b, 350, 2), 25.67);           // ventanilla (tabla exterior)
  assert.equal(B.costoAvance(b, 1500, 2), 64.69);
  assert.equal(B.costoAvance(b, 10001, 2), 316.25);
  assert.equal(B.costosAvance(b, 350).length, 4);
  assert.deepEqual(B.redesDe(b), ['Visa', 'Mastercard', 'American Express']);
  assert.equal(b.logoFondo, '#bc157c');
  // cada valor de la tabla de ventanilla = cargo sin IVA × 1,15
  const sinIva = [17.86, 22.32, 26.79, 31.25, 35.71, 40.18, 44.64, 49.11, 56.25, 75, 100, 125, 150, 175, 200, 225, 250, 275];
  b.avance.otrosCanales[2].escalones.forEach(([, v], i) => near(v, sinIva[i] * 1.15, 0.011));
  // el texto de avance se arma con los mismos valores con los que calcula la app
  const f = B.filas(b, 'Oro');
  assert.match(f.find((x) => x.clave === 'avance').nota, /\$7,19 hasta \$100,99 · \$12,32 hasta \$200,99/);
  assert.match(f.find((x) => x.clave === 'avance').nota, /\$316,25 desde \$10\.001/);
  assert.match(f.find((x) => x.clave === 'recompensas').texto, /\$32,20/);
  assert.match(B.filas(b, 'Elite').find((x) => x.clave === 'recompensas').texto, /\$62,10/);
  assert.equal(B.tasaSugerida(b, 'EC').efectiva, 16.77);
  near(B.tasaSugerida(b, 'EC').nominal, 15.6);
});

test('Banco Manabí: avance $4,46 + IVA por cada $100 (tope $130,50 + IVA), tasa igual al máximo y lo que no publica queda sin dato', () => {
  const b = B.buscar('ec-manabi');
  assert.ok(b && B.tieneCostos(b));
  assert.equal(B.costoAvance(b, 0), null);
  assert.equal(B.costoAvance(b, 0.5), null);
  assert.equal(B.costoAvance(b, 100), 5.13);
  assert.equal(B.costoAvance(b, 100.99), 5.13);
  assert.equal(B.costoAvance(b, 101), 10.26);
  assert.equal(B.costoAvance(b, 250), 15.39);              // 3 tramos: 3 × 4,46 = 13,38 + IVA
  assert.equal(B.costoAvance(b, 2900.99), 148.74);         // 29 tramos: 129,34 + IVA
  assert.equal(B.costoAvance(b, 2901), 150.08);            // desde $2.901 el máximo es 130,50 + IVA
  assert.equal(B.costoAvance(b, 8000), 150.08);
  assert.equal(B.costosAvance(b, 350).length, 1);
  // cada tramo = n × 4,46 y luego el IVA, calculado aparte en centavos
  b.avance.escalones.slice(0, 29).forEach(([, v], i) => near(v, ((i + 1) * 446 * 1.15) / 100, 0.006));
  assert.deepEqual(B.redesDe(b), ['Visa']);
  assert.deepEqual(B.nivelesDe(b), ['Clásica', 'Gold']);
  const t = B.tasaSugerida(b, 'EC');
  assert.equal(t.delBanco, true);
  assert.equal(t.efectiva, 16.77);
  near(t.nominal, 15.6);
  // lo que su tarifario no trae no se inventa: queda sin dato para que la persona lo anote
  const f = B.filas(b, 'Gold');
  ['mora', 'diferido', 'voucher'].forEach((k) => assert.equal(f.find((x) => x.clave === k).texto, null, k));
  assert.match(f.find((x) => x.clave === 'recompensas').texto, /\$12,65/);
  assert.match(B.filas(b, 'Clásica').find((x) => x.clave === 'recompensas').texto, /\$8,05/);
  assert.match(f.find((x) => x.clave === 'cobranza').texto, /\$7,34 a \$50,59/);
  assert.match(f.find((x) => x.clave === 'emision').texto, /\$5,03/);
  assert.match(f.find((x) => x.clave === 'rotativo').texto, /15 días/);
  assert.equal(b.fuente.vigencia, 'noviembre 2026');
});

test('Banco Atlántida: avance publicado en sus preguntas frecuentes, límite de $500 y sin tasa propia por ser ambigua', () => {
  const b = B.buscar('ec-atlantida');
  assert.ok(b && B.tieneCostos(b));
  assert.deepEqual(B.redesDe(b), ['Mastercard']);
  assert.deepEqual(B.nivelesDe(b), ['Standard', 'Black']);
  assert.equal(B.costoAvance(b, 0), null);
  assert.equal(B.costoAvance(b, 100), 5.13);               // $5,13 por cada $100 en cajero del país
  assert.equal(B.costoAvance(b, 150), 10.26);
  assert.equal(B.costoAvance(b, 250), 15.39);
  assert.equal(B.costoAvance(b, 500), 25.65);
  assert.equal(B.costoAvance(b, 501), null);               // más de $500 por día: no se calcula
  assert.equal(B.costoAvance(b, 100, 'otros'), 8.21);      // $8,21 por cada $100 en cajero del exterior
  assert.equal(B.costoAvance(b, 200, 0), 16.42);
  assert.equal(B.costoAvance(b, 501, 0), null);
  const dos = B.costosAvance(b, 300);
  assert.equal(dos.length, 2);
  assert.equal(dos[0].valor, 15.39);
  assert.equal(dos[1].valor, 24.63);
  const sobre = B.costosAvance(b, 600);                    // pasa del límite: se muestra el aviso del banco, no un valor inventado
  assert.equal(sobre.length, 2);
  assert.ok(sobre.every((x) => x.valor == null && /\$500 por día/.test(x.texto)));
  // la tasa del 15,15 % no dice si es nominal o efectiva: no se usa; la app parte del techo legal y no la presenta como del banco
  const t = B.tasaSugerida(b, 'EC');
  assert.equal(t.delBanco, false);
  assert.equal(t.efectiva, 16.77);
  const f = B.filas(b, 'Black');
  assert.match(f.find((x) => x.clave === 'tasa').texto, /15,15 %/);
  assert.match(f.find((x) => x.clave === 'tasa').nota, /16,77 %/);
  assert.match(f.find((x) => x.clave === 'diferido').nota, /24 meses/);   // se muestran las dos versiones que se contradicen
  assert.match(f.find((x) => x.clave === 'diferido').texto, /36 meses/);
  assert.match(f.find((x) => x.clave === 'rotativo').nota, /5 % del total adeudado/);
  assert.match(f.find((x) => x.clave === 'rotativo').nota, /4 % del total consumido/);
  assert.match(f.find((x) => x.clave === 'mora').texto, /10 % \(más de 60 días\)/);
  assert.match(f.find((x) => x.clave === 'cobranza').texto, /\$7,34 a \$50,59/);
  assert.match(f.find((x) => x.clave === 'emision').texto, /\$5,03/);
  assert.match(f.find((x) => x.clave === 'recompensas').texto, /\$8,05/);
  assert.equal(b.fuente.vigencia, 'julio 2026');
});

test('Cooperativa JEP: avance $4,46 + IVA por cada $100 con rangos de $x00,01 a $x00,00, tope $223,00 + IVA, y lo que no explica queda dicho', () => {
  const b = B.buscar('ec-jep');
  assert.ok(b && B.tieneCostos(b));
  assert.equal(b.tipo, 'cooperativa');
  assert.deepEqual(B.redesDe(b), ['Visa', 'Mastercard']);
  assert.deepEqual(B.nivelesDe(b), ['Clásica / Standard', 'Gold', 'Signature', 'Infinite / Black']);
  // valores de su tabla de «Cargo de avance de efectivo por monto» (total con IVA)
  const tabla = [[0.01, 5.13], [100, 5.13], [100.01, 10.26], [200, 10.26], [200.01, 15.39], [500, 25.65], [700, 35.90], [1000, 51.29], [1500, 76.94],
    [2300, 117.97], [2500, 128.23], [2500.01, 133.35], [3300, 169.26], [4000, 205.16], [4800, 246.19], [4900, 251.32], [4900.01, 256.45], [5000, 256.45], [9000, 256.45]];
  tabla.forEach(([m, v]) => assert.equal(B.costoAvance(b, m), v, '$' + m));
  assert.equal(B.costoAvance(b, 0), null);
  assert.equal(B.costoAvance(b, 0.005), null);
  assert.equal(B.costosAvance(b, 350).length, 1);
  const t = B.tasaSugerida(b, 'EC');
  assert.equal(t.delBanco, true);
  assert.equal(t.efectiva, 16.77);
  near(t.nominal, 15.6);
  const f = B.filas(b, 'Gold');
  assert.match(f.find((x) => x.clave === 'diferido').texto, /60 meses 44,64 %/);
  assert.match(f.find((x) => x.clave === 'diferido').nota, /07 413 5000/);
  assert.match(f.find((x) => x.clave === 'mora').texto, /10 % \(más de 60 días\)/);
  assert.match(f.find((x) => x.clave === 'cobranza').texto, /\$7,34 a \$50,59/);
  assert.match(f.find((x) => x.clave === 'cobranza').nota, /\$26,54/);              // difiere de lo que publican otros bancos: se avisa
  assert.match(f.find((x) => x.clave === 'emision').texto, /\$5,03/);
  assert.match(f.find((x) => x.clave === 'mantenimiento').texto, /\$0,00/);
  assert.match(f.find((x) => x.clave === 'rotativo').texto, /no dice expresamente/);  // no inventa que los 15 días sean sin interés
  assert.match(f.find((x) => x.clave === 'rotativo').nota, /15 días posteriores/);
  assert.equal(f.find((x) => x.clave === 'recompensas').texto.includes('$26,45'), true);
  assert.match(B.filas(b, 'Clásica / Standard').find((x) => x.clave === 'recompensas').texto, /\$11,50/);
  assert.match(B.filas(b, 'Signature').find((x) => x.clave === 'recompensas').texto, /\$50,60/);
  assert.match(B.filas(b, 'Infinite / Black').find((x) => x.clave === 'recompensas').texto, /\$62,10/);
  assert.equal(b.fuente.vigencia, 'octubre 2026');
  assert.match(b.fuente.url, /^https:/);
});

test('Cooperativa CPN: avance tal como lo publica (hasta $2.900 por tramos, desde $2.900,01 un valor fijo), rotativo 16,77 % y lo que no publica queda sin dato', () => {
  const b = B.buscar('ec-cpn');
  assert.ok(b && B.tieneCostos(b));
  assert.equal(b.tipo, 'cooperativa');
  assert.deepEqual(B.redesDe(b), ['Mastercard']);
  assert.deepEqual(B.nivelesDe(b), ['Standard', 'Gold', 'Platinum', 'Black']);
  assert.equal(B.costoAvance(b, 0), null);
  assert.equal(B.costoAvance(b, 100), 4.46);
  assert.equal(B.costoAvance(b, 100.01), 8.92);
  assert.equal(B.costoAvance(b, 250), 13.38);
  assert.equal(B.costoAvance(b, 1000), 44.6);
  assert.equal(B.costoAvance(b, 2900), 129.34);            // 29 tramos de $4,46
  assert.equal(B.costoAvance(b, 2900.01), 133.93);         // «superior a $2.900: $133,93 por cada avance»
  assert.equal(B.costoAvance(b, 8000), 133.93);
  const t = B.tasaSugerida(b, 'EC');
  assert.equal(t.delBanco, true);
  assert.equal(t.efectiva, 16.77);
  const f = B.filas(b, 'Black');
  // no publica recargo de mora de tarjeta: sin dato, no se inventa
  assert.equal(f.find((x) => x.clave === 'mora').texto, null);
  assert.match(f.find((x) => x.clave === 'rotativo').texto, /no explica/);
  assert.match(f.find((x) => x.clave === 'diferido').texto, /24 meses 17,05 %/);
  assert.match(f.find((x) => x.clave === 'cobranza').nota, /\$26,64/);
  assert.match(f.find((x) => x.clave === 'cobranza').nota, /Valores con IVA/);          // la ambigüedad del IVA se muestra
  assert.match(f.find((x) => x.clave === 'avance').nota, /no dice si el valor lleva IVA/);
  assert.match(f.find((x) => x.clave === 'recompensas').texto, /\$54,00/);
  assert.match(B.filas(b, 'Platinum').find((x) => x.clave === 'recompensas').texto, /\$28,00/);
  assert.match(B.filas(b, 'Standard').find((x) => x.clave === 'recompensas').texto, /\$10,00/);
  assert.match(f.find((x) => x.clave === 'mantenimiento').texto, /\$0,00/);
  assert.equal(b.fuente.vigencia, 'noviembre 2026');
  assert.match(b.fuente.url, /^https:/);
});

test('Cooperativa Cooprogreso: avance por canal (país y exterior), tasa 15,15 % nominal = 16,25 % efectiva, y lo que no publica queda sin dato', () => {
  const b = B.buscar('ec-cooprogreso');
  assert.ok(b && B.tieneCostos(b));
  assert.equal(b.tipo, 'cooperativa');
  assert.deepEqual(B.redesDe(b), ['Mastercard']);
  assert.deepEqual(B.nivelesDe(b), ['Mastercard', 'Black']);
  assert.equal(B.costoAvance(b, 0), null);
  assert.equal(B.costoAvance(b, 100), 5.13);
  assert.equal(B.costoAvance(b, 100.01), 10.27);
  assert.equal(B.costoAvance(b, 300), 15.4);
  assert.equal(B.costoAvance(b, 1000), 30.81);
  assert.equal(B.costoAvance(b, 1000.01), 35.94);
  assert.equal(B.costoAvance(b, 100, 'otros'), 8.21);       // cajeros internacionales
  assert.equal(B.costoAvance(b, 1500, 'otros'), 57.5);
  const t = B.tasaSugerida(b, 'EC');
  assert.equal(t.delBanco, true);
  assert.equal(t.efectiva, 16.25);
  near(t.nominal, 15.15);
  // la nominal publicada y la efectiva publicada son coherentes (capitalización mensual)
  near((Math.pow(1 + 0.1515 / 12, 12) - 1) * 100, 16.25, 0.01);
  const f = B.filas(b, 'Black');
  assert.match(f.find((x) => x.clave === 'diferido').texto, /36 meses/);
  assert.match(f.find((x) => x.clave === 'diferido').nota, /cálculo de la app/);
  assert.match(f.find((x) => x.clave === 'rotativo').nota, /no separa corriente de rotativo/);
  assert.match(f.find((x) => x.clave === 'mantenimiento').texto, /\$0,00/);
  assert.match(f.find((x) => x.clave === 'emision').texto, /\$5,03/);
  assert.equal(f.find((x) => x.clave === 'uso').texto, null);   // no lo leí: sin dato, no se inventa
  assert.equal(b.fuente.vigencia, 'noviembre 2026');
  assert.match(b.fuente.url, /^https:/);
});

test('Cooperativa OSCUS: avance por cajero y ventanilla (valores del tarifario × 1,15), diferido con factores, mora y cobranza tal como las publica', () => {
  const b = B.buscar('ec-oscus');
  assert.ok(b && B.tieneCostos(b));
  assert.equal(b.tipo, 'cooperativa');
  assert.deepEqual(B.redesDe(b), ['Mastercard']);
  assert.deepEqual(B.nivelesDe(b), ['Standard', 'Gold', 'Black']);
  assert.equal(B.costoAvance(b, 0), null);
  assert.equal(B.costoAvance(b, 100), 4.52);            // $3,93 + IVA
  assert.equal(B.costoAvance(b, 100.01), 9.04);         // $7,86 + IVA
  assert.equal(B.costoAvance(b, 300), 10.84);           // $9,43 + IVA
  assert.equal(B.costoAvance(b, 500), 16.26);           // $14,14 + IVA
  assert.equal(B.costoAvance(b, 900), 18.98);           // «de $501 en adelante»: $16,50 + IVA
  assert.equal(B.costoAvance(b, 500, 'otros'), 18.01);  // ventanilla $15,66 + IVA
  assert.equal(B.costoAvance(b, 1000, 'otros'), 27.03);
  assert.equal(B.costoAvance(b, 5000, 'otros'), 63.05); // «de $3.001 en adelante»: $54,83 + IVA
  const t = B.tasaSugerida(b, 'EC');
  assert.equal(t.delBanco, true);
  assert.equal(t.efectiva, 15.79);
  near(t.nominal, 14.75);
  near((Math.pow(1 + 0.1475 / 12, 12) - 1) * 100, 15.79, 0.01);   // nominal y efectiva coherentes
  const f = B.filas(b, 'Gold');
  assert.match(f.find((x) => x.clave === 'rotativo').texto, /hasta el 15 del mes/);
  assert.match(f.find((x) => x.clave === 'diferido').texto, /36 meses 24,35 %/);
  assert.match(f.find((x) => x.clave === 'mora').texto, /1,05 %/);
  assert.match(f.find((x) => x.clave === 'mora').nota, /no dice sobre qué valor/);
  assert.match(f.find((x) => x.clave === 'cobranza').nota, /\$30,64/);     // $26,64 + IVA: confirma que lo de JEP ($26,54) es un error
  assert.match(f.find((x) => x.clave === 'mantenimiento').texto, /\$0,00/);
  assert.match(f.find((x) => x.clave === 'emision').texto, /\$5,03/);
  assert.equal(f.find((x) => x.clave === 'recompensas').texto, null);       // no publica recompensas: sin dato
  assert.equal(b.fuente.vigencia, 'octubre 2026');
  assert.match(b.fuente.url, /^https:/);
});

test('Cooperativa Andalucía: tarjetas Visa en tres niveles, tarifario en imágenes: sin ninguna cifra inventada y con aviso', () => {
  const b = B.buscar('ec-andalucia');
  assert.ok(b);
  assert.equal(b.tipo, 'cooperativa');
  assert.deepEqual(B.redesDe(b), ['Visa']);
  assert.deepEqual(B.nivelesDe(b), ['Gold', 'Platinum', 'Signature']);
  assert.equal(B.tieneCostos(b), false);
  assert.match(b.aviso, /imágenes/);
  assert.equal(B.costoAvance(b, 100), null);
  const t = B.tasaSugerida(b, 'EC');
  assert.equal(t.delBanco, false);
  assert.equal(t.efectiva, 16.77);
  assert.match(b.fuente.url, /^https:/);
});

test('Cooperativa Mushuc Runa: está en la lista con aviso y sin ninguna cifra inventada', () => {
  const b = B.buscar('ec-mushucruna');
  assert.ok(b);
  assert.equal(b.tipo, 'cooperativa');
  assert.equal(B.tieneCostos(b), false);                    // no hay cifras leídas: todo lo anota la persona
  assert.match(b.aviso, /no pude leer/);
  assert.equal(B.costoAvance(b, 100), null);
  const t = B.tasaSugerida(b, 'EC');
  assert.equal(t.delBanco, false);                          // usa el techo legal, no una tasa del banco
  assert.equal(t.efectiva, 16.77);
  assert.ok(B.lista('EC').some((x) => x.id === 'ec-mushucruna'));
});

test('Cooperativa Pablo Muñoz Vega: ofrece tarjeta pero no publica tasas ni costos: solo la reposición, todo lo demás sin dato y con aviso', () => {
  const b = B.buscar('ec-pmv');
  assert.ok(b && B.tieneCostos(b));
  assert.equal(b.tipo, 'cooperativa');
  assert.match(b.aviso, /no publica sus tasas/);
  assert.equal(B.costoAvance(b, 100), null);               // no inventa un avance
  assert.deepEqual(B.costosAvance(b, 100), []);
  const t = B.tasaSugerida(b, 'EC');
  assert.equal(t.delBanco, false);                          // no usa la tasa del crédito de consumo: no es la de la tarjeta
  assert.equal(t.efectiva, 16.77);
  const f = B.filas(b, 'Clásica');
  const conDato = f.filter((x) => x.texto != null).map((x) => x.clave);
  assert.deepEqual(conDato, ['reposicion']);
  assert.match(f.find((x) => x.clave === 'reposicion').texto, /\$5,03/);
  assert.equal(b.fuente.vigencia, 'octubre 2026');
});

test('Banco Pichincha (tarifario de noviembre 2026): productos con su plan de recompensas y sin inventar lo que no publica', () => {
  const b = B.buscar('ec-pichincha');
  assert.equal(b.fuente.vigencia, 'noviembre 2026');
  assert.match(b.tarifarioUrl, /tarifario-web-noviembre-2026\.pdf$/);
  assert.deepEqual(B.redesDe(b), ['Visa', 'Mastercard', 'Discover']);
  assert.equal(B.nivelesDe(b).length, 6);
  // cada nivel de la lista tiene su texto de recompensas (así ningún producto se queda sin su valor)
  B.nivelesDe(b).forEach((n) => assert.ok(b.recompensasPorNivel[n], n));
  assert.match(B.filas(b, 'Platinum Miles').find((x) => x.clave === 'recompensas').texto, /\$32,20 .*\$18,40/);
  assert.match(B.filas(b, 'Infinite / Black Miles').find((x) => x.clave === 'recompensas').texto, /\$62,10 .*\$27,60/);
  assert.match(B.filas(b, 'Discover').find((x) => x.clave === 'recompensas').texto, /\$26,45/);
  assert.match(B.filas(b, null).find((x) => x.clave === 'recompensas').texto, /\$11,50 a \$62,10/);
  // la tasa del tarifario (16,77 % efectiva) y el avance siguen igual
  near(B.tasaSugerida(b, 'EC').nominal, 15.6);
  assert.equal(B.costoAvance(b, 2901), 153.87);
  // el tarifario no trae el recargo de mora ni explica el corriente: no se inventa; el cobro por uso sí trae lo que publica
  const f = B.filas(b, null);
  assert.match(f.find((x) => x.clave === 'mora').texto, /Banco Central/);
  assert.match(f.find((x) => x.clave === 'uso').texto, /\$1,96/);
  assert.match(f.find((x) => x.clave === 'cobranza').nota, /\$26,46/);
});

test('banco sin tarifario leído: no se inventa nada', () => {
  const b = B.buscar('co-bbva');
  assert.equal(B.costoAvance(b, 200), null);
  assert.ok(B.filas(b, 'Platinum').every((f) => f.texto === null && f.fuente === null));
  assert.equal(B.tieneCostos(b), false);
});

test('todo banco con costos trae fuente, vigencia y enlace', () => {
  B.catalogo().bancos.filter(B.tieneCostos).forEach((b) => {
    assert.ok(b.fuente && b.fuente.texto && b.fuente.vigencia && /^https:\/\//.test(b.fuente.url), b.id + ' sin fuente');
  });
});

test('las claves de costos del catálogo existen en PLAN.tarjetas.costos', () => {
  const claves = new Set(PLAN.tarjetas.costos.map((c) => c.clave));
  B.catalogo().bancos.forEach((b) => Object.keys(b.costos || {}).forEach((k) => assert.ok(claves.has(k), b.id + ': ' + k)));
});

test('filas: orden del PLAN, recompensas por nivel y lo que anota la persona manda', () => {
  const f = B.filas(B.buscar('ec-produbanco'), 'Platinum');
  assert.deepEqual(f.map((x) => x.clave), PLAN.tarjetas.costos.map((c) => c.clave));
  assert.match(f.find((x) => x.clave === 'recompensas').texto, /\$32,20/);
  const g = B.filas(B.buscar('ec-pichincha'), null, { avance: { texto: '5 % del monto', fecha: '2026-11-06' } });
  assert.equal(g.find((x) => x.clave === 'avance').texto, '5 % del monto');
  assert.equal(g.find((x) => x.clave === 'avance').propio, true);
  assert.equal(g.find((x) => x.clave === 'avance').fuente, null);
});

test('tasa sugerida: la del banco si la publica; si no, el techo legal; nunca para un país sin dato', () => {
  const p = B.tasaSugerida(B.buscar('ec-pichincha'), 'EC');
  assert.equal(p.delBanco, true); near(p.nominal, 15.6); assert.equal(p.efectiva, 16.77);
  const a = B.tasaSugerida(B.buscar('ec-amazonas'), 'EC');
  assert.equal(a.delBanco, false); near(a.nominal, 15.6);
  assert.equal(B.tasaSugerida(null, 'XX'), null);
  assert.equal(B.tasaSugerida(B.buscar('co-bbva'), 'CO'), null);
});

test('listas por país, redes y niveles', () => {
  assert.ok(B.lista('EC').length >= 9);
  assert.ok(B.lista('XX').length === 0);
  assert.equal(B.redesDe(B.buscar('ec-diners'))[0], 'Diners');
  assert.ok(B.nivelesDe(B.buscar('ec-diners')).includes('Discover'));
  assert.deepEqual(B.redesDe(B.buscar('co-bbva')), PLAN.tarjetas.redes);
  assert.ok(B.nivelesDe(B.buscar('ec-pacifico')).includes('Premium (Legend)'));
  assert.deepEqual(B.nivelesDe(B.buscar('ec-amazonas')), PLAN.tarjetas.niveles);
  assert.equal(B.iniciales('Banco Pichincha'), 'BP'); assert.equal(B.iniciales('Pichincha'), 'Pi'); assert.equal(B.iniciales(''), '?');
});

test('catálogo remoto: solo se acepta si tiene la forma esperada y reemplaza por id', () => {
  assert.equal(B.validar(null), false);
  assert.equal(B.validar({ version: 1, bancos: [{ id: 1 }] }), false);
  assert.equal(B.validar({ version: 'x', bancos: [] }), false);
  assert.equal(B.fusionar({ version: 'x' }), false);
  const antes = B.lista('EC').length;
  assert.equal(B.fusionar({ version: 2, bancos: [{ id: 'ec-guayaquil', pais: 'EC', nombre: 'Banco de Guayaquil', corto: 'Guayaquil', costos: { avance: { texto: '$3' } } }, { id: 'ec-nuevo', pais: 'EC', nombre: 'Nuevo', corto: 'Nuevo' }] }), true);
  assert.equal(B.lista('EC').length, antes + 1);
  assert.equal(B.buscar('ec-guayaquil').costos.avance.texto, '$3');
  assert.ok(B.buscar('ec-pichincha').costos.avance);            // lo demás sigue igual
});
