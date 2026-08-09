import api from './api';

export const expenseService = {
  list: async (params: any) => {
    return api.get('/expenses', { params });
  },

  getById: async (id: string) => {
    return api.get(`/expenses/${id}`);
  },

  create: async (data: any) => {
    return api.post('/expenses', data);
  },

  update: async (id: string, data: any) => {
    return api.patch(`/expenses/${id}`, data);
  },

  remove: async (id: string) => {
    return api.delete(`/expenses/${id}`);
  },
};
