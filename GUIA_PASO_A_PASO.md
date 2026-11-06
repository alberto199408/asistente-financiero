# Guía paso a paso — Asistente Financiero con UN enlace

Funciona como tus otros programas (cripto, bodega): una página que se abre en Chrome y se instala como app. **Quien use la app solo abre el enlace: no necesita cuenta de GitHub.** GitHub solo lo usas tú, una vez, para subir los archivos.

El enlace final será: **https://alberto199408.github.io/asistente-financiero/**

Todo lo de APK y Google Play queda para DESPUÉS de que pruebes el enlace (`GUIA_GOOGLE_PLAY_DESPUES.md`).

---

## Parte 1 · Publicar el enlace (10 min, en tu PC)

El ZIP `ASISTENTE-FINANCIERO-SITIO.zip` tiene **14 archivos sueltos, sin carpetas**.

1. **Descomprime** el ZIP en tu PC. Abre la carpeta: vas a ver los 14 archivos (`index.html`, `app.js`, `plan.js`, `sw.js`, etc.).
2. Entra a **github.com** con tu cuenta y abre **https://github.com/alberto199408/asistente-financiero** (ya está creado y vacío).
3. **Ponlo en Público**, como `cripto`. Es necesario: GitHub solo publica páginas gratis de repositorios públicos. No hay nada secreto dentro (tus datos viven en cada teléfono, no en GitHub).
   - **Settings** (arriba) → baja hasta el final, **Danger Zone** → **Change visibility** → **Change to public** → confirma escribiendo el nombre del repositorio.
4. Vuelve a la pestaña **Code**. Toca **uploading an existing file** (o **Add file → Upload files**).
5. En la carpeta del paso 1 selecciona **los 14 archivos** (Ctrl + A) y arrástralos a la página de GitHub. Espera a que terminen de subir.
6. Abajo toca el botón verde **Commit changes**. Debes ver los 14 archivos en la lista, **sin ninguna carpeta**.
7. **Settings → Pages**. En «Build and deployment»: **Source = Deploy from a branch** · **Branch = main** · carpeta **/ (root)** → **Save**.
8. Espera 1 a 2 minutos y recarga. Arriba aparece «Your site is live at https://alberto199408.github.io/asistente-financiero/».

## Parte 2 · Instalar en tu teléfono (2 min)

1. En el teléfono abre **Chrome** y entra a **https://alberto199408.github.io/asistente-financiero/**
2. Verás la portada azul con la billetera. Toca **Instalar en este teléfono** (o el menú **⋮** → **Instalar aplicación**).
3. Queda un ícono «Asistente» en tu pantalla de inicio. Ábrelo desde ahí.
4. Toca **Probar sin cuenta** (Google y Facebook se activan en la Parte 3), pon tu nombre, tu país, crea tu PIN y listo.
5. Prueba: toca el micrófono y di «gasté 20 dólares en gasolina»; permite el micrófono cuando Chrome lo pida.

**Para actualizar la app después:** subes los archivos nuevos al mismo repositorio (**Add file → Upload files**, se reemplazan los que tienen el mismo nombre). El teléfono los toma solo la próxima vez que la abras, con internet.

## Parte 3 · Entrar con Google y con Facebook (cuando quieras, 30 min)

Hacen falta dos datos que solo tú puedes crear (no se inventan). Se pegan en el archivo **`plan.js`** del repositorio: ábrelo en GitHub, toca el lápiz ✏️, pega, y **Commit changes**. En 1 a 2 minutos la página ya los usa.

### Google (para entrar y para la copia en tu Drive)
1. **console.cloud.google.com** → proyecto nuevo `asistente-financiero`.
2. **APIs y servicios → Biblioteca** → busca **Google Drive API** → **Habilitar**.
3. **APIs y servicios → Pantalla de consentimiento OAuth** → **Externo** → nombre de la app, tu correo → Guardar. En **Permisos (Scopes)** agrega `.../auth/drive.appdata`. En **Usuarios de prueba** pon tu correo (y el de quien pruebe; con la app en «Prueba» solo entran ellos, hasta 100 personas).
4. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**. En **Orígenes autorizados de JavaScript** pon exactamente: `https://alberto199408.github.io` (sin barra al final ni ruta). Crear.
5. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`) y pégalo en `plan.js` → `googleClientIdWeb: '…'`.
6. Para abrirla a todo el mundo, en la pantalla de consentimiento pasa a **Publicar app**. Pide el enlace de privacidad: `https://alberto199408.github.io/asistente-financiero/privacidad.html`.

### Facebook
1. **developers.facebook.com → Mis apps → Crear app** → tipo **Consumidor** → nombre.
2. Agrega el producto **Inicio de sesión con Facebook** → **Web**. Sitio: `https://alberto199408.github.io/asistente-financiero/`.
3. **Inicio de sesión con Facebook → Configuración:** activa **Inicio de sesión de OAuth de cliente web** y **Iniciar sesión con el SDK de JavaScript**; en **Dominios permitidos para el SDK de JavaScript** pon `https://alberto199408.github.io/`.
4. **Configuración → Básica:** dominio de la app `alberto199408.github.io`, **URL de la política de privacidad** `https://alberto199408.github.io/asistente-financiero/privacidad.html`. Copia el **Identificador de la app** y pégalo en `plan.js` → `facebookAppId: '…'` (el «token de cliente» no hace falta en la web).
5. Mientras la app de Facebook esté en «Desarrollo» solo entran las cuentas que agregues en Roles. Para abrirla a todos, cámbiala a **Activa**.

Cuando los dos funcionen, en `plan.js` pon `permitirSinCuenta: false` si no quieres que se pueda entrar sin cuenta.

## Parte 4 · Antes de abrirla a otras personas
- En `plan.js`, `contacto: ''` → pon tu correo de contacto (sale en la página de privacidad). Si lo dejas vacío, esa línea no aparece.
- Lee `https://alberto199408.github.io/asistente-financiero/privacidad.html` y confirma que dice lo que quieres.
- Decide los precios y límites (`DECISIONES_PENDIENTES.md`). **El pago de Pro NO funciona en la versión del enlace** (solo se puede cobrar con Google Play); la prueba gratis de 3 días sí funciona.

## Parte 5 · Google Play (SOLO después de probar el enlace)
Cuando ya te guste cómo funciona, me dices «ahora Google Play» y seguimos con `GUIA_GOOGLE_PLAY_DESPUES.md` (APK/.aab, firma, huella digital, foto de facturas, avisos y cobro de Pro).

---

## Si algo falla
- **La página sale en blanco o con el texto en HTML:** casi siempre falta algún archivo o subiste una carpeta. En el repositorio deben verse los 14 archivos sueltos.
- **No aparece «Instalar aplicación»:** abre el enlace en **Chrome** (no en otro navegador ni dentro de WhatsApp), espera unos segundos, y revisa que sea `https://…`.
- **Google dice «redirect_uri / origin_mismatch»:** el origen autorizado debe ser exactamente `https://alberto199408.github.io`.
- **Actualicé y sigo viendo lo viejo:** ciérrala del todo (deslízala fuera de las apps recientes) y ábrela con internet. Si insiste, avísame: NO borres los datos del sitio, porque ahí viven tus movimientos.
