const test = require('node:test');
const assert = require('node:assert/strict');
require('../www/js/plan.js');
const Sg = require('../www/js/seguridad.js');
const mem = {};
Sg.usarAlmacen({ async get(k) { return k in mem ? mem[k] : null; }, async set(k, v) { mem[k] = v; }, async del(k) { delete mem[k]; } });
const NS = 'google:123';
const secretosFalsos = () => { const bov = {}; return { bov, async guardar(ns, t) { bov[ns] = t; }, async leer(ns) { return bov[ns] || null; }, async borrar(ns) { delete bov[ns]; } }; };

test('PIN válido y débil', () => {
  assert.equal(Sg.pinValido('1234'), true); assert.equal(Sg.pinValido('123'), false); assert.equal(Sg.pinValido('12a4'), false); assert.equal(Sg.pinValido('1234567'), false);
  assert.equal(Sg.pinDebil('1111'), true); assert.equal(Sg.pinDebil('1234'), true); assert.equal(Sg.pinDebil('4829'), false);
});

test('crear bóveda, guardar datos cifrados y reabrir con PIN', async () => {
  await Sg.crear(NS, '4829');
  assert.equal(await Sg.longitudPin(NS), 4);
  await Sg.guardarDatos(NS, { movs: [{ monto: 12.5, desc: 'secreto-banana' }] });
  const crudo = Object.values(mem).join('');
  assert.ok(!crudo.includes('secreto-banana'), 'lo guardado no es legible');
  assert.ok(!crudo.includes('4829'));
  Sg.bloquear(); assert.equal(Sg.estaAbierta(), false);
  await assert.rejects(Sg.leerDatos(NS));
  const mal = await Sg.abrirConPin(NS, '0000'); assert.equal(mal.ok, false); assert.equal(mal.motivo, 'incorrecto'); assert.equal(mal.restantes, 4);
  const bien = await Sg.abrirConPin(NS, '4829'); assert.equal(bien.ok, true);
  assert.equal((await Sg.leerDatos(NS)).movs[0].monto, 12.5);
  assert.equal((await Sg.estadoIntentos(NS)).n, 0);
});

test('bloqueo temporal tras demasiados intentos', async () => {
  Sg.bloquear();
  let r; for (let i = 0; i < 5; i++) r = await Sg.abrirConPin(NS, '1357');
  assert.equal(r.motivo, 'espera'); assert.ok(r.espera > 0);
  const ahora = await Sg.abrirConPin(NS, '4829');           // ni el PIN correcto entra durante la espera
  assert.equal(ahora.ok, false); assert.equal(ahora.motivo, 'espera');
  // vencida la espera, entra
  const k = Object.keys(mem).find((x) => x.endsWith(':intentos')); const o = JSON.parse(mem[k]); o.hasta = Date.now() - 1; mem[k] = JSON.stringify(o);
  assert.equal((await Sg.abrirConPin(NS, '4829')).ok, true);
});

test('huella: abre sin PIN y se puede quitar', async () => {
  const sec = secretosFalsos();
  await Sg.activarHuella(NS, sec);
  assert.equal(await Sg.huellaActiva(NS), true);
  Sg.bloquear();
  assert.equal((await Sg.abrirConHuella(NS, sec)).ok, true);
  assert.equal((await Sg.leerDatos(NS)).movs.length, 1);
  Sg.bloquear();
  await Sg.desactivarHuella(NS, sec);
  assert.equal((await Sg.abrirConHuella(NS, sec)).ok, false);
});

test('cambiar PIN y paquete de respaldo (cifrado) restaurable con el PIN', async () => {
  assert.equal((await Sg.abrirConPin(NS, '4829')).ok, true);
  await Sg.cambiarPin(NS, '7391');
  Sg.bloquear();
  assert.equal((await Sg.abrirConPin(NS, '4829')).ok, false);
  const k = Object.keys(mem).find((x) => x.endsWith(':intentos')); if (k) delete mem[k];
  assert.equal((await Sg.abrirConPin(NS, '7391')).ok, true);
  const paquete = await Sg.paqueteRespaldo(NS);
  assert.ok(!JSON.stringify(paquete).includes('secreto-banana'));
  const NS2 = 'google:999';                                // "teléfono nuevo"
  await Sg.restaurarPaquete(NS2, paquete);
  assert.equal((await Sg.abrirConPin(NS2, '7391')).ok, true);
  assert.equal((await Sg.leerDatos(NS2)).movs[0].desc, 'secreto-banana');
});

test('cuentas separadas y borrado total', async () => {
  await Sg.crear('facebook:abc', '2468');
  await Sg.guardarDatos('facebook:abc', { movs: [] });
  Sg.bloquear();
  assert.equal((await Sg.abrirConPin('facebook:abc', '7391')).ok, false);   // el PIN de otra cuenta no abre esta
  await Sg.borrarCuenta('google:123');
  assert.equal(await Sg.existe('google:123'), false);
  assert.equal(await Sg.existe('facebook:abc'), true);
});

test('bloqueo por tiempo en segundo plano y sesión', async () => {
  await Sg.crear('x:1', '2468');
  Sg.marcarSalida(1000);
  assert.equal(Sg.debeBloquear(30, 1000 + 10000), false);
  assert.equal(Sg.debeBloquear(30, 1000 + 31000), true);
  await Sg.guardarSesion({ proveedor: 'google', id: '123', nombre: 'Luis' });
  assert.equal((await Sg.sesion()).nombre, 'Luis'); assert.equal(Sg.espacioDe(await Sg.sesion()), 'google:123');
  await Sg.cerrarSesion(); assert.equal(await Sg.sesion(), null); assert.equal(Sg.estaAbierta(), false);
});
