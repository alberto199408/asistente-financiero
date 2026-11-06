# Informe final — Asistente Financiero · 6 de noviembre de 2026

Aquí está lo que SÍ se probó y lo que NO. Nada de lo que está en «NO probado» se debe dar por funcionando hasta verlo en tu teléfono.

## Resumen en una línea
La app ahora es una **página instalable con UN enlace** (como cripto y bodega): `https://alberto199408.github.io/asistente-financiero/`. Está probada en navegador (30 comprobaciones propias + 107 pruebas automáticas). Lo que depende de Google, Facebook, tu teléfono real o GitHub no se pudo probar desde aquí y se confirma con la Guía.

## Probado de verdad
| Qué | Cómo se probó | Resultado |
|---|---|---|
| Sitio de 14 archivos sueltos, servido desde la subruta `/asistente-financiero/` (igual que en GitHub Pages) | Servidor local + Chromium (Playwright) | Bien |
| Chrome lo reconoce como **instalable** (manifest, íconos 192/512/maskable, ayudante `sw.js`) | Revisión de instalabilidad de Chrome (DevTools) | Sin errores |
| Abre **sin internet** y los datos siguen ahí | Recarga con la red cortada | Bien |
| Compartir texto del banco hacia la app (`share_target`) y atajo «Hablar» (`?voz=1`) | Se abrió la dirección con esos datos | Llega a «Por revisar» (Farmacia Fybeca 12,50) / abre la pantalla de voz |
| Botón «Instalar en este teléfono» | Evento de instalación simulado | Aparece y dispara la instalación |
| Entrar con Google y con Facebook (nuestro código) | **Google y Facebook SIMULADOS**: no hay red real aquí | Entra, toma el nombre, sigue a la bienvenida |
| Copia en Drive | Drive simulado | Se sube ya cifrada: no contiene ni «salchipapa», ni el nombre, ni el PIN |
| Teléfono nuevo: ofrece recuperar la copia de Drive y con el PIN vuelven los movimientos | Dos «teléfonos» (perfiles) con la misma cuenta simulada | Bien |
| Facebook no ofrece Drive (solo archivo) | Recorrido con Facebook simulado | Bien |
| Sin errores de consola en los 5 recorridos | Playwright | Bien |
| Lector de frases (voz y texto) y todo el cálculo (dinero, fechas, tarjetas, bancos, informes, lector de facturas, seguridad, PDF/Excel, servidor de IA con IA simulada) | 107 pruebas automáticas | 107 bien, 0 fallas |
| Pantallas en claro y oscuro, tarjetas rediseñadas, 22 logos | Capturas | Bien |

## NO probado (necesita tu teléfono, GitHub o cuentas reales)
- **Publicar en GitHub Pages** y la instalación en tu Chrome de Android. (Chrome sí dice que es instalable; falta verlo en tu teléfono.)
- **Google y Facebook reales:** hay que crear sus IDs (Guía, Parte 3). Las ventanas reales, las direcciones permitidas de Facebook (`connect.facebook.net`, `*.facebook.com`) y la política de seguridad de la página con sus scripts solo se confirman con los IDs puestos.
- **Drive real** (carpeta privada de la app) y que Google reconozca el permiso.
- **Voz real:** el dictado usa el reconocimiento de voz de Chrome (en el navegador de pruebas no existe). **La voz que habla** tampoco.
- **Compartir desde la app real del banco** y el atajo de mantener apretado el ícono.
- Pantallas de importar estado de cuenta (PDF), pareja, varias monedas, SRI, suscripciones, conciliación y préstamos: el cálculo está probado, no recorrí sus pantallas a mano.
- Servidor de IA real (Cloudflare) y servidor de tarifas/SRI: vacíos, la app usa lo que trae.

## Lo que la versión del enlace NO puede hacer (se hace con la versión de Google Play)
- **Huella digital:** el navegador no entrega una llave protegida por la huella. Aquí se usa solo el PIN.
- **Leer fotos de facturas:** pide pegar el texto; la lectura de fotos necesita la versión de Play.
- **Avisos de vencimientos** con la app cerrada: no hay.
- **Cobrar Pro:** solo se puede con Google Play. Los 3 días de prueba sí funcionan.

## Avisos honestos
- **PIN corto:** tus datos y la copia de Drive se cifran con una clave que sale de tu PIN (4 a 6 números). Tiene tope de intentos dentro de la app, pero si alguien consiguiera el archivo de la copia, un PIN corto se puede adivinar con un programa. Un PIN de 6 números y no compartirlo es lo mejor por ahora.
- **Misma dirección base que tus otros programas:** `alberto199408.github.io` es una sola «casa» para todos tus programas. Esta app guarda sus datos con nombres que empiezan con `af:` y su ayudante solo atiende su carpeta, así que no se mezclan; pero si borras «datos del sitio» en Chrome, se borra lo de todos los programas de esa casa. Haz copia (Más → Copia de seguridad) antes.
- La copia en Drive solo existe si entraste con Google. Con Facebook o sin cuenta: copia en archivo.
- Si no pones el ID de Google, la copia en Drive y «Continuar con Google» no funcionan (el botón avisa).

## Lo que se investigó de bancos y cooperativas (detalle en `INVESTIGACION_BANCOS.md`)
- 15 bancos y 4 cooperativas con costos completos; 3 cooperativas con logo y aviso porque sus tarifas son imágenes o no las publican.
- Excluidas con evidencia (no ofrecen tarjeta de crédito): 23 de Julio, 29 de Octubre, Jardín Azuayo, COOPAC Austro, Alianza del Valle, CACPECO, Atuntaqui.
- **Sin revisar:** Ambato, 9 de Octubre, 15 de Abril, Riobamba, San Francisco, Comercio y las demás de la lista de 44; Delbank (su sitio daba error 503) y Continental. No encontré su sitio oficial y no adiviné direcciones.
- Ninguna cifra se inventó: lo que no se publica dice «sin dato».
- Algunas cooperativas publican «máximos» que son el techo legal, no lo que realmente cobran. CPN y Cooprogreso publican la cobranza sin IVA; la app la muestra con IVA como «cálculo de la app». Atlántida tiene datos contradictorios en su propio sitio (queda dicho en su ficha). Los logos son marca de cada entidad y se usan solo para identificarla.

## Detalles estéticos pendientes
- Logos muy anchos u oscuros (BGR, Internacional): revisar el recorte con el logo definitivo.
- El círculo decorativo de la tarjeta «Compartir» se cruza un poco con la última línea.
- En el paso de tarjeta del primer uso, la vista previa sigue siendo el recuadro simple.

## Decisiones tuyas
Ver `DECISIONES_PENDIENTES.md`.
