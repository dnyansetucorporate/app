import { Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  listPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getStudentPayments,
} from './payments.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

// GET /api/payments
export const list = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const scopedBranch = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : undefined;
  const { payments, meta } = await listPayments(req.query as Record<string, unknown>, scopedBranch);
  sendSuccess(res, payments, 'Payments fetched', 200, meta);
});

// GET /api/payments/:id
export const get = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const payment = await getPaymentById(req.params.id as string);
  sendSuccess(res, payment);
});

// POST /api/payments
export const create = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const payment = await createPayment(req.body);
  sendSuccess(res, payment, 'Payment created', 201);
});

// PATCH /api/payments/:id
export const update = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const payment = await updatePayment(req.params.id as string, req.body);
  sendSuccess(res, payment, 'Payment updated');
});

// DELETE /api/payments/:id
export const remove = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  await deletePayment(req.params.id as string);
  sendSuccess(res, null, 'Payment deleted');
});

// GET /api/students/:studentId/payments
export const getStudentPaymentsSummary = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await getStudentPayments(req.params.studentId as string);
  sendSuccess(res, result, 'Student payments fetched');
});
