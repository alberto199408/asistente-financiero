/* Agregar sin escribir: foto de una factura, mensajes del banco compartidos o pegados, y estados de cuenta.
   Nada se guarda solo: todo cae en «Por revisar» y la persona confirma (o corrige) cada cosa. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, hoja, aviso, campo } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const S = () => AF.store, C = () => V.comun, N = () => AF.nativo, L = () => AF.lector, I = () => AF.informes;
  const $ = (n) => U.dinero(n);
  const ctx = () => ({ hoy: AF.app.hoy(), categorias: S().categorias(), dicc: S().d.diccionario });
  const ORIGEN = { factura: ['🧾', 'Factura'], banco: ['🏦', 'Mensaje del banco'], captura: ['📷', 'Captura'], texto: ['📝', 'Texto'] };
  const diaMes = (iso) => U.deISO(iso).getDate() + ' ' + U.MESES_CORTOS[U.deISO(iso).getMonth()];

  /* ------------------------------------------------------------- a la bandeja */
  // x = salida del lector ({ok, tipo, monto, fecha, desc, cat, items, tarjeta4, duda}) o null si no se entendió nada
  function agregarABandeja(origen, texto, x) {
    const prop = x && x.ok ? { tipo: x.tipo, monto: x.monto, cat: x.cat, desc: x.desc || '', fecha: x.fecha } : null;
    const t4 = x && x.tarjeta4 ? x.tarjeta4 : null;
    const tj = t4 ? S().d.tarjetas.find((t) => t.ultimos4 === t4) : null;
    if (prop && tj && prop.tipo === 'gasto') { prop.cuenta = 'tarjeta'; prop.tarjetaId = tj.id; }
    return S().agregar('bandeja', { origen, texto: String(texto || '').slice(0, 2000), propuesta: prop, items: x && x.items ? x.items : [], dividir: false, tarjeta4: t4, duda: x ? x.duda : ['monto'], hecho: false }, 'Llegó algo a la bandeja');
  }
  const pendientes = () => S().d.bandeja.filter((b) => !b.hecho);
  const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
  // Abre «Por revisar»; si ya estamos ahí solo la redibuja (no apila la misma pantalla dos veces)
  function mostrar() {
    const tope = AF.app.pila[AF.app.pila.length - 1];
    if (tope && tope.titulo === 'Por revisar') AF.app.redibujar(); else AF.app.abrir('Por revisar', (c) => render(c));
  }
  // Ejecuta fn y devuelve un «Deshacer» que revierte exactamente lo que fn anotó en el historial
  function conDeshacer(fn) {
    const antes = S().d.historial.length, r = fn(), k = Math.max(0, S().d.historial.length - antes);
    return { resultado: r, accion: { texto: 'Deshacer', onclick: () => { for (let i = 0; i < k; i++) S().deshacer(); AF.app.redibujar(); } } };
  }

  function movDe(p) {
    const m = { tipo: p.tipo, monto: U.r2(p.monto), cat: p.cat, desc: p.desc || '', fecha: p.fecha, cuenta: p.cuenta || 'efectivo' };
    if (p.tipo === 'gasto') m.nec = S().categoria(p.cat).nec || null;
    if (m.cuenta === 'tarjeta') { m.tarjetaId = p.tarjetaId; m.credito = { modo: 'corriente' }; }
    return m;
  }
  // Productos de una factura, solo si caben dentro del total. Lo que falte (IVA, propina, redondeo) va en una línea aparte
  // para que la suma de las partes sea EXACTAMENTE el total de la factura.
  function partes(it) {
    const p = it.propuesta, xs = it.items || [];
    if (!p || xs.length < 2) return null;
    const suma = U.r2(xs.reduce((s, x) => s + x.monto, 0)), resto = U.r2(p.monto - suma);
    if (resto < -0.005) return null;
    const lista = xs.map((x) => Object.assign({}, p, { monto: x.monto, cat: x.cat, desc: x.desc }));
    if (resto >= 0.01) lista.push(Object.assign({}, p, { monto: resto, desc: p.desc ? p.desc + ' (IVA y otros)' : 'IVA y otros', corto: 'IVA y otros' }));
    return lista;
  }
  function guardarItem(it) {
    const p = it.propuesta; if (!p) return 0;
    const dividida = it.dividir ? partes(it) : null;
    const lista = dividida || [p];
    lista.forEach((q) => S().agregar('movs', movDe(q), 'Guardé desde la bandeja'));
    S().editar('bandeja', it.id, { hecho: true, resultado: 'guardado' }, 'Revisé un pendiente');
    return lista.length;
  }

  /* ------------------------------------------------------------------ pantalla */
  function render(cont) {
    const D = S().d, pend = pendientes();
    cont.appendChild(h('p', { class: 'suave', estilo: { margin: '4px 0 12px' } }, 'Aquí caen las facturas y los mensajes del banco. Tú confirmas antes de que cuenten.'));
    cont.appendChild(h('div', { estilo: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } },
      h('button', { class: 'btn btn-borde', type: 'button', onclick: fotoFactura }, ico('camara', 'chico'), 'Foto'),
      h('button', { class: 'btn btn-borde', type: 'button', onclick: pegarTexto }, ico('papel', 'chico'), 'Pegar texto')));
    if (!pend.length) {
      cont.appendChild(h('div', { class: 'vacio' }, h('strong', null, 'Nada por revisar'),
        'Comparte un mensaje de tu app del banco o de WhatsApp y elige «' + PLAN.app.nombreCorto + '». También puedes sacar una foto a una factura o pegar el texto.'));
    } else {
      cont.appendChild(h('div', { class: 'lista', estilo: { marginTop: '8px' } }, pend.map(tarjetaItem)));
      const validos = pend.filter((x) => x.propuesta);
      if (validos.length >= 2) cont.appendChild(h('div', { estilo: { marginTop: '18px' } }, h('button', { class: 'btn btn-primario btn-bloque', type: 'button', onclick: () => {
        const u = conDeshacer(() => validos.reduce((s, x) => s + guardarItem(x), 0)); aviso(plural(u.resultado, 'movimiento guardado', 'movimientos guardados'), u.accion);
      } }, 'Guardar los ' + validos.length)));
    }
    const hechos = D.bandeja.filter((b) => b.hecho).length;
    if (hechos) cont.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '24px', textAlign: 'center' } }, plural(hechos, 'ya revisado', 'ya revisados')));
  }

  function tarjetaItem(it) {
    const p = it.propuesta, [em, nom] = ORIGEN[it.origen] || ORIGEN.texto;
    const cuerpo = h('div', { class: 'bloque' });
    cuerpo.appendChild(h('div', { class: 'bloque-fila' }, h('div', { class: 'bloque-cab' }, h('div', { class: 'ico ' + (p ? (p.tipo === 'ingreso' ? 'ingreso' : 'gasto') : '') }, p ? S().categoria(p.cat).icono : em),
      h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, p ? (p.desc || S().categoria(p.cat).nombre) : 'No pude leer un monto'),
        h('div', { class: 'fila-sub' }, p ? S().categoria(p.cat).nombre + ' · ' + diaMes(p.fecha) + (p.cuenta === 'tarjeta' ? ' · ' + (S().buscar('tarjetas', p.tarjetaId) || { nombre: 'tarjeta' }).nombre : '') : nom)),
      p ? h('span', { class: 'monto ' + (p.tipo === 'ingreso' ? 'ingreso' : 'gasto') }, (p.tipo === 'ingreso' ? '+' : '−') + $(p.monto)) : null)));
    if (it.duda && it.duda.length && p) cuerpo.appendChild(h('div', { class: 'bloque-nota' }, 'Revisa: ' + it.duda.map((d) => ({ monto: 'el monto', tipo: 'si es gasto o ingreso', fecha: 'la fecha', categoria: 'la categoría' }[d] || d)).join(', ') + '.'));
    if (it.texto) cuerpo.appendChild(h('details', { class: 'bloque-nota' }, h('summary', { estilo: { cursor: 'pointer' } }, 'Ver lo que leí'), h('pre', { estilo: { whiteSpace: 'pre-wrap', margin: '8px 0 0', font: 'inherit', fontSize: '13px' } }, it.texto)));
    const pp = p ? partes(it) : null;
    if (pp) {
      const pro = AF.acceso.tiene('fotoFacturaProductos');
      cuerpo.appendChild(h('button', { class: 'interruptor', type: 'button', role: 'switch', 'aria-checked': it.dividir && pro ? 'true' : 'false', estilo: { width: '100%', textAlign: 'left', minHeight: '56px', borderBottom: 0, paddingBottom: 0 },
        onclick: () => { if (!pro) return C().pedirPro('fotoFacturaProductos'); S().editar('bandeja', it.id, { dividir: !it.dividir }, 'Cambié cómo guardar'); } },
        h('div', { class: 'interruptor-texto' }, h('div', { class: 'fila-titulo', estilo: { whiteSpace: 'normal' } }, 'Dividir por productos (' + pp.length + ')', pro ? null : AF.ui.chipPro()),
          h('div', { class: 'fila-sub', estilo: { whiteSpace: 'normal' } }, pp.slice(0, 3).map((x) => (x.corto || x.desc) + ' ' + $(x.monto)).join(' · ') + (pp.length > 3 ? '…' : ''))), h('span', { class: 'pastilla' })));
    }
    cuerpo.appendChild(h('div', { estilo: { display: 'flex', gap: '8px', marginTop: '12px' } },
      p ? h('button', { class: 'btn btn-primario btn-chico', type: 'button', estilo: { flex: 1 }, onclick: () => { const u = conDeshacer(() => guardarItem(it)); aviso(u.resultado > 1 ? u.resultado + ' movimientos guardados' : 'Guardado', u.accion); } }, 'Guardar') : null,
      h('button', { class: 'btn btn-borde btn-chico', type: 'button', estilo: { flex: p ? 'none' : 1 }, onclick: () => editar(it) }, p ? 'Editar' : 'Escribirlo yo'),
      h('button', { class: 'btn btn-borde btn-chico', type: 'button', 'aria-label': 'Descartar', onclick: () => { S().editar('bandeja', it.id, { hecho: true, resultado: 'descartado' }, 'Descarté un pendiente'); aviso('Descartado', { texto: 'Deshacer', onclick: () => S().deshacer() }); } }, ico('basura', 'chico'))));
    return cuerpo;
  }
  function editar(it) {
    const p = it.propuesta;
    C().formMovimiento({ inicial: p ? Object.assign({}, p) : { tipo: 'gasto', fecha: AF.app.hoy(), desc: '' },
      alGuardar: (m) => { S().agregar('movs', m, 'Guardé desde la bandeja'); S().editar('bandeja', it.id, { hecho: true, resultado: 'guardado' }, 'Revisé un pendiente'); aviso('Guardado'); } });
  }

  /* ---------------------------------------------------- foto de una factura */
  async function elegirArchivo() {
    return AF.app.sinBloqueo(async () => {
      const inp = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'oculto', 'aria-hidden': 'true' });
      g.document.body.appendChild(inp);
      try {
        return await new Promise((res) => {
          const fin = (f) => res(f || null);
          inp.addEventListener('change', () => fin(inp.files && inp.files[0]));
          inp.addEventListener('cancel', () => fin(null));
          setTimeout(() => fin(null), 180000);                         // si nunca contesta, no se queda sin bloqueo para siempre
          inp.click();
        });
      } finally { inp.remove(); }
    });
  }
  async function fotoFactura() {
    const f = await elegirArchivo(); if (!f) return;
    aviso('Leyendo la factura…');
    let texto;
    try { texto = await AF.app.sinBloqueo(() => N().leerTextoDeImagen(f)); }
    catch (e) {
      if (e.codigo === 'solo_app') return pegarTexto('Leer fotos todavía no está disponible en esta versión. Mientras tanto, pega aquí el texto de la factura.');
      return aviso('No pude leer esa foto. Prueba con más luz y la factura bien plana.');
    }
    if (!String(texto).trim()) return aviso('No encontré texto en la foto. Prueba con más luz y la factura bien plana.');
    const x = L().factura(texto, ctx());
    agregarABandeja('factura', texto, x);
    mostrar();
  }

  /* -------------------------------------------------------- pegar un texto */
  function pegarTexto(mensaje) {
    const ta = h('textarea', { class: 'entrada', rows: 6, placeholder: 'Pega aquí el mensaje del banco o el texto de la factura', estilo: { height: '150px', padding: '12px 16px', resize: 'none' }, 'aria-label': 'Texto a leer' });
    const err = h('div', { class: 'ayuda', role: 'alert', estilo: { color: 'var(--gasto)', minHeight: '18px', marginTop: '8px' } });
    hoja({ titulo: 'Pegar un texto', cuerpo: h('div', null, typeof mensaje === 'string' ? h('p', { class: 'suave', estilo: { marginTop: '6px' } }, mensaje) : null, campo('Texto', ta, 'Puede traer varios mensajes: dejo una línea en blanco entre uno y otro.'), err),
      acciones: [{ texto: 'Leer', clase: 'btn-primario', onclick: () => { const n = leerTexto(ta.value, 'texto'); if (!n) { err.textContent = 'No encontré ningún monto en ese texto.'; return false; } mostrar(); } }] });
    setTimeout(() => ta.focus(), 200);
  }
  // Decide si es una factura o mensajes del banco. Devuelve cuántos pendientes creó.
  function leerTexto(texto, origen) {
    const t = String(texto || '').trim(); if (!t) return 0;
    const pareceFactura = /factura|ruc\b|subtotal|iva\b/i.test(U.norm(t));
    const f = pareceFactura ? L().factura(t, ctx()) : null;
    if (f && f.ok) { agregarABandeja(origen === 'captura' ? 'captura' : 'factura', t, f); return 1; }
    const lista = L().bancarioVarios(t, ctx());
    if (lista.length) { lista.forEach((x) => agregarABandeja(origen === 'captura' ? 'captura' : 'banco', x.texto, x)); return lista.length; }
    const f2 = L().factura(t, ctx());
    if (f2.ok) { agregarABandeja(origen === 'captura' ? 'captura' : 'factura', t, f2); return 1; }
    return 0;
  }

  /* ------------------------------------------- lo que llega desde otra app (compartir) */
  function recibir(x) {
    let n = 0, sinLeer = 0;
    (x.textos || []).forEach((t) => { const k = leerTexto(t, 'banco'); if (k) n += k; else { agregarABandeja('texto', t, null); sinLeer++; } });
    if ((x.imagenes || []).length) {
      if (!AF.acceso.tiene('compartirCaptura')) C().pedirPro('compartirCaptura');
      else x.imagenes.forEach((t) => { const k = leerTexto(t, 'captura'); if (k) n += k; else if (String(t).trim()) { agregarABandeja('captura', t, null); sinLeer++; } });
    }
    if (n + sinLeer) { aviso(plural(n + sinLeer, 'cosa por revisar', 'cosas por revisar')); mostrar(); }
  }

  /* ======================================================= estado de cuenta */
  const imp = { texto: '', tarjetaId: '', lineas: null, sel: new Set(), conciliado: null };
  function importar(cont) {
    const D = S().d, pro = AF.acceso.tiene('conciliar');
    cont.appendChild(h('p', { class: 'suave', estilo: { margin: '4px 0 6px' } }, 'Pega el texto de tu estado de cuenta (copiado de la app del banco o de tu PDF). Reviso línea por línea; tú eliges qué agregar.'));
    const zona = h('div');
    const ta = h('textarea', { class: 'entrada', rows: 6, placeholder: 'Fecha   Descripción   Valor\n05/10/2026  SUPERMAXI  45,30\n…', estilo: { height: '150px', padding: '12px 16px', resize: 'none' }, 'aria-label': 'Texto del estado de cuenta', value: imp.texto });
    ta.addEventListener('input', () => { imp.texto = ta.value; });
    const sel = D.tarjetas.length ? h('select', { class: 'entrada', 'aria-label': 'Tarjeta', onchange: (e) => { imp.tarjetaId = e.target.value; if (imp.lineas) { calcular(); pintar(); } } },
      h('option', { value: '' }, 'No es de una tarjeta de crédito'), D.tarjetas.map((t) => h('option', { value: t.id, selected: t.id === imp.tarjetaId }, t.nombre))) : null;
    if (sel) cont.appendChild(campo('¿De qué tarjeta?', sel));
    cont.appendChild(campo('Texto', ta));
    cont.appendChild(h('div', { estilo: { display: 'flex', gap: '10px', marginTop: '12px' } },
      h('button', { class: 'btn btn-primario', type: 'button', estilo: { flex: 1 }, onclick: () => { imp.texto = ta.value; imp.lineas = L().estadoCuenta(imp.texto, ctx()); if (!imp.lineas.length) { aviso('No encontré líneas con fecha y valor'); imp.lineas = null; } calcular(); pintar(); } }, 'Leer'),
      h('button', { class: 'btn btn-borde', type: 'button', 'aria-label': 'Leer desde una foto o captura', onclick: async () => {
        if (!C().requiere('importarPDF')) return;
        const f = await elegirArchivo(); if (!f) return;
        aviso('Leyendo…');
        try { const t = await AF.app.sinBloqueo(() => N().leerTextoDeImagen(f)); imp.texto = t; ta.value = t; imp.lineas = L().estadoCuenta(t, ctx()); if (!imp.lineas.length) { aviso('No encontré líneas con fecha y valor'); imp.lineas = null; } calcular(); pintar(); }
        catch (e) { aviso(e.codigo === 'solo_app' ? 'Leer fotos todavía no está disponible en esta versión' : 'No pude leer esa imagen'); }
      } }, ico('camara', 'chico'), AF.acceso.tiene('importarPDF') ? null : AF.ui.chipPro())));
    cont.appendChild(zona);

    function calcular() {
      imp.sel = new Set(); imp.conciliado = null; if (!imp.lineas) return;
      const gastos = imp.lineas.filter((x) => !x.esPago);
      imp.conciliado = pro ? I().conciliar(D, gastos, imp.tarjetaId || null) : null;
      imp.lineas.forEach((x, i) => {
        const g2 = x.esPago ? null : gastos.indexOf(x), c = imp.conciliado && g2 != null ? imp.conciliado.lineas[g2] : null;
        x.estado = x.esPago ? 'pago' : c ? c.estado : null;
        if (x.esPago ? !!imp.tarjetaId : !c || c.estado === 'falta') imp.sel.add(i);
      });
    }
    function pintar() {
      AF.ui.vaciar(zona);
      if (!imp.lineas) return;
      const c = imp.conciliado;
      zona.appendChild(h('div', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, plural(imp.lineas.length, 'línea', 'líneas') + ' leídas')),
        c ? h('p', { class: 'texto-sm suave' }, (c.ya ? plural(c.ya, 'ya la tienes', 'ya las tienes') + ' · ' : '') + plural(c.faltan, 'falta', 'faltan') + ' en tu registro') : null,
        c ? null : C().gancho('Pro marca cuáles ya tienes registradas para que no las repitas.', 'conciliar'),
        h('div', { class: 'lista', estilo: { marginTop: '8px' } }, imp.lineas.map((x, i) => {
          const bloqueada = x.esPago && !imp.tarjetaId;
          const marca = h('button', { class: 'check', type: 'button', role: 'checkbox', 'aria-checked': imp.sel.has(i) ? 'true' : 'false', 'aria-label': 'Incluir ' + x.desc, disabled: bloqueada, estilo: { opacity: bloqueada ? '.35' : '1' },
            onclick: () => { if (imp.sel.has(i)) imp.sel.delete(i); else imp.sel.add(i); pintar(); } }, ico('ok'));
          return h('div', { class: 'fila' }, marca, h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, x.desc), h('div', { class: 'fila-sub' }, diaMes(x.fecha) + (x.esPago ? ' · pago o abono' : ' · ' + S().categoria(x.cat).nombre))),
            x.estado === 'ya' ? h('span', { class: 'etiqueta-estado ya' }, 'Ya está') : x.estado === 'falta' ? h('span', { class: 'etiqueta-estado falta' }, 'Falta') : x.estado === 'pago' ? h('span', { class: 'etiqueta-estado pago' }, 'Pago') : null,
            h('span', { class: 'monto' }, (x.esPago ? '+' : '−') + $(x.monto)));
        })),
        c && c.sobran.length ? h('div', { class: 'nota', estilo: { marginTop: '14px' } }, ico('info'), h('span', null, 'En tu registro hay ' + plural(c.sobran.length, 'compra', 'compras') + ' de esta tarjeta que el estado no trae: ' + c.sobran.slice(0, 3).map((m) => (m.desc || S().categoria(m.cat).nombre) + ' ' + $(m.monto)).join(', ') + (c.sobran.length > 3 ? '…' : '') + '. Puede ser de otro corte.')) : null,
        h('div', { estilo: { marginTop: '16px' } }, h('button', { class: 'btn btn-primario btn-bloque', type: 'button', disabled: !imp.sel.size, onclick: agregarMarcadas }, imp.sel.size ? 'Agregar ' + plural(imp.sel.size, 'marcada', 'marcadas') : 'Marca lo que quieras agregar'))));
    }
    function agregarMarcadas() {
      let n = 0; const tj = imp.tarjetaId || null;
      Array.from(imp.sel).sort((a, b) => a - b).forEach((i) => {
        const x = imp.lineas[i];
        if (x.esPago) { if (!tj) return; S().agregar('movs', { tipo: 'pago_tarjeta', monto: x.monto, fecha: x.fecha, tarjetaId: tj, cat: null, desc: 'Pago ' + (S().buscar('tarjetas', tj) || { nombre: 'tarjeta' }).nombre }, 'Importé un pago'); n++; return; }
        S().agregar('movs', movDe({ tipo: 'gasto', monto: x.monto, cat: x.cat, desc: x.desc, fecha: x.fecha, cuenta: tj ? 'tarjeta' : 'efectivo', tarjetaId: tj }), 'Importé un movimiento'); n++;
      });
      aviso(plural(n, 'movimiento agregado', 'movimientos agregados'), { texto: 'Deshacer', onclick: () => { for (let i = 0; i < n; i++) S().deshacer(); AF.app.redibujar(); } });
      imp.lineas = null; imp.texto = ''; imp.sel = new Set(); imp.conciliado = null; AF.app.redibujar();
    }
    if (imp.lineas) pintar();
  }

  V.bandeja = { render, importar, fotoFactura, recibir, pegarTexto, leerTexto, agregarABandeja, guardarItem, pendientes, partes };
})(typeof window !== 'undefined' ? window : globalThis);
