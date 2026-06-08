# Backend Audit - Quick Reference Checklist

---

## 🚨 CRITICAL ISSUES (Fix Immediately)

### Security Issues
- [ ] **CRITICAL:** Remove `plainPassword` from `StudentCredential` model
  - Location: `prisma/schema.prisma` line 95
  - Action: Create migration, remove field, update service
  - Risk: All exam passwords visible in database
  
- [ ] **CRITICAL:** Validate JWT_SECRET and DATABASE_URL in config
  - Location: `src/config/index.ts`
  - Action: Throw error if env vars missing
  - Risk: Production running with wrong credentials

### Missing Modules (No API Implementation)
- [ ] Create `src/modules/enrollments/` (4 files)
  - routes.ts, controller.ts, service.ts, schema.ts
  - Add to app.ts routes
  
- [ ] Create `src/modules/payments/` (4 files)
  - routes.ts, controller.ts, service.ts, schema.ts
  - Add to app.ts routes

- [ ] Create `src/modules/schedules/` (4 files)
  - Add Schedule model to prisma schema first
  - routes.ts, controller.ts, service.ts, schema.ts

### Error Handling Issues
- [ ] Fix missing error in `verifyRefreshToken()`
  - Location: `auth.service.ts` line 194
  - Issue: Returns undefined on invalid token instead of throwing
  
- [ ] Fix dynamic import in exams routes
  - Location: `exams.routes.ts` line 22
  - Issue: Not wrapped in asyncHandler; errors not caught

---

## 🟠 HIGH PRIORITY (This Week)

### Validation Issues
- [ ] Add exam date validation (must be >= today)
  - Location: `exams.schema.ts`
  - Add `.refine()` check
  
- [ ] Add enrollment input validation
  - Location: `students.routes.ts` line 58
  - Create `enrollmentSchema` in students.schema.ts
  
- [ ] Add phone number format validation
  - Location: `students.schema.ts` and `branches.schema.ts`
  - Add regex: `/^[6-9]\d{9}$/` for Indian numbers
  
- [ ] Add password complexity requirements
  - Location: `branches.schema.ts` line 13
  - Require: 8+ chars, uppercase, lowercase, number, special char

- [ ] Add DOB validation
  - Location: `students.schema.ts` line 18
  - Validate: age >= 16 and <= 120

### Database & Transaction Issues
- [ ] Fix branch creation transaction error handling
  - Location: `branches.service.ts` lines 48-72
  - Add try-catch for email/code duplicates
  
- [ ] Fix exam password generation failure handling
  - Location: `exams.service.ts` line 97
  - Use `Promise.allSettled()` instead of `Promise.all()`
  
- [ ] Fix certificate duplicate issue
  - Location: `student-portal.service.ts` line 85
  - Use `upsert()` instead of `create()`
  - Add `@@unique([studentId, examId])` to schema

### Feature Gaps
- [ ] Add endpoints to manage student credentials
  - GET /api/students/:id/credentials
  - POST /api/students/:id/credentials/generate
  - DELETE /api/students/:id/credentials/:date

- [ ] Add manual certificate issuance endpoints
  - POST /api/certificates (admin creates)
  - PATCH /api/certificates/:id/revoke
  - GET /api/certificates/:id/download

- [ ] Add missing exam endpoints
  - POST /api/exams/:id/results (manual entry)
  - PATCH /api/exams/:id/results/:studentId (update)
  
---

## 🟡 MEDIUM PRIORITY (Next 2 Weeks)

### Data Validation
- [ ] Normalize email addresses (lowercase before save)
  - All services
  
- [ ] Add file upload dimension validation
  - `upload.middleware.ts`: Add image dimension limits
  
- [ ] Add magic byte validation for file uploads
  - Verify actual file type, not just extension
  
- [ ] Add payment status transition validation
  - Can only go PENDING → PARTIAL_PAID → FULL_PAID

### Security Hardening
- [ ] Add CSRF protection
  - Install: `npm install csurf cookie-parser`
  - Configure in `app.ts`
  
- [ ] Add explicit security headers
  - Update helmet config in `app.ts`
  - Add CSP, X-Frame-Options, etc.
  
- [ ] Add input sanitization for special characters
  - Names: `/^[a-zA-Z\s'-]+$/`
  - Search strings: Max length limit
  
- [ ] Add audit logging for sensitive operations
  - Create AuditLog model in schema
  - Log: create, update, delete operations

### Database Optimization
- [ ] Add database indexes
  - Student.email, Student.branchId, Student.createdAt
  - Enrollment.studentId, Enrollment.courseId
  - Payment.studentId, Payment.status
  - ExamResult.studentId, ExamResult.examId
  - StudentCredential.examDate
  - Course.isActive
  
- [ ] Create seed script for initial data
  - Super admin creation
  - Sample courses
  - Sample branches

### Feature Implementation
- [ ] Add user management endpoints
  - POST /api/users (create user)
  - PATCH /api/users/:id (update profile)
  - PATCH /api/users/:id/change-password
  - PATCH /api/users/:id/roles (SUPER_ADMIN only)
  - DELETE /api/users/:id (deactivate)
  
- [ ] Add report generation endpoints
  - GET /api/reports/students
  - GET /api/reports/revenue
  - GET /api/reports/exams
  - POST /api/reports/export (CSV/PDF)

---

## 🟢 LOW PRIORITY (Next Month)

### Code Quality
- [ ] Add unit tests for all services
  - Target: 80% coverage
  
- [ ] Add integration tests for critical flows
  - Auth flow
  - Enrollment flow
  - Exam submission flow
  
- [ ] Add API documentation
  - Swagger/OpenAPI specs
  - Update README

### Advanced Features
- [ ] Add notification system
  - Email notifications
  - SMS for password reset
  - Payment reminders
  
- [ ] Add search optimization
  - Elasticsearch integration
  - Full-text search
  
- [ ] Add reporting & analytics
  - Revenue dashboards
  - Student performance analytics
  - Enrollment trends

---

## Module-by-Module Fix Checklist

### AUTH Module
- [x] Basic auth working
- [x] JWT implementation
- [ ] Error in `verifyRefreshToken()` - Missing throw statement
- [ ] Remove plaintext password from student credentials
- [ ] Add password complexity validation

### STUDENTS Module
- [x] List/Get/Create/Update working
- [ ] Add enrollment input validation
- [ ] Fix file upload validation (MIME type spoofing)
- [ ] Fix phone number format validation
- [ ] Add DOB validation
- [ ] Add student credential management endpoints

### BRANCHES Module
- [x] Basic CRUD working
- [ ] Fix transaction error handling
- [ ] Add Aadhar/PAN format validation
- [ ] Add password complexity validation
- [ ] Handle duplicate email on admin creation

### COURSES Module
- [x] Basic CRUD working
- [x] Question papers working
- [ ] Add course availability checks in enrollments

### EXAMS Module
- [x] Basic CRUD working
- [ ] Fix dynamic import in routes
- [ ] Add exam date validation
- [ ] Fix password generation error handling
- [ ] Fix question paper assignment validation
- [ ] Add manual result entry endpoints

### CERTIFICATES Module
- [x] List/Get working
- [ ] Fix duplicate certificate issue
- [ ] Add manual certificate issuance
- [ ] Add certificate revocation
- [ ] Add certificate download/print endpoint

### ENROLLMENTS Module (NEW)
- [ ] Create routes.ts
- [ ] Create controller.ts
- [ ] Create service.ts
- [ ] Create schema.ts
- [ ] Add validation (student/course/branch match)
- [ ] Add payment status transition validation
- [ ] Integrate with payments module

### PAYMENTS Module (NEW)
- [ ] Create routes.ts
- [ ] Create controller.ts
- [ ] Create service.ts
- [ ] Create schema.ts
- [ ] Add payment validation
- [ ] Integrate with enrollments module
- [ ] Add payment status tracking

### SCHEDULES Module (NEW)
- [ ] Add Schedule model to schema
- [ ] Create routes.ts
- [ ] Create controller.ts
- [ ] Create service.ts
- [ ] Create schema.ts
- [ ] Add conflict detection

### USERS Module (Dashboard exists)
- [x] Dashboard stats/reports working
- [ ] Add user CRUD endpoints
- [ ] Add password change endpoint
- [ ] Add role management (SUPER_ADMIN only)

### STUDENT-PORTAL Module
- [x] Exam submission working
- [ ] Fix duplicate certificate issue
- [ ] Add exam preview before submission
- [ ] Add exam submission confirmation

---

## Database Schema Changes Needed

### Create Migrations
```bash
# 1. Remove plaintext password
npx prisma migrate dev --name remove_plain_password_from_credentials

# 2. Add missing indexes
npx prisma migrate dev --name add_database_indexes

# 3. Add examId to Certificate
npx prisma migrate dev --name add_exam_id_to_certificate

# 4. Add Schedule model
npx prisma migrate dev --name add_schedule_model

# 5. Add AuditLog model (if implementing)
npx prisma migrate dev --name add_audit_log_model
```

### Schema Updates Needed
- [ ] Remove `StudentCredential.plainPassword`
- [ ] Add `Certificate.examId` with unique constraint
- [ ] Add `Schedule` model (new)
- [ ] Add `AuditLog` model (security)
- [ ] Add `PasswordReset` model (user management)
- [ ] Add timezone handling to datetime fields
- [ ] Add indexes for performance queries

---

## Testing Checklist

### Auth Flow
- [ ] User login (admin)
- [ ] Student login with daily password
- [ ] Token refresh
- [ ] Token expiration
- [ ] Invalid credentials rejection
- [ ] Logout/token revocation

### Enrollment Flow
- [ ] Create enrollment (valid student/course)
- [ ] Prevent duplicate enrollment
- [ ] Prevent cross-branch enrollment
- [ ] Update payment status
- [ ] List student's enrollments

### Exam Flow
- [ ] Create exam with courses
- [ ] Assign question papers
- [ ] Generate daily passwords
- [ ] Student takes exam
- [ ] Auto-issue certificate on pass
- [ ] View results

### File Upload Flow
- [ ] Upload student photo (valid)
- [ ] Reject oversized file
- [ ] Reject invalid file type
- [ ] Reject spoofed MIME type
- [ ] Check file storage location

### Error Handling
- [ ] Database connection fails
- [ ] Duplicate email on branch creation
- [ ] Invalid course in enrollment
- [ ] Partial password generation failure
- [ ] File upload on invalid endpoint

---

## Deployment Checklist

Before going to production:

- [ ] All plaintext password fields removed
- [ ] Environment variables validated and set
- [ ] Database indexes created
- [ ] CORS properly configured
- [ ] Security headers enabled
- [ ] CSRF protection enabled
- [ ] Error messages don't leak data
- [ ] Rate limiting configured
- [ ] Logging/monitoring setup
- [ ] Backup strategy documented
- [ ] Rollback procedure documented
- [ ] Database migration plan documented

---

## Estimated Fix Timeline

**Critical Issues (1-2 days):**
- Remove plaintext passwords
- Add missing enrollments/payments module structure
- Fix error handling in auth
- Add required validation

**High Priority (3-5 days):**
- Complete enrollments & payments modules
- Add all validation schemas
- Fix transaction error handling
- Complete certificate management

**Medium Priority (1-2 weeks):**
- Add database indexes
- Implement security hardening
- Add audit logging
- Complete user management

**Low Priority (2-4 weeks):**
- Add tests
- Add reporting
- Add notifications
- API documentation

**Total Estimated:** 4-6 weeks for comprehensive fixes

---

## Files Modified Count by Priority

| Priority | Type | Count |
|----------|------|-------|
| 🔴 Critical | Files to modify | 6 |
| 🔴 Critical | New modules | 3 |
| 🟠 High | Files to modify | 8 |
| 🟡 Medium | Files to modify | 12 |
| 🟢 Low | Files to modify | 5 |
| **Total** | **Total Files** | **34** |

---

End of Checklist
