import api from './api';

export const authService = {
  login: async (identifier: string, password: string): Promise<any> => {
    const response: any = await api.post('/auth/login', { identifier, password });
    if (response.success) {
      sessionStorage.setItem('token', response.data.token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  },

  logout: () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  
  getMe: async () => {
    return api.get('/auth/me');
  },
};
