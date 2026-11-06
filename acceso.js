/* Gratis vs Pro. No decide nada por su cuenta: todo se lee de PLAN (funciones, límites, prueba, IA). */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const U = AF.util, PLAN = AF.PLAN;
  const datos = () => AF.store.d;
  const mesClave = (hoy) => hoy.slice(0, 7);

  // { tipo: 'pro' | 'prueba' | 'gratis', diasPrueba: n }
  function estado(hoy) {
    hoy = hoy || U.hoyISO();
    const p = datos().plan;
    if (p.proHasta && p.proHasta >= hoy) return { tipo: 'pro', hasta: p.proHasta, diasPrueba: 0 };
    if (p.inicioPrueba) {
      const usados = U.diasEntre(p.inicioPrueba, hoy);
      if (usados >= 0 && usados < PLAN.prueba.diasProGratis) return { tipo: 'prueba', diasPrueba: PLAN.prueba.diasProGratis - usados };
    }
    return { tipo: 'gratis', diasPrueba: 0 };
  }
  const esPro = (hoy) => estado(hoy).tipo !== 'gratis';

  function tiene(funcion, hoy) {
    const f = PLAN.funciones[funcion];
    if (!f) return false;
    return esPro(hoy) ? !!f.p : !!f.g;
  }
  const limite = (nombre, hoy) => PLAN.limites[esPro(hoy) ? 'pro' : 'gratis'][nombre];
  const puedeAgregar = (nombre, cantidadActual, hoy) => cantidadActual < limite(nombre, hoy);
  const explicacion = (funcion) => PLAN.explicacionPro[funcion] || 'Disponible en Pro.';

  function iniciarPrueba(hoy) {
    const p = datos().plan;
    if (!p.inicioPrueba) { p.inicioPrueba = hoy || U.hoyISO(); AF.store.guardar(); }
  }
  function activarPro(hasta) { datos().plan.proHasta = hasta; AF.store.guardar(); AF.bus.emit('plan'); }

  /* ---- IA (solo Pro, con tope mensual) */
  function iaUsadas(hoy) { return datos().plan.ia[mesClave(hoy || U.hoyISO())] || 0; }
  function iaRestantes(hoy) { return Math.max(0, PLAN.ia.limiteMensualConsultas - iaUsadas(hoy)); }
  function iaDisponible(hoy) { return !!PLAN.ia.urlWorker && esPro(hoy) && iaRestantes(hoy) > 0; }
  function iaUsar(hoy) {
    const k = mesClave(hoy || U.hoyISO());
    datos().plan.ia[k] = (datos().plan.ia[k] || 0) + 1;
    AF.store.guardar();
  }

  AF.acceso = { estado, esPro, tiene, limite, puedeAgregar, explicacion, iniciarPrueba, activarPro, iaUsadas, iaRestantes, iaDisponible, iaUsar };
  if (typeof module === 'object' && module.exports) module.exports = AF.acceso;
})(typeof window !== 'undefined' ? window : globalThis);
