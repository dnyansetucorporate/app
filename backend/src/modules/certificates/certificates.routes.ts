import { Router } from 'express';
import { list, listBranchStudents, get, verify } from './certificates.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { certQuerySchema, verifyCertQuerySchema } from './certificates.schema.js';
import { scopeBranch } from '../../middleware/role.middleware.js';

const router = Router();

// Public certificate verification — must be registered before the auth
// gate below, since anyone (no login) should be able to verify a certificate.
router.get('/verify', validate(verifyCertQuerySchema, 'query'), verify);

router.use(authenticate);

// GET /api/certificates
router.get('/', validate(certQuerySchema, 'query'), list);

// GET /api/certificates/branch/:branchId/students
router.get('/branch/:branchId/students', scopeBranch, listBranchStudents);

// GET /api/certificates/:id
router.get('/:id', get);

export default router;
