import { prisma } from '../../config/prisma.js';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response.js';
import type { CreateCourseDto, CreateQuestionPaperDto, AddQuestionDto } from './courses.schema.js';

export const listCourses = async (query: Record<string, unknown>, scopedBranchId?: string) => {
  const { page, limit, skip, take } = getPaginationParams(query);
  const search = query.search as string | undefined;

  const where: any = { isActive: true };
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [total, courses] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where, skip, take,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { questionPapers: true, enrollments: true } },
      },
    }),
  ]);

  // Enrich with branch-scoped/global student counts by role scope.
  // Count from Student table (not Enrollment.branchId) to ensure branch isolation.
  const enriched = await Promise.all(courses.map(async (c: any) => {
    const baseStudentWhere: any = {
      enrollments: { some: { courseId: c.id } },
    };
    if (scopedBranchId) baseStudentWhere.branchId = scopedBranchId;

    const totalStudents = await prisma.student.count({
      where: baseStudentWhere,
    });

    const activeStudents = await prisma.student.count({
      where: { ...baseStudentWhere, isActive: true },
    });

    return {
      ...c,
      questionPapers: c._count.questionPapers,
      totalStudents,
      activeStudents,
    };
  }));

  return { courses: enriched, meta: buildPaginationMeta(total, page, limit) };
};

export const getCourseById = async (id: string) => {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      questionPapers: {
        include: { _count: { select: { questions: true } } },
      },
      _count: { select: { enrollments: true } },
    },
  });
  if (!course) throw Object.assign(new Error('Course not found'), { status: 404 });
  return course;
};

export const createCourse = async (data: CreateCourseDto) => {
  return prisma.course.create({
    data: { name: data.name, description: data.description },
  });
};

export const updateCourse = async (id: string, data: Partial<CreateCourseDto>) => {
  return prisma.course.update({
    where: { id },
    data,
  });
};

export const softDeleteCourse = async (id: string) => {
  const activeEnrollments = await prisma.enrollment.count({
    where: { courseId: id, paymentStatus: { in: ['FULL_PAID', 'PARTIAL_PAID'] } },
  });
  if (activeEnrollments > 0) {
    throw Object.assign(
      new Error(`Cannot deactivate course with ${activeEnrollments} active enrollment(s). Complete or cancel them first.`),
      { status: 409 }
    );
  }
  await prisma.course.update({ where: { id }, data: { isActive: false } });
};

// ── Question Papers ──────────────────────────────────────────

export const getQuestionPapersByCourseId = async (courseId: string) => {
  return prisma.questionPaper.findMany({
    where: { courseId, isActive: true },
    include: { _count: { select: { questions: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

export const createQuestionPaper = async (courseId: string, data: CreateQuestionPaperDto) => {
  return prisma.questionPaper.create({
    data: { courseId, title: data.title },
  });
};

export const updateQuestionPaper = async (paperId: string, data: { title: string }) => {
  return prisma.questionPaper.update({
    where: { id: paperId },
    data: { title: data.title },
  });
};

export const softDeleteQuestionPaper = async (paperId: string) => {
  await prisma.questionPaper.update({
    where: { id: paperId },
    data: { isActive: false },
  });
};

// ── Questions ────────────────────────────────────────────────

export const getQuestionsByPaperId = async (paperId: string) => {
  return prisma.question.findMany({
    where: { questionPaperId: paperId },
    orderBy: { questionNo: 'asc' },
  });
};

export const addQuestionToPaper = async (paperId: string, data: AddQuestionDto) => {
  return prisma.question.create({
    data: {
      questionPaperId: paperId,
      questionNo: data.questionNo,
      questionText: data.questionText,
      options: data.options as any,
      correctOption: data.correctOption,
    },
  });
};

export const deleteQuestionFromPaper = async (questionId: string) => {
  await prisma.question.delete({ where: { id: questionId } });
};
