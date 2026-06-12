import { prisma } from '../../config/prisma.js';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response.js';
import { hashPassword } from '../auth/auth.service.js';
import type { CreateBranchDto, UpdateBranchDto, BranchQuery } from './branches.schema.js';

// ── Service Methods ────────────────────────────────────────────

export const listBranches = async (query: Record<string, unknown>) => {
  const { page, limit, skip, take } = getPaginationParams(query);
  const q = query as unknown as BranchQuery;

  const where: Record<string, unknown> = { isActive: true };
  if (q.search) {
    where.OR = [
      { name:       { contains: q.search, mode: 'insensitive' } },
      { branchCode: { contains: q.search, mode: 'insensitive' } },
      { location:   { contains: q.search, mode: 'insensitive' } },
      { admin:      { name: { contains: q.search, mode: 'insensitive' } } },
    ];
  }
  if (q.location) where.location = { contains: q.location, mode: 'insensitive' };
  if (q.from || q.to) {
    const createdAt: Record<string, Date> = {};
    if (q.from) createdAt.gte = new Date(q.from);
    if (q.to)   createdAt.lte = new Date(q.to);
    where.createdAt = createdAt;
  }

  const [total, branches] = await Promise.all([
    prisma.branch.count({ where }),
    prisma.branch.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      include: {
        admin:  { select: { id: true, name: true, email: true } },
        _count: { select: { students: true } },
      },
    }),
  ]);

  return { branches, meta: buildPaginationMeta(total, page, limit) };
};

export const getBranchStats = async () => {
  const [totalBranches, totalStudents] = await Promise.all([
    prisma.branch.count({ where: { isActive: true } }),
    prisma.student.count({ where: { isActive: true } }),
  ]);
  return { totalBranches, totalStudents };
};

export const getBranchById = async (id: string) => {
  const branch = await prisma.branch.findUnique({
    where: { id },
    include: {
      admin:  { select: { id: true, name: true, email: true } },
      _count: { select: { students: true, exams: true } },
    },
  });
  if (!branch) throw Object.assign(new Error('Branch not found'), { status: 404 });
  return branch;
};

export const createBranch = async (data: CreateBranchDto) => {
  // Validate unique email before transaction
  const existingUser = await prisma.user.findUnique({ where: { email: data.adminEmail } });
  if (existingUser) {
    throw Object.assign(new Error('Admin email already exists'), { status: 409 });
  }

  // Generate sequential branch code
  const lastBranch = await prisma.branch.findFirst({ orderBy: { branchCode: 'desc' } });
  const nextCode = lastBranch ? String(Number(lastBranch.branchCode) + 1) : '10001';

  const passwordHash = await hashPassword(data.adminPassword);

  try {
    return await prisma.$transaction(async (tx: any) => {
      // Create admin user
      const admin = await tx.user.create({
        data: {
          name:         data.adminName,
          email:        data.adminEmail,
          passwordHash,
          role:         'BRANCH_ADMIN',
        },
      });

      // Create branch
      return await tx.branch.create({
        data: {
          branchCode: nextCode,
          atpNo:      `DYAN/ATP/${nextCode}`,
          name:       data.name,
          address:    data.address,
          location:   data.location,
          ...(data.logo !== undefined && { logo: data.logo }),
          phone1:     data.phone1,
          phone2:     data.phone2,
          aadharNo:   data.aadharNo,
          ...(data.aadharImage !== undefined && { aadharImage: data.aadharImage }),
          panNo:      data.panNo,
          ...(data.panImage !== undefined && { panImage: data.panImage }),
          adminId:    admin.id,
        },
        include: { admin: { select: { id: true, name: true, email: true } } },
      });
    });
  } catch (error: any) {
    // Handle duplicate key errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'unknown field';
      throw Object.assign(new Error(`${field} already exists`), { status: 409 });
    }
    // Re-throw other errors
    throw error;
  }
};

export const updateBranch = async (id: string, data: UpdateBranchDto) =>
  prisma.branch.update({
    where: { id },
    data: {
      ...(data.name     && { name:     data.name }),
      ...(data.address  && { address:  data.address }),
      ...(data.location && { location: data.location }),
      ...(data.phone1   && { phone1:   data.phone1 }),
      ...(data.phone2   !== undefined && { phone2:   data.phone2 }),
      ...(data.aadharNo !== undefined && { aadharNo: data.aadharNo }),
      ...(data.panNo    !== undefined && { panNo:    data.panNo }),
      ...(data.logo         !== undefined && { logo:         data.logo }),
      ...(data.aadharImage  !== undefined && { aadharImage:  data.aadharImage }),
      ...(data.panImage     !== undefined && { panImage:     data.panImage }),
    },
    include: { admin: { select: { id: true, name: true, email: true } } },
  });

export const deleteBranch = async (id: string) => {
  const branch = await prisma.branch.findUnique({ where: { id }, select: { adminId: true } });
  if (!branch) throw Object.assign(new Error('Branch not found'), { status: 404 });

  await prisma.$transaction(async (tx: any) => {
    // 1. Delete students — cascades: enrollments, payments, exam results,
    //    exam students, certificates, student credentials, audit logs
    await tx.student.deleteMany({ where: { branchId: id } });

    // 2. Delete exams — cascades: exam courses
    await tx.exam.deleteMany({ where: { branchId: id } });

    // 3. Delete the branch — cascades: schedules
    await tx.branch.delete({ where: { id } });

    // 4. Delete the admin user (safe now that branch is gone)
    if (branch.adminId) {
      await tx.user.delete({ where: { id: branch.adminId } });
    }
  });
};
