import { Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as studentPortalService from './student-portal.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

// GET /api/student-portal/available-exams
export const availableExams = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?.studentId) {
    throw Object.assign(new Error('Student ID not found in token'), { status: 403 });
  }
  const exams = await studentPortalService.getAvailableExams(req.user.studentId);
  sendSuccess(res, exams, 'Available exams fetched');
});

// GET /api/student-portal/exams/:examId/courses/:courseId
export const examQuestions = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { examId, courseId } = req.params;
  if (!req.user?.studentId) {
    throw Object.assign(new Error('Student ID not found in token'), { status: 403 });
  }
  const data = await studentPortalService.getExamQuestions(examId as string, courseId as string, req.user.studentId);
  sendSuccess(res, data, 'Exam questions fetched');
});

// POST /api/student-portal/exams/:examId/submit
export const submitExam = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?.studentId) {
    throw Object.assign(new Error('Student ID not found in token'), { status: 403 });
  }
  const result = await studentPortalService.submitExamResult(req.user.studentId, req.params.examId as string, req.body.answers);
  sendSuccess(res, result, 'Exam submitted successfully');
});
