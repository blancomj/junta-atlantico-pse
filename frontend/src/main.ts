// import { createApp } from 'vue';
// import { createPinia } from 'pinia';
// import { VueReCaptcha } from 'vue-recaptcha-v3';
// import App from './App.vue';
// import router from './router';
// import './assets/css/main.css';

// const app = createApp(App);

// app.use(createPinia());
// app.use(router);

// app.use(VueReCaptcha, {
//   siteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
//   loaderOptions: {
//     autoHideBadge: false
//   }
// });

// app.mount('#app');
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/css/main.css';

// CAMBIO: Se elimina el plugin VueReCaptcha (vue-recaptcha-v3).
// Ese plugin cargaba api.js con "?render=explicit", lo que impedia que
// grecaptcha registrara el cliente v3 del site key, y causaba el error:
// "Invalid site key or not loaded in api.js".
// La carga de reCAPTCHA ahora la hace unicamente
// src/services/recaptcha.service.ts con "?render=<SITE_KEY>" (modo v3).

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
