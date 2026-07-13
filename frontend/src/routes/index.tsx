import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '@/components/layout/AuthLayout';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StudentLayout from '@/components/layout/StudentLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

import LoginPage from '@/pages/auth/Login';

const VerifyCertificate = React.lazy(() => import('@/pages/public/VerifyCertificate'));

// Super Admin (lazy)
const SuperAdminDashboard = React.lazy(() => import('@/pages/superadmin/Dashboard'));
const AllBranches = React.lazy(() => import('@/pages/superadmin/Branches'));
const AddBranch = React.lazy(() => import('@/pages/superadmin/AddBranch'));
const EditBranch = React.lazy(() => import('@/pages/superadmin/EditBranch'));
const Courses = React.lazy(() => import('@/pages/superadmin/Courses'));
const Exams = React.lazy(() => import('@/pages/superadmin/Exams'));
const Certificates = React.lazy(() => import('@/pages/superadmin/Certificates'));
const SuperAdminSettings = React.lazy(() => import('@/pages/superadmin/Settings'));

// Branch Admin (lazy)
const AdminDashboard = React.lazy(() => import('@/pages/branch-admin/Dashboard'));
const AllStudents = React.lazy(() => import('@/pages/branch-admin/Students'));
const AddStudent = React.lazy(() => import('@/pages/branch-admin/AddStudent'));
const EditStudentSuperAdmin = React.lazy(() => import('@/pages/branch-admin/AddStudent'));
const ScheduleExam = React.lazy(() => import('@/pages/branch-admin/ScheduleExam'));
const ExamResults = React.lazy(() => import('@/pages/branch-admin/ExamResults'));
const PaymentList = React.lazy(() => import('@/pages/branch-admin/PaymentList'));
const PaymentForm = React.lazy(() => import('@/pages/branch-admin/PaymentForm'));
const PaymentDetail = React.lazy(() => import('@/pages/branch-admin/PaymentDetail'));
const EnrollmentList = React.lazy(() => import('@/pages/branch-admin/EnrollmentList'));
const EnrollmentForm = React.lazy(() => import('@/pages/branch-admin/EnrollmentForm'));
const ScheduleList = React.lazy(() => import('@/pages/branch-admin/ScheduleList'));

// Student (lazy)
const SelectExam = React.lazy(() => import('@/pages/student/SelectExam'));
const ActiveExam = React.lazy(() => import('@/pages/student/ActiveExam'));
const ExamSuccess = React.lazy(() => import('@/pages/student/ExamSuccess'));

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<div />}> 
      <Routes>
      {/* Root redirection to login */}
      <Route path="/" element={<Navigate to="/auth/login" replace />} />

      {/* Auth Routes */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
        </Route>

      {/* Public Routes (no login required) */}
        <Route path="/verify-certificate" element={<VerifyCertificate />} />

      {/* Super Admin Routes */}
        <Route path="/super-admin" element={
        <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
          <DashboardLayout />
        </ProtectedRoute>
      }>
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="branches" element={<AllBranches />} />
          <Route path="add-branch" element={<AddBranch />} />
          <Route path="edit-branch/:id" element={<EditBranch />} />
          <Route path="courses" element={<Courses />} />
          <Route path="exams" element={<Exams />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="settings" element={<SuperAdminSettings />} />
          <Route path="edit-student/:id" element={<EditStudentSuperAdmin />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Branch Admin Routes */}
      <Route path="/branch-admin" element={
        <ProtectedRoute allowedRoles={['BRANCH_ADMIN']}>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="students" element={<AllStudents />} />
        <Route path="add-student" element={<AddStudent />} />
        <Route path="edit-student/:id" element={<AddStudent />} />
        <Route path="schedule-exam" element={<ScheduleExam />} />
        <Route path="exam-results" element={<ExamResults />} />
        <Route path="payments" element={<PaymentList />} />
        <Route path="payments/create" element={<PaymentForm />} />
        <Route path="payments/edit/:id" element={<PaymentForm />} />
        <Route path="payments/detail/:id" element={<PaymentDetail />} />
        <Route path="enrollments" element={<EnrollmentList />} />
        <Route path="enrollments/create" element={<EnrollmentForm />} />
        <Route path="schedules" element={<ScheduleList />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Student Routes */}
      <Route path="/student" element={
        <ProtectedRoute allowedRoles={['STUDENT']}>
          <StudentLayout />
        </ProtectedRoute>
      }>
        <Route path="select-exam" element={<SelectExam />} />
        <Route path="exam" element={<ActiveExam />} />
        <Route path="exam-success" element={<ExamSuccess />} />
        <Route index element={<Navigate to="select-exam" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
