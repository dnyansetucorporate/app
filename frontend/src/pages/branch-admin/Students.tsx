import React, { useState, useEffect } from 'react';
import { Search, Eye, Edit2, X, Maximize, Printer } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useNavigate } from 'react-router-dom';
import { studentService } from '@/services/student.service';
import toast from '@/utils/toastWrapper';

const Students: React.FC = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const FILE_BASE = API_URL.replace(/\/api\/?$/i, '');

  const getPhotoUrl = (p?: string | null): string | null => {
    if (!p) return null;
    if (/^https?:\/\//i.test(p)) return p;
    return `${FILE_BASE}/${String(p).replace(/^\/+/, '')}`;
  };
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [studentMeta, setStudentMeta] = useState<any>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const PAGE_SIZE = 10;
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();

  useEffect(() => {
    setPageHeader('All Students', 'View and manage all student records.', undefined, true);
  }, [setPageHeader]);

  // Debounce search — reset page + apply search together
  useEffect(() => {
    const t = setTimeout(() => {
      setCurrentPage(1);
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

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
      // Handle both flat { ...student } and nested { data: { ...student } } responses
      const student = res?.data?.id ? res.data : res?.data?.data || res?.data || null;
      setSelectedStudent(student);
      setShowStudentDetail(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintReceipt = (student: any, payment: any) => {
    const receiptWindow = window.open('', '_blank', 'width=860,height=1100');
    if (!receiptWindow) return;

    const origin = window.location.origin;
    const enrollment = student.enrollments?.[0];
    const totalFee = Number(enrollment?.courseFee || 0);
    const sortedPayments = [...(enrollment?.payments || [])].sort(
      (a: any, b: any) => new Date(a.paidAt || a.createdAt).getTime() - new Date(b.paidAt || b.createdAt).getTime()
    );

    const fmtDate = (d: string | null | undefined): string => {
      if (!d) return '';
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return '';
      return `${dt.getFullYear()}-${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    };

    const invoiceNo = (() => {
      let h = 0;
      for (let i = 0; i < payment.id.length; i++) h = ((h << 5) - h + payment.id.charCodeAt(i)) | 0;
      return String((Math.abs(h) % 9000) + 1000);
    })();

    const studentName = `${student.firstName || ''} ${student.middleName ? student.middleName + ' ' : ''}${student.lastName || ''}`.trim();
    const branchName = student.branch?.name || 'DnyanSetu Institute';
    const branchAddress = [branchName, student.branch?.address, student.branch?.location].filter(Boolean).join(', ');
    const branchPhone = student.branch?.phone1 || '+91 987 654 3210';
    const branchEmail = student.branch?.admin?.email || 'dnyansetu@gmail.com';

    let cum = 0;
    const tableRows = sortedPayments.map((p: any, i: number) => {
      cum += Number(p.feeTaken || 0);
      const rem = Math.max(0, totalFee - cum);
      return `<tr>
        <td style="padding:24px 16px;font-size:13px;color:#1F2937;border:1px solid #d0e0e8;">${i + 1}</td>
        <td style="padding:24px 16px;font-size:13px;color:#1F2937;border:1px solid #d0e0e8;">${fmtDate(p.paidAt || p.createdAt)}</td>
        <td style="padding:24px 16px;font-size:13px;color:#1F2937;border:1px solid #d0e0e8;">${Number(p.feeTaken || 0).toLocaleString('en-IN')}</td>
        <td style="padding:24px 16px;font-size:13px;color:#1F2937;border:1px solid #d0e0e8;">${rem.toLocaleString('en-IN')}</td>
        <td style="padding:24px 16px;font-size:13px;color:#1F2937;border:1px solid #d0e0e8;">${p.nextInstallmentDate ? fmtDate(p.nextInstallmentDate) : ''}</td>
      </tr>`;
    }).join('');

    const emptyRow = tableRows ? '' : `<tr><td colspan="5" style="padding:32px 16px;text-align:center;font-size:13px;color:#9CA3AF;border:1px solid #dce8ee;">No payment records</td></tr>`;

    receiptWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Invoice - ${invoiceNo}</title>
  <meta charset="utf-8">
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    html, body { width: 210mm; margin: 0 auto; background: white; font-family: Arial, Helvetica, sans-serif; }
    .page { width: 210mm; min-height: 297mm; background: white; display: flex; flex-direction: column; }
    .content { flex: 1; display: flex; flex-direction: column; }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="display:flex;height:120px;flex-shrink:0;">
    <div style="width:42%;display:flex;align-items:center;padding:0 30px;">
      <img src="${origin}/logo-invoice.png" style="height:54px;width:auto;display:block;" alt="DnyanSetu">
    </div>
    <div style="flex:1;background:#1A7A8E;-webkit-print-color-adjust:exact;print-color-adjust:exact;display:flex;align-items:center;justify-content:flex-end;padding-right:30px;">
      <span style="color:white;font-size:78px;font-weight:900;font-family:Arial Black,Arial,sans-serif;letter-spacing:2px;line-height:1;">INVOICE</span>
    </div>
  </div>

  <!-- Content (flex:1 pushes footer to bottom) -->
  <div class="content">

    <!-- Meta info -->
    <div style="padding:30px 30px 18px 30px;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;margin-bottom:22px;">
        <span style="font-size:14px;color:#374151;line-height:1.6;">Invoice No: <strong style="color:#111827;">${invoiceNo}</strong></span>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Date: <strong style="color:#111827;">${fmtDate(new Date().toISOString())}</strong></span>
        <span></span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;margin-bottom:22px;">
        <span style="font-size:14px;color:#374151;line-height:1.6;">Name: <strong style="color:#111827;">${studentName}</strong></span>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Phone No: <strong style="color:#111827;">${student.phone || 'N/A'}</strong></span>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Email: <strong style="color:#111827;">${student.email || 'N/A'}</strong></span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;margin-bottom:22px;">
        <span style="font-size:14px;color:#374151;line-height:1.6;">PRN No: <strong style="color:#111827;">${student.prn || 'N/A'}</strong></span>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Admission Date: <strong style="color:#111827;">${fmtDate(enrollment?.enrolledAt)}</strong></span>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Course Fees: <strong style="color:#111827;">${totalFee.toLocaleString('en-IN')}</strong></span>
      </div>
      <div>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Course Name: <strong style="color:#111827;">${enrollment?.course?.name || 'N/A'}</strong></span>
      </div>
    </div>

    <!-- Table -->
    <div style="padding:8px 30px 16px 30px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#d4e8f2;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
            <th style="padding:13px 16px;text-align:left;font-size:13px;font-weight:400;color:#374151;border:1px solid #c5d8e2;">Sr. No</th>
            <th style="padding:13px 16px;text-align:left;font-size:13px;font-weight:400;color:#374151;border:1px solid #c5d8e2;">Date</th>
            <th style="padding:13px 16px;text-align:left;font-size:13px;font-weight:400;color:#374151;border:1px solid #c5d8e2;">Fees Paid</th>
            <th style="padding:13px 16px;text-align:left;font-size:13px;font-weight:400;color:#374151;border:1px solid #c5d8e2;">Fees Remaining</th>
            <th style="padding:13px 16px;text-align:left;font-size:13px;font-weight:400;color:#374151;border:1px solid #c5d8e2;">Next Installment Date</th>
          </tr>
        </thead>
        <tbody>${tableRows || emptyRow}</tbody>
      </table>
    </div>

    <!-- Note + Signature -->
    <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding:16px 30px 40px 30px;gap:12px;">
      <div style="padding:10px 14px;background:#FEF3C7;border:1px solid #FCD34D;border-radius:4px;font-size:12px;color:#92400E;font-style:italic;">
        <strong>Note:</strong> Fees once paid is not refundable at any reason.
      </div>
      <div style="display:flex;justify-content:flex-end;">
        <span style="font-size:13px;font-weight:400;color:#1F2937;letter-spacing:0.2px;">DNYANSETU EDUCATION &amp; IT INSTITUTION INDIA</span>
      </div>
    </div>

  </div><!-- end .content -->

  <!-- Footer (always at page bottom) -->
  <div style="flex-shrink:0;background:#1A7A8E;-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:22px 30px;display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <p style="font-weight:700;font-size:13px;color:white;margin-bottom:7px;">Institute Address:</p>
      <p style="font-size:11.5px;color:rgba(255,255,255,0.85);max-width:380px;line-height:1.65;">${branchAddress}</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end;padding-top:2px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 9.5a19.79 19.79 0 01-3.13-8.63A2 2 0 013.54 3h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.91 10.5a16 16 0 006 6l.92-.92a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0121.5 18z"/></svg>
        <span style="font-size:13px;color:white;">${branchPhone}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
        <span style="font-size:13px;color:white;">${branchEmail}</span>
      </div>
    </div>
  </div>

</div>
<script>window.onload = function() { window.print(); };</script>
</body>
</html>`);
    receiptWindow.document.close();
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
      // Payments are returned latest-first from backend; print the latest receipt.
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
                students.map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{idx + 1}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{s.prn || s.studentId || s.id}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{s.name || `${s.firstName || ''} ${s.lastName || ''}`}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{s.phone}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{s.course || s.enrollments?.[0]?.course?.name || 'N/A'}</td>
                    <td className="py-4 px-6 text-[14px]">
                      {(() => {
                        const ps = s.status || s.enrollments?.[0]?.paymentStatus || 'PENDING';
                        const label = ps === 'FULL_PAID' ? 'Full Paid' : ps === 'PARTIAL_PAID' ? 'Partial Paid' : 'Pending';
                        const cls = ps === 'FULL_PAID' ? 'border-[#00A925] text-[#00A925]' : ps === 'PARTIAL_PAID' ? 'border-[#EAB308] text-[#EAB308]' : 'border-[#64748B] text-[#64748B]';
                        return <span className={cn('px-3 py-1 rounded-[4px] border text-[12px] bg-white', cls)}>{label}</span>;
                      })()}
                    </td>
                    <td className="py-4 px-6">
                      {(() => {
                        const ps = s.status || s.enrollments?.[0]?.paymentStatus || 'PENDING';
                        const isFullPaid = ps === 'FULL_PAID';
                        return (
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
                        );
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {(() => {
          const total      = studentMeta?.total      ?? students.length;
          const totalPages = studentMeta?.totalPages ?? 1;
          const from       = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
          const to         = Math.min(currentPage * PAGE_SIZE, total);
          const pages      = Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1);
          return (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0] bg-white">
              <p className="text-[14px] text-[#64748B]">Showing data {from} to {to} of {total} Students</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"><span className="text-sm font-bold">{'<'}</span></button>
                {pages.map(p => (
                  <button key={p} onClick={() => setCurrentPage(p)} className={cn('w-8 h-8 flex items-center justify-center rounded text-[14px] transition-colors', p === currentPage ? 'bg-[#0A3D4D] text-white' : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-gray-50')}>{p}</button>
                ))}
                {totalPages > 4 && <span className="px-1 text-[#94A3B8]">...</span>}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"><span className="text-sm font-bold">{'>'}</span></button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Student Detail Drawer */}
      {showStudentDetail && selectedStudent && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setShowStudentDetail(false)}
        >
            <div
              className="bg-white w-full max-w-lg h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-8 py-6 bg-white border-b border-[#E2E8F0] sticky top-0 z-10">
              <h3 className="font-semibold text-[18px] text-[#1A2332]">View Student Details</h3>
              <button 
                onClick={() => setShowStudentDetail(false)} 
                className="text-[#64748B] hover:text-[#1A2332] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 flex flex-col gap-6">
              {(() => {
                const photoUrl = getPhotoUrl(selectedStudent.photo);
                const initials = [selectedStudent.firstName, selectedStudent.lastName]
                  .filter(Boolean)
                  .map((n: string) => n[0].toUpperCase())
                  .join('') || '?';
                return (
                  <div className="relative w-32 h-32">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        className="w-full h-full rounded-[16px] object-cover"
                        alt="Student"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                          const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                          if (sibling) sibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full rounded-[16px] bg-[#E6F0FA] flex items-center justify-center text-[#1A2332] text-3xl font-bold select-none"
                      style={{ display: photoUrl ? 'none' : 'flex' }}
                    >
                      {initials}
                    </div>
                    {photoUrl && (
                      <div
                        onClick={() => window.open(photoUrl, '_blank', 'noopener,noreferrer')}
                        className="absolute bottom-2 right-2 bg-black/50 p-1.5 rounded-[4px] cursor-pointer hover:bg-black/70 transition-colors"
                      >
                        <Maximize size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                );
              })()}
              
              <div className="flex flex-col gap-5">
                {[
                  { label: 'Student ID', value: selectedStudent.prn || selectedStudent.studentId || selectedStudent.id },
                  { label: 'Admission Date', value: (() => { const d = selectedStudent.createdAt; return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined; })() },
                  { label: 'Student Name', value: `${selectedStudent.firstName || ''} ${selectedStudent.lastName || ''}`.trim() || selectedStudent.name },
                  { label: 'Phone Number', value: selectedStudent.phone },
                  { label: 'Email ID', value: selectedStudent.email },
                  { label: 'Address', value: selectedStudent.address },
                  { label: 'Selected Courses', value: selectedStudent.enrollments?.map((e:any) => e.course?.name).join(', ') || 'N/A' },
                  { label: 'Payment Status', value: selectedStudent.enrollments?.[0]?.paymentStatus || 'N/A' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-2">
                    <label className="text-[14px] font-semibold text-[#1A2332]">{label}</label>
                    <div className="px-4 py-3 bg-white border border-[#E2E8F0] rounded-[6px] text-[14px] text-[#1A2332] min-h-[46px] flex items-center">
                      {value || '—'}
                    </div>
                  </div>
                ))}
              </div>

              {selectedStudent.enrollments?.[0]?.payments?.length > 0 && (
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
                        {selectedStudent.enrollments[0].payments.map((payment: any) => (
                          <tr key={payment.id} className="hover:bg-[#F8FAFC]">
                            <td className="px-4 py-2.5 font-semibold text-[#008A27]">
                              ₹{Number(payment.feeTaken || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-2.5 text-[#64748B]">
                              {new Date(payment.paidAt || payment.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="px-4 py-2.5">
                              <button
                                type="button"
                                onClick={() => handlePrintReceipt(selectedStudent, payment)}
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
      )}
    </div>
  );
};

export default Students;
