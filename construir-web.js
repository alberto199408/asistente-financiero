#!/usr/bin/env node
'use strict';
/* Arma el SITIO que se sube a GitHub Pages: pocos archivos SUELTOS (sin carpetas), para subirlos con «Add file → Upload files»
   desde la PC o desde el teléfono, igual que tus otros programas.
   Uso:  node scripts/construir-web.js            → crea la carpeta  sitio/
   Todo sale de www/ y de www/js/plan.js (la configuración única). Nada se escribe a mano aquí.
   Archivos que salen:
     index.html · app.css · app.js · plan.js · tema.js · logos.js · manifest.webmanifest · sw.js · privacidad.html
     icon-192.png · icon-512.png · icon-maskable-512.png · apple-touch-icon.png · favicon.png
   plan.js queda aparte y legible a propósito: es donde pegas el ID de Google y el de Facebook (lápiz ✏️ en GitHub). */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const raiz = path.resolve(__dirname, '..');
const www = path.join(raiz, 'www');
const salida = path.join(raiz, process.argv[2] || 'sitio');
const PLAN = require(path.join(www, 'js/plan.js'));
const leer = (f) => fs.readFileSync(f, 'utf8');
const escribir = (n, t) => fs.writeFileSync(path.join(salida, n), t);
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

fs.rmSync(salida, { recursive: true, force: true });
fs.mkdirSync(salida, { recursive: true });

/* ------------------------------------------------------------ 1. index.html (se lee de www/index.html: una sola lista de scripts) */
const fuente = leer(path.join(www, 'index.html'));
const scripts = [...fuente.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map((m) => m[1]);
const aparte = ['js/plan.js', 'js/tema.js'];                                      // van sueltos y en la cabecera (el tema evita el parpadeo)
const juntos = scripts.filter((s) => !aparte.includes(s));
if (!juntos.length || !aparte.every((s) => scripts.includes(s))) throw new Error('No pude leer la lista de scripts de www/index.html');

let html = fuente
  .replace(/<script src="js\/[^"]+"><\/script>\s*/g, '')
  .replace('<link rel="icon" href="img/logo.png" type="image/png">',
    '<link rel="icon" href="favicon.png" type="image/png">\n  <link rel="apple-touch-icon" href="apple-touch-icon.png">\n  <link rel="manifest" href="manifest.webmanifest">')
  .replace('<link rel="stylesheet" href="css/app.css">', '<link rel="stylesheet" href="app.css">\n  <script src="plan.js"></script>\n  <script src="tema.js"></script>')
  .replace('<body>\n  <div id="app"></div>', '<body>\n  <div id="app"></div>\n  <script src="logos.js"></script>\n  <script src="app.js"></script>');
if (!html.includes('src="app.js"') || !html.includes('manifest.webmanifest')) throw new Error('index.html no quedó bien armado');
html = html.replace(/\n\s*\n/g, '\n');
escribir('index.html', html);

/* ------------------------------------------------------------ 2. app.js = todos los scripts en el mismo orden, uno tras otro */
escribir('app.js', juntos.map((s) => '/* ===== ' + s + ' ===== */\n' + leer(path.join(www, s)).replace(/\s+$/, '') + '\n;').join('\n\n') + '\n');
fs.copyFileSync(path.join(www, 'js/plan.js'), path.join(salida, 'plan.js'));
fs.copyFileSync(path.join(www, 'js/tema.js'), path.join(salida, 'tema.js'));

/* ------------------------------------------------------------ 3. app.css con la letra de la app adentro */
const letra = fs.readFileSync(path.join(www, 'fonts/bricolage.woff2')).toString('base64');
let css = leer(path.join(www, 'css/app.css'));
if (!css.includes("url('../fonts/bricolage.woff2')")) throw new Error('No encontré la letra en app.css');
css = css.replace("url('../fonts/bricolage.woff2')", "url('data:font/woff2;base64," + letra + "')");
escribir('app.css', css);

/* ------------------------------------------------------------ 4. logos.js: logo de la app y de cada banco, dentro de un solo archivo */
const mime = { png: 'image/png', svg: 'image/svg+xml', webp: 'image/webp' };
const recursos = {};
const agregar = (rutaRel) => {
  const ext = path.extname(rutaRel).slice(1).toLowerCase();
  recursos[rutaRel] = 'data:' + mime[ext] + ';base64,' + fs.readFileSync(path.join(www, rutaRel)).toString('base64');
};
agregar('img/logo.png');
for (const f of fs.readdirSync(path.join(www, 'img/bancos')).sort()) if (/\.(png|svg|webp)$/i.test(f)) agregar('img/bancos/' + f);
escribir('logos.js', "/* Logos de la app y de los bancos (generado por scripts/construir-web.js; no se edita a mano). */\n(function (g) { 'use strict'; const AF = (g.AF = g.AF || {}); AF.recursos = " + JSON.stringify(recursos) + "; })(typeof window !== 'undefined' ? window : globalThis);\n");

/* ------------------------------------------------------------ 5. íconos */
const panel = PLAN.apariencia.claro.panel;
const py = spawnSync('python3', [path.join(__dirname, 'iconos-web.py'), salida, panel], { cwd: raiz, stdio: 'inherit' });
if (py.status !== 0) throw new Error('No se pudieron crear los íconos (¿está instalado Pillow? pip install pillow)');

/* ------------------------------------------------------------ 6. manifest.webmanifest (todo sale de PLAN) */
const ruta = '/' + PLAN.web.repositorio + '/';
escribir('manifest.webmanifest', JSON.stringify({
  name: PLAN.app.nombre,
  short_name: PLAN.web.nombreCorto || PLAN.app.nombreCorto || PLAN.app.nombre,
  description: 'Dilo con tu voz: registra gastos e ingresos, controla tus tarjetas y sabe cuánto puedes gastar hoy.',
  lang: PLAN.app.idioma || 'es',
  id: ruta,
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: panel,
  theme_color: panel,
  categories: ['finance', 'productivity'],
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  // Aparece en «Compartir» de Android: mandas el mensaje del banco a la app y lo lee.
  share_target: { action: './', method: 'GET', enctype: 'application/x-www-form-urlencoded', params: { title: 'title', text: 'text', url: 'url' } },
  // Mantener apretado el ícono: «Hablar» abre directo el micrófono.
  shortcuts: [{ name: 'Hablar', short_name: 'Hablar', description: 'Registrar con tu voz', url: './?voz=1', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] }],
}, null, 2) + '\n');

/* ------------------------------------------------------------ 7. sw.js: abre sin internet, pero con internet siempre busca lo nuevo */
const archivos = fs.readdirSync(salida).filter((f) => f !== 'sw.js').sort();
const huella = crypto.createHash('sha256');
for (const f of archivos) huella.update(f).update(fs.readFileSync(path.join(salida, f)));
const version = huella.digest('hex').slice(0, 10);
escribir('sw.js', `/* ${PLAN.app.nombre} — ayudante para abrir sin internet (generado por scripts/construir-web.js; versión ${version}).
   Con internet pide siempre lo más nuevo (si subes cambios, se ven en la próxima apertura); sin internet o con internet lento usa la copia guardada.
   Nunca toca las llamadas a Google, Facebook, Drive ni a la IA: esas van directo a internet. */
const CACHE = 'asistente-${version}';
const ARCHIVOS = ${JSON.stringify(['./'].concat(archivos))};
const ESPERA = 4000;

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(ARCHIVOS.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('asistente-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
function deInternet(req) {
  return new Promise((ok, mal) => {
    let listo = false; const t = setTimeout(() => { if (!listo) { listo = true; mal(new Error('tardó')); } }, ESPERA);
    fetch(req).then((r) => {
      if (listo) return; listo = true; clearTimeout(t);
      if (r && r.ok && r.type === 'basic') { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {}); }
      ok(r);
    }).catch((x) => { if (listo) return; listo = true; clearTimeout(t); mal(x); });
  });
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url; try { url = new URL(req.url); } catch (x) { return; }
  if (url.origin !== self.location.origin) return;
  const guardado = () => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then((c) => c || (req.mode === 'navigate' ? caches.match('./index.html') : null) || new Response('', { status: 504, statusText: 'sin internet' }));
  e.respondWith(deInternet(req).then((r) => (r && r.ok ? r : guardado())).catch(guardado));
});
`);

/* ------------------------------------------------------------ 8. privacidad.html (la piden Google y Facebook; sale de PLAN) */
const hoy = new Date().toISOString().slice(0, 10);
const contacto = PLAN.app.contacto ? '<h2>Contacto</h2><p>' + esc(PLAN.app.contacto) + '</p>' : '';
escribir('privacidad.html', `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacidad · ${esc(PLAN.app.nombre)}</title>
<style>body{font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-width:680px;margin:0 auto;padding:24px 18px 48px;color:#16233a;background:#fff}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:26px 0 6px}p,li{margin:6px 0}small{color:#5b6b82}</style></head>
<body>
<h1>Política de privacidad</h1>
<small>${esc(PLAN.app.nombre)} · actualizada el ${hoy}</small>
<h2>Qué guarda la app y dónde</h2>
<p>Lo que registras (gastos, ingresos, tarjetas, metas, pagos) se guarda <b>en tu propio dispositivo</b>, cifrado con una clave que sale de tu PIN. Nosotros no tenemos un servidor con tus movimientos y no los vemos.</p>
<h2>Entrar con Google o Facebook</h2>
<p>Se usa solo para reconocerte: la app lee tu nombre, tu correo y un identificador de la cuenta. Esos datos se quedan en tu dispositivo. No leemos tu correo, tus contactos ni tus cuentas de banco.</p>
<h2>Copia de seguridad en Google Drive (opcional)</h2>
<p>Si la activas, la app guarda un archivo <b>ya cifrado</b> en una carpeta privada de la app dentro de tu Drive. Solo esta app puede abrir esa carpeta; no la ves en tu lista de archivos. Puedes borrar la copia desde la app (Más → Copia de seguridad) o quitando el acceso en tu cuenta de Google.</p>
<h2>Voz</h2>
<p>El dictado usa el reconocimiento de voz de tu navegador (en Chrome lo procesa Google). La app solo recibe el texto de lo que dijiste.</p>
<h2>Función de inteligencia artificial (Pro, opcional)</h2>
<p>Si la usas, el texto de la frase que dijiste o escribiste se envía a un servidor intermedio y a Anthropic para interpretarla, junto con la fecha de hoy, tu país y moneda, los nombres de tus categorías y los nombres que le pusiste a tus tarjetas. No se envían números de tarjeta, saldos ni el resto de tus datos.</p>
<h2>Lo que no hacemos</h2>
<ul><li>No vendemos ni compartimos tus datos.</li><li>No mostramos publicidad ni usamos analíticas de seguimiento.</li><li>No pedimos claves de tu banco.</li></ul>
<h2>Borrar tus datos</h2>
<p>En la app: Más → Copia de seguridad → «Borrar todos mis datos». También se borran al limpiar los datos del sitio en tu navegador o al desinstalar la app.</p>
<h2>Aviso</h2>
<p>${esc(PLAN.app.avisoLegal)}</p>
${contacto}
</body></html>
`);

/* ------------------------------------------------------------ resumen */
const lista = fs.readdirSync(salida).sort();
const total = lista.reduce((n, f) => n + fs.statSync(path.join(salida, f)).size, 0);
console.log('Sitio listo en ' + path.relative(raiz, salida) + '/  (' + lista.length + ' archivos, ' + (total / 1024).toFixed(0) + ' KB)  versión ' + version);
console.log('Dirección final: https://' + PLAN.web.usuarioGitHub + '.github.io/' + PLAN.web.repositorio + '/');
lista.forEach((f) => console.log('  ' + f + '  ' + (fs.statSync(path.join(salida, f)).size / 1024).toFixed(1) + ' KB'));
