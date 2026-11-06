/* Informes y respuestas: todo se calcula desde los datos (funciones puras: datos + fecha de hoy). */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const U = AF.util, PLAN = AF.PLAN;
  const r2 = U.r2;
  const $ = (n) => U.dinero(n);

  const catDe = (d, id) => (d.categorias || []).concat(PLAN.categorias).find((c) => c.id === id) || PLAN.categoria('otros');
  const enRango = (m, desde, hasta) => m.fecha >= desde && m.fecha <= hasta;

  /* ------------------------------------------------------------------------ Totales */
  function totales(d, desde, hasta) {
    let ingresos = 0, gastos = 0;
    const cat = {}, nec = { N: 0, G: 0, sin: 0 };
    d.movs.forEach((m) => {
      if (!enRango(m, desde, hasta)) return;
      if (m.tipo === 'ingreso') ingresos += m.monto;
      else if (m.tipo === 'gasto') {
        gastos += m.monto;
        cat[m.cat] = (cat[m.cat] || 0) + m.monto;
        const c = catDe(d, m.cat); const n = m.nec !== undefined ? m.nec : c.nec;
        nec[n === 'N' ? 'N' : n === 'G' ? 'G' : 'sin'] += m.monto;
      }
    });
    const lista = Object.entries(cat).map(([id, total]) => ({ id, total: r2(total), cat: catDe(d, id) })).sort((a, b) => b.total - a.total);
    lista.forEach((x) => { x.pct = gastos ? x.total / gastos : 0; });
    return { ingresos: r2(ingresos), gastos: r2(gastos), balance: r2(ingresos - gastos), porCategoria: lista, nec: { N: r2(nec.N), G: r2(nec.G), sin: r2(nec.sin) } };
  }
  function ingresosPorCategoria(d, desde, hasta) {
    const cat = {};
    d.movs.forEach((m) => { if (m.tipo === 'ingreso' && enRango(m, desde, hasta)) cat[m.cat] = (cat[m.cat] || 0) + m.monto; });
    return Object.entries(cat).map(([id, total]) => ({ id, total: r2(total), cat: catDe(d, id) })).sort((a, b) => b.total - a.total);
  }

  /* -------------------------------------------------------------------- Gastos hormiga */
  function hormiga(d, desde, hasta) {
    const max = PLAN.hormiga.montoMaximo;
    const prod = {};
    let total = 0, veces = 0;
    d.movs.forEach((m) => {
      if (m.tipo !== 'gasto' || !enRango(m, desde, hasta) || m.monto > max) return;
      const c = catDe(d, m.cat); if (!c.hormiga) return;
      const k = (m.desc || c.nombre).trim().toLowerCase();
      prod[k] = prod[k] || { nombre: m.desc || c.nombre, total: 0, veces: 0, icono: c.icono };
      prod[k].total += m.monto; prod[k].veces++; total += m.monto; veces++;
    });
    const dias = Math.max(1, U.diasEntre(desde, hasta < U.hoyISO() ? hasta : U.hoyISO()) + 1);
    return { total: r2(total), veces, porProducto: Object.values(prod).map((p) => Object.assign(p, { total: r2(p.total) })).sort((a, b) => b.total - a.total), alAnio: r2((total / dias) * 365) };
  }

  /* ---------------------------------------------------------- Ciclo de cobro y disponible */
  const ultimoDiaCobro = (hoy, dia) => {
    const f = U.deISO(hoy); const y = f.getFullYear(), m = f.getMonth();
    const cand = (yy, mm) => U.iso(new Date(yy, mm, Math.min(dia, new Date(yy, mm + 1, 0).getDate())));
    let c = cand(y, m);
    if (c > hoy) c = m === 0 ? cand(y - 1, 11) : cand(y, m - 1);
    return c;
  };
  function ciclo(d, hoy) {
    const dia = d.ajustes.diaCobro || 1;
    const inicio = ultimoDiaCobro(hoy, dia);
    const proximo = U.proximoDia(U.sumarDias(hoy, 1), dia);
    return { inicio, proximo, dias: Math.max(1, U.diasEntre(hoy, proximo)), diaCobro: dia };
  }

  function fijosPendientes(d, cic, hoy) {
    let total = 0; const lista = [];
    (d.pagosFijos || []).forEach((p) => {
      if (p.activo === false) return;
      const vence = U.proximoDia(cic.inicio, p.dia);
      if (vence >= cic.proximo) return;
      const pagado = d.movs.some((m) => m.pagoFijoId === p.id && m.fecha >= cic.inicio);
      if (!pagado) { total += p.monto; lista.push({ nombre: p.nombre, monto: p.monto, vence, atrasado: vence < hoy }); }
    });
    return { total: r2(total), lista };
  }

  // modo 'simple' (Gratis): ingresos − pagos fijos − gastos.  modo 'completo' (Pro): además cuotas de tarjeta y metas.
  function puedesGastarHoy(d, hoy, modo) {
    const cic = ciclo(d, hoy);
    const completo = modo === 'completo';
    let ingresos = 0, estimado = false;
    d.movs.forEach((m) => { if (m.tipo === 'ingreso' && enRango(m, cic.inicio, hoy)) ingresos += m.monto; });
    if (ingresos === 0 && d.ajustes.sueldo) { ingresos = d.ajustes.sueldo; estimado = true; }
    const cuenta = (m) => m.tipo === 'gasto' && (!completo || m.cuenta !== 'tarjeta');
    let antes = 0, hoyG = 0;
    d.movs.forEach((m) => { if (!cuenta(m)) return; if (enRango(m, cic.inicio, U.sumarDias(hoy, -1))) antes += m.monto; else if (m.fecha === hoy) hoyG += m.monto; });
    const fijos = fijosPendientes(d, cic, hoy);
    let cuotas = 0, metas = 0;
    if (completo) {
      (d.tarjetas || []).forEach((t) => {
        const e = AF.tarjetas.estado(t, d.movs, hoy);
        e.pendientes.forEach((q) => { if (q.vence < cic.proximo) cuotas += q.pendiente; });
      });
      // Lo que ya aportaste este ciclo es plata apartada (sale de lo disponible), y lo que falta para tu aporte mensual también.
      (d.metas || []).forEach((mt) => {
        const aportado = (mt.aportes || []).filter((a) => a.fecha >= cic.inicio).reduce((s, a) => s + a.monto, 0);
        metas += aportado + Math.max(0, (mt.aporteMensual || 0) - aportado);
      });
    }
    const disponible = r2(ingresos - antes - fijos.total - cuotas - metas);
    const porDia = r2(disponible / cic.dias);
    const hoyDisponible = r2(porDia - hoyG);
    return Object.assign({ ingresos: r2(ingresos), estimado, gastadoAntes: r2(antes), gastadoHoy: r2(hoyG), fijos: fijos.total, fijosLista: fijos.lista,
      cuotas: r2(cuotas), metas: r2(metas), disponible, porDia, hoyDisponible, resto: r2(disponible - hoyG), pasado: hoyDisponible < 0, modo: completo ? 'completo' : 'simple' }, cic);
  }

  /* ------------------------------------------------------------------------ Presupuestos */
  function presupuestos(d, hoy) {
    const desde = U.inicioMes(hoy), hasta = U.finMes(hoy);
    return (d.presupuestos || []).map((p) => {
      let gastado = 0;
      d.movs.forEach((m) => { if (m.tipo === 'gasto' && enRango(m, desde, hasta) && (!p.cat || m.cat === p.cat)) gastado += m.monto; });
      const pct = p.monto ? gastado / p.monto : 0;
      const nivel = pct >= PLAN.alertas.presupuestoDetenerDesde ? 'detente' : pct >= PLAN.alertas.presupuestoAvisoDesde ? 'aviso' : 'bien';
      return Object.assign({}, p, { gastado: r2(gastado), pct, nivel, queda: r2(p.monto - gastado), nombre: p.cat ? catDe(d, p.cat).nombre : 'Todos los gastos' });
    });
  }

  /* --------------------------------------------------------------------------- Alertas */
  function alertas(d, hoy, pro) {
    const out = [];
    presupuestos(d, hoy).forEach((p) => {
      if (p.nivel === 'detente') out.push({ tipo: 'presupuesto', nivel: 'alto', texto: 'Detente: llegaste al límite de ' + p.nombre.toLowerCase() + ' (' + $(p.monto) + ').', accion: 'movimientos' });
      else if (p.nivel === 'aviso') out.push({ tipo: 'presupuesto', nivel: 'medio', texto: 'Vas en ' + Math.round(p.pct * 100) + ' % del límite de ' + p.nombre.toLowerCase() + '. Te quedan ' + $(p.queda) + '.', accion: 'movimientos' });
    });
    (d.tarjetas || []).forEach((t) => {
      const e = AF.tarjetas.estado(t, d.movs, hoy);
      if (e.proximoVence && e.diasParaVencer != null && e.diasParaVencer <= Math.max.apply(null, PLAN.alertas.diasAntesVencimiento)) {
        out.push({ tipo: 'tarjeta', nivel: e.diasParaVencer <= 1 ? 'alto' : 'medio', texto: t.nombre + ' vence ' + (e.diasParaVencer <= 0 ? 'hoy' : e.diasParaVencer === 1 ? 'mañana' : 'en ' + e.diasParaVencer + ' días') + ': ' + $(e.aPagarProximo) + '.', accion: 'tarjetas' });
      }
    });
    (d.pagosFijos || []).forEach((p) => {
      if (p.activo === false) return;
      const cic = ciclo(d, hoy);
      const f = fijosPendientes(d, cic, hoy).lista.find((x) => x.nombre === p.nombre);
      if (f && f.atrasado) out.push({ tipo: 'fijo', nivel: 'alto', texto: p.nombre + ' está sin pagar (' + $(p.monto) + ').', accion: 'mas' });
      else if (f && U.diasEntre(hoy, f.vence) <= 3) out.push({ tipo: 'fijo', nivel: 'medio', texto: p.nombre + ' vence el ' + U.deISO(f.vence).getDate() + ': ' + $(p.monto) + '.', accion: 'mas' });
    });
    if (pro) {                                                  // predictivas (Pro): con acción
      const pg = puedesGastarHoy(d, hoy, 'completo');
      // Con pocos días de datos el ritmo no dice nada (un solo gasto grande lo dispara): se espera a tener una semana.
      const transcurridos = Math.max(1, U.diasEntre(pg.inicio, hoy));
      const ritmo = pg.gastadoAntes / transcurridos;
      const proyectado = ritmo * pg.dias;
      const falta = r2(proyectado - (pg.disponible - pg.gastadoHoy));
      if (transcurridos >= PLAN.alertas.diasMinimosPrediccion && pg.gastadoAntes > 0 && falta > 1) out.push({ tipo: 'prediccion', nivel: 'medio', pro: true, texto: 'Al ritmo actual te faltarán unos ' + $(Math.round(falta)) + ' antes de tu cobro.', accion: 'inicio' });
    }
    return out;
  }

  /* ------------------------------------------------------------------------------ SRI */
  function sri(d, anio) {
    const S = PLAN.sri;
    const desde = anio + '-01-01', hasta = anio + '-12-31';
    const porRubro = {}; let total = 0;
    d.movs.forEach((m) => {
      if (m.tipo !== 'gasto' || !enRango(m, desde, hasta)) return;
      const rubro = m.sri !== undefined ? m.sri : catDe(d, m.cat).sri;
      if (!rubro) return;
      porRubro[rubro] = (porRubro[rubro] || 0) + m.monto; total += m.monto;
    });
    const cargas = Math.min(5, d.ajustes.cargas || 0);
    const canastas = S.canastasPorCargas[cargas];
    const tope = r2(canastas * S.canastaBasica);
    const base = Math.min(total, tope);
    return {
      porRubro: Object.entries(porRubro).map(([k, v]) => ({ rubro: k, nombre: S.rubros[k] || k, total: r2(v) })).sort((a, b) => b.total - a.total),
      total: r2(total), cargas, canastas, tope, base: r2(base), rebaja: r2(base * S.porcentajeRebaja),
      rebajaMaxima: r2(S.canastasPorCargas[5] * S.canastaBasica * S.porcentajeRebaja), topeRubroConocido: S.topePorRubro != null,
    };
  }

  /* ------------------------------------------------------------------------ Series */
  function serieMensual(d, hoy, n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const ini = U.sumarMeses(U.inicioMes(hoy), -i);
      const t = totales(d, ini, U.finMes(ini));
      out.push({ mes: ini.slice(0, 7), etiqueta: U.MESES_CORTOS[U.deISO(ini).getMonth()], ingresos: t.ingresos, gastos: t.gastos });
    }
    return out;
  }

  /* --------------------------------------------------------------------- Exportar CSV */
  function csv(d, desde, hasta) {
    const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const filas = [['Fecha', 'Tipo', 'Monto', 'Categoría', 'Descripción', 'Cuenta', 'Necesario o gusto']];
    d.movs.filter((m) => (!desde || m.fecha >= desde) && (!hasta || m.fecha <= hasta)).sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).forEach((m) => {
      const c = catDe(d, m.cat);
      filas.push([m.fecha, m.tipo, String(m.monto).replace('.', ','), c.nombre, m.desc || '', m.cuenta === 'tarjeta' ? 'Tarjeta' : 'Efectivo', (m.nec !== undefined ? m.nec : c.nec) === 'N' ? 'Necesario' : (m.nec !== undefined ? m.nec : c.nec) === 'G' ? 'Gusto' : '']);
    });
    return '﻿' + filas.map((f) => f.map(esc).join(';')).join('\r\n');
  }

  /* ------------------------------------------------------- Resumen para compartir (sin montos) */
  // rango (opcional): { desde, hasta, etiqueta }; sin rango, el mes de «hoy».
  function resumenCompartir(d, hoy, rango) {
    const t = rango ? totales(d, rango.desde, rango.hasta) : totales(d, U.inicioMes(hoy), U.finMes(hoy));
    const nombre = rango ? rango.etiqueta : U.nombreMes(hoy);
    const lineas = ['Mi ' + nombre + ' con ' + PLAN.app.nombre];
    t.porCategoria.slice(0, 3).forEach((c) => lineas.push(c.cat.icono + ' ' + Math.round(c.pct * 100) + ' % en ' + c.cat.nombre.toLowerCase()));
    const totalNec = t.nec.N + t.nec.G + t.nec.sin;
    if (totalNec) lineas.push('Necesario ' + Math.round((t.nec.N / totalNec) * 100) + ' %, gustos ' + Math.round((t.nec.G / totalNec) * 100) + ' %');
    if (t.ingresos > 0) lineas.push('Me sobró ' + Math.max(0, Math.round(((t.ingresos - t.gastos) / t.ingresos) * 100)) + ' % de lo que gané');
    return lineas.join('\n');
  }

  /* ---------------------------------------------------------- Respuestas del botón único */
  // Devuelve { texto, voz, filas:[{icono, etiqueta, valor}], bloqueado?: funcion, ir?: pestaña }
  function responder(q, d, hoy, esPro) {
    const per = q.periodo || { desde: U.inicioMes(hoy), hasta: U.finMes(hoy), etiqueta: 'este mes' };
    const filasCat = (lista, n) => lista.slice(0, n || 8).map((x) => ({ icono: x.cat.icono, etiqueta: x.cat.nombre, valor: $(x.total) }));
    const quitaSimbolo = (t) => t.replace(/\$/g, '').replace(/−/g, 'menos ');
    const res = (texto, extra) => Object.assign({ texto, voz: texto.replace(/\$([\d.,]+)/g, (_, n) => n.replace(/\./g, '').replace(',', ' con ') + ' dólares') }, extra);
    const dinero = (v) => $(v);

    switch (q.tema) {
      case 'ingresos': {
        const t = totales(d, per.desde, per.hasta);
        if (!t.ingresos) return res('No tienes ingresos registrados ' + per.etiqueta + '.');
        const partes = ingresosPorCategoria(d, per.desde, per.hasta);
        const detalle = partes.length > 1 ? ' (' + partes.map((p) => dinero(p.total) + ' de ' + p.cat.nombre.toLowerCase()).join(' + ') + ')' : '';
        return res('Tus ingresos ' + per.etiqueta + ' son ' + dinero(t.ingresos) + detalle + '.', { filas: partes.map((p) => ({ icono: p.cat.icono, etiqueta: p.cat.nombre, valor: dinero(p.total) })) });
      }
      case 'gastos': {
        const t = totales(d, per.desde, per.hasta);
        if (q.cat) {
          const x = t.porCategoria.find((c) => c.id === q.cat);
          const nombre = catDe(d, q.cat).nombre.toLowerCase();
          return res(x ? 'En ' + nombre + ' gastaste ' + dinero(x.total) + ' ' + per.etiqueta + '.' : 'No tienes gastos en ' + nombre + ' ' + per.etiqueta + '.');
        }
        return res('Has gastado ' + dinero(t.gastos) + ' ' + per.etiqueta + '.', { filas: filasCat(t.porCategoria, 5) });
      }
      case 'desglose': {
        const t = totales(d, per.desde, per.hasta);
        if (!t.gastos) return res('No tienes gastos registrados ' + per.etiqueta + '.');
        return res('Gastos ' + per.etiqueta + ': ' + dinero(t.gastos) + ' en total.', { filas: filasCat(t.porCategoria, 12), grafica: 'categorias' });
      }
      case 'masgasto': {
        const t = totales(d, per.desde, per.hasta);
        if (!t.porCategoria.length) return res('Aún no tienes gastos ' + per.etiqueta + '.');
        const a = t.porCategoria[0];
        let extra = '';
        const ant = U.sumarMeses(U.inicioMes(per.desde), -1);
        const tp = totales(d, ant, U.finMes(ant)); const antes = tp.porCategoria.find((c) => c.id === a.id);
        if (antes && antes.total > 0 && per.clave === 'mes') { const dif = Math.round(((a.total - antes.total) / antes.total) * 100); extra = dif > 0 ? ' Subió ' + dif + ' % frente al mes pasado.' : dif < 0 ? ' Bajó ' + Math.abs(dif) + ' % frente al mes pasado.' : ''; }
        return res('Gastas más en ' + a.cat.nombre.toLowerCase() + ': ' + dinero(a.total) + ' (' + Math.round(a.pct * 100) + ' % de tus gastos).' + extra, { filas: filasCat(t.porCategoria, 5) });
      }
      case 'balance': {
        const t = totales(d, per.desde, per.hasta);
        return res('Ingresos ' + dinero(t.ingresos) + ', gastos ' + dinero(t.gastos) + '. Balance ' + dinero(t.balance) + ' ' + per.etiqueta + '.', { filas: [{ icono: '💼', etiqueta: 'Ingresos', valor: dinero(t.ingresos) }, { icono: '🧾', etiqueta: 'Gastos', valor: dinero(t.gastos) }, { icono: '⚖️', etiqueta: 'Balance', valor: dinero(t.balance) }] });
      }
      case 'necesario_gusto': {
        const t = totales(d, per.desde, per.hasta);
        const tot = t.nec.N + t.nec.G + t.nec.sin;
        if (!tot) return res('Aún no hay gastos ' + per.etiqueta + '.');
        return res('De tus gastos ' + per.etiqueta + ', ' + Math.round((t.nec.N / tot) * 100) + ' % es necesario (' + dinero(t.nec.N) + ') y ' + Math.round((t.nec.G / tot) * 100) + ' % es gusto (' + dinero(t.nec.G) + ').');
      }
      case 'hormiga': {
        const h = hormiga(d, per.desde, per.hasta);
        if (!h.veces) return res('No tienes gastos hormiga ' + per.etiqueta + '. Muy bien.');
        if (!esPro) return res('Tus gastos hormiga ' + per.etiqueta + ' suman ' + dinero(h.total) + ' en ' + h.veces + (h.veces === 1 ? ' compra pequeña' : ' compras pequeñas') + '.', { bloqueado: 'hormigaDetalle', gancho: 'Al año serían unos ' + dinero(h.alAnio) + '. Pro te muestra cuáles son y cuánto ahorrarías.' });
        return res('Gastos hormiga ' + per.etiqueta + ': ' + dinero(h.total) + ' en ' + h.veces + ' compras. Al ritmo actual serían unos ' + dinero(h.alAnio) + ' al año.', { filas: h.porProducto.slice(0, 6).map((p) => ({ icono: p.icono, etiqueta: p.nombre + ' (' + p.veces + ')', valor: dinero(p.total) })) });
      }
      case 'ahorro': {
        const t = totales(d, per.desde, per.hasta);
        return res(t.balance >= 0 ? 'Has ahorrado ' + dinero(t.balance) + ' ' + per.etiqueta + '.' : 'Gastaste ' + dinero(-t.balance) + ' más de lo que ganaste ' + per.etiqueta + '.');
      }
      case 'disponible': {
        const p = puedesGastarHoy(d, hoy, esPro ? 'completo' : 'simple');
        if (!p.ingresos) return res('Aún no tengo tus ingresos de este periodo. Registra tu sueldo y te digo cuánto puedes gastar.');
        return res(p.pasado ? 'Hoy ya te pasaste ' + dinero(-p.hoyDisponible) + ' de lo que podías gastar.' : 'Hoy puedes gastar ' + dinero(p.hoyDisponible) + '. Hasta tu cobro te quedan ' + dinero(p.resto) + ' en ' + p.dias + ' días.', { ir: 'inicio' });
      }
      case 'tarjeta': {
        const ts = d.tarjetas || [];
        if (!ts.length) return res('Aún no tienes tarjetas. Agrégala en la pestaña Tarjetas y te calculo lo que debes pagar.', { ir: 'tarjetas' });
        const lista = q.tarjetaId ? ts.filter((t) => t.id === q.tarjetaId) : ts;
        const filas = []; let total = 0; let masProx = null;
        lista.forEach((t) => {
          const e = AF.tarjetas.estado(t, d.movs, hoy);
          total += e.aPagarProximo;
          if (e.proximoVence && (!masProx || e.proximoVence < masProx)) masProx = e.proximoVence;
          filas.push({ icono: '💳', etiqueta: t.nombre + (e.proximoVence ? ' (vence ' + U.fechaCorta(e.proximoVence, hoy) + ')' : ''), valor: dinero(e.aPagarProximo) });
        });
        if (!total) return res('No debes pagar nada de ' + (lista.length === 1 ? lista[0].nombre : 'tus tarjetas') + ' por ahora.', { filas });
        return res('Debes pagar ' + dinero(total) + (masProx ? ' hasta el ' + U.deISO(masProx).getDate() + ' de ' + U.nombreMes(masProx) : '') + '. Es un estimado: ajústalo con tu estado de cuenta.', { filas, ir: 'tarjetas' });
      }
      case 'meconviene': {
        if (!esPro) {
          const p = puedesGastarHoy(d, hoy, 'simple');
          return res('Esta respuesta es de Pro.', { bloqueado: 'meConviene', gancho: q.monto ? 'Una compra de ' + dinero(q.monto) + ' es el ' + (p.disponible > 0 ? Math.round((q.monto / p.disponible) * 100) : 100) + ' % de lo que te queda hasta el cobro. Pro te dice si te conviene.' : 'Pro te dice si te alcanza sin descuadrar el mes.' });
        }
        if (!q.monto) return res('¿De cuánto es la compra? Dime el monto y te digo si te alcanza.');
        const p = puedesGastarHoy(d, hoy, 'completo');
        const queda = r2(p.resto - q.monto);
        if (queda >= 0) return res('Sí te alcanza: después de ' + dinero(q.monto) + ' te quedarían ' + dinero(queda) + ' hasta tu cobro, unos ' + dinero(Math.floor(queda / p.dias)) + ' por día.');
        return res('No te alcanza este periodo: te faltarían ' + dinero(-queda) + ' antes de tu cobro. Si la difieres, la cuota pesa menos; mira el simulador.');
      }
      default:
        return res('No entendí qué quieres saber. Prueba con «cuánto gasté este mes» o «desglósame mis gastos».');
    }
  }

  /* ------------------------------------------------- Pagos fijos, suscripciones, préstamos */
  // Estado de un pago fijo en el ciclo de cobro actual.
  function estadoFijo(d, p, hoy) {
    const cic = ciclo(d, hoy);
    const venceCiclo = U.proximoDia(cic.inicio, p.dia);
    const enCiclo = venceCiclo < cic.proximo;
    const pagado = enCiclo && d.movs.some((m) => m.pagoFijoId === p.id && m.fecha >= cic.inicio);
    const proxima = !enCiclo ? venceCiclo : pagado ? U.proximoDia(cic.proximo, p.dia) : venceCiclo;
    return { proxima, pagado, atrasado: enCiclo && !pagado && venceCiclo < hoy, diasPara: U.diasEntre(hoy, proxima) };
  }

  // Pagos que se repiten solos cada mes (mismo concepto, monto parecido, mismo día más o menos) y aún no están en «pagos fijos».
  function suscripcionesDetectadas(d, hoy) {
    const cfg = PLAN.suscripciones;
    const conocidas = new Set((d.pagosFijos || []).map((p) => U.norm(p.nombre)));
    const grupos = {};
    d.movs.forEach((m) => {
      if (m.tipo !== 'gasto' || m.monto <= PLAN.hormiga.montoMaximo) return;
      const c = catDe(d, m.cat);
      const nombre = (m.desc || (c.id === 'suscripciones' ? c.nombre : '')).trim();
      if (!nombre) return;
      const k = U.norm(nombre);
      (grupos[k] = grupos[k] || { nombre, cat: m.cat, porMes: {} }).porMes[m.fecha.slice(0, 7)] = m;
    });
    const mesAnterior = U.sumarMeses(U.inicioMes(hoy), -1).slice(0, 7);
    const out = [];
    Object.keys(grupos).forEach((k) => {
      if (conocidas.has(k)) return;
      const g = grupos[k];
      const meses = Object.keys(g.porMes).sort();
      // racha de meses seguidos que termina en el último mes con pago
      let run = [meses[meses.length - 1]];
      for (let i = meses.length - 2; i >= 0; i--) { if (U.sumarMeses(meses[i] + '-01', 1).slice(0, 7) === run[0]) run.unshift(meses[i]); else break; }
      if (run.length < cfg.minimoMeses || run[run.length - 1] < mesAnterior) return;       // se dejó de repetir
      const ms = run.map((x) => g.porMes[x]);
      const montos = ms.map((m) => m.monto).sort((a, b) => a - b), med = montos[Math.floor(montos.length / 2)];
      if (ms.some((m) => Math.abs(m.monto - med) > med * cfg.toleranciaMonto)) return;
      const dias = ms.map((m) => Number(m.fecha.slice(8)));
      if (Math.max.apply(null, dias) - Math.min.apply(null, dias) > cfg.toleranciaDias) return;
      const ult = ms[ms.length - 1];
      out.push({ nombre: g.nombre, monto: r2(ult.monto), dia: Number(ult.fecha.slice(8)), cat: g.cat, meses: run.length, ultima: ult.fecha });
    });
    return out.sort((a, b) => b.monto - a.monto);
  }

  // Cuánto falta por cobrar / pagar en un préstamo entre personas
  const pendientePrestamo = (p) => r2(Math.max(0, p.monto - (p.abonos || []).reduce((s, a) => s + a.monto, 0)));
  function prestamosResumen(d) {
    let meDeben = 0, debo = 0;
    (d.prestamos || []).forEach((p) => { if (p.pagado) return; const x = pendientePrestamo(p); if (p.direccion === 'me_deben') meDeben += x; else debo += x; });
    return { meDeben: r2(meDeben), debo: r2(debo) };
  }

  /* ---------------------------------------------------------------------------- Retos */
  // Reto «30 días sin gastos hormiga». La racha cuenta días completos desde el último gasto hormiga.
  function reto(d, hoy) {
    const r = (d.retos || []).find((x) => x.estado === 'activo');
    if (!r) return null;
    const meta = PLAN.reto.dias, max = PLAN.hormiga.montoMaximo;
    const fallas = new Set();
    d.movs.forEach((m) => { if (m.tipo === 'gasto' && m.fecha >= r.inicio && m.fecha <= hoy && m.monto <= max && catDe(d, m.cat).hormiga) fallas.add(m.fecha); });
    const ultima = Array.from(fallas).sort().pop() || null;
    const desde = ultima ? U.sumarDias(ultima, 1) : r.inicio;
    const racha = desde <= hoy ? U.diasEntre(desde, hoy) : 0;
    const antes = hormiga(d, U.sumarDias(r.inicio, -30), U.sumarDias(r.inicio, -1));
    const dias = [];
    for (let i = 0; i < meta; i++) { const f = U.sumarDias(desde, i); dias.push({ fecha: f, estado: f < hoy ? 'ok' : f === hoy ? (ultima === hoy ? 'falla' : 'hoy') : 'futuro' }); }
    return { id: r.id, inicio: r.inicio, meta, racha: Math.min(racha, meta), ultimaFalla: ultima, fallaHoy: ultima === hoy, fallos: fallas.size, completado: racha >= meta,
      ahorroEstimado: r2((antes.total / 30) * Math.min(racha, meta)), dias };
  }

  /* ----------------------------------------------------------------------- Conciliar */
  // Compara líneas de un estado de cuenta con lo registrado. Cada línea se une con a lo más un movimiento.
  // lineas: [{fecha, desc, monto}] (gastos). tarjetaId (opcional) limita a esa tarjeta y permite ver lo que «sobra».
  function conciliar(d, lineas, tarjetaId) {
    const tol = PLAN.conciliar;
    const usados = new Set();
    const candidatos = d.movs.filter((m) => m.tipo === 'gasto' && (!tarjetaId || (m.cuenta === 'tarjeta' && m.tarjetaId === tarjetaId)));
    const res = lineas.map((l) => {
      let mejor = null, mejorDif = 1e9;
      candidatos.forEach((m) => {
        if (usados.has(m.id) || Math.abs(m.monto - l.monto) > tol.toleranciaMonto) return;
        const dif = Math.abs(U.diasEntre(m.fecha, l.fecha));
        if (dif <= tol.toleranciaDias && dif < mejorDif) { mejor = m; mejorDif = dif; }
      });
      if (mejor) usados.add(mejor.id);
      return Object.assign({}, l, { estado: mejor ? 'ya' : 'falta', mov: mejor });
    });
    let sobran = [];
    if (tarjetaId && lineas.length) {
      const fechas = lineas.map((l) => l.fecha).sort(), desde = U.sumarDias(fechas[0], -tol.toleranciaDias), hasta = U.sumarDias(fechas[fechas.length - 1], tol.toleranciaDias);
      sobran = candidatos.filter((m) => !usados.has(m.id) && m.fecha >= desde && m.fecha <= hasta);
    }
    return { lineas: res, sobran, faltan: res.filter((x) => x.estado === 'falta').length, ya: res.filter((x) => x.estado === 'ya').length };
  }

  /* ---------------------------------------------------------- Aplicar una corrección */
  // Busca el movimiento al que se refiere: el último (o el último de una categoría).
  function objetivoDeCorreccion(d, objetivo) {
    const lista = d.movs.filter((m) => m.tipo !== 'pago_tarjeta' && (!objetivo || !objetivo.cat || m.cat === objetivo.cat));
    return lista.sort((a, b) => (b.fecha === a.fecha ? b.creado - a.creado : b.fecha < a.fecha ? -1 : 1))[0] || null;
  }

  AF.informes = { totales, ingresosPorCategoria, hormiga, ciclo, ultimoDiaCobro, puedesGastarHoy, presupuestos, alertas, sri, serieMensual, csv, resumenCompartir, responder, objetivoDeCorreccion, catDe,
    estadoFijo, suscripcionesDetectadas, pendientePrestamo, prestamosResumen, reto, conciliar };
  if (typeof module === 'object' && module.exports) module.exports = AF.informes;
})(typeof window !== 'undefined' ? window : globalThis);
