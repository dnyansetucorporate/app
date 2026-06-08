import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response.js';
import type { CreatePaymentDto, UpdatePaymentDto, PaymentQuery } from './payments.schema.js';

export const listPayments = async (query: Record<string, unknown>, scopedBranchId?: string) => {
  const { page, limit, skip, take } = getPaginationParams(query);
  const q = query as unknown as PaymentQuery;

  const where: Record<string, unknown> = {};

  // Filter by enrollment relationship
  if (q.enrollmentId) {
    where.enrollmentId = q.enrollmentId;
  }

  // Filter by student through enrollment
  if (q.studentId) {
    where.enrollment = {
      studentId: q.studentId,
    };
  }

  // Filter by course through enrollment
  if (q.courseId) {
    where.enrollment = {
      ...(where.enrollment || {}),
      courseId: q.courseId,
    };
  }

  // Filter by payment status
  if (q.paymentStatus) {
    where.paymentStatus = q.paymentStatus;
  }

  // Filter by date range
  if (q.from || q.to) {
    const createdAt: Record<string, Date> = {};
    if (q.from) createdAt.gte = new Date(q.from);
    if (q.to) createdAt.lte = new Date(q.to);
    where.createdAt = createdAt;
  }

  // Apply branch scoping if needed
  if (scopedBranchId) {
    where.enrollment = {
      ...(where.enrollment || {}),
      branchId: scopedBranchId,
    };
  }

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        enrollment: {
          include: {
            student: { select: { id: true, prn: true, firstName: true, lastName: true, email: true } },
            course: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  return { payments, meta: buildPaginationMeta(total, page, limit) };
};

export const getPaymentById = async (id: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      enrollment: {
        include: {
          student: true,
          course: true,
          branch: { include: { admin: { select: { email: true } } } },
        },
      },
    },
  });
  if (!payment) throw Object.assign(new Error('Payment not found'), { status: 404 });
  return payment;
};

export const createPayment = async (data: CreatePaymentDto) => {
  // Validate enrollment exists
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: data.enrollmentId },
    include: {
      student: true,
      course: true,
      branch: true,
    },
  });
  if (!enrollment) throw Object.assign(new Error('Enrollment not found'), { status: 404 });

  // Validate fee taken is positive
  if (data.feeTaken <= 0) {
    throw Object.assign(new Error('Fee taken must be greater than 0'), { status: 400 });
  }

  // Calculate total already paid for this enrollment
  const paidPayments = await prisma.payment.findMany({
    where: { enrollmentId: data.enrollmentId },
  });
  
  const totalPaid = paidPayments.reduce((sum, p) => sum + Number(p.feeTaken), 0);
  const newTotal = totalPaid + data.feeTaken;

  // Validate total doesn't exceed course fee
  if (newTotal > Number(enrollment.courseFee)) {
    throw Object.assign(
      new Error(
        `Total payment (₹${newTotal}) exceeds course fee (₹${Number(enrollment.courseFee)}). ` +
        `Remaining balance: ₹${Number(enrollment.courseFee) - totalPaid}`
      ),
      { status: 400 }
    );
  }

  // Determine payment status
  let paymentStatus: 'FULL_PAID' | 'PARTIAL_PAID' | 'PENDING' = 'PENDING';
  if (newTotal === Number(enrollment.courseFee)) {
    paymentStatus = 'FULL_PAID';
  } else if (newTotal > 0) {
    paymentStatus = 'PARTIAL_PAID';
  }

  const payment = await prisma.payment.create({
    data: {
      enrollmentId: data.enrollmentId,
      feeTaken: new Prisma.Decimal(data.feeTaken),
      courseFee: enrollment.courseFee,
      paymentStatus,
      paidAt: paymentStatus === 'FULL_PAID' ? new Date() : null,
      nextInstallmentDate: data.nextInstallmentDate ? new Date(data.nextInstallmentDate) : null,
    },
    include: {
      enrollment: {
        include: {
          student: { select: { id: true, prn: true, firstName: true, lastName: true } },
          course: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Update enrollment status if full paid
  if (paymentStatus === 'FULL_PAID') {
    await prisma.enrollment.update({
      where: { id: data.enrollmentId },
      data: { paymentStatus: 'FULL_PAID' },
    });
  } else if (paymentStatus === 'PARTIAL_PAID') {
    await prisma.enrollment.update({
      where: { id: data.enrollmentId },
      data: { paymentStatus: 'PARTIAL_PAID' },
    });
  }

  return payment;
};

export const updatePayment = async (id: string, data: UpdatePaymentDto) => {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { enrollment: true },
  });
  if (!payment) throw Object.assign(new Error('Payment not found'), { status: 404 });

  // Validate fee taken if provided
  if (data.feeTaken !== undefined && data.feeTaken <= 0) {
    throw Object.assign(new Error('Fee taken must be greater than 0'), { status: 400 });
  }

  // If updating fee taken, validate new total doesn't exceed course fee
  if (data.feeTaken !== undefined) {
    const otherPayments = await prisma.payment.findMany({
      where: {
        enrollmentId: payment.enrollmentId,
        id: { not: id },
      },
    });
    
    const otherTotal = otherPayments.reduce((sum, p) => sum + Number(p.feeTaken), 0);
    const newTotal = otherTotal + data.feeTaken;

    if (newTotal > Number(payment.courseFee)) {
      throw Object.assign(
        new Error(
          `Total payment (₹${newTotal}) exceeds course fee (₹${Number(payment.courseFee)}). ` +
          `Remaining balance: ₹${Number(payment.courseFee) - otherTotal}`
        ),
        { status: 400 }
      );
    }
  }

  const updatedPayment = await prisma.payment.update({
    where: { id },
    data: {
      ...(data.feeTaken !== undefined && { feeTaken: new Prisma.Decimal(data.feeTaken) }),
      ...(data.paymentStatus !== undefined && {
        paymentStatus: data.paymentStatus,
        paidAt: data.paymentStatus === 'FULL_PAID' ? new Date() : null,
      }),
      ...(data.nextInstallmentDate !== undefined && {
        nextInstallmentDate: data.nextInstallmentDate ? new Date(data.nextInstallmentDate) : null,
      }),
    },
    include: {
      enrollment: {
        include: {
          student: { select: { id: true, prn: true, firstName: true, lastName: true } },
          course: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
        },
      },
    },
  });

  return updatedPayment;
};

export const deletePayment = async (id: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { enrollment: true },
  });
  if (!payment) throw Object.assign(new Error('Payment not found'), { status: 404 });

  await prisma.payment.delete({
    where: { id },
  });

  // Recalculate enrollment payment status
  const remainingPayments = await prisma.payment.findMany({
    where: { enrollmentId: payment.enrollmentId },
  });

  const totalPaid = remainingPayments.reduce((sum, p) => sum + Number(p.feeTaken), 0);
  const courseFee = Number(payment.courseFee);

  let newStatus: 'FULL_PAID' | 'PARTIAL_PAID' | 'PENDING' = 'PENDING';
  if (totalPaid === courseFee) {
    newStatus = 'FULL_PAID';
  } else if (totalPaid > 0) {
    newStatus = 'PARTIAL_PAID';
  }

  await prisma.enrollment.update({
    where: { id: payment.enrollmentId },
    data: { paymentStatus: newStatus },
  });

  return payment;
};

export const getStudentPayments = async (studentId: string) => {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

  // Get all enrollments for the student
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: {
      course: true,
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // Calculate summary for each enrollment
  const enrollmentSummaries = enrollments.map((enrollment) => {
    const totalPaid = enrollment.payments.reduce((sum, p) => sum + Number(p.feeTaken), 0);
    const courseFee = Number(enrollment.courseFee);
    const remainingBalance = courseFee - totalPaid;

    return {
      enrollmentId: enrollment.id,
      courseName: enrollment.course.name,
      courseFee,
      totalPaid,
      remainingBalance,
      paymentStatus: enrollment.paymentStatus,
      payments: enrollment.payments.map((p) => ({
        id: p.id,
        feeTaken: Number(p.feeTaken),
        paymentStatus: p.paymentStatus,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
    };
  });

  // Overall summary
  const totalCourseFees = enrollmentSummaries.reduce((sum, e) => sum + e.courseFee, 0);
  const totalPaidAllCourses = enrollmentSummaries.reduce((sum, e) => sum + e.totalPaid, 0);
  const totalRemainingBalance = enrollmentSummaries.reduce((sum, e) => sum + e.remainingBalance, 0);

  return {
    enrollmentSummaries,
    summary: {
      totalCourseFees,
      totalPaidAllCourses,
      totalRemainingBalance,
      overallStatus:
        totalPaidAllCourses === 0
          ? 'PENDING'
          : totalPaidAllCourses === totalCourseFees
            ? 'FULL_PAID'
            : 'PARTIAL_PAID',
    },
  };
};
