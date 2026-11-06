/* Capa nativa: todo lo que toca el teléfono pasa por aquí (Google/Facebook, huella, voz, cámara, avisos, compartir, compras, Drive).
   Cada función tiene una salida clara cuando no hay teléfono (navegador): nunca revienta, devuelve un motivo. */
(function (g) {
  'use strict';
  const AF = (g.AF = g.AF || {});
  const PLAN = AF.PLAN;
  const C = () => g.Capacitor;
  const esNativo = () => !!(C() && C().isNativePlatform && C().isNativePlatform());
  const plugin = (n) => (C() && C().Plugins && C().Plugins[n]) || null;
  const esLocal = () => /^(localhost|127\.0\.0\.1)$/.test((g.location && g.location.hostname) || '');
  const err = (codigo, mensaje) => Object.assign(new Error(mensaje || codigo), { codigo });
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ------------------------------------------------------------------ almacén local */
  // En el teléfono: Preferences (almacén privado de la app). En navegador: localStorage.
  function almacenNativo() {
    const P = plugin('Preferences');
    if (!esNativo() || !P) return null;
    return {
      async get(k) { const r = await P.get({ key: k }); return r.value == null ? null : r.value; },
      async set(k, v) { await P.set({ key: k, value: v }); },
      async del(k) { await P.remove({ key: k }); },
    };
  }

  /* --------------------------------------------------------------- Google / Facebook */
  let sociales = false;
  async function prepararSociales() {
    const L = plugin('SocialLogin'); if (!L) throw err('no_disponible', 'El inicio de sesión solo funciona en la app instalada.');
    if (sociales) return L;
    const s = PLAN.sesion, cfg = {};
    if (s.googleClientIdWeb) cfg.google = { webClientId: s.googleClientIdWeb };
    if (s.facebookAppId && s.facebookClientToken) cfg.facebook = { appId: s.facebookAppId, clientToken: s.facebookClientToken };
    await L.initialize(cfg);
    sociales = true;
    return L;
  }
  const proveedorListo = (p) => (p === 'google' ? !!PLAN.sesion.googleClientIdWeb : p === 'facebook' ? !!(PLAN.sesion.facebookAppId && (!esNativo() || PLAN.sesion.facebookClientToken)) : false);

  /* ---- Versión web (se instala desde Chrome): Google Identity Services y Facebook SDK, sin pasar por Capacitor */
  const scriptsWeb = {};
  function cargarScript(src) {
    if (!scriptsWeb[src]) scriptsWeb[src] = new Promise((res, rej) => {
      const s = g.document.createElement('script'); s.src = src; s.async = true; s.onload = () => res(); s.onerror = () => { delete scriptsWeb[src]; rej(err('sin_red', 'No pude conectar con el servicio de inicio de sesión. Revisa tu internet.')); };
      g.document.head.appendChild(s);
    });
    return scriptsWeb[src];
  }
  const URL_GOOGLE = 'https://accounts.google.com/gsi/client';
  const urlFacebook = () => 'https://connect.facebook.net/es_LA/sdk.js';
  let tokenGoogle = null;                                                  // { token, vence, drive, email } solo en memoria (nunca en disco)
  let fbIniciado = false;
  // Se llama al mostrar la portada: así las ventanas de Google/Facebook abren en el mismo toque del botón (si no, Chrome las bloquea).
  function precargarWeb() {
    if (esNativo()) return;
    if (PLAN.sesion.googleClientIdWeb) cargarScript(URL_GOOGLE).catch(() => {});
    if (PLAN.sesion.facebookAppId) cargarFacebookWeb().catch(() => {});
  }
  async function cargarFacebookWeb() {
    await cargarScript(urlFacebook());
    if (!g.FB) throw err('fallo', 'Facebook no respondió. Revisa tu internet.');
    if (!fbIniciado) { g.FB.init({ appId: PLAN.sesion.facebookAppId, cookie: false, xfbml: false, version: PLAN.sesion.facebookVersion || 'v23.0' }); fbIniciado = true; }
    return g.FB;
  }
  // Pide a Google un permiso de acceso (ventana de Google). Devuelve la respuesta con access_token.
  async function pedirTokenGoogle(alcance, pista, pedirConsentimiento) {
    await cargarScript(URL_GOOGLE);
    if (!(g.google && g.google.accounts && g.google.accounts.oauth2)) throw err('fallo', 'Google no respondió. Revisa tu internet.');
    return new Promise((res, rej) => {
      const cfg = {
        client_id: PLAN.sesion.googleClientIdWeb, scope: alcance,
        callback: (r) => (r && r.error ? rej(err(r.error === 'access_denied' ? 'cancelado' : 'fallo', 'Google respondió: ' + (r.error_description || r.error))) : res(r)),
        error_callback: (e) => rej(err(e && /popup_closed/.test(e.type) ? 'cancelado' : 'fallo', e && e.type === 'popup_failed_to_open' ? 'Chrome bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo otra vez.' : 'No pude abrir Google (' + ((e && e.type) || 'error') + ').')),
      };
      if (pista) cfg.hint = pista;
      g.google.accounts.oauth2.initTokenClient(cfg).requestAccessToken(pedirConsentimiento ? { prompt: 'consent' } : {});
    });
  }
  const guardarTokenGoogle = (r, email) => {
    const alcance = PLAN.sesion.googleAlcanceDrive;
    tokenGoogle = { token: r.access_token, vence: Date.now() + (Number(r.expires_in) || 3000) * 1000, drive: !!(g.google.accounts.oauth2.hasGrantedAllScopes && g.google.accounts.oauth2.hasGrantedAllScopes(r, alcance)), email: email || '' };
  };
  async function iniciarGoogleWeb() {
    const r = await pedirTokenGoogle('openid email profile ' + PLAN.sesion.googleAlcanceDrive);
    let u;
    try { u = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + r.access_token } })).json(); }
    catch (e) { throw err('sin_red', 'Entraste a Google pero no pude leer tu cuenta. Revisa tu internet.'); }
    if (!u || (!u.sub && !u.email)) throw err('fallo', 'Google no devolvió tu cuenta.');
    guardarTokenGoogle(r, u.email);
    return { proveedor: 'google', id: String(u.sub || u.email), nombre: u.given_name || u.name || '', email: u.email || '', foto: u.picture || '' };
  }
  async function iniciarFacebookWeb() {
    const FB = await cargarFacebookWeb();
    const r = await new Promise((res) => FB.login(res, { scope: PLAN.sesion.facebookPermisos.join(',') }));
    if (!r || !r.authResponse) throw err('cancelado', 'Cancelaste el inicio de sesión.');
    const me = await new Promise((res) => FB.api('/me', { fields: 'id,name,email' }, res));
    if (!me || !me.id) throw err('fallo', 'Facebook no devolvió tu cuenta.');
    return { proveedor: 'facebook', id: String(me.id), nombre: String(me.name || '').split(' ')[0], email: me.email || '', foto: '' };
  }

  // Devuelve { proveedor, id, nombre, email, foto }
  async function iniciarSesion(proveedor) {
    if (!proveedorListo(proveedor)) throw err('sin_configurar', proveedor === 'google' ? 'Falta configurar Google (ID de cliente web).' : 'Falta configurar Facebook (ID de app).');
    if (!esNativo()) return proveedor === 'google' ? iniciarGoogleWeb() : iniciarFacebookWeb();
    if (!plugin('SocialLogin')) throw err('no_disponible', 'El inicio de sesión no está disponible aquí.');
    const L = await prepararSociales();
    let r;
    try {
      r = proveedor === 'google'
        ? await L.login({ provider: 'google', options: {} })                                           // sin "scopes": el correo y el nombre ya vienen
        : await L.login({ provider: 'facebook', options: { permissions: PLAN.sesion.facebookPermisos } });
    } catch (e) {
      const m = String((e && (e.code || e.message)) || e);
      if (/cancel/i.test(m)) throw err('cancelado', 'Cancelaste el inicio de sesión.');
      throw err('fallo', m);
    }
    const x = r.result || {}, p = x.profile || {};
    if (proveedor === 'google') {
      if (!p.id && !p.email) throw err('fallo', 'Google no devolvió tu cuenta.');
      return { proveedor, id: String(p.id || p.email), nombre: p.givenName || p.name || '', email: p.email || '', foto: p.imageUrl || '' };
    }
    const uid = p.userID || (x.accessToken && x.accessToken.userId);
    if (!uid) throw err('fallo', 'Facebook no devolvió tu cuenta.');
    return { proveedor, id: String(uid), nombre: (p.name || '').split(' ')[0], email: p.email || '', foto: p.imageURL || '' };
  }
  async function cerrarSesionSocial(proveedor) {
    tokenGoogle = null;
    try { if (!esNativo()) { if (proveedor === 'facebook' && g.FB && fbIniciado) g.FB.logout(() => {}); return; } const L = plugin('SocialLogin'); if (L && sociales) await L.logout({ provider: proveedor }); } catch (e) { /* ya estaba cerrada */ }
  }

  /* ------------------------------------------------------------------------ huella */
  const BIO = 1;   // AccessControl.BIOMETRY_CURRENT_SET: el secreto muere si cambian las huellas registradas
  async function huellaDisponible() {
    const B = plugin('NativeBiometric'); if (!esNativo() || !B) return false;
    try { const r = await B.isAvailable({ useFallback: false }); return !!r.isAvailable; } catch (e) { return false; }
  }
  const secretosHuella = {
    async guardar(ns, valor) {
      const B = plugin('NativeBiometric'); if (!B) throw err('no_disponible');
      await B.setData({ key: 'af.bio.' + ns, value: valor, accessControl: BIO, title: 'Activa tu huella', negativeButtonText: 'Cancelar' });
    },
    async leer(ns) {
      const B = plugin('NativeBiometric'); if (!B) return null;
      const r = await B.getSecureData({ key: 'af.bio.' + ns, title: PLAN.app.nombre, subtitle: 'Confirma que eres tú', negativeButtonText: 'Usar PIN' });
      return r && r.value;
    },
    async borrar(ns) { const B = plugin('NativeBiometric'); if (B) await B.deleteData({ key: 'af.bio.' + ns }); },
  };

  /* -------------------------------------------------------------------------- voz */
  const idiomaVoz = () => (PLAN.pais(AF.store && AF.store.d.ajustes.pais).idioma || 'es-EC');
  async function vozDisponible() {
    const R = plugin('SpeechRecognition');
    if (esNativo() && R) { try { return !!(await R.available()).available; } catch (e) { return false; } }
    return !!(g.SpeechRecognition || g.webkitSpeechRecognition);
  }
  // Devuelve { parar(), terminado: Promise<string> }. alParcial(texto) recibe lo que va entendiendo.
  async function escuchar(alParcial) {
    const R = plugin('SpeechRecognition');
    if (esNativo() && R) {
      let permiso = await R.checkPermissions();
      if (permiso.speechRecognition !== 'granted') permiso = await R.requestPermissions();
      if (permiso.speechRecognition !== 'granted') throw err('permiso', 'Sin permiso del micrófono no puedo escucharte. Puedes escribir.');
      let ultimo = '', cierra, cerrado = false;
      const terminado = new Promise((res) => { cierra = (t) => { if (cerrado) return; cerrado = true; res(t); }; });
      await R.removeAllListeners();
      await R.addListener('partialResults', (d) => { if (d && d.matches && d.matches[0]) { ultimo = d.matches[0]; if (alParcial) alParcial(ultimo); } });
      await R.addListener('listeningState', (d) => { if (d && d.status === 'stopped') setTimeout(() => cierra(ultimo), 250); });
      await R.start({ language: idiomaVoz(), maxResults: 3, partialResults: true, popup: false });
      return { parar: async () => { try { await R.stop(); } catch (e) { /* ya estaba detenido */ } setTimeout(() => cierra(ultimo), 400); }, terminado };
    }
    const W = g.SpeechRecognition || g.webkitSpeechRecognition;
    if (!W) throw err('sin_voz', 'Este equipo no tiene reconocimiento de voz. Escribe lo que quieres registrar.');
    const rec = new W(); rec.lang = idiomaVoz(); rec.interimResults = true; rec.maxAlternatives = 1;
    let ultimo = '';
    const terminado = new Promise((res, rej) => {
      rec.onresult = (e) => { ultimo = Array.from(e.results).map((r) => r[0].transcript).join(' '); if (alParcial) alParcial(ultimo); };
      rec.onerror = (e) => (e.error === 'no-speech' ? res('') : rej(err('sin_voz', 'No pude escuchar (' + e.error + ').')));
      rec.onend = () => res(ultimo);
    });
    rec.start();
    return { parar: async () => { try { rec.stop(); } catch (e) { /* nada */ } }, terminado };
  }
  async function hablar(texto) {
    if (!texto) return;
    const T = plugin('TextToSpeech');
    try {
      if (esNativo() && T) { await T.speak({ text: texto, lang: idiomaVoz(), rate: 1.0, queueStrategy: 0 }); return; }
      if (g.speechSynthesis) { g.speechSynthesis.cancel(); const u = new g.SpeechSynthesisUtterance(texto); u.lang = idiomaVoz(); g.speechSynthesis.speak(u); }
    } catch (e) { /* si no puede hablar, la respuesta ya está en pantalla */ }
  }
  const callar = async () => { try { const T = plugin('TextToSpeech'); if (T) await T.stop(); else if (g.speechSynthesis) g.speechSynthesis.cancel(); } catch (e) { /* nada */ } };

  /* ------------------------------------------------- foto de factura / captura (ML Kit) */
  const aBase64 = (blob) => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1]); f.onerror = rej; f.readAsDataURL(blob); });
  // Acepta un File/Blob (de la cámara, galería o pantalla compartida). Devuelve el texto leído.
  async function leerTextoDeImagen(blob) {
    const TR = plugin('TextRecognition'), FS = plugin('Filesystem');
    if (!esNativo() || !TR || !FS) throw err('solo_app', 'Leer fotos todavía no está disponible en esta versión.');
    const nombre = 'lectura-' + Date.now() + '.jpg';
    const w = await FS.writeFile({ path: nombre, data: await aBase64(blob), directory: 'CACHE' });
    try {
      const r = await TR.processImage({ path: w.uri });
      return r.text || '';
    } finally { try { await FS.deleteFile({ path: nombre, directory: 'CACHE' }); } catch (e) { /* ya no está */ } }
  }
  // Lo compartido desde el banco u otra app (texto o imágenes) llega aquí.
  async function escucharCompartidos(cb) {
    const S = plugin('CapacitorShareTarget');
    if (!esNativo() || !S) {                                  // versión web: Android abre la app con ?title=…&text=…&url=… (share_target del manifest)
      try {
        const q = new g.URLSearchParams(g.location.search);
        if (!q.has('text') && !q.has('url') && !q.has('title')) return;
        const textos = []; for (const k of ['text', 'url', 'title']) { const v = (q.get(k) || '').trim(); if (v && !textos.some((x) => x.includes(v))) textos.push(v); }
        g.history.replaceState(null, '', g.location.pathname);
        if (textos.length) cb({ textos, imagenes: [] });
      } catch (e) { /* sin texto compartido */ }
      return;
    }
    await S.addListener('shareReceived', async (ev) => {
      const textos = (ev.texts || []).filter(Boolean);
      const imagenes = [];
      for (const f of ev.files || []) {
        if (!/^image\//.test(f.mimeType || '')) continue;
        try { const b = await (await fetch(C().convertFileSrc(f.uri))).blob(); imagenes.push(await leerTextoDeImagen(b)); } catch (e) { /* esa imagen no se pudo leer */ }
      }
      cb({ textos, imagenes });
    });
  }

  /* ------------------------------------------------------------------ avisos locales */
  const ID_AVISO_BASE = 7000;
  async function permisoAvisos() {
    const N = plugin('LocalNotifications'); if (!esNativo() || !N) return false;
    try { let p = await N.checkPermissions(); if (p.display !== 'granted') p = await N.requestPermissions(); return p.display === 'granted'; } catch (e) { return false; }
  }
  // lista = [{ titulo, cuerpo, cuando: Date }]  → reemplaza los avisos anteriores de la app
  async function programarAvisos(lista) {
    const N = plugin('LocalNotifications'); if (!esNativo() || !N) return 0;
    if (!(await permisoAvisos())) return 0;
    try {
      const pend = await N.getPending();
      const mios = (pend.notifications || []).filter((n) => n.id >= ID_AVISO_BASE && n.id < ID_AVISO_BASE + 1000);
      if (mios.length) await N.cancel({ notifications: mios.map((n) => ({ id: n.id })) });
      const ahora = Date.now();
      const nuevos = lista.filter((a) => a.cuando.getTime() > ahora).slice(0, 60)
        .map((a, i) => ({ id: ID_AVISO_BASE + i, title: a.titulo, body: a.cuerpo, schedule: { at: a.cuando, allowWhileIdle: true } }));
      if (nuevos.length) await N.schedule({ notifications: nuevos });
      return nuevos.length;
    } catch (e) { return 0; }
  }

  /* -------------------------------------------------------------------- compartir */
  async function compartirTexto(titulo, texto) {
    const S = plugin('Share');
    if (esNativo() && S) { try { await S.share({ title: titulo, text: texto, dialogTitle: titulo }); return true; } catch (e) { return false; } }
    if (g.navigator && g.navigator.share) { try { await g.navigator.share({ title: titulo, text: texto }); return true; } catch (e) { return false; } }
    try { await g.navigator.clipboard.writeText(texto); return 'copiado'; } catch (e) { return false; }
  }
  // contenido: string (texto) o Uint8Array (binario: PDF, imagen). Devuelve true si se abrió el menú de compartir/descarga.
  async function entregarArchivo(nombre, contenido, mime) {
    const FS = plugin('Filesystem'), S = plugin('Share');
    if (esNativo() && FS && S) {
      const data = typeof contenido === 'string' ? btoa(unescape(encodeURIComponent(contenido))) : AF.seguridad.b64(contenido);
      const w = await FS.writeFile({ path: nombre, data, directory: 'CACHE' });
      await S.share({ title: nombre, url: w.uri, dialogTitle: 'Enviar o guardar ' + nombre });
      return true;
    }
    const blob = new Blob([contenido], { type: mime });
    const a = g.document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; g.document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    return true;
  }

  /* ---------------------------------------------------------------------- compras */
  async function comprarPro(plan) {
    const NP = plugin('NativePurchases');
    if (!esNativo() || !NP) throw err('solo_app', 'El pago de Pro se activa con la versión de Google Play.');
    const ids = PLAN.precios.productosPlay;
    if (!ids || !ids[plan]) throw err('sin_configurar', 'Pro todavía no está publicado en Google Play.');
    try {
      const t = await NP.purchaseProduct({ productIdentifier: ids[plan], productType: 'subs', planIdentifier: ids[plan + 'Plan'] });
      return { ok: true, id: t.transactionId };
    } catch (e) { throw err(/cancel/i.test(String(e && (e.message || e.code))) ? 'cancelado' : 'fallo', String(e && e.message)); }
  }
  async function restaurarCompras() {
    const NP = plugin('NativePurchases'); if (!esNativo() || !NP) return [];
    try { await NP.restorePurchases(); const r = await NP.getPurchases({ productType: 'subs' }); return r.purchases || []; } catch (e) { return []; }
  }

  /* ------------------------------------------------------------------------ Drive */
  // Respaldo en la carpeta PRIVADA de la app en tu Drive (appDataFolder): ni tú la ves ni otras apps. Solo cuentas de Google.
    const NOMBRE_RESPALDO = 'asistente-financiero-respaldo.json';
  // interactivo=false: solo si ya hay permiso en memoria (no abre ventanas sin que la persona toque un botón).
  async function tokenDrive(interactivo) {
    if (!esNativo()) {
      if (tokenGoogle && tokenGoogle.drive && tokenGoogle.vence > Date.now() + 60000) return tokenGoogle.token;
      if (interactivo === false) throw err('sin_token', 'Toca «Hacer copia ahora» para conectar tu Drive.');
      const sesionEmail = (tokenGoogle && tokenGoogle.email) || '';
      const r = await pedirTokenGoogle(PLAN.sesion.googleAlcanceDrive, sesionEmail);
      guardarTokenGoogle(r, sesionEmail);
      if (!tokenGoogle.drive) throw err('sin_permiso', 'Para la copia en Drive tienes que marcar el permiso de Drive cuando Google lo pregunte.');
      return tokenGoogle.token;
    }
    const L = await prepararSociales();
    const r = await L.login({ provider: 'google', options: { scopes: [PLAN.sesion.googleAlcanceDrive] } });
    const t = r.result && r.result.accessToken && r.result.accessToken.token;
    if (!t) throw err('sin_permiso', 'Google no dio permiso para el respaldo.');
    return t;
  }
  async function driveFetch(token, url, op) {
    const r = await fetch(url, Object.assign({}, op, { headers: Object.assign({ Authorization: 'Bearer ' + token }, (op && op.headers) || {}) }));
    if (!r.ok) throw err('drive', 'Drive respondió ' + r.status);
    return r;
  }
  async function driveBuscar(token) {
    const q = encodeURIComponent("name='" + NOMBRE_RESPALDO + "'");
    const r = await (await driveFetch(token, 'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=' + q + '&fields=files(id,modifiedTime)')).json();
    return (r.files || [])[0] || null;
  }
  async function respaldoSubir(paquete) {
    const token = await tokenDrive(); const cuerpo = JSON.stringify(paquete);
    const f = await driveBuscar(token);
    if (f) { await driveFetch(token, 'https://www.googleapis.com/upload/drive/v3/files/' + f.id + '?uploadType=media', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: cuerpo }); return f.id; }
    const lim = 'af' + Date.now();
    const multi = '--' + lim + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify({ name: NOMBRE_RESPALDO, parents: ['appDataFolder'] })
      + '\r\n--' + lim + '\r\nContent-Type: application/json\r\n\r\n' + cuerpo + '\r\n--' + lim + '--';
    const r = await (await driveFetch(token, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + lim }, body: multi })).json();
    return r.id;
  }
  // opciones.soloSiHayPermiso: no pide nada a la persona; si no hay permiso a mano devuelve null (sirve para ofrecer recuperar una copia al entrar).
  async function respaldoInfo(opciones) {
    const silencioso = !!(opciones && opciones.soloSiHayPermiso);
    if (silencioso && esNativo()) return null;
    let token;
    try { token = await tokenDrive(esNativo() ? undefined : false); } catch (e) { if (silencioso) return null; throw e; }
    const f = await driveBuscar(token); return f ? { id: f.id, fecha: f.modifiedTime } : null;
  }
  async function respaldoBajar() {
    const token = await tokenDrive(); const f = await driveBuscar(token);
    if (!f) return null;
    return (await driveFetch(token, 'https://www.googleapis.com/drive/v3/files/' + f.id + '?alt=media')).json();
  }
  async function respaldoBorrar() {
    const token = await tokenDrive(); const f = await driveBuscar(token);
    if (f) await driveFetch(token, 'https://www.googleapis.com/drive/v3/files/' + f.id, { method: 'DELETE' });
    return !!f;
  }

  /* ------------------------------------------------------ versión web: instalar y guardar */
  let eventoInstalar = null; const oyentesInstalar = [];
  const instaladaComoApp = () => { try { return !!(g.matchMedia && g.matchMedia('(display-mode: standalone)').matches) || g.navigator.standalone === true || esNativo(); } catch (e) { return false; } };
  if (g.addEventListener && !esNativo()) {
    g.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); eventoInstalar = e; oyentesInstalar.forEach((f) => f()); });
    g.addEventListener('appinstalled', () => { eventoInstalar = null; oyentesInstalar.forEach((f) => f()); });
  }
  const instalacion = {
    instalada: instaladaComoApp,
    disponible: () => !!eventoInstalar && !instaladaComoApp(),
    alCambiar: (f) => { oyentesInstalar.push(f); },
    async instalar() { if (!eventoInstalar) return false; const ev = eventoInstalar; eventoInstalar = null; ev.prompt(); let r; try { r = await ev.userChoice; } catch (e) { return false; } oyentesInstalar.forEach((f) => f()); return !!r && r.outcome === 'accepted'; },
  };
  // Registra el sw.js (copia para abrir sin internet) y pide que el navegador NO borre los datos si falta espacio.
  function prepararWeb() {
    if (esNativo() || !g.navigator) return;
    try { if ('serviceWorker' in g.navigator && (g.location.protocol === 'https:' || esLocal())) g.navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* sin sw: la app funciona igual, solo que sin internet no abre */ }
    try { if (g.navigator.storage && g.navigator.storage.persist) g.navigator.storage.persist().catch(() => {}); } catch (e) { /* nada */ }
  }

  /* ----------------------------------------------------------------- varios */
  async function vibrar() { try { const H = plugin('Haptics'); if (H) await H.impact({ style: 'LIGHT' }); else if (g.navigator.vibrate) g.navigator.vibrate(10); } catch (e) { /* sin vibración */ } }
  function alVolverAPrimerPlano(alSalir, alEntrar) {
    const A = plugin('App');
    if (esNativo() && A) { A.addListener('appStateChange', (s) => (s.isActive ? alEntrar() : alSalir())); return; }
    g.document.addEventListener('visibilitychange', () => (g.document.hidden ? alSalir() : alEntrar()));
  }
  function alAbrirEnlace(cb) {                                             // asistente://voz  → abre el micrófono (widget de pantalla de inicio)
    const A = plugin('App');
    if (!esNativo() || !A) {                                               // versión web: atajo «Hablar» del ícono (manifest) abre ?voz=1
      try { if (new g.URLSearchParams(g.location.search).has('voz')) { g.history.replaceState(null, '', g.location.pathname); cb('asistente://voz'); } } catch (e) { /* sin atajo */ }
      return;
    }
    A.addListener('appUrlOpen', (d) => { if (/^asistente:\/\//.test(d.url || '')) cb(d.url); });
    A.getLaunchUrl && A.getLaunchUrl().then((d) => { if (d && /^asistente:\/\//.test(d.url || '')) cb(d.url); }).catch(() => {});
  }
  function botonAtras(cb) { const A = plugin('App'); if (esNativo() && A) A.addListener('backButton', cb); }
  async function salir() { const A = plugin('App'); if (A && A.exitApp) await A.exitApp(); }

  AF.nativo = { esNativo, esLocal, plugin, almacenNativo, proveedorListo, iniciarSesion, cerrarSesionSocial, huellaDisponible, secretosHuella, vozDisponible, escuchar, hablar, callar,
    leerTextoDeImagen, escucharCompartidos, permisoAvisos, programarAvisos, compartirTexto, entregarArchivo, comprarPro, restaurarCompras,
    respaldoSubir, respaldoInfo, respaldoBajar, respaldoBorrar, precargarWeb, prepararWeb, instalacion, vibrar, alVolverAPrimerPlano, alAbrirEnlace, botonAtras, salir, espera };
  if (typeof module === 'object' && module.exports) module.exports = AF.nativo;
})(typeof window !== 'undefined' ? window : globalThis);
