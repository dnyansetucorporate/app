import { prisma } from '../../config/prisma.js';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response.js';
import type { CertQuery } from './certificates.schema.js';

export const listCertificates = async (query: Record<string, unknown>, branchIdFilter?: string) => {
  const { page, limit, skip, take } = getPaginationParams(query);
  const q = query as unknown as CertQuery;

  // Use branchIdFilter if provided (for BRANCH_ADMIN)
  const effectiveBranchId = branchIdFilter || q.branchId;

  if (q.tab === 'branch') {
    const where: any = { isActive: true };
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
    if (effectiveBranchId) where.id = effectiveBranchId;

    const [total, branches] = await Promise.all([
      prisma.branch.count({ where }),
      prisma.branch.findMany({
        where,
        skip, take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, location: true, atpNo: true, branchCode: true, createdAt: true,
          certificates: { select: { status: true } },
          exams: {
            where: { status: 'APPROVED' },
            select: { examDate: true, status: true, examStudents: { select: { studentId: true } } },
          },
        },
      }),
    ]);

    const data = branches.map((b: any) => {
      // Latest approved exam date for this branch
      const approvedExams = (b.exams || []);
      const latestExam = [...approvedExams].sort((a: any, z: any) =>
        new Date(z.examDate).getTime() - new Date(a.examDate).getTime()
      )[0] ?? null;

      // Count unique students across all approved exams
      const uniqueStudentIds = new Set<string>();
      for (const exam of approvedExams) {
        for (const es of (exam.examStudents || [])) {
          uniqueStudentIds.add(es.studentId);
        }
      }
      const totalStudents = uniqueStudentIds.size;
      const passedStudents = b.certificates.filter((c: any) => c.status === 'ISSUED').length;

      return {
        id: b.id,
        branchName: b.name,
        location: b.location,
        branchCode: b.branchCode,
        atpNo: b.atpNo ?? `DYAN/ATP/${b.branchCode}`,
        createdDate: b.createdAt,
        examDate: latestExam?.examDate ?? null,
        numStudents: totalStudents,
        passedStudents,
        passedLabel: `${passedStudents}/${totalStudents}`,
      };
    });

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  // student tab (already issued certs)
  const where: any = { status: 'ISSUED' };
  if (effectiveBranchId) where.branchId = effectiveBranchId;
  if (q.search) {
    where.student = {
      OR: [
        { firstName: { contains: q.search, mode: 'insensitive' } },
        { lastName:  { contains: q.search, mode: 'insensitive' } },
        { prn:       { contains: q.search, mode: 'insensitive' } },
      ],
    };
  }

  const [total, certs] = await Promise.all([
    prisma.certificate.count({ where }),
    prisma.certificate.findMany({
      where, skip, take,
      orderBy: { issuedAt: 'desc' },
      include: {
        student: { select: { id: true, prn: true, firstName: true, lastName: true, phone: true } },
        branch:  { select: { id: true, name: true } },
      },
    }),
  ]);

  return { data: certs, meta: buildPaginationMeta(total, page, limit) };
};

// Generate certificate HTML template
export const generateCertificateTemplate = async (certificateId: string): Promise<string> => {
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, prn: true } },
      branch: { select: { id: true, name: true } },
    },
  });

  if (!cert) throw Object.assign(new Error('Certificate not found'), { status: 404 });

  const studentName = `${cert.student.firstName} ${cert.student.lastName}`;
  const issuedDate = new Date(cert.issuedAt!).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

  // Generate HTML certificate template
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate of Completion</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; }
    .certificate {
      width: 900px;
      height: 640px;
      background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
      border: 3px solid #C8102E;
      border-radius: 20px;
      padding: 60px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      position: relative;
      overflow: hidden;
    }
    .certificate::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 8px;
      background: linear-gradient(90deg, #C8102E, #FF6B6B, #C8102E);
    }
    .seal { position: absolute; top: 30px; right: 30px; width: 80px; height: 80px; }
    .seal svg { width: 100%; height: 100%; }
    .content { position: relative; z-index: 2; }
    .title { font-size: 48px; color: #1A2332; font-weight: bold; margin-bottom: 15px; letter-spacing: 2px; }
    .subtitle { font-size: 18px; color: #C8102E; margin-bottom: 40px; font-style: italic; }
    .award-text { font-size: 16px; color: #475569; margin-bottom: 30px; line-height: 1.6; }
    .student-name { font-size: 36px; color: #1A2332; font-weight: bold; margin: 30px 0; border-bottom: 2px solid #C8102E; padding-bottom: 15px; }
    .details { display: flex; justify-content: space-around; margin: 40px 0; font-size: 14px; color: #475569; }
    .detail-item { flex: 1; }
    .detail-label { font-size: 12px; color: #999; margin-bottom: 5px; }
    .detail-value { font-weight: bold; color: #1A2332; font-size: 16px; }
    .footer { margin-top: 40px; font-size: 12px; color: #999; }
    .branch-name { font-size: 14px; color: #1A2332; font-weight: bold; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="seal">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="none" stroke="#C8102E" stroke-width="2"/>
        <circle cx="50" cy="50" r="42" fill="none" stroke="#C8102E" stroke-width="1"/>
        <text x="50" y="55" text-anchor="middle" font-size="24" fill="#C8102E" font-weight="bold">✓</text>
      </svg>
    </div>
    
    <div class="content">
      <div class="title">CERTIFICATE</div>
      <div class="subtitle">of Achievement</div>
      
      <div class="award-text">
        This is to certify that
      </div>
      
      <div class="student-name">${studentName}</div>
      
      <div class="award-text">
        has successfully completed the examination and demonstrated proficiency in the subject matter.
      </div>
      
      <div class="details">
        <div class="detail-item">
          <div class="detail-label">PRN</div>
          <div class="detail-value">${cert.student.prn}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">SCORE</div>
          <div class="detail-value">${cert.marks}%</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">DATE</div>
          <div class="detail-value">${issuedDate}</div>
        </div>
      </div>
      
      <div class="footer">
        <p>Issued by: ${cert.branch.name}</p>
        <p class="branch-name">Education Platform</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return html;
};

export const getCertificateHTML = async (certificateId: string): Promise<string> => {
  return generateCertificateTemplate(certificateId);
};

export const getBranchCertStudents = async (branchId: string, query: Record<string, unknown>) => {
  const { page, limit, skip, take } = getPaginationParams(query);
  const search = query.search as string | undefined;

  // Get ALL approved exams for this branch (not just the latest one)
  const approvedExams = await prisma.exam.findMany({
    where: { branchId, status: 'APPROVED' },
    select: {
      id: true,
      examCourses: { select: { course: { select: { id: true, name: true } } }, take: 1 },
    },
  });

  if (!approvedExams.length) {
    return { certs: [], meta: buildPaginationMeta(0, page, limit) };
  }

  const examIds = approvedExams.map((e: any) => e.id);

  // Build a map from examId -> course for later lookup
  const examCourseMap = new Map<string, any>();
  for (const e of approvedExams) {
    examCourseMap.set(e.id, e.examCourses?.[0]?.course ?? null);
  }

  // Build student search filter
  const studentWhere: any = {};
  if (search) {
    const terms = search.trim().split(/\s+/).filter(Boolean);
    studentWhere.AND = terms.map((term) => ({
      OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName:  { contains: term, mode: 'insensitive' } },
        { prn:       { contains: term, mode: 'insensitive' } },
      ],
    }));
  }

  // Get all unique students across all approved exams for this branch
  const [total, students] = await Promise.all([
    prisma.student.count({
      where: { ...studentWhere, examStudents: { some: { examId: { in: examIds } } } },
    }),
    prisma.student.findMany({
      where: { ...studentWhere, examStudents: { some: { examId: { in: examIds } } } },
      skip, take,
      select: { id: true, prn: true, firstName: true, lastName: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  if (!students.length) {
    return { certs: [], meta: buildPaginationMeta(total, page, limit) };
  }

  const studentIds = students.map((s: any) => s.id);

  // For each student, get their exam assignment to know which exam/course they belong to
  const examStudentLinks = await prisma.examStudent.findMany({
    where: { examId: { in: examIds }, studentId: { in: studentIds } },
    select: { examId: true, studentId: true },
  });
  // Use first assignment per student to determine their course
  const studentExamMap = new Map<string, string>(); // studentId -> examId
  for (const es of examStudentLinks) {
    if (!studentExamMap.has(es.studentId)) studentExamMap.set(es.studentId, es.examId);
  }

  // Fetch exam results and issued certificates in parallel
  const [results, certificates] = await Promise.all([
    prisma.examResult.findMany({
      where: { examId: { in: examIds }, studentId: { in: studentIds } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.certificate.findMany({
      where: { branchId, studentId: { in: studentIds }, status: 'ISSUED' },
      include: { course: { select: { id: true, name: true } } },
      orderBy: { issuedAt: 'desc' },
    }),
  ]);

  // Keep only the latest result per student
  const resultMap = new Map<string, any>();
  for (const r of results) {
    if (!resultMap.has(r.studentId)) resultMap.set(r.studentId, r);
  }
  const certMap = new Map<string, any>();
  for (const c of certificates) {
    if (!certMap.has(c.studentId)) certMap.set(c.studentId, c);
  }

  const certs = students.map((student: any) => {
    const result = resultMap.get(student.id);
    const cert   = certMap.get(student.id);
    const examId = studentExamMap.get(student.id);
    const course = cert?.course ?? (examId ? examCourseMap.get(examId) : null);

    return {
      id:        cert?.id ?? student.id,
      certNo:    cert?.certNo ?? null,
      studentId: student.id,
      student,
      course,
      marks:     result?.marks ?? null,
      grade:     result?.grade ?? null,
      issuedAt:  cert?.issuedAt ?? null,
      examStatus: result
        ? (cert ? 'ISSUED' : 'PENDING')
        : 'NOT_APPEARED',
    };
  });

  return { certs, meta: buildPaginationMeta(total, page, limit) };
};

export const getCertificateById = async (id: string) => {
  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      student: true,
      branch: true,
      course: { select: { id: true, name: true } },
    },
  });
  if (!cert) throw Object.assign(new Error('Certificate not found'), { status: 404 });
  return cert;
};
