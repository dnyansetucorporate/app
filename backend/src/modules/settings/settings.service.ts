import { prisma } from '../../config/prisma.js';

export const clearDatabase = async (superAdminId: string) => {
  await prisma.$transaction(async (tx: any) => {
    // 1. Students — cascades: enrollments, payments, exam results,
    //    exam students, certificates, student credentials, audit logs
    await tx.student.deleteMany({});

    // 2. Exams — cascades: exam courses
    await tx.exam.deleteMany({});

    // 3. Branches — cascades: schedules
    await tx.branch.deleteMany({});

    // 4. Courses — cascades: question papers → questions
    await tx.course.deleteMany({});

    // 5. Non-super-admin users (branches already gone, no FK conflict)
    await tx.refreshToken.deleteMany({ where: { userId: { not: superAdminId } } });
    await tx.user.deleteMany({ where: { role: { not: 'SUPER_ADMIN' } } });
  });
};
