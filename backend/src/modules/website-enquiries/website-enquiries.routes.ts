import { Router } from 'express';
import { submitStudentEnquiry, submitFranchiseEnquiry } from './website-enquiries.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createStudentEnquirySchema, createFranchiseEnquirySchema } from './website-enquiries.schema.js';

// Public endpoints — no auth. Hit by the marketing site's student/franchise enquiry forms.
const router = Router();

router.post('/student', validate(createStudentEnquirySchema), submitStudentEnquiry);
router.post('/franchise', validate(createFranchiseEnquirySchema), submitFranchiseEnquiry);

export default router;
