import { prisma } from '../../config/prisma.js';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response.js';
import type { CreateEnrollmentDto, UpdateEnrollmentDto, EnrollmentQuery } from './enrollments.schema.js';

export const listEnrollments = async (query: Record<string, unknown>, scopedBranchId?: string) => {
  const { page, limit, skip, take } = getPaginationParams(query);
  const q = query as unknown as EnrollmentQuery;

  const where: Record<string, unknown> = {};

  if (scopedBranchId) where.branchId = scopedBranchId;
  else if (q.branchId) where.branchId = q.branchId;

  if (q.studentId) where.studentId = q.studentId;
  if (q.courseId) where.courseId = q.courseId;
  if (q.paymentStatus) where.paymentStatus = q.paymentStatus;

  const [total, enrollments] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where,
      skip,
      take,
      orderBy: { enrolledAt: 'desc' },
      include: {
        student: { select: { id: true, prn: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { enrollments, meta: buildPaginationMeta(total, page, limit) };
};

export const getEnrollmentById = async (id: string) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id },
    include: {
      student: true,
      course: true,
      branch: true,
    },
  });
  if (!enrollment) throw Object.assign(new Error('Enrollment not found'), { status: 404 });
  return enrollment;
};

export const createEnrollment = async (data: CreateEnrollmentDto) => {
  // Validate student exists and belongs to correct branch
  const student = await prisma.student.findUnique({ where: { id: data.studentId } });
  if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });
  if (student.branchId !== data.branchId) {
    throw Object.assign(new Error('Student does not belong to this branch'), { status: 400 });
  }

  // Validate course exists
  const course = await prisma.course.findUnique({ where: { id: data.courseId } });
  if (!course) throw Object.assign(new Error('Course not found'), { status: 404 });

  // Validate branch exists
  const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
  if (!branch) throw Object.assign(new Error('Branch not found'), { status: 404 });

  // Check if already enrolled in this course
  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: data.studentId, courseId: data.courseId } },
  });
  if (existing) {
    throw Object.assign(new Error('Student is already enrolled in this course'), { status: 409 });
  }

  return prisma.enrollment.create({
    data: {
      studentId: data.studentId,
      courseId: data.courseId,
      branchId: data.branchId,
      courseFee: data.courseFee,
      paymentStatus: data.paymentStatus,
    },
    include: {
      student: { select: { id: true, prn: true, firstName: true, lastName: true } },
      course: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  });
};

export const updateEnrollment = async (id: string, data: UpdateEnrollmentDto) => {
  const enrollment = await prisma.enrollment.findUnique({ where: { id } });
  if (!enrollment) throw Object.assign(new Error('Enrollment not found'), { status: 404 });

  return prisma.enrollment.update({
    where: { id },
    data: {
      ...(data.paymentStatus !== undefined && { paymentStatus: data.paymentStatus }),
    },
    include: {
      student: { select: { id: true, prn: true, firstName: true, lastName: true } },
      course: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  });
};

export const deleteEnrollment = async (id: string) => {
  const enrollment = await prisma.enrollment.findUnique({ where: { id } });
  if (!enrollment) throw Object.assign(new Error('Enrollment not found'), { status: 404 });

  return prisma.enrollment.delete({
    where: { id },
    include: {
      student: { select: { id: true, prn: true, firstName: true, lastName: true } },
      course: { select: { id: true, name: true } },
    },
  });
};

export const getStudentCourseEnrollments = async (studentId: string) => {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

  return prisma.enrollment.findMany({
    where: { studentId },
    include: {
      course: { select: { id: true, name: true, description: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { enrolledAt: 'desc' },
  });
};
