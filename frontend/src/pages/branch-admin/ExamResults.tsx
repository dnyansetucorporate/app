import React, { useEffect, useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowRight, Loader2, ChevronDown } from 'lucide-react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { examService } from '@/services/exam.service';

const PAGE_SIZE = 8;

const SORT_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Current Year', value: 'current' },
  { label: 'Previous Year', value: 'previous' },
] as const;
type SortYear = 'all' | 'current' | 'previous';

const getYearRange = (sortYear: SortYear) => {
  const now = new Date();
  if (sortYear === 'current') {
    return { dateFrom: `${now.getFullYear()}-01-01`, dateTo: `${now.getFullYear()}-12-31` };
  }
  if (sortYear === 'previous') {
    const prev = now.getFullYear() - 1;
    return { dateFrom: `${prev}-01-01`, dateTo: `${prev}-12-31` };
  }
  return { dateFrom: '', dateTo: '' };
};

const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const ExamResults: React.FC = () => {
  const { setPageHeader } = usePageHeader();

  // list state
  const [allExams, setAllExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [listSearch, setListSearch] = useState('');
  const [sortYear, setSortYear] = useState<SortYear>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [listPage, setListPage] = useState(1);

  // detail state
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [allResults, setAllResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [detailSearch, setDetailSearch] = useState('');
  const [detailPage, setDetailPage] = useState(1);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res: any = await examService.list({ status: 'APPROVED', limit: 100 });
      setAllExams(res.data || []);
    } catch (err) {
      console.error('Failed to fetch exams', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExams(); }, []);

  const fetchResults = async (examId: string) => {
    setLoadingResults(true);
    setAllResults([]);
    setDetailPage(1);
    setDetailSearch('');
    try {
      const res: any = await examService.getResults(examId);
      setAllResults(res.data || []);
    } catch (err) {
      console.error('Failed to fetch results', err);
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    if (selectedExam) {
      const courseName = selectedExam.examCourses?.[0]?.course?.name || 'Exam';
      setPageHeader(
        `Student In ${courseName} Course`,
        'View student performance and exam results for this course.',
        undefined,
        false,
        () => setSelectedExam(null)
      );
      fetchResults(selectedExam.id);
    } else {
      setPageHeader('Exam Results', 'View and analyze exam performance across scheduled exams.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam]);

  // effective date range
  const effectiveDateRange = useMemo(() => {
    if (customFrom || customTo) return { dateFrom: customFrom, dateTo: customTo };
    return getYearRange(sortYear);
  }, [customFrom, customTo, sortYear]);

  // filtered list
  const filteredExams = useMemo(() => {
    const { dateFrom, dateTo } = effectiveDateRange;
    return allExams.filter((exam) => {
      const courseName = exam.examCourses?.[0]?.course?.name || '';
      const matchSearch = !listSearch || courseName.toLowerCase().includes(listSearch.toLowerCase());
      const examDate = new Date(exam.examDate);
      const matchFrom = !dateFrom || examDate >= new Date(dateFrom);
      const matchTo = !dateTo || examDate <= new Date(dateTo + 'T23:59:59');
      return matchSearch && matchFrom && matchTo;
    });
  }, [allExams, listSearch, effectiveDateRange]);

  const totalListPages = Math.max(1, Math.ceil(filteredExams.length / PAGE_SIZE));
  const pagedExams = filteredExams.slice((listPage - 1) * PAGE_SIZE, listPage * PAGE_SIZE);

  // filtered detail
  const filteredResults = useMemo(() => {
    if (!detailSearch) return allResults;
    const q = detailSearch.toLowerCase();
    return allResults.filter((r) =>
      `${r.student?.firstName} ${r.student?.lastName}`.toLowerCase().includes(q) ||
      (r.student?.prn || '').toLowerCase().includes(q) ||
      (r.courseName || '').toLowerCase().includes(q)
    );
  }, [allResults, detailSearch]);

  const totalDetailPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
  const pagedResults = filteredResults.slice((detailPage - 1) * PAGE_SIZE, detailPage * PAGE_SIZE);

  const PageButtons = ({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) => {
    const pages = Array.from({ length: Math.min(total, 4) }, (_, i) => i + 1);
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, current - 1))}
          disabled={current === 1}
          className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronLeft size={15} />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-8 h-8 flex items-center justify-center rounded text-[13px] font-medium border transition-colors ${
              current === p ? 'bg-[#0A3D4D] text-white border-[#0A3D4D]' : 'border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        ))}
        {total > 4 && <span className="text-[#64748B] text-[13px] px-1">…</span>}
        <button
          onClick={() => onChange(Math.min(total, current + 1))}
          disabled={current === total}
          className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">

      {/* Filter bar (list view only) */}
      {!selectedExam && (
        <div className="flex items-center justify-end gap-6 pb-1">
          {/* Sort by Year */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu((v) => !v)}
              className="flex items-center gap-1.5 text-[14px] text-[#1A2332]"
            >
              <span className="text-[#64748B] font-medium">Sort by</span>
              <span className="font-semibold flex items-center gap-1">
                {SORT_OPTIONS.find((o) => o.value === sortYear)?.label}
                <ChevronDown size={14} className="text-[#64748B]" />
              </span>
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-8 z-20 bg-white border border-[#E2E8F0] rounded-[8px] shadow-lg py-1 min-w-[150px]">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortYear(opt.value); setCustomFrom(''); setCustomTo(''); setShowSortMenu(false); setListPage(1); }}
                    className={`w-full text-left px-4 py-2 text-[14px] hover:bg-[#F8FAFC] transition-colors ${sortYear === opt.value ? 'text-[#4DB8CA] font-semibold' : 'text-[#1A2332]'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 text-[14px]">
            <span className="text-[#64748B] font-medium">Date range</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => { setCustomFrom(e.target.value); setSortYear('all'); setListPage(1); }}
              className="border border-[#E2E8F0] rounded-[6px] px-2 py-1 text-[13px] text-[#1A2332] focus:outline-none focus:border-[#4DB8CA]"
            />
            <span className="text-[#64748B]">–</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => { setCustomTo(e.target.value); setSortYear('all'); setListPage(1); }}
              className="border border-[#E2E8F0] rounded-[6px] px-2 py-1 text-[13px] text-[#1A2332] focus:outline-none focus:border-[#4DB8CA]"
            />
            {(customFrom || customTo || sortYear !== 'all') && (
              <button
                onClick={() => { setCustomFrom(''); setCustomTo(''); setSortYear('all'); setListPage(1); }}
                className="text-[#4DB8CA] text-[12px] hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main card */}
      <div
        className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden"
        onClick={() => setShowSortMenu(false)}
      >
        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h4 className="text-[18px] font-bold text-[#1A2332]">
            {selectedExam
              ? `Students list (${filteredResults.length} Students)`
              : `Courses list (${filteredExams.length})`}
          </h4>
          <div className="flex items-center gap-2 w-[320px] px-4 py-2 bg-white border border-[#E2E8F0] rounded-[8px]">
            <Search size={16} className="text-[#64748B]" />
            <input
              type="text"
              placeholder={selectedExam ? 'Search by name, ID, course' : 'Search by course name'}
              value={selectedExam ? detailSearch : listSearch}
              onChange={(e) => {
                if (selectedExam) { setDetailSearch(e.target.value); setDetailPage(1); }
                else { setListSearch(e.target.value); setListPage(1); }
              }}
              className="bg-transparent border-none focus:outline-none text-[14px] w-full text-[#1A2332] placeholder:text-[#94A3B8]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading || loadingResults ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-[#4DB8CA]" size={40} />
              <p className="text-[#94A3B8] text-[14px]">Loading data…</p>
            </div>
          ) : !selectedExam ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#4DB8CA] text-white text-[14px]">
                <tr>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Sr. No</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Course Name <ChevronDown size={13} className="inline ml-1 opacity-70" /></th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Exam Date <ChevronDown size={13} className="inline ml-1 opacity-70" /></th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">No. of Students <ChevronDown size={13} className="inline ml-1 opacity-70" /></th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Grade Distribution <ChevronDown size={13} className="inline ml-1 opacity-70" /></th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {pagedExams.map((exam, idx) => (
                  <tr key={exam.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{(listPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{exam.examCourses?.[0]?.course?.name || '–'}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{formatDate(exam.examDate)}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{exam.numStudents ?? 0}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">
                      <span className="text-[#0BB783] font-semibold">A:{exam.gradeA ?? 0}</span>
                      <span className="mx-1 text-[#94A3B8]">|</span>
                      <span className="text-[#0BB783] font-semibold">B:{exam.gradeB ?? 0}</span>
                      <span className="mx-1 text-[#94A3B8]">|</span>
                      <span className="text-[#0BB783] font-semibold">C:{exam.gradeC ?? 0}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <button
                          onClick={() => setSelectedExam(exam)}
                          className="w-8 h-8 flex items-center justify-center rounded-[4px] border border-[#4DB8CA] text-[#4DB8CA] hover:bg-[#E6F6F9] transition-colors"
                        >
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pagedExams.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-[#94A3B8] text-[14px]">No approved exams found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#4DB8CA] text-white text-[14px]">
                <tr>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Sr. No</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Student ID <ChevronDown size={13} className="inline ml-1 opacity-70" /></th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Student Name <ChevronDown size={13} className="inline ml-1 opacity-70" /></th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Admission Date <ChevronDown size={13} className="inline ml-1 opacity-70" /></th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Exam Marks <ChevronDown size={13} className="inline ml-1 opacity-70" /></th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Grade <ChevronDown size={13} className="inline ml-1 opacity-70" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {pagedResults.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{(detailPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{r.student?.prn || '–'}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{r.student?.firstName} {r.student?.lastName}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{r.student?.enrollments?.[0]?.enrolledAt ? formatDate(r.student.enrollments[0].enrolledAt) : r.student?.createdAt ? formatDate(r.student.createdAt) : '–'}</td>
                    <td className="py-4 px-6 text-[14px] font-semibold text-[#0BB783]">{r.marks} %</td>
                    <td className="py-4 px-6 text-[14px] font-bold">
                      <span className={
                        'text-[#0BB783]'
                      }>{r.grade ?? '—'}</span>
                    </td>
                  </tr>
                ))}
                {pagedResults.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-[#94A3B8] text-[14px]">No exam results recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        {!loading && !loadingResults && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0]">
            {!selectedExam ? (
              <>
                <p className="text-[14px] text-[#64748B]">
                  Showing data {filteredExams.length === 0 ? 0 : (listPage - 1) * PAGE_SIZE + 1} to{' '}
                  {Math.min(listPage * PAGE_SIZE, filteredExams.length)} of {filteredExams.length} exams
                </p>
                <PageButtons current={listPage} total={totalListPages} onChange={setListPage} />
              </>
            ) : (
              <>
                <p className="text-[14px] text-[#64748B]">
                  Showing data {filteredResults.length === 0 ? 0 : (detailPage - 1) * PAGE_SIZE + 1} to{' '}
                  {Math.min(detailPage * PAGE_SIZE, filteredResults.length)} of {filteredResults.length} Students
                </p>
                <PageButtons current={detailPage} total={totalDetailPages} onChange={setDetailPage} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamResults;
