/* CATÁLOGO DE BANCOS Y TARIFAS — es la ÚNICA tabla de bancos de la app.
   Se puede reemplazar sin publicar versión: PLAN.remoto.urlTarifas apunta a un JSON con esta misma forma (ver bancos.js → actualizarRemoto).

   REGLAS (no negociables):
   - Solo van cifras que se leyeron en un documento oficial del banco o de la autoridad. Cada banco con datos trae `fuente` (documento, vigencia, enlace).
   - Lo que no se pudo leer con certeza NO se escribe: queda sin dato y la app le pide a la persona que lo anote ella.
   - Los textos de `costos` ya vienen con IVA (15 %) salvo que digan lo contrario. Son informativos: manda el estado de cuenta.
   - Tasas: la app calcula con tasa NOMINAL anual (cuota = tasa/12). Los bancos publican la EFECTIVA; bancos.js convierte (16,77 % efectiva ≈ 15,60 % nominal). */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});

  const sinDatos = null;

  // Avance «$X + IVA por cada fracción de $100» (rangos x01 a x00,99; los centavos cuentan en el rango menor).
  // Devuelve [desde, valorConIVA] para n tramos: n × base y luego el IVA, en centavos enteros (así no hay errores de decimales).
  const tramos100 = (desdeUsd, n, baseUsd, ivaPct) => Array.from({ length: n }, (_, i) => {
    const base = Math.round(baseUsd * 100) * (i + 1);
    return [i === 0 ? desdeUsd : i * 100 + 1, (base + Math.round((base * ivaPct) / 100)) / 100];
  });

  // Texto de una tabla de avance a partir de sus escalones: «$7,19 hasta $100,99 · $12,32 hasta $200,99 · … · $316,25 desde $10.001».
  // Así el texto que se muestra nunca se contradice con los valores con los que calcula la app.
  const usd = (n) => { const [e, d] = Math.abs(n).toFixed(2).split('.'); return '$' + e.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d; };
  const rangosTexto = (esc) => esc.map(([desde, valor], i) => (i + 1 < esc.length ? usd(valor) + ' hasta ' + usd(esc[i + 1][0] - 0.01) : usd(valor) + ' desde ' + usd(desde))).join(' · ');

  // Banco Guayaquil: el tarifario de junio 2026 trae DOS tablas de avance que se traslapan y no dice cuál manda; se publican las dos, tal cual.
  // Tabla «Avances en efectivo local — rangos estándar» (p. 7): columna «cajero automáticos, banca electrónica y banca móvil» y columna «oficina y corresponsales no bancarios».
  const GYE_CAJERO = [[0, 7.19], [101, 12.32], [201, 17.46], [301, 25.67], [401, 30.81], [501, 53.39], [801, 57.50], [901, 76.73], [1001, 82.14], [1301, 87.27], [1401, 92.41], [1501, 98.58], [2001, 127.33], [3001, 156.08], [4001, 184.83], [5001, 213.58], [6001, 242.33], [7001, 271.08], [8001, 287.50], [10001, 299.83]];
  const GYE_OFICINA = [[0, 20.54], [301, 28.75], [401, 34.50], [501, 46.21], [601, 51.34], [701, 53.39], [801, 57.50], [901, 77.00], [1001, 82.14], [1301, 87.27], [1401, 92.41], [1501, 99.60], [1601, 106.79], [1701, 113.98], [1801, 115.00], [2001, 143.75], [3001, 172.50], [4001, 201.25], [5001, 230.00], [6001, 258.75], [7001, 287.50], [10001, 316.25]];
  // Tabla «Avances en efectivo exterior» (p. 8): «cajeros / internet, propios, locales o del exterior» y «ventanilla local o del exterior».
  const GYE_CAJERO_EXT = [[1, 7.19], [101, 12.32], [201, 17.46], [301, 22.59], [401, 27.73], [501, 53.39]];
  const GYE_VENTANILLA = [[1, 20.54], [301, 25.67], [401, 30.81], [501, 35.94], [601, 41.07], [701, 46.21], [801, 51.34], [901, 56.48], [1001, 64.69], [2001, 86.25], [3001, 115.00], [4001, 143.75], [5001, 172.50], [6001, 201.25], [7001, 230.00], [8001, 258.75], [9001, 287.50], [10001, 316.25]];

  AF.CATALOGO_BANCOS = {
    version: 1,
    actualizado: '2026-11-06',

    // Techo legal por país (no es la tasa de tu tarjeta: tu banco puede cobrar menos).
    techoLegal: {
      EC: {
        efectivaAnual: 16.77,
        etiqueta: 'Techo legal del crédito de consumo',
        vigencia: 'marzo 2026',
        fuente: 'Junta de Política y Regulación Financiera, según El Diario (4 mar. 2026)',
        url: 'https://www.eldiario.ec/negocios/bancos-en-ecuador-estas-son-las-tasas-de-interes-vigentes-para-los-servicios-financieros-este-2026-04032026/',
      },
    },

    bancos: [
      /* ------------------------------------------------------------------ ECUADOR */
      {
        // Tarifario «web» de noviembre 2026, sección 3.5 «Servicios financieros tarjetas de crédito», Personas (Visa, Discover y Mastercard). Actualizado desde el de febrero 2026.
        // No explica cómo funciona el corriente (días sin interés, pago mínimo): solo publica tasas y tarifas. Tampoco trae el recargo de mora (dice «según regulación del Banco Central»).
        // Los niveles usan los nombres de los productos del tarifario (el plan de recompensas se cobra por producto). Su logo oficial es un SVG.
        id: 'ec-pichincha', pais: 'EC', nombre: 'Banco Pichincha', corto: 'Pichincha',
        redes: ['Visa', 'Mastercard', 'Discover'],
        niveles: ['Premium Miles / Joven Miles', 'Prestige Miles', 'Platinum Miles', 'Signature Miles', 'Infinite / Black Miles', 'Discover'],
        fuente: { texto: 'Tarifario de servicios financieros de Banco Pichincha (noviembre 2026), sección 3.5 (tarjetas de crédito, personas)', vigencia: 'noviembre 2026',
          url: 'https://www.pichincha.com/transparencia' },
        tarifarioUrl: 'https://www.pichincha.com/sites/default/files/documents/2026-10/tarifario-web-noviembre-2026.pdf',
        // Tasa que el banco publica para personas: la misma para diferido (todos los plazos) y rotativo. Es igual al máximo legal.
        tasaPublicada: { efectivaAnual: 16.77, aplicaA: 'diferido y rotativo (personas)' },
        // Avance: $4,46 + IVA por cada $100 o fracción, máximo $133,80 + IVA; mismo valor en cajero propio, cajero local, exterior y oficina/web/teléfono.
        avance: { tipo: 'porCada100', baseUsd: 4.46, topeBaseUsd: 133.80, ivaPct: 15 },
        recompensasPorNivel: {
          'Premium Miles / Joven Miles': 'Plan de recompensas $11,50 · prestaciones en el exterior $8,05 (Premium Miles, Internacional Microfinanzas, Premium Microfinanzas Miles y Joven Miles)',
          'Prestige Miles': 'Plan de recompensas $26,45 · prestaciones en el exterior $12,65',
          'Platinum Miles': 'Plan de recompensas $32,20 · prestaciones en el exterior $18,40',
          'Signature Miles': 'Plan de recompensas $50,60 · prestaciones en el exterior $23,00',
          'Infinite / Black Miles': 'Plan de recompensas $62,10 · prestaciones en el exterior $27,60 (Infinite Miles, Elite Privilege Miles, Quantum, Black Miles y Business Black)',
          'Discover': 'Plan de recompensas $26,45 (Discover, Discover Microfinanzas y Discover Me); el tarifario no trae prestaciones en el exterior para Discover',
        },
        costos: {
          avance: { texto: '$5,13 por cada $100 (o fracción) · máximo $153,87',
            nota: '$4,46 + IVA por cada $100 o fracción, con máximo de $133,80 + IVA. Igual en cajeros propios, cajeros locales, exterior y oficina, web o teléfono. Los intereses del avance van aparte.' },
          diferido: { texto: '16,77 % efectivo anual, igual para todos los plazos', nota: 'Plazos de 2, 3, 6, 9, 12, 24 y 36 meses en adelante: todos 16,77 %. El tarifario no publica factores por plazo.' },
          rotativo: { texto: '16,77 % efectivo anual', nota: 'Es igual al máximo legal del crédito de consumo. El tarifario solo publica tasas y tarifas: no explica los días sin interés ni el pago mínimo; míralo en tu contrato o estado de cuenta.' },
          mantenimiento: { texto: '$0,00', nota: 'Mantenimiento con pago mínimo y con pago total, bloqueo o cancelación, reclamos y estado de cuenta a domicilio: $0,00.' },
          uso: { texto: 'Exterior: $1,96 por consumos de más de $100 · $1,02 por consulta en cajero del exterior',
            nota: 'Gasolineras: $0,23 por consumo. Su tarifario no trae otros cobros por usar la tarjeta, pero tampoco dice expresamente $0,00 para los consumos nacionales. Segunda entrega de la clave: $1,73. Paquete de mensajes (SMS) con tus transacciones o con el manejo de tu tarjeta, pedido en oficina: $2,01.' },
          emision: { texto: '$5,03', nota: 'Emisión y renovación con chip. La renovación aplica cuando vence el plástico.' },
          reposicion: { texto: '$5,03 en agencia o courier · $30,23 en el exterior' },
          recompensas: { texto: '$11,50 a $62,10 según el producto',
            nota: 'Plan de recompensas por producto: Premium Miles y Joven Miles $11,50 · Prestige $26,45 · Platinum $32,20 · Signature $50,60 · Infinite, Elite Privilege, Quantum, Black y Business Black $62,10 · Discover $26,45. Prestaciones en el exterior: $8,05 · $12,65 · $18,40 · $23,00 · $27,60 en ese mismo orden. El tarifario no dice cada cuánto se cobra.' },
          voucher: { texto: '$2,06 local · $10,27 del exterior' },
          estado: { texto: 'A domicilio $0,00 · copia $0,52', nota: 'Referencias bancarias: $2,59. Corte impreso de movimientos: $1,87.' },
          pagoTarjeta: { texto: '$0,39 por banca telefónica, celular, internet o kiosko · $0,45 por ventanilla, corresponsal, entidades auxiliares o cajero', nota: 'Cheque devuelto: $2,86 (nacional) o $3,32 (exterior, más $15,00 que se transfieren al banco del exterior).' },
          gasolinera: { texto: '$0,23 por consumo' },
          cobranza: { texto: 'De $6,38 a $43,99 sin IVA (con IVA, de $7,34 a $50,59: cálculo de la app)',
            nota: 'Si te atrasas: depende de la deuda y los días de mora. 1 a 30 días: $6,38 · $7,35 · $7,92 · $8,32 · $8,63 · $8,88. 31 a 60: $16,23 · $16,46 · $17,83 · $20,34 · $23,99 · $28,78. 61 a 90: $23,17 · $23,85 · $25,27 · $27,43 · $30,34 · $34,01. Más de 90: $25,56 · $26,46 · $29,03 · $32,72 · $37,70 · $43,99; por deuda de menos de $100 · $100–199 · $200–299 · $300–499 · $500–999 · más de $1.000. Para $100–199 con más de 90 días su tabla dice $26,46 y los otros bancos publican $26,64: puede ser un error de digitación. Su nota dice «IVA no detallado en el estado de cuenta» y que todas las tarifas gravan el 15 % de IVA.' },
          mora: { texto: 'La fija el Banco Central', nota: 'El tarifario solo dice "según regulación del Banco Central": no publica el porcentaje.' },
        },
      },
      {
        id: 'ec-produbanco', pais: 'EC', nombre: 'Produbanco', corto: 'Produbanco',
        redes: ['Visa', 'Mastercard', 'Otra'],
        fuente: { texto: 'Tarifario de tarjetas de crédito y tarifas (octubre 2026) y pizarra de tasas (noviembre 2026)', vigencia: 'octubre y noviembre 2026',
          url: 'https://www.produbanco.com.ec/normas-de-transparencia/tasas-de-interes-y-tarifas/' },
        // Tasa efectiva anual para personas (segmento Consumo): la misma para diferido y rotativo.
        tasaPublicada: { efectivaAnual: 16.77, aplicaA: 'diferido y rotativo (personas, segmento Consumo)' },
        // Escalones: desde ese monto (USD) y hasta antes del siguiente, el valor final con IVA.
        avance: { tipo: 'escalones', escalones: [
          [0, 7.19], [101, 12.32], [201, 17.46], [301, 25.67], [401, 30.81], [501, 35.94], [601, 41.07], [701, 46.21], [801, 51.34],
          [901, 56.48], [1101, 61.55], [1201, 66.68], [1301, 71.81], [1401, 76.94], [1501, 82.06], [1601, 87.19], [1701, 92.32],
          [1801, 97.45], [1901, 102.58], [2001, 107.71], [2101, 112.84], [2201, 117.97], [2301, 123.10], [2401, 128.23],
          [2501, 133.35], [2601, 138.48], [2701, 143.61], [2801, 148.74], [2901, 153.87], [5001, 172.50], [6001, 201.25],
          [7001, 230.00], [8001, 258.75], [9001, 287.50],
        ] },
        // Programa de recompensas y prestaciones en el exterior, por segmento del tarifario (valor con IVA).
        recompensasPorNivel: {
          'Black': '$62,10 recompensa + $27,60 prestaciones en el exterior',
          'Infinite': '$62,10 recompensa + $27,60 prestaciones en el exterior',
          'Signature': '$50,60 recompensa + $23,00 prestaciones en el exterior',
          'Platinum': '$32,20 recompensa + $18,40 prestaciones en el exterior',
          'Gold': '$26,45 recompensa + $12,65 prestaciones en el exterior',
          'Clásica': '$11,50 recompensa + $8,05 prestaciones en el exterior (la Clásica básica no cobra recompensa: solo $8,05)',
        },
        costos: {
          rotativo: { texto: '16,77 % efectivo anual',
            nota: 'Si pagas el 100 % del saldo hasta la fecha máxima de pago, no se cobra interés de consumo corriente. Si pagas una parte, o pagas después de la fecha, se cobra interés. Tasa publicada para personas (segmento Consumo).' },
          diferido: { texto: '16,77 % efectivo anual, igual para todos los plazos (2 a 24 meses)',
            nota: 'El interés se calcula por los días reales entre la compra y cada pago. Factor de referencia para estimar el interés total: 2 meses 1,95 % · 3 meses 2,61 % · 6 meses 4,60 % · 9 meses 6,61 % · 12 meses 8,65 % · 24 meses 17,05 %. Una compra diferida entra al estado de cuenta si pasaron más de 30 días desde la compra hasta la fecha máxima de pago; si no, pasa al estado siguiente.' },
          tasa: { texto: '16,77 % efectivo anual (máxima publicada para consumo)', nota: 'Es la tasa efectiva máxima del segmento Consumo según el Banco Central para noviembre de 2026.' },
          mora: { texto: 'Hasta 1,1 veces la tasa pactada', nota: 'La mora se cobra con un recargo de hasta 10 % sobre la tasa pactada o vigente para esa obligación.' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta', nota: 'También $0,00: activación, mantenimiento, pago mínimo, pago total, bloqueo, notificaciones. En gasolineras se cobra $0,23 por consumo.' },
          mantenimiento: { texto: '$0,00' },
          avance: { texto: 'Desde $7,19 hasta $287,50 según el monto', nota: 'Escalonado: $7,19 hasta $100,99; $12,32 hasta $200,99; $17,46 hasta $300,99… El documento no separa avance en cajero, ventanilla o exterior. Los intereses del avance son aparte.' },
          emision: { texto: '$5,03 con chip (emisión y renovación) · $0,00 con banda lectora' },
          reposicion: { texto: '$5,03 con chip · $0,00 con banda lectora · en el exterior $77,00 Visa y $154,02 Mastercard' },
          voucher: { texto: '$2,06 local · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta Produbanco · $0,45 si pagas una tarjeta de otra entidad' },
          gasolinera: { texto: '$0,23 por consumo' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA', nota: 'Si te atrasas: depende de la cuota vencida y los días. Desde $7,34 (1 a 30 días, menos de $100) hasta $50,59 (más de 90 días, desde $1.000).' },
        },
        // No publica en estos documentos: cuota anual de la tarjeta (más allá del programa de recompensas) ni tarjetas adicionales.
      },
      {
        id: 'ec-bolivariano', pais: 'EC', nombre: 'Banco Bolivariano', corto: 'Bolivariano', redes: ['Visa', 'Mastercard', 'UnionPay', 'Otra'],
        // Sus tarjetas de crédito las maneja «Bankard» (el procesador de tarjetas del banco): por eso su pizarra de tasas se llama «Tasas Bankard».
        fuente: { texto: 'Tarifario de servicios financieros Banco Bolivariano y Bankard (octubre–diciembre 2026), pizarra de tasas (vigente desde el 1 de octubre de 2026) y tabla «Tasas Bankard» (sin fecha)', vigencia: 'octubre a diciembre 2026',
          url: 'https://www.bolivariano.com/informacion-institucional/transparencia-de-la-informacion' },
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjetas de crédito (Visa, Mastercard y UnionPay), rotativo y diferido' },
        // Avance en cajero automático (local o exterior): desde ese monto (USD) y hasta antes del siguiente, el valor final con IVA.
        avance: { tipo: 'escalones', escalones: [[0, 7.19], [101, 12.32], [201, 17.46], [301, 22.59], [401, 27.73], [501, 53.39]],
          otrosCanales: { etiqueta: 'Oficina, medios virtuales o corresponsal', escalones: [[0, 20.54], [301, 25.67], [401, 30.81], [501, 35.94], [601, 41.07], [701, 46.21], [801, 51.34], [901, 56.48], [1001, 61.61], [2001, 66.75], [3001, 71.88]] } },
        recompensasPorNivel: {
          'Black': '$62,10 recompensa + $27,60 prestaciones en el exterior',
          'Infinite': '$62,10 recompensa + $27,60 prestaciones en el exterior',
          'Signature': '$50,60 recompensa + $23,00 prestaciones en el exterior',
          'Platinum': '$32,20 recompensa + $18,40 prestaciones en el exterior',
          'Gold': '$26,45 recompensa + $12,65 prestaciones en el exterior',
          'Clásica': '$11,50 recompensa + $8,05 prestaciones en el exterior',
        },
        costos: {
          rotativo: { texto: '15,60 % nominal anual (16,77 % efectivo)', nota: 'Tasa publicada para tarjetas de crédito de consumo (Visa, Mastercard y UnionPay). Los documentos del banco no explican cuándo se cobra o no el interés del consumo corriente: pregúntalo en tu estado de cuenta.' },
          diferido: { texto: '15,60 % nominal anual, igual para todos los plazos (3 a 84 meses)',
            nota: 'Factor de referencia para estimar el interés total: 3 meses 2,61 % · 6 meses 4,60 % · 9 meses 6,61 % · 12 meses 8,65 % · 18 meses 12,80 % · 24 meses 17,05 % · 36 meses 25,86 % · 48 meses 35,05 % · 60 meses 44,64 % · 72 meses 54,60 % · 84 meses 64,93 %.' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual', nota: 'Es la tasa de consumo para tarjetas de crédito, vigente desde el 1 de octubre de 2026.' },
          mora: { texto: 'Recargo hasta: 5 % (1 a 15 días) · 7 % (16 a 30) · 9 % (31 a 60) · 10 % (más de 60)', nota: 'La pizarra lo presenta como recargo por morosidad según los días de atraso.' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta', nota: 'También $0,00: activación, mantenimiento, pago mínimo, pago total, bloqueo, adicionales y frecuencia de transacciones. En el exterior, consumos de más de $100 cobran $1,96; en gasolineras $0,23.' },
          mantenimiento: { texto: '$0,00', nota: 'Incluye pago mínimo y pago total.' },
          avance: { texto: 'Cajero: desde $7,19 hasta $53,39 · oficina o virtual: desde $20,54 hasta $71,88', nota: 'Cajero: $7,19 hasta $100,99; $12,32 hasta $200,99; $17,46 hasta $300,99; $22,59 hasta $400,99; $27,73 hasta $500,99; $53,39 desde $501. Los intereses del avance son aparte.' },
          cobranza: { texto: 'De $6,38 a $43,99 más IVA', nota: 'Si te atrasas: depende de la cuota vencida y los días. Desde $6,38 (1 a 30 días, cuota menor a $100) hasta $43,99 (más de 90 días, desde $1.000), sin IVA.' },
          emision: { texto: '$5,03 con chip (emisión y renovación) · $0,00 con banda lectora' },
          reposicion: { texto: '$5,03 con chip · $0,00 por migración o falla de banda · en el exterior $51,34' },
          recompensas: { texto: '$11,50 a $62,10 según el producto', nota: 'Plan de recompensas (Fast Point): depende del segmento de tu tarjeta.' },
          voucher: { texto: '$2,06 local · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta por los canales del banco' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },
      {
        id: 'ec-pacifico', pais: 'EC', nombre: 'Banco del Pacífico', corto: 'Pacífico', redes: ['Visa', 'Mastercard', 'Otra'],
        niveles: ['Clásica', 'Gold', 'Platinum', 'Infinite', 'Black', 'Premium (Legend)', 'Corporativa'],
        fuente: { texto: 'Tabla de remuneraciones por servicios (vigente desde el 23 de febrero de 2026), pizarra de operaciones de crédito (1 al 30 de noviembre de 2026) y contrato de tarjeta de crédito persona natural (2026)', vigencia: 'febrero y noviembre 2026',
          url: 'https://www.bancodelpacifico.com/transparencia-de-informacion' },
        tarifarioUrl: 'https://www.bancodelpacifico.com/BancoPacifico/media/pdf/TranspInformacion/2026/Tabla_de_remuneraciones_x_servicios.pdf',
        // Tasa máxima del segmento Consumo en su pizarra: nominal 15,6042 % y efectiva 16,77 %.
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'consumo (diferido y rotativo)' },
        // Avance en cajero automático (en el país o en el exterior): desde ese monto (USD) y hasta antes del siguiente, el valor final con IVA.
        avance: { tipo: 'escalones', escalones: [[0, 7.19], [101, 12.32], [201, 17.46], [301, 25.67], [401, 30.81], [501, 35.94], [601, 41.07], [701, 46.21], [801, 51.34], [901, 56.48], [1001, 64.40], [2001, 86.25], [3001, 115.00], [4001, 143.75], [5001, 150.08]],
          otrosCanales: { etiqueta: 'Oficina, kiosco, internet o corresponsal', escalones: [[0, 7.19], [101, 12.32], [201, 17.46], [301, 25.67], [401, 30.81], [501, 35.94], [601, 41.07], [701, 46.21], [801, 51.34], [901, 56.48], [1001, 64.40], [2001, 86.25], [3001, 115.00], [4001, 143.75], [5001, 172.50], [6001, 201.25], [7001, 230.00], [8001, 258.75], [9001, 287.50]] } },
        recompensasPorNivel: {
          'Black': '$62,10 recompensa + $27,60 prestaciones en el exterior',
          'Infinite': '$62,10 recompensa + $27,60 prestaciones en el exterior',
          'Premium (Legend)': '$62,10 recompensa + $27,60 prestaciones en el exterior',
          'Platinum': '$32,20 recompensa + $18,40 prestaciones en el exterior',
          'Gold': '$26,45 recompensa + $12,65 prestaciones en el exterior',
          'Clásica': '$11,50 recompensa + $8,05 prestaciones en el exterior',
        },
        costos: {
          rotativo: { texto: '15,60 % nominal anual (16,77 % efectivo)',
            nota: 'Tienes 15 días desde que se emite el estado de cuenta para pagar el total o el mínimo. Pagando el total no se cobra interés de financiamiento por esos consumos. Si pagas solo el mínimo (o menos del total) pasas al crédito rotativo y se cobran intereses sobre el saldo. El mínimo es el saldo rotativo dividido para un factor que fija el banco, más intereses, cuotas del diferido y cuotas vencidas. Si abonas o cancelas, el interés se recalcula sobre el saldo pendiente y no se cobra recargo.' },
          diferido: { texto: '15,60 % nominal anual (tasa máxima de consumo), de 2 a 24 meses en su tabla',
            nota: 'Factor de referencia para estimar el interés total de una compra diferida de consumo: 2 meses 1,95 % · 3 meses 2,61 % · 6 meses 4,59 % · 9 meses 6,61 % · 12 meses 8,65 % · 24 meses 17,05 %. Si precancelas, se recalcula el interés y no se cobra recargo. Su página de PacifiCard también habla de «Diferido Flex» (desde $100, hasta 48 meses), pero ese plazo no está en la tabla de factores.' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual', nota: 'Es la tasa máxima del segmento Consumo que publican para noviembre de 2026. El documento no dice si tu tarjeta cobra exactamente esa tasa o una menor: míralo en tu estado de cuenta.' },
          mora: { texto: 'A la tasa máxima que fije el regulador, desde la fecha máxima de pago', nota: 'Según el contrato: si no pagas el mínimo o el total a tiempo, el valor adeudado genera interés de mora a la tasa máxima que determine el organismo regulador, contado desde la «fecha máxima de pago». El contrato no publica un porcentaje propio.' },
          uso: { texto: '$0,00 por usar la tarjeta (frecuencia de transacciones)', nota: 'También $0,00: activación, mantenimiento, pago mínimo, pago total, bloqueo y notificaciones. En gasolineras se cobra $0,23 por consumo. Es cargo máximo según la tabla del banco.' },
          mantenimiento: { texto: '$0,00', nota: 'Incluye mantenimiento con pago mínimo y con pago total.' },
          avance: { texto: 'Cajero: desde $7,19 hasta $150,08 · oficina o internet: desde $7,19 hasta $287,50', nota: 'Escalonado por monto: $7,19 hasta $100,99; $12,32 hasta $200,99; $17,46 hasta $300,99; $25,67 hasta $400,99; $30,81 hasta $500,99… hasta $56,48 en $901–$1.000; $64,40 en $1.001–$2.000; $86,25 en $2.001–$3.000. Los intereses del avance son aparte.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA', nota: 'Si te atrasas: depende de la cuota vencida y los días. Desde $7,34 (1 a 30 días, cuota menor a $100) hasta $50,59 (más de 90 días, cuota desde $1.000). No se cobra nada por la gestión antes de la fecha de pago.' },
          emision: { texto: '$5,03 con chip (emisión y renovación) · $0,00 con banda lectora' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro · $0,00 por migración o falla de la banda o el chip' },
          recompensas: { texto: '$11,50 a $62,10 según el producto', nota: 'Plan de recompensas: es un cargo anual y debes aceptarlo por escrito antes de que te lo cobren. Depende del segmento de tu tarjeta.' },
          voucher: { texto: '$2,05 local · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta por los canales del banco' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },
      {
        // Tarifario de servicios financieros, sección «Tarifa por servicios aplicados a tarjetas de crédito» (junio 2026): American Express, Visa y Mastercard.
        // Su logo oficial es blanco (lo usan sobre el magenta de su marca, #bc157c): por eso va con `logoFondo`.
        id: 'ec-guayaquil', pais: 'EC', nombre: 'Banco de Guayaquil', corto: 'Guayaquil', redes: ['Visa', 'Mastercard', 'American Express'], logoFondo: '#bc157c',
        niveles: ['Clásica', 'Estándar', 'Oro', 'Platinum', 'Signature', 'Elite', 'Prima', 'Zero', 'Blue', 'Verde'],
        fuente: { texto: 'Tarifario de servicios financieros de Banco Guayaquil, sección de tarjetas de crédito (junio 2026; es el que publican como vigente en su página de transparencia, consultado el 6 de noviembre de 2026)', vigencia: 'junio 2026',
          url: 'https://www.bancoguayaquil.com/conocenos/transparencia/' },
        tarifarioUrl: 'https://assets.ctfassets.net/jhuukrkt1w7q/6ZE5gSTute00w7lxCPOilb/bb243ec833d8c434653b0023a35923a3/TARIFARIO_JUNIO_2026.pdf',
        // Su tarifario dice que la tarjeta cobra la «tasa máxima convencional del segmento de consumo»: es el techo legal, no una tasa propia menor.
        tasaPublicada: { efectivaAnual: 16.77, aplicaA: 'tarjetas de crédito (rotativo y diferido): «tasa máxima convencional del segmento de consumo»' },
        // Avance: valor fijo con IVA según el monto. Dos tablas del mismo tarifario que se traslapan y no dicen cuál manda: se muestran las cuatro columnas.
        avance: {
          tipo: 'escalones', etiqueta: 'Cajero, banca electrónica y móvil (en el país, rangos estándar)',
          escalones: GYE_CAJERO,
          otrosCanales: [
            { etiqueta: 'Oficina y corresponsales no bancarios (en el país, rangos estándar)', escalones: GYE_OFICINA },
            { etiqueta: 'Cajero o internet, propios, locales o del exterior (tabla de avances exterior)', escalones: GYE_CAJERO_EXT },
            { etiqueta: 'Ventanilla, local o del exterior (tabla de avances exterior)', escalones: GYE_VENTANILLA },
          ],
        },
        recompensasPorNivel: {
          'Clásica': 'Visa Clásica $26,45 · Visa Tricolor, Taca Clásica y Manchester United $11,50 (al año)',
          'Estándar': 'Mastercard Estándar y Mastercard Taca Clásica $11,50 (al año)',
          'Oro': '$32,20 al año (Visa, Mastercard y American Express Oro)',
          'Platinum': 'Visa Platinum y American Express Platinum $50,60 · Mastercard Platinum $32,20 (al año)',
          'Signature': 'Visa Signature $50,60 · Visa Signature Lifemiles $62,10 (al año)',
          'Elite': '$62,10 al año (American Express Taca Elite y AAdvantage Elite)',
          'Prima': 'El tarifario no publica cargo de recompensas para Mastercard Prima (solo prestaciones en el exterior: $8,05 al año)',
          'Zero': 'El tarifario no publica cargo de recompensas para Visa Zero (solo prestaciones en el exterior: $8,05 al año)',
          'Blue': 'American Express Blue $26,45 (al año)',
          'Verde': 'American Express Verde Pago y Verde Crédito $26,45 (al año)',
        },
        costos: {
          rotativo: { texto: 'Sin interés si pagas el total antes de la fecha tope; con pago parcial, o si pagas tarde, se cobra interés',
            nota: 'Su tarifario dice: no se cobran intereses cuando el pago es total antes de la fecha tope de pago (pago de contado); sí se cobran cuando el pago es parcial antes de la fecha tope, o cuando el pago, parcial o total, es después de esa fecha. La tasa es la «tasa máxima convencional del segmento de consumo». No publica cuántos días hay entre el corte y la fecha tope, ni desde cuándo corre el interés.' },
          diferido: { texto: 'Plazos de 2, 3, 6, 9, 12 y 24 meses con la tasa máxima convencional del segmento de consumo (16,77 % efectiva)',
            nota: 'El tarifario no publica factores por plazo; la app calcula la cuota con la tasa.' },
          tasa: { texto: '16,77 % efectiva anual (tasa máxima convencional del segmento de consumo)',
            nota: 'Es el techo legal de consumo: el banco no publica para la tarjeta una tasa propia más baja. Equivale a cerca de 15,60 % nominal (cálculo de la app).' },
          mora: { texto: 'Recargo sobre la tasa: 5 % (1 a 15 días), 7 % (16 a 30), 9 % (31 a 60) y 10 % (más de 60 días)',
            nota: 'Se aplica después del vencimiento (con 0 días de retraso: 0 %). Sobre 15,60 % nominal da cerca de 16,38 %, 16,69 %, 17,00 % y 17,16 % (cálculo de la app, no cifra publicada).' },
          uso: { texto: '$0,00 por frecuencia de transacciones',
            nota: 'Consumos de más de $100 en el exterior: $1,96 (hasta $100 no cobran). Consultas en el exterior: $1,02. Gasolineras: $0,23 por consumo. Cambio de clave: $1,54. Pago de impuestos con la tarjeta: $0,52. Tarjeta de coordenadas, renovación anual: $1,02. Tarjeta de emergencia en el exterior: $25,67 (Visa y Mastercard) o $128,35 (American Express).' },
          mantenimiento: { texto: '$0,00', nota: 'Mantenimiento, con pago mínimo y con pago total; afiliación y renovación de tarjetas de crédito de titulares o adicionales: $0,00.' },
          avance: { texto: 'Desde $7,19 hasta $316,25 según el monto y el canal',
            nota: 'Valor fijo con IVA. El tarifario trae dos tablas de avance que se traslapan y no dice cuál aplica a tu caso; confírmalo con el banco o míralo en tu estado de cuenta. '
              + 'Cajero, banca electrónica y móvil (país, rangos estándar): ' + rangosTexto(GYE_CAJERO) + '. '
              + 'Oficina y corresponsales no bancarios (país, rangos estándar): ' + rangosTexto(GYE_OFICINA) + '. '
              + 'Cajero o internet, propios, locales o del exterior (tabla de avances exterior): ' + rangosTexto(GYE_CAJERO_EXT) + '. '
              + 'Ventanilla, local o del exterior (tabla de avances exterior): ' + rangosTexto(GYE_VENTANILLA) + '. '
              + 'Los intereses se cobran aparte. Tiene campañas de avance con tasa preferencial (con términos propios en su página de transparencia).' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'La tabla de la regulación está sin IVA (de $6,38 a $43,99, más el IVA); con 15 % sale de $7,34 a $50,59 (cálculo de la app). Depende del valor de la cuota vencida y los días de atraso (1 a 30, 31 a 60, 61 a 90 y más de 90). Un solo cargo por la cuota con más días vencidos.' },
          emision: { texto: '$5,03 con chip (emisión y renovación)', nota: 'Con banda lectora (sin chip): $0,00.' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro físico', nota: 'Por migración o falla de la banda lectora o del chip: $0,00.' },
          recompensas: { texto: '$11,50 a $62,10 al año según la tarjeta (plan de millas)',
            nota: 'Su tarifario aclara que corresponde al plan de acumulación de millas que aparece en tu estado de cuenta, y lo publica por segmento con la lista de tarjetas de cada uno (la app lo muestra según el nivel que elijas). Plan de recompensas (anual): AA+ $62,10 · A+ $50,60 · B+ $32,20 · C+ $26,45 · D+ $11,50. Prestaciones en el exterior (anual): AA+ $27,60 · A+ $23,00 · B+ $18,40 · C+ $12,65 · D+ y D $8,05. No hay recargo adicional por consumos en el exterior y se cobra con tu aceptación por escrito. Las tarjetas de marca compartida (Taca, Supermaxi, Chevrolet y otras) tienen su segmento en el tarifario.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · corte de estado $1,87 · copia $0,52', nota: 'Referencias financieras: $2,73.' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta por los diferentes canales' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },
      {
        // Tarifario «Tasas de interés y cargos por servicios – Tarjetas de crédito» (actualización noviembre 2026). Visa y Mastercard.
        // Niveles: los de persona natural que lista el tarifario; «Corporate» y «Business» (empresariales) no se incluyen.
        id: 'ec-austro', pais: 'EC', nombre: 'Banco del Austro', corto: 'Austro', redes: ['Visa', 'Mastercard'],
        niveles: ['Internacional', 'Gold', 'Platinum', 'Signature', 'Infinite', 'Black'],
        fuente: { texto: 'Tarifario de tasas de interés y cargos por servicios de tarjetas de crédito (actualización noviembre 2026)', vigencia: 'noviembre 2026',
          url: 'https://www.bancodelaustro.com/Portals/0/Tarifarios/TarjetaCreditoClientes.pdf' },
        tarifarioUrl: 'https://www.bancodelaustro.com/Portals/0/Tarifarios/TarjetaCreditoClientes.pdf',
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjetas de consumo (corriente/rotativo y diferido)' },
        // Avance: valor fijo con IVA según el monto. Una tabla para el país (ventanilla, cajero, internet/app, CNB) y otra para el exterior.
        avance: {
          tipo: 'escalones', etiqueta: 'En el país (ventanilla, cajero, internet/app o CNB)',
          escalones: [[1, 13.35], [101, 20.54], [301, 25.67], [401, 30.81], [501, 35.94], [601, 41.07], [701, 46.21], [801, 56.48], [901, 77.00], [1001, 82.14], [1301, 87.27], [1401, 92.41], [1501, 96.97], [1601, 102.68], [1701, 112.94], [1801, 118.08], [1901, 123.21], [2001, 154.02], [5001, 256.69]],
          otrosCanales: [
            { etiqueta: 'En el exterior (ventanilla o cajero)',
              escalones: [[1, 5.18], [101, 5.98], [201, 15.30], [301, 24.50], [401, 34.39], [501, 44.74], [601, 56.24], [701, 66.82], [801, 78.43], [901, 90.62], [1001, 103.16], [2001, 116.27], [3001, 129.72], [4001, 143.64], [5001, 158.01], [6001, 172.50]] },
          ],
        },
        costos: {
          rotativo: { texto: '15,60 % nominal (16,77 % efectiva) para el consumo corriente / rotativo',
            nota: 'El tarifario publica la tasa del corriente/rotativo (sin factor de ponderación) pero no explica si hay un período sin interés entre el corte y la fecha de pago ni desde cuándo corre el interés; míralo en tu contrato o estado de cuenta.' },
          diferido: { texto: '15,60 % nominal con factor por plazo: 3 meses 2,61 % · 6 meses 4,60 % · 12 meses 8,65 % · 24 meses 17,06 % · 36 meses 25,86 %',
            nota: 'También 9 meses 6,61 %. El factor sirve para estimar el interés total sobre el monto diferido (por ejemplo, $1.000 a 12 meses ≈ $86,50 de interés; cálculo de la app).' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual',
            nota: 'Es la tasa de consumo, para las tarjetas Visa y Mastercard (Internacional, Gold, Platinum, Signature, Infinite y Black). El mismo tarifario trae tasas de otros segmentos (nominal): Corporativo 7,48 % · Empresarial 9,74 % · PYMES 9,45 % · Minorista 25,12 % · Microcrédito simple 22,43 % y ampliada 20,09 %; no dice a qué tarjeta corresponde cada una.' },
          mora: { texto: 'Recargo sobre la tasa: 5 % (1 a 15 días), 7 % (16 a 30), 9 % (31 a 60) y 10 % (más de 60 días)',
            nota: 'Sobre 15,60 % nominal da cerca de 16,38 %, 16,69 %, 17,00 % y 17,16 % (cálculo de la app, no cifra publicada).' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta',
            nota: 'Consumos de más de $100 en el exterior: $1,96 (hasta $100 no cobran). Gasolineras: $0,23 por consumo. Consulta impresa de saldo en cajero: $0,36. Activación, notificaciones de tus consumos y frecuencia de transacciones: $0,00.' },
          mantenimiento: { texto: '$0,00', nota: 'Mantenimiento, con pago mínimo y con pago total; afiliación y renovación de titular y adicional: $0,00.' },
          avance: { texto: 'Desde $5,18 hasta $256,69 según el monto y el lugar',
            nota: 'Valor fijo con IVA. En el país (ventanilla, cajero propio o de otro banco, internet/app y CNB; el CNB solo para menos de $200): $13,35 hasta $100,99 · $20,54 hasta $300,99 · $25,67 hasta $400,99 · $30,81 hasta $500,99 · $35,94 hasta $600,99 · $41,07 hasta $700,99 · $46,21 hasta $800,99 · $56,48 hasta $900,99 · $77,00 hasta $1.000,99 · $82,14 hasta $1.300,99 · $87,27 hasta $1.400,99 · $92,41 hasta $1.500,99 · $96,97 hasta $1.600,99 · $102,68 hasta $1.700,99 · $112,94 hasta $1.800,99 · $118,08 hasta $1.900,99 · $123,21 hasta $2.000,99 · $154,02 hasta $5.000,99 · $256,69 desde $5.001. En el exterior (ventanilla o cajero): $5,18 hasta $100,99 · $5,98 hasta $200,99 · $15,30 hasta $300,99 · $24,50 hasta $400,99 · $34,39 hasta $500,99 · $44,74 hasta $600,99 · $56,24 hasta $700,99 · $66,82 hasta $800,99 · $78,43 hasta $900,99 · $90,62 hasta $1.000,99 · $103,16 hasta $2.000,99 · $116,27 hasta $3.000,99 · $129,72 hasta $4.000,99 · $143,64 hasta $5.000,99 · $158,01 hasta $6.000,99 · $172,50 desde $6.001. Los intereses se cobran aparte.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'La tabla de la regulación está sin IVA (de $6,38 a $43,99, más el IVA); con 15 % sale de $7,34 a $50,59 (cálculo de la app). Depende del valor de la cuota vencida y los días de atraso (1 a 30, 31 a 60, 61 a 90 y más de 90). Un solo cargo por la cuota con más días vencidos; la gestión preventiva antes del vencimiento no se cobra.' },
          emision: { texto: '$5,03 con chip (emisión y renovación)', nota: 'Con banda lectora (sin chip): $0,00. La renovación solo se cobra cuando venció el plástico (vigencia mínima de 3 años).' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro físico', nota: 'Por migración o falla de la banda o del chip: $0,00.' },
          recompensas: { texto: '$5,75 a $62,10 al año según el segmento',
            nota: 'El tarifario lo publica por «segmento», no por tarjeta, y no dice qué tarjeta corresponde a cada segmento: pregunta al banco. Plan de recompensas (anual): AA+ $62,10 · A+ $50,60 · B+ $32,20 · C+ $26,45 · D+ $11,50 · E+ $5,75. Prestaciones en el exterior (anual): AA+ y AA $27,60 · A+ y A $23,00 · B+ y B $18,40 · C+ y C $12,65 · D+ y D $8,05. Se cobra por períodos anuales y con tu aceptación por escrito.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta por cualquier canal del banco',
            nota: 'Si pagas desde canales de otra entidad: $0,39 por banca telefónica, celular, internet o kiosko · $0,45 por ventanilla, corresponsal, entidades auxiliares o cajero.' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },
      {
        id: 'ec-internacional', pais: 'EC', nombre: 'Banco Internacional', corto: 'Internacional', redes: ['Visa', 'Mastercard', 'Otra'],
        // Su logo oficial viene en blanco y naranja (para fondo oscuro): se muestra sobre este color.
        logoFondo: '#1e2a3a',
        fuente: { texto: 'Página de tarifarios del banco: tasas de interés de tarjeta de crédito, servicios de cargo máximo, cargo diferenciado, básicos y cobranzas (noviembre 2026)', vigencia: 'noviembre 2026',
          url: 'https://www.bancointernacional.com.ec/tarifarios/' },
        tarifarioUrl: 'https://www.bancointernacional.com.ec/tarifarios/',
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjeta de crédito de personas naturales, diferido y rotativo (tasa máxima)' },
        // Avance en cajero (país o exterior): hasta $500,99. Oficina y banca virtual hasta $1.000,99; más arriba el banco cobra por cada $100 adicional (se avisa, no se calcula).
        avance: { tipo: 'escalones', etiqueta: 'Cajero automático', maxUsd: 500.99,
          aviso: 'El banco publica el cajero solo hasta $500,99.',
          escalones: [[0, 7.19], [101, 12.32], [201, 17.46], [301, 22.59], [401, 27.73]],
          otrosCanales: [
            { etiqueta: 'Oficina', maxUsd: 1000.99, aviso: 'Sobre $1.000,99: $7,19 más por cada $100 adicional o fracción, con tope de $287,50.',
              escalones: [[0, 7.19], [101, 12.32], [201, 17.46], [301, 25.67], [401, 30.81], [501, 35.94], [601, 41.07], [701, 46.21], [801, 51.34], [901, 56.48]] },
            { etiqueta: 'Banca online, kiosco o móvil', maxUsd: 1000.99, aviso: 'Sobre $1.000,99: $6,16 más por cada $100 adicional o fracción, con tope de $287,50.',
              escalones: [[0, 6.16], [101, 11.29], [201, 16.43], [301, 23.62], [401, 28.75], [501, 33.88], [601, 39.02], [701, 44.15], [801, 49.29], [901, 51.34]] },
          ] },
        costos: {
          rotativo: { texto: 'Hasta 16,77 % efectivo anual (tasa máxima publicada)',
            nota: 'Es el tope que publica para tarjetas de personas naturales. La página no explica cuándo se cobra o no el interés del consumo corriente: míralo en tu estado de cuenta o en tu contrato.' },
          diferido: { texto: '15,60 % nominal (16,77 % efectivo) anual, igual de 3 a 24 meses',
            nota: 'Factor de referencia para estimar el interés total de la compra diferida: 3 meses 2,61 % · 4 meses 3,27 % · 6 meses 4,60 % · 9 meses 6,61 % · 12 meses 8,65 % · 15 meses 10,71 % · 18 meses 12,80 % · 24 meses 17,05 %.' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual', nota: 'Es la tasa que el banco publica para tarjeta de crédito de personas naturales (la máxima). Si tu estado de cuenta dice otra, anótala.' },
          mora: { texto: 'Recargo sobre la tasa: 5 % (1 a 15 días) · 7 % (16 a 30) · 9 % (31 a 60) · 10 % (más de 60)', nota: 'Se cuenta desde el primer día después de vencida la obligación. Es el «porcentaje adicional de interés» que publica el banco.' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta', nota: 'También $0,00: activación, mantenimiento, pago mínimo, pago total, bloqueo, notificaciones y afiliación o renovación para personas naturales. Gasolineras $0,23 por consumo; en el exterior, compras de más de $100 cobran $1,96.' },
          mantenimiento: { texto: '$0,00', nota: 'Incluye mantenimiento con pago mínimo y con pago total. Afiliación y renovación de la tarjeta (persona natural): $0,00.' },
          avance: { texto: 'Cajero: desde $7,19 hasta $27,73 · oficina: desde $7,19 hasta $56,48 · banca virtual: desde $6,16 hasta $51,34', nota: 'Por monto: hasta $100,99 → $7,19 (oficina o cajero) o $6,16 (banca virtual); hasta $200,99 → $12,32 o $11,29; hasta $300,99 → $17,46 o $16,43… Sobre $1.000,99 se suma $7,19 (oficina) o $6,16 (virtual) por cada $100 adicional o fracción, con tope de $250 + IVA. Los intereses del avance son aparte.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA', nota: 'Si te atrasas: depende de la cuota vencida y los días. Desde $7,34 (1 a 30 días, menos de $100) hasta $50,59 (más de 90 días, desde $1.000).' },
          emision: { texto: '$5,03 con chip (emisión y renovación) · $0,00 con banda lectora' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro · $0,00 por falla de banda o chip · en el exterior hasta $51,34' },
          recompensas: { texto: '$5,75 a $62,10 según el segmento de tu tarjeta', nota: 'Plan de recompensas por segmento: AA+ $62,10 · A+ $50,60 · B+ $32,20 · C+ $26,45 · D+ $11,50 · E+ $5,75. Prestaciones en el exterior: AA+/AA $27,60 · A+/A $23,00 · B+/B $18,40 · C+/C $12,65 · D+/D $8,05. La página no dice a qué nivel (Gold, Platinum…) corresponde cada segmento.' },
          voucher: { texto: '$2,06 local · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta por los canales del banco', nota: 'Su tabla de cargos máximos también lista $0,39 por pagos a tarjetas de crédito por banca móvil, internet o autoservicio; la página no aclara a qué caso se refiere.' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },
      {
        id: 'ec-diners', pais: 'EC', nombre: 'Diners Club del Ecuador', corto: 'Diners Club', redes: ['Diners', 'Visa', 'Mastercard', 'Otra'],
        // Familias de tarjeta del tarifario (Diners Club, Discover y TITANIUM Visa / Mastercard).
        niveles: ['Diners Club', 'Discover', 'Titanium', 'Platinum Miles', 'Signature Miles', 'Infinite / Black Miles'],
        fuente: { texto: 'Tarifario de costos y servicios personales (1 de noviembre de 2026) y pizarra multimarca de noviembre 2026', vigencia: 'noviembre 2026',
          url: 'https://www.dinersclub.com.ec/transparencia' },
        tarifarioUrl: 'https://dce-documents.s3.amazonaws.com/tarifario-personal-multimarca-multicanal-noviembre-2026.pdf',
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjetas personales Diners Club, Discover y TITANIUM: diferido y financiamiento' },
        // Avance en efectivo (local y exterior; cajero, internet u oficinas): desde ese monto (USD) y hasta antes del siguiente, el valor final con IVA.
        avance: { tipo: 'escalones', escalones: [[0, 5.13], [101, 10.26], [201, 15.39], [301, 25.65], [501, 28.05], [901, 33.88], [1001, 40.03], [1201, 49.24], [1501, 64.60],
          [2001, 79.95], [2501, 86.25], [3001, 110.65], [3501, 115.00], [4001, 141.36], [4501, 143.75], [5001, 172.50], [6001, 201.25], [7001, 230.00], [8001, 258.75], [9001, 287.50]] },
        recompensasPorNivel: {
          'Diners Club': 'No aparece en la lista de planes de recompensas del tarifario · $12,65 de prestaciones en el exterior (Diners Club Internacional)',
          'Discover': '$26,45 recompensa (Discover Me, Discover, Discover More y las BSC)',
          'Titanium': '$26,45 recompensa + $12,65 prestaciones en el exterior (Visa World Card Miles, Visa Euphoria, Mastercard Miles)',
          'Platinum Miles': '$32,20 recompensa + $18,40 prestaciones en el exterior (también Diners Club Claro, AAdvantage y Miles)',
          'Signature Miles': '$50,60 recompensa + $23,00 prestaciones en el exterior (TITANIUM Visa Signature Miles - AAdvantage)',
          'Infinite / Black Miles': '$62,10 recompensa + $27,60 prestaciones en el exterior (Infinite, Black, Black Beyond, Sphaera y Mcnamara)',
        },
        costos: {
          rotativo: { texto: 'Sin recargo hasta la fecha máxima de pago; después, interés de financiamiento',
            nota: 'Período de gracia: desde la fecha de emisión del estado de cuenta hasta la «fecha máxima de pago», sin recargos financieros. Si pagas el mínimo o más, el interés de financiamiento se aplica al saldo de capital de los consumos corrientes desde la fecha máxima de pago (y al saldo rotativo desde el inicio del corte). Si no alcanzas ni el mínimo, el interés se calcula sobre el capital del mes, sin contar la cuota de capital del pago mínimo. Su tabla de tasas publica 15,60 % nominal (16,77 % efectivo) para el diferido; no muestra una tasa aparte para el rotativo, así que míralo en tu estado de cuenta.' },
          diferido: { texto: '15,60 % nominal anual (16,77 % efectivo), igual para todos los plazos',
            nota: 'Diferido propio: 3 meses 2,63 % · 6 meses 4,65 % · 12 meses 8,76 % · 24 meses 17,29 % · 36 meses 26,23 % (factor de referencia para estimar el interés total). Consumos en el exterior, avance en efectivo y crédito vehicular: 3, 6 y 12 meses con los mismos factores. El tarifario menciona además una contribución anual del 0,5 % sobre el monto de las operaciones de financiamiento.' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual', nota: 'Tasa que publican para el crédito diferido de tarjetas personales (Diners Club, Discover y TITANIUM): diferido propio, consumos en el exterior, avance en efectivo y reestructuraciones.' },
          mora: { texto: 'Nominal anual: 16,38 % · 16,69 % (30 días) · 17,00 % (60 días) · 17,16 % (90 días o más)', nota: 'Efectiva: 17,67 % · 18,03 % · 18,39 % · 18,58 %. Es la tasa aplicada al saldo que dejas de pagar a la fecha máxima de pago, por los días hasta que pagas. (Las cifras equivalen a un recargo de 5 %, 7 %, 9 % y 10 % sobre 15,60 %.)' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta', nota: 'También $0,00: activación, mantenimiento, pago mínimo, pago total, entrega del estado de cuenta y bloqueo. Gasolineras: $0,23 por consumo. Consumos de más de $100 en el exterior: $1,96 (el tarifario dice que aplica a Diners Club Miles y Diners Club Internacional).' },
          mantenimiento: { texto: '$0,00', nota: 'Incluye mantenimiento con pago mínimo y con pago total.' },
          avance: { texto: 'Desde $5,13 hasta $287,50 según el monto', nota: 'Local y exterior, en cajero, internet u oficinas: $5,13 hasta $100,99; $10,26 hasta $200,99; $15,39 hasta $300,99; $25,65 hasta $500,99; $28,05 hasta $900,99; $33,88 hasta $1.000,99; luego sube por tramos hasta $287,50 desde $9.001 (máximo $250 + IVA). Los intereses del avance son aparte (también se puede diferir a 3, 6 o 12 meses).' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA', nota: 'Si te atrasas: depende de la cuota vencida y los días. Desde $7,34 (1 a 30 días, menos de $100) hasta $50,59 (más de 90 días, desde $1.000).' },
          emision: { texto: '$5,03 con chip (emisión y renovación)' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro · $0,00 por migración o falla de banda o chip' },
          recompensas: { texto: '$26,45 a $62,10 según la tarjeta', nota: 'Plan de recompensas: es un cargo para periodos anuales y debes aceptarlo por escrito. Depende del tipo de tarjeta (Discover, TITANIUM, Miles…).' },
          voucher: { texto: '$2,06 local · $10,27 del exterior' },
          estado: { texto: 'Entrega a domicilio $0,00 · copia $0,52' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },
      {
        // Solo emite Visa (todas sus tarjetas se llaman «BGR Visa …»).
        id: 'ec-bgr', pais: 'EC', nombre: 'Banco General Rumiñahui', corto: 'Rumiñahui', redes: ['Visa'],
        niveles: ['Clásica', 'ON / Mujeres', 'Supermaxi', 'Club Deportivo El Nacional', 'Cerrada Universidades', 'Nacional', 'Oro / Cero Costo', 'Platinum', 'Infinite Active', 'Empresarial'],
        fuente: { texto: 'Tasas de interés y tarifas por servicios aplicados a las tarjetas de crédito (vigencia 1 de noviembre de 2026)', vigencia: 'noviembre 2026',
          url: 'https://www.bgr.com.ec/informacion-corporativa' },
        tarifarioUrl: 'https://www.bgr.com.ec/resources/pdf/transparencia-de-la-informacion/2026/tarifarios/tasas-de-interes-tarifas-servicios-aplicados-tarjetas-de-credito.pdf',
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjetas personales BGR Visa (rotativo; el diferido usa factores)' },
        // Avance en efectivo: valor fijo con IVA según el monto (no es un porcentaje). País: cajero, ventanilla, internet y banca celular. Exterior: cajero y ventanilla.
        avance: {
          tipo: 'escalones', etiqueta: 'En el país (cajero, ventanilla, internet y banca celular)',
          escalones: [[0, 5.13], [51, 8.21], [101, 9.25], [151, 10.27], [401, 15.40], [501, 20.54], [701, 30.81], [1001, 41.07], [2001, 51.34], [3001, 61.61]],
          otrosCanales: [{
            etiqueta: 'En el exterior (cajero y ventanilla)', escalones: [[0, 5.13], [51, 7.19], [101, 8.21], [151, 9.25], [201, 11.29]], maxUsd: 400.99,
            aviso: 'Para tarjetas personales el tarifario publica el avance en el exterior solo hasta $400; más arriba, pregunta al banco.',
          }],
        },
        recompensasPorNivel: {
          'Clásica': '$11,50 recompensa + $8,05 prestaciones en el exterior',
          'ON / Mujeres': '$11,50 recompensa + $8,05 prestaciones en el exterior',
          'Supermaxi': '$11,50 recompensa + $8,05 prestaciones en el exterior',
          'Club Deportivo El Nacional': '$11,50 recompensa + $8,05 prestaciones en el exterior',
          'Cerrada Universidades': '$11,50 recompensa (el tarifario no le asigna prestaciones en el exterior)',
          'Nacional': '$5,75 recompensa · sin prestaciones en el exterior (no aplica)',
          'Oro / Cero Costo': '$26,45 recompensa + $12,65 prestaciones en el exterior',
          'Platinum': '$32,20 recompensa + $18,40 prestaciones en el exterior',
          'Infinite Active': '$62,10 recompensa + $27,60 prestaciones en el exterior',
          'Empresarial': '$62,10 recompensa + $27,60 prestaciones en el exterior (no aplica a la Empresarial del sector público)',
        },
        costos: {
          rotativo: { texto: 'Sin interés entre la fecha de corte y la fecha máxima de pago; después, 15,60 % nominal sobre el capital que quede',
            nota: 'Tarifario: para el crédito corriente «no hay cargo de intereses entre la fecha de corte y la fecha máxima de pago» y, cuando se aplica, el interés corre sobre el capital deudor. En el diferido corre «desde la fecha de consumo». Forma de pago: pago mínimo o total, que eliges en la solicitud. Tasa máxima rotativo: 15,60 % nominal (16,77 % efectiva). La tarjeta Empresarial tiene tasas menores: 9,45 % PYME, 9,74 % Empresarial y 7,48 % Corporativo (nominal). Se suma una contribución SOLCA de 0,5 % tanto a consumos rotativos como diferidos.' },
          diferido: { texto: 'Mismo 15,60 % nominal, repartido en cuotas con «factores» según el plazo',
            nota: 'Factor para estimar el interés total sobre el monto diferido (tarjetas personales): 3 meses 2,63 % · 6 meses 4,65 % · 12 meses 8,76 % · 24 meses 17,29 % · 36 meses 26,23 % · 48 meses 35,57 % · 60 meses 45,31 % · 72 meses 55,44 % · 84 meses 65,95 %. La tabla completa llega hasta 86 meses. La Empresarial tiene su propia tabla (3 a 84 meses).' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual (máxima)', nota: 'Rotativo de las tarjetas personales BGR Visa (principal y adicional). Es la «tasa máxima» que publica el banco; en tu estado de cuenta verás la que te aplican.' },
          mora: { texto: 'Nominal anual desde el día siguiente a la fecha máxima de pago: 16,38 % · 16,69 % (16 a 30 días) · 17,00 % (31 a 60 días) · 17,16 % (más de 60 días)',
            nota: 'Se aplica sobre el capital en mora. Equivale a un recargo de 5 %, 7 %, 9 % y 10 % sobre 15,60 %. El primer tramo aparece en el tarifario como «0 días».' },
          uso: { texto: '$0,00 por consumos en el país y por internet (nacional o internacional)',
            nota: 'Consumos de más de $100 en el exterior: $1,96 (no aplica a la Visa Nacional). Gasolineras: $0,23 por consumo. Hasta $5.188,26 al año de consumos en el exterior no se retiene el ISD; sobre el excedente se aplica 5 %.' },
          mantenimiento: { texto: '$0,00', nota: 'Mantenimiento, mantenimiento con pago mínimo y con pago total: $0,00.' },
          avance: { texto: 'Desde $5,13 hasta $61,61 según el monto (en el país)',
            nota: 'Valor fijo con IVA, no un porcentaje: $5,13 hasta $50,99; $8,21 hasta $100,99; $9,25 hasta $150,99; $10,27 hasta $400,99; $15,40 hasta $500,99; $20,54 hasta $700,99; $30,81 hasta $1.000,99; $41,07 hasta $2.000,99; $51,34 hasta $3.000,99; $61,61 desde $3.001. En el exterior: $5,13 · $7,19 · $8,21 · $9,25 y $11,29 de $201 a $400. Los intereses del avance se cobran aparte. El PIN para sacar efectivo te llega por SMS.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA', nota: 'Se cobra sobre la cuota más vencida, según su valor y los días de atraso. De 1 a 30 días: $7,34 (cuota menor a $100), $8,45 ($100 a $199), $9,11 ($200 a $299), $9,57 ($300 a $499), $9,92 ($500 a $999), $10,21 (desde $1.000). De 91 a 120 días: desde $29,39 hasta $50,59. La gestiona el banco o empresas externas autorizadas.' },
          emision: { texto: '$5,03 con chip (emisión y renovación)', nota: 'La renovación se cobra solo cuando venció el plástico.' },
          reposicion: { texto: '$5,03 en el país por pérdida o robo' },
          recompensas: { texto: '$5,75 a $62,10 según la tarjeta', nota: 'Programa de recompensas (cargo anual): Nacional $5,75 · Clásica, ON, Mujeres, Supermaxi, Club Deportivo El Nacional y Cerrada Universidades $11,50 · Oro $26,45 · Platinum $32,20 · Infinite y Empresarial $62,10. Prestaciones en el exterior: $8,05 · $12,65 · $18,40 · $27,60 según el nivel.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior', nota: 'La Visa Nacional no tiene copia de voucher del exterior.' },
          estado: { texto: 'Envío del estado de cuenta $0,00 · copia $0,52', nota: 'Certificado de manejo de cuentas o referencias: $2,59. Cheque devuelto: $2,86 nacional · $3,32 del exterior.' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },

      {
        // Tarifario «Operaciones activas: costos financieros y operativos» (octubre 2026). Emite Visa y Mastercard.
        // Su logo oficial es blanco (lo usan sobre el verde del encabezado de su web): por eso va con `logoFondo`.
        id: 'ec-machala', pais: 'EC', nombre: 'Banco de Machala', corto: 'Machala', redes: ['Visa', 'Mastercard'], logoFondo: '#295135',
        niveles: ['Clásica / Clásica Mi Comisariato', 'Oro / Oro Mi Comisariato', 'Platinum / Platinum Mi Comisariato', 'Black / Infinite', 'Empresarial', 'Nacional'],
        fuente: { texto: 'Tarifario «Operaciones activas: costos financieros y operativos» (octubre 2026)', vigencia: 'octubre 2026',
          url: 'https://www.bancomachala.com/de-tu-interes/transparencia' },
        tarifarioUrl: 'https://www.bancomachala.com/docs/default-source/tarifas-y-tasas/tarifas-y-tasas/tarifario-general-bm.pdf',
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjetas de crédito de personas naturales (rotativo y diferido)' },
        // Avance: valor fijo con IVA por rango de $100 (cada rango va de $x01 a $x00,99). Cajero: hasta $500 por retiro. Oficinas y canales virtuales: hasta $5.500.
        avance: {
          tipo: 'escalones', etiqueta: 'Cajero automático',
          escalones: [[0, 5.13], [101, 10.26], [201, 15.39], [301, 20.52], [401, 25.65]], maxUsd: 500,
          aviso: 'El tarifario fija un límite de $500 por retiro en cajero; para más, usa oficina o canales virtuales.',
          otrosCanales: [{
            etiqueta: 'Oficinas y canales virtuales',
            escalones: [5.13, 10.26, 15.39, 20.52, 25.65, 30.77, 35.90, 41.03, 46.16, 51.29, 56.42, 61.55, 66.68, 71.81, 76.94, 82.06, 87.19, 92.32, 97.45, 102.58,
              107.71, 112.84, 117.97, 123.10, 128.23, 133.35, 138.48, 143.61, 148.74, 153.87, 159.00, 164.13, 169.26, 174.39, 179.52, 184.64, 189.77, 194.90, 200.03,
              205.16, 210.29, 215.42, 220.55, 225.68, 230.81, 235.93, 241.06, 246.19, 251.32, 256.45, 261.58, 266.71, 271.84, 276.97, 282.10].map((v, i) => [i ? i * 100 + 1 : 0, v]),
            maxUsd: 5500, aviso: 'El tarifario fija un límite de $5.500 por transacción en oficinas y canales virtuales.',
          }],
        },
        recompensasPorNivel: {
          'Clásica / Clásica Mi Comisariato': '$11,50 recompensa + $8,05 prestaciones en el exterior (cobro anual)',
          'Oro / Oro Mi Comisariato': '$26,45 recompensa + $12,65 prestaciones en el exterior (cobro anual)',
          'Platinum / Platinum Mi Comisariato': '$32,20 recompensa + $18,40 prestaciones en el exterior (cobro anual)',
          'Black / Infinite': '$62,10 recompensa + $27,60 prestaciones en el exterior (cobro anual)',
          'Empresarial': '$32,20 recompensa + $18,40 prestaciones en el exterior (el tarifario las junta con Platinum)',
          'Nacional': '$5,75 recompensa · sin prestaciones en el exterior (cobro anual)',
        },
        costos: {
          rotativo: { texto: '15,60 % nominal · 16,77 % efectiva anual',
            nota: 'El tarifario publica la tasa del crédito rotativo pero no explica desde qué fecha corre el interés ni si hay un período sin interés; míralo en tu contrato o estado de cuenta.' },
          diferido: { texto: '15,60 % nominal (16,77 % efectiva) con factor por plazo: 3 meses 2,61 % · 6 meses 4,60 % · 12 meses 8,65 % · 24 meses 17,05 % · 36 meses 25,86 %',
            nota: 'También publica 9 meses 6,61 %. El factor sirve para estimar el interés total sobre el monto diferido. Las tarjetas corporativas, empresariales y pymes tienen tasas propias más bajas (nominal: corporativo 7,62 %, empresarial 9,90 %, pymes 9,52 %).' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual', nota: 'Tarjetas de crédito de personas naturales, tanto rotativo como diferido.' },
          mora: { texto: 'Recargo sobre la tasa: 5 % (1 a 15 días), 9 % (31 a 60 días) y 10 % (más de 60 días)',
            nota: 'Sale de la tabla general de crédito del tarifario (recargo por morosidad desde el vencimiento hasta el día de pago); no tiene una tabla propia para tarjetas. El tramo de 16 a 30 días aparece con 0,00 %, que parece un error: confírmalo con el banco. Sobre 15,60 % esos recargos dan cerca de 16,38 %, 17,00 % y 17,16 % (cálculo de la app, no cifra publicada).' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta',
            nota: 'Consumos de más de $100 en el exterior: $1,96. Consulta de saldo en cajero del exterior: $1,02. Gasolineras: $0,23 por consumo. Activación, afiliación y bloqueo: $0,00. El tarifario prohíbe pasarte el cargo que se cobra a los comercios.' },
          mantenimiento: { texto: '$0,00', nota: 'Mantenimiento, mantenimiento con pago mínimo y con pago total: $0,00.' },
          avance: { texto: 'Desde $5,13 hasta $282,10 según el monto y el canal',
            nota: 'Valor fijo con IVA por rango de $100. Cajero automático: $5,13 hasta $100,99; $10,26 hasta $200,99; $15,39 hasta $300,99; $20,52 hasta $400,99; $25,65 hasta $500 (límite $500 por retiro). Oficinas y canales virtuales: sube unos $5,13 por cada $100, hasta $282,10 de $5.401 a $5.500 (límite $5.500 por transacción). Los intereses del avance se cobran aparte.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'El tarifario publica el cargo sin IVA (de $6,38 a $43,99, más el IVA); con 15 % de IVA sale de $7,34 a $50,59 (cálculo de la app). Depende del valor de la cuota vencida y de los días de atraso: 1 a 30, 31 a 60, 61 a 90 y más de 90 días. Se cobra un solo cargo por la cuota con más días vencidos, y la gestión preventiva antes del vencimiento no se cobra.' },
          emision: { texto: '$5,03 con chip (emisión y renovación)', nota: 'Con banda lectora (sin chip) la emisión y la renovación son $0,00. La renovación solo se cobra cuando venció el plástico (vigencia mínima de 3 años).' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro físico', nota: 'Con banda lectora (sin chip) $0,00. Si es por migración o por falla de la banda o del chip: $0,00.' },
          recompensas: { texto: '$5,75 a $62,10 al año según la tarjeta',
            nota: 'Cobro anual del plan de recompensas: Nacional $5,75 · Clásica $11,50 · Oro $26,45 · Platinum y Empresarial $32,20 · Black/Infinite $62,10. Prestaciones del exterior: $8,05 · $12,65 · $18,40 · $27,60 (la Nacional no tiene). Se cobra por períodos anuales y debes aceptarlo por escrito; el banco aclara que no hay recargo adicional por consumos en el exterior.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52 · corte de estado de cuenta $1,87',
            nota: 'Referencias bancarias: $2,59. Cheque devuelto: $2,86 nacional · $3,32 del exterior (más lo que cobre el banco receptor del cheque).' },
          pagoTarjeta: { texto: '$0,00 por los canales de Machala · $0,39 por banca telefónica, celular, internet o kiosko de otra entidad · $0,45 por ventanilla, corresponsal o cajero de otra entidad' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },

      {
        // Tarifario «Tasas de interés y tarifas por servicios aplicados a las tarjetas de crédito» (hoja 2 de su transparencia). Solo Visa.
        // Su logo oficial es blanco (lo usan sobre el verde del encabezado de su web): por eso va con `logoFondo`.
        id: 'ec-loja', pais: 'EC', nombre: 'Banco de Loja', corto: 'Loja', redes: ['Visa'], logoFondo: '#76BC21',
        niveles: ['Clásica', 'Universidades', 'Oro', 'Infinite', 'Pymes'],
        fuente: { texto: 'Tasas de interés y tarifas por servicios aplicados a las tarjetas de crédito (vigencia 1 de agosto de 2026 para consumo y 1 de noviembre de 2026 para pymes)', vigencia: 'agosto-noviembre 2026',
          url: 'https://www.bancodeloja.fin.ec/informacion/links-de-interes/transparencia-de-informacion' },
        tarifarioUrl: 'https://www.bancodeloja.fin.ec/Portals/0/Transparencia%20de%20la%20Informaci%C3%B3n/Tasas%20Alco/2_TARJETA_CREDITO.pdf',
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjetas de crédito de consumo (rotativo y diferido)' },
        // Avance: valor fijo con IVA según el monto. Cajero del país (desde $10); oficina, banca web y celular; y exterior (oficina y cajero).
        avance: {
          tipo: 'escalones', etiqueta: 'Cajero automático (en el país)',
          escalones: [[10, 4.11], [301, 8.21], [501, 15.40]], maxUsd: 1000.99,
          aviso: 'El tarifario no publica el avance en cajero de más de $1.000,99; usa oficina o banca web/celular.',
          otrosCanales: [
            { etiqueta: 'Oficina, banca web y banca celular (en el país)',
              escalones: [[0, 5.13], [101, 10.27], [501, 25.67], [1001, 46.21], [2001, 77.00], [3001, 128.35], [5001, 150.08]] },
            { etiqueta: 'En el exterior (oficina y cajero)',
              escalones: [[10, 10.27], [500, 25.67], [1000, 46.21], [2000, 77.00], [3000, 128.35], [5000, 150.08]] },
          ],
        },
        recompensasPorNivel: {
          'Clásica': 'El tarifario no publica cargo de recompensas ni de prestaciones en el exterior para esta tarjeta',
          'Universidades': 'El tarifario no publica cargo de recompensas ni de prestaciones en el exterior para esta tarjeta',
          'Oro': 'El tarifario no publica cargo de recompensas ni de prestaciones en el exterior para esta tarjeta',
          'Infinite': '$27,60 prestaciones en el exterior (cobro anual)',
          'Pymes': '$4,92 prestaciones en el exterior (cobro anual)',
        },
        costos: {
          rotativo: { texto: '16,77 % efectiva anual (15,60 % nominal)',
            nota: 'El tarifario publica la tasa del crédito rotativo pero no explica si hay un período sin interés entre el corte y la fecha de pago ni desde cuándo corre el interés; míralo en tu contrato o estado de cuenta. Visa Pymes: 10,11 % efectiva.' },
          diferido: { texto: '16,77 % efectiva anual con factor por plazo: 3 meses 2,63 % · 6 meses 4,65 % · 12 meses 8,76 % · 24 meses 17,29 % · 36 meses 26,23 %',
            nota: 'También 9 meses 6,69 %. El factor sirve para estimar el interés total sobre el monto diferido. Visa Pymes (10,11 % efectiva): 3 meses 1,63 % · 6 meses 2,87 % · 12 meses 5,38 % · 24 meses 10,52 % · 36 meses 15,82 %. El tarifario aclara: «plazo máximo de diferimiento hasta 60 meses y aplica únicamente para avances de efectivo».' },
          tasa: { texto: '16,77 % efectiva · 15,60 % nominal anual', nota: 'Tarjetas de consumo (Clásica, Universidades, Oro, Infinite). Visa Pymes: 10,11 % efectiva.' },
          mora: { texto: 'Recargo sobre la tasa: 5 % (1 a 15 días), 7 % (16 a 30), 9 % (31 a 60) y 10 % (más de 60 días)',
            nota: 'Se aplica desde el primer día de vencimiento del capital, según la tabla de recargo por mora de su hoja de cargos asociados. Sobre 15,60 % nominal da cerca de 16,38 %, 16,69 %, 17,00 % y 17,16 % (cálculo de la app, no cifra publicada).' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta', nota: 'Activación, reclamos, frecuencia de transacciones y notificaciones de tus consumos: $0,00. Gasolineras: $0,23 por consumo. Consulta de saldo en cajero del exterior: $1,02.' },
          mantenimiento: { texto: '$0,00', nota: 'Mantenimiento, mantenimiento con pago mínimo o total, y afiliación y renovación de titular y adicional: $0,00.' },
          avance: { texto: 'Desde $4,11 hasta $150,08 según el monto y el canal',
            nota: 'Valor fijo con IVA. Cajero (país): $4,11 de $10 a $300,99; $8,21 hasta $500,99; $15,40 hasta $1.000,99. Oficina, banca web y celular (país): $5,13 hasta $100,99; $10,27 hasta $500,99; $25,67 hasta $1.000,99; $46,21 hasta $2.000,99; $77,00 hasta $3.000,99; $128,35 hasta $5.000,99; $150,08 desde $5.001. Exterior (oficina o cajero): $10,27 de $10 a $499,99; $25,67 hasta $999,99; $46,21 hasta $1.999,99; $77,00 hasta $2.999,99; $128,35 hasta $4.999,99; $150,08 desde $5.000. El avance se puede diferir. Los intereses se cobran aparte.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'La tabla de la regulación está sin IVA (de $6,38 a $43,99, más el IVA); con 15 % sale de $7,34 a $50,59 (cálculo de la app). Depende del valor de la cuota vencida y los días de atraso. Un solo cargo por la cuota con más días vencidos; la gestión preventiva antes del vencimiento no se cobra.' },
          emision: { texto: '$5,03 con chip (emisión y renovación)', nota: 'Con banda lectora (sin chip): $0,00. La renovación solo se cobra cuando venció el plástico (vigencia mínima de 3 años).' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro físico', nota: 'Con banda lectora (sin chip) $0,00; por migración o falla de la banda o del chip $0,00.' },
          recompensas: { texto: 'Solo publica cargo para Visa Infinite ($27,60) y Visa Pymes ($4,92) por prestaciones en el exterior',
            nota: 'Se cobra por períodos anuales y con tu aceptación por escrito; no hay recargo adicional por consumos en el exterior. Para Clásica, Universidades y Oro el tarifario no publica este cargo.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52', nota: 'Referencias bancarias: $2,59 en oficina y $0,62 por internet.' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta por cualquier canal del banco' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },

      {
        // Tarjetas «Alia» (Classic, Gold, Platinum, Black y Mi Socia). Tasas: octubre 2026; servicios: septiembre 2026; cómo funciona el corriente: su contrato de la tarjeta.
        // Su logo oficial es blanco: va sobre el celeste de los encabezados de su propio tarifario (#11C1FF) con `logoFondo`.
        // La red (Visa, Mastercard…) no aparece en los documentos leídos: se deja la lista general.
        id: 'ec-solidario', pais: 'EC', nombre: 'Banco Solidario', corto: 'Solidario', logoFondo: '#11C1FF',
        niveles: ['Classic', 'Gold', 'Platinum', 'Black', 'Mi Socia'],
        fuente: { texto: 'Tarifario de tasas activas (octubre 2026), tarifario de servicios financieros (septiembre 2026) y contrato de emisión y uso de la tarjeta Alia', vigencia: 'octubre 2026',
          url: 'https://www.banco-solidario.com/transparencia' },
        tarifarioUrl: 'https://www.banco-solidario.com/sites/default/files/tarifario/Banco_Solidario_TARIFARIO_%20OCTUBRE_2026_Activas.pdf',
        tasaPublicada: { efectivaAnual: 16.75, nominalAnual: 15.59, aplicaA: 'tarjetas Alia Classic, Gold, Platinum y Black (corriente a financiar y diferido)' },
        // Avance: $4,46 + IVA (= $5,13) por cada fracción de $100. El banco publica el valor de un tramo; la app multiplica por tramos (n × $4,46 y luego el IVA).
        avance: {
          tipo: 'escalones', etiqueta: 'Cajero automático (propio, local o de otro banco)',
          escalones: tramos100(50, 10, 4.46, 15), maxUsd: 1000.99,
          aviso: 'El tarifario publica el avance en cajero solo hasta $1.000; más arriba usa web, ventanilla o corresponsal.',
          otrosCanales: [
            { etiqueta: 'Web, ventanilla (país o exterior), corresponsales y entidades auxiliares',
              escalones: [...tramos100(100, 29, 4.46, 15), [2901, 150.08]] },
            { etiqueta: 'App Solidario',
              escalones: [[1, 0.35], [10, 1.30], [20, 2.10], [30, 2.90], [40, 3.80], ...tramos100(50, 29, 4.46, 15), [2901, 150.08]] },
          ],
        },
        costos: {
          rotativo: { texto: 'Pagas el total dentro de 15 días del estado de cuenta: sin interés. Si pagas solo el mínimo, el saldo corriente se difiere solo',
            nota: 'Según su contrato de emisión y uso de la tarjeta Alia (sin fecha de publicación): dentro de los 15 días posteriores a la emisión del estado de cuenta, pagar el total o el mínimo no causa interés. Si no cubres lo pendiente en ese plazo, cobran intereses normales desde el vencimiento del estado de cuenta, más mora y gastos de cobranza documentados. Si pagas solo el mínimo (o menos del total), aceptas diferir el saldo de tus consumos corrientes al plazo que defina el banco. El mínimo incluye impuestos, cargos, intereses, servicios financieros, cuotas de diferidos y un factor de los consumos corrientes. El interés de financiamiento se calcula sobre los saldos de los consumos de cada mes. Puedes prepagar diferidos sin recargo.' },
          diferido: { texto: '15,59 % nominal (16,75 % efectiva). Factor de cuota por cada $1: 3 meses 0,3420 · 6 meses 0,1743 · 12 meses 0,0905 · 24 meses 0,0488 · 36 meses 0,0350',
            nota: 'Plazos publicados: 2 meses 0,5098 · 3 meses 0,3420 · 6 meses 0,1743 · 9 meses 0,1185 · 12 meses 0,0905 · 18 meses 0,0627 · 24 meses 0,0488 · 36 meses 0,0350. Es el «factor de ponderación» del tarifario; coincide con la cuota mensual por cada $1 diferido (por ejemplo, $1.000 a 12 meses ≈ $90,50 al mes; cálculo de la app). El saldo corriente que no pagas pasa a diferido.' },
          tasa: { texto: '15,59 % nominal · 16,75 % efectiva anual',
            nota: 'Tarjetas Alia Classic, Gold, Platinum y Black. Alia Mi Socia, según su tipo de microcrédito: minorista 28,20 % efectiva · simple 22,42 % nominal / 24,87 % efectiva · ampliada 20,08 % nominal / 22,03 % efectiva.' },
          mora: { texto: 'Recargo sobre la tasa: 5 % (1 a 15 días), 7 % (16 a 30), 9 % (31 a 60) y 10 % (más de 60 días)',
            nota: 'Su tarifario dice que aplica a todos los productos vigentes. Sobre 15,59 % nominal da cerca de 16,37 %, 16,68 %, 16,99 % y 17,15 % (cálculo de la app, no cifra publicada).' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta',
            nota: 'Consumos de más de $100 en el exterior: $1,96 (hasta $100 no cobran). Consulta de saldo en cajero del exterior: $1,02. Gasolineras: $0,23 por consumo. Activación, bloqueo y notificaciones de tus consumos: $0,00.' },
          mantenimiento: { texto: '$0,00', nota: 'Mantenimiento, mantenimiento con pago mínimo y con pago total: $0,00.' },
          avance: { texto: '$5,13 por cada $100 o fracción; desde $0,35 en la app; $150,08 sobre $2.900',
            nota: 'Cajero (propio, local o externo): $5,13 por cada fracción de $100, de $50 a $1.000. Web, ventanilla (país o exterior), corresponsales y entidades auxiliares: $5,13 por fracción de $100 hasta $2.900 (el tarifario dice «desde $100»). App Solidario: $0,35 de $1 a $9,99 · $1,30 de $10 a $19,99 · $2,10 de $20 a $29,99 · $2,90 de $30 a $39,99 · $3,80 de $40 a $49,99, y desde $50 igual que lo anterior. Más de $2.900 por web, app, ventanilla o corresponsal: $150,08. El banco publica el valor de un tramo; los de varios tramos (por ejemplo $200 = $10,26) los calcula la app. Los centavos cuentan en el rango menor. Los intereses del avance van aparte.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'Por cuota vencida y días de atraso (1 a 30, 31 a 60, 61 a 90 y más de 90 días). Un solo cargo por la cuota con más días vencidos; la gestión preventiva antes del vencimiento no se cobra. Según el contrato, los gastos de cobranza van por tu cuenta.' },
          emision: { texto: '$5,03 con chip (emisión y renovación)', nota: 'Con banda lectora (sin chip): $0,00. La renovación solo se cobra cuando venció el plástico (vigencia mínima de 3 años).' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro físico', nota: 'Con banda lectora (sin chip): $0,00. Por migración o falla de la banda o del chip: $0,00.' },
          recompensas: { texto: '$5,75 a $62,10 al año según el segmento',
            nota: 'El tarifario lo publica por «segmento», no por tarjeta, y no dice qué tarjeta Alia corresponde a cada segmento: pregunta al banco. Plan de recompensas (anual): AA+ $62,10 · A+ $50,60 · B+ $32,20 · C+ $26,45 · D+ $11,50 · E+ $5,75. Prestaciones en el exterior (anual): AA+ y AA $27,60 · A+ y A $23,00 · B+ y B $18,40 · C+ y C $12,65 · D+ y D $8,05. Se cobra por períodos anuales y con tu aceptación por escrito.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52', nota: 'Referencias bancarias: $2,59 en oficina.' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta por cualquier canal del banco' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },

      {
        // Documento «Tasas y tarifas por servicios aplicados a las tarjetas de crédito» (SIN fecha de vigencia) + contrato de la tarjeta VISA (rev. junio 2023).
        // Ese documento no trae la tasa de la tarjeta ni los factores de diferido: se dejan sin dato (la app usa el techo legal como punto de partida).
        // El contrato leído es de Visa; no se sabe si emiten otra red, por eso se deja la lista general de redes.
        id: 'ec-amazonas', pais: 'EC', nombre: 'Banco Amazonas', corto: 'Amazonas',
        fuente: { texto: 'Tasas y tarifas por servicios aplicados a las tarjetas de crédito (documento sin fecha de vigencia, publicado en su página de transparencia; consultado el 6 de noviembre de 2026) y contrato de la tarjeta VISA (rev. junio 2023)', vigencia: 'sin fecha publicada (consultado nov. 2026)',
          url: 'https://www.bancoamazonas.com/transparencia-de-la-informacion/' },
        tarifarioUrl: 'https://cdn.sanity.io/files/1tcepar5/production/39b3bc03c865cfe051de5c72f295cc9729b6335c.pdf',
        // Avance: valor fijo con IVA según el monto. Cajero en el país y cajero en el exterior.
        avance: {
          tipo: 'escalones', etiqueta: 'Cajero automático (en el país)',
          escalones: [[0, 11.50], [101, 13.80], [201, 19.55], [301, 28.75], [401, 34.50], [501, 40.25], [601, 46.00], [701, 51.75], [801, 57.50], [901, 63.25], [1001, 72.13], [2001, 96.60], [3001, 128.80], [4001, 161.00], [5001, 168.08]],
          otrosCanales: [
            { etiqueta: 'Cajero automático (en el exterior)',
              escalones: [[0, 5.13], [100.01, 10.27], [200.01, 15.40], [300.01, 20.54]] },
          ],
        },
        costos: {
          rotativo: { texto: 'Tienes 15 días desde el estado de cuenta para pagar el total o el mínimo sin interés. Si pagas el mínimo o menos, el saldo pasa al «rotativo»',
            nota: 'Según el contrato de la tarjeta VISA (rev. junio 2023): si pagas el total o el mínimo dentro de los 15 días posteriores a la emisión del estado de cuenta no hay interés; si pagas solo el mínimo o menos, se activa automáticamente el sistema de saldo rotativo y el interés se recalcula sobre el capital pendiente. El mínimo suma el saldo rotativo dividido para el factor del banco, el interés de financiamiento, la afiliación o renovación, las cuotas de diferidos y las cuotas vencidas. Si no pagas a tiempo, corre la mora desde la fecha de vencimiento. El tarifario de tarjetas no publica la tasa ni el factor: pídelos al banco o míralos en tu estado de cuenta.' },
          mora: { texto: 'Recargo sobre la tasa: 5 % (1 a 15 días), 7 % (16 a 30), 9 % (31 a 60) y 10 % (más de 60 días)',
            nota: 'Sale de su tabla de tasas activas, no del documento de tarjetas, y se cuenta desde la fecha de vencimiento. Ese mismo documento trae un máximo de consumo de 17,30 % efectiva que no coincide con el techo legal que publican otros bancos (16,77 %), así que parece desactualizado: la app no lo usa como tasa de tu tarjeta.' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta',
            nota: 'Consumos de más de $100 en el exterior: $1,96. Consulta de saldo en cajero del exterior: $1,02. Gasolineras: $0,23 por consumo. Activación, bloqueo y frecuencia de transacciones: $0,00.' },
          mantenimiento: { texto: '$0,00', nota: 'Mantenimiento, afiliación y renovación de servicios básicos: $0,00.' },
          avance: { texto: 'Desde $5,13 hasta $168,08 según el monto y el lugar',
            nota: 'Valor fijo con IVA. Cajero en el país: $11,50 hasta $100,99 · $13,80 hasta $200,99 · $19,55 hasta $300,99 · $28,75 hasta $400,99 · $34,50 hasta $500,99 · $40,25 hasta $600,99 · $46,00 hasta $700,99 · $51,75 hasta $800,99 · $57,50 hasta $900,99 · $63,25 hasta $1.000,99 · $72,13 hasta $2.000,99 · $96,60 hasta $3.000,99 · $128,80 hasta $4.000,99 · $161,00 hasta $5.000,99 · $168,08 desde $5.001. Cajero en el exterior: $5,13 hasta $100 · $10,27 hasta $200 · $15,40 hasta $300 · $20,54 de $300,01 en adelante. Los intereses se cobran aparte. El documento no publica el avance por ventanilla.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'Misma tabla de la regulación (cobranza extrajudicial) que usan otros bancos; depende del valor de la cuota vencida y los días de atraso. Un solo cargo por la cuota con más días vencidos.' },
          emision: { texto: '$5,03 con chip (emisión y renovación)', nota: 'Activación, afiliación y renovación de servicios básicos: $0,00.' },
          reposicion: { texto: '$5,03 con chip por pérdida o robo', nota: 'Por actualización o falla de la banda: $0,00. Reposición en el exterior: $256,69.' },
          recompensas: { texto: '$5,75 a $50,60 al año según el segmento',
            nota: 'Lo publican por «segmento», no por tarjeta, y no dicen qué tarjeta corresponde a cada segmento: pregunta al banco. Plan de recompensas (anual): A+ $50,60 · B+ $32,20 · C+ $26,45 · D+ $11,50 · E+ $5,75. Prestaciones en el exterior (anual): A+ $23,00 · B+ $18,40 · C+ $12,65 · D+ $8,05.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior' },
          estado: { texto: 'Corte de estado de cuenta $1,87 · copia $0,52', nota: 'Referencias bancarias: $2,59.' },
          pagoTarjeta: { texto: 'Si pagas desde otra entidad: $0,39 por banca telefónica, celular, internet o kiosko · $0,45 por oficina, corresponsal o cajero',
            nota: 'Pago de tarjeta por teléfono (Amazonas Express): $6,90. Cheque devuelto: $2,86 o $3,32.' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },

      {
        // Tarifario «Costos de Servicios» (edición noviembre 2026) + contrato de emisión y uso de la tarjeta de crédito (archivo del 19 de mayo de 2025).
        // La página de la tarjeta dice «Tarjetas de Crédito Visa Clásica y Gold»; el tarifario solo nombra esos dos segmentos (C+ Gold-Oro y D+ Clásica).
        // El tarifario NO trae: recargo de mora de tarjeta, factores de diferido, plan de recompensas ni voucher → quedan sin dato.
        // Su logo oficial es verde oscuro (#006636) sobre fondo transparente: va sobre fondo claro.
        id: 'ec-manabi', pais: 'EC', nombre: 'Banco Comercial de Manabí', corto: 'Manabí', redes: ['Visa'],
        niveles: ['Clásica', 'Gold'],
        fuente: { texto: 'Tarifario de costos de servicios de Banco Manabí (noviembre 2026, sección «Costos de Servicios» de su página) y contrato de emisión y uso de la tarjeta de crédito (19 de mayo de 2025)', vigencia: 'noviembre 2026',
          url: 'https://www.bcmanabi.com/' },
        tarifarioUrl: 'https://www.bcmanabi.com/storage/files/TARIFARIO_NOVIEMBRE_2026-2026-11-05.pdf',
        // Su tabla de tasas dice «Interés en tarjetas de créditos»: 15,60 % nominal, 16,77 % efectiva, y la columna de máximos de la Junta marca también 16,77 %.
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjetas de crédito («interés en tarjetas de créditos»); es igual al máximo que publica la Junta' },
        // Avance: «$4,46 + IVA por cada $100,99 o fracción; sobre $2.901 el máximo es $130,50 + IVA». Misma fórmula para el país (cajero u oficina) y el exterior (oficina o cajero).
        // El banco publica el valor de un tramo; la app multiplica por tramos (n × $4,46 y luego el IVA).
        avance: {
          tipo: 'escalones', etiqueta: 'En el país y en el exterior (cajero u oficina)',
          escalones: [...tramos100(1, 29, 4.46, 15), [2901, 150.08]],
        },
        costos: {
          rotativo: { texto: 'Pagas el total dentro de 15 días del estado de cuenta: sin interés. Pagar solo el mínimo (o menos) te pasa al crédito rotativo',
            nota: 'Según su contrato de la tarjeta (archivo de mayo de 2025): tienes 15 días desde que se emite el estado de cuenta para pagar el total o el mínimo. Pagar el total en ese plazo no causa interés. El mínimo suma el saldo rotativo dividido para un factor que define el banco, los intereses de financiamiento, la afiliación o renovación, las cuotas de los diferidos y las cuotas vencidas; el factor puede cambiar y te lo informan en el estado de cuenta. Un pago parcial se aplica primero a intereses, luego a cargos y gastos, y el resto a capital, y el interés normal se cobra solo sobre lo pendiente. Si vence el plazo sin cubrir lo pendiente, el banco puede cobrar interés normal desde la fecha del consumo hasta el vencimiento, y desde ahí interés de mora más honorarios y gastos de cobranza documentados. Puedes prepagar total o parcialmente sin recargo. El tarifario no publica el factor del mínimo ni la tasa de mora de la tarjeta.' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual',
            nota: 'Es lo que su tarifario publica como «interés en tarjetas de créditos» y es igual al máximo que fija la Junta (16,77 % efectiva), o sea que no es una tasa menor al techo legal. No separa corriente de diferido ni publica factores por plazo; su página de la tarjeta dice que hay diferidos con y sin interés. Las tasas de otros segmentos de su tabla (productivo, microcrédito, sobregiros) no son de la tarjeta.' },
          uso: { texto: '$0,00 por consumos nacionales con la tarjeta',
            nota: 'Consumos de más de $100 en el exterior: $1,96. Consulta de saldo en cajero del exterior: $1,02. Gasolineras: $0,23 por consumo. Activación, notificaciones de tus consumos y frecuencia de transacciones: $0,00.' },
          mantenimiento: { texto: '$0,00',
            nota: 'Mantenimiento, con pago mínimo y con pago total; afiliación y renovación de la tarjeta principal y de la adicional (persona natural): $0,00. Aparte, en «servicios de terceros» su tarifario pone el seguro de desgravamen para clientes con tarjeta de crédito: $4,99 más impuestos ($5,20); no dice cada cuánto se cobra. En la línea de arriba del mismo seguro dice: si aceptas y firmas el débito del servicio de la aseguradora, 1 por mil mensual sobre el saldo adeudado, impuestos incluidos; no aclara cuál de las dos te toca: confírmalo con el banco.' },
          avance: { texto: '$5,13 por cada $100 o fracción; $150,08 sobre $2.900',
            nota: 'Cajero u oficina, en el país o en el exterior: $4,46 + IVA (= $5,13) por cada $100 o fracción. El banco publica el valor de un tramo; los de varios tramos (por ejemplo $200 = $10,26) los calcula la app. Desde $2.901 el máximo es $130,50 + IVA = $150,08. Los centavos cuentan en el rango menor. Los intereses del avance van aparte.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'Cobranza extrajudicial de créditos y tarjetas, por monto vencido (menos de $100 · $100–199 · $200–299 · $300–499 · $500–999 · más de $1.000) y días de atraso. 1 a 30 días: $7,34 · $8,45 · $9,11 · $9,57 · $9,92 · $10,21. 31 a 60 días: $18,66 · $18,93 · $20,50 · $23,39 · $27,59 · $33,10. 61 a 90 días: $26,65 · $27,43 · $29,06 · $31,54 · $34,89 · $39,11. Más de 90 días: $29,39 · $30,64 · $33,38 · $37,63 · $43,36 · $50,59.' },
          emision: { texto: '$5,03 con chip (emisión y renovación)', nota: 'Con banda lectora (sin chip): $0,00.' },
          reposicion: { texto: '$5,03 con chip por pérdida, robo o deterioro físico', nota: 'Por migración, actualización o falla de la banda o del chip: $0,00. Con banda lectora: $0,00.' },
          recompensas: { texto: 'Prestaciones en el exterior: $12,65 (Gold-Oro) · $8,05 (Clásica)',
            nota: 'Es lo único de este tipo que su tarifario publica, por segmento: C+ (Gold-Oro) $12,65 y D+ (Clásica) $8,05. No dice cada cuánto se cobra. No trae un plan de recompensas.' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 (cualquier medio) · copia en oficina $0,52', nota: 'Referencias bancarias y confirmaciones para auditores sobre tarjeta de crédito: $2,59. Copia de microfilm y documentos: $2,50.' },
          pagoTarjeta: { texto: '$0,00 al pagar tu tarjeta por cualquier canal del banco',
            nota: 'Si pagas desde canales de otra entidad: $0,39 por banca celular o internet · $0,45 por entidades de servicios auxiliares; ese cargo lo cobra la entidad dueña del canal. Cheque devuelto, aplicado a tarjeta de crédito: $2,86 (nacional) o $3,32 (del exterior).' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
        recompensasPorNivel: {
          'Clásica': 'Prestaciones en el exterior (segmento D+ Clásica): $8,05',
          'Gold': 'Prestaciones en el exterior (segmento C+ Gold-Oro): $12,65',
        },
      },

      {
        // Tarifario «de costos y comisiones» de cada tarjeta (julio 2026; el de la Standard y el de la Black son idénticos), preguntas frecuentes de cada tarjeta y tabla de tasas (octubre 2026).
        // Su tarifario general (octubre–diciembre 2026) NO trae tarjeta de crédito, solo débito. Las dos tarjetas son Mastercard; la Black es «solo bajo invitación».
        // Sus documentos se contradicen en varios puntos (plazo del diferido, tasa, pago mínimo, día de corte): se publican las dos versiones y no se escoge una.
        // La «Tarifa máxima» del tarifario es el techo permitido; las preguntas frecuentes dicen qué cobran hoy (por eso el uso en el exterior va a $0,00).
        // Su logo oficial es rojo sobre fondo transparente (colores del sitio, #D9272E y dos tonos cercanos): va sobre fondo claro.
        id: 'ec-atlantida', pais: 'EC', nombre: 'Banco Atlántida', corto: 'Atlántida', redes: ['Mastercard'],
        niveles: ['Standard', 'Black'],
        fuente: { texto: 'Tarifario de costos y comisiones de las tarjetas de crédito Standard y Black (julio 2026, idénticos), sus preguntas frecuentes y su tabla de tasas (octubre 2026)', vigencia: 'julio 2026',
          url: 'https://www.bancoatlantida.ec/banca-personas/tarjetas/tarjeta-credito-standard/' },
        tarifarioUrl: 'https://www.bancoatlantida.ec/docs/banca-personas/tarjetas/tc-standard/tarifario-tc-standard.pdf',
        // Sin `tasaPublicada`: la única tasa que dan es ambigua (ver costos.tasa), así que la app parte del techo legal y la persona la corrige.
        // Avance: «$5,13 por cada $100 en cajero nacional y $8,21 por cada $100 en cajero internacional» (sus preguntas frecuentes; ya incluyen IVA).
        // Límites: $500 por día (y $200 por transacción en cajero). Más de $500 no se calcula: se muestra el aviso.
        avance: {
          tipo: 'porCada100', baseUsd: 5.13, ivaPct: 0, etiqueta: 'Cajero automático (en el país)', maxUsd: 500,
          aviso: 'Banco Atlántida limita el avance a $500 por día (y $200 por transacción en cajero).',
          otrosCanales: [
            { tipo: 'porCada100', baseUsd: 8.21, ivaPct: 0, etiqueta: 'Cajero automático (en el exterior)', maxUsd: 500,
              aviso: 'Banco Atlántida limita el avance a $500 por día (y $200 por transacción en cajero).' },
          ],
        },
        costos: {
          rotativo: { texto: 'Pagas el total antes de la fecha máxima de pago (los 15): sin interés en las compras corrientes. Si pagas solo el mínimo, el saldo pendiente genera interés',
            nota: 'Según su tarifario de tarjetas (julio 2026): en el «crédito corriente» no hay cargo por intereses si cubres la deuda total hasta la fecha máxima de pago del estado de cuenta; en el «crédito rotativo» se aplica la tasa de financiamiento sobre el valor pendiente de pago, y los intereses se calculan sobre lo que queda después de tu pago (preguntas frecuentes). Fecha de corte: el día 30 de cada mes; fecha máxima de pago: el día 15. Pago mínimo: el tarifario dice 5 % del total adeudado más las cuotas diferidas, y las preguntas frecuentes de la Black dicen 4 % del total consumido; no coinciden, así que confirma el tuyo en el estado de cuenta. Si el día de corte cae en feriado o fin de semana, el tarifario lo pasa al siguiente día hábil y las preguntas frecuentes al día hábil anterior. Si no pagas ni el mínimo a tiempo, entras en mora.' },
          diferido: { texto: 'Plazos de 3, 6, 9, 12, 18 y 36 meses con intereses; referencia: 15 % nominal (16,08 % efectiva)',
            nota: 'El tarifario da esa tasa «como referencia» y no publica factores por plazo. Sus preguntas frecuentes dicen otra cosa: monto mínimo para diferir $100, plazo de hasta 24 meses, tasa de 15,15 % y un cargo que depende del monto y del plazo (el valor exacto te lo dicen al hacer el diferido). No se difiere en el comercio: compras como corriente y pides el diferido en una agencia. Para tarjetas de microcrédito la referencia es 17 % nominal (18,39 % efectiva).' },
          tasa: { texto: 'Consumo: 15,15 % según sus preguntas frecuentes (no dice si es nominal o efectiva)',
            nota: 'Es lo que responde la pregunta «¿cuáles son las tasas de interés?» de la tarjeta Black. Su tarifario da otra referencia para el diferido de consumo (15 % nominal, 16,08 % efectiva) y su tabla de tasas de octubre 2026 pone 16,77 % efectiva como máximo del segmento consumo. Como no queda claro cómo se expresa el 15,15 %, la app no lo toma como la tasa de tu tarjeta: mira tu estado de cuenta.' },
          mora: { texto: 'Porcentaje sobre el pago mínimo vencido: 5 % (1 a 15 días), 7 % (16 a 30), 9 % (31 a 60) y 10 % (más de 60 días)',
            nota: 'Su tarifario lo titula «interés calculado sobre el pago mínimo vencido» y no dice a qué tasa se aplica cada porcentaje ni cuánto da en total. Es la misma escala que otros bancos publican como recargo sobre su tasa.' },
          uso: { texto: '$0,00 por compras físicas y digitales, en Ecuador y en el exterior',
            nota: 'Según sus preguntas frecuentes, hoy solo cobran $0,23 por consumo en gasolineras. Su tarifario trae como máximos permitidos (techos) $1,96 por consumos de más de $100 en el exterior, $1,02 por consulta en cajero del exterior y $0,36 por consulta impresa en cajero nacional. Activación, notificaciones de tus consumos y frecuencia de transacciones: $0,00.' },
          mantenimiento: { texto: '$0,00',
            nota: 'Mantenimiento, pagos del mínimo y del total, entrega del estado de cuenta, bloqueo y cancelación de la tarjeta: $0,00. Renovar el servicio anual del token virtual: $3,45. Su tarifario anota caducidad del servicio de 1 año y del plástico de 5 años.' },
          avance: { texto: '$5,13 por cada $100 en cajero del país · $8,21 por cada $100 en cajero del exterior',
            nota: 'Valores con IVA, de sus preguntas frecuentes (el tarifario de tarjetas no los trae). Hasta el 50 % del cupo, $500 por día y $200 por transacción en cajero; también se hace por ventanilla en sus agencias (no publican un costo aparte). El banco dueño del cajero puede cobrar además. Los intereses del avance van aparte. Los valores de varios tramos los calcula la app (por ejemplo $200 = $10,26).' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'Por monto vencido (menos de $100 · $100–199 · $200–299 · $300–499 · $500–999 · $1.000–4.999) y días de atraso. 1 a 30 días: $7,34 · $8,45 · $9,11 · $9,57 · $9,92 · $10,21. 31 a 60 días: $18,66 · $18,93 · $20,50 · $23,39 · $27,59 · $33,10. 61 a 90 días: $26,65 · $27,43 · $29,06 · $31,54 · $34,89 · $39,11. 91 a 120 días: $29,39 · $30,64 · $33,38 · $37,63 · $43,36 · $50,59. Vía llamada, SMS, correo, carta o visita.' },
          emision: { texto: '$5,03 (emisión del plástico)',
            nota: 'Lo dicen sus preguntas frecuentes y su tarifario (emisión, renovación y reposición, $5,03 como máximo). Con banda lectora: $0,00. La tarjeta adicional cuesta $5,03 de emisión (preguntas frecuentes de la Black).' },
          reposicion: { texto: '$5,03 por reposición de la tarjeta (máximo del tarifario)', nota: 'Con banda lectora: $0,00.' },
          recompensas: { texto: '$8,05 al año por las prestaciones de la franquicia',
            nota: 'Sus preguntas frecuentes (Standard y Black, con el mismo texto) dicen que solo te debitan eso por las prestaciones nacionales e internacionales; no hablan de un plan de recompensas. La Black lista más prestaciones (Concierge, salas VIP, garantía extendida…) pero con el mismo valor.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior', nota: 'Copia de voucher o vale (máximos del tarifario).' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 · copia $0,52', nota: 'Te lo envían por correo y por SMS. Corte de movimientos: $1,87. Referencias bancarias: $2,59.' },
          pagoTarjeta: { texto: '$0,00 al pagar el mínimo o el total',
            nota: 'Canales de pago: agencias, cajeros, bancas móviles de otras entidades y débito automático de una cuenta Atlántida. No publican un cobro por pagar desde otro banco. Cheque devuelto: $2,86 (país) y $3,32 (exterior).' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
      },

      /* ---------------------------------------------------------------- COOPERATIVAS (Ecuador) */
      {
        // PRIMERA COOPERATIVA. Tarifario «Tarifario Tarjetas de Crédito» (código ROTO-01-02, versión 10/2026; archivo «Tarifario-TC-Octubre-2026.pdf») + las páginas de su sitio
        // de tarjetas: ¿Cómo diferir?, Servicios, JEP Recompensas y la ficha de la Visa Clásica (cupos de avance).
        // El tarifario publica «Tasa Máxima Nominal» (15,60 % en consumo = máximo de la Junta): es un techo, no necesariamente lo que cobran → se dice en la ficha.
        // El tarifario NO explica el corriente; su contrato (sin fecha) da el plazo de 15 días para pagar el total y cómo se arma el mínimo (sin porcentaje). La mora se publica como «recargo por morosidad» sin decir sobre qué valor.
        // Sus valores de cobranza vienen SIN IVA (lo dice el pie de la tabla); aquí van ya con IVA (valor × 1,15, cálculo de la app). El valor de más de 90 días para cuotas de $100 a $199,99 es
        // $26,54 en su tarifario, y otros bancos publican $26,64: se muestra lo que dice la cooperativa y se avisa.
        // Su logo oficial (archivo SVG de jep.coop) trae un lema en blanco que no se ve sobre fondo claro: se usa solo el círculo verde con «JEP».
        id: 'ec-jep', pais: 'EC', tipo: 'cooperativa', nombre: 'Cooperativa JEP (Juventud Ecuatoriana Progresista)', corto: 'JEP', redes: ['Visa', 'Mastercard'],
        niveles: ['Clásica / Standard', 'Gold', 'Signature', 'Infinite / Black'],
        fuente: { texto: 'Tarifario de tarjetas de crédito de la Cooperativa JEP (octubre 2026, versión 10/2026) y las páginas de su sitio de tarjetas (cómo diferir, servicios, JEP Recompensas, Visa Clásica)', vigencia: 'octubre 2026',
          url: 'https://www.tarjetasjep.com/tarjeta-credito/tarifario' },
        tarifarioUrl: 'https://www.tarjetasjep.com/documents/20181/0/Tarifario-TC-Octubre-2026.pdf/',
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjetas de consumo (rotativo y diferido): su tarifario la llama «tasa máxima nominal» y es igual al máximo de la Junta' },
        // Avance: «por cada $100,00 o fracción $4,46 + IVA, con un máximo de $223,00 + IVA» (cajero u oficina; propios, locales y exterior).
        // Su tabla de rangos va de $0,01 a $100,00, de $100,01 a $200,00… (el centavo cuenta en el tramo siguiente) y de $4.900,01 en adelante: $223,00 + IVA = $256,45.
        avance: {
          tipo: 'escalones', etiqueta: 'Cajero u oficina, en el país y en el exterior',
          escalones: [...tramos100(1, 49, 4.46, 15).map(([, v], i) => [Number((i === 0 ? 0.01 : i * 100 + 0.01).toFixed(2)), v]), [4900.01, 256.45]],
        },
        costos: {
          rotativo: { texto: 'Pagas el total dentro de 15 días desde que se emite el estado de cuenta; si pagas solo el mínimo pasas al crédito rotativo. Su contrato no dice expresamente que esos 15 días sean sin interés',
            nota: 'Según su contrato de emisión y uso de la tarjeta (documento sin fecha, https://www.jep.coop/documents/20182/183306/contrato-emision-uso-tc.pdf): el estado de cuenta trae la fecha de corte y la fecha máxima de pago, y el pago total debe hacerse dentro de los 15 días posteriores a su emisión. El mínimo es la suma de los valores exigibles (cuotas de consumos, intereses y costos) más un porcentaje de tus consumos del último mes que no dice cuál es, y la cooperativa puede cambiar la forma de calcularlo. Pagar solo el mínimo te pasa al crédito rotativo. Los intereses de financiamiento se calculan sobre los saldos de uso del cupo, con las tasas vigentes a la fecha del consumo. Su tarifario (octubre 2026) publica solo la tasa del rotativo (15,60 % nominal en consumo; es el máximo). Fechas de corte que publica: fin de cada mes, 12, 15, 18, 03 y 26; fechas de pago: 15, 27, 30, 03, 18 y 11 de cada mes, escritas en ese mismo orden. Para diferir debes haber pagado el valor mínimo. El plástico vale 6 años.' },
          diferido: { texto: '15,60 % nominal (16,77 % efectiva) con factor por plazo: 3 meses 2,61 % · 6 meses 4,60 % · 12 meses 8,65 % · 24 meses 17,06 % · 36 meses 25,86 % · 60 meses 44,64 %',
            nota: 'También 9 meses 6,61 % · 18 meses 12,80 % · 30 meses 21,41 % · 48 meses 35,05 %. El factor sirve para estimar el interés total sobre el monto diferido (por ejemplo, $1.000 a 12 meses ≈ $86,50 de interés; cálculo de la app). Hasta 60 meses. Cómo diferir: llamando al 07 413 5000 (todos los días, 24 horas); su ficha de la Visa Clásica añade agencias, JEPMóvil y JEPVirtual. Se puede diferir: compras corrientes nacionales, del exterior o por internet, del mes actual o de meses anteriores, y avances en cajero o en ventanilla. Hasta un día antes de la fecha de corte y con el valor mínimo ya pagado. En comercios afiliados del país hay diferidos con y sin intereses; si el comercio no te lo permite, compras en corriente y los llamas. Pymes, empresarial y corporativo tienen tasas y factores propios más bajos (a 12 meses: 5,23 % · 5,44 % · 4,17 %).' },
          tasa: { texto: '15,60 % nominal · 16,77 % efectiva anual (consumo)',
            nota: 'Su tarifario titula la fila «Tasa Máxima Nominal»; para consumo es igual al máximo que fija la Junta (16,77 % efectiva), o sea que es el techo y no necesariamente lo que te cobran: míralo en tu estado de cuenta. Otros segmentos de su tabla (nominal / efectiva): Pymes 9,52 % / 9,95 % · empresarial 9,89 % / 10,35 % · corporativo 7,61 % / 7,88 %. No separa corriente de rotativo con otra tasa.' },
          mora: { texto: 'Recargo por morosidad: 5 % (1 a 15 días) · 7 % (16 a 30) · 9 % (31 a 60) · 10 % (más de 60 días)',
            nota: 'Su tarifario lo titula «Tasa mora» y «recargo por morosidad»; no dice sobre qué valor se aplica ni cada cuánto (otros bancos publican la misma escala como recargo sobre su tasa). Confírmalo con la cooperativa.' },
          uso: { texto: '$0,00 por consumos nacionales; $1,96 por consumos de más de $100 en el exterior',
            nota: 'En consumos en el exterior se cobra además el 5 % de Impuesto a la Salida de Divisas (lo dice su tarifario). Ojo: en su tabla de recompensas la misma hoja dice que no autoriza cargo adicional por consumos en el exterior; confirma con la cooperativa si te cobran los $1,96. Frecuencia de transacciones, activación y consultas en JEPMóvil, cajeros, JEPVirtual, Call Center y oficina: $0,00. Consulta de saldo impresa en cajero propio o nacional: $0,36; en cajero del exterior: $1,02 (su tabla escribe $0,31 en la columna de tarifa pero el total es $1,02, igual que en su tarifa de prepago).' },
          mantenimiento: { texto: '$0,00',
            nota: 'Mantenimiento de la tarjeta de crédito, pagos por canales JEP, bloqueo, anulación y cancelación, y estados de cuenta por medios electrónicos: $0,00. Aparte hay un seguro de desgravamen solo si firmas la solicitud de adhesión (según la póliza vigente): cobertura normal $0,89 para saldos hasta $10.000 y $1,30 hasta $15.000 (el costo sube por rangos), y cobertura por accidentes personales $0,86 al mes hasta $10.000 y $1,25 hasta $15.000. Para la cobertura normal no dice cada cuánto se cobra; los valores incluyen impuestos.' },
          avance: { texto: '$5,13 por cada $100 o fracción; $256,45 desde $4.900,01',
            nota: 'Cajero u oficina, en el país o en el exterior: $4,46 + IVA (= $5,13) por cada $100 o fracción, con un máximo de $223,00 + IVA ($256,45). Su tabla da el valor de cada tramo (por ejemplo $200 = $10,26 · $1.000 = $51,29 · $2.500 = $128,23). Los rangos son de $x00,01 a $x00,00. Límites por día, según cupo disponible (ficha de la Visa Clásica; las demás tarjetas pueden tener otros): ventanilla nacional $1.500 (mensual $2.000), ventanilla del exterior $1.010, cajero nacional y del exterior $510. En cajeros JEP y de las redes Banred, Plus, Cirrus y Maestro; la clave la pides al Call Center. Los intereses del avance van aparte, y el avance se puede diferir.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'Su tabla trae los valores sin IVA; aquí van ya con IVA (valor × 1,15, cálculo de la app). Por cuota vencida (menos de $100 · $100–199,99 · $200–299,99 · $300–499,99 · $500–999,99 · desde $1.000) y días de atraso. 1 a 30 días: $7,34 · $8,45 · $9,11 · $9,57 · $9,92 · $10,21. 31 a 60 días: $18,66 · $18,93 · $20,50 · $23,39 · $27,59 · $33,10. 61 a 90 días: $26,65 · $27,43 · $29,06 · $31,54 · $34,89 · $39,11. Más de 90 días: $29,39 · $30,52 · $33,38 · $37,63 · $43,36 · $50,59. Ojo: para $100–199,99 y más de 90 días la cooperativa publica $26,54 (= $30,52 con IVA); otros bancos publican $26,64 (= $30,64).' },
          emision: { texto: '$5,03 (tarjeta principal o adicional con chip; la renovación cuesta igual)',
            nota: 'Para pedir la tarjeta debes ser socio de la cooperativa. Las adicionales son para familiares hasta el segundo grado de consanguinidad y el primero de afinidad. Reposición por falla de la banda lectora o del chip, o por migración: $0,00.' },
          reposicion: { texto: '$5,03 por pérdida, robo o deterioro físico', nota: 'Por migración o por falla de la banda lectora o del chip: $0,00.' },
          recompensas: { texto: 'JEP Recompensas: de $11,50 a $62,10 al año según la tarjeta (1 punto por cada $1 de consumo)',
            nota: 'Cuesta por año y solo se cobra si aceptas entrar al programa: Visa Clásica y Mastercard Standard $11,50 · Gold $26,45 · Visa Signature $50,60 · Mastercard Black y Visa Infinite $62,10 (todo con IVA). Las prestaciones en el exterior salen $0,00. No suman puntos los avances, las gasolineras ni el pago de servicios básicos y públicos; los consumos de adicionales suman al titular. Los pagos vencidos o retrasados, cancelar la tarjeta o salir del programa te pueden quitar los puntos.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior', nota: 'Copia de voucher o vale.' },
          estado: { texto: 'Estado de cuenta electrónico y a domicilio $0,00 · copia $0,52', nota: 'Corte impreso de movimientos en oficina: $1,87. Referencias financieras: $2,59.' },
          pagoTarjeta: { texto: '$0,00 al pagar por los canales de JEP (agencias, JEPMóvil, JEPVirtual)',
            nota: 'No publica un cobro por pagar desde otra entidad. Cheque devuelto aplicado a la tarjeta: $2,86 (nacional) o $3,32 (del exterior).' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
        recompensasPorNivel: {
          'Clásica / Standard': 'JEP Recompensas: $11,50 al año (segmento D+) · prestaciones en el exterior $0,00',
          'Gold': 'JEP Recompensas: $26,45 al año (segmento C+) · prestaciones en el exterior $0,00',
          'Signature': 'JEP Recompensas: $50,60 al año (segmento A+) · prestaciones en el exterior $0,00',
          'Infinite / Black': 'JEP Recompensas: $62,10 al año (segmento AA+) · prestaciones en el exterior $0,00',
        },
      },

      {
        // SEGUNDA COOPERATIVA. Tarifario «Tarifario» de la CPN (noviembre 2026, archivo tarifario-2026-11.pdf, publicado en su sección Transparencia) + sus páginas de tarjetas y de avances de efectivo.
        // Su sitio pidió un captcha («No soy un robot», Radware): lo pulsó Luis a mano; la app no lo salta.
        // Su tarifario mezcla valores con y sin IVA (por ejemplo emisión de la tarjeta de crédito $4,37 y de la de débito $5,03) y al pie de una tabla dice «Valores con IVA»: se publican tal cual y se avisa.
        // NO publica recargo de mora de tarjeta ni explica el corriente (días sin interés, pago mínimo, fechas de corte): quedan sin dato / dicho en la ficha.
        // La tabla de planes de recompensa llama «Mastercard Clásica» al segmento D+; su página de la tarjeta de entrada se llama «Standard».
        // Su logo oficial (archivo SVG de su sitio) es gris oscuro y naranja sobre fondo transparente: va sobre fondo claro.
        id: 'ec-cpn', pais: 'EC', tipo: 'cooperativa', nombre: 'Cooperativa Policía Nacional (CPN)', corto: 'CPN', redes: ['Mastercard'],
        niveles: ['Standard', 'Gold', 'Platinum', 'Black'],
        fuente: { texto: 'Tarifario de la Cooperativa de Ahorro y Crédito Policía Nacional (noviembre 2026) y las páginas de sus tarjetas y de avances de efectivo', vigencia: 'noviembre 2026',
          url: 'https://www.cpn.fin.ec/transparencia' },
        tarifarioUrl: 'https://www.cpn.fin.ec/Portals/0/Footer/tarifario-2026-11.pdf',
        // Rotativo: «16,77 %» en la columna de tasa efectiva. Diferido: 15,60 % nominal y 16,77 % efectiva con factores. Ambas son iguales al máximo de la Junta.
        tasaPublicada: { efectivaAnual: 16.77, nominalAnual: 15.60, aplicaA: 'tarjeta de crédito: rotativo 16,77 % efectiva; diferido 15,60 % nominal (16,77 % efectiva); es igual al máximo de la Junta' },
        // Avance: «Hasta $2.900: $4,46 por cada $100 o fracción · Superior a $2.900: $133,93 por cada avance». No dice si lleva IVA: la app calcula con el valor tal cual (sin sumar IVA) y lo avisa.
        avance: {
          tipo: 'escalones', etiqueta: 'Avance de efectivo (cajero, oficina o app)',
          escalones: [...tramos100(1, 29, 4.46, 0).map(([, v], i) => [Number((i === 0 ? 0.01 : i * 100 + 0.01).toFixed(2)), v]), [2900.01, 133.93]],
        },
        costos: {
          rotativo: { texto: 'Su tarifario publica la tasa del rotativo (16,77 % efectiva), pero no explica cuántos días tienes sin interés ni cómo se calcula el pago mínimo',
            nota: 'Ni su tarifario ni las páginas de sus tarjetas explican cuándo corre el interés del corriente, cuánto es el pago mínimo ni cuáles son las fechas de corte y de pago: míralo en tu contrato y en tu estado de cuenta. Lo que sí publica: mantenimiento con pago mínimo y con pago total, $0,00.' },
          diferido: { texto: '15,60 % nominal (16,77 % efectiva) con factor por plazo: 3 meses 2,61 % · 6 meses 4,60 % · 9 meses 6,61 % · 12 meses 8,65 % · 24 meses 17,05 %',
            nota: 'El factor sirve para estimar el interés total sobre el monto diferido (por ejemplo, $1.000 a 12 meses ≈ $86,50 de interés; cálculo de la app). Sus páginas dicen: diferir hasta 24 meses con intereses o hasta 12 meses sin intereses según el establecimiento; los avances de efectivo se difieren de 3 a 24 meses desde $100. La página de la Gold habla de refinanciar consumos o saldos hasta 36 meses, un plazo que el tarifario no trae.' },
          tasa: { texto: '16,77 % efectiva (rotativo) · 15,60 % nominal = 16,77 % efectiva (diferido)',
            nota: 'Su tarifario no trae la tasa nominal del rotativo (solo 16,77 % efectiva), y las dos son iguales al máximo que fija la Junta: es el techo, no necesariamente lo que te cobran. Míralo en tu estado de cuenta.' },
          uso: { texto: '$0,00 por consumos nacionales; $1,70 por consumos de más de $100 en el exterior',
            nota: 'Los consumos de $100 o menos en el exterior no tienen cargo, salvo los valores que dispone la ley (como el Impuesto a la Salida de Divisas). Consulta en cajero del exterior: $0,89. Consulta impresa en cajero: $0,36. Gasolineras: $0,23. Notificaciones de tus consumos y frecuencia de transacciones: $0,00. Su tarifario no aclara si estos valores llevan IVA.' },
          mantenimiento: { texto: '$0,00',
            nota: 'Mantenimiento de la tarjeta de crédito, con pago mínimo y con pago total; pagos de la tarjeta por cualquier canal de la CPN; activación; bloqueo, anulación y cancelación; estados de cuenta en cualquier medio: $0,00. Sus páginas dicen que la Standard y la Platinum no tienen costo de mantenimiento. Aparte, su tabla de «gastos con terceros» trae seguro de desgravamen para tarjeta de crédito (personas naturales): 1,59 por mil; no dice sobre qué valor ni cada cuánto se cobra.' },
          avance: { texto: '$4,46 por cada $100 o fracción hasta $2.900; $133,93 desde $2.900,01',
            nota: 'Su tarifario no dice si el valor lleva IVA (otras entidades publican $4,46 + IVA = $5,13 por cada $100): la app calcula con el valor tal como está publicado, así que si te cobran IVA aparte el costo real es un 15 % mayor. Los valores de varios tramos los calcula la app (por ejemplo $200 = $8,92). Lo pides en la App CPN Móvil, la Cooperativa Virtual, las oficinas o los más de 160 cajeros; el dinero llega a tu cuenta de ahorros CPN, hasta tu cupo disponible. Los intereses del avance van aparte.' },
          cobranza: { texto: 'De $6,38 a $43,99 (valores de su tabla)',
            nota: 'Por monto vencido (menos de $100 · $100–199 · $200–299 · $300–499 · $500–999 · más de $1.000) y días de atraso. 1 a 30 días: $6,38 · $7,35 · $7,92 · $8,32 · $8,63 · $8,88. 31 a 60 días: $16,23 · $16,46 · $17,83 · $20,34 · $23,99 · $28,78. 61 a 90 días: $23,17 · $23,85 · $25,27 · $27,43 · $30,34 · $34,01. Más de 90 días: $25,56 · $26,64 · $29,03 · $32,72 · $37,70 · $43,99. Su tabla dice «Valores con IVA», pero son las mismas cifras que JEP y otras entidades publican sin IVA (JEP aclara que se les suma el IVA); si hay que sumarlo serían de $7,34 a $50,59 (cálculo de la app). No cobran nada por la gestión hecha antes del vencimiento ni por la gestión preventiva.' },
          emision: { texto: '$4,37 por emisión del plástico con chip (la renovación cuesta igual)',
            nota: 'Su tarifario no aclara si lleva IVA (en otras entidades es $4,37 + IVA = $5,03). Vigencia mínima del plástico: tres años. Con banda lectora: $0,00. Sus páginas dicen que la pides desde la App CPN Móvil, su sitio web u oficinas, desde los 18 años.' },
          reposicion: { texto: '$4,37 por pérdida, robo o deterioro físico (con chip)', nota: 'Por migración, actualización o falla de la banda lectora o del chip: $0,00. Con banda lectora: $0,00.' },
          recompensas: { texto: 'Plan de recompensas anual (columna «Cargo»): Black $54,00 · Platinum $28,00 · Gold $23,00 · Clásica $10,00',
            nota: 'Prestaciones en el exterior: Black $24,00 · Platinum $16,00 · Gold $11,00 · Clásica $7,00. Segmentos: AA+ Black, B+ Platinum, C+ Gold y D+ Clásica. Es un cargo anual que solo se cobra si aceptas por escrito entrar al plan, y su tarifario dice que no autoriza cargo adicional por consumos en el exterior. Si la columna «Cargo» no incluye IVA, con 15 % serían $62,10 · $32,20 · $26,45 · $11,50 (plan) y $27,60 · $18,40 · $12,65 · $8,05 (prestaciones); cálculo de la app, y son los mismos totales que publican otros bancos.' },
          voucher: { texto: '$1,79 del país · $8,93 del exterior', nota: 'Copia de voucher o vale (valores de su tabla; no aclara si llevan IVA).' },
          estado: { texto: 'Entrega del estado de cuenta $0,00 (medios electrónicos y físicos) · copia $0,45', nota: 'Corte impreso de movimientos en oficina: $1,87. Referencias bancarias de tarjeta de crédito: $2,59. No aclara si llevan IVA.' },
          pagoTarjeta: { texto: '$0,00 al pagar por cualquier canal de la CPN', nota: 'No publica un cobro por pagar desde otra entidad. Cheque devuelto nacional: $2,49.' },
          gasolinera: { texto: '$0,23 por consumo' },
        },
        recompensasPorNivel: {
          'Standard': 'Plan de recompensas $10,00 al año · prestaciones en el exterior $7,00 (segmento D+, valores de su tabla)',
          'Gold': 'Plan de recompensas $23,00 al año · prestaciones en el exterior $11,00 (segmento C+, valores de su tabla)',
          'Platinum': 'Plan de recompensas $28,00 al año · prestaciones en el exterior $16,00 (segmento B+, valores de su tabla)',
          'Black': 'Plan de recompensas $54,00 al año · prestaciones en el exterior $24,00 (segmento AA+, valores de su tabla)',
        },
      },

      {
        // TERCERA COOPERATIVA. Sí ofrece «Tarjeta de Crédito Mastercard» (su página: se pide en una agencia, hay que ser socio con la cuenta activa), pero NO publica sus tasas ni costos:
        // su tarifario de octubre 2026 trae tasas de crédito de consumo/vivienda/microcrédito y cobranza por tipo de crédito (no de tarjeta), y su catálogo de productos y servicios 2025 no menciona la tarjeta de crédito.
        // La única línea que nombra la tarjeta de crédito es la reposición del plástico con chip ($5,03, «cargo máximo»), compartida con la de débito.
        // Por eso solo va esa fila y el resto queda «sin dato» para que la persona lo anote. La tasa sugerida sale del techo legal (no se toma la del crédito de consumo: no es la de la tarjeta).
        // Su logo oficial (PNG de su sitio) es verde y amarillo sobre fondo transparente, con el lema «Invierte en tu futuro…»: va sobre fondo claro.
        id: 'ec-pmv', pais: 'EC', tipo: 'cooperativa', nombre: 'Cooperativa Pablo Muñoz Vega', corto: 'Pablo Muñoz Vega', redes: ['Mastercard'],
        fuente: { texto: 'Tarifario de octubre 2026 y catálogo de productos y servicios 2025 de la Cooperativa Pablo Muñoz Vega (no publican tasas ni costos de su tarjeta de crédito)', vigencia: 'octubre 2026',
          url: 'https://www.cpmv.fin.ec/servicios/tarjeta-de-credito-mastercard' },
        tarifarioUrl: 'https://www.cpmv.fin.ec/documentos/transparencia/tarifario-2026-10-octubre.pdf',
        aviso: 'La cooperativa ofrece la Tarjeta de Crédito Mastercard, pero no publica sus tasas ni sus costos (ni en su tarifario de octubre 2026 ni en su catálogo): pídelos en una agencia o anótalos de tu contrato y estado de cuenta.',
        costos: {
          reposicion: { texto: '$5,03 como máximo (plástico con chip, por pérdida, robo o deterioro físico)',
            nota: 'Es el cargo máximo que su tarifario pone para «tarjeta de crédito / tarjeta de débito con chip», sin separar una de otra; no dice cuánto cobran por la de crédito. Se exceptúan las fallas del chip.' },
        },
      },

      {
        // CUARTA COOPERATIVA. Tarifario específico «Tarjeta de crédito» de Cooprogreso (noviembre 2026), publicado en su sección de transparencia, más su tabla de «tasas de interés de crédito» y su tabla de costos de servicios.
        // Emite «Tarjeta de Crédito Mastercard» y su página la muestra en dos niveles (Mastercard y Black). Su tarifario NO separa los costos por nivel: lo que va aquí vale para la tarjeta de crédito en general.
        // Su tabla de tasas dice «15,15 %» y «16,25 %» para la tarjeta ($300 a $20.000, 3 a 36 meses): 15,15 % es la NOMINAL y 16,25 % la efectiva (cálculo de la app: con capitalización mensual 15,15 % equivale a 16,25 %). No dice si es una tasa fija o un máximo.
        // No trae factores de diferido, ni la tasa del rotativo por separado, ni el detalle de recompensas por tarjeta: eso queda «sin dato» y no se inventa.
        // Su logo oficial (PNG de su sitio) es verde claro y verde oscuro sobre fondo transparente: va sobre fondo claro.
        id: 'ec-cooprogreso', pais: 'EC', tipo: 'cooperativa', nombre: 'Cooperativa Cooprogreso', corto: 'Cooprogreso', redes: ['Mastercard'],
        niveles: ['Mastercard', 'Black'],
        fuente: { texto: 'Tarifario de la tarjeta de crédito de Cooprogreso (noviembre 2026), sus tasas de crédito y sus costos de servicios', vigencia: 'noviembre 2026',
          url: 'https://www.cooprogreso.fin.ec/tarjetas/credito' },
        tarifarioUrl: 'https://www.cooprogreso.fin.ec/Portals/0/Documentos/transparencia-de-la-informacion/costos-financieros/2026/tarifario-tarjeta-de-credito-noviembre-2026.pdf',
        tasaPublicada: { efectivaAnual: 16.25, nominalAnual: 15.15, aplicaA: 'tarjeta de crédito Mastercard ($300 a $20.000, 3 a 36 meses); su tabla no dice si es fija o máxima' },
        // Avance: dos tablas con valores totales (ya con IVA, el mismo $5,13 por cada $100 que publican otras entidades): una para cajeros y ventanillas del país y otra para cajeros del exterior.
        avance: {
          tipo: 'escalones', etiqueta: 'Cajeros y ventanillas nacionales',
          escalones: [[0.01, 5.13], [100.01, 10.27], [200.01, 15.40], [300.01, 20.54], [500.01, 25.67], [700.01, 30.81], [1000.01, 35.94]],
          otrosCanales: { etiqueta: 'Cajeros internacionales', escalones: [[0.01, 8.21], [100.01, 16.43], [200.01, 24.64], [300.01, 32.86], [500.01, 41.07], [700.01, 49.29], [1000.01, 57.50]] },
        },
        costos: {
          rotativo: { texto: 'Pagas en tu fecha de pago (15 días después del corte) y no pasas al rotativo; su tarifario no publica una tasa separada para el rotativo',
            nota: 'Fechas de corte: el 17 o el 2 de cada mes (según tu tarjeta); la fecha de pago es 15 días después. Su tarifario publica una sola tasa para la tarjeta (15,15 % nominal · 16,25 % efectiva) y no separa corriente de rotativo ni explica cómo se calcula el pago mínimo: míralo en tu contrato y en tu estado de cuenta.' },
          diferido: { texto: '15,15 % nominal (16,25 % efectiva) a 3, 6, 9, 12, 18 o 36 meses',
            nota: 'No publica factores por plazo, así que la app calcula el interés con la tasa nominal y el plazo que elijas (cálculo de la app, no un valor del tarifario).' },
          tasa: { texto: '15,15 % nominal · 16,25 % efectiva anual',
            nota: 'De su tabla de tasas de interés de crédito (tarjeta de crédito Mastercard, de $300 a $20.000, de 3 a 36 meses). No dice si es la tasa que te cobran o un máximo: míralo en tu estado de cuenta. Está por debajo del techo que fija la Junta para consumo (16,77 % efectiva).' },
          mora: { texto: 'Recargo por mora de 5 %, 7 %, 9 % o 10 % sobre el pago mínimo vencido',
            nota: 'El porcentaje sube con los días de atraso; los tramos exactos están en su tarifario.' },
          mantenimiento: { texto: '$0,00',
            nota: 'Su tarifario pone el mantenimiento de la tarjeta de crédito, con pago mínimo y con pago total, entre los servicios y transacciones gratuitos; también la activación y el bloqueo, anulación o cancelación.' },
          avance: { texto: 'De $5,13 a $35,94 en cajeros y ventanillas del país, según el monto; de $8,21 a $57,50 en cajeros del exterior',
            nota: 'Dos tablas por canal. País: $0,01–$100 = $5,13 · $100,01–$200 = $10,27 · $200,01–$300 = $15,40 · $300,01–$500 = $20,54 · $500,01–$700 = $25,67 · $700,01–$1.000 = $30,81 · desde $1.000,01 = $35,94. Exterior: $8,21 · $16,43 · $24,64 · $32,86 · $41,07 · $49,29 · $57,50 en esos mismos rangos. Su tarifario aclara que el cargo aplica también cuando se hace el avance en cajeros de la cooperativa con una tarjeta de crédito de otra entidad. Los intereses del avance van aparte.' },
          cobranza: { texto: 'Para un vencido de más de $1.000: $10,21 (1 a 30 días) · $33,10 (31 a 60) · $39,11 (61 a 90) · $50,59 (más de 90), con IVA',
            nota: 'Su tabla es por monto vencido y días de atraso; en el texto que registré leí completa solo la fila de más de $1.000: $8,88 · $28,78 · $34,01 · $43,99, sin IVA (con IVA ×1,15: cálculo de la app). Los otros montos están en su tarifario y no los transcribí.' },
          emision: { texto: '$5,03 por emisión del plástico con chip (la renovación cuesta igual)',
            nota: '$4,37 + IVA. Su tarifario lista la emisión de plástico de tarjeta de crédito con chip y la renovación de plástico de tarjeta de crédito con chip.' },
          reposicion: { texto: '$5,03 por pérdida, robo o deterioro físico', nota: 'Es el mismo valor que la emisión; su tarifario excluye los casos que indica en la nota de ese servicio.' },
          recompensas: { texto: 'Plan de recompensas anual con cargo según tu segmento; su tarifario no dice qué tarjeta lleva cada segmento',
            nota: 'La fila que alcancé a leer completa es el Segmento E+: $5,00. Los demás segmentos y los puntos que da cada uno están en su tarifario.' },
          voucher: { texto: '$2,06 del país · $8,93 del exterior', nota: 'Copia de voucher o vale. En el país: $1,79 + IVA. Del exterior su tabla solo trae $8,93.' },
          estado: { texto: 'Estado de cuenta a domicilio $1,91 · copia $0,52', nota: 'Entrega a domicilio: $1,66 + IVA. Copia: $0,45 + IVA.' },
          gasolinera: { texto: '$0,23 por consumo', nota: '$0,20 + IVA, en consumos con tarjeta de crédito o débito.' },
        },
      },

      {
        // QUINTA COOPERATIVA. Su sitio tiene una página «Tarjeta de Crédito» (https://mushucruna.com/tarjeta-de-credito-n3/) pero sin texto con tasas ni costos (la página solo trae el menú y el pie),
        // y su documento de costos financieros de julio 2026 (https://mushucruna.com/wp-content/uploads/COSTOS-FINANCIEROS-JULIO-2026.pdf) es una imagen escaneada de 1 página: no se pudo leer como texto desde aquí y NO se transcribe nada de memoria.
        // Por eso queda registrada con su logo y un aviso, sin ninguna cifra (todo «sin dato»): la persona anota sus valores o los pide en una agencia. Su tabla de costos tiene fecha de julio 2026: puede estar desactualizada.
        // Su logo oficial (PNG de su sitio, «Logo-H-Mushuc-Runa.png») es rojo y verde sobre fondo transparente: va sobre fondo claro. La red de la tarjeta no consta: no se asume.
        id: 'ec-mushucruna', pais: 'EC', tipo: 'cooperativa', nombre: 'Cooperativa Mushuc Runa', corto: 'Mushuc Runa',
        fuente: { texto: 'Página de la tarjeta de crédito de Mushuc Runa y su documento de costos financieros de julio 2026 (imagen escaneada, no leída)', vigencia: 'julio 2026',
          url: 'https://mushucruna.com/tarjeta-de-credito-n3/' },
        tarifarioUrl: 'https://mushucruna.com/wp-content/uploads/COSTOS-FINANCIEROS-JULIO-2026.pdf',
        aviso: 'La cooperativa tiene una página de tarjeta de crédito, pero no pude leer sus tasas ni sus costos (su tabla de costos de julio 2026 es una imagen): pídelos en una agencia o anótalos de tu contrato y estado de cuenta.',
        costos: sinDatos,
      },

      {
        // SEXTA COOPERATIVA. «Tarifario tarjeta de crédito» de OSCUS (Latacunga), «información actualizada a octubre 2026» (código GCM.TDC.RGO.004, rev. 06), publicado en su sitio en
        // Transparencia → Tarifarios de la Cooperativa (https://oscus.coop/dashboard/tarifarios-cooperativa). El PDF vive en el almacenamiento de Google que usa su propio sitio.
        // Detalle que se avisa: el pie del mismo PDF dice «Ref: 02/Julio/2024» (es la referencia del formulario; el encabezado dice octubre 2026).
        // Su sitio ofrece OSCUS Mastercard en tres niveles (Standard, Gold y Black); el tarifario es uno solo y no separa costos por nivel.
        // Sus avances y varios servicios vienen SIN IVA («se le agregará el 15 % correspondiente al IVA»): la app los muestra con IVA (valor × 1,15, cálculo de la app, redondeado al centavo).
        // Sí trae factores de diferido y fechas de corte y de pago; NO trae recompensas ni una tasa propia del rotativo. Su logo oficial (PNG de su sitio) va sobre fondo claro.
        id: 'ec-oscus', pais: 'EC', tipo: 'cooperativa', nombre: 'Cooperativa OSCUS', corto: 'OSCUS', redes: ['Mastercard'],
        niveles: ['Standard', 'Gold', 'Black'],
        fuente: { texto: 'Tarifario de tarjeta de crédito de OSCUS (información actualizada a octubre 2026) y la página de sus tarjetas', vigencia: 'octubre 2026',
          url: 'https://oscus.coop/dashboard/tarifarios-cooperativa' },
        tarifarioUrl: 'https://oscus.coop/dashboard/tarifarios-cooperativa',
        tasaPublicada: { efectivaAnual: 15.79, nominalAnual: 14.75, aplicaA: 'crédito diferido de la tarjeta (todos los plazos); su tarifario no da otra tasa para el rotativo' },
        // Avance: dos tablas por rango (valores del tarifario sin IVA × 1,15): cajero automático del país y ventanilla del país.
        avance: {
          tipo: 'escalones', etiqueta: 'Cajero automático del país',
          escalones: [[0.01, 4.52], [100.01, 9.04], [200.01, 10.84], [300.01, 13.56], [400.01, 16.26], [500.01, 18.98]],
          otrosCanales: { etiqueta: 'Ventanilla del país', escalones: [[0.01, 18.01], [500.01, 27.03], [1000.01, 36.03], [1500.01, 45.03], [2000.01, 54.04], [3000.01, 63.05]] },
        },
        costos: {
          rotativo: { texto: 'Sin interés si pagas el total de tus consumos hasta el 15 del mes (corte a fin de mes); el interés corre desde que pagas solo el mínimo y pasas al rotativo',
            nota: 'Su tarifario dice: «No se aplica cargo de interés si cancela el pago total de consumos hasta la fecha máxima de pago» y «se aplica cargo desde cuando se acoge al crédito rotativo y pagos mínimos». Fecha de corte: fin de mes. Fecha tope de pago: 15 de cada mes. No publica una tasa propia del rotativo ni explica cómo se calcula el pago mínimo.' },
          diferido: { texto: '14,75 % nominal (15,79 % efectiva) con factor por plazo: 3 meses 2,47 % · 6 meses 4,35 % · 9 meses 6,25 % · 12 meses 8,17 % · 18 meses 12,08 % · 24 meses 16,08 % · 36 meses 24,35 %',
            nota: 'El factor sirve para estimar el interés total sobre el monto diferido (por ejemplo, $1.000 a 12 meses ≈ $81,70 de interés; cálculo de la app). La tasa es la misma para todos los plazos.' },
          tasa: { texto: '14,75 % nominal · 15,79 % efectiva anual (diferido)',
            nota: 'Es la que publica su tarifario para el crédito diferido; no dice si es un máximo. Las dos son coherentes entre sí (capitalización mensual) y están por debajo del techo de la Junta para consumo (16,77 % efectiva).' },
          mora: { texto: 'Recargo por morosidad: 1,05 % (1 a 15 días) · 1,07 % (16 a 30) · 1,09 % (31 a 60) · 1,10 % (más de 60 días)',
            nota: 'Su tarifario lo titula «Tasa de mora» y «recargo por morosidad»; no dice sobre qué valor se aplica ni cada cuánto. Con 0 días de mora es 0 %. Confírmalo con la cooperativa.' },
          mantenimiento: { texto: '$0,00',
            nota: 'Mantenimiento de la tarjeta de crédito, pago de la tarjeta, bloqueo, anulación o cancelación, frecuencia de transacciones, activación, atención de reclamos y estados de cuenta electrónicos: $0,00.' },
          avance: { texto: 'Cajero del país: de $4,52 a $18,98 según el monto · Ventanilla del país: de $18,01 a $63,05 según el monto (con IVA)',
            nota: 'Su tarifario publica los valores sin IVA y dice que se les suma el 15 %; aquí van con IVA (cálculo de la app). Cajero: $1–100 = $4,52 · $101–200 = $9,04 · $201–300 = $10,84 · $301–400 = $13,56 · $401–500 = $16,26 · desde $501 = $18,98. Ventanilla: $1–500 = $18,01 · $501–1.000 = $27,03 · $1.001–1.500 = $36,03 · $1.501–2.000 = $45,03 · $2.001–3.000 = $54,04 · desde $3.001 = $63,05. Su tabla corta los rangos en enteros (por ejemplo $100 y $101): la app toma el siguiente rango desde un centavo más. Cupos: avance en cajero del país desde $10 hasta $800 por día, hasta cuatro transacciones, y hasta $1.500 al mes según el cupo; avance en ventanilla desde $300 hasta el 80 % del cupo disponible (la tabla del PDF viene desordenada: confírmalo en el original). Los intereses del avance van aparte.' },
          cobranza: { texto: 'De $7,34 a $50,59 con IVA',
            nota: 'Su tabla trae los valores sin IVA y dice que se les agrega el 15 %; aquí van ya con IVA (valor × 1,15, cálculo de la app). Por monto vencido (menos de $100 · $100–199 · $200–299 · $300–499 · $500–999 · más de $1.000) y días de atraso. 1 a 30 días: $7,34 · $8,45 · $9,11 · $9,57 · $9,92 · $10,21. 31 a 60 días: $18,66 · $18,93 · $20,50 · $23,39 · $27,59 · $33,10. 61 a 90 días: $26,65 · $27,43 · $29,06 · $31,54 · $34,89 · $39,11. Más de 90 días: $29,39 · $30,64 · $33,38 · $37,63 · $43,36 · $50,59. Son tarifas máximas. Para $100–199 y más de 90 días ella publica $26,64 (= $30,64), no $26,54 como JEP.' },
          uso: { texto: '$1,96 por consumos de más de $100 en el exterior',
            nota: 'Con IVA ($1,70 + $0,26). Consulta impresa de saldos en cajero: $0,36; consulta en cajeros del exterior: $1,02; consumo en gasolinera nacional: $0,23.' },
          emision: { texto: '$5,03 por emisión del plástico con chip (la renovación cuesta igual)',
            nota: '$4,37 + IVA. Vigencia del plástico: 3 años. Tarjetas adicionales pedidas por el titular: máximo 6.' },
          reposicion: { texto: '$5,03 por pérdida, robo o deterioro físico (con chip)', nota: 'Por migración, actualización o fallas de la banda lectora o del chip: $0,00. Excepción: fallos del chip.' },
          voucher: { texto: '$2,06 del país · $10,27 del exterior', nota: 'Copia de voucher o vale (con IVA).' },
          estado: { texto: 'Estado de cuenta electrónico $0,00 · copia $0,52', nota: 'Corte impreso de movimientos en oficina: $1,87. Referencias financieras: $2,59. Su tarifario no trae un precio para el estado de cuenta a domicilio.' },
          pagoTarjeta: { texto: '$0,00 el pago de la tarjeta de crédito', nota: 'Cheque devuelto nacional: $2,86; del exterior: $3,32.' },
          gasolinera: { texto: '$0,23 por consumo nacional' },
        },
      },

      {
        // SÉPTIMA COOPERATIVA. Su sitio ofrece «Tarjetas de Crédito VISA Andalucía» en tres niveles (Gold, Platinum y Signature) y el programa «Andalucía My Rewards» (https://www.andalucia.fin.ec/tarjetas-visa.php).
        // Su tarifario de noviembre 2026 («Tarifario de tasas y costos de servicios», versión del 1 de noviembre de 2026) está en una página hecha con Canva enlazada desde su sección «Andalucía Transparente»
        // (https://tasasycostosandalucia.my.canva.site/tarjeta). Sus tablas son imágenes: desde aquí solo se pudo leer el título de la sección, así que NO se transcribe ninguna cifra y todo queda «sin dato».
        // Su logo oficial (img/logoandablue.png de su sitio) es azul sobre fondo transparente: va sobre fondo claro.
        id: 'ec-andalucia', pais: 'EC', tipo: 'cooperativa', nombre: 'Cooperativa Andalucía', corto: 'Andalucía', redes: ['Visa'],
        niveles: ['Gold', 'Platinum', 'Signature'],
        fuente: { texto: 'Tarifario de tasas y costos de la Cooperativa Andalucía (noviembre 2026; sus tablas son imágenes, no leídas) y la página de sus tarjetas de crédito Visa', vigencia: 'noviembre 2026',
          url: 'https://www.andalucia.fin.ec/tarjetas-visa.php' },
        tarifarioUrl: 'https://tasasycostosandalucia.my.canva.site/tarjeta',
        aviso: 'La cooperativa tiene tarjetas de crédito Visa (Gold, Platinum y Signature) y publica su tarifario de noviembre 2026, pero en imágenes que no pude leer con certeza: abre el enlace de su tarifario o anota los valores de tu contrato y estado de cuenta.',
        costos: sinDatos,
      },

      /* -------------------------------------------------------- Otros países: solo nombres */
      { id: 'co-bancolombia', pais: 'CO', nombre: 'Bancolombia', corto: 'Bancolombia', costos: sinDatos },
      { id: 'co-davivienda', pais: 'CO', nombre: 'Davivienda', corto: 'Davivienda', costos: sinDatos },
      { id: 'co-bogota', pais: 'CO', nombre: 'Banco de Bogotá', corto: 'Bogotá', costos: sinDatos },
      { id: 'co-bbva', pais: 'CO', nombre: 'BBVA', corto: 'BBVA', costos: sinDatos },
      { id: 'pe-bcp', pais: 'PE', nombre: 'BCP', corto: 'BCP', costos: sinDatos },
      { id: 'pe-interbank', pais: 'PE', nombre: 'Interbank', corto: 'Interbank', costos: sinDatos },
      { id: 'pe-bbva', pais: 'PE', nombre: 'BBVA', corto: 'BBVA', costos: sinDatos },
      { id: 'pe-scotiabank', pais: 'PE', nombre: 'Scotiabank', corto: 'Scotiabank', costos: sinDatos },
      { id: 'mx-bbva', pais: 'MX', nombre: 'BBVA', corto: 'BBVA', costos: sinDatos },
      { id: 'mx-banorte', pais: 'MX', nombre: 'Banorte', corto: 'Banorte', costos: sinDatos },
      { id: 'mx-santander', pais: 'MX', nombre: 'Santander', corto: 'Santander', costos: sinDatos },
      { id: 'mx-citibanamex', pais: 'MX', nombre: 'Citibanamex', corto: 'Citibanamex', costos: sinDatos },
      { id: 'es-santander', pais: 'ES', nombre: 'Santander', corto: 'Santander', costos: sinDatos },
      { id: 'es-bbva', pais: 'ES', nombre: 'BBVA', corto: 'BBVA', costos: sinDatos },
      { id: 'es-caixabank', pais: 'ES', nombre: 'CaixaBank', corto: 'CaixaBank', costos: sinDatos },
      { id: 'es-sabadell', pais: 'ES', nombre: 'Sabadell', corto: 'Sabadell', costos: sinDatos },
      { id: 'us-chase', pais: 'US', nombre: 'Chase', corto: 'Chase', costos: sinDatos },
      { id: 'us-bofa', pais: 'US', nombre: 'Bank of America', corto: 'BofA', costos: sinDatos },
      { id: 'us-citi', pais: 'US', nombre: 'Citi', corto: 'Citi', costos: sinDatos },
      { id: 'us-wells', pais: 'US', nombre: 'Wells Fargo', corto: 'Wells Fargo', costos: sinDatos },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = AF.CATALOGO_BANCOS;
})(typeof window !== 'undefined' ? window : globalThis);
