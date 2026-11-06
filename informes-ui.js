/* Resumen y reportes: mes, año, acumulado y comparar; gráficas; PDF, Excel y CSV; el resumen para compartir (texto o imagen). */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, aviso, fila } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const S = () => AF.store, C = () => V.comun, I = () => AF.informes, N = () => AF.nativo;
  const $ = (n) => U.dinero(n);
  const hoyISO = () => AF.app.hoy();

  const est = { modo: 'mes', mes: null, anio: null };
  const MODOS = [['mes', 'Mes', null], ['anio', 'Año', 'resumenAnualAcumulado'], ['todo', 'Todo', 'resumenAnualAcumulado'], ['comparar', 'Comparar', 'compararMeses']];

  /* ---------------------------------------------------------------- periodos */
  const primeraFecha = (D) => D.movs.reduce((m, x) => (x.fecha < m ? x.fecha : m), hoyISO());
  const nombreMesAnio = (iso) => U.cap(U.nombreMes(iso)) + ' ' + iso.slice(0, 4);
  // El rango de lo que se está viendo (o de lo que pidió la voz: periodo = salida del intérprete)
  function rangoDe(modo, mes, anio, periodo) {
    const D = S().d, hoy = hoyISO();
    if (periodo && !['mes', 'mes_pasado', 'mes_nombre', 'anio', 'anio_pasado', 'todo'].includes(periodo.clave)) {
      return { desde: periodo.desde, hasta: periodo.hasta < hoy ? periodo.hasta : hoy, etiqueta: periodo.etiqueta, clave: periodo.clave, titulo: U.cap(periodo.etiqueta) };
    }
    if (modo === 'anio') { const a = String(anio); return { desde: a + '-01-01', hasta: a + '-12-31', etiqueta: 'del año ' + a, clave: 'anio', titulo: 'Año ' + a, corto: a }; }
    if (modo === 'todo') return { desde: primeraFecha(D), hasta: hoy, etiqueta: 'acumulado', clave: 'todo', titulo: 'Todo lo que llevas', corto: 'acumulado' };
    const ini = U.inicioMes(mes || hoy);
    return { desde: ini, hasta: U.finMes(ini), etiqueta: 'de ' + U.nombreMes(ini) + ' de ' + ini.slice(0, 4), clave: 'mes', titulo: nombreMesAnio(ini), corto: U.nombreMes(ini) };
  }
  function modoDePeriodo(p) {
    if (!p) return { modo: 'mes' };
    if (p.clave === 'anio' || p.clave === 'anio_pasado') return { modo: 'anio', anio: p.desde.slice(0, 4) };
    if (p.clave === 'todo') return { modo: 'todo' };
    if (p.clave === 'mes' || p.clave === 'mes_pasado' || p.clave === 'mes_nombre') return { modo: 'mes', mes: U.inicioMes(p.desde) };
    return { modo: 'mes' };
  }

  /* ---------------------------------------------------------------- exportar */
  async function exportar(formato, r) {
    const D = S().d, hoy = hoyISO();
    const sello = r.clave === 'mes' ? r.desde.slice(0, 7) : r.clave === 'anio' ? r.desde.slice(0, 4) : r.clave === 'todo' ? 'acumulado' : r.desde + '_' + r.hasta;
    try {
      if (formato === 'csv') {
        if (!C().requiere('exportarCSV')) return false;
        await N().entregarArchivo('movimientos-' + sello + '.csv', I().csv(D, r.desde, r.hasta), 'text/csv');
      } else if (formato === 'excel') {
        if (!C().requiere('exportarExcel')) return false;
        await N().entregarArchivo('movimientos-' + sello + '.xlsx', AF.archivos.excelMovimientos(D, r.desde, r.hasta), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      } else if (formato === 'pdf') {
        if (!C().requiere(r.clave === 'mes' ? 'pdfMensualBasico' : 'pdfProfesional')) return false;
        const bytes = AF.pdf.informe(D, { desde: r.desde, hasta: r.hasta, etiqueta: r.etiqueta }, { nombre: D.ajustes.nombre, hoy, completo: AF.acceso.tiene('pdfProfesional'), moneda: D.ajustes.moneda });
        await N().entregarArchivo('resumen-' + sello + '.pdf', bytes, 'application/pdf');
      }
      aviso('Archivo listo');
      return true;
    } catch (e) { aviso('No pude crear el archivo'); return false; }
  }

  /* ----------------------------------------------------------------- gráficas */
  const NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, ...hijos) {
    const el = g.document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (v != null) el.setAttribute(k, v); });
    hijos.flat().forEach((c) => { if (c != null) el.appendChild(typeof c === 'string' ? g.document.createTextNode(c) : c); });
    return el;
  }
  const TIPOS_GRAFICA = [['barras', 'Barras'], ['lineas', 'Líneas'], ['circulo', 'Círculo']];
  const tipoGrafica = () => (S().d.ajustes.grafica || 'barras');
  const selectorGrafica = () => h('div', { class: 'segmentos segmentos-chico', role: 'tablist', 'aria-label': 'Tipo de gráfica' }, TIPOS_GRAFICA.map(([k, t]) => h('button', { type: 'button', role: 'tab', 'aria-pressed': tipoGrafica() === k ? 'true' : 'false', onclick: () => S().ajustar({ grafica: k }) }, t)));
  const nombreMesLargo = (mes) => U.cap(U.nombreMes(mes + '-01')) + ' ' + mes.slice(0, 4);
  const etiquetaMes = (s) => nombreMesLargo(s.mes) + ': ingresos ' + $(s.ingresos) + ', gastos ' + $(s.gastos) + '. Toca para ver el detalle de ese mes.';

  // Ingresos (verde) y gastos (rojo) por mes. Tocar un mes abre el resumen de ese mes.
  function graficaMeses(serie, alTocar) {
    const tipo = tipoGrafica();
    const mx = Math.max.apply(null, serie.map((s) => Math.max(s.ingresos, s.gastos)).concat([1]));
    if (tipo === 'lineas') {
      const W = 320, H = 150, px = 18, py = 16, n = serie.length;
      const X = (i) => (n === 1 ? W / 2 : px + (i * (W - 2 * px)) / (n - 1)), Y = (v) => H - 22 - (v / mx) * (H - 22 - py);
      const linea = (clave, color) => svg('polyline', { points: serie.map((s, i) => X(i) + ',' + Y(s[clave])).join(' '), fill: 'none', stroke: color, 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
      const puntos = (clave, color) => serie.map((s, i) => svg('circle', { cx: X(i), cy: Y(s[clave]), r: 4.5, fill: color, stroke: 'var(--hoja)', 'stroke-width': 2 }));
      const ancho = n === 1 ? W : (W - 2 * px) / (n - 1);
      return svg('svg', { class: 'grafica-lineas', viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': 'Ingresos y gastos por mes' },
        [0, 0.5, 1].map((f) => svg('line', { x1: 0, x2: W, y1: Y(mx * f), y2: Y(mx * f), stroke: 'var(--linea)', 'stroke-width': 1 })),
        linea('ingresos', 'var(--ingreso-vivo)'), linea('gastos', 'var(--gasto-vivo)'), puntos('ingresos', 'var(--ingreso-vivo)'), puntos('gastos', 'var(--gasto-vivo)'),
        serie.map((s, i) => svg('text', { x: X(i), y: H - 6, 'text-anchor': 'middle', class: 'grafica-etq' }, s.etiqueta)),
        serie.map((s, i) => svg('rect', { x: X(i) - ancho / 2, y: 0, width: ancho, height: H, fill: 'transparent', class: 'grafica-toque', tabindex: 0, role: 'button', 'aria-label': etiquetaMes(s), onclick: null,
          'data-mes': s.mes })));
    }
    if (tipo === 'circulo') {
      const tot = serie.reduce((a, s) => a + s.gastos, 0) || 1, R = 54, C = 2 * Math.PI * R;
      let acum = 0; const tonos = serie.map((s, i) => 'hsl(0 ' + (62 + (i % 2) * 8) + '% ' + (34 + Math.round((i / Math.max(1, serie.length - 1)) * 34)) + '%)');
      const trozos = serie.map((s, i) => { const len = (s.gastos / tot) * C; const c = svg('circle', { cx: 70, cy: 70, r: R, fill: 'none', stroke: tonos[i], 'stroke-width': 26, 'stroke-dasharray': Math.max(0, len - 1.5) + ' ' + (C - Math.max(0, len - 1.5)), 'stroke-dashoffset': -acum, transform: 'rotate(-90 70 70)', class: 'grafica-toque', 'data-mes': s.mes, role: 'button', tabindex: 0, 'aria-label': etiquetaMes(s) }); acum += len; return c; });
      return h('div', { class: 'grafica-circulo' },
        svg('svg', { viewBox: '0 0 140 140', class: 'donut', role: 'group', 'aria-label': 'Gastos por mes' }, trozos,
          svg('text', { x: 70, y: 66, 'text-anchor': 'middle', class: 'donut-etq' }, 'Gastos'), svg('text', { x: 70, y: 84, 'text-anchor': 'middle', class: 'donut-valor' }, $(tot))),
        h('div', { class: 'lista-meses' }, serie.map((s, i) => h('button', { type: 'button', class: 'mes-fila', 'aria-label': etiquetaMes(s), onclick: () => alTocar(s.mes) },
          h('i', { estilo: { background: tonos[i] } }), h('span', null, nombreMesLargo(s.mes)), h('strong', { class: 'num' }, $(s.gastos)), h('small', { class: 'suave' }, Math.round((s.gastos / tot) * 100) + ' %')))));
    }
    return h('div', { class: 'barra-vertical' }, serie.map((s) => h('button', { type: 'button', class: 'col-mes', 'aria-label': etiquetaMes(s), onclick: () => alTocar(s.mes) },
      h('div', { class: 'par' }, h('i', { class: 'i', estilo: { height: Math.max(1, (s.ingresos / mx) * 100) + '%' } }), h('i', { class: 'g', estilo: { height: Math.max(1, (s.gastos / mx) * 100) + '%' } })), h('small', null, s.etiqueta))));
  }
  // Se conectan los toques de las gráficas SVG (los círculos y rectángulos con data-mes)
  function conectarToques(el, alTocar) { el.querySelectorAll('[data-mes]').forEach((n) => { const ir = () => alTocar(n.getAttribute('data-mes')); n.addEventListener('click', ir); n.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ir(); } }); }); return el; }

  // Leyenda: dice con palabras qué es cada color.
  const leyendaIG = () => h('div', { class: 'leyenda leyenda-grande' },
    h('span', null, h('i', { estilo: { background: 'var(--ingreso-vivo)' } }), h('b', null, 'Verde: '), 'ingresos (lo que entró)'),
    h('span', null, h('i', { estilo: { background: 'var(--gasto-vivo)' } }), h('b', null, 'Rojo: '), 'gastos (lo que salió)'));
  function barrasCategorias(lista, n) {
    const mx = lista.length ? lista[0].total : 1;
    return h('div', null, lista.slice(0, n).map((x) => h('div', { class: 'barra-h' }, h('span', { class: 'barra-h-ico', 'aria-hidden': 'true' }, x.cat.icono),
      h('div', { class: 'barra-h-pista' }, h('i', { estilo: { width: Math.max(3, (x.total / mx) * 100) + '%', background: x.cat.color || '' } })), h('span', { class: 'monto' }, $(x.total)),
      h('div', { class: 'barra-h-nombre' }, h('span', null, x.cat.nombre), h('span', { class: 'suave' }, Math.round(x.pct * 100) + ' %')))));
  }
  function circuloCategorias(lista, n) {
    const top = lista.slice(0, n), tot = top.reduce((a, x) => a + x.total, 0) || 1, R = 54, C = 2 * Math.PI * R;
    let acum = 0;
    const trozos = top.map((x, i) => { const len = (x.total / tot) * C; const c = svg('circle', { cx: 70, cy: 70, r: R, fill: 'none', stroke: x.cat.color || PLAN.apariencia.paleta[i % PLAN.apariencia.paleta.length], 'stroke-width': 26, 'stroke-dasharray': Math.max(0, len - 1.5) + ' ' + (C - Math.max(0, len - 1.5)), 'stroke-dashoffset': -acum, transform: 'rotate(-90 70 70)' }); acum += len; return c; });
    return h('div', { class: 'grafica-circulo' },
      svg('svg', { viewBox: '0 0 140 140', class: 'donut', role: 'img', 'aria-label': 'Gastos por categoría' }, trozos, svg('text', { x: 70, y: 66, 'text-anchor': 'middle', class: 'donut-etq' }, 'Gastos'), svg('text', { x: 70, y: 84, 'text-anchor': 'middle', class: 'donut-valor' }, $(tot))),
      h('div', { class: 'lista-meses' }, top.map((x) => h('div', { class: 'mes-fila' }, h('i', { estilo: { background: x.cat.color || 'var(--acento)' } }), h('span', null, x.cat.icono + ' ' + x.cat.nombre), h('strong', { class: 'num' }, $(x.total)), h('small', { class: 'suave' }, Math.round(x.pct * 100) + ' %')))));
  }
  function serieDe(r, modo) {
    const D = S().d, hoy = hoyISO();
    if (modo === 'anio') { const out = []; for (let m = 0; m < 12; m++) { const ini = r.desde.slice(0, 5) + U.pad(m + 1) + '-01'; const t = I().totales(D, ini, U.finMes(ini)); out.push({ mes: ini.slice(0, 7), etiqueta: U.MESES_CORTOS[m], ingresos: t.ingresos, gastos: t.gastos }); } return out; }
    return I().serieMensual(D, modo === 'mes' ? r.hasta < hoy ? r.hasta : hoy : hoy, modo === 'mes' ? 6 : 12);
  }
  function bloqueNecGusto(t) {
    const tot = t.nec.N + t.nec.G + t.nec.sin; if (!tot) return null;
    const pc = (v) => Math.round((v / tot) * 100);
    return h('div', null, h('div', { class: 'barra-dividida', role: 'img', 'aria-label': 'Necesario ' + pc(t.nec.N) + ' por ciento, gusto ' + pc(t.nec.G) + ' por ciento' },
      t.nec.N ? h('i', { class: 'seg-nec', estilo: { flex: t.nec.N } }) : null, t.nec.G ? h('i', { class: 'seg-gus', estilo: { flex: t.nec.G } }) : null, t.nec.sin ? h('i', { class: 'seg-sin', estilo: { flex: t.nec.sin } }) : null),
      h('div', { class: 'leyenda' }, h('span', null, h('i', { class: 'seg-nec' }), 'Necesario ' + $(t.nec.N) + ' · ' + pc(t.nec.N) + ' %'), h('span', null, h('i', { class: 'seg-gus' }), 'Gusto ' + $(t.nec.G) + ' · ' + pc(t.nec.G) + ' %')));
  }
  const seccion = (titulo, ...hijos) => h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, titulo)), hijos);

  /* ------------------------------------------------------- tarjeta para compartir */
  // El «Wrapped»: una tarjeta con porcentajes y sin montos, para mandar a quien quieras.
  function datosWrapped(D, r) {
    const t = I().totales(D, r.desde, r.hasta), tot = t.nec.N + t.nec.G + t.nec.sin;
    const top = t.porCategoria.slice(0, 3);
    const ahorro = t.ingresos > 0 ? Math.round(((t.ingresos - t.gastos) / t.ingresos) * 100) : null;
    const gran = ahorro != null && ahorro > 0 ? ['Me sobró el ', ahorro + ' %', ' de lo que gané'] : top.length ? ['Lo que más gasté: ', top[0].cat.nombre.toLowerCase(), ''] : ['Aún no tengo gastos', '', ''];
    const lineas = top.map((c) => c.cat.icono + ' ' + Math.round(c.pct * 100) + ' % en ' + c.cat.nombre.toLowerCase());
    if (tot) lineas.push('⚖️ Necesario ' + Math.round((t.nec.N / tot) * 100) + ' %, gustos ' + Math.round((t.nec.G / tot) * 100) + ' %');
    return { gran, lineas, titulo: 'Mi ' + (r.clave === 'mes' ? r.corto : r.clave === 'anio' ? 'año ' + r.corto : r.clave === 'todo' ? 'recorrido' : 'periodo') };
  }
  function tarjetaWrapped(D, r) {
    const w = datosWrapped(D, r);
    return h('div', { class: 'tarjeta-wrapped' }, h('div', { class: 'mes' }, w.titulo + ' con ' + PLAN.app.nombre),
      h('div', { class: 'gran' }, w.gran[0], w.gran[1] ? h('em', null, w.gran[1]) : null, w.gran[2]), h('ul', null, w.lineas.map((l) => h('li', null, l))));
  }
  async function imagenWrapped(D, r) {
    const w = datosWrapped(D, r), W = 1080, H = 1350, c = g.document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), fam = 'Bricolage, system-ui, sans-serif';
    try { await Promise.all([g.document.fonts.load('700 60px Bricolage'), g.document.fonts.load('500 40px Bricolage')]); } catch (e) { /* usa la fuente del sistema */ }
    const fondo = x.createLinearGradient(0, 0, W, H); fondo.addColorStop(0, '#0B1A30'); fondo.addColorStop(1, '#14305A');
    x.fillStyle = fondo; x.fillRect(0, 0, W, H);
    const sol = x.createRadialGradient(W - 200, H - 280, 30, W - 160, H - 240, 380); sol.addColorStop(0, '#F5A33A'); sol.addColorStop(1, '#F28A1B');
    x.fillStyle = sol; x.beginPath(); x.arc(W - 120, H - 200, 360, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#FFC53D'; x.fillRect(90, 130, 90, 12);
    x.fillStyle = '#B9C6DA'; x.font = '500 40px ' + fam; x.fillText(w.titulo + ' con ' + PLAN.app.nombre, 90, 210);
    // línea grande con la parte clave en naranja, partida en renglones
    x.font = '700 96px ' + fam; let y = 380;
    const trozos = [[w.gran[0], '#FFFFFF'], [w.gran[1], '#FFD166'], [w.gran[2], '#FFFFFF']].filter((t) => t[0]);
    let cx = 90; const lh = 118;
    trozos.forEach(([txt, col]) => { txt.split(/(\s+)/).forEach((p) => { const wd = x.measureText(p).width; if (cx + wd > W - 90 && p.trim()) { cx = 90; y += lh; } if (!(cx === 90 && !p.trim())) { x.fillStyle = col; x.fillText(p, cx, y); cx += wd; } }); });
    x.fillStyle = '#FFFFFF'; x.font = '500 50px ' + fam; y += 150;
    w.lineas.forEach((l) => { x.fillText(l, 90, y); y += 84; });
    x.fillStyle = '#B9C6DA'; x.font = '500 34px ' + fam; x.fillText('Sin montos: solo porcentajes', 90, 1250);
    const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
    return new Uint8Array(await blob.arrayBuffer());
  }

  /* ----------------------------------------------------------------- pantalla */
  function resumen(cont) {
    const D = S().d, hoy = hoyISO();
    if (!est.mes) est.mes = U.inicioMes(hoy);
    if (!est.anio) est.anio = hoy.slice(0, 4);
    // Gratis solo ve el mes
    if (est.modo !== 'mes' && !AF.acceso.tiene(est.modo === 'comparar' ? 'compararMeses' : 'resumenAnualAcumulado')) est.modo = 'mes';

    cont.appendChild(h('div', { class: 'segmentos', role: 'tablist', 'aria-label': 'Periodo' }, MODOS.map(([k, t, fn]) => h('button', { type: 'button', role: 'tab', 'aria-pressed': est.modo === k ? 'true' : 'false',
      onclick: () => { if (fn && !AF.acceso.tiene(fn)) return C().pedirPro(fn); est.modo = k; AF.app.redibujar(); } }, t, fn && !AF.acceso.tiene(fn) ? h('span', { class: 'mini-pro', role: 'img', 'aria-label': 'Pro' }, ico('estrella', 'relleno')) : null))));
    if (est.modo === 'comparar') return comparar(cont);

    const r = rangoDe(est.modo, est.mes, est.anio);
    // navegación del periodo
    if (est.modo !== 'todo') {
      const esMes = est.modo === 'mes', actual = esMes ? est.mes >= U.inicioMes(hoy) : est.anio >= hoy.slice(0, 4);
      const mover = (n) => { if (esMes) est.mes = U.sumarMeses(est.mes, n); else est.anio = String(Number(est.anio) + n); AF.app.redibujar(); };
      cont.appendChild(h('div', { estilo: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' } },
        h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Anterior', onclick: () => mover(-1) }, ico('atras')),
        h('strong', { class: 'h2', estilo: { fontSize: '18px' } }, r.titulo + (actual ? ' · actual' : '')),
        h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Siguiente', disabled: actual, estilo: { opacity: actual ? '.3' : '1' }, onclick: () => { if (!actual) mover(1); } }, ico('derecha'))));
    }
    const t = I().totales(D, r.desde, r.hasta);
    if (!t.ingresos && !t.gastos) {
      cont.appendChild(h('div', { class: 'vacio' }, h('strong', null, 'Nada que mostrar aquí'), 'No hay movimientos en este periodo. Cuando registres gastos o ingresos, aparecen aquí.'));
      return;
    }
    cont.appendChild(h('div', { class: 'dos-datos' },
      h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Ingresos'), h('div', { class: 'dato-valor', estilo: { color: 'var(--ingreso)' } }, $(t.ingresos))),
      h('div', null, h('div', { class: 'dato-etiqueta suave' }, 'Gastos'), h('div', { class: 'dato-valor', estilo: { color: 'var(--gasto)' } }, $(t.gastos)))));
    cont.appendChild(h('p', { class: 'texto-sm', estilo: { marginTop: '12px' } }, t.balance >= 0 ? 'Te sobraron ' : 'Gastaste ', h('strong', null, $(Math.abs(t.balance))), t.balance >= 0 ? (t.ingresos ? ' (' + Math.round((t.balance / t.ingresos) * 100) + ' % de lo que ganaste).' : '.') : ' más de lo que ganaste.'));
    // Tocar un mes en la gráfica abre el resumen de ese mes.
    const alTocarMes = (mes) => { est.modo = 'mes'; est.mes = mes + '-01'; AF.app.redibujar(); };
    const circulo = tipoGrafica() === 'circulo';
    cont.appendChild(seccion(est.modo === 'anio' ? 'Mes a mes' : 'Últimos meses', selectorGrafica(),
      h('div', { estilo: { marginTop: '12px' } }, circulo ? h('p', { class: 'texto-sm suave', estilo: { marginBottom: '8px' } }, 'Lo que gastaste en cada mes (tonos de rojo).') : leyendaIG(),
        conectarToques(graficaMeses(serieDe(r, est.modo), alTocarMes), alTocarMes),
        h('p', { class: 'texto-xs suave', estilo: { marginTop: '10px' } }, 'Toca un mes para ver todo lo que pasó en él.'))));
    if (est.modo === 'mes') cont.appendChild(h('button', { class: 'btn btn-borde btn-bloque', type: 'button', estilo: { marginTop: '16px' }, onclick: () => V.movimientos.irAMes(est.mes) }, 'Ver los movimientos de ' + U.cap(U.nombreMes(est.mes))));
    if (t.porCategoria.length) cont.appendChild(seccion('En qué se fue', circulo ? circuloCategorias(t.porCategoria, 8) : barrasCategorias(t.porCategoria, 8)));
    const nec = bloqueNecGusto(t); if (nec) cont.appendChild(seccion('Necesario o gusto', nec));
    const hm = I().hormiga(D, r.desde, r.hasta);
    if (hm.veces) { const pro = AF.acceso.tiene('hormigaDetalle');
      cont.appendChild(seccion('Gastos hormiga', fila({ icono: '🐜', titulo: $(hm.total) + ' en ' + hm.veces + (hm.veces === 1 ? ' compra' : ' compras'), sub: 'Al año serían unos ' + $(hm.alAnio), derecha: pro ? ico('derecha') : AF.ui.chipPro(), onclick: () => (pro ? AF.app.abrir('Gastos hormiga', (c) => hormiga(c)) : C().pedirPro('hormigaDetalle')) }))); }

    /* compartir */
    cont.appendChild(seccion('Compartir', tarjetaWrapped(D, r),
      h('div', { estilo: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' } },
        h('button', { class: 'btn btn-primario btn-bloque', type: 'button', onclick: async () => { const x = await N().compartirTexto('Mi resumen', I().resumenCompartir(D, hoy, { desde: r.desde, hasta: r.hasta, etiqueta: r.corto || r.etiqueta })); if (x === 'copiado') aviso('Resumen copiado'); } }, 'Compartir como texto'),
        h('button', { class: 'btn btn-borde btn-bloque', type: 'button', onclick: async () => {
          if (!C().requiere('compartirCaptura')) return;
          try { await N().entregarArchivo('mi-resumen.png', await imagenWrapped(D, r), 'image/png'); } catch (e) { aviso('No pude crear la imagen'); }
        } }, 'Compartir como imagen', AF.acceso.tiene('compartirCaptura') ? null : AF.ui.chipPro())),
      h('p', { class: 'texto-xs suave', estilo: { marginTop: '10px' } }, 'Va sin montos: solo porcentajes.')));

    /* exportar */
    cont.appendChild(seccion('Descargar', h('div', { class: 'lista' },
      fila({ icono: '📕', titulo: 'PDF', sub: 'Resumen con gráficas y lista de movimientos', derecha: AF.acceso.tiene(r.clave === 'mes' ? 'pdfMensualBasico' : 'pdfProfesional') ? ico('derecha') : AF.ui.chipPro(), onclick: () => exportar('pdf', r) }),
      fila({ icono: '📗', titulo: 'Excel', sub: 'Movimientos y resumen en hojas separadas', derecha: AF.acceso.tiene('exportarExcel') ? ico('derecha') : AF.ui.chipPro(), onclick: () => exportar('excel', r) }),
      fila({ icono: '📄', titulo: 'CSV', sub: 'Para abrir en cualquier hoja de cálculo', derecha: ico('derecha'), onclick: () => exportar('csv', r) }))));
  }

  /* ----------------------------------------------------------------- comparar */
  function comparar(cont) {
    const D = S().d, hoy = hoyISO();
    const b = est.mes, a = U.sumarMeses(b, -1), actual = b >= U.inicioMes(hoy);
    cont.appendChild(h('div', { estilo: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' } },
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Mes anterior', onclick: () => { est.mes = U.sumarMeses(b, -1); AF.app.redibujar(); } }, ico('atras')),
      h('strong', { class: 'h2', estilo: { fontSize: '18px', textAlign: 'center' } }, U.cap(U.nombreMes(b)) + ' frente a ' + U.nombreMes(a)),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Mes siguiente', disabled: actual, estilo: { opacity: actual ? '.3' : '1' }, onclick: () => { if (!actual) { est.mes = U.sumarMeses(b, 1); AF.app.redibujar(); } } }, ico('derecha'))));
    const tb = I().totales(D, b, U.finMes(b)), ta = I().totales(D, a, U.finMes(a));
    if (!tb.gastos && !ta.gastos) { cont.appendChild(h('div', { class: 'vacio' }, h('strong', null, 'No hay con qué comparar'), 'Necesito gastos en alguno de los dos meses.')); return; }
    const pill = (nuevo, viejo, malSube) => {
      if (!viejo) return nuevo ? h('span', { class: 'cambio igual' }, 'nuevo') : h('span', { class: 'cambio igual' }, '—');
      const dif = Math.round(((nuevo - viejo) / viejo) * 100);
      if (dif === 0) return h('span', { class: 'cambio igual' }, '= igual');
      return h('span', { class: 'cambio ' + ((dif > 0) === malSube ? 'sube' : 'baja') }, (dif > 0 ? '▲ ' : '▼ ') + Math.abs(dif) + ' %');
    };
    const fila2 = (t, va, vb, malSube) => h('div', { class: 'fila', estilo: { minHeight: '56px' } }, h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, t), h('div', { class: 'fila-sub' }, $(va) + ' → ' + $(vb))), pill(vb, va, malSube));
    cont.appendChild(seccion('En total', h('div', { class: 'lista' }, fila2('Gastos', ta.gastos, tb.gastos, true), fila2('Ingresos', ta.ingresos, tb.ingresos, false), fila2('Balance', ta.balance, tb.balance, false))));
    const ids = Array.from(new Set(ta.porCategoria.map((x) => x.id).concat(tb.porCategoria.map((x) => x.id))));
    const filas = ids.map((id) => ({ cat: I().catDe(D, id), va: (ta.porCategoria.find((x) => x.id === id) || { total: 0 }).total, vb: (tb.porCategoria.find((x) => x.id === id) || { total: 0 }).total }))
      .sort((x, y) => Math.max(y.va, y.vb) - Math.max(x.va, x.vb));
    cont.appendChild(seccion('Por categoría', h('div', { class: 'lista' }, filas.map((x) => h('div', { class: 'fila', estilo: { minHeight: '60px' } }, h('div', { class: 'ico' }, x.cat.icono),
      h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, x.cat.nombre), h('div', { class: 'fila-sub' }, $(x.va) + ' → ' + $(x.vb))), pill(x.vb, x.va, true))))));
  }

  /* ----------------------------------------------------------------- hormiga (Pro) */
  function hormiga(cont) {
    const D = S().d, hoy = hoyISO(), hm = I().hormiga(D, U.inicioMes(hoy), hoy);
    if (!hm.veces) { cont.appendChild(h('div', { class: 'vacio' }, h('strong', null, 'Sin gastos hormiga este mes'), 'Una compra de ' + $(PLAN.hormiga.montoMaximo) + ' o menos en antojos o comida de la calle cuenta como hormiga. Aquí no hay ninguna.')); return; }
    cont.appendChild(h('div', { class: 'plastico' }, h('div', { class: 'plastico-cabeza' }, h('span', null, '🐜 Gastos hormiga'), h('span', { class: 'suave' }, 'Este mes')),
      h('div', { class: 'plastico-cifra' }, $(hm.total)), h('div', { class: 'plastico-pie' }, h('span', null, hm.veces + (hm.veces === 1 ? ' compra' : ' compras')), h('span', { class: 'suave' }, 'Al año: ' + $(hm.alAnio)))));
    cont.appendChild(h('div', { class: 'nota', estilo: { marginTop: '16px' } }, ico('info'), h('span', null, 'Si los reduces a la mitad, ahorras unos ', h('strong', null, $(U.r2(hm.alAnio / 2))), ' al año.')));
    const mx = hm.porProducto[0].total;
    cont.appendChild(seccion('Cuáles son', h('div', { class: 'lista' }, hm.porProducto.slice(0, 10).map((p) => h('div', { class: 'bloque' },
      h('div', { class: 'bloque-fila' }, h('div', { class: 'bloque-cab' }, h('div', { class: 'ico' }, p.icono), h('div', { class: 'fila-texto' }, h('div', { class: 'fila-titulo' }, U.cap(p.nombre)), h('div', { class: 'fila-sub' }, p.veces + (p.veces === 1 ? ' vez' : ' veces'))), h('span', { class: 'monto' }, $(p.total)))),
      h('div', { class: 'progreso' }, h('i', { estilo: { width: (p.total / mx) * 100 + '%' } })))))));
    cont.appendChild(h('div', { estilo: { marginTop: '20px' } }, h('button', { class: 'btn btn-voz btn-bloque', type: 'button', onclick: () => AF.app.abrir('Retos', (c) => V.finanzas.retos(c)) }, 'Probar el reto de 30 días')));
  }

  /* ------------------------------------------------- lo que pide la voz: «dame el informe en PDF» */
  function abrir(o) {
    o = o || {};
    if (!o.formato || o.formato === 'pantalla') {
      const m = modoDePeriodo(o.periodo);
      est.modo = m.modo; if (m.mes) est.mes = m.mes; if (m.anio) est.anio = m.anio;
      if (est.modo !== 'mes' && !AF.acceso.tiene('resumenAnualAcumulado')) { est.modo = 'mes'; }
      return AF.app.abrir('Resumen', (c) => resumen(c));
    }
    const m = modoDePeriodo(o.periodo);
    return exportar(o.formato, rangoDe(m.modo, m.mes, m.anio, o.periodo));
  }

  V.informesUI = { resumen, hormiga, abrir, exportar, rangoDe, datosWrapped, imagenWrapped, estado: est };
})(typeof window !== 'undefined' ? window : globalThis);
