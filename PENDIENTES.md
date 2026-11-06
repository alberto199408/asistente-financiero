# PENDIENTES — Asistente Financiero (al 6 de noviembre de 2026)

Marca ✅ cuando esté listo. El detalle de cada paso está en `GUIA_PASO_A_PASO.md`.

## Para tener la app en tu teléfono con UN enlace (en este orden)
- [x] 1. Repositorio creado (independiente de tus otros proyectos): https://github.com/alberto199408/asistente-financiero
- [ ] 2. Ponerlo **Público** (como `cripto`) y subir los **14 archivos sueltos** del ZIP `ASISTENTE-FINANCIERO-SITIO.zip` (Guía, Parte 1)
- [ ] 3. Activar **Settings → Pages** (Deploy from a branch · main · / root)
- [ ] 4. Abrir el enlace en Chrome del teléfono e **Instalar** (Guía, Parte 2) y probar con «Probar sin cuenta»
- [ ] 5. Google: crear el ID de cliente web y pegarlo en `plan.js` (Guía, Parte 3)
- [ ] 6. Facebook: crear la app y pegar su ID en `plan.js` (Guía, Parte 3)
- [ ] 7. Poner tu correo de contacto en `plan.js` (`app.contacto`) y leer `privacidad.html`

## DESPUÉS de probar el enlace: Google Play
- [ ] Decir «ahora Google Play» → se prepara el repositorio completo y se sigue `GUIA_GOOGLE_PLAY_DESPUES.md` (APK/.aab, llave de firma, huella, foto de facturas, avisos, cobro de Pro, IA de Pro)
- [ ] Política de privacidad con enlace público (ya existe en el sitio), correo de contacto, descripción y capturas de la ficha
- [ ] Formulario de seguridad de datos y clasificación de contenido
- [ ] Revisar si Google Play exige una prueba cerrada con varias personas antes de publicar

## Decisiones tuyas (valores de `plan.js`)
- [ ] Nombre de la app · id del paquete (no se cambia después de publicar en Play) · desarrollador
- [ ] Precio mensual y anual de Pro · días de prueba · consultas de IA por mes · tope diario de IA
- [ ] ¿Dejar «Probar sin cuenta» (`sesion.permitirSinCuenta`)?

## Lo que no probé y debe confirmarse en tu teléfono
- [ ] Instalación desde Chrome del enlace publicado
- [ ] Entrar con Google y con Facebook (reales) · copia en Drive real
- [ ] Voz real (dictado y voz que habla) · compartir desde el banco · atajo «Hablar»
- [ ] Pantallas de importar estado de cuenta, pareja, varias monedas, SRI, suscripciones, conciliación y préstamos (el cálculo sí está probado)
- [ ] (Solo versión de Play) compilar el APK, huella, foto de factura, avisos, compras de Pro, IA real

## Investigación de bancos y cooperativas
- [ ] Ambato, 9 de Octubre, 15 de Abril, Riobamba, San Francisco, Comercio y las demás de la lista de 44: falta su sitio oficial (si tienes el enlace, mándalo)
- [ ] Delbank (su sitio daba error 503) y Continental
- [ ] Mushuc Runa y Andalucía: transcribir sus tarifas (están en imágenes; con el PDF se hace)

## Mejoras pequeñas anotadas
- [ ] La vista previa de la tarjeta en el primer uso sigue siendo el recuadro simple (la tarjeta nueva está en la pestaña Tarjetas)
- [ ] El círculo decorativo de la tarjeta «Compartir» se cruza un poco con la última línea
- [ ] Revisar el recorte de logos muy anchos u oscuros (BGR, Internacional)
- [ ] Servidor de tarifas y de SRI (`remoto.urlTarifas`, `remoto.urlSRI`) vacíos
- [ ] Mantener las tarifas al día (revisar cada mes)
