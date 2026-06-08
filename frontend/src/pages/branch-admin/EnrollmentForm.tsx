import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { enrollmentService } from '@/services/enrollment.service';
import { studentService } from '@/services/student.service';
import { courseService } from '@/services/course.service';
import { branchService } from '@/services/branch.service';
import { FormSkeleton } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';

const validationSchema = Yup.object({
  studentId: Yup.string().required('Student is required'),
  courseId: Yup.string().required('Course is required'),
  branchId: Yup.string().required('Branch is required'),
  courseFee: Yup.number()
    .required('Course fee is required')
    .positive('Course fee must be greater than 0'),
  paymentStatus: Yup.string().required('Payment status is required'),
});

export const EnrollmentForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  const formik = useFormik({
    initialValues: {
      studentId: '',
      courseId: '',
      branchId: user?.role === 'BRANCH_ADMIN' ? (user.branchId ?? '') : '',
      courseFee: '',
      paymentStatus: 'PENDING',
    },
    validationSchema,
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        const payload: any = {
          studentId: values.studentId,
          courseId: values.courseId,
          branchId: values.branchId,
          courseFee: String(values.courseFee),
          paymentStatus: values.paymentStatus,
        };
        await enrollmentService.create(payload);
        toast.success('Enrollment created successfully');
        navigate(-1);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to create enrollment');
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const requests: Promise<any>[] = [
          studentService.list({ limit: 200 }),
          courseService.list({ limit: 200 }),
        ];
        if (user?.role === 'SUPER_ADMIN') {
          requests.push(branchService.list({ limit: 200 }));
        }
        const [studRes, courseRes, branchRes] = await Promise.all(requests);
        setStudents(studRes.data || []);
        setCourses(courseRes.data || []);
        if (branchRes) setBranches(branchRes.data || []);
      } catch {
        toast.error('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.role]);

  if (loading) return <FormSkeleton />;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New Enrollment</h1>
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 text-sm">
          Back
        </button>
      </div>

      <form onSubmit={formik.handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-5">
        {/* Student */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
          <select
            name="studentId"
            value={formik.values.studentId}
            onChange={formik.handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select student...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName} ({s.prn})
              </option>
            ))}
          </select>
          {formik.touched.studentId && formik.errors.studentId && (
            <p className="text-red-600 text-xs mt-1">{formik.errors.studentId}</p>
          )}
        </div>

        {/* Course */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
          <select
            name="courseId"
            value={formik.values.courseId}
            onChange={formik.handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select course...</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {formik.touched.courseId && formik.errors.courseId && (
            <p className="text-red-600 text-xs mt-1">{formik.errors.courseId}</p>
          )}
        </div>

        {/* Branch — shown only for SUPER_ADMIN */}
        {user?.role === 'SUPER_ADMIN' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <select
              name="branchId"
              value={formik.values.branchId}
              onChange={formik.handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select branch...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.branchCode})
                </option>
              ))}
            </select>
            {formik.touched.branchId && formik.errors.branchId && (
              <p className="text-red-600 text-xs mt-1">{formik.errors.branchId}</p>
            )}
          </div>
        )}

        {/* Course Fee */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course Fee (₹)</label>
          <input
            type="number"
            name="courseFee"
            min="0"
            step="0.01"
            value={formik.values.courseFee}
            onChange={formik.handleChange}
            placeholder="Enter total course fee"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {formik.touched.courseFee && formik.errors.courseFee && (
            <p className="text-red-600 text-xs mt-1">{formik.errors.courseFee as string}</p>
          )}
        </div>

        {/* Payment Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
          <select
            name="paymentStatus"
            value={formik.values.paymentStatus}
            onChange={formik.handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="PENDING">Pending</option>
            <option value="PARTIAL_PAID">Partial Paid</option>
            <option value="FULL_PAID">Full Paid</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Enrollment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EnrollmentForm;
