/* El botón único: habla o escribe. Muestra lo que entendió ANTES de guardar, responde preguntas, corrige y aprende. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, hoja, aviso } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const d = g.document;
  const $ = (n) => U.dinero(n);
  const S = () => AF.store, N = () => AF.nativo, C = () => V.comun;

  let capa = null, escucha = null, vivo = false;

  const ctx = () => ({ hoy: AF.app.hoy(), categorias: S().categorias(), dicc: S().d.diccionario, tarjetas: S().d.tarjetas });
  const hablar = (t) => { if (S().d.ajustes.respuestaVoz) N().hablar(t); };

  /* ------------------------------------------------------------- diálogos pequeños */
  function dialogo(titulo, construir, acciones) {
    return new Promise((res) => {
      let listo = false, api = null;
      const fin = (v) => { if (!listo) { listo = true; res(v); } };
      const cierra = () => api && api.cerrar();
      api = hoja({ titulo, cuerpo: construir(fin, cierra), alCerrar: () => fin(null), acciones: (acciones || []).map((a) => Object.assign({}, a, { onclick: () => (a.onclick ? a.onclick(fin) : undefined) })) });
    });
  }
  const elegirCategoria = (tipo, actual) => dialogo('¿En qué categoría va?', (fin, cierra) => h('div', { estilo: { marginTop: '12px' } }, C().selectorCategoria(tipo, actual, (id) => { fin(id); cierra(); })));
  function pedirNumero(titulo, actual, ayuda) {
    return dialogo(titulo, (fin, cierra) => {
      const inp = h('input', { class: 'entrada grande', inputmode: 'decimal', value: actual == null ? '' : String(actual).replace('.', ','), 'aria-label': titulo });
      setTimeout(() => inp.focus(), 120);
      const ok = () => { const v = U.parseNumero(inp.value); if (v > 0) { fin(v); cierra(); } else inp.focus(); };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
      return h('div', null, h('div', { class: 'campo' }, inp, ayuda ? h('div', { class: 'ayuda' }, ayuda) : null), h('div', { class: 'hoja-acciones' }, h('button', { class: 'btn btn-primario', type: 'button', onclick: ok }, 'Aceptar')));
    });
  }
  const elegirFecha = (actual) => dialogo('¿De qué día?', (fin, cierra) => {
    const inp = h('input', { class: 'entrada', type: 'date', value: actual, max: AF.app.hoy() });
    return h('div', null, h('div', { class: 'campo' }, inp), h('div', { class: 'hoja-acciones' }, h('button', { class: 'btn btn-primario', type: 'button', onclick: () => { if (inp.value) { fin(inp.value); cierra(); } } }, 'Aceptar')));
  });
  const elegirOpcion = (titulo, opciones) => dialogo(titulo, (fin, cierra) => h('div', { class: 'opciones', estilo: { marginTop: '14px' } }, opciones.map(([v, t]) => h('button', { type: 'button', class: 'opcion', onclick: () => { fin(v); cierra(); } }, t))));
  function pedirTasa(t) {
    return dialogo('Tasa de ' + t.nombre, (fin, cierra) => {
      const inp = h('input', { class: 'entrada grande', inputmode: 'decimal', placeholder: 'Ej. 16,5', 'aria-label': 'Tasa anual en porcentaje' });
      const ok = () => { const v = U.parseNumero(inp.value); if (v != null && v >= 0 && v < 200) { fin(v); cierra(); } else inp.focus(); };
      return h('div', null, h('p', { class: 'suave', estilo: { marginTop: '6px' } }, 'Para calcular tus cuotas con intereses necesito la tasa anual de tu tarjeta (%). Está en tu estado de cuenta o en la app del banco. No la invento.'),
        h('div', { class: 'campo' }, inp), h('div', { class: 'hoja-acciones' }, h('button', { class: 'btn btn-borde', type: 'button', onclick: () => { fin(null); cierra(); } }, 'No la sé'), h('button', { class: 'btn btn-primario', type: 'button', onclick: ok }, 'Guardar')));
    });
  }

  /* ----------------------------------------------------------------------- capa */
  function crearCapa() {
    cerrar();
    capa = h('div', { class: 'voz', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Asistente de voz' });
    d.getElementById('app').appendChild(capa); vivo = true;
    return capa;
  }
  function cerrar() {
    vivo = false;
    if (escucha) { try { escucha.parar(); } catch (e) { /* nada */ } escucha = null; }
    N().callar();
    if (capa) { capa.remove(); capa = null; }
  }
  const cabeza = (izq) => h('div', { class: 'voz-cabeza' }, h('div', { class: 'suave' }, izq || ''), h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Cerrar', onclick: cerrar }, ico('cerrar')));
  function pintar(partes) {
    if (!capa) return;
    AF.ui.vaciar(capa);
    partes.forEach((p) => p && capa.appendChild(p));
    const foco = capa.querySelector('[data-foco]'); if (foco) setTimeout(() => foco.focus(), 60);
  }

  /* ------------------------------------------------------------------ escuchando */
  async function escuchar() {
    const vivoLocal = {}; let ultimo = '';
    const trans = h('p', { class: 'transcripcion', 'aria-live': 'polite' }, h('span', { class: 'tenue' }, 'Habla ahora…'));
    const onda = h('div', { class: 'onda escuchando', 'aria-hidden': 'true' }, Array.from({ length: 15 }, () => h('i')));
    const estado = h('div', { class: 'voz-estado' }, 'Te escucho');
    const btn = h('button', { class: 'mic-grande escuchando', type: 'button', 'aria-label': 'Terminar', onclick: () => { if (escucha) escucha.parar(); } }, ico('mic'));
    pintar([cabeza(), h('div', { class: 'voz-cuerpo' }, estado, trans, onda), h('div', { class: 'voz-pie' }, btn, h('button', { class: 'btn-texto', type: 'button', style: 'color:var(--sobre-panel)', onclick: () => { if (escucha) { escucha.parar(); escucha = null; } mostrarTexto(ultimo); } }, 'Prefiero escribir'))]);
    try {
      const e = await N().escuchar((t) => { ultimo = t; AF.ui.vaciar(trans); trans.appendChild(d.createTextNode(t)); });
      escucha = e; vivoLocal.e = e;
      const final = await e.terminado;
      if (escucha !== e) return;                       // cambió de pantalla mientras tanto
      escucha = null;
      if (!vivo) return;
      if (!final || !final.trim()) return sinAudio();
      procesar(final.trim());
    } catch (er) {
      escucha = null;
      if (!vivo) return;
      mostrarTexto('', er && er.message);
    }
  }
  function sinAudio() {
    pintar([cabeza(), h('div', { class: 'voz-cuerpo' }, h('p', { class: 'transcripcion' }, 'No te escuché.'), h('p', { class: 'voz-estado' }, 'Habla más cerca o escribe lo que quieres registrar.')),
      h('div', { class: 'voz-pie' }, h('button', { class: 'btn btn-voz btn-bloque', type: 'button', onclick: escuchar }, ico('mic'), 'Intentar otra vez'), h('button', { class: 'btn-texto', type: 'button', style: 'color:var(--sobre-panel)', onclick: () => mostrarTexto('') }, 'Escribir'))]);
  }

  /* --------------------------------------------------------------------- escribir */
  function mostrarTexto(valor, aviso2) {
    const ta = h('textarea', { class: 'texto-voz', rows: 3, placeholder: 'Ej.: pagué 30 de luz', 'data-foco': '1', 'aria-label': 'Lo que quieres registrar o preguntar', value: valor || '' });
    const enviar = () => { const t = ta.value.trim(); if (t) procesar(t); };
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } });
    pintar([cabeza(), h('div', { class: 'voz-cuerpo' },
      h('p', { class: 'transcripcion' }, 'Escríbelo como lo dirías'),
      aviso2 ? h('p', { class: 'voz-estado', estilo: { marginTop: '8px' } }, aviso2) : null,
      h('div', { estilo: { marginTop: '18px' } }, ta),
      h('div', { class: 'opciones', estilo: { marginTop: '14px' } }, ['Pagué 30 de luz', 'Me pagaron 1.200', 'Cuánto gasté este mes'].map((s) => h('button', { class: 'opcion', type: 'button', style: 'background:rgba(255,255,255,.08);border-color:transparent;color:var(--sobre-panel)', onclick: () => { ta.value = s; enviar(); } }, s)))),
      h('div', { class: 'voz-pie' }, h('button', { class: 'btn btn-voz btn-bloque', type: 'button', onclick: enviar }, ico('enviar'), 'Enviar'), h('button', { class: 'btn-texto', type: 'button', style: 'color:var(--sobre-panel)', onclick: escuchar }, 'Hablar en vez de escribir'))]);
  }

  /* --------------------------------------------------------------------- procesar */
  async function procesar(texto) {
    let r = AF.parser.interpretar(texto, ctx());
    const dudoso = r.tipo === 'desconocido' || (r.tipo === 'registrar' && r.items && r.items.length && r.items.every((i) => i.catConfianza === 'ninguna') && !r.items.some((i) => i.palabraNueva === null));
    if (dudoso && AF.ia && AF.acceso.tiene('entenderFraseLibreIA') && AF.acceso.iaDisponible()) {
      pintar([cabeza(), h('div', { class: 'voz-cuerpo' }, h('p', { class: 'transcripcion' }, texto), h('p', { class: 'voz-estado', estilo: { marginTop: '14px' } }, 'Pensando…'))]);
      const x = await AF.ia.interpretar(texto, ctx());
      if (x) r = x;
      if (!vivo) return;
    }
    mostrar(r, texto);
  }
  function mostrar(r, texto) {
    switch (r.tipo) {
      case 'registrar': return vistaRegistrar(r, texto);
      case 'preguntar': return vistaPregunta(r, texto);
      case 'corregir': return vistaCorregir(r, texto);
      case 'presupuesto': return vistaPresupuesto(r, texto);
      case 'informe': cerrar(); return V.informesUI.abrir({ formato: r.formato, periodo: r.periodo });
      case 'ayuda': return vistaAyuda();
      default: return vistaNoEntendi(texto);
    }
  }

  const Salir = (texto, acciones, extra) => pintar([cabeza(), h('div', { class: 'voz-cuerpo' }, extra), h('div', { class: 'voz-pie' }, acciones)]);
  const btnPrim = (t, f, cls) => h('button', { class: 'btn ' + (cls || 'btn-voz') + ' btn-bloque', type: 'button', onclick: f }, t);
  const btnTxt = (t, f) => h('button', { class: 'btn-texto', type: 'button', style: 'color:var(--sobre-panel)', onclick: f }, t);

  /* ------------------------------------------------------------------- registrar */
  function vistaRegistrar(r, texto) {
    if (!r.items || !r.items.length) {
      const t0 = r.falta === 'monto' ? 'No escuché cuánto fue.' : 'No pude armar un movimiento con eso.';
      return Salir(null, [btnPrim('Completar a mano', () => { cerrar(); C().formMovimiento({ inicial: { desc: texto }, alGuardar: (m) => C().guardarMov(m) }); }), btnTxt('Intentar otra vez', () => mostrarTexto(texto))],
        [h('p', { class: 'transcripcion' }, t0), r.partes && r.partes.length ? C().fraseAnotada(r.partes, null, false) : null]);
    }
    const items = r.items.map((i) => Object.assign({}, i, { credito: i.credito ? Object.assign({}, i.credito) : i.credito }));
    const tarjetas = S().d.tarjetas;
    const E = { tarjetaDuda: !!r.tarjetaDuda, sinTarjetas: !!r.sinTarjetas, dudas: (r.dudas || []).slice() };
    const hablaTexto = (it) => it.tipo === 'ingreso' ? 'Ingreso de ' + $(it.monto) + ' en ' + it.catNombre : 'Gasto de ' + $(it.monto) + ' en ' + it.catNombre;

    function dibujar() {
      const bloques = items.map((it, idx) => {
        const duda = it.catConfianza === 'ninguna';
        const fil = (etiqueta, valor, onclick, extraClase) => h('button', { class: 'entendido-fila', type: 'button', onclick }, h('span', { class: 'entendido-etiqueta' }, etiqueta), h('span', { class: 'entendido-valor ' + (extraClase || '') }, valor, ico('derecha', 'chico')));
        const filas = [
          fil(it.tipo === 'ingreso' ? 'Ingreso de' : 'Gasto de', $(it.monto), async () => { const v = await pedirNumero('Monto', it.monto); if (v) { it.monto = v; dibujar(); } }, 'monto-grande'),
          fil('Categoría', (it.catIcono || '') + ' ' + it.catNombre + (duda ? ' · ¿es correcta?' : ''), async () => {
            const id = await elegirCategoria(it.tipo, it.cat);
            if (!id) return;
            const c = S().categoria(id); it.cat = id; it.catNombre = c.nombre; it.catIcono = c.icono; it.catConfianza = 'alta'; if (it.tipo === 'gasto') it.nec = c.nec || null;
            if (it.palabraNueva) { S().aprender(it.palabraNueva, id); aviso('Aprendí que «' + it.palabraNueva + '» es ' + c.nombre.toLowerCase()); it.palabraNueva = null; }
            dibujar();
          }, duda ? 'duda' : ''),
        ];
        if (it.tipo === 'gasto') filas.push(fil('¿Necesario o gusto?', it.nec === 'N' ? 'Necesario' : it.nec === 'G' ? 'Gusto' : 'Sin clasificar', () => { it.nec = it.nec === 'N' ? 'G' : it.nec === 'G' ? null : 'N'; dibujar(); }));
        filas.push(fil('Fecha', U.cap(U.fechaCorta(it.fecha, AF.app.hoy())), async () => { const f = await elegirFecha(it.fecha); if (f) { it.fecha = f; dibujar(); } }));
        if (it.tipo === 'gasto' && (tarjetas.length || it.cuenta === 'tarjeta')) {
          let txt = 'Efectivo o débito';
          if (it.cuenta === 'tarjeta') {
            const t = tarjetas.find((x) => x.id === it.tarjetaId);
            txt = t ? t.nombre : '¿Cuál tarjeta?';
            if (it.credito && it.credito.modo === 'diferido') txt += ' · ' + (it.credito.meses ? it.credito.meses + ' cuotas' : '¿cuántos meses?') + (it.credito.interes === false ? ' sin intereses' : '');
          }
          filas.push(fil('Pagado con', txt, async () => {
            const opc = [['efectivo', 'Efectivo o débito']].concat(tarjetas.map((t) => [t.id, t.nombre]));
            const v = await elegirOpcion('¿Con qué pagaste?', opc);
            if (!v) return;
            if (v === 'efectivo') { it.cuenta = 'efectivo'; delete it.tarjetaId; delete it.credito; }
            else { it.cuenta = 'tarjeta'; it.tarjetaId = v; it.credito = it.credito || { modo: 'corriente' }; }
            dibujar();
          }, it.cuenta === 'tarjeta' && !it.tarjetaId ? 'duda' : ''));
          if (it.cuenta === 'tarjeta' && it.credito && it.credito.modo === 'diferido' && !it.credito.meses) {
            filas.push(fil('Meses', '¿A cuántos?', async () => { const v = await elegirOpcion('¿A cuántos meses?', PLAN.tarjetas.mesesComunes.map((n) => [n, n + ' meses'])); if (v) { it.credito.meses = v; dibujar(); } }, 'duda'));
          }
        }
        return h('div', { class: 'entendido' }, items.length > 1 ? h('div', { class: 'entendido-etiqueta', estilo: { padding: '12px 0 0' } }, 'Movimiento ' + (idx + 1) + ' de ' + items.length) : null, filas);
      });
      const avisos = [];
      if (E.sinTarjetas && items.some((i) => i.cuenta === 'tarjeta' && !tarjetas.length)) avisos.push('Aún no tienes tarjetas guardadas. Lo guardo como pago normal; agrégala en la pestaña Tarjetas.');
      items.forEach((it) => {
        if (it.cuenta === 'tarjeta' && it.credito && it.credito.modo === 'diferido' && !AF.acceso.tiene('tarjetaDiferidoCuotas')) avisos.push('Con Pro calculo las cuotas de «' + (it.desc || it.catNombre) + '». Ahora lo guardo como compra con tarjeta.');
      });
      pintar([cabeza('Esto entendí'), h('div', { class: 'voz-cuerpo' }, C().fraseAnotada(r.partes, items[0].tipo, true), bloques,
        avisos.map((a) => h('p', { class: 'texto-sm', estilo: { color: 'var(--sobre-panel2)', marginTop: '12px' } }, a))),
      h('div', { class: 'voz-pie' }, btnPrim(items.length > 1 ? 'Guardar los ' + items.length : 'Guardar', guardar), btnTxt('Cancelar', cerrar))]);
    }

    async function guardar() {
      const D = S().d, hoy = AF.app.hoy();
      const guardados = [];
      for (const it of items) {
        const m = { tipo: it.tipo, monto: it.monto, cat: it.cat, desc: it.desc || '', fecha: it.fecha };
        if (it.tipo === 'gasto') {
          m.nec = it.nec || null; m.cuenta = it.cuenta === 'tarjeta' && it.tarjetaId ? 'tarjeta' : 'efectivo';
          if (m.cuenta === 'tarjeta') {
            m.tarjetaId = it.tarjetaId;
            const pro = AF.acceso.tiene('tarjetaDiferidoCuotas');
            m.credito = it.credito && it.credito.modo === 'diferido' && pro && it.credito.meses ? { modo: 'diferido', meses: it.credito.meses, interes: it.credito.interes !== false, cuota: it.credito.cuota || null } : { modo: 'corriente' };
            if (m.credito.modo === 'diferido' && m.credito.interes && m.credito.cuota == null) {
              const t = S().buscar('tarjetas', it.tarjetaId);
              if (t && t.tasaAnual == null) { const tasa = await pedirTasa(t); if (tasa != null) S().editar('tarjetas', t.id, { tasaAnual: tasa }, 'Puse la tasa de ' + t.nombre); }
            }
          }
        }
        guardados.push(S().agregar('movs', m, 'Agregué ' + (it.desc || it.catNombre)));
      }
      if (!vivo) return;
      confirmacion(guardados);
    }
    dibujar();
    hablar(items.length === 1 ? hablaTexto(items[0]) + '. ¿Lo guardo?' : 'Entendí ' + items.length + ' movimientos. ¿Los guardo?');
  }

  function confirmacion(movs) {
    const D = S().d, hoy = AF.app.hoy();
    const total = movs.reduce((s, m) => s + m.monto, 0);
    const c = S().categoria(movs[0].cat);
    const linea = movs.length === 1 ? 'Guardé ' + $(movs[0].monto) + ' en ' + c.nombre.toLowerCase() + '.' : 'Guardé ' + movs.length + ' movimientos por ' + $(total) + '.';
    const extras = [];
    const modo = AF.acceso.tiene('puedesGastarHoyCompleto') ? 'completo' : 'simple';
    const p = AF.informes.puedesGastarHoy(D, hoy, modo);
    if (movs.some((m) => m.tipo === 'gasto') && p.ingresos) extras.push(p.hoyDisponible >= 0 ? 'Hoy todavía puedes gastar ' + $(p.hoyDisponible) + '.' : 'Hoy ya te pasaste ' + $(-p.hoyDisponible) + '.');
    AF.informes.presupuestos(D, hoy).forEach((b) => {
      if (movs.some((m) => m.tipo === 'gasto' && (!b.cat || b.cat === m.cat))) {
        if (b.nivel === 'detente') extras.push('Detente: llegaste al límite de ' + b.nombre.toLowerCase() + '.');
        else if (b.nivel === 'aviso') extras.push('Ojo: vas en ' + Math.round(b.pct * 100) + ' % del límite de ' + b.nombre.toLowerCase() + '.');
      }
    });
    movs.forEach((m) => { if (m.cuenta === 'tarjeta') { const t = S().buscar('tarjetas', m.tarjetaId); if (t && !(t.diaCorte && t.diaVencimiento)) extras.push('Completa el corte y vencimiento de ' + t.nombre + ' para ver cuándo pagas.'); } });
    pintar([cabeza(), h('div', { class: 'voz-cuerpo' },
      h('div', { class: 'mic-grande', estilo: { background: 'var(--ingreso)', marginTop: '28px' }, 'aria-hidden': 'true' }, ico('ok')),
      h('p', { class: 'voz-respuesta', estilo: { textAlign: 'center' } }, linea),
      extras.map((t) => h('p', { class: 'texto-sm suave', estilo: { textAlign: 'center', marginTop: '8px' } }, t))),
    h('div', { class: 'voz-pie' }, btnPrim('Listo', cerrar), btnTxt('Deshacer', () => { movs.forEach(() => S().deshacer()); cerrar(); aviso('Quité lo que acabas de guardar'); }))]);
    hablar(linea + ' ' + extras.join(' '));
    if (!extras.length) setTimeout(() => { if (capa && vivo && capa.querySelector('.mic-grande')) cerrar(); }, 2600);
  }

  /* -------------------------------------------------------------------- preguntar */
  function vistaPregunta(q, texto) {
    const D = S().d, hoy = AF.app.hoy();
    const res = AF.informes.responder(q, D, hoy, AF.acceso.esPro());
    const filas = (res.filas || []).map((f) => h('div', { class: 'entendido-fila' }, h('span', null, f.icono + ' ' + f.etiqueta), h('span', { class: 'entendido-valor' }, f.valor)));
    pintar([cabeza('Tu pregunta'), h('div', { class: 'voz-cuerpo' },
      h('p', { class: 'frase', estilo: { fontSize: '22px', color: 'var(--sobre-panel2)' } }, '«' + texto + '»'),
      res.bloqueado ? h('div', null, h('p', { class: 'voz-respuesta' }, res.gancho || res.texto), h('p', { class: 'texto-sm suave', estilo: { marginTop: '10px' } }, res.texto))
        : h('p', { class: 'voz-respuesta' }, res.texto),
      filas.length ? h('div', { class: 'entendido' }, filas) : null),
    h('div', { class: 'voz-pie' }, res.bloqueado ? btnPrim('Ver Pro', () => { cerrar(); AF.app.abrir('Pro', (c) => V.pro.render(c)); }) : res.ir ? btnPrim('Ver ' + (res.ir === 'tarjetas' ? 'tarjetas' : 'inicio'), () => { cerrar(); AF.app.ir(res.ir); }) : btnPrim('Listo', cerrar),
      btnTxt('Preguntar otra cosa', escuchar))]);
    hablar(res.voz);
  }

  /* --------------------------------------------------------------------- corregir */
  function vistaCorregir(r, texto) {
    const D = S().d;
    const fin = (linea, deshacerPasos) => {
      pintar([cabeza(), h('div', { class: 'voz-cuerpo' }, h('div', { class: 'mic-grande', estilo: { background: 'var(--ingreso)', marginTop: '28px' } }, ico('ok')), h('p', { class: 'voz-respuesta', estilo: { textAlign: 'center' } }, linea)),
        h('div', { class: 'voz-pie' }, btnPrim('Listo', cerrar), deshacerPasos ? btnTxt('Deshacer', () => { for (let i = 0; i < deshacerPasos; i++) S().deshacer(); cerrar(); aviso('Lo dejé como estaba'); }) : null)]);
      hablar(linea);
      setTimeout(() => { if (capa && vivo && capa.querySelector('.mic-grande')) cerrar(); }, 3200);
    };
    if (r.accion === 'deshacer') {
      const nota = S().deshacer();
      return fin(nota ? 'Deshecho: ' + nota.charAt(0).toLowerCase() + nota.slice(1) + '.' : 'No hay nada que deshacer.', 0);
    }
    const m = AF.informes.objetivoDeCorreccion(D, r.objetivo);
    if (!m) return fin('No encontré ningún movimiento para cambiar.', 0);
    const nombre = '«' + (m.desc || S().categoria(m.cat).nombre) + '» de ' + $(m.monto);
    if (r.accion === 'borrar') { S().borrar('movs', m.id, 'Borré ' + nombre); return fin('Borré ' + nombre + '.', 1); }
    if (r.accion === 'categoria') {
      const c = S().categoria(r.cat), vieja = S().categoria(m.cat);
      const patch = { cat: c.id }; if (m.tipo === 'gasto' && (m.nec === vieja.nec || m.nec == null)) patch.nec = c.nec || null;
      S().editar('movs', m.id, patch, 'Cambié ' + nombre + ' a ' + c.nombre);
      if (m.desc) S().aprender(m.desc, c.id);
      return fin('Listo, cambié ' + nombre + ' a ' + c.nombre.toLowerCase() + '.' + (m.desc ? ' Ya sé que «' + m.desc.toLowerCase() + '» va ahí.' : ''), 1);
    }
    if (r.accion === 'monto') { S().editar('movs', m.id, { monto: r.monto }, 'Cambié el monto'); return fin('Listo, ahora son ' + $(r.monto) + '.', 1); }
    if (r.accion === 'necesidad') { S().editar('movs', m.id, { nec: r.nec }, 'Cambié necesario/gusto'); return fin('Listo, ' + nombre + ' ahora es ' + (r.nec === 'N' ? 'necesario' : 'un gusto') + '.', 1); }
    if (r.accion === 'tipo') {
      const cat = S().categorias(r.nuevoTipo)[0].id;
      S().editar('movs', m.id, { tipo: r.nuevoTipo, cat, nec: null }, 'Cambié el tipo');
      return fin('Listo, ahora es un ' + r.nuevoTipo + '.', 1);
    }
    return vistaNoEntendi(texto, 'No entendí qué quieres cambiar.');
  }

  /* ------------------------------------------------------------------ presupuesto */
  function vistaPresupuesto(r, texto) {
    const D = S().d;
    if (!r.monto) return vistaNoEntendi(texto, 'No escuché el monto del límite.');
    const nombre = r.cat ? S().categoria(r.cat).nombre : 'todos tus gastos';
    const guardar = () => {
      if (r.cat && !AF.acceso.tiene('presupuestoPorCategoria')) { cerrar(); return C().pedirPro('presupuestoPorCategoria'); }
      const ya = D.presupuestos.find((b) => (b.cat || null) === (r.cat || null));
      if (!ya && !AF.acceso.puedeAgregar('presupuestos', D.presupuestos.length)) { cerrar(); return C().pedirLimite('presupuestos', 'límite de gasto', 'límites de gasto'); }
      if (ya) S().editar('presupuestos', ya.id, { monto: r.monto }, 'Cambié un límite'); else S().agregar('presupuestos', { cat: r.cat || null, monto: r.monto, periodo: 'mes' }, 'Puse un límite');
      const linea = 'Listo: límite de ' + $(r.monto) + ' al mes en ' + nombre.toLowerCase() + '.';
      pintar([cabeza(), h('div', { class: 'voz-cuerpo' }, h('div', { class: 'mic-grande', estilo: { background: 'var(--ingreso)', marginTop: '28px' } }, ico('ok')), h('p', { class: 'voz-respuesta', estilo: { textAlign: 'center' } }, linea)),
        h('div', { class: 'voz-pie' }, btnPrim('Listo', cerrar), btnTxt('Deshacer', () => { S().deshacer(); cerrar(); }))]);
      hablar(linea);
    };
    pintar([cabeza('Esto entendí'), h('div', { class: 'voz-cuerpo' }, h('p', { class: 'frase', estilo: { fontSize: '22px', color: 'var(--sobre-panel2)' } }, '«' + texto + '»'),
      h('div', { class: 'entendido' },
        h('div', { class: 'entendido-fila' }, h('span', { class: 'entendido-etiqueta' }, 'Límite'), h('span', { class: 'entendido-valor monto-grande' }, $(r.monto))),
        h('div', { class: 'entendido-fila' }, h('span', { class: 'entendido-etiqueta' }, 'En'), h('span', { class: 'entendido-valor' }, r.cat ? S().categoria(r.cat).icono + ' ' + nombre : 'Todos los gastos')),
        h('div', { class: 'entendido-fila' }, h('span', { class: 'entendido-etiqueta' }, 'Cada'), h('span', { class: 'entendido-valor' }, 'Mes')))),
    h('div', { class: 'voz-pie' }, btnPrim('Guardar límite', guardar), btnTxt('Cancelar', cerrar))]);
    hablar('Un límite de ' + $(r.monto) + ' en ' + nombre.toLowerCase() + '. ¿Lo guardo?');
  }

  /* --------------------------------------------------------------- ayuda / no entendí */
  const EJEMPLOS_AYUDA = [
    ['Pagué 30 de luz', 'Registrar un gasto'], ['Me pagaron el sueldo, 1.200', 'Registrar un ingreso'], ['Pagué 30 de luz y 12 de internet', 'Varios a la vez'],
    ['Cuánto gasté este mes', 'Preguntar'], ['Cuánto puedo gastar hoy', 'Tu día de hoy'], ['Cambia el último a salud', 'Corregir'], ['Borra el último', 'Borrar'], ['Ponme un límite de 100 en salidas', 'Poner un límite'],
  ];
  function vistaAyuda() {
    pintar([cabeza('Qué puedo hacer'), h('div', { class: 'voz-cuerpo' }, h('p', { class: 'transcripcion' }, 'Háblame normal'), h('div', { class: 'entendido' }, EJEMPLOS_AYUDA.map(([f, t]) => h('button', { class: 'entendido-fila', type: 'button', onclick: () => procesar(f) }, h('span', null, '«' + f + '»'), h('span', { class: 'entendido-etiqueta' }, t))))), h('div', { class: 'voz-pie' }, btnPrim('Hablar', escuchar), btnTxt('Cerrar', cerrar))]);
  }
  function vistaNoEntendi(texto, mensaje) {
    pintar([cabeza(), h('div', { class: 'voz-cuerpo' }, h('p', { class: 'transcripcion' }, mensaje || 'No lo entendí del todo.'), h('p', { class: 'voz-estado', estilo: { marginTop: '10px' } }, 'Dijiste: «' + texto + '»'),
      h('div', { class: 'entendido' }, EJEMPLOS_AYUDA.slice(0, 4).map(([f, t]) => h('button', { class: 'entendido-fila', type: 'button', onclick: () => procesar(f) }, h('span', null, '«' + f + '»'), h('span', { class: 'entendido-etiqueta' }, t))))),
    h('div', { class: 'voz-pie' }, btnPrim('Escribirlo de otra forma', () => mostrarTexto(texto)), btnTxt('Cerrar', cerrar))]);
  }

  /* -------------------------------------------------------------------------- API */
  function abrir(o) {
    o = o || {};
    crearCapa();
    N().vibrar();
    if (o.texto) { procesar(o.texto); return; }
    if (o.modo === 'texto') mostrarTexto(''); else escuchar();
  }
  V.voz = { abrir, cerrar, procesar };
})(typeof window !== 'undefined' ? window : globalThis);
