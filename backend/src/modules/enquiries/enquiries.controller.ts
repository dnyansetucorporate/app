import { Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  listEnquiries, getEnquiryById, createEnquiry,
  updateEnquiry, deleteEnquiry, addFollowUp,
} from './enquiries.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

// GET /api/enquiries
export const list = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const scopedBranch = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : undefined;
  const { enquiries, meta } = await listEnquiries(req.query as Record<string, unknown>, scopedBranch);
  sendSuccess(res, enquiries, 'Enquiries fetched', 200, meta);
});

// GET /api/enquiries/:id
export const get = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const enquiry = await getEnquiryById(req.params.id as string);
  sendSuccess(res, enquiry);
});

// POST /api/enquiries
export const create = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const enquiry = await createEnquiry(req.body);
  sendSuccess(res, enquiry, 'Enquiry added', 201);
});

// PATCH /api/enquiries/:id
export const update = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const actorBranchId = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : undefined;
  const enquiry = await updateEnquiry(req.params.id as string, req.body, actorBranchId);
  sendSuccess(res, enquiry, 'Enquiry updated');
});

// DELETE /api/enquiries/:id
export const remove = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const actorBranchId = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : undefined;
  await deleteEnquiry(req.params.id as string, actorBranchId);
  sendSuccess(res, null, 'Enquiry deleted');
});

// POST /api/enquiries/:id/follow-ups
export const createFollowUp = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const actorBranchId = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : undefined;
  const followUp = await addFollowUp(req.params.id as string, req.body, actorBranchId);
  sendSuccess(res, followUp, 'Follow-up added', 201);
});
