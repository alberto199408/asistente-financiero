/* Arranque, sesión, bloqueo, navegación. Aquí se decide qué pantalla toca. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, aviso } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const Sg = () => AF.seguridad, N = () => AF.nativo, S = () => AF.store;
  const d = g.document;
  const V = () => AF.vistas;

  const app = {
    sesion: null, ns: null, abierta: false, tab: 'inicio', pila: [], exento: false, sinHuellaAuto: false,
    hoy: () => U.hoyISO(),
    pro: () => AF.acceso.esPro(),
  };
  const raiz = () => d.getElementById('app');

  /* ------------------------------------------------------------------ estructura */
  let vistaEl, pestanasEl, compositorEl;
  const TABS = [['inicio', 'Inicio', 'inicio'], ['movimientos', 'Movimientos', 'movimientos'], ['tarjetas', 'Tarjetas', 'tarjeta'], ['mas', 'Más', 'mas']];

  function armar() {
    if (vistaEl) return;
    vistaEl = h('div', { id: 'vista' });
    pestanasEl = h('nav', { class: 'pestanas oculto', 'aria-label': 'Secciones' }, TABS.map(([k, t, i]) => h('button', { class: 'pestana', type: 'button', 'data-tab': k, onclick: () => app.ir(k) }, h('span', { class: 'ico-wrap' }, ico(i)), t)));
    compositorEl = h('div', { class: 'compositor oculto' }, h('div', { class: 'compositor-barra' },
      h('button', { class: 'compositor-texto', type: 'button', onclick: () => V().voz.abrir({ modo: 'texto' }) }, 'Dime un gasto o un ingreso'),
      h('button', { class: 'mic', type: 'button', 'aria-label': 'Hablar', onclick: () => V().voz.abrir({ modo: 'voz' }) }, ico('mic'))));
    const r = raiz(); r.appendChild(vistaEl); r.appendChild(pestanasEl); r.appendChild(compositorEl);
  }
  function cerrarCapas() { raiz().querySelectorAll('.telon, .hoja, .voz, .aviso-flotante').forEach((e) => e.remove()); }

  // Muestra una pantalla completa sin barra de pestañas (portada, bienvenida, PIN)
  app.pantalla = function (nodo) {
    armar(); cerrarCapas();
    app.abierta = false;
    pestanasEl.classList.add('oculto'); compositorEl.classList.add('oculto');
    AF.ui.vaciar(vistaEl);
    if (nodo) vistaEl.appendChild(nodo);
    AF.tema.aplicar('auto');
    g.scrollTo(0, 0);
  };

  /* ------------------------------------------------------------------ navegación */
  function pintarPestanas() {
    pestanasEl.querySelectorAll('.pestana').forEach((b) => { if (b.dataset.tab === app.tab && !app.pila.length) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  }
  function dibujar() {
    if (!app.abierta) return;
    const y = g.scrollY;
    AF.ui.vaciar(vistaEl);
    const tope = app.pila[app.pila.length - 1];
    if (tope) {
      const cuerpo = h('div', { class: 'contenido' });
      const cab = h('header', { class: 'barra-superior' }, h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Atrás', onclick: () => app.atras() }, ico('atras')), h('h1', { class: 'h2' }, tope.titulo));
      vistaEl.appendChild(h('main', { class: 'pantalla' }, cab, cuerpo));
      const extra = tope.render(cuerpo, tope);
      if (extra && extra.derecha) cab.appendChild(extra.derecha);
    } else {
      const v = V()[app.tab];
      const cont = h('main', { class: 'pantalla' });
      vistaEl.appendChild(cont);
      v.render(cont);
    }
    pintarPestanas();
    g.scrollTo(0, y);
  }
  let rafRef = 0;
  app.noRefrescar = false;
  app.refrescar = () => { if (app.noRefrescar) return; cancelAnimationFrame(rafRef); rafRef = requestAnimationFrame(dibujar); };
  app.redibujar = () => { cancelAnimationFrame(rafRef); rafRef = requestAnimationFrame(dibujar); };
  app.ir = (tab) => { app.noRefrescar = false; app.tab = tab; app.pila = []; cerrarCapas(); g.scrollTo(0, 0); dibujar(); };
  app.abrir = (titulo, render) => { app.noRefrescar = false; app.pila.push({ titulo, render }); g.scrollTo(0, 0); dibujar(); };
  app.atras = () => { if (app.pila.length) { app.noRefrescar = false; app.pila.pop(); g.scrollTo(0, 0); dibujar(); return true; } return false; };

  /* ----------------------------------------------------------------- datos y tema */
  function aplicarAjustes() {
    const a = S().d.ajustes;
    AF.estado = { moneda: a.moneda };
    AF.tema.aplicar(a.tema || 'auto', a.colorApp);
  }
  AF.bus.on('cambio', () => app.refrescar());
  AF.bus.on('ajustes', () => { if (app.abierta) { aplicarAjustes(); app.refrescar(); } });
  AF.bus.on('plan', () => app.refrescar());

  /* --------------------------------------------------------------------- sesión */
  async function despuesDeSesion() {
    app.ns = Sg().espacioDe(app.sesion);
    if (await Sg().existe(app.ns)) return V().acceso.bloqueo();
    if (await ofrecerRecuperar()) return V().acceso.bloqueo();
    return V().acceso.bienvenida(app.sesion);
  }
  // Teléfono nuevo (o datos borrados): si entró con Google y ya tiene una copia en su Drive, se la ofrece antes de empezar de cero.
  async function ofrecerRecuperar() {
    try {
      if (!app.sesion || app.sesion.proveedor !== 'google') return false;
      const info = await N().respaldoInfo({ soloSiHayPermiso: true });
      if (!info) return false;
      const si = await V().comun.confirmar({ titulo: 'Encontré una copia tuya en Drive', texto: 'Es del ' + new Date(info.fecha).toLocaleDateString('es') + '. ¿La recupero? Vas a necesitar el PIN que usabas entonces.', si: 'Recuperar mi copia', no: 'Empezar de cero' });
      if (!si) return false;
      const p = await N().respaldoBajar(); if (!p) return false;
      await Sg().restaurarPaquete(app.ns, p);
      return true;
    } catch (e) { return false; }      // sin internet o sin permiso: sigue como cuenta nueva (la copia se puede recuperar luego desde Más → Copia de seguridad)
  }
  app.iniciarSesion = async (s) => {
    app.sesion = s; await Sg().guardarSesion(s);
    return despuesDeSesion();
  };

  // Se llama al terminar la bienvenida: crea la bóveda, guarda los ajustes y entra.
  app.crearCuenta = async ({ ajustes, pin }) => {
    await Sg().crear(app.ns, pin);
    const nuevo = S().vacio();
    Object.assign(nuevo.ajustes, { nombre: ajustes.nombre, pais: ajustes.pais, moneda: ajustes.moneda, diaCobro: ajustes.diaCobro, sueldo: ajustes.sueldo || null, cargas: ajustes.cargas || 0, bienvenidaHecha: true });
    nuevo.tarjetas = (ajustes.tarjetas || []).map((t) => Object.assign({ id: AF.util.uid(), creado: Date.now() }, t));
    if (PLAN.prueba.iniciaAlCrearCuenta) nuevo.plan.inicioPrueba = app.hoy();
    S().cargar(nuevo, { escribir: (dd) => Sg().guardarDatos(app.ns, dd) });
    await S().guardarYa();
    await V().acceso.ofrecerHuella();
    await app.entrar(true);
  };

  app.entrar = async (yaCargado) => {
    if (!yaCargado) {
      const datos = await Sg().leerDatos(app.ns);
      S().cargar(datos, { escribir: (dd) => Sg().guardarDatos(app.ns, dd) });
    }
    app.abierta = true; Sg().marcarEntrada();
    aplicarAjustes();
    cerrarCapas();
    pestanasEl.classList.remove('oculto'); compositorEl.classList.remove('oculto');
    app.tab = 'inicio'; app.pila = [];
    dibujar();
    programarAvisos();
    if (app.pendienteVoz) { app.pendienteVoz = false; V().voz.abrir({ modo: 'voz' }); }
    if (app.pendienteCompartido && V().bandeja) { const x = app.pendienteCompartido; app.pendienteCompartido = null; V().bandeja.recibir(x); }
  };

  app.bloquear = async () => {
    if (!app.abierta) return;
    try { await S().guardarYa(); } catch (e) { /* se reintenta al volver */ }
    app.abierta = false;
    Sg().bloquear();
    S().cargar(null);
    app.sinHuellaAuto = false;
    cerrarCapas();
    return V().acceso.bloqueo();
  };

  app.cerrarSesion = async () => {
    try { await S().guardarYa(); } catch (e) { /* nada */ }
    const prov = app.sesion && app.sesion.proveedor;
    app.abierta = false;
    if (PLAN.sesion.cerrarSesionBorraDatos && app.ns) await Sg().borrarCuenta(app.ns, N().secretosHuella);
    await N().cerrarSesionSocial(prov);
    await Sg().cerrarSesion();
    S().cargar(null);
    app.sesion = null; app.ns = null;
    V().acceso.portada();
  };

  app.reiniciarCuenta = async () => {
    await Sg().borrarCuenta(app.ns, N().secretosHuella);
    S().cargar(null);
    return V().acceso.bienvenida(app.sesion);
  };

  // Para pantallas del sistema (cámara, galería, compartir) que sacan la app de primer plano
  app.sinBloqueo = async (fn) => { app.exento = true; try { return await fn(); } finally { setTimeout(() => { app.exento = false; }, 800); } };

  /* ------------------------------------------------------------- avisos del teléfono */
  function programarAvisos() {
    if (!N().esNativo()) return;
    const hoy = app.hoy(), D = S().d, lista = [];
    const a9 = (iso) => { const f = U.deISO(iso); f.setHours(9, 0, 0, 0); return f; };
    D.tarjetas.forEach((t) => {
      const e = AF.tarjetas.estado(t, D.movs, hoy);
      if (!e.proximoVence || !e.aPagarProximo) return;
      PLAN.alertas.diasAntesVencimiento.forEach((n) => lista.push({ titulo: t.nombre + ' vence ' + (n === 1 ? 'mañana' : 'en ' + n + ' días'), cuerpo: 'A pagar: ' + U.dinero(e.aPagarProximo) + ' (estimado)', cuando: a9(U.sumarDias(e.proximoVence, -n)) }));
    });
    D.pagosFijos.forEach((p) => {
      if (p.activo === false) return;
      const v = U.proximoDia(hoy, p.dia);
      lista.push({ titulo: p.nombre + ' vence mañana', cuerpo: U.dinero(p.monto), cuando: a9(U.sumarDias(v, -1)) });
    });
    D.prestamos.forEach((p) => { if (p.pagado || !p.fechaLimite) return; lista.push({ titulo: 'Recordatorio: ' + p.persona, cuerpo: (p.direccion === 'me_deben' ? 'Te debe ' : 'Le debes ') + U.dinero(p.monto), cuando: a9(p.fechaLimite) }); });
    N().programarAvisos(lista);
  }
  app.programarAvisos = programarAvisos;

  /* ------------------------------------------------------------------- arranque */
  app.iniciar = async function () {
    AF.tema.aplicar('auto');
    armar();
    if (AF.bancos) { AF.bancos.cargarCache(); AF.bancos.actualizarRemoto(); }     // tarifas de bancos: si hay archivo remoto, se actualizan solas
    const al = N().almacenNativo(); if (al) Sg().usarAlmacen(al);
    N().prepararWeb();                                                        // versión web: copia para abrir sin internet + datos que el navegador no borra

    N().alVolverAPrimerPlano(() => { if (app.abierta && !app.exento) Sg().marcarSalida(); }, () => {
      if (!app.abierta) return;
      if (app.exento) { Sg().marcarEntrada(); return; }
      if (Sg().debeBloquear(S().d.ajustes.bloqueoSeg)) app.bloquear(); else Sg().marcarEntrada();
    });
    N().alAbrirEnlace(() => { if (app.abierta) V().voz.abrir({ modo: 'voz' }); else app.pendienteVoz = true; });
    N().escucharCompartidos((x) => { if (app.abierta && V().bandeja) V().bandeja.recibir(x); else app.pendienteCompartido = x; }).catch(() => {});
    N().botonAtras(() => {
      if (raiz().querySelector('.voz')) { V().voz.cerrar(); return; }
      const hoja = raiz().querySelector('.telon'); if (hoja) { hoja.click(); return; }
      if (app.atras()) return;
      if (app.abierta && app.tab !== 'inicio') { app.ir('inicio'); return; }
      N().salir();
    });

    const s = await Sg().sesion();
    if (!s) return V().acceso.portada();
    app.sesion = s;
    return despuesDeSesion();
  };

  AF.app = app;
  if (d && d.getElementById && d.getElementById('app')) {
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', () => app.iniciar()); else app.iniciar();
  }
})(typeof window !== 'undefined' ? window : globalThis);
