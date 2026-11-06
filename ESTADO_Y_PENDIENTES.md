# ASISTENTE FINANCIERO — estado al 6 de noviembre de 2026

## Cómo se entrega (cambió el 6 de noviembre por la tarde)
- **UN enlace, como cripto y bodega:** página instalable (PWA) en GitHub Pages, repositorio propio `alberto199408/asistente-financiero` → `https://alberto199408.github.io/asistente-financiero/`. Quien la use NO necesita GitHub; solo abre el enlace en Chrome y la instala.
- **Orden de trabajo de Luis:** primero prueba por el enlace; SOLO cuando ya funciona se arma lo de Google Play/APK (`GUIA_GOOGLE_PLAY_DESPUES.md`).
- El sitio se arma con `npm run web` (`scripts/construir-web.js`): 14 archivos sueltos en `sitio/`, sin carpetas (para subirlos con «Add file → Upload files» desde PC o teléfono). `plan.js` queda suelto: ahí se pegan los IDs de Google y Facebook.
- Probado en navegador (30 comprobaciones + 107 pruebas): instalable, sin internet, compartir, atajo Hablar, Google/Facebook simulados, copia cifrada en Drive simulado, recuperar en teléfono nuevo. Ver `INFORME_FINAL.md`.
- Pasos de Luis: ver `GUIA_PASO_A_PASO.md` (publicar → instalar → Google/Facebook → Play).

## Probado (automático)
- `npm test`: 107 pruebas, 0 fallas (datos de bancos y cooperativas, cálculo de avances, tasas, filas de costos, motor de tarjetas, dinero, fechas, lector de voz, servidor de IA).
- Script de Android (`scripts/preparar-android.js`): corrido de verdad en una copia limpia. Crea el proyecto Android, pone nombre/id/versión desde `www/js/plan.js`, permisos, recibir texto e imágenes compartidas, ícono (adaptable, normal y redondo), firma por variables de entorno y Facebook solo si PLAN trae sus datos. Repetirlo no duplica nada (comparado archivo por archivo).
- Servidor de IA (`worker/index.mjs`): probado con la IA simulada (validación, origen, tope diario, descarte de movimientos inválidos).

## Catálogo de tarjetas de crédito (Ecuador)
- 15 bancos con costos completos y logo: Pichincha, Produbanco, Bolivariano, Pacífico, Internacional, Diners, BGR, Machala, Loja, Solidario, Amazonas, Austro, Guayaquil, Manabí, Atlántida.
- 4 cooperativas con costos completos y logo: JEP, CPN, Cooprogreso, OSCUS.
- 3 cooperativas con logo y aviso, sin cifras: Pablo Muñoz Vega (no publica tarifas de su tarjeta), Mushuc Runa (su documento de costos es una imagen) y Andalucía (su tarifario de noviembre 2026 está en imágenes). Hay que transcribir esas dos últimas cuando se puedan ver.
- Revisadas y fuera del catálogo (no emiten tarjeta de crédito, con evidencia en INVESTIGACION_BANCOS.md): 23 de Julio, 29 de Octubre, Jardín Azuayo, COOPAC Austro, Alianza del Valle, CACPECO (sus tarifas son imágenes, sin evidencia de tarjeta de crédito).
- Todo dato lleva fuente, vigencia y enlace. Lo que no se publica queda «sin dato»; no se inventó ninguna cifra.

## NO está hecho todavía (pendiente, en este orden)
1. Cooperativas por revisar, una por una: otras de mayor tamaño (Riobamba, Ambato, 9 de Octubre, 15 de Abril, San Francisco, Comercio…; Atuntaqui ya revisada: solo tiene tarjeta de débito; para Ambato, 9 de Octubre y 15 de Abril la búsqueda no dio su sitio oficial y no se adivinan direcciones). Bancos: Delbank (su sitio daba error 503) y Continental (sin verificar).
2. Mushuc Runa: transcribir sus costos cuando se pueda ver su documento.
3. Rediseño visual de las tarjetas: HECHO el 6 de noviembre en la lista y el detalle (proporción de tarjeta real, chip, símbolo sin contacto, logo del banco, marca Visa/Mastercard con sus círculos, acabado plata/dorado/negro según el nivel que eligió la persona, número en una línea). Probado con capturas de Playwright: Pichincha Platinum (plata), Cooprogreso Black (negra), OSCUS Gold (dorada). Falta mirar a ojo: detalle de tarjeta, tarjetas sin logo, modo oscuro, y la vista previa del paso de tarjeta en el onboarding (sigue siendo el recuadro simple). También HECHO ese día: grupos «Bancos» y «Cooperativas» en el selector, aviso de cada entidad en el paso de datos, logos que no se cortan (JEP) y morados quitados (aviso flotante, fondo de ventanas, color del PDF). Se corrigió un error real: los logos no se descargaban en el selector por la carga diferida (ya salen los 22).
4. Capacitor/Android (QUEDA PARA DESPUÉS de probar el enlace): HECHO el 6 de noviembre (`capacitor.config.js`, `scripts/preparar-android.js`, `scripts/iconos.py`, `.github/workflows/android.yml`, `.github/workflows/worker.yml`, `worker/`). NO probado: la compilación del APK/.aab (necesita el SDK de Android y los repositorios de Google, que desde aquí no se alcanzan; corre en GitHub), la firma, el inicio de sesión con Google/Facebook, voz, huella, OCR y compras en un teléfono real, y la publicación real del Worker en Cloudflare. Falta: servidor de tarifas y de SRI (`PLAN.remoto.urlTarifas` y `urlSRI` están vacíos).
5. HECHO: recorrido completo en navegador (4 frases escritas, revisar y guardar, Inicio, Movimientos, Resumen, Metas, Retos, Tarjetas, claro y oscuro) sin errores; informe final en `INFORME_FINAL.md`; paquete de versión y respaldo. Arreglado en ese recorrido: las tarjetas de metas/hormiga/retos compartían el molde de la tarjeta de crédito (separado), «1 compras» y Retos que decía «vas bien» con un gasto hormiga de hoy.
6. HECHO: `GUIA_PASO_A_PASO.md` (publicar el enlace, instalar, Google, Facebook), `GUIA_GOOGLE_PLAY_DESPUES.md` (llave de firma, APK, Cloudflare, Play) y `DECISIONES_PENDIENTES.md`. HECHO también: `privacidad.html` (se publica con el sitio).
7. FALTA (a confirmar en tu teléfono): compilar y firmar el APK/.aab, Google/Facebook, voz, huella, foto de factura, compartir desde el banco, avisos, compras, IA real, y servidor de tarifas/SRI. Detalle en `INFORME_FINAL.md`.

## Avisos honestos
- Algunas cooperativas publican «máximos» que son el techo legal, no necesariamente lo que cobran.
- CPN y Cooprogreso publican cobranza sin IVA (confirmado en el documento de Alianza del Valle: «se agregará el IVA… a socios tarifa 0 %»).
- Hay entidades que no explican el corriente (días sin interés, pago mínimo): queda dicho en su ficha.
- Los logos son marca de cada entidad; se usan solo para identificarla.
- La lista de 24 bancos y de 44 cooperativas grandes viene de páginas estadísticas de terceros, no de la lista oficial.
