const test = require('node:test');
const assert = require('node:assert/strict');
require('../www/js/plan.js');
const U = require('../www/js/util.js');
require('../www/js/tarjetas.js');
const I = require('../www/js/informes.js');
const P = require('../www/js/parser.js');
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, a + ' vs ' + b);

const HOY = '2026-11-12';
function datos(extra) {
  const d = {
    ajustes: { diaCobro: 5, sueldo: 1000, cargas: 1, pais: 'EC', moneda: 'USD' },
    movs: [], tarjetas: [], pagosFijos: [], metas: [], presupuestos: [], categorias: [], diccionario: {},
  };
  let n = 0;
  const m = (tipo, monto, cat, fecha, o) => d.movs.push(Object.assign({ id: 'm' + (++n), creado: n, tipo, monto, cat, fecha, desc: '' }, o || {}));
  m('ingreso', 1000, 'sueldo', '2026-11-05');
  m('gasto', 200, 'comida_hogar', '2026-11-06');
  m('gasto', 50, 'transporte', '2026-11-07');
  m('gasto', 3.5, 'antojos', '2026-11-08', { desc: 'helado' });
  m('gasto', 2, 'antojos', '2026-11-09', { desc: 'helado' });
  m('gasto', 30, 'comida_fuera', '2026-11-10');
  m('gasto', 100, 'comida_hogar', '2026-10-15');
  m('ingreso', 900, 'sueldo', '2026-10-05');
  if (extra) extra(d, m);
  return d;
}

test('totales del mes y por categoría', () => {
  const d = datos();
  const t = I.totales(d, '2026-11-01', '2026-11-30');
  near(t.ingresos, 1000); near(t.gastos, 285.5); near(t.balance, 714.5);
  assert.equal(t.porCategoria[0].id, 'comida_hogar');
  near(t.porCategoria[0].pct, 200 / 285.5, 0.001);
});

test('hormiga: solo montos chicos de categorías hormiga', () => {
  const h = I.hormiga(datos(), '2026-11-01', '2026-11-30');
  assert.equal(h.veces, 2); near(h.total, 5.5);
  assert.equal(h.porProducto[0].veces, 2);
  assert.ok(h.alAnio > 100);
});

test('ciclo de cobro: día 5', () => {
  const c = I.ciclo(datos(), HOY);
  assert.equal(c.inicio, '2026-11-05'); assert.equal(c.proximo, '2026-12-05'); assert.equal(c.dias, 23);
  assert.equal(I.ciclo(datos(), '2026-11-03').inicio, '2026-10-05');
});

test('cuánto puedes gastar hoy (simple y completo)', () => {
  const d = datos((dd) => {
    dd.pagosFijos.push({ id: 'f1', nombre: 'Arriendo', monto: 300, dia: 20 });
  });
  const p = I.puedesGastarHoy(d, HOY, 'simple');
  near(p.ingresos, 1000); near(p.fijos, 300);
  near(p.gastadoAntes, 285.5);
  near(p.disponible, 1000 - 285.5 - 300);
  near(p.porDia, p.disponible / 23, 0.01);
  // pagar el arriendo lo quita de pendientes
  d.movs.push({ id: 'x', creado: 99, tipo: 'gasto', monto: 300, cat: 'vivienda', fecha: '2026-11-11', pagoFijoId: 'f1' });
  const p2 = I.puedesGastarHoy(d, HOY, 'simple');
  near(p2.fijos, 0); near(p2.disponible, 1000 - 585.5);
});

test('completo: descuenta cuotas de tarjeta y metas, no la compra con tarjeta', () => {
  const d = datos((dd) => {
    dd.tarjetas.push({ id: 't1', nombre: 'Visa', diaCorte: 20, diaVencimiento: 28, tasaAnual: null });
    dd.movs.push({ id: 'c1', creado: 50, tipo: 'gasto', monto: 120, cat: 'ropa', fecha: '2026-11-08', cuenta: 'tarjeta', tarjetaId: 't1', credito: { modo: 'diferido', meses: 6, interes: false } });
    dd.metas.push({ id: 'g1', nombre: 'Moto', aporteMensual: 50, aportes: [] });
  });
  const s = I.puedesGastarHoy(d, HOY, 'simple');
  const c = I.puedesGastarHoy(d, HOY, 'completo');
  near(s.gastadoAntes, 285.5 + 120);        // Free cuenta la compra al comprar
  near(c.gastadoAntes, 285.5);               // Pro la cuenta cuando se paga la cuota
  near(c.cuotas, 20); near(c.metas, 50);
});

test('sin ingresos del ciclo usa el sueldo de ajustes (estimado)', () => {
  const d = datos(); d.movs = d.movs.filter((m) => m.tipo !== 'ingreso');
  const p = I.puedesGastarHoy(d, HOY, 'simple');
  assert.equal(p.estimado, true); near(p.ingresos, 1000);
});

test('presupuestos y alertas', () => {
  const d = datos((dd) => { dd.presupuestos.push({ id: 'p1', cat: 'comida_hogar', monto: 250 }, { id: 'p2', cat: 'transporte', monto: 40 }); });
  const ps = I.presupuestos(d, HOY);
  assert.equal(ps[0].nivel, 'aviso'); assert.equal(ps[1].nivel, 'detente');
  const a = I.alertas(d, HOY, false);
  assert.equal(a.length, 2);
  assert.ok(a.some((x) => /Detente/.test(x.texto)));
});

test('SRI: 18 % con tope por canastas y cargas', () => {
  const d = datos((dd) => {
    dd.movs.push({ id: 's1', creado: 80, tipo: 'gasto', monto: 500, cat: 'salud', fecha: '2026-03-01' });
  });
  const s = I.sri(d, 2026);
  near(s.tope, 9 * 821.8);
  assert.ok(s.total >= 500);
  near(s.rebaja, s.base * 0.18, 0.01);
  near(s.rebajaMaxima, 2958.48, 0.01);
  assert.equal(s.topeRubroConocido, false);
});

test('respuestas del botón único', () => {
  const d = datos();
  const ctx = { hoy: HOY, categorias: PLAN_CATS(), dicc: {}, tarjetas: [] };
  const r = (txt, pro) => { const q = P.interpretar(txt, ctx); return I.responder(q, d, HOY, !!pro); };
  assert.match(r('cuánto gasté este mes').texto, /285,50/);
  assert.match(r('cuánto gané este mes').texto, /1\.000/);
  assert.match(r('en qué gasto más').texto, /comida del hogar|comida_hogar/i);
  assert.match(r('cuánto puedo gastar hoy').texto, /puedes gastar/);
  const hm = r('cuánto gasté en hormiga este mes');
  assert.equal(hm.bloqueado, 'hormigaDetalle');
  assert.ok(r('cuánto gasté en hormiga este mes', true).filas.length >= 1);
  assert.equal(r('me conviene comprar un celular de 300').bloqueado, 'meConviene');
  assert.match(r('me conviene comprar un celular de 300', true).texto, /alcanza/i);
});
function PLAN_CATS() { return globalThis.AF.PLAN.categorias; }

test('corrección: objetivo y CSV', () => {
  const d = datos();
  assert.equal(I.objetivoDeCorreccion(d, null).cat, 'comida_fuera');
  assert.equal(I.objetivoDeCorreccion(d, { cat: 'transporte' }).monto, 50);
  const csv = I.csv(d, '2026-11-01', '2026-11-30');
  assert.ok(csv.startsWith('﻿"Fecha"'));
  assert.match(csv, /"3,5"/);
  assert.match(I.resumenCompartir(d, HOY), /comida del hogar|comida_hogar/i);
});

/* ---------------------------------------------------------------- metas, fijos, suscripciones, reto, conciliar */
test('metas: lo aportado en el ciclo y lo que falta del aporte mensual salen de lo disponible (Pro)', () => {
  const d = datos((x) => { x.metas = [{ id: 'g1', nombre: 'Viaje', objetivo: 1000, aporteMensual: 100, aportes: [{ id: 'a1', fecha: '2026-11-08', monto: 40 }] }]; });
  const sin = I.puedesGastarHoy(datos(), HOY, 'completo');
  const con = I.puedesGastarHoy(d, HOY, 'completo');
  near(con.metas, 100);                                   // 40 ya aportados + 60 que faltan
  near(sin.disponible - con.disponible, 100);
  const libre = datos((x) => { x.metas = [{ id: 'g2', nombre: 'Moto', objetivo: 500, aportes: [{ id: 'a2', fecha: '2026-11-08', monto: 30 }] }]; });
  near(I.puedesGastarHoy(libre, HOY, 'completo').metas, 30);   // sin aporte mensual: solo lo que ya pusiste
  near(I.puedesGastarHoy(libre, HOY, 'simple').metas, 0);      // en Gratis no se toca (fórmula del documento)
});

test('pago fijo: pendiente, pagado y atrasado dentro del ciclo', () => {
  const p = { id: 'f1', nombre: 'Internet', monto: 25, dia: 8, activo: true };
  let e = I.estadoFijo(datos((x) => x.pagosFijos.push(p)), p, HOY);                // ciclo desde el 5; vence el 8; hoy 12 => atrasado
  assert.equal(e.pagado, false); assert.equal(e.atrasado, true); assert.equal(e.proxima, '2026-11-08');
  e = I.estadoFijo(datos((x, m) => { x.pagosFijos.push(p); m('gasto', 25, 'servicios', '2026-11-09', { pagoFijoId: 'f1' }); }), p, HOY);
  assert.equal(e.pagado, true); assert.equal(e.atrasado, false); assert.equal(e.proxima, '2026-12-08');
  const futuro = { id: 'f2', nombre: 'Colegio', monto: 100, dia: 20, activo: true };
  e = I.estadoFijo(datos((x) => x.pagosFijos.push(futuro)), futuro, HOY);
  assert.equal(e.atrasado, false); assert.equal(e.proxima, '2026-11-20'); assert.equal(e.diasPara, 8);
});

test('suscripciones: detecta lo que se repite cada mes y no inventa', () => {
  const d = datos((x, m) => {
    m('gasto', 9.99, 'suscripciones', '2026-09-08', { desc: 'Netflix' }); m('gasto', 9.99, 'suscripciones', '2026-10-08', { desc: 'Netflix' }); m('gasto', 9.99, 'suscripciones', '2026-11-09', { desc: 'Netflix' });
    m('gasto', 30, 'comida_hogar', '2026-10-03', { desc: 'Mercado' }); m('gasto', 55, 'comida_hogar', '2026-11-20', { desc: 'Mercado' });     // montos y días distintos: no es suscripción
    m('gasto', 12, 'suscripciones', '2026-07-05', { desc: 'Spotify' }); m('gasto', 12, 'suscripciones', '2026-08-05', { desc: 'Spotify' });    // dejó de repetirse
    m('gasto', 4, 'antojos', '2026-10-05', { desc: 'Café' }); m('gasto', 4, 'antojos', '2026-11-05', { desc: 'Café' });                           // hormiga: se ignora
  });
  const s = I.suscripcionesDetectadas(d, HOY);
  assert.equal(s.length, 1); assert.equal(s[0].nombre, 'Netflix'); near(s[0].monto, 9.99); assert.equal(s[0].meses, 3); assert.equal(s[0].dia, 9);
  d.pagosFijos.push({ id: 'f9', nombre: 'netflix', monto: 9.99, dia: 8 });
  assert.equal(I.suscripcionesDetectadas(d, HOY).length, 0);                       // ya la tienes registrada
});

test('préstamos: pendiente descuenta abonos y el resumen separa lo que te deben de lo que debes', () => {
  const d = { prestamos: [{ id: 'p1', persona: 'Juan', monto: 100, direccion: 'me_deben', abonos: [{ fecha: '2026-11-01', monto: 30 }] }, { id: 'p2', persona: 'Ana', monto: 50, direccion: 'debo' }, { id: 'p3', persona: 'Luis', monto: 20, direccion: 'me_deben', pagado: true }] };
  near(I.pendientePrestamo(d.prestamos[0]), 70);
  const r = I.prestamosResumen(d); near(r.meDeben, 70); near(r.debo, 50);
});

test('reto 30 días sin hormiga: la racha cuenta días completos y un gasto hormiga la reinicia', () => {
  const base = (extra) => datos((x, m) => { x.retos = [{ id: 'r1', estado: 'activo', inicio: '2026-11-01' }]; if (extra) extra(x, m); });
  // en datos() hay hormiga el 8 y el 9 (helado de 3,5 y 2) => la racha empieza el día 10
  let r = I.reto(base(), HOY);
  assert.equal(r.ultimaFalla, '2026-11-09'); assert.equal(r.racha, 2); assert.equal(r.fallaHoy, false); assert.equal(r.completado, false);
  assert.equal(r.dias[0].fecha, '2026-11-10'); assert.equal(r.dias[0].estado, 'ok'); assert.equal(r.dias[2].estado, 'hoy');
  r = I.reto(base((x, m) => m('gasto', 2, 'antojos', HOY)), HOY);
  assert.equal(r.fallaHoy, true); assert.equal(r.racha, 0);
  const limpio = I.reto({ movs: [], retos: [{ id: 'r', estado: 'activo', inicio: '2026-10-05' }], categorias: [] }, HOY);
  assert.equal(limpio.racha, 30); assert.equal(limpio.completado, true);
  assert.equal(I.reto({ movs: [], retos: [] }, HOY), null);
});

test('conciliar: une cada línea con a lo más un movimiento y muestra lo que falta y lo que sobra', () => {
  const t = { id: 't1', nombre: 'Visa' };
  const d = datos((x, m) => { x.tarjetas.push(t); m('gasto', 45.3, 'comida_hogar', '2026-10-05', { cuenta: 'tarjeta', tarjetaId: 't1' }); m('gasto', 20, 'ropa', '2026-10-07', { cuenta: 'tarjeta', tarjetaId: 't1' }); m('gasto', 45.3, 'comida_hogar', '2026-10-06', { cuenta: 'efectivo' }); });
  const r = I.conciliar(d, [{ fecha: '2026-10-06', desc: 'Supermaxi', monto: 45.3 }, { fecha: '2026-10-08', desc: 'Netflix', monto: 9.99 }, { fecha: '2026-10-05', desc: 'Otro', monto: 45.3 }], 't1');
  assert.equal(r.lineas[0].estado, 'ya'); assert.equal(r.lineas[1].estado, 'falta'); assert.equal(r.lineas[2].estado, 'falta');   // el segundo 45,30 no tiene pareja
  assert.equal(r.ya, 1); assert.equal(r.faltan, 2);
  assert.equal(r.sobran.length, 1); near(r.sobran[0].monto, 20);                                                                  // lo tuyo que el estado no trae
});

test('alerta predictiva: no salta con pocos días de datos', () => {
  const d = datos((x, m) => m('gasto', 400, 'ropa', '2026-11-06'));
  assert.ok(!I.alertas(d, '2026-11-07', true).some((a) => a.tipo === 'prediccion'));       // 2 días desde el cobro (día 5)
  assert.ok(I.alertas(d, '2026-11-14', true).some((a) => a.tipo === 'prediccion'));        // 9 días: ya hay ritmo
});
