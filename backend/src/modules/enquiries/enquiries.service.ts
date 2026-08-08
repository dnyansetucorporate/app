import { prisma } from '../../config/prisma.js';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response.js';
import type { EnquiryQuery, CreateEnquiryDto, UpdateEnquiryDto, CreateFollowUpDto } from './enquiries.schema.js';

const buildEnquiryWhere = (q: EnquiryQuery, branchId?: string) => {
  const where: Record<string, unknown> = {};

  if (branchId) where.branchId = branchId;
  else if (q.branchId) where.branchId = q.branchId;

  if (q.search) {
    const terms = q.search.trim().split(/\s+/).filter(Boolean);
    where.AND = terms.map((term) => ({
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { contactNo: { contains: term, mode: 'insensitive' } },
        { courseEnrolledFor: { contains: term, mode: 'insensitive' } },
      ],
    }));
  }

  if (q.admissionTaken) where.admissionTaken = q.admissionTaken === 'true';

  return where;
};

export const listEnquiries = async (query: Record<string, unknown>, scopedBranchId?: string) => {
  const { page, limit, skip, take } = getPaginationParams(query);
  const q = query as unknown as EnquiryQuery;
  const where = buildEnquiryWhere(q, scopedBranchId);

  const [total, enquiries] = await Promise.all([
    prisma.enquiry.count({ where }),
    prisma.enquiry.findMany({
      where, skip, take,
      orderBy: { enquiryDate: 'desc' },
    }),
  ]);

  return { enquiries, meta: buildPaginationMeta(total, page, limit) };
};

export const getEnquiryById = async (id: string) => {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id },
    include: { followUps: { orderBy: { date: 'desc' } } },
  });
  if (!enquiry) throw Object.assign(new Error('Enquiry not found'), { status: 404 });
  return enquiry;
};

const assertBranchAccess = (enquiryBranchId: string, actorBranchId?: string) => {
  if (actorBranchId && enquiryBranchId !== actorBranchId) {
    throw Object.assign(new Error('Access denied: enquiry belongs to a different branch'), { status: 403 });
  }
};

export const createEnquiry = async (data: CreateEnquiryDto) => {
  if (!data.branchId) throw Object.assign(new Error('Branch is required'), { status: 400 });

  return prisma.enquiry.create({
    data: {
      branchId: data.branchId,
      name: data.name,
      contactNo: data.contactNo,
      source: data.source,
      courseEnrolledFor: data.courseEnrolledFor,
      enquiryDate: new Date(data.enquiryDate),
      address: data.address,
      education: data.education,
      dob: data.dob ? new Date(data.dob) : undefined,
      feeStructure: data.feeStructure,
      admissionTaken: data.admissionTaken,
      admissionDate: data.admissionDate ? new Date(data.admissionDate) : undefined,
      joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
      courseTime: data.courseTime,
      remark: data.remark,
    },
  });
};

export const updateEnquiry = async (id: string, data: UpdateEnquiryDto, actorBranchId?: string) => {
  const existing = await prisma.enquiry.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) throw Object.assign(new Error('Enquiry not found'), { status: 404 });
  assertBranchAccess(existing.branchId, actorBranchId);

  const { enquiryDate, dob, admissionDate, joiningDate, ...rest } = data;
  return prisma.enquiry.update({
    where: { id },
    data: {
      ...rest,
      ...(enquiryDate ? { enquiryDate: new Date(enquiryDate) } : {}),
      ...(dob ? { dob: new Date(dob) } : {}),
      ...(admissionDate ? { admissionDate: new Date(admissionDate) } : {}),
      ...(joiningDate ? { joiningDate: new Date(joiningDate) } : {}),
    },
  });
};

export const deleteEnquiry = async (id: string, actorBranchId?: string) => {
  const existing = await prisma.enquiry.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) throw Object.assign(new Error('Enquiry not found'), { status: 404 });
  assertBranchAccess(existing.branchId, actorBranchId);
  await prisma.enquiry.delete({ where: { id } });
};

export const addFollowUp = async (enquiryId: string, data: CreateFollowUpDto, actorBranchId?: string) => {
  const existing = await prisma.enquiry.findUnique({ where: { id: enquiryId }, select: { branchId: true } });
  if (!existing) throw Object.assign(new Error('Enquiry not found'), { status: 404 });
  assertBranchAccess(existing.branchId, actorBranchId);

  return prisma.enquiryFollowUp.create({
    data: { enquiryId, date: new Date(data.date), note: data.note },
  });
};
