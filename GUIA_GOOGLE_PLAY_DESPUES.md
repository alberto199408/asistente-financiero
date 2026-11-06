# Guía de Google Play (APK) — SOLO DESPUÉS de probar el enlace en tu teléfono

**No hagas nada de este archivo todavía.** Primero se prueba la app por el enlace (ver `GUIA_PASO_A_PASO.md`). Cuando ya te guste cómo funciona, aquí está el camino para subirla a Google Play como prueba. En ese momento me pides «ahora lo de Google Play» y te preparo el repositorio con el código completo (el repositorio del enlace solo lleva los 14 archivos del sitio).
Hazlo en este orden. Cada parte funciona sola: puedes parar al final de cualquiera.
Los menús de Google, Facebook y Cloudflare cambian de nombre con el tiempo. Si no ves algo tal cual, mándame una captura y te digo dónde está.

**Lo que NO se puede probar desde mi lado** (corre en GitHub y en tu teléfono): compilar el APK, firmar, iniciar sesión con Google/Facebook, huella, voz, cámara, compras y la IA real. Por eso esta guía termina con una revisión en tu teléfono.

---

## Parte 1 · Subir el proyecto COMPLETO a un repositorio privado aparte (15 min)

El repositorio del enlace (`asistente-financiero`) queda como está. Para Google Play se usa OTRO repositorio privado con el código completo: `asistente-financiero-fuente`.

1. Descomprime el ZIP `asistente-financiero-completo-…zip` en tu PC. Dentro hay una carpeta `asistente-financiero`.
2. Entra a github.com → botón verde **New** → nombre `asistente-financiero-fuente` → elige **Private** (privado) → **Create repository**.
3. En la página del repositorio vacío toca **uploading an existing file**.
4. Abre la carpeta `asistente-financiero` y arrastra **todo lo que hay dentro** (carpetas `www`, `tests`, `scripts`, `worker`, `assets`, `.github` y los archivos sueltos). No arrastres el ZIP ni la carpeta de afuera. Son unos 80 archivos: entran en una sola subida (GitHub deja hasta 100 por vez).
   - Si no ves la carpeta `.github` en el Explorador, activa «Ver → Elementos ocultos».
5. Abajo toca **Commit changes**.
6. Verifica: en el repositorio debe aparecer `.github/workflows` con 3 archivos (`android.yml`, `crear-llave.yml` y `worker.yml`). Si falta `.github`, súbela aparte con **Add file → Upload files**.
7. Entra a la pestaña **Actions**. Si pide habilitar los flujos, acepta.

## Parte 2 · Crear la llave de firma (una sola vez, 10 min)

La llave es el «sello» de tu app. Sin ella no puedes subir actualizaciones a Google Play.

1. **Actions → Crear llave de firma (una sola vez) → Run workflow → Run workflow.**
2. Espera 1 minuto (círculo verde). Entra a esa ejecución y abajo, en **Artifacts**, baja `llave-de-firma`. Se borra solo en 1 día.
3. Descomprímelo. Tiene 3 archivos: `llave.jks`, `ANDROID_KEYSTORE_BASE64.txt` y `DATOS_DE_LA_LLAVE.txt`.
4. **Guarda `llave.jks` y `DATOS_DE_LA_LLAVE.txt` en dos lugares** (tu correo y una memoria USB). Nunca los subas al repositorio.
5. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Crea estos 4 (el nombre exacto, en mayúsculas):
   - `ANDROID_KEYSTORE_BASE64` → pega TODO el contenido de `ANDROID_KEYSTORE_BASE64.txt`
   - `ANDROID_KEYSTORE_PASSWORD` → el valor de `ANDROID_KEYSTORE_PASSWORD=` en `DATOS_DE_LA_LLAVE.txt`
   - `ANDROID_KEY_PASSWORD` → el valor de `ANDROID_KEY_PASSWORD=`
   - `ANDROID_KEY_ALIAS` → `asistente`
6. En `DATOS_DE_LA_LLAVE.txt` están la huella **SHA1** (para Google) y el **hash para Facebook**. Los vas a usar en la Parte 3.

## Parte 3 · Decidir 3 cosas antes de compilar (5 min)

Se cambian en UN solo archivo: `www/js/plan.js`. En GitHub ábrelo, toca el lápiz ✏️, cambia y **Commit changes**.

- `app.nombre`: ahora es «Asistente Financiero» (nombre de trabajo).
- `app.idPaquete`: ahora `com.asistentefinanciero.app`. **Después de publicar en Google Play NO se puede cambiar.** Decídelo ahora.
- `app.desarrollador`: el nombre que verá la gente en Google Play (no tu nombre personal si no quieres).

## Parte 4 · Compilar el APK e instalarlo (10 min)

1. **Actions → Compilar Android → Run workflow.** Tarda unos 10 a 15 minutos la primera vez.
2. Si sale una X roja: entra, copia el mensaje del paso que falló y mándamelo. Es lo primero que no pude probar desde aquí.
3. Si sale verde: abajo en **Artifacts** baja `apk` y `paquete-google-play`.
4. Pasa el `.apk` al teléfono (correo, WhatsApp o cable) y ábrelo. Android pide permitir «instalar apps desconocidas» para ese origen: acéptalo.
5. Ya debería abrir, pedir crear el PIN y funcionar sin iniciar sesión (**Probar sin cuenta**). Google y Facebook todavía no entran: falta la Parte 5.

## Parte 5 · Entrar con Google (30 min)

1. console.cloud.google.com → proyecto nuevo `asistente-financiero`.
2. **APIs y servicios → Pantalla de consentimiento OAuth** → Externo → nombre de la app, tu correo → guardar. En **Usuarios de prueba** agrega tu correo (y el de quien pruebe).
3. **APIs y servicios → Biblioteca** → busca **Google Drive API** → Habilitar (es para el respaldo).
4. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web.** Crear. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`).
5. En GitHub, `www/js/plan.js` → pega ese ID en `sesion.googleClientIdWeb` → Commit.
6. **Crear credenciales → ID de cliente de OAuth → Android.** Nombre del paquete: el de `app.idPaquete`. Huella SHA-1: la de `DATOS_DE_LA_LLAVE.txt`. Crear. (Este ID no se pega en ningún lado.)
7. Vuelve a ejecutar **Compilar Android**, instala el nuevo APK y prueba «Continuar con Google». Puede tardar hasta unas horas en que Google reconozca el cambio.

## Parte 6 · Entrar con Facebook (30 min)

1. developers.facebook.com → **Mis apps → Crear app** → tipo Consumidor / Autenticación → nombre.
2. Agrega el producto **Inicio de sesión con Facebook** → Android. Nombre del paquete = `app.idPaquete`. Nombre de clase de la actividad: `com.asistentefinanciero.app.MainActivity` (si cambiaste el id, usa el tuyo). **Hash de clave:** el «Hash para Facebook» de `DATOS_DE_LA_LLAVE.txt`.
3. **Configuración → Básica:** copia el **Identificador de la app**; y el **Token de cliente** (en Configuración → Avanzada).
4. Pega ambos en `www/js/plan.js` → `sesion.facebookAppId` y `sesion.facebookClientToken` → Commit. Con los dos llenos, la próxima compilación incluye Facebook; sin ellos compila sin Facebook y el botón avisa que falta.
5. Mientras la app de Facebook esté en modo «Desarrollo», solo entran las cuentas que agregues en Roles. Para abrirla a todos pide pasarla a «Activa»: Facebook pide una **política de privacidad** con enlace público.
6. Recompila y prueba.

## Parte 7 · La IA de Pro (Cloudflare, 20 min)

La IA solo entiende frases raras cuando el lector normal duda, y solo para Pro. La clave vive en el servidor, nunca en el teléfono.

1. Crea cuenta en cloudflare.com (gratis).
2. En console.anthropic.com crea una **clave de API** y carga saldo pequeño. Cópiala.
3. En Cloudflare: **My Profile → API Tokens → Create Token** → plantilla **Edit Cloudflare Workers** → crea. Copia el token. El **Account ID** está en la página principal de Workers.
4. En GitHub, 3 secretos nuevos: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ANTHROPIC_API_KEY`.
5. **Actions → Publicar servidor de IA → Run workflow.** Al terminar, Cloudflare te da una dirección `https://asistente-financiero-ia.<tu-usuario>.workers.dev`.
6. Pégala en `www/js/plan.js` → `ia.urlWorker` → Commit → recompila.
7. Prueba: abre `https://asistente-financiero-ia.<tu-usuario>.workers.dev/salud`. Debe decir `"ok":true` y `"clave":true`.
8. Tope diario: `ia.limiteDiarioApp` (ahora 500, PROVISIONAL) solo funciona si creas un KV llamado `CONTADOR` en Cloudflare y activas las 3 líneas comentadas de `worker/wrangler.toml`. Si no, la IA igual funciona pero sin ese tope general (la app igual limita a cada persona por mes en `ia.limiteMensualConsultas`, que hoy solo se cuenta dentro del teléfono).

## Parte 8 · Google Play (cuando todo lo anterior funcione)

1. play.google.com/console → cuenta de desarrollador (pago único de 25 USD, verificación de identidad).
2. Crear app → sube `paquete-google-play` (.aab) primero a **Pruebas internas**.
3. **Integridad de la app → Firma de apps:** copia el SHA-1 del «certificado de firma de la app» y agrégalo como **otro** ID de cliente Android en Google Cloud (Parte 5, paso 6). Sin esto Google no deja entrar en la versión de la tienda.
4. Suscripciones: crea `pro_mensual` y `pro_anual` (los ids que ya espera la app, están en `plan.js`) con los precios que decidas.
5. Pide: política de privacidad (URL pública), formulario de seguridad de datos y clasificación de contenido. La app envía a la IA el texto de la frase que dices (solo Pro) y eso debe declararse.

---

## Si algo falla
- Compilación en rojo: copia el mensaje del paso que falló.
- Google dice «no está configurado»: revisa que el paquete y el SHA-1 del cliente Android coincidan, y espera unas horas.
- Perdiste la llave: sin ella no se pueden subir actualizaciones; por eso se guarda en dos lugares.
