import api from './api';

export const scheduleService = {
  list: async (params?: any) => {
    return api.get('/schedules', { params });
  },

  getById: async (id: string) => {
    return api.get(`/schedules/${id}`);
  },

  create: async (data: any) => {
    return api.post('/schedules', data);
  },

  update: async (id: string, data: any) => {
    return api.patch(`/schedules/${id}`, data);
  },

  remove: async (id: string) => {
    return api.delete(`/schedules/${id}`);
  },

  getBranchSchedules: async (branchId: string) => {
    return api.get(`/branches/${branchId}/schedules`);
  },

  getCourseSchedule: async (branchId: string, courseId: string) => {
    return api.get(`/branches/${branchId}/courses/${courseId}/schedule`);
  },
};
