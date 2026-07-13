import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as certificateService from './certificates.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import type { VerifyCertQuery } from './certificates.schema.js';

// GET /api/certificates
export const list = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const branchIdFilter = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : undefined;
  const { data, meta } = await certificateService.listCertificates(req.query as Record<string, unknown>, branchIdFilter);
  sendSuccess(res, data, 'Certificates fetched', 200, meta);
});

// GET /api/certificates/branch/:branchId/students
export const listBranchStudents = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { certs, meta } = await certificateService.getBranchCertStudents(req.params.branchId as string, req.query as Record<string, unknown>);
  sendSuccess(res, certs, 'Students fetched', 200, meta);
});

// GET /api/certificates/:id
export const get = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const cert = await certificateService.getCertificateById(req.params.id as string);
  if (req.user?.role === 'BRANCH_ADMIN' && (cert as any).branchId !== req.user.branchId) {
    throw Object.assign(new Error('Access denied: certificate belongs to a different branch'), { status: 403 });
  }
  sendSuccess(res, cert);
});

// GET /api/certificates/verify — public, no auth required
export const verify = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await certificateService.verifyCertificate(req.query as unknown as VerifyCertQuery);
  sendSuccess(res, result, result.found ? 'Certificate found' : 'No matching certificate found');
});
