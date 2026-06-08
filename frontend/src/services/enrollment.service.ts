import api from './api';

export const enrollmentService = {
  list: async (params?: any) => {
    return api.get('/enrollments', { params });
  },

  getById: async (id: string) => {
    return api.get(`/enrollments/${id}`);
  },

  create: async (data: any) => {
    return api.post('/enrollments', data);
  },

  update: async (id: string, data: any) => {
    return api.patch(`/enrollments/${id}`, data);
  },

  remove: async (id: string) => {
    return api.delete(`/enrollments/${id}`);
  },

  getStudentEnrollments: async (studentId: string) => {
    return api.get(`/students/${studentId}/enrollments`);
  },
};
