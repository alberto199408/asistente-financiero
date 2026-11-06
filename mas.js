/* Más: acceso a todo lo demás, ajustes, seguridad, respaldo y borrado total. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, hoja, aviso, fila, campo } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const S = () => AF.store, N = () => AF.nativo, Sg = () => AF.seguridad, C = () => V.comun;
  const $ = (n) => U.dinero(n);

  const ir = (t, f) => () => AF.app.abrir(t, (c) => f(c));
  const proChip = (fn) => (AF.acceso.tiene(fn) ? ico('derecha') : AF.ui.chipPro());

  /* --------------------------------------------------------------------- hub */
  function render(cont) {
    const D = S().d, hoy = AF.app.hoy(), st = AF.acceso.estado(hoy);
    cont.appendChild(h('header', { class: 'barra-superior' }, h('h1', { class: 'h2' }, 'Más')));
    const cuerpo = h('div', { class: 'contenido' });
    // Plan
    cuerpo.appendChild(h('button', { class: 'nota pro', type: 'button', estilo: { width: '100%', textAlign: 'left' }, onclick: ir('Pro', (c) => V.pro.render(c)) }, ico('estrella', 'relleno'),
      h('span', null, st.tipo === 'pro' ? h('strong', null, 'Eres Pro') : st.tipo === 'prueba' ? h('strong', null, 'Pro gratis: ' + (st.diasPrueba === 1 ? 'te queda 1 día' : 'te quedan ' + st.diasPrueba + ' días')) : h('strong', null, 'Gratis'),
        st.tipo === 'gratis' ? ' · Mira qué te da Pro' : ' · Ver mi plan')));
    const grupo = (titulo, filas) => h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, titulo)), h('div', { class: 'lista' }, filas));
    const f = (icono, titulo, sub, onclick, derecha) => fila({ icono, titulo, sub, onclick, derecha: derecha || ico('derecha') });
    cuerpo.appendChild(grupo('Tu plata', [
      f('📊', 'Resumen y reportes', 'Mes, año, comparar, PDF y Excel', ir('Resumen', (c) => V.informesUI.resumen(c))),
      f('🎯', 'Límites de gasto', D.presupuestos.length ? D.presupuestos.length + (D.presupuestos.length === 1 ? ' activo' : ' activos') : 'Para no pasarte', ir('Límites de gasto', (c) => V.finanzas.presupuestos(c))),
      f('🏁', 'Metas de ahorro', D.metas.length ? D.metas.length + (D.metas.length === 1 ? ' meta' : ' metas') : 'Ahorra para algo concreto', ir('Metas', (c) => V.finanzas.metas(c))),
      f('🔁', 'Pagos fijos', 'Arriendo, internet, colegio…', ir('Pagos fijos', (c) => V.finanzas.fijos(c))),
      f('🤝', 'Préstamos entre personas', 'Quién te debe y a quién le debes', ir('Préstamos', (c) => V.finanzas.prestamos(c))),
      f('📺', 'Suscripciones', 'Lo que pagas cada mes', ir('Suscripciones', (c) => V.finanzas.suscripciones(c))),
      f('🏆', 'Retos', '30 días sin gastos hormiga', ir('Retos', (c) => V.finanzas.retos(c))),
    ]));
    cuerpo.appendChild(grupo('Agregar sin escribir', [
      f('🧾', 'Foto de una factura', 'La leo y tú confirmas', () => V.bandeja.fotoFactura()),
      f('📥', 'Bandeja por revisar', (D.bandeja.filter((b) => !b.hecho).length ? D.bandeja.filter((b) => !b.hecho).length + ' por revisar' : 'Nada por revisar') + ' · compartidos del banco', ir('Por revisar', (c) => V.bandeja.render(c))),
      f('📄', 'Importar un estado de cuenta', 'Pega el texto y lo comparo con lo tuyo', ir('Importar estado de cuenta', (c) => V.bandeja.importar(c)), proChip('importarPDF')),
    ]));
    cuerpo.appendChild(grupo('Con Pro', [
      f('🧮', 'Simulador «¿qué pasa si…?»', 'Prueba sin tocar tus datos', ir('Simulador', (c) => V.pro.simulador(c)), proChip('simulador')),
      PLAN.pais(D.ajustes.pais).sri ? f('🏛️', 'SRI: gastos deducibles', 'Rebaja aproximada de impuestos', ir('SRI', (c) => V.pro.sri(c)), proChip('sri')) : null,
      f('👫', 'Pareja o familia', 'Gastos compartidos', ir('Pareja o familia', (c) => V.pro.pareja(c)), proChip('parejaFamilia')),
      f('✈️', 'Viajes y otras monedas', 'Gasta en otra moneda sin enredarte', ir('Viajes', (c) => V.pro.viajes(c)), proChip('variasMonedasViajes')),
    ]));
    if (N().instalacion.disponible()) cuerpo.appendChild(grupo('Esta app', [
      f('📲', 'Instalar en este teléfono', 'Se abre como una app, sin barra del navegador', async () => { if (await N().instalacion.instalar()) aviso('Instalada'); }, h('span')),
    ]));
    cuerpo.appendChild(grupo('Tu cuenta', [
      f('⚙️', 'Ajustes', 'Nombre, país, modo y color, bloqueo, voz', ir('Ajustes', (c) => ajustes(c))),
      f('☁️', 'Copia de seguridad', N().proveedorListo && AF.app.sesion && AF.app.sesion.proveedor === 'google' ? 'En tu Google Drive' : 'En un archivo', ir('Copia de seguridad', (c) => respaldo(c))),
      f('🚪', 'Cerrar sesión', AF.app.sesion && AF.app.sesion.email ? AF.app.sesion.email : 'Vuelves a la primera pantalla', cerrarSesion, h('span')),
    ]));
    cuerpo.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '28px', textAlign: 'center' } }, PLAN.app.nombre + ' ' + PLAN.app.version + ' · ' + PLAN.app.avisoLegal));
    cont.appendChild(cuerpo);
  }
  async function cerrarSesion() {
    if (await C().confirmar({ titulo: '¿Cerrar sesión?', texto: 'Tus datos siguen cifrados en este teléfono. Al volver a entrar con la misma cuenta, los recuperas con tu PIN.', si: 'Cerrar sesión' })) AF.app.cerrarSesion();
  }

  /* ------------------------------------------------------------------ ajustes */
  const editor = (titulo, valor, tipo, alGuardar, ayuda) => {
    const inp = h('input', { class: 'entrada grande', inputmode: tipo === 'texto' ? 'text' : 'decimal', value: valor == null ? '' : String(valor).replace('.', ','), 'aria-label': titulo });
    hoja({ titulo, cuerpo: h('div', null, campo('', inp, ayuda)), acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => { const r = alGuardar(inp.value); return r === false ? false : undefined; } }] });
    setTimeout(() => inp.focus(), 150);
  };
  function ajustes(cont) {
    const D = S().d, a = D.ajustes;
    const p = PLAN.pais(a.pais);
    const fila2 = (icono, titulo, valor, onclick) => fila({ icono, titulo, sub: valor, onclick, derecha: ico('derecha') });
    const sw = (titulo, sub, activo, cambia) => h('button', { class: 'interruptor', type: 'button', role: 'switch', 'aria-checked': activo ? 'true' : 'false', estilo: { width: '100%', textAlign: 'left' }, onclick: () => cambia(!activo) }, h('div', { class: 'interruptor-texto' }, h('div', { class: 'fila-titulo', estilo: { whiteSpace: 'normal' } }, titulo), sub ? h('div', { class: 'fila-sub', estilo: { whiteSpace: 'normal' } }, sub) : null), h('span', { class: 'pastilla' }));
    const sec = (t) => h('div', { class: 'seccion-cabeza', estilo: { marginTop: '28px' } }, h('h2', { class: 'h2' }, t));
    cont.appendChild(h('div', { estilo: { marginTop: '4px' } }));
    cont.appendChild(sec('Tus datos'));
    cont.appendChild(h('div', { class: 'lista' },
      fila2('🙂', 'Nombre', a.nombre || 'Sin nombre', () => editor('Nombre', a.nombre, 'texto', (v) => { if (!v.trim()) return false; S().ajustar({ nombre: v.trim() }); })),
      fila2('🌎', 'País y moneda', p.nombre + ' · ' + a.moneda, () => hoja({ titulo: 'País y moneda', cuerpo: h('div', null, h('div', { class: 'opciones', estilo: { marginTop: '10px' } }, PLAN.paises.map((x) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': a.pais === x.codigo ? 'true' : 'false', onclick: (e) => { S().ajustar({ pais: x.codigo, moneda: x.moneda }); AF.app.refrescar(); e.currentTarget.closest('.hoja').previousSibling.click(); } }, x.nombre))),
        campo('Moneda', h('div', { class: 'opciones' }, Object.keys(PLAN.monedas).map((m) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': a.moneda === m ? 'true' : 'false', onclick: (e) => { S().ajustar({ moneda: m }); e.currentTarget.closest('.hoja').previousSibling.click(); } }, PLAN.monedas[m].simbolo + ' ' + m))))) })),
      fila2('📅', 'Día de cobro', 'Día ' + a.diaCobro, () => editor('Día de cobro', a.diaCobro, 'num', (v) => { const n = Math.round(U.parseNumero(v)); if (!(n >= 1 && n <= 31)) return false; S().ajustar({ diaCobro: n }); })),
      fila2('💼', 'Ingreso mensual', a.sueldo ? $(a.sueldo) : 'Sin definir', () => editor('Ingreso mensual', a.sueldo, 'num', (v) => { S().ajustar({ sueldo: v.trim() ? U.parseNumero(v) : null }); }, 'Se usa solo si aún no registras ingresos en el periodo.')),
      p.sri ? fila2('👨‍👩‍👧', 'Cargas familiares', String(a.cargas || 0), () => hoja({ titulo: 'Cargas familiares', cuerpo: h('div', { class: 'opciones', estilo: { marginTop: '12px' } }, [0, 1, 2, 3, 4, 5].map((n) => h('button', { type: 'button', class: 'opcion', onclick: (e) => { S().ajustar({ cargas: n }); e.currentTarget.closest('.hoja').previousSibling.click(); } }, n === 5 ? '5 o más' : String(n)))) })) : null));
    cont.appendChild(sec('Apariencia y voz'));
    cont.appendChild(h('div', null,
      h('div', { class: 'campo' }, h('label', null, 'Color de la app'), h('div', { class: 'opciones' }, PLAN.apariencia.colores.map((c) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': (a.colorApp || 'marino') === c.id ? 'true' : 'false', onclick: () => S().ajustar({ colorApp: c.id }) },
        h('span', { class: 'muestra-color', estilo: { background: AF.tema.paleta('claro', c.id).voz } }), c.nombre)))),
      h('div', { class: 'campo' }, h('label', null, 'Gráficas'), h('div', { class: 'segmentos' }, [['barras', 'Barras'], ['lineas', 'Líneas'], ['circulo', 'Círculo']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': (a.grafica || 'barras') === k ? 'true' : 'false', onclick: () => S().ajustar({ grafica: k }) }, t)))),
      h('div', { class: 'campo' }, h('label', null, 'Modo'), h('div', { class: 'segmentos' }, [['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']].map(([k, t]) => h('button', { type: 'button', 'aria-pressed': (a.tema || 'auto') === k ? 'true' : 'false', onclick: () => S().ajustar({ tema: k }) }, t)))),
      sw('Que me responda en voz alta', 'Lee en voz alta lo que entendió y las respuestas.', a.respuestaVoz, (v) => S().ajustar({ respuestaVoz: v }))));
    cont.appendChild(sec('Seguridad'));
    cont.appendChild(h('div', { class: 'lista' },
      fila2('⏱️', 'Pedir PIN o huella', a.bloqueoSeg === 0 ? 'Cada vez que salgas' : 'Tras ' + (a.bloqueoSeg >= 60 ? a.bloqueoSeg / 60 + ' min' : a.bloqueoSeg + ' s') + ' fuera de la app', () => hoja({ titulo: 'Pedir PIN o huella', cuerpo: h('div', { class: 'opciones', estilo: { marginTop: '12px' } }, [[0, 'Siempre'], [30, '30 segundos'], [60, '1 minuto'], [300, '5 minutos']].map(([s, t]) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': a.bloqueoSeg === s ? 'true' : 'false', onclick: (e) => { S().ajustar({ bloqueoSeg: s }); e.currentTarget.closest('.hoja').previousSibling.click(); } }, t))) })),
      fila2('🔑', 'Cambiar mi PIN', 'Uno nuevo de ' + PLAN.sesion.pinMin + ' a ' + PLAN.sesion.pinMax + ' dígitos', cambiarPin)));
    const zonaHuella = h('div'); cont.appendChild(zonaHuella);
    N().huellaDisponible().then(async (ok) => {
      if (!ok) { zonaHuella.appendChild(h('p', { class: 'texto-sm suave', estilo: { marginTop: '8px' } }, 'Este teléfono no tiene huella configurada.')); return; }
      const on = await Sg().huellaActiva(AF.app.ns);
      zonaHuella.appendChild(sw('Entrar con huella', 'El PIN sigue sirviendo siempre.', on, async (v) => {
        try { if (v) await Sg().activarHuella(AF.app.ns, N().secretosHuella); else await Sg().desactivarHuella(AF.app.ns, N().secretosHuella); aviso(v ? 'Huella activada' : 'Huella desactivada'); }
        catch (e) { aviso('No pude cambiar la huella'); }
        AF.app.refrescar();
      }));
    });
    cont.appendChild(sec('Tus palabras'));
    const aprendidas = Object.entries(D.diccionario);
    cont.appendChild(aprendidas.length ? h('div', { class: 'lista' }, aprendidas.slice(0, 30).map(([w, cat]) => fila({ icono: S().categoria(cat).icono, titulo: w, sub: S().categoria(cat).nombre, derecha: h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Olvidar ' + w, onclick: () => { S().olvidarAprendido(w); AF.app.refrescar(); } }, ico('cerrar')) })))
      : h('p', { class: 'texto-sm suave' }, 'Cuando corriges una categoría, aprendo la palabra y la verás aquí.'));
    cont.appendChild(sec('Datos'));
    cont.appendChild(h('div', { class: 'lista' },
      fila2('🗑️', 'Borrar todos mis datos', 'Movimientos, tarjetas y metas. No se puede deshacer.', borrarTodo)));
    cont.appendChild(h('div', { estilo: { height: '24px' } }));
  }

  function cambiarPin() {
    const n = PLAN.sesion;
    const nuevo = h('input', { class: 'entrada grande', type: 'password', inputmode: 'numeric', maxlength: n.pinMax, 'aria-label': 'PIN nuevo', placeholder: '••••' });
    const rep = h('input', { class: 'entrada grande', type: 'password', inputmode: 'numeric', maxlength: n.pinMax, 'aria-label': 'Repite el PIN nuevo', placeholder: '••••' });
    const err = h('div', { class: 'ayuda', role: 'alert', estilo: { color: 'var(--gasto)', minHeight: '18px' } });
    hoja({ titulo: 'Cambiar mi PIN', cuerpo: h('div', null, h('p', { class: 'suave', estilo: { marginTop: '4px' } }, 'Si lo olvidas, los datos no se pueden recuperar.'), campo('PIN nuevo (' + n.pinMin + ' a ' + n.pinMax + ' números)', nuevo), campo('Repítelo', rep), err),
      acciones: [{ texto: 'Cambiar PIN', clase: 'btn-primario', onclick: async () => {
        if (!Sg().pinValido(nuevo.value)) { err.textContent = 'Usa de ' + n.pinMin + ' a ' + n.pinMax + ' números.'; return false; }
        if (Sg().pinDebil(nuevo.value)) { err.textContent = 'Ese PIN es muy fácil de adivinar.'; return false; }
        if (nuevo.value !== rep.value) { err.textContent = 'No coinciden.'; return false; }
        try { await Sg().cambiarPin(AF.app.ns, nuevo.value); aviso('PIN cambiado'); } catch (e) { aviso('No pude cambiar el PIN'); }
      } }] });
  }

  async function borrarTodo() {
    const ok = await C().confirmar({ titulo: '¿Borrar todos tus datos?', texto: 'Se borran movimientos, tarjetas, metas y ajustes de este teléfono. No se puede deshacer. Si tienes copia en Drive, se queda hasta que la borres.', si: 'Borrar todo', peligro: true });
    if (!ok) return;
    const ok2 = await C().confirmar({ titulo: 'Última confirmación', texto: 'Esto no tiene vuelta atrás. ¿Seguro que quieres empezar de cero?', si: 'Sí, borrar todo', peligro: true });
    if (!ok2) return;
    await AF.app.reiniciarCuenta();
  }

  /* ------------------------------------------------------------------ respaldo */
  function respaldo(cont) {
    const D = S().d, esGoogle = AF.app.sesion && AF.app.sesion.proveedor === 'google';
    const info = h('p', { class: 'texto-sm suave', estilo: { marginTop: '8px' } }, 'Revisando…');
    cont.appendChild(h('p', { class: 'suave', estilo: { marginTop: '4px' } }, 'La copia sale ya cifrada con tu PIN: ni Google ni nadie puede leerla. Para restaurarla necesitas el PIN que usabas al hacerla.'));
    const msg = (t) => { info.textContent = t; };
    const hacer = async (fn, ok, mal) => { try { await fn(); aviso(ok); } catch (e) { aviso(mal || (e && e.message) || 'No se pudo'); } };
    const copia = async () => { await S().guardarYa(); return Sg().paqueteRespaldo(AF.app.ns); };
    if (esGoogle) {
      cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'En tu Google Drive')), info,
        h('p', { class: 'texto-xs suave' }, 'Se guarda en una carpeta privada de la app que ni tú ves en Drive.'),
        h('div', { estilo: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' } },
          h('button', { class: 'btn btn-primario btn-bloque', type: 'button', onclick: async (e) => { const boton = e.currentTarget; boton.disabled = true; await hacer(async () => { await N().respaldoSubir(await copia()); S().ajustar({ ultimaCopia: Date.now() }); msg('Última copia: ahora mismo.'); }, 'Copia guardada en Drive', 'No pude subir la copia. ¿Tienes internet y diste permiso?'); boton.disabled = false; } }, ico('nube'), 'Hacer copia ahora'),
          h('button', { class: 'btn btn-borde btn-bloque', type: 'button', onclick: async () => {
            if (!(await C().confirmar({ titulo: '¿Restaurar la copia de Drive?', texto: 'Reemplaza lo que tienes ahora por la copia. Te pedirá el PIN que usabas al hacerla.', si: 'Restaurar' }))) return;
            await hacer(async () => { const p = await N().respaldoBajar(); if (!p) throw new Error('No hay ninguna copia en tu Drive.'); await Sg().restaurarPaquete(AF.app.ns, p); S().cargar(null); AF.app.abierta = false; await V.acceso.bloqueo(); }, 'Copia restaurada');
          } }, 'Restaurar desde Drive'),
          h('button', { class: 'btn-texto btn-peligro', type: 'button', onclick: async () => { if (await C().confirmar({ titulo: '¿Borrar la copia de Drive?', texto: 'Tus datos del teléfono no se tocan.', si: 'Borrar copia', peligro: true })) await hacer(async () => { const r = await N().respaldoBorrar(); msg(r ? 'Copia borrada.' : 'No había copia.'); }, 'Copia de Drive borrada'); } }, 'Borrar la copia de Drive'))));
      N().respaldoInfo().then((i) => msg(i ? 'Última copia en Drive: ' + new Date(i.fecha).toLocaleDateString('es') + '.' : 'Aún no tienes copia en Drive.')).catch((e) => msg(e && e.codigo === 'sin_token' ? 'Toca «Hacer copia ahora» y Google te pedirá permiso para guardarla.' : 'No pude consultar Drive ahora.'));
    }
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'En un archivo')),
      h('p', { class: 'texto-sm suave' }, esGoogle ? 'Otra opción: guarda la copia cifrada donde quieras.' : 'Guarda la copia cifrada donde quieras (correo, WhatsApp, tu computadora).'),
      h('div', { estilo: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' } },
        h('button', { class: 'btn btn-borde btn-bloque', type: 'button', onclick: () => hacer(async () => { const p = await copia(); await N().entregarArchivo('asistente-financiero-' + AF.app.hoy() + '.copia', JSON.stringify(p), 'application/json'); }, 'Copia lista', 'No pude crear el archivo') }, ico('archivo'), 'Guardar copia en un archivo'),
        h('label', { class: 'btn btn-borde btn-bloque', estilo: { cursor: 'pointer' } }, 'Restaurar desde un archivo', h('input', { type: 'file', class: 'oculto', accept: '.copia,.json,application/json', onchange: async (e) => {
          const f = e.target.files[0]; if (!f) return;
          if (!(await C().confirmar({ titulo: '¿Restaurar esta copia?', texto: 'Reemplaza lo que tienes ahora. Te pedirá el PIN que usabas al hacerla.', si: 'Restaurar' }))) return;
          await hacer(async () => { const p = JSON.parse(await f.text()); await Sg().restaurarPaquete(AF.app.ns, p); S().cargar(null); AF.app.abierta = false; await V.acceso.bloqueo(); }, 'Copia restaurada', 'Ese archivo no es una copia válida');
        } })))));
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Borrar todo')),
      h('p', { class: 'texto-sm suave' }, 'Borra todos tus datos de este teléfono.'),
      h('button', { class: 'btn btn-borde btn-bloque btn-peligro', type: 'button', estilo: { marginTop: '12px' }, onclick: borrarTodo }, 'Borrar todos mis datos')));
  }

  V.mas = { render, ajustes, respaldo };
})(typeof window !== 'undefined' ? window : globalThis);
