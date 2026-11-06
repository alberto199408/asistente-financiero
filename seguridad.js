/* Seguridad: bóveda cifrada local.
   - Una clave de datos K (AES-256-GCM) al azar cifra todo lo de la cuenta. K nunca se guarda en claro.
   - K se guarda envuelta dos veces: con una clave derivada del PIN (PBKDF2) y, si se activa la huella,
     con un secreto al azar que el teléfono entrega solo tras la huella (almacén seguro nativo).
   - PIN olvidado = datos irrecuperables (se avisa al crear el PIN); se puede reiniciar la cuenta.
   - Cada cuenta (proveedor + id) tiene su propio espacio: dos personas en el mismo teléfono no se mezclan. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const PLAN = AF.PLAN;
  const S = () => PLAN.sesion;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const subtle = () => g.crypto.subtle;

  /* -------------------------------------------------------------------- utilidades */
  const b64 = (buf) => { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
  const deB64 = (t) => { const s = atob(t); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
  const azar = (n) => g.crypto.getRandomValues(new Uint8Array(n));
  const hash = async (t) => b64(await subtle().digest('SHA-256', enc.encode(t))).replace(/[^A-Za-z0-9]/g, '').slice(0, 16);

  /* ------------------------------------------------------------------ almacén simple */
  // Por defecto localStorage; nativo.js puede cambiarlo por Preferences. Interfaz asíncrona.
  let almacen = {
    async get(k) { try { return g.localStorage.getItem(k); } catch (e) { return mem[k] == null ? null : mem[k]; } },
    async set(k, v) { try { g.localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
    async del(k) { try { g.localStorage.removeItem(k); } catch (e) { delete mem[k]; } },
  };
  const mem = {};
  const usarAlmacen = (a) => { almacen = a; };
  const leerJSON = async (k) => { const t = await almacen.get(k); if (!t) return null; try { return JSON.parse(t); } catch (e) { return null; } };
  const escribirJSON = (k, o) => almacen.set(k, JSON.stringify(o));

  const clave = async (ns, parte) => 'af:' + (await hash(ns)) + ':' + parte;

  /* --------------------------------------------------------------- cifrado de bloques */
  async function importarAes(raw, usos) { return subtle().importKey('raw', raw, 'AES-GCM', false, usos || ['encrypt', 'decrypt']); }
  async function cifrar(key, bytes) { const iv = azar(12); const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, key, bytes); return { iv: b64(iv), ct: b64(ct) }; }
  async function descifrar(key, bloque) { return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: deB64(bloque.iv) }, key, deB64(bloque.ct))); }
  async function claveDePin(pin, salt, iter) {
    const base = await subtle().importKey('raw', enc.encode(String(pin)), 'PBKDF2', false, ['deriveKey']);
    return subtle().deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  /* --------------------------------------------------------------------- estado */
  let K = null;          // CryptoKey de datos (solo en memoria)
  let Kraw = null;       // bytes de K (solo en memoria; hace falta para activar huella / cambiar PIN)
  let nsActual = null;
  const estaAbierta = () => !!K;
  function bloquear() { K = null; if (Kraw) Kraw.fill(0); Kraw = null; }

  const pinValido = (pin) => new RegExp('^\\d{' + S().pinMin + ',' + S().pinMax + '}$').test(String(pin || ''));
  const pinDebil = (pin) => {
    const p = String(pin);
    return /^(\d)\1+$/.test(p) || '0123456789'.includes(p) || '9876543210'.includes(p);
  };

  /* ------------------------------------------------------------------ intentos de PIN */
  async function estadoIntentos(ns) {
    const o = (await leerJSON(await clave(ns, 'intentos'))) || { n: 0, hasta: 0 };
    const ahora = Date.now();
    return { n: o.n, bloqueadoHasta: o.hasta, espera: o.hasta > ahora ? Math.ceil((o.hasta - ahora) / 1000) : 0, restantes: Math.max(0, S().intentosPinMax - o.n) };
  }
  async function falloPin(ns) {
    const k = await clave(ns, 'intentos');
    const o = (await leerJSON(k)) || { n: 0, hasta: 0 };
    o.n++;
    if (o.n >= S().intentosPinMax) { o.hasta = Date.now() + S().esperaTrasIntentosSeg * 1000 * Math.min(8, o.n - S().intentosPinMax + 1); }
    await escribirJSON(k, o);
  }
  const limpiarIntentos = async (ns) => almacen.del(await clave(ns, 'intentos'));

  /* ------------------------------------------------------------------- bóveda */
  async function existe(ns) { return !!(await leerJSON(await clave(ns, 'boveda'))); }
  async function longitudPin(ns) { const b = await leerJSON(await clave(ns, 'boveda')); return (b && b.len) || S().pinMin; }

  async function crear(ns, pin) {
    if (!pinValido(pin)) throw new Error('PIN_INVALIDO');
    const raw = azar(32);
    const salt = azar(16), iter = S().pbkdf2Iteraciones;
    const kPin = await claveDePin(pin, salt, iter);
    const boveda = { v: 1, salt: b64(salt), iter, len: String(pin).length, pin: await cifrar(kPin, raw), bio: null };
    await escribirJSON(await clave(ns, 'boveda'), boveda);
    await limpiarIntentos(ns);
    K = await importarAes(raw); Kraw = raw; nsActual = ns;
    return true;
  }

  // Devuelve { ok } o { ok:false, motivo:'espera'|'incorrecto'|'sin_boveda', espera, restantes }
  async function abrirConPin(ns, pin) {
    const b = await leerJSON(await clave(ns, 'boveda'));
    if (!b) return { ok: false, motivo: 'sin_boveda' };
    const est = await estadoIntentos(ns);
    if (est.espera > 0) return { ok: false, motivo: 'espera', espera: est.espera, restantes: 0 };
    try {
      const kPin = await claveDePin(pin, deB64(b.salt), b.iter);
      const raw = await descifrar(kPin, b.pin);
      K = await importarAes(raw); Kraw = raw; nsActual = ns;
      await limpiarIntentos(ns);
      return { ok: true };
    } catch (e) {
      await falloPin(ns);
      const e2 = await estadoIntentos(ns);
      return { ok: false, motivo: e2.espera > 0 ? 'espera' : 'incorrecto', espera: e2.espera, restantes: e2.restantes };
    }
  }

  async function cambiarPin(ns, pinNuevo) {
    if (!K || !Kraw) throw new Error('BLOQUEADA');
    if (!pinValido(pinNuevo)) throw new Error('PIN_INVALIDO');
    const b = await leerJSON(await clave(ns, 'boveda'));
    const salt = azar(16);
    b.salt = b64(salt); b.len = String(pinNuevo).length; b.pin = await cifrar(await claveDePin(pinNuevo, salt, b.iter), Kraw);
    await escribirJSON(await clave(ns, 'boveda'), b);
    return true;
  }

  /* ------------------------------------------------------------------- huella */
  // `secretos` = { guardar(ns, b64) , leer(ns) } ; leer pide la huella. Lo aporta nativo.js.
  async function activarHuella(ns, secretos) {
    if (!K || !Kraw) throw new Error('BLOQUEADA');
    const secreto = azar(32);
    await secretos.guardar(ns, b64(secreto));
    const b = await leerJSON(await clave(ns, 'boveda'));
    b.bio = await cifrar(await importarAes(secreto), Kraw);
    await escribirJSON(await clave(ns, 'boveda'), b);
    return true;
  }
  async function huellaActiva(ns) { const b = await leerJSON(await clave(ns, 'boveda')); return !!(b && b.bio); }
  async function desactivarHuella(ns, secretos) {
    const b = await leerJSON(await clave(ns, 'boveda'));
    if (b) { b.bio = null; await escribirJSON(await clave(ns, 'boveda'), b); }
    try { if (secretos && secretos.borrar) await secretos.borrar(ns); } catch (e) { /* ya no existe */ }
  }
  async function abrirConHuella(ns, secretos) {
    const b = await leerJSON(await clave(ns, 'boveda'));
    if (!b || !b.bio) return { ok: false, motivo: 'sin_huella' };
    try {
      const t = await secretos.leer(ns);               // el teléfono pide la huella aquí
      if (!t) return { ok: false, motivo: 'cancelado' };
      const raw = await descifrar(await importarAes(deB64(t)), b.bio);
      K = await importarAes(raw); Kraw = raw; nsActual = ns;
      return { ok: true };
    } catch (e) { return { ok: false, motivo: 'cancelado' }; }
  }

  /* -------------------------------------------------------------------- datos */
  async function guardarDatos(ns, obj) {
    if (!K) throw new Error('BLOQUEADA');
    const bloque = await cifrar(K, enc.encode(JSON.stringify(obj)));
    await escribirJSON(await clave(ns, 'datos'), { v: 1, ts: Date.now(), bloque });
  }
  async function leerDatos(ns) {
    if (!K) throw new Error('BLOQUEADA');
    const r = await leerJSON(await clave(ns, 'datos'));
    if (!r) return null;
    return JSON.parse(dec.decode(await descifrar(K, r.bloque)));
  }
  async function marcaDatos(ns) { const r = await leerJSON(await clave(ns, 'datos')); return r ? r.ts : null; }

  // Para copia en la nube: todo sale YA cifrado (la nube nunca ve nada legible).
  async function paqueteRespaldo(ns) {
    return { app: 'asistente-financiero', v: 1, ts: Date.now(), boveda: await leerJSON(await clave(ns, 'boveda')), datos: await leerJSON(await clave(ns, 'datos')) };
  }
  async function restaurarPaquete(ns, p) {
    if (!p || p.app !== 'asistente-financiero' || !p.boveda || !p.datos) throw new Error('PAQUETE_INVALIDO');
    await escribirJSON(await clave(ns, 'boveda'), Object.assign({}, p.boveda, { bio: null }));   // la huella es del teléfono: se vuelve a activar
    await escribirJSON(await clave(ns, 'datos'), p.datos);
    bloquear();
  }

  /* ------------------------------------------------------------------ borrados */
  async function borrarCuenta(ns, secretos) {
    bloquear();
    for (const p of ['boveda', 'datos', 'intentos']) await almacen.del(await clave(ns, p));
    try { if (secretos && secretos.borrar) await secretos.borrar(ns); } catch (e) { /* nada que borrar */ }
  }

  /* ------------------------------------------------------------------- sesión */
  const claveSesion = 'af:sesion';
  async function sesion() { return leerJSON(claveSesion); }
  async function guardarSesion(s) { await escribirJSON(claveSesion, s); }
  async function cerrarSesion() { bloquear(); await almacen.del(claveSesion); }
  const espacioDe = (s) => s.proveedor + ':' + s.id;

  /* ---------------------------------------------------- bloqueo por tiempo en segundo plano */
  let ultimaSalida = 0;
  function marcarSalida(ahora) { ultimaSalida = ahora || Date.now(); }
  function debeBloquear(segundos, ahora) {
    if (!K) return true;
    if (!ultimaSalida) return false;
    return ((ahora || Date.now()) - ultimaSalida) / 1000 >= (segundos == null ? S().bloquearTrasSegundos : segundos);
  }
  function marcarEntrada() { ultimaSalida = 0; }

  AF.seguridad = { usarAlmacen, pinValido, pinDebil, existe, longitudPin, crear, abrirConPin, cambiarPin, bloquear, estaAbierta, estadoIntentos,
    activarHuella, huellaActiva, desactivarHuella, abrirConHuella, guardarDatos, leerDatos, marcaDatos, paqueteRespaldo, restaurarPaquete,
    borrarCuenta, sesion, guardarSesion, cerrarSesion, espacioDe, marcarSalida, marcarEntrada, debeBloquear, b64, deB64 };
  if (typeof module === 'object' && module.exports) module.exports = AF.seguridad;
})(typeof window !== 'undefined' ? window : globalThis);
