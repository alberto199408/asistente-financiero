/* ============================================================================
   PLAN — TODA la configuración de la app, en UN solo lugar y completa.
   Si algo se puede ajustar (nombre, precios, límites Gratis/Pro, días de prueba,
   límite de IA, categorías y sus palabras, avisos, bloqueo, SRI, países...),
   se cambia AQUÍ y en ningún otro archivo.

   Lo marcado "PROVISIONAL" son decisiones que Luis aún no ha dado.
   Lo marcado "LUIS" es un dato que solo Luis puede crear (no se inventa).
   ========================================================================== */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});

  const PLAN = {
    /* ---------------------------------------------------------------- APP */
    app: {
      nombre: 'Asistente Financiero',            // PROVISIONAL (nombre de trabajo)
      nombreCorto: 'Asistente',
      version: '4.1.2',
      // PROVISIONAL. Ojo: el id del paquete NO se puede cambiar después de publicar en Play.
      idPaquete: 'com.asistentefinanciero.app',
      desarrollador: '',                          // LUIS: nombre de desarrollador en Play (no su nombre personal)
      contacto: '',                               // LUIS: correo que se muestra en la página de privacidad (vacío = no se muestra)
      idioma: 'es',
      paisInicial: 'EC',
      monedaBase: 'USD',
      avisoLegal: 'Asistente Financiero no es asesoría financiera profesional. Los valores son estimados.',
    },

    /* --------------------------------------------------- WEB (instalar desde Chrome) */
    // La app se publica como página instalable (PWA) en GitHub Pages: UN enlace, sin cuenta de GitHub para quien la use.
    web: {
      usuarioGitHub: 'alberto199408',
      repositorio: 'asistente-financiero',       // la dirección queda https://<usuario>.github.io/<repositorio>/
      nombreCorto: 'Asistente',
    },

    /* ------------------------------------------------------- SESIÓN Y BLOQUEO */
    sesion: {
      proveedores: ['google', 'facebook'],        // botones de la primera pantalla, en este orden
      googleClientIdWeb: '656961163217-cqcuipskkmqb4nes7imit1b8cl4qgl80.apps.googleusercontent.com',   // ID de cliente "Web" (proyecto asistente-financiero en Google Cloud, creado el 11 nov). No es secreto; el «secreto del cliente» NO se usa ni se pega aquí
      googleAlcanceDrive: 'https://www.googleapis.com/auth/drive.appdata',   // solo para la copia en Drive (carpeta privada de la app)
      facebookAppId: '',                          // LUIS: ID de la app creada en developers.facebook.com
      facebookClientToken: '',                    // LUIS: "token de cliente" de esa misma app (no es una contraseña)
      permitirSinCuenta: true,                    // botón «Empezar sin cuenta» (datos solo en este teléfono). Ponlo en false si solo quieres Google y Facebook
      facebookPermisos: ['public_profile', 'email'],
      facebookVersion: 'v23.0',                   // versión de la API de Facebook para la web (solo la usa la versión instalada desde Chrome)
      // La copia en Google Drive solo existe si la persona entró con Google (Facebook no tiene Drive).
      // PIN: viene APAGADO. La persona lo activa en Más → Ajustes → Seguridad si quiere. Sin PIN nunca se pide clave.
      pinPorDefecto: false,
      bloquearTrasSegundos: 0,                    // con PIN activo: 0 = pide el PIN solo al abrir la app de nuevo (minimizarla no cuenta)
      pinMin: 4,
      pinMax: 6,
      intentosPinMax: 5,
      esperaTrasIntentosSeg: 60,
      pbkdf2Iteraciones: 150000,
      cerrarSesionBorraDatos: false,              // false = los datos quedan cifrados en el teléfono
    },

    /* ------------------------------------------------------------ BIENVENIDA */
    // Una sola pantalla después de entrar: cómo cobras y cuánto. El país sale del teléfono; el nombre, de la cuenta.
    bienvenida: {
      modosCobro: [                               // formas reales de cobrar
        { id: 'mensual', nombre: 'Una vez al mes' },
        { id: 'quincenal', nombre: 'Dos veces al mes' },
        { id: 'semanal', nombre: 'Cada semana' },
        { id: 'variable', nombre: 'Sin día fijo' },
      ],
      sueldoOpcional: true,
    },

    /* ------------------------------------------------------------------ VOZ */
    voz: {
      hablarPorDefecto: false,                    // la app NO habla en voz alta salvo que la persona lo encienda en Ajustes
      silencioSeg: 2.5,                           // tras este silencio después de la última palabra, termina sola y muestra «Esto entendí»
      esperaInicialSeg: 12,                       // cuánto espera a que la persona empiece a hablar antes de decir «no te escuché»
      maximoSeg: 60,                              // tope de una sola grabación
    },

    /* --------------------------------------------------------------- PAÍSES */
    // palabraCuotas: la palabra que usa la gente de cada lugar (también para la ficha de Play).
    paises: [
      { codigo: 'EC', idioma: 'es-EC',  nombre: 'Ecuador',            moneda: 'USD', palabraCuotas: 'diferido',            sri: true  },
      { codigo: 'CO', idioma: 'es-CO',  nombre: 'Colombia',           moneda: 'COP', palabraCuotas: 'cuotas',              sri: false },
      { codigo: 'PE', idioma: 'es-PE',  nombre: 'Perú',               moneda: 'PEN', palabraCuotas: 'cuotas',              sri: false },
      { codigo: 'MX', idioma: 'es-MX',  nombre: 'México',             moneda: 'MXN', palabraCuotas: 'meses sin intereses', sri: false },
      { codigo: 'AR', idioma: 'es-AR',  nombre: 'Argentina',          moneda: 'ARS', palabraCuotas: 'cuotas',              sri: false },
      { codigo: 'CL', idioma: 'es-CL',  nombre: 'Chile',              moneda: 'CLP', palabraCuotas: 'cuotas',              sri: false },
      { codigo: 'VE', idioma: 'es-VE',  nombre: 'Venezuela',          moneda: 'VES', palabraCuotas: 'cuotas',              sri: false },
      { codigo: 'BO', idioma: 'es-BO',  nombre: 'Bolivia',            moneda: 'BOB', palabraCuotas: 'cuotas',              sri: false },
      { codigo: 'PY', idioma: 'es-PY',  nombre: 'Paraguay',           moneda: 'PYG', palabraCuotas: 'cuotas',              sri: false },
      { codigo: 'UY', idioma: 'es-UY',  nombre: 'Uruguay',            moneda: 'UYU', palabraCuotas: 'cuotas',              sri: false },
      { codigo: 'GT', idioma: 'es-GT',  nombre: 'Guatemala',          moneda: 'GTQ', palabraCuotas: 'cuotas',              sri: false },
      { codigo: 'HN', idioma: 'es-HN',  nombre: 'Honduras',           moneda: 'HNL', palabraCuotas: 'cuotas',              sri: false },
      { codigo: 'SV', idioma: 'es-SV',  nombre: 'El Salvador',        moneda: 'USD', palabraCuotas: 'cuotas',              sri: false },
      { codigo: 'NI', idioma: 'es-NI',  nombre: 'Nicaragua',          moneda: 'NIO', palabraCuotas: 'cuotas',              sri: false },
      { codigo: 'CR', idioma: 'es-CR',  nombre: 'Costa Rica',         moneda: 'CRC', palabraCuotas: 'cuotas',              sri: false },
      { codigo: 'PA', idioma: 'es-PA',  nombre: 'Panamá',             moneda: 'USD', palabraCuotas: 'cuotas',              sri: false },
      { codigo: 'CU', idioma: 'es-CU',  nombre: 'Cuba',               moneda: 'CUP', palabraCuotas: 'cuotas',              sri: false },
      { codigo: 'DO', idioma: 'es-DO',  nombre: 'República Dominicana', moneda: 'DOP', palabraCuotas: 'cuotas',            sri: false },
      { codigo: 'PR', idioma: 'es-PR',  nombre: 'Puerto Rico',        moneda: 'USD', palabraCuotas: 'cuotas',              sri: false },
      { codigo: 'BR', idioma: 'pt-BR',  nombre: 'Brasil',             moneda: 'BRL', palabraCuotas: 'parcelas',            sri: false },
      { codigo: 'ES', idioma: 'es-ES',  nombre: 'España',             moneda: 'EUR', palabraCuotas: 'a plazos',            sri: false },
      { codigo: 'US', idioma: 'es-US',  nombre: 'EE. UU.',            moneda: 'USD', palabraCuotas: 'installments',        sri: false },
      { codigo: 'XX', idioma: 'es-419', nombre: 'Otro país',          moneda: 'USD', palabraCuotas: 'cuotas',              sri: false },
    ],
    monedas: {
      USD: { simbolo: '$',   nombre: 'Dólar (USD)',          decimales: 2 },
      EUR: { simbolo: '€',   nombre: 'Euro (EUR)',           decimales: 2 },
      MXN: { simbolo: '$',   nombre: 'Peso mexicano (MXN)',  decimales: 2 },
      COP: { simbolo: '$',   nombre: 'Peso colombiano (COP)', decimales: 2 },
      PEN: { simbolo: 'S/',  nombre: 'Sol peruano (PEN)',    decimales: 2 },
      ARS: { simbolo: '$',   nombre: 'Peso argentino (ARS)', decimales: 2 },
      CLP: { simbolo: '$',   nombre: 'Peso chileno (CLP)',   decimales: 0 },
      VES: { simbolo: 'Bs.', nombre: 'Bolívar (VES)',        decimales: 2 },
      BOB: { simbolo: 'Bs.', nombre: 'Boliviano (BOB)',      decimales: 2 },
      PYG: { simbolo: '₲',   nombre: 'Guaraní (PYG)',        decimales: 0 },
      UYU: { simbolo: '$',   nombre: 'Peso uruguayo (UYU)',  decimales: 2 },
      GTQ: { simbolo: 'Q',   nombre: 'Quetzal (GTQ)',        decimales: 2 },
      HNL: { simbolo: 'L',   nombre: 'Lempira (HNL)',        decimales: 2 },
      NIO: { simbolo: 'C$',  nombre: 'Córdoba (NIO)',        decimales: 2 },
      CRC: { simbolo: '₡',   nombre: 'Colón (CRC)',          decimales: 2 },
      CUP: { simbolo: '$',   nombre: 'Peso cubano (CUP)',    decimales: 2 },
      DOP: { simbolo: 'RD$', nombre: 'Peso dominicano (DOP)', decimales: 2 },
      BRL: { simbolo: 'R$',  nombre: 'Real brasileño (BRL)', decimales: 2 },
    },

    /* ------------------------------------------------------ PRUEBA Y PRECIOS */
    prueba: { iniciaAlCrearCuenta: true, diasProGratis: 7 },   // PROVISIONAL: 7 días (3 no alcanzan para ver el valor)
    precios: {                                    // PROVISIONAL (a decidir con Luis)
      mensualUSD: 2.99,
      anualUSD: 19.99,
      productosPlay: { mensual: 'pro_mensual', anual: 'pro_anual' },
      invitarAmigoMesesPro: 1,
    },
    // Lo que ve la gente en la pantalla «Gratis y Pro»: pocas cosas, claras. (La tabla `funciones` de abajo es la que manda en el código.)
    pro: {
      gratis: [
        'Registrar gastos e ingresos sin límite, hablando o escribiendo',
        'Cuánto te queda hasta tu cobro, siempre a la vista',
        'Movimientos por día, semana, mes y año, con filtros y categorías',
        'Una tarjeta de crédito con su fecha de pago',
        'Preguntas comunes: «¿cuánto gasté en comida este mes?»',
        'Aviso de gastos innecesarios del mes',
        'Copia de seguridad en tu Google Drive',
      ],
      // Versión corta de la lista de arriba, para la tarjeta «Gratis» de la pantalla Pro (cabe en media pantalla)
      gratisCorto: ['Gastos e ingresos sin límite', 'Cuánto te queda hasta tu cobro', 'Movimientos con filtros', '1 tarjeta de crédito', 'Preguntas comunes', 'Copia en tu Google Drive'],
      pro: [
        { titulo: 'Asistente inteligente', texto: 'Entiende cualquier frase y responde cualquier pregunta sobre tu plata.' },
        { titulo: 'Tarjetas sin límite', texto: 'Cuotas, intereses, «¿pago el mínimo o el total?» y avisos de corte y pago.' },
        { titulo: 'Detector de compras compulsivas', texto: 'Suscripciones que no usas, antojos repetidos y consejos para bajarlos.' },
        { titulo: '«¿Me conviene esta compra?»', texto: 'Antes de comprar, te dice si te alcanza sin descuadrar el mes.' },
        { titulo: 'Resumen del año y libro contable', texto: 'Compara meses, exporta a PDF y Excel.' },
        { titulo: 'Gastos deducibles (SRI)', texto: 'Solo Ecuador: marca lo deducible y calcula la rebaja.' },
        { titulo: 'Pareja o familia', texto: 'Gastos compartidos: quién pagó y quién debe.' },
      ],
    },

    /* ----------------------------------------------------------------- IA */
    ia: {
      urlWorker: '',                              // LUIS: URL del Worker propio de esta app (Cloudflare)
      limiteMensualConsultas: 60,                 // PROVISIONAL (solo Pro)
      tiempoMaxMs: 12000,
      modelo: 'claude-haiku-5-5',                 // el Worker lo toma de aquí al publicarse; la clave vive SOLO en el Worker
      limiteDiarioApp: 500,                       // PROVISIONAL: tope de consultas por día de TODA la app (protege tu factura)
    },

    /* ------------------------------------------- LÍMITES Y FUNCIONES: GRATIS vs PRO */
    // Números = cuántos se permiten. Infinity = sin límite.
    limites: {
      gratis: { tarjetas: 1, presupuestos: 1, metas: 1, pagosFijos: 3, prestamos: 3, categoriasPropias: 0, monedas: 1 },
      pro:    { tarjetas: Infinity, presupuestos: Infinity, metas: Infinity, pagosFijos: Infinity,
                prestamos: Infinity, categoriasPropias: Infinity, monedas: Infinity },
    },
    // g = Gratis, p = Pro. Una sola tabla: lo que cuesta (IA, servidor) va en Pro.
    // La seguridad y los datos del usuario nunca se cobran.
    funciones: {
      dictar:                  { g: true,  p: true  },
      entenderFraseLibreIA:    { g: false, p: true  },
      mostrarAntesDeGuardar:   { g: true,  p: true  },
      corregirComun:           { g: true,  p: true  },
      corregirLibreIA:         { g: false, p: true  },
      preguntasComunes:        { g: true,  p: true  },
      preguntasLibresIA:       { g: false, p: true  },
      respuestaEnVoz:          { g: true,  p: true  },
      puedesGastarHoySimple:   { g: true,  p: true  },
      puedesGastarHoyCompleto: { g: true,  p: true  },   // la cifra «te queda hasta tu cobro» es la misma para todos (es el corazón de la app)
      categoriasNecesarioGusto:{ g: true,  p: true  },
      innecesariosTotal:       { g: true,  p: true  },   // «Gastos innecesarios del mes» con su total: para todos
      innecesariosDetalle:     { g: false, p: true  },   // detector de compras compulsivas, suscripciones y consejos
      hormigaTotal:            { g: true,  p: true  },
      hormigaDetalle:          { g: false, p: true  },
      movimientosPorPeriodo:   { g: true,  p: true  },   // día / semana / mes / año y filtros
      libroContable:           { g: true,  p: true  },   // la vista de libro contable se ve; exportarla a PDF/Excel es Pro (abajo)
      retos:                   { g: true,  p: true  },
      presupuestoGeneral:      { g: true,  p: true  },
      presupuestoPorCategoria: { g: false, p: true  },
      tarjetaCorriente:        { g: true,  p: true  },
      tarjetaDiferidoCuotas:   { g: false, p: true  },
      asesorTarjeta:           { g: false, p: true  },
      meConviene:              { g: false, p: true  },
      simulador:               { g: false, p: true  },
      alertasBasicas:          { g: true,  p: true  },
      alertasPredictivas:      { g: false, p: true  },
      sri:                     { g: false, p: true  },
      fotoFacturaTotal:        { g: true,  p: true  },
      fotoFacturaProductos:    { g: false, p: true  },
      compartirTexto:          { g: true,  p: true  },
      compartirCaptura:        { g: false, p: true  },
      importarSimple:          { g: true,  p: true  },
      importarPDF:             { g: false, p: true  },
      conciliar:               { g: false, p: true  },
      suscripcionesDetectadas: { g: false, p: true  },
      cobroPorWhatsApp:        { g: false, p: true  },
      parejaFamilia:           { g: false, p: true  },
      resumenMes:              { g: true,  p: true  },
      resumenAnualAcumulado:   { g: false, p: true  },
      compararMeses:           { g: false, p: true  },
      pdfMensualBasico:        { g: false, p: true  },   // decisión pendiente: "sí" gratis => poner g: true
      pdfProfesional:          { g: false, p: true  },
      exportarCSV:             { g: true,  p: true  },
      exportarExcel:           { g: false, p: true  },
      compartirResumen:        { g: true,  p: true  },
      variasMonedasViajes:     { g: false, p: true  },
      bloqueoHuellaPin:        { g: true,  p: true  },
      cifrado:                 { g: true,  p: true  },
      planCobro:               { g: true,  p: true  },   // «Plan de tu cobro»: lo que ya se va y lo que queda libre
      ahorroAutomaticoCobro:   { g: true,  p: true  },   // apartar un % de tu cobro para una meta
      ahorroRedondeo:          { g: false, p: true  },   // redondear cada compra y mandar la diferencia a una meta
      fondoEmergencia:         { g: true,  p: true  },   // plantilla de 3 a 6 meses de tus gastos necesarios (cuenta como tu meta gratis)
      planDeudas:              { g: false, p: true  },   // qué tarjeta pagar primero (avalancha o bola de nieve) y cuánto tardas
      historialDeshacer:       { g: true,  p: true  },
      copiaDrive:              { g: true,  p: true  },
    },
    // Una línea que explica cada función Pro (insignia + pantalla de comparación).
    explicacionPro: {
      tarjetaDiferidoCuotas: 'Diferidos y cuotas con su cuota mensual y cuánto pagas de intereses.',
      asesorTarjeta: 'Te dice si conviene pagar el mínimo o el total y te avisa corte y pago.',
      ahorroRedondeo: 'Redondea cada compra al siguiente dólar y manda la diferencia a tu meta, sin que lo sientas.',
      planDeudas: 'Te dice qué tarjeta pagar primero y en cuántos meses terminas, ahorrando intereses.',
      meConviene: 'Antes de comprar, te dice si te alcanza sin descuadrar el mes.',
      simulador: 'Prueba «¿qué pasa si…?» sin tocar tus datos reales.',
      sri: 'Marca tus gastos deducibles y calcula la rebaja aproximada.',
      parejaFamilia: 'Gastos compartidos: quién pagó y quién debe.',
      pdfProfesional: 'Informe PDF completo para guardar o compartir.',
      resumenAnualAcumulado: 'Ve el año completo y compara meses.',
    },

    /* ------------------------------------------------------------ CATEGORÍAS */
    // nec: 'N' necesario, 'G' gusto, null = sin clasificar.  hormiga: candidata a gasto hormiga.
    // sri: rubro del formulario de gastos personales (solo Ecuador).  palabras: SIN tildes, minúsculas, de TODOS los países.
    // Las palabras de varias palabras ganan a las de una sola ("tanque de gas" > "tanque").
    // montoMax: monto típico máximo de UNA compra de esa categoría. Si lo dictado lo pasa por mucho (una hamburguesa de $350),
    //           la app pregunta «¿$3,50 o $350?» antes de guardar.
    // pregunta: lo que la app pregunta UNA vez cuando la palabra es ambigua (y se acuerda de la respuesta).
    categorias: [
      // ---- Gastos
      { id: 'comida_hogar', color: '#22C55E', nombre: 'Comida del hogar', icono: '🛒', tipo: 'gasto', nec: 'N', sri: 'alimentacion', montoMax: 600,
        palabras: ['tuti', 'pronaca', 'superpako', 'maximercado', 'hipermarket', 'fruteria', 'maiz', 'choclo', 'choclos', 'mazorca', 'mazorcas', 
          // dónde se compra
          'mercado', 'supermercado', 'super', 'supermaxi', 'megamaxi', 'comisariato', 'mi comisariato', 'tia', 'santa maria', 'gran aki', 'aki', 'coral',
          'tienda', 'tiendita', 'tienda de la esquina', 'abarrotes', 'abasto', 'bodega', 'colmado', 'pulperia', 'minimarket', 'minimercado', 'despensa', 'viveres', 'granos',
          'compras de la casa', 'compras del mes', 'compra del mes', 'compras de la semana', 'comida para la casa', 'comida para el hogar', 'comida de la casa', 'comida del hogar',
          'para la casa', 'para el hogar', 'para mi casa', 'para mi hogar', 'comida para mi hogar', 'comida para mi casa', 'hogar', 'mandado', 'mandados', 'feria', 'plaza de mercado', 'mercado mayorista',
          'exito', 'jumbo', 'carulla', 'd1', 'ara', 'olimpica', 'wong', 'plaza vea', 'tottus', 'vivanda', 'mass', 'soriana', 'walmart', 'chedraui', 'bodega aurrera', 'la comer',
          'carrefour', 'coto', 'lider', 'unimarc', 'santa isabel', 'mercadona', 'lidl', 'hipercor', 'la sirena', 'bravo', 'pricesmart', 'makro', 'pali', 'maxi pali', 'super selectos', 'la torre', 'paiz',
          // ingredientes y cosas para cocinar
          'verduras', 'verdura', 'frutas', 'fruta', 'legumbres', 'hortalizas', 'carne', 'carnes', 'pollo', 'pescado', 'mariscos', 'camarones', 'huevos', 'leche', 'queso', 'mantequilla', 'yogur', 'yogurt',
          'arroz', 'frejol', 'frijol', 'frijoles', 'lenteja', 'lentejas', 'garbanzos', 'fideos', 'pasta', 'harina', 'avena', 'azucar', 'sal', 'aceite', 'manteca',
          'pan', 'panaderia', 'tortillas', 'arepas', 'papa', 'papas', 'cebolla', 'cebollas', 'tomate', 'tomates', 'zanahoria', 'zanahorias', 'platano', 'platanos', 'yuca',
          'ajo', 'pimiento', 'lechuga', 'brocoli', 'limon', 'limones', 'naranja', 'naranjas', 'manzana', 'manzanas', 'banano', 'bananos', 'guineo', 'sandia', 'papaya', 'aguacate', 'palta',
          'cafe molido', 'cafe en grano', 'cocoa', 'condimentos', 'especias', 'atun', 'sardina', 'enlatados', 'salsa', 'mayonesa', 'ketchup', 'mostaza', 'embutidos', 'jamon', 'salchichas', 'mortadela',
          'libras', 'libra', 'kilos', 'kilo', 'quintal', 'docena', 'funda', 'atado', 'racimo', 'cartón de huevos', 'carton de huevos', 'cubeta',
          // aseo y limpieza de la casa (van con la compra del súper)
          'papel higienico', 'jabon', 'detergente', 'cloro', 'desinfectante', 'panales', 'toallas humedas', 'escoba', 'trapeador', 'esponja', 'lavaplatos', 'limpieza', 'aseo'],
        palabrasDebiles: ['comida', 'compras', 'compra'] },
      { id: 'servicios', color: '#F59E0B', nombre: 'Servicios básicos', icono: '💡', tipo: 'gasto', nec: 'N', sri: null, montoMax: 500,
        palabras: ['electrica', 'emaap', 'emaapq', 'tvcable', 'eeq', 'telecom', 'saldo del celular', 'saldo celular', 'luz electrica', 'agua y luz', 'tv por cable', 'internet del hogar', 'luz', 'electricidad', 'energia', 'energia electrica', 'agua', 'agua potable', 'internet', 'telefono', 'telefono fijo', 'plan celular', 'plan del celular', 'recarga', 'recargas', 'recarga del celular', 'datos', 'megas', 'gas', 'tanque de gas', 'cilindro de gas', 'bombona', 'garrafa', 'balon de gas',
          'cnel', 'empresa electrica', 'planilla', 'planillas', 'administracion', 'cuota de administracion', 'condominio', 'cable', 'tv cable', 'television por cable', 'wifi', 'basura', 'recoleccion de basura',
          'movistar', 'tigo', 'entel', 'telcel', 'at t', 'wom', 'bitel', 'cnt', 'tuenti', 'digicel', 'kolbi', 'une', 'etb', 'epm', 'cfe', 'enel', 'edesur', 'edenor', 'luz del sur', 'sedapal', 'interagua', 'epmaps', 'codensa', 'emcali', 'naturgy', 'iberdrola', 'endesa', 'netlife', 'puntonet', 'xtrim', 'directv', 'izzi', 'totalplay', 'megacable', 'telmex'],
        palabrasDebiles: ['servicios', 'servicio', 'claro', 'personal'] },
      { id: 'vivienda', color: '#3D6FB6', nombre: 'Vivienda', icono: '🏠', tipo: 'gasto', nec: 'N', sri: 'vivienda', montoMax: 3000,
        palabras: ['alicuota', 'alicuotas', 'expensas', 'expensa', 'mantenimiento del edificio', 'cuota del departamento', 'cuota del credito hipotecario', 'gastos comunales', 'administracion del edificio', 'cuota de vivienda', 'arriendo', 'arrendamiento', 'alquiler', 'renta', 'renta de la casa', 'renta del departamento', 'hipoteca', 'cuota de la casa', 'credito hipotecario', 'predial', 'impuesto predial', 'contribuciones',
          'reparacion de la casa', 'arreglo de la casa', 'plomero', 'gasfitero', 'fontanero', 'electricista', 'albanil', 'pintura de la casa', 'cerrajero', 'garantia del departamento', 'deposito de garantia', 'portero', 'guardiania', 'seguridad del edificio'] },
      { id: 'transporte', color: '#06B6D4', nombre: 'Transporte', icono: '🚌', tipo: 'gasto', nec: 'N', sri: null, montoMax: 120,
        palabras: ['indriver', 'yango', 'movilizacion', 'la movilizacion', 'ruta', 'bus interprovincial', 'pasaje a', 'pasaje', 'pasajes', 'bus', 'buseta', 'colectivo', 'micro', 'combi', 'trufi', 'guagua', 'camion', 'pesero', 'taxi', 'mototaxi', 'uber', 'cabify', 'indrive', 'in drive', 'didi', 'beat', 'bolt', 'carrera', 'carrerita', 'viaje en taxi',
          'metro', 'subte', 'trolebus', 'ecovia', 'metrovia', 'transmilenio', 'metrobus', 'tren', 'peaje', 'peajes', 'parqueadero', 'parqueo', 'estacionamiento', 'parking', 'mecanico', 'taller', 'llanta', 'llantas', 'neumaticos', 'repuestos', 'cambio de aceite', 'revision tecnica', 'matricula vehicular', 'matricula del carro', 'soat', 'seguro del carro', 'lavada del carro', 'lavado del auto', 'autolavado',
          'bicicleta electrica', 'patineta', 'scooter', 'moto', 'motocicleta', 'bicicleta'] },
      { id: 'combustible', color: '#EF4444', nombre: 'Combustible', icono: '⛽', tipo: 'gasto', nec: 'N', sri: null, montoMax: 150,
        palabras: ['estacion servicio', 'mobil', 'gasolina', 'gasolina extra', 'gasolina super', 'nafta', 'bencina', 'diesel', 'eco pais', 'ecopais', 'gasolinera', 'grifo', 'bomba de gasolina', 'estacion de servicio', 'tanqueada', 'tanquee', 'tanque lleno', 'combustible', 'primax', 'terpel', 'petroecuador', 'pemex', 'ypf', 'shell', 'copec', 'puma', 'texaco', 'petrobras'],
        palabrasDebiles: ['extra', 'tanque'] },
      { id: 'salud', color: '#D6455D', nombre: 'Salud', icono: '💊', tipo: 'gasto', nec: 'N', sri: 'salud', montoMax: 800,
        palabras: ['medivalle', 'dental', 'paracetamol', 'ibuprofeno', 'oculista', 'operacion', 'cirugia', 'curacion', 'analgesicos', 'antiinflamatorio', 'aspirina', 'tomografia', 'resonancia', 'optometra', 'ortopedista', 'nutricionista', 'pediatra', 'ginecologo', 'traumatologo', 'dermatologo', 'cardiologo', 'tratamiento medico', 'cita con el doctor', 'chequeo medico', 'farmacia', 'botica', 'drogueria', 'medicina', 'medicinas', 'medicamento', 'medicamentos', 'remedio', 'remedios', 'pastillas', 'jarabe', 'doctor', 'doctora', 'medico', 'consulta', 'consulta medica', 'cita medica', 'examen medico', 'examenes', 'analisis', 'laboratorio', 'radiografia', 'ecografia',
          'dentista', 'odontologo', 'ortodoncia', 'brackets', 'hospital', 'clinica', 'emergencia', 'fybeca', 'cruz azul', 'sana sana', 'pharmacys', 'medicity', 'inkafarma', 'mifarma', 'farmatodo', 'cruz verde', 'la rebaja', 'farmacias del ahorro', 'farmacias guadalajara', 'similares', 'vacuna', 'terapia', 'fisioterapia',
          'psicologo', 'psicologa', 'lentes', 'gafas', 'optica', 'receta', 'antibiotico', 'inyeccion', 'mascarilla', 'mascarillas', 'tapabocas', 'cubrebocas', 'barbijo', 'alcohol', 'gel antibacterial', 'vitaminas', 'suplementos', 'seguro medico', 'seguro de salud', 'iess', 'eps', 'isapre'] },
      { id: 'educacion', color: '#0E7490', nombre: 'Educación', icono: '🎓', tipo: 'gasto', nec: 'N', sri: 'educacion', montoMax: 2000,
        palabras: ['udla', 'usfq', 'espol', 'puce', 'politecnica', 'semestre', 'semestres', 'pensiones', 'posgrado', 'bachillerato', 'examen de ingreso', 'colegio', 'escuela', 'kinder', 'guarderia', 'universidad', 'instituto', 'matricula', 'pension', 'pension del colegio', 'colegiatura', 'curso', 'cursos', 'diplomado', 'maestria', 'libros', 'libro', 'utiles', 'utiles escolares', 'cuaderno', 'cuadernos', 'mochila',
          'clases', 'clases particulares', 'tutoria', 'profesor particular', 'inscripcion', 'academia', 'ingles', 'curso de ingles', 'udemy', 'platzi', 'coursera', 'examen de admision', 'fotocopias', 'copias', 'impresiones'] },
      { id: 'comida_fuera', color: '#FF7A00', nombre: 'Comida fuera', icono: '🍔', tipo: 'gasto', nec: 'G', sri: 'alimentacion', hormiga: true, montoMax: 80,
        palabras: ['pollo gus', 'presto', 'tropiburger', 'texas chicken', 'papajohns', 'propina', 'propinas', 'propina al mesero', 'propina para el mesero', "mcdonald's", "mcdonalds", 'pollo frito', 'hot dog', 'hot dogs', 'hotdog', 'mcdonald s', 'mcdonald', 'burger', 'kebab', 'nachos', 'wrap', 'restaurante', 'restaurant', 'almuerzo', 'desayuno', 'cena', 'merienda', 'lonche', 'comida rapida', 'rapida', 'delivery', 'domicilio', 'a domicilio', 'pedidos ya', 'pedidosya', 'rappi', 'uber eats', 'didi food', 'glovo',
          'salchipapa', 'salchipapas', 'chuzo', 'chuzos', 'hornado', 'fritada', 'encebollado', 'ceviche', 'empanada', 'empanadas', 'hamburguesa', 'hamburguesas', 'pizza', 'pizzas', 'kfc', 'mcdonalds', 'mc donalds', 'burger king', 'subway', 'dominos', 'papa johns', 'menu', 'almuerzo ejecutivo', 'menu ejecutivo', 'corrientazo',
          'caldo', 'sopa', 'bolon', 'tigrillo', 'sanduche', 'sandwich', 'sushi', 'parrillada', 'parrilla', 'asado', 'churrasco', 'lomito', 'shawarma', 'tacos', 'taco', 'burrito', 'quesadilla', 'torta', 'tamal', 'pupusa', 'pupusas', 'baleada', 'gallo pinto', 'arepa rellena', 'bandeja paisa', 'ajiaco', 'pollo a la brasa', 'chaufa', 'lomo saltado', 'anticuchos', 'choripan', 'milanesa', 'locro', 'feijoada', 'picanha',
          'comi', 'cene', 'almorce', 'desayune', 'merende', 'colada', 'colada morada', 'guaguas de pan', 'fanesca', 'guatita', 'llapingachos', 'yaguarlocro', 'morocho', 'humitas', 'tamales', 'quimbolitos', 'cuy', 'menestra', 'bolones', 'espumilla', 'cholado',
          'seco de pollo', 'pollo asado', 'broaster', 'pollo broaster', 'alitas', 'jugo natural', 'batido', 'ensalada', 'wok', 'chifa', 'comida china', 'buffet', 'cafeteria', 'comedor', 'fonda', 'picanteria', 'huarique', 'bar restaurante', 'cevicheria', 'marisqueria', 'pizzeria', 'hamburgueseria', 'taqueria'],
        palabrasDebiles: ['comida', 'comer'] },
      { id: 'antojos', color: '#F59E8B', nombre: 'Antojos', icono: '🍦', tipo: 'gasto', nec: 'G', sri: 'alimentacion', hormiga: true, montoMax: 25,
        palabras: ['topsy', 'dunkin', 'churros', 'churro', 'oreo', 'oreos', 'gomitas', 'brownie', 'brownies', 'postre', 'postres', 'cupcake', 'waffle', 'waffles', 'crepes', 'algodon de azucar', 'paletas', 'helado', 'helados', 'cola', 'coca', 'coca cola', 'cocacola', 'pepsi', 'sprite', 'fanta', 'inca kola', 'gaseosa', 'gaseosas', 'refresco', 'soda', 'jugo', 'jugos', 'cafe', 'cafecito', 'capuchino', 'cappuccino', 'latte', 'frapuccino', 'starbucks', 'juan valdez', 'sweet and coffee', 'galletas', 'galleta',
          'chocolate', 'chocolates', 'dulce', 'dulces', 'caramelos', 'chicles', 'snack', 'snacks', 'papitas', 'papas fritas', 'chifles', 'doritos', 'cheetos', 'gatorade', 'powerade', 'agua mineral', 'agua embotellada', 'botella de agua',
          'energizante', 'red bull', 'monster', 'pastel', 'pasteles', 'pastelito', 'pastelitos', 'torta', 'tortas', 'dona', 'donas', 'donut', 'canguil', 'cotufas', 'palomitas', 'cabritas', 'pochoclo', 'golosina', 'golosinas', 'colita', 'oxxo', 'tambo', 'kiosco', 'quiosco', 'tiendita de la esquina', 'maquina expendedora', 'bubble tea', 'frozen', 'raspado', 'granizado', 'paleta', 'bombon'],
        // Una cola o unas galletas pueden ser un antojo o la compra de la casa: se pregunta una vez.
        ambiguas: ['cola', 'coca', 'coca cola', 'cocacola', 'pepsi', 'gaseosa', 'gaseosas', 'refresco', 'jugo', 'jugos', 'galletas', 'galleta', 'agua mineral', 'agua embotellada', 'botella de agua', 'chocolate', 'chocolates', 'papitas', 'chifles', 'cafe'],
        pregunta: { texto: '¿Fue un antojo o compra para la casa?', opciones: [{ texto: 'Un antojo', cat: 'antojos' }, { texto: 'Para la casa', cat: 'comida_hogar' }] } },
      { id: 'salidas', color: '#D4537E', nombre: 'Salidas', icono: '🎉', tipo: 'gasto', nec: 'G', sri: null, montoMax: 200,
        palabras: ['cinemark', 'supercines', 'multicines', 'ticketshow', 'punto ticket', 'licoreria', 'pub', 'licor', 'licores', 'la pena', 'pena folklorica', 'bar con amigos', 'cine', 'bar', 'cerveza', 'cervezas', 'birra', 'birras', 'chela', 'chelas', 'caguama', 'pilsener', 'trago', 'tragos', 'discoteca', 'disco', 'antro', 'boliche', 'fiesta', 'farra', 'rumba', 'joda', 'jarana', 'parranda', 'tomata', 'previa',
          'salida', 'salidas', 'salida con amigos', 'amigos', 'cumpleanos', 'cumple', 'karaoke', 'juntada', 'evento', 'concierto', 'entradas', 'boletos', 'copas', 'vino', 'pola', 'polas', 'ron', 'whisky', 'tequila', 'aguardiente', 'pisco', 'cachaca', 'bolos', 'billar', 'bowling', 'parque de diversiones', 'feria de juegos', 'estadio', 'partido', 'entrada al estadio'] },
      { id: 'ropa', color: '#3B82F6', nombre: 'Ropa', icono: '👕', tipo: 'gasto', nec: 'G', sri: 'vestimenta', montoMax: 400,
        palabras: ['prati', 'deprati', 'etafashion', 'marathon', 'lefties', 'bossi', 'pat primo', 'logging', 'pijama', 'pijamas', 'sandalia', 'bata', 'ropa de bebe', 'ropa para el bebe', 'ropa', 'zapatos', 'tenis', 'zapatillas', 'zapatos deportivos', 'sandalias', 'botas', 'camisa', 'camiseta', 'polo', 'playera', 'remera', 'franela', 'blusa', 'pantalon', 'pantalones', 'jean', 'jeans', 'short', 'shorts', 'bermuda', 'falda', 'vestido', 'chompa', 'buzo', 'sueter', 'saco', 'hoodie', 'casaca', 'campera',
          'medias', 'calcetines', 'ropa interior', 'calzoncillos', 'boxers', 'brasier', 'sosten', 'chaqueta', 'abrigo', 'uniforme', 'uniformes', 'gorra', 'sombrero', 'bufanda', 'guantes', 'cinturon', 'correa', 'cartera', 'bolso', 'mochila de moda', 'reloj', 'aretes', 'collar', 'anillo', 'bisuteria', 'de prati', 'eta fashion', 'zara', 'h m', 'bershka', 'pull and bear', 'forever 21', 'shein', 'nike', 'adidas', 'puma'] },
      { id: 'tecnologia', color: '#6366F1', nombre: 'Tecnología', icono: '🎧', tipo: 'gasto', nec: 'G', sri: null, montoMax: 2500,
        palabras: ['computron', 'megahertz', 'tventas', 'apple store', 'electronicos', 'electronica', 'electronico', 'celulares', 'gadgets', 'dispositivos', 'cable hdmi', 'hdmi', 'cable de carga', 'cable lightning', 'adaptador', 'hub usb', 'auriculares', 'audifonos', 'audifono', 'earbuds', 'airpods', 'cargador', 'cable usb', 'cable del celular', 'celular', 'telefono nuevo', 'smartphone', 'iphone', 'samsung', 'xiaomi', 'motorola', 'huawei', 'laptop', 'portatil', 'notebook', 'computadora', 'computador', 'pc', 'mouse', 'raton', 'teclado', 'monitor', 'pantalla', 'impresora', 'tinta', 'toner',
          'parlante', 'bocina', 'altavoz', 'bafle', 'consola', 'play station', 'playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'switch', 'videojuego', 'videojuegos', 'juego de video', 'tablet', 'ipad', 'smartwatch', 'reloj inteligente', 'camara', 'gopro', 'drone', 'dron', 'televisor', 'tv', 'television', 'smart tv', 'pendrive', 'usb', 'disco duro', 'router', 'modem', 'alexa', 'kindle', 'funda del celular', 'protector de pantalla', 'mica', 'power bank', 'bateria externa', 'steam', 'play store', 'app store', 'skin', 'compra en el juego', 'pavos', 'robux', 'diamantes'],
        pregunta: { texto: '¿Lo necesitas para tu trabajo o estudio?', opciones: [{ texto: 'Sí, para trabajar o estudiar', cat: 'tecnologia', nec: 'N' }, { texto: 'No, fue un gusto', cat: 'tecnologia', nec: 'G' }] } },
      { id: 'hogar', color: '#14B8A6', nombre: 'Casa y muebles', icono: '🛋️', tipo: 'gasto', nec: 'N', sri: null, montoMax: 3000,
        palabras: ['ferrisariato', 'pycca', 'senora de la limpieza', 'señora de la limpieza', 'senora que limpia', 'empleada domestica', 'empleada', 'servicio domestico', 'trabajadora del hogar', 'nana', 'jardinero', 'limpieza de la casa', 'cosas de la casa', 'cosas para la casa', 'enseres', 'menaje', 'escritorio', 'clavos', 'tornillos', 'bisagras', 'cerradura', 'candado', 'extension electrica', 'tomacorriente', 'focos led', 'mueble', 'muebles', 'sofa', 'sillon', 'mesa', 'sillas', 'silla', 'cama', 'colchon', 'velador', 'closet', 'ropero', 'armario', 'estanteria', 'repisa', 'refrigeradora', 'refrigerador', 'nevera', 'heladera', 'lavadora', 'secadora', 'cocina', 'estufa', 'horno', 'microondas', 'licuadora', 'batidora', 'olla', 'ollas', 'olla arrocera', 'arrocera', 'sarten', 'vajilla', 'platos', 'vasos', 'cubiertos', 'cafetera', 'tostadora', 'plancha', 'aspiradora', 'ventilador', 'calefactor', 'aire acondicionado', 'electrodomestico', 'electrodomesticos',
          'sabanas', 'cobija', 'cobijas', 'edredon', 'almohada', 'almohadas', 'toallas', 'cortinas', 'alfombra', 'decoracion', 'cuadro', 'florero', 'foco', 'focos', 'bombillo', 'bombillos', 'ampolleta', 'herramientas', 'taladro', 'martillo', 'pintura', 'ferreteria', 'kywi', 'sodimac', 'homecenter', 'easy', 'home depot', 'ikea', 'sukasa', 'almacenes de prati hogar', 'comandato', 'artefacta', 'la ganga', 'marcimex', 'jardin', 'plantas', 'macetas'] },
      { id: 'suscripciones', color: '#E11D48', nombre: 'Suscripciones', icono: '📺', tipo: 'gasto', nec: 'G', sri: null, hormiga: false, montoMax: 60,
        palabras: ['streaming', 'plataformas', 'plataforma de streaming', 'claude pro', 'chatgpt plus', 'mensualidad de spotify', 'mensualidad de netflix', 'membresia del gimnasio', 'netflix', 'spotify', 'disney', 'disney plus', 'hbo', 'hbo max', 'amazon prime', 'prime video', 'prime', 'youtube premium', 'youtube music', 'youtube', 'chatgpt', 'chat gpt', 'openai', 'claude', 'gemini', 'copilot', 'icloud', 'google one', 'google drive', 'dropbox', 'suscripcion', 'suscripciones', 'membresia', 'mensualidad de la app', 'apple music', 'apple tv', 'apple one', 'paramount', 'paramount plus', 'crunchyroll', 'deezer', 'tidal', 'twitch', 'patreon', 'onlyfans', 'canva', 'adobe', 'office 365', 'microsoft 365', 'xbox game pass', 'game pass', 'playstation plus', 'ps plus', 'nintendo online', 'vpn', 'nordvpn', 'duolingo', 'tinder', 'bumble', 'linkedin premium', 'star plus', 'vix', 'movistar play', 'directv go', 'win sports'] },
      { id: 'cuidado_personal', color: '#D97706', nombre: 'Cuidado personal', icono: '💈', tipo: 'gasto', nec: 'G', sri: null, montoMax: 150,
        palabras: ['estetica', 'cuidado personal', 'perfumes', 'belleza', 'pasta dental', 'pasta de dientes', 'cepillo de dientes', 'shampoo', 'champu', 'acondicionador', 'protector solar', 'bloqueador solar', 'esmalte', 'facial', 'cera depilatoria', 'tintura', 'hilo dental', 'enjuague bucal', 'crema facial', 'crema corporal', 'peluqueria', 'barberia', 'barbero', 'corte de pelo', 'corte de cabello', 'motilado', 'tinte', 'mechas', 'alisado', 'keratina', 'manicure', 'pedicure', 'arreglo de unas', 'unas postizas', 'cejas', 'pestanas', 'depilacion', 'spa', 'masaje', 'maquillaje', 'cosmeticos', 'crema', 'cremas', 'perfume', 'colonia', 'desodorante', 'afeitadora', 'rasuradora', 'gimnasio', 'gym', 'smart fit', 'crossfit', 'yoga', 'pilates', 'natacion', 'cancha', 'cancha sintetica', 'futbol', 'pelota', 'balon', 'ropa deportiva'] },
      { id: 'mascotas', color: '#84CC16', nombre: 'Mascotas', icono: '🐶', tipo: 'gasto', nec: 'N', sri: 'mascotas', montoMax: 300,
        palabras: ['pet house', 'pethouse', 'pecera', 'pipetas', 'pipeta', 'pipetas para pulgas', 'cama del perro', 'cama para perro', 'cama del gato', 'correa para el perro', 'consulta del veterinario', 'consulta veterinaria', 'juguete del perro', 'hueso para el perro', 'collar del gato', 'acuario', 'alimento para peces', 'comida de peces', 'pulgas', 'garrapatas', 'arnes para perro', 'perro', 'perrito', 'gato', 'gatito', 'mascota', 'mascotas', 'veterinario', 'veterinaria', 'vacuna del perro', 'vacuna del gato', 'comida de perro', 'comida de gato', 'comida del perro', 'comida del gato', 'croquetas', 'balanceado', 'pro plan', 'dog chow', 'cat chow', 'pedigree', 'whiskas', 'arena para gato', 'arena del gato', 'collar del perro', 'correa del perro', 'peluqueria canina', 'bano del perro', 'desparasitante', 'antipulgas', 'pet shop', 'petshop'] },
      { id: 'turismo', color: '#0EA5E9', nombre: 'Turismo y viajes', icono: '✈️', tipo: 'gasto', nec: 'G', sri: 'turismo', montoMax: 5000,
        palabras: ['expedia', 'paquete turistico', 'boleto de avion', 'boletos de avion', 'reserva de hotel', 'alojamiento', 'crucero', 'hotel en la playa', 'hotel', 'hostal', 'hospedaje', 'airbnb', 'booking', 'vuelo', 'vuelos', 'pasaje de avion', 'pasajes de avion', 'avion', 'aerolinea', 'latam', 'avianca', 'aeromexico', 'volaris', 'viva aerobus', 'sky', 'jetsmart', 'vacaciones', 'viaje', 'paseo', 'tour', 'excursion', 'playa', 'turismo', 'cabanas', 'cabana', 'camping', 'bus interprovincial', 'terminal terrestre', 'despegar', 'agencia de viajes', 'maleta', 'maletas', 'souvenir', 'recuerdos'] },
      { id: 'arte_cultura', color: '#9A6B3F', nombre: 'Arte y cultura', icono: '🎭', tipo: 'gasto', nec: 'G', sri: 'arte', montoMax: 300,
        palabras: ['entrada al museo', 'entradas al museo', 'entrada al teatro', 'entradas al teatro', 'boletos del teatro', 'boleto del teatro', 'festival de musica', 'festival de jazz', 'festival', 'opera', 'taller de ceramica', 'taller de pintura', 'taller de arte', 'taller de escritura', 'libro de poemas', 'funcion de teatro', 'funcion de danza', 'ballet', 'orquesta', 'sinfonica', 'museo', 'teatro', 'galeria', 'obra de teatro', 'clase de musica', 'clases de musica', 'clase de guitarra', 'clase de piano', 'clase de baile', 'clases de baile', 'curso de arte', 'curso de pintura', 'exposicion', 'feria del libro', 'libreria', 'instrumento', 'guitarra', 'piano', 'violin'] },
      { id: 'regalos', color: '#EC4899', nombre: 'Regalos y ayudas', icono: '🎁', tipo: 'gasto', nec: 'G', sri: null, montoMax: 500,
        palabras: ['floristeria', 'ayuda para mi', 'ayuda a mi', 'ayuda para mis', 'ayuda a mis', 'una ayuda', 'ayuda para', 'ayuda a', 'le di a mi', 'le mande a mi', 'le envie a mi', 'aporte para', 'regalo', 'regalos', 'obsequio', 'detalle', 'flores', 'ramo', 'torta de cumpleanos', 'pastel de cumpleanos', 'rifa', 'colecta', 'vaca', 'vaquita', 'donacion', 'donativo', 'limosna', 'diezmo', 'ofrenda', 'caridad', 'ayuda a mi mama', 'ayuda a mi papa', 'le di a mi mama', 'le di a mi papa', 'le mande a mi mama', 'le envie a mi mama', 'mesada', 'propina para', 'le preste', 'le presté'] },
      { id: 'deudas', color: '#64748B', nombre: 'Deudas y cuotas', icono: '🏦', tipo: 'gasto', nec: 'N', sri: null, montoMax: 5000,
        palabras: ['cuota del auto', 'cuota del vehiculo', 'la letra', 'letra del carro', 'letra del auto', 'prestamo', 'cuota del prestamo', 'cuota del banco', 'cuota del credito', 'deuda', 'credito', 'pago del credito', 'dividendo', 'letra', 'letras', 'cuota del carro', 'cuota de la moto', 'cuota del celular', 'credito de consumo', 'microcredito', 'chulquero', 'chulco', 'prestamista', 'gota a gota', 'fiado', 'pague lo fiado', 'abono al prestamo', 'abono a la deuda', 'intereses del prestamo', 'cooperativa', 'pago a la cooperativa', 'casa de empeno', 'empeno', 'desempeno'] },
      { id: 'otros', color: '#94A3B8', nombre: 'Otros gastos', icono: '📦', tipo: 'gasto', nec: null, sri: null, palabras: [] },
      // ---- Ingresos
      { id: 'sueldo', color: '#10B981', nombre: 'Sueldo', icono: '💼', tipo: 'ingreso', nec: null, sri: null,
        palabras: ['sueldo', 'rol', 'rol de pagos', 'quincena', 'salario', 'pago del mes', 'nomina', 'mi sueldo', 'me pagaron el sueldo', 'cobre el sueldo', 'decimo', 'decimo tercero', 'decimo cuarto', 'aguinaldo', 'prima', 'gratificacion', 'utilidades', 'vacaciones pagadas', 'liquidacion', 'jubilacion', 'pension jubilar', 'sueldo quincenal', 'jornal'] },
      { id: 'extra', color: '#06B6D4', nombre: 'Ingreso extra', icono: '💵', tipo: 'ingreso', nec: null, sri: null,
        palabras: ['extra', 'ingreso extra', 'propina', 'propinas', 'trabajo extra', 'trabajito', 'cachuelo', 'chamba extra', 'chambita', 'camello', 'freelance', 'bono', 'comision', 'comisiones', 'horas extras', 'hora extra', 'turno extra', 'me pagaron un trabajo', 'un trabajo', 'arreglo que hice', 'servicio que di', 'rifa que gane', 'premio', 'loteria', 'apuesta'] },
      { id: 'ventas', color: '#F59E0B', nombre: 'Ventas', icono: '🏷️', tipo: 'ingreso', nec: null, sri: null,
        palabras: ['venta', 'ventas', 'vendi', 'vendimos', 'me compraron', 'marketplace', 'mercado libre', 'olx'] },
      { id: 'otros_ingresos', color: '#7A8CA3', nombre: 'Otros ingresos', icono: '🎁', tipo: 'ingreso', nec: null, sri: null,
        palabras: ['intereses', 'los intereses', 'de intereses', 'interes ganado', 'devolvieron', 'regalaron', 'prestaron', 'mandaron plata', 'me mandaron', 'reembolsaron', 'devolucion de impuestos', 'cashback', 'dividendos', 'regalo', 'me regalaron', 'devolucion', 'reembolso', 'me devolvieron', 'me pagaron lo que me debian', 'me pagaron la deuda', 'me prestaron', 'prestamo que recibi', 'giro', 'remesa', 'me mandaron plata', 'me enviaron dinero', 'western union', 'interes', 'intereses de la cuenta', 'intereses del ahorro', 'arriendo que me pagan', 'renta que cobro', 'alquiler que cobro'] },
    ],

    // Palabras que piden «lo mismo que el mes pasado» o describen medidas: ayudan a saber que es compra para la casa (ingredientes).
    medidasHogar: ['libra', 'libras', 'kilo', 'kilos', 'kg', 'gramos', 'litro', 'litros', 'docena', 'media docena', 'funda', 'fundas', 'atado', 'atados', 'racimo', 'cubeta', 'carton', 'paquete', 'paquetes', 'quintal', 'arroba', 'saco', 'bolsa', 'bolsas'],

    /* ------------------------------------------------- GASTOS HORMIGA / 50-30-20 */
    hormiga: { montoMaximo: 5, minimoRepeticionesMes: 3 },
    regla503020: { necesario: 50, gusto: 30, ahorro: 20 },

    /* ------------------------------------------------------ AHORRO, PLAN DE COBRO Y DEUDAS (todo configurable aquí) */
    ahorro: {
      cobro: { diasDestacar: 2 },                  // el «Plan de tu cobro» se destaca en Inicio el día del cobro y 1 día después
      porcentaje: { sugeridos: [5, 10, 15, 20], maximo: 50, categoriasCobro: ['sueldo'] },   // % que se aparta solo cuando registras tu cobro (solo ingresos de estas categorías)
      redondeo: { pasos: [0.5, 1, 5], pasoPorDefecto: 1, montoMax: 100, excluirCategorias: ['deudas'] },   // cada compra sube al siguiente paso; la diferencia va a la meta. Compras mayores a montoMax no se redondean
      fondo: { nombre: 'Fondo de emergencia', icono: '🛟', mesesMin: 3, mesesMax: 6, mesesPorDefecto: 3, mesesAtras: 3, minGastosPorMes: 5 },   // se calcula con tus gastos NECESARIOS reales de los últimos «mesesAtras» meses completos que tengan al menos «minGastosPorMes» gastos
    },
    deudas: { maxMeses: 600, extraSugerido: [25, 50, 100] },   // «Plan para pagar deudas»: tope de meses simulados y botones de extra mensual

    /* ------------------------------------------------------ AVISOS Y ALERTAS */
    alertas: {
      presupuestoAvisoDesde: 0.8,                 // avisa al llegar al 80 % del límite
      presupuestoDetenerDesde: 1.0,               // «detente» al llegar al 100 %
      diasAntesCorte: [3, 1],
      diasAntesVencimiento: [3, 1],
      horaAviso: '09:00',
      resumenSemanalDia: 0,                       // 0 = domingo
      anticipoDiasPredictivo: 7,
      diasMinimosPrediccion: 7,                   // la alerta «te faltarán…» espera a tener esta cantidad de días de datos
    },
    suscripciones: { minimoMeses: 2, toleranciaMonto: 0.1, toleranciaDias: 5 },   // para detectarlas solas (Pro)
    conciliar: { toleranciaDias: 4, toleranciaMonto: 0.01 },
    pdf: { filasPorPagina: 38 },
    reto: { dias: 30, nombre: '30 días sin gastos hormiga' },

    /* -------------------------------------------------------------- TARJETAS */
    // NUNCA se inventa una tasa: si el usuario no la sabe, la app la pide.
    tarjetas: {
      tipos: ['corriente', 'diferido_sin_intereses', 'diferido_con_intereses', 'rotativo'],
      redes: ['Visa', 'Mastercard', 'Diners', 'American Express', 'Otra'],
      mesesComunes: [3, 6, 9, 12, 18, 24, 36],
      porcentajePagoMinimoDefecto: null,           // se pide al usuario (varía por banco)
      // Los BANCOS (nombres, tarifas, fuentes y vigencias) viven en bancos-datos.js: es la única tabla y se puede reemplazar sin publicar versión.
      // Niveles que se ofrecen al elegir una tarjeta (cada banco puede traer los suyos). «Otra» deja escribir el nombre.
      niveles: ['Clásica', 'Gold', 'Platinum', 'Signature', 'Infinite', 'Black', 'Otra'],
      // Qué costos se muestran en «Costos de tu tarjeta», en este orden. La clave es la misma que usa el catálogo.
      costos: [
        { clave: 'rotativo', etiqueta: 'Consumo corriente (rotativo)', icono: '🔁' },
        { clave: 'diferido', etiqueta: 'Compras diferidas (a cuotas)', icono: '🗓️' },
        { clave: 'tasa', etiqueta: 'Tasa de interés', icono: '📈' },
        { clave: 'mora', etiqueta: 'Si te atrasas (mora)', icono: '⏰' },
        { clave: 'uso', etiqueta: 'Por usar la tarjeta', icono: '🛍️' },
        { clave: 'mantenimiento', etiqueta: 'Mantenimiento', icono: '🧰' },
        { clave: 'avance', etiqueta: 'Avance de efectivo', icono: '💵' },
        { clave: 'cobranza', etiqueta: 'Cobranza', icono: '📞' },
        { clave: 'emision', etiqueta: 'Emisión y renovación', icono: '💳' },
        { clave: 'reposicion', etiqueta: 'Reposición del plástico', icono: '🆕' },
        { clave: 'recompensas', etiqueta: 'Programa de recompensas', icono: '🎁' },
        { clave: 'voucher', etiqueta: 'Copia de voucher', icono: '🧾' },
        { clave: 'estado', etiqueta: 'Estado de cuenta', icono: '📄' },
        { clave: 'pagoTarjeta', etiqueta: 'Pagar la tarjeta', icono: '✅' },
        { clave: 'gasolinera', etiqueta: 'Gasolineras', icono: '⛽' },
      ],
    },

    /* ------------------------------------------------------------------ SRI */
    // Verificado el 6/11/2026 contra Siigo, Primicias y El Diario (impuesto a la renta 2026).
    sri: {
      pais: 'EC',
      anio: 2026,
      canastaBasica: 821.80,                       // enero 2026 (INEC)
      porcentajeRebaja: 0.18,                      // 18 % de los gastos deducibles
      canastasPorCargas: { 0: 7, 1: 9, 2: 11, 3: 14, 4: 17, 5: 20 }, // 5 = "5 o más"
      ingresoAnualMinimo: 12208,                   // del documento de arranque; no reverificado
      topePorRubro: null,                          // las fuentes no publican topes por rubro: no se inventan
      rubros: {
        alimentacion: 'Alimentación', educacion: 'Educación', salud: 'Salud', vestimenta: 'Vestimenta',
        vivienda: 'Vivienda', turismo: 'Turismo nacional', arte: 'Arte y cultura', mascotas: 'Mascotas',
      },
      formularioMes: 'febrero',                    // se entrega al empleador
    },

    /* ----------------------------------------------- DATOS REMOTOS (opcional) */
    // Archivos que se actualizan sin publicar versión. urlTarifas = JSON con la misma forma que bancos-datos.js (si está vacío, se usa lo que trae la app).
    remoto: { urlTarifas: '', urlSRI: '', refrescarCadaHoras: 24 },

    /* --------------------------------------------------------- COPIA Y DATOS */
    respaldo: { nombreArchivo: 'asistente-financiero-respaldo.json', carpeta: 'appDataFolder', automatico: true },
    historial: { maxEntradas: 500 },
    tabla: { filasPorPagina: 50 },

    /* ------------------------------------------------------------ APARIENCIA */
    // Colores. La app es oscura por defecto (azul marino, como la entrada y el PIN) y tiene modo claro. Verde = ingresos, rojo = gastos.
    // `voz` es el color del botón del micrófono y de las acciones principales; `naranja` es el del logo (detalles). Nada de morado.
    // tema.js convierte cada valor en una variable CSS: cambiar un valor cambia toda la app.
    //   panel / panelFondo  = superficies grandes (portada, PIN, pantalla de voz, plástico de tarjeta)
    //   botonFondo          = botones principales   ·   paleta = colores de reserva para íconos que no son una categoría
    /* Apariencia: TODOS los colores de la app, en este único lugar. tema.js los convierte en variables CSS (--papel, --acento…).
       `claro` y `oscuro` son los de «Petróleo y oro» (el de origen). Cada color de `colores` cambia solo lo que escribe; lo demás queda igual.
       Qué es cada cosa:
         papel / fondoApp  fondo de las pantallas       · hoja  fondo de tarjetas y paneles     · linea  bordes finos
         tinta / tinta2    texto principal / texto suave · acento  enlaces e íconos activos       · botonFondo  botones principales
         heroFondo, sobreHero, sobreHero2, heroTrazo  tarjeta grande del saldo (fondo, texto, texto suave, línea decorativa)
         voz, vozFondo, sobreVoz, vozBrillo  botón del micrófono · oro, oroSuave, sobreOro  lo «Pro»
         gasto / ingreso / aviso (+Suave, +Vivo)  rojo, verde y ámbar · tabFondo, tabActivoFondo, tabActivoTexto  barra de abajo */
    apariencia: {
      claro: {
        papel: '#F4EFE5', fondoApp: 'linear-gradient(180deg,#F8F4EB 0%,#F1EBDD 100%)', hoja: '#FFFDF8', tinta: '#0F2A30', tinta2: '#5D6F72', linea: '#E7DFCF',
        panel: '#0D4350', panelFondo: 'linear-gradient(150deg,#0A3641 0%,#0F5561 100%)', panelSuave: '#E6F0EE',
        heroFondo: 'linear-gradient(150deg,#0A3A45 0%,#0F5C68 62%,#157683 100%)', sobreHero: '#FFFFFF', sobreHero2: '#B8D6D8', heroTrazo: '#D9AE4A',
        acento: '#0E6270', botonFondo: 'linear-gradient(135deg,#127886 0%,#0B4F5B 100%)',
        voz: '#C9962B', vozFondo: 'linear-gradient(150deg,#EBC264 0%,#C28B1F 100%)', sobreVoz: '#2B1B00', vozBrillo: 'rgba(201,150,43,0.45)', naranja: '#D9821F',
        oro: '#C9962B', oroSuave: '#F8EBC8', sobreOro: '#5E3F00',
        gasto: '#C23B2E', gastoSuave: '#FBE5E0', gastoVivo: '#E0584A',
        ingreso: '#127F5A', ingresoSuave: '#DDF2E8', ingresoVivo: '#1DAE7A',
        aviso: '#8A5200', avisoSuave: '#FBEFD2',
        sobrePanel: '#FFFFFF', sobrePanel2: '#B8D6D8', sombraColor: 'rgba(40,52,40,0.24)',
        tabFondo: 'rgba(255,253,248,0.94)', tabActivoFondo: 'linear-gradient(135deg,#127886 0%,#0B4F5B 100%)', tabActivoTexto: '#FFFFFF',
      },
      oscuro: {
        papel: '#061A1E', fondoApp: 'linear-gradient(180deg,#082126 0%,#051519 100%)', hoja: '#0D2A30', tinta: '#EAF4F3', tinta2: '#94ADB0', linea: 'rgba(255,255,255,0.09)',
        panel: '#0D4350', panelFondo: 'linear-gradient(150deg,#0A3641 0%,#0F5561 100%)', panelSuave: 'rgba(99,211,223,0.12)',
        heroFondo: 'linear-gradient(150deg,#0B3E4A 0%,#10606C 70%,#17808D 100%)', sobreHero: '#FFFFFF', sobreHero2: '#B8D6D8', heroTrazo: '#E7BB55',
        acento: '#63D3DF', botonFondo: 'linear-gradient(135deg,#1A8D9C 0%,#0E5E6B 100%)',
        voz: '#E3B450', vozFondo: 'linear-gradient(150deg,#EBC264 0%,#C28B1F 100%)', sobreVoz: '#2B1B00', vozBrillo: 'rgba(227,180,80,0.38)', naranja: '#F0A23B',
        oro: '#E7BB55', oroSuave: 'rgba(231,187,85,0.15)', sobreOro: '#F2CD78',
        gasto: '#FF8478', gastoSuave: 'rgba(255,132,120,0.14)', gastoVivo: '#FF6B5E',
        ingreso: '#4BDDA9', ingresoSuave: 'rgba(75,221,169,0.14)', ingresoVivo: '#2FCB94',
        aviso: '#FFCB7A', avisoSuave: 'rgba(255,203,122,0.13)',
        sobrePanel: '#FFFFFF', sobrePanel2: '#B8D6D8', sombraColor: 'rgba(0,0,0,0.55)',
        tabFondo: 'rgba(11,38,44,0.94)', tabActivoFondo: 'linear-gradient(135deg,#1A8D9C 0%,#0E5E6B 100%)', tabActivoTexto: '#FFFFFF',
      },
      // Colores que la persona elige en Más → Ajustes → Apariencia. `muestra` = los dos colores del circulito.
      // Ingresos verde y gastos rojo se mantienen parecidos en todos para que nunca se confundan.
      colores: [
        { id: 'petroleo', nombre: 'Petróleo y oro', muestra: ['#0F5C68', '#C9962B'], claro: {}, oscuro: {} },
        { id: 'marino', nombre: 'Marino y cobre', muestra: ['#1D4271', '#C8743B'],
          claro: { papel: '#E9EEF6', fondoApp: 'linear-gradient(180deg,#EEF2F9 0%,#E2E8F3 100%)', hoja: '#FBFCFE', tinta: '#0F1E36', tinta2: '#5B6A82', linea: '#DCE3EE',
            panel: '#12294A', panelFondo: 'linear-gradient(150deg,#0F2444 0%,#1D4271 100%)', panelSuave: '#E3EBF7',
            heroFondo: 'linear-gradient(150deg,#12294A 0%,#1D4271 68%,#27568F 100%)', sobreHero2: '#BCCBE2', heroTrazo: '#D58A55',
            acento: '#1B4B8A', botonFondo: 'linear-gradient(135deg,#25589F 0%,#143A6E 100%)',
            voz: '#C8743B', vozFondo: 'linear-gradient(150deg,#E8A06A 0%,#B8612B 100%)', sobreVoz: '#2A1100', vozBrillo: 'rgba(200,116,59,0.45)', naranja: '#D9821F',
            oro: '#C8934A', oroSuave: '#F6E6CD', sobreOro: '#5E3A10', sobrePanel2: '#BCCBE2', sombraColor: 'rgba(15,35,63,0.22)',
            tabFondo: 'rgba(251,252,254,0.94)', tabActivoFondo: 'linear-gradient(135deg,#25589F 0%,#143A6E 100%)' },
          oscuro: { papel: '#0A1426', fondoApp: 'linear-gradient(180deg,#0C182D 0%,#08111F 100%)', hoja: '#111E36', tinta: '#EEF3FB', tinta2: '#98A8C2',
            panel: '#12294A', panelFondo: 'linear-gradient(150deg,#0F2444 0%,#1D4271 100%)', panelSuave: 'rgba(127,176,255,0.13)',
            heroFondo: 'linear-gradient(150deg,#142E55 0%,#1F4577 70%,#2C5C99 100%)', sobreHero2: '#BCCBE2', heroTrazo: '#E39A63',
            acento: '#8DB8FF', botonFondo: 'linear-gradient(135deg,#2E6AB8 0%,#194580 100%)',
            voz: '#E39A63', vozFondo: 'linear-gradient(150deg,#EBA877 0%,#BE6830 100%)', sobreVoz: '#2A1100', vozBrillo: 'rgba(227,154,99,0.4)', naranja: '#F0A23B',
            oro: '#E8B77F', oroSuave: 'rgba(232,183,127,0.15)', sobreOro: '#F0C595', sobrePanel2: '#BCCBE2',
            tabFondo: 'rgba(14,29,54,0.94)', tabActivoFondo: 'linear-gradient(135deg,#2E6AB8 0%,#194580 100%)' } },
        { id: 'oliva', nombre: 'Oliva', muestra: ['#3F5E22', '#C98A2E'],
          claro: { papel: '#F3EDE0', fondoApp: 'linear-gradient(180deg,#F7F1E5 0%,#EEE7D5 100%)', hoja: '#FFFCF4', tinta: '#1E2A14', tinta2: '#66705A', linea: '#E5DDC9',
            panel: '#314B1F', panelFondo: 'linear-gradient(150deg,#2B4219 0%,#4A6B26 100%)', panelSuave: '#E8EFDC',
            heroFondo: 'linear-gradient(150deg,#2F4A1F 0%,#4A6B26 66%,#5E8230 100%)', sobreHero2: '#CBDDB0', heroTrazo: '#E3C36A',
            acento: '#46661F', botonFondo: 'linear-gradient(135deg,#5B8030 0%,#3C5A1D 100%)',
            voz: '#C98A2E', vozFondo: 'linear-gradient(150deg,#E8BA5C 0%,#B97D22 100%)', sobreVoz: '#2B1B00', vozBrillo: 'rgba(201,138,46,0.45)',
            gasto: '#B8452E', gastoSuave: '#F8E4DC', gastoVivo: '#D95E45', ingreso: '#1F7A4A', ingresoSuave: '#DDF0E3',
            sobrePanel2: '#CBDDB0', sombraColor: 'rgba(40,50,25,0.24)',
            tabFondo: 'rgba(255,252,244,0.94)', tabActivoFondo: 'linear-gradient(135deg,#5B8030 0%,#3C5A1D 100%)' },
          oscuro: { papel: '#10160A', fondoApp: 'linear-gradient(180deg,#131B0C 0%,#0C1107 100%)', hoja: '#192311', tinta: '#F0F4E8', tinta2: '#A3AE93',
            panel: '#314B1F', panelFondo: 'linear-gradient(150deg,#2B4219 0%,#4A6B26 100%)', panelSuave: 'rgba(168,212,106,0.13)',
            heroFondo: 'linear-gradient(150deg,#304C1F 0%,#4B6D27 70%,#5F8531 100%)', sobreHero2: '#CBDDB0', heroTrazo: '#E8C874',
            acento: '#B2DB74', botonFondo: 'linear-gradient(135deg,#6A9438 0%,#456A21 100%)',
            voz: '#E3B450', vozFondo: 'linear-gradient(150deg,#EBC264 0%,#BE8421 100%)', sobreVoz: '#2B1B00', vozBrillo: 'rgba(227,180,80,0.38)',
            sobrePanel2: '#CBDDB0',
            tabFondo: 'rgba(22,32,14,0.94)', tabActivoFondo: 'linear-gradient(135deg,#6A9438 0%,#456A21 100%)' } },
        { id: 'violeta', nombre: 'Violeta noche', muestra: ['#3B2C9C', '#5CF2C0'],
          claro: { papel: '#EFECF8', fondoApp: 'linear-gradient(180deg,#F3F0FB 0%,#E8E4F5 100%)', hoja: '#FFFFFF', tinta: '#1A1640', tinta2: '#645E8A', linea: '#E0DCF0',
            panel: '#1B1750', panelFondo: 'linear-gradient(150deg,#17134A 0%,#3B2C9C 100%)', panelSuave: '#E9E5F8',
            heroFondo: 'linear-gradient(150deg,#1B1750 0%,#3B2C9C 62%,#5841D6 100%)', sobreHero2: '#C9C2F2', heroTrazo: '#5CF2C0',
            acento: '#5236D6', botonFondo: 'linear-gradient(135deg,#6B4DF0 0%,#4A31C9 100%)',
            voz: '#6B4DF0', vozFondo: 'linear-gradient(150deg,#8F73FF 0%,#4B33C9 100%)', sobreVoz: '#FFFFFF', vozBrillo: 'rgba(107,77,240,0.5)', naranja: '#E0832A',
            oro: '#D69A1F', oroSuave: '#F9EBC6', sobreOro: '#5E3F00',
            gasto: '#D03A55', gastoSuave: '#FBE3E8', gastoVivo: '#EC5470', ingreso: '#0E8C63', ingresoSuave: '#DAF3EA',
            sobrePanel2: '#C9C2F2', sombraColor: 'rgba(40,30,110,0.24)',
            tabFondo: 'rgba(255,255,255,0.94)', tabActivoFondo: 'linear-gradient(135deg,#6B4DF0 0%,#4A31C9 100%)' },
          oscuro: { papel: '#070A1C', fondoApp: 'radial-gradient(120% 55% at 85% 0%,#251B6B 0%,#070A1C 62%)', hoja: '#12163A', tinta: '#EEF0FF', tinta2: '#9EA3CF', linea: 'rgba(160,150,255,0.16)',
            panel: '#1B1750', panelFondo: 'linear-gradient(150deg,#17134A 0%,#3B2C9C 100%)', panelSuave: 'rgba(155,135,255,0.15)',
            heroFondo: 'linear-gradient(150deg,#1D1862 0%,#3A2BA0 68%,#5A45E0 100%)', sobreHero2: '#C9C2F2', heroTrazo: '#5CF2C0',
            acento: '#A593FF', botonFondo: 'linear-gradient(135deg,#7557FF 0%,#4A31C9 100%)',
            voz: '#8F73FF', vozFondo: 'linear-gradient(150deg,#9B82FF 0%,#4B33C9 100%)', sobreVoz: '#FFFFFF', vozBrillo: 'rgba(143,115,255,0.55)',
            oro: '#F0BE4A', oroSuave: 'rgba(240,190,74,0.16)', sobreOro: '#F6D27A',
            gasto: '#FF7089', gastoSuave: 'rgba(255,112,137,0.15)', gastoVivo: '#FF5A78', ingreso: '#3DE6A8', ingresoSuave: 'rgba(61,230,168,0.14)', ingresoVivo: '#27D497',
            sobrePanel2: '#C9C2F2', sombraColor: 'rgba(0,0,0,0.6)',
            tabFondo: 'rgba(18,22,58,0.94)', tabActivoFondo: 'linear-gradient(135deg,#7557FF 0%,#4A31C9 100%)' } },
      ],
      // Colores de las categorías en gráficas (anillo y barras). Se reparten en este orden.
      paleta: ['#0F7C8C', '#D9A53A', '#E0674F', '#6C8F3A', '#6B58D6', '#C2610C', '#2F6FD0', '#B5538A', '#14917F', '#7A8CA3'],
    },
  };

  /* ------------------------------------------------------------- Ayudas de lectura */
  PLAN.pais = (codigo) => PLAN.paises.find((p) => p.codigo === codigo) || PLAN.paises[PLAN.paises.length - 1];
  PLAN.categoria = (id) => PLAN.categorias.find((c) => c.id === id) || null;

  AF.PLAN = PLAN;
  if (typeof module === 'object' && module.exports) module.exports = PLAN;
})(typeof window !== 'undefined' ? window : globalThis);
