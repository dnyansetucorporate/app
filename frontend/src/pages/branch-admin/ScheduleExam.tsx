import React, { useEffect, useState } from 'react';
import { Search, ArrowRight, Eye, GraduationCap, X, CheckCircle2, Loader2, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useAuth } from '@/contexts/AuthContext';
import toast from '@/utils/toastWrapper';
import { cn } from '@/utils/helpers';
import { buildImageUrl } from '@/utils/imageUtils';
import { courseService } from '@/services/course.service';
import { examService } from '@/services/exam.service';
import { enrollmentService } from '@/services/enrollment.service';
import { studentService } from '@/services/student.service';

const ScheduleExam: React.FC = () => {
  const { setPageHeader } = usePageHeader();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'Schedule Exams' | 'Exam Request Status'>('Schedule Exams');
  const [searchTerm, setSearchTerm] = useState('');

  // ─── List data ──────────────────────────────────────────────────────────
  const [courses, setCourses] = useState<any[]>([]);
  const [examRequests, setExamRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [coursePage, setCoursePage] = useState(1);
  const [examPage, setExamPage] = useState(1);

  // ─── Schedule Exams drilldown ────────────────────────────────────────────
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // ─── Schedule modal ──────────────────────────────────────────────────────
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [examDate, setExamDate] = useState('');
  const [submittingExam, setSubmittingExam] = useState(false);

  // ─── Exam Request Status drilldown ───────────────────────────────────────
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [examPasswords, setExamPasswords] = useState<any[]>([]);
  const [passwordsLoading, setPasswordsLoading] = useState(false);

  // ─── Student drawer ──────────────────────────────────────────────────────
  const [drawerStudent, setDrawerStudent] = useState<any | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerData, setDrawerData] = useState<any | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Paper selection is handled by super admin, not branch admin
  const [selectedPaperId] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const PAGE_SIZE = 8;

  // ─── Fetch on tab switch ─────────────────────────────────────────────────
  useEffect(() => {
    fetchBaseData();
  }, [activeTab]);

  useEffect(() => {
    setCoursePage(1);
    setExamPage(1);
    setSearchTerm('');
  }, [activeTab]);

  useEffect(() => {
    setCoursePage(1);
    setExamPage(1);
  }, [searchTerm]);

  useEffect(() => {
    setSearchTerm('');
  }, [selectedCourse, selectedExam]);

  const fetchBaseData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'Schedule Exams') {
        const response: any = await courseService.list({ limit: 100 });
        const rawCourses = response.data || [];

        // Safety override for BRANCH_ADMIN:
        // derive counts from branch-scoped enrollments API so other-branch counts never leak.
        if (user?.role === 'BRANCH_ADMIN') {
          const branchScopedCourses = await Promise.all(
            rawCourses.map(async (course: any) => {
              try {
                const enrRes: any = await enrollmentService.list({ courseId: course.id, limit: 1 });
                const total = Number(enrRes?.meta?.total ?? enrRes?.data?.length ?? 0);
                return {
                  ...course,
                  totalStudents: total,
                  activeStudents: total,
                };
              } catch {
                return {
                  ...course,
                  totalStudents: 0,
                  activeStudents: 0,
                };
              }
            })
          );
          setCourses(branchScopedCourses);
        } else {
          setCourses(rawCourses);
        }
      } else {
        const response: any = await examService.list({ limit: 100 });
        setExamRequests(response.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch enrolled students when course selected ────────────────────────
  useEffect(() => {
    if (selectedCourse && activeTab === 'Schedule Exams') {
      setSelectedStudentIds([]);
      setEnrolledStudents([]);
      fetchEnrolledStudents(selectedCourse.id);
    }
  }, [selectedCourse]);

  const fetchEnrolledStudents = async (courseId: string) => {
    setStudentsLoading(true);
    try {
      const response: any = await enrollmentService.list({ courseId, limit: 200 });
      setEnrolledStudents(response.data || []);
    } catch (err) {
      console.error('Failed to fetch enrolled students', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  // ─── Fetch passwords when exam drilldown selected ────────────────────────
  useEffect(() => {
    if (selectedExam) {
      fetchExamPasswords(selectedExam.id);
    }
  }, [selectedExam]);

  const fetchExamPasswords = async (examId: string) => {
    setPasswordsLoading(true);
    setExamPasswords([]);
    try {
      const response: any = await examService.getPasswords(examId);
      setExamPasswords(response.data?.passwords || []);
    } catch {
      setExamPasswords([]);
    } finally {
      setPasswordsLoading(false);
    }
  };

  // ─── Page header ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedCourse && activeTab === 'Schedule Exams') {
      const hasSelection = selectedStudentIds.length > 0;
      setPageHeader(
        `Student In ${selectedCourse.name}`,
        'View enrolled students and payment status.',
        (
          <button
            onClick={() => hasSelection && setShowScheduleModal(true)}
            disabled={!hasSelection}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors shadow-sm',
              hasSelection
                ? 'bg-[#C8102E] text-white hover:bg-red-800 cursor-pointer'
                : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
            )}
          >
            <GraduationCap size={18} />
            Schedule Exams
          </button>
        ),
        false,
        () => setSelectedCourse(null)
      );
    } else if (selectedExam && activeTab === 'Exam Request Status') {
      setPageHeader(
        `Student In ${selectedExam.examCourses?.[0]?.course?.name || 'Course'}`,
        'View student details and login credentials.',
        undefined,
        false,
        () => setSelectedExam(null)
      );
    } else {
      const title = activeTab === 'Schedule Exams' ? 'Schedule Exams' : 'Exam Request Status';
      const sub = activeTab === 'Schedule Exams'
        ? 'Plan and manage exams across courses.'
        : 'Track exam requests and approval status.';
      setPageHeader(title, sub, undefined, true, undefined);
    }
  }, [setPageHeader, selectedCourse, selectedExam, activeTab, selectedStudentIds.length]);

  // ─── Checkbox helpers ─────────────────────────────────────────────────────
  const getStudentId = (enr: any) => enr.student?.id || enr.id;

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const isStudentEligible = (enr: any) => enr.paymentStatus === 'FULL_PAID';

  const getVisibleEnrolledStudents = () => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return enrolledStudents;
    return enrolledStudents.filter((enr: any) => {
      const name = `${enr.student?.firstName || ''} ${enr.student?.lastName || ''}`.toLowerCase();
      const prn = (enr.student?.prn || '').toLowerCase();
      const courseName = (enr.course?.name || selectedCourse?.name || '').toLowerCase();
      return name.includes(term) || prn.includes(term) || courseName.includes(term);
    });
  };

  const toggleAll = () => {
    const eligibleIds = getVisibleEnrolledStudents().filter(isStudentEligible).map(getStudentId);
    if (eligibleIds.length > 0 && eligibleIds.every(id => selectedStudentIds.includes(id))) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(eligibleIds);
    }
  };

  // ─── Schedule submit ──────────────────────────────────────────────────────
  const handleScheduleSubmit = async () => {
    if (!examDate) { toast.error('Please select an exam date'); return; }

    // JS-level date validation: must be today or in the future
    const selectedDate = new Date(examDate);
    selectedDate.setHours(0, 0, 0, 0);
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);
    if (selectedDate < todayDate) {
      toast.error('Exam date must be today or in the future');
      return;
    }

    if (!user?.branchId) { toast.error('Branch information missing'); return; }
    setSubmittingExam(true);
    try {
      const courseEntry: any = { courseId: selectedCourse.id };
      if (selectedPaperId) courseEntry.questionPaperId = selectedPaperId;
      await examService.create({
        branchId: user.branchId,
        examDate,
        numStudents: selectedStudentIds.length,
        studentIds: selectedStudentIds,
        courses: [courseEntry],
      });
      setShowScheduleModal(false);
      setShowSuccessModal(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to schedule exam');
    } finally {
      setSubmittingExam(false);
    }
  };

  const handleViewStatus = () => {
    setShowSuccessModal(false);
    setSelectedCourse(null);
    setActiveTab('Exam Request Status');
  };

  const handleViewStudentDrawer = async (item: any) => {
    setDrawerStudent(item);
    setDrawerLoading(true);
    setDrawerData(null);
    try {
      const sid = item.student?.id || item.studentId || item.id;
      const response: any = await studentService.getById(sid);
      setDrawerData(response.data || response);
    } catch (err) {
      console.error('Failed to load student', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // ─── Formatters ───────────────────────────────────────────────────────────
  const paymentLabel = (s: string) => {
    if (s === 'FULL_PAID') return 'Full Paid';
    if (s === 'PARTIAL_PAID') return 'Half Paid';
    return s || '—';
  };
  const paymentColor = (s: string) => {
    if (s === 'FULL_PAID') return 'text-[#008A27] border-[#008A27] bg-[#F0FDF4]';
    if (s === 'PARTIAL_PAID') return 'text-[#F59E0B] border-[#F59E0B] bg-[#FFFBEB]';
    return 'text-[#64748B] border-[#64748B] bg-[#F8FAFC]';
  };
  const statusLabel = (s: string) => {
    if (s === 'APPROVED') return 'Approved';
    if (s === 'REJECTED') return 'Rejected';
    return 'Pending';
  };
  const statusColor = (s: string) => {
    if (s === 'APPROVED') return 'text-[#008A27] border-[#008A27] bg-[#F0FDF4]';
    if (s === 'REJECTED') return 'text-[#C8102E] border-[#C8102E] bg-[#FEF2F2]';
    return 'text-[#64748B] border-[#64748B] bg-[#F8FAFC]';
  };
  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const inDrilldown = Boolean(selectedCourse || selectedExam);
  const q = searchTerm.trim().toLowerCase();

  const filteredCourses = q
    ? courses.filter((c) => (c.name || '').toLowerCase().includes(q))
    : courses;

  const filteredEnrolledStudents = getVisibleEnrolledStudents();

  const filteredExamRequests = q
    ? examRequests.filter((req: any) =>
        (req.examCourses || []).some((ec: any) => (ec.course?.name || '').toLowerCase().includes(q))
      )
    : examRequests;

  const filteredExamPasswords = q
    ? examPasswords.filter((p: any) => {
        const name = (p.studentName || '').toLowerCase();
        const prn = (p.prn || p.studentId || '').toLowerCase();
        return name.includes(q) || prn.includes(q);
      })
    : examPasswords;

  const totalCoursePages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const totalExamPages = Math.max(1, Math.ceil(filteredExamRequests.length / PAGE_SIZE));
  const pagedCourses = filteredCourses.slice((coursePage - 1) * PAGE_SIZE, coursePage * PAGE_SIZE);
  const pagedExamRequests = filteredExamRequests.slice((examPage - 1) * PAGE_SIZE, examPage * PAGE_SIZE);

  return (
    <div className="space-y-6">

      {/* ── Tab Switcher — always visible ────────────────────────────────── */}
      <div className="flex items-center bg-[#F8FAFC] p-1.5 rounded-[12px] border border-[#E2E8F0] w-fit shadow-sm">
        {(['Schedule Exams', 'Exam Request Status'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setSelectedCourse(null); setSelectedExam(null); setActiveTab(tab); }}
            className={cn(
              'px-8 py-2.5 text-[14px] font-semibold transition-all duration-200 rounded-[8px]',
              activeTab === tab 
                ? 'bg-[#C8102E] text-white shadow-md' 
                : 'text-[#1A2332] hover:bg-white'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Main Card ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-4">
            <h4 className="text-[20px] font-bold text-[#1A2332]">
              {activeTab === 'Schedule Exams' && !selectedCourse && `All Courses (${filteredCourses.length} Courses)`}
              {activeTab === 'Schedule Exams' && selectedCourse && `Students list (${filteredEnrolledStudents.length} Students)`}
              {activeTab === 'Exam Request Status' && !selectedExam && `All Courses (${filteredExamRequests.length} Courses)`}
              {activeTab === 'Exam Request Status' && selectedExam && `Students list (${filteredExamPasswords.length} Students)`}
            </h4>
          </div>
          <div className="flex items-center gap-2 w-full max-w-sm px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-[10px] shadow-sm focus-within:border-[#4DB6C1] transition-all">
            <Search size={18} className="text-[#94A3B8]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={inDrilldown ? 'Search by name, ID, course' : 'Search by course name'}
              className="bg-transparent border-none focus:outline-none text-[14px] w-full text-[#1A2332] placeholder:text-[#94A3B8]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">

          {/* ── Screen 1: Schedule Exams → Course List ───────────────────── */}
          {activeTab === 'Schedule Exams' && !selectedCourse && (
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#4DB6C1] text-white text-[14px]">
                <tr>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap">Sr. No</th>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                      Course Name <ArrowUpDown size={14} />
                    </span>
                  </th>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                      Total Students <ArrowUpDown size={14} />
                    </span>
                  </th>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                      Active Students <ArrowUpDown size={14} />
                    </span>
                  </th>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {loading ? (
                  <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin text-[#4DB6C1] mx-auto" size={32} /></td></tr>
                ) : filteredCourses.length === 0 ? (
                  <tr><td colSpan={5} className="py-14 text-center text-[#64748B] text-[15px]">{courses.length === 0 ? 'No courses found.' : 'No courses match your search.'}</td></tr>
                ) : pagedCourses.map((course, idx) => {
                  const studentCount = course.totalStudents ?? course._count?.enrollments ?? 0;
                  const noStudents = studentCount === 0;
                  return (
                    <tr key={course.id} className={cn('transition-all duration-200', idx % 2 === 1 ? 'bg-[#FDFDFD]' : 'bg-white', noStudents ? 'opacity-60' : 'hover:bg-[#F8FBFC]')}>
                      <td className="py-5 px-8 text-[14px] font-medium text-[#1A2332]">{(coursePage - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="py-5 px-8 text-[14px] font-medium text-[#1A2332]">{course.name}</td>
                      <td className="py-5 px-8 text-[14px] font-medium text-[#1A2332]">{studentCount}</td>
                      <td className="py-5 px-8 text-[14px] font-medium text-[#1A2332]">{course.activeStudents ?? studentCount}</td>
                      <td className="py-5 px-8 text-center">
                        {noStudents ? (
                          <span className="inline-flex items-center gap-1 text-[12px] text-[#94A3B8] border border-[#E2E8F0] rounded-[6px] px-2.5 py-1 bg-[#F8FAFC]">
                            No Students
                          </span>
                        ) : (
                          <button 
                            onClick={() => setSelectedCourse(course)} 
                            className="text-[#4DB6C1] border border-[#4DB6C1] rounded-[8px] p-2 hover:bg-[#4DB6C1] hover:text-white transition-all duration-200"
                          >
                            <ArrowRight size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ── Screen 2: Schedule Exams → Student List with Checkboxes ─────── */}
          {activeTab === 'Schedule Exams' && selectedCourse && (
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#4DB6C1] text-white text-[14px]">
                <tr>
                  <th className="py-4 px-6 w-16">
                    <input
                      type="checkbox"
                      checked={filteredEnrolledStudents.filter(isStudentEligible).length > 0 && filteredEnrolledStudents.filter(isStudentEligible).every(e => selectedStudentIds.includes(getStudentId(e)))}
                      onChange={toggleAll}
                      className="w-5 h-5 cursor-pointer accent-[#C8102E] rounded border-white/20"
                    />
                  </th>
                  <th className="py-4 px-6 font-semibold whitespace-nowrap">Sr. No</th>
                  <th className="py-4 px-6 font-semibold whitespace-nowrap">Student ID</th>
                  <th className="py-4 px-6 font-semibold whitespace-nowrap">Student Name</th>
                  <th className="py-4 px-6 font-semibold whitespace-nowrap">Phone No</th>
                  <th className="py-4 px-6 font-semibold whitespace-nowrap">Admission Date</th>
                  <th className="py-4 px-6 font-semibold whitespace-nowrap">Payment Status</th>
                  <th className="py-4 px-6 font-semibold whitespace-nowrap text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {studentsLoading ? (
                  <tr><td colSpan={8} className="py-20 text-center"><Loader2 className="animate-spin text-[#4DB6C1] mx-auto" size={32} /></td></tr>
                ) : filteredEnrolledStudents.length === 0 ? (
                  <tr><td colSpan={8} className="py-14 text-center text-[#64748B] text-[15px]">{enrolledStudents.length === 0 ? 'No students enrolled in this course.' : 'No students match your search.'}</td></tr>
                ) : filteredEnrolledStudents.map((enr: any, idx) => {
                  const sid = getStudentId(enr);
                  const checked = selectedStudentIds.includes(sid);
                  const eligible = isStudentEligible(enr);
                  return (
                    <tr key={enr.id} className={cn('transition-all duration-200', idx % 2 === 1 ? 'bg-[#FDFDFD]' : 'bg-white', eligible ? 'hover:bg-[#F8FBFC]' : 'opacity-50 bg-[#FFF5F5]')}>
                      <td className="py-5 px-6">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => eligible && toggleStudent(sid)}
                          disabled={!eligible}
                          title={!eligible ? 'Only fully paid students can be scheduled for exams' : undefined}
                          className={cn('w-5 h-5 rounded border-[#E2E8F0] accent-[#C8102E]', eligible ? 'cursor-pointer' : 'cursor-not-allowed')}
                        />
                      </td>
                      <td className="py-5 px-6 text-[14px] font-medium text-[#1A2332]">{idx + 1}</td>
                      <td className="py-5 px-6 text-[14px] font-medium text-[#1A2332]">{enr.student?.prn || '—'}</td>
                      <td className="py-5 px-6 text-[14px] font-medium text-[#1A2332]">{enr.student?.firstName} {enr.student?.lastName}</td>
                      <td className="py-5 px-6 text-[14px] font-medium text-[#1A2332]">{enr.student?.phone || '—'}</td>
                      <td className="py-5 px-6 text-[14px] font-medium text-[#1A2332]">{fmtDate(enr.enrolledAt)}</td>
                      <td className="py-5 px-6">
                        <span className={cn('px-3 py-1 rounded-[6px] border text-[12px] font-semibold inline-block', paymentColor(enr.paymentStatus))}>
                          {paymentLabel(enr.paymentStatus)}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-center">
                        <button onClick={() => handleViewStudentDrawer(enr)} className="text-[#4DB6C1] border border-[#4DB6C1] rounded-[8px] p-2 hover:bg-[#4DB6C1] hover:text-white transition-all duration-200">
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ── Screen 5: Exam Request Status → Exam List ───────────────────── */}
          {activeTab === 'Exam Request Status' && !selectedExam && (
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#4DB6C1] text-white text-[14px]">
                <tr>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap">Sr. No</th>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap">Course Name</th>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap">Total Students</th>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap">Exam Date</th>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap">Status</th>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {loading ? (
                  <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin text-[#4DB6C1] mx-auto" size={32} /></td></tr>
                ) : filteredExamRequests.length === 0 ? (
                  <tr><td colSpan={6} className="py-14 text-center text-[#64748B] text-[15px]">{examRequests.length === 0 ? 'No exam requests found.' : 'No exam requests match your search.'}</td></tr>
                ) : pagedExamRequests.map((req, idx) => (
                  <tr key={req.id} className={cn('transition-all duration-200', idx % 2 === 1 ? 'bg-[#FDFDFD]' : 'bg-white', 'hover:bg-[#F8FBFC]')}>
                    <td className="py-5 px-8 text-[14px] font-medium text-[#1A2332]">{(examPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="py-5 px-8 text-[14px] font-medium text-[#1A2332]">
                      {req.examCourses?.map((ec: any) => ec.course?.name).filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="py-5 px-8 text-[14px] font-medium text-[#1A2332]">{req.numStudents ?? 0}</td>
                    <td className="py-5 px-8 text-[14px] font-medium text-[#1A2332]">{fmtDate(req.examDate)}</td>
                    <td className="py-5 px-8">
                      <span className={cn('px-3 py-1 rounded-[6px] border text-[12px] font-semibold inline-block', statusColor(req.status))}>
                        {statusLabel(req.status)}
                      </span>
                    </td>
                    <td className="py-5 px-8 text-center">
                      <button onClick={() => setSelectedExam(req)} className="text-[#4DB6C1] border border-[#4DB6C1] rounded-[8px] p-2 hover:bg-[#4DB6C1] hover:text-white transition-all duration-200">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ── Screen 6: Exam Request Status → Student + Login Password ──────── */}
          {activeTab === 'Exam Request Status' && selectedExam && (
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#4DB6C1] text-white text-[14px]">
                <tr>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap">Sr. No</th>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap">Student ID</th>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap">Student Name</th>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap">Phone No</th>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap">Login Password</th>
                  <th className="py-4 px-8 font-semibold whitespace-nowrap text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {passwordsLoading ? (
                  <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin text-[#4DB6C1] mx-auto" size={32} /></td></tr>
                ) : filteredExamPasswords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-[#64748B] text-[15px]">
                      {examPasswords.length > 0
                        ? 'No students match your search.'
                        : selectedExam.status === 'APPROVED'
                          ? 'No student passwords found for this exam.'
                          : 'Passwords will be available after super admin approves this exam.'}
                    </td>
                  </tr>
                ) : filteredExamPasswords.map((p: any, idx) => (
                  <tr key={idx} className={cn('transition-all duration-200', idx % 2 === 1 ? 'bg-[#FDFDFD]' : 'bg-white', 'hover:bg-[#F8FBFC]')}>
                    <td className="py-5 px-8 text-[14px] font-medium text-[#1A2332]">{idx + 1}</td>
                    <td className="py-5 px-8 text-[14px] font-medium text-[#1A2332]">{p.prn || p.studentId || '—'}</td>
                    <td className="py-5 px-8 text-[14px] font-medium text-[#1A2332]">{p.studentName || '—'}</td>
                    <td className="py-5 px-8 text-[14px] font-medium text-[#1A2332]">{p.phone || '—'}</td>
                    <td className="py-5 px-8 text-[14px] font-mono font-semibold text-[#1A2332]">
                      <div className="flex items-center gap-2">
                        {p.generated ? (
                          <>
                            <span>{visiblePasswords[p.studentId] === false ? '••••••' : (p.password || '—')}</span>
                            <button 
                              onClick={() => setVisiblePasswords(prev => ({ ...prev, [p.studentId]: !prev[p.studentId] }))}
                              className="text-[#4DB6C1] hover:text-[#0A3D4D] transition-colors"
                            >
                              <Eye size={14} className={visiblePasswords[p.studentId] === false ? '' : 'opacity-50'} />
                            </button>
                          </>
                        ) : (
                          'Not Generated'
                        )}
                      </div>
                    </td>
                    <td className="py-5 px-8 text-center">
                      <button onClick={() => handleViewStudentDrawer(p)} className="text-[#4DB6C1] border border-[#4DB6C1] rounded-[8px] p-2 hover:bg-[#4DB6C1] hover:text-white transition-all duration-200">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-6 border-t border-[#E2E8F0] bg-[#FDFDFD]">
          <p className="text-[14px] font-medium text-[#64748B]">
            {activeTab === 'Schedule Exams' && !selectedCourse && `Showing data ${(filteredCourses.length === 0 ? 0 : (coursePage - 1) * PAGE_SIZE + 1)} to ${Math.min(coursePage * PAGE_SIZE, filteredCourses.length)} of ${filteredCourses.length} Courses`}
            {activeTab === 'Schedule Exams' && selectedCourse && `Showing data 1 to ${Math.min(8, filteredEnrolledStudents.length)} of ${filteredEnrolledStudents.length} Students`}
            {activeTab === 'Exam Request Status' && !selectedExam && `Showing data ${(filteredExamRequests.length === 0 ? 0 : (examPage - 1) * PAGE_SIZE + 1)} to ${Math.min(examPage * PAGE_SIZE, filteredExamRequests.length)} of ${filteredExamRequests.length} Courses`}
            {activeTab === 'Exam Request Status' && selectedExam && `Showing data 1 to ${Math.min(8, filteredExamPasswords.length)} of ${filteredExamPasswords.length} Students`}
          </p>
          {!selectedCourse && activeTab === 'Schedule Exams' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCoursePage((p) => Math.max(1, p - 1))}
                disabled={coursePage === 1}
                className="w-10 h-10 flex items-center justify-center rounded-[10px] border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: Math.min(4, totalCoursePages) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCoursePage(p)}
                  className={cn(
                    'w-10 h-10 flex items-center justify-center rounded-[10px] text-[14px] font-bold border transition-all',
                    p === coursePage 
                      ? 'bg-[#0A3D4D] text-white border-[#0A3D4D] shadow-md' 
                      : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-gray-50'
                  )}
                >
                  {p}
                </button>
              ))}
              {totalCoursePages > 4 && <span className="px-1 text-[#94A3B8]">...</span>}
              <button
                onClick={() => setCoursePage((p) => Math.min(totalCoursePages, p + 1))}
                disabled={coursePage === totalCoursePages}
                className="w-10 h-10 flex items-center justify-center rounded-[10px] border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
          {!selectedExam && activeTab === 'Exam Request Status' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setExamPage((p) => Math.max(1, p - 1))}
                disabled={examPage === 1}
                className="w-10 h-10 flex items-center justify-center rounded-[10px] border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: Math.min(4, totalExamPages) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setExamPage(p)}
                  className={cn(
                    'w-10 h-10 flex items-center justify-center rounded-[10px] text-[14px] font-bold border transition-all',
                    p === examPage 
                      ? 'bg-[#0A3D4D] text-white border-[#0A3D4D] shadow-md' 
                      : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-gray-50'
                  )}
                >
                  {p}
                </button>
              ))}
              {totalExamPages > 4 && <span className="px-1 text-[#94A3B8]">...</span>}
              <button
                onClick={() => setExamPage((p) => Math.min(totalExamPages, p + 1))}
                disabled={examPage === totalExamPages}
                className="w-10 h-10 flex items-center justify-center rounded-[10px] border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Screen 3: Schedule Modal ─────────────────────────────────────── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
          <div className="bg-white rounded-[16px] w-full max-w-md shadow-2xl">
            <div className="p-8 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-[#1A2332]">Course Name</label>
                <div className="h-12 px-4 flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[15px] text-[#64748B]">
                  {selectedCourse?.name}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-[#1A2332]">Total Selected Students</label>
                <div className="h-12 px-4 flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[15px] text-[#64748B]">
                  {selectedStudentIds.length} Students
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-[#1A2332]">Expected Exam Date</label>
                <input
                  type="date"
                  min={today}
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] text-[#1A2332] outline-none focus:border-[#4DB6C1]"
                />
              </div>
              <button
                onClick={handleScheduleSubmit}
                disabled={submittingExam || !examDate}
                className="w-full h-12 bg-[#C8102E] text-white rounded-md font-medium text-[15px] flex items-center justify-center gap-2 hover:bg-red-800 transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submittingExam ? <Loader2 size={18} className="animate-spin" /> : <GraduationCap size={20} />}
                {submittingExam ? 'Scheduling...' : 'Schedule Exam'}
              </button>
              <button onClick={() => setShowScheduleModal(false)} className="text-center text-[15px] text-[#64748B] hover:text-[#1A2332] font-medium transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Screen 4: Success Modal ──────────────────────────────────────── */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
          <div className="bg-white rounded-[16px] w-full max-w-md shadow-2xl p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#E5F7ED] flex items-center justify-center text-[#0BB783] mb-6 shadow-[0_0_0_6px_#F2FCF6]">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-[20px] font-bold text-[#1A2332] mb-3 leading-tight">
              Successfully Schedule Students Exam
            </h3>
            <p className="text-[#64748B] text-[14px] mb-8 max-w-xs">
              Your exam request has been submitted and is pending super admin approval.
            </p>
            <button
              onClick={handleViewStatus}
              className="w-full h-12 bg-[#C8102E] text-white rounded-md font-medium text-[15px] flex items-center justify-center gap-2 hover:bg-red-800 transition-colors"
            >
              <Eye size={20} />
              View Exam Status
            </button>
            <button onClick={() => setShowSuccessModal(false)} className="mt-5 text-[15px] font-medium text-[#64748B] hover:text-[#1A2332] transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Screen 7: Student Details Drawer ────────────────────────────── */}
      {drawerStudent && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={() => setDrawerStudent(null)}
        >
          <div
            className="bg-white w-full max-w-[440px] h-full overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#E2E8F0]">
              <h3 className="text-[18px] font-bold text-[#1A2332]">View Student Details</h3>
              <button onClick={() => setDrawerStudent(null)} className="text-[#64748B] hover:text-[#1A2332] transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="p-8">
              {drawerLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#4DB8CA]" size={28} /></div>
              ) : drawerData ? (
                <div className="space-y-5">
                  {buildImageUrl(drawerData.photo || drawerData.photoUrl) && (
                    <div className="mb-4">
                      <img
                        src={buildImageUrl(drawerData.photo || drawerData.photoUrl)!}
                        alt="Student"
                        className="w-24 h-24 rounded-lg object-cover border border-[#E2E8F0]"
                      />
                    </div>
                  )}
                  {[
                    { label: 'Student ID', value: drawerData.prn },
                    { label: 'Admission Date', value: fmtDate(drawerData.admissionDate) },
                    { label: 'Student Name', value: `${drawerData.firstName || ''} ${drawerData.lastName || ''}`.trim() },
                    { label: 'Phone Number', value: drawerData.phone || '—' },
                    { label: 'Email ID', value: drawerData.email || '—' },
                    { label: 'Address', value: drawerData.address || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="space-y-1">
                      <label className="block text-[13px] font-semibold text-[#1A2332]">{label}</label>
                      <div className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[14px] text-[#64748B]">
                        {value || '—'}
                      </div>
                    </div>
                  ))}
                  {drawerData.credentials?.[0] && (
                    <div className="space-y-1">
                      <label className="block text-[13px] font-semibold text-[#1A2332]">Login Password</label>
                      <div className="w-full px-4 py-3 bg-[#FFF9F9] border border-[#FEE2E2] rounded-md text-[14px] font-mono font-bold text-[#C8102E] flex justify-between items-center">
                        <span>{visiblePasswords[`drawer_${drawerData.id}`] === false ? '••••••' : (drawerData.credentials?.[0]?.passwordPlain || '—')}</span>
                        <button 
                          onClick={() => setVisiblePasswords(prev => ({ ...prev, [`drawer_${drawerData.id}`]: !prev[`drawer_${drawerData.id}`] }))}
                          className="text-[#C8102E] hover:text-red-800"
                        >
                          <Eye size={16} className={visiblePasswords[`drawer_${drawerData.id}`] === false ? '' : 'opacity-50'} />
                        </button>
                      </div>
                    </div>
                  )}
                  {drawerData.enrollments?.length > 0 && (
                    <div className="space-y-1">
                      <label className="block text-[13px] font-semibold text-[#1A2332]">Selected Courses</label>
                      <div className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[14px] text-[#64748B]">
                        {drawerData.enrollments.map((e: any) => e.course?.name).filter(Boolean).join(', ')}
                      </div>
                    </div>
                  )}
                  {drawerData.enrollments?.length > 0 && (
                    <div className="space-y-1">
                      <label className="block text-[13px] font-semibold text-[#1A2332]">Payment Status</label>
                      <div className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[14px] text-[#64748B]">
                        {paymentLabel(drawerData.enrollments[0]?.paymentStatus || '')}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-[#64748B] py-8">Could not load student details.</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ScheduleExam;
