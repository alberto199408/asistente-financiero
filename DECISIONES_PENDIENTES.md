# Decisiones que solo tú puedes tomar

Todas se cambian en UN solo archivo: `plan.js` (en el repositorio del enlace está en la raíz; en el proyecto completo es `www/js/plan.js`). Lo marcado PROVISIONAL está puesto de trabajo; nada de esto bloquea probar la app en tu teléfono.

| Qué | Dónde en `plan.js` | Ahora | Quién decide |
|---|---|---|---|
| Nombre de la app | `app.nombre` | «Asistente Financiero» (de trabajo) | Tú |
| Id del paquete (no se cambia después de publicar en Google Play) | `app.idPaquete` | `com.asistentefinanciero.app` | Tú, antes de publicar |
| Nombre de desarrollador en Google Play | `app.desarrollador` | vacío | Tú |
| Precio mensual y anual de Pro | `precios.mensualUSD`, `precios.anualUSD` | 2,99 y 19,99 USD (PROVISIONAL) | Tú |
| Días de prueba de Pro | `prueba.diasProGratis` | 3 | Tú |
| Consultas de IA por mes y persona (Pro) | `ia.limiteMensualConsultas` | 60 (PROVISIONAL) | Tú |
| Tope de consultas de IA por día de toda la app | `ia.limiteDiarioApp` | 500 (PROVISIONAL) | Tú |
| ID de cliente web de Google | `sesion.googleClientIdWeb` | vacío | Lo creas en Google Cloud (Guía, Parte 3) |
| ID de app de Facebook (el token de cliente solo hace falta en la versión de Google Play) | `sesion.facebookAppId` | vacío | Lo creas en Facebook (Guía, Parte 3) |
| ¿Dejar «Probar sin cuenta»? | `sesion.permitirSinCuenta` | `true` (PROVISIONAL, para que pruebes ya) | Tú: ponlo en `false` cuando Google y Facebook funcionen |
| Correo de contacto en la página de privacidad | `app.contacto` | vacío (no se muestra) | Tú |
| Usuario y repositorio de GitHub (arman la dirección del enlace) | `web.usuarioGitHub`, `web.repositorio` | `alberto199408`, `asistente-financiero` | Tú, si cambias de nombre |
| Dirección del servidor de IA | `ia.urlWorker` | vacío | Sale al publicar el Worker (`GUIA_GOOGLE_PLAY_DESPUES.md`, Parte 7) |
| Dirección de actualizaciones de tarifas | `remoto.urlTarifas` | vacío (la app usa las tarifas que trae) | Tú, si quieres actualizarlas sin publicar versión |

## Otras cosas que te tocan
- **Política de privacidad:** ya existe y se publica con el sitio: `https://alberto199408.github.io/asistente-financiero/privacidad.html` (Google y Facebook piden ese enlace). La escribí yo a partir de lo que la app hace de verdad; léela y, si hace falta, un abogado debería revisarla antes de publicar en tiendas. Falta tu correo de contacto (`app.contacto`).
- **Logos de bancos y cooperativas:** son marca de cada entidad. Se usan solo para identificarlas; si alguna entidad pide quitar el suyo, se borra su archivo en `www/img/bancos/`.
- **Tarifas:** cada dato lleva fuente, vigencia y enlace; lo que no se publica dice «sin dato». Cambian con el tiempo: revisa `INVESTIGACION_BANCOS.md` y actualiza al cambiar el mes.
- **Entidades pendientes:** Ambato, 9 de Octubre, 15 de Abril, Riobamba, San Francisco, Comercio (no encontré su sitio oficial), Delbank (su sitio daba error), Mushuc Runa y Andalucía (sus tarifas están en imágenes). Si tienes el PDF o el enlace oficial, mándamelo y las agrego.
- **Compras dentro de la app:** en la versión del enlace NO se puede cobrar Pro (solo hay los 3 días de prueba). Para cobrar se necesita la versión de Google Play: los productos `pro_mensual` y `pro_anual` se crean ahí.
