import { Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as courseService from './courses.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

// GET /api/courses
export const list = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const scopedBranchId = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : undefined;
  const { courses, meta } = await courseService.listCourses(req.query as Record<string, unknown>, scopedBranchId);
  sendSuccess(res, courses, 'Courses fetched', 200, meta);
});

// GET /api/courses/:id
export const get = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const course = await courseService.getCourseById(req.params.id as string);
  sendSuccess(res, course);
});

// POST /api/courses
export const create = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const course = await courseService.createCourse(req.body);
  sendSuccess(res, course, 'Course created', 201);
});

// PATCH /api/courses/:id
export const update = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const course = await courseService.updateCourse(req.params.id as string, req.body);
  sendSuccess(res, course, 'Course updated');
});

// DELETE /api/courses/:id
export const remove = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  await courseService.deleteCourse(req.params.id as string);
  sendSuccess(res, null, 'Course deleted');
});

// ── Question Papers ──────────────────────────────────────────

// GET /api/courses/:id/papers
export const listPapers = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const papers = await courseService.getQuestionPapersByCourseId(req.params.id as string);
  sendSuccess(res, papers);
});

// POST /api/courses/:id/papers
export const createPaper = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const paper = await courseService.createQuestionPaper(req.params.id as string, req.body);
  sendSuccess(res, paper, 'Question paper created', 201);
});

// PATCH /api/courses/:courseId/papers/:paperId
export const updatePaper = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const paper = await courseService.updateQuestionPaper(req.params.paperId as string, req.body);
  sendSuccess(res, paper, 'Question paper updated');
});

// DELETE /api/courses/:courseId/papers/:paperId
export const removePaper = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  await courseService.softDeleteQuestionPaper(req.params.paperId as string);
  sendSuccess(res, null, 'Question paper deleted');
});

// ── Questions ────────────────────────────────────────────────

// GET /api/courses/papers/:paperId/questions
export const listQuestions = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const questions = await courseService.getQuestionsByPaperId(req.params.paperId as string);
  sendSuccess(res, questions);
});

// POST /api/courses/papers/:paperId/questions
export const addQuestion = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const question = await courseService.addQuestionToPaper(req.params.paperId as string, req.body);
  sendSuccess(res, question, 'Question added', 201);
});

// DELETE /api/courses/papers/:paperId/questions/:questionId
export const removeQuestion = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  await courseService.deleteQuestionFromPaper(req.params.questionId as string);
  sendSuccess(res, null, 'Question deleted');
});
