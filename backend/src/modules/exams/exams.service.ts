import { prisma } from '../../config/prisma.js';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response.js';
import { logPasswordGenerated } from '../../utils/auditLog.js';
import type { CreateExamDto, UpdateExamDto, ExamQuery } from './exams.schema.js';

const examIncludes = {
  branch: { select: { id: true, name: true, location: true } },
  _count: { select: { examResults: true } },
  examCourses: {
    include: {
      course:       { select: { id: true, name: true } },
      questionPaper:{ select: { id: true, title: true } },
    },
  },
} as const;

export const listExams = async (query: Record<string, unknown>, scopedBranchId?: string) => {
  const { page, limit, skip, take } = getPaginationParams(query);
  const q = query as unknown as ExamQuery;

  const where: Record<string, unknown> = {};
  if (q.status)   where.status   = q.status;
  if (scopedBranchId) where.branchId = scopedBranchId;
  else if (q.branchId) where.branchId = q.branchId;
  if (q.search)   where.branch   = { name: { contains: q.search, mode: 'insensitive' } };
  if (q.dateFrom || q.dateTo) {
    const dateFilter: Record<string, unknown> = {};
    if (q.dateFrom) dateFilter.gte = new Date(q.dateFrom);
    if (q.dateTo) { const d = new Date(q.dateTo); d.setHours(23, 59, 59, 999); dateFilter.lte = d; }
    where.examDate = dateFilter;
  }

  const [total, exams] = await Promise.all([
    prisma.exam.count({ where }),
    prisma.exam.findMany({ where, skip, take, orderBy: { examDate: 'desc' }, include: examIncludes }),
  ]);

  const examIds = exams.map((e: any) => e.id);
  const gradeCounts = examIds.length > 0
    ? await prisma.examResult.groupBy({
        by: ['examId', 'grade'],
        where: { examId: { in: examIds } },
        _count: { id: true },
      })
    : [];
  const gradeMap: Record<string, { A: number; B: number; C: number }> = {};
  (gradeCounts as any[]).forEach((g) => {
    if (!gradeMap[g.examId]) gradeMap[g.examId] = { A: 0, B: 0, C: 0 };
    gradeMap[g.examId][g.grade as 'A' | 'B' | 'C'] = g._count.id;
  });

  const enriched = exams.map((e: any) => ({
    ...e,
    numStudents: e.numStudents ?? e._count.examResults,
    gradeA: gradeMap[e.id]?.A ?? 0,
    gradeB: gradeMap[e.id]?.B ?? 0,
    gradeC: gradeMap[e.id]?.C ?? 0,
  }));
  return { exams: enriched, meta: buildPaginationMeta(total, page, limit) };
};

export const getExamCounts = async (branchId?: string) => {
  const filter = branchId ? { branchId } : {};
  const [pending, approved] = await Promise.all([
    prisma.exam.count({ where: { status: 'PENDING',   ...filter } }),
    prisma.exam.count({ where: { status: 'APPROVED',  ...filter } }),
  ]);
  return { pending, approved };
};

export const getExamById = async (id: string) => {
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true, location: true } },
      examCourses: {
        include: {
          course:        { select: { id: true, name: true } },
          questionPaper: { select: { id: true, title: true } },
        },
      },
      examResults: {
        include: {
          student: { select: { id: true, prn: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });
  return exam;
};

export const createExam = async (data: CreateExamDto) => {
  // Check for duplicate exam date in the same branch
  const examDate = new Date(data.examDate);
  examDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(examDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const existing = await prisma.exam.findFirst({
    where: { branchId: data.branchId, examDate: { gte: examDate, lt: nextDay } },
  });
  if (existing) {
    throw Object.assign(
      new Error('An exam is already scheduled for this branch on that date'),
      { status: 409 }
    );
  }

  // Validate all studentIds belong to the specified branch
  if (data.studentIds?.length) {
    const students = await prisma.student.findMany({
      where: { id: { in: data.studentIds }, isActive: true },
      select: { id: true, branchId: true },
    });
    const outsideBranch = students.filter((s) => s.branchId !== data.branchId);
    if (outsideBranch.length > 0) {
      throw Object.assign(
        new Error(`${outsideBranch.length} selected student(s) do not belong to this branch`),
        { status: 400 }
      );
    }
    // Ensure all provided IDs were found
    if (students.length !== data.studentIds.length) {
      throw Object.assign(new Error('One or more student IDs are invalid'), { status: 400 });
    }
  }

  return prisma.exam.create({
    data: {
      branchId: data.branchId,
      examDate: new Date(data.examDate),
      notes:    data.notes,
      numStudents: data.studentIds?.length ?? data.numStudents ?? 0,
      examCourses: data.courses?.length
        ? { create: data.courses.map((c) => ({ courseId: c.courseId, questionPaperId: c.questionPaperId ?? null })) }
        : undefined,
      examStudents: data.studentIds?.length
        ? { create: data.studentIds.map((sid: string) => ({ studentId: sid })) }
        : undefined,
    },
    include: {
      branch:      { select: { id: true, name: true } },
      examCourses: { include: { course: { select: { id: true, name: true } } } },
    },
  });
};

export const updateExam = async (id: string, data: UpdateExamDto) =>
  prisma.exam.update({
    where: { id },
    data: {
      ...(data.examDate && { examDate: new Date(data.examDate) }),
      ...(data.notes    !== undefined && { notes:  data.notes }),
      ...(data.status   && { status: data.status }),
    },
  });

export const approveExam = async (id: string) => {
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true } },
      examCourses: { include: { course: { select: { id: true, name: true } } } },
    }
  });

  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });

  // Validate at least one student is assigned
  const studentCount = await prisma.examStudent.count({ where: { examId: id } });
  if (studentCount === 0) {
    throw Object.assign(
      new Error('Cannot approve an exam with no students assigned'),
      { status: 400 }
    );
  }

  // Validate all courses have question papers assigned
  const missingPapers = exam.examCourses.filter((ec: any) => !ec.questionPaperId);
  if (missingPapers.length > 0) {
    throw Object.assign(
      new Error(`Question papers must be assigned for all courses before approval. Missing for: ${missingPapers.map((ec: any) => ec.course.name).join(', ')}`),
      { status: 400 }
    );
  }

  // Validate exam date is not in the past
  const examDateOnly = new Date(exam.examDate);
  examDateOnly.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (examDateOnly < now) {
    throw Object.assign(
      new Error('Cannot approve exams with past dates'),
      { status: 400 }
    );
  }

  // Update exam status to APPROVED
  const updatedExam = await prisma.exam.update({
    where: { id },
    data: { status: 'APPROVED' },
    include: {
      branch: { select: { id: true, name: true } },
      examCourses: { include: { course: { select: { id: true, name: true } } } },
    }
  });

  // Auto-generate passwords for all students
  const generatedPasswords = await generateExamPasswords(id);

  return { exam: updatedExam, generatedPasswords };
};

export const assignQuestionPaper = async (examId: string, courseId: string, questionPaperId: string) =>
  prisma.examCourse.upsert({
    where:  { examId_courseId: { examId, courseId } },
    update: { questionPaperId },
    create: { examId, courseId, questionPaperId },
  });

export const getExamStudents = async (examId: string) => {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });

  // Use specifically selected students if stored
  const examStudents = await prisma.examStudent.findMany({
    where: { examId },
    include: {
      student: {
        select: {
          id: true, prn: true, firstName: true, lastName: true, phone: true,
          enrollments: { select: { course: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  if (examStudents.length > 0) {
    return examStudents.map((es: any) => es.student);
  }

  // Fallback for older exams without stored student list
  return prisma.student.findMany({
    where: { branchId: exam.branchId, isActive: true },
    select: {
      id: true, prn: true, firstName: true, lastName: true, phone: true,
      enrollments: { select: { course: { select: { id: true, name: true } } } },
    },
  });
};

export const generateExamPasswords = async (examId: string) => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      examCourses: { include: { course: { select: { id: true, name: true } } } },
    }
  });
  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });

  // Calculate 24-hour validity window
  const validFrom = new Date(exam.examDate);
  validFrom.setHours(0, 0, 0, 0);
  
  const validUntil = new Date(exam.examDate);
  validUntil.setHours(23, 59, 59, 999);

  const students = await (async () => {
    // Use specifically selected students if stored, otherwise fall back to all branch students
    const examStudents = await prisma.examStudent.findMany({
      where: { examId },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (examStudents.length > 0) {
      return examStudents.map((es: any) => es.student);
    }
    return prisma.student.findMany({
      where: { branchId: exam.branchId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });
  })();

  const { generateDailyPassword } = await import('../students/students.service.js');

  // Use allSettled to handle partial failures
  const results = await Promise.allSettled(
    students.map((s: any) => 
      generateDailyPassword(s.id, exam.examDate.toISOString())
        .then((pwd: any) => ({ 
          ...pwd, 
          studentId: s.id, 
          studentName: `${s.firstName} ${s.lastName}`,
          email: s.email,
          validFrom, 
          validUntil 
        }))
    )
  );

  const successful = results
    .map((r, i) => r.status === 'fulfilled' ? {
      ...r.value,
      studentName: `${students[i].firstName} ${students[i].lastName}`,
      validFrom,
      validUntil
    } : null)
    .filter(Boolean) as any[];

  const failed = results
    .map((r, i) => r.status === 'rejected' ? {
      studentId: students[i].id,
      studentName: `${students[i].firstName} ${students[i].lastName}`,
      error: (r.reason as Error).message
    } : null)
    .filter(Boolean);

  // Log password generation for audit trail
  for (const result of successful) {
    console.log(`[AUTH] Exam Passwords Debug - Student: ${result.studentId}, Date: ${validFrom.toISOString()}, Password: ${result.plainPassword}`);
    
    const credential = await prisma.studentCredential.findUnique({
      where: { studentId_examDate: { studentId: result.studentId, examDate: validFrom } }
    });
    
    if (credential) {
      await logPasswordGenerated(credential.id, result.studentId, validFrom);
    }
  }

  if (failed.length > 0) {
    throw Object.assign(
      new Error(`Generated passwords for ${successful.length} students, but ${failed.length} failed: ${failed.map((f: any) => f.studentName).join(', ')}`),
      { status: 207, data: { successful, failed } }
    );
  }

  return successful.map((s: any) => ({
    studentId: s.studentId,
    studentName: s.studentName,
    email: s.email,
    validFrom: s.validFrom,
    validUntil: s.validUntil,
    plain_password: s.plainPassword, // plain password for admin display at generation time
  }));
};

export const listResults = async (examId: string) => {
  const [exam, results] = await Promise.all([
    prisma.exam.findUnique({
      where: { id: examId },
      include: { examCourses: { include: { course: { select: { id: true, name: true } } } } },
    }),
    prisma.examResult.findMany({
      where: { examId },
      include: {
        student: { select: { id: true, prn: true, firstName: true, lastName: true, phone: true } },
      },
    }),
  ]);
  const courseName = (exam as any)?.examCourses?.[0]?.course?.name || 'N/A';
  return results.map((r: any) => ({ ...r, courseName }));
};

/**
 * Fetch generated passwords for an exam
 * Returns student names and passwords (for admin use only)
 * Only returns credentials that have been generated
 */
export const getExamPasswords = async (examId: string) => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      examCourses: { include: { course: { select: { id: true, name: true } } } },
    },
  });

  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });

  const isApproved = exam.status === 'APPROVED';

  // For approved exams, check the exam date is not in the past
  if (isApproved) {
    const examDateOnly = new Date(exam.examDate);
    examDateOnly.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (examDateOnly < now) {
      throw Object.assign(
        new Error('Cannot view passwords for past exam dates'),
        { status: 410 }
      );
    }
  }

  // Fetch specifically selected students if stored, else fall back to all branch students
  const examStudentLinks = await prisma.examStudent.findMany({
    where: { examId },
    include: { student: { select: { id: true, prn: true, firstName: true, lastName: true, email: true, phone: true } } },
  });

  const students = examStudentLinks.length > 0
    ? examStudentLinks.map((es: any) => es.student)
    : await prisma.student.findMany({
        where: { branchId: exam.branchId, isActive: true },
        select: { id: true, prn: true, firstName: true, lastName: true, email: true, phone: true },
      });

  // Fetch credentials only for approved exams
  const examDateOnly = new Date(exam.examDate);
  examDateOnly.setHours(0, 0, 0, 0);

  const credentials = isApproved
    ? await prisma.studentCredential.findMany({
        where: { examDate: examDateOnly },
        select: {
          id: true,
          studentId: true,
          passwordPlain: true,
          validFrom: true,
          validUntil: true,
          createdAt: true,
        },
      })
    : [];

  const { generateDailyPassword } = await import('../students/students.service.js');

  // Build password list with student info
  const passwordList = await Promise.all(students.map(async (student) => {
    let credential = isApproved
      ? credentials.find((c) => c.studentId === student.id)
      : undefined;
    
    // Simple auto-fix: if approved but password missing or null, generate it now
    if (isApproved && (!credential || !credential.passwordPlain)) {
       await generateDailyPassword(student.id, exam.examDate.toISOString());
       credential = await prisma.studentCredential.findUnique({
         where: { studentId_examDate: { studentId: student.id, examDate: examDateOnly } }
       }) as any;
    }

    return {
      studentId: student.id,
      prn: student.prn,
      studentName: `${student.firstName} ${student.lastName}`,
      email: student.email,
      phone: student.phone,
      password: credential?.passwordPlain || '—',
      generated: !!credential,
      validFrom: credential?.validFrom,
      validUntil: credential?.validUntil,
      generatedAt: credential?.createdAt,
    };
  }));

  return {
    examId,
    examDate: exam.examDate,
    courses: exam.examCourses.map((ec) => ec.course),
    totalStudents: students.length,
    passwordsGenerated: credentials.length,
    passwords: passwordList,
  };
};
