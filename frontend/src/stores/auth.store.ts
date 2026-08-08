import { defineStore } from 'pinia';
import { AuthUser } from '../types/batch-payment.types';
import authService from '../services/auth.service';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: authService.getUser(),
    loading: false,
    error: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'admin',
    mustChangePassword: (state) => state.user?.mustChangePassword || false
  },

  actions: {
    async login(email: string, password: string): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        this.user = await authService.login(email, password);
      } catch (error: any) {
        this.error = error.response?.data?.message || 'Error al iniciar sesion';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    logout(): void {
      authService.logout();
      this.user = null;
    },

    async checkAuth(): Promise<void> {
      if (!authService.isAuthenticated()) return;
      try {
        this.user = await authService.getMe();
      } catch {
        this.logout();
      }
    }
  }
});
