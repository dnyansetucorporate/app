import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { studentService } from '../../services/student.service';
import toast from '@/utils/toastWrapper';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const ActiveExam: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const examId = queryParams.get('examId');
  const courseId = queryParams.get('courseId');

  const [questions, setQuestions] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const QUESTIONS_PER_PAGE = 6;
  
  const headerTarget = typeof document !== 'undefined' ? document.getElementById('student-header-right') : null;

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!examId || !courseId) {
        setError('Missing exam or course information');
        setLoading(false);
        return;
      }
      try {
        const response: any = await studentService.getExamQuestions(examId, courseId);
        setQuestions(response.data.questions);

        const dur = response.data.durationMinutes ?? 90;
        setDurationMinutes(dur);
        setTimeLeft(dur * 60);
      } catch (err: any) {
        setError(err.message || 'Failed to load question paper');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [examId, courseId]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSelect = (questionId: string, optionIdx: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIdx
    }));
  };

  const handleSubmit = async () => {
    if (!examId) return;
    setSubmitting(true);
    try {
      await studentService.submitExam(examId, answers);
      navigate('/student/exam-success');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit exam');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 md:p-20 min-h-[40vh]">
        <Loader2 className="animate-spin text-[#C8102E] mb-4" size={40} />
        <p className="text-gray-500 font-medium">Downloading question paper...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-bold mb-2">Error Loading Paper</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <button 
          onClick={() => navigate('/student/select-exam')}
          className="px-6 py-2 bg-gray-100 rounded-lg font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <>
      {headerTarget && createPortal(
        <div className="text-[15px] font-bold text-[#1A2332]">
          {timeLeft !== null ? formatTime(timeLeft) : '--:--'} / {durationMinutes} Min
        </div>,
        headerTarget
      )}
      <div className="w-full max-w-screen-md mx-auto pb-10 mt-4 animate-in fade-in duration-300">
      
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-[50px] text-left border border-[#E2E8F0]">

        <div className="space-y-4">
          {questions.slice(currentPage * QUESTIONS_PER_PAGE, (currentPage + 1) * QUESTIONS_PER_PAGE).map((q, pageIdx) => {
            const globalIdx = currentPage * QUESTIONS_PER_PAGE + pageIdx;
            return (
              <div key={q.id} className="border border-[#E2E8F0] rounded-[12px] p-5 bg-white">
                <p className="text-[#1A2332] font-medium text-[14px] leading-relaxed mb-4 pb-3 border-b border-[#F1F5F9]">
                  {globalIdx + 1}. {q.questionText}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
                  {q.options.map((option: string, optIdx: number) => (
                    <label key={optIdx} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={answers[q.id] === optIdx}
                        onChange={() => handleSelect(q.id, optIdx)}
                      />
                      <div className={`w-[15px] h-[15px] rounded-[3px] border flex items-center justify-center transition-colors flex-shrink-0 ${answers[q.id] === optIdx ? 'border-[#4DB8CA] bg-white' : 'border-[#94A3B8] bg-white group-hover:border-[#64748B]'}`}>
                        {answers[q.id] === optIdx && <div className="w-2 h-2 rounded-sm bg-[#4DB8CA]" />}
                      </div>
                      <span className="text-[13px] text-[#1A2332] select-none leading-snug">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex justify-between items-center">
          <div>
            {currentPage > 0 && (
              <button
                onClick={() => { setCurrentPage(p => p - 1); window.scrollTo(0, 0); }}
                className="flex items-center gap-2 px-5 py-2 border border-[#CBD5E1] rounded-[8px] text-[14px] font-medium text-[#1A2332] bg-white hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={16} /> Back Page
              </button>
            )}
          </div>
          <div>
            {currentPage < Math.ceil(questions.length / QUESTIONS_PER_PAGE) - 1 ? (
              <button
                onClick={() => { setCurrentPage(p => p + 1); window.scrollTo(0, 0); }}
                className="flex items-center gap-2 px-5 py-2 border border-[#CBD5E1] rounded-[8px] text-[14px] font-medium text-[#1A2332] bg-white hover:bg-gray-50 transition-colors"
              >
                Next Page <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-[8px] text-[14px] font-medium text-white bg-[#C8102E] hover:bg-red-800 transition-colors shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Finish Exam'}
                {!submitting && <ChevronRight size={18} />}
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
    </>
  );
};

export default ActiveExam;
