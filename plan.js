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
      version: '1.1.0',
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
      permitirSinCuenta: true,                    // PROVISIONAL: botón «Probar sin cuenta» (datos solo en este teléfono). Ponlo en false cuando Google y Facebook ya funcionen
      facebookPermisos: ['public_profile', 'email'],
      facebookVersion: 'v23.0',                   // versión de la API de Facebook para la web (solo la usa la versión instalada desde Chrome)
      // La copia en Google Drive solo existe si la persona entró con Google (Facebook no tiene Drive).
      bloquearTrasSegundos: 86400,                 // 24 h: solo pide PIN si la app estuvo cerrada mucho tiempo (en la práctica solo cuando se reinicia)
      pinMin: 4,
      pinMax: 6,
      intentosPinMax: 5,
      esperaTrasIntentosSeg: 60,
      pbkdf2Iteraciones: 150000,
      cerrarSesionBorraDatos: false,              // false = los datos quedan cifrados en el teléfono
    },

    /* ------------------------------------------------------------ BIENVENIDA */
    // Preguntas de la primera vez, después de iniciar sesión (cortas, todas editables luego).
    bienvenida: {
      preguntas: ['nombre', 'pais', 'moneda', 'diaCobro', 'sueldo', 'cargas', 'tarjetas'],
      sueldoOpcional: true,
      cargasSoloSiSRI: true,                      // "cargas familiares" solo si el país tiene módulo SRI
      diaCobroDefecto: 1,
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
    prueba: { iniciaAlCrearCuenta: true, diasProGratis: 3 },
    precios: {                                    // PROVISIONAL (a decidir con Luis)
      mensualUSD: 2.99,
      anualUSD: 19.99,
      productosPlay: { mensual: 'pro_mensual', anual: 'pro_anual' },
      invitarAmigoMesesPro: 1,
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
      puedesGastarHoyCompleto: { g: false, p: true  },
      categoriasNecesarioGusto:{ g: true,  p: true  },
      hormigaTotal:            { g: true,  p: true  },
      hormigaDetalle:          { g: false, p: true  },
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
    // sri: rubro del formulario de gastos personales (solo Ecuador).  palabras: SIN tildes, minúsculas.
    // Las palabras de varias palabras ganan a las de una sola ("tanque de gas" > "tanque").
    categorias: [
      // ---- Gastos
      { id: 'comida_hogar', color: '#22C55E', nombre: 'Comida del hogar', icono: '🛒', tipo: 'gasto', nec: 'N', sri: 'alimentacion',
        palabras: ['mercado', 'supermercado', 'super', 'supermaxi', 'megamaxi', 'comisariato', 'mi comisariato', 'tia', 'santa maria',
          'gran aki', 'aki', 'tienda', 'tiendita', 'abarrotes', 'verduras', 'frutas', 'carne', 'pollo', 'huevos', 'leche', 'arroz',
          'despensa', 'viveres', 'fruta', 'verdura', 'legumbres', 'compras de la casa', 'compras del mes', 'granos', 'pan', 'panaderia', 'queso', 'aceite', 'azucar'] },
      { id: 'servicios', color: '#F59E0B', nombre: 'Servicios básicos', icono: '💡', tipo: 'gasto', nec: 'N', sri: null,
        palabras: ['luz', 'electricidad', 'agua', 'agua potable', 'internet', 'telefono', 'plan celular', 'recarga', 'recargas', 'gas',
          'tanque de gas', 'cnel', 'planilla', 'planillas', 'alicuota', 'cable', 'tv cable', 'wifi', 'basura'] },
      { id: 'vivienda', color: '#3D6FB6', nombre: 'Vivienda', icono: '🏠', tipo: 'gasto', nec: 'N', sri: 'vivienda',
        palabras: ['arriendo', 'alquiler', 'hipoteca', 'predial', 'impuesto predial', 'reparacion de la casa', 'plomero', 'electricista'] },
      { id: 'transporte', color: '#06B6D4', nombre: 'Transporte', icono: '🚌', tipo: 'gasto', nec: 'N', sri: null,
        palabras: ['pasaje', 'pasajes', 'bus', 'buseta', 'taxi', 'uber', 'cabify', 'indrive', 'in drive', 'carrera', 'metro', 'trolebus',
          'ecovia', 'peaje', 'parqueadero', 'parqueo', 'mecanico', 'llanta', 'llantas', 'repuestos', 'cambio de aceite',
          'matricula vehicular', 'lavada del carro'] },
      { id: 'combustible', color: '#EF4444', nombre: 'Combustible', icono: '⛽', tipo: 'gasto', nec: 'N', sri: null,
        palabras: ['gasolina', 'gasolina extra', 'gasolina super', 'diesel', 'eco pais', 'ecopais', 'gasolinera', 'tanqueada', 'tanquee',
          'tanque lleno', 'combustible', 'primax', 'terpel', 'petroecuador'],
        palabrasDebiles: ['extra', 'tanque'] },
      { id: 'salud', color: '#D6455D', nombre: 'Salud', icono: '💊', tipo: 'gasto', nec: 'N', sri: 'salud',
        palabras: ['farmacia', 'medicina', 'medicinas', 'pastillas', 'doctor', 'doctora', 'medico', 'consulta', 'examen medico', 'examenes',
          'laboratorio', 'dentista', 'odontologo', 'hospital', 'clinica', 'fybeca', 'cruz azul', 'sana sana', 'vacuna', 'terapia',
          'psicologo', 'lentes', 'optica', 'receta', 'antibiotico', 'inyeccion'] },
      { id: 'educacion', color: '#0E7490', nombre: 'Educación', icono: '🎓', tipo: 'gasto', nec: 'N', sri: 'educacion',
        palabras: ['colegio', 'escuela', 'universidad', 'matricula', 'pension', 'curso', 'libros', 'utiles', 'utiles escolares',
          'cuaderno', 'cuadernos', 'mensualidad', 'clases', 'tutoria', 'inscripcion'] },
      { id: 'comida_fuera', color: '#FF7A00', nombre: 'Comida fuera', icono: '🍔', tipo: 'gasto', nec: 'G', sri: 'alimentacion', hormiga: true,
        palabras: ['restaurante', 'almuerzo', 'desayuno', 'cena', 'comida rapida', 'salchipapa', 'salchipapas', 'chuzo', 'chuzos', 'hornado',
          'fritada', 'encebollado', 'ceviche', 'empanada', 'empanadas', 'hamburguesa', 'pizza', 'kfc', 'mcdonalds', 'menu',
          'almuerzo ejecutivo', 'caldo', 'bolon', 'tigrillo', 'sanduche', 'sushi', 'parrillada', 'asado', 'shawarma', 'tacos',
          'comi', 'cene', 'almorce', 'desayune', 'colada', 'colada morada', 'guaguas de pan', 'fanesca', 'guatita', 'llapingachos',
          'yaguarlocro', 'morocho', 'humitas', 'tamales', 'quimbolitos', 'cuy', 'churrasco', 'menestra', 'bolones', 'espumilla', 'cholado',
          'seco de pollo', 'pollo asado', 'broaster', 'jugo natural', 'batido'],
        palabrasDebiles: ['comida'] },
      { id: 'antojos', color: '#F59E8B', nombre: 'Antojos', icono: '🍦', tipo: 'gasto', nec: 'G', sri: 'alimentacion', hormiga: true,
        palabras: ['helado', 'helados', 'cola', 'coca', 'coca cola', 'cocacola', 'gaseosa', 'jugo', 'cafe', 'cafecito', 'galletas',
          'chocolate', 'dulce', 'dulces', 'caramelos', 'chicles', 'snack', 'snacks', 'papitas', 'papas fritas', 'chifles', 'gatorade', 'agua mineral',
          'energizante', 'red bull', 'pastel', 'pasteles', 'torta', 'tortas', 'dona', 'donas',
          'canguil', 'golosina', 'golosinas', 'colita'] },
      { id: 'salidas', color: '#D4537E', nombre: 'Salidas', icono: '🎉', tipo: 'gasto', nec: 'G', sri: null,
        palabras: ['cine', 'bar', 'cerveza', 'cervezas', 'birra', 'birras', 'chela', 'chelas', 'trago', 'tragos', 'discoteca', 'fiesta',
          'salida', 'salidas', 'salida con amigos', 'amigos', 'cumpleanos', 'karaoke', 'juntada', 'evento', 'concierto', 'entradas',
          'copas', 'vino', 'pola', 'polas'] },
      { id: 'ropa', color: '#3B82F6', nombre: 'Ropa', icono: '👕', tipo: 'gasto', nec: 'G', sri: 'vestimenta',
        palabras: ['ropa', 'zapatos', 'tenis', 'camisa', 'camiseta', 'pantalon', 'jean', 'jeans', 'vestido', 'chompa', 'de prati',
          'zapatillas', 'medias', 'ropa interior', 'chaqueta', 'abrigo', 'uniforme', 'uniformes'] },
      { id: 'compras_grandes', color: '#14B8A6', nombre: 'Compras grandes', icono: '🛍️', tipo: 'gasto', nec: 'G', sri: null,
        palabras: ['celular', 'laptop', 'computadora', 'computador', 'televisor', 'tv', 'refrigeradora', 'lavadora', 'electrodomestico',
          'mueble', 'muebles', 'colchon', 'moto', 'bicicleta', 'consola', 'tablet', 'parlante', 'play station', 'playstation'] },
      { id: 'suscripciones', color: '#E11D48', nombre: 'Suscripciones', icono: '📺', tipo: 'gasto', nec: 'G', sri: null,
        palabras: ['netflix', 'spotify', 'disney', 'disney plus', 'hbo', 'amazon prime', 'prime video', 'youtube premium', 'chatgpt',
          'icloud', 'google one', 'suscripcion', 'apple music', 'paramount', 'crunchyroll'] },
      { id: 'cuidado_personal', color: '#D97706', nombre: 'Cuidado personal', icono: '💈', tipo: 'gasto', nec: 'G', sri: null,
        palabras: ['peluqueria', 'barberia', 'corte de pelo', 'manicure', 'spa', 'maquillaje', 'perfume', 'gimnasio', 'gym'] },
      { id: 'mascotas', color: '#84CC16', nombre: 'Mascotas', icono: '🐶', tipo: 'gasto', nec: 'N', sri: 'mascotas',
        palabras: ['perro', 'gato', 'mascota', 'mascotas', 'veterinario', 'veterinaria', 'comida de perro', 'comida de gato', 'balanceado',
          'arena para gato'] },
      { id: 'turismo', color: '#0EA5E9', nombre: 'Turismo y viajes', icono: '✈️', tipo: 'gasto', nec: 'G', sri: 'turismo',
        palabras: ['hotel', 'hostal', 'vuelo', 'pasaje de avion', 'pasajes de avion', 'avion', 'vacaciones', 'viaje', 'paseo', 'tour',
          'playa', 'turismo', 'hospedaje', 'cabanas'] },
      { id: 'arte_cultura', color: '#9A6B3F', nombre: 'Arte y cultura', icono: '🎭', tipo: 'gasto', nec: 'G', sri: 'arte',
        palabras: ['museo', 'teatro', 'galeria', 'obra de teatro', 'clase de musica', 'curso de arte'] },
      { id: 'deudas', color: '#64748B', nombre: 'Deudas y cuotas', icono: '🏦', tipo: 'gasto', nec: 'N', sri: null,
        palabras: ['prestamo', 'cuota del prestamo', 'cuota del banco', 'deuda', 'credito', 'pago del credito', 'dividendo',
          'pague la tarjeta', 'pago de la tarjeta', 'pago tarjeta', 'abonar tarjeta', 'abono tarjeta', 'pagar la tarjeta',
          'pague mi tarjeta', 'pago de tarjeta', 'abono de tarjeta', 'pague del banco', 'pago al banco'] },
      { id: 'otros', color: '#94A3B8', nombre: 'Otros gastos', icono: '📦', tipo: 'gasto', nec: null, sri: null, palabras: [] },
      // ---- Ingresos
      { id: 'sueldo', color: '#10B981', nombre: 'Sueldo', icono: '💼', tipo: 'ingreso', nec: null, sri: null,
        palabras: ['sueldo', 'rol', 'quincena', 'salario', 'pago del mes', 'nomina', 'mi sueldo'] },
      { id: 'extra', color: '#06B6D4', nombre: 'Ingreso extra', icono: '💵', tipo: 'ingreso', nec: null, sri: null,
        palabras: ['extra', 'ingreso extra', 'propina', 'propinas', 'trabajo extra', 'bono', 'comision', 'horas extras', 'trabajito'] },
      { id: 'ventas', color: '#F59E0B', nombre: 'Ventas', icono: '🏷️', tipo: 'ingreso', nec: null, sri: null,
        palabras: ['venta', 'ventas', 'vendi'] },
      { id: 'otros_ingresos', color: '#7A8CA3', nombre: 'Otros ingresos', icono: '🎁', tipo: 'ingreso', nec: null, sri: null,
        palabras: ['regalo', 'devolucion', 'reembolso', 'me devolvieron'] },
    ],

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
