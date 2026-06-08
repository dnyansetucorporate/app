import api from './api';

export const paymentService = {
  list: async (params?: any) => {
    return api.get('/payments', { params });
  },

  getById: async (id: string) => {
    return api.get(`/payments/${id}`);
  },

  create: async (data: any) => {
    return api.post('/payments', data);
  },

  update: async (id: string, data: any) => {
    return api.patch(`/payments/${id}`, data);
  },

  remove: async (id: string) => {
    return api.delete(`/payments/${id}`);
  },

  getStudentPayments: async (studentId: string) => {
    return api.get(`/students/${studentId}/payments`);
  },

  getStudentPaymentSummary: async (studentId: string) => {
    return api.get(`/students/${studentId}/payments/summary`);
  },
};
