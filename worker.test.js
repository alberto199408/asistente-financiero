const test = require('node:test');
const assert = require('node:assert/strict');
const CATS = [{ id: 'combustible', nombre: 'Combustible', tipo: 'gasto' }, { id: 'sueldo', nombre: 'Sueldo', tipo: 'ingreso' }, { id: 'otros', nombre: 'Otros', tipo: 'gasto' }];
const cuerpo = (extra) => Object.assign({ texto: 'puse 20 de gasolina', hoy: '2026-11-06', moneda: 'USD', pais: 'EC', categorias: CATS, tarjetas: [] }, extra || {});
const ENV = { ANTHROPIC_API_KEY: 'sk-prueba', MODELO: 'modelo-de-prueba' };
// Respuesta de la IA simulada: llamada a la herramienta "registrar"
const ia = (items, ok) => async () => ({ ok: ok !== false, status: ok === false ? 500 : 200, json: async () => ({ content: [{ type: 'tool_use', name: 'registrar', input: { items } }] }) });
let W;
test.before(async () => { W = await import('../worker/index.mjs'); });

test('IA: devuelve movimientos limpios con la misma forma que espera la app', async () => {
  const r = await W.interpretar(cuerpo(), ENV, ia([{ tipo: 'gasto', monto: 20.004, cat: 'combustible', desc: 'gasolina', fecha: '2026-11-05' }]));
  assert.equal(r.estado, 200);
  assert.deepEqual(r.cuerpo, { tipo: 'registrar', items: [{ tipo: 'gasto', monto: 20, cat: 'combustible', desc: 'gasolina', fecha: '2026-11-05' }] });
});
test('IA: descarta lo inválido (categoría inexistente, tipo que no coincide, monto 0) y pone la fecha de hoy si falta', async () => {
  const r = await W.interpretar(cuerpo(), ENV, ia([
    { tipo: 'gasto', monto: 5, cat: 'inventada' }, { tipo: 'ingreso', monto: 5, cat: 'combustible' }, { tipo: 'gasto', monto: 0, cat: 'otros' },
    { tipo: 'ingreso', monto: 800, cat: 'sueldo', fecha: 'mañana' },
  ]));
  assert.equal(r.estado, 200);
  assert.deepEqual(r.cuerpo.items, [{ tipo: 'ingreso', monto: 800, cat: 'sueldo', desc: '', fecha: '2026-11-06' }]);
});
test('IA: sin movimientos válidos responde 422 (la app sigue con su lector local)', async () => {
  assert.equal((await W.interpretar(cuerpo(), ENV, ia([]))).estado, 422);
  assert.equal((await W.interpretar(cuerpo(), ENV, async () => ({ ok: true, json: async () => ({ content: [{ type: 'text', text: 'hola' }] }) }))).estado, 422);
});
test('IA: errores de la IA o de red no rompen nada', async () => {
  assert.equal((await W.interpretar(cuerpo(), ENV, ia([], false))).estado, 502);
  assert.equal((await W.interpretar(cuerpo(), ENV, async () => { throw new Error('sin red'); })).estado, 502);
});
test('IA: valida lo que manda la app', async () => {
  assert.equal((await W.interpretar(cuerpo({ texto: '   ' }), ENV, ia([]))).estado, 400);
  assert.equal((await W.interpretar(cuerpo({ categorias: [] }), ENV, ia([]))).estado, 400);
  assert.equal((await W.interpretar(null, ENV, ia([]))).estado, 400);
  assert.equal((await W.interpretar(cuerpo(), { ANTHROPIC_API_KEY: 'x' }, ia([]))).estado, 500);   // sin modelo configurado
});
test('IA: manda a la IA el modelo configurado, el texto recortado y solo categorías válidas', async () => {
  let enviado;
  await W.interpretar(cuerpo({ texto: 'a'.repeat(900), categorias: CATS.concat([{ id: 'x', nombre: 'x', tipo: 'raro' }]) }), ENV, async (u, o) => { enviado = JSON.parse(o.body); return ia([])(); });
  assert.equal(enviado.model, 'modelo-de-prueba');
  assert.equal(enviado.messages[0].content.length, 500);
  assert.ok(!enviado.system.includes('- x ('));
  assert.equal(enviado.tool_choice.name, 'registrar');
});
test('IA: tope diario de toda la app (con KV)', async () => {
  const kv = { m: new Map(), async get(k) { return this.m.get(k) || null; }, async put(k, v) { this.m.set(k, v); } };
  const env = Object.assign({}, ENV, { LIMITE_DIARIO: '2', CONTADOR: kv });
  const f = ia([{ tipo: 'gasto', monto: 1, cat: 'otros' }]);
  assert.equal((await W.interpretar(cuerpo(), env, f)).estado, 200);
  assert.equal((await W.interpretar(cuerpo(), env, f)).estado, 200);
  assert.equal((await W.interpretar(cuerpo(), env, f)).estado, 429);
});
test('Servidor: solo responde a la app (origen), salud y rutas', async () => {
  const pide = (ruta, init, env) => W.default.fetch(new Request('https://ia.ejemplo.workers.dev' + ruta, init), env || ENV);
  const post = (origen, c) => pide('/interpretar', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, origen ? { Origin: origen } : {}), body: JSON.stringify(c || cuerpo()) });
  assert.equal((await post(null)).status, 403);
  assert.equal((await post('https://sitio-malo.com')).status, 403);
  const salud = await pide('/salud', { method: 'GET' });
  assert.deepEqual(await salud.json(), { ok: true, modelo: 'modelo-de-prueba', clave: true });
  assert.equal((await pide('/otra', { method: 'GET' })).status, 404);
  const op = await pide('/interpretar', { method: 'OPTIONS', headers: { Origin: 'https://localhost' } });
  assert.equal(op.status, 204); assert.equal(op.headers.get('Access-Control-Allow-Origin'), 'https://localhost');
  const real = globalThis.fetch;
  globalThis.fetch = ia([{ tipo: 'gasto', monto: 20, cat: 'combustible' }]);
  try {
    const ok = await post('https://localhost');
    assert.equal(ok.status, 200); assert.equal(ok.headers.get('Access-Control-Allow-Origin'), 'https://localhost');
    assert.equal((await ok.json()).items[0].monto, 20);
  } finally { globalThis.fetch = real; }
  assert.equal((await pide('/interpretar', { method: 'POST', headers: { Origin: 'https://localhost' }, body: 'no es json' })).status, 400);
  assert.equal((await W.default.fetch(new Request('https://x.dev/interpretar', { method: 'POST', headers: { Origin: 'https://localhost' }, body: '{}' }), { MODELO: 'm' })).status, 500);
});
