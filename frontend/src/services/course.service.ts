import api from './api';

export const courseService = {
  list: async (params: any) => {
    return api.get('/courses', { params });
  },

  getById: async (id: string) => {
    return api.get(`/courses/${id}`);
  },

  listPapers: async (courseId: string) => {
    return api.get(`/courses/${courseId}/papers`);
  },
  
  create: async (data: any) => {
    return api.post('/courses', data);
  },

  update: async (id: string, data: any) => {
    return api.patch(`/courses/${id}`, data);
  },

  remove: async (id: string) => {
    return api.delete(`/courses/${id}`);
  },

  createPaper: async (courseId: string, data: any) => {
    return api.post(`/courses/${courseId}/papers`, data);
  },

  updatePaper: async (courseId: string, paperId: string, data: any) => {
    return api.patch(`/courses/${courseId}/papers/${paperId}`, data);
  },

  removePaper: async (courseId: string, paperId: string) => {
    return api.delete(`/courses/${courseId}/papers/${paperId}`);
  },

  listQuestions: async (paperId: string) => {
    return api.get(`/courses/papers/${paperId}/questions`);
  },

  addQuestion: async (paperId: string, data: any) => {
    return api.post(`/courses/papers/${paperId}/questions`, data);
  },

  removeQuestion: async (paperId: string, questionId: string) => {
    return api.delete(`/courses/papers/${paperId}/questions/${questionId}`);
  },
};
