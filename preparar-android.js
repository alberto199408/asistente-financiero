#!/usr/bin/env node
'use strict';
/* Deja listo el proyecto Android a partir de la configuración ÚNICA (www/js/plan.js + capacitor.config.js).
   Se puede repetir las veces que sea: cada ajuste revisa si ya está puesto.
   Uso:  node scripts/preparar-android.js
   Variables opcionales: VERSION_CODE (si no, GITHUB_RUN_NUMBER o un número sacado de la versión). */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const raiz = path.resolve(__dirname, '..');
const PLAN = require(path.join(raiz, 'www/js/plan.js'));
const A = path.join(raiz, 'android');
const manifestRuta = path.join(A, 'app/src/main/AndroidManifest.xml');
const stringsRuta = path.join(A, 'app/src/main/res/values/strings.xml');
const gradleRuta = path.join(A, 'app/build.gradle');

function correr(cmd, args) {
  console.log('> ' + cmd + ' ' + args.join(' '));
  const r = spawnSync(cmd, args, { cwd: raiz, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) throw new Error('Falló: ' + cmd + ' ' + args.join(' '));
}
const leer = (f) => fs.readFileSync(f, 'utf8');
const escribir = (f, t) => fs.writeFileSync(f, t, 'utf8');
const xml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, "\\'").replace(/"/g, '&quot;');

/* ---------------------------------------------------------------- 1. proyecto y archivos web */
if (!fs.existsSync(A)) correr('npx', ['cap', 'add', 'android']);
correr('npx', ['cap', 'sync', 'android']);

/* ---------------------------------------------------------------- 2. AndroidManifest */
let m = leer(manifestRuta);
const permisos = [
  'android.permission.INTERNET',
  'android.permission.RECORD_AUDIO',         // dictado por voz
  'android.permission.USE_BIOMETRIC',        // huella
  'android.permission.POST_NOTIFICATIONS',   // avisos de vencimientos (Android 13+)
];
for (const p of permisos) {
  if (!m.includes('"' + p + '"')) m = m.replace('</manifest>', '    <uses-permission android:name="' + p + '" />\n</manifest>');
}
// Recibir texto e imágenes compartidas desde el banco, la galería o el WhatsApp (plugin capacitor-share-target)
if (!m.includes('android.intent.action.SEND"')) {
  const filtros = [
    ['SEND', 'text/*'], ['SEND', 'image/*'], ['SEND_MULTIPLE', 'image/*'],
  ].map(([a, t]) => '            <intent-filter>\n                <action android:name="android.intent.action.' + a + '" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <data android:mimeType="' + t + '" />\n            </intent-filter>\n').join('');
  // dentro de la actividad principal (la primera <activity>), justo antes de cerrarla
  m = m.replace(/(<activity[\s\S]*?)(<\/activity>)/, (_, a, b) => a + filtros + '        ' + b);
}
// Facebook: solo si PLAN trae sus dos datos
const fbId = PLAN.sesion.facebookAppId, fbToken = PLAN.sesion.facebookClientToken;
const conFacebook = !!(fbId && fbToken);
if (conFacebook && !m.includes('com.facebook.sdk.ApplicationId')) {
  m = m.replace('</application>',
    '        <meta-data android:name="com.facebook.sdk.ApplicationId" android:value="@string/facebook_app_id" />\n' +
    '        <meta-data android:name="com.facebook.sdk.ClientToken" android:value="@string/facebook_client_token" />\n' +
    '        <activity android:name="com.facebook.CustomTabActivity" android:exported="true">\n' +
    '            <intent-filter>\n                <action android:name="android.intent.action.VIEW" />\n' +
    '                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n' +
    '                <data android:scheme="@string/fb_login_protocol_scheme" />\n            </intent-filter>\n        </activity>\n    </application>');
}
escribir(manifestRuta, m);

/* ---------------------------------------------------------------- 3. textos (nombre de la app y Facebook) */
let s = leer(stringsRuta);
const poner = (nombre, valor) => {
  const re = new RegExp('(<string name="' + nombre + '"[^>]*>)[\\s\\S]*?(</string>)');
  if (re.test(s)) s = s.replace(re, (_, a, b) => a + xml(valor) + b);
  else s = s.replace('</resources>', '    <string name="' + nombre + '">' + xml(valor) + '</string>\n</resources>');
};
poner('app_name', PLAN.app.nombre);
poner('title_activity_main', PLAN.app.nombre);
if (conFacebook) { poner('facebook_app_id', fbId); poner('fb_login_protocol_scheme', 'fb' + fbId); poner('facebook_client_token', fbToken); }
escribir(stringsRuta, s);

/* ---------------------------------------------------------------- 4. build.gradle: id, versión y firma */
let g = leer(gradleRuta);
const partes = String(PLAN.app.version).split('.').map((x) => parseInt(x, 10) || 0);
const codigo = parseInt(process.env.VERSION_CODE || process.env.GITHUB_RUN_NUMBER || '', 10) || (partes[0] * 10000 + partes[1] * 100 + partes[2]);
g = g.replace(/applicationId\s+"[^"]*"/, 'applicationId "' + PLAN.app.idPaquete + '"');
g = g.replace(/versionCode\s+\d+/, 'versionCode ' + codigo);
g = g.replace(/versionName\s+"[^"]*"/, 'versionName "' + PLAN.app.version + '"');
if (!g.includes('ANDROID_KEYSTORE_FILE')) {
  // La llave de firma NUNCA va en el código: llega por variables de entorno (en GitHub, desde "Secrets").
  g = g.replace(/buildTypes\s*\{/, 'signingConfigs {\n        release {\n            def ks = System.getenv("ANDROID_KEYSTORE_FILE")\n            if (ks) {\n                storeFile file(ks)\n                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")\n                keyAlias System.getenv("ANDROID_KEY_ALIAS")\n                keyPassword System.getenv("ANDROID_KEY_PASSWORD")\n            }\n        }\n    }\n    buildTypes {');
  g = g.replace(/release\s*\{(\s*)minifyEnabled/, 'release {$1if (System.getenv("ANDROID_KEYSTORE_FILE")) { signingConfig signingConfigs.release }\n            minifyEnabled');
}
escribir(gradleRuta, g);

/* ---------------------------------------------------------------- 4b. MainActivity: necesaria para el permiso de Drive del respaldo
   (PLAN.sesion.googleAlcanceDrive). Con la actividad de fábrica, Google rechaza pedir permisos extra al iniciar sesión. */
function buscar(dir, nombre) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = path.join(dir, e.name);
    if (e.isDirectory()) { const x = buscar(r, nombre); if (x) return x; } else if (e.name === nombre) return r;
  }
  return null;
}
const mainActividad = buscar(path.join(A, 'app/src/main/java'), 'MainActivity.java');
if (!mainActividad) throw new Error('No encontré MainActivity.java en el proyecto Android');
let ja = leer(mainActividad);
if (!ja.includes('ModifiedMainActivityForSocialLoginPlugin')) {
  const paquete = (ja.match(/^package\s+([\w.]+);/m) || [])[1];
  if (!paquete) throw new Error('MainActivity.java sin línea package');
  escribir(mainActividad, [
    'package ' + paquete + ';', '',
    'import android.content.Intent;', 'import android.util.Log;', 'import com.getcapacitor.BridgeActivity;', 'import com.getcapacitor.PluginHandle;',
    'import com.getcapacitor.Plugin;', 'import ee.forgr.capacitor.social.login.GoogleProvider;',
    'import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;', 'import ee.forgr.capacitor.social.login.SocialLoginPlugin;', '',
    'public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {',
    '    @Override',
    '    public void onActivityResult(int requestCode, int resultCode, Intent data) {',
    '        super.onActivityResult(requestCode, resultCode, data);',
    '        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN && requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {',
    '            PluginHandle handle = getBridge().getPlugin("SocialLogin");',
    '            if (handle == null) { Log.i("AsistenteFinanciero", "SocialLogin no está cargado"); return; }',
    '            Plugin plugin = handle.getInstance();',
    '            if (plugin instanceof SocialLoginPlugin) ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);',
    '        }',
    '    }', '',
    '    @Override',
    '    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}',
    '}', ''].join('\n'));
}

/* ---------------------------------------------------------------- 5. ícono */
const py = spawnSync('python3', [path.join(__dirname, 'iconos.py'), path.join(A, 'app/src/main/res'), PLAN.apariencia.claro.panel], { cwd: raiz, stdio: 'inherit' });
if (py.status !== 0) throw new Error('No se pudo generar el ícono (¿está instalado Pillow? pip install pillow)');

console.log('\nAndroid listo: ' + PLAN.app.nombre + ' · ' + PLAN.app.idPaquete + ' · versión ' + PLAN.app.version + ' (código ' + codigo + ')' + (conFacebook ? ' · con Facebook' : ' · sin Facebook (faltan sus datos en PLAN)'));
