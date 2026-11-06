/* Piezas compartidas por las pantallas: frase anotada, filas de movimientos, formulario de movimiento, confirmaciones, Pro. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, hoja, aviso, fila, campo } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const $ = (n, o) => U.dinero(n, o);
  const V = (AF.vistas = AF.vistas || {});

  /* ----------------------------------------------------------------- frase anotada */
  // partes: [{texto, rol}] del intérprete. Cada rol se marca con su color: tipo, monto, categoría, otro.
  function fraseAnotada(partes, tipo, animar) {
    const el = h('p', { class: 'frase' + (animar ? ' entra' : ''), 'aria-label': (partes || []).map((p) => p.texto).join(' ') });
    (partes || []).forEach((p, i) => {
      const clase = p.rol === 'monto' ? 'm m-monto' : p.rol === 'cat' ? 'm m-cat' : p.rol === 'tipo' ? 'm m-tipo' + (tipo === 'ingreso' ? ' ingreso' : '') : p.rol === 'otro' ? 'm m-otro' : '';
      el.appendChild(clase ? h('span', { class: clase }, p.texto) : g.document.createTextNode(p.texto));
      if (i < partes.length - 1) el.appendChild(g.document.createTextNode(' '));
    });
    return el;
  }

  /* ----------------------------------------------------------------------- movimientos */
  const catDe = (id) => AF.store.categoria(id);
  function subDeMov(m, hoy) {
    const c = catDe(m.cat), partes = [c.nombre];
    if (m.cuenta === 'tarjeta') {
      const t = AF.store.buscar('tarjetas', m.tarjetaId);
      partes.push(t ? t.nombre : 'Tarjeta');
      if (m.credito && m.credito.modo === 'diferido' && m.credito.meses) partes.push(m.credito.meses + ' cuotas');
    }
    if (hoy) partes.push(U.fechaCorta(m.fecha, hoy));
    return partes.join(' · ');
  }
  function filaMov(m, hoy, onclick, conFecha) {
    if (m.tipo === 'pago_tarjeta') {
      const t = AF.store.buscar('tarjetas', m.tarjetaId);
      return fila({ icono: '💳', titulo: 'Pago de ' + (t ? t.nombre : 'tarjeta'), sub: U.fechaCorta(m.fecha, hoy), derecha: h('span', { class: 'monto' }, $(m.monto)), onclick });
    }
    const c = catDe(m.cat);
    return fila({
      icono: c.icono, titulo: m.desc || c.nombre, sub: subDeMov(m, conFecha ? hoy : null),
      derecha: h('span', { class: 'monto ' + (m.tipo === 'ingreso' ? 'ingreso' : 'gasto') }, (m.tipo === 'ingreso' ? '+' : '−') + $(m.monto)), onclick,
    });
  }
  // Devuelve [{fecha, titulo, total, movs}] más reciente primero
  function agruparPorDia(movs, hoy) {
    const mapa = {};
    movs.forEach((m) => { (mapa[m.fecha] = mapa[m.fecha] || []).push(m); });
    return Object.keys(mapa).sort().reverse().map((f) => {
      const lista = mapa[f].sort((a, b) => b.creado - a.creado);
      const total = lista.reduce((s, m) => s + (m.tipo === 'gasto' ? -m.monto : m.tipo === 'ingreso' ? m.monto : 0), 0);
      return { fecha: f, titulo: U.cap(U.fechaCorta(f, hoy)), total, movs: lista };
    });
  }

  /* ------------------------------------------------------------------ confirmaciones */
  function confirmar(o) {
    return new Promise((res) => {
      let listo = false;
      const fin = (v) => { if (!listo) { listo = true; res(v); } };
      hoja({
        titulo: o.titulo, cuerpo: h('p', { class: 'suave', estilo: { marginTop: '6px' } }, o.texto), alCerrar: () => fin(false),
        acciones: [{ texto: o.no || 'Cancelar', clase: 'btn-borde', onclick: () => fin(false) }, { texto: o.si || 'Aceptar', clase: o.peligro ? 'btn-primario btn-peligro-fondo' : 'btn-primario', onclick: () => fin(true) }],
      });
    });
  }

  /* ----------------------------------------------------------------------------- Pro */
  function pedirPro(funcion) {
    const st = AF.acceso.estado();
    const texto = AF.acceso.explicacion(funcion);
    hoja({
      titulo: 'Esto es de Pro',
      cuerpo: h('div', null, h('p', { class: 'suave', estilo: { margin: '6px 0 0' } }, texto),
        st.tipo === 'gratis' && !AF.store.d.plan.inicioPrueba ? h('p', { class: 'texto-sm', estilo: { marginTop: '12px' } }, 'Pruébalo ' + PLAN.prueba.diasProGratis + ' días gratis, sin tarjeta.') : null),
      acciones: [{ texto: 'Ahora no', clase: 'btn-borde' }, { texto: 'Ver Pro', clase: 'btn-primario', onclick: () => AF.app.abrir('Pro', (c) => V.pro.render(c)) }],
    });
  }
  // Llegó al tope de Gratis de algo (tarjetas, límites, metas…): lo dice con el número y ofrece Pro.
  function pedirLimite(clave, singular, plural) {
    const n = PLAN.limites.gratis[clave], st = AF.acceso.estado();
    hoja({
      titulo: 'Llegaste al tope de Gratis',
      cuerpo: h('p', { class: 'suave', estilo: { marginTop: '6px' } }, 'En Gratis puedes tener ' + n + ' ' + (n === 1 ? singular : plural) + '. Con Pro no hay tope.' + (st.tipo === 'gratis' && !AF.store.d.plan.inicioPrueba ? ' Pruébalo ' + PLAN.prueba.diasProGratis + ' días gratis, sin tarjeta.' : '')),
      acciones: [{ texto: 'Ahora no', clase: 'btn-borde' }, { texto: 'Ver Pro', clase: 'btn-primario', onclick: () => AF.app.abrir('Pro', (c) => V.pro.render(c)) }],
    });
  }
  // Si no tiene la función, muestra la invitación a Pro y devuelve false.
  function requiere(funcion) { if (AF.acceso.tiene(funcion)) return true; pedirPro(funcion); return false; }
  const gancho = (texto, funcion) => h('button', { class: 'nota pro', type: 'button', onclick: () => pedirPro(funcion), estilo: { width: '100%', textAlign: 'left' } },
    ico('estrella', 'relleno'), h('span', null, texto, ' ', AF.ui.chipPro()));

  /* --------------------------------------------------------- selector de categoría */
  function selectorCategoria(tipo, valor, alCambiar) {
    const caja = h('div', { class: 'opciones' });
    const pintar = (sel) => {
      AF.ui.vaciar(caja);
      AF.store.categorias(tipo).forEach((c) => caja.appendChild(h('button', { type: 'button', class: 'opcion', 'aria-pressed': c.id === sel ? 'true' : 'false', onclick: () => { alCambiar(c.id); pintar(c.id); } }, c.icono + ' ' + c.nombre)));
    };
    pintar(valor);
    return caja;
  }

  /* ------------------------------------------------------------------ formulario */
  // Alta y edición manual. o = { mov?, inicial?, alGuardar(m), alBorrar() }
  function formMovimiento(o) {
    const hoy = AF.app.hoy();
    const edit = !!o.mov;
    const m0 = Object.assign({ tipo: 'gasto', monto: '', cat: null, desc: '', fecha: hoy, cuenta: 'efectivo', nec: undefined }, o.inicial || {}, o.mov || {});
    const e = { tipo: m0.tipo, cat: m0.cat, nec: m0.nec === undefined ? 'auto' : m0.nec === null ? 'auto' : m0.nec, cuenta: m0.cuenta || 'efectivo', tarjetaId: m0.tarjetaId || null,
      modo: (m0.credito && m0.credito.modo) || 'corriente', conInteres: m0.credito ? m0.credito.interes !== false : false, meses: (m0.credito && m0.credito.meses) || 6, cuota: (m0.credito && m0.credito.cuota) || '' };
    if (!e.cat) e.cat = AF.store.categorias(e.tipo).find((c) => c.id === (e.tipo === 'gasto' ? 'otros' : 'sueldo')).id;
    const monto = h('input', { class: 'entrada grande', inputmode: 'decimal', placeholder: '0', value: m0.monto === '' ? '' : String(m0.monto).replace('.', ','), 'aria-label': 'Monto' });
    const desc = h('input', { class: 'entrada', placeholder: 'Detalle (opcional)', value: m0.desc || '', maxlength: 80 });
    const fecha = h('input', { class: 'entrada', type: 'date', value: m0.fecha, max: U.sumarDias(hoy, 366) });
    const zonaTipo = h('div'), zonaCat = h('div'), zonaNec = h('div'), zonaCuenta = h('div'), err = h('div', { class: 'ayuda', estilo: { color: 'var(--gasto)', minHeight: '18px', marginTop: '8px' } });

    function pintar() {
      AF.ui.vaciar(zonaTipo); AF.ui.vaciar(zonaCat); AF.ui.vaciar(zonaNec); AF.ui.vaciar(zonaCuenta);
      zonaTipo.appendChild(h('div', { class: 'segmentos' }, [['gasto', 'Gasto'], ['ingreso', 'Ingreso']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': e.tipo === k ? 'true' : 'false', onclick: () => {
        if (e.tipo !== k) { e.tipo = k; e.cat = AF.store.categorias(k)[0].id; if (k === 'ingreso') e.cuenta = 'efectivo'; pintar(); }
      } }, t))));
      zonaCat.appendChild(campo('Categoría', selectorCategoria(e.tipo, e.cat, (id) => { e.cat = id; })));
      if (e.tipo === 'gasto') {
        zonaNec.appendChild(campo('¿Necesario o gusto?', h('div', { class: 'segmentos' }, [['auto', 'Automático'], ['N', 'Necesario'], ['G', 'Gusto']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': e.nec === k ? 'true' : 'false', onclick: () => { e.nec = k; pintar(); } }, t)))));
        const tarjetas = AF.store.d.tarjetas;
        if (tarjetas.length) {
          zonaCuenta.appendChild(campo('¿Con qué pagaste?', h('div', { class: 'segmentos' }, [['efectivo', 'Efectivo o débito'], ['tarjeta', 'Tarjeta de crédito']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': e.cuenta === k ? 'true' : 'false', onclick: () => { e.cuenta = k; if (k === 'tarjeta' && !e.tarjetaId) e.tarjetaId = tarjetas[0].id; pintar(); } }, t)))));
          if (e.cuenta === 'tarjeta') {
            const sel = h('select', { class: 'entrada', onchange: (ev) => { e.tarjetaId = ev.target.value; } }, tarjetas.map((t) => h('option', { value: t.id, selected: t.id === e.tarjetaId }, t.nombre)));
            zonaCuenta.appendChild(campo('Tarjeta', sel));
            const pro = AF.acceso.tiene('tarjetaDiferidoCuotas');
            zonaCuenta.appendChild(campo('Forma de pago', h('div', { class: 'opciones' }, [['corriente', 'Corriente'], ['diferido', PLAN.pais(AF.store.d.ajustes.pais).palabraCuotas === 'diferido' ? 'Diferido' : 'En cuotas']].map(([k, t]) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': e.modo === k ? 'true' : 'false', onclick: () => { if (k === 'diferido' && !pro) { pedirPro('tarjetaDiferidoCuotas'); return; } e.modo = k; pintar(); } }, t, k === 'diferido' && !pro ? AF.ui.chipPro() : null)))));
            if (e.modo === 'diferido') {
              zonaCuenta.appendChild(campo('¿Con intereses?', h('div', { class: 'segmentos' }, [[false, 'Sin intereses'], [true, 'Con intereses']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': e.conInteres === k ? 'true' : 'false', onclick: () => { e.conInteres = k; pintar(); } }, t)))));
              zonaCuenta.appendChild(campo('Meses', h('div', { class: 'opciones' }, PLAN.tarjetas.mesesComunes.map((n) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': e.meses === n ? 'true' : 'false', onclick: () => { e.meses = n; pintar(); } }, String(n))))));
              if (e.conInteres) zonaCuenta.appendChild(campo('Valor de la cuota (opcional)', h('input', { class: 'entrada', inputmode: 'decimal', placeholder: 'Si lo sabes, mejor', value: e.cuota === '' ? '' : String(e.cuota).replace('.', ','), oninput: (ev) => { e.cuota = ev.target.value; } }), 'Si no la pones, uso la tasa de tu tarjeta. Nunca invento una tasa.'));
            }
          }
        }
      }
    }
    pintar();

    const cuerpo = h('div', null, zonaTipo,
      campo('Monto', monto), zonaCat, campo('Detalle', desc), campo('Fecha', fecha), zonaNec, zonaCuenta, err);

    function leer() {
      const v = U.parseNumero(monto.value);
      if (!(v > 0)) { err.textContent = 'Escribe un monto mayor que cero.'; monto.focus(); return null; }
      if (!fecha.value) { err.textContent = 'Elige la fecha.'; return null; }
      const m = { tipo: e.tipo, monto: U.r2(v), cat: e.cat, desc: desc.value.trim(), fecha: fecha.value };
      if (e.tipo === 'gasto') {
        const c = catDe(e.cat);
        m.nec = e.nec === 'auto' ? (c.nec || null) : e.nec;
        m.cuenta = e.cuenta;
        if (e.cuenta === 'tarjeta') {
          m.tarjetaId = e.tarjetaId;
          m.credito = e.modo === 'diferido' ? { modo: 'diferido', meses: e.meses, interes: e.conInteres, cuota: e.conInteres && e.cuota !== '' ? U.parseNumero(e.cuota) : null } : { modo: 'corriente' };
        }
      }
      return m;
    }
    const acciones = [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => { const m = leer(); if (!m) return false; o.alGuardar(m); } }];
    if (edit) acciones.unshift({ texto: 'Eliminar', clase: 'btn-borde btn-peligro', onclick: () => { if (o.alBorrar) o.alBorrar(); } });
    return hoja({ titulo: edit ? 'Editar movimiento' : 'Agregar movimiento', cuerpo, acciones });
  }

  // Guardar / editar / borrar con aviso y "Deshacer"
  function guardarMov(m, existente) {
    const S = AF.store;
    if (existente) { S.editar('movs', existente.id, m, 'Cambié un movimiento'); aviso('Cambios guardados', { texto: 'Deshacer', onclick: () => S.deshacer() }); }
    else { S.agregar('movs', m, 'Agregué un movimiento'); aviso('Guardado', { texto: 'Deshacer', onclick: () => S.deshacer() }); }
  }
  function borrarMov(m) { AF.store.borrar('movs', m.id, 'Borré un movimiento'); aviso('Movimiento borrado', { texto: 'Deshacer', onclick: () => AF.store.deshacer() }); }
  function editarMov(m) {
    formMovimiento({ mov: m, alGuardar: (nuevo) => guardarMov(nuevo, m), alBorrar: () => { borrarMov(m); } });
  }

  V.comun = { pedirLimite, fraseAnotada, filaMov, subDeMov, agruparPorDia, confirmar, pedirPro, requiere, gancho, selectorCategoria, formMovimiento, guardarMov, borrarMov, editarMov, catDe };
})(typeof window !== 'undefined' ? window : globalThis);
