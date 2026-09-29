import api from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'FARMER' | 'CUSTOMER' | 'EXPERT';
  farmerId?: string | null;
  isAccepted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

interface MeResponse {
  success: boolean;
  data: {
    user: User;
  };
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'FARMER' | 'CUSTOMER' | 'EXPERT';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<{ user: User; token: string }> {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    return data.data;
  },

  async login(payload: LoginPayload): Promise<{ user: User; token: string }> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    return data.data;
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<MeResponse>('/auth/me');
    return data.data.user;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
};
