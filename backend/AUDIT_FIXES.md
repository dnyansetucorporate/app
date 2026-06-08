# Backend Audit - Actionable Fixes & Code Examples

---

## CRITICAL: Plaintext Password Storage

### Current Problem
```typescript
// src/modules/students/students.service.ts - Line 145
export const generateDailyPassword = async (studentId: string, examDate: string) => {
  const plainPassword = Math.floor(100000 + Math.random() * 900000).toString();
  const passwordHash = await bcrypt.hash(plainPassword, config.bcryptRounds);

  await prisma.studentCredential.upsert({
    where: { studentId_examDate: { studentId, examDate: date } },
    update: { passwordHash, plainPassword },  // ❌ STORING PLAINTEXT!
    create: { studentId, examDate: date, passwordHash, plainPassword },
  });

  return { studentId, date, plainPassword };
};
```

### Prisma Schema Issue
```prisma
// prisma/schema.prisma - Line 95
model StudentCredential {
  id            String   @id @default(cuid())
  studentId     String
  examDate      DateTime
  passwordHash  String
  plainPassword String   // ❌ REMOVE THIS FIELD
  createdAt     DateTime @default(now())
  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  @@unique([studentId, examDate])
  @@map("student_credentials")
}
```

### Fix Steps

**Step 1: Create Migration**
```bash
cd backend
npx prisma migrate dev --name remove_plain_password_from_student_credentials
```

**Step 2: Update Schema**
```prisma
model StudentCredential {
  id            String   @id @default(cuid())
  studentId     String
  examDate      DateTime
  passwordHash  String
  displayedAt   DateTime? // Track when password was shown
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  
  @@unique([studentId, examDate])
  @@map("student_credentials")
}
```

**Step 3: Update Service**
```typescript
export const generateDailyPassword = async (studentId: string, examDate: string) => {
  const date = new Date(examDate);
  date.setHours(0, 0, 0, 0);

  // Generate a random 6-digit password (temporary)
  const plainPassword = Math.floor(100000 + Math.random() * 900000).toString();
  const passwordHash = await bcrypt.hash(plainPassword, config.bcryptRounds);

  // Store ONLY the hash and display timestamp
  const credential = await prisma.studentCredential.upsert({
    where: { studentId_examDate: { studentId, examDate: date } },
    update: { passwordHash, displayedAt: new Date() },
    create: { studentId, examDate: date, passwordHash, displayedAt: new Date() },
  });

  // Return plaintext ONLY for immediate display to admin
  // This password should be logged/printed immediately, never stored
  return { 
    studentId, 
    date, 
    plainPassword,  // ⚠️ This is only for display, never re-display from DB
    message: 'Password can only be displayed once. If lost, regenerate.' 
  };
};

// New method to get credential for authentication only
export const verifyStudentPassword = async (studentId: string, examDate: string, password: string) => {
  const date = new Date(examDate);
  date.setHours(0, 0, 0, 0);

  const credential = await prisma.studentCredential.findUnique({
    where: { studentId_examDate: { studentId, examDate: date } },
  });

  if (!credential) return false;
  
  return bcrypt.compare(password, credential.passwordHash);
};
```

---

## CRITICAL: Missing Enrollments Module

### Create Full Enrollments Module

**File: `src/modules/enrollments/enrollments.routes.ts`**
```typescript
import { Router } from 'express';
import { list, get, create, update, remove } from './enrollments.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole, scopeBranch } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createEnrollmentSchema, updateEnrollmentSchema, enrollmentQuerySchema } from './enrollments.schema.js';

const router = Router();
router.use(authenticate);

router.get('/',
  scopeBranch,
  validate(enrollmentQuerySchema, 'query'),
  list
);

router.get('/:id', get);

router.post('/',
  requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'),
  validate(createEnrollmentSchema),
  create
);

router.patch('/:id',
  requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'),
  validate(updateEnrollmentSchema),
  update
);

router.delete('/:id',
  requireRole('SUPER_ADMIN'),
  remove
);

export default router;
```

**File: `src/modules/enrollments/enrollments.controller.ts`**
```typescript
import { Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  listEnrollments,
  getEnrollmentById,
  createEnrollment,
  updateEnrollment,
  removeEnrollment,
} from './enrollments.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

export const list = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const scopedBranch = req.user?.role === 'BRANCH_ADMIN' ? req.user.branchId : undefined;
  const { enrollments, meta } = await listEnrollments(req.query as Record<string, unknown>, scopedBranch);
  sendSuccess(res, enrollments, 'Enrollments fetched', 200, meta);
});

export const get = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const enrollment = await getEnrollmentById(req.params.id as string);
  sendSuccess(res, enrollment);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const enrollment = await createEnrollment(req.body);
  sendSuccess(res, enrollment, 'Enrollment created', 201);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const enrollment = await updateEnrollment(req.params.id as string, req.body);
  sendSuccess(res, enrollment, 'Enrollment updated');
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  await removeEnrollment(req.params.id as string);
  sendSuccess(res, null, 'Enrollment deleted');
});
```

**File: `src/modules/enrollments/enrollments.service.ts`**
```typescript
import { prisma } from '../../config/prisma.js';
import { getPaginationParams, buildPaginationMeta } from '../../utils/response.js';
import type { CreateEnrollmentDto, UpdateEnrollmentDto, EnrollmentQuery } from './enrollments.schema.js';

export const listEnrollments = async (query: Record<string, unknown>, scopedBranchId?: string) => {
  const { page, limit, skip, take } = getPaginationParams(query);
  const q = query as unknown as EnrollmentQuery;

  const where: Record<string, unknown> = {};
  if (scopedBranchId) where.branchId = scopedBranchId;
  else if (q.branchId) where.branchId = q.branchId;
  if (q.studentId) where.studentId = q.studentId;
  if (q.courseId) where.courseId = q.courseId;
  if (q.paymentStatus) where.paymentStatus = q.paymentStatus;

  const [total, enrollments] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where, skip, take,
      orderBy: { enrolledAt: 'desc' },
      include: {
        student: { select: { id: true, prn: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { enrollments, meta: buildPaginationMeta(total, page, limit) };
};

export const getEnrollmentById = async (id: string) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id },
    include: {
      student: true,
      course: true,
      branch: true,
    },
  });
  if (!enrollment) throw Object.assign(new Error('Enrollment not found'), { status: 404 });
  return enrollment;
};

export const createEnrollment = async (data: CreateEnrollmentDto) => {
  // Validate student exists and is active
  const student = await prisma.student.findUnique({ where: { id: data.studentId } });
  if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });
  if (!student.isActive) throw Object.assign(new Error('Student is inactive'), { status: 400 });

  // Validate course exists and is active
  const course = await prisma.course.findUnique({ where: { id: data.courseId } });
  if (!course) throw Object.assign(new Error('Course not found'), { status: 404 });
  if (!course.isActive) throw Object.assign(new Error('Course is inactive'), { status: 400 });

  // Validate branch match
  if (data.branchId !== student.branchId) {
    throw Object.assign(new Error('Student branch does not match enrollment branch'), { status: 400 });
  }

  // Check if already enrolled
  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: data.studentId, courseId: data.courseId } },
  });
  if (existing) throw Object.assign(new Error('Student already enrolled in this course'), { status: 409 });

  return prisma.enrollment.create({
    data: {
      studentId: data.studentId,
      courseId: data.courseId,
      branchId: data.branchId,
      paymentStatus: data.paymentStatus,
    },
    include: {
      student: { select: { id: true, prn: true, firstName: true, lastName: true } },
      course: { select: { id: true, name: true } },
    },
  });
};

export const updateEnrollment = async (id: string, data: UpdateEnrollmentDto) => {
  // Validate payment status transitions
  const enrollment = await prisma.enrollment.findUnique({ where: { id } });
  if (!enrollment) throw Object.assign(new Error('Enrollment not found'), { status: 404 });

  if (data.paymentStatus) {
    // Payment can only move forward: PENDING → PARTIAL_PAID → FULL_PAID
    const validTransitions: Record<string, string[]> = {
      PENDING: ['PARTIAL_PAID', 'FULL_PAID'],
      PARTIAL_PAID: ['FULL_PAID'],
      FULL_PAID: ['FULL_PAID'], // Can't go back
    };
    
    const allowed = validTransitions[enrollment.paymentStatus] || [];
    if (!allowed.includes(data.paymentStatus)) {
      throw Object.assign(
        new Error(`Cannot transition from ${enrollment.paymentStatus} to ${data.paymentStatus}`),
        { status: 400 }
      );
    }
  }

  return prisma.enrollment.update({
    where: { id },
    data: {
      ...(data.paymentStatus && { paymentStatus: data.paymentStatus }),
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      course: { select: { id: true, name: true } },
    },
  });
};

export const removeEnrollment = async (id: string) => {
  const enrollment = await prisma.enrollment.findUnique({ where: { id } });
  if (!enrollment) throw Object.assign(new Error('Enrollment not found'), { status: 404 });
  
  await prisma.enrollment.delete({ where: { id } });
};
```

**File: `src/modules/enrollments/enrollments.schema.ts`**
```typescript
import { z } from 'zod';

export const createEnrollmentSchema = z.object({
  studentId: z.string().min(1, 'Student ID required'),
  courseId: z.string().min(1, 'Course ID required'),
  branchId: z.string().min(1, 'Branch ID required'),
  paymentStatus: z.enum(['FULL_PAID', 'PARTIAL_PAID', 'PENDING']).default('PENDING'),
});

export const updateEnrollmentSchema = z.object({
  paymentStatus: z.enum(['FULL_PAID', 'PARTIAL_PAID', 'PENDING']).optional(),
});

export const enrollmentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  studentId: z.string().optional(),
  courseId: z.string().optional(),
  branchId: z.string().optional(),
  paymentStatus: z.enum(['FULL_PAID', 'PARTIAL_PAID', 'PENDING']).optional(),
});

export type CreateEnrollmentDto = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentDto = z.infer<typeof updateEnrollmentSchema>;
export type EnrollmentQuery = z.infer<typeof enrollmentQuerySchema>;
```

**Update `src/app.ts`:**
```typescript
import enrollmentRoutes from './modules/enrollments/enrollments.routes.js';

// Add to routes section
app.use(`${API}/enrollments`, enrollmentRoutes);
```

---

## CRITICAL: Fix Refresh Token Error Handling

**File: `src/modules/auth/auth.service.ts` - Lines 184-195**

### Current (Broken)
```typescript
export const verifyRefreshToken = async (token: string) => {
  if (!token) throw Object.assign(new Error('Refresh token missing'), { status: 401 });
  const tokens = await prisma.refreshToken.findMany({ where: { revokedAt: null } });
  // Compare token against hashes
  for (const rec of tokens) {
    const ok = await bcryptjs.compare(token, rec.tokenHash);
    if (ok) {
      if (rec.expiresAt < new Date()) throw Object.assign(new Error('Refresh token expired'), { status: 401 });
      return rec;
    }
  }
  // ❌ Missing error at end!
};
```

### Fixed
```typescript
export const verifyRefreshToken = async (token: string) => {
  if (!token) throw Object.assign(new Error('Refresh token missing'), { status: 401 });
  
  const tokens = await prisma.refreshToken.findMany({ where: { revokedAt: null } });
  
  for (const rec of tokens) {
    const ok = await bcryptjs.compare(token, rec.tokenHash);
    if (ok) {
      if (rec.expiresAt < new Date()) {
        throw Object.assign(new Error('Refresh token expired'), { status: 401 });
      }
      return rec;
    }
  }
  
  // ✅ Add missing error case
  throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
};
```

---

## HIGH: Fix Exam Date Validation

**File: `src/modules/exams/exams.schema.ts`**

### Current
```typescript
export const createExamSchema = z.object({
  branchId: z.string().min(1),
  examDate: z.string().min(1, 'Exam date is required'),  // ❌ No validation
  notes: z.string().optional(),
  courses: z.array(...).optional(),
});
```

### Fixed
```typescript
export const createExamSchema = z.object({
  branchId: z.string().min(1),
  examDate: z.string()
    .min(1, 'Exam date is required')
    .refine((date) => {
      const examDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return examDate >= today;
    }, { message: 'Exam date must be today or in the future' }),
  notes: z.string().optional(),
  courses: z.array(z.object({
    courseId: z.string().min(1),
    questionPaperId: z.string().optional(),
  })).optional(),
});
```

---

## HIGH: Add Enrollment Validation

**File: `src/modules/students/students.schema.ts` - Add this**

```typescript
export const enrollmentSchema = z.object({
  courseId: z.string().min(1, 'Course ID required'),
  paymentStatus: z.enum(['FULL_PAID', 'PARTIAL_PAID', 'PENDING']).default('PENDING'),
});

export type EnrollmentDto = z.infer<typeof enrollmentSchema>;
```

**File: `src/modules/students/students.routes.ts`**

```typescript
router.post('/:id/enrollments', 
  requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'), 
  validate(enrollmentSchema),  // ✅ Add validation
  enroll
);
```

---

## MEDIUM: Fix Branch Transaction Error Handling

**File: `src/modules/branches/branches.service.ts` - Lines 48-72**

### Current
```typescript
return prisma.$transaction(async (tx: any) => {
  const admin = await tx.user.create({
    data: {
      name:         data.adminName,
      email:        data.adminEmail,
      passwordHash,
      role:         'BRANCH_ADMIN',
    },
  });
  return tx.branch.create({
    // ...
  });
});
```

### Fixed
```typescript
return prisma.$transaction(async (tx: any) => {
  let admin;
  try {
    admin = await tx.user.create({
      data: {
        name:         data.adminName,
        email:        data.adminEmail,
        passwordHash,
        role:         'BRANCH_ADMIN',
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw Object.assign(new Error('Email already in use'), { status: 409 });
    }
    throw error;
  }

  try {
    return tx.branch.create({
      data: {
        branchCode: nextCode,
        name:       data.name,
        address:    data.address,
        location:   data.location,
        ...(data.logo !== undefined && { logo: data.logo }),
        phone1:     data.phone1,
        phone2:     data.phone2,
        aadharNo:   data.aadharNo,
        panNo:      data.panNo,
        adminId:    admin.id,
      },
      include: { admin: { select: { id: true, name: true, email: true } } },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw Object.assign(new Error('Branch code already exists'), { status: 409 });
    }
    throw error;
  }
}, {
  timeout: 10000,  // Add timeout for long transactions
});
```

---

## MEDIUM: Fix Exam Password Generation Error Handling

**File: `src/modules/exams/exams.service.ts` - Lines 94-101**

### Current
```typescript
const results = await Promise.all(  // ❌ Fails if any student fails
  students.map((s: any) => generateDailyPassword(s.id, exam.examDate.toISOString()))
);
```

### Fixed
```typescript
const results = await Promise.allSettled(  // ✅ Handle partial failures
  students.map((s: any) => generateDailyPassword(s.id, exam.examDate.toISOString()))
);

// Process results, separating successes from failures
const successes = [];
const failures = [];

results.forEach((result, idx) => {
  if (result.status === 'fulfilled') {
    successes.push({ studentId: students[idx].id, password: result.value });
  } else {
    failures.push({ studentId: students[idx].id, error: result.reason?.message });
  }
});

if (failures.length > 0) {
  console.warn(`Failed to generate passwords for ${failures.length} students:`, failures);
}

return {
  generated: successes,
  failed: failures,
  message: `Passwords generated for ${successes.length}/${students.length} students`,
};
```

---

## MEDIUM: Fix Certificate Duplicate Issue

**File: `src/modules/student-portal/student-portal.service.ts` - Lines 85-100**

### Current
```typescript
if (passed) {
  await prisma.certificate.create({  // ❌ Can create duplicates
    data: {
      studentId,
      branchId: exam.branchId,
      marks,
      status: 'ISSUED',
      issuedAt: new Date(),
    },
  });
}
```

### Fixed
```typescript
if (passed) {
  await prisma.certificate.upsert({  // ✅ Use upsert for idempotency
    where: {
      // Need unique constraint in schema first:
      // @@unique([studentId, examId])
    },
    update: {
      marks,
      status: 'ISSUED',
      issuedAt: new Date(),
    },
    create: {
      studentId,
      branchId: exam.branchId,
      marks,
      status: 'ISSUED',
      issuedAt: new Date(),
    },
  });
}
```

**Update Prisma Schema:**
```prisma
model Certificate {
  id        String            @id @default(cuid())
  studentId String
  branchId  String
  courseId  String?
  examId    String?  // ✅ Add to track which exam
  examDate  DateTime?
  marks     Int?
  status    CertificateStatus @default(PENDING)
  issuedAt  DateTime?
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  branch  Branch  @relation(fields: [branchId], references: [id])
  
  @@unique([studentId, examId])  // ✅ Prevent duplicates
  @@map("certificates")
}
```

---

## MEDIUM: Add Student Credential Routes

**File: Create `src/modules/students/credentials.controller.ts`**

```typescript
import { Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { generateDailyPassword, getDailyCredential } from './students.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

export const generatePassword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { studentId, examDate } = req.body;
  
  const result = await generateDailyPassword(studentId, examDate);
  
  // Only return plaintext once, with warning
  sendSuccess(res, {
    studentId: result.studentId,
    date: result.date,
    plainPassword: result.plainPassword,
    warning: 'Save this password now. It will not be displayed again.',
  }, 'Password generated', 201);
});

export const checkCredential = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { studentId, examDate } = req.params;
  
  const credential = await getDailyCredential(studentId, examDate);
  
  if (!credential) {
    sendSuccess(res, { exists: false }, 'No credential found');
    return;
  }
  
  // Don't return password hash
  sendSuccess(res, {
    exists: true,
    studentId: credential.studentId,
    examDate: credential.examDate,
  });
});
```

**Update `src/modules/students/students.routes.ts`**

```typescript
router.post('/:id/credentials/generate',
  requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'),
  asyncHandler(generatePassword)
);

router.get('/:id/credentials/:examDate',
  requireRole('SUPER_ADMIN', 'BRANCH_ADMIN'),
  asyncHandler(checkCredential)
);
```

---

## Database: Add Missing Indexes

**File: `prisma/schema.prisma` - Add to relevant models**

```prisma
model Student {
  // ... existing fields
  @@index([email])
  @@index([branchId])
  @@index([createdAt])
}

model Enrollment {
  // ... existing fields
  @@index([studentId])
  @@index([courseId])
  @@index([branchId])
}

model Payment {
  // ... existing fields
  @@index([studentId])
  @@index([branchId])
  @@index([status])
}

model ExamResult {
  // ... existing fields
  @@index([studentId])
  @@index([examId])
}

model StudentCredential {
  // ... existing fields
  @@index([examDate])
  @@index([studentId])
}

model Course {
  // ... existing fields
  @@index([isActive])
}
```

---

## Config: Validate Required Environment Variables

**File: `src/config/index.ts`**

```typescript
import dotenv from 'dotenv';
dotenv.config();

// Validation function
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value && !defaultValue) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
};

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  jwtSecret: getEnvVar('JWT_SECRET'),  // ✅ Required
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
  cors: {
    origin: getEnvVar('CORS_ORIGIN'),  // ✅ Required
  },
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
  },
  email: {
    service: getEnvVar('EMAIL_SERVICE', 'gmail'),
    user: getEnvVar('EMAIL_USER'),
    password: getEnvVar('EMAIL_PASSWORD'),
  },
  database: {
    url: getEnvVar('DATABASE_URL'),  // ✅ Required
  },
};

// Log loaded config (without secrets)
console.log('✅ Configuration loaded:', {
  nodeEnv: config.nodeEnv,
  port: config.port,
  corsOrigin: config.cors.origin,
  jwtExpiresIn: config.jwtExpiresIn,
});
```

---

## Summary of Files to Create/Modify

### New Files (Enrollments Module)
- `src/modules/enrollments/enrollments.routes.ts` ✅
- `src/modules/enrollments/enrollments.controller.ts` ✅
- `src/modules/enrollments/enrollments.service.ts` ✅
- `src/modules/enrollments/enrollments.schema.ts` ✅
- `src/modules/enrollments/.spec.ts` (for tests)

### Files to Modify (Critical)
1. `prisma/schema.prisma` - Remove plainPassword, add indexes
2. `src/modules/auth/auth.service.ts` - Fix verifyRefreshToken error
3. `src/modules/students/students.service.ts` - Remove plainPassword handling
4. `src/app.ts` - Add enrollment routes

### Files to Modify (High Priority)
1. `src/modules/exams/exams.schema.ts` - Add date validation
2. `src/modules/exams/exams.service.ts` - Fix password generation
3. `src/modules/branches/branches.service.ts` - Better error handling
4. `src/modules/student-portal/student-portal.service.ts` - Fix duplicates
5. `src/config/index.ts` - Validate env vars

### Database Migrations Needed
```bash
npx prisma migrate dev --name remove_plain_password
npx prisma migrate dev --name add_database_indexes
npx prisma migrate dev --name add_exam_id_to_certificate
```

---

End of Actionable Fixes
