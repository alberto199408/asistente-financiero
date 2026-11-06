const test = require('node:test');
const assert = require('node:assert/strict');
require('../www/js/plan.js');
const U = require('../www/js/util.js');
const P = require('../www/js/parser.js');
const HOY = '2026-11-06'; // viernes
const ctxBase = { hoy: HOY, categorias: AF.PLAN.categorias, dicc: {}, tarjetas: [] };
const run = (t, extra) => P.interpretar(t, Object.assign({}, ctxBase, extra || {}));
const uno = (t, extra) => { const r = run(t, extra); assert.equal(r.tipo, 'registrar', 'tipo de "' + t + '": ' + JSON.stringify(r).slice(0, 300)); assert.ok(r.items.length >= 1, 'sin items en "' + t + '"'); return r.items[0]; };

test('registrar: gasto con categoría y monto', () => {
  let i = uno('gasté 20 dólares en gasolina extra');
  assert.deepEqual([i.tipo, i.monto, i.cat, i.catConfianza, i.cuenta], ['gasto', 20, 'combustible', 'alta', 'efectivo']);
  i = uno('Gasté 20 en gasolina extra');
  assert.deepEqual([i.tipo, i.monto, i.cat], ['gasto', 20, 'combustible']);
  i = uno('gasté 20 en eco país'); assert.equal(i.cat, 'combustible');
  i = uno('gasté 3 en una salchipapa'); assert.deepEqual([i.monto, i.cat], [3, 'comida_fuera']);
  i = uno('pagué la luz 30 dólares'); assert.deepEqual([i.monto, i.cat], [30, 'servicios']);
  i = uno('gasté 85 en el comisariato'); assert.deepEqual([i.monto, i.cat], [85, 'comida_hogar']);
  i = uno('pagué 45 de internet'); assert.deepEqual([i.monto, i.cat], [45, 'servicios']);
  i = uno('gasto de 12 en uber'); assert.deepEqual([i.monto, i.cat], [12, 'transporte']);
  i = uno('gasté 8 en una cola'); assert.deepEqual([i.monto, i.cat], [8, 'antojos']);
  i = uno('compré medicinas 18,50'); assert.deepEqual([i.monto, i.cat], [18.5, 'salud']);
  i = uno('gasté 40 en una salida con amigos'); assert.deepEqual([i.monto, i.cat], [40, 'salidas']);
  i = uno('gasté 60 en ropa'); assert.deepEqual([i.cat, i.nec], ['ropa', 'G']);
  i = uno('pagué 300 de arriendo'); assert.deepEqual([i.cat, i.nec], ['vivienda', 'N']);
});

test('registrar: ingresos', () => {
  let i = uno('saqué de mi sueldo 1000'); assert.deepEqual([i.tipo, i.monto, i.cat], ['ingreso', 1000, 'sueldo']);
  i = uno('gané 60'); assert.deepEqual([i.tipo, i.monto, i.cat], ['ingreso', 60, 'extra']);
  i = uno('gané sesenta dólares'); assert.deepEqual([i.tipo, i.monto], ['ingreso', 60]);
  i = uno('me pagaron 120 por un trabajito'); assert.deepEqual([i.tipo, i.monto, i.cat], ['ingreso', 120, 'extra']);
  i = uno('cobré mi sueldo 800'); assert.deepEqual([i.tipo, i.monto, i.cat], ['ingreso', 800, 'sueldo']);
  i = uno('ingreso de 500 por venta'); assert.deepEqual([i.tipo, i.monto, i.cat], ['ingreso', 500, 'ventas']);
  i = uno('vendí una laptop 300'); assert.equal(i.tipo, 'ingreso');
});

test('números dichos en palabras', () => {
  let i = uno('gasté veinte y cinco dólares en la farmacia'); assert.deepEqual([i.monto, i.cat], [25, 'salud']);
  i = uno('gasté veinte con cincuenta dólares en farmacia'); assert.equal(i.monto, 20.5);
  i = uno('gasté mil doscientos en el arriendo'); assert.equal(i.monto, 1200);
  i = uno('gasté quince con cincuenta centavos en pan'); assert.equal(i.monto, 15.5);
});

test('cantidad vs monto', () => {
  let i = uno('compré dos pizzas en 20 dólares'); assert.equal(i.monto, 20);
  i = uno('compré una pizza 10 dólares'); assert.equal(i.monto, 10);
  i = uno('gasté 20 en 2 pizzas'); assert.equal(i.monto, 20);
});

test('fechas', () => {
  assert.equal(uno('ayer gasté 15 en almuerzo').fecha, '2026-11-05');
  assert.equal(uno('anteayer pagué 10 de taxi').fecha, '2026-11-04');
  assert.equal(uno('gasté 15 en almuerzo').fecha, HOY);
  assert.equal(uno('el lunes gasté 9 en pasaje').fecha, '2026-11-02');
  assert.equal(uno('hace 3 días compré 12 de medicinas').fecha, '2026-11-03');
});

test('varias cosas en una frase', () => {
  const r = run('gasté 3 en salchipapa y 5 en pasaje');
  assert.equal(r.items.length, 2);
  assert.deepEqual([r.items[0].monto, r.items[0].cat, r.items[1].monto, r.items[1].cat], [3, 'comida_fuera', 5, 'transporte']);
});

test('tarjeta: corriente, diferido, cuotas', () => {
  let r = run('compré 70 con la tarjeta');
  assert.equal(r.items[0].cuenta, 'tarjeta'); assert.equal(r.items[0].monto, 70);
  assert.equal(r.items[0].credito.modo, 'corriente'); assert.ok(r.sinTarjetas); assert.ok(r.dudas.includes('categoria'));
  r = run('200 diferido a seis meses, cuotas de 49');
  const i = r.items[0];
  assert.deepEqual([i.monto, i.cuenta, i.credito.modo, i.credito.meses, i.credito.cuota], [200, 'tarjeta', 'diferido', 6, 49]);
  const T = [{ id: 't1', nombre: 'Visa Pichincha', banco: 'Banco Pichincha', red: 'Visa' }, { id: 't2', nombre: 'Diners', banco: 'Diners Club', red: 'Diners' }];
  r = run('gasté 100 con la visa del pichincha a 12 meses sin intereses', { tarjetas: T });
  assert.deepEqual([r.items[0].tarjetaId, r.items[0].credito.meses, r.items[0].credito.interes, r.items[0].credito.modo], ['t1', 12, false, 'diferido']);
  r = run('compré 50 con la tarjeta', { tarjetas: T }); assert.ok(r.dudas.includes('tarjeta'));
  r = run('compré 50 con la tarjeta', { tarjetas: [T[0]] }); assert.equal(r.items[0].tarjetaId, 't1');
  r = run('compré 600 diferido a un año con intereses', { tarjetas: [T[0]] });
  assert.deepEqual([r.items[0].credito.meses, r.items[0].credito.interes], [12, true]);
  r = run('gasté 30 en efectivo en comida'); assert.equal(r.items[0].cuenta, 'efectivo');
});

test('aprende y pregunta una vez', () => {
  let i = uno('gasté 7 en pastelitos');
  assert.deepEqual([i.cat, i.catConfianza, i.palabraNueva], ['otros', 'ninguna', 'pastelitos']);
  i = uno('gasté 7 en pastelitos', { dicc: { pastelitos: 'antojos' } });
  assert.deepEqual([i.cat, i.catConfianza], ['antojos', 'alta']);
});

test('preguntas', () => {
  let q = run('¿cuánto he ganado este mes?'); assert.deepEqual([q.tipo, q.tema, q.periodo.clave], ['preguntar', 'ingresos', 'mes']);
  q = run('cuánto han sido mis ingresos'); assert.equal(q.tema, 'ingresos');
  q = run('desglósame mis gastos'); assert.deepEqual([q.tipo, q.tema], ['preguntar', 'desglose']);
  q = run('en qué gasto más'); assert.equal(q.tema, 'masgasto');
  q = run('¿cuánto puedo gastar hoy?'); assert.equal(q.tema, 'disponible');
  q = run('me alcanza para un celular de 300'); assert.deepEqual([q.tema, q.monto], ['meconviene', 300]);
  q = run('cuánto gasté en gasolina el mes pasado'); assert.deepEqual([q.tema, q.cat, q.periodo.clave], ['gastos', 'combustible', 'mes_pasado']);
  q = run('cuánto debo pagar de la tarjeta del pichincha', { tarjetas: [{ id: 't1', nombre: 'Visa Pichincha', banco: 'Banco Pichincha', red: 'Visa' }] });
  assert.deepEqual([q.tema, q.tarjetaId], ['tarjeta', 't1']);
  q = run('cuánto gasté esta semana'); assert.deepEqual([q.tema, q.periodo.clave, q.periodo.desde], ['gastos', 'semana', '2026-11-02']);
  q = run('cuánto he gastado en octubre'); assert.equal(q.periodo.desde, '2026-10-01');
});

test('correcciones', () => {
  let c = run('cambia el último a salud'); assert.deepEqual([c.tipo, c.accion, c.cat], ['corregir', 'categoria', 'salud']);
  c = run('borra el último'); assert.deepEqual([c.tipo, c.accion], ['corregir', 'borrar']);
  c = run('cambia el último a 25'); assert.deepEqual([c.accion, c.monto], ['monto', 25]);
  c = run('deshaz'); assert.deepEqual([c.tipo, c.accion], ['corregir', 'deshacer']);
  c = run('márcalo como gusto'); assert.deepEqual([c.accion, c.nec], ['necesidad', 'G']);
  c = run('cámbialo a ingreso'); assert.deepEqual([c.accion, c.nuevoTipo], ['tipo', 'ingreso']);
});

test('presupuesto, informe, ayuda, desconocido', () => {
  let p = run('ponme un límite de 100 en salidas'); assert.deepEqual([p.tipo, p.monto, p.cat], ['presupuesto', 100, 'salidas']);
  p = run('pon un presupuesto de 500 al mes'); assert.deepEqual([p.tipo, p.monto, p.cat], ['presupuesto', 500, null]);
  let f = run('genera el informe del mes en pdf'); assert.deepEqual([f.tipo, f.formato], ['informe', 'pdf']);
  assert.equal(run('ayuda').tipo, 'ayuda');
  assert.equal(run('hola buenos días').tipo, 'desconocido');
});

test('frase anotada', () => {
  const r = run('gasté 20 dólares en gasolina extra');
  const roles = r.partes.map((x) => x.rol + ':' + x.texto);
  assert.deepEqual(roles, ['tipo:gasté', 'monto:20 dólares', ':en', 'cat:gasolina extra']);
});

test('centavos dichos de forma natural y descripción limpia', () => {
  let i = uno('gasté 9 con 50 en un almuerzo'); assert.equal(i.monto, 9.5);
  i = uno('gasté nueve cincuenta en un almuerzo'); assert.equal(i.monto, 9.5);
  i = uno('gasté tres veinticinco en una cola'); assert.equal(i.monto, 3.25);
  i = uno('salí con 5 amigos y gasté 40'); assert.equal(i.monto, 40);
  i = uno('pagué 20 con 30 amigos en el bar'); assert.equal(i.monto, 20);
  i = uno('cargué 30 de gasolina'); assert.equal(i.desc, 'Gasolina');
  i = uno('fui al cine y gasté 12'); assert.deepEqual([i.cat, i.desc], ['salidas', 'Cine']);
  i = uno('gasté 4 en una colada'); assert.deepEqual([i.cat, i.catConfianza], ['comida_fuera', 'alta']);
  i = uno('compré fruta 6 dólares'); assert.equal(i.cat, 'comida_hogar');
});
