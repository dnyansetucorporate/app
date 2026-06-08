import { Router } from 'express';
import { list, listBranchStudents, get } from './certificates.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { certQuerySchema } from './certificates.schema.js';
import { scopeBranch } from '../../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);

// GET /api/certificates
router.get('/', validate(certQuerySchema, 'query'), list);

// GET /api/certificates/branch/:branchId/students
router.get('/branch/:branchId/students', scopeBranch, listBranchStudents);

// GET /api/certificates/:id
router.get('/:id', get);

export default router;
