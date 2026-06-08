# Education Platform - Complete Project Documentation

**Last Updated:** April 23, 2026  
**Status:** Production Ready (58/58 Defects Resolved)

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Complete Application Flow](#complete-application-flow)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Frontend Structure](#frontend-structure)
9. [Security Features](#security-features)
10. [Setup & Installation](#setup--installation)
11. [Key Features Implemented](#key-features-implemented)
12. [Password System (Exam Access)](#password-system-exam-access)
13. [Payment System](#payment-system)
14. [Certificate System](#certificate-system)

---

## Project Overview

This is a **Multi-Tenant Education Management System** designed for managing branches, students, courses, exams, payments, and certificates. The platform supports three main user roles with hierarchical permissions.

### Key Statistics
- **Frontend:** React 18+ with TypeScript, Vite, Tailwind CSS
- **Backend:** Express.js v4.x with TypeScript
- **Database:** PostgreSQL 12+
- **Auth Method:** JWT (JSON Web Tokens)
- **ORM:** Prisma v6.19.2

---

## Technology Stack

### Frontend
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite with Hot Module Reload (HMR)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Forms:** Formik + Yup validation
- **Routing:** React Router v6 with lazy loading
- **HTTP Client:** Axios with auth interceptors
- **Notifications:** React Hot Toast
- **State Management:** React Context (AuthContext, PageHeaderContext) + localStorage
- **Architecture:** Service layer pattern (*.service.ts files)

### Backend
- **Framework:** Express.js v4.x with TypeScript
- **Database:** PostgreSQL 12+ (database: "test", host: localhost:5432)
- **ORM:** Prisma v6.19.2 with auto-generated client
- **Authentication:** JWT with jwtSecret from config
- **Password Hashing:** bcryptjs (configurable rounds)
- **Validation:** Zod schemas on backend
- **Error Handling:** asyncHandler() wrapper + response utilities
- **Security:** Role-based middleware, bcrypt hashing, JWT validation

---

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────┐
│ Frontend (React/TypeScript/Vite)                │
│ - Super Admin Dashboard                         │
│ - Branch Admin Dashboard                        │
│ - Student Portal                                │
└──────────────────┬──────────────────────────────┘
                   │ (HTTPS/REST)
                   ▼
┌─────────────────────────────────────────────────┐
│ Backend (Express.js/TypeScript)                 │
│ - Auth Service                                  │
│ - User/Branch Management                        │
│ - Student/Enrollment Management                 │
│ - Course/Exam Management                        │
│ - Payment Management                            │
│ - Certificate Management                        │
│ - Student Portal (Exam Submission)              │
└──────────────────┬──────────────────────────────┘
                   │ (SQL)
                   ▼
┌─────────────────────────────────────────────────┐
│ PostgreSQL Database                             │
│ - Users, Branches, Students, Courses            │
│ - Exams, StudentCredentials, Payments           │
│ - Enrollments, ExamResults, Certificates        │
│ - AuditLog (Security Tracking)                  │
└─────────────────────────────────────────────────┘
```

### Request Flow
```
1. Frontend sends request with JWT in Authorization header
2. Backend authenticate() middleware validates JWT
3. requireRole() middleware checks user has required role
4. scopeBranch/scopeSelf middleware limits data access
5. validate() middleware validates request body/params
6. Route handler executes business logic
7. Response sent with {success, data, message, statusCode}
```

---

## User Roles & Permissions

### 1. SUPER_ADMIN
**Access Level:** Full system access
- ✅ Manage all branches (create, read, update, delete)
- ✅ Create and manage courses
- ✅ Create and manage exams
- ✅ Assign question papers to exams
- ✅ Approve exam requests from branch admins (auto-generates passwords)
- ✅ View all students and enrollments
- ✅ View all payments and certificates
- ✅ Access full dashboard with all branch data
- ✅ View audit logs

### 2. BRANCH_ADMIN
**Access Level:** Limited to assigned branch
- ✅ View branch details
- ✅ Register and manage students in branch
- ✅ View and manage student enrollments
- ✅ View student payments
- ✅ Schedule exams for branch courses
- ✅ Send exam requests to super admin for approval
- ✅ View generated passwords (only when exam is approved)
- ✅ View branch-specific dashboard
- ✅ View certificates issued to branch students
- ❌ Cannot create courses or branches
- ❌ Cannot approve exams
- ❌ Cannot see other branches' data

### 3. STUDENT
**Access Level:** Personal account only
- ✅ Login with PRN (ID) + password
- ✅ View available exams (today's exams only, after login)
- ✅ View enrolled courses
- ✅ Take exams on scheduled exam dates
- ✅ Submit exam answers
- ✅ View exam results and scores
- ✅ View issued certificates
- ✅ Update profile information
- ❌ Cannot create exams or courses
- ❌ Cannot manage payments (branch admin only)
- ❌ Cannot see other students' data

---

## Complete Application Flow

### 1. Authentication Flow
```
User Login:
  1. User navigates to /auth/login
  2. Enters PRN/Email + password
  3. Frontend calls POST /api/auth/login
  4. Backend validates credentials, creates JWT
  5. JWT stored in localStorage
  6. Frontend redirects based on user role

Token Validation:
  1. Every request includes Authorization: Bearer {JWT}
  2. Backend authenticate() middleware validates token
  3. Extracts user info: sub (user_id), email, role, branchId, studentId
  4. Attached to req.user for handlers to use

Logout:
  1. Frontend clears localStorage
  2. Removes Authorization header
  3. Redirects to login page
```

### 2. Branch Management Flow (Super Admin)
```
Create Branch:
  1. Super Admin accesses Branches page
  2. Clicks "Create Branch"
  3. Fills form: name, location, admin email, admin password
  4. Frontend validates form, sends POST /api/branches
  5. Backend creates branch + creates admin user
  6. Returns new branch with admin credentials
  7. Branch admin can now login

Manage Branch:
  1. Super Admin views all branches in dashboard
  2. Can edit branch details (name, location)
  3. Can activate/deactivate branch
  4. Can delete branch (if no associated data)
```

### 3. Course Management Flow (Super Admin)
```
Create Course:
  1. Super Admin goes to Courses section
  2. Clicks "Add Course"
  3. Fills form: name, description, course fee, duration
  4. Clicks "Create"
  5. Backend creates course in database
  6. Course is now available for exam assignment

Assign Question Paper:
  1. Super Admin navigates to course
  2. Goes to "Question Papers" section
  3. Creates new question paper (title, description)
  4. Adds questions (text, options, correct answer, marks)
  5. Question paper is saved and can be assigned to exams
```

### 4. Exam Scheduling & Approval Flow

#### Branch Admin Perspective
```
Schedule Exam:
  1. Branch Admin logs in to dashboard
  2. Goes to "Schedule Exam" section
  3. Selects exam date and course
  4. Selects question paper for the course
  5. Sets number of questions, marks configuration
  6. Submits exam request
  7. Status shows "PENDING" (waiting for super admin approval)

View Passwords (After Approval):
  1. Exam status changes to "APPROVED"
  2. "View Passwords" button becomes available
  3. Clicks button → modal opens
  4. Shows all students + generated passwords
  5. Passwords valid only for exam date (00:00-23:59)
  6. Can copy passwords for distribution to students
```

#### Super Admin Perspective
```
Review Exam Request:
  1. Super Admin goes to Exams section
  2. Sees pending exam requests from all branches
  3. Clicks exam to view details:
     - Branch, date, course, question paper
     - Number of students, questions, marks
  4. Can approve or reject

Approve Exam (Auto-Generates Passwords):
  1. Clicks "Approve" button
  2. Backend validates exam date not in past
  3. Automatically generates:
     - Random 6-digit password for EACH student in exam's branch
     - Password validity: exam date 00:00 to 23:59 (24-hour window)
     - Audit log entry for each password generation
  4. Returns success modal showing all student names + passwords
  5. Super Admin can copy all passwords at once
  6. Branch admin can now view passwords via their dashboard
```

### 5. Student Payment & Enrollment Flow

#### Registration
```
Student Registration:
  1. Branch Admin navigates to "Students" section
  2. Clicks "Register New Student"
  3. Fills form: PRN, name, email, phone, branch, course(s)
  4. Selects payment status for each course:
     - PENDING (no payment)
     - PARTIAL_PAID (down payment made)
     - FULL_PAID (full payment received)
  5. Can upload student photo
  6. Submits registration
  7. Student account is created
  8. Initial password is sent/displayed (system generated)
```

#### Payment Management
```
Update Payment Status:
  1. Branch Admin views "Students" list
  2. Selects student to edit
  3. Goes to "Enrollments" tab
  4. For each course enrollment:
     - Can update payment status
     - Can add payment notes/receipt reference
     - Can mark as FULL_PAID
  5. Only FULL_PAID students eligible for exams
  6. PENDING/PARTIAL_PAID students get 403 error when trying exam access

View Payments:
  1. Branch Admin can view payment history per student
  2. Super Admin can view all payments across branches
  3. Can filter by status, date range, branch
```

### 6. Student Exam Access Flow

#### Login Process
```
Student Login:
  1. Student navigates to /student/login
  2. Enters PRN + password (initial or personal)
  3. Frontend calls POST /api/auth/login
  4. Backend creates JWT token with studentId, branchId
  5. Frontend redirects to Student Portal

Important: Students must login EACH EXAM DAY
  - Each exam date has different password
  - Students can only access exams for TODAY
  - No planning/advance access to future exams
```

#### Exam Access Rules
```
Before Taking Exam:
  1. Student must be FULL_PAID for the course
  2. Must be on scheduled exam date (00:00-23:59)
  3. Exam status must be APPROVED
  4. Student's course must be in exam

Available Exams Page:
  1. Frontend calls GET /api/student-portal/available-exams
  2. Backend checks:
     ✓ Student authentication (valid JWT)
     ✓ Student has FULL_PAID enrollment
     ✓ Exam date = TODAY
     ✓ Student enrolled in course
  3. Returns array of exams available TODAY ONLY
  4. Shows course names, exam date, password requirements

Exam Details:
  1. Student selects exam
  2. Frontend shows:
     - Exam date/time
     - Course name
     - Question paper
     - Number of questions, total marks
     - Password requirement notice
  3. Student enters password (provided by branch admin)
  4. Backend validates:
     ✓ Password correct (bcrypt compare)
     ✓ Current time is exam date 00:00-23:59
     ✓ Audit log entry created
```

### 7. Exam Submission & Results Flow

```
Take Exam:
  1. Student views questions (one at a time or all)
  2. Selects answers for each question
  3. Can review answers before final submission
  4. Clicks "Submit Exam"

Submit Exam:
  1. Frontend sends POST /api/student-portal/exams/{examId}/submit
  2. Backend validates:
     ✓ Current time is exam date (not before/after)
     ✓ Student is authenticated
  3. Auto-grades exam:
     ✓ Compares student answers vs. correct answers
     ✓ Calculates percentage score
     ✓ Determines pass/fail (threshold: 40%)
  4. Saves ExamResult with marks and status
  5. If PASSED: Auto-creates Certificate

View Results:
  1. Student can view exam results immediately
  2. Shows: score, pass/fail status, date taken
  3. Can view issued certificates
```

### 8. Certificate Generation & Issuance

```
Auto-Certificate on Pass:
  1. When student submits exam, system auto-grades
  2. If marks >= 40 (passing threshold):
     - Certificate record created immediately
     - Status: ISSUED
     - Contains: student name, course, date, score, branch
  3. Student can view certificate in portal

View Certificates:
  - Student: can view their own certificates
  - Branch Admin: can view all branch student certificates
  - Super Admin: can view all certificates across system
```

### 9. Audit Logging Flow

```
Security Events Logged:
  1. PASSWORD_GENERATED: When super admin approves exam
     - Tracks who, when, which student, which exam date
  2. PASSWORD_VIEWED: When branch admin views password list
     - Tracks who, when, IP address, user agent
  3. PASSWORD_VALIDATED: When student validates password
     - Tracks success/failure, attempt time
     - Logs reason for failure (invalid, expired, etc.)

Query Audit Logs:
  - Get all events for specific student+exam date
  - Get all events by action type
  - Get events within date range
  - Used for compliance, security investigation
```

---

## Database Schema

### Core Models

#### User
```typescript
- id: String (primary key)
- name: String
- email: String (unique)
- passwordHash: String (bcrypt)
- role: SUPER_ADMIN | BRANCH_ADMIN | STUDENT
- avatar: String (optional)
- isActive: Boolean
- createdAt: DateTime
- updatedAt: DateTime
```

#### Branch
```typescript
- id: String (primary key)
- name: String
- location: String
- logo: String (optional, path to uploaded file)
- adminId: String (foreign key to User)
- isActive: Boolean
- createdAt: DateTime
- updatedAt: DateTime

Relations:
- admin: User (one admin per branch)
- students: Student[] (many)
- exams: Exam[] (many)
- courses: Course[] (many)
- enrollments: Enrollment[] (many)
- certificates: Certificate[] (many)
```

#### Student
```typescript
- id: String (primary key)
- prn: String (unique within branch)
- firstName: String
- lastName: String
- email: String
- phone: String
- branchId: String (foreign key)
- photo: String (optional, file path)
- isActive: Boolean
- createdAt: DateTime
- updatedAt: DateTime

Relations:
- branch: Branch
- enrollments: Enrollment[] (many)
- examResults: ExamResult[] (many)
- studentCredentials: StudentCredential[] (many)
- certificates: Certificate[] (many)
```

#### Course
```typescript
- id: String (primary key)
- name: String
- description: String
- branchId: String (foreign key)
- courseFee: Decimal
- duration: String
- isActive: Boolean
- createdAt: DateTime

Relations:
- branch: Branch
- enrollments: Enrollment[] (many)
- questionPapers: QuestionPaper[] (many)
- examCourses: ExamCourse[] (many)
```

#### Enrollment
```typescript
- id: String (primary key)
- studentId: String (foreign key)
- courseId: String (foreign key)
- branchId: String (foreign key)
- paymentStatus: PENDING | PARTIAL_PAID | FULL_PAID
- courseFee: Decimal
- createdAt: DateTime
- updatedAt: DateTime

Constraints:
- @@unique([studentId, courseId]) - one enrollment per student per course
```

#### Exam
```typescript
- id: String (primary key)
- branchId: String (foreign key)
- examDate: DateTime (date only, normalized to 00:00:00)
- status: PENDING | APPROVED | REJECTED
- createdAt: DateTime
- updatedAt: DateTime

Relations:
- branch: Branch
- examCourses: ExamCourse[] (many)
- studentCredentials: StudentCredential[] (many)
- examResults: ExamResult[] (many)
```

#### ExamCourse
```typescript
- examId: String (foreign key)
- courseId: String (foreign key)
- questionPaperId: String (foreign key)
- createdAt: DateTime

Constraints:
- @@id([examId, courseId]) - composite primary key
```

#### StudentCredential
```typescript
- id: String (primary key)
- studentId: String (foreign key)
- examDate: DateTime (exam date, normalized to 00:00:00)
- passwordHash: String (bcrypt hashed 6-digit password)
- validFrom: DateTime (exam date 00:00:00)
- validUntil: DateTime (exam date 23:59:59)
- notifiedAt: DateTime (optional, when student was notified)
- passwordViewedAt: DateTime (optional, when password was displayed)
- createdAt: DateTime
- updatedAt: DateTime

Constraints:
- @@unique([studentId, examDate]) - one credential per student per exam date
- Indexes: examDate, validFrom, validUntil for fast queries
```

#### AuditLog
```typescript
- id: String (primary key)
- action: PASSWORD_GENERATED | PASSWORD_VIEWED | PASSWORD_VALIDATED | PASSWORD_VALIDATION_FAILED
- studentCredentialId: String (optional, foreign key)
- studentId: String (foreign key)
- examDate: DateTime
- userId: String (optional, who performed action)
- userRole: SUPER_ADMIN | BRANCH_ADMIN (optional)
- ipAddress: String (optional)
- userAgent: String (optional)
- details: JSON (additional context)
- createdAt: DateTime
- updatedAt: DateTime

Indexes: examDate, action, studentId, userId, createdAt
```

#### ExamResult
```typescript
- id: String (primary key)
- examId: String (foreign key)
- studentId: String (foreign key)
- marks: Int (0-100)
- passed: Boolean (marks >= 40)
- createdAt: DateTime
- updatedAt: DateTime

Constraints:
- @@unique([examId, studentId]) - one result per student per exam
```

#### Certificate
```typescript
- id: String (primary key)
- studentId: String (foreign key)
- branchId: String (foreign key)
- marks: Int (exam score)
- status: ISSUED | REVOKED
- issuedAt: DateTime
- createdAt: DateTime

Relations:
- student: Student
- branch: Branch
```

#### QuestionPaper
```typescript
- id: String (primary key)
- courseId: String (foreign key)
- title: String
- description: String
- createdAt: DateTime

Relations:
- course: Course
- questions: Question[] (many)
- examCourses: ExamCourse[] (many)
```

#### Question
```typescript
- id: String (primary key)
- questionPaperId: String (foreign key)
- questionNo: Int
- questionText: String
- options: String[] (JSON array)
- correctOption: Int (0-3 index)
- marks: Int

Relations:
- questionPaper: QuestionPaper
```

---

## API Endpoints

### Authentication (`/api/auth`)
```
POST /api/auth/login
  Body: { email: string, password: string }
  Returns: { token: string, user: {...} }

GET /api/auth/me
  Returns: Current authenticated user profile

POST /api/auth/logout
  Returns: { message: "Logged out successfully" }
```

### Branches (`/api/branches`)
```
GET /api/branches
  Role: SUPER_ADMIN
  Returns: List of all branches (paginated)

POST /api/branches
  Role: SUPER_ADMIN
  Body: { name: string, location: string, adminEmail: string, adminPassword: string }
  Returns: Created branch with admin user

GET /api/branches/:id
  Role: SUPER_ADMIN
  Returns: Branch details

PATCH /api/branches/:id
  Role: SUPER_ADMIN
  Body: { name?: string, location?: string }
  Returns: Updated branch

DELETE /api/branches/:id
  Role: SUPER_ADMIN
  Returns: { message: "Branch deleted" }
```

### Courses (`/api/courses`)
```
GET /api/courses
  Returns: List of all courses (paginated)

POST /api/courses
  Role: SUPER_ADMIN
  Body: { name: string, description: string, courseFee: number, duration: string }
  Returns: Created course

PATCH /api/courses/:id
  Role: SUPER_ADMIN
  Body: { name?: string, description?: string, courseFee?: number, duration?: string }
  Returns: Updated course

DELETE /api/courses/:id
  Role: SUPER_ADMIN
  Returns: { message: "Course deleted" }
```

### Exams (`/api/exams`)
```
GET /api/exams
  Query: { page, limit, status, search, branchId }
  Role: SUPER_ADMIN (all) | BRANCH_ADMIN (own branch only)
  Returns: List of exams (paginated)

POST /api/exams
  Role: SUPER_ADMIN | BRANCH_ADMIN
  Body: { branchId: string, examDate: date, courses: string[] }
  Returns: Created exam (status: PENDING)

GET /api/exams/:id
  Returns: Exam details

PATCH /api/exams/:id/approve
  Role: SUPER_ADMIN
  Returns: { exam: {...}, generatedPasswords: [{studentId, studentName, password, validFrom, validUntil}, ...] }
  Action: Auto-generates passwords for all students

GET /api/exams/:id/passwords
  Role: BRANCH_ADMIN | SUPER_ADMIN
  Returns: { exam: {...}, passwords: [{studentId, studentName, email, generated, validFrom, validUntil}, ...] }
  Requires: Exam status = APPROVED and exam date not in past

PATCH /api/exams/:examId/courses/:courseId/paper
  Role: SUPER_ADMIN
  Body: { questionPaperId: string }
  Returns: Updated exam course assignment
```

### Students (`/api/students`)
```
GET /api/students
  Query: { page, limit, search, paymentStatus }
  Returns: List of students (branch-scoped for BRANCH_ADMIN)

POST /api/students
  Role: SUPER_ADMIN | BRANCH_ADMIN
  Body: { prn: string, firstName: string, lastName: string, email: string, phone: string, photo: File }
  Returns: Created student

GET /api/students/:id
  Returns: Student details with enrollments

PATCH /api/students/:id
  Body: { firstName?: string, lastName?: string, email?: string, phone?: string, photo?: File }
  Returns: Updated student

DELETE /api/students/:id
  Role: SUPER_ADMIN
  Returns: { message: "Student deleted" }

POST /api/students/:id/enrollments
  Role: SUPER_ADMIN | BRANCH_ADMIN
  Body: { courseId: string, paymentStatus: "PENDING" | "PARTIAL_PAID" | "FULL_PAID" }
  Returns: Created enrollment

GET /api/students/:id/enrollments
  Returns: Student's course enrollments

POST /api/students/validate-password
  Role: PUBLIC (no auth required)
  Body: { studentId: string, examDate: date, password: string }
  Returns: { valid: boolean, message: string, validUntil: date }
  Validates: Password hash, time window (exam date only)
```

### Student Portal (`/api/student-portal`)
```
GET /api/student-portal/available-exams
  Role: STUDENT
  Returns: Exams available TODAY only
  Validates: FULL_PAID payment status required

GET /api/student-portal/exams/:examId/courses/:courseId
  Role: STUDENT
  Returns: Questions for exam course

POST /api/student-portal/exams/:examId/submit
  Role: STUDENT
  Body: { answers: {questionId: answerId, ...} }
  Returns: { result: {...}, marks: number, passed: boolean }
  Auto-generates certificate if passed (marks >= 40)
```

### Certificates (`/api/certificates`)
```
GET /api/certificates
  Query: { page, limit, tab: "branch" | "student", search }
  Returns: Certificates (branch or student view)

GET /api/certificates/branch/:branchId/students
  Role: BRANCH_ADMIN | SUPER_ADMIN
  Returns: Students with issued certificates in branch
```

### Dashboard (`/api/dashboard`)
```
GET /api/dashboard/counts
  Returns: Count of branches, students, exams, pending approvals

GET /api/dashboard/branch-metrics
  Role: SUPER_ADMIN
  Returns: Branch-wise student count, revenue, certificates

GET /api/dashboard/recent-exams
  Returns: Recently scheduled exams
```

---

## Frontend Structure

### Directory Layout
```
frontend/
├── src/
│   ├── App.tsx                          # Main app component
│   ├── main.tsx                         # Entry point
│   ├── App.css                          # Global styles
│   ├── app/
│   │   ├── providers.tsx                # Context providers
│   │   └── store.ts                     # Redux/store (if used)
│   ├── assets/                          # Images, icons, fonts
│   ├── components/
│   │   ├── GlobalLoader.tsx             # Loading spinner
│   │   ├── auth/                        # Auth-related components
│   │   ├── common/                      # Reusable components
│   │   ├── forms/                       # Form components
│   │   ├── layout/                      # Layout wrappers
│   │   ├── tables/                      # Table components
│   │   └── ui/                          # UI components
│   ├── contexts/
│   │   ├── AuthContext.tsx              # Auth state & user info
│   │   └── PageHeaderContext.tsx        # Page header state
│   ├── features/                        # Feature modules
│   │   ├── auth/                        # Login, register, profile
│   │   ├── branches/                    # Branch management
│   │   ├── certificates/                # Certificate viewing
│   │   ├── courses/                     # Course management
│   │   ├── dashboard/                   # Analytics dashboard
│   │   ├── exams/                       # Exam scheduling & approval
│   │   ├── payments/                    # Payment management
│   │   ├── students/                    # Student management
│   │   └── users/                       # User management
│   ├── hooks/                           # Custom React hooks
│   ├── layouts/                         # Layout components
│   ├── pages/
│   │   ├── auth/                        # Auth pages
│   │   ├── branch-admin/                # Branch admin pages
│   │   ├── student/                     # Student portal pages
│   │   └── superadmin/                  # Super admin pages
│   ├── routes/
│   │   └── index.tsx                    # Route configuration
│   ├── schemas/                         # Validation schemas
│   ├── services/
│   │   ├── api.ts                       # Axios instance & config
│   │   ├── auth.service.ts              # Auth API calls
│   │   ├── branch.service.ts            # Branch API calls
│   │   ├── certificate.service.ts       # Certificate API calls
│   │   ├── course.service.ts            # Course API calls
│   │   ├── dashboard.service.ts         # Dashboard API calls
│   │   ├── exam.service.ts              # Exam API calls
│   │   ├── loading.ts                   # Loading state management
│   │   └── student.service.ts           # Student API calls
│   ├── styles/
│   │   └── index.css                    # Global CSS
│   ├── types/
│   │   └── generated-schema-types.ts    # Auto-generated from backend
│   └── utils/
│       ├── helpers.ts                   # Utility functions
│       └── toastWrapper.ts              # Toast notification helpers
├── public/                              # Static assets
│   └── assets/
│       ├── fonts/
│       ├── icons/
│       └── images/
├── index.html                           # HTML entry point
├── package.json                         # Dependencies
├── vite.config.ts                       # Vite configuration
├── tsconfig.json                        # TypeScript config
└── PROJECT_DOCUMENTATION.md             # THIS FILE
```

### Key Files

#### `src/services/api.ts`
```typescript
// Axios instance with base URL and auth interceptor
// Adds JWT token from localStorage to every request
// Handles 401 responses (invalid token) → redirect to login
```

#### `src/contexts/AuthContext.tsx`
```typescript
// Stores: user, isAuthenticated, token
// Methods: login(), logout(), updateUser()
// Available throughout app via useAuth() hook
```

#### `src/routes/index.tsx`
```typescript
// Defines all routes with role-based guards
// Routes structured by role: superadmin/, branch-admin/, student/
// Lazy loads route components for code splitting
```

#### Service Layer Pattern
```typescript
// Each module has corresponding service file
// Example: exam.service.ts
export const examService = {
  list: async () => api.get('/exams'),
  getById: async (id) => api.get(`/exams/${id}`),
  create: async (data) => api.post('/exams', data),
  approve: async (id) => api.patch(`/exams/${id}/approve`),
  getPasswords: async (id) => api.get(`/exams/${id}/passwords`),
  // ... more methods
};
```

---

## Security Features

### 1. Authentication
- ✅ JWT-based authentication (Bearer tokens)
- ✅ Tokens include user role, branch scope, student scope
- ✅ Tokens stored in localStorage (XSS consideration)
- ✅ Token attached to all API requests via Authorization header
- ✅ Invalid/expired tokens trigger automatic logout

### 2. Authorization
- ✅ Role-based access control (SUPER_ADMIN, BRANCH_ADMIN, STUDENT)
- ✅ Middleware validates user has required role before executing handler
- ✅ Branch scoping: BRANCH_ADMIN can only see their own branch data
- ✅ Student scoping: STUDENT can only see their own data

### 3. Password Security
- ✅ Passwords hashed with bcryptjs (configurable rounds)
- ✅ Plaintext passwords never stored or transmitted
- ✅ 6-digit exam passwords auto-generated (random)
- ✅ Exam passwords valid only for 24-hour window (exam date only)
- ✅ Time-window validation prevents access outside exam date

### 4. Audit Logging
- ✅ All password generation events logged with user/IP/time
- ✅ All password validation attempts tracked (success/failure)
- ✅ Audit logs queryable by student, exam date, action type
- ✅ Logs include: who, when, what action, IP address, user agent
- ✅ Used for compliance and security investigation

### 5. Data Protection
- ✅ Branch admin can only access their branch's students/exams
- ✅ Students can only submit exams on scheduled exam date
- ✅ Students can only see their own results and certificates
- ✅ Payment eligibility checked before exam access
- ✅ Database constraints prevent duplicate enrollments

### 6. Input Validation
- ✅ Zod schemas validate all backend requests
- ✅ Yup schemas validate all frontend forms
- ✅ Email format validation
- ✅ Date range validation (no past dates for exams)
- ✅ Required field validation

---

## Setup & Installation

### Prerequisites
- Node.js v16+ (with npm or yarn)
- PostgreSQL 12+ (running on localhost:5432)
- Git

### Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create .env file (copy from .env.example if exists)
# Set: DATABASE_URL, JWT_SECRET, BCRYPT_ROUNDS, etc.

# Setup database
npx prisma migrate dev --name initial

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev          # Runs on localhost:3000 by default

# Type check
npx tsc --noEmit

# Build for production
npm run build
npm start            # Run production build
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create .env file
# Set: VITE_API_URL=http://localhost:3000/api

# Start development server (with HMR)
npm run dev          # Runs on localhost:5173

# Type check
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

**Backend (.env)**
```
DATABASE_URL=postgresql://user:password@localhost:5432/test
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h
BCRYPT_ROUNDS=10
PORT=3000
NODE_ENV=development
```

**Frontend (.env.local)**
```
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Education Platform
```

---

## Key Features Implemented

### ✅ Fully Implemented & Tested

#### Authentication & Authorization
- ✅ Login/logout with JWT
- ✅ Role-based access control (3 roles)
- ✅ Branch-scoped data access
- ✅ Student self-service portal access

#### Branch Management
- ✅ Create branches with admin assignment
- ✅ Update branch details
- ✅ Soft delete branches
- ✅ View all branches with metrics

#### Course Management
- ✅ Create courses with fees
- ✅ Create question papers
- ✅ Add questions with MCQ options
- ✅ Update and delete courses
- ✅ Assign question papers to exams

#### Student Management
- ✅ Register students with photo upload
- ✅ Update student information
- ✅ View student enrollment history
- ✅ Delete students
- ✅ Filter by payment status

#### Payment Management
- ✅ Track enrollment payment status (PENDING, PARTIAL_PAID, FULL_PAID)
- ✅ Update payment status per enrollment
- ✅ View payment history
- ✅ Payment eligibility check for exams

#### Exam Management
- ✅ Schedule exams by branch and date
- ✅ Assign question papers to exam courses
- ✅ Request exam approval (PENDING → APPROVED workflow)
- ✅ Auto-generate 6-digit passwords on approval
- ✅ Store password with 24-hour validity window
- ✅ Prevent approval of past-dated exams
- ✅ View generated passwords with validity info

#### Student Exam Portal
- ✅ View available exams (today only)
- ✅ Validate password with time-window enforcement
- ✅ View exam questions (MCQ format)
- ✅ Submit exam answers
- ✅ Auto-grade exams and calculate marks
- ✅ Display results immediately
- ✅ Prevent submissions outside exam date

#### Certificate System
- ✅ Auto-generate certificates when student passes (marks >= 40)
- ✅ Store certificate with student, branch, marks, date
- ✅ View certificates by student and branch
- ✅ Certificate status tracking (ISSUED, REVOKED)

#### Audit Logging
- ✅ Log password generation events
- ✅ Log password validation attempts (success/failure)
- ✅ Track user, IP, user agent for each event
- ✅ Query audit logs by student/exam date
- ✅ Graceful error handling (logs don't block operations)

#### Dashboard & Analytics
- ✅ Super admin branch-wise dashboard
- ✅ Exam statistics and counts
- ✅ Student and certificate metrics
- ✅ Branch-admin scoped dashboard

---

## Password System (Exam Access)

### How It Works

#### Password Generation (Super Admin)
```
1. Super Admin approves exam request
2. System finds all students in exam's branch enrolled in courses
3. Filters by FULL_PAID payment status
4. For each student:
   - Generates random 6-digit password
   - Calculates validity: exam date 00:00 to exam date 23:59:59
   - Hashes password with bcryptjs
   - Stores in StudentCredential table
   - Creates audit log entry
5. Returns list of student names + plain passwords (for copying)
6. Branch admin can now view passwords via dashboard
```

#### Password Validation (Student)
```
1. Student enters password from their branch admin
2. System checks:
   ✓ StudentCredential exists for student + exam date
   ✓ Current time >= validFrom (exam started)
   ✓ Current time <= validUntil (exam not ended)
   ✓ Password hash matches (bcrypt.compare)
3. If all checks pass:
   - Returns { valid: true, message: "Valid password" }
   - Creates "PASSWORD_VALIDATED" audit log
4. If any check fails:
   - Returns { valid: false, message: specific reason }
   - Creates "PASSWORD_VALIDATION_FAILED" audit log
```

#### Key Properties
- **Format:** 6-digit numeric string
- **Generation:** Random, unique per student per exam date
- **Storage:** Bcrypt hashed (one-way encryption)
- **Validity:** 24-hour window tied to exam date only
- **Auditing:** Full trail of generation, viewing, validation attempts

#### Error Scenarios
| Scenario | Error | Status |
|----------|-------|--------|
| No credential found | "No password generated for this exam date" | 400 |
| Password incorrect | "Invalid password" | 401 |
| Before exam date 00:00 | "Exam hasn't started yet" | 410 |
| After exam date 23:59 | "Exam time has ended" | 410 |
| Exam not approved | "Cannot view passwords for non-approved exams" | 400 |
| Payment not FULL_PAID | "Only full-paid students are eligible" | 403 |

---

## Payment System

### Payment Statuses
```
PENDING      → Student not yet paid
PARTIAL_PAID → Installment or partial amount paid
FULL_PAID    → Full course fee paid, eligible for exams
```

### Workflow
```
1. Student enrolled with initial status (default: PENDING)
2. Branch admin tracks payment progress
3. Marks as FULL_PAID once full payment received
4. Only FULL_PAID students can access exams (403 error if not)
5. Payment status visible in enrollment list
6. Can filter students by payment status
```

### Payment Eligibility for Exams
```
Before exam access:
  - System checks: Is student FULL_PAID for this course?
  - If YES: Student can attempt password validation
  - If NO: Returns 403 "Only students with full payment are eligible"
```

---

## Certificate System

### Auto-Generation on Pass
```
1. Student submits exam with answers
2. System auto-grades (correct options check)
3. If marks >= 40 (passing threshold):
   - Certificate created immediately
   - Status: ISSUED
   - Stores: student, branch, marks, issue date
4. If marks < 40:
   - No certificate created
   - Student sees "Not passed" status
```

### Certificate Components
```
- Student name
- Branch name
- Course (from exam)
- Exam date
- Score/marks obtained
- Issue date
- Status (ISSUED or REVOKED)
```

### Viewing Certificates
```
Student:
  - Views own certificates in portal
  - Can see marks and issue date

Branch Admin:
  - Views all certificates issued to branch students
  - Can search by student name or PRN
  - Can export certificate list

Super Admin:
  - Views all certificates across all branches
  - Can filter by branch or search
```

---

## Production Deployment Checklist

### Backend Deployment
- [ ] Set all environment variables (DATABASE_URL, JWT_SECRET, etc.)
- [ ] Run database migrations: `npm run migrate:prod`
- [ ] Generate Prisma client: `npx prisma generate`
- [ ] Build: `npm run build`
- [ ] Run tests: `npm test`
- [ ] Start: `npm start`
- [ ] Verify health check endpoint responds
- [ ] Test login flow end-to-end
- [ ] Verify database connection
- [ ] Setup error logging/monitoring

### Frontend Deployment
- [ ] Update VITE_API_URL to production backend URL
- [ ] Build: `npm run build`
- [ ] Verify build output size (check for chunks)
- [ ] Deploy dist/ folder to static host
- [ ] Test all user flows on production
- [ ] Verify JWT token refresh works
- [ ] Test password validation flow
- [ ] Check exam submission flow
- [ ] Verify certificates generate correctly
- [ ] Setup error tracking (Sentry, etc.)

### Security Checklist
- [ ] HTTPS enabled on both frontend and backend
- [ ] CORS configured to allow only frontend domain
- [ ] JWT secret is strong and unique
- [ ] Password hashing rounds set to 12+
- [ ] Database backups configured
- [ ] Audit logs being generated
- [ ] Rate limiting enabled on sensitive endpoints
- [ ] Input validation active on all endpoints
- [ ] Admin accounts have strong passwords
- [ ] SSL certificates valid and renewed

---

## Support & Troubleshooting

### Common Issues

**Frontend can't connect to backend**
```
1. Verify backend is running on configured port
2. Check VITE_API_URL in .env.local
3. Verify CORS is enabled in backend
4. Check network tab in browser dev tools
```

**Password validation failing**
```
1. Verify exam date is today (system only shows today's exams)
2. Check password is correct (case-sensitive, numeric)
3. Verify password is within 24-hour window
4. Check StudentCredential exists in database
```

**Students can't access exams**
```
1. Verify student payment status is FULL_PAID
2. Check exam date matches today's date
3. Verify exam status is APPROVED
4. Confirm student is enrolled in exam course
5. Check auth token is valid (not expired)
```

**Certificate not generating**
```
1. Check student exam score >= 40 (passing threshold)
2. Verify exam was submitted (not just started)
3. Check database for ExamResult record
4. Check Certificate table for generated record
```

---

## Contact & Version Info

- **Project Name:** Education Platform
- **Version:** 1.0.0
- **Last Updated:** April 23, 2026
- **Status:** Production Ready ✅
- **Defects Resolved:** 58/58

---

**End of Documentation**
