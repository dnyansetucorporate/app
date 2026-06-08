import React, { useState, useEffect } from 'react';
import { Search, Eye, ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, X, Loader2, ChevronDown, Lock, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/helpers';
import toast from '@/utils/toastWrapper';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { examService } from '@/services/exam.service';
import { courseService } from '@/services/course.service';

const Exams: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [examMeta, setExamMeta] = useState<any>(null);
  const [searchInput, setSearchInput] = useState('');
  const [examSearch, setExamSearch] = useState('');
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDetails, setViewDetails] = useState<any | null>(null);
  const [papersByCourse, setPapersByCourse] = useState<Record<string, any[]>>({});
  const [selectedPapers, setSelectedPapers] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentModalList, setStudentModalList] = useState<any[]>([]);
  const [studentModalLoading, setStudentModalLoading] = useState(false);
  const [generatedPasswords, setGeneratedPasswords] = useState<any>(null);
  // Approved exam drilldown state
  const [approvedStudents, setApprovedStudents] = useState<any[]>([]);
  const [approvedLoading, setApprovedLoading] = useState(false);
  const { setPageHeader } = usePageHeader();

  // Debounce exam search — reset page + apply search together
  useEffect(() => {
    const t = setTimeout(() => {
      setCurrentPage(1);
      setExamSearch(searchInput);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchExams();
  }, [activeTab, currentPage, examSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchExams = async () => {
    setLoading(true);
    try {
      const status = activeTab === 'pending' ? 'PENDING' : 'APPROVED';
      const response: any = await examService.list({ status, page: currentPage, limit: 10, search: examSearch || undefined });
      setExams(response.data || []);
      setExamMeta(response.meta || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewDetails) {
      const isApproved = viewDetails.status === 'APPROVED';
      setPageHeader(
        `View ${viewDetails.branch?.name} Exam Details`,
        isApproved
          ? 'Analyze student performance, view exam results, and track pass/fail status across courses.'
          : 'Assign question papers to each course and prepare students for the upcoming exam.'
      );

      if (isApproved) {
        // Fetch student results for approved exam
        setApprovedLoading(true);
        setApprovedStudents([]);
        Promise.all([
          examService.getPasswords(viewDetails.id).catch(() => ({ data: { passwords: [] } })),
          examService.getResults(viewDetails.id).catch(() => ({ data: [] })),
        ]).then(([pwdRes, resultsRes]: any[]) => {
          const passwords: any[] = pwdRes?.data?.passwords || [];
          const results: any[] = resultsRes?.data || [];
          // Merge passwords with exam results by student ID
          const merged = passwords.map((p: any) => {
            const result = results.find((r: any) => r.studentId === p.studentId || r.student?.id === p.studentId);
            return { ...p, examStatus: result?.grade ? `Grade ${result.grade}` : result?.status || '—' };
          });
          setApprovedStudents(merged);
          setApprovedLoading(false);
        });
      } else {
        // Pre-fill any already-assigned question papers
        const pre: Record<string, string> = {};
        viewDetails.examCourses?.forEach((ec: any) => {
          if (ec.questionPaperId) pre[ec.courseId] = ec.questionPaperId;
        });
        setSelectedPapers(pre);

        // Fetch papers for each course in the exam
        viewDetails.examCourses?.forEach(async (ec: any) => {
          try {
            const res: any = await courseService.listPapers(ec.courseId);
            setPapersByCourse((prev: any) => ({ ...prev, [ec.courseId]: res.data || [] }));
          } catch (err) {
            console.error(err);
          }
        });
      }
    } else {
      setPageHeader(
        'Exams',
        activeTab === 'pending'
          ? 'Review and manage upcoming exam requests from all branches.'
          : 'View all approved exams, schedules, and monitor branch exam activity.'
      );
    }
  }, [viewDetails, activeTab, setPageHeader]);

  const handleApprove = async (examId: string) => {
    try {
      // Assign question papers for each course (fail fast if any assignment fails)
      const assignPromises = Object.entries(selectedPapers).map(([courseId, paperId]) =>
        paperId ? examService.assignPaper(examId, courseId, paperId) : Promise.resolve()
      );
      await Promise.all(assignPromises);

      // For already-approved exams, just update papers without re-approving
      if (viewDetails?.status === 'APPROVED') {
        toast.success('Question papers updated successfully');
        fetchExams();
        return;
      }

      const response: any = await examService.approve(examId);
      setGeneratedPasswords(response.data?.generatedPasswords);
      setShowSuccessModal(true);
      fetchExams(); // Refresh exam list
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve exam');
    }
  };

  const handleOpenStudentModal = async () => {
    if (!viewDetails) return;
    setShowStudentModal(true);
    setStudentModalLoading(true);
    setStudentModalList([]);
    try {
      const res: any = await examService.getStudents(viewDetails.id);
      setStudentModalList(res.data || []);
    } catch {
      setStudentModalList([]);
    } finally {
      setStudentModalLoading(false);
    }
  };

  if (viewDetails) {
    const isApproved = viewDetails.status === 'APPROVED';
    return (
      <div className="space-y-6">
        <button onClick={() => setViewDetails(null)} className="flex items-center gap-2 text-[#64748B] hover:text-[#1A2332] transition-colors text-[14px]">
          <ArrowLeft size={16} />
          Back
        </button>

        {/* ── Approved Exam: show student results table ─────────────────── */}
        {isApproved && (
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
              <h3 className="text-[18px] font-bold text-[#1A2332]">Students list ({approvedStudents.length} Students)</h3>
              <div className="flex items-center gap-2 w-[320px] px-4 py-2 bg-white border border-[#E2E8F0] rounded-[8px]">
                <Search size={16} className="text-[#64748B]" />
                <input type="text" placeholder="Search by name, ID, course" className="bg-transparent border-none focus:outline-none text-[14px] w-full text-[#1A2332] placeholder:text-[#64748B]" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#4DB8CA] text-white text-[14px]">
                  <tr>
                    <th className="py-4 px-6 font-medium whitespace-nowrap w-20">Sr. No</th>
                    <th className="py-4 px-6 font-medium whitespace-nowrap">Student ID</th>
                    <th className="py-4 px-6 font-medium whitespace-nowrap">Login Password</th>
                    <th className="py-4 px-6 font-medium whitespace-nowrap">Student Name</th>
                    <th className="py-4 px-6 font-medium whitespace-nowrap">Course Name</th>
                    <th className="py-4 px-6 font-medium whitespace-nowrap">Exam Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {approvedLoading ? (
                    <tr><td colSpan={6} className="py-10 text-center"><Loader2 className="animate-spin text-[#4DB8CA] mx-auto" size={24} /></td></tr>
                  ) : approvedStudents.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-500">No student data found for this exam.</td></tr>
                  ) : approvedStudents.map((s: any, i: number) => (
                    <tr key={i} className={cn('hover:bg-[#F8FAFC] transition-colors', i % 2 === 1 && 'bg-[#F8FAFC]')}>
                      <td className="py-4 px-6 text-[14px] text-[#1A2332]">{i + 1}</td>
                      <td className="py-4 px-6 text-[14px] text-[#1A2332]">{s.prn || s.studentId || '—'}</td>
                      <td className="py-4 px-6 text-[14px] font-mono text-[#1A2332]">{s.password || '—'}</td>
                      <td className="py-4 px-6 text-[14px] text-[#1A2332]">{s.studentName || '—'}</td>
                      <td className="py-4 px-6 text-[14px] text-[#1A2332]">{s.courseName || viewDetails.examCourses?.[0]?.course?.name || '—'}</td>
                      <td className="py-4 px-6 text-[14px] font-semibold">
                        {s.examStatus === 'Pass' ? (
                          <span className="text-[#008A27]">Pass</span>
                        ) : s.examStatus === 'Failed' ? (
                          <span className="text-[#C8102E]">Failed</span>
                        ) : (
                          <span className="text-[#64748B]">{s.examStatus}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0] bg-white">
              <p className="text-[14px] text-[#64748B]">Showing data 1 to {approvedStudents.length} of {approvedStudents.length} Students</p>
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50" disabled><ChevronLeft size={14} /></button>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-[#0A3D4D] text-white text-[14px]">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50" disabled><ChevronRight size={14} /></button>
              </div>
            </div>
          </div>
        )}

        {/* ── Pending Exam: show question paper assignment form ─────────── */}
        {!isApproved && (
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-8">
          <div className="space-y-6">
            {viewDetails.examCourses?.map((ec: any, i: number) => (
              <div key={i} className="border border-[#E2E8F0] rounded-[8px] p-6 space-y-6">
                <div className="grid grid-cols-2 gap-x-8">
                  <div className="space-y-2">
                    <label className="block text-[14px] font-semibold text-[#1A2332]">Course Name</label>
                    <input type="text" value={ec.course?.name} readOnly className="w-full h-12 px-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#64748B] outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[14px] font-semibold text-[#1A2332]">Total Students</label>
                    <div className="flex items-center gap-4">
                      <input type="text" value={viewDetails.numStudents ?? 0} readOnly className="w-full h-12 px-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#64748B] outline-none" />
                      <button
                        onClick={handleOpenStudentModal}
                        className="text-[#4DB8CA] underline font-medium text-[14px] hover:text-[#3AA5B8] whitespace-nowrap transition-colors"
                      >
                        View List
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-8">
                  <div className="space-y-2">
                    <label className="block text-[14px] font-semibold text-[#1A2332]">Expected Exam Date</label>
                    <input type="text" value={viewDetails.examDate ? new Date(viewDetails.examDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} readOnly className="w-full h-12 px-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#64748B] outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[14px] font-semibold text-[#1A2332]">
                      Select Question Paper <span className="text-[#C8102E]">*</span>
                    </label>
                    <div className="relative">
                      <select 
                        className="w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] appearance-none outline-none focus:border-[#4DB8CA]"
                        value={selectedPapers[ec.courseId] || ''}
                        onChange={(e) => setSelectedPapers(prev => ({ ...prev, [ec.courseId]: e.target.value }))}
                      >
                        <option value="">Select Question Paper</option>
                        {papersByCourse[ec.courseId]?.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-6 pt-6 border-t border-[#E2E8F0] mt-8">
            <button onClick={() => setViewDetails(null)} className="text-[14px] font-medium text-[#64748B] hover:text-[#1A2332] transition-colors">
              Cancel
            </button>
            {(() => {
              const allPapersSelected = viewDetails.examCourses?.length > 0 &&
                viewDetails.examCourses.every((ec: any) => selectedPapers[ec.courseId]);
              return (
                <button 
                  onClick={() => handleApprove(viewDetails.id)}
                  disabled={!allPapersSelected}
                  title={!allPapersSelected ? 'Please select a question paper for each course' : undefined}
                  className={cn(
                    'flex items-center gap-2 px-8 py-3 rounded-[6px] text-[15px] font-medium transition-colors shadow-sm',
                    allPapersSelected
                      ? 'bg-[#C8102E] text-white hover:bg-red-800 cursor-pointer'
                      : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                  )}
                >
                  <Lock size={18} />
                  Create Login Credentials
                </button>
              );
            })()}
          </div>
        </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && generatedPasswords && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
            <div className="bg-white rounded-[16px] w-full max-w-md shadow-2xl p-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-[#E5F7ED] flex items-center justify-center text-[#0BB783] mb-6 shadow-[0_0_0_6px_#F2FCF6]">
                <CheckCircle2 size={36} strokeWidth={2.5} />
              </div>
              <h2 className="text-[20px] font-bold text-[#1A2332] leading-snug mb-2 whitespace-pre-line">
                Login Credentials{'\n'}Successfully Added!
              </h2>
              <p className="text-[14px] text-[#64748B] mt-2 mb-8 max-w-xs">
                Credentials are ready. You can now view and share them with the student.
              </p>
              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={() => {
                    const passwordText = generatedPasswords
                      .map((p: any) => `${p.studentName}: ${p.password}`)
                      .join('\n');
                    navigator.clipboard.writeText(passwordText);
                    toast.success('Credentials copied to clipboard!');
                  }}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-[#C8102E] text-white rounded-md font-medium text-[15px] hover:bg-red-800 transition-colors"
                >
                  <Eye size={20} />
                  View Credentials
                </button>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="text-[15px] text-[#64748B] font-medium hover:text-[#1A2332] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Student List Modal */}
        {showStudentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4">
            <div className="relative w-full max-w-4xl animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowStudentModal(false)} 
                className="absolute -top-10 right-0 w-8 h-8 bg-white rounded flex items-center justify-center text-gray-800 hover:bg-gray-100 transition-colors z-10"
              >
                <X size={20} />
              </button>
              <div className="bg-white rounded-[8px] shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#4DB8CA] text-white text-[14px]">
                      <tr>
                        <th className="py-4 px-6 font-medium whitespace-nowrap w-20">Sr. No</th>
                        <th className="py-4 px-6 font-medium whitespace-nowrap">Student ID</th>
                        <th className="py-4 px-6 font-medium whitespace-nowrap">Student Name</th>
                        <th className="py-4 px-6 font-medium whitespace-nowrap">Admission Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {studentModalLoading ? (
                        <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="animate-spin text-[#4DB8CA] mx-auto" size={24} /></td></tr>
                      ) : studentModalList.length === 0 ? (
                        <tr><td colSpan={4} className="py-8 text-center text-gray-500">No students found for this exam.</td></tr>
                      ) : studentModalList.map((s: any, i: number) => (
                        <tr key={s.id} className={cn('hover:bg-[#F8FAFC] transition-colors', i % 2 === 1 && 'bg-[#F8FAFC]')}>
                          <td className="py-4 px-6 text-[14px] text-[#1A2332]">{i + 1}</td>
                          <td className="py-4 px-6 text-[14px] text-[#1A2332]">{s.prn}</td>
                          <td className="py-4 px-6 text-[14px] text-[#1A2332]">{s.firstName} {s.lastName}</td>
                          <td className="py-4 px-6 text-[14px] text-[#1A2332]">
                            {s.admissionDate ? new Date(s.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-[8px] p-1 w-fit shadow-sm">
        <button
          onClick={() => { setActiveTab('pending'); setCurrentPage(1); setSearchInput(''); setExamSearch(''); }}
          className={cn('px-6 py-2.5 rounded-[6px] text-[15px] font-medium transition-colors', activeTab === 'pending' ? 'bg-[#C8102E] text-white' : 'text-[#1A2332] hover:bg-gray-50')}
        >
          Pending Requests {activeTab === 'pending' && exams.length > 0 ? `(${exams.length})` : ''}
        </button>
        <button
          onClick={() => { setActiveTab('approved'); setCurrentPage(1); setSearchInput(''); setExamSearch(''); }}
          className={cn('px-6 py-2.5 rounded-[6px] text-[15px] font-medium transition-colors', activeTab === 'approved' ? 'bg-[#C8102E] text-white' : 'text-[#1A2332] hover:bg-gray-50')}
        >
          Approved Requests {activeTab === 'approved' && exams.length > 0 ? `(${exams.length})` : ''}
        </button>
      </div>

      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h3 className="text-[18px] font-bold text-[#1A2332]">Branch list ({examMeta?.total ?? exams.length})</h3>
          <div className="flex items-center gap-2 w-[320px] px-4 py-2 bg-white border border-[#E2E8F0] rounded-[8px]">
            <Search size={16} className="text-[#64748B]" />
            <input type="text" placeholder="Search by branch name" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="bg-transparent border-none focus:outline-none text-[14px] w-full text-[#1A2332] placeholder:text-[#64748B]" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#4DB8CA] text-white text-[14px]">
              <tr>
                <th className="py-4 px-6 font-medium whitespace-nowrap w-20">Sr. No</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">Branch Name</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">Exam Date</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">Location</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">No. of Students</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 className="animate-spin text-[#4DB8CA] mx-auto mb-2" size={32} />
                    <span className="text-gray-400 text-sm">Fetching exam requests...</span>
                  </td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-500">No {activeTab} exams found.</td>
                </tr>
              ) : (
                exams.map((row: any, idx: number) => (
                  <tr key={row.id} className={cn('hover:bg-[#F8FAFC] transition-colors', idx % 2 === 1 && 'bg-[#F8FAFC]')}>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{idx + 1}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{row.branch?.name}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{new Date(row.examDate).toLocaleDateString()}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{row.branch?.location}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{row.numStudents || 0}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <button 
                          className="text-[#4DB8CA] border border-[#4DB8CA] rounded-[4px] p-1.5 hover:bg-[#E6F6F9] transition-colors" 
                          onClick={() => setViewDetails(row)}
                        >
                          {activeTab === 'pending' ? <ArrowRight size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {(() => {
          const total      = examMeta?.total      ?? exams.length;
          const totalPages = examMeta?.totalPages ?? 1;
          const from       = total === 0 ? 0 : (currentPage - 1) * 10 + 1;
          const to         = Math.min(currentPage * 10, total);
          const pages      = Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1);
          return (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0] bg-white">
              <p className="text-[14px] text-[#64748B]">Showing data {from} to {to} of {total} Branches</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"><ChevronLeft size={14} /></button>
                {pages.map(p => (
                  <button key={p} onClick={() => setCurrentPage(p)} className={cn('w-8 h-8 flex items-center justify-center rounded text-[14px] transition-colors', p === currentPage ? 'bg-[#0A3D4D] text-white' : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-gray-50')}>{p}</button>
                ))}
                {totalPages > 4 && <span className="px-1 text-[#94A3B8]">...</span>}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"><ChevronRight size={14} /></button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default Exams;
