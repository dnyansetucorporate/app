import { Router } from 'express';
import { list, counts, get, create, update, approve, assignPaper, examStudents, results, passwords } from './exams.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole, scopeBranch } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createExamSchema, updateExamSchema, examQuerySchema, assignPaperSchema } from './exams.schema.js';

const router = Router();
router.use(authenticate);

router.get('/counts',  scopeBranch, counts);
router.get('/',        scopeBranch, validate(examQuerySchema, 'query'), list);
router.get('/:id',          get);
router.get('/:id/students', examStudents);
router.get('/:id/results',  results);
router.get('/:id/passwords', requireRole('BRANCH_ADMIN', 'SUPER_ADMIN'), passwords);

// BRANCH_ADMIN can create exams for their own branch only (service validates branchId)
router.post('/',       requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), validate(createExamSchema), create);
router.patch('/:id/approve', requireRole('SUPER_ADMIN'), approve);
router.patch('/:examId/courses/:courseId/paper', requireRole('SUPER_ADMIN'), validate(assignPaperSchema), assignPaper);

export default router;
