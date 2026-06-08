import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import { useAuth } from '@/contexts/AuthContext';
import { courseService } from '@/services/course.service';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

type ExamCourseItem = {
  courseId: string;
  examId: string;
  isCompleted: boolean;
  durationMinutes?: number;
  totalQuestions?: number;
  questionPaper?: { id?: string; _count?: { questions?: number } };
  course: { name: string };
};

type ExamsData = {
  student: { name: string; prn: string };
  exams: Array<{
    id: string;
    isCompleted: boolean;
    examCourses: ExamCourseItem[];
  }>;
};

const SelectExam: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [examsData, setExamsData] = useState<ExamsData | null>(null);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<{ examId: string; courseId: string } | null>(null);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response: any = await studentService.getAvailableExams();
        const payload = response?.data ?? response;

        if (!payload) {
          throw new Error('Invalid response from server');
        }

        // Handle both old/new response shapes without static placeholders.
        const exams = Array.isArray(payload) ? payload : (payload.exams || []);
        const profile = !Array.isArray(payload) ? payload.student : null;
        const normalizedData: ExamsData = {
          student: {
            name: profile?.name || user?.name || 'Student',
            prn: profile?.prn || user?.studentId || '',
          },
          exams,
        };

        setExamsData(normalizedData);

        const allItems: Array<ExamCourseItem & { examId: string }> = normalizedData.exams.flatMap((exam: any) =>
          (exam.examCourses || []).map((ec: any) => ({ ...ec, examId: exam.id }))
        );

        const countsEntries = await Promise.all(
          allItems.map(async (item) => {
            const key = `${item.examId}_${item.courseId}`;
            const paperId = item.questionPaper?.id;
            if (!paperId) {
              return [key, 0] as const;
            }
            try {
              const questionsRes: any = await courseService.listQuestions(paperId);
              const questions = questionsRes?.data ?? questionsRes ?? [];
              return [key, Array.isArray(questions) ? questions.length : 0] as const;
            } catch {
              return [key, item.totalQuestions ?? item.questionPaper?._count?.questions ?? 0] as const;
            }
          })
        );
        setQuestionCounts(Object.fromEntries(countsEntries));
        
        // Auto-select the first pending exam if available
        if (normalizedData.exams && Array.isArray(normalizedData.exams)) {
          const firstPending = normalizedData.exams
            .flatMap((exam: any) => (exam.examCourses || []).map((ec: any) => ({ ...ec, examId: exam.id, isCompleted: exam.isCompleted })))
            .find((item: ExamCourseItem) => !item.isCompleted);
          
          if (firstPending) {
            setSelectedExam({ examId: firstPending.examId, courseId: firstPending.courseId });
          }
        }
      } catch (err: any) {
        console.error('Fetch exams error:', err);
        setError(err.message || 'Failed to fetch exams');
      } finally {
        setCountsLoading(false);
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  const handleStartExam = () => {
    if (selectedExam) {
      navigate(`/student/exam?examId=${selectedExam.examId}&courseId=${selectedExam.courseId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader2 className="animate-spin text-[#C8102E] mb-4" size={40} />
        <p className="text-gray-500 font-medium tracking-tight">Preparing your exam dashboard...</p>
      </div>
    );
  }

  if (error || !examsData || examsData.exams.length === 0) {
    return (
      <div className="bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-full max-w-[560px] p-12 text-center border border-white/20 backdrop-blur-sm">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <AlertCircle className="text-gray-300" size={48} />
        </div>
        <h2 className="text-3xl font-bold text-[#1A2332] mb-4">No Exams Scheduled</h2>
        <p className="text-[#64748B] text-[18px] leading-relaxed mb-10">
          {error || "There are no exams scheduled for you today. Please verify with your branch coordinator."}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full h-16 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] rounded-2xl text-[18px] font-bold transition-all active:scale-[0.98]"
        >
          Refresh Status
        </button>
      </div>
    );
  }

  const allExamItems: ExamCourseItem[] = examsData.exams.flatMap(exam =>
    exam.examCourses.map((course: any) => ({
      ...course, 
      examId: exam.id, 
      isCompleted: exam.isCompleted 
    }))
  );
  const selectedItem = selectedExam
    ? allExamItems.find(i => i.examId === selectedExam.examId && i.courseId === selectedExam.courseId)
    : null;
  const selectedItemKey = selectedItem ? `${selectedItem.examId}_${selectedItem.courseId}` : '';
  const selectedItemQuestions = selectedItem
    ? (questionCounts[selectedItemKey] ?? selectedItem.totalQuestions ?? selectedItem.questionPaper?._count?.questions ?? 0)
    : 0;
  const isSelectedItemCompleted = !!selectedItem?.isCompleted;

  return (
    <div className="w-full max-w-[430px] bg-white rounded-[22px] shadow-[0_20px_45px_rgba(15,23,42,0.12)] p-7 md:p-8 border border-[#E5E7EB]">
      <div className="mb-6">
        <h1 className="text-[50px] leading-[0.92] tracking-[-1px] font-bold text-[#111827] mb-3">
          Select Your Exam
          <br />
          Course
        </h1>
        <p className="text-[#4B5563] text-[17px] leading-6">
          Make sure you have stable internet connection to complete the exam without interruptions.
        </p>
      </div>

      <div className="bg-[#F3F4F6] rounded-[10px] p-4 mb-5 border border-[#ECEFF2]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[#111827] font-semibold text-[18px]">Student Name: {examsData.student.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#111827] font-semibold text-[18px]">Student ID: {examsData.student.prn || '—'}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {allExamItems.map((item, idx: number) => {
          const isSelected = selectedExam?.examId === item.examId && selectedExam?.courseId === item.courseId;
          const isCompleted = item.isCompleted;
          const itemKey = `${item.examId}_${item.courseId}`;
          const totalQuestions = questionCounts[itemKey] ?? item.totalQuestions ?? item.questionPaper?._count?.questions ?? 0;
          const durationMinutes = item.durationMinutes ?? 90;

          const canStart = !isCompleted && totalQuestions > 0;

          return (
            <div 
              key={idx} 
              onClick={() => canStart && setSelectedExam({ examId: item.examId, courseId: item.courseId })}
              className={`
                relative rounded-[12px] border transition-all cursor-pointer p-4
                ${(isCompleted || totalQuestions === 0) ? 'bg-[#EEF0F2] border-[#E2E8F0] opacity-75 cursor-not-allowed' : 
                  isSelected ? 'bg-white border-[#4DB8CA] shadow-[0_0_0_1px_#4DB8CA]' : 'bg-white border-[#D9E2EC] hover:border-[#9FB8CC]'}
              `}
            >
              <div className="absolute left-4 top-4">
                <div className={`
                  w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all bg-white
                  ${isSelected ? 'border-[#1E8CA3]' : 'border-[#A8B0B8]'}
                `}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#1E8CA3]" />}
                  {isCompleted && <CheckCircle2 className="text-[#22A447] w-4 h-4" />}
                </div>
              </div>

              <div className="pl-8">
                <div className="flex justify-between items-start mb-1 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[15px] text-[#4B5563] min-w-[124px]">Course Name:</span>
                      <span className="text-[15px] font-semibold text-[#111827]">{item.course.name}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[15px] text-[#4B5563] min-w-[124px]">Total Questions:</span>
                      <span className="text-[15px] font-semibold text-[#111827]">
                        {countsLoading ? 'Loading...' : `${totalQuestions} Questions`}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[15px] text-[#4B5563] min-w-[124px]">Exam Duration:</span>
                      <span className="text-[15px] font-semibold text-[#111827]">{durationMinutes} min</span>
                    </div>
                  </div>

                  <div className={`
                    px-3 py-0.5 rounded text-[13px] font-medium border whitespace-nowrap
                    ${isCompleted ? 'bg-[#E7F7E8] text-[#2A8E43] border-[#B9E4C2]' : countsLoading ? 'bg-[#E6F2F5] text-[#2F6F7E] border-[#B7DCE4]' : 'bg-[#FFEFD5] text-[#D0862E] border-[#FFD9A7]'}
                  `}>
                    {isCompleted ? 'Completed' : countsLoading ? 'Checking' : 'Pending'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Button */}
      <button 
        onClick={handleStartExam}
        disabled={countsLoading || !selectedExam || isSelectedItemCompleted || selectedItemQuestions === 0}
        className={`
          w-full h-[52px] rounded-[8px] text-[18px] leading-none font-semibold transition-all
          ${(countsLoading || !selectedExam || isSelectedItemCompleted || selectedItemQuestions === 0)
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
            : 'bg-[#BF0000] hover:bg-[#A70000] text-white active:scale-[0.99]'}
        `}
      >
        Start Exam
      </button>
    </div>
  );
};

export default SelectExam;
