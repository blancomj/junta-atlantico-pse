import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Checkout from '../views/Checkout.vue';
import PaymentReturn from '../views/PaymentReturn.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/checkout'
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: Checkout
  },
  {
    path: '/retorno-pago',
    name: 'PaymentReturn',
    component: PaymentReturn
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
