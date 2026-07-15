import { prisma } from '../../config/prisma.js';

export const getStats = async (branchId?: string, from?: string, to?: string) => {
  const dateFilter: any = {};
  if (from || to) {
    dateFilter.createdAt = {};
    if (from) dateFilter.createdAt.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.createdAt.lte = toDate;
    }
  }

  // studentWhere never filtered by date — total active students is always the full count
  const studentWhere: any = { isActive: true };
  if (branchId) studentWhere.branchId = branchId;

  const [totalStudents, enrolledStudents, passedExams, totalCertificates, pendingExams, approvedExams, revenueAgg, pendingFeesCount] = await Promise.all([
    // Total active students (no date filter — always current total)
    prisma.student.count({ where: studentWhere }),
    // Students with enrollments
    prisma.student.count({
      where: {
        ...studentWhere,
        enrollments: { some: {} },
      },
    }),
    // Students with grade A or B
    prisma.examResult.count({
      where: { grade: { in: ['A', 'B'] } },
    }),
    // Total certificates issued
    prisma.certificate.count({
      where: { status: 'ISSUED', ...(branchId ? { branchId } : {}) },
    }),
    // Pending exam requests
    prisma.exam.count({
      where: { status: 'PENDING', ...(branchId ? { branchId } : {}) },
    }),
    // Approved exams
    prisma.exam.count({
      where: { status: 'APPROVED', ...(branchId ? { branchId } : {}) },
    }),
    // Total revenue from paid payments only (filtered by date)
    prisma.payment.aggregate({
      _sum: { feeTaken: true },
      where: {
        paymentStatus: { in: ['FULL_PAID', 'PARTIAL_PAID'] },
        ...(branchId ? { enrollment: { branchId } } : {}),
        ...dateFilter,
      },
    }),
    // Enrollments with pending fees
    prisma.enrollment.count({
      where: {
        paymentStatus: { in: ['PENDING', 'PARTIAL_PAID'] },
        ...(branchId ? { branchId } : {}),
      },
    }),
  ]);

  return {
    totalStudents,
    activeStudents: enrolledStudents,
    enrolledStudents,
    passedExams,
    totalCertificates,
    pendingExams,
    approvedExams,
    totalRevenue: Number(revenueAgg._sum.feeTaken ?? 0),
    pendingFees: pendingFeesCount,
  };
};;

export const getPerformanceData = async (branchId?: string, from?: string, to?: string) => {
  const now = new Date();
  const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const end = to ? (() => { const d = new Date(to); d.setHours(23, 59, 59, 999); return d; })() : now;

  const where: any = { enrolledAt: { gte: start, lte: end } };
  if (branchId) where.branchId = branchId;

  const enrollments = await prisma.enrollment.findMany({
    where,
    select: { enrolledAt: true },
  });

  // Build list of year-month pairs within the range
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const result: { name: string; year: number; value: number }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    result.push({
      name: monthNames[m],
      year: y,
      value: enrollments.filter((e: { enrolledAt: Date }) => {
        const d = new Date(e.enrolledAt);
        return d.getFullYear() === y && d.getMonth() === m;
      }).length,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
};

export const getEnrollmentData = async (branchId?: string) => {
  const where: any = {};
  if (branchId) where.branchId = branchId;

  const grouped = await prisma.enrollment.groupBy({
    by: ['courseId'],
    where,
    _count: { courseId: true },
    orderBy: { _count: { courseId: 'desc' } },
    take: 6,
  });

  const colors = ['#0A3D4D', '#1A7A8E', '#2BAFC9', '#B0DDE8', '#4ECDC4', '#A8E6CF'];

  return Promise.all(grouped.map(async (g: any, i: number) => {
    const course = await prisma.course.findUnique({
      where: { id: g.courseId },
      select: { name: true },
    });
    return {
      name: course?.name ?? 'Unknown',
      value: g._count.courseId,
      color: colors[i % colors.length],
    };
  }));
};

export const getRecentStudents = async (
  branchId?: string,
  from?: string,
  to?: string,
  skip = 0,
  take = 8,
  search?: string
) => {
  const where: any = { isActive: true };
  if (branchId) where.branchId = branchId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to)   where.createdAt.lte = new Date(to);
  }
  if (search) {
    const terms = search.trim().split(/\s+/).filter(Boolean);
    where.AND = terms.map((term) => ({
      OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName:  { contains: term, mode: 'insensitive' } },
        { prn:       { contains: term, mode: 'insensitive' } },
        { enrollments: { some: { course: { name: { contains: term, mode: 'insensitive' } } } } },
      ],
    }));
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        enrollments: {
          include: { course: { select: { name: true } } },
          take: 1,
        },
      },
    }),
    prisma.student.count({ where }),
  ]);

  return { students, total };
};
