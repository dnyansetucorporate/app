import { prisma } from '../../config/prisma.js';
import { sendWebsiteEnquiryNotification } from '../../utils/email.js';
import type { CreateStudentEnquiryDto, CreateFranchiseEnquiryDto } from './website-enquiries.schema.js';

export const createStudentEnquiry = async (data: CreateStudentEnquiryDto, ipAddress?: string) => {
  const enquiry = await prisma.websiteEnquiry.create({
    data: {
      type: 'STUDENT',
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      course: data.course,
      message: data.message,
      ipAddress,
    },
  });

  await sendWebsiteEnquiryNotification(enquiry);
  return enquiry;
};

export const createFranchiseEnquiry = async (data: CreateFranchiseEnquiryDto, ipAddress?: string) => {
  const enquiry = await prisma.websiteEnquiry.create({
    data: {
      type: 'FRANCHISE',
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      city: data.city,
      message: data.message,
      ipAddress,
    },
  });

  await sendWebsiteEnquiryNotification(enquiry);
  return enquiry;
};
