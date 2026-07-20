import React, { useState, useEffect, useRef } from 'react';
import { Search, Eye, Trash2, Plus, X, ChevronLeft, ChevronRight, ChevronDown, ArrowLeft, ExternalLink, CheckCircle2, Loader2, Upload, Download } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { courseService } from '@/services/course.service';
import toast from '@/utils/toastWrapper';

interface Course {
  id: string;
  name: string;
  questionPapers: number;
  totalStudents: number;
  activeStudents: number;
}

const SuccessModal = ({ title, btnLabel, onClose }: { title: string; btnLabel: string; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
    <div className="bg-white rounded-[16px] w-full max-w-md shadow-2xl p-8 md:p-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
      <div className="w-16 h-16 rounded-full bg-[#E5F7ED] flex items-center justify-center text-[#0BB783] mb-6 shadow-[0_0_0_6px_#F2FCF6]">
        <CheckCircle2 size={36} strokeWidth={2.5} />
      </div>
      <h2 className="text-[20px] font-bold text-[#1A2332] leading-snug mb-2 whitespace-pre-line">
        {title}
      </h2>
      <p className="text-[14px] text-[#64748B] mt-2 mb-8 max-w-xs">
        Course details have been successfully updated in the system.
      </p>
      <button 
        onClick={onClose}
        className="w-full h-12 bg-[#C8102E] text-white rounded-md font-medium text-[15px] flex items-center justify-center gap-2 hover:bg-red-800 transition-colors mb-4"
      >
        <Plus size={20} />
        {btnLabel}
      </button>
      <button
        onClick={onClose}
        className="text-[15px] text-[#64748B] font-medium hover:text-[#1A2332] transition-colors"
      >
        Close
      </button>
    </div>
  </div>
);

interface Question {
  id: number;
  questionNo: number;
  text: string;
  options: string[];
  correctOption: number;
}

const AddQuestionDrawer = ({ onClose, onAdd, nextQuestionNo }: { onClose: () => void; onAdd: (q: Question) => void; nextQuestionNo: number }) => {
  const [questionNo] = useState(nextQuestionNo);
  const [qText, setQText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState(0);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-text-dark">Add Question Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="flex-1 px-5 py-5 space-y-5 overflow-y-auto">
          <div>
            <label className="text-sm font-medium text-text-dark mb-1.5 block">Question <span className="text-primary">*</span></label>
            <textarea
              rows={3}
              placeholder="Write question here"
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              className="input-field resize-none focus:border-[#4DB8CA]"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-text-dark mb-3">MCQ Options</p>
            <div className="space-y-3">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-border pb-2">
                  <span className="text-xs text-text-muted w-4">{i + 1}.</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = e.target.value;
                      setOptions(next);
                    }}
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm text-text-dark placeholder:text-gray-400"
                    placeholder="Enter option"
                  />
                  <button
                    onClick={() => setOptions(options.filter((_, j) => j !== i))}
                    className="text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setOptions([...options, ''])}
                className="text-[#4DB8CA] font-semibold text-sm underline"
              >
                Add New Option
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text-dark mb-1.5 block">Please enter the correct answer here <span className="text-primary">*</span></label>
            <div className="relative">
              <select
                className="input-field pr-8 appearance-none focus:border-[#4DB8CA]"
                value={correctOption}
                onChange={(e) => setCorrectOption(Number(e.target.value))}
              >
                <option value="" disabled>Select correct answer here</option>
                {options.map((_, i) => (
                  <option key={i} value={i}>Option {i + 1}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-3">
          <button onClick={onClose} className="text-sm text-text-muted font-medium hover:text-text-dark">Discard</button>
          <button
            className="flex items-center gap-2 px-6 py-2 bg-[#C8102E] text-white rounded-[6px] text-[14px] font-medium hover:bg-red-800 transition-colors"
            onClick={() => {
              if (!qText.trim()) return;
              const filledOptions = options.filter(o => o.trim());
              if (filledOptions.length < 2) return;
              onAdd({ id: Date.now(), questionNo, text: qText, options: filledOptions, correctOption });
              onClose();
            }}
          >
            <Plus size={15} />
            Add Question
          </button>
        </div>
      </div>
    </div>
  );
};

const Courses: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'add-course' | 'add-paper'>('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCoursePapers, setSelectedCoursePapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [coursePage, setCoursePage] = useState(1);
  const [courseMeta, setCourseMeta] = useState<any>(null);
  const [courseSearchInput, setCourseSearchInput] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [paperSearchInput, setPaperSearchInput] = useState('');
  const PAGE_SIZE = 10;
  
  const [showDrawer, setShowDrawer] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showCourseSuccess, setShowCourseSuccess] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseError, setNewCourseError] = useState<string | null>(null);
  const [viewPapers, setViewPapers] = useState(false);
  const [viewCourseId, setViewCourseId] = useState('');
  const [viewCourseName, setViewCourseName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add Question Paper form state
  const [selectedCourseForPaper, setSelectedCourseForPaper] = useState('');
  const [paperName, setPaperName] = useState('');
  const [paperDuration, setPaperDuration] = useState('');
  const [savingPaper, setSavingPaper] = useState(false);
  const [paperError, setPaperError] = useState<string | null>(null);
  const [editingPaperId, setEditingPaperId] = useState<string | null>(null);
  const [loadingEditPaper, setLoadingEditPaper] = useState(false);
  const [csvParseError, setCsvParseError] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const { setPageHeader } = usePageHeader();

  // ── CSV helpers ───────────────────────────────────────────────────────────
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim()); current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-upload of same file
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          setCsvParseError('CSV must have a header row and at least one data row.');
          return;
        }
        const dataLines = lines.slice(1);
        const parsed: Question[] = [];
        const errors: string[] = [];

        dataLines.forEach((line, idx) => {
          const row = parseCSVLine(line);
          // Format: questionNo,questionText,option1,option2[,option3,option4,option5],correctOption
          if (row.length < 5) {
            errors.push(`Row ${idx + 2}: needs at least questionNo, questionText, 2 options, and correctOption`);
            return;
          }
          const questionNo = parseInt(row[0]);
          if (isNaN(questionNo) || questionNo < 1) {
            errors.push(`Row ${idx + 2}: questionNo must be a positive integer`);
            return;
          }
          const questionText = row[1];
          if (!questionText) { errors.push(`Row ${idx + 2}: questionText is empty`); return; }

          const correctOption1Based = parseInt(row[row.length - 1]);
          if (isNaN(correctOption1Based) || correctOption1Based < 1) {
            errors.push(`Row ${idx + 2}: correctOption must be a 1-based number`);
            return;
          }
          const options = row.slice(2, row.length - 1).filter(o => o.trim() !== '');
          if (options.length < 2) { errors.push(`Row ${idx + 2}: at least 2 options required`); return; }
          if (correctOption1Based > options.length) {
            errors.push(`Row ${idx + 2}: correctOption (${correctOption1Based}) exceeds options count (${options.length})`);
            return;
          }
          parsed.push({ id: Date.now() + idx, questionNo, text: questionText, options, correctOption: correctOption1Based - 1 });
        });

        if (errors.length > 0) {
          setCsvParseError(errors.slice(0, 3).join(' | ') + (errors.length > 3 ? ` (+${errors.length - 3} more)` : ''));
          return;
        }
        setCsvParseError(null);
        setQuestions(prev => [...prev, ...parsed]);
      } catch {
        setCsvParseError('Failed to parse CSV. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const downloadCSVTemplate = () => {
    const rows = [
      'questionNo,questionText,option1,option2,option3,option4,correctOption',
      '1,"What is the capital of France?",Berlin,Madrid,Paris,Rome,3',
      '2,"Which is the largest planet in the solar system?",Earth,Jupiter,Mars,Saturn,2',
      '3,"What does HTML stand for?","HyperText Markup Language","HyperText Machine Language","HyperTool Multi Language","HyperTool Markup Language",1',
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'question_paper_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Debounce course search — update search + reset page together
  useEffect(() => {
    const t = setTimeout(() => {
      setCoursePage(1);
      setCourseSearch(courseSearchInput);
    }, 400);
    return () => clearTimeout(t);
  }, [courseSearchInput]);

  useEffect(() => {
    fetchCourses();
  }, [coursePage, courseSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res: any = await courseService.list({ page: coursePage, limit: PAGE_SIZE, search: courseSearch || undefined });
      setCourses(res.data || res.courses || []);
      setCourseMeta(res.meta || null);
    } catch (err) {
      console.error('Failed to fetch courses', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await courseService.remove(deleteTarget.id);
      toast.success('Course deleted successfully');
      setDeleteTarget(null);
      fetchCourses();
    } catch (err: any) {
      console.error('Failed to delete course', err);
      toast.error(err?.response?.data?.message || 'Failed to delete course');
    } finally {
      setDeleting(false);
    }
  };

  const fetchPapers = async (courseId: string) => {
    setLoadingPapers(true);
    try {
      const res: any = await courseService.listPapers(courseId);
      setSelectedCoursePapers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch papers', err);
    } finally {
      setLoadingPapers(false);
    }
  };

  useEffect(() => {
    if (viewPapers) {
      setPageHeader(
        `View ${viewCourseName} Course Details`,
        'View and manage all question papers associated with this course.'
      );
      fetchPapers(viewCourseId);
    } else {
      setPageHeader(
        'All Courses',
        'Manage all available courses, track enrollments, and monitor student activity across branches.'
      );
    }
  }, [viewPapers, viewCourseName, viewCourseId, setPageHeader]);

  return (
    <div className="space-y-4">
      {/* Back button when viewing papers */}
      {viewPapers && (
        <button onClick={() => setViewPapers(false)} className="flex items-center gap-2 text-[#64748B] hover:text-[#1A2332] transition-colors text-sm">
          <ArrowLeft size={16} />
          Back
        </button>
      )}

      {/* Tabs (only when not viewing papers) */}
      {!viewPapers && (
        <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-[8px] p-1 w-fit shadow-sm">
          {(['all', 'add-course', 'add-paper'] as const).map((tab) => {
            const labels = { all: 'All Course', 'add-course': 'Add New Course', 'add-paper': 'Add New Question Paper' };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-6 py-2.5 rounded-[6px] text-[15px] font-medium transition-colors',
                  activeTab === tab ? 'bg-[#C8102E] text-white' : 'text-[#1A2332] hover:bg-gray-50'
                )}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      )}

      {/* === ALL COURSES === */}
      {!viewPapers && activeTab === 'all' && (
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
            <h3 className="text-[18px] font-bold text-[#1A2332]">All Courses ({courseMeta?.total ?? courses.length} Courses)</h3>
            <div className="flex items-center gap-2 w-full max-w-xs px-4 py-2 bg-white border border-[#E2E8F0] rounded-md">
              <Search size={16} className="text-[#64748B]" />
              <input type="text" placeholder="Search by course name" value={courseSearchInput} onChange={(e) => setCourseSearchInput(e.target.value)} className="bg-transparent border-none focus:outline-none text-[14px] w-full text-[#1A2332] placeholder:text-[#64748B]" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#4DB8CA] text-white text-[14px]">
                <tr>
                  <th className="py-4 px-6 font-medium whitespace-nowrap w-20">Sr. No</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Course Name</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Question Papers</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Total Students</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Active Students</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="animate-spin text-[#4DB8CA]" size={32} />
                        <p className="text-gray-400">Loading courses...</p>
                      </div>
                    </td>
                  </tr>
                ) : courses.map((course, idx) => (
                  <tr key={course.id} className={cn('hover:bg-[#F8FAFC] transition-colors', idx % 2 === 1 && 'bg-[#F8FAFC]')}>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{(coursePage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{course.name}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{course.questionPapers} Papers</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{course.totalStudents}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{course.activeStudents}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          className="text-[#4DB8CA] border border-[#4DB8CA] rounded-[4px] p-1.5 hover:bg-[#E6F6F9] transition-colors"
                          onClick={() => { 
                            setViewCourseId(course.id);
                            setViewCourseName(course.name); 
                            setViewPapers(true); 
                          }}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(course)}
                          title="Delete"
                          className="text-[#C8102E] border border-[#C8102E] rounded-[4px] p-1.5 bg-[#FEF2F2] hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && courses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400">No courses found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {(() => {
            const total      = courseMeta?.total      ?? courses.length;
            const totalPages = courseMeta?.totalPages ?? 1;
            const from       = total === 0 ? 0 : (coursePage - 1) * PAGE_SIZE + 1;
            const to         = Math.min(coursePage * PAGE_SIZE, total);
            const windowSize = 4;
            let start = Math.max(1, coursePage - 1);
            let end   = Math.min(totalPages, start + windowSize - 1);
            start     = Math.max(1, end - windowSize + 1);
            const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            return (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0] bg-white">
                <p className="text-[14px] text-[#64748B]">Showing data {from} to {to} of {total} Courses</p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setCoursePage(p => Math.max(1, p - 1))} disabled={coursePage === 1} className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"><ChevronLeft size={14} /></button>
                  {start > 1 && <span className="px-1 text-[#94A3B8]">...</span>}
                  {pages.map(p => (
                    <button key={p} onClick={() => setCoursePage(p)} className={cn('w-8 h-8 flex items-center justify-center rounded text-[14px] transition-colors', p === coursePage ? 'bg-[#0A3D4D] text-white' : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-gray-50')}>{p}</button>
                  ))}
                  {end < totalPages && <span className="px-1 text-[#94A3B8]">...</span>}
                  <button onClick={() => setCoursePage(p => Math.min(totalPages, p + 1))} disabled={coursePage >= totalPages} className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"><ChevronRight size={14} /></button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* === COURSE PAPERS VIEW === */}
      {viewPapers && (
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
            <h3 className="text-[18px] font-bold text-[#1A2332]">All Question Papers ({selectedCoursePapers.length})</h3>
            <div className="flex items-center gap-2 w-full max-w-xs px-4 py-2 bg-white border border-[#E2E8F0] rounded-md">
              <Search size={16} className="text-[#64748B]" />
              <input type="text" placeholder="Search by paper name" value={paperSearchInput} onChange={(e) => setPaperSearchInput(e.target.value)} className="bg-transparent border-none focus:outline-none text-[14px] w-full text-[#1A2332] placeholder:text-[#64748B]" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#4DB8CA] text-white text-[14px]">
                <tr>
                  <th className="py-4 px-6 font-medium whitespace-nowrap w-20">Sr. No</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Question Papers Name</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {loadingPapers ? (
                  <tr>
                    <td colSpan={3} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="animate-spin text-[#4DB8CA]" size={32} />
                        <p className="text-gray-400">Loading papers...</p>
                      </div>
                    </td>
                  </tr>
                ) : selectedCoursePapers.filter(p => !paperSearchInput || p.title?.toLowerCase().includes(paperSearchInput.toLowerCase())).map((paper, idx) => (
                  <tr key={paper.id} className={cn('hover:bg-[#F8FAFC] transition-colors', idx % 2 === 1 && 'bg-[#F8FAFC]')}>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{idx + 1}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{paper.title}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                         <button
                           className="text-[#4DB8CA] border border-[#4DB8CA] rounded-[4px] p-1.5 hover:bg-[#E6F6F9] transition-colors"
                           onClick={async () => {
                             setLoadingEditPaper(true);
                             try {
                               const res: any = await courseService.listQuestions(paper.id);
                               const existingQuestions: Question[] = (res.data || []).map((q: any, i: number) => ({
                                 id: Date.now() + i,
                                 questionNo: q.questionNo,
                                 text: q.questionText,
                                 options: q.options as string[],
                                 correctOption: q.correctOption,
                               }));
                               setEditingPaperId(paper.id);
                               setSelectedCourseForPaper(viewCourseId);
                               setPaperName(paper.title);
                               setPaperDuration(String(paper.durationMinutes ?? 90));
                               setQuestions(existingQuestions);
                               setPaperError(null);
                               setViewPapers(false);
                               setActiveTab('add-paper');
                             } catch (err) {
                               console.error('Failed to load paper for editing', err);
                             } finally {
                               setLoadingEditPaper(false);
                             }
                           }}
                         >
                           {loadingEditPaper ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loadingPapers && selectedCoursePapers.length === 0 && (
                   <tr>
                     <td colSpan={3} className="py-10 text-center text-gray-400">No question papers found for this course.</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0] bg-white">
            <p className="text-[14px] text-[#64748B]">
              Showing {selectedCoursePapers.filter(p => !paperSearchInput || p.title?.toLowerCase().includes(paperSearchInput.toLowerCase())).length} of {selectedCoursePapers.length} entries
            </p>
          </div>
        </div>
      )}

      {/* === ADD NEW COURSE === */}
      {!viewPapers && activeTab === 'add-course' && (
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-8">
          <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[14px] font-semibold text-[#1A2332]">
                  Course Name <span className="text-[#C8102E]">*</span>
                </label>
                <input
                  value={newCourseName}
                  onChange={(e) => {
                    setNewCourseName(e.target.value);
                    if (e.target.value.trim()) setNewCourseError(null);
                  }}
                  onBlur={() => {
                    if (!newCourseName.trim()) setNewCourseError('Course name is required');
                  }}
                  type="text"
                  placeholder="Enter course name"
                  className={cn(
                    "w-full h-12 px-4 bg-white rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8]",
                    newCourseError ? 'border-[#C8102E] border' : 'border border-[#E2E8F0] focus:border-[#4DB8CA]'
                  )}
                />
                {newCourseError && <p className="text-[#C8102E] text-[12px] mt-2">{newCourseError}</p>}
              </div>
            
            <div className="flex items-center justify-end gap-6 pt-6 border-t border-[#E2E8F0] mt-8">
              <button onClick={() => setActiveTab('all')} className="text-[14px] font-medium text-[#64748B] hover:text-[#1A2332] transition-colors">
                Cancel
              </button>
              <button 
                onClick={async () => {
                  try {
                    if (!newCourseName.trim()) {
                      setNewCourseError('Course name is required');
                      return;
                    }
                    await courseService.create({ name: newCourseName.trim() });
                    setShowCourseSuccess(true);
                    setNewCourseName('');
                    setNewCourseError(null);
                    fetchCourses();
                  } catch (err) {
                    console.error('Failed to create course', err);
                    setNewCourseError('Failed to create course');
                  }
                }}
                className="flex items-center gap-2 px-8 py-3 bg-[#C8102E] text-white rounded-[6px] text-[15px] font-medium hover:bg-red-800 transition-colors shadow-sm"
              >
                <Plus size={18} />
                Add Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === ADD NEW QUESTION PAPER === */}
      {!viewPapers && activeTab === 'add-paper' && (
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-8">
          {editingPaperId && (
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#E2E8F0]">
              <span className="text-[13px] font-semibold text-[#4DB8CA] bg-[#E6F6F9] px-3 py-1 rounded-full">Editing Question Paper</span>
              <span className="text-[13px] text-[#64748B]">— modify the details below and save</span>
            </div>
          )}
          <div className="space-y-6">
            
            {/* Select Course */}
            <div className="space-y-2">
              <label className="block text-[14px] font-semibold text-[#1A2332]">
                Select Course <span className="text-[#C8102E]">*</span>
              </label>
              <div className="relative">
                <select
                  className="w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] appearance-none outline-none focus:border-[#4DB8CA]"
                  value={selectedCourseForPaper}
                  onChange={(e) => setSelectedCourseForPaper(e.target.value)}
                >
                  <option value="">Select course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
              </div>
            </div>

            {/* Paper name + duration */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <label className="block text-[14px] font-semibold text-[#1A2332]">
                  Question Paper Name <span className="text-[#C8102E]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter question paper name"
                  value={paperName}
                  onChange={(e) => setPaperName(e.target.value)}
                  className="w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[14px] font-semibold text-[#1A2332]">
                  Select Exam Duration <span className="text-[#C8102E]">*</span>
                </label>
                <div className="relative">
                  <select
                    className="w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] appearance-none outline-none focus:border-[#4DB8CA]"
                    value={paperDuration}
                    onChange={(e) => setPaperDuration(e.target.value)}
                  >
                    <option value="">Select Exam Duration</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">60 Minutes</option>
                    <option value="90">90 Minutes</option>
                    <option value="120">120 Minutes</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                </div>
              </div>
            </div>

            <hr className="border-[#E2E8F0] my-6" />

            {/* Questions list */}
            {questions.length > 0 && (
              <div className="space-y-4 mb-6">
                {questions.map((q, i) => (
                  <div key={q.id} className="border border-[#E2E8F0] rounded-[8px] overflow-hidden">
                    <div className="flex items-center justify-between bg-[#E6F6F9] px-6 py-4 border-b border-[#E2E8F0]">
                      <p className="text-[15px] font-semibold text-[#1A2332]">
                        {i + 1}. {q.text || 'Lorem Ipsum is simply dummy text of the printing and typesetting.'}
                      </p>
                      <button
                        onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
                        className="text-[#64748B] hover:text-[#C8102E] transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="px-8 py-5 space-y-3">
                      {q.options.map((opt, j) => (
                        <div key={j} className="flex items-center gap-3">
                          <input type="checkbox" className="w-4 h-4 rounded-[4px] border-[#E2E8F0] accent-[#C8102E] text-[#C8102E] cursor-pointer" readOnly />
                          <span className="text-[14px] font-medium text-[#1A2332]">{opt || 'Lorem Ipsum is simply dummy text'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add question / Upload CSV buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowDrawer(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#E2E8F0] text-[#1A2332] rounded-[6px] text-[14px] font-medium hover:bg-gray-50 transition-colors w-fit"
              >
                <Plus size={18} className="text-[#1A2332]" />
                Add New Question
              </button>

              {/* CSV upload */}
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVUpload}
              />
              <button
                onClick={() => { setCsvParseError(null); csvInputRef.current?.click(); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#4DB8CA] text-[#4DB8CA] rounded-[6px] text-[14px] font-medium hover:bg-[#E6F6F9] transition-colors w-fit"
              >
                <Upload size={18} />
                Upload CSV
              </button>

              <button
                onClick={downloadCSVTemplate}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#E2E8F0] text-[#64748B] rounded-[6px] text-[14px] font-medium hover:bg-gray-50 transition-colors w-fit"
                title="Download CSV template"
              >
                <Download size={16} />
                Download Template
              </button>
            </div>

            {/* CSV format hint */}
            <p className="text-[12px] text-[#94A3B8] -mt-1">
              CSV columns: <code className="bg-[#F1F5F9] px-1 rounded">questionNo, questionText, option1, option2 [, option3, option4, option5], correctOption</code> — correctOption is 1-based
            </p>

            {/* CSV parse error */}
            {csvParseError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-[6px]">
                <X size={16} className="text-[#C8102E] flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-[#C8102E]">{csvParseError}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-6 pt-6 border-t border-[#E2E8F0] mt-8">
              <button onClick={() => { setActiveTab('all'); setEditingPaperId(null); setPaperError(null); }} className="text-[14px] font-medium text-[#64748B] hover:text-[#1A2332] transition-colors">
                Cancel
              </button>
              {paperError && <p className="text-[13px] text-[#C8102E]">{paperError}</p>}
              <button
                disabled={savingPaper}
                onClick={async () => {
                  if (!selectedCourseForPaper) { setPaperError('Please select a course'); return; }
                  if (!paperName.trim()) { setPaperError('Please enter a paper name'); return; }
                  if (!paperDuration) { setPaperError('Please select an exam duration'); return; }
                  if (questions.length === 0) { setPaperError('Please add at least one question'); return; }
                  setPaperError(null);
                  setSavingPaper(true);
                  try {
                    let paperId: string;
                    if (editingPaperId) {
                      // Update existing paper
                      await courseService.updatePaper(selectedCourseForPaper, editingPaperId, { title: paperName.trim(), durationMinutes: Number(paperDuration) });
                      paperId = editingPaperId;
                      // Delete all existing questions then re-add
                      const existingRes: any = await courseService.listQuestions(paperId);
                      await Promise.all((existingRes.data || []).map((q: any) =>
                        courseService.removeQuestion(paperId, q.id)
                      ));
                    } else {
                      const paperRes: any = await courseService.createPaper(selectedCourseForPaper, { title: paperName.trim(), durationMinutes: Number(paperDuration) });
                      paperId = paperRes.data?.id;
                    }
                    await Promise.all(questions.map(q =>
                      courseService.addQuestion(paperId, {
                        questionNo: q.questionNo,
                        questionText: q.text,
                        options: q.options,
                        correctOption: q.correctOption,
                      })
                    ));
                    setShowCourseSuccess(true);
                    setSelectedCourseForPaper('');
                    setPaperName('');
                    setPaperDuration('');
                    setQuestions([]);
                    setEditingPaperId(null);
                    fetchCourses();
                  } catch (err: any) {
                    setPaperError(err?.response?.data?.message || 'Failed to save question paper');
                  } finally {
                    setSavingPaper(false);
                  }
                }}
                className="flex items-center gap-2 px-8 py-3 bg-[#C8102E] text-white rounded-[6px] text-[15px] font-medium hover:bg-red-800 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingPaper ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {savingPaper ? 'Saving...' : (editingPaperId ? 'Update Question Paper' : 'Add Question Paper')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer */}
      {showDrawer && (
        <AddQuestionDrawer
          onClose={() => setShowDrawer(false)}
          onAdd={(q) => setQuestions([...questions, q])}
          nextQuestionNo={questions.length + 1}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-sm p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-[18px] font-bold text-[#1A2332]">Delete Course</h3>
              <p className="text-[14px] text-[#64748B]">
                Are you sure you want to delete course <span className="font-semibold text-[#1A2332]">{deleteTarget.name}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-5 py-2.5 text-[14px] font-medium text-[#64748B] border border-[#E2E8F0] rounded-[6px] hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCourse}
                disabled={deleting}
                className="px-5 py-2.5 text-[14px] font-medium text-white bg-[#C8102E] rounded-[6px] hover:bg-red-800 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success modal */}
      {showCourseSuccess && (
        <SuccessModal
          title={`"${newCourseName}"\nHas Been Successfully Added!`}
          btnLabel="Add New Course"
          onClose={() => { setShowCourseSuccess(false); setActiveTab('add-course'); }}
        />
      )}
    </div>
  );
};

export default Courses;
