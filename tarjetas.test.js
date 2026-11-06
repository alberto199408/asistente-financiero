const test = require('node:test');
const assert = require('node:assert/strict');
require('../www/js/plan.js');
const U = require('../www/js/util.js');
const T = require('../www/js/tarjetas.js');
const near = (a, b, tol = 0.02) => assert.ok(Math.abs(a - b) <= tol, a + ' vs ' + b);

test('ejemplo de Primicias: USD 1.000 a 12 meses, 15,6 % anual', () => {
  const c = T.cuotaFrancesa(1000, 15.6, 12);
  near(c, 90.5, 0.1);                       // el artículo dice ≈ 90,5 al mes
  near(c * 12, 1086.5, 1.2);                // y total ≈ 1.086,5
});

test('tasa implícita de una cuota informada', () => {
  near(T.tasaImplicita(1000, 90.53, 12), 15.6, 0.15);
  assert.equal(T.tasaImplicita(1000, 1000 / 12, 12), 0);
  assert.equal(T.tasaImplicita(200, 20, 6), null);       // 6 x 20 = 120 < 200
});

const tarj = { id: 't1', nombre: 'Visa', diaCorte: 20, diaVencimiento: 5, tasaAnual: 15.6, cupo: 2000, pagoMinimoPct: 5 };

test('fechas de corte y vencimiento', () => {
  assert.equal(T.proximoCorte(tarj, '2026-11-06'), '2026-11-20');
  assert.equal(T.proximoCorte(tarj, '2026-11-21'), '2026-12-20');
  assert.equal(T.vencimientoDe(tarj, '2026-11-20'), '2026-12-05');
  assert.equal(T.vencimientoDe({ diaCorte: 5, diaVencimiento: 20 }, '2026-11-05'), '2026-11-20');
});

test('compra corriente: una sola cuota en el próximo vencimiento', () => {
  const p = T.planCompra({ monto: 70, fecha: '2026-11-06', credito: { modo: 'corriente' } }, tarj);
  assert.equal(p.cuotas.length, 1); assert.equal(p.cuotas[0].vence, '2026-12-05'); assert.equal(p.cuotas[0].monto, 70);
});

test('diferido sin intereses y con intereses', () => {
  let p = T.planCompra({ monto: 600, fecha: '2026-11-06', credito: { modo: 'diferido', meses: 6, interes: false } }, tarj);
  assert.equal(p.cuotas.length, 6); assert.equal(p.cuotas[0].monto, 100); assert.equal(p.interesTotal, 0);
  assert.equal(p.cuotas[5].vence, '2027-05-05');
  p = T.planCompra({ monto: 1000, fecha: '2026-11-06', credito: { modo: 'diferido', meses: 12, interes: true } }, tarj);
  assert.equal(p.cuotas.length, 12); near(p.cuotas[0].monto, 90.53, 0.05); near(p.total, 1086.4, 1.5);
  near(p.cuotas.reduce((s, q) => s + q.capital, 0), 1000, 0.01);               // el capital cuadra
});

test('sin tasa NO inventa: la pide', () => {
  const sinTasa = Object.assign({}, tarj, { tasaAnual: null });
  const p = T.planCompra({ monto: 600, fecha: '2026-11-06', credito: { modo: 'diferido', meses: 6, interes: true } }, sinTasa);
  assert.ok(p.faltaTasa); assert.deepEqual(p.cuotas, []); assert.ok(p.faltanDatos.includes('tasa'));
  const q = T.planCompra({ monto: 600, fecha: '2026-11-06', credito: { modo: 'diferido', meses: 6 } }, sinTasa);
  assert.ok(q.faltaTasa);
});

test('el ejemplo del documento: 200 diferido a 6 meses, cuotas de 49 => avisa que no cuadra', () => {
  const p = T.planCompra({ monto: 200, fecha: '2026-11-06', credito: { modo: 'diferido', meses: 6, cuota: 49 } }, tarj);
  assert.equal(p.cuotas.length, 6); assert.ok(p.informada); assert.equal(p.cuotas[0].monto, 49);
  assert.ok(p.avisos.some((a) => /implican una tasa/.test(a)), JSON.stringify(p.avisos));
});

test('estado: deuda, próximo pago, cupo y pagos aplicados', () => {
  const movs = [
    { id: 'a', tipo: 'gasto', cuenta: 'tarjeta', tarjetaId: 't1', monto: 70, fecha: '2026-11-06', credito: { modo: 'corriente' } },
    { id: 'b', tipo: 'gasto', cuenta: 'tarjeta', tarjetaId: 't1', monto: 600, fecha: '2026-11-07', credito: { modo: 'diferido', meses: 6, interes: false } },
  ];
  let e = T.estado(tarj, movs, '2026-11-10');
  assert.equal(e.proximoVence, '2026-12-05'); assert.equal(e.aPagarProximo, 170); assert.equal(e.diferidasProximo, 100);
  assert.equal(e.deudaTotal, 670); assert.equal(e.pagoMinimo, 103.5);                // 100 + 5 % de 70 = 103,50
  assert.equal(e.cupoDisponible, 2000 - 670); assert.equal(e.diasParaCorte, 10);
  movs.push({ id: 'p', tipo: 'pago_tarjeta', tarjetaId: 't1', monto: 170, fecha: '2026-12-01' });
  e = T.estado(tarj, movs, '2026-12-02');
  assert.equal(e.deudaTotal, 500); assert.equal(e.proximoVence, '2027-01-05'); assert.equal(e.aPagarProximo, 100);
});

test('mínimo vs total solo con datos reales', () => {
  const movs = [{ id: 'a', tipo: 'gasto', cuenta: 'tarjeta', tarjetaId: 't1', monto: 1000, fecha: '2026-11-06', credito: { modo: 'corriente' } }];
  const e = T.estado(tarj, movs, '2026-11-10');
  const m = T.minimoVsTotal(tarj, e);
  assert.equal(m.pagarTotal, 1000); assert.equal(m.pagarMinimo, 50); assert.equal(m.queda, 950); near(m.interesEstimadoMes, 12.35, 0.01);
  assert.equal(T.minimoVsTotal(Object.assign({}, tarj, { tasaAnual: null }), e), null);
});
