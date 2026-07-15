import React, { useState, useEffect } from 'react';
import { Search, Eye, Edit2, Printer } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useNavigate } from 'react-router-dom';
import { studentService } from '@/services/student.service';
import toast from '@/utils/toastWrapper';
import { getInvoiceNumber, buildInstallments, openPrintInvoice } from '@/utils/invoiceUtils';
import { PaymentStatusBadge } from '@/components/ui/PaymentStatusBadge';
import { StudentDetailDrawer } from '@/components/StudentDetailDrawer';
import { useSearchDebounce } from '@/hooks/useSearchDebounce';

const Students: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [studentMeta, setStudentMeta] = useState<any>(null);
  const PAGE_SIZE = 10;
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  const { searchInput, setSearchInput, searchTerm: search } = useSearchDebounce(setCurrentPage);

  useEffect(() => {
    setPageHeader('All Students', 'View and manage all student records.', undefined, true);
  }, [setPageHeader]);

  useEffect(() => {
    fetchStudents();
  }, [currentPage, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res: any = await studentService.list({ page: currentPage, limit: PAGE_SIZE, search: search || undefined });
      setStudents(res?.data || []);
      setStudentMeta(res?.meta || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openStudent = async (id: string | number) => {
    try {
      const res: any = await studentService.getById(String(id));
      const student = res?.data?.id ? res.data : res?.data?.data || res?.data || null;
      setSelectedStudent(student);
      setShowStudentDetail(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintReceipt = (student: any, payment: any) => {
    const enrollment = student.enrollments?.[0];
    const courseFee = Number(enrollment?.courseFee || 0);
    openPrintInvoice({
      invoiceNo: getInvoiceNumber(payment.id),
      invoiceDate: new Date().toISOString(),
      studentName: `${student.firstName || ''} ${student.middleName ? student.middleName + ' ' : ''}${student.lastName || ''}`.trim(),
      phone: student.phone || 'N/A',
      email: student.email || 'N/A',
      prn: student.prn || 'N/A',
      admissionDate: enrollment?.enrolledAt || '',
      courseFee,
      courseName: enrollment?.course?.name || 'N/A',
      installments: buildInstallments(enrollment?.payments || [], courseFee),
      branchAddress: student.branch?.address || 'Hadapsar, Pune',
      branchPhone: student.branch?.phone1 || '+91 987 654 3210',
      branchEmail: student.branch?.admin?.email || 'dnyansetu@gmail.com',
      logoUrl: `${window.location.origin}/logo-invoice.png`,
    });
  };

  const handleQuickPrintFromTable = async (studentId: string) => {
    try {
      const res: any = await studentService.getById(studentId);
      const student = res?.data || res;
      const payments = student?.enrollments?.[0]?.payments || [];
      if (!payments.length) {
        toast.error('No payment found for this student');
        return;
      }
      handlePrintReceipt(student, payments[0]);
    } catch (err) {
      console.error('Failed to fetch payment receipt data', err);
      toast.error('Unable to print receipt right now');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden border border-[#E2E8F0]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h4 className="text-[18px] font-bold text-[#1A2332]">
            Students list ({studentMeta?.total ?? students.length} Students)
          </h4>
          <div className="flex items-center gap-2 w-full max-w-xs px-3 py-2 bg-white border border-[#E2E8F0] rounded-[8px]">
            <Search size={16} className="text-[#64748B]" />
            <input
              type="text"
              placeholder="Search by name, ID, course"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-[14px] w-full text-[#1A2332] placeholder:text-[#64748B]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#4DB8CA] text-white text-[14px]">
              <tr>
                <th className="py-4 px-6 font-medium whitespace-nowrap">Sr. No</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">Student ID</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">Student Name</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">Phone No</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">Course Name</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">Payment Status</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">Loading students...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">No students found.</td>
                </tr>
              ) : (
                students.map((s, idx) => {
                  const ps = s.status || s.enrollments?.[0]?.paymentStatus || 'PENDING';
                  const isFullPaid = ps === 'FULL_PAID';
                  return (
                    <tr key={s.id || idx} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-4 px-6 text-[14px] text-[#1A2332]">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="py-4 px-6 text-[14px] text-[#1A2332]">{s.prn || s.studentId || s.id}</td>
                      <td className="py-4 px-6 text-[14px] text-[#1A2332]">{s.name || `${s.firstName || ''} ${s.lastName || ''}`}</td>
                      <td className="py-4 px-6 text-[14px] text-[#1A2332]">{s.phone}</td>
                      <td className="py-4 px-6 text-[14px] text-[#1A2332]">{s.course || s.enrollments?.[0]?.course?.name || 'N/A'}</td>
                      <td className="py-4 px-6 text-[14px]">
                        <PaymentStatusBadge status={ps} />
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="text-[#4DB8CA] border border-[#4DB8CA] rounded-[4px] p-1.5 hover:bg-[#E6F6F9] transition-colors"
                            onClick={() => openStudent(s.id)}
                          >
                            <Eye size={16} />
                          </button>
                          {!isFullPaid && (
                            <button
                              className="text-[#4DB8CA] border border-[#4DB8CA] rounded-[4px] p-1.5 hover:bg-[#E6F6F9] transition-colors"
                              onClick={() => navigate(`/branch-admin/edit-student/${s.id}`)}
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          <button
                            className="text-[#4DB8CA] border border-[#4DB8CA] rounded-[4px] p-1.5 hover:bg-[#E6F6F9] transition-colors"
                            onClick={() => handleQuickPrintFromTable(String(s.id))}
                            title="Print latest receipt"
                          >
                            <Printer size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {(() => {
          const total      = studentMeta?.total      ?? students.length;
          const totalPages = studentMeta?.totalPages ?? 1;
          const from       = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
          const to         = Math.min(currentPage * PAGE_SIZE, total);
          const windowSize = 4;
          let start = Math.max(1, currentPage - 1);
          let end   = Math.min(totalPages, start + windowSize - 1);
          start     = Math.max(1, end - windowSize + 1);
          const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
          return (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0] bg-white">
              <p className="text-[14px] text-[#64748B]">Showing data {from} to {to} of {total} Students</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"><span className="text-sm font-bold">{'<'}</span></button>
                {start > 1 && <span className="px-1 text-[#94A3B8]">...</span>}
                {pages.map(p => (
                  <button key={p} onClick={() => setCurrentPage(p)} className={cn('w-8 h-8 flex items-center justify-center rounded text-[14px] transition-colors', p === currentPage ? 'bg-[#0A3D4D] text-white' : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-gray-50')}>{p}</button>
                ))}
                {end < totalPages && <span className="px-1 text-[#94A3B8]">...</span>}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"><span className="text-sm font-bold">{'>'}</span></button>
              </div>
            </div>
          );
        })()}
      </div>

      {showStudentDetail && selectedStudent && (
        <StudentDetailDrawer
          student={selectedStudent}
          onClose={() => setShowStudentDetail(false)}
          onPrintPayment={handlePrintReceipt}
        />
      )}
    </div>
  );
};

export default Students;
