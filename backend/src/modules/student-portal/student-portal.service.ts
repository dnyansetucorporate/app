import { prisma } from '../../config/prisma.js';
import { generateCertNo } from '../../utils/certNumber.js';
import { computeGrade } from '../../utils/grade.js';

export const getAvailableExams = async (studentId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { enrollments: { select: { courseId: true, paymentStatus: true } } },
  });

  if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

  // Check if student has at least one FULL_PAID enrollment
  const hasFullPayment = student.enrollments.some((e: any) => e.paymentStatus === 'FULL_PAID');
  if (!hasFullPayment) {
    throw Object.assign(new Error('Only students with full payment are eligible for exams'), { status: 403 });
  }

  const enrolledCourseIds = student.enrollments
    .filter((e: any) => e.paymentStatus === 'FULL_PAID')
    .map((e: any) => e.courseId);

  // Find exams scheduled for TODAY only that this student is specifically assigned to
  const exams = await prisma.exam.findMany({
    where: {
      branchId: student.branchId,
      examDate: { gte: today, lt: tomorrow },
      status: 'APPROVED',
      examCourses: {
        some: { courseId: { in: enrolledCourseIds } },
      },
      examStudents: {
        some: { studentId },
      },
    },
    include: {
      examCourses: {
        where: { courseId: { in: enrolledCourseIds } },
        include: {
          course: { select: { id: true, name: true } },
          questionPaper: {
            select: {
              id: true,
              title: true,
              durationMinutes: true,
              _count: { select: { questions: true } }
            }
          },
        },
      },
    },
  });

  // Get results to check completion status
  const results = await prisma.examResult.findMany({
    where: { 
      studentId, 
      examId: { in: exams.map(e => e.id) } 
    }
  });

  return {
    student: {
      name: `${student.firstName} ${student.lastName}`,
      prn: student.prn
    },
    exams: exams.map(exam => {
      const isCompleted = results.some(r => r.examId === exam.id);

      return {
        ...exam,
        isCompleted,
        examCourses: exam.examCourses.map((examCourse) => ({
          ...examCourse,
          durationMinutes: examCourse.questionPaper?.durationMinutes ?? 90,
          totalQuestions: examCourse.questionPaper?._count?.questions ?? 0,
        })),
      };
    })
  };
};

export const getExamQuestions = async (examId: string, courseId: string, studentId: string) => {
  // Verify the student is assigned to this exam
  const membership = await prisma.examStudent.findUnique({
    where: { examId_studentId: { examId, studentId } },
  });
  if (!membership) {
    throw Object.assign(new Error('You are not assigned to this exam'), { status: 403 });
  }

  const examCourse = await prisma.examCourse.findUnique({
    where: { examId_courseId: { examId, courseId } },
    include: {
      questionPaper: {
        include: {
          questions: {
            orderBy: { questionNo: 'asc' },
            select: {
              id: true,
              questionNo: true,
              questionText: true,
              options: true,
            },
          },
        },
      },
    },
  });

  if (!examCourse || !examCourse.questionPaper) {
    throw Object.assign(new Error('Question paper not found for this exam'), { status: 404 });
  }

  return {
    examId,
    courseId,
    title: examCourse.questionPaper.title,
    durationMinutes: examCourse.questionPaper.durationMinutes,
    questions: examCourse.questionPaper.questions,
  };
};

export const submitExamResult = async (studentId: string, examId: string, answers: Record<string, number>) => {
  // 1. Fetch the exam and the correct answers
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      examCourses: {
        include: {
          questionPaper: {
            include: { questions: true },
          },
        },
      },
    },
  });

  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });

  // 1.5. Validate exam date is today (prevent submissions outside exam date)
  const now = new Date();
  const examDateStart = new Date(exam.examDate);
  examDateStart.setHours(0, 0, 0, 0);
  const examDateEnd = new Date(exam.examDate);
  examDateEnd.setHours(23, 59, 59, 999);

  if (now < examDateStart || now > examDateEnd) {
    throw Object.assign(new Error('Exam can only be submitted on the scheduled exam date'), { status: 410 });
  }

  let totalQuestions = 0;
  let correctAnswers = 0;

  exam.examCourses.forEach((ec: any) => {
    if (ec.questionPaper) {
      ec.questionPaper.questions.forEach((q: any) => {
        totalQuestions++;
        if (answers[q.id] === q.correctOption) {
          correctAnswers++;
        }
      });
    }
  });

  const rawMarks = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const marks = Math.min(100, Math.max(0, rawMarks)); // clamp to 0–100
  const grade = computeGrade(marks);

  // 2. Check for existing submission (duplicate submit)
  const existingResult = await prisma.examResult.findUnique({
    where: { examId_studentId: { examId, studentId } },
  });
  if (existingResult) {
    throw Object.assign(
      new Error('You have already submitted this exam'),
      { status: 409 }
    );
  }

  // 3. Save result
  const result = await prisma.examResult.create({
    data: { examId, studentId, marks, grade },
  });

  // 4. Auto-issue certificate for all grades — verify enrollment is still FULL_PAID
  if (grade) {
    const examCourseIds = exam.examCourses.map((ec: any) => ec.courseId);
    const paidEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        courseId: { in: examCourseIds },
        paymentStatus: 'FULL_PAID',
      },
    });

    if (paidEnrollment) {
      const issuedAt = new Date();
      // Retry to resolve rare certNo collisions guarded by the unique constraint
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const certNo = await generateCertNo(exam.branchId, issuedAt);
          await prisma.certificate.create({
            data: {
              certNo,
              studentId,
              branchId: exam.branchId,
              courseId: paidEnrollment.courseId,
              examDate: exam.examDate,
              marks,
              status: 'ISSUED',
              issuedAt,
            },
          });
          break;
        } catch (err: any) {
          if (err?.code === 'P2002' && attempt < 4) continue;
          throw err;
        }
      }
    }
  }

  return { result, marks, grade };
};
