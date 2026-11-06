/* Tu plata: límites de gasto, metas de ahorro, pagos fijos, préstamos entre personas, suscripciones y el reto sin gastos hormiga. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, hoja, aviso, campo } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const S = () => AF.store, C = () => V.comun, I = () => AF.informes, N = () => AF.nativo;
  const $ = (n) => U.dinero(n);
  const num = (el) => U.parseNumero(el.value);
  const diaMes = (iso) => U.deISO(iso).getDate() + ' de ' + U.nombreMes(iso);
  const diaMesC = (iso) => U.deISO(iso).getDate() + ' ' + U.MESES_CORTOS[U.deISO(iso).getMonth()];
  const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);

  /* ------------------------------------------------------------------- piezas */
  const boton = (texto, clase, fn) => h('button', { class: 'btn ' + clase, type: 'button', onclick: fn }, texto);
  const masBtn = (etq, fn) => ({ derecha: h('button', { class: 'boton-icono', type: 'button', 'aria-label': etq, onclick: fn }, ico('mas_')) });
  const intro = (t) => h('p', { class: 'suave', estilo: { margin: '4px 0 8px' } }, t);
  const vacio = (titulo, texto, textoBtn, fn) => h('div', { class: 'vacio' }, h('strong', null, titulo), texto, textoBtn ? h('div', { estilo: { marginTop: '16px' } }, boton(textoBtn, 'btn-primario', fn)) : null);
  const progreso = (pct, nivel) => h('div', { class: 'progreso ' + (nivel || ''), role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(Math.max(0, Math.min(1, pct)) * 100) },
    h('i', { estilo: { width: Math.max(0, Math.min(1, pct)) * 100 + '%' } }));
  const seccion = (titulo, hijos, extra) => h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, titulo), extra || null), hijos);
  // Un renglón con icono, textos, algo a la derecha, una barra de avance opcional y una nota. accion = botón aparte (no anidar botones).
  function bloque(o) {
    const principal = h(o.onclick ? 'button' : 'div', { class: 'bloque-cab' + (o.onclick ? ' fila-boton' : ''), type: o.onclick ? 'button' : null, onclick: o.onclick },
      h('div', { class: 'ico ' + (o.tono || '') }, o.icono),
      h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, o.titulo), o.sub ? h('div', { class: 'fila-sub' }, o.sub) : null),
      o.derecha || null);
    return h('div', { class: 'bloque' }, h('div', { class: 'bloque-fila' }, principal, o.accion || null),
      o.progreso != null ? progreso(o.progreso, o.nivel) : null, o.nota ? h('div', { class: 'bloque-nota' }, o.nota) : null);
  }
  const entradaMonto = (valor, ph, etq) => h('input', { class: 'entrada grande', inputmode: 'decimal', placeholder: ph || '0', value: valor == null || valor === '' ? '' : String(valor).replace('.', ','), 'aria-label': etq || 'Monto' });
  const errorEl = () => h('div', { class: 'ayuda', role: 'alert', estilo: { color: 'var(--gasto)', minHeight: '18px', marginTop: '8px' } });
  const eliminar = async (col, id, titulo, texto, nota) => {
    if (!(await C().confirmar({ titulo, texto, si: 'Eliminar', peligro: true }))) return false;
    S().borrar(col, id, nota); aviso('Eliminado', { texto: 'Deshacer', onclick: () => S().deshacer() }); return true;
  };
  const cierra = (api, fn) => { api.cerrar(); if (fn) fn(); return false; };      // cierra esta hoja y luego hace algo (p. ej. abrir otra)

  /* ======================================================================= LÍMITES DE GASTO */
  function presupuestos(cont) {
    const D = S().d, hoy = AF.app.hoy();
    const lista = I().presupuestos(D, hoy);
    cont.appendChild(intro('Pon cuánto quieres gastar al mes. Te aviso al llegar al 80 % y cuando lo alcances.'));
    if (!lista.length) cont.appendChild(vacio('Aún no tienes límites', 'Pon un tope general o por categoría y mira cuánto llevas.', 'Poner un límite', () => formPresupuesto(null)));
    else cont.appendChild(h('div', { class: 'lista' }, lista.map((p) => bloque({
      icono: p.cat ? S().categoria(p.cat).icono : '🎯', titulo: p.nombre, sub: $(p.gastado) + ' de ' + $(p.monto) + ' este mes',
      derecha: h('span', { class: 'monto' }, Math.round(p.pct * 100) + ' %'), progreso: p.pct, nivel: p.nivel === 'detente' ? 'alto' : p.nivel === 'aviso' ? 'aviso' : '',
      nota: p.queda >= 0 ? 'Te quedan ' + $(p.queda) : 'Te pasaste ' + $(-p.queda), onclick: () => formPresupuesto(p),
    }))));
    return masBtn('Agregar límite', () => formPresupuesto(null));
  }
  function formPresupuesto(p) {
    const D = S().d, edit = !!p;
    if (!edit && !AF.acceso.puedeAgregar('presupuestos', D.presupuestos.length)) return C().pedirLimite('presupuestos', 'límite de gasto', 'límites de gasto');
    const e = { cat: edit ? p.cat || null : null };
    const monto = entradaMonto(edit ? p.monto : '', '0', 'Límite al mes'), err = errorEl(), zonaCat = h('div');
    const usadas = new Set(D.presupuestos.filter((x) => !edit || x.id !== p.id).map((x) => x.cat || null));
    const pintar = () => {
      AF.ui.vaciar(zonaCat);
      if (edit) { zonaCat.appendChild(campo('En', h('div', { class: 'opciones' }, h('span', { class: 'opcion activa' }, (e.cat ? S().categoria(e.cat).icono + ' ' + S().categoria(e.cat).nombre : '🎯 Todos los gastos'))))); return; }
      const pro = AF.acceso.tiene('presupuestoPorCategoria');
      const ops = [{ id: null, t: '🎯 Todos los gastos' }].concat(S().categorias('gasto').map((c) => ({ id: c.id, t: c.icono + ' ' + c.nombre }))).filter((o) => !usadas.has(o.id));
      zonaCat.appendChild(campo('¿En qué?', h('div', { class: 'opciones' }, ops.map((o) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': e.cat === o.id ? 'true' : 'false',
        onclick: () => { if (o.id && !pro) { cierraYPide(); return; } e.cat = o.id; pintar(); } }, o.t, o.id && !pro ? AF.ui.chipPro() : null)))));
    };
    let api;
    const cierraYPide = () => { api.cerrar(); C().pedirPro('presupuestoPorCategoria'); };
    pintar();
    api = hoja({ titulo: edit ? 'Editar límite' : 'Nuevo límite', cuerpo: h('div', null, zonaCat, campo('Límite al mes', monto), err),
      acciones: (edit ? [{ texto: 'Eliminar', clase: 'btn-borde btn-peligro', onclick: (a) => cierra(a, () => eliminar('presupuestos', p.id, '¿Eliminar este límite?', 'Dejas de ver cuánto llevas, pero no se borra ningún gasto.', 'Quité un límite')) }] : [])
        .concat([{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
          const v = num(monto); if (!(v > 0)) { err.textContent = 'Escribe un monto mayor que cero.'; monto.focus(); return false; }
          if (edit) S().editar('presupuestos', p.id, { monto: U.r2(v) }, 'Cambié un límite'); else S().agregar('presupuestos', { cat: e.cat, monto: U.r2(v), periodo: 'mes' }, 'Puse un límite');
          aviso('Límite guardado');
        } }]) });
    setTimeout(() => monto.focus(), 200);
  }

  /* ======================================================================= METAS DE AHORRO */
  const ICONOS_META = ['🏝️', '🏠', '🚗', '🎓', '💻', '📱', '💍', '🛟', '🎁', '🏁'];
  const ahorrado = (m) => U.r2((m.aportes || []).reduce((s, a) => s + a.monto, 0));
  function ritmoMeta(m, hoy) {
    const falta = U.r2(Math.max(0, m.objetivo - ahorrado(m)));
    if (falta === 0) return '¡Meta lograda!';
    if (m.aporteMensual > 0) { const n = Math.ceil(falta / m.aporteMensual), f = U.sumarMeses(hoy, n); return 'Con ' + $(m.aporteMensual) + ' al mes llegas en ' + plural(n, 'mes', 'meses') + ' (' + U.nombreMes(f) + ' de ' + f.slice(0, 4) + ').'; }
    if (m.fechaMeta && m.fechaMeta > hoy) {
      const meses = Math.max(1, Math.round(U.diasEntre(hoy, m.fechaMeta) / 30.4));
      return 'Para llegar el ' + diaMes(m.fechaMeta) + ' aparta unos ' + $(Math.ceil(falta / meses)) + ' al mes.';
    }
    return 'Dime cuánto aportas al mes y te digo cuándo llegas.';
  }
  function metas(cont) {
    const D = S().d, hoy = AF.app.hoy();
    cont.appendChild(intro('Ahorra para algo concreto. Con Pro, «Hoy puedes gastar» aparta tus aportes antes de decirte cuánto te queda.'));
    if (!D.metas.length) cont.appendChild(vacio('Aún no tienes metas', 'Un viaje, una moto, un colchón para emergencias. Ponle nombre y monto.', 'Crear una meta', () => formMeta(null)));
    else cont.appendChild(h('div', { class: 'lista' }, D.metas.map((m) => { const a = ahorrado(m), pct = m.objetivo ? a / m.objetivo : 0;
      return bloque({ icono: m.icono || '🏁', titulo: m.nombre, sub: $(a) + ' de ' + $(m.objetivo), derecha: h('span', { class: 'monto' }, Math.round(pct * 100) + ' %'), progreso: pct, nivel: pct >= 1 ? 'ok' : '',
        nota: ritmoMeta(m, hoy), onclick: () => AF.app.abrir(m.nombre, (c) => detalleMeta(c, m.id)) }); })));
    return masBtn('Nueva meta', () => formMeta(null));
  }
  function detalleMeta(cont, id) {
    const m = S().buscar('metas', id), hoy = AF.app.hoy();
    if (!m) { setTimeout(() => AF.app.atras(), 0); return; }
    const a = ahorrado(m), pct = m.objetivo ? Math.min(1, a / m.objetivo) : 0;
    cont.appendChild(h('div', { class: 'plastico' },
      h('div', { class: 'plastico-cabeza' }, h('span', null, (m.icono || '🏁') + ' ' + m.nombre), h('span', { class: 'suave' }, Math.round(pct * 100) + ' %')),
      h('div', null, h('div', { class: 'suave texto-sm' }, 'Llevas'), h('div', { class: 'plastico-cifra' }, $(a))),
      h('div', null, h('div', { class: 'plastico-pie' }, h('span', null, 'Meta ' + $(m.objetivo)), h('span', { class: 'suave' }, 'Faltan ' + $(Math.max(0, m.objetivo - a)))), h('div', { class: 'cupo' }, h('i', { estilo: { width: pct * 100 + '%' } })))));
    cont.appendChild(h('p', { class: 'suave', estilo: { margin: '14px 0 0' } }, ritmoMeta(m, hoy)));
    cont.appendChild(h('div', { estilo: { display: 'flex', gap: '10px', marginTop: '16px' } }, boton('Aportar o retirar', 'btn-voz', () => formAporte(m)), h('button', { class: 'btn btn-borde', type: 'button', 'aria-label': 'Editar meta', onclick: () => formMeta(m) }, ico('editar'))));
    const ap = (m.aportes || []).slice().sort((x, y) => (x.fecha < y.fecha ? 1 : -1));
    cont.appendChild(seccion('Movimientos de esta meta', ap.length ? h('div', { class: 'lista' }, ap.map((x) => h('div', { class: 'fila' },
      h('div', { class: 'ico ' + (x.monto >= 0 ? 'ingreso' : 'gasto') }, x.monto >= 0 ? '＋' : '－'),
      h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, x.monto >= 0 ? 'Aporte' : 'Retiro'), h('div', { class: 'fila-sub' }, diaMes(x.fecha))),
      h('span', { class: 'monto ' + (x.monto >= 0 ? 'ingreso' : 'gasto') }, (x.monto >= 0 ? '+' : '−') + $(Math.abs(x.monto))),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Quitar este movimiento', onclick: () => { S().editar('metas', m.id, { aportes: m.aportes.filter((z) => z.id !== x.id) }, 'Quité un aporte'); } }, ico('basura')))))
      : h('p', { class: 'suave' }, 'Aún no has aportado. Toca «Aportar» cuando separes plata para esta meta.')));
    cont.appendChild(h('div', { estilo: { textAlign: 'center', marginTop: '24px' } }, h('button', { class: 'btn-texto btn-peligro', type: 'button', onclick: async () => { if (await eliminar('metas', m.id, '¿Eliminar la meta «' + m.nombre + '»?', 'Se borra la meta y sus aportes. Tus gastos no se tocan.', 'Eliminé una meta')) AF.app.atras(); } }, 'Eliminar esta meta')));
  }
  function formAporte(m) {
    const e = { signo: 1 }, hoy = AF.app.hoy();
    const monto = entradaMonto('', '0', 'Monto'), fecha = h('input', { class: 'entrada', type: 'date', value: hoy, max: hoy }), err = errorEl(), tabs = h('div', { class: 'segmentos' });
    const pintar = () => { AF.ui.vaciar(tabs); [[1, 'Aportar'], [-1, 'Retirar']].forEach(([s, t]) => tabs.appendChild(h('button', { type: 'button', 'aria-pressed': e.signo === s ? 'true' : 'false', onclick: () => { e.signo = s; pintar(); } }, t))); };
    pintar();
    hoja({ titulo: 'Aporte a «' + m.nombre + '»', cuerpo: h('div', null, tabs, campo('Monto', monto), campo('Fecha', fecha), err),
      acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
        const v = num(monto); if (!(v > 0)) { err.textContent = 'Escribe un monto mayor que cero.'; return false; }
        if (e.signo < 0 && v > ahorrado(m)) { err.textContent = 'Solo tienes ' + $(ahorrado(m)) + ' en esta meta.'; return false; }
        S().editar('metas', m.id, { aportes: (m.aportes || []).concat([{ id: U.uid(), fecha: fecha.value || hoy, monto: U.r2(v * e.signo) }]) }, e.signo > 0 ? 'Aporté a una meta' : 'Retiré de una meta');
        const lograda = e.signo > 0 && ahorrado(m) < m.objetivo && ahorrado(S().buscar('metas', m.id)) >= m.objetivo;
        aviso(lograda ? '🎉 ¡Meta lograda!' : e.signo > 0 ? 'Aporte guardado' : 'Retiro guardado', { texto: 'Deshacer', onclick: () => S().deshacer() });
        if (lograda) AF.ui.confeti();
      } }] });
    setTimeout(() => monto.focus(), 200);
  }
  function formMeta(m) {
    const D = S().d, edit = !!m;
    if (!edit && !AF.acceso.puedeAgregar('metas', D.metas.length)) return C().pedirLimite('metas', 'meta de ahorro', 'metas de ahorro');
    const e = { icono: edit ? m.icono || '🏁' : ICONOS_META[0] };
    const nombre = h('input', { class: 'entrada', placeholder: 'Ej.: viaje a la playa', maxlength: 40, value: edit ? m.nombre : '', 'aria-label': 'Nombre de la meta' });
    const objetivo = entradaMonto(edit ? m.objetivo : '', '0', 'Cuánto quieres juntar');
    const aporte = h('input', { class: 'entrada', inputmode: 'decimal', placeholder: 'Opcional', value: edit && m.aporteMensual ? String(m.aporteMensual).replace('.', ',') : '', 'aria-label': 'Aporte al mes' });
    const fechaMeta = h('input', { class: 'entrada', type: 'date', value: edit && m.fechaMeta ? m.fechaMeta : '', min: AF.app.hoy() });
    const err = errorEl(), zonaIcono = h('div');
    const pintar = () => { AF.ui.vaciar(zonaIcono); zonaIcono.appendChild(h('div', { class: 'opciones' }, ICONOS_META.map((i) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': e.icono === i ? 'true' : 'false', 'aria-label': 'Icono ' + i, onclick: () => { e.icono = i; pintar(); } }, i)))); };
    pintar();
    hoja({ titulo: edit ? 'Editar meta' : 'Nueva meta', cuerpo: h('div', null, campo('Nombre', nombre), campo('Icono', zonaIcono), campo('Cuánto quieres juntar', objetivo), campo('Cuánto aportas al mes', aporte, 'Con esto te digo cuándo llegas. Puedes dejarlo vacío.'), campo('Fecha que te gustaría llegar', fechaMeta, 'Opcional.'), err),
      acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
        const n = nombre.value.trim(), o = num(objetivo), a = aporte.value.trim() ? num(aporte) : null;
        if (!n) { err.textContent = 'Ponle un nombre a la meta.'; nombre.focus(); return false; }
        if (!(o > 0)) { err.textContent = 'Escribe cuánto quieres juntar.'; objetivo.focus(); return false; }
        if (a != null && !(a > 0)) { err.textContent = 'El aporte mensual debe ser mayor que cero (o déjalo vacío).'; return false; }
        const datos = { nombre: n, icono: e.icono, objetivo: U.r2(o), aporteMensual: a != null ? U.r2(a) : null, fechaMeta: fechaMeta.value || null };
        if (edit) S().editar('metas', m.id, datos, 'Edité una meta'); else S().agregar('metas', Object.assign(datos, { aportes: [] }), 'Creé una meta');
        aviso('Meta guardada');
      } }] });
    setTimeout(() => nombre.focus(), 200);
  }

  /* ========================================================================= PAGOS FIJOS */
  const delTipo = (esSub) => (p) => !!p.suscripcion === esSub;
  function pagar(p) {
    const cat = p.cat || 'otros';
    S().agregar('movs', { tipo: 'gasto', monto: p.monto, cat, desc: p.nombre, fecha: AF.app.hoy(), cuenta: 'efectivo', nec: S().categoria(cat).nec || null, pagoFijoId: p.id }, 'Pagué ' + p.nombre);
    aviso(p.nombre + ': pagado', { texto: 'Deshacer', onclick: () => S().deshacer() });
  }
  function filaFijo(p, hoy) {
    const e = I().estadoFijo(S().d, p, hoy);
    const sub = e.pagado ? 'Pagado · próximo ' + diaMesC(e.proxima)
      : e.atrasado ? 'Atrasado · venció el ' + diaMesC(e.proxima) : 'Vence el ' + diaMesC(e.proxima) + (e.diasPara <= 3 ? (e.diasPara <= 0 ? ' · hoy' : ' · en ' + plural(e.diasPara, 'día', 'días')) : '');
    return bloque({ icono: S().categoria(p.cat || 'otros').icono, tono: e.atrasado ? 'gasto' : '', titulo: p.nombre, sub, derecha: h('span', { class: 'monto' }, $(p.monto)), onclick: () => formFijo(p, !!p.suscripcion),
      accion: e.pagado ? h('span', { class: 'etiqueta-estado ya' }, 'Pagado') : h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => pagar(p) }, 'Pagar') });
  }
  function fijos(cont) {
    const D = S().d, hoy = AF.app.hoy(), lista = D.pagosFijos.filter(delTipo(false));
    cont.appendChild(intro('Lo que pagas todos los meses. «Hoy puedes gastar» ya lo aparta para que no te falte.'));
    if (!lista.length) cont.appendChild(vacio('Aún no tienes pagos fijos', 'Arriendo, internet, colegio, la cuota de la moto…', 'Agregar un pago fijo', () => formFijo(null, false)));
    else {
      cont.appendChild(h('div', { class: 'resumen-dos' }, h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Al mes'), h('div', { class: 'dato-valor' }, $(lista.filter((p) => p.activo !== false).reduce((s, p) => s + p.monto, 0)))),
        h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Pendiente este ciclo'), h('div', { class: 'dato-valor' }, $(I().puedesGastarHoy(D, hoy, 'simple').fijos)))));
      cont.appendChild(h('div', { class: 'lista', estilo: { marginTop: '12px' } }, lista.slice().sort((a, b) => I().estadoFijo(D, a, hoy).proxima.localeCompare(I().estadoFijo(D, b, hoy).proxima)).map((p) => filaFijo(p, hoy))));
    }
    return masBtn('Agregar pago fijo', () => formFijo(null, false));
  }
  function formFijo(p, esSub) {
    const D = S().d, edit = !!p;
    if (!edit && !esSub && !AF.acceso.puedeAgregar('pagosFijos', D.pagosFijos.filter(delTipo(false)).length)) return C().pedirLimite('pagosFijos', 'pago fijo', 'pagos fijos');
    const e = { cat: edit ? p.cat || 'otros' : esSub ? 'suscripciones' : 'otros', manual: edit };
    const nombre = h('input', { class: 'entrada', placeholder: esSub ? 'Ej.: Netflix' : 'Ej.: arriendo', maxlength: 40, value: edit ? p.nombre : '', 'aria-label': 'Nombre' });
    const monto = entradaMonto(edit ? p.monto : '', '0', 'Monto'), dia = h('input', { class: 'entrada', inputmode: 'numeric', placeholder: '1 a 31', maxlength: 2, value: edit ? p.dia : '', 'aria-label': 'Día del mes' });
    const err = errorEl(), zonaCat = h('div');
    const pintarCat = () => { AF.ui.vaciar(zonaCat); zonaCat.appendChild(campo('Categoría', C().selectorCategoria('gasto', e.cat, (id) => { e.cat = id; e.manual = true; }))); };
    nombre.addEventListener('change', () => {                                                    // sugiere la categoría según el nombre, si aún no la elegiste
      if (e.manual || !nombre.value.trim() || !AF.parser) return;
      const pal = U.norm(nombre.value).split(/\s+/).filter(Boolean);
      const c = AF.parser.clasificar(pal, pal.map((_, i) => i), 'gasto', { categorias: S().categorias(), dicc: D.diccionario });
      if (c.cat) { e.cat = c.cat.id; pintarCat(); }
    });
    pintarCat();
    hoja({ titulo: edit ? 'Editar' : esSub ? 'Nueva suscripción' : 'Nuevo pago fijo', cuerpo: h('div', null, campo('Nombre', nombre), campo('Monto', monto), campo('Se cobra el día', dia, 'Del 1 al 31. Si el mes no tiene ese día, se cobra el último.'), zonaCat, err),
      acciones: (edit ? [{ texto: 'Eliminar', clase: 'btn-borde btn-peligro', onclick: (a) => cierra(a, () => eliminar('pagosFijos', p.id, '¿Eliminar «' + p.nombre + '»?', 'Los gastos que ya registraste se quedan.', 'Quité un pago fijo')) }] : [])
        .concat([{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
          const n = nombre.value.trim(), v = num(monto), dd = Math.round(U.parseNumero(dia.value) || 0);
          if (!n) { err.textContent = 'Ponle un nombre.'; nombre.focus(); return false; }
          if (!(v > 0)) { err.textContent = 'Escribe un monto mayor que cero.'; monto.focus(); return false; }
          if (!(dd >= 1 && dd <= 31)) { err.textContent = 'El día debe ser del 1 al 31.'; dia.focus(); return false; }
          const datos = { nombre: n, monto: U.r2(v), dia: dd, cat: e.cat, activo: true, suscripcion: edit ? !!p.suscripcion : !!esSub };
          if (edit) S().editar('pagosFijos', p.id, datos, 'Edité un pago fijo'); else S().agregar('pagosFijos', datos, 'Agregué un pago fijo');
          aviso('Guardado'); AF.app.programarAvisos && AF.app.programarAvisos();
        } }]) });
    setTimeout(() => nombre.focus(), 200);
  }

  /* ======================================================================= SUSCRIPCIONES */
  function suscripciones(cont) {
    const D = S().d, hoy = AF.app.hoy(), lista = D.pagosFijos.filter(delTipo(true));
    const total = lista.filter((p) => p.activo !== false).reduce((s, p) => s + p.monto, 0);
    cont.appendChild(intro('Lo que pagas cada mes sin pensarlo: streaming, música, la nube, el gimnasio.'));
    if (lista.length) cont.appendChild(h('div', { class: 'resumen-dos' }, h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Al mes'), h('div', { class: 'dato-valor' }, $(total))), h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Al año'), h('div', { class: 'dato-valor' }, $(U.r2(total * 12))))));
    if (!lista.length) cont.appendChild(vacio('Aún no tienes suscripciones', 'Anótalas y mira cuánto suman al año; a veces sorprende.', 'Agregar una suscripción', () => formFijo(null, true)));
    else cont.appendChild(h('div', { class: 'lista', estilo: { marginTop: '12px' } }, lista.map((p) => filaFijo(p, hoy))));
    // Pro: las que se repiten solas en tus gastos
    const detectadas = I().suscripcionesDetectadas(D, hoy);
    if (AF.acceso.tiene('suscripcionesDetectadas')) {
      if (detectadas.length) cont.appendChild(seccion('Encontré pagos que se repiten', [h('p', { class: 'texto-sm suave' }, 'Mismo concepto, mismo monto y casi el mismo día cada mes. Agrégalos si quieres que los aparte.'),
        h('div', { class: 'lista' }, detectadas.map((x) => h('div', { class: 'bloque' }, h('div', { class: 'bloque-fila' }, h('div', { class: 'bloque-cab' }, h('div', { class: 'ico' }, S().categoria(x.cat).icono),
          h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, x.nombre), h('div', { class: 'fila-sub' }, $(x.monto) + ' · el día ' + x.dia + ' · ' + x.meses + ' meses seguidos'))),
          h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => { S().agregar('pagosFijos', { nombre: x.nombre, monto: x.monto, dia: x.dia, cat: x.cat, activo: true, suscripcion: true }, 'Agregué una suscripción'); aviso(x.nombre + ' agregada'); } }, 'Agregar')))))]));
      else cont.appendChild(h('p', { class: 'texto-sm suave', estilo: { marginTop: '24px' } }, 'Cuando se repita un pago en tus gastos, aquí te aviso para que lo agregues.'));
    } else cont.appendChild(h('div', { estilo: { marginTop: '24px' } }, C().gancho('Pro encuentra solo los pagos que se repiten cada mes en tus gastos.', 'suscripcionesDetectadas')));
    return masBtn('Agregar suscripción', () => formFijo(null, true));
  }

  /* ====================================================================== PRÉSTAMOS */
  const pend = (p) => I().pendientePrestamo(p);
  function mensajeCobro(p) {
    return 'Hola ' + p.persona + ', te escribo para recordarte que me debes ' + $(pend(p)) + (p.nota ? ' por ' + p.nota.toLowerCase() : '') + (p.fechaLimite ? ' (acordamos para el ' + diaMes(p.fechaLimite) + ')' : '') + '. ¡Gracias!';
  }
  function filaPrestamo(p, hoy) {
    const vencido = !p.pagado && p.fechaLimite && p.fechaLimite < hoy;
    const sub = (p.nota ? p.nota + ' · ' : '') + (p.pagado ? 'Saldado' : p.fechaLimite ? (vencido ? 'Venció el ' : 'Para el ') + diaMes(p.fechaLimite) : 'Sin fecha');
    return bloque({ icono: p.direccion === 'me_deben' ? '📥' : '📤', tono: vencido ? 'gasto' : '', titulo: p.persona, sub, derecha: h('span', { class: 'monto ' + (p.pagado ? '' : p.direccion === 'me_deben' ? 'ingreso' : 'gasto') }, p.pagado ? $(p.monto) : $(pend(p))),
      nota: !p.pagado && (p.abonos || []).length ? 'De ' + $(p.monto) + ' · ya abonaron ' + $(U.r2(p.monto - pend(p))) : null, onclick: () => opcionesPrestamo(p) });
  }
  function prestamos(cont) {
    const D = S().d, hoy = AF.app.hoy(), r = I().prestamosResumen(D);
    cont.appendChild(intro('Lo que prestaste y lo que te prestaron. No cuenta como gasto ni como ingreso.'));
    if (!D.prestamos.length) { cont.appendChild(vacio('Nadie te debe y no le debes a nadie', 'Anota un préstamo para no olvidarte de cobrarlo o pagarlo.', 'Anotar un préstamo', () => formPrestamo(null))); return masBtn('Anotar préstamo', () => formPrestamo(null)); }
    cont.appendChild(h('div', { class: 'resumen-dos' }, h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Te deben'), h('div', { class: 'dato-valor', estilo: { color: 'var(--ingreso)' } }, $(r.meDeben))), h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Debes'), h('div', { class: 'dato-valor', estilo: { color: 'var(--gasto)' } }, $(r.debo)))));
    const activos = D.prestamos.filter((p) => !p.pagado), meDeben = activos.filter((p) => p.direccion === 'me_deben'), debo = activos.filter((p) => p.direccion !== 'me_deben'), saldados = D.prestamos.filter((p) => p.pagado);
    if (meDeben.length) cont.appendChild(seccion('Te deben', h('div', { class: 'lista' }, meDeben.map((p) => filaPrestamo(p, hoy)))));
    if (debo.length) cont.appendChild(seccion('Debes', h('div', { class: 'lista' }, debo.map((p) => filaPrestamo(p, hoy)))));
    if (saldados.length) cont.appendChild(seccion('Ya saldados', h('div', { class: 'lista' }, saldados.slice(-5).reverse().map((p) => filaPrestamo(p, hoy)))));
    return masBtn('Anotar préstamo', () => formPrestamo(null));
  }
  function opcionesPrestamo(p) {
    const boton2 = (t, fn, clase) => h('button', { class: 'btn ' + (clase || 'btn-borde') + ' btn-bloque', type: 'button', onclick: () => { api.cerrar(); fn(); } }, t);
    const cuerpo = h('div', { estilo: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' } });
    if (!p.pagado) {
      cuerpo.appendChild(boton2(p.direccion === 'me_deben' ? 'Me abonaron' : 'Abonar', () => formAbono(p), 'btn-primario'));
      cuerpo.appendChild(boton2('Marcar como saldado', () => { S().editar('prestamos', p.id, { pagado: true, fechaPago: AF.app.hoy() }, 'Saldé un préstamo'); aviso('Saldado', { texto: 'Deshacer', onclick: () => S().deshacer() }); AF.app.programarAvisos && AF.app.programarAvisos(); }));
      if (p.direccion === 'me_deben') cuerpo.appendChild(h('button', { class: 'btn btn-borde btn-bloque', type: 'button', onclick: () => { if (!C().requiere('cobroPorWhatsApp')) { api.cerrar(); return; } N().compartirTexto('Recordatorio de pago', mensajeCobro(p)).then((r) => { if (r === 'copiado') aviso('Mensaje copiado: pégalo en WhatsApp'); }); } }, 'Recordarle por WhatsApp', AF.acceso.tiene('cobroPorWhatsApp') ? null : AF.ui.chipPro()));
    } else cuerpo.appendChild(boton2('Volver a abrir', () => S().editar('prestamos', p.id, { pagado: false, fechaPago: null }, 'Reabrí un préstamo')));
    cuerpo.appendChild(boton2('Editar', () => formPrestamo(p)));
    cuerpo.appendChild(h('button', { class: 'btn-texto btn-peligro', type: 'button', onclick: () => { api.cerrar(); eliminar('prestamos', p.id, '¿Eliminar este préstamo?', 'Se borra de tu lista.', 'Eliminé un préstamo'); } }, 'Eliminar'));
    const api = hoja({ titulo: p.persona + ' · ' + $(p.pagado ? p.monto : pend(p)), cuerpo });
  }
  function formAbono(p) {
    const monto = entradaMonto('', '0', 'Monto del abono'), err = errorEl();
    hoja({ titulo: p.direccion === 'me_deben' ? 'Abono de ' + p.persona : 'Abonar a ' + p.persona, cuerpo: h('div', null, h('p', { class: 'suave' }, 'Falta ' + $(pend(p)) + '.'), campo('Monto', monto), err),
      acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
        const v = num(monto); if (!(v > 0)) { err.textContent = 'Escribe un monto mayor que cero.'; return false; }
        if (v > pend(p) + 0.001) { err.textContent = 'Solo falta ' + $(pend(p)) + '.'; return false; }
        const abonos = (p.abonos || []).concat([{ fecha: AF.app.hoy(), monto: U.r2(v) }]);
        const salda = U.r2(pend(p) - v) <= 0;
        S().editar('prestamos', p.id, { abonos, pagado: salda, fechaPago: salda ? AF.app.hoy() : null }, 'Abono a un préstamo');
        aviso(salda ? 'Saldado' : 'Abono guardado', { texto: 'Deshacer', onclick: () => S().deshacer() });
      } }] });
    setTimeout(() => monto.focus(), 200);
  }
  function formPrestamo(p) {
    const D = S().d, edit = !!p;
    if (!edit && !AF.acceso.puedeAgregar('prestamos', D.prestamos.filter((x) => !x.pagado).length)) return C().pedirLimite('prestamos', 'préstamo abierto', 'préstamos abiertos');
    const e = { dir: edit ? p.direccion : 'me_deben' };
    const persona = h('input', { class: 'entrada', placeholder: 'Nombre', maxlength: 40, value: edit ? p.persona : '', 'aria-label': 'Persona' });
    const monto = entradaMonto(edit ? p.monto : '', '0', 'Monto'), nota = h('input', { class: 'entrada', placeholder: 'Ej.: para el arriendo', maxlength: 60, value: edit ? p.nota || '' : '', 'aria-label': 'Nota' });
    const limite = h('input', { class: 'entrada', type: 'date', value: edit && p.fechaLimite ? p.fechaLimite : '' });
    const err = errorEl(), tabs = h('div', { class: 'segmentos' });
    const pintar = () => { AF.ui.vaciar(tabs); [['me_deben', 'Me deben'], ['debo', 'Debo']].forEach(([k, t]) => tabs.appendChild(h('button', { type: 'button', 'aria-pressed': e.dir === k ? 'true' : 'false', onclick: () => { e.dir = k; pintar(); } }, t))); };
    pintar();
    hoja({ titulo: edit ? 'Editar préstamo' : 'Nuevo préstamo', cuerpo: h('div', null, tabs, campo('¿Con quién?', persona), campo('Monto', monto), campo('Nota', nota), campo('Fecha límite', limite, 'Opcional. Te aviso ese día.'), err),
      acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
        const n = persona.value.trim(), v = num(monto);
        if (!n) { err.textContent = 'Escribe con quién es.'; persona.focus(); return false; }
        if (!(v > 0)) { err.textContent = 'Escribe un monto mayor que cero.'; monto.focus(); return false; }
        const datos = { persona: n, monto: U.r2(v), direccion: e.dir, nota: nota.value.trim(), fechaLimite: limite.value || null };
        if (edit) S().editar('prestamos', p.id, datos, 'Edité un préstamo'); else S().agregar('prestamos', Object.assign(datos, { pagado: false, abonos: [], fecha: AF.app.hoy() }), 'Anoté un préstamo');
        aviso('Guardado'); AF.app.programarAvisos && AF.app.programarAvisos();
      } }] });
    setTimeout(() => persona.focus(), 200);
  }

  /* ============================================================================ RETOS */
  function retos(cont) {
    const D = S().d, hoy = AF.app.hoy(), r = I().reto(D, hoy), hist = D.retos.filter((x) => x.estado !== 'activo');
    const hm30 = I().hormiga(D, U.sumarDias(hoy, -29), hoy);   // 30 días contando hoy (antes no contaba lo de hoy y decía «vas bien» con un gasto hormiga ya registrado)
    if (!r) {
      cont.appendChild(h('div', { class: 'plastico', estilo: { minHeight: '0', gap: '10px' } }, h('div', { class: 'plastico-cabeza' }, h('span', null, '🏆 ' + PLAN.reto.nombre)),
        h('p', { estilo: { fontSize: '22px', lineHeight: 1.3, fontWeight: 600, margin: 0 } }, 'Un día a la vez: si no compras antojos ni gastos chiquitos, la racha sigue.'),
        hm30.total > 0 ? h('p', { class: 'suave texto-sm' }, 'En los últimos 30 días gastaste ' + $(hm30.total) + ' en ' + plural(hm30.veces, 'compra pequeña', 'compras pequeñas') + '. Ese es el ahorro que te juegas.') : h('p', { class: 'suave texto-sm' }, 'Los últimos 30 días no tienes gastos hormiga registrados. Vas bien.')));
      cont.appendChild(h('div', { estilo: { marginTop: '16px' } }, boton('Empezar el reto hoy', 'btn-voz btn-bloque', () => { S().agregar('retos', { tipo: 'hormiga', estado: 'activo', inicio: hoy }, 'Empecé un reto'); aviso('Reto en marcha: ¡el día 1 es hoy!'); })));
      cont.appendChild(h('p', { class: 'texto-sm suave', estilo: { marginTop: '14px' } }, 'Cuenta como gasto hormiga una compra de ' + $(PLAN.hormiga.montoMaximo) + ' o menos en categorías como antojos o comida de la calle. Si registras una, la racha vuelve a cero.'));
    } else {
      const falla = r.fallaHoy;
      cont.appendChild(h('div', { class: 'plastico', estilo: { gap: '6px' } },
        h('div', { class: 'plastico-cabeza' }, h('span', null, '🏆 ' + PLAN.reto.nombre), h('span', { class: 'suave' }, r.fallos ? plural(r.fallos, 'recaída', 'recaídas') : 'Sin recaídas')),
        h('div', null, h('div', { class: 'suave texto-sm' }, r.completado ? '¡Lo lograste!' : falla ? 'Hoy se cortó la racha' : 'Llevas'), h('div', { class: 'plastico-cifra' }, r.racha + (r.racha === 1 ? ' día' : ' días'))),
        h('div', { class: 'plastico-pie' }, h('span', null, 'Meta: ' + r.meta + ' días seguidos'), r.ahorroEstimado > 0 ? h('span', { class: 'suave' }, 'Ahorro estimado ' + $(r.ahorroEstimado)) : null),
        h('div', { class: 'cupo' }, h('i', { estilo: { width: (r.racha / r.meta) * 100 + '%' } }))));
      cont.appendChild(h('div', { class: 'rejilla-dias', role: 'img', 'aria-label': 'Días de la racha actual: ' + r.racha + ' de ' + r.meta }, r.dias.map((x) => h('i', { class: 'punto-dia ' + (x.estado === 'ok' ? 'ok' : x.estado === 'hoy' ? 'hoy' : x.estado === 'falla' ? 'falla' : '') }))));
      cont.appendChild(h('p', { class: 'texto-sm suave', estilo: { marginTop: '16px' } }, r.completado ? 'Treinta días seguidos sin un gasto hormiga. Guarda el logro y, si quieres, empieza otro.'
        : falla ? 'Registraste un gasto hormiga hoy. No pasa nada: mañana empieza una racha nueva.' : 'Faltan ' + (r.meta - r.racha) + ' días. Hoy cuenta cuando termine el día sin gastos hormiga.'));
      cont.appendChild(h('div', { estilo: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px' } },
        r.completado ? boton('Guardar el logro', 'btn-voz btn-bloque', () => S().editar('retos', r.id, { estado: 'logrado', fin: hoy, ahorro: r.ahorroEstimado }, 'Terminé un reto'))
          : h('button', { class: 'btn-texto btn-peligro', type: 'button', onclick: async () => { if (await C().confirmar({ titulo: '¿Dejar el reto?', texto: 'Se cierra y pierdes la racha de ' + r.racha + (r.racha === 1 ? ' día.' : ' días.'), si: 'Dejarlo', peligro: true })) S().editar('retos', r.id, { estado: 'abandonado', fin: hoy }, 'Dejé un reto'); } }, 'Dejar el reto')));
    }
    if (hist.length) cont.appendChild(seccion('Tus retos', h('div', { class: 'lista' }, hist.slice().reverse().slice(0, 8).map((x) => h('div', { class: 'fila' }, h('div', { class: 'ico' }, x.estado === 'logrado' ? '🏆' : '🏳️'),
      h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, x.estado === 'logrado' ? 'Logrado' : 'Lo dejaste'), h('div', { class: 'fila-sub' }, diaMes(x.inicio) + (x.fin ? ' → ' + diaMes(x.fin) : ''))),
      x.ahorro ? h('span', { class: 'monto ingreso' }, '≈ ' + $(x.ahorro)) : null)))));
  }

  V.finanzas = { presupuestos, metas, fijos, prestamos, suscripciones, retos, ritmoMeta, ahorrado, mensajeCobro };
})(typeof window !== 'undefined' ? window : globalThis);
