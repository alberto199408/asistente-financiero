/* Movimientos: lista por día con filtros y búsqueda, y la tabla para cargar y corregir muchos a la vez. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const $ = (n) => U.dinero(n);
  const C = () => V.comun, S = () => AF.store;

  const est = { mes: null, tipo: 'todos', texto: '', buscar: false, tabla: false, pagina: 1, cat: null };

  function filtrar(D) {
    const desde = U.inicioMes(est.mes), hasta = U.finMes(est.mes);
    const q = U.norm(est.texto).trim();
    return D.movs.filter((m) => m.fecha >= desde && m.fecha <= hasta
      && (est.tipo === 'todos' || (est.tipo === 'gasto' ? m.tipo === 'gasto' : est.tipo === 'ingreso' ? m.tipo === 'ingreso' : true))
      && (!est.cat || m.cat === est.cat)
      && (!q || U.norm((m.desc || '') + ' ' + S().categoria(m.cat).nombre).includes(q)));
  }

  function cabecera(cont) {
    const hoy = AF.app.hoy();
    if (!est.mes) est.mes = U.inicioMes(hoy);
    const esActual = est.mes === U.inicioMes(hoy);
    const nombre = U.cap(U.nombreMes(est.mes)) + ' ' + est.mes.slice(0, 4);
    cont.appendChild(h('header', { class: 'barra-superior' },
      h('h1', { class: 'h2' }, 'Movimientos'),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Buscar', 'aria-pressed': est.buscar ? 'true' : 'false', onclick: () => { est.buscar = !est.buscar; if (!est.buscar) est.texto = ''; AF.app.redibujar(); } }, ico('buscar')),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': est.tabla ? 'Ver lista' : 'Ver tabla', onclick: () => { est.tabla = !est.tabla; est.pagina = 1; AF.app.redibujar(); } }, ico(est.tabla ? 'movimientos' : 'archivo')),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Agregar movimiento', onclick: () => C().formMovimiento({ alGuardar: (m) => C().guardarMov(m) }) }, ico('mas_'))));
    const sub = h('div', { class: 'contenido-solo', estilo: { paddingBottom: '0' } });
    sub.appendChild(h('div', { estilo: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Mes anterior', onclick: () => { est.mes = U.sumarMeses(est.mes, -1); est.pagina = 1; AF.app.redibujar(); } }, ico('atras')),
      h('strong', { class: 'h2', estilo: { fontSize: '18px' } }, esActual ? nombre + ' · este mes' : nombre),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Mes siguiente', disabled: esActual, estilo: { opacity: esActual ? '.3' : '1' }, onclick: () => { if (!esActual) { est.mes = U.sumarMeses(est.mes, 1); est.pagina = 1; AF.app.redibujar(); } } }, ico('derecha'))));
    if (est.buscar) {
      const inp = h('input', { class: 'entrada', type: 'search', placeholder: 'Buscar por detalle o categoría', value: est.texto, 'aria-label': 'Buscar movimientos',
        oninput: (e) => { est.texto = e.target.value; clearTimeout(est.t); est.t = setTimeout(() => { AF.app.redibujar(); setTimeout(() => { const i = g.document.querySelector('input[type=search]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 30); }, 260); } });
      sub.appendChild(h('div', { estilo: { marginTop: '8px' } }, inp)); setTimeout(() => { if (!est.texto) inp.focus(); }, 40);
    }
    sub.appendChild(h('div', { class: 'segmentos', estilo: { marginTop: '12px' } }, [['todos', 'Todos'], ['gasto', 'Gastos'], ['ingreso', 'Ingresos']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': est.tipo === k ? 'true' : 'false', onclick: () => { est.tipo = k; est.pagina = 1; AF.app.redibujar(); } }, t))));
    cont.appendChild(sub);
  }

  function resumen(lista) {
    const ing = lista.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0), gas = lista.filter((m) => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);
    return h('div', { class: 'dos-datos', estilo: { marginTop: '16px' } },
      h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Ingresos'), h('div', { class: 'dato-valor', estilo: { color: 'var(--ingreso)' } }, $(ing))),
      h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Gastos'), h('div', { class: 'dato-valor', estilo: { color: 'var(--gasto)' } }, $(gas))));
  }

  /* ------------------------------------------------------------------------ lista */
  function lista(cont, D, hoy) {
    const movs = filtrar(D);
    const cuerpo = h('div', { class: 'contenido' });
    cuerpo.appendChild(resumen(movs));
    if (!movs.length) {
      cuerpo.appendChild(h('div', { class: 'vacio' }, h('strong', null, est.texto ? 'No encontré nada con «' + est.texto + '»' : 'Sin movimientos en este periodo'), est.texto ? 'Prueba con otra palabra.' : 'Toca el micrófono o el + para agregar uno.'));
    } else {
      const total = movs.length;
      agrupar(movs, hoy).forEach((dia) => {
        cuerpo.appendChild(h('div', { class: 'dia-titulo' }, h('span', null, dia.titulo), h('span', { class: 'num' }, (dia.total >= 0 ? '+' : '−') + $(Math.abs(dia.total)))));
        cuerpo.appendChild(h('div', { class: 'lista' }, dia.movs.map((m) => C().filaMov(m, hoy, () => C().editarMov(m), false))));
      });
      cuerpo.appendChild(h('p', { class: 'texto-xs suave', estilo: { textAlign: 'center', marginTop: '24px' } }, total + (total === 1 ? ' movimiento' : ' movimientos')));
    }
    cont.appendChild(cuerpo);
  }
  const agrupar = (movs, hoy) => C().agruparPorDia(movs, hoy);

  /* ------------------------------------------------------------------------ tabla */
  function tabla(cont, D, hoy) {
    const todos = filtrar(D).sort((a, b) => (b.fecha === a.fecha ? b.creado - a.creado : b.fecha < a.fecha ? -1 : 1));
    const porPagina = PLAN.tabla.filasPorPagina, visibles = todos.slice(0, est.pagina * porPagina);
    const cats = (tipo) => S().categorias(tipo);
    const opcionesCat = (tipo, sel) => cats(tipo).map((c) => h('option', { value: c.id, selected: c.id === sel }, c.icono + ' ' + c.nombre));
    const errorEl = h('div', { class: 'ayuda', role: 'alert', estilo: { color: 'var(--gasto)', minHeight: '18px', marginTop: '8px' } });

    /* fila nueva */
    const n = { fecha: hoy, tipo: 'gasto', monto: '', cat: 'otros', desc: '', nec: 'auto' };
    const iFecha = h('input', { type: 'date', value: n.fecha, max: hoy, 'aria-label': 'Fecha nueva' });
    const iTipo = h('select', { 'aria-label': 'Tipo nuevo', onchange: (e) => { n.tipo = e.target.value; AF.ui.vaciar(iCat); opcionesCat(n.tipo, null).forEach((o) => iCat.appendChild(o)); n.cat = iCat.value; } }, h('option', { value: 'gasto' }, 'Gasto'), h('option', { value: 'ingreso' }, 'Ingreso'));
    const iMonto = h('input', { inputmode: 'decimal', placeholder: '0,00', 'aria-label': 'Monto nuevo' });
    const iCat = h('select', { 'aria-label': 'Categoría nueva', onchange: (e) => { n.cat = e.target.value; } }, opcionesCat('gasto', 'otros'));
    const iDesc = h('input', { placeholder: 'Detalle', 'aria-label': 'Detalle nuevo' });
    const iNec = h('select', { 'aria-label': 'Necesario o gusto nuevo' }, h('option', { value: 'auto' }, 'Auto'), h('option', { value: 'N' }, 'Necesario'), h('option', { value: 'G' }, 'Gusto'));
    function agregar() {
      const v = U.parseNumero(iMonto.value);
      if (!(v > 0)) { errorEl.textContent = 'Escribe un monto mayor que cero.'; iMonto.focus(); return; }
      errorEl.textContent = '';
      const tipo = iTipo.value, cat = iCat.value, c = S().categoria(cat);
      const m = { tipo, monto: U.r2(v), cat, desc: iDesc.value.trim(), fecha: iFecha.value || hoy, cuenta: 'efectivo' };
      if (tipo === 'gasto') m.nec = iNec.value === 'auto' ? (c.nec || null) : iNec.value;
      S().agregar('movs', m, 'Agregué un movimiento (tabla)');
      AF.app.redibujar();
      setTimeout(() => { const x = g.document.querySelector('tr.nueva input[inputmode=decimal]'); if (x) x.focus(); }, 80);
    }
    [iMonto, iDesc].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') agregar(); }));
    const filaNueva = h('tr', { class: 'nueva' }, h('td', null, iFecha), h('td', null, iTipo), h('td', { class: 'num' }, iMonto), h('td', null, iCat), h('td', null, iDesc), h('td', null, iNec),
      h('td', null, h('button', { class: 'btn btn-chico btn-voz', type: 'button', estilo: { margin: '0 6px', minHeight: '36px' }, onclick: agregar }, 'Agregar')));

    /* filas existentes: se guardan al salir de la celda */
    const filas = visibles.map((m) => {
      const aplicar = (patch, nota) => { S().editar('movs', m.id, patch, nota || 'Edité un movimiento (tabla)'); };
      const c0 = S().categoria(m.cat);
      const esPago = m.tipo === 'pago_tarjeta';
      return h('tr', { 'data-id': m.id },
        h('td', null, h('input', { type: 'date', value: m.fecha, max: U.sumarDias(hoy, 366), 'aria-label': 'Fecha', onchange: (e) => { if (e.target.value) aplicar({ fecha: e.target.value }); else e.target.value = m.fecha; } })),
        h('td', null, esPago ? h('span', { class: 'suave', estilo: { padding: '0 8px' } }, 'Pago tarjeta') : h('select', { 'aria-label': 'Tipo', onchange: (e) => { const t = e.target.value; aplicar({ tipo: t, cat: cats(t)[0].id, nec: null }); AF.app.redibujar(); } }, h('option', { value: 'gasto', selected: m.tipo === 'gasto' }, 'Gasto'), h('option', { value: 'ingreso', selected: m.tipo === 'ingreso' }, 'Ingreso'))),
        h('td', { class: 'num' }, h('input', { inputmode: 'decimal', value: String(m.monto).replace('.', ','), 'aria-label': 'Monto', onchange: (e) => { const v = U.parseNumero(e.target.value); if (v > 0) aplicar({ monto: U.r2(v) }); else e.target.value = String(m.monto).replace('.', ','); } })),
        h('td', null, esPago ? null : h('select', { 'aria-label': 'Categoría', onchange: (e) => { const c = S().categoria(e.target.value); const p = { cat: c.id }; if (m.tipo === 'gasto' && (m.nec == null || m.nec === c0.nec)) p.nec = c.nec || null; aplicar(p); if (m.desc) S().aprender(m.desc, c.id); } }, opcionesCat(m.tipo, m.cat))),
        h('td', null, h('input', { value: m.desc || '', maxlength: 80, 'aria-label': 'Detalle', onchange: (e) => aplicar({ desc: e.target.value.trim() }) })),
        h('td', null, m.tipo === 'gasto' ? h('select', { 'aria-label': 'Necesario o gusto', onchange: (e) => aplicar({ nec: e.target.value === 'S' ? null : e.target.value }) }, h('option', { value: 'S', selected: m.nec == null }, '—'), h('option', { value: 'N', selected: m.nec === 'N' }, 'Necesario'), h('option', { value: 'G', selected: m.nec === 'G' }, 'Gusto')) : null),
        h('td', null, h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Borrar', estilo: { width: '40px', height: '40px', color: 'var(--gasto)' }, onclick: () => { C().borrarMov(m); AF.app.redibujar(); } }, ico('basura'))));
    });
    const cab = ['Fecha', 'Tipo', 'Monto', 'Categoría', 'Detalle', 'Necesario o gusto', ''];
    const caja = h('div', { class: 'tabla-caja', estilo: { marginTop: '14px' } }, h('table', { class: 'tabla' }, h('colgroup', null, ['c-fecha', 'c-tipo', 'c-monto', 'c-cat', 'c-detalle', 'c-nec', 'c-acc'].map((c) => h('col', { class: c }))), h('thead', null, h('tr', null, cab.map((t) => h('th', { scope: 'col' }, t)))), h('tbody', null, filaNueva, filas)));
    cont.appendChild(h('div', { class: 'contenido' }, resumen(todos), h('p', { class: 'texto-sm suave', estilo: { marginTop: '10px' } }, 'Escribe en la fila de arriba y pulsa Enter para agregar. Cambia cualquier celda y se guarda sola.'), errorEl, caja,
      todos.length > visibles.length ? h('button', { class: 'btn btn-borde btn-bloque', type: 'button', estilo: { marginTop: '16px' }, onclick: () => { est.pagina++; AF.app.redibujar(); } }, 'Ver más (' + (todos.length - visibles.length) + ')') : null,
      h('div', { estilo: { height: '30px' } })));
  }

  function render(cont) {
    const D = S().d, hoy = AF.app.hoy();
    cabecera(cont);
    if (est.tabla) { AF.app.noRefrescar = true; tabla(cont, D, hoy); } else { AF.app.noRefrescar = false; lista(cont, D, hoy); }
  }

  // Abre la lista de movimientos en un mes (lo usa Resumen al tocar una barra o el botón «Ver movimientos»).
  function irAMes(mesISO) { est.mes = U.inicioMes(mesISO); est.tipo = 'todos'; est.cat = null; est.texto = ''; est.buscar = false; est.pagina = 1; AF.app.ir('movimientos'); }
  V.movimientos = { render, estado: est , irAMes };
})(typeof window !== 'undefined' ? window : globalThis);
