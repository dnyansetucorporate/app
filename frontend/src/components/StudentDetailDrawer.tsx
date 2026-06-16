import React from 'react';
import { X, Edit2, Printer } from 'lucide-react';
import { StudentAvatar } from '@/components/ui/StudentAvatar';
import { formatDate } from '@/utils/helpers';

interface StudentDetailDrawerProps {
  student: any;
  onClose: () => void;
  /** If provided, shows an Edit button in the header */
  onEdit?: () => void;
  /** If provided, shows Payment History section with Print buttons */
  onPrintPayment?: (student: any, payment: any) => void;
}

export const StudentDetailDrawer: React.FC<StudentDetailDrawerProps> = ({
  student,
  onClose,
  onEdit,
  onPrintPayment,
}) => {
  const admissionDate = student.enrollments?.[0]?.enrolledAt || student.createdAt;
  const fields = [
    { label: 'Student ID', value: student.prn || student.studentId || student.id },
    { label: 'Admission Date', value: formatDate(admissionDate) },
    { label: 'Student Name', value: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name },
    { label: 'Phone Number', value: student.phone },
    { label: 'Email ID', value: student.email },
    { label: 'Address', value: student.address },
    { label: 'Selected Courses', value: student.enrollments?.map((e: any) => e.course?.name).filter(Boolean).join(', ') || 'N/A' },
    { label: 'Payment Status', value: student.enrollments?.[0]?.paymentStatus || 'N/A' },
  ];

  const payments: any[] = student.enrollments?.[0]?.payments || [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 bg-white border-b border-[#E2E8F0] sticky top-0 z-10">
          <h3 className="font-semibold text-[18px] text-[#1A2332]">View Student Details</h3>
          <div className="flex items-center gap-3">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#4DB8CA] text-[#4DB8CA] rounded-[6px] text-[13px] font-medium hover:bg-[#E6F6F9] transition-colors"
              >
                <Edit2 size={14} />
                Edit
              </button>
            )}
            <button onClick={onClose} className="text-[#64748B] hover:text-[#1A2332] transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 flex flex-col gap-6">
          <StudentAvatar photo={student.photo} firstName={student.firstName} lastName={student.lastName} />

          <div className="flex flex-col gap-5">
            {fields.map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-2">
                <label className="text-[14px] font-semibold text-[#1A2332]">{label}</label>
                <div className="px-4 py-3 bg-white border border-[#E2E8F0] rounded-[6px] text-[14px] text-[#1A2332] min-h-[46px] flex items-center">
                  {value || '—'}
                </div>
              </div>
            ))}
          </div>

          {onPrintPayment && payments.length > 0 && (
            <div className="flex flex-col gap-3 pt-2">
              <h4 className="text-[15px] font-semibold text-[#1A2332]">Payment History</h4>
              <div className="border border-[#E2E8F0] rounded-[8px] overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-[#64748B] font-medium">Amount</th>
                      <th className="text-left px-4 py-2.5 text-[#64748B] font-medium">Date</th>
                      <th className="text-left px-4 py-2.5 text-[#64748B] font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-2.5 font-semibold text-[#008A27]">
                          ₹{Number(payment.feeTaken || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-2.5 text-[#64748B]">
                          {formatDate(payment.paidAt || payment.createdAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => onPrintPayment(student, payment)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#E2E8F0] rounded-md text-[12px] font-medium text-[#1A2332] hover:bg-[#F8FAFC] transition-colors"
                          >
                            <Printer size={13} />
                            Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDetailDrawer;
