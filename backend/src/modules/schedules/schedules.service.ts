import { prisma } from '../../config/prisma.js';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response.js';
import type { CreateScheduleDto, UpdateScheduleDto, ScheduleQuery } from './schedules.schema.js';

export const listSchedules = async (query: Record<string, unknown>, scopedBranchId?: string) => {
  const { page, limit, skip, take } = getPaginationParams(query);
  const q = query as unknown as ScheduleQuery;

  const where: Record<string, unknown> = { isActive: true };

  if (scopedBranchId) where.branchId = scopedBranchId;
  else if (q.branchId) where.branchId = q.branchId;

  if (q.courseId) where.courseId = q.courseId;
  if (q.dayOfWeek) where.dayOfWeek = q.dayOfWeek;

  const [total, schedules] = await Promise.all([
    prisma.schedule.count({ where }),
    prisma.schedule.findMany({
      where,
      skip,
      take,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: {
        branch: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { schedules, meta: buildPaginationMeta(total, page, limit) };
};

export const getScheduleById = async (id: string) => {
  const schedule = await prisma.schedule.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true } },
      course: { select: { id: true, name: true } },
    },
  });
  if (!schedule) throw Object.assign(new Error('Schedule not found'), { status: 404 });
  return schedule;
};

export const createSchedule = async (data: CreateScheduleDto) => {
  // Validate branch exists
  const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
  if (!branch) throw Object.assign(new Error('Branch not found'), { status: 404 });

  // Validate course exists
  const course = await prisma.course.findUnique({ where: { id: data.courseId } });
  if (!course) throw Object.assign(new Error('Course not found'), { status: 404 });

  // Check for duplicate schedule (same branch, course, and day)
  const existing = await prisma.schedule.findUnique({
    where: { branchId_courseId_dayOfWeek: { branchId: data.branchId, courseId: data.courseId, dayOfWeek: data.dayOfWeek } },
  });
  if (existing) {
    throw Object.assign(new Error('Schedule already exists for this course on this day'), { status: 409 });
  }

  return prisma.schedule.create({
    data: {
      branchId: data.branchId,
      courseId: data.courseId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
    },
    include: {
      branch: { select: { id: true, name: true } },
      course: { select: { id: true, name: true } },
    },
  });
};

export const updateSchedule = async (id: string, data: UpdateScheduleDto) => {
  const schedule = await prisma.schedule.findUnique({ where: { id } });
  if (!schedule) throw Object.assign(new Error('Schedule not found'), { status: 404 });

  return prisma.schedule.update({
    where: { id },
    data: {
      ...(data.dayOfWeek !== undefined && { dayOfWeek: data.dayOfWeek }),
      ...(data.startTime !== undefined && { startTime: data.startTime }),
      ...(data.endTime !== undefined && { endTime: data.endTime }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    include: {
      branch: { select: { id: true, name: true } },
      course: { select: { id: true, name: true } },
    },
  });
};

export const deleteSchedule = async (id: string) => {
  const schedule = await prisma.schedule.findUnique({ where: { id } });
  if (!schedule) throw Object.assign(new Error('Schedule not found'), { status: 404 });

  return prisma.schedule.delete({
    where: { id },
    include: {
      branch: { select: { id: true, name: true } },
      course: { select: { id: true, name: true } },
    },
  });
};

export const getBranchCourseSchedules = async (branchId: string, courseId: string) => {
  return prisma.schedule.findMany({
    where: { branchId, courseId, isActive: true },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
};

export const getBranchSchedules = async (branchId: string) => {
  // Group schedules by day of week
  const schedules = await prisma.schedule.findMany({
    where: { branchId, isActive: true },
    include: {
      course: { select: { id: true, name: true } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  const grouped = schedules.reduce((acc: any, schedule) => {
    if (!acc[schedule.dayOfWeek]) {
      acc[schedule.dayOfWeek] = [];
    }
    acc[schedule.dayOfWeek].push(schedule);
    return acc;
  }, {});

  return grouped;
};
