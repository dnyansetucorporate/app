-- ============================================================
-- Migration: 001_init
-- Education Management System - Initial Schema
-- Run against PostgreSQL after configuring DATABASE_URL
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────
-- Enums
-- ────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'BRANCH_ADMIN', 'STUDENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('FULL_PAID', 'PARTIAL_PAID', 'PENDING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ExamStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "CertificateStatus" AS ENUM ('ISSUED', 'PENDING', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ────────────────────────────────────────────
-- users
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          "Role"      NOT NULL DEFAULT 'BRANCH_ADMIN',
  avatar        TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- branches
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_code TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  address     TEXT        NOT NULL,
  location    TEXT        NOT NULL,
  aadhar_no   TEXT,
  pan_no      TEXT,
  phone1      TEXT        NOT NULL,
  phone2      TEXT,
  admin_id    TEXT        NOT NULL UNIQUE REFERENCES users(id),
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- courses
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT        NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- question_papers
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question_papers (
  id        TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  course_id TEXT        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title     TEXT        NOT NULL,
  is_active BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- questions
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question_paper_id TEXT        NOT NULL REFERENCES question_papers(id) ON DELETE CASCADE,
  question_no       INTEGER     NOT NULL,
  question_text     TEXT        NOT NULL,
  options           JSONB       NOT NULL,   -- string[]
  correct_option    INTEGER     NOT NULL,   -- 0-indexed
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- students
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  prn        TEXT        NOT NULL UNIQUE,
  first_name TEXT        NOT NULL,
  last_name  TEXT        NOT NULL,
  email      TEXT        NOT NULL UNIQUE,
  phone      TEXT        NOT NULL,
  dob        DATE,
  branch_id  TEXT        NOT NULL REFERENCES branches(id),
  photo      TEXT,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- enrollments
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
  id             TEXT            PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id     TEXT            NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id      TEXT            NOT NULL REFERENCES courses(id),
  branch_id      TEXT            NOT NULL REFERENCES branches(id),
  payment_status "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  enrolled_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

-- ────────────────────────────────────────────
-- payments
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id         TEXT            PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT            NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  branch_id  TEXT            NOT NULL REFERENCES branches(id),
  amount     NUMERIC(10, 2)  NOT NULL,
  status     "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  paid_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- exams
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id         TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id  TEXT         NOT NULL REFERENCES branches(id),
  exam_date  TIMESTAMPTZ  NOT NULL,
  status     "ExamStatus" NOT NULL DEFAULT 'PENDING',
  notes      TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- exam_courses
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_courses (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  exam_id           TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  course_id         TEXT NOT NULL REFERENCES courses(id),
  question_paper_id TEXT REFERENCES question_papers(id),
  UNIQUE(exam_id, course_id)
);

-- ────────────────────────────────────────────
-- exam_results
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_results (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  exam_id    TEXT        NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id TEXT        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  marks      INTEGER     NOT NULL,
  passed     BOOLEAN     NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

-- ────────────────────────────────────────────
-- certificates
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id         TEXT                PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT                NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  branch_id  TEXT                NOT NULL REFERENCES branches(id),
  course_id  TEXT                REFERENCES courses(id),
  exam_date  TIMESTAMPTZ,
  marks      INTEGER,
  status     "CertificateStatus" NOT NULL DEFAULT 'PENDING',
  issued_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- Indexes for common query patterns
-- ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_branches_admin_id   ON branches(admin_id);
CREATE INDEX IF NOT EXISTS idx_students_branch_id  ON students(branch_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course  ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_branch  ON enrollments(branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_student    ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_branch     ON payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_exams_branch        ON exams(branch_id);
CREATE INDEX IF NOT EXISTS idx_exams_status        ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam   ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_certificates_branch ON certificates(branch_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_qpapers_course      ON question_papers(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_paper     ON questions(question_paper_id);
