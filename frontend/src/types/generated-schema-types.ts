// AUTO-COPIED - backend schema-inferred types (inlined for self-contained build)
// To regenerate: update these types to match backend schema changes.

export type LoginDto = {
  identifier: string;
  password: string;
};

export type CreateBranchDto = {
  name: string;
  address: string;
  location: string;
  phone1: string;
  phone2?: string;
  aadharNo?: string;
  aadharImage?: string;
  panNo?: string;
  panImage?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminDob?: string;
  logo?: string;
};

export type UpdateBranchDto = Partial<Omit<CreateBranchDto, 'adminPassword' | 'adminEmail'>>;

export type BranchQuery = {
  page: number;
  limit: number;
  search?: string;
  location?: string;
  from?: string;
  to?: string;
};

export type CertQuery = {
  page: number;
  limit: number;
  tab: 'branch' | 'student';
  branchId?: string;
  search?: string;
};

export type CreateCourseDto = {
  name: string;
  description?: string;
};

export type CreateQuestionPaperDto = {
  title: string;
};

export type AddQuestionDto = {
  questionNo: number;
  questionText: string;
  options: string[];
  correctOption: number;
};

export type CreateExamDto = {
  branchId: string;
  examDate: string;
  notes?: string;
  numStudents: number;
  studentIds?: string[];
  courses?: { courseId: string; questionPaperId?: string }[];
};

export type UpdateExamDto = {
  examDate?: string;
  notes?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
};

export type ExamQuery = {
  page: number;
  limit: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  branchId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ExamParams = {
  examId: string;
  courseId?: string;
};

export type SubmitExamBody = {
  answers: Record<string, number>;
};

export type StudentQuery = {
  page: number;
  limit: number;
  search?: string;
  branchId?: string;
  courseId?: string;
  paymentStatus?: 'FULL_PAID' | 'PARTIAL_PAID' | 'PENDING';
};

export type CreateStudentDto = {
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  dob?: string;
  branchId: string;
  photo?: string;
};

export type StatsQuery = {
  branchId?: string;
  from?: string;
  to?: string;
};

export type PerformanceQuery = {
  branchId?: string;
  year?: string;
};

export type EnrollmentQuery = {
  branchId?: string;
};

export type RecentStudentsQuery = {
  branchId?: string;
};
