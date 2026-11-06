const test = require('node:test');
const assert = require('node:assert/strict');
require('../www/js/plan.js');
const U = require('../www/js/util.js');
const P = require('../www/js/parser.js');
const L = require('../www/js/lector.js');
const PLAN = global.AF.PLAN;
const HOY = '2026-11-06';
const ctx = { hoy: HOY, categorias: PLAN.categorias, dicc: {} };
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.005, a + ' vs ' + b);

test('montos: ignora fechas, horas, tarjetas y porcentajes', () => {
  const ms = L.montosEn('Compra por $15,30 con tarjeta terminada en 4821 el 05/11/2026 14:32 IVA 15%');
  assert.equal(ms.length, 1);
  near(ms[0].valor, 15.3);
});
test('montos con miles y decimales', () => {
  near(L.montosEn('Depósito de $1.250,00')[0].valor, 1250);
  near(L.montosEn('Monto: 1,250.50 USD')[0].valor, 1250.5);
});

test('fechas: dd/mm/aaaa, iso, con mes en letras y sin año', () => {
  assert.equal(L.fecha('el 05/11/2026', HOY), '2026-11-05');
  assert.equal(L.fecha('2026-11-02 retiro', HOY), '2026-11-02');
  assert.equal(L.fecha('3 nov 2026', HOY), '2026-11-03');
  assert.equal(L.fecha('15 de octubre', HOY), '2026-10-15');
  assert.equal(L.fecha('20 de diciembre', HOY), '2025-12-20');   // todavía no llega: es del año pasado
  assert.equal(L.fecha('sin fecha aquí', HOY), null);
});

test('mensaje de compra con tarjeta', () => {
  const r = L.bancario('Banco Pichincha: Compra por $15,30 en SUPERMAXI con tarjeta terminada en 4821 el 05/11/2026 14:32.', ctx);
  assert.equal(r.ok, true); assert.equal(r.tipo, 'gasto'); near(r.monto, 15.3);
  assert.equal(r.fecha, '2026-11-05'); assert.equal(r.tarjeta4, '4821');
  assert.equal(r.desc, 'Supermaxi'); assert.equal(r.cat, 'comida_hogar');
});
test('mensaje de transferencia recibida es ingreso', () => {
  const r = L.bancario('Has recibido una transferencia de $120.00 de JUAN PEREZ el 04/11/2026', ctx);
  assert.equal(r.tipo, 'ingreso'); near(r.monto, 120); assert.equal(r.fecha, '2026-11-04');
});
test('consumo en gasolinera clasifica por el comercio', () => {
  const r = L.bancario('Consumo USD 8.50 en PRIMAX LA Y. Tarjeta ****1234. 3 nov 2026', ctx);
  assert.equal(r.tipo, 'gasto'); near(r.monto, 8.5); assert.equal(r.cat, 'combustible'); assert.equal(r.fecha, '2026-11-03');
});
test('depósito de nómina', () => {
  const r = L.bancario('Depósito acreditado en tu cuenta: $1.250,00 (nómina)', ctx);
  assert.equal(r.tipo, 'ingreso'); near(r.monto, 1250); assert.equal(r.cat, 'sueldo');
});
test('sin monto no inventa nada', () => {
  const r = L.bancario('Tu clave fue cambiada con éxito', ctx);
  assert.equal(r.ok, false); assert.equal(r.monto, null);
});
test('varios mensajes en un texto', () => {
  const t = 'Compra por $5,00 en TIA el 01/11/2026\n\nConsumo por $12,00 en KFC el 02/11/2026';
  const l = L.bancarioVarios(t, ctx);
  assert.equal(l.length, 2); near(l[0].monto, 5); near(l[1].monto, 12);
});

const FACTURA = [
  'SUPERMERCADO EL AHORRO S.A.', 'RUC: 1790000000001', 'FACTURA No. 001-002-000123456', 'FECHA: 05/11/2026',
  'CANT DESCRIPCION P.UNIT TOTAL', '2 LECHE ENTERA 1L 1,10 2,20', '1 ARROZ 2KG 3,50 3,50',
  'SUBTOTAL 5,70', 'IVA 15% 0,86', 'TOTAL 6,56', 'EFECTIVO 10,00', 'CAMBIO 3,44'].join('\n');
test('factura: total, fecha, comercio y productos', () => {
  const r = L.factura(FACTURA, ctx);
  assert.equal(r.ok, true); near(r.monto, 6.56); assert.equal(r.fecha, '2026-11-05');
  assert.equal(r.desc, 'Supermercado El Ahorro S.A.'); assert.equal(r.ruc, '1790000000001');
  assert.equal(r.items.length, 2); near(r.items[0].monto, 2.2); assert.equal(r.items[0].cat, 'comida_hogar');
  assert.deepEqual(r.duda, []);
});
test('factura: el total en la línea de abajo', () => {
  const r = L.factura('RESTAURANTE EL SABOR\nFecha 2026-11-04\nSUBTOTAL 10,00\nTOTAL\n11,50', ctx);
  near(r.monto, 11.5);
});
test('factura sin la palabra total: toma el mayor y avisa duda', () => {
  const r = L.factura('TIENDA DON PEPE\n3,50\n12,00\n', ctx);
  near(r.monto, 12); assert.ok(r.duda.includes('monto'));
});
test('factura: si los productos no cuadran con el total, no los ofrece', () => {
  const r = L.factura('TIENDA\n1 COSA 1,00 100,00\n1 OTRA 1,00 200,00\nTOTAL 5,00', ctx);
  assert.equal(r.items.length, 0);
});

test('estado de cuenta: líneas con fecha, pagos marcados, encabezados fuera', () => {
  const t = ['Fecha Descripción Valor', '05/10/2026 SUPERMAXI 45,30', '08/10/2026 NETFLIX 9,99', '12/10/2026 PAGO TARJETA GRACIAS -200,00', 'Total consumos 55,29'].join('\n');
  const l = L.estadoCuenta(t, ctx);
  assert.equal(l.length, 3);
  near(l[0].monto, 45.3); assert.equal(l[0].fecha, '2026-10-05'); assert.equal(l[0].esPago, false); assert.equal(l[0].cat, 'comida_hogar');
  assert.equal(l[1].cat, 'suscripciones');
  assert.equal(l[2].esPago, true); near(l[2].monto, 200);
});

test('«se acreditó / se acredito» y otras formas de ingreso al banco son ingreso; «se debitó» es gasto', () => {
  ['Pichincha: Se acreditó USD 500.00 en tu cuenta por transferencia de JUAN PEREZ el 04/11/2026',
    'Pichincha: Se acredito USD 500.00 en tu cuenta por transferencia de JUAN PEREZ',
    'Banco Guayaquil: Te depositaron $80,00 en tu cuenta',
    'Transferencia recibida por USD 35,00'].forEach((t) => assert.equal(L.bancario(t, ctx).tipo, 'ingreso', t));
  assert.equal(L.bancario('Se debitó USD 30 de su cuenta por pago de servicios', ctx).tipo, 'gasto');
  assert.equal(L.bancario('Compra por USD 12,00 en FARMACIAS FYBECA con tarjeta terminada en 1234', ctx).tipo, 'gasto');
});
