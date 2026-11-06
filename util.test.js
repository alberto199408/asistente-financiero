const test = require('node:test');
const assert = require('node:assert/strict');
require('../www/js/plan.js');
const U = require('../www/js/util.js');

test('palabras a números', () => {
  const c = U.palabrasANumeros;
  assert.equal(c('gaste veinte dolares en gasolina'), 'gaste 20 dolares en gasolina');
  assert.equal(c('gane sesenta'), 'gane 60');
  assert.equal(c('veinte y cinco'), '25');
  assert.equal(c('treinta y un dolares'), '31 dolares');
  assert.equal(c('ciento veinte'), '120');
  assert.equal(c('mil doscientos cincuenta'), '1250');
  assert.equal(c('dos mil'), '2000');
  assert.equal(c('mil'), '1000');
  assert.equal(c('cuarenta y nueve dolares'), '49 dolares');
  assert.equal(c('doscientos diferido a seis meses'), '200 diferido a 6 meses');
  assert.equal(c('compre una pizza'), 'compre una pizza');          // "una" artículo: no se toca
  assert.equal(c('un dolar'), '1 dolar');
  assert.equal(c('veintiun dolares'), '21 dolares');
});

test('parseNumero', () => {
  const p = U.parseNumero;
  assert.equal(p('20,50'), 20.5);
  assert.equal(p('20.50'), 20.5);
  assert.equal(p('1.234,56'), 1234.56);
  assert.equal(p('1,234.56'), 1234.56);
  assert.equal(p('1.500'), 1500);
  assert.equal(p('1,500'), 1500);
  assert.equal(p('$20'), 20);
  assert.equal(p('0.5'), 0.5);
});

test('dinero', () => {
  assert.equal(U.dinero(1060), '$1.060');
  assert.equal(U.dinero(20.5), '$20,50');
  assert.equal(U.dinero(1234567.8), '$1.234.567,80');
  assert.equal(U.dinero(-63), '−$63');
  assert.equal(U.dinero(5, { fijo: true }), '$5,00');
  assert.equal(U.dinero(5, { signo: true }), '+$5');
});

test('fechas', () => {
  assert.equal(U.sumarDias('2026-11-06', -1), '2026-11-05');
  assert.equal(U.sumarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(U.sumarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(U.finMes('2026-02-10'), '2026-02-28');
  assert.equal(U.inicioSemana('2026-11-06'), '2026-11-02');         // viernes => lunes
  assert.equal(U.diasEntre('2026-11-01', '2026-11-06'), 5);
  assert.equal(U.proximoDia('2026-11-06', 15), '2026-11-15');
  assert.equal(U.proximoDia('2026-11-20', 15), '2026-12-15');
  assert.equal(U.proximoDia('2026-01-30', 31), '2026-01-31');
  assert.equal(U.proximoDia('2026-02-10', 31), '2026-02-28');
  assert.equal(U.fechaCorta('2026-11-05', '2026-11-06'), 'ayer');
});
