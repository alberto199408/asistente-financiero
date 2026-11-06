/* Lector: saca monto, fecha, comercio y tipo de lo que dice una factura (el texto de la foto) o un mensaje del banco.
   Es un lector de reglas, no adivina: lo que no encuentra queda vacío y la persona lo confirma antes de guardar. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const U = AF.util;

  const MESES_N = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MESES_ABR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const blancos = (m) => ' '.repeat(m.length);

  /* ------------------------------------------------------------------ montos */
  // Tapa lo que parece número pero no es plata: fechas, horas, series de factura, RUC, tarjetas, porcentajes.
  function enmascarar(t) {
    return t
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, blancos)
      .replace(/\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/g, blancos)
      .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, blancos)
      .replace(/\b\d{3}-\d{3}-\d{6,9}\b/g, blancos)
      .replace(/\b\d{1,2}\/\d{1,2}\b(?!\d)/g, blancos)                                   // 05/11 o cuota 3/6
      .replace(/(?:terminad[ao]s?\s+en|termina\s+en|tarjeta\s+(?:no\.?|n[°º])?)\s*[*xX•.\s]*\d{3,4}/gi, blancos)
      .replace(/[*xX•]{2,}\s*\d{2,4}/g, blancos)
      .replace(/\b\d{6,}\b/g, blancos)
      .replace(/\d+(?:[.,]\d+)?\s*%/g, blancos);
  }
  // [{ valor, simbolo, pos }] en el orden en que aparecen
  function montosEn(linea) {
    const t = enmascarar(linea), out = [];
    const re = /(\$|US\$|USD\s*)?\s*(-?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|-?\d+(?:[.,]\d{1,2})?)(?:\s*(USD|d[oó]lares))?/gi;
    let m;
    while ((m = re.exec(t))) {
      const crudo = m[2];
      const v = U.parseNumero(crudo);
      if (v == null || v === 0 && !/[.,]/.test(crudo)) continue;
      out.push({ valor: Math.abs(v), negativo: /^-/.test(crudo) || /^\(/.test(t.slice(Math.max(0, m.index - 1), m.index + 1)), simbolo: !!(m[1] || m[3]), decimales: /[.,]\d{1,2}$/.test(crudo), pos: m.index });
    }
    return out;
  }

  /* ------------------------------------------------------------------- fecha */
  function fecha(texto, hoy) {
    hoy = hoy || U.hoyISO();
    const y = Number(hoy.slice(0, 4));
    const valida = (a, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= new Date(a, m, 0).getDate();
    const iso = (a, m, d) => a + '-' + U.pad(m) + '-' + U.pad(d);
    let m = texto.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (m && valida(+m[1], +m[2], +m[3])) return iso(+m[1], +m[2], +m[3]);
    m = texto.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})\b/);
    if (m) {
      let d = +m[1], mo = +m[2]; const a = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      if (mo > 12 && d <= 12) { const t = d; d = mo; mo = t; }
      if (valida(a, mo, d)) return iso(a, mo, d);
    }
    const n = U.norm(texto);
    m = n.match(/\b(\d{1,2})\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.?(?:\s+(?:de(?:l)?\s+)?(\d{4}))?/);
    if (m) {
      const nombre = m[2] === 'setiembre' ? 'septiembre' : m[2];
      let mo = MESES_N.indexOf(nombre) + 1; if (!mo) mo = MESES_ABR.indexOf(nombre) + 1;
      let a = m[3] ? +m[3] : y;
      if (!m[3] && iso(a, mo, +m[1]) > U.sumarDias(hoy, 1)) a -= 1;
      if (valida(a, mo, +m[1])) return iso(a, mo, +m[1]);
    }
    m = texto.match(/\b(\d{1,2})\/(\d{1,2})\b(?!\/)/);                          // 05/11 sin año
    if (m && valida(y, +m[2], +m[1])) { let a = y; if (iso(a, +m[2], +m[1]) > U.sumarDias(hoy, 1)) a -= 1; return iso(a, +m[2], +m[1]); }
    return null;
  }

  // «JUAN PEREZ» → «Juan Perez»; «de», «del», «y»… quedan en minúscula; «s.a.» → «S.A.»
  const MENORES = new Set(['de', 'del', 'y', 'e', 'en', 'a']);
  const nombrePropio = (t) => String(t).toLowerCase().split(/\s+/).filter(Boolean).map((w, i) => (i > 0 && MENORES.has(w) ? w : /^(?:[a-z]\.){2,}$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');

  /* -------------------------------------------------------------------- tipo */
  const RE_INGRESO = /(deposito|depositaron|acredit|recibiste|has recibido|recibida|recibido|transferencia recibida|ingreso a tu cuenta|ingreso a su cuenta|abono a tu cuenta|abono en tu cuenta|nomina|sueldo|reembolso|devolucion|te pagaron|te enviaron|te transfirieron|pago recibido|credito a tu cuenta)/;
  const RE_GASTO = /(compra|consumo|pago|pagaste|debito|retiro|retiraste|cargo|enviaste|transferencia enviada|transferiste|compraste|debitado|debitaron|gastaste|consumiste|se realizo|transaccion)/;
  function tipoDe(texto) {
    const n = U.norm(texto);
    const i = RE_INGRESO.test(n), gg = RE_GASTO.test(n);
    if (i && !/(pago recibido|recibiste|recibida|recibido|deposito|acredit)/.test(n) && gg) return { tipo: 'gasto', duda: true };
    if (i) return { tipo: 'ingreso', duda: false };
    if (gg) return { tipo: 'gasto', duda: false };
    return { tipo: 'gasto', duda: true };
  }

  /* ---------------------------------------------------------------- comercio */
  const NO_COMERCIO = new Set(('banco pichincha pacifico guayaquil produbanco bolivariano internacional austro diners club visa mastercard master amex american express tarjeta usd ' +
    'transaccion notificacion alerta consumo compra pago retiro debito credito cuenta cta ahorros corriente cajero atm ref referencia aprobada autorizacion factura fecha hora ' +
    'estimado cliente le informa informamos se realizo por valor monto de en el la su con ec ecuador').split(' '));
  function comercio(texto) {
    const runs = texto.match(/[A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9&.'*\-]{1,}(?:\s+[A-ZÁÉÍÓÚÑ0-9&][A-ZÁÉÍÓÚÑ0-9&.'*\-]*){0,4}/g) || [];
    for (const r of runs) {
      const toks = r.split(/\s+/).filter((w) => !NO_COMERCIO.has(U.norm(w).replace(/[^a-z0-9]/g, '')) && !/^\d+([.,]\d+)?$/.test(w) && !/^[*x]+\d*$/i.test(w));
      const limpio = toks.join(' ').replace(/[.,;:*]+$/, '').trim();
      if (limpio.length >= 3 && /[A-ZÁÉÍÓÚÑ]{3}/.test(limpio)) return limpio;
    }
    const m = texto.match(/\ben\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9][A-Za-zÁÉÍÓÚÑáéíóúñ0-9 .&'\-]{2,30}?)(?=\s*(?:[.,;]|\bcon\b|\bel\b|\bla\b|\bpor\b|\bfecha\b|\btarjeta\b|$))/);
    return m ? m[1].trim() : '';
  }

  /* ---------------------------------------------------------------- categoría */
  function categoriaDe(texto, tipo, ctx) {
    const base = tipo === 'ingreso' ? 'otros_ingresos' : 'otros';
    if (!AF.parser || !ctx || !ctx.categorias) return { cat: base, conf: 'ninguna' };
    const palabras = U.norm(texto).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const c = AF.parser.clasificar(palabras, palabras.map((_, i) => i), tipo, { categorias: ctx.categorias, dicc: ctx.dicc || {} });
    return c.cat ? { cat: c.cat.id, conf: c.aprendido || c.score >= 2 ? 'alta' : 'media' } : { cat: base, conf: 'ninguna' };
  }

  /* ------------------------------------------------------------------ mensaje del banco */
  // Un mensaje (SMS, correo copiado, texto compartido). Devuelve { ok, tipo, monto, fecha, desc, cat, catConfianza, tarjeta4, duda:[] }
  function bancario(texto, ctx) {
    ctx = ctx || {};
    const hoy = ctx.hoy || U.hoyISO();
    const t = String(texto || '').replace(/\s+/g, ' ').trim();
    const ms = montosEn(t);
    const elegido = ms.find((x) => x.simbolo) || ms.find((x) => x.decimales) || null;
    const tp = tipoDe(t);
    const desc = comercio(t);
    const c = categoriaDe(desc || t, tp.tipo, ctx);
    const f = fecha(t, hoy);
    const t4 = (t.match(/(?:terminad[ao]s?\s+en|termina\s+en|tarjeta[^\d]{0,16}|[*xX•]{2,})\s*(\d{4})\b/i) || [])[1] || null;
    const duda = [];
    if (!elegido) duda.push('monto');
    if (tp.duda) duda.push('tipo');
    if (!f) duda.push('fecha');
    if (c.conf === 'ninguna') duda.push('categoria');
    return { ok: !!elegido, tipo: tp.tipo, monto: elegido ? U.r2(elegido.valor) : null, fecha: f || hoy, desc: desc ? nombrePropio(desc) : '', cat: c.cat, catConfianza: c.conf, tarjeta4: t4, duda };
  }
  // Un texto con varios mensajes (separados por línea en blanco) o varias líneas con fecha y monto.
  function bancarioVarios(texto, ctx) {
    const t = String(texto || '').trim();
    if (!t) return [];
    let trozos = t.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    if (trozos.length === 1) {
      const lineas = t.split(/\n/).map((x) => x.trim()).filter(Boolean);
      const conPlata = lineas.filter((l) => montosEn(l).length && fecha(l, (ctx && ctx.hoy) || U.hoyISO()));
      if (conPlata.length >= 2) trozos = conPlata;
    }
    return trozos.map((x) => Object.assign(bancario(x, ctx), { texto: x })).filter((x) => x.ok);
  }

  /* --------------------------------------------------------------------- factura */
  const ETIQUETAS = /(total|subtotal|sub total|iva|descuento|propina|efectivo|cambio|tarjeta|forma de pago|ice|base imponible|servicio|recibido|vuelto|saldo|cantidad|descripcion|precio|valor|p\.?\s*unit|cant)\b/;
  function factura(texto, ctx) {
    ctx = ctx || {};
    const hoy = ctx.hoy || U.hoyISO();
    const lineas = String(texto || '').split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const normales = lineas.map((l) => U.norm(l));
    const duda = [];

    /* total: la última línea que dice «total» (sin ser subtotal ni descuento) */
    let monto = null;
    for (let i = 0; i < lineas.length; i++) {
      const n = normales[i];
      if (!/^\W*(importe\s+)?(valor\s+)?(total|a pagar)(\s+a\s+pagar|\s+factura|\s+general|\s+usd)?\b/.test(n)) continue;
      if (/sub\s*total|descuento|sin\s+iva|sin\s+impuestos|total\s+iva|total\s+ice/.test(n)) continue;
      let ms = montosEn(lineas[i]);
      for (let k = 1; !ms.length && k <= 2 && i + k < lineas.length; k++) { const s = montosEn(lineas[i + k]); if (s.length && !/[a-z]{3}/.test(normales[i + k])) ms = s; }
      if (ms.length) monto = ms[ms.length - 1].valor;
    }
    if (monto == null) {
      const todos = [].concat(...lineas.map((l) => montosEn(l).filter((x) => x.decimales))).map((x) => x.valor);
      if (todos.length) { monto = Math.max.apply(null, todos); duda.push('monto'); }
    }

    /* fecha */
    const f = fecha(String(texto || ''), hoy);
    if (!f) duda.push('fecha');

    /* comercio: la primera línea que parece un nombre */
    let nombre = '';
    for (let i = 0; i < Math.min(lineas.length, 8); i++) {
      const l = lineas[i], n = normales[i];
      if (/factura|ruc|autorizacion|fecha|cliente|direccion|telefono|nota de venta|obligado|contribuyente|sucursal|matriz|r\.u\.c|ambiente|emision/.test(n)) continue;
      if (!/[a-z]{3}/.test(n) || /^\W*\d/.test(l)) continue;
      nombre = l.replace(/[^\wÁÉÍÓÚÑáéíóúñ&.' -]/g, '').trim(); break;
    }
    const ruc = (String(texto || '').match(/\b(\d{10}001)\b/) || [])[1] || null;

    /* productos: «cant descripción p.unit total» o «descripción total» */
    const items = [];
    lineas.forEach((l, i) => {
      const n = normales[i];
      let m = l.match(/^(\d+(?:[.,]\d+)?)\s+(.{3,}?)\s+\$?\s*(\d+[.,]\d{2,4})\s+\$?\s*(\d+[.,]\d{2})$/);
      if (m && !ETIQUETAS.test(U.norm(m[2]))) { items.push({ desc: m[2].trim(), monto: U.parseNumero(m[4]) }); return; }
      m = l.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ][^\d$]{2,40}?)\s+\$?\s*(\d+[.,]\d{2})$/);
      if (m && !ETIQUETAS.test(n)) items.push({ desc: m[1].trim(), monto: U.parseNumero(m[2]) });
    });
    const sumaItems = U.r2(items.reduce((s, x) => s + x.monto, 0));
    const itemsFiables = items.length >= 2 && monto != null && sumaItems > 0 && sumaItems <= monto * 1.2 + 0.01;   // si no cuadran con el total, no se ofrecen

    const base = categoriaDe(nombre, 'gasto', ctx);
    return { ok: monto != null && monto > 0, tipo: 'gasto', monto: monto != null ? U.r2(monto) : null, fecha: f || hoy, desc: nombre ? nombrePropio(nombre) : '', cat: base.cat, catConfianza: base.conf, ruc,
      items: itemsFiables ? items.map((x) => Object.assign(x, categoriaPorItem(x.desc, ctx))) : [], duda };
  }
  function categoriaPorItem(desc, ctx) { const c = categoriaDe(desc, 'gasto', ctx); return { cat: c.cat, catConfianza: c.conf }; }

  /* -------------------------------------------------------------- estado de cuenta */
  // Texto copiado de un estado de cuenta: líneas «fecha  descripción  valor». Los pagos y abonos se marcan aparte.
  function estadoCuenta(texto, ctx) {
    ctx = ctx || {};
    const hoy = ctx.hoy || U.hoyISO();
    const out = [];
    String(texto || '').split(/\r?\n/).forEach((crudo) => {
      const l = crudo.replace(/\s+/g, ' ').trim();
      if (!l) return;
      const f = fecha(l, hoy);
      if (!f) return;
      const ms = montosEn(l);
      if (!ms.length) return;
      const m = ms[ms.length >= 2 && /saldo/.test(U.norm(l)) ? ms.length - 2 : ms.length - 1];
      const n = U.norm(l);
      const esPago = m.negativo || /\b(pago|abono|cancelacion|payment|reverso|devolucion|credito a favor)\b/.test(n) || /\bcr\b$/.test(n);
      let desc = l.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ').replace(/\b\d{1,2}[/\-.]\d{1,2}(?:[/\-.]\d{2,4})?\b/g, ' ')
        .replace(/\b(\d{1,2})\s+(?:de\s+)?(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\.?(?:\s+\d{4})?/gi, ' ')
        .replace(/[$]?\s*-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\b/g, ' ').replace(/\s+/g, ' ').trim();
      if (!desc) desc = 'Movimiento';
      const c = categoriaDe(desc, 'gasto', ctx);
      out.push({ fecha: f, desc: nombrePropio(desc), monto: U.r2(m.valor), esPago, cat: c.cat, catConfianza: c.conf });
    });
    return out;
  }

  AF.lector = { montosEn, fecha, tipoDe, comercio, bancario, bancarioVarios, factura, estadoCuenta, enmascarar };
  if (typeof module === 'object' && module.exports) module.exports = AF.lector;
})(typeof window !== 'undefined' ? window : globalThis);
