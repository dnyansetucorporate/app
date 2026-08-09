import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { createStudentEnquiry, createFranchiseEnquiry } from './website-enquiries.service.js';

// POST /api/website-enquiries/student
export const submitStudentEnquiry = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const enquiry = await createStudentEnquiry(req.body, req.ip);
  sendSuccess(res, { id: enquiry.id }, 'Enquiry submitted! Our counsellor will contact you shortly.', 201);
});

// POST /api/website-enquiries/franchise
export const submitFranchiseEnquiry = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const enquiry = await createFranchiseEnquiry(req.body, req.ip);
  sendSuccess(res, { id: enquiry.id }, 'Enquiry submitted! Our franchise team will contact you soon.', 201);
});
