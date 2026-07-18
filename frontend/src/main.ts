import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { VueReCaptcha } from 'vue-recaptcha-v3';
import App from './App.vue';
import router from './router';
import './assets/css/main.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.use(VueReCaptcha, {
  siteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
  loaderOptions: {
    autoHideBadge: false
  }
});

app.mount('#app');
