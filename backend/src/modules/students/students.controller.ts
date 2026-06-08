import { Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  listStudents, getStudentById, createStudent,
  updateStudent, softDeleteStudent,
  getEnrollments, enrollStudentInCourse,
  validateStudentPassword,
} from './students.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

// GET /api/students
export const list = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  // scopeBranch middleware injects branchId into query for BRANCH_ADMIN
  const scopedBranch = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : undefined;
  const { students, meta } = await listStudents(req.query as Record<string, unknown>, scopedBranch);
  sendSuccess(res, students, 'Students fetched', 200, meta);
});

// GET /api/students/:id
export const get = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const student = await getStudentById(req.params.id as string);
  sendSuccess(res, student);
});

// POST /api/students
export const create = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  // If multer put a file on req.file, attach a stored path to the body so service persists it
  if ((req as any).file) {
    const f = (req as any).file;
    // Use the formatFilePath helper to properly format the path
    const formatFilePath = (req as any).formatFilePath;
    if (formatFilePath && typeof formatFilePath === 'function') {
      req.body.photo = formatFilePath(f.filename);
    } else {
      // Fallback: construct path manually
      req.body.photo = `uploads/students/${f.filename}`;
    }
  }
  const student = await createStudent(req.body);
  sendSuccess(res, student, 'Student created', 201);
});

// PATCH /api/students/:id
export const update = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if ((req as any).file) {
    const f = (req as any).file;
    // Use the formatFilePath helper to properly format the path
    const formatFilePath = (req as any).formatFilePath;
    if (formatFilePath && typeof formatFilePath === 'function') {
      req.body.photo = formatFilePath(f.filename);
    } else {
      // Fallback: construct path manually
      req.body.photo = `uploads/students/${f.filename}`;
    }
  }
  const actorBranchId = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : undefined;
  const student = await updateStudent(req.params.id as string, req.body, actorBranchId);
  sendSuccess(res, student, 'Student updated');
});

// DELETE /api/students/:id
export const remove = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  await softDeleteStudent(req.params.id as string);
  sendSuccess(res, null, 'Student deleted');
});

// GET /api/students/:id/enrollments
export const listEnrollments = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const enrollments = await getEnrollments(req.params.id as string);
  sendSuccess(res, enrollments);
});

// POST /api/students/:id/enrollments
export const enroll = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { courseId, courseFee, paymentStatus } = req.body;
  if (!courseFee) throw Object.assign(new Error('courseFee is required'), { status: 400 });

  // BRANCH_ADMIN may only enroll students belonging to their own branch
  if (req.user?.role === 'BRANCH_ADMIN') {
    const student = await (await import('./students.service.js')).getStudentById(req.params.id as string);
    if (student.branchId !== req.user.branchId) {
      throw Object.assign(new Error('Access denied: student belongs to a different branch'), { status: 403 });
    }
  }

  const enrollment = await enrollStudentInCourse(req.params.id as string, courseId, Number(courseFee), paymentStatus);
  sendSuccess(res, enrollment, 'Student enrolled', 201);
});

// POST /api/students/validate-password
export const validatePassword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { studentId, examDate, password } = req.body;
  
  if (!studentId || !examDate || !password) {
    throw Object.assign(new Error('Missing required fields: studentId, examDate, password'), { status: 400 });
  }

  const result = await validateStudentPassword(studentId, new Date(examDate), password);
  
  if (result.valid) {
    sendSuccess(res, {
      valid: true,
      message: 'Password is valid and exam is accessible',
      validUntil: result.validUntil,
    }, 'Password validated successfully');
  } else {
    sendSuccess(res, {
      valid: false,
      message: result.message,
      validFrom: result.validFrom,
      validUntil: result.validUntil,
    }, 'Password validation failed', 401);
  }
});
