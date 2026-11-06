/* IA (solo Pro, con tope mensual): el teléfono NUNCA lleva la clave. Habla con un Worker propio que la guarda. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const PLAN = AF.PLAN;
  // Devuelve un resultado con la MISMA forma que AF.parser.interpretar, o null si no pudo (se queda con lo local).
  async function interpretar(texto, ctx) {
    if (!AF.acceso.iaDisponible()) return null;
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), PLAN.ia.tiempoMaxMs);
      const r = await fetch(PLAN.ia.urlWorker.replace(/\/$/, '') + '/interpretar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({ texto, hoy: ctx.hoy, moneda: AF.store.d.ajustes.moneda, pais: AF.store.d.ajustes.pais,
          categorias: ctx.categorias.map((c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo })), tarjetas: ctx.tarjetas.map((x) => ({ id: x.id, nombre: x.nombre })) }),
      });
      clearTimeout(t);
      if (!r.ok) return null;
      const j = await r.json();
      if (!j || !j.tipo) return null;
      AF.acceso.iaUsar();
      return normalizar(j, texto, ctx);
    } catch (e) { return null; }
  }
  // Aunque el Worker responda raro, aquí se valida: solo categorías y montos válidos pasan.
  function normalizar(j, texto, ctx) {
    if (j.tipo !== 'registrar') return Object.assign({ texto }, j);
    const items = (j.items || []).filter((i) => i && Number(i.monto) > 0).map((i) => {
      const cat = ctx.categorias.find((c) => c.id === i.cat && c.tipo === (i.tipo === 'ingreso' ? 'ingreso' : 'gasto')) || ctx.categorias.find((c) => c.id === (i.tipo === 'ingreso' ? 'otros_ingresos' : 'otros'));
      return { tipo: i.tipo === 'ingreso' ? 'ingreso' : 'gasto', monto: AF.util.r2(Number(i.monto)), cat: cat.id, catNombre: cat.nombre, catIcono: cat.icono, catConfianza: i.cat === cat.id ? 'media' : 'ninguna',
        desc: String(i.desc || '').slice(0, 60), fecha: /^\d{4}-\d{2}-\d{2}$/.test(i.fecha || '') ? i.fecha : ctx.hoy, nec: cat.nec || null, palabraNueva: null, cuenta: 'efectivo' };
    });
    if (!items.length) return null;
    return { tipo: 'registrar', items, dudas: items.some((i) => i.catConfianza === 'ninguna') ? ['categoria'] : [], partes: [{ texto, rol: '' }], texto, fecha: items[0].fecha };
  }
  AF.ia = { interpretar };
  if (typeof module === 'object' && module.exports) module.exports = AF.ia;
})(typeof window !== 'undefined' ? window : globalThis);
