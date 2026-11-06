/* Almacén de datos: todo vive en el teléfono. Cada cambio queda en el historial y se puede deshacer. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const U = AF.util, PLAN = AF.PLAN;

  /* ---------------------------------------------------------------- Eventos */
  const oyentes = {};
  const bus = {
    on(ev, fn) { (oyentes[ev] = oyentes[ev] || []).push(fn); return () => { oyentes[ev] = oyentes[ev].filter((f) => f !== fn); }; },
    emit(ev, x) { (oyentes[ev] || []).slice().forEach((f) => { try { f(x); } catch (e) { if (g.console) console.error(e); } }); },
  };

  /* ------------------------------------------------------------------ Datos */
  const COLECCIONES = ['movs', 'tarjetas', 'pagosFijos', 'metas', 'prestamos', 'presupuestos', 'retos', 'bandeja', 'categorias', 'viajes', 'grupo'];
  function vacio() {
    const p = PLAN.pais(PLAN.app.paisInicial);
    const o = {
      v: 1, creado: new Date().toISOString(),
      ajustes: { nombre: '', pais: p.codigo, moneda: p.moneda, diaCobro: PLAN.bienvenida.diaCobroDefecto, sueldo: null, cargas: 0,
        tema: 'claro', colorApp: 'marino', respuestaVoz: true, bloqueoSeg: PLAN.sesion.bloquearTrasSegundos, bienvenidaHecha: false },
      plan: { inicioPrueba: null, proHasta: null, ia: {} },
      diccionario: {}, historial: [],
    };
    COLECCIONES.forEach((c) => { o[c] = []; });
    return o;
  }

  let d = vacio();
  let adaptador = null;     // { escribir(obj): Promise }
  let tGuardar = null;

  function guardarYa() {
    clearTimeout(tGuardar); tGuardar = null;
    if (adaptador && adaptador.escribir) return Promise.resolve(adaptador.escribir(d));
    return Promise.resolve();
  }
  function guardar() { clearTimeout(tGuardar); tGuardar = setTimeout(guardarYa, 250); }

  function cargar(obj, ad) {
    d = obj ? Object.assign(vacio(), obj) : vacio();
    d.ajustes = Object.assign(vacio().ajustes, d.ajustes || {});
    d.plan = Object.assign(vacio().plan, d.plan || {});
    COLECCIONES.forEach((c) => { if (!Array.isArray(d[c])) d[c] = []; });
    if (!d.diccionario) d.diccionario = {};
    if (!Array.isArray(d.historial)) d.historial = [];
    adaptador = ad || null;
    bus.emit('cargado');
    return d;
  }

  /* -------------------------------------------------------------- Historial */
  function anotar(col, op, ref, antes, despues, nota) {
    d.historial.push({ id: U.uid(), ts: Date.now(), col, op, ref, antes: antes || null, despues: despues || null, nota: nota || '', deshecho: false });
    const max = PLAN.historial.maxEntradas;
    if (d.historial.length > max) d.historial.splice(0, d.historial.length - max);
  }
  const copia = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));

  function agregar(col, obj, nota) {
    const o = Object.assign({ id: U.uid(), creado: Date.now() }, copia(obj));
    d[col].push(o);
    anotar(col, 'add', o.id, null, copia(o), nota);
    guardar(); bus.emit('cambio', { col, op: 'add', id: o.id });
    return o;
  }
  function editar(col, id, patch, nota) {
    const o = d[col].find((x) => x.id === id);
    if (!o) return null;
    const antes = copia(o);
    Object.assign(o, copia(patch), { editado: Date.now() });
    anotar(col, 'upd', id, antes, copia(o), nota);
    guardar(); bus.emit('cambio', { col, op: 'upd', id });
    return o;
  }
  function borrar(col, id, nota) {
    const i = d[col].findIndex((x) => x.id === id);
    if (i < 0) return false;
    const [o] = d[col].splice(i, 1);
    anotar(col, 'del', id, copia(o), null, nota);
    guardar(); bus.emit('cambio', { col, op: 'del', id });
    return true;
  }
  function buscar(col, id) { return d[col].find((x) => x.id === id) || null; }

  // Deshace el último cambio que aún no se haya deshecho. Devuelve su nota (o null si no hay nada).
  function deshacer() {
    for (let i = d.historial.length - 1; i >= 0; i--) {
      const h = d.historial[i];
      if (h.deshecho) continue;
      const lista = d[h.col];
      if (h.op === 'add') { const k = lista.findIndex((x) => x.id === h.ref); if (k >= 0) lista.splice(k, 1); }
      else if (h.op === 'upd') { const k = lista.findIndex((x) => x.id === h.ref); if (k >= 0) lista[k] = copia(h.antes); else lista.push(copia(h.antes)); }
      else if (h.op === 'del') { if (!lista.some((x) => x.id === h.ref)) lista.push(copia(h.antes)); }
      h.deshecho = true;
      guardar(); bus.emit('cambio', { col: h.col, op: 'deshacer', id: h.ref });
      return h.nota || 'Cambio deshecho';
    }
    return null;
  }
  const puedeDeshacer = () => d.historial.some((h) => !h.deshecho);

  /* ---------------------------------------------------------------- Ajustes */
  function ajustar(patch) { Object.assign(d.ajustes, patch); guardar(); bus.emit('ajustes'); return d.ajustes; }
  function aprender(palabra, catId) {
    const k = U.norm(palabra).trim();
    if (!k || !catId) return;
    d.diccionario[k] = catId; guardar();
  }
  function olvidarAprendido(palabra) { delete d.diccionario[U.norm(palabra).trim()]; guardar(); }

  /* -------------------------------------------------------------- Categorías */
  // Las de fábrica salen de PLAN; las propias (Pro) viven en los datos.
  const categorias = (tipo) => PLAN.categorias.concat(d.categorias).filter((c) => !tipo || c.tipo === tipo);
  const categoria = (id) => categorias().find((c) => c.id === id) || PLAN.categoria('otros');

  /* ----------------------------------------------------------- Movimientos */
  const movs = () => d.movs;
  function movsEntre(desde, hasta, filtro) {
    return d.movs.filter((m) => m.fecha >= desde && m.fecha <= hasta && (!filtro || filtro(m)));
  }
  function ultimoMov(tipo) {
    return d.movs.filter((m) => !tipo || m.tipo === tipo).sort((a, b) => (b.fecha === a.fecha ? b.creado - a.creado : b.fecha < a.fecha ? -1 : 1))[0] || null;
  }

  /* ------------------------------------------------------------ Respaldo */
  const exportar = () => JSON.parse(JSON.stringify(d));
  function reemplazarTodo(obj) { cargar(obj, adaptador); guardarYa(); }
  function borrarTodo() { cargar(null, adaptador); return guardarYa(); }

  AF.bus = bus;
  AF.store = { bus, vacio, cargar, datos: () => d, get d() { return d; }, guardar, guardarYa, agregar, editar, borrar, buscar, deshacer, puedeDeshacer,
    ajustar, aprender, olvidarAprendido, categorias, categoria, movs, movsEntre, ultimoMov, exportar, reemplazarTodo, borrarTodo, COLECCIONES };
  if (typeof module === 'object' && module.exports) module.exports = AF.store;
})(typeof window !== 'undefined' ? window : globalThis);
