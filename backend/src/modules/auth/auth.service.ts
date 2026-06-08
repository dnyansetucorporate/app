import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';
import { config } from '../../config/index.js';
import { signToken } from '../../utils/jwt.js';
import type { JwtPayload } from '../../utils/jwt.js';
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';

// ── Types ──────────────────────────────────────────────────────

export interface LoginPayload {
  identifier: string; // email or PRN
  password: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string | null;
    studentId?: string;
  };
}

// ── Service Methods ────────────────────────────────────────────

/**
 * Validates credentials and returns a signed JWT.
 * Supports Email login for Admins and Email/PRN login for Students.
 * Students must use a password valid for the current date.
 */
export const loginUser = async (payload: LoginPayload): Promise<LoginResult> => {
  const { identifier, password } = payload;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Try to find a User record (Admins or Students with User accounts)
  const user = await prisma.user.findUnique({ where: { email: identifier } });

  if (user && user.isActive) {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    let branchId: string | undefined;
    if (user.role === 'BRANCH_ADMIN') {
      const branch = await prisma.branch.findUnique({ where: { adminId: user.id }, select: { id: true } });
      branchId = branch?.id;
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      ...(branchId ? { branchId } : {}),
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        ...(branchId ? { branchId } : {}),
      },
    };
  }

  // 2. If no User found, check for a Student login via PRN + Daily Password
  const student = await prisma.student.findUnique({
    where: { prn: identifier },
    include: {
      credentials: {
        where: { examDate: today },
        take: 1,
      },
    },
  });

  if (!student || !student.isActive || student.credentials.length === 0) {
    throw Object.assign(new Error('Invalid credentials or no active exam password for today'), { status: 401 });
  }

  const credential = student.credentials[0];
  const valid = await bcrypt.compare(password, credential.passwordHash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const token = signToken({
    sub: student.id, // Using student.id as sub for student tokens
    email: student.email ?? '',
    role: 'STUDENT',
    studentId: student.id,
    branchId: student.branchId,
  });

  return {
    token,
    user: {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      email: student.email ?? '',
      role: 'STUDENT',
      avatar: student.photo,
      studentId: student.id,
    },
  };
};

/**
 * Looks up a user by id and returns a sanitised profile.
 * Throws 404 if not found.
 */
export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
  });
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  if (user.role === 'BRANCH_ADMIN') {
    const branch = await prisma.branch.findUnique({ where: { adminId: userId }, select: { id: true } });
    return { ...user, branchId: branch?.id };
  }
  return user;
};

/**
 * Returns a sanitised profile object based on the JWT payload.
 * For `STUDENT` role, loads the student record; otherwise loads a User.
 */
export const getProfileFromPayload = async (payload: JwtPayload) => {
  if (!payload || !payload.sub) throw Object.assign(new Error('Unauthorized'), { status: 401 });

  if (payload.role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        photo: true,
        branchId: true,
        createdAt: true,
      },
    });
    if (!student) throw Object.assign(new Error('User not found'), { status: 404 });
    return {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      email: student.email,
      role: 'STUDENT',
      avatar: student.photo,
      createdAt: student.createdAt,
      studentId: student.id,
      branchId: student.branchId,
    };
  }

  // Default to user lookup for admin roles
  return getProfile(payload.sub);
};

/**
 * Hashes a raw password. Centralised so the cost factor comes from config.
 */
export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, config.bcryptRounds);

/**
 * Generate a secure random refresh token, persist its hash and return the plain token.
 * Caps active tokens per user at 5; revokes the oldest when the limit is exceeded.
 */
export const generateRefreshToken = async (userId: string, ttlDays = 30): Promise<string> => {
  const token = crypto.randomBytes(64).toString('hex');
  const tokenHash = await bcryptjs.hash(token, config.bcryptRounds);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  const MAX_TOKENS_PER_USER = 5;
  const activeTokens = await prisma.refreshToken.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'asc' },
  });

  if (activeTokens.length >= MAX_TOKENS_PER_USER) {
    const toRevoke = activeTokens.slice(0, activeTokens.length - MAX_TOKENS_PER_USER + 1);
    await prisma.refreshToken.updateMany({
      where: { id: { in: toRevoke.map((t: any) => t.id) } },
      data: { revokedAt: new Date() },
    });
  }

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return token;
};

/**
 * Verifies a refresh token string and returns the associated DB record if valid.
 */
export const verifyRefreshToken = async (token: string) => {
  if (!token) throw Object.assign(new Error('Refresh token missing'), { status: 401 });
  const tokens = await prisma.refreshToken.findMany({ where: { revokedAt: null } });
  // Compare token against hashes (linear scan — acceptable for small scale; consider indexed fingerprint in prod)
  for (const rec of tokens) {
    const ok = await bcryptjs.compare(token, rec.tokenHash);
    if (ok) {
      if (rec.expiresAt < new Date()) throw Object.assign(new Error('Refresh token expired'), { status: 401 });
      return rec;
    }
  }
  throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
};

export const revokeRefreshToken = async (id: string) => {
  await prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
};
