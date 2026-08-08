import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Checkout from '../views/Checkout.vue';
import PaymentReturn from '../views/PaymentReturn.vue';
import Login from '../views/auth/Login.vue';
import ForgotPassword from '../views/auth/ForgotPassword.vue';
import ResetPassword from '../views/auth/ResetPassword.vue';
import FirstLogin from '../views/auth/FirstLogin.vue';
import ChangePassword from '../views/auth/ChangePassword.vue';
import AdminDashboard from '../views/admin/AdminDashboard.vue';
import UserManagement from '../views/admin/UserManagement.vue';
import Dashboard from '../views/batch-payments/Dashboard.vue';
import BatchDetail from '../views/batch-payments/Detail.vue';
import NewPayment from '../views/batch-payments/NewPayment.vue';
import { requireAuth, requireAdmin, requireGuest } from '../guards/auth.guard';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/login' },

  // Public
  { path: '/login', name: 'Login', component: Login, beforeEnter: requireGuest },
  { path: '/forgot-password', name: 'ForgotPassword', component: ForgotPassword, beforeEnter: requireGuest },
  { path: '/reset-password', name: 'ResetPassword', component: ResetPassword, beforeEnter: requireGuest },
  { path: '/first-login', name: 'FirstLogin', component: FirstLogin },

  // Checkout (accesible sin auth - redirige de ACH)
  { path: '/checkout', name: 'Checkout', component: Checkout },
  { path: '/checkout/:batchPaymentId', name: 'CheckoutBatch', component: Checkout },
  { path: '/retorno-pago', name: 'PaymentReturn', component: PaymentReturn },

  // Admin (solo admin)
  { path: '/admin', name: 'AdminDashboard', component: AdminDashboard, beforeEnter: requireAdmin },
  { path: '/admin/users', name: 'UserManagement', component: UserManagement, beforeEnter: requireAdmin },

  // Usuario normal
  { path: '/change-password', name: 'ChangePassword', component: ChangePassword, beforeEnter: requireAuth },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard, beforeEnter: requireAuth },
  { path: '/batch-payments/new', name: 'NewPayment', component: NewPayment, beforeEnter: requireAuth },
  { path: '/batch-payments/:id', name: 'BatchDetail', component: BatchDetail, beforeEnter: requireAuth },
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
