import { Router } from 'express';
import { stats, performance, enrollment, recentStudents } from './dashboard.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { statsQuerySchema, performanceQuerySchema, enrollmentQuerySchema, recentStudentsQuerySchema } from './dashboard.schema.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { scopeBranch } from '../../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);

// Applying scopeBranch to dashboard routes ensure Branch Admins 
// only see their own metrics even if they try to pass a different branchId
router.get('/stats',       scopeBranch, validate(statsQuerySchema, 'query'), stats);
router.get('/performance', scopeBranch, validate(performanceQuerySchema, 'query'), performance);
router.get('/enrollment',  scopeBranch, validate(enrollmentQuerySchema, 'query'), enrollment);
router.get('/recent-students', scopeBranch, validate(recentStudentsQuerySchema, 'query'), recentStudents);

export default router;
