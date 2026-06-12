import { Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  listBranches, getBranchStats, getBranchById,
  createBranch, updateBranch, deleteBranch,
} from './branches.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

// GET /api/branches
export const list = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { branches, meta } = await listBranches(req.query as Record<string, unknown>);
  sendSuccess(res, branches, 'Branches fetched', 200, meta);
});

// GET /api/branches/stats
export const stats = asyncHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
  const data = await getBranchStats();
  sendSuccess(res, data);
});

// GET /api/branches/:id
export const get = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const branch = await getBranchById(req.params.id as string);
  sendSuccess(res, branch);
});

// POST /api/branches
export const create = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const files = (req as any).files as Record<string, Express.Multer.File[]> | undefined;
  const body = { ...req.body } as Record<string, unknown>;
  const formatFilePath = (req as any).formatFilePath;

  const buildPath = (filename: string): string =>
    formatFilePath ? formatFilePath(filename) : `uploads/branches/${filename}`;

  if (files?.logo?.[0]) body.logo = buildPath(files.logo[0].filename);
  if (files?.aadharImage?.[0]) body.aadharImage = buildPath(files.aadharImage[0].filename);
  if (files?.panImage?.[0]) body.panImage = buildPath(files.panImage[0].filename);

  const branch = await createBranch(body as any);
  sendSuccess(res, branch, 'Branch created successfully', 201);
});

// PATCH /api/branches/:id
export const update = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const files = (req as any).files as Record<string, Express.Multer.File[]> | undefined;
  const body = { ...req.body } as Record<string, unknown>;
  const formatFilePath = (req as any).formatFilePath;

  const buildPath = (filename: string): string =>
    formatFilePath ? formatFilePath(filename) : `uploads/branches/${filename}`;

  if (files?.logo?.[0]) body.logo = buildPath(files.logo[0].filename);
  if (files?.aadharImage?.[0]) body.aadharImage = buildPath(files.aadharImage[0].filename);
  if (files?.panImage?.[0]) body.panImage = buildPath(files.panImage[0].filename);

  const branch = await updateBranch(req.params.id as string, body as any);
  sendSuccess(res, branch, 'Branch updated successfully');
});

// DELETE /api/branches/:id
export const remove = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  await deleteBranch(req.params.id as string);
  sendSuccess(res, null, 'Branch deleted successfully');
});
