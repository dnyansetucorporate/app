import api from './api';

export const dashboardService = {
  getStats: async (params?: any) => {
    return api.get('/dashboard/stats', { params });
  },

  getPerformance: async (params?: any) => {
    return api.get('/dashboard/performance', { params });
  },

  getRecentStudents: async (params?: any) => {
    return api.get('/dashboard/recent-students', { params });
  },

  getEnrollment: async (params?: any) => {
    return api.get('/dashboard/enrollment', { params });
  }
};
