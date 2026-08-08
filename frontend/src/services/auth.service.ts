import axios from 'axios';
import { AuthUser } from '../types/batch-payment.types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/pse';
const API_ROOT = BASE_URL.replace(/\/pse$/, '');

class AuthService {
  private accessToken: string | null = null;
  private _refreshToken: string | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this._refreshToken = localStorage.getItem('refreshToken');
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const response = await axios.post(`${API_ROOT}/auth/login`, { email, password });
    const { accessToken, refreshToken, user } = response.data.data;

    this.accessToken = accessToken;
    this._refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    return user;
  }

  async forgotPassword(email: string): Promise<void> {
    await axios.post(`${API_ROOT}/auth/forgot-password`, { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await axios.post(`${API_ROOT}/auth/reset-password`, { token, newPassword });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await axios.post(`${API_ROOT}/auth/change-password`, { currentPassword, newPassword }, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
  }

  async getMe(): Promise<AuthUser> {
    const response = await axios.get(`${API_ROOT}/auth/me`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    return response.data.data;
  }

  logout(): void {
    this.accessToken = null;
    this._refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  getUser(): AuthUser | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this._refreshToken;
  }
}

export default new AuthService();
