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
      version: '3.1.0',
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
      googleClientIdWeb: '',                      // LUIS: ID de cliente "Web" creado en Google Cloud
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
      historialDeshacer:       { g: true,  p: true  },
      copiaDrive:              { g: true,  p: true  },
    },
    // Una línea que explica cada función Pro (insignia + pantalla de comparación).
    explicacionPro: {
      tarjetaDiferidoCuotas: 'Diferidos y cuotas con su cuota mensual y cuánto pagas de intereses.',
      asesorTarjeta: 'Te dice si conviene pagar el mínimo o el total y te avisa corte y pago.',
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
        palabras: [
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
          'papel higienico', 'jabon', 'detergente', 'cloro', 'desinfectante', 'shampoo', 'champu', 'pasta dental', 'cepillo de dientes', 'panales', 'toallas humedas', 'escoba', 'trapeador', 'esponja', 'lavaplatos', 'limpieza', 'aseo'],
        palabrasDebiles: ['comida', 'compras', 'compra'] },
      { id: 'servicios', color: '#F59E0B', nombre: 'Servicios básicos', icono: '💡', tipo: 'gasto', nec: 'N', sri: null, montoMax: 500,
        palabras: ['luz', 'electricidad', 'energia', 'energia electrica', 'agua', 'agua potable', 'internet', 'telefono', 'telefono fijo', 'plan celular', 'plan del celular', 'recarga', 'recargas', 'recarga del celular', 'datos', 'megas', 'gas', 'tanque de gas', 'cilindro de gas', 'bombona', 'garrafa', 'balon de gas',
          'cnel', 'empresa electrica', 'planilla', 'planillas', 'alicuota', 'alicuotas', 'expensas', 'administracion', 'cuota de administracion', 'condominio', 'cable', 'tv cable', 'television por cable', 'wifi', 'basura', 'recoleccion de basura',
          'movistar', 'tigo', 'entel', 'telcel', 'at t', 'wom', 'bitel', 'cnt', 'tuenti', 'digicel', 'kolbi', 'une', 'etb', 'epm', 'cfe', 'enel', 'edesur', 'edenor', 'luz del sur', 'sedapal', 'interagua', 'epmaps', 'codensa', 'emcali', 'naturgy', 'iberdrola', 'endesa', 'netlife', 'puntonet', 'xtrim', 'directv', 'izzi', 'totalplay', 'megacable', 'telmex'],
        palabrasDebiles: ['servicios', 'servicio', 'claro', 'personal'] },
      { id: 'vivienda', color: '#3D6FB6', nombre: 'Vivienda', icono: '🏠', tipo: 'gasto', nec: 'N', sri: 'vivienda', montoMax: 3000,
        palabras: ['arriendo', 'arrendamiento', 'alquiler', 'renta', 'renta de la casa', 'renta del departamento', 'hipoteca', 'cuota de la casa', 'credito hipotecario', 'predial', 'impuesto predial', 'contribuciones',
          'reparacion de la casa', 'arreglo de la casa', 'plomero', 'gasfitero', 'fontanero', 'electricista', 'albanil', 'pintura de la casa', 'cerrajero', 'garantia del departamento', 'deposito de garantia', 'portero', 'guardiania', 'seguridad del edificio'] },
      { id: 'transporte', color: '#06B6D4', nombre: 'Transporte', icono: '🚌', tipo: 'gasto', nec: 'N', sri: null, montoMax: 120,
        palabras: ['pasaje', 'pasajes', 'bus', 'buseta', 'colectivo', 'micro', 'combi', 'trufi', 'guagua', 'camion', 'pesero', 'taxi', 'mototaxi', 'uber', 'cabify', 'indrive', 'in drive', 'didi', 'beat', 'bolt', 'carrera', 'carrerita', 'viaje en taxi',
          'metro', 'subte', 'trolebus', 'ecovia', 'metrovia', 'transmilenio', 'metrobus', 'tren', 'peaje', 'peajes', 'parqueadero', 'parqueo', 'estacionamiento', 'parking', 'mecanico', 'taller', 'llanta', 'llantas', 'neumaticos', 'repuestos', 'cambio de aceite', 'revision tecnica', 'matricula vehicular', 'matricula del carro', 'soat', 'seguro del carro', 'lavada del carro', 'lavado del auto', 'autolavado',
          'bicicleta electrica', 'patineta', 'scooter', 'moto', 'motocicleta', 'bicicleta'] },
      { id: 'combustible', color: '#EF4444', nombre: 'Combustible', icono: '⛽', tipo: 'gasto', nec: 'N', sri: null, montoMax: 150,
        palabras: ['gasolina', 'gasolina extra', 'gasolina super', 'nafta', 'bencina', 'diesel', 'eco pais', 'ecopais', 'gasolinera', 'grifo', 'bomba de gasolina', 'estacion de servicio', 'tanqueada', 'tanquee', 'tanque lleno', 'combustible', 'primax', 'terpel', 'petroecuador', 'pemex', 'ypf', 'shell', 'copec', 'puma', 'texaco', 'petrobras'],
        palabrasDebiles: ['extra', 'tanque'] },
      { id: 'salud', color: '#D6455D', nombre: 'Salud', icono: '💊', tipo: 'gasto', nec: 'N', sri: 'salud', montoMax: 800,
        palabras: ['farmacia', 'botica', 'drogueria', 'medicina', 'medicinas', 'medicamento', 'medicamentos', 'remedio', 'remedios', 'pastillas', 'jarabe', 'doctor', 'doctora', 'medico', 'consulta', 'consulta medica', 'cita medica', 'examen medico', 'examenes', 'analisis', 'laboratorio', 'radiografia', 'ecografia',
          'dentista', 'odontologo', 'ortodoncia', 'brackets', 'hospital', 'clinica', 'emergencia', 'fybeca', 'cruz azul', 'sana sana', 'pharmacys', 'medicity', 'inkafarma', 'mifarma', 'farmatodo', 'cruz verde', 'la rebaja', 'farmacias del ahorro', 'farmacias guadalajara', 'similares', 'vacuna', 'terapia', 'fisioterapia',
          'psicologo', 'psicologa', 'lentes', 'gafas', 'optica', 'receta', 'antibiotico', 'inyeccion', 'mascarilla', 'mascarillas', 'tapabocas', 'cubrebocas', 'barbijo', 'alcohol', 'gel antibacterial', 'vitaminas', 'suplementos', 'seguro medico', 'seguro de salud', 'iess', 'eps', 'isapre'] },
      { id: 'educacion', color: '#0E7490', nombre: 'Educación', icono: '🎓', tipo: 'gasto', nec: 'N', sri: 'educacion', montoMax: 2000,
        palabras: ['colegio', 'escuela', 'kinder', 'guarderia', 'universidad', 'instituto', 'matricula', 'pension', 'pension del colegio', 'colegiatura', 'curso', 'cursos', 'diplomado', 'maestria', 'libros', 'libro', 'utiles', 'utiles escolares', 'cuaderno', 'cuadernos', 'mochila',
          'mensualidad', 'clases', 'clases particulares', 'tutoria', 'profesor particular', 'inscripcion', 'academia', 'ingles', 'curso de ingles', 'udemy', 'platzi', 'coursera', 'examen de admision', 'fotocopias', 'copias', 'impresiones'] },
      { id: 'comida_fuera', color: '#FF7A00', nombre: 'Comida fuera', icono: '🍔', tipo: 'gasto', nec: 'G', sri: 'alimentacion', hormiga: true, montoMax: 80,
        palabras: ['restaurante', 'restaurant', 'almuerzo', 'desayuno', 'cena', 'merienda', 'lonche', 'comida rapida', 'rapida', 'delivery', 'domicilio', 'a domicilio', 'pedidos ya', 'pedidosya', 'rappi', 'uber eats', 'didi food', 'glovo',
          'salchipapa', 'salchipapas', 'chuzo', 'chuzos', 'hornado', 'fritada', 'encebollado', 'ceviche', 'empanada', 'empanadas', 'hamburguesa', 'hamburguesas', 'pizza', 'pizzas', 'kfc', 'mcdonalds', 'mc donalds', 'burger king', 'subway', 'dominos', 'papa johns', 'menu', 'almuerzo ejecutivo', 'menu ejecutivo', 'corrientazo',
          'caldo', 'sopa', 'bolon', 'tigrillo', 'sanduche', 'sandwich', 'sushi', 'parrillada', 'parrilla', 'asado', 'churrasco', 'lomito', 'shawarma', 'tacos', 'taco', 'burrito', 'quesadilla', 'torta', 'tamal', 'pupusa', 'pupusas', 'baleada', 'gallo pinto', 'arepa rellena', 'bandeja paisa', 'ajiaco', 'pollo a la brasa', 'chaufa', 'lomo saltado', 'anticuchos', 'choripan', 'milanesa', 'locro', 'feijoada', 'picanha',
          'comi', 'cene', 'almorce', 'desayune', 'merende', 'colada', 'colada morada', 'guaguas de pan', 'fanesca', 'guatita', 'llapingachos', 'yaguarlocro', 'morocho', 'humitas', 'tamales', 'quimbolitos', 'cuy', 'menestra', 'bolones', 'espumilla', 'cholado',
          'seco de pollo', 'pollo asado', 'broaster', 'pollo broaster', 'alitas', 'jugo natural', 'batido', 'ensalada', 'wok', 'chifa', 'comida china', 'buffet', 'cafeteria', 'comedor', 'fonda', 'picanteria', 'huarique', 'bar restaurante', 'cevicheria', 'marisqueria', 'pizzeria', 'hamburgueseria', 'taqueria'],
        palabrasDebiles: ['comida', 'comer'] },
      { id: 'antojos', color: '#F59E8B', nombre: 'Antojos', icono: '🍦', tipo: 'gasto', nec: 'G', sri: 'alimentacion', hormiga: true, montoMax: 25,
        palabras: ['helado', 'helados', 'cola', 'coca', 'coca cola', 'cocacola', 'pepsi', 'sprite', 'fanta', 'inca kola', 'gaseosa', 'gaseosas', 'refresco', 'soda', 'jugo', 'jugos', 'cafe', 'cafecito', 'capuchino', 'cappuccino', 'latte', 'frapuccino', 'starbucks', 'juan valdez', 'sweet and coffee', 'galletas', 'galleta',
          'chocolate', 'chocolates', 'dulce', 'dulces', 'caramelos', 'chicles', 'snack', 'snacks', 'papitas', 'papas fritas', 'chifles', 'doritos', 'cheetos', 'gatorade', 'powerade', 'agua mineral', 'agua embotellada', 'botella de agua',
          'energizante', 'red bull', 'monster', 'pastel', 'pasteles', 'pastelito', 'pastelitos', 'torta', 'tortas', 'dona', 'donas', 'donut', 'canguil', 'cotufas', 'palomitas', 'cabritas', 'pochoclo', 'golosina', 'golosinas', 'colita', 'oxxo', 'tambo', 'kiosco', 'quiosco', 'tiendita de la esquina', 'maquina expendedora', 'bubble tea', 'frozen', 'raspado', 'granizado', 'paleta', 'bombon'],
        // Una cola o unas galletas pueden ser un antojo o la compra de la casa: se pregunta una vez.
        ambiguas: ['cola', 'coca', 'coca cola', 'cocacola', 'pepsi', 'gaseosa', 'gaseosas', 'refresco', 'jugo', 'jugos', 'galletas', 'galleta', 'agua mineral', 'agua embotellada', 'botella de agua', 'chocolate', 'chocolates', 'papitas', 'chifles', 'cafe'],
        pregunta: { texto: '¿Fue un antojo o compra para la casa?', opciones: [{ texto: 'Un antojo', cat: 'antojos' }, { texto: 'Para la casa', cat: 'comida_hogar' }] } },
      { id: 'salidas', color: '#D4537E', nombre: 'Salidas', icono: '🎉', tipo: 'gasto', nec: 'G', sri: null, montoMax: 200,
        palabras: ['cine', 'bar', 'cerveza', 'cervezas', 'birra', 'birras', 'chela', 'chelas', 'caguama', 'pilsener', 'trago', 'tragos', 'discoteca', 'disco', 'antro', 'boliche', 'fiesta', 'farra', 'rumba', 'joda', 'jarana', 'parranda', 'tomata', 'previa',
          'salida', 'salidas', 'salida con amigos', 'amigos', 'cumpleanos', 'cumple', 'karaoke', 'juntada', 'evento', 'concierto', 'entradas', 'boletos', 'copas', 'vino', 'pola', 'polas', 'ron', 'whisky', 'tequila', 'aguardiente', 'pisco', 'cachaca', 'bolos', 'billar', 'bowling', 'parque de diversiones', 'feria de juegos', 'estadio', 'partido', 'entrada al estadio'] },
      { id: 'ropa', color: '#3B82F6', nombre: 'Ropa', icono: '👕', tipo: 'gasto', nec: 'G', sri: 'vestimenta', montoMax: 400,
        palabras: ['ropa', 'zapatos', 'tenis', 'zapatillas', 'zapatos deportivos', 'sandalias', 'botas', 'camisa', 'camiseta', 'polo', 'playera', 'remera', 'franela', 'blusa', 'pantalon', 'pantalones', 'jean', 'jeans', 'short', 'shorts', 'bermuda', 'falda', 'vestido', 'chompa', 'buzo', 'sueter', 'saco', 'hoodie', 'casaca', 'campera',
          'medias', 'calcetines', 'ropa interior', 'calzoncillos', 'boxers', 'brasier', 'sosten', 'chaqueta', 'abrigo', 'uniforme', 'uniformes', 'gorra', 'sombrero', 'bufanda', 'guantes', 'cinturon', 'correa', 'cartera', 'bolso', 'mochila de moda', 'reloj', 'aretes', 'collar', 'anillo', 'bisuteria', 'de prati', 'eta fashion', 'zara', 'h m', 'bershka', 'pull and bear', 'forever 21', 'shein', 'nike', 'adidas', 'puma'] },
      { id: 'tecnologia', color: '#6366F1', nombre: 'Tecnología', icono: '🎧', tipo: 'gasto', nec: 'G', sri: null, montoMax: 2500,
        palabras: ['auriculares', 'audifonos', 'audifono', 'earbuds', 'airpods', 'cargador', 'cable usb', 'cable del celular', 'celular', 'telefono nuevo', 'smartphone', 'iphone', 'samsung', 'xiaomi', 'motorola', 'huawei', 'laptop', 'portatil', 'notebook', 'computadora', 'computador', 'pc', 'mouse', 'raton', 'teclado', 'monitor', 'pantalla', 'impresora', 'tinta', 'toner',
          'parlante', 'bocina', 'altavoz', 'bafle', 'consola', 'play station', 'playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'switch', 'videojuego', 'videojuegos', 'juego de video', 'tablet', 'ipad', 'smartwatch', 'reloj inteligente', 'camara', 'gopro', 'drone', 'dron', 'televisor', 'tv', 'television', 'smart tv', 'pendrive', 'usb', 'disco duro', 'router', 'modem', 'alexa', 'kindle', 'funda del celular', 'protector de pantalla', 'mica', 'power bank', 'bateria externa', 'steam', 'play store', 'app store', 'skin', 'compra en el juego', 'pavos', 'robux', 'diamantes'],
        pregunta: { texto: '¿Lo necesitas para tu trabajo o estudio?', opciones: [{ texto: 'Sí, para trabajar o estudiar', cat: 'tecnologia', nec: 'N' }, { texto: 'No, fue un gusto', cat: 'tecnologia', nec: 'G' }] } },
      { id: 'hogar', color: '#14B8A6', nombre: 'Casa y muebles', icono: '🛋️', tipo: 'gasto', nec: 'N', sri: null, montoMax: 3000,
        palabras: ['mueble', 'muebles', 'sofa', 'sillon', 'mesa', 'sillas', 'silla', 'cama', 'colchon', 'velador', 'closet', 'ropero', 'armario', 'estanteria', 'repisa', 'refrigeradora', 'refrigerador', 'nevera', 'heladera', 'lavadora', 'secadora', 'cocina', 'estufa', 'horno', 'microondas', 'licuadora', 'batidora', 'olla', 'ollas', 'olla arrocera', 'arrocera', 'sarten', 'vajilla', 'platos', 'vasos', 'cubiertos', 'cafetera', 'tostadora', 'plancha', 'aspiradora', 'ventilador', 'calefactor', 'aire acondicionado', 'electrodomestico', 'electrodomesticos',
          'sabanas', 'cobija', 'cobijas', 'edredon', 'almohada', 'almohadas', 'toallas', 'cortinas', 'alfombra', 'decoracion', 'cuadro', 'florero', 'foco', 'focos', 'bombillo', 'bombillos', 'ampolleta', 'herramientas', 'taladro', 'martillo', 'pintura', 'ferreteria', 'kywi', 'sodimac', 'homecenter', 'easy', 'home depot', 'ikea', 'sukasa', 'almacenes de prati hogar', 'comandato', 'artefacta', 'la ganga', 'marcimex', 'jardin', 'plantas', 'macetas'] },
      { id: 'suscripciones', color: '#E11D48', nombre: 'Suscripciones', icono: '📺', tipo: 'gasto', nec: 'G', sri: null, hormiga: false, montoMax: 60,
        palabras: ['netflix', 'spotify', 'disney', 'disney plus', 'hbo', 'hbo max', 'amazon prime', 'prime video', 'prime', 'youtube premium', 'youtube music', 'youtube', 'chatgpt', 'chat gpt', 'openai', 'claude', 'gemini', 'copilot', 'icloud', 'google one', 'google drive', 'dropbox', 'suscripcion', 'suscripciones', 'membresia', 'mensualidad de la app', 'apple music', 'apple tv', 'apple one', 'paramount', 'paramount plus', 'crunchyroll', 'deezer', 'tidal', 'twitch', 'patreon', 'onlyfans', 'canva', 'adobe', 'office 365', 'microsoft 365', 'xbox game pass', 'game pass', 'playstation plus', 'ps plus', 'nintendo online', 'vpn', 'nordvpn', 'duolingo', 'tinder', 'bumble', 'linkedin premium', 'star plus', 'vix', 'movistar play', 'directv go', 'win sports'] },
      { id: 'cuidado_personal', color: '#D97706', nombre: 'Cuidado personal', icono: '💈', tipo: 'gasto', nec: 'G', sri: null, montoMax: 150,
        palabras: ['peluqueria', 'barberia', 'barbero', 'corte de pelo', 'corte de cabello', 'motilado', 'tinte', 'mechas', 'alisado', 'keratina', 'manicure', 'pedicure', 'arreglo de unas', 'unas postizas', 'cejas', 'pestanas', 'depilacion', 'spa', 'masaje', 'maquillaje', 'cosmeticos', 'crema', 'cremas', 'perfume', 'colonia', 'desodorante', 'afeitadora', 'rasuradora', 'gimnasio', 'gym', 'smart fit', 'crossfit', 'yoga', 'pilates', 'natacion', 'cancha', 'cancha sintetica', 'futbol', 'pelota', 'balon', 'ropa deportiva'] },
      { id: 'mascotas', color: '#84CC16', nombre: 'Mascotas', icono: '🐶', tipo: 'gasto', nec: 'N', sri: 'mascotas', montoMax: 300,
        palabras: ['perro', 'perrito', 'gato', 'gatito', 'mascota', 'mascotas', 'veterinario', 'veterinaria', 'vacuna del perro', 'vacuna del gato', 'comida de perro', 'comida de gato', 'comida del perro', 'comida del gato', 'croquetas', 'balanceado', 'pro plan', 'dog chow', 'cat chow', 'pedigree', 'whiskas', 'arena para gato', 'arena del gato', 'collar del perro', 'correa del perro', 'peluqueria canina', 'bano del perro', 'desparasitante', 'antipulgas', 'pet shop', 'petshop'] },
      { id: 'turismo', color: '#0EA5E9', nombre: 'Turismo y viajes', icono: '✈️', tipo: 'gasto', nec: 'G', sri: 'turismo', montoMax: 5000,
        palabras: ['hotel', 'hostal', 'hospedaje', 'airbnb', 'booking', 'vuelo', 'vuelos', 'pasaje de avion', 'pasajes de avion', 'avion', 'aerolinea', 'latam', 'avianca', 'aeromexico', 'volaris', 'viva aerobus', 'sky', 'jetsmart', 'vacaciones', 'viaje', 'paseo', 'tour', 'excursion', 'playa', 'turismo', 'cabanas', 'cabana', 'camping', 'bus interprovincial', 'terminal terrestre', 'despegar', 'agencia de viajes', 'maleta', 'maletas', 'souvenir', 'recuerdos'] },
      { id: 'arte_cultura', color: '#9A6B3F', nombre: 'Arte y cultura', icono: '🎭', tipo: 'gasto', nec: 'G', sri: 'arte', montoMax: 300,
        palabras: ['museo', 'teatro', 'galeria', 'obra de teatro', 'clase de musica', 'clases de musica', 'clase de guitarra', 'clase de piano', 'clase de baile', 'clases de baile', 'curso de arte', 'curso de pintura', 'exposicion', 'feria del libro', 'libreria', 'instrumento', 'guitarra', 'piano', 'violin'] },
      { id: 'regalos', color: '#EC4899', nombre: 'Regalos y ayudas', icono: '🎁', tipo: 'gasto', nec: 'G', sri: null, montoMax: 500,
        palabras: ['regalo', 'regalos', 'obsequio', 'detalle', 'flores', 'ramo', 'torta de cumpleanos', 'pastel de cumpleanos', 'rifa', 'colecta', 'vaca', 'vaquita', 'donacion', 'donativo', 'limosna', 'diezmo', 'ofrenda', 'caridad', 'ayuda a mi mama', 'ayuda a mi papa', 'le di a mi mama', 'le di a mi papa', 'le mande a mi mama', 'le envie a mi mama', 'mesada', 'propina para', 'le preste', 'le presté'] },
      { id: 'deudas', color: '#64748B', nombre: 'Deudas y cuotas', icono: '🏦', tipo: 'gasto', nec: 'N', sri: null, montoMax: 5000,
        palabras: ['prestamo', 'cuota del prestamo', 'cuota del banco', 'cuota del credito', 'deuda', 'credito', 'pago del credito', 'dividendo', 'letra', 'letras', 'cuota del carro', 'cuota de la moto', 'cuota del celular', 'credito de consumo', 'microcredito', 'chulquero', 'chulco', 'prestamista', 'gota a gota', 'fiado', 'pague lo fiado', 'abono al prestamo', 'abono a la deuda', 'intereses del prestamo', 'cooperativa', 'pago a la cooperativa', 'casa de empeno', 'empeno', 'desempeno'] },
      { id: 'otros', color: '#94A3B8', nombre: 'Otros gastos', icono: '📦', tipo: 'gasto', nec: null, sri: null, palabras: [] },
      // ---- Ingresos
      { id: 'sueldo', color: '#10B981', nombre: 'Sueldo', icono: '💼', tipo: 'ingreso', nec: null, sri: null,
        palabras: ['sueldo', 'rol', 'rol de pagos', 'quincena', 'salario', 'pago del mes', 'nomina', 'mi sueldo', 'me pagaron el sueldo', 'cobre el sueldo', 'decimo', 'decimo tercero', 'decimo cuarto', 'aguinaldo', 'prima', 'gratificacion', 'utilidades', 'vacaciones pagadas', 'liquidacion', 'jubilacion', 'pension jubilar', 'sueldo quincenal', 'jornal'] },
      { id: 'extra', color: '#06B6D4', nombre: 'Ingreso extra', icono: '💵', tipo: 'ingreso', nec: null, sri: null,
        palabras: ['extra', 'ingreso extra', 'propina', 'propinas', 'trabajo extra', 'trabajito', 'cachuelo', 'chamba extra', 'chambita', 'camello', 'freelance', 'bono', 'comision', 'comisiones', 'horas extras', 'hora extra', 'turno extra', 'me pagaron un trabajo', 'un trabajo', 'arreglo que hice', 'servicio que di', 'rifa que gane', 'premio', 'loteria', 'apuesta'] },
      { id: 'ventas', color: '#F59E0B', nombre: 'Ventas', icono: '🏷️', tipo: 'ingreso', nec: null, sri: null,
        palabras: ['venta', 'ventas', 'vendi', 'vendimos', 'me compraron', 'marketplace', 'mercado libre', 'olx'] },
      { id: 'otros_ingresos', color: '#7A8CA3', nombre: 'Otros ingresos', icono: '🎁', tipo: 'ingreso', nec: null, sri: null,
        palabras: ['regalo', 'me regalaron', 'devolucion', 'reembolso', 'me devolvieron', 'me pagaron lo que me debian', 'me pagaron la deuda', 'me prestaron', 'prestamo que recibi', 'giro', 'remesa', 'me mandaron plata', 'me enviaron dinero', 'western union', 'interes', 'intereses de la cuenta', 'intereses del ahorro', 'arriendo que me pagan', 'renta que cobro', 'alquiler que cobro'] },
    ],

    // Palabras que piden «lo mismo que el mes pasado» o describen medidas: ayudan a saber que es compra para la casa (ingredientes).
    medidasHogar: ['libra', 'libras', 'kilo', 'kilos', 'kg', 'gramos', 'litro', 'litros', 'docena', 'media docena', 'funda', 'fundas', 'atado', 'atados', 'racimo', 'cubeta', 'carton', 'paquete', 'paquetes', 'quintal', 'arroba', 'saco', 'bolsa', 'bolsas'],

    /* ------------------------------------------------- GASTOS HORMIGA / 50-30-20 */
    hormiga: { montoMaximo: 5, minimoRepeticionesMes: 3 },
    regla503020: { necesario: 50, gusto: 30, ahorro: 20 },

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
    apariencia: {
      claro: {
        papel: '#EEF2F8', hoja: '#FFFFFF', tinta: '#0E1A2E', tinta2: '#56647A', linea: '#DDE4EE',
        panel: '#10233F', panelFondo: 'linear-gradient(165deg,#0B1A30 0%,#13294A 100%)', panelSuave: '#E4ECF8',
        acento: '#1F5FD6', botonFondo: '#1F5FD6',
        voz: '#2B6FEA', vozFondo: '#2B6FEA', sobreVoz: '#FFFFFF', naranja: '#E8751A',
        oro: '#E0A526', oroSuave: '#FBF0D5', sobreOro: '#5C3D00',
        gasto: '#C62F2F', gastoSuave: '#FBE4E4', gastoVivo: '#E04848',
        ingreso: '#0E8A5F', ingresoSuave: '#DDF3EA', ingresoVivo: '#1DB57A',
        aviso: '#8F5200', avisoSuave: '#FFF1D6',
        sobrePanel: '#FFFFFF', sobrePanel2: '#B9C6DA', sombraColor: 'rgba(15,35,63,0.20)',
      },
      oscuro: {
        papel: '#0A1424', hoja: '#111F36', tinta: '#F1F5FB', tinta2: '#9AA9C0', linea: 'rgba(255,255,255,0.09)',
        panel: '#10233F', panelFondo: 'linear-gradient(165deg,#0B1A30 0%,#14305A 100%)', panelSuave: '#1A2B49',
        acento: '#6AA5FF', botonFondo: '#2B6FEA',
        voz: '#2F7BFF', vozFondo: '#2F7BFF', sobreVoz: '#FFFFFF', naranja: '#F28A1B',
        oro: '#F2B63A', oroSuave: 'rgba(242,182,58,0.15)', sobreOro: '#F2B63A',
        gasto: '#FF7B7B', gastoSuave: 'rgba(255,107,107,0.15)', gastoVivo: '#FF5C5C',
        ingreso: '#37D6A1', ingresoSuave: 'rgba(55,214,161,0.15)', ingresoVivo: '#25C58E',
        aviso: '#FFC873', avisoSuave: 'rgba(255,200,115,0.13)',
        sobrePanel: '#FFFFFF', sobrePanel2: '#B9C6DA', sombraColor: 'rgba(0,0,0,0.55)',
      },
      // Colores que la persona puede elegir en Más → Ajustes → Apariencia. Solo cambian lo grande, los botones y el micrófono;
      // ingresos verde y gastos rojo no se tocan. 'azul' es el de origen.
      colores: [
        { id: 'marino', nombre: 'Azul', claro: {}, oscuro: {} },
        { id: 'petroleo', nombre: 'Petróleo',
          claro: { panel: '#0E3B43', panelFondo: 'linear-gradient(165deg,#09292F 0%,#0F525D 100%)', panelSuave: '#E0EFF2', acento: '#0F6674', botonFondo: '#0F6674', voz: '#0F7F90', vozFondo: '#0F7F90' },
          oscuro: { panel: '#0E3B43', panelFondo: 'linear-gradient(165deg,#09292F 0%,#0F525D 100%)', panelSuave: '#15303A', papel: '#08171C', hoja: '#0F252C', acento: '#6FD0DE', botonFondo: '#168798', voz: '#1BA3B8', vozFondo: '#1BA3B8' } },
        { id: 'grafito', nombre: 'Grafito',
          claro: { panel: '#1F2630', panelFondo: 'linear-gradient(165deg,#161B23 0%,#2C3644 100%)', panelSuave: '#E8ECF1', acento: '#2E3A4B', botonFondo: '#2E3A4B', voz: '#3A4960', vozFondo: '#3A4960' },
          oscuro: { panel: '#1F2630', panelFondo: 'linear-gradient(165deg,#161B23 0%,#2C3644 100%)', panelSuave: '#232C3A', papel: '#0D1117', hoja: '#161C25', acento: '#B4C2D6', botonFondo: '#4A5A72', voz: '#5C6E8A', vozFondo: '#5C6E8A' } },
        { id: 'logo', nombre: 'Naranja del logo',
          claro: { acento: '#C2610C', botonFondo: '#D9690F', voz: '#E8751A', vozFondo: '#E8751A', sobreVoz: '#1A0E00' },
          oscuro: { acento: '#FFA24D', botonFondo: '#D9690F', voz: '#F28A1B', vozFondo: '#F28A1B', sobreVoz: '#1A0E00' } },
      ],
      paleta: ['#F28A1B', '#2F6FD0', '#1DB57A', '#E04848', '#0EA5B7', '#D49A1E', '#4F6D8F', '#14917F', '#C2610C', '#7A8CA3'],
    },
  };

  /* ------------------------------------------------------------- Ayudas de lectura */
  PLAN.pais = (codigo) => PLAN.paises.find((p) => p.codigo === codigo) || PLAN.paises[PLAN.paises.length - 1];
  PLAN.categoria = (id) => PLAN.categorias.find((c) => c.id === id) || null;

  AF.PLAN = PLAN;
  if (typeof module === 'object' && module.exports) module.exports = PLAN;
})(typeof window !== 'undefined' ? window : globalThis);
