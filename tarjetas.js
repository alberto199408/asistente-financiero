/* Motor de tarjetas: corriente, diferido (con y sin intereses), rotativo. Cuotas, corte, vencimiento y deuda.
   REGLA: nunca se inventa una tasa. Si falta, el resultado trae faltaTasa/faltanDatos y la app la pide.
   Todos los valores son ESTIMADOS: el estado de cuenta del banco manda (botón "ajustar con mi estado de cuenta"). */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const U = AF.util;
  const r2 = U.r2;

  /* ------------------------------------------------------------ Matemática de cuotas */
  // Cuota fija (sistema francés). tasaAnual en % nominal anual (15.6 = 15,6 %). Mensual = tasa / 12.
  function cuotaFrancesa(monto, tasaAnual, n) {
    if (!n || n < 1) return null;
    const i = (tasaAnual || 0) / 100 / 12;
    if (i === 0) return r2(monto / n);
    return r2((monto * i) / (1 - Math.pow(1 + i, -n)));
  }
  // Tasa anual (%) que explica una cuota informada. null si la cuota no cubre ni el capital (cuota*n < monto).
  function tasaImplicita(monto, cuota, n) {
    if (!(monto > 0 && cuota > 0 && n > 0) || cuota * n < monto - 0.005) return null;
    if (Math.abs(cuota * n - monto) < 0.005) return 0;
    let lo = 0, hi = 5; // hasta 500 % mensual: de sobra
    for (let k = 0; k < 80; k++) {
      const mid = (lo + hi) / 2;
      const c = (monto * mid) / (1 - Math.pow(1 + mid, -n));
      if (c > cuota) hi = mid; else lo = mid;
    }
    return r2(((lo + hi) / 2) * 12 * 100);
  }

  /* ----------------------------------------------------------------------- Fechas de tarjeta */
  const diaEnMes = (y, m, dia) => Math.min(dia, new Date(y, m + 1, 0).getDate());
  // Primera fecha de corte >= desde
  function proximoCorte(tarjeta, desde) {
    const f = U.deISO(desde);
    let y = f.getFullYear(), m = f.getMonth();
    let c = U.iso(new Date(y, m, diaEnMes(y, m, tarjeta.diaCorte)));
    if (c < desde) { m++; c = U.iso(new Date(y, m, diaEnMes(y + Math.floor(m / 12), m % 12, tarjeta.diaCorte))); }
    return c;
  }
  // Fecha límite de pago del estado que cierra en "corte": el diaVencimiento siguiente al corte.
  function vencimientoDe(tarjeta, corte) {
    const f = U.deISO(corte);
    let y = f.getFullYear(), m = f.getMonth();
    let v = U.iso(new Date(y, m, diaEnMes(y, m, tarjeta.diaVencimiento)));
    if (v <= corte) { m++; v = U.iso(new Date(y + Math.floor(m / 12), m % 12, diaEnMes(y + Math.floor(m / 12), m % 12, tarjeta.diaVencimiento))); }
    return v;
  }
  const sumarCortes = (tarjeta, corte, k) => {
    const f = U.deISO(corte); let m = f.getMonth() + k, y = f.getFullYear() + Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return U.iso(new Date(y, m, diaEnMes(y, m, tarjeta.diaCorte)));
  };

  /* ------------------------------------------------------------------- Plan de una compra */
  // mov = { monto, fecha, credito: { modo, meses, cuota, interes, tasaAnual } }
  function planCompra(mov, tarjeta) {
    const cr = mov.credito || { modo: 'corriente' };
    const modo = cr.modo || 'corriente';
    const faltan = [];
    if (!(tarjeta && tarjeta.diaCorte && tarjeta.diaVencimiento)) faltan.push('fechas');
    const out = { modo, cuotas: [], total: mov.monto, interesTotal: 0, faltaTasa: false, informada: false, faltanDatos: faltan, avisos: [] };
    if (faltan.length) return out;
    const corte1 = proximoCorte(tarjeta, mov.fecha);
    const venceDe = (k) => vencimientoDe(tarjeta, sumarCortes(tarjeta, corte1, k));

    if (modo === 'corriente' || modo === 'rotativo') {
      out.cuotas = [{ n: 1, de: 1, monto: r2(mov.monto), interes: 0, capital: r2(mov.monto), vence: venceDe(0) }];
      if (modo === 'rotativo') out.avisos.push('Rotativo: lo que no pagues del total genera intereses. Pon la tasa de tu tarjeta para estimarlos.');
      return out;
    }
    // diferido
    let n = cr.meses || null;
    const sinInteres = cr.interes === false;
    const tasa = cr.tasaAnual != null ? cr.tasaAnual : (tarjeta.tasaAnual != null ? tarjeta.tasaAnual : null);
    if (!n && cr.cuota) { n = Math.round(mov.monto / cr.cuota); out.avisos.push('No dijiste el número de cuotas: se supone ' + n + '.'); }
    if (!n) { out.faltanDatos.push('meses'); return out; }

    let cuota = null, tasaUsada = 0;
    if (cr.cuota != null) {                                   // cuota informada por la persona: manda
      cuota = r2(cr.cuota); out.informada = true;
      const imp = tasaImplicita(mov.monto, cuota, n);
      if (imp == null) out.avisos.push('Revisa: ' + n + ' cuotas de ' + U.dinero(cuota) + ' suman ' + U.dinero(cuota * n) + ', menos que la compra de ' + U.dinero(mov.monto) + '.');
      else if (sinInteres && imp > 0.5) out.avisos.push('Dijiste sin intereses, pero ' + n + ' cuotas de ' + U.dinero(cuota) + ' suman ' + U.dinero(cuota * n) + ' para una compra de ' + U.dinero(mov.monto) + '. Revisa el valor.');
      else if (imp > 80) out.avisos.push('Esas cuotas implican una tasa de ' + imp + ' % anual. Revisa el valor.');
      tasaUsada = imp || 0;
    } else if (sinInteres) {
      cuota = r2(mov.monto / n);
    } else if (tasa == null) {
      out.faltaTasa = true; out.faltanDatos.push('tasa');
      return out;                                             // sin tasa no hay cuota: se le pide a la persona
    } else {
      cuota = cuotaFrancesa(mov.monto, tasa, n); tasaUsada = tasa;
    }
    // tabla: interés sobre saldo; la última cuota absorbe el redondeo
    let saldo = mov.monto; const i = tasaUsada / 100 / 12; let sumaCuotas = 0;
    for (let k = 1; k <= n; k++) {
      const interes = r2(saldo * i);
      let monto = cuota;
      let capital = r2(monto - interes);
      if (k === n) { capital = r2(saldo); monto = r2(capital + interes); }
      saldo = r2(saldo - capital);
      sumaCuotas += monto;
      out.cuotas.push({ n: k, de: n, monto, interes, capital, vence: venceDe(k - 1) });
    }
    out.total = r2(sumaCuotas);
    out.interesTotal = r2(sumaCuotas - mov.monto);
    return out;
  }

  /* --------------------------------------------------------------- Estado de una tarjeta */
  // movs: todos los movimientos. Se usan los de esta tarjeta (compras con cuenta 'tarjeta' y pagos 'pago_tarjeta').
  function estado(tarjeta, movs, hoy) {
    hoy = hoy || U.hoyISO();
    const faltanDatos = [];
    if (!(tarjeta.diaCorte && tarjeta.diaVencimiento)) faltanDatos.push('fechas');
    const compras = movs.filter((m) => m.tipo === 'gasto' && m.cuenta === 'tarjeta' && m.tarjetaId === tarjeta.id);
    const pagos = movs.filter((m) => m.tipo === 'pago_tarjeta' && m.tarjetaId === tarjeta.id);
    let todas = [], avisos = [], sinTasa = [];
    compras.forEach((c) => {
      const p = planCompra(c, tarjeta);
      p.avisos.forEach((a) => avisos.push(a));
      if (p.faltaTasa) sinTasa.push(c);
      p.cuotas.forEach((q) => todas.push(Object.assign({ compraId: c.id, desc: c.desc, cat: c.cat }, q)));
    });
    todas.sort((a, b) => (a.vence < b.vence ? -1 : a.vence > b.vence ? 1 : a.n - b.n));
    // pagos aplicados a las cuotas más antiguas primero
    let abono = r2(pagos.reduce((s, p) => s + p.monto, 0));
    todas.forEach((q) => {
      const aplica = Math.min(abono, q.monto);
      q.pagado = r2(aplica); q.pendiente = r2(q.monto - aplica); abono = r2(abono - aplica);
    });
    const pendientes = todas.filter((q) => q.pendiente > 0.004);
    const deudaTotal = r2(pendientes.reduce((s, q) => s + q.pendiente, 0));
    const capitalPendiente = r2(pendientes.reduce((s, q) => s + q.capital * (q.pendiente / q.monto), 0));
    // próximo vencimiento = la fecha más próxima con algo pendiente
    const prox = pendientes[0] || null;
    const proximoVence = prox ? prox.vence : null;
    const aPagarProximo = prox ? r2(pendientes.filter((q) => q.vence === proximoVence).reduce((s, q) => s + q.pendiente, 0)) : 0;
    const interesProximo = prox ? r2(pendientes.filter((q) => q.vence === proximoVence).reduce((s, q) => s + q.interes, 0)) : 0;
    const cuotasProximo = prox ? pendientes.filter((q) => q.vence === proximoVence) : [];
    const diferidasProximo = r2(cuotasProximo.filter((q) => q.de > 1).reduce((s, q) => s + q.pendiente, 0));
    const corriente = r2(aPagarProximo - diferidasProximo);
    let pagoMinimo = null;
    if (tarjeta.pagoMinimoPct != null) pagoMinimo = r2(Math.min(aPagarProximo, diferidasProximo + corriente * (tarjeta.pagoMinimoPct / 100)));
    const cupoUsado = capitalPendiente;
    const cupoDisponible = tarjeta.cupo != null ? r2(tarjeta.cupo - cupoUsado) : null;
    const siguienteCorte = tarjeta.diaCorte ? proximoCorte(tarjeta, hoy) : null;
    return {
      cuotas: todas, pendientes, deudaTotal, capitalPendiente, cupoUsado, cupoDisponible, proximoVence, aPagarProximo, interesProximo,
      diferidasProximo, pagoMinimo, siguienteCorte,
      diasParaVencer: proximoVence ? U.diasEntre(hoy, proximoVence) : null,
      diasParaCorte: siguienteCorte ? U.diasEntre(hoy, siguienteCorte) : null,
      faltanDatos, avisos, comprasSinTasa: sinTasa.length,
    };
  }

  // Compara pagar el mínimo o el total (solo si hay tasa y mínimo conocidos: nunca se inventan)
  function minimoVsTotal(tarjeta, est) {
    if (tarjeta.tasaAnual == null || est.pagoMinimo == null || !est.aPagarProximo) return null;
    const resto = r2(est.aPagarProximo - est.pagoMinimo);
    const interesMes = r2(resto * (tarjeta.tasaAnual / 100 / 12));
    return { pagarTotal: est.aPagarProximo, pagarMinimo: est.pagoMinimo, queda: resto, interesEstimadoMes: interesMes };
  }

  AF.tarjetas = { cuotaFrancesa, tasaImplicita, proximoCorte, vencimientoDe, planCompra, estado, minimoVsTotal };
  if (typeof module === 'object' && module.exports) module.exports = AF.tarjetas;
})(typeof window !== 'undefined' ? window : globalThis);
