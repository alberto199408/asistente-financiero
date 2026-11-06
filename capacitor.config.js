/* Capacitor lee ESTE archivo. No se escribe nada a mano aquí: todo sale de www/js/plan.js (nombre, id del paquete, Facebook, etc.),
   para que cambiar algo se haga en un solo lugar. */
const PLAN = require('./www/js/plan.js');

// Facebook solo se incluye en la app cuando están sus dos datos en PLAN.sesion; si no, la app compila sin su SDK y el botón avisa que falta configurarlo.
const conFacebook = !!(PLAN.sesion.facebookAppId && PLAN.sesion.facebookClientToken);

module.exports = {
  appId: PLAN.app.idPaquete,
  appName: PLAN.app.nombre,
  webDir: 'www',
  server: { androidScheme: 'https' },
  android: { allowMixedContent: false },
  plugins: {
    SocialLogin: { providers: { google: true, facebook: conFacebook, apple: false, twitter: false }, logLevel: 1 },
    LocalNotifications: { iconColor: PLAN.apariencia.claro.acento },
  },
};
