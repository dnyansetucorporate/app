/**
 * Audit Logging Utility
 * Tracks password views, validations, and other security-sensitive actions
 */

import { prisma } from '../config/prisma.js';
import type { Request } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';

export interface AuditLogEntry {
  action: string;
  studentCredentialId: string;
  studentId: string;
  examDate: Date;
  userId?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

/**
 * Log an audit event
 */
export const logAuditEvent = async (entry: AuditLogEntry) => {
  try {
    const details = entry.details ? JSON.stringify(entry.details) : null;

    await prisma.auditLog.create({
      data: {
        action: entry.action,
        studentCredentialId: entry.studentCredentialId,
        studentId: entry.studentId,
        examDate: entry.examDate,
        userId: entry.userId,
        userRole: entry.userRole,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        details,
      },
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit failures shouldn't block operations
  }
};

/**
 * Log password generation
 */
export const logPasswordGenerated = async (
  studentCredentialId: string,
  studentId: string,
  examDate: Date,
  req?: AuthRequest
) => {
  return logAuditEvent({
    action: 'PASSWORD_GENERATED',
    studentCredentialId,
    studentId,
    examDate,
    userId: req?.user?.sub,
    userRole: req?.user?.role,
    ipAddress: req?.ip,
    userAgent: req?.get('user-agent'),
  });
};

/**
 * Log password view by admin
 */
export const logPasswordViewed = async (
  studentCredentialId: string,
  studentId: string,
  examDate: Date,
  req?: AuthRequest
) => {
  return logAuditEvent({
    action: 'PASSWORD_VIEWED',
    studentCredentialId,
    studentId,
    examDate,
    userId: req?.user?.sub,
    userRole: req?.user?.role,
    ipAddress: req?.ip,
    userAgent: req?.get('user-agent'),
  });
};

/**
 * Log password validation attempt by student
 */
export const logPasswordValidated = async (
  studentCredentialId: string,
  studentId: string,
  examDate: Date,
  success: boolean,
  reason?: string
) => {
  return logAuditEvent({
    action: success ? 'PASSWORD_VALIDATED' : 'PASSWORD_VALIDATION_FAILED',
    studentCredentialId,
    studentId,
    examDate,
    details: {
      success,
      reason: reason || (success ? 'Valid password and within time window' : 'Invalid password or outside time window'),
    },
  });
};

/**
 * Get audit logs for a student credential
 */
export const getCredentialAuditLogs = async (studentCredentialId: string) => {
  return prisma.auditLog.findMany({
    where: { studentCredentialId },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Get audit logs for a student on exam date
 */
export const getStudentExamAuditLogs = async (studentId: string, examDate: Date) => {
  return prisma.auditLog.findMany({
    where: {
      studentId,
      examDate: {
        gte: new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate()),
        lt: new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate() + 1),
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Get audit logs by action type
 */
export const getAuditLogsByAction = async (
  action: string,
  startDate?: Date,
  endDate?: Date
) => {
  const where: any = { action };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
};
