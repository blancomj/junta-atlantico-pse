import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/css/main.css';
 
// El plugin VueReCaptcha (vue-recaptcha-v3) se elimino: cargaba api.js con
// "?render=explicit", lo que impedia que grecaptcha registrara el cliente v3
// del site key ("Invalid site key or not loaded in api.js"). La carga de
// reCAPTCHA la hace unicamente src/services/recaptcha.service.ts en modo v3.
 
const app = createApp(App);
 
app.use(createPinia());
app.use(router);
 
app.mount('#app');
 