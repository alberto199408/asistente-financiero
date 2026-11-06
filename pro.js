/* Pro: plan y precios, SRI, simulador, pareja/familia y viajes con otras monedas. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, hoja, aviso, fila, campo } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const S = () => AF.store, N = () => AF.nativo, C = () => V.comun;
  const $ = (n, o) => U.dinero(n, o);
  const num = (el) => U.parseNumero(el.value);
  const entrada = (ph, val, etq) => h('input', { class: 'entrada', inputmode: 'decimal', placeholder: ph || '', value: val == null ? '' : String(val).replace('.', ','), 'aria-label': etq || ph });

  /* ------------------------------------------------------------------ pantalla Pro */
  const ETIQUETAS = {
    entenderFraseLibreIA: 'Entiende frases libres con IA', corregirLibreIA: 'Corrige con IA, con tus propias palabras', preguntasLibresIA: 'Responde cualquier pregunta sobre tu plata',
    puedesGastarHoyCompleto: '«Hoy puedes gastar» con cuotas y metas', hormigaDetalle: 'Qué gastos hormiga son y cuánto ahorrarías', presupuestoPorCategoria: 'Límites por categoría',
    tarjetaDiferidoCuotas: 'Diferidos y cuotas con intereses', asesorTarjeta: '¿Pago el mínimo o el total?', meConviene: '«¿Me conviene?» antes de comprar', simulador: 'Simulador «¿qué pasa si…?»',
    alertasPredictivas: 'Alertas que se adelantan', sri: 'SRI: gastos deducibles (Ecuador)', fotoFacturaProductos: 'Factura foto: producto por producto', compartirCaptura: 'Compartir captura de tu resumen',
    importarPDF: 'Importar estado de cuenta', conciliar: 'Conciliar con tu estado de cuenta', suscripcionesDetectadas: 'Detecta suscripciones solo', cobroPorWhatsApp: 'Cobros por WhatsApp',
    parejaFamilia: 'Pareja o familia', resumenAnualAcumulado: 'Año completo y acumulado', compararMeses: 'Comparar meses', pdfMensualBasico: 'PDF mensual', pdfProfesional: 'PDF completo para compartir',
    exportarExcel: 'Exportar a Excel', variasMonedasViajes: 'Viajes y otras monedas',
  };
  const LIMITES_TXT = { tarjetas: 'Tarjetas', presupuestos: 'Límites de gasto', metas: 'Metas de ahorro', pagosFijos: 'Pagos fijos', prestamos: 'Préstamos entre personas', categoriasPropias: 'Categorías propias' };

  function render(cont) {
    const st = AF.acceso.estado(AF.app.hoy()), p = PLAN.precios;
    const cab = h('section', { class: 'nota pro', estilo: { alignItems: 'center' } }, ico('estrella', 'relleno'), h('div', null,
      st.tipo === 'pro' ? h('div', null, h('strong', null, 'Eres Pro'), ' hasta el ' + U.fechaCorta(st.hasta, AF.app.hoy()) + '.')
        : st.tipo === 'prueba' ? h('div', null, h('strong', null, 'Pro gratis: ' + (st.diasPrueba === 1 ? 'te queda 1 día' : 'te quedan ' + st.diasPrueba + ' días')), '. Después sigues con Gratis; no pierdes tus datos.')
          : h('div', null, h('strong', null, 'Estás en Gratis'), '. Todo lo básico funciona; Pro suma lo de abajo.')));
    cont.appendChild(cab);
    if (st.tipo === 'gratis' && !S().d.plan.inicioPrueba) {
      cont.appendChild(h('button', { class: 'btn btn-voz btn-bloque', type: 'button', estilo: { marginTop: '16px' }, onclick: () => { AF.acceso.iniciarPrueba(AF.app.hoy()); AF.bus.emit('plan'); aviso('Pro activado ' + PLAN.prueba.diasProGratis + ' días'); } }, 'Probar Pro ' + PLAN.prueba.diasProGratis + ' días gratis'));
      cont.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '8px', textAlign: 'center' } }, 'Sin tarjeta. Si no te gusta, sigues en Gratis.'));
    }
    const filas = [h('div', { class: 'cab' }, ''), h('div', { class: 'cab centro' }, 'Gratis'), h('div', { class: 'cab centro' }, 'Pro')];
    Object.keys(PLAN.limites.gratis).forEach((k) => {
      if (!LIMITES_TXT[k]) return;
      const gv = PLAN.limites.gratis[k], pv = PLAN.limites.pro[k];
      filas.push(h('div', null, LIMITES_TXT[k]), h('div', { class: 'centro num' }, gv === 0 ? '—' : String(gv)), h('div', { class: 'centro num' }, pv == null ? '∞' : String(pv)));
    });
    Object.keys(PLAN.funciones).forEach((k) => {
      const f = PLAN.funciones[k]; if (f.g || !f.p || !ETIQUETAS[k]) return;
      if (k === 'sri' && !PLAN.pais(S().d.ajustes.pais).sri) return;
      filas.push(h('div', null, ETIQUETAS[k]), h('div', { class: 'centro suave' }, '—'), h('div', { class: 'centro', estilo: { color: 'var(--acento)' } }, ico('ok', 'chico')));
    });
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Lo que cambia')), h('div', { class: 'pro-comparar' }, filas)));
    if (st.tipo !== 'pro') {
      const ahorro = Math.round((1 - p.anualUSD / (p.mensualUSD * 12)) * 100);
      cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Elige tu plan')),
        h('div', { estilo: { display: 'flex', flexDirection: 'column', gap: '10px' } },
          h('button', { class: 'btn btn-primario btn-bloque', type: 'button', onclick: () => comprar('anual') }, 'Anual · ' + $(p.anualUSD, { moneda: 'USD', fijo: true }) + ' al año (ahorras ' + ahorro + ' %)'),
          h('button', { class: 'btn btn-borde btn-bloque', type: 'button', onclick: () => comprar('mensual') }, 'Mensual · ' + $(p.mensualUSD, { moneda: 'USD', fijo: true }) + ' al mes'),
          h('button', { class: 'btn-texto', type: 'button', onclick: restaurar }, 'Ya pagué: restaurar mi compra')),
        h('p', { class: 'texto-xs suave', estilo: { marginTop: '12px' } }, 'El cobro lo hace Google Play y puedes cancelar cuando quieras desde Play. Los precios pueden variar según tu país.')));
    }
  }
  async function comprar(plan) {
    try {
      const r = await N().comprarPro(plan);
      const hasta = U.sumarDias(AF.app.hoy(), plan === 'anual' ? 366 : 32);
      AF.acceso.activarPro(hasta); aviso('¡Listo! Ya eres Pro'); return r;
    } catch (e) {
      aviso(e.codigo === 'cancelado' ? 'Compra cancelada' : e.codigo === 'solo_app' ? 'El pago de Pro se activa con la versión de Google Play. Mientras tanto tienes los días de prueba.' : 'Pro aún no está disponible en Google Play.');
    }
  }
  async function restaurar() {
    const l = await N().restaurarCompras();
    const act = l.filter((x) => x.isActive !== false);
    if (act.length) { const f = act.map((x) => x.expirationDate).filter(Boolean).sort().pop(); AF.acceso.activarPro(f ? String(f).slice(0, 10) : U.sumarDias(AF.app.hoy(), 31)); aviso('Pro restaurado'); }
    else aviso('No encontré una compra activa.');
  }
  // Se llama al entrar: si hay una suscripción vigente, la respeta aunque el teléfono sea nuevo.
  async function verificarCompras() { try { const l = await N().restaurarCompras(); const act = l.filter((x) => x.isActive !== false); if (act.length) { const f = act.map((x) => x.expirationDate).filter(Boolean).sort().pop(); if (f) AF.acceso.activarPro(String(f).slice(0, 10)); } } catch (e) { /* sin conexión: queda lo guardado */ } }

  /* ------------------------------------------------------------------------- SRI */
  const bloqueado = (cont, fn, texto) => {
    if (AF.acceso.tiene(fn)) return false;
    cont.appendChild(h('div', { class: 'vacio' }, h('strong', null, 'Esto es de Pro'), AF.acceso.explicacion(fn), h('div', { estilo: { marginTop: '14px' } }, h('button', { class: 'btn btn-primario', type: 'button', onclick: () => AF.app.abrir('Pro', (c) => render(c)) }, 'Ver Pro'))));
    return true;
  };
  function sri(cont) {
    if (bloqueado(cont, 'sri')) return;
    const D = S().d, anio = Number(AF.app.hoy().slice(0, 4)), r = AF.informes.sri(D, anio), rub = PLAN.sri.rubros;
    cont.appendChild(h('div', { class: 'horizonte', estilo: { margin: '0 calc(var(--margen) * -1)', borderRadius: '28px' } },
      h('div', { class: 'cifra-etiqueta' }, 'Rebaja aproximada de impuestos ' + anio), h('div', { class: 'cifra', estilo: { fontSize: '52px' } }, $(r.rebaja)),
      h('p', { class: 'cifra-pie suave' }, 'Es el ' + Math.round(PLAN.sri.porcentajeRebaja * 100) + ' % de tus gastos deducibles (' + $(r.base) + '), hasta un máximo para tus ' + r.cargas + (r.cargas === 1 ? ' carga' : ' cargas') + ': ' + $(r.tope) + '.')));
    cont.appendChild(h('div', { class: 'nota', estilo: { marginTop: '16px' } }, ico('info'), h('span', null, 'Es una estimación. Solo cuentan gastos con factura a tu nombre y dentro de lo que permite el SRI. Revisa tu formulario de gastos personales' + (PLAN.sri.formularioMes ? ' (se entrega en ' + PLAN.sri.formularioMes + ')' : '') + '.')));
    if (r.total > r.tope) cont.appendChild(h('div', { class: 'nota', estilo: { marginTop: '10px' } }, ico('alerta'), h('span', null, 'Tus gastos deducibles (' + $(r.total) + ') ya pasan el tope de ' + $(r.tope) + '. Lo de más no suma.')));
    else cont.appendChild(h('p', { class: 'texto-sm suave', estilo: { marginTop: '12px' } }, 'Aún podrías deducir ' + $(r.tope - r.total) + ' más antes de llegar al tope.'));
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Por rubro')),
      r.porRubro.length ? h('div', { class: 'lista' }, r.porRubro.map((x) => fila({ icono: '🏛️', titulo: x.nombre, derecha: h('span', { class: 'monto' }, $(x.total)) }))) : h('p', { class: 'suave' }, 'Aún no hay gastos en rubros deducibles este año.')));
    const gastos = D.movs.filter((m) => m.tipo === 'gasto' && m.fecha.startsWith(String(anio))).sort((a, b) => b.monto - a.monto).slice(0, 25);
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Tus gastos más grandes')), h('p', { class: 'texto-sm suave' }, 'Toca uno para decir si es deducible y de qué rubro.'),
      h('div', { class: 'lista' }, gastos.map((m) => { const rb = m.sri !== undefined ? m.sri : C().catDe(m.cat).sri;
        return fila({ icono: C().catDe(m.cat).icono, titulo: m.desc || C().catDe(m.cat).nombre, sub: rb ? rub[rb] : 'No deducible', derecha: h('span', { class: 'monto' }, $(m.monto)), onclick: () => elegirRubro(m) }); }))));
  }
  function elegirRubro(m) {
    hoja({ titulo: '¿De qué rubro es?', cuerpo: h('div', { class: 'opciones', estilo: { marginTop: '12px' } }, Object.entries(PLAN.sri.rubros).map(([k, t]) => h('button', { type: 'button', class: 'opcion', onclick: (e) => { S().editar('movs', m.id, { sri: k }, 'Marqué como deducible'); e.currentTarget.closest('.hoja').previousSibling.click(); } }, t)).concat(h('button', { type: 'button', class: 'opcion', onclick: (e) => { S().editar('movs', m.id, { sri: null }, 'Marqué como no deducible'); e.currentTarget.closest('.hoja').previousSibling.click(); } }, 'No deducible'))) });
  }

  /* ----------------------------------------------------------------------- simulador */
  function simulador(cont) {
    if (bloqueado(cont, 'simulador')) return;
    const D = S().d, hoy = AF.app.hoy();
    let modo = 'compra';
    const caja = h('div'); const tabs = h('div', { class: 'segmentos', estilo: { marginBottom: '8px' } });
    const salida = h('div', { 'aria-live': 'polite', estilo: { marginTop: '18px' } });
    const pintarTabs = () => { AF.ui.vaciar(tabs); [['compra', 'Una compra'], ['ahorro', 'Ahorrar'], ['recorte', 'Gastar menos']].forEach(([k, t]) => tabs.appendChild(h('button', { type: 'button', 'aria-pressed': modo === k ? 'true' : 'false', onclick: () => { modo = k; pintar(); } }, t))); };
    function pintar() {
      pintarTabs(); AF.ui.vaciar(caja); AF.ui.vaciar(salida);
      const hoyPG = AF.informes.puedesGastarHoy(D, hoy, 'completo');
      if (modo === 'compra') {
        const monto = entrada('0', '', 'Precio'), meses = entrada('6', '', 'Meses'), tasa = entrada('Tasa anual %', '', 'Tasa anual');
        let forma = 'contado';
        const zona = h('div'), btns = h('div', { class: 'opciones', estilo: { marginTop: '10px' } });
        const calc = () => {
          AF.ui.vaciar(salida);
          const m = num(monto); if (!(m > 0)) return;
          const n = Math.round(num(meses)) || 0;
          const lineas = [];
          if (forma === 'contado') lineas.push(['Pagas hoy', $(m)], ['Te quedarían hasta el cobro', $(hoyPG.resto - m)]);
          else {
            if (!(n >= 1)) { salida.appendChild(h('p', { class: 'suave' }, 'Pon los meses.')); return; }
            let cuota, total;
            if (forma === 'sin') { cuota = U.r2(m / n); total = m; }
            else { const t = num(tasa); if (t == null) { salida.appendChild(h('p', { class: 'suave' }, 'Pon la tasa anual de tu tarjeta para calcular los intereses.')); return; } cuota = AF.tarjetas.cuotaFrancesa(m, t, n); total = U.r2(cuota * n); }
            lineas.push(['Cuota mensual', $(cuota)], ['Total que pagarás', $(total)], ['Intereses', $(total - m)], ['Tu cuota frente a lo que gastas por día', Math.round((cuota / Math.max(1, hoyPG.porDia * 30)) * 100) + ' % de tu presupuesto mensual disponible']);
          }
          salida.appendChild(h('div', { class: 'lista' }, lineas.map(([a, b]) => h('div', { class: 'interruptor', estilo: { minHeight: '48px' } }, h('span', null, a), h('strong', { class: 'num' }, b)))));
          salida.appendChild(h('p', { class: 'texto-xs suave' }, 'Simulación: no cambia tus datos.'));
        };
        const pintForma = () => { AF.ui.vaciar(btns); [['contado', 'De contado'], ['sin', 'Sin intereses'], ['con', 'Con intereses']].forEach(([k, t]) => btns.appendChild(h('button', { type: 'button', class: 'opcion', 'aria-pressed': forma === k ? 'true' : 'false', onclick: () => { forma = k; pintForma(); AF.ui.vaciar(zona); if (k !== 'contado') zona.appendChild(campo('Meses', meses)); if (k === 'con') zona.appendChild(campo('Tasa anual %', tasa, 'La de tu tarjeta; no la invento.')); calc(); } }, t))); };
        [monto, meses, tasa].forEach((i) => i.addEventListener('input', calc));
        pintForma(); caja.appendChild(campo('Si compro algo de', monto)); caja.appendChild(btns); caja.appendChild(zona);
      } else if (modo === 'ahorro') {
        const mes = entrada('0', '', 'Por mes'), meses = entrada('12', '', 'Meses');
        const calc = () => { AF.ui.vaciar(salida); const a = num(mes), n = Math.round(num(meses)); if (!(a > 0 && n > 0)) return; salida.appendChild(h('p', { class: 'voz-respuesta', estilo: { color: 'var(--tinta)' } }, 'Ahorrando ' + $(a) + ' al mes, en ' + n + ' meses tendrías ' + $(a * n) + '.')); salida.appendChild(h('p', { class: 'texto-sm suave' }, 'Equivale a ' + $(U.r2(a / 30)) + ' por día. Sin contar intereses.')); };
        [mes, meses].forEach((i) => i.addEventListener('input', calc)); caja.appendChild(campo('Si ahorro por mes', mes)); caja.appendChild(campo('Durante cuántos meses', meses));
      } else {
        const hasta = U.finMes(hoy), t = AF.informes.totales(D, U.inicioMes(hoy), hasta);
        const pcs = entrada('10', '', 'Porcentaje'); let cat = t.porCategoria[0] ? t.porCategoria[0].id : null;
        const zonaCat = h('div', { class: 'opciones', estilo: { marginTop: '10px' } });
        const calc = () => { AF.ui.vaciar(salida); const p = num(pcs); const c = t.porCategoria.find((x) => x.id === cat); if (!c || !(p > 0 && p <= 100)) return; const ah = U.r2(c.total * (p / 100)); salida.appendChild(h('p', { class: 'voz-respuesta', estilo: { color: 'var(--tinta)' } }, 'Si bajas ' + p + ' % en ' + c.cat.nombre.toLowerCase() + ', ahorras ' + $(ah) + ' al mes y ' + $(ah * 12) + ' al año.')); salida.appendChild(h('p', { class: 'texto-sm suave' }, 'Calculado con lo que gastaste este mes en esa categoría (' + $(c.total) + ').')); };
        const pintCat = () => { AF.ui.vaciar(zonaCat); t.porCategoria.slice(0, 8).forEach((c) => zonaCat.appendChild(h('button', { type: 'button', class: 'opcion', 'aria-pressed': cat === c.id ? 'true' : 'false', onclick: () => { cat = c.id; pintCat(); calc(); } }, c.cat.icono + ' ' + c.cat.nombre))); };
        pcs.addEventListener('input', calc);
        if (!t.porCategoria.length) caja.appendChild(h('p', { class: 'suave' }, 'Aún no tienes gastos este mes para simular.')); else { pintCat(); caja.appendChild(campo('¿En qué categoría?', zonaCat)); caja.appendChild(campo('Cuánto menos (%)', pcs)); }
      }
    }
    cont.appendChild(h('p', { class: 'suave', estilo: { marginTop: '4px' } }, 'Prueba antes de decidir. Nada de esto toca tus datos reales.'));
    cont.appendChild(h('div', { estilo: { marginTop: '14px' } }, tabs)); cont.appendChild(caja); cont.appendChild(salida);
    pintar();
  }

  /* --------------------------------------------------------------- pareja / familia */
  // El grupo vive en este teléfono (sin nube); se comparte el resumen por mensaje. Cada gasto: quién pagó y entre quiénes se divide.
  function grupoDatos() {
    const D = S().d; D.grupo = D.grupo || [];
    let cfg = D.grupo.find((x) => x.tipo === 'config');
    if (!cfg) cfg = S().agregar('grupo', { tipo: 'config', miembros: [{ id: 'yo', nombre: D.ajustes.nombre || 'Yo' }] }, 'Creé el grupo');
    return cfg;
  }
  function saldos(cfg, gastos) {
    const s = {}; cfg.miembros.forEach((m) => { s[m.id] = 0; });
    gastos.forEach((x) => {
      const entre = (x.entre && x.entre.length ? x.entre : cfg.miembros.map((m) => m.id)).filter((id) => s[id] != null);
      if (!entre.length) return;
      const parte = x.monto / entre.length;
      if (s[x.pagoPor] != null) s[x.pagoPor] += x.monto; entre.forEach((id) => { s[id] -= parte; });
    });
    return s;
  }
  function transferencias(s, nombres) {
    const deudores = Object.entries(s).filter(([, v]) => v < -0.005).map(([id, v]) => [id, -v]).sort((a, b) => b[1] - a[1]);
    const acreedores = Object.entries(s).filter(([, v]) => v > 0.005).sort((a, b) => b[1] - a[1]).map(([id, v]) => [id, v]);
    const out = []; let i = 0, j = 0;
    while (i < deudores.length && j < acreedores.length) { const m = Math.min(deudores[i][1], acreedores[j][1]); out.push({ de: deudores[i][0], a: acreedores[j][0], monto: U.r2(m) }); deudores[i][1] -= m; acreedores[j][1] -= m; if (deudores[i][1] < 0.005) i++; if (acreedores[j][1] < 0.005) j++; }
    return out;
  }
  function pareja(cont) {
    if (bloqueado(cont, 'parejaFamilia')) return;
    const cfg = grupoDatos(), D = S().d, hoy = AF.app.hoy();
    const gastos = D.grupo.filter((x) => x.tipo === 'gasto').sort((a, b) => (b.fecha === a.fecha ? b.creado - a.creado : b.fecha < a.fecha ? -1 : 1));
    const nombre = (id) => (cfg.miembros.find((m) => m.id === id) || { nombre: '—' }).nombre;
    const sd = saldos(cfg, gastos), tr = transferencias(sd);
    cont.appendChild(h('p', { class: 'suave', estilo: { marginTop: '4px' } }, 'Anota lo que pagan entre varios y te digo quién le debe a quién. Se guarda en este teléfono.'));
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Personas'), h('button', { class: 'enlace', type: 'button', onclick: () => nuevoMiembro(cfg) }, 'Agregar')),
      h('div', { class: 'opciones' }, cfg.miembros.map((m) => h('span', { class: 'chip' }, m.nombre)))));
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Quién debe a quién')),
      tr.length ? h('div', { class: 'lista' }, tr.map((t) => fila({ icono: '💸', titulo: nombre(t.de) + ' le debe a ' + nombre(t.a), derecha: h('span', { class: 'monto' }, $(t.monto)), onclick: () => saldar(cfg, t) }))) : h('p', { class: 'suave' }, gastos.length ? 'Están a mano.' : 'Aún no hay gastos compartidos.'),
      tr.length ? h('button', { class: 'btn btn-borde btn-bloque', type: 'button', estilo: { marginTop: '12px' }, onclick: () => N().compartirTexto('Cuentas', tr.map((t) => nombre(t.de) + ' le debe ' + $(t.monto) + ' a ' + nombre(t.a)).join('\n')) }, ico('enviar'), 'Compartir las cuentas') : null));
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Gastos compartidos'), h('button', { class: 'enlace', type: 'button', onclick: () => nuevoGasto(cfg) }, 'Agregar')),
      gastos.length ? h('div', { class: 'lista' }, gastos.slice(0, 40).map((x) => fila({ icono: x.liquidacion ? '🤝' : '🧾', titulo: x.desc || (x.liquidacion ? 'Pago entre ustedes' : 'Gasto'), sub: (x.liquidacion ? nombre(x.pagoPor) + ' pagó a ' + nombre(x.entre[0]) : 'Pagó ' + nombre(x.pagoPor)) + ' · ' + U.fechaCorta(x.fecha, hoy), derecha: h('span', { class: 'monto' }, $(x.monto)), onclick: () => borrarGasto(x) }))) : h('p', { class: 'suave' }, 'Toca «Agregar» para anotar el primero.')));
  }
  function nuevoMiembro(cfg) {
    const inp = h('input', { class: 'entrada', placeholder: 'Nombre', maxlength: 24, 'aria-label': 'Nombre' });
    hoja({ titulo: 'Agregar persona', cuerpo: campo('Nombre', inp), acciones: [{ texto: 'Agregar', clase: 'btn-primario', onclick: () => { const n = inp.value.trim(); if (!n) return false; S().editar('grupo', cfg.id, { miembros: cfg.miembros.concat([{ id: U.uid(), nombre: n }]) }, 'Agregué a ' + n); } }] });
    setTimeout(() => inp.focus(), 150);
  }
  function nuevoGasto(cfg) {
    const desc = h('input', { class: 'entrada', placeholder: 'Ej.: Supermercado', maxlength: 60, 'aria-label': 'Detalle' }), monto = entrada('0', '', 'Monto');
    let paga = cfg.miembros[0].id; const entre = new Set(cfg.miembros.map((m) => m.id));
    const zP = h('div', { class: 'opciones' }), zE = h('div', { class: 'opciones' });
    const pint = () => { AF.ui.vaciar(zP); AF.ui.vaciar(zE); cfg.miembros.forEach((m) => { zP.appendChild(h('button', { type: 'button', class: 'opcion', 'aria-pressed': paga === m.id ? 'true' : 'false', onclick: () => { paga = m.id; pint(); } }, m.nombre)); zE.appendChild(h('button', { type: 'button', class: 'opcion', 'aria-pressed': entre.has(m.id) ? 'true' : 'false', onclick: () => { entre.has(m.id) ? entre.delete(m.id) : entre.add(m.id); pint(); } }, m.nombre)); }); };
    pint();
    hoja({ titulo: 'Gasto compartido', cuerpo: h('div', null, campo('Detalle', desc), campo('Monto', monto), campo('¿Quién pagó?', zP), campo('¿Entre quiénes se divide?', zE)), acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
      const v = num(monto); if (!(v > 0) || !entre.size) return false;
      S().agregar('grupo', { tipo: 'gasto', desc: desc.value.trim(), monto: U.r2(v), pagoPor: paga, entre: Array.from(entre), fecha: AF.app.hoy() }, 'Anoté un gasto compartido'); aviso('Anotado');
    } }] });
  }
  function saldar(cfg, t) {
    C().confirmar({ titulo: '¿Ya pagó?', texto: 'Se anota que ' + cfg.miembros.find((m) => m.id === t.de).nombre + ' le pagó ' + $(t.monto) + ' a ' + cfg.miembros.find((m) => m.id === t.a).nombre + '.', si: 'Sí, ya pagó' }).then((ok) => {
      if (ok) S().agregar('grupo', { tipo: 'gasto', liquidacion: true, desc: 'Pago entre ustedes', monto: t.monto, pagoPor: t.de, entre: [t.a], fecha: AF.app.hoy() }, 'Saldé una cuenta');
    });
  }
  async function borrarGasto(x) { if (await C().confirmar({ titulo: '¿Borrar este gasto compartido?', texto: x.desc || 'Sin detalle', si: 'Borrar', peligro: true })) S().borrar('grupo', x.id, 'Borré un gasto compartido'); }

  /* ------------------------------------------------------------------------ viajes */
  const MONEDAS_VIAJE = ['EUR', 'USD', 'COP', 'PEN', 'MXN'];
  function viajes(cont) {
    if (bloqueado(cont, 'variasMonedasViajes')) return;
    const D = S().d;
    cont.appendChild(h('p', { class: 'suave', estilo: { marginTop: '4px' } }, 'Anota gastos en otra moneda y los paso a la tuya con el cambio que tú pongas. No invento tasas.'));
    cont.appendChild(h('div', { estilo: { marginTop: '14px' } }, h('button', { class: 'btn btn-voz', type: 'button', onclick: nuevoViaje }, 'Nuevo viaje')));
    cont.appendChild(h('section', { class: 'seccion' }, D.viajes.length ? h('div', { class: 'lista' }, D.viajes.map((v) => { const t = D.movs.filter((m) => m.viajeId === v.id).reduce((s, m) => s + m.monto, 0);
      return fila({ icono: '✈️', titulo: v.nombre, sub: v.moneda + ' · 1 ' + D.ajustes.moneda + ' = ' + String(v.tasa).replace('.', ',') + ' ' + v.moneda, derecha: h('span', { class: 'monto' }, $(t)), onclick: () => AF.app.abrir(v.nombre, (c) => viaje(c, v.id)) }); }))
      : h('div', { class: 'vacio' }, h('strong', null, 'Aún no tienes viajes'), 'Crea uno antes de salir.')));
  }
  function nuevoViaje() {
    const base = S().d.ajustes.moneda;
    const nombre = h('input', { class: 'entrada', placeholder: 'Ej.: Cartagena', maxlength: 40, 'aria-label': 'Nombre del viaje' }), tasa = entrada('Ej. 4000', '', 'Cambio');
    let mon = MONEDAS_VIAJE.find((m) => m !== base) || 'EUR';
    const z = h('div', { class: 'opciones' }), pint = () => { AF.ui.vaciar(z); MONEDAS_VIAJE.filter((m) => m !== base).forEach((m) => z.appendChild(h('button', { type: 'button', class: 'opcion', 'aria-pressed': mon === m ? 'true' : 'false', onclick: () => { mon = m; pint(); } }, PLAN.monedas[m].simbolo + ' ' + m))); }; pint();
    hoja({ titulo: 'Nuevo viaje', cuerpo: h('div', null, campo('Nombre', nombre), campo('Moneda del viaje', z), campo('¿Cuántas ' + mon + ' recibes por 1 ' + base + '?', tasa, 'Mira el cambio de hoy en tu banco o casa de cambio y escríbelo.')),
      acciones: [{ texto: 'Crear', clase: 'btn-primario', onclick: () => { const t = num(tasa); if (!nombre.value.trim() || !(t > 0)) return false; S().agregar('viajes', { nombre: nombre.value.trim(), moneda: mon, tasa: t }, 'Creé un viaje'); } }] });
  }
  function viaje(cont, id) {
    const v = S().buscar('viajes', id), D = S().d, hoy = AF.app.hoy(); if (!v) { AF.app.atras(); return; }
    const movs = D.movs.filter((m) => m.viajeId === id).sort((a, b) => (b.fecha === a.fecha ? b.creado - a.creado : b.fecha < a.fecha ? -1 : 1));
    const total = movs.reduce((s, m) => s + m.monto, 0), orig = movs.reduce((s, m) => s + (m.montoOriginal || 0), 0);
    cont.appendChild(h('div', { class: 'horizonte', estilo: { margin: '0 calc(var(--margen) * -1)', borderRadius: '28px' } }, h('div', { class: 'cifra-etiqueta' }, 'Llevas gastado'), h('div', { class: 'cifra', estilo: { fontSize: '52px' } }, $(total)), h('p', { class: 'cifra-pie suave' }, $(orig, { simbolo: PLAN.monedas[v.moneda].simbolo }) + ' ' + v.moneda + ' · cambio 1 ' + D.ajustes.moneda + ' = ' + String(v.tasa).replace('.', ',') + ' ' + v.moneda)));
    cont.appendChild(h('div', { estilo: { display: 'flex', gap: '10px', marginTop: '16px' } }, h('button', { class: 'btn btn-voz', type: 'button', estilo: { flex: 1 }, onclick: () => gastoViaje(v) }, 'Agregar gasto'), h('button', { class: 'btn btn-borde', type: 'button', onclick: () => editarTasa(v) }, 'Cambio')));
    cont.appendChild(h('section', { class: 'seccion' }, movs.length ? h('div', { class: 'lista' }, movs.map((m) => fila({ icono: C().catDe(m.cat).icono, titulo: m.desc || C().catDe(m.cat).nombre, sub: $(m.montoOriginal, { simbolo: PLAN.monedas[v.moneda].simbolo }) + ' ' + v.moneda + ' · ' + U.fechaCorta(m.fecha, hoy), derecha: h('span', { class: 'monto gasto' }, '−' + $(m.monto)), onclick: () => C().editarMov(m) }))) : h('div', { class: 'vacio' }, h('strong', null, 'Sin gastos todavía'), 'Agrega el primero.')));
  }
  function gastoViaje(v) {
    const D = S().d, monto = entrada('0', '', 'Monto en ' + v.moneda), desc = h('input', { class: 'entrada', placeholder: 'Detalle', maxlength: 60, 'aria-label': 'Detalle' });
    let cat = 'turismo'; const zc = C().selectorCategoria('gasto', cat, (c) => { cat = c; });
    const prev = h('p', { class: 'texto-sm suave', estilo: { marginTop: '8px' } }); monto.addEventListener('input', () => { const x = num(monto); prev.textContent = x > 0 ? '≈ ' + $(U.r2(x / v.tasa)) : ''; });
    hoja({ titulo: 'Gasto en ' + v.moneda, cuerpo: h('div', null, campo('Monto en ' + v.moneda, monto), prev, campo('Detalle', desc), campo('Categoría', zc)), acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
      const x = num(monto); if (!(x > 0)) return false;
      S().agregar('movs', { tipo: 'gasto', monto: U.r2(x / v.tasa), montoOriginal: U.r2(x), monedaOriginal: v.moneda, viajeId: v.id, cat, desc: desc.value.trim(), fecha: AF.app.hoy(), cuenta: 'efectivo', nec: C().catDe(cat).nec || null }, 'Gasto de viaje'); aviso('Guardado');
    } }] });
  }
  function editarTasa(v) {
    const t = entrada('', v.tasa, 'Cambio');
    hoja({ titulo: 'Cambio del viaje', cuerpo: campo('Por 1 ' + S().d.ajustes.moneda + ' recibes (' + v.moneda + ')', t, 'Los gastos ya anotados no cambian; solo los nuevos usan este cambio.'), acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => { const x = num(t); if (!(x > 0)) return false; S().editar('viajes', v.id, { tasa: x }, 'Cambié el cambio'); } }] });
  }

  V.pro = { render, sri, simulador, pareja, viajes, verificarCompras, saldos, transferencias };
})(typeof window !== 'undefined' ? window : globalThis);
