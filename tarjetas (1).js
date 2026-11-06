/* Tarjetas de crédito: cuánto pagas, cuándo, cuotas pendientes, mínimo vs total. Todo estimado hasta que ajustes con tu estado de cuenta. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const { h, ico, hoja, aviso, fila, campo } = AF.ui;
  const U = AF.util, PLAN = AF.PLAN;
  const V = (AF.vistas = AF.vistas || {});
  const $ = (n) => U.dinero(n);
  const S = () => AF.store, C = () => V.comun;

  const fechaLarga = (iso) => U.deISO(iso).getDate() + ' de ' + U.nombreMes(iso);
  const palabraCuotas = () => PLAN.pais(S().d.ajustes.pais).palabraCuotas;

  // Lo que se muestra: el estado de cuenta si la persona lo ajustó, si no, el estimado.
  function visto(t, hoy) {
    const e = AF.tarjetas.estado(t, S().d.movs, hoy);
    const r = t.estadoReal;
    if (r && r.vence >= hoy) {
      const pagadoDespues = S().d.movs.filter((m) => m.tipo === 'pago_tarjeta' && m.tarjetaId === t.id && m.fecha >= (r.fecha || '0')).reduce((s, m) => s + m.monto, 0);
      const aPagar = Math.max(0, U.r2(r.total - pagadoDespues));
      return Object.assign({}, e, { proximoVence: r.vence, aPagarProximo: aPagar, pagoMinimo: r.minimo != null ? Math.min(r.minimo, aPagar) : e.pagoMinimo, diasParaVencer: U.diasEntre(hoy, r.vence), origen: 'estado' });
    }
    return Object.assign({}, e, { origen: 'estimado' });
  }

  // Acabado del plástico según el nivel que eligió la persona (no es un dato del banco: solo cambia el color para que se parezca a la tarjeta real).
  function acabado(nivel) {
    const n = U.norm(String(nivel || ''));
    if (/black|infinite|signature|legend|premium/.test(n)) return 'n-negra';
    if (/platinum|platino/.test(n)) return 'n-plata';
    if (/gold|oro/.test(n)) return 'n-oro';
    return 'n-base';
  }
  // Marca de la red en la esquina: Mastercard son sus dos círculos; las demás, el nombre en letras.
  function marcaRed(red) {
    const n = U.norm(String(red || ''));
    if (!n) return null;
    if (n.includes('mastercard')) return h('span', { class: 'red-mc', role: 'img', 'aria-label': 'Mastercard' }, h('i'), h('i'));
    return h('span', { class: 'red-texto red-' + n.replace(/[^a-z]/g, ''), role: 'img', 'aria-label': red }, red);
  }
  function chipTarjeta() {
    const c = h('span', { class: 'chip-plastico', 'aria-hidden': 'true' });
    const w = h('span', { class: 'sin-contacto', 'aria-hidden': 'true' });
    w.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8.5 8.5a5 5 0 0 1 0 7"/><path d="M12 6a8.5 8.5 0 0 1 0 12"/><path d="M15.5 3.5a12 12 0 0 1 0 17"/></svg>';
    return h('div', { class: 'plastico-chip' }, c, w);
  }

  function plastico(t, e, hoy, grande) {
    const venceTxt = e.proximoVence && e.aPagarProximo ? 'Vence ' + (e.diasParaVencer <= 0 ? 'hoy' : e.diasParaVencer === 1 ? 'mañana' : 'el ' + fechaLarga(e.proximoVence)) : 'Sin pagos pendientes';
    const usado = t.cupo ? Math.min(1, e.cupoUsado / t.cupo) : null;
    const banco = t.bancoId ? B().buscar(t.bancoId) : null;
    return h('div', { class: 'plastico tarjeta-credito ' + acabado(t.nivel) },
      h('div', { class: 'plastico-cabeza' }, banco ? AF.ui.insigniaBanco(banco, 30) : h('span', { class: 'plastico-nombre' }, t.nombre), marcaRed(t.red)),
      h('div', { class: 'plastico-medio' }, chipTarjeta(),
        h('div', { class: 'plastico-monto' }, h('div', { class: 'suave texto-xs' }, e.origen === 'estado' ? 'A pagar · según tu estado' : 'A pagar · estimado'), h('div', { class: 'plastico-cifra' }, $(e.aPagarProximo)))),
      h('div', { class: 'plastico-numero' }, h('span', { class: 'plastico-digitos' }, t.ultimos4 ? '•••• •••• •••• ' + t.ultimos4 : t.nombre), t.nivel ? h('span', { class: 'suave plastico-nivel' }, t.nivel) : null),
      h('div', null, h('div', { class: 'plastico-pie' }, h('span', null, venceTxt), t.cupo ? h('span', { class: 'suave' }, 'Cupo libre ' + $(Math.max(0, t.cupo - e.cupoUsado))) : null),
        usado != null ? h('div', { class: 'cupo', role: 'img', 'aria-label': 'Cupo usado ' + Math.round(usado * 100) + ' por ciento' }, h('i', { estilo: { width: Math.round(usado * 100) + '%' } })) : null));
  }

  /* ------------------------------------------------------------------ lista */
  function render(cont) {
    const D = S().d, hoy = AF.app.hoy();
    cont.appendChild(h('header', { class: 'barra-superior' }, h('h1', { class: 'h2' }, 'Tarjetas'),
      h('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Agregar tarjeta', onclick: nueva }, ico('mas_'))));
    const cuerpo = h('div', { class: 'contenido' });
    if (!D.tarjetas.length) {
      cuerpo.appendChild(h('div', { class: 'vacio' }, h('strong', null, 'Agrega tu tarjeta de crédito'),
        'Te digo cuánto pagar, cuándo, y cómo van tus ' + palabraCuotas() + '. Pones tú el corte, el pago y la tasa: no invento nada.',
        h('div', { estilo: { marginTop: '16px' } }, h('button', { class: 'btn btn-voz', type: 'button', onclick: nueva }, 'Agregar tarjeta'))));
    } else {
      cuerpo.appendChild(h('div', { estilo: { display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' } },
        D.tarjetas.map((t) => { const e = visto(t, hoy); return h('button', { type: 'button', estilo: { textAlign: 'left', width: '100%' }, 'aria-label': 'Ver ' + t.nombre, onclick: () => AF.app.abrir(t.nombre, (c) => detalle(c, t.id)) }, plastico(t, e, hoy)); })));
      const pagos = D.tarjetas.map((t) => ({ t, e: visto(t, hoy) })).filter((x) => x.e.proximoVence && x.e.aPagarProximo).sort((a, b) => (a.e.proximoVence < b.e.proximoVence ? -1 : 1));
      if (pagos.length) {
        cuerpo.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Próximos pagos')),
          h('div', { class: 'lista' }, pagos.map(({ t, e }) => fila({ icono: AF.ui.ico('calendario'), titulo: t.nombre, sub: 'Vence el ' + fechaLarga(e.proximoVence) + (e.diasParaVencer <= 3 ? ' · ' + (e.diasParaVencer <= 0 ? 'hoy' : 'en ' + e.diasParaVencer + (e.diasParaVencer === 1 ? ' día' : ' días')) : ''), derecha: h('span', { class: 'monto' }, $(e.aPagarProximo)), onclick: () => AF.app.abrir(t.nombre, (c) => detalle(c, t.id)) })))));
      }
      cuerpo.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '24px' } }, 'Los valores son estimados con lo que registraste. Si tu banco dice otra cosa, toca la tarjeta y usa «Ajustar con mi estado de cuenta».'));
    }
    cont.appendChild(cuerpo);
  }

  function nueva() {
    if (!AF.acceso.puedeAgregar('tarjetas', S().d.tarjetas.length)) return pedirLimite();
    formTarjeta(null);
  }
  function pedirLimite() {
    hoja({ titulo: 'Más tarjetas con Pro', cuerpo: h('p', { class: 'suave', estilo: { marginTop: '6px' } }, 'Gratis incluye ' + AF.acceso.limite('tarjetas') + ' tarjeta. Con Pro agregas todas las que uses.'),
      acciones: [{ texto: 'Ahora no', clase: 'btn-borde' }, { texto: 'Ver Pro', clase: 'btn-primario', onclick: () => AF.app.abrir('Pro', (c) => V.pro.render(c)) }] });
  }

  /* ------------------------------------------------------------------ asistente: banco → tarjeta → datos */
  const B = () => AF.bancos;
  const coma = (n) => (n == null ? '' : String(n).replace('.', ','));
  const OTRO = { id: '', nombre: 'Otro banco', corto: '+', esOtro: true };

  // Abre la hoja para agregar o editar una tarjeta. No guarda por su cuenta: entrega el objeto a o.alGuardar(obj)
  // (así sirve igual en Tarjetas y en la bienvenida). Si alGuardar devuelve false, la hoja queda abierta.
  function asistente(o) {
    const pais = o.pais || S().d.ajustes.pais, t = o.tarjeta || null;
    const x = Object.assign({ bancoId: '', banco: '', red: '', nivel: '', nivelOtro: '' }, t || {});
    if (x.nivel && !B().nivelesDe(B().buscar(x.bancoId)).includes(x.nivel)) { x.nivelOtro = x.nivel; x.nivel = 'Otra'; }
    const f = { nombre: x.nombre || '', u4: x.ultimos4 || '', cupo: coma(x.cupo), corte: coma(x.diaCorte), venc: coma(x.diaVencimiento), tasa: coma(x.tasaAnual), minimo: coma(x.pagoMinimoPct) };
    let nombreTocado = !!(t && t.nombre);
    let paso = t ? 'datos' : 'banco';
    const cont = h('div');
    const api = hoja({ cuerpo: cont });

    const banco = () => B().buscar(x.bancoId);
    const nombreBanco = () => (banco() ? banco().nombre : x.banco);
    const nivelFinal = () => (x.nivel === 'Otra' ? x.nivelOtro.trim() : x.nivel);
    const nombreAuto = () => [banco() ? banco().corto : x.banco, x.red, nivelFinal()].filter(Boolean).join(' ');
    const objBanco = () => banco() || { id: '', nombre: x.banco || 'Tu banco', corto: x.banco ? x.banco : '+' };
    const ir = (p) => { paso = p; pintar(); api.el.scrollTop = 0; };

    const previa = () => h('div', { class: 'tarjeta-previa' }, AF.ui.insigniaBanco(objBanco(), 40),
      h('div', { class: 'tarjeta-previa-texto' }, h('strong', null, nombreBanco() || 'Tu banco'), h('span', null, [x.red, nivelFinal()].filter(Boolean).join(' ') || 'Tipo de tarjeta')));
    const cabeza = (n, titulo, sub) => h('div', { class: 'asistente-cabeza' },
      h('div', { class: 'pasos', 'aria-label': 'Paso ' + n + ' de 3' }, [1, 2, 3].map((i) => h('i', { class: i <= n ? 'hecho' : '' }))),
      h('h2', { class: 'h2' }, titulo), sub ? h('p', { class: 'suave', estilo: { marginTop: '4px' } }, sub) : null);
    const pie = (...bots) => h('div', { class: 'hoja-acciones' }, bots);
    const pills = (lista, actual, alElegir) => h('div', { class: 'opciones', estilo: { marginTop: '8px' } },
      lista.map(([val, txt]) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': actual === val ? 'true' : 'false', onclick: () => alElegir(val) }, txt)));

    /* ---- 1 · banco */
    function pasoBanco() {
      const lista = B().lista(pais);
      const rej = h('div', { class: 'rejilla-bancos' });
      const q = h('input', { class: 'entrada', type: 'search', placeholder: 'Buscar tu banco', 'aria-label': 'Buscar banco', autocomplete: 'off' });
      const op = (b) => h('button', { type: 'button', class: 'banco-op', 'aria-pressed': (b.esOtro ? !x.bancoId && x.banco !== '' : x.bancoId === b.id) ? 'true' : 'false',
        onclick: () => {
          x.bancoId = b.id; x.banco = b.esOtro ? '' : b.nombre;
          if (!B().redesDe(b.esOtro ? null : b).includes(x.red)) x.red = '';
          if (x.nivel && x.nivel !== 'Otra' && !B().nivelesDe(b.esOtro ? null : b).includes(x.nivel)) x.nivel = '';
          if (!nombreTocado) f.nombre = '';
          ir('tipo');
        } },
        AF.ui.insigniaBanco(b, 52), h('span', { class: 'banco-nombre' }, b.corto === '+' ? 'Otro banco' : b.corto),
        B().tieneCostos(b) ? h('span', { class: 'banco-tag' }, 'Con costos') : null);
      const pintaRej = () => {
        AF.ui.vaciar(rej);
        const n = U.norm(q.value.trim());
        const vistos = lista.filter((b) => !n || U.norm(b.nombre + ' ' + b.corto).includes(n));
        // Bancos y cooperativas van en grupos separados (la cooperativa lleva tipo: 'cooperativa' en el catálogo); el título solo sale si hay de los dos.
        const bancos = vistos.filter((b) => b.tipo !== 'cooperativa'), coops = vistos.filter((b) => b.tipo === 'cooperativa');
        if (bancos.length && coops.length) rej.appendChild(h('p', { class: 'rejilla-titulo' }, 'Bancos'));
        bancos.forEach((b) => rej.appendChild(op(b)));
        if (coops.length) {
          if (bancos.length) rej.appendChild(h('p', { class: 'rejilla-titulo' }, 'Cooperativas'));
          coops.forEach((b) => rej.appendChild(op(b)));
        }
        if (!n || 'otro banco'.includes(n)) rej.appendChild(op(OTRO));
        if (!rej.children.length) rej.appendChild(h('p', { class: 'suave' }, 'No lo encuentro. Prueba con «Otro banco».'));
      };
      q.addEventListener('input', pintaRej); pintaRej();
      cont.appendChild(h('div', null, cabeza(1, '¿De qué banco es tu tarjeta?', 'Toca el tuyo. Si no está, elige «Otro banco».'), q, rej,
        pie(h('button', { class: 'btn btn-borde', type: 'button', onclick: () => { api.cerrar(); if (o.alCancelar) o.alCancelar(); } }, 'Cancelar'))));
    }

    /* ---- 2 · red y nivel */
    function pasoTipo() {
      const b = banco(), redes = B().redesDe(b);
      const niveles = B().nivelesDe(b).slice(); if (!niveles.includes('Otra')) niveles.push('Otra');
      const err = h('div', { class: 'ayuda', role: 'alert', estilo: { color: 'var(--gasto)', minHeight: '18px', marginTop: '8px' } });
      const nom = !b ? h('input', { class: 'entrada', value: x.banco, maxlength: 40, placeholder: 'Ej.: Banco Solidario', 'aria-label': 'Nombre del banco', oninput: (e) => { x.banco = e.target.value; } }) : null;
      const otroNivel = h('input', { class: 'entrada', value: x.nivelOtro, maxlength: 30, placeholder: 'Ej.: Premium, Black…', 'aria-label': 'Nombre del nivel', oninput: (e) => { x.nivelOtro = e.target.value; } });
      cont.appendChild(h('div', null, cabeza(2, '¿Qué tarjeta es?', 'Mira el frente del plástico: ahí dice la red y el nivel.'), previa(),
        nom ? campo('¿Cómo se llama el banco?', nom) : null,
        campo('Red', pills(redes.map((r) => [r, r]), x.red, (r) => { x.red = r; if (!nombreTocado) f.nombre = ''; pintar(); })),
        campo('Nivel', pills([['', 'No sé']].concat(niveles.map((n) => [n, n])), x.nivel, (n) => { x.nivel = n; if (!nombreTocado) f.nombre = ''; pintar(); }), 'Clásica, Gold, Platinum… Si no lo sabes, déjalo en «No sé».'),
        x.nivel === 'Otra' ? campo('Nombre del nivel', otroNivel) : null, err,
        pie(h('button', { class: 'btn btn-borde', type: 'button', onclick: () => ir('banco') }, 'Atrás'),
          h('button', { class: 'btn btn-primario', type: 'button', onclick: () => {
            if (nom && !x.banco.trim()) { err.textContent = 'Escribe el nombre del banco.'; nom.focus(); return; }
            if (!x.red) { err.textContent = 'Elige la red de tu tarjeta (Visa, Mastercard…).'; return; }
            x.banco = nombreBanco().trim(); ir('datos');
          } }, 'Siguiente'))));
    }

    /* ---- 3 · datos */
    function pasoDatos() {
      const b = banco();
      if (!nombreTocado && !f.nombre) f.nombre = nombreAuto();
      const num = (clave, ph, etq) => h('input', { class: 'entrada', inputmode: 'decimal', value: f[clave], placeholder: ph, 'aria-label': etq, oninput: (e) => { f[clave] = e.target.value; } });
      const nombre = h('input', { class: 'entrada', placeholder: 'Ej.: Pichincha Visa Platinum', value: f.nombre, maxlength: 40, 'aria-label': 'Nombre de la tarjeta', oninput: (e) => { f.nombre = e.target.value; nombreTocado = true; } });
      const u4 = h('input', { class: 'entrada', inputmode: 'numeric', maxlength: 4, value: f.u4, placeholder: '1234', 'aria-label': 'Últimos 4 dígitos', oninput: (e) => { f.u4 = e.target.value; } });
      const tasa = num('tasa', 'La de tu estado de cuenta', 'Tasa anual nominal');
      const err = h('div', { class: 'ayuda', role: 'alert', estilo: { color: 'var(--gasto)', minHeight: '18px', marginTop: '8px' } });

      // Tasa: solo se SUGIERE (con su fuente); la persona decide si la usa.
      const sug = B().tasaSugerida(b, pais);
      const caja = sug ? h('div', { class: 'sugerencia' },
        h('p', null, sug.delBanco
          ? h('span', null, h('strong', null, nombreBanco() + ' publica ' + coma(sug.efectiva) + ' % efectiva anual'), ' para ' + sug.aplicaA + (sug.vigencia ? ' (' + sug.vigencia + ')' : '') + '. La app usa tasa nominal: eso equivale a ' + coma(sug.nominal) + ' %.')
          : h('span', null, h('strong', null, 'Techo legal: ' + coma(sug.efectiva) + ' % efectiva anual'), ' (' + sug.aplicaA.toLowerCase() + ', ' + sug.vigencia + '). Tu banco puede cobrar menos; lo seguro es la tasa de tu estado de cuenta. Equivale a ' + coma(sug.nominal) + ' % nominal.')),
        h('button', { class: 'btn btn-borde', type: 'button', onclick: () => { f.tasa = coma(sug.nominal); tasa.value = f.tasa; } }, 'Usar ' + coma(sug.nominal) + ' %')) : null;

      const notaCostos = b && b.aviso ? null : b && B().tieneCostos(b)
        ? h('div', { class: 'nota', estilo: { marginTop: '16px' } }, ico('info'), h('span', null, h('strong', null, 'Ya tengo los costos de ' + b.nombre + '. '), 'Los ves dentro de tu tarjeta, con su fuente y fecha (' + b.fuente.vigencia + ').'))
        : h('div', { class: 'nota', estilo: { marginTop: '16px' } }, ico('info'), h('span', null, h('strong', null, 'Aún no tengo los costos de ' + (nombreBanco() || 'este banco') + '. '), 'No los invento: dentro de tu tarjeta puedes anotar lo que te cobra' + (b && b.tarifarioUrl ? ', y abajo está su tarifario oficial.' : '.')));
      // Aviso propio de la entidad (por ejemplo, «publica su tarifario en imágenes» o «no publica sus costos»): se muestra tal cual.
      const avisoBanco = b && b.aviso ? h('div', { class: 'nota', estilo: { marginTop: '10px' } }, ico('info'), h('span', null, b.aviso)) : null;
      const abrir = b && b.tarifarioUrl && (!B().tieneCostos(b) || b.aviso)
        ? h('a', { class: 'btn btn-borde btn-bloque', href: b.tarifarioUrl, target: '_blank', rel: 'noopener noreferrer', estilo: { marginTop: '10px' } }, 'Abrir tarifario de ' + b.corto) : null;

      cont.appendChild(h('div', null, cabeza(3, 'Los datos de tu tarjeta', 'Todo es opcional menos el nombre. Lo encuentras en tu estado de cuenta o en la app del banco.'), previa(),
        t ? h('button', { class: 'btn-texto', type: 'button', onclick: () => ir('banco') }, 'Cambiar banco o tipo de tarjeta') : null,
        campo('Nombre', nombre), campo('Últimos 4 dígitos', u4), campo('Cupo', num('cupo', 'Opcional', 'Cupo')),
        campo('Día de corte', num('corte', 'Ej. 20', 'Día de corte'), 'El día del mes en que cierra tu estado de cuenta.'),
        campo('Día límite de pago', num('venc', 'Ej. 5', 'Día límite de pago'), 'El día del mes en que debes pagar.'),
        campo('Tasa anual nominal %', tasa, 'Si no la pones, no calculo intereses.'), caja,
        campo('Pago mínimo %', num('minimo', 'Opcional', 'Pago mínimo'), 'Qué parte del total te piden como mínimo, si lo sabes.'),
        notaCostos, avisoBanco, abrir, err,
        pie(h('button', { class: 'btn btn-borde', type: 'button', onclick: () => ir('tipo') }, 'Atrás'),
          h('button', { class: 'btn btn-primario', type: 'button', onclick: () => {
            const nom = f.nombre.trim(); if (!nom) { err.textContent = 'Ponle un nombre.'; nombre.focus(); return; }
            const dd = (v) => { const n = U.parseNumero(v); return n >= 1 && n <= 31 ? Math.round(n) : null; };
            const c = dd(f.corte), vv = dd(f.venc);
            if (f.corte && !c) { err.textContent = 'El día de corte va de 1 a 31.'; return; }
            if (f.venc && !vv) { err.textContent = 'El día de pago va de 1 a 31.'; return; }
            const obj = { nombre: nom, banco: nombreBanco(), bancoId: x.bancoId || null, red: x.red, nivel: nivelFinal() || null, ultimos4: f.u4.replace(/\D/g, '').slice(0, 4),
              cupo: f.cupo ? U.parseNumero(f.cupo) : null, diaCorte: c, diaVencimiento: vv, tasaAnual: f.tasa ? U.parseNumero(f.tasa) : null, pagoMinimoPct: f.minimo ? U.parseNumero(f.minimo) : null };
            if (o.alGuardar(obj) === false) return;
            api.cerrar();
          } }, o.textoGuardar || 'Guardar tarjeta'))));
    }

    function pintar() { AF.ui.vaciar(cont); (paso === 'banco' ? pasoBanco : paso === 'tipo' ? pasoTipo : pasoDatos)(); }
    pintar();
    return api;
  }

  function formTarjeta(t) {
    asistente({ tarjeta: t, textoGuardar: t ? 'Guardar cambios' : 'Guardar tarjeta', alGuardar: (o) => {
      if (t) S().editar('tarjetas', t.id, o, 'Edité ' + o.nombre); else S().agregar('tarjetas', o, 'Agregué ' + o.nombre);
      aviso('Tarjeta guardada');
    } });
  }

  /* ------------------------------------------------------------------ detalle */
  function detalle(cont, id) {
    const t = S().buscar('tarjetas', id), hoy = AF.app.hoy();
    if (!t) { AF.app.atras(); return; }
    const e = visto(t, hoy);
    cont.appendChild(plastico(t, e, hoy, true));
    cont.appendChild(h('div', { estilo: { display: 'flex', gap: '10px', marginTop: '14px' } },
      h('button', { class: 'btn btn-primario', type: 'button', estilo: { flex: 1 }, onclick: () => registrarPago(t, e) }, 'Registrar un pago'),
      h('button', { class: 'btn btn-borde', type: 'button', 'aria-label': 'Editar tarjeta', onclick: () => formTarjeta(t) }, ico('editar'))));

    // datos que faltan (nunca se inventan)
    if (e.faltanDatos.includes('fechas')) cont.appendChild(h('div', { class: 'nota', estilo: { marginTop: '16px' } }, ico('alerta'), h('span', null, h('strong', null, 'Faltan el corte y el día de pago. '), 'Sin eso no sé cuándo vence cada cuota. ', h('button', { class: 'enlace', type: 'button', onclick: () => formTarjeta(t) }, 'Completar'))));
    if (e.comprasSinTasa) cont.appendChild(h('div', { class: 'nota', estilo: { marginTop: '16px' } }, ico('alerta'), h('span', null, h('strong', null, 'Falta la tasa anual. '), 'Hay ' + e.comprasSinTasa + (e.comprasSinTasa === 1 ? ' compra' : ' compras') + ' con intereses sin calcular. ', h('button', { class: 'enlace', type: 'button', onclick: () => formTarjeta(t) }, 'Poner la tasa'))));
    e.avisos.slice(0, 2).forEach((a) => cont.appendChild(h('div', { class: 'nota', estilo: { marginTop: '12px' } }, ico('info'), h('span', null, a))));

    const datos = [];
    if (e.proximoVence) datos.push(['Próximo pago', fechaLarga(e.proximoVence) + (e.diasParaVencer != null ? ' · ' + (e.diasParaVencer <= 0 ? 'hoy' : 'en ' + e.diasParaVencer + (e.diasParaVencer === 1 ? ' día' : ' días')) : '')]);
    if (e.interesProximo > 0 && e.origen === 'estimado') datos.push(['Intereses en ese pago', $(e.interesProximo)]);
    datos.push(['Deuda total', $(e.deudaTotal)]);
    if (t.cupo) datos.push(['Cupo disponible', $(Math.max(0, t.cupo - e.cupoUsado))]);
    if (e.siguienteCorte) datos.push(['Próximo corte', fechaLarga(e.siguienteCorte) + ' · en ' + e.diasParaCorte + (e.diasParaCorte === 1 ? ' día' : ' días')]);
    cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'lista' }, datos.map(([a, b]) => h('div', { class: 'interruptor', estilo: { minHeight: '52px' } }, h('span', null, a), h('strong', { class: 'num' }, b))))));

    seccionCostos(cont, t);

    // mínimo vs total (Pro)
    const mv = AF.tarjetas.minimoVsTotal(t, e);
    if (AF.acceso.tiene('asesorTarjeta')) {
      if (mv) cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, '¿Mínimo o total?')),
        h('div', { class: 'nota pro' }, ico('info'), h('span', null, 'Si pagas el total (' + $(mv.pagarTotal) + ') no pagas intereses. Si pagas solo el mínimo (' + $(mv.pagarMinimo) + '), quedan ' + $(mv.queda) + ' y te cobrarían unos ' + $(mv.interesEstimadoMes) + ' de interés en un mes (estimado).'))));
      else if (e.aPagarProximo) cont.appendChild(h('div', { class: 'nota pro', estilo: { marginTop: '16px' } }, ico('info'), h('span', null, 'Para comparar mínimo y total necesito la tasa anual y el % de pago mínimo de tu tarjeta. ', h('button', { class: 'enlace', type: 'button', onclick: () => formTarjeta(t) }, 'Ponerlos'))));
    } else if (e.aPagarProximo) cont.appendChild(h('div', { estilo: { marginTop: '16px' } }, C().gancho('Pro te dice si conviene pagar el mínimo o el total.', 'asesorTarjeta')));

    // cuotas pendientes
    const pend = e.pendientes.filter((q) => q.de > 1 || e.pendientes.length <= 8).slice(0, 24);
    if (pend.length) {
      cont.appendChild(h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Lo que viene')),
        h('div', { class: 'lista' }, pend.map((q) => fila({ icono: q.de > 1 ? '🧾' : '🛒', titulo: q.desc || S().categoria(q.cat).nombre, sub: (q.de > 1 ? 'Cuota ' + q.n + ' de ' + q.de + ' · ' : '') + 'vence ' + fechaLarga(q.vence), derecha: h('span', { class: 'monto' }, $(q.pendiente)) })))));
    }
    cont.appendChild(h('button', { class: 'btn btn-borde btn-bloque', type: 'button', estilo: { marginTop: '22px' }, onclick: () => ajustar(t) }, 'Ajustar con mi estado de cuenta'));
    cont.appendChild(h('button', { class: 'btn-texto btn-peligro', type: 'button', estilo: { marginTop: '8px', width: '100%' }, onclick: async () => {
      if (await C().confirmar({ titulo: '¿Quitar ' + t.nombre + '?', texto: 'Sus compras y pagos siguen en tus movimientos, pero ya no se calculan cuotas ni vencimientos.', si: 'Quitar tarjeta', peligro: true })) { S().borrar('tarjetas', t.id, 'Quité ' + t.nombre); AF.app.atras(); }
    } }, 'Quitar esta tarjeta'));
  }

  /* ------------------------------------------------------------------ costos de la tarjeta */
  // Lo que cobra el banco (del catálogo, con fuente y fecha) + lo que la persona anotó ella. Nada se inventa.
  function seccionCostos(cont, t) {
    const b = B().buscar(t.bancoId);
    const todas = B().filas(b, t.nivel, t.costos);
    const con = todas.filter((x) => x.texto), sin = todas.filter((x) => !x.texto);
    const fu = b && b.fuente;
    const sec = h('section', { class: 'seccion' }, h('div', { class: 'seccion-cabeza' }, h('h2', { class: 'h2' }, 'Costos de tu tarjeta')));
    if (fu && B().tieneCostos(b)) sec.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginBottom: '8px' } }, b.nombre + ' · ' + fu.texto + ' · ' + fu.vigencia + '. Valores con IVA.'));
    if (con.length) {
      sec.appendChild(h('div', { class: 'lista' }, con.map((x) => fila({ icono: x.icono, titulo: x.etiqueta, sub: x.texto, derecha: ico('adelante'), onclick: () => editarCosto(t, x) }))));
    } else {
      sec.appendChild(h('div', { class: 'nota' }, ico('info'), h('span', null, h('strong', null, 'Aún no tengo los costos de ' + (t.banco || 'tu banco') + '. '),
        'No los invento. Anota lo que te cobra (avance, renovación, tasa…) y queda guardado aquí.')));
    }
    const calc = calculadoraAvance(b);
    if (calc) sec.appendChild(calc);
    if (sin.length) sec.appendChild(h('button', { class: 'btn btn-borde btn-bloque', type: 'button', estilo: { marginTop: '12px' }, onclick: () => elegirCosto(t, sin) }, 'Anotar un costo'));
    if (b && b.tarifarioUrl && !B().tieneCostos(b)) sec.appendChild(h('a', { class: 'btn-texto', href: b.tarifarioUrl, target: '_blank', rel: 'noopener noreferrer', estilo: { display: 'block', textAlign: 'center', marginTop: '8px' } }, 'Abrir el tarifario oficial de ' + b.corto));
    if (con.length) sec.appendChild(h('p', { class: 'texto-xs suave', estilo: { marginTop: '10px' } }, 'Son los valores publicados por el banco y pueden cambiar. Si tu estado de cuenta dice otra cosa, manda tu estado de cuenta: toca una línea y anota tu dato.'));
    cont.appendChild(sec);
  }

  // «Si sacas un avance de $X, la comisión es $Y». Solo aparece si el banco publicó cómo se calcula.
  function calculadoraAvance(b) {
    if (!b || !b.avance) return null;
    const inp = h('input', { class: 'entrada', inputmode: 'decimal', placeholder: 'Monto', 'aria-label': 'Monto del avance' });
    const res = h('div', { class: 'calc-resultado', role: 'status' }, 'Escribe un monto para ver la comisión.');
    inp.addEventListener('input', () => {
      const m = U.parseNumero(inp.value), c = m > 0 ? B().costosAvance(b, m) : [];
      res.textContent = !c.length ? 'Escribe un monto para ver la comisión.'
        : (c.length === 1 && c[0].valor != null ? 'Comisión del avance: ' + $(c[0].valor) : 'Comisión del avance: ' + c.map((x) => x.etiqueta + ' ' + (x.valor != null ? $(x.valor) : x.texto)).join(' · ')) + ' (con IVA). Los intereses son aparte.';
    });
    return h('div', { class: 'calc-avance' }, h('strong', null, '¿Cuánto cuesta un avance?'), inp, res);
  }

  function elegirCosto(t, lista) {
    hoja({ titulo: '¿Qué costo quieres anotar?', cuerpo: h('div', { class: 'lista' }, lista.map((x) => fila({ icono: x.icono, titulo: x.etiqueta, derecha: ico('adelante'), onclick: () => { setTimeout(() => editarCosto(t, x), 60); } }))), acciones: [{ texto: 'Cerrar', clase: 'btn-borde' }] });
  }

  function editarCosto(t, x) {
    const hoy = AF.app.hoy();
    const actual = (S().buscar('tarjetas', t.id) || t).costos || {};
    const inp = h('input', { class: 'entrada', maxlength: 120, value: x.propio ? x.texto : '', placeholder: 'Ej.: $5 por cada $100', 'aria-label': x.etiqueta });
    const cuerpo = h('div', null,
      x.texto && !x.propio ? h('div', { class: 'nota', estilo: { marginTop: '8px' } }, ico('info'), h('span', null, h('strong', null, x.texto), x.nota ? h('span', null, ' ' + x.nota) : null,
        x.fuente ? h('span', { class: 'suave' }, ' Fuente: ' + x.fuente.texto + ' (' + x.fuente.vigencia + ').') : null)) : null,
      x.propio && x.nota ? h('p', { class: 'suave', estilo: { marginTop: '6px' } }, x.nota) : null,
      campo(x.texto && !x.propio ? 'Lo que te cobra a ti (opcional)' : 'Lo que te cobra', inp, 'Escríbelo como aparece en tu estado de cuenta o en el tarifario de tu banco.'),
      x.fuente && x.fuente.url ? h('a', { class: 'btn-texto', href: x.fuente.url, target: '_blank', rel: 'noopener noreferrer', estilo: { display: 'block', marginTop: '10px' } }, 'Abrir el documento del banco') : null);
    const acciones = [{ texto: 'Cerrar', clase: 'btn-borde' }, { texto: 'Guardar', clase: 'btn-primario', onclick: () => {
      const v = inp.value.trim(); if (!v) return x.propio ? quitar() : false;
      S().editar('tarjetas', t.id, { costos: Object.assign({}, actual, { [x.clave]: { texto: v, fecha: hoy } }) }, 'Anoté ' + x.etiqueta.toLowerCase() + ' de ' + t.nombre);
      aviso('Anotado');
    } }];
    function quitar() { const c = Object.assign({}, actual); delete c[x.clave]; S().editar('tarjetas', t.id, { costos: c }, 'Quité mi dato de ' + x.etiqueta.toLowerCase()); aviso('Quité tu dato'); }
    hoja({ titulo: x.etiqueta, cuerpo, acciones });
  }

  function registrarPago(t, e) {
    const inp = h('input', { class: 'entrada grande', inputmode: 'decimal', value: e.aPagarProximo ? String(e.aPagarProximo).replace('.', ',') : '', 'aria-label': 'Monto pagado' });
    const fecha = h('input', { class: 'entrada', type: 'date', value: AF.app.hoy(), max: AF.app.hoy() });
    hoja({ titulo: 'Registrar un pago', cuerpo: h('div', null, h('p', { class: 'suave', estilo: { marginTop: '4px' } }, 'No cuenta como gasto: solo baja lo que debes de ' + t.nombre + '.'), campo('Monto pagado', inp), campo('Fecha', fecha)),
      acciones: [{ texto: 'Guardar pago', clase: 'btn-primario', onclick: () => {
        const v = U.parseNumero(inp.value); if (!(v > 0)) { inp.focus(); return false; }
        S().agregar('movs', { tipo: 'pago_tarjeta', monto: U.r2(v), fecha: fecha.value || AF.app.hoy(), tarjetaId: t.id, cat: null, desc: 'Pago ' + t.nombre }, 'Pagué ' + t.nombre);
        aviso('Pago registrado', { texto: 'Deshacer', onclick: () => S().deshacer() });
      } }] });
    setTimeout(() => inp.select(), 150);
  }

  function ajustar(t) {
    const r = t.estadoReal || {};
    const hoy = AF.app.hoy();
    const total = h('input', { class: 'entrada grande', inputmode: 'decimal', value: r.total != null ? String(r.total).replace('.', ',') : '', placeholder: '0,00', 'aria-label': 'Total a pagar' });
    const minimo = h('input', { class: 'entrada', inputmode: 'decimal', value: r.minimo != null ? String(r.minimo).replace('.', ',') : '', placeholder: 'Opcional', 'aria-label': 'Pago mínimo' });
    const vence = h('input', { class: 'entrada', type: 'date', value: r.vence || '' });
    const err = h('div', { class: 'ayuda', role: 'alert', estilo: { color: 'var(--gasto)', minHeight: '18px' } });
    hoja({ titulo: 'Ajustar con tu estado de cuenta', cuerpo: h('div', null, h('p', { class: 'suave', estilo: { marginTop: '4px' } }, 'Copia estos datos de tu estado de cuenta y los usaré en lugar de mi estimado hasta que venza.'), campo('Total a pagar', total), campo('Pago mínimo', minimo), campo('Fecha límite de pago', vence), err),
      acciones: [{ texto: 'Guardar', clase: 'btn-primario', onclick: () => {
        const tv = U.parseNumero(total.value);
        if (!(tv >= 0) || tv == null) { err.textContent = 'Pon el total a pagar.'; return false; }
        if (!vence.value || vence.value < hoy) { err.textContent = 'Elige una fecha límite que no haya pasado.'; return false; }
        S().editar('tarjetas', t.id, { estadoReal: { total: U.r2(tv), minimo: minimo.value ? U.parseNumero(minimo.value) : null, vence: vence.value, fecha: hoy } }, 'Ajusté ' + t.nombre + ' con el estado de cuenta');
        aviso('Ajustado con tu estado de cuenta');
      } }] });
  }

  V.tarjetas = { render, formTarjeta, asistente, visto };
})(typeof window !== 'undefined' ? window : globalThis);
