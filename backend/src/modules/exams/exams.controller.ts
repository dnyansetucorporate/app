import { Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  listExams, getExamCounts, getExamById,
  createExam, updateExam, approveExam,
  assignQuestionPaper, getExamStudents, listResults, getExamPasswords,
} from './exams.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

// GET /api/exams
export const list = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const scopedBranch = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : undefined;
  const { exams, meta } = await listExams(req.query as Record<string, unknown>, scopedBranch);
  sendSuccess(res, exams, 'Exams fetched', 200, meta);
});

// GET /api/exams/counts
export const counts = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const scopedBranch = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : undefined;
  const data = await getExamCounts(scopedBranch);
  sendSuccess(res, data);
});

// GET /api/exams/:id
export const get = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const exam = await getExamById(req.params.id as string);
  if (req.user?.role === 'BRANCH_ADMIN' && exam.branch.id !== req.user.branchId) {
    throw Object.assign(new Error('Access denied: exam belongs to a different branch'), { status: 403 });
  }
  sendSuccess(res, exam);
});

// POST /api/exams
export const create = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  // Branch admin can only create exams for their own branch
  const body = { ...req.body };
  if (req.user?.role === 'BRANCH_ADMIN') {
    body.branchId = req.user.branchId;
  }
  const exam = await createExam(body);
  sendSuccess(res, exam, 'Exam created', 201);
});

// PATCH /api/exams/:id
export const update = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const exam = await updateExam(req.params.id as string, req.body);
  sendSuccess(res, exam, 'Exam updated');
});

// PATCH /api/exams/:id/approve
export const approve = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { exam, generatedPasswords } = await approveExam(req.params.id as string);
  sendSuccess(res, {
    exam,
    generatedPasswords
  }, 'Exam approved and passwords generated successfully', 201);
});

// PATCH /api/exams/:examId/courses/:courseId/paper
export const assignPaper = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await assignQuestionPaper(req.params.examId as string, req.params.courseId as string, req.body.questionPaperId);
  sendSuccess(res, result, 'Question paper assigned');
});

// GET /api/exams/:id/students
export const examStudents = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const exam = await getExamById(req.params.id as string);
  if (req.user?.role === 'BRANCH_ADMIN' && exam.branch.id !== req.user.branchId) {
    throw Object.assign(new Error('Access denied: exam belongs to a different branch'), { status: 403 });
  }
  const students = await getExamStudents(req.params.id as string);
  sendSuccess(res, students);
});

// POST /api/exams/:id/generate-passwords
export const generatePasswords = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const results = await import('./exams.service.js').then(m => m.generateExamPasswords(req.params.id as string));
  sendSuccess(res, results, 'Passwords generated successfully');
});
// GET /api/exams/:id/results
export const results = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const exam = await getExamById(req.params.id as string);
  if (req.user?.role === 'BRANCH_ADMIN' && exam.branch.id !== req.user.branchId) {
    throw Object.assign(new Error('Access denied: exam belongs to a different branch'), { status: 403 });
  }
  const data = await listResults(req.params.id as string);
  sendSuccess(res, data, 'Exam results fetched');
});

// GET /api/exams/:id/passwords
export const passwords = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const exam = await getExamById(req.params.id as string);
  if (req.user?.role === 'BRANCH_ADMIN' && exam.branch.id !== req.user.branchId) {
    throw Object.assign(new Error('Access denied: exam belongs to a different branch'), { status: 403 });
  }
  const data = await getExamPasswords(req.params.id as string);
  sendSuccess(res, data, 'Exam passwords fetched');
});
