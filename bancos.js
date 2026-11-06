/* Bancos y costos de tarjetas: busca en el catálogo (bancos-datos.js), calcula el costo de un avance y convierte tasas.
   REGLA: aquí no se escribe ninguna cifra de un banco. Todo sale del catálogo, con su fuente y vigencia, o queda "sin dato". */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const base = () => AF.CATALOGO_BANCOS || (typeof require === 'function' ? require('./bancos-datos.js') : { bancos: [], techoLegal: {} });
  const r2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;
  const PLANT = () => (AF.PLAN && AF.PLAN.tarjetas) || {};

  let activo = null;                        // catálogo mezclado con el remoto (si lo hay)
  const catalogo = () => activo || base();

  /* ----------------------------------------------------------------- consulta */
  const lista = (pais) => catalogo().bancos.filter((b) => b.pais === pais);
  const buscar = (id) => (id ? catalogo().bancos.find((b) => b.id === id) || null : null);
  const tieneCostos = (b) => !!(b && b.costos && Object.keys(b.costos).length);

  // "Banco Pichincha" → "Pi"; "Diners Club" → "DC"; "BCP" → "BC"
  function iniciales(texto) {
    const p = String(texto || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    if (p.length === 1) return p[0].slice(0, 2).replace(/^./, (c) => c.toUpperCase());
    return (p[0][0] + p[1][0]).toUpperCase();
  }

  const redesDe = (b) => (b && b.redes && b.redes.length ? b.redes : PLANT().redes || []);
  const nivelesDe = (b) => (b && b.niveles && b.niveles.length ? b.niveles : PLANT().niveles || []);

  /* -------------------------------------------------------------------- tasas */
  // Los bancos publican la tasa EFECTIVA anual; la app calcula con la NOMINAL (cuota = tasa/12).
  const efectivaANominal = (ef) => r2(12 * (Math.pow(1 + ef / 100, 1 / 12) - 1) * 100);
  const nominalAEfectiva = (nom) => r2((Math.pow(1 + nom / 100 / 12, 12) - 1) * 100);

  // Qué tasa se le puede ofrecer a la persona como punto de partida (nunca se guarda sola).
  function tasaSugerida(b, pais) {
    if (b && b.tasaPublicada) {
      const t = b.tasaPublicada;
      const nominal = t.nominalAnual != null ? t.nominalAnual : efectivaANominal(t.efectivaAnual);
      return { nominal, efectiva: t.efectivaAnual, delBanco: true, aplicaA: t.aplicaA || '', vigencia: b.fuente && b.fuente.vigencia, fuente: b.fuente && b.fuente.texto };
    }
    const tl = catalogo().techoLegal && catalogo().techoLegal[pais];
    if (tl) return { nominal: efectivaANominal(tl.efectivaAnual), efectiva: tl.efectivaAnual, delBanco: false, aplicaA: tl.etiqueta, vigencia: tl.vigencia, fuente: tl.fuente };
    return null;
  }

  /* ------------------------------------------------------------------- avance */
  // Costo (con IVA) de sacar `monto` en efectivo con la tarjeta, o null si el banco no publicó cómo se calcula.
  // `canal`: sin indicar = la tabla principal (cajero); 'otros' (o un número) = otra tabla que el banco publicó (oficina, banca virtual, corresponsal…).
  // `otrosCanales` puede ser una tabla o una lista de tablas.
  const otrasTablas = (a) => (!a || !a.otrosCanales ? [] : Array.isArray(a.otrosCanales) ? a.otrosCanales : [a.otrosCanales]);
  function costoAvance(b, monto, canal) {
    let a = b && b.avance; const m = Number(monto);
    if (a && canal != null) a = otrasTablas(a)[canal === 'otros' ? 0 : Number(canal)] || null;
    if (!a || !(m > 0)) return null;
    // `maxUsd`: hasta qué monto el banco publicó la tabla (más allá no se inventa un valor).
    if (a.maxUsd != null && m > a.maxUsd) return null;
    if (a.tipo === 'porCada100') {
      const tramos = Math.ceil(m / 100);
      const tope = a.topeBaseUsd != null ? a.topeBaseUsd : Infinity;
      return r2(Math.min(tramos * a.baseUsd, tope) * (1 + (a.ivaPct || 0) / 100));
    }
    if (a.escalones) {
      let v = null;
      for (const [desde, valor] of a.escalones) { if (m >= desde) v = valor; else break; }
      return v;
    }
    return null;
  }
  // Todas las formas de sacar el avance que el banco publicó: [{ etiqueta, valor }] (o { etiqueta, texto } si el monto pasa de lo publicado).
  function costosAvance(b, monto) {
    const a = b && b.avance; if (!a) return [];
    const out = [], m = Number(monto), otras = otrasTablas(a);
    // Si el monto pasa de lo que el banco publicó para ese canal, se muestra su aviso (texto del propio banco) en vez de un valor inventado.
    const aviso = (t) => (t && t.maxUsd != null && m > t.maxUsd && t.aviso ? t.aviso : null);
    const v1 = costoAvance(b, monto), l1 = otras.length ? (a.etiqueta || 'Cajero automático') : 'Comisión';
    if (v1 != null) out.push({ etiqueta: l1, valor: v1 }); else if (aviso(a)) out.push({ etiqueta: l1, texto: aviso(a) });
    otras.forEach((t, i) => {
      const v = costoAvance(b, monto, i);
      if (v != null) out.push({ etiqueta: t.etiqueta, valor: v }); else if (aviso(t)) out.push({ etiqueta: t.etiqueta, texto: aviso(t) });
    });
    return out;
  }

  /* -------------------------------------------------------------------- filas */
  // Lo que se le muestra a la persona en «Costos de tu tarjeta»: el orden y los nombres salen de PLAN.tarjetas.costos.
  // `propios` = lo que la persona anotó ella misma ({ clave: { texto, fecha } }); manda sobre el catálogo.
  function filas(b, nivel, propios) {
    const defs = PLANT().costos || [];
    const cat = (b && b.costos) || {};
    const porNivel = b && b.recompensasPorNivel && nivel ? b.recompensasPorNivel[nivel] : null;
    const fu = b && b.fuente ? { texto: b.fuente.texto, vigencia: b.fuente.vigencia, url: b.fuente.url } : null;
    return defs.map((d) => {
      let v = cat[d.clave] || null;
      if (d.clave === 'recompensas' && porNivel) v = { texto: porNivel, nota: 'Según el segmento de tu tarjeta en el tarifario.' };
      const p = propios && propios[d.clave];
      if (p && p.texto) return { clave: d.clave, etiqueta: d.etiqueta, icono: d.icono, texto: p.texto, nota: 'Lo anotaste tú' + (p.fecha ? ' el ' + p.fecha : '') + '.', propio: true, fuente: null };
      return { clave: d.clave, etiqueta: d.etiqueta, icono: d.icono, texto: v ? v.texto : null, nota: v ? v.nota || '' : '', propio: false, fuente: v ? fu : null };
    });
  }

  /* ----------------------------------------------------------- catálogo remoto */
  // Un archivo remoto solo se acepta si tiene la forma esperada; cada banco reemplaza al local con el mismo id.
  function validar(j) {
    if (!j || typeof j !== 'object' || typeof j.version !== 'number' || !Array.isArray(j.bancos)) return false;
    return j.bancos.every((b) => b && typeof b.id === 'string' && typeof b.pais === 'string' && typeof b.nombre === 'string' && b.id.length < 60 && b.nombre.length < 80);
  }
  function fusionar(remoto) {
    if (!validar(remoto)) return false;
    const b0 = base();
    const mapa = new Map(b0.bancos.map((b) => [b.id, b]));
    remoto.bancos.forEach((b) => mapa.set(b.id, b));
    activo = { version: remoto.version, actualizado: remoto.actualizado || b0.actualizado, techoLegal: Object.assign({}, b0.techoLegal, remoto.techoLegal || {}), bancos: Array.from(mapa.values()) };
    return true;
  }
  const CLAVE_CACHE = 'af.catalogo.remoto';
  function cargarCache() {
    try { const t = g.localStorage && g.localStorage.getItem(CLAVE_CACHE); if (t) return fusionar(JSON.parse(t)); } catch (e) { /* sin caché */ }
    return false;
  }
  // Se llama al abrir la app. Si PLAN.remoto.urlTarifas está vacío no hace nada. Falla en silencio: la app sigue con lo que trae.
  async function actualizarRemoto() {
    const R = AF.PLAN && AF.PLAN.remoto;
    if (!R || !R.urlTarifas || typeof fetch !== 'function') return { usado: false };
    try {
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      const t = ctl ? setTimeout(() => ctl.abort(), 8000) : null;
      const resp = await fetch(R.urlTarifas, { cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (t) clearTimeout(t);
      if (!resp.ok) return { usado: false };
      const j = await resp.json();
      if (!fusionar(j)) return { usado: false };
      try { g.localStorage && g.localStorage.setItem(CLAVE_CACHE, JSON.stringify(j)); } catch (e) { /* sin caché */ }
      return { usado: true, version: j.version };
    } catch (e) { return { usado: false }; }
  }

  AF.bancos = { catalogo, lista, buscar, tieneCostos, iniciales, redesDe, nivelesDe, efectivaANominal, nominalAEfectiva, tasaSugerida, costoAvance, costosAvance, filas, validar, fusionar, cargarCache, actualizarRemoto };
  if (typeof module === 'object' && module.exports) module.exports = AF.bancos;
})(typeof window !== 'undefined' ? window : globalThis);
