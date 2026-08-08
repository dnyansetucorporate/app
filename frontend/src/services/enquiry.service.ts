import api from './api';

export const enquiryService = {
  list: async (params?: any) => {
    return api.get('/enquiries', { params });
  },

  getById: async (id: string) => {
    return api.get(`/enquiries/${id}`);
  },

  create: async (data: any) => {
    return api.post('/enquiries', data);
  },

  update: async (id: string, data: any) => {
    return api.patch(`/enquiries/${id}`, data);
  },

  remove: async (id: string) => {
    return api.delete(`/enquiries/${id}`);
  },

  addFollowUp: async (id: string, data: { date: string; note: string }) => {
    return api.post(`/enquiries/${id}/follow-ups`, data);
  },
};
