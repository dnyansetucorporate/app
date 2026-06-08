import api from './api';

export const studentService = {
  getAvailableExams: async () => {
    return api.get('/student-portal/available-exams');
  },

  getExamQuestions: async (examId: string, courseId: string) => {
    return api.get(`/student-portal/exams/${examId}/courses/${courseId}`);
  },

  submitExam: async (examId: string, answers: Record<string, number>) => {
    return api.post(`/student-portal/exams/${examId}/submit`, { answers });
  },

  register: async (data: any) => {
    return api.post('/students', data);
  },

  enroll: async (studentId: string, courseId: string, courseFee: string, paymentStatus: string) => {
    return api.post(`/students/${studentId}/enrollments`, { courseId, courseFee, paymentStatus });
  },
  
  list: async (params?: any) => {
    return api.get('/students', { params });
  },

  getById: async (id: string) => {
    return api.get(`/students/${id}`);
  },

  update: async (id: string, data: any) => {
    return api.patch(`/students/${id}`, data);
  },

  updateWithPhoto: async (id: string, data: FormData) => {
    return api.patch(`/students/${id}`, data);
  },

  remove: async (id: string) => {
    return api.delete(`/students/${id}`);
  },

  listEnrollments: async (studentId: string) => {
    return api.get(`/students/${studentId}/enrollments`);
  },

  validatePassword: async (studentId: string, examDate: string, password: string) => {
    return api.post('/students/validate-password', { studentId, examDate, password });
  },
};
