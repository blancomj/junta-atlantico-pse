import { useAuthStore } from '../stores/auth.store';

export function requireAuth(_to: any, _from: any, next: any) {
  const authStore = useAuthStore();

  if (!authStore.isAuthenticated) {
    next({ name: 'Login' });
    return;
  }

  if (authStore.mustChangePassword && _to.name !== 'ChangePassword') {
    next({ name: 'ChangePassword' });
    return;
  }

  next();
}

export function requireAdmin(_to: any, _from: any, next: any) {
  const authStore = useAuthStore();

  if (!authStore.isAuthenticated) {
    next({ name: 'Login' });
    return;
  }

  if (authStore.mustChangePassword) {
    next({ name: 'ChangePassword' });
    return;
  }

  if (!authStore.isAdmin) {
    next({ name: 'Dashboard' });
    return;
  }

  next();
}

export function requireGuest(_to: any, _from: any, next: any) {
  const authStore = useAuthStore();

  if (authStore.isAuthenticated) {
    if (authStore.isAdmin) {
      next({ name: 'AdminDashboard' });
    } else {
      next({ name: 'Dashboard' });
    }
    return;
  }

  next();
}
