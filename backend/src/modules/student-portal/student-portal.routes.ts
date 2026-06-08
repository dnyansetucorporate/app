import { Router } from 'express';
import { availableExams, examQuestions, submitExam } from './student-portal.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { examParamsSchema, submitExamSchema } from './student-portal.schema.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('STUDENT'));

// GET /api/student-portal/available-exams
router.get('/available-exams', availableExams);

// GET /api/student-portal/exams/:examId/courses/:courseId
router.get('/exams/:examId/courses/:courseId', validate(examParamsSchema, 'params'), examQuestions);

// POST /api/student-portal/exams/:examId/submit
router.post('/exams/:examId/submit', validate(examParamsSchema, 'params'), validate(submitExamSchema, 'body'), submitExam);

export default router;
