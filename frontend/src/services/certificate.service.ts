import api from './api';

export const certificateService = {
  list: async (params?: any) => {
    return api.get('/certificates', { params });
  },

  listBranchStudents: async (branchId: string, params?: { page?: number; limit?: number; search?: string }) => {
    return api.get(`/certificates/branch/${branchId}/students`, { params });
  },

  getById: async (id: string) => {
    return api.get(`/certificates/${id}`);
  },
};

export default certificateService;
