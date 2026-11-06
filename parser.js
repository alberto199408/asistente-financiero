/* El intérprete de frases (botón único): reglas + diccionario + lo aprendido. Sin internet.
   interpretar(texto, ctx) -> { tipo: 'registrar' | 'preguntar' | 'corregir' | 'presupuesto' | 'informe' | 'ayuda' | 'desconocido', ... }
   ctx = { hoy, categorias, dicc (lo aprendido), tarjetas }                                                       */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const U = AF.util;

  /* ---------------------------------------------------------------- Listas de palabras */
  const set = (s) => new Set(s.split(/\s+/).filter(Boolean));
  const V_GASTO = set('gaste gastamos gasto gastado gastaron pague pagamos pagado compre compramos comprado pedi consumi done aboné abone inverti');
  const V_INGRESO = set('gane ganamos gano ganancia cobre cobramos recibi recibimos ingrese ingresaron vendi vendimos');
  const FRASES_INGRESO = ['me pagaron', 'me depositaron', 'me llego', 'me llegaron', 'me entro', 'me dieron', 'me regalaron', 'me transfirieron', 'me abonaron', 'me depositaron', 'me pagan', 'ingreso de', 'un ingreso'];
  const FRASES_GASTO = ['me cobraron', 'me costo', 'me salio', 'un gasto', 'gasto de'];
  const PARADA = set('el la los las un una unos unas de del en por para con al a y e o mi mis tu tus su sus me se lo que es fue era fueron hoy ayer anoche dolares dolar usd pesos euros soles centavos centavo mas casi como pues entonces porque cuando donde yo cargue cargamos tanquee fui fuimos llene eche echamos pase pasamos sali salimos');
  const MONEDAS = set('dolar dolares usd $ pesos peso euros euro soles sol dolarcitos');
  const OPENER_PREGUNTA = set('cuanto cuantos cuanta cuantas cual cuales dime muestrame desglosame desglosa resumeme resumen cuando donde hay tengo puedo podria alcanza conviene que');
  const V_CORREGIR = set('cambia cambialo cambiale cambiar corrige corrigelo corregir modifica modificalo edita editalo ponlo pon pone marca marcalo borra borralo borrar elimina eliminalo eliminar quita quitalo anula anulalo anular deshaz deshacer olvidalo mejor');
  const V_BORRAR = set('borra borralo borrar elimina eliminalo eliminar quita quitalo anula anulalo anular olvidalo');
  const MESES_N = U.MESES;
  const DIAS_N = U.DIAS;

  /* ------------------------------------------------------------------------ Tokens */
  const limpiar = (raw) => U.norm(raw).replace(/^[¿¡"'(\[]+/, '').replace(/[?!"')\].,;:]+$/, '');
  const esNumToken = (n) => /^\$?\d[\d.,]*\$?$/.test(n) || /^\d[\d.,]*(usd|dolares|dolar)$/.test(n);
  function numDeToken(n) {
    const m = n.match(/^\$?(\d[\d.,]*)/);
    return m ? U.parseNumero(m[1]) : null;
  }

  function tokenizar(texto) {
    const crudos = String(texto || '').trim().split(/\s+/).filter(Boolean);
    let toks = crudos.map((raw) => ({ raw, n: limpiar(raw), coma: /[,;]$/.test(raw) }));
    // 1) palabras-número => un solo token numérico ("veinte y cinco" => 25)
    const ns = toks.map((t) => t.n);
    const out = [];
    for (let i = 0; i < toks.length;) {
      const r = U.leerRacha(ns, i);
      if (r) {
        const partes = toks.slice(i, r.fin);
        out.push({ raw: partes.map((p) => p.raw).join(' '), n: String(r.valor), num: r.valor, coma: partes[partes.length - 1].coma, palabras: true });
        i = r.fin;
      } else { out.push(toks[i]); i++; }
    }
    toks = out;
    // 2) números con dígitos
    toks.forEach((t) => { if (t.num == null && esNumToken(t.n)) { const v = numDeToken(t.n); if (v != null) t.num = v; } });
    // 3) "veinte con cincuenta (centavos)" => 20,50
    for (let i = 0; i < toks.length - 2; i++) {
      const a = toks[i];
      if (a.num == null) continue;
      let j = i + 1;
      const hayMoneda = toks[j] && MONEDAS.has(toks[j].n);
      if (hayMoneda) j++;
      if (toks[j] && toks[j].n === 'con' && toks[j + 1] && toks[j + 1].num != null && toks[j + 1].num < 100 && Number.isInteger(toks[j + 1].num)) {
        const b = toks[j + 1];
        const cent = toks[j + 2] && /^(centavo|centavos|ctvs|ctv)$/.test(toks[j + 2].n);
        const alFinal = j + 1 === toks.length - 1;
        const monedaDespues = toks[j + 2] && MONEDAS.has(toks[j + 2].n);
        const centavoTipico = b.num % 5 === 0 && b.num >= 10 || b.num === 99;
        const sigGente = toks[j + 2] && /^(amigos|amigas|personas|gente|ninos|companeros|familia|invitados)$/.test(toks[j + 2].n);
        if (cent || hayMoneda || alFinal || monedaDespues || (centavoTipico && !sigGente)) {
          const fin = (cent || monedaDespues) ? j + 3 : j + 2;
          const nuevo = { raw: toks.slice(i, fin).map((p) => p.raw).join(' '), n: String(a.num + b.num / 100), num: a.num + b.num / 100, coma: toks[fin - 1].coma, palabras: true };
          toks.splice(i, fin - i, nuevo);
        }
      }
    }
    // "nueve cincuenta" (dos números dichos seguidos) => 9,50
    for (let i = 0; i < toks.length - 1; i++) {
      const a = toks[i], b = toks[i + 1];
      if (a.palabras && b.palabras && Number.isInteger(a.num) && a.num >= 1 && a.num <= 999 && Number.isInteger(b.num) && ((b.num % 5 === 0 && b.num >= 10 && b.num <= 95) || b.num === 99)) {
        toks.splice(i, 2, { raw: a.raw + ' ' + b.raw, n: String(a.num + b.num / 100), num: a.num + b.num / 100, coma: b.coma, palabras: true });
      }
    }
    return toks;
  }

  /* ---------------------------------------------------------------- Índice de categorías */
  const indiceCache = new WeakMap();
  function indice(cats) {
    if (indiceCache.has(cats)) return indiceCache.get(cats);
    const m = new Map();
    const poner = (frase, cat, peso) => {
      const k = U.norm(frase).trim();
      if (!k) return;
      const lista = m.get(k) || [];
      lista.push({ cat, peso });
      m.set(k, lista);
    };
    cats.forEach((c) => {
      (c.palabras || []).forEach((p) => poner(p, c, 2));
      (c.palabrasDebiles || []).forEach((p) => poner(p, c, 0.8));
      poner(c.nombre, c, 2.5);
    });
    indiceCache.set(cats, m);
    return m;
  }
  const singular = (w) => (w.length > 3 && w.endsWith('es') && !w.endsWith('ses') ? [w.slice(0, -2), w.slice(0, -1)] : w.length > 3 && w.endsWith('s') ? [w.slice(0, -1)] : []);

  // Busca la mejor categoría entre los tokens dados. usados = índices de token que sirvieron.
  function clasificar(palabras, idx, tipo, ctx) {
    const cats = ctx.categorias;
    const m = indice(cats);
    const mejor = { cat: null, score: 0, usados: [], aprendido: false };
    const dicc = ctx.dicc || {};
    for (let i = 0; i < palabras.length; i++) {
      for (let len = Math.min(4, palabras.length - i); len >= 1; len--) {
        const trozo = palabras.slice(i, i + len);
        const variantes = [trozo.join(' ')];
        const ult = trozo[len - 1];
        singular(ult).forEach((s) => variantes.push(trozo.slice(0, -1).concat(s).join(' ')));
        variantes.push(trozo.slice(0, -1).concat(ult + 's').join(' '));
        for (const fr of variantes) {
          // 1) lo aprendido de las correcciones del usuario gana siempre
          if (dicc[fr]) {
            const c = cats.find((x) => x.id === dicc[fr] && (!tipo || x.tipo === tipo));
            if (c) { const sc = 100 + len; if (sc > mejor.score) { mejor.cat = c; mejor.score = sc; mejor.usados = idx.slice(i, i + len); mejor.aprendido = true; } }
          }
          // 2) el diccionario de fábrica (palabras largas pesan más: "tanque de gas" gana a "tanque")
          const hits = m.get(fr);
          if (hits) {
            hits.forEach((h) => {
              if (tipo && h.cat.tipo !== tipo) return;
              const sc = h.peso * (len > 1 ? 1 + len * 0.6 : 1);
              if (sc > mejor.score) { mejor.cat = h.cat; mejor.score = sc; mejor.usados = idx.slice(i, i + len); mejor.aprendido = false; }
            });
          }
        }
      }
    }
    return mejor;
  }

  /* ------------------------------------------------------------------------- Fechas */
  // Devuelve { fecha, usados:[idx] }. Por defecto hoy.
  function leerFecha(toks, hoy) {
    const usados = [];
    const n = toks.map((t) => t.n);
    let fecha = hoy, hallada = false;
    for (let i = 0; i < n.length; i++) {
      if (n[i] === 'hoy') { usados.push(i); hallada = true; }
      else if (n[i] === 'ayer') { fecha = U.sumarDias(hoy, -1); usados.push(i); hallada = true; }
      else if (n[i] === 'anoche') { fecha = U.sumarDias(hoy, -1); usados.push(i); hallada = true; }
      else if (n[i] === 'anteayer' || n[i] === 'antier' || n[i] === 'antiayer') { fecha = U.sumarDias(hoy, -2); usados.push(i); hallada = true; }
      else if (n[i] === 'antes' && n[i + 1] === 'de' && n[i + 2] === 'ayer') { fecha = U.sumarDias(hoy, -2); usados.push(i, i + 1, i + 2); hallada = true; }
      else if (n[i] === 'hace' && toks[i + 1] && toks[i + 1].num != null && /^dias?$/.test(n[i + 2] || '')) { fecha = U.sumarDias(hoy, -toks[i + 1].num); usados.push(i, i + 1, i + 2); hallada = true; }
      else if (DIAS_N.includes(n[i]) && (n[i - 1] === 'el' || n[i - 1] === 'este' || n[i - 1] === 'del')) {
        // el último <día> que ya pasó (o hoy si coincide)
        const objetivo = DIAS_N.indexOf(n[i]);
        let f = hoy;
        for (let k = 0; k < 7; k++) { if (U.deISO(f).getDay() === objetivo) break; f = U.sumarDias(f, -1); }
        if (U.deISO(hoy).getDay() === objetivo && n[i - 1] !== 'este') f = hoy;
        fecha = f; usados.push(i - 1, i); hallada = true;
      } else if (toks[i].num != null && n[i + 1] === 'de' && MESES_N.includes(n[i + 2]) && Number.isInteger(toks[i].num) && toks[i].num >= 1 && toks[i].num <= 31) {
        const mes = MESES_N.indexOf(n[i + 2]) + 1;
        let anio = Number(hoy.slice(0, 4));
        let f = anio + '-' + U.pad(mes) + '-' + U.pad(toks[i].num);
        if (f > hoy) f = (anio - 1) + f.slice(4);
        fecha = f; usados.push(i, i + 1, i + 2); if (n[i - 1] === 'el') usados.push(i - 1); hallada = true;
      }
    }
    return { fecha, usados, hallada };
  }

  /* ------------------------------------------------------------------------ Periodos */
  function leerPeriodo(toks, hoy) {
    const n = toks.map((t) => t.n);
    const t = n.join(' ');
    const usados = [];
    const marca = (re) => { const m = t.match(re); return m; };
    let clave = null, desde, hasta, etiqueta;
    if (/\bhoy\b/.test(t)) { clave = 'hoy'; desde = hasta = hoy; etiqueta = 'hoy'; }
    else if (/\bayer\b/.test(t)) { clave = 'ayer'; desde = hasta = U.sumarDias(hoy, -1); etiqueta = 'ayer'; }
    else if (/semana pasada/.test(t)) { clave = 'semana_pasada'; desde = U.sumarDias(U.inicioSemana(hoy), -7); hasta = U.sumarDias(desde, 6); etiqueta = 'la semana pasada'; }
    else if (/\bsemana\b/.test(t)) { clave = 'semana'; desde = U.inicioSemana(hoy); hasta = hoy; etiqueta = 'esta semana'; }
    else if (/mes pasado|mes anterior|ultimo mes/.test(t)) { const a = U.sumarMeses(U.inicioMes(hoy), -1); clave = 'mes_pasado'; desde = a; hasta = U.finMes(a); etiqueta = 'el mes pasado'; }
    else if (/ano pasado|ano anterior/.test(t)) { const y = Number(hoy.slice(0, 4)) - 1; clave = 'anio_pasado'; desde = y + '-01-01'; hasta = y + '-12-31'; etiqueta = 'el año pasado'; }
    else if (/\b(este|en el|del) ano\b|\ben el ano\b|\bdel ano\b/.test(t)) { clave = 'anio'; desde = U.inicioAnio(hoy); hasta = hoy; etiqueta = 'este año'; }
    else if (/ultimos? (\d+) dias/.test(t)) { const k = Number(t.match(/ultimos? (\d+) dias/)[1]); clave = 'dias'; desde = U.sumarDias(hoy, -(k - 1)); hasta = hoy; etiqueta = 'los últimos ' + k + ' días'; }
    else if (/acumulado|en total|desde siempre|siempre|historico|todo/.test(t)) { clave = 'todo'; desde = '0000-01-01'; hasta = '9999-12-31'; etiqueta = 'en total'; }
    else {
      const mi = MESES_N.findIndex((mm) => new RegExp('\\b' + mm + '\\b').test(t));
      if (mi >= 0) {
        let y = Number(hoy.slice(0, 4)); if (mi + 1 > Number(hoy.slice(5, 7))) y -= 1;
        desde = y + '-' + U.pad(mi + 1) + '-01'; hasta = U.finMes(desde); clave = 'mes_nombre'; etiqueta = 'en ' + MESES_N[mi];
      } else { clave = 'mes'; desde = U.inicioMes(hoy); hasta = U.finMes(hoy); etiqueta = 'este mes'; }
    }
    n.forEach((w, i) => { if (/^(hoy|ayer|semana|mes|ano|pasada|pasado|este|esta|acumulado|total|ultimos|ultimo|dias)$/.test(w) || MESES_N.includes(w)) usados.push(i); });
    return { clave, desde, hasta, etiqueta, usados };
  }

  /* ---------------------------------------------------------------------- Intenciones */
  const tiene = (txt, re) => re.test(txt);

  function detectarCorreccion(toks, n, txt, ctx) {
    const primeras = n.slice(0, 3);
    const abre = primeras.some((w) => V_CORREGIR.has(w)) || /^(no era|era un|era una|es un|es una|fue un|fue una)\b/.test(txt) || /^deshaz/.test(txt)
      || /^(no,? )?(era|eran|fue|fueron)\b/.test(txt) || /^(el|la) (ultimo|ultima|anterior)\b(?! (mes|ano|semana|dia))/.test(txt) || /^(ese|esa|eso)\b/.test(txt) || /^me equivoque\b/.test(txt);
    if (!abre) return null;
    // "pon" también aparece en "ponme un límite": eso es presupuesto
    if (/\b(limite|presupuesto|tope)\b/.test(txt)) return null;
    // "mejor" solo cuenta si pide cambiar algo
    if (n[0] === 'mejor' && !/\b(a|en|como)\b/.test(txt)) return null;
    const accion = {};
    if (n.some((w) => V_BORRAR.has(w))) accion.accion = 'borrar';
    else if (/\bdesha[cz]/.test(txt) || /vuelve atras|deja como estaba/.test(txt)) accion.accion = 'deshacer';
    else {
      const cant = toks.find((t) => t.num != null);
      const quiereTipoIngreso = /\b(ingreso|ganancia)\b/.test(txt) && !/\bgasto\b/.test(txt.replace(/era (un )?gasto/, ''));
      const quiereTipoGasto = /\bgasto\b/.test(txt) && !/\bingreso\b/.test(txt);
      if (/\bnecesari[oa]\b/.test(txt)) { accion.accion = 'necesidad'; accion.nec = 'N'; }
      else if (/\b(gusto|capricho|lujo)\b/.test(txt)) { accion.accion = 'necesidad'; accion.nec = 'G'; }
      else if (cant && !/\b(a|en|de|como|era)\s+(la |el )?(salud|comida|transporte)/.test(txt) && cant.num != null && /\b(monto|valor|precio|a|por|eran|fue|fueron|era)\b/.test(txt) && !tieneCategoriaPalabra(n, ctx)) {
        accion.accion = 'monto'; accion.monto = cant.num;
      } else {
        // ¿cambia de categoría?
        const rest = n.filter((w) => !V_CORREGIR.has(w) && !PARADA.has(w) && !/^(ultimo|ultima|anterior|gasto|ingreso|movimiento|registro|categoria|lo|eso|esto)$/.test(w));
        const c = clasificar(rest, rest.map((_, i) => i), null, ctx);
        if (c.cat) { accion.accion = 'categoria'; accion.cat = c.cat.id; accion.catNombre = c.cat.nombre; }
        else if (quiereTipoIngreso) { accion.accion = 'tipo'; accion.nuevoTipo = 'ingreso'; }
        else if (quiereTipoGasto) { accion.accion = 'tipo'; accion.nuevoTipo = 'gasto'; }
        else if (cant) { accion.accion = 'monto'; accion.monto = cant.num; }
        else { accion.accion = 'desconocida'; }
      }
    }
    // ¿a cuál movimiento se refiere? por defecto, el último
    const objetivo = { cual: 'ultimo' };
    const dicho = n.filter((w) => !V_CORREGIR.has(w) && !PARADA.has(w) && !/^(ultimo|ultima|anterior|gasto|ingreso|movimiento|registro|categoria|lo|eso|esto|a|en|como|era|monto|valor|precio)$/.test(w) && !/^\d/.test(w));
    if (accion.accion === 'borrar' || accion.accion === 'monto' || accion.accion === 'necesidad' || accion.accion === 'tipo') {
      const c = clasificar(dicho, dicho.map((_, i) => i), null, ctx);
      if (c.cat) objetivo.cat = c.cat.id;
    }
    return Object.assign({ tipo: 'corregir', objetivo }, accion);
  }
  function tieneCategoriaPalabra(n, ctx) {
    const rest = n.filter((w) => !V_CORREGIR.has(w) && !PARADA.has(w));
    return !!clasificar(rest, rest.map((_, i) => i), null, ctx).cat;
  }

  function detectarPresupuesto(toks, n, txt, ctx) {
    if (!/\b(limite|presupuesto|tope)\b/.test(txt)) return null;
    if (/^(cuanto|cual|dime|como|que)\b/.test(txt)) return null;
    const cant = toks.find((t) => t.num != null);
    if (!cant) return { tipo: 'presupuesto', monto: null, cat: null };
    const rest = n.filter((w, i) => !PARADA.has(w) && !/^(limite|presupuesto|tope|ponme|pon|ponle|pone|crea|crear|quiero|un|de|mensual|mes|al|general|total)$/.test(w) && toks[i].num == null);
    const c = clasificar(rest, rest.map((_, i) => i), 'gasto', ctx);
    return { tipo: 'presupuesto', monto: cant.num, cat: c.cat ? c.cat.id : null, catNombre: c.cat ? c.cat.nombre : null, periodo: 'mes' };
  }

  function detectarInforme(n, txt) {
    if (!/\b(informe|reporte|pdf|exporta|exportar|exportame|imprime)\b/.test(txt)) return null;
    if (/^(cuanto|dime)\b/.test(txt)) return null;
    return { tipo: 'informe', formato: /\bpdf\b/.test(txt) ? 'pdf' : /\b(excel|xlsx)\b/.test(txt) ? 'excel' : /\bcsv\b/.test(txt) ? 'csv' : 'pantalla' };
  }

  function detectarPregunta(toks, n, txt, ctx) {
    const abre = OPENER_PREGUNTA.has(n[0]) || (n[0] === 'en' && n[1] === 'que') || /^(como voy|como estoy|como me va|a cuanto|me queda|me alcanza|me conviene|que tal)/.test(txt) || /^(por favor |oye |dime |asistente )+(cuanto|cual|como|en que)/.test(txt);
    const signo = /\?\s*$/.test(txt) || /^[¿]/.test(txt);
    if (!abre && !signo) return null;
    // "puedo", "hay", "tengo", "que" solo abren pregunta si no hay verbo de registro
    const hayVerbo = n.some((w) => V_GASTO.has(w) || V_INGRESO.has(w));
    if (hayVerbo && toks.some((t) => t.num != null) && !/^(cuanto|cuantos|cuanta|cuantas|dime|muestrame|desglosame)/.test(n[0])) return null;
    if (hayVerbo && /^que\b/.test(txt) && !/\?/.test(txt)) return null;

    const per = leerPeriodo(toks, ctx.hoy);
    const cant = toks.find((t) => t.num != null);
    const q = { tipo: 'preguntar', tema: 'balance', periodo: per, texto: txt };
    // tema
    if (/\b(puedo gastar|puedes gastar|me queda|cuanto me queda|disponible|me alcanza para hoy|libre)\b/.test(txt)) q.tema = 'disponible';
    else if (/\b(me conviene|conviene comprar|vale la pena)\b/.test(txt) || (/\b(me alcanza|puedo comprar|podria comprar|puedo pagar)\b/.test(txt) && cant)) { q.tema = 'meconviene'; q.monto = cant ? cant.num : null; }
    else if (/\b(tarjeta|tarjetas|visa|mastercard|diners|amex)\b/.test(txt) && /\b(debo|deber|pagar|pago|cuota|cuotas|corte|vence|vencimiento|saldo|cupo|intereses|minimo)\b/.test(txt)) {
      q.tema = 'tarjeta';
      q.tarjetaId = tarjetaDeTexto(n, ctx);
      q.cuando = /\b(cuando|fecha|vence|vencimiento|corte)\b/.test(txt);
    }
    else if (/\b(en que gasto mas|que gasto mas|donde gasto mas|mayor gasto|gasto mas)\b/.test(txt)) q.tema = 'masgasto';
    else if (/\bhormiga\b/.test(txt)) q.tema = 'hormiga';
    else if (/\b(ahorr)/.test(txt)) q.tema = 'ahorro';
    else if (/\b(necesari|gusto|vanidad|capricho)/.test(txt)) q.tema = 'necesario_gusto';
    else if (/\b(ingres\w*|gane|ganado|ganancias?|cobre|cobrado|sueldo|recibi|recibido)\b/.test(txt) && !/\b(gast|desglos)\b/.test(txt)) q.tema = 'ingresos';
    else if (/\b(gast|desglos|compre|pague|salio|salieron|egreso)/.test(txt)) {
      q.tema = /desglos|detall|por categoria|en que/.test(txt) ? 'desglose' : 'gastos';
      const rest = n.filter((w, i) => !PARADA.has(w) && toks[i].num == null && !per.usados.includes(i) && !/^(cuanto|cuantos|he|has|hemos|gastado|gaste|gasto|gastos|desglosame|desglosa|dime|muestrame|mis|mi|lo|total|en|por|categoria|categorias)$/.test(w));
      const c = clasificar(rest, rest.map((_, i) => i), 'gasto', ctx);
      if (c.cat) { q.cat = c.cat.id; q.catNombre = c.cat.nombre; q.tema = 'gastos'; }
    }
    else if (/\b(como voy|como estoy|resumen|resumeme|balance|como me va)\b/.test(txt)) q.tema = 'balance';
    else q.tema = 'balance';
    return q;
  }

  function tarjetaDeTexto(n, ctx) {
    const tarjetas = ctx.tarjetas || [];
    let mejor = null, sc = 0;
    tarjetas.forEach((t) => {
      const pal = U.norm([t.nombre, t.banco, t.red, t.nivel].filter(Boolean).join(' ')).split(/\s+/).filter((w) => w && !PARADA.has(w) && !/^(tarjeta|banco|credito|de|del|la)$/.test(w));
      const hit = pal.filter((w) => n.includes(w)).length;
      if (hit > sc) { sc = hit; mejor = t.id; }
    });
    return mejor;
  }

  /* ------------------------------------------------------------------- Registrar */
  function interpretarRegistro(toks, n, txt, ctx) {
    const hoy = ctx.hoy;
    const roles = new Array(toks.length).fill('');
    const consumidos = new Set();
    const marcar = (idxs, rol) => idxs.forEach((i) => { if (i >= 0 && i < toks.length) { consumidos.add(i); if (rol) roles[i] = rol; } });

    /* ---- fecha */
    const f = leerFecha(toks, hoy);
    marcar(f.usados, 'otro');

    /* ---- tarjeta y forma de pago */
    const credito = { modo: null, meses: null, cuota: null, interes: null };
    let usaTarjeta = false, efectivoExplicito = false;
    n.forEach((w, i) => {
      if (/^(tarjeta|tarjetas|visa|mastercard|master|diners|amex|american)$/.test(w)) { usaTarjeta = true; marcar([i], 'otro'); }
      if (/^(credito)$/.test(w) && n[i - 1] !== 'del' && n[i - 1] !== 'de') { usaTarjeta = true; }
      if (/^(efectivo|cash)$/.test(w)) { efectivoExplicito = true; marcar([i], 'otro'); }
      if (/^(debito)$/.test(w)) { efectivoExplicito = true; marcar([i], 'otro'); }
      if (/^(corriente|contado)$/.test(w)) { credito.modo = 'corriente'; usaTarjeta = true; marcar([i], 'otro'); }
      if (/^(rotativo|rotativa)$/.test(w)) { credito.modo = 'rotativo'; usaTarjeta = true; marcar([i], 'otro'); }
      if (/^(diferido|diferida|diferi|diferir|diferidos)$/.test(w)) { credito.modo = 'diferido'; usaTarjeta = true; marcar([i], 'otro'); }
      if ((w === 'sin' && /^intereses?$/.test(n[i + 1] || ''))) { credito.interes = false; marcar([i, i + 1], 'otro'); }
      if ((w === 'con' && /^intereses?$/.test(n[i + 1] || ''))) { credito.interes = true; marcar([i, i + 1], 'otro'); }
      if (w === 'a' && n[i + 1] === 'plazos') { credito.modo = 'diferido'; usaTarjeta = true; marcar([i, i + 1], 'otro'); }
    });
    for (let i = 0; i < toks.length; i++) {
      // cuotas de 49
      if (/^cuotas?$/.test(n[i])) {
        let j = i + 1;
        if (/^(mensual|mensuales|fijas?)$/.test(n[j] || '')) j++;
        if (n[j] === 'de') j++;
        if (toks[j] && toks[j].num != null && !/^(meses|mes)$/.test(n[j + 1] || '')) {
          credito.cuota = toks[j].num; credito.modo = credito.modo || 'diferido'; usaTarjeta = true;
          marcar([i, j], 'otro'); if (n[i + 1] === 'de' || /^(mensual|mensuales|fijas?)$/.test(n[i + 1] || '')) marcar([i + 1, j - 1 > i ? j - 1 : i + 1], 'otro');
          for (let k = i; k <= j; k++) marcar([k], 'otro');
          if (/^(mensual|mensuales)$/.test(n[j + 1] || '')) marcar([j + 1], 'otro');
        } else if (!credito.modo) { credito.modo = 'diferido'; usaTarjeta = true; marcar([i], 'otro'); }
        continue;
      }
      // a 6 meses / en 12 cuotas / 6 meses
      if (toks[i].num != null && /^(meses|mes|cuotas|pagos)$/.test(n[i + 1] || '') && Number.isInteger(toks[i].num) && toks[i].num >= 1 && toks[i].num <= 72) {
        credito.meses = toks[i].num; credito.modo = credito.modo || 'diferido'; usaTarjeta = true;
        marcar([i, i + 1], 'otro'); if (/^(a|en|por|de)$/.test(n[i - 1] || '')) marcar([i - 1], 'otro');
        if (n[i + 1] === 'meses' && n[i + 2] === 'sin' && /^intereses?$/.test(n[i + 3] || '')) { credito.interes = false; }
        continue;
      }
      // a un año / a 1 año
      if (/^(a|en)$/.test(n[i]) && /^(1|un|una)$/.test(n[i + 1] || '') && /^anos?$/.test(n[i + 2] || '')) { credito.meses = 12; credito.modo = credito.modo || 'diferido'; usaTarjeta = true; marcar([i, i + 1, i + 2], 'otro'); }
    }
    if (credito.modo === 'diferido' && credito.meses == null && credito.cuota == null) credito.meses = credito.meses; // pendiente: la app pregunta
    if (credito.modo === 'diferido' && credito.interes == null) credito.interes = null; // se decide con la tarjeta o se pregunta

    /* ---- tarjeta concreta */
    let tarjetaId = null, tarjetaDuda = false, sinTarjetas = false;
    if (usaTarjeta) {
      tarjetaId = tarjetaDeTexto(n, ctx);
      const ts = ctx.tarjetas || [];
      if (!tarjetaId) {
        if (ts.length === 1) tarjetaId = ts[0].id;
        else if (ts.length === 0) sinTarjetas = true;
        else tarjetaDuda = true;
      }
      if (!credito.modo) credito.modo = 'corriente';
    }

    /* ---- tipo (gasto / ingreso) */
    let tipo = null, verboIdx = [];
    FRASES_INGRESO.forEach((fr) => { const k = txt.indexOf(fr); if (k >= 0 && !tipo) tipo = 'ingreso'; });
    FRASES_GASTO.forEach((fr) => { const k = txt.indexOf(fr); if (k >= 0 && !tipo) tipo = 'gasto'; });
    for (let i = 0; i < n.length; i++) {
      const w = n[i];
      if (!tipo && V_INGRESO.has(w)) { tipo = 'ingreso'; verboIdx.push(i); }
      else if (!tipo && V_GASTO.has(w)) { tipo = 'gasto'; verboIdx.push(i); }
      else if (tipo === 'ingreso' && V_INGRESO.has(w)) verboIdx.push(i);
      else if (tipo === 'gasto' && V_GASTO.has(w)) verboIdx.push(i);
      if (w === 'saque' && /\bsueldo\b/.test(txt)) { tipo = 'ingreso'; verboIdx.push(i); }
    }
    // frases con "me" + verbo: marcar las dos palabras
    n.forEach((w, i) => { if (w === 'me' && toks[i + 1] && /^(pagaron|depositaron|llego|llegaron|entro|dieron|regalaron|transfirieron|abonaron|cobraron|costo|salio)$/.test(n[i + 1])) { verboIdx.push(i, i + 1); } });
    let tipoDuda = false;
    if (!tipo) {
      // sin verbo: ¿hay palabras de ingreso (sueldo, propina, venta)?
      const rest = n.filter((w, i) => !PARADA.has(w) && toks[i].num == null);
      const ci = clasificar(rest, rest.map((_, i) => i), 'ingreso', ctx);
      const cg = clasificar(rest, rest.map((_, i) => i), 'gasto', ctx);
      if (ci.cat && ci.score > (cg.score || 0)) tipo = 'ingreso';
      else { tipo = 'gasto'; if (n.includes('saque')) tipoDuda = true; }
    }
    marcar(verboIdx, 'tipo');

    /* ---- candidatos a monto */
    const hayMarca = (i) => (toks[i].n.startsWith('$') || toks[i].n.endsWith('$') || /(usd|dolares|dolar)$/.test(toks[i].n) || (n[i + 1] && MONEDAS.has(n[i + 1])) || (n[i - 1] && n[i - 1] === '$'));
    let cands = [];
    const CANTIDAD = /^(amigos|amigas|personas|persona|gente|ninos|ninas|companeros|invitados|veces|vez|horas|hora|dias|kilos|kilo|libras|libra|litros|litro|galones|galon|unidades|metros)$/;
    toks.forEach((t, i) => { if (t.num != null && !consumidos.has(i) && !/%$/.test(t.n) && !CANTIDAD.test(n[i + 1] || '')) cands.push(i); });
    const puntaje = (i) => {
      let s = 0;
      if (hayMarca(i)) s += 5;
      const ant = n[i - 1] || '';
      if (verboIdx.includes(i - 1)) s += 3;
      if (/^(en|por|de|a|con)$/.test(ant) && !hayMarca(i)) s += 1;
      const sig = n[i + 1];
      if (sig && !MONEDAS.has(sig) && !PARADA.has(sig) && !hayMarca(i) && toks[i].num <= 12 && Number.isInteger(toks[i].num)) s -= 4; // "2 pizzas": cantidad
      else if (sig && !MONEDAS.has(sig) && !PARADA.has(sig) && !hayMarca(i)) s -= 0.5;
      return s;
    };

    // ¿varias cosas en una frase? ("gasté 3 en salchipapa y 5 en pasaje")
    let segmentos = [{ desde: 0, hasta: toks.length - 1 }];
    if (cands.length > 1) {
      const cortes = [];
      let ok = true;
      for (let k = 0; k < cands.length - 1; k++) {
        const a = cands[k], b = cands[k + 1];
        let corte = -1;
        for (let i = b - 1; i > a; i--) { if (/^(y|e|ademas|tambien|luego|despues|mas)$/.test(n[i]) || toks[i].coma) { corte = toks[i].coma && !/^(y|e)$/.test(n[i]) ? i + 1 : i + 1; break; } }
        if (corte < 0) { ok = false; break; }
        cortes.push(corte);
      }
      if (ok) {
        const segs = [];
        let ini = 0;
        cortes.forEach((c) => { segs.push({ desde: ini, hasta: c - 1 }); ini = c; });
        segs.push({ desde: ini, hasta: toks.length - 1 });
        const cuenta = (s) => cands.filter((i) => i >= s.desde && i <= s.hasta).length;
        if (segs.every((s) => cuenta(s) === 1)) segmentos = segs;
      }
    }

    const items = [];
    const nuevos = [];
    segmentos.forEach((sg, si) => {
      const mios = cands.filter((i) => i >= sg.desde && i <= sg.hasta);
      if (!mios.length) return;
      let elegido = mios[0], mejorS = -99;
      mios.forEach((i) => { const s = puntaje(i); if (s > mejorS || (s === mejorS && i > elegido)) { mejorS = s; elegido = i; } });
      marcar([elegido], 'monto');
      // palabra de moneda pegada al monto
      if (n[elegido + 1] && MONEDAS.has(n[elegido + 1])) marcar([elegido + 1], 'monto');
      if (n[elegido - 1] === '$') marcar([elegido - 1], 'monto');

      // concepto = tokens del segmento que no son verbo/monto/fecha/tarjeta/palabras de relleno
      const idx = [];
      for (let i = sg.desde; i <= sg.hasta; i++) {
        if (roles[i] === 'tipo' || roles[i] === 'monto' || roles[i] === 'otro') continue;
        if (consumidos.has(i) && roles[i] !== 'cat') continue;
        idx.push(i);
      }
      const palabras = idx.map((i) => n[i]).filter((w, k) => true);
      // el tipo del segmento: hereda del primero salvo que tenga verbo propio
      let tipoItem = tipo;
      if (si > 0) {
        const vp = n.slice(sg.desde, sg.hasta + 1).findIndex((w) => V_INGRESO.has(w) || w === 'gane');
        const vg = n.slice(sg.desde, sg.hasta + 1).findIndex((w) => V_GASTO.has(w));
        if (vp >= 0) tipoItem = 'ingreso'; else if (vg >= 0) tipoItem = 'gasto';
      }
      const c = clasificar(palabras, idx, tipoItem, ctx);
      let catId = null, conf = 'ninguna';
      if (c.cat) {
        catId = c.cat.id;
        conf = c.aprendido || c.score >= 2 ? 'alta' : 'media';
        marcar(c.usados, 'cat');
      } else if (tipoItem === 'ingreso') {
        catId = 'extra'; conf = 'media';
      } else { catId = 'otros'; conf = 'ninguna'; }
      // texto libre del concepto (sin palabras de relleno)
      const contenido = idx.filter((i) => roles[i] !== 'cat' || true).filter((i) => !PARADA.has(n[i]) && toks[i].num == null).map((i) => toks[i].raw.replace(/[?!.,;:]+$/, ''));
      let desc = contenido.join(' ').trim();
      let palabraNueva = null;
      if (conf === 'ninguna' && contenido.length) {
        palabraNueva = U.norm(contenido[contenido.length - 1]);
        if (contenido.length > 1 && contenido.length <= 3) palabraNueva = U.norm(contenido.join(' '));
        nuevos.push(palabraNueva);
      }
      const cat = (ctx.categorias.find((x) => x.id === catId)) || null;
      items.push({
        tipo: tipoItem, monto: toks[elegido].num, cat: catId, catNombre: cat ? cat.nombre : null, catIcono: cat ? cat.icono : null,
        catConfianza: conf, desc: desc ? U.cap(desc) : '', fecha: f.fecha, nec: cat ? cat.nec : null, palabraNueva,
        cuenta: tipoItem === 'gasto' && usaTarjeta && !efectivoExplicito ? 'tarjeta' : 'efectivo',
      });
    });

    if (!items.length) {
      // hay verbo pero ningún monto
      return { tipo: 'registrar', items: [], falta: 'monto', partes: partes(toks, roles), texto: txt };
    }
    if (items[0].cuenta === 'tarjeta') {
      items.forEach((it) => { if (it.cuenta === 'tarjeta') Object.assign(it, { tarjetaId, credito: Object.assign({}, credito) }); });
    }
    const dudas = [];
    if (items.some((it) => it.catConfianza === 'ninguna')) dudas.push('categoria');
    if (tarjetaDuda) dudas.push('tarjeta');
    if (tipoDuda) dudas.push('tipo');
    if (credito.modo === 'diferido' && credito.meses == null && credito.cuota == null) dudas.push('meses');
    return { tipo: 'registrar', items, tarjetaDuda, sinTarjetas, dudas, partes: partes(toks, roles), texto: txt, fecha: f.fecha };
  }

  // Convierte tokens + roles en trozos para mostrar la frase anotada
  function partes(toks, roles) {
    const out = [];
    toks.forEach((t, i) => {
      const rol = roles[i] || '';
      const ult = out[out.length - 1];
      if (ult && ult.rol === rol && rol !== '') ult.texto += ' ' + t.raw;
      else out.push({ texto: t.raw, rol });
    });
    // une trozos sueltos consecutivos sin rol
    const res = [];
    out.forEach((p) => { const u = res[res.length - 1]; if (u && !u.rol && !p.rol) u.texto += ' ' + p.texto; else res.push(p); });
    return res;
  }

  /* ---------------------------------------------------------------------- Principal */
  function interpretar(texto, ctx) {
    ctx = Object.assign({ hoy: U.hoyISO(), categorias: AF.PLAN.categorias, dicc: {}, tarjetas: [] }, ctx || {});
    const crudo = String(texto || '').trim();
    if (!crudo) return { tipo: 'desconocido', texto: '' };
    const toks = tokenizar(crudo);
    const n = toks.map((t) => t.n);
    const txt = n.join(' ');
    if (/^(ayuda|que puedes hacer|como funciona|que haces)\b/.test(txt)) return { tipo: 'ayuda', texto: txt };

    const cor = detectarCorreccion(toks, n, txt, ctx);
    if (cor) return Object.assign(cor, { texto: txt, partes: partes(toks, new Array(toks.length).fill('')) });
    const pre = detectarPresupuesto(toks, n, txt, ctx);
    if (pre) return Object.assign(pre, { texto: txt });
    const inf = detectarInforme(n, txt);
    if (inf) return Object.assign(inf, { texto: txt, periodo: leerPeriodo(toks, ctx.hoy) });
    const preg = detectarPregunta(toks, n, txt, ctx);
    if (preg) return preg;

    const hayNumero = toks.some((t) => t.num != null);
    const hayVerbo = n.some((w) => V_GASTO.has(w) || V_INGRESO.has(w)) || FRASES_INGRESO.concat(FRASES_GASTO).some((fr) => txt.includes(fr));
    if (hayNumero || hayVerbo) return interpretarRegistro(toks, n, txt, ctx);
    return { tipo: 'desconocido', texto: txt, partes: partes(toks, new Array(toks.length).fill('')) };
  }

  AF.parser = { interpretar, tokenizar, clasificar, leerPeriodo, leerFecha };
  if (typeof module === 'object' && module.exports) module.exports = AF.parser;
})(typeof window !== 'undefined' ? window : globalThis);
