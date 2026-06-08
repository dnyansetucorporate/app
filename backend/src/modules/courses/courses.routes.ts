import { Router } from 'express';
import {
  list, get, create, update, remove,
  listPapers, createPaper, updatePaper, removePaper,
  listQuestions, addQuestion, removeQuestion,
} from './courses.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createCourseSchema,
  updateCourseSchema,
  courseQuerySchema,
  createQuestionPaperSchema,
  addQuestionSchema,
} from './courses.schema.js';

const router = Router();
router.use(authenticate);

// ── Courses ──────────────────────────────────────────────────
router.get('/', validate(courseQuerySchema, 'query'), list);
router.get('/:id', get);
router.post('/', requireRole('SUPER_ADMIN'), validate(createCourseSchema), create);
router.patch('/:id', requireRole('SUPER_ADMIN'), validate(updateCourseSchema), update);
router.delete('/:id', requireRole('SUPER_ADMIN'), remove);

// ── Question Papers ──────────────────────────────────────────
router.get('/:id/papers', listPapers);
router.post('/:id/papers', requireRole('SUPER_ADMIN'), validate(createQuestionPaperSchema), createPaper);
router.patch('/:courseId/papers/:paperId', requireRole('SUPER_ADMIN'), validate(createQuestionPaperSchema), updatePaper);
router.delete('/:courseId/papers/:paperId', requireRole('SUPER_ADMIN'), removePaper);

// ── Questions ────────────────────────────────────────────────
router.get('/papers/:paperId/questions', listQuestions);
router.post('/papers/:paperId/questions', requireRole('SUPER_ADMIN'), validate(addQuestionSchema), addQuestion);
router.delete('/papers/:paperId/questions/:questionId', requireRole('SUPER_ADMIN'), removeQuestion);

export default router;
