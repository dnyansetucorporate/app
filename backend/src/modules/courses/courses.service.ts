import { prisma } from '../../config/prisma.js';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response.js';
import type { CreateCourseDto, CreateQuestionPaperDto, UpdateQuestionPaperDto, AddQuestionDto } from './courses.schema.js';

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
  const existing = await prisma.course.findUnique({ where: { name: data.name } });
  if (existing) {
    if (existing.isActive) {
      throw Object.assign(new Error('A course with this name already exists'), { status: 409 });
    }
    // Name belongs to a previously soft-deleted course — reactivate it instead of
    // hitting the unique constraint on `name`, restoring its old question papers.
    return prisma.course.update({
      where: { id: existing.id },
      data: { isActive: true, description: data.description },
    });
  }

  return prisma.course.create({
    data: { name: data.name, description: data.description },
  });
};

export const updateCourse = async (id: string, data: Partial<CreateCourseDto>) => {
  if (data.name) {
    const existing = await prisma.course.findUnique({ where: { name: data.name } });
    if (existing && existing.id !== id) {
      throw Object.assign(new Error('A course with this name already exists'), { status: 409 });
    }
  }

  return prisma.course.update({
    where: { id },
    data,
  });
};

export const deleteCourse = async (id: string) => {
  const activeEnrollments = await prisma.enrollment.count({
    where: { courseId: id, paymentStatus: { in: ['FULL_PAID', 'PARTIAL_PAID'] } },
  });
  if (activeEnrollments > 0) {
    throw Object.assign(
      new Error(`Cannot delete course with ${activeEnrollments} active enrollment(s). Complete or cancel them first.`),
      { status: 409 }
    );
  }

  // Only safe to remove permanently when nothing else references it —
  // question papers cascade-delete with the course, but Enrollment/ExamCourse
  // rows don't, so a hard delete would otherwise fail with a FK constraint
  // error (or, for papers, silently wipe out historical exam content).
  const [questionPapers, enrollments, examCourses] = await Promise.all([
    prisma.questionPaper.count({ where: { courseId: id } }),
    prisma.enrollment.count({ where: { courseId: id } }),
    prisma.examCourse.count({ where: { courseId: id } }),
  ]);

  if (questionPapers === 0 && enrollments === 0 && examCourses === 0) {
    await prisma.course.delete({ where: { id } });
    return;
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
    data: {
      courseId,
      title: data.title,
      ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
    },
  });
};

export const updateQuestionPaper = async (paperId: string, data: UpdateQuestionPaperDto) => {
  return prisma.questionPaper.update({
    where: { id: paperId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
    },
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
