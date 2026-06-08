import api from './api';

export const branchService = {
  list: async (params?: any) => {
    return api.get('/branches', { params });
  },

  getById: async (id: string) => {
    return api.get(`/branches/${id}`);
  },

  getStats: async () => {
    return api.get('/branches/stats');
  },
  
  create: async (data: any) => {
    // If FormData is passed (file upload), set appropriate headers
    if (data instanceof FormData) {
      return api.post('/branches', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.post('/branches', data);
  },

  update: async (id: string, data: any) => {
    return api.patch(`/branches/${id}`, data);
  },

  updateWithFiles: async (id: string, data: FormData) => {
    return api.patch(`/branches/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  remove: async (id: string) => {
    return api.delete(`/branches/${id}`);
  },
};
