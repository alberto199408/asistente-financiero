/* Primera pantalla (Google / Facebook), bienvenida, creación de PIN, huella y pantalla de bloqueo. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, hoja, aviso, campo } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN, Sg = () => AF.seguridad, N = () => AF.nativo;
  const V = (AF.vistas = AF.vistas || {});
  const d = g.document;

  /* ------------------------------------------------------------------- teclado de PIN */
  // o = { titulo, sub, len, alCompletar(pin) -> Promise<{ok, mensaje}>, huella: fn|null, arriba: Node, pie: [Node] }
  function pantallaPin(o) {
    let pin = '', ocupado = false, len = o.len;
    const puntos = h('div', { class: 'pin-puntos', role: 'img' });
    const error = h('div', { class: 'pin-error', role: 'alert' });
    const pintar = () => {
      AF.ui.vaciar(puntos);
      for (let i = 0; i < len; i++) puntos.appendChild(h('i', { class: i < pin.length ? 'lleno' : '' }));
      puntos.setAttribute('aria-label', pin.length + ' de ' + len + ' dígitos');
    };
    async function enviar() {
      ocupado = true;
      const r = await o.alCompletar(pin);
      ocupado = false;
      if (r && r.ok) return;
      error.textContent = (r && r.mensaje) || 'Intenta otra vez.';
      puntos.classList.remove('error'); void puntos.offsetWidth; puntos.classList.add('error');
      N().vibrar();
      setTimeout(() => { pin = ''; pintar(); }, 380);
    }
    function digito(c) {
      if (ocupado || pin.length >= len) return;
      error.textContent = ''; pin += c; pintar();
      if (pin.length === len) enviar();
    }
    const borrar = () => { if (ocupado) return; pin = pin.slice(0, -1); error.textContent = ''; pintar(); };
    const tecla = (c) => h('button', { class: 'tecla', type: 'button', 'aria-label': c, onclick: () => digito(c) }, c);
    const teclado = h('div', { class: 'teclado' },
      ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(tecla),
      o.huella ? h('button', { class: 'tecla accion', type: 'button', 'aria-label': 'Usar huella', onclick: o.huella }, ico('huella')) : h('span', { class: 'tecla vacia' }),
      tecla('0'),
      h('button', { class: 'tecla accion', type: 'button', onclick: borrar }, 'Borrar'));
    const el = h('main', { class: 'pantalla-pin' }, AF.ui.logoApp(64),
      h('h1', { class: 'h1' }, o.titulo), o.sub ? h('p', { class: 'suave' }, o.sub) : null, o.arriba || null, puntos, error, teclado,
      h('div', { estilo: { marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', paddingTop: '8px' } }, o.pie || []));
    pintar();
    const teclas = (ev) => {
      if (!el.isConnected) { d.removeEventListener('keydown', teclas); return; }
      if (/^\d$/.test(ev.key)) digito(ev.key); else if (ev.key === 'Backspace') borrar();
    };
    d.addEventListener('keydown', teclas);
    return { el, cambiarLargo(n) { len = n; pin = ''; pintar(); }, limpiar() { pin = ''; pintar(); }, error: (t) => { error.textContent = t; } };
  }

  /* ---------------------------------------------------------------------- portada */
  // Una sola pantalla continua: logo grande, nombre, una línea de qué hace, y los botones. Sin tarjetas ni dibujos.
  function portada() {
    const app = AF.app;
    app.pantalla(null);
    const mensaje = h('p', { class: 'texto-sm', role: 'alert', estilo: { color: '#FF9C9C', minHeight: '20px', textAlign: 'center' } });

    async function entrar(prov, boton) {
      mensaje.textContent = '';
      boton.disabled = true;
      try { await app.iniciarSesion(await N().iniciarSesion(prov)); }
      catch (e) { if (e.codigo !== 'cancelado') mensaje.textContent = e.message || 'No pude iniciar sesión.'; boton.disabled = false; }
    }
    const bG = h('button', { class: 'btn btn-bloque btn-google', type: 'button', onclick: () => entrar('google', bG) }, AF.ui.logoGoogle(), 'Continuar con Google');
    const bF = h('button', { class: 'btn btn-bloque', type: 'button', estilo: { background: '#1877F2', color: '#fff' }, onclick: () => entrar('facebook', bF) }, h('span', { estilo: { display: 'grid', placeItems: 'center', width: '22px', height: '22px', background: '#fff', borderRadius: '50%' } }, AF.ui.logoFacebook()), 'Continuar con Facebook');
    const botones = PLAN.sesion.proveedores.map((p) => (p === 'google' ? bG : bF));
    const demo = (PLAN.sesion.permitirSinCuenta || N().esLocal()) && !N().esNativo()
      ? h('button', { class: 'btn-texto', type: 'button', onclick: () => app.iniciarSesion({ proveedor: 'demo', id: 'local', nombre: '', email: '' }) }, 'Probar sin cuenta') : null;
    N().precargarWeb();                                  // deja listas las ventanas de Google/Facebook para el toque del botón
    // Instalar como app (solo en el navegador; si ya está instalada no aparece)
    const instalar = h('div', { estilo: { textAlign: 'center' } });
    const pintarInstalar = () => {
      AF.ui.vaciar(instalar);
      if (N().esNativo() || N().instalacion.instalada()) return;
      instalar.appendChild(N().instalacion.disponible()
        ? h('button', { class: 'btn-texto', type: 'button', onclick: async () => { await N().instalacion.instalar(); pintarInstalar(); } }, 'Instalar en este teléfono')
        : h('p', { class: 'portada-legal' }, 'Para instalarla: menú ⋮ de Chrome → «Instalar aplicación».'));
    };
    pintarInstalar(); N().instalacion.alCambiar(() => { if (instalar.isConnected) pintarInstalar(); });

    const el = h('main', { class: 'portada' },
      h('div', { class: 'portada-marca' }, AF.ui.logoApp(176), h('h1', { class: 'portada-nombre' }, PLAN.app.nombre),
        h('p', { class: 'portada-sub' }, 'Dilo con tu voz. Lo registro, lo ordeno y te digo cuánto puedes gastar hoy.')),
      h('div', { class: 'portada-acciones' }, botones, mensaje, demo, instalar,
        h('p', { class: 'portada-legal' }, 'Tus datos se guardan cifrados en este teléfono. Entrar con tu cuenta solo sirve para reconocerte (con Google, además, para guardar tu copia en tu propio Drive); no leemos tu banco ni tu correo.')));
    app.pantalla(el);
  }

  /* -------------------------------------------------------------------- bienvenida */
  function bienvenida(sesion) {
    const app = AF.app;
    const p0 = PLAN.pais(PLAN.app.paisInicial);
    const r = { nombre: (sesion && sesion.nombre) || '', pais: p0.codigo, moneda: p0.moneda, diaCobro: PLAN.bienvenida.diaCobroDefecto, sueldo: null, cargas: 0, tarjetas: [] };
    const pasos = () => PLAN.bienvenida.preguntas.filter((k) => !(k === 'cargas' && PLAN.bienvenida.cargasSoloSiSRI && !PLAN.pais(r.pais).sri));
    let k = 0;

    function mostrar() {
      const lista = pasos(), clave = lista[k];
      const total = lista.length + 1;                    // +1: crear PIN
      const cabeza = h('div', { class: 'paso-cabeza' }, h('div', { class: 'pasos', 'aria-label': 'Paso ' + (k + 1) + ' de ' + total }, Array.from({ length: total }, (_, i) => h('i', { class: i <= k ? 'hecho' : '' }))));
      let cuerpo, validar = () => true, opcional = false, titulo, sub, textoSiguiente = 'Siguiente', alSaltar = () => { r.sueldo = null; };
      const siguiente = () => { if (!validar()) return; if (k + 1 >= lista.length) pasoPin(); else { k++; mostrar(); } };

      if (clave === 'nombre') {
        titulo = '¿Cómo te llamo?'; sub = 'Para saludarte. Solo se queda en tu teléfono.';
        const inp = h('input', { class: 'entrada grande', value: r.nombre, placeholder: 'Tu nombre', autocomplete: 'given-name', maxlength: 30, oninput: (e) => { r.nombre = e.target.value; }, onkeydown: (e) => { if (e.key === 'Enter') siguiente(); } });
        cuerpo = campo('Nombre', inp); setTimeout(() => inp.focus(), 80);
        validar = () => { r.nombre = r.nombre.trim(); if (!r.nombre) { inp.focus(); return false; } return true; };
      } else if (clave === 'pais') {
        titulo = '¿Dónde vives?'; sub = 'Así uso las palabras de tu país (diferido, cuotas…) y tu moneda.';
        const zona = h('div');
        const pint = () => {
          AF.ui.vaciar(zona);
          zona.appendChild(h('div', { class: 'opciones', estilo: { marginTop: '8px' } }, PLAN.paises.map((p) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': r.pais === p.codigo ? 'true' : 'false', onclick: () => { r.pais = p.codigo; r.moneda = p.moneda; pint(); } }, p.nombre))));
          zona.appendChild(campo('Moneda', h('div', { class: 'opciones' }, Object.keys(PLAN.monedas).map((m) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': r.moneda === m ? 'true' : 'false', onclick: () => { r.moneda = m; pint(); } }, PLAN.monedas[m].simbolo + ' ' + m)))));
        };
        pint(); cuerpo = zona;
      } else if (clave === 'moneda') {
        return (k++, mostrar());                          // ya se eligió junto con el país
      } else if (clave === 'diaCobro') {
        titulo = '¿Qué día te pagan?'; sub = 'Con esto calculo cuánto puedes gastar por día hasta tu próximo cobro.';
        const inp = h('input', { class: 'entrada grande', inputmode: 'numeric', value: r.diaCobro, maxlength: 2, 'aria-label': 'Día del mes', oninput: (e) => { r.diaCobro = Number(e.target.value.replace(/\D/g, '')) || 0; } });
        cuerpo = h('div', null, campo('Día del mes (1 a 31)', inp), h('div', { class: 'opciones', estilo: { marginTop: '12px' } }, [1, 5, 10, 15, 20, 25, 30].map((n) => h('button', { type: 'button', class: 'opcion', onclick: () => { r.diaCobro = n; inp.value = n; } }, 'Día ' + n))));
        validar = () => { if (!(r.diaCobro >= 1 && r.diaCobro <= 31)) { inp.focus(); return false; } return true; };
      } else if (clave === 'sueldo') {
        titulo = '¿Cuánto cobras al mes?'; sub = 'Es opcional. Sirve para la primera cuenta de «cuánto puedes gastar hoy». Luego tus ingresos reales mandan.';
        opcional = true;
        const inp = h('input', { class: 'entrada grande', inputmode: 'decimal', placeholder: PLAN.monedas[r.moneda].simbolo + ' 0', value: r.sueldo || '', 'aria-label': 'Ingreso mensual', oninput: (e) => { r.sueldo = U.parseNumero(e.target.value); } });
        cuerpo = campo('Ingreso mensual', inp);
      } else if (clave === 'cargas') {
        titulo = '¿Cuántas cargas familiares tienes?'; sub = 'Hijos u otras personas que dependen de ti. Con esto calculo la rebaja de impuestos (SRI) por gastos personales.';
        cuerpo = h('div', { class: 'opciones', estilo: { marginTop: '12px' } }, [0, 1, 2, 3, 4, 5].map((n) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': r.cargas === n ? 'true' : 'false', onclick: (e) => { r.cargas = n; e.currentTarget.parentNode.querySelectorAll('.opcion').forEach((b, i) => b.setAttribute('aria-pressed', i === n ? 'true' : 'false')); } }, n === 5 ? '5 o más' : String(n))));
      } else if (clave === 'tarjetas') {
        titulo = '¿Tienes tarjeta de crédito?'; sub = 'Dime cuál es y te muestro lo que cobra el banco: avances, diferidos, renovación. Si no tienes, sigue.';
        const zona = h('div', { estilo: { marginTop: '16px' } });
        const pint = () => {
          AF.ui.vaciar(zona);
          const t = r.tarjetas[0];
          if (t) {
            const b = AF.bancos.buscar(t.bancoId);
            zona.appendChild(h('div', { class: 'tarjeta-previa grande' }, AF.ui.insigniaBanco(b || { id: '', nombre: t.banco || t.nombre, corto: t.banco || '+' }, 52),
              h('div', { class: 'tarjeta-previa-texto' }, h('strong', null, t.nombre), h('span', null, [t.banco, t.red, t.nivel].filter(Boolean).join(' · ')))));
            zona.appendChild(h('div', { estilo: { display: 'flex', gap: '10px', marginTop: '12px' } },
              h('button', { class: 'btn btn-borde', type: 'button', estilo: { flex: 1 }, onclick: () => abrir(t) }, 'Cambiar'),
              h('button', { class: 'btn btn-borde', type: 'button', estilo: { flex: 1 }, onclick: () => { r.tarjetas = []; pint(); mostrarBoton(); } }, 'Quitar')));
            zona.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '14px' } }, 'Las demás tarjetas las agregas desde la pestaña Tarjetas.'));
          } else {
            zona.appendChild(h('button', { class: 'btn btn-voz btn-bloque', type: 'button', onclick: () => abrir(null) }, 'Sí, agregar mi tarjeta'));
            zona.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '14px' } }, 'Eliges el banco, la red (Visa, Mastercard…) y el nivel. Los datos del estado de cuenta los puedes poner ahora o después.'));
          }
        };
        const abrir = (t) => AF.vistas.tarjetas.asistente({ pais: r.pais, tarjeta: t, textoGuardar: 'Listo', alGuardar: (o) => { r.tarjetas = [o]; pint(); mostrarBoton(); } });
        const mostrarBoton = () => { const bt = document.querySelector('[data-siguiente]'); if (bt) bt.textContent = r.tarjetas.length ? 'Siguiente' : 'No tengo tarjeta'; };
        pint(); cuerpo = zona; textoSiguiente = r.tarjetas.length ? 'Siguiente' : 'No tengo tarjeta'; alSaltar = () => { r.tarjetas = []; };
      }
      const pie = h('div', { estilo: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 var(--margen) calc(20px + env(safe-area-inset-bottom))', marginTop: 'auto' } },
        h('button', { class: 'btn btn-primario btn-bloque', type: 'button', 'data-siguiente': '', onclick: siguiente }, textoSiguiente),
        opcional ? h('button', { class: 'btn-texto', type: 'button', onclick: () => { alSaltar(); k + 1 >= lista.length ? pasoPin() : (k++, mostrar()); } }, 'Saltar') : null);
      const atras = k > 0 ? h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Atrás', onclick: () => { k = Math.max(0, k - 1); mostrar(); } }, ico('atras')) : null;
      app.pantalla(h('main', { class: 'pantalla' }, cabeza,
        h('div', { class: 'contenido-solo', estilo: { flex: 1 } }, atras, h('h1', { class: 'h1', estilo: { marginTop: '8px' } }, titulo), h('p', { class: 'suave', estilo: { marginTop: '8px' } }, sub), cuerpo), pie));
    }

    /* ---- crear PIN (último paso) */
    function pasoPin() {
      let len = PLAN.sesion.pinMin, primero = null;
      const segm = h('div', { class: 'segmentos', estilo: { marginTop: '18px', width: '220px' } },
        [PLAN.sesion.pinMin, PLAN.sesion.pinMax].map((n) => h('button', { type: 'button', 'aria-pressed': n === len ? 'true' : 'false', onclick: (e) => { len = n; vista.cambiarLargo(n); segm.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === e.currentTarget ? 'true' : 'false')); } }, n + ' dígitos')));
      const vista = pantallaPin({
        titulo: 'Crea tu PIN', sub: 'Lo pedimos cuando abras la app. Si lo olvidas, tus datos no se pueden recuperar: guárdalo bien.', len, arriba: segm,
        pie: [h('button', { class: 'btn-texto', type: 'button', onclick: () => { k = pasos().length - 1; mostrar(); } }, 'Volver')],
        alCompletar: async (pin) => {
          if (primero === null) {
            if (Sg().pinDebil(pin)) return { ok: false, mensaje: 'Ese PIN es muy fácil de adivinar. Prueba otro.' };
            primero = pin; segm.classList.add('oculto');
            vista.el.querySelector('h1').textContent = 'Repite tu PIN'; vista.limpiar(); return { ok: true };
          }
          if (pin !== primero) { primero = null; segm.classList.remove('oculto'); vista.el.querySelector('h1').textContent = 'Crea tu PIN'; return { ok: false, mensaje: 'No coinciden. Empieza de nuevo.' }; }
          try { await app.crearCuenta({ ajustes: r, pin }); }
          catch (e) { primero = null; return { ok: false, mensaje: 'No pude guardar tu PIN. Intenta otra vez.' }; }
          return { ok: true };
        },
      });
      app.pantalla(vista.el);
    }
    mostrar();
  }

  /* ------------------------------------------------------------- oferta de huella */
  async function ofrecerHuella() {
    const app = AF.app;
    if (!(await N().huellaDisponible())) return;
    return new Promise((res) => {
      const msg = h('p', { class: 'pin-error' });
      const el = h('main', { class: 'pantalla-pin' }, AF.ui.logoApp(64),
        h('h1', { class: 'h1' }, '¿Entrar con tu huella?'),
        h('p', { class: 'suave' }, 'Abres la app con un toque. El PIN sigue sirviendo siempre.'),
        h('div', { estilo: { margin: '36px 0 12px', color: 'var(--voz)' } }, ico('huella', 'grande')), msg,
        h('div', { estilo: { marginTop: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' } },
          h('button', { class: 'btn btn-voz btn-bloque', type: 'button', onclick: async (e) => {
            e.currentTarget.disabled = true;
            try { await Sg().activarHuella(app.ns, N().secretosHuella); aviso('Huella activada'); res(true); }
            catch (er) { msg.textContent = 'No pude activarla. Puedes hacerlo luego en Más → Ajustes.'; setTimeout(() => res(false), 1600); }
          } }, 'Activar huella'),
          h('button', { class: 'btn-texto', type: 'button', onclick: () => res(false) }, 'Ahora no')));
      el.querySelector('.ico-svg').style.cssText = 'width:96px;height:96px;stroke-width:1.3';
      app.pantalla(el);
    });
  }

  /* ----------------------------------------------------------------------- bloqueo */
  async function bloqueo() {
    const app = AF.app;
    const ns = app.ns, len = await Sg().longitudPin(ns);
    const nombre = (app.sesion && app.sesion.nombre) || '';
    const conHuella = (await Sg().huellaActiva(ns)) && (await N().huellaDisponible());
    let vista;
    async function intentarHuella() {
      const r = await Sg().abrirConHuella(ns, N().secretosHuella);
      if (r.ok) await app.entrar();
    }
    async function enEspera() {
      const e = await Sg().estadoIntentos(ns);
      if (e.espera > 0) vista.error('Demasiados intentos. Espera ' + e.espera + ' s.');
    }
    vista = pantallaPin({
      titulo: nombre ? 'Hola, ' + nombre : 'Bienvenido de nuevo', sub: 'Escribe tu PIN para entrar.', len,
      huella: conHuella ? intentarHuella : null,
      pie: [h('button', { class: 'btn-texto', type: 'button', onclick: () => olvidePin() }, '¿Olvidaste tu PIN?')],
      alCompletar: async (pin) => {
        const r = await Sg().abrirConPin(ns, pin);
        if (r.ok) { await app.entrar(); return { ok: true }; }
        if (r.motivo === 'espera') return { ok: false, mensaje: 'Demasiados intentos. Espera ' + r.espera + ' s.' };
        return { ok: false, mensaje: 'PIN incorrecto. Te quedan ' + r.restantes + ' intentos.' };
      },
    });
    app.pantalla(vista.el);
    enEspera();
    if (conHuella && !app.sinHuellaAuto) setTimeout(intentarHuella, 350);
  }
  function olvidePin() {
    const app = AF.app;
    hoja({
      titulo: '¿Olvidaste tu PIN?',
      cuerpo: h('div', null,
        h('p', { class: 'suave', estilo: { marginTop: '6px' } }, 'Tus datos están cifrados con tu PIN: nadie puede recuperarlos sin él, ni siquiera nosotros.'),
        h('p', { class: 'suave', estilo: { marginTop: '10px' } }, 'Si tenías copia en Google Drive, puedes empezar de nuevo y restaurarla (te pedirá el PIN que usabas cuando la hiciste).')),
      acciones: [
        { texto: 'Volver', clase: 'btn-borde' },
        { texto: 'Borrar y empezar de nuevo', clase: 'btn-primario', onclick: async () => {
          if (await V.comun.confirmar({ titulo: '¿Borrar todo?', texto: 'Se borran los datos de esta cuenta en este teléfono. No se puede deshacer.', si: 'Sí, borrar', peligro: true })) await app.reiniciarCuenta();
        }, cierra: true },
      ],
    });
  }

  V.acceso = { portada, bienvenida, ofrecerHuella, bloqueo, pantallaPin };
})(typeof window !== 'undefined' ? window : globalThis);
