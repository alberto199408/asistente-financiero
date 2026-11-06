/* Inicio: «cuánto puedes gastar hoy», alertas, necesario vs gusto, hormiga y últimos movimientos. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, fila } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const $ = (n) => U.dinero(n);
  const C = () => V.comun;

  const SUGERENCIAS = ['Pagué 30 dólares de luz', 'Me pagaron el sueldo, 1.200', 'Cuánto gasté este mes'];

  function horizonte(D, hoy) {
    const modo = AF.acceso.tiene('puedesGastarHoyCompleto') ? 'completo' : 'simple';
    const p = AF.informes.puedesGastarHoy(D, hoy, modo);
    const nombre = D.ajustes.nombre || '';
    const hora = new Date().getHours();
    const saludo = (hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches') + (nombre ? ', ' + nombre : '') + (hora < 6 ? ' 🌙' : hora < 12 ? ' ☀️' : hora < 19 ? ' 🌤️' : ' 🌙');
    const cab = h('div', { class: 'saludo' },
      h('div', { class: 'avatar', 'aria-hidden': 'true' }, (nombre || '·').charAt(0).toUpperCase()),
      h('div', { class: 'saludo-texto' }, saludo),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Ajustes', onclick: () => AF.app.abrir('Ajustes', (c) => V.mas.ajustes(c)) }, ico('ajustes')));
    const el = h('section', { class: 'horizonte', 'aria-label': 'Cuánto puedes gastar hoy' }, cab);

    if (!p.ingresos) {
      el.appendChild(h('div', { class: 'cifra-bloque' },
        h('div', { class: 'cifra-etiqueta' }, 'Hoy puedes gastar'),
        h('div', { class: 'cifra' }, '—'),
        h('p', { class: 'cifra-pie suave' }, 'Registra tu sueldo y te digo cuánto puedes gastar cada día hasta tu cobro.'),
        h('button', { class: 'btn btn-voz', type: 'button', estilo: { marginTop: '18px' }, onclick: () => C().formMovimiento({ inicial: { tipo: 'ingreso', cat: 'sueldo', monto: D.ajustes.sueldo || '' }, alGuardar: (m) => C().guardarMov(m) }) }, 'Registrar mi sueldo')));
      return el;
    }
    const pasado = p.hoyDisponible < 0;
    const usado = p.ingresos > 0 ? Math.min(1, Math.max(0, (p.gastadoAntes + p.gastadoHoy + p.fijos + p.cuotas + p.metas) / p.ingresos)) : 0;
    const cobro = U.deISO(p.proximo).getDate() + ' de ' + U.nombreMes(p.proximo);
    el.appendChild(h('div', { class: 'cifra-bloque' },
      h('div', { class: 'cifra-etiqueta' }, pasado ? 'Hoy te pasaste de lo que podías gastar' : 'Hoy puedes gastar'),
      h('div', { class: 'cifra' + (pasado ? ' pasado' : ''), 'aria-live': 'polite' }, h('span', { class: 'cambio-cifra' }, $(p.hoyDisponible))),
      h('p', { class: 'cifra-pie suave' }, p.disponible > 0
        ? 'Te quedan ' + $(p.resto) + ' hasta tu cobro del ' + cobro + ' (' + p.dias + (p.dias === 1 ? ' día' : ' días') + ').'
        : 'Ya no te queda dinero para este periodo. Tu cobro es el ' + cobro + '.')));
    el.appendChild(h('div', { class: 'avance' + (usado > 0.9 ? ' alerta' : ''), role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(usado * 100), 'aria-label': 'Dinero usado de tu ingreso' }, h('i', { estilo: { width: Math.round(usado * 100) + '%' } })));
    const datos = [['Ingresos', $(p.ingresos)], ['Gastos', $(p.gastadoAntes + p.gastadoHoy)]];
    el.appendChild(h('div', { class: 'dos-datos' }, datos.map(([t, v]) => h('div', null, h('div', { class: 'dato-etiqueta suave' }, t), h('div', { class: 'dato-valor' }, v)))));
    if (p.estimado || p.fijos || p.cuotas || p.metas) {
      const notas = [];
      if (p.estimado) notas.push('Usando tu sueldo de ajustes');
      if (p.fijos) notas.push('ya aparté ' + $(p.fijos) + ' de pagos fijos');
      if (p.cuotas) notas.push($(p.cuotas) + ' de cuotas de tarjeta');
      if (p.metas) notas.push($(p.metas) + ' para metas');
      el.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '14px' } }, U.cap(notas.join(' · ')) + '.'));
    }
    return el;
  }

  function seccionNecGusto(D, hoy) {
    const t = AF.informes.totales(D, U.inicioMes(hoy), U.finMes(hoy));
    const tot = t.nec.N + t.nec.G + t.nec.sin;
    if (!tot) return null;
    const pc = (v) => Math.round((v / tot) * 100);
    return h('section', { class: 'seccion' },
      h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Necesario o gusto')),
      h('div', { class: 'barra-dividida', role: 'img', 'aria-label': 'Necesario ' + pc(t.nec.N) + ' por ciento, gusto ' + pc(t.nec.G) + ' por ciento' },
        t.nec.N ? h('i', { class: 'seg-nec', estilo: { flex: t.nec.N } }) : null, t.nec.G ? h('i', { class: 'seg-gus', estilo: { flex: t.nec.G } }) : null, t.nec.sin ? h('i', { class: 'seg-sin', estilo: { flex: t.nec.sin } }) : null),
      h('div', { class: 'leyenda' },
        h('span', null, h('i', { class: 'seg-nec' }), 'Necesario ' + $(t.nec.N) + ' · ' + pc(t.nec.N) + ' %'),
        h('span', null, h('i', { class: 'seg-gus' }), 'Gusto ' + $(t.nec.G) + ' · ' + pc(t.nec.G) + ' %'),
        t.nec.sin ? h('span', null, h('i', { class: 'seg-sin' }), 'Sin clasificar ' + $(t.nec.sin)) : null));
  }

  function seccionHormiga(D, hoy) {
    const hm = AF.informes.hormiga(D, U.inicioMes(hoy), U.finMes(hoy));
    if (!hm.veces) return null;
    const pro = AF.acceso.tiene('hormigaDetalle');
    return h('section', { class: 'seccion' },
      h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Gastos hormiga')),
      fila({ icono: '🐜', titulo: $(hm.total) + ' este mes', sub: hm.veces + (hm.veces === 1 ? ' compra pequeña' : ' compras pequeñas') + ' · al año serían ' + $(hm.alAnio), derecha: pro ? ico('derecha') : AF.ui.chipPro(),
        onclick: () => (pro ? AF.app.abrir('Gastos hormiga', (c) => V.informesUI.hormiga(c)) : C().pedirPro('hormigaDetalle')) }));
  }

  function seccionUltimos(D, hoy) {
    const movs = D.movs.slice().sort((a, b) => (b.fecha === a.fecha ? b.creado - a.creado : b.fecha < a.fecha ? -1 : 1)).slice(0, 5);
    if (!movs.length) {
      return h('section', { class: 'seccion' }, h('div', { class: 'vacio' }, h('strong', null, 'Aquí aparecerán tus movimientos'), 'Toca el micrófono y dilo como lo dirías:',
        h('div', { class: 'opciones', estilo: { marginTop: '14px' } }, SUGERENCIAS.map((s) => h('button', { class: 'opcion', type: 'button', onclick: () => V.voz.abrir({ modo: 'texto', texto: s }) }, '«' + s + '»')))));
    }
    return h('section', { class: 'seccion' },
      h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Últimos movimientos'), h('button', { class: 'enlace', type: 'button', onclick: () => AF.app.ir('movimientos') }, 'Ver todo')),
      h('div', { class: 'lista' }, movs.map((m) => C().filaMov(m, hoy, () => C().editarMov(m), true))));
  }

  function render(cont) {
    const D = AF.store.d, hoy = AF.app.hoy();
    cont.appendChild(horizonte(D, hoy));
    const cuerpo = h('div', { class: 'contenido' });
    const st = AF.acceso.estado(hoy);
    if (st.tipo === 'prueba') cuerpo.appendChild(h('button', { class: 'nota pro', type: 'button', estilo: { width: '100%', textAlign: 'left', marginTop: '20px' }, onclick: () => AF.app.abrir('Pro', (c) => V.pro.render(c)) },
      ico('estrella', 'relleno'), h('span', null, h('strong', null, 'Pro gratis: ' + (st.diasPrueba === 1 ? 'te queda 1 día' : 'te quedan ' + st.diasPrueba + ' días') + '. '), 'Mira qué conservas después.')));
    AF.informes.alertas(D, hoy, AF.acceso.tiene('alertasPredictivas')).slice(0, 2).forEach((a) => {
      cuerpo.appendChild(h('div', { class: 'nota', estilo: { marginTop: '16px' }, role: 'status' }, ico('alerta'), h('span', null, a.texto)));
    });
    [seccionNecGusto(D, hoy), seccionHormiga(D, hoy), seccionUltimos(D, hoy)].forEach((s) => s && cuerpo.appendChild(s));
    cuerpo.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '28px', textAlign: 'center' } }, PLAN.app.avisoLegal));
    cont.appendChild(cuerpo);
  }

  V.inicio = { render };
})(typeof window !== 'undefined' ? window : globalThis);
