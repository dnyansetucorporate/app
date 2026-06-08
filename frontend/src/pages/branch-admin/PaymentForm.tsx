import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { paymentService } from '@/services/payment.service';
import { enrollmentService } from '@/services/enrollment.service';
import { FormSkeleton } from '@/components/SkeletonLoader';
import { AlertTriangle } from 'lucide-react';

const validationSchema = Yup.object({
  enrollmentId: Yup.string().required('Enrollment is required'),
  feeTaken: Yup.number()
    .required('Fee taken is required')
    .positive('Fee taken must be greater than 0'),
  nextInstallmentDate: Yup.string().optional(),
});

interface Enrollment {
  id: string;
  studentName: string;
  studentEmail: string;
  courseName: string;
  courseFee: number;
}

export const PaymentForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(!!id);
  const [submitting, setSubmitting] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [showEnrollmentList, setShowEnrollmentList] = useState(false);
  const [totalPaidForEnrollment] = useState(0);

  const formik = useFormik({
    initialValues: {
      enrollmentId: '',
      feeTaken: '',
      nextInstallmentDate: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        const selectedEnrollment = enrollments.find((e) => e.id === values.enrollmentId);
        if (!selectedEnrollment) {
          toast.error('Enrollment not found');
          return;
        }

        // Require next installment date for partial payments
        const feeVal = parseFloat(values.feeTaken);
        const isPartial = feeVal > 0 && feeVal < selectedEnrollment.courseFee;
        if (isPartial && !values.nextInstallmentDate) {
          toast.error('Please select the next installment date for partial payments');
          setSubmitting(false);
          return;
        }

        const payload: any = {
          enrollmentId: values.enrollmentId,
          feeTaken: parseFloat(values.feeTaken),
          ...(values.nextInstallmentDate ? { nextInstallmentDate: values.nextInstallmentDate } : {}),
        };

        if (id) {
          await paymentService.update(id, payload);
          toast.success('Payment updated successfully');
        } else {
          await paymentService.create(payload);
          toast.success('Payment created successfully');
        }
        navigate(-1);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Operation failed');
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Load enrollments on mount
  useEffect(() => {
    const loadEnrollments = async () => {
      try {
        const response = await enrollmentService.list({ limit: 100 });
        const formattedEnrollments: Enrollment[] = response.data?.map((item: any) => ({
          id: item.id,
          studentName: `${item.student?.firstName || ''} ${item.student?.lastName || ''}`.trim(),
          studentEmail: item.student?.email || '',
          courseName: item.course?.name || '',
          courseFee: parseFloat(item.courseFee) || 0,
        })) || [];
        setEnrollments(formattedEnrollments);
      } catch (error) {
        console.error('Failed to load enrollments');
        toast.error('Failed to load enrollments');
      }
    };

    loadEnrollments();
  }, []);

  // Load existing payment if editing
  useEffect(() => {
    if (id) {
      const loadPayment = async () => {
        try {
          const response = await paymentService.getById(id);
          const payment = response.data;
          formik.setValues({
            enrollmentId: payment.enrollmentId,
            feeTaken: payment.feeTaken.toString(),
            nextInstallmentDate: payment.nextInstallmentDate
              ? new Date(payment.nextInstallmentDate).toISOString().split('T')[0]
              : '',
          });
        } catch (error: any) {
          toast.error('Failed to load payment');
          navigate(-1);
        } finally {
          setLoading(false);
        }
      };
      loadPayment();
    }
  }, [id]);

  const filteredEnrollments = enrollments.filter((e) => {
    if (!enrollmentSearch) return true;
    const searchLower = enrollmentSearch.toLowerCase();
    return (
      e.studentName.toLowerCase().includes(searchLower) ||
      e.studentEmail.toLowerCase().includes(searchLower) ||
      e.courseName.toLowerCase().includes(searchLower)
    );
  });

  const selectedEnrollment = enrollments.find((e) => e.id === formik.values.enrollmentId);
  const feeTaken = formik.values.feeTaken ? parseFloat(formik.values.feeTaken) : 0;
  const courseFee = selectedEnrollment?.courseFee || 0;
  const isFullPayment = feeTaken > 0 && feeTaken === courseFee;
  const isInstallment = feeTaken > 0 && feeTaken < courseFee;
  const isValidAmount = feeTaken > 0 && feeTaken <= courseFee;

  if (loading) return <FormSkeleton />;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {id ? 'Edit Payment' : 'Record Payment'}
        </h1>

        <form onSubmit={formik.handleSubmit} className="space-y-6">
          {/* Enrollment Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Course Enrollment <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEnrollmentList(!showEnrollmentList)}
                className="w-full text-left px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:bg-gray-50 transition"
              >
                {selectedEnrollment ? (
                  <div>
                    <div className="font-medium text-gray-900">{selectedEnrollment.studentName}</div>
                    <div className="text-sm text-gray-500">
                      {selectedEnrollment.courseName} • ₹{selectedEnrollment.courseFee.toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-500">Select an enrollment...</span>
                )}
              </button>

              {showEnrollmentList && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 rounded-lg bg-white shadow-lg z-10">
                  <input
                    type="text"
                    placeholder="Search by student, course, or email..."
                    value={enrollmentSearch}
                    onChange={(e) => setEnrollmentSearch(e.target.value)}
                    className="w-full px-4 py-2 border-b border-gray-300 focus:outline-none"
                  />
                  <div className="max-h-64 overflow-y-auto">
                    {filteredEnrollments.length === 0 ? (
                      <div className="px-4 py-3 text-center text-gray-500 text-sm">
                        No enrollments found
                      </div>
                    ) : (
                      filteredEnrollments.map((enrollment) => (
                        <button
                          key={enrollment.id}
                          type="button"
                          onClick={() => {
                            formik.setFieldValue('enrollmentId', enrollment.id);
                            formik.setFieldValue('feeTaken', '');
                            setShowEnrollmentList(false);
                            setEnrollmentSearch('');
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{enrollment.studentName}</div>
                          <div className="text-sm text-gray-500">{enrollment.courseName}</div>
                          <div className="text-sm text-gray-400">Fee: ₹{enrollment.courseFee.toFixed(2)}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {formik.touched.enrollmentId && formik.errors.enrollmentId && (
              <p className="text-red-600 text-sm mt-1">{formik.errors.enrollmentId}</p>
            )}
          </div>

          {/* Course Details Card */}
          {selectedEnrollment && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Student</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedEnrollment.studentName}</p>
                  <p className="text-xs text-gray-500">{selectedEnrollment.studentEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Course</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedEnrollment.courseName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Course Total Fee</p>
                  <p className="text-lg font-bold text-blue-600 mt-1">₹{selectedEnrollment.courseFee.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Remaining Balance</p>
                  <p className="text-lg font-bold text-orange-600 mt-1">
                    ₹{Math.max(0, courseFee - totalPaidForEnrollment).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Fee Taken + Next Installment Date (side by side when installment) */}
          <div className={`grid gap-4 ${isInstallment ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* Fee Taken */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fee Taken (Amount in this payment) <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-gray-600 font-medium">₹</span>
                <input
                  type="number"
                  step="0.01"
                  {...formik.getFieldProps('feeTaken')}
                  disabled={!selectedEnrollment}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder={selectedEnrollment ? 'Enter amount' : 'Select enrollment first'}
                />
              </div>
              {formik.touched.feeTaken && formik.errors.feeTaken && (
                <p className="text-red-600 text-sm mt-1">{formik.errors.feeTaken}</p>
              )}
            </div>

            {/* Next Installment Date — only visible for partial/installment payments */}
            {isInstallment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Next Installment Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  {...formik.getFieldProps('nextInstallmentDate')}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formik.touched.nextInstallmentDate && formik.errors.nextInstallmentDate && (
                  <p className="text-red-600 text-sm mt-1">{formik.errors.nextInstallmentDate as string}</p>
                )}
              </div>
            )}
          </div>

          {/* Validation Messages */}
          <div>
            {feeTaken > 0 && selectedEnrollment && (
              <div className="mt-3 space-y-2">
                {isFullPayment && (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-sm font-medium text-green-800">
                      ✓ Full payment complete - student will pay entire fee in single installment
                    </p>
                  </div>
                )}
                {isInstallment && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-sm font-medium text-yellow-800">
                      ℹ Installment payment - student will pay remaining ₹{(courseFee - feeTaken).toFixed(2)} in future installments
                    </p>
                  </div>
                )}
                {!isValidAmount && feeTaken > courseFee && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-red-800">
                      Fee taken (₹{feeTaken.toFixed(2)}) exceeds course fee (₹{courseFee.toFixed(2)})
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary Card */}
          {feeTaken > 0 && selectedEnrollment && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">This Payment</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">₹{feeTaken.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Total Fee</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">₹{courseFee.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Remaining</p>
                  <p className="text-lg font-bold text-orange-600 mt-1">
                    ₹{Math.max(0, courseFee - feeTaken).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 justify-end pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isValidAmount}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : id ? 'Update Payment' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentForm;
