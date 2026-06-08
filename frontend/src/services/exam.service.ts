import api from './api';

export const examService = {
  list: async (params: any) => {
    return api.get('/exams', { params });
  },

  getById: async (id: string) => {
    return api.get(`/exams/${id}`);
  },

  create: async (data: any) => {
    return api.post('/exams', data);
  },

  update: async (id: string, data: any) => {
    return api.patch(`/exams/${id}`, data);
  },

  approve: async (id: string) => {
    return api.patch(`/exams/${id}/approve`);
  },

  getStudents: async (id: string) => {
    return api.get(`/exams/${id}/students`);
  },

  generatePasswords: async (id: string) => {
    return api.post(`/exams/${id}/generate-passwords`);
  },

  getResults: async (id: string) => {
    return api.get(`/exams/${id}/results`);
  },

  getPasswords: async (id: string) => {
    return api.get(`/exams/${id}/passwords`);
  },

  assignPaper: async (examId: string, courseId: string, questionPaperId: string) => {
    return api.patch(`/exams/${examId}/courses/${courseId}/paper`, { questionPaperId });
  },
};
